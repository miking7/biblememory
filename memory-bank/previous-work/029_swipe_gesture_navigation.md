# 029: Swipe Gesture Navigation for Review Cards

**Date:** January 4, 2026  
**Status:** Complete ✅  
**Type:** Feature - Mobile UX Enhancement

## Overview

Added touch-based swipe gestures for navigating between review cards, creating an intuitive, app-like experience on mobile devices. Cards animate smoothly with a card-stack effect, flying off in the swipe direction and sliding in from the opposite side.

## Feature Description

### User Experience

**Swipe Left** - Navigate to next verse:
- Current card flies off to the left
- New card slides in from the right
- Smooth 300ms exit + 150ms enter animations

**Swipe Right** - Navigate to previous verse:
- Current card flies off to the right
- New card slides in from the left
- Same smooth animations

**Boundary Feedback:**
- At first verse: Swiping right shows resistance (limited movement)
- At last verse: Swiping left shows resistance
- Unsuccessful swipes (too short/vertical) bounce back to center

### Mobile-First Design

- **Touch-Optimized:** Feels natural on phones and tablets
- **Complements Buttons:** Prev/Next buttons still available for precision
- **Non-Intrusive:** Doesn't interfere with click-to-reveal functionality
- **Smooth Performance:** Hardware-accelerated CSS transforms

## Technical Implementation

### Architecture

Created a reusable Vue composable (`useSwipe.ts`) that handles:
- Touch event detection and tracking
- Swipe validation (horizontal, sufficient distance)
- Animation state management
- Boundary enforcement
- DOM lifecycle management

### Key Components

**1. useSwipe Composable**
```typescript
// Returns reactive refs for animation control
const { 
  isSwiping,        // User actively swiping
  swipeOffset,      // Current card position (px)
  isAnimatingExit,  // Card flying off
  isAnimatingEnter, // Card sliding in
  isPositioning     // Instant position jump (no transition)
} = useSwipe(element, options)
```

**2. Animation States**

Three distinct phases for smooth transitions:
- **Exit Phase** (300ms): Card flies off screen with momentum
- **Position Phase** (instant): New card positioned off-screen on opposite side
- **Enter Phase** (150ms): New card slides to center

**3. CSS Transition Control**

Dynamic transition management in App.vue:
```typescript
transition: (isSwiping || isPositioning) ? 'none' : 
            isAnimatingExit ? 'transform 0.3s ease-out' : 
            isAnimatingEnter ? 'transform 0.15s ease-out' : 
            'transform 0.3s ease-out'
```

### Integration Points

**App.vue** (Review Tab):
- Refs review card element
- Configures swipe with navigation callbacks
- Applies dynamic transitions based on animation states

**Navigation Callbacks:**
```typescript
onSwipeLeft: () => nextVerse()    // Navigate forward
onSwipeRight: () => previousVerse() // Navigate backward
```

### Technical Features

**Touch Event Handling:**
- Single-touch gestures only (ignores multi-touch)
- Prevents default browser swipe navigation
- Distinguishes horizontal from vertical scrolling (1.5x ratio)
- Handles touch cancellation gracefully

**Vue Integration:**
- Uses `watch()` to attach listeners when element becomes available
- Uses `nextTick()` to synchronize with Vue's render cycle
- Clean lifecycle management (attaches on mount, removes on unmount)

**Performance:**
- Passive event listeners for scroll optimization
- Hardware-accelerated transforms (translateX)
- Minimal re-renders (batched state updates)

## Configuration

**Swipe Thresholds:**
```typescript
threshold: 50,              // Minimum horizontal distance (px)
verticalThreshold: 50,      // Maximum vertical movement allowed
resistance: 0.3,            // Boundary resistance factor
maxResistance: 50           // Maximum resistance movement (px)
```

**Animation Timings:**
```typescript
exitDuration: 300ms         // Card flying off
enterDuration: 150ms        // Card sliding in
exitDistance: 1.5 × screen  // How far off screen
```

## Files Created/Modified

**New Files:**
- `client/src/composables/useSwipe.ts` (230 lines) - Core swipe detection and animation logic

**Modified Files:**
- `client/src/App.vue` - Integrated swipe composable into Review tab
  - Added swipe setup (~20 lines)
  - Modified card style binding for dynamic transitions

## Testing

**Supported Platforms:**
- ✅ iOS Safari (primary target)
- ✅ Android Chrome
- ✅ Chrome DevTools device emulation

**Test Scenarios:**
- Navigate forward/backward through review cards
- Boundary behavior (first/last verse)
- Unsuccessful swipes (too short, too vertical)
- Touch cancellation (interruptions)
- Fast vs slow swipes

## Design Decisions

### Why Touch Events Only?

**Decision:** Implement touch gestures, not mouse drag  
**Rationale:**
- Primary use case is mobile devices
- Desktop has Prev/Next buttons for navigation
- Simpler implementation without mouse compatibility layer
- Can add mouse later if needed

### Why Three Animation States?

**Decision:** Split into exit, position, enter phases  
**Rationale:**
- Enables instant positioning without visual jump
- Allows different timing for exit vs enter
- Prevents CSS transition conflicts
- Creates polished card-stack feel

### Why Asymmetric Timing?

**Decision:** 300ms exit, 150ms enter  
**Rationale:**
- Exit needs momentum feel (flying off)
- Enter should be snappy (user wants to see content)
- Asymmetry creates natural rhythm
- User feedback confirmed this feels best

## User Feedback

Initial implementation showed cards sliding in from same direction (confusing). Updated to slide from opposite direction, creating intuitive card-stack metaphor that users expect.

## Future Enhancement Opportunities

- **Velocity-Based Animation:** Adjust speed based on swipe velocity
- **Spring Physics:** Use physics-based easing for more natural feel
- **Haptic Feedback:** Add vibration on successful swipe (iOS WebKit)
- **Mouse Support:** Add drag-to-swipe for desktop convenience
- **Gesture Customization:** Allow users to configure sensitivity

## Related Documentation

- **productContext.md** - User experience goals for mobile-first design
- **systemPatterns.md** - Vue Composables pattern (section 6)
- **techContext.md** - Vue 3 + TypeScript setup

## Code References

- Implementation: `client/src/composables/useSwipe.ts`
- Integration: `client/src/App.vue` (lines ~905-920, ~295-300)
