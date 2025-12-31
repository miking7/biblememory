# Data Specifications

<!-- 
MAINTENANCE PRINCIPLES (from .clinerules):
- Document data model concepts, field purposes, and validation rules - NOT complete code definitions
- Focus on WHY fields exist and WHAT they represent
- NO code duplication - reference actual schema files instead of recreating interfaces/SQL
- Exception: Small examples OK to illustrate concepts
- Keep business logic, format specifications, and validation rules - they're stable
- This file should help understand the data model without duplicating the codebase
-->

## Data Model Overview

### Client Schema (IndexedDB via Dexie)

**Complete schema:** See `client/src/db.ts`

**Primary Tables:**
- `verses` - User's verse library with memorization tracking
- `reviews` - Review history (append-only)
- `settings` - User preferences

**Sync Infrastructure:**
- `auth` - Authentication token storage (single record)
- `outbox` - Pending operations awaiting sync
- `appliedOps` - Deduplication tracking (prevents reapplying operations)
- `sync` - Cursor state for pull operations

**Key Design Decisions:**
- UUIDs for all primary keys (enables offline creation without collisions)
- Epoch milliseconds for all timestamps (no timezone issues)
- Structured tags array (not comma-separated string)
- Multi-paragraph support with `\n` line breaks

### Server Schema (SQLite)

**Complete schema:** See `server/schema.sql`

**Core Tables:**
- `users` - User accounts (id, email, password_hash, created_at)
- `tokens` - Authentication tokens hashed (token_hash, user_id, created_at)
- `ops` - Operation log (source of truth, append-only)

**Derived Views:**
- `verses_view` - Current verse state (latest op per verse_id)
- `reviews_view` - Review history (all review ops)
- `user_stats` - Aggregate statistics

