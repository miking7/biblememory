import { ref, reactive, computed, onMounted, type Ref } from 'vue';
import { db, Verse } from "./db";
import {
  addVerse,
  updateVerse,
  deleteVerse,
  recordReview,
  getAllVerses,
  getVersesForReview,
  getTodayReviewCount,
  getCurrentStreak,
  parseTags,
  formatTags,
  getTodayMidnight,
  dateToMidnightEpoch,
  epochToDateString
} from "./actions";
import { 
  syncNow, 
  isAuthenticated, 
  login, 
  register, 
  logout,
  getCurrentUserId 
} from "./sync";

// Track if sync has been scheduled to prevent duplicate listeners
let syncScheduled = false;

// Schedule automatic sync (only called when authenticated)
function scheduleSync(app: {
  lastSyncSuccess: Ref<boolean>;
  lastSyncError: Ref<string | null>;
  lastSyncAttempt: Ref<number>;
  isAuthenticated: Ref<boolean>;
  loadVerses: () => Promise<void>;
  updateStats: () => Promise<void>;
}) {
  // Prevent multiple sync schedules
  if (syncScheduled) {
    console.log("Sync already scheduled, skipping duplicate");
    return;
  }
  
  syncScheduled = true;
  console.log("Starting sync schedule...");
  
  // Helper to sync and reload UI
  const syncAndReload = async () => {
    app.lastSyncAttempt.value = Date.now();
    try {
      await syncNow();
      // Reload verses and stats after sync
      await app.loadVerses();
      await app.updateStats();
      
      // Update sync status
      app.lastSyncSuccess.value = true;
      app.lastSyncError.value = null;
      console.log("Sync completed and UI updated");
    } catch (err: any) {
      // Update sync status
      app.lastSyncSuccess.value = false;
      app.lastSyncError.value = err.message || 'Sync failed';
      console.error("Sync failed:", err);
    }
  };
  
  // Initial sync
  syncAndReload();
  
  // Adaptive sync with 1-second check interval
  let syncCounter = 0;
  
  setInterval(async () => {
    // Check if there's pending data in outbox
    const outboxCount = await db.outbox.count();
    
    if (outboxCount > 0 && app.lastSyncSuccess.value) {
      // Only do immediate sync if last sync succeeded
      // If connectivity is failing, wait for normal 30-second interval
      console.log(`Outbox has ${outboxCount} pending operations, syncing now...`);
      await syncAndReload();
      syncCounter = 0; // Reset counter after sync
    } else {
      // Increment counter for periodic sync
      syncCounter++;
      
      // Periodic sync every 30 seconds
      if (syncCounter >= 30) {
        console.log("Periodic sync (30 seconds elapsed)");
        await syncAndReload();
        syncCounter = 0;
      }
    }
  }, 1000); // Check every 1 second
  
  // Sync when tab becomes visible
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      syncAndReload();
    }
  });
}

