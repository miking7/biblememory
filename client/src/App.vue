<template>
  <div>
    <!-- Anonymous Auth Banner (Full Width) - Hidden in immersive mode -->
    <div v-show="!isAuthenticated && !isImmersiveModeActive"
         class="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-200 shadow-sm immersive-hideable">
    <div class="container mx-auto px-4 max-w-5xl">
      <div class="flex items-center justify-between py-3">
        <div class="flex items-center gap-3">
          <span class="text-lg">⚠️</span>
          <p class="text-sm text-slate-700">
            <span class="font-semibold">Local-only mode</span> • Login to sync across devices
          </p>
        </div>
        <div class="flex gap-2">
          <button
            @click="openAuthModal('register')"
            class="px-4 py-1.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:shadow-lg transition-all font-medium text-sm">
            Sign Up
          </button>
          <button
            @click="openAuthModal('login')"
            class="px-4 py-1.5 bg-white text-slate-700 rounded-lg hover:bg-slate-50 transition-all font-medium text-sm border border-slate-200">
            Login
          </button>
        </div>
      </div>
    </div>
  </div>

  <div class="container mx-auto px-4 py-4 sm:py-8 max-w-5xl">
    <!-- Offline Toast Notification -->
    <div v-show="showOfflineToast" class="offline-toast">
      ⚠️ Sync issues - currently offline. Changes saved locally.
    </div>

    <!-- Header - Hidden in immersive mode -->
    <header v-show="!isImmersiveModeActive" class="mb-6 sm:mb-10 fade-in relative immersive-hideable">
      <div class="text-left sm:text-center">
        <h1 class="text-3xl sm:text-5xl font-bold text-white mb-3 tracking-tight">
          📖 <span class="gradient-text">Bible Memory</span>
        </h1>
        <p class="text-blue-200 text-lg font-light text-[clamp(0.6rem,4.7vw,1.125rem)]">Memorize Scripture, one verse at a time</p>
      </div>

      <!-- User Menu (Authenticated) -->
      <div v-show="isAuthenticated"

           class="absolute top-0 right-0"
           v-click-outside="() => showUserMenu = false">
        <button
          @click="showUserMenu = !showUserMenu"
          class="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white hover:shadow-lg transition-all text-xl relative">
          👤

          <!-- Offline Badge -->
          <span
            v-show="hasSyncIssues"
            @click.stop="triggerOfflineToast()"
            class="offline-badge"
            title="Click for details">
          </span>
        </button>

        <!-- Dropdown Menu -->
        <div v-show="showUserMenu"
             class="absolute right-0 mt-2 glass-card rounded-xl shadow-2xl overflow-hidden z-50">
          <div class="p-4 border-b border-slate-200">
            <p class="text-xs text-slate-500 font-medium mb-1">Signed in as</p>
            <p class="text-sm font-semibold text-slate-800 truncate" v-text="userEmail"></p>
          </div>
          <button
            @click="exportToLegacyAndOpen(); showUserMenu = false"
            class="w-full px-4 py-3 text-left text-sm font-medium text-slate-700 hover:bg-slate-50 transition-all flex items-center gap-2 border-b border-slate-100">
            <span>⏪</span>
            <span>Legacy Mode</span>
          </button>
          <button
            @click="handleLogout(); showUserMenu = false"
            class="w-full px-4 py-3 text-left text-sm font-medium text-slate-700 hover:bg-slate-50 transition-all flex items-center gap-2">
            <span>🚪</span>
            <span>Logout</span>
          </button>
        </div>
      </div>
    </header>

    <!-- Stats Bar - Hidden in immersive mode -->
    <div v-show="!isImmersiveModeActive" class="glass-card rounded-2xl shadow-2xl p-3 sm:p-6 mb-4 sm:mb-8 fade-in immersive-hideable">
      <div class="grid grid-cols-3 gap-2 sm:gap-6">
        <div class="stat-card rounded-xl p-3 sm:p-5 flex flex-col items-center justify-center h-full">
          <div class="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-500 bg-clip-text text-transparent mb-1" v-text="verses.length"></div>
          <div class="flex-1 flex items-center justify-center text-xs sm:text-sm text-slate-600 font-medium text-center">Total Verses</div>
        </div>
        <div class="stat-card rounded-xl p-3 sm:p-5 flex flex-col items-center justify-center h-full">
          <div class="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-500 bg-clip-text text-transparent mb-1" v-text="reviewedToday"></div>
          <div class="flex-1 flex items-center justify-center text-xs sm:text-sm text-slate-600 font-medium text-center">Reviewed Today</div>
        </div>
        <div class="stat-card rounded-xl p-3 sm:p-5 flex flex-col items-center justify-center h-full">
          <div class="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent mb-1" v-text="currentStreak"></div>
          <div class="flex-1 flex items-center justify-center text-xs sm:text-sm text-slate-600 font-medium text-center">Day Streak</div>
        </div>
      </div>
    </div>

    <!-- Tab Navigation - Hidden in immersive mode -->
    <div class="-mx-4 sm:mx-0 glass-card rounded-none sm:rounded-2xl shadow-2xl overflow-hidden fade-in">
      <div v-show="!isImmersiveModeActive" class="flex border-b border-slate-200 bg-gradient-to-r from-slate-50 to-blue-50 immersive-hideable">
        <button
          @click="currentTab = 'list'"
          :class="currentTab === 'list' ? 'active text-blue-700 font-semibold' : 'text-slate-600'"
          class="tab-button flex-1 py-3 px-2 sm:py-5 sm:px-6 font-medium hover:bg-white/50 transition-all flex flex-col sm:flex-row items-center justify-center">
          <span class="text-3xl sm:text-xl sm:mr-2">📚</span>
          <span class="text-xs sm:text-base mt-1 sm:mt-0">My Verses</span>
        </button>
        <button
          @click="currentTab = 'review'; returnToDailyReview(); loadReviewVerses()"
          :class="currentTab === 'review' ? 'active text-blue-700 font-semibold' : 'text-slate-600'"
          class="tab-button flex-1 py-3 px-2 sm:py-5 sm:px-6 font-medium hover:bg-white/50 transition-all relative flex flex-col sm:flex-row items-center justify-center">
          <span class="text-3xl sm:text-xl sm:mr-2">🎯</span>
          <span class="text-xs sm:text-base mt-1 sm:mt-0">Review</span>
          <span v-show="reviewSource === 'daily' && dueForReview.length > 0"
                class="badge-notification absolute top-3 right-3 bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center shadow-lg"
                v-text="dueForReview.length"></span>
        </button>
        <button
          @click="currentTab = 'add'"
          :class="currentTab === 'add' ? 'active text-blue-700 font-semibold' : 'text-slate-600'"
          class="tab-button flex-1 py-3 px-2 sm:py-5 sm:px-6 font-medium hover:bg-white/50 transition-all flex flex-col sm:flex-row items-center justify-center">
          <span class="text-3xl sm:text-xl sm:mr-2">📝</span>
          <span class="text-xs sm:text-base mt-1 sm:mt-0">Add Verse</span>
        </button>
      </div>

      <!-- Add Verse Tab -->
      <div v-if="currentTab === 'add'" class="p-3 sm:p-8">
        
        <!-- Step 1: Paste Verse with AI Parsing -->
        <div v-if="addVerseStep === 'paste'">
          <h2 class="text-2xl sm:text-3xl font-bold mb-6 text-slate-800">Add New Verse</h2>
          
          <!-- Paste Textarea -->
          <div class="mb-5">
            <textarea
              v-model="pastedText"
              placeholder="Paste your verse here...&#10;(We'll use AI to infer reference/version info, and to cleanup any cross-references / formatting.)"
              rows="8"
              class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl transition-all focus:border-blue-500"
              :disabled="parsingState === 'loading'"
              @keydown.enter.prevent="parseVerseWithAI()"></textarea>
          </div>

          <!-- Loading State -->
          <div v-if="parsingState === 'loading'" class="text-center py-6">
            <div class="inline-flex items-center gap-3 text-blue-600">
              <svg class="animate-spin h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span class="text-lg font-medium">✨ Parsing your verse...</span>
            </div>
          </div>

          <!-- Error State -->
          <div v-if="parsingState === 'error'" class="mb-5 p-4 bg-red-50 border-2 border-red-200 rounded-xl">
            <p class="text-red-700 font-medium mb-3">⚠️ Unable to parse verse</p>
            <p class="text-red-600 text-sm mb-4" v-text="parsingError"></p>
            <div class="flex gap-3">
              <button
                type="button"
                @click="parseVerseWithAI()"
                class="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:shadow-lg transition-all font-medium text-sm">
                Retry
              </button>
              <button
                type="button"
                @click="skipAIParsing()"
                class="px-5 py-2.5 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-all font-medium text-sm">
                Enter Manually
              </button>
            </div>
          </div>

          <!-- Action Buttons (when not loading or error) -->
          <div v-if="parsingState === 'idle'" class="flex gap-3 items-center">
            <button
              type="button"
              @click="parseVerseWithAI()"
              class="btn-premium px-8 py-4 text-white rounded-xl font-semibold text-lg flex-shrink-0">
              Smart Fill ✨
            </button>
            <button
              type="button"
              @click="skipAIParsing()"
              class="px-5 py-2.5 text-slate-600 hover:text-slate-800 font-medium transition-all">
              Skip AI
            </button>
          </div>
        </div>

        <!-- Step 2: Form with Pre-filled Data -->
        <div v-if="addVerseStep === 'form'">
          <!-- Back Button -->
          <button
            type="button"
            @click="goBackToPaste()"
            class="mb-4 flex items-center gap-2 text-slate-600 hover:text-slate-800 font-medium transition-all">
            <span>←</span>
            <span>Back</span>
          </button>

          <h2 class="text-2xl sm:text-3xl font-bold mb-6 text-slate-800">Add New Verse</h2>
          
          <form @submit.prevent="addVerse()" class="space-y-5">
          <div>
            <label class="block text-sm font-semibold text-slate-700 mb-2">Reference</label>
            <input
              type="text"
              v-model="newVerse.reference"
              placeholder="e.g., John 3:16"
              class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl transition-all"
              required>
          </div>
          <div>
            <label class="block text-sm font-semibold text-slate-700 mb-2">Reference Sort (for ordering)</label>
            <input
              type="text"
              v-model="newVerse.refSort"
              placeholder="e.g., bible.43003016"
              class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl transition-all"
              required>
            <p class="text-xs text-slate-500 mt-1">Format: bible.BBCCCVVV (BB=book 01-66, CCC=chapter, VVV=verse)</p>
          </div>
          <div>
            <label class="block text-sm font-semibold text-slate-700 mb-2">Verse Text</label>
            <textarea
              v-model="newVerse.content"
              placeholder="Enter the verse text..."
              rows="5"
              class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl transition-all"
              required></textarea>
            <p class="text-xs text-slate-500 mt-1">Use line breaks for multi-paragraph verses</p>
          </div>
          <div>
            <label class="block text-sm font-semibold text-slate-700 mb-2">Translation (optional)</label>
            <input
              type="text"
              v-model="newVerse.translation"
              placeholder="e.g., NIV, ESV, KJV"
              class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl transition-all">
          </div>
          <div>
            <label class="block text-sm font-semibold text-slate-700 mb-2">Started Date</label>
            <input
              type="date"
              v-model="newVerse.startedAtInput"
              class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl transition-all"
              required>
            <p class="text-xs text-slate-500 mt-1">When you started memorizing this verse</p>
          </div>
          <div>
            <label class="block text-sm font-semibold text-slate-700 mb-2">Tags (optional)</label>
            <input
              type="text"
              v-model="newVerse.tagsInput"
              placeholder="e.g., fast.sk=3, ss=2010.Q2.W01, personal"
              class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl transition-all">
            <p class="text-xs text-slate-500 mt-1">Comma-separated, use key=value for values</p>
          </div>
            <button
              type="submit"
              class="btn-premium w-full text-white py-4 rounded-xl font-semibold text-lg">
              Add Verse
            </button>
          </form>
          <div v-show="showAddSuccess"
               class="mt-5 p-4 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 text-green-700 rounded-xl font-medium">
            ✓ Verse added successfully!
          </div>
        </div>

      </div>

      <!-- My Verses Tab -->
      <div v-if="currentTab === 'list'" class="p-3 sm:p-8">
        <!-- Header with Title and Controls Row -->
        <div class="mb-6">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-2xl sm:text-3xl font-bold text-slate-800">My Verses</h2>
            
            <!-- Control Buttons Row -->
            <div class="flex items-center gap-2">
              <!-- View Mode Toggle Button -->
              <button
                @click="toggleViewMode()"
                :title="verseViewMode === 'full' ? 'Switch to compact view' : 'Switch to full view'"
                class="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all">
                <i :class="verseViewMode === 'full' ? 'mdi mdi-view-agenda' : 'mdi mdi-view-headline'" class="text-2xl"></i>
              </button>

              <!-- Sort By Menu -->
              <div class="relative" v-click-outside="() => showSortMenu = false">
                <button
                  @click="showSortMenu = !showSortMenu"
                  title="Sort verses"
                  class="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all">
                  <i class="mdi mdi-sort text-2xl"></i>
                </button>

                <!-- Sort Dropdown -->
                <div v-show="showSortMenu"
                     class="absolute right-0 mt-2 glass-card rounded-xl shadow-2xl overflow-hidden z-50 min-w-[180px]">
                  <button
                    @click="setSortBy('newest'); showSortMenu = false"
                    class="w-full px-4 py-3 text-left text-sm font-medium text-slate-700 hover:bg-slate-50 transition-all flex items-center gap-2 border-b border-slate-100">
                    <i class="mdi mdi-arrow-down text-lg"></i>
                    <span>Newest</span>
                    <i v-show="sortBy === 'newest'" class="mdi mdi-check text-lg ml-auto text-blue-600"></i>
                  </button>
                  <button
                    @click="setSortBy('oldest'); showSortMenu = false"
                    class="w-full px-4 py-3 text-left text-sm font-medium text-slate-700 hover:bg-slate-50 transition-all flex items-center gap-2 border-b border-slate-100">
                    <i class="mdi mdi-arrow-up text-lg"></i>
                    <span>Oldest</span>
                    <i v-show="sortBy === 'oldest'" class="mdi mdi-check text-lg ml-auto text-blue-600"></i>
                  </button>
                  <button
                    @click="setSortBy('reference'); showSortMenu = false"
                    class="w-full px-4 py-3 text-left text-sm font-medium text-slate-700 hover:bg-slate-50 transition-all flex items-center gap-2 border-b border-slate-100">
                    <i class="mdi mdi-book-open-page-variant text-lg"></i>
                    <span>Reference</span>
                    <i v-show="sortBy === 'reference'" class="mdi mdi-check text-lg ml-auto text-blue-600"></i>
                  </button>
                  <button
                    @click="setSortBy('category'); showSortMenu = false"
                    class="w-full px-4 py-3 text-left text-sm font-medium text-slate-700 hover:bg-slate-50 transition-all flex items-center gap-2">
                    <i class="mdi mdi-shape text-lg"></i>
                    <span>Category</span>
                    <i v-show="sortBy === 'category'" class="mdi mdi-check text-lg ml-auto text-blue-600"></i>
                  </button>
                </div>
              </div>

              <!-- Settings Menu (cog icon) -->
              <div class="relative" v-click-outside="() => showMyVersesMenu = false">
                <button
                  @click="showMyVersesMenu = !showMyVersesMenu"
                  class="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                  title="Options">
                  <i class="mdi mdi-cog text-2xl"></i>
                </button>

                <!-- Dropdown Menu -->
                <div v-show="showMyVersesMenu"
                     class="absolute right-0 mt-2 glass-card rounded-xl shadow-2xl overflow-hidden z-50 min-w-[180px]">
                  <button
                    @click="startReviewFromFiltered(); showMyVersesMenu = false"
                    class="w-full px-4 py-3 text-left text-sm font-medium text-slate-700 hover:bg-slate-50 transition-all flex items-center gap-2 border-b border-slate-100">
                    <i class="mdi mdi-target text-lg"></i>
                    <span>Review These</span>
                  </button>
                  <button
                    @click="exportVerses(); showMyVersesMenu = false"
                    class="w-full px-4 py-3 text-left text-sm font-medium text-slate-700 hover:bg-slate-50 transition-all flex items-center gap-2 border-b border-slate-100">
                    <i class="mdi mdi-download text-lg"></i>
                    <span>Export</span>
                  </button>
                  <button
                    @click="importFileRef?.click(); showMyVersesMenu = false"
                    class="w-full px-4 py-3 text-left text-sm font-medium text-slate-700 hover:bg-slate-50 transition-all flex items-center gap-2">
                    <i class="mdi mdi-upload text-lg"></i>
                    <span>Import</span>
                  </button>
                </div>
                <input type="file" ref="importFileRef" @change="importVerses($event)" accept=".json" class="hidden">
              </div>
            </div>
          </div>
          
          <!-- Search Box -->
          <input
            type="text"
            v-model="searchQuery"
            placeholder="Search verses..."
            class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl transition-all">
        </div>

        <!-- No verses at all -->
        <div v-show="verses.length === 0" class="text-center py-12 text-slate-500">
          <div class="text-4xl sm:text-5xl mb-4">📖</div>
          <p class="text-lg">No verses yet. Add your first verse to get started!</p>
        </div>

        <!-- Has verses but search returned no results -->
        <div v-show="hasVersesButNoSearchResults" class="text-center py-12 text-slate-500">
          <div class="text-4xl sm:text-5xl mb-4">🔍</div>
          <p class="text-lg font-semibold mb-2">No verses match your search</p>
          <p class="text-sm">Try a different search term or clear the search to see all verses.</p>
        </div>

        <div :class="verseViewMode === 'compact' ? '' : 'space-y-4'">
          <VerseCard
            v-for="verse in filteredVerses"
            :key="verse.id"
            :verse="verse"
            :view-mode="verseViewMode"
            :is-expanded="expandedVerseIds.has(verse.id)"
            :review-status="getCachedReviewStatus(verse.id)?.lastReviewType || null"
            @copy="copyVerseToClipboard"
            @view-online="viewVerseOnline"
            @edit="startEditVerse"
            @delete="deleteVerse"
            @toggle-expand="toggleVerseExpansion"
            @review-this="startReviewAtVerse"
          />
        </div>
      </div>

      <!-- Review Tab -->
      <div v-if="currentTab === 'review'" class="p-3 sm:p-8">

        <div v-show="totalReviewCount === 0" class="text-center py-16">
          <div class="text-5xl sm:text-7xl mb-4">🎉</div>
          <p class="text-xl sm:text-2xl text-slate-700 mb-2 font-semibold">All caught up!</p>
          <p class="text-slate-500 text-lg">No verses due for review today.</p>
        </div>

        <div v-show="totalReviewCount > 0 && !reviewComplete">
          <!-- Header: Title + Back Button (filtered mode) + Immersive Toggle -->
          <div v-show="!isImmersiveModeActive" class="flex justify-between items-center mb-6">
            <div class="flex items-center gap-3">
              <h2 class="text-2xl sm:text-3xl font-bold text-slate-800">
                {{ reviewSource === 'filtered' ? 'Filtered Review' : 'Daily Review' }}
              </h2>
              <button
                v-if="reviewSource === 'filtered'"
                @click="returnToDailyReview()"
                class="text-blue-600 hover:text-blue-800 text-sm font-medium hover:bg-blue-50 px-3 py-1 rounded transition-all flex items-center gap-1">
                <i class="mdi mdi-arrow-left"></i>
                <span>back</span>
              </button>
            </div>

            <button
              @click="toggleImmersiveMode()"
              title="Immersive mode (i)"
              class="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all">
              <i class="mdi mdi-fullscreen text-2xl"></i>
            </button>
          </div>

          <template v-if="currentReviewVerse">
            <!-- Card Container with Navigation Arrows -->
            <div class="relative">
              <!-- Left Arrow (Previous) -->
              <button
                @click="previousVerse()"
                :disabled="currentReviewIndex === 0"
                class="no-zoom absolute left-0 top-1/2 -translate-y-1/2 -translate-x-3 sm:-translate-x-4 z-10 w-10 h-10 rounded-full bg-white/60 border-2 border-slate-300 shadow-lg flex items-center justify-center text-slate-700 hover:bg-white hover:scale-110 transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:scale-100"
                title="Previous verse (p)">
                <i class="mdi mdi-chevron-left text-2xl"></i>
              </button>

              <!-- Right Arrow (Next) -->
              <button
                @click="nextVerse()"
                :disabled="currentReviewIndex >= totalReviewCount - 1"
                class="no-zoom absolute right-0 top-1/2 -translate-y-1/2 translate-x-3 sm:translate-x-4 z-10 w-10 h-10 rounded-full bg-white/60 border-2 border-slate-300 shadow-lg flex items-center justify-center text-slate-700 hover:bg-white hover:scale-110 transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:scale-100"
                title="Next verse (n)">
                <i class="mdi mdi-chevron-right text-2xl"></i>
              </button>

              <!-- Exit Button (X) - Only visible in immersive mode -->
              <button
                v-show="isImmersiveModeActive"
                @click.stop="exitImmersiveMode()"
                class="no-zoom absolute top-0 left-0 -translate-y-2.5 -translate-x-2.5 w-10 h-10 rounded-full bg-white/60 border-2 border-slate-300 shadow-lg hover:bg-slate-200 text-slate-600 hover:text-slate-800 flex items-center justify-center transition-all z-10"
                title="Exit immersive mode (Esc)">
                <i class="mdi mdi-close text-xl"></i>
              </button>

              <!-- Review Card -->
              <div ref="reviewCardElement"
                   class="review-card rounded-xl p-6 sm:p-8 min-h-[400px] flex flex-col justify-between bg-white border-2 border-slate-300 relative mb-200 sm:mb-0"
                   :class="{
                     'review-card-gotit': currentVerseReviewStatus?.lastReviewType === 'recall',
                     'review-card-again': currentVerseReviewStatus?.lastReviewType === 'practice'
                   }"
                   :style="{
                     transform: `translateX(${swipeOffset}px)`,
                     transition: (isSwiping || isPositioning) ? 'none' : isAnimatingExit ? 'transform 0.3s ease-out' : isAnimatingEnter ? 'transform 0.15s ease-out' : 'transform 0.3s ease-out',
                     touchAction: 'pan-y'
                   }"
                   @click="handleCardClick">

              <!-- Header: Reference, Translation, and Edit Icon -->
              <div class="mb-3">
                <div class="flex justify-between items-start">
                  <div class="flex flex-wrap items-center gap-2">
                    <!-- Flash Cards Mode: Reference with potential hiding -->
                    <h3 v-if="reviewMode === 'flashcards'" class="font-bold text-lg sm:text-xl text-slate-800">
                    <template v-for="(word, index) in getReferenceWords()" :key="'ref-' + index">
                      <br v-if="word.str === '\n'">
                      <span
                        v-else-if="flashcardHiddenWords.has(index)"
                        @click.stop="revealWord(index)"
                        :class="[
                          'flashcard-underline',
                          flashcardRevealedWords.has(index) ? 'text-red-600 cursor-default' : 'cursor-pointer'
                        ]"
                        :style="flashcardRevealedWords.has(index) ? '' : 'color: transparent;'">
                        {{ word.str }}
                      </span>
                      <span v-else>{{ word.str }}</span>
                    </template>
                  </h3>
                    <!-- All Other Modes: Normal reference display -->
                    <h3 v-else class="font-bold text-lg sm:text-xl text-slate-800" v-text="currentReviewVerse.reference"></h3>

                    <span v-show="currentReviewVerse.translation"
                          class="text-xs text-slate-500 font-medium px-2 py-1 bg-slate-100 rounded"
                          v-text="currentReviewVerse.translation"></span>
                  </div>

                  <!-- Overflow Menu (Top Right) -->
                  <div class="relative" v-click-outside="() => showReviewCardMenu = false">
                    <button
                      @click.stop="showReviewCardMenu = !showReviewCardMenu"
                      class="px-2 py-1 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                      title="Options">
                      <i class="mdi mdi-dots-vertical text-xl"></i>
                    </button>

                    <!-- Dropdown Menu -->
                    <div v-show="showReviewCardMenu"
                         class="absolute right-0 mt-2 glass-card rounded-xl shadow-2xl overflow-hidden z-50 min-w-[160px]">
                      <button
                        @click.stop="copyVerseToClipboard(currentReviewVerse); showReviewCardMenu = false"
                        class="w-full px-4 py-3 text-left text-sm font-medium text-slate-700 hover:bg-slate-50 transition-all flex items-center gap-2 border-b border-slate-100">
                        <i class="mdi mdi-content-copy text-lg"></i>
                        <span>Copy</span>
                      </button>
                      <button
                        @click.stop="viewVerseOnline(currentReviewVerse); showReviewCardMenu = false"
                        class="w-full px-4 py-3 text-left text-sm font-medium text-slate-700 hover:bg-slate-50 transition-all flex items-center gap-2">
                        <i class="mdi mdi-open-in-new text-lg"></i>
                        <span>View online</span>
                      </button>
                      <button
                        @click.stop="startEditVerse(currentReviewVerse); showReviewCardMenu = false"
                        class="w-full px-4 py-3 text-left text-sm font-medium text-slate-700 hover:bg-slate-50 transition-all flex items-center gap-2 border-b border-slate-100">
                        <i class="mdi mdi-pencil text-lg"></i>
                        <span>Edit</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Content Area - Changes based on mode -->
              <div class="flex-1">

                <!-- Reference Mode: Show only reference, wait for reveal -->
                <div v-if="reviewMode === 'reference'">
                  <p class="text-slate-500 mb-6 italic">Try to recall the verse...</p>
                </div>

                <!-- Content Mode: Show full verse -->
                <div v-if="reviewMode === 'content'">
                  <p class="verse-content text-sm sm:text-base text-slate-800 leading-relaxed" v-text="currentReviewVerse.content"></p>
                </div>

                <!-- Hints Mode: Progressive word revelation -->
                <div v-if="reviewMode === 'hints'" @click="addHint()" class="cursor-pointer">
                  <p class="verse-content text-sm sm:text-base text-slate-800 leading-relaxed font-mono"
                     v-text="getHintedContent(currentReviewVerse.content, hintsShown)"></p>
                </div>

                <!-- First Letters Mode: First letter + punctuation with clickable groups -->
                <div v-if="reviewMode === 'firstletters'">
                  <div class="verse-content text-sm sm:text-base text-slate-800 font-mono tracking-tight leading-relaxed">
                    <template v-for="(chunk, index) in getFirstLettersChunks(currentReviewVerse.content)" :key="'fl-chunk-' + index">
                      <!-- Clickable word group (if exists) -->
                      <span
                        v-if="chunk.fullText"
                        @click.stop="revealFirstLetterChunk(index)"
                        :class="[
                          firstLettersRevealedGroups.has(index)
                            ? 'text-red-600 cursor-default'
                            : 'cursor-pointer hover:text-blue-600 transition-colors'
                        ]">{{ firstLettersRevealedGroups.has(index) ? chunk.fullText : chunk.firstLetters }}</span><!-- Static separators (punctuation, spaces, newlines, numbers) -->
                      <template v-for="(part, partIndex) in chunk.separators.split('\n')" :key="'sep-' + index + '-' + partIndex">
                        <br v-if="partIndex > 0">
                        <span>{{ part }}</span>
                      </template>
                    </template>
                  </div>
                </div>

                <!-- Flash Cards Mode: Random word hiding with difficulty levels -->
                <div v-if="reviewMode === 'flashcards'">
                  <div class="text-sm sm:text-base text-slate-800 leading-relaxed">
                    <template v-for="(word, index) in getWords(currentReviewVerse.content)" :key="'content-' + index">
                      <br v-if="word.str === '\n'">
                      <span
                        v-else-if="flashcardHiddenWords.has(index + getContentWordsStartIndex())"
                        @click.stop="revealWord(index + getContentWordsStartIndex())"
                        :class="[
                          'flashcard-underline',
                          flashcardRevealedWords.has(index + getContentWordsStartIndex()) ? 'text-red-600 cursor-default' : 'cursor-pointer'
                        ]"
                        :style="flashcardRevealedWords.has(index + getContentWordsStartIndex()) ? '' : 'color: transparent;'">
                        {{ word.str }}
                      </span>
                      <span v-else>{{ word.str }}</span>
                    </template>
                  </div>
                </div>

              </div>

              <!-- Metadata Footer (styled like My Verses cards) -->
              <div class="flex flex-wrap items-center gap-2 text-xs text-slate-500 font-medium mt-2">
                <span v-text="getAbbreviatedAge(currentReviewVerse.startedAt || undefined)"></span>
                <span class="px-2 py-1 bg-blue-50 text-blue-600 rounded" v-text="getReviewCategory(currentReviewVerse)"></span>
                <template v-if="currentReviewVerse.tags && currentReviewVerse.tags.length > 0">
                  <template v-for="tag in currentReviewVerse.tags" :key="tag.key">
                    <span class="px-2 py-1 bg-purple-50 text-purple-700 rounded text-xs font-medium"
                          v-text="formatTagForDisplay(tag)"></span>
                  </template>
                </template>
                <div class="ml-auto text-slate-600 font-medium">
                  <span v-text="currentReviewIndex + 1"></span>/<span v-text="totalReviewCount"></span>
                </div>
              </div>

              </div><!-- End review card -->

            </div><!-- End card container with arrows -->

          </template>
        </div>

        <div v-show="reviewComplete" class="text-center py-16">
          <div class="text-5xl sm:text-7xl mb-4">🎉</div>
          <p class="text-2xl sm:text-3xl text-slate-700 mb-3 font-bold">Review Complete!</p>
          <p class="text-slate-500 mb-6 text-lg">Great job reviewing today's verses.</p>
          <button
            @click="resetReview()"
            class="btn-premium px-8 py-4 text-white rounded-xl font-semibold text-lg">
            Review Again
          </button>
        </div>
      </div>
    </div>

    <!-- Review Mode Buttons (Outside overflow-hidden for sticky positioning) -->
    <div v-if="currentTab === 'review' && totalReviewCount > 0 && !reviewComplete" class="container mx-auto px-4 max-w-5xl">
      <!-- Desktop: Mode buttons row + Action buttons row below -->
      <div class="hidden sm:flex flex-col gap-3 sm:mt-6">
        <!-- Mode Buttons Row -->
        <div class="flex gap-3 justify-center">
          <button
            @click="reviewMode === 'hints' ? addHint() : switchToHints()"
            :class="reviewMode === 'hints' ? 'mode-button-active' : 'mode-button-inactive'"
            class="px-5 py-2.5 rounded-lg font-medium transition-all flex items-center gap-2"
            title="Hint (h)">
            <i class="mdi mdi-tooltip-question-outline text-lg"></i>
            <span>Hint</span>
          </button>

          <!-- Flash Cards with +/- buttons (fused when active) -->
          <div v-if="reviewMode === 'flashcards'" class="flashcard-group-active flex gap-0 rounded-lg">
            <button
              @click="decreaseFlashCardDifficulty()"
              :disabled="!canDecreaseFlashCardDifficulty"
              :title="canDecreaseFlashCardDifficulty ? 'Decrease difficulty' : 'Already at easiest'"
              class="flashcard-sub-button-in-group rounded-l-lg"
              :class="canDecreaseFlashCardDifficulty ? 'flashcard-sub-button-enabled' : 'flashcard-sub-button-disabled'">
              −
            </button>
            <button
              @click="switchToFlashCards()"
              :title="getFlashCardLevelName"
              class="flashcard-main-active px-2 py-2.5 font-medium transition-all flex items-center gap-2">
              <i class="mdi mdi-cards-outline text-lg"></i>
              <span>Flash Cards</span>
            </button>
            <button
              @click="increaseFlashCardDifficulty()"
              :disabled="!canIncreaseFlashCardDifficulty"
              :title="canIncreaseFlashCardDifficulty ? 'Increase difficulty' : 'Already at hardest'"
              class="flashcard-sub-button-in-group rounded-r-lg"
              :class="canIncreaseFlashCardDifficulty ? 'flashcard-sub-button-enabled' : 'flashcard-sub-button-disabled'">
              +
            </button>
          </div>
          <button
            v-else
            @click="switchToFlashCards()"
            class="mode-button-inactive px-5 py-2.5 rounded-lg font-medium transition-all flex items-center gap-2"
            title="Flash Cards (c)">
            <i class="mdi mdi-cards-outline text-lg"></i>
            <span>Flash Cards</span>
          </button>

          <button
            @click="switchToFirstLetters()"
            :class="reviewMode === 'firstletters' ? 'mode-button-active' : 'mode-button-inactive'"
            class="px-5 py-2.5 rounded-lg font-medium transition-all flex items-center gap-2"
            title="First Letters (f)">
            <i class="mdi mdi-alphabet-latin text-lg"></i>
            <span>First Letters</span>
          </button>

          <button
            @click="smartButtonAction()"
            class="mode-button-inactive px-6 py-2.5 rounded-lg font-medium transition-all flex items-center gap-2"
            style="min-width: 6.5rem;"
            :title="smartButtonLabel + ' (Space)'">
            <i :class="reviewMode === 'content' ? 'mdi mdi-chevron-right' : 'mdi mdi-eye-outline'" class="text-lg"></i>
            <span>{{ smartButtonLabel }}</span>
          </button>
        </div>

        <!-- Action Buttons Row (Desktop) - Only visible when verse fully revealed -->
        <div v-show="reviewMode === 'content'" class="flex gap-3 justify-center">
          <button
            @click="markReview(false)"
            class="action-button-again px-6 py-2.5 rounded-lg font-medium transition-all flex items-center gap-2"
            title="Need more practice">
            <i class="mdi mdi-refresh text-lg"></i>
            <span>Again</span>
          </button>
          <button
            @click="markReview(true)"
            class="action-button-gotit px-6 py-2.5 rounded-lg font-medium transition-all flex items-center gap-2"
            title="I remembered it!">
            <i class="mdi mdi-check text-lg"></i>
            <span>Got it!</span>
          </button>
        </div>
      </div>

      <!-- Mobile: Sticky footer with action buttons above mode buttons -->
      <div class="sm:hidden flex flex-col gap-3 fixed bottom-0 left-0 right-0 z-20 bg-white/95 backdrop-blur-sm border-t border-slate-200 shadow-lg px-3 py-4 review-mode-sticky-footer">
        <!-- Action Buttons Row (Mobile) - Only visible when verse fully revealed -->
        <div v-show="reviewMode === 'content'" class="flex gap-3">
          <button
            @click="markReview(false)"
            class="action-button-again flex-1 py-2.5 rounded-lg font-medium transition-all text-sm flex items-center justify-center gap-2"
            title="Need more practice">
            <i class="mdi mdi-refresh text-lg"></i>
            <span>Again</span>
          </button>
          <button
            @click="markReview(true)"
            class="action-button-gotit flex-1 py-2.5 rounded-lg font-medium transition-all text-sm flex items-center justify-center gap-2"
            title="I remembered it!">
            <i class="mdi mdi-check text-lg"></i>
            <span>Got it!</span>
          </button>
        </div>

        <!-- Mode Buttons Row (Mobile) - Icons only, all 4 on one row -->
        <div class="flex gap-2">
          <button
            @click="reviewMode === 'hints' ? addHint() : switchToHints()"
            :class="reviewMode === 'hints' ? 'mode-button-active' : 'mode-button-inactive'"
            class="flex-1 py-2.5 rounded-lg font-medium transition-all flex items-center justify-center"
            title="Hint (h)"
            aria-label="Hint">
            <i class="mdi mdi-tooltip-question-outline text-xl"></i>
          </button>

          <!-- Flash Cards with +/- buttons (fused when active) -->
          <div v-if="reviewMode === 'flashcards'" class="flashcard-group-active flex-1 flex gap-0 rounded-lg">
            <button
              @click="decreaseFlashCardDifficulty()"
              :disabled="!canDecreaseFlashCardDifficulty"
              class="flashcard-sub-button-in-group rounded-l-lg px-2"
              :class="canDecreaseFlashCardDifficulty ? 'flashcard-sub-button-enabled' : 'flashcard-sub-button-disabled'"
              aria-label="Decrease difficulty">
              −
            </button>
            <button
              @click="switchToFlashCards()"
              class="flashcard-main-active flex-1 py-2.5 font-medium transition-all flex items-center justify-center"
              aria-label="Flash Cards">
              <i class="mdi mdi-cards-outline text-xl"></i>
            </button>
            <button
              @click="increaseFlashCardDifficulty()"
              :disabled="!canIncreaseFlashCardDifficulty"
              class="flashcard-sub-button-in-group rounded-r-lg px-2"
              :class="canIncreaseFlashCardDifficulty ? 'flashcard-sub-button-enabled' : 'flashcard-sub-button-disabled'"
              aria-label="Increase difficulty">
              +
            </button>
          </div>
          <button
            v-else
            @click="switchToFlashCards()"
            class="mode-button-inactive flex-1 py-2.5 rounded-lg font-medium transition-all flex items-center justify-center"
            title="Flash Cards (c)"
            aria-label="Flash Cards">
            <i class="mdi mdi-cards-outline text-xl"></i>
          </button>

          <button
            @click="switchToFirstLetters()"
            :class="reviewMode === 'firstletters' ? 'mode-button-active' : 'mode-button-inactive'"
            class="flex-1 py-2.5 rounded-lg font-medium transition-all flex items-center justify-center"
            title="First Letters (f)"
            aria-label="First Letters">
            <i class="mdi mdi-alphabet-latin text-xl"></i>
          </button>

          <button
            @click="smartButtonAction()"
            class="mode-button-inactive flex-1 py-2.5 rounded-lg font-medium transition-all flex items-center justify-center"
            :title="smartButtonLabel + ' (Space)'"
            :aria-label="smartButtonLabel">
            <i :class="reviewMode === 'content' ? 'mdi mdi-chevron-right' : 'mdi mdi-eye-outline'" class="text-xl"></i>
          </button>
        </div>
      </div>
    </div>

    <!-- Auth Modal -->
    <div v-show="showAuthModal"
         class="fixed inset-0 z-50 overflow-y-auto">
      <div class="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <!-- Background overlay -->
        <div class="fixed inset-0 transition-opacity bg-slate-900 bg-opacity-75" @click="closeAuthModal()"></div>

        <!-- Modal panel -->
        <div class="inline-block align-bottom glass-card rounded-2xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-md w-full">
          <div class="p-4 sm:p-8">
            <!-- Toggle between Login and Register -->
            <div class="flex gap-2 mb-6">
              <button
                @click="authMode = 'login'"
                :class="authMode === 'login' ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700'"
                class="flex-1 py-2 rounded-lg font-semibold transition-all">
                Login
              </button>
              <button
                @click="authMode = 'register'"
                :class="authMode === 'register' ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700'"
                class="flex-1 py-2 rounded-lg font-semibold transition-all">
                Sign Up
              </button>
            </div>

            <!-- Login Form -->
            <form v-show="authMode === 'login'" @submit.prevent="handleLogin()" class="space-y-4">
              <h3 class="text-2xl font-bold text-slate-800 mb-4">Welcome Back</h3>

              <div>
                <label class="block text-sm font-semibold text-slate-700 mb-2">Email</label>
                <input
                  type="email"
                  v-model="authForm.email"
                  placeholder="your@email.com"
                  class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl transition-all focus:border-blue-500"
                  required>
              </div>

              <div>
                <label class="block text-sm font-semibold text-slate-700 mb-2">Password</label>
                <input
                  type="password"
                  v-model="authForm.password"
                  placeholder="••••••••"
                  class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl transition-all focus:border-blue-500"
                  required>
              </div>

              <!-- Error message -->
              <div v-show="authForm.error"

                   class="p-3 bg-red-50 border-2 border-red-200 text-red-700 rounded-lg text-sm font-medium"
                   v-text="authForm.error"></div>

              <div class="flex gap-3 pt-2">
                <button
                  type="submit"
                  :disabled="authLoading"
                  class="flex-1 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-50">
                  <span v-show="!authLoading">Login</span>
                  <span v-show="authLoading">Logging in...</span>
                </button>
                <button
                  type="button"
                  @click="closeAuthModal()"
                  class="px-6 py-3 bg-slate-200 text-slate-700 rounded-xl font-semibold hover:bg-slate-300 transition-all">
                  Cancel
                </button>
              </div>
            </form>

            <!-- Register Form -->
            <form v-show="authMode === 'register'" @submit.prevent="handleRegister()" class="space-y-4">
              <h3 class="text-2xl font-bold text-slate-800 mb-4">Create Account</h3>

              <div>
                <label class="block text-sm font-semibold text-slate-700 mb-2">Email</label>
                <input
                  type="email"
                  v-model="authForm.email"
                  placeholder="your@email.com"
                  class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl transition-all focus:border-blue-500"
                  required>
              </div>

              <div>
                <label class="block text-sm font-semibold text-slate-700 mb-2">Password</label>
                <input
                  type="password"
                  v-model="authForm.password"
                  placeholder="••••••••"
                  class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl transition-all focus:border-blue-500"
                  required>
                <p class="text-xs text-slate-500 mt-1">Minimum 8 characters</p>
              </div>

              <div>
                <label class="block text-sm font-semibold text-slate-700 mb-2">Confirm Password</label>
                <input
                  type="password"
                  v-model="authForm.confirmPassword"
                  placeholder="••••••••"
                  class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl transition-all focus:border-blue-500"
                  required>
              </div>

              <!-- Error message -->
              <div v-show="authForm.error"

                   class="p-3 bg-red-50 border-2 border-red-200 text-red-700 rounded-lg text-sm font-medium"
                   v-text="authForm.error"></div>

              <div class="flex gap-3 pt-2">
                <button
                  type="submit"
                  :disabled="authLoading"
                  class="flex-1 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-50">
                  <span v-show="!authLoading">Sign Up</span>
                  <span v-show="authLoading">Creating account...</span>
                </button>
                <button
                  type="button"
                  @click="closeAuthModal()"
                  class="px-6 py-3 bg-slate-200 text-slate-700 rounded-xl font-semibold hover:bg-slate-300 transition-all">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>

    <!-- Edit Modal -->
    <div v-show="showEditModal"
         class="fixed inset-0 z-50 overflow-y-auto">
      <div class="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <!-- Background overlay -->
        <div class="fixed inset-0 transition-opacity bg-slate-900 bg-opacity-75" @click="showEditModal = false"></div>

        <!-- Modal panel -->
        <div class="inline-block align-bottom glass-card rounded-2xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl w-full">
          <div class="p-4 sm:p-8">
            <h3 class="text-2xl sm:text-3xl font-bold mb-6 text-slate-800">Edit Verse</h3>
            <template v-if="editingVerse">
              <form @submit.prevent="saveEditVerse()" class="space-y-5">
                <div>
                  <label class="block text-sm font-semibold text-slate-700 mb-2">Reference</label>
                  <input
                    type="text"
                    v-model="editingVerse.reference"
                    placeholder="e.g., John 3:16"
                    class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl transition-all"
                    required>
                </div>
                <div>
                  <label class="block text-sm font-semibold text-slate-700 mb-2">Reference Sort</label>
                  <input
                    type="text"
                    v-model="editingVerse.refSort"
                    placeholder="e.g., bible.43003016"
                    class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl transition-all"
                    required>
                </div>
                <div>
                  <label class="block text-sm font-semibold text-slate-700 mb-2">Verse Text</label>
                  <textarea
                    v-model="editingVerse.content"
                    placeholder="Enter the verse text..."
                    rows="5"
                    class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl transition-all"
                    required></textarea>
                </div>
                <div>
                  <label class="block text-sm font-semibold text-slate-700 mb-2">Translation (optional)</label>
                  <input
                    type="text"
                    v-model="editingVerse.translation"
                    placeholder="e.g., NIV, ESV, KJV"
                    class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl transition-all">
                </div>
                <div>
                  <label class="block text-sm font-semibold text-slate-700 mb-2">Started Date</label>
                  <input
                    type="date"
                    v-model="editingVerse.startedAtInput"
                    class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl transition-all"
                    required>
                  <p class="text-xs text-slate-500 mt-1">When you started memorizing this verse</p>
                </div>
                <div>
                  <label class="block text-sm font-semibold text-slate-700 mb-2">Review Category</label>
                  <select
                    v-model="editingVerse.reviewCat"
                    class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl transition-all">
                    <option value="auto">Auto</option>
                    <option value="future">Future (not started yet)</option>
                    <option value="learn">Learn (daily review)</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                  <p class="text-xs text-slate-500 mt-1">How often to review this verse</p>
                </div>
                <div class="flex items-center gap-2">
                  <input
                    type="checkbox"
                    v-model="editingVerse.favorite"
                    id="edit-favorite"
                    class="w-5 h-5 border-2 border-slate-200 rounded transition-all">
                  <label for="edit-favorite" class="text-sm font-semibold text-slate-700">
                    ⭐ Mark as Favorite
                  </label>
                </div>
                <div>
                  <label class="block text-sm font-semibold text-slate-700 mb-2">Tags (optional)</label>
                  <input
                    type="text"
                    v-model="editingVerse.tagsInput"
                    placeholder="e.g., fast.sk=3, ss=2010.Q2.W01, personal"
                    class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl transition-all">
                </div>
                <div class="flex gap-3 pt-2">
                  <button
                    type="submit"
                    class="btn-premium flex-1 text-white py-3 rounded-xl font-semibold">
                    Save Changes
                  </button>
                  <button
                    type="button"
                    @click="showEditModal = false"
                    class="flex-1 py-3 rounded-xl font-semibold bg-slate-200 text-slate-700 hover:bg-slate-300 transition-all">
                    Cancel
                  </button>
                </div>
              </form>
            </template>
          </div>
        </div>
      </div>
    </div>
  </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, type Ref } from 'vue';
