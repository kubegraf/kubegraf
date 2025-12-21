# Windows Auto-Update Package

This package provides Windows-specific functionality for handling application updates on Windows systems.

## Overview

The Windows update mechanism uses a separate PowerShell script that runs after the main application exits. This approach solves the problem of replacing a running executable on Windows, which is not possible due to file locking.

## Architecture

### Update Flow

1. **Download Phase**: The main application downloads the new binary to a temporary location
2. **Updater Script Creation**: A PowerShell script is created that will handle the update
3. **Application Exit**: The main application exits, releasing file locks
4. **Updater Execution**: The PowerShell script:
   - Waits for the main process to fully exit
   - Backs up the old binary
   - Replaces the binary with the new one
   - Recreates desktop and start menu shortcuts
   - Restarts the application
   - Cleans up temporary files

### Components

#### `updater.go`
- `CreateUpdaterScript()`: Creates a PowerShell script that handles the update process
- `LaunchUpdater()`: Launches the updater script
- `GetInstallDirectory()`: Detects the installation directory

#### `shortcuts.go`
- `CreateShortcuts()`: Creates Windows shortcuts using PowerShell
- `ShortcutExists()`: Checks if a shortcut exists
- `GetDesktopShortcutPath()`: Returns the path to the desktop shortcut
- `GetStartMenuShortcutPath()`: Returns the path to the start menu shortcut
- `ShouldRecreateDesktopShortcut()`: Checks if desktop shortcut should be recreated
- `ShouldRecreateStartMenuShortcut()`: Checks if start menu shortcut should be recreated

## Usage

The Windows update mechanism is automatically used when `PerformUpdate()` is called on a Windows system. The main application code doesn't need to handle Windows-specific logic - it's all abstracted in this package.

### Example

```go
import "github.com/kubegraf/kubegraf/pkg/update/windows"

// This is called automatically by PerformUpdate() on Windows
config := windows.UpdateConfig{
    ExecPath:      "C:\\Program Files\\KubeGraf\\kubegraf.exe",
    NewBinaryPath: "C:\\Users\\User\\AppData\\Local\\Temp\\kubegraf-update",
    AppName:       "KubeGraf",
    AppExeName:    "kubegraf.exe",
    InstallDir:    "C:\\Program Files\\KubeGraf",
}

scriptPath, err := windows.CreateUpdaterScript(config)
if err != nil {
    return err
}

if err := windows.LaunchUpdater(scriptPath); err != nil {
    return err
}

// Application exits here - updater script handles the rest
os.Exit(0)
```

## Features

### ✅ Reliable Update Process
- Waits for the main process to exit before replacing files
- Creates backup of old binary for rollback
- Handles file locking issues gracefully

### ✅ Shortcut Recreation
- Automatically recreates desktop shortcuts if they existed
- Recreates start menu shortcuts
- Preserves shortcut properties (arguments, working directory, etc.)

### ✅ Error Handling
- Automatic rollback if update fails
- Clear error messages
- Non-critical failures (like shortcut recreation) don't block the update

### ✅ User Experience
- Smooth, automatic restart
- No manual intervention required
- Progress messages during update

## Security Considerations

- The updater script uses `-ExecutionPolicy Bypass` to run unsigned scripts
- This is necessary for the update mechanism to work
- Users should be aware that the updater script has elevated permissions
- Consider code signing the updater script for production use

## Testing

To test the Windows update mechanism:

1. Build the application for Windows
2. Install it using the installer
3. Trigger an update from the UI
4. Verify:
   - The application exits cleanly
   - The updater script runs
   - The binary is replaced
   - Shortcuts are recreated
   - The application restarts

## Troubleshooting

### Update Fails: "File is locked"
- The updater script waits up to 30 seconds for the main process to exit
- If it still fails, check for other processes holding file handles
- Consider increasing the wait time in the script

### Shortcuts Not Recreated
- Check PowerShell execution policy: `Get-ExecutionPolicy`
- Verify the user has permissions to create shortcuts
- Check Windows Event Viewer for PowerShell errors

### Application Doesn't Restart
- Check if the executable path is correct
- Verify the application can be launched manually
- Check Windows Event Viewer for errors

## Future Improvements

- [ ] Add progress reporting to the UI during update
- [ ] Support for delta updates (smaller downloads)
- [ ] Code signing for the updater script
- [ ] Support for silent updates (no user interaction)
- [ ] Rollback mechanism if new version fails to start

