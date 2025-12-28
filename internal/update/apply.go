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
	"context"
	"fmt"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"time"
)

// Applier handles applying updates to the current installation
type Applier struct {
	info       *InstallationInfo
	progress   func(UpdateProgress)
}

// NewApplier creates a new update applier
func NewApplier() (*Applier, error) {
	info, err := DetectInstallation()
	if err != nil {
		return nil, fmt.Errorf("failed to detect installation: %w", err)
	}

	return &Applier{
		info: info,
	}, nil
}

// SetProgressCallback sets the progress callback function
func (a *Applier) SetProgressCallback(fn func(UpdateProgress)) {
	a.progress = fn
}

// GetInstallationInfo returns the detected installation information
func (a *Applier) GetInstallationInfo() *InstallationInfo {
	return a.info
}

// Apply downloads and applies an update
func (a *Applier) Apply(ctx context.Context, req ApplyUpdateRequest) (*ApplyUpdateResponse, error) {
	// Report initial progress
	a.reportProgress(UpdateStatusDownloading, 0, "Starting update...")

	// Check if this is a package manager installation and warn if not forced
	if a.info.Method.IsPackageManagerInstall() && !req.ForceUpdate {
		return &ApplyUpdateResponse{
			Success:      false,
			Message:      "Package manager installation detected",
			Warning:      a.info.Method.GetWarningMessage(),
			Status:       UpdateStatusIdle,
			NeedsRestart: false,
		}, nil
	}

	// Create temp directory for download
	tmpDir := filepath.Join(os.TempDir(), "kubegraf-update")
	if err := os.MkdirAll(tmpDir, 0755); err != nil {
		return nil, fmt.Errorf("failed to create temp directory: %w", err)
	}

	// Determine the filename from URL
	urlParts := strings.Split(req.DownloadURL, "/")
	filename := urlParts[len(urlParts)-1]
	downloadPath := filepath.Join(tmpDir, filename)

	// Download the update
	a.reportProgress(UpdateStatusDownloading, 10, "Downloading update...")

	downloader := NewDownloader()
	err := downloader.Download(ctx, DownloadConfig{
		URL:         req.DownloadURL,
		ChecksumURL: req.ChecksumURL,
		DestPath:    downloadPath,
		ProgressFunc: func(dp DownloadProgress) {
			// Map download progress to 10-50% of total progress
			progress := 10 + (dp.Percentage * 0.4)
			a.reportProgress(UpdateStatusDownloading, progress,
				fmt.Sprintf("Downloading: %.1f%% (%.2f MB / %.2f MB)",
					dp.Percentage,
					float64(dp.BytesDownloaded)/(1024*1024),
					float64(dp.BytesTotal)/(1024*1024)))
		},
	})

	if err != nil {
		a.reportProgress(UpdateStatusFailed, 0, fmt.Sprintf("Download failed: %v", err))
		return &ApplyUpdateResponse{
			Success: false,
			Error:   err.Error(),
			Status:  UpdateStatusFailed,
		}, err
	}

	// Verify checksum if we have a checksum URL
	a.reportProgress(UpdateStatusVerifying, 55, "Verifying download...")

	// Extract binary if it's an archive
	binaryPath := downloadPath
	if strings.HasSuffix(downloadPath, ".tar.gz") || strings.HasSuffix(downloadPath, ".zip") {
		a.reportProgress(UpdateStatusVerifying, 60, "Extracting binary...")

		extractedPath := filepath.Join(tmpDir, "kubegraf")
		if runtime.GOOS == "windows" {
			extractedPath += ".exe"
		}

		if err := ExtractBinary(downloadPath, extractedPath); err != nil {
			a.reportProgress(UpdateStatusFailed, 0, fmt.Sprintf("Extraction failed: %v", err))
			return &ApplyUpdateResponse{
				Success: false,
				Error:   err.Error(),
				Status:  UpdateStatusFailed,
			}, err
		}

		binaryPath = extractedPath
	}

	// Make the binary executable (Unix)
	if runtime.GOOS != "windows" {
		os.Chmod(binaryPath, 0755)
	}

	// Apply the update using platform-specific helper
	a.reportProgress(UpdateStatusApplying, 70, "Applying update...")

	if err := a.applyUpdate(binaryPath, req.AutoRestart); err != nil {
		a.reportProgress(UpdateStatusFailed, 0, fmt.Sprintf("Apply failed: %v", err))
		return &ApplyUpdateResponse{
			Success: false,
			Error:   err.Error(),
			Status:  UpdateStatusFailed,
		}, err
	}

	// If auto-restart is enabled, the helper script will handle restart
	// We need to exit to allow the helper to replace the binary
	a.reportProgress(UpdateStatusRestarting, 90, "Restarting application...")

	return &ApplyUpdateResponse{
		Success:      true,
		Message:      "Update applied successfully. Application will restart.",
		Status:       UpdateStatusRestarting,
		NeedsRestart: true,
	}, nil
}

