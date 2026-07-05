import type { Verse } from '../db';

// Deterministic daily review scheduling (see memory-bank/systemPatterns.md).
//
// Every device derives the same daily queue from the same inputs: the verse
// set, today's review events, and the local calendar date (the seed). Nothing
// here touches the DB, the clock, or Math.random — all functions are pure so
// the queue self-heals across devices once reviews sync.
//
// Core rule: the session queue is
//   [verses reviewed today, in review order] ++
//   [all eligible verses sorted by (times reviewed today ASC, date-seeded hash ASC)]
// The second segment makes review order deterministic per day, lets skipped
// cards surface before repeats, and loops the whole collection indefinitely.
// Category quotas do not filter the queue — they only define the day's target
// (when the celebration fires and what the progress denominator is).

export type ReviewCategory = 'learn' | 'daily' | 'weekly' | 'monthly';

export const REVIEW_CATEGORIES: ReviewCategory[] = ['learn', 'daily', 'weekly', 'monthly'];

// Review interval in days per category: expected reviews/day = count/interval.
const CATEGORY_INTERVAL: Record<ReviewCategory, number> = {
  learn: 1,
  daily: 1,
  weekly: 7,
  monthly: 30,
};

const DAY_MS = 24 * 60 * 60 * 1000;

// Minimal shape of a review event needed for scheduling.
export interface ReviewEvent {
  verseId: string;
  createdAt: number;
}

export interface DailyTargets {
  learn: number;
  daily: number;
  weekly: number;
  monthly: number;
}

export interface DailyProgress {
  reviewed: number;       // distinct verses reviewed today (all categories)
  total: number;          // Σ max(target, reviewed) per category — grows with overflow, never shrinks
  allTargetsMet: boolean;
}

