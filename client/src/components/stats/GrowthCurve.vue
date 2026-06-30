<template>
  <div>
    <div v-if="points.length < 2" class="text-sm text-slate-500 py-6 text-center">
      Your library growth will chart here as you add more verses.
    </div>
    <template v-else>
      <svg :viewBox="`0 0 ${W} ${H}`" class="w-full" :style="{ height: H + 'px' }" preserveAspectRatio="none">
        <!-- Faint gridline at each time tick -->
        <line
          v-for="(t, i) in ticks"
          :key="'g' + i"
          :x1="gridX(t.frac)"
          :x2="gridX(t.frac)"
          :y1="PAD"
          :y2="H - PAD"
          stroke="#e2e8f0"
          stroke-width="1"
          vector-effect="non-scaling-stroke"
        />
        <path :d="areaPath" :fill="FILL" />
        <path :d="linePath" fill="none" :stroke="STROKE" stroke-width="2" stroke-linejoin="round" vector-effect="non-scaling-stroke" />
      </svg>
      <!-- Adaptive time axis (years for long spans, months/days for shorter) -->
      <div class="relative h-4 mt-1 text-xs text-slate-500">
        <span v-for="(t, i) in ticks" :key="i" class="absolute whitespace-nowrap" :style="labelStyle(t)">{{ t.label }}</span>
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
const DAY_MS = 24 * 60 * 60 * 1000;
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

interface Tick {
  frac: number;
  label: string;
}

// 4 evenly-spaced ticks, formatted by span: full year (>3yr), month+year
// (>3mo), else day+month. Unambiguous years avoid the old "Apr 10" confusion.
const ticks = computed<Tick[]>(() => {
  const a = minT.value;
  const span = Math.max(1, maxT.value - a);
  const days = span / DAY_MS;
  const fmt = (t: number): string => {
    const d = new Date(t);
    if (days > 1095) return String(d.getFullYear());
    if (days > 90) return `${d.toLocaleDateString(undefined, { month: 'short' })} '${String(d.getFullYear()).slice(-2)}`;
    return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
  };
  const N = 4;
  const out: Tick[] = [];
  for (let i = 0; i < N; i++) {
    const frac = i / (N - 1);
    out.push({ frac, label: fmt(a + frac * span) });
  }
  // Drop a tick that repeats the previous label (can happen on short spans).
  return out.filter((t, i) => i === 0 || t.label !== out[i - 1].label);
});

const gridX = (frac: number) => PAD + frac * (W - PAD * 2);

const labelStyle = (t: Tick) => {
  const leftPct = (PAD / W + t.frac * (1 - (PAD * 2) / W)) * 100;
  let transform = 'translateX(-50%)';
  if (t.frac <= 0.001) transform = 'translateX(0)';
  else if (t.frac >= 0.999) transform = 'translateX(-100%)';
  return { left: `${leftPct}%`, transform };
};
</script>
