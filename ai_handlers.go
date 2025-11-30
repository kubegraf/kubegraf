// Copyright 2025 KubeGraf Contributors
// SPDX-License-Identifier: Apache-2.0

package main

import (
	"context"
	"encoding/json"
	"net/http"
	"strconv"
	"time"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// AI Assistant handlers

// handleAIStatus returns the AI provider status
func (ws *WebServer) handleAIStatus(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	assistant := NewAIAssistant(nil)

	response := map[string]interface{}{
		"available": assistant.IsAvailable(),
		"provider":  assistant.ProviderName(),
	}

	json.NewEncoder(w).Encode(response)
}

// handleAIQuery handles AI queries
func (ws *WebServer) handleAIQuery(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var request struct {
		Query string `json:"query"`
	}
	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	assistant := NewAIAssistant(nil)
	if !assistant.IsAvailable() {
		http.Error(w, "No AI provider available", http.StatusServiceUnavailable)
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 60*time.Second)
	defer cancel()

	response, err := assistant.Query(ctx, request.Query)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"response": response,
	})
}

// handleAIAnalyzePod analyzes a pod using AI
func (ws *WebServer) handleAIAnalyzePod(w http.ResponseWriter, r *http.Request) {
	namespace := r.URL.Query().Get("namespace")
	name := r.URL.Query().Get("name")

	if namespace == "" || name == "" {
		http.Error(w, "namespace and name required", http.StatusBadRequest)
		return
	}

	// Fetch pod details
	ctx := r.Context()
	pod, err := ws.app.clientset.CoreV1().Pods(namespace).Get(ctx, name, metav1.GetOptions{})
	if err != nil {
		http.Error(w, err.Error(), http.StatusNotFound)
		return
	}

	// Build analysis input
	input := PodAnalysisInput{
		Name:      name,
		Namespace: namespace,
		Status:    string(pod.Status.Phase),
		Phase:     string(pod.Status.Phase),
	}

	// Add conditions
	for _, cond := range pod.Status.Conditions {
		input.Conditions = append(input.Conditions, string(cond.Type)+": "+string(cond.Status))
	}

	// Add container info
	for _, cs := range pod.Status.ContainerStatuses {
		ci := ContainerAnalysisInfo{
			Name:         cs.Name,
			Ready:        cs.Ready,
			RestartCount: int(cs.RestartCount),
		}
		if cs.State.Waiting != nil {
			ci.State = "Waiting"
			ci.Reason = cs.State.Waiting.Reason
			ci.Message = cs.State.Waiting.Message
		} else if cs.State.Running != nil {
			ci.State = "Running"
		} else if cs.State.Terminated != nil {
			ci.State = "Terminated"
			ci.Reason = cs.State.Terminated.Reason
			ci.Message = cs.State.Terminated.Message
		}
		input.Containers = append(input.Containers, ci)
	}

	// Fetch events
	events, err := ws.app.clientset.CoreV1().Events(namespace).List(ctx, metav1.ListOptions{
		FieldSelector: "involvedObject.name=" + name,
	})
	if err == nil {
		for _, e := range events.Items {
			input.Events = append(input.Events, e.Reason+": "+e.Message)
		}
	}

	assistant := NewAIAssistant(nil)
	if !assistant.IsAvailable() {
		http.Error(w, "No AI provider available", http.StatusServiceUnavailable)
		return
	}

	analysisCtx, cancel := context.WithTimeout(ctx, 60*time.Second)
	defer cancel()

	response, err := assistant.AnalyzePod(analysisCtx, input)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"analysis": response,
	})
}

// handleAIExplainError explains an error using AI
func (ws *WebServer) handleAIExplainError(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var request struct {
		Error        string `json:"error"`
		ResourceType string `json:"resourceType"`
	}
	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	assistant := NewAIAssistant(nil)
	if !assistant.IsAvailable() {
		http.Error(w, "No AI provider available", http.StatusServiceUnavailable)
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 60*time.Second)
	defer cancel()

	response, err := assistant.ExplainError(ctx, request.Error, request.ResourceType)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"explanation": response,
	})
}

