import { createSignal } from 'solid-js';

// Session-persisted section open/close state.
// Keyed by section title.

const STORAGE_KEY = 'kubegraf-sidebar-open-sections';

function loadInitial(): Record<string, boolean> {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};
    const next = parsed as Record<string, boolean>;

    // Migrate old section title keys when titles change.
    // The sidebar section open/close state is keyed by title.
    if ('ML' in next && !('Machine learning' in next)) {
      next['Machine learning'] = !!next['ML'];
      delete next['ML'];
    }

    return next;
  } catch {
    return {};
  }
}

const [openSections, setOpenSections] = createSignal<Record<string, boolean>>(loadInitial());

function persist(next: Record<string, boolean>) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
}

/**
 * Ensure the store contains all sections.
 * Missing sections are initialized to their provided defaults.
 */
export function ensureSidebarSections(titles: string[], defaultOpenTitles: string[]) {
  const current = { ...(openSections() || {}) };
  const defaults = new Set(defaultOpenTitles);
  let changed = false;

  for (const t of titles) {
    if (!(t in current)) {
      current[t] = defaults.has(t);
      changed = true;
    }
  }

  // Remove keys for sections that no longer exist
  for (const k of Object.keys(current)) {
    if (!titles.includes(k)) {
      delete current[k];
      changed = true;
    }
  }

  if (changed) {
    setOpenSections(current);
    persist(current);
  }
}

export function isSidebarSectionOpen(title: string): boolean {
  return !!openSections()?.[title];
}

export function toggleSidebarSection(title: string) {
  const next = { ...(openSections() || {}) };
  next[title] = !next[title];
  setOpenSections(next);
  persist(next);
}

export function setSidebarSectionOpen(title: string, open: boolean) {
  const next = { ...(openSections() || {}) };
  next[title] = open;
  setOpenSections(next);
  persist(next);
}

export { openSections };
