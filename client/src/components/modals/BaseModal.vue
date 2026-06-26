<template>
  <div v-show="show" class="fixed inset-0 z-50 overflow-y-auto">
    <div class="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
      <!-- Background overlay -->
      <div class="fixed inset-0 transition-opacity bg-slate-900 bg-opacity-75" @click="$emit('close')"></div>

      <!-- Modal panel -->
      <div
        ref="panel"
        role="dialog"
        aria-modal="true"
        :aria-label="label"
        class="inline-block align-bottom glass-card rounded-2xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle w-full"
        :class="maxWidth === '2xl' ? 'sm:max-w-2xl' : 'sm:max-w-md'">
        <div class="p-4 sm:p-8">
          <slot />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, onBeforeUnmount } from 'vue'

const props = withDefaults(defineProps<{
  show: boolean
  /** Accessible name announced to screen readers */
  label?: string
  maxWidth?: 'md' | '2xl'
}>(), {
  maxWidth: 'md',
})

const emit = defineEmits<{
  close: []
}>()

const panel = ref<HTMLElement | null>(null)
let previouslyFocused: HTMLElement | null = null

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

const getFocusable = (): HTMLElement[] => {
  if (!panel.value) return []
  // offsetParent is null for elements hidden via display:none (e.g. the
  // inactive login/register form), so this only returns visible controls.
  return Array.from(panel.value.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
    .filter((el) => el.offsetParent !== null)
}

const onKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    event.preventDefault()
    emit('close')
    return
  }

  if (event.key !== 'Tab') return

  // Focus trap: keep Tab/Shift+Tab cycling within the dialog
  const focusable = getFocusable()
  if (focusable.length === 0) return

  const first = focusable[0]
  const last = focusable[focusable.length - 1]
  const active = document.activeElement as HTMLElement | null

  if (event.shiftKey) {
    if (active === first || !panel.value?.contains(active)) {
      event.preventDefault()
      last.focus()
    }
  } else if (active === last || !panel.value?.contains(active)) {
    event.preventDefault()
    first.focus()
  }
}

const unlock = () => {
  document.body.style.overflow = ''
  document.removeEventListener('keydown', onKeydown)
}

watch(
  () => props.show,
  async (isOpen) => {
    if (isOpen) {
      previouslyFocused = document.activeElement as HTMLElement | null
      document.body.style.overflow = 'hidden'
      document.addEventListener('keydown', onKeydown)
      await nextTick()
      getFocusable()[0]?.focus()
    } else {
      unlock()
      previouslyFocused?.focus()
      previouslyFocused = null
    }
  },
)

onBeforeUnmount(unlock)
</script>
