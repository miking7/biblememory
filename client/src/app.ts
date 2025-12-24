import { ref, computed, onMounted } from 'vue';
import { useAuth } from './composables/useAuth';
import { useVerses } from './composables/useVerses';
import { useReview } from './composables/useReview';
import { useSync } from './composables/useSync';

// Vue.js app function using Composition API with composables
export function bibleMemoryApp() {
  // Tab state (kept in main app for coordination)
  const currentTab = ref<'add' | 'list' | 'review'>('add');

  // Use composables
  const auth = useAuth();
  const versesLogic = useVerses();
  const reviewLogic = useReview();
  const sync = useSync();

  // Combined hasSyncIssues that checks authentication
  const hasSyncIssuesWithAuth = computed(() => {
    return auth.isAuthenticated.value && sync.hasSyncIssues.value;
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
    await reviewLogic.updateStats();

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

  // Lifecycle
  onMounted(() => {
    init();
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
    newVerse: versesLogic.newVerse,
    showAddSuccess: versesLogic.showAddSuccess,
    showEditModal: versesLogic.showEditModal,
    editingVerse: versesLogic.editingVerse,
    importFileRef: versesLogic.importFileRef,
    filteredVerses: versesLogic.filteredVerses,
    hasVersesButNoSearchResults: versesLogic.hasVersesButNoSearchResults,
    addVerse: versesLogic.addVerse,
    startEditVerse: versesLogic.startEditVerse,
    saveEditVerse: versesLogic.saveEditVerse,
    deleteVerse: versesLogic.deleteVerse,
    formatTagForDisplay: versesLogic.formatTagForDisplay,
    exportVerses: versesLogic.exportVerses,
    importVerses: versesLogic.importVerses,

    // Review (from useReview)
    currentReviewIndex: reviewLogic.currentReviewIndex,
    showVerseText: reviewLogic.showVerseText,
    reviewComplete: reviewLogic.reviewComplete,
    dueForReview: reviewLogic.dueForReview,
    reviewedToday: reviewLogic.reviewedToday,
    currentStreak: reviewLogic.currentStreak,
    currentReviewVerse: reviewLogic.currentReviewVerse,
    loadReviewVerses: reviewLogic.loadReviewVerses,
    markReview: reviewLogic.markReview,
    resetReview: reviewLogic.resetReview,

    // Sync (from useSync)
    lastSyncSuccess: sync.lastSyncSuccess,
    lastSyncError: sync.lastSyncError,
    lastSyncAttempt: sync.lastSyncAttempt,
    hasSyncIssues: hasSyncIssuesWithAuth
  };
}
