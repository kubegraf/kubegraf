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

// Per-cluster operation state tracking
export type ClusterOperationType = 'selecting' | 'reconnecting' | null;
export interface ClusterOperationState {
  clusterId: string;
  operation: ClusterOperationType;
  error?: string;
}

const [enhancedClusters, setEnhancedClusters] = createSignal<EnhancedCluster[]>([]);
const [activeCluster, setActiveCluster] = createSignal<EnhancedCluster | null>(null);
const [sources, setSources] = createSignal<ClusterSource[]>([]);
// Start with loading=true since we fetch on module load
const [loading, setLoading] = createSignal(true);
// Per-cluster operation states (key: clusterId, value: operation state)
const [clusterOperations, setClusterOperations] = createSignal<Map<string, ClusterOperationState>>(new Map());

// Track if auto-refresh is paused (e.g., during user interaction)
let autoRefreshPaused = false;

// Pause auto-refresh (call this when user starts interacting)
function pauseAutoRefresh() {
  autoRefreshPaused = true;
}

// Resume auto-refresh (call this when user stops interacting)
function resumeAutoRefresh() {
  autoRefreshPaused = false;
}

// Helper functions for per-cluster operation state management
function setClusterOperation(clusterId: string, operation: ClusterOperationType, error?: string) {
  const newMap = new Map(clusterOperations());
  if (operation === null) {
    newMap.delete(clusterId);
  } else {
    newMap.set(clusterId, { clusterId, operation, error });
  }
  setClusterOperations(newMap);
}

function getClusterOperation(clusterId: string): ClusterOperationState | undefined {
  return clusterOperations().get(clusterId);
}

function isClusterOperating(clusterId: string): boolean {
  return clusterOperations().has(clusterId);
}

function clearClusterOperation(clusterId: string) {
  setClusterOperation(clusterId, null);
}

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
  // Set per-cluster operation state instead of global loading
  setClusterOperation(clusterId, 'selecting');
  try {
    const result = await api.selectCluster(clusterId);

    // Optimistically update local state to reflect the selection
    const clusters = enhancedClusters();
    const updatedClusters = clusters.map(c => ({
      ...c,
      active: c.clusterId === clusterId,
      // If this is the selected cluster, mark it as connected/connecting
      status: c.clusterId === clusterId ? 'CONNECTED' as const : c.status,
      connected: c.clusterId === clusterId ? true : c.connected,
    }));
    setEnhancedClusters(updatedClusters);

    // Update active cluster
    const selected = clusters.find(c => c.clusterId === clusterId);
    if (selected) {
      setActiveCluster({ ...selected, active: true, status: 'CONNECTED', connected: true });
    }

    // Refresh from server to get accurate state after a short delay
    setTimeout(async () => {
      await refreshEnhancedClusters();
      await refreshSources();
    }, 1000);

    // Clear operation state on success
    clearClusterOperation(clusterId);
  } catch (err: any) {
    console.error('Failed to select cluster', err);
    // Set error state on the cluster operation
    setClusterOperation(clusterId, 'selecting', err?.message || 'Failed to select cluster');
    // Clear after a few seconds so user can retry
    setTimeout(() => clearClusterOperation(clusterId), 3000);
    throw err;
  }
}

async function reconnectCluster(clusterId: string) {
  // Set per-cluster operation state
  setClusterOperation(clusterId, 'reconnecting');
  try {
    // Optimistically show connecting state
    const clusters = enhancedClusters();
    const updatedClusters = clusters.map(c => ({
      ...c,
      status: c.clusterId === clusterId ? 'CONNECTING' as const : c.status,
    }));
    setEnhancedClusters(updatedClusters);

    const result = await api.reconnectCluster(clusterId);

    // Update to connected state after successful reconnect
    const reconnectedClusters = enhancedClusters().map(c => ({
      ...c,
      status: c.clusterId === clusterId ? 'CONNECTED' as const : c.status,
      connected: c.clusterId === clusterId ? true : c.connected,
      lastError: c.clusterId === clusterId ? undefined : c.lastError,
    }));
    setEnhancedClusters(reconnectedClusters);

    // Refresh from server to get accurate state
    setTimeout(async () => {
      await refreshEnhancedClusters();
    }, 1000);

    // Clear operation state on success
    clearClusterOperation(clusterId);
  } catch (err: any) {
    console.error('Failed to reconnect cluster', err);
    // Update cluster to show error state
    const clusters = enhancedClusters();
    const updatedClusters = clusters.map(c => ({
      ...c,
      status: c.clusterId === clusterId ? 'DISCONNECTED' as const : c.status,
      lastError: c.clusterId === clusterId ? (err?.message || 'Failed to reconnect') : c.lastError,
    }));
    setEnhancedClusters(updatedClusters);

    // Set error state on the cluster operation
    setClusterOperation(clusterId, 'reconnecting', err?.message || 'Failed to reconnect');
    // Clear after a few seconds so user can retry
    setTimeout(() => clearClusterOperation(clusterId), 3000);
    throw err;
  }
}

async function disconnectCluster() {
  setLoading(true);
  try {
    await api.disconnectCluster();

    // Optimistically update local state
    setActiveCluster(null);
    const clusters = enhancedClusters();
    const updatedClusters = clusters.map(c => ({
      ...c,
      active: false,
      connected: false,
      status: 'DISCONNECTED' as const,
    }));
    setEnhancedClusters(updatedClusters);

    // Refresh from server to get accurate state
    setTimeout(async () => {
      await refreshEnhancedClusters();
    }, 500);
  } catch (err) {
    console.error('Failed to disconnect cluster', err);
    throw err;
  } finally {
    setLoading(false);
  }
}

// Auto-refresh - only when on cluster manager page and not paused
// Uses shorter interval (5s) when on cluster manager page to pick up background health check updates
// Backend now returns INSTANTLY with cached status, so frequent polling is fine
let refreshInterval: ReturnType<typeof setInterval> | null = null;
let statusPollInterval: ReturnType<typeof setInterval> | null = null;
let isOnClusterManagerPage = false;
let autoRefreshInitialized = false;

// Call this when navigating to cluster manager page
function enableClusterManagerRefresh() {
  isOnClusterManagerPage = true;
  // Do initial refresh when entering the page
  refreshEnhancedClustersCached();
  refreshSources();

  // Start faster polling for status updates (backend returns instantly)
  if (statusPollInterval) {
    clearInterval(statusPollInterval);
  }
  statusPollInterval = setInterval(async () => {
    if (!autoRefreshPaused && isOnClusterManagerPage && !document.hidden) {
      await refreshEnhancedClustersCached();
    }
  }, 15000); // Poll every 15 seconds - reduced from 5s to save resources
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
  // Uses cached endpoint for instant response
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
  clusterOperations,
  refreshEnhancedClusters,
  refreshEnhancedClustersCached,
  refreshSources,
  selectCluster,
  reconnectCluster,
  disconnectCluster,
  pauseAutoRefresh,
  resumeAutoRefresh,
  enableClusterManagerRefresh,
  disableClusterManagerRefresh,
  getClusterOperation,
  isClusterOperating,
};
