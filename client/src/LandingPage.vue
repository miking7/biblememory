<template>
  <div class="landing-page">
    <!-- Sticky Navigation Header -->
    <header class="sticky top-0 z-50 bg-white/80 backdrop-blur-sm border-b border-slate-200 shadow-sm transition-all">
      <div class="container mx-auto px-4 max-w-6xl">
        <div class="flex items-center justify-between py-4">
          <!-- Logo -->
          <div class="flex items-center gap-2">
            <img src="/icons/favicon-32x32.png" alt="" class="w-8 h-8" />
            <span class="text-xl font-bold gradient-text">Bible Memory</span>
          </div>

          <!-- Desktop Navigation Links (hidden on mobile) -->
          <nav class="hidden md:flex items-center gap-6">
            <a href="/features.html" class="text-slate-700 hover:text-blue-600 font-medium transition-colors">Features</a>
            <a href="/about.html" class="text-slate-700 hover:text-blue-600 font-medium transition-colors">About</a>
            <a href="https://github.com/miking7/biblememory" target="_blank" rel="noopener noreferrer" class="text-slate-700 hover:text-blue-600 transition-colors" aria-label="View on GitHub">
              <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path fill-rule="evenodd" clip-rule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.604-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z"/>
              </svg>
            </a>
          </nav>

          <!-- CTA Buttons -->
          <div class="flex items-center gap-2 sm:gap-3">
            <button
              @click="$emit('openAuth', 'login')"
              class="px-3 sm:px-5 py-2 text-slate-700 hover:bg-slate-50 rounded-lg font-medium transition-all border border-slate-200">
              Sign In
            </button>
            <button
              @click="$emit('openAuth', 'register')"
              class="px-3 sm:px-5 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:shadow-lg transition-all font-semibold">
              Sign Up
            </button>
          </div>
        </div>
      </div>
    </header>

    <!-- Hero Section -->
    <section class="py-12 sm:py-20 lg:py-28 fade-in-section">
      <div class="container mx-auto px-4 max-w-6xl">
        <div class="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          <!-- Hero Content -->
          <div class="text-center lg:text-left">
            <h1 class="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-4 sm:mb-6 leading-tight">
              <span class="gradient-text">Hide God's Word</span><br>
              <span class="text-white">in Your Heart</span>
            </h1>
            <p class="text-lg sm:text-xl text-blue-100 mb-6 sm:mb-8 leading-relaxed max-w-2xl mx-auto lg:mx-0">
              Digital flashcards with spaced repetition for Scripture memorization. Beautiful, offline-first, free and open source.
            </p>
            <div class="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center lg:justify-start">
              <button
                @click="$emit('openAuth', 'register')"
                class="px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:shadow-2xl transition-all font-bold text-lg">
                Start Memorizing
              </button>
              <button
                @click="$emit('openAuth', 'login')"
                class="px-8 py-4 bg-white/10 backdrop-blur-sm text-white rounded-xl hover:bg-white/20 transition-all font-semibold text-lg border border-white/20">
                Sign In
              </button>
            </div>
          </div>

          <!-- Hero Video/Image -->
          <div class="order-first lg:order-last">
            <div class="aspect-[16/9] rounded-2xl border border-white/20 shadow-2xl overflow-hidden bg-slate-900">
              <!-- Video (hidden for users who prefer reduced motion) -->
              <video
                v-if="!prefersReducedMotion"
                ref="heroVideo"
                class="w-full h-full object-cover"
                autoplay
                muted
                loop
                playsinline
                poster="/images/hero.png"
              >
                <source src="/images/hero.mp4" type="video/mp4">
                <!-- Fallback for browsers that don't support video -->
                <img src="/images/hero.png" alt="Bible Memory app screenshot" class="w-full h-full object-cover">
              </video>
              <!-- Static image for reduced motion preference -->
              <img
                v-else
                src="/images/hero.png"
                alt="Bible Memory app screenshot"
                class="w-full h-full object-cover"
              >
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Features Grid -->
    <section id="features" class="py-16 sm:py-24 bg-white fade-in-section">
      <div class="container mx-auto px-4 max-w-6xl">
        <div class="text-center mb-12 sm:mb-16">
          <h2 class="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-800 mb-4">
            Everything You Need to <span class="gradient-text">Memorize Scripture</span>
          </h2>
          <p class="text-lg text-slate-600 max-w-2xl mx-auto">
            A complete toolkit designed to help you hide God's Word in your heart effectively and joyfully.
          </p>
        </div>

        <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          <!-- Feature 1: Offline First -->
          <div class="glass-card rounded-2xl p-6 sm:p-8 hover:shadow-xl transition-all">
            <div class="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mb-4">
              <i class="mdi mdi-cloud-off-outline text-2xl text-white"></i>
            </div>
            <h3 class="text-xl font-bold text-slate-800 mb-3">Works Everywhere</h3>
            <p class="text-slate-600 leading-relaxed">
              Memorize verses anywhere, anytime. No internet required. Your verses sync automatically when you're back online.
            </p>
          </div>

          <!-- Feature 2: Spaced Repetition -->
          <div class="glass-card rounded-2xl p-6 sm:p-8 hover:shadow-xl transition-all">
            <div class="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center mb-4">
              <i class="mdi mdi-brain text-2xl text-white"></i>
            </div>
            <h3 class="text-xl font-bold text-slate-800 mb-3">Smart Flashcards</h3>
            <p class="text-slate-600 leading-relaxed">
              Familiar flashcards made smarter with spaced repetition. Review at optimal intervals—daily at first, then weekly, then monthly—for lasting memory.
            </p>
          </div>

          <!-- Feature 3: Multiple Review Modes -->
          <div class="glass-card rounded-2xl p-6 sm:p-8 hover:shadow-xl transition-all">
            <div class="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center mb-4">
              <i class="mdi mdi-target text-2xl text-white"></i>
            </div>
            <h3 class="text-xl font-bold text-slate-800 mb-3">Flexible Practice</h3>
            <p class="text-slate-600 leading-relaxed">
              Review your way: Flash Cards, Progressive Hints, First Letters, Type It mode, or full reveal. Adjust difficulty on the fly.
            </p>
          </div>

          <!-- Feature 4: Beautiful Design -->
          <div class="glass-card rounded-2xl p-6 sm:p-8 hover:shadow-xl transition-all">
            <div class="w-12 h-12 bg-gradient-to-br from-pink-500 to-pink-600 rounded-xl flex items-center justify-center mb-4">
              <i class="mdi mdi-palette-outline text-2xl text-white"></i>
            </div>
            <h3 class="text-xl font-bold text-slate-800 mb-3">Distraction-Free Focus</h3>
            <p class="text-slate-600 leading-relaxed">
              Clean, modern interface with glass-morphism design. Immersive mode removes all distractions for deep focus.
            </p>
          </div>

          <!-- Feature 5: Multi-Device Sync -->
          <div class="glass-card rounded-2xl p-6 sm:p-8 hover:shadow-xl transition-all">
            <div class="w-12 h-12 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center mb-4">
              <i class="mdi mdi-sync text-2xl text-white"></i>
            </div>
            <h3 class="text-xl font-bold text-slate-800 mb-3">Seamless Sync</h3>
            <p class="text-slate-600 leading-relaxed">
              Start on your phone, continue on your tablet or computer. Your progress stays in sync across all devices.
            </p>
          </div>

          <!-- Feature 6: Install as App -->
          <div class="glass-card rounded-2xl p-6 sm:p-8 hover:shadow-xl transition-all">
            <div class="w-12 h-12 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl flex items-center justify-center mb-4">
              <i class="mdi mdi-cellphone-arrow-down text-2xl text-white"></i>
            </div>
            <h3 class="text-xl font-bold text-slate-800 mb-3">Native-Like Experience</h3>
            <p class="text-slate-600 leading-relaxed">
              Install directly to your home screen. Works like a native app with offline access and fast performance.
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- How It Works -->
    <section id="how-it-works" class="py-16 sm:py-24 fade-in-section">
      <div class="container mx-auto px-4 max-w-6xl">
        <div class="text-center mb-12 sm:mb-16">
          <h2 class="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
            <span class="gradient-text">Simple</span> to Start
          </h2>
          <p class="text-lg text-blue-100 max-w-2xl mx-auto">
            Get started in three easy steps and build your Scripture memory library today.
          </p>
        </div>

        <div class="grid md:grid-cols-3 gap-8 lg:gap-12">
          <!-- Step 1 -->
          <div class="text-center">
            <div class="mb-6 flex justify-center">
              <!-- Screenshot (1:2 aspect ratio - portrait phone) -->
              <div class="w-48 sm:w-56 aspect-[1/2] rounded-2xl border border-white/20 shadow-2xl overflow-hidden">
                <img
                  src="/images/1-add-verse.png"
                  alt="Add Verse screen - paste any verse and let AI extract the reference"
                  class="w-full h-full object-cover"
                >
              </div>
            </div>
            <div class="glass-card rounded-xl p-6 bg-white/95">
              <div class="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg mb-4 mx-auto">
                1
              </div>
              <h3 class="text-xl font-bold text-slate-800 mb-3">Add Your Verses</h3>
              <p class="text-slate-600 leading-relaxed">
                Paste any verse and let AI extract the reference and clean the text. Or enter manually with full control.
              </p>
            </div>
          </div>

          <!-- Step 2 -->
          <div class="text-center">
            <div class="mb-6 flex justify-center">
              <!-- Screenshot (1:2 aspect ratio - portrait phone) -->
              <div class="w-48 sm:w-56 aspect-[1/2] rounded-2xl border border-white/20 shadow-2xl overflow-hidden">
                <img
                  src="/images/2-review-page.png"
                  alt="Review screen - practice your verses with different modes"
                  class="w-full h-full object-cover"
                >
              </div>
            </div>
            <div class="glass-card rounded-xl p-6 bg-white/95">
              <div class="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center text-white font-bold text-lg mb-4 mx-auto">
                2
              </div>
              <h3 class="text-xl font-bold text-slate-800 mb-3">Review Daily</h3>
              <p class="text-slate-600 leading-relaxed">
                Follow your personalized review schedule. Mark "Got it!" when you remember, or "Again" if you need more practice.
              </p>
            </div>
          </div>

          <!-- Step 3 -->
          <div class="text-center">
            <div class="mb-6 flex justify-center">
              <!-- Screenshot (1:2 aspect ratio - portrait phone) -->
              <div class="w-48 sm:w-56 aspect-[1/2] rounded-2xl border border-white/20 shadow-2xl overflow-hidden">
                <img
                  src="/images/3-my-verses-with-streak.png"
                  alt="My Verses screen - track your progress and streak"
                  class="w-full h-full object-cover"
                >
              </div>
            </div>
            <div class="glass-card rounded-xl p-6 bg-white/95">
              <div class="w-10 h-10 bg-gradient-to-br from-amber-500 to-amber-600 rounded-full flex items-center justify-center text-white font-bold text-lg mb-4 mx-auto">
                3
              </div>
              <h3 class="text-xl font-bold text-slate-800 mb-3">Build Your Streak</h3>
              <p class="text-slate-600 leading-relaxed">
                Track your progress with daily stats. Watch your streak grow as you build the habit of hiding Scripture in your heart.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- PWA Installation Callout -->
    <section class="py-16 sm:py-24 bg-gradient-to-br from-blue-50 to-indigo-50 fade-in-section">
      <div class="container mx-auto px-4 max-w-4xl">
        <div class="glass-card rounded-2xl p-8 sm:p-12 text-center">
          <div class="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <i class="mdi mdi-cellphone-arrow-down text-3xl text-white"></i>
          </div>
          <h2 class="text-3xl sm:text-4xl font-bold text-slate-800 mb-4">Install on Your Phone</h2>
          <p class="text-lg text-slate-600 mb-8 max-w-2xl mx-auto">
            Bible Memory works best as an installed app. Add it to your home screen for quick access and offline use.
          </p>

          <!-- Installation Instructions (Collapsible) -->
          <details class="text-left max-w-2xl mx-auto">
            <summary class="cursor-pointer text-blue-600 font-semibold hover:text-blue-700 transition-colors mb-4">
              Show installation instructions →
            </summary>
            <div class="grid sm:grid-cols-2 gap-6 mt-6">
              <!-- iOS Instructions -->
              <div class="bg-white/50 rounded-xl p-6">
                <div class="flex items-center gap-2 mb-4">
                  <i class="mdi mdi-apple text-2xl text-slate-700"></i>
                  <h3 class="font-bold text-slate-800">iOS (iPhone/iPad)</h3>
                </div>
                <ol class="space-y-2 text-sm text-slate-600">
                  <li>1. Open in Safari</li>
                  <li>2. Tap the Share button <i class="mdi mdi-export-variant text-blue-600"></i></li>
                  <li>3. Scroll down and tap "Add to Home Screen"</li>
                  <li>4. Tap "Add"</li>
                </ol>
              </div>

              <!-- Android Instructions -->
              <div class="bg-white/50 rounded-xl p-6">
                <div class="flex items-center gap-2 mb-4">
                  <i class="mdi mdi-android text-2xl text-slate-700"></i>
                  <h3 class="font-bold text-slate-800">Android</h3>
                </div>
                <ol class="space-y-2 text-sm text-slate-600">
                  <li>1. Open in Chrome</li>
                  <li>2. Tap the three-dot menu <i class="mdi mdi-dots-vertical text-blue-600"></i></li>
                  <li>3. Tap "Install app" or "Add to Home Screen"</li>
                  <li>4. Tap "Install"</li>
                </ol>
              </div>
            </div>
          </details>
        </div>
      </div>
    </section>

    <!-- Social Proof / Open Source Section -->
    <section class="py-16 sm:py-24 bg-white fade-in-section">
      <div class="container mx-auto px-4 max-w-4xl text-center">
        <h2 class="text-3xl sm:text-4xl font-bold text-slate-800 mb-4">
          <span class="gradient-text">Open Source</span> & Free Forever
        </h2>
        <p class="text-lg text-slate-600 mb-8 max-w-2xl mx-auto">
          Built with transparency. No ads, no tracking, no premium tiers. Star us on GitHub or contribute to the project.
        </p>

        <!-- Badges -->
        <div class="flex flex-wrap justify-center gap-3 mb-8">
          <span class="px-4 py-2 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 text-green-700 rounded-lg font-semibold text-sm">
            ✓ 100% Free
          </span>
          <span class="px-4 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 text-blue-700 rounded-lg font-semibold text-sm">
            ⚡ Offline First
          </span>
          <span class="px-4 py-2 bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 text-purple-700 rounded-lg font-semibold text-sm">
            🌐 Open Source
          </span>
        </div>

        <!-- GitHub Link -->
        <a
          href="https://github.com/miking7/biblememory"
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex items-center gap-2 px-6 py-3 bg-slate-800 text-white rounded-xl hover:bg-slate-700 transition-all font-semibold shadow-lg hover:shadow-xl">
          <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path fill-rule="evenodd" clip-rule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.604-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z"/>
          </svg>
          <span>View on GitHub</span>
        </a>
      </div>
    </section>

    <!-- Final CTA Section -->
    <section class="py-16 sm:py-24 fade-in-section">
      <div class="container mx-auto px-4 max-w-4xl text-center">
        <h2 class="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
          <span class="gradient-text">Start Memorizing</span> Today
        </h2>
        <p class="text-lg text-blue-100 mb-8 max-w-2xl mx-auto">
          Join others hiding God's Word in their hearts.
        </p>
        <button
          @click="$emit('openAuth', 'register')"
          class="px-10 py-5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:shadow-2xl transition-all font-bold text-xl">
          Start Memorizing
        </button>
      </div>
    </section>

    <!-- Footer -->
    <footer class="py-12 bg-white/5 backdrop-blur-sm border-t border-white/10">
      <div class="container mx-auto px-4 max-w-6xl">
        <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
          <!-- Logo & Description -->
          <div class="lg:col-span-2">
            <div class="flex items-center gap-2 mb-4">
              <img src="/icons/favicon-32x32.png" alt="" class="w-8 h-8" />
              <span class="text-xl font-bold text-white">Bible Memory</span>
            </div>
            <p class="text-blue-200 text-sm leading-relaxed max-w-md">
              Memorize Scripture, one verse at a time. Built with ❤️ for believers who want to hide God's Word in their hearts.
            </p>
          </div>

          <!-- Links Column 1 -->
          <div>
            <h3 class="text-white font-semibold mb-3">Product</h3>
            <ul class="space-y-2 text-sm">
              <li><a href="/about.html" class="text-blue-200 hover:text-white transition-colors">About</a></li>
              <li><a href="/features.html" class="text-blue-200 hover:text-white transition-colors">Features</a></li>
              <li><a href="#how-it-works" class="text-blue-200 hover:text-white transition-colors">How It Works</a></li>
              <li>
                <a href="https://github.com/miking7/biblememory" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1.5 text-blue-200 hover:text-white transition-colors">
                  <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path fill-rule="evenodd" clip-rule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.604-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z"/>
                  </svg>
                  <span>GitHub</span>
                </a>
              </li>
            </ul>
          </div>

          <!-- Links Column 2 -->
          <div>
            <h3 class="text-white font-semibold mb-3">Legal</h3>
            <ul class="space-y-2 text-sm">
              <li><a href="/privacy.html" class="text-blue-200 hover:text-white transition-colors">Privacy Policy</a></li>
              <li><a href="/terms.html" class="text-blue-200 hover:text-white transition-colors">Terms of Service</a></li>
            </ul>
          </div>
        </div>

        <!-- Copyright -->
        <div class="pt-8 border-t border-white/10 text-center text-sm text-blue-200">
          <p>&copy; 2026 Bible Memory by Michael Engelbrecht. Open source project.</p>
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';

