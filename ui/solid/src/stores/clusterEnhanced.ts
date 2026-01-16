import { createSignal, createEffect } from 'solid-js';
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
const [loading, setLoading] = createSignal(false);

async function refreshEnhancedClusters() {
  setLoading(true);
  try {
    const data = await api.getClustersEnhanced();
    setEnhancedClusters(data.clusters || []);
    setActiveCluster(data.active || null);
  } catch (err) {
    console.error('Failed to load enhanced clusters', err);
  } finally {
    setLoading(false);
  }
}

async function refreshSources() {
  try {
    const data = await api.getClusterSources();
    setSources(data.sources || []);
  } catch (err) {
    console.error('Failed to load sources', err);
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

// Auto-refresh - faster (5s) when any cluster is connecting, slower (30s) otherwise
let refreshInterval: ReturnType<typeof setInterval> | null = null;

function startAutoRefresh() {
  // Clear existing interval
  if (refreshInterval) {
    clearInterval(refreshInterval);
  }

  // Initial refresh
  refreshEnhancedClusters();
  refreshSources();

  // Check if any cluster is connecting and use faster interval
  const checkAndSchedule = () => {
    const clusters = enhancedClusters();
    const active = activeCluster();
    const isConnecting = clusters.some(c => c.status === 'CONNECTING') ||
                         active?.status === 'CONNECTING';

    // Use 5s interval when connecting, 30s otherwise
    const interval = isConnecting ? 5000 : 30000;

    if (refreshInterval) {
      clearInterval(refreshInterval);
    }

    refreshInterval = setInterval(async () => {
      await refreshEnhancedClusters();
      // Re-check interval after refresh in case status changed
      const newClusters = enhancedClusters();
      const newActive = activeCluster();
      const stillConnecting = newClusters.some(c => c.status === 'CONNECTING') ||
                              newActive?.status === 'CONNECTING';

      if (stillConnecting !== isConnecting) {
        // Status changed, reschedule with new interval
        checkAndSchedule();
      }
    }, interval);
  };

  checkAndSchedule();
}

createEffect(() => {
  startAutoRefresh();
  return () => {
    if (refreshInterval) {
      clearInterval(refreshInterval);
    }
  };
});

export {
  enhancedClusters,
  activeCluster,
  sources,
  loading,
  refreshEnhancedClusters,
  refreshSources,
  selectCluster,
  reconnectCluster,
  disconnectCluster,
};
