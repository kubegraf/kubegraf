import { Component, For, Show, createMemo, createSignal, onMount } from 'solid-js';
import {
  clusters,
  discoveredClusters,
  runtimeContexts,
  clusterManagerStatus,
  clusterLoading,
  refreshClusterData,
  refreshClusterStatus,
  connectToCluster,
  disconnectActiveCluster,
  setDefaultCluster,
} from '../stores/clusterManager';
import { switchContext, clusterStatus } from '../stores/cluster';
import { addNotification, setCurrentView } from '../stores/ui';

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
    // Refresh both cluster data and status to ensure accurate connection state
    refreshClusterData();
    // Also refresh cluster status to sync with header
    refreshClusterStatus();
  });

  // Use same logic as header: check clusterManagerStatus first, then fallback to clusterStatus
  const hasActiveCluster = createMemo(() => {
    const managerStatus = clusterManagerStatus()?.connected;
    const status = clusterStatus().connected;
    return Boolean(managerStatus ?? status);
  });

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
              class="px-3 py-1.5 rounded-md text-sm flex items-center gap-2"
              style={{ background: '#22c55e', color: '#000' }}
              onClick={() => {
                sessionStorage.setItem('kubegraf-auto-filter', 'Local Cluster');
                sessionStorage.setItem('kubegraf-default-tab', 'marketplace');
                setCurrentView('apps');
              }}
              title="Install k3d, kind, or minikube for local Kubernetes (works offline)"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              Marketplace
            </button>
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
                class="px-3 py-1.5 rounded-md text-sm"
                style={{ background: 'var(--error-color)', color: '#fff' }}
                disabled={clusterLoading()}
                onClick={() => disconnectActiveCluster()}
              >
                Disconnect
              </button>
            </Show>
          </div>
        </div>
      </div>

      {/* Show "Choose your cluster" message when kubeconfig files are found */}
      <Show when={!hasActiveCluster() && (discoveredClusters().length > 0 || clusters().length > 0)}>
        <div class="p-6 rounded-xl border mb-6" style={{ 
          border: '1px solid var(--border-color)', 
          background: 'var(--bg-card)',
          'border-left': '4px solid var(--accent-primary)'
        }}>
          <div class="flex items-start gap-4">
            <div class="flex-shrink-0">
              <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--accent-primary)' }}>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div class="flex-1">
              <h2 class="text-xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                Choose your cluster to connect
              </h2>
              <p class="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
                {discoveredClusters().length > 0 && clusters().length > 0
                  ? `Found ${discoveredClusters().length} discovered kubeconfig${discoveredClusters().length > 1 ? 's' : ''} and ${clusters().length} saved cluster${clusters().length > 1 ? 's' : ''}. Select one below to connect.`
                  : discoveredClusters().length > 0
                  ? `Found ${discoveredClusters().length} kubeconfig${discoveredClusters().length > 1 ? 's' : ''}. Select one below to connect.`
                  : `You have ${clusters().length} saved cluster${clusters().length > 1 ? 's' : ''}. Select one below to connect.`}
              </p>
            </div>
          </div>
        </div>
      </Show>

      {/* Show ConnectionOverlay-style content when NO kubeconfig files are found */}
      <Show when={!hasActiveCluster() && discoveredClusters().length === 0 && clusters().length === 0 && !clusterLoading()}>
        <div class="flex items-center justify-center min-h-[60vh] p-8">
          <div class="max-w-3xl w-full">
            <div class="text-center mb-8">
              <div class="w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center" style={{ background: 'rgba(6, 182, 212, 0.15)' }}>
                <svg class="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--accent-primary)' }}>
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
              </div>
              <h2 class="text-3xl font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
                No Cluster Connected
              </h2>
              <p class="text-base mb-8" style={{ color: 'var(--text-secondary)' }}>
                Connect to an existing Kubernetes cluster or create a local one to get started
              </p>
            </div>

            {/* Two options: Connect or Create */}
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {/* Option 1: Connect via kubeconfig */}
              <div class="card p-6 hover:border-cyan-500/50 transition-all cursor-pointer" style={{ border: '2px solid var(--border-color)' }}
                onClick={() => {
                  // Show instructions for connecting via kubeconfig
                  alert('To connect to an existing cluster:\n\n1. Ensure your kubeconfig is set up (~/.kube/config)\n2. Verify access: kubectl cluster-info\n3. Click "Auto-detect" button above or refresh the page\n\nKubeGraf will automatically detect and connect to your cluster.');
                }}
              >
                <div class="flex items-center gap-3 mb-4">
                  <div class="w-12 h-12 rounded-lg flex items-center justify-center" style={{ background: 'rgba(6, 182, 212, 0.1)' }}>
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--accent-primary)' }}>
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                  </div>
                  <h3 class="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                    Connect via kubeconfig
                  </h3>
                </div>
                <p class="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
                  Connect to an existing Kubernetes cluster using your kubeconfig file
                </p>
                <ul class="text-xs space-y-2 mb-4" style={{ color: 'var(--text-muted)' }}>
                  <li class="flex items-start gap-2">
                    <span class="mt-1">•</span>
                    <span>Ensure kubeconfig is at <code class="px-1 py-0.5 rounded" style={{ background: 'var(--bg-tertiary)' }}>~/.kube/config</code></span>
                  </li>
                  <li class="flex items-start gap-2">
                    <span class="mt-1">•</span>
                    <span>Verify with: <code class="px-1 py-0.5 rounded" style={{ background: 'var(--bg-tertiary)' }}>kubectl cluster-info</code></span>
                  </li>
                  <li class="flex items-start gap-2">
                    <span class="mt-1">•</span>
                    <span>Click "Retry Connection" below</span>
                  </li>
                </ul>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    refreshClusterData();
                  }}
                  class="w-full px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 relative overflow-hidden"
                  style={{ 
                    background: 'var(--accent-primary)', 
                    color: '#000',
                  }}
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Retry Connection
                </button>
              </div>

              {/* Option 2: Create local cluster */}
              <div class="card p-6 hover:border-cyan-500/50 transition-all cursor-pointer" style={{ border: '2px solid var(--border-color)' }}
                onClick={() => {
                  setCurrentView('apps');
                  sessionStorage.setItem('kubegraf-auto-filter', 'Local Cluster');
                }}
              >
                <div class="flex items-center gap-3 mb-4">
                  <div class="w-12 h-12 rounded-lg flex items-center justify-center" style={{ background: 'rgba(34, 197, 94, 0.1)' }}>
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#22c55e' }}>
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </div>
                  <h3 class="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                    Create Local Cluster
                  </h3>
                </div>
                <p class="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
                  Set up a local Kubernetes cluster using k3d, kind, or minikube
                </p>
                <ul class="text-xs space-y-2 mb-4" style={{ color: 'var(--text-muted)' }}>
                  <li class="flex items-start gap-2">
                    <span class="mt-1">•</span>
                    <span>Requires Docker Desktop installed and running</span>
                  </li>
                  <li class="flex items-start gap-2">
                    <span class="mt-1">•</span>
                    <span>Choose from k3d, kind, or minikube</span>
                  </li>
                  <li class="flex items-start gap-2">
                    <span class="mt-1">•</span>
                    <span>Automatically connects after creation</span>
                  </li>
                </ul>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    sessionStorage.setItem('kubegraf-auto-filter', 'Local Cluster');
                    sessionStorage.setItem('kubegraf-default-tab', 'marketplace');
                    setCurrentView('apps');
                  }}
                  class="w-full px-4 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-90 flex items-center justify-center gap-2"
                  style={{ background: '#22c55e', color: '#000' }}
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Go to Marketplace
                </button>
              </div>
            </div>
            
            <div class="flex items-center justify-center gap-3">
              <button
                onClick={() => refreshClusterData()}
                class="px-5 py-2.5 rounded-lg font-medium transition-all flex items-center gap-2"
                style={{ 
                  background: 'var(--accent-primary)', 
                  color: '#000',
                }}
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Retry Connection
              </button>
              <a
                href="https://kubegraf.io/docs"
                target="_blank"
                class="px-5 py-2.5 rounded-lg font-medium transition-all hover:opacity-90 flex items-center gap-2"
                style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                Documentation
              </a>
            </div>
          </div>
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
                        <span 
                          class="w-2 h-2 rounded-full" 
                          style={{ background: cluster.connected ? 'var(--success-color)' : 'var(--text-muted)' }}
                        ></span>
                        <span class="text-xs" style={{ color: 'var(--text-secondary)' }}>{cluster.connected ? 'Connected' : 'Disconnected'}</span>
                      </div>
                    </div>
                    <div class="flex flex-wrap gap-2">
                      <button
                        class="px-3 py-1.5 text-sm rounded-md transition-all"
                        style={{
                          background: cluster.connected || clusterLoading() ? 'var(--bg-tertiary)' : 'var(--accent-primary)',
                          color: cluster.connected || clusterLoading() ? 'var(--text-muted)' : '#000',
                          cursor: cluster.connected || clusterLoading() ? 'not-allowed' : 'pointer',
                          opacity: cluster.connected || clusterLoading() ? 0.5 : 1
                        }}
                        disabled={cluster.connected || clusterLoading()}
                        onClick={() => {
                          console.log('Connect button clicked:', cluster.name);
                          connectToCluster({ name: cluster.name, provider: cluster.provider, kubeconfigPath: cluster.kubeconfigPath });
                        }}
                      >
                        Connect
                      </button>
                      <button
                        class="px-3 py-1.5 text-sm rounded-md transition-all"
                        style={{
                          border: '1px solid var(--border-color)',
                          cursor: !cluster.connected || clusterLoading() ? 'not-allowed' : 'pointer',
                          opacity: !cluster.connected || clusterLoading() ? 0.5 : 1
                        }}
                        disabled={!cluster.connected || clusterLoading()}
                        onClick={() => disconnectActiveCluster()}
                      >
                        Disconnect
                      </button>
                      <button
                        class="px-3 py-1.5 text-sm rounded-md transition-all"
                        style={{
                          border: '1px solid var(--border-color)',
                          cursor: cluster.isDefault || clusterLoading() ? 'not-allowed' : 'pointer',
                          opacity: cluster.isDefault || clusterLoading() ? 0.5 : 1
                        }}
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
                          class="px-4 py-2 text-sm rounded-md font-semibold transition-all"
                          style={{ 
                            border: ctx.current ? '1px solid var(--border-color)' : '2px solid var(--accent-primary)', 
                            background: ctx.current 
                              ? 'var(--bg-secondary)' 
                              : 'var(--accent-primary)',
                            color: ctx.current 
                              ? 'var(--text-secondary)' 
                              : '#000000',
                            opacity: ctx.current || clusterLoading() ? 0.6 : 1,
                            cursor: ctx.current || clusterLoading() ? 'not-allowed' : 'pointer',
                            'box-shadow': ctx.current 
                              ? 'none' 
                              : '0 2px 4px rgba(6, 182, 212, 0.2)',
                            'font-weight': '600'
                          }}
                          disabled={ctx.current || clusterLoading()}
                          onClick={() => handleSwitchContext(ctx.name)}
                          onMouseEnter={(e) => {
                            if (!ctx.current && !clusterLoading()) {
                              e.currentTarget.style.background = 'var(--accent-primary)';
                              e.currentTarget.style.borderColor = 'var(--accent-primary)';
                              e.currentTarget.style.opacity = '0.9';
                              e.currentTarget.style.boxShadow = '0 4px 8px rgba(6, 182, 212, 0.3)';
                              e.currentTarget.style.transform = 'translateY(-1px)';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!ctx.current && !clusterLoading()) {
                              e.currentTarget.style.background = 'var(--accent-primary)';
                              e.currentTarget.style.borderColor = 'var(--accent-primary)';
                              e.currentTarget.style.opacity = '1';
                              e.currentTarget.style.boxShadow = '0 2px 4px rgba(6, 182, 212, 0.2)';
                              e.currentTarget.style.transform = 'translateY(0)';
                            }
                          }}
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
                      class="px-3 py-1.5 text-sm rounded-md transition-all hover:opacity-90"
                      style={{
                        background: clusterLoading() ? 'var(--bg-tertiary)' : 'var(--accent-primary)',
                        color: clusterLoading() ? 'var(--text-muted)' : '#000',
                        cursor: clusterLoading() ? 'not-allowed' : 'pointer',
                        opacity: clusterLoading() ? 0.5 : 1
                      }}
                      disabled={clusterLoading()}
                      onClick={() => {
                        console.log('Connect button clicked (discovered):', item.name, item.path);
                        connectToCluster({ name: item.name, provider: item.provider, kubeconfigPath: item.path });
                      }}
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
                style={{
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)'
                }}
              />
              <input
                type="text"
                placeholder="/path/to/kubeconfig"
                value={manualPath()}
                onInput={(e) => setManualPath(e.currentTarget.value)}
                class="w-full px-3 py-2 rounded-md text-sm"
                style={{
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)'
                }}
              />
              <select
                class="w-full px-3 py-2 rounded-md text-sm"
                value={manualProvider()}
                onInput={(e) => setManualProvider(e.currentTarget.value)}
                style={{
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)'
                }}
              >
                <For each={providerOptions}>{(option) => <option value={option.id}>{option.label}</option>}</For>
              </select>
              <button
                class="w-full px-3 py-2 rounded-md text-sm"
                style={{ background: 'var(--accent-primary)', color: '#000' }}
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
