import { db, Verse } from "./db";
import { v4 as uuid } from "uuid";

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

// Start memorizing a verse (set startedAt to today)
export async function startMemorizing(verseId: string) {
  const now = Date.now();
  await updateVerse(verseId, { startedAt: now });
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

// Get verses due for review based on spaced repetition algorithm
export async function getVersesForReview(): Promise<Verse[]> {
  const allVerses = await getAllVerses();
  const today = Date.now();
  const todayStart = new Date(today).setHours(0, 0, 0, 0);
  
  const dueVerses: Verse[] = [];
  
  for (const verse of allVerses) {
    // Skip verses not started yet (future)
    if (!verse.startedAt || verse.startedAt > today) {
      continue;
    }
    
    // Get review frequency
    const daysSinceStart = Math.floor((todayStart - verse.startedAt) / (24 * 60 * 60 * 1000));
    let freq = verse.reviewCat;
    
    // Auto-calculate frequency if set to 'auto'
    if (freq === 'auto') {
      if (daysSinceStart < 0) freq = 'future';
      else if (daysSinceStart < 7) freq = 'learn';
      else if (daysSinceStart < 56) freq = 'daily';
      else if (daysSinceStart < 112) freq = 'weekly';
      else freq = 'monthly';
    }
    
    // Determine if verse is due based on frequency
    if (freq === 'learn' || freq === 'daily') {
      dueVerses.push(verse);
    } else if (freq === 'weekly') {
      // 1-in-7 probability
      if (Math.random() < (1/7)) {
        dueVerses.push(verse);
      }
    } else if (freq === 'monthly') {
      // 1-in-30 probability
      if (Math.random() < (1/30)) {
        dueVerses.push(verse);
      }
    }
  }
  
  return dueVerses;
}

// Get review count for today
export async function getTodayReviewCount(): Promise<number> {
  const today = new Date().setHours(0, 0, 0, 0);
  const reviews = await db.reviews
    .where('createdAt')
    .above(today)
    .toArray();
  
  return reviews.length;
}

// Get current streak (consecutive days with reviews)
export async function getCurrentStreak(): Promise<number> {
  const allReviews = await db.reviews.orderBy('createdAt').reverse().toArray();

  if (allReviews.length === 0) return 0;

  let streak = 0;
  let currentDate = new Date().setHours(0, 0, 0, 0);

  for (let i = 0; i < 365; i++) { // Check up to 365 days back
    const dayStart = currentDate - (i * 24 * 60 * 60 * 1000);
    const dayEnd = dayStart + (24 * 60 * 60 * 1000);

    const hasReview = allReviews.some(r => r.createdAt >= dayStart && r.createdAt < dayEnd);

    if (hasReview) {
      streak++;
    } else if (i > 0) {
      // If we're past today and there's no review, break the streak
      break;
    }
  }

  return streak;
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

// Load today's reviews into cache (call on session start)
export async function loadTodaysReviewsIntoCache(): Promise<void> {
  const todayMidnight = getTodayMidnight();
  const todaysReviews = await db.reviews
    .where('createdAt')
    .above(todayMidnight)
    .toArray();

  // Clear existing cache and populate with today's reviews
  recentReviewsCache.clear();

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
    return entry;
  }

  return null;
}

// Get cached review status synchronously (for computed properties)
// Returns null if not in cache - use getRecentReviewStatus for DB fallback
export function getCachedReviewStatus(verseId: string): RecentReviewEntry | null {
  return recentReviewsCache.get(verseId) || null;
}
