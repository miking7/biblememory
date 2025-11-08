# Active Context

## Current Work Focus

### Recent Completion: Smart Import with Update/Add Logic ✅
**Status:** Complete  
**Completed:** January 6, 2025

Completely redesigned import functionality to intelligently handle duplicate IDs and prevent collisions.

#### Problem Solved
- Importing same file created duplicates with new IDs
- No way to update existing verses via import
- Risk of ID collisions when importing from other users
- Unclear feedback about what would happen during import

#### Solution Implemented
**Smart ID Handling:**
- Analyzes import file before processing
- Matching IDs → Update existing verses
- Non-matching IDs → Generate new UUID and add
- Prevents collisions when importing from different users

**Data Merging:**
- Updates: Merge imported data with existing (missing fields preserved)
- Adds: Use imported timestamps with new UUID (preserves verse history)
- Review history untouched (only verses table affected)

**User Experience:**
- Pre-import confirmation: "Import will update X verses and add Y new verses. Continue?"
- Post-import success: "Successfully updated X verses and added Y new verses!"
- Clear, actionable feedback

#### Implementation Details
**Enhanced Functions:**
- `addVerse()` now accepts: `reviewCat`, `favorite`, `createdAt`, `updatedAt`
- `updateVerse()` now accepts: `createdAt`, `updatedAt`
- Import logic analyzes IDs before processing
- Uses nullish coalescing (`??`) for field merging

**Files Changed:**
- `client/src/app.ts` - Smart import logic in `importVerses()`
- `client/src/actions.ts` - Enhanced `addVerse()` and `updateVerse()` signatures

### Previous: Tag Search Feature ✅
**Status:** Complete  
**Completed:** January 6, 2025

Added ability to search within tags field, making it easier to find verses by their tags.

#### Implementation
- Updated `filteredVerses` computed property to include tag searching
- Uses existing `formatTags()` function to convert tags to searchable string
- Applies same unicode normalization as reference and content search
- Simple, consistent approach that reuses existing helpers

#### User Experience
Users can now search for verses by:
- Tag keys (e.g., "fast", "ss", "personal")
- Tag values (e.g., "3", "2010", "Q2")
- Partial matches (e.g., "fast" matches "fast.sk=3")
- Case-insensitive with unicode normalization

#### Files Changed
- `client/src/app.ts` - Updated `filteredVerses` getter

### Previous: Network Status Detection Improvement ✅
**Status:** Complete  
**Completed:** January 6, 2025

Replaced unreliable `navigator.onLine` detection with actual sync status tracking for more accurate connectivity feedback.

