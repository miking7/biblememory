# Phase 2 Architecture: Enhanced Review Modes

<!--
PURPOSE: Detailed architecture and implementation specifications for Phase 2 review modes
SCOPE: Navigation structure, state management, UI patterns, and integration approach
USAGE: Reference for implementation work - includes "why" decisions and patterns, NOT line-by-line code
STATUS: Planning complete, ready for implementation
-->

## Overview

**Goal:** Integrate legacy app's advanced review capabilities into modern app using Vue 3 reactive patterns

**Key Principle:** Achieve same functionality as legacy's stack-based navigation using **simpler state transitions** instead of navigation complexity

**Estimated Timeline:** 3-4 weeks focused development

---

## Architecture Decision: Modal Sub-Modes with State Machine

### The Problem
- **Legacy app** uses jQuery + stack-based navigation (Context objects pushed/popped)
- **Modern app** uses Vue 3 + flat tab navigation (`currentTab: 'add' | 'list' | 'review'`)
- Need to merge advanced review modes without breaking existing architecture

### Three Options Considered

1. **Modal Sub-Modes** (✅ Chosen) - State machine within Review tab
2. **Micro-Stack Navigation** - Mini navigation stack within Review tab
3. **Hybrid: Modes + Modals** - Mix of state switches and modal overlays

### Why Modal Sub-Modes Won

**Advantages:**
- Simplest to implement - extends existing `useReview.ts` composable
- No navigation stack complexity - just reactive state
- Maintains glass-morphism card aesthetic (single morphing card)
- Mobile-first friendly (no separate screens, just UI state changes)
- Easy keyboard shortcuts (all in one component)
- Clean separation of concerns (all review logic in one composable)
- Follows Vue 3 best practices (reactive state management)

**Trade-offs:**
- Review component becomes larger (mitigated by composable pattern)
- Less "faithful" to legacy stack navigation (but better UX)

**Key Insight:** Legacy used stack navigation because jQuery made state management difficult. Vue's reactive system makes state transitions simpler and more elegant.

---

## State Management Architecture

### Review State Machine

Located in `client/src/composables/useReview.ts`:

```typescript
// Review mode states
type ReviewMode = 
  | 'reference'      // Show only verse reference
  | 'content'        // Show full verse text
  | 'hints'          // Progressive word revelation
  | 'firstletters'   // First letter + punctuation only
  | 'flashcards';    // Random word hiding with difficulty levels

// State variables
const reviewMode = ref<ReviewMode>('reference');
const hintsShown = ref(0);           // Number of words revealed in hints mode
const flashcardLevel = ref(25);      // Percentage of words hidden (0, 10, 25, 45, 100)
const hiddenWords = ref<Set<number>>(new Set()); // Word indices hidden in flashcards
const revealedWords = ref<Set<number>>(new Set()); // Words clicked/revealed in flashcards
```

### Mode Transitions

**Flow Chart:**
```
reference (default)
  ├─→ Space/Click → content (reveal full text)
  ├─→ 'h' key → hints (progressive reveal)
  ├─→ 'f' key → firstletters (initials only)
  └─→ Flash Cards button → flashcards (with difficulty selector)

content (verse revealed)
  ├─→ Space/Click/'n' → Next verse (returns to reference)
  ├─→ 'p' → Previous verse (returns to reference)
  └─→ Escape → Back to reference mode

hints (showing N words)
  ├─→ 'h' key again → Add one more word
  ├─→ 'n'/'p' → Navigate to next/prev verse (resets hints)
  └─→ Escape → Back to reference mode

firstletters (initials shown)
  ├─→ 'f' key again → Toggle back to reference
  ├─→ 'n'/'p' → Navigate (returns to reference)
  └─→ Escape → Back to reference mode

flashcards (difficulty-based hiding)
  ├─→ Click hidden word → Reveal that word
  ├─→ Flash Cards dropdown → Change difficulty
  ├─→ 'n'/'p' → Navigate (returns to reference)
  └─→ Escape → Back to reference mode
```

### Navigation Actions

