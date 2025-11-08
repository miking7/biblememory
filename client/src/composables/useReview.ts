import { ref, computed } from 'vue';
import { Verse } from '../db';
import {
  recordReview as recordReviewAction,
  getVersesForReview,
  getTodayReviewCount,
  getCurrentStreak
} from '../actions';

export function useReview() {
  // State
  const currentReviewIndex = ref(0);
  const showVerseText = ref(false);
  const reviewComplete = ref(false);
  const dueForReview = ref<Verse[]>([]);

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
    loadReviewVerses();
  };

  return {
    // State
    currentReviewIndex,
    showVerseText,
    reviewComplete,
    dueForReview,
    reviewedToday,
    currentStreak,

    // Computed
    currentReviewVerse,

    // Methods
    loadReviewVerses,
    updateStats,
    markReview,
    resetReview
  };
}
