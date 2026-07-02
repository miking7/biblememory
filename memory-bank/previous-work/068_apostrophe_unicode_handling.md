# 068 - Apostrophe & Unicode Handling Fix (First Letters + Flash Cards)

**Date:** July 3, 2026
**Status:** Complete ✅ (awaiting Herd test + push)

## Problem

Real verse text uses the typographic apostrophe U+2019 (what BibleGateway,
e-Sword and iOS smart punctuation produce), and both text-splitting utilities
only handled the straight ASCII apostrophe U+0027:

1. **First Letters:** "…drive back Satan's host." rendered as
   `HawawawtdbS'sh.` split into two clickable groups (apostrophe treated as a
   chunk-breaking separator). Desired: `HawawawtdbSh.` in one group with the
   apostrophe-s invisible.
2. **Flash Cards:** "Satan's" split into two independently-hideable words
   (`Satan` + `s`) with the apostrophe visible between the blanks.

## Root Cause

- `isApostrophe` in firstLetters.ts compared against **three identical
  straight quotes** (byte 0x27 three times). The intended variants (U+2018,
  U+2019) were never in the file — silently stripped by quote normalization
  when the code was written. The 033 design doc has the same three identical
  bytes, so the "three variants" never existed in the repo.
- `getWords` in reviewHelpers.ts used ASCII-only patterns (`[A-Za-z0-9'\-]`):
  no curly apostrophes, and accented letters (Jesús, Für) also split words.
- The only apostrophe test used the straight quote — the one code point that
  worked — and the hand-rolled test script wasn't wired into any npm command.

## Solution: Positional Apostrophe Rule

One rule shared by both utilities. Apostrophe-family characters are U+0027,
U+2018, U+2019, U+02BC. **Position decides meaning:** between letters = part
of the word ("Satan's", "don't"); anywhere else = quotation mark
(punctuation/separator). Apostrophe-family characters never break first-letter
chunks in any position.

Resulting behavior:
- First Letters: word-internal apostrophes contribute nothing visible
  ("Satan's" → `S`); quote marks stay visible in separators; trailing
  possessives ("Jesus' sake") are absorbed mid-chunk like spaces, visible only
  when adjacent to real punctuation.
- Flash Cards: "Satan's" is one hideable word (apostrophe hides with it);
  quote marks and trailing possessive apostrophes remain visible punctuation.
- `getWords` is now Unicode-aware (`\p{L}`/`\p{N}`), fixing accented-word
  splitting (firstLetters already was, since commit f6861b4).

**Corruption-proofing (critical):** the fix encodes these characters so
quote-normalizing editors/tools can never silently rewrite them again —
numeric code-point comparison in firstLetters.ts, unicode escape sequences in
the reviewHelpers.ts regex, and String.fromCharCode constants in tests. Never
replace these with literal quote glyphs.

**Key decisions:**
- U+2018 between letters is treated as an apostrophe (only occurs there as a
  mis-encoding; positionally guarded so real opening quotes are unaffected).
- U+02BC is itself a Unicode letter (category Lm), so the apostrophe check
  must run before the letter check in the first-letters state machine.
- Trailing-possessive apostrophes are indistinguishable from closing quotes,
  so both are treated as punctuation.

## Testing Infrastructure (NEW)

- **Vitest** added (client devDependency, standalone `vitest.config.ts` that
  does not load the Vue/PWA build plugins). First automated tests in the repo.
- `npm test` at root and client (`test:watch` for development).
- 60 tests across `firstLetters.test.ts` (converted from the hand-rolled
  console script, all 9 original cases preserved verbatim) and
  `reviewHelpers.test.ts` (new coverage for `getWords`).
- Conventions: apostrophe/newline characters built via String.fromCharCode so
  the tests are immune to quote normalization; "lossless" suites assert every
  input character lands in exactly one chunk/word item.

## Files Changed

- `client/src/utils/firstLetters.ts` — code-point apostrophe set + positional
  mode transition
- `client/src/utils/reviewHelpers.ts` — Unicode word patterns + positional
  apostrophe lookahead in `wordStopPattern`
- `client/src/utils/firstLetters.test.ts` — converted to Vitest, apostrophe suites added
- `client/src/utils/reviewHelpers.test.ts` — new
- `client/vitest.config.ts` — new
- `client/package.json`, `package.json` — vitest dep + test scripts
