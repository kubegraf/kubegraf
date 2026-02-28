import { createSignal, createResource, createEffect, createMemo, onMount } from 'solid-js';
import { api, type WorkspaceContextPayload } from '../services/api';
import { logger } from '../utils/logger';

// Types
export interface ClusterContext {
  name: string;
  connected: boolean;
  serverVersion?: string;
  isCurrent: boolean;
}

export interface Pod {
  name: string;
  namespace: string;
  status: string;
  ready: string;
  restarts: number;
  age: string;
  node: string;
  ip: string;
}

export interface Deployment {
  name: string;
  namespace: string;
  ready: string;
  upToDate: number;
  available: number;
  age: string;
}

export interface Service {
  name: string;
  namespace: string;
  type: string;
  clusterIP: string;
  externalIP: string;
  ports: string;
  age: string;
}

export interface Node {
  name: string;
  status: string;
  roles: string;
  age: string;
  version: string;
  cpu: string;
  memory: string;
}

export interface ClusterStatus {
  connected: boolean;
  context: string;
  server: string;
  namespace: string;
  nodeCount: number;
  podCount: number;
  cpuUsage: number;
  memoryUsage: number;
}

const ALL_NAMESPACES_LABEL = 'All Namespaces';

// Reactive signals with fine-grained updates
const [namespaceLabel, setNamespaceLabel] = createSignal<string>(ALL_NAMESPACES_LABEL);
const namespace = namespaceLabel;
const [namespaces, setNamespaces] = createSignal<string[]>(['default']);
const [workspaceContext, setWorkspaceContext] = createSignal<WorkspaceContextPayload | null>(null);
const [workspaceVersion, setWorkspaceVersion] = createSignal<number>(0);
const [selectedNamespaces, setSelectedNamespacesSignal] = createSignal<string[]>([]);
const [workspaceLoading, setWorkspaceLoading] = createSignal<boolean>(false);
const [contexts, setContexts] = createSignal<ClusterContext[]>([]);
const [currentContext, setCurrentContext] = createSignal<string>('');
const [clusterSwitching, setClusterSwitching] = createSignal<boolean>(false);
const [clusterSwitchMessage, setClusterSwitchMessage] = createSignal<string>('');
const [clusterStatus, setClusterStatus] = createSignal<ClusterStatus>({
  connected: false,
  context: '',
  server: '',
  namespace: 'default',
  nodeCount: 0,
  podCount: 0,
  cpuUsage: 0,
  memoryUsage: 0,
});

function computeNamespaceLabel(selection: string[]): string {
  if (!selection || selection.length === 0) return ALL_NAMESPACES_LABEL;
  if (selection.length === 1) return selection[0];
  return `${selection.length} namespaces`;
}

function normalizeNamespaces(list: string[]): string[] {
  const deduped = Array.from(new Set(list.map(ns => ns.trim()).filter(Boolean)));
  return deduped.sort((a, b) => a.localeCompare(b));
}

function arraysEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

function applyWorkspaceContextState(ctx: WorkspaceContextPayload) {
  const safeSelection = normalizeNamespaces(ctx.selectedNamespaces || []);
  const filters = ctx.filters || {};
  setWorkspaceContext({
    selectedNamespaces: safeSelection,
    selectedCluster: ctx.selectedCluster || '',
    filters,
  });
  setSelectedNamespacesSignal(safeSelection);
  const labelSelection = (() => {
    if (filters.namespaceMode === 'all') {
      return [] as string[];
    }
    if (safeSelection.length === 0 && (filters.namespaceMode === 'default' || !filters.namespaceMode)) {
      const currentNs = clusterStatus().namespace;
      return currentNs ? [currentNs] : [];
    }
    return safeSelection;
  })();
  setNamespaceLabel(computeNamespaceLabel(labelSelection));
  setWorkspaceVersion(prev => prev + 1);
}

async function loadWorkspaceContext(): Promise<void> {
  if (workspaceLoading()) return;
  setWorkspaceLoading(true);
  try {
    const ctx = await api.getWorkspaceContext();
    applyWorkspaceContextState(ctx || { selectedNamespaces: [] });
  } catch (err) {
    logger.error('Cluster', 'Failed to load workspace context', err);
    applyWorkspaceContextState({ selectedNamespaces: [] });
  } finally {
    setWorkspaceLoading(false);
  }
}

