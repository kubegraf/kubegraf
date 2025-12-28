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

// Package update provides auto-update functionality for KubeGraf.
// It supports cross-platform updates (Windows, macOS, Linux) and handles
// various installation methods (direct binary, Scoop, Chocolatey, Homebrew).
package update

import "runtime"

// UpdateInfo contains information about available updates
type UpdateInfo struct {
	CurrentVersion  string          `json:"currentVersion"`
	LatestVersion   string          `json:"latestVersion"`
	UpdateAvailable bool            `json:"updateAvailable"`
	ReleaseNotes    string          `json:"releaseNotes"`
	HTMLURL         string          `json:"htmlUrl"`
	DownloadURL     string          `json:"downloadUrl"`
	PublishedAt     string          `json:"publishedAt"`
	ChecksumURL     string          `json:"checksumUrl,omitempty"`
	Error           string          `json:"error,omitempty"`
	InstallMethod   InstallMethod   `json:"installMethod"`
	CanAutoUpdate   bool            `json:"canAutoUpdate"`
	UpdateCommand   string          `json:"updateCommand,omitempty"`
	Assets          []ReleaseAsset  `json:"assets,omitempty"`
}

// ReleaseAsset represents a downloadable asset from a GitHub release
type ReleaseAsset struct {
	Name        string `json:"name"`
	DownloadURL string `json:"downloadUrl"`
	Size        int64  `json:"size"`
	ContentType string `json:"contentType,omitempty"`
}

// InstallMethod represents how KubeGraf was installed
type InstallMethod string

const (
	InstallMethodUnknown    InstallMethod = "unknown"
	InstallMethodBinary     InstallMethod = "binary"      // Direct binary/EXE download
	InstallMethodScoop      InstallMethod = "scoop"       // Windows: Scoop package manager
	InstallMethodChocolatey InstallMethod = "chocolatey"  // Windows: Chocolatey package manager
	InstallMethodHomebrew   InstallMethod = "homebrew"    // macOS: Homebrew package manager
	InstallMethodApt        InstallMethod = "apt"         // Linux: APT package manager
	InstallMethodSnap       InstallMethod = "snap"        // Linux: Snap package manager
	InstallMethodFlatpak    InstallMethod = "flatpak"     // Linux: Flatpak
)

// UpdateStatus represents the current status of an update operation
type UpdateStatus string

const (
	UpdateStatusIdle        UpdateStatus = "idle"
	UpdateStatusChecking    UpdateStatus = "checking"
	UpdateStatusDownloading UpdateStatus = "downloading"
	UpdateStatusVerifying   UpdateStatus = "verifying"
	UpdateStatusApplying    UpdateStatus = "applying"
	UpdateStatusRestarting  UpdateStatus = "restarting"
	UpdateStatusComplete    UpdateStatus = "complete"
	UpdateStatusFailed      UpdateStatus = "failed"
)

// UpdateProgress represents the progress of an update operation
type UpdateProgress struct {
	Status          UpdateStatus `json:"status"`
	Progress        float64      `json:"progress"`        // 0-100
	BytesDownloaded int64        `json:"bytesDownloaded"`
	BytesTotal      int64        `json:"bytesTotal"`
	Speed           int64        `json:"speed"`           // bytes per second
	Message         string       `json:"message"`
	Error           string       `json:"error,omitempty"`
}

// ApplyUpdateRequest represents a request to apply an update
type ApplyUpdateRequest struct {
	DownloadURL     string `json:"downloadUrl"`
	Version         string `json:"version"`
	ChecksumURL     string `json:"checksumUrl,omitempty"`
	ForceUpdate     bool   `json:"forceUpdate"`      // Bypass package manager warnings
	AutoRestart     bool   `json:"autoRestart"`      // Automatically restart after update
}

// ApplyUpdateResponse represents the response from an update application
type ApplyUpdateResponse struct {
	Success     bool         `json:"success"`
	Message     string       `json:"message"`
	Error       string       `json:"error,omitempty"`
	Status      UpdateStatus `json:"status"`
	NeedsRestart bool        `json:"needsRestart"`
	Warning     string       `json:"warning,omitempty"` // Package manager warning
}

// PlatformInfo contains platform-specific information
type PlatformInfo struct {
	OS           string        `json:"os"`
	Arch         string        `json:"arch"`
	InstallMethod InstallMethod `json:"installMethod"`
	InstallPath  string        `json:"installPath"`
	CanUpdate    bool          `json:"canUpdate"`
	UpdateCommand string       `json:"updateCommand,omitempty"`
}

// GetCurrentPlatform returns information about the current platform
func GetCurrentPlatform() *PlatformInfo {
	return &PlatformInfo{
		OS:   runtime.GOOS,
		Arch: runtime.GOARCH,
	}
}

// IsPackageManagerInstall returns true if installed via a package manager
func (m InstallMethod) IsPackageManagerInstall() bool {
	switch m {
	case InstallMethodScoop, InstallMethodChocolatey, InstallMethodHomebrew,
		InstallMethodApt, InstallMethodSnap, InstallMethodFlatpak:
		return true
	default:
		return false
	}
}

// GetUpdateCommand returns the recommended update command for this install method
func (m InstallMethod) GetUpdateCommand() string {
	switch m {
	case InstallMethodScoop:
		return "scoop update kubegraf"
	case InstallMethodChocolatey:
		return "choco upgrade kubegraf -y"
	case InstallMethodHomebrew:
		return "brew upgrade kubegraf"
	case InstallMethodApt:
		return "sudo apt update && sudo apt upgrade kubegraf"
	case InstallMethodSnap:
		return "sudo snap refresh kubegraf"
	case InstallMethodFlatpak:
		return "flatpak update com.kubegraf.KubeGraf"
	default:
		return ""
	}
}

// GetWarningMessage returns a warning message for package manager installations
func (m InstallMethod) GetWarningMessage() string {
	if !m.IsPackageManagerInstall() {
		return ""
	}

	switch m {
	case InstallMethodScoop:
		return `KubeGraf is installed via Scoop.

For best compatibility, please update using:
  scoop update kubegraf

Updating from the app may work, but Scoop won't track the version change.
The next 'scoop update kubegraf' may overwrite this update.`

	case InstallMethodChocolatey:
		return `KubeGraf is installed via Chocolatey.

For best compatibility, please update using:
  choco upgrade kubegraf -y

Updating from the app may work, but Chocolatey won't track the version change.
The next 'choco upgrade kubegraf' may overwrite this update.`

	case InstallMethodHomebrew:
		return `KubeGraf is installed via Homebrew.

For best compatibility, please update using:
  brew upgrade kubegraf

Updating from the app may work, but Homebrew won't track the version change.
The next 'brew upgrade kubegraf' may overwrite this update.`

	default:
		return "KubeGraf is installed via a package manager. Consider using the package manager to update for best compatibility."
	}
}
