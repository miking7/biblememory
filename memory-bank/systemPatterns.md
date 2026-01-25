# System Patterns

<!--
MAINTENANCE PRINCIPLES (from .clinerules):
- Document architectural decisions, patterns, and "why" - NOT implementation details
- Focus on high-level architecture, flowcharts, and design patterns
- NO code duplication - reference actual code files instead of recreating code
- Exception: Tiny code snippets OK to demonstrate critical patterns
- Keep diagrams and visual representations - they're stable and valuable
- This file should help understand WHAT patterns are used and WHY, not HOW they're implemented

KEY QUESTION THIS FILE ANSWERS: "How is the system architectured and why?"
-->

## Architecture Overview

### High-Level Architecture

```
┌─────────────────────────────────────────┐
│         Client (Browser)                │
│  ┌─────────────────────────────────┐    │
│  │   Vue.js 3 SPA (App.vue)        │    │
│  │   - Tab navigation              │    │
│  │   - Reactive state management   │    │
│  │   - User interactions           │    │
│  └──────────┬──────────────────────┘    │
│             │                           │
│  ┌──────────▼──────────┐                │
│  │   main.ts/app.ts    │                │
│  │   - App logic       │                │
│  │   - Event handlers  │                │
│  └──────────┬──────────┘                │
│             │                           │
│  ┌──────────▼──────────┐                │
│  │   actions.ts        │                │
│  │   - CRUD operations │                │
│  │   - Business logic  │                │
│  │   - Queries         │                │
│  └──────────┬──────────┘                │
│             │                           │
│  ┌──────────▼──────────┐                │
│  │      db.ts          │                │
│  │   - Dexie schema    │                │
│  │   - IndexedDB       │                │
│  └──────────┬──────────┘                │
│             │                           │
│  ┌──────────▼──────────┐                │
│  │    sync.ts          │                │
│  │   - Push/pull       │                │
│  │   - Authentication  │                │
│  └──────────┬──────────┘                │
└─────────────┼───────────────────────────┘
              │ HTTP/JSON
              ▼
┌─────────────────────────────────────────┐
│         Server (PHP)                    │
│  ┌──────────────────────────────────┐   │
│  │   API Endpoints                  │   │
│  │   - register.php                 │   │
│  │   - login.php / logout.php       │   │
│  │   - push.php / pull.php          │   │
│  └──────────┬───────────────────────┘   │
│             │                           │
│  ┌──────────▼──────────┐                │
│  │      lib.php        │                │
│  │   - Shared functions│                │
│  │   - Auth helpers    │                │
│  │   - DB connection   │                │
│  └──────────┬──────────┘                │
│             │                           │
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
- All mutations create operation entries with unique IDs
- Operations stored locally in `outbox` table awaiting sync
- Operations pushed to server in batches (see `client/src/sync.ts`)
- Server stores operations in `ops` table with monotonic sequence numbers
- Clients pull operations using cursor-based pagination
- Current state derived from applying operation log

**Why This Pattern:**
- Complete audit trail of all changes
- Idempotent operations (safe to replay)
- Easy to debug sync issues
- Can reconstruct state at any point in time
- Handles offline scenarios gracefully

**Key Files:**
- `client/src/actions.ts` - Creates operations for mutations
- `client/src/sync.ts` - Push/pull logic
- `server/api/push.php` - Receives and stores operations
- `server/api/pull.php` - Returns operations with cursor

### 2. Last-Write-Wins (LWW) Conflict Resolution

**Purpose:** Resolve conflicts when same entity edited on multiple devices

**How It Works:**
- Server assigns `ts_server` timestamp to all operations (authoritative time)
- When applying operations, compare timestamps
- Operation with latest `ts_server` wins
- If timestamps identical, use `op_id` lexicographic comparison

**Why This Pattern:**
- Simple and predictable behavior
- No user intervention needed (seamless UX)
- Works well for personal apps (single user unlikely to edit same verse simultaneously)
- Server timestamp avoids client clock skew issues
- Server is source of truth for ordering

**Trade-offs Accepted:**
- Can lose edits if same verse edited on multiple devices (acceptable for personal use)
- Alternative patterns (CRDT, OT) add significant complexity for minimal benefit in this use case

**Implementation:** See `client/src/sync.ts` pull logic and `server/api/push.php` timestamp handling

### 3. Cursor-Based Pagination

**Purpose:** Efficiently sync large operation logs

**How It Works:**
- Server assigns monotonic sequence numbers to operations (`seq` in `ops` table)
- Client tracks last synced sequence in `sync` table
- Pull requests include `since` parameter with cursor
- Server returns operations after cursor + new cursor value
- Client updates cursor after successful application

**Why This Pattern:**
- Efficient for large datasets (only send new operations)
- Resumable sync after interruption
- No duplicate operations
- Scales well (constant query time regardless of history size)
- Simpler than time-based windowing (no timezone issues)

**Key Files:**
- `client/src/sync.ts` - Cursor storage and pull logic
- `server/api/pull.php` - Cursor-based query with LIMIT

### 4. Offline-First with Outbox Pattern

**Purpose:** Queue operations when offline, sync when online

**How It Works:**
- All mutations immediately write to local IndexedDB
- Operations also written to `outbox` table
- Periodic sync attempts to push outbox to server
- Successful operations removed from outbox
- Failed operations remain for retry with smart backoff

**Why This Pattern:**
- App fully functional offline (no degraded mode)
- No data loss (operations queued locally)
- Automatic sync when online (no user intervention)
- User doesn't need to think about connectivity
- Works with unreliable networks (mobile, airplane mode, etc.)

**Implementation:** See `client/src/actions.ts` (creates operations), `client/src/sync.ts` (syncs outbox)

### 5. Reactive State Management (Vue.js Composition API)

**Purpose:** Keep UI in sync with data changes

**How It Works:**
- Vue's Composition API provides reactive primitives (`ref()`, `reactive()`, `computed()`)
- State changes automatically trigger DOM updates via Virtual DOM diffing
- Event handlers modify state
- Computed properties derive from state
- Single File Components (.vue) with `<template>`, `<script>`, `<style>` sections

**Why Vue.js:**
- Full TypeScript integration (type-safe templates and logic)
- Composition API for better code organization than Options API
- Component-based architecture for scalability
- Excellent developer experience with Vue DevTools
- Access to Vue ecosystem (Router, Pinia, etc. for future)
- Smaller bundle size than React for similar functionality

**Key Files:**
- `client/src/app.ts` - Composition API setup function
- `client/src/App.vue` - Main Single File Component
- `client/src/main.ts` - Vue app initialization

### 6. Composables Pattern (Vue 3 Best Practice)

**Purpose:** Organize related logic into reusable, testable functions

**How It Works:**
- Extract related functionality into focused composable functions
- Each composable manages its own state and methods
- Composables imported and used in components or other composables
- Follow naming convention: `use{Feature}.ts`
- Return reactive state and methods for template binding

**Why This Pattern:**
- Better separation of concerns than monolithic setup
- Improved testability (composables can be tested in isolation)
- Easier to maintain (smaller, focused files)
- Reusable across components
- Clear dependencies between features
- Follows Vue 3 official best practices

**Current Composables:**
- `client/src/composables/useAuth.ts` - Authentication state and operations
- `client/src/composables/useVerses.ts` - Verse CRUD and filtering
- `client/src/composables/useReview.ts` - Review system logic, navigation, and animations
- `client/src/composables/useSync.ts` - Sync scheduling and status tracking
- `client/src/composables/useCardTransitions.ts` - Card animation primitives (used internally by useReview)
- `client/src/composables/useSwipeDetection.ts` - Touch gesture detection
- `client/src/app.ts` - Orchestrates composables (reduced from 694 to 141 lines)

### 7. Mobile-First Responsive Design Pattern

**Purpose:** Optimize user experience across all device sizes, prioritizing mobile

**Philosophy:**
- Design and build for mobile screens first (most constrained)
- Progressively enhance for larger screens
- Maximize screen real estate on mobile devices
- Maintain premium aesthetics on desktop

**Core Principles:**
- Base styles target mobile (no breakpoint prefix in Tailwind)
- Desktop styles added with `sm:` breakpoint prefix (640px+)
- Mobile constraints force UI simplicity and focus (good constraint)
- Desktop gets progressive enhancements

**Why This Approach:**
- Majority of users on mobile devices
- Easier to enhance simple design than simplify complex one
- Forces prioritization of essential features
- Responsive by default (no "mobile retrofitting")
- Better performance on mobile (no unused desktop styles)

**Key Design Conventions:**

**Spacing Philosophy:**
- Tighter padding/margins on mobile (maximize content area)
- Generous spacing on desktop (comfortable reading)
- Edge-to-edge containers on mobile where appropriate
- Sharp corners on mobile, rounded on desktop

**Typography Philosophy:**
- Scale down headings and body text on mobile
- Maintain readability at smaller sizes
- Larger touch-friendly text for interactive elements
- Desktop gets larger, more impactful typography

**Content Optimization:**
- Hide verbose labels on mobile to save space
- Stack layouts vertically on mobile
- Horizontal layouts on desktop
- Full-width modals on mobile

**Component Adaptation:**
- Larger touch targets on mobile (44x44px minimum - Apple guideline)
- Compact form controls
- Stacked navigation on mobile
- Responsive card layouts

**Example Pattern:** `text-2xl sm:text-3xl` - 2xl on mobile, 3xl on desktop (640px+)

**Implementation:** See `client/src/App.vue` and `client/src/components/VerseCard.vue`

### 8. Sync Status Tracking Pattern

**Purpose:** Provide accurate connectivity feedback based on actual network operations

**Problem Solved:**
- `navigator.onLine` unreliable across browsers (especially Safari)
- Doesn't detect server issues, DNS problems, or firewall issues
- False positives (shows "online" but can't reach server)
- Required browser-specific workarounds

**How It Works:**
- Track actual sync operation results in app state
- Properties: `lastSyncSuccess`, `lastSyncError`, `lastSyncAttempt`
- Computed property `hasSyncIssues` determines UI indicator visibility
- Only relevant for authenticated users (unauthenticated users see landing page, not app)

**Why This Pattern:**
- Works uniformly across all browsers (no special cases)
- Detects both network AND server connectivity issues
- More accurate user feedback (based on reality not browser API)
- Prevents unnecessary server load during outages
- Simpler code (no browser-specific workarounds)

**Smart Retry Logic:**
- Immediate sync (1 second) when last sync succeeded and outbox has data
- Backoff to 30 seconds when connectivity is failing (prevents server hammering)
- Automatic retry every 30 seconds during issues
- Immediate sync when connectivity restored

**Implementation:** See `client/src/composables/useSync.ts` and sync status tracking in `client/src/app.ts`

### 9. Progressive Web App (PWA) Pattern

**Purpose:** Enable app installation and offline access on mobile and desktop devices

**How It Works:**
- Vite PWA plugin auto-generates web app manifest and service worker during build
- Service worker precaches app shell (HTML, CSS, JS, fonts) for offline access
- Workbox manages caching strategies and service worker lifecycle
- Auto-update strategy automatically activates new versions
- Browser detects installability and shows native install prompt

**PWA Components:**
1. **Web App Manifest** (`manifest.webmanifest`) - Generated from vite.config.ts configuration
   - Defines app name, icons, theme colors, display mode
   - Enables "Add to Home Screen" functionality
   - Configured for standalone display (no browser UI)

2. **Service Worker** (`sw.js`) - Generated by Workbox
   - Precaches all app shell assets on first load
   - Serves cached assets when offline
   - Auto-updates when new version deployed
   - Disabled in dev mode (enabled in production only)

3. **App Icons** - Dual-source system for different purposes
   - **PWA icons** (from 1024px master): pwa-icon-192, pwa-icon-512 (Android), pwa-apple-touch-icon (iOS)
   - **Styled icons** (from 880px master): icon-192, icon-512 (social/README), favicons (browser tabs)
   - PWA icons optimized for home screen display (square, no transparency)
   - Styled icons preserve original artistic design (angled, with transparency)
   - Generated using Sharp with dual-source configuration

4. **PWA Meta Tags** - iOS and Android configurations
   - Theme color for Android status bar
   - Apple-specific meta tags for iOS standalone mode
   - Viewport settings for notched devices (viewport-fit=cover)

**Why This Pattern:**
- Modern web standard for installable apps
- No app store required (direct installation from web)
- Works across all platforms (Android, iOS, desktop)
- Automatic updates without user intervention
- Improved performance (cached app shell loads instantly)
- Better user engagement (home screen presence, standalone mode)

**Caching Strategy:**
- **App Shell**: Precache strategy (cached on first load, updated with new versions)
- **API Responses**: Not cached (app uses IndexedDB for offline data)
- **Static Assets**: Precache strategy (fonts, images, CSS, JS)
- **No Runtime Caching**: IndexedDB handles all data persistence

**Configuration Location:** `client/vite.config.ts`

**Auto-Update Flow:**
```
1. User visits app (service worker active)
   ↓
