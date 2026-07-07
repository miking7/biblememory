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
        <div class="text-5xl sm:text-7xl mb-4">📖</div>
        <p class="text-xl sm:text-2xl text-slate-700 mb-2 font-semibold">Nothing to review</p>
        <p class="text-slate-500 mb-6 text-lg">Add or unpause verses to start reviewing.</p>
        <button
          @click="$emit('addVerses')"
          class="btn-premium px-8 py-4 text-white rounded-xl font-semibold text-lg">
          Add Your First Verse
        </button>
      </div>

      <!-- Midnight rollover: the open session's queue/targets belong to a
           previous day — reviewing stays blocked until today's list loads. -->
      <div v-else-if="reviewSource === 'daily' && showNewDay" key="newday" class="text-center py-16">
        <div class="text-5xl sm:text-7xl mb-4">🌅</div>
        <p class="text-2xl sm:text-3xl text-slate-700 mb-3 font-bold">A New Day Has Begun!</p>
        <p class="text-slate-500 mb-6 text-lg">Yesterday's session is done — let's load today's review list.</p>
        <button
          @click="startNewDay()"
          class="btn-premium px-8 py-4 text-white rounded-xl font-semibold text-lg">
          Start Today's Review
        </button>
      </div>

      <!-- One-time daily-goal celebration: shown once per day when every
           category target is met; review continues indefinitely after. -->
      <div v-else-if="showCelebration" key="celebration" class="text-center py-16">
        <div class="text-5xl sm:text-7xl mb-4">🎉</div>
        <p class="text-2xl sm:text-3xl text-slate-700 mb-3 font-bold">Daily Goal Reached!</p>
        <p class="text-slate-500 mb-6 text-lg">
          You've reviewed {{ dailyProgress.reviewed }} verse{{ dailyProgress.reviewed === 1 ? '' : 's' }} today. Well done!
        </p>
        <button
          @click="keepReviewing()"
          class="btn-premium px-8 py-4 text-white rounded-xl font-semibold text-lg">
          Keep Reviewing
        </button>
      </div>

      <!-- Small collections pause at the end of each lap instead of looping
           silently (a 1-2 card loop reads as a frozen card). -->
      <div v-else-if="dailyLapComplete" key="lapcomplete" class="text-center py-16">
        <div class="text-4xl sm:text-6xl mb-4 text-slate-600">✓</div>
        <p class="text-2xl sm:text-3xl text-slate-700 mb-3 font-bold">All Verses Reviewed!</p>
        <p class="text-slate-500 mb-6 text-lg">
          You've been through {{ lapVerseCount === 1 ? 'your verse' : `all ${lapVerseCount} of your verses` }}.
        </p>
        <div class="flex gap-3 justify-center flex-wrap">
          <button
            @click="$emit('addVerses')"
            class="px-6 py-3 rounded-lg border-2 border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold transition-all">
            Add More Verses
          </button>
          <button
            @click="keepReviewing()"
            class="btn-premium px-8 py-4 text-white rounded-xl font-semibold text-lg">
            Review Again
          </button>
        </div>
      </div>

      <!-- Reached the end of today's stack while some needed cards were
           skipped over — offer to go finish them (re-sorted to the front)
           or keep going and defer them further. -->
      <div v-else-if="showSkippedCardsPrompt" key="skippedprompt" class="text-center py-16">
        <div class="text-5xl sm:text-7xl mb-4">🔍</div>
        <p class="text-2xl sm:text-3xl text-slate-700 mb-3 font-bold">Some Cards Were Skipped</p>
        <p class="text-slate-500 mb-6 text-lg">
          You've reached the end of today's stack, but {{ dailyProgress.remaining }} card{{ dailyProgress.remaining === 1 ? '' : 's' }} still {{ dailyProgress.remaining === 1 ? 'needs' : 'need' }} a review to hit today's goal.
        </p>
        <div class="flex gap-3 justify-center flex-wrap">
          <button
            @click="finishSkippedCards()"
            class="px-6 py-3 rounded-lg border-2 border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold transition-all">
            Finish Skipped Cards
          </button>
          <button
            @click="keepReviewing()"
            class="btn-premium px-8 py-4 text-white rounded-xl font-semibold text-lg">
            Skip For Now
          </button>
        </div>
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
              @click="returnToDailyReview()"
              class="text-blue-600 hover:text-blue-800 text-sm font-medium hover:bg-blue-50 px-3 py-1 rounded transition-all flex items-center gap-1">
              <i class="mdi mdi-arrow-left"></i>
              <span>back</span>
            </button>
          </div>

          <button
            @click="toggleImmersiveMode()"
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
              @click="navigate({ direction: 'previous' })"
              :disabled="!canGoPrevious"
              class="no-zoom absolute left-0 top-1/2 -translate-y-1/2 -translate-x-3 sm:-translate-x-4 z-10 w-10 h-10 rounded-full bg-white/60 border-2 border-slate-300 shadow-lg flex items-center justify-center text-slate-700 hover:bg-white hover:scale-110 transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:scale-100"
              title="Previous verse (p or ←)">
              <i class="mdi mdi-chevron-left text-2xl"></i>
            </button>

            <!-- Right Arrow (Next) -->
            <button
              @click="navigate({ direction: 'next' })"
              :disabled="!canGoNext"
              class="no-zoom absolute right-0 top-1/2 -translate-y-1/2 translate-x-3 sm:translate-x-4 z-10 w-10 h-10 rounded-full bg-white/60 border-2 border-slate-300 shadow-lg flex items-center justify-center text-slate-700 hover:bg-white hover:scale-110 transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:scale-100"
              title="Next verse (n or →)">
              <i class="mdi mdi-chevron-right text-2xl"></i>
            </button>

            <!-- Exit Button (X) - Only visible in immersive mode -->
            <button
              v-show="isImmersiveModeActive"
              @click.stop="exitImmersiveMode()"
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
                   @click="handleCardClick()">

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
                          @click.stop="revealWord(index)"
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
                <!-- .stop: without it the click also bubbles to the card's
                     handleCardClick, whose hints case adds a second hint -->
                <div v-if="reviewMode === 'hints'" @click.stop="addHint()" class="cursor-pointer">
                  <p class="verse-content text-sm sm:text-base text-slate-800 leading-relaxed font-mono"
                     v-text="hintedContent"></p>
                </div>

                <!-- First Letters Mode: First letter + punctuation with clickable groups -->
                <div v-if="reviewMode === 'firstletters'">
                  <div class="verse-content text-sm sm:text-base text-slate-800 font-mono tracking-tight leading-relaxed">
                    <template v-for="(chunk, index) in firstLettersChunks" :key="'fl-chunk-' + index">
                      <!-- Clickable word group (if exists) -->
                      <span
                        v-if="chunk.fullText"
                        @click.stop="revealFirstLetterChunk(index)"
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
                    <template v-for="(word, index) in contentWords" :key="'content-' + index">
                      <br v-if="word.str === '\n'">
                      <span
                        v-else-if="flashcardHiddenWords.has(index + contentWordsStartIndex)"
                        @click.stop="revealWord(index + contentWordsStartIndex)"
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
                <!-- Daily: distinct-verses-reviewed / today's target (the
                     queue itself is endless). Filtered: position in the set. -->
                <div class="ml-auto text-slate-600 font-medium">
                  <span v-text="progressLabel"></span>
                </div>
              </div>

              </div><!-- End review card -->
            </Transition>

          </div><!-- End card container with arrows -->
        </template>
      </div>

      <!-- Filtered mode completion (informational). Daily review never
           completes — its queue loops over the collection indefinitely. -->
      <div v-else key="complete" class="text-center py-16">
        <div class="text-4xl sm:text-6xl mb-4 text-slate-600">✓</div>
        <p class="text-2xl sm:text-3xl text-slate-700 mb-3 font-bold">End of Filtered Set</p>
        <p class="text-slate-500 mb-6 text-lg">You've reviewed all {{ totalReviewCount }} cards in this filtered set.</p>
        <div class="flex gap-3 justify-center flex-wrap">
          <button
            @click="viewLastCard()"
            class="px-6 py-3 rounded-lg border-2 border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold transition-all">
            View Last Card
          </button>
          <button
            @click="returnToDailyReview()"
            class="btn-premium px-8 py-4 text-white rounded-xl font-semibold text-lg">
            Return to Daily Review
          </button>
        </div>
      </div>

    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, type Ref } from 'vue'
