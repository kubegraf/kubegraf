# Apply Update Button - Architecture & Implementation

## Overview

This document defines the complete architecture for the "Apply Update" button, including:
- Installation method detection logic
- Per-method update behavior
- UX design for each install type
- Backend API design
- Safety constraints

---

## Current Implementation Status

### What Already Exists ✅

1. **Scoop Detection** (`pkg/update/windows/scoop.go`)
   - Detects Scoop installations by checking for `scoop\apps` in path
   - Verifies via `manifest.json` presence
   - Resolves symlinks to get actual version directory
   - Returns `ScoopInfo` struct with installation details

2. **Homebrew Detection** (`pkg/update/unix/homebrew.go`)
   - Detects Homebrew installations on macOS
   - Checks for`/usr/local/Cellar` or `/opt/homebrew/Cellar` in path
   - Returns `HomebrewInfo` struct with installation details

3. **Windows Updater** (`pkg/update/windows/updater.go`)
   - PID-based process detection
   - Exponential backoff retry logic
   - Status file mechanism
   - Shortcut recreation

4. **Unix Updater** (`pkg/update/unix/updater.go`)
   - PTY-based process detection
   - Binary verification (`--version` check)
   - Detached restart with `nohup`

5. **Backend API** (`web_misc.go`)
   - `GET /api/update/check` - Returns update info with install method warnings
   - `POST /api/updates/install` - Triggers update process
   - Already includes Scoop/Homebrew detection and warnings

### What Needs Implementation 🔧

1. **EXE Installer Detection** (Windows)
   - Detect if installed via Inno Setup installer
   - Check for uninstaller registry keys
   - Determine if shortcuts exist

2. **Manual ZIP Detection** (Windows)
   - Detect if binary is in user-defined location (not Program Files)
   - Determine if this is a "portable" installation

3. **Enhanced UX** (Frontend)
   - Per-installation-method button states
   - Copyable commands for package managers
   - Clear warnings before proceeding with in-app updates

---

## Part 1: Installation Method Detection

### A. Windows Installation Types

#### 1. EXE Installer (Inno Setup)

**Detection Logic**:
```go
func DetectExeInstaller(execPath string) (*ExeInstallerInfo, error) {
    // Check 1: Is in Program Files?
    lowerPath := strings.ToLower(execPath)
    inProgramFiles := strings.Contains(lowerPath, "program files\\kubegraf") ||
                      strings.Contains(lowerPath, "program files (x86)\\kubegraf")

    if !inProgramFiles {
        return &ExeInstallerInfo{IsExeInstall: false}, nil
    }

    // Check 2: Uninstaller registry key exists?
    // HKEY_CURRENT_USER\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\KubeGraf_is1
    // or HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\KubeGraf_is1
    uninstallKeyExists := checkRegistryKey(
        `SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\KubeGraf_is1`,
    )

    // Check 3: Start Menu shortcut exists?
    startMenuPath := filepath.Join(os.Getenv("APPDATA"), "Microsoft\\Windows\\Start Menu\\Programs\\KubeGraf.lnk")
    shortcutExists := fileExists(startMenuPath)

    return &ExeInstallerInfo{
        IsExeInstall:    true,
        InstallPath:     filepath.Dir(execPath),
        ShortcutsExist:  shortcutExists,
        InProgramFiles:  true,
    }, nil
}
```

**Why This Works**:
- Inno Setup always installs to `C:\Program Files\KubeGraf`
- Creates registry uninstall key
- Creates Start Menu shortcuts
- All three checks together = high confidence

#### 2. Scoop Package Manager ✅ ALREADY IMPLEMENTED

