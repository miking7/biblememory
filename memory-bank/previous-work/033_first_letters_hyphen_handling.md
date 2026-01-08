# 032 - First Letters Hyphen Handling Fix (Major Rewrite)

**Date:** January 9, 2026  
**Commit:** `8f06014` - "first-letters fix: hyphen handling (major rewrite)"  
**Status:** Complete ✅

## Problem Statement

The first-letters review mode had multiple issues with text processing:

1. **Hyphen handling was incorrect:**
   - Compound words like `"self-control"` and `"well-known"` should stay together in one chunk
   - Space-hyphen-space patterns like `"patient - kind"` should break into separate chunks
   - No distinction between hyphens within words vs. hyphens as punctuation

2. **Separator handling was fragile:**
   - Multiple consecutive spaces not properly preserved
   - Only basic space detection (not Unicode whitespace)
   - Mixed terminology ("groups" vs "chunks") causing confusion

3. **Algorithm was ad-hoc:**
   - Boolean flags (`accumulatingWords`) hard to reason about
   - Complex conditional logic difficult to extend
   - Edge cases not systematically handled

## Solution: State-Machine Rewrite

### Architecture Change

**Before:** Ad-hoc boolean flags with accumulation logic  
**After:** Clean state machine with two explicit modes: `'word'` | `'separator'`

### Two-Phase Processing

**Phase 1 - Extract Words:**
- State machine processes character-by-character
- Builds array of Word objects: `{characters, separators, endOfChunk}`
- Tracks context to determine when chunks should break

**Phase 2 - Build Chunks:**
- Iterates through words array
- Groups words into chunks based on `endOfChunk` flags
- Produces final FirstLetterChunk objects: `{fullText, firstLetters, separators}`

### Key Technical Decisions

**1. Context-Dependent Hyphen Handling**

Significant insight: hyphen behavior depends on **current state**:
- In `'word'` mode: hyphen is part of compound word → stays together
- In `'separator'` mode: hyphen is punctuation → breaks chunk

Implementation:
```typescript
if (isChunkBreaker(char)
  || ((mode === 'separator') && isHyphen(char))) {
  currentWord.endOfChunk = true
}
```

This elegantly handles:
- `"self-control"` → stays together (hyphen encountered in word mode)
- `"patient - kind"` → breaks apart (hyphen encountered in separator mode)

**2. Character Classification**

Defined clear helper functions:
- `isLetter()` - Unicode-aware (`/\p{L}/u`)
- `isWhitespace()` - Unicode-aware (`/\s/u`)
- `isApostrophe()` - Three variants (`'`, `'`, `'`)
- `isHyphen()` - Regular and en-dash (`-`, `–`) but NOT em-dash (em-dash needs to be treated as any other punctuation)
- `isChunkBreaker()` - Everything except letters, apostrophes, hyphens, whitespace

**3. Mode Transition Logic**

Clear rules for state changes:
- `separator` → `word`: When letter encountered → flush previous word
- `word` → `separator`: When non-letter/non-apostrophe encountered
- Characters accumulated based on new mode (not old mode)

**4. Unicode Support**

- Unicode letter detection supports all languages (Spanish `Jesús`, German `Für`)
- Unicode whitespace detection (`/\s/u`) catches non-breaking spaces, em-spaces, etc.
- Proper handling of accented letters in first-letters output

### Chunk-Breaking Characters

**Don't break chunks:** Letters, apostrophes, regular/en-dash hyphens in word mode, whitespace

**Break chunks:** Punctuation (`,`, `.`, `:`, `;`, `!`, `?`), numbers, newlines, em-dashes (`—`), hyphens in separator mode  (ie: everything else 🙂)

### Edge Cases Resolved

1. **Multiple consecutive spaces** - Preserved in separators, rendered correctly
2. **Empty-character words** - Used nullish coalescing (`word.characters[0] ?? ''`)
3. **Leading separators** - Create chunk with blank firstLetters (e.g., `"26 My soul"`)
4. **Em-dash vs hyphen** - Em-dash always breaks, hyphen context-dependent
5. **Apostrophes in words** - Stay with word (`"God's"` → single word)

## Files Changed

**client/src/utils/firstLetters.ts** - Complete algorithm rewrite (171 lines changed)
- Added Word interface
- Replaced ad-hoc logic with state machine
- Separated into two-phase processing
- Added comprehensive character classification helpers
- Added detailed inline comments explaining algorithm

**client/src/utils/firstLetters.test.ts** - Test refinements (63 lines changed)
- Renamed `expectedGroups` → `expectedChunks` (terminology consistency)
- Updated chunk counting logic
- Reordered tests for clarity
- Updated Test 3 expectations (now correctly expects 2 chunks for `"26 My soul"`)
- Added Test 9 for space-hyphen-space pattern

## Test Results

All 9 test cases passing ✅:
- Basic punctuation and newlines
- Apostrophes within words
- Spanish accented letters
- German umlauts
- Hyphenated compound words
- Em-dash chunk breaking
- Space-hyphen-space pattern
- Multiple hyphens in sequence

## Impact

**User Experience:**
- First-letters mode now handles real-world verses correctly
- Compound words stay grouped as expected
- Parenthetical em-dash/hyphen patterns properly segmented
- Multi-language support working properly

**Code Quality:**
- Algorithm is now maintainable and extensible
- Clear separation of concerns (word extraction vs chunk building)
- Systematic handling of edge cases
- Self-documenting with helper functions

**Technical Debt Reduction:**
- Eliminated terminology confusion (standardized on "chunks")
- Removed fragile boolean flag logic
- Added proper Unicode support from the start
- Comprehensive inline documentation

## Lessons Learned

1. **State machines clarify complex logic** - Explicit modes better than boolean flags
2. **Context matters for special characters** - Hyphens behave differently based on surrounding context
3. **Two-phase processing aids reasoning** - Separate word extraction from chunk building
4. **Helper functions improve readability** - Character classification makes intent clear
5. **Unicode support requires deliberate design** - Regex flags (`/u`) essential for international text

## Related Work

- **020** - Phase 2 Review Modes Initial (first-letters mode first implementation)
- **026** - First Letters Click-to-Reveal Feature (added interactivity)
- Commit `506d62d` - "first-letters fix: handle non-latin / accented characters correctly"
- Commit `4cf693a` - "first-letters prep: split into own module + add testing"
