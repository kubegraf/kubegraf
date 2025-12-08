import { Component, For, Show, createMemo, createSignal, createResource } from 'solid-js';
import { api } from '../services/api';
import { namespace } from '../stores/cluster';
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
    setShowYaml(true);
  };

  const handleEdit = async (pdb: PDB) => {
    setSelected(pdb);
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
    if (!selected()) return;
    try {
      await api.updatePDB(selected()!.name, selected()!.namespace, yaml);
      addNotification('PDB updated successfully', 'success');
      setShowEdit(false);
      pdbsResource.refetch();
    } catch (error: any) {
      addNotification(`Failed to update PDB: ${error.message}`, 'error');
    }
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
          <table class="w-full" style={{ 'border-collapse': 'collapse', 'font-size': `${fontSize()}px` }}>
            <thead>
              <tr style={{ background: 'var(--bg-secondary)', 'border-bottom': '1px solid var(--border-color)' }}>
                <th
                  class="cursor-pointer px-3 py-2 text-left"
                  onClick={() => handleSort('name')}
                  style={{ color: 'var(--accent-primary)', 'font-weight': '900' }}
                >
                  Name {sortField() === 'name' && (sortDirection() === 'asc' ? '↑' : '↓')}
                </th>
                <th
                  class="cursor-pointer px-3 py-2 text-left"
                  onClick={() => handleSort('namespace')}
                  style={{ color: 'var(--accent-primary)', 'font-weight': '900' }}
                >
                  Namespace {sortField() === 'namespace' && (sortDirection() === 'asc' ? '↑' : '↓')}
                </th>
                <th
                  class="cursor-pointer px-3 py-2 text-left"
                  onClick={() => handleSort('allowedDisruptions')}
                  style={{ color: 'var(--accent-primary)', 'font-weight': '900' }}
                >
                  Allowed Disruptions {sortField() === 'allowedDisruptions' && (sortDirection() === 'asc' ? '↑' : '↓')}
                </th>
                <th class="px-3 py-2 text-left" style={{ color: 'var(--accent-primary)', 'font-weight': '900' }}>
                  Current / Desired
                </th>
                <th
                  class="cursor-pointer px-3 py-2 text-left"
                  onClick={() => handleSort('age')}
                  style={{ color: 'var(--accent-primary)', 'font-weight': '900' }}
                >
                  Age {sortField() === 'age' && (sortDirection() === 'asc' ? '↑' : '↓')}
                </th>
                <th class="px-3 py-2 text-left" style={{ color: 'var(--accent-primary)', 'font-weight': '900' }}>
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
                {(pdb) => (
                  <tr
                    style={{
                      'border-bottom': '1px solid var(--border-color)',
                      background: 'var(--bg-card)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--bg-secondary)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'var(--bg-card)';
                    }}
                  >
                    <td class="px-3 py-2" style={{ color: 'var(--text-primary)' }}>{pdb.name}</td>
                    <td class="px-3 py-2" style={{ color: 'var(--text-primary)' }}>{pdb.namespace}</td>
                    <td class="px-3 py-2" style={{ color: 'var(--text-primary)' }}>
                      {pdb.allowedDisruptions}
                    </td>
                    <td class="px-3 py-2" style={{ color: 'var(--text-primary)' }}>
                      {pdb.currentHealthy} / {pdb.desiredHealthy}
                    </td>
                    <td class="px-3 py-2" style={{ color: 'var(--text-secondary)' }}>{pdb.age}</td>
                    <td class="px-3 py-2">
                      <ActionMenu
                        actions={[
                          { label: 'View YAML', icon: 'yaml', onClick: () => handleViewYAML(pdb) },
                          { label: 'Edit', icon: 'edit', onClick: () => handleEdit(pdb) },
                          { label: 'Describe', icon: 'describe', onClick: () => handleDescribe(pdb) },
                          { label: 'Delete', icon: 'delete', onClick: () => handleDelete(pdb) },
                        ]}
                      />
                    </td>
                  </tr>
                )}
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
      <Show when={showYaml() && selected()}>
        <Modal
          title={`PDB: ${selected()!.name}`}
          onClose={() => setShowYaml(false)}
          size="large"
        >
          <YAMLViewer yaml={''} resourceName={selected()!.name} resourceNamespace={selected()!.namespace} getYAML={api.getPDBYAML} />
        </Modal>
      </Show>

      {/* YAML Editor Modal */}
      <Show when={showEdit() && selected()}>
        <Modal
          title={`Edit PDB: ${selected()!.name}`}
          onClose={() => setShowEdit(false)}
          size="large"
        >
          <YAMLEditor
            resourceName={selected()!.name}
            resourceNamespace={selected()!.namespace}
            getYAML={api.getPDBYAML}
            onSave={handleSaveYAML}
          />
        </Modal>
      </Show>

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

