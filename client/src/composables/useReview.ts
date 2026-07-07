import { ref, computed, watch } from 'vue';
import { Verse } from '../db';
import {
  recordReview as recordReviewAction,
  getDailyReviewState,
  getDailyProgress,
  getNextReviewLap,
  getTodayDateString,
  getCurrentStreak,
  loadTodaysReviewsIntoCache,
  updateReviewCache,
  getCachedReviewStatus,
  getRecentReviewStatus,
  RecentReviewEntry,
  DailyProgress
} from '../actions';
import { avoidSeamDuplicate } from '../utils/reviewScheduling';
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

// The daily-goal celebration is shown at most once per local day per device.
// It is deliberately device-local UX state (the settings table syncs via the
// oplog, which would suppress the celebration on other devices), hence
// localStorage — with an in-memory fallback for non-browser test envs.
const CELEBRATION_SHOWN_KEY = 'dailyCelebrationShownDate';
let celebrationShownFallback: string | null = null;

function celebrationShownToday(): boolean {
  const today = getTodayDateString();
  try {
    return localStorage.getItem(CELEBRATION_SHOWN_KEY) === today;
  } catch {
    return celebrationShownFallback === today;
  }
}

// Marked when the celebration is DISMISSED (not when shown): if the screen
// is up but never acknowledged (tab switch, app closed), it may re-derive
// and show again — but never twice after an acknowledgement.
function markCelebrationShown(): void {
  const today = getTodayDateString();
  try {
    localStorage.setItem(CELEBRATION_SHOWN_KEY, today);
  } catch {
    celebrationShownFallback = today;
  }
}

// Keys that mean "advance / continue" on an interstitial screen. Kept in
// sync with the next-shaped cases of handleKeyPress's main switch.
const ADVANCE_KEYS = new Set([' ', 'enter', 'n', 'arrowright']);

