<template>
  <!-- Review Tab Content -->
  <div class="p-3 sm:p-8">
    <!-- Outer transition sequences the empty / review / completion blocks
         (mode="out-in": the review block — card included — fully slides out
         before the completion screen slides in, and vice versa). -->
    <Transition
      :name="blockTransition"
      mode="out-in"
      @before-leave="onCardLeaveStart"
      @after-leave="onCardLeaveDone">

      <div v-if="totalReviewCount === 0" key="empty" class="text-center py-16">
        <div class="text-5xl sm:text-7xl mb-4">🎉</div>
        <p class="text-xl sm:text-2xl text-slate-700 mb-2 font-semibold">All caught up!</p>
        <p class="text-slate-500 text-lg">No verses due for review today.</p>
      </div>

      <div v-else-if="!reviewComplete" key="review">
        <!-- Header: Title + Back Button (filtered mode) + Immersive Toggle -->
        <div v-show="!isImmersiveModeActive" class="flex justify-between items-center mb-6">
          <div class="flex items-center gap-3">
            <h2 class="text-2xl sm:text-3xl font-bold text-slate-800">
              {{ reviewSource === 'filtered' ? 'Filtered Review' : 'Daily Review' }}
            </h2>
            <button
              v-if="reviewSource === 'filtered'"
              @click="$emit('returnToDailyReview')"
              class="text-blue-600 hover:text-blue-800 text-sm font-medium hover:bg-blue-50 px-3 py-1 rounded transition-all flex items-center gap-1">
              <i class="mdi mdi-arrow-left"></i>
              <span>back</span>
            </button>
          </div>

          <button
            @click="$emit('toggleImmersiveMode')"
            title="Immersive mode (i)"
            class="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all">
            <i class="mdi mdi-fullscreen text-2xl"></i>
          </button>
        </div>

        <template v-if="currentReviewVerse">
          <!-- Card Container with Navigation Arrows -->
          <div class="relative">
            <!-- Left Arrow (Previous) -->
            <button
              @click="$emit('navigate', { direction: 'previous' })"
              :disabled="currentReviewIndex === 0 || isNavigating"
              class="no-zoom absolute left-0 top-1/2 -translate-y-1/2 -translate-x-3 sm:-translate-x-4 z-10 w-10 h-10 rounded-full bg-white/60 border-2 border-slate-300 shadow-lg flex items-center justify-center text-slate-700 hover:bg-white hover:scale-110 transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:scale-100"
              title="Previous verse (p)">
              <i class="mdi mdi-chevron-left text-2xl"></i>
            </button>

            <!-- Right Arrow (Next) -->
            <button
              @click="$emit('navigate', { direction: 'next' })"
              :disabled="currentReviewIndex >= totalReviewCount - 1 || isNavigating"
              class="no-zoom absolute right-0 top-1/2 -translate-y-1/2 translate-x-3 sm:translate-x-4 z-10 w-10 h-10 rounded-full bg-white/60 border-2 border-slate-300 shadow-lg flex items-center justify-center text-slate-700 hover:bg-white hover:scale-110 transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:scale-100"
              title="Next verse (n)">
              <i class="mdi mdi-chevron-right text-2xl"></i>
            </button>

            <!-- Exit Button (X) - Only visible in immersive mode -->
            <button
              v-show="isImmersiveModeActive"
              @click.stop="$emit('exitImmersiveMode')"
              class="no-zoom absolute top-0 left-0 -translate-y-2.5 -translate-x-2.5 w-10 h-10 rounded-full bg-white/60 border-2 border-slate-300 shadow-lg hover:bg-slate-200 text-slate-600 hover:text-slate-800 flex items-center justify-center transition-all z-10"
              title="Exit immersive mode (Esc)">
              <i class="mdi mdi-close text-xl"></i>
            </button>

            <!-- Inner transition swaps cards, keyed by verse. Vue owns the
                 enter/leave lifecycle, so there is no hand-rolled visibility
                 state to strand. Swipe drags bind an inline transform; on a
                 successful release the leaving card starts from the dragged
                 offset via the --swipe-x custom property (see styles.css). -->
            <Transition
              :name="blockTransition"
              mode="out-in"
              @before-leave="onCardLeaveStart"
              @after-leave="onCardLeaveDone">
              <div :key="currentReviewVerse.id"
                   ref="cardElement"
                   class="review-card rounded-xl p-6 sm:p-8 min-h-[400px] flex flex-col justify-between bg-white border-2 border-slate-300 relative mb-200 sm:mb-0"
                   :class="{
                     'review-card-gotit': currentVerseReviewStatus?.lastReviewType === 'recall',
                     'review-card-again': currentVerseReviewStatus?.lastReviewType === 'practice',
                     'review-card-inactive': !currentVerseReviewStatus?.lastReviewType && isCurrentVerseInactive
                   }"
                   :style="cardStyle"
                   @click="$emit('cardClick')">

              <!-- Header: Reference, Translation, and Edit Icon -->
              <div class="mb-3">
                <div class="flex justify-between items-start">
                  <div class="flex flex-wrap items-center gap-2">
                    <!-- Flash Cards Mode: Reference with potential hiding -->
                    <h3 v-if="reviewMode === 'flashcards'" class="font-bold text-lg sm:text-xl text-slate-800">
                      <template v-for="(word, index) in referenceWords" :key="'ref-' + index">
                        <br v-if="word.str === '\n'">
                        <span
                          v-else-if="flashcardHiddenWords.has(index)"
                          @click.stop="$emit('revealWord', index)"
                          :class="[
                            'flashcard-underline',
                            flashcardRevealedWords.has(index) ? 'text-red-600 cursor-default' : 'cursor-pointer'
                          ]"
                          :style="flashcardRevealedWords.has(index) ? '' : 'color: transparent;'">
                          {{ word.str }}
                        </span>
                        <span v-else>{{ word.str }}</span>
                      </template>
                    </h3>
                    <!-- All Other Modes: Normal reference display -->
                    <h3 v-else class="font-bold text-lg sm:text-xl text-slate-800" v-text="currentReviewVerse.reference"></h3>

                    <span v-show="currentReviewVerse.translation"
                          class="text-xs text-slate-500 font-medium px-2 py-1 bg-slate-100 rounded"
                          v-text="currentReviewVerse.translation"></span>
                  </div>

                  <!-- Overflow Menu (Top Right) -->
                  <div class="relative" v-click-outside="() => showReviewCardMenu = false">
                    <button
                      @click.stop="showReviewCardMenu = !showReviewCardMenu"
                      class="px-2 py-1 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                      title="Options">
                      <i class="mdi mdi-dots-vertical text-xl"></i>
                    </button>

                    <!-- Dropdown Menu -->
                    <div v-show="showReviewCardMenu"
                         class="absolute right-0 mt-2 glass-card rounded-xl shadow-2xl overflow-hidden z-50 min-w-[160px]">
                      <button
                        @click.stop="$emit('copyVerse', currentReviewVerse); showReviewCardMenu = false"
                        class="w-full px-4 py-3 text-left text-sm font-medium text-slate-700 hover:bg-slate-50 transition-all flex items-center gap-2 border-b border-slate-100">
                        <i class="mdi mdi-content-copy text-lg"></i>
                        <span>Copy</span>
                      </button>
                      <button
                        @click.stop="$emit('viewOnline', currentReviewVerse); showReviewCardMenu = false"
                        class="w-full px-4 py-3 text-left text-sm font-medium text-slate-700 hover:bg-slate-50 transition-all flex items-center gap-2">
                        <i class="mdi mdi-open-in-new text-lg"></i>
                        <span>View online</span>
                      </button>
                      <button
                        @click.stop="$emit('editVerse', currentReviewVerse); showReviewCardMenu = false"
                        class="w-full px-4 py-3 text-left text-sm font-medium text-slate-700 hover:bg-slate-50 transition-all flex items-center gap-2 border-b border-slate-100">
                        <i class="mdi mdi-pencil text-lg"></i>
                        <span>Edit</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Content Area - Changes based on mode -->
              <div class="flex-1">

                <!-- Reference Mode: Show only reference, wait for reveal -->
                <div v-if="reviewMode === 'reference'">
                  <p class="text-slate-500 mb-6 italic">Try to recall the verse...</p>
                </div>

                <!-- Content Mode: Show full verse -->
                <div v-if="reviewMode === 'content'">
                  <p class="verse-content text-sm sm:text-base text-slate-800 leading-relaxed" v-text="currentReviewVerse.content"></p>
                </div>

                <!-- Hints Mode: Progressive word revelation -->
                <div v-if="reviewMode === 'hints'" @click="$emit('addHint')" class="cursor-pointer">
                  <p class="verse-content text-sm sm:text-base text-slate-800 leading-relaxed font-mono"
                     v-text="getHintedContent(currentReviewVerse.content, hintsShown)"></p>
                </div>

                <!-- First Letters Mode: First letter + punctuation with clickable groups -->
                <div v-if="reviewMode === 'firstletters'">
                  <div class="verse-content text-sm sm:text-base text-slate-800 font-mono tracking-tight leading-relaxed">
                    <template v-for="(chunk, index) in getFirstLettersChunks(currentReviewVerse.content)" :key="'fl-chunk-' + index">
                      <!-- Clickable word group (if exists) -->
                      <span
                        v-if="chunk.fullText"
                        @click.stop="$emit('revealFirstLetterChunk', index)"
                        :class="[
                          firstLettersRevealedGroups.has(index)
                            ? 'text-red-600 cursor-default'
                            : 'cursor-pointer hover:text-blue-600 transition-colors'
                        ]">{{ firstLettersRevealedGroups.has(index) ? chunk.fullText : chunk.firstLetters }}</span><!-- Static separators (punctuation, spaces, newlines, numbers) -->
                      <template v-for="(part, partIndex) in chunk.separators.split('\n')" :key="'sep-' + index + '-' + partIndex">
                        <br v-if="partIndex > 0">
                        <span>{{ part }}</span>
                      </template>
                    </template>
                  </div>
                </div>

                <!-- Flash Cards Mode: Random word hiding with difficulty levels -->
                <div v-if="reviewMode === 'flashcards'">
                  <div class="text-sm sm:text-base text-slate-800 leading-relaxed">
                    <template v-for="(word, index) in getWords(currentReviewVerse.content)" :key="'content-' + index">
                      <br v-if="word.str === '\n'">
                      <span
                        v-else-if="flashcardHiddenWords.has(index + contentWordsStartIndex)"
                        @click.stop="$emit('revealWord', index + contentWordsStartIndex)"
                        :class="[
                          'flashcard-underline',
                          flashcardRevealedWords.has(index + contentWordsStartIndex) ? 'text-red-600 cursor-default' : 'cursor-pointer'
                        ]"
                        :style="flashcardRevealedWords.has(index + contentWordsStartIndex) ? '' : 'color: transparent;'">
                        {{ word.str }}
                      </span>
                      <span v-else>{{ word.str }}</span>
                    </template>
                  </div>
                </div>

                <!-- Type It Mode: Coming Soon -->
                <div v-if="reviewMode === 'typeit'" class="flex flex-col items-center justify-center py-8 sm:py-12">
                  <i class="mdi mdi-keyboard-outline text-6xl text-blue-500 mb-4"></i>
                  <h3 class="text-xl sm:text-2xl font-bold text-slate-800 mb-2">Type It Mode</h3>
                  <p class="text-sm sm:text-base text-slate-600 text-center max-w-md">
                    Practice typing verses from memory. Coming soon!
                  </p>
                </div>

              </div>

              <!-- Metadata Footer (styled like My Verses cards) -->
              <div class="flex flex-wrap items-center gap-2 text-xs text-slate-500 font-medium mt-2">
                <span v-text="getAbbreviatedAge(currentReviewVerse.startedAt || undefined)"></span>
                <ReviewCategoryChip :verse="currentReviewVerse" />
                <template v-if="currentReviewVerse.tags && currentReviewVerse.tags.length > 0">
                  <template v-for="tag in currentReviewVerse.tags" :key="tag.key">
                    <span class="px-2 py-1 bg-purple-50 text-purple-700 rounded text-xs font-medium"
                          v-text="formatTagForDisplay(tag)"></span>
                  </template>
                </template>
                <div class="ml-auto text-slate-600 font-medium">
                  <span v-text="currentReviewIndex + 1"></span>/<span v-text="totalReviewCount"></span>
                </div>
              </div>

              </div><!-- End review card -->
            </Transition>

          </div><!-- End card container with arrows -->
        </template>
      </div>

      <div v-else key="complete" class="text-center py-16">
        <!-- Daily mode completion (celebratory) -->
        <template v-if="reviewSource === 'daily'">
          <div class="text-5xl sm:text-7xl mb-4">🎉</div>
          <p class="text-2xl sm:text-3xl text-slate-700 mb-3 font-bold">Review Complete!</p>
          <p class="text-slate-500 mb-6 text-lg">Great job reviewing today's verses.</p>
          <div class="flex gap-3 justify-center flex-wrap">
            <button
              @click="$emit('viewLastCard')"
              class="px-6 py-3 rounded-lg border-2 border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold transition-all">
              View Last Card
            </button>
            <button
              @click="$emit('resetReview')"
              class="btn-premium px-8 py-4 text-white rounded-xl font-semibold text-lg">
              Review More
            </button>
          </div>
        </template>

        <!-- Filtered mode completion (informational) -->
        <template v-else>
          <div class="text-4xl sm:text-6xl mb-4 text-slate-600">✓</div>
          <p class="text-2xl sm:text-3xl text-slate-700 mb-3 font-bold">End of Filtered Set</p>
          <p class="text-slate-500 mb-6 text-lg">You've reviewed all {{ totalReviewCount }} cards in this filtered set.</p>
          <div class="flex gap-3 justify-center flex-wrap">
            <button
              @click="$emit('viewLastCard')"
              class="px-6 py-3 rounded-lg border-2 border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold transition-all">
              View Last Card
            </button>
            <button
              @click="$emit('returnToDailyReview')"
              class="btn-premium px-8 py-4 text-white rounded-xl font-semibold text-lg">
              Return to Daily Review
            </button>
          </div>
        </template>
      </div>

    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, type Ref } from 'vue'
