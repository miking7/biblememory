# System Patterns

## Architecture Overview

### High-Level Architecture

```
┌─────────────────────────────────────────┐
│         Client (Browser)                │
│  ┌─────────────────────────────────┐   │
│  │   Alpine.js SPA (index.html)    │   │
│  │   - Tab navigation               │   │
│  │   - Reactive state management    │   │
│  │   - User interactions            │   │
│  └──────────┬──────────────────────┘   │
│             │                            │
│  ┌──────────▼──────────┐                │
│  │   main.ts/app.ts    │                │
│  │   - App logic       │                │
│  │   - Event handlers  │                │
│  └──────────┬──────────┘                │
│             │                            │
│  ┌──────────▼──────────┐                │
│  │   actions.ts        │                │
│  │   - CRUD operations │                │
│  │   - Business logic  │                │
│  │   - Queries         │                │
│  └──────────┬──────────┘                │
│             │                            │
│  ┌──────────▼──────────┐                │
│  │      db.ts          │                │
│  │   - Dexie schema    │                │
│  │   - IndexedDB       │                │
│  └──────────┬──────────┘                │
│             │                            │
│  ┌──────────▼──────────┐                │
│  │    sync.ts          │                │
│  │   - Push/pull       │                │
│  │   - Authentication  │                │
│  └──────────┬──────────┘                │
└─────────────┼────────────────────────────┘
              │ HTTP/JSON
              ▼
┌─────────────────────────────────────────┐
│         Server (PHP)                    │
│  ┌─────────────────────────────────┐   │
│  │   API Endpoints                  │   │
│  │   - register.php                 │   │
│  │   - login.php / logout.php       │   │
│  │   - push.php / pull.php          │   │
│  └──────────┬──────────────────────┘   │
│             │                            │
│  ┌──────────▼──────────┐                │
│  │      lib.php        │                │
│  │   - Shared functions│                │
│  │   - Auth helpers    │                │
│  │   - DB connection   │                │
│  └──────────┬──────────┘                │
│             │                            │
│  ┌──────────▼──────────┐                │
│  │   SQLite Database   │                │
│  │   - users           │                │
│  │   - tokens          │                │
│  │   - ops (oplog)     │                │
│  │   - views           │                │
│  └─────────────────────┘                │
└─────────────────────────────────────────┘
```

## Key Design Patterns

### 1. OpLog (Operation Log) Pattern

**Purpose:** Enable offline-first architecture with reliable sync

**How It Works:**
- All mutations create operation entries
- Operations stored locally in `outbox` table
- Operations pushed to server in batches
- Server stores operations in `ops` table with sequence numbers
- Clients pull operations using cursor-based pagination
- Current state derived from operation log

**Benefits:**
- Complete audit trail
- Conflict resolution via timestamps
- Idempotent operations
- Easy to debug sync issues
- Can reconstruct state at any point

**Implementation:**
```typescript
// Client creates operation
const op = {
  id: generateUUID(),
  ts: Date.now(),
  entity: 'verse',
  action: 'add',
  data: { ...verseData }
};

// Store in outbox
await db.outbox.add(op);

// Periodically push to server
await pushOps();

// Server stores with sequence
INSERT INTO ops (seq, user_id, op_id, ts_client, ts_server, entity, action, data_json)
VALUES (NULL, ?, ?, ?, ?, ?, ?, ?);

// Clients pull using cursor
SELECT * FROM ops WHERE user_id = ? AND seq > ? ORDER BY seq LIMIT 500;
```

### 2. Last-Write-Wins (LWW) Conflict Resolution

**Purpose:** Resolve conflicts when same entity edited on multiple devices

**How It Works:**
- Server assigns `ts_server` timestamp to all operations
- When applying operations, compare timestamps
- Operation with latest `ts_server` wins
- If timestamps identical, use `op_id` lexicographic comparison

