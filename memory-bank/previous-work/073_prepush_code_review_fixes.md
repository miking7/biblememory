# 073 - Pre-Push Code Review & Fixes (Transition Migration Batch)

**Date:** July 5, 2026
**Status:** Complete ✅

## What Happened

Before pushing the five-commit remediation batch (069-072 + swipe fix), an
8-angle code review ran over `origin/master...HEAD`. Six correctness
findings were confirmed and fixed, plus a set of small cleanups. All fixes
in one commit; verified with `npm test` (64 passing) + build.

## Confirmed Findings → Fixes

1. **Reviewed-today tint fade regression (CSS cascade).** The new
   `.review-card { transition: transform … }` bounce-back rule silently
   replaced the earlier `.review-card { transition: background, border-color }`
   rule (same specificity, later wins — `transition` is one property), so
   the Got it!/Again tint snapped instead of fading. Fix: one merged rule.
2. **Swipe→leave handoff was dead code.** A leaving element keeps the
   inline styles from its last render (Vue doesn't re-patch a removing
   element), so the outgoing card still carried drag-time
   `transition: none` + transform — the inline `none` beat
   `.card-*-leave-active` and the leave completed in 0ms at the drag
   offset. Fix: the `before-leave` hook now imperatively clears the drag
   styles on the leaving element and publishes the released offset as
   `--swipe-x`; `after-leave` zeroes `swipeOffset`. This also deleted the
   `holdSwipe`/`swipeHandoffX` state dance (simpler AND correct).
3. **Leaving card was clickable with already-advanced state** (tap during
   the 300ms leave hit `handleCardClick` in 'reference' mode → next verse
   entered pre-revealed). Fix: `pointer-events: none` on `*-leave-active`.
4. **Empty-queue navigation corrupted state.** `n`/ArrowRight on the
   "All caught up" screen ran `nextVerse` (`isOnLastCard` is false when
   `total-1 === -1`), pushing the index out of bounds and setting
   `reviewComplete`, which killed the keyboard. Fix: `totalReviewCount === 0`
   guard in `navigate()`. (Pre-existing; arrows made it likelier.)
5. **Arrow keys hijacked the Edit modal's `<select>`.** The window key
   handler stayed active under modals and the target guard didn't cover
   selects. Fix: guard extended to `HTMLSelectElement` AND App's keyHandler
   now returns early while any modal is open.
6. **Hints double-hint.** Tapping the hinted text fired `addHint()` twice
   (inner div + card-click bubble; pre-existing). Fix: `@click.stop`.

## Cleanups Applied

- `preventDefault` moved to the caller: App does
  `if (handleKeyPress(e)) e.preventDefault()` — the handler's boolean
  return is the contract again, and all handled keys behave consistently.
- `canGoNext`/`canGoPrevious` computeds shared by arrows AND swipe guards
  (previously the same predicate lived in four places).
- `actionsDisabled` computed shared by all four Got it!/Again buttons.
- Per-verse `contentWords`/`firstLettersChunks`/`hintedContent` computeds —
  the template was re-tokenizing the whole verse content on every reactive
  tick (including every swipe pixel).
- Dead `showVerseText` state deleted (written three places, read nowhere).
- `card-drop` leave shortened to 150ms (View Last Card was ~500ms serial).
- CSS mirror pairs grouped; docs: version restatement + history retell
  trimmed per one-source-of-truth rule.

## Deferred (candidates noted, deliberately not done now)

- Double review-status lookup per navigation (explicit call in
  nextVerse/previousVerse + the immediate watcher) — entangled with the
  guard tests' async-window strategy; revisit with a markReview-injectable
  delay.
- `gotIt`/`again` semantics consolidation into useReview (5 call sites).
- Shared `isVerseInactive` helper (ReviewTab + VerseCard each derive it).
- Key-repeat pacing: holding ArrowRight now blasts through cards (old
  engine throttled to ~1 card/450ms). Michael tested and liked rapid nav;
  revisit only if it proves footgun-y.
- `navDirection` is set imperatively at 5 sites; verse changes from other
  flows (sync pull) animate with stale direction (cosmetic).
- `vue-tsc` in the verification loop (would have caught the undeclared
  emit that froze swipes, and template/prop mismatches generally).

## Review Infrastructure Note

8 finder angles (line-scan, removed-behavior, cross-file, reuse,
simplification, efficiency, altitude, conventions) + fact verification.
Two finders independently derived findings 1 and 2 — the mechanism claims
were verified against Vue's leaving-element patch behavior and the CSS
cascade before fixing.