// Initialize resources on first load - ensure they fetch when cluster connects
createEffect(() => {
  const connected = clusterStatus().connected;
  const version = workspaceVersion();
  
  // When cluster becomes connected, ensure resources fetch
  if (connected) {
    // If workspaceVersion is 0, increment it to trigger resource fetching
    if (version === 0) {
      logger.debug('Cluster', 'Cluster connected, triggering resource fetch (workspaceVersion: 0 -> 1)');
      setWorkspaceVersion(1);
    }
    // Also trigger immediate refetch to ensure data loads (with delay to let resources initialize)
    setTimeout(() => {
      if (clusterStatus().connected) {
        logger.debug('Cluster', 'Refetching resources after cluster connection');
        refetchPods();
        refetchDeployments();
        refetchServices();
        refetchNodes();
      }
    }, 500);
  } else {
    // When disconnected, reset workspaceVersion to 0 so resources will fetch again when reconnected
    if (version > 0) {
      logger.debug('Cluster', 'Cluster disconnected, resetting workspaceVersion');
      setWorkspaceVersion(0);
    }
  }
});

async function persistWorkspaceContext(next: WorkspaceContextPayload): Promise<void> {
  try {
    const updated = await api.updateWorkspaceContext({
      selectedNamespaces: next.selectedNamespaces || [],
      selectedCluster: next.selectedCluster || '',
      filters: next.filters || {},
    });
    applyWorkspaceContextState(updated || next);
  } catch (err) {
    logger.error('Cluster', 'Failed to update workspace context', err);
    throw err;
  }
}

type NamespaceMode = 'default' | 'all' | 'custom';

async function setSelectedNamespaces(names: string[], mode?: NamespaceMode): Promise<void> {
  const normalized = normalizeNamespaces(names);
  if (arraysEqual(selectedNamespaces(), normalized) && (!mode || mode === (workspaceContext()?.filters?.namespaceMode as NamespaceMode))) {
    return;
  }
  const base = workspaceContext() || { selectedNamespaces: [], selectedCluster: '', filters: {} };
  const filters = { ...(base.filters || {}) };
  let namespaceMode: NamespaceMode;
  if (mode) {
    namespaceMode = mode;
  } else {
    namespaceMode = normalized.length === 0 ? 'default' : 'custom';
  }
  filters.namespaceMode = namespaceMode;
  await persistWorkspaceContext({
    selectedNamespaces: normalized,
    selectedCluster: base.selectedCluster,
    filters,
  });
}

async function resetWorkspaceContext(): Promise<void> {
  const base = workspaceContext() || { selectedNamespaces: [], selectedCluster: '', filters: {} };
  await persistWorkspaceContext({
    selectedNamespaces: [],
    selectedCluster: base.selectedCluster,
    filters: { ...(base.filters || {}), namespaceMode: 'default' },
  });
}

async function setNamespace(value: string): Promise<void> {
  try {
    // Update the namespace label immediately for Pods.tsx reactivity
    setNamespaceLabel(value);
    
    // Also update workspace context for persistence
    if (!value || value === '_all' || value === ALL_NAMESPACES_LABEL) {
      await setSelectedNamespaces([], 'all');
    } else {
      await setSelectedNamespaces([value], 'custom');
    }
  } catch (err) {
    logger.error('Cluster', 'Failed to set namespace', err);
  }
}

// API fetch functions
async function fetchNamespaces(): Promise<string[]> {
  return await api.getNamespaceNames();
}

async function fetchPods(): Promise<Pod[]> {
  logger.debug('Cluster', 'Fetching pods from /api/pods?namespace= (all namespaces)');
  try {
    // Always request all namespaces for shared cluster resources used by overview-level pages.
    const res = await fetch('/api/pods?namespace=');
    if (!res.ok) {
      const errorText = await res.text();
      logger.error('Cluster', `Failed to fetch pods: ${res.status} ${res.statusText}`, { errorText });
      throw new Error(`Failed to fetch pods: ${res.status} ${res.statusText}`);
    }
    const data = await res.json();
    const pods = Array.isArray(data) ? data : (data.pods || []);
    logger.debug('Cluster', `Fetched ${pods.length} pods`);
    if (pods.length > 0) {
      logger.debug('Cluster', 'Sample pod', { name: pods[0].name, namespace: pods[0].namespace, status: pods[0].status });
    }
    return pods;
  } catch (error) {
    logger.error('Cluster', 'Error fetching pods', error);
    throw error;
  }
}

