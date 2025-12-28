# KubeGraf Auto-Update Compatibility Guide

This document describes how KubeGraf's auto-update system works across different installation methods and platforms.

## Overview

KubeGraf includes a built-in auto-update system that can:
- Check for new versions from GitHub releases
- Download and verify updates using SHA256 checksums
- Safely replace the running binary using a helper process pattern
- Automatically restart the application after update

## Supported Platforms

| Platform | Architecture | Status |
|----------|-------------|--------|
| Windows | amd64, arm64 | ✅ Supported |
| macOS | amd64 (Intel), arm64 (Apple Silicon) | ✅ Supported |
| Linux | amd64, arm64 | ✅ Supported |

## Installation Method Compatibility

### Direct Binary Download (Recommended for Auto-Update)

**Status: Fully Supported**

When KubeGraf is installed by downloading the binary directly from GitHub releases:
- Auto-update works seamlessly
- No admin privileges required (unless installed in system directories)
- Binary is replaced in-place with automatic backup

**Recommended locations:**
- Windows: `C:\Users\<username>\KubeGraf\kubegraf.exe`
- macOS: `~/Applications/kubegraf` or `/usr/local/bin/kubegraf`
- Linux: `~/.local/bin/kubegraf` or `/usr/local/bin/kubegraf`

### Windows Package Managers

#### Scoop

**Status: Compatible with Warning**

When installed via Scoop (`scoop install kubegraf`):
- Auto-update CAN work, but bypasses Scoop's version tracking
- Scoop won't know about the new version
- Next `scoop update kubegraf` may downgrade to Scoop's known version

**Recommended approach:**
```powershell
# Use Scoop's update command instead
scoop update kubegraf
```

**If you must use in-app update:**
- KubeGraf will display a warning
- You can force the update if you understand the implications
- Consider running `scoop reset kubegraf` after to sync Scoop's state

#### Chocolatey

**Status: Compatible with Warning**

When installed via Chocolatey (`choco install kubegraf`):
- Auto-update CAN work, but bypasses Chocolatey's version tracking
- Chocolatey won't know about the new version
- Next `choco upgrade kubegraf` may overwrite the update

**Recommended approach:**
```powershell
# Use Chocolatey's upgrade command instead
choco upgrade kubegraf -y
```

**If you must use in-app update:**
- KubeGraf will display a warning
- You can force the update if you understand the implications
- The update will persist until Chocolatey upgrades the package

### macOS Package Managers

#### Homebrew

**Status: Compatible with Warning**

When installed via Homebrew (`brew install kubegraf`):
- Auto-update CAN work, but bypasses Homebrew's version tracking
- Homebrew won't know about the new version
- Next `brew upgrade kubegraf` may overwrite the update

**Recommended approach:**
```bash
# Use Homebrew's upgrade command instead
brew upgrade kubegraf
```

**If you must use in-app update:**
- KubeGraf will display a warning explaining the situation
- You can force the update if you understand the implications
- The update will persist until Homebrew upgrades the formula

### Linux Package Managers

#### APT (Debian/Ubuntu)

**Status: Compatible with Warning**

When installed via APT:
- Auto-update CAN work for binaries in user directories
- System-wide installations (`/usr/bin`) may require sudo
- APT won't track the version change

**Recommended approach:**
```bash
# Use APT's upgrade command instead
sudo apt update && sudo apt upgrade kubegraf
```

#### Snap

**Status: Limited Compatibility**

Snap packages run in a confined sandbox:
- Auto-update may be blocked by sandbox restrictions
- Snap manages its own update mechanism

**Recommended approach:**
```bash
# Use Snap's refresh command
sudo snap refresh kubegraf
```

#### Flatpak

**Status: Limited Compatibility**

Flatpak packages are sandboxed:
- Auto-update is generally not possible
- Flatpak manages its own update mechanism

**Recommended approach:**
```bash
# Use Flatpak's update command
flatpak update com.kubegraf.KubeGraf
```

## How Auto-Update Works

### 1. Version Check

KubeGraf checks GitHub releases API for the latest version:
- Compares current version with latest release tag
- Caches results (15 minutes if no update, 4 hours if update available)
- Detects installation method to provide appropriate guidance

### 2. Download

When an update is initiated:
- Downloads the appropriate binary/archive for your platform
- Verifies SHA256 checksum (if available)
- Extracts binary from archive if needed

### 3. Safe Replacement (Helper Process Pattern)

Since a running executable cannot replace itself, KubeGraf uses a helper script:

**Windows (PowerShell):**
1. Creates a PowerShell updater script in temp directory
2. Launches the script in a separate process
3. Main application exits
4. Script waits for the process to fully exit
5. Script backs up old binary
6. Script copies new binary
7. Script verifies new binary works (`--version` check)
8. Script recreates shortcuts if needed
9. Script restarts application
10. Script cleans up backup after delay

**Unix (Shell):**
1. Creates a shell updater script in temp directory
2. Launches the script with `nohup`
3. Main application exits
4. Script waits for the process to fully exit
5. Script backs up old binary
6. Script copies new binary and sets permissions
7. Script verifies new binary works
8. Script restarts application with `nohup`
9. Script cleans up backup after delay

### 4. Rollback Safety

If the new binary fails verification:
- Old binary is automatically restored from backup
- User is notified of the failure
- No manual intervention required

## API Reference

### Check for Updates

```
GET /api/update/check
```

Response:
```json
{
  "currentVersion": "1.7.30",
  "latestVersion": "1.7.31",
  "updateAvailable": true,
  "releaseNotes": "...",
  "htmlUrl": "https://github.com/kubegraf/kubegraf/releases/tag/v1.7.31",
  "downloadUrl": "https://github.com/kubegraf/kubegraf/releases/download/v1.7.31/kubegraf_1.7.31_darwin_arm64",
  "installMethod": "binary",
  "canAutoUpdate": true
}
```

### Apply Update

```
POST /api/update/apply
Content-Type: application/json

{
  "downloadUrl": "https://github.com/...",
  "checksumUrl": "https://github.com/.../checksums.txt",
  "forceUpdate": false,
  "autoRestart": true
}
```

Response:
```json
{
  "success": true,
  "message": "Update applied successfully. Application will restart.",
  "status": "restarting",
  "needsRestart": true
}
```

### Get Platform Info

```
GET /api/update/platform
```

Response:
```json
{
  "os": "darwin",
  "arch": "arm64",
  "installMethod": "homebrew",
  "installPath": "/opt/homebrew/bin/kubegraf",
  "canUpdate": true,
  "updateCommand": "brew upgrade kubegraf"
}
```

## Troubleshooting

### Update fails to apply

1. Check if you have write permissions to the installation directory
2. Make sure no other instance of KubeGraf is running
3. Check available disk space
4. Review the console output for specific error messages

### Update reverts after package manager upgrade

This happens when using auto-update with a package manager installation:
- The package manager's version takes precedence
- Either use the package manager for updates, or uninstall and use direct binary

### Binary not found after update

The helper script may have failed. Try:
1. Check the temp directory for `kubegraf-updater.ps1` (Windows) or `kubegraf-updater.sh` (Unix)
2. Run the script manually to see error output
3. Restore from backup: `kubegraf.old` in the installation directory

### Application doesn't restart

The restart mechanism may be blocked by:
- Antivirus software (Windows)
- Security policies
- Terminal session ending

Manually start KubeGraf after the update completes.

## Security Considerations

- Updates are only downloaded from GitHub releases (github.com/kubegraf/kubegraf)
- SHA256 checksums are verified when available
- HTTPS is used for all downloads
- No external update servers or CDNs
- Source code for the update system is open source and auditable
