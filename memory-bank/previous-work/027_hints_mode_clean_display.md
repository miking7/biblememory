# 027 - Hints Mode Clean Display

**Date:** 2026-03-01  
**Status:** Complete ✅

## Overview
Simplified the hints mode UI to show only visible words followed by "..." instead of showing underline placeholders for hidden words. This creates a cleaner, more focused experience.

## Changes Made

### 1. Modified `getHintedContent()` Function
**File:** `client/src/composables/useReview.ts`

**Before:**
- Showed visible words normally
- Replaced hidden words with underscores matching word length: `____`
- Result: `For God so loved ___ _____ __ _____ ___ __ ___`

**After:**
- Shows only visible words
- Adds "..." at the end (unless all words are visible)
- Preserves paragraph structure (multi-line verses)
- Result: `For God so loved...`

**Implementation:**
- Counts total words across all lines
- If showing all words, returns original content unchanged
- Otherwise, collects visible words line-by-line
- Adds "..." immediately after last visible word
- Maintains original paragraph breaks with `\n`

### 2. Removed Word Count Indicator
**File:** `client/src/App.vue`

**Removed:**
```vue
<p class="text-sm text-slate-500 mt-2">
  Showing <span class="font-bold" v-text="hintsShown"></span> of
  <span class="font-bold" v-text="getWords(currentReviewVerse.content).filter(w => w.isWord).length"></span> words
</p>
```

**Rationale:** The clean display with "..." is self-explanatory - no need for additional UI clutter explaining word counts.

## User Experience Impact

### Before
- Visual clutter with many underscores
- Emphasized what's hidden rather than what's visible
- Word count added extra information but created cognitive load

### After
- Clean, minimal display
- Focuses attention on visible words
- "..." clearly indicates more content without distracting from memorization
- Matches common UX patterns (email previews, search results, etc.)

## Technical Details

**Edge Cases Handled:**
1. **All words visible:** Returns original content without "..." 
2. **Multi-paragraph verses:** Preserves line breaks, adds "..." at natural end point
3. **Last word visible:** Still shows "..." if any words remain hidden
4. **Empty lines:** Preserved in output for paragraph spacing

**Logic Flow:**
1. Split content into words using `/\s+/` regex
2. Count total words for comparison
3. If `wordsToShow >= totalWords`, return original content
4. Otherwise, iterate through lines collecting words until limit reached
5. Add "..." to last collected line
6. Join lines with `\n` to preserve paragraphs

## Files Modified
- `client/src/composables/useReview.ts` - Modified `getHintedContent()` function
- `client/src/App.vue` - Removed word count indicator

## Testing Notes
- Verified single-paragraph verses display correctly
- Verified multi-paragraph verses maintain structure
- Verified ellipsis appears except when all words shown
- Verified clicking adds hints progressively
- Verified font remains monospace for clean character alignment

## Related Work
- Phase 2 review modes implementation (previous-work/020)
- Phase 2 UX refinements (previous-work/022)
- Hints mode is part of the 5-mode review system

## Status
**Complete** - Ready for production use. Hints mode now has cleaner, more focused UX.
