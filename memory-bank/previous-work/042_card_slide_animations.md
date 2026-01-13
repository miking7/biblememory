# 042: Card Slide Animations for All Navigation Actions

**Date:** January 13, 2026
**Status:** Complete ✅
**Type:** Feature - UX Enhancement + Accessibility

## Overview

Extended the existing swipe gesture animation system to support all navigation methods (buttons, review actions), creating a consistent and polished user experience. All navigation now features smooth card slide animations with full accessibility support.

## Feature Description

### User Experience

**Navigation Button Animations:**
- **Previous button**: Card slides right (exits right, enters from left)
- **Next button**: Card slides left (exits left, enters from right)
- Same 300ms exit + 150ms entrance timing as swipe gestures
- Directional context helps users understand forward/backward

**Review Action Animations:**
- **"Got it!" button**: 400ms green tint → slide left to next verse
- **"Again" button**: 400ms amber tint → slide left to next verse
- Visual feedback + animation = seamless flow
- No added delay (animations run parallel with existing feedback)

**Accessibility Support:**
- Respects `prefers-reduced-motion` OS preference
- CSS disables all animations when motion reduced
- JavaScript skips animation logic entirely (instant navigation)
- Zero performance impact for motion-sensitive users

### Design Decisions

**Why extend existing swipe system?**
- Infrastructure already proven smooth and performant
- Reuses animation state machine (exit → position → enter)
- No code duplication
- Consistent timing and feel

**Why animate review buttons?**
- Creates flow: mark review → visual feedback → smooth transition
- Reinforces "moving forward" mental model
- More satisfying than instant jump

**Why parallel animations for Got it!/Again?**
- User already waits 400ms for color feedback
- Animation doesn't add to total duration
- Feels more responsive than sequential

## Technical Implementation

### Architecture

**Three-Layer Approach:**

1. **useSwipe.ts composable**
   - Added `triggerAnimatedNavigation(direction)` method
   - Checks reduced-motion preference first
   - Reuses existing animation state machine
   - Returns same reactive refs for consistency

2. **useReview.ts composable**
   - Modified `markReview()` to accept optional `onNavigate` callback
   - Allows animation injection without breaking separation of concerns
   - Falls back to direct `nextVerse()` if no callback provided

3. **App.vue integration**
   - `navigateWithAnimation('left' | 'right')` for Prev/Next buttons
   - `markReviewWithAnimation(success)` for Got it!/Again buttons
   - Wraps animation trigger in user-friendly function names

### Key Technical Details

**Reduced-Motion Support:**
```javascript
// JavaScript check
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if (prefersReducedMotion) {
  // Skip animation, trigger callback immediately
  onSwipeLeft() || onSwipeRight();
  return;
}
```

```css
/* CSS override */
@media (prefers-reduced-motion: reduce) {
  .review-card {
    transform: none !important;
    transition: none !important;
  }
}
```

**Animation Flow:**
```
Button Click
    ↓
triggerAnimatedNavigation('left' | 'right')
    ↓
Check reduced-motion preference
    ↓
If reduced → instant navigation
If allowed → animation sequence:
    ↓
Exit animation (300ms) - card flies off
    ↓
Trigger callback (nextVerse/previousVerse)
    ↓
Vue renders new card (nextTick)
    ↓
Position phase (instant) - card off-screen opposite side
    ↓
Enter animation (150ms) - card slides to center
    ↓
Cleanup
```

**Review Button Flow:**
```
Got it!/Again Click
    ↓
markReviewWithAnimation(success)
    ↓
Mark review + update stats
    ↓
400ms visual feedback (color tint)
    ↓
Callback: triggerAnimatedNavigation('left')
    ↓
Animation sequence (as above)
```

### Integration Points

**Files Modified:**
- `client/src/composables/useSwipe.ts` (+57 lines)
  - Added `triggerAnimatedNavigation()` method
  - Added reduced-motion check
  - Exported function in return statement

