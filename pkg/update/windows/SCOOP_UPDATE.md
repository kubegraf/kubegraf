# Scoop Installation Update Handling

## Overview

When KubeGraf is installed via Scoop (Windows package manager), the update mechanism needs special handling because:

1. **Scoop manages versions**: Scoop uses versioned directories and symlinks
2. **Scoop tracks updates**: Scoop has its own update mechanism via manifests
3. **Symlink structure**: The executable path might be a symlink to a versioned directory
4. **Manifest tracking**: Scoop tracks installed versions in manifest.json

## How It Works

### Detection

The system automatically detects Scoop installations by:
1. Checking if the executable path contains `scoop\apps`
2. Verifying the presence of `manifest.json` in the app directory
3. Resolving symlinks to find the actual version directory

### Update Process

When a Scoop installation is detected:

1. **Warning Message**: The update check API includes:
   - `isScoopInstall: true`
   - `scoopUpdateCommand: "scoop update kubegraf"`
   - `scoopWarning`: Warning message recommending Scoop update

2. **Update Execution**: If user proceeds with in-app update:
   - The updater script resolves the actual executable path (not the symlink)
   - Updates the binary in the version directory
   - Restarts the application
   - **Note**: This bypasses Scoop's version tracking

3. **Recommendation**: Users are advised to use `scoop update kubegraf` instead

## Scoop Directory Structure

```
C:\Users\<user>\scoop\apps\kubegraf\
├── current\              # Symlink to current version
│   └── kubegraf.exe      # Symlink target
├── 1.7.21\              # Version directory
│   └── kubegraf.exe      # Actual executable
├── 1.7.20\              # Previous version (if kept)
│   └── kubegraf.exe
└── manifest.json         # Scoop manifest
```

## API Response Example

When checking for updates on a Scoop installation:

```json
{
  "currentVersion": "1.7.20",
  "latestVersion": "1.7.21",
  "updateAvailable": true,
  "downloadUrl": "https://github.com/.../kubegraf_1.7.21_windows_amd64.exe",
  "isScoopInstall": true,
  "scoopUpdateCommand": "scoop update kubegraf",
  "scoopWarning": "KubeGraf is installed via Scoop. For best compatibility, use 'scoop update kubegraf' instead of in-app updates."
}
```

## User Experience

### Option 1: Use Scoop (Recommended)

```powershell
scoop update kubegraf
```

**Benefits:**
- ✅ Scoop tracks the version
- ✅ Proper version management
- ✅ Can rollback with `scoop install kubegraf@1.7.20`
- ✅ Consistent with Scoop workflow

### Option 2: In-App Update (Works but not ideal)

The in-app update will work, but:
- ⚠️ Scoop won't know about the version change
- ⚠️ Next `scoop update` may overwrite the update
- ⚠️ Version tracking is inconsistent

## Implementation Details

### Detection Function

```go
scoopInfo, err := windows.DetectScoopInstallation(execPath)
if scoopInfo != nil && scoopInfo.IsScoopInstall {
    // Handle Scoop installation
}
```

### Update Function

```go
func performScoopUpdate(execPath, newBinaryPath string, scoopInfo *windows.ScoopInfo) error {
    // Resolve symlink to get actual path
    realExecPath, _ := filepath.EvalSymlinks(execPath)
    
    // Update the actual binary (not the symlink)
    // Rest of the update process...
}
```

## Best Practices

1. **Always detect Scoop installations** before updating
2. **Show warning** to users about Scoop updates
3. **Allow in-app updates** but with clear warnings
4. **Resolve symlinks** to update the actual binary
5. **Document the limitation** in user-facing messages

## Future Improvements

- [ ] Integrate with Scoop's update mechanism
- [ ] Update Scoop manifest after in-app update
- [ ] Provide option to open PowerShell with Scoop command
- [ ] Auto-detect and suggest Scoop update when available

