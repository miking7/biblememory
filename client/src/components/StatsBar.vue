<template>
  <div v-show="!isImmersiveModeActive" class="glass-card rounded-2xl shadow-2xl p-3 sm:p-6 mb-4 sm:mb-8 fade-in immersive-hideable">
    <div class="grid grid-cols-3 gap-2 sm:gap-6">
      <div class="stat-card rounded-xl p-3 sm:p-5 flex flex-col items-center justify-center h-full">
        <div class="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-500 bg-clip-text text-transparent mb-1" v-text="totalVerses"></div>
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
</template>

<script setup lang="ts">
defineProps<{
  totalVerses: number
  reviewedToday: number
  currentStreak: number
  isImmersiveModeActive: boolean
}>()
</script>
