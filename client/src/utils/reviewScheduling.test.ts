import { describe, it, expect } from 'vitest';
import type { Verse } from '../db';
import {
  hash32,
  seededFraction,
  verseRank,
  eligibleCategory,
  computeTargets,
  computeProgress,
  nextLap,
  buildDailyQueue,
  type ReviewEvent,
} from './reviewScheduling';

// Fixed "today": 2026-07-05 local midnight is irrelevant here — the pure
// functions take an explicit midnight, so any epoch works as the anchor.
const TODAY = 1_800_000_000_000;
const DAY = 24 * 60 * 60 * 1000;
const DATE = '2027-01-15';

let nextId = 0;
function makeVerse(overrides: Partial<Verse> = {}): Verse {
  const id = overrides.id ?? `verse-${String(nextId++).padStart(4, '0')}`;
  return {
    id,
    reference: 'John 3:16',
    refSort: 'bible.43003016',
    content: 'For God so loved the world',
    translation: 'KJV',
    reviewCat: 'auto',
    startedAt: TODAY - 10 * DAY, // 'daily' by default
    tags: [],
    favorite: false,
    createdAt: TODAY - 10 * DAY,
    updatedAt: TODAY - 10 * DAY,
    ...overrides,
  };
}

// Ages that land in each auto category
const age = {
  learn: TODAY - 3 * DAY,
  daily: TODAY - 30 * DAY,
  weekly: TODAY - 70 * DAY,
  monthly: TODAY - 200 * DAY,
};

function review(verseId: string, createdAt: number): ReviewEvent {
  return { verseId, createdAt };
}

describe('hash32 / seededFraction', () => {
  it('is deterministic', () => {
    expect(hash32('abc|2026-07-05')).toBe(hash32('abc|2026-07-05'));
    expect(seededFraction('x')).toBe(seededFraction('x'));
  });

  it('differs across dates and ids', () => {
    expect(verseRank('v1', '2026-07-05')).not.toBe(verseRank('v1', '2026-07-06'));
    expect(verseRank('v1', '2026-07-05')).not.toBe(verseRank('v2', '2026-07-05'));
  });

  it('produces fractions in [0, 1)', () => {
    for (let i = 0; i < 1000; i++) {
      const f = seededFraction(`key-${i}`);
      expect(f).toBeGreaterThanOrEqual(0);
      expect(f).toBeLessThan(1);
    }
  });
});

describe('eligibleCategory', () => {
  it('derives auto categories from age', () => {
    expect(eligibleCategory(makeVerse({ startedAt: age.learn }), TODAY)).toBe('learn');
    expect(eligibleCategory(makeVerse({ startedAt: age.daily }), TODAY)).toBe('daily');
    expect(eligibleCategory(makeVerse({ startedAt: age.weekly }), TODAY)).toBe('weekly');
    expect(eligibleCategory(makeVerse({ startedAt: age.monthly }), TODAY)).toBe('monthly');
  });

  it('excludes paused, future, and unstarted verses', () => {
    expect(eligibleCategory(makeVerse({ reviewCat: 'paused' }), TODAY)).toBeNull();
    expect(eligibleCategory(makeVerse({ startedAt: TODAY + DAY }), TODAY)).toBeNull();
    expect(eligibleCategory(makeVerse({ startedAt: null }), TODAY)).toBeNull();
  });

  it('honours manual overrides', () => {
    expect(
      eligibleCategory(makeVerse({ reviewCat: 'monthly', startedAt: age.learn }), TODAY)
    ).toBe('monthly');
  });

  it('includes a verse started exactly today', () => {
    expect(eligibleCategory(makeVerse({ startedAt: TODAY }), TODAY)).toBe('learn');
  });

  it('includes a verse started mid-day today (startMemorizing-style timestamp)', () => {
    const midDay = TODAY + 10 * 60 * 60 * 1000;
    expect(eligibleCategory(makeVerse({ startedAt: midDay }), TODAY)).toBe('learn');
    expect(
      eligibleCategory(makeVerse({ reviewCat: 'daily', startedAt: midDay }), TODAY)
    ).toBe('daily');
    // ...but tomorrow's start is still future
    expect(eligibleCategory(makeVerse({ startedAt: TODAY + DAY }), TODAY)).toBeNull();
  });
});

