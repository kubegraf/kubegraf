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
	"net/http"
	"os/exec"
	"runtime"
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
	{
		Name:        "mlflow",
		DisplayName: "MLflow",
		Description: "Open source platform for managing the ML lifecycle, including experimentation, reproducibility, deployment, and a central model registry",
		Category:    "ML Apps",
		Version:     "2.8.0",
		ChartRepo:   "https://community-charts.github.io/helm-charts",
		ChartName:   "mlflow",
	},
	{
		Name:        "feast",
		DisplayName: "Feast Feature Store",
		Description: "Open source feature store for machine learning. Store, manage, and serve features for training and inference",
		Category:    "ML Apps",
		Version:     "0.38.0",
		ChartRepo:   "https://feast-charts.storage.googleapis.com",
		ChartName:   "feast",
	},
	// Local Cluster Installers
	{
		Name:        "k3d",
		DisplayName: "k3d - Local Kubernetes",
		Description: "Lightweight wrapper to run k3s in Docker. Perfect for local development and testing.",
		Category:    "Local Cluster",
		Version:     "Latest",
		ChartRepo:   "local-cluster",
		ChartName:   "k3d",
	},
	{
		Name:        "kind",
		DisplayName: "kind - Kubernetes in Docker",
		Description: "Run local Kubernetes clusters using Docker container nodes. Great for CI/CD and development.",
		Category:    "Local Cluster",
		Version:     "Latest",
		ChartRepo:   "local-cluster",
		ChartName:   "kind",
	},
	{
		Name:        "minikube",
		DisplayName: "Minikube - Local Kubernetes",
		Description: "Run Kubernetes locally. Minikube runs a single-node Kubernetes cluster inside a VM on your laptop.",
		Category:    "Local Cluster",
		Version:     "Latest",
		ChartRepo:   "local-cluster",
		ChartName:   "minikube",
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

	// Return ALL installed Helm releases (not just catalog matches)
	installed := make([]InstalledApp, 0, len(releases))
	for _, release := range releases {
		installed = append(installed, InstalledApp{
			Name:      release.Name,
			Namespace: release.Namespace,
			Status:    release.Status,
			Version:   release.AppVersion,
			Chart:     release.Chart,
		})
	}

	return installed, nil
}

// handleInstallApp handles app installation requests
func (ws *WebServer) handleInstallApp(w http.ResponseWriter, r *http.Request) {
	fmt.Printf("📥 [API] Received app installation request\n")

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")

	if r.Method != http.MethodPost {
		fmt.Printf("❌ [API] Method not allowed: %s\n", r.Method)
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		Name        string                 `json:"name"`
		Namespace   string                 `json:"namespace"`
		Values      map[string]interface{} `json:"values,omitempty"`
		ClusterName string                 `json:"clusterName,omitempty"` // For local clusters
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		fmt.Printf("❌ [API] Failed to decode request body: %v\n", err)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Invalid request body",
		})
		return
	}

	fmt.Printf("📦 [API] Install request: name=%s, namespace=%s, clusterName=%s\n", req.Name, req.Namespace, req.ClusterName)

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

	// Create installation record in database
	var installationID int
	if ws.db != nil {
		installation, err := ws.db.CreateAppInstallation(app.Name, app.DisplayName, app.Version, req.Namespace)
		if err == nil {
			installationID = installation.ID
			// Update progress to 10% (initializing)
			ws.db.UpdateAppInstallation(installationID, "initializing", 10, "")
		}
	}

	// Handle local cluster installers differently
	if app.ChartRepo == "local-cluster" {
		// Check Docker synchronously before starting installation
		dockerAvailable := false
		dockerError := ""
		
		if _, err := exec.LookPath("docker"); err == nil {
			// Check if Docker daemon is running
			checkCmd := exec.Command("docker", "info")
			if err := checkCmd.Run(); err == nil {
				dockerAvailable = true
			} else {
				dockerError = "Docker is installed but not running. Please start Docker Desktop and try again."
			}
		} else {
			osType := runtime.GOOS
			dockerURL := "https://docs.docker.com/get-docker/"
			if osType == "windows" {
				dockerURL = "https://www.docker.com/products/docker-desktop/"
			} else if osType == "darwin" {
				dockerURL = "https://www.docker.com/products/docker-desktop/"
			}
			dockerError = fmt.Sprintf("Docker is not installed or not running. Please install Docker Desktop from %s and start it before installing local clusters.", dockerURL)
		}

		if !dockerAvailable {
			fmt.Printf("❌ [API] Docker not available: %s\n", dockerError)
			// Update installation record with error
			if installationID > 0 {
				ws.db.UpdateAppInstallation(installationID, "failed", 0, dockerError)
			}

			json.NewEncoder(w).Encode(map[string]interface{}{
				"success": false,
				"error":   dockerError,
				"app":     app.Name,
			})
			return
		}

		fmt.Printf("✅ [API] Docker is available, launching local cluster installer for %s (installationID: %d)\n", app.Name, installationID)
		go ws.installLocalCluster(app, req.Namespace, req.ClusterName, installationID)
	} else {
		fmt.Printf("✅ [API] Launching Helm installer for %s (installationID: %d)\n", app.Name, installationID)
		go ws.installHelmApp(app, req.Namespace, req.Values, installationID)
	}

	fmt.Printf("📤 [API] Returning success response for %s installation\n", app.DisplayName)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": fmt.Sprintf("Installation of %s has started", app.DisplayName),
		"app":     app.Name,
	})
}

