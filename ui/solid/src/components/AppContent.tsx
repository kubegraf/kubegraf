import { Component, Show, For } from 'solid-js';
import { Dynamic } from 'solid-js/web';
import { currentView, sidebarCollapsed, notifications, terminalOpen, setTerminalOpen } from '../stores/ui';
import { clusterSwitching, clusterSwitchMessage } from '../stores/cluster';
import DeploymentProgress from './DeploymentProgress';
import DockedTerminal from './DockedTerminal';
import NotificationCenter from './NotificationCenter';
import { ConnectionOverlay } from './ConnectionOverlay';

// Import all route components
import Dashboard from '../routes/Dashboard';
import ClusterOverview from '../routes/ClusterOverview';
import Pods from '../routes/Pods';
import Deployments from '../routes/Deployments';
import StatefulSets from '../routes/StatefulSets';
import DaemonSets from '../routes/DaemonSets';
import CronJobs from '../routes/CronJobs';
import Jobs from '../routes/Jobs';
import PDB from '../routes/PDB';
import HPA from '../routes/HPA';
import Services from '../routes/Services';
import Ingresses from '../routes/Ingresses';
import Namespaces from '../routes/Namespaces';
import ConfigMaps from '../routes/ConfigMaps';
import Secrets from '../routes/Secrets';
import Certificates from '../routes/Certificates';
import Nodes from '../routes/Nodes';
import ResourceMap from '../routes/ResourceMap';
import Security from '../routes/Security';
import Plugins from '../routes/Plugins';
import Cost from '../routes/Cost';
import Drift from '../routes/Drift';
import Events from '../routes/Events';
import MonitoredEvents from '../routes/MonitoredEvents';
import Connectors from '../routes/Connectors';
import AIAgents from '../routes/AIAgents';
import SREAgent from '../routes/SREAgent';
import Kiali from '../routes/Kiali';
import MLflow from '../routes/MLflow';
import TrainingJobs from '../routes/TrainingJobs';
import InferenceServices from '../routes/InferenceServices';
import Feast from '../routes/Feast';
import GPUDashboard from '../routes/GPUDashboard';
import MLWorkflows from '../routes/MLWorkflows';
import Logs from '../routes/Logs';
import Anomalies from '../routes/Anomalies';
import Incidents from '../routes/Incidents';
import Continuity from '../routes/Continuity';
import Timeline from '../routes/Timeline';
import Apps from '../routes/Apps';
import ClusterManager from '../routes/ClusterManager';
import Placeholder from '../routes/Placeholder';
import Storage from '../routes/Storage';
import RBAC from '../routes/RBAC';
import ServiceAccounts from '../routes/ServiceAccounts';
import CustomResources from '../routes/CustomResources';
import NetworkPolicies from '../routes/NetworkPolicies';
import UserManagement from '../routes/UserManagement';
import Terminal from '../routes/Terminal';
import AutoFix from '../routes/AutoFix';
import AIAssistant from '../routes/AIAssistant';
import Settings from '../routes/Settings';
import Privacy from '../routes/Privacy';
import Documentation from '../routes/Documentation';
import UIDemo from '../components/UIDemo';

// Wrapper components
const Marketplace: Component = () => <Apps />;
const CustomApps: Component = () => <Apps />;
const DeployApp: Component = () => <Apps />;

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

const views: Record<string, Component> = {
  dashboard: Dashboard,
  topology: ClusterOverview,
  monitoredevents: MonitoredEvents,
  incidents: Incidents,
  timeline: Timeline,
  anomalies: Anomalies,
  security: Security,
  cost: Cost,
  drift: Drift,
  continuity: Continuity,
  pods: Pods,
  deployments: Deployments,
  statefulsets: StatefulSets,
  daemonsets: DaemonSets,
  jobs: Jobs,
  cronjobs: CronJobs,
  pdb: PDB,
  hpa: HPA,
  services: Services,
  ingresses: Ingresses,
  networkpolicies: NetworkPolicies,
  namespaces: Namespaces,
  configmaps: ConfigMaps,
  secrets: Secrets,
  certificates: Certificates,
  storage: Storage,
  serviceaccounts: ServiceAccounts,
  rbac: RBAC,
  customresources: CustomResources,
  nodes: Nodes,
  usermanagement: UserManagement,
  resourcemap: ResourceMap,
  connectors: Connectors,
  plugins: Plugins,
  terminal: Terminal,
  settings: Settings,
  privacy: Privacy,
  documentation: Documentation,
  ai: AIAssistant,
  autofix: AutoFix,
  sreagent: SREAgent,
  aiagents: AIAgents,
  trainingjobs: TrainingJobs,
  inferenceservices: InferenceServices,
  mlworkflows: MLWorkflows,
  mlflow: MLflow,
  feast: Feast,
  gpudashboard: GPUDashboard,
  events: Events,
  logs: Logs,
  apps: Marketplace,
  customapps: CustomApps,
  clustermanager: ClusterManager,
  kiali: Kiali,
  deployapp: DeployApp,
  releases: Releases,
  rollouts: Rollouts,
  uidemo: UIDemo,
};

