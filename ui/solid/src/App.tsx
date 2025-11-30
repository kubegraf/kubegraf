import { Component, Show, onMount, For } from 'solid-js';
import { Dynamic } from 'solid-js/web';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './routes/Dashboard';
import Pods from './routes/Pods';
import Deployments from './routes/Deployments';
import StatefulSets from './routes/StatefulSets';
import DaemonSets from './routes/DaemonSets';
import CronJobs from './routes/CronJobs';
import Jobs from './routes/Jobs';
import Services from './routes/Services';
import Ingresses from './routes/Ingresses';
import ConfigMaps from './routes/ConfigMaps';
import Secrets from './routes/Secrets';
import Certificates from './routes/Certificates';
import Nodes from './routes/Nodes';
import ResourceMap from './routes/ResourceMap';
import Security from './routes/Security';
import Plugins from './routes/Plugins';
import Cost from './routes/Cost';
import Drift from './routes/Drift';
import Events from './routes/Events';
import Apps from './routes/Apps';

// Wrapper components for Apps with different default tabs
const Marketplace: Component = () => <Apps defaultTab="marketplace" />;
const CustomApps: Component = () => <Apps defaultTab="custom" />;
import Settings from './routes/Settings';
import AIChat from './components/AIChat';
import { currentView, aiPanelOpen, sidebarCollapsed, notifications } from './stores/ui';
import { clusterSwitching, clusterSwitchMessage } from './stores/cluster';
import { wsService } from './services/websocket';
import { api } from './services/api';
import { createSignal, createResource } from 'solid-js';

const views: Record<string, Component> = {
  dashboard: Dashboard,
  pods: Pods,
  deployments: Deployments,
  statefulsets: StatefulSets,
  daemonsets: DaemonSets,
  cronjobs: CronJobs,
  jobs: Jobs,
  services: Services,
  ingresses: Ingresses,
  configmaps: ConfigMaps,
  secrets: Secrets,
  certificates: Certificates,
  nodes: Nodes,
  resourcemap: ResourceMap,
  security: Security,
  plugins: Plugins,
  cost: Cost,
  drift: Drift,
  events: Events,
  apps: Marketplace,
  customapps: CustomApps,
  settings: Settings,
};