2. Service worker checks for updates in background
   ↓
3. New version available → Download and cache new assets
   ↓
4. Activate new service worker on next page load/refresh
   ↓
5. User gets latest version automatically
```

**Installation Flow:**
```
Desktop (Chrome/Edge):
1. User visits app over HTTPS
2. Browser detects manifest + service worker
3. Install icon appears in address bar
4. User clicks install → App added to OS

Android (Chrome):
1. User visits app over HTTPS
2. User engages with site
3. Browser shows "Add to Home Screen" prompt
4. User accepts → App added to home screen

iOS (Safari):
1. User visits app over HTTPS
2. User manually opens Share menu
3. User selects "Add to Home Screen"
4. App added to home screen with custom icon
```

**Why Auto-Update (not Prompt):**
- Simpler UX (no user decision required)
- Always latest version (security and bug fixes)
- Appropriate for personal app (not collaborative)
- Can add prompt later if needed

**Trade-offs Accepted:**
- No custom install prompt UI (relies on native browser prompts)
- No iOS splash screens (can add later)
- Auto-update without notification (could add update toast later)

**Implementation Files:**
- `client/vite.config.ts` - PWA plugin configuration
- `client/index.html` - PWA meta tags
- `client/public/icons/` - App icons (auto-generated from dual sources)
- `client/generate-icons.mjs` - Dual-source icon generation script
- Build output: `manifest.webmanifest`, `sw.js` (auto-generated)

**Future Enhancements:**
- Background Sync API for retry when connectivity restored
- Push notifications for review reminders
- iOS splash screens for better launch experience
- Update notification toast
- Share Target API for sharing verses to app

**See:** techContext.md for PWA technology details and configuration examples

### 10. Async External Resource Loading Pattern

**Purpose:** Prevent external stylesheet CDNs from blocking page rendering when offline

**Problem Solved:**
- External CSS files in `<head>` block page rendering until loaded or timeout
- When offline, DNS + connection timeouts = 30-60 second blank screen
- Service worker runtime caching can't intercept fast enough to prevent timeout

**How It Works:**
- Use `rel="preload"` instead of `rel="stylesheet"` for external CSS
- JavaScript onload handler converts preload to stylesheet when loaded
- If fetch fails (offline), page renders immediately with system fonts
- `<noscript>` fallback ensures accessibility for no-JavaScript browsers

**Implementation Example:**
```html
<!-- Non-blocking with preload pattern -->
<link rel="preload" as="style"
      href="https://fonts.googleapis.com/css2?family=Inter..."
      onload="this.onload=null;this.rel='stylesheet'">
