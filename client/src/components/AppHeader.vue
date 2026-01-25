<template>
  <header v-show="!isImmersiveModeActive" class="mb-6 sm:mb-10 fade-in relative immersive-hideable">
    <div class="text-left sm:text-center">
      <h1 class="text-3xl sm:text-5xl font-bold text-white mb-3 tracking-tight flex items-center justify-start sm:justify-center gap-2 sm:gap-3">
        <img src="/icons/favicon-32x32.png" alt="" class="w-8 h-8 sm:w-12 sm:h-12" />
        <span class="gradient-text">Bible Memory</span>
      </h1>
      <p class="text-blue-200 text-lg font-light text-[clamp(0.6rem,4.7vw,1.125rem)]">Memorize Scripture, one verse at a time</p>
    </div>

    <!-- User Menu (Authenticated) -->
    <div v-show="isAuthenticated"
         class="absolute top-0 right-0"
         v-click-outside="closeMenu">
      <button
        @click="toggleMenu"
        class="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white hover:shadow-lg transition-all text-xl relative">
        👤

        <!-- Offline Badge -->
        <span
          v-show="hasSyncIssues"
          @click.stop="$emit('triggerOfflineToast')"
          class="offline-badge"
          title="Click for details">
        </span>
      </button>

      <!-- Dropdown Menu -->
      <div v-show="showMenu"
           class="absolute right-0 mt-2 glass-card rounded-xl shadow-2xl overflow-hidden z-50">
        <div class="p-4 border-b border-slate-200">
          <p class="text-xs text-slate-500 font-medium mb-1">Signed in as</p>
          <p class="text-sm font-semibold text-slate-800 truncate" v-text="userEmail"></p>
        </div>
        <button
          @click="$emit('openAbout'); closeMenu()"
          class="w-full px-4 py-3 text-left text-sm font-medium text-slate-700 hover:bg-slate-50 transition-all flex items-center gap-2 border-b border-slate-100">
          <span>ℹ️</span>
          <span>About</span>
        </button>
        <button
          @click="$emit('logout'); closeMenu()"
          class="w-full px-4 py-3 text-left text-sm font-medium text-slate-700 hover:bg-slate-50 transition-all flex items-center gap-2">
          <span>🚪</span>
          <span>Logout</span>
        </button>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { ref } from 'vue'

defineProps<{
  isAuthenticated: boolean
  userEmail: string
  hasSyncIssues: boolean
  isImmersiveModeActive: boolean
}>()

defineEmits<{
  openAbout: []
  logout: []
  triggerOfflineToast: []
}>()

const showMenu = ref(false)

const toggleMenu = () => {
  showMenu.value = !showMenu.value
}

const closeMenu = () => {
  showMenu.value = false
}
</script>
