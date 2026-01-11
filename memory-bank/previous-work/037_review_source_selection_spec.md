# Comprehensive Specification: Review Source Selection & Actions Menu

## Overview
This specification describes UX enhancements to enable flexible review workflows by:
1. Adding overflow menus to reduce UI clutter
2. Supporting two review sources: daily queue and filtered verse lists
3. Enabling direct review and edit actions from both My Verses and Review tabs

---

## 1. My Verses Tab Changes

### 1.1 Header Layout & Settings Menu

**Current State:**
```
┌─────────────────────────────────────────────┐
│ My Verses                                   │
│ [Search...] [Sort ▾]           [Export] [Import] │
└─────────────────────────────────────────────┘
```

**New State:**
```
┌─────────────────────────────────────────────┐
│ My Verses                              [⚙️]  │
│ [Search...] [Style][Sort ▾]                 │
└─────────────────────────────────────────────┘
```

**Implementation Details:**
- **Icon:** `mdi mdi-cog` (settings cog icon)
- **Position:** Top right corner of header, above search/style/sort controls
- **Behavior:** Opens dropdown menu on click

**Dropdown Menu Items:**
1. **Review These** → Starts filtered review session
2. **Export** → Existing export functionality
3. **Import** → Existing import functionality

**"Review These" Action Behavior:**
- Captures current `filteredVerses` array (based on active search/sort)
- Switches to Review tab
- Sets `reviewSource = 'filtered'`
- Sets `filteredReviewVerses = filteredVerses`
- Sets `currentReviewIndex = 0` (starts from first verse)
- Initializes review state for first verse

---

### 1.2 Verse Card Actions Menu

**Current State:**
```
┌─────────────────────────────────────┐
│ John 3:16 (NIV)        [Edit] [Del] │
│ "For God so loved..."               │
└─────────────────────────────────────┘
```

**New State:**
```
┌─────────────────────────────────────┐
│ John 3:16 (NIV)                [⋮]  │
│ "For God so loved..."               │
└─────────────────────────────────────┘
```

**Implementation Details:**
- **Icon:** `mdi mdi-dots-vertical` (three vertical dots)
- **Position:** Top right corner of verse card
- **Behavior:** Opens dropdown menu on click

**Dropdown Menu Items:**
1. **Review This** → Starts filtered review at selected verse
2. **Edit** → Existing edit functionality (opens edit modal)
3. **Delete** → Existing delete functionality (with confirmation)

**"Review This" Action Behavior:**
- Captures current `filteredVerses` array
- Switches to Review tab
- Sets `reviewSource = 'filtered'`
- Sets `filteredReviewVerses = filteredVerses`
- Finds index of selected verse in `filteredReviewVerses`
- Sets `currentReviewIndex = foundIndex` (starts from selected verse)
- Initializes review state for selected verse

---

## 2. Review Tab Changes

### 2.1 Header Layout & Source Context

**Current State (Daily Review Mode):**
```
┌─────────────────────────────────────┐
│ Daily Review                   [🔲] │
└─────────────────────────────────────┘
```

**New State (Filtered Review Mode):**
```
┌─────────────────────────────────────┐
│ Filtered Review       [← back] [🔲] │
└─────────────────────────────────────┘
```

**Implementation Details:**

**Title Text:**
- Daily mode: "Daily Review"
- Filtered mode: "Filtered Review"

**Back Button (Filtered mode only):**
- **Text:** "← back" or icon `mdi mdi-arrow-left`
- **Position:** Right side of title, before immersive toggle
- **Behavior:** Switches back to daily review mode
  - Sets `reviewSource = 'daily'`
  - Clears `filteredReviewVerses = []`
  - Returns to daily queue (maintains progress if in progress)

**Immersive Mode Toggle (Both modes):**
- **Icon:** `mdi mdi-fullscreen` (fullscreen icon)
- **Position:** Top right corner of header
- **Behavior:** Existing immersive mode functionality (unchanged)

---

### 2.2 Edit Action on Review Card

**Current State:**
```
┌─────────────────────────────────────┐
│ John 3:16 (NIV)                     │
│ "For God so loved..."               │
│                                     │
│ learn    tag1,tag2        3 weeks   │  ← 3-column footer
└─────────────────────────────────────┘
```

