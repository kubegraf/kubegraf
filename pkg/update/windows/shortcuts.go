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
)

// ShortcutConfig contains configuration for creating shortcuts
type ShortcutConfig struct {
	TargetPath      string // Path to executable
	InstallDir      string // Installation directory
	AppName         string // Application name
	IconPath        string // Path to icon file (.ico)
	CreateDesktop   bool   // Whether to create desktop shortcut
	CreateStartMenu bool   // Whether to create start menu shortcut
}

// CreateShortcuts creates Windows shortcuts using PowerShell
func CreateShortcuts(config ShortcutConfig) error {
	if runtime.GOOS != "windows" {
		return fmt.Errorf("shortcuts can only be created on Windows")
	}

	if config.TargetPath == "" {
		return fmt.Errorf("target path is required")
	}

	appName := config.AppName
	if appName == "" {
		appName = "KubeGraf"
	}

	installDir := config.InstallDir
	if installDir == "" {
		installDir = filepath.Dir(config.TargetPath)
	}

	// PowerShell script to create shortcuts
	script := fmt.Sprintf(`$ErrorActionPreference = "Stop"

$TargetPath = "%s"
$InstallDir = "%s"
$AppName = "%s"
$IconPath = "%s"
$CreateDesktop = $%t
$CreateStartMenu = $%t

$shell = New-Object -ComObject WScript.Shell

# Start Menu shortcut
if ($CreateStartMenu) {
    try {
        $startMenuPath = "$env:APPDATA\Microsoft\Windows\Start Menu\Programs\$AppName.lnk"
        $startMenuDir = Split-Path $startMenuPath -Parent
        if (-not (Test-Path $startMenuDir)) {
            New-Item -ItemType Directory -Path $startMenuDir -Force | Out-Null
        }
        
        $shortcut = $shell.CreateShortcut($startMenuPath)
        $shortcut.TargetPath = $TargetPath
        $shortcut.Arguments = "web"
        $shortcut.WorkingDirectory = $InstallDir
        $shortcut.Description = "Launch $AppName Web Dashboard"
        if ($IconPath -and (Test-Path $IconPath)) {
            $shortcut.IconLocation = "$IconPath,0"
        }
        $shortcut.Save()
        Write-Host "✓ Start Menu shortcut created: $startMenuPath"
    } catch {
        Write-Host "⚠️  Failed to create Start Menu shortcut: $_"
    }
}

# Desktop shortcut
if ($CreateDesktop) {
    try {
        $desktopPath = "$env:USERPROFILE\Desktop\$AppName.lnk"
        $shortcut = $shell.CreateShortcut($desktopPath)
        $shortcut.TargetPath = $TargetPath
        $shortcut.Arguments = "web"
        $shortcut.WorkingDirectory = $InstallDir
        $shortcut.Description = "Launch $AppName Web Dashboard"
        if ($IconPath -and (Test-Path $IconPath)) {
            $shortcut.IconLocation = "$IconPath,0"
        }
        $shortcut.Save()
        Write-Host "✓ Desktop shortcut created: $desktopPath"
    } catch {
        Write-Host "⚠️  Failed to create Desktop shortcut: $_"
    }
}
`,
		config.TargetPath,
		installDir,
		appName,
		config.IconPath,
		config.CreateStartMenu,
		config.CreateDesktop,
	)

	// Create temporary PowerShell script
	tmpDir := os.TempDir()
	scriptPath := filepath.Join(tmpDir, "kubegraf-create-shortcuts.ps1")
	defer os.Remove(scriptPath)

	if err := os.WriteFile(scriptPath, []byte(script), 0644); err != nil {
		return fmt.Errorf("failed to create shortcut script: %w", err)
	}

	// Execute PowerShell script
	cmd := exec.Command("powershell.exe", "-ExecutionPolicy", "Bypass", "-File", scriptPath)
	output, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("failed to create shortcuts: %w (output: %s)", err, string(output))
	}

	return nil
}

// ShortcutExists checks if a shortcut exists
func ShortcutExists(shortcutPath string) bool {
	if runtime.GOOS != "windows" {
		return false
	}
	_, err := os.Stat(shortcutPath)
	return err == nil
}

// GetDesktopShortcutPath returns the path to the desktop shortcut
func GetDesktopShortcutPath(appName string) string {
	if runtime.GOOS != "windows" {
		return ""
	}
	desktop := os.Getenv("USERPROFILE")
	if desktop == "" {
		return ""
	}
	return filepath.Join(desktop, "Desktop", appName+".lnk")
}

// GetStartMenuShortcutPath returns the path to the start menu shortcut
func GetStartMenuShortcutPath(appName string) string {
	if runtime.GOOS != "windows" {
		return ""
	}
	appData := os.Getenv("APPDATA")
	if appData == "" {
		return ""
	}
	return filepath.Join(appData, "Microsoft", "Windows", "Start Menu", "Programs", appName+".lnk")
}

// ShouldRecreateDesktopShortcut checks if desktop shortcut should be recreated
func ShouldRecreateDesktopShortcut(appName string) bool {
	shortcutPath := GetDesktopShortcutPath(appName)
	if shortcutPath == "" {
		return false
	}
	return ShortcutExists(shortcutPath)
}

// ShouldRecreateStartMenuShortcut checks if start menu shortcut should be recreated
func ShouldRecreateStartMenuShortcut(appName string) bool {
	shortcutPath := GetStartMenuShortcutPath(appName)
	if shortcutPath == "" {
		return false
	}
	return ShortcutExists(shortcutPath)
}

