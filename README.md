# KubeGraf

<div align="center">

```
  ██╗  ██╗██╗   ██╗██████╗ ███████╗ ██████╗ ██████╗  █████╗ ███████╗
  ██║ ██╔╝██║   ██║██╔══██╗██╔════╝██╔════╝ ██╔══██╗██╔══██╗██╔════╝
  █████╔╝ ██║   ██║██████╔╝█████╗  ██║  ███╗██████╔╝███████║█████╗
  ██╔═██╗ ██║   ██║██╔══██╗██╔══╝  ██║   ██║██╔══██╗██╔══██║██╔══╝
  ██║  ██╗╚██████╔╝██████╔╝███████╗╚██████╔╝██║  ██║██║  ██║██║
  ╚═╝  ╚═╝ ╚═════╝ ╚═════╝ ╚══════╝ ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝
```

**Advanced Kubernetes Visualization Tool**

[![Go Version](https://img.shields.io/badge/Go-1.24+-00ADD8?style=flat&logo=go)](https://golang.org)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

</div>

---

## 🚀 Features

### Core Features
- 🎨 **Beautiful TUI** - Modern terminal interface with cyan/magenta theme
- 📊 **Real-time Metrics** - Live CPU and memory usage for pods
- 🔍 **Resource Explorer** - Pods, Deployments, Services, Ingresses, ConfigMaps, Secrets
- 💻 **Pod Shell Access** - Execute directly into running containers
- 📝 **YAML Viewer** - View complete resource configurations
- 🔍 **Describe Resources** - Full kubectl describe output
- ⚡ **Fast Navigation** - Numbers (1-7), vim keys (h/l), arrows
- 🎯 **Tab Interface** - Clean organization of resource types
- 🔐 **Safe Operations** - Confirmation dialogs for destructive actions

### Advanced Visualization
- 🗺️ **ResourceMap Tab** - Interactive resource relationship explorer
- 🌳 **ASCII Tree View** - Terminal-based relationship visualization with box-drawing
- 📊 **Interactive Graphs** - Browser-based graph visualization with Graphviz
- 🎨 **Color-Coded Nodes** - Different colors and shapes per resource type
- 🔍 **Zoom & Pan** - Interactive controls for graph exploration
- 💾 **Export Capability** - Download graphs as SVG for presentations
- 🔗 **Relationship Mapping** - Visualize Ingress → Service → Pod connections
- 📦 **Dependency Tracking** - See ConfigMaps, Secrets, ServiceAccounts linked to Deployments

## 📦 Installation

### From Source

```bash
# Clone the repository
git clone https://github.com/kubegraf/kubegraf.git
cd kubegraf

# Build
go build -o kubegraf

# Run
./kubegraf [namespace]
```

### Prerequisites

**Required:**
- Go 1.24+
- kubectl configured with cluster access
- Kubernetes cluster

**Optional (for graph visualization):**
```bash
# macOS
brew install graphviz

# Linux (Ubuntu/Debian)
sudo apt install graphviz

# Linux (RHEL/CentOS)
sudo yum install graphviz

# Windows
choco install graphviz
```

> **Note:** Without Graphviz, you can still use ASCII tree view and export DOT files.

## 🎯 Usage

```bash
# View default namespace
./kubegraf

# View specific namespace
./kubegraf argocd

# Show version
./kubegraf --version

# Show help
./kubegraf --help
```

## ⌨️ Keyboard Shortcuts

### Navigation
- **↑/↓** - Navigate rows
- **1-7** - Jump to tab (1=Pods, 2=Deployments, 7=ResourceMap)
- **h/l** or **←/→** - Previous/Next tab
- **Tab/Shift+Tab** - Cycle through tabs
- **Enter** - View resource YAML or relationship tree
- **Esc** - Close modal/dialog

### Operations
- **q** / **Ctrl+C** - Quit application
- **r** / **Ctrl+R** - Refresh resources
- **n** - Change namespace
- **d** - Describe resource (kubectl describe)
- **s** - Shell into pod
- **g** - Export interactive graph (ResourceMap tab)
- **Ctrl+D** - Delete resource (with confirmation)
- **?** - Show help

## 🗺️ ResourceMap Features

The ResourceMap tab (Tab 7) provides advanced visualization of Kubernetes resource relationships:

### ASCII Tree View (Press Enter)
```
🚀 Deployment nginx
  replicas: 3/3
Status: Ready

├─► 📦 ReplicaSet nginx-xyz
│   ├─► ✔ Pod nginx-1 (Running)
│   │     ip=10.42.0.1, node=node1
│   ├─► ✔ Pod nginx-2 (Running)
│   │     ip=10.42.0.2, node=node1
│   └─► ✔ Pod nginx-3 (Running)
│         ip=10.42.0.3, node=node2
├─► ⚙️ ConfigMap nginx-config (Mounted)
├─► 🔐 Secret nginx-secret (Mounted)
└─► 🔑 ServiceAccount nginx-sa (Active)
```

### Interactive Graph View (Press 'g')
- Opens in your default web browser
- Color-coded nodes with different shapes:
  - 🚪 Ingress (house shape, red)
  - 🌐 Service (ellipse, green)
  - 🚀 Deployment (3D box, orange)
  - 📦 ReplicaSet (folder, purple)
  - 🎯 Pod (cylinder, teal)
  - ⚙️ ConfigMap (note, gray)
  - 🔐 Secret (octagon, dark red)
- Interactive zoom controls
- Download as SVG
- Dark theme with gradient background
- Shows full metadata (IPs, ports, status)

### Supported Visualizations
1. **Ingress Relationships**: Ingress → Services → Pods (with paths and hosts)
2. **Deployment Hierarchy**: Deployment → ReplicaSet → Pods + ConfigMaps + Secrets + SA
3. **Service Connections**: Service → Pods (with selectors)

## 🎨 Interface

KubeGraf features a beautiful terminal interface with:
- Cyan highlights for labels and active elements
- Magenta values for metrics
- Clean tab-based navigation
- Real-time status icons (✔, ✖, ⚠, ◷)
- Professional ASCII art graphs
- Interactive HTML visualizations

## 🏗️ Built With

- [tview](https://github.com/rivo/tview) - Terminal UI framework
- [tcell](https://github.com/gdamore/tcell) - Terminal handling
- [client-go](https://github.com/kubernetes/client-go) - Kubernetes API
- [gographviz](https://github.com/awalterschulze/gographviz) - Graph visualization
- [Graphviz](https://graphviz.org/) - Graph rendering (optional)

## 📂 Project Structure

KubeGraf is organized into clean, maintainable modules:

```
kubegraf/
├── main.go          # Entry point
├── types.go         # Type definitions
├── app.go           # Application lifecycle
├── ui.go            # UI components
├── handlers.go      # Event handlers
├── resources.go     # Resource rendering
├── operations.go    # YAML, shell, delete ops
├── mapping.go       # Relationship visualization
├── graph.go         # Graph export & browser view
├── events.go        # Background monitoring
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

## 🙏 Acknowledgments

- Inspired by [k9s](https://k9scli.io/) - Kubernetes CLI
- Inspired by [kdash](https://github.com/kdash-rs/kdash)
- Graph visualization powered by [Graphviz](https://graphviz.org/)
- Built for the Kubernetes community ❤️

---

## 🎬 Quick Start Example

```bash
# 1. Install and run
go build -o kubegraf
./kubegraf argocd

# 2. Navigate to ResourceMap (press '7')
# 3. Select a Deployment
# 4. Press 'Enter' for ASCII tree OR 'g' for interactive graph
# 5. Explore relationships!
```

---

<div align="center">
Made with ❤️ for Kubernetes DevOps
</div>
