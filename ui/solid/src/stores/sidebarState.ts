import { createSignal } from 'solid-js';

/**
 * Sidebar v2 state management
 * Handles active section, pinned section, and hover states
 */

// Active section (currently hovered or clicked)
const [_activeSection, _setActiveSection] = createSignal<string | null>(null);

// Pinned section (stays open even when not hovered)
const [_pinnedSection, _setPinnedSection] = createSignal<string | null>(null);

// Hover timeout for delayed close
let hoverTimeout: ReturnType<typeof setTimeout> | null = null;

// Export getters as functions to avoid minification issues
export function activeSection(): string | null {
  return _activeSection();
}

export function pinnedSection(): string | null {
  return _pinnedSection();
}

export function setActiveSection(value: string | null): void {
  _setActiveSection(value);
}

export function setPinnedSection(value: string | null): void {
  _setPinnedSection(value);
}

/**
 * Set active section (opens flyout on hover)
 */
export function setActive(sectionTitle: string | null): void {
  if (hoverTimeout) {
    clearTimeout(hoverTimeout);
    hoverTimeout = null;
  }
  setActiveSection(sectionTitle);
}

/**
 * Pin a section (keeps flyout open)
 */
export function pinSection(sectionTitle: string | null): void {
  setPinnedSection(sectionTitle);
  setActiveSection(sectionTitle);
}

/**
 * Unpin current section
 */
export function unpinSection(): void {
  setPinnedSection(null);
}

/**
 * Close flyout with delay (prevents jitter)
 */
export function closeWithDelay(delay: number = 200): void {
  if (hoverTimeout) {
    clearTimeout(hoverTimeout);
  }
  hoverTimeout = setTimeout(() => {
    if (!pinnedSection()) {
      setActiveSection(null);
    }
    hoverTimeout = null;
  }, delay);
}

/**
 * Get the section that should be shown in flyout
 */
export function getVisibleSection(): string | null {
  const pinned = pinnedSection();
  if (pinned) return pinned;
  return activeSection();
}

/**
 * Check if a section is active
 */
export function isSectionActive(sectionTitle: string): boolean {
  const visible = getVisibleSection();
  return visible === sectionTitle;
}

/**
 * Check if a section is pinned
 */
export function isSectionPinned(sectionTitle: string): boolean {
  return pinnedSection() === sectionTitle;
}

