// Copyright 2025 KubeGraf Contributors
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0

package main

import (
	"context"
	"fmt"
	"os/exec"
)

// InstallDCGM installs DCGM exporter using Helm
func (ws *WebServer) InstallDCGM(ctx context.Context, req GPUInstallRequest) error {
	// Add NVIDIA GPU Operator Helm repository
	repoCmd := exec.CommandContext(ctx, "helm", "repo", "add", "nvidia", "https://nvidia.github.io/gpu-operator")
	repoCmd.Run() // Ignore error if repo already exists

	// Update Helm repositories
	updateCmd := exec.CommandContext(ctx, "helm", "repo", "update")
	if err := updateCmd.Run(); err != nil {
		return fmt.Errorf("failed to update helm repos: %v", err)
	}

	// Install DCGM exporter
	installCmd := exec.CommandContext(ctx, "helm", "install", "dcgm-exporter",
		"nvidia/gpu-operator",
		"--namespace", req.Namespace,
		"--create-namespace",
		"--set", "dcgmExporter.enabled=true")

	if req.Version != "" {
		installCmd.Args = append(installCmd.Args, "--set", fmt.Sprintf("dcgmExporter.image.tag=%s", req.Version))
	}

	output, err := installCmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("failed to install DCGM exporter: %v, output: %s", err, string(output))
	}

	return nil
}

