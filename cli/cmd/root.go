// Copyright 2025 KubeGraf Contributors
//
// Licensed under the Apache License, Version 2.0 (the "License")

package cli

import (
	"os"
	"strings"

	"github.com/fatih/color"
	"github.com/spf13/cobra"
)

var rootCmd = &cobra.Command{
	Use:   "kubegraf",
	Short: "KubeGraf - Intelligent Incident Analysis",
	Long: func() string {
		headerColor := color.New(color.Bold, color.FgCyan)
		cmdColor := color.New(color.FgGreen, color.Bold)
		descColor := color.New(color.FgWhite)

		var buf strings.Builder
		headerColor.Fprint(&buf, "KubeGraf CLI provides incident-first reliability analysis for Kubernetes clusters.\n\n")
		cmdColor.Fprint(&buf, "V1 Commands:\n")
		descColor.Fprintf(&buf, "  %-15s Validate environment and connectivity\n", "doctor")
		descColor.Fprintf(&buf, "  %-15s List and view incidents\n", "incidents")
		descColor.Fprintf(&buf, "  %-15s Analyze incidents to determine root cause\n", "analyze")
		descColor.Fprintf(&buf, "  %-15s Export incident data\n", "export")
		descColor.Fprintf(&buf, "  %-15s Show version information\n", "version")
		descColor.Fprintf(&buf, "  %-15s Generate shell completion scripts\n\n", "completion")
		cmdColor.Fprint(&buf, "Legacy Commands:\n")
		descColor.Fprintf(&buf, "  %-15s Stream pod logs\n", "logs")
		descColor.Fprintf(&buf, "  %-15s Execute interactive shell in pods\n", "shell")
		descColor.Fprintf(&buf, "  %-15s Port forward to pods or services\n", "pf")
		descColor.Fprintf(&buf, "  %-15s Restart deployments, statefulsets, or daemonsets\n", "restart")
		descColor.Fprintf(&buf, "  %-15s Apply YAML configurations\n\n", "apply")
		descColor.Fprint(&buf, "Use 'kubegraf <command> --help' for more information about a command.")
		return buf.String()
	}(),
	SilenceUsage:  true,
	SilenceErrors: true,
}

func init() {
	// Add all subcommands
	rootCmd.AddCommand(logsCmd)
	rootCmd.AddCommand(shellCmd)
	rootCmd.AddCommand(pfCmd)
	rootCmd.AddCommand(restartCmd)
	rootCmd.AddCommand(applyCmd)

	// V1 CLI commands
	rootCmd.AddCommand(versionCmd)
	rootCmd.AddCommand(doctorCmd)
	rootCmd.AddCommand(incidentsCmd)
	rootCmd.AddCommand(analyzeCmd)
	rootCmd.AddCommand(exportCmd)
	rootCmd.AddCommand(tuiCmd)
	rootCmd.AddCommand(completionCmd)
}

// Execute runs the CLI
func Execute() {
	if err := rootCmd.Execute(); err != nil {
		errorColor := color.New(color.FgRed, color.Bold)
		errorColor.Fprintf(os.Stderr, "Error: %v\n", err)
		os.Exit(1)
	}
}
