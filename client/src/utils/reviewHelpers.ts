/**
 * Review helper utilities - pure functions for review tab
 * Extracted for direct import (no composable re-export)
 */

// Exported interfaces
export interface WordItem {
  isWord: boolean
  str: string
}

export interface Tag {
  key: string
  value?: string
}

/**
 * Get abbreviated age string for display (e.g., "5d", "2w", "3m", "1y")
 */
export function getAbbreviatedAge(startedAt?: number): string {
  if (!startedAt) return ''

  const now = Date.now()
  const days = Math.floor((now - startedAt) / (1000 * 60 * 60 * 24))

  if (days < 14) return `${days}d`
  if (days < 56) {
    const weeks = Math.floor(days / 7)
    return `${weeks}w`
  }
  if (days < 336) { // < 11 months
    const months = Math.floor(days / 30.4)
    return `${months}m`
  }
  const years = Math.floor(days / 365.25)
  return `${years}y`
}

/**
 * Format a tag for display (e.g., "fast.sk (3)" or just "personal")
 */
export function formatTagForDisplay(tag: Tag): string {
  if (tag.value) {
    return `${tag.key} (${tag.value})`
  }
  return tag.key
}

/**
 * Parse content into word items for flash cards mode
 * Returns objects with {isWord, str} preserving ALL content including spaces and punctuation
 *
 * @param content - Text to parse
 * @param allowNumbers - If true, numbers can start words (for references like "1 John")
 */
export function getWords(content: string, allowNumbers: boolean = false): WordItem[] {
  const lines = content.split('\n')
  const result: WordItem[] = []

  lines.forEach((line, lineIndex) => {
    // Regex patterns matching legacy implementation
    const wordStartPattern = allowNumbers
      ? /[A-Za-z0-9]/          // Word can start with letter or number (for references)
      : /[A-Za-z]/             // Word must start with letter (for content)
    const wordStopPattern = /[^A-Za-z0-9'\-]/  // Word can contain letters, numbers, apostrophes, hyphens

    let str = line
    let isWord = wordStartPattern.test(str.charAt(0))

    // Main loop - alternates between words and non-words
    while (str.length > 0) {
      let nextIndex = -1

      if (isWord) {
        // Search for end of word
        const match = wordStopPattern.exec(str)
        nextIndex = match ? match.index : -1
      } else {
        // Search for start of next word
        for (let i = 0; i < str.length; i++) {
          if (wordStartPattern.test(str.charAt(i))) {
            nextIndex = i
            break
          }
        }
      }

      if (nextIndex < 0) {
        nextIndex = str.length  // Use rest of string
      }

      // Add this part to array
      result.push({
        isWord: isWord,
        str: str.substring(0, nextIndex)
      })

      // Prepare for next part
      str = str.substring(nextIndex)
      isWord = !isWord
    }

    // Add line break marker (except after last line)
    if (lineIndex < lines.length - 1) {
      result.push({ isWord: false, str: '\n' })
    }
  })

  return result
}

/**
 * Get hinted content showing only first N words with ellipsis
 * Preserves paragraph structure
 */
export function getHintedContent(content: string, wordsToShow: number): string {
  // Split all words from entire content (across all lines)
  const allWords = content.split(/\s+/).filter(w => w.length > 0)
  const totalWordCount = allWords.length

  // If showing all words, return original content unchanged
  if (wordsToShow >= totalWordCount) {
    return content
  }

  // Otherwise, reconstruct with only visible words + ellipsis
  // Preserve paragraph structure by tracking newlines in original content
  const lines = content.split('\n')
  let wordsCollected = 0
  let result: string[] = []

  for (const line of lines) {
    const words = line.split(' ').filter(w => w.length > 0)
    const visibleWordsInLine: string[] = []

    for (const word of words) {
      if (wordsCollected < wordsToShow) {
        visibleWordsInLine.push(word)
        wordsCollected++
      } else {
        // We've reached the limit - add what we have plus ellipsis
        result.push(visibleWordsInLine.join(' ') + '...')
        return result.join('\n')
      }
    }

    // Add this line to result if it has words
    if (visibleWordsInLine.length > 0) {
      result.push(visibleWordsInLine.join(' '))
    } else {
      // Empty line (paragraph break)
      result.push('')
    }
  }

  // If we get here, we've shown all requested words
  // Add ellipsis to the last line (should always happen since wordsToShow < totalWordCount)
  if (result.length > 0 && wordsCollected < totalWordCount) {
    result[result.length - 1] += '...'
  }

  return result.join('\n')
}
