<template>
  <div>
    <div v-if="points.length < 2" class="text-sm text-slate-500 py-6 text-center">
      Your library growth will chart here as you add more verses.
    </div>
    <template v-else>
      <svg :viewBox="`0 0 ${W} ${H}`" class="w-full" :style="{ height: H + 'px' }" preserveAspectRatio="none">
        <path :d="areaPath" :fill="FILL" />
        <path :d="linePath" :fill="'none'" :stroke="STROKE" stroke-width="2" stroke-linejoin="round" vector-effect="non-scaling-stroke" />
      </svg>
      <div class="flex justify-between text-xs text-slate-500 mt-1">
        <span>{{ startLabel }}</span>
        <span class="font-semibold text-slate-700">{{ maxN }} verses</span>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { GrowthPoint } from '../../composables/useStats';

const props = defineProps<{ points: GrowthPoint[] }>();

const W = 320;
const H = 90;
const PAD = 4;
const STROKE = '#2563eb';
const FILL = 'rgba(37, 99, 235, 0.12)';

const minT = computed(() => props.points[0]?.t ?? 0);
const maxT = computed(() => props.points[props.points.length - 1]?.t ?? 1);
const maxN = computed(() => props.points.reduce((m, p) => Math.max(m, p.n), 0));

const xy = computed(() => {
  const tRange = Math.max(1, maxT.value - minT.value);
  const nRange = Math.max(1, maxN.value);
  return props.points.map((p) => {
    const x = ((p.t - minT.value) / tRange) * (W - PAD * 2) + PAD;
    const y = H - PAD - (p.n / nRange) * (H - PAD * 2);
    return { x, y };
  });
});

const linePath = computed(() =>
  xy.value.map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`).join(' ')
);

const areaPath = computed(() => {
  const pts = xy.value;
  if (!pts.length) return '';
  const first = pts[0];
  const last = pts[pts.length - 1];
  return `${linePath.value} L ${last.x.toFixed(1)} ${H - PAD} L ${first.x.toFixed(1)} ${H - PAD} Z`;
});

const startLabel = computed(() =>
  new Date(minT.value).toLocaleDateString(undefined, { month: 'short', year: '2-digit' })
);
</script>
