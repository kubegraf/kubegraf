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
import ActionMenu from '../components/ActionMenu';
import SecurityRecommendations from '../components/SecurityRecommendations';
import { startExecution } from '../stores/executionPanel';

interface PDB {
  name: string;
  namespace: string;
  minAvailable?: string;
  maxUnavailable?: string;
  allowedDisruptions: number;
  currentHealthy: number;
  desiredHealthy: number;
  age: string;
}

type SortField = 'name' | 'namespace' | 'allowedDisruptions' | 'age';
type SortDirection = 'asc' | 'desc';

const PDB: Component = () => {
  const [sortField, setSortField] = createSignal<SortField>('name');
  const [sortDirection, setSortDirection] = createSignal<SortDirection>('asc');
  const [currentPage, setCurrentPage] = createSignal(1);
  const [pageSize, setPageSize] = createSignal(20);
  const [selected, setSelected] = createSignal<PDB | null>(null);
  const [showYaml, setShowYaml] = createSignal(false);
  const [showEdit, setShowEdit] = createSignal(false);
  const [showDescribe, setShowDescribe] = createSignal(false);
  const [yamlKey, setYamlKey] = createSignal<string | null>(null);

  const getInitialFontSize = (): number => {
    const saved = localStorage.getItem('pdb-font-size');
    return saved ? parseInt(saved) : 14;
  };
  const [fontSize, setFontSize] = createSignal(getInitialFontSize());

  const updateFontSize = (size: number) => {
    setFontSize(size);
    localStorage.setItem('pdb-font-size', size.toString());
  };

  const pdbsResource = createCachedResource<PDB[]>(
    'pdbs',
    async () => {
      const ns = selectedNamespaces().length === 1 ? selectedNamespaces()[0] : undefined;
      return await api.getPDBs(ns);
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
        const data = await api.getPDBYAML(name, ns);
        return data.yaml || '';
      } catch (error) {
        console.error('Failed to fetch PDB YAML:', error);
        addNotification(`Failed to load YAML: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
        return '';
      }
    }
  );

  const filteredPDBs = createMemo(() => {
    const all = pdbsResource.data() || [];
    const query = searchQuery().toLowerCase();
    if (!query) return all;

    return all.filter((pdb: PDB) =>
      pdb.name.toLowerCase().includes(query) ||
      pdb.namespace.toLowerCase().includes(query)
    );
  });

  const sortedPDBs = createMemo(() => {
    const filtered = filteredPDBs();
    const sorted = [...filtered].sort((a, b) => {
      let aVal: any = a[sortField()];
      let bVal: any = b[sortField()];

      if (sortField() === 'age') {
        aVal = new Date(a.age).getTime();
        bVal = new Date(b.age).getTime();
      } else if (sortField() === 'allowedDisruptions') {
        aVal = a.allowedDisruptions || 0;
        bVal = b.allowedDisruptions || 0;
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

  const totalPages = createMemo(() => Math.ceil((filteredPDBs().length || 0) / pageSize()));

  const handleSort = (field: SortField) => {
    if (sortField() === field) {
      setSortDirection(sortDirection() === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleViewYAML = async (pdb: PDB) => {
    setSelected(pdb);
    setYamlKey(`${pdb.name}|${pdb.namespace}`);
    setShowYaml(true);
  };

  const handleEdit = async (pdb: PDB) => {
    setSelected(pdb);
    setYamlKey(`${pdb.name}|${pdb.namespace}`);
    setShowEdit(true);
  };

  const handleDescribe = async (pdb: PDB) => {
    setSelected(pdb);
    setShowDescribe(true);
  };

  const handleDelete = async (pdb: PDB) => {
    if (!confirm(`Are you sure you want to delete PDB "${pdb.name}" in namespace "${pdb.namespace}"?`)) {
      return;
    }
    try {
      await api.deletePDB(pdb.name, pdb.namespace);
      addNotification(`PDB "${pdb.name}" deleted successfully`, 'success');
      pdbsResource.refetch();
    } catch (error: any) {
      addNotification(`Failed to delete PDB: ${error.message}`, 'error');
    }
  };

  const handleSaveYAML = async (yaml: string) => {
    const pdb = selected();
    if (!pdb) return;

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
      label: `Apply PDB YAML: ${pdb.name}`,
      command: '__k8s-apply-yaml',
      args: [],
      mode: 'apply',
      kubernetesEquivalent: true,
      namespace: pdb.namespace,
      context: status.context,
      userAction: 'pdb-apply-yaml',
      dryRun: false,
      allowClusterWide: false,
      resource: 'pdb',
      action: 'update',
      intent: 'apply-yaml',
      yaml: trimmed,
    });

    setShowEdit(false);
    setTimeout(() => pdbsResource.refetch(), 1500);
  };

  const statusSummary = createMemo(() => {
    const all = filteredPDBs();
    return {
      total: all.length,
      healthy: all.filter((p: PDB) => p.currentHealthy >= p.desiredHealthy).length,
      unhealthy: all.filter((p: PDB) => p.currentHealthy < p.desiredHealthy).length,
    };
  });

  return (
    <div class="space-y-4 p-6">
      <div class="flex items-center justify-between mb-6">
        <div>
          <h1 class="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            Pod Disruption Budgets
          </h1>
          <p class="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            Manage pod availability during voluntary disruptions
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
      <SecurityRecommendations resourceType="PDB" />

      {/* Status Summary */}
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div class="card p-4" style={{ 'border-left': '4px solid var(--accent-primary)' }}>
          <div class="text-sm" style={{ color: 'var(--text-secondary)' }}>Total</div>
          <div class="text-2xl font-bold mt-1" style={{ color: 'var(--accent-primary)' }}>
            {statusSummary().total}
          </div>
        </div>
        <div class="card p-4" style={{ 'border-left': '4px solid var(--success-color)' }}>
          <div class="text-sm" style={{ color: 'var(--text-secondary)' }}>Healthy</div>
          <div class="text-2xl font-bold mt-1" style={{ color: 'var(--success-color)' }}>
            {statusSummary().healthy}
          </div>
        </div>
        <div class="card p-4" style={{ 'border-left': '4px solid var(--warning-color)' }}>
          <div class="text-sm" style={{ color: 'var(--text-secondary)' }}>Unhealthy</div>
          <div class="text-2xl font-bold mt-1" style={{ color: 'var(--warning-color)' }}>
            {statusSummary().unhealthy}
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div class="flex items-center gap-4 mb-4">
        <input
          type="text"
          placeholder="Search PDBs..."
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
        when={!pdbsResource.loading()}
        fallback={
          <div class="p-8 text-center">
            <div class="spinner mx-auto mb-2" />
            <span style={{ color: 'var(--text-muted)' }}>Loading PDBs...</span>
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
                <th
                  class="cursor-pointer select-none whitespace-nowrap"
                  onClick={() => handleSort('allowedDisruptions')}
                  style={{
                    padding: '0 8px',
                    'text-align': 'left',
                    'font-weight': '900',
                    color: '#0ea5e9',
                    'font-size': `${fontSize()}px`,
                    border: 'none'
                  }}
                >
                  Allowed Disruptions {sortField() === 'allowedDisruptions' && (sortDirection() === 'asc' ? '↑' : '↓')}
                </th>
                <th class="whitespace-nowrap" style={{
                  padding: '0 8px',
                  'text-align': 'left',
                  'font-weight': '900',
                  color: '#0ea5e9',
                  'font-size': `${fontSize()}px`,
                  border: 'none'
                }}>
                  Current / Desired
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
                each={sortedPDBs()}
                fallback={
                  <tr>
                    <td colspan="6" class="px-3 py-8 text-center" style={{ color: 'var(--text-muted)' }}>
                      No PDBs found
                    </td>
                  </tr>
                }
              >
                {(pdb) => {
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
                    }}>{pdb.name}</td>
                    <td style={{
                      padding: '0 8px',
                      'text-align': 'left',
                      color: textColor,
                      'font-weight': '900',
                      'font-size': `${fontSize()}px`,
                      height: `${Math.max(24, fontSize() * 1.7)}px`,
                      'line-height': `${Math.max(24, fontSize() * 1.7)}px`,
                      border: 'none'
                    }}>{pdb.namespace}</td>
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
                      {pdb.allowedDisruptions}
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
                      {pdb.currentHealthy} / {pdb.desiredHealthy}
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
                    }}>{pdb.age}</td>
                    <td style={{
                      padding: '0 8px',
                      'text-align': 'left',
                      height: `${Math.max(24, fontSize() * 1.7)}px`,
                      'line-height': `${Math.max(24, fontSize() * 1.7)}px`,
                      border: 'none'
                    }}>
                      <ActionMenu
                        actions={[
                          { label: 'View YAML', icon: 'yaml', onClick: () => handleViewYAML(pdb) },
                          { label: 'Edit YAML', icon: 'edit', onClick: () => handleEdit(pdb) },
                          { label: 'Describe', icon: 'describe', onClick: () => handleDescribe(pdb) },
                          { label: 'Delete', icon: 'delete', onClick: () => handleDelete(pdb), variant: 'danger', divider: true },
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
            Showing {(currentPage() - 1) * pageSize() + 1} to {Math.min(currentPage() * pageSize(), filteredPDBs().length)} of {filteredPDBs().length} PDBs
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
          getDescribe={api.getPDBDescribe}
          onClose={() => setShowDescribe(false)}
        />
      </Show>
    </div>
  );
};

export default PDB;

