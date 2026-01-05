# 031 - Offline Notification Redesign

**Date:** January 6, 2026
**Status:** Complete ✅
**Type:** UX Enhancement

## Problem Solved

The persistent red banner showing "⚠️ Sync issues - currently offline" was:
- Too prominent and distracting (especially for intentional offline use)
- Took up valuable screen space
- Always visible when offline (no auto-dismiss)
- Not following modern UX patterns

User requested a more subtle approach following industry best practices (Google Docs, Slack, Notion).

## Solution Implemented

Transformed offline notification from persistent banner to **Badge + Auto-Dismissing Toast** pattern:

1. **Subtle Badge Indicator**
   - Small red dot (10px) on User Menu button (👤)
   - Only appears when offline/sync issues
   - Pulsing animation to draw attention
   - Clickable to re-show toast

2. **Auto-Dismissing Toast**
   - Slides in from top when connectivity changes
   - Auto-dismisses after 5 seconds
   - Same message as before: "⚠️ Sync issues - currently offline. Changes saved locally."
   - Reusable toast infrastructure for future notifications

## UX Design Decisions

**User Choices:**
- **Approach:** Badge + Toast (Recommendation 2 from 4 options)
- **Toast timing:** 5 seconds auto-dismiss
- **Badge when online:** No badge (absence = everything is good)
- **Badge click behavior:** Show toast only (doesn't open User Menu)

**Why This Pattern:**
- Reduces distraction (addresses user's primary goal)
- Industry standard (familiar to users)
- Balances awareness with subtlety
- Non-blocking (toast auto-dismisses)
- Mobile-friendly (works on all screen sizes)

## Files Modified

### 1. [client/src/app.ts](../../client/src/app.ts)
**Changes:** Toast state management and connectivity watcher

**Added:**
- `showOfflineToast` ref - Controls toast visibility
- `toastTimeout` variable - Tracks auto-dismiss timeout
- `showToast()` function - Shows toast for 5 seconds
- `triggerOfflineToast()` function - Manual trigger from badge click
- `watch(hasSyncIssuesWithAuth)` - Shows toast when connectivity changes

**Why:** Centralized toast logic in main app state for reusability

### 2. [client/src/App.vue](../../client/src/App.vue)
**Changes:** Badge on User Menu + Toast notification component

**User Menu Badge (lines 55-61):**
- Added red badge dot to User Menu button
- `v-show="hasSyncIssues"` - Only visible when offline
- `@click.stop="triggerOfflineToast()"` - Click shows toast (doesn't open menu)
- Tooltip: "Click for details"

**Toast Notification (lines 31-34):**
- Converted `.offline-indicator` to `.offline-toast`
- Changed `v-show` from `hasSyncIssues` to `showOfflineToast`
- Same message, different visibility logic

**Why:** Badge provides persistent awareness, toast provides temporary attention on changes

### 3. [client/src/styles.css](../../client/src/styles.css)
**Changes:** Badge and toast styling with animations

**Toast Styling (lines 228-254):**
- Slide-in animation from top (`slideInFromTop` keyframe)
- Enhanced padding and shadow
- Fixed position (top-right corner)

**Badge Styling (lines 257-284):**
- 10px red dot with 2px white border
- Positioned absolute at top-right of User Menu button
- Subtle pulse animation (`badgePulse` keyframe - opacity 1.0 → 0.7 → 1.0)
- Hover effect: scales to 1.2x
- Pointer cursor to indicate clickability

**Why:** Animations provide polish and draw attention appropriately

## Technical Implementation

### Toast State Machine

```
User goes offline:
  1. hasSyncIssuesWithAuth changes (false → true)
  2. watch() trigger calls showToast()
  3. showOfflineToast = true
  4. Toast slides in with animation
  5. setTimeout() auto-hide after 5 seconds
  6. Badge remains visible

User clicks badge:
  1. triggerOfflineToast() called
  2. Checks hasSyncIssuesWithAuth (true)
  3. Calls showToast()
  4. Toast re-appears for 5 seconds

User goes back online:
  1. hasSyncIssuesWithAuth changes (true → false)
  2. watch() trigger calls showToast()
  3. Toast shows connectivity restored message
  4. Badge disappears (v-show="hasSyncIssues" = false)
```

### Key Implementation Details

**Badge Click Event Handling:**
- Uses `@click.stop` to prevent event propagation to User Menu button
- Ensures badge click only triggers toast, not menu dropdown

**Toast Auto-Dismiss:**
- Clears existing timeout before setting new one (prevents multiple timeouts)
- Timeout variable allows future manual dismissal if needed

**Connectivity Detection:**
- Watches `hasSyncIssuesWithAuth` (only shows for authenticated users)
- `oldValue !== undefined` check prevents toast on initial load
- `newValue !== oldValue` ensures only status changes trigger toast

## Pattern Added to Codebase

**Toast Notification Pattern:**
- Reusable infrastructure for temporary notifications
- 5-second auto-dismiss with slide-in animation
- Can be extended for success messages (green toast when online)
- Centralized in app.ts for easy access from any component

**Future Enhancement Opportunities:**
1. Green toast when coming back online ("✅ Back online • Syncing...")
2. Styled tooltip on badge hover (replace `title` attribute)
3. Click-to-dismiss for toast
4. ARIA live region for screen readers
5. Keyboard shortcut to trigger toast

## Testing Notes

**Tested Scenarios:**
- ✅ Badge appears when offline (for authenticated users)
- ✅ Toast slides in on connectivity change
- ✅ Toast auto-dismisses after 5 seconds
- ✅ Clicking badge re-shows toast
- ✅ Badge doesn't open User Menu when clicked
- ✅ Anonymous users don't see badge (only authenticated users)

**Edge Cases Handled:**
- Multiple rapid connectivity changes don't spam toasts (timeout clears previous)
- Toast doesn't show on initial page load (only on status changes)
- Badge properly positioned with flexbox (won't break layout)

## UX Impact

**Before:**
- ❌ Persistent red banner always visible when offline
- ❌ Distracting for intentional offline use
- ❌ Took up screen space

**After:**
- ✅ Subtle red badge on User Menu (10px pulsing dot)
- ✅ Toast appears briefly on connectivity changes
- ✅ Non-intrusive, familiar pattern
- ✅ Badge clickable for confirmation

**User Feedback:** Feature addresses user's primary concern (distraction) while maintaining awareness of offline status.

## Lessons Learned

1. **UX Research Pays Off:** Presenting multiple best-practice options with pros/cons helped user make informed decision
2. **Reusing Existing Code:** Converting existing banner to toast reduced implementation time
3. **Industry Patterns Work:** Badge + toast is familiar to users from other apps (Google Docs, Slack, Notion)
4. **Animation Polish:** Subtle pulse and slide-in animations add professional feel without being distracting
5. **Edge Case Handling:** Preventing event propagation and clearing timeouts prevents unexpected behavior

## Related Work

- **006** - Network Status Detection (original offline indicator implementation)
- **011** - Sync Issues Indicator Fix (refined when to show indicator)
- This work builds on those foundations with modern UX patterns

## Next Steps

No immediate follow-up required. Optional enhancements documented in plan file if user requests them later.

**Potential Future Work:**
- Green "online" toast when connectivity restored
- Styled tooltip on badge with sync details
- Toast dismiss button (×)
- Accessibility improvements (ARIA live region)
