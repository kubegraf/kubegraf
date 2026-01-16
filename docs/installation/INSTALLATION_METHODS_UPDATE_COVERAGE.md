# Update Mechanism Coverage for All Installation Methods

This document verifies that the auto-update mechanism works correctly for all installation methods.

## Installation Methods Coverage

### ✅ macOS Installation Methods

#### 1. Quick Install Script (`install.sh`)
- **Installation Path**: `/usr/local/bin/kubegraf`
- **Update Support**: ✅ **Fully Supported**
- **How it works**:
  - Detects executable at `/usr/local/bin/kubegraf`
  - Uses Unix updater script
  - Updates binary in place
  - Restarts application automatically
- **Notes**: Works seamlessly, no special handling needed

#### 2. Homebrew Installation
- **Installation Path**: 
  - Apple Silicon: `/opt/homebrew/bin/kubegraf` (symlink to Cellar)
  - Intel: `/usr/local/bin/kubegraf` (symlink to Cellar)
- **Update Support**: ✅ **Supported with Warning**
- **How it works**:
  - Detects Homebrew installation via `DetectHomebrewInstallation()`
  - Checks for Cellar directory or uses `brew list` command
  - Shows warning recommending `brew upgrade kubegraf`
  - If user proceeds, updates the actual binary in Cellar
  - Restarts application
- **API Response**:
  ```json
  {
    "isHomebrewInstall": true,
    "homebrewUpdateCommand": "brew upgrade kubegraf",
    "homebrewWarning": "KubeGraf is installed via Homebrew..."
  }
  ```
- **Notes**: 
  - ⚠️ In-app update works but bypasses Homebrew version tracking
  - ⚠️ Next `brew upgrade` may overwrite the update
  - ✅ Recommended: Use `brew upgrade kubegraf` instead

#### 3. Manual macOS Installation (Apple Silicon/Intel)
- **Installation Path**: `/usr/local/bin/kubegraf`
- **Update Support**: ✅ **Fully Supported**
- **How it works**: Same as Quick Install Script
- **Notes**: Works seamlessly

### ✅ Linux Installation Methods

#### 1. Quick Install Script (`install.sh`)
- **Installation Path**: `/usr/local/bin/kubegraf`
- **Update Support**: ✅ **Fully Supported**
- **How it works**:
  - Detects executable at `/usr/local/bin/kubegraf`
  - Uses Unix updater script
  - Updates binary in place
  - Verifies new binary works before completing
  - Restarts application automatically
- **Notes**: Works seamlessly, includes binary verification

#### 2. Manual Linux Installation (x86_64/ARM64)
- **Installation Path**: `/usr/local/bin/kubegraf`
- **Update Support**: ✅ **Fully Supported**
- **How it works**: Same as Quick Install Script
- **Notes**: Works seamlessly

### ✅ Windows Installation Methods

#### 1. GUI Installer (Inno Setup)
- **Installation Path**: `C:\Program Files\KubeGraf\kubegraf.exe`
- **Update Support**: ✅ **Fully Supported**
- **How it works**:
  - Detects executable in Program Files
  - Uses Windows PowerShell updater script
  - Updates binary and recreates shortcuts
  - Restarts application automatically
- **Notes**: 
  - ✅ Recreates Start Menu shortcuts
  - ✅ Recreates Desktop shortcuts (if they existed)
  - ✅ Works seamlessly

#### 2. Scoop Package Manager
- **Installation Path**: `C:\Users\<user>\scoop\apps\kubegraf\current\kubegraf.exe` (symlink)
- **Update Support**: ✅ **Supported with Warning**
- **How it works**:
  - Detects Scoop installation via `DetectScoopInstallation()`
  - Checks for `scoop\apps` in path and `manifest.json`
  - Resolves symlink to actual version directory
  - Shows warning recommending `scoop update kubegraf`
  - If user proceeds, updates binary in version directory
  - Restarts application
- **API Response**:
  ```json
  {
    "isScoopInstall": true,
    "scoopUpdateCommand": "scoop update kubegraf",
    "scoopWarning": "KubeGraf is installed via Scoop..."
  }
  ```
- **Notes**: 
  - ⚠️ In-app update works but bypasses Scoop version tracking
  - ⚠️ Next `scoop update` may overwrite the update
  - ✅ Recommended: Use `scoop update kubegraf` instead

