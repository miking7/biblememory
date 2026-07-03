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
import { getWords } from '../utils/reviewHelpers';

// Review mode types
export type ReviewMode =
  | 'reference'      // Show only verse reference
  | 'content'        // Show full verse text
  | 'hints'          // Progressive word revelation
  | 'firstletters'   // First letter + punctuation only
  | 'flashcards'     // Random word hiding with difficulty levels
  | 'typeit';        // Type the verse from memory (coming soon)

// Navigation intent for the most recent state change. ReviewTab maps this
// to a named Vue <Transition> so card enter/leave animations match the
// gesture (next slides left, previous slides right, etc).
export type NavDirection = 'next' | 'previous' | 'restart' | 'view-last';

// The whole composable, passed as a single prop to the review components
// (see systemPatterns §7 "Passing Composables as Props").
export type ReviewComposable = ReturnType<typeof useReview>;

export function useReview() {

  // State
  const currentReviewIndex = ref(0);
  const showVerseText = ref(false);
  const reviewComplete = ref(false);
  const dueForReview = ref<Verse[]>([]);

  // True for the entire navigate() sequence, including the review-recording
  // feedback delay that runs BEFORE any animation starts. UI controls bind
  // to this for their disabled state.
  const isNavigating = ref(false);

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

  // Animations are owned by Vue <Transition> in ReviewTab, keyed on the
  // current verse: navigate() just mutates state and records the intent
  // here; ReviewTab maps it to a named transition. This keeps navigate()
  // as the single orchestrator for every navigation source (arrows, swipe,
  // keyboard, Got it/Again, card click) without owning any animation state.
  const navDirection = ref<NavDirection>('next');

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

  const resetReview = async () => {
    navDirection.value = 'restart';
    currentReviewIndex.value = 0;
    showVerseText.value = false;
    switchToReference();

    // Only regenerate daily review if in daily mode. Await it before
    // clearing reviewComplete — flipping it first would briefly show the
    // old queue's first card until the new queue swaps in.
    if (reviewSource.value === 'daily') {
      await loadReviewVerses(true); // Force regenerate
    }
    // For filtered mode, just restart same list (no regeneration)

    reviewComplete.value = false;
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

  // Phase 2: Helper for review category display
  const getReviewCategory = (verse: Verse | null): string => {
    if (!verse || !verse.reviewCat) return '';
    return verse.reviewCat;
  };

  // Click-anywhere card handler: what a tap on the card means depends on
  // the active mode (reveal, advance, hint, reshuffle, reveal).
  const handleCardClick = () => {
    switch (reviewMode.value) {
      case 'reference':
        switchToContent();
        break;
      case 'content':
        // Got it! - navigate with review recording
        navigate({ direction: 'next', recordReview: true });
        break;
      case 'hints':
        addHint();
        break;
      case 'flashcards':
        switchToFlashCards();
        break;
      case 'firstletters':
        switchToContent(); // Reveal verse instead of reset
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

  // Review source selection methods
  const startFilteredReview = (verses: Verse[], startIndex: number = 0) => {
    navDirection.value = 'restart';
    reviewSource.value = 'filtered';
    filteredReviewVerses.value = [...verses]; // Snapshot (frozen array)
    currentReviewIndex.value = startIndex;
    reviewComplete.value = false;
    switchToReference();
  };

  const returnToDailyReview = () => {
    navDirection.value = 'restart';
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
   * Navigate to next or previous card. Single orchestrator for every
   * navigation source: record review (400ms feedback) -> mutate state.
   * The state change itself drives the card's Vue <Transition> in
   * ReviewTab (keyed on verse id), so there is nothing to await for
   * animations and no animation state to corrupt.
   *
   * @param options.direction - 'next' or 'previous'
   * @param options.recordReview - Optional: true = "got it", false = "needs practice"
   */
  const navigate = async (options: {
    direction: 'next' | 'previous';
    recordReview?: boolean;
  }) => {
    // One navigation at a time. The guard must span the review-recording
    // feedback delay: a second trigger in that window would record the
    // review twice and advance two cards. Overlapping *animations* are
    // fine — Vue's out-in transition retargets cleanly.
    if (isNavigating.value) return;

    // Can't go previous from first card
    if (options.direction === 'previous' && currentReviewIndex.value === 0) {
      return;
    }

    isNavigating.value = true;
    try {
      navDirection.value = options.direction;

      // Record review if requested (includes 400ms visual feedback)
      if (options.recordReview !== undefined) {
        await markReview(options.recordReview);
      }

      if (options.direction === 'next') {
        const isOnLastCard = currentReviewIndex.value === totalReviewCount.value - 1;

        if (isOnLastCard) {
          completeReview();
        } else {
          await nextVerse();
        }
      } else {
        await previousVerse();
      }
    } finally {
      isNavigating.value = false;
    }
  };

  /**
   * View the last card from the completion screen
   * Un-completes the review and shows the last card
   */
  const viewLastCard = () => {
    if (!reviewComplete.value) return;
    navDirection.value = 'view-last';
    uncompleteReview();
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

    // Phase 2: Content transformation (internal use + events)
    revealFirstLetterChunk,
    revealWord,

    // Navigation
    navigate,
    viewLastCard,
    isNavigating,
    navDirection,
    handleCardClick,

    // Phase 2: Keyboard shortcuts
    handleKeyPress,

    // Phase 2: UI helpers
    getHumanReadableTime,
    getReviewCategory,

    // Immersive mode
    toggleImmersiveMode,
    exitImmersiveMode,

    // Review source selection
    startFilteredReview,
    returnToDailyReview,
    refreshCurrentVerse
  };
}
