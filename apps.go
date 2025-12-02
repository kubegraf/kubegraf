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
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"time"

	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/tools/clientcmd"
	metricsclientset "k8s.io/metrics/pkg/client/clientset/versioned"
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
		Name        string                 `json:"name"`
		Namespace   string                 `json:"namespace"`
		Values      map[string]interface{} `json:"values,omitempty"`
		ClusterName string                 `json:"clusterName,omitempty"` // For local clusters
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

	// Handle local cluster installers differently
	if app.ChartRepo == "local-cluster" {
		go func() {
			ctx, cancel := context.WithTimeout(context.Background(), 15*time.Minute)
			defer cancel()

			// Check for Docker/container runtime first
			dockerAvailable := false
			if _, err := exec.LookPath("docker"); err == nil {
				// Check if Docker daemon is running
				checkCmd := exec.CommandContext(ctx, "docker", "info")
				if err := checkCmd.Run(); err == nil {
					dockerAvailable = true
				}
			}

			osType := runtime.GOOS
			arch := runtime.GOARCH
			
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
				
				fmt.Printf("❌ %s\n", errorMsg)
				
				// Try to send error to frontend via WebSocket if possible
				// For now, the error will be visible in server logs
				// The frontend will show a generic error from the API response
				return
			}

			var cmd *exec.Cmd
			// Use custom cluster name if provided, otherwise default
			clusterName := req.ClusterName
			if clusterName == "" {
				clusterName = "kubegraf-cluster"
			}

			switch app.Name {
			case "k3d":
				// Check if k3d is installed
				k3dPath := "k3d"
				if _, err := exec.LookPath("k3d"); err != nil {
					// Install k3d based on OS
					if osType == "windows" {
						// Windows: Use PowerShell to install
						installCmd := exec.CommandContext(ctx, "powershell", "-Command",
							"Invoke-WebRequest -Uri https://raw.githubusercontent.com/k3d-io/k3d/main/install.ps1 -UseBasicParsing | Invoke-Expression")
						if err := installCmd.Run(); err != nil {
							fmt.Printf("Failed to install k3d: %v\n", err)
							return
						}
					} else {
						// macOS/Linux: Use bash script
						installCmd := exec.CommandContext(ctx, "sh", "-c",
							"curl -s https://raw.githubusercontent.com/k3d-io/k3d/main/install.sh | bash")
						if err := installCmd.Run(); err != nil {
							fmt.Printf("Failed to install k3d: %v\n", err)
							return
						}
					}
				}
				// Create lightweight single-node k3d cluster
				// Note: k3d doesn't set Docker resource limits by default, so it uses all available resources.
				// To limit resources, configure Docker Desktop: Settings > Resources > Advanced
				// For a lightweight cluster, we create a single-node setup (no agents)
				cmd = exec.CommandContext(ctx, k3dPath, "cluster", "create", clusterName,
					"--agents", "0", // Single node cluster (no agent nodes) - reduces resource usage
					"--port", "8080:80@loadbalancer",
					"--port", "8443:443@loadbalancer",
					"--wait")

			case "kind":
				// Check if kind is installed
				kindPath := "kind"
				if _, err := exec.LookPath("kind"); err != nil {
					// Install kind based on OS
					if osType == "windows" {
						// Windows: Download .exe
						kindPath = filepath.Join(os.TempDir(), "kind.exe")
						downloadCmd := exec.CommandContext(ctx, "powershell", "-Command",
							fmt.Sprintf("Invoke-WebRequest -Uri https://kind.sigs.k8s.io/dl/v0.20.0/kind-windows-amd64 -OutFile %s", kindPath))
						downloadCmd.Run()
						// Add to PATH or use full path
						// For simplicity, we'll use the full path
						cmd = exec.CommandContext(ctx, kindPath, "create", "cluster", "--name", clusterName)
					} else {
						// macOS/Linux: Download binary
						kindPath = filepath.Join(os.TempDir(), "kind")
						archSuffix := "amd64"
						if arch == "arm64" {
							archSuffix = "arm64"
						}
						osSuffix := "linux"
						if osType == "darwin" {
							osSuffix = "darwin"
						}
						downloadCmd := exec.CommandContext(ctx, "sh", "-c",
							fmt.Sprintf("curl -Lo %s https://kind.sigs.k8s.io/dl/v0.20.0/kind-%s-%s && chmod +x %s",
								kindPath, osSuffix, archSuffix, kindPath))
						downloadCmd.Run()
						// Create cluster using downloaded binary
						cmd = exec.CommandContext(ctx, kindPath, "create", "cluster", "--name", clusterName)
					}
				} else {
					// kind is already installed
					cmd = exec.CommandContext(ctx, "kind", "create", "cluster", "--name", clusterName)
				}

			case "minikube":
				// Check if minikube is installed
				if _, err := exec.LookPath("minikube"); err != nil {
					// Install minikube based on OS
					var installCmd *exec.Cmd
					if osType == "windows" {
						// Windows: Use chocolatey or direct download
						if _, err := exec.LookPath("choco"); err == nil {
							installCmd = exec.CommandContext(ctx, "choco", "install", "minikube", "-y")
						} else {
							// Direct download for Windows
							minikubePath := filepath.Join(os.TempDir(), "minikube.exe")
							downloadCmd := exec.CommandContext(ctx, "powershell", "-Command",
								fmt.Sprintf("Invoke-WebRequest -Uri https://github.com/kubernetes/minikube/releases/latest/download/minikube-windows-amd64.exe -OutFile %s", minikubePath))
							downloadCmd.Run()
							// Note: User may need to add to PATH manually
						}
					} else if osType == "darwin" {
						// macOS: Use brew
						if _, err := exec.LookPath("brew"); err == nil {
							installCmd = exec.CommandContext(ctx, "brew", "install", "minikube")
						}
					} else {
						// Linux: Use package manager or direct download
						if _, err := exec.LookPath("apt-get"); err == nil {
							installCmd = exec.CommandContext(ctx, "sh", "-c",
								"curl -LO https://storage.googleapis.com/minikube/releases/latest/minikube-linux-amd64 && sudo install minikube-linux-amd64 /usr/local/bin/minikube")
						}
					}
					if installCmd != nil {
						installCmd.Run()
					}
				}
				// Start minikube cluster
				driver := "docker"
				if osType == "windows" {
					driver = "docker" // or "hyperv" if available
				}
				cmd = exec.CommandContext(ctx, "minikube", "start", "--driver="+driver, "--profile", clusterName)

			default:
				fmt.Printf("Unknown local cluster type: %s\n", app.Name)
				return
			}

			if cmd != nil {
				output, err := cmd.CombinedOutput()
				if err != nil {
					errorOutput := string(output)
					fmt.Printf("❌ Local cluster install error for %s: %v\nOutput: %s\n", app.Name, err, errorOutput)
					
					// Check for common errors and provide helpful messages
					if strings.Contains(errorOutput, "docker") || strings.Contains(errorOutput, "Cannot connect to the Docker daemon") {
						fmt.Printf("💡 Tip: Make sure Docker Desktop is running and try again.\n")
					} else if strings.Contains(errorOutput, "permission denied") {
						fmt.Printf("💡 Tip: On Linux, you may need to run with sudo or add your user to the docker group.\n")
					} else if strings.Contains(errorOutput, "port") || strings.Contains(errorOutput, "already in use") {
						fmt.Printf("💡 Tip: A cluster with this name may already exist. Try deleting it first or use a different name.\n")
					}
				} else {
					fmt.Printf("Successfully created %s cluster: %s\n", app.DisplayName, clusterName)

					// Update kubeconfig and switch context
					var contextName string
					if app.Name == "k3d" {
						// k3d automatically updates kubeconfig
						exec.CommandContext(ctx, "k3d", "kubeconfig", "merge", clusterName, "--kubeconfig-merge-default").Run()
						contextName = "k3d-" + clusterName
					} else if app.Name == "kind" {
						// kind automatically updates kubeconfig
						exec.CommandContext(ctx, "kind", "export", "kubeconfig", "--name", clusterName).Run()
						contextName = "kind-" + clusterName
					} else if app.Name == "minikube" {
						// minikube automatically updates kubeconfig
						exec.CommandContext(ctx, "minikube", "update-context", "--profile", clusterName).Run()
						contextName = clusterName
					}

					// Wait a moment for kubeconfig to be updated
					time.Sleep(3 * time.Second)

					// Reload contexts and automatically switch to the new cluster
					if ws.app != nil && ws.app.contextManager != nil {
						// Reload kubeconfig to detect new context
						loadingRules := clientcmd.NewDefaultClientConfigLoadingRules()
						configOverrides := &clientcmd.ConfigOverrides{}
						kubeConfig := clientcmd.NewNonInteractiveDeferredLoadingClientConfig(loadingRules, configOverrides)

						rawConfig, err := kubeConfig.RawConfig()
						if err == nil {
							// Check if the new context exists
							if _, exists := rawConfig.Contexts[contextName]; exists {
								// Create config for the new context
								contextConfig := clientcmd.NewNonInteractiveDeferredLoadingClientConfig(
									loadingRules,
									&clientcmd.ConfigOverrides{CurrentContext: contextName},
								)

								config, err := contextConfig.ClientConfig()
								if err == nil {
									clientset, err := kubernetes.NewForConfig(config)
									if err == nil {
										metricsClient, _ := metricsclientset.NewForConfig(config)

										// Add to context manager
										ws.app.contextManager.mu.Lock()
										ws.app.contextManager.Contexts[contextName] = &ClusterContext{
											Name:          contextName,
											Clientset:     clientset,
											MetricsClient: metricsClient,
											Config:        config,
											Connected:     true,
											ServerVersion: "", // Will be populated on first use
										}
										// Add to context order if not already present
										found := false
										for _, name := range ws.app.contextManager.ContextOrder {
											if name == contextName {
												found = true
												break
											}
										}
										if !found {
											ws.app.contextManager.ContextOrder = append(ws.app.contextManager.ContextOrder, contextName)
										}
										ws.app.contextManager.mu.Unlock()

										// Automatically switch to the new context
										if err := ws.app.SwitchContext(contextName); err == nil {
											fmt.Printf("✓ Successfully created and connected to %s cluster (context: %s)\n", app.DisplayName, contextName)

											// Broadcast context change to all WebSocket clients
											contextMsg := map[string]interface{}{
												"type":    "contextSwitch",
												"context": contextName,
												"message": fmt.Sprintf("Connected to new %s cluster", app.DisplayName),
											}
											for client := range ws.clients {
												if err := client.WriteJSON(contextMsg); err != nil {
													client.Close()
													delete(ws.clients, client)
												}
											}
										} else {
											fmt.Printf("Cluster created but failed to switch context: %v\n", err)
										}
									} else {
										fmt.Printf("Cluster created but failed to create clientset: %v\n", err)
									}
								} else {
									fmt.Printf("Cluster created but failed to create config: %v\n", err)
								}
							} else {
								fmt.Printf("Cluster created but context '%s' not found in kubeconfig. Available contexts: %v\n", contextName, func() []string {
									ctxs := make([]string, 0, len(rawConfig.Contexts))
									for k := range rawConfig.Contexts {
										ctxs = append(ctxs, k)
									}
									return ctxs
								}())
							}
						} else {
							fmt.Printf("Cluster created but failed to reload kubeconfig: %v\n", err)
						}
					} else {
						fmt.Printf("Cluster created successfully. Context name: %s\n", contextName)
						fmt.Printf("Please refresh the app to see the new cluster.\n")
					}
				}
			}
		}()

		// Return success immediately - actual installation happens in goroutine
		// Errors will be logged to console, and user can check server logs
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": true,
			"message": fmt.Sprintf("Installation of %s started. This may take a few minutes. The cluster will be automatically connected when ready.", app.DisplayName),
			"note":    "If Docker is not installed or not running, installation will fail. Check server logs for details.",
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
		Name        string `json:"name"`
		Namespace   string `json:"namespace"`
		ClusterName string `json:"clusterName,omitempty"` // For local clusters
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

	// Handle local cluster uninstallation differently
	if app.ChartRepo == "local-cluster" {
		go func() {
			ctx, cancel := context.WithTimeout(context.Background(), 5*time.Minute)
			defer cancel()

			clusterName := req.ClusterName
			if clusterName == "" {
				clusterName = "kubegraf-cluster" // Default name
			}

			var cmd *exec.Cmd
			switch app.Name {
			case "k3d":
				cmd = exec.CommandContext(ctx, "k3d", "cluster", "delete", clusterName)
			case "kind":
				cmd = exec.CommandContext(ctx, "kind", "delete", "cluster", "--name", clusterName)
			case "minikube":
				cmd = exec.CommandContext(ctx, "minikube", "delete", "--profile", clusterName)
			default:
				fmt.Printf("Unknown local cluster type: %s\n", app.Name)
				return
			}

			output, err := cmd.CombinedOutput()
			if err != nil {
				fmt.Printf("Failed to delete %s cluster %s: %v\nOutput: %s\n", app.Name, clusterName, err, string(output))
			} else {
				fmt.Printf("Successfully deleted %s cluster: %s\n", app.DisplayName, clusterName)
			}
		}()

		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": true,
			"message": fmt.Sprintf("Deletion of %s cluster started", app.DisplayName),
		})
		return
	}

	// Uninstall using helm for regular apps
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