**Benefits:**
- Simple and predictable
- No user intervention needed
- Works well for personal apps
- Server is source of truth (avoids clock skew)

**Implementation:**
```typescript
// When applying pulled operations
for (const op of pulledOps) {
  // Check if already applied
  const existing = await db.appliedOps.get(op.id);
  if (existing) continue;
  
  // Apply operation
  if (op.action === 'add' || op.action === 'set') {
    await db.verses.put(op.data);
  } else if (op.action === 'delete') {
    await db.verses.delete(op.data.id);
  }
  
  // Mark as applied
  await db.appliedOps.add({ op_id: op.id });
}
```

### 3. Cursor-Based Pagination

**Purpose:** Efficiently sync large operation logs

**How It Works:**
- Server assigns monotonic sequence numbers to operations
- Client tracks last synced sequence in `sync` table
- Pull requests include `since` parameter with cursor
- Server returns operations after cursor + new cursor value
- Client updates cursor after successful application

**Benefits:**
- Efficient for large datasets
- Resumable sync after interruption
- No duplicate operations
- Scales well

**Implementation:**
```typescript
// Client pull
const { cursor } = await db.sync.get('default');
const response = await fetch(`/api/pull.php?since=${cursor}&limit=500`);
const { ops, cursor: newCursor } = await response.json();

// Apply operations...

// Update cursor
await db.sync.put({ id: 'default', cursor: newCursor, lastPullAt: Date.now() });
```

### 4. Offline-First with Outbox Pattern

**Purpose:** Queue operations when offline, sync when online

**How It Works:**
- All mutations immediately write to local database
- Operations also written to `outbox` table
- Periodic sync attempts to push outbox to server
- Successful operations removed from outbox
- Failed operations remain for retry

**Benefits:**
- App fully functional offline
- No data loss
- Automatic sync when online
- User doesn't need to think about connectivity

**Implementation:**
```typescript
// Add verse (works offline)
async function addVerse(verse: Verse) {
  // Write to local database
  await db.verses.add(verse);
  
  // Queue operation for sync
  const op = {
    id: generateUUID(),
    ts: Date.now(),
    entity: 'verse',
    action: 'add',
    data: verse
  };
  await db.outbox.add(op);
  
  // Sync will happen automatically
}

// Periodic sync
setInterval(async () => {
  if (navigator.onLine) {
    await syncNow();
  }
}, 60000);
```

### 5. Reactive State Management (Alpine.js)

**Purpose:** Keep UI in sync with data changes

**How It Works:**
- Alpine.js provides reactive data binding
- State changes automatically update DOM
- Event handlers modify state
- Computed properties derive from state

**Benefits:**
- Simple mental model
- No virtual DOM overhead
- Minimal boilerplate
- Easy to debug

**Implementation:**
```html
<div x-data="app()">
  <!-- Reactive display -->
  <div x-text="verses.length"></div>
  
  <!-- Event binding -->
  <button @click="addVerse()">Add</button>
  
  <!-- Conditional rendering -->
  <div x-show="isOffline">Offline</div>
  
  <!-- List rendering -->
  <template x-for="verse in filteredVerses">
    <div x-text="verse.reference"></div>
  </template>
</div>
```

## Component Relationships

### Data Flow for Adding a Verse

```
1. User fills form in UI (Alpine.js)
   ↓
2. Form submit calls app.addVerse()
   ↓
3. app.addVerse() calls actions.addVerse()
   ↓
4. actions.addVerse() creates verse + operation
   ↓
5. Both written to IndexedDB in transaction
   ↓
6. UI updates reactively (Alpine.js)
   ↓
7. sync.ts periodically calls pushOps()
   ↓
8. Operations sent to server/api/push.php
   ↓
9. Server validates and stores in ops table
   ↓
10. Server returns acknowledgment + cursor
    ↓
11. Client removes acked ops from outbox
```

### Data Flow for Syncing Between Devices

