# KubeGraf Architecture Documentation

**Last Updated:** February 2026
**Version:** 1.7.x

This document provides a comprehensive overview of KubeGraf's architecture, including frontend components, backend API routes, and their integration patterns.

> **📊 Visual Diagrams**: See [ARCHITECTURE_DIAGRAMS.md](ARCHITECTURE_DIAGRAMS.md) for comprehensive Mermaid diagrams visualizing the architecture.

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Technology Stack](#technology-stack)
3. [Frontend Architecture](#frontend-architecture)
4. [Backend Architecture](#backend-architecture)
5. [Frontend-Backend Communication](#frontend-backend-communication)
6. [Feature Integration Map](#feature-integration-map)
7. [Security & Authentication](#security--authentication)
8. [Development Guide](#development-guide)

---

## System Overview

KubeGraf is a **local-first Kubernetes management platform** with AI-powered incident intelligence. The application follows a client-server architecture:

```
┌─────────────────────────────────────────────────────────────┐
│                     KubeGraf Desktop App                     │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌───────────────────────────────────────────────────────┐  │
│  │           Frontend (SolidJS SPA)                       │  │
│  │  - 80+ Components  - 70+ Routes  - 22 State Stores    │  │
│  └───────────────────────────────────────────────────────┘  │
│                           │                                   │
│                      WebSocket + REST API                     │
│                           │                                   │
│  ┌───────────────────────────────────────────────────────┐  │
│  │           Backend (Go)                                 │  │
│  │  - 200+ API Routes  - Real-time streaming             │  │
│  └───────────────────────────────────────────────────────┘  │
│                           │                                   │
└───────────────────────────┼───────────────────────────────────┘
                            │
                    ┌───────┴───────┐
                    │   Kubernetes  │
                    │    Cluster    │
                    └───────────────┘
```

### Core Principles

- **Local-First**: All data processing happens on the user's machine
- **Kubernetes-Native**: Direct integration with Kubernetes API via `client-go`
- **Real-Time**: WebSocket connections for live updates
- **AI-Powered**: Built-in incident detection and auto-remediation
- **Zero External Dependencies**: No cloud services required

---

## Technology Stack

### Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| **SolidJS** | 1.x | Reactive UI framework with fine-grained reactivity |
| **TypeScript** | 5.x | Type-safe JavaScript |
| **Vite** | 5.x | Build tool and dev server |
| **TailwindCSS** | 3.x | Utility-first CSS framework |
| **TanStack Query** | Latest | Data fetching and caching |
| **Chart.js** | Latest | Metrics visualization |
| **xterm.js** | Latest | Terminal emulation |

### Backend

| Technology | Version | Purpose |
|------------|---------|---------|
| **Go** | 1.24+ | Backend runtime |
| **Kubernetes client-go** | v0.35.0 | Kubernetes API client |
| **Gorilla WebSocket** | Latest | WebSocket server |
| **SQLite** | Latest | Local database storage |
| **Embedded FS** | Go 1.16+ | Embedded frontend assets |

---

## Frontend Architecture

### Directory Structure

```
ui/solid/src/
├── components/          # Reusable UI components (80+)
│   ├── layout/         # Layout components (AppShell, Header, Sidebar)
│   ├── modals/         # Modal dialogs
│   ├── tables/         # Data tables and lists
│   ├── terminal/       # Terminal components
│   ├── incidents/      # Incident-specific components
│   ├── intelligence/   # AI/Intelligence components
│   ├── metrics/        # Metrics visualizations
│   └── sidebar/        # Sidebar-specific components
├── routes/             # Page components (70+)
├── stores/             # State management (22 stores)
├── config/             # Configuration files
├── features/           # Feature-specific code
│   ├── marketplace/    # App marketplace
│   ├── brain/         # AI insights
│   ├── kiali/         # Service mesh integration
│   └── mlJobs/        # ML workflows
├── utils/             # Utility functions
└── types/             # TypeScript type definitions
```

---

## 1. Layout Components

### AppShell (`components/AppShell.tsx`)

The root layout container that provides the overall application structure.

**Features:**
- Fixed header at top
- Collapsible sidebar on left
- Scrollable main content area
- Update banner overlay
- Policy modal

**Structure:**
```tsx
<AppShell>
  <UpdateBanner />
  <PolicyModal />
  <Body>
    <SidebarV2 />
    <Main>
      <Header />
      <Content>
        {/* Route content */}
      </Content>
    </Main>
  </Body>
</AppShell>
```

---

### Header (`components/Header.tsx` - 45KB)

Top navigation bar with all primary controls.

**Components:**
- **Namespace Selector**: Multi-select dropdown for namespace filtering
- **Cluster Switcher**: Switch between connected clusters
- **Cloud Provider Badge**: Shows current cluster's cloud provider
- **Theme Toggle**: Dark/light mode switcher
- **Help Menu**: Documentation, bug reporting, contact
- **Notification Center**: Notification panel with unread count
- **Command Palette Trigger**: Cmd+K shortcut button
- **Backend Health Indicator**: Connection status indicator
- **Local Terminal Button**: Quick access to terminal

**API Integration:**
- `GET /api/v2/clusters` - List available clusters
- `POST /api/v2/clusters/switch` - Switch active cluster
- `GET /api/namespaces` - List namespaces
- `GET /api/notifications` - Fetch notifications
- `POST /api/notifications/mark-read` - Mark as read

**State Management:**
- `clusterStore.ts` - Cluster and namespace state
- `ui.ts` - Notification state, command palette state
- `theme.ts` - Theme preferences

---

### SidebarV2 (`components/SidebarV2.tsx` - 16KB)

Modern 2-panel sidebar with rail + flyout pattern.

**Features:**
- **Sidebar Rail** (14px width): Icon-based navigation with abbreviated labels
- **Sidebar Flyout**: Expands on hover to show full menu
- **Section Pinning**: Pin frequently used sections
- **Active Section Highlighting**: Visual indicator for current section
- **Unread Indicators**: Pulse animation for new insights
- **Quick Switcher**: Fast navigation between sections

**Navigation Sections (12 total):**
1. **Overview** - Dashboard, Cluster Overview, Multi-Cluster, Events
2. **Insights** - Incidents, Timeline, AI/ML, Security, Cost, Drift, Continuity
3. **CD** - Deploy, Rollouts
4. **Workloads** - Pods, Deployments, StatefulSets, DaemonSets, Jobs, CronJobs, PDB, HPA
5. **Networking** - Services, Ingress, Network Policies
6. **Config & Storage** - ConfigMaps, Secrets, Certificates, PVs/PVCs
7. **Access Control** - Service Accounts, RBAC
8. **Platform** - Namespaces, Nodes, Users, Resource Map, Integrations, Plugins, Terminal
9. **Intelligence** - AI Assistant, AutoFix, SRE Agent, Knowledge Bank
10. **Machine Learning** - Training Jobs, Inference, MLflow, Feast, GPU Dashboard
11. **Custom Resources** - CRDs & Instances
12. **Settings** - Application settings

**State Management:**
- `sidebarState.ts` - Active section, pinned sections
- `ui.ts` - Sidebar collapsed state
- `insightsPulse.ts` - Unread insight count

---

## 2. Core UI Components

### Command Palette (`components/CommandPalette.tsx` - 12KB)

Keyboard-driven command interface (Cmd+K / Ctrl+K).

**Features:**
- Fuzzy search across all actions
- Action grouping by category
- Keyboard navigation (↑↓ arrows, Enter)
- Command preview panel
- Recent command history

**Action Categories:**
- Navigation (Go to Dashboard, Pods, etc.)
- Resource Actions (Restart, Scale, Delete)
- Quick Tools (Terminal, Logs, Describe)
- Settings & Configuration

**State:** `commandPalette.ts`

---

### Notification Center (`components/NotificationCenter.tsx` - 12KB)

Centralized notification management.

**Features:**
- Persistent notification storage
- Unread count badge
- Notification filtering (All, Unread, Read)
- Mark as read/unread
- Delete notifications
- Auto-refresh

**API Integration:**
- `GET /api/notifications` - Fetch notifications
- `POST /api/notifications/mark-read` - Mark as read
- `POST /api/notifications/mark-all-read` - Mark all as read
- `DELETE /api/notifications/delete` - Delete notification
- `GET /api/notifications/unread-count` - Get unread count

**State:** `persistent-notifications.ts`, `ui.ts`

---

### AI Chat (`components/AIChat.tsx` - 15KB)

Interactive AI assistant interface.

**Features:**
- Message history with user/assistant roles
- Streaming responses
- Provider selection (OpenAI, Claude, Ollama)
- Code block syntax highlighting
- Copy code button
- Message regeneration

**API Integration:**
- `POST /api/ai/chat` - Send message to AI
- `GET /api/ai/providers` - List available providers
- `POST /api/ai/providers/configure` - Configure provider

**State:** `ai.ts`

---

### Terminal Components

#### DockedTerminal (`components/DockedTerminal.tsx`)
- Embedded terminal in main content
- Resizable height
- Persistent session

#### LocalTerminal (`components/LocalTerminal.tsx` - 8KB)
- Local shell execution (bash, zsh, fish, powershell)
- WebSocket-based I/O
- Directory navigation
- Command history

**API Integration:**
- `WebSocket /api/local/terminal` - Terminal I/O stream

#### Pod Terminal
- `WebSocket /api/pod/terminal` - Interactive pod shell
- Container selection
- Shell type detection

---

### Execution Panel (`components/ExecutionPanel.tsx` - 24KB)

Real-time execution/deployment progress tracking.

**Features:**
- Execution status (idle, planned, running, succeeded, failed)
- Live stdout/stderr streaming
- Resource change summary
- Execution duration
- Exit code display
- Expandable/collapsible
- Execution history

**States:**
- `idle` - No execution
- `planned` - Change preview ready
- `running` - Executing command
- `succeeded` - Success (exit 0)
- `failed` - Failed (exit non-zero)

**API Integration:**
- `WebSocket /api/execution/stream` - Stream execution output
- `GET /api/executions` - List executions
- `GET /api/executions/logs` - Get execution logs

**State:** `executionPanel.ts`

---

## 3. Data Display Components

### VirtualizedTable (`components/VirtualizedTable.tsx`)

High-performance table for large datasets.

**Features:**
- Virtual scrolling (render visible rows only)
- Column sorting
- Column filtering
- Pagination
- Row selection (single/multi)
- Bulk actions
- Export to CSV

**Used In:**
- Pods list (118KB component)
- Deployments list (77KB component)
- Incidents table (64KB component)

---

### Resource Detail Modals

#### ServiceDetailsPanel (`components/ServiceDetailsPanel.tsx` - 29KB)
- Service overview (ClusterIP, ports, selectors)
- Endpoint information
- Related pods
- Port forwarding controls
- YAML viewer
- Events timeline

#### DescribeModal (`components/DescribeModal.tsx`)
- Full `kubectl describe` output
- Syntax highlighting
- Copy to clipboard

#### YAMLEditor (`components/YAMLEditor.tsx`)
- Syntax-highlighted YAML editing
- Validation
- Diff preview before save

**API Integration:**
- `GET /api/service/details?namespace=X&name=Y`
- `GET /api/service/yaml?namespace=X&name=Y`
- `POST /api/service/update` - Apply YAML changes

---

### Metrics Visualization

#### CpuMemChart (`components/metrics/CpuMemChart.tsx` - 21KB)
- Real-time CPU/Memory usage charts
- Time-series data visualization
- Zoom/pan controls
- Multi-pod comparison

**API Integration:**
- `WebSocket /ws/metrics` - Live metrics stream
- `GET /api/metrics` - Snapshot metrics

**State:** `metricsStore.ts`

---

## 4. Modal Components

### Confirmation Modals
- **ConfirmationModal** - Generic yes/no dialogs
- **BulkDeleteModal** - Confirm bulk deletions
- **HelmReleaseDeleteModal** - Helm-specific deletion
- **AppUninstallModal** - App uninstall confirmation

### Action Modals
- **FixPreviewModal** (20KB) - Preview incident fixes before applying
- **UpdateModal** - Version update notification
- **LoginModal** - Authentication
- **PolicyModal** - Privacy policy acceptance

---

## 5. State Management (Stores)

KubeGraf uses **SolidJS signals** for fine-grained reactive state management.

### Core Stores

#### `ui.ts` - Global UI State
```typescript
{
  currentView: string;           // Active route
  sidebarCollapsed: boolean;     // Sidebar state
  aiPanelOpen: boolean;         // AI panel visibility
  notifications: Notification[]; // Notification list
  terminalVisible: boolean;      // Terminal visibility
  commandPaletteOpen: boolean;   // Command palette state
}
```

#### `cluster.ts` (17KB) - Cluster Management
```typescript
{
  currentContext: string;        // Active cluster context
  namespaces: string[];         // Available namespaces
  selectedNamespaces: string[]; // Filtered namespaces
  clusterInfo: ClusterInfo;     // Cluster metadata
  isConnected: boolean;         // Connection status
}
```

**API Integration:**
- `GET /api/v2/clusters` - List clusters
- `POST /api/v2/clusters/switch` - Switch cluster
- `GET /api/namespaces` - List namespaces

#### `clusterSimple.ts` (6KB) - Simplified Cluster Store
```typescript
{
  clusters: Cluster[];          // All available clusters
  currentCluster: Cluster;      // Active cluster
  isLoading: boolean;           // Loading state
  error: string | null;         // Error message
}
```

Functions:
- `refetchClusters()` - Reload cluster list
- `refreshClusters()` - Force refresh with backend
- `switchCluster(contextName)` - Switch active cluster

---

#### `ai.ts` (4.3KB) - AI Assistant State
```typescript
{
  messages: Message[];          // Chat history
  currentProvider: string;      // OpenAI, Claude, Ollama
  isLoading: boolean;           // Response loading
  providers: Provider[];        // Available providers
}
```

#### `theme.ts` (9.6KB) - Theme Management
```typescript
{
  theme: 'light' | 'dark';      // Current theme
  colorScheme: string;          // Color palette
}
```

#### `settings.ts` (7.5KB) - Application Settings
```typescript
{
  featureFlags: Record<string, boolean>;  // 50+ feature toggles
  refreshIntervals: {
    pods: number;
    metrics: number;
    events: number;
  };
  debugMode: boolean;
}
```

#### `executionPanel.ts` (17KB) - Execution Tracking
```typescript
{
  status: 'idle' | 'planned' | 'running' | 'succeeded' | 'failed';
  output: string[];             // Command output lines
  summary: {
    duration: number;
    exitCode: number;
    resourcesChanged: number;
  };
}
```

---

## 6. Routes (Pages)

All routes are **lazy-loaded** using Solid's `lazy()` function for optimal performance.

### Overview & Dashboard

#### `/dashboard` - Dashboard (`routes/Dashboard.tsx` - 40KB)
Main dashboard with cluster health overview.

**Features:**
- Cluster status cards (nodes, pods, services)
- CPU/Memory usage charts
- Recent incidents
- Quick action buttons
- Health indicators

**API Integration:**
- `GET /api/status` - Cluster connection status
- `WebSocket /ws` - Real-time cluster updates
- `WebSocket /ws/metrics` - Metrics stream
- `GET /api/incidents/summary` - Incident summary

---

#### `/cluster-overview` - ClusterOverview
Detailed cluster topology and resource distribution.

**Features:**
- Node list with capacity
- Namespace distribution
- Workload distribution pie chart
- Resource quotas

**API Integration:**
- `GET /api/nodes` - Node list
- `GET /api/namespaces` - Namespace list
- `GET /api/topology` - Cluster topology

---

### Workload Management

#### `/pods` - Pods (`routes/Pods.tsx` - 118KB)
Comprehensive pod management interface.

**Features:**
- Virtualized pod table
- Multi-namespace filtering
- Status filtering (Running, Pending, Failed, etc.)
- Search by name/label
- Bulk actions (Delete, Restart)
- Quick actions (Logs, Describe, Shell, YAML)
- Container status indicators
- Restart count tracking

**API Integration:**
- `GET /api/pods?namespace=X` - List pods
- `GET /api/pod/details?namespace=X&name=Y` - Pod details
- `GET /api/pod/logs?namespace=X&name=Y&container=Z` - Pod logs
- `GET /api/pod/yaml?namespace=X&name=Y` - Pod YAML
- `GET /api/pod/describe?namespace=X&name=Y` - Pod describe
- `DELETE /api/pod/delete` - Delete pod
- `POST /api/pod/restart` - Restart pod
- `POST /api/pod/exec` - Execute command
- `WebSocket /api/pod/terminal` - Interactive shell

**Components Used:**
- `VirtualizedTable`
- `BulkActions`
- `ActionMenu`
- `LogsModal`
- `DescribeModal`
- `YAMLViewer`

---

#### `/deployments` - Deployments (`routes/Deployments.tsx` - 77KB)

**Features:**
- Deployment list with replica status
- Rolling update progress
- Image version tracking
- Scale controls
- Rollback history
- Bulk restart/delete

**API Integration:**
- `GET /api/deployments?namespace=X`
- `GET /api/deployment/details?namespace=X&name=Y`
- `POST /api/deployment/scale` - Scale replicas
- `POST /api/deployment/restart` - Restart deployment
- `POST /api/deployment/update` - Update YAML
- `DELETE /api/deployment/delete`
- `POST /api/deployments/bulk/restart`
- `DELETE /api/deployments/bulk/delete`

---

#### `/statefulsets` - StatefulSets
StatefulSet management with ordinal tracking.

**API Integration:**
- `GET /api/statefulsets?namespace=X`
- `POST /api/statefulset/scale`
- `POST /api/statefulset/restart`

---

#### `/daemonsets` - DaemonSets (`routes/DaemonSets.tsx` - 62KB)
DaemonSet management with node coverage.

**API Integration:**
- `GET /api/daemonsets?namespace=X`
- `POST /api/daemonset/restart`

---

#### `/jobs` - Jobs (`routes/Jobs.tsx` - 59KB)
Job management and execution tracking.

**API Integration:**
- `GET /api/jobs?namespace=X`
- `DELETE /api/job/delete`

---

#### `/cronjobs` - CronJobs (`routes/CronJobs.tsx` - 44KB)
CronJob scheduling and execution history.

**API Integration:**
- `GET /api/cronjobs?namespace=X`

---

### Networking

#### `/services` - Services (`routes/Services.tsx` - 46KB)
Service discovery and port forwarding.

**Features:**
- Service list with ClusterIP/NodePort/LoadBalancer types
- Endpoint tracking
- Port forwarding controls
- Label selector display

**API Integration:**
- `GET /api/services?namespace=X`
- `GET /api/service/details?namespace=X&name=Y`
- `POST /api/portforward/start` - Start port forward
- `POST /api/portforward/stop` - Stop port forward
- `GET /api/portforward/list` - Active port forwards

---

#### `/ingresses` - Ingresses (`routes/Ingresses.tsx` - 45KB)
Ingress rule management.

**API Integration:**
- `GET /api/ingresses?namespace=X`

---

#### `/network-policies` - NetworkPolicies (`routes/NetworkPolicies.tsx` - 43KB)
Network policy visualization and management.

**API Integration:**
- `GET /api/networkpolicies?namespace=X`

---

### Configuration & Storage

#### `/configmaps` - ConfigMaps (`routes/ConfigMaps.tsx` - 42KB)

**API Integration:**
- `GET /api/configmaps?namespace=X`
- `POST /api/configmap/update`
- `DELETE /api/configmap/delete`

---

#### `/secrets` - Secrets (`routes/Secrets.tsx` - 49KB)

**Features:**
- Secret list with type indicators
- Masked data display
- Base64 decode view
- Secret rotation tracking

**API Integration:**
- `GET /api/secrets?namespace=X`
- `GET /api/secret/details?namespace=X&name=Y`
- `POST /api/secret/update`
- `DELETE /api/secret/delete`

---

#### `/storage` - Storage (`routes/Storage.tsx` - 69KB)
PersistentVolume and PersistentVolumeClaim management.

**API Integration:**
- `GET /api/pvs` - List PersistentVolumes
- `GET /api/pvcs?namespace=X` - List PVCs

---

#### `/certificates` - Certificates (`routes/Certificates.tsx` - 23KB)
TLS certificate management and expiry tracking.

**API Integration:**
- `GET /api/certificates?namespace=X`

---

### Cluster Administration

#### `/namespaces` - Namespaces (`routes/Namespaces.tsx` - 27KB)

**API Integration:**
- `GET /api/namespaces`
- `POST /api/namespace/create`
- `DELETE /api/namespace/delete`

---

#### `/nodes` - Nodes (`routes/Nodes.tsx` - 43KB)
Node health, capacity, and resource allocation.

**Features:**
- Node list with ready/not ready status
- CPU/Memory capacity and usage
- Taints and labels
- Pod allocation per node
- Node drain/cordon controls

**API Integration:**
- `GET /api/nodes`
- `GET /api/node/details?name=X`
- `POST /api/node/cordon`
- `POST /api/node/drain`

---

#### `/resource-map` - ResourceMap (`routes/ResourceMap.tsx` - 28KB)
Interactive resource relationship visualization.

**API Integration:**
- `GET /api/resourcemap`

---

#### `/hpa` - HorizontalPodAutoscaler (`routes/HPA.tsx` - 41KB)

**API Integration:**
- `GET /api/hpas?namespace=X`

---

#### `/pdb` - PodDisruptionBudget (`routes/PDB.tsx` - 36KB)

**API Integration:**
- `GET /api/pdbs?namespace=X`

---

### Security & Access Control

#### `/rbac` - RBAC
Role-based access control visualization.

**API Integration:**
- `GET /api/roles?namespace=X`
- `GET /api/clusterroles`
- `GET /api/rolebindings?namespace=X`
- `GET /api/clusterrolebindings`

---

#### `/security` - Security (`routes/Security.tsx` - 52KB)
Security posture and vulnerability analysis.

**Features:**
- Privileged container detection
- Missing security context warnings
- Image vulnerability scanning
- Network policy coverage
- RBAC recommendations

**API Integration:**
- `GET /api/security` - Security analysis

---

#### `/service-accounts` - ServiceAccounts (`routes/ServiceAccounts.tsx` - 21KB)

**API Integration:**
- `GET /api/service-accounts?namespace=X`

---

### Intelligence & Insights

#### `/incidents` - Incidents (`routes/Incidents.tsx` - 34KB)
AI-powered incident detection and management.

**Features:**
- Incident list table with severity
- Filter by severity (Critical, High, Medium, Low)
- Incident timeline
- Root cause analysis
- Recommended fixes
- Auto-remediation controls

**API Integration:**
- `GET /api/incidents/v2` - List incidents with AI insights
- `GET /api/incidents/{id}` - Incident details
- `POST /api/incidents/refresh` - Force refresh
- `POST /api/incidents/fix-preview` - Preview recommended fixes
- `POST /api/incidents/fix-apply` - Apply fix

**Components Used:**
- `IncidentTable` (64KB)
- `IncidentDetailView` (16KB)
- `FixPreviewModal` (20KB)
- `RootCauseExplanation`
- `RecommendedFixes`

---

#### `/anomalies` - Anomalies (`routes/Anomalies.tsx` - 45KB)
AI/ML-based anomaly detection.

**Features:**
- Anomaly detection using ML models
- Pattern recognition
- Trend analysis
- Anomaly severity classification

**API Integration:**
- `GET /api/brain/ml/predictions` - ML predictions
- `GET /api/brain/ml/summary` - ML summary

---

#### `/timeline` - Timeline (`routes/Timeline.tsx` - 10KB)
Event timeline reconstruction.

**API Integration:**
- `GET /api/brain/timeline` - Incident timeline

---

#### `/cost` - Cost (`routes/Cost.tsx` - 24KB)
Cost analysis and resource optimization.

**API Integration:**
- `GET /api/cost/analysis` - Cost breakdown

---

#### `/drift` - Drift (`routes/Drift.tsx` - 14KB)
Configuration drift detection.

**API Integration:**
- `GET /api/drift/analysis` - Drift analysis

---

#### `/security` - Security Insights
Security recommendations and compliance.

---

#### `/continuity` - Continuity (`routes/Continuity.tsx` - 8KB)
Business continuity planning.

**API Integration:**
- `GET /api/continuity/summary`

---

### AI & Automation

#### `/ai-assistant` - AIAssistant
Interactive AI chat interface.

**API Integration:**
- `POST /api/ai/chat` - Send message
- `GET /api/ai/providers` - List providers

---

#### `/autofix` - AutoFix (`routes/AutoFix.tsx` - 42KB)
Automated remediation engine.

**Features:**
- Auto-fix rule management
- Approval workflow
- Execution history
- Rollback capability

**API Integration:**
- `GET /api/incidents/auto-remediation/status`
- `POST /api/incidents/auto-remediation/enable`
- `POST /api/incidents/auto-remediation/disable`
- `GET /api/incidents/auto-remediation/decisions`

---

#### `/sre-agent` - SREAgent (`routes/SREAgent.tsx` - 26KB)
Autonomous SRE agent capabilities.

---

#### `/ai-agents` - AIAgents (`routes/AIAgents.tsx` - 11KB)
AI agent configuration and management.

---

#### `/knowledge-bank` - KnowledgeBank (`routes/KnowledgeBank.tsx` - 14KB)
Knowledge base for incident resolution.

**API Integration:**
- `GET /api/incidents/runbooks` - List runbooks

---

### Machine Learning

#### `/training-jobs` - TrainingJobs
ML training job management.

**API Integration:**
- `POST /api/ml/jobs/create` - Create job
- `GET /api/ml/jobs/list` - List jobs
- `GET /api/ml/jobs/logs` - Job logs
- `WebSocket /api/ml/jobs/logs/ws` - Stream logs

---

#### `/inference-services` - InferenceServices
ML model inference endpoints.

**API Integration:**
- `POST /api/inference/create`
- `GET /api/inference/list`
- `POST /api/inference/test`

---

#### `/mlflow` - MLflow
MLflow integration for experiment tracking.

**API Integration:**
- `GET /api/mlflow/status` - Check status
- `POST /api/mlflow/install` - Install MLflow
- `Any /api/mlflow/proxy/*` - Proxy to MLflow API

---

#### `/feast` - Feast
Feast feature store integration.

**API Integration:**
- `GET /api/feast/status`
- `POST /api/feast/install`

---

#### `/gpu-dashboard` - GPUDashboard
GPU resource monitoring.

**API Integration:**
- `GET /api/gpu/status`
- `GET /api/gpu/nodes`
- `GET /api/gpu/metrics`

---

### Platform & Administration

#### `/settings` - Settings (`routes/Settings.tsx` - 84KB)
Application configuration and preferences.

**Sections:**
- General settings
- Feature flags (50+ toggles)
- Refresh intervals
- AI provider configuration
- Notification preferences
- Theme settings
- Database backup
- Telemetry consent

**API Integration:**
- `GET /api/settings` - Load settings
- `POST /api/settings` - Save settings
- `GET /api/database/backup/status`
- `POST /api/database/backup/now`

---

#### `/users` - UserManagement
User and permission management.

---

#### `/plugins` - Plugins (`routes/Plugins.tsx` - 52KB)
Plugin management and marketplace.

**API Integration:**
- `GET /api/plugins/list`
- `POST /api/plugins/install`
- `POST /api/plugins/enable`

---

#### `/connectors` - Connectors (`routes/Connectors.tsx` - 21KB)
External service integrations.

---

#### `/terminal` - Terminal
Full-screen terminal interface.

**API Integration:**
- `WebSocket /api/local/terminal`

---

### Apps & Marketplace

#### `/apps` - Apps (`routes/Apps.tsx` - 122KB)
Application marketplace and custom app deployment.

**Features:**
- App catalog browser
- Category filtering
- Search and filter
- One-click installation
- Custom app deployment (YAML/Helm)
- Installed app management
- App uninstall

**API Integration:**
- `GET /api/apps` - List available apps
- `GET /api/apps/installed` - List installed apps
- `POST /api/apps/install` - Install app
- `POST /api/apps/uninstall` - Uninstall app
- `POST /api/custom-apps/preview` - Preview custom app
- `POST /api/custom-apps/deploy` - Deploy custom app

**App Categories:**
- Kubernetes Essentials (metrics-server, cert-manager)
- Observability (Prometheus, Grafana, Loki)
- Security (Falco, Trivy, OPA)
- Databases (PostgreSQL, MySQL, Redis)
- Machine Learning (Kubeflow, MLflow)
- Service Mesh (Istio, Linkerd)
- Local Cluster (k3s, kind, minikube)

---

#### `/connect` - Connect
Cluster connection wizard.

---

#### `/cluster-manager` - ClusterManager / ClusterManagerSimple
Multi-cluster management interface.

**Features:**
- List all kubeconfig contexts
- Cluster reachability status
- Active cluster indicator
- Cluster switching
- Cluster health status
- Troubleshooting instructions

**API Integration:**
- `GET /api/v2/clusters` - List clusters
- `POST /api/v2/clusters/switch` - Switch cluster
- `GET /api/v2/clusters/health` - Health check
- `GET /api/v2/clusters/refresh` - Refresh list

---

### Integrations

#### `/kiali` - Kiali
Service mesh visualization (Istio/Linkerd).

**API Integration:**
- `GET /api/integrations/kiali/status`
- `POST /api/integrations/kiali/install`
- `Any /api/kiali/proxy/*` - Proxy to Kiali

---

### Logs & Events

#### `/logs` - Logs (`routes/Logs.tsx` - 14KB)
Centralized log aggregation.

**API Integration:**
- `GET /api/pod/logs`

---

#### `/events` - Events (`routes/Events.tsx` - 14KB)
Kubernetes event stream.

**API Integration:**
- `GET /api/events`
- `GET /api/event-monitored` - Monitored events
- `GET /api/event-stats` - Event statistics

---

### Custom Resources

#### `/custom-resources` - CustomResources
CRD and custom resource instance management.

**API Integration:**
- `GET /api/custom-resources` - List CRDs
- `GET /api/custom-resources/{crd}/instances` - List instances

---

---

## Backend Architecture

### Directory Structure

```
/ (root)
├── main.go                 # Application entry point
├── app.go                 # App struct and initialization
├── cluster_manager.go     # Cluster management (legacy)
├── cluster_manager_simple.go  # Simplified cluster manager
├── security.go            # Authentication and encryption
├── web_*.go               # API route handlers (30+ files)
├── intelligence/          # AI/ML intelligence engine
├── events/               # Event monitoring
├── metrics/              # Metrics collection
└── web/                  # Embedded frontend assets
    └── dist/
```

---

## Backend API Routes (200+ endpoints)

### 1. Cluster Management Routes

#### `/api/v2/clusters/*` (Simple Cluster Manager)

| Method | Endpoint | Handler | Description |
|--------|----------|---------|-------------|
| GET | `/api/v2/clusters` | `handleClustersList()` | List all kubeconfig clusters |
| POST | `/api/v2/clusters/switch` | `handleClusterSwitch()` | Switch to different cluster |
| GET | `/api/v2/clusters/health` | `handleClusterHealthSimple()` | Check cluster health |
| GET | `/api/v2/clusters/refresh` | `handleRefreshClustersList()` | Force refresh cluster list |

**File:** `web_clusters_simple.go`

**Response Format:**
```json
{
  "clusters": [
    {
      "name": "production-cluster",
      "contextName": "gke_project_us-central1_prod",
      "isActive": true,
      "isReachable": true,
      "kubeconfigPath": "~/.kube/config",
      "error": null
    }
  ],
  "currentCluster": { /* active cluster */ }
}
```

---

#### `/api/contexts/*` (Context Management)

| Method | Endpoint | Handler | Description |
|--------|----------|---------|-------------|
| GET | `/api/contexts` | `handleContexts()` | List available contexts |
| GET | `/api/contexts/current` | `handleCurrentContext()` | Get current context |
| POST | `/api/contexts/switch` | `handleSwitchContext()` | Switch context |

**File:** `web_misc.go`

---

### 2. Kubernetes Resource Routes

All resource endpoints follow a consistent pattern:

```
GET    /api/{resource}                    # List resources
GET    /api/{resource}/details            # Get resource details
GET    /api/{resource}/yaml               # Get resource YAML
GET    /api/{resource}/describe           # kubectl describe output
POST   /api/{resource}/update             # Update resource
DELETE /api/{resource}/delete             # Delete resource
POST   /api/{resource}s/bulk/restart      # Bulk restart
DELETE /api/{resource}s/bulk/delete       # Bulk delete
```

#### Pod Routes (`/api/pod/*` & `/api/pods/*`)

| Method | Endpoint | Handler | Description |
|--------|----------|---------|-------------|
| GET | `/api/pods` | `handlePods()` | List pods (with namespace filter) |
| GET | `/api/pods/metrics` | `handlePodMetrics()` | Get pod metrics |
| GET | `/api/pod/details` | `handlePodDetails()` | Get pod details |
| GET | `/api/pod/yaml` | `handlePodYAML()` | Get pod YAML |
| GET | `/api/pod/describe` | `handlePodDescribe()` | Describe pod |
| POST | `/api/pod/update` | `handlePodUpdate()` | Update pod |
| POST | `/api/pod/restart` | `handlePodRestart()` | Restart pod |
| DELETE | `/api/pod/delete` | `handlePodDelete()` | Delete pod |
| POST | `/api/pod/exec` | `handlePodExec()` | Execute command in pod |
| GET | `/api/pod/logs` | `handlePodLogs()` | Get pod logs |
| WebSocket | `/api/pod/terminal` | `handlePodTerminalWS()` | Interactive terminal |

**File:** `web_resources.go`

**Query Parameters:**
- `namespace` - Filter by namespace
- `name` - Resource name
- `container` - Container name (for logs/exec)
- `follow` - Follow logs (true/false)
- `tailLines` - Number of log lines

---

#### Deployment Routes (`/api/deployment/*`)

| Method | Endpoint | Handler | Description |
|--------|----------|---------|-------------|
| GET | `/api/deployments` | `handleDeployments()` | List deployments |
| GET | `/api/deployment/details` | `handleDeploymentDetails()` | Get deployment details |
| POST | `/api/deployment/scale` | `handleDeploymentScale()` | Scale replicas |
| POST | `/api/deployment/restart` | `handleDeploymentRestart()` | Restart deployment |
| POST | `/api/deployments/bulk/restart` | `handleBulkDeploymentRestart()` | Bulk restart |
| DELETE | `/api/deployments/bulk/delete` | `handleBulkDeploymentDelete()` | Bulk delete |

**File:** `web_resources.go`

---

#### Service Routes (`/api/service/*`)

| Method | Endpoint | Handler | Description |
|--------|----------|---------|-------------|
| GET | `/api/services` | `handleServices()` | List services |
| GET | `/api/service/details` | `handleServiceDetails()` | Get service details |

**File:** `web_resources.go`

**Response Format:**
```json
{
  "name": "web-service",
  "namespace": "default",
  "type": "ClusterIP",
  "clusterIP": "10.96.0.1",
  "ports": [
    {"name": "http", "port": 80, "targetPort": 8080, "protocol": "TCP"}
  ],
  "selector": {"app": "web"},
  "endpoints": ["10.244.1.5:8080", "10.244.2.8:8080"]
}
```

---

**Other Resource Routes:**
- StatefulSets: `/api/statefulset/*`
- DaemonSets: `/api/daemonset/*`
- Jobs: `/api/job/*`
- CronJobs: `/api/cronjob/*`
- Ingresses: `/api/ingress/*`
- NetworkPolicies: `/api/networkpolic*`
- ConfigMaps: `/api/configmap/*`
- Secrets: `/api/secret/*`
- Namespaces: `/api/namespace/*`
- Nodes: `/api/node/*`
- HPAs: `/api/hpa/*`
- PDBs: `/api/pdb/*`
- ServiceAccounts: `/api/service-account/*`
- Certificates: `/api/certificate*`

**Files:** `web_resources.go`, `web_access_control.go`

---

### 3. Incident & Intelligence Routes

#### Incidents V2 (`/api/incidents*`)

| Method | Endpoint | Handler | Description |
|--------|----------|---------|-------------|
| GET | `/api/incidents/v2` | `handleIncidentsV2()` | List incidents with AI insights |
| GET | `/api/incidents/{id}` | `handleIncidentV2ByID()` | Get incident details |
| GET | `/api/incidents/summary` | `handleIncidentsV2Summary()` | Get incident statistics |
| GET | `/api/incidents/patterns` | `handleIncidentsV2Patterns()` | Get AI-detected patterns |
| POST | `/api/incidents/refresh` | `handleIncidentsV2Refresh()` | Force incident scan |
| POST | `/api/incidents/fix-preview` | `handleFixPreview()` | Preview recommended fixes |
| POST | `/api/incidents/fix-apply` | `handleFixApply()` | Apply recommended fix |

**File:** `web_incidents_v2.go`

**Incident Detection:**
- Pod crash loops (CrashLoopBackOff)
- ImagePull errors
- OOMKilled containers
- Persistent failures
- High restart counts
- Node NotReady
- Deployment rollout failures

**Response Format:**
```json
{
  "incidents": [
    {
      "id": "inc-pod_crash_loop-1234567890",
      "type": "pod_crash_loop",
      "severity": "high",
      "title": "Pod crash loop in default/web-app-xyz",
      "description": "Container 'web' is crashing repeatedly",
      "evidence": {
        "podName": "web-app-xyz",
        "namespace": "default",
        "containerName": "web",
        "exitCode": 137,
        "restartCount": 15,
        "lastEvent": "Back-off restarting failed container"
      },
      "rootCause": "Container exceeded memory limit (OOMKilled)",
      "recommendedFixes": [
        {
          "action": "increase_memory_limit",
          "description": "Increase memory limit to 512Mi",
          "impact": "low",
          "preview": "spec.containers[0].resources.limits.memory: 256Mi -> 512Mi"
        }
      ],
      "timestamp": "2026-02-15T19:45:29Z"
    }
  ],
  "summary": {
    "total": 28,
    "bySeverity": {
      "critical": 2,
      "high": 8,
      "medium": 12,
      "low": 6
    }
  }
}
```

---

#### Auto-Remediation (`/api/incidents/auto-remediation/*`)

| Method | Endpoint | Handler | Description |
|--------|----------|---------|-------------|
| GET | `/api/incidents/auto-remediation/status` | `handleAutoRemediationStatus()` | Get auto-remediation status |
| POST | `/api/incidents/auto-remediation/enable` | `handleAutoRemediationEnable()` | Enable auto-remediation |
| POST | `/api/incidents/auto-remediation/disable` | `handleAutoRemediationDisable()` | Disable auto-remediation |
| GET | `/api/incidents/auto-remediation/decisions` | `handleAutoRemediationDecisions()` | Get remediation decisions |

**File:** `web_incidents_v2.go`

---

#### Learning System (`/api/incidents/learning/*`)

| Method | Endpoint | Handler | Description |
|--------|----------|---------|-------------|
| GET | `/api/incidents/learning/clusters` | `handleLearningClusters()` | Get cluster learning data |
| GET | `/api/incidents/learning/patterns` | `handleLearningPatterns()` | Get learned patterns |
| GET | `/api/incidents/learning/trends` | `handleLearningTrends()` | Get incident trends |
| GET | `/api/incidents/learning/similar` | `handleLearningSimilar()` | Find similar incidents |
| GET | `/api/incidents/runbooks` | `handleRunbooks()` | Get runbooks |
| POST | `/api/incidents/feedback` | `handleFeedback()` | Submit incident feedback |

---

#### Brain/AI Intelligence (`/api/brain/*`)

| Method | Endpoint | Handler | Description |
|--------|----------|---------|-------------|
| GET | `/api/brain/timeline` | `handleBrainTimeline()` | Get incident timeline |
| GET | `/api/brain/oom-insights` | `handleBrainOOMInsights()` | Get OOM insights |
| GET | `/api/brain/summary` | `handleBrainSummary()` | Get brain summary |
| GET | `/api/brain/ml/timeline` | `handleBrainMLTimeline()` | ML-based timeline |
| GET | `/api/brain/ml/predictions` | `handleBrainMLPredictions()` | ML predictions |
| GET | `/api/brain/ml/summary` | `handleBrainMLSummary()` | ML summary |

**File:** `web_brain.go`, `web_brain_ml.go`

---

### 4. Metrics & Observability Routes

#### Metrics (`/api/metrics*` & `/ws/metrics`)

| Method | Endpoint | Handler | Description |
|--------|----------|---------|-------------|
| GET | `/api/metrics` | `handleMetrics()` | Get cluster metrics snapshot |
| WebSocket | `/ws/metrics` | `handleMetricsWebSocket()` | Real-time metrics stream |
| GET | `/api/metrics/snapshot` | `handleMetricsSnapshot()` | Get metrics snapshot |
| GET | `/api/metrics/status` | `handleMetricsStatus()` | Get metrics system status |

**File:** `web_metrics.go`

**WebSocket Protocol:**
```json
// Client subscribes to metrics
{"action": "subscribe", "interval": 5000}

// Server sends metrics every interval
{
  "timestamp": "2026-02-15T19:45:30Z",
  "nodes": [
    {
      "name": "node-1",
      "cpuUsage": 45.2,
      "memoryUsage": 68.5,
      "cpuCapacity": 4000,
      "memoryCapacity": 16384
    }
  ],
  "pods": [
    {
      "namespace": "default",
      "name": "web-app-xyz",
      "cpuUsage": 120,
      "memoryUsage": 256
    }
  ]
}
```

---

#### Events (`/api/events*`)

| Method | Endpoint | Handler | Description |
|--------|----------|---------|-------------|
| GET | `/api/events` | `handleEvents()` | Get cluster events |
| GET | `/api/event-log/errors` | `handleLogErrors()` | Get error logs |
| GET | `/api/event-monitored` | `handleMonitoredEvents()` | Get monitored events |
| GET | `/api/event-grouped` | `handleGroupedEvents()` | Get grouped events |
| GET | `/api/event-stats` | `handleEventStats()` | Get event statistics |

**File:** `web_event_*.go`

---

#### Traffic Metrics (`/api/traffic/*`)

| Method | Endpoint | Handler | Description |
|--------|----------|---------|-------------|
| GET | `/api/traffic/metrics` | `handleTrafficMetrics()` | Get traffic metrics |

**File:** `web_traffic_metrics.go`

---

### 5. Authentication & Authorization Routes

#### Authentication (`/api/auth/*`)

| Method | Endpoint | Handler | Description |
|--------|----------|---------|-------------|
| POST | `/api/auth/login` | `handleLogin()` | User login |
| POST | `/api/auth/register` | `handleRegister()` | User registration |
| POST | `/api/auth/logout` | `handleLogout()` | User logout |
| GET | `/api/auth/me` | `handleGetCurrentUser()` | Get current user |
| GET | `/api/auth/validate-token` | `handleValidateSessionToken()` | Validate token |

**File:** `web_server.go`

**Authentication Flow:**
1. User logs in with credentials
2. Backend generates session token
3. Token returned in response
4. Frontend stores token in localStorage
5. Token included in subsequent requests (Authorization header)
6. Backend validates token on each request

---

### 6. Terminal & Execution Routes

#### Terminal (`/api/pod/terminal`, `/api/local/terminal`)

| Method | Endpoint | Handler | Description |
|--------|----------|---------|-------------|
| WebSocket | `/api/pod/terminal` | `handlePodTerminalWS()` | Interactive pod shell |
| WebSocket | `/api/local/terminal` | `handleLocalTerminalWS()` | Local machine terminal |
| GET | `/api/terminal/shells` | `handleGetAvailableShells()` | Get available shells |
| GET | `/api/terminal/preferences` | `handleGetTerminalPreferences()` | Get terminal preferences |

**File:** `web_server.go`

**WebSocket Protocol (xterm.js):**
```
// Client connects
ws://localhost:3003/api/pod/terminal?namespace=default&pod=web-xyz&container=web

// Client sends input (JSON)
{"type": "stdin", "data": "ls -la\n"}

// Server sends output (JSON)
{"type": "stdout", "data": "total 48\ndrwxr-xr-x..."}
```

---

#### Execution Streaming (`/api/execution/*`)

| Method | Endpoint | Handler | Description |
|--------|----------|---------|-------------|
| WebSocket | `/api/execution/stream` | `handleExecutionStream()` | Stream execution output |
| GET | `/api/executions` | `handleExecutionList()` | List executions |
| GET | `/api/executions/logs` | `handleExecutionLogs()` | Get execution logs |

**File:** `web_execution.go`

---

### 7. ML/AI Routes

#### ML Jobs (`/api/ml/jobs/*`)

| Method | Endpoint | Handler | Description |
|--------|----------|---------|-------------|
| POST | `/api/ml/jobs/create` | `handleMLJobCreate()` | Create ML job |
| GET | `/api/ml/jobs/list` | `handleMLJobList()` | List ML jobs |
| GET | `/api/ml/jobs/get` | `handleMLJobGet()` | Get ML job details |
| DELETE | `/api/ml/jobs/delete` | `handleMLJobDelete()` | Delete ML job |
| GET | `/api/ml/jobs/logs` | `handleMLJobLogs()` | Get job logs |
| WebSocket | `/api/ml/jobs/logs/ws` | `handleMLJobLogsWS()` | Stream job logs |

**File:** `web_ml_jobs.go`

---

#### Inference Services (`/api/inference*`)

| Method | Endpoint | Handler | Description |
|--------|----------|---------|-------------|
| POST | `/api/inference/create` | `handleInferenceCreate()` | Create inference service |
| GET | `/api/inference/list` | `handleInferenceList()` | List inference services |
| GET | `/api/inference/get` | `handleInferenceGet()` | Get inference details |
| DELETE | `/api/inference/delete` | `handleInferenceDelete()` | Delete inference service |
| POST | `/api/inference/test` | `handleInferenceTest()` | Test inference endpoint |

**File:** `web_inference.go`

---

### 8. GitOps & Deployment Routes

#### Helm Integration (`/api/plugins/helm/*`)

| Method | Endpoint | Handler | Description |
|--------|----------|---------|-------------|
| GET | `/api/plugins/helm/releases` | `handleHelmReleases()` | List Helm releases |
| GET | `/api/plugins/helm/release` | `handleHelmReleaseDetails()` | Get release details |
| GET | `/api/plugins/helm/history` | `handleHelmReleaseHistory()` | Get release history |
| POST | `/api/plugins/helm/rollback` | `handleHelmRollback()` | Rollback release |

**File:** `web_gitops.go`

---

#### ArgoCD Integration (`/api/plugins/argocd/*`)

| Method | Endpoint | Handler | Description |
|--------|----------|---------|-------------|
| GET | `/api/plugins/argocd/apps` | `handleArgoCDApps()` | List ArgoCD apps |
| GET | `/api/plugins/argocd/app` | `handleArgoCDAppDetails()` | Get app details |
| POST | `/api/plugins/argocd/sync` | `handleArgoCDSync()` | Sync app |
| POST | `/api/plugins/argocd/refresh` | `handleArgoCDRefresh()` | Refresh app |

**File:** `web_gitops.go`

---

### 9. Integration Routes

#### Kiali (`/api/integrations/kiali/*` & `/api/kiali/*`)

| Method | Endpoint | Handler | Description |
|--------|----------|---------|-------------|
| GET | `/api/integrations/kiali/status` | `handleKialiStatus()` | Check Kiali status |
| POST | `/api/integrations/kiali/install` | `handleKialiInstall()` | Install Kiali |
| Any | `/api/kiali/proxy/*` | `handleKialiProxy()` | Proxy Kiali API |

**File:** `web_kiali.go`

---

#### MLflow (`/api/mlflow/*`)

| Method | Endpoint | Handler | Description |
|--------|----------|---------|-------------|
| GET | `/api/mlflow/status` | `handleMLflowStatus()` | Check MLflow status |
| POST | `/api/mlflow/install` | `handleMLflowInstall()` | Install MLflow |
| Any | `/api/mlflow/proxy/*` | `ProxyMLflowAPI()` | Proxy MLflow API |

**File:** `web_mlflow.go`

---

#### Feast (`/api/feast/*`)

| Method | Endpoint | Handler | Description |
|--------|----------|---------|-------------|
| GET | `/api/feast/status` | `handleFeastStatus()` | Check Feast status |
| POST | `/api/feast/install` | `handleFeastInstall()` | Install Feast |

**File:** `web_feast.go`

---

#### GPU Support (`/api/gpu/*`)

| Method | Endpoint | Handler | Description |
|--------|----------|---------|-------------|
| GET | `/api/gpu/status` | `handleGPUStatus()` | Get GPU status |
| GET | `/api/gpu/nodes` | `handleGPUNodes()` | List GPU nodes |
| GET | `/api/gpu/metrics` | `handleGPUMetrics()` | Get GPU metrics |
| POST | `/api/gpu/install` | `handleGPUInstall()` | Install GPU support |

**File:** `web_gpu.go`

---

### 10. System & Administration Routes

#### Port Forwarding (`/api/portforward/*`)

| Method | Endpoint | Handler | Description |
|--------|----------|---------|-------------|
| POST | `/api/portforward/start` | `handlePortForwardStart()` | Start port forward |
| POST | `/api/portforward/stop` | `handlePortForwardStop()` | Stop port forward |
| GET | `/api/portforward/list` | `handlePortForwardList()` | List active forwards |

**File:** `web_portforward.go`

---

#### Database Backup (`/api/database/backup/*`)

| Method | Endpoint | Handler | Description |
|--------|----------|---------|-------------|
| GET | `/api/database/backup/status` | `handleBackupStatus()` | Get backup status |
| POST | `/api/database/backup/now` | `handleBackupNow()` | Trigger backup |
| GET | `/api/database/backup/list` | `handleBackupList()` | List backups |
| POST | `/api/database/backup/restore` | `handleBackupRestore()` | Restore backup |

**File:** `web_database_backup.go`

---

#### Notifications (`/api/notifications*`)

| Method | Endpoint | Handler | Description |
|--------|----------|---------|-------------|
| GET | `/api/notifications` | `handleNotificationsList()` | List notifications |
| POST | `/api/notifications/mark-read` | `handleNotificationMarkRead()` | Mark as read |
| POST | `/api/notifications/mark-all-read` | `handleNotificationMarkAllRead()` | Mark all as read |
| DELETE | `/api/notifications/delete` | `handleNotificationDelete()` | Delete notification |
| GET | `/api/notifications/unread-count` | `handleNotificationUnreadCount()` | Get unread count |

**File:** `web_notifications.go`

---

#### Security Analysis (`/api/security*`)

| Method | Endpoint | Handler | Description |
|--------|----------|---------|-------------|
| GET | `/api/security` | `handleSecurityAnalysis()` | Perform security analysis |

**File:** `web_security.go`

**Analysis Includes:**
- Privileged containers
- Missing security contexts
- Image vulnerabilities
- Network policy coverage
- RBAC recommendations

---

#### Updates (`/api/updates/*`)

| Method | Endpoint | Handler | Description |
|--------|----------|---------|-------------|
| GET | `/api/updates/check` | `handleCheckUpdates()` | Check for updates |
| POST | `/api/updates/install` | `handleInstallUpdate()` | Install update |
| GET | `/api/update/auto-check` | `handleAutoCheckUpdates()` | Auto-check updates |

**File:** `web_misc.go`, `web_update_handlers.go`

---

#### System Status (`/api/status*`)

| Method | Endpoint | Handler | Description |
|--------|----------|---------|-------------|
| GET | `/api/status` | `handleConnectionStatus()` | Get connection status |
| GET | `/api/cache/stats` | `handleCacheStats()` | Get cache statistics |
| GET | `/api/capabilities` | `handleCapabilities()` | Get system capabilities |

**File:** `web_misc.go`

**Response Format:**
```json
{
  "connected": true,
  "clusterName": "production-cluster",
  "version": "1.7.59",
  "kubeVersion": "v1.28.5",
  "nodeCount": 6,
  "namespaceCount": 42
}
```

---

### 11. Apps & Custom Applications

#### Built-in Apps (`/api/apps/*`)

| Method | Endpoint | Handler | Description |
|--------|----------|---------|-------------|
| GET | `/api/apps` | `handleApps()` | List available apps |
| GET | `/api/apps/installed` | `handleInstalledApps()` | List installed apps |
| POST | `/api/apps/install` | `handleInstallApp()` | Install app |
| POST | `/api/apps/uninstall` | `handleUninstallApp()` | Uninstall app |

---

#### Custom Apps (`/api/custom-apps/*`)

| Method | Endpoint | Handler | Description |
|--------|----------|---------|-------------|
| POST | `/api/custom-apps/preview` | `handleCustomAppPreview()` | Preview custom app |
| POST | `/api/custom-apps/deploy` | `handleCustomAppDeploy()` | Deploy custom app |
| GET | `/api/custom-apps/list` | `handleCustomAppList()` | List custom apps |
| DELETE | `/api/custom-apps/delete` | `handleCustomAppDelete()` | Delete custom app |

**File:** `web_custom_apps.go`

---

### 12. Custom Resources

#### CRD Management (`/api/custom-resources/*`)

| Method | Endpoint | Handler | Description |
|--------|----------|---------|-------------|
| GET | `/api/custom-resources` | `handleCustomResourceDefinitions()` | List CRDs |
| GET | `/api/custom-resources/{crd}/instances` | `handleCustomResourceInstances()` | List CRD instances |
| GET | `/api/custom-resources/{crd}/{name}` | `handleCustomResourceInstanceDetails()` | Get instance details |
| GET | `/api/custom-resources/{crd}/{name}/yaml` | `handleCustomResourceInstanceYAML()` | Get instance YAML |
| POST | `/api/custom-resources/{crd}/{name}/update` | `handleCustomResourceInstanceUpdate()` | Update instance |
| DELETE | `/api/custom-resources/{crd}/{name}/delete` | `handleCustomResourceInstanceDelete()` | Delete instance |

**File:** `web_custom_resources.go`

---

### 13. WebSocket Endpoints Summary

| Endpoint | Purpose | Protocol | File |
|----------|---------|----------|------|
| `/ws` | Real-time cluster updates | JSON | web_server.go |
| `/ws/metrics` | Streaming metrics | JSON | web_metrics.go |
| `/api/pod/terminal` | Interactive pod shell | xterm.js | web_server.go |
| `/api/local/terminal` | Local system terminal | xterm.js | web_server.go |
| `/api/execution/stream` | Execution output streaming | JSON | web_execution.go |
| `/api/ml/jobs/logs/ws` | ML job logs streaming | JSON | web_ml_jobs.go |

---

## Frontend-Backend Communication

### Communication Patterns

#### 1. REST API Calls

Standard HTTP requests for CRUD operations.

**Example: Fetching Pods**
```typescript
// Frontend (ui/solid/src/routes/Pods.tsx)
const fetchPods = async (namespace: string) => {
  const response = await fetch(`/api/pods?namespace=${namespace}`);
  const pods = await response.json();
  return pods;
};
```

**Backend Handler (web_resources.go)**
```go
func (ws *WebServer) handlePods(w http.ResponseWriter, r *http.Request) {
    namespace := r.URL.Query().Get("namespace")

    // Get pods from Kubernetes API
    pods, err := ws.app.clientset.CoreV1().Pods(namespace).List(...)

    // Return JSON response
    json.NewEncoder(w).Encode(pods)
}
```

---

#### 2. WebSocket Real-Time Communication

Bidirectional streaming for live updates.

**Example: Metrics Streaming**
```typescript
// Frontend (ui/solid/src/stores/metricsStore.ts)
const ws = new WebSocket('ws://localhost:3003/ws/metrics');

ws.onopen = () => {
  // Subscribe to metrics with 5s interval
  ws.send(JSON.stringify({action: 'subscribe', interval: 5000}));
};

ws.onmessage = (event) => {
  const metrics = JSON.parse(event.data);
  setMetrics(metrics);
};
```

**Backend Handler (web_metrics.go)**
```go
func (ws *WebServer) handleMetricsWebSocket(conn *websocket.Conn) {
    // Read subscription request
    var req SubscribeRequest
    conn.ReadJSON(&req)

    // Start metrics streaming loop
    ticker := time.NewTicker(time.Duration(req.Interval) * time.Millisecond)
    for range ticker.C {
        metrics := ws.collectMetrics()
        conn.WriteJSON(metrics)
    }
}
```

---

#### 3. State Management with TanStack Query

Caching and automatic refetching.

**Example: Cluster List**
```typescript
// Frontend (ui/solid/src/routes/ClusterManagerSimple.tsx)
import { createQuery } from '@tanstack/solid-query';

const clusters = createQuery(() => ({
  queryKey: ['clusters'],
  queryFn: async () => {
    const response = await fetch('/api/v2/clusters');
    return response.json();
  },
  refetchInterval: 30000, // Refetch every 30s
}));
```

---

### Request/Response Flow

```
┌──────────────┐         ┌──────────────┐         ┌──────────────┐
│   Frontend   │         │   Backend    │         │  Kubernetes  │
│  (SolidJS)   │         │     (Go)     │         │   Cluster    │
└──────┬───────┘         └──────┬───────┘         └──────┬───────┘
       │                         │                         │
       │  GET /api/pods          │                         │
       ├────────────────────────>│                         │
       │                         │                         │
       │                         │  List Pods API Call     │
       │                         ├────────────────────────>│
       │                         │                         │
       │                         │  Pod List Response      │
       │                         │<────────────────────────┤
       │                         │                         │
       │  JSON Response          │                         │
       │<────────────────────────┤                         │
       │                         │                         │
       │  Update UI              │                         │
       │                         │                         │
```

---

### Error Handling

#### Frontend Error Handling
```typescript
try {
  const response = await fetch('/api/pods');
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  const pods = await response.json();
} catch (error) {
  addNotification(error.message, 'error');
}
```

#### Backend Error Handling
```go
func (ws *WebServer) handlePods(w http.ResponseWriter, r *http.Request) {
    pods, err := ws.app.clientset.CoreV1().Pods("").List(...)
    if err != nil {
        http.Error(w, err.Error(), http.StatusInternalServerError)
        return
    }

    json.NewEncoder(w).Encode(pods)
}
```

---

## Feature Integration Map

### Complete Frontend ↔ Backend Mapping

| Feature | Frontend Component | Backend Route | WebSocket |
|---------|-------------------|---------------|-----------|
| **Dashboard** | `Dashboard.tsx` | `/api/status`, `/api/incidents/summary` | `/ws` |
| **Cluster Switcher** | `Header.tsx` | `/api/v2/clusters`, `POST /api/v2/clusters/switch` | - |
| **Pod List** | `Pods.tsx` | `/api/pods` | - |
| **Pod Logs** | `LogsModal.tsx` | `/api/pod/logs` | - |
| **Pod Terminal** | `TerminalModal.tsx` | - | `/api/pod/terminal` |
| **Deployment List** | `Deployments.tsx` | `/api/deployments` | - |
| **Service List** | `Services.tsx` | `/api/services` | - |
| **Port Forward** | `ServicePortForwardModal.tsx` | `/api/portforward/start`, `/api/portforward/stop` | - |
| **Metrics Charts** | `CpuMemChart.tsx` | `/api/metrics` | `/ws/metrics` |
| **Incident List** | `Incidents.tsx` | `/api/incidents/v2` | - |
| **Incident Details** | `IncidentDetailView.tsx` | `/api/incidents/{id}` | - |
| **Fix Preview** | `FixPreviewModal.tsx` | `/api/incidents/fix-preview` | - |
| **Fix Apply** | - | `/api/incidents/fix-apply` | `/api/execution/stream` |
| **AI Chat** | `AIChat.tsx` | `/api/ai/chat` | - |
| **Command Palette** | `CommandPalette.tsx` | - | - |
| **Notifications** | `NotificationCenter.tsx` | `/api/notifications` | - |
| **Local Terminal** | `LocalTerminal.tsx` | - | `/api/local/terminal` |
| **Execution Panel** | `ExecutionPanel.tsx` | `/api/executions` | `/api/execution/stream` |
| **ML Jobs** | `TrainingJobs.tsx` | `/api/ml/jobs/list`, `/api/ml/jobs/create` | `/api/ml/jobs/logs/ws` |
| **Apps Marketplace** | `Apps.tsx` | `/api/apps`, `/api/apps/install` | - |
| **Custom Apps** | `Apps.tsx` | `/api/custom-apps/preview`, `/api/custom-apps/deploy` | - |
| **Helm Releases** | `Apps.tsx` | `/api/plugins/helm/releases` | - |
| **Kiali Integration** | `Kiali.tsx` | `/api/integrations/kiali/status`, `/api/kiali/proxy/*` | - |
| **MLflow Integration** | `MLflow.tsx` | `/api/mlflow/status`, `/api/mlflow/proxy/*` | - |
| **GPU Dashboard** | `GPUDashboard.tsx` | `/api/gpu/status`, `/api/gpu/metrics` | - |
| **Security Analysis** | `Security.tsx` | `/api/security` | - |
| **Settings** | `Settings.tsx` | `/api/settings` | - |
| **Cluster Manager** | `ClusterManagerSimple.tsx` | `/api/v2/clusters` | - |

---

## Security & Authentication

### Authentication Flow

```
┌─────────────┐
│   User      │
└──────┬──────┘
       │
       │ 1. Login Request
       │ POST /api/auth/login
       │ {username, password}
       │
       v
┌──────────────────┐
│   Backend        │
│  (Go Server)     │
└──────┬───────────┘
       │
       │ 2. Validate Credentials
       │ Generate Session Token
       │
       v
┌──────────────────┐
│  Session Token   │
│   (JWT/UUID)     │
└──────┬───────────┘
       │
       │ 3. Return Token
       │ {token: "abc123..."}
       │
       v
┌──────────────────┐
│   Frontend       │
│ Store in         │
│ localStorage     │
└──────┬───────────┘
       │
       │ 4. Subsequent Requests
       │ Authorization: Bearer abc123...
       │
       v
┌──────────────────┐
│   Backend        │
│ Validate Token   │
│ Allow/Deny       │
└──────────────────┘
```

### Security Features

1. **Session Token Management**
   - Temporary tokens for initial access
   - Session cookie validation
   - Token expiration and refresh

2. **Kubernetes RBAC Integration**
   - Respects cluster RBAC permissions
   - User permissions mapped from service account

3. **Data Encryption**
   - Master key-based encryption for sensitive data
   - Secret masking in logs and UI

4. **HTTPS/Localhost Restrictions**
   - Terminal operations restricted to localhost
   - TLS support for production deployments

5. **Input Validation**
   - Request parameter validation
   - YAML syntax validation
   - Prevent injection attacks

---

## Development Guide

### Prerequisites

- **Go** 1.24+
- **Node.js** 18+
- **npm** or **pnpm**
- **kubectl** configured with cluster access

### Development Setup

#### 1. Clone Repository
```bash
git clone https://github.com/kubegraf/kubegraf.git
cd kubegraf
```

#### 2. Install Dependencies

**Backend:**
```bash
go mod download
```

**Frontend:**
```bash
cd ui/solid
npm install
```

#### 3. Run Development Servers

**Backend:**
```bash
go run . web --port=3003
```

**Frontend (separate terminal):**
```bash
cd ui/solid
npm run dev
```

Frontend dev server runs on `http://localhost:5173` and proxies API requests to backend on `http://localhost:3003`.

#### 4. Build for Production

**Frontend:**
```bash
cd ui/solid
npm run build
```

This creates `ui/solid/dist/` with optimized assets.

**Copy to Backend:**
```bash
mkdir -p web/dist
cp -r ui/solid/dist/* web/dist/
```

**Build Go Binary:**
```bash
go build -o kubegraf .
```

**Run Production Build:**
```bash
./kubegraf web --port=3003
```

---

### Project Structure Reference

```
kubegraf/
├── main.go                      # Application entry point
├── app.go                       # App initialization
├── cluster_manager_simple.go    # Cluster management
├── web_*.go                     # API handlers (30+ files)
├── intelligence/                # AI/ML engine
├── events/                      # Event monitoring
├── metrics/                     # Metrics collection
├── security.go                  # Auth & encryption
├── web/                         # Embedded frontend
│   └── dist/
├── ui/solid/                    # Frontend source
│   ├── src/
│   │   ├── components/         # 80+ components
│   │   ├── routes/             # 70+ pages
│   │   ├── stores/             # 22 state stores
│   │   ├── config/             # Configuration
│   │   ├── features/           # Feature modules
│   │   └── utils/              # Utilities
│   ├── package.json
│   └── vite.config.ts
├── go.mod
├── go.sum
└── README.md
```

---

### Adding a New Feature

#### Example: Add "Rollback Deployment" Feature

**1. Add Backend Route (web_resources.go)**
```go
func (ws *WebServer) handleDeploymentRollback(w http.ResponseWriter, r *http.Request) {
    namespace := r.URL.Query().Get("namespace")
    name := r.URL.Query().Get("name")
    revision := r.URL.Query().Get("revision")

    // Call kubectl rollout undo
    // ...

    json.NewEncoder(w).Encode(result)
}
```

Register route:
```go
http.HandleFunc("/api/deployment/rollback", ws.handleDeploymentRollback)
```

**2. Add Frontend Function (routes/Deployments.tsx)**
```typescript
const rollbackDeployment = async (namespace: string, name: string, revision: string) => {
  const response = await fetch(
    `/api/deployment/rollback?namespace=${namespace}&name=${name}&revision=${revision}`,
    { method: 'POST' }
  );

  if (!response.ok) throw new Error('Rollback failed');

  addNotification(`Rolled back ${name} to revision ${revision}`, 'success');
  refetchDeployments();
};
```

**3. Add UI Button**
```tsx
<button onClick={() => rollbackDeployment(namespace, name, '1')}>
  Rollback to Previous
</button>
```

---

## Architecture Decisions & Rationale

### Why SolidJS?
- **Fine-grained reactivity** - Updates only affected DOM nodes
- **No VDOM overhead** - Better performance than React
- **Small bundle size** - ~7KB runtime
- **TypeScript-first** - Excellent type safety

### Why Go Backend?
- **Excellent Kubernetes client-go library**
- **Fast compilation and execution**
- **Built-in concurrency** (goroutines)
- **Single binary distribution**
- **Cross-platform support**

### Why WebSockets?
- **Real-time updates** - Metrics, logs, terminal I/O
- **Bidirectional communication** - Client can request, server can push
- **Lower latency** - No polling overhead

### Why Embedded Frontend?
- **Single binary deployment** - No separate web server needed
- **Simplified distribution** - One file to download
- **Offline capable** - No CDN dependencies

---

## Performance Considerations

### Frontend Optimizations
- **Lazy-loaded routes** - Routes loaded on demand
- **Virtualized tables** - Render only visible rows (large pod lists)
- **Debounced search** - Reduce API calls during typing
- **Request caching** - TanStack Query caches responses
- **WebSocket connection pooling** - Reuse connections

### Backend Optimizations
- **Kubernetes watch caching** - Cache list/watch results
- **Response compression** - gzip responses
- **Connection pooling** - Reuse K8s API connections
- **Background workers** - Incident detection runs async
- **LRU cache** - 10,000 item in-memory cache

---

## Troubleshooting

### Common Issues

#### Frontend not connecting to backend
- Check CORS headers in backend
- Verify backend is running on correct port
- Check browser console for errors

#### WebSocket connection fails
- Ensure WebSocket endpoint is correct
- Check firewall/proxy settings
- Verify TLS/SSL certificates

#### Kubernetes API errors
- Verify kubeconfig is valid: `kubectl config view`
- Check RBAC permissions: `kubectl auth can-i --list`
- Test connectivity: `kubectl get nodes`

---

## Contributing

### Code Style
- **Frontend**: Prettier + ESLint
- **Backend**: gofmt + golangci-lint

### Testing
```bash
# Frontend tests
cd ui/solid
npm run test

# Backend tests
go test ./...
```

### Pull Request Process
1. Create feature branch
2. Make changes
3. Add tests
4. Update documentation
5. Submit PR

---

## Additional Resources

- [Main README](README.md)
- [Documentation Site](https://kubegraf.io/docs/)
- [GitHub Issues](https://github.com/kubegraf/kubegraf/issues)
- [Contributing Guide](CONTRIBUTING.md)

---

**End of Architecture Documentation**
