import { ref, computed } from 'vue';
import { Verse } from '../db';
import {
  recordReview as recordReviewAction,
  getVersesForReview,
  getTodayReviewCount,
  getCurrentStreak
} from '../actions';
import { getFirstLettersChunks } from '../utils/firstLetters';

// Review mode types
export type ReviewMode = 
  | 'reference'      // Show only verse reference
  | 'content'        // Show full verse text
  | 'hints'          // Progressive word revelation
  | 'firstletters'   // First letter + punctuation only
  | 'flashcards';    // Random word hiding with difficulty levels

export function useReview() {
  // State
  const currentReviewIndex = ref(0);
  const showVerseText = ref(false);
  const reviewComplete = ref(false);
  const dueForReview = ref<Verse[]>([]);

  // Phase 2: Review mode state
  const reviewMode = ref<ReviewMode>('reference');
  const hintsShown = ref(0);
  const flashcardLevel = ref(25);
  const flashcardHiddenWords = ref<Set<number>>(new Set());
  const flashcardRevealedWords = ref<Set<number>>(new Set());
  const firstLettersRevealedGroups = ref<Set<number>>(new Set());

  // Immersive mode state
  const isImmersiveModeActive = ref(false);

  // Stats
  const reviewedToday = ref(0);
  const currentStreak = ref(0);

  // Computed
  const currentReviewVerse = computed(() => {
    if (currentReviewIndex.value < dueForReview.value.length) {
      return dueForReview.value[currentReviewIndex.value];
    }
    return null;
  });

  // Methods
  const loadReviewVerses = async () => {
    try {
      dueForReview.value = await getVersesForReview();
    } catch (error) {
      console.error("Failed to load review verses:", error);
    }
  };

  const updateStats = async () => {
    try {
      reviewedToday.value = await getTodayReviewCount();
      currentStreak.value = await getCurrentStreak();
    } catch (error) {
      console.error("Failed to update stats:", error);
    }
  };

  const markReview = async (success: boolean) => {
    const verse = currentReviewVerse.value;
    if (!verse) return;

    try {
      await recordReviewAction(verse.id, success ? 'recall' : 'practice');

      await updateStats();

      // Reset to reference mode before advancing
      switchToReference();

      currentReviewIndex.value++;
      showVerseText.value = false;

      if (currentReviewIndex.value >= dueForReview.value.length) {
        reviewComplete.value = true;
      }

    } catch (error) {
      console.error("Failed to record review:", error);
      alert("Failed to record review. Please try again.");
    }
  };

  const resetReview = () => {
    currentReviewIndex.value = 0;
    showVerseText.value = false;
    reviewComplete.value = false;
    switchToReference();
    loadReviewVerses();
  };

  // Phase 2: Mode switching functions
  const switchToReference = () => {
    reviewMode.value = 'reference';
    showVerseText.value = false;
    hintsShown.value = 0;
    flashcardRevealedWords.value.clear();
  };

  const switchToContent = () => {
    reviewMode.value = 'content';
    showVerseText.value = true;
  };

  const switchToHints = () => {
    reviewMode.value = 'hints';
    hintsShown.value = 3; // Start with 3 words visible
  };

  const addHint = () => {
    if (reviewMode.value === 'hints' && currentReviewVerse.value) {
      const wordCount = currentReviewVerse.value.content.split(/\s+/).length;
      if (hintsShown.value < wordCount) {
        hintsShown.value++;
      }
    }
  };

  const switchToFirstLetters = () => {
    reviewMode.value = 'firstletters';
    firstLettersRevealedGroups.value.clear(); // Reset reveals
  };

  const switchToFlashCards = (level?: number) => {
    reviewMode.value = 'flashcards';
    // If no level provided, use current level (or default to Beginner)
    if (level !== undefined) {
      flashcardLevel.value = level;
    } else if (flashcardLevel.value === 0) {
      // First time entering Flash Cards mode, default to Beginner
      flashcardLevel.value = 10;
    }
    // Always regenerate hidden words when entering Flash Cards mode
    generateHiddenWords(flashcardLevel.value);
  };

  const increaseFlashCardDifficulty = () => {
    const levels = [0, 10, 25, 45, 100];
    const currentIndex = levels.indexOf(flashcardLevel.value);
    if (currentIndex < levels.length - 1) {
      flashcardLevel.value = levels[currentIndex + 1];
      generateHiddenWords(flashcardLevel.value);
    }
  };

  const decreaseFlashCardDifficulty = () => {
    const levels = [0, 10, 25, 45, 100];
    const currentIndex = levels.indexOf(flashcardLevel.value);
    if (currentIndex > 0) {
      flashcardLevel.value = levels[currentIndex - 1];
      generateHiddenWords(flashcardLevel.value);
    }
  };

  const canIncreaseFlashCardDifficulty = computed(() => {
    return flashcardLevel.value < 100;
  });

  const canDecreaseFlashCardDifficulty = computed(() => {
    return flashcardLevel.value > 0;
  });

  const getFlashCardLevelName = computed(() => {
    const levelNames: Record<number, string> = {
      0: 'Show Verse (0%)',
      10: 'Beginner (10%)',
      25: 'Intermediate (25%)',
      45: 'Advanced (45%)',
      100: 'Memorized (100%)'
    };
    return levelNames[flashcardLevel.value] || 'Unknown';
  });

  // Phase 2: Content transformation functions
  const getHintedContent = (content: string, wordsToShow: number): string => {
    // Split all words from entire content (across all lines)
    const allWords = content.split(/\s+/).filter(w => w.length > 0);
    const totalWordCount = allWords.length;

    // If showing all words, return original content unchanged
    if (wordsToShow >= totalWordCount) {
      return content;
    }

    // Otherwise, reconstruct with only visible words + ellipsis
    // Preserve paragraph structure by tracking newlines in original content
    const lines = content.split('\n');
    let wordsCollected = 0;
    let result: string[] = [];

    for (const line of lines) {
      const words = line.split(' ').filter(w => w.length > 0);
      const visibleWordsInLine: string[] = [];

      for (const word of words) {
        if (wordsCollected < wordsToShow) {
          visibleWordsInLine.push(word);
          wordsCollected++;
        } else {
          // We've reached the limit - add what we have plus ellipsis
          result.push(visibleWordsInLine.join(' ') + '...');
          return result.join('\n');
        }
      }

      // Add this line to result if it has words
      if (visibleWordsInLine.length > 0) {
        result.push(visibleWordsInLine.join(' '));
      } else {
        // Empty line (paragraph break)
        result.push('');
      }
    }

    // If we get here, we've shown all requested words
    // Add ellipsis to the last line (should always happen since wordsToShow < totalWordCount)
    if (result.length > 0 && wordsCollected < totalWordCount) {
      result[result.length - 1] += '...';
    }

    return result.join('\n');
  };

  // Helper function to replicate legacy wordSplit behavior
  // Alternates between "word" and "non-word" segments
  // This preserves punctuation+space combinations as single units
  const wordSplit = (str: string): Array<{isWord: boolean, str: string}> => {
    if (str.length === 0) return [];

    const segments: Array<{isWord: boolean, str: string}> = [];
    const rWordStart = /[A-Za-z]/;
    const rWordStop = /[^A-Za-z0-9'\-]/;

    let isWord = rWordStart.test(str[0]);

    while (str.length > 0) {
      let next: number;
      if (isWord) {
        next = str.search(rWordStop);
      } else {
        next = str.search(rWordStart);
      }
      if (next < 0) next = str.length;

      segments.push({
        isWord: isWord,
        str: str.substring(0, next)
      });

      str = str.substring(next);
      isWord = !isWord;
    }

    return segments;
  };

  const getFirstLettersContent = (content: string): string => {
    // Process line by line to preserve paragraphs
    const lines = content.split('\n');
    return lines.map(line => {
      const segments = wordSplit(line);
      return segments.map(seg => {
        if (seg.isWord) {
          // Return first letter of words
          return seg.str.charAt(0);
        } else {
          // Keep non-word segments UNLESS they're exactly a single space
          // This preserves punctuation with trailing spaces (e.g., ", " or ": ")
          // while removing standalone spaces between words
          return seg.str !== ' ' ? seg.str : '';
        }
      }).join('');
    }).join('\n');
  };

  // getFirstLettersChunks is now imported from utils/firstLetters.ts

  // Reveal a first-letters chunk by index
  const revealFirstLetterChunk = (index: number) => {
    firstLettersRevealedGroups.value.add(index);
  };

  const generateHiddenWords = (difficulty: number) => {
    if (!currentReviewVerse.value) return;

    // Split reference and content separately (reference allows numbers as word starts)
    const refWords = getWords(currentReviewVerse.value.reference, true);
    const contentWords = getWords(currentReviewVerse.value.content, false);

    // Combine into one pool (key insight from legacy!)
    const allWords = [...refWords, ...contentWords];

    // Filter to only count actual words (isWord: true), not punctuation or spaces
    const wordIndices = allWords
      .map((item, index) => ({ item, index }))
      .filter(({ item }) => item.isWord)
      .map(({ index }) => index);

    const wordCount = wordIndices.length;
    const hideCount = Math.floor(wordCount * difficulty / 100);

    // Generate random indices from the actual word positions
    const selectedIndices: number[] = [];
    while (selectedIndices.length < hideCount) {
      const randomWordIndex = Math.floor(Math.random() * wordCount);
      const actualIndex = wordIndices[randomWordIndex];
      if (!selectedIndices.includes(actualIndex)) {
        selectedIndices.push(actualIndex);
      }
    }

    flashcardHiddenWords.value = new Set(selectedIndices);
    flashcardRevealedWords.value.clear();
  };

  const revealWord = (index: number) => {
    flashcardRevealedWords.value.add(index);
  };

  // Word object type to match legacy pattern
  interface WordItem {
    isWord: boolean;
    str: string;
  }

  const getWords = (content: string, allowNumbers: boolean = false): WordItem[] => {
    // Matches legacy wordSplit() - returns objects with {isWord, str}
    // This preserves ALL content including spaces and punctuation
    const lines = content.split('\n');
    const result: WordItem[] = [];

    lines.forEach((line, lineIndex) => {
      // Regex patterns matching legacy implementation
      const wordStartPattern = allowNumbers
        ? /[A-Za-z0-9]/          // Word can start with letter or number (for references)
        : /[A-Za-z]/;             // Word must start with letter (for content)
      const wordStopPattern = /[^A-Za-z0-9'\-]/;  // Word can contain letters, numbers, apostrophes, hyphens

      let str = line;
      let isWord = wordStartPattern.test(str.charAt(0));

      // Main loop - alternates between words and non-words
      while (str.length > 0) {
        let nextIndex = -1;

        if (isWord) {
          // Search for end of word
          const match = wordStopPattern.exec(str);
          nextIndex = match ? match.index : -1;
        } else {
          // Search for start of next word
          for (let i = 0; i < str.length; i++) {
            if (wordStartPattern.test(str.charAt(i))) {
              nextIndex = i;
              break;
            }
          }
        }

        if (nextIndex < 0) {
          nextIndex = str.length;  // Use rest of string
        }

        // Add this part to array
        result.push({
          isWord: isWord,
          str: str.substring(0, nextIndex)
        });

        // Prepare for next part
        str = str.substring(nextIndex);
        isWord = !isWord;
      }

      // Add line break marker (except after last line)
      if (lineIndex < lines.length - 1) {
        result.push({ isWord: false, str: '\n' });
      }
    });

    return result;
  };

  // Phase 2: Navigation that resets to reference mode
  const nextVerse = () => {
    currentReviewIndex.value++;
    switchToReference();
    if (currentReviewIndex.value >= dueForReview.value.length) {
      reviewComplete.value = true;
    }
  };

  const previousVerse = () => {
    if (currentReviewIndex.value > 0) {
      currentReviewIndex.value--;
      switchToReference();
    }
  };

  // Phase 2: Keyboard shortcut handler
  const handleKeyPress = (event: KeyboardEvent): boolean => {
    // Ignore if typing in input field
    if (event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement) {
      return false;
    }

    const key = event.key.toLowerCase();

    switch (key) {
      case 'i':
        toggleImmersiveMode();
        return true;
      case 'n':
        if (reviewMode.value === 'content') {
          nextVerse();
        }
        return true;
      case 'p':
        previousVerse();
        return true;
      case ' ':
        event.preventDefault(); // Prevent page scroll
        smartButtonAction(); // Unified with smart button behavior
        return true;
      case 'h':
        if (reviewMode.value === 'hints') {
          addHint();
        } else {
          switchToHints();
        }
        return true;
      case 'f':
        switchToFirstLetters();
        return true;
      case 'c':
        switchToFlashCards();
        return true;
      case 'escape':
        // If immersive mode is active, exit it first
        if (isImmersiveModeActive.value) {
          exitImmersiveMode();
        } else {
          // Otherwise, switch back to reference mode
          switchToReference();
        }
        return true;
    }

    return false;
  };

  // Phase 2: Helper for human-readable time
  const getHumanReadableTime = (startedAt: number | undefined): string => {
    if (!startedAt) return '';
    
    const now = Date.now();
    const days = Math.floor((now - startedAt) / (1000 * 60 * 60 * 24));
    
    if (days < 14) return `${days} day${days !== 1 ? 's' : ''}`;
    if (days < 56) {
      const weeks = Math.floor(days / 7);
      return `${weeks} week${weeks > 1 ? 's' : ''}`;
    }
    if (days < 336) { // < 11 months
      const months = Math.floor(days / 30.4);
      return `${months} month${months > 1 ? 's' : ''}`;
    }
    const years = Math.floor(days / 365.25);
    return `${years} year${years > 1 ? 's' : ''}`;
  };

  // Phase 2: Helper for review category display
  const getReviewCategory = (verse: Verse | null): string => {
    if (!verse || !verse.reviewCat) return '';
    return verse.reviewCat;
  };

  // Phase 2: Helper for tag display formatting
  const formatTagForDisplay = (tag: { key: string; value?: string }): string => {
    if (tag.value) {
      return `${tag.key} (${tag.value})`;
    }
    return tag.key;
  };

  // Phase 2: Helper to get reference words for Flash Cards rendering
  const getReferenceWords = (): WordItem[] => {
    if (!currentReviewVerse.value) return [];
    return getWords(currentReviewVerse.value.reference, true);
  };

  // Phase 2: Helper to get content words starting index in combined array
  const getContentWordsStartIndex = (): number => {
    if (!currentReviewVerse.value) return 0;
    return getWords(currentReviewVerse.value.reference, true).length;
  };

  // Phase 2: Smart button label and action
  const smartButtonLabel = computed(() => {
    switch (reviewMode.value) {
      case 'reference':
        return 'Reveal';
      case 'content':
        return 'Next';
      default: // hints, flashcards, firstletters
        return 'Reveal';
    }
  });

  const smartButtonAction = () => {
    switch (reviewMode.value) {
      case 'reference':
        switchToContent();
        break;
      case 'content':
        nextVerse();
        break;
      default: // hints, flashcards, firstletters
        switchToContent();
        break;
    }
  };

  // Immersive mode functions
  const toggleImmersiveMode = () => {
    isImmersiveModeActive.value = !isImmersiveModeActive.value;
  };

  const exitImmersiveMode = () => {
    isImmersiveModeActive.value = false;
  };

  return {
    // State
    currentReviewIndex,
    showVerseText,
    reviewComplete,
    dueForReview,
    reviewedToday,
    currentStreak,

    // Phase 2: Review mode state
    reviewMode,
    hintsShown,
    flashcardLevel,
    flashcardHiddenWords,
    flashcardRevealedWords,
    firstLettersRevealedGroups,

    // Immersive mode state
    isImmersiveModeActive,

    // Computed
    currentReviewVerse,
    canIncreaseFlashCardDifficulty,
    canDecreaseFlashCardDifficulty,
    getFlashCardLevelName,
    smartButtonLabel,

    // Methods
    loadReviewVerses,
    updateStats,
    markReview,
    resetReview,

    // Phase 2: Mode switching
    switchToReference,
    switchToContent,
    switchToHints,
    addHint,
    switchToFirstLetters,
    switchToFlashCards,
    increaseFlashCardDifficulty,
    decreaseFlashCardDifficulty,

    // Phase 2: Content transformation
    getHintedContent,
    getFirstLettersContent,
    getFirstLettersChunks,
    revealFirstLetterChunk,
    getWords,
    revealWord,
    generateHiddenWords,

    // Phase 2: Navigation
    nextVerse,
    previousVerse,

    // Phase 2: Keyboard shortcuts
    handleKeyPress,

    // Phase 2: UI helpers
    getHumanReadableTime,
    getReviewCategory,
    formatTagForDisplay,
    getReferenceWords,
    getContentWordsStartIndex,
    smartButtonAction,

    // Immersive mode
    toggleImmersiveMode,
    exitImmersiveMode
  };
}
