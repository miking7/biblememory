# Data Specifications

## Data Model Details

### Client Schema (IndexedDB via Dexie)

#### Verse Table
```typescript
interface Verse {
  // Identity
  id: string;              // UUID v4 - unique across all users
  
  // Reference fields
  reference: string;       // Human-readable: "John 3:16" or "Hebrews 10:24-25"
  refSort: string;         // Sortable format: "bible.BBCCCVVV"
  
  // Content
  content: string;         // Verse text with \n for line breaks
  translation: string;     // "KJV", "NIV", "ESV", etc.
  
  // Memorization tracking
  reviewCat: string;       // "auto", "future", "learn", "daily", "weekly", "monthly"
  startedAt: number | null; // Epoch ms - when memorization began (null = not started)
  
  // Organization
  tags: Array<{            // Structured tags
    key: string;           // e.g., "fast.sk", "ss", "personal"
    value: string;         // e.g., "3", "2010.Q2.W01", "01"
  }>;
  favorite: boolean;       // Quick access flag
  
  // Metadata
  createdAt: number;       // Epoch ms - when verse was added
  updatedAt: number;       // Epoch ms - for LWW conflict resolution
}
```

**Indexes:**
- Primary key: `id`
- `refSort` - For biblical ordering
- `createdAt` - For chronological queries
- `updatedAt` - For sync operations

#### Review Table
```typescript
interface Review {
  // Identity
  id: string;              // UUID v4
  
  // Relationship
  verseId: string;         // Foreign key to verses.id
  
  // Review details
  reviewType: string;      // "recall", "hint", "firstletters", "flashcard"
  
  // Timing
  createdAt: number;       // Epoch ms - when review occurred
}
```

**Indexes:**
- Primary key: `id`
- `verseId` - For verse history lookups
- `createdAt` - For recent reviews

#### Settings Table
```typescript
interface Setting {
  key: string;             // Setting identifier
  value: any;              // Setting value (JSON-serializable)
  updatedAt: number;       // Epoch ms - for LWW conflict resolution
}
```

**Indexes:**
- Primary key: `key`

#### Auth Table
```typescript
interface Auth {
  id: string;              // "current" - single record
  token: string;           // 64-char hex string from server
  userId: string;          // UUID v4
  createdAt: number;       // Epoch ms - when token was issued
}
```

**Indexes:**
- Primary key: `id`

#### Outbox Table (Sync Infrastructure)
```typescript
interface OutboxOp {
  op_id: string;           // UUID v4
  ts_client: number;       // Epoch ms - client timestamp
  entity: string;          // "verse", "review", "setting"
  action: string;          // "add", "set", "patch", "delete"
  data: any;               // Operation payload
}
```

**Indexes:**
- Primary key: `op_id`
- `ts_client` - For chronological processing

#### AppliedOps Table (Sync Infrastructure)
```typescript
interface AppliedOp {
  op_id: string;           // UUID v4 - for deduplication
}
```

**Indexes:**
- Primary key: `op_id`

#### Sync Table (Sync Infrastructure)
```typescript
interface SyncState {
  id: string;              // "default"
  cursor: number;          // Last synced sequence number
  lastPushAt: number;      // Epoch ms - last successful push
  lastPullAt: number;      // Epoch ms - last successful pull
}
```

**Indexes:**
- Primary key: `id`

### Server Schema (SQLite)

#### Users Table
```sql
CREATE TABLE users (
  user_id TEXT PRIMARY KEY,           -- UUID v4
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,        -- bcrypt/argon2
  created_at INTEGER NOT NULL,        -- Epoch ms
  last_login_at INTEGER,              -- Epoch ms
  is_active INTEGER DEFAULT 1         -- Boolean flag
);

CREATE INDEX idx_users_email ON users(email);
```

#### Tokens Table
```sql
CREATE TABLE tokens (
  token TEXT PRIMARY KEY,             -- SHA-256 hash of 64-char hex
  user_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,        -- Epoch ms
  last_used_at INTEGER,               -- Epoch ms - for tracking activity
  revoked_at INTEGER,                 -- Epoch ms - NULL if active
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE INDEX idx_tokens_user ON tokens(user_id);
CREATE INDEX idx_tokens_revoked ON tokens(revoked_at);
```

#### Ops Table (Operation Log - Source of Truth)
```sql
CREATE TABLE ops (
  seq INTEGER PRIMARY KEY AUTOINCREMENT,  -- Monotonic sequence
  user_id TEXT NOT NULL,
  op_id TEXT UNIQUE NOT NULL,             -- UUID v4 from client
  ts_client INTEGER NOT NULL,             -- Epoch ms - client timestamp
  ts_server INTEGER NOT NULL,             -- Epoch ms - server timestamp
  entity TEXT NOT NULL,                   -- "verse", "review", "setting"
  action TEXT NOT NULL,                   -- "add", "set", "patch", "delete"
  data_json TEXT NOT NULL,                -- JSON payload
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE INDEX idx_ops_user_seq ON ops(user_id, seq);
CREATE INDEX idx_ops_op_id ON ops(op_id);
CREATE INDEX idx_ops_entity ON ops(entity);
```