// installLocalCluster installs a local Kubernetes cluster (k3d, kind, minikube)
func (ws *WebServer) installLocalCluster(app *AppDefinition, namespace, clusterName string, installationID int) {
	fmt.Printf("🚀 [Local Cluster] Starting installation for app: %s, namespace: %s, clusterName: %s (installationID: %d)\n",
		app.Name, namespace, clusterName, installationID)

	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Minute)
	defer cancel()

	// Update progress to 20% (checking Docker)
	if installationID > 0 {
		ws.db.UpdateAppInstallation(installationID, "checking_docker", 20, "")
		fmt.Printf("📊 [Local Cluster] Updated progress to 20%% (checking Docker)\n")
	}

	// Check for Docker/container runtime first
	fmt.Printf("🐳 [Local Cluster] Checking if Docker is available\n")
	dockerAvailable := false
	if _, err := exec.LookPath("docker"); err == nil {
		fmt.Printf("✅ [Local Cluster] Docker binary found, checking if daemon is running\n")
		// Check if Docker daemon is running
		checkCmd := exec.CommandContext(ctx, "docker", "info")
		if err := checkCmd.Run(); err == nil {
			dockerAvailable = true
			fmt.Printf("✅ [Local Cluster] Docker daemon is running\n")
		} else {
			fmt.Printf("❌ [Local Cluster] Docker daemon is not running: %v\n", err)
		}
	} else {
		fmt.Printf("❌ [Local Cluster] Docker binary not found: %v\n", err)
	}

	osType := runtime.GOOS

	if !dockerAvailable {
		dockerURL := "https://docs.docker.com/get-docker/"
		if osType == "windows" {
			dockerURL = "https://www.docker.com/products/docker-desktop/"
		} else if osType == "darwin" {
			dockerURL = "https://www.docker.com/products/docker-desktop/"
		}

		errorMsg := fmt.Sprintf("Docker is not installed or not running.\n\n"+
			"Local clusters (k3d, kind, minikube) require Docker to be installed and running.\n\n"+
			"Please install Docker Desktop:\n%s\n\n"+
			"After installing Docker, please:\n"+
			"1. Start Docker Desktop\n"+
			"2. Wait for Docker to be ready\n"+
			"3. Try installing the cluster again", dockerURL)

		fmt.Printf("❌ [Local Cluster] %s\n", errorMsg)

		// Update installation record with error
		if installationID > 0 {
			ws.db.UpdateAppInstallation(installationID, "failed", 0, errorMsg)
		}
		return
	}

	// Use custom cluster name if provided, otherwise default
	if clusterName == "" {
		clusterName = "kubegraf-cluster"
	}
	fmt.Printf("📝 [Local Cluster] Using cluster name: %s\n", clusterName)

	// Update progress to 30% (installing tools)
	if installationID > 0 {
		ws.db.UpdateAppInstallation(installationID, "installing_tools", 30, "")
		fmt.Printf("📊 [Local Cluster] Updated progress to 30%% (installing tools)\n")
	}

	fmt.Printf("🔄 [Local Cluster] Dispatching to installer for: %s\n", app.Name)
	switch app.Name {
	case "k3d":
		ws.installK3d(ctx, clusterName, installationID)
	case "kind":
		ws.installKind(ctx, clusterName, installationID)
	case "minikube":
		ws.installMinikube(ctx, clusterName, installationID)
	}
}

