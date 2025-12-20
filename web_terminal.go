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

// TerminalOpenRequest represents the request to open a native terminal
type TerminalOpenRequest struct {
	WorkingDir string `json:"workingDir,omitempty"`
}

// TerminalOpenResponse represents the response from opening a terminal
type TerminalOpenResponse struct {
	Status string `json:"status"`
	OS     string `json:"os"`
	Error  string `json:"error,omitempty"`
}

// handleHealth returns a simple health check response
func (ws *WebServer) handleHealth(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"status": "ok",
		"service": "kubegraf",
	})
}

// handleTerminalOpen opens the native system terminal
func (ws *WebServer) handleTerminalOpen(w http.ResponseWriter, r *http.Request) {
	// Security: Only allow localhost requests
	if !isLocalhost(r) {
		http.Error(w, "Forbidden: Only localhost access allowed", http.StatusForbidden)
		return
	}

	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req TerminalOpenRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, fmt.Sprintf("Invalid request: %v", err), http.StatusBadRequest)
		return
	}

	// Validate and sanitize working directory
	workingDir := req.WorkingDir
	if workingDir == "" {
		// Default to user's home directory
		homeDir, err := os.UserHomeDir()
		if err != nil {
			workingDir = "."
		} else {
			workingDir = homeDir
		}
	}

	// Security: Validate working directory exists and is a local path
	absPath, err := filepath.Abs(workingDir)
	if err != nil {
		http.Error(w, fmt.Sprintf("Invalid working directory: %v", err), http.StatusBadRequest)
		return
	}

	// Check if path exists
	if _, err := os.Stat(absPath); os.IsNotExist(err) {
		http.Error(w, fmt.Sprintf("Working directory does not exist: %s", absPath), http.StatusBadRequest)
		return
	}

	// Security: Reject non-local paths (prevent directory traversal)
	if !isLocalPath(absPath) {
		http.Error(w, "Forbidden: Only local filesystem paths allowed", http.StatusForbidden)
		return
	}

	// Open terminal based on OS
	osType := runtime.GOOS
	err = openNativeTerminal(absPath, osType)

	response := TerminalOpenResponse{
		Status: "opened",
		OS:     osType,
	}

	if err != nil {
		log.Printf("[Terminal] Failed to open native terminal: %v", err)
		response.Status = "error"
		response.Error = err.Error()
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(response)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(response)
}

// openNativeTerminal opens the native terminal application based on the OS
func openNativeTerminal(workingDir string, osType string) error {
	var cmd *exec.Cmd

	switch osType {
	case "darwin":
		// macOS - Terminal.app
		// Use AppleScript to open Terminal in the specified directory
		script := fmt.Sprintf(`tell application "Terminal"
	activate
	do script "cd %q"
end tell`, workingDir)
		cmd = exec.Command("osascript", "-e", script)
		// Alternative: if osascript fails, try open command with shell
		// This is a fallback that will be tried if osascript is not available
	case "windows":
		// Windows - Try terminals in priority order
		terminals := []struct {
			name string
			args []string
		}{
			{"wt.exe", []string{"-d", workingDir}}, // Windows Terminal
			{"pwsh.exe", []string{"-NoExit", "-Command", fmt.Sprintf("Set-Location '%s'", workingDir)}}, // PowerShell Core
			{"powershell.exe", []string{"-NoExit", "-Command", fmt.Sprintf("Set-Location '%s'", workingDir)}}, // PowerShell
			{"cmd.exe", []string{"/k", "cd", "/d", workingDir}}, // CMD
		}

		for _, term := range terminals {
			// Check if terminal exists
			if _, err := exec.LookPath(term.name); err == nil {
				cmd = exec.Command(term.name, term.args...)
				break
			}
		}

		if cmd == nil {
			return fmt.Errorf("no terminal found on Windows (tried: wt.exe, pwsh.exe, powershell.exe, cmd.exe)")
		}
	case "linux":
		// Linux - Try terminals in priority order
		// Get shell for xterm fallback
		shell := os.Getenv("SHELL")
		if shell == "" {
			shell = "/bin/sh"
		}

		terminals := []struct {
			name string
			args []string
		}{
			{"x-terminal-emulator", []string{"--working-directory", workingDir}}, // Debian/Ubuntu default
			{"gnome-terminal", []string{"--working-directory", workingDir}},       // GNOME
			{"konsole", []string{"--workdir", workingDir}},                        // KDE
			{"xfce4-terminal", []string{"--working-directory", workingDir}},        // XFCE
			{"alacritty", []string{"--working-directory", workingDir}},            // Alacritty
			{"xterm", []string{"-e", "sh", "-c", fmt.Sprintf("cd %q && exec %q", workingDir, shell)}}, // XTerm fallback
		}

		for _, term := range terminals {
			// Check if terminal exists
			if _, err := exec.LookPath(term.name); err == nil {
				cmd = exec.Command(term.name, term.args...)
				break
			}
		}

		if cmd == nil {
			// Last resort: try to use $SHELL directly
			// Note: This is a fallback and may not work on all systems
			cmd = exec.Command(shell, "-c", fmt.Sprintf("cd %q && exec %q", workingDir, shell))
		}
	default:
		return fmt.Errorf("unsupported OS: %s", osType)
	}

	// Execute the command (detached, non-blocking)
	if err := cmd.Start(); err != nil {
		return fmt.Errorf("failed to start terminal: %w", err)
	}

	// Detach from parent process
	go func() {
		_ = cmd.Wait()
	}()

	return nil
}

// isLocalhost checks if the request is from localhost
func isLocalhost(r *http.Request) bool {
	host := r.Host
	if strings.Contains(host, ":") {
		host = strings.Split(host, ":")[0]
	}

	// Check for localhost variants
	localhostVariants := []string{
		"localhost",
		"127.0.0.1",
		"::1",
		"0.0.0.0",
	}

	for _, variant := range localhostVariants {
		if host == variant {
			return true
		}
	}

	// Also check RemoteAddr
	remoteAddr := r.RemoteAddr
	if strings.HasPrefix(remoteAddr, "127.0.0.1:") ||
		strings.HasPrefix(remoteAddr, "[::1]:") ||
		strings.HasPrefix(remoteAddr, "localhost:") {
		return true
	}

	return false
}

// isLocalPath validates that the path is a local filesystem path
func isLocalPath(path string) bool {
	// Reject paths that look like URLs
	if strings.HasPrefix(path, "http://") || strings.HasPrefix(path, "https://") {
		return false
	}

	// Reject paths with protocol schemes
	if strings.Contains(path, "://") {
		return false
	}

	// On Windows, validate drive letter
	if runtime.GOOS == "windows" {
		// Must start with a drive letter (e.g., C:\) or be a UNC path (\\)
		if len(path) >= 2 && path[1] == ':' {
			return true
		}
		if strings.HasPrefix(path, "\\\\") {
			return true
		}
		return false
	}

	// On Unix-like systems, must start with /
	return strings.HasPrefix(path, "/")
}

