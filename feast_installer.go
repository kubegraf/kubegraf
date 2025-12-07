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
	"strings"

	feast "github.com/kubegraf/kubegraf/internal/feast"
)

// InstallFeast installs Feast using Helm
func (ws *WebServer) InstallFeast(ctx context.Context, req feast.FeastInstallRequest) error {
	// Generate Helm values
	values := ws.generateFeastHelmValues(req)

	// Add Feast Helm repository if not exists
	repoCmd := exec.CommandContext(ctx, "helm", "repo", "add", "feast-charts", "https://feast-charts.storage.googleapis.com")
	repoCmd.Run() // Ignore error if repo already exists

	// Update Helm repositories
	updateCmd := exec.CommandContext(ctx, "helm", "repo", "update")
	if err := updateCmd.Run(); err != nil {
		return fmt.Errorf("failed to update helm repos: %v", err)
	}

	// Install Feast using Helm
	installCmd := exec.CommandContext(ctx, "helm", "install", "feast",
		"feast-charts/feast",
		"--namespace", req.Namespace,
		"--create-namespace",
		"--set", values)

	output, err := installCmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("failed to install Feast: %v, output: %s", err, string(output))
	}

	return nil
}

// generateFeastHelmValues generates Helm values from installation request
func (ws *WebServer) generateFeastHelmValues(req feast.FeastInstallRequest) string {
	var values []string

	// Version
	if req.Version != "" {
		values = append(values, fmt.Sprintf("feast.image.tag=%s", req.Version))
	}

	// Resources
	if req.CPU != "" {
		values = append(values, fmt.Sprintf("feast.resources.requests.cpu=%s", req.CPU))
	}
	if req.Memory != "" {
		values = append(values, fmt.Sprintf("feast.resources.requests.memory=%s", req.Memory))
	}

	// Online store
	if req.OnlineStore != nil {
		if req.OnlineStore.Type == "redis" && req.OnlineStore.Redis != nil {
			values = append(values, fmt.Sprintf("feast.onlineStore.type=redis"))
			values = append(values, fmt.Sprintf("feast.onlineStore.redis.host=%s", req.OnlineStore.Redis.Host))
			values = append(values, fmt.Sprintf("feast.onlineStore.redis.port=%d", req.OnlineStore.Redis.Port))
		} else if req.OnlineStore.Type == "bigquery" && req.OnlineStore.BigQuery != nil {
			values = append(values, fmt.Sprintf("feast.onlineStore.type=bigquery"))
				values = append(values, fmt.Sprintf("feast.onlineStore.bigquery.projectId=%s", req.OnlineStore.BigQuery.ProjectID))
		}
	}

	// Offline store
	if req.OfflineStore != nil {
		if req.OfflineStore.Type == "file" && req.OfflineStore.File != nil {
			values = append(values, fmt.Sprintf("feast.offlineStore.type=file"))
			values = append(values, fmt.Sprintf("feast.offlineStore.file.path=%s", req.OfflineStore.File.Path))
		} else if req.OfflineStore.Type == "pvc" && req.OfflineStore.PVC != nil {
			values = append(values, fmt.Sprintf("feast.offlineStore.type=pvc"))
				values = append(values, fmt.Sprintf("feast.offlineStore.pvc.name=%s", req.OfflineStore.PVC.PVCName))
		}
	}

	return strings.Join(values, ",")
}
