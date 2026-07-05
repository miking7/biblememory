import { describe, it, expect, vi } from 'vitest';
import { useReview } from './useReview';
import { updateReviewCache, getNextReviewLap } from '../actions';
import type { Verse } from '../db';

// Navigation-guard regression tests (see previous-work/069): a second
// navigation trigger fired while one is still in flight (including the
// review-recording feedback delay) must be dropped, not queued or applied.
// Animations are owned by Vue <Transition> in ReviewTab and play no part
// in the guard, so none are simulated here.
//
// These run in node with no IndexedDB: the verse stubs' ids are pre-seeded
// into the review-status cache so the status watcher stays on the
// synchronous cache path and never queries the database. getNextReviewLap
// (the daily infinite-loop extension) is stubbed for the same reason.

vi.mock('../actions', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../actions')>();
  return {
    ...actual,
    // Default lap of 3 = MIN_VERSES_FOR_AUTO_LOOP, so the seamless-loop
    // path is exercised; small-set tests override per call.
    getNextReviewLap: vi.fn(async () =>
      ['lap-1', 'lap-2', 'lap-3'].map((id) => ({ id } as Verse))
    ),
  };
});

function setupReview(verseIds: string[]) {
  const review = useReview();
  for (const id of [...verseIds, 'lap-1', 'lap-2', 'lap-3']) {
    updateReviewCache(id, 'recall', Date.now());
  }
  review.dueForReview.value = verseIds.map((id) => ({ id } as Verse));
  return review;
}

describe('useReview navigation guard', () => {
  it('drops a second navigate fired while one is in flight', async () => {
    const review = setupReview(['v1', 'v2', 'v3']);

    const first = review.navigate({ direction: 'next' });
    const second = review.navigate({ direction: 'next' });
    await Promise.all([first, second]);

    expect(review.currentReviewIndex.value).toBe(1);
  });

  it('still allows sequential navigation', async () => {
    const review = setupReview(['v1', 'v2', 'v3']);

    await review.navigate({ direction: 'next' });
    await review.navigate({ direction: 'next' });

    expect(review.currentReviewIndex.value).toBe(2);
    expect(review.isNavigating.value).toBe(false);
  });

  it('drops a previous-navigation fired during an in-flight next', async () => {
    const review = setupReview(['v1', 'v2', 'v3']);
    await review.navigate({ direction: 'next' });

    const next = review.navigate({ direction: 'next' });
    const prev = review.navigate({ direction: 'previous' });
    await Promise.all([next, prev]);

    expect(review.currentReviewIndex.value).toBe(2);
  });
});

describe('daily review infinite loop', () => {
  it('extends the queue with another lap instead of completing (>= 3 eligible)', async () => {
    const review = setupReview(['v1', 'v2']);
    await review.navigate({ direction: 'next' }); // now on last card

    await review.navigate({ direction: 'next' });

    expect(review.reviewComplete.value).toBe(false);
    expect(review.dailyLapComplete.value).toBe(false);
    expect(review.dueForReview.value.map((v) => v.id)).toEqual([
      'v1', 'v2', 'lap-1', 'lap-2', 'lap-3',
    ]);
    expect(review.currentReviewIndex.value).toBe(2);
  });

  it('pauses on the lap-complete screen for small collections (< 3 eligible)', async () => {
    const review = setupReview(['v1', 'v2']);
    vi.mocked(getNextReviewLap).mockResolvedValueOnce([{ id: 'v1' } as Verse, { id: 'v2' } as Verse]);
    await review.navigate({ direction: 'next' }); // last card

    await review.navigate({ direction: 'next' });
    expect(review.dailyLapComplete.value).toBe(true);
    expect(review.lapVerseCount.value).toBe(2); // drives the screen's copy
    expect(review.currentReviewIndex.value).toBe(1); // no silent advance

    // "Review Again" appends the lap and continues
    vi.mocked(getNextReviewLap).mockResolvedValueOnce([{ id: 'v1' } as Verse, { id: 'v2' } as Verse]);
    await review.keepReviewing();
    expect(review.dailyLapComplete.value).toBe(false);
    expect(review.dueForReview.value.map((v) => v.id)).toEqual(['v1', 'v2', 'v1', 'v2']);
    expect(review.currentReviewIndex.value).toBe(2);
  });
});

describe('midnight rollover', () => {
  it('blocks navigation and surfaces the new-day screen when the date changes', async () => {
    const review = setupReview(['v1', 'v2', 'v3']);
    review.queueDate.value = '2000-01-01'; // queue built "yesterday"

    await review.navigate({ direction: 'next' });

    expect(review.showNewDay.value).toBe(true);
    expect(review.currentReviewIndex.value).toBe(0); // no advance, no review recorded
  });
});

describe('filtered review completion', () => {
  it('completes exactly once from the last card', async () => {
    const review = setupReview([]);
    review.startFilteredReview(['f1', 'f2'].map((id) => ({ id } as Verse)));
    updateReviewCache('f1', 'recall', Date.now());
    updateReviewCache('f2', 'recall', Date.now());
    await review.navigate({ direction: 'next' });

    // On the last card: two rapid "next" triggers → one completion, index in bounds
    const first = review.navigate({ direction: 'next' });
    const second = review.navigate({ direction: 'next' });
    await Promise.all([first, second]);

    expect(review.reviewComplete.value).toBe(true);
    expect(review.currentReviewIndex.value).toBe(1);
  });
});

describe('daily-goal celebration', () => {
  it('fires once when all targets are met, then never again that day', async () => {
    const review = setupReview(['v1', 'v2', 'v3']);
    review.dailyProgress.value = { reviewed: 3, total: 3, allTargetsMet: true };

    await review.navigate({ direction: 'next' });
    expect(review.showCelebration.value).toBe(true);
    expect(review.currentReviewIndex.value).toBe(1); // advanced before celebrating

    // While the celebration is up, a plain "next" dismisses it (no advance)
    await review.navigate({ direction: 'next' });
    expect(review.showCelebration.value).toBe(false);
    expect(review.currentReviewIndex.value).toBe(1);

    // Still met, but the once-per-day flag suppresses a repeat
    await review.navigate({ direction: 'next' });
    expect(review.showCelebration.value).toBe(false);
    expect(review.currentReviewIndex.value).toBe(2);
  });
});
