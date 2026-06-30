<template>
  <div>
    <div class="flex items-end gap-[2px] h-16">
      <div
        v-for="bar in bars"
        :key="bar.date"
        class="flex-1 rounded-t-sm transition-all duration-300"
        :style="{
          height: barHeight(bar.count),
          backgroundColor: bar.isToday ? TODAY : NORMAL,
          minWidth: '3px',
        }"
        :title="`${bar.date}: ${bar.count} review${bar.count === 1 ? '' : 's'}`"
      ></div>
    </div>
    <div class="flex justify-between text-[11px] text-slate-400 mt-1">
      <span>{{ bars.length - 1 }} days ago</span>
      <span>Today</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { DayBar } from '../../composables/useStats';

const props = defineProps<{ bars: DayBar[] }>();

const NORMAL = '#34d399'; // emerald-400
const TODAY = '#059669'; // emerald-600

const max = computed(() => Math.max(1, ...props.bars.map((b) => b.count)));

// Zero-review days still show a faint stub so the timeline reads as continuous.
const barHeight = (count: number): string => {
  if (count <= 0) return '2px';
  return `${Math.max(8, (count / max.value) * 100)}%`;
};
</script>
