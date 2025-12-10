/**
 * Sidebar prefetch utilities
 * Maps navigation items to their corresponding prefetch functions
 */
import { prefetch } from './prefetch';

/**
 * Map of view IDs to their prefetch functions
 */
const prefetchMap: Record<string, () => void> = {
  pods: () => prefetch.pods(),
  nodes: () => prefetch.nodes(),
  namespaces: () => prefetch.namespaces(),
  topology: () => prefetch.topology(),
  dashboard: () => {
    // Prefetch summary data for dashboard
    prefetch.namespaces();
    prefetch.pods();
    prefetch.nodes();
  },
  deployments: () => prefetch.pods(), // Deployments use pods data
  services: () => prefetch.pods(), // Services related to pods
  statefulsets: () => prefetch.pods(),
  daemonsets: () => prefetch.pods(),
};

/**
 * Prefetch data for a given view ID
 * @param viewId - The view ID to prefetch data for
 */
export function prefetchView(viewId: string): void {
  const prefetchFn = prefetchMap[viewId];
  if (prefetchFn) {
    try {
      prefetchFn();
    } catch (error) {
      // Silently fail - prefetch is optional
      console.debug('Prefetch failed for view:', viewId, error);
    }
  }
}

/**
 * Check if a view has prefetch support
 */
export function hasPrefetch(viewId: string): boolean {
  return viewId in prefetchMap;
}
