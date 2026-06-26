<template>
  <!-- Review Mode Buttons (Outside overflow-hidden for sticky positioning) -->
  <div class="container mx-auto px-4 max-w-5xl">
    <!-- Desktop: Mode buttons row + Action buttons row below -->
    <div class="hidden sm:flex flex-col gap-3 sm:mt-6">
      <!-- Mode Buttons Row -->
      <div class="flex gap-3 justify-center">
        <button
          @click="$emit('switchToTypeIt')"
          :class="reviewMode === 'typeit' ? 'mode-button-active' : 'mode-button-inactive'"
          class="px-5 py-2.5 rounded-lg font-medium transition-all flex items-center gap-2"
          title="Type It (t) - Coming Soon">
          <i class="mdi mdi-keyboard-outline text-lg"></i>
          <span>Type It</span>
        </button>

        <!-- Flash Cards with +/- buttons (fused when active) -->
        <div v-if="reviewMode === 'flashcards'" class="flashcard-group-active flex gap-0 rounded-lg">
          <button
            @click="$emit('decreaseFlashCardDifficulty')"
            :disabled="!canDecreaseFlashCardDifficulty"
            :title="canDecreaseFlashCardDifficulty ? 'Decrease difficulty' : 'Already at easiest'"
            class="flashcard-sub-button-in-group rounded-l-lg"
            :class="canDecreaseFlashCardDifficulty ? 'flashcard-sub-button-enabled' : 'flashcard-sub-button-disabled'">
            −
          </button>
          <button
            @click="$emit('switchToFlashCards')"
            :title="flashCardLevelName"
            class="flashcard-main-active px-2 py-2.5 font-medium transition-all flex items-center gap-2">
            <i class="mdi mdi-cards-outline text-lg"></i>
            <span>Flash Cards</span>
          </button>
          <button
            @click="$emit('increaseFlashCardDifficulty')"
            :disabled="!canIncreaseFlashCardDifficulty"
            :title="canIncreaseFlashCardDifficulty ? 'Increase difficulty' : 'Already at hardest'"
            class="flashcard-sub-button-in-group rounded-r-lg"
            :class="canIncreaseFlashCardDifficulty ? 'flashcard-sub-button-enabled' : 'flashcard-sub-button-disabled'">
            +
          </button>
        </div>
        <button
          v-else
          @click="$emit('switchToFlashCards')"
          class="mode-button-inactive px-5 py-2.5 rounded-lg font-medium transition-all flex items-center gap-2"
          title="Flash Cards (c)">
          <i class="mdi mdi-cards-outline text-lg"></i>
          <span>Flash Cards</span>
        </button>

        <button
          @click="reviewMode === 'hints' ? $emit('addHint') : $emit('switchToHints')"
          :class="reviewMode === 'hints' ? 'mode-button-active' : 'mode-button-inactive'"
          class="px-5 py-2.5 rounded-lg font-medium transition-all flex items-center gap-2"
          title="Hint (h)">
          <i class="mdi mdi mdi-help text-lg"></i>
          <span>Hint</span>
        </button>

        <button
          @click="$emit('switchToFirstLetters')"
          :class="reviewMode === 'firstletters' ? 'mode-button-active' : 'mode-button-inactive'"
          class="px-5 py-2.5 rounded-lg font-medium transition-all flex items-center gap-2"
          title="First Letters (f)">
          <i class="mdi mdi-alphabet-latin text-lg"></i>
          <span>First Letters</span>
        </button>

        <button
          @click="$emit('switchToContent')"
          :class="reviewMode === 'content' ? 'mode-button-active' : 'mode-button-inactive'"
          class="px-5 py-2.5 rounded-lg font-medium transition-all flex items-center gap-2"
          title="Reveal verse (Space)">
          <i class="mdi mdi-text-long text-lg"></i>
          <span>Reveal</span>
        </button>
      </div>

      <!-- Action Buttons Row (Desktop) - Always visible, disabled until verse revealed -->
      <div class="flex gap-3 justify-center">
        <button
          @click="$emit('again')"
          :disabled="reviewMode !== 'content'"
          class="action-button-again px-6 py-2.5 rounded-lg font-medium transition-all flex items-center gap-2"
          :title="reviewMode === 'content' ? 'Need more practice (a)' : 'Available after revealing verse'">
          <i class="mdi mdi-refresh text-lg"></i>
          <span>Again</span>
        </button>
        <button
          @click="$emit('gotIt')"
          :disabled="reviewMode !== 'content'"
          class="action-button-gotit px-6 py-2.5 rounded-lg font-medium transition-all flex items-center gap-2"
          :title="reviewMode === 'content' ? 'I remembered it! (g)' : 'Available after revealing verse'">
          <i class="mdi mdi-check text-lg"></i>
          <span>Got it!</span>
        </button>
      </div>
    </div>

    <!-- Mobile: Sticky footer with action buttons above mode buttons -->
    <div class="sm:hidden flex flex-col gap-3 fixed bottom-0 left-0 right-0 z-20 bg-white/95 backdrop-blur-sm border-t border-slate-200 shadow-lg px-3 py-4 review-mode-sticky-footer">
      <!-- Action Buttons Row (Mobile) - Always visible, disabled until verse revealed -->
      <div class="flex gap-3">
        <button
          @click="$emit('again')"
          :disabled="reviewMode !== 'content'"
          class="action-button-again flex-1 py-2.5 rounded-lg font-medium transition-all text-sm flex items-center justify-center gap-2"
          :title="reviewMode === 'content' ? 'Need more practice (a)' : 'Available after revealing verse'">
          <i class="mdi mdi-refresh text-lg"></i>
          <span>Again</span>
        </button>
        <button
          @click="$emit('switchToContent')"
          :class="reviewMode === 'content' ? 'mode-button-active' : 'mode-button-inactive'"
          class="py-2.5 rounded-lg font-medium transition-all flex items-center justify-center"
          style="min-width: 3rem;"
          title="Reveal verse (Space)"
          aria-label="Reveal">
          <i class="mdi mdi-text-long text-xl"></i>
        </button>
        <button
          @click="$emit('gotIt')"
          :disabled="reviewMode !== 'content'"
          class="action-button-gotit flex-1 py-2.5 rounded-lg font-medium transition-all text-sm flex items-center justify-center gap-2"
          :title="reviewMode === 'content' ? 'I remembered it! (g)' : 'Available after revealing verse'">
          <i class="mdi mdi-check text-lg"></i>
          <span>Got it!</span>
        </button>
      </div>

      <!-- Mode Buttons Row (Mobile) - Icons only, all 4 on one row -->
      <div class="flex gap-2">
        <button
          @click="$emit('switchToTypeIt')"
          :class="reviewMode === 'typeit' ? 'mode-button-active' : 'mode-button-inactive'"
          class="flex-1 py-2.5 rounded-lg font-medium transition-all flex items-center justify-center"
          title="Type It (t) - Coming Soon"
          aria-label="Type It">
          <i class="mdi mdi-keyboard-outline text-xl"></i>
        </button>

        <!-- Flash Cards with +/- buttons (fused when active) -->
        <div v-if="reviewMode === 'flashcards'" class="flashcard-group-active flex-1 flex gap-0 rounded-lg">
          <button
            @click="$emit('decreaseFlashCardDifficulty')"
            :disabled="!canDecreaseFlashCardDifficulty"
            class="flashcard-sub-button-in-group rounded-l-lg px-2"
            :class="canDecreaseFlashCardDifficulty ? 'flashcard-sub-button-enabled' : 'flashcard-sub-button-disabled'"
            aria-label="Decrease difficulty">
            −
          </button>
          <button
            @click="$emit('switchToFlashCards')"
            class="flashcard-main-active flex-1 py-2.5 font-medium transition-all flex items-center justify-center"
            aria-label="Flash Cards">
            <i class="mdi mdi-cards-outline text-xl"></i>
          </button>
          <button
            @click="$emit('increaseFlashCardDifficulty')"
            :disabled="!canIncreaseFlashCardDifficulty"
            class="flashcard-sub-button-in-group rounded-r-lg px-2"
            :class="canIncreaseFlashCardDifficulty ? 'flashcard-sub-button-enabled' : 'flashcard-sub-button-disabled'"
            aria-label="Increase difficulty">
            +
          </button>
        </div>
        <button
          v-else
          @click="$emit('switchToFlashCards')"
          class="mode-button-inactive flex-1 py-2.5 rounded-lg font-medium transition-all flex items-center justify-center"
          title="Flash Cards (c)"
          aria-label="Flash Cards">
          <i class="mdi mdi-cards-outline text-xl"></i>
        </button>

        <button
          @click="reviewMode === 'hints' ? $emit('addHint') : $emit('switchToHints')"
          :class="reviewMode === 'hints' ? 'mode-button-active' : 'mode-button-inactive'"
          class="flex-1 py-2.5 rounded-lg font-medium transition-all flex items-center justify-center"
          title="Hint (h)"
          aria-label="Hint">
          <i class="mdi mdi mdi-help text-xl"></i>
        </button>

        <button
          @click="$emit('switchToFirstLetters')"
          :class="reviewMode === 'firstletters' ? 'mode-button-active' : 'mode-button-inactive'"
          class="flex-1 py-2.5 rounded-lg font-medium transition-all flex items-center justify-center"
          title="First Letters (f)"
          aria-label="First Letters">
          <i class="mdi mdi-alphabet-latin text-xl"></i>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  reviewMode: 'reference' | 'content' | 'hints' | 'firstletters' | 'flashcards' | 'typeit'
  canIncreaseFlashCardDifficulty: boolean
  canDecreaseFlashCardDifficulty: boolean
  flashCardLevelName: string
}>()

defineEmits<{
  switchToTypeIt: []
  switchToFlashCards: []
  switchToHints: []
  switchToFirstLetters: []
  switchToContent: []
  increaseFlashCardDifficulty: []
  decreaseFlashCardDifficulty: []
  addHint: []
  again: []
  gotIt: []
}>()
</script>
