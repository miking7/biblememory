<template>
  <div>
    <div v-if="total === 0" class="text-sm text-slate-500 py-3 text-center">
      No verses are in active review yet. They'll appear here as you start memorizing.
    </div>
    <template v-else>
      <!-- Horizontal stacked progression bar -->
      <div class="flex w-full h-6 rounded-lg overflow-hidden bg-slate-100">
        <div
          v-for="seg in visibleSegments"
          :key="seg.key"
          class="h-full transition-all duration-500"
          :style="{ width: pct(seg.count) + '%', backgroundColor: COLORS[seg.key] }"
          :title="`${seg.label}: ${seg.count}`"
        ></div>
      </div>
      <!-- Legend -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-x-3 gap-y-1.5 mt-3">
        <div v-for="seg in segments" :key="seg.key" class="flex items-center gap-1.5 text-xs">
          <span class="w-2.5 h-2.5 rounded-sm flex-shrink-0" :style="{ backgroundColor: COLORS[seg.key] }"></span>
          <span class="text-slate-600">{{ seg.label }}</span>
          <span class="font-semibold text-slate-800 ml-auto sm:ml-0">{{ seg.count }}</span>
        </div>
      </div>
      <!-- Secondary (not in the active funnel) -->
      <div v-if="notStarted > 0 || paused > 0" class="text-xs text-slate-400 mt-2">
        <span v-if="notStarted > 0">{{ notStarted }} not started yet</span>
        <span v-if="notStarted > 0 && paused > 0"> · </span>
        <span v-if="paused > 0">{{ paused }} paused</span>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { FunnelSegment } from '../../composables/useStats';

const props = defineProps<{
  segments: FunnelSegment[];
  notStarted: number;
  paused: number;
}>();

// Light blue -> deep indigo reads as "maturing toward long-term memory".
const COLORS: Record<string, string> = {
  learn: '#93c5fd',
  daily: '#3b82f6',
  weekly: '#6366f1',
  monthly: '#4338ca',
};

const total = computed(() => props.segments.reduce((s, seg) => s + seg.count, 0));
const visibleSegments = computed(() => props.segments.filter((s) => s.count > 0));
const pct = (count: number) => (total.value > 0 ? (count / total.value) * 100 : 0);
</script>
