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
	"log"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"github.com/fatih/color"

	cli "github.com/kubegraf/kubegraf/cli/cmd"
	"github.com/kubegraf/kubegraf/internal/cluster"
	"github.com/kubegraf/kubegraf/internal/telemetry"
	oldtelemetry "github.com/kubegraf/kubegraf/pkg/telemetry"
)

func main() {
	// Catch panics and show useful error
	defer func() {
		if r := recover(); r != nil {
			fmt.Fprintf(os.Stderr, "\n❌ Fatal error: %v\n", r)
			fmt.Fprintf(os.Stderr, "\nPlease report this issue at: https://github.com/kubegraf/kubegraf/issues\n")
			os.Exit(1)
		}
	}()

	// Suppress verbose Kubernetes client logs
	os.Setenv("KUBE_LOG_LEVEL", "0")

	// Check for telemetry CLI commands first (using old telemetry for backward compat)
	if oldtelemetry.RunCLI(os.Args, GetVersion()) {
		return
	}

	// Check for special commands that should not go through Cobra
	if len(os.Args) > 1 {
		cmd := os.Args[1]
		switch cmd {
		case "web":
			// Web UI mode - handle separately
			ephemeralMode := false
			port := 3000
			// Check for custom port and ephemeral flag
			for i := 2; i < len(os.Args); i++ {
				arg := os.Args[i]
				if strings.HasPrefix(arg, "--port=") {
					fmt.Sscanf(arg, "--port=%d", &port)
				} else if arg == "--port" && i+1 < len(os.Args) {
					fmt.Sscanf(os.Args[i+1], "%d", &port)
				} else if arg == "--ephemeral" {
					ephemeralMode = true
				}
			}
			launchWebUI(port, ephemeralMode)
			return
		case "tui":
			// TUI mode - experimental, handle separately
			fmt.Fprintf(os.Stderr, "⚠️  EXPERIMENTAL: TUI is not part of v1 stability guarantee.\n\n")
			launchTUI()
			return
		}
	}

	// Check for legacy flags (before routing to Cobra)
	if len(os.Args) > 1 {
		switch os.Args[1] {
		case "--version", "-v":
			// Route to Cobra version command
			cli.Execute()
			return
		case "--help", "-h":
			// Route to Cobra help
			cli.Execute()
			return
		}
	}

	// FIRST-RUN TELEMETRY PROMPT (OPT-IN, ONE-TIME ONLY)
	// This runs ONLY on first execution, prompts user for consent, and never runs again.
	// It ONLY runs in interactive terminals (never in scripts or CI/CD).
	// Default is NO if user doesn't respond within 10 seconds.
	// No cluster data, no commands, no identifiers are ever collected.
	telemetry.RunFirstTimeSetup(GetVersion())

	// Default behavior: route all commands to Cobra CLI
	// If no command provided, Cobra will show help
	cli.Execute()
}

func launchWebUI(port int, ephemeralMode bool) {
	// Check for update status from previous session
	CheckUpdateStatus()

	// In web mode, start server immediately and connect to cluster in background
	fmt.Println("🚀 Starting KubeGraf Daemon...")

	// Initialize cluster manager with auto-discovery (silently)
	kubeconfigPaths, err := cluster.DiscoverKubeConfigs()
	if err != nil {
		log.Printf("⚠️  Failed to discover kubeconfigs: %v", err)
	}

	// Load contexts from discovered kubeconfigs (silently)
	var clusterManager *cluster.ClusterManager
	if len(kubeconfigPaths) > 0 {
		contexts, err := cluster.LoadContextsFromFiles(kubeconfigPaths)
		if err != nil {
			log.Printf("⚠️  Failed to load contexts: %v", err)
		} else {
			// Create cluster manager with pre-warming (silently)
			clusterManager, err = cluster.NewClusterManager(contexts)
			if err != nil {
				log.Printf("⚠️  Failed to create cluster manager: %v", err)
			}
		}
	}

	// Create and initialize application
	app := NewApp("default")

	// Start web server immediately (silently)
	webServer := NewWebServer(app)
	webServer.clusterManager = clusterManager

	// Enable ephemeral mode if requested
	if ephemeralMode {
		webServer.ephemeralMode.Enable()
		fmt.Println("🗑️  Ephemeral mode enabled - data will be wiped on exit")
	}

	// Setup signal handling for graceful shutdown (silently)
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, os.Interrupt, syscall.SIGTERM)

	// Initialize cluster connection in background (silently)
	go func() {
		initErr := app.Initialize()
		if initErr != nil {
			app.connectionError = initErr.Error()
			app.connected = false
			fmt.Fprintf(os.Stderr, "⚠️  Failed to connect to cluster: %v\n", initErr)
		} else {
			app.connected = true
		}
	}()

	// Start web server in a goroutine (silently)
	serverErrChan := make(chan error, 1)
	go func() {
		if err := webServer.Start(port); err != nil {
			fmt.Printf("❌ Web server error: %v\n", err)
			serverErrChan <- err
		}
	}()

	// Wait for signal or server error
	select {
	case sig := <-sigChan:
		fmt.Printf("\n🛑 Received signal: %v\n", sig)
		fmt.Println("💾 Updating last seen timestamp...")
		// Update last_seen_at on clean shutdown
		if webServer.stateManager != nil {
			if err := webServer.stateManager.UpdateLastSeenAt(); err != nil {
				fmt.Printf("⚠️  Failed to update state: %v\n", err)
			} else {
				fmt.Println("✅ State updated successfully")
			}
		}
		// Cleanup ephemeral mode if enabled
		if ephemeralMode && webServer.ephemeralMode != nil {
			if err := webServer.ephemeralMode.Cleanup(); err != nil {
				fmt.Printf("⚠️  Failed to cleanup ephemeral data: %v\n", err)
			} else {
				fmt.Println("🗑️  Ephemeral data cleaned up")
			}
		}
		fmt.Println("👋 Shutting down gracefully...")
		os.Exit(0)
	case err := <-serverErrChan:
		fmt.Fprintf(os.Stderr, "❌ Web server error: %v\n", err)
		os.Exit(1)
	}
}

