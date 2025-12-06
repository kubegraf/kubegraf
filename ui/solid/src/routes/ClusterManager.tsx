import { Component, For, Show, createMemo, createSignal, onMount } from 'solid-js';
import {
  clusters,
  discoveredClusters,
  runtimeContexts,
  clusterManagerStatus,
  clusterLoading,
  refreshClusterData,
  connectToCluster,
  disconnectActiveCluster,
  setDefaultCluster,
} from '../stores/clusterManager';
import { switchContext } from '../stores/cluster';
import { addNotification } from '../stores/ui';

const providerOptions = [
  { id: 'generic', label: 'Generic / Other' },
  { id: 'gke', label: 'Google Kubernetes Engine (GKE)' },
  { id: 'eks', label: 'Amazon EKS' },
  { id: 'aks', label: 'Azure AKS' },
  { id: 'kind', label: 'kind (local)' },
  { id: 'minikube', label: 'Minikube' },
  { id: 'k3s', label: 'K3s / K3d' },
  { id: 'docker-desktop', label: 'Docker Desktop' },
];

const ClusterManager: Component = () => {
  const [manualPath, setManualPath] = createSignal('');
  const [manualName, setManualName] = createSignal('');
  const [manualProvider, setManualProvider] = createSignal('generic');

  onMount(() => {
    refreshClusterData();
  });

  const hasActiveCluster = createMemo(() => Boolean(clusterManagerStatus()?.connected));

  const handleSwitchContext = async (contextName: string) => {
    try {
      await switchContext(contextName);
      addNotification(`Switched to ${contextName}`, 'success');
      refreshClusterData();
    } catch (err: any) {
      console.error('Failed to switch context', err);
      addNotification(err?.message || `Failed to switch to ${contextName}`, 'error');
    }
  };

  const connectManual = async () => {
    if (!manualPath().trim()) {
      return;
    }
    await connectToCluster({
      name: manualName() || undefined,
      provider: manualProvider(),
      kubeconfigPath: manualPath(),
    });
    setManualPath('');
    setManualName('');
  };

  const guideCards = [
    {
      title: 'Auto-detect kubeconfig',
      description: 'Scan common locations (~/.kube, $KUBECONFIG) and reused files.',
      action: () => refreshClusterData(),
      button: 'Run auto-detect',
    },
    {
      title: 'Connect to GKE',
      description: 'Use `gcloud container clusters get-credentials` to generate kubeconfig, then auto-detect.',
      link: 'https://cloud.google.com/kubernetes-engine/docs/how-to/cluster-access-for-kubectl',
      button: 'Open GKE guide',
    },
    {
      title: 'Connect to EKS',
      description: 'Run `aws eks update-kubeconfig --name <cluster>` and auto-detect the generated kubeconfig.',
      link: 'https://docs.aws.amazon.com/eks/latest/userguide/create-kubeconfig.html',
      button: 'Open EKS guide',
    },
    {
      title: 'Connect to AKS',
      description: 'Use `az aks get-credentials --name <cluster> --resource-group <rg>` to pull credentials.',
      link: 'https://learn.microsoft.com/azure/aks/learn/quick-kubernetes-deploy-portal',
      button: 'Open AKS guide',
    },
    {
      title: 'Import manually',
      description: 'Paste the kubeconfig path from any location and connect instantly.',
      action: connectManual,
      button: 'Connect from path',
      primary: true,
    },
  ];

  return (
    <div class="space-y-6">
      <div class="flex flex-col gap-2">
        <div class="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 class="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>Cluster Manager</h1>
            <p class="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Discover, connect, and manage every Kubernetes cluster from one place.
            </p>
          </div>
          <div class="flex items-center gap-3">
            <div
              class={`px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-2 ${hasActiveCluster() ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}
            >
              <span class={`w-2 h-2 rounded-full ${hasActiveCluster() ? 'bg-emerald-400' : 'bg-red-400'}`}></span>
              {hasActiveCluster() ? 'Cluster Connected' : 'Cluster Disconnected'}
            </div>
            <button
              class="px-3 py-1.5 rounded-md text-sm"
              style={{ border: '1px solid var(--border-color)' }}
              disabled={clusterLoading()}
              onClick={() => refreshClusterData()}
            >
              Auto-detect
            </button>
            <Show when={hasActiveCluster()}>
              <button
                class="px-3 py-1.5 rounded-md text-sm text-white"
                style={{ background: 'var(--error-color)' }}
                disabled={clusterLoading()}
                onClick={() => disconnectActiveCluster()}
              >
                Disconnect
              </button>
            </Show>
          </div>
        </div>
      </div>

      <Show when={!hasActiveCluster()}>
        <div class="grid gap-4 lg:grid-cols-2">
          <For each={guideCards}>
            {(card) => (
              <div class="p-4 rounded-xl border" style={{ border: '1px solid var(--border-color)', background: 'var(--bg-card)' }}>
                <h3 class="text-base font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>{card.title}</h3>
                <p class="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>{card.description}</p>
                <button
                  class={`px-3 py-1.5 rounded-md text-sm ${card.primary ? 'text-white' : ''}`}
                  style={{ background: card.primary ? 'var(--accent-primary)' : 'var(--bg-tertiary)', color: card.primary ? '#000' : 'var(--text-primary)' }}
                  onClick={() => {
                    if (card.link) {
                      window.open(card.link, '_blank', 'noopener');
                    } else if (card.action) {
                      card.action();
                    }
                  }}
                >
                  {card.button}
                </button>
              </div>
            )}
          </For>
        </div>
      </Show>

      <div class="grid gap-6 lg:grid-cols-2">
        <div class="p-4 rounded-xl border" style={{ border: '1px solid var(--border-color)', background: 'var(--bg-card)' }}>
          <div class="flex items-center justify-between mb-4">
            <div>
              <h2 class="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Connected Clusters</h2>
              <p class="text-sm" style={{ color: 'var(--text-secondary)' }}>Track every cluster KubeGraf knows about.</p>
            </div>
          </div>

          <Show when={clusters().length > 0} fallback={<p class="text-sm" style={{ color: 'var(--text-muted)' }}>No clusters saved yet.</p>}>
            <div class="space-y-3">
              <For each={clusters()}>
                {(cluster) => (
                  <div class="p-3 rounded-lg border flex flex-col gap-2" style={{ border: '1px solid var(--border-color)', background: 'var(--bg-secondary)' }}>
                    <div class="flex items-center justify-between">
                      <div>
                        <div class="flex items-center gap-2">
                          <span class="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>{cluster.name}</span>
                          <Show when={cluster.isDefault}>
                            <span class="px-2 py-0.5 text-xs rounded-full" style={{ background: 'rgba(59,130,246,0.15)', color: '#3b82f6' }}>Default</span>
                          </Show>
                        </div>
                        <p class="text-xs" style={{ color: 'var(--text-muted)' }}>{cluster.provider} • {cluster.kubeconfigPath}</p>
                      </div>
                      <div class="flex items-center gap-2">
                        <span class={`w-2 h-2 rounded-full ${cluster.connected ? 'bg-emerald-400' : 'bg-gray-500'}`}></span>
                        <span class="text-xs" style={{ color: 'var(--text-secondary)' }}>{cluster.connected ? 'Connected' : 'Disconnected'}</span>
                      </div>
                    </div>
                    <div class="flex flex-wrap gap-2">
                      <button
                        class="px-3 py-1.5 text-sm rounded-md"
                        style={{ background: 'var(--accent-primary)', color: '#000' }}
                        disabled={cluster.connected || clusterLoading()}
                        onClick={() => connectToCluster({ name: cluster.name, provider: cluster.provider, kubeconfigPath: cluster.kubeconfigPath })}
                      >
                        Connect
                      </button>
                      <button
                        class="px-3 py-1.5 text-sm rounded-md"
                        style={{ border: '1px solid var(--border-color)' }}
                        disabled={!cluster.connected || clusterLoading()}
                        onClick={() => disconnectActiveCluster()}
                      >
                        Disconnect
                      </button>
                      <button
                        class="px-3 py-1.5 text-sm rounded-md"
                        style={{ border: '1px solid var(--border-color)' }}
                        disabled={cluster.isDefault || clusterLoading()}
                        onClick={() => setDefaultCluster(cluster)}
                      >
                        Set Default
                      </button>
                    </div>
                  </div>
                )}
              </For>
            </div>
          </Show>

          <div class="mt-6 border-t pt-4" style={{ borderColor: 'var(--border-color)' }}>
            <div class="flex items-center justify-between mb-3">
              <div>
                <h3 class="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Runtime kubeconfig contexts</h3>
                <p class="text-xs" style={{ color: 'var(--text-secondary)' }}>Direct view of every context available in your local kubeconfig.</p>
              </div>
              <button
                class="px-3 py-1 text-xs rounded-md"
                style={{ border: '1px solid var(--border-color)' }}
                onClick={() => refreshClusterData()}
                disabled={clusterLoading()}
              >
                Refresh
              </button>
            </div>
            <Show when={runtimeContexts().length > 0} fallback={<p class="text-sm" style={{ color: 'var(--text-muted)' }}>No contexts detected. Import a kubeconfig to get started.</p>}>
              <div class="space-y-2 max-h-64 overflow-y-auto pr-1">
                <For each={runtimeContexts()}>
                  {(ctx) => (
                    <div class="p-3 rounded-lg border flex items-center justify-between gap-3" style={{ border: '1px solid var(--border-color)', background: 'var(--bg-tertiary)' }}>
                      <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-2 flex-wrap">
                          <p class="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{ctx.name}</p>
                          <Show when={ctx.current}>
                            <span class="px-2 py-0.5 text-xs rounded-full" style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981' }}>Active</span>
                          </Show>
                        </div>
                        <p class="text-xs" style={{ color: 'var(--text-secondary)' }}>
                          Provider: {ctx.provider || 'generic'} • {ctx.serverVersion ? `Kubernetes ${ctx.serverVersion}` : 'version unknown'}
                        </p>
                        <p class="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{ctx.kubeconfigPath}</p>
                        <Show when={ctx.error}>
                          <p class="text-xs mt-1" style={{ color: 'var(--error-color)' }}>{ctx.error}</p>
                        </Show>
                      </div>
                      <div class="flex flex-col items-end gap-2">
                        <div class="flex items-center gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
                          <span class={`w-2 h-2 rounded-full ${ctx.connected ? 'bg-emerald-400' : 'bg-red-500'}`}></span>
                          {ctx.connected ? 'Reachable' : 'Unavailable'}
                        </div>
                        <button
                          class="px-3 py-1.5 text-sm rounded-md"
                          style={{ border: '1px solid var(--border-color)', background: ctx.current ? 'var(--bg-secondary)' : 'var(--bg-card)' }}
                          disabled={ctx.current || clusterLoading()}
                          onClick={() => handleSwitchContext(ctx.name)}
                        >
                          Switch
                        </button>
                      </div>
                    </div>
                  )}
                </For>
              </div>
            </Show>
          </div>
        </div>

        <div class="p-4 rounded-xl border" style={{ border: '1px solid var(--border-color)', background: 'var(--bg-card)' }}>
          <div class="flex items-center justify-between mb-4">
            <div>
              <h2 class="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Auto-detected kubeconfigs</h2>
              <p class="text-sm" style={{ color: 'var(--text-secondary)' }}>One click connect to any discovered file.</p>
            </div>
          </div>

          <Show when={discoveredClusters().length > 0} fallback={<p class="text-sm" style={{ color: 'var(--text-muted)' }}>Nothing detected yet. Try running auto-detect.</p>}>
            <div class="space-y-3 max-h-80 overflow-y-auto pr-1">
              <For each={discoveredClusters()}>
                {(item) => (
                  <div class="p-3 rounded-lg border flex items-center justify-between gap-3" style={{ border: '1px solid var(--border-color)' }}>
                    <div>
                      <p class="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{item.name}</p>
                      <p class="text-xs" style={{ color: 'var(--text-muted)' }}>{item.path}</p>
                      <p class="text-xs" style={{ color: 'var(--text-secondary)' }}>Contexts: {item.contexts.join(', ')}</p>
                    </div>
                    <button
                      class="px-3 py-1.5 text-sm rounded-md"
                      style={{ background: 'var(--accent-primary)', color: '#000' }}
                      disabled={clusterLoading()}
                      onClick={() => connectToCluster({ name: item.name, provider: item.provider, kubeconfigPath: item.path })}
                    >
                      Connect
                    </button>
                  </div>
                )}
              </For>
            </div>
          </Show>

          <div class="mt-5 border-t pt-4" style={{ borderColor: 'var(--border-color)' }}>
            <h3 class="text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Manual import</h3>
            <div class="space-y-2">
              <input
                type="text"
                placeholder="Cluster name (optional)"
                value={manualName()}
                onInput={(e) => setManualName(e.currentTarget.value)}
                class="w-full px-3 py-2 rounded-md text-sm"
              />
              <input
                type="text"
                placeholder="/path/to/kubeconfig"
                value={manualPath()}
                onInput={(e) => setManualPath(e.currentTarget.value)}
                class="w-full px-3 py-2 rounded-md text-sm"
              />
              <select
                class="w-full px-3 py-2 rounded-md text-sm"
                value={manualProvider()}
                onInput={(e) => setManualProvider(e.currentTarget.value)}
              >
                <For each={providerOptions}>{(option) => <option value={option.id}>{option.label}</option>}</For>
              </select>
              <button
                class="w-full px-3 py-2 rounded-md text-sm text-white"
                style={{ background: 'var(--accent-primary)' }}
                disabled={!manualPath().trim() || clusterLoading()}
                onClick={connectManual}
              >
                Connect cluster
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClusterManager;
