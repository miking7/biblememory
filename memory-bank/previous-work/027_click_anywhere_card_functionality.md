# Click-Anywhere Card Functionality

**Date:** January 2026
**Status:** Complete ✅

## Overview

Implemented click-anywhere functionality on review cards to match legacy app behavior. Users can now click anywhere on the card to perform mode-specific actions, making the review experience more fluid and intuitive.

## Requirements

From legacy UI analysis, clicking anywhere on a card should:
- **Reference mode**: Reveal the verse content (same as "Reveal" button)
- **Content mode**: Advance to next verse (same as "Next" action)
- **Hints mode**: Show next word (same as clicking "Hint" button again)
- **Flash Cards mode**: Regenerate with new random hidden words (same as clicking "Flash Cards" button again)
- **First Letters mode**: Reset all reveals (same as clicking "First Letters" button)

## Design Considerations

### Event Propagation
- Flash Cards mode has individual clickable hidden words
- First Letters mode has individual clickable chunks
- Need to prevent double-triggering when clicking these elements

**Solution:** Added `@click.stop` to interactive elements to prevent bubbling to card handler

### User Experience
- **No visual feedback** (cursor pointer) on card itself - users discover organically
- Individual interactive elements retain their hover states for discoverability
- Entire card is clickable (header, content, footer)

### Mobile Compatibility
- Click events don't conflict with scroll gestures (tap completion required)
- Touch targets work naturally with card click handler

## Implementation

### 1. Card-Level Handler
**File:** `client/src/App.vue:278`
```vue
<div class="review-card ... relative"
     @click="handleCardClick">
```

No `cursor-pointer` class to avoid masking interactive element hover states.

### 2. Dispatch Logic
**File:** `client/src/app.ts:108-127`
```typescript
const handleCardClick = () => {
  switch (reviewLogic.reviewMode.value) {
    case 'reference':
      reviewLogic.switchToContent();
      break;
    case 'content':
      reviewLogic.nextVerse();
      break;
    case 'hints':
      reviewLogic.addHint();
      break;
    case 'flashcards':
      reviewLogic.switchToFlashCards();
      break;
    case 'firstletters':
      reviewLogic.switchToFirstLetters();
      break;
  }
};
```

### 3. Event Propagation Control
**Files:** `client/src/App.vue`

Added `@click.stop` to prevent bubbling:
- Flash Cards reference hidden words (line 294)
- Flash Cards content hidden words (line 365)
- First Letters clickable chunks (line 344)

## Testing Results

✅ **Reference Mode:** Click anywhere → reveals content
✅ **Content Mode:** Click anywhere → advances to next verse
✅ **Hints Mode:** Click anywhere → adds one more word
✅ **Flash Cards Mode:** Click anywhere → regenerates with new random words
✅ **Flash Cards Mode:** Click individual word → reveals only that word
✅ **First Letters Mode:** Click anywhere → resets all reveals
✅ **First Letters Mode:** Click individual chunk → reveals only that chunk
✅ **Mobile:** Touch events work correctly, no scroll conflicts
✅ **Discoverability:** Interactive elements maintain distinct hover states

## Files Changed

1. `client/src/App.vue`
   - Added `@click="handleCardClick"` to review card div
   - Added `@click.stop` to Flash Cards hidden words (reference and content)
   - Added `@click.stop` to First Letters clickable chunks

2. `client/src/app.ts`
   - Added `handleCardClick()` function with mode-based dispatch
   - Exported `handleCardClick` in return statement

3. `client/src/App.vue` (script setup)
   - Destructured `handleCardClick` from `bibleMemoryApp()`

## Architecture Notes

- **Centralized Handler:** Single card-level handler keeps logic simple
- **Event Bubbling:** Uses native event propagation with `.stop` modifiers
- **No Visual Clutter:** Maintains clean UI without extra hints
- **Matches Legacy:** Behavior identical to legacy app for familiar UX

## Key Insights

1. **Discoverability Trade-off:** No cursor pointer on card makes interactive elements more discoverable by contrast
2. **Stop Propagation:** Essential for modes with nested clickable elements
3. **Organic Discovery:** Users will naturally click the card and discover the behavior
4. **Legacy Parity:** Exact match to legacy behavior improves transition experience

## Future Considerations

None - feature is complete and working as designed.
