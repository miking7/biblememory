# 030 - Deck-Style Card View for "My Verses" Tab

**Date:** 2026-01-05  
**Status:** ✅ Complete

## Overview

Implemented a dual-view mode for the "My Verses" tab that transforms verse cards into an authentic deck-of-cards experience with overlapping, stackable cards and inline expansion functionality.

## Problem Solved

The "My Verses" tab was displaying all verses as full cards with complete metadata, which:
- Consumed significant vertical space
- Made it difficult to scan through large verse collections
- Lacked the tactile "deck of cards" metaphor for scripture memorization

## Solution Implemented

### Core Features

**1. View Toggle Button**
- Positioned between search field and sort dropdown
- Material Design Icons: `mdi-view-agenda` (full view) ↔ `mdi-view-headline` (compact view)
- State persisted to localStorage (like existing `verseSortPreference`)
- Works seamlessly on both mobile and desktop

**2. Compact/Overlapped Card Mode**
- **Display**: Reference (bold) + verse content on same line
- **Truncation**: CSS line-clamp at 2 lines (responsive)
- **Overlap**: `-27px` margin-top creates tight card stacking
- **Border Radius**: `rounded-t-xl` (flat bottom) for visual continuity
- **Shadows**: Dual shadows (top + bottom) create 3D layering effect
- **First Card**: No overlap, single bottom shadow (starts the deck)

**3. Click-to-Expand Functionality**
- Click any compact card → expands inline to full view
- **Multiple expansion**: Users can expand multiple cards simultaneously
- Expanded cards remain visually connected to deck (`-22px` overlap)
- Extra bottom margin (`2rem`) ensures full content visibility
- Shows full content + Edit/Delete buttons when expanded

**4. Auto-Collapse Triggers**
- Search query changes (refiltering)
- Sort order changes (refiltering)
- Navigate away from "My Verses" tab
- Switching view modes (compact ↔ full)

### Visual Design

**Compact Card Styling:**
```css
.verse-card-compact {
    padding: 0.75rem 1rem;
    cursor: pointer;
    margin-top: -27px;  /* Tight stacking */
    border-radius: 0.75rem 0.75rem 0 0;  /* Flat bottom */
    box-shadow: 
        0 -1px 3px rgba(0, 0, 0, 0.06),  /* Top shadow */
        0 2px 4px rgba(0, 0, 0, 0.08);   /* Bottom shadow */
}
```

**Expanded Card Adjustment:**
```css
.verse-card-full-compact-mode-adjustment {
    margin-top: -22px;  /* Stays connected to deck */
    margin-bottom: 2rem;  /* Breathing room for content */
}
```

**Content Truncation:**
```css
.compact-content {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    line-height: 1.5;
    padding-bottom: 15px;
}
```

### Technical Implementation

**State Management (app.ts):**
```typescript
const verseViewMode = ref<'full' | 'compact'>('full');
const expandedVerseIds = ref<Set<string>>(new Set());

// Load from localStorage on mount
onMounted(() => {
  const saved = localStorage.getItem('verseViewMode');
  if (saved === 'full' || saved === 'compact') {
    verseViewMode.value = saved;
  }
});

// Save to localStorage on change
watch(verseViewMode, (newMode) => {
  localStorage.setItem('verseViewMode', newMode);
});

// Clear expanded cards on filter/sort/tab changes
watch([searchQuery, sortBy], () => {
  expandedVerseIds.value.clear();
  expandedVerseIds.value = new Set();
});
```

**Component Props (VerseCard.vue):**
```typescript
const props = defineProps<{
  verse: Verse;
  viewMode?: 'full' | 'compact';
  isExpanded?: boolean;
}>();

const isCompact = computed(() => 
  props.viewMode === 'compact' && !props.isExpanded
);
```

**Container Spacing (App.vue):**
```vue
<!-- Remove space-y-4 in compact mode to allow overlap -->
<div :class="verseViewMode === 'compact' ? '' : 'space-y-4'">
  <VerseCard
    v-for="verse in filteredVerses"
    :key="verse.id"
    :verse="verse"
    :view-mode="verseViewMode"
    :is-expanded="expandedVerseIds.has(verse.id)"
    @edit="startEditVerse"
    @delete="deleteVerse"
    @toggle-expand="toggleVerseExpansion"
  />
</div>
```

