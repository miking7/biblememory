# 076 — Grand-Total Daily Progress (Simplify Measurement)

**Date:** July 7, 2026
**Status:** Implemented on branch `scheduling-v2`; unit tests (117) + build
green. Not yet pushed — awaiting owner Herd test + go-ahead for the
history-overwriting force-push.

## Problem

Deterministic scheduling (075) landed correctly, but the *measurement* layer
— how "how much is left today / am I done" is computed and displayed — took
eight rounds of production feedback to stabilise (075 Rounds 5–8). The root
cause: progress was tracked per category and then reduced to a displayed
number, so the derived numbers kept fighting each other. `total` was a
floor-adjusted per-category sum (`Σ max(target, distinct-reviewed)`) that
grew with over-review; `goal` was a *separate* chronological-replay view of
that total, frozen at the milestone instant, added specifically to stop the
denominator chasing upward; the footer denominator went through four
revisions. Three distinct target-shaped numbers, three owners, one recurring
class of bug.

## Decision (owner-agreed, discussed before implementing)

Measure progress as **one grand total, ignoring category**. Keep per-category
targets strictly as an internal scheduling detail (they still build the
deck); stop using them to split the progress readout.

Framed precisely, the whole change is one choice about `remaining`:

- **Before (per-category):** `remaining = Σ max(0, target[c] − reviewed[c])`
  — over-reviewing one category never pays down another; this is why `total`
  grew and `goal`/freeze existed.
- **After (grand total):** `dailyTarget = Σ target[c]` (fixed for the day);
  `remaining = max(0, dailyTarget − reviewed)`.

The two are identical except for cross-category overflow, and diverge only
when the user reviews **out of the dealt order**. Deck-first ordering deals
the due verses first, so straight-through review — the common case — makes
the two schemes agree.

Why it genuinely removes complexity rather than moving it: `dailyTarget`
never depends on what you review, so it is fixed the moment the verse set and
date are known. That single property deletes everything that fought the old
design — there is nothing to freeze, and Round 8's wanted behaviour
("`reviewed` visibly exceeds a stationary target on bonus reviews") is now
true by construction.

## What changed

`DailyProgress` collapsed from five target-shaped fields to one fixed target:

| Before | After |
|---|---|
| `reviewed` (all categories) | `reviewed` (distinct **eligible** only) |
| `total` (floor-adjusted, drifts) | `dailyTarget` = Σ targets (fixed) |
| `goal` (frozen replay of `total`) | *(gone)* |
| `allTargetsMet` | `goalMet` = `reviewed ≥ dailyTarget` |
| `remaining`, `totalEvents` | unchanged |

**Deleted** from `reviewScheduling.ts`: `computeGoal` (the replay + freeze +
its cross-device-convergence caveat), `totalFor`, `allCategoriesMet`,
`sumReviewed`. `computeProgress` is now a handful of lines. The engine
(`computeTargets`, deck-first `nextLap`, hashing, `buildDailyQueue`,
eligibility, rollover) is untouched — battle-tested, carried forward verbatim.

**`reviewed` is now eligible-only.** Reviewing a paused/future/unstarted
verse (only reachable via filtered review) no longer counts toward the day —
it carries no target, so counting it would let `remaining` fall without a
matching target. Cleaner and more correct than the old net-out.

**Consumers:** StatsBar/StatsModal denominator and the tab badge now read
`dailyTarget`/`remaining` (no `goal`); celebration gates on `goalMet`.

**`showSkippedCardsPrompt` / `finishSkippedCards` removed** (owner: "no
prompt"). Its whole reason to exist was per-category "a due card is still
outstanding at lap end" — a signal grand-total measurement doesn't produce.
One fewer interstitial (three booleans instead of four).

## Deliberately accepted — con #1

Reaching the grand total with a **skewed category mix** reads as "done" even
if a specific due verse was skipped (e.g. dailyTarget 4 met by reviewing 4
monthly verses while a due daily verse sits untouched). This is only
reachable by deliberately skipping the dealt order, because deck-first deals
the due verses first; a straight-through reviewer always does the right set.
Owner accepted this simplicity over policing the mix — the same spirit as
Anki showing one due count. Schedule *integrity* was always protected by the
deck ordering, never by the measurement.

## Footer — kept as-is

Owner kept the card footer's "hand of dealt cards" framing: `x` = queue
position (moves on skip), `y = max(handSize, totalEvents + remaining)`. Only
`remaining`'s definition simplified underneath it; `totalEvents` and the
`handSize` high-water mark are unchanged. Early straight-through review now
sits at `y ≈ dailyTarget` (cleaner, since it no longer drifts up with
overflow); once past the goal, `remaining` is 0 and `y` grows with
`totalEvents` as more cards are shown — the "extra dealt cards" the owner
described. The Round 7 known edge (skipping *forward* past the outstanding
count can momentarily show a premature N/N) persists and remains accepted.

## History cleanup

The six-commit 075 saga (`9864f18`..`34626ac`) was self-contained — every
commit touched only scheduling files, so nothing unrelated needed rescuing.
Rebuilt on a branch from `530e965` (the last pre-saga commit — the 074 sync
fix): the saga squashed to one faithful base commit (tree byte-identical to
`34626ac`, 126 tests green), then this simplification on top. Old master tip
tagged `backup/pre-scheduling-cleanup`. Intended endpoint: force-push over
master to replace the eight-round history with a clean pair of commits
(owner go-ahead required — master push = production).

## See

`client/src/utils/reviewScheduling.ts` (`computeProgress`, `DailyProgress`),
`client/src/composables/useReview.ts`, `client/src/components/tabs/ReviewTab.vue`
(footer), previous-work/075 (the original design this supersedes).
