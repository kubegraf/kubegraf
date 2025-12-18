import { createSignal } from 'solid-js';
import { Incident } from '../services/api';

// Global cache for incidents data
const [cachedIncidents, setCachedIncidents] = createSignal<Incident[]>([]);
const [lastFetchTime, setLastFetchTime] = createSignal<number>(0);
const [isFetching, setIsFetching] = createSignal(false);

// Cache duration in ms (30 seconds)
const CACHE_DURATION = 30000;

export function getCachedIncidents(): Incident[] {
  return cachedIncidents();
}

export function setCachedIncidentsData(incidents: Incident[]) {
  setCachedIncidents(incidents);
  setLastFetchTime(Date.now());
}

export function isCacheValid(): boolean {
  const now = Date.now();
  return now - lastFetchTime() < CACHE_DURATION && cachedIncidents().length > 0;
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

export { cachedIncidents, lastFetchTime };

