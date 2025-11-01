import Dexie, { Table } from "dexie";

export interface Review {
  id: string;             // uuid
  verseId: string;        // "JHN.3.16"
  reviewType: "recall" | "read" | "type" | string;
  createdAt: number;      // ms epoch
}

export interface Verse {
  id: string;             // "JHN.3.16"
  translation?: string;   // "NIV"
  text?: string;
  favorite?: boolean;
  tags?: string[];
  updatedAt?: number;
}

export interface Setting {
  key: string;
  value: any;
  updatedAt: number;
}

export interface OutboxOp {
  op_id: string;
  ts_client: number;
  entity: "review" | "verse_meta" | "setting";
  action: "add" | "set" | "patch";
  data: any;
}

export interface SyncState {
  id: "default";
  cursor: number;
  lastPushAt?: number;
  lastPullAt?: number;
}

export class AppDB extends Dexie {
  reviews!: Table<Review, string>;
  verses!: Table<Verse, string>;
  settings!: Table<Setting, string>;
  outbox!: Table<OutboxOp, string>;
  appliedOps!: Table<{ op_id: string }, string>;
  sync!: Table<SyncState, string>;

  constructor() {
    super("bible-memory");
    this.version(1).stores({
      reviews:  "id, verseId, createdAt",
      verses:   "id, updatedAt",
      settings: "key, updatedAt",
      outbox:   "op_id, ts_client",
      appliedOps: "op_id",
      sync:     "id"
    });
  }
}
export const db = new AppDB();
