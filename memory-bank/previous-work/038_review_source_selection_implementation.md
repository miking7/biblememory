# Review Source Selection & Actions Menu Implementation

**Date:** November 1, 2026  
**Status:** ✅ Complete  
**Related Spec:** [036_review_source_selection_spec.md](036_review_source_selection_spec.md)

## Summary

Implemented comprehensive review source selection system enabling flexible review workflows:
- Overflow menus to reduce UI clutter
- Dual review sources (daily queue and filtered verse lists)
- Direct review and edit actions from both tabs
- Unified card footer styling
- Proper z-index handling for dropdowns

## Features Implemented

### 1. My Verses Tab Enhancements

**Settings Cog Menu (Header)**
- Icon: `mdi mdi-cog` in top-right corner
- Dropdown with 3 actions:
  - Review These → starts filtered review from current list
  - Export → existing functionality
  - Import → existing functionality

**Three-Dot Menu (Verse Cards)**
- Icon: `mdi mdi-dots-vertical` in top-right corner of each card
- Dropdown with 3 actions:
  - Review This → starts filtered review at selected verse
  - Edit → opens edit modal
  - Delete → deletes verse with confirmation
- Z-index fix: Entire card elevates to `z-50` when menu open to prevent overlap

### 2. Review Tab Enhancements

**Dynamic Header**
- Title changes based on mode:
  - "Daily Review" (default)
  - "Filtered Review" (when reviewing filtered list)
- Back button appears in filtered mode only
  - Returns to daily review
  - Maintains daily review progress
- Immersive toggle remains in both modes

**Pencil Icon for Editing**
- Icon: `mdi mdi-pencil` in top-right of review card
- Opens edit modal for current verse
- Changes refresh immediately in review card after save

**Footer Enhancements**
- Flattened layout (tags wrap with other elements, not grouped)
- Displays: Age | Category chip | Tag chips | Progress (right-aligned)
- Age shown in abbreviated format: 2d, 3w, 5m, 15y
- Progress indicator: "3/9" format with `ml-auto` for right-alignment
- Category in lowercase (no capitalization)

**Badge Visibility**
- Review tab badge only shows in daily mode
- Hidden during filtered review

### 3. State Management

**New State Variables (useReview.ts)**
```typescript
reviewSource: 'daily' | 'filtered' = 'daily'
filteredReviewVerses: Verse[] = []
```

**Source Logic**
- `currentReviewVerse` computed from correct source array
- `totalReviewCount` uses correct source length
- Navigation respects current source bounds

**Review Initialization**
- Daily review loaded on app init (not just on first visit)
- Prevents "All caught up" message when using filtered review before visiting Review tab

**State Transitions**
- Manual Review tab click → returns to daily mode (maintains progress)
- Review These/This → switches to filtered mode
- Back button → returns to daily mode
- Daily review only regenerates on "Review Again" or initial load

### 4. Edit During Review

**Refresh Mechanism**
- New function: `refreshCurrentVerse(updatedVerse)` in useReview.ts
- Updates verse in active review array (daily or filtered)
- Wrapper function in app.ts: `saveEditVerseAndRefresh()`
- Changes appear immediately without navigation

**Simplified Approach**
- Verse stays in review even if edited to no longer match filter
- Avoids confusion from sudden verse removal
- User can finish review session smoothly

## Technical Implementation

### Files Modified

**client/src/composables/useReview.ts**
- Added `reviewSource` and `filteredReviewVerses` state
- Added `startFilteredReview()` method
- Added `returnToDailyReview()` method
- Added `refreshCurrentVerse()` method
- Added `getAbbreviatedAge()` helper
- Updated `currentReviewVerse` and `totalReviewCount` computed properties
- Modified `loadReviewVerses()` to not regenerate unnecessarily
- Modified `resetReview()` to handle both sources differently

**client/src/app.ts**
- Added `startReviewFromFiltered()` handler
- Added `startReviewAtVerse()` handler
- Added `saveEditVerseAndRefresh()` wrapper
- Exposed new functions to template
- Added `loadReviewVerses()` to init sequence

**client/src/App.vue**
- Added settings cog menu to My Verses header
- Added three-dot menu to review cards (via VerseCard component)
- Added pencil icon to review card header
- Updated review header with dynamic title and back button
- Updated footer layout to flattened structure
- Fixed badge visibility condition
- Fixed empty state condition to use `totalReviewCount`
- Added `showMyVersesMenu` local state
- Updated review card click handlers

**client/src/components/VerseCard.vue**
- Added three-dot menu dropdown
- Removed old Edit/Delete buttons
- Added "Review This" menu item
- Fixed z-index with card elevation pattern
- Updated footer to flattened layout (matching review cards)

### Key Patterns Used

**Card Elevation Pattern**
```vue
:class="[
  'verse-card',
  showMenu ? 'relative z-50' : 'relative'
]"
```
- Entire card elevates when menu open
- Ensures dropdown appears above subsequent cards
- More reliable than nested z-index

