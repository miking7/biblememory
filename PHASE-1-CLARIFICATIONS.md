# Phase 1 Implementation - Clarifications Needed

## Executive Summary

After thoroughly reviewing the integration specification and all three reference examples (legacy Laravel app, SPA demo, and oplog starter), I've identified several areas that need clarification before we can confidently implement Phase 1 of the migration.

---

## 1. Data Model Decisions

### 1.1 Reference Format Implementation

**Issue**: The spec defines both human-readable and machine-sortable formats, but implementation details need clarification.

**Questions**:
- Should we implement the full 66-book mapping table now, or start with a subset?
- How do we handle verse ranges (e.g., "Hebrews 10:24-25") in the `refSort` field?
  - Store only the first verse? (e.g., `bible.58010024`)
  - Store a range indicator? (e.g., `bible.58010024-58010025`)
- How do we handle chapter-only references (e.g., "Psalm 23")?
  - Use verse 001 as default? (e.g., `bible.19023001`)
  - Use a special indicator? (e.g., `bible.19023000`)

**Recommendation**: 
- Implement full 66-book mapping from the start (it's a fixed list)
- For ranges, store the first verse number only
- For chapters, use verse 001 as the reference point
- Create a utility function to parse human format → machine format

### 1.2 Multi-Paragraph Content Storage

**Issue**: The legacy app uses `\n` for line breaks, but the spec mentions both `\n` and avoiding the `↵` character.

**Questions**:
- Should we normalize all line breaks to `\n` on input?
- How do we handle content pasted from different sources (Windows `\r\n`, Mac `\r`, Unix `\n`)?
- Should we preserve or strip leading/trailing whitespace?
- How do we handle multiple consecutive line breaks?

**Recommendation**:
- Normalize all line breaks to `\n` on save
- Strip trailing whitespace from each line
- Preserve leading spaces for indentation
- Collapse multiple consecutive `\n` to maximum of 2 (paragraph break)

### 1.3 Tags Structure Migration

**Issue**: Legacy app uses comma-separated strings with `=` for values. New spec uses structured array.

**Questions**:
- Do we need to support importing legacy tag format?
- Should we validate tag keys (alphanumeric + dots/hyphens only)?
- Maximum length for tag keys and values?
- Case sensitivity for tag keys?

**Recommendation**:
- Implement parser for legacy format: `parseLegacyTags(string) → Array<{key, value}>`
- Tag keys: lowercase, alphanumeric + dots/hyphens, max 50 chars
- Tag values: any string, max 100 chars
- Case-insensitive matching for tag keys

---

## 2. Review Algorithm Specifics

### 2.1 Spaced Repetition Thresholds

**Issue**: The spec mentions different day counts than the legacy app in some places.

**Legacy App**:
- Learn: < 7 days (actually < 8 days based on code: `cDaysLearn = 7+1`)
- Daily: 7-56 days (8 weeks)
- Weekly: 56-112 days (8 more weeks)
- Monthly: 112+ days

**Spec**:
- Learn: < 7 days
- Daily: 7-56 days
- Weekly: 56-112 days
- Monthly: 112+ days

**Questions**:
- Should we use the legacy app's `7+1` pattern or the spec's `7`?
- Is the off-by-one intentional or a bug?

**Recommendation**: Use the spec's cleaner thresholds (7, 56, 112) unless there's a specific reason for the +1.

### 2.2 Review Selection Probability

**Issue**: Weekly and monthly reviews use probability-based selection.

**Questions**:
- Should probability be calculated per review session or per day?
- If a verse "loses" the probability roll, when is it checked again?
- Should we guarantee at least one weekly/monthly verse per session?

**Recommendation**:
- Calculate probability once per day (not per session)
- Store daily "selected for review" flag to avoid re-rolling
- Don't guarantee minimum - let probability work naturally

### 2.3 Manual Review Category Override

**Issue**: Legacy app shows manual overrides in red, but behavior isn't fully specified.

**Questions**:
- Can users manually set any category (f/l/d/w/m)?
- Does manual override persist forever or reset after some condition?
- Should we track when the override was set?
- Can users revert to "auto" mode?

**Recommendation**:
- Allow manual setting of any category
- Add `reviewCatSetAt` timestamp field
- Add UI to revert to "auto"
- Show manual overrides with visual indicator

---

## 3. Sync Implementation Details

### 3.1 Initial Sync Strategy

**Issue**: When a user first logs in on a new device, how do we handle the initial sync?

**Questions**:
- Should we pull all historical operations or just current state?
- What if a user has thousands of reviews - do we sync them all?
- Should we have a "full state" endpoint for initial sync?

**Recommendation**:
- For MVP: Pull all operations (cursor=0)
- Add pagination if operation count > 1000
- Consider adding `/api/state` endpoint that returns derived current state for faster initial sync

### 3.2 Conflict Resolution Edge Cases

**Issue**: LWW (Last-Write-Wins) is specified, but edge cases need clarification.

**Questions**:
- What if two devices edit the same verse offline with identical timestamps?
- Should we use `ts_server` or `ts_client` for LWW comparison?
- How do we handle clock skew between devices?

**Recommendation**:
- Always use `ts_server` for LWW (server is source of truth)
- If `ts_server` is identical, use `op_id` lexicographic comparison as tiebreaker
- Document that server time is authoritative

### 3.3 Offline Operation Limits

**Issue**: Spec mentions 1000 operation limit for outbox, but behavior when exceeded isn't specified.

**Questions**:
- What happens when outbox reaches 1000 operations?
- Should we block new operations or drop old ones?
- Should we warn the user?

**Recommendation**:
- Allow outbox to grow beyond 1000 (IndexedDB has plenty of space)
- Show warning if outbox > 500 operations
- Show error if outbox > 2000 operations (likely sync issue)
- Provide "force sync" button in settings

---

## 4. Authentication & Security

### 4.1 Token Generation

**Issue**: Spec mentions 64-char hex token but doesn't specify generation details.

**Questions**:
- Should we use PHP's `random_bytes(32)` → `bin2hex()`?
- Should tokens be cryptographically secure random?
- Should we hash tokens before storing in database?

**Recommendation**:
- Use `random_bytes(32)` → `bin2hex()` for 64-char hex
- Store tokens hashed with `password_hash()` in database
- Send plain token to client only once (on login/register)
- Client stores plain token in IndexedDB

### 4.2 Password Requirements

**Issue**: No password requirements specified.

**Questions**:
- Minimum password length?
- Complexity requirements?
- Should we use bcrypt, argon2, or other?

**Recommendation**:
- Minimum 8 characters (no maximum)
- No complexity requirements (let users choose)
- Use `password_hash()` with PASSWORD_DEFAULT (currently bcrypt)
- Consider argon2 if available

### 4.3 Registration Flow

**Issue**: Spec mentions registration endpoint but no validation details.

**Questions**:
- Email validation (format only or verification required)?
- Duplicate email handling?
- Rate limiting on registration?
- Should we auto-login after registration?

**Recommendation**:
- Email format validation only (no verification for MVP)
- Return error on duplicate email
- No rate limiting for MVP (add later if needed)
- Auto-login after registration (return token immediately)

---

## 5. UI/UX Decisions

### 5.1 Keyboard Shortcuts

**Issue**: Legacy app has extensive keyboard shortcuts, but which ones are essential for MVP?

**Legacy shortcuts**:
- `n` - next verse
- `p` - previous verse
- `Space` - advance (reveal or next)
- `h` - add hint
- `f` - show first letters
- `s` - save data
- `l` - load data
- `1/2/3` - switch tabs

**Questions**:
- Which shortcuts are essential for Phase 1?
- Should shortcuts work globally or only in review mode?
- How do we handle conflicts with browser shortcuts?

**Recommendation for Phase 1**:
- Review mode only: `Space` (advance), `n` (next), `p` (prev)
- Global: `/` (focus search), `Escape` (close modals)
- Add more shortcuts in Phase 2

### 5.2 Mobile Optimization

**Issue**: Spec mentions mobile-first design but specific touch gestures aren't defined.

**Questions**:
- Should we support swipe gestures (left/right for prev/next)?
- Tap vs long-press behaviors?
- Should keyboard shortcuts work on mobile (external keyboard)?

**Recommendation for Phase 1**:
- No swipe gestures (add in Phase 2)
- Simple tap interactions only
- Keyboard shortcuts work if keyboard present
- Focus on responsive layout first

### 5.3 Verse List Sorting

**Issue**: Legacy app has sorting capability, but default sort isn't specified.

**Questions**:
- Default sort order (by reference, by date added, by review frequency)?
- Should sort preference be saved?
- Should we support multiple sort options?

**Recommendation for Phase 1**:
- Default sort: by `refSort` (biblical order)
- Add sort dropdown: Reference, Date Added, Last Reviewed
- Save sort preference in settings

---

## 6. Data Migration Strategy

### 6.1 Legacy Data Import

**Issue**: Users have existing data in the legacy Laravel app.

**Questions**:
- Should we provide a migration script or manual export/import?
- What format should the export be (JSON, CSV, SQL)?
- How do we handle data that doesn't map cleanly (e.g., old tag format)?
- Should we migrate review history or just current verses?

**Recommendation**:
- Create export script for legacy app: `/admin/export-json`
- Export format: JSON matching new schema
- Transform tags from comma-separated to structured array
- Include all verses but only recent reviews (last 90 days)
- Provide import function in new app

### 6.2 Sample Data

**Issue**: The `examples/legacy-data/sample.csv` exists but format isn't documented.

**Questions**:
- What's the structure of the sample CSV?
- Should we create a CSV import function?
- Is this for testing or actual user migration?

**Recommendation**:
- Examine the sample.csv structure
- Create CSV import function for testing
- Document CSV format for users who want to bulk import

---

## 7. Development Environment

### 7.1 Local Development Setup

**Issue**: Need to clarify the development workflow.

**Questions**:
- Should we use Docker for consistent environment?
- What's the recommended local server (MAMP, XAMPP, Laravel Valet, built-in PHP server)?
- Should we use SQLite or MySQL for development?
- How do we handle CORS during development?

**Recommendation**:
- Use built-in PHP server for simplicity: `php -S localhost:8000`
- SQLite for development (easier setup)
- Vite dev server for frontend with proxy to PHP backend
- Document setup in README

### 7.2 Build Process

**Issue**: Spec mentions Vite but build configuration isn't specified.

**Questions**:
- Should we bundle Alpine.js or use CDN?
- Should we bundle Tailwind or use CDN?
- TypeScript compilation settings?
- Should we have separate dev/prod builds?

**Recommendation for Phase 1**:
- Use CDN for Alpine.js and Tailwind (like SPA demo)
- TypeScript compiled to ES6 modules
- Vite for dev server and TypeScript compilation only
- Add proper bundling in Phase 2

---

## 8. Testing Strategy

### 8.1 Testing Scope for Phase 1

**Issue**: Spec mentions testing but doesn't specify what to test in Phase 1.

**Questions**:
- Should we write tests before or during implementation?
- What testing framework (Jest, Vitest, PHPUnit)?
- What's the minimum test coverage for Phase 1?
- Should we test sync logic, review algorithm, or both?

**Recommendation for Phase 1**:
- Manual testing only (no automated tests yet)
- Create test checklist document
- Add automated tests in Phase 2
- Focus testing on: sync logic, review algorithm, data integrity

### 8.2 Test Data

**Issue**: Need test data for development and testing.

**Questions**:
- Should we create a seed script?
- How many test verses?
- Should we include various edge cases (long verses, multi-paragraph, special characters)?

**Recommendation**:
- Create seed script: `api/seed.php`
- Include 20-30 test verses covering:
  - Single verse references
  - Verse ranges
  - Multi-paragraph content
  - Various translations
  - Different review categories
  - Various tag patterns

---

## 9. Deployment Considerations

### 9.1 Hosting Requirements

**Issue**: Spec mentions deployment options but doesn't specify requirements.

**Questions**:
- Minimum PHP version (7.4, 8.0, 8.1)?
- Required PHP extensions?
- Web server configuration (Apache .htaccess, Nginx config)?
- HTTPS requirement for production?

**Recommendation**:
- Minimum PHP 8.0
- Required extensions: PDO, SQLite3 (or MySQL), JSON
- Provide both Apache .htaccess and Nginx config
- HTTPS required for production (document in README)

### 9.2 Database Setup

**Issue**: Migration script exists but production setup isn't documented.

**Questions**:
- Should we use SQLite or MySQL in production?
- How do we handle database backups?
- Should we version the database schema?
- How do we handle schema migrations?

**Recommendation for Phase 1**:
- Support both SQLite and MySQL
- SQLite for single-user/small deployments
- MySQL for multi-user deployments
- Document backup procedures
- Add schema version tracking in Phase 2

---

## 10. Feature Scope Clarifications

### 10.1 Phase 1 Feature List

**Issue**: Need to confirm exact feature scope for Phase 1 MVP.

**Confirmed for Phase 1** (from spec):
- ✅ Verse CRUD (add, edit, delete, list)
- ✅ Basic review mode (reference → content)
- ✅ Spaced repetition algorithm
- ✅ Offline-first with IndexedDB
- ✅ Sync with server (push/pull)
- ✅ Search/filter verses
- ✅ Import/export JSON
- ✅ Modern UI (Tailwind + Alpine)

**Questions about Phase 1**:
- Should we include tags in Phase 1 or defer to Phase 2?
- Should we include translation field in Phase 1?
- Should we include favorite flag in Phase 1?
- Should we include the meditation/application prompts in Phase 1?

**Recommendation**:
- Include tags (essential for organization)
- Include translation (simple field, useful)
- Include favorite (simple flag, useful)
- Defer meditation/application prompts to Phase 2

### 10.2 Review Modes for Phase 1

**Issue**: Legacy app has 4 review modes, but Phase 1 spec only mentions basic mode.

**Legacy modes**:
1. Reference mode (show reference, hide content)
2. Hints mode (progressive word revelation)
3. First letters mode (show first letter of each word)
4. Flash cards mode (random word hiding)

**Questions**:
- Should Phase 1 include only reference mode?
- Or should we include all modes from the start?

**Recommendation**:
- Phase 1: Reference mode only (show reference, click to reveal content)
- Phase 2: Add hints, first letters, and flash cards
- Reason: Simpler implementation, faster to MVP

---

## 11. Code Organization

### 11.1 File Structure

**Issue**: Need to finalize the project structure.

**Proposed structure**:
```
bible-memory/
├── client/
│   ├── src/
│   │   ├── db.ts
│   │   ├── sync.ts
│   │   ├── actions.ts
│   │   ├── review.ts
│   │   ├── utils.ts
│   │   └── types.ts
│   ├── public/
│   │   └── index.html
│   ├── package.json
│   └── vite.config.ts
├── server/
│   ├── api/
│   │   ├── bootstrap.php
│   │   ├── lib.php
│   │   ├── auth.php
│   │   ├── push.php
│   │   ├── pull.php
│   │   ├── state.php
│   │   └── migrate.php
│   ├── schema.sql
│   └── .htaccess
└── README.md
```

**Questions**:
- Should we separate auth endpoints (register.php, login.php, logout.php)?
- Should we have a shared config file?
- Where should we put utility functions (reference parsing, etc.)?

**Recommendation**:
- Keep auth in separate files for clarity
- Create `config.php` for database connection and settings
- Put utility functions in `lib.php` or create `utils.php`

### 11.2 TypeScript Configuration

**Issue**: Need to specify TypeScript settings.

**Questions**:
- Target ES version (ES6, ES2020, ESNext)?
- Module system (ES modules, CommonJS)?
- Strict mode enabled?
- Should we use path aliases?

**Recommendation**:
- Target ES2020 (good browser support)
- ES modules (native browser support)
- Strict mode enabled
- No path aliases for Phase 1 (keep it simple)

---

## 12. Documentation Needs

### 12.1 User Documentation

**Issue**: Need to determine what documentation to create.

**Questions**:
- Should we create user guide?
- Should we create video tutorials?
- Should we have in-app help?

**Recommendation for Phase 1**:
- README with setup instructions
- Brief user guide (markdown file)
- No video tutorials yet
- Tooltips for key features in app

### 12.2 Developer Documentation

**Issue**: Need to document for future developers.

**Questions**:
- Should we document the sync protocol?
- Should we document the review algorithm?
- Should we create API documentation?

**Recommendation for Phase 1**:
- Document sync protocol (critical for understanding)
- Document review algorithm (critical for understanding)
- Create API documentation (simple markdown)
- Add inline code comments for complex logic

---

## Summary of Critical Decisions Needed

Before starting Phase 1 implementation, we need decisions on:

### High Priority (Blocking)
1. **Reference format handling** - How to handle ranges and chapters
2. **Review algorithm thresholds** - Use 7 or 7+1 pattern?
3. **Token storage** - Hash tokens in database or store plain?
4. **Phase 1 feature scope** - Include tags, translation, favorite?
5. **Review modes** - Reference mode only or all modes?

### Medium Priority (Can decide during implementation)
6. **Multi-paragraph normalization** - Exact rules for line breaks
7. **Tag validation** - Rules for tag keys and values
8. **Keyboard shortcuts** - Which ones for Phase 1?
9. **Sort options** - Default sort and available options
10. **Build process** - CDN vs bundled dependencies

### Low Priority (Can defer)
11. **Testing strategy** - Manual vs automated for Phase 1
12. **Documentation scope** - How detailed for Phase 1?
13. **Deployment details** - Can document as we deploy
14. **Mobile gestures** - Can add in Phase 2

---

## Recommended Next Steps

1. **Review this document** and make decisions on high-priority items
2. **Create a detailed Phase 1 task list** based on confirmed decisions
3. **Set up development environment** with agreed-upon tools
4. **Create a prototype** of the core sync mechanism (most critical)
5. **Implement features iteratively** starting with verse CRUD
6. **Test thoroughly** with manual testing checklist
7. **Deploy to staging** for user testing
8. **Gather feedback** before moving to Phase 2

---

## Questions for You

To move forward efficiently, please provide guidance on:

1. **Reference format**: Should we implement the full book mapping now, and how should we handle verse ranges?
2. **Phase 1 scope**: Should we include tags, translation, and favorite fields in Phase 1?
3. **Review modes**: Reference mode only, or all four modes in Phase 1?
4. **Authentication**: Should we hash tokens in the database for security?
5. **Development setup**: Any preference for local development environment?
6. **Timeline**: What's the target timeline for Phase 1 completion?

Once we have clarity on these points, we can proceed confidently with implementation.
