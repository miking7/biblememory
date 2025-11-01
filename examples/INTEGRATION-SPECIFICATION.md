# Bible Memory App - Integration Specification

## Executive Summary

This document outlines the plan to merge three example projects into a unified Bible memory application:
1. **Legacy Laravel App**: Mature review features and algorithms
2. **SPA Demo**: Modern UI/UX patterns
3. **OpLog Starter**: Robust sync architecture

The goal is to create a modern, offline-first Bible memory app that combines the best features from each example while maintaining simplicity and performance.

---

## Recommended Architecture

### Technology Stack

**Frontend**:
- **Framework**: Alpine.js (from SPA demo)
- **Styling**: Tailwind CSS (from SPA demo)
- **Build**: Vite (minimal build step for TypeScript)
- **Storage**: Dexie.js + IndexedDB (from OpLog starter)
- **Language**: TypeScript

**Backend**:
- **Framework**: Slim Framework (PHP micro-framework)
- **Language**: PHP 8+
- **Database**: SQLite (development and production)
- **Server**: Nginx/Apache
- **Auth**: Simple token-based (after initial login) with secure password hashing

**Rationale**:
- Alpine.js provides reactivity without heavy framework overhead
- Dexie.js enables true offline-first with unlimited storage
- Slim Framework adds structure while staying lightweight
- SQLite is perfect for single-user or small team usage
- TypeScript adds type safety to client code

---

## Data Model

### Design Principles
- **Use epochs (milliseconds) for all timestamps** - consistency and easier math
- **Multi-paragraph support** - critical requirement from legacy app
- **Structured tags** - easier to query than comma-separated strings
- **Reference sorting** - maintain legacy ref_sort pattern for proper ordering

### Client Schema (IndexedDB via Dexie)

```typescript
// Core entities
verses: {
  // Identity (from legacy + oplog pattern)
  id: string,              // UUID v4 - unique across all users
  
  // Reference fields (from legacy)
  reference: string,       // Human-readable: "John 3:16" or "Hebrews 10:24-25"
  refSort: string,         // Sortable format: "bible.43003016" (book.chapter.verse)
  
  // Content (from legacy - CRITICAL: multi-paragraph support)
  content: string,         // Verse text with \n for line breaks (not ↵)
  translation: string,     // "KJV", "NIV", "ESV", etc. (from SPA demo)
  
  // Memorization tracking (from legacy)
  reviewCat: string,       // "auto", "future", "learn", "daily", "weekly", "monthly"
  startedAt: number,       // Epoch ms - when memorization began (null = not started)
  
  // Organization (from legacy, improved structure)
  tags: Array<{            // Structured tags instead of comma-separated
    key: string,           // e.g., "fast.sk", "ss", "personal"
    value: string          // e.g., "3", "2010.Q2.W01", "01"
  }>,
  
  // Metadata (from oplog + SPA demo)
  favorite: boolean,       // Quick access flag (from SPA demo)
  createdAt: number,       // Epoch ms - when verse was added
  updatedAt: number,       // Epoch ms - for LWW conflict resolution (from oplog)
}

reviews: {
  // Identity (from oplog pattern)
  id: string,              // UUID v4
  
  // Relationship
  verseId: string,         // Foreign key to verses.id
  
  // Review details (from legacy)
  reviewType: string,      // "recall", "hint", "firstletters", "flashcard"
  
  // Timing (all epochs for consistency)
  createdAt: number,       // Epoch ms - when review occurred
}

settings: {
  key: string,             // Setting identifier
  value: any,              // Setting value (JSON-serializable)
  updatedAt: number        // Epoch ms - for LWW conflict resolution
}

// Auth storage (for simple token-based auth)
auth: {
  id: string,              // "current" - single record
  token: string,           // 64-char hex string from server
  userId: string,          // UUID v4
  createdAt: number        // Epoch ms - when token was issued
}

// Sync infrastructure (from OpLog starter)
outbox: {
  op_id: string,           // UUID v4
  ts_client: number,       // Epoch ms - client timestamp
  entity: string,          // "verse", "review", "setting"
  action: string,          // "add", "set", "patch", "delete"
  data: any                // Operation payload
}

appliedOps: {
  op_id: string            // UUID v4 - for deduplication
}

sync: {
  id: string,              // "default"
  cursor: number,          // Last synced sequence number
  lastPushAt: number,      // Epoch ms - last successful push
  lastPullAt: number       // Epoch ms - last successful pull
}
```

