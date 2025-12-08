# KubeGraf Features & Capabilities

## Overview

KubeGraf is a comprehensive Kubernetes visualization and management tool that provides three powerful interfaces for interacting with your Kubernetes clusters. This document provides a complete overview of all features and capabilities.

---

## 🖥️ Three Powerful Interfaces

### 1. Terminal UI (TUI)
- **Lightning-fast** keyboard-driven interface
- **Vim-style keybindings** for efficient navigation
- **Works over SSH** - no browser required
- **Zero dependencies** - single binary
- **Real-time updates** with live resource monitoring
- **Interactive terminal canvas** for graph visualization
- **ASCII tree views** for resource relationships

### 2. Web Dashboard (Classic)
- **Browser-based** interface accessible from anywhere
- **Real-time metrics** with WebSocket live updates
- **Interactive D3.js topology** visualization
- **Port forwarding** management with session tracking
- **Responsive design** works on desktop and tablet
- **Classic HTML/CSS** interface

### 3. Solid.js UI (Modern SPA)
- **Modern reactive** single-page application
- **5 built-in themes** (Dark, Light, Midnight, Cyberpunk, Ocean)
- **Collapsible sidebar** with search functionality
- **Full CRUD operations** on resources
- **Plugin system** for extensibility
- **AI-powered insights** and recommendations
- **Advanced filtering and search**
- **Real-time WebSocket updates** for live data
- **Responsive design** with mobile support
- **Keyboard shortcuts** for power users
- **Toast notifications** for user feedback
- **Update notification system** with auto-check

---

## 📊 Solid.js UI - Complete Feature List

### Overview Section

#### Dashboard
- **Cluster Overview** - Real-time cluster health metrics
- **Resource Summary Cards** - Quick view of pods, nodes, deployments
- **CPU & Memory Usage** - Visual resource utilization charts
- **Node Status** - Node health and capacity overview
- **Recent Events** - Latest cluster events feed
- **Quick Actions** - Fast access to common operations
- **Namespace Selector** - Quick namespace switching
- **Context Indicator** - Current Kubernetes context display

### Insights Section

#### AI Insights (Anomalies)
- **Automated Anomaly Detection** - AI-powered cluster analysis
- **Severity Classification** - Critical, Warning, Info levels
- **Anomaly Statistics** - Total, critical, warning counts
- **Filterable Anomaly List** - Filter by severity, namespace, type
- **Remediation Recommendations** - Actionable fix suggestions
- **One-Click Remediation** - Automated fix application
- **Anomaly Details** - Detailed view with context
- **Pagination Support** - Navigate through large anomaly lists
- **Real-time Updates** - Live anomaly detection

#### Incidents & OOM
- **Incident Detection** - Automatic detection of pod failures, OOM kills
- **Incident Types** - Pod crashes, OOM, restarts, errors
- **Severity Filtering** - Filter by critical, high, medium, low
- **Namespace Filtering** - Filter incidents by namespace
- **Resource Navigation** - Quick jump to affected pods
- **Log Viewing** - Direct access to pod logs
- **Event Correlation** - Link incidents to cluster events
- **Incident Timeline** - Chronological incident view

#### Cost Analysis
- **Multi-Cloud Cost Estimation** - GCP, AWS, Azure, IBM, Oracle, DigitalOcean, Alibaba, Linode, Vultr, OVH, Hetzner
- **Resource Cost Calculation** - CPU and memory cost breakdown
- **Namespace Cost Allocation** - Per-namespace cost tracking
- **Workload Cost Analysis** - Cost per deployment/pod
- **Node Pool Analysis** - Spot instance detection
- **Cost Trends** - Historical cost visualization
- **Cost Optimization** - Identify cost-saving opportunities
- **Real-time Cost Updates** - Live cost tracking

#### Security Insights
- **Automated Security Scanning** - Continuous security posture analysis
- **Security Score** - 0-100 score based on findings
- **Security Checks** - Comprehensive security rule validation
- **Remediation Guidance** - Step-by-step fix instructions
- **Severity Levels** - Critical, High, Medium, Low classifications
- **SecurityContext Analysis** - Pod security context validation
- **Network Security** - NetworkPolicy analysis
- **Ingress Security** - TLS and port security checks

