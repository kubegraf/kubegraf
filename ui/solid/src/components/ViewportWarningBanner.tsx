/**
 * Viewport Warning Banner
 * 
 * Shows a dismissible banner when viewport is too small or zoom causes UI issues.
 * Only appears when overflow is detected and user hasn't dismissed it.
 */

import { Component, Show, createSignal, onMount } from 'solid-js';
import { useViewportOverflowDetection, isViewportWarningDismissed, dismissViewportWarning } from '../utils/viewportOverflowDetection';

const ViewportWarningBanner: Component = () => {
  const issues = useViewportOverflowDetection();
  const [dismissed, setDismissed] = createSignal(isViewportWarningDismissed());

  const handleDismiss = () => {
    dismissViewportWarning();
    setDismissed(true);
  };

  // Show banner only if there are issues and user hasn't dismissed it
  const shouldShow = () => {
    return !dismissed() && issues().hasOverflow;
  };

  return (
    <Show when={shouldShow()}>
      <div
        class="px-4 py-2 flex items-center justify-between gap-4 text-sm flex-shrink-0"
        style={{
          background: 'rgba(245, 158, 11, 0.1)',
          'border-bottom': '1px solid rgba(245, 158, 11, 0.3)',
          color: 'var(--warning-color)',
        }}
      >
        <div class="flex items-center gap-2 flex-1 min-w-0">
          <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span class="flex-1 min-w-0">
            Your window or zoom level is making parts of the UI tight. Try full-screen, widening the window, or adjusting zoom.
          </span>
        </div>
        <button
          onClick={handleDismiss}
          class="p-1 rounded hover:opacity-80 transition-opacity flex-shrink-0"
          title="Dismiss warning"
          style={{ color: 'var(--warning-color)' }}
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </Show>
  );
};

export default ViewportWarningBanner;

