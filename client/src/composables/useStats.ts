import { ref } from 'vue';
import { db } from '../db';
import {
  getEffectiveReviewCategory,
  epochToDateString,
  dateToMidnightEpoch,
  currentStreakFromReviews,
} from '../actions';
import { bookNumberFromRefSort } from '../utils/bibleBooks';

const DAY_MS = 24 * 60 * 60 * 1000;

export interface StreakRun {
  length: number;
  startDate: string; // yyyy-mm-dd (local)
  endDate: string;
  isCurrent: boolean;
}
export interface HeatCell {
  date: string;
  count: number;
  level: number; // 0..4 intensity bucket
  dow: number; // 0 = Sunday .. 6 = Saturday
}
export interface DayBar {
  date: string;
  count: number;
  isToday: boolean;
}
export interface FunnelSegment {
  key: string;
  label: string;
  count: number;
}
export interface GrowthPoint {
  t: number; // epoch ms
  n: number; // cumulative verse count
}
export interface WindowStat {
  active: number; // days with >=1 review in the window
  total: number; // days elapsed in the window (capped at days-since-first-review)
}

// Fixed intensity buckets (stable across renders, independent of max).
function intensityLevel(count: number): number {
  if (count <= 0) return 0;
  if (count <= 2) return 1;
  if (count <= 4) return 2;
  if (count <= 7) return 3;
  return 4;
}

// Local date string for `n` days before today. Uses Date calendar math so it
// stays correct across DST transitions and month/year boundaries.
function dateStringDaysAgo(n: number): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return epochToDateString(d.getTime());
}

// Integer ordinal for a local calendar day. Rounding absorbs the <=1h DST
// shift, so consecutive calendar days always differ by exactly 1.
function ordinalOfDate(dateStr: string): number {
  return Math.round(dateToMidnightEpoch(dateStr) / DAY_MS);
}

/**
 * Statistics engine for the Progress modal. A single load reads all reviews +
 * verses once, builds a per-local-day map, and derives every panel's data from
 * it. Call load() lazily when the modal opens (not at app startup).
 */
