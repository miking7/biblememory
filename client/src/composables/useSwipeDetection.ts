import { ref, watch, onUnmounted, Ref } from 'vue';

export interface UseSwipeDetectionOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  threshold?: number;         // Minimum horizontal distance to trigger swipe (default: 50px)
  verticalThreshold?: number; // Maximum vertical movement allowed (default: 50px)
  canSwipeLeft?: () => boolean;  // Check if left swipe is allowed
  canSwipeRight?: () => boolean; // Check if right swipe is allowed
}

/**
 * Composable for detecting horizontal swipe gestures
 *
 * Handles touch events and calls callbacks when valid swipes are detected.
 * Does NOT handle animations - use with useCardTransitions for visual effects.
 */
export function useSwipeDetection(
  element: Ref<HTMLElement | null>,
  options: UseSwipeDetectionOptions
) {
  const {
    onSwipeLeft,
    onSwipeRight,
    threshold = 50,
    verticalThreshold = 50,
    canSwipeLeft = () => true,
    canSwipeRight = () => true,
  } = options;

  // Track swipe state (for visual feedback during drag)
  const isSwiping = ref(false);
  const swipeOffset = ref(0);

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
        if (onSwipeRight) onSwipeRight();
      } else if (deltaX < 0 && canSwipeLeft()) {
        // Successful swipe left (next verse)
        if (onSwipeLeft) onSwipeLeft();
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
  };
}
