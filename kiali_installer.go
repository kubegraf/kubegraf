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
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os/exec"
	"strings"
	"time"

	v1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// KialiInstallRequest represents installation parameters
type KialiInstallRequest struct {
	Namespace     string `json:"namespace"`
	Version        string `json:"version"`
	AuthStrategy   string `json:"authStrategy"` // "anonymous", "token", "openid", "ldap"
	ServiceType    string `json:"serviceType"`   // "ClusterIP", "NodePort", "LoadBalancer"
	EnableIngress  bool   `json:"enableIngress"`
	IngressHost    string `json:"ingressHost,omitempty"`
}

// KialiInstallResponse represents installation result
type KialiInstallResponse struct {
	Success   bool   `json:"success"`
	Message   string `json:"message"`
	Version   string `json:"version,omitempty"`
	Namespace string `json:"namespace,omitempty"`
	Error     string `json:"error,omitempty"`
}

// KialiVersion represents a Kiali version from GitHub releases
type KialiVersion struct {
	TagName string `json:"tag_name"`
	Name    string `json:"name"`
}

// InstallKiali installs Kiali using Helm chart
func (a *App) InstallKiali(ctx context.Context, req *KialiInstallRequest) (*KialiInstallResponse, error) {
	// Validate request
	if req.Namespace == "" {
		req.Namespace = "istio-system"
	}
	if req.Version == "" {
		req.Version = "latest"
	}
	if req.AuthStrategy == "" {
		req.AuthStrategy = "anonymous"
	}
	if req.ServiceType == "" {
		req.ServiceType = "ClusterIP"
	}

	// Check if Helm is available
	helmCmd := exec.CommandContext(ctx, "helm", "version")
	if err := helmCmd.Run(); err != nil {
		return &KialiInstallResponse{
			Success: false,
			Error:   "Helm is not installed or not in PATH. Please install Helm first.",
		}, nil
	}

	// Add Kiali Helm repo if not already added
	repoCmd := exec.CommandContext(ctx, "helm", "repo", "add", "kiali", "https://kiali.org/helm-charts")
	repoCmd.Stdout = io.Discard
	repoCmd.Stderr = io.Discard
	repoCmd.Run() // Ignore error if repo already exists

	// Update Helm repos
	updateCmd := exec.CommandContext(ctx, "helm", "repo", "update", "kiali")
	updateCmd.Stdout = io.Discard
	updateCmd.Stderr = io.Discard
	if err := updateCmd.Run(); err != nil {
		return &KialiInstallResponse{
			Success: false,
			Error:   fmt.Sprintf("Failed to update Helm repo: %v", err),
		}, nil
	}

	// Create namespace if it doesn't exist
	_, err := a.clientset.CoreV1().Namespaces().Get(ctx, req.Namespace, metav1.GetOptions{})
	if err != nil {
		_, err = a.clientset.CoreV1().Namespaces().Create(ctx, &v1.Namespace{
			ObjectMeta: metav1.ObjectMeta{
				Name: req.Namespace,
			},
		}, metav1.CreateOptions{})
		if err != nil {
			return &KialiInstallResponse{
				Success: false,
				Error:   fmt.Sprintf("Failed to create namespace: %v", err),
			}, nil
		}
	}

	// Build Helm values
	values := buildHelmValues(req)

	// Install Kiali using Helm
	installArgs := []string{
		"install", "kiali-operator",
		"kiali/kiali-operator",
		"--namespace", req.Namespace,
		"--create-namespace",
		"--set", fmt.Sprintf("cr.spec.deployment.service_type=%s", req.ServiceType),
		"--set", fmt.Sprintf("cr.spec.deployment.ingress.enabled=%v", req.EnableIngress),
	}

	// Add auth strategy
	if req.AuthStrategy != "anonymous" {
		installArgs = append(installArgs, "--set", fmt.Sprintf("cr.spec.auth.strategy=%s", req.AuthStrategy))
	}

	// Add version if specified
	if req.Version != "latest" && req.Version != "" {
		installArgs = append(installArgs, "--set", fmt.Sprintf("cr.spec.deployment.image_version=%s", req.Version))
	}

	// Add custom values if provided
	if len(values) > 0 {
		for k, v := range values {
			installArgs = append(installArgs, "--set", fmt.Sprintf("%s=%s", k, v))
		}
	}

	// Execute Helm install
	installCmd := exec.CommandContext(ctx, "helm", installArgs...)
	var stderr bytes.Buffer
	installCmd.Stderr = &stderr
	output, err := installCmd.Output()

	if err != nil {
		return &KialiInstallResponse{
			Success: false,
			Error:   fmt.Sprintf("Helm install failed: %v\nOutput: %s\nStderr: %s", err, string(output), stderr.String()),
		}, nil
	}

	// Wait for deployment to be ready (with timeout)
	timeout := time.After(5 * time.Minute)
	ticker := time.NewTicker(5 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-timeout:
			return &KialiInstallResponse{
				Success: false,
				Error:   "Installation timeout: Kiali deployment did not become ready within 5 minutes",
			}, nil
		case <-ticker.C:
			status, err := a.DetectKiali(ctx)
			if err == nil && status.Installed {
				return &KialiInstallResponse{
					Success:   true,
					Message:   "Kiali installed successfully",
					Version:   status.Version,
					Namespace: status.Namespace,
				}, nil
			}
		case <-ctx.Done():
			return &KialiInstallResponse{
				Success: false,
				Error:   "Installation cancelled",
			}, nil
		}
	}
}

// buildHelmValues builds Helm values from install request
func buildHelmValues(req *KialiInstallRequest) map[string]string {
	values := make(map[string]string)

	if req.EnableIngress && req.IngressHost != "" {
		values["cr.spec.deployment.ingress.hostname"] = req.IngressHost
	}

	return values
}

// GetKialiVersions fetches available Kiali versions from GitHub releases
func GetKialiVersions() ([]KialiVersion, error) {
	url := "https://api.github.com/repos/kiali/helm-charts/releases"
	
	client := &http.Client{
		Timeout: 10 * time.Second,
	}

	resp, err := client.Get(url)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch releases: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("failed to fetch releases: status %d", resp.StatusCode)
	}

	var releases []KialiVersion
	if err := json.NewDecoder(resp.Body).Decode(&releases); err != nil {
		return nil, fmt.Errorf("failed to decode releases: %v", err)
	}

	// Filter and format versions
	versions := make([]KialiVersion, 0)
	for _, release := range releases {
		// Extract version from tag (e.g., "kiali-operator-1.73.0" -> "1.73.0")
		tag := release.TagName
		if strings.HasPrefix(tag, "kiali-operator-") {
			version := strings.TrimPrefix(tag, "kiali-operator-")
			versions = append(versions, KialiVersion{
				TagName: version,
				Name:    release.Name,
			})
		}
	}

	return versions, nil
}

