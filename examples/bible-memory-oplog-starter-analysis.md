# Bible Memory OpLog Starter - Technical Analysis

## Overview
A local-first synchronization architecture using an operation log (oplog) pattern. Designed for offline-capable Progressive Web Apps with conflict-free multi-device sync. The system uses IndexedDB on the client and a simple PHP REST API on the server.

## Architecture

### Technology Stack

**Client-Side**:
- **Database**: Dexie.js (IndexedDB wrapper)
- **Language**: TypeScript
- **Storage**: IndexedDB (browser-native, unlimited storage)
- **Sync**: Cursor-based pull, batch push

**Server-Side**:
- **Language**: PHP 7.4+
- **Database**: SQLite (default) or MySQL
- **Server**: Apache/Nginx (LEMP/LAMP)
- **Auth**: Simple token-based authentication

### Design Philosophy
- **Local-first**: Client is source of truth
- **Offline-capable**: Full functionality without network
- **Conflict-free**: Append-only events + LWW for mutable data
- **Idempotent**: Operations can be applied multiple times safely
- **Cursor-based**: Efficient incremental sync
- **Minimal**: Small, focused codebase

## Data Model

### Client Schema (Dexie/IndexedDB)

```typescript
// Core data tables
reviews: {
  id: string,           // UUID
  verseId: string,      // e.g., "JHN.3.16"
  reviewType: string,   // "recall", "read", "type", etc.
  createdAt: number     // ms epoch
}

verses: {
  id: string,           // e.g., "JHN.3.16"
  translation?: string, // "NIV", "ESV", etc.
  text?: string,        // verse content
  favorite?: boolean,
  tags?: string[],
  updatedAt?: number    // ms epoch
}

settings: {
  key: string,          // setting identifier
  value: any,           // setting value (JSON)
  updatedAt: number     // ms epoch
}

// Sync infrastructure tables
outbox: {
  op_id: string,        // UUID
  ts_client: number,    // client timestamp
  entity: string,       // "review", "verse_meta", "setting"
  action: string,       // "add", "set", "patch"
  data: any             // operation payload
}

appliedOps: {
  op_id: string         // UUID (for deduplication)
}

sync: {
  id: "default",
  cursor: number,       // last pulled sequence number
  lastPushAt?: number,
  lastPullAt?: number
}
```

### Server Schema (SQLite/MySQL)

```sql
-- Users table
users (
  user_id TEXT PRIMARY KEY,     -- e.g., "user-87ab3c4d"
  api_token TEXT UNIQUE,        -- authentication token
  created_at INTEGER            -- unix timestamp
)

-- Operations log (source of truth)
ops (
  seq INTEGER PRIMARY KEY AUTOINCREMENT,  -- monotonic sequence
  user_id TEXT,                           -- foreign key
  op_id TEXT UNIQUE,                      -- client-generated UUID
  ts_client INTEGER,                      -- client timestamp
  ts_server INTEGER DEFAULT (strftime('%s','now')),  -- server timestamp
  entity TEXT,                            -- "review", "verse_meta", "setting"
  action TEXT,                            -- "add", "set", "patch"
  data_json TEXT,                         -- JSON payload
  FOREIGN KEY (user_id) REFERENCES users(user_id)
)
```

## Sync Protocol

### Operation Envelope
```json
{
  "op_id": "uuid-v4",
  "ts_client": 1730490000000,
  "entity": "review" | "verse_meta" | "setting",
  "action": "add" | "set" | "patch",
  "data": { /* entity-specific payload */ }
}
```

### Push Flow (Client → Server)
1. Client queues operations in `outbox` table
2. When online, client POSTs batch to `/api/push.php`
3. Server validates auth token
4. Server inserts ops with `INSERT OR IGNORE` (idempotent)
5. Server assigns `ts_server` and `seq` (monotonic)
6. Server returns `cursor` (max seq for user)
7. Client removes pushed ops from `outbox`
8. Client updates local `cursor`

**Push Request**:
```json
POST /api/push.php
Headers: {
  "Content-Type": "application/json",
  "X-Auth-Token": "user-token"
}
Body: {
  "client_id": "device-uuid",
  "ops": [
    {
      "op_id": "c1f8d8b2-...",
      "ts_client": 1730490000000,
      "entity": "review",
      "action": "add",
      "data": { "verseId": "JHN.3.16", "reviewType": "recall" }
    }
  ]
}
```

**Push Response**:
```json
{
  "ok": true,
  "acked_ids": ["c1f8d8b2-...", ...],
  "cursor": 42
}
```

### Pull Flow (Server → Client)
1. Client requests ops since last `cursor`
2. Server queries ops WHERE `seq > cursor` AND `user_id = current_user`
3. Server returns ops with new `cursor`
4. Client applies ops to local database
5. Client deduplicates using `appliedOps` table
6. Client updates local `cursor`