import ReviewCategoryChip from '../ReviewCategoryChip.vue'
import { useSwipeDetection } from '../../composables/useSwipeDetection'
import type { NavDirection } from '../../composables/useReview'
import type { Verse } from '../../db'
import { getAbbreviatedAge, formatTagForDisplay, getWords, getHintedContent } from '../../utils/reviewHelpers'
import { getFirstLettersChunks } from '../../utils/firstLetters'

// Types
interface ReviewStatus {
  lastReviewType: 'recall' | 'practice' | null
}

const props = defineProps<{
  // Review state
  totalReviewCount: number
  reviewComplete: boolean
  currentReviewIndex: number
  isNavigating: boolean
  navDirection: NavDirection
  currentReviewVerse: Verse | null
  currentVerseReviewStatus: ReviewStatus | null
  isCurrentVerseInactive: boolean
  reviewSource: 'daily' | 'filtered'
  isImmersiveModeActive: boolean

  // Review mode state
  reviewMode: 'reference' | 'content' | 'hints' | 'firstletters' | 'flashcards' | 'typeit'
  hintsShown: number
  flashcardHiddenWords: Set<number>
  flashcardRevealedWords: Set<number>
  firstLettersRevealedGroups: Set<number>
}>()

// Map the orchestrator's navigation intent to a named transition
// (defined in styles.css): next/restart slide left, previous slides
// right, view-last drops in from below.
const blockTransition = computed(() => {
  switch (props.navDirection) {
    case 'previous': return 'card-right'
    case 'view-last': return 'card-drop'
    default: return 'card-left' // 'next' and 'restart'
  }
})

