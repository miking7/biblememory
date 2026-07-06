# 075 — Deterministic Review Scheduling (Date-Seeded Daily Queue)

**Date:** July 5–6, 2026
**Status:** Shipped to production (commit 9864f18); Round 4/5 fixes on top, pending push.

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

## Round 4: production feedback — the runaway target

First production use surfaced a design flaw in the "fully unified queue"
simplification: the lap was pure hash order, so weekly/monthly verses sat
interleaved ahead of the last daily verse. Reaching the goal therefore
forced reviewing them, each overflowing its small target and growing the
day's total by one per review — an unreachable target (reviewed +1,
total +1, forever).

Fix: **deck-first ordering** inside the unreviewed portion of the lap
(`nextLap`): walk the hash order filling each category's *outstanding*
target (target − distinct-reviewed-today, so off-deck/manual reviews
shrink the deck), put those verses first, the rest of the collection
after. Reviewing front-to-back now meets the targets exactly — the total
stays fixed until the user genuinely goes beyond it. Still a pure
function of (verses, today's reviews, date); covered by tests including a
walk-the-deck integration test asserting the total never inflates
mid-deck.

Also from the same feedback: the card-footer X/Y switched from
distinct-reviewed (which ignores skipping) to **position within today's
plan** (`min(index+1, total)/total`) — deck-first makes position and
progress agree when reviewing in order, and skipping back/forward now
moves the indicator. The tab badge counting down remaining-to-target was
confirmed as intended.

## Round 5: code review of the Round-4 fix, before pushing

An 8-angle review of the deck-first change itself (before it went out)
found the fix had introduced a new, sharper bug in the process:

1. **False "goal complete" reading (most severe — fixed).** The card-footer
   indicator had been changed to `min(position, target)/target` to satisfy
   "X should move when skipping." But `dueForReview`'s position advances on
   every navigation regardless of whether a review was recorded, and
   `buildDailyQueue`'s history can legitimately contain the same verse more
   than once (non-adjacent repeats aren't collapsed) — so position can race
   ahead of genuine distinct-reviewed progress. Traced concretely: 3 daily
   verses (target 3), review a, b, a, b, a (5 events, verse c untouched) →
   `computeProgress` correctly reports `{reviewed: 2, total: 3,
   allTargetsMet: false}`, but the old label showed **"3/3"** — directly
   contradicting the still-false celebration state. It also froze at
   "total/total" forever once the initial deck was cleared, even during
   later genuine laps, and disagreed with StatsBar's honest
   distinct-reviewed number on screen at the same time.

   **Fix:** reverted the footer to plain, uncapped queue position
   (`currentReviewIndex + 1 / totalReviewCount`) for both daily and
   filtered modes — the same thing it always showed pre-075. This still
   satisfies "moves on skip" (the actual ask), never fabricates a false
   "done" state, and stops competing with StatsBar/the badge/the
   celebration screen for the same "progress toward goal" story — those
   three already read `dailyProgress` directly and are the correct owners
   of that number.

2. **Duplicate quota-state derivation (fixed).** `nextLap` had grown its
   own inline `computeTargets` + `distinctReviewedByCategory` calls,
   duplicating exactly what `computeProgress` does — two independently-
   maintained formulas over the same inputs, flagged by four of the eight
   finder angles as a drift risk. Extracted `computeQuotaState()` as the
   one shared derivation; both functions now call it. (The one remaining
   redundancy — `computeProgress` and `buildDailyQueue`/`nextLap` are still
   separately invoked once each from `actions.getDailyReviewState` — was
   assessed by the efficiency angle as sub-millisecond at realistic
   collection sizes and left alone rather than restructuring the
   actions.ts/useReview.ts data flow again.)

3. **Header comment contradicted the code (fixed).** The module's
   top-of-file summary still said "quotas do not filter the queue — they
   only define the day's target," which the deck-first change made false
   (quotas now actively reorder the unreviewed segment). Rewritten to
   describe deck-first placement accurately; AGENTS.md's invariant bullet
   updated to match instead of independently restating it.

4. **Minor cleanup:** named the sort-entry shape (`RankedEntry`) instead of
   an inline `typeof entries[number]`; replaced the dead
   `{learn:0,daily:0,...}` literal-then-overwrite with
   `Object.fromEntries`; replaced the three-key sort comparator (which
   re-checked `Set.has()` on every pairwise comparison) with an explicit
   partition into deck/bonus/already-reviewed groups, each sorted once.

**Consciously not fixed (documented, not chased):** deck membership for
*other* same-category verses can theoretically shift if a verse is added
mid-day and that flips a category's rounding-coin outcome — a real but
rare edge case (requires simultaneous insertion + a threshold crossing)
that never produces incorrect quota math, only an occasional reorder, and
self-heals like everything else. Noted in the `nextLap` doc comment rather
than engineered around.

## Round 6: production feedback — the footer's Y showed a huge number

The Round 5 revert to plain queue position (`currentReviewIndex + 1 /
totalReviewCount`) fixed the false-"done" bug but broke something else:
`totalReviewCount` in daily mode is `dueForReview.length`, and since the
queue holds one full lap over the **whole active collection** (deck-first
only reorders within that lap, it doesn't shrink it) plus another
appended lap every time round, its length is close to the user's entire
library size — nothing to do with the day's target — and grows further
each loop.

Fix: the daily-mode footer now shows `dailyProgress.reviewed /
dailyProgress.total` — the same distinct-verses-vs-quota-target numbers
StatsBar, the tab badge, and the celebration screen already use. This is
provably safe against the Round-5 false-"done" bug: `total = Σ
max(target, actual)` per category is always `>= reviewed` by construction
(`max(x, y) >= y`), so `reviewed/total` can never show `N/N` unless
`allTargetsMet` is genuinely true. The accepted trade-off: this number
only advances on an actually-recorded review, not on a bare skip forward
— reverting the "moves on skip" behavior from a few rounds back, since
every attempt to make the footer track queue *position* instead of quota
*progress* has produced a real bug (Round 5: false completion; Round 6:
wrong denominator entirely). If a skip-responsive position indicator is
still wanted, it should be a visually distinct element, not blended into
the reviewed/target number.

## Notes / expected behaviors

- Celebration is once per **device** per day (localStorage flag). Crossing
  the target in filtered mode celebrates on next daily entry.
- A single day's category mix can skew toward whatever the hash favors;
  the seeded rounding keeps each category's *long-run average* frequency
  correct — accepted deliberately (targets gate the goal, not the deck).
