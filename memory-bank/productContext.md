# Product Context

<!--
MAINTENANCE PRINCIPLES (from .clinerules):
- Document WHY the project exists and WHAT problems it solves
- Focus on user experience goals and product vision
- Business logic and user workflows belong here
- NO phase lists or completion status (those belong in progress.md)
- Update when product direction or UX goals change
- This file guides WHAT we build, systemPatterns guides HOW

KEY QUESTION THIS FILE ANSWERS: "What is this product supposed to be?"
-->

## Why This Project Exists

### The Problem
Christians want to memorize scripture effectively, but existing solutions have limitations:
- Legacy apps lack modern UX and offline capabilities
- Modern apps often lack proven memorization algorithms
- Most apps don't sync reliably across devices
- Many require constant internet connectivity

### The Solution
A modern Bible memory app that combines:
- **Proven spaced repetition** from the legacy Laravel app
- **Beautiful, intuitive UI** from modern SPA patterns
- **Robust offline-first architecture** with reliable sync
- **Multi-device support** with conflict resolution

## What Problems It Solves

### For Users
1. **Effective Memorization** - Spaced repetition algorithm ensures verses are reviewed at optimal intervals
2. **Anywhere Access** - Full offline functionality means memorization isn't interrupted by connectivity
3. **Multi-Device Freedom** - Work on phone, tablet, or computer with automatic sync
4. **Organization** - Structured tags help organize verses by topic, book, or study series
5. **Data Safety** - Automatic sync and export capabilities protect against data loss

### For Developers
1. **Modern Stack** - TypeScript, Vite, and modern tooling for maintainability
2. **Clear Architecture** - Separation of concerns (db, actions, sync, UI)
3. **Proven Patterns** - OpLog sync pattern handles offline/online transitions
4. **Extensible Design** - Easy to add new features in future phases

## How It Should Work

### Core User Flows

#### Adding a Verse

**Single Verse (Manual or AI-Assisted):**
1. User clicks "Add Verse" tab
2. **Option A - AI Smart Fill:**
   - Pastes verse text with reference
   - Clicks "Smart Fill ✨"
   - AI parses reference, refSort, content, translation
   - Reviews parsed data, makes edits if needed
   - Clicks "Add Verse"
3. **Option B - Manual Entry:**
   - Clicks "Skip AI"
   - Fills in reference (e.g., "John 3:16")
   - Enters refSort for proper ordering (e.g., "bible.43003016")
   - Pastes or types verse content (multi-paragraph supported)
   - Optionally adds translation, tags, marks as favorite
   - Clicks "Add Verse"
4. Verse immediately available offline
5. Syncs to server when online

**Multiple Verses (Collections) - NEW ✅:**
1. User clicks "Browse Collections 📚" button on Add Verse tab
2. Views list of curated collections with verse counts
3. Clicks a collection to see all verses
4. Reviews verses (all selected by default), deselects any unwanted
5. Chooses memorization pace:
   - Two to start, then weekly (default)
   - Weekly
   - Every 2 weeks
   - Monthly
6. Clicks "Add Verses"
7. All selected verses added with automatic scheduling
8. Success message displays, returns to My Verses tab
9. Syncs to server when online

#### Reviewing Verses (Basic - Phase 1)
**Current Implementation:**
1. User clicks "Review" tab
2. App shows verses due for review based on spaced repetition
3. User sees reference, tries to recall content
4. Clicks "Reveal Verse" to check accuracy
5. Marks as "Got it!" or "Need Practice"
6. Review recorded, next verse appears
7. Algorithm adjusts future review schedule

**Advanced Features (Legacy App - Phase 2+):**
For enhanced practice modes, users can access legacy app via "Legacy..." button:
- Flash Cards mode (5 difficulty levels for graduated practice)
- First Letters mode (first letter + punctuation memory aids)
- Progressive Hints mode (incremental word reveal)
- Keyboard shortcuts for efficient navigation (n/p/h/f/Space)
- Meditation and Application prompts for deeper engagement

**Roadmap:** Phase 2 will integrate these advanced modes into modern app

#### Managing Verses
1. User clicks "My Verses" tab
2. Sees all verses sorted by biblical order
3. Can search by reference or content
4. Can edit any verse (opens modal)
5. Can delete verses (with confirmation)
6. Can export all verses to JSON
7. Can import verses from JSON

### Spaced Repetition Schedule

The app uses proven intervals based on memory science:
- **First week**: Daily review (learning phase)
- **First 2 months**: Daily review (establishing memory)
- **2-4 months**: Weekly review (solidifying retention)
- **4+ months**: Monthly review (long-term maintenance)

This ensures:
- New verses get frequent reinforcement
- Established verses stay fresh
- Long-term retention is maintained
- Review load remains manageable

### Offline-First Behavior

**When Offline:**
- All CRUD operations work normally
- Operations queued in local outbox
- UI shows offline indicator
- No functionality is lost

**When Online:**
- Automatic sync every 60 seconds
- Push local operations to server
- Pull server operations to local
- Conflicts resolved via last-write-wins
- Offline indicator disappears

### Multi-Device Sync

**Scenario:** User has phone and computer
1. Adds verse on phone (offline)
2. Phone syncs when online
3. Computer pulls changes
4. Verse appears on computer
5. User edits on both devices offline
6. Both sync when online
7. Last edit wins (based on server timestamp)

### Legacy App Integration

**During Transition Period:**
Users have access to both modern and legacy apps:

**Modern App (Primary):**
- All verse management (add, edit, delete, import, export)
- Multi-device sync with cloud backup
- Basic review flow (reference → content reveal)
- Mobile-optimized responsive design

**Legacy App (Temporary - Advanced Features):**
- 5 review modes (Flash Cards, Hints, First Letters, etc.)
- Meditation and Application reflection prompts
- Keyboard shortcuts for power users
- BibleGateway chapter lookup

**Switching Between Apps:**
1. Click "Legacy..." button in modern app
2. Verses automatically export to legacy format
3. Browser redirects to `/legacy/index.html`
4. Return to modern app via "Link back to new app" in legacy menu

**Data Consistency:**
- Modern app is source of truth (IndexedDB + server sync)
- Legacy reads from localStorage (exported by modern app)
- Legacy operates in read-only mode
- Changes in legacy don't sync back to modern app

**Timeline:** Legacy app will be phased out once Phase 2/3 features implemented in modern app

## User Experience Goals

### Simplicity
- Clean, uncluttered interface
- Obvious actions (big buttons, clear labels)
- Minimal clicks to accomplish tasks
- Helpful hints and examples

### Beauty
- Glass-morphism design with depth
- Smooth animations and transitions
- Gradient backgrounds and buttons
- Professional typography (Inter font)
- Responsive on all screen sizes

### Speed
- Instant response to user actions
- No loading spinners for local operations
- Fast sync (< 500ms typical)
- Optimized bundle size

### Reliability
- Works offline without degradation
- Automatic sync without user intervention
- Conflict resolution without user confusion
- Data integrity guaranteed
- Export capability for peace of mind

### Accessibility
- Keyboard navigation support (future)
- Clear visual hierarchy
- Readable text sizes
- Touch-friendly targets on mobile
- Semantic HTML structure

## Success Metrics

### User Engagement
- Daily active users
- Average verses per user
- Review completion rate
- Streak retention (7-day, 30-day)

### Technical Performance
- Sync success rate > 99%
- Offline functionality 100%
- Page load < 2 seconds
- Zero data loss

### User Satisfaction
- Ease of adding verses
- Effectiveness of review algorithm
- Reliability of sync
- Overall app experience
