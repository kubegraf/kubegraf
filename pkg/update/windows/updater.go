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

package windows

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"time"
)

// UpdateConfig contains configuration for Windows update process
type UpdateConfig struct {
	ExecPath      string // Path to current executable
	NewBinaryPath string // Path to downloaded new binary
	AppName       string // Application name (e.g., "KubeGraf")
	AppExeName    string // Executable name (e.g., "kubegraf.exe")
	InstallDir    string // Installation directory (e.g., "C:\Program Files\KubeGraf")
	IconPath      string // Path to icon file (.ico) for shortcuts
	ProcessPID    int    // Current process ID (for reliable process detection)
	NewVersion    string // New version being installed (for status file)
}

// CreateUpdaterScript creates a PowerShell script that will handle the update
// This script runs after the main application exits
func CreateUpdaterScript(config UpdateConfig) (string, error) {
	if runtime.GOOS != "windows" {
		return "", fmt.Errorf("Windows updater can only be created on Windows")
	}

	// Get temp directory
	tmpDir := os.TempDir()
	scriptPath := filepath.Join(tmpDir, "kubegraf-updater.ps1")

	// Determine installation directory
	installDir := config.InstallDir
	if installDir == "" {
		// Try to detect from executable path
		execDir := filepath.Dir(config.ExecPath)
		// Check if we're in Program Files
		if strings.Contains(strings.ToLower(execDir), "program files") {
			installDir = execDir
		} else {
			// Use executable directory as fallback
			installDir = execDir
		}
	}

	// Get executable name
	exeName := config.AppExeName
	if exeName == "" {
		exeName = filepath.Base(config.ExecPath)
	}

	// Get app name
	appName := config.AppName
	if appName == "" {
		appName = "KubeGraf"
	}

	// Escape paths for PowerShell strings (escape backticks, dollar signs, and quotes)
	escapePowerShellString := func(s string) string {
		s = strings.ReplaceAll(s, "`", "``")   // Escape backticks
		s = strings.ReplaceAll(s, "$", "`$")  // Escape dollar signs
		s = strings.ReplaceAll(s, "\"", "`\"") // Escape quotes
		return s
	}

	execPathEscaped := escapePowerShellString(config.ExecPath)
	newBinaryPathEscaped := escapePowerShellString(config.NewBinaryPath)
	installDirEscaped := escapePowerShellString(installDir)
	exeNameEscaped := escapePowerShellString(exeName)
	appNameEscaped := escapePowerShellString(appName)
	newVersionEscaped := escapePowerShellString(config.NewVersion)
	processPID := config.ProcessPID

	// PowerShell script content
	script := fmt.Sprintf(`# KubeGraf Windows Updater Script
# This script handles the update process after the main application exits

$ErrorActionPreference = "Stop"

$ExecPath = "%s"
$NewBinaryPath = "%s"
$InstallDir = "%s"
$ExeName = "%s"
$AppName = "%s"
$ProcessPID = %d
$NewVersion = "%s"
$IconPath = "%s"
$StatusFile = "$env:TEMP\kubegraf-update-status.json"

Write-Host "[UPDATE] KubeGraf Updater Starting..." -ForegroundColor Cyan
Write-Host "   Target PID: $ProcessPID" -ForegroundColor Cyan
Write-Host "   New Version: $NewVersion" -ForegroundColor Cyan

# Wait for the main process to exit (max 60 seconds)
$maxWait = 120  # 60 seconds (500ms intervals)
$waited = 0
while ($waited -lt $maxWait) {
    $process = Get-Process -Id $ProcessPID -ErrorAction SilentlyContinue
    if ($null -eq $process) {
        Write-Host "[OK] Main process (PID $ProcessPID) has exited" -ForegroundColor Green
        break
    }
    Start-Sleep -Milliseconds 500
    $waited++
    if ($waited %% 2 -eq 0) {  # Log every second
        Write-Host "[WAIT] Waiting for process to exit... ($($waited/2)/60 seconds)" -ForegroundColor Yellow
    }
}

if ($waited -ge $maxWait) {
    Write-Host "[WARN] Process did not exit in time, attempting to terminate PID $ProcessPID..." -ForegroundColor Yellow
    try {
        Stop-Process -Id $ProcessPID -Force -ErrorAction Stop
        Start-Sleep -Seconds 2
        Write-Host "[OK] Process terminated forcefully" -ForegroundColor Yellow
    } catch {
        Write-Host "[ERROR] Failed to terminate process: $_" -ForegroundColor Red
        @{
            success = $false
            error = "Process did not exit and could not be terminated: $($_.Exception.Message)"
            timestamp = (Get-Date -Format "o")
        } | ConvertTo-Json | Out-File $StatusFile -Encoding UTF8
        exit 1
    }
}

# Additional wait to ensure file handles are released (3 seconds for safety)
Write-Host "[WAIT] Waiting for file handles to release..." -ForegroundColor Cyan
Start-Sleep -Seconds 3

# Step 1: Backup old binary
$backupPath = "$ExecPath.old"
try {
    if (Test-Path $ExecPath) {
        Write-Host "[BACKUP] Backing up old binary..." -ForegroundColor Cyan
        if (Test-Path $backupPath) {
            Remove-Item $backupPath -Force
        }
        Move-Item -Path $ExecPath -Destination $backupPath -Force
        Write-Host "[OK] Backup created: $backupPath" -ForegroundColor Green
    }
} catch {
    Write-Host "[ERROR] Failed to backup old binary: $_" -ForegroundColor Red
    exit 1
}

# Step 2: Install new binary with retry logic
Write-Host "[INSTALL] Installing new binary..." -ForegroundColor Cyan
if (-not (Test-Path $NewBinaryPath)) {
    Write-Host "[ERROR] New binary not found: $NewBinaryPath" -ForegroundColor Red
    # Try to restore backup
    if (Test-Path $backupPath) {
        Move-Item -Path $backupPath -Destination $ExecPath -Force
    }
    @{
        success = $false
        error = "New binary not found at: $NewBinaryPath"
        timestamp = (Get-Date -Format "o")
    } | ConvertTo-Json | Out-File $StatusFile -Encoding UTF8
    exit 1
}

# Retry file replacement (5 attempts with exponential backoff)
$maxRetries = 5
$retryCount = 0
$copySuccess = $false
$lastError = $null

while ($retryCount -lt $maxRetries) {
    try {
        Copy-Item -Path $NewBinaryPath -Destination $ExecPath -Force -ErrorAction Stop
        $copySuccess = $true
        Write-Host "[OK] New binary installed successfully" -ForegroundColor Green
        break
    } catch {
        $retryCount++
        $lastError = $_.Exception.Message
        if ($retryCount -lt $maxRetries) {
            $waitTime = [Math]::Pow(2, $retryCount)  # Exponential backoff: 2, 4, 8, 16 seconds
            Write-Host "[WARN] Copy failed (attempt $retryCount/$maxRetries): $lastError" -ForegroundColor Yellow
            Write-Host "[WAIT] Retrying in $waitTime seconds..." -ForegroundColor Yellow
            Start-Sleep -Seconds $waitTime
        } else {
            Write-Host "[ERROR] Failed to install new binary after $maxRetries attempts" -ForegroundColor Red
            Write-Host "   Last error: $lastError" -ForegroundColor Red
        }
    }
}

if (-not $copySuccess) {
    # Restore backup
    if (Test-Path $backupPath) {
        Write-Host "[UPDATE] Restoring backup..." -ForegroundColor Yellow
        try {
            Move-Item -Path $backupPath -Destination $ExecPath -Force -ErrorAction Stop
            Write-Host "[OK] Backup restored successfully" -ForegroundColor Green
        } catch {
            Write-Host "[ERROR] Failed to restore backup: $($_.Exception.Message)" -ForegroundColor Red
            Write-Host "   CRITICAL: Manual restore required from: $backupPath" -ForegroundColor Red
        }
    }

    # Write failure status
    @{
        success = $false
        error = "Failed to replace binary after $maxRetries attempts. Last error: $lastError"
        timestamp = (Get-Date -Format "o")
        backupPath = $backupPath
    } | ConvertTo-Json | Out-File $StatusFile -Encoding UTF8
    exit 1
}

# Step 3: Create/Update shortcuts and add to PATH
try {
    Write-Host "[SETUP] Setting up shortcuts and PATH..." -ForegroundColor Cyan
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
        Write-Host "[OK] Start Menu shortcut created/updated" -ForegroundColor Green

        # Desktop shortcut (always create/update for auto-update)
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
        Write-Host "[OK] Desktop shortcut created/updated" -ForegroundColor Green

        # Add to User PATH (if not already present)
        $currentPath = [Environment]::GetEnvironmentVariable("PATH", "User")
        if ($currentPath -notlike "*$InstallDir*") {
            Write-Host "[PATH] Adding $InstallDir to User PATH..." -ForegroundColor Cyan
            $newPath = "$currentPath;$InstallDir"
            [Environment]::SetEnvironmentVariable("PATH", $newPath, "User")
            Write-Host "[OK] Added to PATH (restart terminal to use 'kubegraf' command)" -ForegroundColor Green
        } else {
            Write-Host "[OK] Already in PATH" -ForegroundColor Green
        }
    }
} catch {
    Write-Host "[WARN] Failed to update shortcuts/PATH: $_" -ForegroundColor Yellow
    # Non-critical, continue
}

# Step 4: Clean up backup after delay
Start-Job -ScriptBlock {
    Start-Sleep -Seconds 10
    $backupPath = $using:backupPath
    if (Test-Path $backupPath) {
        Remove-Item $backupPath -Force -ErrorAction SilentlyContinue
    }
} | Out-Null

# Step 5: Write success status
try {
    Write-Host "[SUCCESS] Writing success status..." -ForegroundColor Cyan
    @{
        success = $true
        version = $NewVersion
        timestamp = (Get-Date -Format "o")
    } | ConvertTo-Json | Out-File $StatusFile -Encoding UTF8
    Write-Host "[OK] Status file written" -ForegroundColor Green
} catch {
    Write-Host "[WARN] Failed to write status file: $_" -ForegroundColor Yellow
    # Non-critical, continue
}

# Step 6: Restart the application
try {
    Write-Host "[START] Restarting $AppName..." -ForegroundColor Cyan
    Start-Sleep -Seconds 1

    $startInfo = New-Object System.Diagnostics.ProcessStartInfo
    $startInfo.FileName = $ExecPath
    $startInfo.Arguments = "web"
    $startInfo.WorkingDirectory = $InstallDir
    $startInfo.UseShellExecute = $true
    $startInfo.WindowStyle = [System.Diagnostics.ProcessWindowStyle]::Normal

    [System.Diagnostics.Process]::Start($startInfo) | Out-Null
    Write-Host "[OK] $AppName restarted successfully" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Failed to restart application: $_" -ForegroundColor Red
    Write-Host "Please manually start $AppName from the Start Menu or Desktop shortcut" -ForegroundColor Yellow

    # Update status file with restart failure (but update was successful)
    @{
        success = $true
        version = $NewVersion
        timestamp = (Get-Date -Format "o")
        warning = "Update successful but app restart failed. Please start manually."
    } | ConvertTo-Json | Out-File $StatusFile -Encoding UTF8

    exit 1
}

Write-Host "[SUCCESS] Update completed successfully!" -ForegroundColor Green
Start-Sleep -Seconds 2
`,
		execPathEscaped,
		newBinaryPathEscaped,
		installDirEscaped,
		exeNameEscaped,
		appNameEscaped,
		processPID,
		newVersionEscaped,
		escapePowerShellString(config.IconPath),
	)

	// Write script to file
	if err := os.WriteFile(scriptPath, []byte(script), 0644); err != nil {
		return "", fmt.Errorf("failed to create updater script: %w", err)
	}

	return scriptPath, nil
}

