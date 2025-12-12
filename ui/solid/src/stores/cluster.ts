import { createSignal, createResource, createEffect } from 'solid-js';
import { api, type WorkspaceContextPayload } from '../services/api';

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
    console.error('Failed to load workspace context', err);
    applyWorkspaceContextState({ selectedNamespaces: [] });
  } finally {
    setWorkspaceLoading(false);
  }
}

async function persistWorkspaceContext(next: WorkspaceContextPayload): Promise<void> {
  try {
    const updated = await api.updateWorkspaceContext({
      selectedNamespaces: next.selectedNamespaces || [],
      selectedCluster: next.selectedCluster || '',
      filters: next.filters || {},
    });
    applyWorkspaceContextState(updated || next);
  } catch (err) {
    console.error('Failed to update workspace context', err);
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
    console.error('Failed to set namespace', err);
  }
}

// API fetch functions
async function fetchNamespaces(): Promise<string[]> {
  const res = await fetch('/api/namespaces');
  if (!res.ok) throw new Error('Failed to fetch namespaces');
  const data = await res.json();
  // API returns array of objects [{name, status, age, ...}, ...] or {namespaces: [...]}
  if (Array.isArray(data)) {
    // Extract namespace names from array of objects
    return data.map((ns: { name?: string } | string) =>
      typeof ns === 'string' ? ns : (ns.name || '')
    ).filter(Boolean);
  }
  return data.namespaces || [];
}

async function fetchPods(): Promise<Pod[]> {
  const res = await fetch('/api/pods');
  if (!res.ok) throw new Error('Failed to fetch pods');
  const data = await res.json();
  return Array.isArray(data) ? data : (data.pods || []);
}

async function fetchDeployments(): Promise<Deployment[]> {
  const res = await fetch('/api/deployments');
  if (!res.ok) throw new Error('Failed to fetch deployments');
  const data = await res.json();
  return Array.isArray(data) ? data : (data.deployments || []);
}

async function fetchServices(): Promise<Service[]> {
  const res = await fetch('/api/services');
  if (!res.ok) throw new Error('Failed to fetch services');
  const data = await res.json();
  return Array.isArray(data) ? data : (data.services || []);
}

async function fetchNodes(): Promise<Node[]> {
  const res = await fetch('/api/nodes');
  if (!res.ok) throw new Error('Failed to fetch nodes');
  const data = await res.json();
  // Handle both old format (array) and new format (object with nodes array)
  if (Array.isArray(data)) {
    return data;
  }
  // New format: { nodes: [...], total: X, healthy: Y, schedulable: Z, ... }
  return data.nodes || [];
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

    const nsRes = await fetch('/api/namespaces');
    if (nsRes.ok) {
      const nsData = await nsRes.json();
      // Handle both array of objects and {namespaces: [...]} format
      if (Array.isArray(nsData)) {
        setNamespaces(nsData.map((ns: { name?: string } | string) =>
          typeof ns === 'string' ? ns : (ns.name || '')
        ).filter(Boolean));
      } else {
        setNamespaces(nsData.namespaces || []);
      }
    }

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
const [namespacesResource] = createResource(fetchNamespaces);
const [podsResource, { refetch: refetchPods }] = createResource(workspaceVersion, () => fetchPods());
const [deploymentsResource, { refetch: refetchDeployments }] = createResource(workspaceVersion, () => fetchDeployments());
const [servicesResource, { refetch: refetchServices }] = createResource(workspaceVersion, () => fetchServices());
const [nodesResource, { refetch: refetchNodes }] = createResource(workspaceVersion, () => fetchNodes());
const [statusResource, { refetch: refetchStatus }] = createResource(fetchClusterStatus);
const [contextsResource, { refetch: refetchContexts }] = createResource(fetchContexts);

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
  if (statusResource.error) console.error('Status error:', statusResource.error);
  if (namespacesResource.error) console.error('Namespaces error:', namespacesResource.error);
  if (podsResource.error) console.error('Pods error:', podsResource.error);
  if (nodesResource.error) console.error('Nodes error:', nodesResource.error);
});

// Global refresh event system for cluster switching
const [refreshTrigger, setRefreshTrigger] = createSignal(0);

// Refresh all resources
function refreshAll() {
  refetchPods();
  refetchDeployments();
  refetchServices();
  refetchNodes();
  refetchStatus();
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
  refreshTrigger,
  workspaceVersion,
  selectedNamespaces,
  setSelectedNamespaces,
  workspaceContext,
  workspaceLoading,
  loadWorkspaceContext,
  resetWorkspaceContext,
};

export type { ClusterContext };
