import { ref, computed, watch } from 'vue';
import { Verse } from '../db';
import {
  recordReview as recordReviewAction,
  getVersesForReview,
  getTodayReviewCount,
  getCurrentStreak,
  loadTodaysReviewsIntoCache,
  updateReviewCache,
  getCachedReviewStatus,
  getRecentReviewStatus,
  RecentReviewEntry
} from '../actions';
import { getFirstLettersChunks } from '../utils/firstLetters';
import { useCardTransitions } from './useCardTransitions';

// Review mode types
export type ReviewMode =
  | 'reference'      // Show only verse reference
  | 'content'        // Show full verse text
  | 'hints'          // Progressive word revelation
  | 'firstletters'   // First letter + punctuation only
  | 'flashcards'     // Random word hiding with difficulty levels
  | 'typeit';        // Type the verse from memory (coming soon)

export function useReview(cardElement?: any) {
  // Initialize card transitions (lazy - only if cardElement provided)
  const transitions = cardElement ? useCardTransitions(cardElement) : null;

  // State
  const currentReviewIndex = ref(0);
  const showVerseText = ref(false);
  const reviewComplete = ref(false);
  const dueForReview = ref<Verse[]>([]);

  // Review source selection state
  const reviewSource = ref<'daily' | 'filtered'>('daily');
  const filteredReviewVerses = ref<Verse[]>([]);

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

  // Review status visual feedback (for "reviewed today" indicator)
  const currentVerseReviewStatus = ref<RecentReviewEntry | null>(null);

  // Computed
  const currentReviewVerse = computed(() => {
    const verses = reviewSource.value === 'daily' 
      ? dueForReview.value 
      : filteredReviewVerses.value;
    
    if (currentReviewIndex.value < verses.length) {
      return verses[currentReviewIndex.value];
    }
    return null;
  });

  const totalReviewCount = computed(() => {
    return reviewSource.value === 'daily'
      ? dueForReview.value.length
      : filteredReviewVerses.value.length;
  });

  // Methods
  const loadReviewVerses = async (forceRegenerate: boolean = false) => {
    try {
      // Only regenerate if forced OR if no daily review exists yet
      if (forceRegenerate || dueForReview.value.length === 0) {
        dueForReview.value = await getVersesForReview();
      }
      // Otherwise, keep existing daily review list (maintain progress)
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

  // Update review status for current verse (checks cache then DB)
  const updateCurrentVerseReviewStatus = async () => {
    const verse = currentReviewVerse.value;
    if (!verse) {
      currentVerseReviewStatus.value = null;
      return;
    }

    // Try cache first (synchronous)
    const cached = getCachedReviewStatus(verse.id);
    if (cached) {
      currentVerseReviewStatus.value = cached;
      return;
    }

    // Fall back to DB query
    currentVerseReviewStatus.value = await getRecentReviewStatus(verse.id);
  };

  // Watch for verse changes and update review status automatically
  watch(currentReviewVerse, async (newVerse) => {
    if (newVerse) {
      await updateCurrentVerseReviewStatus();
    } else {
      currentVerseReviewStatus.value = null;
    }
  }, { immediate: true });

  // Initialize review cache (call on session start)
  const initReviewCache = async () => {
    await loadTodaysReviewsIntoCache();
  };

  const markReview = async (success: boolean) => {
    const verse = currentReviewVerse.value;
    if (!verse) return;

    try {
      const reviewType = success ? 'recall' : 'practice';
      const now = Date.now();

      await recordReviewAction(verse.id, reviewType);

      // Update cache immediately for visual feedback
      updateReviewCache(verse.id, reviewType, now);
      currentVerseReviewStatus.value = {
        lastReviewedAt: now,
        lastReviewType: reviewType
      };

      await updateStats();

      // Brief delay for visual feedback (card shows color before advancing)
      // Navigation is handled by the orchestrator
      await new Promise(resolve => setTimeout(resolve, 400));

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

    // Only regenerate daily review if in daily mode
    if (reviewSource.value === 'daily') {
      loadReviewVerses(true); // Force regenerate
    }
    // For filtered mode, just restart same list (no regeneration)
  };

  const completeReview = () => {
    reviewComplete.value = true;
    // Index stays at last card (in bounds)
  };

  const uncompleteReview = () => {
    reviewComplete.value = false;
    // Manually set index to last card
    currentReviewIndex.value = totalReviewCount.value - 1;
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

  const switchToTypeIt = () => {
    reviewMode.value = 'typeit';
    // Future: Initialize type-it specific state
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
  const nextVerse = async () => {
    currentReviewIndex.value++;
    switchToReference();
    const maxIndex = reviewSource.value === 'daily'
      ? dueForReview.value.length
      : filteredReviewVerses.value.length;

    if (currentReviewIndex.value >= maxIndex) {
      reviewComplete.value = true;
    } else {
      // Update review status for new verse
      await updateCurrentVerseReviewStatus();
    }
  };

  const previousVerse = async () => {
    if (currentReviewIndex.value > 0) {
      currentReviewIndex.value--;
      switchToReference();
      // Update review status for new verse
      await updateCurrentVerseReviewStatus();
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
        navigate({ direction: 'next' });
        return true;
      case 'p':
        navigate({ direction: 'previous' });
        return true;
      case ' ':
        event.preventDefault(); // Prevent page scroll
        if (reviewMode.value === 'content') {
          navigate({ direction: 'next', recordReview: true });
        } else {
          switchToContent(); // Switch to content mode (reveal verse)
        }
        return true;
      case 'g':
        if (reviewMode.value === 'content') {
          navigate({ direction: 'next', recordReview: true });
        }
        return true;
      case 'a':
        if (reviewMode.value === 'content') {
          navigate({ direction: 'next', recordReview: false });
        }
        return true;
      case 't':
        switchToTypeIt();
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

  // Phase 2: Helper for abbreviated age (for review tab footer)
  const getAbbreviatedAge = (startedAt: number | undefined): string => {
    if (!startedAt) return '';
    
    const now = Date.now();
    const days = Math.floor((now - startedAt) / (1000 * 60 * 60 * 24));
    
    if (days < 14) return `${days}d`;
    if (days < 56) {
      const weeks = Math.floor(days / 7);
      return `${weeks}w`;
    }
    if (days < 336) { // < 11 months
      const months = Math.floor(days / 30.4);
      return `${months}m`;
    }
    const years = Math.floor(days / 365.25);
    return `${years}y`;
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


  // Immersive mode functions
  const toggleImmersiveMode = () => {
    isImmersiveModeActive.value = !isImmersiveModeActive.value;
  };

  const exitImmersiveMode = () => {
    isImmersiveModeActive.value = false;
  };

  // Review source selection methods
  const startFilteredReview = (verses: Verse[], startIndex: number = 0) => {
    reviewSource.value = 'filtered';
    filteredReviewVerses.value = [...verses]; // Snapshot (frozen array)
    currentReviewIndex.value = startIndex;
    reviewComplete.value = false;
    switchToReference();
  };

  const returnToDailyReview = () => {
    reviewSource.value = 'daily';
    filteredReviewVerses.value = [];
    currentReviewIndex.value = 0;
    reviewComplete.value = false;
    switchToReference();
    // Maintain existing daily review progress (don't regenerate)
  };

  // Method to refresh current verse after edit
  const refreshCurrentVerse = (updatedVerse: Verse) => {
    // Update in daily review if that's the current source
    if (reviewSource.value === 'daily') {
      const index = dueForReview.value.findIndex(v => v.id === updatedVerse.id);
      if (index !== -1) {
        dueForReview.value[index] = updatedVerse;
      }
    }
    // Update in filtered review if that's the current source
    else {
      const index = filteredReviewVerses.value.findIndex(v => v.id === updatedVerse.id);
      if (index !== -1) {
        filteredReviewVerses.value[index] = updatedVerse;
      }
    }
  };

  /**
   * Navigate to next or previous card with animation
   * Coordinates review recording, exit/entry animations, and verse navigation
   *
   * @param options.direction - 'next' or 'previous'
   * @param options.recordReview - Optional: true = "got it", false = "needs practice"
   */
  const navigate = async (options: {
    direction: 'next' | 'previous';
    recordReview?: boolean;
  }) => {
    // Guards
    if (!transitions) {
      console.error('Card transitions not initialized - cardElement not provided to useReview');
      return;
    }
    if (transitions.isTransitioning.value) return;

    // Can't go previous from first card
    if (options.direction === 'previous' && currentReviewIndex.value === 0) {
      return;
    }

    // Record review if requested (includes 400ms visual feedback)
    if (options.recordReview !== undefined) {
      await markReview(options.recordReview);
    }

    // Exit animation
    const exitDir = options.direction === 'next' ? 'left' : 'right';
    await transitions.exitTransition({ direction: exitDir, duration: 300 });

    // Navigate
    if (options.direction === 'next') {
      const isOnLastCard = currentReviewIndex.value === totalReviewCount.value - 1;

      if (isOnLastCard) {
        // Reached end - show completion screen
        completeReview();
        // No entry animation for completion (screen just appears)
      } else {
        // Normal next card
        await nextVerse();
        await transitions.entryTransition({ direction: 'right', duration: 150 });
      }
    } else {
      // Previous card
      await previousVerse();
      await transitions.entryTransition({ direction: 'left', duration: 150 });
    }
  };

  /**
   * View the last card from the completion screen
   * Un-completes the review and shows the last card with animation
   */
  const viewLastCard = async () => {
    if (!reviewComplete.value) return;
    if (!transitions) {
      console.error('Card transitions not initialized - cardElement not provided to useReview');
      return;
    }
    if (transitions.isTransitioning.value) return;

    uncompleteReview();
    // Slide in from top/bottom
    await transitions.entryTransition({ direction: 'down', duration: 200 });
  };

  return {
    // State
    currentReviewIndex,
    showVerseText,
    reviewComplete,
    dueForReview,
    reviewedToday,
    currentStreak,

    // Review status visual feedback
    currentVerseReviewStatus,

    // Review source selection state
    reviewSource,
    filteredReviewVerses,

    // Phase 2: Review mode state
    reviewMode,
    hintsShown,
    flashcardLevel,
    flashcardHiddenWords,
    flashcardRevealedWords,
    firstLettersRevealedGroups,

    // Immersive mode state
    isImmersiveModeActive,

    // Transition state (for template bindings - only if transitions initialized)
    isTransitioning: transitions?.isTransitioning,
    cardOffset: transitions?.cardOffset,
    cardVisible: transitions?.cardVisible,
    transitionDuration: transitions?.transitionDuration,

    // Computed
    currentReviewVerse,
    totalReviewCount,
    canIncreaseFlashCardDifficulty,
    canDecreaseFlashCardDifficulty,
    getFlashCardLevelName,

    // Methods
    loadReviewVerses,
    updateStats,
    initReviewCache,
    updateCurrentVerseReviewStatus,
    markReview,
    resetReview,
    completeReview,
    uncompleteReview,

    // Phase 2: Mode switching
    switchToReference,
    switchToContent,
    switchToHints,
    addHint,
    switchToFirstLetters,
    switchToTypeIt,
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

    // Navigation (with animations)
    navigate,
    viewLastCard,
    nextVerse,
    previousVerse,

    // Phase 2: Keyboard shortcuts
    handleKeyPress,

    // Phase 2: UI helpers
    getHumanReadableTime,
    getAbbreviatedAge,
    getReviewCategory,
    formatTagForDisplay,
    getReferenceWords,
    getContentWordsStartIndex,

    // Immersive mode
    toggleImmersiveMode,
    exitImmersiveMode,

    // Review source selection
    startFilteredReview,
    returnToDailyReview,
    refreshCurrentVerse
  };
}
