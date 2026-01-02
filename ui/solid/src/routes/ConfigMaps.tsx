import { Component, For, Show, createMemo, createSignal, createResource, onMount } from 'solid-js';
import { api } from '../services/api';
import { clusterStatus } from '../stores/cluster';
import { addNotification } from '../stores/ui';
import { getThemeBackground, getThemeBorderColor } from '../utils/themeBackground';
import {
  selectedNamespaces,
  setGlobalLoading,
} from '../stores/globalStore';
import { createCachedResource } from '../utils/resourceCache';
import Modal from '../components/Modal';
import YAMLViewer from '../components/YAMLViewer';
import YAMLEditor from '../components/YAMLEditor';
import CommandPreview from '../components/CommandPreview';
import DescribeModal from '../components/DescribeModal';
import ConfirmationModal from '../components/ConfirmationModal';
import RelatedResources from '../components/RelatedResources';
import ActionMenu from '../components/ActionMenu';
import { BulkActions, SelectionCheckbox, SelectAllCheckbox } from '../components/BulkActions';
import { BulkDeleteModal } from '../components/BulkDeleteModal';
import { useBulkSelection } from '../hooks/useBulkSelection';
import { startExecution } from '../stores/executionPanel';
import { getInitialFontSize, getInitialFontFamily, getFontFamilyCSS, saveFontSize, saveFontFamily } from '../utils/resourceTableFontDefaults';

interface ConfigMap {
  name: string;
  namespace: string;
  data: number;
  age: string;
  keys?: string[];
}

type SortField = 'name' | 'namespace' | 'data' | 'age';
type SortDirection = 'asc' | 'desc';

