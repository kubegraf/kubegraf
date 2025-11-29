# KubeGraf

<div align="center">

<h2>⎈ KubeGraf</h2>

**Advanced Kubernetes Visualization Tool**

[![Release](https://img.shields.io/github/v/release/kubegraf/kubegraf?style=flat&color=00d4aa)](https://github.com/kubegraf/kubegraf/releases/latest)
[![Go Version](https://img.shields.io/badge/Go-1.22+-00ADD8?style=flat&logo=go)](https://golang.org)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

**[Website](https://kubegraf.io)** · **[Documentation](https://kubegraf.io/getting-started.html)** · **[Releases](https://github.com/kubegraf/kubegraf/releases)**

</div>

---

## 🚀 Features

### Two Powerful Interfaces

| Terminal UI | Web Dashboard |
|-------------|---------------|
| Lightning-fast TUI | Modern browser-based UI |
| Vim-style keybindings | Real-time metrics with sparklines |
| Works over SSH | Interactive D3.js topology |
| Zero dependencies | WebSocket live updates |

### Core Capabilities

- **Real-time Monitoring** - Live CPU and memory usage for pods
- **Resource Explorer** - Pods, Deployments, Services, StatefulSets, DaemonSets, Ingresses, ConfigMaps, CronJobs, Jobs, Nodes
- **Pod Operations** - Shell access, logs, restart, delete
- **Service Operations** - Port forwarding, endpoint discovery
- **Deployment Operations** - Scale replicas, restart rolling updates
- **YAML Viewer** - View complete resource configurations
- **Multi-Namespace** - Switch namespaces or view all at once

### Advanced Visualization

- **Topology View** - Interactive D3.js force-directed graphs
- **ResourceMap** - ASCII tree view of resource relationships
- **Terminal Canvas** - Pure CLI graph visualization (no browser needed)
- **Relationship Mapping** - Ingress → Service → Pod connections
- **Dependency Tracking** - ConfigMaps, Secrets, ServiceAccounts linked to workloads

## 📦 Installation

### Download Binary (Recommended)

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

**Windows:**
```powershell
# Download from: https://github.com/kubegraf/kubegraf/releases/latest
# Extract kubegraf-windows-amd64.zip and add to PATH
```

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

- **Resource Overview** - Quick summary cards for all resource types
- **Real-time Metrics** - CPU, memory, pod counts with live updates
- **Topology Visualization** - Interactive D3.js graph of cluster resources
- **Port Forwarding** - One-click service access with session management
- **Pod Operations** - Logs, exec shell, restart, delete from browser
- **All Namespaces** - View resources across entire cluster
- **Connection Status** - Live cluster connectivity indicator

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

## 📂 Project Structure

```
kubegraf/
├── main.go          # Entry point & CLI
├── app.go           # Application lifecycle
├── types.go         # Type definitions
├── ui.go            # Terminal UI components
├── handlers.go      # Keyboard event handlers
├── resources.go     # Resource data fetching
├── operations.go    # YAML, shell, delete ops
├── mapping.go       # Relationship visualization
├── graph.go         # Graph export
├── canvas_graph.go  # Terminal canvas rendering
├── events.go        # Background monitoring
├── web_server.go    # Web server & API
├── web_ui.go        # Web dashboard HTML
└── helpers.go       # Utility functions
```

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
