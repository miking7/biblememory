# Active Context

## Current Work Focus

### Recent Completion: Memory Bank Initialization
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
- ✅ Beautiful UI (Tailwind CSS v4 + Alpine.js)
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

### Active Task: Authentication UI Implementation
**Status:** Planning Complete, Ready to Implement  
**Started:** January 6, 2025

### What We're Building
Implementing **optional authentication with smart prompts** - a truly offline-first approach where:
- App works fully without authentication (local-only mode)
- Users can add/edit/review verses immediately without signup
- Strategic prompts encourage signup for multi-device sync
- Seamless data migration when user signs up
- Authentication becomes a feature, not a requirement

### Implementation Plan Created
Created comprehensive plan in `authentication-implementation-plan.md` covering:
- User experience flows (anonymous and authenticated)
- UI components (auth banner, modal, prompts, account menu)
- Data migration strategy
- Technical implementation details
- Testing checklist
- 5-phase implementation order

### Next Immediate Steps
1. ✅ Create implementation plan document
2. ✅ Update activeContext.md with current work
3. ⏳ Update progress.md with Phase 1.5 tasks
4. ⏳ Begin Phase 1: Core Auth Infrastructure
   - Add authentication state to app.ts
   - Add auth modal HTML to index.html
   - Wire up login/register functions
   - Add logout functionality
   - Test basic auth flow

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
3. **Alpine.js**: Lightweight reactivity without framework overhead
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
- `client/src/app.ts` - Alpine.js component
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
4. Bundle optimization (purge Tailwind, bundle Alpine)
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
