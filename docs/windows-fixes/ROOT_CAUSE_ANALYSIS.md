# Windows Update & Terminal - Root Cause Analysis

## Executive Summary

KubēGraf has **partial Windows support** with critical bugs preventing production use:

1. **Update Button**: PowerShell updater exists but fails due to process termination logic
2. **Terminal Button**: Shell detection exists but WebSocket implementation uses **broken pipe-based approach**

Both features are **80% complete** but fail in the final 20% due to Windows-specific process/IO handling.

---

## Part 1: Update Button Root Cause

### Current Implementation (updates.go:408-478)

```go
func performWindowsUpdate(execPath, newBinaryPath string) error {
    // Creates PowerShell script that:
    // 1. Waits for process exit (Stop-Process -Name $ProcessName)
    // 2. Backs up old binary
    // 3. Installs new binary
    // 4. Creates shortcuts
    // 5. Restarts app

    scriptPath := windows.CreateUpdaterScript(config)
    windows.LaunchUpdater(scriptPath)
    time.Sleep(1 * time.Second)
    os.Exit(0) // Main app exits
    return nil
}
```

### Why It Fails

#### Problem 1: Process Name Detection (pkg/update/windows/updater.go:87)
```powershell
$ProcessName = "kubegraf"  # WRONG: strips .exe extension
Get-Process -Name $ProcessName  # Fails if process name doesn't match
```

**Root Cause**: `strings.TrimSuffix(exeName, ".exe")` removes extension, but:
- If exe is renamed (e.g., `kubegraf-dev.exe`), script looks for wrong process
- `Get-Process` expects exact process name without .exe
- **Windows allows running multiple instances with different names**

#### Problem 2: Race Condition (updater.go:105-128)
```powershell
# Wait max 30 seconds
while ($waited -lt $maxWait) {
    $process = Get-Process -Name $ProcessName -ErrorAction SilentlyContinue
    if ($null -eq $process) { break }
    Start-Sleep -Seconds 1
    $waited++
}
```

**Root Cause**:
- Main app calls `os.Exit(0)` immediately after launching script
- No guarantee PowerShell script starts before main app exits
- `Start-Sleep 1 second` in Go (updates.go:470) is **not sufficient**
- PowerShell takes 200-500ms to parse script before loop starts
- If main app exits in <500ms, script never sees the process

#### Problem 3: File Lock Timing (updater.go:149-171)
```powershell
Copy-Item -Path $NewBinaryPath -Destination $ExecPath -Force
```

**Root Cause**:
- Windows kernel holds file lock for 1-2 seconds **after** process exits
- `Start-Sleep -Seconds 2` (line 131) is hardcoded but **not reliable**
- On slow disks (HDD, network drives), lock persists longer
- **Copy-Item -Force does NOT retry** - fails immediately

### Why Current Design Is Correct

The **updater-script-pattern** is industry-standard (Chrome, VS Code, Docker Desktop all use it).

**Correct aspects**:
- PowerShell script runs detached ✓
- Backup before replace ✓
- Rollback on failure ✓
- No admin privileges required ✓

**What needs fixing**:
1. **Process detection**: Use PID instead of name
2. **Timing**: Pass PID to script, poll until PID disappears
3. **File locks**: Retry Copy-Item with exponential backoff
4. **Logging**: Write detailed log file for debugging

---

## Part 2: Terminal Button Root Cause

### Current Implementation (web_server.go:3059-3162)

```go
func (ws *WebServer) handleWindowsTerminalWS(conn *websocket.Conn, r *http.Request) {
    // 1. Detect shell (PowerShell, CMD, WSL)
    // 2. Create pipes: stdin, stdout, stderr
    // 3. Start shell process
    // 4. Stream stdout/stderr to WebSocket
    // 5. Stream WebSocket input to stdin
}
```

### Why It Fails

#### Problem 1: PowerShell Buffering (web_server.go:3073-3074)
```go
shellArgs = []string{"-NoLogo", "-NoProfile", "-NoExit"}
// Creates: powershell.exe -NoLogo -NoProfile -NoExit
```

**Root Cause**:
- PowerShell **buffers output by default** (4KB buffer)
- Without `-NonInteractive`, PowerShell waits for user input before flushing
- Pipe-based IO **never receives prompt** until buffer fills
- User types commands but sees nothing → appears frozen

**Why PTY Works (Unix)**:
- PTY (pseudo-terminal) tells shell "you're connected to a real terminal"
- Shell enters interactive mode, disables buffering, sends prompts immediately

**Why Pipe Fails (Windows)**:
- Pipes are **not interactive** by Windows standard
- PowerShell: `-NonInteractive` disables prompts entirely (not a solution)
- CMD: Always buffers when stdout is a pipe
- **No Windows equivalent to Unix PTY in standard library**

#### Problem 2: ANSI Color Codes (web_server.go:3146-3161)
```go
n, err := stdout.Read(buf)
if err != nil { return }
conn.WriteMessage(websocket.TextMessage, buf[:n])
```