// LocalClusterInfo represents information about a local cluster
type LocalClusterInfo struct {
	Name      string `json:"name"`
	Type      string `json:"type"` // "k3d", "kind", "minikube"
	Status    string `json:"status"`
	Context   string `json:"context"`
	CreatedAt string `json:"createdAt,omitempty"`
}

// handleLocalClusters returns a list of local clusters (k3d, kind, minikube)
func (ws *WebServer) handleLocalClusters(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")

	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var clusters []LocalClusterInfo
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// List k3d clusters
	if k3dPath, err := exec.LookPath("k3d"); err == nil {
		cmd := exec.CommandContext(ctx, k3dPath, "cluster", "list", "--no-headers", "-o", "json")
		output, err := cmd.Output()
		if err == nil {
			var k3dClusters []struct {
				Name   string `json:"name"`
				Status string `json:"serversRunning"`
			}
			if err := json.Unmarshal(output, &k3dClusters); err == nil {
				for _, c := range k3dClusters {
					status := "Stopped"
					if c.Status != "" && c.Status != "0" {
						status = "Running"
					}
					clusters = append(clusters, LocalClusterInfo{
						Name:    c.Name,
						Type:    "k3d",
						Status:  status,
						Context: "k3d-" + c.Name,
					})
				}
			}
		}
	}

	// List kind clusters
	if kindPath, err := exec.LookPath("kind"); err == nil {
		cmd := exec.CommandContext(ctx, kindPath, "get", "clusters")
		output, err := cmd.Output()
		if err == nil {
			lines := strings.Split(strings.TrimSpace(string(output)), "\n")
			for _, name := range lines {
				if name != "" {
					clusters = append(clusters, LocalClusterInfo{
						Name:    name,
						Type:    "kind",
						Status:  "Running", // kind doesn't easily show status, assume running if listed
						Context: "kind-" + name,
					})
				}
			}
		}
	}

	// List minikube profiles
	if minikubePath, err := exec.LookPath("minikube"); err == nil {
		cmd := exec.CommandContext(ctx, minikubePath, "profile", "list", "-o", "json")
		output, err := cmd.Output()
		if err == nil {
			var minikubeProfiles []struct {
				Name   string `json:"Name"`
				Status string `json:"Status"`
			}
			if err := json.Unmarshal(output, &minikubeProfiles); err == nil {
				for _, p := range minikubeProfiles {
					clusters = append(clusters, LocalClusterInfo{
						Name:    p.Name,
						Type:    "minikube",
						Status:  p.Status,
						Context: p.Name,
					})
				}
			}
		}
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"clusters": clusters,
		"total":   len(clusters),
	})
}