import { bibleMemoryApp } from './app';
import { getCachedReviewStatus } from './actions';
import VerseCard from './components/VerseCard.vue';
import { useSwipe } from './composables/useSwipe';

// Destructure everything from bibleMemoryApp (app.ts)
const {
  // State
  currentTab,
  verses,
  searchQuery,
  sortBy,
  newVerse,
  showAddSuccess,
  editingVerse,
  showEditModal,
  dueForReview,
  currentReviewIndex,
  currentReviewVerse,
  showVerseText,
  reviewComplete,
  reviewedToday,
  currentStreak,
  currentVerseReviewStatus,
  importFileRef,
  isAuthenticated,
  userEmail,
  showAuthModal,
  authMode,
  authForm,
  authLoading,
  showUserMenu,
  lastSyncSuccess,
  lastSyncError,
  lastSyncAttempt,
  isOffline,

  // Toast notifications
  showOfflineToast,
  triggerOfflineToast,

  // Phase 2: Review mode state
  reviewMode,
  hintsShown,
  flashcardLevel,
  flashcardHiddenWords,
  flashcardRevealedWords,
  firstLettersRevealedGroups,

  // Review source selection state
  reviewSource,
  filteredReviewVerses,

  // Computed
  filteredVerses,
  hasVersesButNoSearchResults,
  hasSyncIssues,
  totalReviewCount,

  // Methods
  addVerse,
  startEditVerse,
  saveEditVerse,
  deleteVerse,
  setSortBy,
  loadReviewVerses,
  markReview,
  resetReview,
  exportVerses,
  importVerses,
  formatTagForDisplay,
  openAuthModal,
  closeAuthModal,
  handleLogin,
  handleRegister,
  handleLogout,
  exportToLegacyAndOpen,

  // Phase 2: Review mode methods
  canIncreaseFlashCardDifficulty,
  canDecreaseFlashCardDifficulty,
  getFlashCardLevelName,
  smartButtonLabel,
  switchToReference,
  switchToContent,
  switchToHints,
  addHint,
  switchToFirstLetters,
  switchToFlashCards,
  increaseFlashCardDifficulty,
  decreaseFlashCardDifficulty,
  getHintedContent,
  getFirstLettersContent,
  getFirstLettersChunks,
  revealFirstLetterChunk,
  getWords,
  revealWord,
  nextVerse,
  previousVerse,
  getHumanReadableTime,
  getAbbreviatedAge,
  getReviewCategory,
  getReferenceWords,
  getContentWordsStartIndex,
  smartButtonAction,
  returnToDailyReview,

  // Phase 2: Keyboard shortcuts
  handleKeyPress,

  // Immersive mode
  isImmersiveModeActive,
  toggleImmersiveMode,
  exitImmersiveMode,

  // Deck-style view mode
  verseViewMode,
  expandedVerseIds,
  toggleViewMode,
  toggleVerseExpansion,

  // Card click handler
  handleCardClick,

  // Add verse wizard (from useVerses via app.ts)
  addVerseStep,
  pastedText,
  parsingState,
  parsingError,
  parseVerseWithAI,
  skipAIParsing,
  goBackToPaste,

  // Review source selection handlers
  startReviewFromFiltered,
  startReviewAtVerse,
} = bibleMemoryApp();

