# KubeGraf

<div align="center">

<img src="docs/logo.svg" alt="KubeGraf" width="400">

**Advanced Kubernetes Visualization Tool**

[![Release](https://img.shields.io/github/v/release/kubegraf/kubegraf?style=flat&color=00d4aa)](https://github.com/kubegraf/kubegraf/releases/latest)
[![CI](https://github.com/kubegraf/kubegraf/actions/workflows/ci.yml/badge.svg)](https://github.com/kubegraf/kubegraf/actions/workflows/ci.yml)
[![Go Version](https://img.shields.io/badge/Go-1.22+-00ADD8?style=flat&logo=go)](https://golang.org)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)
[![GitHub Stars](https://img.shields.io/github/stars/kubegraf/kubegraf?style=flat&color=yellow)](https://github.com/kubegraf/kubegraf/stargazers)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

**[Website](https://kubegraf.io)** · **[Documentation](https://kubegraf.io/getting-started.html)** · **[Releases](https://github.com/kubegraf/kubegraf/releases)**

</div>

---

## 🚀 Features

### Three Powerful Interfaces

| Terminal UI | Web Dashboard | Solid.js UI |
|-------------|---------------|-------------|
| Lightning-fast TUI | Classic browser UI | Modern SPA |
| Vim-style keybindings | Real-time metrics | Reactive components |
| Works over SSH | Interactive D3.js topology | 5 theme options |
| Zero dependencies | WebSocket live updates | Full CRUD operations |

### Core Capabilities

- **Real-time Monitoring** - Live CPU and memory usage for pods with WebSocket updates
- **Resource Explorer** - Full support for Pods, Deployments, Services, StatefulSets, DaemonSets, Ingresses, ConfigMaps, Secrets, Certificates, CronJobs, Jobs, Nodes
- **Pod Operations** - Shell access, logs streaming, restart, delete, port forwarding
- **Service Operations** - Port forwarding with session management, endpoint discovery
- **Deployment Operations** - Scale replicas, restart rolling updates, rollback, history
- **YAML Viewer** - Syntax-highlighted complete resource configurations
- **Multi-Namespace** - Switch namespaces or view all at once
- **Multi-Cluster** - Switch between Kubernetes contexts
- **Security Analysis** - Automated security posture assessment with 0-100 score
- **Cost Management** - Cloud cost estimation for GCP, AWS, Azure, and more
- **Drift Detection** - Configuration drift monitoring and GitOps sync status
- **AI Integration** - AI-powered insights with Ollama, OpenAI, and Claude support
- **Apps Marketplace** - Browse and install Helm charts
- **Plugin System** - Extensible architecture with Helm, ArgoCD, Flux support
- **Events** - Real-time cluster events and notifications
- **Diagnostics** - Automated cluster health and performance analysis

### Advanced Visualization

- **Topology View** - Interactive D3.js force-directed graphs
- **ResourceMap** - ASCII tree view of resource relationships
- **Terminal Canvas** - Pure CLI graph visualization (no browser needed)
- **Relationship Mapping** - Ingress → Service → Pod connections
- **Dependency Tracking** - ConfigMaps, Secrets, ServiceAccounts linked to workloads

## 📦 Installation

### Homebrew (macOS - Recommended)

The easiest way to install on macOS:

```bash
brew tap kubegraf/tap
brew install kubegraf/tap/kubegraf
```

Or in one command:
```bash
brew install kubegraf/tap/kubegraf
```

After installation, start the web UI:
```bash
kubegraf --web
# Then open: http://localhost:8080
```

Or use a custom port:
```bash
kubegraf --web --port=3000
# Then open: http://localhost:3000
```

### Download Binary

Download the latest release for your platform:

**macOS:**
```bash
# Apple Silicon (M1/M2/M3)
curl -L https://github.com/kubegraf/kubegraf/releases/latest/download/kubegraf-darwin-arm64.tar.gz | tar xz
sudo mv kubegraf /usr/local/bin/

# Intel Mac
curl -L https://github.com/kubegraf/kubegraf/releases/latest/download/kubegraf-darwin-amd64.tar.gz | tar xz
sudo mv kubegraf /usr/local/bin/
```

**Linux:**
```bash
# x86_64
curl -L https://github.com/kubegraf/kubegraf/releases/latest/download/kubegraf-linux-amd64.tar.gz | tar xz
sudo mv kubegraf /usr/local/bin/

# ARM64
curl -L https://github.com/kubegraf/kubegraf/releases/latest/download/kubegraf-linux-arm64.tar.gz | tar xz
sudo mv kubegraf /usr/local/bin/
```

**Windows (PowerShell):**
```powershell
# x86_64 (most Windows PCs)
Invoke-WebRequest -Uri "https://github.com/kubegraf/kubegraf/releases/latest/download/kubegraf-windows-amd64.zip" -OutFile kubegraf.zip
Expand-Archive kubegraf.zip -DestinationPath .
Move-Item kubegraf.exe C:\Windows\System32\

# Or add to a custom directory in PATH
mkdir C:\kubegraf -Force
Move-Item kubegraf.exe C:\kubegraf\
# Add C:\kubegraf to your PATH environment variable
```

**Windows (Scoop):**
```powershell
# Install scoop first if not installed: https://scoop.sh
scoop bucket add extras
scoop install kubegraf
```

**Windows (Manual):**
1. Download `kubegraf-windows-amd64.zip` from [Releases](https://github.com/kubegraf/kubegraf/releases/latest)
2. Extract the ZIP file
3. Move `kubegraf.exe` to a folder in your PATH (e.g., `C:\Windows\System32\`)
4. Or add the extracted folder to your PATH environment variable

### Go Install

```bash
go install github.com/kubegraf/kubegraf@latest
```

### Build from Source

```bash
git clone https://github.com/kubegraf/kubegraf.git
cd kubegraf
go build -o kubegraf
./kubegraf
```

## 🎯 Usage

### Terminal UI (Default)

```bash
# View default namespace
kubegraf

# View specific namespace
kubegraf production

# Show version
kubegraf --version

# Show help
kubegraf --help
```

### Web Dashboard

```bash
# Launch web dashboard on default port (8080)
kubegraf --web

# Launch on custom port
kubegraf --web --port=3000

# Then open: http://localhost:8080
```

## ⌨️ Keyboard Shortcuts (Terminal UI)

| Key | Action |
|-----|--------|
| `↑/↓` or `j/k` | Navigate rows |
| `1-7` | Jump to tab |
| `h/l` or `←/→` | Previous/Next tab |
| `Enter` | View YAML / Details |
| `q` or `Ctrl+C` | Quit |
| `r` or `Ctrl+R` | Refresh |
| `n` | Change namespace |
| `d` | Describe resource |
| `s` | Shell into pod |
| `i` | Terminal canvas graph |
| `g` | Browser-based graph |
| `Ctrl+D` | Delete (with confirmation) |
| `?` | Show help |

## 🌐 Web Dashboard Features

<div align="center">
<img src="docs/dashboard-screenshot.png" alt="KubeGraf Web Dashboard" width="800">
<p><em>KubeGraf Web Dashboard - Resource management with real-time metrics</em></p>
</div>

- **Resource Overview** - Quick summary cards for all resource types
- **Real-time Metrics** - CPU, memory, pod counts with live updates
- **Topology Visualization** - Interactive D3.js graph of cluster resources
- **Port Forwarding** - One-click service access with session management
- **Pod Operations** - Logs, exec shell, restart, delete from browser
- **All Namespaces** - View resources across entire cluster
- **Connection Status** - Live cluster connectivity indicator
- **Security Analysis** - Automated security best practices recommendations
- **Helm Releases** - View and manage Helm deployments in your cluster

## 🎨 Solid.js UI (New!)

The new Solid.js UI provides a modern, reactive single-page application with advanced features:

### Running the Solid.js UI

```bash
# Development mode (requires Node.js)
cd ui/solid
npm install
npm run dev
# Then open: http://localhost:3000

# The backend should be running:
kubegraf --web --port=8080
```

### Features

| Feature | Description |
|---------|-------------|
| **Dashboard** | AI-powered insights, security score, cluster metrics, cost overview |
| **Workloads** | Pods, Deployments, StatefulSets, DaemonSets, CronJobs, Jobs |
| **Network** | Services with port forwarding, Ingresses, traffic analysis |
| **Config** | ConfigMaps, Secrets, Certificates with syntax-highlighted YAML |
| **Cluster** | Nodes, Resource Map topology visualization, events |
| **Security** | Security posture analysis with best practices and remediation |
| **Cost** | Cloud cost estimation and optimization recommendations |
| **Drift** | Configuration drift detection and GitOps sync status |
| **Apps** | Apps marketplace for browsing and installing Helm charts |
| **Plugins** | Helm, ArgoCD, Flux integrations |

### Themes

5 built-in themes with dynamic CSS variables:
- **Dark** (default) - Classic dark theme
- **Light** - Clean light theme
- **Midnight** - Deep blue tones
- **Cyberpunk** - Neon pink and cyan
- **Ocean** - Calming blue-green

### Pod Operations

- **Shell** - Interactive terminal via WebSocket
- **Logs** - Real-time log streaming with search
- **YAML** - Syntax-highlighted configuration
- **Describe** - Full kubectl describe output
- **Restart/Delete** - With confirmation dialogs

## 🛡️ Security Best Practices

KubeGraf includes automated security analysis to identify and help fix security issues in your cluster. Access the **Security** tab in the web dashboard to see findings.

### Security Score

Your cluster receives a security score from 0-100 based on findings. Higher scores indicate better security posture.

### Security Checks

| Category | What's Checked | Severity |
|----------|---------------|----------|
| **SecurityContext** | Missing SecurityContext on pods | Critical |
| **SecurityContext** | Pods not running as non-root | High |
| **SecurityContext** | Privileged containers | Critical |
| **SecurityContext** | allowPrivilegeEscalation enabled | Medium |
| **SecurityContext** | Writable root filesystem | Low |
| **NetworkPolicy** | Namespaces without NetworkPolicies | High |
| **Ingress** | Using insecure ports (80, 8080, 8000, 3000) | Medium/High |
| **Ingress** | Missing TLS configuration | High |
| **Services** | NodePort services exposed | Medium |
| **Services** | LoadBalancer external traffic policy | Low |

### Remediation

Each finding includes:
- **Description** - What the issue is and why it matters
- **Remediation** - How to fix the issue with examples

## 🗺️ Visualization Options

KubeGraf provides multiple ways to visualize resource relationships:

### Terminal UI - ResourceMap Tab

The ResourceMap tab (press `7`) offers three visualization modes:

| Key | View | Description |
|-----|------|-------------|
| `Enter` | ASCII Tree | Text-based hierarchy view in terminal |
| `i` | Terminal Canvas | Interactive graph drawn in terminal (no browser) |
| `g` | Browser Graph | Opens D3.js or Graphviz visualization in browser |

**ASCII Tree View** (Press `Enter`):
```
🚀 Deployment nginx
  replicas: 3/3

├─► 📦 ReplicaSet nginx-xyz
│   ├─► ✔ Pod nginx-1 (Running)
│   │     ip=10.42.0.1, node=node1
│   ├─► ✔ Pod nginx-2 (Running)
│   └─► ✔ Pod nginx-3 (Running)
├─► ⚙️ ConfigMap nginx-config
└─► 🔐 Secret nginx-secret
```

**Terminal Canvas** (Press `i`): Interactive graph with boxes and arrows rendered directly in the terminal. Use arrow keys to pan, `+/-` to zoom.

**Browser Graph** (Press `g`): Choose between D3.js force-directed graph or Graphviz structured layout.

### Web Dashboard - Topology View

The web dashboard (`kubegraf --web`) includes an interactive topology page at `/topology` with:
- D3.js force-directed graph
- Draggable nodes
- Color-coded resource types
- Real-time updates via WebSocket

## 🏗️ Built With

- [tview](https://github.com/rivo/tview) - Terminal UI framework
- [client-go](https://github.com/kubernetes/client-go) - Kubernetes API client
- [D3.js](https://d3js.org/) - Data visualization (Web UI)
- [gographviz](https://github.com/awalterschulze/gographviz) - Graph generation
- [Solid.js](https://www.solidjs.com/) - Reactive UI framework (Modern UI)
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework
- [Vite](https://vitejs.dev/) - Fast build tool

## 🎯 Key Features Summary

KubeGraf provides a comprehensive Kubernetes management solution with:

- **3 Interfaces** - Terminal UI, Web Dashboard, and Modern Solid.js SPA
- **20+ Resource Types** - Complete Kubernetes resource coverage
- **Security Analysis** - Automated security posture assessment with scoring
- **Cost Management** - Multi-cloud cost estimation (GCP, AWS, Azure, etc.)
- **Drift Detection** - Configuration drift monitoring and GitOps integration
- **AI Integration** - AI-powered insights (Ollama, OpenAI, Claude)
- **Visualization** - Multiple topology views (D3.js, Graphviz, Terminal Canvas)
- **Real-time Monitoring** - Live metrics, events, and WebSocket updates
- **Plugin System** - Extensible architecture with Helm, ArgoCD, Flux support
- **Multi-cluster** - Support for multiple Kubernetes contexts

For a complete list of features and capabilities, see [FEATURES.md](FEATURES.md).

## 📂 Project Structure

```
kubegraf/
├── main.go              # Entry point & CLI
├── app.go               # Application lifecycle
├── types.go             # Type definitions
├── ui.go                # Terminal UI components
├── handlers.go          # Keyboard event handlers
├── resources.go         # Resource data fetching
├── operations.go        # YAML, shell, delete ops
├── mapping.go           # Relationship visualization
├── graph.go             # Graph export (Graphviz)
├── graph_d3.go          # D3.js visualization
├── graph_canvas.go      # Terminal canvas rendering
├── events.go            # Background monitoring
├── web_server.go        # Web server & API handlers
├── web_ui.go            # Embed directive for HTML
├── helpers.go           # Utility functions
├── web/
│   └── templates/
│       └── dashboard.html   # Classic web dashboard
├── ui/
│   └── solid/               # New Solid.js UI
│       ├── src/
│       │   ├── components/  # Reusable UI components
│       │   ├── routes/      # Page components
│       │   ├── services/    # API and WebSocket services
│       │   ├── stores/      # State management
│       │   └── styles/      # CSS with theme support
│       └── package.json
└── docs/                    # Documentation website
```

## 📚 Documentation

- **[FEATURES.md](FEATURES.md)** - Complete feature and capability documentation
- **[CONTRIBUTING.md](CONTRIBUTING.md)** - Development setup and contribution guidelines
- **[DEPENDENCIES.md](DEPENDENCIES.md)** - Project dependencies and licenses

## 🤝 Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing`)
3. Commit changes (`git commit -m 'Add feature'`)
4. Push to branch (`git push origin feature/amazing`)
5. Open Pull Request

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines.

## 📝 License

Apache License 2.0 - see [LICENSE](LICENSE)

---

<div align="center">

**[Get Started](https://kubegraf.io)** · **[Documentation](https://kubegraf.io/getting-started.html)** · **[Report Bug](https://github.com/kubegraf/kubegraf/issues)**

</div>
