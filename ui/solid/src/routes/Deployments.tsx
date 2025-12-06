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

interface Deployment {
  name: string;
  namespace: string;
  ready: string;
  upToDate: number;
  available: number;
  age: string;
  replicas: number;
}

type SortField = 'name' | 'namespace' | 'ready' | 'age';
type SortDirection = 'asc' | 'desc';

const Deployments: Component = () => {
  // Use global search query instead of local search
  const [sortField, setSortField] = createSignal<SortField>('name');
  const [sortDirection, setSortDirection] = createSignal<SortDirection>('asc');
  const [currentPage, setCurrentPage] = createSignal(1);
  const [pageSize, setPageSize] = createSignal(20);
  const [selected, setSelected] = createSignal<Deployment | null>(null);
  const [showYaml, setShowYaml] = createSignal(false);
  const [showEdit, setShowEdit] = createSignal(false);
  const [showDescribe, setShowDescribe] = createSignal(false);
  const [showScale, setShowScale] = createSignal(false);
  const [scaleReplicas, setScaleReplicas] = createSignal(1);
  const [restarting, setRestarting] = createSignal<string | null>(null); // Track which deployment is restarting

  // Font size selector with localStorage persistence
  const getInitialFontSize = (): number => {
    const saved = localStorage.getItem('deployments-font-size');
    return saved ? parseInt(saved) : 14;
  };
  const [fontSize, setFontSize] = createSignal(getInitialFontSize());

  const handleFontSizeChange = (size: number) => {
    setFontSize(size);
    localStorage.setItem('deployments-font-size', size.toString());
  };

  // Font family selector with localStorage persistence
  const getInitialFontFamily = (): string => {
    const saved = localStorage.getItem('deployments-font-family');
    return saved || 'Monaco';
  };
  const [fontFamily, setFontFamily] = createSignal(getInitialFontFamily());

  const handleFontFamilyChange = (family: string) => {
    setFontFamily(family);
    localStorage.setItem('deployments-font-family', family);
  };

  // Map font family option to actual font-family CSS value
  const getFontFamilyCSS = (): string => {
    const family = fontFamily();
    switch (family) {
      case 'Monospace': return '"Courier New", Monaco, monospace';
      case 'System-ui': return 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      case 'Monaco': return 'Monaco, "Lucida Console", monospace';
      case 'Consolas': return 'Consolas, "Courier New", monospace';
      case 'Courier': return 'Courier, "Courier New", monospace';
      default: return '"Courier New", Monaco, monospace';
    }
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
  const deploymentsCache = createCachedResource<Deployment[]>(
    'deployments',
    async () => {
      setGlobalLoading(true);
      try {
        const namespaceParam = getNamespaceParam();
        const deployments = await api.getDeployments(namespaceParam);
        return deployments;
      } finally {
        setGlobalLoading(false);
      }
    },
    {
      ttl: 15000, // 15 seconds
      backgroundRefresh: true,
    }
  );

  // Get deployments from cache
  const deployments = createMemo(() => deploymentsCache.data() || []);
  const [yamlContent] = createResource(
    () => (showYaml() || showEdit()) && selected() ? { name: selected()!.name, ns: selected()!.namespace } : null,
    async (params) => {
      if (!params) return '';
      const data = await api.getDeploymentYAML(params.name, params.ns);
      return data.yaml || '';
    }
  );

  const handleSaveYAML = async (yaml: string) => {
    const dep = selected();
    if (!dep) return;
    try {
      await api.updateDeployment(dep.name, dep.namespace, yaml);
      addNotification(`✅ Deployment ${dep.name} updated successfully`, 'success');
      setShowEdit(false);
      setTimeout(() => deploymentsCache.refetch(), 500);
      setTimeout(() => deploymentsCache.refetch(), 2000);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      addNotification(`❌ Failed to update deployment: ${errorMsg}`, 'error');
      throw error; // Re-throw so YAMLEditor can handle it
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
    let all = deployments() || [];
    const query = searchQuery().toLowerCase();

    // Filter by search
    if (query) {
      all = all.filter((d: Deployment) =>
        d.name.toLowerCase().includes(query) ||
        d.namespace.toLowerCase().includes(query)
      );
    }

    // Sort
    const field = sortField();
    const direction = sortDirection();
    all = [...all].sort((a: Deployment, b: Deployment) => {
      let comparison = 0;
      switch (field) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'namespace':
          comparison = a.namespace.localeCompare(b.namespace);
          break;
        case 'ready':
          comparison = a.ready.localeCompare(b.ready);
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
  const paginatedDeployments = createMemo(() => {
    const start = (currentPage() - 1) * pageSize();
    return filteredAndSorted().slice(start, start + pageSize());
  });

  const statusCounts = createMemo(() => {
    const all = deployments() || [];
    return {
      total: all.length,
      ready: all.filter((d: Deployment) => {
        const parts = d.ready?.split('/') || ['0', '0'];
        return parts[0] === parts[1] && parseInt(parts[0]) > 0;
      }).length,
      partial: all.filter((d: Deployment) => {
        const parts = d.ready?.split('/') || ['0', '0'];
        return parts[0] !== parts[1] && parseInt(parts[0]) > 0;
      }).length,
      unavailable: all.filter((d: Deployment) => {
        const parts = d.ready?.split('/') || ['0', '0'];
        return parseInt(parts[0]) === 0;
      }).length,
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

  const restart = async (dep: Deployment) => {
    const deploymentKey = `${dep.namespace}/${dep.name}`;
    setRestarting(deploymentKey);
    try {
      const result = await api.restartDeployment(dep.name, dep.namespace);
      if (result?.success) {
        addNotification(`✅ Deployment ${dep.name} restart initiated - pods will restart shortly`, 'success');
      } else {
        addNotification(`⚠️ Restart initiated but may not have completed: ${result?.message || 'Unknown status'}`, 'warning');
      }
      // Refetch multiple times to see the restart progress
      setTimeout(() => deploymentsCache.refetch(), 500);
      setTimeout(() => deploymentsCache.refetch(), 2000);
      setTimeout(() => deploymentsCache.refetch(), 5000);
    } catch (error) {
      console.error('Failed to restart deployment:', error);
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      addNotification(`❌ Failed to restart deployment ${dep.name}: ${errorMsg}`, 'error');
    } finally {
      setTimeout(() => setRestarting(null), 2000); // Clear loading state after 2 seconds
    }
  };

  const scale = async () => {
    const dep = selected();
    if (!dep) return;
    try {
      const result = await api.scaleDeployment(dep.name, dep.namespace, scaleReplicas());
      if (result?.success) {
        addNotification(`✅ Deployment ${dep.name} scaled to ${scaleReplicas()} replicas`, 'success');
      } else {
        addNotification(`⚠️ Scale may not have completed: ${result?.message || 'Unknown status'}`, 'warning');
      }
      setShowScale(false);
      setTimeout(() => deploymentsCache.refetch(), 500);
      setTimeout(() => deploymentsCache.refetch(), 2000);
    } catch (error) {
      console.error('Failed to scale deployment:', error);
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      addNotification(`❌ Failed to scale deployment: ${errorMsg}`, 'error');
    }
  };

  const deleteDeployment = async (dep: Deployment) => {
    if (!confirm(`Are you sure you want to delete deployment "${dep.name}" in namespace "${dep.namespace}"?`)) return;
    try {
      await api.deleteDeployment(dep.name, dep.namespace);
      addNotification(`Deployment ${dep.name} deleted successfully`, 'success');
      refetch();
    } catch (error) {
      console.error('Failed to delete deployment:', error);
      addNotification(`Failed to delete deployment: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    }
  };

  const openScale = (dep: Deployment) => {
    setSelected(dep);
    const parts = dep.ready?.split('/') || ['1', '1'];
    setScaleReplicas(parseInt(parts[1]) || 1);
    setShowScale(true);
  };

  return (
    <div class="space-y-4">
      {/* Header */}
      <div class="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 class="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Deployments</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Manage application deployments</p>
        </div>
        <div class="flex items-center gap-3">
          <button
            onClick={(e) => {
              const btn = e.currentTarget;
              btn.classList.add('refreshing');
              setTimeout(() => btn.classList.remove('refreshing'), 500);
              deploymentsCache.refetch();
            }}
            class="icon-btn"
            style={{ background: 'var(--bg-secondary)' }}
            title="Refresh Deployments"
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

        {/* Font Size Selector */}
        <select
          value={fontSize()}
          onChange={(e) => handleFontSizeChange(parseInt(e.currentTarget.value))}
          class="px-3 py-2 rounded-lg text-sm"
          style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
          title="Font Size"
        >
          <option value="12">12px</option>
          <option value="14">14px</option>
          <option value="16">16px</option>
          <option value="18">18px</option>
          <option value="20">20px</option>
        </select>

        {/* Font Family Selector */}
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

        <input
          type="text"
          placeholder="Search..."
          value={searchQuery()}
          onInput={(e) => { setSearchQuery(e.currentTarget.value); setCurrentPage(1); }}
          class="px-3 py-2 rounded-lg text-sm w-48"
          style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
        />
      </div>

      {/* Deployments table */}
      <div class="w-full" style={{ background: '#000000', margin: '0', padding: '0', border: '1px solid #333333', 'border-radius': '4px' }}>
        <Show
          when={!deploymentsCache.loading() || deploymentsCache.data() !== undefined}
          fallback={
            <div class="p-8 text-center">
              <div class="spinner mx-auto mb-2" />
              <span style={{ color: 'var(--text-muted)' }}>Loading deployments...</span>
            </div>
          }
        >
          <div class="w-full overflow-x-auto" style={{ margin: '0', padding: '0' }}>
            <table
              class="w-full"
              style={{
                width: '100%',
                'table-layout': 'auto',
                'font-family': getFontFamilyCSS(),
                background: '#000000',
                'border-collapse': 'collapse',
                margin: '0',
                padding: '0'
              }}
            >
              <thead>
                <tr style={{
                  height: `${Math.max(24, fontSize() * 1.7)}px`,
                  'font-family': getFontFamilyCSS(),
                  'font-weight': '900',
                  color: '#0ea5e9',
                  'font-size': `${fontSize()}px`,
                  'line-height': `${Math.max(24, fontSize() * 1.7)}px`
                }}>
                  <th class="cursor-pointer select-none whitespace-nowrap" onClick={() => handleSort('name')} style={{
                    padding: '0 8px',
                    'text-align': 'left',
                    'font-weight': '900',
                    color: '#0ea5e9',
                    'font-size': `${fontSize()}px`,
                    border: 'none'
                  }}>
                    <div class="flex items-center gap-1">Name <SortIcon field="name" /></div>
                  </th>
                  <th class="cursor-pointer select-none whitespace-nowrap" onClick={() => handleSort('namespace')} style={{
                    padding: '0 8px',
                    'text-align': 'left',
                    'font-weight': '900',
                    color: '#0ea5e9',
                    'font-size': `${fontSize()}px`,
                    border: 'none'
                  }}>
                    <div class="flex items-center gap-1">Namespace <SortIcon field="namespace" /></div>
                  </th>
                  <th class="cursor-pointer select-none whitespace-nowrap" onClick={() => handleSort('ready')} style={{
                    padding: '0 8px',
                    'text-align': 'left',
                    'font-weight': '900',
                    color: '#0ea5e9',
                    'font-size': `${fontSize()}px`,
                    border: 'none'
                  }}>
                    <div class="flex items-center gap-1">Ready <SortIcon field="ready" /></div>
                  </th>
                  <th class="whitespace-nowrap" style={{
                    padding: '0 8px',
                    'text-align': 'left',
                    'font-weight': '900',
                    color: '#0ea5e9',
                    'font-size': `${fontSize()}px`,
                    border: 'none'
                  }}>Up-to-date</th>
                  <th class="whitespace-nowrap" style={{
                    padding: '0 8px',
                    'text-align': 'left',
                    'font-weight': '900',
                    color: '#0ea5e9',
                    'font-size': `${fontSize()}px`,
                    border: 'none'
                  }}>Available</th>
                  <th class="cursor-pointer select-none whitespace-nowrap" onClick={() => handleSort('age')} style={{
                    padding: '0 8px',
                    'text-align': 'left',
                    'font-weight': '900',
                    color: '#0ea5e9',
                    'font-size': `${fontSize()}px`,
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
                    border: 'none'
                  }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                <For each={paginatedDeployments()} fallback={
                  <tr><td colspan="7" class="text-center py-8" style={{ color: 'var(--text-muted)' }}>No deployments found</td></tr>
                }>
                  {(dep: Deployment) => {
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
                          onClick={() => { setSelected(dep); setShowDescribe(true); }}
                          class="font-medium hover:underline text-left"
                          style={{ color: 'var(--accent-primary)' }}
                        >
                          {dep.name.length > 40 ? dep.name.slice(0, 37) + '...' : dep.name}
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
                      }}>{dep.namespace}</td>
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
                        <span class={`badge ${
                          dep.ready.split('/')[0] === dep.ready.split('/')[1] ? 'badge-success' : 'badge-warning'
                        }`}>
                          {dep.ready}
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
                      }}>{dep.upToDate}</td>
                      <td style={{
                        padding: '0 8px',
                        'text-align': 'left',
                        color: textColor,
                        'font-weight': '900',
                        'font-size': `${fontSize()}px`,
                        height: `${Math.max(24, fontSize() * 1.7)}px`,
                        'line-height': `${Math.max(24, fontSize() * 1.7)}px`,
                        border: 'none'
                      }}>{dep.available}</td>
                      <td style={{
                        padding: '0 8px',
                        'text-align': 'left',
                        color: textColor,
                        'font-weight': '900',
                        'font-size': `${fontSize()}px`,
                        height: `${Math.max(24, fontSize() * 1.7)}px`,
                        'line-height': `${Math.max(24, fontSize() * 1.7)}px`,
                        border: 'none'
                      }}>{dep.age}</td>
                      <td style={{
                        padding: '0 8px',
                        'text-align': 'left',
                        height: `${Math.max(24, fontSize() * 1.7)}px`,
                        'line-height': `${Math.max(24, fontSize() * 1.7)}px`,
                        border: 'none'
                      }}>
                        <ActionMenu
                          actions={[
                            { label: 'Scale', icon: 'scale', onClick: () => openScale(dep) },
                            {
                              label: 'Restart',
                              icon: 'restart',
                              onClick: () => restart(dep),
                              loading: restarting() === `${dep.namespace}/${dep.name}`
                            },
                            { label: 'View YAML', icon: 'yaml', onClick: () => { setSelected(dep); setShowYaml(true); } },
                            { label: 'Edit YAML', icon: 'edit', onClick: () => { setSelected(dep); setShowEdit(true); } },
                            { label: 'Delete', icon: 'delete', onClick: () => deleteDeployment(dep), variant: 'danger', divider: true },
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
            <div class="flex items-center justify-between p-4 font-mono text-sm" style={{ background: '#000000', borderTop: '1px solid #333333' }}>
              <div style={{ color: '#8b949e' }}>
                Showing {((currentPage() - 1) * pageSize()) + 1} - {Math.min(currentPage() * pageSize(), filteredAndSorted().length)} of {filteredAndSorted().length} deployments
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
                <select
                  value={pageSize()}
                  onChange={(e) => { setPageSize(parseInt(e.currentTarget.value)); setCurrentPage(1); }}
                  class="px-3 py-1 rounded-lg text-sm ml-4"
                  style={{ background: '#21262d', color: '#c9d1d9', border: '1px solid var(--border-color)' }}
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
      <DescribeModal isOpen={showDescribe()} onClose={() => setShowDescribe(false)} resourceType="deployment" name={selected()?.name || ''} namespace={selected()?.namespace} />

      {/* Scale Modal */}
      <Modal isOpen={showScale()} onClose={() => setShowScale(false)} title={`Scale: ${selected()?.name}`} size="sm">
        <div class="space-y-4">
          <div>
            <label class="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>Replicas</label>
            <input
              type="number"
              min="0"
              max="100"
              value={scaleReplicas()}
              onInput={(e) => setScaleReplicas(parseInt(e.currentTarget.value) || 0)}
              class="w-full px-4 py-2 rounded-lg"
              style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
            />
          </div>
          <div class="flex gap-2">
            <button onClick={() => setShowScale(false)} class="btn-secondary flex-1">Cancel</button>
            <button onClick={scale} class="btn-primary flex-1">Scale</button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Deployments;