#### Drift Detection
- **GitOps Sync Status** - Detect drift from Git repositories
- **Configuration Comparison** - Compare current vs. desired state
- **Field-level Differences** - Detailed drift analysis
- **Drift Status Indicators** - Synced, Drifted, Missing, Unknown
- **Resource Comparison** - Compare live vs. declared state
- **Change Tracking** - Track who modified resources
- **GitOps Integration** - ArgoCD/Flux sync status detection
- **Remediation Suggestions** - How to fix drift

### CD (Continuous Deployment) Section

#### Deploy (Apps Marketplace)
- **50+ Pre-configured Apps** - One-click Helm chart installations
- **App Categories** - Database, Monitoring, CI/CD, ML, Security, etc.
- **App Search & Filter** - Find apps by name, category, tags
- **Installation Wizard** - Guided app installation process
- **Custom Apps** - Add and manage custom Helm charts
- **App Management** - Install, upgrade, uninstall apps
- **Version Selection** - Choose specific chart versions
- **Installation Progress** - Real-time deployment tracking
- **App Status** - View installed app health
- **Namespace Selection** - Choose target namespace for apps

#### Rollouts
- **Rollout Management** - View and manage Argo Rollouts
- **Rollout Status** - Current rollout state and progress
- **Canary Deployments** - Canary rollout visualization
- **Blue-Green Deployments** - Blue-green rollout management
- **Rollout History** - View rollout revision history
- **Rollback Support** - Rollback to previous revisions

### Workloads Section

#### Pods
- **Pod List View** - Comprehensive pod listing with filters
- **Pod Details** - Full pod information and status
- **Shell Access** - Interactive terminal via WebSocket (`kubectl exec`)
- **Logs Streaming** - Real-time log viewing with search
- **YAML Viewer** - Syntax-highlighted full resource configuration
- **YAML Editor** - Edit pod configurations
- **Describe View** - Full `kubectl describe` output
- **Restart Pods** - Restart pods with confirmation
- **Delete Pods** - Safe deletion with confirmation dialogs
- **Port Forward** - Forward container ports to local machine
- **Metrics Display** - CPU and memory usage tracking
- **Pod Status Filtering** - Filter by running, pending, failed, succeeded
- **Namespace Filtering** - Filter pods by namespace
- **Label Selectors** - Advanced pod filtering

#### Deployments
- **Deployment List** - View all deployments with status
- **Scale Deployment** - Scale replicas up or down
- **Restart Deployment** - Trigger rolling restart
- **Rollback** - Rollback to previous revisions
- **History View** - View deployment revision history
- **YAML Viewer/Editor** - View and edit deployment manifests
- **Describe View** - Detailed deployment information
- **Pod Management** - View and manage deployment pods
- **Replica Status** - Current vs. desired replica counts

#### StatefulSets
- **StatefulSet Management** - View and manage stateful workloads
- **Scale StatefulSets** - Scale stateful replicas
- **Restart StatefulSets** - Rolling restart of stateful pods
- **YAML Viewer/Editor** - View and manage stateful set configuration
- **Describe View** - StatefulSet details and status
- **Pod Management** - View individual stateful pods

#### DaemonSets
- **DaemonSet View** - View and manage daemon pods
- **Restart DaemonSets** - Restart daemon pods
- **YAML Viewer/Editor** - View daemon set configuration
- **Describe View** - DaemonSet details
- **Node Coverage** - View which nodes have daemon pods

#### Jobs
- **Job List** - Track and manage job executions
- **Job Status** - View job completion status
- **Job Details** - View job configuration and logs
- **Job History** - View job execution history
- **YAML Viewer/Editor** - View job configuration
- **Delete Jobs** - Remove completed jobs

