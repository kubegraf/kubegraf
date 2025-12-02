# Cross-Platform Local Cluster Installation

## Overview

KubeGraf now supports **automatic installation and connection** of local Kubernetes clusters on **Windows, Linux, and macOS**. When a user clicks "Install" on any local cluster tool (k3d, kind, minikube), the system will:

1. ✅ **Automatically detect the OS** (Windows/Linux/macOS)
2. ✅ **Install the tool** if not already present
3. ✅ **Create the cluster** end-to-end
4. ✅ **Automatically connect** to the new cluster
5. ✅ **Switch context** so the user is immediately ready to use it

## Supported Platforms

### Windows
- **k3d**: Installed via PowerShell script
- **kind**: Downloaded as `.exe` binary
- **minikube**: Installed via Chocolatey (if available) or direct download

### macOS
- **k3d**: Installed via bash script
- **kind**: Downloaded as Darwin binary (supports both Intel and Apple Silicon)
- **minikube**: Installed via Homebrew

### Linux
- **k3d**: Installed via bash script
- **kind**: Downloaded as Linux binary (supports amd64 and arm64)
- **minikube**: Installed via direct download and `sudo install`

## How It Works

### 1. Installation Detection
```go
if _, err := exec.LookPath("k3d"); err != nil {
    // Tool not found, install it
    // OS-specific installation logic
}
```

### 2. OS-Specific Installation

**Windows:**
- Uses PowerShell for downloads and installations
- Downloads binaries to `%TEMP%` directory
- Uses full paths if tool not in PATH

**macOS/Linux:**
- Uses `curl` and `bash` for installations
- Downloads binaries to `/tmp` directory
- Makes binaries executable with `chmod +x`

### 3. Cluster Creation

Each tool creates a cluster with a standard name: `kubegraf-cluster`

- **k3d**: `k3d cluster create kubegraf-cluster --wait`
- **kind**: `kind create cluster --name kubegraf-cluster`
- **minikube**: `minikube start --profile kubegraf-cluster`

### 4. Automatic Context Switching

After cluster creation, the system:

1. **Updates kubeconfig** using tool-specific commands:
   - k3d: `k3d kubeconfig merge kubegraf-cluster`
   - kind: `kind export kubeconfig --name kubegraf-cluster`
   - minikube: `minikube update-context --profile kubegraf-cluster`

2. **Reloads kubeconfig** to detect the new context

3. **Adds context to context manager** with full Kubernetes client setup

4. **Automatically switches** to the new context using `app.SwitchContext()`

5. **Broadcasts to frontend** via WebSocket so the UI updates immediately

## Context Names

- **k3d**: `k3d-kubegraf-cluster`
- **kind**: `kind-kubegraf-cluster`
- **minikube**: `kubegraf-cluster`

## User Experience

### Before (Manual)
1. User installs tool manually
2. User creates cluster manually
3. User updates kubeconfig manually
4. User switches context manually
5. User refreshes the app

### After (Automatic)
1. User clicks "Install" in Marketplace
2. ✅ Tool installed automatically
3. ✅ Cluster created automatically
4. ✅ Kubeconfig updated automatically
5. ✅ Context switched automatically
6. ✅ App connected immediately

## Error Handling

- **Installation failures**: Logged to console, user sees error message
- **Cluster creation failures**: Logged with full output for debugging
- **Context switching failures**: Falls back gracefully, user can manually switch

## Architecture Notes

### Cross-Platform Detection
```go
osType := runtime.GOOS  // "windows", "darwin", "linux"
arch := runtime.GOARCH  // "amd64", "arm64"
```

### Context Manager Integration
The new context is added to `app.contextManager` with:
- Full Kubernetes clientset
- Metrics client
- REST config
- Connection status

### WebSocket Broadcasting
When context switches, all connected WebSocket clients receive:
```json
{
  "type": "contextSwitch",
  "context": "k3d-kubegraf-cluster",
  "message": "Connected to new k3d cluster"
}
```

## Testing

### Windows
1. Install on Windows 10/11
2. Click "Install" on k3d/kind/minikube
3. Verify tool installation
4. Verify cluster creation
5. Verify automatic connection

### macOS
1. Install on macOS (Intel or Apple Silicon)
2. Click "Install" on k3d/kind/minikube
3. Verify tool installation
4. Verify cluster creation
5. Verify automatic connection

### Linux
1. Install on Ubuntu/Debian/RHEL
2. Click "Install" on k3d/kind/minikube
3. Verify tool installation (may require sudo for minikube)
4. Verify cluster creation
5. Verify automatic connection

## Requirements

### Windows
- PowerShell 5.1+
- Docker Desktop (for k3d/kind) or Hyper-V (for minikube)
- Optional: Chocolatey (for easier minikube installation)

### macOS
- Homebrew (for minikube)
- Docker Desktop (for k3d/kind/minikube)
- curl (usually pre-installed)

### Linux
- Docker (for k3d/kind/minikube)
- curl (usually pre-installed)
- sudo access (for minikube installation to /usr/local/bin)

## Future Enhancements

- [ ] Progress indicators during installation
- [ ] Retry logic for failed installations
- [ ] Support for custom cluster names
- [ ] Support for multiple clusters of the same type
- [ ] Cluster health checks before switching context
- [ ] Automatic cleanup of failed installations

## Troubleshooting

### Tool Installation Fails
- Check internet connection
- Verify Docker is running
- Check system permissions (especially on Linux)

### Cluster Creation Fails
- Check Docker resources (CPU/memory)
- Verify Docker Desktop is running
- Check available disk space

### Context Not Switching
- Check kubeconfig permissions
- Verify context exists: `kubectl config get-contexts`
- Manually switch: `kubectl config use-context <context-name>`

## Summary

✅ **Cross-platform**: Works on Windows, Linux, macOS  
✅ **Automatic installation**: No manual tool installation needed  
✅ **End-to-end**: From click to connected cluster  
✅ **Zero configuration**: Works out of the box  
✅ **Immediate use**: Cluster ready as soon as installation completes

