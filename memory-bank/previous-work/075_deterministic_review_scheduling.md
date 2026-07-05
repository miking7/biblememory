# 075 — Deterministic Review Scheduling (Date-Seeded Daily Queue)

**Date:** July 5, 2026
**Status:** Implemented; unit tests + build green; awaiting Herd verification before push.

## Problem

`getVersesForReview()` flipped an unseeded `Math.random()` coin per
weekly/monthly verse on every call, so (a) the daily review count swung
wildly day to day, (b) two devices (or two app restarts) disagreed about
what was due, and (c) the stats progress denominator was non-deterministic
(deferred item from 066).

## Design (agreed with owner before implementation)

One rule, applied uniformly all day:

> Session queue = [verses reviewed today, in review order, consecutive
> duplicates collapsed] ++ [all eligible verses sorted by
> (times-reviewed-today ASC, date-seeded hash ASC)]

- **Seed = local calendar date only.** Per-verse rank is
  `hash32(verseId|date)` (FNV-1a + murmur finalizer, `Math.imul`-only so
  identical on every JS engine). Hash ranking — not a global shuffle — so
  adding/removing/pausing verses never perturbs other verses' order.
- **Targets, not filters.** Category quotas (`learn`/`daily` = count;
  `weekly` = count/7; `monthly` = count/30, fractional part resolved by a
  date-seeded coin) define *when the day's goal is met*, not which cards
  appear. Quotas are floors: over-reviewing a category raises its
  effective total (`max(target, distinct-reviewed)`); the aggregate total
  only ever grows during a day.
- **Progress counts distinct verses; loop ordering counts events.** A verse
  reviewed 5× counts once toward quota but sinks 5 laps deep in the queue.
- **Infinite loop.** Daily review never completes: reaching the end of the
  queue appends another least-reviewed-first lap. Skipped cards surface
  before any repeats (falls out of the count-then-hash sort).
- **One-time celebration** ("Daily Goal Reached!") when all targets are
  met, guarded by a `localStorage` date flag (deliberately device-local —
  the settings table syncs via oplog, which would suppress it remotely).
