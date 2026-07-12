import { db, Verse } from "./db";
import { ref } from "vue";
import { v4 as uuid } from "uuid";
import {
  buildDailyQueue,
  computeProgress,
  effectiveCategoryAt,
  nextLap,
  type DailyProgress
} from "./utils/reviewScheduling";

export type { DailyProgress } from "./utils/reviewScheduling";

// Helper function to parse tags from comma-separated input
export function parseTags(input: string): Array<{ key: string; value: string }> {
  if (!input || input.trim() === '') return [];
  
  return input
    .split(',')
    .map(tag => tag.trim())
    .filter(tag => tag.length > 0)
    .map(tag => {
      const parts = tag.split('=');
      return {
        key: parts[0].trim().toLowerCase(),
        value: parts[1]?.trim() || ''
      };
    });
}

// Helper function to format tags for display
export function formatTags(tags: Array<{ key: string; value: string }>): string {
  return tags
    .map(tag => tag.value ? `${tag.key}=${tag.value}` : tag.key)
    .join(', ');
}

// Get midnight timestamp for today in local timezone
export function getTodayMidnight(): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today.getTime();
}

// Today's local date string (yyyy-mm-dd) — the ONE spelling of "the current
// day" shared by the scheduling seed, the celebration day-flag, and the
// midnight-rollover check, so they can never disagree about when a day flips.
export function getTodayDateString(): string {
  return epochToDateString(getTodayMidnight());
}

// Compute effective review category for a verse (as of today)
// Returns the actual frequency that will be applied, plus whether it's manually set
export function getEffectiveReviewCategory(verse: Verse): { category: string; isManual: boolean } {
  return effectiveCategoryAt(verse, getTodayMidnight());
}

// Convert date string (yyyy-mm-dd) to midnight epoch ms
export function dateToMidnightEpoch(dateString: string): number {
  const date = new Date(dateString + 'T00:00:00');
  return date.getTime();
}

