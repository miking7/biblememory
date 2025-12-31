# 020: Phase 2 Review Modes - Initial Implementation

**Date:** January 1, 2026  
**Status:** MVP Complete - Basic functionality working, refinements needed

## What Was Implemented

### 1. State Management Foundation (`useReview.ts`)
- ✅ Added `ReviewMode` type with 5 modes: reference, content, hints, firstletters, flashcards
- ✅ Added review mode state variables:
  - `reviewMode` - current mode
  - `hintsShown` - number of words visible in hints mode
  - `flashcardLevel` - difficulty percentage (0, 10, 25, 45, 100)
  - `flashcardHiddenWords` - Set of hidden word indices
  - `flashcardRevealedWords` - Set of clicked/revealed word indices
- ✅ Mode switching functions (switchToReference, switchToContent, switchToHints, etc.)
- ✅ Content transformation functions:
  - `getHintedContent()` - Shows N words, rest as underscores
  - `getFirstLettersContent()` - Shows first letter + punctuation only
  - `generateHiddenWords()` - Randomly hides words based on difficulty
  - `revealWord()` - Marks individual word as revealed
  - `getWords()` - Splits content into word array
- ✅ Navigation functions (nextVerse, previousVerse) - reset to reference mode
- ✅ UI helper functions:
  - `getHumanReadableTime()` - "3 weeks" vs "21 days"
  - `getReviewCategory()` - Display category string
  - `formatTagForDisplay()` - Format tags with values
- [ ] Keyboard shortcut handler (partially implemented but not yet integrated)

### 2. UI Integration (`App.vue`)
- ✅ Review tab updated with mode-specific rendering
- ✅ 5 display modes implemented:
  - **Reference mode**: Shows only reference, "Reveal Verse" button
  - **Content mode**: Shows full verse with "Got it!" / "Need Practice" buttons
  - **Hints mode**: Progressive word revelation with counter and "Show One More Word" button
  - **First Letters mode**: Shows initials + punctuation only
  - **Flash Cards mode**: Random word hiding with difficulty dropdown
- ✅ Mode buttons (always visible):
  - 💡 Hints button
  - 🎴 Flash Cards button (triggers dropdown)
  - 🔤 First Letters button
  - Active state styling (gradient when selected)
- ✅ Flash Cards difficulty dropdown (5 levels: 0%, 10%, 25%, 45%, 100%)
- ✅ 3-column metadata footer:
  - Left: Review category (auto, learn, daily, weekly, monthly)
  - Center: Tags with values
  - Right: Human-readable time since started
- ✅ Navigation buttons:
  - Previous (disabled on first verse)
  - Reset View (returns to reference mode)
  - Next (disabled on last verse)

### 3. Function Exports (`app.ts`)
- ✅ Added Phase 2 exports to `bibleMemoryApp()` return object:
  - All review mode state variables
  - All mode switching functions
  - All content transformation functions
  - All navigation functions
  - All UI helper functions
- ✅ App.vue destructuring updated to include all Phase 2 properties

### 4. Bug Fixes
- ✅ Fixed missing destructuring in App.vue `<script setup>` - was the root cause of all Vue warnings
- ✅ Fixed TypeScript error with `startedAt` (null vs undefined)
- ✅ Verified consistent naming (flashcard prefix for all flash card state)

## Known Issues & Refinements Needed

### Functionality Issues
- [ ] Flash Cards: Words with punctuation might not hide correctly
- [ ] Flash Cards: Revealed words styling could be improved
- [ ] Hints: Underscore lengths might not match word lengths perfectly
- [ ] First Letters: Punctuation handling might need tweaking
- [ ] Navigation: "Got it!" / "Need Practice" doesn't reset mode to reference
- [ ] Mode switching: Some modes might not preserve verse position properly
- [ ] Keyboard shortcuts: Not yet integrated (handler exists but not hooked up)

### Styling Issues
- [ ] Mode buttons: Active state could be more obvious
- [ ] Flash Cards: Hidden words underline style could be improved
- [ ] Flash Cards: Revealed words (red text) might not be clear enough
- [ ] Hints: Underscores might need better spacing
- [ ] First Letters: Font and spacing might need adjustment
- [ ] Mobile: Mode buttons might be too large/small on different screens
- [ ] Mobile: Flash Cards clickable words might be too small on touch devices
- [ ] Metadata footer: Tags might overflow on mobile
- [ ] Navigation buttons: Could use better disabled state styling

