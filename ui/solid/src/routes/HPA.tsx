import { Component, For, Show, createMemo, createSignal, createResource } from 'solid-js';
import { api } from '../services/api';
import { namespace, clusterStatus } from '../stores/cluster';
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
import Modal from '../components/Modal';
import YAMLViewer from '../components/YAMLViewer';
import YAMLEditor from '../components/YAMLEditor';
import DescribeModal from '../components/DescribeModal';
import ConfirmationModal from '../components/ConfirmationModal';
import RelatedResources from '../components/RelatedResources';
import ActionMenu from '../components/ActionMenu';
import SecurityRecommendations from '../components/SecurityRecommendations';
import { startExecution } from '../stores/executionPanel';

interface HPA {
  name: string;
  namespace: string;
  targetRef: string;
  minReplicas: number;
  maxReplicas: number;
  currentReplicas: number;
  desiredReplicas: number;
  cpuUtilization?: number;
  memoryUtilization?: number;
  age: string;
}

type SortField = 'name' | 'namespace' | 'currentReplicas' | 'age';
type SortDirection = 'asc' | 'desc';

const HPA: Component = () => {
  const [sortField, setSortField] = createSignal<SortField>('name');
  const [sortDirection, setSortDirection] = createSignal<SortDirection>('asc');
  const [currentPage, setCurrentPage] = createSignal(1);
  const [pageSize, setPageSize] = createSignal(20);
  const [selected, setSelected] = createSignal<HPA | null>(null);
  const [showYaml, setShowYaml] = createSignal(false);
  const [showEdit, setShowEdit] = createSignal(false);
  const [showDescribe, setShowDescribe] = createSignal(false);
  const [showDetails, setShowDetails] = createSignal(false);
  const [yamlKey, setYamlKey] = createSignal<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = createSignal(false);
  const [deleting, setDeleting] = createSignal(false);

  const getInitialFontSize = (): number => {
    const saved = localStorage.getItem('hpa-font-size');
    return saved ? parseInt(saved) : 14;
  };
  const [fontSize, setFontSize] = createSignal(getInitialFontSize());

  const updateFontSize = (size: number) => {
    setFontSize(size);
    localStorage.setItem('hpa-font-size', size.toString());
  };

  const hpasResource = createCachedResource<HPA[]>(
    'hpas',
    async () => {
      const ns = selectedNamespaces().length === 1 ? selectedNamespaces()[0] : undefined;
      return await api.getHPAs(ns);
    },
    { ttl: 5000 }
  );

  const [yamlContent] = createResource(
    () => yamlKey(),
    async (key) => {
      if (!key) return '';
      const [name, ns] = key.split('|');
      if (!name || !ns) return '';
      try {
        const data = await api.getHPAYAML(name, ns);
        return data.yaml || '';
      } catch (error) {
        console.error('Failed to fetch HPA YAML:', error);
        addNotification(`Failed to load YAML: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
        return '';
      }
    }
  );

  const filteredHPAs = createMemo(() => {
    const all = hpasResource.data() || [];
    const query = searchQuery().toLowerCase();
    if (!query) return all;

    return all.filter((hpa: HPA) =>
      hpa.name.toLowerCase().includes(query) ||
      hpa.namespace.toLowerCase().includes(query) ||
      hpa.targetRef.toLowerCase().includes(query)
    );
  });

  const sortedHPAs = createMemo(() => {
    const filtered = filteredHPAs();
    const sorted = [...filtered].sort((a, b) => {
      let aVal: any = a[sortField()];
      let bVal: any = b[sortField()];

      if (sortField() === 'age') {
        aVal = new Date(a.age).getTime();
        bVal = new Date(b.age).getTime();
      } else if (sortField() === 'currentReplicas') {
        aVal = a.currentReplicas || 0;
        bVal = b.currentReplicas || 0;
      } else {
        aVal = String(aVal || '').toLowerCase();
        bVal = String(bVal || '').toLowerCase();
      }

      if (aVal < bVal) return sortDirection() === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection() === 'asc' ? 1 : -1;
      return 0;
    });

    const start = (currentPage() - 1) * pageSize();
    return sorted.slice(start, start + pageSize());
  });

  const totalPages = createMemo(() => Math.ceil((filteredHPAs().length || 0) / pageSize()));

  const handleSort = (field: SortField) => {
    if (sortField() === field) {
      setSortDirection(sortDirection() === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleViewYAML = async (hpa: HPA) => {
    setSelected(hpa);
    setYamlKey(`${hpa.name}|${hpa.namespace}`);
    setShowYaml(true);
  };

  const handleEdit = async (hpa: HPA) => {
    setSelected(hpa);
    setYamlKey(`${hpa.name}|${hpa.namespace}`);
    setShowEdit(true);
  };

  const handleDescribe = async (hpa: HPA) => {
    setSelected(hpa);
    setShowDescribe(true);
  };

  const handleDeleteConfirm = async () => {
    const hpa = selected();
    if (!hpa) return;
    
    setDeleting(true);
    try {
      await api.deleteHPA(hpa.name, hpa.namespace);
      addNotification(`HPA "${hpa.name}" deleted successfully`, 'success');
      hpasResource.refetch();
      setSelected(null);
      setShowDeleteConfirm(false);
      setShowDetails(false);
    } catch (error: any) {
      addNotification(`Failed to delete HPA: ${error.message}`, 'error');
    } finally {
      setDeleting(false);
    }
  };

  const handleDelete = (hpa: HPA) => {
    setSelected(hpa);
    setShowDeleteConfirm(true);
  };

  const handleSaveYAML = async (yaml: string) => {
    const hpa = selected();
    if (!hpa) return;

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
      label: `Apply HPA YAML: ${hpa.name}`,
      command: '__k8s-apply-yaml',
      args: [],
      mode: 'apply',
      kubernetesEquivalent: true,
      namespace: hpa.namespace,
      context: status.context,
      userAction: 'hpa-apply-yaml',
      dryRun: false,
      allowClusterWide: false,
      resource: 'hpa',
      action: 'update',
      intent: 'apply-yaml',
      yaml: trimmed,
    });

    setShowEdit(false);
    setTimeout(() => hpasResource.refetch(), 1500);
  };

  const handleDryRunYAML = async (yaml: string) => {
    const hpa = selected();
    if (!hpa) return;

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
      label: `Dry run HPA YAML: ${hpa.name}`,
      command: '__k8s-apply-yaml',
      args: [],
      mode: 'dry-run',
      kubernetesEquivalent: true,
      namespace: hpa.namespace,
      context: status.context,
      userAction: 'hpa-apply-yaml-dry-run',
      dryRun: true,
      allowClusterWide: false,
      resource: 'hpa',
      action: 'update',
      intent: 'apply-yaml',
      yaml: trimmed,
    });
  };

  const statusSummary = createMemo(() => {
    const all = filteredHPAs();
    return {
      total: all.length,
      active: all.filter((h: HPA) => h.currentReplicas > 0).length,
      scaling: all.filter((h: HPA) => h.currentReplicas !== h.desiredReplicas).length,
    };
  });

  return (
    <div class="space-y-2 max-w-full -mt-4 p-6">
      <div class="flex items-center justify-between mb-4">
        <div>
          <h1 class="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
            Horizontal Pod Autoscalers
          </h1>
          <p class="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
            Automatically scale workloads based on CPU, memory, or custom metrics
          </p>
        </div>
        <div class="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            class="px-4 py-2 rounded-lg text-sm font-medium"
            style={{ background: 'var(--accent-primary)', color: '#000' }}
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Security Recommendations */}
      <SecurityRecommendations resourceType="HPA" />

      {/* Status Summary - compact */}
      <div class="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        <div class="card px-3 py-1.5 rounded border" style={{ 'border-left': '2px solid var(--accent-primary)', 'border-color': 'var(--border-color)' }}>
          <div class="text-xs" style={{ color: 'var(--text-secondary)' }}>Total</div>
          <div class="text-sm font-bold mt-0.5" style={{ color: 'var(--accent-primary)' }}>
            {statusSummary().total}
          </div>
        </div>
        <div class="card px-3 py-1.5 rounded border" style={{ 'border-left': '2px solid var(--success-color)', 'border-color': 'var(--border-color)' }}>
          <div class="text-xs" style={{ color: 'var(--text-secondary)' }}>Active</div>
          <div class="text-sm font-bold mt-0.5" style={{ color: 'var(--success-color)' }}>
            {statusSummary().active}
          </div>
        </div>
        <div class="card px-3 py-1.5 rounded border" style={{ 'border-left': '2px solid var(--warning-color)', 'border-color': 'var(--border-color)' }}>
          <div class="text-xs" style={{ color: 'var(--text-secondary)' }}>Scaling</div>
          <div class="text-sm font-bold mt-0.5" style={{ color: 'var(--warning-color)' }}>
            {statusSummary().scaling}
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div class="flex items-center gap-4 mb-4">
        <input
          type="text"
          placeholder="Search HPAs..."
          value={searchQuery()}
          onInput={(e) => setSearchQuery(e.currentTarget.value)}
          class="flex-1 px-4 py-2 rounded-lg text-sm"
          style={{
            background: 'var(--bg-input)',
            border: '1px solid var(--border-color)',
            color: 'var(--text-primary)'
          }}
        />
        <select
          value={pageSize()}
          onChange={(e) => {
            setPageSize(Number(e.currentTarget.value));
            setCurrentPage(1);
          }}
          class="px-3 py-2 rounded-lg text-sm"
          style={{
            background: 'var(--bg-input)',
            border: '1px solid var(--border-color)',
            color: 'var(--text-primary)'
          }}
        >
          <option value={10}>10 per page</option>
          <option value={20}>20 per page</option>
          <option value={50}>50 per page</option>
          <option value={100}>100 per page</option>
        </select>
        <select
          value={fontSize()}
          onChange={(e) => updateFontSize(Number(e.currentTarget.value))}
          class="px-3 py-2 rounded-lg text-sm"
          style={{
            background: 'var(--bg-input)',
            border: '1px solid var(--border-color)',
            color: 'var(--text-primary)'
          }}
        >
          <option value={12}>12px</option>
          <option value={14}>14px</option>
          <option value={16}>16px</option>
          <option value={18}>18px</option>
        </select>
      </div>

      {/* Table */}
      <Show
        when={!hpasResource.loading()}
        fallback={
          <div class="p-8 text-center">
            <div class="spinner mx-auto mb-2" />
            <span style={{ color: 'var(--text-muted)' }}>Loading HPAs...</span>
          </div>
        }
      >
        <div class="w-full overflow-x-auto rounded border" style={{ background: 'var(--bg-card)', 'border-color': 'var(--border-color)' }}>
          <table class="w-full" style={{
            width: '100%',
            'table-layout': 'auto',
            background: 'var(--bg-primary)',
            'border-collapse': 'collapse',
            margin: '0',
            padding: '0'
          }}>
            <thead>
              <tr style={{
                height: `${Math.max(24, fontSize() * 1.7)}px`,
                'font-weight': '900',
                color: '#0ea5e9',
                'font-size': `${fontSize()}px`,
                'line-height': `${Math.max(24, fontSize() * 1.7)}px`
              }}>
                <th
                  class="cursor-pointer select-none whitespace-nowrap"
                  onClick={() => handleSort('name')}
                  style={{
                    padding: '0 8px',
                    'text-align': 'left',
                    'font-weight': '900',
                    color: '#0ea5e9',
                    'font-size': `${fontSize()}px`,
                    border: 'none'
                  }}
                >
                  Name {sortField() === 'name' && (sortDirection() === 'asc' ? '↑' : '↓')}
                </th>
                <th
                  class="cursor-pointer select-none whitespace-nowrap"
                  onClick={() => handleSort('namespace')}
                  style={{
                    padding: '0 8px',
                    'text-align': 'left',
                    'font-weight': '900',
                    color: '#0ea5e9',
                    'font-size': `${fontSize()}px`,
                    border: 'none'
                  }}
                >
                  Namespace {sortField() === 'namespace' && (sortDirection() === 'asc' ? '↑' : '↓')}
                </th>
                <th class="whitespace-nowrap" style={{
                  padding: '0 8px',
                  'text-align': 'left',
                  'font-weight': '900',
                  color: '#0ea5e9',
                  'font-size': `${fontSize()}px`,
                  border: 'none'
                }}>
                  Target
                </th>
                <th class="whitespace-nowrap" style={{
                  padding: '0 8px',
                  'text-align': 'left',
                  'font-weight': '900',
                  color: '#0ea5e9',
                  'font-size': `${fontSize()}px`,
                  border: 'none'
                }}>
                  Replicas
                </th>
                <th class="whitespace-nowrap" style={{
                  padding: '0 8px',
                  'text-align': 'left',
                  'font-weight': '900',
                  color: '#0ea5e9',
                  'font-size': `${fontSize()}px`,
                  border: 'none'
                }}>
                  Min / Max
                </th>
                <th class="whitespace-nowrap" style={{
                  padding: '0 8px',
                  'text-align': 'left',
                  'font-weight': '900',
                  color: '#0ea5e9',
                  'font-size': `${fontSize()}px`,
                  border: 'none'
                }}>
                  Metrics
                </th>
                <th
                  class="cursor-pointer select-none whitespace-nowrap"
                  onClick={() => handleSort('age')}
                  style={{
                    padding: '0 8px',
                    'text-align': 'left',
                    'font-weight': '900',
                    color: '#0ea5e9',
                    'font-size': `${fontSize()}px`,
                    border: 'none'
                  }}
                >
                  Age {sortField() === 'age' && (sortDirection() === 'asc' ? '↑' : '↓')}
                </th>
                <th class="whitespace-nowrap" style={{
                  padding: '0 8px',
                  'text-align': 'left',
                  'font-weight': '900',
                  color: '#0ea5e9',
                  'font-size': `${fontSize()}px`,
                  border: 'none'
                }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              <For
                each={sortedHPAs()}
                fallback={
                  <tr>
                    <td colspan="8" class="px-3 py-8 text-center" style={{ color: 'var(--text-muted)' }}>
                      No HPAs found
                    </td>
                  </tr>
                }
              >
                {(hpa) => {
                  const textColor = '#0ea5e9';
                  return (
                  <tr>
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
                        onClick={() => { setSelected(hpa); setShowDetails(true); }}
                        class="font-medium hover:underline text-left"
                        style={{ color: 'var(--accent-primary)' }}
                      >
                        {hpa.name}
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
                    }}>{hpa.namespace}</td>
                    <td style={{
                      padding: '0 8px',
                      'text-align': 'left',
                      color: textColor,
                      'font-weight': '900',
                      'font-size': `${fontSize()}px`,
                      height: `${Math.max(24, fontSize() * 1.7)}px`,
                      'line-height': `${Math.max(24, fontSize() * 1.7)}px`,
                      border: 'none'
                    }}>{hpa.targetRef}</td>
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
                      {hpa.currentReplicas} / {hpa.desiredReplicas}
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
                      {hpa.minReplicas} / {hpa.maxReplicas}
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
                      {hpa.cpuUtilization !== undefined && `CPU: ${hpa.cpuUtilization}%`}
                      {hpa.cpuUtilization !== undefined && hpa.memoryUtilization !== undefined && ', '}
                      {hpa.memoryUtilization !== undefined && `Mem: ${hpa.memoryUtilization}%`}
                      {!hpa.cpuUtilization && !hpa.memoryUtilization && '-'}
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
                    }}>{hpa.age}</td>
                    <td style={{
                      padding: '0 8px',
                      'text-align': 'left',
                      height: `${Math.max(24, fontSize() * 1.7)}px`,
                      'line-height': `${Math.max(24, fontSize() * 1.7)}px`,
                      border: 'none'
                    }}>
                      <ActionMenu
                        actions={[
                          { label: 'View YAML', icon: 'yaml', onClick: () => handleViewYAML(hpa) },
                          { label: 'Edit YAML', icon: 'edit', onClick: () => handleEdit(hpa) },
                          { label: 'Describe', icon: 'describe', onClick: () => handleDescribe(hpa) },
                          { label: 'Delete', icon: 'delete', onClick: () => { setSelected(hpa); handleDelete(hpa); }, variant: 'danger', divider: true },
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
        <div class="flex items-center justify-between mt-4">
          <div style={{ color: 'var(--text-secondary)' }}>
            Showing {(currentPage() - 1) * pageSize() + 1} to {Math.min(currentPage() * pageSize(), filteredHPAs().length)} of {filteredHPAs().length} HPAs
          </div>
          <div class="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage() - 1))}
              disabled={currentPage() === 1}
              class="px-3 py-1 rounded"
              style={{
                background: currentPage() === 1 ? 'var(--bg-tertiary)' : 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color)'
              }}
            >
              Previous
            </button>
            <span style={{ color: 'var(--text-secondary)' }}>
              Page {currentPage()} of {totalPages()}
            </span>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages(), currentPage() + 1))}
              disabled={currentPage() === totalPages()}
              class="px-3 py-1 rounded"
              style={{
                background: currentPage() === totalPages() ? 'var(--bg-tertiary)' : 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color)'
              }}
            >
              Next
            </button>
          </div>
        </div>
      </Show>

      {/* Details Modal */}
      <Modal isOpen={showDetails()} onClose={() => { setShowDetails(false); setSelected(null); }} title={`HPA: ${selected()?.name}`} size="xl">
        <Show when={selected()}>
          {(() => {
            const [hpaDetails] = createResource(
              () => selected() ? { name: selected()!.name, ns: selected()!.namespace } : null,
              async (params) => {
                if (!params) return null;
                return api.getHPADetails(params.name, params.ns);
              }
            );
            return (
              <div class="space-y-6">
                {/* Basic Info */}
                <div>
                  <h3 class="text-sm font-semibold mb-3" style={{ color: 'var(--text-secondary)' }}>Basic Information</h3>
                  <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div class="p-3 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
                      <div class="text-xs" style={{ color: 'var(--text-muted)' }}>Target</div>
                      <div style={{ color: 'var(--text-primary)' }} class="text-sm">
                        <Show when={!hpaDetails.loading && hpaDetails()}>
                          {(details) => details().targetRef || selected()?.targetRef || '-'}
                        </Show>
                        <Show when={hpaDetails.loading}>
                          <div class="spinner" style={{ width: '16px', height: '16px' }} />
                        </Show>
                      </div>
                    </div>
                    <div class="p-3 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
                      <div class="text-xs" style={{ color: 'var(--text-muted)' }}>Min Replicas</div>
                      <div style={{ color: 'var(--text-primary)' }}>
                        <Show when={!hpaDetails.loading && hpaDetails()}>
                          {(details) => details().minReplicas || selected()?.minReplicas || '-'}
                        </Show>
                        <Show when={hpaDetails.loading}>
                          <div class="spinner" style={{ width: '16px', height: '16px' }} />
                        </Show>
                      </div>
                    </div>
                    <div class="p-3 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
                      <div class="text-xs" style={{ color: 'var(--text-muted)' }}>Max Replicas</div>
                      <div style={{ color: 'var(--text-primary)' }}>
                        <Show when={!hpaDetails.loading && hpaDetails()}>
                          {(details) => details().maxReplicas || selected()?.maxReplicas || '-'}
                        </Show>
                        <Show when={hpaDetails.loading}>
                          <div class="spinner" style={{ width: '16px', height: '16px' }} />
                        </Show>
                      </div>
                    </div>
                    <div class="p-3 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
                      <div class="text-xs" style={{ color: 'var(--text-muted)' }}>Current Replicas</div>
                      <div style={{ color: 'var(--text-primary)' }}>
                        <Show when={!hpaDetails.loading && hpaDetails()}>
                          {(details) => details().currentReplicas || selected()?.currentReplicas || '-'}
                        </Show>
                        <Show when={hpaDetails.loading}>
                          <div class="spinner" style={{ width: '16px', height: '16px' }} />
                        </Show>
                      </div>
                    </div>
                    <div class="p-3 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
                      <div class="text-xs" style={{ color: 'var(--text-muted)' }}>Desired Replicas</div>
                      <div style={{ color: 'var(--text-primary)' }}>
                        <Show when={!hpaDetails.loading && hpaDetails()}>
                          {(details) => details().desiredReplicas || selected()?.desiredReplicas || '-'}
                        </Show>
                        <Show when={hpaDetails.loading}>
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
                <Show when={hpaDetails()}>
                  <RelatedResources
                    kind="hpa"
                    name={hpaDetails()!.name}
                    namespace={hpaDetails()!.namespace}
                    relatedData={hpaDetails()}
                  />
                </Show>

                {/* Metrics */}
                <Show when={!hpaDetails.loading && hpaDetails()?.metrics && Array.isArray(hpaDetails()!.metrics) && hpaDetails()!.metrics.length > 0}>
                  <div>
                    <h3 class="text-sm font-semibold mb-3" style={{ color: 'var(--text-secondary)' }}>Metrics</h3>
                    <div class="rounded-lg border overflow-x-auto" style={{ 'border-color': 'var(--border-color)', background: 'var(--bg-secondary)' }}>
                      <table class="w-full">
                        <thead>
                          <tr style={{ background: 'var(--bg-tertiary)' }}>
                            <th class="px-4 py-2 text-left text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Type</th>
                            <th class="px-4 py-2 text-left text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Resource</th>
                            <th class="px-4 py-2 text-left text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Target</th>
                          </tr>
                        </thead>
                        <tbody>
                          <For each={hpaDetails()!.metrics}>
                            {(metric: any) => (
                              <tr class="border-b" style={{ 'border-color': 'var(--border-color)' }}>
                                <td class="px-4 py-2 text-sm" style={{ color: 'var(--text-primary)' }}>{metric.type}</td>
                                <td class="px-4 py-2 text-sm" style={{ color: 'var(--text-primary)' }}>{metric.resource?.name || '-'}</td>
                                <td class="px-4 py-2 text-sm" style={{ color: 'var(--text-primary)' }}>
                                  {metric.targetUtilization ? `${metric.targetUtilization}%` : '-'}
                                </td>
                              </tr>
                            )}
                          </For>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </Show>

                {/* Current Metrics */}
                <Show when={!hpaDetails.loading && hpaDetails()?.currentMetrics && Array.isArray(hpaDetails()!.currentMetrics) && hpaDetails()!.currentMetrics.length > 0}>
                  <div>
                    <h3 class="text-sm font-semibold mb-3" style={{ color: 'var(--text-secondary)' }}>Current Metrics</h3>
                    <div class="rounded-lg border overflow-x-auto" style={{ 'border-color': 'var(--border-color)', background: 'var(--bg-secondary)' }}>
                      <table class="w-full">
                        <thead>
                          <tr style={{ background: 'var(--bg-tertiary)' }}>
                            <th class="px-4 py-2 text-left text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Type</th>
                            <th class="px-4 py-2 text-left text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Resource</th>
                            <th class="px-4 py-2 text-left text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Current</th>
                          </tr>
                        </thead>
                        <tbody>
                          <For each={hpaDetails()!.currentMetrics}>
                            {(metric: any) => (
                              <tr class="border-b" style={{ 'border-color': 'var(--border-color)' }}>
                                <td class="px-4 py-2 text-sm" style={{ color: 'var(--text-primary)' }}>{metric.type}</td>
                                <td class="px-4 py-2 text-sm" style={{ color: 'var(--text-primary)' }}>{metric.resource?.name || '-'}</td>
                                <td class="px-4 py-2 text-sm" style={{ color: 'var(--text-primary)' }}>
                                  {metric.currentUtilization ? `${metric.currentUtilization}%` : metric.currentValue || '-'}
                                </td>
                              </tr>
                            )}
                          </For>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </Show>

                {/* Conditions */}
                <Show when={!hpaDetails.loading && hpaDetails()?.conditions && Array.isArray(hpaDetails()!.conditions) && hpaDetails()!.conditions.length > 0}>
                  <div>
                    <h3 class="text-sm font-semibold mb-3" style={{ color: 'var(--text-secondary)' }}>Conditions</h3>
                    <div class="space-y-2">
                      <For each={hpaDetails()!.conditions}>
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
                <div class="grid grid-cols-2 md:grid-cols-4 gap-2 pt-3">
                  <button
                    onClick={() => { setShowDetails(false); handleViewYAML(selected()!); }}
                    class="btn-secondary flex flex-col items-center justify-center gap-1 px-2 py-2 rounded text-xs"
                    title="YAML"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                    </svg>
                    <span>YAML</span>
                  </button>
                  <button
                    onClick={() => { setShowDetails(false); handleDescribe(selected()!); }}
                    class="btn-secondary flex flex-col items-center justify-center gap-1 px-2 py-2 rounded text-xs"
                    title="Describe"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Describe</span>
                  </button>
                  <button
                    onClick={() => { setShowDetails(false); handleEdit(selected()!); }}
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
                      handleDelete(selected()!);
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

      {/* YAML Viewer Modal */}
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

      {/* YAML Editor Modal */}
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
      <Show when={showDescribe() && selected()}>
        <DescribeModal
          resourceName={selected()!.name}
          resourceNamespace={selected()!.namespace}
          getDescribe={api.getHPADescribe}
          onClose={() => setShowDescribe(false)}
        />
      </Show>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteConfirm()}
        onClose={() => {
          if (!deleting()) {
            setShowDeleteConfirm(false);
            setShowDetails(false);
          }
        }}
        title="Delete HPA"
        message={selected() ? `Are you sure you want to delete the HPA "${selected()!.name}"?` : 'Are you sure you want to delete this HPA?'}
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
    </div>
  );
};

export default HPA;