// Compute swipe boundaries internally. Swiping is also blocked while a
// navigation is in flight, so a drag can't hijack the card transform
// mid-animation (the release would be dropped by navigate()'s guard anyway).
const canSwipeLeft = computed(() =>
  props.currentReviewIndex < props.totalReviewCount - 1 && !props.isNavigating
)
const canSwipeRight = computed(() =>
  props.currentReviewIndex > 0 && !props.isNavigating
)

// Verse-dependent helpers, cached per verse (re-parsing the reference on
// every render/reactive tick was wasteful — these only change with the verse).
const referenceWords = computed(() =>
  props.currentReviewVerse ? getWords(props.currentReviewVerse.reference, true) : []
)
const contentWordsStartIndex = computed(() => referenceWords.value.length)

const emit = defineEmits<{
  returnToDailyReview: []
  toggleImmersiveMode: []
  exitImmersiveMode: []
  navigate: [payload: { direction: 'next' | 'previous' }]
  cardClick: []
  copyVerse: [verse: Verse]
  viewOnline: [verse: Verse]
  editVerse: [verse: Verse]
  addHint: []
  revealWord: [index: number]
  revealFirstLetterChunk: [index: number]
  viewLastCard: []
  resetReview: []
}>()

// Local state for menu
const showReviewCardMenu = ref(false)