import ReviewCategoryChip from '../ReviewCategoryChip.vue'
import { useSwipeDetection } from '../../composables/useSwipeDetection'
import type { ReviewComposable } from '../../composables/useReview'
import type { Verse } from '../../db'
import { getEffectiveReviewCategory } from '../../actions'
import { getAbbreviatedAge, formatTagForDisplay, getWords, getHintedContent } from '../../utils/reviewHelpers'
import { getFirstLettersChunks } from '../../utils/firstLetters'

const props = defineProps<{
  // The whole review composable as one prop (systemPatterns §7): state is
  // read via destructured refs, review actions are called directly. Only
  // non-review concerns (clipboard, browser, edit modal) emit to App.
  review: ReviewComposable
}>()

const {
  totalReviewCount,
  reviewComplete,
  currentReviewIndex,
  handSize,
  dailyProgress,
  showCelebration,
  showNewDay,
  dailyLapComplete,
  lapVerseCount,
  showSkippedCardsPrompt,
  isNavigating,
  navDirection,
  currentReviewVerse,
  currentVerseReviewStatus,
  reviewSource,
  isImmersiveModeActive,
  reviewMode,
  hintsShown,
  flashcardHiddenWords,
  flashcardRevealedWords,
  firstLettersRevealedGroups,
  navigate,
  handleCardClick,
  addHint,
  revealWord,
  revealFirstLetterChunk,
  viewLastCard,
  keepReviewing,
  startNewDay,
  finishSkippedCards,
  returnToDailyReview,
  toggleImmersiveMode,
  exitImmersiveMode,
} = props.review