// Diagnostics handlers

// handleDiagnosticsRun runs all diagnostics
func (ws *WebServer) handleDiagnosticsRun(w http.ResponseWriter, r *http.Request) {
	namespace := r.URL.Query().Get("namespace")
	category := r.URL.Query().Get("category")

	engine := NewDiagnosticsEngine(ws.app)
	ctx := r.Context()

	var findings []Finding
	var err error

	if category != "" {
		findings, err = engine.RunByCategory(ctx, category)
	} else if namespace != "" && namespace != "All Namespaces" {
		// Run diagnostics for specific namespace
		findings, err = engine.RunAll(ctx)
		// Filter by namespace
		var filtered []Finding
		for _, f := range findings {
			if f.Namespace == namespace || f.Namespace == "" {
				filtered = append(filtered, f)
			}
		}
		findings = filtered
	} else {
		findings, err = engine.RunAll(ctx)
	}

	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"findings": findings,
		"total":    len(findings),
		"summary":  engine.GetSummary(findings),
	})
}

// handleDiagnosticsCategories returns available diagnostic categories
func (ws *WebServer) handleDiagnosticsCategories(w http.ResponseWriter, r *http.Request) {
	categories := []map[string]string{
		{"id": "security", "name": "Security", "description": "Security vulnerabilities and misconfigurations"},
		{"id": "reliability", "name": "Reliability", "description": "Issues affecting service reliability"},
		{"id": "performance", "name": "Performance", "description": "Performance optimization opportunities"},
		{"id": "networking", "name": "Networking", "description": "Network configuration issues"},
		{"id": "storage", "name": "Storage", "description": "Storage and volume issues"},
		{"id": "configuration", "name": "Configuration", "description": "Configuration problems"},
		{"id": "workload", "name": "Workload Health", "description": "Workload status issues"},
		{"id": "node", "name": "Node Health", "description": "Node-level issues"},
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(categories)
}

// Cost estimation handlers

// handleCostNamespace returns cost estimate for a namespace
func (ws *WebServer) handleCostNamespace(w http.ResponseWriter, r *http.Request) {
	namespace := r.URL.Query().Get("namespace")
	if namespace == "" {
		http.Error(w, "namespace required", http.StatusBadRequest)
		return
	}

	estimator := NewCostEstimator(ws.app)
	ctx := r.Context()

	cost, err := estimator.EstimateNamespaceCost(ctx, namespace)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(cost)
}

// handleCloudDetection returns the detected cloud provider (fast - single API call)
func (ws *WebServer) handleCloudDetection(w http.ResponseWriter, r *http.Request) {
	estimator := NewCostEstimator(ws.app)
	ctx := r.Context()

	cloudInfo, err := estimator.DetectCloudProvider(ctx)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(cloudInfo)
}

// handleCostCluster returns cost estimate for the entire cluster
// Results are cached for 5 minutes to avoid slow API calls
func (ws *WebServer) handleCostCluster(w http.ResponseWriter, r *http.Request) {
	// Check cache first (5 minute TTL)
	ws.costCacheMu.RLock()
	if ws.costCache != nil && time.Since(ws.costCacheTime) < 5*time.Minute {
		cache := ws.costCache
		ws.costCacheMu.RUnlock()
		w.Header().Set("Content-Type", "application/json")
		w.Header().Set("X-Cache", "HIT")
		json.NewEncoder(w).Encode(cache)
		return
	}
	ws.costCacheMu.RUnlock()

	// Cache miss - calculate cost (this is slow, ~100s)
	estimator := NewCostEstimator(ws.app)
	// Use background context to avoid request timeout
	ctx := context.Background()

	cost, err := estimator.EstimateClusterCost(ctx)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Update cache
	ws.costCacheMu.Lock()
	ws.costCache = cost
	ws.costCacheTime = time.Now()
	ws.costCacheMu.Unlock()

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("X-Cache", "MISS")
	json.NewEncoder(w).Encode(cost)
}

// handleCostPod returns cost estimate for a specific pod
func (ws *WebServer) handleCostPod(w http.ResponseWriter, r *http.Request) {
	namespace := r.URL.Query().Get("namespace")
	name := r.URL.Query().Get("name")

	if namespace == "" || name == "" {
		http.Error(w, "namespace and name required", http.StatusBadRequest)
		return
	}

	estimator := NewCostEstimator(ws.app)
	ctx := r.Context()

	cost, err := estimator.EstimatePodCost(ctx, namespace, name)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(cost)
}

// handleCostDeployment returns cost estimate for a deployment
func (ws *WebServer) handleCostDeployment(w http.ResponseWriter, r *http.Request) {
	namespace := r.URL.Query().Get("namespace")
	name := r.URL.Query().Get("name")

	if namespace == "" || name == "" {
		http.Error(w, "namespace and name required", http.StatusBadRequest)
		return
	}

	estimator := NewCostEstimator(ws.app)
	ctx := r.Context()

	cost, err := estimator.EstimateDeploymentCost(ctx, namespace, name)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(cost)
}

// handleCostIdleResources returns idle resources
func (ws *WebServer) handleCostIdleResources(w http.ResponseWriter, r *http.Request) {
	namespace := r.URL.Query().Get("namespace")
	cpuThresholdStr := r.URL.Query().Get("cpuThreshold")
	memThresholdStr := r.URL.Query().Get("memThreshold")

	cpuThreshold := 10.0 // Default 10%
	memThreshold := 10.0 // Default 10%

	if cpuThresholdStr != "" {
		if val, err := strconv.ParseFloat(cpuThresholdStr, 64); err == nil {
			cpuThreshold = val
		}
	}
	if memThresholdStr != "" {
		if val, err := strconv.ParseFloat(memThresholdStr, 64); err == nil {
			memThreshold = val
		}
	}

	estimator := NewCostEstimator(ws.app)
	ctx := r.Context()

	resources, err := estimator.GetIdleResources(ctx, namespace, cpuThreshold, memThreshold)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"idleResources": resources,
		"total":         len(resources),
	})
}

