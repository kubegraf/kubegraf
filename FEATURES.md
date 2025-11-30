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
- **Collapsible sidebar** for better navigation
- **Full CRUD operations** on resources
- **Plugin system** for extensibility
- **AI-powered insights** and recommendations
- **Advanced filtering and search**

---

## 📊 Resource Management

### Supported Kubernetes Resources

#### Workloads
- **Pods** - View, manage, shell access, logs, restart, delete
- **Deployments** - Scale, restart, view history, rollback
- **StatefulSets** - Manage stateful workloads
- **DaemonSets** - View and manage daemon pods
- **CronJobs** - Schedule and monitor cron jobs
- **Jobs** - Track and manage job executions

#### Networking
- **Services** - ClusterIP, NodePort, LoadBalancer, ExternalName
- **Ingresses** - View ingress rules and TLS configuration
- **Port Forwarding** - One-click service access with session management

#### Configuration
- **ConfigMaps** - View and edit configuration data
- **Secrets** - Secure configuration management (masked display)
- **Certificates** - TLS certificate management and expiration tracking

#### Cluster
- **Nodes** - Node health, capacity, allocatable resources
- **Namespaces** - Multi-namespace support, namespace switching
- **Events** - Real-time cluster events and notifications

#### Extensions
- **Apps Marketplace** - Browse and install Helm charts
- **Plugins** - Helm, ArgoCD, Flux integrations
- **Custom Resources** - Support for CRDs via dynamic client

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

- **3 Interfaces** - Terminal, Web, and Modern SPA
- **20+ Resource Types** - Full Kubernetes resource coverage
- **Security Analysis** - Automated security posture assessment
- **Cost Management** - Cloud cost estimation and optimization
- **Drift Detection** - Configuration drift monitoring
- **AI Integration** - AI-powered insights and assistance
- **Visualization** - Multiple topology and graph views
- **Real-time Monitoring** - Live metrics and updates
- **Plugin System** - Extensible architecture
- **Multi-cluster** - Support for multiple Kubernetes contexts

This makes KubeGraf a complete solution for Kubernetes cluster visualization, management, and optimization.