// Inactive = paused or scheduled in the future (no review tint applies)
const isCurrentVerseInactive = computed(() => {
  if (!currentReviewVerse.value) return false
  const { category } = getEffectiveReviewCategory(currentReviewVerse.value)
  return category === 'paused' || category === 'future'
})

// Map the orchestrator's navigation intent to a named transition
// (defined in styles.css): next/restart slide left, previous slides
// right, view-last drops in from below.
const blockTransition = computed(() => {
  switch (navDirection.value) {
    case 'previous': return 'card-right'
    case 'view-last': return 'card-drop'
    default: return 'card-left' // 'next' and 'restart'
  }
})

// One movement predicate per direction, shared by the arrow buttons and
// the swipe guards so they can never disagree. Both directions are blocked
// while a navigation is in flight, so a drag can't hijack the card
// transform mid-sequence (navigate()'s guard would drop the release anyway).
// Daily review has no last card — reaching the end of the queue appends
// another lap over the collection — so "next" is always available there.
// (This computed doesn't need to account for the interstitials that CAN
// pause that flow — celebration/lap-complete/skipped-cards/new-day — since
// their v-else-if branches replace this whole card+arrows block in the
// template; the arrows and swipe handler this feeds simply aren't in the
// DOM while any of them are showing.)
const canGoNext = computed(() =>
  (reviewSource.value === 'daily'
    ? totalReviewCount.value > 0
    : currentReviewIndex.value < totalReviewCount.value - 1) && !isNavigating.value
)
const canGoPrevious = computed(() =>
  currentReviewIndex.value > 0 && !isNavigating.value
)

