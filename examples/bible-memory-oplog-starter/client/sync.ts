import { db } from "./db";

const API = "/api"; // change if your API lives elsewhere

async function authHeaders() {
  const token = localStorage.getItem("token");
  if (!token) throw new Error("missing token in localStorage");
  return { "Content-Type": "application/json", "X-Auth-Token": token };
}

export async function pushOps() {
  const ops = await db.outbox.orderBy("ts_client").limit(500).toArray();
  if (ops.length === 0) return;

  const res = await fetch(`${API}/push.php`, {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify({ client_id: "device-uuid", ops })
  });
  if (!res.ok) throw new Error("push failed");
  const body = await res.json();

  await db.outbox.bulkDelete(ops.map(o => o.op_id));
  await db.sync.put({ id: "default", cursor: body.cursor, lastPushAt: Date.now() });
}

export async function pullOps() {
  const state = (await db.sync.get("default")) || { id: "default", cursor: 0 };
  const url = `${API}/pull.php?since=${state.cursor}&limit=500`;
  const res = await fetch(url, { headers: await authHeaders() });
  if (!res.ok) throw new Error("pull failed");
  const { cursor, ops } = await res.json();

  await db.transaction('rw', db.appliedOps, db.reviews, db.verses, db.settings, async () => {
    for (const op of ops) {
      const already = await db.appliedOps.get(op.op_id);
      if (already) continue;

      if (op.entity === "review" && op.action === "add") {
        await db.reviews.put({
          id: op.op_id,
          verseId: op.data.verseId,
          reviewType: op.data.reviewType,
          createdAt: op.ts_server ?? op.ts_client
        });
      } else if (op.entity === "verse_meta") {
        const v = await db.verses.get(op.data.id);
        if (!v || (v.updatedAt ?? 0) < (op.ts_server ?? op.ts_client)) {
          await db.verses.put({ ...op.data, updatedAt: op.ts_server ?? op.ts_client });
        }
      } else if (op.entity === "setting") {
        const s = await db.settings.get(op.data.key);
        if (!s || s.updatedAt < (op.ts_server ?? op.ts_client)) {
          await db.settings.put({ key: op.data.key, value: op.data.value, updatedAt: op.ts_server ?? op.ts_client });
        }
      }

      await db.appliedOps.put({ op_id: op.op_id });
    }
    await db.sync.put({ id: "default", cursor, lastPullAt: Date.now() });
  });
}

export async function syncNow() {
  try { await pushOps(); } catch {}
  try { await pullOps(); } catch {}
}
