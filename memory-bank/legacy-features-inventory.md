# Legacy Bible Memory App - Feature Inventory

<!--
PURPOSE: Complete reference documentation of legacy Laravel/jQuery app functionality
SCOPE: Features, capabilities, and user workflows (NOT implementation details)
USAGE: Reference for Phase 2+ roadmap planning and feature parity tracking
STATUS: Historical reference - legacy app active until modern app achieves feature parity
-->

## Document Overview

This file catalogs all features and capabilities of the legacy Bible Memory application located at `/server/public/dist/legacy/`. The legacy app represents the **full-featured reference implementation** that the modern Vue 3 app is gradually replacing.

**Key Insight:** Modern app currently implements ~30% of legacy functionality (basic CRUD + simple review). Legacy remains accessible via "Legacy..." button for advanced features.

---

## 1. Review Modes (5 Total)

### 1.1 Reference Mode (Default)
**Description:** Shows only the Bible reference
**User Interaction:** User tries to recall verse from memory
**Reveal Action:** Click verse box or press Space to show content
**Status in Modern App:** ✅ **Implemented**

### 1.2 Content Mode
**Description:** Shows full verse text after reveal
**User Interaction:** Read and confirm memorization
**Advance Action:** Click again or press 'n' to move to next verse
**Status in Modern App:** ✅ **Implemented**

### 1.3 Hints Mode
**Description:** Progressive word revelation for assisted recall
**Mechanics:**
- First activation: Shows first 3 words
- Each subsequent hint: Shows 1 additional word
- Preserves punctuation and formatting
- Keyboard shortcut: 'h'
- Button: "Hint" (bottom of verse box)

**Use Case:** When struggling to recall verse start, get incremental help
**Status in Modern App:** ❌ **Not Implemented** (Priority: Phase 2)

### 1.4 First Letters Mode
**Description:** Shows only first letter of each word + all punctuation
**Mechanics:**
- Displays: "F G s l t w, t h g h o S, t w b, s t w b i h s n p, b h e l."
- For: "For God so loved the world, that he gave his only Son..."
- Removes spaces, keeps commas/periods/semicolons
- Keyboard shortcut: 'f'
- Button: "First Letters" (bottom of verse box)

**Use Case:** Popular memorization technique - structure + first letters jog memory
**Status in Modern App:** ❌ **Not Implemented** (Priority: Phase 2)

### 1.5 Flash Cards Mode
**Description:** Random word hiding with 5 difficulty levels
**Mechanics:**
- Accessed via context menu or "Flash Cards" button
- Difficulty levels:
  - **Show Verse:** 0% hidden (full text visible)
  - **Beginner:** 10% words hidden
  - **Intermediate:** 25% words hidden
  - **Advanced:** 45% words hidden
  - **Memorized:** 100% words hidden
- Words randomly selected for hiding
- Hidden words shown as invisible text with black underline
- Click any hidden word to reveal (turns red)
- Applies to both reference AND verse content

**Use Case:** Graduated difficulty for systematic memorization practice
**Status in Modern App:** ❌ **Not Implemented** (Priority: Phase 2 - High Impact)

---

## 2. Learning & Reflection Tools

### 2.1 Meditation Questions
**Description:** Structured prompts for deeper verse engagement
**Content Areas:**
- **Understanding:** Who is speaking? To whom? What are they communicating? Why?
- **Significance:** What makes this verse important?
- **Insight:** What insights does it give you?
- **Emotion:** How does it make you feel?
- **Emphasis:** Try emphasizing different words - how does meaning shift?
- **Context:** How does this verse connect to others?

**Access:** Right-click header → "Meditate Questions" OR context menu during review
**Format:** Static guidance page with "Back" button
**Status in Modern App:** ❌ **Not Implemented** (Priority: Phase 3)

### 2.2 Application Questions
**Description:** Prompts for practical life application organized by 4 categories
**Content Areas:**
- **Goals:** How does this verse relate to my life direction?
- **Decisions:** Does it shed light on choices I'm facing?
- **Lifestyle:** Can I align my habits with this verse?
- **Problems:** Does it suggest solutions to current challenges?

