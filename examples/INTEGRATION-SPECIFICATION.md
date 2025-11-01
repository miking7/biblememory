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
- **Language**: PHP 8+ with improved raw PHP (from OpLog starter)
- **Database**: SQLite (development) / MySQL (production)
- **Server**: Nginx/Apache
- **Auth**: Token-based (initial) → JWT (future)

**Rationale**:
- Alpine.js provides reactivity without heavy framework overhead
- Dexie.js enables true offline-first with unlimited storage
- Raw PHP keeps deployment simple and performance high
- TypeScript adds type safety to client code

---

## Data Model

### Client Schema (IndexedDB via Dexie)

```typescript
// Core entities
verses: {
  id: string,              // "JHN.3.16" format
  reference: string,       // "John 3:16"
  content: string,         // verse text
  translation: string,     // "NIV", "ESV", "KJV"
  tags: string[],          // ["faith", "salvation"]
  refSort: string,         // for sorting (e.g., "43003016")
  startedAt: string,       // ISO date when memorization began
  favorite: boolean,
  updatedAt: number        // ms epoch for LWW
}

reviews: {
  id: string,              // UUID
  verseId: string,         // foreign key to verses
  reviewType: string,      // "recall", "flashcard", "hint", "firstletters"
  success: boolean,        // did user recall successfully?
  createdAt: number        // ms epoch
}

settings: {
  key: string,
  value: any,
  updatedAt: number
}

// Sync infrastructure (from OpLog starter)
outbox: { op_id, ts_client, entity, action, data }
appliedOps: { op_id }
sync: { id, cursor, lastPushAt, lastPullAt }
```

### Server Schema (SQLite/MySQL)

```sql
-- Users
users (
  user_id TEXT PRIMARY KEY,
  email TEXT UNIQUE,
  password_hash TEXT,
  api_token TEXT UNIQUE,
  created_at INTEGER
)

-- Operation log (source of truth)
ops (
  seq INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT,
  op_id TEXT UNIQUE,
  ts_client INTEGER,
  ts_server INTEGER,
  entity TEXT,  -- "verse", "review", "setting"
  action TEXT,  -- "add", "set", "patch", "delete"
  data_json TEXT,
  FOREIGN KEY (user_id) REFERENCES users(user_id)
)

-- Derived views (optional, for admin/reporting)
CREATE VIEW user_stats AS
  SELECT user_id, 
         COUNT(DISTINCT CASE WHEN entity='verse' THEN JSON_EXTRACT(data_json, '$.id') END) as verse_count,
         COUNT(CASE WHEN entity='review' THEN 1 END) as review_count
  FROM ops
  GROUP BY user_id;
```

---

## Feature Integration Plan

### Phase 1: Core Features (Week 1-2)

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

### Phase 2: Enhanced Review Features (Week 3-4)

#### From Legacy App (Port to Modern Stack)
✅ Multiple review modes:
  - Reference → Content (basic)
  - Hints mode (progressive word reveal)
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

### Phase 3: Advanced Features (Week 5-6)

#### From Legacy App
✅ Meditation prompts
✅ Application questions
✅ Bible Gateway integration
✅ Multi-paragraph verse support

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
    success: boolean,
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
  Response: { user_id, api_token }

POST /api/login
  Body: { email, password }
  Response: { user_id, api_token }
```

### Sync
```
POST /api/push
  Headers: { X-Auth-Token }
  Body: { client_id, ops: [...] }
  Response: { ok, acked_ids, cursor }

GET /api/pull?since={cursor}&limit={limit}
  Headers: { X-Auth-Token }
  Response: { cursor, ops: [...] }
```

### State (Admin/Debug)
```
GET /api/state?format=json&since={seq}
  Headers: { X-Auth-Token }
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
**Question**: Start with simple token auth or implement full user management from the beginning?

**Options**:
- A) Simple token (like OpLog starter) - faster to implement
- B) Email/password with JWT - more complete but slower
- C) OAuth (Google/Facebook) - best UX but most complex

**Recommendation**: Start with (A), plan migration to (B) in Phase 2

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
