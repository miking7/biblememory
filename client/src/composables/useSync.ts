import { ref, computed } from 'vue';
import { db } from '../db';
import { syncNow } from '../sync';

// Track if sync has been scheduled to prevent duplicate listeners
let syncScheduled = false;

export function useSync() {
  // Sync status tracking
  const lastSyncSuccess = ref(true);
  const lastSyncError = ref<string | null>(null);
  const lastSyncAttempt = ref(0);

  // Computed
  const hasSyncIssues = computed(() => {
    // Only show sync issues if authenticated (will be checked by caller)
    return !lastSyncSuccess.value;
  });

  // Schedule automatic sync (only called when authenticated)
  const scheduleSync = (
    onSyncComplete?: () => Promise<void>
  ) => {
    // Prevent multiple sync schedules
    if (syncScheduled) {
      console.log("Sync already scheduled, skipping duplicate");
      return;
    }

    syncScheduled = true;
    console.log("Starting sync schedule...");

    // Helper to sync and reload UI
    const syncAndReload = async () => {
      // Skip sync if offline
      if (!navigator.onLine) {
        console.log("Offline - skipping sync");
        lastSyncSuccess.value = true; // Don't show error when intentionally offline
        lastSyncError.value = null;
        return;
      }

      lastSyncAttempt.value = Date.now();
      try {
        // Add 5-second timeout to prevent long waits
        await Promise.race([
          syncNow(),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Sync timeout')), 5000)
          )
        ]);

        // Call reload callback if provided
        if (onSyncComplete) {
          await onSyncComplete();
        }

        // Update sync status
        lastSyncSuccess.value = true;
        lastSyncError.value = null;
        console.log("Sync completed and UI updated");
      } catch (err: any) {
        // Update sync status
        lastSyncSuccess.value = false;
        lastSyncError.value = err.message || 'Sync failed';
        console.error("Sync failed:", err);
      }
    };

    // Initial sync
    syncAndReload();

    // Adaptive sync with 1-second check interval
    let syncCounter = 0;

    setInterval(async () => {
      // Check if there's pending data in outbox
      const outboxCount = await db.outbox.count();

      if (outboxCount > 0 && lastSyncSuccess.value) {
        // Only do immediate sync if last sync succeeded
        // If connectivity is failing, wait for normal 30-second interval
        console.log(`Outbox has ${outboxCount} pending operations, syncing now...`);
        await syncAndReload();
        syncCounter = 0; // Reset counter after sync
      } else {
        // Increment counter for periodic sync
        syncCounter++;

        // Periodic sync every 30 seconds
        if (syncCounter >= 30) {
          console.log("Periodic sync (30 seconds elapsed)");
          await syncAndReload();
          syncCounter = 0;
        }
      }
    }, 1000); // Check every 1 second

    // Sync when tab becomes visible
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") {
        syncAndReload();
      }
    });
  };

  return {
    // State
    lastSyncSuccess,
    lastSyncError,
    lastSyncAttempt,

    // Computed
    hasSyncIssues,

    // Methods
    scheduleSync
  };
}