### Data Model Sources

**From Legacy Laravel App**:
- `reference` - human-readable verse reference
- `refSort` - sortable reference format (`bible.BBCCCVVV`)
- `content` - verse text with multi-paragraph support
- `reviewCat` - review category (auto/f/l/d/w/m)
- `startedAt` - memorization start date
- `tags` - structured key-value pairs (improved from comma-separated)

**From SPA Demo**:
- `translation` - Bible translation field
- `favorite` - quick access flag
- `success` - review success tracking

**From OpLog Starter**:
- `id` - UUID v4 for all entities
- `updatedAt` - for Last-Write-Wins conflict resolution
- `createdAt` - entity creation timestamp
- Sync infrastructure (outbox, appliedOps, sync)

**New/Improved**:
- All timestamps as epochs (milliseconds) for consistency
- Structured tags array instead of comma-separated string
- Multi-paragraph content support (critical requirement)

### Server Schema (SQLite)

```sql
-- Users (proper auth system)
CREATE TABLE users (
  user_id TEXT PRIMARY KEY,           -- UUID v4
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,        -- bcrypt/argon2
  created_at INTEGER NOT NULL,        -- Epoch ms
  last_login_at INTEGER,              -- Epoch ms
  is_active INTEGER DEFAULT 1         -- Boolean flag
);

CREATE INDEX idx_users_email ON users(email);

-- API Tokens (simple token-based auth)
CREATE TABLE tokens (
  token TEXT PRIMARY KEY,             -- 64-char hex string (32 bytes)
  user_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,        -- Epoch ms
  last_used_at INTEGER,               -- Epoch ms - for tracking activity
  revoked_at INTEGER,                 -- Epoch ms - NULL if active
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE INDEX idx_tokens_user ON tokens(user_id);
CREATE INDEX idx_tokens_revoked ON tokens(revoked_at);

-- Operation log (source of truth - from oplog pattern)
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

-- Derived views (optional, for admin/reporting)
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

-- View for current verses (latest state)
CREATE VIEW current_verses AS
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

### Reference Format Specification

**Human Format** (display to user):
- Single verse: `"John 3:16"`
- Verse range: `"Hebrews 10:24-25"`
- Chapter: `"Psalm 23"` (entire chapter)

**Machine Format** (refSort for sorting):
- Format: `bible.BBCCCVVV`
- BB = Book number (01-66, zero-padded)
- CCC = Chapter number (001-150, zero-padded)
- VVV = Verse number (001-176, zero-padded)
- Examples:
  - `"bible.43003016"` = John 3:16 (book 43, chapter 3, verse 16)
  - `"bible.58010024"` = Hebrews 10:24 (book 58, chapter 10, verse 24)
  - `"bible.19023001"` = Psalm 23:1 (book 19, chapter 23, verse 1)

**Book Number Mapping** (66 books):
```
01=Genesis, 02=Exodus, 03=Leviticus, 04=Numbers, 05=Deuteronomy,
06=Joshua, 07=Judges, 08=Ruth, 09=1 Samuel, 10=2 Samuel,
11=1 Kings, 12=2 Kings, 13=1 Chronicles, 14=2 Chronicles, 15=Ezra,
16=Nehemiah, 17=Esther, 18=Job, 19=Psalms, 20=Proverbs,
21=Ecclesiastes, 22=Song of Solomon, 23=Isaiah, 24=Jeremiah, 25=Lamentations,
26=Ezekiel, 27=Daniel, 28=Hosea, 29=Joel, 30=Amos,
31=Obadiah, 32=Jonah, 33=Micah, 34=Nahum, 35=Habakkuk,
36=Zephaniah, 37=Haggai, 38=Zechariah, 39=Malachi, 40=Matthew,
41=Mark, 42=Luke, 43=John, 44=Acts, 45=Romans,
46=1 Corinthians, 47=2 Corinthians, 48=Galatians, 49=Ephesians, 50=Philippians,
51=Colossians, 52=1 Thessalonians, 53=2 Thessalonians, 54=1 Timothy, 55=2 Timothy,
56=Titus, 57=Philemon, 58=Hebrews, 59=James, 60=1 Peter,
61=2 Peter, 62=1 John, 63=2 John, 64=3 John, 65=Jude,
66=Revelation
```

### Multi-Paragraph Content Format

**Storage Format**:
- Use standard `\n` (newline) character for line breaks
- Preserve leading spaces for indentation
- Example:
```typescript
content: "5 Trust in the LORD with all thine heart; and lean not unto thine own understanding.\n6 In all thy ways acknowledge him, and he shall direct thy paths."
```

**Display Format**:
- Convert `\n` to `<br>` or `<p>` tags for HTML rendering
- Preserve indentation with `&nbsp;` for leading spaces
- Use CSS `white-space: pre-wrap` for proper formatting

### Tags Structure

**Legacy Format** (comma-separated string):
```
"fast.sk=3, ss=2010.Q2.W01, personal=01"
```

**New Format** (structured array):
```typescript
tags: [
  { key: "fast.sk", value: "3" },
  { key: "ss", value: "2010.Q2.W01" },
  { key: "personal", value: "01" }
]
```

**Common Tag Patterns** (from legacy data):
- `fast.sk` = 'FAST Survival Kit" book/topic (1-5)
- `fast.bt` = 'FAST Basic Training" book/topic reference
- `ss` = Sabbath School quarter/week reference
- `personal` = Personal marker (vs coming from training/etc)
- Custom tags allowed for user organization

### Tags UI Specification

**Input Format**:
- User enters tags as comma-separated strings
- Each tag can optionally include a value using `=` syntax
- Examples:
  - `"fast.sk=3, ss=2010.Q2.W01, personal"`
  - `"theme=faith, difficulty=hard"`
  - `"personal=01, adam"`

**Parsing Logic**:
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

**Auto-complete Feature**:
- Track all unique tag keys used across user's verses
- Display dropdown suggestions as user types
- Suggestions appear after typing 1+ characters
- Filter suggestions based on current input
- Select suggestion with Enter/Tab or mouse click
- Common tags from legacy data pre-populated:
  - `fast.sk`
  - `fast.bt`
  - `ss`
  - `personal`
  - `theme`
  - `topic`
  - `difficulty`

**UI Components**:
```typescript
// Tag input component (Alpine.js)
<div x-data="tagInput()">
  <label>Tags (comma-separated, use key=value for values)</label>
  <input 
    type="text"
    x-model="tagInput"
    @input="updateSuggestions"
    @keydown.enter.prevent="selectSuggestion"
    @keydown.tab.prevent="selectSuggestion"
    placeholder="e.g., fast.sk=3, ss=2010.Q2.W01, personal"
    class="w-full px-4 py-3 border-2 rounded-xl"
  />
  
  <!-- Auto-complete dropdown -->
  <div x-show="suggestions.length > 0" 
       class="absolute bg-white border rounded-lg shadow-lg mt-1 max-h-48 overflow-y-auto">
    <template x-for="suggestion in suggestions" :key="suggestion">
      <div 
        @click="insertSuggestion(suggestion)"
        class="px-4 py-2 hover:bg-blue-50 cursor-pointer"
        x-text="suggestion">
      </div>
    </template>
  </div>
  
  <!-- Tag preview -->
  <div class="mt-2 flex flex-wrap gap-2">
    <template x-for="tag in parsedTags" :key="tag.key">
      <span class="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
        <span x-text="tag.key"></span>
        <span x-show="tag.value" class="text-blue-500">
          =<span x-text="tag.value"></span>
        </span>
      </span>
    </template>
  </div>
