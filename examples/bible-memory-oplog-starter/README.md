# Bible Memory Offline PWA — Dexie + REST Op‑Log (LEMP)

A tiny, **local‑first** sync backend you can drop behind a PWA. The browser stores everything in IndexedDB; when online it **pushes** local operations (ops) and **pulls** new ones. Reviews are append‑only events (conflict‑free), and small mutable bits use **last‑write‑wins**.

## What’s inside

```
bible-memory-oplog-starter/
├─ api/
│  ├─ lib.php            # DB + JSON helpers and token auth
│  ├─ migrate.php        # Creates SQLite tables + first user (prints token)
│  ├─ push.php           # POST /api/push   (idempotent op ingest)
│  ├─ pull.php           # GET  /api/pull   (cursor-based op fetch)
│  ├─ state.php          # GET  /api/state  (HTML/JSON derived reporting)
│  └─ schema.mysql.sql   # Optional MySQL schema
└─ client/
   ├─ db.ts              # Dexie schema (IndexedDB)
   ├─ sync.ts            # push/pull logic
   ├─ actions.ts         # enqueue review + local write
   └─ boot.ts            # simple sync triggers
```

---

## Quick start (SQLite)

1) **Deploy** the `api/` directory on PHP (Apache/Nginx). Ensure the web user can write to `api/db.sqlite`.

2) **Initialize tables + first user** by opening in your browser (or curl):
```
https://yourhost/api/migrate.php
```
You’ll see something like:
```
Created initial user:
user_id: user-87ab3c4d
api_token: 8a9b2c1d2e3f4a5b6c7d8e9f0a1b2c3d
```

3) **Call the endpoints** with the token via `X-Auth-Token` header.

**Push example**
```bash
curl -X POST https://yourhost/api/push.php \
  -H 'Content-Type: application/json' \
  -H 'X-Auth-Token: YOUR_TOKEN' \
  -d '{
    "client_id": "device-uuid",
    "ops": [{
      "op_id": "c1f8d8b2-1f45-44f1-9d87-1a2b3c4d5e6f",
      "ts_client": 1730490000000,
      "entity": "review",
      "action": "add",
      "data": { "verseId": "JHN.3.16", "reviewType": "recall" }
    }]
  }'
```

**Pull example**
```bash
curl 'https://yourhost/api/pull.php?since=0&limit=500' \
  -H 'X-Auth-Token: YOUR_TOKEN'
```

**State page (derived, human-friendly)**
- JSON: `GET /api/state.php?format=json`
- HTML:  `GET /api/state.php?format=html`

> `since` (optional) limits by server sequence number: `/api/state.php?format=json&since=200`

---

## Client integration (PWA)

Install deps:
```bash
npm i dexie uuid
```

Use the files in `client/` as a starting point:
- `db.ts` — stores `reviews`, `verses`, `settings`, a local `outbox`, and `appliedOps` for idempotent pulls
- `actions.ts` — **recordReview(verseId, reviewType)** appends a Review and queues an op
- `sync.ts` — **pushOps**, **pullOps**, **syncNow** (push first, then pull)
- `boot.ts` — simple strategy: sync on open, every 60s while online, on `online` event, and on tab visibility

You’ll set the token once on login (or statically while prototyping):
```ts
localStorage.setItem("token", "YOUR_TOKEN_HERE");
```

---

## Data model

- **Op (operation)** envelope:
  ```json
  {
    "op_id": "uuid",
    "ts_client": 1730490000000,
    "entity": "review" | "verse_meta" | "setting",
    "action": "add" | "set" | "patch",
    "data": { ... }
  }
  ```

- **Conflict policy**
  - **Reviews**: append‑only; accept all; de‑dupe by `op_id`.
  - **Mutable data** (`verse_meta`, `setting`): **LWW** with `ts_server` (from the server when ingested).

- **Cursor‑based pulls**
  - Server assigns a monotonic `seq` per user.
  - Client calls `GET /api/pull.php?since=<cursor>` to retrieve new ops and updates local state.

---

## Security & deployment notes

- **Auth**: This starter uses a single **API token** per user in table `users`. Replace with your preferred auth later.
- **Transport**: Serve over **HTTPS** so tokens aren’t leaked.
- **DB**: SQLite is perfect for small/medium apps. You can switch to MySQL using `api/schema.mysql.sql` with nearly no code changes (only SQL dialect in `push.php` needs `INSERT IGNORE` vs `INSERT OR IGNORE`). 
- **Backups**: The `ops` table is the source of truth. Back up `db.sqlite` (or MySQL dump) regularly.
- **Observability**: Add basic logging around `push.php`/`pull.php` if you need to audit unusual sync behavior.

---

## Extending

- Add more entities as needed (e.g., `plan`, `deck`). Keep them in the **op log** to remain conflict‑friendly.
- Create server‑side **materialized views** if admin queries get heavy (you can recompute from `ops` at any time).
- Add WebSockets later if you want near‑instant cross‑device updates (protocol stays the same).

---

## License

MIT — do what you like, no warranty.
