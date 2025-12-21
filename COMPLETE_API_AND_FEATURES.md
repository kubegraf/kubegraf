# KubeGraf - Complete API & Features Documentation

> **Comprehensive documentation of all frontend and backend APIs, features, and capabilities**

**Version:** 1.7.20+  
**Last Updated:** December 2024

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Backend APIs](#backend-apis)
4. [Frontend Features](#frontend-features)
5. [WebSocket Endpoints](#websocket-endpoints)
6. [Performance Features](#performance-features)
7. [Security Features](#security-features)
8. [Installation & Usage](#installation--usage)

---

## Overview

KubeGraf is a production-grade Kubernetes management platform that provides:

- **3 Interfaces**: Terminal UI (TUI), Web Dashboard, Modern Solid.js SPA
- **200+ API Endpoints**: Complete Kubernetes resource management
- **Real-time Monitoring**: WebSocket streaming for metrics, logs, events
- **AI-Powered Intelligence**: Incident detection, anomaly detection, auto-remediation
- **Multi-Cloud Support**: GKE, EKS, AKS, DigitalOcean, Civo, Linode, K3s, Minikube
- **50+ Apps Marketplace**: One-click deployment of popular Kubernetes applications
- **ML Lifecycle Management**: Training jobs, model registry, inference services
- **Security & Compliance**: Automated scanning, RBAC analysis, CVE detection
- **Cost Optimization**: Multi-cloud cost tracking and recommendations

---

## Architecture

### Backend (Go)
- **Single Binary**: All functionality in one executable
- **Embedded Frontend**: Solid.js UI embedded via `//go:embed`
- **RESTful APIs**: JSON-based HTTP endpoints
- **WebSocket Streaming**: Real-time data streaming
- **SQLite Database**: Local knowledge bank and incident storage
- **Fast Retrieval System**: Indexed queries with caching

### Frontend (Solid.js)
- **Modern SPA**: Reactive single-page application
- **5 Built-in Themes**: Dark, Light, Midnight, Cyberpunk, Ocean
- **Component-Based**: Modular, reusable components
- **Real-time Updates**: WebSocket integration for live data
- **Responsive Design**: Works on desktop, tablet, and mobile

---

## Backend APIs

### 🔍 Core Status & Health

| Endpoint | Method | Description | Response |
|----------|--------|-------------|----------|
| `/health` | GET | Health check endpoint | `{"status":"ok","service":"kubegraf"}` |
| `/api/status` | GET | Connection status | `{"connected":true,"cluster":"..."}` |

### 📊 Cluster Management

#### Context & Connection
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/contexts` | GET | List all Kubernetes contexts |
| `/api/contexts/current` | GET | Get current context |
| `/api/contexts/switch` | POST | Switch Kubernetes context |
| `/api/clusters` | GET | List all clusters (legacy) |
| `/api/clusters/list` | GET | Fast cluster list (pre-warmed) |
| `/api/clusters/connect` | POST | Connect to a cluster |
| `/api/clusters/disconnect` | POST | Disconnect from cluster |
| `/api/clusters/status` | GET | Cluster connection status |
| `/api/clusters/refresh` | POST | Refresh cluster data |
| `/api/clusters/namespaces` | GET | Get namespaces for cluster |
| `/api/clusters/pods` | GET | Get pods for cluster |
| `/api/clusters/events` | GET | Get events for cluster |
| `/api/clusters/summary` | GET | Multi-cluster summary (Phase 1) |

#### Workspace
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/workspace/context` | GET/POST | Get/set workspace context |

### 📦 Resource Management

#### Pods
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/pods` | GET | List all pods |
| `/api/pods/metrics` | GET | Pod resource metrics |
| `/api/pod/details` | GET | Get pod details |
| `/api/pod/yaml` | GET | Get pod YAML |
| `/api/pod/update` | POST | Update pod from YAML |
| `/api/pod/describe` | GET | `kubectl describe` output |
| `/api/pod/exec` | GET/POST | Execute command in pod |
| `/api/pod/terminal` | WebSocket | Interactive pod terminal |
| `/api/pod/logs` | GET | Get pod logs (streaming) |
| `/api/pod/restart` | POST | Restart pod |
| `/api/pod/delete` | POST | Delete pod |

#### Deployments
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/deployments` | GET | List all deployments |
| `/api/deployment/details` | GET | Get deployment details |
| `/api/deployment/yaml` | GET | Get deployment YAML |
| `/api/deployment/update` | POST | Update deployment from YAML |
| `/api/deployment/describe` | GET | `kubectl describe` output |
| `/api/deployment/restart` | POST | Restart deployment |
| `/api/deployment/scale` | POST | Scale deployment |
| `/api/deployment/delete` | POST | Delete deployment |
| `/api/deployments/bulk/restart` | POST | Bulk restart deployments |
| `/api/deployments/bulk/delete` | POST | Bulk delete deployments |

#### StatefulSets
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/statefulsets` | GET | List all statefulsets |
| `/api/statefulset/details` | GET | Get statefulset details |
| `/api/statefulset/yaml` | GET | Get statefulset YAML |
| `/api/statefulset/update` | POST | Update statefulset from YAML |
| `/api/statefulset/describe` | GET | `kubectl describe` output |
| `/api/statefulset/restart` | POST | Restart statefulset |
| `/api/statefulset/scale` | POST | Scale statefulset |
| `/api/statefulset/delete` | POST | Delete statefulset |
| `/api/statefulsets/bulk/restart` | POST | Bulk restart statefulsets |
| `/api/statefulsets/bulk/delete` | POST | Bulk delete statefulsets |

#### DaemonSets
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/daemonsets` | GET | List all daemonsets |
| `/api/daemonset/details` | GET | Get daemonset details |
| `/api/daemonset/yaml` | GET | Get daemonset YAML |
| `/api/daemonset/update` | POST | Update daemonset from YAML |
| `/api/daemonset/describe` | GET | `kubectl describe` output |
| `/api/daemonset/restart` | POST | Restart daemonset |
| `/api/daemonset/delete` | POST | Delete daemonset |
| `/api/daemonsets/bulk/restart` | POST | Bulk restart daemonsets |
| `/api/daemonsets/bulk/delete` | POST | Bulk delete daemonsets |

#### Jobs & CronJobs
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/jobs` | GET | List all jobs |
| `/api/job/details` | GET | Get job details |
| `/api/job/yaml` | GET | Get job YAML |
| `/api/job/update` | POST | Update job from YAML |
| `/api/job/describe` | GET | `kubectl describe` output |
| `/api/job/delete` | POST | Delete job |
| `/api/cronjobs` | GET | List all cronjobs |
| `/api/cronjob/details` | GET | Get cronjob details |
| `/api/cronjob/yaml` | GET | Get cronjob YAML |
| `/api/cronjob/update` | POST | Update cronjob from YAML |
| `/api/cronjob/describe` | GET | `kubectl describe` output |
| `/api/cronjob/delete` | POST | Delete cronjob |

### 🌐 Networking

#### Services
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/services` | GET | List all services |
| `/api/service/details` | GET | Get service details |
| `/api/service/yaml` | GET | Get service YAML |
| `/api/service/update` | POST | Update service from YAML |
| `/api/service/describe` | GET | `kubectl describe` output |
| `/api/service/delete` | POST | Delete service |

#### Ingresses
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/ingresses` | GET | List all ingresses |
| `/api/ingress/details` | GET | Get ingress details |
| `/api/ingress/yaml` | GET | Get ingress YAML |
| `/api/ingress/update` | POST | Update ingress from YAML |
| `/api/ingress/describe` | GET | `kubectl describe` output |
| `/api/ingress/delete` | POST | Delete ingress |

#### Network Policies
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/networkpolicies` | GET | List all network policies |
| `/api/networkpolicy/details` | GET | Get network policy details |
| `/api/networkpolicy/yaml` | GET | Get network policy YAML |
| `/api/networkpolicy/describe` | GET | `kubectl describe` output |
| `/api/networkpolicy/delete` | POST | Delete network policy |

### ⚙️ Configuration

#### ConfigMaps
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/configmaps` | GET | List all configmaps |
| `/api/configmap/details` | GET | Get configmap details |
| `/api/configmap/yaml` | GET | Get configmap YAML |
| `/api/configmap/update` | POST | Update configmap from YAML |
| `/api/configmap/describe` | GET | `kubectl describe` output |
| `/api/configmap/delete` | POST | Delete configmap |

#### Secrets
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/secrets` | GET | List all secrets |
| `/api/secret/yaml` | GET | Get secret YAML (base64 encoded) |
| `/api/secret/update` | POST | Update secret from YAML |
| `/api/secret/describe` | GET | `kubectl describe` output |
| `/api/secret/delete` | POST | Delete secret |

### 💾 Storage

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/storage/pvs` | GET | List persistent volumes |
| `/api/storage/pvcs` | GET | List persistent volume claims |
| `/api/storage/classes` | GET | List storage classes |

### 🏗️ Cluster Resources

#### Namespaces
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/namespaces` | GET | List all namespaces |
| `/api/namespace/details` | GET | Get namespace details |
| `/api/namespace/yaml` | GET | Get namespace YAML |
| `/api/namespace/update` | POST | Update namespace from YAML |
| `/api/namespace/describe` | GET | `kubectl describe` output |
| `/api/namespace/delete` | POST | Delete namespace |

#### Nodes
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/nodes` | GET | List all nodes |
| `/api/node/details` | GET | Get node details |
| `/api/node/yaml` | GET | Get node YAML |
| `/api/node/describe` | GET | `kubectl describe` output |

#### RBAC
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/rbac/roles` | GET | List roles |
| `/api/rbac/rolebindings` | GET | List role bindings |
| `/api/rbac/clusterroles` | GET | List cluster roles |
| `/api/rbac/clusterrolebindings` | GET | List cluster role bindings |
| `/api/rbac/serviceaccounts` | GET | List service accounts |

### 📈 Monitoring & Metrics

#### Realtime Metrics (NEW)
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/ws/metrics` | WebSocket | Realtime CPU/Memory streaming |
| `/api/metrics/snapshot` | GET | Current metrics buffer |
| `/api/metrics/status` | GET | Metrics collector status |

#### Legacy Metrics
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/metrics` | GET | Cluster metrics (legacy) |

### 📋 Events & Logs

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/events` | GET | List Kubernetes events |
| `/api/pod/logs` | GET | Stream pod logs |
| `/api/executions` | GET | List execution history |
| `/api/executions/logs` | GET | Get execution logs |

### 🚨 Incident Intelligence (v2)

#### Core Incident APIs
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v2/incidents` | GET | List incidents (with pagination) |
| `/api/v2/incidents/{id}` | GET | Get incident details |
| `/api/v2/incidents/{id}` | PUT | Update incident status |
| `/api/v2/incidents/summary` | GET | Incident statistics |
| `/api/v2/incidents/patterns` | GET | Pattern distribution |
| `/api/v2/incidents/refresh` | POST | Refresh incident data |
| `/api/v2/incidents/regenerate-recommendations` | POST | Regenerate recommendations |

#### Intelligence Features
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v2/incidents/{id}/evidence` | GET | Get evidence pack |
| `/api/v2/incidents/{id}/citations` | GET | Get citations |
| `/api/v2/incidents/{id}/runbooks` | GET | Get available runbooks |
| `/api/v2/incidents/{id}/similar` | GET | Get similar incidents |
| `/api/v2/incidents/{id}/feedback` | POST | Submit feedback |

#### Fix Operations
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v2/incidents/{id}/fix-preview` | POST | Preview a fix |
| `/api/v2/incidents/{id}/fix-apply` | POST | Apply a fix |
| `/api/v2/incidents/fix-preview` | POST | Preview fix (alternative) |
| `/api/v2/incidents/fix-apply` | POST | Apply fix (alternative) |

**Query Parameters for `/api/v2/incidents`:**
- `namespace` - Filter by namespace
- `pattern` - Filter by failure pattern
- `severity` - Filter by severity (critical, high, medium, low)
- `status` - Filter by status (open, investigating, resolved, etc.)
- `active` - Only active incidents (true/false)
- `page` - Page number (0-indexed)
- `pageSize` - Items per page (max 1000)

### 🔧 Phase 1 Features

#### Developer Mode
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/explain/pod` | GET | Explain pod lifecycle and issues |
| **Query Params:** `namespace`, `pod` | | |

#### Change Intelligence
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/incidents/{id}/changes` | GET | Get changes before incident |

#### Knowledge Bank
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/knowledge/export` | POST | Export knowledge bank |
| `/api/knowledge/import` | POST | Import knowledge bank (multipart) |

### 🖥️ Terminal & Execution

#### Native Terminal (NEW)
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/terminal/open` | POST | Open native system terminal |
| **Body:** `{"workingDir": "optional/path"}` | | |

#### Web Terminal
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/local/terminal` | WebSocket | Local terminal WebSocket |
| `/terminal` | GET | Terminal HTML page |

#### Execution
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/execution/stream` | WebSocket | Stream execution output |

### 🔄 Port Forwarding

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/portforward/list` | GET | List active port forwards |
| `/api/portforward/start` | POST | Start port forward |
| `/api/portforward/stop` | POST | Stop port forward |

### 🛒 Apps Marketplace

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/apps` | GET | List available apps |
| `/api/apps/installed` | GET | List installed apps |
| `/api/apps/install` | POST | Install an app |
| `/api/apps/uninstall` | POST | Uninstall an app |
| `/api/apps/local-clusters` | GET | List local clusters (K3s, Minikube, Kind) |

### 🤖 AI & ML Features

#### Brain System
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/brain/summary` | GET | Brain system summary |
| `/api/brain/timeline` | GET | Brain timeline |
| `/api/brain/oom-insights` | GET | OOM insights |
| `/api/brain/ml/predictions` | GET | ML predictions |
| `/api/brain/ml/summary` | GET | ML summary |
| `/api/brain/ml/timeline` | GET | ML timeline |

#### ML Jobs
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/ml/jobs/list` | GET | List ML training jobs |
| `/api/ml/jobs/get` | GET | Get ML job details |
| `/api/ml/jobs/create` | POST | Create ML training job |
| `/api/ml/jobs/delete` | POST | Delete ML job |
| `/api/ml/jobs/logs` | GET | Get ML job logs |
| `/api/ml/jobs/logs/ws` | WebSocket | Stream ML job logs |

#### Inference Services
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/inference/list` | GET | List inference services |
| `/api/inference/get` | GET | Get inference service |
| `/api/inference/create` | POST | Create inference service |
| `/api/inference/delete` | POST | Delete inference service |
| `/api/inference/test` | POST | Test inference service |
| `/api/inference/status` | GET | Get inference status |

#### MLflow Integration
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/mlflow/install` | POST | Install MLflow |
| `/api/mlflow/status` | GET | MLflow status |
| `/api/mlflow/versions` | GET | Available MLflow versions |
| `/api/mlflow/upgrade` | POST | Upgrade MLflow |
| `/api/mlflow/proxy` | GET/POST | Proxy MLflow API requests |

### 🔐 Security

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/security` | GET | Security analysis |
| `/api/certificates` | GET | List certificates |
| `/api/certificate/details` | GET | Get certificate details |
| `/api/certificate/yaml` | GET | Get certificate YAML |
| `/api/certificate/update` | POST | Update certificate |
| `/api/certificate/describe` | GET | Certificate details |
| `/api/certificate/delete` | POST | Delete certificate |

### 📊 Visualization

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/topology` | GET | Cluster topology graph |
| `/api/resourcemap` | GET | Resource map |
| `/api/traffic/metrics` | GET | Traffic metrics (Kiali) |

### 🔌 Integrations

#### Kiali
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/integrations/kiali/install` | POST | Install Kiali |
| `/api/integrations/kiali/status` | GET | Kiali status |
| `/api/integrations/kiali/versions` | GET | Available versions |
| `/api/kiali/proxy` | GET/POST | Proxy Kiali UI requests |

#### Feast
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/feast/install` | POST | Install Feast |
| `/api/feast/status` | GET | Feast status |

#### GPU
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/gpu/install` | POST | Install GPU operator |
| `/api/gpu/status` | GET | GPU status |
| `/api/gpu/nodes` | GET | GPU-enabled nodes |
| `/api/gpu/metrics` | GET | GPU metrics |

### 🔧 Plugins (GitOps)

#### Helm
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/plugins/helm/releases` | GET | List Helm releases |
| `/api/plugins/helm/release` | GET | Get release details |
| `/api/plugins/helm/history` | GET | Release history |
| `/api/plugins/helm/rollback` | POST | Rollback release |

#### ArgoCD
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/plugins/argocd/apps` | GET | List ArgoCD applications |
| `/api/plugins/argocd/app` | GET | Get app details |
| `/api/plugins/argocd/sync` | POST | Sync application |
| `/api/plugins/argocd/refresh` | POST | Refresh application |

#### Flux
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/plugins/flux/resources` | GET | List Flux resources |

#### Kustomize
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/plugins/kustomize/resources` | GET | List Kustomize resources |

### 📦 HPA & PDB

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/hpas` | GET | List HPAs |
| `/api/hpa/yaml` | GET | Get HPA YAML |
| `/api/hpa/update` | POST | Update HPA |
| `/api/hpa/describe` | GET | HPA details |
| `/api/hpa/delete` | POST | Delete HPA |
| `/api/pdbs` | GET | List PDBs |
| `/api/pdb/yaml` | GET | Get PDB YAML |
| `/api/pdb/update` | POST | Update PDB |
| `/api/pdb/describe` | GET | PDB details |
| `/api/pdb/delete` | POST | Delete PDB |

### 🔄 Updates

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/updates/check` | GET | Check for updates |
| `/api/updates/install` | POST | Install update |
| `/api/update/check` | GET | Check for updates (alternative) |
| `/api/update/auto-check` | GET | Auto-check updates setting |

### 👥 Authentication & IAM

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/login` | POST | User login |
| `/api/auth/logout` | POST | User logout |
| `/api/auth/register` | POST | User registration |
| `/api/auth/me` | GET | Get current user |
| `/api/auth/validate-token` | POST | Validate session token |

### 💾 Database Backup

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/database/backup/config` | GET/POST | Backup configuration |
| `/api/database/backup/status` | GET | Backup status |
| `/api/database/backup/list` | GET | List backups |
| `/api/database/backup/now` | POST | Create backup now |
| `/api/database/backup/restore` | POST | Restore from backup |

### 📡 MCP (Model Context Protocol)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/mcp` | POST | MCP server requests |

### 🔍 Impact Analysis

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/impact` | POST | Impact analysis |

### 📊 Continuity

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/continuity/summary` | GET | Continuity summary |

---

## WebSocket Endpoints

### Real-time Data Streaming

| Endpoint | Protocol | Description | Message Format |
|----------|----------|-------------|----------------|
| `/ws` | WebSocket | General WebSocket for shell/exec | JSON messages |
| `/ws/metrics` | WebSocket | Realtime CPU/Memory metrics | `{"type":"point|snapshot","point":{...}}` |
| `/api/pod/terminal` | WebSocket | Interactive pod terminal | Raw terminal I/O |
| `/api/local/terminal` | WebSocket | Local system terminal | Raw terminal I/O |
| `/api/execution/stream` | WebSocket | Execution output streaming | JSON with output lines |
| `/api/ml/jobs/logs/ws` | WebSocket | ML job logs streaming | JSON with log lines |

**WebSocket Message Types:**
- `snapshot` - Initial data snapshot
- `point` - Incremental update
- `status` - Status update
- `error` - Error message

---

## Frontend Features

### 🎨 UI Components & Themes

#### Themes
- **Dark** - Default dark theme
- **Light** - Light theme
- **Midnight** - Deep dark blue
- **Cyberpunk** - Neon cyberpunk style
- **Ocean** - Blue ocean theme
- **Terminal** - Terminal-inspired theme
- **Terminal Pro** - Refined terminal theme

#### Layout Components
- **Sidebar** - Collapsible navigation sidebar
- **Header** - Top navigation bar with cluster selector
- **Command Palette** - Quick action menu (⌘K)
- **Modal System** - Reusable modal components
- **Toast Notifications** - User feedback system
- **Loading States** - Skeleton loaders and spinners

### 📊 Dashboard

#### Features
- **Cluster Overview Cards**
  - Running Pods count
  - Total Pods count
  - Healthy Nodes count
  - Total Nodes count
- **Realtime KPI Cards** (NEW)
  - Cluster CPU % with sparkline
  - Cluster Memory % with sparkline
  - Peak Node CPU % with top node name
  - Peak Node Memory % with data source indicator
- **Resource Usage Visualization**
  - Circular gauges for CPU/Memory
  - Time-series charts (D3.js)
  - View toggle (Gauges/Charts/Both)
- **AI Insights & Recommendations**
  - Failed pods detection
  - Security issues summary
  - Resource warnings
  - Positive insights
- **Recent Events Feed**
  - Latest cluster events
  - Event filtering
  - Event details modal

### 🚨 Incidents Page

#### Main Features
- **Incident List Table**
  - Filter by pattern, severity, namespace, status
  - Sort by severity, last seen
  - Pagination support
  - Real-time updates
- **Incident Detail Modal**
  - Full incident information
  - Evidence pack
  - Citations
  - Recommendations with actions
  - Similar incidents
  - Runbook selector
  - Feedback buttons
- **Intelligence Panels**
  - Learning Dashboard
  - Auto-Remediation Panel
  - Pattern Statistics
- **Quick Actions**
  - View Details
  - View Pod
  - View Logs
  - View Events
  - Check Container Logs
  - Restart Pod
  - Apply Fix

#### Incident Actions
- **Fix Preview** - Shows diff, dry-run command, rollback command
- **Fix Apply** - Executes fix with confirmation
- **Mark as Resolved** - Updates incident status
- **Confirm Root Cause** - Feedback for learning
- **Fix Worked/Didn't Work** - Outcome feedback

### 📦 Pods Page

#### Features
- **Pod List Table**
  - Status indicators (Running, Pending, Failed, etc.)
  - Resource usage (CPU, Memory)
  - Restart counts
  - Age
  - Node assignment
- **Pod Actions**
  - View Details
  - View Logs (streaming)
  - Shell Access (WebSocket terminal)
  - Describe (kubectl describe)
  - Restart
  - Delete
  - Port Forward
  - Explain Pod (Phase 1)
- **Terminal View Mode**
  - Terminal-style display
  - Color-coded status
- **Filtering & Search**
  - By namespace
  - By status
  - By node
  - Text search

### 🚀 Deployments Page

#### Features
- **Deployment List**
  - Replicas (desired/ready/available)
  - Status indicators
  - Age
  - Strategy (RollingUpdate, Recreate)
- **Deployment Actions**
  - View Details
  - View YAML
  - Edit YAML
  - Scale
  - Restart
  - Rollback
  - Delete
  - View History
- **Bulk Operations**
  - Bulk Restart
  - Bulk Delete

### 🌐 Services Page

#### Features
- **Service List**
  - Type (ClusterIP, NodePort, LoadBalancer)
  - Ports
  - Selectors
  - Endpoints count
- **Service Actions**
  - View Details
  - View YAML
  - Edit YAML
  - Port Forward
  - Delete
  - View Endpoints

### 📋 Events Page

#### Features
- **Event Stream**
  - Real-time event updates
  - Filter by namespace, type, reason
  - Event details
  - Related resources
- **Event Types**
  - Normal events
  - Warning events
  - Error events

### 🔐 Security Page

#### Features
- **Security Score** (0-100)
  - Overall security posture
  - Breakdown by category
- **Security Checks**
  - Running as Root
  - Security Context Missing
  - Privileged Containers
  - Read-only Root Filesystem
  - Capabilities
  - Network Policies
- **CVE Detection**
  - Vulnerability scanning
  - Severity levels
  - Affected resources
- **RBAC Analysis**
  - Role bindings
  - Cluster roles
  - Service accounts
  - Permission visualization

### 💰 Cost Page

#### Features
- **Cost Estimation**
  - Per namespace
  - Per resource type
  - Cloud provider breakdown
- **Cost Recommendations**
  - Resource optimization
  - Right-sizing suggestions
  - Savings opportunities

### 🧠 Brain Page

#### Features
- **Brain Summary**
  - Active anomalies
  - ML predictions
  - Timeline view
- **OOM Insights**
  - Out-of-memory analysis
  - Memory pressure detection
- **ML Timeline**
  - Training job history
  - Model deployments
  - Inference requests

### 🤖 AI Agents Page

#### Features
- **MCP Integration**
  - Natural language cluster management
  - AI-powered commands
  - Context-aware assistance

### 🛒 Apps Marketplace

#### Features
- **App Catalog**
  - 50+ pre-configured apps
  - Categories (Service Mesh, CI/CD, Monitoring, etc.)
  - Search and filter
- **Installation**
  - One-click install
  - Progress tracking
  - Installation logs
  - Sound alerts
- **Installed Apps**
  - List installed apps
  - Uninstall
  - Status monitoring

### 🔧 Settings Page

#### Feature Toggles
- **Core Features**
  - Diagnostics
  - CVE Vulnerabilities
  - Security Checks
  - ML Recommendations
  - Event Monitoring
- **Integrations**
  - MCP
  - Connectors
- **Advanced Features**
  - Anomaly Detection
  - Cost Analysis
  - Drift Detection
  - Topology
  - Resource Map
- **UI Features**
  - AI Chat
  - Web Terminal
  - Logs
  - Metrics
  - ML Timeline in Brain
- **Monitoring & Alerts**
  - Auto Refresh
  - Notifications
  - Sound Effects
- **Terminal Preferences**
  - Prefer System Terminal
  - Use Web Terminal

#### Display Settings
- **Theme Selection** - Choose from 7 themes
- **Compact Mode** - Dense UI layout
- **Sidebar Collapsed** - Collapse sidebar by default
- **Default Namespace** - Set default namespace
- **Items Per Page** - Pagination size
- **Refresh Interval** - Auto-refresh frequency

#### Advanced Settings
- **Debug Mode** - Enable debug logging
- **Performance Metrics** - Track performance

### 🔌 Plugins Page

#### GitOps Plugins
- **Helm** - Release management
- **ArgoCD** - Application management
- **Flux** - GitOps automation
- **Kustomize** - Resource customization

### 📊 Topology Page

#### Features
- **Interactive Graph**
  - D3.js force-directed graph
  - Resource relationships
  - Zoom and pan
  - Node details on click
- **Resource Map**
  - Hierarchical view
  - ASCII tree view
  - Terminal canvas view

### 🧪 ML Workflows

#### Training Jobs
- **Create Job**
  - Python script or Docker image
  - GPU support
  - Resource limits
  - Environment variables
- **Job Management**
  - List jobs
  - View logs (streaming)
  - Delete jobs
  - Job status

#### Inference Services
- **Create Service**
  - Model file upload (.pt, .onnx, .pickle, .h5)
  - API endpoint configuration
  - Resource allocation
- **Service Management**
  - List services
  - Test endpoints
  - Delete services
  - Status monitoring

#### MLflow Integration
- **Experiment Tracking**
  - View experiments
  - Compare runs
  - Model registry
- **Proxy Access**
  - Full MLflow UI access
  - API proxy

### 🔍 Developer Mode (Phase 1)

#### Explain Pod
- **Pod Explanation**
  - Lifecycle analysis
  - Restart reasons
  - Probe failures
  - Resource pressure
  - Recent changes
- **UI Integration**
  - "Explain this pod" button in Pods page
  - Explanation panel with details

### 📈 Multi-Cluster Summary (Phase 1)

#### Features
- **Cluster Aggregation**
  - Incident counts per cluster
  - Top patterns across clusters
  - Cluster health overview
- **UI Integration**
  - Multi-cluster summary page
  - Cluster selector in header

### 🧠 Knowledge Bank (Phase 1)

#### Features
- **Knowledge Storage**
  - Incident fingerprints
  - Root causes
  - Applied fixes
  - Success/failure outcomes
- **Sharing**
  - Export to file
  - Import from file
  - Team collaboration
- **UI Integration**
  - Knowledge Bank page in Settings
  - Export/Import buttons

### 🔄 Change Intelligence (Phase 1)

#### Features
- **Change Tracking**
  - Deployment changes
  - ConfigMap changes
  - Secret changes
  - Scaling events
- **Correlation**
  - Changes before incidents
  - Timeline view
- **UI Integration**
  - "What Changed?" panel in Incident Detail Modal

### 🖥️ Terminal Features

#### Native Terminal (NEW)
- **System Terminal Opening**
  - macOS: Terminal.app
  - Windows: Windows Terminal / PowerShell / CMD
  - Linux: GNOME Terminal / KDE Konsole / XFCE Terminal
- **Working Directory**
  - Opens in specified directory
  - Falls back to home directory
- **Settings**
  - Toggle: Prefer System Terminal vs Web Terminal
  - User preference persistence

#### Web Terminal
- **Docked Terminal**
  - Bottom panel terminal
  - Maximize/minimize
  - Multi-tab support
- **Local Terminal Modal**
  - Full-screen terminal
  - WebSocket connection
  - Interactive shell

### 📊 Realtime Metrics (NEW)

#### Features
- **KPI Cards**
  - Cluster CPU % with sparkline
  - Cluster Memory % with sparkline
  - Peak Node CPU % with top node name
  - Peak Node Memory % with data source
- **Status Indicators**
  - Normal (green) - < 60%
  - Moderate (amber) - 60-80%
  - Hot (red) - > 80%
- **Time-Series Chart**
  - CPU and Memory lines
  - Last 15 minutes (180 data points)
  - Interactive tooltips
  - Hover for details
- **Data Sources**
  - Metrics API (primary)
  - Summary API (fallback)
  - Status banner for connection state

---

## Performance Features

### ⚡ Fast Retrieval System

#### Indexing
- **In-Memory Indexes**
  - By Pattern (FailurePattern)
  - By Severity
  - By Status
  - By Namespace
- **Pre-computed Lists**
  - All incidents sorted by LastSeen
  - Active incidents sorted by Severity + LastSeen

#### Caching
- **Result Cache**
  - 10-second TTL
  - Cache key based on filter
  - Automatic invalidation on updates
- **Summary Cache**
  - Pre-computed statistics
  - 30-second validity
  - Includes: total, active, bySeverity, byPattern, byStatus

#### Pagination
- **Query Parameters**
  - `?page=0` - Page number (0-indexed)
  - `?pageSize=50` - Items per page (max 1000)
- **Response**
  - Returns subset of results
  - Includes total count

#### Performance Improvements
| Operation | Before | After | Improvement |
|-----------|--------|-------|-------------|
| Get all incidents | O(n log n) | O(1) | ~100x faster |
| Filter by pattern | O(n) | O(1) indexed | ~50x faster |
| Get active incidents | O(n) | O(1) pre-computed | ~100x faster |
| Summary statistics | O(n) every time | O(1) cached | ~100x faster |

---

## Security Features

### 🔒 API Security

#### Localhost-Only Endpoints
- `/api/terminal/open` - Only accessible from localhost
- Validates `RemoteAddr` and `Host` headers
- Returns 403 Forbidden for non-localhost

#### Path Validation
- Working directory must exist
- Must be local filesystem path
- Rejects URLs and protocol schemes
- Prevents directory traversal

#### Input Validation
- All YAML updates validated
- Resource names sanitized
- Namespace validation
- Query parameter validation

### 🔐 Authentication

#### Session Management
- Token-based authentication
- Session validation
- User management
- Role-based access control

### 🛡️ Security Analysis

#### Automated Scanning
- Security context checks
- Privilege escalation detection
- Network policy analysis
- RBAC permission analysis
- CVE vulnerability scanning

---

## Installation & Usage

### Quick Start

```bash
# Download and install
curl -fsSL https://kubegraf.io/install.sh | bash

# Start web UI
kubegraf web --port 3003

# Access at http://localhost:3003
```

### Development

```bash
# Build frontend
cd ui/solid
npm install
npm run build

# Copy to web/dist
cp -r dist/* ../../web/dist/

# Build Go binary
cd ../..
go build -o kubegraf .

# Run
./kubegraf web --port 3003
```

### Configuration

- **Config Location**: `~/.kubegraf/config.yaml`
- **Database**: `~/.kubegraf/kubegraf.db` (SQLite)
- **Knowledge Bank**: `~/.kubegraf/knowledge.db` (SQLite)
- **Telemetry State**: `~/.kubegraf/telemetry_state.json`

---

## API Response Formats

### Standard Resource Response

```json
{
  "items": [...],
  "total": 100
}
```

### Incident Response (v2)

```json
{
  "incidents": [...],
  "total": 50,
  "summary": {
    "total": 50,
    "active": 15,
    "bySeverity": {
      "critical": 2,
      "high": 5,
      "medium": 8
    },
    "byPattern": {
      "CRASHLOOP": 10,
      "OOM_PRESSURE": 5
    },
    "byStatus": {
      "open": 15,
      "resolved": 35
    }
  }
}
```

### Error Response

```json
{
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

### Success Response

```json
{
  "success": true,
  "message": "Operation completed"
}
```

---

## WebSocket Message Formats

### Metrics WebSocket (`/ws/metrics`)

**Snapshot Message:**
```json
{
  "type": "snapshot",
  "points": [...],
  "status": {
    "available": true,
    "source": "metrics_api",
    "error": "",
    "clientCount": 1,
    "pointCount": 180,
    "lastUpdate": 1234567890
  }
}
```

**Point Message:**
```json
{
  "type": "point",
  "point": {
    "ts": 1234567890,
    "cluster": {
      "cpuPct": 45.2,
      "memPct": 62.8
    },
    "peaks": {
      "cpuPct": 78.5,
      "memPct": 91.2
    },
    "topNodes": [
      {
        "name": "node-1",
        "cpuPct": 78.5,
        "memPct": 85.3
      }
    ],
    "source": "metrics_api",
    "error": ""
  }
}
```

---

## Keyboard Shortcuts

### Global Shortcuts
- `⌘K` / `Ctrl+K` - Open command palette
- `⌘/` / `Ctrl+/` - Show keyboard shortcuts
- `Esc` - Close modals, cancel operations

### Navigation
- Arrow keys - Navigate lists
- `Enter` - Select item
- `Tab` - Next field
- `Shift+Tab` - Previous field

---

## Feature Flags

All features can be toggled in Settings:

- `enableDiagnostics`
- `enableCVEVulnerabilities`
- `enableSecurityChecks`
- `enableMLRecommendations`
- `enableEventMonitoring`
- `enableMCP`
- `enableConnectors`
- `enableAnomalyDetection`
- `enableCostAnalysis`
- `enableDriftDetection`
- `enableTopology`
- `enableResourceMap`
- `enableAIChat`
- `enableWebTerminal`
- `enableLogs`
- `enableMetrics`
- `showMLTimelineInBrain`
- `enableAutoRefresh`
- `enableNotifications`
- `enableSoundEffects`

---

## Telemetry

### Anonymous Tracking
- **Download Tracking** - Installer execution
- **Install Tracking** - First successful startup
- **Heartbeat** - Active usage (max once per 24h)

### Controls
- **CLI Commands**
  - `kubegraf telemetry enable`
  - `kubegraf telemetry disable`
  - `kubegraf telemetry status`
- **Default**: Enabled
- **Opt-out**: User can disable anytime
- **Privacy**: No cluster data, IPs, or user identity

---

## Update System

### Automatic Updates
- **Check for Updates** - Manual check via UI
- **Auto-Check** - Background checking (configurable)
- **Update Installation** - One-click update from UI
- **Cross-Platform** - Works on Windows, Linux, macOS
- **Helper Scripts** - Platform-specific update scripts
- **Automatic Restart** - App restarts after update

### Update Endpoints
- `/api/updates/check` - Check for new version
- `/api/updates/install` - Install update
- `/api/update/auto-check` - Configure auto-check

---

## Troubleshooting

### Common Issues

#### Terminal Button Not Working
- **Check**: Backend health endpoint (`/health`)
- **Verify**: Settings → "Prefer System Terminal" toggle
- **Fallback**: Web terminal should open automatically

#### Incidents Loading Slowly
- **Solution**: Fast retrieval system is active
- **Check**: Network tab for API response times
- **Verify**: Indexes are built (automatic on first access)

#### Metrics Not Showing
- **Check**: Metrics API availability
- **Verify**: RBAC permissions for metrics
- **Fallback**: Summary API should work automatically

#### Update Fails on Windows
- **Solution**: Helper script waits for process exit
- **Verify**: Desktop shortcut still works after update
- **Check**: PowerShell execution policy

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development guidelines.

---

## License

Apache License 2.0 - See [LICENSE](LICENSE) file.

---

## Support

- **Documentation**: https://kubegraf.io/docs
- **GitHub Issues**: https://github.com/kubegraf/kubegraf/issues
- **Discord**: https://discord.gg/kubegraf

---

**Last Updated**: December 2024  
**Version**: 1.7.20+