#### 3. Manual PowerShell Installation (`install.ps1`)
- **Installation Path**: `C:\Users\<user>\AppData\Local\Programs\KubeGraf\kubegraf.exe`
- **Update Support**: ✅ **Fully Supported**
- **How it works**:
  - Detects executable in user's LocalAppData
  - Uses Windows PowerShell updater script
  - Updates binary in place
  - Restarts application automatically
- **Notes**: Works seamlessly

#### 4. Manual Download (ZIP)
- **Installation Path**: User-defined (e.g., `C:\kubegraf\kubegraf.exe`)
- **Update Support**: ✅ **Fully Supported**
- **How it works**:
  - Detects executable at user's chosen location
  - Uses Windows PowerShell updater script
  - Updates binary in place
  - Restarts application automatically
- **Notes**: Works seamlessly for any installation path

## Update Mechanism Details

### Unix/Linux/macOS Update Flow

1. **Download**: New binary downloaded to temp directory
2. **Detection**: Checks for Homebrew (macOS only)
3. **Script Creation**: Creates shell updater script
4. **App Exit**: Application exits to release file locks
5. **Updater Execution**:
   - Waits for process to exit (max 30 seconds)
   - Backs up old binary
   - Replaces binary with new version
   - Verifies new binary works (`--version` test)
   - Restarts application using `nohup`
   - Cleans up backup

### Windows Update Flow

1. **Download**: New binary downloaded to temp directory
2. **Detection**: Checks for Scoop installation
3. **Script Creation**: Creates PowerShell updater script
4. **App Exit**: Application exits to release file locks
5. **Updater Execution**:
   - Waits for process to exit (max 30 seconds)
   - Backs up old binary
   - Replaces binary with new version
   - Recreates shortcuts (Start Menu, Desktop)
   - Restarts application
   - Cleans up backup

## Special Cases

### Package Manager Installations

#### Homebrew (macOS)
- **Detection**: ✅ Automatic via `DetectHomebrewInstallation()`
- **Warning**: ✅ Shown in API response
- **Update**: ✅ Works but with warning
- **Recommendation**: Use `brew upgrade kubegraf`

#### Scoop (Windows)
- **Detection**: ✅ Automatic via `DetectScoopInstallation()`
- **Warning**: ✅ Shown in API response
- **Update**: ✅ Works but with warning
- **Recommendation**: Use `scoop update kubegraf`

### Path Variations

All installation paths are handled correctly:
- ✅ `/usr/local/bin/kubegraf` (Unix manual/quick install)
- ✅ `/opt/homebrew/bin/kubegraf` (Homebrew Apple Silicon)
- ✅ `/usr/local/Cellar/kubegraf/version/bin/kubegraf` (Homebrew Cellar)
- ✅ `C:\Program Files\KubeGraf\kubegraf.exe` (Windows installer)
- ✅ `C:\Users\<user>\scoop\apps\kubegraf\current\kubegraf.exe` (Scoop)
- ✅ `C:\Users\<user>\AppData\Local\Programs\KubeGraf\kubegraf.exe` (Windows manual)
- ✅ Any custom path (Windows manual ZIP)

## Testing Checklist

### macOS
- [x] Quick Install Script (`/usr/local/bin/kubegraf`)
- [x] Homebrew Installation (detection + warning)
- [x] Manual Installation (Apple Silicon/Intel)

### Linux
- [x] Quick Install Script (`/usr/local/bin/kubegraf`)
- [x] Manual Installation (x86_64/ARM64)

### Windows
- [x] GUI Installer (`C:\Program Files\KubeGraf\`)
- [x] Scoop Installation (detection + warning)
- [x] Manual PowerShell Install (`%LOCALAPPDATA%\Programs\KubeGraf\`)
- [x] Manual ZIP (any path)

## Summary

✅ **All installation methods are fully supported**

- **Standard installations**: Work seamlessly with automatic updates
- **Package manager installations**: Work with warnings and recommendations
- **Custom paths**: Handled correctly regardless of location
- **Cross-platform**: Consistent behavior across Windows, Linux, and macOS

The update mechanism is production-ready for all installation methods!