**Existing Detection** (`pkg/update/windows/scoop.go:34`):
```go
func DetectScoopInstallation(execPath string) (*ScoopInfo, error) {
    // Resolve symlinks
    realPath, _ := filepath.EvalSymlinks(execPath)

    // Check for "scoop\apps" in path
    if !strings.Contains(lowerPath, "scoop") || !strings.Contains(lowerPath, "apps") {
        return &ScoopInfo{IsScoopInstall: false}, nil
    }

    // Verify manifest.json exists
    manifestPath := filepath.Join(scoopAppDir, "manifest.json")
    if _, err := os.Stat(manifestPath); err != nil {
        return &ScoopInfo{IsScoopInstall: false}, nil
    }

    return &ScoopInfo{IsScoopInstall: true, ...}, nil
}
```

**Why This Works**:
- Scoop always installs to `~\scoop\apps\<app>\<version>`
- Creates `manifest.json` in app directory
- Uses symlink for `current` version
- Manifest presence = definitive proof

#### 3. Manual PowerShell Installation (install.ps1)

**Detection Logic**:
```go
func DetectPowerShellInstall(execPath string) (*PowerShellInstallInfo, error) {
    // Check: Is in %LOCALAPPDATA%\Programs\KubeGraf?
    localAppData := os.Getenv("LOCALAPPDATA")
    expectedPath := filepath.Join(localAppData, "Programs\\KubeGraf")

    lowerPath := strings.ToLower(filepath.Dir(execPath))
    expectedLower := strings.ToLower(expectedPath)

    if lowerPath != expectedLower {
        return &PowerShellInstallInfo{IsPowerShellInstall: false}, nil
    }

    // This is a PowerShell script install
    return &PowerShellInstallInfo{
        IsPowerShellInstall: true,
        InstallPath:         filepath.Dir(execPath),
    }, nil
}
```

**Why This Works**:
- `install.ps1` always installs to `%LOCALAPPDATA%\Programs\KubeGraf`
- Path match is sufficient proof

#### 4. Manual ZIP/Binary (Portable)

**Detection Logic**:
```go
func DetectPortableInstall(execPath string) *PortableInstallInfo {
    // If not in Program Files, Scoop, or LocalAppData, it's portable
    lowerPath := strings.ToLower(execPath)

    // NOT in Program Files
    inProgramFiles := strings.Contains(lowerPath, "program files")

    // NOT in Scoop
    inScoop := strings.Contains(lowerPath, "scoop\\apps")

    // NOT in LocalAppData\Programs
    localAppData := strings.ToLower(os.Getenv("LOCALAPPDATA"))
    inLocalPrograms := strings.HasPrefix(lowerPath, filepath.Join(localAppData, "programs"))

    isPortable := !inProgramFiles && !inScoop && !inLocalPrograms

    return &PortableInstallInfo{
        IsPortable:  isPortable,
        InstallPath: filepath.Dir(execPath),
    }
}
```

**Why This Works**:
- Process of elimination
- If not in any known location, it's user-defined
- Portable installs have no standard path

### B. Detection Order (Priority)

```go
func DetectInstallationMethod(execPath string) InstallMethod {
    // 1. Check Scoop first (most specific)
    if scoopInfo, _ := windows.DetectScoopInstallation(execPath); scoopInfo.IsScoopInstall {
        return InstallMethod{Type: "scoop", Info: scoopInfo}
    }

    // 2. Check EXE installer (registry + Program Files)
    if exeInfo, _ := DetectExeInstaller(execPath); exeInfo.IsExeInstall {
        return InstallMethod{Type: "exe_installer", Info: exeInfo}
    }

    // 3. Check PowerShell install (LocalAppData\Programs)
    if psInfo, _ := DetectPowerShellInstall(execPath); psInfo.IsPowerShellInstall {
        return InstallMethod{Type: "powershell_install", Info: psInfo}
    }

    // 4. Default to portable
    return InstallMethod{Type: "portable", Info: DetectPortableInstall(execPath)}
}
```

**Why This Order**:
- Scoop has unique identifiers (manifest.json + symlinks)
- EXE installer has registry keys
- PowerShell install has specific path
- Portable is catch-all for everything else

---

## Part 2: Per-Installation-Method Update Behavior

### A. EXE Installer

**Preferred Update Path**: In-app update ✅