</div>
```

**Auto-complete Logic**:
```typescript
function tagInput() {
  return {
    tagInput: '',
    suggestions: [],
    allTagKeys: [], // Loaded from user's existing verses
    
    init() {
      // Load all unique tag keys from user's verses
      this.allTagKeys = this.getUniqueTagKeys();
    },
    
    getUniqueTagKeys() {
      const keys = new Set(['fast.sk', 'fast.bt', 'ss', 'personal', 'theme', 'topic', 'difficulty']);
      // Add keys from existing verses
      verses.forEach(verse => {
        verse.tags.forEach(tag => keys.add(tag.key));
      });
      return Array.from(keys).sort();
    },
    
    updateSuggestions() {
      // Get current word being typed (after last comma)
      const parts = this.tagInput.split(',');
      const currentPart = parts[parts.length - 1].trim();
      const currentWord = currentPart.split('=')[0].trim();
      
      if (currentWord.length === 0) {
        this.suggestions = [];
        return;
      }
      
      // Filter suggestions
      this.suggestions = this.allTagKeys
        .filter(key => key.toLowerCase().includes(currentWord.toLowerCase()))
        .slice(0, 10); // Limit to 10 suggestions
    },
    
    selectSuggestion() {
      if (this.suggestions.length === 0) return;
      this.insertSuggestion(this.suggestions[0]);
    },
    
    insertSuggestion(suggestion) {
      const parts = this.tagInput.split(',');
      parts[parts.length - 1] = ' ' + suggestion;
      this.tagInput = parts.join(',');
      this.suggestions = [];
      // Focus remains on input for adding value or next tag
    },
    
    get parsedTags() {
      return parseTags(this.tagInput);
    }
  };
}
```

**Display Format** (in verse list):
```html
<!-- Compact tag display -->
<div class="flex flex-wrap gap-1 mt-2">
  <template x-for="tag in verse.tags" :key="tag.key">
    <span class="text-xs px-2 py-1 bg-slate-100 text-slate-600 rounded">
      <span x-text="tag.key"></span>
      <span x-show="tag.value" class="text-slate-400">
        =<span x-text="tag.value"></span>
      </span>
    </span>
  </template>