async function fetchDeployments(): Promise<Deployment[]> {
  logger.debug('Cluster', 'Fetching deployments from /api/deployments?namespace= (all namespaces)');
  try {
    // Always request all namespaces for shared cluster resources used by overview-level pages.
    const res = await fetch('/api/deployments?namespace=');
    if (!res.ok) {
      const errorText = await res.text();
      logger.error('Cluster', `Failed to fetch deployments: ${res.status} ${res.statusText}`, { errorText });
      throw new Error(`Failed to fetch deployments: ${res.status} ${res.statusText}`);
    }
    const data = await res.json();
    const deployments = Array.isArray(data) ? data : (data.deployments || []);
    logger.debug('Cluster', `Fetched ${deployments.length} deployments`);
    if (deployments.length > 0) {
      logger.debug('Cluster', 'Sample deployment', { name: deployments[0].name, namespace: deployments[0].namespace, ready: deployments[0].ready });
    }
    return deployments;
  } catch (error) {
    logger.error('Cluster', 'Error fetching deployments', error);
    throw error;
  }
}

async function fetchServices(): Promise<Service[]> {
  logger.debug('Cluster', 'Fetching services from /api/services');
  try {
    const res = await fetch('/api/services');
    if (!res.ok) {
      const errorText = await res.text();
      logger.error('Cluster', `Failed to fetch services: ${res.status} ${res.statusText}`, { errorText });
      throw new Error(`Failed to fetch services: ${res.status} ${res.statusText}`);
    }
    const data = await res.json();
    // Handle both old format (array) and new format (object with services array)
    const services = Array.isArray(data) ? data : (data.services || []);
    logger.debug('Cluster', `Fetched ${services.length} services`);
    return services;
  } catch (error) {
    logger.error('Cluster', 'Error fetching services', error);
    throw error;
  }
}

async function fetchNodes(): Promise<Node[]> {
  logger.debug('Cluster', 'Fetching nodes from /api/nodes');
  try {
    const res = await fetch('/api/nodes');
    if (!res.ok) {
      const errorText = await res.text();
      logger.error('Cluster', `Failed to fetch nodes: ${res.status} ${res.statusText}`, { errorText });
      throw new Error(`Failed to fetch nodes: ${res.status} ${res.statusText}`);
    }
    const data = await res.json();
    // Handle both old format (array) and new format (object with nodes array)
    const nodes = Array.isArray(data) ? data : (data.nodes || []);
    logger.debug('Cluster', `Fetched ${nodes.length} nodes`);
    return nodes;
  } catch (error) {
    logger.error('Cluster', 'Error fetching nodes', error);
    throw error;
  }
}

async function fetchClusterStatus(): Promise<ClusterStatus> {
  const res = await fetch('/api/status');
  if (!res.ok) throw new Error('Failed to fetch status');
  const data = await res.json();
  return {
    connected: data.connected || false,
    context: data.cluster || data.context || '',
    server: data.server || '',
    namespace: data.namespace || 'default',
    nodeCount: data.nodeCount || 0,
    podCount: data.podCount || 0,
    cpuUsage: data.cpuUsage || 0,
    memoryUsage: data.memoryUsage || 0,
  };
}

async function fetchContexts(): Promise<ClusterContext[]> {
  const res = await fetch('/api/contexts');
  if (!res.ok) throw new Error('Failed to fetch contexts');
  const data = await res.json();
  return data.contexts || [];
}

// Switch context and refresh all data
async function switchContext(contextName: string): Promise<void> {
  setClusterSwitching(true);
  setClusterSwitchMessage(`Switching to ${contextName}...`);

  try {
    const res = await fetch('/api/contexts/switch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ context: contextName }),
    });
    if (!res.ok) throw new Error('Failed to switch context');

    setCurrentContext(contextName);
    setClusterSwitchMessage(`Loading resources from ${contextName}...`);

    refreshAll();

    const ctxData = await fetchContexts();
    setContexts(ctxData);

    // Refresh namespaces after switching contexts
    api.getNamespaceNames()
      .then((ns) => setNamespaces(ns))
      .catch((err) => logger.error('Cluster', 'Failed to refresh namespaces after context switch', err));

    setClusterSwitchMessage(`Connected to ${contextName}`);
    setTimeout(() => {
      setClusterSwitching(false);
      setClusterSwitchMessage('');
    }, 1000);
  } catch (error) {
    setClusterSwitchMessage(`Failed to switch to ${contextName}`);
    setTimeout(() => {
      setClusterSwitching(false);
      setClusterSwitchMessage('');
    }, 2000);
    throw error;
  }
}

