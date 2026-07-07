<template>
  <div>
    <!-- Landing Page (unauthenticated only) -->
    <LandingPage
      v-if="!isAuthenticated"
      @openAuth="openAuthModal"
    />

    <!-- Main App (authenticated only) -->
    <div v-else class="container mx-auto px-4 py-4 sm:py-8 max-w-5xl">
    <!-- Sync Status Toast Notification (message follows the health transition) -->
    <div
      v-show="showSyncToast"
      class="sync-toast"
      :class="syncToastKind === 'success' ? 'sync-toast--success' : 'sync-toast--warning'">
      {{ syncToastMessage }}
    </div>

    <!-- Header - Hidden in immersive mode -->
    <AppHeader
      :is-authenticated="isAuthenticated"
      :user-email="userEmail"
      :has-sync-issues="hasSyncIssues"
      :is-immersive-mode-active="isImmersiveModeActive"
      @open-about="showAboutModal = true"
      @logout="handleLogout()"
      @trigger-sync-toast="triggerSyncToast()"
    />

    <!-- Stats Bar - Hidden in immersive mode. Reviewed-today is distinct
         verses; the target (dailyProgress.goal) tracks the day's true
         outstanding-work total until every category is first satisfied,
         then freezes — bonus reviews after that show as reviewed > target
         instead of the target endlessly chasing back up to 100%
         (previous-work/075, Round 8). dailyProgress.total (unfrozen, used
         for `remaining`/the tab badge below) is NOT what this displays. -->
    <StatsBar
      :total-verses="verses.length"
      :reviewed-today="dailyProgress.reviewed"
      :review-target="dailyProgress.goal"
      :current-streak="currentStreak"
      :is-immersive-mode-active="isImmersiveModeActive"
      @open="onOpenStats"
    />

    <!-- Tab Navigation - Hidden in immersive mode -->
    <div class="-mx-4 sm:mx-0 glass-card rounded-none sm:rounded-2xl shadow-2xl overflow-hidden fade-in">
      <!-- Badge counts down the verses still needed to hit today's target.
           Selecting Review rebuilds the daily queue (reviewed-today first,
           then the date-seeded order) — the re-entry reordering behavior. -->
      <TabNavigation
        :current-tab="currentTab"
        :is-immersive-mode-active="isImmersiveModeActive"
        :show-badge="dailyProgress.remaining > 0"
        :badge-count="dailyProgress.remaining"
        @update:current-tab="currentTab = $event"
        @select-review="currentTab = 'review'; returnToDailyReview()"
      />

      <!-- Add Verse Tab -->
      <AddVerseTab
        v-if="currentTab === 'add'"
        @verse-added="handleVerseAdded()"
      />

      <!-- My Verses Tab -->
      <MyVersesTab
        v-if="currentTab === 'list'"
        :verses="verses"
        :search-query="searchQuery"
        :sort-by="sortBy"
        :verse-view-mode="verseViewMode"
        :expanded-verse-ids="expandedVerseIds"
        :filtered-verses="filteredVerses"
        :has-verses-but-no-search-results="hasVersesButNoSearchResults"
        @update:search-query="searchQuery = $event"
        @update:sort-by="setSortBy($event)"
        @toggle-view-mode="toggleViewMode()"
        @toggle-verse-expansion="toggleVerseExpansion($event)"
        @copy-verse="copyVerseToClipboard($event)"
        @view-online="viewVerseOnline($event)"
        @edit-verse="startEditVerse($event)"
        @delete-verse="deleteVerse($event)"
        @review-this="startReviewAtVerse($event)"
        @start-review-from-filtered="startReviewFromFiltered()"
        @export-verses="exportVerses()"
        @import-verses="importVerses($event)"
      />

      <!-- Review Tab (receives the whole review composable as one prop;
           only non-review concerns emit back to App) -->
      <ReviewTab
        v-if="currentTab === 'review'"
        :review="review"
        @copy-verse="copyVerseToClipboard"
        @view-online="viewVerseOnline"
        @edit-verse="startEditVerse"
        @add-verses="currentTab = 'add'"
      />
    </div>

    <!-- Review Mode Buttons (hidden while any full-screen block replaces
         the card: celebration, new-day, lap-complete, completion) -->
    <ReviewModeButtons
      v-if="currentTab === 'review' && totalReviewCount > 0 && !reviewComplete && !showingInterstitial"
      :review="review"
    />

    <!-- Edit Modal -->
    <EditVerseModal
      :show="showEditModal"
      :verse="editingVerse"
      @close="showEditModal = false"
      @save="saveEditVerse()"
      @update:verse="(v) => editingVerse && Object.assign(editingVerse, v)"
    />

    <!-- About Modal -->
    <AboutModal
      :show="showAboutModal"
      @close="showAboutModal = false"
    />

    <!-- Stats / Progress Modal -->
    <StatsModal
      :show="showStatsModal"
      :initial-tab="activeStatsTab"
      :review-target="dailyProgress.goal"
      :reviewed-distinct="dailyProgress.reviewed"
      @close="showStatsModal = false"
    />
    </div><!-- End main app (v-else) -->

    <!-- Auth Modal (shared by landing page and main app) -->
    <AuthModal
      :show="showAuthModal"
      :mode="authMode"
      :form="authForm"
      :loading="authLoading"
      @close="closeAuthModal()"
      @login="handleLogin()"
      @register="handleRegister()"
      @update:mode="(m) => authMode = m"
      @update:form="(f) => Object.assign(authForm, f)"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { bibleMemoryApp } from './app';
