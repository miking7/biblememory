import { ref, watch, onUnmounted, nextTick, Ref } from 'vue';

export interface UseSwipeOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  threshold?: number;         // Minimum horizontal distance to trigger swipe (default: 50px)
  verticalThreshold?: number; // Maximum vertical movement allowed (default: 50px)
  canSwipeLeft?: () => boolean;  // Check if left swipe is allowed
  canSwipeRight?: () => boolean; // Check if right swipe is allowed
}

export function useSwipe(
  element: Ref<HTMLElement | null>,
  options: UseSwipeOptions
) {
  const {
    onSwipeLeft,
    onSwipeRight,
    threshold = 50,
    verticalThreshold = 50,
    canSwipeLeft = () => true,
    canSwipeRight = () => true,
  } = options;

  // Track swipe state
  const isSwiping = ref(false);
  const swipeOffset = ref(0);
  const swipeDirection = ref<'left' | 'right' | null>(null);
  const isAnimatingExit = ref(false);
  const isAnimatingEnter = ref(false);
  const isPositioning = ref(false); // NEW: Disable transitions during positioning

  let touchStartX = 0;
  let touchStartY = 0;
  let touchCurrentX = 0;

  const handleTouchStart = (e: TouchEvent) => {
    // Only track single-finger touches
    if (e.touches.length !== 1) return;

    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    touchCurrentX = touchStartX;
    isSwiping.value = false;
    swipeOffset.value = 0;
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (e.touches.length !== 1) return;

    touchCurrentX = e.touches[0].clientX;
    const deltaX = touchCurrentX - touchStartX;
    const deltaY = e.touches[0].clientY - touchStartY;

    // Check if this is primarily a horizontal swipe
    if (Math.abs(deltaX) > 10 && Math.abs(deltaX) > Math.abs(deltaY) * 1.5) {
      isSwiping.value = true;

      // Prevent browser's default swipe behavior (back/forward navigation)
      e.preventDefault();

      // Apply resistance at boundaries
      let resistedOffset = deltaX;
      if (deltaX > 0 && !canSwipeRight()) {
        // Swiping right but can't - apply resistance
        resistedOffset = Math.min(deltaX * 0.3, 50);
      } else if (deltaX < 0 && !canSwipeLeft()) {
        // Swiping left but can't - apply resistance
        resistedOffset = Math.max(deltaX * 0.3, -50);
      }

      swipeOffset.value = resistedOffset;
    }
  };

  const handleTouchEnd = (e: TouchEvent) => {
    if (e.changedTouches.length !== 1) return;

    const deltaX = touchCurrentX - touchStartX;
    const deltaY = e.changedTouches[0].clientY - touchStartY;

    // Stop tracking swipe
    isSwiping.value = false;

    // Check if swipe meets threshold requirements
    const isHorizontalSwipe = Math.abs(deltaX) > threshold;
    const isMostlyHorizontal = Math.abs(deltaX) > Math.abs(deltaY) * 1.5;
    const isVerticalWithinBounds = Math.abs(deltaY) < verticalThreshold;

    const isSuccessfulSwipe = isHorizontalSwipe && isMostlyHorizontal && isVerticalWithinBounds;

    if (isSuccessfulSwipe) {
      if (deltaX > 0 && canSwipeRight()) {
        // Successful swipe right (previous verse)
        swipeDirection.value = 'right';
        isAnimatingExit.value = true;
        // Animate card flying off to the right
        swipeOffset.value = window.innerWidth * 1.5;

        // After exit animation completes, trigger callback and animate entrance
        setTimeout(() => {
          if (onSwipeRight) onSwipeRight();
          
          // Wait for Vue to render new verse
          nextTick(() => {
            // Disable transitions and position card off-screen (opposite side)
            isPositioning.value = true;
            isAnimatingExit.value = false;
            swipeOffset.value = -window.innerWidth * 1.5;
            
            // Re-enable transitions and animate to center
            setTimeout(() => {
              isPositioning.value = false;
              isAnimatingEnter.value = true;
              setTimeout(() => swipeOffset.value = 0, 10);
            }, 20);
            
            // Clean up after animation
            setTimeout(() => {
              isAnimatingEnter.value = false;
              swipeDirection.value = null;
            }, 340);
          });
        }, 300);
      } else if (deltaX < 0 && canSwipeLeft()) {
        // Successful swipe left (next verse)
        swipeDirection.value = 'left';
        isAnimatingExit.value = true;
        // Animate card flying off to the left
        swipeOffset.value = -window.innerWidth * 1.5;

        // After exit animation completes, trigger callback and animate entrance
        setTimeout(() => {
          if (onSwipeLeft) onSwipeLeft();
          
          // Wait for Vue to render new verse
          nextTick(() => {
            // Disable transitions and position card off-screen (opposite side)
            isPositioning.value = true;
            isAnimatingExit.value = false;
            swipeOffset.value = window.innerWidth * 1.5;
            
            // Re-enable transitions and animate to center
            setTimeout(() => {
              isPositioning.value = false;
              isAnimatingEnter.value = true;
              setTimeout(() => swipeOffset.value = 0, 10);
            }, 20);
            
            // Clean up after animation
            setTimeout(() => {
              isAnimatingEnter.value = false;
              swipeDirection.value = null;
            }, 340);
          });
        }, 300);
      } else {
        // Swipe was far enough but not allowed - bounce back
        swipeOffset.value = 0;
      }
    } else {
      // Unsuccessful swipe - bounce back to center
      swipeOffset.value = 0;
    }
  };


  const handleTouchCancel = () => {
    // Reset state if touch is cancelled
    isSwiping.value = false;
    swipeOffset.value = 0;
    swipeDirection.value = null;
    isAnimatingExit.value = false;
  };

  /**
   * Programmatically trigger animated navigation (for button clicks)
   * @param direction - 'left' for next, 'right' for previous
   * @param allowLastCard - if true, allow left navigation even on last card (for review completion)
   */
  const triggerAnimatedNavigation = (direction: 'left' | 'right', allowLastCard = false) => {
    // Check if navigation is allowed (but allow last card navigation for review completion)
    if (direction === 'left' && !canSwipeLeft() && !allowLastCard) return;
    if (direction === 'right' && !canSwipeRight()) return;

    // Check for reduced-motion preference (accessibility)
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      // Skip animation and directly trigger callback for instant navigation
      if (direction === 'left' && onSwipeLeft) {
        onSwipeLeft();
      } else if (direction === 'right' && onSwipeRight) {
        onSwipeRight();
      }
      return;
    }

    // Trigger the same animation as swipe
    swipeDirection.value = direction;
    isAnimatingExit.value = true;

    // Set exit position based on direction
    swipeOffset.value = direction === 'left'
      ? -window.innerWidth * 1.5  // Exit left for "next"
      : window.innerWidth * 1.5;   // Exit right for "previous"

    // After exit animation completes, trigger callback and animate entrance
    setTimeout(() => {
      // Trigger appropriate callback
      if (direction === 'left' && onSwipeLeft) {
        onSwipeLeft();
      } else if (direction === 'right' && onSwipeRight) {
        onSwipeRight();
      }

      // Wait for Vue to render new verse
      nextTick(() => {
        // Disable transitions and position card off-screen (opposite side)
        isPositioning.value = true;
        isAnimatingExit.value = false;
        swipeOffset.value = direction === 'left'
          ? window.innerWidth * 1.5   // Enter from right for "next"
          : -window.innerWidth * 1.5;  // Enter from left for "previous"

        // Re-enable transitions and animate to center
        setTimeout(() => {
          isPositioning.value = false;
          isAnimatingEnter.value = true;
          setTimeout(() => swipeOffset.value = 0, 10);
        }, 20);

        // Clean up after animation
        setTimeout(() => {
          isAnimatingEnter.value = false;
          swipeDirection.value = null;
        }, 340);
      });
    }, 300);
  };

  // Watch for element to become available, then attach listeners
  let cleanupListeners: (() => void) | null = null;

  watch(
    element,
    (el, oldEl) => {
      // Clean up old listeners if element changed
      if (oldEl && cleanupListeners) {
        cleanupListeners();
        cleanupListeners = null;
      }

      // Attach new listeners if element exists
      if (el) {
        el.addEventListener('touchstart', handleTouchStart, { passive: true });
        el.addEventListener('touchmove', handleTouchMove, { passive: false });
        el.addEventListener('touchend', handleTouchEnd, { passive: true });
        el.addEventListener('touchcancel', handleTouchCancel, { passive: true });

        // Store cleanup function
        cleanupListeners = () => {
          el.removeEventListener('touchstart', handleTouchStart);
          el.removeEventListener('touchmove', handleTouchMove);
          el.removeEventListener('touchend', handleTouchEnd);
          el.removeEventListener('touchcancel', handleTouchCancel);
        };
      }
    },
    { immediate: true }
  );

  onUnmounted(() => {
    if (cleanupListeners) {
      cleanupListeners();
      cleanupListeners = null;
    }
  });

  return {
    isSwiping,
    swipeOffset,
    swipeDirection,
    isAnimatingExit,
    isAnimatingEnter,
    isPositioning,
    triggerAnimatedNavigation,
  };
}
