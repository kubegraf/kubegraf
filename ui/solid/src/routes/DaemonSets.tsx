import { Component, For, Show, createMemo, createSignal, createResource } from 'solid-js';
import { api } from '../services/api';
import { namespace } from '../stores/cluster';
import { addNotification } from '../stores/ui';
import Modal from '../components/Modal';
import YAMLViewer from '../components/YAMLViewer';
import YAMLEditor from '../components/YAMLEditor';
import DescribeModal from '../components/DescribeModal';
import ActionMenu from '../components/ActionMenu';

interface DaemonSet {
  name: string;
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

  const [daemonsets, { refetch }] = createResource(namespace, api.getDaemonSets);
  const [yamlContent] = createResource(
    () => (showYaml() || showEdit()) && selected() ? { name: selected()!.name, ns: selected()!.namespace } : null,
    async (params) => {
      if (!params) return '';
      const data = await api.getDaemonSetYAML(params.name, params.ns);
      return data.yaml || '';
    }
  );

  const handleSaveYAML = async (yaml: string) => {
    const ds = selected();
    if (!ds) return;
    try {
      await api.updateDaemonSet(ds.name, ds.namespace, yaml);
      addNotification(`✅ DaemonSet ${ds.name} updated successfully`, 'success');
      setShowEdit(false);
      setTimeout(() => refetch(), 500);
      setTimeout(() => refetch(), 2000);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      addNotification(`❌ Failed to update daemonset: ${errorMsg}`, 'error');
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

  const deleteDaemonSet = async (ds: DaemonSet) => {
    if (!confirm(`Are you sure you want to delete DaemonSet "${ds.name}" in namespace "${ds.namespace}"?`)) return;
    try {
      await api.deleteDaemonSet(ds.name, ds.namespace);
      addNotification(`DaemonSet ${ds.name} deleted successfully`, 'success');
      refetch();
    } catch (error) {
      console.error('Failed to delete DaemonSet:', error);
      addNotification(`Failed to delete DaemonSet: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    }
  };

  return (
    <div class="space-y-4">
      {/* Header */}
      <div class="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 class="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>DaemonSets</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Node-level workloads running on all or selected nodes</p>
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
      <div class="overflow-hidden rounded-lg" style={{ background: '#0d1117' }}>
        <Show
          when={!daemonsets.loading}
          fallback={
            <div class="p-8 text-center">
              <div class="spinner mx-auto mb-2" />
              <span style={{ color: 'var(--text-muted)' }}>Loading DaemonSets...</span>
            </div>
          }
        >
          <div class="overflow-x-auto">
            <table class="data-table terminal-table">
              <thead>
                <tr>
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
                  <tr><td colspan="8" class="text-center py-8" style={{ color: 'var(--text-muted)' }}>No DaemonSets found</td></tr>
                }>
                  {(ds: DaemonSet) => (
                    <tr>
                      <td>
                        <button
                          onClick={() => { setSelected(ds); setShowDescribe(true); }}
                          class="font-medium hover:underline text-left"
                          style={{ color: 'var(--accent-primary)' }}
                        >
                          {ds.name.length > 40 ? ds.name.slice(0, 37) + '...' : ds.name}
                        </button>
                      </td>
                      <td>{ds.namespace}</td>
                      <td>{ds.desired}</td>
                      <td>{ds.current}</td>
                      <td>
                        <span class={`badge ${ds.ready === ds.desired ? 'badge-success' : 'badge-warning'}`}>
                          {ds.ready}
                        </span>
                      </td>
                      <td>{ds.available}</td>
                      <td>{ds.age}</td>
                      <td>
                        <ActionMenu
                          actions={[
                            { label: 'Restart', icon: 'restart', onClick: () => restart(ds) },
                            { label: 'View YAML', icon: 'yaml', onClick: () => { setSelected(ds); setShowYaml(true); } },
                            { label: 'Edit YAML', icon: 'edit', onClick: () => { setSelected(ds); setShowEdit(true); } },
                            { label: 'Delete', icon: 'delete', onClick: () => deleteDaemonSet(ds), variant: 'danger', divider: true },
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
          <Show when={totalPages() > 1}>
            <div class="flex items-center justify-between p-4 font-mono text-sm" style={{ background: '#161b22' }}>
              <div style={{ color: '#8b949e' }}>
                Showing {((currentPage() - 1) * pageSize()) + 1} - {Math.min(currentPage() * pageSize(), filteredAndSorted().length)} of {filteredAndSorted().length} DaemonSets
              </div>
              <div class="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage() === 1}
                  class="px-3 py-1 rounded text-sm disabled:opacity-50"
                  style={{ background: '#21262d', color: '#c9d1d9' }}
                >
                  First
                </button>
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage() === 1}
                  class="px-3 py-1 rounded text-sm disabled:opacity-50"
                  style={{ background: '#21262d', color: '#c9d1d9' }}
                >
                  ← Prev
                </button>
                <span class="px-3 py-1" style={{ color: '#c9d1d9' }}>
                  Page {currentPage()} of {totalPages()}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages(), p + 1))}
                  disabled={currentPage() === totalPages()}
                  class="px-3 py-1 rounded text-sm disabled:opacity-50"
                  style={{ background: '#21262d', color: '#c9d1d9' }}
                >
                  Next →
                </button>
                <button
                  onClick={() => setCurrentPage(totalPages())}
                  disabled={currentPage() === totalPages()}
                  class="px-3 py-1 rounded text-sm disabled:opacity-50"
                  style={{ background: '#21262d', color: '#c9d1d9' }}
                >
                  Last
                </button>
              </div>
            </div>
          </Show>
        </Show>
      </div>

      {/* YAML Modal */}
      <Modal isOpen={showYaml()} onClose={() => setShowYaml(false)} title={`YAML: ${selected()?.name}`} size="xl">
        <Show when={!yamlContent.loading} fallback={<div class="spinner mx-auto" />}>
          <YAMLViewer yaml={yamlContent() || ''} title={selected()?.name} />
        </Show>
      </Modal>

      {/* Edit YAML Modal */}
      <Modal isOpen={showEdit()} onClose={() => setShowEdit(false)} title={`Edit YAML: ${selected()?.name}`} size="xl">
        <Show when={!yamlContent.loading} fallback={<div class="spinner mx-auto" />}>
          <div style={{ height: '70vh' }}>
            <YAMLEditor
              yaml={yamlContent() || ''}
              title={selected()?.name}
              onSave={handleSaveYAML}
              onCancel={() => setShowEdit(false)}
            />
          </div>
        </Show>
      </Modal>

      {/* Describe Modal */}
      <DescribeModal isOpen={showDescribe()} onClose={() => setShowDescribe(false)} resourceType="daemonset" name={selected()?.name || ''} namespace={selected()?.namespace} />
    </div>
  );
};

export default DaemonSets;
