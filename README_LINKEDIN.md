# 🚀 KubeGraf: The All-in-One Kubernetes Platform

<div align="center">

![KubeGraf Logo](docs/logo.svg)

**Production-Grade Kubernetes Management with AI, ML, Security & More**

[![Version](https://img.shields.io/badge/version-1.3.1-blue.svg)](https://github.com/kubegraf/kubegraf/releases)
[![License](https://img.shields.io/badge/license-Apache%202.0-green.svg)](LICENSE)
[![Stars](https://img.shields.io/github/stars/kubegraf/kubegraf?style=social)](https://github.com/kubegraf/kubegraf/stargazers)

**[🌐 Website](https://kubegraf.io)** • **[📖 Documentation](https://kubegraf.io/getting-started.html)** • **[💬 Discord](https://discord.gg/kubegraf)**

---

</div>

## 🎯 **Why KubeGraf?**

**KubeGraf is the ONLY Kubernetes platform that combines:**

✅ **AI-Powered Insights** - Intelligent anomaly detection & auto-remediation  
✅ **Complete ML Lifecycle** - Training → Model Registry → Inference  
✅ **Security Analysis** - Automated scanning with 0-100 security score  
✅ **Cost Optimization** - Multi-cloud cost tracking & savings  
✅ **3 Interfaces** - Terminal, Web, Modern SPA  
✅ **50+ Apps Marketplace** - One-click deployments  
✅ **MCP Integration** - Natural language cluster management  

---

## 🌟 **Core Features**

### 🤖 **AI-Powered Brain System**

```
🔴 Real-time Anomaly Detection
   ├─ CPU/Memory Spikes
   ├─ Crash Loops
   ├─ Pod Failures
   └─ HPA Maxed Out

💡 Smart Recommendations
   ├─ Resource Optimization
   ├─ Predictive Scaling
   ├─ Cost Savings
   └─ Performance Tuning

⚡ Auto-Remediation
   ├─ Restart Crash Loops
   ├─ Scale Up on Spikes
   ├─ Fix Pod Issues
   └─ Optimize Resources
```

### 🧠 **ML Workload Management**

**Complete ML Lifecycle:**

1. **📊 MLflow** - Experiment tracking & model registry
2. **🎓 Training Jobs** - Run Python scripts or Docker images with GPU support
3. **🚀 Inference Services** - Deploy models (.pt, .onnx, .pickle, .h5) as APIs
4. **📈 Auto-Scaling** - HPA for inference workloads

**Features:**
- GPU acceleration for training
- Real-time log streaming
- Multiple runtime options (FastAPI, MLServer, BentoML, KServe)
- Model testing interface
- Ingress support for external access

### 🛡️ **Security Analysis**

**Automated Security Scanning:**
- 🔍 **Security Score**: 0-100 rating
- ⚠️ **Severity Levels**: Critical, High, Medium, Low
- 📋 **Checks**:
  - SecurityContext (non-root, privileged containers)
  - NetworkPolicy detection
  - Ingress TLS configuration
  - Service exposure risks
  - RBAC misconfigurations
- ✅ **Remediation**: Step-by-step fix instructions

### 💰 **Cost Management**

**Multi-Cloud Cost Tracking:**
- ☁️ **11+ Cloud Providers**: GCP, AWS, Azure, IBM, Oracle, DigitalOcean, Alibaba, Linode, Vultr, OVH, Hetzner
- 💵 **Resource Cost Calculation**: CPU & memory estimation
- 📊 **Namespace Breakdown**: Per-namespace allocation
- 📈 **Historical Trends**: Cost over time
- 💡 **Optimization**: Cost-saving recommendations

### 🛒 **Apps Marketplace**

**50+ Production-Ready Applications:**

| Category | Applications |
|----------|-------------|
| **Service Mesh** | Istio, Linkerd, Consul |
| **CI/CD** | ArgoCD, Flux, Tekton |
| **API Gateway** | Kong, Traefik, Ambassador |
| **Security** | Vault, Keycloak, cert-manager |
| **Databases** | MySQL, PostgreSQL, MongoDB, Redis |
| **Messaging** | RabbitMQ, Kafka, NATS |
| **ML/AI** | MLFlow, Kubeflow, JupyterHub |
| **Observability** | Prometheus, Grafana, Jaeger, Kiali |

**Features:**
- ⚡ One-click installation
- 📊 Real-time progress tracking
- 🔊 Sound alerts
- 🔄 Version management (upgrade/rollback)
- ⚙️ Custom Helm values

### 🔌 **MCP (Model Context Protocol) Integration**

**Natural Language Kubernetes Operations:**

- 🤖 **Claude Desktop** - Full MCP integration
- 💻 **Cursor IDE** - Code-level cluster management
- 🔒 **Local AI (Ollama)** - Privacy-first, runs on your machine
- 🛠️ **16 Production Tools**:
  - kubectl operations (get, describe, apply, delete, scale)
  - Cluster analysis (health, metrics, anomalies)
  - Cost estimation & security scanning
  - Auto-remediation & smart scaling

**Example Queries:**
- "Scale web-app deployment to 5 replicas"
- "Show me all pods with high CPU usage"
- "Fix the crash loop in production namespace"
- "What's the monthly cost of production?"

### 🖥️ **Three Powerful Interfaces**

| **Terminal UI** | **Web Dashboard** | **Solid.js UI** |
|----------------|-------------------|-----------------|
| ⚡ Lightning-fast | 🌐 Browser-based | 🎨 Modern SPA |
| ⌨️ Vim keybindings | 📊 Real-time metrics | 🎭 5 themes |
| 🔌 SSH-friendly | 🗺️ D3.js graphs | ⚛️ Reactive |
| 📦 Zero deps | 🔄 WebSocket updates | 🎯 Full CRUD |

### 📊 **Resource Management**

**20+ Kubernetes Resources:**
- **Workloads**: Pods, Deployments, StatefulSets, DaemonSets, CronJobs, Jobs
- **Networking**: Services, Ingresses, Port Forwarding
- **Configuration**: ConfigMaps, Secrets, Certificates
- **Cluster**: Nodes, Namespaces, Events

**Operations:**
- 🖥️ Shell access (WebSocket terminal)
- 📜 Real-time log streaming
- 🔄 Restart/Delete with confirmations
- 📝 Syntax-highlighted YAML viewer
- 📈 Scale deployments/statefulsets
- ⏪ Rollback to previous revisions

### 🗺️ **Visualization**

**Multiple Topology Views:**
- **D3.js Force-Directed Graphs** - Interactive node-link diagrams
- **Terminal Canvas** - Graph visualization in terminal
- **ASCII Tree View** - Text-based hierarchy
- **Graphviz Export** - Structured layouts
- **Resource Relationships** - Visualize dependencies

### 🔄 **GitOps & Drift Detection**

- 🔍 Configuration drift detection
- 🔄 ArgoCD/Flux sync status
- 📊 Field-level differences
- 🔧 Remediation suggestions

---

## 🚀 **Quick Start**

### **Installation**

```bash
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

---

## 📊 **Feature Highlights**

### **For DevOps Engineers**
- 🚀 One-click deployments (50+ apps)
- 🔍 Real-time monitoring
- 🛡️ Security scanning
- 💰 Cost optimization

### **For ML Engineers**
- 🧠 ML training jobs with GPU
- 🚀 Model deployment as APIs
- 📊 MLflow integration
- 🎮 GPU acceleration

### **For SRE Teams**
- 🤖 AI-powered insights
- ⚡ Auto-remediation
- 📈 Predictive scaling
- 🔄 Drift detection

### **For Security Teams**
- 🔍 Automated security scanning
- 📊 Compliance checks
- 🛡️ RBAC analysis
- 📝 Remediation guides

---

## 🏆 **Why Choose KubeGraf?**

| Feature | KubeGraf | kubectl | Lens | Rancher |
|---------|----------|---------|------|---------|
| **Terminal UI** | ✅ | ✅ | ❌ | ❌ |
| **AI/ML Features** | ✅ | ❌ | ❌ | ❌ |
| **ML Workloads** | ✅ | ❌ | ❌ | ❌ |
| **Security Analysis** | ✅ | ❌ | ❌ | ⚠️ |
| **Cost Management** | ✅ | ❌ | ❌ | ❌ |
| **Apps Marketplace** | ✅ | ❌ | ❌ | ⚠️ |
| **MCP Integration** | ✅ | ❌ | ❌ | ❌ |
| **Open Source** | ✅ | ✅ | ⚠️ | ⚠️ |

---

## 🌍 **Multi-Cloud Support**

Works with **11+ cloud providers**:
☁️ GCP • ☁️ AWS • ☁️ Azure • ☁️ IBM • ☁️ Oracle • ☁️ DigitalOcean • ☁️ Alibaba • ☁️ Linode • ☁️ Vultr • ☁️ OVH • ☁️ Hetzner • 🏠 Local (K3s, Minikube)

---

## 📱 **Platforms**

- 💻 **Desktop**: macOS, Linux, Windows (Electron)
- 📱 **Mobile**: iOS, Android (Capacitor)
- 🌐 **Web**: Any modern browser
- ⌨️ **Terminal**: SSH-friendly TUI

---

## 📈 **Performance**

- ⚡ **15x Faster** - Redis caching with LRU fallback
- 🔄 **Real-time** - WebSocket streaming
- 📊 **Efficient** - Optimized API calls
- 💾 **Smart Caching** - 30-60s TTL

---

## 🔒 **Security**

- 🔐 **Encrypted Storage** - AES-256-GCM
- 👥 **RBAC System** - Admin/Developer/Viewer roles
- 🍪 **Secure Sessions** - HttpOnly cookies
- 🔍 **Audit Logging** - All actions logged

---

## 🤝 **Contributing**

We welcome contributions! See [CONTRIBUTING.md](docs/guides/CONTRIBUTING.md)

---

## 📚 **Documentation**

- 📖 [Getting Started](https://kubegraf.io/getting-started.html)
- 🤖 [AI Agent Integration](docs/AI_AGENT_INTEGRATION.md)
- 🧠 [ML Features](docs/ML_FEATURES_OVERVIEW.md)
- 🛡️ [Security](docs/guides/FEATURES.md#security-features)
- 💰 [Cost Management](docs/guides/FEATURES.md#cost-management)
- 🛒 [Marketplace](docs/MARKETPLACE.md)

---

## 📝 **License**

Apache License 2.0

---

<div align="center">

### ⭐ **Star us on GitHub!**

[![GitHub Stars](https://img.shields.io/github/stars/kubegraf/kubegraf?style=for-the-badge&logo=github)](https://github.com/kubegraf/kubegraf/stargazers)

**Made with ❤️ by the KubeGraf Team**

[🌐 Website](https://kubegraf.io) • [📖 Docs](https://kubegraf.io/getting-started.html) • [💬 Discord](https://discord.gg/kubegraf)

</div>