```typescript
// Mode switchers
const switchToReference = () => {
  reviewMode.value = 'reference';
  hintsShown.value = 0;
  revealedWords.value.clear();
};

const switchToContent = () => {
  reviewMode.value = 'content';
};

const switchToHints = () => {
  reviewMode.value = 'hints';
  hintsShown.value = 3; // Start with 3 words
};

const addHint = () => {
  if (reviewMode.value === 'hints' && currentReviewVerse.value) {
    const wordCount = currentReviewVerse.value.content.split(/\s+/).length;
    if (hintsShown.value < wordCount) {
      hintsShown.value++;
    }
  }
};

const switchToFirstLetters = () => {
  reviewMode.value = 'firstletters';
};

const switchToFlashCards = (level: number) => {
  reviewMode.value = 'flashcards';
  flashcardLevel.value = level;
  generateHiddenWords(level);
};

// Verse navigation (always resets to reference mode)
const nextVerse = () => {
  currentReviewIndex.value++;
  switchToReference();
  if (currentReviewIndex.value >= dueForReview.value.length) {
    reviewComplete.value = true;
  }
};

const previousVerse = () => {
  if (currentReviewIndex.value > 0) {
    currentReviewIndex.value--;
    switchToReference();
  }
};
```

---

## UI Component Structure

### Review Card Layout

**Visual Structure (Desktop):**
```
┌─────────────────────────────────────────────────────────┐
│ [Back]     Daily Review           1/9     [Prev] [Next] │
├─────────────────────────────────────────────────────────┤
│                                                         │
│                   Psalms 143:8               [KJV]      │
│                                                         │
│            [Content area - morphs based on mode]        │
│                                                         │
│  • reference: Just the reference visible                │
│  • content: Full verse text                            │
│  • hints: N words visible, rest hidden                  │
│  • firstletters: "Cmthtlitm; fitdIt: cmtktwwIsw..."    │
│  • flashcards: Some words visible, some ____           │
│                                                         │
│                                                         │
│  monthly          fast.bt (2.2)            15 years     │
│                                                         │
├─────────────────────────────────────────────────────────┤
│      [Hint]    [Flash Cards ▼]    [First Letters]      │
└─────────────────────────────────────────────────────────┘
```

**Mobile Adjustments:**
- Tighter padding (p-4 vs p-10)
- Stacked button layout (vertical instead of horizontal)
- Smaller font sizes
- Full-width buttons for touch targets

### Mode-Specific UI Rendering

**Reference Mode:**
```vue
<div v-if="reviewMode === 'reference'" class="text-center">
  <h3 class="text-4xl font-bold mb-4">{{ currentReviewVerse.reference }}</h3>
  <p class="text-slate-500">Try to recall the verse...</p>
  <button @click="switchToContent" class="btn-reveal mt-6">
    Reveal Verse
  </button>
</div>
```

**Content Mode:**
```vue
<div v-if="reviewMode === 'content'" class="text-center">
  <h3 class="text-2xl font-bold mb-4">{{ currentReviewVerse.reference }}</h3>
  <p class="text-xl leading-relaxed mb-8 whitespace-pre-wrap">
    {{ currentReviewVerse.content }}
  </p>
  <div class="flex gap-4 justify-center">
    <button @click="markReview(true)" class="btn-success">
      ✓ Got it!
    </button>
    <button @click="markReview(false)" class="btn-warning">
      Need Practice
    </button>
  </div>
</div>
```

**Hints Mode:**
```vue
<div v-if="reviewMode === 'hints'" class="text-center">
  <h3 class="text-2xl font-bold mb-4">{{ currentReviewVerse.reference }}</h3>
  <p class="text-xl leading-relaxed mb-4">
    {{ getHintedContent(currentReviewVerse.content, hintsShown) }}
  </p>
  <p class="text-sm text-slate-500 mb-4">
    Showing {{ hintsShown }} of {{ wordCount }} words
  </p>
  <button @click="addHint" class="btn-hint" :disabled="hintsShown >= wordCount">
    Show One More Word
  </button>
</div>
```

**First Letters Mode:**
```vue
<div v-if="reviewMode === 'firstletters'" class="text-center">
  <h3 class="text-2xl font-bold mb-4">{{ currentReviewVerse.reference }}</h3>
  <p class="text-xl leading-relaxed font-mono tracking-tight">
    {{ getFirstLettersContent(currentReviewVerse.content) }}
  </p>
  <p class="text-sm text-slate-500 mt-4">
    First letter of each word + punctuation
  </p>
</div>
```

