import { Component, For, Show, createMemo, createSignal, createResource, onMount, createEffect, onCleanup } from 'solid-js';
import { Portal } from 'solid-js/web';
import { api } from '../services/api';
import { namespace, clusterStatus } from '../stores/cluster';
import { addNotification } from '../stores/ui';
import { selectedNamespaces, setNamespaces } from '../stores/globalStore';
import { getThemeBackground, getThemeBorderColor } from '../utils/themeBackground';
import Modal from '../components/Modal';
import YAMLViewer from '../components/YAMLViewer';
import YAMLEditor from '../components/YAMLEditor';
import DescribeModal from '../components/DescribeModal';
import ConfirmationModal from '../components/ConfirmationModal';
import RelatedResources from '../components/RelatedResources';
import { BulkActions, SelectionCheckbox, SelectAllCheckbox } from '../components/BulkActions';
import { BulkDeleteModal } from '../components/BulkDeleteModal';
import { useBulkSelection } from '../hooks/useBulkSelection';
import { startExecution } from '../stores/executionPanel';
import { getInitialFontSize, getInitialFontFamily, getFontFamilyCSS, saveFontSize, saveFontFamily } from '../utils/resourceTableFontDefaults';

interface DaemonSet {
  name: string;
  uid?: string; // DaemonSet UID for stable keys
  namespace: string;
  desired: number;
  current: number;
  ready: number;
  available: number;
  age: string;
}

type SortField = 'name' | 'namespace' | 'ready' | 'age';
type SortDirection = 'asc' | 'desc';

