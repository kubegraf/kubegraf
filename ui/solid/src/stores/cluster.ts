import { createSignal, createResource, createEffect } from 'solid-js';

// Types
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

// Create resources with fine-grained reactivity
const [namespacesResource] = createResource(fetchNamespaces);
const [podsResource, { refetch: refetchPods }] = createResource(namespace, fetchPods);
const [deploymentsResource, { refetch: refetchDeployments }] = createResource(namespace, fetchDeployments);
const [servicesResource, { refetch: refetchServices }] = createResource(namespace, fetchServices);
const [nodesResource, { refetch: refetchNodes }] = createResource(fetchNodes);
const [statusResource, { refetch: refetchStatus }] = createResource(fetchClusterStatus);

// Update namespaces when resource loads
createEffect(() => {
  const ns = namespacesResource();
  if (ns) setNamespaces(ns);
});

// Update cluster status when resource loads
createEffect(() => {
  const status = statusResource();
  console.log('Status resource loaded:', status);
  if (status) setClusterStatus(status);
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
};