// Card element ref for swipe detection
const cardElement = ref<HTMLElement | null>(null) as Ref<HTMLElement | null>

// Swipe → transition handoff: on a successful release the card holds the
// dragged offset until the leave animation picks it up via --swipe-x, so
// the exit continues from under the finger instead of snapping to center.
const holdSwipe = ref(false)
const swipeHandoffX = ref(0)
const onCardLeaveStart = () => { holdSwipe.value = false }
const onCardLeaveDone = () => { swipeHandoffX.value = 0 }

// Set up swipe detection internally (component owns its DOM touch handling)
const { isSwiping, swipeOffset } = useSwipeDetection(cardElement, {
  onSwipeLeft: () => {
    swipeHandoffX.value = swipeOffset.value
    holdSwipe.value = true
    emit('navigate', { direction: 'next' })
  },
  onSwipeRight: () => {
    swipeHandoffX.value = swipeOffset.value
    holdSwipe.value = true
    emit('navigate', { direction: 'previous' })
  },
  threshold: 50,
  canSwipeLeft: () => canSwipeLeft.value,
  canSwipeRight: () => canSwipeRight.value,
})

const cardStyle = computed(() => ({
  transform: isSwiping.value
    ? `translateX(${swipeOffset.value}px)`
    : holdSwipe.value
      ? `translateX(${swipeHandoffX.value}px)`
      : undefined,
  transition: isSwiping.value ? 'none' : undefined,
  '--swipe-x': `${swipeHandoffX.value}px`,
  touchAction: 'pan-y',
}))
</script>