// applyUpdate applies the update using platform-specific methods
func (a *Applier) applyUpdate(newBinaryPath string, autoRestart bool) error {
	execPath := a.info.GetInstallationPath()

	switch runtime.GOOS {
	case "windows":
		return a.applyWindowsUpdate(execPath, newBinaryPath, autoRestart)
	default:
		return a.applyUnixUpdate(execPath, newBinaryPath, autoRestart)
	}
}

// applyWindowsUpdate applies update on Windows using PowerShell helper script
func (a *Applier) applyWindowsUpdate(execPath, newBinaryPath string, autoRestart bool) error {
	// Get installation directory
	installDir := filepath.Dir(execPath)
	exeName := filepath.Base(execPath)
	processName := strings.TrimSuffix(exeName, ".exe")

	// Find icon file for shortcuts
	iconPath := findIconPath(installDir, execPath)

	// Create the PowerShell updater script
	script := generateWindowsUpdaterScript(WindowsUpdaterConfig{
		ExecPath:      execPath,
		NewBinaryPath: newBinaryPath,
		InstallDir:    installDir,
		ExeName:       exeName,
		ProcessName:   processName,
		AppName:       "KubeGraf",
		IconPath:      iconPath,
		AutoRestart:   autoRestart,
	})

	// Write script to temp file
	scriptPath := filepath.Join(os.TempDir(), "kubegraf-updater.ps1")
	if err := os.WriteFile(scriptPath, []byte(script), 0644); err != nil {
		return fmt.Errorf("failed to write updater script: %w", err)
	}

	// Launch the PowerShell script
	if err := launchWindowsUpdater(scriptPath); err != nil {
		return fmt.Errorf("failed to launch updater: %w", err)
	}

	// Give the script time to start
	time.Sleep(1 * time.Second)

	// Exit to allow the updater to replace the binary
	fmt.Println("Update downloaded. Application will restart automatically...")
	os.Exit(0)

	return nil
}

// applyUnixUpdate applies update on Unix-like systems using shell helper script
func (a *Applier) applyUnixUpdate(execPath, newBinaryPath string, autoRestart bool) error {
	// Get current command line arguments for restart
	args := os.Args[1:]

	// Create the shell updater script
	script := generateUnixUpdaterScript(UnixUpdaterConfig{
		ExecPath:      execPath,
		NewBinaryPath: newBinaryPath,
		ProcessName:   filepath.Base(execPath),
		Args:          args,
		AutoRestart:   autoRestart,
	})

	// Write script to temp file
	scriptPath := filepath.Join(os.TempDir(), "kubegraf-updater.sh")
	if err := os.WriteFile(scriptPath, []byte(script), 0755); err != nil {
		return fmt.Errorf("failed to write updater script: %w", err)
	}

	// Launch the shell script
	if err := launchUnixUpdater(scriptPath); err != nil {
		return fmt.Errorf("failed to launch updater: %w", err)
	}

	// Give the script time to start
	time.Sleep(1 * time.Second)

	// Exit to allow the updater to replace the binary
	fmt.Println("Update downloaded. Application will restart automatically...")
	os.Exit(0)

	return nil
}

// reportProgress reports progress to the callback if set
func (a *Applier) reportProgress(status UpdateStatus, progress float64, message string) {
	if a.progress != nil {
		a.progress(UpdateProgress{
			Status:   status,
			Progress: progress,
			Message:  message,
		})
	}
}

// findIconPath looks for an icon file in common locations
func findIconPath(installDir, execPath string) string {
	iconNames := []string{
		"kubegraf_color_icon.ico",
		"kubegraf.ico",
		"icon.ico",
	}

	dirs := []string{
		installDir,
		filepath.Dir(execPath),
	}

	for _, dir := range dirs {
		for _, name := range iconNames {
			iconPath := filepath.Join(dir, name)
			if _, err := os.Stat(iconPath); err == nil {
				return iconPath
			}
		}
	}

	return ""
}

// Cleanup removes temporary update files
func Cleanup() error {
	tmpDir := filepath.Join(os.TempDir(), "kubegraf-update")
	return os.RemoveAll(tmpDir)
}
