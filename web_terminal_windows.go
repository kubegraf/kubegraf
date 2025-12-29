//go:build windows
// +build windows

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
	"io"
	"log"
	"os"
	"strings"

	"github.com/UserExistsError/conpty"
	"github.com/gorilla/websocket"
	windowsterminal "github.com/kubegraf/kubegraf/pkg/terminal/windows"
)

// handleWindowsConPTYTerminal handles WebSocket connections for Windows terminal using ConPTY
func (ws *WebServer) handleWindowsConPTYTerminal(conn *websocket.Conn, r *http.Request) {
	// Get preferred shell from query parameter
	preferredShell := r.URL.Query().Get("shell")

	// Determine shell to use
	var shellPath string
	var shellArgs []string

	if preferredShell != "" {
		// User specified a shell preference
		shellPath = preferredShell
		// Use shell detection to get proper args
		if shell := windowsterminal.GetShellByPath(preferredShell); shell != nil {
			shellArgs = shell.Args
		} else {
			// Fallback args based on shell type
			if strings.Contains(preferredShell, "pwsh") || strings.Contains(preferredShell, "powershell") {
				shellArgs = []string{"-NoLogo"}
			} else if strings.Contains(preferredShell, "cmd") {
				shellArgs = []string{"/K"}
			}
		}
	} else {
		// Auto-detect best available shell
		if shell := windowsterminal.GetPreferredShell(); shell != nil {
			shellPath = shell.Path
			shellArgs = shell.Args
		} else {
			// Fallback to PowerShell
			shellPath = "powershell.exe"
			shellArgs = []string{"-NoLogo"}
		}
	}

	// Get home directory for working directory
	homeDir := os.Getenv("USERPROFILE")
	if homeDir == "" {
		homeDir = "C:\\"
	}

	// Create ConPTY with default size
	cpty, err := conpty.New(80, 24)
	if err != nil {
		conn.WriteMessage(websocket.TextMessage, []byte(fmt.Sprintf("\r\n\x1b[31mFailed to create ConPTY: %v\x1b[0m\r\n", err)))
		log.Printf("ConPTY creation failed: %v", err)
		return
	}
	defer cpty.Close()

	// Build command with args
	cmdArgs := append(shellArgs)

	// Spawn shell process in ConPTY
	pid, _, err := cpty.Spawn(
		shellPath,
		cmdArgs,
		&conpty.ConPtyOptions{
			WorkDir: homeDir,
			Env:     os.Environ(),
		},
	)
	if err != nil {
		conn.WriteMessage(websocket.TextMessage, []byte(fmt.Sprintf("\r\n\x1b[31mFailed to spawn shell: %v\x1b[0m\r\n", err)))
		log.Printf("Shell spawn failed: %v", err)
		return
	}

	log.Printf("Started Windows terminal with ConPTY: shell=%s, pid=%d", shellPath, pid)

	// Use channels to signal when the connection should close
	done := make(chan bool, 1)
	processExited := make(chan bool, 1)

	// Monitor process exit
	go func() {
		// Wait for process to exit
		// Note: ConPTY doesn't provide a built-in wait, so we need to poll or use Windows API
		// For now, we'll rely on EOF from output reading
		<-processExited
		done <- true
	}()

	// Read from ConPTY output and send to WebSocket
	go func() {
		buf := make([]byte, 4096)
		for {
			select {
			case <-done:
				return
			default:
			}

			n, err := cpty.Read(buf)
			if err != nil {
				if err == io.EOF {
					log.Printf("ConPTY output EOF - process likely exited")
					processExited <- true
					return
				}
				log.Printf("ConPTY read error: %v", err)
				processExited <- true
				return
			}

			if n > 0 {
				if err := conn.WriteMessage(websocket.TextMessage, buf[:n]); err != nil {
					log.Printf("WebSocket write error: %v", err)
					done <- true
					return
				}
			}
		}
	}()

	// Read from WebSocket and write to ConPTY
	for {
		select {
		case <-done:
			log.Printf("Terminal session closing")
			return
		default:
			_, message, err := conn.ReadMessage()
			if err != nil {
				log.Printf("WebSocket read error: %v", err)
				done <- true
				return
			}

			// Parse message
			var msg struct {
				Type string `json:"type"`
				Data string `json:"data"`
				Cols uint16 `json:"cols"`
				Rows uint16 `json:"rows"`
			}
			if err := json.Unmarshal(message, &msg); err != nil {
				// Treat as raw input - write directly to ConPTY
				if _, err := cpty.Write(message); err != nil {
					log.Printf("Error writing to ConPTY: %v", err)
					done <- true
					return
				}
				continue
			}

			switch msg.Type {
			case "input":
				// Write input data to ConPTY
				if _, err := cpty.Write([]byte(msg.Data)); err != nil {
					log.Printf("Error writing to ConPTY: %v", err)
					done <- true
					return
				}
			case "resize":
				// Resize ConPTY terminal
				if err := cpty.Resize(msg.Cols, msg.Rows); err != nil {
					log.Printf("Error resizing ConPTY: %v", err)
				} else {
					log.Printf("Terminal resized to %dx%d", msg.Cols, msg.Rows)
				}
			}
		}
	}
}