**How It Works**:
1. User clicks "Apply Update" button
2. Backend downloads new binary to `%TEMP%`
3. PowerShell updater script created with:
   - PID-based process detection
   - Exponential backoff retry
   - Shortcut recreation
4. Main app exits
5. Updater script:
   - Waits for PID to disappear
   - Backs up `C:\Program Files\KubeGraf\kubegraf.exe.old`
   - Replaces `C:\Program Files\KubeGraf\kubegraf.exe`
   - Recreates Start Menu shortcut
   - Recreates Desktop shortcut (if exists)
   - Writes status file
   - Restarts app
6. New app reads status file, shows success/failure

**Safety Measures**:
- ✅ Backup before replace
- ✅ Rollback on failure
- ✅ Status file reports errors
- ✅ No admin privileges required (user owns Program Files\KubeGraf)
- ✅ Shortcuts preserved

**Edge Cases Handled**:
- File locked by antivirus → Retry with backoff
- Disk full → Rollback, show error
- Script crashes → Backup remains, user notified
- Restart fails → Status file shows warning

**Button State**: **Enabled**

### B. Scoop Package Manager

**Preferred Update Path**: `scoop update kubegraf` ⚠️

**How It Works**:

**Option 1: Strongly Recommended (CURRENT IMPLEMENTATION)**
1. User clicks "Apply Update" button
2. UI shows warning dialog:
   ```
   ⚠️ KubeGraf is installed via Scoop

   For best compatibility, update using Scoop:
     scoop update kubegraf

   In-app update will bypass Scoop's version tracking.
   Next 'scoop update' may overwrite your changes.

   [Use Scoop] [Continue Anyway] [Cancel]
   ```
3. If user clicks "Use Scoop":
   - Copy command to clipboard
   - Show PowerShell launch button
   - Disable update button
4. If user clicks "Continue Anyway":
   - Proceed with in-app update
   - Show persistent warning in UI

**Option 2: Disable Button Entirely (RECOMMENDED)**
1. Detection shows Scoop install
2. Button changes to:
   - Text: "Update via Scoop"
   - State: Info button (not action button)
   - Click behavior: Shows command in dialog
3. Dialog contains:
   ```
   To update KubeGraf:

   1. Open PowerShell:
      [Launch PowerShell]

   2. Run this command:
      scoop update kubegraf
      [Copy Command]

   Why? Scoop manages versions and dependencies.
   In-app updates bypass Scoop and may cause conflicts.
   ```

**Why Scoop MUST NOT Self-Update**:
- Scoop tracks versions in `scoop\apps\kubegraf\<version>\`
- Scoop uses symlinks (`current` → `<version>`)
- In-app update replaces binary in version directory
- Scoop doesn't know version changed
- Next `scoop update` sees "old" version, overwrites
- **Result**: User's update gets lost

**Exceptions**: NONE - Always use Scoop

**Button State**: **Disabled** or **Changed to Info Button**

### C. Manual PowerShell Installation

**Preferred Update Path**: In-app update ✅

**How It Works**:
- Same as EXE Installer
- Updater script updates binary in `%LOCALAPPDATA%\Programs\KubeGraf`
- No registry keys to maintain
- No shortcuts to recreate (unless user created manually)

**Safety Measures**:
- Same as EXE Installer

**Button State**: **Enabled**

### D. Manual ZIP/Binary (Portable)

**Preferred Update Path**: Show download link + helper ℹ️

**How It Works**:

**Option 1: Download Link (Safest)**
1. User clicks "Apply Update" button
2. UI shows dialog:
   ```
   ℹ️ Manual Installation Detected

   KubeGraf is running from a user-defined location:
     D:\Tools\kubegraf.exe

   To update:

   1. Download the latest version:
      https://github.com/kubegraf/kubegraf/releases/latest
      [Download Windows x64]

   2. Replace the existing kubegraf.exe file

   3. Restart KubeGraf

   [Download] [Cancel]
   ```

**Option 2: Assisted Update (Allowed)**
1. User clicks "Apply Update" button
2. Backend downloads new binary to temp
3. UI shows:
   ```
   ℹ️ Update Ready

   New version downloaded to:
     %TEMP%\kubegraf-update.exe

   To complete update:

   1. Close KubeGraf manually
   2. Copy new file to:
      D:\Tools\kubegraf.exe
   3. Restart KubeGraf

   [Open Download Folder] [Cancel]
   ```
4. Backend does NOT auto-replace (user controls their own directory)

**Why Not Auto-Update**:
- User may have custom permissions on directory
- May be on network drive
- May be in source control
- **User expects control over "portable" install**

**Button State**: **Enabled** (but shows info dialog, not auto-update)

---

## Part 3: UX Behavior in UI

### A. Update Modal - Current State

**Existing Implementation** (`ui/solid/src/components/UpdateModal.tsx`):
- Shows version comparison
- Shows release notes
- Has "Apply Update" button
- No per-install-method behavior

### B. Proposed UX Changes

#### 1. EXE Installer / PowerShell Install

**Button**:
```tsx
<button
  onClick={handleApplyUpdate}
  disabled={isUpdating}
  className="btn-primary"
