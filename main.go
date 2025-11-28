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
	"fmt"
	"os"
	"strings"
	"time"

	"github.com/fatih/color"
)

func main() {
	// Show splash screen
	showSplash()

	// Suppress verbose Kubernetes client logs
	os.Setenv("KUBE_LOG_LEVEL", "0")

	// Check for flags
	webMode := false
	port := 8080
	if len(os.Args) > 1 {
		switch os.Args[1] {
		case "--version", "-v":
			fmt.Println("KubeGraf v2.0.0 - Advanced Kubernetes Visualization")
			return
		case "--help", "-h":
			printHelp()
			return
		case "--web", "web":
			webMode = true
			// Check for custom port
			if len(os.Args) > 2 && strings.HasPrefix(os.Args[2], "--port=") {
				fmt.Sscanf(os.Args[2], "--port=%d", &port)
			}
		}
	}

	// Parse namespace
	namespace := "default"
	if len(os.Args) > 1 && !strings.HasPrefix(os.Args[1], "--") && os.Args[1] != "web" {
		namespace = os.Args[1]
	}

	// Create and initialize application
	app := NewApp(namespace)
	if err := app.Initialize(); err != nil {
		fmt.Fprintf(os.Stderr, "Failed to initialize: %v\n", err)
		os.Exit(1)
	}

	// Run in web mode or TUI mode
	if webMode {
		fmt.Println("🚀 Starting KubeGraf Web UI...")
		webServer := NewWebServer(app)
		if err := webServer.Start(port); err != nil {
			fmt.Fprintf(os.Stderr, "Web server error: %v\n", err)
			os.Exit(1)
		}
	} else {
		// Run TUI application
		if err := app.Run(); err != nil {
			fmt.Fprintf(os.Stderr, "Application error: %v\n", err)
			os.Exit(1)
		}
	}
}

func showSplash() {
	// Clear screen
	fmt.Print("\033[H\033[2J")

	// ASCII art logo
	logo := `
  ██╗  ██╗██╗   ██╗██████╗ ███████╗ ██████╗ ██████╗  █████╗ ███████╗
  ██║ ██╔╝██║   ██║██╔══██╗██╔════╝██╔════╝ ██╔══██╗██╔══██╗██╔════╝
  █████╔╝ ██║   ██║██████╔╝█████╗  ██║  ███╗██████╔╝███████║█████╗
  ██╔═██╗ ██║   ██║██╔══██╗██╔══╝  ██║   ██║██╔══██╗██╔══██║██╔══╝
  ██║  ██╗╚██████╔╝██████╔╝███████╗╚██████╔╝██║  ██║██║  ██║██║
  ╚═╝  ╚═╝ ╚═════╝ ╚═════╝ ╚══════╝ ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝
`

	// Blue color
	blue := color.New(color.FgCyan, color.Bold)
	white := color.New(color.FgWhite)

	blue.Println(logo)
	fmt.Println()
	white.Println("                    Advanced Kubernetes Visualization Tool")
	blue.Println("                              Version 2.0.0")
	fmt.Println()
	white.Println("                          Initializing...")

	// Brief pause to show splash
	time.Sleep(1500 * time.Millisecond)

	// Clear screen again
	fmt.Print("\033[H\033[2J")
}

func printHelp() {
	fmt.Println(`KubeGraf v2.0.0 - Advanced Kubernetes Visualization Tool

USAGE:
  kubegraf [namespace] [flags]
  kubegraf --web [--port=8080]    Start web UI instead of terminal UI

FLAGS:
  --web             Launch web UI dashboard (browser-based)
  --port=PORT       Specify web server port (default: 8080)
  --version, -v     Show version information
  --help, -h        Show this help message

EXAMPLES:
  kubegraf                    # Launch terminal UI in default namespace
  kubegraf production         # Launch terminal UI in production namespace
  kubegraf --web              # Launch web UI at http://localhost:8080
  kubegraf --web --port=3000  # Launch web UI at http://localhost:3000

KEYBOARD SHORTCUTS (Terminal UI):
  q, Ctrl+C    Quit application
  r            Refresh resources
  n            Change namespace
  Tab, ←/→     Switch tabs (Tab/Shift+Tab or arrow keys)
  ↑/↓, j/k     Navigate rows
  Enter        View YAML / Resource Map
  i            Interactive canvas graph (terminal)
  g            Export graph (browser-based)
  d            Describe resource
  s            Shell into pod
  Ctrl+D       Delete resource (with confirmation)
  ?            Show help

FEATURES:
  Terminal UI:
  • Real-time resource monitoring with live updates
  • Interactive canvas graph visualization (pure CLI)
  • ASCII tree view for resource relationships
  • Browser-based graphs (Graphviz & D3.js)
  • Pod details: IP, restarts, uptime, CPU/MEM usage
  • YAML viewing with syntax highlighting
  • Shell access to running pods
  • Safe delete operations with confirmation

  Web UI:
  • Beautiful modern dashboard with gradients
  • Real-time metrics with sparklines
  • Interactive D3.js topology visualization
  • WebSocket live updates
  • Responsive design
  • Full-featured resource management`)
}
