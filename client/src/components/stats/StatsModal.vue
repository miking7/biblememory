<template>
  <Transition name="stats">
    <div v-if="show" class="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Your progress">
      <!-- Backdrop -->
      <div class="absolute inset-0 bg-slate-900/70" @click="emit('close')"></div>

      <!-- Sheet: anchored to bottom on mobile, centered card on desktop -->
      <div class="absolute inset-x-0 bottom-0 sm:inset-0 sm:flex sm:items-center sm:justify-center sm:p-4">
        <div
          ref="panel"
          tabindex="-1"
          class="stats-panel glass-card w-full sm:max-w-2xl rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[90vh] sm:max-h-[85vh] focus:outline-none"
        >
          <!-- Header -->
          <div class="flex items-center justify-between px-4 sm:px-6 pt-4 pb-3">
            <h2 class="text-lg font-bold text-slate-800">Your Progress</h2>
            <button
              type="button"
              aria-label="Close"
              class="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              @click="emit('close')"
            >
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <!-- Tabs -->
          <div class="flex px-2 sm:px-4 border-b border-slate-200/70" role="tablist">
            <button
              v-for="tab in TABS"
              :key="tab.key"
              type="button"
              role="tab"
              :aria-selected="currentTab === tab.key"
              class="flex-1 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors"
              :style="
                currentTab === tab.key
                  ? { color: tab.accent, borderBottomColor: tab.accent }
                  : { color: '#64748b', borderBottomColor: 'transparent' }
              "
              @click="currentTab = tab.key"
            >
              {{ tab.label }}
            </button>
          </div>

          <!-- Scrollable, swipeable content -->
          <div ref="swipeArea" class="overflow-y-auto px-4 sm:px-6 py-4 flex-1">
            <!-- Loading skeleton -->
            <div v-if="loading" class="space-y-3 animate-pulse">
              <div class="h-6 bg-slate-200 rounded w-1/2"></div>
              <div class="h-24 bg-slate-200 rounded"></div>
              <div class="h-16 bg-slate-200 rounded"></div>
            </div>

            <!-- ============ LIBRARY ============ -->
            <div v-else-if="currentTab === 'library'" class="space-y-5">
              <div class="flex items-end justify-between">
                <div>
                  <div class="text-3xl font-bold text-slate-800">{{ totalVerses }}</div>
                  <div class="text-xs text-slate-500">verses in your library</div>
                </div>
                <div class="text-right">
                  <div class="text-xl font-semibold text-slate-700">{{ booksTouched }}<span class="text-slate-400 text-sm">/66</span></div>
                  <div class="text-xs text-slate-500">books touched</div>
                </div>
              </div>

              <div v-if="totalVerses === 0" class="text-sm text-slate-500 py-6 text-center">
                No verses yet. Add some and watch your library take shape here.
              </div>
              <template v-else>
                <section>
                  <h3 class="text-sm font-semibold text-slate-700 mb-2">Memorization progress</h3>
                  <MaturityBar :segments="funnel" :not-started="notStarted" :paused="paused" />
                </section>

                <section>
                  <h3 class="text-sm font-semibold text-slate-700 mb-2">Library growth</h3>
                  <GrowthCurve :points="growth" />
                </section>

                <section>
                  <h3 class="text-sm font-semibold text-slate-700 mb-2">Bible coverage</h3>
                  <BibleGrid :counts="bookCoverage" :books-touched="booksTouched" />
                </section>
              </template>
            </div>

            <!-- ============ TODAY ============ -->
            <div v-else-if="currentTab === 'today'" class="space-y-5">
              <section>
                <div class="flex items-end justify-between mb-2">
                  <div>
                    <div class="text-3xl font-bold text-slate-800">{{ reviewedDistinct }}</div>
                    <div class="text-xs text-slate-500">{{ todaySubtitle }}</div>
                  </div>
                  <div class="text-right text-sm font-medium" :style="{ color: '#059669' }">{{ todayPct }}%</div>
                </div>
                <div class="w-full h-3 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    class="h-full rounded-full transition-all duration-500"
                    :style="{ width: todayPct + '%', background: 'linear-gradient(90deg,#34d399,#059669)' }"
                  ></div>
                </div>
              </section>

              <section>
                <h3 class="text-sm font-semibold text-slate-700 mb-2">Recent activity</h3>
                <div v-if="totalReviews === 0" class="text-sm text-slate-500 py-4 text-center">
                  Your daily review activity will chart here.
                </div>
                <MiniBars v-else :bars="dailyBars" />
              </section>

              <section>
                <h3 class="text-sm font-semibold text-slate-700 mb-2">Daily average</h3>
                <div v-if="totalReviews === 0" class="text-sm text-slate-500">Complete a review to see your averages.</div>
                <div v-else class="grid grid-cols-3 gap-2 text-center">
                  <div class="rounded-xl bg-slate-50 py-3">
                    <div class="text-xl font-bold text-slate-800">{{ avg7 }}</div>
                    <div class="text-[11px] text-slate-500">7-day</div>
                  </div>
                  <div class="rounded-xl bg-slate-50 py-3">
                    <div class="text-xl font-bold text-slate-800">{{ avg30 }}</div>
                    <div class="text-[11px] text-slate-500">30-day</div>
                  </div>
                  <div class="rounded-xl bg-slate-50 py-3">
                    <div class="text-xl font-bold text-slate-800">{{ avg365 }}</div>
                    <div class="text-[11px] text-slate-500">365-day</div>
                  </div>
                </div>
                <p class="text-[11px] text-slate-400 mt-1.5">Reviews per day, averaged over the days you've been active.</p>
              </section>
            </div>

            <!-- ============ CONSISTENCY ============ -->
            <div v-else class="space-y-5">
              <div class="flex items-end justify-between">
                <div>
                  <div class="text-3xl font-bold" :style="{ color: '#f59e0b' }">{{ currentStreak }}</div>
                  <div class="text-xs text-slate-500">day streak</div>
                </div>
                <div class="text-right">
                  <div class="text-xl font-semibold text-slate-700">{{ longestStreak }}</div>
                  <div class="text-xs text-slate-500">best ever</div>
                </div>
              </div>

              <div v-if="totalReviews === 0" class="text-sm text-slate-500 py-6 text-center">
                Complete a review to start building your streak — your history will appear here.
              </div>
              <template v-else>
                <section>
                  <h3 class="text-sm font-semibold text-slate-700 mb-2">Activity</h3>
                  <div v-if="totalActiveDays < 3" class="text-sm text-slate-500 py-4 text-center">
                    Your activity calendar fills in over the next few days.
                  </div>
                  <HeatmapChart v-else :cells="heatmap" />
                </section>

                <section>
                  <h3 class="text-sm font-semibold text-slate-700 mb-2">Days reviewed</h3>
                  <div class="grid grid-cols-3 gap-2 text-center">
                    <div class="rounded-xl bg-slate-50 py-3">
                      <div class="text-lg font-bold text-slate-800">{{ weekWindow.active }}<span class="text-slate-400 text-sm">/{{ weekWindow.total }}</span></div>
                      <div class="text-[11px] text-slate-500">this week</div>
                    </div>
                    <div class="rounded-xl bg-slate-50 py-3">
                      <div class="text-lg font-bold text-slate-800">{{ monthWindow.active }}<span class="text-slate-400 text-sm">/{{ monthWindow.total }}</span></div>
                      <div class="text-[11px] text-slate-500">this month</div>
                    </div>
                    <div class="rounded-xl bg-slate-50 py-3">
                      <div class="text-lg font-bold text-slate-800">{{ yearWindow.active }}<span class="text-slate-400 text-sm">/{{ yearWindow.total }}</span></div>
                      <div class="text-[11px] text-slate-500">this year</div>
                    </div>
                  </div>
                </section>

                <section>
                  <h3 class="text-sm font-semibold text-slate-700 mb-2">Streak records</h3>
                  <div
                    v-if="currentStreak > 0 && !currentInTop"
                    class="flex items-center justify-between text-sm py-1.5 px-2 rounded-lg mb-1"
                    :style="{ backgroundColor: 'rgba(245,158,11,0.1)' }"
                  >
                    <span class="font-medium text-slate-700">Current</span>
                    <span class="text-slate-600">{{ currentStreak }} day{{ currentStreak === 1 ? '' : 's' }}</span>
                  </div>
                  <ol class="space-y-1">
                    <li
                      v-for="(run, i) in topStreaks"
                      :key="i"
                      class="flex items-center justify-between text-sm py-1.5 px-2 rounded-lg"
                      :style="run.isCurrent ? { backgroundColor: 'rgba(245,158,11,0.1)' } : {}"
                    >
                      <span class="flex items-center gap-2">
                        <span class="w-5 text-slate-400 text-xs">{{ i + 1 }}.</span>
                        <span class="font-semibold text-slate-800">{{ run.length }} day{{ run.length === 1 ? '' : 's' }}</span>
                        <span v-if="run.isCurrent" class="text-[10px] font-semibold px-1.5 py-0.5 rounded" :style="{ color: '#b45309', backgroundColor: 'rgba(245,158,11,0.2)' }">CURRENT</span>
                      </span>
                      <span class="text-xs text-slate-500">{{ formatRange(run.startDate, run.endDate) }}</span>
                    </li>
                  </ol>
                </section>
              </template>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onBeforeUnmount } from 'vue';
