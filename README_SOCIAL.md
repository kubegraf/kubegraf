<div align="center">

# 🚀 KubeGraf
## **Production-Grade Kubernetes Management Platform**

[![Version](https://img.shields.io/badge/version-1.3.1-blue.svg)](https://github.com/kubegraf/kubegraf/releases)
[![License](https://img.shields.io/badge/license-Apache%202.0-green.svg)](LICENSE)
[![Stars](https://img.shields.io/github/stars/kubegraf/kubegraf?style=social)](https://github.com/kubegraf/kubegraf/stargazers)
[![Go](https://img.shields.io/badge/Go-1.24+-00ADD8?logo=go)](https://golang.org)
[![SolidJS](https://img.shields.io/badge/SolidJS-Latest-brightgreen?logo=solid)](https://solidjs.com)

**✨ The All-in-One Kubernetes Platform with AI, ML, Security, and More**

[🌐 Website](https://kubegraf.io) • [📖 Documentation](https://kubegraf.io/getting-started.html) • [💬 Discord](https://discord.gg/kubegraf) • [🐛 Issues](https://github.com/kubegraf/kubegraf/issues)

---

</div>

## 🎯 **What is KubeGraf?**

KubeGraf is a **comprehensive Kubernetes management platform** that combines:
- 🤖 **AI-Powered Insights** - Intelligent anomaly detection and recommendations
- 🧠 **ML Workload Management** - Complete ML lifecycle from training to inference
- 🛡️ **Security Analysis** - Automated security scanning and compliance
- 💰 **Cost Optimization** - Multi-cloud cost tracking and savings
- 🎨 **3 Powerful Interfaces** - Terminal, Web, and Modern SPA
- 🛒 **Apps Marketplace** - 50+ one-click deployments
- 🔌 **MCP Integration** - AI agents for natural language cluster management

---

## 🌟 **Key Features**

### 🖥️ **Three Powerful Interfaces**

| **Terminal UI** | **Web Dashboard** | **Solid.js UI** |
|----------------|-------------------|-----------------|
| ⚡ Lightning-fast TUI | 🌐 Browser-based | 🎨 Modern SPA |
| ⌨️ Vim-style keybindings | 📊 Real-time metrics | 🎭 5 beautiful themes |
| 🔌 Works over SSH | 🗺️ Interactive D3.js graphs | ⚛️ Reactive components |
| 📦 Zero dependencies | 🔄 WebSocket live updates | 🎯 Full CRUD operations |

### 🤖 **AI-Powered Features**

#### **Brain ML System**
- 🔴 **Real-time Anomaly Detection** - Detects CPU spikes, memory leaks, crash loops
- 💡 **Smart Recommendations** - ML-powered optimization suggestions
- ⚡ **Auto-Remediation** - Automatically fixes common issues (with approval)
- 📈 **Predictive Scaling** - ML-based workload forecasting
- 🎯 **Resource Optimization** - AI-suggested resource adjustments

#### **MCP (Model Context Protocol) Integration**
- 🤖 **Natural Language Operations** - "Scale web-app to 5 replicas"
- 🧠 **Claude Desktop Support** - Full MCP integration
- 💻 **Cursor IDE Integration** - Code-level cluster management
- 🔒 **Local AI Agent (Ollama)** - Privacy-first, runs on your machine
- 🛠️ **16 Production-Ready Tools** - kubectl operations, analysis, remediation

### 🧠 **ML Workload Management**

#### **Complete ML Lifecycle**
```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  MLflow     │ --> │  Training   │ --> │  Model      │ --> │  Inference  │
│  Tracking   │     │  Jobs       │     │  Registry   │     │  Services   │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
```

#### **ML Training Jobs**
- 📝 **Python Script Upload** - Upload `.py` files directly
- 🐳 **Docker Image Support** - Use pre-built images
- 🎮 **GPU Support** - NVIDIA GPU acceleration
- 📊 **Real-time Logs** - Stream training progress
- 💾 **Volume Mounts** - PVC for data/models

#### **ML Inference Services**
- 🚀 **Model Deployment** - Deploy `.pt`, `.onnx`, `.pickle`, `.h5` models
- 🔧 **Multiple Runtimes** - FastAPI, MLServer, BentoML, KServe
- 📈 **Auto-Scaling** - HPA for inference workloads
- 🌐 **Ingress Support** - External API access
- 🧪 **Test Interface** - Built-in API testing

#### **MLflow Integration**
- 📊 **Experiment Tracking** - Track ML experiments
- 📦 **Model Registry** - Version and manage models
- 💾 **Artifact Storage** - S3, MinIO, GCS, PVC
- 🔍 **UI Access** - Built-in MLflow UI

### 🛡️ **Security Features**

#### **Automated Security Analysis**
- 🔍 **Security Score** - 0-100 cluster security rating
- ⚠️ **Severity Levels** - Critical, High, Medium, Low
- 📋 **Comprehensive Checks**:
  - SecurityContext analysis (non-root, privileged containers)
  - NetworkPolicy detection
  - Ingress TLS configuration
  - Service exposure risks
  - RBAC misconfigurations

#### **Remediation**
- ✅ **Actionable Recommendations** - Specific fix instructions
- 📝 **Code Examples** - YAML snippets for fixes
- 📚 **Best Practices** - Security guidelines

### 💰 **Cost Management**

#### **Multi-Cloud Cost Tracking**
- ☁️ **Cloud Detection** - Auto-detect GCP, AWS, Azure, IBM, Oracle, DigitalOcean, Alibaba, Linode, Vultr, OVH, Hetzner
- 💵 **Resource Cost Calculation** - CPU and memory cost estimation
- 📊 **Namespace Breakdown** - Per-namespace cost allocation
- 📈 **Historical Trends** - Cost over time analysis
- 💡 **Optimization Recommendations** - Cost-saving opportunities

### 🛒 **Apps Marketplace**

#### **50+ Production-Ready Applications**
- **Service Mesh**: Istio, Linkerd, Consul
- **CI/CD**: ArgoCD, Flux, Tekton
- **API Gateway**: Kong, Traefik, Ambassador
- **Security**: Vault, Keycloak, cert-manager
- **Databases**: MySQL, PostgreSQL, MongoDB, Redis
- **Messaging**: RabbitMQ, Kafka, NATS
- **ML/AI**: MLFlow, Kubeflow, JupyterHub
- **Observability**: Prometheus, Grafana, Jaeger, Kiali

#### **Marketplace Features**
- ⚡ **One-Click Installation** - Deploy with best practices
- 📊 **Real-time Progress** - Live installation tracking
- 🔊 **Sound Alerts** - Success/error notifications
- 🔄 **Version Management** - Upgrade and rollback
- ⚙️ **Custom Values** - Override Helm values

### 📊 **Resource Management**

#### **20+ Kubernetes Resources**
- **Workloads**: Pods, Deployments, StatefulSets, DaemonSets, CronJobs, Jobs
- **Networking**: Services, Ingresses, Port Forwarding
- **Configuration**: ConfigMaps, Secrets, Certificates
- **Cluster**: Nodes, Namespaces, Events

#### **Operations**
- 🖥️ **Shell Access** - Interactive terminal via WebSocket
- 📜 **Logs Streaming** - Real-time log viewing
- 🔄 **Restart/Delete** - Safe operations with confirmations
- 📝 **YAML Viewer** - Syntax-highlighted configurations
- 🔍 **Describe** - Full kubectl describe output
- 📈 **Scaling** - Scale deployments/statefulsets
- ⏪ **Rollback** - Rollback to previous revisions

### 🗺️ **Visualization**

#### **Multiple Topology Views**
- **D3.js Force-Directed Graphs** - Interactive node-link diagrams
- **Terminal Canvas** - Graph visualization in terminal
- **ASCII Tree View** - Text-based hierarchy
- **Graphviz Export** - Structured graph layouts
- **Resource Relationships** - Visualize dependencies

### 🔄 **GitOps & Drift Detection**

- 🔍 **Configuration Drift** - Detect changes from Git
- 🔄 **GitOps Sync Status** - ArgoCD/Flux integration
- 📊 **Field-level Differences** - Detailed drift analysis
- 🔧 **Remediation Suggestions** - How to fix drift

### 🔌 **Plugin System**

- **Helm** - Chart management and releases
- **ArgoCD** - GitOps deployment tracking
- **Flux** - FluxCD integration
- **Custom Plugins** - Extensible architecture

### 🌐 **Multi-Cluster Support**

- 🔄 **Context Switching** - Switch between clusters
- 👁️ **Multi-cluster View** - View resources across clusters
- 📡 **Connection Status** - Real-time connectivity
- 🔍 **Auto-detection** - Find available contexts

### 📈 **Monitoring & Metrics**

- 📊 **Real-time Metrics** - CPU, memory, pod counts
- 🔄 **WebSocket Updates** - Live metric streaming
- 📈 **Historical Data** - Track metrics over time
- 🎯 **Resource Heatmaps** - Visual usage patterns
- 📉 **Node Metrics** - Per-node utilization

### 🎨 **UI/UX Features**

#### **Solid.js UI**
- 🎭 **5 Themes** - Dark, Light, Midnight, Cyberpunk, Ocean
- 📱 **Responsive Design** - Works on all screen sizes
- ⌨️ **Keyboard Shortcuts** - Power user navigation
- 🔔 **Notifications** - Toast notifications
- 🎯 **Advanced Filtering** - Fuzzy search and filters

---

## 🚀 **Quick Start**

### **Installation**

```bash
# One-line install (macOS, Linux, Windows)
curl -sSL https://kubegraf.io/install.sh | bash
```

### **Start KubeGraf**

```bash
kubegraf web
```

**Output:**
```
🚀 Starting KubeGraf Daemon...
🌐 Web UI running at: http://localhost:3001
🔄 Auto-updates enabled
✨ Opening browser...
```

### **Access the UI**

- **Web Dashboard**: http://localhost:3001
- **Terminal UI**: `kubegraf` (default namespace) or `kubegraf <namespace>`

---

## 📊 **Feature Comparison**

| Feature | KubeGraf | kubectl | Lens | Rancher |
|---------|----------|---------|------|---------|
| **Terminal UI** | ✅ | ✅ | ❌ | ❌ |
| **Web Dashboard** | ✅ | ❌ | ✅ | ✅ |
| **AI/ML Features** | ✅ | ❌ | ❌ | ❌ |
| **ML Workloads** | ✅ | ❌ | ❌ | ❌ |
| **Security Analysis** | ✅ | ❌ | ❌ | ⚠️ |
| **Cost Management** | ✅ | ❌ | ❌ | ❌ |
| **Apps Marketplace** | ✅ | ❌ | ❌ | ⚠️ |
| **MCP Integration** | ✅ | ❌ | ❌ | ❌ |
| **Multi-cluster** | ✅ | ⚠️ | ✅ | ✅ |
| **Open Source** | ✅ | ✅ | ⚠️ | ⚠️ |

---

## 🎯 **Use Cases**

### **For DevOps Engineers**
- 🚀 **One-Click Deployments** - Deploy 50+ apps from marketplace
- 🔍 **Real-time Monitoring** - Live cluster metrics and events
- 🛡️ **Security Scanning** - Automated security posture assessment
- 💰 **Cost Optimization** - Track and reduce cloud costs

### **For ML Engineers**
- 🧠 **ML Training Jobs** - Run training workloads on Kubernetes
- 🚀 **Model Deployment** - Deploy models as inference services
- 📊 **MLflow Integration** - Track experiments and manage models
- 🎮 **GPU Support** - Accelerate training and inference

### **For SRE Teams**
- 🤖 **AI-Powered Insights** - Anomaly detection and recommendations
- ⚡ **Auto-Remediation** - Automatically fix common issues
- 📈 **Predictive Scaling** - ML-based capacity planning
- 🔄 **Drift Detection** - Monitor configuration changes

### **For Security Teams**
- 🔍 **Security Analysis** - Automated security scanning
- 📊 **Compliance Checks** - Security best practices validation
- 🛡️ **RBAC Analysis** - Permission and access control review
- 📝 **Remediation Guides** - Step-by-step fix instructions

---

## 🏗️ **Architecture**

```
┌─────────────────────────────────────────────────────────────┐
│                    KubeGraf Platform                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │ Terminal UI  │  │ Web Dashboard│  │ Solid.js UI  │    │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘    │
│         │                 │                  │             │
│         └─────────────────┼──────────────────┘             │
│                           │                                │
│                  ┌────────▼────────┐                       │
│                  │  Go Backend API │                       │
│                  └────────┬────────┘                       │
│                           │                                │
│         ┌─────────────────┼─────────────────┐              │
│         │                 │                 │              │
│  ┌──────▼──────┐  ┌───────▼──────┐  ┌──────▼──────┐     │
│  │   AI/ML     │  │   Security    │  │   Cost      │     │
│  │   Engine    │  │   Scanner    │  │   Tracker   │     │
│  └──────┬──────┘  └───────┬──────┘  └──────┬──────┘     │
│         │                 │                 │              │
│         └─────────────────┼─────────────────┘              │
│                           │                                │
│                  ┌────────▼────────┐                       │
│                  │  Kubernetes API │                       │
│                  └─────────────────┘                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 📈 **Performance**

- ⚡ **15x Faster** - Redis caching with LRU fallback
- 🔄 **Real-time Updates** - WebSocket streaming
- 📊 **Efficient Queries** - Optimized Kubernetes API calls
- 💾 **Smart Caching** - 30-60s TTL for frequently accessed resources

---

## 🔒 **Security**

- 🔐 **Encrypted Storage** - AES-256-GCM encryption for credentials
- 👥 **RBAC System** - Admin/Developer/Viewer roles
- 🍪 **Secure Sessions** - HttpOnly cookies
- 🔍 **Audit Logging** - All actions logged
- 🛡️ **Namespace Isolation** - Multi-tenant support

---

## 🌍 **Multi-Cloud Support**

KubeGraf works with:
- ☁️ **GCP** (GKE)
- ☁️ **AWS** (EKS)
- ☁️ **Azure** (AKS)
- ☁️ **IBM Cloud**
- ☁️ **Oracle Cloud**
- ☁️ **DigitalOcean**
- ☁️ **Alibaba Cloud**
- ☁️ **Linode**
- ☁️ **Vultr**
- ☁️ **OVH**
- ☁️ **Hetzner**
- 🏠 **Local Clusters** (K3s, Minikube, Kind)

---

## 📱 **Platforms**

- 💻 **Desktop Apps** - macOS, Linux, Windows (Electron)
- 📱 **Mobile Apps** - iOS, Android (Capacitor)
- 🌐 **Web** - Any modern browser
- ⌨️ **Terminal** - SSH-friendly TUI

---

## 🤝 **Contributing**

We welcome contributions! See [CONTRIBUTING.md](docs/guides/CONTRIBUTING.md) for guidelines.

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing`)
5. Open Pull Request

---

## 📚 **Documentation**

- 📖 [Getting Started](https://kubegraf.io/getting-started.html)
- 🤖 [AI Agent Integration](docs/AI_AGENT_INTEGRATION.md)
- 🧠 [ML Features Overview](docs/ML_FEATURES_OVERVIEW.md)
- 🛡️ [Security Features](docs/guides/FEATURES.md#security-features)
- 💰 [Cost Management](docs/guides/FEATURES.md#cost-management)
- 🛒 [Marketplace Guide](docs/MARKETPLACE.md)
- 🔌 [MCP Integration](docs/MCP_INTEGRATION_GUIDE.md)

---

## 📝 **License**

Apache License 2.0 - see [LICENSE](LICENSE) file

---

## 🙏 **Acknowledgments**

Built with:
- [Go](https://golang.org) - Backend
- [Solid.js](https://solidjs.com) - Modern UI
- [Kubernetes client-go](https://github.com/kubernetes/client-go) - K8s API
- [tview](https://github.com/rivo/tview) - Terminal UI
- [D3.js](https://d3js.org) - Visualization

---

<div align="center">

### ⭐ **Star us on GitHub** if you find KubeGraf useful!

[![GitHub Stars](https://img.shields.io/github/stars/kubegraf/kubegraf?style=for-the-badge&logo=github)](https://github.com/kubegraf/kubegraf/stargazers)

**Made with ❤️ by the KubeGraf Team**

[🌐 Website](https://kubegraf.io) • [📖 Docs](https://kubegraf.io/getting-started.html) • [💬 Discord](https://discord.gg/kubegraf) • [🐛 Issues](https://github.com/kubegraf/kubegraf/issues)

</div>

