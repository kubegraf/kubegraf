# KubeGraf TUI Implementation Guide

## Overview
This document outlines the implementation of a modern k9s-like Terminal UI for KubeGraf using Bubble Tea framework.

## Architecture

### Directory Structure
```
cmd/kubegraf-tui/          # TUI entrypoint (separate from web)
├── main.go               # Main TUI application

internal/core/            # Shared core functionality
├── types.go             # Common types
├── client.go            # Kubernetes client manager
├── informers.go         # Informer-based caching
└── actions.go           # K8s operations (logs, exec, port-forward, etc.)

internal/tui/            # Bubble Tea UI components
├── app.go              # Main Bubble Tea application
├── styles.go           # Lip Gloss styling
├── keys.go             # Key bindings
├── header.go           # Header component (context/namespace/status)
├── footer.go           # Footer (key hints + toasts)
├── nav.go              # Left navigation (resource list)
├── table.go            # Center table (resource items)
├── details.go          # Right details pane (tabs)
├── command.go          # Command palette (Ctrl+K)
└── jobs.go             # Async job manager
```

## Core Layer Implementation

### client.go
- `ClientManager`: Manages Kubernetes clients and context switching
- `NewClientManager()`: Loads kubeconfig
- `SwitchContext()`: Switches between clusters
- `GetClientset()`, `GetDynamicClient()`: Returns clients
- `ListContexts()`: Returns available contexts
- `GetNamespaces()`: Lists namespaces

### informers.go
- `InformerStore`: Wraps SharedInformerFactory
- `Start()`, `Stop()`: Lifecycle management
- `GetPods()`, `GetDeployments()`, etc.: Cached resource access
- `WatchPods()`: Real-time updates via event handlers

### actions.go
Key operations to implement:
- `StreamLogs(opts LogsOptions) (io.ReadCloser, error)`: Pod logs
- `ExecInPod(opts ExecOptions) error`: Interactive shell
- `PortForward(opts PortForwardOptions) error`: Port forwarding
- `DeleteResource(kind, namespace, name) error`: Delete with confirmation
- `RestartDeployment(namespace, name) error`: Patch restart annotation
- `GetYAML(kind, namespace, name) (string, error)`: Fetch YAML
- `ApplyYAML(yaml string) error`: Server-side apply

## TUI Layer Implementation

### app.go - Main Bubble Tea Model
```go
type Model struct {
    clientMgr    *core.ClientManager
    informers    *core.InformerStore

    // UI state
    currentView  string  // "pods", "deployments", etc.
    namespace    string
    context      string

    // Components
    header      header.Model
    nav         nav.Model
    table       table.Model
    details     details.Model
    footer      footer.Model
    command     command.Model

    // Jobs
    jobs        []core.Job
    toasts      []Toast

    width, height int
}

func (m Model) Init() tea.Cmd
func (m Model) Update(msg tea.Msg) (tea.Model, tea.Cmd)
func (m Model) View() string
```

### Keys and Commands
```go
// Navigation
q - quit
? - help
/ - filter/search
Esc - clear/cancel

// Resource navigation
Tab - cycle resource types
1-7 - jump to specific resource
↑/↓ or j/k - navigate list

// Actions
l - logs (follow)
s - shell/exec
p - port-forward
d - delete (with confirmation)
r - restart (deployment/sts/ds)
y - view YAML
e - edit YAML (opens $EDITOR)
Enter - view details

// Context/Namespace
n - switch namespace
c - switch context (cluster)

// Command Palette
Ctrl+K or : - open command palette
```

### Command Palette Commands
```
ctx <name>                   # Switch context
ns <name|all>               # Switch namespace
get <kind>                  # Switch to resource view
logs <pod> [container]      # View logs
shell <pod> [container]     # Exec into pod
pf <pod|svc> <remote> [local]  # Port forward
delete <kind> <name>        # Delete resource
restart <kind> <name>       # Restart workload
```

### Layout

```
┌─────────────────────────────────────────────────────────────┐
│ Context: prod-cluster | Namespace: default | ●Connected    │  Header
├──────────┬──────────────────────────┬───────────────────────┤
│ Pods     │ NAME          READY  AGE │ ┌─ Describe ─ YAML  │
│ Deploy..│ nginx-76d...  2/2     5d  │ │                    │
│ StatefulS│ redis-0       1/1     2d  │ │ Name: nginx-76..  │
│ DaemonS..│ app-abc       3/3     1h  │ │ Namespace: default│
│ Jobs     │                           │ │ Ready: 2/2         │
│ CronJobs │                           │ │ Restarts: 0        │
│ Services │                           │ │ Node: node-1       │
│          │                           │ │ IP: 10.244.0.5     │
├──────────┴──────────────────────────┴───────────────────────┤
│ q:quit ?:help /:filter l:logs s:shell p:portfwd d:delete  │  Footer
│ [✓] Logs streaming for nginx-76d...                        │  Toast
└─────────────────────────────────────────────────────────────┘
```