</div>
```

**Filtering by Tags**:
```typescript
// Filter verses by tag key or key=value
function filterByTag(verses: Verse[], tagFilter: string): Verse[] {
  if (!tagFilter) return verses;
  
  const [filterKey, filterValue] = tagFilter.split('=').map(s => s.trim());
  
  return verses.filter(verse => {
    return verse.tags.some(tag => {
      if (filterValue) {
        // Match both key and value
        return tag.key === filterKey && tag.value === filterValue;
      } else {
        // Match key only
        return tag.key === filterKey;
      }
    });
  });
}
```

---

## Feature Integration Plan

### Phase 1: Core Features

#### From SPA Demo (Keep)
✅ Modern UI with Tailwind CSS
✅ Glass morphism design
✅ Tab navigation (Add, List, Review)
✅ Alpine.js reactivity
✅ Import/Export functionality
✅ Search/filter verses

#### From OpLog Starter (Adopt)
✅ Dexie.js for IndexedDB
✅ Operation log sync pattern
✅ Cursor-based pull
✅ Batch push operations
✅ Offline-first architecture
✅ Idempotent operations

#### From Legacy App (Integrate)
✅ Spaced repetition algorithm
✅ Review categories (learn/daily/weekly/monthly)
✅ Tags system with values
✅ Started date tracking
✅ Reference sorting
✅ **Multi-paragraph verse support** (CRITICAL)

### Phase 2: Enhanced Review Features

#### From Legacy App (Port to Modern Stack)
✅ Multiple review modes:
  - Reference → Content (basic)
  - Hints mode (progressive word revelation)
  - First letters mode
  - Flash cards (adjustable difficulty)
✅ Keyboard shortcuts
✅ Progress tracking (X/Y counter)
✅ Context menu (right-click options)

#### New Features
✅ Review statistics dashboard
✅ Streak tracking (from SPA demo)
✅ Daily review notifications
✅ Review history timeline

### Phase 3: Advanced Features

#### From Legacy App
✅ Meditation prompts
✅ Application questions
⭕ Bible API integration (to be reconsidered - which API to use?)

#### New Features
✅ PWA manifest (offline capability)
✅ Service worker (background sync)
✅ Push notifications (review reminders)
✅ Dark mode toggle
✅ Accessibility improvements (ARIA, keyboard nav)

---

## Review Algorithm Specification

### Spaced Repetition Schedule

Based on the proven algorithm from the legacy app:

```typescript
function getReviewSchedule(verse: Verse, reviewCount: number): ReviewSchedule {
  const daysSinceStart = daysBetween(verse.startedAt, today());
  
  // Manual override (if user sets review_cat manually)
  if (verse.reviewCat !== 'auto') {
    return getManualSchedule(verse.reviewCat);
  }
  
  // Automatic scheduling based on age
  if (daysSinceStart < 0) return { frequency: 'future', interval: null };
  if (daysSinceStart < 7) return { frequency: 'learn', interval: 1 };
  if (daysSinceStart < 56) return { frequency: 'daily', interval: 1 };
  if (daysSinceStart < 112) return { frequency: 'weekly', interval: 7 };
  return { frequency: 'monthly', interval: 30 };
}

