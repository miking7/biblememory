# 067 - Review Card Visibility Fix (Invisible Card After Completion Screen)

**Date:** July 3, 2026
**Status:** Complete ✅

## Problem

After completing a review and choosing "Review More" (and in related flows), the
app showed a blank area instead of the first card of the new queue. Navigating
"next" showed the second card correctly, and "prev" then showed the first card
fine. The blank card was still interactive — clicks could silently reveal it and
even record a review on a verse the user never saw.

## Root Cause

Card visibility is driven by animation state, not review state. The card's
opacity binds to `cardVisible` in `useCardTransitions`, which only two things
write: `exitTransition` ends with `cardVisible = false`, and `entryTransition`
is the *only* writer that sets it back to `true`.

**Implicit invariant:** every exit animation must be followed by an entry
animation, or the card region must unmount.

The invariant broke in exactly one place: the last-card branch of
`useReview.navigate()` runs the exit animation, then shows the completion
screen with (deliberately) no entry animation. The stale `cardVisible = false`
survived in state, so any flow that re-presented a card from the completion
screen *without* an entry animation and *without remounting ReviewTab* rendered
the card at `opacity: 0`:

1. Daily completion → "Review More" (`resetReview`)
2. Filtered completion → "Return to Daily Review" (`returnToDailyReview`)
3. On the completion screen, re-tapping the "Review" tab button (`selectReview`
   → `returnToDailyReview` with no remount)

`viewLastCard()` was unaffected because it plays an explicit entry animation.
Switching to another tab and back also masked the bug (ReviewTab is `v-if`
mounted, so a remount creates fresh transition state) — which made it look
intermittent.

## Fix

**Restore the invariant at the single point where it breaks** rather than
patching each affected flow:

1. `useCardTransitions` gained a `resetCard()` primitive — instantly restores
   the resting state (centered, visible, no transition).
2. ReviewTab registers it as a third animator (`reset`) alongside exit/entry.
3. `navigate()`'s completion branch calls `cardAnimators?.reset()` right after
   `completeReview()` — the completion screen covers the card at that moment
   (v-show), so the reset is invisible, and no flow can ever inherit a stale
   hidden card.

**Companion fix:** `resetReview()` is now async and awaits the daily-queue
regeneration *before* clearing `reviewComplete`. Previously it flipped the flag
first and fired the reload without awaiting, which (once the card was visible
again) would flash the old queue's first card until the new queue swapped in.

## Files Changed

- `client/src/composables/useCardTransitions.ts` — added `resetCard()`
- `client/src/components/tabs/ReviewTab.vue` — registers `reset` animator
- `client/src/composables/useReview.ts` — reset after `completeReview()` in
  `navigate()`; `resetReview()` awaits regeneration before un-completing

## Verification

- `npm run build` (tsc + vite) passes.
- Manual: complete daily review → "Review More" → first card visible
  immediately. Same for filtered completion → "Return to Daily Review", and
  completion screen → re-tap Review tab. "View Last Card" still animates in.

## Lesson

When visual state (visibility/position) is owned by an animation composable,
every code path that presents content must end in a state-restoring animation
step — or there must be a reset primitive invoked at the point where the
animation chain intentionally stops. Watch for "works after navigating once"
symptoms: they usually mean presentation state survived a flow boundary.