**Philosophy:** "One project per verse" - practical application over passive memorization
**Access:** Right-click header → "Apply Questions" OR context menu during review
**Format:** Static guidance page with "Back" button
**Status in Modern App:** ❌ **Not Implemented** (Priority: Phase 3)

### 2.3 BibleGateway Chapter Lookup
**Description:** Quick access to full chapter context
**Mechanics:**
- Right-click header → "Lookup Chapter"
- Opens BibleGateway.com in new window
- Shows full chapter for current verse's book/chapter
- Example: Reviewing John 3:16 opens John chapter 3

**Use Case:** Understand verse in broader biblical context
**Status in Modern App:** ❌ **Not Implemented** (Priority: Phase 3)

---

## 3. Navigation & User Experience

### 3.1 Keyboard Shortcuts (Review Mode)
**Active Shortcuts:**
- **'n'** - Next verse
- **'p'** - Previous verse
- **Space** - Advance (reveal content OR move to next verse if already revealed)
- **'h'** - Add hint (progressive word reveal)
- **'f'** - Show first letters
- **'s'** - Save current session to localStorage
- **'l'** - Load session from localStorage

**Context-Aware:** Shortcuts only work in appropriate modes/screens
**Status in Modern App:** ❌ **Not Implemented** (Priority: Phase 2 - High Impact)

### 3.2 Verse List Quick Jump
**Description:** Browse all verses and jump directly to any verse for review
**User Flow:**
1. Click "Show Verse List - Daily" or "Show Verse List - All"
2. See scrollable list of verses with references + preview text
3. Click any verse to start review mode from that specific verse
4. Navigate with Prev/Next buttons or return to list

**Use Case:** Spot-check specific verses or practice problematic ones
**Status in Modern App:** ⚠️ **Partially Implemented** (Can view list, but no quick-jump to review)

### 3.3 Context Menus (Right-Click)
**Available Actions:**
- Learn: Flash Cards
- Lookup Chapter (BibleGateway)
- Meditate Questions
- Apply Questions
- Main Menu

**Status in Modern App:** ❌ **Not Implemented** (May use modern modal/menu patterns instead)

### 3.4 Progress Indicator
**Display:** "3/25" in top-right of verse box
**Shows:** Current position / Total verses in review session
**Status in Modern App:** ✅ **Implemented**

### 3.5 Human-Readable Time Display
**Converts:** Days since `started_at` → Friendly format
**Examples:**
- 0-13 days: "3 days"
- 14-55 days: "2 weeks"
- 8-11 weeks: "2 months" (using 4-week estimate)
- 12+ weeks: "3 months" (using 30.4-day estimate)
- 24+ months: "2 years"

**Display Location:** Bottom-right of verse details table
**Status in Modern App:** ❌ **Not Implemented** (Shows raw date, not elapsed time)

---

## 4. Review Algorithm & Scheduling

### 4.1 Review Categories (Auto-Calculation)
**5 Categories based on time since `started_at`:**
- **'f'** - Future (startedAt > today) - Not yet started
- **'l'** - Learn (days 0-7) - New verses, daily review
- **'d'** - Daily (days 8-56) - Established verses, daily review
- **'w'** - Weekly (days 57-112) - Mature verses, 1-in-7 probability
- **'m'** - Monthly (days 113+) - Long-term verses, 1-in-30 probability

**Thresholds:**
- `cDaysLearn = 8` (7 days + 1)
- `cDaysDaily = 56` (7 × 4 × 2 weeks)
- `cDaysWeekly = 112` (7 × 4 × 4 weeks)

**Status in Modern App:** ✅ **Implemented** (Same algorithm)

### 4.2 Daily Review Selection Logic
**For "Start Review - Daily":**
- Always includes: 'l' (learn) and 'd' (daily)
- Probabilistic: 'w' (weekly) at 1/7 chance, 'm' (monthly) at 1/30 chance
- Excludes: 'f' (future)
- Creates manageable daily review list