**Pull Request**:
```
GET /api/pull.php?since=0&limit=500
Headers: {
  "X-Auth-Token": "user-token"
}
```

**Pull Response**:
```json
{
  "cursor": 42,
  "ops": [
    {
      "seq": 38,
      "op_id": "c1f8d8b2-...",
      "ts_client": 1730490000000,
      "ts_server": 1730490005,
      "entity": "review",
      "action": "add",
      "data": { "verseId": "JHN.3.16", "reviewType": "recall" }
    }
  ]
}
```

## Conflict Resolution

### Append-Only Entities (Reviews)
- **Strategy**: Accept all operations
- **Deduplication**: By `op_id` (UUID)
- **Ordering**: By `ts_server` (server timestamp)
- **Conflicts**: None - all reviews are valid events

### Mutable Entities (Verses, Settings)
- **Strategy**: Last-Write-Wins (LWW)
- **Timestamp**: Uses `ts_server` for consistency
- **Application**: Only apply if newer than local version
- **Conflicts**: Resolved automatically by timestamp

```typescript
// LWW logic in sync.ts
const v = await db.verses.get(op.data.id);
if (!v || (v.updatedAt ?? 0) < (op.ts_server ?? op.ts_client)) {
  await db.verses.put({ 
    ...op.data, 
    updatedAt: op.ts_server ?? op.ts_client 
  });
}
```

## Key Features

### 1. Offline-First Operation
- All operations work without network
- Automatic queueing in `outbox`
- Sync when connection available
- No data loss during offline periods

### 2. Multi-Device Sync
- Same user can use multiple devices
- Changes propagate via server
- Cursor-based incremental sync
- Efficient bandwidth usage

### 3. Idempotent Operations
- Operations can be applied multiple times
- `appliedOps` table tracks processed ops
- `INSERT OR IGNORE` on server prevents duplicates
- Safe to retry failed syncs

### 4. Cursor-Based Pagination
- Client tracks last synced sequence number
- Only fetches new operations
- Configurable batch size (default 500)
- Efficient for large datasets

### 5. Simple Authentication
- Token-based auth (X-Auth-Token header)
- One token per user
- Stored in localStorage
- Easy to replace with OAuth/JWT later

### 6. State Reporting
- `/api/state.php` provides derived views
- JSON or HTML format
- Useful for admin/debugging
- Can filter by sequence number

## Implementation Files

### Client Files

**db.ts** (120 lines):
- Dexie schema definition
- TypeScript interfaces
- IndexedDB table configuration
- Type safety for all entities

**sync.ts** (60 lines):
- `pushOps()`: Send queued operations
- `pullOps()`: Fetch and apply new operations
- `syncNow()`: Combined push-then-pull
- Auth header management

**actions.ts** (30 lines):
- `recordReview()`: Create review + queue op
- High-level business logic
- Wraps low-level sync operations

**boot.ts** (40 lines):
- Sync on app open
- Periodic sync (every 60s)
- Sync on `online` event
- Sync on tab visibility change

### Server Files

**lib.php** (80 lines):
- Database connection helper
- JSON response helper
- Token authentication
- User ID extraction

**migrate.php** (50 lines):
- Creates database tables
- Generates first user + token
- One-time setup script
- Prints credentials

**push.php** (30 lines):
- Accepts batch of operations
- Validates auth token
- Inserts with idempotency
- Returns acknowledgment + cursor

**pull.php** (25 lines):
- Queries operations since cursor
- Filters by user_id
- Returns ops + new cursor
- Supports limit parameter

**state.php** (60 lines):
- Derives current state from ops
- HTML or JSON output
- Useful for reporting/debugging
- Optional sequence filtering

**schema.mysql.sql** (40 lines):
- MySQL-compatible schema
- Alternative to SQLite
- Nearly identical structure
- Minor SQL dialect differences

## Strengths

1. **True offline-first** - works without network
2. **Conflict-free** - append-only + LWW
3. **Efficient sync** - cursor-based incremental
4. **Simple architecture** - easy to understand
5. **Minimal dependencies** - Dexie + vanilla PHP
6. **Idempotent** - safe to retry operations
7. **Scalable** - cursor pagination handles growth
8. **Flexible** - easy to add new entities
9. **Debuggable** - state.php for inspection
10. **Database agnostic** - SQLite or MySQL

## Limitations

1. **No real-time sync** - polling-based (60s default)
2. **Simple auth** - token-based only
3. **No operation validation** - trusts client data
4. **No operation history** - can't undo/replay
5. **No compression** - JSON payloads uncompressed
6. **No encryption** - relies on HTTPS
7. **No rate limiting** - vulnerable to abuse
8. **No user management** - single user per token
9. **No backup/restore** - manual database backup
10. **No monitoring** - basic logging only