### UX Issues
- [ ] No indication of which mode is active except button color
- [ ] No keyboard shortcut help/documentation
- [ ] Flash Cards: No feedback when clicking revealed word
- [ ] Hints: No indication of how many hints are left
- [ ] Mode persistence: Switching verses resets mode (might want to preserve)
- [ ] No smooth transitions between modes
- [ ] Review completion flow might need mode reset

### Testing Needed
- [ ] Test with multi-paragraph verses
- [ ] Test with very long verses (>100 words)
- [ ] Test with verses containing special characters
- [ ] Test on mobile devices (touch targets, layout)
- [ ] Test all difficulty levels in Flash Cards
- [ ] Test navigation edge cases
- [ ] Test mode switching while reviewing

## Architecture Decisions

### Pattern Chosen: Modal Sub-Modes with State Machine
- Single Review tab with reactive state transitions
- State managed in `useReview.ts` composable (clean separation)
- Card-based UI that morphs between modes (not separate screens)
- Maintains glass-morphism aesthetic

### Why This Works
- Simpler than stack-based navigation
- Better mobile UX (no separate screens)
- Clean Vue 3 reactive patterns
- Easy to add more modes later
- Keyboard shortcuts integrate naturally

### Key Technical Choices
- `reviewMode` ref drives UI rendering (v-if based on mode)
- Mode switching always available (buttons always visible)
- Navigation (next/previous) resets to reference mode
- Flash cards uses Set for O(1) lookup of hidden/revealed words
- Content transformation functions are pure (no side effects)

## Files Modified

1. `client/src/composables/useReview.ts` - Added ~150 lines of Phase 2 logic
2. `client/src/App.vue` - Updated Review tab (~150 lines of new template)
3. `client/src/app.ts` - Added Phase 2 exports to return object

## Next Steps (Phase 2 Refinement)

**⚠️ IMPORTANT:** Before continuing implementation, review legacy app screenshots for styling/layout reference:
- `memory-bank/legacy-documentation/screenshot 1 - show verse.jpg`
- `memory-bank/legacy-documentation/screenshot 2 - first letters.jpg`
- `memory-bank/legacy-documentation/screenshot 3 - flash cards with a few forgotten words clicked.jpg`
- These show the correct layout, spacing, and visual hierarchy that should be matched
- `memory-bank/legacy-documentation/screenshot 4 - new app - my verses tab - sample card.jpg` - this shows the sample card in the my verses tab of our new app - which has an excellent, clean layout.  We should also look at the actual HTML/CSS for this as a template for clean styling, sizing, etc.

### Priority 1: Fix Critical Issues
1. Fix "Got it!" / "Need Practice" to reset mode
2. Fix Flash Cards word hiding with punctuation
3. Improve mobile touch targets
4. Test on actual mobile devices

### Priority 2: Polish UX
1. Add keyboard shortcuts integration
2. Add smooth transitions between modes
3. Improve active mode indication
4. Add hints remaining counter
5. Better Flash Cards revealed word styling

### Priority 3: Add Missing Features
1. Keyboard shortcut help overlay (press '?' key)
2. Mode persistence option (stay in hints mode across verses)
3. Flash Cards smart hiding (prefer nouns/verbs)
4. Progressive hints starting point customization

### Priority 4: Testing & Documentation
1. Comprehensive manual testing checklist
2. Update user documentation
3. Create testing data (verses with edge cases)
4. Mobile device testing

## Timeline
- **Session Duration:** ~2 hours (with debugging)
- **Lines Changed:** ~400 lines across 3 files
- **Status:** MVP functional, needs refinement
- **Next Session:** Focus on bug fixes and polish

## Lessons Learned

### What Went Well
- Composables pattern worked perfectly for organizing logic
- Vue 3 reactive state made mode switching trivial
- TypeScript caught many issues early
- Incremental approach (state → UI → exports) was effective

### What Was Challenging
- Debugging missing destructuring took time (should have checked earlier)
- Flash Cards word hiding logic needed iteration
- First Letters punctuation handling is tricky
- Mobile responsive design needs more attention

### Technical Insights
- Always check destructuring in `<script setup>` when properties are "missing"
- Pure transformation functions are easier to test and debug
- Sets are perfect for tracking word indices (O(1) operations)
- Vue's v-if with computed properties performs well even with complex logic