import { useStats } from '../../composables/useStats';
import { useSwipeDetection } from '../../composables/useSwipeDetection';
import MaturityBar from './MaturityBar.vue';
import GrowthCurve from './GrowthCurve.vue';
import HeatmapChart from './HeatmapChart.vue';
import BibleGrid from './BibleGrid.vue';
import MiniBars from './MiniBars.vue';

type TabKey = 'library' | 'today' | 'consistency';

const props = defineProps<{
  show: boolean;
  initialTab?: TabKey;
  reviewTarget: number;
  // Distinct verses reviewed today — quota progress uses this, not the raw
  // event count (the daily queue loops, so repeat reviews are common)
  reviewedDistinct: number;
}>();

const emit = defineEmits<{ close: [] }>();

const TABS = [
  { key: 'library', label: 'Library', accent: '#2563eb' },
  { key: 'today', label: 'Today', accent: '#059669' },
  { key: 'consistency', label: 'Consistency', accent: '#f59e0b' },
] as const;

const currentTab = ref<TabKey>('today');
const panel = ref<HTMLElement | null>(null);
const swipeArea = ref<HTMLElement | null>(null);
let previouslyFocused: HTMLElement | null = null;

const {
  loading,
  load,
  totalVerses,
  totalReviews,
  totalActiveDays,
  currentStreak,
  longestStreak,
  topStreaks,
  heatmap,
  weekWindow,
  monthWindow,
  yearWindow,
  avg7,
  avg30,
  avg365,
  dailyBars,
  funnel,
  notStarted,
  paused,
  growth,
  bookCoverage,
  booksTouched,
} = useStats();

