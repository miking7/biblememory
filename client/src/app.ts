import { ref, computed, onMounted, watch } from 'vue';
import { useAuth } from './composables/useAuth';
import { useVerses } from './composables/useVerses';
import { useReview } from './composables/useReview';
import { useSync, type SyncHealth } from './composables/useSync';

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

  // Sync status toast: message + color keyed to the settled health verdict,
  // so the toast always says what actually happened (the old single
  // hard-coded "currently offline" message also fired on recovery).
  const SYNC_TOAST_TEXT: Record<SyncHealth, { message: string; kind: 'warning' | 'success' }> = {
    offline: { message: '⚠️ Currently offline. Changes saved locally.', kind: 'warning' },
    error: { message: '⚠️ Sync problem — changes saved locally. Will keep retrying.', kind: 'warning' },
    synced: { message: '✅ Back online — all changes synced.', kind: 'success' },
  };

  const showSyncToast = ref(false);
  const syncToastMessage = ref('');
  const syncToastKind = ref<'warning' | 'success'>('warning');
  let toastTimeout: ReturnType<typeof setTimeout> | null = null;

  // Function to show toast for 5 seconds
  const showToast = (health: SyncHealth) => {
    // Clear any existing timeout
    if (toastTimeout) {
      clearTimeout(toastTimeout);
    }

    // Show toast
    syncToastMessage.value = SYNC_TOAST_TEXT[health].message;
    syncToastKind.value = SYNC_TOAST_TEXT[health].kind;
    showSyncToast.value = true;

    // Auto-hide after 5 seconds
    toastTimeout = setTimeout(() => {
      showSyncToast.value = false;
      toastTimeout = null;
    }, 5000);
  };

  // Function to manually trigger toast (when clicking badge)
  const triggerSyncToast = () => {
    if (hasSyncIssuesWithAuth.value) {
      showToast(sync.syncHealth.value);
    }
  };

  // Toast on settled health transitions (the watcher fires only on change).
  // syncHealth only moves on real evidence (offline event, completed sync,
  // failed sync), so a transition to 'synced' is always a genuine recovery —
  // never a connectivity guess.
  watch(sync.syncHealth, (health) => {
    if (!auth.isAuthenticated.value) return;
    showToast(health);
  });

  // Initialization
  const init = async () => {
    console.log("Initializing Bible Memory App...");

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
    showEditModal: versesLogic.showEditModal,
    editingVerse: versesLogic.editingVerse,
    filteredVerses: versesLogic.filteredVerses,
    hasVersesButNoSearchResults: versesLogic.hasVersesButNoSearchResults,
    loadVerses: versesLogic.loadVerses,
    startEditVerse: versesLogic.startEditVerse,
    saveEditVerse: saveEditVerseAndRefresh,
    deleteVerse: versesLogic.deleteVerse,
    setSortBy: versesLogic.setSortBy,
    exportVerses: versesLogic.exportVerses,
    importVerses: versesLogic.importVerses,

    // Review (from useReview) — the whole composable is passed to the
    // review components as a single prop (systemPatterns §7); App.vue
    // additionally binds only the pieces its own template uses.
    review: reviewLogic,
    reviewComplete: reviewLogic.reviewComplete,
    dueForReview: reviewLogic.dueForReview,
    reviewedToday: reviewLogic.reviewedToday,
    currentStreak: reviewLogic.currentStreak,
    totalReviewCount: reviewLogic.totalReviewCount,
    reviewSource: reviewLogic.reviewSource,
    loadReviewVerses: reviewLogic.loadReviewVerses,
    returnToDailyReview: reviewLogic.returnToDailyReview,
    handleKeyPress: reviewLogic.handleKeyPress,
    isImmersiveModeActive: reviewLogic.isImmersiveModeActive,

    // Sync (from useSync) — App.vue binds only the badge visibility; the
    // richer useSync surface (syncStatus, lastSyncError) stays unexported
    // here until a template actually renders it
    hasSyncIssues: hasSyncIssuesWithAuth,

    // Toast notifications
    showSyncToast,
    syncToastMessage,
    syncToastKind,
    triggerSyncToast,

    // Deck-style view mode
    verseViewMode,
    expandedVerseIds,
    toggleViewMode,
    toggleVerseExpansion,

    // Review source selection handlers
    startReviewFromFiltered,
    startReviewAtVerse
  };
}
