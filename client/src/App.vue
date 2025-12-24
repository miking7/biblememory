<template>
  <div>
    <!-- Anonymous Auth Banner (Full Width) -->
    <div v-show="!isAuthenticated"
         class="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-200 shadow-sm">
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

  <div class="container mx-auto px-4 py-8 max-w-5xl">
    <!-- Sync Issues Indicator -->
    <div v-show="hasSyncIssues" class="offline-indicator">
      ⚠️ Sync issues - currently offline. Changes saved locally.
    </div>

    <!-- Header -->
    <header class="mb-10 fade-in relative">
      <div class="text-center">
        <h1 class="text-5xl font-bold text-white mb-3 tracking-tight">
          📖 <span class="gradient-text">Bible Memory</span>
        </h1>
        <p class="text-blue-200 text-lg font-light">Memorize Scripture, one verse at a time</p>
      </div>

      <!-- User Menu (Authenticated) -->
      <div v-show="isAuthenticated"

           class="absolute top-0 right-0"
           v-click-outside="() => showUserMenu = false">
        <button
          @click="showUserMenu = !showUserMenu"
          class="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white hover:shadow-lg transition-all text-xl">
          👤
        </button>

        <!-- Dropdown Menu -->
        <div v-show="showUserMenu"
             class="absolute right-0 mt-2 w-64 glass-card rounded-xl shadow-2xl overflow-hidden z-50">
          <div class="p-4 border-b border-slate-200">
            <p class="text-xs text-slate-500 font-medium mb-1">Signed in as</p>
            <p class="text-sm font-semibold text-slate-800 truncate" v-text="userEmail"></p>
          </div>
          <button
            @click="handleLogout(); showUserMenu = false"
            class="w-full px-4 py-3 text-left text-sm font-medium text-slate-700 hover:bg-slate-50 transition-all flex items-center gap-2">
            <span>🚪</span>
            <span>Logout</span>
          </button>
        </div>
      </div>
    </header>

    <!-- Stats Bar -->
    <div class="glass-card rounded-2xl shadow-2xl p-6 mb-8 fade-in">
      <div class="grid grid-cols-3 gap-6">
        <div class="stat-card rounded-xl p-5 text-center">
          <div class="text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-500 bg-clip-text text-transparent mb-1" v-text="verses.length"></div>
          <div class="text-sm text-slate-600 font-medium">Total Verses</div>
        </div>
        <div class="stat-card rounded-xl p-5 text-center">
          <div class="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-500 bg-clip-text text-transparent mb-1" v-text="reviewedToday"></div>
          <div class="text-sm text-slate-600 font-medium">Reviewed Today</div>
        </div>
        <div class="stat-card rounded-xl p-5 text-center">
          <div class="text-3xl font-bold bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent mb-1" v-text="currentStreak"></div>
          <div class="text-sm text-slate-600 font-medium">Day Streak</div>
        </div>
      </div>
    </div>

    <!-- Tab Navigation -->
    <div class="glass-card rounded-2xl shadow-2xl overflow-hidden fade-in">
      <div class="flex border-b border-slate-200 bg-gradient-to-r from-slate-50 to-blue-50">
        <button
          @click="currentTab = 'add'"
          :class="currentTab === 'add' ? 'active text-blue-700 font-semibold' : 'text-slate-600'"
          class="tab-button flex-1 py-5 px-6 font-medium hover:bg-white/50 transition-all">
          <span class="text-xl mr-2">📝</span> Add Verse
        </button>
        <button
          @click="currentTab = 'list'"
          :class="currentTab === 'list' ? 'active text-blue-700 font-semibold' : 'text-slate-600'"
          class="tab-button flex-1 py-5 px-6 font-medium hover:bg-white/50 transition-all">
          <span class="text-xl mr-2">📚</span> My Verses
        </button>
        <button
          @click="currentTab = 'review'; loadReviewVerses()"
          :class="currentTab === 'review' ? 'active text-blue-700 font-semibold' : 'text-slate-600'"
          class="tab-button flex-1 py-5 px-6 font-medium hover:bg-white/50 transition-all relative">
          <span class="text-xl mr-2">🎯</span> Review
          <span v-show="dueForReview.length > 0"
                class="badge-notification absolute top-3 right-3 bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center shadow-lg"
                v-text="dueForReview.length"></span>
        </button>
      </div>

      <!-- Add Verse Tab -->
      <div v-show="currentTab === 'add'" class="p-8">
        <h2 class="text-3xl font-bold mb-6 text-slate-800">Add New Verse</h2>
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

      <!-- My Verses Tab -->
      <div v-show="currentTab === 'list'" class="p-8">
        <div class="flex justify-between items-center mb-6">
          <h2 class="text-3xl font-bold text-slate-800">My Verses</h2>
          <div class="space-x-3">
            <button
              @click="exportVerses()"
              class="px-5 py-2.5 bg-gradient-to-r from-slate-600 to-slate-700 text-white rounded-lg hover:shadow-lg transition-all font-medium text-sm">
              Export
            </button>
            <button
              @click="importFileRef?.click()"
              class="px-5 py-2.5 bg-gradient-to-r from-slate-600 to-slate-700 text-white rounded-lg hover:shadow-lg transition-all font-medium text-sm">
              Import
            </button>
            <input type="file" ref="importFileRef" @change="importVerses($event)" accept=".json" class="hidden">
          </div>
        </div>

        <input
          type="text"
          v-model="searchQuery"
          placeholder="Search verses..."
          class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl mb-6 transition-all">

        <!-- No verses at all -->
        <div v-show="verses.length === 0" class="text-center py-12 text-slate-500">
          <div class="text-5xl mb-4">📖</div>
          <p class="text-lg">No verses yet. Add your first verse to get started!</p>
        </div>

        <!-- Has verses but search returned no results -->
        <div v-show="hasVersesButNoSearchResults" class="text-center py-12 text-slate-500">
          <div class="text-5xl mb-4">🔍</div>
          <p class="text-lg font-semibold mb-2">No verses match your search</p>
          <p class="text-sm">Try a different search term or clear the search to see all verses.</p>
        </div>

        <div class="space-y-4">
          <VerseCard
            v-for="verse in filteredVerses"
            :key="verse.id"
            :verse="verse"
            @edit="startEditVerse"
            @delete="deleteVerse"
          />
        </div>
      </div>

      <!-- Review Tab -->
      <div v-show="currentTab === 'review'" class="p-8">
        <h2 class="text-3xl font-bold mb-6 text-slate-800">Daily Review</h2>

        <div v-show="dueForReview.length === 0" class="text-center py-16">
          <div class="text-7xl mb-4">🎉</div>
          <p class="text-2xl text-slate-700 mb-2 font-semibold">All caught up!</p>
          <p class="text-slate-500 text-lg">No verses due for review today.</p>
        </div>

        <div v-show="dueForReview.length > 0">
          <div class="mb-6 text-center">
            <span class="text-slate-600 font-medium">Progress: </span>
            <span class="font-bold text-blue-600 text-lg" v-text="currentReviewIndex + 1"></span>
            <span class="text-slate-600"> / </span>
            <span class="font-bold text-slate-700 text-lg" v-text="dueForReview.length"></span>
          </div>

          <template v-if="currentReviewVerse">
            <div class="review-card rounded-2xl p-10 min-h-[350px] flex flex-col justify-center items-center">
              <div class="text-center mb-8">
                <h3 class="text-4xl font-bold text-slate-800 mb-2" v-text="currentReviewVerse.reference"></h3>
                <div class="flex flex-wrap items-center justify-center gap-2 mt-3">
                  <span v-show="currentReviewVerse.translation"
                        class="text-sm text-slate-500 font-medium px-3 py-1 bg-slate-100 rounded-full"
                        v-text="currentReviewVerse.translation"></span>
                  <template v-if="currentReviewVerse.tags && currentReviewVerse.tags.length > 0">
                    <template v-for="tag in currentReviewVerse.tags" :key="tag.key">
                      <span class="text-sm text-purple-700 font-medium px-3 py-1 bg-purple-50 rounded-full" v-text="formatTagForDisplay(tag)"></span>
                    </template>
                  </template>
                </div>
              </div>

              <div v-show="!showVerseText" class="text-center">
                <button
                  @click="showVerseText = true"
                  class="btn-gold px-10 py-4 text-white rounded-xl font-semibold text-lg">
                  Reveal Verse
                </button>
              </div>

              <div v-show="showVerseText"  class="w-full">
                <p class="verse-content text-xl text-slate-700 text-center mb-8 leading-relaxed font-light" v-text="currentReviewVerse.content"></p>

                <div class="flex gap-4 justify-center">
                  <button
                    @click="markReview(true)"
                    class="btn-success px-8 py-4 text-white rounded-xl font-semibold">
                    ✓ Got it!
                  </button>
                  <button
                    @click="markReview(false)"
                    class="btn-warning px-8 py-4 text-white rounded-xl font-semibold">
                    Need Practice
                  </button>
                </div>
              </div>
            </div>
          </template>

          <div v-show="reviewComplete"  class="text-center py-16">
            <div class="text-7xl mb-4">🎉</div>
            <p class="text-3xl text-slate-700 mb-3 font-bold">Review Complete!</p>
            <p class="text-slate-500 mb-6 text-lg">Great job reviewing today's verses.</p>
            <button
              @click="resetReview()"
              class="btn-premium px-8 py-4 text-white rounded-xl font-semibold text-lg">
              Review Again
            </button>
          </div>
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
        <div class="inline-block align-bottom glass-card rounded-2xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-md sm:w-full">
          <div class="p-8">
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
        <div class="inline-block align-bottom glass-card rounded-2xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
          <div class="p-8">
            <h3 class="text-3xl font-bold mb-6 text-slate-800">Edit Verse</h3>
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
import { bibleMemoryApp } from './app';
import VerseCard from './components/VerseCard.vue';

// Destructure everything from bibleMemoryApp
const {
  // State
  currentTab,
  verses,
  searchQuery,
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

  // Computed
  filteredVerses,
  hasVersesButNoSearchResults,
  hasSyncIssues,

  // Methods
  addVerse,
  startEditVerse,
  saveEditVerse,
  deleteVerse,
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
} = bibleMemoryApp();
</script>
