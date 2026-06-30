<template>
  <div ref="wrapper">
    <!-- Month labels for at-a-glance time orientation -->
    <div class="relative h-4 mb-1 text-[11px] text-slate-400">
      <span v-for="(m, i) in monthMarks" :key="i" class="absolute whitespace-nowrap" :style="{ left: m.x + 'px' }">{{ m.label }}</span>
    </div>

    <!-- Grid: most-recent weeks that fit the width, current week at the right -->
    <div class="flex gap-[3px]" role="img" aria-label="Daily review activity calendar" @mouseleave="hovered = null">
      <div v-for="(col, ci) in visibleColumns" :key="ci" class="flex flex-col gap-[3px]">
        <div
          v-for="row in 7"
          :key="row"
          class="w-[11px] h-[11px] rounded-[2px]"
          :class="col[row - 1] ? 'cursor-pointer' : ''"
          :style="cellStyle(col[row - 1])"
          @mouseenter="onEnter(col[row - 1])"
          @click="onClick(col[row - 1])"
        ></div>
      </div>
    </div>

    <!-- Selected-day readout (reliable on mobile + desktop) + legend -->
    <div class="flex items-center justify-between gap-2 mt-2 text-[11px]">
      <span v-if="info" class="text-slate-600 font-medium truncate">{{ infoLabel }}</span>
      <span v-else class="text-slate-400">Tap a day for details</span>
      <span class="flex items-center gap-1.5 text-slate-400 flex-shrink-0">
        <span>Less</span>
        <span v-for="lvl in 5" :key="lvl" class="w-[11px] h-[11px] rounded-[2px]" :style="{ backgroundColor: LEVELS[lvl - 1] }"></span>
        <span>More</span>
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onBeforeUnmount } from 'vue';
import type { HeatCell } from '../../composables/useStats';

const props = defineProps<{ cells: HeatCell[] }>();

// Warm amber/orange family to match the streak tile theme.
const LEVELS = ['#f1f5f9', '#fde68a', '#fcd34d', '#fb923c', '#f97316'];
const CELL = 11;
const GAP = 3;
const STEP = CELL + GAP; // 14px per week column

// --- Responsive width: show as many recent weeks as fit (no horizontal scroll,
// which would otherwise fight the swipe-to-change-tab gesture) ---
const wrapper = ref<HTMLElement | null>(null);
const containerWidth = ref(300);
let ro: ResizeObserver | null = null;

onMounted(() => {
  if (wrapper.value) {
    containerWidth.value = wrapper.value.clientWidth || 300;
    ro = new ResizeObserver((entries) => {
      containerWidth.value = entries[0].contentRect.width;
    });
    ro.observe(wrapper.value);
  }
});
onBeforeUnmount(() => ro?.disconnect());

// Lay cells (oldest -> newest) into week columns; row 0 = Sunday.
const allColumns = computed<(HeatCell | null)[][]>(() => {
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

const maxWeeks = computed(() => Math.max(1, Math.floor((containerWidth.value + GAP) / STEP)));
const visibleColumns = computed(() => allColumns.value.slice(-maxWeeks.value));

// Month label at each column where the month changes.
const monthMarks = computed(() => {
  const marks: { x: number; label: string }[] = [];
  let prevMonth = -1;
  visibleColumns.value.forEach((col, i) => {
    const cell = col.find((c): c is HeatCell => c !== null);
    if (!cell) return;
    const d = new Date(cell.date + 'T00:00:00');
    const m = d.getMonth();
    if (m !== prevMonth) {
      prevMonth = m;
      const x = i * STEP;
      // Skip a label that would crowd the previous one (partial month at the edge).
      if (!marks.length || x - marks[marks.length - 1].x >= 24) {
        marks.push({ x, label: d.toLocaleDateString(undefined, { month: 'short' }) });
      }
    }
  });
  return marks;
});

// Hover (desktop) previews; click/tap (mobile) pins. Display prefers hover.
const hovered = ref<HeatCell | null>(null);
const selected = ref<HeatCell | null>(null);
const info = computed(() => hovered.value ?? selected.value);

const onEnter = (cell: HeatCell | null) => {
  if (cell) hovered.value = cell;
};
const onClick = (cell: HeatCell | null) => {
  if (cell) selected.value = cell;
};

const cellStyle = (cell: HeatCell | null) => ({
  backgroundColor: cell ? LEVELS[cell.level] : 'transparent',
  boxShadow: cell && info.value && cell.date === info.value.date ? '0 0 0 2px #475569' : undefined,
});

const infoLabel = computed(() => {
  const c = info.value;
  if (!c) return '';
  const d = new Date(c.date + 'T00:00:00').toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  const r = c.count === 0 ? 'no reviews' : `${c.count} review${c.count === 1 ? '' : 's'}`;
  return `${d} · ${r}`;
});
</script>