// --- Tab navigation (tap + swipe) ---
const currentIndex = computed(() => TABS.findIndex((t) => t.key === currentTab.value));
const goTo = (i: number) => {
  if (i >= 0 && i < TABS.length) currentTab.value = TABS[i].key;
};
useSwipeDetection(swipeArea, {
  onSwipeLeft: () => goTo(currentIndex.value + 1),
  onSwipeRight: () => goTo(currentIndex.value - 1),
  canSwipeLeft: () => currentIndex.value < TABS.length - 1,
  canSwipeRight: () => currentIndex.value > 0,
});

// --- Today progress (distinct verses vs quota target) ---
const todayPct = computed(() => {
  const t = props.reviewTarget;
  if (t > 0) return Math.min(100, Math.round((props.reviewedDistinct / t) * 100));
  return props.reviewedDistinct > 0 ? 100 : 0;
});
const todaySubtitle = computed(() => {
  const t = props.reviewTarget;
  if (t > 0) return `of ${t} due reviewed`;
  if (props.reviewedDistinct > 0) return 'reviewed — all caught up';
  return 'nothing due today';
});

const currentInTop = computed(() => topStreaks.value.some((s) => s.isCurrent));

// --- Formatting ---
const fmtDay = (s: string) =>
  s ? new Date(s + 'T00:00:00').toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) : '';
const formatRange = (start: string, end: string) =>
  start === end ? fmtDay(start) : `${fmtDay(start)}–${fmtDay(end)}`;

// --- a11y: escape, focus trap, scroll lock; lazy load on open ---
const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

const onKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    event.preventDefault();
    emit('close');
    return;
  }
  if (event.key !== 'Tab' || !panel.value) return;
  const focusable = Array.from(panel.value.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => el.offsetParent !== null
  );
  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  const active = document.activeElement as HTMLElement | null;
  if (event.shiftKey) {
    if (active === first || !panel.value.contains(active)) {
      event.preventDefault();
      last.focus();
    }
  } else if (active === last || !panel.value.contains(active)) {
    event.preventDefault();
    first.focus();
  }
};

const teardown = () => {
  document.body.style.overflow = '';
  document.removeEventListener('keydown', onKeydown);
};

watch(
  () => props.show,
  async (open) => {
    if (open) {
      previouslyFocused = document.activeElement as HTMLElement | null;
      currentTab.value = props.initialTab ?? 'today';
      document.body.style.overflow = 'hidden';
      document.addEventListener('keydown', onKeydown);
      await load();
      await nextTick();
      panel.value?.focus();
    } else {
      teardown();
      previouslyFocused?.focus();
      previouslyFocused = null;
    }
  }
);

onBeforeUnmount(teardown);
</script>

<style>
/* Overlay fade + sheet slide-up (non-scoped so the descendant selector works) */
.stats-enter-active,
.stats-leave-active {
  transition: opacity 0.2s ease;
}
.stats-enter-from,
.stats-leave-to {
  opacity: 0;
}
.stats-enter-active .stats-panel {
  transition: transform 0.25s ease;
}
.stats-enter-from .stats-panel {
  transform: translateY(24px);
}
@media (prefers-reduced-motion: reduce) {
  .stats-enter-active,
  .stats-leave-active,
  .stats-enter-active .stats-panel {
    transition: none;
  }
}
</style>
