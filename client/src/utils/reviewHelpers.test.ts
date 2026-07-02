/**
 * Tests for review helper utilities (flash-cards word splitting).
 * Run with: npm test (or npx vitest run / npx vitest watch)
 *
 * Same code-point constant convention as firstLetters.test.ts: apostrophe
 * variants are built with String.fromCharCode so editors/tools can never
 * silently normalize the characters these tests assert.
 */

import { describe, it, expect } from 'vitest'
import { getWords } from './reviewHelpers'

const APO = String.fromCharCode(0x27)   // straight apostrophe (U+0027)
const LSQ = String.fromCharCode(0x2018) // left single quotation mark (U+2018)
const RSQ = String.fromCharCode(0x2019) // right single quotation mark = typographic apostrophe (U+2019)
const MLA = String.fromCharCode(0x2bc)  // modifier letter apostrophe (U+02BC)
const NL = String.fromCharCode(10)      // newline

/**
 * Render the split compactly: hideable words in [brackets], everything else
 * verbatim. "[Satan's] [host]." means two hideable words plus punctuation.
 */
function mark(input: string, allowNumbers = false): string {
  return getWords(input, allowNumbers)
    .map(item => (item.isWord ? '[' + item.str + ']' : item.str))
    .join('')
}

/** All items concatenated must reproduce the input exactly (nothing lost). */
function reconstruct(input: string, allowNumbers = false): string {
  return getWords(input, allowNumbers).map(item => item.str).join('')
}

describe('getWords', () => {
  describe('basic splitting', () => {
    it('splits words and keeps spaces as non-words', () => {
      expect(mark('My soul waiteth')).toBe('[My] [soul] [waiteth]')
    })

    it('keeps punctuation as non-words', () => {
      expect(mark('peace, whose mind is stayed.')).toBe('[peace], [whose] [mind] [is] [stayed].')
    })

    it('emits a standalone newline marker between lines', () => {
      expect(mark(`first line${NL}second line`)).toBe(`[first] [line]${NL}[second] [line]`)
      expect(getWords(`a${NL}b`)[1]).toEqual({ isWord: false, str: NL })
    })

    it('keeps hyphenated compounds as one word', () => {
      expect(mark('self-control and long-suffering')).toBe('[self-control] [and] [long-suffering]')
    })
  })

  describe('apostrophes and single quotes (positional)', () => {
    it('typographic apostrophe possessive stays one word (U+2019)', () => {
      expect(mark(`waiting to drive back Satan${RSQ}s host.`))
        .toBe(`[waiting] [to] [drive] [back] [Satan${RSQ}s] [host].`)
    })

    it('typographic apostrophe contraction stays one word (U+2019)', () => {
      expect(mark(`Don${RSQ}t fear`)).toBe(`[Don${RSQ}t] [fear]`)
    })

    it('straight apostrophe possessive stays one word (U+0027)', () => {
      expect(mark(`God${APO}s Son`)).toBe(`[God${APO}s] [Son]`)
    })

    it('modifier letter apostrophe stays one word (U+02BC)', () => {
      expect(mark(`Satan${MLA}s host`)).toBe(`[Satan${MLA}s] [host]`)
    })

    it('mis-encoded left single quote between letters stays one word (U+2018)', () => {
      expect(mark(`Satan${LSQ}s host`)).toBe(`[Satan${LSQ}s] [host]`)
    })

    it('trailing possessive apostrophe is visible punctuation', () => {
      expect(mark(`Jesus${RSQ} sake`)).toBe(`[Jesus]${RSQ} [sake]`)
    })

    it('curly quote marks around a word are visible punctuation', () => {
      expect(mark(`${LSQ}Come${RSQ}, he said`)).toBe(`${LSQ}[Come]${RSQ}, [he] [said]`)
    })

    it('straight quote marks around a word are visible punctuation', () => {
      expect(mark(`${APO}Come${APO}, he said`)).toBe(`${APO}[Come]${APO}, [he] [said]`)
    })
  })

  describe('unicode letters', () => {
    it('accented Spanish words stay whole', () => {
      expect(mark('Jesús dijo')).toBe('[Jesús] [dijo]')
    })

    it('German umlaut words stay whole', () => {
      expect(mark('Für Gott ist nichts unmöglich')).toBe('[Für] [Gott] [ist] [nichts] [unmöglich]')
    })
  })

  describe('reference mode (allowNumbers)', () => {
    it('numbers start words in references', () => {
      expect(mark('1 John 3:16', true)).toBe('[1] [John] [3]:[16]')
    })

    it('numbers do not start words in content mode', () => {
      expect(mark('3 Thou wilt keep')).toBe('3 [Thou] [wilt] [keep]')
    })
  })

  describe('lossless splitting', () => {
    const inputs = [
      `Holy angels were anxiously watching and waiting to drive back Satan${RSQ}s host.`,
      `He said, ${LSQ}Fear not, for I am with you.${RSQ}`,
      `3 Thou wilt keep him in perfect peace.${NL}4 Trust ye in the LORD.`,
      'well-known all-powerful, self-control',
    ]
    inputs.forEach(input => {
      it(`reconstructs: ${input.slice(0, 40)}...`, () => {
        expect(reconstruct(input)).toBe(input)
        expect(reconstruct(input, true)).toBe(input)
      })
    })
  })
})