const App: Component = () => {
  const [connectionStatus] = createResource(api.getStatus);
  const [wsConnected, setWsConnected] = createSignal(false);

  onMount(() => {
    // Connect WebSocket for real-time updates
    wsService.connect();

    // Subscribe to connection state
    const unsubscribe = wsService.subscribe((msg) => {
      if (msg.type === 'connection') {
        setWsConnected(msg.data.connected);
      }
    });

    return () => {
      unsubscribe();
      wsService.disconnect();
    };
  });

  const isConnected = () => connectionStatus()?.connected !== false;

  return (
    <div class="flex h-screen overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
        {/* Sidebar */}
        <Sidebar />

        {/* Main content */}
        <div class={`flex-1 flex flex-col overflow-hidden transition-all duration-300 ${sidebarCollapsed() ? 'ml-16' : 'ml-52'}`}>
          {/* Header */}
          <Header />

        {/* Connection status banner - simplified */}
        <Show when={!isConnected()}>
          <div class="px-6 py-3 flex items-center gap-3" style={{
            background: 'rgba(239, 68, 68, 0.1)',
            'border-bottom': '1px solid rgba(239, 68, 68, 0.2)',
          }}>
            <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--error-color)' }}>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div class="flex-1 min-w-0">
              <span class="font-medium" style={{ color: 'var(--error-color)' }}>
                Cluster not connected
              </span>
              <span class="text-sm ml-2" style={{ color: 'var(--text-muted)' }}>
                — Connect to a Kubernetes cluster to use KubeGraf
              </span>
            </div>
            <button
              onClick={() => location.reload()}
              class="px-3 py-1.5 rounded text-sm font-medium transition-all hover:opacity-80 flex items-center gap-1.5"
              style={{ background: 'rgba(239, 68, 68, 0.2)', color: 'var(--error-color)' }}
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Retry
            </button>
          </div>
        </Show>

        {/* Cluster switching indicator */}
        <Show when={clusterSwitching()}>
          <div class="px-4 py-2 flex items-center gap-3" style={{
            background: 'rgba(6, 182, 212, 0.1)',
            'border-bottom': '1px solid rgba(6, 182, 212, 0.3)',
            color: 'var(--accent-primary)',
          }}>
            <div class="spinner" style={{ width: '16px', height: '16px' }} />
            <span class="text-sm font-medium">{clusterSwitchMessage()}</span>
          </div>
        </Show>

        {/* Main content area */}
        <main class="flex-1 overflow-auto p-6 relative">
          <Show when={!isConnected() && currentView() !== 'settings'}>
            {/* Overlay when not connected - simplified */}
            <div class="absolute inset-0 z-10 flex items-center justify-center p-8" style={{ background: 'var(--bg-primary)' }}>
              <div class="max-w-2xl w-full text-center">
                <div class="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ background: 'rgba(239, 68, 68, 0.15)' }}>
                  <svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--error-color)' }}>
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <h2 class="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
                  Connect to Kubernetes Cluster
                </h2>
                <p class="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
                  KubeGraf needs an active cluster connection to function
                </p>
                
                <Show when={connectionStatus()?.error}>
                  <div class="card p-4 mb-6 text-left max-w-lg mx-auto">
                    <div class="text-xs font-semibold mb-2 uppercase tracking-wide" style={{ color: 'var(--error-color)' }}>
                      Error
                    </div>
                    <div class="text-xs font-mono break-all mb-2" style={{ color: 'var(--text-secondary)' }}>
                      {connectionStatus()?.error}
                    </div>
                    <div class="text-sm font-medium mt-3" style={{ color: 'var(--text-primary)' }}>
                      <div class="mb-2">Check your kubeconfig at:</div>
                      <code class="block px-3 py-2 rounded mb-3 text-xs font-mono" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}>
                        ~/.kube/config
                      </code>
                      <div class="mb-2">Or run this command to verify access:</div>
                      <code class="block px-3 py-2 rounded text-xs font-mono" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}>
                        kubectl cluster-info
                      </code>
                    </div>
                  </div>
                </Show>

                <div class="flex items-center justify-center gap-3">
                  <button
                    onClick={() => location.reload()}
                    class="px-5 py-2.5 rounded-lg font-medium transition-all hover:opacity-90 flex items-center gap-2"
                    style={{ background: 'var(--error-color)', color: 'white' }}
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
          <Dynamic component={views[currentView()]} />
        </main>

        {/* Status Footer */}
        <footer class="px-6 py-2 border-t flex items-center justify-end text-xs"
          style={{ background: 'var(--bg-secondary)', 'border-color': 'var(--border-color)', color: 'var(--text-muted)' }}
        >
          <div class="flex items-center gap-4">
            <span class="flex items-center gap-1">
              <span class={`w-2 h-2 rounded-full ${connectionStatus()?.connected ? 'bg-green-500' : 'bg-red-500'}`} />
              {connectionStatus()?.connected ? 'Connected' : 'Disconnected'}
            </span>
            <a
              href="https://github.com/kubegraf/kubegraf"
              target="_blank"
              class="hover:underline"
              style={{ color: 'var(--accent-primary)' }}
            >
              GitHub
            </a>
          </div>
        </footer>
      </div>

      {/* AI Chat Panel */}
      <Show when={aiPanelOpen()}>
        <AIChat />
      </Show>

      {/* Notifications */}
      <div class="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        <For each={notifications()}>
          {(notification) => (
            <div
              class="animate-slide-in px-4 py-3 rounded-lg shadow-lg border max-w-sm"
              style={{
                background: notification.type === 'error' ? 'rgba(239, 68, 68, 0.1)' :
                           notification.type === 'warning' ? 'rgba(245, 158, 11, 0.1)' :
                           notification.type === 'success' ? 'rgba(34, 197, 94, 0.1)' :
                           'rgba(6, 182, 212, 0.1)',
                'border-color': notification.type === 'error' ? 'rgba(239, 68, 68, 0.3)' :
                               notification.type === 'warning' ? 'rgba(245, 158, 11, 0.3)' :
                               notification.type === 'success' ? 'rgba(34, 197, 94, 0.3)' :
                               'rgba(6, 182, 212, 0.3)',
                color: notification.type === 'error' ? 'var(--error-color)' :
                       notification.type === 'warning' ? 'var(--warning-color)' :
                       notification.type === 'success' ? 'var(--success-color)' :
                       'var(--accent-primary)',
              }}
            >
              <div class="flex items-start gap-2">
                <span>
                  {notification.type === 'error' ? '❌' :
                   notification.type === 'warning' ? '⚠️' :
                   notification.type === 'success' ? '✓' : 'ℹ️'}
                </span>
                <span class="text-sm">{notification.message}</span>
              </div>
            </div>
          )}
        </For>
      </div>

      {/* WebSocket Status Indicator */}
      <div class="fixed bottom-4 z-50" style={{ left: '80px' }}>
        <Show when={sidebarCollapsed()}>
          <div
            class="flex items-center gap-2 px-3 py-2 rounded-lg text-xs"
            style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}
          >
            <span class={`w-2 h-2 rounded-full ${wsConnected() ? 'bg-green-500' : 'bg-red-500'}`} />
            <span>{wsConnected() ? 'Live' : 'Offline'}</span>
          </div>
        </Show>
      </div>
    </div>
  );
};

export default App;
