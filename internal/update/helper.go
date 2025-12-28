// Copyright 2025 KubeGraf Contributors
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package update

import (
	"fmt"
	"os"
	"os/exec"
	"runtime"
	"strings"
	"time"
)

// WindowsUpdaterConfig contains configuration for Windows updater script
type WindowsUpdaterConfig struct {
	ExecPath      string
	NewBinaryPath string
	InstallDir    string
	ExeName       string
	ProcessName   string
	AppName       string
	IconPath      string
	AutoRestart   bool
}

// UnixUpdaterConfig contains configuration for Unix updater script
type UnixUpdaterConfig struct {
	ExecPath      string
	NewBinaryPath string
	ProcessName   string
	Args          []string
	AutoRestart   bool
}

// generateWindowsUpdaterScript generates a PowerShell script for Windows updates
func generateWindowsUpdaterScript(config WindowsUpdaterConfig) string {
	// Escape paths for PowerShell
	escape := func(s string) string {
		s = strings.ReplaceAll(s, "`", "``")
		s = strings.ReplaceAll(s, "$", "`$")
		s = strings.ReplaceAll(s, "\"", "`\"")
		return s
	}

	autoRestartCmd := ""
	if config.AutoRestart {
		autoRestartCmd = `
# Step 5: Restart the application
try {
    Write-Host "🚀 Restarting $AppName..." -ForegroundColor Cyan
    Start-Sleep -Seconds 1

    $startInfo = New-Object System.Diagnostics.ProcessStartInfo
    $startInfo.FileName = $ExecPath
    $startInfo.Arguments = "web"
    $startInfo.WorkingDirectory = $InstallDir
    $startInfo.UseShellExecute = $true
    $startInfo.WindowStyle = [System.Diagnostics.ProcessWindowStyle]::Normal

    [System.Diagnostics.Process]::Start($startInfo) | Out-Null
    Write-Host "✓ $AppName restarted successfully" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to restart application: $_" -ForegroundColor Red
    Write-Host "Please manually start $AppName from the Start Menu or Desktop shortcut" -ForegroundColor Yellow
    exit 1
}`
	}

	return fmt.Sprintf(`# KubeGraf Windows Updater Script
# Auto-generated helper script for self-update

$ErrorActionPreference = "Stop"

$ExecPath = "%s"
$NewBinaryPath = "%s"
$InstallDir = "%s"
$ExeName = "%s"
$ProcessName = "%s"
$AppName = "%s"
$IconPath = "%s"

Write-Host "🔄 KubeGraf Updater Starting..." -ForegroundColor Cyan

# Wait for the main process to exit (max 30 seconds)
$maxWait = 30
$waited = 0
while ($waited -lt $maxWait) {
    $process = Get-Process -Name $ProcessName -ErrorAction SilentlyContinue
    if ($null -eq $process) {
        Write-Host "✓ Main process has exited" -ForegroundColor Green
        break
    }
    Start-Sleep -Seconds 1
    $waited++
    Write-Host "⏳ Waiting for main process to exit... ($waited/$maxWait)" -ForegroundColor Yellow
}

if ($waited -ge $maxWait) {
    Write-Host "⚠️  Main process did not exit in time, attempting to terminate..." -ForegroundColor Yellow
    try {
        Stop-Process -Name $ProcessName -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 2
    } catch {
        Write-Host "❌ Failed to terminate process: $_" -ForegroundColor Red
        exit 1
    }
}

# Additional wait for file handle release
Start-Sleep -Seconds 2

# Step 1: Backup old binary
$backupPath = "$ExecPath.old"
try {
    if (Test-Path $ExecPath) {
        Write-Host "📦 Backing up old binary..." -ForegroundColor Cyan
        if (Test-Path $backupPath) {
            Remove-Item $backupPath -Force
        }
        Move-Item -Path $ExecPath -Destination $backupPath -Force
        Write-Host "✓ Backup created: $backupPath" -ForegroundColor Green
    }
} catch {
    Write-Host "❌ Failed to backup old binary: $_" -ForegroundColor Red
    exit 1
}

# Step 2: Install new binary
try {
    Write-Host "📥 Installing new binary..." -ForegroundColor Cyan
    if (-not (Test-Path $NewBinaryPath)) {
        Write-Host "❌ New binary not found: $NewBinaryPath" -ForegroundColor Red
        if (Test-Path $backupPath) {
            Move-Item -Path $backupPath -Destination $ExecPath -Force
        }
        exit 1
    }

    Copy-Item -Path $NewBinaryPath -Destination $ExecPath -Force
    Write-Host "✓ New binary installed" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to install new binary: $_" -ForegroundColor Red
    if (Test-Path $backupPath) {
        Write-Host "🔄 Restoring backup..." -ForegroundColor Yellow
        Move-Item -Path $backupPath -Destination $ExecPath -Force
    }
    exit 1
}

# Step 3: Verify new binary
try {
    Write-Host "🔍 Verifying new binary..." -ForegroundColor Cyan
    $versionOutput = & $ExecPath --version 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "Version check failed"
    }
    Write-Host "✓ New binary verified: $versionOutput" -ForegroundColor Green
} catch {
    Write-Host "❌ Verification failed, restoring backup..." -ForegroundColor Red
    if (Test-Path $backupPath) {
        Move-Item -Path $backupPath -Destination $ExecPath -Force
        Write-Host "✓ Backup restored" -ForegroundColor Green
    }
    exit 1
}

# Step 4: Create/Update shortcuts and add to PATH
try {
    Write-Host "🔗 Setting up shortcuts and PATH..." -ForegroundColor Cyan
    & {
        $ErrorActionPreference = "Continue"

        $shell = New-Object -ComObject WScript.Shell

        # Start Menu shortcut (always create/update)
        $startMenuPath = "$env:APPDATA\Microsoft\Windows\Start Menu\Programs\$AppName.lnk"
        $startMenuDir = Split-Path $startMenuPath -Parent
        if (-not (Test-Path $startMenuDir)) {
            New-Item -ItemType Directory -Path $startMenuDir -Force | Out-Null
        }

        $shortcut = $shell.CreateShortcut($startMenuPath)
        $shortcut.TargetPath = $ExecPath
        $shortcut.Arguments = "web"
        $shortcut.WorkingDirectory = $InstallDir
        $shortcut.Description = "Launch $AppName Web Dashboard"
        if ($IconPath -and (Test-Path $IconPath)) {
            $shortcut.IconLocation = "$IconPath,0"
        }
        $shortcut.Save()
        Write-Host "✓ Start Menu shortcut created/updated" -ForegroundColor Green

        # Desktop shortcut (always create/update for EXE installations)
        $desktopPath = "$env:USERPROFILE\Desktop\$AppName.lnk"
        $shortcut = $shell.CreateShortcut($desktopPath)
        $shortcut.TargetPath = $ExecPath
        $shortcut.Arguments = "web"
        $shortcut.WorkingDirectory = $InstallDir
        $shortcut.Description = "Launch $AppName Web Dashboard"
        if ($IconPath -and (Test-Path $IconPath)) {
            $shortcut.IconLocation = "$IconPath,0"
        }
        $shortcut.Save()
        Write-Host "✓ Desktop shortcut created/updated" -ForegroundColor Green

        # Add to User PATH (if not already present)
        $currentPath = [Environment]::GetEnvironmentVariable("PATH", "User")
        if ($currentPath -notlike "*$InstallDir*") {
            Write-Host "📁 Adding $InstallDir to User PATH..." -ForegroundColor Cyan
            $newPath = "$currentPath;$InstallDir"
            [Environment]::SetEnvironmentVariable("PATH", $newPath, "User")
            Write-Host "✓ Added to PATH (restart terminal to use 'kubegraf' command)" -ForegroundColor Green
        } else {
            Write-Host "✓ Already in PATH" -ForegroundColor Green
        }
    }
} catch {
    Write-Host "⚠️  Failed to update shortcuts/PATH: $_" -ForegroundColor Yellow
    # Non-critical, continue with update
}

# Cleanup backup after delay (in background)
Start-Job -ScriptBlock {
    Start-Sleep -Seconds 30
    $backupPath = $using:backupPath
    if (Test-Path $backupPath) {
        Remove-Item $backupPath -Force -ErrorAction SilentlyContinue
    }
    # Also cleanup temp files
    $tmpDir = Join-Path $env:TEMP "kubegraf-update"
    if (Test-Path $tmpDir) {
        Remove-Item $tmpDir -Recurse -Force -ErrorAction SilentlyContinue
    }
} | Out-Null

%s

Write-Host "✅ Update completed successfully!" -ForegroundColor Green
Start-Sleep -Seconds 2
`,
		escape(config.ExecPath),
		escape(config.NewBinaryPath),
		escape(config.InstallDir),
		escape(config.ExeName),
		escape(config.ProcessName),
		escape(config.AppName),
		escape(config.IconPath),
		autoRestartCmd,
	)
}