## Security Considerations

### Current Implementation
- Token-based authentication
- Requires HTTPS in production
- SQL injection protected (prepared statements)
- No rate limiting
- No input validation

### Recommended Enhancements
1. **Add rate limiting** - prevent abuse
2. **Validate operations** - schema validation
3. **Add logging** - audit trail
4. **Implement CORS** - restrict origins
5. **Add user management** - registration/login
6. **Encrypt sensitive data** - at rest and in transit
7. **Add token expiration** - refresh tokens
8. **Implement CSRF protection** - for web forms
9. **Add IP whitelisting** - optional restriction
10. **Monitor for anomalies** - unusual patterns

### Recommended Enhancements


## Performance Characteristics

### Client Performance
- **IndexedDB**: Fast, unlimited storage
- **Dexie**: Minimal overhead (~15KB)
- **Batch operations**: Efficient bulk inserts
- **Cursor tracking**: O(1) lookup

### Server Performance
- **SQLite**: Fast for small/medium datasets
- **Prepared statements**: Efficient queries
- **Indexed queries**: seq and user_id indexed
- **Batch inserts**: Single transaction

### Network Efficiency
- **Cursor-based**: Only fetch new data
- **Batch operations**: Reduce round trips
- **JSON format**: Compact, parseable
- **Configurable limits**: Control payload size

## Scaling Considerations

### Small Scale (< 1000 users)
- SQLite is perfect
- Single server sufficient
- Minimal maintenance

### Medium Scale (1000-10000 users)
- Switch to MySQL/PostgreSQL
- Add connection pooling
- Consider read replicas
- Add caching layer

### Large Scale (10000+ users)
- Shard by user_id
- Add WebSocket support
- Implement CDN for static assets
- Add monitoring/alerting
- Consider managed database

## Extension Points

### Adding New Entities
1. Add table to `db.ts` schema
2. Add entity type to operation envelope
3. Add handling in `sync.ts` pullOps
4. Add action function in `actions.ts`
5. Update server validation (optional)

### Adding Real-Time Sync
1. Add WebSocket server
2. Broadcast ops to connected clients
3. Client listens for incoming ops
4. Apply ops immediately
5. Keep cursor-based as fallback

### Adding Operation Validation
1. Define JSON schemas for entities
2. Validate in `push.php`
3. Return validation errors
4. Client handles errors gracefully

### Adding User Management
1. Add registration endpoint
2. Add login endpoint
3. Generate tokens on login
4. Add password hashing
5. Add token refresh logic

## Migration Considerations

### important

- **Adopt the oplog pattern** - proven architecture
- **Use Dexie for IndexedDB** - excellent TypeScript support
- **Keep cursor-based sync** - efficient and scalable
- **Enhance auth** - add proper user management
- **Document API** - for future developers

### future
- **Add validation** - protect against bad data
- **Consider WebSockets** - for real-time updates
- **Add monitoring** - track sync health
- **Implement backups** - protect user data
- **Add rate limiting** - prevent abuse

## Testing Strategy

### Client Testing (future)
- Unit tests for sync logic
- Integration tests for Dexie operations
- Mock server responses
- Test offline scenarios
- Test conflict resolution

### Server Testing (future)
- Unit tests for endpoints
- Test idempotency
- Test cursor logic
- Test authentication
- Load testing for scale

### End-to-End Testing (future)
- Multi-device sync scenarios
- Offline/online transitions
- Conflict resolution
- Data integrity checks
- Performance benchmarks

## Deployment

### Development
```bash
# Client
npm install dexie uuid
# Include client/*.ts in your build

# Server
# Copy api/ to web server
# Visit /api/migrate.php to initialize
# Save generated token
```

### Production
```bash
# Server requirements
- PHP 8+
- SQLite3 or MySQL
- HTTPS enabled
- Write permissions for SQLite file

# Client requirements
- Modern browser with IndexedDB
- HTTPS (for service workers)
- localStorage support
```

### Monitoring
- Log sync errors
- Track cursor progression
- Monitor operation counts
- Alert on sync failures
- Track API response times

## Documentation Quality
- **README**: Excellent - clear quick start
- **Code comments**: Minimal but clear
- **Type definitions**: Complete TypeScript types
- **API examples**: Provided in README
- **Schema**: Well-documented SQL

## Code Quality
- **Readability**: Excellent - clear and concise
- **Organization**: Good - logical file structure
- **Type safety**: Full TypeScript support
- **Error handling**: Basic - could be enhanced
- **Maintainability**: High - simple codebase

## PHP Implementation: Raw PHP vs Framework

### Current Approach (Raw PHP + PDO)

