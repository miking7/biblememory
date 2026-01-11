# 039 - Review Tracking Buttons Implementation

**Date:** January 11, 2026
**Status:** Complete

## Summary

Added "Got it!" and "Again" action buttons to enable explicit review tracking, connecting the stats display (Reviewed Today, Day Streak) to actual user actions.

## Problem

The app had infrastructure for tracking verse reviews but no UI to trigger it:
- `recordReview()` function existed in actions.ts
- `markReview()` function existed in useReview.ts
- Stats display (Reviewed Today, Day Streak) was showing 0 because no reviews were being recorded
- Users could only navigate with Previous/Next arrows without explicit success/failure marking

## Solution

### UI Changes

**Desktop Layout:**
- Mode buttons row (Hint, Flash Cards, First Letters, Reveal/Next) with icons + text
- Action buttons row below (Again, Got it!) - only visible when verse fully revealed

**Mobile Layout:**
- Action buttons row above mode buttons (icon + text)
- Mode buttons row with icons only (4 buttons on one row for space efficiency)

### Button Styling

- **Got it!** (green): `mdi-check` icon, emerald gradient background
- **Again** (amber): `mdi-refresh` icon, amber gradient background (soft negative, not punishing red)

### Progressive Disclosure

Action buttons only appear when:
- `reviewMode === 'content'` (verse fully revealed)
- Smart button shows "Next" (not "Reveal")

### Smart Button Dynamic Icon

- Shows `mdi-eye-outline` when label is "Reveal"
- Shows `mdi-chevron-right` when label is "Next"

## Files Changed

1. **client/src/App.vue**
   - Restructured desktop/mobile button layouts
   - Added icons to all mode buttons
   - Added action buttons with visibility conditions
   - Dynamic icon for smart button

2. **client/src/styles.css**
   - Added `.action-button-gotit` styles (emerald gradient)
   - Added `.action-button-again` styles (amber gradient)

3. **client/src/composables/useReview.ts**
   - Fixed `markReview()` to handle filtered review mode correctly

## Technical Details

### markReview Function Flow
1. Records review with 'recall' (success) or 'practice' (failure)
2. Calls updateStats() to refresh reviewedToday and currentStreak
3. Resets to reference mode
4. Advances to next verse
5. Checks completion based on current review source (daily or filtered)

### Mode Button Icons
- Hint: `mdi-tooltip-question-outline`
- Flash Cards: `mdi-cards-outline`
- First Letters: `mdi-alphabet-latin`
- Reveal/Next: `mdi-eye-outline` / `mdi-chevron-right`

## Design Decisions

1. **Amber instead of red for "Again"**: Red feels punishing ("wrong answer"). Amber conveys "needs attention" without negative emotion.

2. **"Again" instead of "Need Practice"**: Shorter, neutral term borrowed from Anki. Less like failure, more like iteration.

3. **Action buttons above mode buttons on mobile**: Keeps mode buttons anchored at bottom (muscle memory). Action buttons relate to content above.

4. **Icons only on mobile mode buttons**: Saves horizontal space to fit all 4 buttons on one row.

5. **Progressive disclosure**: Action buttons appear only after reveal to prevent mindless skipping.
