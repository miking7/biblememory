# Legacy Mode UI Relocation

**Date:** January 10, 2026  
**Status:** ✅ Complete

## Problem

The legacy mode was taking up valuable space as one of the main navigation tabs, even though it's a temporary feature that will be phased out once the modern app achieves feature parity. This made the UI feel cluttered and gave equal prominence to a transitional feature.

## Solution

Relocated legacy mode access to be less prominent while keeping it accessible:

1. **Removed from tab navigation** - Removed the "Legacy..." tab button from the main 3-tab navigation
2. **Added to user menu** - Placed "Legacy Mode" as a menu item in the authenticated user dropdown menu (above "Logout")
3. **Tab reordering** - Reordered remaining tabs: "My Verses" (default), "Review", "Add Verse"
4. **Changed default tab** - Made "My Verses" the default tab instead of "Add Verse"

## Changes Made

### Files Modified

**1. `client/src/App.vue`**
- Removed legacy tab button from tab navigation
- Added "Legacy Mode" menu item to user dropdown (appears when authenticated)
- Reordered tabs: My Verses → Review → Add Verse
- Legacy Mode menu item positioned between user email display and Logout

**2. `client/src/app.ts`**
- Changed default tab from `'add'` to `'list'` (My Verses)

## Rationale

### Why Relegate Legacy Mode?
- **Temporary feature** - Will be removed once modern app has feature parity (Phase 2/3 complete)
- **De-emphasize transitional UI** - Don't give equal prominence to a feature we're replacing
- **Cleaner navigation** - Main tabs focus on core modern app functionality
- **Still accessible** - Users can still easily access it when needed (from user menu)

### Why Reorder Tabs?
- **My Verses as default** makes more sense - users spend most time viewing/managing verses
- **Review as second tab** - High priority, frequently used feature with notification badge
- **Add Verse as last tab** - Used less frequently, typically only when adding new content

### Why Move to User Menu?
- **Authenticated-only feature** - Legacy mode requires verses to export (most users authenticated)
- **Logical grouping** - Other user-specific actions already in that menu (Logout)
- **Consistent pattern** - Many apps put secondary/advanced features in user menus
- **Less visual clutter** - Reduces main navigation from 4 items to 3

## User Experience

### Before
```
Tabs: [Add Verse] [My Verses] [Review] [Legacy...]
Default: Add Verse
```

### After
```
Tabs: [My Verses] [Review] [Add Verse]
Default: My Verses
User Menu: [Legacy Mode] [Logout]
```

## Benefits

1. **Cleaner UI** - Main navigation has 3 balanced tabs instead of 4
2. **Better defaults** - Users land on My Verses (most commonly needed view)
3. **Future-proof** - Easy to remove legacy mode later (just delete one menu item)
4. **Logical tab order** - Browse → Review → Add follows natural workflow
5. **De-emphasized legacy** - Clear signal this is transitional, not primary feature

## Testing

✅ Legacy Mode accessible from user menu  
✅ My Verses loads as default tab  
✅ Tab order correct: My Verses, Review, Add Verse  
✅ Legacy export and redirect still works  
✅ User menu shows Legacy Mode above Logout

## Implementation Details

### User Menu Structure
```vue
<div class="dropdown-menu">
  <div class="user-email">Signed in as user@example.com</div>
  <button @click="exportToLegacyAndOpen()">
    ⏪ Legacy Mode
  </button>
  <button @click="handleLogout()">
    🚪 Logout
  </button>
</div>
```

### Tab Button Order
```vue
<button @click="currentTab = 'list'">📚 My Verses</button>
<button @click="currentTab = 'review'">🎯 Review</button>
<button @click="currentTab = 'add'">📝 Add Verse</button>
```

## Future Work

When Phase 2/3 complete and legacy app no longer needed:
1. Remove "Legacy Mode" menu item from user dropdown
2. Remove `exportToLegacyAndOpen()` function from `app.ts`
3. Remove legacy app files from `/client/public/legacy/`
4. Update documentation to reflect legacy app removal

## Related Files

- `client/src/App.vue` - UI changes
- `client/src/app.ts` - Default tab change
- `memory-bank/projectbrief.md` - Documents legacy bridge strategy
- `memory-bank/productContext.md` - Explains legacy app integration pattern
- `memory-bank/systemPatterns.md` - Documents legacy integration pattern
