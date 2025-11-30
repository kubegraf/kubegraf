import { createSignal, createResource, createEffect } from 'solid-js';
import { api } from '../services/api';

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

// Reactive signals with fine-grained updates
const [namespace, setNamespace] = createSignal<string>('_all');
const [namespaces, setNamespaces] = createSignal<string[]>(['default']);
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

// API fetch functions
async function fetchNamespaces(): Promise<string[]> {
  const res = await fetch('/api/namespaces');
  if (!res.ok) throw new Error('Failed to fetch namespaces');
  const data = await res.json();
  return data.namespaces || [];
}

async function fetchPods(ns: string): Promise<Pod[]> {
  const endpoint = ns === '_all' ? '/api/pods?all=true' : `/api/pods?namespace=${ns}`;
  const res = await fetch(endpoint);
  if (!res.ok) throw new Error('Failed to fetch pods');
  const data = await res.json();
  // API returns array directly
  return Array.isArray(data) ? data : (data.pods || []);
}

async function fetchDeployments(ns: string): Promise<Deployment[]> {
  const endpoint = ns === '_all' ? '/api/deployments?all=true' : `/api/deployments?namespace=${ns}`;
  const res = await fetch(endpoint);
  if (!res.ok) throw new Error('Failed to fetch deployments');
  const data = await res.json();
  return Array.isArray(data) ? data : (data.deployments || []);
}

async function fetchServices(ns: string): Promise<Service[]> {
  const endpoint = ns === '_all' ? '/api/services?all=true' : `/api/services?namespace=${ns}`;
  const res = await fetch(endpoint);
  if (!res.ok) throw new Error('Failed to fetch services');
  const data = await res.json();
  return Array.isArray(data) ? data : (data.services || []);
}

async function fetchNodes(): Promise<Node[]> {
  const res = await fetch('/api/nodes');
  if (!res.ok) throw new Error('Failed to fetch nodes');
  const data = await res.json();
  return Array.isArray(data) ? data : (data.nodes || []);
}

async function fetchClusterStatus(): Promise<ClusterStatus> {
  const res = await fetch('/api/status');
  if (!res.ok) throw new Error('Failed to fetch status');
  const data = await res.json();
  // Map API response to ClusterStatus
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

    // Update current context
    setCurrentContext(contextName);
    setClusterSwitchMessage(`Loading resources from ${contextName}...`);

    // Refresh all data for the new context
    refreshAll();

    // Refetch contexts to update isCurrent flags
    const ctxData = await fetchContexts();
    setContexts(ctxData);

    // Refetch namespaces for new cluster
    const nsRes = await fetch('/api/namespaces');
    if (nsRes.ok) {
      const nsData = await nsRes.json();
      setNamespaces(nsData.namespaces || []);
    }

    setClusterSwitchMessage(`Connected to ${contextName}`);
    // Brief delay to show success message
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
const [podsResource, { refetch: refetchPods }] = createResource(namespace, fetchPods);
const [deploymentsResource, { refetch: refetchDeployments }] = createResource(namespace, fetchDeployments);
const [servicesResource, { refetch: refetchServices }] = createResource(namespace, fetchServices);
const [nodesResource, { refetch: refetchNodes }] = createResource(fetchNodes);
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
  console.log('Status resource loaded:', status);
  if (status) {
    setClusterStatus(status);
    setCurrentContext(status.context);
  }
});

// Update contexts when resource loads
createEffect(() => {
  const ctx = contextsResource();
  console.log('Contexts resource loaded:', ctx);
  if (ctx) setContexts(ctx);
});

// Log any errors
createEffect(() => {
  if (statusResource.error) console.error('Status error:', statusResource.error);
  if (namespacesResource.error) console.error('Namespaces error:', namespacesResource.error);
  if (podsResource.error) console.error('Pods error:', podsResource.error);
  if (nodesResource.error) console.error('Nodes error:', nodesResource.error);
});

// Refresh all resources
function refreshAll() {
  refetchPods();
  refetchDeployments();
  refetchServices();
  refetchNodes();
  refetchStatus();
}

export {
  namespace,
  setNamespace,
  namespaces,
  clusterStatus,
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
};

export type { ClusterContext };