export function useReview() {

  // State
  const currentReviewIndex = ref(0);
  const reviewComplete = ref(false);
  const dueForReview = ref<Verse[]>([]);

  // "Hand size" for the card-footer denominator (Round 8, physical-hand-of-
  // cards framing): once a position has been reached — a card "added to
  // the hand" — going back to review an earlier one must not shrink the
  // denominator again. A high-water mark, not the live position: ratchets
  // up on every advance, resets only when the queue is rebuilt (tab
  // re-entry/re-sort via loadReviewVerses), never on ordinary lap
  // continuation.
  const handSize = ref(1); // "index 0" is already one card dealt
  watch(currentReviewIndex, (idx) => {
    handSize.value = Math.max(handSize.value, idx + 1);
  });

  // Daily quota progress (distinct verses reviewed vs. date-seeded targets).
  // `total` grows when the user over-reviews a category — never shrinks.
  const dailyProgress = ref<DailyProgress>({
    reviewed: 0,
    total: 0,
    allTargetsMet: false,
    remaining: 0,
    totalEvents: 0,
    goal: 0,
  });

  // One-time "daily goal reached" screen (pattern: celebrate once, then
  // review continues indefinitely — the queue loops over the collection)
  const showCelebration = ref(false);

  // Local date the current daily queue was built for. When the calendar day
  // changes under an open session, reviewing must stop (the seed, targets,
  // and reviewed-today state all belong to yesterday) until the user starts
  // today's session.
  const queueDate = ref<string | null>(null);
  const showNewDay = ref(false);

  // Below this many eligible verses, the daily loop pauses at the end of
  // each lap with an explicit "Review Again" screen instead of silently
  // repeating — with 1-2 verses an invisible loop just looks like a frozen
  // card. At or above it, laps append seamlessly.
  const MIN_VERSES_FOR_AUTO_LOOP = 3;
  const dailyLapComplete = ref(false);
  // Eligible-collection size when the lap-complete screen was shown (its copy)
  const lapVerseCount = ref(0);

  // Reaching the end of a lap while the day's quota is still outstanding
  // (dailyProgress.remaining > 0) means some needed-today cards were
  // skipped over — deck-first ordering guarantees remaining hits 0 partway
  // through a lap if you review straight through, well before its literal
  // end, so reaching the end with remaining > 0 can only happen via a skip
  // (previous-work/075, Round 8). Offers a choice instead of silently
  // looping past them; only applies to the seamless-loop case (small
  // collections already pause every lap via dailyLapComplete above).
  const showSkippedCardsPrompt = ref(false);

  // Any full-screen block replacing the card (drives control visibility and
  // keyboard routing). Gated on a non-empty queue — with 0 verses the
  // empty state renders instead, and keys must not act on a hidden screen.
  // The new-day screen only applies to daily review — filtered lists are
  // date-independent, so a rollover flag must not block them.
  const showingInterstitial = computed(() =>
    totalReviewCount.value > 0 && (
      showCelebration.value ||
      dailyLapComplete.value ||
      showSkippedCardsPrompt.value ||
      (showNewDay.value && reviewSource.value === 'daily')
    )
  );

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

  // Show the celebration if the day's targets are all met and it hasn't
  // been acknowledged yet today (the day-flag is written on dismissal, so
  // an unacknowledged celebration can re-derive after a rebuild). Requires
  // at least one review — on a day where every seeded target rounds to 0,
  // opening the app must not celebrate doing nothing.
  const maybeTriggerCelebration = () => {
    if (reviewSource.value !== 'daily') return;
    if (!dailyProgress.value.allTargetsMet) return;
    if (dailyProgress.value.reviewed === 0) return;
    if (celebrationShownToday()) return;
    showCelebration.value = true;
  };

  // Methods

  // (Re)build the daily queue from current synced state. Called on init and
  // on every entry to daily review, so the order self-heals after syncs and
  // rolls over naturally at midnight. Lands on the first unreviewed card.
  const loadReviewVerses = async () => {
    try {
      const { queue, startIndex, progress, dateStr } = await getDailyReviewState();
      dueForReview.value = queue;
      // Set directly rather than resetting to 0 and relying on the watcher
      // to ratchet it back up: if startIndex happens to equal the ALREADY
      // current index (e.g. both 0 on first load), reassigning to the same
      // value is a no-op for Vue's reactivity and the watcher never fires,
      // leaving handSize stuck at 0. (Not before the await, so a failed
      // fetch leaves handSize untouched too — all-or-nothing.)
      handSize.value = startIndex + 1;
      currentReviewIndex.value = startIndex;
      dailyProgress.value = progress;
      queueDate.value = dateStr;
      // Reset ALL interstitials to the fresh day's reality — a stale
      // celebration from yesterday must not survive the rebuild (it would
      // congratulate 0 reviews); if today's goal is genuinely met and
      // unacknowledged, maybeTriggerCelebration re-derives it.
      showNewDay.value = false;
      dailyLapComplete.value = false;
      showSkippedCardsPrompt.value = false;
      showCelebration.value = false;
      maybeTriggerCelebration();
    } catch (error) {
      console.error("Failed to load review verses:", error);
    }
  };

  // Flag the session stale if the local calendar day has changed since the
  // daily queue was built. Checked on every navigation and continue action,
  // plus App.vue's visibilitychange listener and midnight timer — so an
  // open PWA can't keep recording reviews into yesterday's session.
  const checkDayRollover = () => {
    if (reviewSource.value !== 'daily') return; // filtered lists are date-independent
    if (!queueDate.value) return;
    if (queueDate.value !== getTodayDateString()) {
      showNewDay.value = true;
    }
  };

  // "Start Today's Review" on the new-day screen: refresh everything
  // day-scoped (review-status cache, queue, targets, streak) for the new
  // date. Shares the isNavigating guard — key auto-repeat or double-taps
  // must not run concurrent cache rebuilds.
  const startNewDay = async () => {
    if (isNavigating.value) return;
    isNavigating.value = true;
    try {
      navDirection.value = 'restart';
      switchToReference();
      await loadTodaysReviewsIntoCache();
      await loadReviewVerses(); // clears the interstitials, sets queueDate to today
      // Only the streak still needs refreshing — loadReviewVerses already
      // set dailyProgress from the same snapshot as the queue.
      currentStreak.value = await getCurrentStreak();
      await updateCurrentVerseReviewStatus();
    } catch (error) {
      console.error("Failed to start today's review:", error);
    } finally {
      isNavigating.value = false;
    }
  };

  // "Finish Skipped Cards" on the skipped-cards prompt: same rebuild as
  // re-entering the tab — deck-first re-sort puts the still-outstanding
  // cards immediately in front (previous-work/075, Round 8).
  const finishSkippedCards = async () => {
    if (isNavigating.value) return;

    // The day may have changed while the prompt sat open — never rebuild
    // straight into a new day without the explicit ceremony (which also
    // refreshes the review-status cache and streak that a bare
    // loadReviewVerses() here would leave stale). Matches keepReviewing()'s
    // same guard.
    checkDayRollover();
    if (showNewDay.value && reviewSource.value === 'daily') {
      showSkippedCardsPrompt.value = false;
      return; // the new-day screen takes over
    }

    isNavigating.value = true;
    try {
      navDirection.value = 'restart';
      switchToReference();
      await loadReviewVerses(); // clears showSkippedCardsPrompt, re-sorts deck-first
    } catch (error) {
      console.error("Failed to rebuild for skipped cards:", error);
    } finally {
      isNavigating.value = false;
    }
  };

  const updateStats = async () => {
    try {
      const [streak, progress] = await Promise.all([getCurrentStreak(), getDailyProgress()]);
      currentStreak.value = streak;
      dailyProgress.value = progress;
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

      // Stats refresh overlaps the visual-feedback delay (card shows color
      // before advancing) — the delay dominates, so the DB reads are free.
      // Navigation is handled by the orchestrator.
      await Promise.all([
        updateStats(),
        new Promise(resolve => setTimeout(resolve, 400))
      ]);

    } catch (error) {
      console.error("Failed to record review:", error);
      alert("Failed to record review. Please try again.");
    }
  };

  // The next full pass over the collection, rotated if its head would sit
  // next to an identical card id (adjacent duplicate keys defeat the keyed
  // card <Transition>). Shared by navigate() and keepReviewing().
  const fetchRotatedLap = async () =>
    avoidSeamDuplicate(
      await getNextReviewLap(),
      dueForReview.value[dueForReview.value.length - 1]?.id
    );

  const appendLapAndAdvance = async (lap: Verse[]) => {
    dueForReview.value = [...dueForReview.value, ...lap];
    await nextVerse();
  };

  // Dismiss the celebration / lap-complete screen and carry on reviewing.
  // Mid-queue (celebration after a normal advance) this only clears the
  // screen — the index already points at the next card. At the end of the
  // queue (small-collection lap-complete, or a celebration that fired on
  // the final card) it appends the next lap and advances.
  const keepReviewing = async () => {
    if (isNavigating.value) return;

    // The day may have changed while the screen sat open (a tap at 00:00:01
    // beats the midnight timer) — never extend yesterday's queue. The stale
    // screens clear WITHOUT marking the celebration acknowledged: the flag
    // is date-keyed and yesterday's celebration is not today's.
    checkDayRollover();
    if (showNewDay.value && reviewSource.value === 'daily') {
      showCelebration.value = false;
      dailyLapComplete.value = false;
      showSkippedCardsPrompt.value = false;
      return; // the new-day screen takes over
    }

    // Capture which screen is being dismissed BEFORE clearing the flags: a
    // refetched lap below MIN_VERSES_FOR_AUTO_LOOP is the NORMAL case when
    // dismissing dailyLapComplete itself (a small collection always
    // refetches the same small lap — that's the whole point of "Review
    // Again"), but a genuine anomaly when dismissing celebration or
    // showSkippedCardsPrompt (whose own trigger required a large-enough
    // lap at fetch time) — only the latter should re-route to
    // dailyLapComplete instead of silently looping a now-small lap.
    const wasLapComplete = dailyLapComplete.value;

    isNavigating.value = true;
    try {
      navDirection.value = 'next';
      const atEnd = currentReviewIndex.value >= totalReviewCount.value - 1;

      // Fetch BEFORE clearing the flags — if the read fails, the screen
      // stays up and the tap can simply be retried.
      const lap = reviewSource.value === 'daily' && atEnd ? await fetchRotatedLap() : null;

      if (showCelebration.value) markCelebrationShown();
      showCelebration.value = false;
      dailyLapComplete.value = false;
      showSkippedCardsPrompt.value = false;

      if (lap !== null) {
        if (lap.length === 0) {
          // Nothing eligible remains (e.g. everything paused mid-session):
          // resync with reality instead of dead-ending.
          await loadReviewVerses();
        } else if (!wasLapComplete && lap.length < MIN_VERSES_FOR_AUTO_LOOP) {
          lapVerseCount.value = lap.length;
          dailyLapComplete.value = true;
        } else {
          await appendLapAndAdvance(lap);
        }
      }
    } catch (error) {
      console.error("Failed to continue reviewing:", error);
    } finally {
      isNavigating.value = false;
    }
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
    hintsShown.value = 0;
    flashcardRevealedWords.value.clear();
  };

  const switchToContent = () => {
    reviewMode.value = 'content';
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

  // Phase 2: Keyboard shortcut handler. Returns true when the key was
  // handled; the caller decides what to do with the browser event
  // (App.vue calls event.preventDefault() on true).
  const handleKeyPress = (event: KeyboardEvent): boolean => {
    // Ignore keys aimed at form controls (typing, select arrow-navigation)
    if (event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        event.target instanceof HTMLSelectElement) {
      return false;
    }

    const key = event.key.toLowerCase();

    // While an interstitial screen is up, "advance" keys trigger its
    // primary action and everything else is ignored (no card to act on).
    if (showingInterstitial.value) {
      // A focused button must keep its native Enter/Space activation —
      // hijacking it would fire the primary action instead of the button
      // the keyboard user tabbed to (e.g. "Add More Verses").
      if (event.target instanceof HTMLButtonElement) return false;

      // Immersive-mode escape hatches stay available on every screen
      if (key === 'escape') {
        if (isImmersiveModeActive.value) {
          exitImmersiveMode();
          return true;
        }
        return false;
      }
      if (key === 'i') {
        toggleImmersiveMode();
        return true;
      }

      if (ADVANCE_KEYS.has(key)) {
        if (showNewDay.value && reviewSource.value === 'daily') {
          startNewDay();
        } else {
          keepReviewing();
        }
        return true;
      }
      return false;
    }

    switch (key) {
      case 'i':
        toggleImmersiveMode();
        return true;
      case 'n':
      case 'arrowright':
        navigate({ direction: 'next' });
        return true;
      case 'p':
      case 'arrowleft':
        navigate({ direction: 'previous' });
        return true;
      case ' ':
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
    // Lingering daily interstitials would otherwise replace the chosen
    // verse and block navigation (the celebration already counted as shown
    // for the day; showNewDay survives — it's re-checked on return to daily)
    showCelebration.value = false;
    dailyLapComplete.value = false;
    showSkippedCardsPrompt.value = false;
    switchToReference();
  };

  // Enter (or re-enter) daily review. Rebuilds the queue from current
  // synced state, so verses reviewed today (any source, any device) lead
  // in review order and the rest follow in date-seeded order.
  const returnToDailyReview = async () => {
    navDirection.value = 'restart';
    reviewSource.value = 'daily';
    filteredReviewVerses.value = [];
    // Reset synchronously: a filtered-mode index applied to the old daily
    // queue would render out-of-bounds (blank card) until the rebuild lands.
    // handSize resets alongside it — the watcher only ratchets UP, so
    // leaving it would strand a high mark from the prior daily session
    // across the rebuild's await (briefly showing e.g. "1/12" instead of a
    // value consistent with the fresh session).
    currentReviewIndex.value = 0;
    handSize.value = 1;
    reviewComplete.value = false;
    switchToReference();
    await loadReviewVerses(); // sets currentReviewIndex to first unreviewed
  };

  // Method to refresh current verse after edit. The daily queue can hold
  // the same verse more than once (reviewed-today history + loop laps), so
  // update every occurrence.
  const refreshCurrentVerse = (updatedVerse: Verse) => {
    const list = reviewSource.value === 'daily' ? dueForReview : filteredReviewVerses;
    list.value = list.value.map(v => (v.id === updatedVerse.id ? updatedVerse : v));
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

    // A stale daily session (day changed since the queue was built) must
    // not record reviews or advance — surface the new-day screen instead.
    checkDayRollover();
    if (showNewDay.value && reviewSource.value === 'daily') return;

    // Celebration / lap-complete / skipped-cards screens own the
    // interaction until dismissed; a plain "next" triggers their continue
    // action (so every next-shaped input behaves consistently)
    if (showCelebration.value || dailyLapComplete.value || showSkippedCardsPrompt.value) {
      if (options.direction === 'next' && options.recordReview === undefined) {
        void keepReviewing();
      }
      return;
    }

    // Nothing to navigate (e.g. 'n' pressed on the empty-collection screen —
    // without this, nextVerse would push the index out of bounds and set
    // reviewComplete on an empty queue)
    if (totalReviewCount.value === 0) return;

    // Can't go previous from first card
    if (options.direction === 'previous' && currentReviewIndex.value === 0) {
      return;
    }

    isNavigating.value = true;
    try {
      navDirection.value = options.direction;

      // If the queue is swapped out while we're awaiting (e.g. the user taps
      // the Review tab mid-feedback-delay and returnToDailyReview rebuilds
      // it), advancing against the new queue would skip a card — abort.
      const sourceAtStart = reviewSource.value;
      const listAtStart = sourceAtStart === 'daily' ? dueForReview.value : filteredReviewVerses.value;

      // Record review if requested (includes 400ms visual feedback)
      if (options.recordReview !== undefined) {
        await markReview(options.recordReview);
      }

      const listNow = reviewSource.value === 'daily' ? dueForReview.value : filteredReviewVerses.value;
      if (reviewSource.value !== sourceAtStart || listNow !== listAtStart) return;

      if (options.direction === 'next') {
        const isOnLastCard = currentReviewIndex.value === totalReviewCount.value - 1;

        if (!isOnLastCard) {
          await nextVerse();
        } else if (reviewSource.value === 'daily') {
          // End of the daily queue. With enough eligible verses, append
          // another least-reviewed-first lap and keep going seamlessly —
          // UNLESS today's quota is still outstanding, which (given
          // deck-first ordering) can only mean some needed cards were
          // skipped over; offer a choice instead of silently looping past
          // them. With a small collection, pause on an explicit
          // lap-complete screen instead — a silent 1-2 card loop looks
          // like a frozen card to a new user.
          const lap = await fetchRotatedLap();
          if (lap.length === 0) {
            // No eligible verses left (e.g. everything paused mid-session):
            // rebuild so the queue reflects reality instead of dead-ending.
            await loadReviewVerses();
          } else if (lap.length < MIN_VERSES_FOR_AUTO_LOOP) {
            lapVerseCount.value = lap.length;
            dailyLapComplete.value = true;
          } else if (dailyProgress.value.remaining > 0) {
            showSkippedCardsPrompt.value = true;
          } else {
            await appendLapAndAdvance(lap);
          }
        } else {
          completeReview();
        }
      } else {
        await previousVerse();
      }

      // After the card has advanced, surface the one-time daily-goal
      // celebration if this review just met the last outstanding target
      // (dailyProgress was refreshed inside markReview via updateStats).
      maybeTriggerCelebration();
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
    reviewComplete,
    dueForReview,
    handSize,
    dailyProgress,
    showCelebration,
    showNewDay,
    dailyLapComplete,
    lapVerseCount,
    showSkippedCardsPrompt,
    showingInterstitial,
    queueDate,
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
    keepReviewing,
    startNewDay,
    finishSkippedCards,
    checkDayRollover,
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
