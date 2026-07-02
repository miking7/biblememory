/**
 * First Letters utility functions for review mode
 * Extracted to standalone module for testability
 */

export interface FirstLetterChunk {
  fullText: string       // "My soul waiteth" or empty for separator-only chunks
  firstLetters: string   // "Msw" or empty
  separators: string     // ": " or ".\n27 " - includes punctuation, spaces, newlines, numbers
}

interface Word {
  characters: string
  separators: string
  endOfChunk: boolean
}

/**
 * Converts content into clickable chunks for first-letters review mode.
 *
 * Uses a state-machine approach with two modes: 'word' and 'separator'
 * 
 * Features:
 * - Unicode-aware letter detection (supports accented letters, all languages)
 * - Smart hyphen handling: regular hyphens and en-dashes keep words together, em-dashes split chunks
 * - Positional apostrophe handling: an apostrophe-family char (' ‘ ’ ʼ) between letters
 *   is part of the word ("Satan’s" → "S"); elsewhere it's a quote mark kept as a
 *   separator — either way it never breaks a chunk
 * - Preserves punctuation, numbers, and newlines as separators
 * - Handles multiple consecutive whitespace correctly
 *
 * @param content - The verse content to process
 * @returns Array of chunks with full text, first letters, and separators
 */
export function getFirstLettersChunks(content: string): FirstLetterChunk[] {
  // Character classification helpers
  const isLetter = (char: string) => /\p{L}/u.test(char)
  const isWhitespace = (char: string) => /\s/u.test(char)
  // Apostrophe-family characters, compared by code point so quote-normalizing
  // editors/tools can never silently rewrite them:
  //   U+0027 apostrophe, U+2018 left single quote, U+2019 right single quote
  //   (the standard typographic apostrophe), U+02BC modifier letter apostrophe.
  // Position decides meaning: between letters = apostrophe (part of the word);
  // anywhere else = quotation mark (separator).
  const isApostropheChar = (char: string) => {
    const cp = char.codePointAt(0)
    return cp === 0x0027 || cp === 0x2018 || cp === 0x2019 || cp === 0x02BC
  }
  const isHyphen = (char: string) => char === '-' || char === '–' // hyphen and en-dash (not em-dash)

  // Determines if a character should break chunks
  // Chunk breakers: punctuation, numbers, newlines, em-dash, and other non-word characters
  // NOT chunk breakers: letters, apostrophe-family chars, hyphens, whitespace
  const isChunkBreaker = (char: string) => {
    return !isLetter(char) && !isApostropheChar(char) && !isWhitespace(char) && !isHyphen(char)
  }

  // Phase 1: Build words array using state machine
  const words: Word[] = []
  let currentWord: Word = {
    characters: '',
    separators: '',
    endOfChunk: false,
  }
  let mode: 'word' | 'separator' = 'separator' // Start in separator mode

  for (let i = 0; i < content.length; i++) {
    const char = content[i]

    // Determine new mode based on current character.
    // Positional apostrophe rule: an apostrophe-family char stays inside a word
    // only when it sits between letters (we're in a word and a letter follows);
    // anywhere else it's a quotation mark and belongs to the separators.
    // The apostrophe branch must come first: U+02BC is itself a Unicode letter.
    const nextChar = content[i + 1] ?? ''
    const newMode: 'word' | 'separator' = isApostropheChar(char)
      ? ((mode === 'word' && isLetter(nextChar)) ? 'word' : 'separator')
      : (isLetter(char) ? 'word' : 'separator')

    // Handle mode transition from 'separator' to 'word'
    if (mode === 'separator' && newMode === 'word') {
      // Flush current word (if not completely empty)
      if (currentWord.characters || currentWord.separators) {
        words.push(currentWord)
      }
      // Reset for new word
      currentWord = {
        characters: '',
        separators: '',
        endOfChunk: false,
      }
    }

    // Accumulate character based on new mode
    if (newMode === 'word') {
      currentWord.characters += char
    } else {
      currentWord.separators += char
    }

    // Check if current character should end the chunk
    if (isChunkBreaker(char)
      || ((mode === 'separator') && isHyphen(char))) {      // Note: when already in separator mode, hyphens break chunks
      currentWord.endOfChunk = true
    }

    mode = newMode
  }

  // Flush final word
  if (currentWord.characters || currentWord.separators) {
    words.push(currentWord)
  }

  // Phase 2: Build chunks from words array
  const chunks: FirstLetterChunk[] = []
  let currentChunk: FirstLetterChunk = {
    fullText: '',
    firstLetters: '',
    separators: '',
  }

  for (let i = 0; i < words.length; i++) {
    const word = words[i]
    const isLastWord = i === words.length - 1

    // Add word characters to chunk (using nullish coalescing for empty strings)
    currentChunk.fullText += word.characters
    currentChunk.firstLetters += word.characters[0] ?? ''

    // Decide whether to finish current chunk
    if (isLastWord || word.endOfChunk) {
      // Finish chunk: add separators and push to chunks array
      currentChunk.separators += word.separators
      chunks.push(currentChunk)
      // Reset for new chunk
      currentChunk = {
        fullText: '',
        firstLetters: '',
        separators: '',
      }
    } else {
      // Continue chunk: add separators to fullText (to preserve spaces between words)
      currentChunk.fullText += word.separators
    }
  }

  return chunks
}