<noscript><link rel="stylesheet" href="https://fonts.googleapis.com/..."></noscript>
```

**Why This Pattern:**
- ✅ Page renders IMMEDIATELY, even if external resources fail
- ✅ No 30-60 second timeout blocking render when offline
- ✅ Progressive enhancement (fonts load when available)
- ✅ Graceful degradation (system fonts used when offline)
- ✅ Works with existing service worker runtime caching
- ✅ Maintains accessibility with `<noscript>` fallback

**Trade-offs Accepted:**
- Brief flash of unstyled content (FOUC) when fonts load
- Requires JavaScript (fallback provided via `<noscript>`)
- External resources still fetched (but don't block render)

**Applied To:**
- Google Fonts (Inter font family)
- Material Design Icons CDN

**Implementation Files:**
- `client/index.html` lines 23-33 - Async stylesheet loading

**See:** previous-work/031_pwa_offline_blank_screen_fix.md for detailed analysis

### 11. Offline-First Sync Detection Pattern

**Purpose:** Prevent unnecessary network timeout attempts when user is offline

**Problem Solved:**
- Sync attempts when offline cause 30+ second timeouts
- Failed syncs show error messages even when intentionally offline
- Multiple sync triggers (startup, visibility change, periodic) compound delays
- User perception: "App is broken" when actually working fine offline

**How It Works:**
- Check `navigator.onLine` before attempting sync
- Skip sync entirely when offline (don't queue timeout)
- Set `lastSyncSuccess = true` when offline (no false errors)
- Add 5-second timeout for actual sync attempts (prevent long waits)
- Gracefully handle offline state without user-visible errors

**Implementation:**
```typescript
const syncAndReload = async () => {
  // Skip sync if offline
  if (!navigator.onLine) {
    console.log("Offline - skipping sync");
    lastSyncSuccess.value = true; // No error when intentionally offline
    return;
  }

  // Add timeout for actual sync attempts
  await Promise.race([
    syncNow(),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Sync timeout')), 5000)
    )
  ]);
};
```

**Why This Pattern:**
- ✅ No unnecessary network timeouts when offline
- ✅ Faster app startup when offline (immediate render)
- ✅ No false error messages for intentional offline use
- ✅ 5-second timeout prevents long freezes even with poor connectivity
- ✅ Works with existing OpLog sync architecture

**Trade-offs Accepted:**
- Relies on `navigator.onLine` (not 100% reliable but good enough)
- Doesn't distinguish between "no network" and "server down"
- Could miss sync opportunities if `navigator.onLine` is wrong

**Sync Triggers Affected:**
- Initial sync on app startup
- Periodic sync every 30 seconds
- Visibility change sync when tab becomes visible
- Outbox-triggered sync when pending operations exist

**Implementation Files:**
- `client/src/composables/useSync.ts` lines 34-68 - Offline detection and timeout

**See:** previous-work/031_pwa_offline_blank_screen_fix.md for detailed analysis

### 12. Toast Notification Pattern

**Purpose:** Provide temporary, non-intrusive notifications for status changes and user feedback

**Problem Solved:**
- Persistent banners take up screen space and distract users
- Users need awareness of status changes without constant visual noise
- Notifications should follow modern UX patterns (Google Docs, Slack, Notion)
- Need reusable infrastructure for various notification types

**How It Works:**
- Reactive state controls toast visibility (`showOfflineToast`)
- Watcher triggers toast on state changes
- Auto-dismiss timeout (5 seconds by default)
- Slide-in animation for visual polish
- Can be manually triggered (e.g., badge click)

**Implementation:**
```typescript
// State management
const showOfflineToast = ref(false);
let toastTimeout: ReturnType<typeof setTimeout> | null = null;