- `client/src/composables/useReview.ts` (+7 lines)
  - Modified `markReview(success, onNavigate?)` signature
  - Added callback support for animation injection

- `client/src/App.vue` (+13 lines)
  - Updated Prev/Next button handlers
  - Updated Got it!/Again button handlers
  - Added wrapper functions for cleaner integration

- `client/src/styles.css` (+32 lines)
  - Added `@media (prefers-reduced-motion: reduce)` block
  - Disabled all animations and transitions
  - Maintained visual stability without motion

### Testing

**Functional Testing:**
- ✅ Prev/Next buttons trigger smooth slide animations
- ✅ Got it!/Again buttons show color feedback + slide
- ✅ Swipe gestures still work as before
- ✅ Disabled buttons don't trigger animations
- ✅ Last verse completion works correctly

**Accessibility Testing:**
- ✅ Reduced-motion preference detected correctly
- ✅ Animations disabled when preference active
- ✅ Navigation remains instant and functional
- ✅ No performance degradation
- ✅ All functionality works without animations

**Edge Cases:**
- ✅ First verse: Previous button disabled, no animation attempt
- ✅ Last verse: Next button disabled, completion screen shown
- ✅ Rapid clicking: Animations don't stack or break
- ✅ Review at last verse: Proper completion handling

## Benefits

### User Experience
1. **Consistency**: All navigation methods feel unified
2. **Directional Context**: Users understand forward vs backward
3. **Professional Polish**: Matches modern app patterns (Duolingo, Anki, Memrise)
4. **Reduced Cognitive Load**: Animation maintains mental model of card stack

### Technical
1. **Code Reuse**: Leverages existing swipe infrastructure
2. **Maintainability**: Single source of truth for animations
3. **Accessibility**: Full reduced-motion support built-in
4. **Performance**: Zero impact when animations disabled

### Accessibility
1. **Respects User Preferences**: Honors OS motion settings automatically
2. **No Degradation**: Functionality identical with/without animations
3. **Industry Standard**: Follows WCAG 2.1 Animation Guidelines

## Design Rationale

**Why same timing as swipe?**
- Already proven smooth on various devices
- Users familiar with the feel
- No need to tune different timings

**Why not add settings toggle?**
- OS preference already provides this
- Avoids UI clutter
- Industry standard approach
- Users expect OS setting to work

**Why parallel vs sequential animations?**
- Sequential would add 300-450ms delay (bad UX)
- Parallel feels responsive
- Color feedback + animation = rich confirmation

**Why not fade/scale instead?**
- Slide provides directional information
- Matches existing swipe behavior
- More informative than generic transition

## Related Work

**Builds On:**
- [029_swipe_gesture_navigation.md](029_swipe_gesture_navigation.md) - Original swipe implementation
- [039_review_tracking_buttons.md](039_review_tracking_buttons.md) - Got it!/Again visual feedback

**References:**
- WCAG 2.1 - Animation from Interactions (2.3.3)
- Vue 3 Composables pattern
- Hardware-accelerated CSS transforms

## Future Enhancements

**Potential Improvements:**
- Velocity-based animation speed (faster swipe = faster animation)
- Spring physics for more natural feel
- Haptic feedback on supported devices
- Custom animation curves per user preference

**Not Needed:**
- Settings toggle (OS preference sufficient)
- Multiple animation styles (consistency is key)
- Different timings per action (uniformity better)

## Code References

- Implementation: `client/src/composables/useSwipe.ts:180-239`
- Integration: `client/src/App.vue:456,465,728,735,749,756,1274-1287`
- Review logic: `client/src/composables/useReview.ts:126-153`
- Accessibility: `client/src/styles.css:477-508`

## Metrics

- **Lines Added**: 109 lines
- **Lines Modified**: 8 lines
- **Files Changed**: 4 files
- **Build Time Impact**: None (no new dependencies)
- **Bundle Size Impact**: Negligible (~200 bytes gzipped)
- **Performance Impact**: None (disabled when motion reduced)