// Drift detection handlers

// handleDriftCheck checks for drift in a resource
func (ws *WebServer) handleDriftCheck(w http.ResponseWriter, r *http.Request) {
	namespace := r.URL.Query().Get("namespace")
	kind := r.URL.Query().Get("kind")
	name := r.URL.Query().Get("name")

	if kind == "" || name == "" {
		http.Error(w, "kind and name required", http.StatusBadRequest)
		return
	}

	detector, err := NewDriftDetector(ws.app)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	ctx := r.Context()
	result, err := detector.DetectDrift(ctx, namespace, kind, name)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}

// handleDriftNamespace checks drift for all resources in a namespace
func (ws *WebServer) handleDriftNamespace(w http.ResponseWriter, r *http.Request) {
	namespace := r.URL.Query().Get("namespace")
	if namespace == "" {
		http.Error(w, "namespace required", http.StatusBadRequest)
		return
	}

	detector, err := NewDriftDetector(ws.app)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	ctx := r.Context()
	results, err := detector.DetectNamespaceDrift(ctx, namespace)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"results": results,
		"total":   len(results),
	})
}

// handleDriftSummary returns drift summary for a namespace
func (ws *WebServer) handleDriftSummary(w http.ResponseWriter, r *http.Request) {
	namespace := r.URL.Query().Get("namespace")
	if namespace == "" {
		http.Error(w, "namespace required", http.StatusBadRequest)
		return
	}

	detector, err := NewDriftDetector(ws.app)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	ctx := r.Context()
	summary, err := detector.GetDriftSummary(ctx, namespace)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(summary)
}

// handleDriftRevert reverts a resource to its last-applied configuration
func (ws *WebServer) handleDriftRevert(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var request struct {
		Namespace string `json:"namespace"`
		Kind      string `json:"kind"`
		Name      string `json:"name"`
	}
	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	detector, err := NewDriftDetector(ws.app)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	ctx := r.Context()
	if err := detector.RevertToGit(ctx, request.Namespace, request.Kind, request.Name); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"status": "reverted",
	})
}

