import { ref, computed } from 'vue';
import { Verse } from '../db';
import {
  recordReview as recordReviewAction,
  getVersesForReview,
  getTodayReviewCount,
  getCurrentStreak
} from '../actions';

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
  };

  const switchToFlashCards = (level: number) => {
    reviewMode.value = 'flashcards';
    flashcardLevel.value = level;
    generateHiddenWords(level);
  };

  // Phase 2: Content transformation functions
  const getHintedContent = (content: string, wordsToShow: number): string => {
    const words = content.split(/\s+/);
    return words.map((word, index) => {
      if (index < wordsToShow) {
        return word;
      } else {
        return '_'.repeat(Math.max(word.length, 1));
      }
    }).join(' ');
  };

  const getFirstLettersContent = (content: string): string => {
    const words = content.split(/(\s+|[.,;:!?'"()—\-])/);
    return words.map(part => {
      // Keep punctuation as-is
      if (/^[.,;:!?'"()—\-]+$/.test(part)) return part;
      // Skip whitespace
      if (/^\s+$/.test(part)) return '';
      // Return first letter of words
      if (part.length > 0) return part.charAt(0);
      return '';
    }).join('');
  };

  const generateHiddenWords = (difficulty: number) => {
    if (!currentReviewVerse.value) return;
    
    const words = currentReviewVerse.value.content.split(/\s+/);
    const wordCount = words.length;
    const hideCount = Math.floor(wordCount * difficulty / 100);
    
    // Generate random indices
    const indices: number[] = [];
    while (indices.length < hideCount) {
      const randomIndex = Math.floor(Math.random() * wordCount);
      if (!indices.includes(randomIndex)) {
        indices.push(randomIndex);
      }
    }
    
    flashcardHiddenWords.value = new Set(indices);
    flashcardRevealedWords.value.clear();
  };

  const revealWord = (index: number) => {
    flashcardRevealedWords.value.add(index);
  };

  const getWords = (content: string): string[] => {
    return content.split(/\s+/);
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
        if (reviewMode.value === 'reference') {
          switchToContent();
        } else if (reviewMode.value === 'content') {
          nextVerse();
        }
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
      case 'escape':
        switchToReference();
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

    // Computed
    currentReviewVerse,

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

    // Phase 2: Content transformation
    getHintedContent,
    getFirstLettersContent,
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
    formatTagForDisplay
  };
}
