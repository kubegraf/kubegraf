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
import MonitoredEvents from './routes/MonitoredEvents';
import Connectors from './routes/Connectors';
import AIAgents from './routes/AIAgents';
import SREAgent from './routes/SREAgent';
import Logs from './routes/Logs';
import Anomalies from './routes/Anomalies';
import Apps from './routes/Apps';
import ClusterManager from './routes/ClusterManager';
import Placeholder from './routes/Placeholder';
import Storage from './routes/Storage';
import RBAC from './routes/RBAC';
import NetworkPolicies from './routes/NetworkPolicies';
import UserManagement from './routes/UserManagement';
import DeploymentProgress from './components/DeploymentProgress';
import DockedTerminal from './components/DockedTerminal';
import UIDemo from './components/UIDemo';
// Wrapper components for Apps with different default tabs
// Note: We removed defaultTab so tabs are always visible
const Marketplace: Component = () => <Apps />;
const CustomApps: Component = () => <Apps />;

// Placeholder components for new features
const DeployApp: Component = () => (
  <Placeholder
    title="Deploy App"
    description="Deploy applications to your Kubernetes cluster with ease. Choose from templates, Helm charts, or custom YAML configurations."
    icon="M12 6v6m0 0v6m0-6h6m-6 0H6"
    comingSoon={true}
    features={[
      'Deploy from Helm charts',
      'Deploy from YAML manifests',
      'Application templates library',
      'One-click deployment',
      'Deployment validation',
      'Rollback capabilities'
    ]}
  />
);

const Releases: Component = () => (
  <Placeholder
    title="Releases"
    description="Manage application releases and track deployment history across your cluster."
    icon="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
    comingSoon={true}
    features={[
      'Release history tracking',
      'Release comparison',
      'Rollback to previous releases',
      'Release notes and changelog',
      'Release approval workflow'
    ]}
  />
);

const Rollouts: Component = () => (
  <Placeholder
    title="Rollouts (Canary / Blue-Green)"
    description="Advanced deployment strategies including canary and blue-green rollouts for zero-downtime deployments."
    icon="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
    comingSoon={true}
    features={[
      'Canary deployments',
      'Blue-Green deployments',
      'Traffic splitting',
      'Automatic rollback on errors',
      'Progressive delivery',
      'Integration with Argo Rollouts'
    ]}
  />
);

const GitOps: Component = () => (
  <Placeholder
    title="GitOps Sync (Argo / Flux)"
    description="Monitor and manage GitOps deployments using ArgoCD and Flux. View sync status, health, and drift detection."
    icon="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
    comingSoon={true}
    features={[
      'ArgoCD application monitoring',
      'Flux GitRepository and Kustomization tracking',
      'Sync status and health checks',
      'Manual sync triggers',
      'Drift detection',
      'Git commit history'
    ]}
  />
);

import Settings from './routes/Settings';
import AIChat from './components/AIChat';
import { currentView, setCurrentView, aiPanelOpen, sidebarCollapsed, notifications, terminalOpen, setTerminalOpen } from './stores/ui';
import { refreshClusterStatus } from './stores/clusterManager';
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
  monitoredevents: MonitoredEvents,
  logs: Logs,
  anomalies: Anomalies,
  connectors: Connectors,
  aiagents: AIAgents,
  sreagent: SREAgent,
  apps: Marketplace,
  customapps: CustomApps,
  clustermanager: ClusterManager,
  settings: Settings,
  // Placeholder views for new menu items
  deployapp: DeployApp,
  releases: Releases,
  rollouts: Rollouts,
  storage: Storage,
  rbac: RBAC,
  networkpolicies: NetworkPolicies,
  usermanagement: UserManagement,
  // UI Demo
  uidemo: UIDemo,
};

const App: Component = () => {
  const [connectionStatus] = createResource(api.getStatus);
  const [wsConnected, setWsConnected] = createSignal(false);

  onMount(() => {
    // Connect WebSocket for real-time updates
    wsService.connect();

    // Prime cluster manager status for header indicator
    refreshClusterStatus();

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
            {/* Overlay when not connected - enhanced with options */}
            <div class="absolute inset-0 z-10 flex items-center justify-center p-8" style={{ background: 'var(--bg-primary)', 'pointer-events': 'auto' }}>
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
                      alert('To connect to an existing cluster:\n\n1. Ensure your kubeconfig is set up (~/.kube/config)\n2. Verify access: kubectl cluster-info\n3. Click "Retry Connection" or refresh the page\n\nKubeGraf will automatically detect and connect to your cluster.');
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
                        location.reload();
                      }}
                      class="w-full px-4 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-90 flex items-center justify-center gap-2"
                      style={{ background: 'var(--accent-primary)', color: '#000' }}
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
                      // Store flag to auto-filter to Local Cluster
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
                        // Set filter and tab preference
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
          <Show when={isConnected() || currentView() === 'settings' || currentView() === 'logs'}>
            {(() => {
              const view = currentView();
              const Component = views[view];
              if (!Component) {
                console.error('[App] Component not found for view:', view, 'Available views:', Object.keys(views));
                return <div class="p-6" style="background: red; color: white; font-size: 20px; z-index: 9999; position: relative;">Error: Component not found for view "{view}"</div>;
              }
              try {
                return <Dynamic component={Component} />;
              } catch (error) {
                console.error('[App] Error rendering component:', error);
                return <div class="p-6" style="background: red; color: white; font-size: 20px;">Error rendering {view}: {String(error)}</div>;
              }
            })()}
          </Show>
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

      {/* Deployment Progress Overlay */}
      <DeploymentProgress />

      {/* Docked Terminal */}
      <DockedTerminal
        isOpen={terminalOpen()}
        onClose={() => setTerminalOpen(false)}
      />
    </div>
  );
};


export default App;
