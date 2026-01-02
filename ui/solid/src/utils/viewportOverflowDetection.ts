/**
 * Viewport Overflow Detection Utility
 * 
 * Detects when the viewport is too small or zoom causes UI elements to be clipped.
 * Used to show a helpful banner suggesting users adjust their window size or zoom level.
 */

import { createSignal, onMount, onCleanup } from 'solid-js';

export interface ViewportIssue {
  hasOverflow: boolean;
  clippedCorners: boolean;
  viewportTooSmall: boolean;
  recommendedWidth: number;
  recommendedHeight: number;
}

const MIN_RECOMMENDED_WIDTH = 1024;
const MIN_RECOMMENDED_HEIGHT = 600;

/**
 * Detects viewport overflow issues
 */
export function detectViewportIssues(): ViewportIssue {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  // Check if viewport is too small
  const viewportTooSmall = viewportWidth < MIN_RECOMMENDED_WIDTH || viewportHeight < MIN_RECOMMENDED_HEIGHT;

  // Check for clipped corners by examining critical UI elements
  let clippedCorners = false;
  
  // Check if header is visible (top-left)
  const header = document.querySelector('header');
  if (header) {
    const headerRect = header.getBoundingClientRect();
    if (headerRect.top < 0 || headerRect.left < 0) {
      clippedCorners = true;
    }
  }

  // Check if sidebar is accessible (left side)
  // Look for sidebar rail (w-16 class or any element with width ~64px on left side)
  const sidebar = document.querySelector('.w-16') || 
                  document.querySelector('[class*="w-16"]') ||
                  document.querySelector('nav[class*="flex"]');
  if (sidebar) {
    const sidebarRect = sidebar.getBoundingClientRect();
    // Check if sidebar is off-screen or partially clipped
    if (sidebarRect.left < -10 || sidebarRect.top < -10) {
      clippedCorners = true;
    }
  }

  // Check if main content area is scrollable but stuck
  const mainContent = document.querySelector('main');
  let hasScrollIssue = false;
  if (mainContent) {
    const hasOverflow = mainContent.scrollHeight > mainContent.clientHeight;
    const canScroll = mainContent.scrollTop > 0 || 
                     mainContent.scrollTop < (mainContent.scrollHeight - mainContent.clientHeight - 1);
    // If content overflows but can't scroll, there's an issue
    if (hasOverflow && !canScroll && mainContent.scrollHeight > mainContent.clientHeight + 10) {
      hasScrollIssue = true;
    }
  }

  const hasOverflow = viewportTooSmall || clippedCorners || hasScrollIssue;

  return {
    hasOverflow,
    clippedCorners,
    viewportTooSmall,
    recommendedWidth: MIN_RECOMMENDED_WIDTH,
    recommendedHeight: MIN_RECOMMENDED_HEIGHT,
  };
}

/**
 * Hook to monitor viewport issues and return current state
 */
export function useViewportOverflowDetection() {
  const [issues, setIssues] = createSignal<ViewportIssue>({
    hasOverflow: false,
    clippedCorners: false,
    viewportTooSmall: false,
    recommendedWidth: MIN_RECOMMENDED_WIDTH,
    recommendedHeight: MIN_RECOMMENDED_HEIGHT,
  });

  const checkIssues = () => {
    // Use requestAnimationFrame to ensure DOM is ready
    requestAnimationFrame(() => {
      setIssues(detectViewportIssues());
    });
  };

  onMount(() => {
    // Initial check
    checkIssues();

    // Monitor resize and zoom events
    window.addEventListener('resize', checkIssues);
    window.addEventListener('orientationchange', checkIssues);
    
    // Monitor zoom changes (using ResizeObserver on body as a proxy)
    const resizeObserver = new ResizeObserver(() => {
      checkIssues();
    });
    
    const body = document.body;
    if (body) {
      resizeObserver.observe(body);
    }

    // Periodic check (in case of programmatic changes)
    const interval = setInterval(checkIssues, 2000);

    onCleanup(() => {
      window.removeEventListener('resize', checkIssues);
      window.removeEventListener('orientationchange', checkIssues);
      resizeObserver.disconnect();
      clearInterval(interval);
    });
  });

  return issues;
}

/**
 * Check if user has dismissed the viewport warning banner
 */
export function isViewportWarningDismissed(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('kubegraf-viewport-warning-dismissed') === 'true';
}

/**
 * Dismiss the viewport warning banner
 */
export function dismissViewportWarning(): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('kubegraf-viewport-warning-dismissed', 'true');
}

/**
 * Reset the dismissal (for testing or if user wants to see it again)
 */
export function resetViewportWarningDismissal(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('kubegraf-viewport-warning-dismissed');
}