// Local state for My Verses menu
const showMyVersesMenu = ref(false);

// Local state for Sort menu
const showSortMenu = ref(false);

// Local state for Review card menu
const showReviewCardMenu = ref(false);

// Review card ref for swipe functionality (cast to proper type for useSwipe)
const reviewCardElement = ref<HTMLElement | null>(null) as Ref<HTMLElement | null>;

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

// Check if can navigate to previous/next verse
const canSwipeRight = computed(() => currentReviewIndex.value > 0);
const canSwipeLeft = computed(() => currentReviewIndex.value < dueForReview.value.length - 1);

// Set up swipe gestures for review cards
const { isSwiping, swipeOffset, swipeDirection, isAnimatingExit, isAnimatingEnter, isPositioning } = useSwipe(reviewCardElement, {
  onSwipeLeft: () => {
    if (canSwipeLeft.value) {
      nextVerse();
    }
  },
  onSwipeRight: () => {
    if (canSwipeRight.value) {
      previousVerse();
    }
  },
  threshold: 50,
  canSwipeLeft: () => canSwipeLeft.value,
  canSwipeRight: () => canSwipeRight.value,
});

// Set up keyboard shortcuts
onMounted(() => {
  const keyHandler = (event: KeyboardEvent) => {
    // Only handle when Review tab is active
    if (currentTab.value === 'review' && !reviewComplete.value) {
      handleKeyPress(event);
    }
  };
  window.addEventListener('keydown', keyHandler);

  // Clean up on unmount
  onUnmounted(() => {
    window.removeEventListener('keydown', keyHandler);
  });
});
</script>
