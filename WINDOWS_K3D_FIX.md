# K3d Installation Fix for Windows

## Problem

On Windows, when clicking "Install" for K3d Local Kubernetes:
- ✅ Progress bar shows
- ❌ Cluster is NOT created
- ❌ No error message displayed

## Root Cause

The issue occurs in `apps.go:509-510` where K3d is installed via PowerShell:

```go
installCmd := exec.CommandContext(ctx, "powershell", "-Command",
    "Invoke-WebRequest -Uri https://raw.githubusercontent.com/k3d-io/k3d/main/install.ps1 -UseBasicParsing | Invoke-Expression")
```

### Windows-Specific Issues:

1. **Execution Policy**: PowerShell may block script execution
2. **PATH not updated**: K3d binary installed but not in PATH for current process
3. **Silent failures**: Installation errors not properly captured
4. **Binary location**: K3d installs to `C:\Program Files\k3d\` but process doesn't see it

## Solution

###  Fix 1: Enhanced PowerShell Installation with Execution Policy

Modify `apps.go` line 509:

```go
// Windows: Install k3d with proper execution policy
installScript := `
Set-ExecutionPolicy Bypass -Scope Process -Force
[System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
Invoke-WebRequest -Uri https://raw.githubusercontent.com/k3d-io/k3d/main/install.ps1 -UseBasicParsing | Invoke-Expression
`
installCmd := exec.CommandContext(ctx, "powershell", "-ExecutionPolicy", "Bypass", "-Command", installScript)
```

### Fix 2: Add k3d to PATH after installation

After installation succeeds (line 523), add:

```go
// On Windows, k3d is typically installed to C:\Program Files\k3d
// Add it to PATH for current process
if osType == "windows" {
    k3dPath := `C:\Program Files\k3d`
    currentPath := os.Getenv("PATH")
    os.Setenv("PATH", k3dPath+";"+currentPath)
    fmt.Printf("✅ [K3D Install] Added k3d to PATH: %s\n", k3dPath)
}
```

### Fix 3: Better Error Detection

Add output capture before line 516:

```go
var stdout, stderr bytes.Buffer
installCmd.Stdout = &stdout
installCmd.Stderr = &stderr