export function useStats() {
  const loading = ref(false);

  // Readiness / headline
  const totalVerses = ref(0);
  const totalReviews = ref(0);
  const totalActiveDays = ref(0);
  const daysSinceFirstReview = ref(0);
  const firstReviewDate = ref<string | null>(null);

  // Consistency tab
  const currentStreak = ref(0);
  const longestStreak = ref(0);
  const topStreaks = ref<StreakRun[]>([]);
  const heatmap = ref<HeatCell[]>([]);
  const weekWindow = ref<WindowStat>({ active: 0, total: 0 });
  const monthWindow = ref<WindowStat>({ active: 0, total: 0 });
  const yearWindow = ref<WindowStat>({ active: 0, total: 0 });

  // Today tab
  const avg7 = ref(0);
  const avg30 = ref(0);
  const avg365 = ref(0);
  const dailyBars = ref<DayBar[]>([]);

  // Library tab
  const funnel = ref<FunnelSegment[]>([]);
  const notStarted = ref(0);
  const paused = ref(0);
  const growth = ref<GrowthPoint[]>([]);
  const bookCoverage = ref<number[]>([]); // index 1..66 -> verse count
  const booksTouched = ref(0);
  const maxBookCount = ref(0);

  async function load(): Promise<void> {
    loading.value = true;
    try {
      const [reviews, verses] = await Promise.all([
        db.reviews.toArray(),
        db.verses.toArray(),
      ]);

      const todayStr = epochToDateString(Date.now());
      const todayOrd = ordinalOfDate(todayStr);

      // ---- Per-day review buckets (the backbone for streaks/heatmap/averages) ----
      const dateCount = new Map<string, number>();
      const ordCount = new Map<number, number>();
      const ordToDate = new Map<number, string>();
      for (const r of reviews) {
        const ds = epochToDateString(r.createdAt);
        dateCount.set(ds, (dateCount.get(ds) || 0) + 1);
        const o = ordinalOfDate(ds);
        ordCount.set(o, (ordCount.get(o) || 0) + 1);
        if (!ordToDate.has(o)) ordToDate.set(o, ds);
      }
      const sortedOrds = [...ordCount.keys()].sort((a, b) => a - b);

      totalReviews.value = reviews.length;
      totalVerses.value = verses.length;
      totalActiveDays.value = sortedOrds.length;
      const firstOrd = sortedOrds.length ? sortedOrds[0] : todayOrd;
      firstReviewDate.value = sortedOrds.length ? ordToDate.get(firstOrd) || null : null;
      daysSinceFirstReview.value = Math.max(0, todayOrd - firstOrd);

      // ---- Streak runs (maximal consecutive-day runs) ----
      const rawRuns: Array<{ start: number; end: number }> = [];
      if (sortedOrds.length) {
        let runStart = sortedOrds[0];
        let prev = sortedOrds[0];
        for (let i = 1; i < sortedOrds.length; i++) {
          if (sortedOrds[i] === prev + 1) {
            prev = sortedOrds[i];
          } else {
            rawRuns.push({ start: runStart, end: prev });
            runStart = sortedOrds[i];
            prev = sortedOrds[i];
          }
        }
        rawRuns.push({ start: runStart, end: prev });
      }

      const lastRaw = rawRuns.length ? rawRuns[rawRuns.length - 1] : null;
      // Forgiving definition: a streak is "current" if it reaches today OR
      // yesterday (a missed today doesn't break it until the whole day passes).
      // Same shared definition as the header tile, so the two never disagree.
      const currentActive = !!lastRaw && lastRaw.end >= todayOrd - 1;
      currentStreak.value = currentStreakFromReviews(reviews);
      longestStreak.value = rawRuns.reduce((m, r) => Math.max(m, r.end - r.start + 1), 0);

      topStreaks.value = rawRuns
        .map((r) => ({
          length: r.end - r.start + 1,
          startDate: ordToDate.get(r.start) || '',
          endDate: ordToDate.get(r.end) || '',
          isCurrent: r === lastRaw && currentActive,
        }))
        .sort((a, b) => b.length - a.length || ordinalOfDate(b.endDate) - ordinalOfDate(a.endDate))
        .slice(0, 5);

      // ---- Heatmap: always provide a full year (53 weeks) of daily cells.
      // HeatmapChart shows as many recent weeks as fit its width, anchored to
      // today, so this must exceed the widest the modal can get (max-w-2xl). ----
      const windowDays = 371;
      const cells: HeatCell[] = [];
      for (let i = windowDays - 1; i >= 0; i--) {
        const date = dateStringDaysAgo(i);
        const count = dateCount.get(date) || 0;
        cells.push({
          date,
          count,
          level: intensityLevel(count),
          dow: new Date(date + 'T00:00:00').getDay(),
        });
      }
      heatmap.value = cells;

      // ---- Active-day windows + per-day averages ----
      const windowStat = (W: number): WindowStat => {
        let active = 0;
        for (const o of sortedOrds) if (o > todayOrd - W && o <= todayOrd) active++;
        const total = sortedOrds.length ? Math.min(W, daysSinceFirstReview.value + 1) : 0;
        return { active, total };
      };
      weekWindow.value = windowStat(7);
      monthWindow.value = windowStat(30);
      yearWindow.value = windowStat(365);

      const avgFor = (W: number): number => {
        let sum = 0;
        for (const o of sortedOrds) if (o > todayOrd - W && o <= todayOrd) sum += ordCount.get(o) || 0;
        const days = sortedOrds.length ? Math.min(W, daysSinceFirstReview.value + 1) : 0;
        return days > 0 ? Math.round((sum / days) * 10) / 10 : 0;
      };
      avg7.value = avgFor(7);
      avg30.value = avgFor(30);
      avg365.value = avgFor(365);

      // ---- Daily activity bars (last 30 days) ----
      const bars: DayBar[] = [];
      for (let i = 29; i >= 0; i--) {
        const date = dateStringDaysAgo(i);
        bars.push({ date, count: dateCount.get(date) || 0, isToday: i === 0 });
      }
      dailyBars.value = bars;

      // ---- Maturity funnel (uses EFFECTIVE category, not stored reviewCat) ----
      const tally: Record<string, number> = {
        learn: 0,
        daily: 0,
        weekly: 0,
        monthly: 0,
        future: 0,
        paused: 0,
      };
      for (const v of verses) {
        const { category } = getEffectiveReviewCategory(v);
        tally[category] = (tally[category] || 0) + 1;
      }
      funnel.value = [
        { key: 'learn', label: 'Learning', count: tally.learn },
        { key: 'daily', label: 'Daily', count: tally.daily },
        { key: 'weekly', label: 'Weekly', count: tally.weekly },
        { key: 'monthly', label: 'Monthly', count: tally.monthly },
      ];
      notStarted.value = tally.future;
      paused.value = tally.paused;

      // ---- Cumulative library growth (by createdAt) ----
      const byCreated = [...verses].sort((a, b) => a.createdAt - b.createdAt);
      const pts: GrowthPoint[] = byCreated.map((v, i) => ({ t: v.createdAt, n: i + 1 }));
      // Extend the line to "now" — clamped so a future-dated verse can't make
      // the final segment double back.
      if (pts.length) pts.push({ t: Math.max(Date.now(), pts[pts.length - 1].t), n: pts.length });
      growth.value = pts;

      // ---- Bible book coverage (verses per book) ----
      const counts = new Array(67).fill(0) as number[];
      for (const v of verses) {
        const b = bookNumberFromRefSort(v.refSort);
        if (b) counts[b]++;
      }
      bookCoverage.value = counts;
      booksTouched.value = counts.filter((c, i) => i >= 1 && c > 0).length;
      maxBookCount.value = counts.reduce((m, c) => Math.max(m, c), 0);
    } catch (e) {
      console.error('Failed to load stats:', e);
    } finally {
      loading.value = false;
    }
  }

  return {
    loading,
    load,
    // headline / readiness
    totalVerses,
    totalReviews,
    totalActiveDays,
    daysSinceFirstReview,
    firstReviewDate,
    // consistency
    currentStreak,
    longestStreak,
    topStreaks,
    heatmap,
    weekWindow,
    monthWindow,
    yearWindow,
    // today
    avg7,
    avg30,
    avg365,
    dailyBars,
    // library
    funnel,
    notStarted,
    paused,
    growth,
    bookCoverage,
    booksTouched,
    maxBookCount,
  };
}
