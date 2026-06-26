<template>
  <div class="p-3 sm:p-8">
    <!-- Header with Title and Controls Row -->
    <div class="mb-6">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-2xl sm:text-3xl font-bold text-slate-800">My Verses</h2>

        <!-- Control Buttons Row -->
        <div class="flex items-center gap-2">
          <!-- View Mode Toggle Button -->
          <button
            @click="$emit('toggleViewMode')"
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
                @click="$emit('update:sortBy', 'newest'); showSortMenu = false"
                class="w-full px-4 py-3 text-left text-sm font-medium text-slate-700 hover:bg-slate-50 transition-all flex items-center gap-2 border-b border-slate-100">
                <i class="mdi mdi-arrow-down text-lg"></i>
                <span>Newest</span>
                <i v-show="sortBy === 'newest'" class="mdi mdi-check text-lg ml-auto text-blue-600"></i>
              </button>
              <button
                @click="$emit('update:sortBy', 'oldest'); showSortMenu = false"
                class="w-full px-4 py-3 text-left text-sm font-medium text-slate-700 hover:bg-slate-50 transition-all flex items-center gap-2 border-b border-slate-100">
                <i class="mdi mdi-arrow-up text-lg"></i>
                <span>Oldest</span>
                <i v-show="sortBy === 'oldest'" class="mdi mdi-check text-lg ml-auto text-blue-600"></i>
              </button>
              <button
                @click="$emit('update:sortBy', 'reference'); showSortMenu = false"
                class="w-full px-4 py-3 text-left text-sm font-medium text-slate-700 hover:bg-slate-50 transition-all flex items-center gap-2 border-b border-slate-100">
                <i class="mdi mdi-book-open-page-variant text-lg"></i>
                <span>Reference</span>
                <i v-show="sortBy === 'reference'" class="mdi mdi-check text-lg ml-auto text-blue-600"></i>
              </button>
              <button
                @click="$emit('update:sortBy', 'category'); showSortMenu = false"
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
                @click="$emit('startReviewFromFiltered'); showMyVersesMenu = false"
                class="w-full px-4 py-3 text-left text-sm font-medium text-slate-700 hover:bg-slate-50 transition-all flex items-center gap-2 border-b border-slate-100">
                <i class="mdi mdi-target text-lg"></i>
                <span>Review These</span>
              </button>
              <button
                @click="$emit('exportVerses'); showMyVersesMenu = false"
                class="w-full px-4 py-3 text-left text-sm font-medium text-slate-700 hover:bg-slate-50 transition-all flex items-center gap-2 border-b border-slate-100">
                <i class="mdi mdi-download text-lg"></i>
                <span>Export</span>
              </button>
              <button
                @click="triggerImport(); showMyVersesMenu = false"
                class="w-full px-4 py-3 text-left text-sm font-medium text-slate-700 hover:bg-slate-50 transition-all flex items-center gap-2">
                <i class="mdi mdi-upload text-lg"></i>
                <span>Import</span>
              </button>
            </div>
            <input type="file" ref="importFileRef" @change="$emit('importVerses', $event)" accept=".json" class="hidden">
          </div>
        </div>
      </div>

      <!-- Search Box -->
      <input
        type="text"
        :value="searchQuery"
        @input="$emit('update:searchQuery', ($event.target as HTMLInputElement).value)"
        placeholder="Search verses..."
        class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl transition-all">
    </div>

    <!-- No verses at all -->
    <div v-show="verses.length === 0" class="text-center py-12 text-slate-500">
      <img src="/icons/icon-192.png" alt="" class="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 opacity-50" />
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
        :review-status="getReviewStatus(verse.id)"
        @copy="$emit('copyVerse', $event)"
        @view-online="$emit('viewOnline', $event)"
        @edit="$emit('editVerse', $event)"
        @delete="$emit('deleteVerse', $event)"
        @toggle-expand="$emit('toggleVerseExpansion', $event)"
        @review-this="$emit('reviewThis', $event)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import VerseCard from '../VerseCard.vue'
import { getCachedReviewStatus } from '../../actions'
import type { Verse } from '../../db'

type SortBy = 'newest' | 'oldest' | 'reference' | 'category'

const props = defineProps<{
  verses: Verse[]
  searchQuery: string
  sortBy: SortBy
  verseViewMode: 'full' | 'compact'
  expandedVerseIds: Set<string>
  filteredVerses: Verse[]
  hasVersesButNoSearchResults: boolean
}>()

defineEmits<{
  'update:searchQuery': [query: string]
  'update:sortBy': [sort: SortBy]
  toggleViewMode: []
  toggleVerseExpansion: [id: string]
  copyVerse: [verse: Verse]
  viewOnline: [verse: Verse]
  editVerse: [verse: Verse]
  deleteVerse: [id: string]
  reviewThis: [id: string]
  startReviewFromFiltered: []
  exportVerses: []
  importVerses: [event: Event]
}>()

// Local state for dropdown menus
const showSortMenu = ref(false)
const showMyVersesMenu = ref(false)
const importFileRef = ref<HTMLInputElement | null>(null)

// Helper to trigger import file dialog
const triggerImport = () => {
  importFileRef.value?.click()
}

// Helper to get review status
const getReviewStatus = (verseId: string) => {
  return getCachedReviewStatus(verseId)?.lastReviewType || null
}
</script>
