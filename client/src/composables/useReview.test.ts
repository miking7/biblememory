import { describe, it, expect, vi } from 'vitest';
import { nextTick } from 'vue';
import { useReview } from './useReview';
import { updateReviewCache, getNextReviewLap, getDailyReviewState } from '../actions';
import type { Verse } from '../db';
import type { DailyProgress } from '../utils/reviewScheduling';

const EMPTY_PROGRESS: DailyProgress = {
  reviewed: 0, dailyTarget: 0, remaining: 0, goalMet: false, totalEvents: 0,
};

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
    // Only exercised by loadReviewVerses() in the tests that explicitly
    // call it — a minimal stub, same rationale as getNextReviewLap (no real
    // IndexedDB in this node test env).
    getDailyReviewState: vi.fn(async () => ({
      queue: [],
      startIndex: 0,
      progress: { reviewed: 0, dailyTarget: 0, remaining: 0, goalMet: false, totalEvents: 0 },
      dateStr: '2027-01-01',
    })),
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
  it('fires once when the daily goal is met, then never again that day', async () => {
    const review = setupReview(['v1', 'v2', 'v3']);
    review.dailyProgress.value = { ...EMPTY_PROGRESS, reviewed: 3, dailyTarget: 3, goalMet: true };

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

  it('dismissing the celebration at end-of-queue pauses on lap-complete when the refetched lap shrank below the auto-loop threshold', async () => {
    const review = setupReview(['v1', 'v2', 'v3']);
    await review.navigate({ direction: 'next' }); // index 1
    await review.navigate({ direction: 'next' }); // index 2 (last card)
    // Goal met, celebration up, sitting on the final card.
    review.dailyProgress.value = { ...EMPTY_PROGRESS, reviewed: 3, dailyTarget: 3, goalMet: true };
    review.showCelebration.value = true;

    // Verses got paused/deleted while the celebration sat open — the
    // refetched lap is now sub-threshold. Dismissing must pause on the
    // lap-complete screen, not silently loop a 1-2 card lap.
    vi.mocked(getNextReviewLap).mockResolvedValueOnce([{ id: 'v1' } as Verse, { id: 'v2' } as Verse]);
    await review.keepReviewing();

    expect(review.showCelebration.value).toBe(false);
    expect(review.dailyLapComplete.value).toBe(true);
    expect(review.lapVerseCount.value).toBe(2);
    expect(review.dueForReview.value.map((v) => v.id)).toEqual(['v1', 'v2', 'v3']); // not appended
  });
});

describe('card-footer hand size (high-water mark)', () => {
  it('ratchets up on skip forward, does not shrink going back, resets only when the queue rebuilds', async () => {
    const review = setupReview(['v1', 'v2', 'v3', 'v4', 'v5']);
    await nextTick();
    expect(review.handSize.value).toBe(1); // starting position

    await review.navigate({ direction: 'next' }); // index 1
    await review.navigate({ direction: 'next' }); // index 2
    await review.navigate({ direction: 'next' }); // index 3
    await nextTick();
    expect(review.currentReviewIndex.value).toBe(3);
    expect(review.handSize.value).toBe(4); // ratcheted to index+1

    await review.navigate({ direction: 'previous' }); // index 2
    await review.navigate({ direction: 'previous' }); // index 1
    await nextTick();
    expect(review.currentReviewIndex.value).toBe(1);
    expect(review.handSize.value).toBe(4); // stays at the high-water mark — does not shrink

    // Re-entering daily review rebuilds the queue and resets the mark
    vi.mocked(getDailyReviewState).mockResolvedValueOnce({
      queue: review.dueForReview.value,
      startIndex: 0,
      progress: EMPTY_PROGRESS,
      dateStr: '2027-01-01',
    });
    await review.loadReviewVerses();
    await nextTick();
    expect(review.handSize.value).toBe(1); // reset to the fresh startIndex, not carried over
  });

  it('is unaffected by ordinary lap continuation (only a rebuild resets it)', async () => {
    const review = setupReview(['v1', 'v2']);
    await review.navigate({ direction: 'next' }); // last card, index 1
    await review.navigate({ direction: 'next' }); // appends a lap, advances to index 2
    await nextTick();
    expect(review.handSize.value).toBe(3); // ratcheted with the queue's natural growth, not reset
  });
});

describe('returnToDailyReview handSize reset', () => {
  it('resets handSize synchronously, not left stale from a prior high-water mark', async () => {
    const review = setupReview(['v1', 'v2', 'v3', 'v4', 'v5']);
    await review.navigate({ direction: 'next' });
    await review.navigate({ direction: 'next' });
    await review.navigate({ direction: 'next' }); // index 3, handSize ratchets to 4
    await nextTick();
    expect(review.handSize.value).toBe(4);

    review.startFilteredReview(['f1'].map((id) => ({ id } as Verse)));
    updateReviewCache('f1', 'recall', Date.now());

    vi.mocked(getDailyReviewState).mockResolvedValueOnce({
      queue: review.dueForReview.value,
      startIndex: 0,
      progress: EMPTY_PROGRESS,
      dateStr: '2027-01-01',
    });
    const rebuild = review.returnToDailyReview();
    // Synchronously, before the awaited rebuild resolves, handSize must
    // already match the reset index — not the stale high-water mark.
    expect(review.currentReviewIndex.value).toBe(0);
    expect(review.handSize.value).toBe(1);
    await rebuild;
  });
});
