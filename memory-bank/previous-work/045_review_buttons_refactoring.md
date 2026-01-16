# 045 - Review Buttons Refactoring

**Date:** 2026-01-16
**Status:** ✅ Complete
**Branch:** `claude/refactor-review-buttons-fJV8s`
**Commits:** 04aac60, aa5cb5e, 638720f

## Problem

The review button UI had several UX issues:
1. **Smart button confusion** - Dual-purpose button changed behavior based on mode (Reveal vs Next)
2. **Hidden action buttons** - Again/Got It disappeared when not in content mode, breaking muscle memory
3. **Inconsistent grouping** - Reveal was an action button but behaved like a mode
4. **No Type It mode** - Missing planned feature for typing practice
5. **Suboptimal ordering** - Mode buttons not organized by difficulty

## Solution

Redesigned review buttons with clear separation between modes and actions:

### Desktop Layout
```
Mode Row:    [Type It] [Flash Cards] [Hint] [First Letters] [Reveal]
Action Row:  [Again] [Got It!]
```

### Mobile Layout
```
Action Row:  [Again] [👁️] [Got It!]
Mode Row:    [⌨️] [🃏] [?] [A]
```

## Key Changes

### 1. Reveal as a Mode Button
- **What:** Moved Reveal from action row to mode row on desktop
- **Why:** Revealing verse content IS a mode (like Hints, Flash Cards), not an action (like rating)
- **Behavior:** Never disabled, shows as active when `reviewMode === 'content'`
- **Mobile:** Icon-only to match mode button width, placed on action row to save space

### 2. Always-Visible Action Buttons
- **What:** Again and Got It now always visible but disabled when not applicable
- **Why:** Predictable UI, better muscle memory, industry standard (Gmail, Slack)
- **Implementation:** `:disabled="reviewMode !== 'content'"` with 40% opacity
- **Tooltips:** Dynamic messages ("Available after revealing verse" when disabled)

### 3. Removed Smart Button
- **What:** Eliminated dual-purpose Reveal/Next button
- **Why:** One button = one purpose, reduces cognitive load
- **Alternatives:** Swipe gestures, keyboard shortcuts (n, p) for navigation

### 4. New Type It Mode
- **What:** Added new review mode button with keyboard icon (`mdi:keyboard-outline`)
- **Why:** Future feature for typing practice (hardest difficulty level)
- **Implementation:** Shows "Coming Soon" message with description
- **Placement:** First position (hardest → easiest ordering)

### 5. Difficulty-Based Ordering
- **What:** Reordered mode buttons left-to-right by difficulty
- **Order:** Type It → Flash Cards → Hint → First Letters → Reveal
- **Why:** Logical progression, users can "graduate" through difficulties

### 6. Enhanced Keyboard Shortcuts
- **New shortcuts:**
  - `t` = Type It mode
  - `g` = Got It! (mark successful)
  - `a` = Again (mark needs practice)
- **Updated:**
  - `Space` = Reveal only (no longer dual-purpose)
- **Existing:** h, c, f, n, p, i, Escape (unchanged)

## Technical Implementation

### Files Modified
1. **`client/src/composables/useReview.ts`**
   - Added `'typeit'` to `ReviewMode` type
   - Added `switchToTypeIt()` function
   - Updated keyboard shortcuts (Space, g, a, t)
   - Removed `revealContent()` wrapper (redundant)

2. **`client/src/App.vue`**
   - Desktop: 5 mode buttons + 2 action buttons
   - Mobile: 3 action buttons (Reveal icon-only) + 4 mode buttons (icon-only)
   - Added "Coming Soon" UI for Type It mode
   - Updated button classes and event handlers

3. **`client/src/app.ts`**
   - Removed `revealContent` export
   - Added `switchToTypeIt` export

4. **`client/src/styles.css`**
   - Added disabled button styles (opacity 0.4, cursor not-allowed)
   - No hover effects when disabled

## Design Decisions

### Reveal Button Placement
**Decision:** Mode row on desktop, action row on mobile

**Rationale:**
- **Desktop:** Plenty of space, logical grouping (all modes together)
- **Mobile:** Limited space, 4 icon buttons vs 5 prevents cramping
- **Consistency:** Both layouts maintain full functionality

### Action Button Order (Mobile)
**Decision:** Again → Reveal → Got It!

**Options considered:**
- A: Reveal → Again → Got It (reveal first)
- B: Again → Reveal → Got It (separate negative/positive)
- C: Again → Got It → Reveal (keep pairing)

**Chosen:** Option B - Reveals sits between ratings, no visual preference for either outcome

### Mode Button Order
**Decision:** Difficulty gradient (hardest → easiest)

**Rationale:**
- Type It: Hardest (typing accuracy + memory)
- Flash Cards: Hard/Medium (variable difficulty 0-100%)
- Hint: Medium/Easy (progressive words)
- First Letters: Easiest (letter cues)
- Reveal: Show answer (no practice)

### Mobile Button Styles
**Decision:** Reveal icon-only, Again/Got It with text

**Rationale:**
- Reveal matches mode button width (visual consistency)
- Again/Got It more critical, text improves clarity
- Eye icon universally recognizable

## Benefits

✅ **Clearer purpose** - One button = one action
✅ **Better muscle memory** - Buttons don't disappear
✅ **Logical organization** - Modes grouped, difficulty-ordered
✅ **Predictable behavior** - No mode-dependent button changes
✅ **Future-ready** - Type It mode stub prepared
✅ **Accessible** - Always-visible buttons, clear tooltips
✅ **Responsive** - Optimized for both desktop and mobile

## Trade-offs

❌ **No quick skip** - Removed Next from smart button (use swipe/keyboard instead)
❌ **More buttons** - 5 mode buttons vs 4 previously (desktop only)
❌ **Learning curve** - Users need to adapt to new layout

**Mitigation:** Swipe gestures and keyboard shortcuts provide alternative navigation

## Testing Notes

- ✅ TypeScript build passes (pre-existing errors unrelated)
- ✅ All button states work correctly (active/inactive/disabled)
- ✅ Keyboard shortcuts function as expected
- ✅ Responsive layout works on mobile and desktop
- ✅ Disabled buttons show appropriate tooltips

## Future Enhancements

1. **Type It Mode Implementation**
   - Input field for typing verse
   - Character-by-character comparison
   - Error highlighting
   - Accuracy scoring

2. **Keyboard Shortcut Discovery**
   - Visual hint on first visit
   - Keyboard shortcuts modal (?)
   - Help overlay with all shortcuts

3. **Button Animations**
   - Subtle transitions when switching modes
   - Success/error feedback animations
   - Card flip animation on reveal

## References

- **Commits:** 04aac60, aa5cb5e, 638720f
- **Files:** `App.vue:656-856`, `useReview.ts:17-767`, `styles.css:402-428`
- **Related Work:** [039_review_tracking_buttons.md](039_review_tracking_buttons.md), [028_magic_button_reveal_improvement.md](028_magic_button_reveal_improvement.md)
