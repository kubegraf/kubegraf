import { Component, For, Show, createMemo, createSignal, createResource } from 'solid-js';
import { api } from '../services/api';
import { clusterStatus } from '../stores/cluster';
import { addNotification } from '../stores/ui';
import {
  selectedNamespaces,
  globalLoading,
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

interface Job {
  name: string;
  namespace: string;
  completions: string;
  duration: string;
  age: string;
  status: string;
}

type SortField = 'name' | 'namespace' | 'status' | 'age';
type SortDirection = 'asc' | 'desc';

const Jobs: Component = () => {
  const [search, setSearch] = createSignal('');
  const [sortField, setSortField] = createSignal<SortField>('name');
  const [sortDirection, setSortDirection] = createSignal<SortDirection>('asc');
  const [currentPage, setCurrentPage] = createSignal(1);
  const [pageSize, setPageSize] = createSignal(20);
  const [selected, setSelected] = createSignal<Job | null>(null);
  const [showYaml, setShowYaml] = createSignal(false);
  const [showEdit, setShowEdit] = createSignal(false);
  const [showDescribe, setShowDescribe] = createSignal(false);
  const [showDetails, setShowDetails] = createSignal(false);
  const [yamlKey, setYamlKey] = createSignal<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = createSignal(false);
  const [deleting, setDeleting] = createSignal(false);
  const [fontSize, setFontSize] = createSignal(parseInt(localStorage.getItem('jobs-font-size') || '14'));
  const [fontFamily, setFontFamily] = createSignal(localStorage.getItem('jobs-font-family') || 'Monaco');

  // Bulk selection
  const bulk = useBulkSelection<Job>();
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
    localStorage.setItem('jobs-font-size', size.toString());
  };

  const handleFontFamilyChange = (family: string) => {
    setFontFamily(family);
    localStorage.setItem('jobs-font-family', family);
  };

  // Determine namespace parameter from global store
  const getNamespaceParam = (): string | undefined => {
    const namespaces = selectedNamespaces();
    if (namespaces.length === 0) return undefined; // All namespaces
    if (namespaces.length === 1) return namespaces[0];
    // For multiple namespaces, backend should handle it via query params
    // For now, pass first namespace (backend may need to be updated to handle multiple)
    return namespaces[0];
  };

  // CACHED RESOURCE - Uses globalStore and cache
  const jobsCache = createCachedResource<Job[]>(
    'jobs',
    async () => {
      setGlobalLoading(true);
      try {
        const namespaceParam = getNamespaceParam();
        const jobs = await api.getJobs(namespaceParam);
        return jobs;
      } finally {
        setGlobalLoading(false);
      }
    },
    {
      ttl: 15000, // 15 seconds
      backgroundRefresh: true,
    }
  );

  const jobs = createMemo(() => jobsCache.data() || []);
  const refetch = () => jobsCache.refetch();
  const [yamlContent] = createResource(
    () => yamlKey(),
    async (key) => {
      if (!key) return '';
      const [name, ns] = key.split('|');
      if (!name || !ns) return '';
      try {
        const data = await api.getJobYAML(name, ns);
        return data.yaml || '';
      } catch (error) {
        console.error('Failed to fetch job YAML:', error);
        addNotification(`Failed to load YAML: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
        return '';
      }
    }
  );

  const handleSaveYAML = async (yaml: string) => {
    const job = selected();
    if (!job) return;
    
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
      label: `Apply Job YAML: ${job.name}`,
      command: '__k8s-apply-yaml',
      args: [],
      mode: 'apply',
      kubernetesEquivalent: true,
      namespace: job.namespace,
      context: status.context,
      userAction: 'jobs-apply-yaml',
      dryRun: false,
      allowClusterWide: false,
      resource: 'jobs',
      action: 'update',
      intent: 'apply-yaml',
      yaml: trimmed,
    });

    setShowEdit(false);
    setTimeout(() => refetch(), 1500);
  };

  const handleDryRunYAML = async (yaml: string) => {
    const job = selected();
    if (!job) return;
    
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
      label: `Dry run Job YAML: ${job.name}`,
      command: '__k8s-apply-yaml',
      args: [],
      mode: 'dry-run',
      kubernetesEquivalent: true,
      namespace: job.namespace,
      context: status.context,
      userAction: 'jobs-apply-yaml-dry-run',
      dryRun: true,
      allowClusterWide: false,
      resource: 'jobs',
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
    let all = jobs() || [];
    const query = search().toLowerCase();

    // Filter by search
    if (query) {
      all = all.filter((j: Job) =>
        j.name.toLowerCase().includes(query) ||
        j.namespace.toLowerCase().includes(query)
      );
    }

    // Sort
    const field = sortField();
    const direction = sortDirection();
    all = [...all].sort((a: Job, b: Job) => {
      let comparison = 0;
      switch (field) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'namespace':
          comparison = a.namespace.localeCompare(b.namespace);
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
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
  const paginatedJobs = createMemo(() => {
    const start = (currentPage() - 1) * pageSize();
    return filteredAndSorted().slice(start, start + pageSize());
  });

  const statusCounts = createMemo(() => {
    const all = jobs() || [];
    return {
      total: all.length,
      complete: all.filter((j: Job) => j.status === 'Complete').length,
      running: all.filter((j: Job) => j.status === 'Running' || j.status === 'Active').length,
      failed: all.filter((j: Job) => j.status === 'Failed').length,
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

  const handleDeleteConfirm = async () => {
    const job = selected();
    if (!job) return;
    
    setDeleting(true);
    try {
      await api.deleteJob(job.name, job.namespace);
      addNotification(`Job ${job.name} deleted successfully`, 'success');
      refetch();
      setSelected(null);
      setShowDeleteConfirm(false);
      setShowDetails(false);
    } catch (error) {
      console.error('Failed to delete Job:', error);
      addNotification(`Failed to delete Job: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    } finally {
      setDeleting(false);
    }
  };

  const deleteJob = (job: Job) => {
    setSelected(job);
    setShowDeleteConfirm(true);
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
        resourceType="jobs"
      />

      {/* Header */}
      <div class="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 class="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Jobs</h1>
          <p style={{ color: 'var(--text-secondary)' }}>One-time task execution</p>
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
            title="Refresh Jobs"
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
          <span style={{ color: 'var(--text-secondary)' }} class="text-sm">Complete</span>
          <span class="text-xl font-bold" style={{ color: 'var(--success-color)' }}>{statusCounts().complete}</span>
        </div>
        <div class="card px-4 py-2 cursor-pointer hover:opacity-80 flex items-center gap-2" style={{ 'border-left': '3px solid #3b82f6' }}>
          <span style={{ color: 'var(--text-secondary)' }} class="text-sm">Running</span>
          <span class="text-xl font-bold" style={{ color: '#3b82f6' }}>{statusCounts().running}</span>
        </div>
        <div class="card px-4 py-2 cursor-pointer hover:opacity-80 flex items-center gap-2" style={{ 'border-left': '3px solid var(--error-color)' }}>
          <span style={{ color: 'var(--text-secondary)' }} class="text-sm">Failed</span>
          <span class="text-xl font-bold" style={{ color: 'var(--error-color)' }}>{statusCounts().failed}</span>
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

      {/* Jobs table */}
      <div class="w-full" style={{ background: getThemeBackground(), margin: '0', padding: '0', border: `1px solid ${getThemeBorderColor()}`, 'border-radius': '4px' }}>
        <Show
          when={!jobsCache.loading() || jobsCache.data() !== undefined}
          fallback={
            <div class="p-8 text-center">
              <div class="spinner mx-auto mb-2" />
              <span style={{ color: 'var(--text-muted)' }}>Loading jobs...</span>
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
                  <th class="cursor-pointer select-none whitespace-nowrap" onClick={() => handleSort('name')}>
                    <div class="flex items-center gap-1">Name <SortIcon field="name" /></div>
                  </th>
                  <th class="cursor-pointer select-none whitespace-nowrap" onClick={() => handleSort('namespace')}>
                    <div class="flex items-center gap-1">Namespace <SortIcon field="namespace" /></div>
                  </th>
                  <th class="whitespace-nowrap">Completions</th>
                  <th class="whitespace-nowrap">Duration</th>
                  <th class="cursor-pointer select-none whitespace-nowrap" onClick={() => handleSort('age')}>
                    <div class="flex items-center gap-1">Age <SortIcon field="age" /></div>
                  </th>
                  <th class="cursor-pointer select-none whitespace-nowrap" onClick={() => handleSort('status')}>
                    <div class="flex items-center gap-1">Status <SortIcon field="status" /></div>
                  </th>
                  <th class="whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody>
                <For each={paginatedJobs()} fallback={
                  <tr><td colspan="8" class="text-center py-8" style={{ color: 'var(--text-muted)' }}>No jobs found</td></tr>
                }>
                  {(job: Job) => {
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
                          checked={bulk.isSelected(job)}
                          onChange={() => bulk.toggleSelection(job)}
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
                          onClick={() => { setSelected(job); setShowDetails(true); }}
                          class="font-medium hover:underline text-left"
                          style={{ color: 'var(--accent-primary)' }}
                        >
                          {job.name.length > 40 ? job.name.slice(0, 37) + '...' : job.name}
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
                      }}>{job.namespace}</td>
                      <td style={{
                        padding: '0 8px',
                        'text-align': 'left',
                        color: textColor,
                        'font-weight': '900',
                        'font-size': `${fontSize()}px`,
                        height: `${Math.max(24, fontSize() * 1.7)}px`,
                        'line-height': `${Math.max(24, fontSize() * 1.7)}px`,
                        border: 'none'
                      }}>{job.completions}</td>
                      <td style={{
                        padding: '0 8px',
                        'text-align': 'left',
                        color: textColor,
                        'font-weight': '900',
                        'font-size': `${fontSize()}px`,
                        height: `${Math.max(24, fontSize() * 1.7)}px`,
                        'line-height': `${Math.max(24, fontSize() * 1.7)}px`,
                        border: 'none'
                      }}>{job.duration || '-'}</td>
                      <td style={{
                        padding: '0 8px',
                        'text-align': 'left',
                        color: textColor,
                        'font-weight': '900',
                        'font-size': `${fontSize()}px`,
                        height: `${Math.max(24, fontSize() * 1.7)}px`,
                        'line-height': `${Math.max(24, fontSize() * 1.7)}px`,
                        border: 'none'
                      }}>{job.age}</td>
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
                        <span class={`badge ${job.status === 'Complete' ? 'badge-success' : job.status === 'Failed' ? 'badge-error' : 'badge-warning'}`}>
                          {job.status}
                        </span>
                      </td>
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
                              setSelected(job);
                              setYamlKey(`${job.name}|${job.namespace}`);
                              setShowYaml(true);
                            } },
                            { label: 'Edit YAML', icon: 'edit', onClick: () => { 
                              setSelected(job);
                              setYamlKey(`${job.name}|${job.namespace}`);
                              setShowEdit(true);
                            } },
                            { label: 'Delete', icon: 'delete', onClick: () => { setSelected(job); deleteJob(job); }, variant: 'danger', divider: true },
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
                Showing {((currentPage() - 1) * pageSize()) + 1} - {Math.min(currentPage() * pageSize(), filteredAndSorted().length)} of {filteredAndSorted().length} jobs
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
      <Modal isOpen={showDetails()} onClose={() => { setShowDetails(false); setSelected(null); }} title={`Job: ${selected()?.name}`} size="xl">
        <Show when={selected()}>
          {(() => {
            const [jobDetails] = createResource(
              () => selected() ? { name: selected()!.name, ns: selected()!.namespace } : null,
              async (params) => {
                if (!params) return null;
                return api.getJobDetails(params.name, params.ns);
              }
            );
            return (
              <div class="space-y-6">
                {/* Basic Info */}
                <div>
                  <h3 class="text-sm font-semibold mb-3" style={{ color: 'var(--text-secondary)' }}>Basic Information</h3>
                  <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div class="p-3 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
                      <div class="text-xs" style={{ color: 'var(--text-muted)' }}>Status</div>
                      <div>
                        <Show when={!jobDetails.loading && jobDetails()}>
                          {(details) => (
                            <span class={`badge ${
                              details().status === 'Complete' ? 'badge-success' :
                              details().status === 'Failed' ? 'badge-error' :
                              'badge-warning'
                            }`}>
                              {details().status || selected()?.status || '-'}
                            </span>
                          )}
                        </Show>
                        <Show when={jobDetails.loading}>
                          <div class="spinner" style={{ width: '16px', height: '16px' }} />
                        </Show>
                      </div>
                    </div>
                    <div class="p-3 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
                      <div class="text-xs" style={{ color: 'var(--text-muted)' }}>Completions</div>
                      <div style={{ color: 'var(--text-primary)' }}>
                        <Show when={!jobDetails.loading && jobDetails()}>
                          {(details) => details().completions || selected()?.completions || '-'}
                        </Show>
                        <Show when={jobDetails.loading}>
                          <div class="spinner" style={{ width: '16px', height: '16px' }} />
                        </Show>
                      </div>
                    </div>
                    <div class="p-3 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
                      <div class="text-xs" style={{ color: 'var(--text-muted)' }}>Parallelism</div>
                      <div style={{ color: 'var(--text-primary)' }}>
                        <Show when={!jobDetails.loading && jobDetails()}>
                          {(details) => details().parallelism || '-'}
                        </Show>
                        <Show when={jobDetails.loading}>
                          <div class="spinner" style={{ width: '16px', height: '16px' }} />
                        </Show>
                      </div>
                    </div>
                    <div class="p-3 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
                      <div class="text-xs" style={{ color: 'var(--text-muted)' }}>Duration</div>
                      <div style={{ color: 'var(--text-primary)' }}>
                        <Show when={!jobDetails.loading && jobDetails()}>
                          {(details) => details().duration || selected()?.duration || '-'}
                        </Show>
                        <Show when={jobDetails.loading}>
                          <div class="spinner" style={{ width: '16px', height: '16px' }} />
                        </Show>
                      </div>
                    </div>
                    <div class="p-3 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
                      <div class="text-xs" style={{ color: 'var(--text-muted)' }}>Active</div>
                      <div style={{ color: 'var(--text-primary)' }}>
                        <Show when={!jobDetails.loading && jobDetails()}>
                          {(details) => details().active || 0}
                        </Show>
                        <Show when={jobDetails.loading}>
                          <div class="spinner" style={{ width: '16px', height: '16px' }} />
                        </Show>
                      </div>
                    </div>
                    <div class="p-3 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
                      <div class="text-xs" style={{ color: 'var(--text-muted)' }}>Succeeded</div>
                      <div style={{ color: 'var(--text-primary)' }}>
                        <Show when={!jobDetails.loading && jobDetails()}>
                          {(details) => details().succeeded || 0}
                        </Show>
                        <Show when={jobDetails.loading}>
                          <div class="spinner" style={{ width: '16px', height: '16px' }} />
                        </Show>
                      </div>
                    </div>
                    <div class="p-3 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
                      <div class="text-xs" style={{ color: 'var(--text-muted)' }}>Failed</div>
                      <div style={{ color: 'var(--text-primary)' }}>
                        <Show when={!jobDetails.loading && jobDetails()}>
                          {(details) => details().failed || 0}
                        </Show>
                        <Show when={jobDetails.loading}>
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
                    <div class="p-3 rounded-lg col-span-2" style={{ background: 'var(--bg-tertiary)' }}>
                      <div class="text-xs" style={{ color: 'var(--text-muted)' }}>Selector</div>
                      <div style={{ color: 'var(--text-primary)' }} class="text-sm break-all">
                        <Show when={!jobDetails.loading && jobDetails()}>
                          {(details) => details().selector || '-'}
                        </Show>
                        <Show when={jobDetails.loading}>
                          <div class="spinner" style={{ width: '16px', height: '16px' }} />
                        </Show>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Related Resources Section */}
                <Show when={jobDetails()}>
                  <RelatedResources
                    kind="job"
                    name={jobDetails()!.name}
                    namespace={jobDetails()!.namespace}
                    relatedData={jobDetails()}
                  />
                </Show>

                {/* Pods */}
                <Show when={!jobDetails.loading && jobDetails()?.pods && jobDetails()!.pods.length > 0}>
                  <div>
                    <h3 class="text-sm font-semibold mb-3" style={{ color: 'var(--text-secondary)' }}>Pods ({jobDetails()!.pods.length})</h3>
                    <div class="rounded-lg border overflow-x-auto" style={{ 'border-color': 'var(--border-color)', background: 'var(--bg-secondary)' }}>
                      <table class="w-full">
                        <thead>
                          <tr style={{ background: 'var(--bg-tertiary)' }}>
                            <th class="px-4 py-2 text-left text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Name</th>
                            <th class="px-4 py-2 text-left text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Status</th>
                            <th class="px-4 py-2 text-left text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Ready</th>
                            <th class="px-4 py-2 text-left text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Restarts</th>
                            <th class="px-4 py-2 text-left text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>IP</th>
                            <th class="px-4 py-2 text-left text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Node</th>
                            <th class="px-4 py-2 text-left text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Age</th>
                          </tr>
                        </thead>
                        <tbody>
                          <For each={jobDetails()!.pods}>
                            {(pod: any) => (
                              <tr class="border-b" style={{ 'border-color': 'var(--border-color)' }}>
                                <td class="px-4 py-2 text-sm" style={{ color: 'var(--text-primary)' }}>{pod.name}</td>
                                <td class="px-4 py-2 text-sm">
                                  <span class={`badge ${
                                    pod.status === 'Running' ? 'badge-success' :
                                    pod.status === 'Pending' ? 'badge-warning' :
                                    'badge-error'
                                  }`}>{pod.status}</span>
                                </td>
                                <td class="px-4 py-2 text-sm" style={{ color: 'var(--text-primary)' }}>{pod.ready}</td>
                                <td class="px-4 py-2 text-sm" style={{ color: 'var(--text-primary)' }}>{pod.restarts}</td>
                                <td class="px-4 py-2 text-sm" style={{ color: 'var(--text-primary)' }}>{pod.ip || '-'}</td>
                                <td class="px-4 py-2 text-sm" style={{ color: 'var(--text-primary)' }}>{pod.node || '-'}</td>
                                <td class="px-4 py-2 text-sm" style={{ color: 'var(--text-primary)' }}>{pod.age}</td>
                              </tr>
                            )}
                          </For>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </Show>

                {/* Conditions */}
                <Show when={!jobDetails.loading && jobDetails()?.conditions && jobDetails()!.conditions.length > 0}>
                  <div>
                    <h3 class="text-sm font-semibold mb-3" style={{ color: 'var(--text-secondary)' }}>Conditions</h3>
                    <div class="space-y-2">
                      <For each={jobDetails()!.conditions}>
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
                      deleteJob(selected()!);
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
      <DescribeModal isOpen={showDescribe()} onClose={() => setShowDescribe(false)} resourceType="job" name={selected()?.name || ''} namespace={selected()?.namespace} />

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteConfirm()}
        onClose={() => {
          if (!deleting()) {
            setShowDeleteConfirm(false);
            setShowDetails(false);
          }
        }}
        title="Delete Job"
        message={selected() ? `Are you sure you want to delete the Job "${selected()!.name}"?` : 'Are you sure you want to delete this Job?'}
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

      {/* Bulk Delete Modal */}
      <BulkDeleteModal
        isOpen={showBulkDeleteModal()}
        onClose={() => setShowBulkDeleteModal(false)}
        resourceType="Jobs"
        selectedItems={bulk.getSelectedItems(filteredAndSorted())}
        onConfirm={async () => {
          const selectedJobs = bulk.getSelectedItems(filteredAndSorted());

          // Delete each job
          for (const job of selectedJobs) {
            try {
              await api.deleteJob(job.name, job.namespace);
            } catch (error) {
              console.error(`Failed to delete job ${job.namespace}/${job.name}:`, error);
              addNotification(
                `Failed to delete job ${job.name}: ${error instanceof Error ? error.message : 'Unknown error'}`,
                'error'
              );
            }
          }

          // Clear selection and refetch
          bulk.deselectAll();
          refetch();

          // Show success notification
          addNotification(
            `Successfully deleted ${selectedJobs.length} job${selectedJobs.length !== 1 ? 's' : ''}`,
            'success'
          );
        }}
      />
    </div>
  );
};

export default Jobs;