**Strengths**:
- **Minimal overhead**: No framework bootstrapping
- **Fast execution**: Direct database access
- **Easy deployment**: Just copy files to server
- **Low learning curve**: Standard PHP patterns
- **Small footprint**: ~250 lines total
- **No dependencies**: Works with vanilla PHP
- **Clear control flow**: Easy to trace execution

**Weaknesses**:
- **Manual routing**: Each endpoint is a separate file
- **Repetitive code**: Auth/DB connection in each file
- **No middleware**: Auth logic duplicated
- **Limited structure**: No enforced patterns
- **Manual validation**: No built-in request validation
- **Basic error handling**: No centralized error management
- **No dependency injection**: Direct instantiation

### Framework Options for Migration

#### Option 1: Slim Framework (Recommended)
**Best for**: Lightweight APIs, minimal overhead

**Pros**:
- Micro-framework (~500KB)
- PSR-7 HTTP messages
- Middleware support
- Routing with parameters
- Dependency injection container
- Easy to learn
- Minimal performance impact
- Perfect for REST APIs

**Example**:
```php
$app->post('/api/push', function (Request $req, Response $res) {
    $user = $req->getAttribute('user'); // from auth middleware
    $body = $req->getParsedBody();
    // ... push logic
    return $res->withJson(['ok' => true]);
})->add(new AuthMiddleware());
```

**Migration effort**: Low (1-2 days)

#### Option 2: Lumen (Laravel's micro-framework)
**Best for**: Teams familiar with Laravel, future Laravel migration

**Pros**:
- Laravel syntax and patterns
- Eloquent ORM available
- Built-in validation
- Queue support
- Good documentation
- Easy upgrade path to full Laravel

**Cons**:
- Heavier than Slim (~2MB)
- More opinionated structure
- Overkill for simple API

**Migration effort**: Medium (2-3 days)

#### Option 3: Keep Raw PHP (with improvements)
**Best for**: Maximum simplicity, minimal dependencies

**Improvements to make**:
1. **Create shared bootstrap file**:
```php
// api/bootstrap.php
require_once __DIR__.'/lib.php';
$user_id = current_user_id();
$pdo = db();
```

2. **Add simple router**:
```php
// api/index.php
$route = $_SERVER['REQUEST_URI'];
$method = $_SERVER['REQUEST_METHOD'];

match([$method, $route]) {
    ['POST', '/api/push'] => require 'push.php',
    ['GET', '/api/pull'] => require 'pull.php',
    ['GET', '/api/state'] => require 'state.php',
    default => http_response_code(404)
};
```

3. **Extract auth middleware**:
```php
// api/middleware/auth.php
function requireAuth() {
    $token = $_SERVER['HTTP_X_AUTH_TOKEN'] ?? null;
    if (!$token) {
        http_response_code(401);
        exit(json_encode(['error' => 'Missing token']));
    }
    return getUserIdFromToken($token);
}
```

**Migration effort**: Minimal (few hours)

### Recommendation for Bible Memory App

**For initial migration: Keep Raw PHP with improvements**

**Reasoning**:
1. **Current code works well** - don't fix what isn't broken
2. **Simple API** - only 3 endpoints (push, pull, state)
3. **Performance critical** - sync needs to be fast
4. **Easy deployment** - no composer dependencies
5. **Team familiarity** - easier for contributors

**Improvements to implement**:
- Shared bootstrap file (reduce duplication)
- Centralized error handling
- Request validation helper functions
- Response helper functions (already have json_out)
- Simple middleware pattern for auth

**When to consider a framework**:
- Adding 5+ more endpoints
- Need complex routing (e.g., `/api/verses/{id}`)
- Want built-in validation
- Team prefers framework patterns
- Need middleware chains
- Want dependency injection

**If choosing a framework later: Use Slim**
- Minimal learning curve
- Doesn't change architecture significantly
- Easy to migrate from raw PHP
- Perfect for REST APIs
- Good performance
- Active maintenance

### Migration Path

**Phase 1: Improve raw PHP** (Week 1)
- Extract common code to bootstrap
- Add validation helpers
- Centralize error handling
- Document API patterns

**Phase 2: Evaluate needs** (Month 2-3)
- Monitor API complexity growth
- Assess team preferences
- Consider maintenance burden

**Phase 3: Framework migration if needed** (Month 4+)
- Choose Slim if adding complexity
- Migrate endpoint by endpoint
- Keep same database/sync logic
- Add tests during migration

### Conclusion

**Start with improved raw PHP**, then migrate to Slim Framework only if:
- API grows beyond 5-10 endpoints
- Team wants framework benefits
- Need advanced routing/middleware
- Maintenance becomes difficult

The current raw PHP approach is **perfectly valid** for a simple sync API. The oplog pattern is the important part - the HTTP layer is just a thin wrapper.
