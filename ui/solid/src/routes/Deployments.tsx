import { Component, For, Show, createMemo, createSignal, createResource, onMount, createEffect } from 'solid-js';
import { api } from '../services/api';
import { clusterStatus } from '../stores/cluster';
import { addNotification, setCurrentView } from '../stores/ui';
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
import Modal from '../components/Modal';
import YAMLViewer from '../components/YAMLViewer';
import YAMLEditor from '../components/YAMLEditor';
import DescribeModal from '../components/DescribeModal';
import ConfirmationModal from '../components/ConfirmationModal';
import ActionMenu from '../components/ActionMenu';
import { BulkActions, SelectionCheckbox, SelectAllCheckbox } from '../components/BulkActions';
import { BulkDeleteModal } from '../components/BulkDeleteModal';
import { useBulkSelection } from '../hooks/useBulkSelection';
import { startExecution } from '../stores/executionPanel';
import CommandPreview from '../components/CommandPreview';
import RelatedResources from '../components/RelatedResources';

interface Deployment {
  name: string;
  namespace: string;
  ready: string;
  upToDate: number;
  available: number;
  age: string;
  replicas: number;
}

type SortField = 'name' | 'namespace' | 'ready' | 'age';
type SortDirection = 'asc' | 'desc';

const Deployments: Component = () => {
  // Use global search query instead of local search
  const [sortField, setSortField] = createSignal<SortField>('name');
  const [sortDirection, setSortDirection] = createSignal<SortDirection>('asc');
  const [currentPage, setCurrentPage] = createSignal(1);
  const [pageSize, setPageSize] = createSignal(20);
  const [selected, setSelected] = createSignal<Deployment | null>(null);
  const [showYaml, setShowYaml] = createSignal(false);
  const [showEdit, setShowEdit] = createSignal(false);
  const [yamlKey, setYamlKey] = createSignal<string | null>(null);
  const [showDescribe, setShowDescribe] = createSignal(false);
  const [showDetails, setShowDetails] = createSignal(false);
  const [showScale, setShowScale] = createSignal(false);
  const [scaleReplicas, setScaleReplicas] = createSignal(1);
  const [restarting, setRestarting] = createSignal<string | null>(null); // Track which deployment is restarting
  const [showDeleteConfirm, setShowDeleteConfirm] = createSignal(false);
  const [deleting, setDeleting] = createSignal(false);

  // Bulk selection
  const bulk = useBulkSelection<Deployment>();
  const [showBulkDeleteModal, setShowBulkDeleteModal] = createSignal(false);

  // Focus handling from URL params
  const [focusedDeployment, setFocusedDeployment] = createSignal<string | null>(null);
  const [focusedRowRef, setFocusedRowRef] = createSignal<HTMLTableRowElement | null>(null);
  const [previousNamespaces, setPreviousNamespaces] = createSignal<string[] | null>(null); // Store previous selection
  
  // Read URL params on mount and when they change
  onMount(() => {
    const params = new URLSearchParams(window.location.search);
    const focusName = params.get('focus');
    const focusNamespace = params.get('namespace');
    
    // Apply namespace filter if provided (but store previous selection to restore later)
    if (focusNamespace) {
      const current = selectedNamespaces();
      setPreviousNamespaces(current.length > 0 ? [...current] : null);
      setNamespaces([focusNamespace]);
      // Mark that namespace was set programmatically
      sessionStorage.setItem('kubegraf:namespaceSetProgrammatically', 'true');
    }
    
    // Set focus target
    if (focusName) {
      setFocusedDeployment(focusName);
    }
  });

  // Handle focus after deployments are loaded
  createEffect(() => {
    const focusName = focusedDeployment();
    const allDeps = filteredAndSorted();
    
    if (focusName && allDeps.length > 0) {
      // Find the deployment in filtered list
      const dep = allDeps.find(d => d.name === focusName);
      if (dep) {
        // Navigate to the correct page if needed
        const depIndex = allDeps.findIndex(d => d.name === focusName);
        if (depIndex >= 0) {
          const targetPage = Math.floor(depIndex / pageSize()) + 1;
          if (targetPage !== currentPage()) {
            setCurrentPage(targetPage);
            // Wait for page to update before focusing
            setTimeout(() => focusDeployment(dep), 200);
            return;
          }
        }
        
        focusDeployment(dep);
      }
    }
  });

  const focusDeployment = (dep: Deployment) => {
    // Set as selected and open details
    setSelected(dep);
    setShowDetails(true);
    
    // Show notification
    addNotification(`Viewing Deployment: ${dep.name}`, 'success');
    
    // Scroll to row after a short delay to ensure DOM is ready
    setTimeout(() => {
      const row = focusedRowRef();
      if (row) {
        row.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
    
    // Clear focus after highlighting
    setTimeout(() => {
      setFocusedDeployment(null);
      // Clean up URL params
      const url = new URL(window.location.href);
      url.searchParams.delete('focus');
      const hadNamespaceParam = url.searchParams.has('namespace');
      url.searchParams.delete('namespace');
      window.history.replaceState({}, '', url.toString());
      
      // Restore previous namespace selection if it was set programmatically
      if (hadNamespaceParam) {
        const previous = previousNamespaces();
        if (previous !== null) {
          setNamespaces(previous);
        } else {
          // If there was no previous selection, clear to show all namespaces
          setNamespaces([]);
        }
        setPreviousNamespaces(null);
        // Clear the programmatic flag
        sessionStorage.removeItem('kubegraf:namespaceSetProgrammatically');
      }
    }, 2000);
  };

  // Font size selector with localStorage persistence
  const getInitialFontSize = (): number => {
    const saved = localStorage.getItem('deployments-font-size');
    return saved ? parseInt(saved) : 14;
  };
  const [fontSize, setFontSize] = createSignal(getInitialFontSize());

  const handleFontSizeChange = (size: number) => {
    setFontSize(size);
    localStorage.setItem('deployments-font-size', size.toString());
  };

  // Font family selector with localStorage persistence
  const getInitialFontFamily = (): string => {
    const saved = localStorage.getItem('deployments-font-family');
    return saved || 'Monaco';
  };
  const [fontFamily, setFontFamily] = createSignal(getInitialFontFamily());

  const handleFontFamilyChange = (family: string) => {
    setFontFamily(family);
    localStorage.setItem('deployments-font-family', family);
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
  const deploymentsCache = createCachedResource<Deployment[]>(
    'deployments',
    async () => {
      setGlobalLoading(true);
      try {
        const namespaceParam = getNamespaceParam();
        const deployments = await api.getDeployments(namespaceParam);
        return deployments;
      } finally {
        setGlobalLoading(false);
      }
    },
    {
      ttl: 15000, // 15 seconds
      backgroundRefresh: true,
    }
  );

  // Get deployments from cache
  const deployments = createMemo(() => deploymentsCache.data() || []);

  // Lightweight silent polling (2s) while page is open
  createEffect(() => {
    const interval = setInterval(() => {
      deploymentsCache.refetch();
    }, 2000);
    return () => clearInterval(interval);
  });
  const [yamlContent] = createResource(
    () => yamlKey(),
    async (key) => {
      if (!key) return '';
      const [name, ns] = key.split('|');
      if (!name || !ns) return '';
      try {
        const data = await api.getDeploymentYAML(name, ns);
        return data.yaml || '';
      } catch (error) {
        console.error('Failed to fetch deployment YAML:', error);
        addNotification(`Failed to load YAML: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
        return '';
      }
    }
  );

  const handleSaveYAML = async (yaml: string) => {
    const dep = selected();
    if (!dep) return;

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
      label: `Apply Deployment YAML: ${dep.name}`,
      command: '__k8s-apply-yaml',
      args: [],
      mode: 'apply',
      kubernetesEquivalent: true,
      namespace: dep.namespace,
      context: status.context,
      userAction: 'deployments-apply-yaml',
      dryRun: false,
      allowClusterWide: false,
      resource: 'deployments',
      action: 'update',
      intent: 'apply-yaml',
      yaml: trimmed,
    });

    // Close the editor once the execution has been started; the ExecutionPanel
    // now owns the UX for tracking success/failure.
    setShowEdit(false);
    setSelected(null);
    setYamlKey(null);

    // Trigger a background refetch after a short delay so the table reflects
    // any changes from the apply.
    setTimeout(() => deploymentsCache.refetch(), 1500);
  };

  const handleDryRunYAML = async (yaml: string) => {
    const dep = selected();
    if (!dep) return;

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
      label: `Dry run Deployment YAML: ${dep.name}`,
      command: '__k8s-apply-yaml',
      args: [],
      mode: 'dry-run',
      kubernetesEquivalent: true,
      namespace: dep.namespace,
      context: status.context,
      userAction: 'deployments-apply-yaml-dry-run',
      dryRun: true,
      allowClusterWide: false,
      resource: 'deployments',
      action: 'update',
      intent: 'apply-yaml',
      yaml: trimmed,
    });
  };

  // Parse age for sorting
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

  const filteredAndSorted = createMemo(() => {
    let all = deployments() || [];
    const query = searchQuery().toLowerCase();

    // Filter by search
    if (query) {
      all = all.filter((d: Deployment) =>
        d.name.toLowerCase().includes(query) ||
        d.namespace.toLowerCase().includes(query)
      );
    }

    // Sort
    const field = sortField();
    const direction = sortDirection();
    all = [...all].sort((a: Deployment, b: Deployment) => {
      let comparison = 0;
      switch (field) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'namespace':
          comparison = a.namespace.localeCompare(b.namespace);
          break;
        case 'ready':
          comparison = a.ready.localeCompare(b.ready);
          break;
        case 'age':
          comparison = parseAge(a.age) - parseAge(b.age);
          break;
      }
      return direction === 'asc' ? comparison : -comparison;
    });

    return all;
  });

  // Pagination
  const totalPages = createMemo(() => Math.ceil(filteredAndSorted().length / pageSize()));
  const paginatedDeployments = createMemo(() => {
    const start = (currentPage() - 1) * pageSize();
    return filteredAndSorted().slice(start, start + pageSize());
  });

  const statusCounts = createMemo(() => {
    const all = deployments() || [];
    return {
      total: all.length,
      ready: all.filter((d: Deployment) => {
        const parts = d.ready?.split('/') || ['0', '0'];
        return parts[0] === parts[1] && parseInt(parts[0]) > 0;
      }).length,
      partial: all.filter((d: Deployment) => {
        const parts = d.ready?.split('/') || ['0', '0'];
        return parts[0] !== parts[1] && parseInt(parts[0]) > 0;
      }).length,
      unavailable: all.filter((d: Deployment) => {
        const parts = d.ready?.split('/') || ['0', '0'];
        return parseInt(parts[0]) === 0;
      }).length,
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

  const restart = async (dep: Deployment) => {
    const deploymentKey = `${dep.namespace}/${dep.name}`;
    setRestarting(deploymentKey);
    try {
      const result = await api.restartDeployment(dep.name, dep.namespace);
      if (result?.success) {
        addNotification(`✅ Deployment ${dep.name} restart initiated - pods will restart shortly`, 'success');
      } else {
        addNotification(`⚠️ Restart initiated but may not have completed: ${result?.message || 'Unknown status'}`, 'warning');
      }
      // Refetch multiple times to see the restart progress
      setTimeout(() => deploymentsCache.refetch(), 500);
      setTimeout(() => deploymentsCache.refetch(), 2000);
      setTimeout(() => deploymentsCache.refetch(), 5000);
    } catch (error) {
      console.error('Failed to restart deployment:', error);
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      addNotification(`❌ Failed to restart deployment ${dep.name}: ${errorMsg}`, 'error');
    } finally {
      setTimeout(() => setRestarting(null), 2000); // Clear loading state after 2 seconds
    }
  };

  const scale = async () => {
    const dep = selected();
    if (!dep) return;
    try {
      const result = await api.scaleDeployment(dep.name, dep.namespace, scaleReplicas());
      if (result?.success) {
        addNotification(`✅ Deployment ${dep.name} scaled to ${scaleReplicas()} replicas`, 'success');
      } else {
        addNotification(`⚠️ Scale may not have completed: ${result?.message || 'Unknown status'}`, 'warning');
      }
      setShowScale(false);
      setTimeout(() => deploymentsCache.refetch(), 500);
      setTimeout(() => deploymentsCache.refetch(), 2000);
    } catch (error) {
      console.error('Failed to scale deployment:', error);
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      addNotification(`❌ Failed to scale deployment: ${errorMsg}`, 'error');
    }
  };

  const handleDeleteConfirm = async () => {
    const dep = selected();
    if (!dep) return;
    
    setDeleting(true);
    try {
      await api.deleteDeployment(dep.name, dep.namespace);
      addNotification(`Deployment ${dep.name} deleted successfully`, 'success');
      deploymentsCache.refetch();
      setSelected(null);
      setShowDeleteConfirm(false);
      setShowDetails(false);
      setSelected(null);
    } catch (error) {
      console.error('Failed to delete deployment:', error);
      addNotification(`Failed to delete deployment: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    } finally {
      setDeleting(false);
    }
  };

  const deleteDeployment = (dep: Deployment) => {
    // Ensure the deployment is selected before showing the modal
    setSelected(dep);
    // Show confirmation modal - don't close details modal yet
    setShowDeleteConfirm(true);
  };

  const openScale = (dep: Deployment) => {
    setSelected(dep);
    const parts = dep.ready?.split('/') || ['1', '1'];
    setScaleReplicas(parseInt(parts[1]) || 1);
    setShowScale(true);
  };

  return (
    <div class="space-y-2 max-w-full -mt-4">
      {/* Bulk Actions */}
      <BulkActions
        selectedCount={bulk.selectedCount()}
        totalCount={filteredAndSorted().length}
        onSelectAll={() => bulk.selectAll(filteredAndSorted())}
        onDeselectAll={() => bulk.deselectAll()}
        onDelete={() => setShowBulkDeleteModal(true)}
        resourceType="deployments"
      />

      {/* Header - reduced size */}
      <div class="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 class="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Deployments</h1>
          <p class="text-xs" style={{ color: 'var(--text-secondary)' }}>Manage application deployments</p>
        </div>
        <div class="flex items-center gap-3">
          <button
            onClick={(e) => {
              const btn = e.currentTarget;
              btn.classList.add('refreshing');
              setTimeout(() => btn.classList.remove('refreshing'), 500);
              deploymentsCache.refetch();
            }}
            class="icon-btn"
            style={{ background: 'var(--bg-secondary)' }}
            title="Refresh Deployments"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {/* Related Resources Section - Show when deployment is selected */}
      <Show when={selected()}>
        {(dep) => (
          <div class="p-4 rounded-lg border mb-4" style={{ background: 'var(--bg-secondary)', 'border-color': 'var(--border-color)' }}>
            <RelatedResources namespace={dep().namespace} kind="deployment" name={dep().name} />
          </div>
        )}
      </Show>

      {/* Status summary */}
      <div class="flex flex-wrap items-center gap-3">
        <div class="card px-4 py-2 cursor-pointer hover:opacity-80 flex items-center gap-2" style={{ 'border-left': '3px solid var(--accent-primary)' }}>
          <span style={{ color: 'var(--text-secondary)' }} class="text-sm">Total</span>
          <span class="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{statusCounts().total}</span>
        </div>
        <div class="card px-4 py-2 cursor-pointer hover:opacity-80 flex items-center gap-2" style={{ 'border-left': '3px solid var(--success-color)' }}>
          <span style={{ color: 'var(--text-secondary)' }} class="text-sm">Ready</span>
          <span class="text-xl font-bold" style={{ color: 'var(--success-color)' }}>{statusCounts().ready}</span>
        </div>
        <div class="card px-4 py-2 cursor-pointer hover:opacity-80 flex items-center gap-2" style={{ 'border-left': '3px solid var(--warning-color)' }}>
          <span style={{ color: 'var(--text-secondary)' }} class="text-sm">Partial</span>
          <span class="text-xl font-bold" style={{ color: 'var(--warning-color)' }}>{statusCounts().partial}</span>
        </div>
        <div class="card px-4 py-2 cursor-pointer hover:opacity-80 flex items-center gap-2" style={{ 'border-left': '3px solid var(--error-color)' }}>
          <span style={{ color: 'var(--text-secondary)' }} class="text-sm">Unavailable</span>
          <span class="text-xl font-bold" style={{ color: 'var(--error-color)' }}>{statusCounts().unavailable}</span>
        </div>

        <div class="flex-1" />

        {/* Bulk Actions - Only show when a single namespace is selected */}
        <Show when={getNamespaceParam() && getNamespaceParam() !== '_all' && getNamespaceParam() !== 'All Namespaces'}>
          <div class="flex items-center gap-2">
            <button
              onClick={async () => {
                const ns = getNamespaceParam();
                if (!ns || !confirm(`Are you sure you want to restart ALL deployments in namespace "${ns}"?`)) return;
                try {
                  const result = await api.bulkRestartDeployments(ns);
                  if (result?.success) {
                    addNotification(`✅ Restarted ${result.restarted?.length || 0}/${result.total || 0} deployments in ${ns}`, 'success');
                    if (result.failed && result.failed.length > 0) {
                      addNotification(`⚠️ ${result.failed.length} deployments failed to restart`, 'warning');
                    }
                  }
                  setTimeout(() => deploymentsCache.refetch(), 1000);
                } catch (error) {
                  addNotification(`❌ Failed to restart deployments: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
                }
              }}
              class="px-3 py-2 rounded-lg text-sm font-medium"
              style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
              title="Restart All Deployments in Namespace"
            >
              🔄 Restart All
            </button>
            <button
              onClick={async () => {
                const ns = getNamespaceParam();
                if (!ns || !confirm(`⚠️ DANGER: Are you sure you want to DELETE ALL deployments in namespace "${ns}"? This cannot be undone!`)) return;
                if (!confirm(`This will delete ALL ${deployments().filter((d: Deployment) => d.namespace === ns).length} deployments in "${ns}". Type the namespace name to confirm:`) || prompt('Type namespace name to confirm:') !== ns) return;
                try {
                  const result = await api.bulkDeleteDeployments(ns);
                  if (result?.success) {
                    addNotification(`✅ Deleted ${result.deleted?.length || 0}/${result.total || 0} deployments in ${ns}`, 'success');
                    if (result.failed && result.failed.length > 0) {
                      addNotification(`⚠️ ${result.failed.length} deployments failed to delete`, 'warning');
                    }
                  }
                  setTimeout(() => deploymentsCache.refetch(), 1000);
                } catch (error) {
                  addNotification(`❌ Failed to delete deployments: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
                }
              }}
              class="px-3 py-2 rounded-lg text-sm font-medium"
              style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)' }}
              title="Delete All Deployments in Namespace"
            >
              🗑️ Delete All
            </button>
          </div>
        </Show>

        {/* Font Size Selector */}
        <select
          value={fontSize()}
          onChange={(e) => handleFontSizeChange(parseInt(e.currentTarget.value))}
          class="px-3 py-2 rounded-lg text-sm"
          style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
          title="Font Size"
        >
          <option value="12">12px</option>
          <option value="14">14px</option>
          <option value="16">16px</option>
          <option value="18">18px</option>
          <option value="20">20px</option>
        </select>

        {/* Font Family Selector */}
        <select
          value={fontFamily()}
          onChange={(e) => handleFontFamilyChange(e.currentTarget.value)}
          class="px-3 py-2 rounded-lg text-sm"
          style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
          title="Font Family"
        >
          <option value="Monospace">Monospace</option>
          <option value="System-ui">System-ui</option>
          <option value="Monaco">Monaco</option>
          <option value="Consolas">Consolas</option>
          <option value="Courier">Courier</option>
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

      {/* Deployments table */}
      <div class="w-full" style={{ background: 'var(--bg-primary)', margin: '0', padding: '0', border: '1px solid var(--border-color)', 'border-radius': '4px' }}>
        <Show
          when={!deploymentsCache.loading() || deploymentsCache.data() !== undefined}
          fallback={
            <div class="p-8 text-center">
              <div class="spinner mx-auto mb-2" />
              <span style={{ color: 'var(--text-muted)' }}>Loading deployments...</span>
            </div>
          }
        >
          <div class="w-full overflow-x-auto" style={{ margin: '0', padding: '0' }}>
            <table
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
                  <th class="whitespace-nowrap" style={{
                    padding: '0 8px',
                    'text-align': 'center',
                    width: '40px',
                    border: 'none'
                  }}>
                    <SelectAllCheckbox
                      checked={bulk.selectedCount() === filteredAndSorted().length && filteredAndSorted().length > 0}
                      indeterminate={bulk.selectedCount() > 0 && bulk.selectedCount() < filteredAndSorted().length}
                      onChange={(checked) => {
                        if (checked) {
                          bulk.selectAll(filteredAndSorted());
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
                  <th class="cursor-pointer select-none whitespace-nowrap" onClick={() => handleSort('namespace')} style={{
                    padding: '0 8px',
                    'text-align': 'left',
                    'font-weight': '900',
                    color: '#0ea5e9',
                    'font-size': `${fontSize()}px`,
                    border: 'none'
                  }}>
                    <div class="flex items-center gap-1">Namespace <SortIcon field="namespace" /></div>
                  </th>
                  <th class="cursor-pointer select-none whitespace-nowrap" onClick={() => handleSort('ready')} style={{
                    padding: '0 8px',
                    'text-align': 'left',
                    'font-weight': '900',
                    color: '#0ea5e9',
                    'font-size': `${fontSize()}px`,
                    border: 'none'
                  }}>
                    <div class="flex items-center gap-1">Ready <SortIcon field="ready" /></div>
                  </th>
                  <th class="whitespace-nowrap" style={{
                    padding: '0 8px',
                    'text-align': 'left',
                    'font-weight': '900',
                    color: '#0ea5e9',
                    'font-size': `${fontSize()}px`,
                    border: 'none'
                  }}>Up-to-date</th>
                  <th class="whitespace-nowrap" style={{
                    padding: '0 8px',
                    'text-align': 'left',
                    'font-weight': '900',
                    color: '#0ea5e9',
                    'font-size': `${fontSize()}px`,
                    border: 'none'
                  }}>Available</th>
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
                <For each={paginatedDeployments()} fallback={
                  <tr><td colspan="8" class="text-center py-8" style={{ color: 'var(--text-muted)' }}>No deployments found</td></tr>
                }>
                  {(dep: Deployment) => {
                    const textColor = '#0ea5e9';
                    const isFocused = () => focusedDeployment() === dep.name;
                    
                    return (
                    <tr
                      ref={(el) => {
                        if (el && isFocused()) {
                          setFocusedRowRef(el);
                        }
                      }}
                      style={{
                        ...(isFocused() ? {
                          background: 'rgba(14, 165, 233, 0.15)',
                          'border-left': '3px solid #0ea5e9',
                          transition: 'background 0.3s ease, border-left 0.3s ease',
                        } : {}),
                      }}
                    >
                      <td style={{
                        padding: '0 8px',
                        'text-align': 'center',
                        width: '40px',
                        border: 'none'
                      }}>
                        <SelectionCheckbox
                          checked={bulk.isSelected(dep)}
                          onChange={() => bulk.toggleSelection(dep)}
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
                        <button
                          onClick={() => { setSelected(dep); setShowDetails(true); }}
                          class="font-medium hover:underline text-left"
                          style={{ color: 'var(--accent-primary)' }}
                        >
                          {dep.name.length > 40 ? dep.name.slice(0, 37) + '...' : dep.name}
                        </button>
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
                      }}>{dep.namespace}</td>
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
                        <span class={`badge ${
                          dep.ready.split('/')[0] === dep.ready.split('/')[1] ? 'badge-success' : 'badge-warning'
                        }`}>
                          {dep.ready}
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
                      }}>{dep.upToDate}</td>
                      <td style={{
                        padding: '0 8px',
                        'text-align': 'left',
                        color: textColor,
                        'font-weight': '900',
                        'font-size': `${fontSize()}px`,
                        height: `${Math.max(24, fontSize() * 1.7)}px`,
                        'line-height': `${Math.max(24, fontSize() * 1.7)}px`,
                        border: 'none'
                      }}>{dep.available}</td>
                      <td style={{
                        padding: '0 8px',
                        'text-align': 'left',
                        color: textColor,
                        'font-weight': '900',
                        'font-size': `${fontSize()}px`,
                        height: `${Math.max(24, fontSize() * 1.7)}px`,
                        'line-height': `${Math.max(24, fontSize() * 1.7)}px`,
                        border: 'none'
                      }}>{dep.age}</td>
                      <td style={{
                        padding: '0 8px',
                        'text-align': 'left',
                        height: `${Math.max(24, fontSize() * 1.7)}px`,
                        'line-height': `${Math.max(24, fontSize() * 1.7)}px`,
                        border: 'none'
                      }}>
                        <ActionMenu
                          actions={[
                            { label: 'Scale', icon: 'scale', onClick: () => openScale(dep) },
                            {
                              label: 'Restart',
                              icon: 'restart',
                              onClick: () => restart(dep),
                              loading: restarting() === `${dep.namespace}/${dep.name}`
                            },
                            { label: 'View YAML', icon: 'yaml', onClick: () => { 
                              setSelected(dep);
                              setYamlKey(`${dep.name}|${dep.namespace}`);
                              setShowYaml(true);
                            } },
                            { label: 'Edit YAML', icon: 'edit', onClick: () => { 
                              setSelected(dep);
                              setYamlKey(`${dep.name}|${dep.namespace}`);
                              setShowEdit(true);
                            } },
                            { label: 'Delete', icon: 'delete', onClick: () => deleteDeployment(dep), variant: 'danger', divider: true },
                          ]}
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
          <Show when={totalPages() > 1 || filteredAndSorted().length > 0}>
            <div class="flex items-center justify-between p-4 font-mono text-sm" style={{ background: 'var(--bg-secondary)', borderTop: '1px solid var(--border-color)' }}>
              <div style={{ color: 'var(--text-secondary)' }}>
                Showing {((currentPage() - 1) * pageSize()) + 1} - {Math.min(currentPage() * pageSize(), filteredAndSorted().length)} of {filteredAndSorted().length} deployments
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
                  <option value="200">200 per page</option>
                </select>
              </div>
            </div>
          </Show>
        </Show>
      </div>

      {/* YAML Modal */}
      <Modal isOpen={showYaml()} onClose={() => { setShowYaml(false); setSelected(null); setYamlKey(null); }} title={`YAML: ${selected()?.name || ''}`} size="xl">
        <Show 
          when={!yamlContent.loading && yamlContent()} 
          fallback={
            <div class="flex items-center justify-center p-8">
              <div class="spinner mx-auto" />
              <span class="ml-3" style={{ color: 'var(--text-secondary)' }}>Loading YAML...</span>
            </div>
          }
        >
          <YAMLViewer yaml={yamlContent() || ''} title={selected()?.name} />
        </Show>
      </Modal>

      {/* Edit YAML Modal */}
      <Modal isOpen={showEdit()} onClose={() => { setShowEdit(false); setSelected(null); setYamlKey(null); }} title={`Edit YAML: ${selected()?.name || ''}`} size="xl">
        <Show 
          when={!yamlContent.loading && yamlContent()} 
          fallback={
            <div class="flex items-center justify-center p-8">
              <div class="spinner mx-auto" />
              <span class="ml-3" style={{ color: 'var(--text-secondary)' }}>Loading YAML...</span>
            </div>
          }
        >
          <div style={{ height: '70vh' }}>
            <Show when={selected()}>
              {(dep) => (
                <CommandPreview
                  label="Equivalent kubectl command"
                  defaultCollapsed={true}
                  command={`kubectl apply -f - -n ${dep().namespace || 'default'}  # YAML from editor is sent via Kubernetes API`}
                  description="This is an equivalent kubectl-style representation of what will be applied. The actual operation uses the Kubernetes API with your current context and namespace."
                />
              )}
            </Show>
            <YAMLEditor
              yaml={yamlContent() || ''}
              title={selected()?.name}
              onSave={handleSaveYAML}
              onDryRun={handleDryRunYAML}
              onCancel={() => { setShowEdit(false); setSelected(null); setYamlKey(null); }}
            />
          </div>
        </Show>
      </Modal>

      {/* Details Modal */}
      <Modal isOpen={showDetails()} onClose={() => {
        setShowDetails(false);
        // Check if we came from another view (e.g., pods) and restore it
        const urlParams = new URLSearchParams(window.location.search);
        const returnView = urlParams.get('returnView');
        if (returnView) {
          // Remove returnView from URL
          urlParams.delete('returnView');
          const newUrl = new URL(window.location.href);
          newUrl.search = urlParams.toString();
          window.history.replaceState({}, '', newUrl.toString());
          // Restore the previous view
          setCurrentView(returnView as any);
        }
      }} title={`Deployment: ${selected()?.name || ''}`} size="xl">
        <Show when={selected()}>
          {(() => {
            const [deploymentDetails] = createResource(
              () => selected() ? { name: selected()!.name, ns: selected()!.namespace } : null,
              async (params) => {
                if (!params) return null;
                return api.getDeploymentDetails(params.name, params.ns);
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
                      <div>
                        <Show when={!deploymentDetails.loading && deploymentDetails()}>
                          {(details) => {
                            const readyParts = details().ready?.split('/') || ['0', '0'];
                            const isReady = readyParts[0] === readyParts[1] && parseInt(readyParts[0]) > 0;
                            return (
                              <span class={`badge ${isReady ? 'badge-success' : 'badge-warning'}`}>
                                {details().ready || selected()?.ready || '-'}
                              </span>
                            );
                          }}
                        </Show>
                        <Show when={deploymentDetails.loading}>
                          <div class="spinner" style={{ width: '16px', height: '16px' }} />
                        </Show>
                      </div>
                    </div>
                    <div class="p-3 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
                      <div class="text-xs" style={{ color: 'var(--text-muted)' }}>Available</div>
                      <div style={{ color: 'var(--text-primary)' }}>
                        <Show when={!deploymentDetails.loading && deploymentDetails()}>
                          {(details) => details().available || selected()?.available || '-'}
                        </Show>
                        <Show when={deploymentDetails.loading}>
                          <div class="spinner" style={{ width: '16px', height: '16px' }} />
                        </Show>
                      </div>
                    </div>
                    <div class="p-3 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
                      <div class="text-xs" style={{ color: 'var(--text-muted)' }}>Updated</div>
                      <div style={{ color: 'var(--text-primary)' }}>
                        <Show when={!deploymentDetails.loading && deploymentDetails()}>
                          {(details) => details().updated || selected()?.upToDate || '-'}
                        </Show>
                        <Show when={deploymentDetails.loading}>
                          <div class="spinner" style={{ width: '16px', height: '16px' }} />
                        </Show>
                      </div>
                    </div>
                    <div class="p-3 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
                      <div class="text-xs" style={{ color: 'var(--text-muted)' }}>Replicas</div>
                      <div style={{ color: 'var(--text-primary)' }}>
                        <Show when={!deploymentDetails.loading && deploymentDetails()}>
                          {(details) => details().replicas || selected()?.replicas || '-'}
                        </Show>
                        <Show when={deploymentDetails.loading}>
                          <div class="spinner" style={{ width: '16px', height: '16px' }} />
                        </Show>
                      </div>
                    </div>
                    <div class="p-3 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
                      <div class="text-xs" style={{ color: 'var(--text-muted)' }}>Strategy</div>
                      <div style={{ color: 'var(--text-primary)' }}>
                        <Show when={!deploymentDetails.loading && deploymentDetails()}>
                          {(details) => details().strategy || '-'}
                        </Show>
                        <Show when={deploymentDetails.loading}>
                          <div class="spinner" style={{ width: '16px', height: '16px' }} />
                        </Show>
                      </div>
                    </div>
                    <div class="p-3 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
                      <div class="text-xs" style={{ color: 'var(--text-muted)' }}>Age</div>
                      <div style={{ color: 'var(--text-primary)' }}>{selected()?.age || '-'}</div>
                    </div>
                    <div class="p-3 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
                      <div class="text-xs" style={{ color: 'var(--text-muted)' }}>Namespace</div>
                      <div style={{ color: 'var(--text-primary)' }}>{selected()?.namespace}</div>
                    </div>
                    <div class="p-3 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
                      <div class="text-xs" style={{ color: 'var(--text-muted)' }}>Selector</div>
                      <div style={{ color: 'var(--text-primary)' }} class="text-xs break-all">
                        <Show when={!deploymentDetails.loading && deploymentDetails()}>
                          {(details) => details().selector || '-'}
                        </Show>
                        <Show when={deploymentDetails.loading}>
                          <div class="spinner" style={{ width: '16px', height: '16px' }} />
                        </Show>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ReplicaSets */}
                <Show when={!deploymentDetails.loading && deploymentDetails()?.replicaSets && deploymentDetails()!.replicaSets.length > 0}>
                  <div>
                    <h3 class="text-sm font-semibold mb-3" style={{ color: 'var(--text-secondary)' }}>ReplicaSets</h3>
                    <div class="rounded-lg border overflow-x-auto" style={{ 'border-color': 'var(--border-color)', background: 'var(--bg-secondary)' }}>
                      <table class="w-full">
                        <thead>
                          <tr style={{ background: 'var(--bg-tertiary)' }}>
                            <th class="px-4 py-2 text-left text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Name</th>
                            <th class="px-4 py-2 text-left text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Ready</th>
                            <th class="px-4 py-2 text-left text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Replicas</th>
                            <th class="px-4 py-2 text-left text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Age</th>
                          </tr>
                        </thead>
                        <tbody>
                          <For each={deploymentDetails()!.replicaSets}>
                            {(rs: any) => (
                              <tr class="border-b" style={{ 'border-color': 'var(--border-color)' }}>
                                <td class="px-4 py-2 text-sm" style={{ color: 'var(--text-primary)' }}>{rs.name}</td>
                                <td class="px-4 py-2 text-sm" style={{ color: 'var(--text-primary)' }}>{rs.ready}</td>
                                <td class="px-4 py-2 text-sm" style={{ color: 'var(--text-primary)' }}>{rs.replicas}</td>
                                <td class="px-4 py-2 text-sm" style={{ color: 'var(--text-primary)' }}>{rs.age}</td>
                              </tr>
                            )}
                          </For>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </Show>

                {/* Pods */}
                <Show when={!deploymentDetails.loading && deploymentDetails()?.pods && deploymentDetails()!.pods.length > 0}>
                  <div>
                    <h3 class="text-sm font-semibold mb-3" style={{ color: 'var(--text-secondary)' }}>Pods ({deploymentDetails()!.pods.length})</h3>
                    <div class="rounded-lg border overflow-x-auto" style={{ 'border-color': 'var(--border-color)', background: 'var(--bg-secondary)' }}>
                      <table class="w-full">
                        <thead>
                          <tr style={{ background: 'var(--bg-tertiary)' }}>
                            <th class="px-4 py-2 text-left text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Name</th>
                            <th class="px-4 py-2 text-left text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Status</th>
                            <th class="px-4 py-2 text-left text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Ready</th>
                            <th class="px-4 py-2 text-left text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Restarts</th>
                            <th class="px-4 py-2 text-left text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>IP</th>
                            <th class="px-4 py-2 text-left text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Node</th>
                            <th class="px-4 py-2 text-left text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Age</th>
                          </tr>
                        </thead>
                        <tbody>
                          <For each={deploymentDetails()!.pods}>
                            {(pod: any) => (
                              <tr class="border-b" style={{ 'border-color': 'var(--border-color)' }}>
                                <td class="px-4 py-2 text-sm" style={{ color: 'var(--text-primary)' }}>{pod.name}</td>
                                <td class="px-4 py-2 text-sm">
                                  <span class={`badge ${
                                    pod.status === 'Running' ? 'badge-success' :
                                    pod.status === 'Pending' ? 'badge-warning' :
                                    'badge-error'
                                  }`}>{pod.status}</span>
                                </td>
                                <td class="px-4 py-2 text-sm" style={{ color: 'var(--text-primary)' }}>{pod.ready}</td>
                                <td class="px-4 py-2 text-sm" style={{ color: 'var(--text-primary)' }}>{pod.restarts}</td>
                                <td class="px-4 py-2 text-sm" style={{ color: 'var(--text-primary)' }}>{pod.ip || '-'}</td>
                                <td class="px-4 py-2 text-sm" style={{ color: 'var(--text-primary)' }}>{pod.node || '-'}</td>
                                <td class="px-4 py-2 text-sm" style={{ color: 'var(--text-primary)' }}>{pod.age}</td>
                              </tr>
                            )}
                          </For>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </Show>

                {/* Conditions */}
                <Show when={!deploymentDetails.loading && deploymentDetails()?.conditions && deploymentDetails()!.conditions.length > 0}>
                  <div>
                    <h3 class="text-sm font-semibold mb-3" style={{ color: 'var(--text-secondary)' }}>Conditions</h3>
                    <div class="space-y-2">
                      <For each={deploymentDetails()!.conditions}>
                        {(condition: any) => (
                          <div class="p-3 rounded-lg border" style={{ background: 'var(--bg-tertiary)', 'border-color': 'var(--border-color)' }}>
                            <div class="flex items-center justify-between mb-1">
                              <span class="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{condition.type}</span>
                              <span class={`badge ${condition.status === 'True' ? 'badge-success' : 'badge-warning'}`}>
                                {condition.status}
                              </span>
                            </div>
                            <Show when={condition.reason}>
                              <div class="text-xs" style={{ color: 'var(--text-secondary)' }}>Reason: {condition.reason}</div>
                            </Show>
                            <Show when={condition.message}>
                              <div class="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{condition.message}</div>
                            </Show>
                            <div class="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                              Last transition: {new Date(condition.lastTransitionTime).toLocaleString()}
                            </div>
                          </div>
                        )}
                      </For>
                    </div>
                  </div>
                </Show>

                {/* Actions */}
                <div class="grid grid-cols-3 md:grid-cols-6 gap-2 pt-3">
                  <button
                    onClick={() => { setShowDetails(false); openScale(selected()!); }}
                    class="btn-primary flex flex-col items-center justify-center gap-1 px-2 py-2 rounded text-xs"
                    title="Scale"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span>Scale</span>
                  </button>
                  <button
                    onClick={() => { setShowDetails(false); restart(selected()!); }}
                    class="btn-primary flex flex-col items-center justify-center gap-1 px-2 py-2 rounded text-xs"
                    title="Restart"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span>Restart</span>
                  </button>
                  <button
                    onClick={() => { setShowDetails(false); setShowYaml(true); setYamlKey(`${selected()!.name}|${selected()!.namespace}`); }}
                    class="btn-secondary flex flex-col items-center justify-center gap-1 px-2 py-2 rounded text-xs"
                    title="YAML"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                    </svg>
                    <span>YAML</span>
                  </button>
                  <button
                    onClick={() => { setShowDetails(false); setShowDescribe(true); }}
                    class="btn-secondary flex flex-col items-center justify-center gap-1 px-2 py-2 rounded text-xs"
                    title="Describe"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Describe</span>
                  </button>
                  <button
                    onClick={() => { setShowDetails(false); setShowEdit(true); setYamlKey(`${selected()!.name}|${selected()!.namespace}`); }}
                    class="btn-secondary flex flex-col items-center justify-center gap-1 px-2 py-2 rounded text-xs"
                    title="Edit"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    <span>Edit</span>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteDeployment(selected()!);
                    }}
                    class="btn-danger flex flex-col items-center justify-center gap-1 px-2 py-2 rounded text-xs"
                    title="Delete"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            );
          })()}
        </Show>
      </Modal>

      {/* Describe Modal */}
      <DescribeModal isOpen={showDescribe()} onClose={() => setShowDescribe(false)} resourceType="deployment" name={selected()?.name || ''} namespace={selected()?.namespace} />

      {/* Scale Modal */}
      <Modal isOpen={showScale()} onClose={() => setShowScale(false)} title={`Scale: ${selected()?.name}`} size="sm">
        <div class="space-y-4">
          <div>
            <label class="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>Replicas</label>
            <input
              type="number"
              min="0"
              max="100"
              value={scaleReplicas()}
              onInput={(e) => setScaleReplicas(parseInt(e.currentTarget.value) || 0)}
              class="w-full px-4 py-2 rounded-lg"
              style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
            />
          </div>
          <div class="flex gap-2">
            <button onClick={() => setShowScale(false)} class="btn-secondary flex-1">Cancel</button>
            <button onClick={scale} class="btn-primary flex-1">Scale</button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteConfirm()}
        onClose={() => {
          if (!deleting()) {
            setShowDeleteConfirm(false);
            setShowDetails(false);
          }
        }}
        title="Delete Deployment"
        message={`Are you sure you want to delete the deployment "${selected()?.name}"?`}
        details={selected() ? [
          { label: 'Name', value: selected()!.name },
          { label: 'Namespace', value: selected()!.namespace },
        ] : undefined}
        variant="danger"
        confirmText="Delete"
        cancelText="Cancel"
        loading={deleting()}
        onConfirm={handleDeleteConfirm}
        size="sm"
      />

      {/* Bulk Delete Modal */}
      <BulkDeleteModal
        isOpen={showBulkDeleteModal()}
        onClose={() => setShowBulkDeleteModal(false)}
        resourceType="Deployments"
        selectedItems={bulk.getSelectedItems(filteredAndSorted())}
        onConfirm={async () => {
          const selectedDeployments = bulk.getSelectedItems(filteredAndSorted());

          // Delete each deployment
          for (const dep of selectedDeployments) {
            try {
              await api.deleteDeployment(dep.name, dep.namespace);
            } catch (error) {
              console.error(`Failed to delete deployment ${dep.namespace}/${dep.name}:`, error);
              addNotification(
                `Failed to delete deployment ${dep.name}: ${error instanceof Error ? error.message : 'Unknown error'}`,
                'error'
              );
            }
          }

          // Clear selection and refetch
          bulk.deselectAll();
          deploymentsCache.refetch();

          // Show success notification
          addNotification(
            `Successfully deleted ${selectedDeployments.length} deployment${selectedDeployments.length !== 1 ? 's' : ''}`,
            'success'
          );
        }}
      />
    </div>
  );
};

export default Deployments;
