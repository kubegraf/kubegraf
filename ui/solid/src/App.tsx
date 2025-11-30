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
import Nodes from './routes/Nodes';
import ResourceMap from './routes/ResourceMap';
import Security from './routes/Security';
import Plugins from './routes/Plugins';
import AIChat from './components/AIChat';
import { currentView, aiPanelOpen, sidebarCollapsed, notifications } from './stores/ui';
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
  nodes: Nodes,
  resourcemap: ResourceMap,
  security: Security,
  plugins: Plugins,
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

        {/* Connection status banner */}
        <Show when={!isConnected()}>
          <div class="px-4 py-2 flex items-center gap-2" style={{
            background: 'rgba(239, 68, 68, 0.1)',
            'border-bottom': '1px solid rgba(239, 68, 68, 0.3)',
            color: 'var(--error-color)',
          }}>
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>Cluster connection unavailable. Some features may be limited.</span>
            <button
              onClick={() => location.reload()}
              class="ml-auto px-3 py-1 rounded text-sm"
              style={{ background: 'rgba(239, 68, 68, 0.2)' }}
            >
              Retry
            </button>
          </div>
        </Show>

        {/* Main content area */}
        <main class="flex-1 overflow-auto p-6">
          <Dynamic component={views[currentView()]} />
        </main>

        {/* Version Footer */}
        <footer class="px-6 py-3 border-t flex items-center justify-between text-xs"
          style={{ background: 'var(--bg-secondary)', 'border-color': 'var(--border-color)', color: 'var(--text-muted)' }}
        >
          <div class="flex items-center gap-4">
            <span class="flex items-center gap-2">
              <svg class="w-4 h-4" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="footer-lg" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style={{ 'stop-color': '#06b6d4' }}/>
                    <stop offset="100%" style={{ 'stop-color': '#8b5cf6' }}/>
                  </linearGradient>
                </defs>
                <circle cx="50" cy="50" r="12" fill="url(#footer-lg)"/>
                <circle cx="50" cy="50" r="40" fill="none" stroke="url(#footer-lg)" stroke-width="3"/>
              </svg>
              <span style={{ color: 'var(--text-secondary)' }}>KubeGraf</span>
              <span class="px-1.5 py-0.5 rounded" style={{ background: 'var(--bg-tertiary)', color: 'var(--accent-primary)' }}>v1.0.0</span>
            </span>
            <span class="hidden sm:inline">|</span>
            <span class="hidden sm:flex items-center gap-1">
              Cluster: <span style={{ color: connectionStatus()?.cluster ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                {connectionStatus()?.cluster || 'Not connected'}
              </span>
            </span>
          </div>
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
