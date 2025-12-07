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
	"encoding/json"
	"fmt"
	"os/exec"
	"strings"
)

// MLflowInstallRequest represents the installation request
type MLflowInstallRequest struct {
	Namespace     string                 `json:"namespace"`
	BackendStore  string                 `json:"backendStore"`  // minio, s3, gcs, pvc
	ArtifactStore string                 `json:"artifactStore"` // minio, s3, gcs, pvc
	EnableUI      bool                   `json:"enableUI"`
	EnableIngress bool                   `json:"enableIngress"`
	CPU           string                 `json:"cpu,omitempty"`
	Memory        string                 `json:"memory,omitempty"`
	Version       string                 `json:"version,omitempty"`
	CustomValues  map[string]interface{} `json:"customValues,omitempty"`
}

// MLflowVersionsResponse represents available MLflow versions
type MLflowVersionsResponse struct {
	Versions []string `json:"versions"`
	Latest   string   `json:"latest"`
}

// GetMLflowVersions fetches available MLflow chart versions from GitHub releases
func GetMLflowVersions(ctx context.Context) (*MLflowVersionsResponse, error) {
	// Use official MLflow Helm chart repository
	// Common MLflow Helm charts:
	// - https://github.com/community-charts/mlflow
	// - https://charts.bitnami.com/bitnami (has mlflow)
	
	// For now, return common versions - in production, fetch from Helm chart repo
	versions := []string{
		"2.8.0",
		"2.7.0",
		"2.6.0",
		"2.5.0",
		"2.4.0",
		"2.3.0",
		"2.2.0",
		"2.1.0",
		"2.0.0",
		"1.30.0",
		"1.29.0",
		"1.28.0",
	}

	return &MLflowVersionsResponse{
		Versions: versions,
		Latest:   versions[0],
	}, nil
}

// InstallMLflow installs MLflow using Helm
func (ws *WebServer) InstallMLflow(ctx context.Context, req MLflowInstallRequest) error {
	// Check if Helm is installed
	if _, err := exec.LookPath("helm"); err != nil {
		return fmt.Errorf("Helm is not installed. Please install Helm first: https://helm.sh/docs/intro/install/")
	}

	// Default namespace
	namespace := req.Namespace
	if namespace == "" {
		namespace = "mlflow"
	}

	// Default version
	version := req.Version
	if version == "" {
		version = "2.8.0"
	}

	// Add MLflow Helm repo (using community chart)
	repoName := "mlflow-repo"
	repoURL := "https://community-charts.github.io/helm-charts"
	
	addRepoCmd := exec.CommandContext(ctx, "helm", "repo", "add", repoName, repoURL)
	if err := addRepoCmd.Run(); err != nil {
		// Repo might already exist, try to update
		updateCmd := exec.CommandContext(ctx, "helm", "repo", "update", repoName)
		updateCmd.Run()
	}

	// Update all repos
	updateCmd := exec.CommandContext(ctx, "helm", "repo", "update")
	updateCmd.Run()

	// Build Helm values
	values := ws.buildMLflowValues(req)

	// Create namespace if it doesn't exist
	createNsCmd := exec.CommandContext(ctx, "kubectl", "create", "namespace", namespace, "--dry-run=client", "-o", "yaml")
	if output, err := createNsCmd.Output(); err == nil {
		applyCmd := exec.CommandContext(ctx, "kubectl", "apply", "-f", "-")
		applyCmd.Stdin = strings.NewReader(string(output))
		applyCmd.Run()
	}

	// Install MLflow
	installArgs := []string{
		"install", "mlflow",
		repoName + "/mlflow",
		"--namespace", namespace,
		"--create-namespace",
		"--version", version,
		"--wait",
		"--timeout", "10m",
	}

	// Add values
	if len(values) > 0 {
		valuesJSON, _ := json.Marshal(values)
		installArgs = append(installArgs, "--set-json", string(valuesJSON))
	}

	// Merge custom values if provided
	if len(req.CustomValues) > 0 {
		customJSON, _ := json.Marshal(req.CustomValues)
		installArgs = append(installArgs, "--set-json", string(customJSON))
	}

	installCmd := exec.CommandContext(ctx, "helm", installArgs...)
	output, err := installCmd.CombinedOutput()

	if err != nil {
		return fmt.Errorf("failed to install MLflow: %v\nOutput: %s", err, string(output))
	}

	return nil
}

