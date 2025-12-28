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
	processNameEscaped := escapePowerShellString(strings.TrimSuffix(exeName, ".exe"))

	// PowerShell script content
	script := fmt.Sprintf(`# KubeGraf Windows Updater Script
# This script handles the update process after the main application exits

$ErrorActionPreference = "Stop"

$ExecPath = "%s"
$NewBinaryPath = "%s"
$InstallDir = "%s"
$ExeName = "%s"
$AppName = "%s"
$ProcessName = "%s"
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

# Additional wait to ensure file handles are released
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
        # Try to restore backup
        if (Test-Path $backupPath) {
            Move-Item -Path $backupPath -Destination $ExecPath -Force
        }
        exit 1
    }
    
    Copy-Item -Path $NewBinaryPath -Destination $ExecPath -Force
    Write-Host "✓ New binary installed" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to install new binary: $_" -ForegroundColor Red
    # Try to restore backup
    if (Test-Path $backupPath) {
        Write-Host "🔄 Restoring backup..." -ForegroundColor Yellow
        Move-Item -Path $backupPath -Destination $ExecPath -Force
    }
    exit 1
}

# Step 3: Create/Update shortcuts and add to PATH
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
}

Write-Host "✅ Update completed successfully!" -ForegroundColor Green
Start-Sleep -Seconds 2
`,
		execPathEscaped,
		newBinaryPathEscaped,
		installDirEscaped,
		exeNameEscaped,
		appNameEscaped,
		processNameEscaped,
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
	launchScript := fmt.Sprintf(
		`Start-Process -FilePath "powershell.exe" -ArgumentList "-ExecutionPolicy", "Bypass", "-File", "%s" -WindowStyle Normal`,
		strings.ReplaceAll(scriptPath, `"`, `\"`),
	)

	cmd := exec.Command("powershell.exe", "-ExecutionPolicy", "Bypass", "-Command", launchScript)

	// Don't wait for the script to complete - it will run after we exit
	// Don't attach stdout/stderr since we're detaching
	cmd.Stdout = nil
	cmd.Stderr = nil

	if err := cmd.Start(); err != nil {
		return fmt.Errorf("failed to launch updater: %w", err)
	}

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