// 32-bit FNV-1a with a murmur3-style finalizer. Integer-only (Math.imul),
// so results are identical on every JS engine — this is what makes the
// shuffle reproducible across devices.
export function hash32(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

// Uniform [0, 1) derived from a string key.
export function seededFraction(key: string): number {
  return hash32(key) / 0x100000000;
}

// Per-verse rank for the given day. Hashing (verseId, date) — instead of
// shuffling the whole array — means adding/removing/pausing other verses
// never perturbs a verse's position relative to unaffected verses.
export function verseRank(verseId: string, dateStr: string): number {
  return hash32(`${verseId}|${dateStr}`);
}

// A verse is "future" only if it starts after today. startedAt anywhere
// within today (e.g. startMemorizing stamps mid-day timestamps; legacy data)
// counts as started. The +DAY_MS boundary is a ~1h approximation on the two
// DST-shift days per year — acceptable for a same-day-start check.
function startsAfterToday(startedAt: number, todayMidnight: number): boolean {
  return startedAt >= todayMidnight + DAY_MS;
}

// Effective category as of the given local midnight. Same semantics as the
// original actions.getEffectiveReviewCategory, parameterized on the day so
// it stays pure.
export function effectiveCategoryAt(
  verse: Verse,
  todayMidnight: number
): { category: string; isManual: boolean } {
  if (verse.reviewCat !== 'auto') {
    return { category: verse.reviewCat, isManual: true };
  }

  if (!verse.startedAt || startsAfterToday(verse.startedAt, todayMidnight)) {
    return { category: 'future', isManual: false };
  }

  // Clamped: an intra-day startedAt (later than midnight) still counts as
  // day zero, not a negative age.
  const daysSinceStart = Math.max(0, Math.floor((todayMidnight - verse.startedAt) / DAY_MS));

  let category: string;
  if (daysSinceStart < 7) {
    category = 'learn';
  } else if (daysSinceStart < 56) {
    category = 'daily';
  } else if (daysSinceStart < 112) {
    category = 'weekly';
  } else {
    category = 'monthly';
  }

  return { category, isManual: false };
}

// Category a verse schedules under today, or null when it is out of the
// rotation (paused, future, or not started).
export function eligibleCategory(verse: Verse, todayMidnight: number): ReviewCategory | null {
  if (!verse.startedAt || startsAfterToday(verse.startedAt, todayMidnight)) return null;
  const { category } = effectiveCategoryAt(verse, todayMidnight);
  return (REVIEW_CATEGORIES as string[]).includes(category)
    ? (category as ReviewCategory)
    : null;
}

// How many verses per category the day asks for. learn/daily verses are due
// every day (target = count). weekly/monthly get expected = count/interval;
// the fractional part is resolved by a date-seeded coin so every device
// rounds the same way, and the long-run average matches the interval.
export function computeTargets(
  verses: Verse[],
  dateStr: string,
  todayMidnight: number
): DailyTargets {
  const counts: DailyTargets = { learn: 0, daily: 0, weekly: 0, monthly: 0 };
  for (const verse of verses) {
    const cat = eligibleCategory(verse, todayMidnight);
    if (cat) counts[cat]++;
  }

  const targets = { ...counts };
  for (const cat of REVIEW_CATEGORIES) {
    const expected = counts[cat] / CATEGORY_INTERVAL[cat];
    const base = Math.floor(expected);
    const frac = expected - base;
    targets[cat] = base + (seededFraction(`target|${cat}|${dateStr}`) < frac ? 1 : 0);
  }
  return targets;
}

// Count of review events per verse today — drives loop ordering (least
// reviewed first), NOT quota progress (which is distinct-verse based).
export function reviewCountsByVerse(todaysReviews: ReviewEvent[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const r of todaysReviews) {
    counts.set(r.verseId, (counts.get(r.verseId) || 0) + 1);
  }
  return counts;
}

// Daily quota progress. Quotas are floors, not caps: reviewing more verses
// in a category than targeted raises that category's effective total
// (max(target, actual)), so `total` only ever grows during the day. Reviews
// of verses outside the rotation (paused etc.) count as overflow of their
// own zero-target bucket; reviews of deleted verses are dropped.
export function computeProgress(
  verses: Verse[],
  todaysReviews: ReviewEvent[],
  dateStr: string,
  todayMidnight: number
): DailyProgress {
  const targets = computeTargets(verses, dateStr, todayMidnight);
  const versesById = new Map(verses.map(v => [v.id, v]));

  const reviewedByCat = new Map<string, number>();
  const seen = new Set<string>();
  for (const r of todaysReviews) {
    if (seen.has(r.verseId)) continue;
    seen.add(r.verseId);
    const verse = versesById.get(r.verseId);
    if (!verse) continue;
    // Bucket by the SCHEDULING category: an out-of-rotation verse (paused,
    // future, unstarted — even with a manual weekly/monthly reviewCat) must
    // count as zero-target overflow, never satisfy a real category's quota.
    const bucket = eligibleCategory(verse, todayMidnight) ?? 'inactive';
    reviewedByCat.set(bucket, (reviewedByCat.get(bucket) || 0) + 1);
  }

  let reviewed = 0;
  let total = 0;
  const allCats = new Set<string>([...REVIEW_CATEGORIES, ...reviewedByCat.keys()]);
  for (const cat of allCats) {
    const target = (REVIEW_CATEGORIES as string[]).includes(cat)
      ? targets[cat as ReviewCategory]
      : 0;
    const actual = reviewedByCat.get(cat) || 0;
    reviewed += actual;
    total += Math.max(target, actual);
  }

  const allTargetsMet = REVIEW_CATEGORIES.every(
    cat => (reviewedByCat.get(cat) || 0) >= targets[cat]
  );

  return { reviewed, total, allTargetsMet };
}

// One full pass over the eligible collection: least-reviewed-today first,
// date-seeded hash order within equal counts. On a fresh day this is pure
// hash order; each review sinks that verse behind the not-yet-reviewed rest,
// so repeats only start once everything else has caught up. Appending
// another lap when navigation reaches the end is what makes daily review
// loop indefinitely.
export function nextLap(
  verses: Verse[],
  todaysReviews: ReviewEvent[],
  dateStr: string,
  todayMidnight: number
): Verse[] {
  const counts = reviewCountsByVerse(todaysReviews);
  return verses
    .filter(v => eligibleCategory(v, todayMidnight) !== null)
    .map(v => ({
      verse: v,
      count: counts.get(v.id) || 0,
      rank: verseRank(v.id, dateStr),
    }))
    .sort(
      (a, b) =>
        a.count - b.count ||
        a.rank - b.rank ||
        (a.verse.id < b.verse.id ? -1 : 1) // hash-collision tiebreak
    )
    .map(e => e.verse);
}

// If the segment being appended starts with the same verse the queue
// currently ends on, rotate that verse to the segment's end (when possible):
// adjacent identical ids would defeat the id-keyed card <Transition> and the
// card would appear frozen. Deterministic — pure function of its inputs.
export function avoidSeamDuplicate(lap: Verse[], precedingId: string | undefined): Verse[] {
  if (lap.length > 1 && lap[0].id === precedingId) {
    return [...lap.slice(1), lap[0]];
  }
  return lap;
}

// The session queue: today's reviews replayed chronologically (consecutive
// duplicates collapsed — adjacent identical keys would defeat the keyed
// card <Transition>), followed by a full lap. startIndex lands on the first
// card after the history, i.e. the next verse to review.
export function buildDailyQueue(
  verses: Verse[],
  todaysReviews: ReviewEvent[],
  dateStr: string,
  todayMidnight: number
): { queue: Verse[]; startIndex: number } {
  const versesById = new Map(verses.map(v => [v.id, v]));

  const history: Verse[] = [];
  const chronological = [...todaysReviews].sort((a, b) => a.createdAt - b.createdAt);
  for (const r of chronological) {
    const verse = versesById.get(r.verseId);
    if (!verse) continue;
    if (history.length > 0 && history[history.length - 1].id === verse.id) continue;
    history.push(verse);
  }

  const lap = avoidSeamDuplicate(
    nextLap(verses, todaysReviews, dateStr, todayMidnight),
    history.length > 0 ? history[history.length - 1].id : undefined
  );
  const queue = [...history, ...lap];
  const startIndex = queue.length === 0 ? 0 : Math.min(history.length, queue.length - 1);
  return { queue, startIndex };
}