**For "Start Review - All":**
- Shows all verses regardless of category
- Use case: Comprehensive practice session

**Status in Modern App:** ⚠️ **Partially Implemented** (Has daily review, but no "All" option)

### 4.3 Manual Review Category Override
**Feature:** User can manually set `review_cat` to override auto-calculation
**Visual Indicator:** Manual categories display in RED text (vs normal color for auto)
**Use Case:** Force specific verse to daily review, or skip to monthly early
**Status in Modern App:** ❌ **Not Implemented**

---

## 5. Data Model & Display

### 5.1 Verse Data Fields
**Core Fields:**
- `reference` - Bible reference (e.g., "John 3:16")
- `content` - Verse text (multiline supported)
- `review_cat` - Category: 'auto', 'f', 'l', 'd', 'w', 'm'
- `tags` - Comma-separated key=value pairs (e.g., "fast.sk=3, ss=2010.Q2.W01")
- `started_at` - Date memorization started (YYYY-MM-DD format)

### 5.2 Tag Display Formatting
**Input Format:** `"fast.sk=3, ss=2010.Q2.W01, personal"`
**Display Format:**
```
fast.sk (3)
ss (2010.Q2.W01)
personal
```
**Mechanics:**
- Parses key=value pairs
- Shows as "key (value)" with line breaks
- Tags without values show just the key

**Display Location:** Center column of verse details table
**Status in Modern App:** ⚠️ **Partially Implemented** (Shows tags, but not formatted with values)

### 5.3 Verse Details Table
**3-Column Layout (Bottom of verse box):**
- **Left:** Review category ('learn', 'daily', 'weekly', 'monthly')
- **Center:** Tags (formatted with values)
- **Right:** Time since started (human-readable)

**Status in Modern App:** ⚠️ **Partially Implemented** (Shows some metadata, different layout)

---

## 6. Data Management & Storage

### 6.1 LocalStorage Architecture
**Primary Storage:**
- `localStorage.allVerses` - Full verse array (populated by modern Vue app)