#### CronJobs
- **CronJob List** - Schedule and monitor cron jobs
- **Cron Schedule** - View and edit cron schedules
- **Job History** - See job execution history
- **Trigger Manually** - Manually trigger cron jobs
- **YAML Viewer/Editor** - View cron job configuration
- **Describe View** - CronJob details and status

### Networking Section

#### Services
- **Service List** - View all services (ClusterIP, NodePort, LoadBalancer, ExternalName)
- **Port Forwarding** - One-click port forwarding with session management
- **Endpoint Discovery** - View service endpoints and pod backends
- **YAML Viewer/Editor** - View service configuration
- **Describe View** - Service details and selectors
- **Service Type Filtering** - Filter by service type
- **Namespace Filtering** - Filter services by namespace

#### Ingresses
- **Ingress List** - View ingress rules and TLS configuration
- **Ingress Rules** - View routing rules and paths
- **TLS Configuration** - View TLS certificates and secrets
- **YAML Viewer/Editor** - View and edit ingress configuration
- **Describe View** - Ingress details
- **Namespace Filtering** - Filter ingresses by namespace

#### Network Policies
- **NetworkPolicy List** - View and manage Kubernetes Network Policies
- **Policy Visualization** - Visual representation of network rules
- **Ingress/Egress Rules** - View policy rules
- **Pod Selector Matching** - See which pods match policies
- **Policy Testing** - Test network policy rules

### Config & Storage Section

#### ConfigMaps
- **ConfigMap List** - View all ConfigMaps
- **View/Edit Data** - View and edit configuration data
- **YAML Viewer/Editor** - Full ConfigMap YAML editing
- **Key-Value Management** - Add, edit, delete keys
- **Namespace Filtering** - Filter ConfigMaps by namespace
- **Describe View** - ConfigMap details

#### Secrets
- **Secret List** - View all secrets
- **Secure Display** - Masked secret values
- **YAML Viewer/Editor** - View and edit secret configuration
- **Secret Type Filtering** - Filter by secret type
- **Namespace Filtering** - Filter secrets by namespace
- **Base64 Encoding** - Automatic encoding/decoding

#### Certificates
- **Certificate List** - TLS certificate management
- **Expiration Tracking** - Certificate expiration dates and warnings
- **Certificate Details** - View certificate information
- **Renewal Reminders** - Expiration notifications
- **YAML Viewer** - View certificate configuration

#### Storage
- **PersistentVolumes (PVs)** - View and manage PVs
- **PersistentVolumeClaims (PVCs)** - View and manage PVCs
- **StorageClasses** - View and manage storage classes
- **Storage Tab Navigation** - Switch between PV, PVC, StorageClass views
- **YAML Viewer/Editor** - View and edit storage configurations
- **Capacity Information** - View storage capacity and usage
- **Access Modes** - View access mode configurations
- **Reclaim Policies** - View and manage reclaim policies
- **Volume Binding** - View volume binding information

### Cluster Section

#### Nodes
- **Node List** - View all cluster nodes
- **Node Health** - Node status and conditions
- **Resource Capacity** - CPU, memory, storage capacity
- **Allocatable Resources** - Available resources for pods
- **Node Metrics** - CPU and memory usage per node
- **Node Labels** - View and filter by node labels
- **Taints & Tolerations** - View node taints
- **Node Details** - Comprehensive node information

#### RBAC
- **Role Management** - View and manage Roles
- **RoleBinding Management** - View and manage RoleBindings
- **ClusterRole Management** - View and manage ClusterRoles
- **ClusterRoleBinding Management** - View and manage ClusterRoleBindings
- **RBAC Tab Navigation** - Switch between RBAC resource types
- **Rule Visualization** - View RBAC rules and permissions
- **Subject Management** - View users, groups, service accounts
- **YAML Viewer/Editor** - View and edit RBAC configurations
- **Namespace Filtering** - Filter roles and bindings by namespace

#### User Management
- **User List** - View all system users
- **User Creation** - Create new users
- **User Roles** - Assign roles to users
- **User Status** - Enable/disable users
- **Authentication** - Login/logout functionality
- **User Details** - View user information and permissions
- **Last Login Tracking** - View user activity

