# Documentation Interval Descriptions

**Date:** January 2026
**Type:** Documentation Update

## Summary

Updated all public-facing documentation to describe spaced repetition intervals in human-friendly terms instead of specific day counts.

## Problem

The specific day counts (56, 112) used in documentation:
- Seemed arbitrary to users
- Were hard to remember and understand
- Didn't communicate the underlying pattern clearly

## Solution

Replaced specific day counts with broader time period descriptions:

| Old Description | New Description |
|----------------|-----------------|
| "8→56→112 day intervals" | "daily → weekly → monthly" |
| "days 1-7: daily" | "First week: daily (learning phase)" |
| "days 8-56: daily" | "First 2 months: daily (establishing memory)" |
| "days 57-112: weekly" | "2-4 months: weekly (solidifying retention)" |
| "day 113+: monthly" | "4+ months: monthly (long-term maintenance)" |

## Files Updated

1. **README.md** - Line 30 and Review Schedule section
2. **client/src/LandingPage.vue** - Smart Flashcards feature description
3. **client/public/features.html** - Spaced repetition bullet points
4. **memory-bank/productContext.md** - Spaced Repetition Schedule section
5. **memory-bank/systemPatterns.md** - Algorithm Thresholds section
6. **memory-bank/progress.md** - Feature descriptions (2 places)

## No Code Changes Required

The actual algorithm thresholds (7, 56, 112 days) remain unchanged. This was purely a documentation clarity improvement.

## Rationale

The thresholds are actually clean multiples of 7:
- 7 days = 1 week
- 56 days = 8 weeks ≈ 2 months
- 112 days = 16 weeks ≈ 4 months

Describing them in weeks/months makes the pattern obvious and memorable.
