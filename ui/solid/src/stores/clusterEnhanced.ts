import { createSignal } from 'solid-js';
import { api } from '../services/api';

// Enhanced cluster types
export interface EnhancedCluster {
  id: number;
  clusterId: string;
  name: string;
  contextName: string;
  sourceId?: number;
  provider: string;
  environment: string;
  kubeconfigPath: string;
  status: 'UNKNOWN' | 'CONNECTING' | 'CONNECTED' | 'DEGRADED' | 'DISCONNECTED' | 'AUTH_ERROR';
  connected: boolean;
  active: boolean;
  lastUsed?: string;
  lastChecked?: string;
  lastError?: string;
  consecutiveFailures: number;
  consecutiveSuccesses: number;
  isDefault: boolean;
}

export interface ClusterSource {
  id: number;
  name: string;
  type: 'default' | 'file' | 'inline';
  path?: string;
  contentPath?: string;
}

const [enhancedClusters, setEnhancedClusters] = createSignal<EnhancedCluster[]>([]);
const [activeCluster, setActiveCluster] = createSignal<EnhancedCluster | null>(null);
const [sources, setSources] = createSignal<ClusterSource[]>([]);
// Start with loading=true since we fetch on module load
const [loading, setLoading] = createSignal(true);

// Fast initial load using cached endpoint (optimistic UI pattern)
async function refreshEnhancedClustersCached() {
  try {
    const data = await api.getClustersEnhancedCached();
    setEnhancedClusters(data.clusters || []);
    setActiveCluster(data.active || null);
  } catch (err) {
    console.error('[clusterEnhanced] Failed to load cached clusters', err);
  } finally {
    setLoading(false);
  }
}

// Full refresh with health status (slower, use for manual refresh)
async function refreshEnhancedClusters() {
  setLoading(true);
  try {
    const data = await api.getClustersEnhanced();
    setEnhancedClusters(data.clusters || []);
    setActiveCluster(data.active || null);
  } catch (err) {
    console.error('[clusterEnhanced] Failed to load enhanced clusters', err);
  } finally {
    setLoading(false);
  }
}

async function refreshSources() {
  try {
    const data = await api.getClusterSources();
    setSources(data.sources || []);
  } catch (err) {
    console.error('[clusterEnhanced] Failed to load sources', err);
  }
}

async function selectCluster(clusterId: string) {
  setLoading(true);
  try {
    const result = await api.selectCluster(clusterId);

    // Immediate refresh to get status
    await refreshEnhancedClusters();
    await refreshSources();

    // Wait a moment for backend to reinitialize metrics collector
    await new Promise(resolve => setTimeout(resolve, 500));

    // Silent page reload to clear all stale data and show only new cluster's workloads
    window.location.reload();
  } catch (err: any) {
    console.error('Failed to select cluster', err);
    throw err;
  } finally {
    setLoading(false);
  }
}

async function reconnectCluster(clusterId: string) {
  setLoading(true);
  try {
    await api.reconnectCluster(clusterId);
    await refreshEnhancedClusters();

    // Silent page reload to clear all stale data
    window.location.reload();
  } catch (err) {
    console.error('Failed to reconnect cluster', err);
    throw err;
  } finally {
    setLoading(false);
  }
}

async function disconnectCluster() {
  setLoading(true);
  try {
    await api.disconnectCluster();
    setActiveCluster(null);
    await refreshEnhancedClusters();

    // Silent page reload to clear all cached data
    window.location.reload();
  } catch (err) {
    console.error('Failed to disconnect cluster', err);
    throw err;
  } finally {
    setLoading(false);
  }
}

// Auto-refresh - use a simple fixed interval to avoid infinite loops
let refreshInterval: ReturnType<typeof setInterval> | null = null;
let autoRefreshInitialized = false;
let statusPollInterval: ReturnType<typeof setInterval> | null = null;
let isOnClusterManagerPage = false;
let autoRefreshPaused = false;

// Call this when navigating to cluster manager page
function enableClusterManagerRefresh() {
  isOnClusterManagerPage = true;
  // Do initial refresh when entering the page
  refreshEnhancedClustersCached();
  refreshSources();

  // Start polling for status updates (backend returns instantly)
  // Use 15 second interval to reduce CPU usage while still being responsive
  if (statusPollInterval) {
    clearInterval(statusPollInterval);
  }
  statusPollInterval = setInterval(async () => {
    if (!autoRefreshPaused && isOnClusterManagerPage && !document.hidden) {
      await refreshEnhancedClustersCached();
    }
  }, 15000); // Poll every 15 seconds - backend returns cached data instantly
}

// Call this when leaving cluster manager page
function disableClusterManagerRefresh() {
  isOnClusterManagerPage = false;
  // Stop the fast polling
  if (statusPollInterval) {
    clearInterval(statusPollInterval);
    statusPollInterval = null;
  }
}

function startAutoRefresh() {
  // Prevent multiple initializations
  if (autoRefreshInitialized) return;
  autoRefreshInitialized = true;

  // Clear any existing interval
  if (refreshInterval) {
    clearInterval(refreshInterval);
  }

  // FAST initial load using cached endpoint (optimistic UI)
  refreshEnhancedClustersCached();
  refreshSources();

  // Background refresh every 60 seconds (for when not on cluster manager page)
  // Uses cached endpoint for instant response. Skip if tab hidden to save resources.
  refreshInterval = setInterval(async () => {
    if (!autoRefreshPaused && !isOnClusterManagerPage && !document.hidden) {
      await refreshEnhancedClustersCached();
    }
  }, 60000);
}

function stopAutoRefresh() {
  if (refreshInterval) {
    clearInterval(refreshInterval);
    refreshInterval = null;
  }
  autoRefreshInitialized = false;
}

// Initialize auto-refresh when module loads (only once)
if (typeof window !== 'undefined') {
  startAutoRefresh();
}

export {
  enhancedClusters,
  activeCluster,
  sources,
  loading,
  refreshEnhancedClusters,
  refreshEnhancedClustersCached,
  refreshSources,
  selectCluster,
  reconnectCluster,
  disconnectCluster,
  enableClusterManagerRefresh,
  disableClusterManagerRefresh,
};