// installK3d installs a k3d cluster
func (ws *WebServer) installK3d(ctx context.Context, clusterName string, installationID int) {
	fmt.Printf("🚀 [K3D Install] Starting installation for cluster: %s (installationID: %d)\n", clusterName, installationID)

	// Check if k3d is installed
	osType := runtime.GOOS
	fmt.Printf("📦 [K3D Install] Checking if k3d is installed (OS: %s)\n", osType)

	if _, err := exec.LookPath("k3d"); err != nil {
		fmt.Printf("⚠️  [K3D Install] k3d not found, proceeding with installation\n")

		// Install k3d based on OS
		if osType == "windows" {
			fmt.Printf("🔧 [K3D Install] Installing k3d on Windows using PowerShell\n")
			// Windows: Use PowerShell to install
			installCmd := exec.CommandContext(ctx, "powershell", "-Command",
				"Invoke-WebRequest -Uri https://raw.githubusercontent.com/k3d-io/k3d/main/install.ps1 -UseBasicParsing | Invoke-Expression")

			var stdout, stderr bytes.Buffer
			installCmd.Stdout = &stdout
			installCmd.Stderr = &stderr

			if err := installCmd.Run(); err != nil {
				errMsg := fmt.Sprintf("Failed to install k3d: %v\nStdout: %s\nStderr: %s", err, stdout.String(), stderr.String())
				fmt.Printf("❌ [K3D Install] %s\n", errMsg)
				if installationID > 0 {
					ws.db.UpdateAppInstallation(installationID, "failed", 0, errMsg)
				}
				return
			}
			fmt.Printf("✅ [K3D Install] k3d installed successfully on Windows\n")
			fmt.Printf("📝 [K3D Install] Install output: %s\n", stdout.String())
		} else {
			fmt.Printf("🔧 [K3D Install] Installing k3d on macOS/Linux using bash\n")
			// macOS/Linux: Use bash script
			installCmd := exec.CommandContext(ctx, "sh", "-c",
				"curl -s https://raw.githubusercontent.com/k3d-io/k3d/main/install.sh | bash")

			var stdout, stderr bytes.Buffer
			installCmd.Stdout = &stdout
			installCmd.Stderr = &stderr

			if err := installCmd.Run(); err != nil {
				errMsg := fmt.Sprintf("Failed to install k3d: %v\nStdout: %s\nStderr: %s", err, stdout.String(), stderr.String())
				fmt.Printf("❌ [K3D Install] %s\n", errMsg)
				if installationID > 0 {
					ws.db.UpdateAppInstallation(installationID, "failed", 0, errMsg)
				}
				return
			}
			fmt.Printf("✅ [K3D Install] k3d installed successfully on macOS/Linux\n")
			fmt.Printf("📝 [K3D Install] Install output: %s\n", stdout.String())
		}
	} else {
		fmt.Printf("✅ [K3D Install] k3d already installed\n")
	}

	// Update progress to 40% (creating cluster)
	if installationID > 0 {
		ws.db.UpdateAppInstallation(installationID, "creating_cluster", 40, "")
		fmt.Printf("📊 [K3D Install] Updated progress to 40%% (creating cluster)\n")
	}

	// Create k3d cluster with random ports to avoid conflicts
	// K3D automatically adds "k3d-" prefix, so we pass the cluster name without any k3d- prefix
	// User provides: kubegraf-<suffix> → K3D creates: k3d-kubegraf-<suffix>
	k3dClusterName := clusterName
	fmt.Printf("🏗️  [K3D Install] Creating k3d cluster with name: %s (K3D will add 'k3d-' prefix automatically)\n", k3dClusterName)
	createCmd := exec.CommandContext(ctx, "k3d", "cluster", "create", k3dClusterName,
		"--agents", "1",
		"--servers", "1",
		"--wait")

	var createStdout, createStderr bytes.Buffer
	createCmd.Stdout = &createStdout
	createCmd.Stderr = &createStderr

	if err := createCmd.Run(); err != nil {
		errMsg := fmt.Sprintf("Failed to create k3d cluster: %v\nStdout: %s\nStderr: %s", err, createStdout.String(), createStderr.String())
		fmt.Printf("❌ [K3D Install] %s\n", errMsg)
		if installationID > 0 {
			ws.db.UpdateAppInstallation(installationID, "failed", 0, errMsg)
		}
		return
	}
	fmt.Printf("✅ [K3D Install] Cluster created successfully\n")
	fmt.Printf("📝 [K3D Install] Create output: %s\n", createStdout.String())

	// Update progress to 80% (configuring kubectl)
	if installationID > 0 {
		ws.db.UpdateAppInstallation(installationID, "configuring_kubectl", 80, "")
		fmt.Printf("📊 [K3D Install] Updated progress to 80%% (configuring kubectl)\n")
	}

	// Get kubeconfig
	fmt.Printf("🔧 [K3D Install] Writing kubeconfig for cluster: %s\n", k3dClusterName)
	kubeconfigCmd := exec.CommandContext(ctx, "k3d", "kubeconfig", "write", k3dClusterName)

	var kcStdout, kcStderr bytes.Buffer
	kubeconfigCmd.Stdout = &kcStdout
	kubeconfigCmd.Stderr = &kcStderr

	if err := kubeconfigCmd.Run(); err != nil {
		errMsg := fmt.Sprintf("Failed to write kubeconfig: %v\nStdout: %s\nStderr: %s", err, kcStdout.String(), kcStderr.String())
		fmt.Printf("❌ [K3D Install] %s\n", errMsg)
		if installationID > 0 {
			ws.db.UpdateAppInstallation(installationID, "failed", 0, errMsg)
		}
		return
	}
	fmt.Printf("✅ [K3D Install] Kubeconfig written successfully\n")
	fmt.Printf("📝 [K3D Install] Kubeconfig output: %s\n", kcStdout.String())

	// Update progress to 100% (completed)
	if installationID > 0 {
		ws.db.UpdateAppInstallation(installationID, "completed", 100, "K3d cluster created successfully")
		fmt.Printf("📊 [K3D Install] Updated progress to 100%% (completed)\n")
	}

	fmt.Printf("✅ [K3D Install] k3d cluster '%s' created successfully (full name: k3d-%s)\n", k3dClusterName, k3dClusterName)
}