**Flattened Footer Layout**
```vue
<div class="flex flex-wrap items-center gap-2">
  <span>Age</span>
  <span>Category</span>
  <span>Tag 1</span>
  <span>Tag 2</span>
  <div class="ml-auto">Progress</div>
</div>
```
- All elements at same level (no grouping)
- Tags wrap individually with other elements
- `ml-auto` pushes last element right even when wrapping

**Dual Review Source Pattern**
```typescript
const currentReviewVerse = computed(() => {
  const verses = reviewSource.value === 'daily' 
    ? dueForReview.value 
    : filteredReviewVerses.value;
  return verses[currentReviewIndex.value];
});
```
- Single computed property switches between sources
- Clean separation of concerns
- Easy to extend with additional sources

## Challenges Overcome

### 1. Initial Load Issue
**Problem:** "Review These/This" didn't work before manually visiting Review tab  
**Root Cause:** `dueForReview` array empty until `loadReviewVerses()` called  
**Solution:** Added `loadReviewVerses()` to app initialization sequence

### 2. Empty State Logic
**Problem:** Wrong array checked (always checking `dueForReview`)  
**Root Cause:** Hard-coded reference to daily array  
**Solution:** Changed to use `totalReviewCount` computed property

### 3. Edit Refresh
**Problem:** Changes not visible in review card after editing  
**Root Cause:** Review arrays are snapshots, not reactive to main verses array  
**Solution:** Added `refreshCurrentVerse()` to update specific verse in review array

### 4. Tag Wrapping
**Problem:** Tags wrapped as a group, not individually with other elements  
**Root Cause:** Tags nested in separate div  
**Solution:** Flattened structure - all elements at same level

### 5. Progress Indicator Alignment
**Problem:** Lost right-alignment when wrapping occurred  
**Root Cause:** `justify-between` doesn't work with wrapping  
**Solution:** Used `ml-auto` to push element right automatically

### 6. Z-Index Overlap
**Problem:** Dropdown menu hidden behind subsequent cards  
**Root Cause:** Cards have default stacking context  
**Solution:** Elevate entire card to `z-50` when menu open (not just menu)

## Testing Completed

- ✅ Settings menu opens/closes correctly
- ✅ "Review These" captures filtered list
- ✅ "Review These" works immediately after app load
- ✅ Three-dot menu on verse cards
- ✅ "Review This" positions at selected verse
- ✅ Edit/Delete work from menu
- ✅ Dynamic header title
- ✅ Back button in filtered mode
- ✅ Badge visibility by mode
- ✅ Pencil icon opens edit modal
- ✅ Footer styling consistent across both tabs
- ✅ Tags wrap individually with elements
- ✅ Progress indicator stays right-aligned
- ✅ Category displays in lowercase
- ✅ Edit changes refresh immediately
- ✅ Empty state logic correct
- ✅ Z-index properly handled

## Design Decisions

### Simplified Edit Behavior
**Decision:** Keep edited verse in review even if no longer matches filter  
**Rationale:**
- Avoids user confusion from sudden removal
- Allows completing review session smoothly
- Matches user mental model (I'm reviewing these specific verses)
- Filtering happens at review start, not during

### Card Elevation vs Nested Z-Index
**Decision:** Elevate entire card when menu open  
**Rationale:**
- More reliable than nested z-index tricks
- Creates proper stacking context
- Works across all browsers
- Visual feedback that card is "active"

### Flattened Footer Layout
**Decision:** Remove tag grouping div, flatten all elements  
**Rationale:**
- Better wrapping behavior (tags wrap with other elements)
- More flexible layout
- Matches modern CSS best practices
- Easier to maintain

### ml-auto for Right Alignment
**Decision:** Use `ml-auto` instead of `justify-between`  
**Rationale:**
- Works correctly with flex wrapping
- Pushes element right even on wrapped lines
- More predictable behavior
- Single source of truth for alignment

## Future Enhancements

These were explicitly excluded from current scope:
- Queue list preview/drawer
- Collapsible verse list during review
- Filter context display in header
- Review session statistics
- Persistent filtered mode across restarts
- Reordering verses within filtered review
- Filter mismatch after edit (simplified to keep verse)

## Lessons Learned

1. **Early Loading Matters:** Initialize all data needed by features, not just current tab
2. **Computed Properties for Sources:** Better than conditionals throughout code
3. **Card Elevation Pattern:** More reliable than nested z-index for dropdowns
4. **Flattened Layouts:** Better wrapping behavior than grouped elements
5. **ml-auto for Flex:** Works better with wrapping than justify-between
6. **Simplify Complex Logic:** Edited verse filter checking deferred (YAGNI principle)

## Related Documentation

- Comprehensive spec: [036_review_source_selection_spec.md](036_review_source_selection_spec.md)
- Phase 2 architecture: [../phase2-architecture.md](../phase2-architecture.md)
- Product context: [../productContext.md](../productContext.md)
