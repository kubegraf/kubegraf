import { Component, For, Show, createMemo } from 'solid-js';
import { nodesResource, refetchNodes } from '../stores/cluster';
import { searchQuery } from '../stores/ui';

const Nodes: Component = () => {
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

  return (
    <div class="space-y-6">
      {/* Header */}
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-white">Nodes</h1>
          <p class="text-gray-400 mt-1">Cluster node management</p>
        </div>
        <button
          onClick={() => refetchNodes()}
          class="flex items-center gap-2 px-4 py-2 bg-k8s-blue rounded-lg hover:bg-k8s-blue/80 transition-colors text-white"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      {/* Node summary */}
      <div class="grid grid-cols-4 gap-4">
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

      {/* Nodes grid */}
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
                        <h3 class="text-white font-semibold">{node.name}</h3>
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
                    {/* CPU */}
                    <div class="bg-k8s-dark rounded-lg p-3">
                      <div class="flex items-center justify-between mb-2">
                        <span class="text-gray-400 text-sm">CPU</span>
                        <span class="text-white font-medium">{node.cpu || 'N/A'}</span>
                      </div>
                      <div class="h-2 bg-k8s-border rounded-full overflow-hidden">
                        <div class="h-full bg-blue-500 rounded-full" style={{ width: '45%' }}></div>
                      </div>
                    </div>

                    {/* Memory */}
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
      </Show>
    </div>
  );
};

export default Nodes;
