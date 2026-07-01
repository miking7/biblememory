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

// Merge a partial update into the singleton sync record without dropping the
// other fields, so a caller can't accidentally clobber a field it didn't mean
// to touch (the class of bug this consolidates — push used to wipe the cursor).
async function updateSyncState(patch: {
  cursor?: number;
  lastPushAt?: number | null;
  lastPullAt?: number | null;
}): Promise<void> {
  const current = await db.sync.get("default");
  await db.sync.put({
    id: "default",
    cursor: patch.cursor ?? current?.cursor ?? 0,
    lastPushAt: patch.lastPushAt !== undefined ? patch.lastPushAt : (current?.lastPushAt ?? null),
    lastPullAt: patch.lastPullAt !== undefined ? patch.lastPullAt : (current?.lastPullAt ?? null)
  });
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

    // Record the push time only — the pull cursor is owned by pullOps and must
    // not be clobbered here (doing so used to make the next pull skip ops).
    await updateSyncState({ lastPushAt: Date.now() });

  } catch (error) {
    console.error("Push error:", error);
    throw error;
  }
}

// Pull operations from the server.
//
// The op log can be far larger than one page, so we page through the whole
// backlog: each request returns up to PULL_PAGE_SIZE ops with seq > cursor, and
// we resume from the server's next_cursor until it reports has_more = false.
//
// This previously pulled a single page but advanced the cursor to the server's
// global MAX(seq), so everything between the first page and the newest op was
// silently skipped on a fresh sync.
const PULL_PAGE_SIZE = 2000; // server caps at 2000; bigger pages = fewer round-trips

export async function pullOps(): Promise<void> {
  try {
    const headers = await getAuthHeaders();

    while (true) {
      const syncState = await db.sync.get("default");
      const cursor = syncState?.cursor || 0;

      const response = await fetch(
        `${API_BASE}/pull?since=${cursor}&limit=${PULL_PAGE_SIZE}`,
        { headers }
      );

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Pull failed: ${response.status} ${error}`);
      }

      const result = await response.json();
      const ops = (result.ops || []) as any[];

      if (ops.length === 0) {
        // Up to date — just stamp the pull time.
        await updateSyncState({ lastPullAt: Date.now() });
        break;
      }

      // Resume point for the next page: prefer the server's explicit
      // next_cursor, falling back to the last op's seq for older responses.
      const nextCursor = typeof result.next_cursor === "number"
        ? result.next_cursor
        : ops[ops.length - 1].seq;
      if (typeof nextCursor !== "number" || nextCursor <= cursor) {
        // Shouldn't happen (returned ops have seq > since); bail rather than
        // risk an infinite loop.
        console.error("Pull: page did not advance the cursor, stopping.", { cursor });
        break;
      }

      // Apply this page in a transaction, then advance the cursor.
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

          // Advance the sync cursor to the resume point for the next page.
          await updateSyncState({ cursor: nextCursor, lastPullAt: Date.now() });
        }
      );

      // Stop when the server reports no more ops (fall back to the page-size
      // heuristic for older responses that omit has_more).
      const hasMore = typeof result.has_more === "boolean"
        ? result.has_more
        : ops.length >= PULL_PAGE_SIZE;
      if (!hasMore) break;
    }
  } catch (error) {
    console.error("Pull error:", error);
    throw error;
  }
}

// Guards against overlapping syncs — a long paginated pull can still be running
// when the next periodic tick or a fresh outbox push fires.
let syncInFlight = false;

// Sync now (push then pull)
export async function syncNow(): Promise<void> {
  if (syncInFlight) return; // a sync is already running; don't run two at once
  syncInFlight = true;
  try {
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
  } finally {
    syncInFlight = false;
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
