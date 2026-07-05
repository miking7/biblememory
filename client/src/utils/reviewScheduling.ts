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
//   [one lap over all eligible verses]
// A lap sorts least-reviewed-today first (repeats only start once everyone's
// been seen once — this is what loops the collection indefinitely), and
// within the UNREVIEWED verses, puts TODAY'S DECK first: the verses that
// fill each category's still-outstanding target, in date-seeded hash order.
// Deck-first placement matters — without it, reviewing toward the goal
// forces overflowing interleaved weekly/monthly verses along the way and the
// target grows forever instead of being reachable (previous-work/075,
// "Round 4"). So quotas DO shape queue order, not just the celebration/
// progress denominator — but only by reordering among unreviewed verses;
// nothing is ever excluded, and the whole collection still follows the deck.

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

// Distinct verses reviewed today, bucketed by scheduling category. An
// out-of-rotation verse (paused, future, unstarted) buckets under
// 'inactive' — zero-target overflow that must never satisfy a real quota.
function distinctReviewedByCategory(
  versesById: Map<string, Verse>,
  todaysReviews: ReviewEvent[],
  todayMidnight: number
): Map<string, number> {
  const reviewedByCat = new Map<string, number>();
  const seen = new Set<string>();
  for (const r of todaysReviews) {
    if (seen.has(r.verseId)) continue;
    seen.add(r.verseId);
    const verse = versesById.get(r.verseId);
    if (!verse) continue; // deleted verse
    const bucket = eligibleCategory(verse, todayMidnight) ?? 'inactive';
    reviewedByCat.set(bucket, (reviewedByCat.get(bucket) || 0) + 1);
  }
  return reviewedByCat;
}

// Shared by computeProgress and nextLap so quota state (targets + distinct-
// reviewed-by-category) is derived by exactly one formula — the two must
// never independently re-derive it and risk disagreeing.
function computeQuotaState(
  verses: Verse[],
  todaysReviews: ReviewEvent[],
  dateStr: string,
  todayMidnight: number
): { targets: DailyTargets; reviewedByCat: Map<string, number> } {
  const targets = computeTargets(verses, dateStr, todayMidnight);
  const versesById = new Map(verses.map(v => [v.id, v]));
  const reviewedByCat = distinctReviewedByCategory(versesById, todaysReviews, todayMidnight);
  return { targets, reviewedByCat };
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
  const { targets, reviewedByCat } = computeQuotaState(verses, todaysReviews, dateStr, todayMidnight);

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

interface RankedEntry {
  verse: Verse;
  count: number; // times reviewed today
  rank: number;  // date-seeded hash rank
}

// One full pass over the eligible collection, ordered so that reviewing
// front-to-back meets the day's targets exactly:
//
//   1. times-reviewed-today ASC — repeats only start once everything else
//      has caught up (this is what loops the collection);
//   2. within the unreviewed verses, TODAY'S DECK first — the verses that
//      fill each category's still-outstanding target (remaining =
//      target − distinct-reviewed), chosen in hash order. Without this,
//      the interleaved weekly/monthly verses ahead of the last daily verse
//      would each overflow their category on the way to the goal, growing
//      the day's total with every review — an unreachable target;
//   3. date-seeded hash order within each group.
//
// Everything stays a pure function of (verses, today's reviews, date), so
// devices still agree and the deck self-heals as reviews sync. Deck
// membership can shift for OTHER same-category verses if a verse is
// added/removed mid-day and that flips the category's rounding-coin
// outcome (computeTargets) — rare, and it self-heals like everything else.
export function nextLap(
  verses: Verse[],
  todaysReviews: ReviewEvent[],
  dateStr: string,
  todayMidnight: number
): Verse[] {
  const counts = reviewCountsByVerse(todaysReviews);
  const entries: RankedEntry[] = verses
    .filter(v => eligibleCategory(v, todayMidnight) !== null)
    .map(v => ({
      verse: v,
      count: counts.get(v.id) || 0,
      rank: verseRank(v.id, dateStr),
    }));

  const byRank = (a: RankedEntry, b: RankedEntry) =>
    a.rank - b.rank || (a.verse.id < b.verse.id ? -1 : 1); // hash-collision tiebreak

  // Today's deck: walk the hash-ordered UNREVIEWED verses, taking each
  // category until its outstanding target is filled.
  const { targets, reviewedByCat } = computeQuotaState(verses, todaysReviews, dateStr, todayMidnight);
  const remaining = Object.fromEntries(
    REVIEW_CATEGORIES.map(cat => [cat, Math.max(0, targets[cat] - (reviewedByCat.get(cat) || 0))])
  ) as Record<ReviewCategory, number>;

  const unreviewed = entries.filter(e => e.count === 0).sort(byRank);
  const deck: RankedEntry[] = [];
  const bonus: RankedEntry[] = [];
  for (const e of unreviewed) {
    const cat = eligibleCategory(e.verse, todayMidnight)!; // non-null: entries is pre-filtered to eligible verses
    if (remaining[cat] > 0) {
      remaining[cat]--;
      deck.push(e);
    } else {
      bonus.push(e);
    }
  }
  const alreadyReviewed = entries
    .filter(e => e.count > 0)
    .sort((a, b) => a.count - b.count || byRank(a, b));

  return [...deck, ...bonus, ...alreadyReviewed].map(e => e.verse);
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
