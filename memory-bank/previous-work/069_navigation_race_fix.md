# 069 - Navigation Race Fix (Double-Review / Card-Skip Guard)

**Date:** July 3, 2026
**Status:** Complete ✅

## Problem

`navigate()` guarded re-entry only via `cardAnimators.isAnimating()`, but the
review-recording feedback delay (400ms in `markReview`) runs **before** any
animation starts. During that window — with `reviewMode` still `'content'` —
every trigger stayed live: a double-tap on "Got it!" recorded **two reviews
for the same verse and advanced two cards** (skipping one unseen); rapid
keyboard/next-prev triggers interleaved two navigation sequences, producing
dropped animations and index jumps. Arrow buttons happened to be disabled by
`isTransitioning`, but that flag doesn't cover the feedback window, and the
Got it!/Again buttons, keyboard shortcuts, card clicks, and swipes had no
in-flight gate at all.

## Fix

A single `isNavigating` ref in `useReview` covering the **entire** navigate()
sequence (guard at entry, cleared in `finally`). It subsumes input gating;
the `isAnimating()` check remains for animation-internal state. Exposed and
bound into all controls:

- Got it!/Again buttons (`ReviewModeButtons`) — disabled while navigating
- Prev/Next arrows (`ReviewTab`) — disabled while navigating
- Swipe (`ReviewTab`) — `canSwipeLeft/Right` false while navigating, so a
  drag can't hijack the card transform mid-animation
- Keyboard / card-click — guarded inside `navigate()` itself

## Testing

First composable-level tests in the repo:
`client/src/composables/useReview.test.ts` (4 tests) — runs in node with no
IndexedDB by pre-seeding the review-status cache so the status watcher stays
on the synchronous cache path. Verified red without the guard (2 tests fail),
green with it. `npm test` now 64 tests.

## Files Changed

- `client/src/composables/useReview.ts` — `isNavigating` ref + try/finally
- `client/src/components/tabs/ReviewTab.vue` — arrows + swipe gating
- `client/src/components/tabs/ReviewModeButtons.vue` — action button gating
- `client/src/app.ts`, `client/src/App.vue` — wiring
- `client/src/composables/useReview.test.ts` — NEW regression tests

## Origin

Found during the state/transitions/animations architecture review (F1 —
highest-severity finding). Related: previous-work/067 fixed a different
symptom of the same architectural trait (visual/orchestration state split).
