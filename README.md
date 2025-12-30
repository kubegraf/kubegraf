# KubeGraf

<div align="center">

<img src="docs/kubegraf_logo.png?v=3" alt="KubeGraf" width="400">

**KubēGraf**  
**Intelligent Insight for Kubernetes Incidents**

[![Release](https://img.shields.io/badge/version-1.3.0--rc2-blue.svg)](https://github.com/kubegraf/kubegraf/releases/tag/v1.3.0-rc2)
[![CI](https://github.com/kubegraf/kubegraf/actions/workflows/ci.yml/badge.svg)](https://github.com/kubegraf/kubegraf/actions/workflows/ci.yml)
[![Go Version](https://img.shields.io/badge/Go-1.24+-00ADD8?style=flat&logo=go)](https://golang.org)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)
[![GitHub Stars](https://img.shields.io/github/stars/kubegraf/kubegraf?style=flat&color=yellow)](https://github.com/kubegraf/kubegraf/stargazers)

**[Website](https://kubegraf.io)** · **[Documentation](https://kubegraf.io/docs/)** · **[Releases](https://github.com/kubegraf/kubegraf/releases)**

</div>

-----

## 🎯 What is KubeGraf?

KubeGraf is a **local-first Kubernetes management platform** that helps you detect incidents, understand root causes, and safely respond to failures—without SaaS lock-in. It provides three powerful interfaces for managing your clusters: Terminal UI, Web Dashboard, and Modern SPA.

### Why KubeGraf?

- **🔍 Incident Intelligence** - Automatically detects failure patterns and provides evidence-backed diagnoses
- **🛡️ Safe Operations** - Preview all changes before applying, with dry-run validation
- **🏠 Local-First** - Runs entirely on your machine, no data leaves your environment
- **⚡ Fast & Lightweight** - Single binary, works over SSH, zero external dependencies
- **🎨 Multiple Interfaces** - Choose the interface that fits your workflow

-----

## 🚀 Quick Start

### Prerequisites

- A working `kubectl` configuration with access to a Kubernetes cluster
- macOS, Linux, or Windows

### Installation

#### macOS (Homebrew - Recommended)

```bash
brew tap kubegraf/tap
brew install kubegraf
```

#### Linux

```bash
curl -sSL https://kubegraf.io/install.sh | bash
```

#### Windows

**Option 1: GUI Installer (Recommended)**
1. Download the latest installer from [Releases](https://github.com/kubegraf/kubegraf/releases/latest)
2. Run the `.exe` installer and follow the wizard
3. Open a new terminal and run `kubegraf web`

**Option 2: Scoop**
```powershell
scoop bucket add kubegraf https://github.com/kubegraf/scoop-bucket
scoop install kubegraf
```

**Option 3: Manual Download**
1. Download `kubegraf-windows-amd64.zip` from [Releases](https://github.com/kubegraf/kubegraf/releases/latest)
2. Extract and add to your PATH

> **Note for Windows users**: If you see a SmartScreen warning, this is normal for unsigned installers. See our [Windows SmartScreen Guide](docs/windows-smartscreen.md) for safe installation steps.

### Verify Installation

```bash
kubegraf --version
```

### Start KubeGraf

```bash
# Terminal UI (default)
kubegraf

# Web Dashboard
kubegraf web
# Then open: http://localhost:8080
```

For more installation options, see the [Installation Guide](https://kubegraf.io/docs/installation.html).

---

## 🔥 Key Features

### 🧠 Incident Intelligence System

KubeGraf's **Incident Intelligence** automatically detects and diagnoses Kubernetes failures:

- **Failure Pattern Detection** - Identifies 12+ patterns including:
  - CrashLoopBackOff
  - Out of Memory (OOM)
  - Restart Storms
  - Image Pull Failures
  - Service Endpoint Failures
  - And more...

- **Evidence-Backed Diagnosis** - Every conclusion is supported by:
  - Kubernetes events with timestamps
  - Container logs with error extraction
  - Resource status snapshots
  - Recent configuration changes

- **Safe Fix Recommendations** - Preview changes before applying:
  - Dry-run validation
  - Diff view showing exact changes
  - Risk assessment for each fix
  - Rollback suggestions

- **Knowledge Bank** - Local SQLite storage for:
  - Incident history and patterns
  - Learning from past incidents
  - Export/import for team sharing

- **Auto-Remediation** - Optional guarded automation with confidence thresholds

**Access Incident Intelligence**: Open the web dashboard and navigate to **Sidebar → AI → Intelligence → Incident Intelligence**

### 📊 Three Powerful Interfaces

| Interface | Best For | Features |
|-----------|----------|----------|
| **Terminal UI** | SSH sessions, low bandwidth | Vim-style keybindings, works over slow connections, zero dependencies |
| **Web Dashboard** | Browser-based management | Real-time metrics, interactive topology, WebSocket updates |
| **Solid.js SPA** | Modern workflows | Reactive components, 5 themes, full CRUD operations |

### 🎛️ Core Capabilities

- **Resource Management** - Full support for Pods, Deployments, StatefulSets, DaemonSets, Services, Ingresses, ConfigMaps, Secrets, and more
- **Real-time Monitoring** - Live CPU and memory metrics with WebSocket updates
- **Pod Operations** - Shell access, log streaming, restart, delete, port forwarding
- **Security Analysis** - Automated security posture assessment (0-100 score)
- **Cost Management** - Multi-cloud cost estimation (GCP, AWS, Azure, etc.)
- **Drift Detection** - Configuration drift monitoring and GitOps sync status
- **Multi-Cluster** - Switch between Kubernetes contexts with aggregated summaries
- **Visualization** - Interactive topology views (D3.js, Graphviz, Terminal Canvas)

### 🔐 Security & Compliance

- **Security Score** - Automated assessment with best practices recommendations
- **Vulnerability Detection** - Image scanning and security checks
- **RBAC Support** - Role-based access control visualization
- **Network Policy** - Visual policy editor and recommendations

### 🤖 AI Integration

- **AI-Powered Insights** - Support for Ollama, OpenAI, and Claude
- **SRE Agent** - Auto-remediation engine with confidence thresholds
- **MCP Support** - Model Context Protocol integration

---

## 📖 Usage Examples

### Terminal UI

```bash
# View default namespace
kubegraf

# View specific namespace
kubegraf production

# Show help
kubegraf --help
```

**Keyboard Shortcuts:**
- `↑/↓` or `j/k` - Navigate rows
- `Enter` - View YAML / Details
- `s` - Shell into pod
- `r` - Refresh
- `?` - Show help

### Web Dashboard

```bash
# Launch on default port (8080)
kubegraf web

# Launch on custom port
kubegraf web --port=3000
```

Then open `http://localhost:8080` in your browser.

### Incident Intelligence

1. Start the web dashboard: `kubegraf web`
2. Navigate to **Sidebar → AI → Intelligence → Incident Intelligence**
3. View detected incidents with evidence-backed diagnoses
4. Click any incident to see:
   - Summary and diagnosis
   - Evidence (events, logs, status)
   - Recommended fixes with preview
   - Timeline of events

---

## 🏗️ Architecture

KubeGraf is built with:

- **Backend**: Go with Kubernetes client-go
- **Terminal UI**: [tview](https://github.com/rivo/tview)
- **Web UI**: Solid.js + Vite
- **Visualization**: D3.js, Graphviz
- **Storage**: SQLite (local-first, encrypted)

### Project Structure

```
kubegraf/
├── main.go              # Entry point & CLI
├── app.go               # Application lifecycle
├── web_server.go        # Web server & API handlers
├── pkg/
│   ├── incidents/      # Incident Intelligence System
│   └── update/         # Auto-update mechanisms
├── ui/
│   └── solid/          # Modern Solid.js UI
└── docs/               # Documentation
```

---

## 📚 Documentation

- **[Complete Documentation](https://kubegraf.io/docs/)** - Full user guide and API reference
- **[Installation Guide](https://kubegraf.io/docs/installation.html)** - Detailed installation instructions
- **[Incident Intelligence Guide](docs/INCIDENT_INTELLIGENCE.md)** - Deep dive into the incident system
- **[Feature Reference](FEATURES.md)** - Complete list of all features
- **[Contributing Guide](CONTRIBUTING.md)** - Development setup and guidelines

---

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for:

- Development setup instructions
- Code style guidelines
- Pull request process
- Areas where you can help

**Note**: We use GitHub Issues for all discussions. No Slack/Discord required.

---

## 🔒 Security

To report a security vulnerability, please email **contact@kubegraf.io** with the subject "Security: <short title>". See [SECURITY.md](SECURITY.md) for our responsible disclosure policy.

---

## 📞 Support

- **Documentation**: [kubegraf.io/docs/](https://kubegraf.io/docs/)
- **Report a Bug**: [GitHub Issues](https://github.com/kubegraf/kubegraf/issues/new?template=bug_report.yml)
- **Request a Feature**: [GitHub Issues](https://github.com/kubegraf/kubegraf/issues/new?template=feature_request.yml)
- **Email Support**: [contact@kubegraf.io](mailto:contact@kubegraf.io)
- **Discussions**: [GitHub Discussions](https://github.com/kubegraf/kubegraf/discussions)

---

## 📝 License

Apache License 2.0 - see [LICENSE](LICENSE) file for details.

---

<div align="center">

**[Get Started](https://kubegraf.io)** · **[Documentation](https://kubegraf.io/docs/)** · **[Report Bug](https://github.com/kubegraf/kubegraf/issues)**

</div>
