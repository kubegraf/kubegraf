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
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os/exec"
	"strings"
	"time"
)

// AppDefinition represents an app in the marketplace
type AppDefinition struct {
	Name        string `json:"name"`
	DisplayName string `json:"displayName"`
	Description string `json:"description"`
	Category    string `json:"category"`
	Version     string `json:"version"`
	ChartRepo   string `json:"chartRepo"`
	ChartName   string `json:"chartName"`
}

// InstalledApp represents an installed app
type InstalledApp struct {
	Name      string `json:"name"`
	Namespace string `json:"namespace"`
	Status    string `json:"status"`
	Version   string `json:"version"`
	Chart     string `json:"chart"`
}

// Apps Marketplace catalog
var appsCatalog = []AppDefinition{
	{
		Name:        "nginx-ingress",
		DisplayName: "NGINX Ingress",
		Description: "Ingress controller for Kubernetes using NGINX as a reverse proxy",
		Category:    "Networking",
		Version:     "4.9.0",
		ChartRepo:   "https://kubernetes.github.io/ingress-nginx",
		ChartName:   "ingress-nginx",
	},
	{
		Name:        "istio",
		DisplayName: "Istio Service Mesh",
		Description: "Connect, secure, control, and observe services across your cluster",
		Category:    "Networking",
		Version:     "1.20.0",
		ChartRepo:   "https://istio-release.storage.googleapis.com/charts",
		ChartName:   "istiod",
	},
	{
		Name:        "cilium",
		DisplayName: "Cilium CNI",
		Description: "eBPF-based networking, observability, and security for Kubernetes",
		Category:    "Networking",
		Version:     "1.14.5",
		ChartRepo:   "https://helm.cilium.io/",
		ChartName:   "cilium",
	},
	{
		Name:        "argocd",
		DisplayName: "Argo CD",
		Description: "Declarative GitOps continuous delivery tool for Kubernetes",
		Category:    "CI/CD",
		Version:     "5.51.0",
		ChartRepo:   "https://argoproj.github.io/argo-helm",
		ChartName:   "argo-cd",
	},
	{
		Name:        "fluxcd",
		DisplayName: "Flux CD",
		Description: "GitOps toolkit for continuous and progressive delivery",
		Category:    "CI/CD",
		Version:     "2.12.0",
		ChartRepo:   "https://fluxcd-community.github.io/helm-charts",
		ChartName:   "flux2",
	},
	{
		Name:        "prometheus",
		DisplayName: "Prometheus",
		Description: "Monitoring system and time series database for metrics",
		Category:    "Observability",
		Version:     "25.8.0",
		ChartRepo:   "https://prometheus-community.github.io/helm-charts",
		ChartName:   "prometheus",
	},
	{
		Name:        "grafana",
		DisplayName: "Grafana",
		Description: "Analytics & monitoring dashboards for all your metrics",
		Category:    "Observability",
		Version:     "7.0.19",
		ChartRepo:   "https://grafana.github.io/helm-charts",
		ChartName:   "grafana",
	},
	{
		Name:        "loki",
		DisplayName: "Loki",
		Description: "Like Prometheus, but for logs - scalable log aggregation",
		Category:    "Observability",
		Version:     "5.41.4",
		ChartRepo:   "https://grafana.github.io/helm-charts",
		ChartName:   "loki-stack",
	},
	{
		Name:        "tempo",
		DisplayName: "Tempo",
		Description: "High-scale distributed tracing backend",
		Category:    "Observability",
		Version:     "1.7.1",
		ChartRepo:   "https://grafana.github.io/helm-charts",
		ChartName:   "tempo",
	},
	{
		Name:        "cert-manager",
		DisplayName: "cert-manager",
		Description: "Automatically provision and manage TLS certificates",
		Category:    "Security",
		Version:     "1.13.3",
		ChartRepo:   "https://charts.jetstack.io",
		ChartName:   "cert-manager",
	},
	{
		Name:        "vault",
		DisplayName: "HashiCorp Vault",
		Description: "Secrets management, encryption, and privileged access",
		Category:    "Security",
		Version:     "0.27.0",
		ChartRepo:   "https://helm.releases.hashicorp.com",
		ChartName:   "vault",
	},
	{
		Name:        "redis",
		DisplayName: "Redis",
		Description: "In-memory data structure store, cache, and message broker",
		Category:    "Data",
		Version:     "18.6.1",
		ChartRepo:   "https://charts.bitnami.com/bitnami",
		ChartName:   "redis",
	},
	{
		Name:        "postgresql",
		DisplayName: "PostgreSQL",
		Description: "Advanced open source relational database",
		Category:    "Data",
		Version:     "14.0.5",
		ChartRepo:   "https://charts.bitnami.com/bitnami",
		ChartName:   "postgresql",
	},
	{
		Name:        "memcached",
		DisplayName: "Memcached",
		Description: "High-performance distributed memory caching system",
		Category:    "Data",
		Version:     "6.7.2",
		ChartRepo:   "https://charts.bitnami.com/bitnami",
		ChartName:   "memcached",
	},
	{
		Name:        "kube-prometheus-stack",
		DisplayName: "Kube Prometheus Stack",
		Description: "Full Prometheus + Grafana + Alertmanager observability stack",
		Category:    "Observability",
		Version:     "55.5.0",
		ChartRepo:   "https://prometheus-community.github.io/helm-charts",
		ChartName:   "kube-prometheus-stack",
	},
}

