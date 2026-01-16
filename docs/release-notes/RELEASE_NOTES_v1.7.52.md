# KubeGraf v1.7.38 - v1.7.52 - Windows Auto-Update and Terminal Fixes

**Release Date:** December 30, 2025

## Overview

This series of releases (v1.7.38 through v1.7.52) resolves critical issues with Windows auto-update functionality and terminal input handling. The fixes ensure Windows users can reliably update KubeGraf through the in-app updater and use the terminal feature without errors.

## Critical Fixes

### 🔧 Windows Auto-Update Platform Detection (v1.7.51 - CRITICAL)

**Issue**: Auto-update was downloading macOS binaries on Windows, causing "The specified executable is not a valid application for this OS platform" errors.

**Root Cause**: The `findMatchingAsset()` function in `internal/update/checker.go` was blindly prioritizing `.tar.gz` files for "cross-platform compatibility", but `.tar.gz` archives contain platform-specific binaries. Since GitHub lists assets alphabetically, `kubegraf-darwin-amd64.tar.gz` (macOS) was selected before `kubegraf-windows-amd64.zip`.

**Fix**: Complete rewrite of asset selection logic to properly match OS and architecture:

```go
// Before (BUGGY):
if strings.Contains(assetName, ".tar.gz") {
    return asset.BrowserDownloadURL  // Returns first .tar.gz = macOS!
}

// After (FIXED):
osName := runtime.GOOS       // "windows" on Windows
archName := runtime.GOARCH   // "amd64" for 64-bit

if strings.Contains(assetName, osName) && strings.Contains(assetName, archName) {
    fmt.Printf("✓ Selected update asset: %s\n", asset.Name)
    return asset.BrowserDownloadURL  // Correct platform!
}
```

**Files Changed**:
- `internal/update/checker.go` - Fixed platform detection logic
- `updates.go` - Applied same fix to legacy update path (belt-and-suspenders)

### 🔧 PowerShell Script Parsing Errors (v1.7.47)

**Issue**: PowerShell updater script was failing with syntax errors like:
```
Unexpected token 'seconds' in expression or statement.
Missing closing ')' in expression.
```

**Root Cause**: Emoji characters (🔄, ✓, ⏳, ⚠️, ❌, etc.) in the PowerShell script were being misinterpreted due to encoding issues on Windows PowerShell.

**Fix**: Replaced all emoji characters with plain ASCII text indicators:
- 🔄 → `[UPDATE]`
- ✓ → `[OK]`
- ⏳ → `[WAIT]`
- ⚠️ → `[WARN]`
- ❌ → `[ERROR]`
- 📦 → `[BACKUP]`
- 📥 → `[INSTALL]`
- 🔗 → `[SETUP]`
- 📁 → `[PATH]`
- ✅ → `[SUCCESS]`
- 🚀 → `[START]`

**Files Changed**:
- `pkg/update/windows/updater.go` - Removed emoji characters from PowerShell script

### 🔧 PowerShell Updater Window Visibility (v1.7.45)

**Issue**: PowerShell updater window was appearing and immediately disappearing, making it impossible to see errors.

**Fix**: Added `-NoExit` flag to PowerShell launch command to keep window open after script completion.

**Files Changed**:
- `pkg/update/windows/updater.go` - Added `-NoExit` to PowerShell arguments

### 🔧 Updater Script Output Logging (v1.7.43)

**Issue**: Updater script was running silently with all output suppressed, making debugging impossible.

**Fix**: Attached stdout/stderr to updater process and added detailed logging:

```go
// Before:
cmd.Stdout = nil
cmd.Stderr = nil

// After:
cmd.Stdout = os.Stdout
cmd.Stderr = os.Stderr
fmt.Printf("Launching updater script: %s\n", scriptPath)
fmt.Printf("Updater process started with PID: %d\n", cmd.Process.Pid)
```

**Files Changed**:
- `pkg/update/windows/updater.go` - Enabled output logging

### 🔧 Windows Terminal Input Handling (v1.7.41)

**Issue**: Windows terminal showed "Connected" but had no prompt and input didn't work.

**Root Cause**: PowerShell was exiting immediately after start because it lacked the `-NoExit` flag.

**Fix**: Added `-NoExit` flag to PowerShell configuration in shell detector:

```go
{
    Name:        "Windows PowerShell",
    Path:        "powershell.exe",
    Args:        []string{"-NoLogo", "-NoExit"},  // Added -NoExit
    Recommended: true,
}
```

**Files Changed**:
- `pkg/terminal/windows/shell_detector.go` - Added `-NoExit` to PowerShell args
- `web_terminal_windows.go` - Added extensive ConPTY I/O logging

### 🔧 Binary Extraction Error Handling (v1.7.40)

