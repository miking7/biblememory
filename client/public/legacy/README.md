# Legacy App Integration

## Overview

This folder contains a localStorage-bridge wrapper that allows the legacy jQuery-based Bible Memory app to work with the new IndexedDB data source. This provides a functioning legacy app with all proven features (spaced repetition, flashcards, hints, first letters, keyboard shortcuts) while the new Vue.js app is being built.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                       NEW VUE.JS APP                            │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  IndexedDB (Dexie)                                         │ │
│  │  - Source of truth for all verse data                      │ │
│  │  - Structured format with TypeScript types                 │ │
│  └────────────────────────────────────────────────────────────┘ │
│                              │                                  │
│                              ▼                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  exportToLegacyAndOpen()                                   │ │
│  │  - Loads verses from IndexedDB                             │ │
│  │  - Transforms to legacy format                             │ │
│  │  - Saves to localStorage.allVerses                         │ │
│  │  - Redirects to /legacy/index.html                         │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ (localStorage bridge)
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     LEGACY JQUERY APP                           │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  var allVerses = JSON.parse(                               │ │
│  │    localStorage.getItem('allVerses') || '[]'               │ │
│  │  );                                                        │ │
│  └────────────────────────────────────────────────────────────┘ │
│                              │                                  │
│                              ▼                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Legacy Features (all working)                             │ │
│  │  - Spaced repetition review                                │ │
│  │  - Flash cards (multiple difficulty levels)                │ │
│  │  - Hints mode (progressive word reveal)                    │ │
│  │  - First Letters mode                                      │ │
│  │  - Keyboard shortcuts (n, p, h, f, space)                  │ │
│  │  - Context menus (right-click)                             │ │
│  │  - Meditation & Application prompts                        │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## Data Transformation

The integration transforms new app format to legacy format:

### New Format (IndexedDB)
```typescript
{
  id: "uuid",
  reference: "John 3:16",
  refSort: "bible.43003016",
  content: "For God so loved...",
  translation: "NIV",
  reviewCat: "auto",                    // camelCase
  startedAt: 1704326400000,             // epoch milliseconds
  tags: [{key: "fast.sk", value: "3"}], // structured array
  favorite: boolean,
  createdAt: number,
  updatedAt: number
}
```

### Legacy Format (localStorage)
```javascript
{
  reference: "John 3:16",
  content: "For God so loved...",
  review_cat: "auto",                   // snake_case
  tags: "fast.sk=3, ss=2010.Q2.W01",    // comma-separated string
  started_at: "2024-01-15"              // YYYY-MM-DD date string
}
```

## User Flow

1. **User works in new app**
   - Adds/edits verses in modern UI
   - Data stored in IndexedDB

2. **User clicks "Legacy..." tab**
   - `exportToLegacyAndOpen()` function runs
   - Verses transformed from IndexedDB to legacy format
   - Data written to `localStorage.allVerses`
   - Browser redirects to `/legacy/index.html`

3. **Legacy app loads**
   - Reads `localStorage.allVerses`
   - If no data, shows friendly message with link back
   - If data exists, all legacy features work

4. **User reviews in legacy app**
   - Full access to all proven legacy features
   - Data remains in localStorage (read-only snapshot)

5. **User returns to new app**
   - Click "← Back to New App" link in legacy main menu
   - Continue managing verses in modern interface

## Files in This Folder

### HTML
- `index.html` - Main legacy app (modified from Laravel blade template)

### CSS
- `css/index.css` - Main stylesheet
- `css/index.iphone.css` - Mobile-specific styles
- `css/index.msie.css` - IE-specific styles

### JavaScript (jQuery Plugins)
- `js/jquery.js` - jQuery core library
- `js/jquery.scrollTo-min.js` - Smooth scrolling
- `js/jquery.contextmenu.r2.js` - Right-click context menus
- `js/jquery.shortkeys.js` - Keyboard shortcuts
- `js/jquery.cookie.js` - Cookie management
- `js/jquery.date.min.js` - Date parsing (required for `Date.fromString()`)
- `js/jquery.json.min.js` - JSON serialization
- `js/jstorage.min.js` - Storage wrapper

### Assets
- `bible.png` - App icon
- `bible.ico` - Favicon

## Key Modifications from Original

Only **ONE line** changed in the legacy JavaScript:

```javascript
// ORIGINAL (Laravel blade):
var allVerses = {!! json_encode($verses) !!};

// MODIFIED (localStorage bridge):
var allVerses = JSON.parse(localStorage.getItem('allVerses') || '[]');
```

Everything else remains exactly as in the original legacy app.

## Benefits

### ✅ Minimal Changes
- ONE line modification to legacy code
- No jQuery bundling or build process needed
- Legacy app runs as static files

### ✅ Zero Conflicts
- Complete separation between Vue.js and jQuery
- No shared runtime code
- No version conflicts

### ✅ Validates New Data Layer
- Tests IndexedDB with proven UI
- Confirms data transformations work correctly
- Provides confidence in new architecture

### ✅ Transitional Tool
- Use legacy features while building new ones
- Gradual migration path
- No feature loss during development

### ✅ Clean Architecture
- Clear data flow (one direction)
- Easy to understand and debug
- Simple to remove when no longer needed

## Limitations

### ⚠️ Read-Only for Legacy
- Changes in legacy app don't sync back to new app
- This is intentional - legacy is for testing/review only
- New app remains source of truth

### ⚠️ Manual Data Refresh
- User must click "Legacy..." tab to update data
- Not automatic/real-time
- Acceptable for transitional tool

### ⚠️ No Review Tracking
- Legacy reviews aren't recorded in IndexedDB
- Review history stays in legacy localStorage only
- Fine for testing purposes

## Future Plans

Once new app has feature parity with legacy:
1. Remove "Legacy..." tab from new app
2. Keep legacy folder for reference
3. Eventually delete when no longer needed

## Testing Checklist

- [x] Loads verses from new app
- [x] Main menu displays
- [x] "Start Review - Daily" works
- [x] "Start Review - All" works
- [x] Verse list displays
- [x] Reference → Content reveal works
- [x] Hints mode works
- [x] First Letters mode works
- [x] Flash Cards work (all difficulty levels)
- [x] Keyboard shortcuts work (n, p, h, f, space)
- [x] Context menus work (right-click)
- [x] Progress counter displays correctly
- [x] Meditation/Application prompts display
- [x] Back to new app link works

## Support

For issues or questions about the legacy integration:
1. Check localStorage contains 'allVerses' key
2. Verify data format matches legacy expectations
3. Test in new app first to ensure verses are saved
4. Check browser console for JavaScript errors

---

**Created:** December 25, 2024  
**Status:** Working  
**Purpose:** Transitional tool for feature validation
