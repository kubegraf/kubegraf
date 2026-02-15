# KubeGraf Architecture Diagrams

This document contains Mermaid diagrams visualizing the KubeGraf architecture.

---

## Table of Contents

1. [System Architecture Overview](#1-system-architecture-overview)
2. [Frontend Component Hierarchy](#2-frontend-component-hierarchy)
3. [Backend API Structure](#3-backend-api-structure)
4. [Frontend-Backend Communication Flow](#4-frontend-backend-communication-flow)
5. [State Management Flow](#5-state-management-flow)
6. [Authentication Flow](#6-authentication-flow)
7. [WebSocket Communication](#7-websocket-communication)
8. [Incident Intelligence Flow](#8-incident-intelligence-flow)
9. [Execution Pipeline](#9-execution-pipeline)
10. [Cluster Switching Flow](#10-cluster-switching-flow)
11. [Port Forwarding Flow](#11-port-forwarding-flow)
12. [ML Job Workflow](#12-ml-job-workflow)

---

## 1. System Architecture Overview

```mermaid
graph TB
    subgraph "User Environment"
        User["👤 User"]
        Browser["🌐 Web Browser"]
    end

    subgraph "KubeGraf Desktop App"
        subgraph "Frontend Layer"
            SPA["SolidJS SPA<br/>80+ Components<br/>70+ Routes<br/>22 Stores"]
            Router["Router"]
            StateManager["State Management<br/>TanStack Query"]
        end

        subgraph "Backend Layer"
            WebServer["Go Web Server<br/>200+ API Routes"]
            WSServer["WebSocket Server<br/>6 Endpoints"]
            Intelligence["Intelligence Engine<br/>AI/ML"]
            MetricsCollector["Metrics Collector"]
            EventMonitor["Event Monitor"]
        end

        subgraph "Data Layer"
            Cache["LRU Cache<br/>10,000 items"]
            SQLite["SQLite DB<br/>Local Storage"]
        end
    end

    subgraph "Kubernetes Cluster"
        K8sAPI["Kubernetes API Server"]
        Pods["Pods"]
        Nodes["Nodes"]
        Services["Services"]
        Deployments["Deployments"]
    end

    User --> Browser
    Browser --> SPA
    SPA --> Router
    Router --> StateManager
    StateManager <--> WebServer
    StateManager <--> WSServer

    WebServer --> Intelligence
    WebServer --> MetricsCollector
    WebServer --> EventMonitor
    WebServer --> Cache
    WebServer --> SQLite

    WebServer --> K8sAPI
    K8sAPI --> Pods
    K8sAPI --> Nodes
    K8sAPI --> Services
    K8sAPI --> Deployments

    style User fill:#4A90E2
    style Browser fill:#50C878
    style SPA fill:#FF6B6B
    style WebServer fill:#FFA500
    style K8sAPI fill:#326CE5
```

---

## 2. Frontend Component Hierarchy

```mermaid
graph TB
    App["App.tsx<br/>Root Component"]

    subgraph "Layout Components"
        AppShell["AppShell<br/>Root Layout Container"]
        Header["Header (45KB)<br/>Top Navigation"]
        SidebarV2["SidebarV2 (16KB)<br/>Left Navigation"]
        Content["Content Area<br/>Route Renderer"]
    end

    subgraph "Header Components"
        NamespaceSelector["Namespace Selector<br/>Multi-select Dropdown"]
        ClusterSwitcher["Cluster Switcher<br/>Context Dropdown"]
        ThemeToggle["Theme Toggle<br/>Dark/Light Mode"]
        NotificationCenter["Notification Center<br/>Alerts Panel"]
        CommandPalette["Command Palette<br/>Cmd+K"]
    end

    subgraph "Sidebar Components"
        SidebarRail["Sidebar Rail<br/>Icon Navigation"]
        SidebarFlyout["Sidebar Flyout<br/>Expanded Menu"]
        QuickSwitcher["Quick Switcher<br/>Fast Navigation"]
    end

    subgraph "Route Components (70+)"
        Dashboard["Dashboard<br/>Cluster Overview"]
        Pods["Pods (118KB)<br/>Pod Management"]
        Deployments["Deployments (77KB)<br/>Deployment Management"]
        Services["Services (46KB)<br/>Service Discovery"]
        Incidents["Incidents (34KB)<br/>Incident Intelligence"]
        Apps["Apps (122KB)<br/>App Marketplace"]
        Settings["Settings (84KB)<br/>Configuration"]
    end

    subgraph "Modal Components"
        DescribeModal["Describe Modal<br/>Resource Details"]
        YAMLEditor["YAML Editor<br/>Resource Editing"]
        LogsModal["Logs Modal<br/>Pod Logs"]
        TerminalModal["Terminal Modal<br/>Interactive Shell"]
        FixPreviewModal["Fix Preview Modal (20KB)<br/>Incident Fix Preview"]
    end

    subgraph "Shared Components"
        VirtualizedTable["Virtualized Table<br/>Large Dataset Rendering"]
        ExecutionPanel["Execution Panel (24KB)<br/>Real-time Progress"]
        AIChat["AI Chat (15KB)<br/>Assistant Interface"]
        MetricsChart["CPU/Mem Chart (21KB)<br/>Metrics Visualization"]
    end

    App --> AppShell
    AppShell --> Header
    AppShell --> SidebarV2
    AppShell --> Content

    Header --> NamespaceSelector
    Header --> ClusterSwitcher
    Header --> ThemeToggle
    Header --> NotificationCenter
    Header --> CommandPalette

    SidebarV2 --> SidebarRail
    SidebarV2 --> SidebarFlyout
    SidebarV2 --> QuickSwitcher

    Content --> Dashboard
    Content --> Pods
    Content --> Deployments
    Content --> Services
    Content --> Incidents
    Content --> Apps
    Content --> Settings

    Pods --> VirtualizedTable
    Pods --> DescribeModal
    Pods --> YAMLEditor
    Pods --> LogsModal
    Pods --> TerminalModal

    Incidents --> FixPreviewModal
    Incidents --> ExecutionPanel

    Dashboard --> MetricsChart
    Dashboard --> AIChat

    style App fill:#FF6B6B
    style AppShell fill:#FFA500
    style Header fill:#4A90E2
    style SidebarV2 fill:#50C878
    style Content fill:#9370DB
```

---

## 3. Backend API Structure

```mermaid
graph TB
    WebServer["Go Web Server<br/>HTTP + WebSocket"]

    subgraph "Cluster Management"
        ClusterAPI["Cluster Routes<br/>/api/v2/clusters/*"]
        ContextAPI["Context Routes<br/>/api/contexts/*"]
    end

    subgraph "Kubernetes Resources"
        PodAPI["Pod Routes<br/>/api/pod/*<br/>/api/pods/*"]
        DeploymentAPI["Deployment Routes<br/>/api/deployment/*<br/>/api/deployments/*"]
        ServiceAPI["Service Routes<br/>/api/service/*<br/>/api/services/*"]
        NamespaceAPI["Namespace Routes<br/>/api/namespace/*<br/>/api/namespaces"]
        NodeAPI["Node Routes<br/>/api/node/*<br/>/api/nodes"]
        ConfigMapAPI["ConfigMap Routes<br/>/api/configmap/*<br/>/api/configmaps"]
        SecretAPI["Secret Routes<br/>/api/secret/*<br/>/api/secrets"]
    end

    subgraph "Intelligence & Insights"
        IncidentAPI["Incident Routes<br/>/api/incidents/*<br/>20+ endpoints"]
        BrainAPI["Brain Routes<br/>/api/brain/*<br/>AI Insights"]
        AutoFixAPI["AutoFix Routes<br/>/api/incidents/fix-*"]
        LearningAPI["Learning Routes<br/>/api/incidents/learning/*"]
    end

    subgraph "Observability"
        MetricsAPI["Metrics Routes<br/>/api/metrics*"]
        MetricsWS["Metrics WebSocket<br/>/ws/metrics"]
        EventAPI["Event Routes<br/>/api/events*"]
        LogAPI["Log Routes<br/>/api/pod/logs"]
    end

    subgraph "Terminal & Execution"
        PodTerminalWS["Pod Terminal<br/>/api/pod/terminal (WS)"]
        LocalTerminalWS["Local Terminal<br/>/api/local/terminal (WS)"]
        ExecutionWS["Execution Stream<br/>/api/execution/stream (WS)"]
    end

    subgraph "ML & AI"
        MLJobAPI["ML Job Routes<br/>/api/ml/jobs/*"]
        InferenceAPI["Inference Routes<br/>/api/inference/*"]
        MLJobLogsWS["ML Logs Stream<br/>/api/ml/jobs/logs/ws (WS)"]
    end

    subgraph "GitOps & Integrations"
        HelmAPI["Helm Routes<br/>/api/plugins/helm/*"]
        ArgoCDAPI["ArgoCD Routes<br/>/api/plugins/argocd/*"]
        KialiAPI["Kiali Routes<br/>/api/integrations/kiali/*<br/>/api/kiali/proxy/*"]
        MLflowAPI["MLflow Routes<br/>/api/mlflow/*"]
        FeastAPI["Feast Routes<br/>/api/feast/*"]
        GPUAPI["GPU Routes<br/>/api/gpu/*"]
    end

    subgraph "Apps & Platform"
        AppsAPI["Apps Routes<br/>/api/apps/*"]
        CustomAppsAPI["Custom Apps<br/>/api/custom-apps/*"]
        PluginsAPI["Plugins Routes<br/>/api/plugins/*"]
        SettingsAPI["Settings Routes<br/>/api/settings/*"]
    end

    subgraph "System Administration"
        AuthAPI["Auth Routes<br/>/api/auth/*"]
        NotificationAPI["Notification Routes<br/>/api/notifications/*"]
        BackupAPI["Backup Routes<br/>/api/database/backup/*"]
        UpdateAPI["Update Routes<br/>/api/updates/*"]
        StatusAPI["Status Routes<br/>/api/status*"]
    end

    WebServer --> ClusterAPI
    WebServer --> ContextAPI

    WebServer --> PodAPI
    WebServer --> DeploymentAPI
    WebServer --> ServiceAPI
    WebServer --> NamespaceAPI
    WebServer --> NodeAPI
    WebServer --> ConfigMapAPI
    WebServer --> SecretAPI

    WebServer --> IncidentAPI
    WebServer --> BrainAPI
    WebServer --> AutoFixAPI
    WebServer --> LearningAPI

    WebServer --> MetricsAPI
    WebServer --> MetricsWS
    WebServer --> EventAPI
    WebServer --> LogAPI

    WebServer --> PodTerminalWS
    WebServer --> LocalTerminalWS
    WebServer --> ExecutionWS

    WebServer --> MLJobAPI
    WebServer --> InferenceAPI
    WebServer --> MLJobLogsWS

    WebServer --> HelmAPI
    WebServer --> ArgoCDAPI
    WebServer --> KialiAPI
    WebServer --> MLflowAPI
    WebServer --> FeastAPI
    WebServer --> GPUAPI

    WebServer --> AppsAPI
    WebServer --> CustomAppsAPI
    WebServer --> PluginsAPI
    WebServer --> SettingsAPI

    WebServer --> AuthAPI
    WebServer --> NotificationAPI
    WebServer --> BackupAPI
    WebServer --> UpdateAPI
    WebServer --> StatusAPI

    style WebServer fill:#FFA500
    style IncidentAPI fill:#FF6B6B
    style MetricsWS fill:#4A90E2
    style PodTerminalWS fill:#50C878
```

---

## 4. Frontend-Backend Communication Flow

```mermaid
sequenceDiagram
    participant User
    participant Frontend as Frontend<br/>(SolidJS)
    participant StateStore as State Store<br/>(Signals)
    participant Cache as TanStack Query<br/>(Cache)
    participant Backend as Backend<br/>(Go Server)
    participant K8s as Kubernetes<br/>API

    User->>Frontend: Navigate to /pods
    Frontend->>StateStore: Request pods data
    StateStore->>Cache: Check cache

    alt Cache Hit
        Cache-->>StateStore: Return cached data
        StateStore-->>Frontend: Display pods
    else Cache Miss
        Cache->>Backend: GET /api/pods?namespace=default
        Backend->>K8s: List Pods (clientset)
        K8s-->>Backend: Pod list
        Backend-->>Cache: JSON response
        Cache-->>StateStore: Update state
        StateStore-->>Frontend: Display pods
    end

    User->>Frontend: Click "Restart Pod"
    Frontend->>Backend: POST /api/pod/restart
    Backend->>K8s: Delete Pod
    K8s-->>Backend: Success
    Backend-->>Frontend: 200 OK
    Frontend->>StateStore: Invalidate cache
    StateStore->>Cache: Refetch pods
    Cache->>Backend: GET /api/pods
    Backend->>K8s: List Pods
    K8s-->>Backend: Updated pod list
    Backend-->>Cache: JSON response
    Cache-->>StateStore: Update state
    StateStore-->>Frontend: Display updated pods
    Frontend->>User: Show success notification
```

---

## 5. State Management Flow

```mermaid
graph LR
    subgraph "UI Components"
        Component1["Pod List<br/>Component"]
        Component2["Pod Details<br/>Modal"]
        Component3["Metrics<br/>Chart"]
    end

    subgraph "State Stores (Signals)"
        ClusterStore["cluster.ts<br/>• namespaces<br/>• selectedNamespaces<br/>• currentContext"]
        UIStore["ui.ts<br/>• currentView<br/>• notifications<br/>• terminalVisible"]
        MetricsStore["metricsStore.ts<br/>• metrics data<br/>• refresh state"]
        ExecutionStore["executionPanel.ts<br/>• execution status<br/>• output logs"]
    end

    subgraph "API Layer"
        QueryClient["TanStack Query<br/>• Caching<br/>• Auto-refetch<br/>• Optimistic updates"]
    end

    subgraph "Backend"
        API["Backend API<br/>REST + WebSocket"]
    end

    Component1 --> ClusterStore
    Component1 --> UIStore
    Component2 --> ClusterStore
    Component3 --> MetricsStore

    ClusterStore <--> QueryClient
    MetricsStore <--> QueryClient
    UIStore <--> QueryClient
    ExecutionStore <--> QueryClient

    QueryClient <--> API

    style Component1 fill:#FF6B6B
    style ClusterStore fill:#4A90E2
    style QueryClient fill:#50C878
    style API fill:#FFA500
```

---

## 6. Authentication Flow

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant Backend
    participant SessionManager as Session Token<br/>Manager
    participant K8s as Kubernetes<br/>API

    User->>Frontend: Enter credentials
    Frontend->>Backend: POST /api/auth/login<br/>{username, password}
    Backend->>SessionManager: Validate credentials
    SessionManager-->>Backend: Valid
    Backend->>SessionManager: Generate session token
    SessionManager-->>Backend: Token: "abc123..."
    Backend-->>Frontend: 200 OK<br/>{token: "abc123..."}
    Frontend->>Frontend: Store token in localStorage

    Note over Frontend,Backend: Subsequent Requests

    User->>Frontend: Click "View Pods"
    Frontend->>Backend: GET /api/pods<br/>Authorization: Bearer abc123...
    Backend->>SessionManager: Validate token

    alt Valid Token
        SessionManager-->>Backend: Valid
        Backend->>K8s: List Pods (with RBAC)
        K8s-->>Backend: Pod list
        Backend-->>Frontend: 200 OK + Pod data
        Frontend->>User: Display pods
    else Invalid Token
        SessionManager-->>Backend: Invalid
        Backend-->>Frontend: 401 Unauthorized
        Frontend->>User: Redirect to login
    end
```

---

## 7. WebSocket Communication

```mermaid
sequenceDiagram
    participant Frontend
    participant WSServer as WebSocket<br/>Server
    participant MetricsCollector as Metrics<br/>Collector
    participant K8s as Kubernetes<br/>API

    Frontend->>WSServer: Connect: ws://localhost:3003/ws/metrics
    WSServer-->>Frontend: Connection established

    Frontend->>WSServer: {"action": "subscribe", "interval": 5000}
    WSServer->>MetricsCollector: Start collection (5s interval)

    loop Every 5 seconds
        MetricsCollector->>K8s: Get node metrics
        K8s-->>MetricsCollector: Node metrics
        MetricsCollector->>K8s: Get pod metrics
        K8s-->>MetricsCollector: Pod metrics
        MetricsCollector->>WSServer: Aggregated metrics
        WSServer->>Frontend: {"timestamp": "...", "nodes": [...], "pods": [...]}
        Frontend->>Frontend: Update charts
    end

    Frontend->>WSServer: {"action": "unsubscribe"}
    WSServer->>MetricsCollector: Stop collection
    Frontend->>WSServer: Close connection
    WSServer-->>Frontend: Connection closed
```

---

## 8. Incident Intelligence Flow

```mermaid
graph TB
    Start["Cluster Running"]

    subgraph "Detection Phase"
        EventMonitor["Event Monitor<br/>Watches K8s Events"]
        PodScanner["Pod Scanner<br/>Scans Pod Status"]
        LogAnalyzer["Log Analyzer<br/>Scans Container Logs"]
        MetricsAnalyzer["Metrics Analyzer<br/>CPU/Memory Patterns"]
    end

    subgraph "Intelligence Engine"
        SignalAggregator["Signal Aggregator<br/>Collects Evidence"]
        PatternMatcher["Pattern Matcher<br/>Matches Known Patterns"]
        RootCauseAnalyzer["Root Cause Analyzer<br/>AI-based Analysis"]
        SeverityClassifier["Severity Classifier<br/>Critical/High/Medium/Low"]
    end

    subgraph "Incident Storage"
        IncidentDB["Incident Database<br/>SQLite"]
        LearningDB["Learning Database<br/>Pattern History"]
    end

    subgraph "Response Phase"
        FixRecommender["Fix Recommender<br/>Generates Solutions"]
        PreviewEngine["Preview Engine<br/>Dry-run Validation"]
        ApplyEngine["Apply Engine<br/>Executes Fix"]
        AutoRemediation["Auto-Remediation<br/>(Optional)"]
    end

    subgraph "UI Presentation"
        IncidentList["Incident List View"]
        IncidentDetail["Incident Detail View"]
        FixPreview["Fix Preview Modal"]
        ExecutionPanel["Execution Panel"]
    end

    Start --> EventMonitor
    Start --> PodScanner
    Start --> LogAnalyzer
    Start --> MetricsAnalyzer

    EventMonitor --> SignalAggregator
    PodScanner --> SignalAggregator
    LogAnalyzer --> SignalAggregator
    MetricsAnalyzer --> SignalAggregator

    SignalAggregator --> PatternMatcher
    PatternMatcher --> RootCauseAnalyzer
    RootCauseAnalyzer --> SeverityClassifier
    SeverityClassifier --> IncidentDB

    IncidentDB --> LearningDB
    IncidentDB --> IncidentList

    IncidentList --> IncidentDetail
    IncidentDetail --> FixRecommender
    FixRecommender --> FixPreview
    FixPreview --> PreviewEngine
    PreviewEngine --> ApplyEngine
    ApplyEngine --> ExecutionPanel

    SeverityClassifier --> AutoRemediation
    AutoRemediation --> ApplyEngine

    style EventMonitor fill:#4A90E2
    style RootCauseAnalyzer fill:#FF6B6B
    style AutoRemediation fill:#FFA500
    style ExecutionPanel fill:#50C878
```

---

## 9. Execution Pipeline

```mermaid
sequenceDiagram
    participant User
    participant UI as Frontend UI
    participant ExecutionPanel as Execution<br/>Panel
    participant Backend
    participant K8s as Kubernetes<br/>API

    User->>UI: Click "Apply Fix"
    UI->>Backend: POST /api/incidents/fix-preview<br/>{incidentId: "inc-123"}
    Backend->>K8s: kubectl diff (dry-run)
    K8s-->>Backend: Diff output
    Backend-->>UI: Preview response
    UI->>User: Show Fix Preview Modal

    User->>UI: Confirm "Apply"
    UI->>ExecutionPanel: Set status: "planned"
    UI->>Backend: POST /api/incidents/fix-apply<br/>{incidentId: "inc-123"}
    Backend->>Backend: Connect to execution stream
    Backend-->>UI: 202 Accepted + stream URL

    UI->>Backend: WebSocket: /api/execution/stream
    Backend-->>UI: Connected
    ExecutionPanel->>ExecutionPanel: Set status: "running"

    Backend->>K8s: kubectl apply

    loop Stream Output
        K8s-->>Backend: stdout/stderr
        Backend->>UI: {"type": "stdout", "data": "..."}
        UI->>ExecutionPanel: Append to output
    end

    K8s-->>Backend: Exit code: 0
    Backend->>UI: {"type": "complete", "exitCode": 0, "duration": 2.5}
    ExecutionPanel->>ExecutionPanel: Set status: "succeeded"
    UI->>User: Show success notification
    UI->>Backend: GET /api/pods (refetch)
    Backend->>K8s: List Pods
    K8s-->>Backend: Updated pods
    Backend-->>UI: Pod list
    UI->>User: Update pod list
```

---

## 10. Cluster Switching Flow

```mermaid
sequenceDiagram
    participant User
    participant Header as Header<br/>Component
    participant ClusterStore as Cluster<br/>Store
    participant Backend
    participant K8s1 as Cluster A<br/>(Current)
    participant K8s2 as Cluster B<br/>(Target)

    User->>Header: Open cluster dropdown
    Header->>Backend: GET /api/v2/clusters
    Backend-->>Header: Cluster list
    Header->>User: Display clusters

    User->>Header: Click "Cluster B"
    Header->>Backend: POST /api/v2/clusters/switch<br/>{contextName: "cluster-b"}

    Backend->>Backend: Update kubeconfig context
    Backend->>Backend: Create new clientset
    Backend->>K8s2: Test connection

    alt Connection Success
        K8s2-->>Backend: Connected
        Backend->>Backend: Update app.clientset
        Backend->>Backend: Update app.metricsClient
        Backend-->>Header: 200 OK
        Header->>ClusterStore: Update currentCluster
        ClusterStore->>ClusterStore: Invalidate all caches
        ClusterStore->>Backend: GET /api/namespaces
        Backend->>K8s2: List Namespaces
        K8s2-->>Backend: Namespace list
        Backend-->>ClusterStore: Namespaces
        Header->>User: Show success notification
        Header->>User: Redirect to dashboard
    else Connection Failed
        K8s2-->>Backend: Connection error
        Backend-->>Header: 500 Error
        Header->>User: Show error notification
    end
```

---

## 11. Port Forwarding Flow

```mermaid
sequenceDiagram
    participant User
    participant UI as Service<br/>Details Panel
    participant Backend
    participant PortForwarder as Port Forward<br/>Manager
    participant K8s as Kubernetes<br/>API
    participant LocalPort as Local Port<br/>8080

    User->>UI: Click "Port Forward"
    UI->>UI: Show port input dialog
    User->>UI: Enter local port: 8080
    UI->>Backend: POST /api/portforward/start<br/>{namespace: "default", service: "web", port: 80, localPort: 8080}

    Backend->>PortForwarder: Create port forward
    PortForwarder->>K8s: Start port-forward (API call)
    K8s-->>PortForwarder: Tunnel established

    PortForwarder->>LocalPort: Listen on localhost:8080
    PortForwarder-->>Backend: Port forward active
    Backend-->>UI: 200 OK<br/>{forwardId: "fwd-123", url: "http://localhost:8080"}

    UI->>User: Display success + clickable link

    Note over User,LocalPort: User accesses service

    User->>LocalPort: http://localhost:8080
    LocalPort->>PortForwarder: Forward request
    PortForwarder->>K8s: Tunnel traffic
    K8s->>K8s: Route to service pod
    K8s-->>PortForwarder: Response
    PortForwarder-->>LocalPort: Forward response
    LocalPort-->>User: HTTP response

    Note over User,K8s: Stop port forward

    User->>UI: Click "Stop"
    UI->>Backend: POST /api/portforward/stop<br/>{forwardId: "fwd-123"}
    Backend->>PortForwarder: Stop port forward
    PortForwarder->>LocalPort: Close listener
    PortForwarder->>K8s: Close tunnel
    K8s-->>PortForwarder: Closed
    PortForwarder-->>Backend: Stopped
    Backend-->>UI: 200 OK
    UI->>User: Port forward stopped
```

---

## 12. ML Job Workflow

```mermaid
sequenceDiagram
    participant User
    participant UI as Training Jobs<br/>Component
    participant Backend
    participant K8s as Kubernetes<br/>API
    participant Pod as Training Job<br/>Pod

    User->>UI: Click "Create Training Job"
    UI->>UI: Show job creation form
    User->>UI: Fill form<br/>(image, resources, dataset)
    UI->>Backend: POST /api/ml/jobs/create<br/>{name, image, resources, ...}

    Backend->>K8s: Create Job manifest
    Backend->>K8s: Apply Job
    K8s-->>Backend: Job created
    Backend-->>UI: 201 Created<br/>{jobId: "job-123"}
    UI->>User: Show success notification

    Note over User,Pod: Monitor job progress

    UI->>Backend: WebSocket: /api/ml/jobs/logs/ws?jobId=job-123
    Backend->>K8s: Watch Job status
    Backend->>Pod: Stream logs

    loop Job Running
        Pod->>Backend: Log output
        Backend->>UI: {"type": "log", "data": "Epoch 1/10..."}
        UI->>User: Display logs in real-time

        K8s->>Backend: Job status update
        Backend->>UI: {"type": "status", "state": "running"}
        UI->>User: Update progress indicator
    end

    Pod->>Pod: Training complete
    Pod->>Backend: Exit code: 0
    Backend->>UI: {"type": "complete", "exitCode": 0}
    UI->>User: Show completion notification

    User->>UI: Click "View Logs"
    UI->>Backend: GET /api/ml/jobs/logs?jobId=job-123
    Backend->>K8s: Get pod logs
    K8s-->>Backend: Full logs
    Backend-->>UI: Log data
    UI->>User: Display full logs

    User->>UI: Click "Delete Job"
    UI->>Backend: DELETE /api/ml/jobs/delete?jobId=job-123
    Backend->>K8s: Delete Job
    K8s-->>Backend: Deleted
    Backend-->>UI: 200 OK
    UI->>User: Job deleted
```

---

## 13. Application Marketplace Flow

```mermaid
graph TB
    User["👤 User"]

    subgraph "Apps Page (Apps.tsx - 122KB)"
        AppList["App Catalog Browser<br/>• Kubernetes Essentials<br/>• Observability<br/>• Security<br/>• Databases<br/>• Machine Learning<br/>• Service Mesh"]
        AppCard["App Card<br/>• Name, Description<br/>• Version, Category<br/>• Install Status"]
        InstalledApps["Installed Apps Tab<br/>• Helm Releases<br/>• Custom Apps"]
        CustomAppForm["Custom App Form<br/>• YAML Upload<br/>• Helm Chart"]
    end

    subgraph "Backend - App Management"
        AppAPI["App API Handler"]
        HelmManager["Helm Manager"]
        CustomAppManager["Custom App Manager"]
    end

    subgraph "Kubernetes Cluster"
        HelmReleases["Helm Releases"]
        K8sResources["K8s Resources<br/>(Deployments, Services, etc.)"]
    end

    User --> AppList
    AppList --> AppCard

    User --> AppCard
    AppCard -->|Install App| AppAPI
    AppAPI --> HelmManager
    HelmManager -->|helm install| HelmReleases
    HelmReleases --> K8sResources

    User --> CustomAppForm
    CustomAppForm -->|Deploy YAML| AppAPI
    AppAPI --> CustomAppManager
    CustomAppManager -->|kubectl apply| K8sResources

    User --> InstalledApps
    InstalledApps -->|Fetch| AppAPI
    AppAPI -->|helm list| HelmManager
    HelmManager --> HelmReleases
    AppAPI -->|list custom apps| CustomAppManager

    style User fill:#4A90E2
    style AppList fill:#FF6B6B
    style AppAPI fill:#FFA500
    style HelmReleases fill:#50C878
```

---

## 14. Sidebar Navigation Structure

```mermaid
graph TB
    Sidebar["SidebarV2<br/>2-Panel Design"]

    subgraph "Sidebar Rail (14px)"
        Rail1["📊 Overview"]
        Rail2["🧠 Insights"]
        Rail3["🚀 CD"]
        Rail4["⚙️ Workloads"]
        Rail5["🌐 Networking"]
        Rail6["📦 Config & Storage"]
        Rail7["🔒 Access Control"]
        Rail8["🏗️ Platform"]
        Rail9["🤖 Intelligence"]
        Rail10["🔬 Machine Learning"]
        Rail11["🔧 Custom Resources"]
        Rail12["⚙️ Settings"]
    end

    subgraph "Flyout Menu (Expands on Hover)"
        Section1["Overview<br/>• Dashboard<br/>• Cluster Overview<br/>• Multi-Cluster<br/>• Events"]
        Section2["Insights<br/>• Incidents<br/>• Timeline<br/>• AI/ML Insights<br/>• Security<br/>• Cost<br/>• Drift<br/>• Continuity"]
        Section4["Workloads<br/>• Pods<br/>• Deployments<br/>• StatefulSets<br/>• DaemonSets<br/>• Jobs<br/>• CronJobs<br/>• PDB<br/>• HPA"]
        Section5["Networking<br/>• Services<br/>• Ingress<br/>• Network Policies"]
        Section9["Intelligence<br/>• AI Assistant<br/>• AutoFix Engine<br/>• SRE Agent<br/>• Knowledge Bank"]
        Section10["Machine Learning<br/>• Training Jobs<br/>• Inference Services<br/>• MLflow<br/>• Feast<br/>• GPU Dashboard"]
    end

    Sidebar --> Rail1
    Sidebar --> Rail2
    Sidebar --> Rail3
    Sidebar --> Rail4
    Sidebar --> Rail5
    Sidebar --> Rail6
    Sidebar --> Rail7
    Sidebar --> Rail8
    Sidebar --> Rail9
    Sidebar --> Rail10
    Sidebar --> Rail11
    Sidebar --> Rail12

    Rail1 -.->|Hover| Section1
    Rail2 -.->|Hover| Section2
    Rail4 -.->|Hover| Section4
    Rail5 -.->|Hover| Section5
    Rail9 -.->|Hover| Section9
    Rail10 -.->|Hover| Section10

    style Sidebar fill:#4A90E2
    style Rail1 fill:#50C878
    style Section1 fill:#FFA500
```

---

## 15. Data Flow - Pod Management

```mermaid
graph LR
    subgraph "Frontend"
        PodsPage["Pods.tsx<br/>Pod List Page"]
        PodTable["Virtualized Table<br/>Display Pods"]
        ActionMenu["Action Menu<br/>• Restart<br/>• Delete<br/>• Logs<br/>• Shell<br/>• Describe"]
        LogsModal["Logs Modal<br/>Container Logs"]
        TerminalModal["Terminal Modal<br/>Interactive Shell"]
    end

    subgraph "State Management"
        PodStore["Pod Store<br/>(TanStack Query)"]
    end

    subgraph "Backend API"
        ListHandler["GET /api/pods<br/>List Pods"]
        LogsHandler["GET /api/pod/logs<br/>Get Logs"]
        TerminalHandler["WebSocket<br/>/api/pod/terminal"]
        RestartHandler["POST /api/pod/restart<br/>Restart Pod"]
        DeleteHandler["DELETE /api/pod/delete<br/>Delete Pod"]
    end

    subgraph "Kubernetes"
        K8sPods["Pod Resources"]
    end

    PodsPage --> PodTable
    PodTable --> ActionMenu

    PodsPage --> PodStore
    PodStore <--> ListHandler
    ListHandler <--> K8sPods

    ActionMenu -->|View Logs| LogsModal
    LogsModal --> LogsHandler
    LogsHandler --> K8sPods

    ActionMenu -->|Open Shell| TerminalModal
    TerminalModal <--> TerminalHandler
    TerminalHandler <--> K8sPods

    ActionMenu -->|Restart| RestartHandler
    RestartHandler --> K8sPods
    RestartHandler --> PodStore

    ActionMenu -->|Delete| DeleteHandler
    DeleteHandler --> K8sPods
    DeleteHandler --> PodStore

    style PodsPage fill:#FF6B6B
    style PodStore fill:#4A90E2
    style ListHandler fill:#FFA500
    style K8sPods fill:#326CE5
```

---

## 16. Real-Time Metrics Flow

```mermaid
graph TB
    subgraph "Frontend"
        Dashboard["Dashboard<br/>Component"]
        MetricsChart["CPU/Mem Chart<br/>Component"]
        MetricsStore["Metrics Store<br/>(SolidJS Signal)"]
    end

    subgraph "WebSocket Layer"
        WSClient["WebSocket Client"]
        WSServer["WebSocket Server<br/>/ws/metrics"]
    end

    subgraph "Backend Services"
        MetricsCollector["Metrics Collector<br/>Background Worker"]
        MetricsCache["Metrics Cache<br/>In-Memory LRU"]
    end

    subgraph "Kubernetes"
        MetricsAPI["Metrics API<br/>(metrics.k8s.io)"]
        SummaryAPI["Summary API<br/>(kubelet /stats)"]
        Nodes["Node Resources"]
        Pods["Pod Resources"]
    end

    Dashboard --> MetricsChart
    MetricsChart --> MetricsStore
    MetricsStore <--> WSClient
    WSClient <--> WSServer

    WSServer <--> MetricsCollector
    MetricsCollector <--> MetricsCache

    MetricsCollector -->|Primary| MetricsAPI
    MetricsCollector -->|Fallback| SummaryAPI

    MetricsAPI --> Nodes
    MetricsAPI --> Pods
    SummaryAPI --> Nodes
    SummaryAPI --> Pods

    style Dashboard fill:#FF6B6B
    style WSServer fill:#4A90E2
    style MetricsCollector fill:#FFA500
    style MetricsAPI fill:#50C878
```

---

## 17. Intelligence Engine Architecture

```mermaid
graph TB
    subgraph "Data Sources"
        Events["Kubernetes Events"]
        PodStatus["Pod Status<br/>Conditions"]
        ContainerLogs["Container Logs<br/>Error Patterns"]
        Metrics["Metrics Data<br/>CPU/Memory"]
        NodeStatus["Node Status"]
    end

    subgraph "Intelligence Engine"
        direction TB
        EventScanner["Event Scanner<br/>Monitors Events"]
        PodScanner["Pod Scanner<br/>Checks Pod Health"]
        LogScanner["Log Scanner<br/>Pattern Matching"]
        MetricsScanner["Metrics Scanner<br/>Anomaly Detection"]

        SignalCollector["Signal Collector<br/>Aggregates Evidence"]

        subgraph "Analysis Layer"
            RuleEngine["Rule Engine<br/>Deterministic Rules"]
            MLEngine["ML Engine<br/>Pattern Learning"]
            RCAEngine["RCA Engine<br/>Root Cause Analysis"]
        end

        IncidentGenerator["Incident Generator<br/>Creates Incidents"]
        SeverityClassifier["Severity Classifier<br/>Critical/High/Med/Low"]
        FixGenerator["Fix Generator<br/>Recommended Actions"]
    end

    subgraph "Storage"
        IncidentDB["Incident DB<br/>SQLite"]
        PatternDB["Pattern DB<br/>Learned Patterns"]
        RunbookDB["Runbook DB<br/>Fix Templates"]
    end

    subgraph "API Layer"
        IncidentAPI["Incident API<br/>/api/incidents/*"]
        BrainAPI["Brain API<br/>/api/brain/*"]
        AutoFixAPI["AutoFix API<br/>/api/incidents/fix-*"]
    end

    Events --> EventScanner
    PodStatus --> PodScanner
    ContainerLogs --> LogScanner
    Metrics --> MetricsScanner
    NodeStatus --> PodScanner

    EventScanner --> SignalCollector
    PodScanner --> SignalCollector
    LogScanner --> SignalCollector
    MetricsScanner --> SignalCollector

    SignalCollector --> RuleEngine
    SignalCollector --> MLEngine
    RuleEngine --> RCAEngine
    MLEngine --> RCAEngine

    RCAEngine --> IncidentGenerator
    IncidentGenerator --> SeverityClassifier
    SeverityClassifier --> FixGenerator
    FixGenerator --> IncidentDB

    MLEngine <--> PatternDB
    FixGenerator <--> RunbookDB

    IncidentDB --> IncidentAPI
    PatternDB --> BrainAPI
    RunbookDB --> AutoFixAPI

    style EventScanner fill:#4A90E2
    style RCAEngine fill:#FF6B6B
    style IncidentDB fill:#FFA500
    style IncidentAPI fill:#50C878
```

---

## Usage

These diagrams are written in Mermaid syntax and can be:
- Viewed in GitHub (automatic rendering)
- Rendered in VSCode with Mermaid preview extensions
- Exported to PNG/SVG using Mermaid CLI
- Embedded in documentation sites

### Viewing in VSCode

Install the "Markdown Preview Mermaid Support" extension:
```bash
code --install-extension bierner.markdown-mermaid
```

Then open this file and use "Markdown: Open Preview" (Ctrl+Shift+V).

### Exporting to PNG

Using Mermaid CLI:
```bash
npm install -g @mermaid-js/mermaid-cli
mmdc -i ARCHITECTURE_DIAGRAMS.md -o diagrams/ -e png
```

---

**End of Architecture Diagrams**
