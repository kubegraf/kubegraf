import { Component, For, Show, createMemo, createSignal, Match, Switch, onMount, onCleanup, createEffect, createResource } from 'solid-js';
import { nodesResource, refetchNodes } from '../stores/cluster';
import { searchQuery } from '../stores/ui';
import { api } from '../services/api';
import Modal from '../components/Modal';
import DescribeModal from '../components/DescribeModal';
import YAMLViewer from '../components/YAMLViewer';
import { getInitialFontSize, getInitialFontFamily, getFontFamilyCSS, saveFontSize, saveFontFamily } from '../utils/resourceTableFontDefaults';

interface Node {
  name: string;
  status: string;
  readyStatus?: string;
  isSchedulable?: boolean;
  roles: string;
  age: string;
  version: string;
  cpu?: string;
  memory?: string;
}

type ViewMode = 'card' | 'list' | 'grid';

const Nodes: Component = () => {
  const [selected, setSelected] = createSignal<Node | null>(null);
  const [showDescribe, setShowDescribe] = createSignal(false);
  const [showDetails, setShowDetails] = createSignal(false);
  const [showYaml, setShowYaml] = createSignal(false);
  const [viewMode, setViewMode] = createSignal<ViewMode>('card');
  // Font size and family using shared utility with 14px and Monaco defaults
  const [fontSize, setFontSize] = createSignal(getInitialFontSize('nodes'));
  const [fontFamily, setFontFamily] = createSignal(getInitialFontFamily('nodes'));
  const [autoRefresh, setAutoRefresh] = createSignal(true);
  const [refreshInterval, setRefreshInterval] = createSignal(30); // Default 30 seconds

  const handleFontSizeChange = (size: number) => {
    setFontSize(size);
    saveFontSize('nodes', size);
  };

  const handleFontFamilyChange = (family: string) => {
    setFontFamily(family);
    saveFontFamily('nodes', family);
  };

  const nodes = createMemo(() => {
    const all = nodesResource() || [];
    const query = searchQuery().toLowerCase();
    if (!query) return all;
    return all.filter(n =>
      n.name.toLowerCase().includes(query) ||
      n.roles.toLowerCase().includes(query) ||
      n.status.toLowerCase().includes(query)
    );
  });

  const nodeSummary = createMemo(() => {
    const all = nodesResource() || [];
    // Check for nodes that are ready (regardless of scheduling status)
    const readyNodes = all.filter(n => {
      const status = n.status || '';
      return status.includes('Ready') && !status.includes('NotReady');
    });
    // Check for schedulable nodes (ready and not cordoned)
    const schedulableNodes = all.filter(n => {
      if (n.isSchedulable !== undefined) {
        return n.isSchedulable && (n.readyStatus === 'Ready' || (n.status || '').includes('Ready'));
      }
      // Fallback: check if status doesn't include SchedulingDisabled
      const status = n.status || '';
      return status.includes('Ready') && !status.includes('SchedulingDisabled') && !status.includes('NotReady');
    });
    return {
      total: all.length,
      ready: readyNodes.length,
      notReady: all.length - readyNodes.length,
      schedulable: schedulableNodes.length,
      unschedulable: all.length - schedulableNodes.length,
      controlPlane: all.filter(n => n.roles.includes('control-plane') || n.roles.includes('master')).length,
    };
  });

  // Auto-refresh nodes
  let refreshTimer: ReturnType<typeof setInterval> | null = null;
  
  onMount(() => {
    const startRefresh = () => {
      if (refreshTimer) {
        clearInterval(refreshTimer);
      }
      if (autoRefresh()) {
        refreshTimer = setInterval(() => {
          refetchNodes();
        }, refreshInterval() * 1000);
      }
    };
    
    startRefresh();
    
    // Update timer when auto-refresh or interval changes
    createEffect(() => {
      // Access signals to track changes
      const enabled = autoRefresh();
      const interval = refreshInterval();
      
      if (refreshTimer) {
        clearInterval(refreshTimer);
        refreshTimer = null;
      }
      
      if (enabled) {
        refreshTimer = setInterval(() => {
          refetchNodes();
        }, interval * 1000);
      }
    });
  });

  onCleanup(() => {
    if (refreshTimer) {
      clearInterval(refreshTimer);
      refreshTimer = null;
    }
  });

  const ViewIcon = (props: { mode: ViewMode }) => (
    <Switch>
      <Match when={props.mode === 'card'}>
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
      </Match>
      <Match when={props.mode === 'list'}>
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
        </svg>
      </Match>
      <Match when={props.mode === 'grid'}>
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
        </svg>
      </Match>
    </Switch>
  );

  // Card View Component
  const CardView = () => (
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <For each={nodes()}>
        {(node) => {
          const status = node.status || '';
          const isReady = status.includes('Ready') && !status.includes('NotReady');
          const isSchedulable = node.isSchedulable !== undefined ? node.isSchedulable : !status.includes('SchedulingDisabled');
          const isControlPlane = node.roles.includes('control-plane') || node.roles.includes('master');
          
          // Determine status badge color
          let statusColor = 'bg-red-500/20 text-red-400';
          if (isReady && isSchedulable) {
            statusColor = 'bg-green-500/20 text-green-400';
          } else if (isReady && !isSchedulable) {
            statusColor = 'bg-yellow-500/20 text-yellow-400';
          }
          
          return (
            <div class="border rounded-xl p-6 card-hover" style={{ 
              background: 'var(--bg-card)', 
              'border-color': isReady ? (isSchedulable ? 'var(--border-color)' : 'rgba(234, 179, 8, 0.3)') : 'rgba(239, 68, 68, 0.3)'
            }}>
              <div class="flex items-start justify-between mb-4">
                <div class="flex items-center gap-3">
                  <div class={`p-2 rounded-lg ${isControlPlane ? 'bg-cyan-500/20' : ''}`} style={!isControlPlane ? { background: 'var(--bg-secondary)' } : {}}>
                    <svg class={`w-6 h-6 ${isControlPlane ? 'text-cyan-400' : ''}`} style={!isControlPlane ? { color: 'var(--text-secondary)' } : {}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
                    </svg>
                  </div>
                  <div>
                    <button
                      onClick={() => { setSelected(node); setShowDetails(true); }}
                      class="font-semibold hover:underline text-left"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {node.name}
                    </button>
                    <p class="text-sm" style={{ color: 'var(--text-secondary)' }}>{node.roles || 'worker'}</p>
                  </div>
                </div>
                <span class={`px-2 py-1 rounded text-xs font-medium ${statusColor}`}>
                  {node.status}
                </span>
              </div>

              <div class="grid grid-cols-2 gap-4 mb-4">
                <div class="rounded-lg p-3" style={{ background: 'var(--bg-secondary)' }}>
                  <div class="flex items-center justify-between mb-2">
                    <span class="text-sm" style={{ color: 'var(--text-secondary)' }}>CPU</span>
                    <span class="font-medium" style={{ color: 'var(--text-primary)' }}>{node.cpu || 'N/A'}</span>
                  </div>
                  <div class="h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-tertiary)' }}>
                    <div class="h-full rounded-full" style={{ width: '45%', background: 'var(--accent-primary)' }}></div>
                  </div>
                </div>

                <div class="rounded-lg p-3" style={{ background: 'var(--bg-secondary)' }}>
                  <div class="flex items-center justify-between mb-2">
                    <span class="text-sm" style={{ color: 'var(--text-secondary)' }}>Memory</span>
                    <span class="font-medium" style={{ color: 'var(--text-primary)' }}>{node.memory || 'N/A'}</span>
                  </div>
                  <div class="h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-tertiary)' }}>
                    <div class="h-full rounded-full" style={{ width: '60%', background: 'var(--accent-secondary)' }}></div>
                  </div>
                </div>
              </div>

              <div class="flex items-center justify-between text-sm pt-4 border-t" style={{ color: 'var(--text-secondary)', 'border-color': 'var(--border-color)' }}>
                <span>Version: {node.version}</span>
                <span>Age: {node.age}</span>
              </div>
            </div>
          );
        }}
      </For>
    </div>
  );

  // List View Component (Table)
  const ListView = () => (
    <div class="overflow-hidden rounded-lg" style={{ background: 'var(--bg-primary)' }}>
      <div class="overflow-x-auto">
        <table class="data-table terminal-table" style={{ 'font-size': `${fontSize()}px`, 'font-family': getFontFamilyCSS(fontFamily()), color: 'var(--accent-primary)', 'font-weight': '900' }}>
          <style>{`
            table { width: 100%; border-collapse: collapse; }
            thead { background: var(--bg-primary); position: sticky; top: 0; z-index: 10; }
            tbody tr:hover { background: var(--bg-secondary); }
          `}</style>
          <thead>
            <tr>
              <th class="whitespace-nowrap">Name</th>
              <th class="whitespace-nowrap">Status</th>
              <th class="whitespace-nowrap">Roles</th>
              <th class="whitespace-nowrap">CPU</th>
              <th class="whitespace-nowrap">Memory</th>
              <th class="whitespace-nowrap">Version</th>
              <th class="whitespace-nowrap">Age</th>
            </tr>
          </thead>
          <tbody>
            <For each={nodes()} fallback={
              <tr><td colspan="7" class="text-center py-8" style={{ color: 'var(--text-muted)' }}>No nodes found</td></tr>
            }>
              {(node) => {
                const status = node.status || '';
                const isReady = status.includes('Ready') && !status.includes('NotReady');
                const isSchedulable = node.isSchedulable !== undefined ? node.isSchedulable : !status.includes('SchedulingDisabled');
                const isControlPlane = node.roles.includes('control-plane') || node.roles.includes('master');
                const textColor = 'var(--accent-primary)';
                
                // Determine badge class
                let badgeClass = 'badge-error';
                if (isReady && isSchedulable) {
                  badgeClass = 'badge-success';
                } else if (isReady && !isSchedulable) {
                  badgeClass = 'badge-warning';
                }
                
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
                      <div class="flex items-center gap-2">
                        <div class="p-1 rounded" style={{ background: isControlPlane ? 'rgba(6, 182, 212, 0.2)' : 'var(--bg-secondary)' }}>
                          <svg class="w-4 h-4" style={{ color: isControlPlane ? '#06b6d4' : 'var(--text-secondary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
                          </svg>
                        </div>
                        <button
                          onClick={() => { setSelected(node); setShowDetails(true); }}
                          class="font-medium hover:underline text-left"
                          style={{ color: 'var(--accent-primary)' }}
                        >
                          {node.name}
                        </button>
                      </div>
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
                      <span class={`badge ${badgeClass}`}>
                        {node.status}
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
                    }}>
                      <span class="text-sm" style={{ color: isControlPlane ? '#06b6d4' : 'var(--text-secondary)' }}>
                        {node.roles || 'worker'}
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
                    }} class="font-mono text-sm">{node.cpu || 'N/A'}</td>
                    <td style={{
                      padding: '0 8px',
                      'text-align': 'left',
                      color: textColor,
                      'font-weight': '900',
                      'font-size': `${fontSize()}px`,
                      height: `${Math.max(24, fontSize() * 1.7)}px`,
                      'line-height': `${Math.max(24, fontSize() * 1.7)}px`,
                      border: 'none'
                    }} class="font-mono text-sm">{node.memory || 'N/A'}</td>
                    <td style={{
                      padding: '0 8px',
                      'text-align': 'left',
                      color: textColor,
                      'font-weight': '900',
                      'font-size': `${fontSize()}px`,
                      height: `${Math.max(24, fontSize() * 1.7)}px`,
                      'line-height': `${Math.max(24, fontSize() * 1.7)}px`,
                      border: 'none'
                    }} class="font-mono text-sm">{node.version}</td>
                    <td style={{
                      padding: '0 8px',
                      'text-align': 'left',
                      color: textColor,
                      'font-weight': '900',
                      'font-size': `${fontSize()}px`,
                      height: `${Math.max(24, fontSize() * 1.7)}px`,
                      'line-height': `${Math.max(24, fontSize() * 1.7)}px`,
                      border: 'none'
                    }}>{node.age}</td>
                  </tr>
                );
              }}
            </For>
          </tbody>
        </table>
      </div>
    </div>
  );

  // Grid View Component (Compact Cards)
  const GridView = () => (
    <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
      <For each={nodes()}>
        {(node) => {
          const isReady = node.status === 'Ready';
          const isControlPlane = node.roles.includes('control-plane') || node.roles.includes('master');
          return (
            <button
              onClick={() => { setSelected(node); setShowDetails(true); }}
              class="border rounded-lg p-4 text-left transition-colors hover:opacity-80"
              style={{ 
                background: 'var(--bg-card)', 
                'border-color': isReady ? 'var(--border-color)' : 'rgba(239, 68, 68, 0.3)'
              }}
            >
              <div class="flex items-center gap-2 mb-2">
                <div class={`p-1.5 rounded ${isControlPlane ? 'bg-cyan-500/20' : ''}`} style={!isControlPlane ? { background: 'var(--bg-secondary)' } : {}}>
                  <svg class={`w-4 h-4 ${isControlPlane ? 'text-cyan-400' : ''}`} style={!isControlPlane ? { color: 'var(--text-secondary)' } : {}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
                  </svg>
                </div>
                <span class={`px-1.5 py-0.5 rounded text-xs font-medium ${
                  isReady ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                }`}>
                  {node.status}
                </span>
              </div>
              <h4 class="font-medium text-sm truncate mb-1" style={{ color: 'var(--text-primary)' }} title={node.name}>
                {node.name}
              </h4>
              <p class="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>{node.roles || 'worker'}</p>
              <div class="mt-2 pt-2 border-t" style={{ 'border-color': 'var(--border-color)' }}>
                <div class="flex justify-between text-xs">
                  <span style={{ color: 'var(--text-secondary)' }}>CPU</span>
                  <span style={{ color: 'var(--text-primary)' }}>{node.cpu || 'N/A'}</span>
                </div>
                <div class="flex justify-between text-xs mt-1">
                  <span style={{ color: 'var(--text-secondary)' }}>Mem</span>
                  <span style={{ color: 'var(--text-primary)' }}>{node.memory || 'N/A'}</span>
                </div>
              </div>
            </button>
          );
        }}
      </For>
    </div>
  );

  return (
    <div class="space-y-6">
      {/* Header */}
      <div class="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 class="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Nodes</h1>
          <p class="mt-1" style={{ color: 'var(--text-secondary)' }}>Cluster node management</p>
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
          {/* View Mode Selector */}
          <div class="flex items-center rounded-lg overflow-hidden" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
            <For each={(['card', 'list', 'grid'] as ViewMode[])}>
              {(mode) => (
                <button
                  onClick={() => setViewMode(mode)}
                  class="px-3 py-2 flex items-center gap-2 text-sm transition-colors"
                  style={{
                    background: viewMode() === mode ? 'var(--accent-primary)' : 'transparent',
                    color: viewMode() === mode ? '#000' : 'var(--text-secondary)',
                  }}
                  onMouseEnter={(e) => {
                    if (viewMode() !== mode) {
                      e.currentTarget.style.background = 'var(--bg-tertiary)';
                      e.currentTarget.style.color = 'var(--text-primary)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (viewMode() !== mode) {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = 'var(--text-secondary)';
                    }
                  }}
                  title={`${mode.charAt(0).toUpperCase() + mode.slice(1)} View`}
                >
                  <ViewIcon mode={mode} />
                  <span class="hidden sm:inline capitalize">{mode}</span>
                </button>
              )}
            </For>
          </div>
          <div class="flex items-center gap-2">
            <label class="flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
              <input
                type="checkbox"
                checked={autoRefresh()}
                onChange={(e) => setAutoRefresh(e.currentTarget.checked)}
                class="rounded"
              />
              <span>Auto-refresh ({refreshInterval()}s)</span>
            </label>
            <button
              onClick={(e) => {
                const btn = e.currentTarget;
                btn.classList.add('refreshing');
                setTimeout(() => btn.classList.remove('refreshing'), 500);
                refetchNodes();
              }}
              class="icon-btn"
              style={{ background: 'var(--bg-secondary)' }}
              title={`Refresh Nodes${autoRefresh() ? ` (Auto-refresh: ${refreshInterval()}s)` : ''}`}
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Node summary */}
      <div class="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div class="rounded-lg p-4 border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
          <div class="text-sm" style={{ color: 'var(--text-secondary)' }}>Total Nodes</div>
          <div class="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{nodeSummary().total}</div>
        </div>
        <div class="rounded-lg p-4 border" style={{ background: 'var(--bg-card)', borderColor: 'rgba(34, 197, 94, 0.3)' }}>
          <div class="text-sm" style={{ color: 'var(--text-secondary)' }}>Ready</div>
          <div class="text-2xl font-bold" style={{ color: 'var(--success-color, #22c55e)' }}>{nodeSummary().ready}</div>
        </div>
        <div class="rounded-lg p-4 border" style={{ background: 'var(--bg-card)', borderColor: 'rgba(34, 197, 94, 0.3)' }}>
          <div class="text-sm" style={{ color: 'var(--text-secondary)' }}>Schedulable</div>
          <div class="text-2xl font-bold" style={{ color: 'var(--success-color, #22c55e)' }}>{nodeSummary().schedulable}</div>
          <div class="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Can schedule pods</div>
        </div>
        <div class="rounded-lg p-4 border" style={{ background: 'var(--bg-card)', borderColor: 'rgba(251, 191, 36, 0.3)' }}>
          <div class="text-sm" style={{ color: 'var(--text-secondary)' }}>Cordoned/Drained</div>
          <div class="text-2xl font-bold" style={{ color: 'var(--warning-color, #fbbf24)' }}>{nodeSummary().unschedulable}</div>
          <div class="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>SchedulingDisabled</div>
        </div>
        <div class="rounded-lg p-4 border" style={{ background: 'var(--bg-card)', borderColor: 'rgba(239, 68, 68, 0.3)' }}>
          <div class="text-sm" style={{ color: 'var(--text-secondary)' }}>Not Ready</div>
          <div class="text-2xl font-bold" style={{ color: 'var(--error-color, #dc3545)' }}>{nodeSummary().notReady}</div>
        </div>
        <div class="rounded-lg p-4 border" style={{ background: 'var(--bg-card)', borderColor: 'rgba(6, 182, 212, 0.3)' }}>
          <div class="text-sm" style={{ color: 'var(--text-secondary)' }}>Control Plane</div>
          <div class="text-2xl font-bold" style={{ color: '#06b6d4' }}>{nodeSummary().controlPlane}</div>
        </div>
      </div>

      {/* Nodes View */}
      <Show
        when={!nodesResource.loading}
        fallback={
          <div class="p-8 text-center" style={{ color: 'var(--text-secondary)' }}>
            <svg class="w-8 h-8 animate-spin mx-auto mb-2" fill="none" viewBox="0 0 24 24" style={{ color: 'var(--accent-primary)' }}>
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Loading nodes...
          </div>
        }
      >
        <Switch>
          <Match when={viewMode() === 'card'}>
            <CardView />
          </Match>
          <Match when={viewMode() === 'list'}>
            <ListView />
          </Match>
          <Match when={viewMode() === 'grid'}>
            <GridView />
          </Match>
        </Switch>
      </Show>

      {/* Details Modal */}
      <Modal isOpen={showDetails()} onClose={() => setShowDetails(false)} title={`Node: ${selected()?.name || ''}`} size="xl">
        <Show when={selected()}>
          {(() => {
            const [nodeDetails] = createResource(
              () => selected()?.name || null,
              async (name) => {
                if (!name) return null;
                return api.getNodeDetails(name);
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
                        <Show when={!nodeDetails.loading && nodeDetails()}>
                          {(details) => {
                            const status = details().status || selected()?.status || 'Unknown';
                            const isReady = status.includes('Ready') && !status.includes('NotReady');
                            return (
                              <span class={`badge ${isReady ? 'badge-success' : 'badge-error'}`}>
                                {status}
                              </span>
                            );
                          }}
                        </Show>
                        <Show when={nodeDetails.loading}>
                          <div class="spinner" style={{ width: '16px', height: '16px' }} />
                        </Show>
                      </div>
                    </div>
                    <div class="p-3 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
                      <div class="text-xs" style={{ color: 'var(--text-muted)' }}>Roles</div>
                      <div style={{ color: 'var(--text-primary)' }}>
                        <Show when={!nodeDetails.loading && nodeDetails()}>
                          {(details) => details().roles || selected()?.roles || 'worker'}
                        </Show>
                        <Show when={nodeDetails.loading}>
                          <div class="spinner" style={{ width: '16px', height: '16px' }} />
                        </Show>
                      </div>
                    </div>
                    <div class="p-3 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
                      <div class="text-xs" style={{ color: 'var(--text-muted)' }}>Version</div>
                      <div style={{ color: 'var(--text-primary)' }}>
                        <Show when={!nodeDetails.loading && nodeDetails()}>
                          {(details) => details().version || selected()?.version || '-'}
                        </Show>
                        <Show when={nodeDetails.loading}>
                          <div class="spinner" style={{ width: '16px', height: '16px' }} />
                        </Show>
                      </div>
                    </div>
                    <div class="p-3 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
                      <div class="text-xs" style={{ color: 'var(--text-muted)' }}>Age</div>
                      <div style={{ color: 'var(--text-primary)' }}>{selected()?.age || '-'}</div>
                    </div>
                    <div class="p-3 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
                      <div class="text-xs" style={{ color: 'var(--text-muted)' }}>CPU</div>
                      <div style={{ color: 'var(--text-primary)' }}>
                        <Show when={!nodeDetails.loading && nodeDetails()}>
                          {(details) => details().cpu || selected()?.cpu || '-'}
                        </Show>
                        <Show when={nodeDetails.loading}>
                          <div class="spinner" style={{ width: '16px', height: '16px' }} />
                        </Show>
                      </div>
                    </div>
                    <div class="p-3 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
                      <div class="text-xs" style={{ color: 'var(--text-muted)' }}>Memory</div>
                      <div style={{ color: 'var(--text-primary)' }}>
                        <Show when={!nodeDetails.loading && nodeDetails()}>
                          {(details) => details().memory || selected()?.memory || '-'}
                        </Show>
                        <Show when={nodeDetails.loading}>
                          <div class="spinner" style={{ width: '16px', height: '16px' }} />
                        </Show>
                      </div>
                    </div>
                    <div class="p-3 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
                      <div class="text-xs" style={{ color: 'var(--text-muted)' }}>Pods Capacity</div>
                      <div style={{ color: 'var(--text-primary)' }}>
                        <Show when={!nodeDetails.loading && nodeDetails()}>
                          {(details) => details().pods || '-'}
                        </Show>
                        <Show when={nodeDetails.loading}>
                          <div class="spinner" style={{ width: '16px', height: '16px' }} />
                        </Show>
                      </div>
                    </div>
                    <div class="p-3 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
                      <div class="text-xs" style={{ color: 'var(--text-muted)' }}>OS Image</div>
                      <div style={{ color: 'var(--text-primary)' }} class="text-xs break-all">
                        <Show when={!nodeDetails.loading && nodeDetails()}>
                          {(details) => details().osImage || '-'}
                        </Show>
                        <Show when={nodeDetails.loading}>
                          <div class="spinner" style={{ width: '16px', height: '16px' }} />
                        </Show>
                      </div>
                    </div>
                  </div>
                </div>

                {/* System Info */}
                <Show when={!nodeDetails.loading && nodeDetails()}>
                  {(details) => (
                    <div>
                      <h3 class="text-sm font-semibold mb-3" style={{ color: 'var(--text-secondary)' }}>System Information</h3>
                      <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div class="p-3 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
                          <div class="text-xs" style={{ color: 'var(--text-muted)' }}>Kernel Version</div>
                          <div style={{ color: 'var(--text-primary)' }} class="text-xs break-all">
                            {details().kernelVersion || '-'}
                          </div>
                        </div>
                        <div class="p-3 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
                          <div class="text-xs" style={{ color: 'var(--text-muted)' }}>Container Runtime</div>
                          <div style={{ color: 'var(--text-primary)' }} class="text-xs break-all">
                            {details().containerRuntime || '-'}
                          </div>
                        </div>
                        <div class="p-3 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
                          <div class="text-xs" style={{ color: 'var(--text-muted)' }}>Kubelet Version</div>
                          <div style={{ color: 'var(--text-primary)' }} class="text-xs break-all">
                            {details().version || '-'}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </Show>

                {/* Addresses */}
                <Show when={!nodeDetails.loading && nodeDetails()?.addresses && Array.isArray(nodeDetails()!.addresses) && nodeDetails()!.addresses.length > 0}>
                  <div>
                    <h3 class="text-sm font-semibold mb-3" style={{ color: 'var(--text-secondary)' }}>Addresses</h3>
                    <div class="rounded-lg border overflow-x-auto" style={{ 'border-color': 'var(--border-color)', background: 'var(--bg-secondary)' }}>
                      <table class="w-full">
                        <thead>
                          <tr style={{ background: 'var(--bg-tertiary)' }}>
                            <th class="px-4 py-2 text-left text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Type</th>
                            <th class="px-4 py-2 text-left text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Address</th>
                          </tr>
                        </thead>
                        <tbody>
                          <For each={nodeDetails()!.addresses}>
                            {(addr: any) => (
                              <tr class="border-b" style={{ 'border-color': 'var(--border-color)' }}>
                                <td class="px-4 py-2 text-sm" style={{ color: 'var(--text-primary)' }}>{addr.type || '-'}</td>
                                <td class="px-4 py-2 text-sm" style={{ color: 'var(--text-primary)' }}>{addr.address || '-'}</td>
                              </tr>
                            )}
                          </For>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </Show>

                {/* Conditions */}
                <Show when={!nodeDetails.loading && nodeDetails()?.conditions && Array.isArray(nodeDetails()!.conditions) && nodeDetails()!.conditions.length > 0}>
                  <div>
                    <h3 class="text-sm font-semibold mb-3" style={{ color: 'var(--text-secondary)' }}>Conditions</h3>
                    <div class="space-y-2">
                      <For each={nodeDetails()!.conditions}>
                        {(condition: any) => (
                          <div class="p-3 rounded-lg border" style={{ background: 'var(--bg-tertiary)', 'border-color': 'var(--border-color)' }}>
                            <div class="flex items-center justify-between mb-1">
                              <span class="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{condition.type || '-'}</span>
                              <span class={`badge ${condition.status === 'True' ? 'badge-success' : condition.status === 'False' ? 'badge-error' : 'badge-warning'}`}>
                                {condition.status || '-'}
                              </span>
                            </div>
                            <Show when={condition.reason}>
                              <div class="text-xs" style={{ color: 'var(--text-secondary)' }}>Reason: {condition.reason}</div>
                            </Show>
                            <Show when={condition.message}>
                              <div class="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{condition.message}</div>
                            </Show>
                            <Show when={condition.lastTransitionTime}>
                              <div class="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                                Last transition: {new Date(condition.lastTransitionTime).toLocaleString()}
                              </div>
                            </Show>
                          </div>
                        )}
                      </For>
                    </div>
                  </div>
                </Show>

                {/* Labels */}
                <Show when={!nodeDetails.loading && nodeDetails()?.labels && Object.keys(nodeDetails()!.labels).length > 0}>
                  <div>
                    <h3 class="text-sm font-semibold mb-3" style={{ color: 'var(--text-secondary)' }}>Labels</h3>
                    <div class="rounded-lg border p-3" style={{ background: 'var(--bg-secondary)', 'border-color': 'var(--border-color)' }}>
                      <div class="flex flex-wrap gap-2">
                        <For each={Object.entries(nodeDetails()!.labels)}>
                          {([key, value]) => (
                            <span class="px-2 py-1 rounded text-xs" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}>
                              {key}={String(value)}
                            </span>
                          )}
                        </For>
                      </div>
                    </div>
                  </div>
                </Show>

                {/* Actions */}
                <div class="grid grid-cols-3 md:grid-cols-4 gap-2 pt-3">
                  <button
                    onClick={() => { setShowDetails(false); setShowYaml(true); }}
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
                </div>
              </div>
            );
          })()}
        </Show>
      </Modal>

      {/* YAML Modal */}
      <Show when={showYaml() && selected()}>
        {(() => {
          const [yaml] = createResource(
            () => selected()?.name || null,
            async (name) => {
              if (!name) return null;
              const result = await api.getNodeYAML(name);
              return result?.yaml || '';
            }
          );
          return (
            <Modal isOpen={showYaml()} onClose={() => setShowYaml(false)} title={`Node YAML: ${selected()?.name || ''}`} size="xl">
              <Show when={!yaml.loading && yaml()} fallback={<div class="spinner" />}>
                <YAMLViewer yaml={yaml() || ''} />
              </Show>
            </Modal>
          );
        })()}
      </Show>

      {/* Describe Modal */}
      <DescribeModal isOpen={showDescribe()} onClose={() => setShowDescribe(false)} resourceType="node" name={selected()?.name || ''} />
    </div>
  );
};

export default Nodes;
