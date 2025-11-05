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
function scheduleSync(app: any) {
  // Prevent multiple sync schedules
  if (syncScheduled) {
    console.log("Sync already scheduled, skipping duplicate");
    return;
  }
  
  syncScheduled = true;
  console.log("Starting sync schedule...");
  
  // Helper to sync and reload UI
  const syncAndReload = async () => {
    app.lastSyncAttempt = Date.now();
    try {
      await syncNow();
      // Reload verses and stats after sync
      await app.loadVerses();
      await app.updateStats();
      
      // Update sync status
      app.lastSyncSuccess = true;
      app.lastSyncError = null;
      console.log("Sync completed and UI updated");
    } catch (err: any) {
      // Update sync status
      app.lastSyncSuccess = false;
      app.lastSyncError = err.message || 'Sync failed';
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
    
    if (outboxCount > 0 && app.lastSyncSuccess) {
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

// Alpine.js app function
export function bibleMemoryApp() {
  return {
    // State
    currentTab: 'add',
    verses: [] as Verse[],
    searchQuery: '',
    
    // Sync status tracking (replaces navigator.onLine)
    lastSyncSuccess: true,
    lastSyncError: null as string | null,
    lastSyncAttempt: 0,
    
    // Authentication state
    isAuthenticated: false,
    userEmail: '',
    showAuthModal: false,
    authMode: 'login' as 'login' | 'register',
    authLoading: false,
    showUserMenu: false,
    
    // Auth form
    authForm: {
      email: '',
      password: '',
      confirmPassword: '',
      error: ''
    },
    
    // Add verse form
    newVerse: {
      reference: '',
      refSort: '',
      content: '',
      translation: '',
      tagsInput: '',
      startedAtInput: ''
    },
    showAddSuccess: false,
    
    // Edit verse modal
    showEditModal: false,
    editingVerse: null as any,
    
    // Review state
    currentReviewIndex: 0,
    showVerseText: false,
    reviewComplete: false,
    
    // Stats
    reviewedToday: 0,
    currentStreak: 0,
    
    // Initialization
    async init() {
      console.log("Initializing Bible Memory App...");
      
      // Set default startedAt to today
      this.newVerse.startedAtInput = epochToDateString(getTodayMidnight());
      
      // Check authentication status
      await this.checkAuth();
      
      // Load initial data
      await this.loadVerses();
      await this.updateStats();
      
      // Start sync schedule only if authenticated
      // Sync status will be tracked via actual sync results
      if (this.isAuthenticated) {
        scheduleSync(this);
      }
      
      console.log("App initialized successfully");
    },
    
    // Check authentication status
    async checkAuth() {
      try {
        this.isAuthenticated = await isAuthenticated();
        if (this.isAuthenticated) {
          const userId = await getCurrentUserId();
          // For now, just show user ID. We'll get email from auth table later
          this.userEmail = userId || 'user@example.com';
        }
      } catch (error) {
        console.error("Failed to check auth:", error);
        this.isAuthenticated = false;
      }
    },
    
    // Open auth modal
    openAuthModal(mode: 'login' | 'register' = 'login') {
      this.authMode = mode;
      this.authForm.email = '';
      this.authForm.password = '';
      this.authForm.confirmPassword = '';
      this.authForm.error = '';
      this.showAuthModal = true;
    },
    
    // Close auth modal
    closeAuthModal() {
      this.showAuthModal = false;
      this.authForm.error = '';
    },
    
    // Handle login
    async handleLogin() {
      this.authForm.error = '';
      
      // Validation
      if (!this.authForm.email || !this.authForm.password) {
        this.authForm.error = 'Please enter email and password';
        return;
      }
      
      this.authLoading = true;
      
      try {
        // Check if user has local verses before logging in
        const localVerseCount = this.verses.length;
        
        await login(this.authForm.email, this.authForm.password);
        
        // Update auth state
        this.isAuthenticated = true;
        this.userEmail = this.authForm.email;
        
        // Close modal
        this.closeAuthModal();
        
        // Start sync (will merge local and server data)
        scheduleSync(this);
        
        // Reload data (will include server verses)
        await this.loadVerses();
        
        console.log("Login successful");
        
        // Notify user if they had local verses
        if (localVerseCount > 0) {
          console.log(`Syncing ${localVerseCount} local verses with server...`);
        }
      } catch (error: any) {
        console.error("Login failed:", error);
        this.authForm.error = error.message || 'Login failed. Please try again.';
      } finally {
        this.authLoading = false;
      }
    },
    
    // Handle registration
    async handleRegister() {
      this.authForm.error = '';
      
      // Validation
      if (!this.authForm.email || !this.authForm.password) {
        this.authForm.error = 'Please enter email and password';
        return;
      }
      
      if (this.authForm.password.length < 8) {
        this.authForm.error = 'Password must be at least 8 characters';
        return;
      }
      
      if (this.authForm.password !== this.authForm.confirmPassword) {
        this.authForm.error = 'Passwords do not match';
        return;
      }
      
      this.authLoading = true;
      
      try {
        // Check if user has local verses before registering
        const localVerseCount = this.verses.length;
        
        await register(this.authForm.email, this.authForm.password);
        
        // Update auth state
        this.isAuthenticated = true;
        this.userEmail = this.authForm.email;
        
        // Close modal
        this.closeAuthModal();
        
        // If user had local verses, they'll be synced automatically
        if (localVerseCount > 0) {
          console.log(`Migrating ${localVerseCount} local verses to server...`);
          // The sync will happen automatically via scheduleSync
        }
        
        // Start sync (this will migrate local data)
        scheduleSync(this);
        
        // Reload data
        await this.loadVerses();
        
        console.log("Registration successful");
        if (localVerseCount > 0) {
          alert(`Welcome! Your ${localVerseCount} verses are being synced to your account.`);
        }
      } catch (error: any) {
        console.error("Registration failed:", error);
        this.authForm.error = error.message || 'Registration failed. Please try again.';
      } finally {
        this.authLoading = false;
      }
    },
    
    // Handle logout
    async handleLogout() {
      if (!confirm('Are you sure you want to logout? Your local data will be preserved.')) {
        return;
      }
      
      try {
        await logout();
        
        // Update auth state
        this.isAuthenticated = false;
        this.userEmail = '';
        
        console.log("Logout successful");
      } catch (error) {
        console.error("Logout failed:", error);
        alert("Logout failed. Please try again.");
      }
    },
    
    // Load verses from database
    async loadVerses() {
      try {
        this.verses = await getAllVerses();
      } catch (error) {
        console.error("Failed to load verses:", error);
      }
    },
    
    // Update statistics
    async updateStats() {
      try {
        this.reviewedToday = await getTodayReviewCount();
        this.currentStreak = await getCurrentStreak();
      } catch (error) {
        console.error("Failed to update stats:", error);
      }
    },
    
    // Add a new verse
    async addVerse() {
      try {
        const tags = parseTags(this.newVerse.tagsInput);
        
        // Convert date string to epoch, fallback to createdAt if empty
        const startedAt = this.newVerse.startedAtInput 
          ? dateToMidnightEpoch(this.newVerse.startedAtInput)
          : Date.now();
        
        await addVerse({
          reference: this.newVerse.reference,
          refSort: this.newVerse.refSort,
          content: this.newVerse.content,
          translation: this.newVerse.translation,
          tags,
          startedAt
        });
        
        // Reload verses
        await this.loadVerses();
        
        // Reset form (including date back to today)
        this.newVerse = {
          reference: '',
          refSort: '',
          content: '',
          translation: '',
          tagsInput: '',
          startedAtInput: epochToDateString(getTodayMidnight())
        };
        
        // Show success message
        this.showAddSuccess = true;
        setTimeout(() => {
          this.showAddSuccess = false;
        }, 3000);
        
      } catch (error) {
        console.error("Failed to add verse:", error);
        alert("Failed to add verse. Please try again.");
      }
    },
    
    // Start editing a verse
    startEditVerse(verse: Verse) {
      this.editingVerse = {
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
      this.showEditModal = true;
    },
    
    // Save edited verse
    async saveEditVerse() {
      try {
        const tags = parseTags(this.editingVerse.tagsInput);
        
        // Get the verse to access createdAt for fallback
        const verse = this.verses.find(v => v.id === this.editingVerse.id);
        if (!verse) throw new Error('Verse not found');
        
        // Convert date string to epoch, fallback to createdAt if empty
        const startedAt = this.editingVerse.startedAtInput 
          ? dateToMidnightEpoch(this.editingVerse.startedAtInput)
          : verse.createdAt;
        
        await updateVerse(this.editingVerse.id, {
          reference: this.editingVerse.reference,
          refSort: this.editingVerse.refSort,
          content: this.editingVerse.content,
          translation: this.editingVerse.translation,
          tags,
          startedAt,
          reviewCat: this.editingVerse.reviewCat,
          favorite: this.editingVerse.favorite
        });
        
        // Reload verses
        await this.loadVerses();
        
        // Close modal
        this.showEditModal = false;
        this.editingVerse = null;
        
      } catch (error) {
        console.error("Failed to update verse:", error);
        alert("Failed to update verse. Please try again.");
      }
    },
    
    // Delete a verse
    async deleteVerse(id: string) {
      if (!confirm('Are you sure you want to delete this verse?')) {
        return;
      }
      
      try {
        await deleteVerse(id);
        await this.loadVerses();
      } catch (error) {
        console.error("Failed to delete verse:", error);
        alert("Failed to delete verse. Please try again.");
      }
    },
    
    // Normalize text for unicode-insensitive search
    normalizeForSearch(text: string): string {
      return text
        .toLowerCase()
        .normalize('NFD') // Decompose accented characters
        .replace(/[\u0300-\u036f]/g, ''); // Remove diacritics
    },
    
    // Format a single tag for display
    formatTagForDisplay(tag: { key: string; value: string }): string {
      if (tag.value) {
        return `${tag.key} (${tag.value})`;
      }
      return tag.key;
    },
    
    // Get filtered verses based on search
    get filteredVerses(): Verse[] {
      if (!this.searchQuery) {
        return this.verses;
      }
      
      const query = this.normalizeForSearch(this.searchQuery);
      return this.verses.filter(v =>
        this.normalizeForSearch(v.reference).includes(query) ||
        this.normalizeForSearch(v.content).includes(query)
      );
    },
    
    // Check if we have verses but search returned no results
    get hasVersesButNoSearchResults(): boolean {
      return this.verses.length > 0 && this.filteredVerses.length === 0 && this.searchQuery.length > 0;
    },
    
    // Get sync status indicator (replaces isOnline)
    get hasSyncIssues(): boolean {
      // Only show sync issues if authenticated and last sync failed
      return this.isAuthenticated && !this.lastSyncSuccess;
    },
    
    // Get verses due for review
    get dueForReview(): Verse[] {
      return this._dueForReview || [];
    },
    _dueForReview: [] as Verse[],
    
    // Load verses for review
    async loadReviewVerses() {
      try {
        this._dueForReview = await getVersesForReview();
      } catch (error) {
        console.error("Failed to load review verses:", error);
      }
    },
    
    // Get current review verse
    get currentReviewVerse(): Verse | null {
      if (this.currentReviewIndex < this.dueForReview.length) {
        return this.dueForReview[this.currentReviewIndex];
      }
      return null;
    },
    
    // Mark a review as complete
    async markReview(success: boolean) {
      const verse = this.currentReviewVerse;
      if (!verse) return;
      
      try {
        // Record the review
        await recordReview(verse.id, success ? 'recall' : 'practice');
        
        // Update stats
        await this.updateStats();
        
        // Move to next verse
        this.currentReviewIndex++;
        this.showVerseText = false;
        
        // Check if review is complete
        if (this.currentReviewIndex >= this.dueForReview.length) {
          this.reviewComplete = true;
        }
        
      } catch (error) {
        console.error("Failed to record review:", error);
        alert("Failed to record review. Please try again.");
      }
    },
    
    // Reset review session
    resetReview() {
      this.currentReviewIndex = 0;
      this.showVerseText = false;
      this.reviewComplete = false;
      this.loadReviewVerses();
    },
    
    // Export verses to JSON
    exportVerses() {
      try {
        const dataStr = JSON.stringify(this.verses, null, 2);
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
    },
    
    // Import verses from JSON
    async importVerses(event: Event) {
      const input = event.target as HTMLInputElement;
      const file = input.files?.[0];
      if (!file) return;
      
      try {
        const text = await file.text();
        const imported = JSON.parse(text);
        
        if (!Array.isArray(imported)) {
          throw new Error("Invalid file format");
        }
        
        if (!confirm(`Import ${imported.length} verses? This will add to your existing verses.`)) {
          return;
        }
        
        // Import each verse
        for (const verse of imported) {
          await addVerse({
            reference: verse.reference,
            refSort: verse.refSort || verse.reference,
            content: verse.content || verse.text,
            translation: verse.translation || '',
            tags: verse.tags || []
          });
        }
        
        // Reload verses
        await this.loadVerses();
        
        alert('Verses imported successfully!');
        
      } catch (error) {
        console.error("Failed to import verses:", error);
        alert("Error importing file. Please make sure it's a valid JSON file.");
      } finally {
        // Reset file input
        input.value = '';
      }
    },
  };
}
