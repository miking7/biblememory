# 055 - Review Category Chip Feature

**Date:** January 2026
**Status:** Complete

## Summary

Implemented a reusable `ReviewCategoryChip` component that displays the computed review frequency (instead of raw `reviewCat` field value) with visual distinction for manual overrides. Also added grey card backgrounds for inactive verses (paused/future).

## Problem Solved

- Chips previously showed raw `reviewCat` value including "auto" which was meaningless to users
- No visual indication when a user had manually overridden the auto-calculated frequency
- The "future" category conflated two concepts: "not started yet" and "intentionally paused"
- No visual indication when scanning verse list to identify inactive verses

## Solution

### New Utility Function

`getEffectiveReviewCategory(verse)` in `client/src/actions.ts`:
- Returns `{ category: string, isManual: boolean }`
- When `reviewCat === 'auto'`: computes effective category based on `daysSinceStart`
- When manually set: returns the stored value with `isManual: true`

### New Component

`ReviewCategoryChip.vue` in `client/src/components/`:
- Takes `verse` prop
- Displays computed category in lowercase
- **Auto-computed:** Light blue background (`bg-blue-50`), dark blue text (`text-blue-600`)
- **Manual override:** Inverted colors - dark blue background (`bg-blue-600`), white text

### New "Paused" Category

- Added `paused` as a manual-only category for temporarily disabling verse reviews
- Removed `future` from manual override dropdown options (computed only)
- `paused` verses skipped in `getVersesForReview()` scheduling logic

### Grey Card Backgrounds for Inactive Verses

Added visual distinction at the card level for inactive verses:
- **CSS class:** `.review-card-inactive` with grey gradient matching existing green/amber style
- **Applied in:** Both My Verses tab (VerseCard) and Review tab (App.vue)
- **Hierarchy:** reviewed (green/amber) > inactive (grey) > default (white)

Card background colors:
| State | Background | Border |
|-------|------------|--------|
| Reviewed "got it" | Green gradient `rgb(236, 249, 245)` → white | `rgb(183, 234, 217)` |
| Reviewed "again" | Amber gradient `rgb(254, 247, 235)` → white | `rgb(252, 226, 182)` |
| Inactive (paused/future) | Grey gradient `rgb(243, 244, 246)` → white | `rgb(209, 213, 219)` |
| Default | White | Slate |

## Key Design Decisions

1. **Color inversion for manual overrides** - Subtle but clear visual distinction without adding clutter
2. **No "auto" indicator** - The inverted/normal styling implicitly shows this
3. **Lowercase text** - Chips/tags look cleaner in lowercase
4. **Semantic separation of "future" vs "paused"** - "future" = not started, "paused" = intentionally stopped
5. **No migration** - Existing `future` values left as-is for manual cleanup
6. **Card-level grey for inactive** - More visible when scanning lists than chip-only styling
7. **Consistent styling in both tabs** - My Verses and Review tabs both show grey for inactive

## Files Changed

- `client/src/actions.ts` - Added `getEffectiveReviewCategory()`, `paused` handling in scheduling
- `client/src/components/ReviewCategoryChip.vue` - New component
- `client/src/components/VerseCard.vue` - Uses chip component, computes inactive for grey background
- `client/src/App.vue` - Uses chip component, updated dropdown, inactive styling in Review tab
- `client/src/styles.css` - Added `.review-card-inactive` class

## Category Behavior

| Stored Value | Display | Chip Styling | Card Background | Scheduling |
|--------------|---------|--------------|-----------------|------------|
| `auto` | computed | Normal (blue) | Based on computed | Based on computed |
| `learn` | "learn" | Inverted | Default | Always included |
| `daily` | "daily" | Inverted | Default | Always included |
| `weekly` | "weekly" | Inverted | Default | 1-in-7 probability |
| `monthly` | "monthly" | Inverted | Default | 1-in-30 probability |
| `paused` | "paused" | Inverted | Grey | Excluded |
| `future` (legacy/computed) | "future" | Inverted/Normal | Grey | Excluded |

## Edit Modal Options

Now offers: auto, learn, daily, weekly, monthly, paused (removed "future")
