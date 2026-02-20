/**
 * Accessibility Utilities
 * WCAG 2.1 AA compliance helpers
 */

import { onCleanup, onMount } from 'solid-js';

/**
 * Focus management utilities
 */
export class FocusManager {
  private previousActiveElement: Element | null = null;

  /**
   * Save current focus and trap it within element
   */
  trapFocus(element: HTMLElement): void {
    this.previousActiveElement = document.activeElement;

    const focusableElements = this.getFocusableElements(element);
    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    element.addEventListener('keydown', handleTab);

    // Auto-focus first element
    firstElement.focus();

    // Cleanup function
    return () => {
      element.removeEventListener('keydown', handleTab);
      this.restoreFocus();
    };
  }

  /**
   * Restore previously focused element
   */
  restoreFocus(): void {
    if (this.previousActiveElement instanceof HTMLElement) {
      this.previousActiveElement.focus();
    }
    this.previousActiveElement = null;
  }

  /**
   * Get all focusable elements within container
   */
  getFocusableElements(container: HTMLElement): Element[] {
    const selector = [
      'a[href]',
      'button:not([disabled])',
      'textarea:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
    ].join(',');

    return Array.from(container.querySelectorAll(selector));
  }

  /**
   * Move focus to element
   */
  static focusElement(element: HTMLElement | null): void {
    if (element) {
      element.focus();
      element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  /**
   * Check if element is focusable
   */
  static isFocusable(element: HTMLElement): boolean {
    const tabindex = element.getAttribute('tabindex');
    if (tabindex === '-1') return false;

    if (element.hasAttribute('disabled')) return false;

    const focusableTags = ['A', 'BUTTON', 'INPUT', 'TEXTAREA', 'SELECT'];
    return focusableTags.includes(element.tagName) || tabindex !== null;
  }
}

/**
 * Global focus manager instance
 */
export const globalFocusManager = new FocusManager();

/**
 * ARIA live region announcer for screen readers
 */
export class ScreenReaderAnnouncer {
  private liveRegion: HTMLElement | null = null;

  /**
   * Initialize live region
   */
  init(): void {
    if (this.liveRegion) return;

    this.liveRegion = document.createElement('div');
    this.liveRegion.setAttribute('role', 'status');
    this.liveRegion.setAttribute('aria-live', 'polite');
    this.liveRegion.setAttribute('aria-atomic', 'true');
    this.liveRegion.style.position = 'absolute';
    this.liveRegion.style.left = '-10000px';
    this.liveRegion.style.width = '1px';
    this.liveRegion.style.height = '1px';
    this.liveRegion.style.overflow = 'hidden';

    document.body.appendChild(this.liveRegion);
  }

  /**
   * Announce message to screen readers
   */
  announce(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
    if (!this.liveRegion) this.init();
    if (!this.liveRegion) return;

    this.liveRegion.setAttribute('aria-live', priority);

    // Clear and set new message
    this.liveRegion.textContent = '';
    setTimeout(() => {
      if (this.liveRegion) {
        this.liveRegion.textContent = message;
      }
    }, 100);
  }

  /**
   * Cleanup live region
   */
  destroy(): void {
    if (this.liveRegion && this.liveRegion.parentNode) {
      this.liveRegion.parentNode.removeChild(this.liveRegion);
      this.liveRegion = null;
    }
  }
}

/**
 * Global screen reader announcer
 */
export const globalAnnouncer = new ScreenReaderAnnouncer();

/**
 * Initialize global announcer on page load
 */
if (typeof window !== 'undefined') {
  globalAnnouncer.init();
}

/**
 * Keyboard navigation helper
 */
export interface KeyboardNavConfig {
  up?: () => void;
  down?: () => void;
  left?: () => void;
  right?: () => void;
  enter?: () => void;
  escape?: () => void;
  home?: () => void;
  end?: () => void;
  pageUp?: () => void;
  pageDown?: () => void;
  space?: () => void;
}

export function createKeyboardNavigation(config: KeyboardNavConfig) {
  const handleKeyDown = (e: KeyboardEvent) => {
    const handler = {
      ArrowUp: config.up,
      ArrowDown: config.down,
      ArrowLeft: config.left,
      ArrowRight: config.right,
      Enter: config.enter,
      Escape: config.escape,
      Home: config.home,
      End: config.end,
      PageUp: config.pageUp,
      PageDown: config.pageDown,
      ' ': config.space,
    }[e.key];

    if (handler) {
      e.preventDefault();
      handler();
    }
  };

  return handleKeyDown;
}

/**
 * Skip link helper for accessibility
 */
export function createSkipLink(targetId: string, label: string = 'Skip to main content'): HTMLElement {
  const link = document.createElement('a');
  link.href = `#${targetId}`;
  link.textContent = label;
  link.className = 'skip-link';
  link.style.position = 'absolute';
  link.style.top = '-40px';
  link.style.left = '0';
  link.style.padding = '8px';
  link.style.background = '#000';
  link.style.color = '#fff';
  link.style.textDecoration = 'none';
  link.style.zIndex = '10000';

  link.addEventListener('focus', () => {
    link.style.top = '0';
  });

  link.addEventListener('blur', () => {
    link.style.top = '-40px';
  });

  link.addEventListener('click', (e) => {
    e.preventDefault();
    const target = document.getElementById(targetId);
    if (target) {
      target.focus();
      target.scrollIntoView({ behavior: 'smooth' });
    }
  });

  return link;
}

/**
 * Check color contrast ratio (WCAG AA requires 4.5:1 for normal text)
 */
export function getContrastRatio(color1: string, color2: string): number {
  const lum1 = getLuminance(color1);
  const lum2 = getLuminance(color2);

  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);

  return (brightest + 0.05) / (darkest + 0.05);
}

function getLuminance(color: string): number {
  // Convert hex to RGB
  const hex = color.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16) / 255;
  const g = parseInt(hex.substr(2, 2), 16) / 255;
  const b = parseInt(hex.substr(4, 2), 16) / 255;

