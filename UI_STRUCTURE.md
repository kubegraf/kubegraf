# KubeGraf UI Structure Documentation

## Overview
This document provides a comprehensive overview of the KubeGraf UI structure, including all sidebar sections, resource tabs, and their features.

## Table of Contents
1. [Sidebar Structure](#sidebar-structure)
2. [Resource Tabs](#resource-tabs)
3. [Feature Sections](#feature-sections)
4. [Tree Structure](#tree-structure)
5. [Visual Diagram](#visual-diagram)

---

## Sidebar Structure

### Overview Section
- **Dashboard**: Main overview dashboard with cluster metrics, health status, and quick insights

### Insights Section
- **AI Insights**: Anomaly detection and AI-powered insights
- **Cost Analysis**: Resource cost estimation and optimization recommendations
- **Security Insights**: Security analysis and vulnerability scanning
- **Drift Detection**: Configuration drift detection and remediation

### CD (Continuous Deployment) Section
- **Deploy**: Application deployment interface (marketplace/apps)
- **Rollouts**: Canary and blue-green deployment management

### Workloads Section
- **Pods**: Container pod management and monitoring
- **Deployments**: Kubernetes deployment management
- **StatefulSets**: Stateful application management
- **DaemonSets**: Daemon set management
- **Jobs**: Job execution and monitoring
- **CronJobs**: Scheduled job management

### Networking Section
- **Services**: Service discovery and load balancing
- **Ingresses**: Ingress resource management
- **Network Policies**: Network policy configuration

### Configuration Section
- **ConfigMaps**: Configuration map management
- **Secrets**: Secret management

### Security Section
- **Certificates**: Certificate management (cert-manager integration)
- **RBAC**: Role-based access control management

### Storage Section
- **Storage**: Persistent volumes, volume claims, and storage classes

### Infrastructure Section
- **Nodes**: Cluster node management
- **Resource Map**: Visual resource topology

### Integrations Section
- **Connectors**: External system connectors
- **AI Agents**: AI agent management
- **SRE Agent**: Site reliability engineering automation

---

## Resource Tabs

### Pods Tab
**Location**: Workloads → Pods

**Features**:
- Pod listing with status, metrics, and details
- Real-time CPU and memory metrics
- Container shell access (with multi-container support)
- Port forwarding
- Log viewing and streaming
- YAML view/edit
- Pod describe
- Delete operations
- Search and filtering
- Sorting by name, namespace, status, CPU, memory, restarts, age
- Pagination with configurable page size
- Terminal-style UI with customizable font size and family

**Styling**:
- Background: Black (#000000)
- Text color: Sky blue (#0ea5e9)
- Font weight: 900
- Cell padding: 0 8px
- Row height: Dynamic based on font size

### Deployments Tab
**Location**: Workloads → Deployments

**Features**:
- Deployment listing with ready/available status
- Scale operations
- Restart deployments
- YAML view/edit
- Delete operations
- Search and filtering
- Sorting by name, namespace, ready, age
- Pagination with configurable page size
- Status summary (Total, Ready, Partial, Unavailable)

**Styling**: Same as Pods tab

### StatefulSets Tab
**Location**: Workloads → StatefulSets

**Features**:
- StatefulSet listing
- Scale operations
- Restart statefulsets
- YAML view/edit
- Delete operations
- Search and filtering
- Sorting capabilities

### DaemonSets Tab
**Location**: Workloads → DaemonSets

**Features**:
- DaemonSet listing
- YAML view/edit
- Delete operations
- Search and filtering

### Jobs Tab
**Location**: Workloads → Jobs

**Features**:
- Job listing with status
- YAML view/edit
- Delete operations
- Search and filtering

### CronJobs Tab
**Location**: Workloads → CronJobs

**Features**:
- CronJob listing with schedule information
- Suspend/resume operations
- YAML view/edit
- Delete operations
- Search and filtering

### Services Tab
**Location**: Networking → Services

**Features**:
- Service listing with type, cluster IP, external IP, ports
- Port forwarding (with random port assignment and stop option)
- YAML view/edit
- Delete operations
- Search and filtering
- Type filtering (ClusterIP, NodePort, LoadBalancer, ExternalName)
- Active port forwards display with stop functionality

**Port Forwarding**:
- Random local port assignment (8000-9000)
- Stop port forwarding option
- Direct link to forwarded service

### Ingresses Tab
**Location**: Networking → Ingresses

**Features**:
- Ingress listing with hosts and addresses
- YAML view/edit
- Delete operations
- Search and filtering

### Network Policies Tab
**Location**: Networking → Network Policies

**Features**:
- Network policy listing
- YAML view/edit
- Delete operations
- Search and filtering

### ConfigMaps Tab
**Location**: Configuration → ConfigMaps

**Features**:
- ConfigMap listing
- YAML view/edit
- Delete operations
- Search and filtering

### Secrets Tab
**Location**: Configuration → Secrets

**Features**:
- Secret listing
- YAML view/edit
- Delete operations
- Search and filtering

### Certificates Tab
**Location**: Security → Certificates

**Features**:
- Certificate listing (cert-manager CRDs)
- Certificate details (issuer, DNS names, validity)
- YAML view/edit
- Delete operations
- Search and filtering
- Requires cert-manager to be installed

### Storage Tab
**Location**: Storage → Storage

**Features**:
- Three sub-tabs:
  - **PersistentVolumes (PVs)**: Cluster-wide storage volumes
  - **PersistentVolumeClaims (PVCs)**: Namespace-scoped volume claims
  - **StorageClasses**: Storage class definitions
- YAML view/edit for all storage resources
- Delete operations
- Search and filtering
- Namespace filtering for PVCs

---

## Feature Sections

### Header Bar
- **Cluster Selector**: Switch between Kubernetes contexts
- **Namespace Selector**: Select namespaces (All Namespaces or specific)
- **Search**: Global resource search (⌘K)
- **AI Panel Toggle**: Open/close AI assistant
- **Theme Toggle**: Switch between light/dark themes
- **Cluster Status**: Connection status indicator
- **Cloud Provider Logo**: Display current cloud provider

### Quick Access Bar
Located below header, provides quick navigation to:
- Dashboard
- Pods Health
- Resource Metrics
- Security Status
- Events Log

### AI Panel
- Context-aware AI assistant
- Resource analysis
- Recommendations
- Troubleshooting help

---

## Tree Structure

```
KubeGraf UI
│
├── Header
│   ├── KubeGraf Logo (with floating animation)
│   ├── Cluster Selector
│   ├── Namespace Selector
│   ├── Global Search (⌘K)
│   ├── AI Panel Toggle
│   ├── Theme Toggle
│   └── Cluster Status
│
├── Quick Access Bar
│   ├── Dashboard
│   ├── Pods Health
│   ├── Resource Metrics
│   ├── Security Status
│   └── Events Log
│
├── Sidebar
│   ├── Overview
│   │   └── Dashboard
│   │
│   ├── Insights
│   │   ├── AI Insights
│   │   ├── Cost Analysis
│   │   ├── Security Insights
│   │   └── Drift Detection
│   │
│   ├── CD (Continuous Deployment)
│   │   ├── Deploy
│   │   └── Rollouts
│   │
│   ├── Workloads
│   │   ├── Pods
│   │   │   ├── List View
│   │   │   ├── Shell Access
│   │   │   ├── Port Forward
│   │   │   ├── Logs
│   │   │   ├── YAML View/Edit
│   │   │   ├── Describe
│   │   │   └── Delete
│   │   ├── Deployments
│   │   │   ├── List View
│   │   │   ├── Scale
│   │   │   ├── Restart
│   │   │   ├── YAML View/Edit
│   │   │   └── Delete
│   │   ├── StatefulSets
│   │   ├── DaemonSets
│   │   ├── Jobs
│   │   └── CronJobs
│   │
│   ├── Networking
│   │   ├── Services
│   │   │   ├── List View
│   │   │   ├── Port Forward (with stop)
│   │   │   ├── YAML View/Edit
│   │   │   └── Delete
│   │   ├── Ingresses
│   │   └── Network Policies
│   │
│   ├── Configuration
│   │   ├── ConfigMaps
│   │   └── Secrets
│   │
│   ├── Security
│   │   ├── Certificates (cert-manager)
│   │   └── RBAC
│   │
│   ├── Storage
│   │   ├── PersistentVolumes
│   │   ├── PersistentVolumeClaims
│   │   └── StorageClasses
│   │
│   ├── Infrastructure
│   │   ├── Nodes
│   │   └── Resource Map
│   │
│   └── Integrations
│       ├── Connectors
│       ├── AI Agents
│       └── SRE Agent
│
└── Main Content Area
    └── [Selected Resource Tab Content]
```

---

## Visual Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│  Header: [Logo] [Cluster ▼] [Namespace ▼] [Search ⌘K] [AI] [☀] │
├─────────────────────────────────────────────────────────────────┤
│  Quick Access: [Dashboard] [Pods] [Metrics] [Security] [Events]│
├──────────┬──────────────────────────────────────────────────────┤
│          │                                                       │
│ Sidebar  │  Main Content Area                                   │
│          │                                                       │
│ Overview │  ┌─────────────────────────────────────────────┐    │
│  └─Dash  │  │ Resource Tab Content                        │    │
│          │  │                                             │    │
│ Insights │  │  ┌──────────────────────────────────────┐  │    │
│  └─AI    │  │  │ Table with consistent styling        │  │    │
│  └─Cost  │  │  │ - Black background (#000000)         │  │    │
│  └─Sec   │  │  │ - Sky blue text (#0ea5e9)            │  │    │
│  └─Drift │  │  │ - Font weight: 900                   │  │    │
│          │  │  │ - Cell padding: 0 8px                 │  │    │
│ CD       │  │  │ - Dynamic row height                 │  │    │
│  └─Deploy│  │  └──────────────────────────────────────┘  │    │
│  └─Roll  │  │                                             │    │
│          │  │  [Pagination Controls]                     │    │
│ Workloads│  └─────────────────────────────────────────────┘    │
│  └─Pods  │                                                       │
│  └─Depl  │                                                       │
│  └─STS   │                                                       │
│  └─DS    │                                                       │
│  └─Jobs  │                                                       │
│  └─CJ    │                                                       │
│          │                                                       │
│ Network  │                                                       │
│  └─Svc   │                                                       │
│  └─Ing   │                                                       │
│  └─NP    │                                                       │
│          │                                                       │
│ Config   │                                                       │
│  └─CM    │                                                       │
│  └─Sec   │                                                       │
│          │                                                       │
│ Security │                                                       │
│  └─Cert  │                                                       │
│  └─RBAC  │                                                       │
│          │                                                       │
│ Storage  │                                                       │
│  └─PV    │                                                       │
│  └─PVC   │                                                       │
│  └─SC    │                                                       │
│          │                                                       │
│ Infra    │                                                       │
│  └─Nodes │                                                       │
│  └─Map   │                                                       │
│          │                                                       │
│ Integ    │                                                       │
│  └─Conn  │                                                       │
│  └─AI    │                                                       │
│  └─SRE   │                                                       │
└──────────┴──────────────────────────────────────────────────────┘
```

---

## Styling Standards

All resource tabs should follow the Pods/Deployments styling pattern:

### Table Container
- Background: `#000000` (black)
- Border: `1px solid #333333`
- Border radius: `4px`

### Table Headers
- Text color: `#0ea5e9` (sky blue)
- Font weight: `900`
- Font size: Dynamic (based on fontSize signal)
- Padding: `0 8px`
- Height: `Math.max(24, fontSize * 1.7)px`

### Table Cells
- Text color: `#0ea5e9` (sky blue)
- Font weight: `900`
- Font size: Dynamic (based on fontSize signal)
- Padding: `0 8px`
- Height: `Math.max(24, fontSize * 1.7)px`
- Line height: `Math.max(24, fontSize * 1.7)px`
- Border: `none` (no borders between cells)

### Row Hover
- Background: `rgba(14, 165, 233, 0.1)` (light blue overlay)

### Pagination
- Background: `#161b22`
- Text color: `#8b949e` (muted)
- Controls background: `#21262d`
- Controls text: `#c9d1d9`
- Page size selector: Included in pagination bar

### Font Controls
- Font size options: 12px, 14px, 16px, 18px, 20px
- Font family options: Monospace, System-ui, Monaco, Consolas, Courier
- Persisted in localStorage per resource type

---

## Notes

1. **Certificates**: Requires cert-manager to be installed in the cluster. If not installed, the tab will show an empty list.

2. **Storage PVCs**: Supports namespace filtering. "All Namespaces" shows PVCs from all namespaces.

3. **Port Forwarding**: Services port forwarding uses random ports (8000-9000) and provides stop functionality.

4. **Multi-container Pods**: Pod shell access shows a container selection modal when a pod has multiple containers.

5. **Consistent Styling**: All resource tabs should match the Pods/Deployments styling for a unified experience.

---

## Last Updated
December 2025