// handleApps returns the apps catalog
func (ws *WebServer) handleApps(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")

	json.NewEncoder(w).Encode(appsCatalog)
}

// handleInstalledApps returns the list of installed apps (Helm releases)
func (ws *WebServer) handleInstalledApps(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")

	installed, err := ws.getInstalledApps()
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"error":     err.Error(),
			"installed": []InstalledApp{},
		})
		return
	}

	json.NewEncoder(w).Encode(installed)
}

// getInstalledApps retrieves installed Helm releases
func (ws *WebServer) getInstalledApps() ([]InstalledApp, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	// Try to get releases using helm list
	cmd := exec.CommandContext(ctx, "helm", "list", "-A", "-o", "json")
	output, err := cmd.Output()
	if err != nil {
		// Helm might not be installed, return empty list
		return []InstalledApp{}, nil
	}

	var releases []struct {
		Name       string `json:"name"`
		Namespace  string `json:"namespace"`
		Status     string `json:"status"`
		AppVersion string `json:"app_version"`
		Chart      string `json:"chart"`
	}

	if err := json.Unmarshal(output, &releases); err != nil {
		return nil, fmt.Errorf("failed to parse helm output: %v", err)
	}

	// Match releases with our catalog
	installed := make([]InstalledApp, 0)
	for _, release := range releases {
		// Check if release matches any of our catalog apps
		for _, app := range appsCatalog {
			if strings.Contains(release.Chart, app.ChartName) || release.Name == app.Name {
				installed = append(installed, InstalledApp{
					Name:      app.Name,
					Namespace: release.Namespace,
					Status:    release.Status,
					Version:   release.AppVersion,
					Chart:     release.Chart,
				})
				break
			}
		}
	}

	return installed, nil
}

// handleInstallApp handles app installation requests
func (ws *WebServer) handleInstallApp(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")

	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		Name      string                 `json:"name"`
		Namespace string                 `json:"namespace"`
		Values    map[string]interface{} `json:"values,omitempty"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Invalid request body",
		})
		return
	}

	// Find app in catalog
	var app *AppDefinition
	for _, a := range appsCatalog {
		if a.Name == req.Name {
			app = &a
			break
		}
	}

	if app == nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "App not found in catalog",
		})
		return
	}

	// Namespace will be created by helm --create-namespace flag

	// Install using helm
	go func() {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Minute)
		defer cancel()

		// Add repo
		repoName := strings.ReplaceAll(app.Name, "-", "")
		addRepoCmd := exec.CommandContext(ctx, "helm", "repo", "add", repoName, app.ChartRepo)
		addRepoCmd.Run() // Ignore errors if repo already exists

		// Update repo
		updateCmd := exec.CommandContext(ctx, "helm", "repo", "update")
		updateCmd.Run()

		// Install chart
		namespace := req.Namespace
		if namespace == "" {
			namespace = "default"
		}

		args := []string{
			"install", app.Name,
			fmt.Sprintf("%s/%s", repoName, app.ChartName),
			"--namespace", namespace,
			"--create-namespace",
			"--wait",
			"--timeout", "5m",
		}

		installCmd := exec.CommandContext(ctx, "helm", args...)
		output, err := installCmd.CombinedOutput()
		if err != nil {
			// Log installation error (visible in server logs)
			fmt.Printf("Helm install error for %s: %v\nOutput: %s\n", app.Name, err, string(output))
		} else {
			fmt.Printf("Successfully installed %s in namespace %s\n", app.Name, namespace)
		}
	}()

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": fmt.Sprintf("Installation of %s started in namespace %s", app.DisplayName, req.Namespace),
	})
}

// handleUninstallApp handles app uninstallation requests
func (ws *WebServer) handleUninstallApp(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")

	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		Name      string `json:"name"`
		Namespace string `json:"namespace"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Invalid request body",
		})
		return
	}

	// Find app in catalog
	var app *AppDefinition
	for _, a := range appsCatalog {
		if a.Name == req.Name {
			app = &a
			break
		}
	}

	if app == nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "App not found in catalog",
		})
		return
	}

	// Uninstall using helm
	go func() {
		ctx, cancel := context.WithTimeout(context.Background(), 2*time.Minute)
		defer cancel()

		namespace := req.Namespace
		if namespace == "" {
			namespace = "default"
		}

		cmd := exec.CommandContext(ctx, "helm", "uninstall", app.Name, "--namespace", namespace)
		output, err := cmd.CombinedOutput()
		if err != nil {
			fmt.Printf("Helm uninstall error for %s: %v\nOutput: %s\n", app.Name, err, string(output))
		} else {
			fmt.Printf("Successfully uninstalled %s from namespace %s\n", app.Name, namespace)
		}
	}()

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": fmt.Sprintf("Uninstallation of %s started", app.DisplayName),
	})
}
