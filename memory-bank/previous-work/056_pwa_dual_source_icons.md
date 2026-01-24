# 056 - PWA Dual-Source Icon System

**Date:** January 25, 2026
**Status:** Complete

## Summary

Implemented a dual-source icon generation system to use optimized icons for PWA home screen installation while preserving styled icons for other purposes (README, social sharing, in-app display).

## Problem

- Original master icon (880px) had transparency and angled perspective - not ideal for app home screen icons
- User created new 1024px master specifically designed for PWA/app icons (square, solid background)
- Existing icons (icon-192, icon-512) were used in multiple places beyond just PWA manifest (README, og:image, App.vue completion screen)
- Needed to change PWA home screen icons without affecting other icon usages

## Solution

Created dual-source icon generation:

**PWA Icons** (from `bible-memory-pwa-master-1024.png`):
- `pwa-icon-192.png` - Android PWA home screen
- `pwa-icon-512.png` - Android PWA + maskable
- `pwa-apple-touch-icon.png` - iOS home screen (180x180)

**Styled Icons** (from `bible-memory-master-880.png` - unchanged):
- `icon-192.png` - README, App.vue completion screen
- `icon-512.png` - og:image, twitter:image (social sharing)
- `favicon-16x16.png`, `favicon-32x32.png` - Browser tabs, header/footer logos

## Files Changed

1. **`client/generate-icons.mjs`** - Dual-source generation with clear categorization
2. **`client/vite.config.ts`** - PWA manifest now references `pwa-icon-*` files
3. **`client/index.html`** - apple-touch-icon now references `pwa-apple-touch-icon.png`
4. **Renamed**: `bible-memory-app-master-1024.png` → `bible-memory-pwa-master-1024.png`
5. **Deleted**: Old `apple-touch-icon.png` (replaced by pwa version)

## Key Decisions

1. **`pwa-` prefix naming**: Consistent nomenclature across all PWA-specific icons
2. **Keep styled icons separate**: Preserve original artistic design for non-PWA uses
3. **Delete unused files**: Remove old `apple-touch-icon.png` to avoid confusion

## Verification

- `npm run build` succeeds
- PWA manifest correctly references `pwa-icon-*` files
- Styled icons unchanged (icon-192, icon-512, favicons)
- Built dist contains all icons with correct sources
