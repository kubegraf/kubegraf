import { Component, For, Show, createResource, createSignal } from 'solid-js';
import { api } from '../services/api';
import { currentContext, refreshTrigger } from '../stores/cluster';

interface NamespaceCost {
  namespace: string;
  podCount: number;
  totalCpu: number;
  totalMemory: number;
  totalStorage: number;
  hourlyCost: number;
  dailyCost: number;
  monthlyCost: number;
  topResources: Array<{
    resource: string;
    namespace: string;
    kind: string;
    cpu: number;
    memory: number;
    hourlyCost: number;
  }>;
}

interface IdleResource {
  name: string;
  namespace: string;
  kind: string;
  cpuUsage: number;
  cpuRequest: number;
  memoryUsage: number;
  memoryRequest: number;
  wastedCost: number;
}

const Cost: Component = () => {
  const [activeTab, setActiveTab] = createSignal<'overview' | 'namespaces' | 'idle'>('overview');
  const [selectedNamespace, setSelectedNamespace] = createSignal<string | null>(null);

  // Refresh cost data when cluster changes
  const [clusterCost, { refetch: refetchCost }] = createResource(
    () => {
      const ctx = currentContext();
      const refresh = refreshTrigger();
      return { context: ctx, refresh };
    },
    async () => {
      try {
        const result = await api.getClusterCost();
        console.log('Cost API response:', result);
        return result;
      } catch (e) {
        console.error('Cost API error:', e);
        return null;
      }
    }
  );
  
  // Refresh status when cluster changes
  const [clusterStatus, { refetch: refetchStatus }] = createResource(
    () => {
      const ctx = currentContext();
      const refresh = refreshTrigger();
      return { context: ctx, refresh };
    },
    async () => api.getStatus()
  );
  
  // Refresh idle resources when cluster changes
  const [idleResources, { refetch: refetchIdle }] = createResource(
    () => {
      const ctx = currentContext();
      const refresh = refreshTrigger();
      return { context: ctx, refresh };
    },
    async () => api.getIdleResources()
  );
  
  // Refresh namespaces when cluster changes
  const [namespaces, { refetch: refetchNamespaces }] = createResource(
    () => {
      const ctx = currentContext();
      const refresh = refreshTrigger();
      return { context: ctx, refresh };
    },
    async () => api.getNamespaces()
  );

  const formatCurrency = (value: number | undefined) => {
    if (value === undefined || value === null) return '--';
    return `$${value.toFixed(2)}`;
  };

  const formatCPU = (value: number | undefined) => {
    if (value === undefined || value === null) return '--';
    if (value < 1) return `${(value * 1000).toFixed(0)}m`;
    return `${value.toFixed(2)} cores`;
  };

  const formatMemory = (value: number | undefined) => {
    if (value === undefined || value === null) return '--';
    if (value < 1) return `${(value * 1024).toFixed(0)} Mi`;
    return `${value.toFixed(2)} Gi`;
  };

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'namespaces', label: 'By Namespace' },
    { id: 'idle', label: 'Idle Resources' },
  ];

  return (
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Cost Analysis</h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            {clusterStatus()?.cluster ? `Cluster: ${clusterStatus()?.cluster}` : 'Cluster cost estimation and optimization opportunities'}
          </p>
        </div>
        {/* Cloud Provider Badge */}
        <div class="flex items-center gap-3 px-4 py-2 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
          <Show when={clusterCost()?.cloud?.provider === 'gcp'}>
            <svg class="w-8 h-8" viewBox="0 0 48 48">
              <path fill="#4285F4" d="M24 4L6 14v20l18 10 18-10V14L24 4z"/>
              <path fill="#EA4335" d="M24 4L6 14l18 10 18-10L24 4z"/>
              <path fill="#34A853" d="M6 34l18 10V24L6 14v20z"/>
              <path fill="#FBBC05" d="M42 34V14L24 24v20l18-10z"/>
              <path fill="#fff" d="M24 17l-7 4v8l7 4 7-4v-8l-7-4z" opacity=".3"/>
            </svg>
          </Show>
          <Show when={clusterCost()?.cloud?.provider === 'aws'}>
            <svg class="w-8 h-8" viewBox="0 0 48 48">
              <path fill="#FF9900" d="M8 24c0-8.8 7.2-16 16-16s16 7.2 16 16-7.2 16-16 16S8 32.8 8 24z"/>
              <path fill="#252F3E" d="M16 22c0-4.4 3.6-8 8-8s8 3.6 8 8-3.6 8-8 8-8-3.6-8-8z"/>
            </svg>
          </Show>
          <Show when={clusterCost()?.cloud?.provider === 'azure'}>
            <svg class="w-8 h-8" viewBox="0 0 48 48">
              <path fill="#0089D6" d="M24 4L8 24l8 16h16l8-16L24 4z"/>
            </svg>
          </Show>
          <Show when={!clusterCost()?.cloud?.provider || clusterCost()?.cloud?.provider === 'unknown'}>
            <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--text-muted)' }}>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z"/>
            </svg>
          </Show>
          <div>
            <div class="font-medium" style={{ color: 'var(--text-primary)' }}>
              {clusterCost.loading ? 'Loading...' : (clusterCost()?.cloud?.displayName || 'Unknown Cloud')}
            </div>
            <div class="text-xs" style={{ color: 'var(--text-muted)' }}>
              {clusterCost.loading ? '...' : (clusterCost()?.cloud?.region || 'Unknown region')}
            </div>
          </div>
        </div>
      </div>

      {/* Cost Summary Cards */}
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div class="card p-6">
          <div class="text-sm" style={{ color: 'var(--text-muted)' }}>Hourly Cost</div>
          <div class="text-3xl font-bold mt-2" style={{ color: 'var(--accent-primary)' }}>
            {formatCurrency(clusterCost()?.hourlyCost)}
          </div>
          <div class="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
            {clusterCost()?.nodeCount || 0} nodes
          </div>
        </div>
        <div class="card p-6">
          <div class="text-sm" style={{ color: 'var(--text-muted)' }}>Daily Cost</div>
          <div class="text-3xl font-bold mt-2" style={{ color: 'var(--accent-secondary)' }}>
            {formatCurrency(clusterCost()?.dailyCost)}
          </div>
          <div class="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
            {formatCPU(clusterCost()?.totalCpu)} CPU
          </div>
        </div>
        <div class="card p-6">
          <div class="text-sm" style={{ color: 'var(--text-muted)' }}>Monthly Estimate</div>
          <div class="text-3xl font-bold mt-2" style={{ color: '#f59e0b' }}>
            {formatCurrency(clusterCost()?.monthlyCost)}
          </div>
          <div class="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
            {formatMemory(clusterCost()?.totalMemory)} Memory
          </div>
        </div>
        <div class="card p-6">
          <div class="text-sm" style={{ color: 'var(--text-muted)' }}>Potential Savings</div>
          <div class="text-3xl font-bold mt-2" style={{ color: 'var(--success-color)' }}>
            {formatCurrency(
              (idleResources()?.idleResources || []).reduce((acc: number, r: IdleResource) => acc + (r.wastedCost || 0), 0) * 720
            )}
          </div>
          <div class="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
            {(idleResources()?.idleResources || []).length} idle resources
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div class="flex gap-2 border-b" style={{ 'border-color': 'var(--border-color)' }}>
        <For each={tabs}>
          {(tab) => (
            <button
              onClick={() => setActiveTab(tab.id as any)}
              class="px-4 py-2 -mb-px transition-colors"
              style={{
                color: activeTab() === tab.id ? 'var(--accent-primary)' : 'var(--text-secondary)',
                'border-bottom': activeTab() === tab.id ? '2px solid var(--accent-primary)' : '2px solid transparent',
              }}
            >
              {tab.label}
            </button>
          )}
        </For>
      </div>

      {/* Overview Tab */}
      <Show when={activeTab() === 'overview'}>
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Cost Breakdown by Namespace */}
          <div class="card p-6">
            <h3 class="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Cost by Namespace</h3>
            <div class="space-y-3">
              <For each={(clusterCost()?.namespaceCosts || []).slice(0, 8)}>
                {(ns: NamespaceCost) => (
                  <div class="flex items-center justify-between p-3 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
                    <div>
                      <div class="font-medium" style={{ color: 'var(--text-primary)' }}>{ns.namespace}</div>
                      <div class="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {ns.podCount} pods • {formatCPU(ns.totalCpu)} CPU • {formatMemory(ns.totalMemory)} mem
                      </div>
                    </div>
                    <div class="text-right">
                      <div class="font-bold" style={{ color: 'var(--warning-color)' }}>
                        {formatCurrency(ns.monthlyCost)}/mo
                      </div>
                      <div class="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {formatCurrency(ns.dailyCost)}/day
                      </div>
                    </div>
                  </div>
                )}
              </For>
              <Show when={(clusterCost()?.namespaceCosts || []).length === 0}>
                <div class="text-center py-8" style={{ color: 'var(--text-muted)' }}>
                  No namespace cost data available
                </div>
              </Show>
            </div>
          </div>

          {/* Resource Allocation */}
          <div class="card p-6">
            <h3 class="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Resource Allocation</h3>
            <div class="space-y-4">
              <div>
                <div class="flex justify-between text-sm mb-2">
                  <span style={{ color: 'var(--text-secondary)' }}>CPU ({formatCPU(clusterCost()?.totalCpu)})</span>
                  <span style={{ color: 'var(--text-muted)' }}>Cluster Total</span>
                </div>
                <div class="h-3 rounded-full overflow-hidden" style={{ background: 'var(--bg-tertiary)' }}>
                  <div class="h-full rounded-full" style={{ width: '100%', background: 'var(--accent-primary)' }} />
                </div>
              </div>
              <div>
                <div class="flex justify-between text-sm mb-2">
                  <span style={{ color: 'var(--text-secondary)' }}>Memory ({formatMemory(clusterCost()?.totalMemory)})</span>
                  <span style={{ color: 'var(--text-muted)' }}>Cluster Total</span>
                </div>
                <div class="h-3 rounded-full overflow-hidden" style={{ background: 'var(--bg-tertiary)' }}>
                  <div class="h-full rounded-full" style={{ width: '100%', background: 'var(--accent-secondary)' }} />
                </div>
              </div>
              <div>
                <div class="flex justify-between text-sm mb-2">
                  <span style={{ color: 'var(--text-secondary)' }}>Nodes</span>
                  <span style={{ color: 'var(--text-muted)' }}>{clusterCost()?.nodeCount || 0}</span>
                </div>
              </div>
            </div>

            {/* Cost per resource */}
            <div class="mt-6 pt-4 border-t" style={{ 'border-color': 'var(--border-color)' }}>
              <h4 class="text-sm font-medium mb-3" style={{ color: 'var(--text-primary)' }}>
                Pricing Rates ({clusterCost()?.pricing?.provider || 'Generic'}{clusterCost()?.pricing?.region ? ` - ${clusterCost()?.pricing?.region}` : ''})
              </h4>
              <div class="space-y-2 text-sm">
                <div class="flex justify-between">
                  <span style={{ color: 'var(--text-secondary)' }}>CPU (per core/hour)</span>
                  <span style={{ color: 'var(--text-primary)' }}>
                    ${(clusterCost()?.pricing?.cpuPerCoreHour || 0.0336).toFixed(4)}
                  </span>
                </div>
                <div class="flex justify-between">
                  <span style={{ color: 'var(--text-secondary)' }}>Memory (per GB/hour)</span>
                  <span style={{ color: 'var(--text-primary)' }}>
                    ${(clusterCost()?.pricing?.memoryPerGBHour || 0.0045).toFixed(4)}
                  </span>
                </div>
                <div class="flex justify-between">
                  <span style={{ color: 'var(--text-secondary)' }}>Storage (per GB/month)</span>
                  <span style={{ color: 'var(--text-primary)' }}>
                    ${(clusterCost()?.pricing?.storagePerGBMonth || 0.10).toFixed(2)}
                  </span>
                </div>
              </div>
              {/* Node type breakdown */}
              <Show when={clusterCost()?.pricing?.spotNodesCount !== undefined}>
                <div class="mt-4 pt-3 border-t" style={{ 'border-color': 'var(--border-color)' }}>
                  <div class="flex justify-between text-sm">
                    <span style={{ color: 'var(--text-secondary)' }}>On-Demand Nodes</span>
                    <span style={{ color: 'var(--text-primary)' }}>{clusterCost()?.pricing?.onDemandNodesCount || 0}</span>
                  </div>
                  <div class="flex justify-between text-sm mt-1">
                    <span style={{ color: 'var(--text-secondary)' }}>Spot/Preemptible Nodes</span>
                    <span class="flex items-center gap-1">
                      <span style={{ color: 'var(--success-color)' }}>{clusterCost()?.pricing?.spotNodesCount || 0}</span>
                      <Show when={(clusterCost()?.pricing?.spotNodesCount || 0) > 0}>
                        <span class="text-xs px-1.5 py-0.5 rounded" style={{ background: 'rgba(34, 197, 94, 0.2)', color: 'var(--success-color)' }}>
                          ~70% savings
                        </span>
                      </Show>
                    </span>
                  </div>
                </div>
              </Show>
              <p class="text-xs mt-3" style={{ color: 'var(--text-muted)' }}>
                <Show when={clusterCost()?.cloud?.provider === 'gcp'} fallback="Rates auto-detected from cluster. Actual costs may vary.">
                  GCP {clusterCost()?.cloud?.region} region pricing applied automatically.
                </Show>
              </p>
            </div>
          </div>
        </div>
      </Show>

      {/* Namespaces Tab */}
      <Show when={activeTab() === 'namespaces'}>
        <div class="card overflow-hidden">
          <table class="data-table">
            <thead>
              <tr>
                <th>Namespace</th>
                <th>Pods</th>
                <th>CPU</th>
                <th>Memory</th>
                <th>Hourly</th>
                <th>Daily</th>
                <th>Monthly</th>
              </tr>
            </thead>
            <tbody>
              <For each={clusterCost()?.namespaceCosts || []} fallback={
                <tr>
                  <td colspan="7" class="text-center py-8" style={{ color: 'var(--text-muted)' }}>
                    No namespace cost data available
                  </td>
                </tr>
              }>
                {(ns: NamespaceCost) => (
                  <tr class="hover:bg-[var(--bg-tertiary)]">
                    <td class="font-medium" style={{ color: 'var(--accent-primary)' }}>{ns.namespace}</td>
                    <td>{ns.podCount}</td>
                    <td>{formatCPU(ns.totalCpu)}</td>
                    <td>{formatMemory(ns.totalMemory)}</td>
                    <td>{formatCurrency(ns.hourlyCost)}</td>
                    <td>{formatCurrency(ns.dailyCost)}</td>
                    <td class="font-bold" style={{ color: 'var(--warning-color)' }}>{formatCurrency(ns.monthlyCost)}</td>
                  </tr>
                )}
              </For>
            </tbody>
          </table>
        </div>
      </Show>

      {/* Idle Resources Tab */}
      <Show when={activeTab() === 'idle'}>
        <div class="card p-6 mb-6">
          <div class="flex items-center gap-3">
            <svg class="w-6 h-6" style={{ color: 'var(--success-color)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h3 class="font-semibold" style={{ color: 'var(--text-primary)' }}>Optimization Opportunities</h3>
              <p class="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Resources using less than 10% of their requests could be scaled down to save costs
              </p>
            </div>
          </div>
        </div>

        <div class="card overflow-hidden">
          <table class="data-table">
            <thead>
              <tr>
                <th>Resource</th>
                <th>Namespace</th>
                <th>Kind</th>
                <th>CPU Usage</th>
                <th>Memory Usage</th>
                <th>Wasted Cost/hr</th>
              </tr>
            </thead>
            <tbody>
              <For each={idleResources()?.idleResources || []} fallback={
                <tr>
                  <td colspan="6" class="text-center py-8" style={{ color: 'var(--text-muted)' }}>
                    <svg class="w-12 h-12 mx-auto mb-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p>No idle resources found</p>
                    <p class="text-sm">All resources are being utilized efficiently</p>
                  </td>
                </tr>
              }>
                {(resource: IdleResource) => (
                  <tr class="hover:bg-[var(--bg-tertiary)]">
                    <td class="font-medium" style={{ color: 'var(--accent-primary)' }}>{resource.name}</td>
                    <td>{resource.namespace}</td>
                    <td>
                      <span class="badge badge-info">{resource.kind}</span>
                    </td>
                    <td>
                      <div class="flex items-center gap-2">
                        <div class="w-16 h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-tertiary)' }}>
                          <div
                            class="h-full rounded-full"
                            style={{
                              width: `${Math.min(100, (resource.cpuUsage / resource.cpuRequest) * 100)}%`,
                              background: 'var(--warning-color)'
                            }}
                          />
                        </div>
                        <span class="text-xs" style={{ color: 'var(--text-muted)' }}>
                          {((resource.cpuUsage / resource.cpuRequest) * 100).toFixed(1)}%
                        </span>
                      </div>
                    </td>
                    <td>
                      <div class="flex items-center gap-2">
                        <div class="w-16 h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-tertiary)' }}>
                          <div
                            class="h-full rounded-full"
                            style={{
                              width: `${Math.min(100, (resource.memoryUsage / resource.memoryRequest) * 100)}%`,
                              background: 'var(--accent-secondary)'
                            }}
                          />
                        </div>
                        <span class="text-xs" style={{ color: 'var(--text-muted)' }}>
                          {((resource.memoryUsage / resource.memoryRequest) * 100).toFixed(1)}%
                        </span>
                      </div>
                    </td>
                    <td class="font-bold" style={{ color: 'var(--success-color)' }}>
                      {formatCurrency(resource.wastedCost)}
                    </td>
                  </tr>
                )}
              </For>
            </tbody>
          </table>
        </div>
      </Show>
    </div>
  );
};

export default Cost;
