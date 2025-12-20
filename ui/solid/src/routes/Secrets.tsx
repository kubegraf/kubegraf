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

interface Secret {
  name: string;
  namespace: string;
  type: string;
  data: number;
  age: string;
}

interface SecretData {
  [key: string]: string; // base64 encoded values
}

type SortField = 'name' | 'namespace' | 'type' | 'data' | 'age';
type SortDirection = 'asc' | 'desc';

const Secrets: Component = () => {
  const [search, setSearch] = createSignal('');
  const [sortField, setSortField] = createSignal<SortField>('name');
  const [sortDirection, setSortDirection] = createSignal<SortDirection>('asc');
  const [currentPage, setCurrentPage] = createSignal(1);
  const [pageSize, setPageSize] = createSignal(20);
  const [selected, setSelected] = createSignal<Secret | null>(null);

  // Bulk selection
  const bulk = useBulkSelection<Secret>();
  const [showBulkDeleteModal, setShowBulkDeleteModal] = createSignal(false);

  // Modal states
  const [showYaml, setShowYaml] = createSignal(false);
  const [showEdit, setShowEdit] = createSignal(false);
  const [showDetails, setShowDetails] = createSignal(false);
  const [showDescribe, setShowDescribe] = createSignal(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = createSignal(false);
  const [deleting, setDeleting] = createSignal(false);
  const [yamlKey, setYamlKey] = createSignal<string | null>(null);
  const [fontSize, setFontSize] = createSignal(parseInt(localStorage.getItem('secrets-font-size') || '14'));
  const [fontFamily, setFontFamily] = createSignal(localStorage.getItem('secrets-font-family') || 'Monaco');

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

  // Secret value visibility state - track which secrets are visible
  const [visibleSecrets, setVisibleSecrets] = createSignal<Set<string>>(new Set());

  // Toggle secret visibility for a specific secret
  const toggleSecretVisibility = (secretKey: string) => {
    const visible = new Set(visibleSecrets());
    if (visible.has(secretKey)) {
      visible.delete(secretKey);
    } else {
      visible.add(secretKey);
    }
    setVisibleSecrets(visible);
  };

  // Decode base64 value
  const decodeBase64 = (value: string): string => {
    try {
      return atob(value);
    } catch (e) {
      return value;
    }
  };

  // Copy decoded value to clipboard
  const copyDecodedValue = (value: string) => {
    const decoded = decodeBase64(value);
    navigator.clipboard.writeText(decoded).then(() => {
      addNotification('Decoded value copied to clipboard', 'success');
    }).catch(() => {
      addNotification('Failed to copy to clipboard', 'error');
    });
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
  const secretsCache = createCachedResource<Secret[]>(
    'secrets',
    async () => {
      setGlobalLoading(true);
      try {
        const namespaceParam = getNamespaceParam();
        const secrets = await api.getSecrets(namespaceParam);
        return secrets;
      } catch (error) {
        console.error('[Secrets] Error fetching secrets:', error);
        addNotification(`❌ Failed to fetch Secrets: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
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

  // Get secrets from cache
  const secrets = createMemo(() => secretsCache.data() || []);
  
  // Refetch function for updates
  const refetch = () => secretsCache.refetch();
  
  // Initial load on mount
  onMount(() => {
    if (!secretsCache.data()) {
      secretsCache.refetch();
    }
  });
  const [yamlContent] = createResource(
    () => yamlKey(),
    async (key) => {
      if (!key) return '';
      const [name, ns] = key.split('|');
      if (!name || !ns) return '';
      try {
        const data = await api.getSecretYAML(name, ns);
        return data.yaml || '';
      } catch (error) {
        console.error('Failed to fetch secret YAML:', error);
        addNotification(`Failed to load YAML: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
        return '';
      }
    }
  );

  const handleSaveYAML = async (yaml: string) => {
    const secret = selected();
    if (!secret) return;
    
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
      label: `Apply Secret YAML: ${secret.name}`,
      command: '__k8s-apply-yaml',
      args: [],
      mode: 'apply',
      kubernetesEquivalent: true,
      namespace: secret.namespace,
      context: status.context,
      userAction: 'secrets-apply-yaml',
      dryRun: false,
      allowClusterWide: false,
      resource: 'secrets',
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
    const secret = selected();
    if (!secret) return;

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
      label: `Dry run Secret YAML: ${secret.name}`,
      command: '__k8s-apply-yaml',
      args: [],
      mode: 'dry-run',
      kubernetesEquivalent: true,
      namespace: secret.namespace,
      context: status.context,
      userAction: 'secrets-apply-yaml-dry-run',
      dryRun: true,
      allowClusterWide: false,
      resource: 'secrets',
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
    let all = secrets() || [];
    const query = search().toLowerCase();

    // Filter
    if (query) {
      all = all.filter((s: Secret) =>
        s.name.toLowerCase().includes(query) ||
        s.namespace.toLowerCase().includes(query) ||
        s.type.toLowerCase().includes(query)
      );
    }

    // Sort
    const field = sortField();
    const direction = sortDirection();
    all = [...all].sort((a: Secret, b: Secret) => {
      let comparison = 0;
      switch (field) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'namespace':
          comparison = a.namespace.localeCompare(b.namespace);
          break;
        case 'type':
          comparison = a.type.localeCompare(b.type);
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

  const handleDeleteConfirm = async () => {
    const secret = selected();
    if (!secret) return;
    
    setDeleting(true);
    try {
      await api.deleteSecret(secret.name, secret.namespace);
      addNotification(`Secret ${secret.name} deleted successfully`, 'success');
      refetch();
      setSelected(null);
      setShowDeleteConfirm(false);
      setShowDetails(false);
    } catch (error) {
      console.error('Failed to delete secret:', error);
      addNotification(`Failed to delete secret: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    } finally {
      setDeleting(false);
    }
  };

  const deleteSecret = (secret: Secret) => {
    setSelected(secret);
    setShowDeleteConfirm(true);
  };

  const getTypeBadgeClass = (type: string) => {
    if (type.includes('tls')) return 'badge-success';
    if (type.includes('Opaque')) return 'badge-default';
    if (type.includes('helm')) return 'badge-info';
    return 'badge-default';
  };

  return (
    <div class="space-y-2 max-w-full -mt-4" style={{ background: 'var(--bg-primary)', minHeight: '100%' }}>
      {/* Bulk Actions */}
      <BulkActions
        selectedCount={bulk.selectedCount()}
        totalCount={filteredAndSorted().length}
        onSelectAll={() => bulk.selectAll(filteredAndSorted())}
        onDeselectAll={() => bulk.deselectAll()}
        onDelete={() => setShowBulkDeleteModal(true)}
        resourceType="secrets"
      />

      {/* Header - reduced size */}
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Secrets</h1>
          <p class="text-xs" style={{ color: 'var(--text-secondary)' }}>Sensitive data storage</p>
        </div>
        <div class="flex items-center gap-3">
          <input
            type="text"
            placeholder="Search secrets..."
            class="px-3 py-2 rounded-lg bg-[var(--bg-alt)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
            style={{ border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
            onInput={(e) => setSearch(e.currentTarget.value)}
          />
          <button
            onClick={() => refetch()}
            class="px-3 py-2 rounded-lg bg-[var(--accent-primary)] text-white text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Error display */}
      <Show when={secretsCache.error()}>
        <div class="card p-4 mb-4" style={{ background: 'var(--error-bg)', border: '1px solid var(--error-color)' }}>
          <div class="flex items-center gap-2">
            <span style={{ color: 'var(--error-color)' }}>❌</span>
            <span style={{ color: 'var(--error-color)' }}>
              Error loading Secrets: {secretsCache.error()?.message || 'Unknown error'}
            </span>
          </div>
        </div>
      </Show>

      {/* Secrets Table */}
      <div class="w-full" style={{ background: getThemeBackground(), margin: '0', padding: '0', border: `1px solid ${getThemeBorderColor()}`, 'border-radius': '4px' }}>
        <Show when={!secretsCache.loading() || secretsCache.data() !== undefined} fallback={
          <div class="p-8 text-center">
            <div class="spinner mx-auto mb-2" />
            <span style={{ color: 'var(--text-muted)' }}>Loading Secrets...</span>
          </div>
        }>
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
                    <th onClick={() => handleSort('name')} class="cursor-pointer select-none whitespace-nowrap" style={{
                      padding: '0 8px',
                      'text-align': 'left',
                      'font-weight': '900',
                      color: '#0ea5e9',
                      'font-size': `${fontSize()}px`,
                      height: `${Math.max(24, fontSize() * 1.7)}px`,
                      'line-height': `${Math.max(24, fontSize() * 1.7)}px`,
                      border: 'none'
                    }}>
                      <div class="flex items-center gap-1">Name <SortIcon field="name" /></div>
                    </th>
                    <th onClick={() => handleSort('namespace')} class="cursor-pointer select-none whitespace-nowrap" style={{
                      padding: '0 8px',
                      'text-align': 'left',
                      'font-weight': '900',
                      color: '#0ea5e9',
                      'font-size': `${fontSize()}px`,
                      height: `${Math.max(24, fontSize() * 1.7)}px`,
                      'line-height': `${Math.max(24, fontSize() * 1.7)}px`,
                      border: 'none'
                    }}>
                      <div class="flex items-center gap-1">Namespace <SortIcon field="namespace" /></div>
                    </th>
                    <th onClick={() => handleSort('type')} class="cursor-pointer select-none whitespace-nowrap" style={{
                      padding: '0 8px',
                      'text-align': 'left',
                      'font-weight': '900',
                      color: '#0ea5e9',
                      'font-size': `${fontSize()}px`,
                      height: `${Math.max(24, fontSize() * 1.7)}px`,
                      'line-height': `${Math.max(24, fontSize() * 1.7)}px`,
                      border: 'none'
                    }}>
                      <div class="flex items-center gap-1">Type <SortIcon field="type" /></div>
                    </th>
                    <th onClick={() => handleSort('data')} class="cursor-pointer select-none whitespace-nowrap" style={{
                      padding: '0 8px',
                      'text-align': 'left',
                      'font-weight': '900',
                      color: '#0ea5e9',
                      'font-size': `${fontSize()}px`,
                      height: `${Math.max(24, fontSize() * 1.7)}px`,
                      'line-height': `${Math.max(24, fontSize() * 1.7)}px`,
                      border: 'none'
                    }}>
                      <div class="flex items-center gap-1">Data <SortIcon field="data" /></div>
                    </th>
                    <th onClick={() => handleSort('age')} class="cursor-pointer select-none whitespace-nowrap" style={{
                      padding: '0 8px',
                      'text-align': 'left',
                      'font-weight': '900',
                      color: '#0ea5e9',
                      'font-size': `${fontSize()}px`,
                      height: `${Math.max(24, fontSize() * 1.7)}px`,
                      'line-height': `${Math.max(24, fontSize() * 1.7)}px`,
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
                      height: `${Math.max(24, fontSize() * 1.7)}px`,
                      'line-height': `${Math.max(24, fontSize() * 1.7)}px`,
                      border: 'none'
                    }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <For each={paginated()} fallback={
                    <tr><td colspan="7" class="text-center py-8" style={{ color: 'var(--text-muted)' }}>No secrets found</td></tr>
                  }>
                    {(secret: Secret) => {
                      const textColor = '#0ea5e9';
                      return (
                        <tr>
                          <td style={{
                            padding: '0 8px',
                            'text-align': 'center',
                            width: '40px',
                            border: 'none'
                          }}>
                            <SelectionCheckbox
                              checked={bulk.isSelected(secret)}
                              onChange={() => bulk.toggleSelection(secret)}
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
                              onClick={() => { setSelected(secret); setShowDetails(true); }}
                              class="font-medium hover:underline text-left"
                              style={{ color: 'var(--accent-primary)' }}
                            >
                              {secret.name.length > 40 ? secret.name.slice(0, 37) + '...' : secret.name}
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
                          }}>{secret.namespace}</td>
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
                            <span class={`badge ${getTypeBadgeClass(secret.type)}`}>
                              {secret.type}
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
                          }}>{secret.data}</td>
                          <td style={{
                            padding: '0 8px',
                            'text-align': 'left',
                            color: textColor,
                            'font-weight': '900',
                            'font-size': `${fontSize()}px`,
                            height: `${Math.max(24, fontSize() * 1.7)}px`,
                            'line-height': `${Math.max(24, fontSize() * 1.7)}px`,
                            border: 'none'
                          }}>{secret.age}</td>
                          <td style={{
                            padding: '0 8px',
                            'text-align': 'left',
                            height: `${Math.max(24, fontSize() * 1.7)}px`,
                            'line-height': `${Math.max(24, fontSize() * 1.7)}px`,
                            border: 'none'
                          }}>
                            <ActionMenu
                              actions={[
                                { label: 'View Data', icon: 'describe', onClick: () => { setSelected(secret); setShowDetails(true); } },
                                { label: 'View YAML', icon: 'yaml', onClick: () => { 
                                  setSelected(secret);
                                  setYamlKey(`${secret.name}|${secret.namespace}`);
                                  setShowYaml(true);
                                } },
                                { label: 'Edit YAML', icon: 'edit', onClick: () => { 
                                  setSelected(secret);
                                  setYamlKey(`${secret.name}|${secret.namespace}`);
                                  setShowEdit(true);
                                } },
                                { label: 'Describe', icon: 'describe', onClick: () => { setSelected(secret); setShowDescribe(true); } },
                                { label: 'Delete', icon: 'delete', onClick: () => { setSelected(secret); deleteSecret(secret); }, variant: 'danger', divider: true },
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
                  Showing {((currentPage() - 1) * pageSize()) + 1} - {Math.min(currentPage() * pageSize(), filteredAndSorted().length)} of {filteredAndSorted().length} Secrets
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
              {(sec) => (
                <CommandPreview
                  label="Equivalent kubectl command"
                  defaultCollapsed={true}
                  command={`kubectl apply -f - -n ${sec().namespace || 'default'}  # YAML from editor is sent via Kubernetes API`}
                  description="This is an equivalent kubectl-style view of the Secret update. The actual change is applied via Kubernetes API. Secret data is redacted in server logs."
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
        resourceType="secret"
        name={selected()?.name || ''}
        namespace={selected()?.namespace || ''}
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
        title="Delete Secret"
        message={selected() ? `Are you sure you want to delete the Secret "${selected()!.name}"?` : 'Are you sure you want to delete this Secret?'}
        details={selected() ? [
          { label: 'Name', value: selected()!.name },
          { label: 'Namespace', value: selected()!.namespace },
          { label: 'Type', value: selected()!.type },
        ] : undefined}
        variant="danger"
        confirmText="Delete"
        cancelText="Cancel"
        loading={deleting()}
        onConfirm={handleDeleteConfirm}
        size="sm"
      />

      {/* Details Modal - Shows secret data with eye icons and decrypt/copy */}
      <Modal isOpen={showDetails()} onClose={() => setShowDetails(false)} title={`Secret Data: ${selected()?.name}`} size="xl">
        <Show when={selected()}>
          {(() => {
            const [secretDetails] = createResource(
              () => selected() ? { name: selected()!.name, ns: selected()!.namespace } : null,
              async (params) => {
                if (!params) return null;
                const yaml = await api.getSecretYAML(params.name, params.ns);
                // Parse YAML to extract data fields
                try {
                  // Improved YAML parsing - find data: section and extract key-value pairs
                  const lines = yaml.yaml.split('\n');
                  const data: SecretData = {};
                  let inDataSection = false;
                  let dataIndent = 0;

                  for (let i = 0; i < lines.length; i++) {
                    const line = lines[i];

                    // Check if we're entering the data section
                    if (line.match(/^data:\s*$/)) {
                      inDataSection = true;
                      dataIndent = 0; // Reset indent
                      continue;
                    }

                    // If we're in the data section
                    if (inDataSection) {
                      // Calculate current line's indentation
                      const indent = line.search(/\S/);

                      // Extract key-value pairs (lines with "  key: value" format)
                      const match = line.match(/^\s+([^:]+):\s*(.*)$/);
                      if (match) {
                        // Set the data indent based on first key-value pair found
                        if (dataIndent === 0) {
                          dataIndent = indent;
                        }

                        const key = match[1].trim();
                        const value = match[2].trim();
                        // Store key even if value is empty (some secrets may have empty values)
                        if (key) {
                          data[key] = value;
                        }
                      } else if (indent !== -1 && dataIndent > 0 && indent < dataIndent) {
                        // If we encounter a line with less indentation than data fields, we've exited the section
                        break;
                      }
                    }
                  }

                  return data;
                } catch (e) {
                  console.error('Failed to parse secret data:', e);
                }
                return {};
              }
            );

            return (
              <Show when={!secretDetails.loading} fallback={
                <div class="p-8 text-center">
                  <div class="spinner mx-auto mb-2" />
                  <span style={{ color: 'var(--text-muted)' }}>Loading secret data...</span>
                </div>
              }>
                <div class="space-y-4">
                  <Show when={secretDetails() && Object.keys(secretDetails()!).length > 0} fallback={
                    <div class="p-4 text-center" style={{ color: 'var(--text-muted)' }}>
                      No data fields found in this secret
                    </div>
                  }>
                    <For each={Object.entries(secretDetails()!)}>
                      {([key, value]) => {
                        const secretKey = `${selected()!.name}/${key}`;
                        const isVisible = visibleSecrets().has(secretKey);
                        const decodedValue = decodeBase64(value);

                        return (
                          <div
                            class="p-4 rounded-lg border"
                            style={{
                              background: 'var(--bg-secondary)',
                              borderColor: 'var(--border-color)'
                            }}
                          >
                            <div class="flex items-center justify-between mb-2">
                              <span class="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                                {key}
                              </span>
                              <div class="flex items-center gap-2">
                                {/* Eye icon to toggle visibility */}
                                <button
                                  onClick={() => toggleSecretVisibility(secretKey)}
                                  class="p-1.5 rounded hover:bg-[var(--bg-tertiary)] transition-colors"
                                  title={isVisible ? 'Hide value' : 'Show value'}
                                >
                                  <Show when={isVisible} fallback={
                                    <svg class="w-5 h-5" style={{ color: 'var(--text-muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                    </svg>
                                  }>
                                    <svg class="w-5 h-5" style={{ color: 'var(--accent-primary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                    </svg>
                                  </Show>
                                </button>

                                {/* Decrypt/Copy button */}
                                <button
                                  onClick={() => copyDecodedValue(value)}
                                  class="px-3 py-1.5 rounded text-xs font-medium flex items-center gap-1.5 transition-colors"
                                  style={{
                                    background: 'var(--accent-primary)',
                                    color: 'white'
                                  }}
                                  title="Copy decoded value to clipboard"
                                >
                                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                  </svg>
                                  Copy Decoded
                                </button>
                              </div>
                            </div>

                            {/* Value display */}
                            <div
                              class="p-3 rounded font-mono text-sm overflow-x-auto"
                              style={{
                                background: 'var(--bg-tertiary)',
                                color: isVisible ? 'var(--text-primary)' : 'var(--text-muted)',
                                wordBreak: 'break-all',
                                whiteSpace: 'pre-wrap'
                              }}
                            >
                              {isVisible ? decodedValue : '••••••••••••••••••••••••••••'}
                            </div>
                          </div>
                        );
                      }}
                    </For>
                  </Show>
                </div>
              </Show>
            );
          })()}
        </Show>
      </Modal>

      {/* Bulk Delete Modal */}
      <BulkDeleteModal
        isOpen={showBulkDeleteModal()}
        onClose={() => setShowBulkDeleteModal(false)}
        resourceType="Secrets"
        selectedItems={bulk.getSelectedItems(filteredAndSorted())}
        onConfirm={async () => {
          const selectedSecrets = bulk.getSelectedItems(filteredAndSorted());

          // Delete each secret
          for (const secret of selectedSecrets) {
            try {
              await api.deleteSecret(secret.name, secret.namespace);
            } catch (error) {
              console.error(`Failed to delete secret ${secret.namespace}/${secret.name}:`, error);
              addNotification(
                `Failed to delete secret ${secret.name}: ${error instanceof Error ? error.message : 'Unknown error'}`,
                'error'
              );
            }
          }

          // Clear selection and refetch
          bulk.deselectAll();
          refetch();

          // Show success notification
          addNotification(
            `Successfully deleted ${selectedSecrets.length} secret${selectedSecrets.length !== 1 ? 's' : ''}`,
            'success'
          );
        }}
      />
    </div>
  );
};

export default Secrets;

