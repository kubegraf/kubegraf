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
	if len(os.Args) > 1 {
		switch os.Args[1] {
		case "--version", "-v":
			fmt.Println("KubeGraf v2.0.0 - Advanced Kubernetes Visualization")
			return
		case "--help", "-h":
			printHelp()
			return
		}
	}

	// Parse namespace
	namespace := "default"
	if len(os.Args) > 1 && !strings.HasPrefix(os.Args[1], "--") {
		namespace = os.Args[1]
	}

	// Create and initialize application
	app := NewApp(namespace)
	if err := app.Initialize(); err != nil {
		fmt.Fprintf(os.Stderr, "Failed to initialize: %v\n", err)
		os.Exit(1)
	}

	// Run application
	if err := app.Run(); err != nil {
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

KEYBOARD SHORTCUTS:
  q, Ctrl+C    Quit application
  r            Refresh resources
  n            Change namespace
  Tab, ←/→     Switch tabs (Tab/Shift+Tab or arrow keys)
  ↑/↓, j/k     Navigate rows
  Enter        View YAML
  d            Describe resource
  s            Shell into pod
  Ctrl+D       Delete resource (with confirmation)
  ?            Show help

FEATURES:
  • Real-time resource monitoring with live updates
  • Pod details: IP, restarts, uptime, CPU/MEM usage
  • Resource relationships: Ingress ► Service ► Pod
  • YAML viewing with syntax highlighting
  • Shell access to running pods
  • Safe delete operations with confirmation
  • Comprehensive describe functionality
  • Multi-cluster support`)
}