const DaemonSets: Component = () => {
  const [search, setSearch] = createSignal('');
  const [sortField, setSortField] = createSignal<SortField>('name');
  const [sortDirection, setSortDirection] = createSignal<SortDirection>('asc');
  const [currentPage, setCurrentPage] = createSignal(1);
  const [pageSize, setPageSize] = createSignal(20);
  const [selected, setSelected] = createSignal<DaemonSet | null>(null);
  const [showYaml, setShowYaml] = createSignal(false);
  const [showEdit, setShowEdit] = createSignal(false);
  const [showDescribe, setShowDescribe] = createSignal(false);
  const [showDetails, setShowDetails] = createSignal(false);
  const [yamlKey, setYamlKey] = createSignal<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = createSignal(false);
  const [deleting, setDeleting] = createSignal(false);
  const [restarting, setRestarting] = createSignal<string | null>(null);
  // Font size and family using shared utility with 14px and Monaco defaults
  const [fontSize, setFontSize] = createSignal(getInitialFontSize('daemonsets'));
  const [fontFamily, setFontFamily] = createSignal(getInitialFontFamily('daemonsets'));

  // Bulk selection
  const bulk = useBulkSelection<DaemonSet>();
  const [showBulkDeleteModal, setShowBulkDeleteModal] = createSignal(false);

  // Menu state management - moved to component level to survive row re-renders
  const [openMenuDaemonSetUID, setOpenMenuDaemonSetUID] = createSignal<string | null>(null);
  const [menuAnchorPosition, setMenuAnchorPosition] = createSignal<{ top: number; left: number } | null>(null);
  const [menuHovering, setMenuHovering] = createSignal(false);

  // Focus handling from URL params
  const [focusedDaemonSet, setFocusedDaemonSet] = createSignal<string | null>(null);
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
      setFocusedDaemonSet(focusName);
    }
  });

  // Handle focus after daemonsets are loaded
  createEffect(() => {
    const focusName = focusedDaemonSet();
    const allDs = filteredAndSorted();

    if (focusName && allDs.length > 0) {
      // Find the daemonset in filtered list
      const ds = allDs.find(d => d.name === focusName);
      if (ds) {
        // Navigate to the correct page if needed
        const dsIndex = allDs.findIndex(d => d.name === focusName);
        if (dsIndex >= 0) {
          const targetPage = Math.floor(dsIndex / pageSize()) + 1;
          if (targetPage !== currentPage()) {
            setCurrentPage(targetPage);
            // Wait for page to update before focusing
            setTimeout(() => focusDaemonSet(ds), 200);
            return;
          }
        }

        focusDaemonSet(ds);
      }
    }
  });

  const focusDaemonSet = (ds: DaemonSet) => {
    // Set as selected and open details
    setSelected(ds);
    setShowDetails(true);

    // Show notification
    addNotification(`Viewing DaemonSet: ${ds.name}`, 'success');

    // Scroll to row after a short delay to ensure DOM is ready
    setTimeout(() => {
      const row = focusedRowRef();
      if (row) {
        row.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);

    // Clear focus after highlighting
    setTimeout(() => {
      setFocusedDaemonSet(null);
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

  const handleFontSizeChange = (size: number) => {
    setFontSize(size);
    saveFontSize('daemonsets', size);
  };

  const handleFontFamilyChange = (family: string) => {
    setFontFamily(family);
    saveFontFamily('daemonsets', family);
  };

  // Determine namespace parameter from global store
  const getNamespaceParam = (): string | undefined => {
    const namespaces = selectedNamespaces();
    if (namespaces.length === 0) return undefined; // All namespaces
    if (namespaces.length === 1) return namespaces[0];
    return namespaces[0];
  };

  const [daemonsets, { refetch }] = createResource(namespace, api.getDaemonSets);
  const [yamlContent] = createResource(
    () => yamlKey(),
    async (key) => {
      if (!key) return '';
      const [name, ns] = key.split('|');
      if (!name || !ns) return '';
      try {
        const data = await api.getDaemonSetYAML(name, ns);
        return data.yaml || '';
      } catch (error) {
        console.error('Failed to fetch daemonset YAML:', error);
        addNotification(`Failed to load YAML: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
        return '';
      }
    }
  );

  const handleSaveYAML = async (yaml: string) => {
    const ds = selected();
    if (!ds) return;
    
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
      label: `Apply DaemonSet YAML: ${ds.name}`,
      command: '__k8s-apply-yaml',
      args: [],
      mode: 'apply',
      kubernetesEquivalent: true,
      namespace: ds.namespace,
      context: status.context,
      userAction: 'daemonsets-apply-yaml',
      dryRun: false,
      allowClusterWide: false,
      resource: 'daemonsets',
      action: 'update',
      intent: 'apply-yaml',
      yaml: trimmed,
    });

    setShowEdit(false);
    setTimeout(() => refetch(), 1500);
  };

  const handleDryRunYAML = async (yaml: string) => {
    const ds = selected();
    if (!ds) return;
    
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
      label: `Dry run DaemonSet YAML: ${ds.name}`,
      command: '__k8s-apply-yaml',
      args: [],
      mode: 'dry-run',
      kubernetesEquivalent: true,
      namespace: ds.namespace,
      context: status.context,
      userAction: 'daemonsets-apply-yaml-dry-run',
      dryRun: true,
      allowClusterWide: false,
      resource: 'daemonsets',
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
    let all = daemonsets() || [];
    const query = search().toLowerCase();

    // Filter by search
    if (query) {
      all = all.filter((d: DaemonSet) =>
        d.name.toLowerCase().includes(query) ||
        d.namespace.toLowerCase().includes(query)
      );
    }

    // Sort
    const field = sortField();
    const direction = sortDirection();
    all = [...all].sort((a: DaemonSet, b: DaemonSet) => {
      let comparison = 0;
      switch (field) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'namespace':
          comparison = a.namespace.localeCompare(b.namespace);
          break;
        case 'ready':
          comparison = a.ready - b.ready;
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
  const paginatedDaemonSets = createMemo(() => {
    const start = (currentPage() - 1) * pageSize();
    return filteredAndSorted().slice(start, start + pageSize());
  });

  const statusCounts = createMemo(() => {
    const all = daemonsets() || [];
    return {
      total: all.length,
      ready: all.filter((d: DaemonSet) => d.ready === d.desired && d.ready > 0).length,
      partial: all.filter((d: DaemonSet) => d.ready !== d.desired && d.ready > 0).length,
      unavailable: all.filter((d: DaemonSet) => d.ready === 0).length,
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

  const restart = async (ds: DaemonSet) => {
    try {
      await api.restartDaemonSet(ds.name, ds.namespace);
      refetch();
    } catch (error) {
      console.error('Failed to restart DaemonSet:', error);
    }
  };

  const handleDeleteConfirm = async () => {
    const ds = selected();
    if (!ds) return;
    
    setDeleting(true);
    try {
      await api.deleteDaemonSet(ds.name, ds.namespace);
      addNotification(`DaemonSet ${ds.name} deleted successfully`, 'success');
      refetch();
      setSelected(null);
      setShowDeleteConfirm(false);
      setShowDetails(false);
    } catch (error) {
      console.error('Failed to delete DaemonSet:', error);
      addNotification(`Failed to delete DaemonSet: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    } finally {
      setDeleting(false);
    }
  };

  const deleteDaemonSet = (ds: DaemonSet) => {
    setSelected(ds);
    setShowDeleteConfirm(true);
  };

  // Action menu icons
  const actionIcons: Record<string, string> = {
    restart: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15',
    delete: 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16',
    yaml: 'M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4',
    edit: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z',
  };

  // Handle action menu open/close
  const handleActionMenuClick = (e: MouseEvent, ds: DaemonSet) => {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    
    const dsUID = ds.uid || `${ds.namespace}/${ds.name}`;
    
    if (openMenuDaemonSetUID() === dsUID) {
      setOpenMenuDaemonSetUID(null);
      setMenuAnchorPosition(null);
      setMenuHovering(false);
      return;
    }
    
    const button = e.currentTarget as HTMLElement;
    const rect = button.getBoundingClientRect();
    const menuHeight = 300;
    const viewportHeight = window.innerHeight;
    const spaceBelow = viewportHeight - rect.bottom;
    const spaceAbove = rect.top;
    
    let top = rect.bottom + 4;
    if (spaceBelow < menuHeight && spaceAbove > spaceBelow) {
      top = rect.top - menuHeight - 4;
    }
    top = Math.max(10, Math.min(top, viewportHeight - menuHeight - 10));
    
    setMenuAnchorPosition({
      top,
      left: Math.max(10, Math.min(rect.right - 180, window.innerWidth - 190)),
    });
    setOpenMenuDaemonSetUID(dsUID);
    setMenuHovering(false);
  };

  const closeActionMenu = () => {
    setOpenMenuDaemonSetUID(null);
    setMenuAnchorPosition(null);
    setMenuHovering(false);
  };

  const currentMenuDaemonSet = createMemo(() => {
    const uid = openMenuDaemonSetUID();
    if (!uid) return null;
    const dsList = daemonsets() || [];
    return dsList.find(d => (d.uid || `${d.namespace}/${d.name}`) === uid) || null;
  });

  createEffect(() => {
    if (!openMenuDaemonSetUID()) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      const menuElement = document.querySelector('[data-action-menu]');
      if (menuElement && menuElement.contains(target)) return;
      const actionButtons = document.querySelectorAll('[data-action-button]');
      for (const btn of actionButtons) {
        if (btn.contains(target)) return;
      }
      closeActionMenu();
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeActionMenu();
    };

    const timeout = setTimeout(() => {
      document.addEventListener('click', handleClickOutside, true);
      document.addEventListener('keydown', handleEscape, true);
    }, 100);

    onCleanup(() => {
      clearTimeout(timeout);
      document.removeEventListener('click', handleClickOutside, true);
      document.removeEventListener('keydown', handleEscape, true);
    });
  });

  createEffect(() => {
    const uid = openMenuDaemonSetUID();
    if (!uid) return;
    const ds = currentMenuDaemonSet();
    if (!ds) {
      addNotification('DaemonSet no longer available', 'warning');
      closeActionMenu();
    }
  });

  createEffect(() => {
    if (!openMenuDaemonSetUID() || !menuAnchorPosition()) return;

    const handleResize = () => {
      const uid = openMenuDaemonSetUID();
      if (!uid) return;
      const dsList = daemonsets() || [];
      const ds = dsList.find(d => (d.uid || `${d.namespace}/${d.name}`) === uid);
      if (!ds) return;
      
      const buttons = document.querySelectorAll('[data-action-button]');
      for (const btn of buttons) {
        const btnUID = btn.getAttribute('data-daemonset-uid');
        if (btnUID === uid) {
          const rect = btn.getBoundingClientRect();
          const menuHeight = 300;
          const viewportHeight = window.innerHeight;
          const spaceBelow = viewportHeight - rect.bottom;
          const spaceAbove = rect.top;
          
          let top = rect.bottom + 4;
          if (spaceBelow < menuHeight && spaceAbove > spaceBelow) {
            top = rect.top - menuHeight - 4;
          }
          top = Math.max(10, Math.min(top, viewportHeight - menuHeight - 10));
          
          setMenuAnchorPosition({
            top,
            left: Math.max(10, Math.min(rect.right - 180, window.innerWidth - 190)),
          });
          break;
        }
      }
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleResize, true);

    onCleanup(() => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleResize, true);
    });
  });

  return (
    <div class="space-y-2 max-w-full -mt-4">
      <BulkActions
        selectedCount={bulk.selectedCount()}
        totalCount={filteredAndSorted().length}
        onSelectAll={() => bulk.selectAll(filteredAndSorted())}
        onDeselectAll={() => bulk.deselectAll()}
        onDelete={() => setShowBulkDeleteModal(true)}
        resourceType="DaemonSets"
      />

      {/* Header - reduced size */}
      <div class="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 class="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>DaemonSets</h1>
          <p class="text-xs" style={{ color: 'var(--text-secondary)' }}>Node-level workloads running on all or selected nodes</p>
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
            title="Refresh DaemonSets"
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
                if (!ns || !confirm(`Are you sure you want to restart ALL DaemonSets in namespace "${ns}"?`)) return;
                try {
                  const result = await api.bulkRestartDaemonSets(ns);
                  if (result?.success) {
                    addNotification(`✅ Restarted ${result.restarted?.length || 0}/${result.total || 0} DaemonSets in ${ns}`, 'success');
                    if (result.failed && result.failed.length > 0) {
                      addNotification(`⚠️ ${result.failed.length} DaemonSets failed to restart`, 'warning');
                    }
                  }
                  setTimeout(() => refetch(), 1000);
                } catch (error) {
                  addNotification(`❌ Failed to restart DaemonSets: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
                }
              }}
              class="px-3 py-2 rounded-lg text-sm font-medium"
              style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
              title="Restart All DaemonSets in Namespace"
            >
              🔄 Restart All
            </button>
            <button
              onClick={async () => {
                const ns = getNamespaceParam();
                if (!ns || !confirm(`⚠️ DANGER: Are you sure you want to DELETE ALL DaemonSets in namespace "${ns}"? This cannot be undone!`)) return;
                if (!confirm(`This will delete ALL ${daemonsets()?.filter((ds: DaemonSet) => ds.namespace === ns).length || 0} DaemonSets in "${ns}". Type the namespace name to confirm:`) || prompt('Type namespace name to confirm:') !== ns) return;
                try {
                  const result = await api.bulkDeleteDaemonSets(ns);
                  if (result?.success) {
                    addNotification(`✅ Deleted ${result.deleted?.length || 0}/${result.total || 0} DaemonSets in ${ns}`, 'success');
                    if (result.failed && result.failed.length > 0) {
                      addNotification(`⚠️ ${result.failed.length} DaemonSets failed to delete`, 'warning');
                    }
                  }
                  setTimeout(() => refetch(), 1000);
                } catch (error) {
                  addNotification(`❌ Failed to delete DaemonSets: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
                }
              }}
              class="px-3 py-2 rounded-lg text-sm font-medium"
              style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)' }}
              title="Delete All DaemonSets in Namespace"
            >
              🗑️ Delete All
            </button>
          </div>
        </Show>

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

      {/* DaemonSets table */}
      <div class="w-full" style={{ background: getThemeBackground(), margin: '0', padding: '0', border: `1px solid ${getThemeBorderColor()}`, 'border-radius': '4px' }}>
        <Show
          when={!daemonsets.loading}
          fallback={
            <div class="p-8 text-center">
              <div class="spinner mx-auto mb-2" />
              <span style={{ color: 'var(--text-muted)' }}>Loading DaemonSets...</span>
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
                  <th style={{
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
                  <th class="cursor-pointer select-none whitespace-nowrap" onClick={() => handleSort('name')}>
                    <div class="flex items-center gap-1">Name <SortIcon field="name" /></div>
                  </th>
                  <th class="cursor-pointer select-none whitespace-nowrap" onClick={() => handleSort('namespace')}>
                    <div class="flex items-center gap-1">Namespace <SortIcon field="namespace" /></div>
                  </th>
                  <th class="whitespace-nowrap">Desired</th>
                  <th class="whitespace-nowrap">Current</th>
                  <th class="cursor-pointer select-none whitespace-nowrap" onClick={() => handleSort('ready')}>
                    <div class="flex items-center gap-1">Ready <SortIcon field="ready" /></div>
                  </th>
                  <th class="whitespace-nowrap">Available</th>
                  <th class="cursor-pointer select-none whitespace-nowrap" onClick={() => handleSort('age')}>
                    <div class="flex items-center gap-1">Age <SortIcon field="age" /></div>
                  </th>
                  <th class="whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody>
                <For each={paginatedDaemonSets()} fallback={
                  <tr><td colspan="9" class="text-center py-8" style={{ color: 'var(--text-muted)' }}>No DaemonSets found</td></tr>
                }>
                  {(ds: DaemonSet) => {
                    // Use uid as stable key, fallback to name+namespace if uid not available
                    const dsKey = ds.uid || `${ds.namespace}/${ds.name}`;
                    const textColor = '#0ea5e9';
                    const isFocused = () => focusedDaemonSet() === ds.name;

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
                          checked={bulk.isSelected(ds)}
                          onChange={() => bulk.toggleSelection(ds)}
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
                          onClick={() => { setSelected(ds); setShowDetails(true); }}
                          class="font-medium hover:underline text-left"
                          style={{ color: 'var(--accent-primary)' }}
                        >
                          {ds.name.length > 40 ? ds.name.slice(0, 37) + '...' : ds.name}
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
                      }}>{ds.namespace}</td>
                      <td style={{
                        padding: '0 8px',
                        'text-align': 'left',
                        color: textColor,
                        'font-weight': '900',
                        'font-size': `${fontSize()}px`,
                        height: `${Math.max(24, fontSize() * 1.7)}px`,
                        'line-height': `${Math.max(24, fontSize() * 1.7)}px`,
                        border: 'none'
                      }}>{ds.desired}</td>
                      <td style={{
                        padding: '0 8px',
                        'text-align': 'left',
                        color: textColor,
                        'font-weight': '900',
                        'font-size': `${fontSize()}px`,
                        height: `${Math.max(24, fontSize() * 1.7)}px`,
                        'line-height': `${Math.max(24, fontSize() * 1.7)}px`,
                        border: 'none'
                      }}>{ds.current}</td>
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
                        <span class={`badge ${ds.ready === ds.desired ? 'badge-success' : 'badge-warning'}`}>
                          {ds.ready}
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
                      }}>{ds.available}</td>
                      <td style={{
                        padding: '0 8px',
                        'text-align': 'left',
                        color: textColor,
                        'font-weight': '900',
                        'font-size': `${fontSize()}px`,
                        height: `${Math.max(24, fontSize() * 1.7)}px`,
                        'line-height': `${Math.max(24, fontSize() * 1.7)}px`,
                        border: 'none'
                      }}>{ds.age}</td>
                      <td style={{
                        padding: '0 8px',
                        'text-align': 'left',
                        height: `${Math.max(24, fontSize() * 1.7)}px`,
                        'line-height': `${Math.max(24, fontSize() * 1.7)}px`,
                        border: 'none'
                      }}>
                        <button
                          data-action-button
                          data-daemonset-uid={dsKey}
                          onClick={(e) => handleActionMenuClick(e, ds)}
                          class="flex items-center justify-center p-1 rounded transition-all hover:bg-opacity-80"
                          style={{
                            background: openMenuDaemonSetUID() === dsKey ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                            color: 'var(--text-primary)',
                            border: '1px solid var(--border-color)',
                            cursor: 'pointer',
                          }}
                          title="Actions"
                        >
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                          </svg>
                        </button>
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
                Showing {((currentPage() - 1) * pageSize()) + 1} - {Math.min(currentPage() * pageSize(), filteredAndSorted().length)} of {filteredAndSorted().length} DaemonSets
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

      {/* Action Menu Portal - rendered outside table to survive row re-renders */}
      <Show when={openMenuDaemonSetUID() && menuAnchorPosition() && currentMenuDaemonSet()}>
        <Portal>
          <div
            data-action-menu
            class="fixed py-2 rounded-lg shadow-xl min-w-[180px]"
            style={{
              top: `${menuAnchorPosition()!.top}px`,
              left: `${menuAnchorPosition()!.left}px`,
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              'box-shadow': '0 10px 40px rgba(0, 0, 0, 0.3)',
              'z-index': 9998,
            }}
            onMouseEnter={() => setMenuHovering(true)}
            onMouseLeave={() => setMenuHovering(false)}
          >
            <For each={[
              {
                label: 'Restart',
                icon: 'restart',
                onClick: () => { 
                  restart(currentMenuDaemonSet()!); 
                  closeActionMenu(); 
                },
              },
              { 
                label: 'View YAML', 
                icon: 'yaml', 
                onClick: () => { 
                  setSelected(currentMenuDaemonSet()!);
                  setYamlKey(`${currentMenuDaemonSet()!.name}|${currentMenuDaemonSet()!.namespace}`);
                  setShowYaml(true);
                  closeActionMenu();
                } 
              },
              { 
                label: 'Edit YAML', 
                icon: 'edit', 
                onClick: () => { 
                  setSelected(currentMenuDaemonSet()!);
                  setYamlKey(`${currentMenuDaemonSet()!.name}|${currentMenuDaemonSet()!.namespace}`);
                  setShowEdit(true);
                  closeActionMenu();
                } 
              },
              { 
                label: 'Delete', 
                icon: 'delete', 
                onClick: () => { 
                  setSelected(currentMenuDaemonSet()!);
                  deleteDaemonSet(currentMenuDaemonSet()!); 
                  closeActionMenu(); 
                }, 
                variant: 'danger' as const, 
                divider: true 
              },
            ]}>
              {(action) => (
                <>
                  <Show when={action.divider}>
                    <div class="my-1 border-t" style={{ 'border-color': 'var(--border-color)' }} />
                  </Show>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      action.onClick();
                    }}
                    class="w-full flex items-center gap-3 px-4 py-2 text-sm transition-colors"
                    style={{
                      color: action.variant === 'danger' ? 'var(--error-color)' : 'var(--text-primary)',
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      'text-align': 'left',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = action.variant === 'danger'
                        ? 'rgba(239, 68, 68, 0.1)'
                        : 'var(--bg-tertiary)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d={actionIcons[action.icon] || actionIcons.restart}
                      />
                    </svg>
                    {action.label}
                  </button>
                </>
              )}
            </For>
          </div>
        </Portal>
      </Show>

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

      {/* Details Modal */}
      <Modal isOpen={showDetails()} onClose={() => { setShowDetails(false); setSelected(null); }} title={`DaemonSet: ${selected()?.name}`} size="xl">
        <Show when={selected()}>
          {(() => {
            const [daemonSetDetails] = createResource(
              () => selected() ? { name: selected()!.name, ns: selected()!.namespace } : null,
              async (params) => {
                if (!params) return null;
                return api.getDaemonSetDetails(params.name, params.ns);
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
                        <Show when={!daemonSetDetails.loading && daemonSetDetails()}>
                          {(details) => {
                            const readyParts = (details().ready || selected()?.ready?.toString() || '0/0').split('/');
                            const isReady = readyParts[0] === readyParts[1] && parseInt(readyParts[0]) > 0;
                            return (
                              <span class={`badge ${isReady ? 'badge-success' : 'badge-warning'}`}>
                                {details().ready || `${selected()?.ready || 0}/${selected()?.desired || 0}`}
                              </span>
                            );
                          }}
                        </Show>
                        <Show when={daemonSetDetails.loading}>
                          <div class="spinner" style={{ width: '16px', height: '16px' }} />
                        </Show>
                      </div>
                    </div>
                    <div class="p-3 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
                      <div class="text-xs" style={{ color: 'var(--text-muted)' }}>Available</div>
                      <div style={{ color: 'var(--text-primary)' }}>
                        <Show when={!daemonSetDetails.loading && daemonSetDetails()}>
                          {(details) => details().available || selected()?.available || '-'}
                        </Show>
                        <Show when={daemonSetDetails.loading}>
                          <div class="spinner" style={{ width: '16px', height: '16px' }} />
                        </Show>
                      </div>
                    </div>
                    <div class="p-3 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
                      <div class="text-xs" style={{ color: 'var(--text-muted)' }}>Desired</div>
                      <div style={{ color: 'var(--text-primary)' }}>
                        <Show when={!daemonSetDetails.loading && daemonSetDetails()}>
                          {(details) => details().desired || selected()?.desired || '-'}
                        </Show>
                        <Show when={daemonSetDetails.loading}>
                          <div class="spinner" style={{ width: '16px', height: '16px' }} />
                        </Show>
                      </div>
                    </div>
                    <div class="p-3 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
                      <div class="text-xs" style={{ color: 'var(--text-muted)' }}>Current</div>
                      <div style={{ color: 'var(--text-primary)' }}>
                        <Show when={!daemonSetDetails.loading && daemonSetDetails()}>
                          {(details) => details().current || selected()?.current || '-'}
                        </Show>
                        <Show when={daemonSetDetails.loading}>
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
                    <div class="p-3 rounded-lg col-span-2" style={{ background: 'var(--bg-tertiary)' }}>
                      <div class="text-xs" style={{ color: 'var(--text-muted)' }}>Selector</div>
                      <div style={{ color: 'var(--text-primary)' }} class="text-sm break-all">
                        <Show when={!daemonSetDetails.loading && daemonSetDetails()}>
                          {(details) => details().selector || '-'}
                        </Show>
                        <Show when={daemonSetDetails.loading}>
                          <div class="spinner" style={{ width: '16px', height: '16px' }} />
                        </Show>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Related Resources Section */}
                <Show when={daemonSetDetails()}>
                  <RelatedResources
                    kind="daemonset"
                    name={daemonSetDetails()!.name}
                    namespace={daemonSetDetails()!.namespace}
                    relatedData={daemonSetDetails()}
                  />
                </Show>

                {/* Pods */}
                <Show when={!daemonSetDetails.loading && daemonSetDetails()?.pods && daemonSetDetails()!.pods.length > 0}>
                  <div>
                    <h3 class="text-sm font-semibold mb-3" style={{ color: 'var(--text-secondary)' }}>Pods ({daemonSetDetails()!.pods.length})</h3>
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
                          <For each={daemonSetDetails()!.pods}>
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
                <Show when={!daemonSetDetails.loading && daemonSetDetails()?.conditions && daemonSetDetails()!.conditions.length > 0}>
                  <div>
                    <h3 class="text-sm font-semibold mb-3" style={{ color: 'var(--text-secondary)' }}>Conditions</h3>
                    <div class="space-y-2">
                      <For each={daemonSetDetails()!.conditions}>
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
                <div class="grid grid-cols-2 md:grid-cols-5 gap-2 pt-3">
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
                      deleteDaemonSet(selected()!);
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
      <DescribeModal isOpen={showDescribe()} onClose={() => setShowDescribe(false)} resourceType="daemonset" name={selected()?.name || ''} namespace={selected()?.namespace} />

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteConfirm()}
        onClose={() => {
          if (!deleting()) {
            setShowDeleteConfirm(false);
            setShowDetails(false);
          }
        }}
        title="Delete DaemonSet"
        message={selected() ? `Are you sure you want to delete the DaemonSet "${selected()!.name}"?` : 'Are you sure you want to delete this DaemonSet?'}
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
        resourceType="DaemonSets"
        selectedItems={bulk.getSelectedItems(filteredAndSorted())}
        onConfirm={async () => {
          const selectedDaemonSets = bulk.getSelectedItems(filteredAndSorted());

          // Delete each daemonset
          for (const ds of selectedDaemonSets) {
            try {
              await api.deleteDaemonSet(ds.name, ds.namespace);
            } catch (error) {
              console.error(`Failed to delete daemonset ${ds.namespace}/${ds.name}:`, error);
              addNotification(
                `Failed to delete daemonset ${ds.name}: ${error instanceof Error ? error.message : 'Unknown error'}`,
                'error'
              );
            }
          }

          // Clear selection and refetch
          bulk.deselectAll();
          refetch();

          // Show success notification
          addNotification(
            `Successfully deleted ${selectedDaemonSets.length} daemonset${selectedDaemonSets.length !== 1 ? 's' : ''}`,
            'success'
          );

          // Close modal
          setShowBulkDeleteModal(false);
        }}
      />
    </div>
  );
};

export default DaemonSets;
