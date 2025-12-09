import { Component, For, Show, createMemo, createSignal, createResource, onMount, onCleanup, createEffect } from 'solid-js';
import { api } from '../services/api';
import { namespace } from '../stores/cluster';
import { addNotification } from '../stores/ui';
import {
  selectedCluster,
  selectedNamespaces,
  searchQuery,
  setSearchQuery,
  globalLoading,
  setGlobalLoading,
} from '../stores/globalStore';
import { createCachedResource } from '../utils/resourceCache';
import { getRowHoverBackground } from '../utils/rowHoverStyles';
import Modal from '../components/Modal';
import YAMLViewer from '../components/YAMLViewer';
import YAMLEditor from '../components/YAMLEditor';
import DescribeModal from '../components/DescribeModal';
import ActionMenu from '../components/ActionMenu';
import ContainerStatusBadge from '../components/ContainerStatusBadge';
import ContainerList from '../components/ContainerList';
import { ContainerInfo, ContainerType, isSidecarContainer } from '../utils/containerTypes';
import { calculateContainerStatus } from '../utils/containerStatus';

interface Pod {
  name: string;
  namespace: string;
  status: string;
  ready: string;
  restarts: number;
  age: string;
  createdAt?: string;
  node: string;
  containers?: string[] | ContainerInfo[]; // Can be array of names (legacy) or ContainerInfo objects
  ip?: string;
  cpu?: string;
  memory?: string;
}

type SortField = 'name' | 'namespace' | 'status' | 'cpu' | 'memory' | 'restarts' | 'age';
type SortDirection = 'asc' | 'desc';