if err := installCmd.Run(); err != nil {
    errMsg := fmt.Sprintf("Failed to install k3d on Windows: %v\nStdout: %s\nStderr: %s\nNote: You may need to run KubeGraf as Administrator",
        err, stdout.String(), stderr.String())
    fmt.Printf("❌ [K3D Install] %s\n", errMsg)
    // ... rest of error handling
```

### Fix 4: Alternative - Use Scoop/Chocolatey

For more reliable Windows installation:

```go
// Try Scoop first (if available)
if _, err := exec.LookPath("scoop"); err == nil {
    installCmd = exec.CommandContext(ctx, "scoop", "install", "k3d")
} else if _, err := exec.LookPath("choco"); err == nil {
    // Try Chocolatey
    installCmd = exec.CommandContext(ctx, "choco", "install", "k3d", "-y")
} else {
    // Fallback to PowerShell script
    installCmd = exec.CommandContext(ctx, "powershell", "-ExecutionPolicy", "Bypass", "-Command", installScript)
}
```

## Complete Fixed Code Section

Replace `apps.go` lines 505-526 with:

```go
if osType == "windows" {
    fmt.Printf("🔧 [K3D Install] Installing k3d on Windows\n")

    // Check if scoop or choco are available (more reliable than PowerShell script)
    var installCmd *exec.Cmd
    if _, err := exec.LookPath("scoop"); err == nil {
        fmt.Printf("📦 [K3D Install] Using Scoop to install k3d\n")
        installCmd = exec.CommandContext(ctx, "scoop", "install", "k3d")
    } else if _, err := exec.LookPath("choco"); err == nil {
        fmt.Printf("📦 [K3D Install] Using Chocolatey to install k3d\n")
        installCmd = exec.CommandContext(ctx, "choco", "install", "k3d", "-y")
    } else {
        fmt.Printf("📦 [K3D Install] Using PowerShell script to install k3d\n")
        installScript := `
Set-ExecutionPolicy Bypass -Scope Process -Force
[System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
try {
    Invoke-WebRequest -Uri https://raw.githubusercontent.com/k3d-io/k3d/main/install.ps1 -UseBasicParsing | Invoke-Expression
    Write-Host "K3d installation completed"
    exit 0
} catch {
    Write-Error "Failed to install k3d: $_"
    exit 1
}
`
        installCmd = exec.CommandContext(ctx, "powershell", "-ExecutionPolicy", "Bypass", "-NoProfile", "-Command", installScript)
    }

    var stdout, stderr bytes.Buffer
    installCmd.Stdout = &stdout
    installCmd.Stderr = &stderr

    if err := installCmd.Run(); err != nil {
        errMsg := fmt.Sprintf("Failed to install k3d on Windows: %v\n\nStdout:\n%s\n\nStderr:\n%s\n\nTroubleshooting:\n"+
            "1. Run KubeGraf as Administrator\n"+
            "2. Install k3d manually: https://k3d.io/stable/#installation\n"+
            "3. Or install via Scoop: scoop install k3d\n"+
            "4. Or install via Chocolatey: choco install k3d",
            err, stdout.String(), stderr.String())
        fmt.Printf("❌ [K3D Install] %s\n", errMsg)
        if installationID > 0 {
            ws.db.UpdateAppInstallation(installationID, "failed", 0, errMsg)
        }
        return
    }

    fmt.Printf("✅ [K3D Install] k3d installed successfully on Windows\n")
    fmt.Printf("📝 [K3D Install] Install output:\n%s\n", stdout.String())

    // Add k3d to PATH for this process
    k3dPath := `C:\Program Files\k3d`
    currentPath := os.Getenv("PATH")
    os.Setenv("PATH", k3dPath+";"+currentPath)
    fmt.Printf("✅ [K3D Install] Added k3d to PATH: %s\n", k3dPath)

    // Verify k3d is now accessible
    if _, err := exec.LookPath("k3d"); err != nil {
        errMsg := fmt.Sprintf("K3d was installed but not found in PATH. Please:\n"+
            "1. Close and reopen KubeGraf\n"+
            "2. Or add manually: %s\n"+
            "3. Or restart your computer", k3dPath)
        fmt.Printf("⚠️  [K3D Install] %s\n", errMsg)
        if installationID > 0 {
            ws.db.UpdateAppInstallation(installationID, "partial", 50, errMsg)
        }
        return
    }
}
```

## Testing on Windows

1. **Test as regular user**:
   ```powershell
   .\kubegraf.exe web --port 3003
   ```

2. **Test as Administrator** (if above fails):
   ```powershell
   Start-Process powershell -Verb RunAs -ArgumentList "-NoExit", "-Command", "cd '$PWD'; .\kubegraf.exe web --port 3003"
   ```

3. **Check k3d installation manually**:
   ```powershell
   k3d version
   docker info
   ```

## User Workaround (Until Fixed)

Users can install k3d manually before using KubeGraf:

### Option 1: Scoop (Recommended)
```powershell
# Install Scoop if not already installed
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
irm get.scoop.sh | iex

# Install k3d
scoop install k3d
```

### Option 2: Chocolatey
```powershell
choco install k3d -y
```

### Option 3: Manual Download
1. Download from: https://github.com/k3d-io/k3d/releases
2. Extract `k3d.exe`
3. Move to `C:\Program Files\k3d\k3d.exe`
4. Add to PATH or place in existing PATH directory

## Additional Debugging

Add debug logging to see what's happening:

```go
// Before cluster creation (line 562), add:
fmt.Printf("🔍 [K3D Install] Checking k3d availability\n")
versionCmd := exec.CommandContext(ctx, "k3d", "version")
if output, err := versionCmd.CombinedOutput(); err != nil {
    fmt.Printf("❌ [K3D Install] K3d not accessible: %v\nOutput: %s\n", err, string(output))
} else {
    fmt.Printf("✅ [K3D Install] K3d version: %s\n", string(output))
}
```

## Priority

**HIGH** - This affects all Windows users trying to use local K3d clusters.

## Related Files

- `apps.go` - lines 505-526 (installation)
- `apps.go` - lines 562-578 (cluster creation)