// Auto-dismiss function
const showToast = () => {
  if (toastTimeout) clearTimeout(toastTimeout); // Prevent multiple timeouts
  showOfflineToast.value = true;
  toastTimeout = setTimeout(() => {
    showOfflineToast.value = false;
    toastTimeout = null;
  }, 5000);
};

// Watch for state changes
watch(hasSyncIssuesWithAuth, (newValue, oldValue) => {
  if (oldValue !== undefined && newValue !== oldValue) {
    showToast(); // Only on actual changes, not initial load
  }
});
```

**Visual Design:**
- Fixed position (top-right corner by default)
- Slide-in animation from top
- Glass-morphism styling (matches app design language)
- Auto-dismisses after 5 seconds
- Can be extended with click-to-dismiss

**Why This Pattern:**
- ✅ Non-intrusive (temporary, auto-dismissing)
- ✅ Industry standard (familiar to users)
- ✅ Reusable infrastructure (can be used for success, error, info messages)
- ✅ Accessible (can add ARIA live region)
- ✅ Mobile-friendly (doesn't block important UI)

**Current Use Cases:**
1. **Offline Notification:** Shows when sync status changes (offline/online)
   - Message: "⚠️ Sync issues - currently offline. Changes saved locally."
   - Paired with persistent badge on User Menu for awareness

**Future Use Cases:**
- Success notifications (e.g., "✅ Verse added successfully")
- Sync status updates (e.g., "✅ Back online • Syncing changes...")
- Error messages (e.g., "⚠️ Failed to sync - will retry")
- Feature announcements (e.g., "✨ New review mode available")

**Companion Pattern: Badge Indicator**
- Small persistent indicator (10px red dot on User Menu)
- Shows when toast condition is still active
- Clickable to re-trigger toast
- Provides persistent awareness without distraction

**Trade-offs Accepted:**
- Toast can be missed if user not looking at screen (mitigated by persistent badge)
- No queue system for multiple toasts (simple single toast is sufficient for now)
- Auto-dismiss means user can't read at their own pace (can add click-to-dismiss later)

**Implementation Files:**
- `client/src/app.ts` lines 27-61 - Toast state and watch logic
- `client/src/App.vue` lines 31-34 - Toast component
- `client/src/styles.css` lines 228-254 - Toast styling with animations

**See:** previous-work/031_offline_notification_redesign.md for full implementation details

### 13. Unified Review Navigation Pattern

**Purpose:** Centralize navigation and animation logic within the review composable to eliminate duplication and awkward injection patterns

**Problem Solved:**
- 11 different navigation entry points with ~70% code duplication
- Each handler (buttons, swipes, keyboard) repeated guard checks, animations, and navigation logic
- Navigation logic spread across template where it was harder to maintain
- Completion screen didn't differentiate between daily and filtered review modes

**How It Works:**
- `useReview` composable manages `useCardTransitions` internally
- Single `navigate()` method handles all navigation with optional review recording
- Keyboard shortcuts call `navigate()` directly (no injection needed)
- All navigation triggers unified through clean, direct API

**Implementation:**
```typescript
// useReview manages transitions internally:
const review = useReview(cardElement);

