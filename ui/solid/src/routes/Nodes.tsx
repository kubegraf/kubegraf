import { Component, For, Show, createMemo, createSignal, Match, Switch } from 'solid-js';
import { nodesResource, refetchNodes } from '../stores/cluster';
import { searchQuery } from '../stores/ui';
import DescribeModal from '../components/DescribeModal';

interface Node {
  name: string;
  status: string;
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
  const [viewMode, setViewMode] = createSignal<ViewMode>('card');
  const [fontSize, setFontSize] = createSignal(parseInt(localStorage.getItem('nodes-font-size') || '14'));
  const [fontFamily, setFontFamily] = createSignal(localStorage.getItem('nodes-font-family') || 'Monaco');

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
    localStorage.setItem('nodes-font-size', size.toString());
  };

  const handleFontFamilyChange = (family: string) => {
    setFontFamily(family);
    localStorage.setItem('nodes-font-family', family);
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
    return {
      total: all.length,
      ready: all.filter(n => n.status === 'Ready').length,
      notReady: all.filter(n => n.status !== 'Ready').length,
      controlPlane: all.filter(n => n.roles.includes('control-plane') || n.roles.includes('master')).length,
    };
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
          const isReady = node.status === 'Ready';
          const isControlPlane = node.roles.includes('control-plane') || node.roles.includes('master');
          return (
            <div class={`bg-k8s-card border rounded-xl p-6 card-hover ${
              isReady ? 'border-k8s-border' : 'border-red-500/30'
            }`}>
              <div class="flex items-start justify-between mb-4">
                <div class="flex items-center gap-3">
                  <div class={`p-2 rounded-lg ${isControlPlane ? 'bg-cyan-500/20' : 'bg-k8s-dark'}`}>
                    <svg class={`w-6 h-6 ${isControlPlane ? 'text-cyan-400' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
                    </svg>
                  </div>
                  <div>
                    <button
                      onClick={() => { setSelected(node); setShowDescribe(true); }}
                      class="text-white font-semibold hover:underline text-left"
                    >
                      {node.name}
                    </button>
                    <p class="text-gray-500 text-sm">{node.roles || 'worker'}</p>
                  </div>
                </div>
                <span class={`px-2 py-1 rounded text-xs font-medium ${
                  isReady ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                }`}>
                  {node.status}
                </span>
              </div>

              <div class="grid grid-cols-2 gap-4 mb-4">
                <div class="bg-k8s-dark rounded-lg p-3">
                  <div class="flex items-center justify-between mb-2">
                    <span class="text-gray-400 text-sm">CPU</span>
                    <span class="text-white font-medium">{node.cpu || 'N/A'}</span>
                  </div>
                  <div class="h-2 bg-k8s-border rounded-full overflow-hidden">
                    <div class="h-full bg-blue-500 rounded-full" style={{ width: '45%' }}></div>
                  </div>
                </div>

                <div class="bg-k8s-dark rounded-lg p-3">
                  <div class="flex items-center justify-between mb-2">
                    <span class="text-gray-400 text-sm">Memory</span>
                    <span class="text-white font-medium">{node.memory || 'N/A'}</span>
                  </div>
                  <div class="h-2 bg-k8s-border rounded-full overflow-hidden">
                    <div class="h-full bg-purple-500 rounded-full" style={{ width: '60%' }}></div>
                  </div>
                </div>
              </div>

              <div class="flex items-center justify-between text-sm text-gray-400 pt-4 border-t border-k8s-border">
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
    <div class="overflow-hidden rounded-lg" style={{ background: '#000000' }}>
      <div class="overflow-x-auto">
        <table class="data-table terminal-table" style={{ 'font-size': `${fontSize()}px`, 'font-family': getFontFamilyCSS(fontFamily()), color: '#0ea5e9', 'font-weight': '900' }}>
          <style>{`
            table { width: 100%; border-collapse: collapse; }
            thead { background: #000000; position: sticky; top: 0; z-index: 10; }
            tbody tr:hover { background: rgba(14, 165, 233, 0.1); }
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
                const isReady = node.status === 'Ready';
                const isControlPlane = node.roles.includes('control-plane') || node.roles.includes('master');
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
                      <div class="flex items-center gap-2">
                        <div class={`p-1 rounded ${isControlPlane ? 'bg-cyan-500/20' : 'bg-k8s-dark'}`}>
                          <svg class={`w-4 h-4 ${isControlPlane ? 'text-cyan-400' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
                          </svg>
                        </div>
                        <button
                          onClick={() => { setSelected(node); setShowDescribe(true); }}
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
                      <span class={`badge ${isReady ? 'badge-success' : 'badge-error'}`}>
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
                      <span class={`text-sm ${isControlPlane ? 'text-cyan-400' : 'text-gray-400'}`}>
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
              onClick={() => { setSelected(node); setShowDescribe(true); }}
              class={`bg-k8s-card border rounded-lg p-4 text-left hover:bg-k8s-dark transition-colors ${
                isReady ? 'border-k8s-border' : 'border-red-500/30'
              }`}
            >
              <div class="flex items-center gap-2 mb-2">
                <div class={`p-1.5 rounded ${isControlPlane ? 'bg-cyan-500/20' : 'bg-k8s-dark'}`}>
                  <svg class={`w-4 h-4 ${isControlPlane ? 'text-cyan-400' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
                  </svg>
                </div>
                <span class={`px-1.5 py-0.5 rounded text-xs font-medium ${
                  isReady ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                }`}>
                  {node.status}
                </span>
              </div>
              <h4 class="text-white font-medium text-sm truncate mb-1" title={node.name}>
                {node.name}
              </h4>
              <p class="text-gray-500 text-xs truncate">{node.roles || 'worker'}</p>
              <div class="mt-2 pt-2 border-t border-k8s-border">
                <div class="flex justify-between text-xs">
                  <span class="text-gray-500">CPU</span>
                  <span class="text-gray-300">{node.cpu || 'N/A'}</span>
                </div>
                <div class="flex justify-between text-xs mt-1">
                  <span class="text-gray-500">Mem</span>
                  <span class="text-gray-300">{node.memory || 'N/A'}</span>
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
          <h1 class="text-2xl font-bold text-white">Nodes</h1>
          <p class="text-gray-400 mt-1">Cluster node management</p>
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
                  class={`px-3 py-2 flex items-center gap-2 text-sm transition-colors ${
                    viewMode() === mode
                      ? 'bg-k8s-blue text-white'
                      : 'text-gray-400 hover:text-white hover:bg-k8s-dark'
                  }`}
                  title={`${mode.charAt(0).toUpperCase() + mode.slice(1)} View`}
                >
                  <ViewIcon mode={mode} />
                  <span class="hidden sm:inline capitalize">{mode}</span>
                </button>
              )}
            </For>
          </div>
          <button
            onClick={(e) => {
              const btn = e.currentTarget;
              btn.classList.add('refreshing');
              setTimeout(() => btn.classList.remove('refreshing'), 500);
              refetchNodes();
            }}
            class="icon-btn"
            style={{ background: 'var(--bg-secondary)' }}
            title="Refresh Nodes"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {/* Node summary */}
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div class="bg-k8s-card border border-k8s-border rounded-lg p-4">
          <div class="text-gray-400 text-sm">Total Nodes</div>
          <div class="text-2xl font-bold text-white">{nodeSummary().total}</div>
        </div>
        <div class="bg-k8s-card border border-green-500/30 rounded-lg p-4">
          <div class="text-gray-400 text-sm">Ready</div>
          <div class="text-2xl font-bold text-green-400">{nodeSummary().ready}</div>
        </div>
        <div class="bg-k8s-card border border-red-500/30 rounded-lg p-4">
          <div class="text-gray-400 text-sm">Not Ready</div>
          <div class="text-2xl font-bold text-red-400">{nodeSummary().notReady}</div>
        </div>
        <div class="bg-k8s-card border border-cyan-500/30 rounded-lg p-4">
          <div class="text-gray-400 text-sm">Control Plane</div>
          <div class="text-2xl font-bold text-cyan-400">{nodeSummary().controlPlane}</div>
        </div>
      </div>

      {/* Nodes View */}
      <Show
        when={!nodesResource.loading}
        fallback={
          <div class="p-8 text-center text-gray-500">
            <svg class="w-8 h-8 animate-spin mx-auto mb-2" fill="none" viewBox="0 0 24 24">
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

      {/* Describe Modal */}
      <DescribeModal isOpen={showDescribe()} onClose={() => setShowDescribe(false)} resourceType="node" name={selected()?.name || ''} />
    </div>
  );
};

export default Nodes;