**New State:**
```
┌─────────────────────────────────────┐
│ John 3:16 (NIV)                [✎]  │  ← Edit icon top right
│ "For God so loved..."               │
│                                     │
│ learn    tag1,tag2      15y    3/9  │  ← 4-column footer
└─────────────────────────────────────┘
```

**Implementation Details:**

**Edit Icon:**
- **Icon:** `mdi mdi-pencil`
- **Position:** Top right corner of review card
- **Style:** Same visual style as three-dot menu icon (consistent icon treatment)
- **Behavior:** Opens edit modal for current verse

**Footer Layout Changes:**
- **Structure:** 4-column CSS grid (previously 3-column)
- **Columns:**
  1. **Review Category** (left-aligned): `daily`, `weekly`, `monthly`, etc.
  2. **Tags** (center-aligned): `tag1, tag2` (purple color, existing format)
  3. **Age** (right-aligned): Abbreviated format (see 2.3)
  4. **Progress** (right-aligned): `3/9` format

**Mobile Behavior:**
- Maintain current responsive grid behavior (wraps as needed)

---

### 2.3 Age Display Abbreviation

**Current Format:** "3 weeks", "15 years", "2 days"

**New Abbreviated Format:**
- Days: "2d"
- Weeks: "3w"
- Months: "5m"
- Years: "15y"

**Implementation:**
- Update `getHumanReadableTime()` function to return abbreviated format
- Only affects Review tab cards (My Verses tab shows date, not age)

---

### 2.4 Tab Navigation Badge Behavior

**Current Behavior:**
```
│ 🎯 Review [9]  │  ← Badge always shows dueForReview.length
```

**New Behavior:**
- **Daily Review mode:** Show badge with `dueForReview.length`
- **Filtered Review mode:** Hide badge (no badge displayed)

**Implementation:**
```vue
<span v-show="reviewSource === 'daily' && dueForReview.length > 0"
      class="badge-notification">
  {{ dueForReview.length }}
</span>
```

---

## 3. State Management

### 3.1 New State Variables

```typescript
// Review source tracking
reviewSource: 'daily' | 'filtered' = 'daily'

// Filtered review verses (populated from My Verses)
filteredReviewVerses: Verse[] = []

// Separate navigation indices (if needed)
dailyReviewIndex: number = 0
filteredReviewIndex: number = 0
```

### 3.2 Source Switching Behavior

**Manual Tab Switch to Review:**
- User clicks "Review" tab manually (not from "Review These/This")
- Set `reviewSource = 'daily'`
- Clear `filteredReviewVerses = []`
- Return to daily queue (maintain progress if in progress)

**Note:** A new random daily review list should only be generated if:
- None exists yet (first visit to Review tab), OR
- After "Review Again" action on a completed daily review

Currently, the app regenerates a new random list every time a manual tab switch is clicked. This should be changed to maintain the existing review list if a review is in progress.

**From "Review These" (My Verses header):**
- Set `reviewSource = 'filtered'`
- Capture `filteredReviewVerses` from current filtered list
- Start from index 0

**From "Review This" (Verse card menu):**
- Set `reviewSource = 'filtered'`
- Capture `filteredReviewVerses` from current filtered list
- Find selected verse index, start from that verse

**From "← back" button (Filtered Review header):**
- Set `reviewSource = 'daily'`
- Clear `filteredReviewVerses = []`
- Return to daily queue (maintain progress if in progress)

---

### 3.3 Review Source Logic

**Current Verse Calculation:**
```typescript
// Current behavior (daily only)
currentReviewVerse = dueForReview[currentReviewIndex]

// New behavior (dual source)
currentReviewVerse = reviewSource === 'daily'
  ? dueForReview[currentReviewIndex]
  : filteredReviewVerses[currentReviewIndex]
```

**Progress Calculation:**
```typescript
// Current count
totalReviewCount = dueForReview.length

// New count (dual source)
totalReviewCount = reviewSource === 'daily'
  ? dueForReview.length
  : filteredReviewVerses.length
```

