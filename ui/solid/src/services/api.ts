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

// Delete operation wrapper that checks success field in response
async function deleteAPI(endpoint: string): Promise<{ success: boolean; message?: string; error?: string }> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  const data = await response.json();

  // Check the success field in the response body
  if (!data.success) {
    throw new Error(data.error || 'Delete operation failed');
  }

  return data;
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
  updatePod: async (name: string, namespace: string, yaml: string) => {
    const response = await fetch(`/api/pod/update?name=${encodeURIComponent(name)}&namespace=${encodeURIComponent(namespace)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'text/yaml' },
      body: yaml,
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
      throw new Error(errorData.error || errorData.message || `API error: ${response.statusText}`);
    }
    return response.json();
  },
  getPodDescribe: (name: string, namespace: string) =>
    fetchAPI<{ describe: string }>(`/pod/describe?name=${name}&namespace=${namespace}`),
  deletePod: (name: string, namespace: string) =>
    deleteAPI(`/pod/delete?name=${name}&namespace=${namespace}`),
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
  updateDeployment: async (name: string, namespace: string, yaml: string) => {
    const response = await fetch(`/api/deployment/update?name=${encodeURIComponent(name)}&namespace=${encodeURIComponent(namespace)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'text/yaml' },
      body: yaml,
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
      throw new Error(errorData.error || errorData.message || `API error: ${response.statusText}`);
    }
    return response.json();
  },
  getDeploymentDescribe: (name: string, namespace: string) =>
    fetchAPI<{ describe: string }>(`/deployment/describe?name=${name}&namespace=${namespace}`),
  deleteDeployment: (name: string, namespace: string) =>
    deleteAPI(`/deployment/delete?name=${name}&namespace=${namespace}`),
  restartDeployment: (name: string, namespace: string) =>
    fetchAPI<{ success: boolean; message?: string; error?: string }>(`/deployment/restart?name=${encodeURIComponent(name)}&namespace=${encodeURIComponent(namespace)}`, { method: 'POST' }),
  scaleDeployment: (name: string, namespace: string, replicas: number) =>
    fetchAPI<any>(`/deployment/scale?name=${encodeURIComponent(name)}&namespace=${encodeURIComponent(namespace)}&replicas=${replicas}`, { method: 'POST' }),

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
  deleteStatefulSet: (name: string, namespace: string) =>
    deleteAPI(`/statefulset/delete?name=${name}&namespace=${namespace}`),
  restartStatefulSet: (name: string, namespace: string) =>
    fetchAPI<{ success: boolean; message?: string; error?: string }>(`/statefulset/restart?name=${encodeURIComponent(name)}&namespace=${encodeURIComponent(namespace)}`, { method: 'POST' }),
  scaleStatefulSet: (name: string, namespace: string, replicas: number) =>
    fetchAPI<any>(`/statefulset/scale?name=${encodeURIComponent(name)}&namespace=${encodeURIComponent(namespace)}&replicas=${replicas}`, { method: 'POST' }),

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
  updateDaemonSet: (name: string, namespace: string, yaml: string) =>
    fetch(`${API_BASE}/daemonset/update?name=${encodeURIComponent(name)}&namespace=${encodeURIComponent(namespace)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/yaml' },
      body: yaml,
    }).then(res => res.json()),
  getDaemonSetDescribe: (name: string, namespace: string) =>
    fetchAPI<{ describe: string }>(`/daemonset/describe?name=${name}&namespace=${namespace}`),
  deleteDaemonSet: (name: string, namespace: string) =>
    deleteAPI(`/daemonset/delete?name=${name}&namespace=${namespace}`),

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
  updateCronJob: (name: string, namespace: string, yaml: string) =>
    fetch(`${API_BASE}/cronjob/update?name=${encodeURIComponent(name)}&namespace=${encodeURIComponent(namespace)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/yaml' },
      body: yaml,
    }).then(res => res.json()),
  deleteCronJob: (name: string, namespace: string) =>
    deleteAPI(`/cronjob/delete?name=${name}&namespace=${namespace}`),

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
  updateJob: (name: string, namespace: string, yaml: string) =>
    fetch(`${API_BASE}/job/update?name=${encodeURIComponent(name)}&namespace=${encodeURIComponent(namespace)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/yaml' },
      body: yaml,
    }).then(res => res.json()),
  deleteJob: (name: string, namespace: string) =>
    deleteAPI(`/job/delete?name=${name}&namespace=${namespace}`),

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
  updateService: (name: string, namespace: string, yaml: string) =>
    fetch(`${API_BASE}/service/update?name=${encodeURIComponent(name)}&namespace=${encodeURIComponent(namespace)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/yaml' },
      body: yaml,
    }).then(res => res.json()),
  getServiceDescribe: (name: string, namespace: string) =>
    fetchAPI<{ describe: string }>(`/service/describe?name=${name}&namespace=${namespace}`),
  deleteService: (name: string, namespace: string) =>
    deleteAPI(`/service/delete?name=${name}&namespace=${namespace}`),

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
  updateIngress: (name: string, namespace: string, yaml: string) =>
    fetch(`${API_BASE}/ingress/update?name=${encodeURIComponent(name)}&namespace=${encodeURIComponent(namespace)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/yaml' },
      body: yaml,
    }).then(res => res.json()),
  getIngressDescribe: (name: string, namespace: string) =>
    fetchAPI<{ describe: string }>(`/ingress/describe?name=${name}&namespace=${namespace}`),
  deleteIngress: (name: string, namespace: string) =>
    deleteAPI(`/ingress/delete?name=${name}&namespace=${namespace}`),

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
  getConfigMapDescribe: (name: string, namespace: string) =>
    fetchAPI<{ describe: string }>(`/configmap/describe?name=${name}&namespace=${namespace}`),
  deleteConfigMap: (name: string, namespace: string) =>
    deleteAPI(`/configmap/delete?name=${name}&namespace=${namespace}`),

  // Secrets
  getSecrets: async (namespace?: string) => {
    const endpoint = namespace && namespace !== '_all'
      ? `/secrets?namespace=${namespace}`
      : '/secrets?namespace=';
    const data = await fetchAPI<any[]>(endpoint);
    return Array.isArray(data) ? data : [];
  },
  getSecretYAML: (name: string, namespace: string) =>
    fetchAPI<{ yaml: string }>(`/secret/yaml?name=${name}&namespace=${namespace}`),
  updateSecret: async (name: string, namespace: string, yaml: string) => {
    const response = await fetch(`/api/secret/update?name=${encodeURIComponent(name)}&namespace=${encodeURIComponent(namespace)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'text/yaml' },
      body: yaml,
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
      throw new Error(errorData.error || errorData.message || `API error: ${response.statusText}`);
    }
    return response.json();
  },
  getSecretDescribe: (name: string, namespace: string) =>
    fetchAPI<{ describe: string }>(`/secret/describe?name=${name}&namespace=${namespace}`),
  deleteSecret: (name: string, namespace: string) =>
    deleteAPI(`/secret/delete?name=${name}&namespace=${namespace}`),

  // Certificates (cert-manager)
  getCertificates: async (namespace?: string) => {
    const endpoint = namespace && namespace !== '_all'
      ? `/certificates?namespace=${namespace}`
      : '/certificates?namespace=';
    const data = await fetchAPI<any[]>(endpoint);
    return Array.isArray(data) ? data : [];
  },
  getCertificateYAML: (name: string, namespace: string) =>
    fetchAPI<{ yaml: string }>(`/certificate/yaml?name=${name}&namespace=${namespace}`),
  updateCertificate: (name: string, namespace: string, yaml: string) =>
    fetch(`${API_BASE}/certificate/update?name=${encodeURIComponent(name)}&namespace=${encodeURIComponent(namespace)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/yaml' },
      body: yaml,
    }).then(res => res.json()),
  getCertificateDescribe: (name: string, namespace: string) =>
    fetchAPI<{ describe: string }>(`/certificate/describe?name=${name}&namespace=${namespace}`),
  deleteCertificate: (name: string, namespace: string) =>
    deleteAPI(`/certificate/delete?name=${name}&namespace=${namespace}`),

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
  getAIStatus: () => fetchAPI<{ available: boolean; provider: string }>('/ai/status'),
  queryAI: (query: string) =>
    fetchAPI<{ response: string }>('/ai/query', {
      method: 'POST',
      body: JSON.stringify({ query }),
    }),
  analyzePod: (name: string, namespace: string) =>
    fetchAPI<{ analysis: string }>(`/ai/analyze/pod?name=${name}&namespace=${namespace}`),
  explainError: (error: string, resourceType: string) =>
    fetchAPI<{ explanation: string }>('/ai/explain', {
      method: 'POST',
      body: JSON.stringify({ error, resourceType }),
    }),

  // ============ Diagnostics ============
  runDiagnostics: (namespace?: string, category?: string) => {
    const params = new URLSearchParams();
    if (namespace) params.append('namespace', namespace);
    if (category) params.append('category', category);
    const query = params.toString() ? `?${params.toString()}` : '';
    return fetchAPI<{ findings: any[]; total: number; summary: any }>(`/diagnostics/run${query}`);
  },
  getDiagnosticsCategories: () => fetchAPI<any[]>('/diagnostics/categories'),

  // ============ Cost Estimation ============
  getClusterCost: () => fetchAPI<any>('/cost/cluster'),
  getNamespaceCost: (namespace: string) =>
    fetchAPI<any>(`/cost/namespace?namespace=${namespace}`),
  getPodCost: (name: string, namespace: string) =>
    fetchAPI<any>(`/cost/pod?name=${name}&namespace=${namespace}`),
  getDeploymentCost: (name: string, namespace: string) =>
    fetchAPI<any>(`/cost/deployment?name=${name}&namespace=${namespace}`),
  getIdleResources: (namespace?: string, cpuThreshold?: number, memThreshold?: number) => {
    const params = new URLSearchParams();
    if (namespace) params.append('namespace', namespace);
    if (cpuThreshold) params.append('cpuThreshold', cpuThreshold.toString());
    if (memThreshold) params.append('memThreshold', memThreshold.toString());
    const query = params.toString() ? `?${params.toString()}` : '';
    return fetchAPI<{ idleResources: any[]; total: number }>(`/cost/idle${query}`);
  },

  // ============ Drift Detection ============
  checkDrift: (kind: string, name: string, namespace?: string) => {
    const params = new URLSearchParams({ kind, name });
    if (namespace) params.append('namespace', namespace);
    return fetchAPI<any>(`/drift/check?${params.toString()}`);
  },
  getNamespaceDrift: (namespace: string) =>
    fetchAPI<{ results: any[]; total: number }>(`/drift/namespace?namespace=${namespace}`),
  getDriftSummary: (namespace: string) =>
    fetchAPI<any>(`/drift/summary?namespace=${namespace}`),
  revertDrift: (kind: string, name: string, namespace?: string) =>
    fetchAPI<{ status: string }>('/drift/revert', {
      method: 'POST',
      body: JSON.stringify({ kind, name, namespace }),
    }),

  // ============ Network & Heatmap ============
  getNetworkTopology: () => fetchAPI<any>('/network/topology'),
  getPodHeatmap: () => fetchAPI<{ heatmap: any[]; total: number }>('/heatmap/pods'),
  getNodeHeatmap: () => fetchAPI<{ heatmap: any[]; total: number }>('/heatmap/nodes'),

  // ============ Plugins ============
  getPluginsList: () => fetchAPI<{ plugins: any[]; total: number }>('/plugins/list'),
  installPlugin: (source: string) =>
    fetchAPI<{ status: string }>('/plugins/install', {
      method: 'POST',
      body: JSON.stringify({ source }),
    }),
  uninstallPlugin: (name: string) =>
    fetchAPI<{ status: string }>('/plugins/uninstall', {
      method: 'POST',
      body: JSON.stringify({ name }),
    }),

  // Helm
  getHelmReleases: async (namespace?: string) => {
    const endpoint = namespace ? `/plugins/helm/releases?namespace=${namespace}` : '/plugins/helm/releases';
    const data = await fetchAPI<{ releases: any[]; count: number; success: boolean }>(endpoint);
    return data.releases || [];
  },
  getHelmReleaseDetails: (name: string, namespace: string) =>
    fetchAPI<any>(`/plugins/helm/release?name=${name}&namespace=${namespace}`),
  getHelmReleaseHistory: (name: string, namespace: string) =>
    fetchAPI<{ history: any[]; success: boolean }>(`/plugins/helm/history?name=${name}&namespace=${namespace}`),
  rollbackHelmRelease: (name: string, namespace: string, revision: number) =>
    fetchAPI<{ status: string; message: string }>('/plugins/helm/rollback', {
      method: 'POST',
      body: JSON.stringify({ name, namespace, revision }),
    }),

  // ArgoCD
  getArgoCDApps: async () => {
    const data = await fetchAPI<{ apps: any[]; count: number; installed: boolean; success: boolean }>('/plugins/argocd/apps');
    return data.apps || [];
  },
  getArgoCDAppDetails: (name: string, namespace: string) =>
    fetchAPI<any>(`/plugins/argocd/app?name=${name}&namespace=${namespace}`),
  syncArgoCDApp: (name: string, namespace: string) =>
    fetchAPI<{ status: string; message: string }>('/plugins/argocd/sync', {
      method: 'POST',
      body: JSON.stringify({ name, namespace }),
    }),
  refreshArgoCDApp: (name: string, namespace: string) =>
    fetchAPI<{ status: string; message: string }>('/plugins/argocd/refresh', {
      method: 'POST',
      body: JSON.stringify({ name, namespace }),
    }),

  // Flux
  getFluxResources: async () => {
    const data = await fetchAPI<{ resources: any[]; count: number; success: boolean }>('/plugins/flux/resources');
    return data.resources || [];
  },

  // Kustomize
  getKustomizeResources: () => fetchAPI<any[]>('/plugins/kustomize/resources'),

  // ============ Cloud Detection ============
  getCloudInfo: () => fetchAPI<{
    provider: string;
    region: string;
    displayName: string;
    isSpot: boolean;
    spotNodeCount: number;
    onDemandNodeCount: number;
  }>('/cloud'),

  // ============ Contexts (Multi-cluster) ============
  getContexts: () => fetchAPI<any[]>('/contexts'),
  getCurrentContext: () => fetchAPI<any>('/contexts/current'),
  switchContext: (contextName: string) =>
    fetchAPI<any>('/contexts/switch', {
      method: 'POST',
      body: JSON.stringify({ context: contextName }),
    }),

  // ============ Events ============
  getEvents: async (namespace?: string, limit?: number) => {
    const params = new URLSearchParams();
    if (namespace && namespace !== 'All Namespaces') {
      params.set('namespace', namespace);
    }
    if (limit) {
      params.set('limit', limit.toString());
    }
    return fetchAPI<{ events: any[]; total: number }>(`/events?${params.toString()}`);
  },

  // ============ Apps Marketplace ============
  getApps: () => fetchAPI<any[]>('/apps'),
  getAppDetails: (name: string) => fetchAPI<any>(`/apps/${name}`),
  installApp: (name: string, namespace: string, values?: Record<string, any>) =>
    fetchAPI<any>('/apps/install', {
      method: 'POST',
      body: JSON.stringify({ name, namespace, values }),
    }),
  uninstallApp: (name: string, namespace: string) =>
    fetchAPI<any>('/apps/uninstall', {
      method: 'POST',
      body: JSON.stringify({ name, namespace }),
    }),
  getInstalledApps: () => fetchAPI<any[]>('/apps/installed'),

  // ============ AI Log Analysis ============
  analyzePodsLogs: (namespace?: string) =>
    fetchAPI<any>(`/ai/analyze/logs${namespace ? `?namespace=${namespace}` : ''}`),
  analyzePodLogs: (name: string, namespace: string) =>
    fetchAPI<any>(`/ai/analyze/pod-logs?name=${name}&namespace=${namespace}`),
};

export default api;
