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
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
)

// Shell represents a shell executable with its configuration
type Shell struct {
	Name        string   `json:"name"`        // Display name (e.g., "PowerShell 7")
	Path        string   `json:"path"`        // Executable path or command name
	Args        []string `json:"args"`        // Default arguments for interactive mode
	Available   bool     `json:"available"`   // Whether the shell is installed and accessible
	Recommended bool     `json:"recommended"` // Whether this is a recommended choice
	Description string   `json:"description"` // Brief description of the shell
	Priority    int      `json:"priority"`    // Sort priority (lower = higher priority)
}

// DetectShells returns all available shells on Windows with their availability status
func DetectShells() []Shell {
	if runtime.GOOS != "windows" {
		return []Shell{}
	}

	shells := []Shell{
		{
			Name:        "PowerShell 7",
			Path:        "pwsh.exe",
			Args:        []string{"-NoLogo"},
			Recommended: true,
			Description: "Modern PowerShell (cross-platform)",
			Priority:    1,
		},
		{
			Name:        "Windows PowerShell",
			Path:        "powershell.exe",
			Args:        []string{"-NoLogo"},
			Recommended: true,
			Description: "Built-in Windows PowerShell 5.1",
			Priority:    2,
		},
		{
			Name:        "Command Prompt",
			Path:        "cmd.exe",
			Args:        []string{},
			Recommended: false,
			Description: "Classic Windows command prompt",
			Priority:    3,
		},
		{
			Name:        "Windows Terminal",
			Path:        "wt.exe",
			Args:        []string{},
			Recommended: true,
			Description: "Modern terminal emulator (if installed)",
			Priority:    0,
		},
	}

	// Check for Git Bash in common installation locations
	gitBashShell := detectGitBash()
	if gitBashShell != nil {
		shells = append(shells, *gitBashShell)
	}

	// Check availability for each shell
	for i := range shells {
		shells[i].Available = isShellAvailable(shells[i].Path)
	}

	return shells
}

// GetPreferredShell returns the highest priority available and recommended shell
func GetPreferredShell() *Shell {
	shells := DetectShells()

	// First, try to find an available recommended shell with highest priority (lowest priority number)
	var preferredShell *Shell
	for i := range shells {
		if shells[i].Available && shells[i].Recommended {
			if preferredShell == nil || shells[i].Priority < preferredShell.Priority {
				preferredShell = &shells[i]
			}
		}
	}

	if preferredShell != nil {
		return preferredShell
	}

	// Fallback: return first available shell
	for i := range shells {
		if shells[i].Available {
			return &shells[i]
		}
	}

	// Last resort: return PowerShell (should always be available on Windows)
	return &Shell{
		Name:        "Windows PowerShell",
		Path:        "powershell.exe",
		Args:        []string{"-NoLogo"},
		Available:   true,
		Recommended: true,
		Description: "Built-in Windows PowerShell 5.1",
		Priority:    2,
	}
}

// GetAvailableShells returns only shells that are available on the system
func GetAvailableShells() []Shell {
	allShells := DetectShells()
	available := make([]Shell, 0)

	for _, shell := range allShells {
		if shell.Available {
			available = append(available, shell)
		}
	}

	return available
}

// isShellAvailable checks if a shell executable is available on the system
func isShellAvailable(shellPath string) bool {
	// Try to find the executable using LookPath
	_, err := exec.LookPath(shellPath)
	return err == nil
}

// detectGitBash attempts to find Git Bash in common installation locations
func detectGitBash() *Shell {
	// Common Git Bash installation paths
	possiblePaths := []string{
		filepath.Join(os.Getenv("PROGRAMFILES"), "Git", "bin", "bash.exe"),
		filepath.Join(os.Getenv("PROGRAMFILES(X86)"), "Git", "bin", "bash.exe"),
		filepath.Join(os.Getenv("LOCALAPPDATA"), "Programs", "Git", "bin", "bash.exe"),
		"C:\\Program Files\\Git\\bin\\bash.exe",
		"C:\\Program Files (x86)\\Git\\bin\\bash.exe",
	}

	// Also check for Git Bash in PATH
	if path, err := exec.LookPath("bash.exe"); err == nil {
		possiblePaths = append([]string{path}, possiblePaths...)
	}

	for _, path := range possiblePaths {
		if path == "" {
			continue
		}

		// Check if file exists
		if _, err := os.Stat(path); err == nil {
			return &Shell{
				Name:        "Git Bash",
				Path:        path,
				Args:        []string{"--login", "-i"},
				Available:   true,
				Recommended: false,
				Description: "Bash shell from Git for Windows",
				Priority:    4,
			}
		}
	}

	return nil
}

// ValidateShellPath checks if a given shell path is safe and valid
func ValidateShellPath(shellPath string) bool {
	if shellPath == "" {
		return false
	}

	// Check if it's a known shell
	shells := DetectShells()
	for _, shell := range shells {
		if shell.Path == shellPath && shell.Available {
			return true
		}
	}

	// Additional validation: check if file exists and is executable
	info, err := os.Stat(shellPath)
	if err != nil {
		return false
	}

	// Must be a file, not a directory
	if info.IsDir() {
		return false
	}

	// On Windows, check if it has .exe, .bat, or .cmd extension
	ext := filepath.Ext(shellPath)
	validExts := []string{".exe", ".bat", ".cmd"}
	for _, validExt := range validExts {
		if ext == validExt {
			return true
		}
	}

	return false
}

// GetShellByName returns a shell by its name if it's available
func GetShellByName(name string) *Shell {
	shells := DetectShells()
	for i := range shells {
		if shells[i].Name == name && shells[i].Available {
			return &shells[i]
		}
	}
	return nil
}

// GetShellByPath returns a shell by its path if it's available
func GetShellByPath(path string) *Shell {
	shells := DetectShells()
	for i := range shells {
		if shells[i].Path == path && shells[i].Available {
			return &shells[i]
		}
	}
	return nil
}
