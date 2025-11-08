<template>
  <div class="verse-card bg-gradient-to-br from-white to-slate-50 rounded-xl p-6 shadow-md">
    <div class="flex justify-between items-start mb-3">
      <div class="flex flex-wrap items-center gap-2">
        <h3 class="font-bold text-xl text-slate-800" v-text="verse.reference"></h3>
        <span v-show="verse.translation"
              class="text-xs text-slate-500 font-medium px-2 py-1 bg-slate-100 rounded"
              v-text="verse.translation"></span>
      </div>
      <div class="flex gap-2">
        <button
          @click="$emit('edit', verse)"
          class="text-blue-600 hover:text-blue-800 text-sm font-medium hover:bg-blue-50 px-3 py-1 rounded transition-all">
          Edit
        </button>
        <button
          @click="$emit('delete', verse.id)"
          class="text-red-500 hover:text-red-700 text-sm font-medium hover:bg-red-50 px-3 py-1 rounded transition-all">
          Delete
        </button>
      </div>
    </div>
    <p class="verse-content text-slate-700 mb-3 leading-relaxed" v-text="verse.content"></p>
    <div class="flex flex-wrap justify-between items-center gap-2 text-xs text-slate-500 font-medium">
      <div class="flex flex-wrap items-center gap-2">
        <span v-text="'Added: ' + new Date(verse.createdAt).toLocaleDateString()"></span>
        <span class="px-2 py-1 bg-blue-50 text-blue-600 rounded" v-text="verse.reviewCat"></span>
        <template v-if="verse.tags && verse.tags.length > 0">
          <div class="flex flex-wrap items-center gap-1">
            <template v-for="tag in verse.tags" :key="tag.key">
              <span class="px-2 py-1 bg-purple-50 text-purple-700 rounded text-xs font-medium"
                    v-text="formatTag(tag)"></span>
            </template>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Verse } from '../db';

// Props
const props = defineProps<{
  verse: Verse;
}>();

// Emits
defineEmits<{
  edit: [verse: Verse];
  delete: [id: string];
}>();

// Helper function
const formatTag = (tag: { key: string; value: string }): string => {
  if (tag.value) {
    return `${tag.key} (${tag.value})`;
  }
  return tag.key;
};
</script>
