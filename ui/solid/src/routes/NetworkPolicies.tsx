import { Component, For, Show, createMemo, createSignal, createResource, onMount } from 'solid-js';
import { api } from '../services/api';
import { clusterStatus } from '../stores/cluster';
import { addNotification } from '../stores/ui';
import {
  selectedNamespaces,
  setGlobalLoading,
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

interface NetworkPolicy {
  name: string;
  namespace: string;
  selector: string;
  ingress: number;
  egress: number;
  policyTypes: string[];
  age: string;
}

type SortField = 'name' | 'namespace' | 'age';
type SortDirection = 'asc' | 'desc';

const NetworkPolicies: Component = () => {
  const [search, setSearch] = createSignal('');
  const [sortField, setSortField] = createSignal<SortField>('name');
  const [sortDirection, setSortDirection] = createSignal<SortDirection>('asc');
  const [currentPage, setCurrentPage] = createSignal(1);
  const [pageSize, setPageSize] = createSignal(20);
  const [selected, setSelected] = createSignal<NetworkPolicy | null>(null);
  const [showYaml, setShowYaml] = createSignal(false);
  const [showEdit, setShowEdit] = createSignal(false);
  const [showDescribe, setShowDescribe] = createSignal(false);
  const [showDetails, setShowDetails] = createSignal(false);
  const [yamlKey, setYamlKey] = createSignal<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = createSignal(false);
  const [deleting, setDeleting] = createSignal(false);
  const [fontSize, setFontSize] = createSignal(parseInt(localStorage.getItem('networkpolicies-font-size') || '14'));
  const [fontFamily, setFontFamily] = createSignal(localStorage.getItem('networkpolicies-font-family') || 'Monaco');

  // Bulk selection
  const bulk = useBulkSelection<NetworkPolicy>();
  const [showBulkDeleteModal, setShowBulkDeleteModal] = createSignal(false);

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
    localStorage.setItem('networkpolicies-font-size', size.toString());
  };

  const handleFontFamilyChange = (family: string) => {
    setFontFamily(family);
    localStorage.setItem('networkpolicies-font-family', family);
  };

  const getNamespaceParam = (): string | undefined => {
    const namespaces = selectedNamespaces();
    if (namespaces.length === 0) return undefined;
    if (namespaces.length === 1) return namespaces[0];
    return namespaces[0];
  };

  const policiesCache = createCachedResource<NetworkPolicy[]>(
    'networkpolicies',
    async () => {
      setGlobalLoading(true);
      try {
        const namespaceParam = getNamespaceParam();
        const policies = await api.getNetworkPolicies(namespaceParam);
        return policies;
      } catch (error) {
        console.error('[NetworkPolicies] Error fetching policies:', error);
        addNotification(`❌ Failed to fetch network policies: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
        throw error;
      } finally {
        setGlobalLoading(false);
      }
    },
    {
      ttl: 15000,
      backgroundRefresh: true,
    }
  );

  const policies = createMemo(() => policiesCache.data() || []);
  const refetch = () => policiesCache.refetch();

  onMount(() => {
    if (!policiesCache.data()) {
      policiesCache.refetch();
    }
  });

  const [yamlContent] = createResource(
    () => yamlKey(),
    async (key) => {
      if (!key) return '';
      const [name, ns] = key.split('|');
      if (!name || !ns) return '';
      try {
        const data = await api.getNetworkPolicyYAML(name, ns);
        return data.yaml || '';
      } catch (error) {
        console.error('Failed to fetch network policy YAML:', error);
        addNotification(`Failed to load YAML: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
        return '';
      }
    }
  );

  const handleEdit = async (np: NetworkPolicy) => {
    setSelected(np);
    setYamlKey(`${np.name}|${np.namespace}`);
    setShowEdit(true);
  };

  const handleSaveYAML = async (yaml: string) => {
    const np = selected();
    if (!np) return;
    
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
      label: `Apply NetworkPolicy YAML: ${np.name}`,
      command: '__k8s-apply-yaml',
      args: [],
      mode: 'apply',
      kubernetesEquivalent: true,
      namespace: np.namespace,
      context: status.context,
      userAction: 'networkpolicies-apply-yaml',
      dryRun: false,
      allowClusterWide: false,
      resource: 'networkpolicy',
      action: 'update',
      intent: 'apply-yaml',
      yaml: trimmed,
    });

    setShowEdit(false);
    setTimeout(() => policiesCache.refetch(), 1500);
  };

  const handleDryRunYAML = async (yaml: string) => {
    const np = selected();
    if (!np) return;
    
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
      label: `Dry run NetworkPolicy YAML: ${np.name}`,
      command: '__k8s-apply-yaml',
      args: [],
      mode: 'dry-run',
      kubernetesEquivalent: true,
      namespace: np.namespace,
      context: status.context,
      userAction: 'networkpolicies-apply-yaml-dry-run',
      dryRun: true,
      allowClusterWide: false,
      resource: 'networkpolicy',
      action: 'update',
      intent: 'apply-yaml',
      yaml: trimmed,
    });
  };

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
    let all = policies() || [];
    const query = search().toLowerCase();

    if (query) {
      all = all.filter((p: NetworkPolicy) =>
        p.name.toLowerCase().includes(query) ||
        p.namespace.toLowerCase().includes(query) ||
        p.selector.toLowerCase().includes(query)
      );
    }

    const field = sortField();
    const direction = sortDirection();
    all = [...all].sort((a: NetworkPolicy, b: NetworkPolicy) => {
      let comparison = 0;
      switch (field) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'namespace':
          comparison = a.namespace.localeCompare(b.namespace);
          break;
        case 'age':
          comparison = parseAge(a.age) - parseAge(b.age);
          break;
      }
      return direction === 'asc' ? comparison : -comparison;
    });

    return all;
  });

  const totalPages = createMemo(() => Math.ceil(filteredAndSorted().length / pageSize()));
  const paginatedPolicies = createMemo(() => {
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

  const handleDeleteConfirm = async () => {
    const np = selected();
    if (!np) return;
    
    setDeleting(true);
    try {
      await api.deleteNetworkPolicy(np.name, np.namespace);
      addNotification(`Network policy ${np.name} deleted successfully`, 'success');
      policiesCache.refetch();
      setSelected(null);
      setShowDeleteConfirm(false);
      setShowDetails(false);
    } catch (error) {
      console.error('Failed to delete network policy:', error);
      addNotification(`Failed to delete network policy: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    } finally {
      setDeleting(false);
    }
  };

  const deleteNetworkPolicy = (np: NetworkPolicy) => {
    setSelected(np);
    setShowDeleteConfirm(true);
  };

  const handleBulkDelete = async () => {
    const itemsToDelete = bulk.getSelectedItems(paginatedPolicies());
    try {
      await Promise.all(itemsToDelete.map(np => api.deleteNetworkPolicy(np.name, np.namespace)));
      addNotification(`Successfully deleted ${itemsToDelete.length} Network Policy(s)`, 'success');
      bulk.deselectAll();
      policiesCache.refetch();
    } catch (error) {
      console.error('Failed to delete network policies:', error);
      addNotification(`Failed to delete network policies: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    }
  };


  return (
    <div class="space-y-2 max-w-full -mt-4">
      {/* Header - reduced size */}
      <div class="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 class="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Network Policies</h1>
          <p class="text-xs" style={{ color: 'var(--text-secondary)' }}>View and manage Kubernetes Network Policies for controlling pod-to-pod communication</p>
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
              policiesCache.refetch();
            }}
            class="icon-btn"
            style={{ background: 'var(--bg-secondary)' }}
            title="Refresh Network Policies"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {/* Filters and Search */}
      <div class="flex flex-wrap items-center gap-3">
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

      {/* Network Policies table */}
      <div class="w-full" style={{ background: getThemeBackground(), margin: '0', padding: '0', border: `1px solid ${getThemeBorderColor()}`, 'border-radius': '4px' }}>
        <Show
          when={!policiesCache.loading() || policiesCache.data() !== undefined}
          fallback={
            <div class="p-8 text-center">
              <div class="spinner mx-auto mb-2" />
              <span style={{ color: 'var(--text-muted)' }}>Loading network policies...</span>
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
                      checked={bulk.selectedCount() === paginatedPolicies().length && paginatedPolicies().length > 0}
                      indeterminate={bulk.selectedCount() > 0 && bulk.selectedCount() < paginatedPolicies().length}
                      onChange={() => {
                        if (bulk.selectedCount() === paginatedPolicies().length) {
                          bulk.deselectAll();
                        } else {
                          bulk.selectAll(paginatedPolicies());
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
                  <th class="whitespace-nowrap">Pod Selector</th>
                  <th class="whitespace-nowrap">Ingress</th>
                  <th class="whitespace-nowrap">Egress</th>
                  <th class="whitespace-nowrap">Policy Types</th>
                  <th class="cursor-pointer select-none whitespace-nowrap" onClick={() => handleSort('age')}>
                    <div class="flex items-center gap-1">Age <SortIcon field="age" /></div>
                  </th>
                  <th class="whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody>
                <For each={paginatedPolicies()} fallback={
                  <tr><td colspan="9" class="text-center py-8" style={{ color: 'var(--text-muted)' }}>No network policies found</td></tr>
                }>
                  {(np: NetworkPolicy) => {
                    const textColor = '#0ea5e9';
                    return (
                    <tr>
                      <td style={{
                        padding: '0 8px',
                        'text-align': 'center',
                        width: '40px',
                        height: `${Math.max(24, fontSize() * 1.7)}px`,
                        'line-height': `${Math.max(24, fontSize() * 1.7)}px`,
                        border: 'none'
                      }}>
                        <SelectionCheckbox
                          checked={bulk.isSelected(np)}
                          onChange={() => bulk.toggleSelection(np)}
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
                          onClick={() => { setSelected(np); setShowDetails(true); }}
                          class="font-medium hover:underline text-left"
                          style={{ color: 'var(--accent-primary)' }}
                        >
                          {np.name.length > 40 ? np.name.slice(0, 37) + '...' : np.name}
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
                      }}>{np.namespace}</td>
                      <td style={{
                        padding: '0 8px',
                        'text-align': 'left',
                        color: textColor,
                        'font-weight': '900',
                        'font-size': `${fontSize()}px`,
                        height: `${Math.max(24, fontSize() * 1.7)}px`,
                        'line-height': `${Math.max(24, fontSize() * 1.7)}px`,
                        border: 'none'
                      }}>{np.selector}</td>
                      <td style={{
                        padding: '0 8px',
                        'text-align': 'left',
                        color: textColor,
                        'font-weight': '900',
                        'font-size': `${fontSize()}px`,
                        height: `${Math.max(24, fontSize() * 1.7)}px`,
                        'line-height': `${Math.max(24, fontSize() * 1.7)}px`,
                        border: 'none'
                      }}>{np.ingress}</td>
                      <td style={{
                        padding: '0 8px',
                        'text-align': 'left',
                        color: textColor,
                        'font-weight': '900',
                        'font-size': `${fontSize()}px`,
                        height: `${Math.max(24, fontSize() * 1.7)}px`,
                        'line-height': `${Math.max(24, fontSize() * 1.7)}px`,
                        border: 'none'
                      }}>{np.egress}</td>
                      <td style={{
                        padding: '0 8px',
                        'text-align': 'left',
                        color: textColor,
                        'font-weight': '900',
                        'font-size': `${fontSize()}px`,
                        height: `${Math.max(24, fontSize() * 1.7)}px`,
                        'line-height': `${Math.max(24, fontSize() * 1.7)}px`,
                        border: 'none'
                      }}>{np.policyTypes?.join(', ') || '-'}</td>
                      <td style={{
                        padding: '0 8px',
                        'text-align': 'left',
                        color: textColor,
                        'font-weight': '900',
                        'font-size': `${fontSize()}px`,
                        height: `${Math.max(24, fontSize() * 1.7)}px`,
                        'line-height': `${Math.max(24, fontSize() * 1.7)}px`,
                        border: 'none'
                      }}>{np.age}</td>
                      <td style={{
                        padding: '0 8px',
                        'text-align': 'left',
                        height: `${Math.max(24, fontSize() * 1.7)}px`,
                        'line-height': `${Math.max(24, fontSize() * 1.7)}px`,
                        border: 'none'
                      }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ActionMenu
                          actions={[
                            { label: 'View YAML', icon: 'yaml', onClick: () => { 
                              setSelected(np);
                              setYamlKey(`${np.name}|${np.namespace}`);
                              setShowYaml(true);
                            } },
                            { label: 'Edit YAML', icon: 'edit', onClick: () => handleEdit(np) },
                            { label: 'Describe', icon: 'info', onClick: () => { setSelected(np); setShowDescribe(true); } },
                            { label: 'Delete', icon: 'delete', onClick: () => { setSelected(np); deleteNetworkPolicy(np); }, variant: 'danger', divider: true },
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
            <div class="flex items-center justify-between p-4 font-mono text-sm" style={{ background: 'var(--bg-secondary)', borderTop: `1px solid ${getThemeBorderColor()}` }}>
              <div style={{ color: 'var(--text-secondary)' }}>
                Showing {((currentPage() - 1) * pageSize()) + 1} - {Math.min(currentPage() * pageSize(), filteredAndSorted().length)} of {filteredAndSorted().length} policies
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

      {/* Details Modal */}
      <Modal isOpen={showDetails()} onClose={() => { setShowDetails(false); setSelected(null); }} title={`NetworkPolicy: ${selected()?.name}`} size="xl">
        <Show when={selected()}>
          {(() => {
            const [npDetails] = createResource(
              () => selected() ? { name: selected()!.name, ns: selected()!.namespace } : null,
              async (params) => {
                if (!params) return null;
                return api.getNetworkPolicyDetails(params.name, params.ns);
              }
            );
            return (
              <div class="space-y-6">
                {/* Basic Info */}
                <div>
                  <h3 class="text-sm font-semibold mb-3" style={{ color: 'var(--text-secondary)' }}>Basic Information</h3>
                  <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div class="p-3 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
                      <div class="text-xs" style={{ color: 'var(--text-muted)' }}>Policy Types</div>
                      <div style={{ color: 'var(--text-primary)' }} class="text-sm">
                        <Show when={!npDetails.loading && npDetails()}>
                          {(details) => (details().policyTypes || selected()?.policyTypes || []).join(', ') || '-'}
                        </Show>
                        <Show when={npDetails.loading}>
                          <div class="spinner" style={{ width: '16px', height: '16px' }} />
                        </Show>
                      </div>
                    </div>
                    <div class="p-3 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
                      <div class="text-xs" style={{ color: 'var(--text-muted)' }}>Ingress Rules</div>
                      <div style={{ color: 'var(--text-primary)' }}>
                        <Show when={!npDetails.loading && npDetails()}>
                          {(details) => (details().ingressRules || []).length || selected()?.ingress || 0}
                        </Show>
                        <Show when={npDetails.loading}>
                          <div class="spinner" style={{ width: '16px', height: '16px' }} />
                        </Show>
                      </div>
                    </div>
                    <div class="p-3 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
                      <div class="text-xs" style={{ color: 'var(--text-muted)' }}>Egress Rules</div>
                      <div style={{ color: 'var(--text-primary)' }}>
                        <Show when={!npDetails.loading && npDetails()}>
                          {(details) => (details().egressRules || []).length || selected()?.egress || 0}
                        </Show>
                        <Show when={npDetails.loading}>
                          <div class="spinner" style={{ width: '16px', height: '16px' }} />
                        </Show>
                      </div>
                    </div>
                    <div class="p-3 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
                      <div class="text-xs" style={{ color: 'var(--text-muted)' }}>Age</div>
                      <div style={{ color: 'var(--text-primary)' }}>{selected()?.age || '-'}</div>
                    </div>
                    <div class="p-3 rounded-lg col-span-2" style={{ background: 'var(--bg-tertiary)' }}>
                      <div class="text-xs" style={{ color: 'var(--text-muted)' }}>Pod Selector</div>
                      <div style={{ color: 'var(--text-primary)' }} class="text-sm break-all">
                        <Show when={!npDetails.loading && npDetails()}>
                          {(details) => {
                            const selector = details().podSelector || {};
                            return Object.keys(selector).length > 0 
                              ? Object.entries(selector).map(([k, v]) => `${k}=${v}`).join(', ')
                              : selected()?.selector || '-';
                          }}
                        </Show>
                        <Show when={npDetails.loading}>
                          <div class="spinner" style={{ width: '16px', height: '16px' }} />
                        </Show>
                      </div>
                    </div>
                    <div class="p-3 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
                      <div class="text-xs" style={{ color: 'var(--text-muted)' }}>Namespace</div>
                      <div style={{ color: 'var(--text-primary)' }}>{selected()?.namespace}</div>
                    </div>
                  </div>
                </div>

                {/* Related Resources Section */}
                <Show when={npDetails()}>
                  <RelatedResources
                    kind="networkpolicy"
                    name={npDetails()!.name}
                    namespace={npDetails()!.namespace}
                    relatedData={npDetails()}
                  />
                </Show>

                {/* Ingress Rules */}
                <Show when={!npDetails.loading && npDetails()?.ingressRules && Array.isArray(npDetails()!.ingressRules) && npDetails()!.ingressRules.length > 0}>
                  <div>
                    <h3 class="text-sm font-semibold mb-3" style={{ color: 'var(--text-secondary)' }}>Ingress Rules</h3>
                    <div class="space-y-4">
                      <For each={npDetails()!.ingressRules}>
                        {(rule: any, index) => (
                          <div class="rounded-lg border p-4" style={{ 'border-color': 'var(--border-color)', background: 'var(--bg-secondary)' }}>
                            <div class="text-xs font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>Rule {index() + 1}</div>
                            <Show when={rule.ports && rule.ports.length > 0}>
                              <div class="mb-2">
                                <div class="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Ports:</div>
                                <For each={rule.ports}>
                                  {(port: any) => (
                                    <div class="text-sm ml-2" style={{ color: 'var(--text-primary)' }}>
                                      {port.protocol || 'TCP'}/{port.port || '*'}
                                    </div>
                                  )}
                                </For>
                              </div>
                            </Show>
                            <Show when={rule.from && rule.from.length > 0}>
                              <div>
                                <div class="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>From:</div>
                                <For each={rule.from}>
                                  {(from: any) => (
                                    <div class="text-sm ml-2" style={{ color: 'var(--text-primary)' }}>
                                      <Show when={from.podSelector}>
                                        Pod: {Object.entries(from.podSelector || {}).map(([k, v]) => `${k}=${v}`).join(', ')}
                                      </Show>
                                      <Show when={from.namespaceSelector}>
                                        Namespace: {Object.entries(from.namespaceSelector || {}).map(([k, v]) => `${k}=${v}`).join(', ')}
                                      </Show>
                                      <Show when={from.ipBlock}>
                                        IP Block: {from.ipBlock.cidr} {from.ipBlock.except && from.ipBlock.except.length > 0 && `(except: ${from.ipBlock.except.join(', ')})`}
                                      </Show>
                                    </div>
                                  )}
                                </For>
                              </div>
                            </Show>
                          </div>
                        )}
                      </For>
                    </div>
                  </div>
                </Show>

                {/* Egress Rules */}
                <Show when={!npDetails.loading && npDetails()?.egressRules && Array.isArray(npDetails()!.egressRules) && npDetails()!.egressRules.length > 0}>
                  <div>
                    <h3 class="text-sm font-semibold mb-3" style={{ color: 'var(--text-secondary)' }}>Egress Rules</h3>
                    <div class="space-y-4">
                      <For each={npDetails()!.egressRules}>
                        {(rule: any, index) => (
                          <div class="rounded-lg border p-4" style={{ 'border-color': 'var(--border-color)', background: 'var(--bg-secondary)' }}>
                            <div class="text-xs font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>Rule {index() + 1}</div>
                            <Show when={rule.ports && rule.ports.length > 0}>
                              <div class="mb-2">
                                <div class="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Ports:</div>
                                <For each={rule.ports}>
                                  {(port: any) => (
                                    <div class="text-sm ml-2" style={{ color: 'var(--text-primary)' }}>
                                      {port.protocol || 'TCP'}/{port.port || '*'}
                                    </div>
                                  )}
                                </For>
                              </div>
                            </Show>
                            <Show when={rule.to && rule.to.length > 0}>
                              <div>
                                <div class="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>To:</div>
                                <For each={rule.to}>
                                  {(to: any) => (
                                    <div class="text-sm ml-2" style={{ color: 'var(--text-primary)' }}>
                                      <Show when={to.podSelector}>
                                        Pod: {Object.entries(to.podSelector || {}).map(([k, v]) => `${k}=${v}`).join(', ')}
                                      </Show>
                                      <Show when={to.namespaceSelector}>
                                        Namespace: {Object.entries(to.namespaceSelector || {}).map(([k, v]) => `${k}=${v}`).join(', ')}
                                      </Show>
                                      <Show when={to.ipBlock}>
                                        IP Block: {to.ipBlock.cidr} {to.ipBlock.except && to.ipBlock.except.length > 0 && `(except: ${to.ipBlock.except.join(', ')})`}
                                      </Show>
                                    </div>
                                  )}
                                </For>
                              </div>
                            </Show>
                          </div>
                        )}
                      </For>
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
                      deleteNetworkPolicy(selected()!);
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
      <DescribeModal isOpen={showDescribe()} onClose={() => setShowDescribe(false)} resourceType="networkpolicy" name={selected()?.name || ''} namespace={selected()?.namespace} />

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteConfirm()}
        onClose={() => {
          if (!deleting()) {
            setShowDeleteConfirm(false);
            setShowDetails(false);
          }
        }}
        title="Delete NetworkPolicy"
        message={selected() ? `Are you sure you want to delete the NetworkPolicy "${selected()!.name}"?` : 'Are you sure you want to delete this NetworkPolicy?'}
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

      {/* Bulk Actions Bar */}
      <BulkActions
        selectedCount={bulk.selectedCount()}
        totalCount={filteredAndSorted().length}
        onSelectAll={() => bulk.selectAll(filteredAndSorted())}
        onDeselectAll={() => bulk.deselectAll()}
        onDelete={() => setShowBulkDeleteModal(true)}
        resourceType="policies"
      />

      {/* Bulk Delete Modal */}
      <BulkDeleteModal
        isOpen={showBulkDeleteModal()}
        onClose={() => setShowBulkDeleteModal(false)}
        onConfirm={handleBulkDelete}
        resourceType="Network Policies"
        selectedItems={bulk.getSelectedItems(filteredAndSorted())}
      />
    </div>
  );
};

export default NetworkPolicies;
