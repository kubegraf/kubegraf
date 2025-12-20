# KubeGraf CLI Commands

KubeGraf now includes a set of production-grade CLI commands for quick Kubernetes operations.

## Overview

The CLI provides five core commands for common Kubernetes tasks:
- **logs** - Stream pod logs
- **shell** - Execute interactive shell in pods
- **pf** - Port forward to pods or services
- **restart** - Restart deployments, statefulsets, or daemonsets
- **apply** - Apply YAML configurations

## Installation

```bash
go build -o kubegraf .
```

The CLI commands are integrated into the existing `kubegraf` binary.

## Commands

### logs - Stream Pod Logs

Stream logs from a Kubernetes pod with support for following, filtering, and multi-container pods.

```bash
# Get logs from a pod
kubegraf logs nginx-7c6f9f8c9-4xk2l

# Follow logs from a pod
kubegraf logs nginx-7c6f9f8c9-4xk2l --follow

# Get logs from a specific container
kubegraf logs nginx-7c6f9f8c9-4xk2l --container nginx

# Get last 100 lines
kubegraf logs nginx-7c6f9f8c9-4xk2l --tail 100

# Get logs from the last 10 minutes
kubegraf logs nginx-7c6f9f8c9-4xk2l --since 10m

# Use a different namespace
kubegraf logs nginx-7c6f9f8c9-4xk2l --ns production

# Use a different context
kubegraf logs nginx-7c6f9f8c9-4xk2l --context prod-cluster
```

**Flags:**
- `--container` - Container name (auto-selects first if not specified)
- `-c, --context` - Kubernetes context
- `-f, --follow` - Follow log output
- `-n, --namespace` - Kubernetes namespace
- `--since` - Show logs since duration (e.g., 10m, 1h)
- `--tail` - Number of lines to show from the end

### shell - Interactive Pod Shell

Execute an interactive shell in a Kubernetes pod. Automatically tries `/bin/sh` and falls back to `/bin/bash`.

```bash
# Open a shell in a pod
kubegraf shell nginx-7c6f9f8c9-4xk2l

# Open a shell in a specific container
kubegraf shell nginx-7c6f9f8c9-4xk2l --container nginx

# Use a custom shell command
kubegraf shell nginx-7c6f9f8c9-4xk2l --command "/bin/bash"

# Use a different namespace
kubegraf shell nginx-7c6f9f8c9-4xk2l --ns production

# Use a different context
kubegraf shell nginx-7c6f9f8c9-4xk2l --context prod-cluster
```

**Flags:**
- `--container` - Container name (auto-selects first if not specified)
- `-c, --context` - Kubernetes context
- `--command` - Shell command to execute (default: /bin/sh)
- `-n, --namespace` - Kubernetes namespace

### pf - Port Forward

Port forward to a pod or service. For services, automatically selects a ready pod.

```bash
# Forward local port 8080 to pod port 80
kubegraf pf pod nginx-7c6f9f8c9-4xk2l 80 --local 8080

# Forward to a service (auto-selects a ready pod)
kubegraf pf svc nginx-service 80 --local 8080

# Auto-assign local port (same as remote)
kubegraf pf pod nginx-7c6f9f8c9-4xk2l 80

# Use a different namespace
kubegraf pf pod nginx-7c6f9f8c9-4xk2l 80 --ns production

# Use a different context
kubegraf pf svc nginx-service 80 --context prod-cluster --local 8080
```

**Flags:**
- `-c, --context` - Kubernetes context
- `-l, --local` - Local port (defaults to remote port)
- `-n, --namespace` - Kubernetes namespace

**Supported target types:**
- `pod`, `po` - Forward to a specific pod
- `svc`, `service` - Forward to a service (auto-selects ready pod)

### restart - Restart Workloads

Restart a deployment, statefulset, or daemonset by patching the restart annotation.

