import { Component, For, Show, createMemo, createSignal, createResource, onMount, createEffect } from 'solid-js';
import { api } from '../services/api';
import { clusterStatus } from '../stores/cluster';
import { addNotification } from '../stores/ui';
import {
  selectedNamespaces,
  globalLoading,
  setGlobalLoading,
  setNamespaces,
} from '../stores/globalStore';
import { createCachedResource } from '../utils/resourceCache';
import { getThemeBackground, getThemeBorderColor } from '../utils/themeBackground';
import Modal from '../components/Modal';
import YAMLViewer from '../components/YAMLViewer';
import YAMLEditor from '../components/YAMLEditor';
import DescribeModal from '../components/DescribeModal';
import ConfirmationModal from '../components/ConfirmationModal';
import RelatedResources from '../components/RelatedResources';
import ActionMenu from '../components/ActionMenu';
import { BulkActions, SelectionCheckbox, SelectAllCheckbox } from '../components/BulkActions';
import { BulkDeleteModal } from '../components/BulkDeleteModal';
import { useBulkSelection } from '../hooks/useBulkSelection';
import { startExecution } from '../stores/executionPanel';

interface CronJob {
  name: string;
  namespace: string;
  schedule: string;
  suspend: boolean;
  active: number;
  lastSchedule: string;
  age: string;
}

type SortField = 'name' | 'namespace' | 'active' | 'age';
type SortDirection = 'asc' | 'desc';