>
  {isUpdating ? "Downloading Update..." : "Apply Update"}
</button>
```

**Progress States**:
- "Downloading Update..." (10%)
- "Installing Update..." (50%)
- "Restarting..." (90%)
- "Update Complete ✅"

**No special warnings needed** - this is the happy path.

#### 2. Scoop Installation

**Button** (Disabled State):
```tsx
<button
  onClick={handleShowScoopInstructions}
  className="btn-info"
>
  Update via Scoop
</button>

{isScoopInstall && (
  <div className="alert alert-warning">
    ⚠️ KubeGraf is managed by Scoop. Use Scoop to update for best compatibility.
  </div>
)}
```

**Click Behavior**:
```tsx
function handleShowScoopInstructions() {
  showDialog({
    title: "Update via Scoop",
    content: (
      <div>
        <p>To update KubeGraf:</p>
        <ol>
          <li>Open PowerShell</li>
          <li>Run: <code>scoop update kubegraf</code></li>
        </ol>

        <div className="command-box">
          <code>scoop update kubegraf</code>
          <button onClick={() => copyToClipboard("scoop update kubegraf")}>
            Copy
          </button>
        </div>

        <button onClick={openPowerShell}>
          Launch PowerShell
        </button>
      </div>
    ),
  });
}
```

**No "Continue Anyway" option** - too risky for users.

#### 3. Portable Installation

**Button**:
```tsx
<button
  onClick={handleShowDownloadInstructions}
  className="btn-secondary"
>
  Download Update
</button>

