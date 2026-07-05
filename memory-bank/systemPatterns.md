# System Patterns

<!--
MAINTENANCE PRINCIPLES (see AGENTS.md → Documentation maintenance):
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
- `client/src/composables/useVerses.ts` - Verse CRUD, filtering, import/export (simplified after wizard extraction)
- `client/src/composables/useAddVerseWizard.ts` - Add verse wizard (paste → AI parse → form → collections)
- `client/src/composables/useReview.ts` - Review system logic and navigation (animations delegated to Vue `<Transition>` in ReviewTab)
- `client/src/composables/useSync.ts` - Sync scheduling and status tracking
- `client/src/composables/useStats.ts` - Statistics dashboard engine
- `client/src/composables/useSwipeDetection.ts` - Touch gesture detection
- `client/src/app.ts` - Orchestrates composables

### 7. Vue 3 Component Architecture Strategy

**Purpose:** Maintain manageable component sizes while avoiding premature abstraction and prop drilling fears

**Philosophy:**
- Extract components when files become hard to navigate (~500+ lines)
- Fear of prop drilling should not prevent extraction - it's usually overblown
- Composables remain the source of truth for state (not Pinia - overkill for this app)
- Pass composable return values as props when needed (preserves reactivity + TypeScript)
- Use provide/inject surgically (only for 3+ levels of nesting)

**Component Extraction Strategy:**

**Phase 1 - Modals (Low Risk, High Value):** ✅ Complete
```
components/modals/
├── EditVerseModal.vue    (props: show, verse; events: close, save, update:verse)
├── AboutModal.vue        (props: show; events: close)
└── AuthModal.vue         (props: show, mode, form, loading; events: close, login, register, update:mode, update:form)
```

**Phase 2 - Header Components (Medium Risk):** Planned
```
components/
├── AppHeader.vue         (user menu, offline badge)
├── StatsBar.vue          (total verses, reviewed today, streak)
└── TabNavigation.vue     (tab buttons with badge)
```

**Phase 3 - Tab Components (Highest Impact):** Planned
```
tabs/
├── AddVerseTab.vue       (multi-step wizard)
├── MyVersesTab.vue       (verse list with search/filter)
└── ReviewTab.vue         (flashcard review with modes)
```

**Props vs Provide/Inject Decision Tree:**
```
Is data needed 3+ levels deep?
├── Yes → Consider provide/inject
└── No → Use props

Is the component reusable across contexts?
├── Yes → Use props (explicit API)
└── No → Provide/inject is OK

Is data flow complex (many properties)?
├── Yes → Pass whole composable as prop
└── No → Pass individual values
```

**Passing Composables as Props Pattern:**
```typescript
// App.vue
<ReviewTab :review="review" />

// ReviewTab.vue
const props = defineProps<{ review: ReviewComposable }>()
// Destructure ONCE in setup: refs stay reactive and auto-unwrap in the
// template; review actions are called directly instead of emitted.
const { currentReviewVerse, reviewMode, navigate } = props.review
```

