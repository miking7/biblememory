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

## Round 6: production feedback — the footer's Y showed a huge number, then a rejected fix

The Round 5 revert to plain queue position (`currentReviewIndex + 1 /
totalReviewCount`) fixed the false-"done" bug but broke something else:
`totalReviewCount` in daily mode is `dueForReview.length`, and since the
queue holds one full lap over the **whole active collection** (deck-first
only reorders within that lap, it doesn't shrink it) plus another
appended lap every time round, its length is close to the user's entire
library size — nothing to do with the day's target — and grows further
each loop.

First fix attempt: pointed the footer at `dailyProgress.reviewed /
dailyProgress.total` — provably safe against the Round-5 false-"done" bug
(`total = Σ max(target, actual)` per category is always `>= reviewed` by
construction), but it silently dropped the "moves on skip" behavior the
owner had explicitly asked for and already confirmed working — a
regression the owner rightly rejected ("I didn't ask to break our other
fixes... regression is not ok").

**Actual fix:** drop the denominator entirely. The footer shows a bare
`#N` (`currentReviewIndex + 1`, no `/total`) in daily mode. This keeps
exactly the wanted behavior — the number moves on skip in either direction
— while removing the failure mode outright: with no denominator, there is
nothing for the numerator to falsely equal (Round 5's bug) and no wrong
number being displayed as if it were a target (Round 6's bug). The quota
story (reviewed vs. target) was never this footer's job before 075 either
— it belongs to StatsBar/the tab badge/the celebration screen, which
already read `dailyProgress` directly and are unaffected by any of this.
Filtered mode keeps its real, meaningful `position/size` denominator
(a genuinely fixed, small chosen set — never implicated in either bug).

## Round 7: one more attempt at a meaningful x/y (owner's design, tested live)

The owner proposed a denominator that solves Round 5/6's failure differently:
let `z` = today's raw review-event count (not deduplicated — repeats count
each time) and `r` = the tab badge's "remaining to target" number (now a
first-class `DailyProgress.remaining` field, `max(0, total - reviewed)`,
single-sourced so the badge and footer can never disagree). Denominator
`y = max(x, z + r)` where `x` is queue position; numerator stays `x`.

Traced before implementing: `z + r` genuinely fixes the Round-5 repeat-review
case (reviewing the same 2-of-3 verses repeatedly grows `z` in lockstep with
`x`, so the fraction never falsely completes) — a real improvement pairing
position with a target-shaped number correctly for the first time. Flagged
one residual gap: since `x` also advances on a bare skip (next without
recording a review — a long-supported gesture), skipping forward past
`z + r` drags the denominator up via the `max()` to match, which *can* show
a premature "N/N" with zero reviews recorded — the same failure class as
Round 5, via a different trigger.

Presented this trade-off directly rather than silently substituting a
"safer" formula. **Owner's call: ship it as proposed.** Rationale given: the
footer models "position in a hand of dealt cards" — dragging the
denominator up to meet a skip-ahead position reads as acceptable within
that framing, to be judged by feel in real use rather than by the math
alone. Implemented as specified: `DailyProgress` gained `remaining` and
`totalEvents`; `ReviewTab`'s daily-mode label is `x/max(x, totalEvents +
remaining)`. Filtered mode and the tab badge are unaffected. If the
skip-triggered early-"done" reading feels wrong in practice, the documented
fallback is `x = totalEvents` (drop position from the numerator too) —
provably safe with no clamp needed, at the cost of not moving on a bare skip.

## Round 8: three more owner requests, discussed before implementing

**1. StatsBar's target was creeping up (root-caused, not a coding slip).**
`StatsBar`/`StatsModal` were bound to `dailyProgress.total`, the SAME
floor-adjusted total the footer and badge use — which is *supposed* to
grow with overflow (an explicit, earlier-agreed design). The owner
clarified the real requirement: that dynamic behavior is correct and
wanted *before* the day's goal is met (overflow in one category genuinely
needs to "conflate" with outstanding need in another), but *after* the
milestone (all categories first simultaneously satisfied — the celebration
instant), the displayed target should **freeze**, letting `reviewed`
visibly exceed it on further bonus reviews instead of the target
perpetually chasing back to 100%.

Implementation: `DailyProgress.goal`, computed by `computeGoal()` in
`reviewScheduling.ts` — a **pure chronological replay** of today's review
events, tracking the same floor-adjusted total step by step, that returns
the snapshot at the exact instant every category first becomes satisfied
(or the live total, unchanged, if that never happens today). Deliberately
NOT a stored "first crossed" flag: a stateful ref would let two
not-yet-synced devices freeze at different values with no way to
reconcile; the replay is a pure function of the (eventually-consistent)
review log, so every device converges on the identical frozen value once
reviews sync — the same property everything else in this feature relies
on. `total`/`remaining`/`allTargetsMet` are unchanged (still feed the
badge and celebration); only StatsBar/StatsModal's binding moved from
`total` to `goal`.

**2. Card footer's denominator shrank when navigating back over skipped
cards** — felt unnatural against the "hand of dealt cards" framing (once
a card is dealt into the hand by skipping to it, looking at an earlier
card shouldn't remove it from the hand). Root cause: `y = max(x, ...)`
was recomputed fresh from the LIVE position every render, with no memory
of a prior high position. Fix: `handSize`, a high-water mark ref that
ratchets up via a `watch(currentReviewIndex, ...)` and resets only when
`loadReviewVerses()` rebuilds the queue (tab re-entry/re-sort) — never on
ordinary lap continuation. The footer formula becomes `x/max(handSize,
totalEvents + remaining)`. One bug caught before shipping: `loadReviewVerses`
originally reset `handSize.value = 0` and relied on the watcher to ratchet
it back up to `startIndex + 1` — but if `startIndex` happens to equal the
ALREADY-current index (e.g. both 0 on first load), that reassignment is a
no-op for Vue's reactivity and the watcher never fires, leaving `handSize`
stuck at 0. Fixed by setting `handSize.value = startIndex + 1` directly
rather than resetting-and-hoping the watcher fires.

**3. "Finish skipped cards?" prompt at the end of the stack.** Reaching
the literal end of a lap while `dailyProgress.remaining > 0` is an exact,
already-available signal that needed cards were skipped — deck-first
ordering guarantees `remaining` hits 0 partway through a lap under normal
straight-through review, well before its end, so reaching the end with
outstanding quota can only happen via a skip. `showSkippedCardsPrompt`
gates on this (only for collections `>= MIN_VERSES_FOR_AUTO_LOOP` — small
collections already pause every lap via `dailyLapComplete`): "Finish
Skipped Cards" calls `finishSkippedCards()` (the same `loadReviewVerses()`
rebuild as re-entering the tab — deck-first re-sort puts the outstanding
cards immediately in front); "Skip For Now" reuses `keepReviewing()`
(dismiss + append the already-fetched lap, same as celebration/lap-complete
dismissal). Not gated to once-per-day — recurs at every lap boundary while
outstanding, consistent with `dailyLapComplete`'s existing behavior;
revisit if it feels naggy in practice.

## Round 8 code review (8 finder angles) before committing

Confirmed findings, all fixed:

1. **`returnToDailyReview()` left `handSize` stale.** It resets
   `currentReviewIndex` synchronously but only reassigns `handSize` inside
   the awaited `loadReviewVerses()` — since the watcher only ratchets
   *up*, a high mark from the prior session survived the reset, briefly
   showing e.g. "1/12" during the rebuild's await. Fixed by resetting
   `handSize.value = 1` alongside the synchronous index reset.
2. **`keepReviewing()`'s "Skip For Now" reuse didn't re-check
   `MIN_VERSES_FOR_AUTO_LOOP`.** If the collection shrinks below the
   auto-loop threshold while `showSkippedCardsPrompt` sits open (verses
   paused/deleted, locally or via sync), the refetched lap would be
   silently appended instead of routing to `dailyLapComplete` — precisely
   the "small lap loops silently" bug that threshold exists to prevent.
   First fix attempt applied the check unconditionally and broke
   `dailyLapComplete`'s own "Review Again" (which *always* refetches the
   same small lap by design — that's the normal case, not an anomaly).
   Corrected by capturing `wasLapComplete` before clearing the flags: only
   re-route when a small lap surfaces while dismissing a *different*
   screen (celebration/skipped-prompt), whose own trigger required a
   larger lap at fetch time.
3. **`finishSkippedCards()` skipped the day-rollover guard.** Every other
   continuation path (`keepReviewing`) checks `checkDayRollover()`/
   `showNewDay` before proceeding; `finishSkippedCards()` didn't, so a
   date rollover while the prompt sat open would silently rebuild into the
   new day (bypassing the "A New Day Has Begun" ceremony and, more
   substantively, the review-status-cache/streak refresh that only
   `startNewDay()` performs). Fixed by adding the same guard.
4. **`sortChronologically` had no tiebreak for identical `createdAt`
   values.** Previously only a cosmetic queue-ordering risk; now
   `computeGoal`'s milestone-freeze depends on the same ordering for a
   *number*, so an ambiguous tie (synced/bulk writes) could freeze `goal`
   at different values on two devices replaying the same events —
   silently reintroducing the cross-device disagreement this feature
   exists to avoid. Fixed with a deterministic `verseId` tiebreak,
   matching the same pattern `nextLap`'s hash-collision tiebreak already
   uses.
5. **Duplication risk, fixed cheaply:** extracted `allCategoriesMet()`
   (shared by `computeProgress`'s `allTargetsMet` and `computeGoal`'s
   step-by-step check — two independent spellings of "is the day's quota
   met" could have silently diverged) and `categoryBucket()` (the
   `eligibleCategory(...) ?? 'inactive'` one-liner, previously
   hand-duplicated between `distinctReviewedByCategory` and
   `computeGoal`'s replay).
6. **Efficiency, fixed as a side effect of a correctness improvement:**
   `computeGoal` now short-circuits on the caller's already-computed
   `allTargetsMet` — category counts only grow through the replay, so if
   the full day's tally doesn't satisfy every category, no earlier prefix
   could either. Skips the entire replay (and its `versesById` build) on
   every day the milestone isn't reached, which is the common case for
   most of a typical day.
7. **`canGoNext`'s comment** was stale relative to the new
   `showSkippedCardsPrompt` pause; not a live bug (the template's
   `v-else-if` ordering already means the card/arrows aren't in the DOM
   while any interstitial shows), but corrected to say so explicitly.
8. **AGENTS.md restated `goal`'s mechanism** near-verbatim from
   systemPatterns.md, violating the project's own "one source of truth
   per fact" rule. Trimmed to a pointer.

**Consciously not fixed (flagged, deferred):** the "frozen" `goal` is a
pure replay, not persisted state — if a verse involved in reaching the
milestone is later deleted/paused/recategorized the *same day*, the next
`computeProgress` call can recompute a different (including smaller)
frozen value. Narrow (requires editing a verse the same day, after
already meeting the goal) and cosmetic-only (`remaining`/celebration are
computed independently from live state, unaffected). The only fix would
be persisting the crossing point as stateful, per-device data — which
reintroduces the exact cross-device drift this design exists to avoid, so
the trade-off is accepted and documented in `computeGoal`'s comment rather
than "fixed." Also deferred as pre-existing/hypothetical rather than
addressed this round: `finishSkippedCards()`/`startNewDay()`'s structural
duplication (only two instances — below the threshold that would justify
a shared wrapper); the four-boolean interstitial pattern (`showCelebration`
/`dailyLapComplete`/`showSkippedCardsPrompt`/`showNewDay`) not yet
consolidated into a single enum, despite now needing manual updates at
~5 call sites per flag — a real scaling concern flagged by multiple
finder angles, worth revisiting if a fifth interstitial is ever added;
`versesById` still built independently in three places (`computeQuotaState`,
`buildDailyQueue`, `computeGoal`) — the short-circuit above (#6) already
removes most of the practical cost, and a full shared-parameter refactor
across `nextLap`'s signature too felt like more churn than the remaining
sub-millisecond savings warranted.

## Notes / expected behaviors

- Celebration is once per **device** per day (localStorage flag). Crossing
  the target in filtered mode celebrates on next daily entry.
- A single day's category mix can skew toward whatever the hash favors;
  the seeded rounding keeps each category's *long-run average* frequency
  correct — accepted deliberately (targets gate the goal, not the deck).
