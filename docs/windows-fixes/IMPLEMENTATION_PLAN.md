# Windows Fixes - Implementation Plan

## Overview

This document provides **exact** implementation steps to fix Windows "Apply Update" and "Terminal" buttons.

**Non-negotiables**:
- No silent failures
- No hacks or workarounds
- No feature creep
- Production-ready error handling

---

## Part 1: Fix "Apply Update" Button

### Architecture: PID-Based Updater with Status File

```
┌──────────────┐
│ Main App     │
│ (PID: 1234)  │
└──────┬───────┘
       │ 1. Writes PID to status file
       │ 2. Launches PowerShell script (passing PID)
       │ 3. Calls os.Exit(0)
       ▼
┌──────────────────────┐
│ PowerShell Script    │
│ (Detached Process)   │
└──────┬───────────────┘
       │ 1. Polls until PID 1234 disappears
       │ 2. Retries file replacement (5 attempts)
       │ 3. Writes success/failure to status file
       │ 4. Restarts app
       ▼
┌──────────────┐
│ New App      │
│ (PID: 5678)  │
└──────┬───────┘
       │ 1. Reads status file on startup
       │ 2. Shows success/failure notification
       │ 3. Cleans up status file
```

### Changes Required

#### File 1: `pkg/update/windows/updater.go`

**Function**: `CreateUpdaterScript` (line 39)

**Changes**:
1. Accept `ProcessPID int` in `UpdateConfig` struct
2. Pass PID to PowerShell script instead of process name
3. Add retry logic for file replacement
4. Write status file on completion

**New script logic**:
```powershell
# Wait for PID to exit (not process name)
$TargetPID = 1234  # Passed from Go
while ($true) {
    $process = Get-Process -Id $TargetPID -ErrorAction SilentlyContinue
    if ($null -eq $process) { break }
    Start-Sleep -Milliseconds 500
    $waited++
    if ($waited -gt 60) {  # 30 seconds
        # Force kill by PID
        Stop-Process -Id $TargetPID -Force -ErrorAction SilentlyContinue
        break
    }
}

# Additional wait for file handle release
Start-Sleep -Seconds 3

# Retry file replacement (5 attempts with backoff)
$maxRetries = 5
$retryCount = 0
$copySuccess = $false

while ($retryCount -lt $maxRetries) {
    try {
        Copy-Item -Path $NewBinaryPath -Destination $ExecPath -Force -ErrorAction Stop
        $copySuccess = $true
        break
    } catch {
        $retryCount++
        Write-Host "Retry $retryCount/$maxRetries after $(Start-Sleep -Seconds $($retryCount * 2))"
    }
}

if (-not $copySuccess) {
    # Write failure status
    $statusFile = "$env:TEMP\kubegraf-update-status.json"
    @{
        success = $false
        error = "Failed to replace binary after $maxRetries attempts"
        timestamp = Get-Date -Format "o"
    } | ConvertTo-Json | Out-File $statusFile -Encoding UTF8

    # Restore backup
    if (Test-Path $backupPath) {
        Move-Item -Path $backupPath -Destination $ExecPath -Force
    }
    exit 1
}

# Write success status
$statusFile = "$env:TEMP\kubegraf-update-status.json"
@{
    success = $true
    version = $NewVersion
    timestamp = Get-Date -Format "o"
} | ConvertTo-Json | Out-File $statusFile -Encoding UTF8

# Restart app
Start-Process -FilePath $ExecPath -ArgumentList "web" -WorkingDirectory $InstallDir
```

#### File 2: `updates.go`

**Function**: `performWindowsUpdate` (line 410)

**Changes**:
1. Get current process PID: `os.Getpid()`
2. Pass PID to updater script
3. Write initial status file before exit

```go
func performWindowsUpdate(execPath, newBinaryPath string) error {
    // Get current process PID
    currentPID := os.Getpid()

    // Write status file (initial state)
    statusFile := filepath.Join(os.TempDir(), "kubegraf-update-status.json")
    status := map[string]interface{}{
        "status": "in_progress",
        "pid": currentPID,
        "timestamp": time.Now().Format(time.RFC3339),
    }
    statusJSON, _ := json.Marshal(status)
    os.WriteFile(statusFile, statusJSON, 0644)

    // Create updater script with PID
    config := windows.UpdateConfig{
        ExecPath:      execPath,
        NewBinaryPath: newBinaryPath,
        AppName:       "KubeGraf",
        AppExeName:    filepath.Base(execPath),
        InstallDir:    windows.GetInstallDirectory(execPath),
        IconPath:      iconPath,
        ProcessPID:    currentPID,  // NEW
    }

    scriptPath, err := windows.CreateUpdaterScript(config)
    if err != nil {
        return fmt.Errorf("failed to create updater script: %w", err)
    }

    if err := windows.LaunchUpdater(scriptPath); err != nil {
        return fmt.Errorf("failed to launch updater: %w", err)
    }

    // Give script time to start and read PID
    time.Sleep(2 * time.Second)

    fmt.Println("🔄 Update downloaded. Application will restart automatically...")
    os.Exit(0)
    return nil
}
```