**Flash Cards Mode:**
```vue
<div v-if="reviewMode === 'flashcards'" class="text-center">
  <h3 class="text-2xl font-bold mb-4">
    {{ getShortReference(currentReviewVerse.reference) }}
  </h3>
  <div class="mb-4">
    <span class="text-sm text-slate-600">Difficulty: </span>
    <select v-model="flashcardLevel" @change="regenerateFlashCards" 
            class="px-3 py-1 border rounded">
      <option :value="0">Show Verse (0%)</option>
      <option :value="10">Beginner (10%)</option>
      <option :value="25">Intermediate (25%)</option>
      <option :value="45">Advanced (45%)</option>
      <option :value="100">Memorized (100%)</option>
    </select>
  </div>
  <p class="text-xl leading-relaxed">
    <template v-for="(word, index) in getWords(currentReviewVerse.content)" :key="index">
      <span v-if="hiddenWords.has(index)"
            @click="revealWord(index)"
            :class="revealedWords.has(index) ? 'text-red-600' : 'text-transparent border-b-2 border-black cursor-pointer'"
            class="inline-block min-w-[2em]">
        {{ word }}
      </span>
      <span v-else>{{ word }}</span>
      {{ ' ' }}
    </template>
  </p>
</div>
```

### Mode Buttons (Always Visible)

```vue
<div class="flex gap-4 justify-center mt-6 border-t pt-6">
  <button @click="switchToHints" 
          :class="reviewMode === 'hints' ? 'btn-active' : 'btn-mode'"
          class="px-6 py-3">
    Hint
  </button>
  
  <div class="relative">
    <button @click="toggleFlashCardsDropdown" 
            :class="reviewMode === 'flashcards' ? 'btn-active' : 'btn-mode'"
            class="px-6 py-3">
      Flash Cards ▼
    </button>
    <!-- Dropdown appears below button when open -->
    <div v-if="showFlashCardsDropdown" 
         class="absolute top-full mt-2 bg-white rounded-lg shadow-xl">
      <button @click="selectFlashCardLevel(0)" class="dropdown-item">
        Show Verse (0%)
      </button>
      <button @click="selectFlashCardLevel(10)" class="dropdown-item">
        Beginner (10%)
      </button>
      <button @click="selectFlashCardLevel(25)" class="dropdown-item">
        Intermediate (25%)
      </button>
      <button @click="selectFlashCardLevel(45)" class="dropdown-item">
        Advanced (45%)
      </button>
      <button @click="selectFlashCardLevel(100)" class="dropdown-item">
        Memorized (100%)
      </button>
    </div>
  </div>
  
  <button @click="switchToFirstLetters" 
          :class="reviewMode === 'firstletters' ? 'btn-active' : 'btn-mode'"
          class="px-6 py-3">
    First Letters
  </button>
</div>
```

---

## Implementation Details

### Hints Mode Logic

```typescript
// Get content with first N words visible, rest as underscores
const getHintedContent = (content: string, wordsToShow: number): string => {
  const words = content.split(/\s+/);
  return words.map((word, index) => {
    if (index < wordsToShow) {
      return word;
    } else {
      return '_'.repeat(word.length);
    }
  }).join(' ');
};
```

### First Letters Mode Logic

```typescript
// Transform content to first letters + punctuation (no spaces)
const getFirstLettersContent = (content: string): string => {
  return content
    .split('')
    .map(char => {
      // Keep punctuation and first letters
      if (/[.,;:!?'"()—\-]/.test(char)) {
        return char;
      } else if (/[a-zA-Z]/.test(char)) {
        // This is tricky - we need to track word boundaries
        // Simple approach: return first letter, skip rest
        return char; // Implement proper word detection
      } else {
        return ''; // Skip spaces
      }
    })
    .join('');
};

// Better implementation:
const getFirstLettersContent = (content: string): string => {
  const words = content.split(/(\s+)/); // Keep separators
  return words.map(word => {
    if (/^\s+$/.test(word)) return ''; // Remove spaces
    if (/^[.,;:!?'"()—\-]+$/.test(word)) return word; // Keep punctuation
    return word.charAt(0); // First letter of each word
  }).join('');
};
```

### Flash Cards Mode Logic