// LaunchUpdater launches the PowerShell updater script in a fully detached process
func LaunchUpdater(scriptPath string) error {
	if runtime.GOOS != "windows" {
		return fmt.Errorf("Windows updater can only be launched on Windows")
	}

	// Use Start-Process to launch a truly detached PowerShell process
	// This ensures the script continues running after the main app exits
	// -WindowStyle Normal shows the updater window so users can see progress
	// -NoExit keeps the window open after script completes (for debugging)
	launchScript := fmt.Sprintf(
		`Start-Process -FilePath "powershell.exe" -ArgumentList "-ExecutionPolicy", "Bypass", "-NoExit", "-File", "%s" -WindowStyle Normal`,
		strings.ReplaceAll(scriptPath, `"`, `\"`),
	)

	cmd := exec.Command("powershell.exe", "-ExecutionPolicy", "Bypass", "-Command", launchScript)

	// Attach stdout/stderr for debugging (will show in console)
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr

	fmt.Printf("Launching updater script: %s\n", scriptPath)
	fmt.Printf("Launch command: %s\n", launchScript)

	if err := cmd.Start(); err != nil {
		return fmt.Errorf("failed to launch updater: %w", err)
	}

	fmt.Printf("Updater process started with PID: %d\n", cmd.Process.Pid)

	// Give it a moment to start the detached process
	time.Sleep(1 * time.Second)

	return nil
}

// GetInstallDirectory attempts to detect the installation directory
func GetInstallDirectory(execPath string) string {
	execDir := filepath.Dir(execPath)
	
	// Check if we're in Program Files
	if strings.Contains(strings.ToLower(execDir), "program files") {
		return execDir
	}
	
	// Return executable directory as fallback
	return execDir
}