// installKind installs a kind cluster
func (ws *WebServer) installKind(ctx context.Context, clusterName string, installationID int) {
	// Check if kind is installed
	osType := runtime.GOOS

	if _, err := exec.LookPath("kind"); err != nil {
		// Install kind based on OS
		if osType == "windows" {
			// Windows: Use PowerShell to install
			installCmd := exec.CommandContext(ctx, "powershell", "-Command",
				"curl.exe -Lo kind-windows-amd64.exe https://kind.sigs.k8s.io/dl/latest/kind-windows-amd64 && "+
					"Move-Item kind-windows-amd64.exe C:\\Windows\\System32\\kind.exe")
			if err := installCmd.Run(); err != nil {
				fmt.Printf("Failed to install kind: %v\n", err)
				if installationID > 0 {
					ws.db.UpdateAppInstallation(installationID, "failed", 0, fmt.Sprintf("Failed to install kind: %v", err))
				}
				return
			}
		} else if osType == "darwin" {
			// macOS: Use brew or direct download
			installCmd := exec.CommandContext(ctx, "sh", "-c",
				"command -v brew >/dev/null 2>&1 && brew install kind || "+
					"curl -Lo ./kind https://kind.sigs.k8s.io/dl/latest/kind-$(uname)-$(uname -m | sed 's/x86_64/amd64/') && "+
					"chmod +x ./kind && sudo mv ./kind /usr/local/bin/kind")
			if err := installCmd.Run(); err != nil {
				fmt.Printf("Failed to install kind: %v\n", err)
				if installationID > 0 {
					ws.db.UpdateAppInstallation(installationID, "failed", 0, fmt.Sprintf("Failed to install kind: %v", err))
				}
				return
			}
		} else {
			// Linux: Direct download
			installCmd := exec.CommandContext(ctx, "sh", "-c",
				"curl -Lo ./kind https://kind.sigs.k8s.io/dl/latest/kind-linux-amd64 && "+
					"chmod +x ./kind && sudo mv ./kind /usr/local/bin/kind")
			if err := installCmd.Run(); err != nil {
				fmt.Printf("Failed to install kind: %v\n", err)
				if installationID > 0 {
					ws.db.UpdateAppInstallation(installationID, "failed", 0, fmt.Sprintf("Failed to install kind: %v", err))
				}
				return
			}
		}
	}

	// Update progress to 40% (creating cluster)
	if installationID > 0 {
		ws.db.UpdateAppInstallation(installationID, "creating_cluster", 40, "")
	}

	// Create kind cluster
	createCmd := exec.CommandContext(ctx, "kind", "create", "cluster", "--name", clusterName, "--wait", "5m")

	if err := createCmd.Run(); err != nil {
		fmt.Printf("Failed to create kind cluster: %v\n", err)
		if installationID > 0 {
			ws.db.UpdateAppInstallation(installationID, "failed", 0, fmt.Sprintf("Failed to create kind cluster: %v", err))
		}
		return
	}

	// Update progress to 80% (configuring kubectl)
	if installationID > 0 {
		ws.db.UpdateAppInstallation(installationID, "configuring_kubectl", 80, "")
	}

	// Get kubeconfig (kind automatically merges into default kubeconfig)
	// Verify the cluster is accessible
	verifyCmd := exec.CommandContext(ctx, "kubectl", "cluster-info", "--context", "kind-"+clusterName)
	if err := verifyCmd.Run(); err != nil {
		fmt.Printf("Warning: Failed to verify kind cluster: %v\n", err)
	}

	// Update progress to 100% (completed)
	if installationID > 0 {
		ws.db.UpdateAppInstallation(installationID, "completed", 100, "Kind cluster created successfully")
	}

	fmt.Printf("✅ kind cluster '%s' created successfully\n", clusterName)
}

