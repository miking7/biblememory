# 065 - Pre-Push Code Review & Fixes (App.vue Decomposition)

## Context
The Jan 25–27 decomposition work (extracting App.vue into components +
composables, work items 059–064) had not been pushed to production. A
best-practice review was run over `master..unfinished-dev` before merge.

## Issues found & fixed

1. **Build was red (blocker).** `tsc` had 11 errors, so `npm run build`
   (`tsc && vite build`) could not deploy.
   - Root cause of the wiring errors: `VerseCard` emits a string **id** for
     `delete`/`review-this`, but `MyVersesTab` re-declared those emits as
     `Verse`. Handlers (`deleteVerse(id)`, `startReviewAtVerse(id)`) want the
     id. Fixed the emit types; typed `sortBy` as the `SortBy` union; guarded
     the nullable `EditingVerse` assign; removed dead destructures.

2. **Animation regression.** The decomposition moved card transitions into
   `ReviewTab` but left `navigate()` animation-less, so only arrow/swipe
   navigated with a slide — keyboard, Got it/Again and card-click changed the
   verse with no exit slide (and a stale entry direction).
   - Fix: `navigate()` is the single orchestrator again. `ReviewTab` registers
     its transitions via `useReview.registerCardAnimators()`; `navigate()`
     drives the full record → exit → change → entry sequence for **every**
     source. Removed the duplicate `handleAnimatedNavigation`/`pendingDirection`
     /watcher. Restored `viewLastCard`'s down-slide.

3. **Modal a11y + duplication.** Extracted `components/modals/BaseModal.vue`
   (overlay scaffold + Escape-to-close, focus trap, focus restore, body scroll
   lock, `role=dialog`/`aria-modal`/`aria-label`). About/Auth/EditVerse now
   render content only. Added password-manager `autocomplete` hints to auth.

4. **Polish.** Removed a double `verse-added` emit on the collection path
   (the wizard already fires `onVerseAdded` internally); deleted the dead
   duplicate `formatTagForDisplay` in `useVerses` (live copy is in
   `reviewHelpers`); made `ReviewTab`'s reference-word helpers `computed`.

## Deferred (deliberate): ReviewTab prop relay

`ReviewTab` still receives ~12 props and relays ~14 emits that are mostly
slices of `useReview`. The tempting "have ReviewTab call `useReview()` itself"
**does not work**: `bibleMemoryApp()` / `useReview()` are **factory functions,
not singletons** — each call creates fresh `ref`s, so a second call yields
disconnected state.

To actually retire the relay, the recommended approach is **provide/inject**:
`App.vue` calls `bibleMemoryApp()` once and `provide()`s the instance under a
typed `InjectionKey`; `ReviewTab` `inject()`s it and uses state/methods
directly. Gotchas to handle when doing this:
- One `ReviewTab` prop (`isCurrentVerseInactive`) is an App-level `computed`,
  not part of `bibleMemoryApp()` — provide it too, or move it into the
  composable.
- `currentVerseReviewStatus` is typed via a local interface in ReviewTab; keep
  the type single-sourced.
- Converting composables to module-level singletons instead is **not advised**:
  it changes logout-reset and HMR semantics and touches every consumer.

Decision: defer to its own session with review-tab smoke testing. The current
relay is verbose but correct and type-safe — a smell, not a defect.

## Status
`tsc` + `vite build` green. Commits sit on `unfinished-dev` for a pre-push
squash. `conversation.md` (future streak/extras design notes) is intentionally
kept as the branch-tip commit and NOT merged to master.