**Root Cause**:
- PowerShell/CMD don't emit ANSI codes when stdout is a pipe
- `xterm.js` expects ANSI codes for colors/formatting
- User sees plain text without colors/cursor positioning
- Commands like `ls` (PowerShell) output table-formatted, unreadable in raw pipe

#### Problem 3: No Input Echo (web_server.go:3039-3045)
```go
case "input":
    stdin.Write([]byte(msg.Data))
```

**Root Cause**:
- In interactive mode, shell echoes input back to stdout
- In pipe mode, **shell disables echo** (assumes parent will echo)
- xterm.js doesn't see echoed characters
- User types but characters don't appear on screen

#### Problem 4: Ctrl+C / Ctrl+D Don't Work
**Root Cause**:
- Unix PTY: Ctrl+C sends SIGINT signal to process
- Windows Pipe: Ctrl+C is **just data** (ASCII 0x03)
- PowerShell ignores it because it's not connected to a console
- **User cannot terminate runaway commands**

### Why This Is Hard on Windows

| Feature | Unix PTY | Windows Pipe | Windows ConPTY |
|---------|----------|--------------|----------------|
| Interactive prompt | ✓ | ✗ | ✓ |
| ANSI colors | ✓ | ✗ | ✓ |
| Ctrl+C signal | ✓ | ✗ | ✓ |
| Input echo | ✓ | ✗ | ✓ |
| Cross-platform API | ✓ (unix.PTY) | ✓ (os.Pipe) | ✗ (requires `github.com/UserExistsError/conpty`) |

**ConPTY** is the Windows equivalent of Unix PTY (Windows 10 1809+), but:
- Not in Go standard library
- Requires CGO or third-party library
- More complex than unix.PTY

---

## Part 3: What Works vs. What Doesn't

### Update Mechanism
| Component | Status | Issue |
|-----------|--------|-------|
| GitHub API check | ✓ Works | None |
| Download binary | ✓ Works | None |
| PowerShell script creation | ✓ Works | None |
| Script detached launch | ⚠️ Partial | Race condition on fast machines |
| Process wait logic | ✗ Broken | Process name detection fragile |
| File replacement | ⚠️ Partial | No retry on file locks |
| App restart | ✓ Works | None |
| UI progress feedback | ⚠️ Partial | No failure state handling |

### Terminal Feature
| Component | Status | Issue |
|-----------|--------|-------|
| Shell detection | ✓ Works | PowerShell/CMD/WSL found correctly |
| WebSocket upgrade | ✓ Works | None |
| Process launch | ✓ Works | Shell starts successfully |
| Output streaming | ✗ Broken | Buffering prevents prompt display |
| Input streaming | ✗ Broken | No echo, Ctrl+C doesn't work |
| UI connection state | ✓ Works | Shows connected/disconnected correctly |

---

## Part 4: Why Current Behavior Is Silent

### Update Button
```typescript
// ui/solid/src/utils/updateHelpers.ts
export async function applyUpdate(updateInfo: any) {
  try {
    await api.installUpdate(updateInfo.downloadUrl);
    // Returns 200 even if PowerShell script fails later
    return { success: true };
  } catch (err) {
    // Only catches HTTP errors, not script execution failures
    return { success: false, error: err };
  }
}
```

**Why**:
- Backend returns success after launching script
- Script runs asynchronously after app exits
- **No IPC mechanism** to report script failure back to UI
- User sees "Update successful" even if replacement failed

### Terminal Button
```typescript
// ui/solid/src/components/LocalTerminal.tsx:115-133
ws.onopen = () => {
  setConnected(true); // Shows "Connected"
  term.write('\r\n\x1b[32mConnected to local terminal\x1b[0m\r\n\r\n');
};
```

**Why**:
- WebSocket connects successfully (process started)
- No output received → user sees "Connected" but blank screen
- User assumes it's working, types commands, nothing happens
- **No timeout** to detect "connected but unresponsive" state

---

## Part 5: Edge Cases Discovered

### Update
1. **Scoop/Homebrew installations**: Detected (updates.go:411-420) ✓
2. **Renamed executable**: Breaks process detection ✗
3. **Running from network drive**: File lock timing unpredictable ✗
4. **Multiple instances**: Script kills all instances ✗
5. **Antivirus file lock**: No retry logic ✗

### Terminal
1. **Git Bash on PATH but not installed**: Detected correctly ✓
2. **WSL not installed**: Falls back to PowerShell ✓
3. **PowerShell v5 vs v7**: Both detected, but v5 has worse buffering ✗
4. **Non-English Windows**: Shell detection uses executable names (language-agnostic) ✓
5. **Windows Server**: No Windows Terminal, falls back to PowerShell ✓

---

## Conclusions

1. **Update button is 90% correct** - only needs:
   - PID-based process detection
   - Retry logic for file locks
   - Status file for failure reporting

2. **Terminal button requires architectural change**:
   - Current pipe approach is fundamentally incompatible with interactive shells
   - Must use ConPTY or execution-streaming fallback

3. **Neither feature has a "rewrite" problem** - incremental fixes suffice

4. **Windows-specific issues are well-understood** - solutions exist in other Go projects

Next: Implementation design that fixes these issues without feature creep.