### Styling with Lip Gloss
```go
var (
    HeaderStyle = lipgloss.NewStyle().
        Background(lipgloss.Color("#7C3AED")).
        Foreground(lipgloss.Color("#FFFFFF")).
        Bold(true).
        Padding(0, 1)

    SelectedRowStyle = lipgloss.NewStyle().
        Background(lipgloss.Color("#6366F1")).
        Foreground(lipgloss.Color("#FFFFFF"))

    BorderStyle = lipgloss.NewStyle().
        Border(lipgloss.RoundedBorder()).
        BorderForeground(lipgloss.Color("#7C3AED"))
)
```

### Async Job Manager

```go
type JobManager struct {
    jobs   map[string]*core.Job
    mu     sync.RWMutex
    notify chan JobUpdate
}

func (jm *JobManager) Submit(job *core.Job) string
func (jm *JobManager) Cancel(jobID string) error
func (jm *JobManager) GetStatus(jobID string) *core.Job
func (jm *JobManager) Watch() <-chan JobUpdate
```

Jobs run in goroutines and send updates via channels to keep UI responsive.

## Implementation Phases

### Phase 1: Minimal Working Prototype ✓
- [x] Basic Bubble Tea app structure
- [x] Context/namespace switching
- [x] Pod list view with table
- [x] Key bindings (q, ↑/↓, n, c)
- [x] Header + Footer layout

### Phase 2: Resource Browsing
- [ ] All resource types (Deployments, Services, etc.)
- [ ] Filtering/search (/)
- [ ] Details pane with tabs
- [ ] YAML view
- [ ] Events view

### Phase 3: Actions
- [ ] View logs (l key)
- [ ] Exec/shell (s key)
- [ ] Port forwarding (p key)
- [ ] Delete with confirmation (d key)
- [ ] Restart workloads (r key)

### Phase 4: Polish
- [ ] Command palette (Ctrl+K)
- [ ] Toast notifications
- [ ] Job progress indicators
- [ ] Help screen (?)
- [ ] Error handling & recovery

## Building and Running

```bash
# Install dependencies
go mod tidy

# Run TUI directly
go run ./cmd/kubegraf-tui

# Build TUI binary
go build -o kubegraf-tui ./cmd/kubegraf-tui
./kubegraf-tui

# Run web UI (unchanged)
./kubegraf web --port 3003
```

## Testing

```bash
# Test core layer
go test ./internal/core/...

# Test TUI components
go test ./internal/tui/...

# Integration test
kubectl config use-context minikube
go run ./cmd/kubegraf-tui
```

## Key Implementation Details

### Informer Pattern
Use SharedInformerFactory for efficient caching:
```go
factory := informers.NewSharedInformerFactory(clientset, 30*time.Second)
podInformer := factory.Core().V1().Pods().Informer()
podInformer.AddEventHandler(cache.ResourceEventHandlerFuncs{
    AddFunc: func(obj interface{}) {
        // Send Bubble Tea message
        program.Send(PodAddedMsg{pod})
    },
})
factory.Start(stopCh)
```

### Port Forwarding
```go
import (
    "k8s.io/client-go/tools/portforward"
    "k8s.io/client-go/transport/spdy"
)

dialer := spdy.NewDialer(upgrader, &http.Client{}, "POST", url)
fw, err := portforward.New(dialer, []string{fmt.Sprintf("%d:%d", local, remote)},
    stopChan, readyChan, out, errOut)
fw.ForwardPorts()
```

### Exec into Pod
```go
import "k8s.io/client-go/kubernetes/scheme"
import "k8s.io/client-go/tools/remotecommand"

req := clientset.CoreV1().RESTClient().Post().
    Resource("pods").
    Name(podName).
    Namespace(namespace).
    SubResource("exec").
    VersionedParams(&corev1.PodExecOptions{
        Command: []string{"/bin/sh"},
        Stdin:   true,
        Stdout:  true,
        Stderr:  true,
        TTY:     true,
    }, scheme.ParameterCodec)

exec, _ := remotecommand.NewSPDYExecutor(config, "POST", req.URL())
exec.Stream(remotecommand.StreamOptions{
    Stdin:  os.Stdin,
    Stdout: os.Stdout,
    Stderr: os.Stderr,
    Tty:    true,
})
```

## Non-Negotiables Checklist

- [x] Separate entrypoint (`cmd/kubegraf-tui/main.go`)
- [x] Core layer in `internal/core/` (no UI dependencies)
- [x] TUI layer in `internal/tui/` (Bubble Tea only)
- [ ] Web dashboard files untouched
- [ ] Web build continues working
- [x] Uses Kubernetes informers (not polling)
- [ ] All actions are async/non-blocking
- [ ] Command palette for power users
- [ ] Context + namespace prominently displayed

## Next Steps

1. Complete the minimal working prototype with pod listing
2. Add remaining resource types (Deployments, Services, etc.)
3. Implement details pane with tabs
4. Add all k9s-style actions (logs, shell, port-forward, delete, restart)
5. Polish UI with toasts, progress, error handling
6. Add command palette and advanced features

## References

- Bubble Tea: https://github.com/charmbracelet/bubbletea
- Lip Gloss: https://github.com/charmbracelet/lipgloss
- Bubbles: https://github.com/charmbracelet/bubbles
- client-go: https://github.com/kubernetes/client-go
- k9s (inspiration): https://github.com/derailed/k9s