#### Events
- **Event List** - Real-time cluster events and notifications
- **Event Filtering** - Filter by type, namespace, resource
- **Event Timeline** - Chronological event view
- **Event Details** - Detailed event information
- **Namespace Filtering** - Filter events by namespace
- **Resource Filtering** - Filter events by resource type
- **Event Search** - Search events by message

#### Event Monitor
- **Monitored Events** - Advanced event monitoring and analysis
- **Event Timeline View** - Chronological event visualization
- **Grouped View** - Group events by type, namespace, resource
- **Error Log View** - View application errors from logs
- **Severity Filtering** - Filter by critical, high, medium, low, info
- **Type Filtering** - Filter by infrastructure, application, security
- **Multi-Namespace Selection** - Monitor events across namespaces
- **Event Statistics** - Event counts and trends
- **Auto-Refresh** - Real-time event updates
- **Event Grouping** - Group similar events together
- **Log Error Analysis** - Extract errors from pod logs

#### Resource Map
- **Hierarchical View** - Tree structure of resource relationships
- **Dependency Visualization** - Visual resource dependencies
- **Multi-format Export** - ASCII, Graphviz, D3.js
- **Relationship Mapping** - Track dependencies and connections
- **Interactive Navigation** - Click to navigate to resources

### Integrations Section

#### Connectors
- **GitHub Integration** - Connect to GitHub repositories
- **Slack Integration** - Send alerts to Slack channels
- **PagerDuty Integration** - Incident management integration
- **Webhook Support** - Custom webhook integrations
- **Email Notifications** - Email alert configuration
- **Microsoft Teams** - Teams channel integration
- **Discord Integration** - Discord webhook support
- **Connector Management** - Create, edit, delete connectors
- **Connection Testing** - Test connector configurations
- **Status Monitoring** - View connector connection status

#### AI Agents
- **MCP Integration** - Model Context Protocol support
- **AI Tool Management** - View available AI tools
- **Tool Descriptions** - View tool capabilities
- **MCP Server Status** - Check MCP server availability
- **Tool Schema** - View tool input schemas
- **AI Agent Configuration** - Configure AI agent settings

#### SRE Agent
- **SRE Metrics Dashboard** - Incident and remediation metrics
- **Auto-Remediation** - Automated incident resolution
- **Incident Detection** - Automatic incident identification
- **Remediation Actions** - View and manage remediation actions
- **SLO Monitoring** - Service Level Objective tracking
- **Batch SLO Tracking** - Batch job SLO monitoring
- **Notification Management** - Configure alert notifications
- **Learning Mode** - AI-powered learning from incidents
- **Action History** - View remediation action history
- **Escalation Management** - Configure escalation rules

#### Kiali
- **Service Mesh Visualization** - Kiali service mesh integration
- **Service Graph** - Visual service dependencies
- **Traffic Analysis** - Service-to-service traffic metrics
- **Istio Integration** - Istio service mesh support

### Extensions Section

#### Plugins
- **Plugin Management** - View and manage installed plugins
- **Helm Integration** - Helm chart management
- **ArgoCD Integration** - GitOps deployment tracking
- **Flux Integration** - FluxCD integration
- **Plugin Status** - Monitor plugin health
- **Custom Plugins** - Extensible plugin architecture

#### Terminal
- **Local Terminal** - Full-featured system terminal
- **PTY Support** - Pseudo-terminal emulation
- **Command Execution** - Run system commands
- **Terminal History** - Command history support
- **Multi-tab Support** - Multiple terminal sessions
- **Docked Terminal** - Terminal panel at bottom of screen

#### UI Demo
- **Component Showcase** - View UI components
- **Theme Preview** - Preview all available themes
- **Feature Demonstration** - Showcase UI features

### ML Workloads Section

#### Training Jobs
- **ML Training Job Management** - Create and manage ML training jobs
- **Job Creation Wizard** - Guided training job setup
- **Docker Image Building** - Build Docker images from training scripts
- **Job Status Tracking** - Monitor training job progress
- **Job Logs** - View training job logs
- **Job History** - View training job execution history
- **Resource Configuration** - Configure CPU, memory, GPU resources
- **Volume Mounts** - Configure data volumes
- **Job Deletion** - Remove completed training jobs