// installMinikube installs a minikube cluster
func (ws *WebServer) installMinikube(ctx context.Context, clusterName string, installationID int) {
	// Check if minikube is installed
	osType := runtime.GOOS

	if _, err := exec.LookPath("minikube"); err != nil {
		// Install minikube based on OS
		if osType == "windows" {
			// Windows: Use PowerShell to install
			installCmd := exec.CommandContext(ctx, "powershell", "-Command",
				"New-Item -Path 'C:\\minikube' -Type Directory -Force; "+
					"Invoke-WebRequest -Uri 'https://storage.googleapis.com/minikube/releases/latest/minikube-windows-amd64.exe' -OutFile 'C:\\minikube\\minikube.exe'; "+
					"$env:Path += ';C:\\minikube'")
			if err := installCmd.Run(); err != nil {
				fmt.Printf("Failed to install minikube: %v\n", err)
				if installationID > 0 {
					ws.db.UpdateAppInstallation(installationID, "failed", 0, fmt.Sprintf("Failed to install minikube: %v", err))
				}
				return
			}
		} else if osType == "darwin" {
			// macOS: Use brew or direct download
			installCmd := exec.CommandContext(ctx, "sh", "-c",
				"command -v brew >/dev/null 2>&1 && brew install minikube || "+
					"curl -LO https://storage.googleapis.com/minikube/releases/latest/minikube-darwin-$(uname -m | sed 's/x86_64/amd64/') && "+
					"sudo install minikube-darwin-* /usr/local/bin/minikube")
			if err := installCmd.Run(); err != nil {
				fmt.Printf("Failed to install minikube: %v\n", err)
				if installationID > 0 {
					ws.db.UpdateAppInstallation(installationID, "failed", 0, fmt.Sprintf("Failed to install minikube: %v", err))
				}
				return
			}
		} else {
			// Linux: Direct download
			installCmd := exec.CommandContext(ctx, "sh", "-c",
				"curl -LO https://storage.googleapis.com/minikube/releases/latest/minikube-linux-amd64 && "+
					"sudo install minikube-linux-amd64 /usr/local/bin/minikube")
			if err := installCmd.Run(); err != nil {
				fmt.Printf("Failed to install minikube: %v\n", err)
				if installationID > 0 {
					ws.db.UpdateAppInstallation(installationID, "failed", 0, fmt.Sprintf("Failed to install minikube: %v", err))
				}
				return
			}
		}
	}

	// Update progress to 40% (creating cluster)
	if installationID > 0 {
		ws.db.UpdateAppInstallation(installationID, "creating_cluster", 40, "")
	}

	// Create minikube cluster
	createCmd := exec.CommandContext(ctx, "minikube", "start", "-p", clusterName, "--driver=docker")

	if err := createCmd.Run(); err != nil {
		fmt.Printf("Failed to create minikube cluster: %v\n", err)
		if installationID > 0 {
			ws.db.UpdateAppInstallation(installationID, "failed", 0, fmt.Sprintf("Failed to create minikube cluster: %v", err))
		}
		return
	}

	// Update progress to 80% (configuring kubectl)
	if installationID > 0 {
		ws.db.UpdateAppInstallation(installationID, "configuring_kubectl", 80, "")
	}

	// Get kubeconfig (minikube automatically updates default kubeconfig)
	// Verify the cluster is accessible
	verifyCmd := exec.CommandContext(ctx, "kubectl", "cluster-info", "--context", clusterName)
	if err := verifyCmd.Run(); err != nil {
		fmt.Printf("Warning: Failed to verify minikube cluster: %v\n", err)
	}

	// Update progress to 100% (completed)
	if installationID > 0 {
		ws.db.UpdateAppInstallation(installationID, "completed", 100, "Minikube cluster created successfully")
	}

	fmt.Printf("✅ minikube cluster '%s' created successfully\n", clusterName)
}