interface AppContentProps {
  isConnected: () => boolean;
  connectionStatus: () => any;
  refetchStatus: () => void;
}

export const AppContent: Component<AppContentProps> = (props) => {
  return (
    <>
      {/* Connection status banner */}
      <Show when={!props.isConnected()}>
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
        {/* Always allow Cluster Manager to be shown, even when not connected */}
        <Show when={props.isConnected() || currentView() === 'clustermanager' || currentView() === 'settings' || currentView() === 'logs'}>
          {(() => {
            const view = currentView();
            const Component = views[view];
            if (!Component) {
              console.error('[App] Component not found for view:', view);
              return <div class="p-6" style="background: red; color: white;">Error: Component not found for view "{view}"</div>;
            }
            try {
              return <Dynamic component={Component} />;
            } catch (error) {
              console.error('[App] Error rendering component:', error);
              return <div class="p-6" style="background: red; color: white;">Error rendering {view}: {String(error)}</div>;
            }
          })()}
        </Show>
        {/* Show ConnectionOverlay for dashboard and other views when not connected */}
        <Show when={!props.isConnected() && currentView() !== 'clustermanager' && currentView() !== 'settings' && currentView() !== 'logs'}>
          <ConnectionOverlay
            connectionStatus={props.connectionStatus}
            refetchStatus={props.refetchStatus}
          />
        </Show>
      </main>

      {/* Status Footer */}
      <footer class="px-6 py-2 border-t flex items-center justify-end text-xs"
        style={{ background: 'var(--bg-secondary)', 'border-color': 'var(--border-color)', color: 'var(--text-muted)' }}
      >
        <div class="flex items-center gap-4">
          <NotificationCenter />
          <span class="flex items-center gap-1">
            <span class={`w-2 h-2 rounded-full ${props.connectionStatus()?.connected ? 'bg-green-500' : 'bg-red-500'}`} />
            {props.connectionStatus()?.connected ? 'Connected' : 'Disconnected'}
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

      {/* Notifications */}
      <div class="fixed bottom-24 right-6 z-50 flex flex-col-reverse gap-3 max-w-sm">
        <For each={notifications()}>
          {(notification) => (
            <div
              class="animate-slide-in px-4 py-3 rounded-lg shadow-lg border backdrop-blur-sm"
              style={{
                background: notification.type === 'error' ? 'rgba(239, 68, 68, 0.95)' :
                           notification.type === 'warning' ? 'rgba(245, 158, 11, 0.95)' :
                           notification.type === 'success' ? 'rgba(34, 197, 94, 0.95)' :
                           'rgba(6, 182, 212, 0.95)',
                'border-color': notification.type === 'error' ? 'rgba(239, 68, 68, 0.5)' :
                               notification.type === 'warning' ? 'rgba(245, 158, 11, 0.5)' :
                               notification.type === 'success' ? 'rgba(34, 197, 94, 0.5)' :
                               'rgba(6, 182, 212, 0.5)',
                color: notification.type === 'error' ? '#fff' :
                       notification.type === 'warning' ? '#000' :
                       notification.type === 'success' ? '#fff' :
                       '#000',
              }}
            >
              <div class="flex items-start gap-2.5">
                <span class="flex-shrink-0 text-base">
                  {notification.type === 'error' ? '❌' :
                   notification.type === 'warning' ? '⚠️' :
                   notification.type === 'success' ? '✓' : 'ℹ️'}
                </span>
                <span class="text-sm break-words leading-relaxed">{notification.message}</span>
              </div>
            </div>
          )}
        </For>
      </div>

      {/* Deployment Progress Overlay */}
      <DeploymentProgress />

      {/* Docked Terminal */}
      <DockedTerminal
        isOpen={terminalOpen()}
        onClose={() => setTerminalOpen(false)}
      />
    </>
  );
};