#### Inference Services
- **Inference Service Management** - Create and manage inference services
- **Service Creation** - Deploy ML inference endpoints
- **Auto-scaling** - Horizontal Pod Autoscaler (HPA) configuration
- **Ingress Configuration** - Expose inference services
- **Storage Configuration** - Configure model storage (MinIO, S3)
- **Service Testing** - Test inference endpoints
- **Service Status** - Monitor inference service health
- **Traffic Management** - Manage inference traffic

#### MLflow
- **MLflow Integration** - MLflow experiment tracking
- **Experiment Management** - View and manage ML experiments
- **Run Tracking** - Track ML training runs
- **Model Registry** - Manage ML models
- **Metrics Visualization** - View training metrics
- **MLflow Installation** - Install MLflow in cluster

#### Feature Store (Feast)
- **Feast Integration** - Feature store management
- **Feature Management** - View and manage features
- **Online Store** - Configure online feature store (Redis, BigQuery)
- **Offline Store** - Configure offline feature store (BigQuery, Snowflake, File)
- **Feast Installation** - Install Feast in cluster
- **Feature Serving** - Serve features for ML models

#### GPU Dashboard
- **GPU Detection** - Detect GPU nodes in cluster
- **GPU Metrics** - View GPU utilization and metrics
- **DCGM Integration** - NVIDIA DCGM exporter support
- **GPU Process Monitoring** - View GPU processes
- **GPU Installation** - Install DCGM exporter
- **Prometheus Integration** - GPU metrics from Prometheus
- **GPU Node Information** - View GPU node details

### Settings & System

#### Settings
- **Appearance Settings** - Theme selection, UI customization
- **Cluster Settings** - Default namespace, context management
- **Update Settings** - Auto-update configuration
- **Notification Settings** - Sound, toast notification preferences
- **Advanced Settings** - Developer options, feature flags
- **Settings Reset** - Reset all settings to defaults
- **Version Information** - View current version
- **Update Check** - Manual update checking

#### Cluster Manager
- **Multi-Cluster Support** - Manage multiple Kubernetes clusters
- **Context Switching** - Switch between Kubernetes contexts
- **Cluster Discovery** - Auto-detect available clusters
- **Manual Cluster Addition** - Add clusters manually
- **Cluster Connection Status** - View cluster connectivity
- **Default Cluster** - Set default cluster
- **Cluster Provider Detection** - Detect cloud provider (GKE, EKS, AKS, etc.)
- **Cluster Disconnection** - Disconnect from clusters

#### Update Notification
- **Auto-Update Check** - Background update checking every 4 hours
- **Update Banner** - Visual notification when updates available
- **Update Modal** - Detailed update information
- **Manual Update Check** - Check for updates on demand
- **Version Comparison** - Compare current vs. latest version
- **Release Notes** - View release notes
- **Update Instructions** - Installation command provided

---

## 🔍 Resource Operations

### Pod Operations
- **Shell Access** - Interactive terminal via WebSocket (`kubectl exec`)
- **Logs Streaming** - Real-time log viewing with search and filtering
- **YAML Viewer** - Syntax-highlighted full resource configuration
- **Describe** - Full `kubectl describe` output
- **Restart** - Restart pods with confirmation
- **Delete** - Safe deletion with confirmation dialogs
- **Port Forward** - Forward container ports to local machine
- **Metrics** - CPU and memory usage tracking

### Deployment Operations
- **Scale** - Scale replicas up or down
- **Restart** - Trigger rolling restart
- **Rollback** - Rollback to previous revisions
- **History** - View deployment revision history
- **YAML** - View and edit deployment manifests
- **Describe** - Detailed deployment information

### Service Operations
- **Port Forwarding** - One-click port forwarding with session management
- **Endpoint Discovery** - View service endpoints and pod backends
- **YAML** - View service configuration
- **Describe** - Service details and selectors