  // Apply gamma correction
  const rs = r <= 0.03928 ? r / 12.92 : Math.pow((r + 0.055) / 1.055, 2.4);
  const gs = g <= 0.03928 ? g / 12.92 : Math.pow((g + 0.055) / 1.055, 2.4);
  const bs = b <= 0.03928 ? b / 12.92 : Math.pow((b + 0.055) / 1.055, 2.4);

  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * ARIA attributes helper
 */
export interface AriaAttributes {
  label?: string;
  labelledby?: string;
  describedby?: string;
  expanded?: boolean;
  selected?: boolean;
  checked?: boolean;
  disabled?: boolean;
  hidden?: boolean;
  current?: 'page' | 'step' | 'location' | 'date' | 'time' | boolean;
  live?: 'polite' | 'assertive' | 'off';
  atomic?: boolean;
  busy?: boolean;
  controls?: string;
  owns?: string;
  haspopup?: boolean | 'menu' | 'listbox' | 'tree' | 'grid' | 'dialog';
  invalid?: boolean;
  required?: boolean;
  readonly?: boolean;
}

export function createAriaAttributes(attrs: AriaAttributes): Record<string, string | boolean> {
  const result: Record<string, string | boolean> = {};

  if (attrs.label) result['aria-label'] = attrs.label;
  if (attrs.labelledby) result['aria-labelledby'] = attrs.labelledby;
  if (attrs.describedby) result['aria-describedby'] = attrs.describedby;
  if (attrs.expanded !== undefined) result['aria-expanded'] = attrs.expanded;
  if (attrs.selected !== undefined) result['aria-selected'] = attrs.selected;
  if (attrs.checked !== undefined) result['aria-checked'] = attrs.checked;
  if (attrs.disabled !== undefined) result['aria-disabled'] = attrs.disabled;
  if (attrs.hidden !== undefined) result['aria-hidden'] = attrs.hidden;
  if (attrs.current !== undefined) result['aria-current'] = attrs.current;
  if (attrs.live) result['aria-live'] = attrs.live;
  if (attrs.atomic !== undefined) result['aria-atomic'] = attrs.atomic;
  if (attrs.busy !== undefined) result['aria-busy'] = attrs.busy;
  if (attrs.controls) result['aria-controls'] = attrs.controls;
  if (attrs.owns) result['aria-owns'] = attrs.owns;
  if (attrs.haspopup !== undefined) result['aria-haspopup'] = attrs.haspopup;
  if (attrs.invalid !== undefined) result['aria-invalid'] = attrs.invalid;
  if (attrs.required !== undefined) result['aria-required'] = attrs.required;
  if (attrs.readonly !== undefined) result['aria-readonly'] = attrs.readonly;

  return result;
}

/**
 * Focus visible utility (show focus ring only for keyboard navigation)
 */
export function setupFocusVisible(): () => void {
  let usingKeyboard = false;

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Tab') {
      usingKeyboard = true;
      document.body.classList.add('using-keyboard');
    }
  };

  const handleMouseDown = () => {
    usingKeyboard = false;
    document.body.classList.remove('using-keyboard');
  };

  document.addEventListener('keydown', handleKeyDown);
  document.addEventListener('mousedown', handleMouseDown);

  return () => {
    document.removeEventListener('keydown', handleKeyDown);
    document.removeEventListener('mousedown', handleMouseDown);
  };
}