```typescript
// Generate set of random word indices to hide based on difficulty
const generateHiddenWords = (difficulty: number) => {
  if (!currentReviewVerse.value) return;
  
  const words = currentReviewVerse.value.content.split(/\s+/);
  const wordCount = words.length;
  const hideCount = Math.floor(wordCount * difficulty / 100);
  
  // Generate random indices
  const indices: number[] = [];
  while (indices.length < hideCount) {
    const randomIndex = Math.floor(Math.random() * wordCount);
    if (!indices.includes(randomIndex)) {
      indices.push(randomIndex);
    }
  }
  
  hiddenWords.value = new Set(indices);
  revealedWords.value.clear();
};

// Reveal a single word (clicked by user)
const revealWord = (index: number) => {
  revealedWords.value.add(index);
};

// Regenerate hidden words when difficulty changes
const regenerateFlashCards = () => {
  generateHiddenWords(flashcardLevel.value);
};
```

---

## Keyboard Shortcuts Implementation

### Event Listener Setup

```typescript
// In app.ts or useReview.ts
const handleKeyPress = (event: KeyboardEvent) => {
  // Only handle if Review tab is active
  if (currentTab.value !== 'review') return;
  
  // Ignore if typing in input field
  if (event.target instanceof HTMLInputElement || 
      event.target instanceof HTMLTextAreaElement) {
    return;
  }
  
  switch (event.key.toLowerCase()) {
    case 'n':
      nextVerse();
      break;
    case 'p':
      previousVerse();
      break;
    case ' ':
      handleSpaceKey();
      break;
    case 'h':
      switchToHints();
      break;
    case 'f':
      switchToFirstLetters();
      break;
    case 'escape':
      switchToReference();
      break;
  }
};

const handleSpaceKey = () => {
  if (reviewMode.value === 'reference') {
    switchToContent();
  } else {
    nextVerse();
  }
};

// Register listener
onMounted(() => {
  window.addEventListener('keydown', handleKeyPress);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyPress);
});
```

---

## Enhanced UI Features

### 3-Column Metadata Footer

Preserve legacy layout with modern styling:

```vue
<div class="grid grid-cols-3 gap-4 text-sm text-slate-600 border-t pt-4 mt-6">
  <div class="text-left">
    <span class="font-medium">{{ getReviewCategory(currentReviewVerse) }}</span>
  </div>
  <div class="text-center">
    <template v-if="currentReviewVerse.tags && currentReviewVerse.tags.length > 0">
      <div v-for="tag in currentReviewVerse.tags" :key="tag.key" class="mb-1">
        <span class="text-purple-700">
          {{ formatTagForDisplay(tag) }}
        </span>
      </div>
    </template>
  </div>
  <div class="text-right">
    <span>{{ getHumanReadableTime(currentReviewVerse.startedAt) }}</span>
  </div>
</div>
```

### Human-Readable Time Function

```typescript
const getHumanReadableTime = (startedAt: number): string => {
  if (!startedAt) return '';
  
  const now = Date.now();
  const days = Math.floor((now - startedAt) / (1000 * 60 * 60 * 24));
  
  if (days < 14) return `${days} days`;
  if (days < 56) {
    const weeks = Math.floor(days / 7);
    return `${weeks} week${weeks > 1 ? 's' : ''}`;
  }
  if (days < 336) { // < 11 months
    const months = Math.floor(days / 30.4);
    return `${months} month${months > 1 ? 's' : ''}`;
  }
  const years = Math.floor(days / 365.25);
  return `${years} year${years > 1 ? 's' : ''}`;
};
```

---

## Mobile Optimizations

### Touch-Friendly Buttons

- Minimum 44x44px touch targets (Apple guideline)
- Larger spacing between buttons (16px gaps)
- Full-width buttons on small screens
- Simplified dropdown (bottom sheet on mobile?)

### Responsive Layout Patterns

```vue
<!-- Desktop: Horizontal buttons -->
<div class="hidden sm:flex gap-4">
  <button class="btn-mode">Hint</button>
  <button class="btn-mode">Flash Cards</button>
  <button class="btn-mode">First Letters</button>
</div>

<!-- Mobile: Vertical buttons -->
<div class="flex flex-col gap-3 sm:hidden">
  <button class="btn-mode w-full">Hint</button>
  <button class="btn-mode w-full">Flash Cards</button>
  <button class="btn-mode w-full">First Letters</button>
</div>
```

---

## Testing Strategy

### Manual Testing Checklist

**Mode Switching:**
- [ ] Reference → Content (click reveal)
- [ ] Reference → Hints (keyboard 'h')
- [ ] Reference → First Letters (keyboard 'f')
- [ ] Reference → Flash Cards (click button + select difficulty)
- [ ] Any mode → Reference (Escape key)