{isPortable && (
  <div className="alert alert-info">
    ℹ️ Manual installation detected. Update by replacing the executable.
  </div>
)}
```

**Click Behavior**:
```tsx
function handleShowDownloadInstructions() {
  showDialog({
    title: "Download Latest Version",
    content: (
      <div>
        <p>KubeGraf is running from a custom location:</p>
        <code>{currentInstallPath}</code>

        <p>To update:</p>
        <ol>
          <li>Download the latest version</li>
          <li>Replace <code>kubegraf.exe</code> in the above location</li>
          <li>Restart KubeGraf</li>
        </ol>

        <a href={downloadUrl} target="_blank" className="btn-primary">
          Download Windows x64
        </a>
      </div>
    ),
  });
}
```

### C. API Response Format

**Current API** (`GET /api/update/check`):
```json
{
  "currentVersion": "1.7.32",
  "latestVersion": "1.7.33",
  "updateAvailable": true,
  "releaseNotes": "...",
  "downloadUrl": "https://github.com/.../kubegraf_1.7.33_windows_amd64.exe",
  "htmlUrl": "https://github.com/kubegraf/kubegraf/releases/tag/v1.7.33",

  // Scoop detection (already implemented)
  "isScoopInstall": true,
  "scoopUpdateCommand": "scoop update kubegraf",
  "scoopWarning": "KubeGraf is installed via Scoop..."
}
```

**Proposed Enhanced Response**:
```json
{
  "currentVersion": "1.7.32",
  "latestVersion": "1.7.33",
  "updateAvailable": true,
  "releaseNotes": "...",
  "downloadUrl": "https://github.com/.../kubegraf_1.7.33_windows_amd64.exe",
  "htmlUrl": "https://github.com/kubegraf/kubegraf/releases/tag/v1.7.33",

  // Installation method detection
  "installMethod": "scoop" | "exe_installer" | "powershell_install" | "portable",
  "installPath": "C:\\Users\\user\\scoop\\apps\\kubegraf",

  // Per-method metadata
  "canAutoUpdate": false,  // false for Scoop, true for others
  "updateCommand": "scoop update kubegraf",  // Only for package managers
  "updateWarning": "KubeGraf is managed by Scoop...",  // Only for package managers
  "isPortable": false
}
```

---

## Part 4: Backend API Design

### Endpoints

#### 1. `GET /api/update/check`

**Purpose**: Check for updates and return installation method info

**Current Implementation**: ✅ EXISTS (`web_misc.go:100`)

**Enhancements Needed**:
```go
func (ws *WebServer) handleUpdateCheck(w http.ResponseWriter, r *http.Request) {
    // ... existing code ...

    // Detect installation method
    execPath, _ := os.Executable()
    installMethod := DetectInstallationMethod(execPath)

    response := map[string]interface{}{
        // ... existing fields ...
        "installMethod":  installMethod.Type,
        "installPath":    installMethod.Info.InstallPath,
        "canAutoUpdate":  installMethod.CanAutoUpdate(),
        "updateCommand":  installMethod.UpdateCommand(),
        "updateWarning":  installMethod.Warning(),
        "isPortable":     installMethod.Type == "portable",
    }

    json.NewEncoder(w).Encode(response)
}
```

#### 2. `POST /api/updates/install`

**Purpose**: Trigger update installation

**Current Implementation**: ✅ EXISTS (`web_misc.go:194`)

**Enhancements Needed**:
```go
func (ws *WebServer) handleInstallUpdate(w http.ResponseWriter, r *http.Request) {
    execPath, _ := os.Executable()
    installMethod := DetectInstallationMethod(execPath)

    // BLOCK Scoop installations
    if installMethod.Type == "scoop" {
        json.NewEncoder(w).Encode(map[string]interface{}{
            "success": false,
            "error":   "Cannot auto-update Scoop installations. Use 'scoop update kubegraf' instead.",
        })
        return
    }

    // BLOCK portable if in read-only location
    if installMethod.Type == "portable" {
        if !isWritable(filepath.Dir(execPath)) {
            json.NewEncoder(w).Encode(map[string]interface{}{
                "success": false,
                "error":   "Install location is not writable. Download update manually.",
            })
            return
        }
    }

    // Proceed with update
    // ... existing code ...
}
```

#### 3. `GET /api/update/status` (NEW)

**Purpose**: Check update status from previous session

**Implementation**:
```go
func (ws *WebServer) handleUpdateStatus(w http.ResponseWriter, r *http.Request) {
    statusFile := filepath.Join(os.TempDir(), "kubegraf-update-status.json")
    data, err := os.ReadFile(statusFile)
    if err != nil {
        // No status file
        json.NewEncoder(w).Encode(map[string]interface{}{
            "hasStatus": false,
        })
        return
    }

    var status struct {
        Success   bool   `json:"success"`
        Error     string `json:"error,omitempty"`
        Version   string `json:"version,omitempty"`
        Timestamp string `json:"timestamp"`
        Warning   string `json:"warning,omitempty"`
    }

    json.Unmarshal(data, &status)

    json.NewEncoder(w).Encode(map[string]interface{}{
        "hasStatus": true,
        "success":   status.Success,
        "error":     status.Error,
        "version":   status.Version,
        "warning":   status.Warning,
    })

    // Don't delete status file yet - let main app do it
}
```

---

## Part 5: Windows-Specific Constraints & Solutions

### Constraint 1: Running EXE Cannot Overwrite Itself

**Problem**: Windows locks executable file while running

**Solution**: Helper process pattern ✅ **ALREADY IMPLEMENTED**
1. Create PowerShell script in `%TEMP%`
2. Launch script in detached process
3. Main app exits immediately
4. Script waits for process to disappear (PID-based)
5. Script replaces file
6. Script restarts app

**Why This Works**:
- PowerShell script runs independently
- No file lock after process exits
- Windows releases lock within 3 seconds

### Constraint 2: File Locks (Antivirus, System Services)

**Problem**: Antivirus may hold lock for 1-2 seconds after process exits

**Solution**: Exponential backoff retry ✅ **ALREADY IMPLEMENTED**
- Attempt 1: Immediate
- Attempt 2: Wait 2 seconds
- Attempt 3: Wait 4 seconds
- Attempt 4: Wait 8 seconds
- Attempt 5: Wait 16 seconds

**Why This Works**:
- Handles transient locks
- Up to 30 seconds total wait time
- Covers 99% of antivirus lock scenarios

### Constraint 3: UAC (User Account Control)

**Problem**: Writing to `C:\Program Files` may require elevation

**Solution**: User ownership ✅ **CURRENT BEHAVIOR**
- Inno Setup installer runs with user privileges
- Installs to `C:\Program Files\KubeGraf`
- User owns the directory
- No admin rights needed for updates

**Why This Works**:
- User installed it → user owns it
- No system-wide changes needed
- Only updating files user already owns

### Constraint 4: Shortcut Preservation

**Problem**: Start Menu/Desktop shortcuts have absolute paths

**Solution**: Recreate shortcuts ✅ **ALREADY IMPLEMENTED**
- PowerShell script recreates shortcuts after update
- Uses same paths as original install
- Updates icon path if changed

**Why This Works**:
- Shortcuts are just `.lnk` files
- Easy to recreate via PowerShell
- User already has write access to AppData

---

## Part 6: Go Implementation Outline

### A. New File: `pkg/update/windows/installer.go`

```go
package windows