**Navigation Bounds:**
- Next/Previous buttons should respect current source's array bounds
- "Review Complete" state triggers when all verses in current source reviewed

---

## 4. Review Complete Behavior

### 4.1 Daily Review Complete

**Current Behavior:** (Maintained)
```
┌─────────────────────────────────────┐
│          🎉                         │
│     Review Complete!                │
│  Great job reviewing today          │
│                                     │
│     [Review Again]                  │
└─────────────────────────────────────┘
```

**"Review Again" Action:**
- Calls `resetReview()` which generates fresh random list from `dueForReview`
- Resets review modes/states
- Starts from index 0

### 4.2 Filtered Review Complete

**New Behavior:**
```
┌─────────────────────────────────────┐
│          🎉                         │
│     Review Complete!                │
│  Reviewed 12 verses                 │
│                                     │
│     [Review Again]                  │
└─────────────────────────────────────┘
```

**"Review Again" Action:**
- Restarts same `filteredReviewVerses` array (no re-randomization)
- Resets review modes/states
- Starts from index 0
- Maintains `reviewSource = 'filtered'`

**Note:** User can click "← back" button before "Review Again" if they want to return to daily queue instead.

---

## 5. Edit Modal Behavior from Review Tab

### 5.1 Opening Edit Modal
- Click `[✎]` icon in review card header
- Opens existing edit modal (no changes to modal itself)
- Pre-populates with current verse data

### 5.2 Saving Changes

**Daily Review Mode:**
- Save changes to database/IndexedDB
- Refresh current verse data in review state
- Stay on same verse, continue review

**Filtered Review Mode:**
- Save changes to database/IndexedDB
- Refresh current verse data
- **Check if verse still matches filter criteria:**
  - **Still matches:** Stay on same verse, continue review
  - **No longer matches:**
    - Show toast message: "⚠️ Verse no longer matches filter"
    - Remove verse from `filteredReviewVerses` array
    - Auto-advance to next verse
    - If last verse, show "Review Complete" state

**Implementation Note:**
- Re-run filter logic on saved verse
- Compare filtered result to determine if verse still qualifies

---

## 6. Visual Specifications

### 6.1 Icons

**MDI Icon Classes:**
- Settings cog: `mdi mdi-cog`
- Verse card menu: `mdi mdi-dots-vertical`
- Edit action: `mdi mdi-pencil`
- Back button: `mdi mdi-arrow-left` (or text "← back")
- Immersive mode: `mdi mdi-fullscreen` (existing)

**Style Consistency:**
- All action icons should have same size/color treatment
- Hover states: subtle color shift (existing button hover styles)
- Touch targets: Minimum 44x44px (mobile best practice)

### 6.2 Dropdown Menu Styling

**Style:** Match existing modal/dropdown patterns (glass-card effect)
```css
.dropdown-menu {
  @apply absolute right-0 mt-2 glass-card rounded-xl shadow-2xl overflow-hidden z-50;
}

.dropdown-item {
  @apply w-full px-4 py-3 text-left text-sm font-medium text-slate-700
         hover:bg-slate-50 transition-all flex items-center gap-2
         border-b border-slate-100 last:border-b-0;
}
```

### 6.3 Header Title Styling

**Filtered Review Title:**
- Consider distinct color treatment to reinforce mode awareness
- Example: Daily = default color, Filtered = blue accent
```css
/* Optional enhancement */
.review-header-filtered {
  @apply text-blue-700;
}
```

---

## 7. Edge Cases & Error Handling

### 7.1 Empty Filtered List
**Scenario:** User applies filter with no results, clicks "Review These"

**Behavior:**
- Show empty state in Review tab: "No verses match your filter"
- Provide "← Back to Daily Review" option

### 7.2 Verse Deleted During Review
**Scenario:** Verse is deleted (from another device/tab) while reviewing

**Behavior:**
- On next navigation, detect missing verse
- Show toast: "⚠️ Verse was deleted"
- Auto-advance to next verse
- If last verse, show "Review Complete"

### 7.3 Filter Changes While in Filtered Review
**Scenario:** User switches to My Verses, changes search, returns to Review tab