// Daily mode: x = queue position (moves on skip either direction — the
// "hand of dealt cards" feel). y = max(handSize, totalEvents + remaining):
// the baseline denominator is today's raw-review-count-so-far plus what's
// still outstanding, which (unlike the plain quota target) keeps growing
// on a repeat review instead of falsely reaching "done" early — but if
// position runs ahead of that (skipping forward without confirming a
// review), y is dragged up to match rather than showing x > y. Known,
// accepted trade-off: skipping past the remaining count this way *can*
// show a premature "done"-looking N/N with no reviews recorded (see
// memory-bank/previous-work/075, Round 7).
//
// y uses handSize (a high-water mark of positions reached this session —
// Round 8), not the live position: once a card has been "dealt into the
// hand" by skipping to it, going back to look at an earlier card must not
// shrink the denominator again. handSize only resets when the queue is
// rebuilt (re-entering the tab re-sorts). Filtered mode is unaffected:
// position/size of the finite chosen set.
const progressLabel = computed(() => {
  if (reviewSource.value !== 'daily') {
    return `${currentReviewIndex.value + 1}/${totalReviewCount.value}`
  }
  const x = currentReviewIndex.value + 1
  const y = Math.max(handSize.value, dailyProgress.value.totalEvents + dailyProgress.value.remaining)
  return `${x}/${y}`
})

// Verse-dependent helpers, cached per verse (re-parsing the reference on
// every render/reactive tick was wasteful — these only change with the verse).
const referenceWords = computed(() =>
  currentReviewVerse.value ? getWords(currentReviewVerse.value.reference, true) : []
)
const contentWordsStartIndex = computed(() => referenceWords.value.length)
const contentWords = computed(() =>
  currentReviewVerse.value ? getWords(currentReviewVerse.value.content) : []
)
const firstLettersChunks = computed(() =>
  currentReviewVerse.value ? getFirstLettersChunks(currentReviewVerse.value.content) : []
)
const hintedContent = computed(() =>
  currentReviewVerse.value ? getHintedContent(currentReviewVerse.value.content, hintsShown.value) : ''
)

const emit = defineEmits<{
  copyVerse: [verse: Verse]
  viewOnline: [verse: Verse]
  editVerse: [verse: Verse]
  addVerses: [] // navigate to the Add Verse tab (non-review concern → App)
}>()

// Local state for menu
const showReviewCardMenu = ref(false)

// Card element ref for swipe detection
const cardElement = ref<HTMLElement | null>(null) as Ref<HTMLElement | null>

// Swipe → transition handoff. A leaving element keeps the inline styles
// from its last render (Vue does not re-patch an element it is removing),
// so after a swipe release the outgoing card still carries the drag-time
// `transition: none` and transform. The before-leave hook cleans those up
// imperatively and publishes the released offset as --swipe-x for the
// *-leave-from rules, so the exit animates from under the finger.
// swipeOffset persists after a successful release (useSwipeDetection only
// zeroes it on failed swipes) — exactly what makes the value available here.
const onCardLeaveStart = (el: Element) => {
  const style = (el as HTMLElement).style
  style.setProperty('--swipe-x', `${swipeOffset.value}px`)
  style.transition = ''
  style.transform = ''
}
const onCardLeaveDone = () => { swipeOffset.value = 0 }

// Set up swipe detection internally (component owns its DOM touch handling)
const { isSwiping, swipeOffset } = useSwipeDetection(cardElement, {
  onSwipeLeft: () => navigate({ direction: 'next' }),
  onSwipeRight: () => navigate({ direction: 'previous' }),
  threshold: 50,
  canSwipeLeft: () => canGoNext.value,
  canSwipeRight: () => canGoPrevious.value,
})

const cardStyle = computed(() => ({
  transform: isSwiping.value ? `translateX(${swipeOffset.value}px)` : undefined,
  transition: isSwiping.value ? 'none' : undefined,
  touchAction: 'pan-y',
}))
</script>
