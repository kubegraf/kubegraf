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

- 🎨 **Beautiful TUI** - Modern terminal interface with cyan/magenta theme
- 📊 **Real-time Metrics** - Live CPU and memory usage for pods
- 🔍 **Resource Explorer** - Pods, Deployments, Services, Ingresses, ConfigMaps, Secrets
- 🔗 **Relationship Mapping** - Visualize Ingress → Service → Pod connections
- 💻 **Pod Shell Access** - Execute directly into running containers
- 📝 **YAML Viewer** - View complete resource configurations
- 🔍 **Describe Resources** - Full kubectl describe output
- ⚡ **Fast Navigation** - Numbers (1-6), vim keys (h/l), arrows
- 🎯 **Tab Interface** - Clean organization of resource types
- 🔐 **Safe Operations** - Confirmation dialogs for destructive actions

## 📦 Installation

### From Source

\`\`\`bash
# Clone the repository
git clone https://github.com/kubegraf/kubegraf.git
cd kubegraf

# Build
go build -o kubegraf

# Run
./kubegraf [namespace]
\`\`\`

### Prerequisites

- Go 1.24+
- kubectl configured with cluster access
- Kubernetes cluster

## 🎯 Usage

\`\`\`bash
# View default namespace
./kubegraf

# View specific namespace
./kubegraf argocd

# Show version
./kubegraf --version

# Show help
./kubegraf --help
\`\`\`

## ⌨️ Keyboard Shortcuts

### Navigation
- **↑/↓** - Navigate rows
- **1-6** - Jump to tab (1=Pods, 2=Deployments, etc.)
- **h/l** or **←/→** - Previous/Next tab
- **Tab/Shift+Tab** - Cycle through tabs
- **Enter** - View resource YAML
- **Esc** - Close modal/dialog

### Operations
- **q** / **Ctrl+C** - Quit application
- **r** / **Ctrl+R** - Refresh resources
- **n** - Change namespace
- **d** - Describe resource (kubectl describe)
- **s** - Shell into pod
- **Ctrl+D** - Delete resource (with confirmation)
- **?** - Show help

## 🎨 Interface

KubeGraf features a beautiful terminal interface with:
- Cyan highlights for labels and active elements
- Magenta values for metrics
- Clean tab-based navigation
- Real-time status icons (✔, ✖, ⚠, ◷)

## 🏗️ Built With

- [tview](https://github.com/rivo/tview) - Terminal UI framework
- [tcell](https://github.com/gdamore/tcell) - Terminal handling
- [client-go](https://github.com/kubernetes/client-go) - Kubernetes API

## 🤝 Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create feature branch (\`git checkout -b feature/amazing\`)
3. Commit changes (\`git commit -m 'Add feature'\`)
4. Push to branch (\`git push origin feature/amazing\`)
5. Open Pull Request

## 📝 License

Apache License 2.0 - see [LICENSE](LICENSE)

## 🙏 Acknowledgments

- Inspired by [k9s](https://k9scli.io/) - Kubernetes CLI
- Inspired by [kdash](https://github.com/kdash-rs/kdash)
- Built for the Kubernetes community ❤️

---

<div align="center">
Made with ❤️ for Kubernetes DevOps
</div>