// installHelmApp installs a Helm chart
func (ws *WebServer) installHelmApp(app *AppDefinition, namespace string, values map[string]interface{}, installationID int) {
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Minute)
	defer cancel()

	// Update progress to 20% (checking Helm)
	if installationID > 0 {
		ws.db.UpdateAppInstallation(installationID, "checking_helm", 20, "")
	}

	// Check if Helm is installed
	if _, err := exec.LookPath("helm"); err != nil {
		errorMsg := "Helm is not installed. Please install Helm first: https://helm.sh/docs/intro/install/"
		fmt.Printf("❌ %s\n", errorMsg)
		if installationID > 0 {
			ws.db.UpdateAppInstallation(installationID, "failed", 0, errorMsg)
		}
		return
	}

	// Update progress to 30% (adding repo)
	if installationID > 0 {
		ws.db.UpdateAppInstallation(installationID, "adding_repo", 30, "")
	}

	// Add Helm repo
	repoName := strings.ReplaceAll(app.Name, "-", "") + "-repo"
	addRepoCmd := exec.CommandContext(ctx, "helm", "repo", "add", repoName, app.ChartRepo)
	if err := addRepoCmd.Run(); err != nil {
		fmt.Printf("Warning: Failed to add Helm repo (might already exist): %v\n", err)
	}

	// Update repo
	updateRepoCmd := exec.CommandContext(ctx, "helm", "repo", "update")
	if err := updateRepoCmd.Run(); err != nil {
		fmt.Printf("Warning: Failed to update Helm repos: %v\n", err)
	}

	// Update progress to 50% (installing chart)
	if installationID > 0 {
		ws.db.UpdateAppInstallation(installationID, "installing_chart", 50, "")
	}

	// Create namespace if it doesn't exist
	createNsCmd := exec.CommandContext(ctx, "kubectl", "create", "namespace", namespace, "--dry-run=client", "-o", "yaml")
	if output, err := createNsCmd.Output(); err == nil {
		applyCmd := exec.CommandContext(ctx, "kubectl", "apply", "-f", "-")
		applyCmd.Stdin = strings.NewReader(string(output))
		applyCmd.Run()
	}

	// Install Helm chart
	installArgs := []string{"install", app.Name, repoName + "/" + app.ChartName, "--namespace", namespace, "--create-namespace", "--wait", "--timeout", "10m"}

	// Add custom values if provided
	if len(values) > 0 {
		valuesJSON, _ := json.Marshal(values)
		installArgs = append(installArgs, "--set-json", string(valuesJSON))
	}

	installCmd := exec.CommandContext(ctx, "helm", installArgs...)
	output, err := installCmd.CombinedOutput()

	if err != nil {
		errorMsg := fmt.Sprintf("Failed to install Helm chart: %v\nOutput: %s", err, string(output))
		fmt.Printf("❌ %s\n", errorMsg)
		if installationID > 0 {
			ws.db.UpdateAppInstallation(installationID, "failed", 0, errorMsg)
		}
		return
	}

	// Update progress to 100% (completed)
	if installationID > 0 {
		ws.db.UpdateAppInstallation(installationID, "completed", 100, "Application installed successfully")
	}

	fmt.Printf("✅ %s installed successfully in namespace %s\n", app.DisplayName, namespace)
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

	// Uninstall using Helm
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Minute)
	defer cancel()

	uninstallCmd := exec.CommandContext(ctx, "helm", "uninstall", req.Name, "--namespace", req.Namespace)
	output, err := uninstallCmd.CombinedOutput()

	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   fmt.Sprintf("Failed to uninstall: %v\nOutput: %s", err, string(output)),
		})
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": fmt.Sprintf("Successfully uninstalled %s from namespace %s", req.Name, req.Namespace),
	})
}