// Convert epoch ms to date string (yyyy-mm-dd)
export function epochToDateString(epochMs: number): string {
  const date = new Date(epochMs);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Helper function to normalize content (strip trailing whitespace, normalize line breaks)
export function normalizeContent(content: string): string {
  // Normalize all line breaks to \n
  let normalized = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  
  // Strip trailing whitespace from each line
  normalized = normalized.split('\n').map(line => line.trimEnd()).join('\n');
  
  // Strip leading and trailing whitespace from entire content
  normalized = normalized.trim();
  
  return normalized;
}

// Add a new verse
export async function addVerse(verse: {
  reference: string;
  refSort: string;
  content: string;
  translation: string;
  tags: Array<{ key: string; value: string }>;
  startedAt?: number;
  reviewCat?: string;
  favorite?: boolean;
  createdAt?: number;
  updatedAt?: number;
}) {
  const now = Date.now();
  const id = uuid();

  const newVerse: Verse = {
    id,
    reference: verse.reference.trim(),
    refSort: verse.refSort.trim(),
    content: normalizeContent(verse.content),
    translation: verse.translation.trim(),
    reviewCat: verse.reviewCat ?? 'auto',
    startedAt: verse.startedAt ?? getTodayMidnight(),
    tags: verse.tags,
    favorite: verse.favorite ?? false,
    createdAt: verse.createdAt ?? now,
    updatedAt: verse.updatedAt ?? now
  };

  await db.transaction('rw', db.verses, db.outbox, async () => {
    await db.verses.add(newVerse);
    await db.outbox.add({
      op_id: id,
      ts_client: now,
      entity: "verse",
      action: "add",
      data: newVerse
    });
  });

  return newVerse;
}

// Update an existing verse
export async function updateVerse(id: string, updates: {
  reference?: string;
  refSort?: string;
  content?: string;
  translation?: string;
  tags?: Array<{ key: string; value: string }>;
  reviewCat?: string;
  startedAt?: number | null;
  favorite?: boolean;
  createdAt?: number;
  updatedAt?: number;
}) {
  const now = Date.now();

  await db.transaction('rw', db.verses, db.outbox, async () => {
    const existing = await db.verses.get(id);
    if (!existing) throw new Error('Verse not found');

    const updated: Verse = {
      ...existing,
      ...updates,
      updatedAt: updates.updatedAt ?? now
    };

    // Normalize content if it was updated
    if (updates.content !== undefined) {
      updated.content = normalizeContent(updates.content);
    }

    await db.verses.put(updated);
    await db.outbox.add({
      op_id: uuid(),
      ts_client: now,
      entity: "verse",
      action: "set",
      data: updated
    });
  });
}

// Delete a verse
export async function deleteVerse(id: string) {
  const now = Date.now();

  await db.transaction('rw', db.verses, db.outbox, async () => {
    await db.verses.delete(id);
    await db.outbox.add({
      op_id: uuid(),
      ts_client: now,
      entity: "verse",
      action: "delete",
      data: { id }
    });
  });
}

// Record a review
export async function recordReview(verseId: string, reviewType: string) {
  const now = Date.now();
  const id = uuid();

  await db.transaction('rw', db.reviews, db.outbox, async () => {
    await db.reviews.add({ 
      id, 
      verseId, 
      reviewType, 
      createdAt: now 
    });
    await db.outbox.add({
      op_id: id,
      ts_client: now,
      entity: "review",
      action: "add",
      data: { id, verseId, reviewType, createdAt: now }
    });
  });
}

// Set a setting
export async function setSetting(key: string, value: any) {
  const now = Date.now();
  
  await db.transaction('rw', db.settings, db.outbox, async () => {
    await db.settings.put({ key, value, updatedAt: now });
    await db.outbox.add({
      op_id: uuid(),
      ts_client: now,
      entity: "setting",
      action: "set",
      data: { key, value }
    });
  });
}

// Get a setting
export async function getSetting(key: string, defaultValue: any = null) {
  const setting = await db.settings.get(key);
  return setting ? setting.value : defaultValue;
}

// Start memorizing a verse (set startedAt to today). Midnight epoch, same
// as addVerse — scheduling treats any startedAt within today as started.
export async function startMemorizing(verseId: string) {
  await updateVerse(verseId, { startedAt: getTodayMidnight() });
}

// Toggle favorite status
export async function toggleFavorite(verseId: string) {
  const verse = await db.verses.get(verseId);
  if (!verse) throw new Error('Verse not found');
  
  await updateVerse(verseId, { favorite: !verse.favorite });
}

// Get all verses sorted by refSort
export async function getAllVerses(): Promise<Verse[]> {
  return await db.verses.orderBy('refSort').toArray();
}

// Search verses by reference or content
export async function searchVerses(query: string): Promise<Verse[]> {
  const lowerQuery = query.toLowerCase();
  const allVerses = await db.verses.toArray();
  
  return allVerses.filter(verse => 
    verse.reference.toLowerCase().includes(lowerQuery) ||
    verse.content.toLowerCase().includes(lowerQuery)
  );
}

// Today's review events (raw, chronologically unordered)
export async function getTodaysReviewEvents() {
  return db.reviews
    .where('createdAt')
    .aboveOrEqual(getTodayMidnight())
    .toArray();
}

// Inputs the deterministic scheduler needs: the verse set, today's review
// events, and the local date acting as the daily shuffle seed.
async function getSchedulingInputs() {
  const [verses, reviews] = await Promise.all([getAllVerses(), getTodaysReviewEvents()]);
  return { verses, reviews, dateStr: getTodayDateString(), todayMidnight: getTodayMidnight() };
}

// Deterministic daily review queue + quota progress from ONE consistent
// snapshot of the inputs (see utils/reviewScheduling.ts): verses reviewed
// today in review order, then the rest of the collection in date-seeded
// order. Identical on every device with the same synced data.
export async function getDailyReviewState(): Promise<{
  queue: Verse[];
  startIndex: number;
  progress: DailyProgress;
  dateStr: string; // the local date this queue was built for (rollover detection)
}> {
  const { verses, reviews, dateStr, todayMidnight } = await getSchedulingInputs();
  return {
    ...buildDailyQueue(verses, reviews, dateStr, todayMidnight),
    progress: computeProgress(verses, reviews, dateStr, todayMidnight),
    dateStr,
  };
}

// Today's progress: distinct eligible verses reviewed vs. the day's grand
// total (dailyTarget = Σ per-category targets, fixed for the day).
export async function getDailyProgress(): Promise<DailyProgress> {
  const { verses, reviews, dateStr, todayMidnight } = await getSchedulingInputs();
  return computeProgress(verses, reviews, dateStr, todayMidnight);
}

// One more full pass over the collection, least-reviewed first — appended
// when daily-review navigation reaches the end of the queue so review can
// continue indefinitely.
export async function getNextReviewLap(): Promise<Verse[]> {
  const { verses, reviews, dateStr, todayMidnight } = await getSchedulingInputs();
  return nextLap(verses, reviews, dateStr, todayMidnight);
}


// Local-calendar-day ordinal. Rounding absorbs the <=1h DST shift, so two
// different calendar days never collapse to the same ordinal.
const STREAK_DAY_MS = 24 * 60 * 60 * 1000;
function dayOrdinal(epochMs: number): number {
  return Math.round(dateToMidnightEpoch(epochToDateString(epochMs)) / STREAK_DAY_MS);
}

// Current consecutive-day streak. Forgiving anchor: counts today if reviewed,
// otherwise yesterday (a missed today doesn't break the streak until the whole
// day passes). DST-safe and uncapped. Shared by the header tile (via
// getCurrentStreak) and the stats modal (useStats) so they never disagree.
export function currentStreakFromReviews(reviews: Array<{ createdAt: number }>): number {
  if (reviews.length === 0) return 0;

  const activeDays = new Set<number>();
  for (const r of reviews) activeDays.add(dayOrdinal(r.createdAt));

  const todayOrd = dayOrdinal(Date.now());
  let cursor = activeDays.has(todayOrd) ? todayOrd : todayOrd - 1;
  if (!activeDays.has(cursor)) return 0;

  let streak = 0;
  while (activeDays.has(cursor)) {
    streak++;
    cursor--;
  }
  return streak;
}

// Get current streak (consecutive days with reviews)
export async function getCurrentStreak(): Promise<number> {
  const allReviews = await db.reviews.toArray();
  return currentStreakFromReviews(allReviews);
}

// ============================================================================
// Review Status Cache - Tracks recent reviews for visual feedback on cards
// ============================================================================

export interface RecentReviewEntry {
  lastReviewedAt: number;
  lastReviewType: 'recall' | 'practice';
}

// In-memory cache: Map<verseId, RecentReviewEntry>
const recentReviewsCache = new Map<string, RecentReviewEntry>();

// A plain Map is invisible to Vue's reactivity, so render functions that paint
// the "reviewed today" highlight (My Verses' getReviewStatus, via
// getCachedReviewStatus) could not repaint when the Map changed — the colour
// only refreshed on remount/reload. This counter is bumped on every cache
// mutation and read inside getCachedReviewStatus, giving those render functions
// a real reactive dependency to re-run on.
const reviewCacheVersion = ref(0);

// The local calendar day the cache currently represents. Lets the midnight
// watchers rebuild it exactly once when the day flips (see
// refreshReviewCacheForToday) regardless of which tab is showing, instead of
// the highlight lingering on yesterday until a reload.
let cacheDateString: string | null = null;

// Load today's reviews into cache (call on session start)
export async function loadTodaysReviewsIntoCache(): Promise<void> {
  const todaysReviews = await getTodaysReviewEvents();
  const todayMidnight = getTodayMidnight();

  // Prune only STALE (pre-today) entries — e.g. yesterday's, after a midnight
  // rollover. Deliberately NOT a blanket clear(): this runs after an await and
  // (now that handleDayRollover drives it from background watchers) a review
  // can be recorded concurrently during that await. Such an entry is
  // today-dated, so it must survive the rebuild — a clear() would wipe it while
  // the snapshot above doesn't contain it yet, silently dropping the tint
  // (lost-update race). Deleting during Map iteration is safe per spec.
  for (const [verseId, entry] of recentReviewsCache) {
    if (entry.lastReviewedAt < todayMidnight) recentReviewsCache.delete(verseId);
  }

  for (const review of todaysReviews) {
    const existing = recentReviewsCache.get(review.verseId);
    // Only update if this review is more recent
    if (!existing || review.createdAt > existing.lastReviewedAt) {
      recentReviewsCache.set(review.verseId, {
        lastReviewedAt: review.createdAt,
        lastReviewType: review.reviewType as 'recall' | 'practice'
      });
    }
  }

  cacheDateString = getTodayDateString();
  reviewCacheVersion.value++;
}

// Update cache entry (call after recording a review or on sync pull)
export function updateReviewCache(verseId: string, reviewType: 'recall' | 'practice', timestamp: number): void {
  const todayMidnight = getTodayMidnight();

  // Only cache if the review is from today
  if (timestamp >= todayMidnight) {
    const existing = recentReviewsCache.get(verseId);
    // Only update if this review is more recent
    if (!existing || timestamp > existing.lastReviewedAt) {
      recentReviewsCache.set(verseId, {
        lastReviewedAt: timestamp,
        lastReviewType: reviewType
      });
      reviewCacheVersion.value++;
    }
  }
}

// Get review status for a verse (returns null if not reviewed today)
export async function getRecentReviewStatus(verseId: string): Promise<RecentReviewEntry | null> {
  // Check cache first
  const cached = recentReviewsCache.get(verseId);
  if (cached) {
    return cached;
  }

  // Cache miss - query database
  const todayMidnight = getTodayMidnight();
  const reviews = await db.reviews
    .where('verseId')
    .equals(verseId)
    .and(r => r.createdAt >= todayMidnight)
    .reverse()
    .sortBy('createdAt');

  if (reviews.length > 0) {
    const mostRecent = reviews[0];
    const entry: RecentReviewEntry = {
      lastReviewedAt: mostRecent.createdAt,
      lastReviewType: mostRecent.reviewType as 'recall' | 'practice'
    };
    // Populate cache for next lookup
    recentReviewsCache.set(verseId, entry);
    reviewCacheVersion.value++;
    return entry;
  }

  return null;
}

// Get cached review status synchronously (for computed properties)
// Returns null if not in cache - use getRecentReviewStatus for DB fallback
export function getCachedReviewStatus(verseId: string): RecentReviewEntry | null {
  // Read the reactive version so Vue render functions that call this (the My
  // Verses highlight) register a dependency and re-run when the cache is
  // rebuilt or updated — the Map itself is not a reactive source. The read is
  // folded into the return path (not a bare `void` expression) so a minifier
  // can't drop it as a no-op, which would silently break the highlight in the
  // production build only. The guard is always true (the version only climbs
  // from 0); it exists solely to make the dependency load-bearing.
  return reviewCacheVersion.value >= 0
    ? recentReviewsCache.get(verseId) ?? null
    : null;
}

// Rebuild the review-status cache for the current day, but only if the calendar
// day has changed since it was last built — a cheap no-op within the same day.
// Called by App.vue's midnight timer and visibilitychange listener so the
// "reviewed today" highlight clears app-wide at rollover without a reload, even
// when the Review tab is never opened. Returns whether a rebuild happened.
export async function refreshReviewCacheForToday(): Promise<boolean> {
  if (cacheDateString === getTodayDateString()) return false;
  await loadTodaysReviewsIntoCache();
  return true;
}