**Issue**: "kubegraf binary not found in archive" error when updating.

**Root Cause**: Case-sensitive filename matching in zip/tar.gz extraction.

**Fix**: Added case-insensitive matching and better error reporting:

```go
baseName := filepath.Base(file.Name)
baseNameLower := strings.ToLower(baseName)
binaryNameLower := strings.ToLower(binaryName)

isMatch := (baseNameLower == binaryNameLower ||
    strings.HasSuffix(strings.ToLower(file.Name), "/"+binaryNameLower) ||
    baseNameLower == "kubegraf" ||
    baseNameLower == "kubegraf.exe") && !file.FileInfo().IsDir()
```

**Files Changed**:
- `updates.go` - Improved binary extraction with case-insensitive matching

## Version History

| Version | Date | Description |
|---------|------|-------------|
| v1.7.52 | Dec 30, 2025 | Test release verifying all fixes work correctly |
| v1.7.51 | Dec 30, 2025 | **CRITICAL**: Fixed platform detection in `internal/update/checker.go` |
| v1.7.50 | Dec 30, 2025 | Test release for platform detection fix |
| v1.7.49 | Dec 30, 2025 | First attempt to fix platform detection (wrong file) |
| v1.7.48 | Dec 30, 2025 | Test release |
| v1.7.47 | Dec 30, 2025 | Fixed PowerShell emoji parsing errors |
| v1.7.46 | Dec 30, 2025 | Test release |
| v1.7.45 | Dec 30, 2025 | Added `-NoExit` to keep updater window open |
| v1.7.44 | Dec 30, 2025 | Test release |
| v1.7.43 | Dec 30, 2025 | Enabled updater script output logging |
| v1.7.42 | Dec 30, 2025 | Test release |
| v1.7.41 | Dec 30, 2025 | Fixed PowerShell `-NoExit` for terminal input |
| v1.7.40 | Dec 29, 2025 | Fixed binary extraction case sensitivity |
| v1.7.39 | Dec 29, 2025 | ConPTY API fixes |
| v1.7.38 | Dec 29, 2025 | Initial Windows terminal improvements |

## Auto-Update Flow (Now Working Correctly)

When a Windows user clicks "Apply Update":

1. **Asset Selection**:
   - UI calls `internal/update/checker.go` → `CheckGitHubLatestRelease()`
   - `findMatchingAsset()` matches OS (`windows`) and architecture (`amd64`)
   - Selects `kubegraf-windows-amd64.zip` ✅
   - Console shows: `✓ Selected update asset: kubegraf-windows-amd64.zip`

2. **Download & Extract**:
   - Downloads the correct Windows binary from GitHub releases
   - Extracts `kubegraf.exe` from zip archive
   - Saves to `%TEMP%\kubegraf-update.exe`
   - Console shows: `✓ Extracted binary to: C:\Users\...\AppData\Local\Temp\kubegraf-update.exe`

3. **Updater Script**:
   - Generates PowerShell script at `%TEMP%\kubegraf-updater.ps1`
   - Launches script with `-NoExit` flag (window stays open)
   - Console shows: `Launching updater script: ...`

4. **Update Process** (PowerShell window):
   ```
   [UPDATE] KubeGraf Updater Starting...
      Target PID: <process-id>
      New Version: 1.7.52
   [OK] Main process has exited
   [WAIT] Waiting for file handles to release...
   [BACKUP] Backing up old binary...
   [OK] Backup created: C:\kubegraf.exe.old
   [INSTALL] Installing new binary...
   [OK] New binary installed successfully
   [SETUP] Setting up shortcuts and PATH...
   [OK] Start Menu shortcut created/updated
   [OK] Desktop shortcut created/updated
   [OK] Already in PATH
   [SUCCESS] Writing success status...
   [START] Restarting KubeGraf...
   [OK] KubeGraf restarted successfully
   [SUCCESS] Update completed successfully!
   ```

5. **Verification**:
   - App automatically restarts (or user can start manually)
   - New version shows in UI
   - Binary is valid Windows PE executable

## Known Limitations

### Auto-Restart Issues

The auto-restart feature may sometimes fail with:
```
[ERROR] Failed to restart application: Exception calling "Start" with "1" argument(s):
"The specified executable is not a valid application for this OS platform."
```

**Workaround**: Manually start KubeGraf after the update completes. The update itself succeeds; only the automatic restart fails.

**Reason**: Under investigation - may be related to process handles or Windows security context changes.

### Terminal Limitations (From v1.7.37)

Due to Windows pipe-based approach (vs PTY on Unix):
- No ANSI colors
- Buffered output (4KB buffer)
- No interactive prompt display
- No input echo in pipe mode

Commands execute correctly despite these cosmetic limitations.

## Upgrade Instructions

### From v1.7.37-v1.7.50