// Create resources with fine-grained reactivity
const [namespacesResource, { refetch: refetchNamespaces }] = createResource(fetchNamespaces);
const [statusResource, { refetch: refetchStatus }] = createResource(fetchClusterStatus);
const [contextsResource, { refetch: refetchContexts }] = createResource(fetchContexts);

// Create a combined signal that changes when either cluster connects OR workspaceVersion changes
// This ensures resources fetch when cluster connects, even if workspaceVersion is still 0
const resourceTrigger = createMemo(() => {
  const connected = clusterStatus().connected;
  const version = workspaceVersion();
  // Return a string that changes when either connected status or version changes
  // This ensures resources re-fetch when cluster connects
  return connected ? `connected-${version}` : 'disconnected';
});

// Resources depend on the combined trigger
// They will fetch when cluster connects (even if workspaceVersion is 0)
const [podsResource, { refetch: refetchPods }] = createResource(
  () => {
    const trigger = resourceTrigger();
    // Only fetch if cluster is connected
    return clusterStatus().connected ? trigger : false;
  },
  () => fetchPods()
);
const [deploymentsResource, { refetch: refetchDeployments }] = createResource(
  () => {
    const trigger = resourceTrigger();
    return clusterStatus().connected ? trigger : false;
  },
  () => fetchDeployments()
);
const [servicesResource, { refetch: refetchServices }] = createResource(
  () => {
    const trigger = resourceTrigger();
    return clusterStatus().connected ? trigger : false;
  },
  () => fetchServices()
);
const [nodesResource, { refetch: refetchNodes }] = createResource(
  () => {
    const trigger = resourceTrigger();
    return clusterStatus().connected ? trigger : false;
  },
  () => fetchNodes()
);

// Update namespaces when resource loads
createEffect(() => {
  const ns = namespacesResource();
  if (ns) setNamespaces(ns);
});

// Update cluster status when resource loads
createEffect(() => {
  const status = statusResource();
  if (status) {
    setClusterStatus(status);
    setCurrentContext(status.context);
  }
});

// Update contexts when resource loads
createEffect(() => {
  const ctx = contextsResource();
  if (ctx) setContexts(ctx);
});

// Log any errors
createEffect(() => {
  if (statusResource.error) logger.error('Cluster', 'Status error', statusResource.error);
  if (namespacesResource.error) logger.error('Cluster', 'Namespaces error', namespacesResource.error);
  if (podsResource.error) logger.error('Cluster', 'Pods error', podsResource.error);
  if (nodesResource.error) logger.error('Cluster', 'Nodes error', nodesResource.error);
});

// Global refresh event system for cluster switching
const [refreshTrigger, setRefreshTrigger] = createSignal(0);

// Cluster switch callbacks - pages can register to be notified
const clusterSwitchCallbacks: Array<() => void> = [];

// Register a callback to be called when cluster switches
function onClusterSwitch(callback: () => void) {
  clusterSwitchCallbacks.push(callback);
  // Return unsubscribe function
  return () => {
    const index = clusterSwitchCallbacks.indexOf(callback);
    if (index > -1) {
      clusterSwitchCallbacks.splice(index, 1);
    }
  };
}

// Refresh all resources
function refreshAll() {
  refetchNamespaces();
  refetchPods();
  refetchDeployments();
  refetchServices();
  refetchNodes();
  refetchStatus();

  // Notify all registered callbacks (page-specific cache invalidation)
  clusterSwitchCallbacks.forEach(cb => {
    try {
      cb();
    } catch (e) {
      logger.error('Cluster', 'Error in cluster switch callback', e);
    }
  });

  // Increment refresh trigger for reactive updates
  setRefreshTrigger(prev => prev + 1);
}

if (typeof window !== 'undefined') {
  loadWorkspaceContext();
}

export {
  namespace,
  setNamespace,
  namespaces,
  clusterStatus,
  setClusterStatus,
  contexts,
  currentContext,
  clusterSwitching,
  clusterSwitchMessage,
  switchContext,
  contextsResource,
  podsResource,
  deploymentsResource,
  servicesResource,
  nodesResource,
  statusResource,
  namespacesResource,
  refreshAll,
  refetchPods,
  refetchDeployments,
  refetchServices,
  refetchNodes,
  refetchStatus,
  refetchContexts,
  refetchNamespaces,
  refreshTrigger,
  onClusterSwitch,
  workspaceVersion,
  selectedNamespaces,
  setSelectedNamespaces,
  workspaceContext,
  workspaceLoading,
  loadWorkspaceContext,
  resetWorkspaceContext,
};

export type { ClusterContext };
