# 071 - Vue `<Transition>` Migration (Card Animations)

**Date:** July 3, 2026
**Status:** Complete ✅

## What Changed

Replaced the hand-rolled card animation engine (`useCardTransitions.ts` —
deleted) with Vue's built-in `<Transition>`, used at two levels in ReviewTab:

- **Inner:** the card, keyed by verse id with `mode="out-in"` — navigating
  simply changes the key; Vue runs leave (300ms) then enter (150ms).
- **Outer:** the empty / review / completion block swap — completing a
  review now slides the whole review surface out before the completion
  screen slides in (previously the card slid out and the completion screen
  popped in).

Transition names (`card-left`, `card-right`, `card-drop` in styles.css) are
chosen from a new `useReview.navDirection` ref ('next' | 'previous' |
'restart' | 'view-last') — plain state, set by the orchestration methods.

`navigate()` no longer awaits animations at all: it guards (isNavigating),
records the review (400ms feedback), sets `navDirection`, mutates state, and
releases. Vue owns everything visual and handles interruption natively.

## What This Removed

- `useCardTransitions.ts` (~180 lines): sleep()-based open-loop timing, the
  `sleep(10)` render hack, `isTransitioning`/`cardVisible`/`cardOffset` state.
- The `registerCardAnimators` handshake between ReviewTab and useReview
  (the lifecycle smell: never deregistered, stale closures after unmount).
- **The exit/entry/reset invariant from 067** — Vue cannot strand visibility
  state, so the entire invisible-card bug class is structurally gone.
- The latent quirk where `entry('down')` actually slid horizontally
  (offsets were always applied as translateX) — view-last now genuinely
  drops in from below.

## Swipe Handoff (fixes the F4 continuity gap)

Drags bind an inline transform (finger-following). On successful release the
card holds the dragged offset (`holdSwipe`) and publishes it as the
`--swipe-x` CSS custom property; the `*-leave-from` classes read it, so the
exit animation continues from under the finger instead of snapping to
center. Cleared on `@before-leave`/`@after-leave` of both Transitions (outer
too — a swipe on the last card triggers the block swap, not a card swap).

## Behavioral Notes (for testing)

- Completion now animates as a block swap (review surface out → completion
  in); "Review More" / "Return to Daily" slide the first card in from the
  right; "View Last Card" drops in from below.
- Controls re-enable once state mutates (not when animations finish) — rapid
  navigation retargets smoothly via out-in instead of being blocked.
- Reduced motion: covered by the existing global media query.

## Files Changed

- `client/src/composables/useReview.ts` — navDirection; animation-free navigate()
- `client/src/composables/useCardTransitions.ts` — DELETED
- `client/src/components/tabs/ReviewTab.vue` — nested Transitions + swipe handoff
- `client/src/styles.css` — named transition classes
- `client/src/app.ts`, `client/src/App.vue` — wiring (navDirection in,
  registerCardAnimators gone)
- `client/src/composables/useReview.test.ts` — animator mocks removed

## Origin

Item 4 of the architecture-review remediation (absorbs item 3: swipe
continuity + registration lifecycle). See previous-work/069, 070.
