# Unix/Linux/macOS Auto-Update Package

This package provides Unix-like system-specific functionality for handling application updates on Linux and macOS systems.

## Overview

The Unix update mechanism uses a separate shell script that runs after the main application exits. This approach solves the problem of replacing a running executable on Unix systems, which is not possible due to file locking (similar to Windows).

## Architecture

### Update Flow

1. **Download Phase**: The main application downloads the new binary to a temporary location
2. **Updater Script Creation**: A shell script is created that will handle the update
3. **Application Exit**: The main application exits, releasing file locks
4. **Updater Execution**: The shell script:
   - Waits for the main process to fully exit
   - Backs up the old binary
   - Replaces the binary with the new one
   - Verifies the new binary works
   - Restarts the application
   - Cleans up temporary files

### Components

#### `updater.go`
- `CreateUpdaterScript()`: Creates a shell script that handles the update process
- `LaunchUpdater()`: Launches the updater script
- `UpdateConfig`: Configuration for the update process

## Usage

The Unix update mechanism is automatically used when `PerformUpdate()` is called on a Unix-like system. The main application code doesn't need to handle Unix-specific logic - it's all abstracted in this package.

### Example

```go
import "github.com/kubegraf/kubegraf/pkg/update/unix"

// This is called automatically by PerformUpdate() on Unix systems
config := unix.UpdateConfig{
    ExecPath:      "/usr/local/bin/kubegraf",
    NewBinaryPath: "/tmp/kubegraf-update",
    AppName:       "KubeGraf",
    Args:          []string{"web", "--port=3000"},
}

scriptPath, err := unix.CreateUpdaterScript(config)
if err != nil {
    return err
}

if err := unix.LaunchUpdater(scriptPath); err != nil {
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
- Verifies new binary works before completing update

### ✅ Process Management
- Uses `pgrep` to detect process exit
- Graceful termination with timeout
- Proper process detachment using `nohup`
- Verifies new process started successfully

### ✅ Error Handling
- Automatic rollback if update fails
- Binary verification before completing
- Clear error messages
- Backup restoration on failure

### ✅ User Experience
- Smooth, automatic restart
- No manual intervention required
- Progress messages during update

## Technical Details

### Shell Script Generation

The updater script is dynamically generated with:
- Proper path escaping for shell scripts
- Process name detection from executable name
- Command line argument preservation
- Error handling and logging

### Process Management

- Waits up to 30 seconds for main process to exit
- Uses `pgrep -f` to detect process by name
- Force terminates if necessary (with timeout)
- Additional 2-second wait for file handle release
- Uses `nohup` to detach new process from terminal

### Binary Verification

- Tests new binary with `--version` flag before completing
- Restores backup if verification fails
- Ensures update doesn't break the application

## Security Considerations

- Script runs with user permissions (not root)
- Proper path escaping prevents injection attacks
- Backup mechanism allows rollback on failure
- Binary verification ensures integrity

## Testing

To test the Unix update mechanism:

1. Build the application for Linux or macOS
2. Install it (e.g., to `/usr/local/bin/kubegraf`)
3. Trigger an update from the UI
4. Verify:
   - The application exits cleanly
   - The updater script runs
   - The binary is replaced
   - The application restarts automatically
5. Verify:
   - New version is running
   - No broken references
   - Process is running correctly

## Troubleshooting

### Update Fails: "File is locked"
**Solution**: The updater script waits for the process to exit. If it still fails:
- Check for other processes holding file handles: `lsof /path/to/kubegraf`
- Increase wait time in updater script
- Check system logs for errors

### Application Doesn't Restart
**Solution**:
- Verify executable path is correct
- Check if application can be launched manually
- Review updater script logs
- Check system logs (journalctl on Linux, Console.app on macOS)

### Binary Verification Fails
**Solution**:
- Check if new binary has execute permissions
- Verify binary is compatible with system architecture
- Check for missing dependencies
- Review backup restoration logs

## Differences from Windows Updater

1. **Script Language**: Uses shell script instead of PowerShell
2. **Process Detection**: Uses `pgrep` instead of `Get-Process`
3. **Shortcuts**: Unix systems don't have desktop shortcuts like Windows
4. **Path Format**: Uses forward slashes instead of backslashes
5. **Execution**: Uses `sh` instead of `powershell.exe`

## Future Improvements

- [ ] **Progress Reporting**: Show update progress in UI
- [ ] **Delta Updates**: Support for incremental updates
- [ ] **Service Integration**: Support for systemd/launchd services
- [ ] **Silent Updates**: Option for background updates
- [ ] **Rollback UI**: User-visible rollback mechanism
- [ ] **Update Verification**: Enhanced binary verification

