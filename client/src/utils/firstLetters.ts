/**
 * First Letters utility functions for review mode
 * Extracted to standalone module for testability
 */

export interface FirstLetterChunk {
  fullText: string;       // "My soul waiteth" or empty for separator-only groups
  firstLetters: string;   // "Msw" or empty
  separators: string;     // ": " or ".\n27 " - includes punctuation, spaces, newlines, numbers
}

/**
 * Converts content into clickable chunks for first-letters review mode.
 *
 * Features:
 * - Unicode-aware letter detection (supports accented letters, all languages)
 * - Smart hyphen handling: regular hyphens keep words together, em-dashes split
 * - Preserves punctuation, numbers, and newlines as separators
 *
 * @param content - The verse content to process
 * @returns Array of chunks with full text, first letters, and separators
 */
export function getFirstLettersChunks(content: string): FirstLetterChunk[] {
  const chunks: FirstLetterChunk[] = [];
  const isLetter = (char: string) => /[A-Za-z]/.test(char);
  const isSpace = (char: string) => char === ' ';
  const isApostrophe = (char: string) => char === "'" || char === "'" || char === "'";

  let currentWords: string[] = [];
  let currentWord = '';
  let currentSeparators = '';
  let accumulatingWords = false;

  for (let i = 0; i < content.length; i++) {
    const char = content[i];

    if (isLetter(char)) {
      if (!accumulatingWords) {
        // Starting a new word group - flush previous group if it exists
        if (currentWords.length > 0 || currentSeparators.length > 0) {
          const fullText = currentWords.join(' ');
          const firstLetters = currentWords.map(w => w.charAt(0)).join('');
        chunks.push({
            fullText,
            firstLetters,
            separators: currentSeparators
          });
          currentWords = [];
          currentSeparators = '';
        }
        accumulatingWords = true;
      }
      // Accumulate current word
      currentWord += char;
    } else if (isSpace(char)) {
      if (accumulatingWords) {
        // Space during word accumulation - stays within the group, just finishes current word
        if (currentWord) {
          currentWords.push(currentWord);
          currentWord = '';
        }
        // STAY in word-accumulating mode (don't switch to separators)
        // Spaces keep words together in the same group
      } else {
        // Space during separator accumulation - add to separators
        currentSeparators += char;
      }
    } else {
      // Check if it's an apostrophe while accumulating words - treat as part of word
      if (isApostrophe(char) && accumulatingWords) {
        currentWord += char;
      } else {
        // Punctuation, newline, number, etc. - ends the group
        if (currentWord) {
          currentWords.push(currentWord);
          currentWord = '';
        }
        // Start accumulating separators for next group
        accumulatingWords = false;
        currentSeparators += char;
      }
    }
  }

  // Flush final group
  if (currentWord) {
    currentWords.push(currentWord);
  }
  if (currentWords.length > 0 || currentSeparators.length > 0) {
    const fullText = currentWords.join(' ');
    const firstLetters = currentWords.map(w => w.charAt(0)).join('');
    chunks.push({
      fullText,
      firstLetters,
      separators: currentSeparators
    });
  }

  return chunks;
}
