# 072 - Single `review` Prop Consolidation

**Date:** July 3, 2026
**Status:** Complete ✅

## What Changed

ReviewTab and ReviewModeButtons now receive the whole review composable as
one prop (`review: ReviewComposable`, a new exported type from useReview) —
the pattern systemPatterns §7 had documented all along. Inside each
component the needed refs/actions are destructured once in setup (refs stay
reactive and auto-unwrap in templates); review actions are called directly
instead of being emitted up and re-dispatched.

- ReviewTab: 15 props + 14 events → 1 prop + 3 events (only the non-review
  concerns still emit: copyVerse, viewOnline, editVerse — App owns
  clipboard/browser/edit-modal).
- ReviewModeButtons: 5 props + 10 events → 1 prop + 0 events (Got it!/Again
  call `review.navigate` directly; App's handleGotIt/handleAgain/
  handleNavigate wrappers deleted).
- `handleCardClick` moved from app.ts into useReview (it only ever touched
  review state — mode-dependent tap behavior is review logic).
- `isCurrentVerseInactive` moved from App.vue into ReviewTab (derived
  purely from the current verse).
- app.ts return bag pruned: the review section shrank from ~45 entries to
  `review` + the 10 pieces App's own template binds (stats tiles, tab
  badge, keyboard gate, select-review handler).

## Why (History)

064 deliberately chose individual props to keep component APIs explicit,
but the wiring grew to ~30 lines per usage and drifted from the documented
pattern — the July 2026 architecture review flagged the doc/code
contradiction (F6) and recommended consolidating. systemPatterns §7 now
reflects the implemented pattern, including the destructure-in-setup detail
(the old example's `props.review.currentReviewVerse` template usage would
not have auto-unwrapped).

## Files Changed

- `client/src/composables/useReview.ts` — `ReviewComposable` type export;
  handleCardClick moved in
- `client/src/components/tabs/ReviewTab.vue` — single prop + destructure;
  direct action calls; local isCurrentVerseInactive
- `client/src/components/tabs/ReviewModeButtons.vue` — single prop; direct
  action calls; local gotIt/again
- `client/src/App.vue`, `client/src/app.ts` — wiring collapse

## Origin

Item 5 (final) of the architecture-review remediation. See 069-071.
