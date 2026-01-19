import { ref, nextTick, Ref, readonly } from 'vue';

export interface TransitionConfig {
  direction: 'left' | 'right' | 'up' | 'down';
  duration: number; // milliseconds, 0 = instant
}

/**
 * Composable for managing card entry/exit transitions
 *
 * Provides two primitives:
 * - exitTransition: animates card off-screen and hides it
 * - entryTransition: positions card off-screen, then animates to center
 *
 * Both return Promises for async/await composition
 */
export function useCardTransitions(_element: Ref<HTMLElement | null>) {
  // State management
  const isTransitioning = ref(false);
  const cardVisible = ref(true);
  const cardOffset = ref(0);
  const transitionDuration = ref('0.3s'); // CSS transition duration

  /**
   * Exit transition: animate card off-screen and hide
   *
   * @param config.direction - Direction to exit ('left' | 'right' | 'up' | 'down')
   * @param config.duration - Animation duration in ms (0 = instant)
   * @returns Promise that resolves when transition completes
   */
  async function exitTransition(config: TransitionConfig): Promise<void> {
    if (isTransitioning.value) {
      console.warn('Transition already in progress, ignoring exitTransition');
      return;
    }

    isTransitioning.value = true;

    // Normalize duration based on reduced-motion preference
    const duration = normalizeDuration(config.duration);

    if (duration === 0) {
      // Instant: just hide
      cardVisible.value = false;
      cardOffset.value = 0;
      transitionDuration.value = '0s';
      isTransitioning.value = false;
      return;
    }

    // Set CSS transition duration
    transitionDuration.value = `${duration}ms`;

    // Animate card off-screen
    const offset = getOffset(config.direction);
    cardOffset.value = offset;

    // Wait for animation to complete
    await sleep(duration);

    // Hide card and reset position (instant)
    transitionDuration.value = '0s';
    await nextTick();
    cardVisible.value = false;
    cardOffset.value = 0;

    isTransitioning.value = false;
  }

  /**
   * Entry transition: position card off-screen, animate to center
   *
   * @param config.direction - Direction to enter from ('left' | 'right' | 'up' | 'down')
   * @param config.duration - Animation duration in ms (0 = instant)
   * @returns Promise that resolves when transition completes
   */
  async function entryTransition(config: TransitionConfig): Promise<void> {
    if (isTransitioning.value) {
      console.warn('Transition already in progress, ignoring entryTransition');
      return;
    }

    isTransitioning.value = true;

    // Normalize duration based on reduced-motion preference
    const duration = normalizeDuration(config.duration);

    // Position card off-screen (invisible, no transition)
    transitionDuration.value = '0s';
    const offset = getOffset(config.direction);
    cardOffset.value = offset;
    cardVisible.value = false;

    // Wait for positioning to apply
    await nextTick();

    if (duration === 0) {
      // Instant: just show at center
      cardOffset.value = 0;
      cardVisible.value = true;
      isTransitioning.value = false;
      return;
    }

    // Make visible and prepare for animation
    cardVisible.value = true;
    await sleep(10); // Allow browser to render visible state

    // Set CSS transition duration and animate to center
    transitionDuration.value = `${duration}ms`;
    await nextTick();
    cardOffset.value = 0;

    // Wait for animation to complete
    await sleep(duration);

    isTransitioning.value = false;
  }

  return {
    // Transition methods
    exitTransition,
    entryTransition,

    // Readonly state for template binding
    isTransitioning: readonly(isTransitioning),
    cardOffset: readonly(cardOffset),
    cardVisible: readonly(cardVisible),
    transitionDuration: readonly(transitionDuration),
  };
}

/**
 * Normalize duration based on prefers-reduced-motion
 * Returns 0 if user prefers reduced motion, otherwise returns original duration
 */
function normalizeDuration(duration: number): number {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  return prefersReducedMotion ? 0 : duration;
}

/**
 * Calculate offset based on direction
 * Uses 1.5x screen width/height to ensure card fully exits viewport
 */
function getOffset(direction: 'left' | 'right' | 'up' | 'down'): number {
  const screenWidth = window.innerWidth;
  const screenHeight = window.innerHeight;

  switch (direction) {
    case 'left':
      return -screenWidth * 1.5;
    case 'right':
      return screenWidth * 1.5;
    case 'up':
      return -screenHeight * 1.5;
    case 'down':
      return screenHeight * 1.5;
  }
}

/**
 * Promise-based sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
