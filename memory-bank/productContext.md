# Product Context

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
1. User clicks "Add Verse" tab
2. Fills in reference (e.g., "John 3:16")
3. Enters refSort for proper ordering (e.g., "bible.43003016")
4. Pastes or types verse content (multi-paragraph supported)
5. Optionally adds translation, tags, marks as favorite
6. Clicks "Add Verse"
7. Verse immediately available offline
8. Syncs to server when online

#### Reviewing Verses
1. User clicks "Review" tab
2. App shows verses due for review based on spaced repetition
3. User sees reference, tries to recall content
4. Clicks "Reveal Verse" to check accuracy
5. Marks as "Got it!" or "Need Practice"
6. Review recorded, next verse appears
7. Algorithm adjusts future review schedule

#### Managing Verses
1. User clicks "My Verses" tab
2. Sees all verses sorted by biblical order
3. Can search by reference or content
4. Can edit any verse (opens modal)
5. Can delete verses (with confirmation)
6. Can export all verses to JSON
7. Can import verses from JSON

### Spaced Repetition Schedule

The app uses proven intervals:
- **Learn** (< 7 days): Daily review for new verses
- **Daily** (7-56 days): Daily review for established verses
- **Weekly** (56-112 days): 1-in-7 probability review
- **Monthly** (112+ days): 1-in-30 probability review

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

## Key Features by Priority

### Phase 1 (Complete) ✅
- Verse CRUD operations
- Basic review mode (reference → reveal)
- Spaced repetition algorithm
- Offline-first with IndexedDB
- Multi-device sync
- Search and filter
- Import/export JSON
- Tags system
- Multi-paragraph support
- Authentication

### Phase 2 (Planned)
- Multiple review modes (hints, first letters, flashcards)
- Keyboard shortcuts for power users
- Statistics dashboard with charts
- Streak tracking and achievements
- Sort options for verse list
- PWA manifest for installability
- Dark mode toggle

### Phase 3 (Future)
- Meditation/application prompts
- Push notifications for review reminders
- Service worker for background sync
- Progress analytics
- Social features (share verses)
- Audio playback for verses
- Group study features

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
