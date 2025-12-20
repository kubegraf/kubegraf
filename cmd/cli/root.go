// Copyright 2025 KubeGraf Contributors
//
// Licensed under the Apache License, Version 2.0 (the "License")

package cli

import (
	"fmt"
	"os"

	"github.com/spf13/cobra"
)

var rootCmd = &cobra.Command{
	Use:   "kubegraf",
	Short: "KubeGraf - Kubernetes Operations CLI",
	Long: `KubeGraf CLI provides quick operations for Kubernetes resources.

Use 'kubegraf <command> --help' for more information about a command.`,
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
}

// Execute runs the CLI
func Execute() {
	if err := rootCmd.Execute(); err != nil {
		fmt.Fprintf(os.Stderr, "Error: %v\n", err)
		os.Exit(1)
	}
}