## Key Design Decisions

### Why Flat-Bottom Rounded-Top?
The flat bottom edges create visual continuity as cards overlap - each card flows seamlessly into the next, reinforcing the "deck" metaphor. Fully rounded corners would create visual gaps.

### Why -27px Overlap?
More aggressive overlap than the initial -12px creates that satisfying "riffle through" feeling of physical cards, while still leaving enough edge visible to clearly see the stacking effect.

### Why Keep Expanded Cards in the Stack?
Rather than floating away with full margin reset, expanded cards maintain `-22px` connection to the deck. This preserves the "lifting a card from the deck" metaphor while the `2rem` bottom margin ensures content is fully visible.

### Why Set-Based Expansion Tracking?
Allows multiple cards to be expanded simultaneously, giving users flexibility to compare or reference multiple verses at once without collapsing others.

### Why localStorage vs IndexedDB?
View mode preference is a UI-only setting that doesn't need server sync or the complexity of IndexedDB. localStorage is simpler and sufficient for this use case.

## Files Modified

1. **client/index.html**
   - Added Material Design Icons CDN link

2. **client/src/app.ts**
   - Added `verseViewMode` state (localStorage-backed)
   - Added `expandedVerseIds` Set tracking
   - Added `toggleViewMode()` function
   - Added `toggleVerseExpansion()` function
   - Added watchers for auto-collapse triggers

3. **client/src/App.vue**
   - Added view toggle button with MDI icons
   - Conditional container spacing (no space-y-4 in compact mode)
   - Passed `viewMode` and `isExpanded` props to VerseCard

4. **client/src/components/VerseCard.vue**
   - Added conditional template for compact vs full display
   - Added `isCompact` computed property
   - Added click handler for expansion
   - Dynamic border-radius based on mode
   - Added `verse-card-full-compact-mode-adjustment` class for expanded cards

5. **client/src/styles.css**
   - Added `.verse-card-compact` styles (overlap, shadows, padding)
   - Added `.verse-card-full-compact-mode-adjustment` for expanded cards
   - Added `.compact-content` with line-clamp truncation
   - Added first-child exception (no overlap, single shadow)
   - Added hover effects for lift and shadow enhancement

## User Experience

**Before:**
- All verses displayed as full cards
- Significant scrolling required for large collections
- Uniform display regardless of context

**After:**
- Toggle between full and compact views based on task
- Compact mode: Quick scanning through tightly-stacked cards
- Click any card to expand for detailed view
- Multiple cards can be expanded simultaneously
- Auto-collapse when filtering/sorting maintains clean state
- Preference persists across sessions

## Testing Notes

- ✅ View toggle switches between modes correctly
- ✅ localStorage persistence works across sessions
- ✅ Cards overlap with proper stacking visual
- ✅ Hover effect lifts cards and enhances shadows
- ✅ Click expands cards inline with full content
- ✅ Multiple cards can be expanded simultaneously
- ✅ Search/sort/tab changes collapse expanded cards
- ✅ Same behavior on mobile and desktop
- ✅ Flat-bottom/rounded-top creates cohesive deck appearance
- ✅ Expanded cards remain visually connected to deck

## Future Enhancements (Potential)

- Keyboard shortcut to toggle view mode (e.g., 'v')
- Animation/transition when switching between modes
- Card "shuffle" animation when sorting changes
- Drag-to-reorder in compact mode (would require significant work)
- Settings to customize overlap amount or truncation lines

## Related Patterns

- **localStorage Preference Pattern**: Similar to `verseSortPreference` for UI state
- **Set-based Tracking**: Efficient membership testing for expanded cards
- **Computed Property Pattern**: `isCompact` simplifies template logic
- **Watcher Pattern**: Auto-collapse on filter changes maintains clean state
- **Mobile-First CSS**: Responsive font-size in `.compact-content`

## Impact

This feature significantly improves the browsing experience for users with large verse collections, providing a more tactile and efficient way to scan through verses while maintaining quick access to full details when needed.
