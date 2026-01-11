<template>
  <div 
    :class="[
      'verse-card bg-gradient-to-br from-white to-slate-50 shadow-md transition-all',
      isCompact ? 'verse-card-compact rounded-t-xl' : 'verse-card-full rounded-xl',
      isExpanded ? 'verse-card-full-compact-mode-adjustment' : '',
      showMenu ? 'relative z-50' : 'relative'
    ]"
    @click="handleCardClick">
    
    <!-- COMPACT MODE (not expanded) -->
    <template v-if="isCompact">
      <div class="compact-content">
        <span class="font-bold text-slate-800">{{ verse.reference }}</span>&nbsp;
        <span class="text-slate-700"> {{ verse.content }}</span>
      </div>
    </template>
    
    <!-- FULL MODE or EXPANDED -->
    <template v-else>
      <div class="flex justify-between items-start mb-3 relative">
        <div class="flex flex-wrap items-center gap-2">
          <h3 class="font-bold text-lg sm:text-xl text-slate-800" v-text="verse.reference"></h3>
          <span v-show="verse.translation"
                class="text-xs text-slate-500 font-medium px-2 py-1 bg-slate-100 rounded"
                v-text="verse.translation"></span>
        </div>
        
        <!-- Three-dot menu -->
        <div class="relative" v-click-outside="() => showMenu = false">
          <button
            @click.stop="showMenu = !showMenu"
            class="px-2 py-1 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
            title="Options">
            <i class="mdi mdi-dots-vertical text-xl"></i>
          </button>

          <!-- Dropdown Menu -->
          <div v-show="showMenu"
               class="absolute right-0 mt-2 glass-card rounded-xl shadow-2xl overflow-hidden z-50 min-w-[160px]">
            <button
              @click.stop="$emit('review-this', verse.id); showMenu = false"
              class="w-full px-4 py-3 text-left text-sm font-medium text-slate-700 hover:bg-slate-50 transition-all flex items-center gap-2 border-b border-slate-100">
              <span>🎯</span>
              <span>Review This</span>
            </button>
            <button
              @click.stop="$emit('edit', verse); showMenu = false"
              class="w-full px-4 py-3 text-left text-sm font-medium text-slate-700 hover:bg-slate-50 transition-all flex items-center gap-2 border-b border-slate-100">
              <span>✏️</span>
              <span>Edit</span>
            </button>
            <button
              @click.stop="$emit('delete', verse.id); showMenu = false"
              class="w-full px-4 py-3 text-left text-sm font-medium text-slate-700 hover:bg-slate-50 transition-all flex items-center gap-2">
              <span>🗑️</span>
              <span>Delete</span>
            </button>
          </div>
        </div>
      </div>
      <p class="verse-content text-sm sm:text-base text-slate-700 mb-3 leading-relaxed" v-text="verse.content"></p>
      <div class="flex flex-wrap items-center gap-2 text-xs text-slate-500 font-medium">
        <span><span class="hidden sm:inline">Added: </span><span v-text="new Date(verse.createdAt).toLocaleDateString()"></span></span>
        <span class="px-2 py-1 bg-blue-50 text-blue-600 rounded" v-text="verse.reviewCat"></span>
        <template v-if="verse.tags && verse.tags.length > 0">
          <template v-for="tag in verse.tags" :key="tag.key">
            <span class="px-2 py-1 bg-purple-50 text-purple-700 rounded text-xs font-medium"
                  v-text="formatTag(tag)"></span>
          </template>
        </template>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { Verse } from '../db';

// Props
const props = defineProps<{
  verse: Verse;
  viewMode?: 'full' | 'compact';
  isExpanded?: boolean;
}>();

const isCompact = computed(() => props.viewMode === 'compact' && !props.isExpanded);

// Local state for three-dot menu
const showMenu = ref(false);

// Emits
const emit = defineEmits<{
  edit: [verse: Verse];
  delete: [id: string];
  toggleExpand: [id: string];
  'review-this': [id: string];
}>();

// Handle card click for expansion
const handleCardClick = () => {
  if (props.viewMode === 'compact' && !props.isExpanded) {
    emit('toggleExpand', props.verse.id);
  }
};

// Helper function
const formatTag = (tag: { key: string; value: string }): string => {
  if (tag.value) {
    return `${tag.key} (${tag.value})`;
  }
  return tag.key;
};
</script>
