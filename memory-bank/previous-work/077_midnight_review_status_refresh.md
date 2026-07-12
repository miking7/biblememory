# 077 - Midnight Review-Status Highlight Refresh

**Date:** July 13, 2026
**Status:** Implemented + unit-tested; build + 120 tests green — awaiting Herd
verification
**Type:** Bug fix (reactivity + day-rollover staleness)

## The Bug

After the local calendar day rolled over, the soft background tint on **My
Verses** that marks verses "reviewed today" kept showing *yesterday's* reviewed
cards until the browser was reloaded. Midnight detection itself (the Review-tab
new-day interstitial) worked; only the highlight was stale.

**Root cause — two stacked:**

1. **No midnight invalidation of the cache.** The tint comes from
   `getCachedReviewStatus`, which reads `recentReviewsCache` — a module-level
   in-memory `Map` populated from *today's* reviews. That Map is cleared/rebuilt
   only by `loadTodaysReviewsIntoCache`, called from exactly two places: app
   startup (`initReviewCache`) and the user pressing "Start Today's Review"
   (`startNewDay`). The automatic midnight machinery — App.vue's
   `visibilitychange` listener and midnight timer — called only
   `checkDayRollover`, whose whole job is to raise the Review-tab `showNewDay`
   flag. It never touched the cache. So yesterday's entries sat in the Map, and
   a reload was the only thing that re-ran the startup rebuild against the new
   `getTodayMidnight()`.

2. **The highlight was never reactive.** `getCachedReviewStatus` reads a plain
   `Map`, which is not a Vue reactive source. Reading it during render
   registered no dependency, so mutating the Map triggered no re-render.
   Same-day highlights only *appeared* to work because tabs use `v-if`
   ([App.vue](../../client/src/App.vue)) — leaving Review and returning to My
   Verses **remounts** the component, forcing a fresh read. At midnight there is
   no remount and the Map is stale, so only a full reload cleared it.

## The Fix

Both halves had to be addressed — clearing the cache alone wouldn't have
repainted My Verses without a re-render.

- **Reactive version counter** (`actions.ts`). Added a `reviewCacheVersion` ref
  bumped on every cache mutation (`loadTodaysReviewsIntoCache`,
  `updateReviewCache`, and the DB-fallback populate in `getRecentReviewStatus`).
  `getCachedReviewStatus` now reads that ref (folded into its return expression
  so a minifier can't drop the read as a no-op), giving every render consumer —
  chiefly My Verses' `getReviewStatus` — a real reactive dependency, so the tint
  repaints the moment the cache changes (reviews, sync pulls, and the midnight
  rebuild alike).

- **App-wide midnight rebuild** (`actions.ts` + `useReview.ts` + `App.vue`).
  Added `refreshReviewCacheForToday()`, which rebuilds the cache only when the
  tracked `cacheDateString` differs from today (a cheap no-op within the same
  day). The rebuild in `loadTodaysReviewsIntoCache` prunes only *stale*
  (pre-today) entries rather than a blanket `clear()`, so a review recorded
  concurrently during its `await` isn't lost. New `useReview.handleDayRollover()`
  runs the synchronous `checkDayRollover()` first (Review-tab interstitial timing
  unchanged), then, when the day has flipped, refreshes the cache, the current
  card's status, AND the header streak / daily-progress readout (via
  `updateStats`) — otherwise the tint would clear while "reviewed today", the
  target, and the Review badge lingered on yesterday. App.vue's visibility
  listener and midnight timer now call `handleDayRollover` instead of
  `checkDayRollover`, so rollover refreshes regardless of which tab is showing
  and whether the Review tab was ever opened.

## Files Changed

- `client/src/actions.ts` — `reviewCacheVersion` ref, `cacheDateString`,
  version bumps on all cache mutations, DCE-safe reactive read in
  `getCachedReviewStatus`, prune-only-stale rebuild in
  `loadTodaysReviewsIntoCache`, new `refreshReviewCacheForToday`.
- `client/src/composables/useReview.ts` — import
  `refreshReviewCacheForToday`; new `handleDayRollover` (also refreshes streak /
  daily progress via `updateStats`, with `checkDayRollover` inside its
  try/catch); exported it.
- `client/src/App.vue` — midnight/visibility watchers call `handleDayRollover`.
- `client/src/actions.reviewCache.test.ts` — new: reactive-repaint contract,
  stale-day guard (with positive control), and day-rollover rebuild + concurrent
  no-lost-update tests (fake timers + a minimal `db` stub).

## Tests / Verification

- `npm test` → 122 passing (4 in the new file). Coverage: the reactivity test
  drives a real Vue `watchEffect` and asserts it re-runs on `updateReviewCache`;
  the rollover tests move the clock with fake timers and assert the day-change
  rebuild clears yesterday and keeps a concurrently-recorded review.
- `npm run build` (tsc + vite) green; Rollup full-bundle resolution confirms the
  new `vue` import in actions.ts introduces no cycle.
- The live midnight drive (clock-dependent, auth/data-gated) is left to Herd
  testing per the deploy flow.

## Pre-commit review

A high-effort multi-angle review (8 finder angles + verification) ran before
commit — no conventions violations. Fixes applied from it: refresh
streak/daily-progress at rollover (not just the tint); prune-only-stale rebuild
to close a lost-update race newly reachable via the background rebuild path;
DCE-safe reactive read; `checkDayRollover` moved inside `handleDayRollover`'s
try. Consciously deferred (bounded / low value): per-op re-render pressure
during a large sync pull, the read-path version bump in `getRecentReviewStatus`,
and a full `shallowRef` refactor of the cache.

## Invariant Recorded

See AGENTS.md → Invariants & gotchas → **Review-status highlight**: keep the
cache reactive via `reviewCacheVersion`, and rebuild it app-wide at rollover via
`refreshReviewCacheForToday`/`handleDayRollover` — never let the tint reflect
yesterday.
