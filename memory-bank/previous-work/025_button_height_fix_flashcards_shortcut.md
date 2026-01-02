# 025 - Button Height Fix & Flash Cards Keyboard Shortcut

**Date:** February 1, 2026  
**Status:** ✅ Complete  
**Related:** Phase 2 Review Modes

## Problem Identified

User noticed two UX issues with the review mode buttons:

1. **Button Height Inconsistency:** When Flash Cards button was selected (showing +/− controls), ALL buttons in the row increased in height slightly, causing a jarring layout shift
2. **Missing Keyboard Shortcut:** Flash Cards mode didn't have a keyboard shortcut like the other modes (h, f, Escape)

## Root Cause Analysis

### Button Height Issue
The Flash Cards +/− buttons had `font-size: 1.25rem` (20px) while other buttons used default size (16px). Since all buttons were in a flex container, the container expanded to fit the tallest child, affecting all buttons.

### Missing Shortcut
Simply an oversight during Phase 2 implementation - the pattern was established but Flash Cards was missed.

## Solution Implemented

### 1. Fixed Button Height (`client/src/styles.css`)

**Changed font-size of +/− buttons:**
```css
.flashcard-sub-button-in-group {
    font-size: 1rem; /* Changed from 1.25rem */
    /* ... other styles ... */
}
```

### 2. Added Width Consistency (`client/src/styles.css`)

**Prevented layout shift when toggling modes:**
```css
.flashcard-button-inactive {
    min-width: 10.5rem; /* 168px - matches active group width */
}
```

Applied to both desktop and mobile Flash Cards buttons in `App.vue`:
```vue
<button class="mode-button-inactive flashcard-button-inactive ...">
  Flash Cards
</button>
```

### 3. Added 'c' Keyboard Shortcut (`client/src/composables/useReview.ts`)

**Added case in handleKeyPress function:**
```typescript
case 'c':
  switchToFlashCards();
  return true;
```

### 4. Updated Documentation (`memory-bank/phase2-architecture.md`)

Added 'c' shortcut to keyboard shortcuts section in architecture documentation.

## Files Changed

1. `client/src/styles.css` - Fixed font-size, added width consistency class
2. `client/src/App.vue` - Applied flashcard-button-inactive class (2 locations: desktop + mobile)
3. `client/src/composables/useReview.ts` - Added 'c' keyboard shortcut handler
4. `memory-bank/phase2-architecture.md` - Documented keyboard shortcut

## Keyboard Shortcuts Summary

**Complete Shortcut Set:**
- `h` = **H**ints mode (or add hint if already in Hints)
- `f` = **F**irst Letters mode  
- `c` = Flash **C**ards mode ✨ **(NEW!)**
- `Space` = Smart button (Reveal → Next → Ref)
- `n` = Next verse (when content visible)
- `p` = Previous verse
- `Escape` = Back to Reference mode

## Testing Notes

- Buttons now maintain consistent height regardless of active mode
- No layout shift when switching between modes
- Width remains stable when Flash Cards toggles between states
- Keyboard shortcut 'c' works as expected
- All shortcuts follow mnemonic pattern

## Benefits

1. **Smoother UX** - No jarring height changes when switching modes
2. **Stable Layout** - Width consistency prevents button position shifts
3. **Keyboard Efficiency** - All review modes now have keyboard shortcuts
4. **Pattern Consistency** - 'c' follows same mnemonic pattern as h/f

## Technical Notes

**Why min-width instead of fixed width?**
- Allows button text to breathe naturally
- Prevents text overflow on smaller screens
- Still achieves goal of preventing layout shift

**Why 10.5rem specifically?**
- Calculated from active state: 2rem (left button) + content + 2rem (right button)
- Ensures inactive state takes same space as active state
- Prevents jarring layout shifts

## Related Work

- [020_phase2_review_modes_initial.md](020_phase2_review_modes_initial.md) - Initial Phase 2 implementation
- [022_phase2_ux_refinements_final.md](022_phase2_ux_refinements_final.md) - Button refinements
- [023_phase2_card_styling_alignment.md](023_phase2_card_styling_alignment.md) - Card styling alignment
- [024_spacebar_unified_behavior.md](024_spacebar_unified_behavior.md) - Spacebar behavior

## Lessons Learned

1. **Flex container gotcha:** Child element sizes affect all siblings in flex containers
2. **Font-size matters:** Even +/− symbols can affect layout when sizing differs
3. **Keyboard shortcuts:** Maintain complete coverage when adding UI features
4. **Width stability:** Prevent layout shifts by matching inactive/active widths
