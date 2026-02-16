// Copyright 2025 KubeGraf Contributors
// Simplified cluster management store based on industry standards
import { createSignal, createResource, createEffect } from 'solid-js';
import { fetchAPI } from '../services/api';
import { setCluster } from './globalStore';
import { refreshAll } from './cluster';

// Types
export interface ClusterInfo {
  name: string;
  contextName: string;
  kubeconfigPath: string;
  isActive: boolean;
  isReachable: boolean;
  error?: string;
}

export interface ClusterListResponse {
  clusters: ClusterInfo[];
  current: ClusterInfo | null;
  success: boolean;
}

export interface ClusterSwitchResponse {
  success: boolean;
  contextName: string;
  message?: string;
  error?: string;
}

export interface ClusterHealthResponse {
  contextName: string;
  healthy: boolean;
  error?: string;
}

// State
const [clusters, setClusters] = createSignal<ClusterInfo[]>([]);
const [currentCluster, setCurrentCluster] = createSignal<ClusterInfo | null>(null);
const [loading, setLoading] = createSignal(false);
const [error, setError] = createSignal<string | null>(null);

// Clear error after timeout
const clearErrorTimeout = () => {
  setTimeout(() => setError(null), 5000);
};

// Fetch clusters from API
const fetchClusters = async (checkHealth = false): Promise<ClusterListResponse> => {
  const url = checkHealth ? '/v2/clusters?checkHealth=true' : '/v2/clusters';
  return fetchAPI<ClusterListResponse>(url);
};

// Resource for automatic data fetching
const [clustersResource, { refetch: refetchClusters }] = createResource(fetchClusters);

// Update local state when resource loads
createEffect(() => {
  const data = clustersResource();
  if (data) {
    setClusters(data.clusters || []);
    setCurrentCluster(data.current || null);
  }
});

// Actions

/**
 * Switch to a different cluster
 * @param contextName - The context name of the cluster to switch to
 */
export const switchCluster = async (contextName: string): Promise<ClusterSwitchResponse> => {
  setLoading(true);
  setError(null);

  try {
    const response = await fetchAPI<ClusterSwitchResponse>('/v2/clusters/switch', {
      method: 'POST',
      body: JSON.stringify({ contextName }),
    });

    if (!response.success) {
      throw new Error(response.error || 'Failed to switch cluster');
    }

    // Update global store to trigger cache invalidation and UI updates
    setCluster(contextName);

    // Refresh all resources including namespaces
    refreshAll();

    // Refresh cluster list to get updated state
    await refetchClusters();

    // Return success
    return response;
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    setError(errorMsg);
    clearErrorTimeout();
    throw err;
  } finally {
    setLoading(false);
  }
};

/**
 * Refresh the cluster list from kubeconfig and check health
 */
export const refreshClusters = async (): Promise<void> => {
  setLoading(true);
  setError(null);

  try {
    const response = await fetchAPI<{ success: boolean; message?: string; error?: string }>(
      '/v2/clusters/refresh',
      { method: 'POST' }
    );

    if (!response.success) {
      throw new Error(response.error || 'Failed to refresh clusters');
    }

    // Wait a bit for health checks to complete
    await new Promise(resolve => setTimeout(resolve, 500));

    // Refresh the data with health check
    const data = await fetchClusters(true);
    setClusters(data.clusters || []);
    setCurrentCluster(data.current || null);

    // Poll for updated health status
    setTimeout(async () => {
      const updatedData = await fetchClusters(false);
      setClusters(updatedData.clusters || []);
      setCurrentCluster(updatedData.current || null);
    }, 3000);
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    setError(`Failed to refresh clusters: ${errorMsg}`);
    clearErrorTimeout();
    throw err;
  } finally {
    setLoading(false);
  }
};

/**
 * Check health of all clusters in the background
 */
export const checkAllClustersHealth = async (): Promise<void> => {
  try {
    // Trigger health check
    const data = await fetchClusters(true);

    // Poll for updated results after health checks complete
    setTimeout(async () => {
      const updatedData = await fetchClusters(false);
      setClusters(updatedData.clusters || []);
      setCurrentCluster(updatedData.current || null);
    }, 4000); // Wait 4 seconds for health checks to complete

  } catch (err) {
    console.error('Failed to check cluster health:', err);
  }
};

/**
 * Check health of a specific cluster
 * @param contextName - Optional context name (defaults to current cluster)
 */
export const checkClusterHealth = async (
  contextName?: string
): Promise<ClusterHealthResponse> => {
  const url = contextName ? `/v2/clusters/health?context=${contextName}` : '/v2/clusters/health';
  return fetchAPI<ClusterHealthResponse>(url);
};

/**
 * Get a cluster by context name
 * @param contextName - The context name to find
 */
export const getClusterByContext = (contextName: string): ClusterInfo | undefined => {
  return clusters().find((c) => c.contextName === contextName);
};

/**
 * Get the currently active cluster
 */
export const getActiveCluster = (): ClusterInfo | null => {
  return currentCluster();
};

/**
 * Check if a cluster is currently selected
 */
export const hasActiveCluster = (): boolean => {
  return currentCluster() !== null;
};

/**
 * Get display-friendly cluster name
 */
export const getClusterDisplayName = (cluster: ClusterInfo): string => {
  return cluster.name || cluster.contextName;
};

// Computed signals

/**
 * Get all reachable clusters
 */
export const getReachableClusters = () => {
  return clusters().filter((c) => c.isReachable);
};

/**
 * Get all unreachable clusters
 */
export const getUnreachableClusters = () => {
  return clusters().filter((c) => !c.isReachable);
};

/**
 * Get cluster count
 */
export const getClusterCount = () => {
  return clusters().length;
};

/**
 * Check if any cluster is active
 */
export const getHasActiveCluster = () => {
  return currentCluster() !== null;
};

// API Status tracking

/**
 * Get the loading state
 */
export const isLoading = loading;

/**
 * Get the error state
 */
export const getError = error;

/**
 * Clear the error state
 */
export const clearError = () => {
  setError(null);
};

// Derived state

/**
 * Check if we have clusters loaded
 */
export const hasClusters = () => {
  return clusters().length > 0;
};

/**
 * Get cluster count summary
 */
export const getClusterSummary = () => {
  const all = clusters();
  const reachable = all.filter((c) => c.isReachable);
  const active = all.filter((c) => c.isActive);

  return {
    total: all.length,
    reachable: reachable.length,
    unreachable: all.length - reachable.length,
    active: active.length,
  };
};

/**
 * Export all for use in components
 */
export const clusterSimpleStore = {
  // State
  clusters,
  currentCluster,
  loading,
  error,
  clustersResource,

  // Actions
  switchCluster,
  refreshClusters,
  checkClusterHealth,
  checkAllClustersHealth,
  clearError,

  // Getters
  getClusterByContext,
  getActiveCluster,
  hasActiveCluster,
  getClusterDisplayName,
  getReachableClusters,
  getUnreachableClusters,
  getClusterCount,
  hasClusters,
  isLoading,
  getError,
  getHasActiveCluster,
  getClusterSummary,

  // Resource actions
  refetchClusters,
};