func launchTUI() {
	// Parse namespace
	namespace := "default"
	if len(os.Args) > 2 && !strings.HasPrefix(os.Args[2], "--") {
		namespace = os.Args[2]
	}

	// Show splash screen
	showSplash()

	// Create and initialize application
	app := NewApp(namespace)

	// TUI mode - initialize cluster connection first
	fmt.Println("🔌 Connecting to Kubernetes cluster...")
	if err := app.Initialize(); err != nil {
		fmt.Fprintf(os.Stderr, "\n❌ Failed to connect to cluster: %v\n\n", err)
		fmt.Println("Please ensure:")
		fmt.Println("  • kubeconfig is configured (~/.kube/config)")
		fmt.Println("  • kubectl can access the cluster")
		fmt.Println("  • You have proper permissions")
		fmt.Println("\nTry running: kubectl cluster-info")
		os.Exit(1)
	}
	fmt.Println("✅ Connected successfully!")
	fmt.Println()

	// Run TUI application
	if err := app.Run(); err != nil {
		// Check if it's a TTY error
		if strings.Contains(err.Error(), "/dev/tty") || strings.Contains(err.Error(), "device not configured") {
			fmt.Fprintf(os.Stderr, "\n❌ Terminal UI requires an interactive terminal\n\n")
			fmt.Println("TUI cannot run in background. Please run directly in your terminal:")
			fmt.Println("  ./kubegraf tui")
			fmt.Println("\nOr use web UI instead:")
			fmt.Println("  ./kubegraf web --port=3001")
			os.Exit(1)
		}
		fmt.Fprintf(os.Stderr, "Application error: %v\n", err)
		os.Exit(1)
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
	white.Println("                              KubēGraf")
	fmt.Println("              Intelligent Insight for Kubernetes Incidents")
	blue.Printf("                              Version %s\n", GetVersion())
	fmt.Println()
	white.Println("                          Initializing...")

	// Brief pause to show splash
	time.Sleep(1500 * time.Millisecond)

	// Clear screen again
	fmt.Print("\033[H\033[2J")
}

func printHelp() {
	fmt.Printf(`KubeGraf %s - Intelligent Insight for Kubernetes Incidents

USAGE:
  kubegraf [namespace] [flags]
  kubegraf web [--port=PORT]     Start web UI instead of terminal UI
  kubegraf telemetry [command]   Manage anonymous telemetry

FLAGS:
  web, --web        Launch web UI dashboard (browser-based)
  --port=PORT        Specify web server port (default: 3000, auto-finds next available if in use)
  --version, -v      Show version information
  --help, -h         Show this help message

TELEMETRY COMMANDS:
  telemetry          Show telemetry status
  telemetry enable   Enable anonymous telemetry
  telemetry disable  Disable telemetry
  telemetry status   Show telemetry status

EXAMPLES:
  kubegraf                    # Launch terminal UI in default namespace
  kubegraf production         # Launch terminal UI in production namespace
  kubegraf web                # Launch web UI at http://localhost:3000
  kubegraf --web              # Same as above (alternative syntax)
  kubegraf web --port=8080    # Launch web UI at custom port
  kubegraf web --ephemeral    # Launch with ephemeral mode (data wiped on exit)
  kubegraf telemetry status   # Check telemetry status

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
  • Full-featured resource management`, GetVersion())
}
