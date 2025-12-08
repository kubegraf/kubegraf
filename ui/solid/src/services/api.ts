// Comprehensive API service for KubeGraf

const API_BASE = '/api';

// Generic fetch wrapper with error handling
export async function fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
  // Add timeout for long-running requests (like ML recommendations)
  const timeout = 15000; // 15 seconds
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
  getStatus: () => fetchAPI<ClusterStatus>('/status'),
  
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
  getNamespaces: async () => {
    const data = await fetchAPI<{ namespaces: string[]; success: boolean }>('/namespaces');
    // Return array of namespace names (strings)
    return (data.namespaces || []).map(ns => typeof ns === 'string' ? ns : (ns as any).name || ns);
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

  // StatefulSets
  getStatefulSets: async (namespace?: string) => {
    const endpoint = namespace && namespace !== '_all' && namespace !== 'All Namespaces'
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
    const endpoint = namespace && namespace !== '_all' && namespace !== 'All Namespaces'
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
    const endpoint = namespace && namespace !== '_all' && namespace !== 'All Namespaces'
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
    const endpoint = namespace && namespace !== '_all' && namespace !== 'All Namespaces'
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

  // Pod Disruption Budgets
  getPDBs: async (namespace?: string) => {
    const endpoint = namespace && namespace !== '_all' && namespace !== 'All Namespaces'
      ? `/pdbs?namespace=${namespace}`
      : '/pdbs?namespace=';
    const data = await fetchAPI<any[]>(endpoint);
    return Array.isArray(data) ? data : [];
  },
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
    const endpoint = namespace && namespace !== '_all' && namespace !== 'All Namespaces'
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
    const endpoint = namespace && namespace !== '_all' && namespace !== 'All Namespaces'
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
  }) => {
    const params = new URLSearchParams();
    if (filters?.namespace) params.append('namespace', filters.namespace);
    if (filters?.since) params.append('since', filters.since);
    if (filters?.limit) params.append('limit', filters.limit.toString());
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
  getLocalClusters: () => fetchAPI<{ success: boolean; clusters: any[]; total: number }>('/apps/local-clusters'),

  // ============ AI Log Analysis ============
  analyzePodsLogs: (namespace?: string) =>
    fetchAPI<any>(`/ai/analyze/logs${namespace ? `?namespace=${namespace}` : ''}`),
  analyzePodLogs: (name: string, namespace: string) =>
    fetchAPI<any>(`/ai/analyze/pod-logs?name=${name}&namespace=${namespace}`),

  // Storage
  getPVYAML: (name: string) =>
    fetchAPI<{ yaml: string }>(`/storage/pv/yaml?name=${encodeURIComponent(name)}`),
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
  getPVCYAML: (name: string, namespace: string) =>
    fetchAPI<{ yaml: string }>(`/storage/pvc/yaml?name=${encodeURIComponent(name)}&namespace=${encodeURIComponent(namespace)}`),
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
  getIncidents: async (namespace?: string, type?: string, severity?: string) => {
    const params = new URLSearchParams();
    if (namespace) params.append('namespace', namespace);
    if (type) params.append('type', type);
    if (severity) params.append('severity', severity);
    const query = params.toString();
    const endpoint = query ? `/incidents?${query}` : '/incidents';
    const data = await fetchAPI<{ incidents: Incident[]; total: number }>(endpoint);
    return data.incidents || [];
  },

  // ============ Brain ============
  getBrainTimeline: async (hours: number = 72) => {
    // Get incidents for timeline
    const incidents = await api.getIncidents();
    const cutoffTime = new Date(Date.now() - hours * 3600000);
    
    // Filter and transform incidents to timeline events
    const timelineEvents = incidents
      .filter(inc => new Date(inc.firstSeen) >= cutoffTime)
      .map(inc => ({
        id: inc.id,
        timestamp: inc.firstSeen,
        type: 'incident' as const,
        severity: inc.severity as 'info' | 'warning' | 'critical',
        title: `${inc.type.replace(/_/g, ' ')} - ${inc.resourceName}`,
        description: inc.message || `${inc.resourceKind} ${inc.resourceName} in ${inc.namespace || 'cluster'}`,
        resource: {
          kind: inc.resourceKind,
          name: inc.resourceName,
          namespace: inc.namespace,
        },
      }));

    return timelineEvents;
  },

  getBrainOOMInsights: async () => {
    // Get all incidents
    const incidents = await api.getIncidents();
    const cutoffTime = new Date(Date.now() - 24 * 3600000);
    
    // Filter incidents from last 24h
    const recentIncidents = incidents.filter(inc => 
      new Date(inc.firstSeen) >= cutoffTime
    );

    // Calculate metrics
    const oomIncidents = recentIncidents.filter(inc => inc.type === 'oom').length;
    const crashLoops = recentIncidents.filter(inc => inc.type === 'crashloop').length;

    // Group by resource to find problematic workloads
    const workloadMap = new Map<string, {
      name: string;
      namespace: string;
      kind: string;
      issues: { oomKilled: number; restarts: number; crashLoops: number };
    }>();

    recentIncidents.forEach(inc => {
      const key = `${inc.namespace || ''}:${inc.resourceName}`;
      if (!workloadMap.has(key)) {
        workloadMap.set(key, {
          name: inc.resourceName.split('/')[0] || inc.resourceName,
          namespace: inc.namespace || '',
          kind: inc.resourceKind,
          issues: { oomKilled: 0, restarts: 0, crashLoops: 0 },
        });
      }
      const workload = workloadMap.get(key)!;
      if (inc.type === 'oom') workload.issues.oomKilled += inc.count;
      if (inc.type === 'crashloop') workload.issues.crashLoops += inc.count;
      workload.issues.restarts += inc.count;
    });

    // Calculate scores and sort
    const topProblematic = Array.from(workloadMap.values())
      .map(w => ({
        ...w,
        score: w.issues.oomKilled * 10 + w.issues.crashLoops * 5 + w.issues.restarts,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    return {
      incidents24h: oomIncidents,
      crashLoops24h: crashLoops,
      topProblematic,
    };
  },

  getBrainSummary: async () => {
    // Get incidents and metrics
    const incidents = await api.getIncidents();
    const cutoffTime = new Date(Date.now() - 24 * 3600000);
    const recentIncidents = incidents.filter(inc => 
      new Date(inc.firstSeen) >= cutoffTime
    );

    // Generate rule-based summary
    const criticalCount = recentIncidents.filter(inc => inc.severity === 'critical').length;
    const warningCount = recentIncidents.filter(inc => inc.severity === 'warning').length;
    const oomCount = recentIncidents.filter(inc => inc.type === 'oom').length;
    const crashLoopCount = recentIncidents.filter(inc => inc.type === 'crashloop').length;

    // Generate summary text
    let summary = `In the last 24 hours, ${recentIncidents.length} incidents were detected. `;
    if (criticalCount > 0) {
      summary += `${criticalCount} critical and `;
    }
    summary += `${warningCount} warning-level issues. `;
    if (oomCount > 0) {
      summary += `${oomCount} OOMKilled events occurred. `;
    }
    if (crashLoopCount > 0) {
      summary += `${crashLoopCount} CrashLoopBackOff incidents detected.`;
    }

    // Top risk areas
    const riskAreas: string[] = [];
    if (oomCount > 0) {
      riskAreas.push('Memory pressure and OOMKilled containers indicate resource constraints');
    }
    if (crashLoopCount > 0) {
      riskAreas.push('CrashLoopBackOff patterns suggest application instability');
    }
    if (recentIncidents.length > 10) {
      riskAreas.push('High incident rate indicates systemic issues requiring attention');
    }

    // Recommended actions
    const actions: string[] = [];
    if (oomCount > 0) {
      actions.push('Review and increase memory limits for workloads experiencing OOMKilled events');
    }
    if (crashLoopCount > 0) {
      actions.push('Investigate application logs for CrashLoopBackOff root causes');
    }
    if (recentIncidents.length > 5) {
      actions.push('Consider implementing Horizontal Pod Autoscaling (HPA) for high-traffic workloads');
    }
    if (actions.length === 0) {
      actions.push('Continue monitoring cluster health and resource usage');
    }

    return {
      last24hSummary: summary || 'No significant incidents in the last 24 hours.',
      topRiskAreas: riskAreas.slice(0, 3),
      recommendedActions: actions.slice(0, 5),
      generatedAt: new Date().toISOString(),
    };
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

export interface Incident {
  id: string;
  type: string;
  severity: 'warning' | 'critical';
  resourceKind: string;
  resourceName: string;
  namespace: string;
  firstSeen: string;
  lastSeen: string;
  count: number;
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