// buildMLflowValues builds Helm values from installation request
func (ws *WebServer) buildMLflowValues(req MLflowInstallRequest) map[string]interface{} {
	values := make(map[string]interface{})

	// Backend store configuration
	if req.BackendStore != "" {
		backendURI := ws.getBackendStoreURI(req.BackendStore, req.Namespace)
		values["backendStoreUri"] = backendURI
	}

	// Artifact store configuration
	if req.ArtifactStore != "" {
		artifactURI := ws.getArtifactStoreURI(req.ArtifactStore, req.Namespace)
		values["defaultArtifactRoot"] = artifactURI
	}

	// Enable tracking UI
	values["service"] = map[string]interface{}{
		"type": "ClusterIP",
		"port": 5000,
	}

	if req.EnableUI {
		values["extraEnv"] = []map[string]interface{}{
			{
				"name":  "MLFLOW_TRACKING_UI_ENABLED",
				"value": "true",
			},
		}
	}

	// Ingress configuration
	if req.EnableIngress {
		values["ingress"] = map[string]interface{}{
			"enabled": true,
			"hosts": []map[string]interface{}{
				{
					"host": "mlflow.local",
					"paths": []map[string]interface{}{
						{
							"path":     "/",
							"pathType": "Prefix",
						},
					},
				},
			},
		}
	}

	// Resource limits
	if req.CPU != "" || req.Memory != "" {
		resources := make(map[string]interface{})
		if req.CPU != "" {
			resources["cpu"] = req.CPU
		}
		if req.Memory != "" {
			resources["memory"] = req.Memory
		}
		values["resources"] = map[string]interface{}{
			"limits": resources,
		}
	}

	return values
}

// getBackendStoreURI returns the backend store URI based on type
func (ws *WebServer) getBackendStoreURI(storeType, namespace string) string {
	switch storeType {
	case "minio":
		return fmt.Sprintf("sqlite:///mlflow.db") // Default SQLite, can be configured for MinIO
	case "s3":
		return "s3://mlflow-backend/artifacts"
	case "gcs":
		return "gs://mlflow-backend/artifacts"
	case "pvc":
		return fmt.Sprintf("file:///mnt/mlflow-backend")
	default:
		return "sqlite:///mlflow.db"
	}
}

// getArtifactStoreURI returns the artifact store URI based on type
func (ws *WebServer) getArtifactStoreURI(storeType, namespace string) string {
	switch storeType {
	case "minio":
		return fmt.Sprintf("s3://mlflow-artifacts") // MinIO uses S3-compatible API
	case "s3":
		return "s3://mlflow-artifacts"
	case "gcs":
		return "gs://mlflow-artifacts"
	case "pvc":
		return fmt.Sprintf("file:///mnt/mlflow-artifacts")
	default:
		return "file:///mnt/mlflow-artifacts"
	}
}

// UpgradeMLflow upgrades MLflow to a new version
func (ws *WebServer) UpgradeMLflow(ctx context.Context, namespace, version string) error {
	if _, err := exec.LookPath("helm"); err != nil {
		return fmt.Errorf("Helm is not installed")
	}

	upgradeCmd := exec.CommandContext(ctx, "helm", "upgrade", "mlflow",
		"mlflow-repo/mlflow",
		"--namespace", namespace,
		"--version", version,
		"--wait",
		"--timeout", "10m",
	)

	output, err := upgradeCmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("failed to upgrade MLflow: %v\nOutput: %s", err, string(output))
	}

	return nil
}

