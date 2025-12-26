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

package unix

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
)

// HomebrewInfo contains information about a Homebrew installation
type HomebrewInfo struct {
	IsHomebrewInstall bool
	HomebrewPrefix    string // e.g., /opt/homebrew or /usr/local
	FormulaName       string // e.g., "kubegraf"
}

// DetectHomebrewInstallation detects if the executable is installed via Homebrew
func DetectHomebrewInstallation(execPath string) (*HomebrewInfo, error) {
	if runtime.GOOS != "darwin" {
		return &HomebrewInfo{IsHomebrewInstall: false}, nil
	}

	// Resolve symlinks to get the real path
	realPath, err := filepath.EvalSymlinks(execPath)
	if err != nil {
		realPath = execPath
	}

	// Check if path contains Homebrew directories
	lowerPath := strings.ToLower(realPath)
	
	// Common Homebrew paths:
	// - /opt/homebrew/bin/kubegraf (Apple Silicon)
	// - /usr/local/bin/kubegraf (Intel, but also used by manual installs)
	// - /opt/homebrew/Cellar/kubegraf/version/bin/kubegraf (Cellar)
	// - /usr/local/Cellar/kubegraf/version/bin/kubegraf (Cellar)
	
	// Check for Homebrew Cellar (definitive sign of Homebrew install)
	if strings.Contains(lowerPath, "cellar") {
		// Extract Homebrew prefix
		parts := strings.Split(realPath, string(filepath.Separator))
		var homebrewPrefix string
		var formulaName string
		
		for i, part := range parts {
			if strings.ToLower(part) == "cellar" {
				// Found Cellar, extract prefix and formula
				if i > 0 {
					homebrewPrefix = strings.Join(parts[:i], string(filepath.Separator))
				}
				if i+1 < len(parts) {
					formulaName = parts[i+1]
				}
				break
			}
		}
		
		if homebrewPrefix != "" && formulaName != "" {
			return &HomebrewInfo{
				IsHomebrewInstall: true,
				HomebrewPrefix:    homebrewPrefix,
				FormulaName:       formulaName,
			}, nil
		}
	}
	
	// Check if in Homebrew bin directory and verify with brew command
	// This handles symlinked binaries in /opt/homebrew/bin or /usr/local/bin
	if strings.Contains(realPath, "/opt/homebrew/bin/") || 
	   (strings.Contains(realPath, "/usr/local/bin/") && isHomebrewManaged(realPath)) {
		
		// Try to determine Homebrew prefix
		homebrewPrefix := "/opt/homebrew"
		if strings.Contains(realPath, "/usr/local/") {
			homebrewPrefix = "/usr/local"
		}
		
		// Check if brew command can find this formula
		formulaName := "kubegraf"
		if isHomebrewFormula(formulaName, homebrewPrefix) {
			return &HomebrewInfo{
				IsHomebrewInstall: true,
				HomebrewPrefix:    homebrewPrefix,
				FormulaName:       formulaName,
			}, nil
		}
	}

	return &HomebrewInfo{IsHomebrewInstall: false}, nil
}

// isHomebrewManaged checks if a path in /usr/local/bin is managed by Homebrew
// This is tricky because /usr/local/bin is also used by manual installs
func isHomebrewManaged(execPath string) bool {
	// Check if there's a Homebrew Cellar entry for this binary
	// or if brew list shows kubegraf
	return isHomebrewFormula("kubegraf", "/usr/local")
}

// isHomebrewFormula checks if a formula is installed via Homebrew
func isHomebrewFormula(formulaName, prefix string) bool {
	// Try to run: brew list --formula kubegraf
	// If it succeeds, it's a Homebrew installation
	cmd := exec.Command("brew", "list", "--formula", formulaName)
	cmd.Env = os.Environ()
	// Set HOMEBREW_PREFIX if we know it
	if prefix != "" {
		cmd.Env = append(cmd.Env, fmt.Sprintf("HOMEBREW_PREFIX=%s", prefix))
	}
	
	err := cmd.Run()
	return err == nil
}

// CanUpdateViaHomebrew checks if Homebrew is available and can update the app
func CanUpdateViaHomebrew() (bool, string) {
	if runtime.GOOS != "darwin" {
		return false, ""
	}

	// Check if brew command is available
	if _, err := exec.LookPath("brew"); err != nil {
		return false, ""
	}

	return true, "brew"
}

// GetHomebrewUpdateCommand returns the command to update via Homebrew
func GetHomebrewUpdateCommand() string {
	return "brew upgrade kubegraf"
}

// FormatHomebrewWarningMessage formats a warning message for Homebrew installations
func FormatHomebrewWarningMessage(homebrewInfo *HomebrewInfo) string {
	return fmt.Sprintf(`⚠️  KubeGraf is installed via Homebrew

For best compatibility with Homebrew, please update using:
  brew upgrade kubegraf

Updating from the app UI may work, but Homebrew won't track the version change.
The next time you run 'brew upgrade kubegraf', it may overwrite this update.

Would you like to:
1. Continue with in-app update (not recommended for Homebrew)
2. Open Terminal to run 'brew upgrade kubegraf' (recommended)
3. Cancel`)
}

