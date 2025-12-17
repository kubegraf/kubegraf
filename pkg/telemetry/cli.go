// Copyright 2025 KubeGraf Contributors
// SPDX-License-Identifier: Apache-2.0

package telemetry

import (
	"context"
	"fmt"
	"os"
)

// RunCLI handles the telemetry CLI commands.
// Returns true if a command was handled, false otherwise.
func RunCLI(args []string, version string) bool {
	if len(args) < 2 || args[1] != "telemetry" {
		return false
	}

	client := NewClient(version)
	client.Initialize(context.Background())

	if len(args) < 3 {
		// Just "telemetry" - show status
		fmt.Println(client.Status())
		return true
	}

	switch args[2] {
	case "enable":
		if err := client.Enable(); err != nil {
			fmt.Fprintf(os.Stderr, "Failed to enable telemetry: %v\n", err)
			os.Exit(1)
		}
		fmt.Println("✓ Telemetry enabled")
		fmt.Println()
		fmt.Println(TransparencyMessage)
		return true

	case "disable":
		if err := client.Disable(); err != nil {
			fmt.Fprintf(os.Stderr, "Failed to disable telemetry: %v\n", err)
			os.Exit(1)
		}
		fmt.Println("✓ Telemetry disabled")
		fmt.Println()
		fmt.Println("You can re-enable telemetry at any time with: kubegraf telemetry enable")
		return true

	case "status":
		fmt.Println(client.Status())
		return true

	default:
		fmt.Fprintf(os.Stderr, "Unknown telemetry command: %s\n", args[2])
		fmt.Println()
		fmt.Println("Usage:")
		fmt.Println("  kubegraf telemetry          Show telemetry status")
		fmt.Println("  kubegraf telemetry enable   Enable anonymous telemetry")
		fmt.Println("  kubegraf telemetry disable  Disable telemetry")
		fmt.Println("  kubegraf telemetry status   Show telemetry status")
		os.Exit(1)
		return true
	}
}