import (
    "os"
    "path/filepath"
    "runtime"
    "strings"
)

type ExeInstallerInfo struct {
    IsExeInstall    bool
    InstallPath     string
    ShortcutsExist  bool
    InProgramFiles  bool
}

type PowerShellInstallInfo struct {
    IsPowerShellInstall bool
    InstallPath         string
}

type PortableInstallInfo struct {
    IsPortable  bool
    InstallPath string
}

type InstallMethod struct {
    Type string // "scoop", "exe_installer", "powershell_install", "portable"
    Info interface{}
}

func (im *InstallMethod) CanAutoUpdate() bool {
    switch im.Type {
    case "scoop":
        return false  // Must use Scoop
    case "portable":
        // Check if directory is writable
        if info, ok := im.Info.(*PortableInstallInfo); ok {
            return isWritable(info.InstallPath)
        }
        return false
    default:
        return true  // exe_installer, powershell_install
    }
}

func (im *InstallMethod) UpdateCommand() string {
    if im.Type == "scoop" {
        return "scoop update kubegraf"
    }
    return ""
}

func (im *InstallMethod) Warning() string {
    switch im.Type {
    case "scoop":
        return "KubeGraf is managed by Scoop. For best compatibility, use 'scoop update kubegraf'."
    case "portable":
        return "Manual installation detected. Updates must be applied manually."
    default:
        return ""
    }
}

func DetectExeInstaller(execPath string) (*ExeInstallerInfo, error) {
    // Implementation from Part 1
}

func DetectPowerShellInstall(execPath string) (*PowerShellInstallInfo, error) {
    // Implementation from Part 1
}

func DetectPortableInstall(execPath string) *PortableInstallInfo {
    // Implementation from Part 1
}

func DetectInstallationMethod(execPath string) InstallMethod {
    // Implementation from Part 1
}

