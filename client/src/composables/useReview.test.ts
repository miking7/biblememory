import { describe, it, expect } from 'vitest';
import { useReview } from './useReview';
import { updateReviewCache } from '../actions';
import type { Verse } from '../db';

// Navigation-guard regression tests (see previous-work/069): a second
// navigation trigger fired while one is still in flight (including the
// review-recording feedback delay) must be dropped, not queued or applied.
//
// These run in node with no IndexedDB: the verse stubs' ids are pre-seeded
// into the review-status cache so the status watcher stays on the
// synchronous cache path and never queries the database.

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

function setupReview(verseIds: string[]) {
  const review = useReview();
  for (const id of verseIds) {
    updateReviewCache(id, 'recall', Date.now());
  }
  review.dueForReview.value = verseIds.map((id) => ({ id } as Verse));
  review.registerCardAnimators({
    exit: () => sleep(10),
    entry: () => sleep(10),
    reset: () => {},
    // Deliberately always false: the guard must not depend on animation
    // state, because the feedback delay runs before any animation starts.
    isAnimating: () => false,
  });
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

  it('completes the review exactly once from the last card', async () => {
    const review = setupReview(['v1', 'v2']);
    await review.navigate({ direction: 'next' });

    // On the last card: two rapid "next" triggers → one completion, index in bounds
    const first = review.navigate({ direction: 'next' });
    const second = review.navigate({ direction: 'next' });
    await Promise.all([first, second]);

    expect(review.reviewComplete.value).toBe(true);
    expect(review.currentReviewIndex.value).toBe(1);
  });
});
