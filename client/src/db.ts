import Dexie, { Table } from "dexie";

// Core data interfaces
export interface Verse {
  id: string;              // UUID v4 - unique across all users
  reference: string;       // Human-readable: "John 3:16" or "Hebrews 10:24-25"
  refSort: string;         // Sortable format: "bible.43003016" (book.chapter.verse)
  content: string;         // Verse text with \n for line breaks
  translation: string;     // "KJV", "NIV", "ESV", etc.
  reviewCat: string;       // "auto", "future", "learn", "daily", "weekly", "monthly"
  startedAt: number | null; // Epoch ms - when memorization began (null = not started)
  tags: Array<{            // Structured tags
    key: string;           // e.g., "fast.sk", "ss", "personal"
    value: string;         // e.g., "3", "2010.Q2.W01", "01"
  }>;
  favorite: boolean;       // Quick access flag
  createdAt: number;       // Epoch ms - when verse was added
  updatedAt: number;       // Epoch ms - for LWW conflict resolution
}

export interface Review {
  id: string;              // UUID v4
  verseId: string;         // Foreign key to verses.id
  reviewType: string;      // "recall", "hint", "firstletters", "flashcard"
  createdAt: number;       // Epoch ms - when review occurred
}

export interface Setting {
  key: string;             // Setting identifier
  value: any;              // Setting value (JSON-serializable)
  updatedAt: number;       // Epoch ms - for LWW conflict resolution
}

export interface Auth {
  id: string;              // "current" - single record
  token: string;           // 64-char hex string from server
  userId: string;          // UUID v4
  createdAt: number;       // Epoch ms - when token was issued
}

// Sync infrastructure interfaces
export interface OutboxOp {
  op_id: string;           // UUID v4
  ts_client: number;       // Epoch ms - client timestamp
  entity: string;          // "verse", "review", "setting"
  action: string;          // "add", "set", "patch", "delete"
  data: any;               // Operation payload
}

export interface AppliedOp {
  op_id: string;           // UUID v4 - for deduplication
}

export interface SyncState {
  id: string;              // "default"
  cursor: number;          // Last synced sequence number
  lastPushAt: number | null; // Epoch ms - last successful push
  lastPullAt: number | null; // Epoch ms - last successful pull
}

// Dexie database class
export class BibleMemoryDB extends Dexie {
  verses!: Table<Verse, string>;
  reviews!: Table<Review, string>;
  settings!: Table<Setting, string>;
  auth!: Table<Auth, string>;
  outbox!: Table<OutboxOp, string>;
  appliedOps!: Table<AppliedOp, string>;
  sync!: Table<SyncState, string>;

  constructor() {
    super("bible-memory");
    this.version(1).stores({
      verses: "id, refSort, reference, reviewCat, startedAt, favorite, createdAt, updatedAt",
      reviews: "id, verseId, createdAt",
      settings: "key, updatedAt",
      auth: "id",
      outbox: "op_id, ts_client, entity",
      appliedOps: "op_id",
      sync: "id"
    });
  }
}

export const db = new BibleMemoryDB();
