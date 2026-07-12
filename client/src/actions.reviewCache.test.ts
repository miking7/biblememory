import { describe, it, expect, vi, afterEach } from 'vitest';
import { watchEffect, nextTick } from 'vue';

// The node test env has no IndexedDB. These tests reach exactly one db path —
// getTodaysReviewEvents() -> db.reviews.where('createdAt').aboveOrEqual(n).toArray()
// (used by loadTodaysReviewsIntoCache) — so we stub just that chain. `dbState`
// is the stand-in review store; tests set it to control the rebuild snapshot.
const { dbState } = vi.hoisted(() => ({
  dbState: {
    reviews: [] as Array<{ verseId: string; reviewType: string; createdAt: number }>,
  },
}));

vi.mock('./db', () => ({
  db: {
    reviews: {
      where: () => ({
        aboveOrEqual: (min: number) => ({
          toArray: async () => dbState.reviews.filter((r) => r.createdAt >= min),
        }),
      }),
    },
  },
}));

import {
  updateReviewCache,
  getCachedReviewStatus,
  loadTodaysReviewsIntoCache,
  refreshReviewCacheForToday,
  getTodayMidnight,
} from './actions';

afterEach(() => {
  vi.useRealTimers();
  dbState.reviews = [];
});

// The "reviewed today" highlight (My Verses' getReviewStatus) reads the
// review-status cache during render. The cache is a plain Map — not a reactive
// source — so without an explicit reactive version counter a render function
// would never repaint when the cache changed, and the highlight only refreshed
// on remount/reload (the midnight-staleness bug this suite guards against).
describe('review-status cache reactivity', () => {
  it('re-runs a Vue effect reading getCachedReviewStatus when the cache updates', async () => {
    const seen: Array<string | null> = [];
    const stop = watchEffect(() => {
      seen.push(getCachedReviewStatus('reactive-v1')?.lastReviewType ?? null);
    });

    // Initial synchronous run: verse has not been reviewed today.
    expect(seen).toEqual([null]);

    updateReviewCache('reactive-v1', 'recall', Date.now());
    await nextTick();

    // The effect re-ran because the cache mutation bumped the reactive version.
    expect(seen).toEqual([null, 'recall']);
    stop();
  });

  it('caches a today review but not one dated before today', () => {
    // Positive control: a regression that turns updateReviewCache into a no-op
    // would fail this line, so the stale-guard assertion below can't pass
    // vacuously.
    updateReviewCache('today-v1', 'recall', Date.now());
    expect(getCachedReviewStatus('today-v1')?.lastReviewType).toBe('recall');

    // The guard: a pre-midnight timestamp must not enter the cache.
    updateReviewCache('stale-v1', 'practice', getTodayMidnight() - 1);
    expect(getCachedReviewStatus('stale-v1')).toBeNull();
  });
});

// The actual midnight fix: refreshReviewCacheForToday rebuilds the day-scoped
// cache when the calendar day flips, and the rebuild prunes only stale entries
// (not a blanket clear) so a concurrently-recorded review isn't lost.
describe('day-rollover cache rebuild', () => {
  it('rebuilds when the calendar day changes, dropping yesterday\'s entries', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2027-03-10T09:00:00'));
    dbState.reviews = [
      { verseId: 'roll-v1', reviewType: 'recall', createdAt: new Date('2027-03-10T09:00:00').getTime() },
    ];
    await loadTodaysReviewsIntoCache();
    expect(getCachedReviewStatus('roll-v1')?.lastReviewType).toBe('recall');

    // Same day → the guard holds: no rebuild, the entry stays.
    expect(await refreshReviewCacheForToday()).toBe(false);
    expect(getCachedReviewStatus('roll-v1')).not.toBeNull();

    // Next day, nothing reviewed yet → rebuild fires and yesterday's tint clears.
    vi.setSystemTime(new Date('2027-03-11T00:00:05'));
    dbState.reviews = [];
    expect(await refreshReviewCacheForToday()).toBe(true);
    expect(getCachedReviewStatus('roll-v1')).toBeNull();
  });

  it('keeps a review recorded concurrently during the rebuild await (no lost update)', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2027-03-12T23:59:59'));
    // The rebuild's snapshot does NOT yet contain the review recorded below.
    dbState.reviews = [];

    const rebuild = loadTodaysReviewsIntoCache();
    // Recorded while loadTodaysReviewsIntoCache is suspended on its await:
    updateReviewCache('concurrent-v1', 'practice', new Date('2027-03-12T23:59:59').getTime());
    await rebuild;

    // A blanket clear() would have wiped this today-dated entry; the
    // prune-only-stale rebuild keeps it.
    expect(getCachedReviewStatus('concurrent-v1')?.lastReviewType).toBe('practice');
  });
});
