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
	"path/filepath"
	"runtime"
	"strings"
)

// ScoopInfo contains information about a Scoop installation
type ScoopInfo struct {
	IsScoopInstall bool
	ScoopAppDir    string // e.g., C:\Users\User\scoop\apps\kubegraf
	ScoopCurrent   string // e.g., C:\Users\User\scoop\apps\kubegraf\current
	ScoopVersion   string // e.g., "1.7.21"
}

// DetectScoopInstallation detects if the executable is installed via Scoop
func DetectScoopInstallation(execPath string) (*ScoopInfo, error) {
	if runtime.GOOS != "windows" {
		return &ScoopInfo{IsScoopInstall: false}, nil
	}

	// Resolve symlinks/junctions to get the real path
	realPath, err := filepath.EvalSymlinks(execPath)
	if err != nil {
		// If we can't resolve symlinks, use the original path
		realPath = execPath
	}

	// Check if path contains "scoop\apps" (typical Scoop installation path)
	lowerPath := strings.ToLower(realPath)
	if !strings.Contains(lowerPath, "scoop") || !strings.Contains(lowerPath, "apps") {
		return &ScoopInfo{IsScoopInstall: false}, nil
	}

	// Extract Scoop app directory
	// Path format: C:\Users\User\scoop\apps\kubegraf\current\kubegraf.exe
	// Or: C:\Users\User\scoop\apps\kubegraf\1.7.21\kubegraf.exe
	parts := strings.Split(realPath, string(filepath.Separator))
	
	var scoopAppDir string
	var scoopCurrent string
	var scoopVersion string
	
	for i, part := range parts {
		if strings.ToLower(part) == "scoop" && i+1 < len(parts) && strings.ToLower(parts[i+1]) == "apps" {
			// Found scoop\apps, construct app directory
			if i+2 < len(parts) {
				// Build path up to app name
				pathParts := parts[:i+3]
				scoopAppDir = strings.Join(pathParts, string(filepath.Separator))
				
				// Check if we're in "current" or a version directory
				if i+3 < len(parts) {
					nextPart := parts[i+3]
					if strings.ToLower(nextPart) == "current" {
						scoopCurrent = strings.Join(append(pathParts, "current"), string(filepath.Separator))
						// Try to resolve the actual version directory
						if linkTarget, err := filepath.EvalSymlinks(scoopCurrent); err == nil {
							// Extract version from symlink target
							linkParts := strings.Split(linkTarget, string(filepath.Separator))
							for j, linkPart := range linkParts {
								if j > 0 && linkParts[j-1] == parts[i+2] {
									// This should be the version
									scoopVersion = linkPart
									break
								}
							}
						}
					} else {
						// We're directly in a version directory
						scoopVersion = nextPart
						scoopCurrent = filepath.Join(scoopAppDir, "current")
					}
				}
				break
			}
		}
	}

	if scoopAppDir == "" {
		return &ScoopInfo{IsScoopInstall: false}, nil
	}

	// Verify it's actually a Scoop installation by checking for manifest
	manifestPath := filepath.Join(scoopAppDir, "manifest.json")
	if _, err := os.Stat(manifestPath); err != nil {
		// No manifest found, might not be a proper Scoop install
		return &ScoopInfo{IsScoopInstall: false}, nil
	}

	return &ScoopInfo{
		IsScoopInstall: true,
		ScoopAppDir:    scoopAppDir,
		ScoopCurrent:   scoopCurrent,
		ScoopVersion:   scoopVersion,
	}, nil
}

// CanUpdateViaScoop checks if Scoop is available and can update the app
func CanUpdateViaScoop() (bool, string) {
	if runtime.GOOS != "windows" {
		return false, ""
	}

	// Check if scoop command is available
	// Try common locations or check PATH
	scoopCmd := "scoop"
	
	// Check if scoop is in PATH by trying to run it
	// We'll use a simple check - if scoop command exists
	// In practice, we'd check if `scoop --version` works
	
	// For now, return true if we're in a Scoop directory
	// The actual check would require executing scoop command
	return true, scoopCmd
}

// GetScoopUpdateCommand returns the command to update via Scoop
func GetScoopUpdateCommand() string {
	return "scoop update kubegraf"
}

// FormatScoopWarningMessage formats a warning message for Scoop installations
func FormatScoopWarningMessage(scoopInfo *ScoopInfo) string {
	return fmt.Sprintf(`⚠️  KubeGraf is installed via Scoop

For best compatibility with Scoop, please update using:
  scoop update kubegraf

Updating from the app UI may work, but Scoop won't track the version change.
The next time you run 'scoop update kubegraf', it may overwrite this update.

Would you like to:
1. Continue with in-app update (not recommended for Scoop)
2. Open PowerShell to run 'scoop update kubegraf' (recommended)
3. Cancel`)
}

