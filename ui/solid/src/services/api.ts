import { extractNamespaceNames, normalizeNamespaceList, type NamespaceListItem } from '../utils/namespaceResponse';

// Comprehensive API service for KubeGraf

const API_BASE = '/api';

  // Generic fetch wrapper with error handling
export async function fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
  // Add timeout for long-running requests (like ML recommendations)
  // Cost API can take up to 2 minutes for large clusters
  // History API can take up to 60 seconds for large clusters with many namespaces
  // ML recommendations can take up to 60 seconds to analyze metrics and generate recommendations
  // Topology API can take up to 60 seconds for large clusters with many resources
  let defaultTimeout = 15000; // 15s default
  if (endpoint.includes('/cost/')) {
    defaultTimeout = 120000; // 2 minutes for cost
  } else if (endpoint.includes('/history/')) {
    defaultTimeout = 60000; // 60 seconds for history
  } else if (endpoint.includes('/ml/recommendations')) {
    defaultTimeout = 60000; // 60 seconds for ML recommendations
  } else if (endpoint.includes('/anomalies/detect')) {
    defaultTimeout = 60000; // 60 seconds for anomaly detection
  } else if (endpoint.includes('/topology') || endpoint.includes('/traffic/metrics')) {
    defaultTimeout = 60000; // 60 seconds for topology and traffic metrics
  } else if (endpoint.includes('/brain/')) {
    defaultTimeout = 60000; // 60 seconds for brain endpoints (they scan cluster data)
  } else if (endpoint.includes('/incidents')) {
    defaultTimeout = 120000; // 120 seconds (2 minutes) for incidents (they scan cluster data)
  }
  const timeout = (options as any)?.timeout || defaultTimeout;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      signal: controller.signal,
      ...options,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const contentType = response.headers.get('content-type');
      const error = await response.text();
      
      // Check if response is HTML (error page) instead of JSON
      if (contentType && contentType.includes('text/html')) {
        throw new Error(`API endpoint not found (${response.status}). The server returned an HTML error page. Check that the endpoint exists.`);
      }
      
      // For 503 Service Unavailable, preserve the original error message if it's descriptive
      // This helps identify optional features that aren't enabled
      if (response.status === 503 && error) {
        throw new Error(error);
      }
      
      throw new Error(error || `API error: ${response.status}`);
    }

    // Check content type before parsing JSON
    const contentType = response.headers.get('content-type');
    if (contentType && !contentType.includes('application/json')) {
      const text = await response.text();
      // If it's HTML, provide a helpful error
      if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<!doctype')) {
        throw new Error(`Server returned HTML instead of JSON. This usually means the API endpoint doesn't exist (404). Response: ${text.substring(0, 200)}...`);
      }
      throw new Error(`Unexpected content type: ${contentType}. Expected JSON.`);
    }

    return response.json();
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('Request timed out. The server may be processing a large amount of data.');
    }
    throw err;
  }
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
  version?: string;
}

export interface ClusterManagerStatus {
  connected: boolean;
  cluster?: string;
  error?: string;
}

export interface ClusterEntry {
  name: string;
  provider: string;
  kubeconfigPath: string;
  connected: boolean;
  error?: string;
}

export interface DiscoveredKubeconfig {
  path: string;
  clusters?: string[];
  valid: boolean;
  error?: string;
}

export interface RuntimeClusterContext {
  name: string;
  cluster: string;
  connected: boolean;
  reachable: boolean;
  error?: string;
}

export interface ClusterConnectPayload {
  name?: string;
  provider: string;
  kubeconfigPath: string;
  makeDefault?: boolean;
}

export interface ClusterManagerResponse {
  clusters: ClusterEntry[];
  discovered: DiscoveredKubeconfig[];
  contexts: RuntimeClusterContext[];
  status: ClusterManagerStatus;
}

export interface Metrics {
  cpu: { usage: number; capacity: number; percentage: number };
  memory: { usage: number; capacity: number; percentage: number };
  pods: { running: number; total: number };
  nodes: { ready: number; total: number };
}

// ============ Anomaly Detection Types ============
export interface MetricSample {
  timestamp: string;
  namespace: string;
  podName: string;
  deployment?: string;
  cpuUsage: number;
  memoryUsage: number;
  cpuRequest: number;
  memoryRequest: number;
  restartCount: number;
  phase: string;
  ready: boolean;
}

export interface Anomaly {
  id: string;
  timestamp: string;
  severity: 'critical' | 'warning' | 'info';
  type: string;
  namespace: string;
  podName: string;
  deployment?: string;
  message: string;
  score: number;
  recommendation: string;
  autoRemediate: boolean;
  metrics: MetricSample;
}

export interface AnomalyStats {
  total: number;
  critical: number;
  warning: number;
  info: number;
  byType?: Record<string, number>;
  byNamespace?: Record<string, number>;
}

