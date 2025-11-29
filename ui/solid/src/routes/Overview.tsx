import { Component, Show, For, createMemo } from 'solid-js';
import { clusterStatus, podsResource, deploymentsResource, servicesResource, nodesResource } from '../stores/cluster';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: string;
  color: string;
  subtext?: string;
}

const StatCard: Component<StatCardProps> = (props) => (
  <div class="card card-hover p-6">
    <div class="flex items-start justify-between">
      <div>
        <p class="text-gray-400 text-sm font-medium uppercase tracking-wide">{props.title}</p>
        <p class={`text-4xl font-bold mt-3 ${props.color}`}>{props.value}</p>
        {props.subtext && <p class="text-gray-500 text-sm mt-2">{props.subtext}</p>}
      </div>
      <div class={`p-4 rounded-xl ${props.color.replace('text-', 'bg-').replace('-400', '-500/20')}`}>
        <svg class={`w-7 h-7 ${props.color}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={props.icon} />
        </svg>
      </div>
    </div>
  </div>
);

const Overview: Component = () => {
  const pods = createMemo(() => podsResource() || []);
  const deployments = createMemo(() => deploymentsResource() || []);
  const services = createMemo(() => servicesResource() || []);
  const nodes = createMemo(() => nodesResource() || []);

  const runningPods = createMemo(() => pods().filter(p => p.status === 'Running').length);
  const pendingPods = createMemo(() => pods().filter(p => p.status === 'Pending').length);
  const failedPods = createMemo(() => pods().filter(p => p.status === 'Failed' || p.status === 'Error').length);

  return (
    <div class="space-y-6">
      {/* Page header */}
      <div>
        <h1 class="text-2xl font-bold text-white">Cluster Overview</h1>
        <p class="text-gray-400 mt-1">
          {clusterStatus().context || 'No cluster connected'}
        </p>
      </div>

      {/* Stats grid */}
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Pods"
          value={pods().length}
          icon="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
          color="text-cyan-400"
          subtext={`${runningPods()} running`}
        />
        <StatCard
          title="Deployments"
          value={deployments().length}
          icon="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
          color="text-blue-400"
        />
        <StatCard
          title="Services"
          value={services().length}
          icon="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
          color="text-violet-400"
        />
        <StatCard
          title="Nodes"
          value={nodes().length}
          icon="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01"
          color="text-emerald-400"
        />
      </div>

      {/* Pod status breakdown */}
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pod Health */}
        <div class="card p-6">
          <h2 class="text-lg font-semibold text-white mb-4">Pod Health</h2>
          <div class="space-y-4">
            <div class="flex items-center justify-between">
              <span class="text-gray-400">Running</span>
              <div class="flex items-center gap-2">
                <div class="w-32 h-2 bg-k8s-dark rounded-full overflow-hidden">
                  <div
                    class="h-full bg-green-500 rounded-full transition-all duration-500"
                    style={{ width: `${pods().length > 0 ? (runningPods() / pods().length) * 100 : 0}%` }}
                  ></div>
                </div>
                <span class="text-green-400 font-medium w-12 text-right">{runningPods()}</span>
              </div>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-gray-400">Pending</span>
              <div class="flex items-center gap-2">
                <div class="w-32 h-2 bg-k8s-dark rounded-full overflow-hidden">
                  <div
                    class="h-full bg-yellow-500 rounded-full transition-all duration-500"
                    style={{ width: `${pods().length > 0 ? (pendingPods() / pods().length) * 100 : 0}%` }}
                  ></div>
                </div>
                <span class="text-yellow-400 font-medium w-12 text-right">{pendingPods()}</span>
              </div>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-gray-400">Failed</span>
              <div class="flex items-center gap-2">
                <div class="w-32 h-2 bg-k8s-dark rounded-full overflow-hidden">
                  <div
                    class="h-full bg-red-500 rounded-full transition-all duration-500"
                    style={{ width: `${pods().length > 0 ? (failedPods() / pods().length) * 100 : 0}%` }}
                  ></div>
                </div>
                <span class="text-red-400 font-medium w-12 text-right">{failedPods()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Events / Nodes */}
        <div class="card p-6">
          <h2 class="text-lg font-semibold text-white mb-4">Node Status</h2>
          <Show when={!nodesResource.loading} fallback={<div class="text-gray-500">Loading...</div>}>
            <div class="space-y-3">
              <For each={nodes().slice(0, 5)}>
                {(node) => (
                  <div class="flex items-center justify-between p-3 bg-k8s-dark rounded-lg">
                    <div class="flex items-center gap-3">
                      <span class={`w-2 h-2 rounded-full ${node.status === 'Ready' ? 'bg-green-500' : 'bg-red-500'}`}></span>
                      <span class="text-white font-medium">{node.name}</span>
                    </div>
                    <div class="flex items-center gap-4 text-sm text-gray-400">
                      <span>{node.roles}</span>
                      <span>{node.version}</span>
                    </div>
                  </div>
                )}
              </For>
            </div>
          </Show>
        </div>
      </div>

      {/* Recent Pods */}
      <div class="card p-6">
        <h2 class="text-lg font-semibold text-white mb-4">Recent Pods</h2>
        <Show when={!podsResource.loading} fallback={<div class="text-gray-500">Loading...</div>}>
          <div class="overflow-x-auto">
            <table class="w-full">
              <thead>
                <tr class="text-left text-gray-400 text-sm border-b border-k8s-border">
                  <th class="pb-3 font-medium">Name</th>
                  <th class="pb-3 font-medium">Namespace</th>
                  <th class="pb-3 font-medium">Status</th>
                  <th class="pb-3 font-medium">Ready</th>
                  <th class="pb-3 font-medium">Age</th>
                </tr>
              </thead>
              <tbody>
                <For each={pods().slice(0, 10)}>
                  {(pod) => (
                    <tr class="border-b border-k8s-border/50 hover:bg-k8s-dark/50 transition-colors">
                      <td class="py-3 text-white">{pod.name}</td>
                      <td class="py-3 text-gray-400">{pod.namespace}</td>
                      <td class="py-3">
                        <span class={`px-2 py-1 rounded text-xs font-medium ${
                          pod.status === 'Running' ? 'bg-green-500/20 text-green-400' :
                          pod.status === 'Pending' ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-red-500/20 text-red-400'
                        }`}>
                          {pod.status}
                        </span>
                      </td>
                      <td class="py-3 text-gray-400">{pod.ready}</td>
                      <td class="py-3 text-gray-400">{pod.age}</td>
                    </tr>
                  )}
                </For>
              </tbody>
            </table>
          </div>
        </Show>
      </div>
    </div>
  );
};

export default Overview;
