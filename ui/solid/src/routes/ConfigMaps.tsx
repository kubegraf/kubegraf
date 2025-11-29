import { Component, For, Show, createMemo, createSignal, createResource } from 'solid-js';
import { api } from '../services/api';
import Modal from '../components/Modal';
import YAMLViewer from '../components/YAMLViewer';
import DescribeModal from '../components/DescribeModal';

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
  const [namespace, setNamespace] = createSignal('_all');
  const [search, setSearch] = createSignal('');
  const [sortField, setSortField] = createSignal<SortField>('name');
  const [sortDirection, setSortDirection] = createSignal<SortDirection>('asc');
  const [currentPage, setCurrentPage] = createSignal(1);
  const [pageSize, setPageSize] = createSignal(20);
  const [selected, setSelected] = createSignal<ConfigMap | null>(null);

  // Modal states
  const [showYaml, setShowYaml] = createSignal(false);
  const [showDetails, setShowDetails] = createSignal(false);
  const [showDescribe, setShowDescribe] = createSignal(false);

  const [namespaces] = createResource(api.getNamespaces);
  const [configmaps, { refetch }] = createResource(namespace, api.getConfigMaps);
  const [yamlContent] = createResource(
    () => showYaml() && selected() ? { name: selected()!.name, ns: selected()!.namespace } : null,
    async (params) => {
      if (!params) return '';
      const data = await api.getConfigMapYAML(params.name, params.ns);
      return data.yaml || '';
    }
  );

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

  return (
    <div class="space-y-6">
      {/* Header */}
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>ConfigMaps</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Configuration data storage</p>
        </div>
        <button onClick={() => refetch()} class="btn-primary flex items-center gap-2">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div class="flex flex-wrap gap-4">
        <select
          value={namespace()}
          onChange={(e) => { setNamespace(e.currentTarget.value); setCurrentPage(1); }}
          class="px-4 py-2 rounded-lg"
          style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
        >
          <option value="_all">All Namespaces</option>
          <For each={namespaces() || []}>{(ns) => <option value={ns}>{ns}</option>}</For>
        </select>

        <input
          type="text"
          placeholder="Search by name or namespace..."
          value={search()}
          onInput={(e) => { setSearch(e.currentTarget.value); setCurrentPage(1); }}
          class="flex-1 min-w-[200px] px-4 py-2 rounded-lg"
          style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
        />

        <select
          value={pageSize()}
          onChange={(e) => { setPageSize(parseInt(e.currentTarget.value)); setCurrentPage(1); }}
          class="px-4 py-2 rounded-lg"
          style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
        >
          <option value="10">10 per page</option>
          <option value="20">20 per page</option>
          <option value="50">50 per page</option>
          <option value="100">100 per page</option>
        </select>
      </div>

      {/* Summary */}
      <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div class="card p-4" style={{ 'border-left': '4px solid var(--accent-primary)' }}>
          <div style={{ color: 'var(--text-secondary)' }} class="text-sm">Total ConfigMaps</div>
          <div class="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{(configmaps() || []).length}</div>
        </div>
        <div class="card p-4" style={{ 'border-left': '4px solid #8b5cf6' }}>
          <div style={{ color: 'var(--text-secondary)' }} class="text-sm">Filtered</div>
          <div class="text-2xl font-bold" style={{ color: '#8b5cf6' }}>{filteredAndSorted().length}</div>
        </div>
        <div class="card p-4" style={{ 'border-left': '4px solid #22c55e' }}>
          <div style={{ color: 'var(--text-secondary)' }} class="text-sm">Namespaces</div>
          <div class="text-2xl font-bold" style={{ color: '#22c55e' }}>
            {new Set((configmaps() || []).map((c: ConfigMap) => c.namespace)).size}
          </div>
        </div>
      </div>

      {/* Table */}
      <div class="card overflow-hidden">
        <Show when={!configmaps.loading} fallback={<div class="p-8 text-center"><div class="spinner mx-auto" /></div>}>
          <div class="overflow-x-auto">
            <table class="data-table">
              <thead>
                <tr>
                  <th class="cursor-pointer select-none" onClick={() => handleSort('name')}>
                    Name <SortIcon field="name" />
                  </th>
                  <th class="cursor-pointer select-none" onClick={() => handleSort('namespace')}>
                    Namespace <SortIcon field="namespace" />
                  </th>
                  <th class="cursor-pointer select-none" onClick={() => handleSort('data')}>
                    Data <SortIcon field="data" />
                  </th>
                  <th class="cursor-pointer select-none" onClick={() => handleSort('age')}>
                    Age <SortIcon field="age" />
                  </th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                <For each={paginated()} fallback={
                  <tr><td colspan="5" class="text-center py-8" style={{ color: 'var(--text-muted)' }}>No ConfigMaps found</td></tr>
                }>
                  {(cm: ConfigMap) => (
                    <tr>
                      <td>
                        <button
                          onClick={() => openDetails(cm)}
                          class="font-medium hover:underline"
                          style={{ color: 'var(--accent-primary)' }}
                        >
                          {cm.name}
                        </button>
                      </td>
                      <td><span class="text-sm px-2 py-0.5 rounded" style={{ background: 'var(--bg-tertiary)' }}>{cm.namespace}</span></td>
                      <td><span class="badge badge-info">{cm.data} keys</span></td>
                      <td>{cm.age}</td>
                      <td>
                        <div class="flex items-center gap-1">
                          <button onClick={() => openDetails(cm)} class="action-btn" title="Details">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </button>
                          <button onClick={() => { setSelected(cm); setShowYaml(true); }} class="action-btn" title="View YAML">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                            </svg>
                          </button>
                          <button onClick={() => { setSelected(cm); setShowDescribe(true); }} class="action-btn" title="Describe">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                </For>
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <Show when={totalPages() > 1}>
            <div class="flex items-center justify-between p-4 border-t" style={{ 'border-color': 'var(--border-color)' }}>
              <div style={{ color: 'var(--text-secondary)' }} class="text-sm">
                Showing {((currentPage() - 1) * pageSize()) + 1} - {Math.min(currentPage() * pageSize(), filteredAndSorted().length)} of {filteredAndSorted().length}
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
      <Modal isOpen={showYaml()} onClose={() => setShowYaml(false)} title={`ConfigMap: ${selected()?.name}`} size="xl">
        <Show when={!yamlContent.loading} fallback={<div class="spinner mx-auto" />}>
          <YAMLViewer yaml={yamlContent() || ''} title={selected()?.name} />
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
    </div>
  );
};

export default ConfigMaps;
