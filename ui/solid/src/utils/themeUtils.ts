/**
 * Theme utilities
 * Provides helpers for theme-aware styling and initialization
 */

/**
 * Check if CSS variables are available
 * This helps prevent flash of unstyled content
 */
export function areCSSVariablesReady(): boolean {
  if (typeof window === 'undefined') return false;
  
  const testElement = document.createElement('div');
  testElement.style.setProperty('--bg-primary', 'test');
  const value = getComputedStyle(testElement).getPropertyValue('--bg-primary');
  return value !== '';
}

/**
 * Get theme-aware background color with fallback
 * @param fallback - Fallback color if CSS variable is not available
 * @returns CSS variable or fallback color
 */
export function getThemeBackground(fallback: string = '#0f172a'): string {
  if (typeof window === 'undefined') return fallback;
  
  // Check if CSS variables are available
  const root = document.documentElement;
  const bgPrimary = getComputedStyle(root).getPropertyValue('--bg-primary').trim();
  
  if (bgPrimary) {
    return `var(--bg-primary)`;
  }
  
  return fallback;
}

/**
 * Wait for CSS variables to be ready
 * @param timeout - Maximum time to wait in milliseconds
 * @returns Promise that resolves when CSS variables are ready
 */
export function waitForCSSVariables(timeout: number = 100): Promise<void> {
  return new Promise((resolve) => {
    if (areCSSVariablesReady()) {
      resolve();
      return;
    }
    
    const startTime = Date.now();
    const checkInterval = setInterval(() => {
      if (areCSSVariablesReady() || Date.now() - startTime > timeout) {
        clearInterval(checkInterval);
        resolve();
      }
    }, 10);
  });
}

