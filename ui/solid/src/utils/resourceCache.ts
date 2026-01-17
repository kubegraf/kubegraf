import { createSignal, createEffect, onCleanup } from 'solid-js';
import {
  getCachedResource,
  setCachedResource,
  getCacheKey,
  type ResourceCacheEntry,
} from '../stores/globalStore';

// ============================================================================
// Types
// ============================================================================

export interface CacheOptions {
  ttl?: number; // Time to live in milliseconds (default: 15000)
  backgroundRefresh?: boolean; // Whether to refresh in background (default: true)
}

export interface CachedResourceResult<T> {
  data: () => T | undefined;
  loading: () => boolean;
  error: () => Error | undefined;
  refetch: () => Promise<void>;
}

// ============================================================================
// Resource Cache Utility
// ============================================================================

/**
 * Creates a cached resource with background refresh capability.
 * 
 * @param resourceType - The type of resource (e.g., 'pods', 'deployments')
 * @param fetchFn - Function that fetches the resource data
 * @param options - Cache options (TTL, background refresh)
 * @returns Reactive signals for data, loading, error, and refetch function
 */
export function createCachedResource<T>(
  resourceType: keyof import('../stores/globalStore').ResourceCache,
  fetchFn: () => Promise<T>,
  options: CacheOptions = {}
): CachedResourceResult<T> {
  const { ttl = 15000, backgroundRefresh = true } = options;
  
  const [data, setData] = createSignal<T | undefined>(undefined);
  const [loading, setLoading] = createSignal<boolean>(false);
  const [error, setError] = createSignal<Error | undefined>(undefined);
  const [isInitialLoad, setIsInitialLoad] = createSignal<boolean>(true);
  const [lastCacheKey, setLastCacheKey] = createSignal<string>('');

  // Check cache and load if available
  const loadFromCache = (): boolean => {
    const cached = getCachedResource<T>(resourceType);
    if (cached) {
      setData(cached.data);
      setError(undefined);
      return true;
    }
    return false;
  };

  // Fetch fresh data from API
  const fetchFresh = async (isBackground = false): Promise<void> => {
    if (!isBackground) {
      setLoading(true);
    }
    setError(undefined);

    try {
      const freshData = await fetchFn();
      
      // Update cache
      setCachedResource(resourceType, freshData);
      
      // Update data signal
      setData(freshData);
      
      if (isInitialLoad()) {
        setIsInitialLoad(false);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      
      // If we have cached data, keep it even on error
      if (!data()) {
        loadFromCache();
      }
    } finally {
      if (!isBackground) {
        setLoading(false);
      }
    }
  };

  // Initial load: check cache first, then fetch in background if needed
  const initialLoad = async (skipCache = false): Promise<void> => {
    const currentKey = getCacheKey();
    const cacheKeyChanged = currentKey !== lastCacheKey();
    
    // If cache key changed, skip cache and fetch fresh
    if (skipCache || cacheKeyChanged) {
      setLastCacheKey(currentKey);
      await fetchFresh(false);
      return;
    }
    
    // Only load from cache if data is not already set
    if (!data()) {
      const hasCache = loadFromCache();
      
      if (hasCache && backgroundRefresh) {
        // Return cached data immediately, refresh in background
        setLastCacheKey(currentKey);
        setIsInitialLoad(false);
        fetchFresh(true).catch(err => {
          console.warn(`Background refresh failed for ${resourceType}:`, err);
        });
      } else {
        // No cache or background refresh disabled, fetch immediately
        setLastCacheKey(currentKey);
        await fetchFresh(false);
      }
    } else {
      // Data already set, just update cache key
      setLastCacheKey(currentKey);
    }
  };

  // Refetch function (public API)
  const refetch = async (): Promise<void> => {
    await fetchFresh(false);
  };

  // Auto-refresh when cache key changes (cluster/namespaces change)
  let refreshTimer: ReturnType<typeof setInterval> | null = null;
  
  createEffect(() => {
    const currentKey = getCacheKey();
    const cacheKeyChanged = currentKey !== lastCacheKey();
    
    // Clear existing timer
    if (refreshTimer) {
      clearInterval(refreshTimer);
      refreshTimer = null;
    }
    
    // If cache key changed (namespace/cluster changed), clear data immediately
    // to prevent showing stale data from previous namespace/cluster
    if (cacheKeyChanged && lastCacheKey() !== '') {
      setData(undefined);
      setError(undefined);
    }
    
    // Initial load (will skip cache if key changed)
    initialLoad(cacheKeyChanged);
    
    // Set up periodic refresh if background refresh is enabled
    if (backgroundRefresh) {
      refreshTimer = setInterval(() => {
        // Only refresh when tab is visible to save resources
        if (document.hidden) return;

        const cached = getCachedResource<T>(resourceType);
        if (cached) {
          const age = Date.now() - cached.lastUpdated;
          // Refresh if cache is older than TTL
          if (age >= ttl) {
            fetchFresh(true).catch(err => {
              console.warn(`Background refresh failed for ${resourceType}:`, err);
            });
          }
        }
      }, Math.min(ttl, 15000)); // Check every 15 seconds or TTL, whichever is smaller
    }
  });

  onCleanup(() => {
    if (refreshTimer) {
      clearInterval(refreshTimer);
    }
  });

  return {
    data,
    loading,
    error,
    refetch,
  };
}

/**
 * Creates a skeleton loader component data structure
 */
export function createSkeletonData<T>(count: number, template: () => T): T[] {
  return Array.from({ length: count }, template);
}


