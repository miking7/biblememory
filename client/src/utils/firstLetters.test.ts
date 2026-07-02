/**
 * Tests for the first-letters utility.
 * Run with: npm test (or npx vitest run / npx vitest watch)
 *
 * Apostrophe-family characters and newlines are built by code point
 * (String.fromCharCode) so quote-normalizing editors/tools can never silently
 * rewrite what these tests assert - exactly that failure mode caused the
 * original apostrophe bug (three identical straight quotes masquerading as
 * three distinct variants).
 */

import { describe, it, expect } from 'vitest'
import { getFirstLettersChunks } from './firstLetters'

const APO = String.fromCharCode(0x27)   // straight apostrophe (U+0027)
const LSQ = String.fromCharCode(0x2018) // left single quotation mark (U+2018)
const RSQ = String.fromCharCode(0x2019) // right single quotation mark = typographic apostrophe (U+2019)
const MLA = String.fromCharCode(0x2bc)  // modifier letter apostrophe (U+02BC)
const NL = String.fromCharCode(10)      // newline

/** Render chunks exactly the way ReviewTab displays them: firstLetters + separators. */
function render(input: string): string {
  return getFirstLettersChunks(input).map(c => c.firstLetters + c.separators).join('')
}

function chunkCount(input: string): number {
  return getFirstLettersChunks(input).length
}

/** Every input character must land in exactly one chunk (fullText or separators). */
function reconstruct(input: string): string {
  return getFirstLettersChunks(input).map(c => c.fullText + c.separators).join('')
}

interface Case {
  name: string
  input: string
  expected: string
  chunks: number
}

// Original behavior (predates the apostrophe fix) - must never regress
const coreCases: Case[] = [
  {
    name: 'preserves verse numbers, punctuation and newlines',
    input: `3 Thou wilt keep him in perfect peace, whose mind is stayed on thee: because he trusteth in thee.${NL}4 Trust ye in the LORD for ever: for in the LORD JEHOVAH is everlasting strength:`,
    expected: `3 Twkhipp, wmisot: bhtit.${NL}4 TyitLfe: fitLJies:`,
    chunks: 6,
  },
  {
    name: 'straight apostrophe possessive stays inside its word (U+0027)',
    input: `God${APO}s Son who loves us; yes, truly!`,
    expected: 'GSwlu; y, t!',
    chunks: 3,
  },
  {
    name: 'leading verse number becomes a separator-only chunk',
    input: '26 My soul waiteth for the Lord',
    expected: '26 MswftL',
    chunks: 2,
  },
  {
    name: 'Spanish accented letters',
    input: 'Jesús dijo: a el árbol',
    expected: 'Jd: aeá',
    chunks: 2,
  },
  {
    name: 'German umlauts',
    input: 'Für Gott ist nichts unmöglich',
    expected: 'FGinu',
    chunks: 1,
  },
  {
    name: 'hyphenated compound words stay together',
    input: `God${APO}s grace is self-control, and long-suffering`,
    expected: 'Ggisc, als',
    chunks: 2,
  },
  {
    name: 'multiple hyphenated words',
    input: 'well-known all-powerful, self-control',
    expected: 'wkap, sc',
    chunks: 2,
  },
  {
    name: 'em-dash starts a new chunk',
    input: 'Love is patient—love is kind',
    expected: 'Lip—lik',
    chunks: 2,
  },
  {
    name: 'space-hyphen-space starts a new chunk',
    input: 'Love is patient - love is kind',
    expected: 'Lip - lik',
    chunks: 2,
  },
]

// Positional apostrophe handling: between letters = part of the word,
// anywhere else = quotation mark; never breaks a chunk either way.
const apostropheCases: Case[] = [
  {
    name: 'typographic apostrophe possessive: one chunk, apostrophe-s not shown (U+2019)',
    input: `Holy angels were anxiously watching and waiting to drive back Satan${RSQ}s host.`,
    expected: 'HawawawtdbSh.',
    chunks: 1,
  },
  {
    name: 'typographic apostrophe contractions (U+2019)',
    input: `Don${RSQ}t be afraid; it${RSQ}s I.`,
    expected: 'Dba; iI.',
    chunks: 2,
  },
  {
    name: 'straight apostrophe contractions behave identically (U+0027)',
    input: `Don${APO}t be afraid; it${APO}s I.`,
    expected: 'Dba; iI.',
    chunks: 2,
  },
  {
    name: 'modifier letter apostrophe possessive (U+02BC)',
    input: `Satan${MLA}s host`,
    expected: 'Sh',
    chunks: 1,
  },
  {
    name: 'mis-encoded left single quote between letters acts as apostrophe (U+2018)',
    input: `Satan${LSQ}s host`,
    expected: 'Sh',
    chunks: 1,
  },
  {
    name: 'curly single quotes around speech stay visible and never break chunks',
    input: `He said, ${LSQ}Fear not, for I am with you.${RSQ}`,
    expected: `Hs, ${LSQ}Fn, fIawy.${RSQ}`,
    chunks: 3,
  },
  {
    name: 'straight quotes around speech stay visible and never break chunks',
    input: `He said, ${APO}Fear not${APO}`,
    expected: `Hs, ${APO}Fn${APO}`,
    chunks: 2,
  },
  {
    name: 'trailing possessive apostrophe is absorbed mid-chunk (U+2019)',
    input: `for Jesus${RSQ} sake`,
    expected: 'fJs',
    chunks: 1,
  },
  {
    name: 'trailing possessive apostrophe stays visible next to punctuation',
    input: `the disciples${RSQ}, and`,
    expected: `td${RSQ}, a`,
    chunks: 2,
  },
  {
    name: 'quote-wrapped single letter is absorbed mid-chunk like a space',
    input: `rock ${RSQ}n${RSQ} roll`,
    expected: 'rnr',
    chunks: 1,
  },
  {
    name: 'separator-only content',
    input: '...',
    expected: '...',
    chunks: 1,
  },
]

describe('getFirstLettersChunks', () => {
  describe('core behavior', () => {
    coreCases.forEach(({ name, input, expected, chunks }) => {
      it(name, () => {
        expect(render(input)).toBe(expected)
        expect(chunkCount(input)).toBe(chunks)
      })
    })
  })

  describe('apostrophes and single quotes (positional)', () => {
    apostropheCases.forEach(({ name, input, expected, chunks }) => {
      it(name, () => {
        expect(render(input)).toBe(expected)
        expect(chunkCount(input)).toBe(chunks)
      })
    })
  })

  describe('lossless chunking', () => {
    const allCases = [...coreCases, ...apostropheCases]
    allCases.forEach(({ name, input }) => {
      it(`reconstructs input: ${name}`, () => {
        expect(reconstruct(input)).toBe(input)
      })
    })
  })
})