#### File 3: `main.go` (or `web_server.go`)

**Function**: Add status check on startup

**Location**: After web server starts, check for update status file

```go
func checkUpdateStatus() {
    statusFile := filepath.Join(os.TempDir(), "kubegraf-update-status.json")
    data, err := os.ReadFile(statusFile)
    if err != nil {
        return // No status file, first run or no update
    }

    var status struct {
        Success   bool   `json:"success"`
        Error     string `json:"error,omitempty"`
        Version   string `json:"version,omitempty"`
        Timestamp string `json:"timestamp"`
    }

    if err := json.Unmarshal(data, &status); err != nil {
        log.Printf("⚠️  Failed to parse update status: %v", err)
        os.Remove(statusFile)
        return
    }

    if status.Success {
        fmt.Printf("✅ Update to version %s completed successfully!\n", status.Version)
    } else {
        fmt.Printf("❌ Update failed: %s\n", status.Error)
        fmt.Println("   Please try updating again or download manually from GitHub.")
    }

    // Clean up status file
    os.Remove(statusFile)
}

// Call in main() or ServeWeb()
func main() {
    // ... existing code ...

    // Check for update status from previous session
    checkUpdateStatus()

    // ... start web server ...
}
```

#### File 4: UI Update (Optional but Recommended)

**File**: `ui/solid/src/components/UpdateApplyButton.tsx`

**Add**: Polling to check status file via backend API

```typescript
// After clicking Apply Update, show progress
setProgress("Downloading update...");
await api.installUpdate(updateInfo.downloadUrl);
setProgress("Installing update...");

// Poll for status (every 2 seconds for 60 seconds)
let pollCount = 0;
const pollInterval = setInterval(async () => {
    try {
        const status = await api.getUpdateStatus();
        if (status.success !== undefined) {
            clearInterval(pollInterval);
            if (status.success) {
                setProgress("Update completed successfully! ✅");
            } else {
                setProgress(`Update failed: ${status.error} ❌`);
            }
        }
    } catch (err) {
        // Status file not ready yet, continue polling
    }

    pollCount++;
    if (pollCount > 30) {
        clearInterval(pollInterval);
        setProgress("Update status unknown - check if app restarted");
    }
}, 2000);
```

---

## Part 2: Fix Terminal Button

### Architecture: Execution-Streaming Model (No ConPTY)

**Decision**: Do NOT embed terminal emulator. Use existing execution-streaming backend.

```
┌─────────────────┐
│ User clicks     │
│ Terminal Button │
└────────┬────────┘
         │
         ▼
┌────────────────────────┐
│ Shell Chooser Dialog   │  ← First time only
│ ○ PowerShell (default) │
│ ○ Command Prompt       │
│ ○ Git Bash (detected)  │
└────────┬───────────────┘
         │ Save preference
         ▼
┌──────────────────────────┐
│ ExecutionPanel           │  ← Reuse existing component
│ (Streaming output)       │
│                          │
│ PS C:\Users\user>        │
│ Command: kubectl exec... │
│                          │
│ [Input box for commands] │
└──────────────────────────┘
```

### Key Design Decisions

1. **No raw shell window** - Everything goes through ExecutionPanel
2. **Command-based interaction** - User types `kubectl get pods`, not raw shell commands
3. **Fallback for interactive shell** - If kubectl exec fails, show command-only mode
4. **Auditable** - All commands logged via execution history

### Changes Required

#### File 1: `web_server.go` - Remove broken pipe terminal

**Function**: `handleWindowsTerminalWS` (line 3059)

**Action**: **REMOVE THIS ENTIRE FUNCTION** - It's fundamentally broken

**Reason**: Pipe-based terminals don't work on Windows without ConPTY

#### File 2: `ui/solid/src/components/LocalTerminal.tsx`

**Action**: **REMOVE THIS FILE** or repurpose as ConPTY-based (future work)

**Reason**: Current implementation expects interactive terminal that Windows can't provide