#### Problem Solved
- `navigator.onLine` unreliable across browsers (especially Safari)
- Didn't detect server issues, DNS problems, or firewall issues
- False positives (showed "online" but couldn't reach server)
- Required Safari-specific polling workarounds

#### Solution Implemented
**Sync Status Tracking:**
- Track actual sync operation results (`lastSyncSuccess`, `lastSyncError`, `lastSyncAttempt`)
- Computed property `hasSyncIssues` shows warning only when authenticated and sync fails
- Works uniformly across all browsers
- Detects both network AND server connectivity issues

**Smart Retry Logic:**
- Immediate sync (1 second) when last sync succeeded and outbox has data
- **Backoff to 30 seconds** when connectivity is failing (prevents hammering server)
- Automatic retry every 30 seconds during issues
- Immediate sync when connectivity restored

**User Experience:**
- No indicator when syncing successfully (clean UI)
- Warning banner when sync fails: "⚠️ Sync issues - Changes saved locally, will retry automatically"
- Only shows for authenticated users (not applicable for local-only mode)

#### Files Changed
- `client/src/app.ts` - Added sync status tracking, removed navigator.onLine polling
- `client/index.html` - Updated to use `hasSyncIssues` instead of `!isOnline`

### Previous: Memory Bank Initialization
Just completed restructuring project documentation into the memory bank architecture. All legacy documentation from root and examples folder has been consolidated into organized memory bank files.

### Memory Bank Structure Created
- ✅ `projectbrief.md` - Project foundation and goals
- ✅ `productContext.md` - User experience and feature priorities
- ✅ `systemPatterns.md` - Architecture and design patterns
- ✅ `techContext.md` - Technology stack and development setup
- ✅ `activeContext.md` - This file (current state)
- 🔄 `progress.md` - Next to create

## Project Status

### Phase 1: Incomplete ⚠️
The application has **most features implemented** but is **NOT production ready**:

**Implemented Features:**
- ✅ Modern build system (Vite + TypeScript)
- ✅ Beautiful UI (Tailwind CSS v4 + Vue.js 3)
- ✅ Offline-first architecture (IndexedDB + Dexie.js)
- ✅ Verse CRUD (add, edit, delete, list)
- ✅ Review mode (reference → reveal content)
- ✅ Spaced repetition algorithm (learn/daily/weekly/monthly)
- ✅ Search and filter
- ✅ Import/export JSON
- ✅ Tags system (comma-separated input, structured storage)
- ✅ Multi-paragraph verse support

**Backend Complete (Untested):**
- ✅ Authentication endpoints (register, login, logout)
- ✅ Sync endpoints (push, pull)
- ✅ OpLog pattern implementation
- ✅ Token-based authentication
- ✅ Database schema

**Frontend Incomplete:**
- ❌ **No authentication UI** - cannot log in or register
- ❌ **No auth state management** in UI
- ❌ **Sync untested** - no way to test without auth UI
- ❌ **Multi-device sync untested**

**Current Version:** 1.0.0-alpha  
**Status:** Phase 1.5 (Authentication UI) required before production

## Current Work Focus

### Recently Completed: Tag Display Feature ✅
**Status:** Complete  
**Completed:** January 6, 2025

#### Tag Display Implementation ✅
Added visual display of tags in both My Verses and Review views:

**Design Decisions:**
- **My Verses**: Tags in footer with metadata (Option 3 from design review)
- **Review View**: Tags inline with translation (Option 1 from design review)
- **Format**: `key (value)` instead of `key=value` for better readability
- **Color**: Purple badges (`bg-purple-50 text-purple-700`) to distinguish from translation
- **Layout**: Translation moved inline with verse title in My Verses

**Implementation Details:**
- Added `formatTagForDisplay()` helper function in app.ts
- Tags display only when present (`verse.tags.length > 0`)
- Flex-wrap enabled for responsive mobile layout
- Purple color scheme provides visual distinction from gray translation badges

**User Experience:**
- My Verses: `John 3:16 [NIV]` on same line, tags in footer with other metadata
- Review: Tags show before revealing verse content for context
- Mobile-friendly wrapping ensures readability on all screen sizes

### Previous: Search & UX Improvements ✅
**Status:** Complete  
**Completed:** January 6, 2025

#### 1. Empty State Message Fix ✅
Fixed confusing empty state message in verse list:
- **Problem**: "No verses yet..." showed even when verses existed but search returned no results
- **Solution**: Added `hasVersesButNoSearchResults` computed property
- **Implementation**: Two separate empty state divs with appropriate conditions
  - `verses.length === 0` → "No verses yet. Add your first verse to get started!"
  - `hasVersesButNoSearchResults` → "No verses match your search" with helpful hint
- **User Impact**: Clear feedback distinguishes between empty database vs. no search results

#### 2. Unicode-Insensitive Search ✅
Improved search to handle accented characters:
- **Problem**: Searching "senor" wouldn't match "señor"
- **Solution**: Added `normalizeForSearch()` method using Unicode normalization
- **Implementation**: 
  - Uses `normalize('NFD')` to decompose accented characters
  - Removes diacritical marks with regex `/[\u0300-\u036f]/g`
  - Applied to both search query and verse content/reference
- **Examples**: "senor" matches "señor", "cafe" matches "café", "naive" matches "naïve"
- **User Impact**: More forgiving search that works across languages and character sets

### Previous: UI Enhancements & Sync Optimization ✅
**Status:** Complete  
**Completed:** January 6, 2025

#### 1. Started Date Field Implementation ✅
Added `startedAt` field to verse forms with proper timezone handling:
- **Add Verse Form**: Date picker defaults to today
- **Edit Verse Modal**: Shows current `startedAt` or falls back to `createdAt`
- **Additional Fields**: Added `reviewCat` dropdown and `favorite` checkbox to edit modal
- **Helper Functions**: `getTodayMidnight()`, `dateToMidnightEpoch()`, `epochToDateString()`
- **Timezone Fix**: Changed from UTC to local time to prevent date decrement bug

#### 2. Smart Adaptive Sync Implementation ✅
Completely redesigned sync strategy for optimal performance:

**Problem Solved:**
- Duplicate sync calls from multiple `scheduleSync()` invocations
- Long delays before changes were pushed to server
- Inefficient fixed-interval polling

**Solution Implemented:**
- **1-second check interval** - Constantly monitors outbox
- **Immediate push** - Syncs within 1 second when outbox has data
- **30-second periodic sync** - Counter-based idle sync for pulling remote changes
- **Guard flag** - Prevents duplicate sync schedules
- **UI reload** - Automatically refreshes verses and stats after sync

**Sync Behavior:**
```typescript
// Check every 1 second
if (outboxCount > 0) {
  // Immediate sync when there's pending data
  syncAndReload();
  syncCounter = 0;
} else {
  // Increment counter for periodic sync
  syncCounter++;
  if (syncCounter >= 30) {
    // Periodic sync every 30 seconds when idle
    syncAndReload();
    syncCounter = 0;
  }
}
```

**Benefits:**
- ✅ Fast response (1 second) to local changes
- ✅ Simple, predictable logic
- ✅ Efficient (no unnecessary syncs)
- ✅ Self-managing (adapts to activity level)
- ✅ UI always up-to-date

### Previous: Authentication UI Implementation ✅
**Status:** Implementation Complete with UI Refinements  
**Completed:** January 6, 2025

### What We Built
Implemented **optional authentication with smart prompts** - a truly offline-first approach where:
- ✅ App works fully without authentication (local-only mode)
- ✅ Users can add/edit/review verses immediately without signup
- ✅ Auth banner encourages signup for multi-device sync
- ✅ Seamless data migration when user signs up
- ✅ Authentication is a feature, not a requirement

### Implementation Completed
**Phase 1: Core Auth Infrastructure** ✅
- Added authentication state management to app.ts
- Modified sync to only run when authenticated
- Added auth check on app initialization
- Wired up login/register/logout functions
- Implemented data migration logic
- Added `showUserMenu` state for dropdown

**Phase 2: UI Components** ✅
- Built auth banner (anonymous and authenticated states)
- Built auth modal with login/register toggle
- Added form validation and error handling
- Added loading states and transitions
- Styled with glass-morphism design

**Phase 3: UI Refinements** ✅
- Redesigned anonymous banner (full-width, compact ~40-50px)
- Replaced authenticated banner with user avatar menu
- User avatar (👤 emoji) in header top-right
- Dropdown menu with email display and logout
- Fixed component scope issues
- Removed duplicate header

**Bug Fixes:** ✅
1. API routing issue (removed .php extensions from client URLs)
2. Component scope issue (properly configured Vue app mounting)
3. Duplicate header issue (consolidated to single header)
4. User menu positioning (fixed to header area)

### Next Immediate Steps
1. ✅ Complete authentication implementation
2. ✅ Fix API routing issue
3. ✅ Refine UI based on user feedback
4. ⏳ Test authentication flows (user testing in progress)
5. ⏳ Fix any bugs discovered during testing

### Documentation Status
**All documentation cleanup complete!** ✅
- All 9 memory bank files created and current
- New: `authentication-implementation-plan.md` added
- Root README updated to reference memory bank
- Examples folder contains only reference implementations

## Active Decisions and Considerations

### Data Model Patterns
- **Reference Format**: Users manually enter both `reference` (human-readable) and `refSort` (machine-sortable)
  - Format: `bible.BBCCCVVV` where BB=book, CCC=chapter, VVV=verse
  - Auto-parsing deferred to Phase 2
  
- **Multi-Paragraph Content**: Normalized to `\n` for line breaks
  - CSS uses `white-space: pre-wrap` for display
  - Trailing whitespace stripped, leading spaces preserved
  
- **Tags**: Comma-separated input, structured array storage
  - Format: `"fast.sk=3, ss=2010.Q2.W01, personal"`
  - Stored as: `[{key: "fast.sk", value: "3"}, ...]`

### Sync Strategy
- **OpLog Pattern**: All mutations create operation entries
- **LWW Conflict Resolution**: Server timestamp (`ts_server`) is source of truth
- **Cursor-Based Pagination**: 500 operations per batch
- **Automatic Sync**: Every 60 seconds + on reconnect + on visibility change

### Review Algorithm
- **Thresholds**: Clean intervals (7, 56, 112 days)
- **Probability**: Calculated per-session (not per-day)
  - Weekly: 1-in-7 chance
  - Monthly: 1-in-30 chance
- **Categories**: auto, future, learn, daily, weekly, monthly

## Important Patterns and Preferences

### Code Organization
- **Separation of Concerns**: db.ts → actions.ts → sync.ts → app.ts
- **TypeScript Strict Mode**: All code type-safe
- **Functional Style**: Pure functions where possible
- **Error Handling**: Try-catch with user-friendly messages

### UI/UX Patterns
- **Glass Morphism**: Backdrop blur with semi-transparent backgrounds
- **Gradient Buttons**: Smooth hover effects with lift animation
- **Tab Navigation**: Clear active state indicators
- **Offline Indicator**: Subtle banner when disconnected
- **Loading States**: Minimal spinners, instant feedback

### Development Workflow
- **Vite Dev Server**: HMR for fast development
- **TypeScript First**: Compile-time error catching
- **Manual Testing**: Comprehensive checklist approach
- **Incremental Builds**: Test each layer before moving on

## Learnings and Project Insights

### What Works Well
1. **OpLog Pattern**: Provides complete audit trail and reliable sync
2. **IndexedDB**: Unlimited storage enables true offline-first
3. **Vue.js 3**: Component-based architecture with excellent TypeScript integration
4. **Tailwind CSS**: Rapid UI development with utility classes
5. **TypeScript**: Catches bugs early, improves maintainability

### What Needs Improvement
1. **Bundle Size**: Tailwind CSS from CDN is 3.5MB (will optimize in Phase 2)
2. **Testing**: No automated tests yet (manual testing only)
3. **Error Messages**: Could be more user-friendly
4. **Performance**: No pagination on verse list (could be slow with 1000+ verses)

### Key Technical Decisions
1. **SQLite Only**: Simpler than supporting multiple databases
2. **Token-Based Auth**: Simpler than JWT for personal app
3. **CDN Dependencies**: Faster initial setup, will bundle later
4. **Manual Testing**: Faster to MVP, will add automated tests later

### Architecture Insights
1. **Offline-First is Critical**: Users expect app to work anywhere
2. **Sync is Complex**: OpLog pattern handles edge cases well
3. **LWW is Simple**: Works well for personal apps, no user confusion
4. **Cursor Pagination**: Essential for scaling to large datasets

## Current Challenges

### Technical Debt
- No automated tests (manual testing only)
- Large bundle size (Tailwind CSS not purged)
- No pagination on verse list
- Some TypeScript `any` types remain

### Future Considerations
- **Phase 2 Features**: Multiple review modes, keyboard shortcuts, statistics
- **Performance**: Bundle optimization, lazy loading, virtual scrolling
- **Testing**: Add unit tests, integration tests, E2E tests
- **Accessibility**: ARIA labels, keyboard navigation improvements

## Development Environment

### Current Setup
- **Node.js**: 18+
- **PHP**: 8.0+
- **Database**: SQLite 3.x
- **Editor**: Cursor/VSCode
- **Browser**: Chrome/Firefox for testing

### Active Servers
- **Frontend Dev**: `npm run dev` at localhost:5173
- **Backend**: `php -S localhost:8000 router.php`
- **Database**: `server/api/db.sqlite`

## Quick Reference

### Common Commands
```bash
# Frontend
cd client && npm run dev        # Dev server with HMR
cd client && npm run build      # Production build

# Backend
cd server && php api/migrate.php              # Setup database
cd server/public && php -S localhost:8000 router.php  # Start server

# Database
sqlite3 server/api/db.sqlite    # Open database
rm server/api/db.sqlite && php api/migrate.php  # Reset
```

### Key Files
- `client/src/db.ts` - Dexie schema (7 tables)
- `client/src/actions.ts` - CRUD operations
- `client/src/sync.ts` - Push/pull sync
- `client/src/App.vue` - Vue.js 3 Single File Component
- `client/src/app.ts` - Composition API logic
- `client/src/main.ts` - Vue app initialization
- `server/api/lib.php` - Shared PHP functions
- `server/schema.sql` - Database schema

### API Endpoints
- `POST /api/register` - User registration
- `POST /api/login` - User login
- `POST /api/logout` - Token revocation
- `POST /api/push` - Push operations
- `GET /api/pull?since={cursor}` - Pull operations

## Notes for Future Work

### Phase 2 Priorities
1. Multiple review modes (hints, first letters, flashcards)
2. Keyboard shortcuts for power users
3. Statistics dashboard with charts
4. Bundle optimization (purge Tailwind CSS)
5. Sort options for verse list

### Phase 3 Ideas
1. PWA manifest and service worker
2. Push notifications for review reminders
3. Meditation/application prompts
4. Social features (share verses)
5. Audio playback for verses

### Technical Improvements
1. Add automated testing (Vitest + Playwright)
2. Implement virtual scrolling for large lists
3. Add error boundary components
4. Improve accessibility (ARIA, keyboard nav)
5. Add internationalization (i18n)