### StatefulSet Operations
- **Scale** - Scale stateful replicas
- **Restart** - Rolling restart of stateful pods
- **YAML** - View and manage stateful set configuration
- **Describe** - StatefulSet details

### DaemonSet Operations
- **Restart** - Restart daemon pods
- **YAML** - View daemon set configuration
- **Describe** - DaemonSet details

### CronJob & Job Operations
- **View History** - See job execution history
- **Trigger Manually** - Manually trigger cron jobs
- **YAML** - View cron job configuration
- **Describe** - Job details and status

---

## 🎨 Visualization & Topology

### Topology Visualization
- **D3.js Force-Directed Graphs** - Interactive node-link diagrams
- **Resource Relationships** - Visualize Ingress → Service → Pod connections
- **Dependency Tracking** - ConfigMaps, Secrets, ServiceAccounts linked to workloads
- **Draggable Nodes** - Interactive node positioning
- **Color-Coded Resources** - Visual distinction by resource type
- **Real-time Updates** - Live topology changes via WebSocket

### Terminal Visualization
- **ASCII Tree View** - Text-based hierarchy in terminal
- **Terminal Canvas** - Interactive graph rendered in terminal (no browser)
- **Graphviz Export** - Generate structured graph layouts
- **Browser Graphs** - Open D3.js visualizations in browser

### Resource Map
- **Hierarchical View** - Tree structure of resource relationships
- **Multi-format Export** - ASCII, Graphviz, D3.js
- **Relationship Mapping** - Track dependencies and connections

---

## 🛡️ Security Features

### Security Analysis
- **Automated Scanning** - Continuous security posture analysis
- **Security Score** - 0-100 score based on findings
- **Severity Levels** - Critical, High, Medium, Low classifications

### Security Checks

#### SecurityContext Analysis
- Missing SecurityContext on pods (Critical)
- Pods not running as non-root (High)
- Privileged containers (Critical)
- allowPrivilegeEscalation enabled (Medium)
- Writable root filesystem (Low)
- Missing read-only root filesystem (Medium)
- Missing capabilities drop (Medium)

#### Network Security
- Namespaces without NetworkPolicies (High)
- Missing network segmentation

#### Ingress Security
- Using insecure ports (80, 8080, 8000, 3000) (Medium/High)
- Missing TLS configuration (High)
- HTTP-only ingress (High)

#### Service Security
- NodePort services exposed (Medium)
- LoadBalancer external traffic policy (Low)

### Remediation
- **Actionable Recommendations** - Specific steps to fix issues
- **Code Examples** - YAML snippets for remediation
- **Best Practices** - Security guidelines and standards

---

## 💰 Cost Management

### Cost Estimation
- **Cloud Provider Detection** - Auto-detect GCP, AWS, Azure, IBM, Oracle, DigitalOcean, Alibaba, Linode, Vultr, OVH, Hetzner
- **Resource Cost Calculation** - CPU and memory cost estimation
- **Node Pool Analysis** - Spot instance detection
- **Namespace Cost Breakdown** - Per-namespace cost allocation
- **Workload Cost Analysis** - Cost per deployment/pod

### Cost Features
- **Real-time Cost Tracking** - Live cost updates
- **Historical Trends** - Cost over time analysis
- **Resource Optimization** - Identify cost-saving opportunities
- **Multi-cloud Support** - Works with various cloud providers

---

## 🔄 Drift Detection

### Configuration Drift
- **GitOps Sync Status** - Detect drift from Git repositories
- **Last Applied Configuration** - Compare current vs. desired state
- **Field-level Differences** - Detailed drift analysis
- **Drift Status** - Synced, Drifted, Missing, Unknown

### Drift Detection Features
- **Resource Comparison** - Compare live vs. declared state
- **Change Tracking** - Track who modified resources
- **GitOps Integration** - Detect ArgoCD/Flux sync status
- **Remediation Suggestions** - How to fix drift

---

## 🤖 AI-Powered Features