**Behavior:**
- **Do not** update `filteredReviewVerses` mid-session
- Review session remains stable with original filtered set
- User must manually restart to review new filtered set

### 7.4 Network Sync During Filtered Review
**Scenario:** New verses sync from server during filtered review

**Behavior:**
- **Do not** update `filteredReviewVerses` mid-session
- Only affect daily queue (`dueForReview`) if applicable
- User sees new verses on next manual filter/review initiation

---

## 8. Testing Checklist

### 8.1 My Verses Tab
- [ ] Settings cog menu opens/closes correctly
- [ ] "Review These" captures correct filtered list
- [ ] "Review These" switches to Review tab with filtered source
- [ ] Verse card three-dot menu opens/closes correctly
- [ ] "Review This" starts review at selected verse
- [ ] "Edit" and "Delete" actions work from menu

### 8.2 Review Tab - Daily Mode
- [ ] Header shows "Daily Review" title
- [ ] No "← back" button displayed
- [ ] Badge shows correct count
- [ ] Edit icon opens modal correctly
- [ ] Footer shows 4 columns with abbreviated age
- [ ] Progress indicator shows correct count (X/Y)
- [ ] "Review Again" generates fresh random list

### 8.3 Review Tab - Filtered Mode
- [ ] Header shows "Filtered Review" title
- [ ] "← back" button displayed and functional
- [ ] Badge hidden in filtered mode
- [ ] Edit icon opens modal correctly
- [ ] Footer shows 4 columns with abbreviated age
- [ ] Progress indicator shows filtered count (X/Y)
- [ ] "Review Again" restarts same filtered list

### 8.4 State Transitions
- [ ] Manual tab switch maintains existing review progress (doesn't regenerate)
- [ ] Manual tab switch clears filtered mode and returns to daily
- [ ] "Review These" transitions correctly to filtered mode
- [ ] "Review This" transitions correctly to filtered mode and positions at selected verse
- [ ] "← back" returns to daily mode correctly
- [ ] Tab badge shows/hides based on mode

### 8.5 Edit Modal Behavior
- [ ] Edit from daily mode: saves and stays on verse
- [ ] Edit from filtered mode: saves and checks filter match
- [ ] Edit removes verse from filtered list if no longer matches
- [ ] Toast notification shown when verse removed from filter
- [ ] Auto-advance works correctly after filter mismatch

### 8.6 Edge Cases
- [ ] Empty filtered list shows appropriate message
- [ ] Deleted verse handled gracefully
- [ ] Filter changes don't affect in-progress review
- [ ] Sync updates don't disrupt filtered review session

---

## 9. Implementation Notes

### 9.1 Click Outside Behavior
- Dropdown menus should close when clicking outside
- Use existing `v-click-outside` directive (already in codebase for user menu)

### 9.2 Mobile Considerations
- Touch targets: Minimum 44x44px for all icons/buttons
- Dropdown menus: Full width on small screens if needed
- Footer: Test 4-column grid wrapping on narrow screens

### 9.3 Accessibility
- Add `aria-label` to icon-only buttons
- Dropdown menus should have proper ARIA attributes
- Keyboard navigation support for dropdown items

### 9.4 Performance
- `filteredReviewVerses` is a snapshot (frozen array)
- No reactive dependencies on original `verses` array during review
- Prevents unexpected updates during review session

---

## 10. Future Enhancements (Out of Scope)

**Not included in this specification:**
- Queue list preview/drawer
- Collapsible verse list during review
- Filter context text display in header
- Review session statistics/summary
- Persistent filtered mode across app restarts
- Reordering verses within filtered review

These can be considered for future iterations based on user feedback.

---

## Summary

This specification enables:
1. ✅ Clean, uncluttered UI with overflow menus
2. ✅ Flexible review from any filtered verse set
3. ✅ Direct review and edit actions from both tabs
4. ✅ Clear visual distinction between daily and filtered modes
5. ✅ Graceful handling of edge cases
6. ✅ Consistent with existing app patterns and styling

The implementation maintains simplicity while providing powerful workflow flexibility for users who want to focus on specific verse subsets.
