import { createSignal, createContext, useContext, createEffect, batch } from 'solid-js';

// ============================================================================
// Types
// ============================================================================

export type Theme = 'dark' | 'dark-compact';

export interface ResourceCacheEntry<T> {
  data: T;
  lastUpdated: number;
  key: string;
}

export interface ResourceCache {
  pods: ResourceCacheEntry<any[]> | null;
  deployments: ResourceCacheEntry<any[]> | null;
  services: ResourceCacheEntry<any[]> | null;
  events: ResourceCacheEntry<any[]> | null;
  [key: string]: ResourceCacheEntry<any> | null;
}

export interface GlobalStoreState {
  selectedCluster: string;
  selectedNamespaces: string[];
  searchQuery: string;
  theme: Theme;
  sidebarCollapsed: boolean;
  globalLoading: boolean;
  aiPanelOpen: boolean;
  resourceCache: ResourceCache;
}

// ============================================================================
// Constants
// ============================================================================

const CACHE_TTL_MS = 15000; // 15 seconds
const STORAGE_KEYS = {
  CLUSTER: 'kubegraf:selectedCluster',
  NAMESPACES: 'kubegraf:selectedNamespaces',
  THEME: 'kubegraf:theme',
  SIDEBAR_COLLAPSED: 'kubegraf:sidebarCollapsed',
} as const;

// ============================================================================
// Helper Functions
// ============================================================================

function generateCacheKey(clusterName: string, namespaces: string[]): string {
  const sortedNamespaces = [...namespaces].sort().join(',');
  return `${clusterName}::${sortedNamespaces}`;
}

function isCacheFresh<T>(entry: ResourceCacheEntry<T> | null): boolean {
  if (!entry) return false;
  const age = Date.now() - entry.lastUpdated;
  return age < CACHE_TTL_MS;
}

function loadFromStorage<T>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined') return defaultValue;
  try {
    const stored = localStorage.getItem(key);
    if (!stored) return defaultValue;
    return JSON.parse(stored) as T;
  } catch {
    return defaultValue;
  }
}

function saveToStorage<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.warn(`Failed to save to localStorage: ${key}`, err);
  }
}

// ============================================================================
// Global Store Implementation
// ============================================================================

// Initialize state with localStorage persistence
const [selectedCluster, setSelectedClusterSignal] = createSignal<string>(
  loadFromStorage(STORAGE_KEYS.CLUSTER, '')
);

const [selectedNamespaces, setSelectedNamespacesSignal] = createSignal<string[]>(
  loadFromStorage(STORAGE_KEYS.NAMESPACES, [])
);

const [searchQuery, setSearchQuerySignal] = createSignal<string>('');

const [theme, setThemeSignal] = createSignal<Theme>(
  loadFromStorage(STORAGE_KEYS.THEME, 'dark')
);

const [sidebarCollapsed, setSidebarCollapsedSignal] = createSignal<boolean>(
  loadFromStorage(STORAGE_KEYS.SIDEBAR_COLLAPSED, false)
);

const [globalLoading, setGlobalLoadingSignal] = createSignal<boolean>(false);

const [aiPanelOpen, setAIPanelOpenSignal] = createSignal<boolean>(false);

const [resourceCache, setResourceCacheSignal] = createSignal<ResourceCache>({
  pods: null,
  deployments: null,
  services: null,
  events: null,
});

// ============================================================================
// Persistence Effects
// ============================================================================

// Persist selectedCluster to localStorage
createEffect(() => {
  const cluster = selectedCluster();
  saveToStorage(STORAGE_KEYS.CLUSTER, cluster);
});

// Persist selectedNamespaces to localStorage
createEffect(() => {
  const namespaces = selectedNamespaces();
  saveToStorage(STORAGE_KEYS.NAMESPACES, namespaces);
});

// Persist theme to localStorage
createEffect(() => {
  const currentTheme = theme();
  saveToStorage(STORAGE_KEYS.THEME, currentTheme);
});

// Persist sidebarCollapsed to localStorage
createEffect(() => {
  const collapsed = sidebarCollapsed();
  saveToStorage(STORAGE_KEYS.SIDEBAR_COLLAPSED, collapsed);
});

// ============================================================================
// Public API - Helper Methods
// ============================================================================

export function setCluster(clusterName: string): void {
  batch(() => {
    setSelectedClusterSignal(clusterName);
    // Clear cache when cluster changes
    setResourceCacheSignal({
      pods: null,
      deployments: null,
      services: null,
      events: null,
    });
  });
}

export function setNamespaces(namespaces: string[]): void {
  batch(() => {
    setSelectedNamespacesSignal([...namespaces].sort());
    // Clear cache when namespaces change
    setResourceCacheSignal({
      pods: null,
      deployments: null,
      services: null,
      events: null,
    });
  });
}

export function setSearchQuery(query: string): void {
  setSearchQuerySignal(query);
}

export function toggleSidebar(): void {
  setSidebarCollapsedSignal(prev => !prev);
}

export function setTheme(newTheme: Theme): void {
  setThemeSignal(newTheme);
}

export function setGlobalLoading(loading: boolean): void {
  setGlobalLoadingSignal(loading);
}

export function setAIPanelOpen(open: boolean): void {
  setAIPanelOpenSignal(open);
}

// ============================================================================
// Cache Management Functions
// ============================================================================

export function getCacheKey(): string {
  return generateCacheKey(selectedCluster(), selectedNamespaces());
}

export function getCachedResource<T>(
  resourceType: keyof ResourceCache
): ResourceCacheEntry<T> | null {
  const cache = resourceCache();
  const entry = cache[resourceType];
  if (!entry) return null;
  
  // Check if cache is still fresh
  if (isCacheFresh(entry)) {
    // Verify the cache key matches current cluster/namespaces
    const currentKey = getCacheKey();
    if (entry.key === currentKey) {
      return entry as ResourceCacheEntry<T>;
    }
  }
  
  return null;
}

export function setCachedResource<T>(
  resourceType: keyof ResourceCache,
  data: T
): void {
  const key = getCacheKey();
  const entry: ResourceCacheEntry<T> = {
    data,
    lastUpdated: Date.now(),
    key,
  };
  
  setResourceCacheSignal(prev => ({
    ...prev,
    [resourceType]: entry,
  }));
}

export function clearResourceCache(resourceType?: keyof ResourceCache): void {
  if (resourceType) {
    setResourceCacheSignal(prev => ({
      ...prev,
      [resourceType]: null,
    }));
  } else {
    // Clear all cache
    setResourceCacheSignal({
      pods: null,
      deployments: null,
      services: null,
      events: null,
    });
  }
}

// ============================================================================
// Exports
// ============================================================================

export {
  selectedCluster,
  selectedNamespaces,
  searchQuery,
  theme,
  sidebarCollapsed,
  globalLoading,
  aiPanelOpen,
  resourceCache,
};

// Context for optional provider pattern (if needed in future)
export const GlobalStoreContext = createContext<GlobalStoreState>();

export function useGlobalStore() {
  const context = useContext(GlobalStoreContext);
  if (!context) {
    // Return direct access if context not used
    return {
      selectedCluster,
      selectedNamespaces,
      searchQuery,
      theme,
      sidebarCollapsed,
      globalLoading,
      aiPanelOpen,
      resourceCache,
      setCluster,
      setNamespaces,
      setSearchQuery,
      toggleSidebar,
      setTheme,
      setGlobalLoading,
      setAIPanelOpen,
      getCacheKey,
      getCachedResource,
      setCachedResource,
      clearResourceCache,
    };
  }
  return context;
}


