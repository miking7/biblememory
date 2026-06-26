# 063 - AddVerse Wizard Extraction Refactor

**Date:** 2026-01-27
**Status:** Complete

## Summary

Extracted the AddVerse wizard logic from `useVerses.ts` into a new dedicated `useAddVerseWizard.ts` composable, dramatically simplifying the AddVerseTab interface.

## What Changed

### Created: `useAddVerseWizard.ts`
New composable managing all wizard state and methods:
- Wizard step state (paste → form → collections-list → collections-detail → collections-pace)
- AI parsing (parseVerse, skipAIParsing, goBackToPaste)
- Single verse form (newVerse, addVerse, showAddSuccess)
- Collections browsing (loadCollections, selectCollection, etc.)
- Pace selection and scheduled verse addition (addCollectionVerses)
- Accepts `onVerseAdded` callback for parent notification

### Modified: `AddVerseTab.vue`
- Interface simplified from **17 props + 15 events → 0 props + 1 event**
- Uses `useAddVerseWizard` composable directly
- Component is now self-contained
- Template uses `wizard.step.value`, `wizard.parseVerse()` etc.

### Modified: `App.vue`
- AddVerseTab usage simplified to single line:
  ```vue
  <AddVerseTab v-if="currentTab === 'add'" @verse-added="handleVerseAdded()" />
  ```
- Removed ~35 lines of prop/event bindings
- Added `handleVerseAdded()` that calls `loadVerses()` and switches to list tab

### Modified: `useVerses.ts`
- Removed ~400 lines of wizard state and methods
- Now focused on verse CRUD, search/filter, and import/export

### Modified: `app.ts`
- Removed wizard-related exports (~50 items)
- Removed wizard initialization logic from init()
- Removed wizard reset from tab watcher

## Architecture Decision

This follows the Component DOM Ownership pattern established in systemPatterns.md §7:
- AddVerseTab now owns its wizard logic internally
- Parent receives only `verse-added` event notification
- Clean separation of concerns

## Files Changed

1. **Created:** `client/src/composables/useAddVerseWizard.ts` (~310 lines)
2. **Modified:** `client/src/components/tabs/AddVerseTab.vue` (simplified from ~450 to ~385 lines)
3. **Modified:** `client/src/App.vue` (removed wizard bindings)
4. **Modified:** `client/src/composables/useVerses.ts` (reduced from ~743 to ~313 lines, **58% reduction**)
5. **Modified:** `client/src/app.ts` (removed wizard exports)
6. **Deleted:** `memory-bank/temp-addverse-refactor-plan.md`

## Verification

- `npm run build` passes with no TypeScript errors
- Build completes successfully (273.81 KB gzipped)
