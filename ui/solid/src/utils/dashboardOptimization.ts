// Dashboard optimization utilities
// This file contains helpers to optimize dashboard loading and caching

/**
 * Optimize resource fetching by using parallel requests and caching
 */
export function createOptimizedResourceLoader<T>(
  fetchers: Array<() => Promise<T>>,
  options?: {
    timeout?: number;
    cacheKey?: string;
    cacheTTL?: number;
  }
): Promise<T[]> {
  const { timeout = 30000, cacheKey, cacheTTL = 10000 } = options || {};

  // Check cache if cacheKey provided
  if (cacheKey) {
    const cached = getCachedData<T[]>(cacheKey);
    if (cached) {
      return Promise.resolve(cached);
    }
  }

  // Create timeout promise
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('Request timeout')), timeout);
  });

  // Execute all fetchers in parallel
  const fetchPromise = Promise.all(fetchers.map(fn => fn()));

  return Promise.race([fetchPromise, timeoutPromise])
    .then((results) => {
      // Cache results if cacheKey provided
      if (cacheKey) {
        setCachedData(cacheKey, results, cacheTTL);
      }
      return results;
    });
}

/**
 * Cache helper with TTL
 */
function getCachedData<T>(key: string): T | null {
  try {
    const item = sessionStorage.getItem(`dashboard-cache-${key}`);
    if (!item) return null;

    const { data, expires } = JSON.parse(item);
    if (Date.now() > expires) {
      sessionStorage.removeItem(`dashboard-cache-${key}`);
      return null;
    }

    return data as T;
  } catch {
    return null;
  }
}

function setCachedData<T>(key: string, data: T, ttl: number): void {
  try {
    const item = {
      data,
      expires: Date.now() + ttl,
    };
    sessionStorage.setItem(`dashboard-cache-${key}`, JSON.stringify(item));
  } catch {
    // Ignore storage errors
  }
}

/**
 * Debounce function to prevent excessive API calls
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: number | null = null;
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };
    if (timeout !== null) {
      clearTimeout(timeout);
    }
    timeout = window.setTimeout(later, wait);
  };
}

