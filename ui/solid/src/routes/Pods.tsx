import { Component, For, Show, createMemo, createSignal, createResource, onMount, onCleanup } from 'solid-js';
import { api } from '../services/api';
import { namespace } from '../stores/cluster';
import { addNotification } from '../stores/ui';
import Modal from '../components/Modal';
import YAMLViewer from '../components/YAMLViewer';
import DescribeModal from '../components/DescribeModal';
import ActionMenu from '../components/ActionMenu';

interface Pod {
  name: string;
  namespace: string;
  status: string;
  ready: string;
  restarts: number;
  age: string;
  createdAt?: string;
  node: string;
  containers?: string[];
  ip?: string;
  cpu?: string;
  memory?: string;
}

type SortField = 'name' | 'namespace' | 'status' | 'cpu' | 'memory' | 'restarts' | 'age';
type SortDirection = 'asc' | 'desc';

const Pods: Component = () => {
  const [search, setSearch] = createSignal('');
  const [statusFilter, setStatusFilter] = createSignal('all');
  const [sortField, setSortField] = createSignal<SortField>('name');
  const [sortDirection, setSortDirection] = createSignal<SortDirection>('asc');
  const [currentPage, setCurrentPage] = createSignal(1);
  const [pageSize, setPageSize] = createSignal(20);
  const [selectedPod, setSelectedPod] = createSignal<Pod | null>(null);

  // Modal states
  const [showYaml, setShowYaml] = createSignal(false);
  const [showDescribe, setShowDescribe] = createSignal(false);
  const [showLogs, setShowLogs] = createSignal(false);
  const [showDetails, setShowDetails] = createSignal(false);
  const [showShell, setShowShell] = createSignal(false);
  const [showPortForward, setShowPortForward] = createSignal(false);

  // Port forward state
  const [localPort, setLocalPort] = createSignal(8080);
  const [remotePort, setRemotePort] = createSignal(80);
  const [portForwards, { refetch: refetchPF }] = createResource(api.listPortForwards);

  // Logs state
  const [logsContent, setLogsContent] = createSignal('');
  const [logsLoading, setLogsLoading] = createSignal(false);
  const [logsError, setLogsError] = createSignal<string | null>(null);
  const [logsTail, setLogsTail] = createSignal(100);
  const [logsSearch, setLogsSearch] = createSignal('');
  const [logsFollow, setLogsFollow] = createSignal(false);
  let logsEventSource: EventSource | null = null;

  // Pod metrics state with previous values for change indicators
  const [podMetrics, setPodMetrics] = createSignal<Record<string, { cpu: string; memory: string }>>({});
  const [prevMetrics, setPrevMetrics] = createSignal<Record<string, { cpu: string; memory: string }>>({});
  let metricsTimer: ReturnType<typeof setInterval> | null = null;

  // Parse metric value to number for comparison
  const parseMetricValue = (val: string | undefined): number => {
    if (!val || val === '-') return 0;
    const match = val.match(/^(\d+)/);
    return match ? parseInt(match[1]) : 0;
  };

  // Get change indicator: 'up', 'down', or null
  const getChangeIndicator = (key: string, type: 'cpu' | 'memory'): 'up' | 'down' | null => {
    const current = podMetrics()[key]?.[type];
    const prev = prevMetrics()[key]?.[type];
    if (!current || !prev) return null;
    const currentVal = parseMetricValue(current);
    const prevVal = parseMetricValue(prev);
    if (currentVal > prevVal) return 'up';
    if (currentVal < prevVal) return 'down';
    return null;
  };

  // Fetch metrics only (lightweight) - stores previous for change indicators
  const fetchMetrics = async () => {
    try {
      const currentMetrics = podMetrics();
      const metrics = await api.getPodMetrics(namespace());
      if (Object.keys(currentMetrics).length > 0) {
        setPrevMetrics(currentMetrics);
      }
      setPodMetrics(metrics);
    } catch (e) {
      console.error('Failed to fetch metrics:', e);
    }
  };

  // Age ticker for real-time age updates (like k9s)
  const [ageTicker, setAgeTicker] = createSignal(0);
  let ageTimer: ReturnType<typeof setInterval> | null = null;

  // Format age like k9s: seconds for first 120s, then minutes+seconds, then hours+minutes, then days+hours
  // The _tick parameter is used to force SolidJS to re-evaluate when ageTicker changes
  const formatAgeFromTimestamp = (createdAt: string | undefined, _tick: number): string => {
    if (!createdAt) return '-';
    const created = new Date(createdAt);
    const now = new Date();
    const diffMs = now.getTime() - created.getTime();
    if (diffMs < 0) return '0s';

    const seconds = Math.floor(diffMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    // First 120 seconds: show just seconds
    if (seconds < 120) {
      return `${seconds}s`;
    }
    // Up to 1 hour: show minutes and seconds
    if (minutes < 60) {
      const secs = seconds % 60;
      return `${minutes}m${secs}s`;
    }
    // Up to 24 hours: show hours and minutes
    if (hours < 24) {
      const mins = minutes % 60;
      return `${hours}h${mins}m`;
    }
    // Beyond 24 hours: show days and hours
    const hrs = hours % 24;
    return `${days}d${hrs}h`;
  };

  onMount(() => {
    fetchMetrics(); // Initial metrics fetch
    // Auto-refresh metrics every 10 seconds
    metricsTimer = setInterval(fetchMetrics, 10000);
    // Age ticker: update every 5 seconds for real-time age display (balances responsiveness vs performance)
    ageTimer = setInterval(() => setAgeTicker(t => t + 1), 5000);
  });

  onCleanup(() => {
    if (metricsTimer) clearInterval(metricsTimer);
    if (ageTimer) clearInterval(ageTimer);
  });

  // Resources
  const [namespaces] = createResource(api.getNamespaces);
  const [pods, { refetch }] = createResource(namespace, api.getPods);
  const [yamlContent] = createResource(
    () => showYaml() && selectedPod() ? { name: selectedPod()!.name, ns: selectedPod()!.namespace } : null,
    async (params) => {
      if (!params) return '';
      const data = await api.getPodYAML(params.name, params.ns);
      return data.yaml || '';
    }
  );

  // Parse CPU value for sorting (e.g., "1m" -> 1, "100m" -> 100)
  const parseCpu = (cpu: string | undefined): number => {
    if (!cpu) return 0;
    const match = cpu.match(/^(\d+)m?$/);
    return match ? parseInt(match[1]) : 0;
  };

  // Parse memory value for sorting (e.g., "34Mi" -> 34, "1Gi" -> 1024)
  const parseMemory = (mem: string | undefined): number => {
    if (!mem) return 0;
    const match = mem.match(/^(\d+)(Ki|Mi|Gi)?$/);
    if (!match) return 0;
    const value = parseInt(match[1]);
    const unit = match[2];
    if (unit === 'Gi') return value * 1024;
    if (unit === 'Ki') return value / 1024;
    return value;
  };

  // Parse age for sorting (e.g., "1d 2h" -> minutes)
  const parseAge = (age: string | undefined): number => {
    if (!age) return 0;
    let total = 0;
    const days = age.match(/(\d+)d/);
    const hours = age.match(/(\d+)h/);
    const mins = age.match(/(\d+)m/);
    if (days) total += parseInt(days[1]) * 24 * 60;
    if (hours) total += parseInt(hours[1]) * 60;
    if (mins) total += parseInt(mins[1]);
    return total;
  };

  const filteredAndSortedPods = createMemo(() => {
    let allPods = pods() || [];
    const query = search().toLowerCase();
    const status = statusFilter();

    // Filter by search
    if (query) {
      allPods = allPods.filter((p: Pod) =>
        p.name.toLowerCase().includes(query) ||
        p.namespace.toLowerCase().includes(query) ||
        p.node?.toLowerCase().includes(query) ||
        p.ip?.toLowerCase().includes(query)
      );
    }

    // Filter by status
    if (status !== 'all') {
      if (status === 'running') {
        allPods = allPods.filter((p: Pod) => p.status === 'Running');
      } else if (status === 'pending') {
        allPods = allPods.filter((p: Pod) => p.status === 'Pending');
      } else if (status === 'failed') {
        allPods = allPods.filter((p: Pod) => ['Failed', 'Error', 'CrashLoopBackOff'].includes(p.status));
      } else if (status === 'succeeded') {
        allPods = allPods.filter((p: Pod) => p.status === 'Succeeded');
      }
    }

    // Sort
    const field = sortField();
    const direction = sortDirection();
    allPods = [...allPods].sort((a: Pod, b: Pod) => {
      let comparison = 0;
      switch (field) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'namespace':
          comparison = a.namespace.localeCompare(b.namespace);
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
        case 'cpu':
          comparison = parseCpu(a.cpu) - parseCpu(b.cpu);
          break;
        case 'memory':
          comparison = parseMemory(a.memory) - parseMemory(b.memory);
          break;
        case 'restarts':
          comparison = a.restarts - b.restarts;
          break;
        case 'age':
          comparison = parseAge(a.age) - parseAge(b.age);
          break;
      }
      return direction === 'asc' ? comparison : -comparison;
    });

    return allPods;
  });

  // Pagination
  const totalPages = createMemo(() => Math.ceil(filteredAndSortedPods().length / pageSize()));
  const paginatedPods = createMemo(() => {
    const start = (currentPage() - 1) * pageSize();
    return filteredAndSortedPods().slice(start, start + pageSize());
  });

  const statusCounts = createMemo(() => {
    const all = pods() || [];
    return {
      running: all.filter((p: Pod) => p.status === 'Running').length,
      pending: all.filter((p: Pod) => p.status === 'Pending').length,
      failed: all.filter((p: Pod) => ['Failed', 'Error', 'CrashLoopBackOff'].includes(p.status)).length,
      total: all.length,
    };
  });

  const handleSort = (field: SortField) => {
    if (sortField() === field) {
      setSortDirection(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  const SortIcon = (props: { field: SortField }) => (
    <span class="ml-1 inline-flex flex-col text-xs leading-none">
      <span style={{ color: sortField() === props.field && sortDirection() === 'asc' ? 'var(--accent-primary)' : 'var(--text-muted)' }}>▲</span>
      <span style={{ color: sortField() === props.field && sortDirection() === 'desc' ? 'var(--accent-primary)' : 'var(--text-muted)' }}>▼</span>
    </span>
  );

  const openModal = (pod: Pod, modal: 'yaml' | 'describe' | 'logs' | 'details' | 'shell' | 'portforward') => {
    setSelectedPod(pod);
    switch (modal) {
      case 'yaml': setShowYaml(true); break;
      case 'describe': setShowDescribe(true); break;
      case 'logs': fetchLogs(pod, logsFollow()); setShowLogs(true); break;
      case 'details': setShowDetails(true); break;
      case 'shell': setShowShell(true); break;
      case 'portforward': setShowPortForward(true); break;
    }
  };

  const startPortForward = async () => {
    const pod = selectedPod();
    if (!pod) return;
    try {
      await api.startPortForward('pod', pod.name, pod.namespace, localPort(), remotePort());
      setShowPortForward(false);
      refetchPF();
    } catch (error) {
      console.error('Failed to start port forward:', error);
    }
  };

  const stopPortForward = async (id: string) => {
    try {
      await api.stopPortForward(id);
      refetchPF();
    } catch (error) {
      console.error('Failed to stop port forward:', error);
    }
  };

  const openShellInNewTab = (pod: Pod) => {
    const container = pod.containers?.[0] || '';
    // Open shell endpoint in new tab - backend should handle WebSocket terminal
    window.open(`/api/pod/exec?name=${pod.name}&namespace=${pod.namespace}&container=${container}`, '_blank');
  };

  const stopLogStream = () => {
    if (logsEventSource) {
      logsEventSource.close();
      logsEventSource = null;
    }
  };

  const fetchLogs = async (pod: Pod, follow = false) => {
    stopLogStream();
    setLogsLoading(true);
    setLogsError(null);

    const container = pod.containers?.[0] || '';
    const url = `/api/pod/logs?name=${pod.name}&namespace=${pod.namespace}&container=${container}&tail=${logsTail()}${follow ? '&follow=true' : ''}`;

    if (follow) {
      // Use Server-Sent Events for streaming
      setLogsContent('');
      logsEventSource = new EventSource(url);

      logsEventSource.onmessage = (event) => {
        setLogsContent(prev => prev + event.data + '\n');
        setLogsLoading(false);
      };

      logsEventSource.onerror = () => {
        setLogsError('Stream connection lost');
        setLogsLoading(false);
        stopLogStream();
      };

      logsEventSource.onopen = () => {
        setLogsLoading(false);
      };
    } else {
      // Regular fetch
      try {
        const res = await fetch(url);
        if (!res.ok) {
          const errText = await res.text();
          throw new Error(errText || `HTTP ${res.status}`);
        }
        const data = await res.json();
        setLogsContent(data.logs || 'No logs available');
      } catch (e: any) {
        setLogsError(e.message || 'Failed to fetch logs');
        setLogsContent('');
      } finally {
        setLogsLoading(false);
      }
    }
  };

  const filteredLogs = createMemo(() => {
    const logs = logsContent();
    const query = logsSearch().toLowerCase();
    if (!query) return logs;
    return logs.split('\n').filter(line => line.toLowerCase().includes(query)).join('\n');
  });

  const downloadLogs = () => {
    const blob = new Blob([logsContent()], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedPod()?.name}-logs.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const deletePod = async (pod: Pod) => {
    if (!confirm(`Are you sure you want to delete pod "${pod.name}" in namespace "${pod.namespace}"?`)) return;
    try {
      await api.deletePod(pod.name, pod.namespace);
      addNotification(`Pod ${pod.name} deleted successfully`, 'success');
      // Small delay to let cluster update before refetching
      setTimeout(() => refetch(), 500);
    } catch (error) {
      console.error('Failed to delete pod:', error);
      addNotification(`Failed to delete pod: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    }
  };

  const restartPod = async (pod: Pod) => {
    try {
      await api.restartPod(pod.name, pod.namespace);
      refetch();
    } catch (error) {
      console.error('Failed to restart pod:', error);
    }
  };

  return (
    <div class="space-y-4">
      {/* Header */}
      <div class="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 class="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Pods</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Manage and monitor your Kubernetes pods</p>
        </div>
        <div class="flex items-center gap-3">
          <button
            onClick={(e) => {
              const btn = e.currentTarget;
              btn.classList.add('refreshing');
              setTimeout(() => btn.classList.remove('refreshing'), 500);
              refetch();
              fetchMetrics();
            }}
            class="icon-btn"
            style={{ background: 'var(--bg-secondary)' }}
            title="Refresh Pods"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {/* Status summary */}
      <div class="flex flex-wrap items-center gap-3">
        <div class="card px-4 py-2 cursor-pointer hover:opacity-80 flex items-center gap-2" style={{ 'border-left': '3px solid var(--accent-primary)' }} onClick={() => setStatusFilter('all')}>
          <span style={{ color: 'var(--text-secondary)' }} class="text-sm">Total</span>
          <span class="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{statusCounts().total}</span>
        </div>
        <div class="card px-4 py-2 cursor-pointer hover:opacity-80 flex items-center gap-2" style={{ 'border-left': '3px solid var(--success-color)' }} onClick={() => setStatusFilter('running')}>
          <span style={{ color: 'var(--text-secondary)' }} class="text-sm">Running</span>
          <span class="text-xl font-bold" style={{ color: 'var(--success-color)' }}>{statusCounts().running}</span>
        </div>
        <div class="card px-4 py-2 cursor-pointer hover:opacity-80 flex items-center gap-2" style={{ 'border-left': '3px solid var(--warning-color)' }} onClick={() => setStatusFilter('pending')}>
          <span style={{ color: 'var(--text-secondary)' }} class="text-sm">Pending</span>
          <span class="text-xl font-bold" style={{ color: 'var(--warning-color)' }}>{statusCounts().pending}</span>
        </div>
        <div class="card px-4 py-2 cursor-pointer hover:opacity-80 flex items-center gap-2" style={{ 'border-left': '3px solid var(--error-color)' }} onClick={() => setStatusFilter('failed')}>
          <span style={{ color: 'var(--text-secondary)' }} class="text-sm">Failed</span>
          <span class="text-xl font-bold" style={{ color: 'var(--error-color)' }}>{statusCounts().failed}</span>
        </div>

        <div class="flex-1" />

        <select
          value={statusFilter()}
          onChange={(e) => { setStatusFilter(e.currentTarget.value); setCurrentPage(1); }}
          class="px-3 py-2 rounded-lg text-sm"
          style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
        >
          <option value="all">All Status</option>
          <option value="running">Running</option>
          <option value="pending">Pending</option>
          <option value="failed">Failed/Error</option>
          <option value="succeeded">Succeeded</option>
        </select>

        <input
          type="text"
          placeholder="Search..."
          value={search()}
          onInput={(e) => { setSearch(e.currentTarget.value); setCurrentPage(1); }}
          class="px-3 py-2 rounded-lg text-sm w-48"
          style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
        />

        <select
          value={pageSize()}
          onChange={(e) => { setPageSize(parseInt(e.currentTarget.value)); setCurrentPage(1); }}
          class="px-3 py-2 rounded-lg text-sm"
          style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
        >
          <option value="20">20</option>
          <option value="50">50</option>
          <option value="100">100</option>
        </select>
      </div>


      {/* Active Port Forwards */}
      <Show when={(portForwards() || []).length > 0}>
        <div class="card p-4">
          <h3 class="font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Active Port Forwards
          </h3>
          <div class="flex flex-wrap gap-2">
            <For each={portForwards() || []}>
              {(pf: any) => (
                <div class="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
                  <span class="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span style={{ color: 'var(--text-primary)' }}>{pf.name}</span>
                  <span style={{ color: 'var(--text-muted)' }}>localhost:{pf.localPort} → {pf.remotePort}</span>
                  <a href={`http://localhost:${pf.localPort}`} target="_blank" class="text-xs px-2 py-1 rounded" style={{ background: 'var(--accent-primary)', color: 'white' }}>
                    Open
                  </a>
                  <button onClick={() => stopPortForward(pf.id)} class="text-red-400 hover:text-red-300">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              )}
            </For>
          </div>
        </div>
      </Show>

      {/* Pods table */}
      <div class="overflow-hidden rounded-lg" style={{ background: '#0d1117' }}>
        <Show
          when={!pods.loading}
          fallback={
            <div class="p-8 text-center">
              <div class="spinner mx-auto mb-2" />
              <span style={{ color: 'var(--text-muted)' }}>Loading pods...</span>
            </div>
          }
        >
          <div class="overflow-x-auto">
            <table class="data-table terminal-table" style={{ 'table-layout': 'auto' }}>
              <thead>
                <tr>
                  <th class="cursor-pointer select-none whitespace-nowrap" onClick={() => handleSort('name')}>
                    <div class="flex items-center gap-1">Name <SortIcon field="name" /></div>
                  </th>
                  <th class="cursor-pointer select-none whitespace-nowrap" onClick={() => handleSort('status')}>
                    <div class="flex items-center gap-1">Status <SortIcon field="status" /></div>
                  </th>
                  <th class="whitespace-nowrap">Ready</th>
                  <th class="whitespace-nowrap">IP</th>
                  <th class="cursor-pointer select-none whitespace-nowrap" onClick={() => handleSort('cpu')}>
                    <div class="flex items-center gap-1">CPU <SortIcon field="cpu" /></div>
                  </th>
                  <th class="cursor-pointer select-none whitespace-nowrap" onClick={() => handleSort('memory')}>
                    <div class="flex items-center gap-1">Mem <SortIcon field="memory" /></div>
                  </th>
                  <th class="cursor-pointer select-none whitespace-nowrap" onClick={() => handleSort('restarts')}>
                    <div class="flex items-center gap-1">Restarts <SortIcon field="restarts" /></div>
                  </th>
                  <th class="cursor-pointer select-none whitespace-nowrap" onClick={() => handleSort('age')}>
                    <div class="flex items-center gap-1">Age <SortIcon field="age" /></div>
                  </th>
                  <th class="whitespace-nowrap">Node</th>
                  <th class="whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody>
                <For each={paginatedPods()} fallback={
                  <tr><td colspan="10" class="text-center py-8" style={{ color: 'var(--text-muted)' }}>No pods found</td></tr>
                }>
                  {(pod: Pod) => (
                    <tr>
                      <td>
                        <button onClick={() => openModal(pod, 'details')} class="font-medium hover:underline text-xs" style={{ color: 'var(--accent-primary)' }}>
                          {pod.name.length > 40 ? pod.name.slice(0, 37) + '...' : pod.name}
                        </button>
                      </td>
                      <td>
                        <span class={`badge ${
                          pod.status === 'Running' ? 'badge-success' :
                          pod.status === 'Pending' ? 'badge-warning' :
                          pod.status === 'Succeeded' ? 'badge-info' : 'badge-error'
                        }`}>
                          {pod.status}
                        </span>
                      </td>
                      <td>{pod.ready}</td>
                      <td class="font-mono" style={{ color: 'var(--text-secondary)' }}>{pod.ip || '-'}</td>
                      <td>
                        <span class="flex items-center" style={{ color: '#ec4899', 'font-weight': '600' }}>
                          {podMetrics()[`${pod.namespace}/${pod.name}`]?.cpu || pod.cpu || '-'}
                          {getChangeIndicator(`${pod.namespace}/${pod.name}`, 'cpu') === 'up' && <span style={{ color: '#ef4444', 'font-size': '0.6rem' }}>▲</span>}
                          {getChangeIndicator(`${pod.namespace}/${pod.name}`, 'cpu') === 'down' && <span style={{ color: '#22c55e', 'font-size': '0.6rem' }}>▼</span>}
                        </span>
                      </td>
                      <td>
                        <span class="flex items-center" style={{ color: '#f59e0b', 'font-weight': '600' }}>
                          {podMetrics()[`${pod.namespace}/${pod.name}`]?.memory || pod.memory || '-'}
                          {getChangeIndicator(`${pod.namespace}/${pod.name}`, 'memory') === 'up' && <span style={{ color: '#ef4444', 'font-size': '0.6rem' }}>▲</span>}
                          {getChangeIndicator(`${pod.namespace}/${pod.name}`, 'memory') === 'down' && <span style={{ color: '#22c55e', 'font-size': '0.6rem' }}>▼</span>}
                        </span>
                      </td>
                      <td class={pod.restarts > 0 ? 'text-yellow-400 font-semibold' : ''}>{pod.restarts}</td>
                      <td>{formatAgeFromTimestamp(pod.createdAt, ageTicker())}</td>
                      <td style={{ color: 'var(--text-muted)' }}>{pod.node}</td>
                      <td>
                        <ActionMenu
                          actions={[
                            { label: 'Shell', icon: 'shell', onClick: () => openShellInNewTab(pod) },
                            { label: 'Port Forward', icon: 'portforward', onClick: () => openModal(pod, 'portforward') },
                            { label: 'View Logs', icon: 'logs', onClick: () => openModal(pod, 'logs') },
                            { label: 'View YAML', icon: 'yaml', onClick: () => openModal(pod, 'yaml') },
                            { label: 'Describe', icon: 'describe', onClick: () => openModal(pod, 'describe') },
                            { label: 'Restart', icon: 'restart', onClick: () => restartPod(pod), divider: true },
                            { label: 'Delete', icon: 'delete', onClick: () => deletePod(pod), variant: 'danger' },
                          ]}
                        />
                      </td>
                    </tr>
                  )}
                </For>
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <Show when={totalPages() > 1}>
            <div class="flex items-center justify-between p-4 font-mono text-sm" style={{ background: '#161b22' }}>
              <div style={{ color: '#8b949e' }}>
                Showing {((currentPage() - 1) * pageSize()) + 1} - {Math.min(currentPage() * pageSize(), filteredAndSortedPods().length)} of {filteredAndSortedPods().length} pods
              </div>
              <div class="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage() === 1}
                  class="px-3 py-1 rounded text-sm disabled:opacity-50"
                  style={{ background: '#21262d', color: '#c9d1d9' }}
                >
                  First
                </button>
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage() === 1}
                  class="px-3 py-1 rounded text-sm disabled:opacity-50"
                  style={{ background: '#21262d', color: '#c9d1d9' }}
                >
                  ← Prev
                </button>
                <span class="px-3 py-1" style={{ color: '#c9d1d9' }}>
                  Page {currentPage()} of {totalPages()}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages(), p + 1))}
                  disabled={currentPage() === totalPages()}
                  class="px-3 py-1 rounded text-sm disabled:opacity-50"
                  style={{ background: '#21262d', color: '#c9d1d9' }}
                >
                  Next →
                </button>
                <button
                  onClick={() => setCurrentPage(totalPages())}
                  disabled={currentPage() === totalPages()}
                  class="px-3 py-1 rounded text-sm disabled:opacity-50"
                  style={{ background: '#21262d', color: '#c9d1d9' }}
                >
                  Last
                </button>
              </div>
            </div>
          </Show>
        </Show>
      </div>

      {/* YAML Modal */}
      <Modal isOpen={showYaml()} onClose={() => setShowYaml(false)} title={`YAML: ${selectedPod()?.name}`} size="xl">
        <Show when={!yamlContent.loading} fallback={<div class="spinner mx-auto" />}>
          <YAMLViewer yaml={yamlContent() || ''} title={selectedPod()?.name} />
        </Show>
      </Modal>

      {/* Describe Modal */}
      <DescribeModal
        isOpen={showDescribe()}
        onClose={() => setShowDescribe(false)}
        resourceType="pod"
        name={selectedPod()?.name || ''}
        namespace={selectedPod()?.namespace}
      />

      {/* Logs Modal */}
      <Modal isOpen={showLogs()} onClose={() => { stopLogStream(); setShowLogs(false); }} title={`Logs: ${selectedPod()?.name}`} size="xl">
        <div class="flex flex-col h-[60vh]">
          {/* Controls */}
          <div class="flex flex-wrap items-center gap-3 mb-3">
            <select
              value={logsTail()}
              onChange={(e) => { setLogsTail(parseInt(e.currentTarget.value)); if (selectedPod()) fetchLogs(selectedPod()!, logsFollow()); }}
              class="px-3 py-2 rounded-lg text-sm"
              style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
              disabled={logsFollow()}
            >
              <option value="50">Last 50 lines</option>
              <option value="100">Last 100 lines</option>
              <option value="500">Last 500 lines</option>
              <option value="1000">Last 1000 lines</option>
            </select>

            <label class="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer" style={{ background: logsFollow() ? 'var(--accent-primary)' : 'var(--bg-tertiary)', color: logsFollow() ? 'white' : 'var(--text-primary)' }}>
              <input
                type="checkbox"
                checked={logsFollow()}
                onChange={(e) => {
                  const follow = e.currentTarget.checked;
                  setLogsFollow(follow);
                  if (selectedPod()) fetchLogs(selectedPod()!, follow);
                }}
                class="hidden"
              />
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={logsFollow() ? "M21 12a9 9 0 11-18 0 9 9 0 0118 0z M10 9v6m4-6v6" : "M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z M21 12a9 9 0 11-18 0 9 9 0 0118 0z"} />
              </svg>
              <span class="text-sm font-medium">{logsFollow() ? 'Live' : 'Follow'}</span>
              {logsFollow() && <span class="w-2 h-2 rounded-full bg-green-400 animate-pulse" />}
            </label>

            <input
              type="text"
              placeholder="Search logs..."
              value={logsSearch()}
              onInput={(e) => setLogsSearch(e.currentTarget.value)}
              class="px-3 py-2 rounded-lg text-sm flex-1 min-w-[150px]"
              style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
            />

            <button
              onClick={() => selectedPod() && fetchLogs(selectedPod()!, logsFollow())}
              class="p-2 rounded-lg hover:bg-[var(--bg-secondary)]"
              style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
              title="Refresh Logs"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>

            <button
              onClick={downloadLogs}
              class="px-3 py-2 rounded-lg text-sm flex items-center gap-1"
              style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download
            </button>
          </div>

          {/* Logs content */}
          <div
            class="flex-1 font-mono text-xs p-4 rounded-lg overflow-auto"
            style={{ background: '#0d1117', color: '#c9d1d9', border: '1px solid var(--border-color)' }}
          >
            <Show when={!logsLoading()} fallback={<div class="flex items-center justify-center h-full"><div class="spinner" /></div>}>
              <Show when={logsError()}>
                <div class="text-red-400 mb-2">Error: {logsError()}</div>
              </Show>
              <pre class="whitespace-pre-wrap">{filteredLogs() || 'No logs available'}</pre>
            </Show>
          </div>
        </div>
      </Modal>

      {/* Details Modal */}
      <Modal isOpen={showDetails()} onClose={() => setShowDetails(false)} title={`Pod: ${selectedPod()?.name}`} size="xl">
        <Show when={selectedPod()}>
          {(() => {
            const [podDetails] = createResource(
              () => selectedPod() ? { name: selectedPod()!.name, ns: selectedPod()!.namespace } : null,
              async (params) => {
                if (!params) return null;
                return api.getPodDetails(params.name, params.ns);
              }
            );
            return (
              <div class="space-y-6">
                {/* Basic Info */}
                <div>
                  <h3 class="text-sm font-semibold mb-3" style={{ color: 'var(--text-secondary)' }}>Basic Information</h3>
                  <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div class="p-3 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
                      <div class="text-xs" style={{ color: 'var(--text-muted)' }}>Status</div>
                      <div><span class={`badge ${selectedPod()?.status === 'Running' ? 'badge-success' : 'badge-warning'}`}>{selectedPod()?.status}</span></div>
                    </div>
                    <div class="p-3 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
                      <div class="text-xs" style={{ color: 'var(--text-muted)' }}>Ready</div>
                      <div style={{ color: 'var(--text-primary)' }}>{selectedPod()?.ready}</div>
                    </div>
                    <div class="p-3 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
                      <div class="text-xs" style={{ color: 'var(--text-muted)' }}>CPU</div>
                      <div style={{ color: '#ec4899', 'font-weight': '600' }}>{selectedPod()?.cpu || '-'}</div>
                    </div>
                    <div class="p-3 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
                      <div class="text-xs" style={{ color: 'var(--text-muted)' }}>Memory</div>
                      <div style={{ color: '#f59e0b', 'font-weight': '600' }}>{selectedPod()?.memory || '-'}</div>
                    </div>
                    <div class="p-3 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
                      <div class="text-xs" style={{ color: 'var(--text-muted)' }}>Restarts</div>
                      <div style={{ color: 'var(--text-primary)' }}>{selectedPod()?.restarts}</div>
                    </div>
                    <div class="p-3 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
                      <div class="text-xs" style={{ color: 'var(--text-muted)' }}>Age</div>
                      <div style={{ color: 'var(--text-primary)' }}>{selectedPod()?.age}</div>
                    </div>
                    <div class="p-3 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
                      <div class="text-xs" style={{ color: 'var(--text-muted)' }}>IP</div>
                      <div style={{ color: 'var(--text-primary)' }}>{selectedPod()?.ip || '-'}</div>
                    </div>
                    <div class="p-3 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
                      <div class="text-xs" style={{ color: 'var(--text-muted)' }}>Namespace</div>
                      <div style={{ color: 'var(--text-primary)' }}>{selectedPod()?.namespace}</div>
                    </div>
                  </div>
                  <div class="mt-3 p-3 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
                    <div class="text-xs" style={{ color: 'var(--text-muted)' }}>Node</div>
                    <div style={{ color: 'var(--text-primary)' }} class="text-sm break-all">{selectedPod()?.node}</div>
                  </div>
                </div>

                {/* Containers */}
                <div>
                  <h3 class="text-sm font-semibold mb-3" style={{ color: 'var(--text-secondary)' }}>Containers</h3>
                  <Show when={!podDetails.loading && podDetails()?.containers} fallback={
                    <div class="p-4 text-center"><div class="spinner mx-auto" /></div>
                  }>
                    <div class="space-y-3">
                      <For each={podDetails()?.containers || []}>
                        {(container: any) => (
                          <div class="p-4 rounded-lg border" style={{ background: 'var(--bg-secondary)', 'border-color': 'var(--border-color)' }}>
                            <div class="flex items-center justify-between mb-3">
                              <div class="flex items-center gap-2">
                                <svg class="w-5 h-5" style={{ color: 'var(--accent-primary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                </svg>
                                <span class="font-medium" style={{ color: 'var(--text-primary)' }}>{container.name}</span>
                              </div>
                              <span class={`badge ${container.ready ? 'badge-success' : 'badge-error'}`}>
                                {container.state || (container.ready ? 'Running' : 'Not Ready')}
                              </span>
                            </div>
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                              <div>
                                <div class="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Image</div>
                                <div class="p-2 rounded text-xs font-mono break-all" style={{ background: 'var(--bg-tertiary)', color: 'var(--accent-primary)' }}>
                                  {container.image}
                                </div>
                              </div>
                              <div>
                                <div class="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Container ID</div>
                                <div class="p-2 rounded text-xs font-mono truncate" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }} title={container.containerID}>
                                  {container.containerID?.split('//')[1]?.substring(0, 24) || '-'}...
                                </div>
                              </div>
                              <div>
                                <div class="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Restart Count</div>
                                <div style={{ color: container.restartCount > 0 ? 'var(--warning-color)' : 'var(--text-primary)' }}>
                                  {container.restartCount}
                                </div>
                              </div>
                              <div>
                                <div class="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Started At</div>
                                <div style={{ color: 'var(--text-secondary)' }}>{container.startedAt || '-'}</div>
                              </div>
                            </div>
                          </div>
                        )}
                      </For>
                    </div>
                  </Show>
                </div>

                {/* Actions */}
                <div class="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-4">
                  <button
                    onClick={() => openShellInNewTab(selectedPod()!)}
                    class="btn-primary flex items-center justify-center gap-2 px-4 py-3 rounded-lg"
                  >
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Shell
                  </button>
                  <button
                    onClick={() => { setShowDetails(false); openModal(selectedPod()!, 'portforward'); }}
                    class="btn-primary flex items-center justify-center gap-2 px-4 py-3 rounded-lg"
                  >
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Port Forward
                  </button>
                  <button
                    onClick={() => { setShowDetails(false); openModal(selectedPod()!, 'logs'); }}
                    class="btn-secondary flex items-center justify-center gap-2 px-4 py-3 rounded-lg"
                  >
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Logs
                  </button>
                  <button
                    onClick={() => { setShowDetails(false); openModal(selectedPod()!, 'yaml'); }}
                    class="btn-secondary flex items-center justify-center gap-2 px-4 py-3 rounded-lg"
                  >
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                    </svg>
                    YAML
                  </button>
                  <button
                    onClick={() => { setShowDetails(false); openModal(selectedPod()!, 'describe'); }}
                    class="btn-secondary flex items-center justify-center gap-2 px-4 py-3 rounded-lg"
                  >
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Describe
                  </button>
                </div>
              </div>
            );
          })()}
        </Show>
      </Modal>

      {/* Port Forward Modal */}
      <Modal isOpen={showPortForward()} onClose={() => setShowPortForward(false)} title={`Port Forward: ${selectedPod()?.name}`} size="sm">
        <div class="space-y-4">
          <div>
            <label class="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>Local Port</label>
            <input
              type="number"
              min="1024"
              max="65535"
              value={localPort()}
              onInput={(e) => setLocalPort(parseInt(e.currentTarget.value) || 8080)}
              class="w-full px-4 py-2 rounded-lg"
              style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
            />
          </div>
          <div>
            <label class="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>Remote Port</label>
            <input
              type="number"
              min="1"
              max="65535"
              value={remotePort()}
              onInput={(e) => setRemotePort(parseInt(e.currentTarget.value) || 80)}
              class="w-full px-4 py-2 rounded-lg"
              style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
            />
          </div>
          <div class="p-3 rounded-lg text-sm" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}>
            This will forward <code class="px-1 rounded" style={{ background: 'var(--bg-secondary)' }}>localhost:{localPort()}</code> to <code class="px-1 rounded" style={{ background: 'var(--bg-secondary)' }}>{selectedPod()?.name}:{remotePort()}</code>
          </div>
          <div class="flex gap-2">
            <button onClick={() => setShowPortForward(false)} class="btn-secondary flex-1">Cancel</button>
            <button onClick={startPortForward} class="btn-primary flex-1">Start</button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Pods;