describe('computeTargets', () => {
  it('targets every learn and daily verse', () => {
    const verses = [
      ...Array.from({ length: 3 }, () => makeVerse({ startedAt: age.learn })),
      ...Array.from({ length: 5 }, () => makeVerse({ startedAt: age.daily })),
    ];
    const t = computeTargets(verses, DATE, TODAY);
    expect(t.learn).toBe(3);
    expect(t.daily).toBe(5);
  });

  it('targets exact quotient when count divides the interval', () => {
    const verses = [
      ...Array.from({ length: 14 }, () => makeVerse({ startedAt: age.weekly })),
      ...Array.from({ length: 60 }, () => makeVerse({ startedAt: age.monthly })),
    ];
    const t = computeTargets(verses, DATE, TODAY);
    expect(t.weekly).toBe(2); // 14/7
    expect(t.monthly).toBe(2); // 60/30
  });

  it('rounds fractional expectations to floor or ceil, averaging the fraction across dates', () => {
    const verses = Array.from({ length: 10 }, () => makeVerse({ startedAt: age.weekly }));
    // expected = 10/7 ≈ 1.43 → target is always 1 or 2
    let sum = 0;
    const days = 500;
    for (let i = 0; i < days; i++) {
      const t = computeTargets(verses, `2027-day-${i}`, TODAY);
      expect(t.weekly === 1 || t.weekly === 2).toBe(true);
      sum += t.weekly;
    }
    // long-run mean should approach 10/7 ≈ 1.43 (loose tolerance)
    expect(sum / days).toBeGreaterThan(1.3);
    expect(sum / days).toBeLessThan(1.56);
  });

  it('is deterministic for the same date', () => {
    const verses = Array.from({ length: 3 }, (_, i) =>
      makeVerse({ id: `m-${i}`, startedAt: age.monthly })
    );
    expect(computeTargets(verses, DATE, TODAY)).toEqual(computeTargets(verses, DATE, TODAY));
  });
});

describe('computeProgress', () => {
  it('counts distinct verses, not events', () => {
    const v = makeVerse({ startedAt: age.daily });
    const p = computeProgress([v], [review(v.id, TODAY + 1), review(v.id, TODAY + 2)], DATE, TODAY);
    expect(p.reviewed).toBe(1);
    expect(p.total).toBe(1);
    expect(p.allTargetsMet).toBe(true);
  });

  it('overflow raises the total instead of being capped', () => {
    // 3 monthly verses → target 0 or 1; reviewing all 3 must push total to 3
    const verses = Array.from({ length: 3 }, (_, i) =>
      makeVerse({ id: `m-${i}`, startedAt: age.monthly })
    );
    const reviews = verses.map((v, i) => review(v.id, TODAY + i));
    const p = computeProgress(verses, reviews, DATE, TODAY);
    expect(p.reviewed).toBe(3);
    expect(p.total).toBe(3);
    expect(p.allTargetsMet).toBe(true);
  });

  it('overflow in one category does not satisfy another', () => {
    const daily = makeVerse({ id: 'd-1', startedAt: age.daily });
    const monthlies = Array.from({ length: 3 }, (_, i) =>
      makeVerse({ id: `m-${i}`, startedAt: age.monthly })
    );
    const reviews = monthlies.map((v, i) => review(v.id, TODAY + i));
    const p = computeProgress([daily, ...monthlies], reviews, DATE, TODAY);
    expect(p.allTargetsMet).toBe(false); // daily target of 1 unmet
    expect(p.total).toBe(4); // 1 daily target + 3 monthly overflow
  });

  it('never lets an out-of-rotation verse satisfy a real category quota', () => {
    // One eligible daily verse (target 1) + one UNSTARTED verse manually
    // pinned to 'daily'. Reviewing only the unstarted verse (via filtered
    // review) must NOT meet the daily target.
    const eligible = makeVerse({ id: 'd-1', startedAt: age.daily });
    const unstarted = makeVerse({ id: 'u-1', reviewCat: 'daily', startedAt: null });
    const p = computeProgress([eligible, unstarted], [review('u-1', TODAY + 1)], DATE, TODAY);
    expect(p.allTargetsMet).toBe(false); // the real daily verse is still due
    expect(p.reviewed).toBe(1); // the unstarted review counts as overflow...
    expect(p.total).toBe(2); // ...on top of the eligible target
  });

  it('ignores reviews of deleted verses and buckets paused-verse reviews as overflow', () => {
    const active = makeVerse({ id: 'a-1', startedAt: age.daily });
    const paused = makeVerse({ id: 'p-1', reviewCat: 'paused' });
    const reviews = [
      review('deleted-verse', TODAY + 1),
      review(paused.id, TODAY + 2),
      review(active.id, TODAY + 3),
    ];
    const p = computeProgress([active, paused], reviews, DATE, TODAY);
    expect(p.reviewed).toBe(2); // paused + active; deleted dropped
    expect(p.total).toBe(2); // active target 1 + paused overflow 1
    expect(p.allTargetsMet).toBe(true);
  });

  it('zero-verse collection is trivially met with zero total', () => {
    const p = computeProgress([], [], DATE, TODAY);
    expect(p).toEqual({ reviewed: 0, total: 0, allTargetsMet: true });
  });
});

