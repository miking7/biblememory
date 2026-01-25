<template>
  <div v-show="show" class="fixed inset-0 z-50 overflow-y-auto">
    <div class="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
      <!-- Background overlay -->
      <div class="fixed inset-0 transition-opacity bg-slate-900 bg-opacity-75" @click="$emit('close')"></div>

      <!-- Modal panel -->
      <div class="inline-block align-bottom glass-card rounded-2xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl w-full">
        <div class="p-4 sm:p-8">
          <h3 class="text-2xl sm:text-3xl font-bold mb-6 text-slate-800">Edit Verse</h3>
          <template v-if="verse">
            <form @submit.prevent="$emit('save')" class="space-y-5">
              <div>
                <label class="block text-sm font-semibold text-slate-700 mb-2">Reference</label>
                <input
                  type="text"
                  :value="verse.reference"
                  @input="$emit('update:verse', { ...verse, reference: ($event.target as HTMLInputElement).value })"
                  placeholder="e.g., John 3:16"
                  class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl transition-all"
                  required>
              </div>
              <div>
                <label class="block text-sm font-semibold text-slate-700 mb-2">Reference Sort</label>
                <input
                  type="text"
                  :value="verse.refSort"
                  @input="$emit('update:verse', { ...verse, refSort: ($event.target as HTMLInputElement).value })"
                  placeholder="e.g., bible.43003016"
                  class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl transition-all"
                  required>
              </div>
              <div>
                <label class="block text-sm font-semibold text-slate-700 mb-2">Verse Text</label>
                <textarea
                  :value="verse.content"
                  @input="$emit('update:verse', { ...verse, content: ($event.target as HTMLTextAreaElement).value })"
                  placeholder="Enter the verse text..."
                  rows="5"
                  class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl transition-all"
                  required></textarea>
              </div>
              <div>
                <label class="block text-sm font-semibold text-slate-700 mb-2">Translation (optional)</label>
                <input
                  type="text"
                  :value="verse.translation"
                  @input="$emit('update:verse', { ...verse, translation: ($event.target as HTMLInputElement).value })"
                  placeholder="e.g., NIV, ESV, KJV"
                  class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl transition-all">
              </div>
              <div>
                <label class="block text-sm font-semibold text-slate-700 mb-2">Started Date</label>
                <input
                  type="date"
                  :value="verse.startedAtInput"
                  @input="$emit('update:verse', { ...verse, startedAtInput: ($event.target as HTMLInputElement).value })"
                  class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl transition-all"
                  required>
                <p class="text-xs text-slate-500 mt-1">When you started memorizing this verse</p>
              </div>
              <div>
                <label class="block text-sm font-semibold text-slate-700 mb-2">Review Category</label>
                <select
                  :value="verse.reviewCat"
                  @change="$emit('update:verse', { ...verse, reviewCat: ($event.target as HTMLSelectElement).value })"
                  class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl transition-all">
                  <option value="auto">Auto</option>
                  <option value="learn">Learn (daily review)</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="paused">Paused</option>
                </select>
                <p class="text-xs text-slate-500 mt-1">How often to review this verse</p>
              </div>
              <div class="flex items-center gap-2">
                <input
                  type="checkbox"
                  :checked="verse.favorite"
                  @change="$emit('update:verse', { ...verse, favorite: ($event.target as HTMLInputElement).checked })"
                  id="edit-favorite"
                  class="w-5 h-5 border-2 border-slate-200 rounded transition-all">
                <label for="edit-favorite" class="text-sm font-semibold text-slate-700">
                  Mark as Favorite
                </label>
              </div>
              <div>
                <label class="block text-sm font-semibold text-slate-700 mb-2">Tags (optional)</label>
                <input
                  type="text"
                  :value="verse.tagsInput"
                  @input="$emit('update:verse', { ...verse, tagsInput: ($event.target as HTMLInputElement).value })"
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
                  @click="$emit('close')"
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
</template>

<script setup lang="ts">
export interface EditingVerse {
  id: string
  reference: string
  refSort: string
  content: string
  translation: string
  startedAtInput: string
  reviewCat: string
  favorite: boolean
  tagsInput: string
}

defineProps<{
  show: boolean
  verse: EditingVerse | null
}>()

defineEmits<{
  close: []
  save: []
  'update:verse': [verse: EditingVerse]
}>()
</script>
