import { Component, For, Show, createMemo, createSignal, createResource, onMount, onCleanup, createEffect } from 'solid-js';
import { api } from '../services/api';
import { namespace, clusterStatus } from '../stores/cluster';
import { addNotification, setCurrentView } from '../stores/ui';
import { getHighlightedPod, clearHighlightedPod, getPodForLogs, clearPodLogs, shouldHighlightPod } from '../utils/pod-selection';
import {
  selectedCluster,
  selectedNamespaces,
  searchQuery,
  setSearchQuery,
  globalLoading,
  setGlobalLoading,
  setNamespaces,
} from '../stores/globalStore';
import { createCachedResource } from '../utils/resourceCache';
import { getRowHoverBackground } from '../utils/rowHoverStyles';
import Modal from '../components/Modal';
import YAMLViewer from '../components/YAMLViewer';
import YAMLEditor from '../components/YAMLEditor';
import CommandPreview from '../components/CommandPreview';
import DescribeModal from '../components/DescribeModal';
import ActionMenu from '../components/ActionMenu';
import ContainerStatusBadge from '../components/ContainerStatusBadge';
import ContainerList from '../components/ContainerList';
import ContainerTable from '../components/ContainerTable';
import { ContainerInfo, ContainerType, isSidecarContainer } from '../utils/containerTypes';
import { calculateContainerStatus } from '../utils/containerStatus';
import { containersToTableRows, ContainerTableRow } from '../utils/containerTableUtils';
import { BulkActions, SelectionCheckbox, SelectAllCheckbox } from '../components/BulkActions';
import { BulkDeleteModal } from '../components/BulkDeleteModal';
import { useBulkSelection } from '../hooks/useBulkSelection';
import { startExecution } from '../stores/executionPanel';
import { WorkloadRef, kindAbbrev, formatWorkloadChain, workloadKindToView, navigateToWorkloadWithFocus } from '../utils/workload-navigation';

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
  workloadRef?: WorkloadRef;
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

  // Bulk selection
  const bulk = useBulkSelection<Pod>();
  const [showBulkDeleteModal, setShowBulkDeleteModal] = createSignal(false);

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
  
  // Explain Pod state
  const [showExplain, setShowExplain] = createSignal(false);
  const [explainData, setExplainData] = createSignal<any>(null);
  const [explainLoading, setExplainLoading] = createSignal(false);
  const [explainError, setExplainError] = createSignal<string | null>(null);

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
  const [selectedPodIndex, setSelectedPodIndex] = createSignal<number | null>(null); // Index in full filtered list
  const [hoveredRowIndex, setHoveredRowIndex] = createSignal<number | null>(null); // Track which row is hovered
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
      
      // Use full filtered list for navigation (not just current page)
      const allPods = filteredAndSortedPods();
      if (allPods.length === 0) return;
      
      const currentPodIndex = selectedPodIndex();
      
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedPodIndex(prev => {
            if (prev === null) {
              // Start from first pod
              const firstIndex = 0;
              updatePageForIndex(firstIndex, allPods.length);
              return firstIndex;
            }
            const nextIndex = Math.min(prev + 1, allPods.length - 1);
            updatePageForIndex(nextIndex, allPods.length);
            return nextIndex;
          });
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedPodIndex(prev => {
            if (prev === null || prev === 0) {
              setSelectedIndex(null);
              return null;
            }
            const prevIndex = prev - 1;
            updatePageForIndex(prevIndex, allPods.length);
            return prevIndex;
          });
          break;
        case 'Enter':
          e.preventDefault();
          if (currentPodIndex !== null && allPods[currentPodIndex]) {
            openModal(allPods[currentPodIndex], 'details');
          }
          break;
        case 'Escape':
          setSelectedPodIndex(null);
          setSelectedIndex(null);
          break;
      }
    };
    
    // Helper function to update page when navigating to a pod on a different page
    const updatePageForIndex = (podIndex: number, totalPods: number) => {
      const size = pageSize();
      const targetPage = Math.floor(podIndex / size) + 1;
      const totalPages = Math.ceil(totalPods / size);
      if (targetPage !== currentPage() && targetPage >= 1 && targetPage <= totalPages) {
        setCurrentPage(targetPage);
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

  // Reset selection when filter/search changes
  createEffect(() => {
    // Track filtered pods to detect changes
    filteredAndSortedPods();
    // Reset selection when filters change
    setSelectedPodIndex(null);
    setSelectedIndex(null);
  });

  // Sync selectedPodIndex with selectedIndex when page changes
  createEffect(() => {
    const podIndex = selectedPodIndex();
    const allPods = filteredAndSortedPods();
    
    if (podIndex !== null && allPods.length > 0 && podIndex < allPods.length) {
      // Find the pod in the current page
      const size = pageSize();
      const start = (currentPage() - 1) * size;
      const end = start + size;
      
      if (podIndex >= start && podIndex < end) {
        // Pod is on current page, set the local index
        const localIndex = podIndex - start;
        setSelectedIndex(localIndex);
      } else {
        // Pod is not on current page, clear local selection
        setSelectedIndex(null);
      }
    } else if (podIndex !== null && allPods.length > 0 && podIndex >= allPods.length) {
      // Index is out of bounds, reset
      setSelectedPodIndex(null);
      setSelectedIndex(null);
    } else {
      setSelectedIndex(null);
    }
  });

  // Scroll selected row into view
  createEffect(() => {
    const index = selectedIndex();
    if (index !== null && tableRef) {
      // Small delay to ensure DOM is updated after page change
      setTimeout(() => {
        const rows = tableRef?.querySelectorAll('tbody tr');
        if (rows && rows[index]) {
          rows[index].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }, 50);
    }
  });

  // Handle pod highlighting from incidents navigation
  createEffect(() => {
    const highlighted = getHighlightedPod();
    if (highlighted) {
      const pods = podsCache();
      if (pods && pods.length > 0) {
        const pod = pods.find(p => p.name === highlighted.podName && p.namespace === highlighted.namespace);
        if (pod) {
          // Find index in filtered list
          const filtered = filteredAndSortedPods();
          const index = filtered.findIndex(p => p.name === highlighted.podName && p.namespace === highlighted.namespace);
          if (index !== -1) {
            // Update page if needed
            const size = pageSize();
            const targetPage = Math.floor(index / size) + 1;
            if (targetPage !== currentPage()) {
              setCurrentPage(targetPage);
            }
            setSelectedPodIndex(index);
            setTimeout(() => {
              const rows = tableRef?.querySelectorAll('tbody tr');
              const localIndex = index - (targetPage - 1) * size;
              if (rows && rows[localIndex]) {
                rows[localIndex].scrollIntoView({ behavior: 'smooth', block: 'center' });
                // Highlight the row temporarily
                (rows[localIndex] as HTMLElement).style.background = 'var(--accent-primary)20';
                setTimeout(() => {
                  (rows[localIndex] as HTMLElement).style.background = '';
                }, 2000);
              }
            }, 500);
          }
          clearHighlightedPod();
        } else {
          // Pod not found yet, wait a bit and retry
          setTimeout(() => {
            const podsRetry = podsCache();
            if (podsRetry && podsRetry.length > 0) {
              const podRetry = podsRetry.find(p => p.name === highlighted.podName && p.namespace === highlighted.namespace);
              if (podRetry) {
                const filtered = filteredAndSortedPods();
                const index = filtered.findIndex(p => p.name === highlighted.podName && p.namespace === highlighted.namespace);
                if (index !== -1) {
                  const size = pageSize();
                  const targetPage = Math.floor(index / size) + 1;
                  if (targetPage !== currentPage()) {
                    setCurrentPage(targetPage);
                  }
                  setSelectedPodIndex(index);
                  setTimeout(() => {
                    const rows = tableRef?.querySelectorAll('tbody tr');
                    const localIndex = index - (targetPage - 1) * size;
                    if (rows && rows[localIndex]) {
                      rows[localIndex].scrollIntoView({ behavior: 'smooth', block: 'center' });
                      (rows[localIndex] as HTMLElement).style.background = 'var(--accent-primary)20';
                      setTimeout(() => {
                        (rows[localIndex] as HTMLElement).style.background = '';
                      }, 2000);
                    }
                  }, 500);
                }
                clearHighlightedPod();
              }
            }
          }, 1000);
        }
      }
    }
  });

  // Handle auto-open logs from incidents - watch for pods cache changes
  createEffect(() => {
    const podForLogs = getPodForLogs();
    const flag = sessionStorage.getItem('kubegraf-open-logs-flag');
    const pods = podsCache.data(); // Track pods cache changes

    if (podForLogs && flag === 'true' && pods && pods.length > 0) {
      const pod = pods.find(p => p.name === podForLogs.podName && p.namespace === podForLogs.namespace);
      if (pod) {
        // Found the pod - open logs
        sessionStorage.removeItem('kubegraf-open-logs-flag');
        clearPodLogs();
        setSelectedPod(pod);
        fetchLogs(pod, logsFollow());
        setShowLogs(true);
        addNotification(`Opening logs for ${pod.name}`, 'info');
      }
    }
  });

  // Fallback: If pods are loaded but target pod not found, open logs directly after a delay
  createEffect(() => {
    const podForLogs = getPodForLogs();
    const flag = sessionStorage.getItem('kubegraf-open-logs-flag');
    
    if (podForLogs && flag === 'true') {
      // Set a timeout to open logs directly if pod isn't found after pods load
      const timeoutId = setTimeout(() => {
        const currentFlag = sessionStorage.getItem('kubegraf-open-logs-flag');
        if (currentFlag === 'true') {
          // Flag still set means we couldn't find the pod in the list
          sessionStorage.removeItem('kubegraf-open-logs-flag');
          clearPodLogs();
          
          addNotification(`Opening logs for ${podForLogs.podName} (pod may not be in current view)`, 'info');
          
          // Create a temporary pod object and open logs directly
          const tempPod: Pod = {
            name: podForLogs.podName,
            namespace: podForLogs.namespace,
            status: 'Unknown',
            ready: '0/0',
            restarts: 0,
            age: 'Unknown',
            node: 'Unknown'
          };
          setSelectedPod(tempPod);
          fetchLogs(tempPod, logsFollow());
          setShowLogs(true);
        }
      }, 3000); // Wait 3 seconds for pods to load
      
      // Cleanup timeout if flag is cleared (pod was found)
      return () => clearTimeout(timeoutId);
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
  
  // Owner filter from URL params
  const [ownerFilter, setOwnerFilter] = createSignal<{ kind?: string; name?: string; namespace?: string } | null>(null);
  
  // Read URL params on mount
  onMount(() => {
    const params = new URLSearchParams(window.location.search);
    const ownerKind = params.get('ownerKind');
    const ownerName = params.get('ownerName');
    const ownerNamespace = params.get('namespace');
    if (ownerKind && ownerName) {
      setOwnerFilter({ kind: ownerKind, name: ownerName, namespace: ownerNamespace || undefined });
    }
    
    // Clear namespace filter if it was set programmatically (from navigation)
    // Check if namespace was set programmatically via sessionStorage flag
    const wasSetProgrammatically = sessionStorage.getItem('kubegraf:namespaceSetProgrammatically') === 'true';
    const currentNamespaces = selectedNamespaces();
    
    // If namespace was set programmatically and matches URL param or is a single value, clear it
    if (wasSetProgrammatically) {
      if (ownerNamespace && currentNamespaces.length === 1 && currentNamespaces[0] === ownerNamespace) {
        // Clear the programmatically set namespace to show all namespaces
        setNamespaces([]);
      } else if (currentNamespaces.length === 1 && !ownerNamespace) {
        // No URL param but single namespace set - likely from previous navigation, clear it
        setNamespaces([]);
      }
      // Clear the flag
      sessionStorage.removeItem('kubegraf:namespaceSetProgrammatically');
    } else if (ownerNamespace && currentNamespaces.length === 1 && currentNamespaces[0] === ownerNamespace) {
      // Fallback: if namespace matches URL param, assume it was set programmatically
      setNamespaces([]);
    }
  });
  
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
    
    const trimmed = yaml.trim();
    if (!trimmed) {
      const msg = 'YAML cannot be empty';
      addNotification(msg, 'error');
      throw new Error(msg);
    }

    const status = clusterStatus();
    if (!status?.connected) {
      const msg = 'Cluster is not connected. Connect to a cluster before applying YAML.';
      addNotification(msg, 'error');
      throw new Error(msg);
    }

    // Run apply YAML via the streaming execution pipeline so output is visible
    // in the ExecutionPanel. This uses the Kubernetes API on the backend (no kubectl).
    startExecution({
      label: `Apply Pod YAML: ${pod.name}`,
      command: '__k8s-apply-yaml',
      args: [],
      mode: 'apply',
      kubernetesEquivalent: true,
      namespace: pod.namespace,
      context: status.context,
      userAction: 'pods-apply-yaml',
      dryRun: false,
      allowClusterWide: false,
      resource: 'pods',
      action: 'update',
      intent: 'apply-yaml',
      yaml: trimmed,
    });

    // Close the editor once the execution has been started; the ExecutionPanel
    // now owns the UX for tracking success/failure.
    setShowEdit(false);

    // Trigger a background refetch after a short delay so the table reflects
    // any changes from the apply.
    setTimeout(() => podsCache.refetch(), 1500);
  };

  const handleDryRunYAML = async (yaml: string) => {
    const pod = selectedPod();
    if (!pod) return;
    
    const trimmed = yaml.trim();
    if (!trimmed) {
      const msg = 'YAML cannot be empty';
      addNotification(msg, 'error');
      throw new Error(msg);
    }

    const status = clusterStatus();
    if (!status?.connected) {
      const msg = 'Cluster is not connected. Connect to a cluster before running a dry run.';
      addNotification(msg, 'error');
      throw new Error(msg);
    }

    startExecution({
      label: `Dry run Pod YAML: ${pod.name}`,
      command: '__k8s-apply-yaml',
      args: [],
      mode: 'dry-run',
      kubernetesEquivalent: true,
      namespace: pod.namespace,
      context: status.context,
      userAction: 'pods-apply-yaml-dry-run',
      dryRun: true,
      allowClusterWide: false,
      resource: 'pods',
      action: 'update',
      intent: 'apply-yaml',
      yaml: trimmed,
    });
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
        allPods = allPods.filter((p: Pod) => 
          p.status === 'Pending' || 
          p.status === 'Initializing' ||
          p.status?.includes('ContainerCreating') ||
          p.status?.includes('PodInitializing') ||
          p.status?.includes('Init:') ||
          p.status?.toLowerCase().includes('initializing')
        );
      } else if (status === 'failed') {
        allPods = allPods.filter((p: Pod) => ['Failed', 'Error', 'CrashLoopBackOff'].includes(p.status));
      } else if (status === 'succeeded') {
        allPods = allPods.filter((p: Pod) => p.status === 'Succeeded');
      }
    }

    // Filter by owner (from URL params)
    const owner = ownerFilter();
    if (owner && owner.kind && owner.name) {
      allPods = allPods.filter((p: Pod) => {
        if (!p.workloadRef) return false;
        const ref = p.workloadRef;
        const kindMatch = ref.kind.toLowerCase() === owner.kind!.toLowerCase();
        const nameMatch = ref.name === owner.name;
        const namespaceMatch = !owner.namespace || ref.namespace === owner.namespace;
        return kindMatch && nameMatch && namespaceMatch;
      });
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

  // Create a memo for selected items to ensure reactivity in the modal
  const selectedItemsForModal = createMemo(() => {
    return bulk.getSelectedItems(filteredAndSortedPods());
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
      pending: all.filter((p: Pod) => 
        p.status === 'Pending' || 
        p.status === 'Initializing' ||
        p.status?.includes('ContainerCreating') ||
        p.status?.includes('PodInitializing') ||
        p.status?.includes('Init:') ||
        p.status?.toLowerCase().includes('initializing')
      ).length,
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

  // Explain Pod functionality
  const openExplain = async (pod: Pod) => {
    setSelectedPod(pod);
    setShowExplain(true);
    setExplainLoading(true);
    setExplainError(null);
    setExplainData(null);
    
    try {
      const response = await fetch(`/api/explain/pod?namespace=${encodeURIComponent(pod.namespace)}&pod=${encodeURIComponent(pod.name)}`);
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `Failed to explain pod: ${response.statusText}`);
      }
      const data = await response.json();
      setExplainData(data);
    } catch (err: any) {
      setExplainError(err.message || 'Failed to explain pod');
      console.error('Explain error:', err);
    } finally {
      setExplainLoading(false);
    }
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
    <div class="space-y-2 max-w-full -mt-4">
      {/* Header - reduced size */}
      <div class="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 class="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Pods</h1>
          <p class="text-xs" style={{ color: 'var(--text-secondary)' }}>Manage and monitor your Kubernetes pods</p>
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

      {/* Status summary - compact */}
      <div class="flex flex-wrap items-center gap-2">
        <div class="card px-3 py-1.5 cursor-pointer hover:opacity-80 flex items-center gap-1.5" style={{ 'border-left': '2px solid var(--accent-primary)' }} onClick={() => setStatusFilter('all')}>
          <span style={{ color: 'var(--text-secondary)' }} class="text-xs">Total</span>
          <span class="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{statusCounts().total}</span>
        </div>
        <div class="card px-3 py-1.5 cursor-pointer hover:opacity-80 flex items-center gap-1.5" style={{ 'border-left': '2px solid var(--success-color)' }} onClick={() => setStatusFilter('running')}>
          <span style={{ color: 'var(--text-secondary)' }} class="text-xs">Running</span>
          <span class="text-sm font-semibold" style={{ color: 'var(--success-color)' }}>{statusCounts().running}</span>
        </div>
        <div class="card px-3 py-1.5 cursor-pointer hover:opacity-80 flex items-center gap-1.5" style={{ 'border-left': '2px solid var(--warning-color)' }} onClick={() => setStatusFilter('pending')}>
          <span style={{ color: 'var(--text-secondary)' }} class="text-xs">Pending</span>
          <span class="text-sm font-semibold" style={{ color: 'var(--warning-color)' }}>{statusCounts().pending}</span>
        </div>
        <div class="card px-3 py-1.5 cursor-pointer hover:opacity-80 flex items-center gap-1.5" style={{ 'border-left': '2px solid var(--error-color)' }} onClick={() => setStatusFilter('failed')}>
          <span style={{ color: 'var(--text-secondary)' }} class="text-xs">Failed</span>
          <span class="text-sm font-semibold" style={{ color: 'var(--error-color)' }}>{statusCounts().failed}</span>
        </div>

        {/* Bulk Actions */}
        <BulkActions
          selectedCount={bulk.selectedCount()}
          totalCount={filteredAndSortedPods().length}
          onSelectAll={() => bulk.selectAll(filteredAndSortedPods())}
          onDeselectAll={() => bulk.deselectAll()}
          onDelete={() => setShowBulkDeleteModal(true)}
          resourceType="pods"
        />

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
          when={podsCache.data() !== undefined}
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
                  <th style={{
                    padding: '0 8px',
                    'text-align': 'center',
                    width: '40px',
                    border: 'none'
                  }}>
                    <SelectAllCheckbox
                      checked={bulk.selectedCount() === filteredAndSortedPods().length && filteredAndSortedPods().length > 0}
                      indeterminate={bulk.selectedCount() > 0 && bulk.selectedCount() < filteredAndSortedPods().length}
                      onChange={(checked) => {
                        if (checked) {
                          bulk.selectAll(filteredAndSortedPods());
                        } else {
                          bulk.deselectAll();
                        }
                      }}
                    />
                  </th>
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
                  <tr><td colspan="11" class="text-center py-8" style={{ color: 'var(--text-muted)' }}>No pods found</td></tr>
                }>
                  {(pod: Pod, index) => {
                    const isSelected = () => selectedIndex() === index();
                    const isHovered = () => hoveredRowIndex() === index();
                    const isFailed = pod.status === 'Failed' || pod.status === 'CrashLoopBackOff' || pod.status === 'Error';
                    const isTerminating = pod.status === 'Terminating';
                    // Check for pending or initializing statuses
                    const isPending = pod.status === 'Pending' ||
                                     pod.status === 'Initializing' ||
                                     pod.status?.includes('ContainerCreating') ||
                                     pod.status?.includes('PodInitializing') ||
                                     pod.status?.includes('Init:') ||
                                     pod.status?.toLowerCase().includes('initializing');

                    // Text color based on status - terminal style colors
                    const textColor = isTerminating ? '#a855f7' : // Purple/violet for terminating
                                     isFailed ? '#ef4444' : // Red text for failed
                                     isPending ? '#fbbf24' : // Yellow for pending/initializing
                                     '#0ea5e9'; // Sky blue for default/running

                    // Background color - violet/purple for terminating pods, hover colors for others
                    const getRowBackground = () => {
                      if (isTerminating) return 'rgba(168, 85, 247, 0.15)';
                      if (!isHovered()) return 'transparent';
                      return getRowHoverBackground(isSelected(), isFailed, isPending);
                    };

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
                        border: isTerminating ? '1px solid rgba(168, 85, 247, 0.3)' : 'none',
                        transition: 'background-color 0.15s ease'
                      }}
                      onClick={() => {
                        const allPods = filteredAndSortedPods();
                        const start = (currentPage() - 1) * pageSize();
                        const globalIndex = start + index();
                        setSelectedPodIndex(globalIndex);
                        setSelectedIndex(index());
                        openModal(pod, 'details');
                      }}
                      onMouseEnter={() => {
                        setHoveredRowIndex(index());
                        const allPods = filteredAndSortedPods();
                        const start = (currentPage() - 1) * pageSize();
                        const globalIndex = start + index();
                        if (selectedPodIndex() !== globalIndex) {
                          setSelectedPodIndex(globalIndex);
                          setSelectedIndex(index());
                        }
                      }}
                      onMouseLeave={() => setHoveredRowIndex(null)}
                    >
                      <td style={{
                        padding: '0 8px',
                        'text-align': 'center',
                        width: '40px',
                        border: 'none'
                      }}>
                        <SelectionCheckbox
                          checked={bulk.isSelected(pod)}
                          onChange={() => bulk.toggleSelection(pod)}
                        />
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
                        <div class="flex items-center gap-2 flex-wrap">
                          <span>{pod.name.length > 40 ? pod.name.slice(0, 37) + '...' : pod.name}</span>
                          <Show when={pod.workloadRef}>
                            {(ref) => (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigateToWorkloadWithFocus(ref(), setCurrentView);
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    navigateToWorkloadWithFocus(ref(), setCurrentView);
                                  }
                                }}
                                title={formatWorkloadChain(ref())}
                                class="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium transition-colors hover:opacity-80 focus:outline-none focus:ring-1 focus:ring-offset-1"
                                style={{
                                  background: 'rgba(14, 165, 233, 0.2)',
                                  color: '#0ea5e9',
                                  border: '1px solid rgba(14, 165, 233, 0.3)',
                                  'font-size': `${Math.max(10, fontSize() - 2)}px`,
                                  'line-height': '1.2',
                                  'max-width': '120px',
                                  overflow: 'hidden',
                                  'text-overflow': 'ellipsis',
                                  'white-space': 'nowrap',
                                }}
                              >
                                {kindAbbrev(ref().kind)} {ref().name.length > 12 ? ref().name.slice(0, 10) + '...' : ref().name}
                              </button>
                            )}
                          </Show>
                        </div>
                      </td>
                      <td style={{
                        padding: '0 8px',
                        'text-align': 'left',
                        height: `${Math.max(24, fontSize() * 1.7)}px`,
                        'line-height': `${Math.max(24, fontSize() * 1.7)}px`,
                        border: 'none'
                      }}>
                        <span style={{
                          color: isTerminating ? '#a855f7' : // Purple/violet for terminating
                                 pod.status === 'Running' ? '#22c55e' :
                                 isPending ? '#fbbf24' : // Yellow for pending/initializing
                                 pod.status === 'Succeeded' ? '#06b6d4' :
                                 isFailed ? '#ef4444' : '#ef4444',
                          'font-weight': '900',
                          'font-size': `${fontSize()}px`
                        }}>
                          {isTerminating ? '◐' : pod.status === 'Running' ? '●' : isPending ? '○' : isFailed ? '✗' : '○'} {pod.status}
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
                            { label: 'Explain Pod', icon: 'info', onClick: () => openExplain(pod), divider: true },
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
                      <div><span class={`badge ${
                        selectedPod()?.status === 'Running' ? 'badge-success' : 
                        (selectedPod()?.status === 'Pending' || 
                         selectedPod()?.status === 'Initializing' ||
                         selectedPod()?.status?.includes('ContainerCreating') ||
                         selectedPod()?.status?.includes('PodInitializing') ||
                         selectedPod()?.status?.includes('Init:') ||
                         selectedPod()?.status?.toLowerCase().includes('initializing')) ? 'badge-warning' :
                        selectedPod()?.status === 'Failed' || selectedPod()?.status === 'CrashLoopBackOff' || selectedPod()?.status === 'Error' ? 'badge-error' :
                        'badge-warning'
                      }`}>{selectedPod()?.status}</span></div>
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

                {/* Containers Table */}
                <div>
                  <h3 class="text-sm font-semibold mb-3" style={{ color: 'var(--text-secondary)' }}>Containers</h3>
                  <Show when={!podDetails.loading && podDetails()?.containers} fallback={
                    <div class="p-4 text-center"><div class="spinner mx-auto" /></div>
                  }>
                    {(() => {
                      const containers = podDetails()?.containers || [];
                      const metrics = podDetails()?.metrics as any;
                      
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
                        ports: c.ports || [],
                      }));
                      
                      // Build container metrics map
                      const containerMetricsMap: Record<string, { cpu: string; memory: string }> = {};
                      if (metrics?.containerMetricsMap) {
                        const metricsMap = metrics.containerMetricsMap as Record<string, any>;
                        Object.keys(metricsMap).forEach(name => {
                          const cm = metricsMap[name];
                          containerMetricsMap[name] = {
                            cpu: cm.cpu || '-',
                            memory: cm.memory || '-',
                          };
                        });
                      }
                      
                      // Build container ports map
                      const containerPortsMap: Record<string, number[]> = {};
                      containers.forEach((c: any) => {
                        if (c.name && c.ports && Array.isArray(c.ports)) {
                          containerPortsMap[c.name] = c.ports;
                        }
                      });
                      
                      // Convert to table rows
                      const tableRows = containersToTableRows(
                        containerInfos,
                        containerMetricsMap,
                        containerPortsMap
                      );
                      
                      return (
                        <div class="rounded-lg border" style={{ 'border-color': 'var(--border-color)', background: 'var(--bg-secondary)' }}>
                          <ContainerTable containers={tableRows} />
                        </div>
                      );
                    })()}
                  </Show>
                </div>

                {/* Actions */}
                <div class="grid grid-cols-5 gap-2 pt-3">
                  <button
                    onClick={() => openShellInNewTab(selectedPod()!)}
                    class="btn-primary flex flex-col items-center justify-center gap-1 px-2 py-2 rounded text-xs"
                    title="Shell"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span>Shell</span>
                  </button>
                  <button
                    onClick={() => { setShowDetails(false); openModal(selectedPod()!, 'portforward'); }}
                    class="btn-primary flex flex-col items-center justify-center gap-1 px-2 py-2 rounded text-xs"
                    title="Port Forward"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <span class="text-center leading-tight">Port<br/>Forward</span>
                  </button>
                  <button
                    onClick={() => { setShowDetails(false); openModal(selectedPod()!, 'logs'); }}
                    class="btn-secondary flex flex-col items-center justify-center gap-1 px-2 py-2 rounded text-xs"
                    title="Logs"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span>Logs</span>
                  </button>
                  <button
                    onClick={() => { setShowDetails(false); openModal(selectedPod()!, 'yaml'); }}
                    class="btn-secondary flex flex-col items-center justify-center gap-1 px-2 py-2 rounded text-xs"
                    title="YAML"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                    </svg>
                    <span>YAML</span>
                  </button>
                  <button
                    onClick={() => { setShowDetails(false); openModal(selectedPod()!, 'describe'); }}
                    class="btn-secondary flex flex-col items-center justify-center gap-1 px-2 py-2 rounded text-xs"
                    title="Describe"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Describe</span>
                  </button>
                </div>
              </div>
            );
          })()}
        </Show>
      </Modal>

      {/* Port Forward Modal */}
      <Modal isOpen={showPortForward()} onClose={() => setShowPortForward(false)} title="Port Forward" size="xs">
        <div class="space-y-3">
          <div class="flex items-end gap-3">
            <div class="flex-1">
              <label class="block text-sm mb-1.5" style={{ color: 'var(--text-secondary)' }}>Local Port</label>
              <input
                type="number"
                min="1024"
                max="65535"
                value={localPort()}
                onInput={(e) => setLocalPort(parseInt(e.currentTarget.value) || 8080)}
                class="w-full px-3 py-2 rounded text-sm"
                style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
              />
            </div>
            <div class="pb-3 text-gray-400 text-lg">→</div>
            <div class="flex-1">
              <label class="block text-sm mb-1.5" style={{ color: 'var(--text-secondary)' }}>Remote Port</label>
              <input
                type="number"
                min="1"
                max="65535"
                value={remotePort()}
                onInput={(e) => setRemotePort(parseInt(e.currentTarget.value) || 80)}
                class="w-full px-3 py-2 rounded text-sm"
                style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
              />
            </div>
          </div>
          <div class="text-sm px-3 py-2 rounded text-center" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}>
            <span class="font-mono text-blue-400">localhost:{localPort()}</span> → <span class="font-mono text-green-400">{selectedPod()?.name}:{remotePort()}</span>
          </div>
          <div class="flex gap-3 pt-1">
            <button onClick={() => setShowPortForward(false)} class="btn-secondary flex-1 px-4 py-2 text-sm">Cancel</button>
            <button onClick={startPortForward} class="btn-primary flex-1 px-4 py-2 text-sm">Start</button>
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

      {/* Edit YAML Modal */}
      <Modal isOpen={showEdit()} onClose={() => setShowEdit(false)} title={`Edit YAML: ${selectedPod()?.name}`} size="xl">
        <Show when={!yamlContent.loading} fallback={<div class="flex items-center justify-center p-8">Loading...</div>}>
          <div style={{ height: '70vh' }}>
            <Show when={selectedPod()}>
              {(pod) => (
                <CommandPreview
                  label="Equivalent kubectl command"
                  defaultCollapsed={true}
                  command={`kubectl apply -f - -n ${pod().namespace || 'default'}  # YAML from editor is sent via Kubernetes API`}
                  description="This is an equivalent kubectl-style view of the Pod update. The actual change is applied via Kubernetes API."
                />
              )}
            </Show>
            <YAMLEditor
              yaml={yamlContent() || ''}
              title={selectedPod()?.name}
              onSave={handleSaveYAML}
              onDryRun={handleDryRunYAML}
              onCancel={() => setShowEdit(false)}
            />
          </div>
        </Show>
      </Modal>

      {/* Explain Pod Modal */}
      <Modal 
        isOpen={showExplain()} 
        onClose={() => { setShowExplain(false); setExplainData(null); setExplainError(null); }} 
        title={`🧠 Explain Pod: ${selectedPod()?.name}`} 
        size="lg"
      >
        <div style={{ 'max-height': '70vh', 'overflow-y': 'auto' }}>
          <Show when={explainLoading()}>
            <div style={{
              display: 'flex',
              'align-items': 'center',
              'justify-content': 'center',
              padding: '40px',
              color: 'var(--text-secondary)'
            }}>
              <div class="spinner" style={{ 'margin-right': '12px' }} />
              Analyzing pod...
            </div>
          </Show>

          <Show when={explainError()}>
            <div style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              'border-radius': '8px',
              padding: '16px',
              color: 'var(--error-color)'
            }}>
              <strong>Error:</strong> {explainError()}
            </div>
          </Show>

          <Show when={explainData() && !explainLoading()}>
            {/* Summary */}
            <div style={{
              background: 'var(--bg-secondary)',
              'border-radius': '8px',
              padding: '16px',
              'margin-bottom': '16px'
            }}>
              <h4 style={{ margin: '0 0 8px', color: 'var(--accent-primary)', 'font-size': '14px' }}>
                📋 Summary
              </h4>
              <p style={{ margin: 0, color: 'var(--text-primary)', 'font-size': '13px', 'line-height': '1.5' }}>
                {explainData()?.Summary || 'No summary available'}
              </p>
            </div>

            {/* Key Findings */}
            <Show when={explainData()?.KeyFindings && explainData()?.KeyFindings.length > 0}>
              <div style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                'border-radius': '8px',
                padding: '16px',
                'margin-bottom': '16px'
              }}>
                <h4 style={{ margin: '0 0 12px', color: 'var(--text-primary)', 'font-size': '14px' }}>
                  🔍 Key Findings
                </h4>
                <ul style={{ margin: 0, 'padding-left': '20px' }}>
                  <For each={explainData()?.KeyFindings || []}>
                    {(finding: string) => (
                      <li style={{ 
                        'font-size': '13px', 
                        color: 'var(--text-secondary)', 
                        'margin-bottom': '6px',
                        'line-height': '1.4'
                      }}>
                        {finding}
                      </li>
                    )}
                  </For>
                </ul>
              </div>
            </Show>

            {/* Timeline */}
            <Show when={explainData()?.Timeline && explainData()?.Timeline.length > 0}>
              <div style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                'border-radius': '8px',
                padding: '16px'
              }}>
                <h4 style={{ margin: '0 0 12px', color: 'var(--text-primary)', 'font-size': '14px' }}>
                  🕐 Timeline
                </h4>
                <div style={{
                  'max-height': '300px',
                  'overflow-y': 'auto',
                  background: 'var(--bg-secondary)',
                  'border-radius': '6px',
                  padding: '12px',
                  'font-family': 'monospace',
                  'font-size': '11px',
                  'line-height': '1.6'
                }}>
                  <For each={explainData()?.Timeline || []}>
                    {(event: string, index) => (
                      <div style={{ 
                        color: event.includes('Error') || event.includes('Failed') ? 'var(--error-color)' :
                               event.includes('Warning') ? 'var(--warning-color)' :
                               'var(--text-secondary)',
                        'padding-bottom': '4px',
                        'border-bottom': index() < (explainData()?.Timeline.length - 1) ? '1px dashed var(--border-color)' : 'none',
                        'margin-bottom': '4px'
                      }}>
                        {event}
                      </div>
                    )}
                  </For>
                </div>
              </div>
            </Show>
          </Show>
        </div>
      </Modal>

      {/* Bulk Delete Modal */}
      <BulkDeleteModal
        isOpen={showBulkDeleteModal()}
        onClose={() => setShowBulkDeleteModal(false)}
        resourceType="Pods"
        selectedItems={selectedItemsForModal()}
        onConfirm={async () => {
          const selectedPods = selectedItemsForModal();

          // Delete each pod
          for (const pod of selectedPods) {
            try {
              await api.deletePod(pod.name, pod.namespace);
            } catch (error) {
              console.error(`Failed to delete pod ${pod.namespace}/${pod.name}:`, error);
              addNotification(
                `Failed to delete pod ${pod.name}: ${error instanceof Error ? error.message : 'Unknown error'}`,
                'error'
              );
            }
          }

          // Clear selection and refetch
          bulk.deselectAll();
          podsCache.refetch();

          // Show success notification
          addNotification(
            `Successfully deleted ${selectedPods.length} pod${selectedPods.length !== 1 ? 's' : ''}`,
            'success'
          );
        }}
      />
    </div>
  );
};

export default Pods;
