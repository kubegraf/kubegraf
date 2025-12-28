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
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
)

// InstallationInfo contains detailed information about the installation
type InstallationInfo struct {
	Method      InstallMethod
	InstallPath string
	RealPath    string // Resolved symlink path
	CanUpdate   bool
	Details     map[string]string // Additional details (e.g., Scoop app dir, Homebrew prefix)
}

// DetectInstallation detects how KubeGraf was installed
func DetectInstallation() (*InstallationInfo, error) {
	execPath, err := os.Executable()
	if err != nil {
		return &InstallationInfo{Method: InstallMethodUnknown}, err
	}

	// Resolve symlinks to get the real path
	realPath, err := filepath.EvalSymlinks(execPath)
	if err != nil {
		realPath = execPath
	}

	info := &InstallationInfo{
		InstallPath: execPath,
		RealPath:    realPath,
		Details:     make(map[string]string),
	}

	switch runtime.GOOS {
	case "windows":
		detectWindowsInstallation(info)
	case "darwin":
		detectDarwinInstallation(info)
	case "linux":
		detectLinuxInstallation(info)
	default:
		info.Method = InstallMethodUnknown
	}

	// If still unknown, assume direct binary
	if info.Method == InstallMethodUnknown {
		info.Method = InstallMethodBinary
		info.CanUpdate = true
	}

	return info, nil
}

// detectWindowsInstallation detects Windows-specific installation methods
func detectWindowsInstallation(info *InstallationInfo) {
	lowerPath := strings.ToLower(info.RealPath)

	// Check for Scoop installation
	// Path format: C:\Users\User\scoop\apps\kubegraf\current\kubegraf.exe
	if strings.Contains(lowerPath, "scoop") && strings.Contains(lowerPath, "apps") {
		if detectScoopDetails(info) {
			info.Method = InstallMethodScoop
			info.CanUpdate = true // Can update, but with warning
			return
		}
	}

	// Check for Chocolatey installation
	// Path format: C:\ProgramData\chocolatey\lib\kubegraf\tools\kubegraf.exe
	if strings.Contains(lowerPath, "chocolatey") {
		if detectChocolateyDetails(info) {
			info.Method = InstallMethodChocolatey
			info.CanUpdate = true // Can update, but with warning
			return
		}
	}

	// Default to binary installation
	info.Method = InstallMethodBinary
	info.CanUpdate = true
}

// detectScoopDetails extracts Scoop-specific installation details
func detectScoopDetails(info *InstallationInfo) bool {
	parts := strings.Split(info.RealPath, string(filepath.Separator))

	for i, part := range parts {
		if strings.ToLower(part) == "scoop" && i+1 < len(parts) && strings.ToLower(parts[i+1]) == "apps" {
			if i+2 < len(parts) {
				// Build path to app directory
				pathParts := parts[:i+3]
				appDir := strings.Join(pathParts, string(filepath.Separator))
				info.Details["scoop_app_dir"] = appDir

				// Check for manifest.json to confirm Scoop install
				manifestPath := filepath.Join(appDir, "manifest.json")
				if _, err := os.Stat(manifestPath); err == nil {
					// Check version directory
					if i+3 < len(parts) {
						versionDir := parts[i+3]
						if strings.ToLower(versionDir) == "current" {
							info.Details["scoop_current"] = filepath.Join(appDir, "current")
							// Try to resolve actual version
							if linkTarget, err := filepath.EvalSymlinks(filepath.Join(appDir, "current")); err == nil {
								linkParts := strings.Split(linkTarget, string(filepath.Separator))
								if len(linkParts) > 0 {
									info.Details["scoop_version"] = linkParts[len(linkParts)-2]
								}
							}
						} else {
							info.Details["scoop_version"] = versionDir
						}
					}
					return true
				}
			}
		}
	}
	return false
}

// detectChocolateyDetails extracts Chocolatey-specific installation details
func detectChocolateyDetails(info *InstallationInfo) bool {
	parts := strings.Split(info.RealPath, string(filepath.Separator))

	for i, part := range parts {
		if strings.ToLower(part) == "chocolatey" && i+1 < len(parts) && strings.ToLower(parts[i+1]) == "lib" {
			if i+2 < len(parts) {
				// Build path to package directory
				pathParts := parts[:i+3]
				packageDir := strings.Join(pathParts, string(filepath.Separator))
				info.Details["choco_package_dir"] = packageDir

				// Check for package directory
				if fi, err := os.Stat(packageDir); err == nil && fi.IsDir() {
					info.Details["choco_package_name"] = parts[i+2]

					// Try to find version from nuspec file
					nuspecPattern := filepath.Join(packageDir, "*.nuspec")
					if matches, err := filepath.Glob(nuspecPattern); err == nil && len(matches) > 0 {
						info.Details["choco_nuspec"] = matches[0]
					}
					return true
				}
			}
		}
	}

	// Also check if choco command recognizes kubegraf
	if _, err := exec.LookPath("choco"); err == nil {
		cmd := exec.Command("choco", "list", "--local-only", "kubegraf")
		if output, err := cmd.Output(); err == nil {
			if strings.Contains(string(output), "kubegraf") {
				return true
			}
		}
	}

	return false
}