**Why Views:**
- Simplify queries (don't need to derive state from ops manually)
- Read-optimized (pre-computed joins)
- Ops table remains append-only (fast writes, simple to reason about)

## Key Fields Explained

### Verse Identity
- `id` (UUID v4) - Globally unique, safe for offline creation
- `reference` (string) - Human-readable: "John 3:16", "Hebrews 10:24-25"
- `refSort` (string) - Machine-sortable: "bible.BBCCCVVV" for biblical ordering

**Why both reference fields:**
- Users want readable references ("John 3:16")
- App needs sortable format for biblical order (Genesis → Revelation)
- Manual entry for both (Phase 1), auto-parsing deferred to Phase 2

### Memorization Tracking
- `reviewCat` (string) - Current category: "auto", "future", "learn", "daily", "weekly", "monthly"
- `startedAt` (number | null) - When memorization began (null = not started)

**Why startedAt:**
- Spaced repetition algorithm needs days since start
- Null allows verses to be added before memorization begins
- Local midnight timestamp (not UTC) to match user's day boundaries

### Content Storage
- `content` (string) - Verse text with `\n` for line breaks
- `translation` (string) - Version identifier: "KJV", "NIV", "ESV", etc.

**Multi-paragraph format:**
- Use `\n` for line breaks (not `<br>` or `\r\n`)
- Display with CSS `white-space: pre-wrap` (see `client/src/App.vue`)
- Preserve leading spaces for indentation
- Strip trailing whitespace

**Example:**
```
"5 Trust in the LORD with all thine heart; and lean not unto thine own understanding.\n6 In all thy ways acknowledge him, and he shall direct thy paths."
```

### Tags Structure
- `tags` (Array<{key, value}>) - Structured array, not comma-separated string

**Why structured:**
- Enables efficient filtering by key or value
- Preserves empty values (key without value)
- Supports complex queries (e.g., all "fast.sk" regardless of value)

**Input format (backward compatible):**
```
"fast.sk=3, ss=2010.Q2.W01, personal"
```

**Storage format:**
```typescript
[
  { key: "fast.sk", value: "3" },
  { key: "ss", value: "2010.Q2.W01" },
  { key: "personal", value: "" }
]
```

**Common tag patterns:**
- `fast.sk` = FAST Survival Kit reference (1-5)
- `ss` = Sabbath School quarter/week (e.g., "2010.Q2.W01")
- `personal` = Personal marker
- `theme` = Thematic grouping ("faith", "love", "hope")

**See:** `client/src/app.ts` for parsing logic

### Timestamps
- `createdAt` (number) - When record was created (epoch ms)
- `updatedAt` (number) - When record was last modified (epoch ms)

**Why epoch milliseconds:**
- Standard JavaScript format (`Date.now()`)
- No timezone issues (always UTC internally)
- Easy to compare and sort
- Simple math for date calculations

**Format:** `1704326400000` (epoch milliseconds since 1970-01-01)

### Review Records
- `verseId` (UUID) - Links to verses table
- `reviewType` (string) - Type of review: "recall", "hint", "firstletters", "flashcard"
- `createdAt` (number) - When review occurred

**Why append-only:**
- Complete history preserved (no deletes)
- Enables analytics and statistics
- Simpler sync (no update conflicts)

## Reference Format Specification

### Human Format (Display)
- **Single verse**: `"John 3:16"`
- **Verse range**: `"Hebrews 10:24-25"`
- **Chapter**: `"Psalm 23"` (entire chapter)

### Machine Format (refSort for Sorting)

**Format:** `bible.BBCCCVVV`
- **BB**: Book number (01-66, zero-padded)
- **CCC**: Chapter number (001-150, zero-padded)
- **VVV**: Verse number (001-176, zero-padded)

**Examples:**
- `"bible.43003016"` = John 3:16 (book 43, chapter 3, verse 16)
- `"bible.58010024"` = Hebrews 10:24 (book 58, chapter 10, verse 24)
- `"bible.19023001"` = Psalm 23:1 (book 19, chapter 23, verse 1)

**Why this format:**
- Lexicographic sorting = biblical ordering
- Fixed width enables string comparison
- Consistent across all verses
- Simple to generate and parse

### Book Number Mapping (66 Books)

**Old Testament (01-39):**
```
01=Genesis, 02=Exodus, 03=Leviticus, 04=Numbers, 05=Deuteronomy,
06=Joshua, 07=Judges, 08=Ruth, 09=1 Samuel, 10=2 Samuel,
11=1 Kings, 12=2 Kings, 13=1 Chronicles, 14=2 Chronicles, 15=Ezra,
16=Nehemiah, 17=Esther, 18=Job, 19=Psalms, 20=Proverbs,
21=Ecclesiastes, 22=Song of Solomon, 23=Isaiah, 24=Jeremiah, 25=Lamentations,
26=Ezekiel, 27=Daniel, 28=Hosea, 29=Joel, 30=Amos,
31=Obadiah, 32=Jonah, 33=Micah, 34=Nahum, 35=Habakkuk,
36=Zephaniah, 37=Haggai, 38=Zechariah, 39=Malachi
```

**New Testament (40-66):**
```
40=Matthew, 41=Mark, 42=Luke, 43=John, 44=Acts,
45=Romans, 46=1 Corinthians, 47=2 Corinthians, 48=Galatians, 49=Ephesians,
50=Philippians, 51=Colossians, 52=1 Thessalonians, 53=2 Thessalonians, 54=1 Timothy,
55=2 Timothy, 56=Titus, 57=Philemon, 58=Hebrews, 59=James,
60=1 Peter, 61=2 Peter, 62=1 John, 63=2 John, 64=3 John,
65=Jude, 66=Revelation
```

### Handling Edge Cases
- **Verse ranges**: Store first verse only (e.g., "Hebrews 10:24-25" → `bible.58010024`)
- **Chapters**: Use verse 001 (e.g., "Psalm 23" → `bible.19023001`)
- **Future**: Auto-parsing of human format deferred to Phase 2

## Operation Types

All mutations create operations for sync. Operations are immutable and append-only.

**Common structure:**
```typescript
{
  op_id: string,        // UUID v4 (client-generated)
  ts_client: number,    // Epoch ms (client timestamp)
  entity: string,       // "verse", "review", "setting"
  action: string,       // "add", "set", "delete"
  data: object          // Entity-specific payload
}
```

**Verse operations:**
- `action: "add"` - Create new verse
- `action: "set"` - Update existing verse (full replacement)
- `action: "delete"` - Delete verse

**Review operations:**
- `action: "add"` only (append-only, no updates or deletes)

**Setting operations:**
- `action: "set"` - Create or update setting

**See:** `client/src/actions.ts` for operation creation, `server/api/push.php` for server handling

## Data Validation Rules

### Verse Validation
- `id`: Required, UUID v4 format
- `reference`: Required, non-empty, max 200 chars
- `refSort`: Required, format `bible.BBCCCVVV`, max 50 chars
- `content`: Required, non-empty, max 10,000 chars
- `translation`: Optional, max 50 chars
- `reviewCat`: Required, enum: "auto" | "future" | "learn" | "daily" | "weekly" | "monthly"
- `startedAt`: Optional, null or positive epoch ms
- `tags`: Optional, array of {key, value} objects
- `favorite`: Required, boolean
- `createdAt`: Required, positive epoch ms
- `updatedAt`: Required, positive epoch ms

**Why these limits:**
- 200 chars for reference = longest biblical reference fits comfortably
- 10,000 chars for content = entire chapters fit (e.g., Psalm 119 ~5000 chars)
- 50 chars for translation = "New International Version (2011)" fits

### Review Validation
- `id`: Required, UUID v4 format
- `verseId`: Required, UUID v4 format (must exist in verses table)
- `reviewType`: Required, enum: "recall" | "hint" | "firstletters" | "flashcard"
- `createdAt`: Required, positive epoch ms

### Authentication Validation
- `email`: Required, valid email format, max 255 chars
- `password`: Required, min 8 chars, max 255 chars
- `token`: Required, 64-char hex string (client-side), bcrypt hash (server-side)

**Why bcrypt:**
- Industry standard for password hashing
- Adaptive cost factor (currently 10)
- Resistant to brute force attacks
- Built into PHP (password_hash, password_verify)

## Data Import/Export Formats

### JSON Export Format

Standard export format for data portability:

```json
{
  "version": "1.0.0",
  "exported_at": 1704326400000,
  "verses": [
    {
      "id": "uuid-here",
      "reference": "John 3:16",
      "refSort": "bible.43003016",
      "content": "For God so loved...",
      "translation": "NIV",
      "reviewCat": "daily",
      "startedAt": 1704326400000,
      "tags": [
        {"key": "theme", "value": "love"}
      ],
      "favorite": false,
      "createdAt": 1704326400000,
      "updatedAt": 1704326400000
    }
  ],
  "reviews": [
    {
      "id": "uuid-here",
      "verseId": "verse-uuid",
      "reviewType": "recall",
      "createdAt": 1704326400000
    }
  ]
}
```

**Why this format:**
- Complete data portability (user owns their data)
- Version field for future migration
- Human-readable JSON
- Can be imported to new account or different device

**See:** `client/src/app.ts` for export/import implementation

### CSV Import Format

For bulk import from spreadsheets:

```csv
reference,refSort,content,translation,tags,startedAt
"John 3:16","bible.43003016","For God so loved...","NIV","theme=love,personal","2024-01-01"
```

**CSV considerations:**
- Quote fields containing commas
- Date formats converted to epoch ms on import
- Tags parsed from comma-separated string
- UUIDs generated on import (not preserved)

### Migration from Legacy App

**Considerations:**
- Legacy uses snake_case, new app uses camelCase
- Transform comma-separated tags to structured array
- Convert date strings to epoch milliseconds
- Map old review categories to new format
- Include review history (last 90 days recommended, full history optional)

**See:** Previous work file 008 (Smart Import Feature) for implementation details

## Database Indexes

### Why These Indexes

**Client (IndexedDB):**
- `verses.id` - Primary key (automatic)
- `verses.refSort` - Biblical ordering for verse list
- `verses.createdAt` - Chronological ordering ("Recently added")
- `reviews.verseId` - Lookup all reviews for a verse
- `reviews.createdAt` - Recent reviews, statistics

**Server (SQLite):**
- `ops(user_id, seq)` - Efficient pull queries with cursor (critical for sync performance)
- `ops(op_id)` - Deduplication (prevent duplicate operations)
- `tokens(user_id)` - Auth lookups (fast token validation)

**Performance impact:**
- Indexes speed up reads but slow down writes slightly
- For this app, reads >> writes (good trade-off)
- Cursor-based pull query with index is O(1) instead of O(n)

**See:** `client/src/db.ts` and `server/schema.sql` for complete index definitions

## Data Integrity Patterns

### Client-Side
- Transactions for atomicity (verse + operation created together)
- Foreign key relationships enforced by application logic
- Validation before persistence
- UUIDs prevent ID collisions across devices

### Server-Side
- Foreign key constraints enforced by SQLite
- Unique constraint on op_id (prevents duplicates)
- Prepared statements prevent SQL injection
- Views ensure read consistency

### Sync Integrity
- Operations are idempotent (safe to replay)
- Deduplication via appliedOps table
- LWW resolution uses server timestamp (authoritative)
- Cursor-based pull prevents missed operations

**Trade-offs:**
- No strong consistency (eventual consistency model)
- Possible data loss if same verse edited simultaneously on multiple devices
- Acceptable for personal use case (single user rarely does this)

**See:** systemPatterns.md for conflict resolution details