import LandingPage from './LandingPage.vue';
import EditVerseModal from './components/modals/EditVerseModal.vue';
import AboutModal from './components/modals/AboutModal.vue';
import AuthModal from './components/modals/AuthModal.vue';
import StatsModal from './components/stats/StatsModal.vue';
import AppHeader from './components/AppHeader.vue';
import StatsBar from './components/StatsBar.vue';
import TabNavigation from './components/TabNavigation.vue';
import MyVersesTab from './components/tabs/MyVersesTab.vue';
import AddVerseTab from './components/tabs/AddVerseTab.vue';
import ReviewTab from './components/tabs/ReviewTab.vue';
import ReviewModeButtons from './components/tabs/ReviewModeButtons.vue';

// Destructure everything from bibleMemoryApp (app.ts)
const {
  // State
  currentTab,
  verses,
  searchQuery,
  sortBy,
  editingVerse,
  showEditModal,
  isAuthenticated,
  userEmail,
  showAuthModal,
  authMode,
  authForm,
  authLoading,

  // Toast notifications
  showSyncToast,
  syncToastMessage,
  syncToastKind,
  triggerSyncToast,

  // Review: the whole composable (passed to review components as one prop)
  // plus the pieces App's own template binds directly
  review,
  reviewComplete,
  dailyProgress,
  showingInterstitial,
  currentStreak,
  totalReviewCount,
  returnToDailyReview,
  handleKeyPress,
  isImmersiveModeActive,

  // Computed
  filteredVerses,
  hasVersesButNoSearchResults,
  hasSyncIssues,

  // Methods
  loadVerses,
  startEditVerse,
  saveEditVerse,
  deleteVerse,
  setSortBy,
  exportVerses,
  importVerses,
  openAuthModal,
  closeAuthModal,
  handleLogin,
  handleRegister,
  handleLogout,

  // Deck-style view mode
  verseViewMode,
  expandedVerseIds,
  toggleViewMode,
  toggleVerseExpansion,

  // Review source selection handlers
  startReviewFromFiltered,
  startReviewAtVerse,
} = bibleMemoryApp();

// Local state for About modal
const showAboutModal = ref(false);

// Stats / Progress modal (deep-links to the tapped tile's tab)
const showStatsModal = ref(false);
const activeStatsTab = ref<'library' | 'today' | 'consistency'>('today');
const onOpenStats = (tab: 'library' | 'today' | 'consistency') => {
  activeStatsTab.value = tab;
  showStatsModal.value = true;
};

// Copy verse to clipboard
const copyVerseToClipboard = (verse: any) => {
  // Format: Reference (Version)\nContent
  let text = verse.reference;
  if (verse.translation) {
    text += ` (${verse.translation})`;
  }
  text += '\n' + verse.content;
  
  navigator.clipboard.writeText(text).then(() => {
    console.log('Verse copied to clipboard');
  }).catch(err => {
    console.error('Failed to copy verse:', err);
  });
};

// View verse online (BibleGateway)
const viewVerseOnline = (verse: any) => {
  // Format reference for URL: "John 3:16-18" becomes "John%203%3A16-18"
  const reference = encodeURIComponent(verse.reference);
  const version = verse.translation || 'NKJV'; // Default to NKJV if no version specified
  const url = `https://www.biblegateway.com/passage/?search=${reference}&version=${version}`;
  window.open(url, '_blank');
};

// Handle verse added from AddVerseTab (refresh verses list)
const handleVerseAdded = async () => {
  await loadVerses();
  // Switch to My Verses tab to see the newly added verses
  currentTab.value = 'list';
};

// Set up keyboard shortcuts + day-rollover watchers
onMounted(() => {
  const keyHandler = (event: KeyboardEvent) => {
    // Review shortcuts apply only on the Review tab with no modal on top —
    // otherwise arrow keys aimed at modal controls would drive the deck
    if (currentTab.value !== 'review' || reviewComplete.value) return;
    if (showEditModal.value || showAboutModal.value || showStatsModal.value) return;
    if (handleKeyPress(event)) {
      event.preventDefault();
    }
  };
  window.addEventListener('keydown', keyHandler);

  // Midnight rollover detection for idle sessions: a resumed PWA (visibility)
  // and a session sitting open at midnight (timer) both flag the stale daily
  // queue; navigate() itself re-checks as a backstop.
  const visibilityHandler = () => {
    if (!document.hidden) review.checkDayRollover();
  };
  document.addEventListener('visibilitychange', visibilityHandler);

  let midnightTimer: ReturnType<typeof setTimeout>;
  const scheduleMidnightCheck = () => {
    const now = new Date();
    const next = new Date(now);
    next.setHours(24, 0, 5, 0); // a few seconds past next local midnight
    midnightTimer = setTimeout(() => {
      review.checkDayRollover();
      scheduleMidnightCheck();
    }, next.getTime() - now.getTime());
  };
  scheduleMidnightCheck();

  // Clean up on unmount
  onUnmounted(() => {
    window.removeEventListener('keydown', keyHandler);
    document.removeEventListener('visibilitychange', visibilityHandler);
    clearTimeout(midnightTimer);
  });
});
</script>