// Emit events for auth modal opening
defineEmits<{
  openAuth: [mode: 'login' | 'register']
}>();

// Check if user prefers reduced motion (for video vs static image)
const prefersReducedMotion = ref(false);

// Setup scroll-triggered fade-in animations
onMounted(() => {
  // Check if user prefers reduced motion
  prefersReducedMotion.value = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (prefersReducedMotion.value) {
    // Skip animations if user prefers reduced motion
    return;
  }

  // Create intersection observer for fade-in animations
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('fade-in-visible');
          // Optional: Stop observing once animated (prevents re-animation)
          observer.unobserve(entry.target);
        }
      });
    },
    {
      threshold: 0.1, // Trigger when 10% of element is visible
      rootMargin: '0px 0px -50px 0px' // Trigger slightly before element enters viewport
    }
  );

  // Observe all sections with fade-in-section class
  document.querySelectorAll('.fade-in-section').forEach((el) => {
    observer.observe(el);
  });
});
</script>

<style scoped>
.landing-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #1e3a8a 0%, #312e81 50%, #1e293b 100%);
}

/* Smooth scroll for anchor links */
html {
  scroll-behavior: smooth;
}

/* Details/summary styling */
details summary {
  list-style: none;
}

details summary::-webkit-details-marker {
  display: none;
}
</style>