// All handlers use review.navigate() directly:
const handleGotIt = () => review.navigate({
  direction: 'next',
  recordReview: true  // Optional: records "got it" review
});

const handlePreviousClick = () => review.navigate({
  direction: 'previous'
});
```

**Key Features:**
1. **Unified Entry Point:** Single `navigate()` method on review composable
2. **Guard Logic:** Checks transition state and boundary conditions
3. **Animation Coordination:** Sequences exit → navigation → entry animations
4. **Review Recording:** Optional parameter integrates review tracking
5. **Boundary Handling:** Explicit completion state for last card
6. **No Injection:** Keyboard shortcuts call navigate() directly

**Navigation Flow:**
```
1. Guard checks (is transitioning? at boundary?)
   ↓
2. Record review (optional, with visual feedback)
   ↓
3. Exit animation (card slides out)
   ↓
4. Navigate (update index, handle completion)
   ↓
5. Entry animation (new card slides in)
   OR show completion screen
```

**Why This Pattern:**
- ✅ **Simple architecture:** Clean 2-layer design (App.vue → useReview)
- ✅ **No coordination overhead:** Keyboard shortcuts call navigate() directly
- ✅ **Single responsibility:** Review owns all review-related logic including navigation
- ✅ **Less indirection:** Direct call chain without callbacks
- ✅ **Navigation IS review logic:** Colocated where it belongs
- ✅ **~192 lines eliminated:** Removed duplicated handler code

**Architecture:**
```
App.vue → useReview (owns transitions internally)
```

**Integration Points:**
- Button clicks → `review.navigate()`
- Swipe gestures → `review.navigate()`
- Keyboard shortcuts → `review.navigate()` (direct, no injection)
- Review buttons → `review.navigate({ recordReview: true/false })`
- Completion screen → `review.viewLastCard()`
- Card click → `review.navigate({ recordReview: true })`

**Trade-offs Accepted:**
- Review composable is larger (~800 lines vs ~700 before)
- Transitions tightly coupled to review (acceptable - only used in review)
- Could be seen as violating separation of concerns (but navigation IS review logic)

**Completion Screen Differentiation:**
- **Daily mode:** Celebratory (🎉 "Review Complete!")
- **Filtered mode:** Informational (✓ "End of Filtered Set")
- Both offer "View Last Card" button
- Different action buttons based on context

**Implementation Files:**
- `client/src/composables/useReview.ts` - All review logic including navigation and animations
- `client/src/composables/useCardTransitions.ts` - Animation primitives (used internally by useReview)
- `client/src/app.ts` - Passes cardElement to useReview
- `client/src/App.vue` - Uses review.navigate() directly

**See:**
- previous-work/049_unified_review_navigation.md - Complete navigation unification

## Component Relationships

### Data Flow for Adding a Verse

```
1. User fills form in UI (Vue.js template)
   ↓