**Hints Mode:**
- [ ] Shows 3 words initially
- [ ] Adds 1 word per 'h' press
- [ ] Shows word count accurately
- [ ] Resets on verse navigation

**First Letters Mode:**
- [ ] Shows only first letters
- [ ] Preserves punctuation
- [ ] No spaces between letters
- [ ] Readable/useful for memorization

**Flash Cards Mode:**
- [ ] Dropdown shows 5 difficulty levels
- [ ] Words hidden correctly by percentage
- [ ] Click hidden word reveals it (red color)
- [ ] Regenerates on difficulty change
- [ ] Different random pattern each time

**Keyboard Shortcuts:**
- [ ] 'n' advances to next verse
- [ ] 'p' returns to previous verse
- [ ] Space reveals or advances (context-aware)
- [ ] 'h' activates hints
- [ ] 'f' activates first letters
- [ ] Escape returns to reference
- [ ] Shortcuts don't fire when typing in inputs

**Mobile Testing:**
- [ ] Buttons are touch-friendly (easy to tap)
- [ ] Layout works on small screens
- [ ] Flash Cards dropdown accessible
- [ ] No horizontal scrolling
- [ ] Text remains readable

---

## Integration with Existing Code

### Files to Modify

1. **`client/src/composables/useReview.ts`**
   - Add review mode state management
   - Add mode switching functions
   - Add content transformation functions
   - Add keyboard shortcut handler

2. **`client/src/App.vue`**
   - Update review card template for mode-specific rendering
   - Add mode buttons UI
   - Add Flash Cards dropdown
   - Add metadata footer (3-column layout)
   - Wire up keyboard shortcuts

3. **`client/src/app.ts`**
   - Export keyboard shortcut handler from useReview
   - Register global keydown listener

4. **`client/src/styles.css`**
   - Add button styles (btn-mode, btn-active)
   - Add dropdown styles
   - Add flashcard hidden/revealed word styles
   - Add metadata footer grid styles

### No Breaking Changes

- All existing review functionality remains intact
- New modes are additive (don't replace existing flow)
- Keyboard shortcuts are optional (all features accessible via UI)
- Mobile users get full feature set (no desktop-only features)

---

## Success Criteria

### Feature Completeness
- [ ] All 5 review modes functional (reference, content, hints, firstletters, flashcards)
- [ ] Keyboard shortcuts working for all navigation
- [ ] Flash Cards difficulty selector with 5 levels
- [ ] Human-readable time display
- [ ] Tag value formatting
- [ ] 3-column metadata footer

### User Experience
- [ ] Smooth transitions between modes (no jarring layout shifts)
- [ ] Intuitive mode switching (buttons always visible)
- [ ] Mobile-friendly (touch targets, responsive layout)
- [ ] Clear visual feedback (active mode indication)
- [ ] Helpful hints/instructions for each mode

### Technical Quality
- [ ] Clean composable pattern (logic in useReview.ts)
- [ ] Type-safe TypeScript code
- [ ] No memory leaks (event listeners cleaned up)
- [ ] Performance (mode switches instant, no lag)
- [ ] Maintainable code (clear functions, good naming)

---

## Future Enhancements (Phase 3+)

Once Phase 2 is stable, consider:

1. **Mode Preferences** - Save user's preferred review mode
2. **Quick Difficulty Adjustment** - +/- buttons for Flash Cards
3. **Custom Hint Starting Point** - Choose how many words to start with
4. **Smart Word Hiding** - Hide important words (nouns/verbs) instead of random
5. **Meditation/Application Modals** - Full-screen prompts for reflection
6. **Statistics by Mode** - Track which modes used most, success rates
7. **Gesture Support** - Swipe for next/prev on mobile

---

## Summary

**Architecture Choice:** Modal Sub-Modes with Review State Machine  
**Key Files:** `useReview.ts` (logic), `App.vue` (UI)  
**Pattern:** Reactive state transitions (not navigation stack)  
**Timeline:** 3-4 weeks  
**Risk:** Low (extends existing patterns, no breaking changes)  

**Next Steps:**
1. Implement mode state management in useReview.ts
2. Add mode-specific rendering in App.vue
3. Implement content transformation functions
4. Add keyboard shortcuts
5. Add Flash Cards dropdown UI
6. Test thoroughly on desktop and mobile
7. Update documentation with new features

---

**Document Status:** Complete - Ready for implementation  
**Last Updated:** December 31, 2025  
**Author:** Cline (AI Assistant)
