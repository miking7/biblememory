import { ref, computed, onMounted, watch } from 'vue';
import { useAuth } from './composables/useAuth';
import { useVerses } from './composables/useVerses';
import { useReview } from './composables/useReview';
import { useSync } from './composables/useSync';

// Vue.js app function using Composition API with composables
export function bibleMemoryApp() {
  // Tab state (kept in main app for coordination)
  const currentTab = ref<'add' | 'list' | 'review'>('list');

  // Verse list view mode (deck-style feature)
  const verseViewMode = ref<'full' | 'compact'>('full');
  const expandedVerseIds = ref<Set<string>>(new Set());

  // Use composables
  const auth = useAuth();
  const versesLogic = useVerses();
  const reviewLogic = useReview();
  const sync = useSync();

  // Combined hasSyncIssues that checks authentication
  const hasSyncIssuesWithAuth = computed(() => {
    return auth.isAuthenticated.value && sync.hasSyncIssues.value;
  });

  // Toast notification state
  const showOfflineToast = ref(false);
  let toastTimeout: ReturnType<typeof setTimeout> | null = null;

  // Function to show toast for 5 seconds
  const showToast = () => {
    // Clear any existing timeout
    if (toastTimeout) {
      clearTimeout(toastTimeout);
    }

    // Show toast
    showOfflineToast.value = true;

    // Auto-hide after 5 seconds
    toastTimeout = setTimeout(() => {
      showOfflineToast.value = false;
      toastTimeout = null;
    }, 5000);
  };

  // Function to manually trigger toast (when clicking badge)
  const triggerOfflineToast = () => {
    if (hasSyncIssuesWithAuth.value) {
      showToast();
    }
  };

  // Watch for connectivity changes and show toast
  watch(hasSyncIssuesWithAuth, (newValue, oldValue) => {
    // Only show toast when sync status changes (not on initial load)
    if (oldValue !== undefined && newValue !== oldValue) {
      showToast();
    }
  });

  // Initialization
  const init = async () => {
    console.log("Initializing Bible Memory App...");

    // Initialize verse form with today's date
    versesLogic.initializeForm();

    // Check authentication
    await auth.checkAuth();

    // Load data
    await versesLogic.loadVerses();
    await reviewLogic.loadReviewVerses(); // Load review verses on init
    await reviewLogic.initReviewCache(); // Load today's reviews into cache
    await reviewLogic.updateStats();
    await reviewLogic.updateCurrentVerseReviewStatus(); // Set initial status

    // Start sync if authenticated
    if (auth.isAuthenticated.value) {
      sync.scheduleSync(async () => {
        await versesLogic.loadVerses();
        await reviewLogic.updateStats();
      });
    }

    console.log("App initialized successfully");
  };

  // Enhanced auth handlers that integrate with sync
  const handleLoginWithSync = async () => {
    await auth.handleLogin(async (localVerseCount: number) => {
      // Start sync after login
      sync.scheduleSync(async () => {
        await versesLogic.loadVerses();
        await reviewLogic.updateStats();
      });

      // Reload verses
      await versesLogic.loadVerses();

      if (localVerseCount > 0) {
        console.log(`Syncing ${localVerseCount} local verses with server...`);
      }
    });
  };

  const handleRegisterWithSync = async () => {
    const localVerseCount = versesLogic.verses.value.length;

    await auth.handleRegister(localVerseCount, async () => {
      // Start sync after registration
      sync.scheduleSync(async () => {
        await versesLogic.loadVerses();
        await reviewLogic.updateStats();
      });

      // Reload verses
      await versesLogic.loadVerses();
    });
  };

  // Deck-style view functions
  const toggleViewMode = () => {
    verseViewMode.value = verseViewMode.value === 'full' ? 'compact' : 'full';
    // Clear expanded cards when switching modes
    expandedVerseIds.value.clear();
  };

  const toggleVerseExpansion = (verseId: string) => {
    if (verseViewMode.value === 'compact') {
      if (expandedVerseIds.value.has(verseId)) {
        expandedVerseIds.value.delete(verseId);
      } else {
        expandedVerseIds.value.add(verseId);
      }
      // Trigger reactivity by creating new Set
      expandedVerseIds.value = new Set(expandedVerseIds.value);
    }
  };

  // Click-anywhere card handler
  const handleCardClick = () => {
    switch (reviewLogic.reviewMode.value) {
      case 'reference':
        reviewLogic.switchToContent();
        break;
      case 'content':
        reviewLogic.nextVerse();
        break;
      case 'hints':
        reviewLogic.addHint();
        break;
      case 'flashcards':
        reviewLogic.switchToFlashCards();
        break;
      case 'firstletters':
        reviewLogic.switchToContent(); // Reveal verse instead of reset
        break;
    }
  };

  // Review source selection handlers
  const startReviewFromFiltered = () => {
    // Capture current filtered verses and switch to Review tab
    const currentFiltered = versesLogic.filteredVerses.value;
    if (currentFiltered.length === 0) {
      alert('No verses to review in current filter!');
      return;
    }
    
    reviewLogic.startFilteredReview(currentFiltered);
    currentTab.value = 'review';
  };

  const startReviewAtVerse = (verseId: string) => {
    // Find verse in current filtered list
    const currentFiltered = versesLogic.filteredVerses.value;
    const verseIndex = currentFiltered.findIndex(v => v.id === verseId);
    
    if (verseIndex === -1) {
      alert('Verse not found in current filter!');
      return;
    }
    
    reviewLogic.startFilteredReview(currentFiltered, verseIndex);
    currentTab.value = 'review';
  };

  // Wrapper for saveEditVerse that also refreshes the review card
  const saveEditVerseAndRefresh = async () => {
    const editingId = versesLogic.editingVerse.value?.id;
    
    // Call the original save function
    await versesLogic.saveEditVerse();
    
    // After save, refresh the review card if we're in review mode
    if (editingId && currentTab.value === 'review') {
      // Find the updated verse in the main verses array
      const updatedVerse = versesLogic.verses.value.find(v => v.id === editingId);
      if (updatedVerse) {
        reviewLogic.refreshCurrentVerse(updatedVerse);
      }
    }
  };

  // Load view mode from localStorage on mount
  onMounted(() => {
    const savedViewMode = localStorage.getItem('verseViewMode');
    if (savedViewMode === 'full' || savedViewMode === 'compact') {
      verseViewMode.value = savedViewMode;
    }
    init();
  });

  // Save view mode to localStorage when it changes
  watch(verseViewMode, (newMode) => {
    localStorage.setItem('verseViewMode', newMode);
  });

  // Clear expanded cards when search/sort/tab changes (collapse triggers)
  watch([versesLogic.searchQuery, versesLogic.sortBy], () => {
    expandedVerseIds.value.clear();
    expandedVerseIds.value = new Set(); // Trigger reactivity
  });

  watch(currentTab, (newTab, oldTab) => {
    if (oldTab === 'list' && newTab !== 'list') {
      expandedVerseIds.value.clear();
      expandedVerseIds.value = new Set(); // Trigger reactivity
    }
    
    // Reset Add Verse wizard when switching to Add tab
    if (newTab === 'add') {
      versesLogic.resetAddVerseWizard();
      versesLogic.initializeForm();
    }
  });

  // Return everything for template
  return {
    // Tab state
    currentTab,

    // Auth (from useAuth)
    isAuthenticated: auth.isAuthenticated,
    userEmail: auth.userEmail,
    showAuthModal: auth.showAuthModal,
    authMode: auth.authMode,
    authForm: auth.authForm,
    authLoading: auth.authLoading,
    showUserMenu: auth.showUserMenu,
    openAuthModal: auth.openAuthModal,
    closeAuthModal: auth.closeAuthModal,
    handleLogin: handleLoginWithSync,
    handleRegister: handleRegisterWithSync,
    handleLogout: auth.handleLogout,

    // Verses (from useVerses)
    verses: versesLogic.verses,
    searchQuery: versesLogic.searchQuery,
    sortBy: versesLogic.sortBy,
    newVerse: versesLogic.newVerse,
    showAddSuccess: versesLogic.showAddSuccess,
    showEditModal: versesLogic.showEditModal,
    editingVerse: versesLogic.editingVerse,
    importFileRef: versesLogic.importFileRef,
    filteredVerses: versesLogic.filteredVerses,
    hasVersesButNoSearchResults: versesLogic.hasVersesButNoSearchResults,
    addVerse: versesLogic.addVerse,
    startEditVerse: versesLogic.startEditVerse,
    saveEditVerse: saveEditVerseAndRefresh,
    deleteVerse: versesLogic.deleteVerse,
    setSortBy: versesLogic.setSortBy,
    exportVerses: versesLogic.exportVerses,
    importVerses: versesLogic.importVerses,

    // Add verse wizard (from useVerses)
    addVerseStep: versesLogic.addVerseStep,
    pastedText: versesLogic.pastedText,
    parsingState: versesLogic.parsingState,
    parsingError: versesLogic.parsingError,
    resetAddVerseWizard: versesLogic.resetAddVerseWizard,
    parseVerseWithAI: versesLogic.parseVerseWithAI,
    skipAIParsing: versesLogic.skipAIParsing,
    goBackToPaste: versesLogic.goBackToPaste,

    // Review (from useReview)
    currentReviewIndex: reviewLogic.currentReviewIndex,
    showVerseText: reviewLogic.showVerseText,
    reviewComplete: reviewLogic.reviewComplete,
    dueForReview: reviewLogic.dueForReview,
    reviewedToday: reviewLogic.reviewedToday,
    currentStreak: reviewLogic.currentStreak,
    currentVerseReviewStatus: reviewLogic.currentVerseReviewStatus,
    currentReviewVerse: reviewLogic.currentReviewVerse,
    totalReviewCount: reviewLogic.totalReviewCount,
    reviewSource: reviewLogic.reviewSource,
    filteredReviewVerses: reviewLogic.filteredReviewVerses,
    loadReviewVerses: reviewLogic.loadReviewVerses,
    markReview: reviewLogic.markReview,
    resetReview: reviewLogic.resetReview,
    startFilteredReview: reviewLogic.startFilteredReview,
    returnToDailyReview: reviewLogic.returnToDailyReview,
    refreshCurrentVerse: reviewLogic.refreshCurrentVerse,

    // Phase 2: Review modes
    reviewMode: reviewLogic.reviewMode,
    hintsShown: reviewLogic.hintsShown,
    flashcardLevel: reviewLogic.flashcardLevel,
    flashcardHiddenWords: reviewLogic.flashcardHiddenWords,
    flashcardRevealedWords: reviewLogic.flashcardRevealedWords,
    firstLettersRevealedGroups: reviewLogic.firstLettersRevealedGroups,
    canIncreaseFlashCardDifficulty: reviewLogic.canIncreaseFlashCardDifficulty,
    canDecreaseFlashCardDifficulty: reviewLogic.canDecreaseFlashCardDifficulty,
    getFlashCardLevelName: reviewLogic.getFlashCardLevelName,
    switchToReference: reviewLogic.switchToReference,
    switchToContent: reviewLogic.switchToContent,
    revealContent: reviewLogic.revealContent,
    switchToHints: reviewLogic.switchToHints,
    addHint: reviewLogic.addHint,
    switchToFirstLetters: reviewLogic.switchToFirstLetters,
    switchToTypeIt: reviewLogic.switchToTypeIt,
    switchToFlashCards: reviewLogic.switchToFlashCards,
    increaseFlashCardDifficulty: reviewLogic.increaseFlashCardDifficulty,
    decreaseFlashCardDifficulty: reviewLogic.decreaseFlashCardDifficulty,
    getHintedContent: reviewLogic.getHintedContent,
    getFirstLettersContent: reviewLogic.getFirstLettersContent,
    getFirstLettersChunks: reviewLogic.getFirstLettersChunks,
    revealFirstLetterChunk: reviewLogic.revealFirstLetterChunk,
    getWords: reviewLogic.getWords,
    revealWord: reviewLogic.revealWord,
    nextVerse: reviewLogic.nextVerse,
    previousVerse: reviewLogic.previousVerse,
    getHumanReadableTime: reviewLogic.getHumanReadableTime,
    getAbbreviatedAge: reviewLogic.getAbbreviatedAge,
    getReviewCategory: reviewLogic.getReviewCategory,
    formatTagForDisplay: reviewLogic.formatTagForDisplay,
    getReferenceWords: reviewLogic.getReferenceWords,
    getContentWordsStartIndex: reviewLogic.getContentWordsStartIndex,
    handleKeyPress: reviewLogic.handleKeyPress,

    // Immersive mode
    isImmersiveModeActive: reviewLogic.isImmersiveModeActive,
    toggleImmersiveMode: reviewLogic.toggleImmersiveMode,
    exitImmersiveMode: reviewLogic.exitImmersiveMode,

    // Sync (from useSync)
    lastSyncSuccess: sync.lastSyncSuccess,
    lastSyncError: sync.lastSyncError,
    lastSyncAttempt: sync.lastSyncAttempt,
    hasSyncIssues: hasSyncIssuesWithAuth,
    isOffline: sync.isOffline,

    // Toast notifications
    showOfflineToast,
    triggerOfflineToast,

    // Deck-style view mode
    verseViewMode,
    expandedVerseIds,
    toggleViewMode,
    toggleVerseExpansion,

    // Card click handler
    handleCardClick,

    // Review source selection handlers
    startReviewFromFiltered,
    startReviewAtVerse
  };
}