describe('nextLap', () => {
  const verses = Array.from({ length: 20 }, (_, i) =>
    makeVerse({ id: `v-${String(i).padStart(2, '0')}`, startedAt: age.daily })
  );

  it('is deterministic and reordered by date', () => {
    const a = nextLap(verses, [], DATE, TODAY).map(v => v.id);
    const b = nextLap(verses, [], DATE, TODAY).map(v => v.id);
    const otherDay = nextLap(verses, [], '2027-01-16', TODAY).map(v => v.id);
    expect(a).toEqual(b);
    expect(otherDay).not.toEqual(a);
  });

  it('keeps relative order stable when other verses are removed', () => {
    const full = nextLap(verses, [], DATE, TODAY).map(v => v.id);
    const withoutTwo = nextLap(
      verses.filter(v => v.id !== 'v-03' && v.id !== 'v-11'),
      [],
      DATE,
      TODAY
    ).map(v => v.id);
    expect(withoutTwo).toEqual(full.filter(id => id !== 'v-03' && id !== 'v-11'));
  });

  it('sinks reviewed verses behind unreviewed ones', () => {
    const order = nextLap(verses, [], DATE, TODAY).map(v => v.id);
    const reviewedIds = order.slice(0, 3);
    const reviews = reviewedIds.map((id, i) => review(id, TODAY + i));
    const after = nextLap(verses, reviews, DATE, TODAY).map(v => v.id);
    // unreviewed verses keep their hash order at the front...
    expect(after.slice(0, order.length - 3)).toEqual(order.slice(3));
    // ...and the reviewed ones follow, still in hash order
    expect(after.slice(order.length - 3)).toEqual(reviewedIds);
  });

  it('surfaces a skipped verse before any repeats', () => {
    const order = nextLap(verses, [], DATE, TODAY).map(v => v.id);
    // review everything except the 5th card
    const skipped = order[4];
    const reviews = order.filter(id => id !== skipped).map((id, i) => review(id, TODAY + i));
    const after = nextLap(verses, reviews, DATE, TODAY).map(v => v.id);
    expect(after[0]).toBe(skipped);
  });

  it('excludes paused and future verses', () => {
    const mixed = [
      ...verses.slice(0, 3),
      makeVerse({ id: 'paused-1', reviewCat: 'paused' }),
      makeVerse({ id: 'future-1', startedAt: TODAY + DAY }),
    ];
    const ids = nextLap(mixed, [], DATE, TODAY).map(v => v.id);
    expect(ids).not.toContain('paused-1');
    expect(ids).not.toContain('future-1');
    expect(ids).toHaveLength(3);
  });
});

describe('deck-first ordering (mixed categories)', () => {
  // 3 daily (target 3) + 14 weekly (14/7 → target 2) + 60 monthly (60/30 →
  // target 2): today's plan is exactly 7 cards.
  const collection = [
    ...Array.from({ length: 3 }, (_, i) => makeVerse({ id: `dl-${i}`, startedAt: age.daily })),
    ...Array.from({ length: 14 }, (_, i) => makeVerse({ id: `wk-${i}`, startedAt: age.weekly })),
    ...Array.from({ length: 60 }, (_, i) => makeVerse({ id: `mo-${i}`, startedAt: age.monthly })),
  ];
  const catOf = (id: string) => (id.startsWith('dl') ? 'daily' : id.startsWith('wk') ? 'weekly' : 'monthly');

  it('front-loads exactly the per-category targets', () => {
    const lap = nextLap(collection, [], DATE, TODAY).map(v => v.id);
    const deck = lap.slice(0, 7);
    expect(deck.filter(id => catOf(id) === 'daily')).toHaveLength(3);
    expect(deck.filter(id => catOf(id) === 'weekly')).toHaveLength(2);
    expect(deck.filter(id => catOf(id) === 'monthly')).toHaveLength(2);
    expect(lap).toHaveLength(77); // the rest of the collection still follows
  });

  it('reviewing front-to-back keeps the total stable and meets targets exactly at the end', () => {
    const lap = nextLap(collection, [], DATE, TODAY);
    const reviews: ReviewEvent[] = [];
    for (let i = 0; i < 7; i++) {
      const before = computeProgress(collection, reviews, DATE, TODAY);
      expect(before.total).toBe(7); // never inflates mid-deck (the reported bug)
      expect(before.allTargetsMet).toBe(false);
      reviews.push(review(lap[i].id, TODAY + i));
    }
    expect(computeProgress(collection, reviews, DATE, TODAY)).toEqual({
      reviewed: 7,
      total: 7,
      allTargetsMet: true,
    });
  });

  it('off-deck reviews shrink the outstanding deck instead of growing it', () => {
    // Two monthly verses reviewed manually satisfy the monthly target, so
    // the rebuilt plan front-loads only the still-outstanding categories.
    const reviews = [review('mo-10', TODAY + 1), review('mo-11', TODAY + 2)];
    const lap = nextLap(collection, reviews, DATE, TODAY).map(v => v.id);
    const outstanding = lap.slice(0, 5); // 3 daily + 2 weekly remain
    expect(outstanding.filter(id => catOf(id) === 'daily')).toHaveLength(3);
    expect(outstanding.filter(id => catOf(id) === 'weekly')).toHaveLength(2);
    expect(outstanding.filter(id => catOf(id) === 'monthly')).toHaveLength(0);
  });
});

