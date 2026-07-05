import { ref, computed } from 'vue';
import { db } from '../db';
import { syncNow } from '../sync';

// Settled health verdicts. 'synced' is only ever set after a sync actually
// completes — flipping healthy on mere connectivity detection is what used to
// pop the offline toast on reconnect (the transition fired before any request
// had been made).
export type SyncHealth = 'offline' | 'error' | 'synced';

// Display status: health plus the transient in-flight activity.
export type SyncStatus = SyncHealth | 'syncing';

// Track if sync has been scheduled to prevent duplicate listeners
let syncScheduled = false;

export function useSync() {
  // Last settled verdict — changes only on real evidence: an 'offline'
  // event / navigator.onLine === false, a completed sync, or a failed sync.
  const syncHealth = ref<SyncHealth>('synced');
  const isSyncing = ref(false);
  const lastSyncError = ref<string | null>(null);

  const syncStatus = computed<SyncStatus>(() =>
    isSyncing.value ? 'syncing' : syncHealth.value
  );

  const hasSyncIssues = computed(() => {
    // Only show sync issues if authenticated (will be checked by caller)
    return syncHealth.value !== 'synced';
  });

  // UI reload callback, installed by scheduleSync
  let onSyncComplete: (() => Promise<void>) | undefined;

  // performSync serialization: one pass runs at a time. A trigger arriving
  // mid-pass must not simply join it — the in-flight request may predate the
  // trigger's cause (the 'online' handler joining a pre-disconnect request
  // would inherit its doomed timeout). Triggers landing within FRESH_PASS_MS
  // of the pass start share it (paired events like online + visibilitychange
  // on mobile wake would otherwise reload the UI twice); anything later
  // flags a trailing rerun. Only the FINAL pass settles the verdict, so a
  // superseded pass's failure (or stale success) never reaches the UI.
  const FRESH_PASS_MS = 1000;
  let syncPassChain: Promise<void> | null = null;
  let passStartedAt = 0;
  let rerunRequested = false;

  const runOnePass = async () => {
    passStartedAt = Date.now();

    // navigator.onLine === false is trustworthy (no network interface), so
    // don't attempt a doomed request. true only means "maybe online" — that
    // case is proven by the request below succeeding.
    if (!navigator.onLine) {
      console.log("Offline - skipping sync");
      syncHealth.value = 'offline';
      return;
    }

    try {
      await syncNow();

      // Call reload callback if provided
      if (onSyncComplete) {
        await onSyncComplete();
      }

      if (!rerunRequested) {
        // Re-check connectivity at settle time: an authoritative 'offline'
        // event may have landed during the awaits above, and this pass's
        // stale success must not overwrite it.
        syncHealth.value = navigator.onLine ? 'synced' : 'offline';
        lastSyncError.value = null;
        console.log("Sync completed and UI updated");
      }
    } catch (err: any) {
      if (!rerunRequested) {
        // A request killed by losing connectivity mid-sync is 'offline',
        // not a sync error.
        syncHealth.value = navigator.onLine ? 'error' : 'offline';
        lastSyncError.value = err?.message || 'Sync failed';
      }
      console.error("Sync failed:", err);
    }
  };

  const performSync = (): Promise<void> => {
    if (syncPassChain) {
      if (Date.now() - passStartedAt >= FRESH_PASS_MS) {
        rerunRequested = true;
      }
      return syncPassChain;
    }

    syncPassChain = (async () => {
      isSyncing.value = true;
      try {
        do {
          rerunRequested = false;
          await runOnePass();
        } while (rerunRequested);
      } finally {
        isSyncing.value = false;
        syncPassChain = null;
      }
    })();
    return syncPassChain;
  };

  // Schedule automatic sync (only called when authenticated)
  const scheduleSync = (
    onComplete?: () => Promise<void>
  ) => {
    // Prevent multiple sync schedules
    if (syncScheduled) {
      console.log("Sync already scheduled, skipping duplicate");
      return;
    }

    syncScheduled = true;
    onSyncComplete = onComplete;
    console.log("Starting sync schedule...");

    // Initial sync
    performSync();

    // Adaptive sync with 1-second check interval. performSync serializes
    // itself and never rejects, so it is deliberately not awaited — awaiting
    // it here once stalled the counter reset behind a multi-minute pull,
    // turning every subsequent tick into another sync joiner.
    let syncCounter = 0;

    setInterval(async () => {
      // Check if there's pending data in outbox
      const outboxCount = await db.outbox.count();

      // Immediate sync while healthy, plus the reconnect probe: when we
      // believe we're offline but the browser now reports a network, pending
      // changes shouldn't wait for the (historically flaky on iOS PWAs)
      // 'online' event or the 30-second tick. 'error' still backs off to the
      // periodic retry so a failing server isn't hammered.
      const canSyncNow = syncHealth.value === 'synced' ||
        (syncHealth.value === 'offline' && navigator.onLine);

      if (outboxCount > 0 && canSyncNow && !isSyncing.value) {
        console.log(`Outbox has ${outboxCount} pending operations, syncing now...`);
        syncCounter = 0;
        performSync();
      } else {
        // Increment counter for periodic sync
        syncCounter++;

        // Periodic sync every 30 seconds
        if (syncCounter >= 30) {
          console.log("Periodic sync (30 seconds elapsed)");
          syncCounter = 0;
          performSync();
        }
      }
    }, 1000); // Check every 1 second

    // Connectivity transitions: 'offline' is authoritative and applies
    // immediately; 'online' is only a hint — it triggers a verification
    // sync, and health flips green when that sync succeeds.
    window.addEventListener("offline", () => {
      console.log("Connectivity lost");
      syncHealth.value = 'offline';
    });
    window.addEventListener("online", () => {
      console.log("Connectivity restored - verifying with a sync...");
      performSync();
    });

    // Sync when tab becomes visible
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") {
        performSync();
      }
    });
  };

  return {
    // State
    syncHealth,
    isSyncing,
    lastSyncError,

    // Computed
    syncStatus,
    hasSyncIssues,

    // Methods
    performSync,
    scheduleSync
  };
}
