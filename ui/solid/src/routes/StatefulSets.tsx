import { Component, For, Show, createMemo, createSignal, createResource } from 'solid-js';
import { api } from '../services/api';
import { namespace } from '../stores/cluster';
import { addNotification } from '../stores/ui';
import { selectedNamespaces } from '../stores/globalStore';
import { getThemeBackground, getThemeBorderColor } from '../utils/themeBackground';
import Modal from '../components/Modal';
import YAMLViewer from '../components/YAMLViewer';
import YAMLEditor from '../components/YAMLEditor';
import DescribeModal from '../components/DescribeModal';
import ActionMenu from '../components/ActionMenu';
import { BulkActions, SelectionCheckbox, SelectAllCheckbox } from '../components/BulkActions';
import { BulkDeleteModal } from '../components/BulkDeleteModal';
import { useBulkSelection } from '../hooks/useBulkSelection';

interface StatefulSet {
  name: string;
  namespace: string;
  ready: string;
  replicas: number;
  age: string;
}

type SortField = 'name' | 'namespace' | 'ready' | 'age';
type SortDirection = 'asc' | 'desc';

const StatefulSets: Component = () => {
  const [search, setSearch] = createSignal('');
  const [sortField, setSortField] = createSignal<SortField>('name');
  const [sortDirection, setSortDirection] = createSignal<SortDirection>('asc');
  const [currentPage, setCurrentPage] = createSignal(1);
  const [pageSize, setPageSize] = createSignal(20);
  const [selected, setSelected] = createSignal<StatefulSet | null>(null);
  const [showYaml, setShowYaml] = createSignal(false);
  const [showEdit, setShowEdit] = createSignal(false);
  const [showDescribe, setShowDescribe] = createSignal(false);
  const [yamlKey, setYamlKey] = createSignal<string | null>(null);
  const [showScale, setShowScale] = createSignal(false);
  const [scaleReplicas, setScaleReplicas] = createSignal(1);
  const [restarting, setRestarting] = createSignal<string | null>(null); // Track which statefulset is restarting
  const bulk = useBulkSelection<StatefulSet>();
  const [showBulkDeleteModal, setShowBulkDeleteModal] = createSignal(false);

  // Font size selector with localStorage persistence
  const getInitialFontSize = (): number => {
    const saved = localStorage.getItem('statefulsets-font-size');
    return saved ? parseInt(saved) : 14;
  };
  const [fontSize, setFontSize] = createSignal(getInitialFontSize());

  const handleFontSizeChange = (size: number) => {
    setFontSize(size);
    localStorage.setItem('statefulsets-font-size', size.toString());
  };

  // Font family selector with localStorage persistence
  const getInitialFontFamily = (): string => {
    const saved = localStorage.getItem('statefulsets-font-family');
    return saved || 'Monaco';
  };
  const [fontFamily, setFontFamily] = createSignal(getInitialFontFamily());

  const handleFontFamilyChange = (family: string) => {
    setFontFamily(family);
    localStorage.setItem('statefulsets-font-family', family);
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
    return namespaces[0];
  };

  const [statefulsets, { refetch }] = createResource(namespace, api.getStatefulSets);
  const [yamlContent] = createResource(
    () => yamlKey(),
    async (key) => {
      if (!key) return '';
      const [name, ns] = key.split('|');
      if (!name || !ns) return '';
      try {
        const data = await api.getStatefulSetYAML(name, ns);
        return data.yaml || '';
      } catch (error) {
        console.error('Failed to fetch statefulset YAML:', error);
        addNotification(`Failed to load YAML: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
        return '';
      }
    }
  );

  const handleSaveYAML = async (yaml: string) => {
    const sts = selected();
    if (!sts) return;
    try {
      await api.updateStatefulSet(sts.name, sts.namespace, yaml);
      addNotification(`✅ StatefulSet ${sts.name} updated successfully`, 'success');
      setShowEdit(false);
      setTimeout(() => refetch(), 500);
      setTimeout(() => refetch(), 2000);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      addNotification(`❌ Failed to update StatefulSet: ${errorMsg}`, 'error');
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
    let all = statefulsets() || [];
    const query = search().toLowerCase();

    // Filter by search
    if (query) {
      all = all.filter((s: StatefulSet) =>
        s.name.toLowerCase().includes(query) ||
        s.namespace.toLowerCase().includes(query)
      );
    }

    // Sort
    const field = sortField();
    const direction = sortDirection();
    all = [...all].sort((a: StatefulSet, b: StatefulSet) => {
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
  const paginatedStatefulSets = createMemo(() => {
    const start = (currentPage() - 1) * pageSize();
    return filteredAndSorted().slice(start, start + pageSize());
  });

  const statusCounts = createMemo(() => {
    const all = statefulsets() || [];
    return {
      total: all.length,
      ready: all.filter((s: StatefulSet) => {
        const parts = s.ready?.split('/') || ['0', '0'];
        return parts[0] === parts[1] && parseInt(parts[0]) > 0;
      }).length,
      partial: all.filter((s: StatefulSet) => {
        const parts = s.ready?.split('/') || ['0', '0'];
        return parts[0] !== parts[1] && parseInt(parts[0]) > 0;
      }).length,
      unavailable: all.filter((s: StatefulSet) => {
        const parts = s.ready?.split('/') || ['0', '0'];
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

  const restart = async (sts: StatefulSet) => {
    const statefulSetKey = `${sts.namespace}/${sts.name}`;
    setRestarting(statefulSetKey);
    try {
      const result = await api.restartStatefulSet(sts.name, sts.namespace);
      if (result?.success) {
        addNotification(`✅ StatefulSet ${sts.name} restart initiated - pods will restart shortly`, 'success');
      } else {
        addNotification(`⚠️ Restart initiated but may not have completed: ${result?.message || 'Unknown status'}`, 'warning');
      }
      // Refetch multiple times to see the restart progress
      setTimeout(() => refetch(), 500);
      setTimeout(() => refetch(), 2000);
      setTimeout(() => refetch(), 5000);
    } catch (error) {
      console.error('Failed to restart StatefulSet:', error);
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      addNotification(`❌ Failed to restart StatefulSet ${sts.name}: ${errorMsg}`, 'error');
    } finally {
      setTimeout(() => setRestarting(null), 2000); // Clear loading state after 2 seconds
    }
  };

  const scale = async () => {
    const sts = selected();
    if (!sts) return;
    try {
      const result = await api.scaleStatefulSet(sts.name, sts.namespace, scaleReplicas());
      if (result?.success) {
        addNotification(`✅ StatefulSet ${sts.name} scaled to ${scaleReplicas()} replicas`, 'success');
      } else {
        addNotification(`⚠️ Scale may not have completed: ${result?.message || 'Unknown status'}`, 'warning');
      }
      setShowScale(false);
      setTimeout(() => refetch(), 500);
      setTimeout(() => refetch(), 2000);
    } catch (error) {
      console.error('Failed to scale StatefulSet:', error);
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      addNotification(`❌ Failed to scale StatefulSet: ${errorMsg}`, 'error');
    }
  };

  const deleteStatefulSet = async (sts: StatefulSet) => {
    if (!confirm(`Are you sure you want to delete StatefulSet "${sts.name}" in namespace "${sts.namespace}"?`)) return;
    try {
      await api.deleteStatefulSet(sts.name, sts.namespace);
      addNotification(`StatefulSet ${sts.name} deleted successfully`, 'success');
      refetch();
    } catch (error) {
      console.error('Failed to delete StatefulSet:', error);
      addNotification(`Failed to delete StatefulSet: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    }
  };

  const openScale = (sts: StatefulSet) => {
    setSelected(sts);
    const parts = sts.ready?.split('/') || ['1', '1'];
    setScaleReplicas(parseInt(parts[1]) || 1);
    setShowScale(true);
  };

  return (
    <div class="space-y-4">
      <BulkActions
        selectedCount={bulk.selectedCount()}
        totalCount={filteredAndSorted().length}
        onSelectAll={() => bulk.selectAll(filteredAndSorted())}
        onDeselectAll={() => bulk.deselectAll()}
        onDelete={() => setShowBulkDeleteModal(true)}
        resourceType="statefulsets"
      />

      {/* Header */}
      <div class="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 class="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>StatefulSets</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Manage stateful applications</p>
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
            title="Refresh StatefulSets"
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

        {/* Bulk Actions - Only show when a single namespace is selected */}
        <Show when={getNamespaceParam() && getNamespaceParam() !== '_all' && getNamespaceParam() !== 'All Namespaces'}>
          <div class="flex items-center gap-2">
            <button
              onClick={async () => {
                const ns = getNamespaceParam();
                if (!ns || !confirm(`Are you sure you want to restart ALL StatefulSets in namespace "${ns}"?`)) return;
                try {
                  const result = await api.bulkRestartStatefulSets(ns);
                  if (result?.success) {
                    addNotification(`✅ Restarted ${result.restarted?.length || 0}/${result.total || 0} StatefulSets in ${ns}`, 'success');
                    if (result.failed && result.failed.length > 0) {
                      addNotification(`⚠️ ${result.failed.length} StatefulSets failed to restart`, 'warning');
                    }
                  }
                  setTimeout(() => refetch(), 1000);
                } catch (error) {
                  addNotification(`❌ Failed to restart StatefulSets: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
                }
              }}
              class="px-3 py-2 rounded-lg text-sm font-medium"
              style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
              title="Restart All StatefulSets in Namespace"
            >
              🔄 Restart All
            </button>
            <button
              onClick={async () => {
                const ns = getNamespaceParam();
                if (!ns || !confirm(`⚠️ DANGER: Are you sure you want to DELETE ALL StatefulSets in namespace "${ns}"? This cannot be undone!`)) return;
                if (!confirm(`This will delete ALL ${statefulsets()?.filter((sts: StatefulSet) => sts.namespace === ns).length || 0} StatefulSets in "${ns}". Type the namespace name to confirm:`) || prompt('Type namespace name to confirm:') !== ns) return;
                try {
                  const result = await api.bulkDeleteStatefulSets(ns);
                  if (result?.success) {
                    addNotification(`✅ Deleted ${result.deleted?.length || 0}/${result.total || 0} StatefulSets in ${ns}`, 'success');
                    if (result.failed && result.failed.length > 0) {
                      addNotification(`⚠️ ${result.failed.length} StatefulSets failed to delete`, 'warning');
                    }
                  }
                  setTimeout(() => refetch(), 1000);
                } catch (error) {
                  addNotification(`❌ Failed to delete StatefulSets: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
                }
              }}
              class="px-3 py-2 rounded-lg text-sm font-medium"
              style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)' }}
              title="Delete All StatefulSets in Namespace"
            >
              🗑️ Delete All
            </button>
          </div>
        </Show>

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

      {/* StatefulSets table */}
      <div class="w-full" style={{ background: getThemeBackground(), margin: '0', padding: '0', border: `1px solid ${getThemeBorderColor()}`, 'border-radius': '4px' }}>
        <Show
          when={!statefulsets.loading}
          fallback={
            <div class="p-8 text-center">
              <div class="spinner mx-auto mb-2" />
              <span style={{ color: 'var(--text-muted)' }}>Loading StatefulSets...</span>
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
                background: getThemeBackground(),
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
                  <th style={{
                    padding: '0 8px',
                    'text-align': 'center',
                    'font-weight': '900',
                    border: 'none',
                    width: '40px'
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
                  }}>Replicas</th>
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
                <For each={paginatedStatefulSets()} fallback={
                  <tr><td colspan="7" class="text-center py-8" style={{ color: 'var(--text-muted)' }}>No StatefulSets found</td></tr>
                }>
                  {(sts: StatefulSet) => {
                    const textColor = '#0ea5e9';
                    return (
                    <tr>
                      <td style={{
                        padding: '0 8px',
                        'text-align': 'center',
                        height: `${Math.max(24, fontSize() * 1.7)}px`,
                        'line-height': `${Math.max(24, fontSize() * 1.7)}px`,
                        border: 'none',
                        width: '40px'
                      }}>
                        <SelectionCheckbox
                          checked={bulk.isSelected(sts)}
                          onChange={() => bulk.toggleSelection(sts)}
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
                          onClick={() => { setSelected(sts); setShowDescribe(true); }}
                          class="font-medium hover:underline text-left"
                          style={{ color: 'var(--accent-primary)' }}
                        >
                          {sts.name.length > 40 ? sts.name.slice(0, 37) + '...' : sts.name}
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
                      }}>{sts.namespace}</td>
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
                          sts.ready.split('/')[0] === sts.ready.split('/')[1] ? 'badge-success' : 'badge-warning'
                        }`}>
                          {sts.ready}
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
                      }}>{sts.replicas}</td>
                      <td style={{
                        padding: '0 8px',
                        'text-align': 'left',
                        color: textColor,
                        'font-weight': '900',
                        'font-size': `${fontSize()}px`,
                        height: `${Math.max(24, fontSize() * 1.7)}px`,
                        'line-height': `${Math.max(24, fontSize() * 1.7)}px`,
                        border: 'none'
                      }}>{sts.age}</td>
                      <td style={{
                        padding: '0 8px',
                        'text-align': 'left',
                        height: `${Math.max(24, fontSize() * 1.7)}px`,
                        'line-height': `${Math.max(24, fontSize() * 1.7)}px`,
                        border: 'none'
                      }}>
                        <ActionMenu
                          actions={[
                            { label: 'Scale', icon: 'scale', onClick: () => openScale(sts) },
                            {
                              label: 'Restart',
                              icon: 'restart',
                              onClick: () => restart(sts),
                              loading: restarting() === `${sts.namespace}/${sts.name}`
                            },
                            { label: 'View YAML', icon: 'yaml', onClick: () => { 
                              setSelected(sts);
                              setYamlKey(`${sts.name}|${sts.namespace}`);
                              setShowYaml(true);
                            } },
                            { label: 'Edit YAML', icon: 'edit', onClick: () => { 
                              setSelected(sts);
                              setYamlKey(`${sts.name}|${sts.namespace}`);
                              setShowEdit(true);
                            } },
                            { label: 'Delete', icon: 'delete', onClick: () => deleteStatefulSet(sts), variant: 'danger', divider: true },
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
                Showing {((currentPage() - 1) * pageSize()) + 1} - {Math.min(currentPage() * pageSize(), filteredAndSorted().length)} of {filteredAndSorted().length} StatefulSets
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
              onCancel={() => { setShowEdit(false); setSelected(null); setYamlKey(null); }}
            />
          </div>
        </Show>
      </Modal>

      {/* Describe Modal */}
      <DescribeModal isOpen={showDescribe()} onClose={() => setShowDescribe(false)} resourceType="statefulset" name={selected()?.name || ''} namespace={selected()?.namespace} />

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

      {/* Bulk Delete Modal */}
      <BulkDeleteModal
        isOpen={showBulkDeleteModal()}
        onClose={() => setShowBulkDeleteModal(false)}
        resourceType="StatefulSets"
        selectedItems={bulk.getSelectedItems(filteredAndSorted())}
        onConfirm={async () => {
          const selectedStatefulSets = bulk.getSelectedItems(filteredAndSorted());

          // Delete each statefulset
          for (const sts of selectedStatefulSets) {
            try {
              await api.deleteStatefulSet(sts.name, sts.namespace);
            } catch (error) {
              console.error(`Failed to delete statefulset ${sts.namespace}/${sts.name}:`, error);
              addNotification(
                `Failed to delete statefulset ${sts.name}: ${error instanceof Error ? error.message : 'Unknown error'}`,
                'error'
              );
            }
          }

          // Clear selection and refetch
          bulk.deselectAll();
          refetch();

          // Show success notification
          addNotification(
            `Successfully deleted ${selectedStatefulSets.length} statefulset${selectedStatefulSets.length !== 1 ? 's' : ''}`,
            'success'
          );
          setShowBulkDeleteModal(false);
        }}
      />
    </div>
  );
};

export default StatefulSets;