describe('buildDailyQueue', () => {
  const verses = Array.from({ length: 6 }, (_, i) =>
    makeVerse({ id: `q-${i}`, startedAt: age.daily })
  );

  it('starts at index 0 with no history', () => {
    const { queue, startIndex } = buildDailyQueue(verses, [], DATE, TODAY);
    expect(startIndex).toBe(0);
    expect(queue).toHaveLength(6);
  });

  it('replays history chronologically, then continues with the lap', () => {
    const reviews = [review('q-3', TODAY + 200), review('q-1', TODAY + 100)];
    const { queue, startIndex } = buildDailyQueue(verses, reviews, DATE, TODAY);
    // history ordered by createdAt, not input order
    expect(queue.slice(0, 2).map(v => v.id)).toEqual(['q-1', 'q-3']);
    expect(startIndex).toBe(2);
    // the lap contains all 6 verses; reviewed ones sink to its end
    expect(queue).toHaveLength(8);
    const lapIds = queue.slice(2).map(v => v.id);
    expect(lapIds.slice(4).sort()).toEqual(['q-1', 'q-3']);
  });

  it('keeps duplicate history events but collapses consecutive ones', () => {
    const reviews = [
      review('q-2', TODAY + 100),
      review('q-2', TODAY + 200), // consecutive duplicate → collapsed
      review('q-4', TODAY + 300),
      review('q-2', TODAY + 400), // non-consecutive → kept
    ];
    const { queue, startIndex } = buildDailyQueue(verses, reviews, DATE, TODAY);
    expect(queue.slice(0, 3).map(v => v.id)).toEqual(['q-2', 'q-4', 'q-2']);
    expect(startIndex).toBe(3);
  });

  it('drops history events for deleted verses', () => {
    const reviews = [review('gone', TODAY + 100), review('q-0', TODAY + 200)];
    const { queue, startIndex } = buildDailyQueue(verses, reviews, DATE, TODAY);
    expect(queue[0].id).toBe('q-0');
    expect(startIndex).toBe(1);
  });

  it('clamps startIndex when only history remains (all verses paused after review)', () => {
    const paused = makeVerse({ id: 'p-0', reviewCat: 'paused' });
    const reviews = [review('p-0', TODAY + 100)];
    const { queue, startIndex } = buildDailyQueue([paused], reviews, DATE, TODAY);
    expect(queue.map(v => v.id)).toEqual(['p-0']); // history only, empty lap
    expect(startIndex).toBe(0);
  });

  it('returns an empty queue for an empty collection', () => {
    expect(buildDailyQueue([], [], DATE, TODAY)).toEqual({ queue: [], startIndex: 0 });
  });

  it('rotates the lap when its head would duplicate the last history card', () => {
    // Make every verse reviewed once, with the hash-first verse reviewed LAST
    // so history tail == lap head without rotation.
    const lapOrder = buildDailyQueue(verses, [], DATE, TODAY).queue.map(v => v.id);
    const others = lapOrder.slice(1);
    const reviews = [
      ...others.map((id, i) => review(id, TODAY + i)),
      review(lapOrder[0], TODAY + 100), // hash-first verse reviewed last
    ];
    const { queue, startIndex } = buildDailyQueue(verses, reviews, DATE, TODAY);
    for (let i = 1; i < queue.length; i++) {
      expect(queue[i].id).not.toBe(queue[i - 1].id);
    }
    expect(startIndex).toBe(6);
  });

  it('produces identical queues for identical inputs (cross-device determinism)', () => {
    const reviews = [review('q-5', TODAY + 100), review('q-0', TODAY + 200)];
    const a = buildDailyQueue(verses, reviews, DATE, TODAY);
    const b = buildDailyQueue([...verses].reverse(), reviews, DATE, TODAY);
    expect(a.queue.map(v => v.id)).toEqual(b.queue.map(v => v.id));
    expect(a.startIndex).toBe(b.startIndex);
  });
});
