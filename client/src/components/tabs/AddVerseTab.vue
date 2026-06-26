<template>
  <div class="p-3 sm:p-8">

    <!-- Step 1: Paste Verse with AI Parsing -->
    <div v-if="wizard.step.value === 'paste'">
      <h2 class="text-2xl sm:text-3xl font-bold mb-6 text-slate-800">Add New Verse</h2>

      <!-- Paste Textarea -->
      <div class="mb-5">
        <textarea
          v-model="wizard.pastedText.value"
          placeholder="Paste your verse here...&#10;(We'll infer reference/version info, and cleanup any cross-references / formatting.)"
          rows="8"
          class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl transition-all focus:border-blue-500"
          :disabled="wizard.parsingState.value === 'loading'"
          @keydown.enter.prevent="wizard.parseVerse()"></textarea>
      </div>

      <!-- Loading State -->
      <div v-if="wizard.parsingState.value === 'loading'" class="text-center py-6">
        <div class="inline-flex items-center gap-3 text-blue-600">
          <svg class="animate-spin h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span class="text-lg font-medium">Parsing your verse...</span>
        </div>
      </div>

      <!-- Error State -->
      <div v-if="wizard.parsingState.value === 'error'" class="mb-5 p-4 bg-red-50 border-2 border-red-200 rounded-xl">
        <p class="text-red-700 font-medium mb-3">Unable to parse verse</p>
        <p class="text-red-600 text-sm mb-4" v-text="wizard.parsingError.value"></p>
        <div class="flex gap-3">
          <button
            type="button"
            @click="wizard.parseVerse()"
            class="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:shadow-lg transition-all font-medium text-sm">
            Retry
          </button>
          <button
            type="button"
            @click="wizard.skipAIParsing()"
            class="px-5 py-2.5 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-all font-medium text-sm">
            Enter Manually
          </button>
        </div>
      </div>

      <!-- Action Buttons (when not loading or error) -->
      <div v-if="wizard.parsingState.value === 'idle'" class="flex gap-3 items-center mb-8">
        <button
          type="button"
          @click="wizard.parseVerse()"
          class="btn-premium px-8 py-4 text-white rounded-xl font-semibold text-lg flex-shrink-0">
          Smart Fill
        </button>
        <button
          type="button"
          @click="wizard.skipAIParsing()"
          class="px-5 py-2.5 text-slate-600 hover:text-slate-800 font-medium transition-all">
          Add manually
        </button>
      </div>

      <!-- Divider -->
      <div v-if="wizard.parsingState.value === 'idle'" class="relative my-8">
        <div class="absolute inset-0 flex items-center">
          <div class="w-full border-t border-slate-200"></div>
        </div>
        <div class="relative flex justify-center text-sm">
          <span class="px-3 bg-white text-slate-500 font-medium">Or add multiple verses</span>
        </div>
      </div>

      <!-- Collections Section -->
      <div v-if="wizard.parsingState.value === 'idle'" class="p-5 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border-2 border-blue-100">
        <h3 class="text-xl font-bold text-slate-800 mb-2">Browse Verse Collections</h3>
        <p class="text-slate-600 mb-4">Add curated sets of verses with automatic scheduling</p>
        <button
          type="button"
          @click="wizard.openCollections()"
          class="w-full sm:w-auto px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold text-lg hover:shadow-lg transition-all flex items-center justify-center gap-2">
          <span>Browse Collections</span>
        </button>
      </div>

      <!-- Success Message (shown after collections or manual add) -->
      <div v-show="wizard.showAddSuccess.value"
           class="mt-5 p-4 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 text-green-700 rounded-xl font-medium">
        Verse(s) added successfully!
      </div>
    </div>

    <!-- Step 2: Form with Pre-filled Data -->
    <div v-if="wizard.step.value === 'form'">
      <!-- Back Button -->
      <button
        type="button"
        @click="wizard.goBackToPaste()"
        class="mb-4 flex items-center gap-2 text-slate-600 hover:text-slate-800 font-medium transition-all">
        <span>&larr;</span>
        <span>Back</span>
      </button>

      <h2 class="text-2xl sm:text-3xl font-bold mb-6 text-slate-800">Add New Verse</h2>

      <form @submit.prevent="handleAddVerse" class="space-y-5">
        <div>
          <label class="block text-sm font-semibold text-slate-700 mb-2">Reference</label>
          <input
            type="text"
            v-model="wizard.newVerse.value.reference"
            placeholder="e.g., John 3:16"
            class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl transition-all"
            required>
        </div>
        <div>
          <label class="block text-sm font-semibold text-slate-700 mb-2">Reference Sort (for ordering)</label>
          <input
            type="text"
            v-model="wizard.newVerse.value.refSort"
            placeholder="e.g., bible.43003016"
            class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl transition-all"
            required>
          <p class="text-xs text-slate-500 mt-1">Format: bible.BBCCCVVV (BB=book 01-66, CCC=chapter, VVV=verse)</p>
        </div>
        <div>
          <label class="block text-sm font-semibold text-slate-700 mb-2">Verse Text</label>
          <textarea
            v-model="wizard.newVerse.value.content"
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
            v-model="wizard.newVerse.value.translation"
            placeholder="e.g., NIV, ESV, KJV"
            class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl transition-all">
        </div>
        <div>
          <label class="block text-sm font-semibold text-slate-700 mb-2">Started Date</label>
          <input
            type="date"
            v-model="wizard.newVerse.value.startedAtInput"
            class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl transition-all"
            required>
          <p class="text-xs text-slate-500 mt-1">When you started memorizing this verse</p>
        </div>
        <div>
          <label class="block text-sm font-semibold text-slate-700 mb-2">Tags (optional)</label>
          <input
            type="text"
            v-model="wizard.newVerse.value.tagsInput"
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
      <div v-show="wizard.showAddSuccess.value"
           class="mt-5 p-4 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 text-green-700 rounded-xl font-medium">
        Verse added successfully!
      </div>
    </div>

    <!-- Step 3: Collections List -->
    <div v-if="wizard.step.value === 'collections-list'">
      <button
        type="button"
        @click="wizard.cancelCollections()"
        class="mb-4 flex items-center gap-2 text-slate-600 hover:text-slate-800 font-medium transition-all">
        <span>&larr;</span>
        <span>Back</span>
      </button>

      <h2 class="text-2xl sm:text-3xl font-bold mb-3 text-slate-800">Verse Collections</h2>
      <p class="text-slate-600 mb-6">Choose a curated collection to add multiple verses at once</p>

      <!-- Loading State -->
      <div v-if="wizard.collectionsLoading.value" class="text-center py-12">
        <div class="inline-flex items-center gap-3 text-blue-600">
          <svg class="animate-spin h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span class="text-lg font-medium">Loading collections...</span>
        </div>
      </div>

      <!-- Error State -->
      <div v-if="wizard.collectionsError.value" class="p-4 bg-red-50 border-2 border-red-200 rounded-xl">
        <p class="text-red-700 font-medium mb-3">Unable to load collections</p>
        <p class="text-red-600 text-sm mb-4" v-text="wizard.collectionsError.value"></p>
        <button
          @click="wizard.loadCollections()"
          class="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:shadow-lg transition-all font-medium text-sm">
          Retry
        </button>
      </div>

      <!-- Collections Grid -->
      <div v-if="!wizard.collectionsLoading.value && !wizard.collectionsError.value" class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button
          v-for="collection in wizard.collectionsList.value"
          :key="collection.id"
          @click="wizard.selectCollection(collection.id)"
          class="text-left p-5 bg-white border-2 border-slate-200 rounded-xl hover:border-blue-400 hover:shadow-lg transition-all group">
          <h3 class="text-lg font-bold text-slate-800 mb-2 group-hover:text-blue-600 transition-colors" v-text="collection.name"></h3>
          <p class="text-sm text-slate-600 mb-3" v-text="collection.description"></p>
          <div class="flex items-center gap-2 text-sm text-slate-500">
            <i class="mdi mdi-book-open-variant"></i>
            <span v-text="collection.verseCount + ' verses'"></span>
          </div>
        </button>
      </div>

      <!-- Attribution pointer (shown with the grid only) -->
      <p v-if="!wizard.collectionsLoading.value && !wizard.collectionsError.value"
         class="mt-6 text-xs text-slate-400">
        A few favourite verses from popular translations to get you started.
        <a href="/bible-copyrights.html" target="_blank" rel="noopener noreferrer"
           class="text-blue-500 hover:text-blue-600 underline">Bible copyrights &amp; credits</a>
      </p>
    </div>

    <!-- Step 4: Collection Detail (Verse Selection) -->
    <div v-if="wizard.step.value === 'collections-detail'">
      <button
        type="button"
        @click="wizard.backToCollectionsList()"
        class="mb-4 flex items-center gap-2 text-slate-600 hover:text-slate-800 font-medium transition-all">
        <span>&larr;</span>
        <span>Back</span>
      </button>

      <h2 class="text-2xl sm:text-3xl font-bold mb-2 text-slate-800" v-text="wizard.selectedCollectionName.value"></h2>
      <p class="text-slate-600 mb-6" v-text="wizard.selectedCollectionDescription.value"></p>

      <!-- Loading State -->
      <div v-if="wizard.collectionVersesLoading.value" class="text-center py-12">
        <div class="inline-flex items-center gap-3 text-blue-600">
          <svg class="animate-spin h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span class="text-lg font-medium">Loading verses...</span>
        </div>
      </div>

      <!-- Error State -->
      <div v-if="wizard.collectionVersesError.value" class="p-4 bg-red-50 border-2 border-red-200 rounded-xl">
        <p class="text-red-700 font-medium mb-3">Unable to load verses</p>
        <p class="text-red-600 text-sm mb-4" v-text="wizard.collectionVersesError.value"></p>
        <button
          @click="wizard.selectCollection(wizard.selectedCollectionId.value)"
          class="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:shadow-lg transition-all font-medium text-sm">
          Retry
        </button>
      </div>

      <!-- Verses List with Checkboxes -->
      <div v-if="!wizard.collectionVersesLoading.value && !wizard.collectionVersesError.value">
        <div class="mb-4 text-sm text-slate-600">
          Select the verses you want to add (all selected by default)
        </div>

        <div class="space-y-3 mb-6">
          <label
            v-for="(verse, index) in wizard.collectionVerses.value"
            :key="index"
            class="flex items-start gap-3 p-4 bg-white border-2 border-slate-200 rounded-xl hover:border-blue-300 transition-all cursor-pointer">
            <input
              type="checkbox"
              :checked="wizard.selectedVerseIndices.value.includes(index)"
              @change="toggleVerseIndex(index)"
              class="mt-1 w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500">
            <div class="flex-1">
              <div class="font-semibold text-slate-800 mb-1">
                <span v-text="verse.reference"></span>
                <span v-if="verse.translation" class="text-slate-500 font-normal"> (<span v-text="verse.translation"></span>)</span>
              </div>
              <div class="text-sm text-slate-600" v-text="verse.content"></div>
            </div>
          </label>
        </div>

        <div class="flex justify-between items-center">
          <div class="text-sm text-slate-600">
            <span v-text="wizard.selectedVerseIndices.value.length"></span> of <span v-text="wizard.collectionVerses.value.length"></span> verses selected
          </div>
          <button
            @click="wizard.proceedToPaceSelection()"
            :disabled="wizard.selectedVerseIndices.value.length === 0"
            class="btn-premium px-8 py-3 text-white rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed">
            Continue
          </button>
        </div>
      </div>
    </div>

    <!-- Step 5: Pace Selection -->
    <div v-if="wizard.step.value === 'collections-pace'">
      <button
        type="button"
        @click="wizard.backToCollectionDetail()"
        class="mb-4 flex items-center gap-2 text-slate-600 hover:text-slate-800 font-medium transition-all">
        <span>&larr;</span>
        <span>Back</span>
      </button>

      <h2 class="text-2xl sm:text-3xl font-bold mb-2 text-slate-800">Set Your Pace</h2>
      <p class="text-slate-600 mb-6">Choose a memorization pace you can stick with</p>

      <div class="space-y-3 mb-8">
        <label
          v-for="pace in wizard.paceOptions"
          :key="pace.value"
          class="flex items-start gap-3 p-4 bg-white border-2 rounded-xl cursor-pointer transition-all"
          :class="wizard.selectedPace.value === pace.value ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-blue-300'">
          <input
            type="radio"
            :checked="wizard.selectedPace.value === pace.value"
            @change="wizard.selectedPace.value = pace.value"
            class="mt-1 w-5 h-5 text-blue-600 focus:ring-2 focus:ring-blue-500">
          <div class="flex-1">
            <div class="font-semibold text-slate-800 mb-1" v-text="pace.label"></div>
            <div class="text-sm text-slate-600" v-text="pace.description"></div>
          </div>
        </label>
      </div>

      <div class="flex justify-between items-center">
        <div class="text-sm text-slate-600">
          <span v-text="wizard.selectedVerseIndices.value.length"></span> verses will be added
        </div>
        <button
          @click="handleAddCollectionVerses"
          class="btn-premium px-8 py-4 text-white rounded-xl font-semibold text-lg">
          Add Verses
        </button>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { useAddVerseWizard } from '../../composables/useAddVerseWizard'

const emit = defineEmits<{ 'verse-added': [] }>()

const wizard = useAddVerseWizard(() => emit('verse-added'))

// Initialize form on component mount
wizard.initializeForm()

// Handle adding a single verse
const handleAddVerse = async () => {
  await wizard.addVerse()
}

// Handle adding collection verses. The wizard fires its onVerseAdded
// callback internally on success (same as addVerse), so we don't emit
// verse-added again here — doing so would reload the verse list twice.
const handleAddCollectionVerses = async () => {
  await wizard.addCollectionVerses()
}

// Helper to toggle a verse index in the selection
const toggleVerseIndex = (index: number) => {
  const indices = [...wizard.selectedVerseIndices.value]
  const pos = indices.indexOf(index)
  if (pos === -1) {
    indices.push(index)
  } else {
    indices.splice(pos, 1)
  }
  wizard.selectedVerseIndices.value = indices
}
</script>