function isDueForReview(verse: Verse, lastReview: Review | null): boolean {
  const schedule = getReviewSchedule(verse, verse.reviewCount);
  
  if (!lastReview) return true;
  
  const daysSinceReview = daysBetween(lastReview.createdAt, today());
  
  // Probabilistic review for weekly/monthly
  if (schedule.frequency === 'weekly') {
    return Math.random() < (1/7); // 1-in-7 chance
  }
  if (schedule.frequency === 'monthly') {
    return Math.random() < (1/30); // 1-in-30 chance
  }
  
  return daysSinceReview >= schedule.interval;
}
```

### Review Modes Implementation

```typescript
// 1. Reference Mode (default)
interface ReferenceMode {
  show: 'reference',
  hide: 'content'
}

// 2. Hints Mode (progressive reveal)
interface HintsMode {
  show: 'reference' | 'partial-content',
  wordsRevealed: number,  // increment by 3 each hint
  action: 'add-hint'
}

// 3. First Letters Mode
interface FirstLettersMode {
  show: 'reference' | 'first-letters',
  transform: (text: string) => string  // extract first letter of each word
}

// 4. Flash Cards Mode
interface FlashCardsMode {
  show: 'reference' | 'partial-content',
  difficulty: 0 | 10 | 25 | 45 | 100,  // % of words hidden
  clickToReveal: boolean
}
```

---

## UI/UX Specification

### Design System (from SPA Demo)

**Colors**:
```css
--primary: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
--success: linear-gradient(135deg, #10b981 0%, #059669 100%);
--warning: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
--accent: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
--background: linear-gradient(135deg, #1e3a8a 0%, #312e81 50%, #1e293b 100%);
```

**Typography**:
- Font: Inter (Google Fonts)
- Weights: 300, 400, 500, 600, 700
- Base size: 16px
- Scale: 1.25 (major third)

**Components**:
- Glass cards with backdrop blur
- Gradient buttons with hover lift
- Smooth transitions (0.3s ease)
- Tab navigation with active indicators
- Modal overlays with backdrop
- Badge notifications with pulse animation

### Layout Structure

```
┌─────────────────────────────────────┐
│  Header (Logo + Title)              │
├─────────────────────────────────────┤
│  Stats Bar (Total | Today | Streak) │
├─────────────────────────────────────┤
│  Tab Navigation                      │
│  [Add] [My Verses] [Review]         │
├─────────────────────────────────────┤
│                                      │
│  Tab Content Area                   │
│  (Dynamic based on active tab)      │
│                                      │
└─────────────────────────────────────┘
```

### Keyboard Shortcuts (from Legacy App)

```typescript
const shortcuts = {
  // Review navigation
  'n': nextVerse,
  'p': previousVerse,
  'Space': advance,  // reveal or next
  
  // Review modes
  'h': addHint,
  'f': showFirstLetters,
  'c': showFlashCards,
  
  // Actions
  's': saveData,
  'Escape': closeModal,
  '/': focusSearch,
  
  // Navigation
  '1': goToAddTab,
  '2': goToListTab,
  '3': goToReviewTab
};
```

---

## Sync Protocol Specification

### Operation Types

```typescript
// Verse operations
type VerseOp = {
  entity: 'verse',
  action: 'add' | 'set' | 'delete',
  data: {
    id: string,
    reference: string,
    content: string,
    translation: string,
    tags: string[],
    startedAt: string,
    // ... other fields
  }
}

// Review operations (append-only)
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

// Setting operations
type SettingOp = {
  entity: 'setting',
  action: 'set',
  data: {
    key: string,
    value: any
  }
}
```

### Sync Strategy

**Push (Client → Server)**:
1. Queue operations in `outbox` as they occur
2. Every 60 seconds (or on visibility change):
   - Batch up to 500 operations
   - POST to `/api/push`
   - Remove acknowledged ops from outbox
   - Update cursor

**Pull (Server → Client)**:
1. Every 60 seconds (or after push):
   - GET `/api/pull?since={cursor}`
   - Apply operations to local database
   - Deduplicate using `appliedOps`
   - Update cursor

**Conflict Resolution**:
- Reviews: Accept all (append-only, no conflicts)
- Verses: Last-Write-Wins using `ts_server`
- Settings: Last-Write-Wins using `ts_server`

---

## API Endpoints

### Authentication
```
POST /api/register
  Body: { email, password }
  Response: { user_id, token }

POST /api/login
  Body: { email, password }
  Response: { user_id, token }

POST /api/logout
  Headers: { Authorization: Bearer <token> }
  Response: { ok: true }
  Note: Revokes token on server
```

### Sync
```
POST /api/push
  Headers: { Authorization: Bearer <token> }
  Body: { client_id, ops: [...] }
  Response: { ok, acked_ids, cursor }

GET /api/pull?since={cursor}&limit={limit}
  Headers: { Authorization: Bearer <token> }
  Response: { cursor, ops: [...] }
```

### State (Admin/Debug)
```
GET /api/state?format=json&since={seq}
  Headers: { Authorization: Bearer <token> }
  Response: { verses: [...], reviews: [...], stats: {...} }
```

---

## Implementation Priorities

### Must Have (MVP)
1. ✅ Verse CRUD (add, edit, delete, list)
2. ✅ Basic review mode (reference → content)
3. ✅ Spaced repetition algorithm
4. ✅ Offline-first with IndexedDB
5. ✅ Sync with server (push/pull)
6. ✅ Search/filter verses
7. ✅ Import/export JSON
8. ✅ Modern UI (Tailwind + Alpine)

### Should Have (Phase 2)
1. ✅ Multiple review modes (hints, first letters, flashcards)
2. ✅ Keyboard shortcuts
3. ✅ Statistics dashboard
4. ✅ Streak tracking
5. ✅ Tags system
6. ✅ PWA manifest
7. ✅ Dark mode

### Nice to Have (Phase 3)
1. ⭕ Meditation/application prompts
2. ⭕ Bible Gateway integration
3. ⭕ Push notifications
4. ⭕ Service worker (background sync)
5. ⭕ Social features (share verses)
6. ⭕ Progress charts/analytics
7. ⭕ Multiple translations side-by-side

---

## Questions to Resolve Before Migration

### 1. Authentication Strategy
**Decision**: Simple API Token (chosen for simplicity and offline-first support)

**How it works**:
- User logs in once, receives a long-lived token (64-char hex string)
- Token stored in IndexedDB
- Token sent with every API request in Authorization header
- No automatic expiration (manual revocation via logout)

**Implementation**:
```php
// Server: Generate token on login
$token = bin2hex(random_bytes(32)); // 64-char hex string
// Store in tokens table: token, user_id, created_at, last_used_at, revoked_at

// Validate on each request
function getUserFromToken($authHeader) {
  $token = str_replace('Bearer ', '', $authHeader);
  // Query tokens table WHERE token = ? AND revoked_at IS NULL
  return $user_id;
}
```

```typescript
// Client: Store and use
await db.auth.put({ 
  id: 'current', 
  token: 'abc123...', 
  userId: 'user-123',
  createdAt: Date.now()
});

// Send with all requests
headers: { 'Authorization': `Bearer ${auth.token}` }
```

**Security considerations**:
- Always use HTTPS in production
- Token stored in IndexedDB (more secure than localStorage)
- Logout revokes token on server (sets revoked_at timestamp)
- Can track last_used_at for activity monitoring
- Future: Can add token expiration if needed

**When to reconsider**:
- Opening to public users → Consider JWT with expiration
- Compliance requirements → Consider short-lived tokens + refresh
- Shared device usage → Add automatic token expiration

### 2. Verse Reference Format
**Question**: How should we store and display verse references?

**Options**:
- A) Human format only: "John 3:16"
- B) Machine format only: "JHN.3.16"
- C) Both: store machine format, display human format

**Recommendation**: (C) - store "JHN.3.16" for consistency, display "John 3:16"

**Need to decide**:
- Complete book abbreviation mapping (66 books)
- Handling of chapter-only references (e.g., "Psalm 23")
- Handling of verse ranges (e.g., "John 3:16-17")

### 3. Tags Implementation
**Question**: How should tags work?

**From Legacy App**: Comma-separated with optional values
- Format: "theme=faith, book=John, difficulty=hard"
- Stored as single string

**Modern Approach**: Structured data
- Format: `[{ key: "theme", value: "faith" }, ...]`
- Stored as JSON array

**Recommendation**: Modern approach - easier to query and filter

### 4. Review Mode Defaults
**Question**: What should be the default review flow?

**Options**:
- A) Always start with reference (legacy app style)
- B) User chooses mode before starting review
- C) Adaptive based on verse age/difficulty

**Recommendation**: (A) for simplicity, add (B) as setting later

### 5. Offline Behavior
**Question**: How should the app behave when offline?

**Decisions needed**:
- Show offline indicator? (Yes - subtle banner)
- Queue limit for outbox? (1000 operations)
- Retry strategy? (Exponential backoff: 1s, 2s, 4s, 8s, 16s, 60s)
- Conflict notification? (Silent resolution with LWW)

### 6. Mobile Optimization
**Question**: Should we optimize for mobile from the start?

**Considerations**:
- Touch gestures (swipe for next/prev)
- Larger tap targets
- Simplified keyboard (no shortcuts)
- Reduced animations

**Recommendation**: Yes - mobile-first design, progressive enhancement for desktop

### 7. Data Migration
**Question**: How to migrate data from legacy Laravel app?

**Options**:
- A) Export from Laravel → Import to new app (manual)
- B) Write migration script (automated)
- C) Run both apps in parallel with sync

**Recommendation**: (A) for initial users, (B) if many users exist

**Need to decide**:
- Export format (JSON matching new schema)
- Handling of review history (keep or start fresh?)
- User notification strategy

### 8. PHP Framework Decision
**Question**: Keep raw PHP or adopt a framework?

**Options**:
- A) Improved raw PHP (shared bootstrap, better structure)
- B) Slim Framework (lightweight, PSR-7)
- C) Lumen (Laravel micro-framework)

**Recommendation**: (A) initially - only 3 endpoints, keep it simple

**When to reconsider**:
- Adding 5+ more endpoints
- Need complex routing
- Team prefers framework patterns

### 9. Testing Strategy
**Question**: What level of testing for MVP?

**Options**:
- A) Manual testing only
- B) Unit tests for critical logic
- C) Full test coverage (unit + integration + e2e)

**Recommendation**: (B) - test sync logic, review algorithm, conflict resolution

### 10. Deployment Strategy
**Question**: Where and how to deploy?

**Frontend Options**:
- Netlify/Vercel (static hosting)
- Cloudflare Pages
- Self-hosted

**Backend Options**:
- Shared hosting (PHP + MySQL)
- VPS (DigitalOcean, Linode)
- Managed platform (Laravel Forge, Ploi)

**Recommendation**: 
- Frontend: Netlify (free, easy, fast)
- Backend: Shared hosting initially (low cost, simple)

---

## File Structure

```
bible-memory/
├── client/
│   ├── src/
│   │   ├── db.ts              # Dexie schema
│   │   ├── sync.ts            # Push/pull logic
│   │   ├── actions.ts         # Business logic
│   │   ├── review.ts          # Review algorithm
│   │   ├── utils.ts           # Helper functions
│   │   └── types.ts           # TypeScript types
│   ├── public/
│   │   └── index.html         # Alpine.js app
│   ├── package.json
│   └── vite.config.ts
├── server/
│   ├── api/
│   │   ├── bootstrap.php      # Shared initialization
│   │   ├── lib.php            # Helper functions
│   │   ├── auth.php           # Authentication
│   │   ├── push.php           # Push endpoint
│   │   ├── pull.php           # Pull endpoint
│   │   ├── state.php          # State endpoint
│   │   └── migrate.php        # Database setup
│   ├── schema.sql             # Database schema
│   └── .htaccess              # Apache config
├── docs/
│   ├── API.md                 # API documentation
│   ├── SYNC.md                # Sync protocol
│   └── REVIEW.md              # Review algorithm
└── README.md
```

---

## Migration Checklist

### Pre-Development
- [ ] Resolve all questions above
- [ ] Create book abbreviation mapping
- [ ] Design complete database schema
- [ ] Set up development environment
- [ ] Choose hosting providers

### Phase 1: Foundation (Week 1-2)
- [ ] Set up project structure
- [ ] Implement Dexie schema
- [ ] Create basic Alpine.js UI
- [ ] Implement verse CRUD
- [ ] Add search/filter
- [ ] Implement basic review mode
- [ ] Add import/export

### Phase 2: Sync (Week 3)
- [ ] Implement server API (push/pull/state)
- [ ] Add authentication
- [ ] Implement client sync logic
- [ ] Test offline scenarios
- [ ] Test multi-device sync
- [ ] Handle conflicts

### Phase 3: Review Features (Week 4)
- [ ] Port spaced repetition algorithm
- [ ] Implement hints mode
- [ ] Implement first letters mode
- [ ] Implement flashcards mode
- [ ] Add keyboard shortcuts
- [ ] Add statistics dashboard

### Phase 4: Polish (Week 5-6)
- [ ] Add PWA manifest
- [ ] Implement dark mode
- [ ] Improve accessibility
- [ ] Add meditation prompts
- [ ] Optimize performance
- [ ] Write documentation
- [ ] Deploy to production

### Post-Launch
- [ ] Monitor sync errors
- [ ] Gather user feedback
- [ ] Plan Phase 2 features
- [ ] Consider framework migration if needed

---

## Success Metrics

### Technical
- Sync success rate > 99%
- Offline functionality works 100%
- Page load < 2 seconds
- Review interaction < 100ms
- Zero data loss

### User Experience
- Daily active users
- Average verses per user
- Review completion rate
- Streak retention (7-day, 30-day)
- User satisfaction score

---

## Risk Mitigation

### Risk: Data Loss During Sync
**Mitigation**: 
- Idempotent operations
- Operation log as source of truth
- Regular backups
- Export functionality

### Risk: Offline Conflicts
**Mitigation**:
- LWW for mutable data
- Append-only for reviews
- Clear conflict resolution rules
- User notification if needed

### Risk: Performance Degradation
**Mitigation**:
- IndexedDB for unlimited storage
- Cursor-based pagination
- Batch operations
- Lazy loading

### Risk: Browser Compatibility
**Mitigation**:
- Feature detection
- Graceful degradation
- Polyfills for older browsers
- Clear browser requirements

---

## Conclusion

This specification provides a clear path to merge the three example projects into a cohesive Bible memory application. The recommended approach:

1. **Start simple**: Use improved raw PHP, Alpine.js, and Dexie.js
2. **Build incrementally**: MVP first, then enhanced features
3. **Stay offline-first**: IndexedDB + operation log pattern
4. **Keep it fast**: Minimal dependencies, optimized sync
5. **Plan for growth**: Easy migration paths to frameworks if needed

The key is to adopt the proven patterns (spaced repetition, oplog sync, modern UI) while keeping the implementation simple and maintainable.
