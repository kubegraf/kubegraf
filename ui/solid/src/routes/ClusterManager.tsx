import { Component, For, Show, createMemo, onMount } from 'solid-js';
import {
  clusterManagerStatus,
  refreshClusterStatus,
  disconnectActiveCluster,
} from '../stores/clusterManager';
import {
  enhancedClusters,
  activeCluster,
  sources,
  loading as enhancedLoading,
  refreshEnhancedClusters,
  refreshSources,
  selectCluster,
  reconnectCluster,
} from '../stores/clusterEnhanced';
import { clusterStatus } from '../stores/cluster';
import { addNotification, setCurrentView } from '../stores/ui';
import AuthErrorHelper from '../components/AuthErrorHelper';
import { api } from '../services/api';

const ClusterManager: Component = () => {
  onMount(() => {
    // Refresh cluster status to sync with header
    refreshClusterStatus();
    // Refresh enhanced clusters and sources
    refreshEnhancedClusters();
    refreshSources();
  });

  // Use same logic as header: check clusterManagerStatus first, then fallback to clusterStatus
  const hasActiveCluster = createMemo(() => {
    const managerStatus = clusterManagerStatus()?.connected;
    const status = clusterStatus().connected;
    return Boolean(managerStatus ?? status);
  });

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
                // Set filter and tab preference - use category ID for consistency
                sessionStorage.setItem('kubegraf-auto-filter', 'local-cluster');
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
              class="px-3 py-1.5 rounded-md text-sm transition-colors"
              style={{ 
                border: '1px solid var(--border-color)', 
                background: 'var(--bg-tertiary)', 
                color: 'var(--text-primary)', 
                'box-shadow': '0 1px 2px rgba(0,0,0,0.08)' 
              }}
              disabled={enhancedLoading()}
              onClick={async () => {
                try {
                  await api.refreshClusterCatalog();
                  await refreshEnhancedClusters();
                  await refreshSources();
                  addNotification('Cluster catalog refreshed', 'success');
                } catch (err: any) {
                  addNotification(err?.message || 'Failed to refresh catalog', 'error');
                }
              }}
            >
              Auto-detect
            </button>
            <Show when={hasActiveCluster()}>
              <button
                class="px-3 py-1.5 rounded-md text-sm"
                style={{ background: 'var(--error-color)', color: '#fff' }}
                disabled={enhancedLoading()}
                onClick={() => disconnectActiveCluster()}
              >
                Disconnect
              </button>
            </Show>
          </div>
        </div>
      </div>

      {/* Show "Choose your cluster" message when enhanced clusters are found */}
      <Show when={!hasActiveCluster() && (enhancedClusters().length > 0 || sources().length > 0)}>
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
                {enhancedClusters().length > 0
                  ? `Found ${enhancedClusters().length} cluster${enhancedClusters().length > 1 ? 's' : ''}. Select one below to connect.`
                  : sources().length > 0
                  ? `Found ${sources().length} kubeconfig source${sources().length > 1 ? 's' : ''}. Use the Enhanced Cluster Manager below to connect.`
                  : 'Use the Enhanced Cluster Manager below to add and connect to clusters.'}
              </p>
            </div>
          </div>
        </div>
      </Show>

      {/* Show ConnectionOverlay-style content when NO enhanced clusters are found */}
      <Show when={!hasActiveCluster() && enhancedClusters().length === 0 && sources().length === 0 && !enhancedLoading()}>
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
                  const message = 'To connect to an existing cluster:\n\n1. Ensure your kubeconfig is set up (~/.kube/config)\n2. Verify access: kubectl cluster-info\n3. Click "Auto-detect" button above or refresh the page\n\nKubeGraf will automatically detect and connect to your cluster.';
                  alert(message);
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
                    refreshEnhancedClusters();
                    refreshSources();
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
                  // Set filter and tab preference - use category ID for consistency
                  sessionStorage.setItem('kubegraf-auto-filter', 'local-cluster');
                  sessionStorage.setItem('kubegraf-default-tab', 'marketplace');
                  setCurrentView('apps');
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
                    // Set filter and tab preference - use category ID for consistency
                    sessionStorage.setItem('kubegraf-auto-filter', 'local-cluster');
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
                onClick={() => {
                  refreshEnhancedClusters();
                  refreshSources();
                }}
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

      {/* Enhanced Cluster Manager - Primary view (always visible) */}
      <div class="mt-8 p-6 rounded-xl border" style={{ border: '1px solid var(--border-color)', background: 'var(--bg-card)' }}>
        <div class="flex items-center justify-between mb-4">
          <div>
            <h2 class="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Enhanced Cluster Manager</h2>
            <p class="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Clusters with health status tracking and source management
            </p>
          </div>
          <button
            class="px-3 py-1.5 text-sm rounded-md transition-colors"
            style={{ 
              border: '1px solid var(--border-color)', 
              background: 'var(--bg-tertiary)', 
              color: 'var(--text-primary)', 
            }}
            onClick={() => {
              refreshEnhancedClusters();
              refreshSources();
            }}
            disabled={enhancedLoading()}
          >
            Refresh
          </button>
        </div>

        {/* Sources */}
        <Show when={sources().length > 0}>
          <div class="mb-6">
            <h3 class="text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Kubeconfig Sources</h3>
            <div class="space-y-2">
              <For each={sources()}>
                {(source) => (
                  <div class="p-2 rounded border text-xs" style={{ border: '1px solid var(--border-color)', background: 'var(--bg-secondary)' }}>
                    <span class="font-medium" style={{ color: 'var(--text-primary)' }}>{source.name}</span>
                    <span class="ml-2 px-1.5 py-0.5 rounded text-xs" style={{ background: 'rgba(6, 182, 212, 0.15)', color: 'var(--accent-primary)' }}>
                      {source.type}
                    </span>
                    <Show when={source.path}>
                      <span class="ml-2" style={{ color: 'var(--text-muted)' }}>{source.path}</span>
                    </Show>
                  </div>
                )}
              </For>
            </div>
          </div>
        </Show>

        {/* Enhanced Clusters */}
        <Show when={enhancedClusters().length > 0} fallback={<p class="text-sm" style={{ color: 'var(--text-muted)' }}>No enhanced clusters found.</p>}>
          <div class="space-y-3">
              <For each={enhancedClusters()}>
                {(cluster) => {
                  const statusColor = () => {
                    switch (cluster.status) {
                      case 'CONNECTED': return '#10b981';
                      case 'DEGRADED': return '#f59e0b';
                      case 'CONNECTING': return '#3b82f6';
                      case 'AUTH_ERROR': return '#ef4444';
                      case 'DISCONNECTED': return '#ef4444';
                      default: return '#6b7280';
                    }
                  };
                  const statusLabel = () => {
                    switch (cluster.status) {
                      case 'CONNECTED': return 'Connected';
                      case 'DEGRADED': return 'Degraded';
                      case 'CONNECTING': return 'Connecting';
                      case 'AUTH_ERROR': return 'Auth Required';
                      case 'DISCONNECTED': return 'Disconnected';
                      default: return 'Unknown';
                    }
                  };
                  return (
                    <div class="p-4 rounded-lg border flex flex-col gap-3" style={{ border: '1px solid var(--border-color)', background: cluster.active ? 'rgba(6, 182, 212, 0.05)' : 'var(--bg-secondary)' }}>
                      <div class="flex items-center justify-between gap-4">
                        <div class="flex-1 min-w-0">
                          <div class="flex items-center gap-2 mb-1" style={{ 'flex-wrap': 'nowrap', 'overflow-x': 'auto' }}>
                            <span class="text-base font-semibold" style={{ color: 'var(--text-primary)', 'white-space': 'nowrap' }}>{cluster.name}</span>
                            <Show when={cluster.active}>
                              <span class="px-2 py-0.5 text-xs rounded-full" style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981', 'white-space': 'nowrap' }}>Active</span>
                            </Show>
                            <span class="px-2 py-0.5 text-xs rounded-full" style={{ background: 'rgba(6, 182, 212, 0.15)', color: 'var(--accent-primary)', 'white-space': 'nowrap' }}>
                              {cluster.provider}
                            </span>
                            <span class="px-2 py-0.5 text-xs rounded-full" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', 'white-space': 'nowrap' }}>
                              {cluster.environment}
                            </span>
                            <Show when={!cluster.active}>
                              <button
                                class="px-3 py-1.5 text-sm rounded-md transition-all"
                                style={{
                                  background: 'var(--accent-primary)',
                                  color: '#000',
                                  'white-space': 'nowrap',
                                  'flex-shrink': 0
                                }}
                                disabled={enhancedLoading()}
                                onClick={async () => {
                                  try {
                                    console.log('Selecting cluster:', cluster.clusterId, cluster.name);
                                    await selectCluster(cluster.clusterId);
                                    addNotification(`Switched to ${cluster.name}`, 'success');
                                    // Refresh to get updated status
                                    await refreshEnhancedClusters();
                                  } catch (err: any) {
                                    console.error('Select cluster error:', err);
                                    addNotification(err?.message || 'Failed to select cluster', 'error');
                                  }
                                }}
                              >
                                Select
                              </button>
                            </Show>
                            <button
                              class="px-3 py-1.5 text-sm rounded-md transition-all"
                              style={{
                                border: '1px solid var(--border-color)',
                                background: 'var(--bg-tertiary)',
                                color: 'var(--text-primary)',
                                'white-space': 'nowrap',
                                'flex-shrink': 0
                              }}
                              disabled={enhancedLoading()}
                              onClick={async () => {
                                try {
                                  await reconnectCluster(cluster.clusterId);
                                  addNotification(`Reconnecting to ${cluster.name}...`, 'info');
                                  // Refresh to get updated status
                                  await refreshEnhancedClusters();
                                } catch (err: any) {
                                  addNotification(err?.message || 'Failed to reconnect', 'error');
                                }
                              }}
                            >
                              Reconnect
                            </button>
                          </div>
                          <p class="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
                            {cluster.contextName} • {cluster.kubeconfigPath}
                          </p>
                          <Show when={cluster.lastError}>
                            <p class="text-xs mt-1" style={{ color: 'var(--error-color)' }}>{cluster.lastError}</p>
                          </Show>
                        </div>
                        <div class="flex items-center gap-2 flex-shrink-0">
                          <span class="w-2 h-2 rounded-full" style={{ background: statusColor() }}></span>
                          <span class="text-xs font-medium" style={{ color: statusColor(), 'white-space': 'nowrap' }}>{statusLabel()}</span>
                        </div>
                      </div>
                      <Show when={cluster.status === 'AUTH_ERROR'}>
                        <AuthErrorHelper
                          provider={cluster.provider}
                          clusterName={cluster.name}
                          onRetry={async () => {
                            try {
                              await reconnectCluster(cluster.clusterId);
                              addNotification(`Reconnecting to ${cluster.name}...`, 'info');
                            } catch (err: any) {
                              addNotification(err?.message || 'Failed to reconnect', 'error');
                            }
                          }}
                        />
                      </Show>
                    </div>
                  );
                }}
              </For>
          </div>
        </Show>
      </div>
    </div>
  );
};

export default ClusterManager;
