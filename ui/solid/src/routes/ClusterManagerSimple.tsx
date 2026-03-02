import { Component, For, Show, createMemo, createSignal, onMount } from 'solid-js';
import { clusterSimpleStore } from '../stores/clusterSimple';
import { addNotification, setCurrentView } from '../stores/ui';

const ClusterManagerSimple: Component = () => {
  onMount(() => {
    // Initial load of clusters
    clusterSimpleStore.refetchClusters();

    // Check health of all clusters after a short delay
    setTimeout(() => {
      clusterSimpleStore.checkAllClustersHealth();
    }, 1000);
  });

  const clusters = clusterSimpleStore.clusters;
  const currentCluster = clusterSimpleStore.currentCluster;
  const loading = clusterSimpleStore.isLoading;
  const error = clusterSimpleStore.getError;
  const [switchingContext, setSwitchingContext] = createSignal<string | null>(null);

  // Get reachable clusters
  const reachableClusters = createMemo(() => {
    return clusters().filter((c) => c.isReachable);
  });

  // Get unreachable clusters
  const unreachableClusters = createMemo(() => {
    return clusters().filter((c) => !c.isReachable);
  });

  const handleSwitchCluster = async (contextName: string) => {
    setSwitchingContext(contextName);
    try {
      await clusterSimpleStore.switchCluster(contextName);
      addNotification(`Switched to cluster: ${contextName}`, 'success');
      // Redirect to dashboard after successful switch
      setCurrentView('dashboard');
    } catch (err: any) {
      addNotification(err?.message || 'Failed to switch cluster', 'error');
    } finally {
      setSwitchingContext(null);
    }
  };

  const handleRefresh = async () => {
    try {
      await clusterSimpleStore.refreshClusters();
      addNotification('Clusters refreshed', 'success');
    } catch (err: any) {
      addNotification(err?.message || 'Failed to refresh clusters', 'error');
    }
  };

  return (
    <div class="space-y-6" style={{ background: 'var(--bg-primary)' }}>
      <div class="flex flex-col gap-2">
        <div class="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 class="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>Cluster Manager</h1>
            <p class="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Discover, connect, and manage every Kubernetes cluster from one place.
            </p>
          </div>
          <div class="flex flex-col items-end gap-1">
            <button
              class="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
              style={{
                background: loading() ? 'var(--bg-tertiary)' : 'var(--accent-primary)',
                color: loading() ? 'var(--text-muted)' : '#000',
                border: '1px solid transparent',
                opacity: loading() ? '0.6' : '1',
                'box-shadow': loading() ? 'none' : '0 0 0 2px rgba(6,182,212,0.25)',
              }}
              disabled={loading()}
              onClick={handleRefresh}
            >
              <svg
                class={loading() ? 'animate-spin' : ''}
                style={{ width: '15px', height: '15px', 'flex-shrink': '0' }}
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {loading() ? 'Refreshing...' : 'Refresh'}
            </button>
            <span class="text-xs" style={{ color: 'var(--text-muted)' }}>
              Click to pick up new clusters from ~/.kube/config
            </span>
          </div>
        </div>
      </div>

      {/* Loading state */}
      <Show when={loading()}>
        <div class="flex items-center justify-center p-8">
          <div class="text-sm" style={{ color: 'var(--text-muted)' }}>
            Loading clusters...
          </div>
        </div>
      </Show>

      {/* Error state */}
      <Show when={error()}>
        <div class="p-4 rounded-lg" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--error-color)' }}>
          <p class="text-sm" style={{ color: 'var(--error-color)' }}>{error()}</p>
        </div>
      </Show>

      {/* Show when no clusters found */}
      <Show when={!loading() && clusters().length === 0}>
        <div class="flex items-center justify-center min-h-[60vh] p-8">
          <div class="max-w-3xl w-full">
            <div class="text-center mb-8">
              <div class="w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center" style={{ background: 'rgba(6, 182, 212, 0.15)' }}>
                <svg class="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--accent-primary)' }}>
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
              </div>
              <h2 class="text-3xl font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
                No Clusters Found
              </h2>
              <p class="text-base mb-8" style={{ color: 'var(--text-secondary)' }}>
                Ensure your kubeconfig file is properly configured at ~/.kube/config
              </p>
            </div>
          </div>
        </div>
      </Show>

      {/* Simple Cluster Manager - Show clusters */}
      <div class="mt-8 p-6 rounded-xl border" style={{ border: '1px solid var(--border-color)', background: 'var(--bg-card)' }}>
        <div class="flex items-center justify-between mb-4">
          <div>
            <h2 class="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Clusters</h2>
            <p class="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Available clusters from kubeconfig
            </p>
          </div>
        </div>

        {/* Reachable clusters */}
        <Show when={reachableClusters().length > 0}>
          <div class="mb-6">
            <h3 class="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Reachable Clusters</h3>
            <div class="space-y-1.5">
              <For each={reachableClusters()}>
                {(cluster) => (
                  <div
                    class="p-3 rounded-lg border flex items-center justify-between gap-3"
                    style={{
                      border: '1px solid var(--border-color)',
                      background: cluster.isActive ? 'rgba(16, 185, 129, 0.05)' : 'var(--bg-card)'
                    }}
                  >
                    <div class="flex items-center gap-3">
                      <span class="w-2 h-2 rounded-full" style={{ background: 'var(--success-color)' }}></span>
                      <span class="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{cluster.name}</span>
                      <Show when={cluster.isActive}>
                        <span
                          class="px-1.5 py-0.5 text-xs rounded-full"
                          style={{
                            background: 'rgba(16, 185, 129, 0.15)',
                            color: 'var(--success-color)'
                          }}
                        >
                          Active
                        </span>
                      </Show>
                    </div>
                    <Show when={cluster.isActive} fallback={
                      <button
                        class="px-3 py-1.5 text-sm rounded-md transition-all"
                        style={{
                          background: 'var(--accent-primary)',
                          color: '#000',
                          opacity: switchingContext() === cluster.contextName ? '0.7' : '1',
                        }}
                        disabled={switchingContext() !== null}
                        onClick={() => handleSwitchCluster(cluster.contextName)}
                      >
                        {switchingContext() === cluster.contextName ? 'Switching...' : 'Select'}
                      </button>
                    }>
                      <button
                        class="px-3 py-1.5 text-sm rounded-md transition-all"
                        style={{
                          background: 'var(--success-color)',
                          color: '#000'
                        }}
                        onClick={() => setCurrentView('dashboard')}
                      >
                        Go to Dashboard
                      </button>
                    </Show>
                  </div>
                )}
              </For>
            </div>
          </div>
        </Show>

        {/* Unreachable clusters */}
        <Show when={unreachableClusters().length > 0}>
          <div>
            <h3 class="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Unreachable Clusters</h3>
            <div class="space-y-1.5 mb-4">
              <For each={unreachableClusters()}>
                {(cluster) => (
                  <div
                    class="p-3 rounded-lg border flex items-center justify-between gap-3"
                    style={{
                      border: '1px solid var(--border-color)',
                      background: cluster.isActive ? 'rgba(16, 185, 129, 0.05)' : 'var(--bg-card)'
                    }}
                    title={cluster.error || 'Unreachable'}
                  >
                    <div class="flex items-center gap-3">
                      <span class="w-2 h-2 rounded-full" style={{ background: 'var(--error-color)' }}></span>
                      <span class="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{cluster.name}</span>
                      <Show when={cluster.error}>
                        <span class="text-xs" style={{ color: 'var(--error-color)' }}>
                          {cluster.error}
                        </span>
                      </Show>
                    </div>
                    <Show when={!cluster.isActive}>
                      <button
                        class="px-3 py-1.5 text-sm rounded-md transition-all"
                        style={{
                          background: 'var(--bg-tertiary)',
                          color: 'var(--text-primary)',
                          border: '1px solid var(--border-color)'
                        }}
                        onClick={() => handleSwitchCluster(cluster.contextName)}
                        disabled
                        title={cluster.error || 'Cluster unreachable'}
                      >
                        Unreachable
                      </button>
                    </Show>
                  </div>
                )}
              </For>
            </div>

            {/* Helpful instructions for unreachable clusters */}
            <div class="p-4 rounded-lg" style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
              <div class="flex gap-3">
                <svg class="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'rgba(59, 130, 246, 1)' }}>
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div class="flex-1">
                  <h4 class="text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Troubleshooting Unreachable Clusters</h4>
                  <ul class="text-xs space-y-1.5" style={{ color: 'var(--text-secondary)' }}>
                    <li class="flex items-start gap-2">
                      <span class="font-semibold">•</span>
                      <span><strong>VPN:</strong> Check if your VPN connection is active for cloud clusters</span>
                    </li>
                    <li class="flex items-start gap-2">
                      <span class="font-semibold">•</span>
                      <span><strong>Credentials:</strong> Run <code class="px-1 py-0.5 rounded" style={{ background: 'var(--bg-tertiary)', 'font-family': 'monospace' }}>kubectl get nodes --context=CONTEXT_NAME</code> to test</span>
                    </li>
                    <li class="flex items-start gap-2">
                      <span class="font-semibold">•</span>
                      <span><strong>Cluster Status:</strong> Verify the cluster is running and accessible</span>
                    </li>
                    <li class="flex items-start gap-2">
                      <span class="font-semibold">•</span>
                      <span><strong>Update Kubeconfig:</strong> Refresh credentials with your cloud provider CLI (gcloud, aws, az)</span>
                    </li>
                    <li class="flex items-start gap-2">
                      <span class="font-semibold">•</span>
                      <span><strong>Remove:</strong> Delete old cluster contexts from ~/.kube/config if no longer needed</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </Show>
      </div>

      {/* Current cluster info */}
      <Show when={currentCluster()}>
        <div class="p-4 rounded-lg mt-6" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
          <h3 class="text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Current Cluster</h3>
          <div class="text-sm space-y-1">
            <div style={{ color: 'var(--text-primary)' }}>
              <strong>{currentCluster()?.name}</strong>
            </div>
            <div style={{ color: 'var(--text-secondary)' }}>
              Context: {currentCluster()?.contextName}
            </div>
            <div style={{ color: 'var(--text-secondary)' }}>
              Kubeconfig: {currentCluster()?.kubeconfigPath}
            </div>
            <Show when={currentCluster()?.error}>
              <div style={{ color: 'var(--error-color)' }}>
                Error: {currentCluster()?.error}
              </div>
            </Show>
          </div>
        </div>
      </Show>
    </div>
  );
};

export default ClusterManagerSimple;
