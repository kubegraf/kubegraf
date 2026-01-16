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
    console.log('[clusterEnhanced] Fast load clusters:', data.clusters?.length || 0, 'active:', data.active?.name);
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
    console.log('[clusterEnhanced] Full refresh clusters:', data.clusters?.length || 0, 'active:', data.active?.name);
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
    console.log('[clusterEnhanced] Loaded sources:', data.sources?.length || 0);
    setSources(data.sources || []);
  } catch (err) {
    console.error('[clusterEnhanced] Failed to load sources', err);
  }
}

async function selectCluster(clusterId: string) {
  setLoading(true);
  try {
    const result = await api.selectCluster(clusterId);
    console.log('Select cluster result:', result);

    // Immediate refresh to get status
    await refreshEnhancedClusters();
    await refreshSources();

    // Wait a moment for backend to reinitialize metrics collector
    console.log('Waiting for backend to reinitialize metrics collector...');
    await new Promise(resolve => setTimeout(resolve, 500));

    // Silent page reload to clear all stale data and show only new cluster's workloads
    console.log('Reloading page to switch to new cluster...');
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
    console.log('Reloading page after reconnect...');
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
    console.log('Reloading page after disconnect...');
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

  // Use cached endpoint for periodic refresh too (background health checks run on server)
  refreshInterval = setInterval(() => {
    refreshEnhancedClustersCached();
  }, 30000);
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
  console.log('[clusterEnhanced] Module loaded, starting auto-refresh with optimistic UI');
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
};