#### Verses View (Derived State)
```sql
CREATE VIEW verses_view AS
  SELECT 
    user_id,
    JSON_EXTRACT(data_json, '$.id') as verse_id,
    JSON_EXTRACT(data_json, '$.reference') as reference,
    JSON_EXTRACT(data_json, '$.refSort') as ref_sort,
    JSON_EXTRACT(data_json, '$.content') as content,
    JSON_EXTRACT(data_json, '$.translation') as translation,
    JSON_EXTRACT(data_json, '$.reviewCat') as review_cat,
    JSON_EXTRACT(data_json, '$.startedAt') as started_at,
    JSON_EXTRACT(data_json, '$.tags') as tags,
    JSON_EXTRACT(data_json, '$.favorite') as favorite,
    ts_server as updated_at
  FROM ops
  WHERE entity = 'verse'
    AND action != 'delete'
    AND seq = (
      SELECT MAX(seq)
      FROM ops o2
      WHERE o2.user_id = ops.user_id
        AND o2.entity = 'verse'
        AND JSON_EXTRACT(o2.data_json, '$.id') = JSON_EXTRACT(ops.data_json, '$.id')
    );
```

#### Reviews View (Derived State)
```sql
CREATE VIEW reviews_view AS
  SELECT 
    user_id,
    JSON_EXTRACT(data_json, '$.id') as review_id,
    JSON_EXTRACT(data_json, '$.verseId') as verse_id,
    JSON_EXTRACT(data_json, '$.reviewType') as review_type,
    JSON_EXTRACT(data_json, '$.createdAt') as created_at,
    ts_server
  FROM ops
  WHERE entity = 'review'
    AND action = 'add';
```

#### User Stats View (Derived State)
```sql
CREATE VIEW user_stats AS
  SELECT 
    user_id,
    COUNT(DISTINCT CASE 
      WHEN entity='verse' AND action != 'delete' 
      THEN JSON_EXTRACT(data_json, '$.id') 
    END) as verse_count,
    COUNT(CASE 
      WHEN entity='review' 
      THEN 1 
    END) as review_count,
    MAX(CASE 
      WHEN entity='review' 
      THEN ts_server 
    END) as last_review_at
  FROM ops
  GROUP BY user_id;
```

## Reference Format Specification

### Human Format (Display)
- **Single verse**: `"John 3:16"`
- **Verse range**: `"Hebrews 10:24-25"`
- **Chapter**: `"Psalm 23"` (entire chapter)

### Machine Format (refSort for Sorting)
- **Format**: `bible.BBCCCVVV`
- **BB**: Book number (01-66, zero-padded)
- **CCC**: Chapter number (001-150, zero-padded)
- **VVV**: Verse number (001-176, zero-padded)

**Examples:**
- `"bible.43003016"` = John 3:16 (book 43, chapter 3, verse 16)
- `"bible.58010024"` = Hebrews 10:24 (book 58, chapter 10, verse 24)
- `"bible.19023001"` = Psalm 23:1 (book 19, chapter 23, verse 1)

### Book Number Mapping (66 Books)
```
Old Testament (01-39):
01=Genesis, 02=Exodus, 03=Leviticus, 04=Numbers, 05=Deuteronomy,
06=Joshua, 07=Judges, 08=Ruth, 09=1 Samuel, 10=2 Samuel,
11=1 Kings, 12=2 Kings, 13=1 Chronicles, 14=2 Chronicles, 15=Ezra,
16=Nehemiah, 17=Esther, 18=Job, 19=Psalms, 20=Proverbs,
21=Ecclesiastes, 22=Song of Solomon, 23=Isaiah, 24=Jeremiah, 25=Lamentations,
26=Ezekiel, 27=Daniel, 28=Hosea, 29=Joel, 30=Amos,
31=Obadiah, 32=Jonah, 33=Micah, 34=Nahum, 35=Habakkuk,
36=Zephaniah, 37=Haggai, 38=Zechariah, 39=Malachi

New Testament (40-66):
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
- **Future**: Auto-parsing deferred to Phase 2

## Multi-Paragraph Content Format

### Storage Format
- Use standard `\n` (newline) character for line breaks
- Preserve leading spaces for indentation
- Strip trailing whitespace from each line
- Allow multiple consecutive `\n` for paragraph breaks

**Example:**
```typescript
content: "5 Trust in the LORD with all thine heart; and lean not unto thine own understanding.\n6 In all thy ways acknowledge him, and he shall direct thy paths."
```

### Normalization Rules
1. Convert all line break types to `\n`:
   - Windows `\r\n` → `\n`
   - Mac `\r` → `\n`
   - Unix `\n` → `\n` (no change)
2. Strip trailing whitespace from each line
3. Preserve leading spaces for indentation
4. Collapse excessive line breaks (max 2 consecutive)

### Display Format
- Use CSS `white-space: pre-wrap` for proper rendering
- Converts `\n` to line breaks automatically
- Preserves indentation
- Wraps long lines

**CSS:**
```css
.verse-content {
  white-space: pre-wrap;
  word-wrap: break-word;
}
```

## Tags Structure

### Legacy Format (Input)
Comma-separated string with optional `=` for values:
```
"fast.sk=3, ss=2010.Q2.W01, personal=01"
```

### Modern Format (Storage)
Structured array of objects:
```typescript
tags: [
  { key: "fast.sk", value: "3" },
  { key: "ss", value: "2010.Q2.W01" },
  { key: "personal", value: "01" }
]
```

### Parsing Logic
```typescript
function parseTags(input: string): Array<{key: string, value: string}> {
  return input
    .split(',')
    .map(tag => tag.trim())
    .filter(tag => tag.length > 0)
    .map(tag => {
      const parts = tag.split('=');
      return {
        key: parts[0].trim(),
        value: parts[1]?.trim() || ''
      };
    });
}
```

### Validation Rules
- **Tag keys**: Alphanumeric + dots/hyphens, max 50 chars, case-insensitive
- **Tag values**: Any string, max 100 chars
- **Empty values**: Allowed (key without `=` or key with empty value)

### Common Tag Patterns
From legacy data analysis:
- `fast.sk` = FAST Survival Kit book/topic (1-5)
- `fast.bt` = FAST Basic Training book/topic reference
- `ss` = Sabbath School quarter/week reference (e.g., "2010.Q2.W01")
- `personal` = Personal marker vs training material
- `theme` = Thematic grouping (e.g., "faith", "love", "hope")
- `topic` = Topic-based organization
- `difficulty` = Difficulty level (e.g., "easy", "medium", "hard")

### Display Format
**Compact badges:**
```html
<span class="tag-badge">
  <span class="tag-key">fast.sk</span>
  <span class="tag-value">=3</span>
