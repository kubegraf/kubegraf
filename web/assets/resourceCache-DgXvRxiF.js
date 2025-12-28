import { c as createSignal, n as createEffect, X as getCacheKey, Y as getCachedResource, E as onCleanup, Z as setCachedResource } from './index-NnaOo1cf.js';

function createCachedResource(resourceType, fetchFn, options = {}) {
  const { ttl = 15e3, backgroundRefresh = true } = options;
  const [data, setData] = createSignal(void 0);
  const [loading, setLoading] = createSignal(false);
  const [error, setError] = createSignal(void 0);
  const [isInitialLoad, setIsInitialLoad] = createSignal(true);
  const [lastCacheKey, setLastCacheKey] = createSignal("");
  const loadFromCache = () => {
    const cached = getCachedResource(resourceType);
    if (cached) {
      console.log(`[${resourceType}] Loading from cache, ${cached.data.length} items, age: ${Date.now() - cached.lastUpdated}ms`);
      setData(cached.data);
      setError(void 0);
      return true;
    }
    console.log(`[${resourceType}] No cache found`);
    return false;
  };
  const fetchFresh = async (isBackground = false) => {
    if (!isBackground) {
      setLoading(true);
    }
    setError(void 0);
    try {
      const freshData = await fetchFn();
      setCachedResource(resourceType, freshData);
      setData(freshData);
      if (isInitialLoad()) {
        setIsInitialLoad(false);
      }
    } catch (err) {
      const error2 = err instanceof Error ? err : new Error(String(err));
      setError(error2);
      if (!data()) {
        loadFromCache();
      }
    } finally {
      if (!isBackground) {
        setLoading(false);
      }
    }
  };
  const initialLoad = async (skipCache = false) => {
    const currentKey = getCacheKey();
    const cacheKeyChanged = currentKey !== lastCacheKey();
    if (skipCache || cacheKeyChanged) {
      setLastCacheKey(currentKey);
      await fetchFresh(false);
      return;
    }
    if (!data()) {
      const hasCache = loadFromCache();
      if (hasCache && backgroundRefresh) {
        setLastCacheKey(currentKey);
        setIsInitialLoad(false);
        fetchFresh(true).catch((err) => {
          console.warn(`Background refresh failed for ${resourceType}:`, err);
        });
      } else {
        setLastCacheKey(currentKey);
        await fetchFresh(false);
      }
    } else {
      setLastCacheKey(currentKey);
    }
  };
  const refetch = async () => {
    await fetchFresh(false);
  };
  let refreshTimer = null;
  createEffect(() => {
    const currentKey = getCacheKey();
    const cacheKeyChanged = currentKey !== lastCacheKey();
    if (refreshTimer) {
      clearInterval(refreshTimer);
      refreshTimer = null;
    }
    if (cacheKeyChanged && lastCacheKey() !== "") {
      console.log(`[${resourceType}] Cache key changed from ${lastCacheKey()} to ${currentKey}, clearing data and fetching fresh`);
      setData(void 0);
      setError(void 0);
    }
    initialLoad(cacheKeyChanged);
    if (backgroundRefresh) {
      refreshTimer = setInterval(() => {
        const cached = getCachedResource(resourceType);
        if (cached) {
          const age = Date.now() - cached.lastUpdated;
          if (age >= ttl) {
            fetchFresh(true).catch((err) => {
              console.warn(`Background refresh failed for ${resourceType}:`, err);
            });
          }
        }
      }, Math.min(ttl, 5e3));
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
    refetch
  };
}

export { createCachedResource as c };
//# sourceMappingURL=resourceCache-DgXvRxiF.js.map