This pattern:
- ✅ Preserves Vue reactivity (destructured refs, stable object identity)
- ✅ Full TypeScript support via the exported `ReviewComposable` type
- ✅ Makes dependencies explicit (the destructure lists exactly what's used)
- ✅ Avoids excessive individual prop definitions AND event boilerplate

**Current status:** Implemented for ReviewTab and ReviewModeButtons.
Only non-review concerns (clipboard, browser links, edit modal) still emit
to App. (History of the back-and-forth: previous-work/064 and 072.)

**Why NOT Pinia:**
- Current composables work well and follow Vue 3 best practices
- App is personal/single-user (no complex shared state)
- Composables provide same benefits without migration overhead
- DevTools work fine with Vue reactivity debugging

**Implementation Results:**
- App.vue reduced from 1,606 → 867 lines (~46% after Phase 2)
- Clean modal APIs with props/events
- Composables unchanged (still source of truth)
- Build passes, no TypeScript errors

**Component DOM Ownership Pattern:**
When a component owns a DOM element that requires event handling (touch, swipe, animations, etc.):
- The component owns the related composable calls (e.g., `useSwipeDetection`)
  and its own Vue `<Transition>` configuration
- Domain actions are called directly on the composable received as a prop
  (e.g., swipe release → `navigate()`); emit only for concerns the parent
  owns (clipboard, edit modal)
- Guard conditions are derived locally from composable state (e.g.,
  `canSwipeLeft` from index bounds + `isNavigating`)
- All animation state stays internal — the orchestrator publishes intent
  (`navDirection`); it never drives the DOM

**Why:** Avoids convoluted ref-passing patterns (watchEffect sync, defineExpose, ref forwarding). Component encapsulates its DOM interactions, parent orchestrates behavior.

**Applied In:** ReviewTab owns cardElement, useSwipeDetection, AND the card's Vue `<Transition>` configuration - all DOM-related concerns stay in the component that owns the DOM element.

**Key Files:**
- `client/src/App.vue` - Main shell component
- `client/src/components/modals/` - Extracted modal components
- `client/src/components/tabs/` - Extracted tab components
- `client/src/app.ts` - Composable orchestration

### 8. Mobile-First Responsive Design Pattern

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

### 9. Sync Health State Machine Pattern

**Purpose:** Provide truthful connectivity/sync feedback based on settled evidence, never on guesses

**Problem Solved:**
- `navigator.onLine` alone is unreliable (captive portals, "interface up but no
  internet", browser quirks) and doesn't detect server-side failures
- Deriving UI health from booleans that mix connectivity guesses with sync
  outcomes caused the status to flip healthy *before* any sync had run,
  firing a stale offline toast on reconnect (previous-work/074)

**How It Works:**
- `useSync.syncHealth` holds the last **settled verdict** — `'offline' |
  'error' | 'synced'` — and changes only on real evidence: an `offline`
  event / `navigator.onLine === false`, a completed sync, or a failed sync
- `'synced'` is only ever set after `syncNow()` resolves; connectivity
  detection alone can never flip the status healthy, and the settle re-checks
  `navigator.onLine` so a stale success can't overwrite an authoritative
  offline signal that landed mid-sync
- A sync failure settles as `'offline'` (not `'error'`) when connectivity was
  lost mid-flight
- Sync passes are serialized (`performSync`): a trigger landing mid-pass
  within the freshness window shares the pass; a later trigger flags one
  trailing rerun, and only the FINAL pass settles the verdict — a superseded
  pass's failure never reaches the UI (e.g. the 'online' handler arriving
  while a pre-disconnect request is dying)
- `isSyncing` is a separate activity flag; `syncStatus` derives the display
  union `'offline' | 'syncing' | 'error' | 'synced'` without letting the
  transient syncing state distort the health verdict
- `hasSyncIssues` (badge visibility) = health is not `'synced'`, auth-gated
  in `app.ts` (`hasSyncIssuesWithAuth`)
- A failing push fails the sync as a whole (local changes are not on the
  server), but the pull still runs first — reads don't depend on writes

**Why This Pattern:**
- Every badge/toast transition corresponds to something that actually
  happened, so recovery can never display an error
- Detects both network AND server connectivity issues uniformly
- `'offline'` vs `'error'` distinguishes intentional offline use from a
  failing sync — different user meaning, same badge

**Retry Cadence:**
- Immediate sync (1-second check) only while healthy with pending outbox data
- 30-second periodic retry while offline/failing (prevents server hammering)
- Immediate verification sync on the `online` event and on tab visibility

**Implementation:** `client/src/composables/useSync.ts` (`syncHealth`,
`syncStatus`, `performSync`) and the auth-gating/toast wiring in
`client/src/app.ts`. Regression tests: `useSync.test.ts`.

### 10. Progressive Web App (PWA) Pattern

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

### 11. Async External Resource Loading Pattern

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
- `client/index.html` (preload `<link>` tags for fonts/icons) - Async stylesheet loading

**See:** previous-work/031_pwa_offline_blank_screen_fix.md for detailed analysis

### 12. Connectivity Detection & Request Timeout Pattern

**Purpose:** React to connectivity transitions immediately, without ever trusting "online" claims

**Problem Solved:**
- Polling `navigator.onLine` only when a sync tick happened to run left the
  status up to 30 seconds stale and made health flip on interface detection
- A `Promise.race` timeout abandoned the fetch but left it running, so a
  "timed out" sync kept mutating state (and holding the in-flight lock) after
  the UI had reported failure
- Concurrent sync triggers got an instant no-op resolution that was
  indistinguishable from a completed sync

**How It Works — the trust asymmetry:**
- `navigator.onLine === false` and the `offline` event are **authoritative**:
  no network interface exists, so settle `'offline'` immediately and skip the
  doomed request
- `navigator.onLine === true` and the `online` event are **only hints**
  (captive portals, LAN without internet): they trigger a verification sync,
  and health flips green when that sync actually succeeds
- Per-request timeout via `AbortController` (`fetchWithTimeout` in
  `utils/http.ts`, shared with the wizard's parse-verse call) genuinely
  aborts the request **including the body read** — fetch() resolves at
  response headers, so a timer cleared there leaves a stalled body unbounded
  and wedges the caller forever — and a paginated pull backlog gets a fresh
  timeout per page instead of one global deadline
- Concurrent `syncNow()` callers share the in-flight sync's promise, so
  "resolved" always means a sync really completed; `performSync` adds
  pass serialization with a trailing rerun on top (pattern 9)
- The 1-second outbox fast-path also fires as a reconnect probe when the
  verdict is `'offline'` but the browser reports a network — pending changes
  push within ~1 s of reconnect without relying on the `online` event
  (historically flaky in iOS standalone PWAs); `'error'` still backs off to
  the 30-second periodic retry

**Sync Triggers:**
- Initial sync on schedule start; `online` event; tab `visibilitychange`;
  1-second outbox check while healthy; 30-second periodic retry otherwise

**Trade-offs Accepted:**
- `online` event false-positives cost one failed verification sync (settles
  `'error'`/`'offline'` honestly)
- No exponential backoff yet — failure retry is a flat 30 s (acceptable for a
  single-user server; revisit if load ever matters)

**Implementation Files:**
- `client/src/composables/useSync.ts` (`performSync`, event listeners)
- `client/src/utils/http.ts` (`fetchWithTimeout`, `TimeoutError`)
- `client/src/sync.ts` (shared-promise `syncNow`)

**See:** previous-work/074_sync_status_state_machine.md

### 13. Toast Notification Pattern

**Purpose:** Provide temporary, non-intrusive notifications for status changes and user feedback

**Problem Solved:**
- Persistent banners take up screen space and distract users
- Users need awareness of status changes without constant visual noise
- Notifications should follow modern UX patterns (Google Docs, Slack, Notion)
- Need reusable infrastructure for various notification types

**How It Works:**
- The toast's message and color are keyed to the **settled sync-health
  verdict** it announces (`SYNC_TOAST_TEXT` in `app.ts` owns the copy):
  offline and error are red warnings, recovery is a green success
- A watcher on `useSync.syncHealth` fires the toast on every settled
  transition (auth-gated); because health only moves on real evidence
  (pattern 9), the recovery toast can never show while sync is unverified —
  the original single hard-coded offline message also fired on recovery
  (previous-work/074)
- Auto-dismiss after 5 seconds; clicking the sync-issues badge re-shows the
  toast for the *current* verdict
- Slide-in animation, fixed top-right (`.sync-toast` +
  `.sync-toast--warning` / `.sync-toast--success` in `styles.css`)

**Why This Pattern:**
- ✅ The message always states what actually happened — text and trigger
  can't drift apart because both derive from the same verdict
- ✅ Non-intrusive (temporary, auto-dismissing), industry standard
- ✅ Kind-based styling extends to future success/info notifications

**Companion Pattern: Badge Indicator**
- Small persistent indicator (10px red dot on User Menu, `.offline-badge`)
- Visible while `hasSyncIssues`; clickable to re-trigger the toast
- Provides persistent awareness without distraction

**Trade-offs Accepted:**
- Toast can be missed if user not looking at screen (mitigated by persistent badge)
- No queue system for multiple toasts (single toast; a rapid flap just
  re-arms the same element with the newest verdict)
- Auto-dismiss means user can't read at their own pace (can add click-to-dismiss later)

**Implementation Files:**
- `client/src/app.ts` (`SYNC_TOAST_TEXT`, `showToast`, `triggerSyncToast`, health watcher)
- `client/src/App.vue` (`.sync-toast` element) - Toast component
- `client/src/styles.css` (`.sync-toast`, variants, `slideInFromTop`)

**See:** previous-work/031_offline_notification_redesign.md (original badge+toast
design) and previous-work/074_sync_status_state_machine.md (truthful-message rework)

### 14. Unified Review Navigation Pattern

**Purpose:** Centralize navigation and animation logic within the review composable to eliminate duplication and awkward injection patterns

**Problem Solved:**
- 11 different navigation entry points with ~70% code duplication
- Each handler (buttons, swipes, keyboard) repeated guard checks, animations, and navigation logic
- Navigation logic spread across template where it was harder to maintain
- Completion screen didn't differentiate between daily and filtered review modes

**How It Works:**
- Single `navigate()` method handles all navigation with optional review recording
- `navigate()` mutates state only; Vue `<Transition>` in ReviewTab (keyed by
  verse id, named via `navDirection`) owns all enter/leave animation
- Keyboard shortcuts call `navigate()` directly (no injection needed)
- All navigation triggers unified through clean, direct API

**Implementation:**
```typescript
// useReview is animation-free; ReviewTab maps review.navDirection
// to a named <Transition>:
const review = useReview();

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
2. **Concurrency Guard:** `isNavigating` spans the whole sequence including
   the 400ms review-feedback delay (see previous-work/069)
3. **Animations Delegated:** state changes drive Vue `<Transition>` — keyed
   by verse id, transition name chosen from `navDirection`
4. **Review Recording:** Optional parameter integrates review tracking
5. **Boundary Handling:** Explicit completion state for last card
6. **No Injection:** Keyboard shortcuts call navigate() directly

**Navigation Flow:**
```
1. Guard (isNavigating? at boundary?)
   ↓
2. Record review (optional, with 400ms visual feedback)
   ↓
3. Set navDirection + mutate state (index / completion)
   ↓
4. Vue <Transition> reacts: old card leaves, new card enters
   (mode="out-in"; the completion screen swaps the same way)
```

**History note:** The previous hand-rolled animation engine
(useCardTransitions) required an "every exit must pair with an entry or
reset" invariant; violating it rendered cards invisible-but-interactive
(previous-work/067). Migrating to Vue `<Transition>` (previous-work/071)
removed both the engine and the invariant — Vue owns enter/leave lifecycles
and cannot strand visibility state.

**Why This Pattern:**
- ✅ **Simple architecture:** Clean 2-layer design (App.vue → useReview)
- ✅ **No coordination overhead:** Keyboard shortcuts call navigate() directly
- ✅ **Single responsibility:** Review owns all review-related logic including navigation
- ✅ **Less indirection:** Direct call chain without callbacks
- ✅ **Navigation IS review logic:** Colocated where it belongs
- ✅ **~192 lines eliminated:** Removed duplicated handler code

**Architecture:**
```
App.vue → useReview (state + orchestration)
ReviewTab → Vue <Transition> (animations) + useSwipeDetection (drag)
```

**Integration Points:**
- Button clicks → `review.navigate()`
- Swipe gestures → `review.navigate()`
- Keyboard shortcuts → `review.navigate()` (direct, no injection)
- Review buttons → `review.navigate({ recordReview: true/false })`
- Completion screen → `review.viewLastCard()`
- Card click → `review.navigate({ recordReview: true })`

**Trade-offs Accepted:**
- Review composable is large (navigation IS review logic)
- Swipe drag still binds an inline transform (necessary for finger-following);
  handoff to the leave transition uses the `--swipe-x` custom property

**Completion Screen Differentiation:**
- **Daily mode:** Celebratory (🎉 "Review Complete!")
- **Filtered mode:** Informational (✓ "End of Filtered Set")
- Both offer "View Last Card" button
- Different action buttons based on context

**Implementation Files:**
- `client/src/composables/useReview.ts` - All review logic including navigation
- `client/src/components/tabs/ReviewTab.vue` - Vue `<Transition>` config + swipe handoff
- `client/src/styles.css` - Named card transitions (card-left / card-right / card-drop)
- `client/src/App.vue` - Uses review.navigate() directly

**See:**
- previous-work/049_unified_review_navigation.md - Complete navigation unification
- previous-work/071_vue_transition_migration.md - Vue `<Transition>` migration

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

### Spaced Repetition Algorithm (deterministic, date-seeded)

```
1. User opens Review tab (every entry rebuilds — order self-heals)
   ↓
2. getDailyReviewState() (actions.ts) fetches one snapshot: all verses +
   today's review events, then delegates to the PURE module
   utils/reviewScheduling.ts
   ↓
3. buildDailyQueue():
   a. History segment — verses reviewed today, in review order
      (consecutive duplicates collapsed)
   b. Lap segment — all eligible verses sorted by
      (times-reviewed-today ASC, hash32(verseId|localDate) ASC)
   c. startIndex lands on the first card after the history
   ↓
4. computeTargets(): learn/daily target = count; weekly = count/7;
   monthly = count/30 — fractional part resolved by a date-seeded coin.
   Targets GATE the goal (celebration + X/Y progress); they never filter
   which cards appear.
   ↓
5. User reviews; recordReview() stores the event + queues the op for sync
   ↓
6. Reaching the end of the queue appends another lap — daily review loops
   indefinitely; skipped cards surface before any repeats
```

**Algorithm Thresholds (in human terms):**
- First week (0-7 days): Review daily — intensive learning
- First 2 months (7-56 days): Review daily — establishing memory
- 2-4 months (56-112 days): Review weekly — solidifying retention
- 4+ months (112+ days): Review monthly — long-term maintenance

**Why This Approach:**
- Thresholds based on spaced repetition research; clean multiples of 7
- Deterministic per-verse hash ranking (not a global shuffle): every device
  with the same synced data derives the identical queue for the date, and
  adding/removing/pausing verses never perturbs other verses' order
- Quotas are floors, not caps: over-reviewing a category raises its
  effective total (`max(target, distinct-reviewed)`) — the day's total only
  grows; quota progress counts distinct verses, loop ordering counts events
- No queue is persisted — it is a pure function of synced state, so sync
  lag self-corrects on the next rebuild
- One-time-per-day "Daily Goal Reached" celebration, gated by a
  device-local localStorage date flag (the settings table syncs, which
  would wrongly suppress it on other devices)

**See:** `client/src/utils/reviewScheduling.ts` (pure algorithm + tests),
`client/src/actions.ts` (DB wrappers), `client/src/composables/useReview.ts`
(session orchestration), previous-work/075 for design rationale

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

### 15. Logout State Cleanup Pattern

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