```
Device A (offline):
1. User adds verse
2. Stored locally + queued in outbox

Device A (online):
3. pushOps() sends to server
4. Server stores with ts_server=1000, seq=100

Device B:
5. pullOps() requests since cursor=99
6. Server returns op with seq=100
7. Device B applies operation
8. Verse appears in Device B's UI
9. Device B updates cursor to 100
```

## Critical Implementation Paths

### Authentication Flow

```
1. User enters email/password
   ↓
2. POST to /api/login.php
   ↓
3. Server verifies credentials
   ↓
4. Server generates token (64-char hex)
   ↓
5. Server hashes token and stores in tokens table
   ↓
6. Server returns plain token + user_id
   ↓
7. Client stores in IndexedDB auth table
   ↓
8. Client includes token in all API requests
   ↓
9. Server validates token on each request
```

### Spaced Repetition Algorithm

```
1. User opens Review tab
   ↓
2. getVersesForReview() called
   ↓
3. For each verse:
   - Calculate days since startedAt
   - Determine category (learn/daily/weekly/monthly)
   - For weekly/monthly, apply probability
   - Check if due based on last review
   ↓
4. Return verses due for review
   ↓
5. User reviews and marks "Got it" or "Need Practice"
   ↓
6. recordReview() creates review entry
   ↓
7. Review stored locally + queued for sync
```

### Conflict Resolution Example

```
Scenario: Same verse edited on two devices offline

Device A:
- Edits verse at ts_client=1000
- Syncs: server assigns ts_server=2000

Device B:
- Edits same verse at ts_client=1001
- Syncs: server assigns ts_server=2001

Both devices pull:
- Device A receives op with ts_server=2001
- Device A applies (2001 > 2000, B wins)
- Device B receives op with ts_server=2000
- Device B ignores (2000 < 2001, already has newer)

Result: Device B's edit wins (LWW)
```

## Database Schema Patterns

### Client Schema (IndexedDB)

**Primary Tables:**
- `verses` - User's verse library
- `reviews` - Review history
- `settings` - User preferences

**Sync Infrastructure:**
- `auth` - Authentication token
- `outbox` - Pending operations
- `appliedOps` - Deduplication tracking
- `sync` - Cursor state

**Key Indexes:**
- `verses.refSort` - For biblical ordering
- `verses.createdAt` - For chronological queries
- `reviews.verseId` - For verse history
- `reviews.createdAt` - For recent reviews

### Server Schema (SQLite)

**Core Tables:**
- `users` - User accounts
- `tokens` - Authentication tokens (hashed)
- `ops` - Operation log (source of truth)

**Derived Views:**
- `verses_view` - Current verse state
- `reviews_view` - Review history
- `user_stats` - Aggregate statistics

**Key Indexes:**
- `ops(user_id, seq)` - For efficient pull queries
- `ops(op_id)` - For deduplication
- `tokens(user_id)` - For auth lookups

## Performance Optimizations

### Client-Side
- IndexedDB for unlimited storage
- Compound indexes for efficient queries
- Batch operations in transactions
- Lazy loading of large lists (future)

### Server-Side
- SQLite WAL mode for concurrency
- Prepared statements for security + performance
- Cursor-based pagination (500 ops/batch)
- JSON extraction in views for derived data

### Network
- Batch push operations (up to 500)
- Cursor-based pull (no duplicate data)
- Automatic retry with exponential backoff
- Sync only when online

## Security Patterns

### Authentication
- Tokens generated with `random_bytes(32)`
- Tokens hashed before database storage
- Plain token sent to client only once
- Token included in `X-Auth-Token` header
- Server validates on every request

### Data Protection
- SQL injection prevented via prepared statements
- XSS prevented via Alpine.js escaping
- CORS headers properly configured
- HTTPS required in production
- Password hashing with bcrypt

### Privacy
- User data isolated by user_id
- No cross-user data access
- Tokens revocable via logout
- Export capability for data portability