// Plugin handlers

// handlePluginsList returns list of loaded plugins
func (ws *WebServer) handlePluginsList(w http.ResponseWriter, r *http.Request) {
	// Placeholder - plugin manager would be integrated here
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"plugins": []interface{}{},
		"total":   0,
	})
}

// handlePluginsInstall installs a plugin
func (ws *WebServer) handlePluginsInstall(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var request struct {
		Source string `json:"source"`
	}
	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Placeholder - plugin installation would happen here
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"status": "installed",
	})
}

// handlePluginsUninstall uninstalls a plugin
func (ws *WebServer) handlePluginsUninstall(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var request struct {
		Name string `json:"name"`
	}
	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Placeholder - plugin uninstallation would happen here
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"status": "uninstalled",
	})
}

// Traffic visualization handlers

// handleNetworkTopology returns enhanced network topology with traffic flow
func (ws *WebServer) handleNetworkTopology(w http.ResponseWriter, r *http.Request) {
	topology, err := ws.app.BuildNetworkTopology()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(topology)
}

// handleHeatmapPods returns pod heatmap data
func (ws *WebServer) handleHeatmapPods(w http.ResponseWriter, r *http.Request) {
	heatmap, err := ws.app.GetNamespaceHeatmap()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"heatmap": heatmap,
		"total":   len(heatmap),
	})
}

// handleHeatmapNodes returns node heatmap data
func (ws *WebServer) handleHeatmapNodes(w http.ResponseWriter, r *http.Request) {
	heatmap, err := ws.app.GetNodeHeatmap()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"heatmap": heatmap,
		"total":   len(heatmap),
	})
}

// RegisterAdvancedHandlers registers all advanced feature handlers
func (ws *WebServer) RegisterAdvancedHandlers() {
	// AI Assistant
	http.HandleFunc("/api/ai/status", ws.handleAIStatus)
	http.HandleFunc("/api/ai/query", ws.handleAIQuery)
	http.HandleFunc("/api/ai/analyze/pod", ws.handleAIAnalyzePod)
	http.HandleFunc("/api/ai/explain", ws.handleAIExplainError)

	// Diagnostics
	http.HandleFunc("/api/diagnostics/run", ws.handleDiagnosticsRun)
	http.HandleFunc("/api/diagnostics/categories", ws.handleDiagnosticsCategories)

	// Cloud detection (fast - single API call)
	http.HandleFunc("/api/cloud", ws.handleCloudDetection)

	// Cost estimation
	http.HandleFunc("/api/cost/namespace", ws.handleCostNamespace)
	http.HandleFunc("/api/cost/cluster", ws.handleCostCluster)
	http.HandleFunc("/api/cost/pod", ws.handleCostPod)
	http.HandleFunc("/api/cost/deployment", ws.handleCostDeployment)
	http.HandleFunc("/api/cost/idle", ws.handleCostIdleResources)

	// Drift detection
	http.HandleFunc("/api/drift/check", ws.handleDriftCheck)
	http.HandleFunc("/api/drift/namespace", ws.handleDriftNamespace)
	http.HandleFunc("/api/drift/summary", ws.handleDriftSummary)
	http.HandleFunc("/api/drift/revert", ws.handleDriftRevert)

	// Network topology & heatmap
	http.HandleFunc("/api/network/topology", ws.handleNetworkTopology)
	http.HandleFunc("/api/heatmap/pods", ws.handleHeatmapPods)
	http.HandleFunc("/api/heatmap/nodes", ws.handleHeatmapNodes)

	// Plugin management
	http.HandleFunc("/api/plugins/list", ws.handlePluginsList)
	http.HandleFunc("/api/plugins/install", ws.handlePluginsInstall)
	http.HandleFunc("/api/plugins/uninstall", ws.handlePluginsUninstall)
}
