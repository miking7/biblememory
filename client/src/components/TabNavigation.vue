<template>
  <div v-show="!isImmersiveModeActive" class="flex border-b border-slate-200 bg-gradient-to-r from-slate-50 to-blue-50 immersive-hideable">
    <button
      @click="$emit('update:currentTab', 'list')"
      :class="currentTab === 'list' ? 'active text-blue-700 font-semibold' : 'text-slate-600'"
      class="tab-button flex-1 py-3 px-2 sm:py-5 sm:px-6 font-medium hover:bg-white/50 transition-all flex flex-col sm:flex-row items-center justify-center">
      <span class="text-3xl sm:text-xl sm:mr-2">📚</span>
      <span class="text-xs sm:text-base mt-1 sm:mt-0">My Verses</span>
    </button>
    <button
      @click="$emit('selectReview')"
      :class="currentTab === 'review' ? 'active text-blue-700 font-semibold' : 'text-slate-600'"
      class="tab-button flex-1 py-3 px-2 sm:py-5 sm:px-6 font-medium hover:bg-white/50 transition-all relative flex flex-col sm:flex-row items-center justify-center">
      <span class="text-3xl sm:text-xl sm:mr-2">🎯</span>
      <span class="text-xs sm:text-base mt-1 sm:mt-0">Review</span>
      <span v-show="showBadge"
            class="badge-notification absolute top-3 right-3 bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center shadow-lg"
            v-text="badgeCount"></span>
    </button>
    <button
      @click="$emit('update:currentTab', 'add')"
      :class="currentTab === 'add' ? 'active text-blue-700 font-semibold' : 'text-slate-600'"
      class="tab-button flex-1 py-3 px-2 sm:py-5 sm:px-6 font-medium hover:bg-white/50 transition-all flex flex-col sm:flex-row items-center justify-center">
      <span class="text-3xl sm:text-xl sm:mr-2">📝</span>
      <span class="text-xs sm:text-base mt-1 sm:mt-0">Add Verse</span>
    </button>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  currentTab: 'list' | 'review' | 'add'
  isImmersiveModeActive: boolean
  showBadge: boolean
  badgeCount: number
}>()

defineEmits<{
  'update:currentTab': [tab: 'list' | 'review' | 'add']
  selectReview: []
}>()
</script>
