<template>
  <span
    :class="[
      'px-2 py-1 rounded text-xs font-medium',
      isManual
        ? 'bg-blue-400 text-white'
        : 'bg-blue-50 text-blue-600'
    ]"
    v-text="category"
  ></span>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Verse } from '../db';
import { getEffectiveReviewCategory } from '../actions';

const props = defineProps<{
  verse: Verse;
}>();

const effectiveCategory = computed(() => getEffectiveReviewCategory(props.verse));

const category = computed(() => effectiveCategory.value.category);
const isManual = computed(() => effectiveCategory.value.isManual);
</script>