2. Form submit calls addVerse() from useVerses composable
   ↓
3. addVerse() calls actions.addVerse()
   ↓
4. actions.addVerse() creates verse record + operation record
   ↓
5. Both written to IndexedDB in single transaction (atomic)
   ↓
6. UI updates reactively via Vue's reactivity system
   ↓
7. useSync composable periodically calls pushOps()
   ↓
8. Operations sent to server/api/push.php via HTTP POST
   ↓
9. Server validates token, stores in ops table with ts_server
   ↓
10. Server returns acknowledgment + new cursor
    ↓
11. Client removes acknowledged ops from outbox
```

### Data Flow for Syncing Between Devices

```
Device A (offline):
1. User adds verse
2. Stored locally + queued in outbox

Device A (online):
3. pushOps() sends to server
4. Server stores with ts_server=1000, seq=100

Device B (online):
5. pullOps() requests since cursor=99
6. Server returns op with seq=100, ts_server=1000
7. Device B applies operation to local database
8. Verse appears in Device B's UI
9. Device B updates cursor to 100
```

### Conflict Resolution Example

```
Scenario: Same verse edited on two devices offline

Device A (offline):
- Edits verse content at local time
- Creates operation with ts_client=1000
- Queued in outbox

Device B (offline):
- Edits same verse (different content)
- Creates operation with ts_client=1001
- Queued in outbox