### AI Integration
- **Multiple AI Providers** - Ollama (local), OpenAI, Anthropic Claude
- **AI Chat** - Interactive AI assistant for cluster management
- **Smart Insights** - AI-powered recommendations
- **Resource Analysis** - AI-assisted troubleshooting
- **Natural Language Queries** - Ask questions about your cluster

### AI Capabilities
- **Cluster Analysis** - Get insights about cluster health
- **Troubleshooting** - AI-assisted problem diagnosis
- **Best Practices** - Get recommendations based on your setup
- **Resource Optimization** - AI-suggested improvements

---

## 📈 Monitoring & Metrics

### Real-time Metrics
- **CPU Usage** - Live CPU consumption per pod
- **Memory Usage** - Real-time memory utilization
- **Pod Counts** - Running, pending, failed, succeeded
- **Resource Requests/Limits** - Track resource allocation
- **Sparklines** - Visual trend indicators

### Metrics Features
- **WebSocket Updates** - Live metric streaming
- **Historical Data** - Track metrics over time
- **Resource Heatmaps** - Visual resource usage patterns
- **Node Metrics** - Per-node resource utilization

---

## 🔌 Plugin System

### Supported Plugins
- **Helm** - Helm chart management and releases
- **ArgoCD** - GitOps deployment tracking
- **Flux** - FluxCD integration
- **Custom Plugins** - Extensible plugin architecture

### Plugin Features
- **App Marketplace** - Browse and install applications
- **Install/Uninstall** - Manage Helm releases
- **Status Tracking** - Monitor plugin deployments
- **Custom Columns** - Plugin-defined resource columns

---

## 🌐 Multi-Cluster Support

### Cluster Management
- **Context Switching** - Switch between Kubernetes contexts
- **Multi-cluster View** - View resources across clusters
- **Connection Status** - Real-time cluster connectivity
- **Context Detection** - Auto-detect available contexts

---

## 📡 Network & Traffic Analysis

### Network Features
- **Traffic Metrics** - Flow analysis between resources
- **Network Topology** - Visual network connections
- **Port Mapping** - Service and pod port visualization
- **Connection Tracking** - Monitor network connections

### Traffic Analysis
- **Source/Destination** - Track traffic flows
- **Protocol Analysis** - TCP, UDP protocol tracking
- **Port Analysis** - Port-level traffic metrics

---

## 🎯 Advanced Features

### Diagnostics
- **Health Checks** - Automated cluster health analysis
- **Resource Validation** - Validate resource configurations
- **Performance Analysis** - Identify performance bottlenecks
- **Issue Detection** - Automated problem identification

### Events
- **Real-time Events** - Live cluster event streaming
- **Event Filtering** - Filter by type, namespace, resource
- **Event History** - View historical events
- **Event Notifications** - Alert on important events

### Impact Analysis
- **Dependency Analysis** - Understand resource dependencies
- **Change Impact** - Predict impact of changes
- **Cascade Effects** - Track cascading changes

### Search & Filtering
- **Fuzzy Search** - Intelligent resource search
- **Advanced Filters** - Filter by labels, status, namespace
- **Quick Navigation** - Fast resource lookup

---

## 🎨 UI/UX Features

### Solid.js UI Features
- **5 Themes** - Dark, Light, Midnight, Cyberpunk, Ocean
- **Collapsible Sidebar** - Space-efficient navigation
- **Responsive Design** - Works on all screen sizes
- **Dark/Light Mode** - Automatic theme switching
- **Keyboard Shortcuts** - Power user navigation
- **Notifications** - Toast notifications for actions
- **Modals** - Rich modal dialogs for operations

### Web Dashboard Features
- **Gradient Backgrounds** - Modern visual design
- **Real-time Updates** - WebSocket-powered live data
- **Interactive Charts** - Visual data representation
- **Resource Cards** - Quick resource overview

### Terminal UI Features
- **Tab Navigation** - Quick tab switching (1-7 keys)
- **Vim Bindings** - j/k for navigation, h/l for tabs
- **Color Coding** - Status-based color highlighting
- **Help System** - Built-in help (press ?)

---

