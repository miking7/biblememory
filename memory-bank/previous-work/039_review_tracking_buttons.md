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

## Visual Feedback Enhancement (Added)

### Problem
After pressing "Got it!" or "Again", the verse would immediately advance with no visual confirmation that the action was registered.

### Solution

**Card Tint Feedback:**
- **Green tint** (`review-card-gotit` class) when verse marked "Got it" today
- **Amber tint** (`review-card-again` class) when verse marked "Again" today
- 400ms delay after button press - user sees color flash before advancing
- Status persists when navigating back/forward between cards
- Works across page refresh (loads from DB)
- Syncs from server (remote reviews update cache)

### Implementation

**Review Cache System (`actions.ts`):**
- `recentReviewsCache: Map<number, 'gotit' | 'again'>` - in-memory cache of today's reviews
- `updateReviewCache(verseId, outcome)` - update cache when review recorded
- `getVerseReviewStatus(verseId)` - get status for current verse
- `initializeReviewCache()` - load today's reviews from DB on startup

**UI Integration:**
- `currentVerseReviewStatus` ref in `useReview.ts` - tracks status for current verse
- Updates automatically when navigating between verses
- Dynamic `:class` binding on review card in `App.vue`

**CSS Classes (`styles.css`):**
```css
.review-card-gotit {
  background: linear-gradient(135deg,
    rgba(16, 185, 129, 0.08) 0%,
    rgba(255, 255, 255, 1) 100%);
  border-color: rgba(16, 185, 129, 0.3);
}

.review-card-again {
  background: linear-gradient(135deg,
    rgba(245, 158, 11, 0.08) 0%,
    rgba(255, 255, 255, 1) 100%);
  border-color: rgba(245, 158, 11, 0.3);
}
```

### Files Changed (Visual Feedback - Review Tab)

1. **client/src/actions.ts** - Added `recentReviewsCache` Map + helper functions
2. **client/src/composables/useReview.ts** - Added `currentVerseReviewStatus` ref, 400ms delay in `markReview()`
3. **client/src/sync.ts** - Call `updateReviewCache()` when pulling review ops
4. **client/src/styles.css** - Added `.review-card-gotit` and `.review-card-again` classes
5. **client/src/app.ts** - Initialize cache on startup, export status
6. **client/src/App.vue** - Dynamic `:class` binding on review card

## My Verses Tab Visual Feedback (Extended)

Extended the review status visual cues to the My Verses tab, providing consistent feedback across the app.

### Implementation

- **VerseCard.vue**: Added optional `reviewStatus` prop (`'recall' | 'practice' | null`)
- **App.vue**: Pass review status via `getCachedReviewStatus(verse.id)?.lastReviewType`
- Reuses existing CSS classes (`.review-card-gotit`, `.review-card-again`)
- Synchronous lookup from cache - no additional DB queries

### User Experience

When browsing My Verses:
- Cards with **green tint** = marked "Got it" today
- Cards with **amber tint** = marked "Again" today
- Provides at-a-glance visibility of today's review progress

### Files Changed (My Verses Tab)

1. **client/src/components/VerseCard.vue** - Added `reviewStatus` prop, conditional CSS classes
2. **client/src/App.vue** - Import `getCachedReviewStatus`, pass status to VerseCard

## Bug Fixes

### CSS Transparency Issue
**Problem:** rgba() transparency in card backgrounds caused visual artifacts with overlapping cards in My Verses tab (compact mode).

**Solution:** Changed to solid RGB colors:
```css
.review-card-gotit {
    background: linear-gradient(to bottom, rgb(236, 249, 245), white) !important;
    border-color: rgb(183, 234, 217) !important;
}
.review-card-again {
    background: linear-gradient(to bottom, rgb(254, 247, 235), white) !important;
    border-color: rgb(252, 226, 182) !important;
}
```

### Initial Tab Load Status
**Problem:** Review status not showing when first entering Review tab - only updated after navigating to next/previous verse.

**Solution:** Added `watch` on `currentReviewVerse` with `{ immediate: true }` in useReview.ts. The watch triggers `updateCurrentVerseReviewStatus()` whenever the current verse changes, including:
- Initial app load
- Tab switching to Review
- Starting filtered review
- Returning to daily review

### Commits

```
76c8ef5 feat: add review tracking with Got it/Again buttons
5e53716 feat: add visual feedback for reviewed verses (green/amber card tint)
8dca1d9 fix: add currentVerseReviewStatus to App.vue destructuring
664bc14 feat: add review status visual feedback to My Verses cards
6a3e722 fix: review status visual feedback bugs (CSS + initial load)
```