Device A comes online first:
- Syncs: server assigns ts_server=2000, seq=100

Device B comes online:
- Syncs: server assigns ts_server=2001, seq=101

Both devices pull:
- Device A receives op seq=101 (ts_server=2001)
- Device A applies (2001 > 2000, Device B's edit wins)
- Device B receives op seq=100 (ts_server=2000)
- Device B ignores (2000 < 2001, already has newer)

Result: Device B's edit wins (Last-Write-Wins based on ts_server)
```

## Critical Implementation Paths

### Authentication Flow

```
1. User enters email/password in auth modal
   ↓
2. POST to /api/login.php with credentials
   ↓
3. Server verifies credentials (bcrypt password check)
   ↓
4. Server generates token: random_bytes(32) → hex (64 chars)
   ↓
5. Server hashes token (bcrypt) and stores in tokens table
   ↓
6. Server returns plain token + user_id to client
   ↓
7. Client stores in IndexedDB auth table
   ↓
8. Client includes token in X-Auth-Token header on all API requests
   ↓
9. Server validates token on each request (compare hash)
```

**Why This Approach:**
- Token sent to client only once (on login)
- Stored hashed in database (secure if DB compromised)
- Simple to implement (no JWT complexity for this use case)
- Easy to revoke (delete from tokens table)

**See:** `server/api/login.php`, `server/api/lib.php` (auth functions), `client/src/composables/useAuth.ts`

### Spaced Repetition Algorithm

```
1. User opens Review tab
   ↓
2. getVersesForReview() called from useReview composable
   ↓
3. For each verse:
   a. Calculate days since startedAt
   b. Determine category (learn/daily/weekly/monthly based on thresholds)
   c. For weekly/monthly, apply probability (1-in-7, 1-in-30)
   d. Check if due based on last review time
   ↓
4. Return verses due for review (sorted by priority)
   ↓
5. User reviews and marks "Got it" or "Need Practice"
   ↓
6. recordReview() creates review entry with timestamp
   ↓
7. Review stored locally + operation queued for sync
```

**Algorithm Thresholds (in human terms):**
- First week (0-7 days): Review daily — intensive learning
- First 2 months (7-56 days): Review daily — establishing memory
- 2-4 months (56-112 days): Review weekly — solidifying retention
- 4+ months (112+ days): Review monthly — long-term maintenance

**Why These Thresholds:**
- Based on spaced repetition research
- Clean multiples of 7 (8 weeks, 16 weeks) align with weekly review rhythm
- Probability approach for older verses (1-in-7, 1-in-30) keeps review load manageable
- Per-session probability (not per-day) allows multiple reviews per day

**See:** `client/src/composables/useReview.ts`, productContext.md for business logic details

## Database Schema Patterns

### Client Schema (IndexedDB - Dexie.js)

**Primary Tables:**
- `verses` - User's verse library (id, reference, refSort, content, translation, tags, etc.)
- `reviews` - Review history (id, verseId, createdAt)
- `settings` - User preferences (id, key, value)

**Sync Infrastructure:**
- `auth` - Authentication token storage (id, token, userId, email)
- `outbox` - Pending operations awaiting sync (id, ts, entity, action, data)
- `appliedOps` - Deduplication tracking (op_id) - prevents reapplying ops
- `sync` - Cursor state (id, cursor, lastPullAt, lastPushAt)

**Key Indexes:**
- `verses.refSort` - For biblical ordering (e.g., "bible.01001001")
- `verses.createdAt` - For chronological queries
- `reviews.verseId` - For verse history lookup
- `reviews.createdAt` - For recent reviews

**See:** `client/src/db.ts` for complete Dexie schema

### Server Schema (SQLite)

**Core Tables:**
- `users` - User accounts (id, email, password_hash, created_at)
- `tokens` - Authentication tokens hashed (token_hash, user_id, created_at)
- `ops` - Operation log - source of truth (seq, user_id, op_id, ts_client, ts_server, entity, action, data_json)

**Derived Views (for convenience queries):**
- `verses_view` - Current verse state (latest op per verse_id)
- `reviews_view` - Review history (all review ops)
- `user_stats` - Aggregate statistics (verse counts, review counts)

**Key Indexes:**
- `ops(user_id, seq)` - For efficient pull queries with cursor
- `ops(op_id)` - For deduplication (prevent duplicate op storage)
- `tokens(user_id)` - For auth lookups

**Why Views:**
- Simplify queries (don't need to derive state from ops)
- Read-optimized (pre-computed joins)
- Ops table remains append-only (fast writes)

**See:** `server/schema.sql` for complete SQL schema

## Performance Optimizations

### Client-Side
- IndexedDB for unlimited storage (no localStorage 5MB limit)
- Compound indexes for efficient queries (`verses.by('refSort')`)
- Batch operations in transactions (atomic, faster)
- Lazy loading of large lists planned for future (virtual scrolling)
- v-if instead of v-show for large lists (better memory efficiency)

### Server-Side
- SQLite WAL mode for better concurrency (readers don't block writers)
- Prepared statements for security + performance (query plan caching)
- Cursor-based pagination (500 ops/batch - constant time queries)
- Views for read optimization (pre-computed joins)
- JSON extraction in views for derived data (no client-side parsing)

### Network
- Batch push operations (up to 500 per request - reduce round trips)
- Cursor-based pull (no duplicate data transferred)
- Smart retry with adaptive backoff (1s → 30s when failing)
- Sync only when authenticated and online

### 14. Logout State Cleanup Pattern

**Purpose:** Ensure complete cleanup of all local data on logout while providing appropriate warnings for data loss scenarios

**Problem Solved:**
- Logout previously only cleared auth token, leaving user data behind
- No warning when users had unsynced changes in outbox
- In-memory state in composables persisted after "logout"
- localStorage preferences and service worker caches not cleared

**How It Works:**

**Two focused cleanup functions in `db.ts`:**
- `clearLocalData()` - Deletes IndexedDB database, clears localStorage and sessionStorage
- `clearServiceWorkerCaches()` - Clears all service worker caches (static assets)

**Auth flows use them explicitly:**
- **Login/Register:** `clearLocalData()` only (clean slate, keep SW caches)
- **Logout:** Both functions + page redirect to `/`

**Outbox warning before logout:**
- Check `getOutboxCount()` before showing confirmation
- If items pending: Strong warning about permanent data loss
- If empty: Simple confirmation dialog

**Why This Pattern:**
- ✅ Explicit behavior (no hidden wrapper functions)
- ✅ Self-documenting call sites
- ✅ Clean separation: user data vs static assets
- ✅ Pre-login cleanup prevents stale data issues
- ✅ Page redirect guarantees clean in-memory state
- ✅ User agency (warning about unsynced changes)

**Data Cleared on Logout:**
- **IndexedDB:** All tables (verses, reviews, settings, auth, outbox, appliedOps, sync)
- **localStorage:** All keys (verseViewMode, verseSortPreference)
- **sessionStorage:** Everything
- **SW Caches:** google-fonts-cache, gstatic-fonts-cache, mdi-icons-cache, workbox precache
- **In-Memory:** All composable state (via page refresh)

**Implementation Files:**
- `client/src/db.ts` - Cleanup functions
- `client/src/sync.ts` - Auth flows with cleanup
- `client/src/composables/useAuth.ts` - Logout UI with warning

**See:** previous-work/053_logout_state_cleanup.md for detailed implementation

## Security Patterns

### Authentication
- Tokens generated with `random_bytes(32)` (cryptographically secure)
- Tokens hashed with bcrypt before database storage
- Plain token sent to client only once (on login)
- Token included in `X-Auth-Token` header (not in URL)
- Server validates on every request (stateless auth)
- Tokens revocable via logout (delete from tokens table)

### Data Protection
- SQL injection prevented via prepared statements (PDO)
- XSS prevented via Vue.js template escaping (automatic)
- CORS headers properly configured (restrict origins)
- HTTPS required in production (no plaintext tokens over wire)
- Password hashing with bcrypt (cost factor 10)

### Privacy
- User data isolated by user_id (enforced at query level)
- No cross-user data access (queries always filter by user_id)
- Tokens revocable via logout
- Export capability for data portability (user owns their data)
- No analytics or tracking (privacy-first)
