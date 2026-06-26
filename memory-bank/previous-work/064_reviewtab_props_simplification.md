# ReviewTab Props Simplification

**Date:** 2026-01-27
**Status:** Complete

## Goal

Reduce ReviewTab props from 21 → 12 (43% reduction) by extracting pure functions to utils and computing derived values internally.

## Architecture Decisions

1. **Pure functions → utils/** - Direct imports only, no re-exports through composables
2. **Export interfaces** - Types exported alongside functions that use them
3. **Component computes internally** - Swipe boundaries and verse-dependent helpers computed inside ReviewTab

## Changes Made

### 1. Created `utils/reviewHelpers.ts`
- Exported interfaces: `WordItem`, `Tag`
- Pure functions: `getAbbreviatedAge`, `formatTagForDisplay`, `getWords`, `getHintedContent`

### 2. Modified `ReviewTab.vue`
- Removed 9 props (swipe boundaries + helper functions)
- Added imports from `utils/reviewHelpers.ts` and `utils/firstLetters.ts`
- Added internal computed: `canSwipeLeft`, `canSwipeRight`
- Added internal helpers: `getReferenceWords()`, `getContentWordsStartIndex()`

### 3. Modified `App.vue`
- Removed 9 props from ReviewTab component usage
- Removed 7 unused destructured values from `bibleMemoryApp()`

### 4. Modified `useReview.ts`
- Imports `getWords` from utils for internal use in `generateHiddenWords`
- Removed local implementations (now in utils)
- Cleaned up return statement (removed 10+ functions no longer needed externally)
- Removed dead code: `wordSplit`, `getFirstLettersContent`

### 5. Modified `app.ts`
- Removed re-exports for functions that no longer exist in useReview

## Props Before/After

**Before (21 props):**
- 8 review state props
- 5 review mode props
- 2 swipe boundary props
- 7 helper function props

**After (12 props):**
- 8 review state props
- 5 review mode props (unchanged)
- Swipe boundaries: computed internally
- Helper functions: imported directly from utils

## Architecture Improvement

- **`utils/`** = Pure functions + types (stateless, testable, direct import)
- **`composables/`** = Reactive state + stateful methods only
- **Components** = Compute derived values internally when they depend only on props

## Files Changed

- `client/src/utils/reviewHelpers.ts` (created)
- `client/src/components/tabs/ReviewTab.vue`
- `client/src/App.vue`
- `client/src/composables/useReview.ts`
- `client/src/app.ts`