// generateUnixUpdaterScript generates a shell script for Unix updates
func generateUnixUpdaterScript(config UnixUpdaterConfig) string {
	// Escape for shell
	escape := func(s string) string {
		return strings.ReplaceAll(s, "'", "'\\''")
	}

	// Build args string
	argsStr := ""
	if len(config.Args) > 0 {
		escapedArgs := make([]string, len(config.Args))
		for i, arg := range config.Args {
			escapedArgs[i] = escape(arg)
		}
		argsStr = strings.Join(escapedArgs, " ")
	}

	restartCmd := ""
	if config.AutoRestart {
		restartCmd = fmt.Sprintf(`
# Step 5: Restart the application
echo "🚀 Restarting KubeGraf..."
sleep 1

if [ -n "$ARGS" ]; then
    nohup "$EXEC_PATH" $ARGS > /dev/null 2>&1 &
else
    nohup "$EXEC_PATH" web > /dev/null 2>&1 &
fi

NEW_PID=$!
sleep 1

if ps -p $NEW_PID > /dev/null 2>&1; then
    echo "✓ KubeGraf restarted successfully (PID: $NEW_PID)"
else
    echo "❌ Failed to restart application"
    exit 1
fi`)
	}

	return fmt.Sprintf(`#!/bin/sh
# KubeGraf Unix Updater Script
# Auto-generated helper script for self-update

set -e

EXEC_PATH='%s'
NEW_BINARY_PATH='%s'
PROCESS_NAME='%s'
ARGS='%s'

echo "🔄 KubeGraf Updater Starting..."

# Wait for main process to exit (max 30 seconds)
MAX_WAIT=30
WAITED=0
while [ $WAITED -lt $MAX_WAIT ]; do
    if ! pgrep -f "$PROCESS_NAME" > /dev/null 2>&1; then
        echo "✓ Main process has exited"
        break
    fi
    sleep 1
    WAITED=$((WAITED + 1))
    echo "⏳ Waiting for main process to exit... ($WAITED/$MAX_WAIT)"
done

if [ $WAITED -ge $MAX_WAIT ]; then
    echo "⚠️  Main process did not exit in time, attempting to terminate..."
    pkill -f "$PROCESS_NAME" 2>/dev/null || true
    sleep 2
fi

# Additional wait for file handle release
sleep 2

# Step 1: Backup old binary
BACKUP_PATH="${EXEC_PATH}.old"
if [ -f "$EXEC_PATH" ]; then
    echo "📦 Backing up old binary..."
    if [ -f "$BACKUP_PATH" ]; then
        rm -f "$BACKUP_PATH"
    fi
    mv "$EXEC_PATH" "$BACKUP_PATH"
    echo "✓ Backup created: $BACKUP_PATH"
fi

# Step 2: Install new binary
if [ ! -f "$NEW_BINARY_PATH" ]; then
    echo "❌ New binary not found: $NEW_BINARY_PATH"
    if [ -f "$BACKUP_PATH" ]; then
        echo "🔄 Restoring backup..."
        mv "$BACKUP_PATH" "$EXEC_PATH"
    fi
    exit 1
fi

echo "📥 Installing new binary..."
cp "$NEW_BINARY_PATH" "$EXEC_PATH"
chmod +x "$EXEC_PATH"
echo "✓ New binary installed"

# Step 3: Verify new binary
echo "🔍 Verifying new binary..."
if ! "$EXEC_PATH" --version > /dev/null 2>&1; then
    echo "❌ Verification failed, restoring backup..."
    if [ -f "$BACKUP_PATH" ]; then
        mv "$BACKUP_PATH" "$EXEC_PATH"
        echo "✓ Backup restored"
    fi
    exit 1
fi
echo "✓ New binary verified"

# Step 4: Cleanup backup and temp files (in background)
(
    sleep 30
    rm -f "$BACKUP_PATH" 2>/dev/null
    rm -rf "/tmp/kubegraf-update" 2>/dev/null
) &

%s

echo "✅ Update completed successfully!"
sleep 2
`,
		escape(config.ExecPath),
		escape(config.NewBinaryPath),
		config.ProcessName,
		argsStr,
		restartCmd,
	)
}

// launchWindowsUpdater launches the PowerShell updater script on Windows
func launchWindowsUpdater(scriptPath string) error {
	if runtime.GOOS != "windows" {
		return fmt.Errorf("Windows updater can only be launched on Windows")
	}

	cmd := exec.Command("powershell.exe", "-ExecutionPolicy", "Bypass", "-File", scriptPath)
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr

	if err := cmd.Start(); err != nil {
		return fmt.Errorf("failed to launch updater: %w", err)
	}

	// Give it a moment to start
	time.Sleep(500 * time.Millisecond)

	return nil
}

// launchUnixUpdater launches the shell updater script on Unix
func launchUnixUpdater(scriptPath string) error {
	if runtime.GOOS == "windows" {
		return fmt.Errorf("Unix updater cannot be launched on Windows")
	}

	cmd := exec.Command("sh", scriptPath)
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr

	if err := cmd.Start(); err != nil {
		return fmt.Errorf("failed to launch updater: %w", err)
	}

	// Give it a moment to start
	time.Sleep(500 * time.Millisecond)

	return nil
}
