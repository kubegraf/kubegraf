import { Component, For, Show, createMemo, createSignal, createResource } from 'solid-js';
import { api } from '../services/api';
import { namespace } from '../stores/cluster';
import { addNotification } from '../stores/ui';
import Modal from '../components/Modal';
import YAMLViewer from '../components/YAMLViewer';
import YAMLEditor from '../components/YAMLEditor';
import DescribeModal from '../components/DescribeModal';
import ActionMenu from '../components/ActionMenu';

interface Secret {
  name: string;
  namespace: string;
  type: string;
  data: number;
  age: string;
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

  // Modal states
  const [showYaml, setShowYaml] = createSignal(false);
  const [showEdit, setShowEdit] = createSignal(false);
  const [showDetails, setShowDetails] = createSignal(false);
  const [showDescribe, setShowDescribe] = createSignal(false);

  const [secrets, { refetch }] = createResource(namespace, api.getSecrets);
  const [yamlContent] = createResource(
    () => (showYaml() || showEdit()) && selected() ? { name: selected()!.name, ns: selected()!.namespace } : null,
    async (params) => {
      if (!params) return '';
      const data = await api.getSecretYAML(params.name, params.ns);
      return data.yaml || '';
    }
  );

  const handleSaveYAML = async (yaml: string) => {
    const secret = selected();
    if (!secret) return;
    try {
      await api.updateSecret(secret.name, secret.namespace, yaml);
      addNotification(`✅ Secret ${secret.name} updated successfully`, 'success');
      setShowEdit(false);
      setTimeout(() => refetch(), 500);
      setTimeout(() => refetch(), 2000);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      addNotification(`❌ Failed to update secret: ${errorMsg}`, 'error');
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

  const deleteSecret = async (secret: Secret) => {
    if (!confirm(`Are you sure you want to delete secret "${secret.name}" in namespace "${secret.namespace}"?`)) return;
    try {
      await api.deleteSecret(secret.name, secret.namespace);
      addNotification(`Secret ${secret.name} deleted successfully`, 'success');
      refetch();
    } catch (error) {
      console.error('Failed to delete secret:', error);
      addNotification(`Failed to delete secret: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    }
  };

  const getTypeBadgeClass = (type: string) => {
    if (type.includes('tls')) return 'badge-success';
    if (type.includes('Opaque')) return 'badge-default';
    if (type.includes('helm')) return 'badge-info';
    return 'badge-default';
  };

  return (
    <div class="space-y-4" style={{ background: 'var(--bg-primary)', minHeight: '100%' }}>
      {/* Header */}
      <div class="flex items-center justify-between">
        <h1 class="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Secrets</h1>
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

      {/* Secrets Table */}
      <div class="overflow-hidden rounded-lg w-full" style={{ background: '#0d1117' }}>
        <Show when={!secrets.loading} fallback={
          <div class="p-8 text-center">
            <div class="spinner mx-auto mb-2" />
            <span style={{ color: 'var(--text-muted)' }}>Loading Secrets...</span>
          </div>
        }>
          <div class="overflow-x-auto">
            <table class="data-table terminal-table">
                <thead>
                  <tr>
                    <th onClick={() => handleSort('name')} class="cursor-pointer select-none whitespace-nowrap">
                      <div class="flex items-center gap-1">Name <SortIcon field="name" /></div>
                    </th>
                    <th onClick={() => handleSort('namespace')} class="cursor-pointer select-none whitespace-nowrap">
                      <div class="flex items-center gap-1">Namespace <SortIcon field="namespace" /></div>
                    </th>
                    <th onClick={() => handleSort('type')} class="cursor-pointer select-none whitespace-nowrap">
                      <div class="flex items-center gap-1">Type <SortIcon field="type" /></div>
                    </th>
                    <th onClick={() => handleSort('data')} class="cursor-pointer select-none whitespace-nowrap">
                      <div class="flex items-center gap-1">Data <SortIcon field="data" /></div>
                    </th>
                    <th onClick={() => handleSort('age')} class="cursor-pointer select-none whitespace-nowrap">
                      <div class="flex items-center gap-1">Age <SortIcon field="age" /></div>
                    </th>
                    <th class="whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <For each={paginated()} fallback={
                    <tr><td colspan="6" class="text-center py-8" style={{ color: 'var(--text-muted)' }}>No secrets found</td></tr>
                  }>
                    {(secret: Secret) => (
                      <tr>
                        <td>
                          <button
                            onClick={() => { setSelected(secret); setShowDescribe(true); }}
                            class="font-medium hover:underline text-left"
                            style={{ color: 'var(--accent-primary)' }}
                          >
                            {secret.name.length > 40 ? secret.name.slice(0, 37) + '...' : secret.name}
                          </button>
                        </td>
                        <td>{secret.namespace}</td>
                        <td>
                          <span class={`badge ${getTypeBadgeClass(secret.type)}`}>
                            {secret.type}
                          </span>
                        </td>
                        <td>{secret.data}</td>
                        <td>{secret.age}</td>
                        <td>
                          <ActionMenu
                            actions={[
                              { label: 'View YAML', icon: 'yaml', onClick: () => { setSelected(secret); setShowYaml(true); } },
                              { label: 'Edit YAML', icon: 'edit', onClick: () => { setSelected(secret); setShowEdit(true); } },
                              { label: 'Describe', icon: 'describe', onClick: () => { setSelected(secret); setShowDescribe(true); } },
                              { label: 'Delete', icon: 'delete', onClick: () => deleteSecret(secret), variant: 'danger', divider: true },
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
                  Showing {((currentPage() - 1) * pageSize()) + 1} - {Math.min(currentPage() * pageSize(), filteredAndSorted().length)} of {filteredAndSorted().length} Secrets
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
      <DescribeModal
        isOpen={showDescribe()}
        onClose={() => setShowDescribe(false)}
        resourceType="secret"
        name={selected()?.name || ''}
        namespace={selected()?.namespace || ''}
      />
    </div>
  );
};

export default Secrets;

