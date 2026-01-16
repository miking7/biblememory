# 044 - About Page with GitHub Link

**Date:** 2026-01-16
**Status:** Complete

## Summary

Added an "About" menu item to the user dropdown menu that opens a modal displaying the GitHub repository link. This provides users easy access to project information and source code.

## Changes Made

**File Modified:** `client/src/App.vue`

1. **About Menu Item** - Added to user dropdown before Logout button
   - Click opens About modal and closes dropdown menu
   - Styled consistently with other menu items

2. **showAboutModal State** - Added ref to manage modal visibility

3. **About Modal** - Full modal implementation following existing patterns:
   - Title: "About Bible Memory"
   - Description paragraph about the app
   - GitHub link: https://github.com/miking7/biblememory
   - External link opens in new tab with proper security attributes (`target="_blank" rel="noopener noreferrer"`)
   - Close button at bottom
   - Click overlay to dismiss

## Pattern Compliance

The implementation follows existing modal patterns established by:
- Auth Modal
- Edit Modal

Key patterns used:
- `v-show` for visibility control
- `fixed inset-0 z-50 overflow-y-auto` positioning
- `glass-card rounded-2xl` styling
- Background overlay with click-to-close
- Close button at bottom

## Verification

- Build passes with TypeScript type checking
- About appears in user menu dropdown when logged in
- Clicking About opens modal with GitHub link
- GitHub link opens in new tab
- Modal closes on close button and overlay click