const ConfigMaps: Component = () => {
  const [search, setSearch] = createSignal('');
  const [sortField, setSortField] = createSignal<SortField>('name');
  const [sortDirection, setSortDirection] = createSignal<SortDirection>('asc');
  const [currentPage, setCurrentPage] = createSignal(1);
  const [pageSize, setPageSize] = createSignal(20);
  const [selected, setSelected] = createSignal<ConfigMap | null>(null);
  const bulk = useBulkSelection<ConfigMap>();
  const [showBulkDeleteModal, setShowBulkDeleteModal] = createSignal(false);

  // Modal states
  const [showYaml, setShowYaml] = createSignal(false);
  const [showEdit, setShowEdit] = createSignal(false);
  const [showDetails, setShowDetails] = createSignal(false);
  const [showDescribe, setShowDescribe] = createSignal(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = createSignal(false);
  const [deleting, setDeleting] = createSignal(false);
  const [yamlKey, setYamlKey] = createSignal<string | null>(null);
  // Font size and family using shared utility with 14px and Monaco defaults
  const [fontSize, setFontSize] = createSignal(getInitialFontSize('configmaps'));
  const [fontFamily, setFontFamily] = createSignal(getInitialFontFamily('configmaps'));

  const handleFontSizeChange = (size: number) => {
    setFontSize(size);
    saveFontSize('configmaps', size);
  };

  const handleFontFamilyChange = (family: string) => {
    setFontFamily(family);
    saveFontFamily('configmaps', family);
  };

  // Determine namespace parameter from global store (same pattern as Services/Ingresses)
  const getNamespaceParam = (): string | undefined => {
    const namespaces = selectedNamespaces();
    if (namespaces.length === 0) return undefined; // All namespaces
    if (namespaces.length === 1) return namespaces[0];
    // For multiple namespaces, backend should handle it via query params
    // For now, pass first namespace (backend may need to be updated to handle multiple)
    return namespaces[0];
  };

  // CACHED RESOURCE - Uses globalStore and cache (same pattern as Services/Ingresses)
  const configMapsCache = createCachedResource<ConfigMap[]>(
    'configmaps',
    async () => {
      setGlobalLoading(true);
      try {
        const namespaceParam = getNamespaceParam();
        const configmaps = await api.getConfigMaps(namespaceParam);
        return configmaps;
      } catch (error) {
        console.error('[ConfigMaps] Error fetching configmaps:', error);
        addNotification(`❌ Failed to fetch ConfigMaps: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
        throw error;
      } finally {
        setGlobalLoading(false);
      }
    },
    {
      ttl: 15000, // 15 seconds
      backgroundRefresh: true,
    }
  );

  // Get configmaps from cache
  const configmaps = createMemo(() => configMapsCache.data() || []);
  
  // Refetch function for updates
  const refetch = () => configMapsCache.refetch();
  
  // Initial load on mount
  onMount(() => {
    if (!configMapsCache.data()) {
      configMapsCache.refetch();
    }
  });
  const [yamlContent] = createResource(
    () => yamlKey(),
    async (key) => {
      if (!key) return '';
      const [name, ns] = key.split('|');
      if (!name || !ns) return '';
      try {
        const data = await api.getConfigMapYAML(name, ns);
        return data.yaml || '';
      } catch (error) {
        console.error('Failed to fetch configmap YAML:', error);
        addNotification(`Failed to load YAML: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
        return '';
      }
    }
  );

  const handleSaveYAML = async (yaml: string) => {
    const cm = selected();
    if (!cm) return;

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
      label: `Apply ConfigMap YAML: ${cm.name}`,
      command: '__k8s-apply-yaml',
      args: [],
      mode: 'apply',
      kubernetesEquivalent: true,
      namespace: cm.namespace,
      context: status.context,
      userAction: 'configmaps-apply-yaml',
      dryRun: false,
      allowClusterWide: false,
      resource: 'configmaps',
      action: 'update',
      intent: 'apply-yaml',
      yaml: trimmed,
    });

    // Close the editor once the execution has been started; the ExecutionPanel
    // now owns the UX for tracking success/failure.
    setShowEdit(false);

    // Trigger a background refetch after a short delay so the table reflects
    // any changes from the apply.
    setTimeout(() => refetch(), 1500);
  };

  const handleDryRunYAML = async (yaml: string) => {
    const cm = selected();
    if (!cm) return;

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
      label: `Dry run ConfigMap YAML: ${cm.name}`,
      command: '__k8s-apply-yaml',
      args: [],
      mode: 'dry-run',
      kubernetesEquivalent: true,
      namespace: cm.namespace,
      context: status.context,
      userAction: 'configmaps-apply-yaml-dry-run',
      dryRun: true,
      allowClusterWide: false,
      resource: 'configmaps',
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
    let all = configmaps() || [];
    const query = search().toLowerCase();

    // Filter
    if (query) {
      all = all.filter((c: ConfigMap) =>
        c.name.toLowerCase().includes(query) ||
        c.namespace.toLowerCase().includes(query)
      );
    }

    // Sort
    const field = sortField();
    const direction = sortDirection();
    all = [...all].sort((a: ConfigMap, b: ConfigMap) => {
      let comparison = 0;
      switch (field) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'namespace':
          comparison = a.namespace.localeCompare(b.namespace);
          break;
        case 'data':
          comparison = a.data - b.data;
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
  const paginated = createMemo(() => {
    const start = (currentPage() - 1) * pageSize();
    return filteredAndSorted().slice(start, start + pageSize());
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

  const openDetails = (cm: ConfigMap) => {
    setSelected(cm);
    setShowDetails(true);
  };

  const handleDeleteConfirm = async () => {
    const cm = selected();
    if (!cm) return;
    
    setDeleting(true);
    try {
      await api.deleteConfigMap(cm.name, cm.namespace);
      addNotification(`ConfigMap ${cm.name} deleted successfully`, 'success');
      refetch();
      setSelected(null);
      setShowDeleteConfirm(false);
      setShowDetails(false);
    } catch (error) {
      console.error('Failed to delete ConfigMap:', error);
      addNotification(`Failed to delete ConfigMap: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    } finally {
      setDeleting(false);
    }
  };

  const deleteConfigMap = (cm: ConfigMap) => {
    setSelected(cm);
    setShowDeleteConfirm(true);
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
        resourceType="ConfigMaps"
      />

      {/* Header - reduced size */}
      <div class="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 class="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>ConfigMaps</h1>
          <p class="text-xs" style={{ color: 'var(--text-secondary)' }}>Configuration data storage</p>
        </div>
        <div class="flex items-center gap-3">
          <button
            onClick={(e) => {
              const btn = e.currentTarget;
              btn.classList.add('refreshing');
              setTimeout(() => btn.classList.remove('refreshing'), 500);
              refetch();
            }}
            class="icon-btn"
            style={{ background: 'var(--bg-secondary)' }}
            title="Refresh ConfigMaps"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {/* Status summary - compact */}
      <div class="flex flex-wrap items-center gap-2">
        <div class="card px-3 py-1.5 rounded border cursor-pointer hover:opacity-80 flex items-center gap-2" style={{ 'border-left': '2px solid var(--accent-primary)', 'border-color': 'var(--border-color)' }}>
          <span style={{ color: 'var(--text-secondary)' }} class="text-xs">Total</span>
          <span class="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{(configmaps() || []).length}</span>
        </div>
        <div class="card px-3 py-1.5 rounded border cursor-pointer hover:opacity-80 flex items-center gap-2" style={{ 'border-left': '2px solid #8b5cf6', 'border-color': 'var(--border-color)' }}>
          <span style={{ color: 'var(--text-secondary)' }} class="text-xs">Filtered</span>
          <span class="text-sm font-bold" style={{ color: '#8b5cf6' }}>{filteredAndSorted().length}</span>
        </div>
        <div class="card px-3 py-1.5 rounded border cursor-pointer hover:opacity-80 flex items-center gap-2" style={{ 'border-left': '2px solid #22c55e', 'border-color': 'var(--border-color)' }}>
          <span style={{ color: 'var(--text-secondary)' }} class="text-xs">Namespaces</span>
          <span class="text-sm font-bold" style={{ color: '#22c55e' }}>
            {new Set((configmaps() || []).map((c: ConfigMap) => c.namespace)).size}
          </span>
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

      {/* Error display */}
      <Show when={configMapsCache.error()}>
        <div class="card p-4 mb-4" style={{ background: 'var(--error-bg)', border: '1px solid var(--error-color)' }}>
          <div class="flex items-center gap-2">
            <span style={{ color: 'var(--error-color)' }}>❌</span>
            <span style={{ color: 'var(--error-color)' }}>
              Error loading ConfigMaps: {configMapsCache.error()?.message || 'Unknown error'}
            </span>
          </div>
        </div>
      </Show>

      {/* ConfigMaps table */}
      <div class="w-full" style={{ background: getThemeBackground(), margin: '0', padding: '0', border: `1px solid ${getThemeBorderColor()}`, 'border-radius': '4px' }}>
        <Show
          when={!configMapsCache.loading() || configMapsCache.data() !== undefined}
          fallback={
            <div class="p-8 text-center">
              <div class="spinner mx-auto mb-2" />
              <span style={{ color: 'var(--text-muted)' }}>Loading ConfigMaps...</span>
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
                <tr style={{
                  height: `${Math.max(24, fontSize() * 1.7)}px`,
                  'font-family': getFontFamilyCSS(fontFamily()),
                  'font-weight': '900',
                  color: '#0ea5e9',
                  'font-size': `${fontSize()}px`,
                  'line-height': `${Math.max(24, fontSize() * 1.7)}px`
                }}>
                  <th style={{
                    padding: '0 8px',
                    'text-align': 'left',
                    'font-weight': 'bold',
                    'line-height': '24px',
                    height: '24px',
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
                  <th class="cursor-pointer select-none whitespace-nowrap" style={{
                    padding: '0 8px',
                    'text-align': 'left',
                    'font-weight': '900',
                    color: '#0ea5e9',
                    'font-size': `${fontSize()}px`,
                    height: `${Math.max(24, fontSize() * 1.7)}px`,
                    'line-height': `${Math.max(24, fontSize() * 1.7)}px`,
                    border: 'none'
                  }} onClick={() => handleSort('name')}>
                    <div class="flex items-center gap-1">Name <SortIcon field="name" /></div>
                  </th>
                  <th class="cursor-pointer select-none whitespace-nowrap" style={{
                    padding: '0 8px',
                    'text-align': 'left',
                    'font-weight': '900',
                    color: '#0ea5e9',
                    'font-size': `${fontSize()}px`,
                    height: `${Math.max(24, fontSize() * 1.7)}px`,
                    'line-height': `${Math.max(24, fontSize() * 1.7)}px`,
                    border: 'none'
                  }} onClick={() => handleSort('namespace')}>
                    <div class="flex items-center gap-1">Namespace <SortIcon field="namespace" /></div>
                  </th>
                  <th class="cursor-pointer select-none whitespace-nowrap" style={{
                    padding: '0 8px',
                    'text-align': 'left',
                    'font-weight': '900',
                    color: '#0ea5e9',
                    'font-size': `${fontSize()}px`,
                    height: `${Math.max(24, fontSize() * 1.7)}px`,
                    'line-height': `${Math.max(24, fontSize() * 1.7)}px`,
                    border: 'none'
                  }} onClick={() => handleSort('data')}>
                    <div class="flex items-center gap-1">Data <SortIcon field="data" /></div>
                  </th>
                  <th class="cursor-pointer select-none whitespace-nowrap" style={{
                    padding: '0 8px',
                    'text-align': 'left',
                    'font-weight': '900',
                    color: '#0ea5e9',
                    'font-size': `${fontSize()}px`,
                    height: `${Math.max(24, fontSize() * 1.7)}px`,
                    'line-height': `${Math.max(24, fontSize() * 1.7)}px`,
                    border: 'none'
                  }} onClick={() => handleSort('age')}>
                    <div class="flex items-center gap-1">Age <SortIcon field="age" /></div>
                  </th>
                  <th class="whitespace-nowrap" style={{
                    padding: '0 8px',
                    'text-align': 'left',
                    'font-weight': '900',
                    color: '#0ea5e9',
                    'font-size': `${fontSize()}px`,
                    height: `${Math.max(24, fontSize() * 1.7)}px`,
                    'line-height': `${Math.max(24, fontSize() * 1.7)}px`,
                    border: 'none'
                  }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                <For each={paginated()} fallback={
                  <tr><td colspan="6" class="text-center py-8" style={{ color: 'var(--text-muted)' }}>No ConfigMaps found</td></tr>
                }>
                  {(cm: ConfigMap) => {
                    const textColor = '#0ea5e9';
                    return (
                    <tr>
                      <td style={{
                        padding: '0 8px',
                        'text-align': 'left',
                        height: `${Math.max(24, fontSize() * 1.7)}px`,
                        'line-height': `${Math.max(24, fontSize() * 1.7)}px`,
                        border: 'none'
                      }}>
                        <SelectionCheckbox
                          checked={bulk.isSelected(cm)}
                          onChange={() => bulk.toggleSelection(cm)}
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
                          onClick={() => { setSelected(cm); setShowDetails(true); }}
                          class="font-medium hover:underline text-left"
                          style={{ color: 'var(--accent-primary)' }}
                        >
                          {cm.name.length > 40 ? cm.name.slice(0, 37) + '...' : cm.name}
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
                      }}>{cm.namespace}</td>
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
                        <span class="badge badge-info">{cm.data} keys</span>
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
                      }}>{cm.age}</td>
                      <td style={{
                        padding: '0 8px',
                        'text-align': 'left',
                        height: `${Math.max(24, fontSize() * 1.7)}px`,
                        'line-height': `${Math.max(24, fontSize() * 1.7)}px`,
                        border: 'none'
                      }}>
                        <ActionMenu
                          actions={[
                            { label: 'View YAML', icon: 'yaml', onClick: () => { 
                              setSelected(cm);
                              setYamlKey(`${cm.name}|${cm.namespace}`);
                              setShowYaml(true);
                            } },
                            { label: 'Edit YAML', icon: 'edit', onClick: () => { 
                              setSelected(cm);
                              setYamlKey(`${cm.name}|${cm.namespace}`);
                              setShowEdit(true);
                            } },
                            { label: 'Delete', icon: 'delete', onClick: () => { setSelected(cm); deleteConfigMap(cm); }, variant: 'danger', divider: true },
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
                Showing {((currentPage() - 1) * pageSize()) + 1} - {Math.min(currentPage() * pageSize(), filteredAndSorted().length)} of {filteredAndSorted().length} ConfigMaps
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

      {/* Details Modal */}
      <Modal isOpen={showDetails()} onClose={() => { setShowDetails(false); setSelected(null); }} title={`ConfigMap: ${selected()?.name}`} size="xl">
        <Show when={selected()}>
          {(() => {
            const [cmDetails] = createResource(
              () => selected() ? { name: selected()!.name, ns: selected()!.namespace } : null,
              async (params) => {
                if (!params) return null;
                return api.getConfigMapDetails(params.name, params.ns);
              }
            );
            return (
              <div class="space-y-6">
                {/* Basic Info */}
                <div>
                  <h3 class="text-sm font-semibold mb-3" style={{ color: 'var(--text-secondary)' }}>Basic Information</h3>
                  <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div class="p-3 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
                      <div class="text-xs" style={{ color: 'var(--text-muted)' }}>Data Keys</div>
                      <div style={{ color: 'var(--text-primary)' }}>
                        <Show when={!cmDetails.loading && cmDetails()}>
                          {(details) => {
                            const dataKeys = Object.keys(details().data || {});
                            const binaryKeys = Object.keys(details().binaryData || {});
                            return dataKeys.length + binaryKeys.length || selected()?.data || 0;
                          }}
                        </Show>
                        <Show when={cmDetails.loading}>
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
            </div>
                </div>

                {/* Related Resources Section */}
                <Show when={cmDetails()}>
                  <RelatedResources
                    kind="configmap"
                    name={cmDetails()!.name}
                    namespace={cmDetails()!.namespace}
                    relatedData={cmDetails()}
                  />
                </Show>

                {/* Data */}
                <Show when={!cmDetails.loading && cmDetails()?.data && Object.keys(cmDetails()!.data).length > 0}>
                  <div>
                    <h3 class="text-sm font-semibold mb-3" style={{ color: 'var(--text-secondary)' }}>Data</h3>
                    <div class="rounded-lg border overflow-x-auto" style={{ 'border-color': 'var(--border-color)', background: 'var(--bg-secondary)' }}>
                      <table class="w-full">
                        <thead>
                          <tr style={{ background: 'var(--bg-tertiary)' }}>
                            <th class="px-4 py-2 text-left text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Key</th>
                            <th class="px-4 py-2 text-left text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Value</th>
                          </tr>
                        </thead>
                        <tbody>
                          <For each={Object.entries(cmDetails()!.data || {})}>
                            {([key, value]) => (
                              <tr class="border-b" style={{ 'border-color': 'var(--border-color)' }}>
                                <td class="px-4 py-2 text-sm font-mono" style={{ color: 'var(--text-primary)' }}>{key}</td>
                                <td class="px-4 py-2 text-sm font-mono break-all" style={{ color: 'var(--text-primary)' }}>
                                  <pre class="whitespace-pre-wrap" style={{ 'max-width': '500px', overflow: 'auto' }}>{String(value)}</pre>
                                </td>
                              </tr>
                            )}
                          </For>
                        </tbody>
                      </table>
            </div>
          </div>
                </Show>

                {/* Binary Data */}
                <Show when={!cmDetails.loading && cmDetails()?.binaryData && Object.keys(cmDetails()!.binaryData).length > 0}>
                  <div>
                    <h3 class="text-sm font-semibold mb-3" style={{ color: 'var(--text-secondary)' }}>Binary Data</h3>
                    <div class="rounded-lg border overflow-x-auto" style={{ 'border-color': 'var(--border-color)', background: 'var(--bg-secondary)' }}>
                      <table class="w-full">
                        <thead>
                          <tr style={{ background: 'var(--bg-tertiary)' }}>
                            <th class="px-4 py-2 text-left text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Key</th>
                            <th class="px-4 py-2 text-left text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Size</th>
                          </tr>
                        </thead>
                        <tbody>
                          <For each={Object.keys(cmDetails()!.binaryData || {})}>
                            {(key) => (
                              <tr class="border-b" style={{ 'border-color': 'var(--border-color)' }}>
                                <td class="px-4 py-2 text-sm font-mono" style={{ color: 'var(--text-primary)' }}>{key}</td>
                                <td class="px-4 py-2 text-sm" style={{ color: 'var(--text-primary)' }}>
                                  {cmDetails()!.binaryData[key] ? `${(cmDetails()!.binaryData[key] as string).length} bytes` : '-'}
                                </td>
                              </tr>
                            )}
                          </For>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </Show>

                {/* Actions */}
                <div class="grid grid-cols-2 md:grid-cols-4 gap-2 pt-3">
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
                      deleteConfigMap(selected()!);
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
              {(cm) => (
                <CommandPreview
                  label="Equivalent kubectl command"
                  defaultCollapsed={true}
                  command={`kubectl apply -f - -n ${cm().namespace || 'default'}  # YAML from editor is sent via Kubernetes API`}
                  description="This is an equivalent kubectl-style view of the ConfigMap update. The actual change is applied via Kubernetes API."
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

      {/* Describe Modal */}
      <DescribeModal
        isOpen={showDescribe()}
        onClose={() => setShowDescribe(false)}
        resourceType="configmap"
        name={selected()?.name || ''}
        namespace={selected()?.namespace}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteConfirm()}
        onClose={() => {
          if (!deleting()) {
            setShowDeleteConfirm(false);
            setShowDetails(false);
          }
        }}
        title="Delete ConfigMap"
        message={selected() ? `Are you sure you want to delete the ConfigMap "${selected()!.name}"?` : 'Are you sure you want to delete this ConfigMap?'}
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
        resourceType="ConfigMaps"
        selectedItems={bulk.getSelectedItems(filteredAndSorted())}
        onConfirm={async () => {
          const selectedConfigMaps = bulk.getSelectedItems(filteredAndSorted());

          // Delete each ConfigMap
          for (const cm of selectedConfigMaps) {
            try {
              await api.deleteConfigMap(cm.name, cm.namespace);
            } catch (error) {
              console.error(`Failed to delete ConfigMap ${cm.namespace}/${cm.name}:`, error);
              addNotification(
                `Failed to delete ConfigMap ${cm.name}: ${error instanceof Error ? error.message : 'Unknown error'}`,
                'error'
              );
            }
          }

          // Clear selection and refetch
          bulk.deselectAll();
          refetch();

          // Show success notification
          addNotification(
            `Successfully deleted ${selectedConfigMaps.length} ConfigMap(s)`,
            'success'
          );
        }}
      />
    </div>
  );
};

export default ConfigMaps;
