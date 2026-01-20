import { db, clearLocalData, clearServiceWorkerCaches } from "./db";
import { updateReviewCache } from "./actions";

const API_BASE = "/api";

// Get auth headers with token
async function getAuthHeaders(): Promise<HeadersInit> {
  const auth = await db.auth.get("current");
  if (!auth || !auth.token) {
    throw new Error("Not authenticated. Please log in.");
  }
  
  return {
    "Content-Type": "application/json",
    "X-Auth-Token": auth.token
  };
}

// Push operations to server
export async function pushOps(): Promise<void> {
  try {
    // Get up to 500 operations from outbox
    const ops = await db.outbox.orderBy("ts_client").limit(500).toArray();
    
    if (ops.length === 0) {
      return; // Nothing to push
    }

    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE}/push`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        client_id: "web-client", // Could be made unique per device
        ops
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Push failed: ${response.status} ${error}`);
    }

    const result = await response.json();

    // Remove acknowledged operations from outbox
    if (result.acked_ids && result.acked_ids.length > 0) {
      await db.outbox.bulkDelete(result.acked_ids);
    }

    // Update sync cursor
    await db.sync.put({
      id: "default",
      cursor: result.cursor || 0,
      lastPushAt: Date.now(),
      lastPullAt: null
    });

  } catch (error) {
    console.error("Push error:", error);
    throw error;
  }
}

// Pull operations from server
export async function pullOps(): Promise<void> {
  try {
    // Get current sync state
    const syncState = await db.sync.get("default");
    const cursor = syncState?.cursor || 0;

    const headers = await getAuthHeaders();
    const response = await fetch(
      `${API_BASE}/pull?since=${cursor}&limit=500`,
      { headers }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Pull failed: ${response.status} ${error}`);
    }

    const result = await response.json();
    const { cursor: newCursor, ops } = result;

    if (!ops || ops.length === 0) {
      // Update lastPullAt even if no new ops
      if (syncState) {
        await db.sync.put({
          ...syncState,
          lastPullAt: Date.now()
        });
      }
      return;
    }

    // Apply operations in a transaction
    await db.transaction(
      'rw',
      db.verses,
      db.reviews,
      db.settings,
      db.appliedOps,
      db.sync,
      async () => {
        for (const op of ops) {
          // Check if already applied (deduplication)
          const already = await db.appliedOps.get(op.op_id);
          if (already) continue;

          // Apply operation based on entity and action
          if (op.entity === "verse") {
            if (op.action === "add" || op.action === "set") {
              // For verses, use LWW (Last-Write-Wins)
              const existing = await db.verses.get(op.data.id);
              const opTimestamp = op.ts_server || op.ts_client;
              
              if (!existing || (existing.updatedAt || 0) < opTimestamp) {
                await db.verses.put({
                  ...op.data,
                  updatedAt: opTimestamp
                });
              }
            } else if (op.action === "delete") {
              await db.verses.delete(op.data.id);
            }
          } else if (op.entity === "review" && op.action === "add") {
            // Reviews are append-only
            const reviewTimestamp = op.data.createdAt || op.ts_server || op.ts_client;
            await db.reviews.put({
              id: op.data.id || op.op_id,
              verseId: op.data.verseId,
              reviewType: op.data.reviewType,
              createdAt: reviewTimestamp
            });

            // Update review cache for visual feedback (if review is from today)
            updateReviewCache(
              op.data.verseId,
              op.data.reviewType as 'recall' | 'practice',
              reviewTimestamp
            );
          } else if (op.entity === "setting" && op.action === "set") {
            // Settings use LWW
            const existing = await db.settings.get(op.data.key);
            const opTimestamp = op.ts_server || op.ts_client;
            
            if (!existing || existing.updatedAt < opTimestamp) {
              await db.settings.put({
                key: op.data.key,
                value: op.data.value,
                updatedAt: opTimestamp
              });
            }
          }

          // Mark operation as applied
          await db.appliedOps.put({ op_id: op.op_id });
        }

        // Update sync state
        await db.sync.put({
          id: "default",
          cursor: newCursor,
          lastPushAt: syncState?.lastPushAt || null,
          lastPullAt: Date.now()
        });
      }
    );

  } catch (error) {
    console.error("Pull error:", error);
    throw error;
  }
}

// Sync now (push then pull)
export async function syncNow(): Promise<void> {
  try {
    await pushOps();
  } catch (error) {
    console.error("Push failed during sync:", error);
    // Continue to pull even if push fails
  }

  try {
    await pullOps();
  } catch (error) {
    console.error("Pull failed during sync:", error);
    throw error;
  }
}

// Check if user is authenticated
export async function isAuthenticated(): Promise<boolean> {
  const auth = await db.auth.get("current");
  return !!(auth && auth.token);
}

// Get current user ID
export async function getCurrentUserId(): Promise<string | null> {
  const auth = await db.auth.get("current");
  return auth?.userId || null;
}

// Get current useremail
export async function getCurrentUserEmail(): Promise<string | null> {
  const auth = await db.auth.get("current");
  return auth?.email || null;
}

// Login
export async function login(email: string, password: string): Promise<void> {
  // Pre-cleanup: ensure clean slate before login
  await clearLocalData();

  // Reinitialize db after delete (Dexie recreates automatically on next access)
  await db.open();

  const response = await fetch(`${API_BASE}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Login failed: ${error}`);
  }

  const result = await response.json();

  // Store auth token
  await db.auth.put({
    id: "current",
    token: result.token,
    userId: result.user_id,
    email: email,
    createdAt: Date.now()
  });

  // Initial sync after login
  await syncNow();
}

// Register
export async function register(email: string, password: string): Promise<void> {
  // Pre-cleanup: ensure clean slate before registration
  await clearLocalData();

  // Reinitialize db after delete (Dexie recreates automatically on next access)
  await db.open();

  const response = await fetch(`${API_BASE}/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Registration failed: ${error}`);
  }

  const result = await response.json();

  // Store auth token
  await db.auth.put({
    id: "current",
    token: result.token,
    userId: result.user_id,
    email: email,
    createdAt: Date.now()
  });

  // Initial sync after registration
  await syncNow();
}

// Get count of pending operations in outbox
export async function getOutboxCount(): Promise<number> {
  return await db.outbox.count();
}

// Notify server of logout (best-effort, doesn't throw)
async function notifyServerLogout(): Promise<void> {
  try {
    const headers = await getAuthHeaders();
    await fetch(`${API_BASE}/logout`, {
      method: "POST",
      headers
    });
  } catch (error) {
    // Ignore errors - logout locally anyway
    console.error("Logout server notification failed:", error);
  }
}

// Logout - notifies server and clears all local data
export async function logout(): Promise<void> {
  await notifyServerLogout();
  await clearLocalData();
  await clearServiceWorkerCaches();
}

// Get sync status
export async function getSyncStatus() {
  const syncState = await db.sync.get("default");
  const outboxCount = await db.outbox.count();
  
  return {
    cursor: syncState?.cursor || 0,
    lastPushAt: syncState?.lastPushAt || null,
    lastPullAt: syncState?.lastPullAt || null,
    pendingOps: outboxCount
  };
}