// detectDarwinInstallation detects macOS-specific installation methods
func detectDarwinInstallation(info *InstallationInfo) {
	lowerPath := strings.ToLower(info.RealPath)

	// Check for Homebrew Cellar installation
	// Path format: /opt/homebrew/Cellar/kubegraf/version/bin/kubegraf
	// Or: /usr/local/Cellar/kubegraf/version/bin/kubegraf
	if strings.Contains(lowerPath, "cellar") {
		if detectHomebrewDetails(info) {
			info.Method = InstallMethodHomebrew
			info.CanUpdate = true // Can update, but with warning
			return
		}
	}

	// Check if in Homebrew bin directory
	if strings.Contains(info.RealPath, "/opt/homebrew/bin/") ||
		strings.Contains(info.RealPath, "/usr/local/bin/") {
		// Verify with brew command
		if isHomebrewFormula("kubegraf") {
			info.Method = InstallMethodHomebrew
			if strings.Contains(info.RealPath, "/opt/homebrew/") {
				info.Details["homebrew_prefix"] = "/opt/homebrew"
			} else {
				info.Details["homebrew_prefix"] = "/usr/local"
			}
			info.Details["formula_name"] = "kubegraf"
			info.CanUpdate = true
			return
		}
	}

	// Default to binary installation
	info.Method = InstallMethodBinary
	info.CanUpdate = true
}

// detectHomebrewDetails extracts Homebrew-specific installation details
func detectHomebrewDetails(info *InstallationInfo) bool {
	parts := strings.Split(info.RealPath, string(filepath.Separator))

	for i, part := range parts {
		if strings.ToLower(part) == "cellar" {
			// Extract Homebrew prefix (everything before Cellar)
			if i > 0 {
				info.Details["homebrew_prefix"] = strings.Join(parts[:i], string(filepath.Separator))
			}
			// Extract formula name (next part after Cellar)
			if i+1 < len(parts) {
				info.Details["formula_name"] = parts[i+1]
			}
			// Extract version (next part after formula name)
			if i+2 < len(parts) {
				info.Details["formula_version"] = parts[i+2]
			}
			return true
		}
	}
	return false
}

// isHomebrewFormula checks if a formula is installed via Homebrew
func isHomebrewFormula(formulaName string) bool {
	if _, err := exec.LookPath("brew"); err != nil {
		return false
	}

	cmd := exec.Command("brew", "list", "--formula", formulaName)
	return cmd.Run() == nil
}

// detectLinuxInstallation detects Linux-specific installation methods
func detectLinuxInstallation(info *InstallationInfo) {
	lowerPath := strings.ToLower(info.RealPath)

	// Check for Snap installation
	// Path format: /snap/kubegraf/x1/bin/kubegraf
	if strings.Contains(lowerPath, "/snap/") {
		info.Method = InstallMethodSnap
		info.CanUpdate = true

		// Extract snap details
		parts := strings.Split(info.RealPath, string(filepath.Separator))
		for i, part := range parts {
			if part == "snap" && i+1 < len(parts) {
				info.Details["snap_name"] = parts[i+1]
				if i+2 < len(parts) {
					info.Details["snap_revision"] = parts[i+2]
				}
				break
			}
		}
		return
	}

	// Check for Flatpak installation
	// Path format: /var/lib/flatpak/app/com.kubegraf.KubeGraf/...
	if strings.Contains(lowerPath, "/flatpak/") {
		info.Method = InstallMethodFlatpak
		info.CanUpdate = true
		return
	}

	// Check for APT installation by looking at /usr/bin or dpkg
	if strings.HasPrefix(info.RealPath, "/usr/bin/") {
		// Check if installed via dpkg
		cmd := exec.Command("dpkg", "-S", info.RealPath)
		if output, err := cmd.Output(); err == nil && strings.Contains(string(output), "kubegraf") {
			info.Method = InstallMethodApt
			info.CanUpdate = true
			return
		}
	}

	// Check for Homebrew on Linux
	if strings.Contains(lowerPath, "linuxbrew") || strings.Contains(lowerPath, "homebrew") {
		if detectHomebrewDetails(info) {
			info.Method = InstallMethodHomebrew
			info.CanUpdate = true
			return
		}
	}

	// Default to binary installation
	info.Method = InstallMethodBinary
	info.CanUpdate = true
}

// GetInstallationPath returns the path where the binary should be updated
func (info *InstallationInfo) GetInstallationPath() string {
	// For most cases, use the real path (resolved symlinks)
	return info.RealPath
}

// GetBackupPath returns the path for backing up the old binary
func (info *InstallationInfo) GetBackupPath() string {
	return info.GetInstallationPath() + ".old"
}
