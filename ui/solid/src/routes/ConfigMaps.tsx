import { Component, For, Show, createMemo, createSignal, createResource, onMount } from 'solid-js';
import { api } from '../services/api';
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
import DescribeModal from '../components/DescribeModal';
import ActionMenu from '../components/ActionMenu';
import { BulkActions, SelectionCheckbox, SelectAllCheckbox } from '../components/BulkActions';
import { BulkDeleteModal } from '../components/BulkDeleteModal';
import { useBulkSelection } from '../hooks/useBulkSelection';

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
  const [yamlKey, setYamlKey] = createSignal<string | null>(null);
  const [fontSize, setFontSize] = createSignal(parseInt(localStorage.getItem('configmaps-font-size') || '14'));
  const [fontFamily, setFontFamily] = createSignal(localStorage.getItem('configmaps-font-family') || 'Monaco');

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
    try {
      await api.updateConfigMap(cm.name, cm.namespace, yaml);
      addNotification(`✅ ConfigMap ${cm.name} updated successfully`, 'success');
      setShowEdit(false);
      setTimeout(() => refetch(), 500);
      setTimeout(() => refetch(), 2000);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      addNotification(`❌ Failed to update ConfigMap: ${errorMsg}`, 'error');
      throw error;
    }
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

  const deleteConfigMap = async (cm: ConfigMap) => {
    if (!confirm(`Are you sure you want to delete ConfigMap "${cm.name}" in namespace "${cm.namespace}"?`)) return;
    try {
      await api.deleteConfigMap(cm.name, cm.namespace);
      addNotification(`ConfigMap ${cm.name} deleted successfully`, 'success');
      refetch();
    } catch (error) {
      console.error('Failed to delete ConfigMap:', error);
      addNotification(`Failed to delete ConfigMap: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    }
  };

  return (
    <div class="space-y-4">
      {/* Bulk Actions */}
      <BulkActions
        selectedCount={bulk.selectedCount()}
        totalCount={filteredAndSorted().length}
        onSelectAll={() => bulk.selectAll(filteredAndSorted())}
        onDeselectAll={() => bulk.deselectAll()}
        onDelete={() => setShowBulkDeleteModal(true)}
        resourceType="ConfigMaps"
      />

      {/* Header */}
      <div class="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 class="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>ConfigMaps</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Configuration data storage</p>
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

      {/* Status summary */}
      <div class="flex flex-wrap items-center gap-3">
        <div class="card px-4 py-2 cursor-pointer hover:opacity-80 flex items-center gap-2" style={{ 'border-left': '3px solid var(--accent-primary)' }}>
          <span style={{ color: 'var(--text-secondary)' }} class="text-sm">Total</span>
          <span class="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{(configmaps() || []).length}</span>
        </div>
        <div class="card px-4 py-2 cursor-pointer hover:opacity-80 flex items-center gap-2" style={{ 'border-left': '3px solid #8b5cf6' }}>
          <span style={{ color: 'var(--text-secondary)' }} class="text-sm">Filtered</span>
          <span class="text-xl font-bold" style={{ color: '#8b5cf6' }}>{filteredAndSorted().length}</span>
        </div>
        <div class="card px-4 py-2 cursor-pointer hover:opacity-80 flex items-center gap-2" style={{ 'border-left': '3px solid #22c55e' }}>
          <span style={{ color: 'var(--text-secondary)' }} class="text-sm">Namespaces</span>
          <span class="text-xl font-bold" style={{ color: '#22c55e' }}>
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
                          onClick={() => { setSelected(cm); setShowDescribe(true); }}
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
                            { label: 'Delete', icon: 'delete', onClick: () => deleteConfigMap(cm), variant: 'danger', divider: true },
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
      <Modal isOpen={showDetails()} onClose={() => setShowDetails(false)} title={`ConfigMap: ${selected()?.name}`} size="lg">
        <Show when={selected()}>
          <div class="space-y-4">
            <div class="grid grid-cols-2 gap-4">
              <div class="p-3 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
                <div class="text-sm" style={{ color: 'var(--text-muted)' }}>Name</div>
                <div style={{ color: 'var(--text-primary)' }}>{selected()?.name}</div>
              </div>
              <div class="p-3 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
                <div class="text-sm" style={{ color: 'var(--text-muted)' }}>Namespace</div>
                <div style={{ color: 'var(--text-primary)' }}>{selected()?.namespace}</div>
              </div>
              <div class="p-3 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
                <div class="text-sm" style={{ color: 'var(--text-muted)' }}>Data Keys</div>
                <div style={{ color: 'var(--accent-primary)' }} class="font-semibold">{selected()?.data}</div>
              </div>
              <div class="p-3 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
                <div class="text-sm" style={{ color: 'var(--text-muted)' }}>Age</div>
                <div style={{ color: 'var(--text-primary)' }}>{selected()?.age}</div>
              </div>
            </div>
            <div class="flex gap-2 pt-4">
              <button onClick={() => { setShowDetails(false); setShowYaml(true); }} class="btn-primary flex-1">View YAML</button>
              <button onClick={() => { setShowDetails(false); setShowDescribe(true); }} class="btn-secondary flex-1">Describe</button>
            </div>
          </div>
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
            <YAMLEditor
              yaml={yamlContent() || ''}
              title={selected()?.name}
              onSave={handleSaveYAML}
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