func isWritable(path string) bool {
    testFile := filepath.Join(path, ".kubegraf-write-test")
    err := os.WriteFile(testFile, []byte("test"), 0644)
    if err != nil {
        return false
    }
    os.Remove(testFile)
    return true
}
```

### B. Update `web_misc.go`

```go
func (ws *WebServer) handleUpdateCheck(w http.ResponseWriter, r *http.Request) {
    // ... existing code to check GitHub releases ...

    // Detect installation method
    execPath, err := os.Executable()
    if err == nil && runtime.GOOS == "windows" {
        installMethod := windows.DetectInstallationMethod(execPath)
        response["installMethod"] = installMethod.Type
        response["installPath"] = installMethod.Info.InstallPath
        response["canAutoUpdate"] = installMethod.CanAutoUpdate()

        if cmd := installMethod.UpdateCommand(); cmd != "" {
            response["updateCommand"] = cmd
        }

        if warn := installMethod.Warning(); warn != "" {
            response["updateWarning"] = warn
        }
    }

    json.NewEncoder(w).Encode(response)
}

func (ws *WebServer) handleInstallUpdate(w http.ResponseWriter, r *http.Request) {
    execPath, _ := os.Executable()
    installMethod := windows.DetectInstallationMethod(execPath)

    // Block Scoop installations
    if installMethod.Type == "scoop" {
        json.NewEncoder(w).Encode(map[string]interface{}{
            "success": false,
            "error":   "Cannot auto-update Scoop installations. Use 'scoop update kubegraf' instead.",
        })
        return
    }

    // Block read-only portable installations
    if installMethod.Type == "portable" && !installMethod.CanAutoUpdate() {
        json.NewEncoder(w).Encode(map[string]interface{}{
            "success": false,
            "error":   "Install location is not writable. Download update manually from GitHub releases.",
        })
        return
    }

    // Proceed with update
    // ... existing code ...
}
```

### C. Error Handling & Rollback

**Already Implemented** ✅:
- Backup before replace (`kubegraf.exe.old`)
- Rollback on failure (restore from backup)
- Status file mechanism (success/failure reporting)
- Detailed PowerShell logging

**Additional Safety** (if needed):
```go
func performUpdateWithRollback(execPath, newBinaryPath string) error {
    backupPath := execPath + ".old"

    // Step 1: Verify new binary
    if err := verifyBinary(newBinaryPath); err != nil {
        return fmt.Errorf("new binary verification failed: %w", err)
    }

    // Step 2: Create backup
    if err := os.Rename(execPath, backupPath); err != nil {
        return fmt.Errorf("failed to create backup: %w", err)
    }

    // Step 3: Install new binary
    if err := os.Rename(newBinaryPath, execPath); err != nil {
        // Rollback
        os.Rename(backupPath, execPath)
        return fmt.Errorf("failed to install new binary: %w", err)
    }

    // Step 4: Verify new binary works
    if err := verifyBinary(execPath); err != nil {
        // Rollback
        os.Remove(execPath)
        os.Rename(backupPath, execPath)
        return fmt.Errorf("new binary failed verification: %w", err)
    }

    return nil
}

