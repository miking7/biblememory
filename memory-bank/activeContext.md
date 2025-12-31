# Active Context

<!--
MAINTENANCE PRINCIPLES (from .clinerules):
- This file tracks ONLY current work - what we're working on RIGHT NOW
- Keep this file under 200 lines
- ALL completed work must be archived to previous-work/ with numeric filenames (001-999)
- Maintain COMPLETE chronological index below with links to all archived work
- Previous work files are NOT auto-loaded - only read when specifically relevant to current task
- No code duplication - reference actual code files instead
- High-level only - document decisions and "why", not implementation details

KEY QUESTION THIS FILE ANSWERS: "What am I working on in this session?"
-->

## Current Work Focus

**Status:** Phase 1 Complete - Planning Phase 2 Implementation

**Current State:**
- Modern app provides basic memorization workflow (CRUD + simple review)
- Legacy app provides advanced features (Flash Cards, Hints, Meditation prompts)
- Users switch between apps via "Legacy..." button as needed
- Memory bank aligned with actual project state

**Next Phase:** Enhanced Review Modes (Phase 2)
- Flash Cards mode (5 difficulty levels)
- First Letters mode
- Progressive Hints mode
- Keyboard shortcuts (n/p/h/f/Space)

**See [progress.md](progress.md) for complete roadmap and feature parity status.**

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
1. **Review Modes**: Only basic reveal mode (need Flash Cards, Hints, First Letters)
2. **Keyboard Shortcuts**: No keyboard navigation yet (planned Phase 2)
3. **Testing**: No automated tests yet (manual testing only)
4. **Error Messages**: Could be more user-friendly
5. **Performance**: No pagination on verse list (could be slow with 1000+ verses)

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
5. **Legacy Integration**: One-way data bridge works well for gradual migration

## Legacy System Integration

### Current Architecture
**Purpose:** Provide feature bridge during modern app development

**Data Flow:**
1. Modern app maintains verses in IndexedDB (source of truth)
2. "Legacy..." button exports verses to localStorage (`allVerses`)
3. Legacy app reads from localStorage on load
4. Data transformation: camelCase → snake_case, epoch → YYYY-MM-DD
5. Legacy operates in read-only mode (changes don't sync back)

**Implementation:** `client/src/app.ts` `exportToLegacyAndOpen()` function

### Legacy App Capabilities
**Features Modern App Lacks:**
- 5 review modes (vs modern's 1): Reference, Content, Hints, First Letters, Flash Cards
- Meditation questions (structured reflection prompts)
- Application questions (4 life areas for practical integration)
- Keyboard shortcuts (n/p/h/f/Space)
- BibleGateway chapter lookup
- Human-readable time display

**Core Algorithm:** ✅ Same spaced repetition (8→56→112 days, probabilistic weekly/monthly)

### Integration Goal
- **Phase 2:** Implement essential review modes → reduce legacy dependency
- **Phase 3:** Add engagement tools → eliminate need for legacy button
- **Phase 4:** Surpass legacy with modern capabilities → remove legacy entirely

**Documentation:** See `legacy-features-inventory.md` for complete feature catalog

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

## Previous Work Index (Complete Archive)

<!-- 
IMPORTANT: Complete chronological index of all archived work (oldest first). 
Previous work files are NOT auto-loaded - only read when specifically relevant to current task.
This index provides titles and links for reference when needed.
-->

- **001** - Memory Bank Initialization → [previous-work/001_memory_bank_initialization.md](previous-work/001_memory_bank_initialization.md)
- **002** - Authentication UI Implementation → [previous-work/002_authentication_ui_implementation.md](previous-work/002_authentication_ui_implementation.md)
- **003** - UI Enhancements & Sync Optimization → [previous-work/003_ui_enhancements_sync_optimization.md](previous-work/003_ui_enhancements_sync_optimization.md)
- **004** - Search & UX Improvements → [previous-work/004_search_ux_improvements.md](previous-work/004_search_ux_improvements.md)
- **005** - Tag Display Feature → [previous-work/005_tag_display_feature.md](previous-work/005_tag_display_feature.md)
- **006** - Network Status Detection → [previous-work/006_network_status_detection.md](previous-work/006_network_status_detection.md)
- **007** - Tag Search Feature → [previous-work/007_tag_search_feature.md](previous-work/007_tag_search_feature.md)
- **008** - Smart Import Feature → [previous-work/008_smart_import_feature.md](previous-work/008_smart_import_feature.md)
- **009** - Vue 3 Composables Refactoring → [previous-work/009_vue3_composables_refactoring.md](previous-work/009_vue3_composables_refactoring.md)
- **010** - Laravel Herd + Vite Integration → [previous-work/010_laravel_herd_vite_integration.md](previous-work/010_laravel_herd_vite_integration.md)
- **011** - Sync Issues Indicator Fix → [previous-work/011_sync_issues_indicator_fix.md](previous-work/011_sync_issues_indicator_fix.md)
- **012** - Multiple Root DOM Nodes Fix → [previous-work/012_multiple_root_dom_nodes_fix.md](previous-work/012_multiple_root_dom_nodes_fix.md)
- **013** - v-show to v-if Optimization → [previous-work/013_v_show_to_v_if_optimization.md](previous-work/013_v_show_to_v_if_optimization.md)
- **014** - Legacy App Integration → [previous-work/014_legacy_app_integration.md](previous-work/014_legacy_app_integration.md)
- **015** - Legacy App Cleanup → [previous-work/015_legacy_app_cleanup.md](previous-work/015_legacy_app_cleanup.md)
- **016** - Root-Level npm Scripts → [previous-work/016_root_npm_scripts.md](previous-work/016_root_npm_scripts.md)
- **017** - Git Ignore Cleanup → [previous-work/017_gitignore_cleanup.md](previous-work/017_gitignore_cleanup.md)
- **018** - Legacy App Routing Fix → [previous-work/018_legacy_app_routing_fix.md](previous-work/018_legacy_app_routing_fix.md)
- **019** - Mobile-First Optimizations → [previous-work/019_mobile_first_optimizations.md](previous-work/019_mobile_first_optimizations.md)