</span>
```

**Filtering:**
```typescript
// Filter by key only
verses.filter(v => v.tags.some(t => t.key === "fast.sk"))

// Filter by key and value
verses.filter(v => v.tags.some(t => t.key === "fast.sk" && t.value === "3"))
```

## Timestamp Format

### Standard: Epoch Milliseconds
All timestamps stored as **epoch milliseconds** (number):
```typescript
const now = Date.now(); // e.g., 1704326400000
```

### Rationale
- Consistent across client and server
- Easy to compare and sort
- No timezone issues
- Simple math for date calculations
- Standard JavaScript format

### Usage Examples
```typescript
// Current time
const createdAt = Date.now();

// Days between dates
const daysBetween = (ts1: number, ts2: number) => {
  return Math.floor((ts2 - ts1) / (1000 * 60 * 60 * 24));
};

// Format for display
const formatDate = (ts: number) => {
  return new Date(ts).toLocaleDateString();
};
```

## Operation Types

### Verse Operations
```typescript
type VerseOp = {
  entity: 'verse',
  action: 'add' | 'set' | 'delete',
  data: {
    id: string,
    reference: string,
    refSort: string,
    content: string,
    translation: string,
    reviewCat: string,
    startedAt: number | null,
    tags: Array<{key: string, value: string}>,
    favorite: boolean,
    createdAt: number,
    updatedAt: number
  }
}
```

### Review Operations (Append-Only)
```typescript
type ReviewOp = {
  entity: 'review',
  action: 'add',
  data: {
    id: string,
    verseId: string,
    reviewType: string,
    createdAt: number
  }
}
```

### Setting Operations
```typescript
type SettingOp = {
  entity: 'setting',
  action: 'set',
  data: {
    key: string,
    value: any
  }
}
```

## Data Validation Rules

### Verse Validation
- `id`: Required, UUID v4 format
- `reference`: Required, non-empty string, max 200 chars
- `refSort`: Required, format `bible.BBCCCVVV`, max 50 chars
- `content`: Required, non-empty string, max 10,000 chars
- `translation`: Optional, max 50 chars
- `reviewCat`: Required, one of: "auto", "future", "learn", "daily", "weekly", "monthly"
- `startedAt`: Optional, null or positive number
- `tags`: Optional, array of objects with key/value strings
- `favorite`: Required, boolean
- `createdAt`: Required, positive number
- `updatedAt`: Required, positive number

### Review Validation
- `id`: Required, UUID v4 format
- `verseId`: Required, UUID v4 format
- `reviewType`: Required, one of: "recall", "hint", "firstletters", "flashcard"
- `createdAt`: Required, positive number

### Authentication Validation
- `email`: Required, valid email format, max 255 chars
- `password`: Required, min 8 chars, max 255 chars
- `token`: Required, 64-char hex string

## Data Migration Considerations

### From Legacy Laravel App
- Export verses with all fields
- Transform comma-separated tags to structured array
- Convert dates to epoch milliseconds
- Map old review categories to new format
- Include review history (last 90 days recommended)

### CSV Import Format
For bulk import from CSV:
```csv
reference,refSort,content,translation,tags,startedAt
"John 3:16","bible.43003016","For God so loved...","NIV","theme=love,personal","2024-01-01"
```

### JSON Export Format
Standard export format:
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
        {"key": "theme", "value": "love"},
        {"key": "personal", "value": ""}
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