// Vue.js app function using Composition API
export function bibleMemoryApp() {
  // State - wrap primitives in ref()
  const currentTab = ref<'add' | 'list' | 'review'>('add');
  const verses = ref<Verse[]>([]);
  const searchQuery = ref('');
  
  // Sync status tracking
  const lastSyncSuccess = ref(true);
  const lastSyncError = ref<string | null>(null);
  const lastSyncAttempt = ref(0);
  
  // Authentication state
  const isAuthenticatedState = ref(false);
  const userEmail = ref('');
  const showAuthModal = ref(false);
  const authMode = ref<'login' | 'register'>('login');
  const authLoading = ref(false);
  const showUserMenu = ref(false);
  
  // Auth form - use reactive() for objects
  const authForm = reactive({
    email: '',
    password: '',
    confirmPassword: '',
    error: ''
  });
  
  // Add verse form
  const newVerse = reactive({
    reference: '',
    refSort: '',
    content: '',
    translation: '',
    tagsInput: '',
    startedAtInput: ''
  });
  const showAddSuccess = ref(false);
  
  // Edit verse modal
  const showEditModal = ref(false);
  const editingVerse = ref<any>(null);
  
  // Review state
  const currentReviewIndex = ref(0);
  const showVerseText = ref(false);
  const reviewComplete = ref(false);
  const _dueForReview = ref<Verse[]>([]);
  
  // Stats
  const reviewedToday = ref(0);
  const currentStreak = ref(0);
  
  // File input ref
  const importFileRef = ref<HTMLInputElement | null>(null);
  
  // Computed properties
  const filteredVerses = computed(() => {
    if (!searchQuery.value) {
      return verses.value;
    }
    
    const query = normalizeForSearch(searchQuery.value);
    return verses.value.filter(v => {
      const tagsString = formatTags(v.tags || []);
      return normalizeForSearch(v.reference).includes(query) ||
             normalizeForSearch(v.content).includes(query) ||
             normalizeForSearch(tagsString).includes(query);
    });
  });
  
  const hasVersesButNoSearchResults = computed(() => {
    return verses.value.length > 0 && 
           filteredVerses.value.length === 0 && 
           searchQuery.value.length > 0;
  });
  
  const hasSyncIssues = computed(() => {
    return isAuthenticatedState.value && !lastSyncSuccess.value;
  });
  
  const dueForReview = computed(() => _dueForReview.value);
  
  const currentReviewVerse = computed(() => {
    if (currentReviewIndex.value < dueForReview.value.length) {
      return dueForReview.value[currentReviewIndex.value];
    }
    return null;
  });
  
  // Methods
  const init = async () => {
    console.log("Initializing Bible Memory App...");
    
    newVerse.startedAtInput = epochToDateString(getTodayMidnight());
    
    await checkAuth();
    await loadVerses();
    await updateStats();
    
    if (isAuthenticatedState.value) {
      scheduleSync({
        lastSyncSuccess,
        lastSyncError,
        lastSyncAttempt,
        isAuthenticated: isAuthenticatedState,
        loadVerses,
        updateStats
      });
    }
    
    console.log("App initialized successfully");
  };
  
  const checkAuth = async () => {
    try {
      isAuthenticatedState.value = await isAuthenticated();
      if (isAuthenticatedState.value) {
        const userId = await getCurrentUserId();
        userEmail.value = userId || 'user@example.com';
      }
    } catch (error) {
      console.error("Failed to check auth:", error);
      isAuthenticatedState.value = false;
    }
  };
  
  const openAuthModal = (mode: 'login' | 'register' = 'login') => {
    authMode.value = mode;
    authForm.email = '';
    authForm.password = '';
    authForm.confirmPassword = '';
    authForm.error = '';
    showAuthModal.value = true;
  };
  
  const closeAuthModal = () => {
    showAuthModal.value = false;
    authForm.error = '';
  };
  
  const handleLogin = async () => {
    authForm.error = '';
    
    if (!authForm.email || !authForm.password) {
      authForm.error = 'Please enter email and password';
      return;
    }
    
    authLoading.value = true;
    
    try {
      const localVerseCount = verses.value.length;
      
      await login(authForm.email, authForm.password);
      
      isAuthenticatedState.value = true;
      userEmail.value = authForm.email;
      
      closeAuthModal();
      
      scheduleSync({
        lastSyncSuccess,
        lastSyncError,
        lastSyncAttempt,
        isAuthenticated: isAuthenticatedState,
        loadVerses,
        updateStats
      });
      
      await loadVerses();
      
      console.log("Login successful");
      
      if (localVerseCount > 0) {
        console.log(`Syncing ${localVerseCount} local verses with server...`);
      }
    } catch (error: any) {
      console.error("Login failed:", error);
      authForm.error = error.message || 'Login failed. Please try again.';
    } finally {
      authLoading.value = false;
    }
  };
  
  const handleRegister = async () => {
    authForm.error = '';
    
    if (!authForm.email || !authForm.password) {
      authForm.error = 'Please enter email and password';
      return;
    }
    
    if (authForm.password.length < 8) {
      authForm.error = 'Password must be at least 8 characters';
      return;
    }
    
    if (authForm.password !== authForm.confirmPassword) {
      authForm.error = 'Passwords do not match';
      return;
    }
    
    authLoading.value = true;
    
    try {
      const localVerseCount = verses.value.length;
      
      await register(authForm.email, authForm.password);
      
      isAuthenticatedState.value = true;
      userEmail.value = authForm.email;
      
      closeAuthModal();
      
      if (localVerseCount > 0) {
        console.log(`Migrating ${localVerseCount} local verses to server...`);
      }
      
      scheduleSync({
        lastSyncSuccess,
        lastSyncError,
        lastSyncAttempt,
        isAuthenticated: isAuthenticatedState,
        loadVerses,
        updateStats
      });
      
      await loadVerses();
      
      console.log("Registration successful");
      if (localVerseCount > 0) {
        alert(`Welcome! Your ${localVerseCount} verses are being synced to your account.`);
      }
    } catch (error: any) {
      console.error("Registration failed:", error);
      authForm.error = error.message || 'Registration failed. Please try again.';
    } finally {
      authLoading.value = false;
    }
  };
  
  const handleLogout = async () => {
    if (!confirm('Are you sure you want to logout? Your local data will be preserved.')) {
      return;
    }
    
    try {
      await logout();
      
      isAuthenticatedState.value = false;
      userEmail.value = '';
      
      console.log("Logout successful");
    } catch (error) {
      console.error("Logout failed:", error);
      alert("Logout failed. Please try again.");
    }
  };
  
  const loadVerses = async () => {
    try {
      verses.value = await getAllVerses();
    } catch (error) {
      console.error("Failed to load verses:", error);
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
  
  const addVerseHandler = async () => {
    try {
      const tags = parseTags(newVerse.tagsInput);
      
      const startedAt = newVerse.startedAtInput 
        ? dateToMidnightEpoch(newVerse.startedAtInput)
        : Date.now();
      
      await addVerse({
        reference: newVerse.reference,
        refSort: newVerse.refSort,
        content: newVerse.content,
        translation: newVerse.translation,
        tags,
        startedAt
      });
      
      await loadVerses();
      
      // Reset form
      newVerse.reference = '';
      newVerse.refSort = '';
      newVerse.content = '';
      newVerse.translation = '';
      newVerse.tagsInput = '';
      newVerse.startedAtInput = epochToDateString(getTodayMidnight());
      
      showAddSuccess.value = true;
      setTimeout(() => {
        showAddSuccess.value = false;
      }, 3000);
      
    } catch (error) {
      console.error("Failed to add verse:", error);
      alert("Failed to add verse. Please try again.");
    }
  };
  
  const startEditVerse = (verse: Verse) => {
    editingVerse.value = {
      id: verse.id,
      reference: verse.reference,
      refSort: verse.refSort,
      content: verse.content,
      translation: verse.translation,
      tagsInput: formatTags(verse.tags),
      startedAtInput: verse.startedAt ? epochToDateString(verse.startedAt) : epochToDateString(verse.createdAt),
      reviewCat: verse.reviewCat,
      favorite: verse.favorite
    };
    showEditModal.value = true;
  };
  
  const saveEditVerse = async () => {
    try {
      const tags = parseTags(editingVerse.value.tagsInput);
      
      const verse = verses.value.find(v => v.id === editingVerse.value.id);
      if (!verse) throw new Error('Verse not found');
      
      const startedAt = editingVerse.value.startedAtInput 
        ? dateToMidnightEpoch(editingVerse.value.startedAtInput)
        : verse.createdAt;
      
      await updateVerse(editingVerse.value.id, {
        reference: editingVerse.value.reference,
        refSort: editingVerse.value.refSort,
        content: editingVerse.value.content,
        translation: editingVerse.value.translation,
        tags,
        startedAt,
        reviewCat: editingVerse.value.reviewCat,
        favorite: editingVerse.value.favorite
      });
      
      await loadVerses();
      
      showEditModal.value = false;
      editingVerse.value = null;
      
    } catch (error) {
      console.error("Failed to update verse:", error);
      alert("Failed to update verse. Please try again.");
    }
  };
  
  const deleteVerseHandler = async (id: string) => {
    if (!confirm('Are you sure you want to delete this verse?')) {
      return;
    }
    
    try {
      await deleteVerse(id);
      await loadVerses();
    } catch (error) {
      console.error("Failed to delete verse:", error);
      alert("Failed to delete verse. Please try again.");
    }
  };
  
  const normalizeForSearch = (text: string): string => {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  };
  
  const formatTagForDisplay = (tag: { key: string; value: string }): string => {
    if (tag.value) {
      return `${tag.key} (${tag.value})`;
    }
    return tag.key;
  };
  
  const loadReviewVerses = async () => {
    try {
      _dueForReview.value = await getVersesForReview();
    } catch (error) {
      console.error("Failed to load review verses:", error);
    }
  };
  
  const markReview = async (success: boolean) => {
    const verse = currentReviewVerse.value;
    if (!verse) return;
    
    try {
      await recordReview(verse.id, success ? 'recall' : 'practice');
      
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
  
  const exportVerses = () => {
    try {
      const dataStr = JSON.stringify(verses.value, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `bible-verses-${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to export verses:", error);
      alert("Failed to export verses. Please try again.");
    }
  };
  
  const importVerses = async (event: Event) => {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    
    try {
      const text = await file.text();
      const imported = JSON.parse(text);
      
      if (!Array.isArray(imported)) {
        throw new Error("Invalid file format");
      }
      
      const existingIds = new Set(verses.value.map(v => v.id));
      let updateCount = 0;
      let addCount = 0;
      
      for (const verse of imported) {
        if (verse.id && existingIds.has(verse.id)) {
          updateCount++;
        } else {
          addCount++;
        }
      }
      
      const message = updateCount > 0 
        ? `Import will update ${updateCount} existing verse${updateCount !== 1 ? 's' : ''} and add ${addCount} new verse${addCount !== 1 ? 's' : ''}. Continue?`
        : `Import ${addCount} new verse${addCount !== 1 ? 's' : ''}?`;
      
      if (!confirm(message)) {
        return;
      }
      
      for (const verse of imported) {
        const hasExistingId = verse.id && existingIds.has(verse.id);
        
        if (hasExistingId) {
          const existing = verses.value.find(v => v.id === verse.id);
          if (existing) {
            await updateVerse(verse.id, {
              reference: verse.reference ?? existing.reference,
              refSort: verse.refSort ?? existing.refSort,
              content: verse.content ?? verse.text ?? existing.content,
              translation: verse.translation ?? existing.translation,
              tags: verse.tags ?? existing.tags,
              startedAt: verse.startedAt ?? existing.startedAt,
              reviewCat: verse.reviewCat ?? existing.reviewCat,
              favorite: verse.favorite ?? existing.favorite,
              createdAt: verse.createdAt ?? existing.createdAt,
              updatedAt: verse.updatedAt ?? Date.now()
            });
          }
        } else {
          await addVerse({
            reference: verse.reference,
            refSort: verse.refSort || verse.reference,
            content: verse.content || verse.text,
            translation: verse.translation || '',
            tags: verse.tags || [],
            startedAt: verse.startedAt,
            reviewCat: verse.reviewCat,
            favorite: verse.favorite,
            createdAt: verse.createdAt,
            updatedAt: verse.updatedAt
          });
        }
      }
      
      await loadVerses();
      
      const successMessage = updateCount > 0
        ? `Successfully updated ${updateCount} verse${updateCount !== 1 ? 's' : ''} and added ${addCount} new verse${addCount !== 1 ? 's' : ''}!`
        : `Successfully imported ${addCount} verse${addCount !== 1 ? 's' : ''}!`;
      
      alert(successMessage);
      
    } catch (error) {
      console.error("Failed to import verses:", error);
      alert("Error importing file. Please make sure it's a valid JSON file.");
    } finally {
      input.value = '';
    }
  };
  
  // Lifecycle
  onMounted(() => {
    init();
  });
  
  // Return everything for template
  return {
    // State
    currentTab,
    verses,
    searchQuery,
    lastSyncSuccess,
    lastSyncError,
    lastSyncAttempt,
    isAuthenticated: isAuthenticatedState,
    userEmail,
    showAuthModal,
    authMode,
    authLoading,
    showUserMenu,
    authForm,
    newVerse,
    showAddSuccess,
    showEditModal,
    editingVerse,
    currentReviewIndex,
    showVerseText,
    reviewComplete,
    reviewedToday,
    currentStreak,
    importFileRef,
    
    // Computed
    filteredVerses,
    hasVersesButNoSearchResults,
    hasSyncIssues,
    dueForReview,
    currentReviewVerse,
    
    // Methods
    openAuthModal,
    closeAuthModal,
    handleLogin,
    handleRegister,
    handleLogout,
    loadVerses,
    updateStats,
    addVerse: addVerseHandler,
    startEditVerse,
    saveEditVerse,
    deleteVerse: deleteVerseHandler,
    normalizeForSearch,
    formatTagForDisplay,
    loadReviewVerses,
    markReview,
    resetReview,
    exportVerses,
    importVerses
  };
}
