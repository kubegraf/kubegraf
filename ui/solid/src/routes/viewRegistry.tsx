import { lazy, type Component } from 'solid-js';
import type { View } from '../stores/ui';

// Lazy-loaded view registry.
// This is the main performance win: the initial bundle no longer pulls every route module.

const Dashboard = lazy(() => import('./Dashboard'));
const ClusterOverview = lazy(() => import('./ClusterOverview'));
const Pods = lazy(() => import('./Pods'));
const Deployments = lazy(() => import('./Deployments'));
const StatefulSets = lazy(() => import('./StatefulSets'));
const DaemonSets = lazy(() => import('./DaemonSets'));
const CronJobs = lazy(() => import('./CronJobs'));
const Jobs = lazy(() => import('./Jobs'));
const PDB = lazy(() => import('./PDB'));
const HPA = lazy(() => import('./HPA'));
const Services = lazy(() => import('./Services'));
const Ingresses = lazy(() => import('./Ingresses'));
const Namespaces = lazy(() => import('./Namespaces'));
const ConfigMaps = lazy(() => import('./ConfigMaps'));
const Secrets = lazy(() => import('./Secrets'));
const Certificates = lazy(() => import('./Certificates'));
const Nodes = lazy(() => import('./Nodes'));
const ResourceMap = lazy(() => import('./ResourceMap'));
const TrafficMapPage = lazy(() => import('./TrafficMapPage'));
const Security = lazy(() => import('./Security'));
const Plugins = lazy(() => import('./Plugins'));
const Cost = lazy(() => import('./Cost'));
const Drift = lazy(() => import('./Drift'));
const Events = lazy(() => import('./Events'));
const MonitoredEvents = lazy(() => import('./MonitoredEvents'));
const Connectors = lazy(() => import('./Connectors'));
const AIAgents = lazy(() => import('./AIAgents'));
const SREAgent = lazy(() => import('./SREAgent'));
const Kiali = lazy(() => import('./Kiali'));
const MLflow = lazy(() => import('./MLflow'));
const TrainingJobs = lazy(() => import('./TrainingJobs'));
const InferenceServices = lazy(() => import('./InferenceServices'));
const Feast = lazy(() => import('./Feast'));
const GPUDashboard = lazy(() => import('./GPUDashboard'));
const MLWorkflows = lazy(() => import('./MLWorkflows'));
const MultiCluster = lazy(() => import('./MultiCluster'));
const KnowledgeBank = lazy(() => import('./KnowledgeBank'));
const Logs = lazy(() => import('./Logs'));
const Anomalies = lazy(() => import('./Anomalies'));
const Incidents = lazy(() => import('./Incidents'));
const Continuity = lazy(() => import('./Continuity'));
const Timeline = lazy(() => import('./Timeline'));
const TimeHelix = lazy(() => import('./TimeHelix'));
const ResourceWaterfall = lazy(() => import('./ResourceWaterfall'));
const Apps = lazy(() => import('./Apps'));
const ClusterManager = lazy(() => import('./ClusterManager'));
const Storage = lazy(() => import('./Storage'));
const RBAC = lazy(() => import('./RBAC'));
const ServiceAccounts = lazy(() => import('./ServiceAccounts'));
const CustomResources = lazy(() => import('./CustomResources'));
const NetworkPolicies = lazy(() => import('./NetworkPolicies'));
const UserManagement = lazy(() => import('./UserManagement'));
const Terminal = lazy(() => import('./Terminal'));
const AutoFix = lazy(() => import('./AutoFix'));
const AIAssistant = lazy(() => import('./AIAssistant'));
const Settings = lazy(() => import('./Settings'));
const Privacy = lazy(() => import('./Privacy'));
const Documentation = lazy(() => import('./Documentation'));

// Non-route components used as views
const UIDemo = lazy(() => import('../components/UIDemo'));
const Placeholder = lazy(() => import('./Placeholder'));
const TrainingJobDetails = lazy(() => import('../features/mlJobs/TrainingJobDetails'));

// Wrapper components (keep behavior without duplicating Apps module)
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
      'Release approval workflow',
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
      'Integration with Argo Rollouts',
    ]}
  />
);

// Primary registry (string-indexed for compatibility)
export const views: Record<string, Component> = {
  dashboard: Dashboard,
  topology: ClusterOverview,
  monitoredevents: MonitoredEvents,
  incidents: Incidents,
  timeline: Timeline,
  timehelix: TimeHelix,
  resourcewaterfall: ResourceWaterfall,
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
  trafficmap: TrafficMapPage,
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
  trainingjobdetails: TrainingJobDetails,
  inferenceservices: InferenceServices,
  mlworkflows: MLWorkflows,
  mlflow: MLflow,
  feast: Feast,
  gpudashboard: GPUDashboard,
  events: Events,
  logs: Logs,
  apps: Marketplace,
  customapps: CustomApps,
  deployapp: DeployApp,
  clustermanager: ClusterManager,
  kiali: Kiali,
  releases: Releases,
  rollouts: Rollouts,
  uidemo: UIDemo,
  multicluster: MultiCluster,
  knowledgebank: KnowledgeBank,
} satisfies Record<string, Component>;

// Views that should be accessible even when not connected
export const noConnectionViews: ReadonlySet<View> = new Set<View>([
  'clustermanager',
  'settings',
  'logs',
  'privacy',
  'documentation',
  'apps',
  'plugins',
]);