- **Self-healing across devices:** the queue is a pure function of (verse
  set, today's reviews, date) — all synced or shared inputs — recomputed on
  every entry to the Review tab. No queue is ever persisted. Sync lag just
  means a card may be shown again; harmless, converges after pull.
- Filtered/manual review is untouched (own finite list + completion
  screen); its reviews still count toward the daily quota.

## Implementation

- **`utils/reviewScheduling.ts` (new, pure):** `hash32`, `seededFraction`,
  `verseRank`, `effectiveCategoryAt`, `eligibleCategory`, `computeTargets`,
  `computeProgress`, `reviewCountsByVerse`, `nextLap`, `buildDailyQueue`.
  28 unit tests (determinism, stability under removal, sink/surface
  ordering, overflow, rounding distribution, edge cases).
- **`actions.ts`:** `getVersesForReview()` replaced by
  `getDailyReviewQueue()` / `getDailyProgress()` / `getNextReviewLap()`
  (thin DB wrappers over the pure module); `getTodaysReviewEvents()` added;
  `getEffectiveReviewCategory` now delegates to `effectiveCategoryAt`.
  `Math.random` is gone from scheduling.
- **`useReview.ts`:** `loadReviewVerses()` always rebuilds and lands on the
  first unreviewed card (`startIndex`); `returnToDailyReview()` is async and
  rebuilds (re-entry reorder); `navigate()` appends a lap at the end of the
  daily queue instead of completing, and triggers the celebration after
  advancing; `keepReviewing()` dismisses it; `resetReview()` removed
  (obsolete "Review More" path); `refreshCurrentVerse` updates all
  duplicate occurrences; `dailyProgress` + `showCelebration` exposed;
  celebration keys ('space/enter/n/→') handled in `handleKeyPress`.
- **UI:** ReviewTab gained the celebration block and a daily `X/Y`
  (distinct/target) footer; daily completion screen removed (filtered one
  kept); `canGoNext` never blocks in daily mode. StatsBar tile, tab badge
  (now counts *remaining* to target), and StatsModal Today tab all use
  `dailyProgress` (StatsModal got a `reviewedDistinct` prop — raw event
  counts would overstate progress once repeats are common).

## Pre-Herd code review round (8 finder angles)

Confirmed findings, all fixed in the same batch:

1. **Zero-target celebration** — on a day where every seeded target rounds
   to 0 (e.g. only 3 monthly verses), opening the app celebrated "0 verses
   reviewed" and burned the daily flag. Fix: celebration requires
   `reviewed > 0`.
2. **Intra-day `startedAt` regression** — `startMemorizing` stamped
   `Date.now()`, and eligibility excluded `startedAt > todayMidnight`, so a
   verse started mid-day vanished until tomorrow. Fix: "future" now means
   startedAt beyond today (`>= midnight + DAY_MS`), age clamped to ≥ 0;
   `startMemorizing` now stamps the midnight epoch like `addVerse`.
3. **Adjacent duplicate card keys** at the history→lap seam and on
   lap-append froze the keyed `<Transition>` (and stranded swipeOffset).
   Fix: `avoidSeamDuplicate()` rotates the lap head when it matches the
   preceding card (single-verse collections remain an accepted edge).
4. **Queue-swap race** — tapping the Review tab during the 400 ms
   review-feedback window let the in-flight `navigate()` advance against
   the freshly rebuilt queue, skipping a card. Fix: navigate aborts its
   advance if the source/list changed while awaiting.
5. **Stale celebration blocking filtered mode** — `startFilteredReview` now
   clears `showCelebration`; a plain "next" also dismisses it in
   `navigate()` so all next-shaped inputs behave alike.
6. **Empty-lap dead end** (everything paused mid-session) — navigate now
   rebuilds the queue instead of silently no-oping; `returnToDailyReview`
   resets the index synchronously to avoid an out-of-bounds flash.

Cleanup from the same round: `getDailyReviewState()` gives queue+progress
from one snapshot (was two full fetches per rebuild); dead
`reviewedToday`/`getTodayReviewCount` removed (useReview, useStats, actions);
today's-reviews Dexie query unified on `getTodaysReviewEvents`
(`aboveOrEqual` day boundary); stats refresh overlaps the 400 ms feedback
delay; stale scheduling docs in systemPatterns.md/progress.md rewritten.

## Round 2: midnight rollover + new/small-collection UX

- **Midnight rollover:** the queue records the date it was built for
  (`queueDate`, returned by `getDailyReviewState`). Detection on every
  `navigate()` (blocks recording into a stale session), on
  `visibilitychange` (resumed PWA), and via a self-rescheduling midnight
  timer. A 🌅 "A New Day Has Begun" interstitial replaces the card;
  "Start Today's Review" refreshes the review-status cache, queue,
  targets, and streak. Filtered sessions are date-independent and are
  never blocked by the rollover flag.
- **Small collections (< 3 eligible verses):** the loop pauses at the end
  of each lap on an "All Verses Reviewed" screen ([Review Again] [Add More
  Verses]) instead of silently repeating — a 1-2 card auto-loop reads as a
  frozen card. Threshold: `MIN_VERSES_FOR_AUTO_LOOP = 3` in useReview.
  Because every repeat now passes through an interstitial block-swap, the
  single-verse adjacent-key edge is fully resolved. `keepReviewing()` is
  the shared continue action (celebration + lap-complete): it appends a
  lap when at the end of the queue, else just dismisses.
- **0 verses:** the empty state gained an "Add Your First Verse" CTA
  (ReviewTab emits `addVerses`; App switches to the Add tab). Deliberately
  not a disabled tab — an actionable empty state beats a mystery-disabled
  control.

## Round 3: second code review (8 finder angles over the full batch)

Confirmed findings, all fixed:

1. **Stale celebration survived midnight** — an undismissed celebration ref
   outlived the day and re-rendered as "reviewed 0 verses" after rollover.
   Fix: `loadReviewVerses` resets all interstitials and re-derives; the
   celebration day-flag is now written on *dismissal*, not display, so an
   unacknowledged celebration can legitimately re-show same-day.
2. **Out-of-rotation verses satisfied real quotas** — `computeProgress`
   bucketed by `effectiveCategoryAt`, so reviewing an unstarted verse
   manually pinned to 'daily' met the daily target. Fix: bucket by
   `eligibleCategory ?? 'inactive'` (zero-target overflow only).
3. **Keyboard hijack of focused buttons** — the interstitial key branch
   swallowed Enter/Space aimed at "Add More Verses". Fix: button targets
   fall through to native activation.
4. **Immersive-mode escape trap** — Escape/'i' were dead while an
   interstitial was up. Fix: handled inside the interstitial branch.
5. **`keepReviewing` gaps** — no rollover check (could extend yesterday's
   queue at 00:00:01), cleared flags before awaiting (a failed Dexie read
   dismissed the screen with no lap), silently no-oped on an empty lap.
   Fix: rollover guard, fetch-before-clear with catch, empty-lap rebuild;
   lap logic deduped into `fetchRotatedLap`/`appendLapAndAdvance` shared
   with `navigate()`.
6. **`startNewDay` unguarded** — key auto-repeat could run concurrent cache
   rebuilds; rejections were unhandled; it re-fetched progress it already
   had. Fix: isNavigating guard, try/catch, streak-only refresh.
7. **Lap-complete copy** showed `dailyProgress.reviewed` ("all 0 of your
   verses" when skipping without reviewing) — now uses `lapVerseCount`
   captured at trigger time.
8. **0-verses + midnight** — `showingInterstitial` was true while the empty
   state rendered, hijacking keys for an invisible screen. Fix: gated on a
   non-empty queue.

Structural: rollover listeners (visibilitychange + midnight timer) moved
from the composable factory to App.vue's onMounted/onUnmounted (lifecycle
ownership, no duplicate registration); `getTodayDateString()` in actions is
now the single spelling of "today" for seed, day-flag, and rollover check;
AGENTS.md navigation invariant amended to sanction the interstitial actions.

Deferred (recorded, not fixed): interstitial enum refactor (three booleans
work and are tested; revisit if a fourth interstitial appears); per-review
full-table streak scan (pre-existing, hidden under the 400ms feedback
overlap); ReviewTab interstitial-markup dedup into a presentational
component; single-verse adjacent-key edge (accepted).

## Notes / expected behaviors

- Celebration is once per **device** per day (localStorage flag). Crossing
  the target in filtered mode celebrates on next daily entry.
- A single day's category mix can skew toward whatever the hash favors;
  the seeded rounding keeps each category's *long-run average* frequency
  correct — accepted deliberately (targets gate the goal, not the deck).