**IMPORTANT**: Versions v1.7.38 through v1.7.50 have the platform detection bug that downloads macOS binaries. You MUST manually install v1.7.51 or later first.

1. **Download v1.7.51 or v1.7.52 manually**:
   ```powershell
   # Download Windows binary
   Invoke-WebRequest -Uri "https://github.com/kubegraf/kubegraf/releases/download/v1.7.52/kubegraf-windows-amd64.zip" -OutFile "$env:TEMP\kubegraf-v1.7.52.zip"

   # Extract
   Expand-Archive -Path "$env:TEMP\kubegraf-v1.7.52.zip" -DestinationPath "$env:TEMP\kubegraf-v1.7.52" -Force

   # Copy to installation location
   Copy-Item "$env:TEMP\kubegraf-v1.7.52\kubegraf.exe" -Destination "C:\kubegraf.exe" -Force
   ```

2. **Restart KubeGraf**:
   ```powershell
   .\kubegraf.exe web
   ```

3. **Verify version**: Check that UI shows v1.7.52

4. **Future updates**: Auto-update will now work correctly from v1.7.51 onwards

### From v1.7.51 or Later

Auto-update works correctly! Simply:
1. Click "Check for Updates" in the UI
2. Click "Apply Update"
3. Wait for the PowerShell window to complete
4. App will restart automatically (or start manually)

## Testing & Verification

To verify the auto-update is working correctly:

```powershell
# 1. Check you're on v1.7.51 or later
.\kubegraf.exe --version

# 2. Check binary is valid Windows executable (should show "MZ")
$bytes = Get-Content C:\kubegraf.exe -Encoding Byte -TotalCount 2
($bytes | ForEach-Object { [char]$_ }) -join ""

# 3. Test update to next version
# - Click "Check for Updates" in UI
# - Watch console for: "✓ Selected update asset: kubegraf-windows-amd64.zip"
# - NOT: "kubegraf-darwin-amd64.tar.gz" (macOS binary)
```

## Files Modified

### Core Update Logic
- `internal/update/checker.go` - Platform detection fix (v1.7.51)
- `updates.go` - Binary extraction improvements (v1.7.40, v1.7.49)

### Windows Updater
- `pkg/update/windows/updater.go` - PowerShell script fixes (v1.7.43, v1.7.45, v1.7.47)

### Windows Terminal
- `pkg/terminal/windows/shell_detector.go` - PowerShell args fix (v1.7.41)
- `web_terminal_windows.go` - ConPTY logging (v1.7.41)

### Version
- `version.go` - Version bumps for all releases

## For Developers

If building from source, ensure you're on v1.7.51 or later:

```bash
# Clone repository
git clone https://github.com/kubegraf/kubegraf.git
cd kubegraf

# Checkout v1.7.52 tag
git checkout v1.7.52

# Build frontend
cd ui/solid
npm install
npm run build
cd ../..

# Build backend (Windows)
$env:GOOS="windows"
$env:GOARCH="amd64"
$env:CGO_ENABLED="1"
go build -ldflags="-X main.version=1.7.52" -o kubegraf.exe .

# Run
.\kubegraf.exe web
```

## Debugging Auto-Update Issues

If auto-update fails:

1. **Check console output** for asset selection:
   ```
   ✓ Selected update asset: kubegraf-windows-amd64.zip
   ```

2. **Check PowerShell updater window** for errors

3. **Verify binary platform**:
   ```powershell
   $bytes = Get-Content C:\kubegraf.exe -Encoding Byte -TotalCount 4
   $hex = ($bytes | ForEach-Object { $_.ToString("X2") }) -join " "
   if ($hex.StartsWith("4D 5A")) {
       Write-Host "Windows PE executable (CORRECT)"
   } elseif ($hex -eq "CF FA ED FE") {
       Write-Host "macOS Mach-O executable (WRONG - update failed)"
   }
   ```

4. **Check update status file**:
   ```powershell
   Get-Content "$env:TEMP\kubegraf-update-status.json"
   ```

## Feedback & Issues

Report issues at: https://github.com/kubegraf/kubegraf/issues

When reporting auto-update issues, please include:
1. Current KubeGraf version
2. Windows version
3. Console output showing asset selection
4. PowerShell updater window output
5. Binary platform verification result

## Credits

These fixes resolve critical Windows auto-update functionality based on extensive user testing and debugging throughout December 2025.

Special thanks to the testing that helped identify:
- Platform detection bug in asset selection
- PowerShell emoji parsing issues
- Terminal input handling problems

---

**Full Changelog**: https://github.com/kubegraf/kubegraf/compare/v1.7.37...v1.7.52

**Critical Fix Commit**: a986f21 - fix: CRITICAL - Fix platform detection in asset selection (CORRECT FILE)