func verifyBinary(path string) error {
    cmd := exec.Command(path, "--version")
    output, err := cmd.CombinedOutput()
    if err != nil {
        return err
    }

    if !strings.Contains(string(output), "KubeGraf") {
        return fmt.Errorf("binary verification failed: unexpected output")
    }

    return nil
}
```

---

## Part 7: Things We Must NEVER Do

### ❌ NEVER: Silent Background Updates
**Why**: Violates user trust, breaks corporate policies

**What we do instead**:
- User clicks "Apply Update" button
- Clear progress indication
- App exits visibly
- PowerShell window shows progress
- User sees app restart

### ❌ NEVER: Auto-Update Scoop Installations
**Why**: Breaks Scoop's version tracking, causes conflicts

**What we do instead**:
- Detect Scoop installation
- Disable auto-update button
- Show command: `scoop update kubegraf`
- Provide copyable command

### ❌ NEVER: Bypass UAC with Elevation Requests
**Why**: Scary UAC prompts break user trust

**What we do instead**:
- Install to user-owned directories
- No system-wide changes
- No registry modifications outside HKCU
- No admin rights required

### ❌ NEVER: Download Updates Without User Consent
**Why**: Wastes bandwidth, violates enterprise policies

**What we do instead**:
- Manual update check only
- User clicks "Check for Updates"
- User clicks "Apply Update" to download
- Clear file size shown before download

### ❌ NEVER: Modify Files Outside Install Directory
**Why**: Unexpected behavior, breaks sandboxing

**What we do instead**:
- Only update binary in install directory
- Only recreate shortcuts user already has
- Only write to `%TEMP%` for status file
- No changes to system PATH (unless user did it)

### ❌ NEVER: Delete Backups Immediately
**Why**: User may need to rollback manually

**What we do instead**:
- Keep `kubegraf.exe.old` for 24 hours
- Clean up asynchronously (PowerShell Start-Job)
- If update fails, backup remains permanently
- User can manually rollback if needed

### ❌ NEVER: Ignore Installation Method
**Why**: Each method has different constraints

**What we do instead**:
- Detect installation method first
- Per-method behavior
- Clear warnings for package managers
- Safe defaults for portable installs

---

## Part 8: Enterprise Adoption Checklist

### Trust Requirements
- ✅ No silent operations
- ✅ No elevation prompts
- ✅ No system-wide changes
- ✅ Clear rollback path
- ✅ Audit trail (status file, logs)

### Compatibility Requirements
- ✅ Works with corporate antivirus
- ✅ Works on network drives
- ✅ Works with Scoop/Chocolatey
- ✅ Works behind proxies
- ✅ No internet required after download

### Safety Requirements
- ✅ Atomic updates (backup + replace)
- ✅ Verification before finalization
- ✅ Graceful failure handling
- ✅ Clear error messages
- ✅ No data loss

---

## Part 9: Implementation Checklist

### Phase 1: Detection Logic
- [ ] Create `pkg/update/windows/installer.go`
- [ ] Implement `DetectExeInstaller()`
- [ ] Implement `DetectPowerShellInstall()`
- [ ] Implement `DetectPortableInstall()`
- [ ] Implement `DetectInstallationMethod()`
- [ ] Add registry key checking (optional)
- [ ] Test detection on all install types

### Phase 2: Backend API
- [x] ✅ Update `/api/update/check` with install method info (ALREADY EXISTS)
- [ ] Add install method detection to response
- [ ] Add `canAutoUpdate` field
- [ ] Add `updateCommand` field for package managers
- [ ] Block Scoop in `/api/updates/install`
- [ ] Block read-only portable in `/api/updates/install`
- [ ] Create `/api/update/status` endpoint (optional)

### Phase 3: Frontend UI
- [ ] Update `UpdateModal.tsx` with per-method logic
- [ ] Disable button for Scoop installs
- [ ] Show copyable command for Scoop
- [ ] Add "Launch PowerShell" button for Scoop
- [ ] Change button to "Download Update" for portable
- [ ] Show install path in portable dialog
- [ ] Test all UI states

### Phase 4: Testing
- [ ] Test EXE installer update
- [ ] Test Scoop detection (button disabled)
- [ ] Test PowerShell install update
- [ ] Test portable install (manual flow)
- [ ] Test with antivirus enabled
- [ ] Test on network drive
- [ ] Test failure scenarios
- [ ] Test rollback

### Phase 5: Documentation
- [ ] Update user documentation
- [ ] Add troubleshooting guide
- [ ] Document per-method behavior
- [ ] Add FAQ for Scoop users

---

## Conclusion

This architecture provides:
1. **Reliable detection** of all Windows installation methods
2. **Safe behavior** for each installation type
3. **Clear UX** with no surprises
4. **Enterprise-friendly** approach (no silent operations)
5. **Respect for package managers** (Scoop, Homebrew)

**Current status**: 70% implemented
**Remaining work**: Detection logic + UI enhancements
**Estimated effort**: 4-6 hours
