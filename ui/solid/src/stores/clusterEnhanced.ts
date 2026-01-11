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
    // Refresh clusters and sources to get updated status
    await refreshEnhancedClusters();
    await refreshSources();
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
  } catch (err) {
    console.error('Failed to reconnect cluster', err);
    throw err;
  } finally {
    setLoading(false);
  }
}

// Auto-refresh every 30 seconds
createEffect(() => {
  refreshEnhancedClusters();
  refreshSources();
  const interval = setInterval(() => {
    refreshEnhancedClusters();
  }, 30000);
  return () => clearInterval(interval);
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
};
