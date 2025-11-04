import { db, Verse } from "./db";
import {
  addVerse,
  updateVerse,
  deleteVerse,
  recordReview,
  getAllVerses,
  searchVerses,
  getVersesForReview,
  getTodayReviewCount,
  getCurrentStreak,
  parseTags,
  formatTags
} from "./actions";
import { syncNow, isAuthenticated } from "./sync";

// Schedule automatic sync
function scheduleSync() {
  // Initial sync
  if (navigator.onLine) {
    syncNow().catch(err => console.error("Initial sync failed:", err));
  }
  
  // Sync every 60 seconds if online
  setInterval(() => {
    if (navigator.onLine) {
      syncNow().catch(err => console.error("Periodic sync failed:", err));
    }
  }, 60_000);
  
  // Sync when coming back online
  window.addEventListener("online", () => {
    syncNow().catch(err => console.error("Online sync failed:", err));
  });
  
  // Sync when tab becomes visible
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && navigator.onLine) {
      syncNow().catch(err => console.error("Visibility sync failed:", err));
    }
  });
}

// Alpine.js app function
declare global {
  interface Window {
    bibleMemoryApp: () => any;
  }
}

window.bibleMemoryApp = function() {
  return {
    // State
    currentTab: 'add',
    verses: [] as Verse[],
    searchQuery: '',
    isOnline: navigator.onLine,
    
    // Add verse form
    newVerse: {
      reference: '',
      refSort: '',
      content: '',
      translation: '',
      tagsInput: ''
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
      
      // Set up online/offline detection
      window.addEventListener('online', () => {
        this.isOnline = true;
      });
      window.addEventListener('offline', () => {
        this.isOnline = false;
      });
      
      // Load initial data
      await this.loadVerses();
      await this.updateStats();
      
      // Start sync schedule
      scheduleSync();
      
      console.log("App initialized successfully");
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
        
        await addVerse({
          reference: this.newVerse.reference,
          refSort: this.newVerse.refSort,
          content: this.newVerse.content,
          translation: this.newVerse.translation,
          tags
        });
        
        // Reload verses
        await this.loadVerses();
        
        // Reset form
        this.newVerse = {
          reference: '',
          refSort: '',
          content: '',
          translation: '',
          tagsInput: ''
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
        tagsInput: formatTags(verse.tags)
      };
      this.showEditModal = true;
    },
    
    // Save edited verse
    async saveEditVerse() {
      try {
        const tags = parseTags(this.editingVerse.tagsInput);
        
        await updateVerse(this.editingVerse.id, {
          reference: this.editingVerse.reference,
          refSort: this.editingVerse.refSort,
          content: this.editingVerse.content,
          translation: this.editingVerse.translation,
          tags
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
    
    // Get filtered verses based on search
    get filteredVerses(): Verse[] {
      if (!this.searchQuery) {
        return this.verses;
      }
      
      const query = this.searchQuery.toLowerCase();
      return this.verses.filter(v =>
        v.reference.toLowerCase().includes(query) ||
        v.content.toLowerCase().includes(query)
      );
    },
    
    // Get verses due for review
    get dueForReview(): Verse[] {
      // This will be calculated when review tab is opened
      // For now, return empty array - will be populated by loadReviewVerses()
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
            refSort: verse.refSort || verse.reference, // Fallback if refSort missing
            content: verse.content || verse.text, // Support both field names
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
    
    // Watch for tab changes
    $watch: {
      currentTab(newTab: string) {
        if (newTab === 'review') {
          // Load review verses when switching to review tab
          this.loadReviewVerses();
        }
      }
    }
  };
};

// Initialize when DOM is ready
console.log("Bible Memory App script loaded");
