<template>
  <div>
    <div ref="scroller" class="overflow-x-auto pb-1">
      <div class="flex gap-[3px] w-max">
        <div v-for="(col, ci) in columns" :key="ci" class="flex flex-col gap-[3px]">
          <div
            v-for="row in 7"
            :key="row"
            class="w-[11px] h-[11px] rounded-[2px]"
            :style="cellStyle(col[row - 1])"
            :title="col[row - 1] ? `${col[row - 1]!.date}: ${col[row - 1]!.count} review${col[row - 1]!.count === 1 ? '' : 's'}` : ''"
          ></div>
        </div>
      </div>
    </div>
    <div class="flex items-center justify-end gap-1.5 mt-2 text-[11px] text-slate-400">
      <span>Less</span>
      <span v-for="lvl in 5" :key="lvl" class="w-[11px] h-[11px] rounded-[2px]" :style="{ backgroundColor: LEVELS[lvl - 1] }"></span>
      <span>More</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, watch, nextTick } from 'vue';
import type { HeatCell } from '../../composables/useStats';

const props = defineProps<{ cells: HeatCell[] }>();

// Warm amber/orange family to match the streak tile theme.
const LEVELS = ['#f1f5f9', '#fde68a', '#fcd34d', '#fb923c', '#f97316'];

const scroller = ref<HTMLElement | null>(null);

// Lay cells (oldest -> newest) into week columns; first column is padded so
// each row corresponds to a fixed weekday (row 0 = Sunday).
const columns = computed<(HeatCell | null)[][]>(() => {
  const cells = props.cells;
  if (!cells.length) return [];
  const firstDow = cells[0].dow;
  const cols: (HeatCell | null)[][] = [];
  cells.forEach((cell, i) => {
    const pos = i + firstDow;
    const col = Math.floor(pos / 7);
    const row = pos % 7;
    if (!cols[col]) cols[col] = [null, null, null, null, null, null, null];
    cols[col][row] = cell;
  });
  return cols;
});

const cellStyle = (cell: HeatCell | null) => ({
  backgroundColor: cell ? LEVELS[cell.level] : 'transparent',
});

const scrollToEnd = async () => {
  await nextTick();
  if (scroller.value) scroller.value.scrollLeft = scroller.value.scrollWidth;
};

onMounted(scrollToEnd);
watch(() => props.cells, scrollToEnd);
</script>
