// Comprehensive API service for KubeGraf

const API_BASE = '/api';

// Generic fetch wrapper with error handling
async function fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error || `API error: ${response.status}`);
  }

  return response.json();
}

// ============ Status & Metrics ============
export interface ClusterStatus {
  cluster: string;
  connected: boolean;
  error?: string;
}

export interface Metrics {
  cpu: { usage: number; capacity: number; percentage: number };
  memory: { usage: number; capacity: number; percentage: number };
  pods: { running: number; total: number };
  nodes: { ready: number; total: number };
}

export const api = {
  // Status
  getStatus: () => fetchAPI<ClusterStatus>('/status'),
  getMetrics: () => fetchAPI<Metrics>('/metrics'),

  // Namespaces
  getNamespaces: async () => {
    const data = await fetchAPI<{ namespaces: string[]; success: boolean }>('/namespaces');
    return data.namespaces || [];
  },

  // ============ Workloads ============
  // Pods
  getPods: async (namespace?: string) => {
    // Use namespace= (empty) for all namespaces, namespace=X for specific
    const endpoint = namespace && namespace !== '_all'
      ? `/pods?namespace=${namespace}`
      : '/pods?namespace=';
    const data = await fetchAPI<any[]>(endpoint);
    return Array.isArray(data) ? data : [];
  },
  getPodDetails: (name: string, namespace: string) =>
    fetchAPI<any>(`/pod/details?name=${name}&namespace=${namespace}`),
  getPodYAML: (name: string, namespace: string) =>
    fetchAPI<{ yaml: string }>(`/pod/yaml?name=${name}&namespace=${namespace}`),
  getPodDescribe: (name: string, namespace: string) =>
    fetchAPI<{ describe: string }>(`/pod/describe?name=${name}&namespace=${namespace}`),
  deletePod: (name: string, namespace: string) =>
    fetchAPI<any>(`/pod/delete?name=${name}&namespace=${namespace}`, { method: 'DELETE' }),
  restartPod: (name: string, namespace: string) =>
    fetchAPI<any>(`/pod/restart?name=${name}&namespace=${namespace}`, { method: 'POST' }),
  getPodMetrics: async (namespace?: string) => {
    const endpoint = namespace && namespace !== '_all'
      ? `/pods/metrics?namespace=${namespace}`
      : '/pods/metrics?namespace=';
    const data = await fetchAPI<Record<string, { cpu: string; memory: string }>>(endpoint);
    return data || {};
  },

  // Deployments
  getDeployments: async (namespace?: string) => {
    const endpoint = namespace && namespace !== '_all'
      ? `/deployments?namespace=${namespace}`
      : '/deployments?namespace=';
    const data = await fetchAPI<any[]>(endpoint);
    return Array.isArray(data) ? data : [];
  },
  getDeploymentDetails: (name: string, namespace: string) =>
    fetchAPI<any>(`/deployment/details?name=${name}&namespace=${namespace}`),
  getDeploymentYAML: (name: string, namespace: string) =>
    fetchAPI<{ yaml: string }>(`/deployment/yaml?name=${name}&namespace=${namespace}`),
  getDeploymentDescribe: (name: string, namespace: string) =>
    fetchAPI<{ describe: string }>(`/deployment/describe?name=${name}&namespace=${namespace}`),
  deleteDeployment: (name: string, namespace: string) =>
    fetchAPI<any>(`/deployment/delete?name=${name}&namespace=${namespace}`, { method: 'DELETE' }),
  restartDeployment: (name: string, namespace: string) =>
    fetchAPI<any>(`/deployment/restart?name=${name}&namespace=${namespace}`, { method: 'POST' }),
  scaleDeployment: (name: string, namespace: string, replicas: number) =>
    fetchAPI<any>(`/deployment/scale?name=${name}&namespace=${namespace}&replicas=${replicas}`, { method: 'POST' }),

  // StatefulSets
  getStatefulSets: async (namespace?: string) => {
    const endpoint = namespace && namespace !== '_all'
      ? `/statefulsets?namespace=${namespace}`
      : '/statefulsets?namespace=';
    const data = await fetchAPI<any[]>(endpoint);
    return Array.isArray(data) ? data : [];
  },
  getStatefulSetYAML: (name: string, namespace: string) =>
    fetchAPI<{ yaml: string }>(`/statefulset/yaml?name=${name}&namespace=${namespace}`),
  getStatefulSetDescribe: (name: string, namespace: string) =>
    fetchAPI<{ describe: string }>(`/statefulset/describe?name=${name}&namespace=${namespace}`),
  restartStatefulSet: (name: string, namespace: string) =>
    fetchAPI<any>(`/statefulset/restart?name=${name}&namespace=${namespace}`, { method: 'POST' }),

  // DaemonSets
  getDaemonSets: async (namespace?: string) => {
    const endpoint = namespace && namespace !== '_all'
      ? `/daemonsets?namespace=${namespace}`
      : '/daemonsets?namespace=';
    const data = await fetchAPI<any[]>(endpoint);
    return Array.isArray(data) ? data : [];
  },
  getDaemonSetYAML: (name: string, namespace: string) =>
    fetchAPI<{ yaml: string }>(`/daemonset/yaml?name=${name}&namespace=${namespace}`),
  getDaemonSetDescribe: (name: string, namespace: string) =>
    fetchAPI<{ describe: string }>(`/daemonset/describe?name=${name}&namespace=${namespace}`),

  // CronJobs
  getCronJobs: async (namespace?: string) => {
    const endpoint = namespace && namespace !== '_all'
      ? `/cronjobs?namespace=${namespace}`
      : '/cronjobs?namespace=';
    const data = await fetchAPI<any[]>(endpoint);
    return Array.isArray(data) ? data : [];
  },
  getCronJobYAML: (name: string, namespace: string) =>
    fetchAPI<{ yaml: string }>(`/cronjob/yaml?name=${name}&namespace=${namespace}`),

  // Jobs
  getJobs: async (namespace?: string) => {
    const endpoint = namespace && namespace !== '_all'
      ? `/jobs?namespace=${namespace}`
      : '/jobs?namespace=';
    const data = await fetchAPI<any[]>(endpoint);
    return Array.isArray(data) ? data : [];
  },
  getJobYAML: (name: string, namespace: string) =>
    fetchAPI<{ yaml: string }>(`/job/yaml?name=${name}&namespace=${namespace}`),

  // ============ Network ============
  // Services
  getServices: async (namespace?: string) => {
    const endpoint = namespace && namespace !== '_all'
      ? `/services?namespace=${namespace}`
      : '/services?namespace=';
    const data = await fetchAPI<any[]>(endpoint);
    return Array.isArray(data) ? data : [];
  },
  getServiceYAML: (name: string, namespace: string) =>
    fetchAPI<{ yaml: string }>(`/service/yaml?name=${name}&namespace=${namespace}`),
  getServiceDescribe: (name: string, namespace: string) =>
    fetchAPI<{ describe: string }>(`/service/describe?name=${name}&namespace=${namespace}`),

  // Ingresses
  getIngresses: async (namespace?: string) => {
    const endpoint = namespace && namespace !== '_all'
      ? `/ingresses?namespace=${namespace}`
      : '/ingresses?namespace=';
    const data = await fetchAPI<any[]>(endpoint);
    return Array.isArray(data) ? data : [];
  },
  getIngressYAML: (name: string, namespace: string) =>
    fetchAPI<{ yaml: string }>(`/ingress/yaml?name=${name}&namespace=${namespace}`),

  // ============ Config ============
  // ConfigMaps
  getConfigMaps: async (namespace?: string) => {
    const endpoint = namespace && namespace !== '_all'
      ? `/configmaps?namespace=${namespace}`
      : '/configmaps?namespace=';
    const data = await fetchAPI<any[]>(endpoint);
    return Array.isArray(data) ? data : [];
  },
  getConfigMapYAML: (name: string, namespace: string) =>
    fetchAPI<{ yaml: string }>(`/configmap/yaml?name=${name}&namespace=${namespace}`),

  // Secrets (metadata only, not values)
  getSecrets: async (namespace?: string) => {
    const endpoint = namespace && namespace !== '_all'
      ? `/secrets?namespace=${namespace}`
      : '/secrets?namespace=';
    const data = await fetchAPI<any[]>(endpoint);
    return Array.isArray(data) ? data : [];
  },

  // ============ Cluster ============
  // Nodes
  getNodes: async () => {
    const data = await fetchAPI<any[]>('/nodes');
    return Array.isArray(data) ? data : [];
  },
  getNodeDetails: (name: string) =>
    fetchAPI<any>(`/node/details?name=${name}`),
  getNodeYAML: (name: string) =>
    fetchAPI<{ yaml: string }>(`/node/yaml?name=${name}`),
  getNodeDescribe: (name: string) =>
    fetchAPI<{ describe: string }>(`/node/describe?name=${name}`),

  // Events
  getEvents: async () => {
    const data = await fetchAPI<{ events: any[]; total: number }>('/events');
    return data.events || [];
  },

  // ============ Topology ============
  getTopology: (namespace?: string) => {
    const endpoint = namespace && namespace !== 'All Namespaces' ? `/topology?namespace=${namespace}` : '/topology';
    return fetchAPI<any>(endpoint);
  },
  getResourceMap: () => fetchAPI<any>('/resourcemap'),
  getImpactAnalysis: (kind: string, name: string, namespace: string) =>
    fetchAPI<any>(`/impact?kind=${kind}&name=${name}&namespace=${namespace}`),

  // ============ Security ============
  getSecurityAnalysis: () => fetchAPI<any>('/security'),

  // ============ Port Forwarding ============
  startPortForward: (type: string, name: string, namespace: string, localPort: number, remotePort: number) =>
    fetchAPI<any>('/portforward/start', {
      method: 'POST',
      body: JSON.stringify({ type, name, namespace, localPort, remotePort }),
    }),
  stopPortForward: (id: string) =>
    fetchAPI<any>(`/portforward/stop?id=${id}`, { method: 'POST' }),
  listPortForwards: () => fetchAPI<any[]>('/portforward/list'),

  // ============ AI ============
  getAIProviders: () => fetchAPI<any>('/ai/providers'),
  createAISession: (provider: string) =>
    fetchAPI<any>('/ai/session', {
      method: 'POST',
      body: JSON.stringify({ provider }),
    }),
  sendAIMessage: (sessionId: string, message: string, context?: any) =>
    fetchAPI<any>('/ai/chat', {
      method: 'POST',
      body: JSON.stringify({ sessionId, message, context }),
    }),

  // ============ Plugins ============
  getPlugins: () => fetchAPI<any[]>('/plugins'),
  executePlugin: (name: string, action: string, params?: any) =>
    fetchAPI<any>('/plugins/execute', {
      method: 'POST',
      body: JSON.stringify({ name, action, params }),
    }),

  // Helm
  getHelmReleases: async (namespace?: string) => {
    const endpoint = namespace ? `/plugins/helm/releases?namespace=${namespace}` : '/plugins/helm/releases';
    const data = await fetchAPI<{ releases: any[]; count: number; success: boolean }>(endpoint);
    return data.releases || [];
  },
  getHelmReleaseDetails: (name: string, namespace: string) =>
    fetchAPI<any>(`/plugins/helm/release?name=${name}&namespace=${namespace}`),

  // ArgoCD
  getArgoCDApps: async () => {
    const data = await fetchAPI<{ apps: any[]; count: number; installed: boolean; success: boolean }>('/plugins/argocd/apps');
    return data.apps || [];
  },

  // Flux
  getFluxResources: async () => {
    const data = await fetchAPI<{ resources: any[]; count: number; success: boolean }>('/plugins/flux/resources');
    return data.resources || [];
  },

  // Kustomize
  getKustomizeResources: () => fetchAPI<any[]>('/plugins/kustomize/resources'),

  // ============ Contexts (Multi-cluster) ============
  getContexts: () => fetchAPI<any[]>('/contexts'),
  getCurrentContext: () => fetchAPI<any>('/contexts/current'),
  switchContext: (contextName: string) =>
    fetchAPI<any>('/contexts/switch', {
      method: 'POST',
      body: JSON.stringify({ context: contextName }),
    }),
};

export default api;