const CronJobs: Component = () => {
  const [search, setSearch] = createSignal('');
  const [sortField, setSortField] = createSignal<SortField>('name');
  const [sortDirection, setSortDirection] = createSignal<SortDirection>('asc');
  const [currentPage, setCurrentPage] = createSignal(1);
  const [pageSize, setPageSize] = createSignal(20);
  const [selected, setSelected] = createSignal<CronJob | null>(null);
  const [showYaml, setShowYaml] = createSignal(false);
  const [showEdit, setShowEdit] = createSignal(false);
  const [showDescribe, setShowDescribe] = createSignal(false);
  const [showDetails, setShowDetails] = createSignal(false);
  const [yamlKey, setYamlKey] = createSignal<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = createSignal(false);
  const [deleting, setDeleting] = createSignal(false);
  const [fontSize, setFontSize] = createSignal(parseInt(localStorage.getItem('cronjobs-font-size') || '14'));
  const [fontFamily, setFontFamily] = createSignal(localStorage.getItem('cronjobs-font-family') || 'Monaco');

  // Bulk selection
  const bulk = useBulkSelection<CronJob>();
  const [showBulkDeleteModal, setShowBulkDeleteModal] = createSignal(false);

  // Focus handling from URL params
  const [focusedCronJob, setFocusedCronJob] = createSignal<string | null>(null);
  const [focusedRowRef, setFocusedRowRef] = createSignal<HTMLTableRowElement | null>(null);
  const [previousNamespaces, setPreviousNamespaces] = createSignal<string[] | null>(null);

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
      setFocusedCronJob(focusName);
    }
  });

  // Handle focus after cronjobs are loaded
  createEffect(() => {
    const focusName = focusedCronJob();
    const allCronJobs = filteredAndSorted();

    if (focusName && allCronJobs.length > 0) {
      // Find the cronjob in filtered list
      const cj = allCronJobs.find(c => c.name === focusName);
      if (cj) {
        // Navigate to the correct page if needed
        const cjIndex = allCronJobs.findIndex(c => c.name === focusName);
        if (cjIndex >= 0) {
          const targetPage = Math.floor(cjIndex / pageSize()) + 1;
          if (targetPage !== currentPage()) {
            setCurrentPage(targetPage);
            // Wait for page to update before focusing
            setTimeout(() => focusCronJob(cj), 200);
            return;
          }
        }

        focusCronJob(cj);
      }
    }
  });

  const focusCronJob = (cj: CronJob) => {
    // Set as selected and open details
    setSelected(cj);
    setShowDetails(true);

    // Show notification
    addNotification(`Viewing CronJob: ${cj.name}`, 'success');

    // Scroll to row after a short delay to ensure DOM is ready
    setTimeout(() => {
      const row = focusedRowRef();
      if (row) {
        row.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);

    // Clear focus after highlighting
    setTimeout(() => {
      setFocusedCronJob(null);
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

  const getFontFamilyCSS = (family: string): string => {
    switch (family) {
      case 'Monospace': return 'monospace';
      case 'System-ui': return 'system-ui';
      case 'Monaco': return 'Monaco, monospace';
      case 'Consolas': return 'Consolas, monospace';
      case 'Courier': return '"Courier New", monospace';
      default: return 'Monaco, monospace';
    }
  };

  const handleFontSizeChange = (size: number) => {
    setFontSize(size);
    localStorage.setItem('cronjobs-font-size', size.toString());
  };

  const handleFontFamilyChange = (family: string) => {
    setFontFamily(family);
    localStorage.setItem('cronjobs-font-family', family);
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
  const cronjobsCache = createCachedResource<CronJob[]>(
    'cronjobs',
    async () => {
      setGlobalLoading(true);
      try {
        const namespaceParam = getNamespaceParam();
        const cronjobs = await api.getCronJobs(namespaceParam);
        return cronjobs;
      } finally {
        setGlobalLoading(false);
      }
    },
    {
      ttl: 15000, // 15 seconds
      backgroundRefresh: true,
    }
  );

  const cronjobs = createMemo(() => cronjobsCache.data() || []);
  const refetch = () => cronjobsCache.refetch();
  const [yamlContent] = createResource(
    () => yamlKey(),
    async (key) => {
      if (!key) return '';
      const [name, ns] = key.split('|');
      if (!name || !ns) return '';
      try {
        const data = await api.getCronJobYAML(name, ns);
        return data.yaml || '';
      } catch (error) {
        console.error('Failed to fetch cronjob YAML:', error);
        addNotification(`Failed to load YAML: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
        return '';
      }
    }
  );

  const handleSaveYAML = async (yaml: string) => {
    const cj = selected();
    if (!cj) return;
    
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

    startExecution({
      label: `Apply CronJob YAML: ${cj.name}`,
      command: '__k8s-apply-yaml',
      args: [],
      mode: 'apply',
      kubernetesEquivalent: true,
      namespace: cj.namespace,
      context: status.context,
      userAction: 'cronjobs-apply-yaml',
      dryRun: false,
      allowClusterWide: false,
      resource: 'cronjobs',
      action: 'update',
      intent: 'apply-yaml',
      yaml: trimmed,
    });

    setShowEdit(false);
    setTimeout(() => refetch(), 1500);
  };

  const handleDryRunYAML = async (yaml: string) => {
    const cj = selected();
    if (!cj) return;
    
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
      label: `Dry run CronJob YAML: ${cj.name}`,
      command: '__k8s-apply-yaml',
      args: [],
      mode: 'dry-run',
      kubernetesEquivalent: true,
      namespace: cj.namespace,
      context: status.context,
      userAction: 'cronjobs-apply-yaml-dry-run',
      dryRun: true,
      allowClusterWide: false,
      resource: 'cronjobs',
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
    let all = cronjobs() || [];
    const query = search().toLowerCase();

    // Filter by search
    if (query) {
      all = all.filter((c: CronJob) =>
        c.name.toLowerCase().includes(query) ||
        c.namespace.toLowerCase().includes(query)
      );
    }

    // Sort
    const field = sortField();
    const direction = sortDirection();
    all = [...all].sort((a: CronJob, b: CronJob) => {
      let comparison = 0;
      switch (field) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'namespace':
          comparison = a.namespace.localeCompare(b.namespace);
          break;
        case 'active':
          comparison = a.active - b.active;
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
  const paginatedCronJobs = createMemo(() => {
    const start = (currentPage() - 1) * pageSize();
    return filteredAndSorted().slice(start, start + pageSize());
  });

  const statusCounts = createMemo(() => {
    const all = cronjobs() || [];
    return {
      total: all.length,
      active: all.filter((c: CronJob) => c.active > 0).length,
      suspended: all.filter((c: CronJob) => c.suspend).length,
      scheduled: all.filter((c: CronJob) => !c.suspend && c.active === 0).length,
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

  const triggerCronJob = async (cj: CronJob) => {
    try {
      await api.triggerCronJob(cj.name, cj.namespace);
      refetch();
    } catch (error) {
      console.error('Failed to trigger CronJob:', error);
    }
  };

  const toggleSuspend = async (cj: CronJob) => {
    try {
      await api.suspendCronJob(cj.name, cj.namespace, !cj.suspend);
      refetch();
    } catch (error) {
      console.error('Failed to toggle suspend CronJob:', error);
    }
  };

  const handleDeleteConfirm = async () => {
    const cj = selected();
    if (!cj) return;
    
    setDeleting(true);
    try {
      await api.deleteCronJob(cj.name, cj.namespace);
      addNotification(`CronJob ${cj.name} deleted successfully`, 'success');
      refetch();
      setSelected(null);
      setShowDeleteConfirm(false);
      setShowDetails(false);
    } catch (error) {
      console.error('Failed to delete CronJob:', error);
      addNotification(`Failed to delete CronJob: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    } finally {
      setDeleting(false);
    }
  };

  const deleteCronJob = (cj: CronJob) => {
    setSelected(cj);
    setShowDeleteConfirm(true);
  };

  const handleBulkDelete = async () => {
    const itemsToDelete = bulk.getSelectedItems(paginatedCronJobs());
    try {
      await Promise.all(itemsToDelete.map(cj => api.deleteCronJob(cj.name, cj.namespace)));
      addNotification(`Successfully deleted ${itemsToDelete.length} CronJob(s)`, 'success');
      bulk.deselectAll();
      refetch();
    } catch (error) {
      console.error('Failed to delete CronJobs:', error);
      addNotification(`Failed to delete CronJobs: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    }
  };

  return (
    <div class="space-y-2 max-w-full -mt-4">
      {/* Header - reduced size */}
      <div class="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 class="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>CronJobs</h1>
          <p class="text-xs" style={{ color: 'var(--text-secondary)' }}>Scheduled job management</p>
        </div>
        <div class="flex items-center gap-3">
          <select
            value={fontSize()}
            onChange={(e) => handleFontSizeChange(parseInt(e.currentTarget.value))}
            class="px-3 py-2 rounded-lg text-sm"
            style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
            title="Font Size"
          >
            <option value="12">12px</option>
            <option value="13">13px</option>
            <option value="14">14px</option>
            <option value="15">15px</option>
            <option value="16">16px</option>
            <option value="17">17px</option>
            <option value="18">18px</option>
            <option value="19">19px</option>
            <option value="20">20px</option>
          </select>
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
          <button
            onClick={(e) => {
              const btn = e.currentTarget;
              btn.classList.add('refreshing');
              setTimeout(() => btn.classList.remove('refreshing'), 500);
              refetch();
            }}
            class="icon-btn"
            style={{ background: 'var(--bg-secondary)' }}
            title="Refresh CronJobs"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {/* Status summary */}
      <div class="flex flex-wrap items-center gap-3">
        <div class="card px-4 py-2 cursor-pointer hover:opacity-80 flex items-center gap-2" style={{ 'border-left': '3px solid var(--accent-primary)' }}>
          <span style={{ color: 'var(--text-secondary)' }} class="text-sm">Total</span>
          <span class="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{statusCounts().total}</span>
        </div>
        <div class="card px-4 py-2 cursor-pointer hover:opacity-80 flex items-center gap-2" style={{ 'border-left': '3px solid var(--success-color)' }}>
          <span style={{ color: 'var(--text-secondary)' }} class="text-sm">Active</span>
          <span class="text-xl font-bold" style={{ color: 'var(--success-color)' }}>{statusCounts().active}</span>
        </div>
        <div class="card px-4 py-2 cursor-pointer hover:opacity-80 flex items-center gap-2" style={{ 'border-left': '3px solid var(--warning-color)' }}>
          <span style={{ color: 'var(--text-secondary)' }} class="text-sm">Suspended</span>
          <span class="text-xl font-bold" style={{ color: 'var(--warning-color)' }}>{statusCounts().suspended}</span>
        </div>
        <div class="card px-4 py-2 cursor-pointer hover:opacity-80 flex items-center gap-2" style={{ 'border-left': '3px solid #3b82f6' }}>
          <span style={{ color: 'var(--text-secondary)' }} class="text-sm">Scheduled</span>
          <span class="text-xl font-bold" style={{ color: '#3b82f6' }}>{statusCounts().scheduled}</span>
        </div>

        <div class="flex-1" />

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

      {/* CronJobs table */}
      <div class="w-full" style={{ background: getThemeBackground(), margin: '0', padding: '0', border: `1px solid ${getThemeBorderColor()}`, 'border-radius': '4px' }}>
        <Show
          when={!cronjobsCache.loading() || cronjobsCache.data() !== undefined}
          fallback={
            <div class="p-8 text-center">
              <div class="spinner mx-auto mb-2" />
              <span style={{ color: 'var(--text-muted)' }}>Loading CronJobs...</span>
            </div>
          }
        >
          <div class="w-full overflow-x-auto" style={{ margin: '0', padding: '0' }}>
            <table
              class="w-full"
              style={{
                width: '100%',
                'table-layout': 'auto',
                'font-family': getFontFamilyCSS(fontFamily()),
                background: getThemeBackground(),
                'border-collapse': 'collapse',
                margin: '0',
                padding: '0'
              }}
            >
              <thead>
                <tr>
                  <th class="whitespace-nowrap" style={{ width: '40px', padding: '0 8px' }}>
                    <SelectAllCheckbox
                      checked={bulk.selectedCount() === paginatedCronJobs().length && paginatedCronJobs().length > 0}
                      indeterminate={bulk.selectedCount() > 0 && bulk.selectedCount() < paginatedCronJobs().length}
                      onChange={() => {
                        if (bulk.selectedCount() === paginatedCronJobs().length) {
                          bulk.deselectAll();
                        } else {
                          bulk.selectAll(paginatedCronJobs());
                        }
                      }}
                    />
                  </th>
                  <th class="cursor-pointer select-none whitespace-nowrap" onClick={() => handleSort('name')}>
                    <div class="flex items-center gap-1">Name <SortIcon field="name" /></div>
                  </th>
                  <th class="cursor-pointer select-none whitespace-nowrap" onClick={() => handleSort('namespace')}>
                    <div class="flex items-center gap-1">Namespace <SortIcon field="namespace" /></div>
                  </th>
                  <th class="whitespace-nowrap">Schedule</th>
                  <th class="whitespace-nowrap">Suspend</th>
                  <th class="cursor-pointer select-none whitespace-nowrap" onClick={() => handleSort('active')}>
                    <div class="flex items-center gap-1">Active <SortIcon field="active" /></div>
                  </th>
                  <th class="whitespace-nowrap">Last Schedule</th>
                  <th class="cursor-pointer select-none whitespace-nowrap" onClick={() => handleSort('age')}>
                    <div class="flex items-center gap-1">Age <SortIcon field="age" /></div>
                  </th>
                  <th class="whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody>
                <For each={paginatedCronJobs()} fallback={
                  <tr><td colspan="9" class="text-center py-8" style={{ color: 'var(--text-muted)' }}>No CronJobs found</td></tr>
                }>
                  {(cj: CronJob) => {
                    const textColor = '#0ea5e9';
                    const isFocused = () => focusedCronJob() === cj.name;

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
                        height: `${Math.max(24, fontSize() * 1.7)}px`,
                        'line-height': `${Math.max(24, fontSize() * 1.7)}px`,
                        border: 'none'
                      }}>
                        <SelectionCheckbox
                          checked={bulk.isSelected(cj)}
                          onChange={() => bulk.toggleSelection(cj)}
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
                          onClick={() => { setSelected(cj); setShowDetails(true); }}
                          class="font-medium hover:underline text-left"
                          style={{ color: 'var(--accent-primary)' }}
                        >
                          {cj.name.length > 40 ? cj.name.slice(0, 37) + '...' : cj.name}
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
                      }}>{cj.namespace}</td>
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
                        <code class="px-2 py-1 rounded text-xs" style={{ background: 'var(--bg-tertiary)' }}>
                          {cj.schedule}
                        </code>
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
                        <span class={`badge ${cj.suspend ? 'badge-warning' : 'badge-success'}`}>
                          {cj.suspend ? 'Yes' : 'No'}
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
                      }}>{cj.active}</td>
                      <td style={{
                        padding: '0 8px',
                        'text-align': 'left',
                        color: textColor,
                        'font-weight': '900',
                        'font-size': `${fontSize()}px`,
                        height: `${Math.max(24, fontSize() * 1.7)}px`,
                        'line-height': `${Math.max(24, fontSize() * 1.7)}px`,
                        border: 'none'
                      }}>{cj.lastSchedule || 'Never'}</td>
                      <td style={{
                        padding: '0 8px',
                        'text-align': 'left',
                        color: textColor,
                        'font-weight': '900',
                        'font-size': `${fontSize()}px`,
                        height: `${Math.max(24, fontSize() * 1.7)}px`,
                        'line-height': `${Math.max(24, fontSize() * 1.7)}px`,
                        border: 'none'
                      }}>{cj.age}</td>
                      <td style={{
                        padding: '0 8px',
                        'text-align': 'left',
                        height: `${Math.max(24, fontSize() * 1.7)}px`,
                        'line-height': `${Math.max(24, fontSize() * 1.7)}px`,
                        border: 'none'
                      }}>
                        <ActionMenu
                          actions={[
                            { label: 'Trigger', icon: 'restart', onClick: () => triggerCronJob(cj) },
                            { label: cj.suspend ? 'Resume' : 'Suspend', icon: 'restart', onClick: () => toggleSuspend(cj) },
                            { label: 'View YAML', icon: 'yaml', onClick: () => { 
                              setSelected(cj);
                              setYamlKey(`${cj.name}|${cj.namespace}`);
                              setShowYaml(true);
                            } },
                            { label: 'Edit YAML', icon: 'edit', onClick: () => { 
                              setSelected(cj);
                              setYamlKey(`${cj.name}|${cj.namespace}`);
                              setShowEdit(true);
                            } },
                            { label: 'Delete', icon: 'delete', onClick: () => { setSelected(cj); deleteCronJob(cj); }, variant: 'danger', divider: true },
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
                Showing {((currentPage() - 1) * pageSize()) + 1} - {Math.min(currentPage() * pageSize(), filteredAndSorted().length)} of {filteredAndSorted().length} CronJobs
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

      {/* Describe Modal */}
      <DescribeModal isOpen={showDescribe()} onClose={() => setShowDescribe(false)} resourceType="cronjob" name={selected()?.name || ''} namespace={selected()?.namespace} />

      {/* Bulk Actions Bar */}
      <BulkActions
        selectedCount={bulk.selectedCount()}
        totalCount={filteredAndSorted().length}
        onSelectAll={() => bulk.selectAll(filteredAndSorted())}
        onDeselectAll={() => bulk.deselectAll()}
        onDelete={() => setShowBulkDeleteModal(true)}
        resourceType="cronjobs"
      />

      {/* Bulk Delete Modal */}
      <BulkDeleteModal
        isOpen={showBulkDeleteModal()}
        onClose={() => setShowBulkDeleteModal(false)}
        onConfirm={handleBulkDelete}
        resourceType="CronJobs"
        selectedItems={bulk.getSelectedItems(filteredAndSorted())}
      />
    </div>
  );
};

export default CronJobs;