// handleLocalClusters returns information about local clusters
func (ws *WebServer) handleLocalClusters(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")

	clusters := []map[string]interface{}{}

	// Check for k3d clusters
	if _, err := exec.LookPath("k3d"); err == nil {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()

		cmd := exec.CommandContext(ctx, "k3d", "cluster", "list", "-o", "json")
		if output, err := cmd.Output(); err == nil {
			var k3dClusters []map[string]interface{}
			if err := json.Unmarshal(output, &k3dClusters); err == nil {
				for _, cluster := range k3dClusters {
					clusters = append(clusters, map[string]interface{}{
						"name":     cluster["name"],
						"type":     "k3d",
						"status":   cluster["status"],
						"provider": "k3d",
					})
				}
			}
		}
	}

	// Check for kind clusters
	if _, err := exec.LookPath("kind"); err == nil {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()

		cmd := exec.CommandContext(ctx, "kind", "get", "clusters")
		if output, err := cmd.Output(); err == nil {
			kindClusters := strings.Split(strings.TrimSpace(string(output)), "\n")
			for _, clusterName := range kindClusters {
				if clusterName != "" {
					clusters = append(clusters, map[string]interface{}{
						"name":     clusterName,
						"type":     "kind",
						"status":   "running",
						"provider": "kind",
					})
				}
			}
		}
	}

	// Check for minikube clusters
	if _, err := exec.LookPath("minikube"); err == nil {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()

		cmd := exec.CommandContext(ctx, "minikube", "profile", "list", "-o", "json")
		if output, err := cmd.Output(); err == nil {
			var result struct {
				Valid []struct {
					Name   string `json:"Name"`
					Status string `json:"Status"`
				} `json:"valid"`
			}
			if err := json.Unmarshal(output, &result); err == nil {
				for _, profile := range result.Valid {
					clusters = append(clusters, map[string]interface{}{
						"name":     profile.Name,
						"type":     "minikube",
						"status":   profile.Status,
						"provider": "minikube",
					})
				}
			}
		}
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"clusters": clusters,
		"count":    len(clusters),
	})
}

// handleDeleteLocalCluster handles deletion of local clusters
func (ws *WebServer) handleDeleteLocalCluster(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")

	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		Name string `json:"name"`
		Type string `json:"type"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Invalid request body",
		})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Minute)
	defer cancel()

	fmt.Printf("🗑️  [Delete Cluster] Deleting %s cluster: %s\n", req.Type, req.Name)

	var cmd *exec.Cmd
	switch req.Type {
	case "k3d":
		cmd = exec.CommandContext(ctx, "k3d", "cluster", "delete", req.Name)
	case "kind":
		cmd = exec.CommandContext(ctx, "kind", "delete", "cluster", "--name", req.Name)
	case "minikube":
		cmd = exec.CommandContext(ctx, "minikube", "delete", "-p", req.Name)
	default:
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   fmt.Sprintf("Unknown cluster type: %s", req.Type),
		})
		return
	}

	output, err := cmd.CombinedOutput()
	if err != nil {
		errorMsg := fmt.Sprintf("Failed to delete %s cluster '%s': %v\nOutput: %s", req.Type, req.Name, err, string(output))
		fmt.Printf("❌ [Delete Cluster] %s\n", errorMsg)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   errorMsg,
		})
		return
	}

	fmt.Printf("✅ [Delete Cluster] Successfully deleted %s cluster: %s\n", req.Type, req.Name)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": fmt.Sprintf("Successfully deleted %s cluster '%s'", req.Type, req.Name),
	})
}
