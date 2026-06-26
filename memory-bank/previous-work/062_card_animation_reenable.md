# 062 - Card Slide Animation Re-enablement

**Date:** January 27, 2026
**Status:** Complete

## Problem
Card slide animations were temporarily disabled after Phase 3 component refactoring. The root cause was that `useReview()` was called without `cardElement` parameter in app.ts, so `transitions = null` and all animations were skipped.

## Solution
Implemented the "Component DOM Ownership" pattern from systemPatterns.md §7 - ReviewTab now manages card transitions entirely internally.

## Architecture Change

**Before (broken):**
```
app.ts → useReview() [no cardElement] → transitions = null
App.vue passes undefined animation props to ReviewTab
Result: No animations
```

**After (working):**
```
ReviewTab owns useCardTransitions internally
ReviewTab handles exit animation → emits navigate event
Parent handles navigation logic → verse changes
ReviewTab watches verse change → handles entry animation
```

## Key Changes

### ReviewTab.vue
- Added `useCardTransitions` import and initialization with internal `cardElement`
- Created `handleAnimatedNavigation()` - runs exit animation then emits `navigate` event
- Added watcher on `currentReviewVerse.id` to trigger entry animations
- Updated swipe handlers to use `handleAnimatedNavigation()`
- Updated nav button clicks to use `handleAnimatedNavigation()`
- Removed animation props from defineProps (cardOffset, cardVisible, transitionDuration)
- Applied animation state directly from internal transitions composable
- Added new `navigate` emit replacing separate previousClick/nextClick/swipeLeft/swipeRight

### App.vue
- Removed animation prop bindings
- Added `handleNavigate()` handler for new `@navigate` event
- Removed unused transition state imports

### useReview.ts
- Removed `useCardTransitions` import and initialization
- Removed `cardElement` parameter from function signature
- Simplified `navigate()` to only handle navigation logic (no animation coordination)
- Simplified `viewLastCard()` to not use transitions
- Removed transition state exports

### app.ts
- Removed transition state exports

## Pattern Applied
Component DOM Ownership (systemPatterns.md §7):
- ReviewTab owns cardElement and all DOM interactions
- ReviewTab manages animations internally
- Parent orchestrates business logic via events
- No convoluted ref-passing patterns

## Files Modified
- `client/src/components/tabs/ReviewTab.vue`
- `client/src/App.vue`
- `client/src/composables/useReview.ts`
- `client/src/app.ts`

## Build Status
TypeScript compilation: ✅ Success
Vite build: ✅ Success