/**
 * Roving tabindex helper for composite widgets
 */
export class RovingTabIndex {
  private items: HTMLElement[] = [];
  private currentIndex: number = 0;

  constructor(container: HTMLElement, itemSelector: string) {
    this.items = Array.from(container.querySelectorAll(itemSelector));
    this.updateTabIndexes();
  }

  /**
   * Move to next item
   */
  next(): void {
    this.currentIndex = (this.currentIndex + 1) % this.items.length;
    this.updateTabIndexes();
    this.focusCurrent();
  }

  /**
   * Move to previous item
   */
  previous(): void {
    this.currentIndex = (this.currentIndex - 1 + this.items.length) % this.items.length;
    this.updateTabIndexes();
    this.focusCurrent();
  }

  /**
   * Move to first item
   */
  first(): void {
    this.currentIndex = 0;
    this.updateTabIndexes();
    this.focusCurrent();
  }

  /**
   * Move to last item
   */
  last(): void {
    this.currentIndex = this.items.length - 1;
    this.updateTabIndexes();
    this.focusCurrent();
  }

  /**
   * Set specific item as current
   */
  setCurrent(index: number): void {
    if (index >= 0 && index < this.items.length) {
      this.currentIndex = index;
      this.updateTabIndexes();
    }
  }

  private updateTabIndexes(): void {
    this.items.forEach((item, index) => {
      item.setAttribute('tabindex', index === this.currentIndex ? '0' : '-1');
    });
  }

  private focusCurrent(): void {
    this.items[this.currentIndex]?.focus();
  }
}

/**
 * Reduced motion detection
 */
export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * High contrast mode detection
 */
export function prefersHighContrast(): boolean {
  return window.matchMedia('(prefers-contrast: high)').matches;
}

/**
 * Create accessible modal
 */
export function setupAccessibleModal(modalElement: HTMLElement): () => void {
  const cleanup = globalFocusManager.trapFocus(modalElement);

  // Announce modal opening
  globalAnnouncer.announce('Dialog opened', 'assertive');

  // Prevent body scroll
  const previousOverflow = document.body.style.overflow;
  document.body.style.overflow = 'hidden';

  return () => {
    cleanup();
    document.body.style.overflow = previousOverflow;
    globalAnnouncer.announce('Dialog closed', 'polite');
  };
}
