<template>
  <div>
    <div class="space-y-3">
      <div v-for="section in sections" :key="section.label">
        <div class="text-xs font-medium text-slate-500 mb-1.5">{{ section.label }}</div>
        <div class="flex flex-wrap gap-[3px]">
          <button
            v-for="book in section.books"
            :key="book.num"
            type="button"
            class="w-[18px] h-[18px] rounded-[3px] focus:outline-none focus:ring-2 focus:ring-blue-400"
            :class="selected === book.num ? 'ring-2 ring-blue-500' : ''"
            :style="{ backgroundColor: LEVELS[level(counts[book.num] || 0)] }"
            :title="`${book.name} — ${counts[book.num] || 0} verse${(counts[book.num] || 0) === 1 ? '' : 's'}`"
            @click="select(book.num)"
          ></button>
        </div>
      </div>
    </div>

    <div class="flex items-center justify-between mt-3 text-xs">
      <span class="text-slate-500">{{ booksTouched }} of 66 books</span>
      <span v-if="selected" class="font-medium text-slate-700">
        {{ selectedName }} · {{ counts[selected] || 0 }} verse{{ (counts[selected] || 0) === 1 ? '' : 's' }}
      </span>
      <span v-else class="text-slate-400">Tap a book</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { OT_BOOKS, NT_BOOKS, BIBLE_BOOKS } from '../../utils/bibleBooks';

const props = defineProps<{
  counts: number[]; // index 1..66
  booksTouched: number;
}>();

// Light -> deep blue to match the "Total Verses" / Library theme.
const LEVELS = ['#f1f5f9', '#bfdbfe', '#93c5fd', '#60a5fa', '#2563eb'];

const sections = [
  { label: 'Old Testament', books: OT_BOOKS },
  { label: 'New Testament', books: NT_BOOKS },
];

const selected = ref<number | null>(null);
const select = (num: number) => {
  selected.value = selected.value === num ? null : num;
};
const selectedName = computed(() =>
  selected.value ? BIBLE_BOOKS.find((b) => b.num === selected.value)?.name ?? '' : ''
);

const level = (count: number): number => {
  if (count <= 0) return 0;
  if (count === 1) return 1;
  if (count <= 3) return 2;
  if (count <= 6) return 3;
  return 4;
};
</script>
