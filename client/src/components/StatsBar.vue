<template>
  <div v-show="!isImmersiveModeActive" class="glass-card rounded-2xl shadow-2xl p-3 sm:p-6 mb-4 sm:mb-8 fade-in immersive-hideable">
    <div class="grid grid-cols-3 gap-2 sm:gap-6">
      <!-- Total Verses -->
      <button
        type="button"
        class="stat-card rounded-xl p-3 sm:p-5 flex flex-col items-center justify-center h-full cursor-pointer"
        :aria-label="`Total verses: ${totalVerses}. View library statistics.`"
        @click="emit('open', 'library')"
      >
        <div class="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-500 bg-clip-text text-transparent mb-1" v-text="totalVerses"></div>
        <div class="flex-1 flex items-center justify-center text-xs sm:text-sm text-slate-600 font-medium text-center">Total Verses</div>
      </button>

      <!-- Reviewed Today (progress bar toward today's due target) -->
      <button
        type="button"
        class="stat-card rounded-xl p-3 sm:p-5 flex flex-col items-center justify-center h-full cursor-pointer relative overflow-hidden"
        :aria-label="reviewedAriaLabel"
        @click="emit('open', 'today')"
      >
        <div
          class="absolute inset-y-0 left-0 transition-all duration-500"
          :style="{ width: reviewedPct + '%', background: 'linear-gradient(90deg, rgba(16,185,129,0.18), rgba(5,150,105,0.24))' }"
        ></div>
        <div class="relative text-2xl sm:text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-500 bg-clip-text text-transparent mb-1" v-text="reviewedDisplay"></div>
        <div class="relative flex-1 flex items-center justify-center text-xs sm:text-sm text-slate-600 font-medium text-center">Reviewed Today</div>
      </button>

      <!-- Day Streak -->
      <button
        type="button"
        class="stat-card rounded-xl p-3 sm:p-5 flex flex-col items-center justify-center h-full cursor-pointer"
        :aria-label="`Day streak: ${currentStreak}. View consistency statistics.`"
        @click="emit('open', 'consistency')"
      >
        <div class="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent mb-1" v-text="currentStreak"></div>
        <div class="flex-1 flex items-center justify-center text-xs sm:text-sm text-slate-600 font-medium text-center">Day Streak</div>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  totalVerses: number
  reviewedToday: number
  reviewTarget: number
  currentStreak: number
  isImmersiveModeActive: boolean
}>()

const emit = defineEmits<{
  open: [tab: 'library' | 'today' | 'consistency']
}>()

// Fill toward today's due target, visually capped at 100% (reviews may exceed it).
const reviewedPct = computed(() => {
  if (props.reviewTarget > 0) return Math.min(100, (props.reviewedToday / props.reviewTarget) * 100)
  return props.reviewedToday > 0 ? 100 : 0
})

// Show "8/12" when there's a target, otherwise just the count.
const reviewedDisplay = computed(() =>
  props.reviewTarget > 0 ? `${props.reviewedToday}/${props.reviewTarget}` : `${props.reviewedToday}`
)

const reviewedAriaLabel = computed(() => {
  const base =
    props.reviewTarget > 0
      ? `Reviewed today: ${props.reviewedToday} of ${props.reviewTarget} due`
      : `Reviewed today: ${props.reviewedToday}`
  return `${base}. View today's statistics.`
})
</script>
