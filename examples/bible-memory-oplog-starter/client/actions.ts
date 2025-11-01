import { db } from "./db";
import { v4 as uuid } from "uuid";

export async function recordReview(verseId: string, reviewType: string) {
  const now = Date.now();
  const id = uuid();

  await db.transaction('rw', db.reviews, db.outbox, async () => {
    await db.reviews.add({ id, verseId, reviewType, createdAt: now });
    await db.outbox.add({
      op_id: id,
      ts_client: now,
      entity: "review",
      action: "add",
      data: { verseId, reviewType }
    });
  });
}

export async function setFavorite(verseId: string, favorite: boolean) {
  const now = Date.now();
  await db.transaction('rw', db.verses, db.outbox, async () => {
    const prev = (await db.verses.get(verseId)) || { id: verseId };
    await db.verses.put({ ...prev, favorite, updatedAt: now });
    await db.outbox.add({
      op_id: uuid(),
      ts_client: now,
      entity: "verse_meta",
      action: "set",
      data: { id: verseId, favorite }
    });
  });
}

export async function setSetting(key: string, value: any) {
  const now = Date.now();
  await db.settings.put({ key, value, updatedAt: now });
  await db.outbox.add({
    op_id: crypto.randomUUID(),
    ts_client: now,
    entity: "setting",
    action: "set",
    data: { key, value }
  });
}
