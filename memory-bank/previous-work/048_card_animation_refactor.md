# 048: Card Animation System Refactor

**Date:** 2026-01-17
**Status:** ✅ Complete
**Type:** Refactoring - Architecture Improvement

## Overview

Completely refactored the card animation system to use a clearer, more maintainable architecture based on **separation of concerns**. The new system decouples animation primitives from business logic, making the code significantly easier to reason about, test, and extend.

## Problem Statement

The original animation system (`useSwipe.ts`) had several architectural issues:

### Tight Coupling
- Animation logic embedded business logic (navigation callbacks inside animation timing)
- Touch detection, animation state, and navigation decisions all mixed together
- Hard to understand what happens when: 3-phase animation with nested `setTimeout` chains

### Complex State Machine
- 6 interrelated state flags (`isSwiping`, `swipeOffset`, `swipeDirection`, `isAnimatingExit`, `isAnimatingEnter`, `isPositioning`)
- Flags controlled by nested timeouts across multiple phases
- Easy to get out of sync, potential race conditions

### Poor Maintainability
- Business logic hidden inside animation code
- Nested callback hell (setTimeout → nextTick → setTimeout → setTimeout)
- Difficult to test (can't test animation without triggering navigation)
- Hard to debug (must mentally unwind nested timeout stack)

### Example of Old Complexity

```typescript
// What does this do? Must read 40 lines of nested timeouts to understand
triggerAnimatedNavigation('left');

// Inside implementation:
setTimeout(() => {
  callback();
  nextTick(() => {
    isPositioning.value = true; // Why?
    setTimeout(() => {
      isPositioning.value = false; // Why?
      setTimeout(() => { /* ... */ }, 10);
    }, 20);
  });
}, 300);
```

## Solution: Decoupled Primitives

### New Architecture

Split the monolithic animation system into **two focused composables**:

#### 1. useCardTransitions.ts - Pure Animation Primitives

**Purpose:** Animate card entry/exit, nothing else

**Key Features:**
- Two async functions: `exitTransition()` and `entryTransition()`
- Returns Promises for clean async/await composition
- No business logic - just animates things
- Handles reduced-motion preference internally
- Simple animation lock prevents overlapping

**API:**
```typescript
const {
  exitTransition,    // async (direction, duration) => Promise<void>
  entryTransition,   // async (direction, duration) => Promise<void>
  isTransitioning,   // ref<boolean>
  cardOffset,        // ref<number>
  cardVisible,       // ref<boolean>
  transitionDuration // ref<string>
} = useCardTransitions(element);
```

**Usage:**
```typescript
await exitTransition({ direction: 'left', duration: 300 });
// Business logic decides what happens here
nextVerse();
await entryTransition({ direction: 'right', duration: 150 });
```

#### 2. useSwipeDetection.ts - Touch Gesture Detection

**Purpose:** Detect valid horizontal swipes, nothing else

**Key Features:**
- Tracks finger position during drag
- Validates swipe success (horizontal, sufficient distance)
- Calls callbacks when valid swipe detected
- Provides visual feedback during drag (boundary resistance)
- No animation logic

**API:**
```typescript
const {
  isSwiping,   // ref<boolean>
  swipeOffset  // ref<number>
} = useSwipeDetection(element, {
  onSwipeLeft: () => handleSwipeLeft(),
  onSwipeRight: () => handleSwipeRight(),
  threshold: 50,
  canSwipeLeft: () => canNavigateLeft.value,
  canSwipeRight: () => canNavigateRight.value,
});
```

### State Simplification

**Before: 6 Interrelated Flags**
```typescript
const isSwiping = ref(false);
const swipeOffset = ref(0);
const swipeDirection = ref(null);
const isAnimatingExit = ref(false);
const isAnimatingEnter = ref(false);
const isPositioning = ref(false); // Why did this exist?
```

**After: 3 Clear Flags**
```typescript
// Animation state (useCardTransitions)
const isTransitioning = ref(false); // Simple lock
const cardVisible = ref(true);      // Visibility
const cardOffset = ref(0);          // Position

// Swipe feedback (useSwipeDetection)
const isSwiping = ref(false);       // User dragging
const swipeOffset = ref(0);         // Finger delta
```

## Implementation Examples

### Button Navigation (Clear Linear Flow)

**Before:**
```typescript
const navigateWithAnimation = (direction: 'left' | 'right') => {
  triggerAnimatedNavigation(direction); // What happens? Must read implementation
};
```

**After:**
```typescript
async function handleNextClick() {
  if (!canNavigateLeft.value || isTransitioning.value) return;

  await exitTransition({ direction: 'left', duration: 300 });
  nextVerse(); // Business logic clear and visible
  await entryTransition({ direction: 'right', duration: 150 });
}
```

### Review Buttons (Explicit Sequencing)

**Before:**
```typescript
const markReviewWithAnimation = (success: boolean) => {
  markReview(success, () => {
    triggerAnimatedNavigation('left'); // Callback hell
  });
};
```

**After:**
```typescript
async function handleGotIt() {
  if (isTransitioning.value) return;

  await markReview(true); // Record review
  await sleep(400); // Visual feedback (green tint)

  await exitTransition({ direction: 'left', duration: 300 });

  if (canNavigateLeft.value) {
    nextVerse(); // Business logic decides
    await entryTransition({ direction: 'right', duration: 150 });
  } else {
    // Last card - just exit, completion screen shows
  }
}
```

### Swipe Gestures (Detection + Animation)

**Before:** Everything tangled together in one composable

**After:**
```typescript
// Detection (separate concern)
const { isSwiping, swipeOffset } = useSwipeDetection(element, {
  onSwipeLeft: () => handleSwipeLeft(),
  // ...
});

// Animation (async handler with business logic)
async function handleSwipeLeft() {
  if (!canNavigateLeft.value || isTransitioning.value) return;

  await exitTransition({ direction: 'left', duration: 300 });
  nextVerse(); // Business logic explicit
  await entryTransition({ direction: 'right', duration: 150 });
}
```

## Template Binding Simplification

**Before: Complex Conditional Logic**
```vue
:style="{
  transform: `translateX(${swipeOffset}px)`,
  transition: (isSwiping || isPositioning)
    ? 'none'
    : isAnimatingExit
      ? 'transform 0.3s ease-out'
      : isAnimatingEnter
        ? 'transform 0.15s ease-out'
        : 'transform 0.3s ease-out'
}"
```

**After: Simple, Clear**
```vue
:style="{
  transform: `translateX(${isSwiping ? swipeOffset : cardOffset}px)`,
  transition: isSwiping ? 'none' : `transform ${transitionDuration} ease-out`,
  opacity: cardVisible ? 1 : 0
}"
```

## Files Changed

### New Files Created
- ✅ `client/src/composables/useCardTransitions.ts` (180 lines) - Animation primitives
- ✅ `client/src/composables/useSwipeDetection.ts` (165 lines) - Touch detection

### Modified Files
- ✅ `client/src/App.vue` - Updated all navigation handlers to use new API
  - Button handlers: `handlePreviousClick()`, `handleNextClick()`
  - Review handlers: `handleGotIt()`, `handleAgain()`
  - Swipe handlers: `handleSwipeLeft()`, `handleSwipeRight()`
  - Card click handler: `handleCardClickWithAnimation()`
  - Keyboard shortcut integration via `setAnimatedNavigate()`

### Documentation Created
- ✅ `ANIMATION_SYSTEM_ANALYSIS.md` - Detailed analysis of old system (created during investigation)
- ✅ `REFACTOR_SUMMARY.md` - Complete refactor documentation with examples

### Deleted Files
- ✅ `client/src/composables/useSwipe.ts` - Old monolithic implementation (289 lines)

## Benefits Achieved

### Code Quality
- ✅ **Easier to Reason About:** Linear async/await flow, read top-to-bottom
- ✅ **Better Separation:** Animation primitives contain zero business logic
- ✅ **More Testable:** Can test animation and detection independently
- ✅ **Simpler State:** 3 clear flags instead of 6 interrelated ones

### Maintainability
- ✅ **Explicit Control Flow:** Business logic in App.vue, visible and clear
- ✅ **No Hidden Behavior:** Navigation decisions explicit, not buried in animation code
- ✅ **Easier to Debug:** Can add breakpoints between transitions, inspect state clearly
- ✅ **Composable Primitives:** Can mix/match transitions for new UX patterns

### Reliability
- ✅ **Race Condition Prevention:** Animation lock prevents overlapping animations
- ✅ **No State Sync Issues:** Simpler state = fewer bugs
- ✅ **Predictable Behavior:** Each transition completes before next starts

### Flexibility
- ✅ **Multiple Scenarios:** Exit without entry (completion), entry without exit (initial), instant (loading)
- ✅ **Easy Extensions:** Can add new animation types (fade, scale) without refactoring
- ✅ **Reusable Primitives:** Could use in other parts of app if needed

## All Navigation Methods Migrated

- ✅ Previous/Next buttons
- ✅ Got it!/Again review buttons
- ✅ Swipe gestures (left/right)
- ✅ Keyboard shortcuts (via `setAnimatedNavigate`)
- ✅ Card click (spacebar in reveal mode)

## Design Philosophy

The refactor follows a core principle:

> **Animation primitives should be dumb.**
>
> They animate things. They don't decide what happens next.
> Business logic decides what happens next.

This separation makes code:
- Easier to read (linear flow)
- Easier to test (isolated concerns)
- Easier to debug (explicit control flow)
- Easier to extend (composable primitives)

## Future Enhancements Made Easy

Now that animations are decoupled, these become trivial:

1. **Different Animation Types**
   - Add `fadeTransition()`, `scaleTransition()`, etc.
   - Mix and match for different UX flows

2. **Conditional Animations**
   - Skip animations based on user preference
   - Different timings per device type
   - Instant transitions for testing

3. **Parallel Animations**
   - Animate multiple cards simultaneously
   - Coordinate complex transitions

4. **Advanced Patterns**
   - Spring physics (replace linear easing)
   - Velocity-based timing (faster swipe = faster animation)
   - Gesture interruption (cancel mid-animation)

All without modifying core primitives—just compose them differently.

## Migration Pattern

Template for adding new navigation methods:

```typescript
async function handleNewNavigation() {
  if (isTransitioning.value) return; // 1. Check lock

  await exitTransition({ direction: 'left', duration: 300 }); // 2. Exit

  // 3. Business logic
  doSomething();

  // 4. Entry (if needed)
  if (shouldShowNextCard) {
    await entryTransition({ direction: 'right', duration: 150 });
  }
}
```

## Technical Details

### Animation Primitive Behavior

**`exitTransition(config)`:**
1. Checks `isTransitioning` lock
2. Sets transition duration based on config + reduced-motion
3. Animates card off-screen (1.5× viewport width)
4. After duration, hides card and resets position to center
5. Releases lock

**`entryTransition(config)`:**
1. Checks `isTransitioning` lock
2. Positions card off-screen opposite direction (instant, no transition)
3. Makes card visible
4. Animates card to center
5. After duration, releases lock

### Reduced Motion Support

Preserved from old system:
- JavaScript checks `prefers-reduced-motion` preference
- Returns `duration = 0` for instant transitions
- CSS media query provides fallback

### Visual Feedback Integration

Color tints for review actions still work:
- `await markReview(true)` updates cache
- Vue reactivity applies `.review-card-gotit` class
- 400ms delay allows tint to show
- Then animation starts

## Testing Notes

- ✅ Build succeeds (TypeScript compilation clean)
- ✅ All navigation methods work correctly
- ✅ Reduced-motion support preserved
- ✅ Visual feedback (color tints) still works
- ✅ Boundary handling (first/last card) correct
- ✅ Animation lock prevents race conditions

## Code References

- **Animation primitives:** `client/src/composables/useCardTransitions.ts`
- **Touch detection:** `client/src/composables/useSwipeDetection.ts`
- **Integration examples:** `client/src/App.vue:1329-1457`
- **Template binding:** `client/src/App.vue:489-494`

## Related Work

- Builds on: [042_card_slide_animations.md](042_card_slide_animations.md) - Extended swipe to buttons
- Builds on: [029_swipe_gesture_navigation.md](029_swipe_gesture_navigation.md) - Original swipe implementation
- Replaces: Old `useSwipe.ts` animation system

## Impact

This refactor significantly improves code maintainability and developer experience:
- New team members can understand animation flow in minutes, not hours
- Adding new navigation patterns takes minutes, not hours of debugging nested timeouts
- Testing individual pieces is now possible
- State bugs are prevented by design (simple lock mechanism)

The new architecture provides a solid foundation for future animation enhancements without technical debt.
