# KubeGraf Terminal UI (Bubble Tea)

## Overview

A modern k9s-like Terminal UI for KubeGraf built with Bubble Tea framework. This TUI provides a fast, keyboard-driven interface for managing Kubernetes resources without leaving your terminal.

## Features Implemented

### Core Infrastructure ✅
- ✅ Separate TUI entrypoint (`cmd/kubegraf-tui/main.go`)
- ✅ Core layer in `internal/core/` with Kubernetes client management
- ✅ SharedInformerFactory for efficient caching
- ✅ Context switching support
- ✅ Namespace switching
- ✅ Modern Bubble Tea UI framework

### Current TUI Capabilities ✅
- ✅ Pod list view with live data
- ✅ Navigate pods with arrow keys (↑↓) or vim keys (j/k)
- ✅ Switch namespaces (n key)
- ✅ Refresh data (r key)
- ✅ Styled with Lip Gloss (header, footer, selection highlighting)
- ✅ Responsive layout
- ✅ Context and namespace display in header

## Quick Start

```bash
# Build TUI binary
go build -o kubegraf-tui ./cmd/kubegraf-tui

# Run TUI
./kubegraf-tui

# Or run directly
go run ./cmd/kubegraf-tui
```

##  Current Key Bindings

| Key | Action |
|-----|--------|
| `q` or `Ctrl+C` | Quit |
| `↑` or `k` | Move up |
| `↓` or `j` | Move down |
| `r` | Refresh pod list |
| `n` | Cycle namespaces (default → kube-system → all) |

## Architecture

```
cmd/kubegraf-tui/              # TUI entrypoint (SEPARATE from web)
└── main.go                   # Bubble Tea app with pod view

internal/core/                # Shared Kubernetes layer
├── types.go                  # Common types (ResourceKind, Job, etc.)
├── client.go                 # ClientManager (context/cluster switching)
└── informers.go              # InformerStore (SharedInformerFactory wrapper)

internal/tui/                 # Future: Full TUI components
└── (to be implemented)       # nav.go, table.go, details.go, command.go, etc.
```

## What's Next?

The foundation is in place. Here's the roadmap for full k9s-like functionality:

### Phase 2: More Resource Types
- [ ] Deployments, StatefulSets, DaemonSets
- [ ] Services, Ingress
- [ ] Jobs, CronJobs
- [ ] Left navigation pane to switch resource types (Tab or 1-7 keys)

### Phase 3: Details & Actions
- [ ] Right details pane with tabs (Describe | YAML | Logs | Events)
- [ ] View pod logs (l key, with follow toggle)
- [ ] Exec into pod (s key for shell)
- [ ] Port forwarding (p key)
- [ ] Delete resource (d key with confirmation)
- [ ] Restart workload (r key for deployments/sts/ds)
- [ ] Edit YAML (e key, opens $EDITOR)

### Phase 4: Advanced Features
- [ ] Command palette (Ctrl+K or `:`)
- [ ] Fuzzy search/filter (/ key)
- [ ] Toast notifications for async jobs
- [ ] Job progress indicators
- [ ] Help screen (? key)
- [ ] Context picker UI (c key)

## File Structure

```
kubegraf/
├── cmd/
│   └── kubegraf-tui/
│       └── main.go                    # TUI entrypoint
├── internal/
│   ├── core/                          # ✅ Kubernetes core layer
│   │   ├── types.go                   # ✅ Common types
│   │   ├── client.go                  # ✅ Client manager
│   │   └── informers.go               # ✅ Informer store
│   └── tui/                           # 🚧 UI components (future)
│       ├── app.go                     # Main Bubble Tea model
│       ├── nav.go                     # Left navigation
│       ├── table.go                   # Center table
│       ├── details.go                 # Right details pane
│       ├── command.go                 # Command palette
│       ├── jobs.go                    # Async job manager
│       ├── styles.go                  # Lip Gloss styles
│       └── keys.go                    # Key bindings
├── main.go                            # ✅ Web dashboard (UNTOUCHED)
├── TUI_IMPLEMENTATION_GUIDE.md        # ✅ Detailed implementation guide
└── TUI_README.md                      # ✅ This file
```

## Design Principles

1. **Separation of Concerns**:
   - `internal/core/`: Kubernetes operations (no UI dependencies)
   - `internal/tui/`: Bubble Tea UI components (no web dependencies)
   - `cmd/kubegraf-tui/`: TUI entrypoint
   - Web dashboard: UNTOUCHED and independent

2. **Performance**:
   - Uses SharedInformerFactory for efficient caching
   - Watches Kubernetes resources for real-time updates
   - No unnecessary polling

3. **User Experience**:
   - k9s-inspired key bindings
   - Keyboard-driven workflow
   - Modern, styled interface with Lip Gloss
   - Non-blocking async operations (future)

## Development

### Adding New Resource Types

1. Add to `internal/core/informers.go`:
```go
func (is *InformerStore) GetDeployments(namespace string) ([]*appsv1.Deployment, error) {
    lister := is.factory.Apps().V1().Deployments().Lister()
    return lister.Deployments(namespace).List(labels.Everything())
}
```

2. Update `cmd/kubegraf-tui/main.go` to add new view/table

### Adding Actions

Implement in `internal/core/actions.go` (to be created):
```go
func StreamLogs(opts LogsOptions) (io.ReadCloser, error)
func ExecInPod(opts ExecOptions) error
func PortForward(opts PortForwardOptions) error
```

## Testing

```bash
# Test core layer
go test ./internal/core/...

# Test against real cluster
kubectl config use-context minikube
go run ./cmd/kubegraf-tui

# Build and test
go build -o kubegraf-tui ./cmd/kubegraf-tui
./kubegraf-tui
```

## Web Dashboard Still Works! ✅

The web dashboard is completely unaffected:

```bash
# Build web binary (unchanged)
go build -o kubegraf .

# Run web dashboard
./kubegraf web --port 3003
```

## Troubleshooting

### No kubeconfig found
```bash
export KUBECONFIG=~/.kube/config
```

### Permission denied
```bash
chmod +x kubegraf-tui
```

### Can't connect to cluster
```bash
# Verify kubectl works
kubectl get pods

# Check current context
kubectl config current-context
```

## References

- [TUI_IMPLEMENTATION_GUIDE.md](./TUI_IMPLEMENTATION_GUIDE.md) - Comprehensive implementation guide
- [Bubble Tea](https://github.com/charmbracelet/bubbletea) - Terminal UI framework
- [Lip Gloss](https://github.com/charmbracelet/lipgloss) - Styling library
- [k9s](https://github.com/derailed/k9s) - Inspiration for keybindings and UX

## Contributing

To expand the TUI:

1. Follow the architecture in `TUI_IMPLEMENTATION_GUIDE.md`
2. Add new components to `internal/tui/`
3. Keep `internal/core/` UI-agnostic
4. Test both TUI and web builds
5. Ensure web dashboard remains untouched

---

**Status**: Foundation complete ✅ | Full k9s features in progress 🚧