export const api = {
  // Status
  getStatus: (retry?: boolean) => {
    const endpoint = retry ? '/status?retry=true' : '/status';
    return fetchAPI<ClusterStatus>(endpoint);
  },
  
  // Updates (legacy endpoints)
  checkForUpdates: () => fetchAPI<{
    currentVersion: string;
    latestVersion: string;
    updateAvailable: boolean;
    releaseNotes?: string;
    downloadUrl?: string;
    htmlUrl?: string;
    publishedAt?: string;
    error?: string;
  }>('/updates/check'),
  
  // New update endpoints
  checkUpdate: () => fetchAPI<{
    currentVersion: string;
    latestVersion: string;
    updateAvailable: boolean;
    releaseNotes: string;
    htmlUrl: string;
    downloadUrl?: string;
    error?: string;
  }>('/update/check'),
  autoCheckUpdate: () => fetchAPI<{
    currentVersion: string;
    latestVersion: string;
    updateAvailable: boolean;
    releaseNotes: string;
    htmlUrl: string;
    downloadUrl?: string;
    error?: string;
  }>('/update/auto-check'),
  installUpdate: (downloadUrl: string) =>
    fetchAPI<{ success: boolean; message?: string; error?: string }>('/updates/install', {
      method: 'POST',
      body: JSON.stringify({ downloadUrl }),
    }),
  getMetrics: () => fetchAPI<Metrics>('/metrics'),

  // Namespaces
  getNamespaces: async (): Promise<NamespaceListItem[]> => {
    const data = await fetchAPI<unknown>('/namespaces');
    // Backend returns an array of namespace objects; some older callers expected { namespaces: [...] }.
    // Normalize both into a sorted list of unique namespace objects (at least { name }).
    return normalizeNamespaceList(data);
  },

  // Convenience for UI components that only need names (e.g. dropdowns)
  getNamespaceNames: async (): Promise<string[]> => {
    // IMPORTANT: Do not reference `api` from within the `api` object literal.
    // Some bundler/minifier configurations can emit a TDZ-like runtime error (blank app)
    // when a property initializer closes over the object variable.
    const data = await fetchAPI<unknown>('/namespaces');
    return extractNamespaceNames(data);
  },

  // ============ Workloads ============
  // Pods
  getPods: async (namespace?: string) => {
    // Use namespace= (empty) for all namespaces, namespace=X for specific
    // "All Namespaces" label should be treated as empty (all namespaces)
    const endpoint = namespace && namespace !== '_all' && namespace !== 'All Namespaces'
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
    // Use namespace= (empty) for all namespaces, namespace=X for specific
    // "All Namespaces" label should be treated as empty (all namespaces)
    const endpoint = namespace && namespace !== '_all' && namespace !== 'All Namespaces'
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
  bulkRestartDeployments: (namespace: string) =>
    fetchAPI<any>(`/deployments/bulk/restart?namespace=${encodeURIComponent(namespace)}`, { method: 'POST' }),
  bulkDeleteDeployments: (namespace: string) =>
    fetchAPI<any>(`/deployments/bulk/delete?namespace=${encodeURIComponent(namespace)}`, { method: 'POST' }),

  // Workload cross-navigation
  getWorkloadDetails: (namespace: string, kind: string, name: string) =>
    fetchAPI<any>(`/workloads/${namespace}/${kind}/${name}`),
  getWorkloadRelated: (namespace: string, kind: string, name: string) =>
    fetchAPI<any>(`/workloads/${namespace}/${kind}/${name}/related`),

  // StatefulSets
  getStatefulSets: async (namespace?: string) => {
    const endpoint = namespace && namespace !== '_all' && namespace !== 'All Namespaces'
      ? `/statefulsets?namespace=${namespace}`
      : '/statefulsets?namespace=';
    const data = await fetchAPI<any[]>(endpoint);
    return Array.isArray(data) ? data : [];
  },
  getStatefulSetDetails: (name: string, namespace: string) =>
    fetchAPI<any>(`/statefulset/details?name=${name}&namespace=${namespace}`),
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
  bulkRestartStatefulSets: (namespace: string) =>
    fetchAPI<any>(`/statefulsets/bulk/restart?namespace=${encodeURIComponent(namespace)}`, { method: 'POST' }),
  bulkDeleteStatefulSets: (namespace: string) =>
    fetchAPI<any>(`/statefulsets/bulk/delete?namespace=${encodeURIComponent(namespace)}`, { method: 'POST' }),

  // DaemonSets
  getDaemonSets: async (namespace?: string) => {
    const endpoint = namespace && namespace !== '_all' && namespace !== 'All Namespaces'
      ? `/daemonsets?namespace=${namespace}`
      : '/daemonsets?namespace=';
    const data = await fetchAPI<any[]>(endpoint);
    return Array.isArray(data) ? data : [];
  },
  getDaemonSetDetails: (name: string, namespace: string) =>
    fetchAPI<any>(`/daemonset/details?name=${name}&namespace=${namespace}`),
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
  restartDaemonSet: (name: string, namespace: string) =>
    fetchAPI<{ success: boolean; message?: string; error?: string }>(`/daemonset/restart?name=${encodeURIComponent(name)}&namespace=${encodeURIComponent(namespace)}`, { method: 'POST' }),
  bulkRestartDaemonSets: (namespace: string) =>
    fetchAPI<any>(`/daemonsets/bulk/restart?namespace=${encodeURIComponent(namespace)}`, { method: 'POST' }),
  bulkDeleteDaemonSets: (namespace: string) =>
    fetchAPI<any>(`/daemonsets/bulk/delete?namespace=${encodeURIComponent(namespace)}`, { method: 'POST' }),

  // CronJobs
  getCronJobs: async (namespace?: string) => {
    const endpoint = namespace && namespace !== '_all' && namespace !== 'All Namespaces'
      ? `/cronjobs?namespace=${namespace}`
      : '/cronjobs?namespace=';
    const data = await fetchAPI<any[]>(endpoint);
    return Array.isArray(data) ? data : [];
  },
  getCronJobDetails: (name: string, namespace: string) =>
    fetchAPI<any>(`/cronjob/details?name=${name}&namespace=${namespace}`),
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
    const endpoint = namespace && namespace !== '_all' && namespace !== 'All Namespaces'
      ? `/jobs?namespace=${namespace}`
      : '/jobs?namespace=';
    const data = await fetchAPI<any[]>(endpoint);
    return Array.isArray(data) ? data : [];
  },
  getJobDetails: (name: string, namespace: string) =>
    fetchAPI<any>(`/job/details?name=${name}&namespace=${namespace}`),
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

  // Pod Disruption Budgets
  getPDBs: async (namespace?: string) => {
    const endpoint = namespace && namespace !== '_all' && namespace !== 'All Namespaces'
      ? `/pdbs?namespace=${namespace}`
      : '/pdbs?namespace=';
    const data = await fetchAPI<any[]>(endpoint);
    return Array.isArray(data) ? data : [];
  },
  getPDBDetails: (name: string, namespace: string) =>
    fetchAPI<any>(`/pdb/details?name=${name}&namespace=${namespace}`),
  getPDBYAML: (name: string, namespace: string) =>
    fetchAPI<{ yaml: string }>(`/pdb/yaml?name=${name}&namespace=${namespace}`),
  getPDBDescribe: (name: string, namespace: string) =>
    fetchAPI<{ describe: string }>(`/pdb/describe?name=${name}&namespace=${namespace}`),
  updatePDB: (name: string, namespace: string, yaml: string) =>
    fetch(`${API_BASE}/pdb/update?name=${encodeURIComponent(name)}&namespace=${encodeURIComponent(namespace)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/yaml' },
      body: yaml,
    }).then(res => res.json()),
  deletePDB: (name: string, namespace: string) =>
    deleteAPI(`/pdb/delete?name=${name}&namespace=${namespace}`),

  // Horizontal Pod Autoscalers
  getHPAs: async (namespace?: string) => {
    const endpoint = namespace && namespace !== '_all' && namespace !== 'All Namespaces'
      ? `/hpas?namespace=${namespace}`
      : '/hpas?namespace=';
    const data = await fetchAPI<any[]>(endpoint);
    return Array.isArray(data) ? data : [];
  },
  getHPADetails: (name: string, namespace: string) =>
    fetchAPI<any>(`/hpa/details?name=${name}&namespace=${namespace}`),
  getHPAYAML: (name: string, namespace: string) =>
    fetchAPI<{ yaml: string }>(`/hpa/yaml?name=${name}&namespace=${namespace}`),
  getHPADescribe: (name: string, namespace: string) =>
    fetchAPI<{ describe: string }>(`/hpa/describe?name=${name}&namespace=${namespace}`),
  updateHPA: (name: string, namespace: string, yaml: string) =>
    fetch(`${API_BASE}/hpa/update?name=${encodeURIComponent(name)}&namespace=${encodeURIComponent(namespace)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/yaml' },
      body: yaml,
    }).then(res => res.json()),
  deleteHPA: (name: string, namespace: string) =>
    deleteAPI(`/hpa/delete?name=${name}&namespace=${namespace}`),

  // ============ Network ============
  // Services
  getServices: async (namespace?: string) => {
    const endpoint = namespace && namespace !== '_all' && namespace !== 'All Namespaces'
      ? `/services?namespace=${namespace}`
      : '/services?namespace=';
    const data = await fetchAPI<any[]>(endpoint);
    return Array.isArray(data) ? data : [];
  },
  getServiceYAML: (name: string, namespace: string) =>
    fetchAPI<{ yaml: string }>(`/service/yaml?name=${name}&namespace=${namespace}`),
  getServiceDetails: (name: string, namespace: string) =>
    fetchAPI<{ name: string; type: string; clusterIP: string; ports: string; portsDetails: any[]; selector: string; age: string }>(`/service/details?name=${name}&namespace=${namespace}`),
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
    const endpoint = namespace && namespace !== '_all' && namespace !== 'All Namespaces'
      ? `/ingresses?namespace=${namespace}`
      : '/ingresses?namespace=';
    const data = await fetchAPI<any[]>(endpoint);
    return Array.isArray(data) ? data : [];
  },
  getIngressDetails: (name: string, namespace: string) =>
    fetchAPI<any>(`/ingress/details?name=${encodeURIComponent(name)}&namespace=${encodeURIComponent(namespace)}`),
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

  // ============ Namespaces ============
  getNamespaceDetails: (name: string) =>
    fetchAPI<any>(`/namespace/details?name=${name}`),
  getNamespaceYAML: (name: string) =>
    fetchAPI<{ yaml: string }>(`/namespace/yaml?name=${name}`),
  updateNamespace: (name: string, yaml: string) =>
    fetch(`${API_BASE}/namespace/update?name=${encodeURIComponent(name)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/yaml' },
      body: yaml,
    }).then(res => res.json()),
  getNamespaceDescribe: (name: string) =>
    fetchAPI<{ describe: string }>(`/namespace/describe?name=${name}`),
  deleteNamespace: (name: string) =>
    deleteAPI(`/namespace/delete?name=${name}`),

  // Network Policies
  getNetworkPolicies: async (namespace?: string) => {
    const endpoint = namespace && namespace !== '_all' && namespace !== 'All Namespaces'
      ? `/networkpolicies?namespace=${namespace}`
      : '/networkpolicies?namespace=';
    const data = await fetchAPI<any[]>(endpoint);
    return Array.isArray(data) ? data : [];
  },
  getNetworkPolicyYAML: (name: string, namespace: string) =>
    fetchAPI<{ yaml: string }>(`/networkpolicy/yaml?name=${name}&namespace=${namespace}`),
  updateNetworkPolicy: (name: string, namespace: string, yaml: string) =>
    fetchAPI<{ success: boolean }>(`/networkpolicy/update?name=${name}&namespace=${namespace}`, {
      method: 'POST',
      body: JSON.stringify({ yaml }),
    }),
  getNetworkPolicyDescribe: (name: string, namespace: string) =>
    fetchAPI<{ describe: string }>(`/networkpolicy/describe?name=${name}&namespace=${namespace}`),
  getNetworkPolicyDetails: (name: string, namespace: string) =>
    fetchAPI<any>(`/networkpolicy/details?name=${name}&namespace=${namespace}`),
  deleteNetworkPolicy: (name: string, namespace: string) =>
    deleteAPI(`/networkpolicy/delete?name=${name}&namespace=${namespace}`),

  // ============ Config ============
  // ConfigMaps
  getConfigMaps: async (namespace?: string) => {
    const endpoint = namespace && namespace !== '_all' && namespace !== 'All Namespaces'
      ? `/configmaps?namespace=${namespace}`
      : '/configmaps?namespace=';
    const data = await fetchAPI<any[]>(endpoint);
    return Array.isArray(data) ? data : [];
  },
  getConfigMapDetails: (name: string, namespace: string) =>
    fetchAPI<any>(`/configmap/details?name=${name}&namespace=${namespace}`),
  getConfigMapYAML: (name: string, namespace: string) =>
    fetchAPI<{ yaml: string }>(`/configmap/yaml?name=${name}&namespace=${namespace}`),
  updateConfigMap: async (name: string, namespace: string, yaml: string) => {
    const response = await fetch(`/api/configmap/update?name=${encodeURIComponent(name)}&namespace=${encodeURIComponent(namespace)}`, {
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
  getConfigMapDescribe: (name: string, namespace: string) =>
    fetchAPI<{ describe: string }>(`/configmap/describe?name=${name}&namespace=${namespace}`),
  deleteConfigMap: (name: string, namespace: string) =>
    deleteAPI(`/configmap/delete?name=${name}&namespace=${namespace}`),

  // Secrets
  getSecrets: async (namespace?: string) => {
    const endpoint = namespace && namespace !== '_all' && namespace !== 'All Namespaces'
      ? `/secrets?namespace=${namespace}`
      : '/secrets?namespace=';
    const data = await fetchAPI<any[]>(endpoint);
    return Array.isArray(data) ? data : [];
  },
  getSecretDetails: (name: string, namespace: string) =>
    fetchAPI<any>(`/secret/details?name=${name}&namespace=${namespace}`),
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
    const endpoint = namespace && namespace !== '_all' && namespace !== 'All Namespaces'
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
    const data = await fetchAPI<any>('/nodes');
    // Handle both old format (array) and new format (object with nodes array)
    if (Array.isArray(data)) {
      return data;
    }
    // New format: { nodes: [...], total: X, healthy: Y, schedulable: Z, ... }
    return data.nodes || [];
  },
  getNodeDetails: (name: string) =>
    fetchAPI<any>(`/node/details?name=${name}`),
  getNodeYAML: (name: string) =>
    fetchAPI<{ yaml: string }>(`/node/yaml?name=${name}`),
  getNodeDescribe: (name: string) =>
    fetchAPI<{ describe: string }>(`/node/describe?name=${name}`),

  // ============ Topology ============
  getTopology: (namespace?: string) => {
    const endpoint = namespace && namespace !== '_all' && namespace !== 'All Namespaces'
      ? `/topology?namespace=${namespace}`
      : '/topology';
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
  // Backend returns { success: boolean, sessions: PortForwardSession[] }
  // but some older callers expect a plain array, so normalize here.
  listPortForwards: async () => {
    const data = await fetchAPI<any>('/portforward/list');
    if (Array.isArray(data)) {
      return data;
    }
    if (data && Array.isArray(data.sessions)) {
      return data.sessions;
    }
    return [];
  },

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

  // ============ Vulnerabilities ============
  scanVulnerabilities: (severity?: string) => {
    const params = new URLSearchParams();
    if (severity) params.append('severity', severity);
    const query = params.toString() ? `?${params.toString()}` : '';
    return fetchAPI<{ vulnerabilities: any[]; stats: any; lastRefresh: string }>(`/vulnerabilities/scan${query}`);
  },
  refreshVulnerabilities: () =>
    fetchAPI<{ success: boolean; message: string; lastRefresh: string; cveCount: number }>('/vulnerabilities/refresh', {
      method: 'POST',
    }),
  getVulnerabilityStats: () => fetchAPI<any>('/vulnerabilities/stats'),

  // ============ Anomaly Detection ============
  detectAnomalies: (severity?: string) => {
    const url = severity ? `/anomalies/detect?severity=${severity}` : '/anomalies/detect';
    return fetchAPI<{ anomalies: Anomaly[]; stats: AnomalyStats; duration: string }>(url);
  },
  getAnomalyStats: () =>
    fetchAPI<AnomalyStats>('/anomalies/stats'),
  remediateAnomaly: (anomalyId: string) =>
    fetchAPI<{ success: boolean; message?: string; anomaly?: Anomaly }>('/anomalies/remediate', {
      method: 'POST',
      body: JSON.stringify({ anomalyId }),
    }),
  // ============ ML Recommendations ============
  getMLRecommendations: () =>
    fetchAPI<{ recommendations: any[]; total: number; error?: string; message?: string; metricsStats?: any }>('/ml/recommendations'),
  getMLRecommendationsStats: () =>
    fetchAPI<{ totalSamples: number; minRequired: number; progress: number; hasEnoughData: boolean; remainingNeeded: number }>('/ml/recommendations/stats'),
  predictResourceNeeds: (namespace: string, deployment: string, hoursAhead?: number) => {
    const params = new URLSearchParams({ namespace, deployment });
    if (hoursAhead) params.append('hours', hoursAhead.toString());
    return fetchAPI<{ cpuPrediction: number; memoryPrediction: number; hoursAhead: number }>(`/ml/predict?${params.toString()}`);
  },
  getAnomalyMetrics: (limit?: number) => {
    const url = limit ? `/anomalies/metrics?limit=${limit}` : '/anomalies/metrics';
    return fetchAPI<{ metrics: MetricSample[]; count: number }>(url);
  },

  // ============ Event Monitoring ============
  getMonitoredEvents: (filters?: {
    type?: string;
    category?: string;
    severity?: string;
    namespace?: string;
    since?: string;
    limit?: number;
  }) => {
    const params = new URLSearchParams();
    if (filters?.type) params.append('type', filters.type);
    if (filters?.category) params.append('category', filters.category);
    if (filters?.severity) params.append('severity', filters.severity);
    if (filters?.namespace) params.append('namespace', filters.namespace);
    if (filters?.since) params.append('since', filters.since);
    if (filters?.limit) params.append('limit', filters.limit.toString());
    const query = params.toString() ? `?${params.toString()}` : '';
    return fetchAPI<{ events: any[]; total: number }>(`/events/monitored${query}`);
  },
  getLogErrors: (filters?: {
    namespace?: string;
    since?: string;
    limit?: number;
    critical_only?: boolean;
  }) => {
    const params = new URLSearchParams();
    if (filters?.namespace) params.append('namespace', filters.namespace);
    if (filters?.since) params.append('since', filters.since);
    if (filters?.limit) params.append('limit', filters.limit.toString());
    // Explicitly set critical_only parameter
    if (filters?.critical_only === false) {
      params.append('critical_only', 'false');
    } else if (filters?.critical_only === true) {
      params.append('critical_only', 'true');
    } else {
      // Default to true if not specified
      params.append('critical_only', 'true');
    }
    const query = params.toString() ? `?${params.toString()}` : '';
    return fetchAPI<{ errors: any[]; total: number }>(`/events/log-errors${query}`);
  },
  getEventStats: () =>
    fetchAPI<{
      by_severity: Record<string, number>;
      by_type: Record<string, number>;
      by_category: Record<string, number>;
      total_events: number;
      total_errors: number;
    }>('/events/stats'),
  getGroupedEvents: (period?: string) => {
    const params = new URLSearchParams();
    if (period) params.append('period', period);
    const query = params.toString() ? `?${params.toString()}` : '';
    return fetchAPI<{ groups: Array<{ time: string; events: any[]; count: number }>; period: string }>(`/events/grouped${query}`);
  },

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
  
  // ============ Workspace Context ============
  getWorkspaceContext: () => fetchAPI<any>('/workspace/context'),
  setWorkspaceContext: (context: any) =>
    fetchAPI<any>('/workspace/context', {
      method: 'POST',
      body: JSON.stringify(context),
    }),
  updateWorkspaceContext: (context: any) =>
    fetchAPI<any>('/workspace/context', {
      method: 'POST',
      body: JSON.stringify(context),
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
  installApp: (name: string, namespace: string, values?: Record<string, any>, clusterName?: string) =>
    fetchAPI<any>('/apps/install', {
      method: 'POST',
      body: JSON.stringify({ name, namespace, values, clusterName }),
    }),
  uninstallApp: (name: string, namespace: string) =>
    fetchAPI<any>('/apps/uninstall', {
      method: 'POST',
      body: JSON.stringify({ name, namespace }),
    }),
  getInstalledApps: () => fetchAPI<any[]>('/apps/installed'),
  getLocalClusters: () => fetchAPI<{ success: boolean; clusters: any[]; total: number }>('/apps/local-clusters'),
  
  // ============ Custom App Deployment ============
  previewCustomApp: (manifests: string[], namespace: string) =>
    fetchAPI<CustomAppPreviewResponse>('/custom-apps/preview', {
      method: 'POST',
      body: JSON.stringify({ manifests, namespace }),
    }),
  deployCustomApp: (manifests: string[], namespace: string) =>
    fetchAPI<CustomAppDeployResponse>('/custom-apps/deploy', {
      method: 'POST',
      body: JSON.stringify({ deploymentType: 'manifest', manifests, namespace }),
    }),
  deployCustomAppWithHelm: (request: CustomAppDeployRequest) =>
    fetchAPI<CustomAppDeployResponse>('/custom-apps/deploy', {
      method: 'POST',
      body: JSON.stringify(request),
    }),
  listCustomApps: () =>
    fetchAPI<{ success: boolean; apps: CustomAppInfo[] }>('/custom-apps/list'),
  getCustomApp: (deploymentId: string) =>
    fetchAPI<{ success: boolean; app: CustomAppInfo }>(`/custom-apps/get?deploymentId=${deploymentId}`),
  updateCustomApp: (deploymentId: string, manifests: string[], namespace: string) =>
    fetchAPI<CustomAppDeployResponse>(`/custom-apps/update?deploymentId=${deploymentId}`, {
      method: 'PUT',
      body: JSON.stringify({ manifests, namespace }),
    }),
  restartCustomApp: (deploymentId: string) =>
    fetchAPI<{ success: boolean; message?: string; error?: string }>(`/custom-apps/restart?deploymentId=${deploymentId}`, {
      method: 'POST',
    }),
  deleteCustomApp: (deploymentId: string) =>
    fetchAPI<{ success: boolean; message?: string; error?: string }>(`/custom-apps/delete?deploymentId=${deploymentId}`, {
      method: 'DELETE',
    }),

  // ============ AI Log Analysis ============
  analyzePodsLogs: (namespace?: string) =>
    fetchAPI<any>(`/ai/analyze/logs${namespace ? `?namespace=${namespace}` : ''}`),
  analyzePodLogs: (name: string, namespace: string) =>
    fetchAPI<any>(`/ai/analyze/pod-logs?name=${name}&namespace=${namespace}`),

  // Storage
  getPVDetails: (name: string) =>
    fetchAPI<any>(`/storage/pv/details?name=${encodeURIComponent(name)}`),
  getPVYAML: (name: string) =>
    fetchAPI<{ yaml: string }>(`/storage/pv/yaml?name=${encodeURIComponent(name)}`),
  getPVDescribe: (name: string) =>
    fetchAPI<{ describe: string }>(`/storage/pv/describe?name=${encodeURIComponent(name)}`),
  updatePV: async (name: string, yaml: string) => {
    const response = await fetch(`/api/storage/pv/update?name=${encodeURIComponent(name)}`, {
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
  deletePV: (name: string) =>
    deleteAPI(`/storage/pv/delete?name=${name}`),
  getPVCDetails: (name: string, namespace: string) =>
    fetchAPI<any>(`/storage/pvc/details?name=${encodeURIComponent(name)}&namespace=${encodeURIComponent(namespace)}`),
  getPVCYAML: (name: string, namespace: string) =>
    fetchAPI<{ yaml: string }>(`/storage/pvc/yaml?name=${encodeURIComponent(name)}&namespace=${encodeURIComponent(namespace)}`),
  getPVCDescribe: (name: string, namespace: string) =>
    fetchAPI<{ describe: string }>(`/storage/pvc/describe?name=${encodeURIComponent(name)}&namespace=${encodeURIComponent(namespace)}`),
  updatePVC: async (name: string, namespace: string, yaml: string) => {
    const response = await fetch(`/api/storage/pvc/update?name=${encodeURIComponent(name)}&namespace=${encodeURIComponent(namespace)}`, {
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
  deletePVC: (name: string, namespace: string) =>
    deleteAPI(`/storage/pvc/delete?name=${name}&namespace=${namespace}`),
  getStorageClassYAML: (name: string) =>
    fetchAPI<{ yaml: string }>(`/storage/storageclass/yaml?name=${encodeURIComponent(name)}`),
  updateStorageClass: async (name: string, yaml: string) => {
    const response = await fetch(`/api/storage/storageclass/update?name=${encodeURIComponent(name)}`, {
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
  deleteStorageClass: (name: string) =>
    deleteAPI(`/storage/storageclass/delete?name=${name}`),

  // RBAC
  getRoleYAML: (name: string, namespace: string) =>
    fetchAPI<{ yaml: string }>(`/rbac/role/yaml?name=${encodeURIComponent(name)}&namespace=${encodeURIComponent(namespace)}`),
  updateRole: async (name: string, namespace: string, yaml: string) => {
    const response = await fetch(`/api/rbac/role/update?name=${encodeURIComponent(name)}&namespace=${encodeURIComponent(namespace)}`, {
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
  deleteRole: (name: string, namespace: string) =>
    deleteAPI(`/rbac/role/delete?name=${name}&namespace=${namespace}`),
  getRoleBindingYAML: (name: string, namespace: string) =>
    fetchAPI<{ yaml: string }>(`/rbac/rolebinding/yaml?name=${encodeURIComponent(name)}&namespace=${encodeURIComponent(namespace)}`),
  updateRoleBinding: async (name: string, namespace: string, yaml: string) => {
    const response = await fetch(`/api/rbac/rolebinding/update?name=${encodeURIComponent(name)}&namespace=${encodeURIComponent(namespace)}`, {
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
  deleteRoleBinding: (name: string, namespace: string) =>
    deleteAPI(`/rbac/rolebinding/delete?name=${name}&namespace=${namespace}`),
  getClusterRoleYAML: (name: string) =>
    fetchAPI<{ yaml: string }>(`/rbac/clusterrole/yaml?name=${encodeURIComponent(name)}`),
  updateClusterRole: async (name: string, yaml: string) => {
    const response = await fetch(`/api/rbac/clusterrole/update?name=${encodeURIComponent(name)}`, {
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
  deleteClusterRole: (name: string) =>
    deleteAPI(`/rbac/clusterrole/delete?name=${name}`),
  getClusterRoleBindingYAML: (name: string) =>
    fetchAPI<{ yaml: string }>(`/rbac/clusterrolebinding/yaml?name=${encodeURIComponent(name)}`),
  updateClusterRoleBinding: async (name: string, yaml: string) => {
    const response = await fetch(`/api/rbac/clusterrolebinding/update?name=${encodeURIComponent(name)}`, {
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
  deleteClusterRoleBinding: (name: string) =>
    deleteAPI(`/rbac/clusterrolebinding/delete?name=${name}`),
  
  // Apply ML recommendation
  applyRecommendation: async (recommendationId: string) => {
    return fetchAPI<{ success: boolean; message?: string; error?: string }>(`/ml/recommendations/apply`, {
      method: 'POST',
      body: JSON.stringify({ id: recommendationId }),
    });
  },

  // ============ Connectors ============
  getConnectors: () => fetchAPI<Connector[]>('/connectors'),
  createConnector: (connector: { type: string; name: string; config: Record<string, any> }) =>
    fetchAPI<{ success: boolean; connector: Connector; error?: string }>('/connectors', {
      method: 'POST',
      body: JSON.stringify(connector),
    }),
  updateConnector: (id: string, updates: { name?: string; enabled?: boolean; config?: Record<string, any> }) =>
    fetchAPI<{ success: boolean; connector: Connector; error?: string }>(`/connectors/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    }),
  deleteConnector: (id: string) =>
    fetchAPI<{ success: boolean; error?: string }>(`/connectors/${id}`, {
      method: 'DELETE',
    }),
  testConnector: (id: string) =>
    fetchAPI<{ success: boolean; message?: string; error?: string }>(`/connectors/${id}/test`, {
      method: 'POST',
    }),

  // ============ Incidents ============
  getIncidents: async (namespace?: string, pattern?: string, severity?: string, status?: string) => {
    const params = new URLSearchParams();
    if (namespace) params.append('namespace', namespace);
    if (pattern) params.append('pattern', pattern);
    if (severity) params.append('severity', severity);
    if (status) params.append('status', status);
    const query = params.toString();
    const endpoint = query ? `/v2/incidents?${query}` : '/v2/incidents';
    const data = await fetchAPI<{ incidents: Incident[]; total: number; summary?: any }>(endpoint);
    return data.incidents || [];
  },

  getIncident: async (id: string) => {
    return fetchAPI<Incident>(`/v2/incidents/${id}`);
  },
  getIncidentSnapshot: async (id: string) => {
    return fetchAPI<IncidentSnapshot>(`/v2/incidents/${id}/snapshot`);
  },
  getIncidentLogs: async (id: string, tail?: number) => {
    const params = new URLSearchParams();
    if (tail) params.append('tail', tail.toString());
    const query = params.toString();
    return fetchAPI<{ logs: any[] }>(`/v2/incidents/${id}/logs${query ? `?${query}` : ''}`);
  },
  getIncidentMetrics: async (id: string) => {
    return fetchAPI<{ metrics: any[] }>(`/v2/incidents/${id}/metrics`);
  },
  getIncidentChanges: async (id: string, lookback?: number) => {
    const params = new URLSearchParams();
    if (lookback) params.append('lookback', lookback.toString());
    const query = params.toString();
    return fetchAPI<{ changes: any[] }>(`/v2/incidents/${id}/changes${query ? `?${query}` : ''}`);
  },
  getIncidentRunbooks: async (id: string) => {
    return fetchAPI<{ runbooks: any[] }>(`/v2/incidents/${id}/runbooks`);
  },
  getIncidentSimilar: async (id: string) => {
    return fetchAPI<{ similar: any[] }>(`/v2/incidents/${id}/similar`);
  },
  getIncidentEvidence: async (id: string) => {
    return fetchAPI<{ evidence: any[] }>(`/v2/incidents/${id}/evidence`);
  },
  getIncidentCitations: async (id: string) => {
    return fetchAPI<{ citations: any[] }>(`/v2/incidents/${id}/citations`);
  },
  
  // Learning/Feedback endpoints
  submitIncidentFeedback: async (id: string, outcome: 'worked' | 'not_worked' | 'unknown', appliedFixId?: string, appliedFixType?: string, notes?: string) => {
    return fetchAPI<{ status: string; message: string; outcomeId?: number; learningStatus?: any; summary?: string }>(`/v2/incidents/${id}/feedback`, {
      method: 'POST',
      body: JSON.stringify({ outcome, appliedFixId, appliedFixType, notes }),
    });
  },
  
  getLearningStatus: async () => {
    return fetchAPI<{
      featureWeights: Array<{ key: string; weight: number; updatedAt: string }>;
      causePriors: Array<{ causeKey: string; prior: number; updatedAt: string }>;
      lastUpdated: string;
      sampleSize: number;
      topImprovingSignals: string[];
    }>('/v2/learning/status');
  },
  
  resetLearning: async () => {
    return fetchAPI<{ status: string; message: string }>('/v2/learning/reset', {
      method: 'POST',
      body: JSON.stringify({ confirm: true }),
    });
  },

  getIncidentRecommendations: async (incidentId: string) => {
    return fetchAPI<Recommendation[]>(`/v2/incidents/${incidentId}/recommendations`);
  },

  // ============ Remediation Engine APIs ============
  getIncidentFixes: async (incidentId: string) => {
    return fetchAPI<RemediationPlan>(`/v2/incidents/${incidentId}/fixes`);
  },

  previewFix: async (incidentId: string, fixId: string) => {
    return fetchAPI<FixPreviewResponseV2>(`/v2/incidents/${incidentId}/fix-preview`, {
      method: 'POST',
      body: JSON.stringify({ fixId }),
    });
  },

  applyFix: async (incidentId: string, fixId: string, confirmed: boolean, resourceInfo?: { resourceNamespace?: string; resourceKind?: string; resourceName?: string }) => {
    const body: any = { fixId, confirmed };
    if (resourceInfo) {
      body.resourceNamespace = resourceInfo.resourceNamespace;
      body.resourceKind = resourceInfo.resourceKind;
      body.resourceName = resourceInfo.resourceName;
    }
    return fetchAPI<FixApplyResponseV2>(`/v2/incidents/${incidentId}/fix-apply`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  postCheck: async (incidentId: string, executionId?: string) => {
    return fetchAPI<PostCheckResponse>(`/v2/incidents/${incidentId}/post-check`, {
      method: 'POST',
      body: JSON.stringify({ executionId }),
    });
  },

  // Legacy fix endpoints (kept for backward compatibility)
  previewIncidentFix: async (incidentId: string, recommendationId?: string) => {
    return fetchAPI<FixPreviewResponse>(`/v2/incidents/fix-preview`, {
      method: 'POST',
      body: JSON.stringify({ incidentId, recommendationId }),
    });
  },

  dryRunIncidentFix: async (incidentId: string, recommendationId?: string) => {
    return fetchAPI<FixApplyResponse>(`/v2/incidents/fix-apply`, {
      method: 'POST',
      body: JSON.stringify({ incidentId, recommendationId, dryRun: true }),
    });
  },

  applyIncidentFix: async (incidentId: string, recommendationId?: string) => {
    return fetchAPI<FixApplyResponse>(`/v2/incidents/fix-apply`, {
      method: 'POST',
      body: JSON.stringify({ incidentId, recommendationId, dryRun: false }),
    });
  },

  resolveIncident: async (incidentId: string, resolution: string) => {
    return fetchAPI<{ status: string }>(`/v2/incidents/${incidentId}/resolve`, {
      method: 'POST',
      body: JSON.stringify({ resolution }),
    });
  },

  acknowledgeIncident: async (incidentId: string) => {
    return fetchAPI<{ status: string }>(`/v2/incidents/${incidentId}/acknowledge`, {
      method: 'POST',
    });
  },

  getIncidentCount: async (namespace?: string, pattern?: string, severity?: string) => {
    const params = new URLSearchParams();
    if (namespace) params.append('namespace', namespace);
    if (pattern) params.append('pattern', pattern);
    if (severity) params.append('severity', severity);
    const query = params.toString();
    const endpoint = query ? `/v2/incidents?${query}` : '/v2/incidents';
    const data = await fetchAPI<{ incidents: Incident[]; total: number }>(endpoint);
    return data.total || 0;
  },

  getIncidentsSummary: async () => {
    const data = await fetchAPI<{ summary: any; patternStats: any }>('/v2/incidents/summary');
    return {
      total: data.summary?.total || 0,
      active: data.summary?.active || 0,
      bySeverity: data.summary?.bySeverity || {},
      byPattern: data.summary?.byPattern || {},
      patternStats: data.patternStats || {},
    };
  },

  // ============ History/Timeline ============
  getHistoryEvents: async (incidentId?: string, since?: string, until?: string) => {
    const params = new URLSearchParams();
    if (incidentId) params.append('incident_id', incidentId);
    if (since) params.append('since', since);
    if (until) params.append('until', until);
    const query = params.toString();
    const endpoint = query ? `/history/events?${query}` : '/history/events';
    return fetchAPI<{
      events: Array<{
        timestamp: string;
        type: string;
        severity: string;
        resourceKind: string;
        resourceName: string;
        namespace?: string;
        eventType?: string;
        message?: string;
        metadata?: Record<string, any>;
      }>;
      total: number;
      since: string;
      until: string;
      incidentId?: string;
    }>(endpoint);
  },

  // ============ Brain ============
  // Use backend endpoints that query real cluster data
  getBrainTimeline: async (hours: number = 72) => {
    const data = await fetchAPI<{ events: any[]; total: number }>(`/brain/timeline?hours=${hours}`);
    return data.events || [];
  },

  getBrainOOMInsights: async () => {
    return fetchAPI<{
      incidents24h: number;
      crashLoops24h: number;
      topProblematic: Array<{
        name: string;
        namespace: string;
        kind: string;
        issues: { oomKilled: number; restarts: number; crashLoops: number };
        score: number;
      }>;
    }>('/brain/oom-insights');
  },

  getBrainSummary: async () => {
    return fetchAPI<{
      last24hSummary: string;
      topRiskAreas: string[];
      recommendedActions: string[];
      generatedAt: string;
    }>('/brain/summary');
  },

  // ============ Continuity ============
  getContinuitySummary: async (window: string = '7d') => {
    return fetchAPI<{
      incidents_count: number;
      major_incidents_count: number;
      deployments_with_failures: string[];
      node_issues: string[];
      window: string;
      last_seen_at: string;
    }>(`/continuity/summary?window=${window}`, {
      timeout: 45000, // 45 seconds timeout for continuity API (can be slow with many namespaces)
    } as any);
  },

  // ============ Cluster Manager ============
  getClusters: () =>
    fetchAPI<ClusterManagerResponse>('/clusters'),
  getClusterManagerStatus: () =>
    fetchAPI<ClusterManagerStatus>('/clusters/status'),
  connectCluster: (payload: ClusterConnectPayload) =>
    fetchAPI<{ success: boolean; cluster?: ClusterEntry; status: ClusterManagerStatus }>('/clusters/connect', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  disconnectCluster: () =>
    fetchAPI<{ success: boolean; status: ClusterManagerStatus }>('/clusters/disconnect', {
      method: 'POST',
    }),

  // ============ AutoFix Engine ============
  getAutoFixRules: async () => {
    const data = await fetchAPI<{ rules: AutoFixRule[] }>('/autofix/rules');
    return data.rules || [];
  },
  toggleAutoFixRule: async (ruleId: string, enabled: boolean, settings?: AutoFixRuleSettings) => {
    return fetchAPI<{ success: boolean; rule: AutoFixRule }>('/autofix/rules/toggle', {
      method: 'POST',
      body: JSON.stringify({ ruleId, enabled, settings }),
    });
  },
  getAutoFixActions: async () => {
    const data = await fetchAPI<{ actions: AutoFixAction[] }>('/autofix/actions');
    return data.actions || [];
  },
  getAutoFixEnabled: async () => {
    const data = await fetchAPI<{ enabled: boolean }>('/autofix/enabled');
    return data.enabled;
  },
  setAutoFixEnabled: async (enabled: boolean) => {
    return fetchAPI<{ success: boolean; enabled: boolean }>('/autofix/enabled', {
      method: 'POST',
      body: JSON.stringify({ enabled }),
    });
  },

  // Database Backup Management
  database: {
    getBackupStatus: () => fetchAPI<{
      enabled: boolean;
      interval: number; // in hours
      backup_dir: string;
      last_backup?: string;
      next_backup?: string;
      backup_count: number;
      total_size: number;
      error?: string;
    }>('/database/backup/status'),

    updateBackupConfig: (config: {
      enabled: boolean;
      interval: number; // in hours
      backup_dir?: string;
    }) => fetchAPI<{ success: boolean; message: string }>('/database/backup/config', {
      method: 'POST',
      body: JSON.stringify(config),
    }),

    createBackup: () => fetchAPI<{
      success: boolean;
      message: string;
      backup_path: string;
      timestamp: string;
    }>('/database/backup/now', {
      method: 'POST',
    }),

    listBackups: () => fetchAPI<{
      backups: Array<{
        name: string;
        path: string;
        size: number;
        created_at: string;
      }>;
      count: number;
    }>('/database/backup/list'),

    restoreBackup: (backupPath: string, dbPath?: string) => fetchAPI<{
      success: boolean;
      message: string;
      backup_path: string;
      db_path: string;
    }>('/database/backup/restore', {
      method: 'POST',
      body: JSON.stringify({ backup_path: backupPath, db_path: dbPath }),
    }),
  },

  // ============ Performance Instrumentation ============
  getPerfSummary: async (window?: number, route?: string) => {
    const params = new URLSearchParams();
    if (window) params.append('window', window.toString());
    if (route) params.append('route', route);
    const query = params.toString();
    const endpoint = query ? `/v2/perf/summary?${query}` : '/v2/perf/summary';
    return fetchAPI<{
      summaries: Array<{
        route: string;
        method: string;
        count: number;
        p50: number;
        p90: number;
        p99: number;
        cacheHitRate: number;
        avgUpstreamK8sCalls: number;
        avgUpstreamK8sMs: number;
        avgDBMs: number;
        lastUpdated: string;
      }>;
      window: number;
    }>(endpoint);
  },

  getPerfRecent: async (count?: number) => {
    const params = new URLSearchParams();
    if (count) params.append('count', count.toString());
    const query = params.toString();
    const endpoint = query ? `/v2/perf/recent?${query}` : '/v2/perf/recent';
    return fetchAPI<{
      spans: Array<{
        requestId: string;
        route: string;
        method: string;
        handlerTotalMs: number;
        upstreamK8sCalls: number;
        upstreamK8sTotalMs: number;
        dbMs: number;
        cacheHit: boolean;
        incidentPattern?: string;
        cluster?: string;
        timestamp: string;
        tags?: Record<string, string>;
      }>;
      count: number;
    }>(endpoint);
  },

  clearPerf: async (confirm: boolean = false) => {
    return fetchAPI<{ success: boolean; message: string }>('/v2/perf/clear', {
      method: 'POST',
      body: JSON.stringify({ confirm }),
    });
  },

  postPerfUI: async (metric: {
    page: string;
    action: string;
    ms: number;
    incidentId?: string;
    requestId?: string;
  }) => {
    return fetchAPI<{ success: boolean }>('/v2/perf/ui', {
      method: 'POST',
      body: JSON.stringify(metric),
    });
  },

  // ============ Terminal ============
  getAvailableShells: () => fetchAPI<{ shells: Array<{ name: string; display: string; path: string; priority: number }> }>('/terminal/shells'),
  getTerminalPreferences: () => fetchAPI<{ preferredShell: string }>('/terminal/preferences'),
};

interface Connector {
  id: string;
  type: string;
  name: string;
  enabled: boolean;
  config: Record<string, any>;
  status: 'connected' | 'disconnected' | 'error';
  lastTest?: string;
  createdAt: string;
  updatedAt: string;
}

// V2 Incident types with full intelligence
export interface KubeResourceRef {
  kind: string;
  name: string;
  namespace: string;
  apiVersion?: string;
  uid?: string;
}

export interface Diagnosis {
  summary: string;
  probableCauses: string[];
  confidence: number;
  evidence: string[];
  generatedAt: string;
}

// ============ Incident Snapshot Types ============
export interface IncidentSnapshot {
  fingerprint: string;
  incidentId: string;
  pattern: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info' | 'warning';
  status: 'open' | 'investigating' | 'remediating' | 'resolved' | 'suppressed';
  resource: KubeResourceRef;
  title: string;
  description: string;
  occurrences: number;
  firstSeen: string;
  lastSeen: string;
  // Hot evidence
  restartCounts?: RestartCounts;
  lastExitCode?: number;
  lastErrorString?: string;
  readinessStatus?: string;
  recentChangeSummary?: string;
  // Diagnosis
  diagnosisSummary: string;
  rootCauses: RootCause[];
  confidence: number;
  confidenceLabel: string;
  // Impact
  impact: ImpactSummary;
  // Why now
  whyNowExplanation: string;
  // Recommended action
  recommendedAction?: RecommendedAction;
  // Cache metadata
  cachedAt: string;
  validUntil: string;
}

export interface RestartCounts {
  last5Minutes: number;
  last1Hour: number;
  last24Hours: number;
  total: number;
}

export interface RootCause {
  cause: string;
  likelihood: number;
  evidenceCount?: number;
}

export interface ImpactSummary {
  affectedReplicas: number;
  serviceExposure: ServiceExposure;
  userFacingLikelihood: number;
  userFacingLabel: string;
  namespaceCriticality?: string;
}

export interface ServiceExposure {
  hasService: boolean;
  serviceName?: string;
  hasIngress: boolean;
  ingressNames?: string[];
}

export interface RecommendedAction {
  title: string;
  description?: string;
  tab: string;
  risk?: string;
}

export interface ProposedFix {
  type: 'PATCH' | 'SCALE' | 'RESTART' | 'ROLLBACK' | 'DELETE' | 'CREATE';
  description: string;
  previewDiff?: string;
  dryRunCmd?: string;
  applyCmd?: string;
  targetResource: KubeResourceRef;
  safe: boolean;
  requiresConfirmation: boolean;
}

export interface FixAction {
  label: string;
  type: 'PREVIEW_PATCH' | 'SCALE' | 'RESTART' | 'ROLLBACK' | 'DELETE_POD';
  description: string;
  safe: boolean;
  requiresConfirmation: boolean;
}

export interface Recommendation {
  id: string;
  title: string;
  explanation: string;
  evidence: string[];
  risk: 'low' | 'medium' | 'high';
  priority: number;
  proposedFix?: ProposedFix;
  action?: FixAction;
  manualSteps?: string[];
  tags?: string[];
}

// ============ Remediation Engine Types ============
export interface RemediationPlan {
  incidentId: string;
  recommendedAction: RecommendedActionDetails | null;
  fixPlans: FixPlan[];
  generatedAt: string;
}

export interface RecommendedActionDetails {
  type: 'read_only';
  title: string;
  description: string;
  actions: string[];
}

export interface FixPlan {
  id: string;
  title: string;
  description: string;
  type: 'read_only' | 'patch' | 'rollback' | 'scale' | 'restart' | 'config_change';
  risk: 'low' | 'medium' | 'high';
  prerequisites: string[];
  evidenceRefs: EvidenceRef[];
  preview: FixPreviewDetails;
  rollback: FixRollback;
  guardrails: FixGuardrails;
  confidence: number;
  whyThisFix: string;
}

export interface EvidenceRef {
  kind: 'event' | 'log' | 'change' | 'metric';
  refId: string;
  snippet: string;
}

export interface FixPreviewDetails {
  kubectlCommands: string[];
  dryRunSupported: boolean;
  expectedDiff: string;
}

export interface FixRollback {
  description: string;
  kubectlCommands: string[];
}

export interface FixGuardrails {
  confidenceMin: number;
  requiresNamespaceScoped: boolean;
  requiresOwnerKind: string;
  requiresUserAck: boolean;
}

export interface FixPreviewResponseV2 {
  fixId: string;
  title: string;
  description: string;
  risk: 'low' | 'medium' | 'high';
  confidence: number;
  whyThisFix: string;
  diff: string;
  kubectlCommands: string[];
  dryRunSupported: boolean;
  dryRunOutput?: string;
  dryRunError?: string;
  rollback: {
    description: string;
    kubectlCommands: string[];
  };
  guardrails: FixGuardrails;
  evidenceRefs: EvidenceRef[];
}

export interface FixApplyResponseV2 {
  executionId: string;
  status: string;
  message: string;
  changes?: string[] | Array<{ type: string; resource: string; action: string }>;
  postCheckPlan: {
    checks: string[];
    timeoutSeconds: number;
  };
}

export interface PostCheckResponse {
  incidentId: string;
  executionId?: string;
  status: 'ok' | 'warning' | 'error';
  improved: boolean;
  checks: Array<{
    name: string;
    status: 'ok' | 'warning' | 'error';
    message: string;
  }>;
  timestamp: string;
  message?: string;
}

// ============ Legacy Types ============
export interface FixChange {
  path: string;
  oldValue?: string;
  newValue?: string;
  description?: string;
}

export interface FixPreviewResponse {
  valid: boolean;
  description: string;
  diff: string;
  dryRunCmd: string;
  applyCmd: string;
  risks: string[];
  targetResource: KubeResourceRef;
  changes?: FixChange[];
  validationError?: string;
  generatedAt: string;
}

export interface FixApplyResponse {
  success: boolean;
  message: string;
  dryRun: boolean;
  changes?: string[];
  error?: string;
  rollbackCmd?: string;
  appliedAt: string;
}

export interface Symptom {
  type: string;
  confidence: number;
  evidence: string[];
  detectedAt: string;
}

export interface TimelineEntry {
  timestamp: string;
  type: string;
  title: string;
  description: string;
}

export interface Incident {
  id: string;
  fingerprint?: string;
  pattern: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info' | 'warning';
  status: 'open' | 'investigating' | 'remediating' | 'resolved' | 'suppressed';
  resource: KubeResourceRef;
  relatedResources?: KubeResourceRef[];
  title: string;
  description: string;
  occurrences: number;
  firstSeen: string;
  lastSeen: string;
  symptoms?: Symptom[];
  diagnosis?: Diagnosis;
  recommendations?: Recommendation[];
  timeline?: TimelineEntry[];
  resolvedAt?: string;
  resolution?: string;
  // Legacy fields for backward compatibility
  type?: string;
  resourceKind?: string;
  resourceName?: string;
  namespace?: string;
  count?: number;
  message?: string;
}

// ============ AutoFix Engine ============
export interface AutoFixRuleSettings {
  additionalReplicas?: number; // For HPA Max: number of additional replicas to add
  memoryIncreaseMiB?: number; // For OOM: memory to add in MiB
  maxReplicasLimit?: number; // Maximum replicas limit (0 = no limit)
}

export interface AutoFixRule {
  id: string;
  name: string;
  type: 'oom' | 'hpa_max' | 'security' | 'drift';
  enabled: boolean;
  description: string;
  lastTriggered?: string;
  triggerCount: number;
  settings?: AutoFixRuleSettings;
}

export interface AutoFixAction {
  id: string;
  timestamp: string;
  type: string;
  resource: string;
  namespace: string;
  status: 'success' | 'failed' | 'pending';
  message: string;
}

// ============ Custom App Deployment ============
export interface ResourcePreview {
  kind: string;
  name: string;
  namespace: string;
  apiVersion: string;
}

export interface HelmChartData {
  chartYaml: string;
  valuesYaml: string;
  templates: Record<string, string>; // filename -> content
  chartName: string;
  chartVersion: string;
}

export interface CustomAppDeployRequest {
  deploymentType: 'manifest' | 'helm';
  manifests?: string[]; // For manifest deployments
  namespace: string;
  helmChart?: HelmChartData; // For Helm deployments
  values?: Record<string, string>; // Helm values overrides
}

export interface CustomAppPreviewResponse {
  success: boolean;
  resources: ResourcePreview[];
  resourceCount: Record<string, number>;
  warnings?: string[];
  errors?: string[];
  manifests: string[];
}

export interface CustomAppDeployResponse {
  success: boolean;
  deploymentId: string;
  resources: ResourcePreview[];
  resourceCount: Record<string, number>;
  message?: string;
  errors?: string[];
}

export interface CustomAppInfo {
  deploymentId: string;
  name: string;
  namespace: string;
  resources: ResourcePreview[];
  resourceCount: Record<string, number>;
  createdAt: string;
  manifests?: string[];
  deploymentType?: string; // "manifest" or "helm"
  chartName?: string; // For Helm deployments
  chartVersion?: string; // For Helm deployments
}
