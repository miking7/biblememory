# 074 - Sync Health State Machine (Reconnect Toast Fix)

**Date:** July 5, 2026
**Status:** Implemented + pre-push code review round applied — awaiting final
Herd verification
**Type:** Bug fix + sync-layer hardening

## The Bug

After being offline, restoring connectivity popped the *"⚠️ Sync issues -
currently offline. Changes saved locally."* toast at the same moment the red
badge turned healthy.

**Root cause (two stacked):**

1. The `watch(hasSyncIssuesWithAuth)` in `app.ts` fired `showToast()` on
   **both** transition directions, but the toast body was a single hard-coded
   offline message in `App.vue`. The 031 design specified a "connectivity
   restored" message for the recovery direction; it was filed as a future
   enhancement and never built, so the recovery transition wore the offline
   text.
2. The health flip happened on a **guess**: `syncAndReload` cleared
   `isOffline` from `navigator.onLine` as its first line, and the offline-skip
   path had pre-set `lastSyncSuccess = true` — so `hasSyncIssues` flipped
   healthy the instant the interface came back, before any request ran.

**Amplifiers (could flap error→healthy→error, re-showing the toast):**
- The 5 s `Promise.race` timeout abandoned but didn't abort the fetch; the
  orphaned sync kept running while holding the `syncInFlight` flag.
- While it ran, concurrent `syncNow()` calls resolved instantly as no-ops —
  which the scheduler scored as successful syncs.
- Push failures were swallowed (pull success alone reported overall success),
  so the badge could claim healthy while the outbox never drained — and the
  1 s outbox loop then hot-retried the failing push every second.

## The Fix (review options A + B-full + C + D)

- **`useSync` rewritten as a settled-verdict state machine.**
  `syncHealth: 'offline' | 'error' | 'synced'` changes only on evidence:
  offline signal, completed sync, or failed sync. `'synced'` is only set
  after `syncNow()` resolves. `isSyncing` is a separate activity flag;
  `syncStatus` derives the display union with `'syncing'`. A failure with
  connectivity lost mid-flight settles `'offline'`, not `'error'`.
- **Connectivity events with trust asymmetry.** `offline` event →
  authoritative, settle immediately; `online` event → hint only, triggers a
  verification sync. No more polling-only detection (status was up to 30 s
  stale before).
- **Truthful toasts.** `SYNC_TOAST_TEXT` in `app.ts` keys message + color
  (warning/success) to the verdict being announced; the watcher observes
  `syncHealth` transitions. Recovery now shows a green "✅ Back online — all
  changes synced."
- **Real request timeouts.** `fetchWithTimeout` (AbortController, 10 s per
  request) replaces the scheduler-level race — each pull page gets its own
  timeout, and aborted requests actually stop.
- **Shared in-flight sync.** Concurrent `syncNow()` callers await the same
  promise; a resolution always means a completed sync.
- **Push failures fail the sync** (after the pull still runs), so unsynced
  local changes are visible as `'error'`, and the immediate-outbox loop is
  gated on healthy — no more 1 s hot-retry against a failing endpoint.
- **Scheduler cadence while offline** dropped from a 1 s skip-loop to the
  30 s periodic check + event triggers.

Renames: toast state is now `showSyncToast` / `syncToastMessage` /
`syncToastKind` / `triggerSyncToast`; CSS `.offline-toast` → `.sync-toast`
with `--warning` / `--success` variants; dead `.online-indicator` removed.
The badge (`.offline-badge`) and its click-to-re-show behavior are unchanged.

## Deliberately Deferred (review option E)

Scheduler lifecycle (interval/listeners are never torn down — harmless today
because logout navigates to `/`, resetting the page) and exponential backoff
(flat 30 s retry is fine for a single-user server). Also noted in the review,
untouched: per-device `client_id` to avoid pulling back own ops, poison-op
handling in `push.php` (invalid ops are skipped but never acked, so they
re-push forever), delete-resurrection without tombstones, and a distinct
"session expired" UX for 401s.

## Pre-Push Code Review Round (8-angle, adversarially verified)

The review found 6 CONFIRMED bugs in the first implementation; all fixed in
the same batch:

1. **Body-read wedge (worst):** `fetchWithTimeout` disarmed its abort timer
   when response *headers* arrived, leaving `response.json()` unbounded — a
   stalled body would wedge the shared `syncInFlight` promise forever (sync
   dead until reload, badge frozen). Fix: the helper (now
   `utils/http.ts`) reads the body under the armed signal and returns
   `{ ok, status, text }`; throws typed `TimeoutError`.
2. **Login timeout regression:** `login()`/`register()` inherited the new
   10 s pull timeout after the token was already stored → "Login failed"
   with a valid session. Fix: initial sync is best-effort (try/catch);
   scheduleSync retries immediately after login.
3. **performSync had no coordination:** a multi-minute pull accumulated one
   interval joiner per second past the 30 s mark (counter reset sat after the
   await), each replaying `onSyncComplete`; online+visibility pairs reloaded
   twice; the `isSyncing` boolean was falsified by overlaps. Fix: pass
   serialization (below) + counter reset before a non-awaited `performSync`.
4. **Doomed-sync join:** the `online` handler joined a pre-disconnect
   in-flight request via the shared promise and inherited its timeout →
   red "Sync problem" toast right after reconnecting. Fix: trailing rerun.
5. **Stale-success overwrite:** `'synced'` was written after awaiting
   `onSyncComplete`, clobbering an `offline` event landing mid-await. Fix:
   settle re-checks `navigator.onLine`.
6. **Reconnect latency regression:** the outbox fast-path required
   `'synced'`, so recovery relied on the flaky iOS `online` event or the
   30 s tick (old code recovered in ~1 s). Fix: fast-path also fires as a
   reconnect probe when verdict is `'offline'` but the browser reports a
   network.

**The serialization design (fixes 3-5):** one pass at a time; triggers within
1 s of pass start share it; later triggers flag ONE coalesced trailing rerun;
only the final pass settles the verdict, so superseded-pass failures never
reach the UI. `isSyncing` spans the whole chain.

Cleanups from the same review: dead `lastSyncAttempt` removed; unused
`syncStatus`/`lastSyncError` re-exports dropped from app.ts (they remain on
useSync — tested + documented); dead `health === oldHealth` watcher guard
removed; `fetchWithTimeout` extracted to `utils/http.ts` and adopted by
`useAddVerseWizard` (whose inline copy had the same clear-at-headers flaw).
PLAUSIBLE-and-deferred: a second tab left open across a logout loops a
failing "Not authenticated" sync every 30 s (scheduler-lifecycle gap, option
E below).

## Tests

`client/src/composables/useSync.test.ts` — 9 node-env tests: offline skip,
no-premature-healthy during reconnect sync (the original regression), error
vs offline settling on failure, error clearing, stale-success settle
re-check, freshness-window pass sharing, doomed-reconnect trailing rerun
(superseded pass must not settle), and scheduler wiring — with stubbed
`navigator`/`window`/`document` and mocked `syncNow`.

## Verification

- `npm test` — 73/73 passing
- `npm run build` — clean (tsc + vite + PWA)
- Herd manual test pending: go offline (verses edited + untouched variants),
  restore connectivity → expect green "Back online" toast within ~1 s, badge
  clears only after sync completes; kill the API while online → expect red
  "Sync problem" toast + badge; AI parse in Add Verse still works (shared
  fetch helper).
