import { createSignal } from 'solid-js';
import { Incident } from '../services/api';

// Global cache for incidents data
const [cachedIncidents, setCachedIncidents] = createSignal<Incident[]>([]);
const [lastFetchTime, setLastFetchTime] = createSignal<number>(0);
const [isFetching, setIsFetching] = createSignal(false);
const [cachedClusterContext, setCachedClusterContext] = createSignal<string>('');

// Cache duration in ms (30 seconds)
const CACHE_DURATION = 30000;

export function getCachedIncidents(): Incident[] {
  return cachedIncidents();
}

export function setCachedIncidentsData(incidents: Incident[], clusterContext?: string) {
  setCachedIncidents(incidents);
  setLastFetchTime(Date.now());
  if (clusterContext) {
    setCachedClusterContext(clusterContext);
  }
}

export function isCacheValid(currentCluster?: string): boolean {
  const now = Date.now();
  const timeValid = now - lastFetchTime() < CACHE_DURATION;
  const hasData = cachedIncidents().length > 0;
  
  // If cluster context changed, cache is invalid
  if (currentCluster && cachedClusterContext() && currentCluster !== cachedClusterContext()) {
    return false;
  }
  
  return timeValid && hasData;
}

export function getIsFetching(): boolean {
  return isFetching();
}

export function setFetching(fetching: boolean) {
  setIsFetching(fetching);
}

export function getCacheAge(): number {
  return Date.now() - lastFetchTime();
}

// Invalidate cache (e.g., on cluster switch)
export function invalidateIncidentsCache() {
  setCachedIncidents([]);
  setLastFetchTime(0);
  setCachedClusterContext('');
}

// Get current cached cluster context
export function getCachedClusterContext(): string {
  return cachedClusterContext();
}

export { cachedIncidents, lastFetchTime };