```bash
# Restart a deployment
kubegraf restart deploy nginx

# Restart a statefulset
kubegraf restart sts redis

# Restart a daemonset
kubegraf restart ds node-exporter

# Use a different namespace
kubegraf restart deploy nginx --ns production

# Use a different context
kubegraf restart deploy nginx --context prod-cluster
```

**Flags:**
- `-c, --context` - Kubernetes context
- `-n, --namespace` - Kubernetes namespace

**Supported resource types:**
- `deploy`, `deployment`, `deployments`
- `sts`, `statefulset`, `statefulsets`
- `ds`, `daemonset`, `daemonsets`

### apply - Apply YAML Configurations

Apply Kubernetes configurations from YAML files. Supports multi-document YAML and server-side apply.

```bash
# Apply a configuration from a file
kubegraf apply -f deployment.yaml

# Use server-side apply
kubegraf apply -f deployment.yaml --server-side

# Specify a custom field manager
kubegraf apply -f deployment.yaml --field-manager my-tool

# Use a different namespace (overrides namespace in YAML)
kubegraf apply -f deployment.yaml --ns production

# Use a different context
kubegraf apply -f deployment.yaml --context prod-cluster
```

**Flags:**
- `-c, --context` - Kubernetes context
- `--field-manager` - Field manager name for server-side apply (default: "kubegraf")
- `-f, --filename` - YAML file to apply (required)
- `-n, --namespace` - Override namespace
- `--server-side` - Use server-side apply

## Global Configuration

### Kubeconfig

The CLI reads kubeconfig from:
1. `$KUBECONFIG` environment variable
2. `~/.kube/config` (default)

### Context and Namespace

All commands support:
- `--context` / `-c` - Switch to a different Kubernetes context
- `--namespace` / `-n` - Use a different namespace

If not specified:
- Context: Uses current context from kubeconfig
- Namespace: Uses namespace from context, or "default"

## Exit Codes

- `0` - Success
- `1` - General error
- `2` - Bad arguments

## Examples

### Complete Workflow

```bash
# Check pods in production
kubegraf logs nginx-app-7c6f9f8c9-4xk2l --ns production --tail 50

# Debug an issue
kubegraf shell nginx-app-7c6f9f8c9-4xk2l --ns production

# Test locally
kubegraf pf svc nginx-service 80 --local 8080 --ns production

# Apply a fix
kubegraf apply -f nginx-fix.yaml --ns production

# Restart the deployment
kubegraf restart deploy nginx-app --ns production
```

### Multi-Cluster Operations

```bash
# Check prod cluster
kubegraf logs app-pod --context prod-cluster --ns default

# Compare with staging
kubegraf logs app-pod --context staging-cluster --ns default

# Apply to both
kubegraf apply -f config.yaml --context prod-cluster
kubegraf apply -f config.yaml --context staging-cluster
```

## Web Dashboard

The web dashboard remains unaffected and works as before:

```bash
./kubegraf web --port 3003
```

## Architecture

The CLI implementation follows clean architecture principles:

```
cmd/cli/                    # Cobra command definitions
├── apply.go                # Apply command
├── logs.go                 # Logs command
├── portforward.go          # Port forward command
├── restart.go              # Restart command
├── root.go                 # Root command setup
└── shell.go                # Shell command

internal/cli/               # Core Kubernetes operations
└── kubeconfig.go           # Kubeconfig loading and client management
```

All commands are integrated into the main `kubegraf` binary without affecting existing functionality.

## Troubleshooting

### No kubeconfig found
```bash
export KUBECONFIG=~/.kube/config
```

### Permission denied
```bash
chmod +x kubegraf
```

### Context not found
```bash
kubectl config get-contexts
```

### Namespace doesn't exist
```bash
kubectl get namespaces
```

## Contributing

To add new CLI commands:
1. Create a new file in `cmd/cli/`
2. Define the Cobra command with flags
3. Implement the RunE function
4. Register the command in `cmd/cli/root.go`

The CLI and web dashboard are completely independent and can be developed in parallel.
