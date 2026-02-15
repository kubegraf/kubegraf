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

package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
)

// handleFileDialog opens a native file picker dialog and returns the selected file path
func (ws *WebServer) handleFileDialog(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Security check: only allow from localhost
	if !isLocalhost(r) {
		http.Error(w, "File dialog only available from localhost", http.StatusForbidden)
		return
	}

	// Parse request to get dialog options
	var req struct {
		Title       string `json:"title"`
		DefaultPath string `json:"defaultPath"`
		Filter      string `json:"filter"` // e.g., "*.yaml,*.yml,*.config"
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		// Use defaults if no body provided
		req.Title = "Select kubeconfig file"
		homeDir, _ := os.UserHomeDir()
		req.DefaultPath = filepath.Join(homeDir, ".kube")
	}

	selectedPath, err := openNativeFileDialog(req.Title, req.DefaultPath, req.Filter)
	if err != nil {
		log.Printf("File dialog error: %v", err)
		http.Error(w, fmt.Sprintf("Failed to open file dialog: %v", err), http.StatusInternalServerError)
		return
	}

	// Return the selected path
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"path":    selectedPath,
	})
}

// openNativeFileDialog opens a platform-specific native file picker dialog
func openNativeFileDialog(title, defaultPath, filter string) (string, error) {
	switch runtime.GOOS {
	case "darwin":
		return openMacFileDialog(title, defaultPath, filter)
	case "windows":
		return openWindowsFileDialog(title, defaultPath, filter)
	case "linux":
		return openLinuxFileDialog(title, defaultPath, filter)
	default:
		return "", fmt.Errorf("file dialog not supported on %s", runtime.GOOS)
	}
}

// openMacFileDialog opens macOS file picker using osascript
func openMacFileDialog(title, defaultPath, filter string) (string, error) {
	// Expand home directory
	if defaultPath != "" && strings.HasPrefix(defaultPath, "~") {
		home, _ := os.UserHomeDir()
		defaultPath = filepath.Join(home, defaultPath[1:])
	}

	// Ensure defaultPath is absolute
	if defaultPath != "" && !filepath.IsAbs(defaultPath) {
		absPath, err := filepath.Abs(defaultPath)
		if err == nil {
			defaultPath = absPath
		}
	}

	// Build AppleScript command
	script := fmt.Sprintf(`set theFile to choose file with prompt "%s"`, title)

	if defaultPath != "" {
		// Check if path exists
		if _, err := os.Stat(defaultPath); err == nil {
			script = fmt.Sprintf(`set theFile to choose file with prompt "%s" default location POSIX file "%s"`,
				title, defaultPath)
		}
	}

	script += `
POSIX path of theFile`

	cmd := exec.Command("osascript", "-e", script)
	output, err := cmd.CombinedOutput()
	if err != nil {
		// User cancelled or error occurred
		return "", fmt.Errorf("dialog cancelled or failed: %w", err)
	}

	selectedPath := strings.TrimSpace(string(output))
	if selectedPath == "" {
		return "", fmt.Errorf("no file selected")
	}

	return selectedPath, nil
}

// openWindowsFileDialog opens Windows file picker using PowerShell
func openWindowsFileDialog(title, defaultPath, filter string) (string, error) {
	// Expand environment variables
	if defaultPath != "" {
		defaultPath = os.ExpandEnv(defaultPath)
		// Convert Unix-style home path to Windows
		if strings.HasPrefix(defaultPath, "~") {
			home := os.Getenv("USERPROFILE")
			defaultPath = filepath.Join(home, defaultPath[1:])
		}
	}

	// Build PowerShell script for file dialog
	psScript := `
Add-Type -AssemblyName System.Windows.Forms
$dialog = New-Object System.Windows.Forms.OpenFileDialog
$dialog.Title = '` + title + `'
$dialog.Filter = 'Kubeconfig files (*.yaml;*.yml;*.config)|*.yaml;*.yml;*.config|All files (*.*)|*.*'`

	if defaultPath != "" {
		// Use directory part of default path
		dir := defaultPath
		if info, err := os.Stat(defaultPath); err == nil && !info.IsDir() {
			dir = filepath.Dir(defaultPath)
		}
		if _, err := os.Stat(dir); err == nil {
			psScript += fmt.Sprintf(`
$dialog.InitialDirectory = '%s'`, strings.ReplaceAll(dir, "'", "''"))
		}
	}

	psScript += `
$result = $dialog.ShowDialog()
if ($result -eq 'OK') {
    Write-Output $dialog.FileName
} else {
    exit 1
}`

	cmd := exec.Command("powershell.exe", "-NoProfile", "-NonInteractive", "-Command", psScript)
	output, err := cmd.CombinedOutput()
	if err != nil {
		return "", fmt.Errorf("dialog cancelled or failed: %w", err)
	}

	selectedPath := strings.TrimSpace(string(output))
	if selectedPath == "" {
		return "", fmt.Errorf("no file selected")
	}

	return selectedPath, nil
}

// openLinuxFileDialog opens Linux file picker using zenity or kdialog
func openLinuxFileDialog(title, defaultPath, filter string) (string, error) {
	// Expand home directory
	if defaultPath != "" && strings.HasPrefix(defaultPath, "~") {
		home, _ := os.UserHomeDir()
		defaultPath = filepath.Join(home, defaultPath[1:])
	}

	// Try zenity first (GNOME/Ubuntu/most distributions)
	if _, err := exec.LookPath("zenity"); err == nil {
		args := []string{
			"--file-selection",
			"--title=" + title,
		}

		if defaultPath != "" {
			// Use directory part of default path
			dir := defaultPath
			if info, err := os.Stat(defaultPath); err == nil && !info.IsDir() {
				dir = filepath.Dir(defaultPath)
			}
			if _, err := os.Stat(dir); err == nil {
				args = append(args, "--filename="+dir+"/")
			}
		}

		if filter != "" {
			// zenity filter format: --file-filter='YAML files | *.yaml *.yml'
			args = append(args, "--file-filter=Kubeconfig files | *.yaml *.yml *.config")
			args = append(args, "--file-filter=All files | *")
		}

		cmd := exec.Command("zenity", args...)
		output, err := cmd.CombinedOutput()
		if err != nil {
			return "", fmt.Errorf("dialog cancelled or failed: %w", err)
		}

		selectedPath := strings.TrimSpace(string(output))
		if selectedPath == "" {
			return "", fmt.Errorf("no file selected")
		}

		return selectedPath, nil
	}

	// Try kdialog as fallback (KDE)
	if _, err := exec.LookPath("kdialog"); err == nil {
		args := []string{
			"--getopenfilename",
		}

		if defaultPath != "" {
			args = append(args, defaultPath)
		} else {
			args = append(args, os.Getenv("HOME"))
		}

		if filter != "" {
			// kdialog filter format: "*.yaml *.yml *.config|Kubeconfig files"
			args = append(args, "*.yaml *.yml *.config|Kubeconfig files")
		}

		args = append(args, "--title", title)

		cmd := exec.Command("kdialog", args...)
		output, err := cmd.CombinedOutput()
		if err != nil {
			return "", fmt.Errorf("dialog cancelled or failed: %w", err)
		}

		selectedPath := strings.TrimSpace(string(output))
		if selectedPath == "" {
			return "", fmt.Errorf("no file selected")
		}

		return selectedPath, nil
	}

	return "", fmt.Errorf("no file dialog tool found (zenity or kdialog required)")
}