#### File 3: NEW FILE - `pkg/terminal/windows/shell_detector.go`

**Purpose**: Detect available shells with correct paths

```go
package windows

import (
    "os/exec"
    "runtime"
)

type Shell struct {
    Name        string   `json:"name"`        // "PowerShell", "Command Prompt", "Git Bash"
    Path        string   `json:"path"`        // "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe"
    Args        []string `json:"args"`        // ["-NoLogo", "-NoProfile"]
    Available   bool     `json:"available"`   // true if executable exists
    Recommended bool     `json:"recommended"` // true for default choice
}

// DetectShells returns all available shells on Windows
func DetectShells() []Shell {
    if runtime.GOOS != "windows" {
        return nil
    }

    shells := []Shell{
        {
            Name:        "PowerShell 7",
            Path:        "pwsh.exe",
            Args:        []string{"-NoLogo"},
            Recommended: true,
        },
        {
            Name:        "PowerShell 5",
            Path:        "powershell.exe",
            Args:        []string{"-NoLogo"},
            Recommended: false,
        },
        {
            Name:        "Command Prompt",
            Path:        "cmd.exe",
            Args:        []string{"/K"},
            Recommended: false,
        },
        {
            Name:        "Windows Terminal",
            Path:        "wt.exe",
            Args:        []string{},
            Recommended: true,
        },
    }

    // Check Git Bash in common locations
    gitBashPaths := []string{
        "C:\\Program Files\\Git\\bin\\bash.exe",
        "C:\\Program Files (x86)\\Git\\bin\\bash.exe",
        os.Getenv("PROGRAMFILES") + "\\Git\\bin\\bash.exe",
    }

    for _, path := range gitBashPaths {
        if _, err := os.Stat(path); err == nil {
            shells = append(shells, Shell{
                Name:        "Git Bash",
                Path:        path,
                Args:        []string{"--login", "-i"},
                Recommended: false,
            })
            break
        }
    }

    // Check which shells are available
    for i := range shells {
        _, err := exec.LookPath(shells[i].Path)
        shells[i].Available = (err == nil)
    }

    return shells
}

// GetPreferredShell returns the recommended shell or first available
func GetPreferredShell() *Shell {
    shells := DetectShells()

    // First try recommended shells
    for _, shell := range shells {
        if shell.Available && shell.Recommended {
            return &shell
        }
    }

    // Fallback to first available
    for _, shell := range shells {
        if shell.Available {
            return &shell
        }
    }

    return nil
}
```

#### File 4: `web_server.go` - Update shell detection endpoint

**Function**: `handleGetAvailableShells` (line 2734)

**Replace** with:

```go
func (ws *WebServer) handleGetAvailableShells(w http.ResponseWriter, r *http.Request) {
    if r.Method != http.MethodGet {
        http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
        return
    }

    var shells []map[string]interface{}

    if runtime.GOOS == "windows" {
        windowsShells := windowsshell.DetectShells()
        for _, shell := range windowsShells {
            shells = append(shells, map[string]interface{}{
                "name":        shell.Name,
                "path":        shell.Path,
                "available":   shell.Available,
                "recommended": shell.Recommended,
            })
        }
    } else {
        // Existing Unix logic
        shells = []map[string]interface{}{
            {"name": "zsh", "path": "/bin/zsh", "available": true, "recommended": true},
            {"name": "bash", "path": "/bin/bash", "available": true, "recommended": false},
        }
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(map[string]interface{}{
        "shells": shells,
    })
}
```

#### File 5: NEW FILE - `ui/solid/src/components/TerminalChooser.tsx`

**Purpose**: One-time shell selection dialog