const Pods: Component = () => {
  // Use global search query instead of local search
  const [statusFilter, setStatusFilter] = createSignal('all');
  const [sortField, setSortField] = createSignal<SortField>('name');
  const [sortDirection, setSortDirection] = createSignal<SortDirection>('asc');
  const [currentPage, setCurrentPage] = createSignal(1);
  const [pageSize, setPageSize] = createSignal(20);
  const [selectedPod, setSelectedPod] = createSignal<Pod | null>(null);

  // Modal states
  const [showYaml, setShowYaml] = createSignal(false);
  const [showEdit, setShowEdit] = createSignal(false);
  const [showDescribe, setShowDescribe] = createSignal(false);
  const [showLogs, setShowLogs] = createSignal(false);
  const [showDetails, setShowDetails] = createSignal(false);
  const [showShell, setShowShell] = createSignal(false);
  const [showPortForward, setShowPortForward] = createSignal(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = createSignal(false);
  const [podToDelete, setPodToDelete] = createSignal<Pod | null>(null);
  const [showContainerSelect, setShowContainerSelect] = createSignal(false);
  const [containerSelectPod, setContainerSelectPod] = createSignal<Pod | null>(null);

  // Track if any action menu is open to pause auto-refresh
  const [actionMenuOpen, setActionMenuOpen] = createSignal(false);

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
  
  // Terminal view mode
  const [terminalView, setTerminalView] = createSignal(false);

  // Font size selector with localStorage persistence
  const getInitialFontSize = (): number => {
    const saved = localStorage.getItem('pods-font-size');
    return saved ? parseInt(saved) : 14;
  };
  const [fontSize, setFontSize] = createSignal(getInitialFontSize());

  const handleFontSizeChange = (size: number) => {
    setFontSize(size);
    localStorage.setItem('pods-font-size', size.toString());
  };

  // Font family selector with localStorage persistence
  const getInitialFontFamily = (): string => {
    const saved = localStorage.getItem('pods-font-family');
    return saved || 'Monospace';
  };
  const [fontFamily, setFontFamily] = createSignal(getInitialFontFamily());

  const handleFontFamilyChange = (family: string) => {
    setFontFamily(family);
    localStorage.setItem('pods-font-family', family);
  };

  // Map font family option to actual font-family CSS value
  const getFontFamilyCSS = (): string => {
    const family = fontFamily();
    switch (family) {
      case 'Monospace': return '"Courier New", Monaco, monospace';
      case 'System-ui': return 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      case 'Monaco': return 'Monaco, "Lucida Console", monospace';
      case 'Consolas': return 'Consolas, "Courier New", monospace';
      case 'Courier': return 'Courier, "Courier New", monospace';
      default: return '"Courier New", Monaco, monospace';
    }
  };

  // Keyboard navigation
  const [selectedIndex, setSelectedIndex] = createSignal<number | null>(null);
  let tableRef: HTMLTableElement | undefined;

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
      const namespaceParam = getNamespaceParam();
      const metrics = await api.getPodMetrics(namespaceParam);
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

  let podsRefreshTimer: ReturnType<typeof setInterval> | null = null;
  let keyboardHandler: ((e: KeyboardEvent) => void) | null = null;

  onMount(() => {
    fetchMetrics(); // Initial metrics fetch
    // Auto-refresh metrics every 10 seconds
    metricsTimer = setInterval(fetchMetrics, 10000);
    // Age ticker: update every 5 seconds for real-time age display (balances responsiveness vs performance)
    ageTimer = setInterval(() => setAgeTicker(t => t + 1), 5000);
    
    // Auto-refresh pods every 2 seconds (silent background refresh)
    // but pause when action menu is open to allow user interaction
    podsRefreshTimer = setInterval(() => {
      // Only refresh if no action menu is open
      if (!actionMenuOpen()) {
        podsCache.refetch().catch(err => console.error('Background refresh error:', err));
        fetchMetrics();
      }
    }, 2000);
    
    // Keyboard navigation
    keyboardHandler = (e: KeyboardEvent) => {
      // Only handle if not typing in input/textarea
      if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') {
        return;
      }
      
      const pods = paginatedPods();
      if (pods.length === 0) return;
      
      const currentIndex = selectedIndex();
      
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => {
            if (prev === null) return 0;
            return Math.min(prev + 1, pods.length - 1);
          });
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => {
            if (prev === null || prev === 0) return null;
            return prev - 1;
          });
          break;
        case 'Enter':
          e.preventDefault();
          if (currentIndex !== null && pods[currentIndex]) {
            openModal(pods[currentIndex], 'details');
          }
          break;
        case 'Escape':
          setSelectedIndex(null);
          break;
      }
    };
    
    document.addEventListener('keydown', keyboardHandler);
  });

  onCleanup(() => {
    if (metricsTimer) clearInterval(metricsTimer);
    if (ageTimer) clearInterval(ageTimer);
    if (podsRefreshTimer) clearInterval(podsRefreshTimer);
    if (keyboardHandler) document.removeEventListener('keydown', keyboardHandler);
  });

  // Scroll selected row into view
  createEffect(() => {
    const index = selectedIndex();
    if (index !== null && tableRef) {
      const rows = tableRef.querySelectorAll('tbody tr');
      if (rows[index]) {
        rows[index].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  });

  // Resources
  const [namespaces] = createResource(api.getNamespaces);
  
  // Determine namespace parameter from global store
  const getNamespaceParam = (): string | undefined => {
    const namespaces = selectedNamespaces();
    if (namespaces.length === 0) return undefined; // All namespaces
    if (namespaces.length === 1) return namespaces[0];
    // For multiple namespaces, backend should handle it via query params
    // For now, pass first namespace (backend may need to be updated to handle multiple)
    return namespaces[0];
  };

  // CACHED RESOURCE - Uses globalStore and cache
  const podsCache = createCachedResource<Pod[]>(
    'pods',
    async () => {
      setGlobalLoading(true);
      try {
        const namespaceParam = getNamespaceParam();
        const pods = await api.getPods(namespaceParam);
        return pods;
      } finally {
        setGlobalLoading(false);
      }
    },
    {
      ttl: 15000, // 15 seconds
      backgroundRefresh: true,
    }
  );

  const pods = createMemo(() => podsCache.data() || []);
  
  // Track initial load separately to avoid showing loading on refetch
  const [initialLoad, setInitialLoad] = createSignal(true);
  createEffect(() => {
    if (pods() !== undefined && initialLoad()) {
      setInitialLoad(false);
    }
  });
  const [yamlContent] = createResource(
    () => (showYaml() || showEdit()) && selectedPod() ? { name: selectedPod()!.name, ns: selectedPod()!.namespace } : null,
    async (params) => {
      if (!params) return '';
      const data = await api.getPodYAML(params.name, params.ns);
      return data.yaml || '';
    }
  );

  const handleSaveYAML = async (yaml: string) => {
    const pod = selectedPod();
    if (!pod) return;
    try {
      await api.updatePod(pod.name, pod.namespace, yaml);
      addNotification(`✅ Pod ${pod.name} updated successfully`, 'success');
      setShowEdit(false);
      setTimeout(() => podsCache.refetch(), 500);
      setTimeout(() => podsCache.refetch(), 2000);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      addNotification(`❌ Failed to update pod: ${errorMsg}`, 'error');
      throw error;
    }
  };

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
    const query = searchQuery().toLowerCase();
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

  // Helper to normalize containers (handle both legacy string[] and new ContainerInfo[])
  const getContainerInfos = (pod: Pod): ContainerInfo[] => {
    if (!pod.containers || pod.containers.length === 0) return [];
    
    // Check if it's the new format (ContainerInfo[])
    if (typeof pod.containers[0] === 'object') {
      return pod.containers as ContainerInfo[];
    }
    
    // Legacy format: convert string[] to ContainerInfo[]
    const containerNames = pod.containers as string[];
    return containerNames.map(name => ({
      name,
      type: 'main' as ContainerType,
      image: '',
    }));
  };

  // Helper to get container names (for backward compatibility)
  const getContainerNames = (pod: Pod): string[] => {
    const infos = getContainerInfos(pod);
    return infos.map(c => c.name);
  };

  // Helper to get main container name (for logs, shell, etc.)
  const getMainContainerName = (pod: Pod): string => {
    const infos = getContainerInfos(pod);
    const mainContainer = infos.find(c => c.type === 'main');
    return mainContainer?.name || infos[0]?.name || '';
  };

  const openShellInNewTab = (pod: Pod) => {
    const containerInfos = getContainerInfos(pod);
    // Show container selector if pod has multiple containers
    if (containerInfos.length > 1) {
      setContainerSelectPod(pod);
      setShowContainerSelect(true);
    } else {
      const container = getMainContainerName(pod);
      // Open shell endpoint in new tab - backend should handle WebSocket terminal
      window.open(`/api/pod/exec?name=${pod.name}&namespace=${pod.namespace}&container=${container}`, '_blank');
    }
  };

  const connectToContainer = (pod: Pod, container: string) => {
    setShowContainerSelect(false);
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

    const container = getMainContainerName(pod);
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

  const openDeleteConfirm = (pod: Pod) => {
    setPodToDelete(pod);
    setShowDeleteConfirm(true);
  };

  const deletePod = async () => {
    const pod = podToDelete();
    if (!pod) return;
    
    setShowDeleteConfirm(false);
    try {
      await api.deletePod(pod.name, pod.namespace);
      addNotification(`Pod ${pod.name} deleted successfully`, 'success');
      // Small delay to let cluster update before refetching
      setTimeout(() => podsCache.refetch(), 500);
    } catch (error) {
      console.error('Failed to delete pod:', error);
      addNotification(`Failed to delete pod: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    } finally {
      setPodToDelete(null);
    }
  };


  return (
    <div class="space-y-4 max-w-full">
      {/* Header */}
      <div class="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 class="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Pods</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Manage and monitor your Kubernetes pods</p>
        </div>
        <div class="flex items-center gap-3">
          <button
            onClick={() => {
              window.open(window.location.href, '_blank');
            }}
            class="icon-btn"
            style={{ background: 'var(--bg-secondary)' }}
            title="Open in New Tab"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </button>
          <button
            onClick={() => {
              if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen();
              } else {
                document.exitFullscreen();
              }
            }}
            class="icon-btn"
            style={{ background: 'var(--bg-secondary)' }}
            title="Maximize to Fullscreen"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
          </button>
          <button
            onClick={() => setTerminalView(!terminalView())}
            class="icon-btn"
            style={{ background: terminalView() ? 'var(--accent-primary)' : 'var(--bg-secondary)' }}
            title={terminalView() ? 'Switch to Normal View' : 'Switch to Terminal View'}
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </button>
          <button
            onClick={(e) => {
              const btn = e.currentTarget;
              btn.classList.add('refreshing');
              setTimeout(() => btn.classList.remove('refreshing'), 500);
              podsCache.refetch();
              fetchMetrics();
            }}
            class="icon-btn"
            style={{ background: 'var(--bg-secondary)' }}
            title="Refresh Pods (Auto-refresh: 2s)"
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

        {/* Font Size Selector */}
        <select
          value={fontSize()}
          onChange={(e) => handleFontSizeChange(parseInt(e.currentTarget.value))}
          class="px-3 py-2 rounded-lg text-sm font-bold"
          style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
          title="Font Size"
        >
          <option value="12">12px</option>
          <option value="14">14px</option>
          <option value="16">16px</option>
          <option value="18">18px</option>
          <option value="20">20px</option>
        </select>

        {/* Font Style Selector */}
        <select
          value={fontFamily()}
          onChange={(e) => handleFontFamilyChange(e.currentTarget.value)}
          class="px-3 py-2 rounded-lg text-sm font-bold"
          style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
          title="Font Style"
        >
          <option value="Monospace">Monospace</option>
          <option value="System-ui">System-ui</option>
          <option value="Monaco">Monaco</option>
          <option value="Consolas">Consolas</option>
          <option value="Courier">Courier</option>
        </select>

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
          value={searchQuery()}
          onInput={(e) => { setSearchQuery(e.currentTarget.value); setCurrentPage(1); }}
          class="px-3 py-2 rounded-lg text-sm w-48"
          style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
        />
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
      <div class="w-full" style={{ background: 'var(--bg-primary)', margin: '0', padding: '0', border: '1px solid var(--border-color)', 'border-radius': '4px' }}>
        <Show
          when={!podsCache.loading() || podsCache.data() !== undefined}
          fallback={
            <div class="p-8 text-center">
              <div class="spinner mx-auto mb-2" />
              <span style={{ color: 'var(--text-muted)' }}>Loading pods...</span>
            </div>
          }
        >
          <div class="w-full overflow-x-auto" style={{ margin: '0', padding: '0' }}>
            <table
              ref={tableRef}
              class="w-full"
              style={{
                width: '100%',
                'table-layout': 'auto',
                'font-family': getFontFamilyCSS(),
                background: 'var(--bg-primary)',
                'border-collapse': 'collapse',
                margin: '0',
                padding: '0'
              }}
            >
              <thead>
                <tr style={{
                  height: `${Math.max(24, fontSize() * 1.7)}px`,
                  'font-family': getFontFamilyCSS(),
                  'font-weight': '900',
                  color: '#0ea5e9',
                  'font-size': `${fontSize()}px`,
                  'line-height': `${Math.max(24, fontSize() * 1.7)}px`
                }}>
                  <th class="cursor-pointer select-none whitespace-nowrap" onClick={() => handleSort('name')} style={{
                    padding: '0 8px',
                    'text-align': 'left',
                    'font-weight': '900',
                    color: '#0ea5e9',
                    'font-size': `${fontSize()}px`,
                    border: 'none'
                  }}>
                    <div class="flex items-center gap-1">Name <SortIcon field="name" /></div>
                  </th>
                  <th class="cursor-pointer select-none whitespace-nowrap" onClick={() => handleSort('status')} style={{
                    padding: '0 8px',
                    'text-align': 'left',
                    'font-weight': '900',
                    color: '#0ea5e9',
                    'font-size': `${fontSize()}px`,
                    border: 'none'
                  }}>
                    <div class="flex items-center gap-1">Status <SortIcon field="status" /></div>
                  </th>
                  <th class="whitespace-nowrap" style={{
                    padding: '0 8px',
                    'text-align': 'left',
                    'font-weight': '900',
                    color: '#0ea5e9',
                    'font-size': `${fontSize()}px`,
                    border: 'none'
                  }}>Ready</th>
                  <th class="whitespace-nowrap" style={{
                    padding: '0 8px',
                    'text-align': 'left',
                    'font-weight': '900',
                    color: '#0ea5e9',
                    'font-size': `${fontSize()}px`,
                    border: 'none'
                  }}>IP</th>
                  <th class="cursor-pointer select-none whitespace-nowrap" onClick={() => handleSort('cpu')} style={{
                    padding: '0 8px',
                    'text-align': 'left',
                    'font-weight': '900',
                    color: '#0ea5e9',
                    'font-size': `${fontSize()}px`,
                    border: 'none'
                  }}>
                    <div class="flex items-center gap-1">CPU <SortIcon field="cpu" /></div>
                  </th>
                  <th class="cursor-pointer select-none whitespace-nowrap" onClick={() => handleSort('memory')} style={{
                    padding: '0 8px',
                    'text-align': 'left',
                    'font-weight': '900',
                    color: '#0ea5e9',
                    'font-size': `${fontSize()}px`,
                    border: 'none'
                  }}>
                    <div class="flex items-center gap-1">Mem <SortIcon field="memory" /></div>
                  </th>
                  <th class="cursor-pointer select-none whitespace-nowrap" onClick={() => handleSort('restarts')} style={{
                    padding: '0 8px',
                    'text-align': 'left',
                    'font-weight': '900',
                    color: '#0ea5e9',
                    'font-size': `${fontSize()}px`,
                    border: 'none'
                  }}>
                    <div class="flex items-center gap-1">Restarts <SortIcon field="restarts" /></div>
                  </th>
                  <th class="whitespace-nowrap" style={{
                    padding: '0 8px',
                    'text-align': 'left',
                    'font-weight': '900',
                    color: '#0ea5e9',
                    'font-size': `${fontSize()}px`,
                    border: 'none'
                  }}>Node</th>
                  <th class="cursor-pointer select-none whitespace-nowrap" onClick={() => handleSort('age')} style={{
                    padding: '0 8px',
                    'text-align': 'left',
                    'font-weight': '900',
                    color: '#0ea5e9',
                    'font-size': `${fontSize()}px`,
                    border: 'none'
                  }}>
                    <div class="flex items-center gap-1">Age <SortIcon field="age" /></div>
                  </th>
                  <th class="whitespace-nowrap" style={{
                    padding: '0 8px',
                    'text-align': 'left',
                    'font-weight': '900',
                    color: '#0ea5e9',
                    'font-size': `${fontSize()}px`,
                    border: 'none'
                  }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                <For each={paginatedPods()} fallback={
                  <tr><td colspan="10" class="text-center py-8" style={{ color: 'var(--text-muted)' }}>No pods found</td></tr>
                }>
                  {(pod: Pod, index) => {
                    const isSelected = () => selectedIndex() === index();
                    const isFailed = pod.status === 'Failed' || pod.status === 'CrashLoopBackOff' || pod.status === 'Error';
                    const isPending = pod.status === 'Pending';
                    const [isHovered, setIsHovered] = createSignal(false);

                    // Text color based on status - terminal style colors
                    const getTextColor = () => {
                      if (pod.status === 'Terminating') return '#ef4444'; // Red for terminating
                      if (isFailed) return '#ef4444'; // Red text for failed
                      if (isPending) return '#f59e0b'; // Orange for pending
                      return '#0ea5e9'; // Sky blue for default/running
                    };

                    // Background color only on hover - theme-aware
                    const getRowBackground = () => {
                      if (!isHovered()) return 'transparent';
                      return getRowHoverBackground(isSelected(), isFailed, isPending);
                    };

                    const textColor = getTextColor();

                    return (
                    <tr
                      style={{
                        background: getRowBackground(),
                        cursor: 'pointer',
                        height: `${Math.max(24, fontSize() * 1.7)}px`,
                        'line-height': `${Math.max(24, fontSize() * 1.7)}px`,
                        color: textColor,
                        'font-weight': '900',
                        'font-size': `${fontSize()}px`,
                        'font-family': getFontFamilyCSS(),
                        padding: '0',
                        margin: '0',
                        border: 'none',
                        transition: 'background-color 0.15s ease'
                      }}
                      onClick={() => {
                        setSelectedIndex(index());
                        openModal(pod, 'details');
                      }}
                      onMouseEnter={() => {
                        setIsHovered(true);
                        if (selectedIndex() !== index()) {
                          setSelectedIndex(index());
                        }
                      }}
                      onMouseLeave={() => setIsHovered(false)}
                    >
                      <td style={{
                        padding: '0 8px',
                        'text-align': 'left',
                        color: textColor,
                        'font-weight': '900',
                        'font-size': `${fontSize()}px`,
                        height: `${Math.max(24, fontSize() * 1.7)}px`,
                        'line-height': `${Math.max(24, fontSize() * 1.7)}px`,
                        border: 'none'
                      }}>
                        {pod.name.length > 40 ? pod.name.slice(0, 37) + '...' : pod.name}
                      </td>
                      <td style={{
                        padding: '0 8px',
                        'text-align': 'left',
                        height: `${Math.max(24, fontSize() * 1.7)}px`,
                        'line-height': `${Math.max(24, fontSize() * 1.7)}px`,
                        border: 'none'
                      }}>
                        <span style={{
                          color: pod.status === 'Running' ? '#22c55e' :
                                 isPending ? '#f59e0b' :
                                 pod.status === 'Succeeded' ? '#06b6d4' :
                                 isFailed ? '#ef4444' : '#ef4444',
                          'font-weight': '900',
                          'font-size': `${fontSize()}px`
                        }}>
                          {pod.status === 'Running' ? '●' : isPending ? '○' : isFailed ? '✗' : '○'} {pod.status}
                        </span>
                      </td>
                      <td style={{
                        padding: '0 8px',
                        'text-align': 'left',
                        color: textColor,
                        'font-weight': '900',
                        'font-size': `${fontSize()}px`,
                        height: `${Math.max(24, fontSize() * 1.7)}px`,
                        'line-height': `${Math.max(24, fontSize() * 1.7)}px`,
                        border: 'none'
                      }}>
                        {(() => {
                          const containerInfos = getContainerInfos(pod);
                          if (containerInfos.length > 0) {
                            const summary = calculateContainerStatus(containerInfos);
                            return <ContainerStatusBadge summary={summary} size="sm" />;
                          }
                          return <span>{pod.ready}</span>;
                        })()}
                      </td>
                      <td style={{
                        padding: '0 8px',
                        'text-align': 'left',
                        color: textColor,
                        'font-weight': '900',
                        'font-size': `${fontSize()}px`,
                        height: `${Math.max(24, fontSize() * 1.7)}px`,
                        'line-height': `${Math.max(24, fontSize() * 1.7)}px`,
                        border: 'none'
                      }}>{pod.ip || '-'}</td>
                      <td style={{
                        padding: '0 8px',
                        'text-align': 'left',
                        height: `${Math.max(24, fontSize() * 1.7)}px`,
                        'line-height': `${Math.max(24, fontSize() * 1.7)}px`,
                        border: 'none'
                      }}>
                        <span class="flex items-center" style={{
                          color: textColor,
                          'font-weight': '900',
                          'font-size': `${fontSize()}px`
                        }}>
                          {podMetrics()[`${pod.namespace}/${pod.name}`]?.cpu || pod.cpu || '-'}
                          {getChangeIndicator(`${pod.namespace}/${pod.name}`, 'cpu') === 'up' && <span style={{ color: '#ef4444', 'font-size': `${fontSize() * 0.7}px`, 'margin-left': '2px' }}>▲</span>}
                          {getChangeIndicator(`${pod.namespace}/${pod.name}`, 'cpu') === 'down' && <span style={{ color: '#22c55e', 'font-size': `${fontSize() * 0.7}px`, 'margin-left': '2px' }}>▼</span>}
                        </span>
                      </td>
                      <td style={{
                        padding: '0 8px',
                        'text-align': 'left',
                        height: `${Math.max(24, fontSize() * 1.7)}px`,
                        'line-height': `${Math.max(24, fontSize() * 1.7)}px`,
                        border: 'none'
                      }}>
                        <span class="flex items-center" style={{
                          color: textColor,
                          'font-weight': '900',
                          'font-size': `${fontSize()}px`
                        }}>
                          {podMetrics()[`${pod.namespace}/${pod.name}`]?.memory || pod.memory || '-'}
                          {getChangeIndicator(`${pod.namespace}/${pod.name}`, 'memory') === 'up' && <span style={{ color: '#ef4444', 'font-size': `${fontSize() * 0.7}px`, 'margin-left': '2px' }}>▲</span>}
                          {getChangeIndicator(`${pod.namespace}/${pod.name}`, 'memory') === 'down' && <span style={{ color: '#22c55e', 'font-size': `${fontSize() * 0.7}px`, 'margin-left': '2px' }}>▼</span>}
                        </span>
                      </td>
                      <td style={{
                        padding: '0 8px',
                        'text-align': 'left',
                        color: textColor,
                        'font-weight': '900',
                        'font-size': `${fontSize()}px`,
                        height: `${Math.max(24, fontSize() * 1.7)}px`,
                        'line-height': `${Math.max(24, fontSize() * 1.7)}px`,
                        border: 'none'
                      }}>{pod.restarts}</td>
                      <td style={{
                        padding: '0 8px',
                        'text-align': 'left',
                        color: textColor,
                        'font-weight': '900',
                        'font-size': `${fontSize()}px`,
                        height: `${Math.max(24, fontSize() * 1.7)}px`,
                        'line-height': `${Math.max(24, fontSize() * 1.7)}px`,
                        border: 'none'
                      }}>{pod.node}</td>
                      <td style={{
                        padding: '0 8px',
                        'text-align': 'left',
                        color: textColor,
                        'font-weight': '900',
                        'font-size': `${fontSize()}px`,
                        height: `${Math.max(24, fontSize() * 1.7)}px`,
                        'line-height': `${Math.max(24, fontSize() * 1.7)}px`,
                        border: 'none'
                      }}>{formatAgeFromTimestamp(pod.createdAt, ageTicker())}</td>
                      <td style={{
                        padding: '0 8px',
                        'text-align': 'left',
                        height: `${Math.max(24, fontSize() * 1.7)}px`,
                        'line-height': `${Math.max(24, fontSize() * 1.7)}px`,
                        border: 'none'
                      }}>
                        <ActionMenu
                          actions={[
                            { label: 'Shell', icon: 'shell', onClick: () => openShellInNewTab(pod) },
                            { label: 'Port Forward', icon: 'portforward', onClick: () => openModal(pod, 'portforward') },
                            { label: 'View Logs', icon: 'logs', onClick: () => openModal(pod, 'logs') },
                            { label: 'View YAML', icon: 'yaml', onClick: () => openModal(pod, 'yaml') },
                            { label: 'Edit YAML', icon: 'edit', onClick: () => { setSelectedPod(pod); setShowEdit(true); } },
                            { label: 'Describe', icon: 'describe', onClick: () => openModal(pod, 'describe') },
                            { label: 'Delete', icon: 'delete', onClick: () => openDeleteConfirm(pod), variant: 'danger' },
                          ]}
                          onOpenChange={setActionMenuOpen}
                        />
                      </td>
                    </tr>
                    );
                  }}
                </For>
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <Show when={totalPages() > 1}>
            <div class="flex items-center justify-between p-4 font-mono text-sm" style={{ background: 'var(--bg-secondary)' }}>
              <div style={{ color: 'var(--text-secondary)' }}>
                Showing {((currentPage() - 1) * pageSize()) + 1} - {Math.min(currentPage() * pageSize(), filteredAndSortedPods().length)} of {filteredAndSortedPods().length} pods
              </div>
              <div class="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage() === 1}
                  class="px-3 py-1 rounded text-sm disabled:opacity-50"
                  style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
                >
                  First
                </button>
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage() === 1}
                  class="px-3 py-1 rounded text-sm disabled:opacity-50"
                  style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
                >
                  ← Prev
                </button>
                <span class="px-3 py-1" style={{ color: 'var(--text-primary)' }}>
                  Page {currentPage()} of {totalPages()}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages(), p + 1))}
                  disabled={currentPage() === totalPages()}
                  class="px-3 py-1 rounded text-sm disabled:opacity-50"
                  style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
                >
                  Next →
                </button>
                <button
                  onClick={() => setCurrentPage(totalPages())}
                  disabled={currentPage() === totalPages()}
                  class="px-3 py-1 rounded text-sm disabled:opacity-50"
                  style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
                >
                  Last
                </button>
                <select
                  value={pageSize()}
                  onChange={(e) => { setPageSize(parseInt(e.currentTarget.value)); setCurrentPage(1); }}
                  class="px-3 py-1 rounded-lg text-sm ml-4"
                  style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
                >
                  <option value="20">20 per page</option>
                  <option value="50">50 per page</option>
                  <option value="100">100 per page</option>
                </select>
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
            style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
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
                      <div style={{ color: 'var(--text-primary)' }}>
                        {(() => {
                          const pod = selectedPod();
                          if (!pod) return '-';
                          const containerInfos = getContainerInfos(pod);
                          if (containerInfos.length > 0) {
                            const summary = calculateContainerStatus(containerInfos);
                            return <ContainerStatusBadge summary={summary} />;
                          }
                          return pod.ready;
                        })()}
                      </div>
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
                    {(() => {
                      const containers = podDetails()?.containers || [];
                      // Convert to ContainerInfo[] if needed
                      const containerInfos: ContainerInfo[] = containers.map((c: any) => ({
                        name: c.name || (typeof c === 'string' ? c : ''),
                        type: (c.type || 'main') as ContainerType,
                        image: c.image || '',
                        ready: c.ready,
                        state: c.state,
                        restartCount: c.restartCount,
                        containerID: c.containerID,
                        startedAt: c.startedAt,
                        reason: c.reason,
                        message: c.message,
                        exitCode: c.exitCode,
                      }));
                      return <ContainerList containers={containerInfos} showAll={true} />;
                    })()}
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

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteConfirm()}
        onClose={() => {
          setShowDeleteConfirm(false);
          setPodToDelete(null);
        }}
        title="Delete Pod"
        size="md"
      >
        <div class="space-y-4">
          <div class="flex items-start gap-3">
            <div class="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'rgba(239, 68, 68, 0.15)' }}>
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--error-color)' }}>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div class="flex-1">
              <p class="text-sm mb-2" style={{ color: 'var(--text-primary)' }}>
                Are you sure you want to delete this pod?
              </p>
              <div class="p-3 rounded-lg mb-4" style={{ background: 'var(--bg-tertiary)' }}>
                <div class="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
                  {podToDelete()?.name}
                </div>
                <div class="text-xs" style={{ color: 'var(--text-muted)' }}>
                  Namespace: {podToDelete()?.namespace}
                </div>
              </div>
              <p class="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
                This action cannot be undone. The pod will be permanently deleted from the cluster.
              </p>
            </div>
          </div>
          <div class="flex items-center justify-end gap-3 pt-4 border-t" style={{ 'border-color': 'var(--border-color)' }}>
            <button
              onClick={() => {
                setShowDeleteConfirm(false);
                setPodToDelete(null);
              }}
              class="px-4 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-80"
              style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
            >
              Cancel
            </button>
            <button
              onClick={deletePod}
              class="px-4 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-80 flex items-center gap-2"
              style={{ background: 'var(--error-color)', color: 'white' }}
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Delete Pod
            </button>
          </div>
        </div>
      </Modal>

      {/* Container Selector Modal */}
      <Modal isOpen={showContainerSelect()} onClose={() => setShowContainerSelect(false)} title={`Select Container for ${containerSelectPod()?.name}`} size="sm">
        <div class="space-y-2">
          <Show when={containerSelectPod()} fallback={<div>No pod selected</div>}>
            {(pod) => {
              const containerInfos = getContainerInfos(pod());
              return (
                <Show when={containerInfos.length > 0} fallback={<div>No containers found</div>}>
                  <For each={containerInfos}>
                    {(container) => (
                      <button
                        onClick={() => connectToContainer(pod(), container.name)}
                        class="w-full p-3 rounded-lg text-left transition-colors"
                        style={{
                          background: 'var(--bg-secondary)',
                          color: 'var(--text-primary)',
                          border: '1px solid var(--border-color)',
                          'hover-background': 'var(--bg-tertiary)'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-tertiary)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'var(--bg-secondary)'}
                      >
                        <div class="flex items-center gap-2">
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                          </svg>
                          <div class="flex-1">
                            <div class="font-medium">{container.name}</div>
                            <div class="text-xs flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
                              <span class={`px-1.5 py-0.5 rounded text-xs ${
                                container.type === 'init' ? 'bg-blue-500/20 text-blue-400' :
                                container.type === 'sidecar' ? 'bg-purple-500/20 text-purple-400' :
                                'bg-gray-500/20 text-gray-400'
                              }`}>
                                {container.type}
                              </span>
                              <span>• {pod().namespace}</span>
                            </div>
                          </div>
                          {container.ready && (
                            <span class="text-green-400 text-xs">✓</span>
                          )}
                        </div>
                      </button>
                    )}
                  </For>
                </Show>
              );
            }}
          </Show>
        </div>
      </Modal>
    </div>
  );
};

export default Pods;
