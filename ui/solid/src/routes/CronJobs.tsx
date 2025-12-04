import { Component, For, Show, createMemo, createSignal, createResource } from 'solid-js';
import { api } from '../services/api';
import { namespace } from '../stores/cluster';
import { addNotification } from '../stores/ui';
import Modal from '../components/Modal';
import YAMLViewer from '../components/YAMLViewer';
import YAMLEditor from '../components/YAMLEditor';
import DescribeModal from '../components/DescribeModal';
import ActionMenu from '../components/ActionMenu';

interface CronJob {
  name: string;
  namespace: string;
  schedule: string;
  suspend: boolean;
  active: number;
  lastSchedule: string;
  age: string;
}

type SortField = 'name' | 'namespace' | 'active' | 'age';
type SortDirection = 'asc' | 'desc';

const CronJobs: Component = () => {
  const [search, setSearch] = createSignal('');
  const [sortField, setSortField] = createSignal<SortField>('name');
  const [sortDirection, setSortDirection] = createSignal<SortDirection>('asc');
  const [currentPage, setCurrentPage] = createSignal(1);
  const [pageSize, setPageSize] = createSignal(20);
  const [selected, setSelected] = createSignal<CronJob | null>(null);
  const [showYaml, setShowYaml] = createSignal(false);
  const [showEdit, setShowEdit] = createSignal(false);
  const [showDescribe, setShowDescribe] = createSignal(false);
  const [fontSize, setFontSize] = createSignal(parseInt(localStorage.getItem('cronjobs-font-size') || '14'));
  const [fontFamily, setFontFamily] = createSignal(localStorage.getItem('cronjobs-font-family') || 'Monaco');

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
    localStorage.setItem('cronjobs-font-size', size.toString());
  };

  const handleFontFamilyChange = (family: string) => {
    setFontFamily(family);
    localStorage.setItem('cronjobs-font-family', family);
  };

  const [cronjobs, { refetch }] = createResource(namespace, api.getCronJobs);
  const [yamlContent] = createResource(
    () => (showYaml() || showEdit()) && selected() ? { name: selected()!.name, ns: selected()!.namespace } : null,
    async (params) => {
      if (!params) return '';
      const data = await api.getCronJobYAML(params.name, params.ns);
      return data.yaml || '';
    }
  );

  const handleSaveYAML = async (yaml: string) => {
    const cj = selected();
    if (!cj) return;
    try {
      await api.updateCronJob(cj.name, cj.namespace, yaml);
      addNotification(`✅ CronJob ${cj.name} updated successfully`, 'success');
      setShowEdit(false);
      setTimeout(() => refetch(), 500);
      setTimeout(() => refetch(), 2000);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      addNotification(`❌ Failed to update cronjob: ${errorMsg}`, 'error');
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
    let all = cronjobs() || [];
    const query = search().toLowerCase();

    // Filter by search
    if (query) {
      all = all.filter((c: CronJob) =>
        c.name.toLowerCase().includes(query) ||
        c.namespace.toLowerCase().includes(query)
      );
    }

    // Sort
    const field = sortField();
    const direction = sortDirection();
    all = [...all].sort((a: CronJob, b: CronJob) => {
      let comparison = 0;
      switch (field) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'namespace':
          comparison = a.namespace.localeCompare(b.namespace);
          break;
        case 'active':
          comparison = a.active - b.active;
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
  const paginatedCronJobs = createMemo(() => {
    const start = (currentPage() - 1) * pageSize();
    return filteredAndSorted().slice(start, start + pageSize());
  });

  const statusCounts = createMemo(() => {
    const all = cronjobs() || [];
    return {
      total: all.length,
      active: all.filter((c: CronJob) => c.active > 0).length,
      suspended: all.filter((c: CronJob) => c.suspend).length,
      scheduled: all.filter((c: CronJob) => !c.suspend && c.active === 0).length,
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

  const triggerCronJob = async (cj: CronJob) => {
    try {
      await api.triggerCronJob(cj.name, cj.namespace);
      refetch();
    } catch (error) {
      console.error('Failed to trigger CronJob:', error);
    }
  };

  const toggleSuspend = async (cj: CronJob) => {
    try {
      await api.suspendCronJob(cj.name, cj.namespace, !cj.suspend);
      refetch();
    } catch (error) {
      console.error('Failed to toggle suspend CronJob:', error);
    }
  };

  const deleteCronJob = async (cj: CronJob) => {
    if (!confirm(`Are you sure you want to delete CronJob "${cj.name}" in namespace "${cj.namespace}"?`)) return;
    try {
      await api.deleteCronJob(cj.name, cj.namespace);
      addNotification(`CronJob ${cj.name} deleted successfully`, 'success');
      refetch();
    } catch (error) {
      console.error('Failed to delete CronJob:', error);
      addNotification(`Failed to delete CronJob: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    }
  };

  return (
    <div class="space-y-4">
      {/* Header */}
      <div class="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 class="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>CronJobs</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Scheduled job management</p>
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
              refetch();
            }}
            class="icon-btn"
            style={{ background: 'var(--bg-secondary)' }}
            title="Refresh CronJobs"
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
          <span style={{ color: 'var(--text-secondary)' }} class="text-sm">Active</span>
          <span class="text-xl font-bold" style={{ color: 'var(--success-color)' }}>{statusCounts().active}</span>
        </div>
        <div class="card px-4 py-2 cursor-pointer hover:opacity-80 flex items-center gap-2" style={{ 'border-left': '3px solid var(--warning-color)' }}>
          <span style={{ color: 'var(--text-secondary)' }} class="text-sm">Suspended</span>
          <span class="text-xl font-bold" style={{ color: 'var(--warning-color)' }}>{statusCounts().suspended}</span>
        </div>
        <div class="card px-4 py-2 cursor-pointer hover:opacity-80 flex items-center gap-2" style={{ 'border-left': '3px solid #3b82f6' }}>
          <span style={{ color: 'var(--text-secondary)' }} class="text-sm">Scheduled</span>
          <span class="text-xl font-bold" style={{ color: '#3b82f6' }}>{statusCounts().scheduled}</span>
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

      {/* CronJobs table */}
      <div class="overflow-hidden rounded-lg" style={{ background: '#000000' }}>
        <Show
          when={!cronjobs.loading}
          fallback={
            <div class="p-8 text-center">
              <div class="spinner mx-auto mb-2" />
              <span style={{ color: 'var(--text-muted)' }}>Loading CronJobs...</span>
            </div>
          }
        >
          <div class="overflow-x-auto">
            <table class="data-table terminal-table" style={{ 'font-size': `${fontSize()}px`, 'font-family': getFontFamilyCSS(fontFamily()), color: '#0ea5e9', 'font-weight': '900' }}>
              <style>{`
                table { width: 100%; border-collapse: collapse; }
                thead { background: #000000; position: sticky; top: 0; z-index: 10; }
                tbody tr:hover { background: rgba(14, 165, 233, 0.1); }
              `}</style>
              <thead>
                <tr>
                  <th class="cursor-pointer select-none whitespace-nowrap" onClick={() => handleSort('name')}>
                    <div class="flex items-center gap-1">Name <SortIcon field="name" /></div>
                  </th>
                  <th class="cursor-pointer select-none whitespace-nowrap" onClick={() => handleSort('namespace')}>
                    <div class="flex items-center gap-1">Namespace <SortIcon field="namespace" /></div>
                  </th>
                  <th class="whitespace-nowrap">Schedule</th>
                  <th class="whitespace-nowrap">Suspend</th>
                  <th class="cursor-pointer select-none whitespace-nowrap" onClick={() => handleSort('active')}>
                    <div class="flex items-center gap-1">Active <SortIcon field="active" /></div>
                  </th>
                  <th class="whitespace-nowrap">Last Schedule</th>
                  <th class="cursor-pointer select-none whitespace-nowrap" onClick={() => handleSort('age')}>
                    <div class="flex items-center gap-1">Age <SortIcon field="age" /></div>
                  </th>
                  <th class="whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody>
                <For each={paginatedCronJobs()} fallback={
                  <tr><td colspan="8" class="text-center py-8" style={{ color: 'var(--text-muted)' }}>No CronJobs found</td></tr>
                }>
                  {(cj: CronJob) => (
                    <tr>
                      <td>
                        <button
                          onClick={() => { setSelected(cj); setShowDescribe(true); }}
                          class="font-medium hover:underline text-left"
                          style={{ color: 'var(--accent-primary)' }}
                        >
                          {cj.name.length > 40 ? cj.name.slice(0, 37) + '...' : cj.name}
                        </button>
                      </td>
                      <td>{cj.namespace}</td>
                      <td>
                        <code class="px-2 py-1 rounded text-xs" style={{ background: 'var(--bg-tertiary)' }}>
                          {cj.schedule}
                        </code>
                      </td>
                      <td>
                        <span class={`badge ${cj.suspend ? 'badge-warning' : 'badge-success'}`}>
                          {cj.suspend ? 'Yes' : 'No'}
                        </span>
                      </td>
                      <td>{cj.active}</td>
                      <td>{cj.lastSchedule || 'Never'}</td>
                      <td>{cj.age}</td>
                      <td>
                        <ActionMenu
                          actions={[
                            { label: 'Trigger', icon: 'restart', onClick: () => triggerCronJob(cj) },
                            { label: cj.suspend ? 'Resume' : 'Suspend', icon: 'restart', onClick: () => toggleSuspend(cj) },
                            { label: 'View YAML', icon: 'yaml', onClick: () => { setSelected(cj); setShowYaml(true); } },
                            { label: 'Edit YAML', icon: 'edit', onClick: () => { setSelected(cj); setShowEdit(true); } },
                            { label: 'Delete', icon: 'delete', onClick: () => deleteCronJob(cj), variant: 'danger', divider: true },
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
                Showing {((currentPage() - 1) * pageSize()) + 1} - {Math.min(currentPage() * pageSize(), filteredAndSorted().length)} of {filteredAndSorted().length} CronJobs
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
      <DescribeModal isOpen={showDescribe()} onClose={() => setShowDescribe(false)} resourceType="cronjob" name={selected()?.name || ''} namespace={selected()?.namespace} />
    </div>
  );
};

export default CronJobs;