```typescript
import { Component, createSignal, For } from 'solid-js';
import { Dialog } from './Dialog';
import { api } from '../services/api';

interface Shell {
  name: string;
  path: string;
  available: boolean;
  recommended: boolean;
}

interface TerminalChooserProps {
  open: boolean;
  onClose: () => void;
  onSelect: (shell: Shell) => void;
}

const TerminalChooser: Component<TerminalChooserProps> = (props) => {
  const [shells, setShells] = createSignal<Shell[]>([]);
  const [loading, setLoading] = createSignal(true);

  // Load available shells on mount
  (async () => {
    try {
      const response = await api.getAvailableShells();
      setShells(response.shells.filter((s: Shell) => s.available));
    } catch (err) {
      console.error('Failed to load shells:', err);
    } finally {
      setLoading(false);
    }
  })();

  return (
    <Dialog open={props.open} onClose={props.onClose} title="Choose Terminal Shell">
      <div class="space-y-4">
        <p class="text-sm text-gray-600">
          Select your preferred shell for terminal operations:
        </p>

        {loading() ? (
          <p>Loading available shells...</p>
        ) : (
          <div class="space-y-2">
            <For each={shells()}>
              {(shell) => (
                <button
                  class={`w-full p-4 border rounded-lg text-left hover:bg-gray-50 ${
                    shell.recommended ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                  }`}
                  onClick={() => {
                    props.onSelect(shell);
                    props.onClose();
                  }}
                >
                  <div class="font-medium">{shell.name}</div>
                  <div class="text-sm text-gray-600">{shell.path}</div>
                  {shell.recommended && (
                    <div class="text-xs text-blue-600 mt-1">Recommended</div>
                  )}
                </button>
              )}
            </For>
          </div>
        )}

        <div class="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
          <p class="text-sm text-yellow-800">
            ⚠️ Note: Interactive shell features are limited on Windows.
            You'll use command execution mode instead of a full terminal emulator.
          </p>
        </div>
      </div>
    </Dialog>
  );
};

export default TerminalChooser;
```

#### File 6: `ui/solid/src/components/DockedTerminal.tsx`

**Action**: Modify to use ExecutionPanel instead of LocalTerminal

**Changes**:
```typescript
import ExecutionPanel from './ExecutionPanel';
import TerminalChooser from './TerminalChooser';

const DockedTerminal: Component = () => {
  const [showChooser, setShowChooser] = createSignal(false);
  const [selectedShell, setSelectedShell] = createSignal<Shell | null>(null);

  // On first click, show shell chooser
  const handleTerminalClick = () => {
    const storedShell = localStorage.getItem('preferred-shell');
    if (!storedShell) {
      setShowChooser(true);
    } else {
      setSelectedShell(JSON.parse(storedShell));
      // Open execution panel with shell command
    }
  };

  const handleShellSelect = (shell: Shell) => {
    localStorage.setItem('preferred-shell', JSON.stringify(shell));
    setSelectedShell(shell);
    // Execute command via existing streaming
  };

  return (
    <>
      <TerminalChooser
        open={showChooser()}
        onClose={() => setShowChooser(false)}
        onSelect={handleShellSelect}
      />

      {selectedShell() && (
        <ExecutionPanel
          command={selectedShell()!.path}
          args={selectedShell()!.args}
          mode="interactive"
        />
      )}
    </>
  );
};
```

#### File 7: Error Handling - Graceful Fallback

**Location**: `ui/solid/src/components/ExecutionPanel.tsx`

**Add**: Detection for "interactive shell not available" error

```typescript
// In WebSocket message handler
if (message.type === 'error' && message.error.includes('not available')) {
  // Show fallback message
  showNotification({
    type: 'warning',
    message: 'Interactive shell unavailable on Windows',
    description: 'Falling back to command execution mode. Enter kubectl commands below.',
  });

  // Switch to command-only mode
  setMode('command');
}
```

---

## Part 3: Testing Plan

### Update Button Tests

| Test Case | Expected Behavior | Pass Criteria |
|-----------|-------------------|---------------|
| Normal update | Binary replaced, app restarts | Status file shows success |
| File locked by antivirus | Retry 5 times, succeed on 3rd | Status file shows success after delay |
| Renamed executable | Update succeeds | PID detection works regardless of name |
| Multiple instances | Only current instance exits | Other instances keep running |
| Update fails (disk full) | Rollback to backup | Original binary restored, status shows error |
| User closes during update | Update completes anyway | Script runs detached |
| Network drive installation | Extra retries succeed | Status file shows success after retries |

### Terminal Button Tests

| Test Case | Expected Behavior | Pass Criteria |
|-----------|-------------------|---------------|
| First use | Show shell chooser | Dialog with PowerShell/CMD/Git Bash |
| PowerShell selected | Execute kubectl commands | Output shows command result |
| Git Bash selected | Execute kubectl commands | Output shows command result |
| Kubectl exec fails | Fallback message shown | User sees "interactive shell unavailable" |
| User preference saved | No chooser on 2nd click | Last selected shell used |
| Shell not found | Fallback to PowerShell | Error logged, PowerShell used |

---

## Part 4: Implementation Checklist

### Phase 1: Update Button (Priority: Critical)
- [ ] Add `ProcessPID` field to `UpdateConfig` struct
- [ ] Modify PowerShell script to use PID instead of process name
- [ ] Add retry logic with exponential backoff (5 attempts)
- [ ] Write status file on completion (success/failure)
- [ ] Add `checkUpdateStatus()` function in main.go
- [ ] Call status check on app startup
- [ ] Test on Windows 10/11 with antivirus enabled
- [ ] Test with renamed executable