## 🔧 Developer Features

### API Endpoints
- **RESTful API** - Complete REST API for all resources
- **WebSocket API** - Real-time data streaming
- **OpenAPI Support** - API documentation
- **CORS Support** - Cross-origin resource sharing

### Extensibility
- **Plugin SDK** - Build custom plugins
- **Custom Columns** - Define custom resource views
- **Webhook Support** - Integrate with external systems
- **CLI Integration** - Works with kubectl and other tools

---

## 📋 Summary

KubeGraf provides a comprehensive set of features for Kubernetes cluster management:

### Interface Options
- **3 Interfaces** - Terminal UI (TUI), Web Dashboard (Classic), and Solid.js UI (Modern SPA)
- **5 Built-in Themes** - Dark, Light, Midnight, Cyberpunk, Ocean
- **Responsive Design** - Works on desktop, tablet, and mobile devices

### Resource Management
- **20+ Kubernetes Resource Types** - Full Kubernetes resource coverage
  - Workloads: Pods, Deployments, StatefulSets, DaemonSets, Jobs, CronJobs
  - Networking: Services, Ingresses, Network Policies
  - Configuration: ConfigMaps, Secrets, Certificates
  - Storage: PersistentVolumes, PersistentVolumeClaims, StorageClasses
  - Cluster: Nodes, Namespaces, Events, RBAC (Roles, RoleBindings, ClusterRoles, ClusterRoleBindings)
  - Extensions: Custom Resources (CRDs)

### Advanced Features
- **Security Analysis** - Automated security posture assessment with remediation guidance
- **Cost Management** - Multi-cloud cost estimation and optimization (11 cloud providers supported)
- **Drift Detection** - Configuration drift monitoring with GitOps integration
- **AI Integration** - AI-powered insights, anomaly detection, and recommendations
- **ML Workloads** - Training jobs, inference services, MLflow, Feast feature store, GPU dashboard
- **Visualization** - Multiple topology and graph views (D3.js, ASCII, Graphviz)
- **Real-time Monitoring** - Live metrics, WebSocket updates, event streaming
- **Plugin System** - Extensible architecture with Helm, ArgoCD, Flux support
- **Multi-cluster** - Support for multiple Kubernetes contexts with cluster manager
- **Apps Marketplace** - 50+ pre-configured Helm charts for one-click installation

### Integrations
- **Connectors** - GitHub, Slack, PagerDuty, Webhooks, Email, Teams, Discord
- **AI Agents** - MCP (Model Context Protocol) integration
- **SRE Agent** - Automated incident detection and remediation
- **Kiali** - Service mesh visualization and traffic analysis

### User Experience
- **Update Notifications** - Auto-check for updates with visual notifications
- **Terminal Access** - Built-in terminal for local system and pod shell access
- **Log Streaming** - Real-time log viewing with search and filtering
- **YAML Editor** - Full YAML editing capabilities for all resources
- **Search & Filtering** - Advanced filtering and fuzzy search across resources
- **Keyboard Shortcuts** - Power user navigation support
- **Toast Notifications** - User feedback for all actions

### Sidebar Navigation
The Solid.js UI features a comprehensive sidebar with 10 main sections:
1. **Overview** - Dashboard
2. **Insights** - AI Insights, Incidents, Cost, Security, Drift
3. **CD** - Deploy (Apps), Rollouts
4. **Workloads** - Pods, Deployments, StatefulSets, DaemonSets, Jobs, CronJobs
5. **Networking** - Services, Ingresses, Network Policies
6. **Config & Storage** - ConfigMaps, Secrets, Certificates, Storage
7. **Cluster** - Nodes, RBAC, User Management, Events, Event Monitor, Resource Map
8. **Integrations** - Connectors, AI Agents, SRE Agent, Kiali
9. **Extensions** - Plugins, Terminal, UI Demo
10. **ML Workloads** - Training Jobs, Inference Services, MLflow, Feast, GPU Dashboard

This makes KubeGraf a complete solution for Kubernetes cluster visualization, management, optimization, and ML workload operations.

