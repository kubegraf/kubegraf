import { createSignal } from 'solid-js';
import { api, type ClusterEntry, type DiscoveredKubeconfig, type ClusterManagerStatus, type ClusterConnectPayload, type RuntimeClusterContext } from '../services/api';
import { addNotification, setCurrentView } from './ui';
import { wsService } from '../services/websocket';

const [clusters, setClusters] = createSignal<ClusterEntry[]>([]);
const [discoveredClusters, setDiscoveredClusters] = createSignal<DiscoveredKubeconfig[]>([]);
const [runtimeContexts, setRuntimeContexts] = createSignal<RuntimeClusterContext[]>([]);
const [clusterManagerStatus, setClusterManagerStatus] = createSignal<ClusterManagerStatus | null>(null);
const [clusterLoading, setClusterLoading] = createSignal(false);

async function refreshClusterData() {
  setClusterLoading(true);
  try {
    const data = await api.getClusters();
    setClusters(data.clusters || []);
    setDiscoveredClusters(data.discovered || []);
    setClusterManagerStatus(data.status || null);
    setRuntimeContexts(data.contexts || []);
  } catch (err) {
    console.error('Failed to load clusters', err);
  } finally {
    setClusterLoading(false);
  }
}

async function refreshClusterStatus() {
  try {
    const status = await api.getClusterManagerStatus();
    setClusterManagerStatus(status);
  } catch (err) {
    console.error('Failed to fetch cluster status', err);
  }
}

async function connectToCluster(payload: ClusterConnectPayload) {
  setClusterLoading(true);
  try {
    const result = await api.connectCluster(payload);
    const targetName = result.cluster?.name || payload.name || 'cluster';
    addNotification(`Connected to ${targetName}`, 'success');
    setClusterManagerStatus(result.status || null);
    await refreshClusterData();
  } catch (err: any) {
    addNotification(err?.message || 'Failed to connect to cluster', 'error');
    throw err;
  } finally {
    setClusterLoading(false);
  }
}

async function disconnectActiveCluster() {
  setClusterLoading(true);
  try {
    const result = await api.disconnectCluster();
    setClusterManagerStatus(result.status || null);
    addNotification('Cluster disconnected', 'info');
    await refreshClusterData();
  } catch (err: any) {
    addNotification(err?.message || 'Failed to disconnect cluster', 'error');
    throw err;
  } finally {
    setClusterLoading(false);
  }
}

async function setDefaultCluster(entry: ClusterEntry) {
  if (!entry) return;
  await connectToCluster({
    name: entry.name,
    provider: entry.provider,
    kubeconfigPath: entry.kubeconfigPath,
    makeDefault: true,
  });
  addNotification(`${entry.name} set as default cluster`, 'success');
}

function goToClusterManager() {
  setCurrentView('clustermanager');
}

wsService.subscribe((msg) => {
  if (msg.type === 'cluster_status') {
    setClusterManagerStatus(msg.data as ClusterManagerStatus);
  }
});

export {
  clusters,
  discoveredClusters,
  runtimeContexts,
  clusterManagerStatus,
  clusterLoading,
  refreshClusterData,
  refreshClusterStatus,
  connectToCluster,
  disconnectActiveCluster,
  setDefaultCluster,
  goToClusterManager,
};
