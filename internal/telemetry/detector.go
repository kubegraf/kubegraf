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

package telemetry

import (
	"os"
	"path/filepath"
	"runtime"
	"strings"
)

// InstallMethod represents how KubeGraf was installed
type InstallMethod string

const (
	InstallMethodHomebrew InstallMethod = "homebrew"
	InstallMethodScoop    InstallMethod = "scoop"
	InstallMethodEXE      InstallMethod = "exe"
	InstallMethodScript   InstallMethod = "script"
	InstallMethodManual   InstallMethod = "manual"
	InstallMethodUnknown  InstallMethod = "unknown"
)

// DetectInstallMethod infers how KubeGraf was installed using heuristics
func DetectInstallMethod() InstallMethod {
	// Get executable path
	execPath, err := os.Executable()
	if err != nil {
		return InstallMethodUnknown
	}

	// Normalize path for comparison
	execPath = filepath.Clean(execPath)
	execDir := filepath.Dir(execPath)

	// Check for Homebrew (macOS/Linux)
	// Homebrew installs to /usr/local/bin, /opt/homebrew/bin, or ~/.homebrew/bin
	if runtime.GOOS == "darwin" || runtime.GOOS == "linux" {
		// Check for Homebrew environment variable
		if os.Getenv("HOMEBREW_PREFIX") != "" {
			homebrewPrefix := os.Getenv("HOMEBREW_PREFIX")
			if strings.HasPrefix(execPath, homebrewPrefix) {
				return InstallMethodHomebrew
			}
		}

		// Check common Homebrew paths
		homebrewPaths := []string{
			"/usr/local/bin",
			"/opt/homebrew/bin",
			"/home/linuxbrew/.linuxbrew/bin",
		}

		for _, path := range homebrewPaths {
			if strings.HasPrefix(execPath, path) {
				return InstallMethodHomebrew
			}
		}

		// Check for ~/.homebrew
		homeDir, _ := os.UserHomeDir()
		if homeDir != "" {
			if strings.HasPrefix(execPath, filepath.Join(homeDir, ".homebrew")) {
				return InstallMethodHomebrew
			}
		}
	}

	// Check for Scoop (Windows)
	// Scoop installs to ~\scoop\apps\kubegraf or C:\ProgramData\scoop\apps\kubegraf
	if runtime.GOOS == "windows" {
		// Check for Scoop environment variable
		if scoopPath := os.Getenv("SCOOP"); scoopPath != "" {
			if strings.HasPrefix(execPath, scoopPath) {
				return InstallMethodScoop
			}
		}

		// Check for global Scoop installation
		if strings.Contains(execPath, "\\scoop\\apps\\") {
			return InstallMethodScoop
		}

		// Check common Scoop paths
		homeDir, _ := os.UserHomeDir()
		if homeDir != "" {
			scoopLocal := filepath.Join(homeDir, "scoop", "apps", "kubegraf")
			if strings.HasPrefix(execPath, scoopLocal) {
				return InstallMethodScoop
			}
		}

		// Check for C:\ProgramData\scoop
		if strings.HasPrefix(execPath, "C:\\ProgramData\\scoop") {
			return InstallMethodScoop
		}

		// Check for Windows installer (.exe from installer)
		// Installer typically installs to C:\Program Files\KubeGraf or C:\Program Files (x86)\KubeGraf
		if strings.Contains(execPath, "Program Files") {
			return InstallMethodEXE
		}

		// Check for AppData\Local (user-level installer)
		if strings.Contains(execPath, "AppData\\Local\\Programs\\KubeGraf") {
			return InstallMethodEXE
		}
	}

	// Check for script installation (typically /usr/local/bin or ~/bin)
	if runtime.GOOS != "windows" {
		scriptPaths := []string{
			"/usr/local/bin",
			"/usr/bin",
		}

		homeDir, _ := os.UserHomeDir()
		if homeDir != "" {
			scriptPaths = append(scriptPaths, filepath.Join(homeDir, "bin"))
			scriptPaths = append(scriptPaths, filepath.Join(homeDir, ".local", "bin"))
		}

		for _, path := range scriptPaths {
			if execDir == path {
				// Could be script or manual, check for install script markers
				// If it's in /usr/local/bin but not from Homebrew, likely script
				if execDir == "/usr/local/bin" && runtime.GOOS != "darwin" {
					return InstallMethodScript
				}
				// Otherwise, manual
				return InstallMethodManual
			}
		}
	}

	// Check if running from Downloads, Desktop, or temp directory (manual install)
	lowerPath := strings.ToLower(execPath)
	manualIndicators := []string{
		"downloads",
		"desktop",
		"tmp",
		"temp",
		"documents",
	}

	for _, indicator := range manualIndicators {
		if strings.Contains(lowerPath, indicator) {
			return InstallMethodManual
		}
	}

	// Default to unknown
	return InstallMethodUnknown
}

// GetInstallMethodString returns a human-readable install method string
func GetInstallMethodString(method InstallMethod) string {
	switch method {
	case InstallMethodHomebrew:
		return "Homebrew"
	case InstallMethodScoop:
		return "Scoop"
	case InstallMethodEXE:
		return "Windows Installer"
	case InstallMethodScript:
		return "Install Script"
	case InstallMethodManual:
		return "Manual Download"
	case InstallMethodUnknown:
		return "Unknown"
	default:
		return "Unknown"
	}
}