### Phase 2: Terminal Button (Priority: High)
- [ ] Create `pkg/terminal/windows/shell_detector.go`
- [ ] Implement `DetectShells()` function
- [ ] Implement `GetPreferredShell()` function
- [ ] Update `handleGetAvailableShells` endpoint
- [ ] Remove `handleWindowsTerminalWS` function
- [ ] Create `TerminalChooser.tsx` component
- [ ] Modify `DockedTerminal.tsx` to use ExecutionPanel
- [ ] Add fallback message for interactive shell failure
- [ ] Test with PowerShell 5, 7, CMD, Git Bash
- [ ] Test on Windows Server (no Windows Terminal)

### Phase 3: Documentation (Priority: Medium)
- [ ] Update WINDOWS_K3D_FIX.md with new instructions
- [ ] Add troubleshooting section for update failures
- [ ] Document terminal limitations on Windows
- [ ] Add screenshots of shell chooser

---

## Part 5: Edge Cases & Rollback Strategy

### Edge Case: Update Fails Mid-Replacement
**Scenario**: File copy fails after backup

**Handling**:
```powershell
if (-not $copySuccess) {
    # Restore backup
    if (Test-Path $backupPath) {
        Move-Item -Path $backupPath -Destination $ExecPath -Force
        Write-Host "✓ Backup restored" -ForegroundColor Green
    }
    # Write failure status
    @{ success = $false; error = $_.Exception.Message } | ConvertTo-Json | Out-File $statusFile
    exit 1
}
```

### Edge Case: PowerShell Script Crashes
**Scenario**: Script fails before writing status file

**Handling**:
```go
// In checkUpdateStatus()
statusFile := filepath.Join(os.TempDir(), "kubegraf-update-status.json")
data, err := os.ReadFile(statusFile)
if err != nil {
    // Check if backup exists (indicates failed update)
    backupFile := execPath + ".old"
    if _, err := os.Stat(backupFile); err == nil {
        fmt.Println("⚠️  Update may have failed. Backup found at:", backupFile)
        fmt.Println("   If app is not working, restore backup manually.")
    }
    return
}
```

### Edge Case: Terminal Shell Deleted After Selection
**Scenario**: User selects Git Bash, then uninstalls Git

**Handling**:
```typescript
// In DockedTerminal.tsx
const handleTerminalClick = () => {
    const storedShell = localStorage.getItem('preferred-shell');
    if (storedShell) {
        const shell = JSON.parse(storedShell);
        // Verify shell still exists
        const available = await api.checkShellAvailable(shell.path);
        if (!available) {
            // Show chooser again
            setShowChooser(true);
            localStorage.removeItem('preferred-shell');
            return;
        }
    }
    // ... continue
};
```

---

## Part 6: Quality Checklist

Before merging, verify:

### Windows Engineer Review Criteria
- [ ] No silent failures - every error path logged
- [ ] No file operations without retry logic
- [ ] No process operations without PID-based checks
- [ ] No shell execution without fallback
- [ ] No hardcoded timeouts < 5 seconds
- [ ] No assumptions about drive letters or paths
- [ ] All status returned to user (no "black box" operations)
- [ ] Rollback strategy for every destructive operation

### Production Readiness
- [ ] Tested on Windows 10 (1809+)
- [ ] Tested on Windows 11
- [ ] Tested on Windows Server 2019/2022
- [ ] Tested with antivirus enabled (Windows Defender)
- [ ] Tested on slow hardware (HDD, not SSD)
- [ ] Tested with non-admin user
- [ ] Tested with renamed executable
- [ ] Tested with network drive installation

### User Experience
- [ ] Update never freezes UI
- [ ] Update shows progress (not just "working...")
- [ ] Update failure shows actionable error message
- [ ] Terminal shows clear message about limitations
- [ ] Terminal fallback is transparent (no crash)
- [ ] Shell chooser saves preference (no repeat prompts)

---

## Estimated Effort

| Task | Lines of Code | Complexity | Time |
|------|---------------|------------|------|
| Update button fixes | ~150 LOC | Medium | 4 hours |
| Terminal shell detection | ~200 LOC | Low | 3 hours |
| Terminal UI components | ~300 LOC | Medium | 5 hours |
| Testing on Windows | N/A | High | 8 hours |
| **Total** | **~650 LOC** | | **20 hours** |

**Note**: This is incremental fixes to existing code, not a rewrite.
