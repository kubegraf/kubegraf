# TUI Troubleshooting Guide

## Issue: Not Seeing Pods/Deployments in TUI

If you're running `./kubegraf` and not seeing pods, deployments, or other resources properly displayed, follow these troubleshooting steps:

### 1. Verify Kubernetes Connection

Before running the TUI, verify your kubernetes connection works:

```bash
kubectl get pods --all-namespaces
kubectl cluster-info
```

### 2. Check the Binary

Make sure you're using the correct binary:

```bash
# Rebuild to ensure latest code
go build -o kubegraf .

# Check version
./kubegraf --version
```

### 3. Run TUI with Debugging

The TUI needs to run in an interactive terminal. Try running it with different options:

```bash
# Default namespace
./kubegraf

# Specific namespace
./kubegraf production

# Check help
./kubegraf --help
```

### 4. Common Issues

#### Issue: Blank Screen or No Resources

**Possible Causes:**
1. **Kubernetes connection error** - The code silently fails if it can't connect
2. **Wrong namespace** - You might be looking at an empty namespace
3. **Terminal size** - Very small terminal windows may not display correctly

**Solutions:**
- Press `n` to change namespace
- Press `r` to refresh the current view
- Try resizing your terminal window
- Check kubectl works: `kubectl get pods`

#### Issue: "Terminal UI requires an interactive terminal"

This error means you're trying to run the TUI in a non-interactive context (like a background script or automation tool).

**Solution:** Run `./kubegraf` directly in your terminal, not through scripts or automation.

### 5. Keyboard Shortcuts

Once the TUI is running, use these shortcuts:

- `r` or `Ctrl+R` - Refresh current tab
- `n` - Change namespace
- `Tab` or `h/l` or `←/→` - Switch between tabs
- `↑/↓` or `j/k` - Navigate rows
- `1-7` - Jump to specific tab (1=Pods, 2=Deployments, etc.)
- `q` or `Ctrl+C` - Quit
- `?` - Show help

### 6. Debug the Issue

If resources still don't show:

1. **Check if error handling is working:**
   - The current code in `resources.go:29-33` silently fails on errors
   - This needs to be fixed to show error messages

2. **Test with kubectl:**
   ```bash
   # Should show the same pods that TUI would show
   kubectl get pods -n default
   ```

3. **Check cluster connection:**
   - Make sure `~/.kube/config` exists and is valid
   - Try switching contexts if you have multiple clusters

### 7. Known Code Issues

Based on code review, there's a potential issue in `resources.go`:

```go
func (a *App) renderPods() {
    pods, err := a.clientset.CoreV1().Pods(a.namespace).List(a.ctx, metav1.ListOptions{})
    if err != nil {
        return  // ← SILENTLY FAILS - No error shown to user!
    }
    // ...
}
```

This means if there's any error fetching pods (permissions, network, etc.), you won't see any error message - the screen will just be blank.

### 8. Recommended Fix

The TUI should display error messages instead of failing silently. This would help users understand what's wrong.

## Web UI Alternative

If TUI continues to have issues, you can use the Web UI instead:

```bash
./kubegraf web --port 3003
```

Then open http://localhost:3003 in your browser.