**Session State:**
- `localStorage.verses` - Filtered verse list for current review session
- `localStorage.context` - Navigation context stack (mode, verse #, submode, etc.)

**Data Bridge:**
- Modern app → Legacy app: One-way sync via `localStorage.allVerses`
- Legacy app reads on load, transforms data as needed
- Legacy changes DON'T sync back to modern app

### 6.2 Session Save/Load (Keyboard Shortcuts)
**Save:** Press 's' to save `verses` and `context` to localStorage
**Load:** Press 'l' to restore saved session
**Use Case:** Resume interrupted review session
**Status in Modern App:** ❌ **Not Implemented** (Sync handles persistence instead)

### 6.3 Data Transformation (Modern → Legacy)
**Field Mappings:**
- `reviewCat` → `review_cat` (camelCase → snake_case)
- `startedAt` (epoch ms) → `started_at` (YYYY-MM-DD string)
- `tags` (array) → `tags` (comma-separated string)

**Implemented In:** `client/src/app.ts` `exportToLegacyAndOpen()` function

---

## 7. Screen Modes & Workflows

### 7.0 Application Navigation Flow

**Screen Hierarchy:**
```
[Loading Screen]
    ↓
[Main Menu]
    ├→ Start Review - Daily → [Review Screen]
    ├→ Start Review - All → [Review Screen]
    ├→ Show Verse List - Daily → [Verse List Screen]
    └→ Show Verse List - All → [Verse List Screen]

[Review Screen]
    ├→ Flash Cards button → [Flash Cards Screen]
    ├→ Context menu: Meditate → [Meditation Questions Screen]
    ├→ Context menu: Apply → [Application Questions Screen]
    ├→ Back button → [Verse List Screen] or [Main Menu]
    └→ Prev/Next → Navigate within Review

[Flash Cards Screen]
    └→ Back button → [Review Screen]

[Meditation Questions Screen]
    └→ Back button → [Review Screen]

[Application Questions Screen]
    └→ Back button → [Review Screen]

[Verse List Screen]
    ├→ Click any verse → [Review Screen] (starting at that verse)
    └→ Back button → [Main Menu]
```

**Navigation Pattern:** Stack-based (like browser history)
- Each screen can be navigated "back" to the previous screen
- Clicking a verse in Verse List jumps directly into Review mode at that position
- Review mode has internal navigation (prev/next) without leaving the screen

### 7.1 Main Menu Screen
**Options:**
- Start Review - Daily
- Start Review - All
- Show Verse List - Daily
- Show Verse List - All
- Link back to new app

### 7.2 Review Screen Workflow
1. Shows first verse in reference mode
2. User tries to recall
3. User reveals content (Space or click)
4. User optionally uses Hints ('h'), First Letters ('f'), or Flash Cards (context menu)
5. User advances to next verse ('n' or click Next)
6. Repeat until all verses reviewed
7. "Review finished for today!" message

### 7.3 Flash Cards Screen Workflow
1. Access via right-click → "Learn: Flash Cards" OR "Flash Cards" button
2. Choose difficulty level (0%, 10%, 25%, 45%, 100%)
3. View verse with randomly hidden words
4. Try to recall hidden words
5. Click hidden words to reveal (turns red)
6. Adjust difficulty as needed
7. Return to review via context menu

### 7.4 Meditation/Application Workflow
1. Right-click header during review
2. Select "Meditate Questions" or "Apply Questions"
3. Read structured prompts
4. Reflect on current verse
5. Click Back to return to review

---

## 8. Mobile & Browser Support

### 8.1 Responsive Design
**Mobile-Specific:**
- `/css/index.iphone.css` - Touch-optimized styles
- Viewport meta tag for proper scaling
- Touch-friendly click targets
- Different layouts for small screens

**Detection:** User-agent sniffing for iPhone/Android/iPad

### 8.2 Browser Compatibility
**IE Support:** `/css/index.msie.css` - Internet Explorer fixes
**Firefox:** Debug shortcut 'v' injects Firefox-specific CSS
**Modern Browsers:** Works in Chrome, Firefox, Safari, Edge

---

## 9. Feature Comparison: Legacy vs Modern

### ✅ Features Already in Modern App
- Verse CRUD (add, edit, delete)
- Spaced repetition algorithm (same thresholds: 8→56→112 days)
- Auto review category calculation
- Basic review flow (reference → content reveal)
- Verse list display
- Search functionality (reference/content)
- Tag support (structured)
- Statistics (total verses, reviewed today, current streak)
- Offline-first with IndexedDB
- Multi-device sync (OpLog pattern)
- Authentication (token-based)
- Import/Export (JSON with smart ID handling)
- Responsive mobile-first design

### ❌ Features MISSING from Modern App

**High Priority (Phase 2):**
- Flash Cards mode (5 difficulty levels)
- First Letters mode
- Progressive Hints mode
- Keyboard shortcuts (n/p/h/f/Space)
- Verse List quick jump to review

**Medium Priority (Phase 3):**
- Meditation questions prompts
- Application questions prompts
- BibleGateway chapter lookup
- Human-readable time display
- Tag value formatting in display

**Lower Priority (Phase 3+):**
- Context menus (or modern equivalent)
- Manual review category override
- Review mode: "All verses" option
- Session save/load (less relevant with sync)

### ⭐ Features Modern App Has (Legacy Doesn't)
- Multi-device sync with conflict resolution
- Cloud backup (server storage)
- Offline-first architecture (IndexedDB vs localStorage)
- Type-safe TypeScript codebase
- Modern Vue 3 reactive UI
- Authentication system
- Data import with smart ID handling
- Search (unicode-insensitive)
- Edit verse modal (inline editing)

---

## 10. Feature Priority Assessment

### Tier 1: Essential for Feature Parity (Phase 2)
**Impact:** High - These are actively used features users expect

1. **Flash Cards Mode** - Most versatile learning tool with 5 difficulty levels
2. **Keyboard Shortcuts** - Essential for efficient review (n/p/h/f/Space)
3. **Progressive Hints** - More refined than all-or-nothing reveal
4. **First Letters Mode** - Popular memorization technique

**Estimated Effort:** 3-4 weeks focused development

### Tier 2: Enhanced Engagement (Phase 3)
**Impact:** Medium - Adds depth but not essential for basic memorization

5. **Meditation Questions** - Structured reflection prompts
6. **Application Questions** - Practical life integration
7. **Human-Readable Time Display** - Better UX than raw dates
8. **Verse List Quick Jump** - Convenient navigation
9. **BibleGateway Integration** - External chapter context

**Estimated Effort:** 2-3 weeks

### Tier 3: Nice-to-Have (Phase 4+)
**Impact:** Low - Legacy tech patterns or edge cases

10. Context menus (replace with modern modals)
11. Manual review category override (niche use case)
12. Session save/load (sync handles this)
13. Right-click interactions (not mobile-friendly)

---

## 11. Integration Strategy

### Phase 2 Goal: Enhanced Review Modes
**Deliverables:**
- Implement Flash Cards with 5 difficulty levels
- Implement First Letters mode
- Implement Progressive Hints mode
- Add keyboard shortcuts (n, p, h, f, Space, Esc)
- Add quick jump from verse list to review

**Success Criteria:**
- Users can practice with graduated difficulty
- Keyboard navigation matches legacy efficiency
- Mobile-friendly alternatives to keyboard shortcuts (gesture support)

### Phase 3 Goal: Deep Engagement
**Deliverables:**
- Meditation questions modal
- Application questions modal
- BibleGateway chapter lookup (new tab or modal)
- Human-readable time display
- Tag value display formatting

**Success Criteria:**
- Users engage with verse meaning, not just memorization
- Modern UI/UX patterns (no right-click menus)
- Mobile-first design maintained

### Phase 4 Goal: Surpass Legacy
**Deliverables:**
- Statistics dashboard with charts
- Dark mode
- Streak tracking with achievements
- Multiple sort options
- PWA installation

**Success Criteria:**
- Modern app provides features legacy doesn't have
- "Legacy..." button can be removed
- Full migration path for legacy users

---

## 12. Technical Notes

### Legacy Technology Stack (For Context Only)
- jQuery 1.x
- jStorage (localStorage wrapper)
- Manual DOM manipulation
- User-agent sniffing for mobile detection
- Cookie-based preferences (planned, not implemented)

**Note:** We are NOT replicating the technology, only the functionality using modern Vue 3 patterns.

### Data Compatibility
**Current Bridge:** `exportToLegacyAndOpen()` in `client/src/app.ts`
**Flow:** Modern app → localStorage.allVerses → Legacy app reads on load
**Direction:** One-way (legacy is read-only mode)
**Future:** Once modern app achieves parity, bridge can be removed

---

## 13. Summary & Recommendations

### Current State
- **Modern App:** Phase 1 complete - Basic features with modern architecture
- **Legacy App:** Full-featured but outdated technology stack
- **User Experience:** Users switch to legacy for advanced features (Flash Cards, Hints, Meditation)

### Immediate Priorities
1. Document feature gaps in memory bank (✅ This file)
2. Update roadmap in `progress.md` to reflect Phase 2/3 features
3. Implement Flash Cards mode (highest user value)
4. Add keyboard shortcuts (highest efficiency gain)

### Long-Term Vision
- Phase 2 (3-4 weeks): Achieve basic feature parity
- Phase 3 (2-3 weeks): Match engagement features
- Phase 4 (4-6 weeks): Surpass legacy with modern capabilities
- Remove "Legacy..." button once parity achieved

### Success Metrics
- User stops needing legacy app for daily review
- Feature parity checklist 100% complete
- Modern app provides BETTER UX than legacy (not just equivalent)

---

**Document Status:** Complete - Ready for roadmap integration
**Last Updated:** 2025-01-06
**Next Steps:** Update `progress.md` with feature parity status and Phase 2/3 roadmap
