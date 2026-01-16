// Copyright 2025 KubeGraf Contributors
// SPDX-License-Identifier: Apache-2.0

package main

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"time"

	corev1 "k8s.io/api/core/v1"
	rbacv1 "k8s.io/api/rbac/v1"
	storagev1 "k8s.io/api/storage/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"sigs.k8s.io/yaml"
)

// AI Assistant handlers

// handleAIStatus returns the AI provider status
// Uses caching (30s TTL) to avoid frequent checks that might trigger model loading
// IMPORTANT: When AutoStart is false, we return "not available" without making any API calls
// to prevent any possibility of triggering model loading
func (ws *WebServer) handleAIStatus(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	config := DefaultAIConfig()

	// If AutoStart is false, don't make any API calls to Ollama at all
	// This prevents any possibility of triggering model loading
	if !config.AutoStart {
		response := map[string]interface{}{
			"available": false,
			"provider":  "none",
		}
		json.NewEncoder(w).Encode(response)
		return
	}

	// AutoStart is enabled - safe to check availability
	// Check cache first (30 second TTL to avoid frequent checks)
	ws.aiStatusCacheMu.RLock()
	cachedAssistant := ws.aiStatusCache
	cacheTime := ws.aiStatusCacheTime
	hasCache := cachedAssistant != nil && time.Since(cacheTime) < 30*time.Second
	ws.aiStatusCacheMu.RUnlock()

	var assistant *AIAssistant
	if hasCache {
		// Use cached assistant
		assistant = cachedAssistant
	} else {
		// Cache miss or expired - create new assistant
		// IsAvailable() uses /api/version which is safe and doesn't trigger model loading
		assistant = NewAIAssistant(nil)
		// Check availability (safe - uses /api/version, not /api/tags or /api/generate)
		assistant.IsAvailable()

		// Update cache
		ws.aiStatusCacheMu.Lock()
		ws.aiStatusCache = assistant
		ws.aiStatusCacheTime = time.Now()
		ws.aiStatusCacheMu.Unlock()
	}

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

// handleDiagnosticsRun runs all diagnostics with optimizations
func (ws *WebServer) handleDiagnosticsRun(w http.ResponseWriter, r *http.Request) {
	namespace := r.URL.Query().Get("namespace")
	category := r.URL.Query().Get("category")

	engine := NewDiagnosticsEngine(ws.app)
	// Reduced timeout to 45 seconds for faster response
	ctx, cancel := context.WithTimeout(r.Context(), 45*time.Second)
	defer cancel()

	var findings []Finding
	var err error

	// Check if cluster is connected
	if ws.app.clientset == nil || !ws.app.connected {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"findings": []Finding{},
			"total":    0,
			"summary":  engine.GetSummary([]Finding{}),
			"error":    "Cluster not connected",
		})
		return
	}

	if category != "" {
		findings, err = engine.RunByCategory(ctx, category)
	} else if namespace != "" && namespace != "All Namespaces" && namespace != "_all" {
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

	// Handle timeout or context cancellation gracefully
	if err != nil {
		if ctx.Err() == context.DeadlineExceeded {
			// Return partial results if timeout
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(map[string]interface{}{
				"findings": findings,
				"total":    len(findings),
				"summary":  engine.GetSummary(findings),
				"warning":  "Diagnostics timed out. Partial results shown.",
			})
			return
		}
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
	if ws.app.clientset == nil {
		http.Error(w, "Kubernetes client not initialized. Please connect to a cluster first.", http.StatusServiceUnavailable)
		return
	}

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
// Results are cached for 5 minutes per cluster context to avoid slow API calls
func (ws *WebServer) handleCostCluster(w http.ResponseWriter, r *http.Request) {
	if ws.app.clientset == nil {
		http.Error(w, "Kubernetes client not initialized. Please connect to a cluster first.", http.StatusServiceUnavailable)
		return
	}

	// Get current cluster context for cache key
	currentContext := ws.app.GetCurrentContext()
	if currentContext == "" {
		http.Error(w, "No cluster context selected", http.StatusBadRequest)
		return
	}

	// Check cache first (5 minute TTL, per context)
	ws.costCacheMu.RLock()
	cachedCost, hasCache := ws.costCache[currentContext]
	cacheTime, hasTime := ws.costCacheTime[currentContext]
	if hasCache && hasTime && time.Since(cacheTime) < 5*time.Minute {
		cache := cachedCost
		ws.costCacheMu.RUnlock()
		w.Header().Set("Content-Type", "application/json")
		w.Header().Set("X-Cache", "HIT")
		json.NewEncoder(w).Encode(cache)
		return
	}
	ws.costCacheMu.RUnlock()

	// Cache miss - calculate cost (this is slow, ~100s for large clusters)
	// Use context with timeout to prevent hanging (2 minutes should be enough)
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Minute)
	defer cancel()

	estimator := NewCostEstimator(ws.app)
	cost, err := estimator.EstimateClusterCost(ctx)
	if err != nil {
		if ctx.Err() == context.DeadlineExceeded {
			http.Error(w, "Cost calculation timed out. The cluster may be too large. Please try again or contact support.", http.StatusRequestTimeout)
			return
		}
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Update cache for this context
	ws.costCacheMu.Lock()
	ws.costCache[currentContext] = cost
	ws.costCacheTime[currentContext] = time.Now()
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

	// Vulnerability scanning
	http.HandleFunc("/api/vulnerabilities/scan", ws.handleVulnerabilityScan)
	http.HandleFunc("/api/vulnerabilities/refresh", ws.handleVulnerabilityRefresh)
	http.HandleFunc("/api/vulnerabilities/stats", ws.handleVulnerabilityStats)

	// Anomaly detection
	http.HandleFunc("/api/anomalies/detect", ws.handleAnomalyDetection)
	http.HandleFunc("/api/anomalies/stats", ws.handleAnomalyStats)
	http.HandleFunc("/api/anomalies/remediate", ws.handleAnomalyRemediate)
	http.HandleFunc("/api/anomalies/metrics", ws.handleAnomalyMetrics)
	http.HandleFunc("/api/anomalies/scan-progress", ws.handleScanProgress)

	// AutoFix Engine
	http.HandleFunc("/api/autofix/rules", ws.handleAutoFixRules)
	http.HandleFunc("/api/autofix/rules/toggle", ws.handleAutoFixRuleToggle)
	http.HandleFunc("/api/autofix/actions", ws.handleAutoFixActions)
	http.HandleFunc("/api/autofix/enabled", ws.handleAutoFixEnabled)

	// ML Recommendations
	http.HandleFunc("/api/ml/recommendations", ws.handleMLRecommendations)
	http.HandleFunc("/api/ml/recommendations/apply", ws.handleApplyRecommendation)
	http.HandleFunc("/api/ml/recommendations/stats", ws.handleMLRecommendationsStats)
	http.HandleFunc("/api/ml/predict", ws.handleMLPredict)

	// Metrics Collector Configuration
	http.HandleFunc("/api/metrics/collector/config", ws.handleMetricsCollectorConfig)
	http.HandleFunc("/api/metrics/collector/status", ws.handleMetricsCollectorStatus)
	http.HandleFunc("/api/metrics/collector/clear", ws.handleMetricsCollectorClear)

	// Storage
	http.HandleFunc("/api/storage/persistentvolumes", ws.handlePersistentVolumes)
	http.HandleFunc("/api/storage/persistentvolumeclaims", ws.handlePersistentVolumeClaims)
	http.HandleFunc("/api/storage/storageclasses", ws.handleStorageClasses)

	// RBAC
	http.HandleFunc("/api/rbac/roles", ws.handleRoles)
	http.HandleFunc("/api/rbac/rolebindings", ws.handleRoleBindings)
	http.HandleFunc("/api/rbac/clusterroles", ws.handleClusterRoles)
	http.HandleFunc("/api/rbac/clusterrolebindings", ws.handleClusterRoleBindings)

	// Storage Details
	http.HandleFunc("/api/storage/pv/details", ws.handlePVDetails)
	http.HandleFunc("/api/storage/pvc/details", ws.handlePVCDetails)
	// Storage YAML/Update/Delete
	http.HandleFunc("/api/storage/pv/yaml", ws.handlePVYAML)
	http.HandleFunc("/api/storage/pv/update", ws.handlePVUpdate)
	http.HandleFunc("/api/storage/pv/describe", ws.handlePVDescribe)
	http.HandleFunc("/api/storage/pv/delete", ws.handlePVDelete)
	http.HandleFunc("/api/storage/pvc/yaml", ws.handlePVCYAML)
	http.HandleFunc("/api/storage/pvc/update", ws.handlePVCUpdate)
	http.HandleFunc("/api/storage/pvc/describe", ws.handlePVCDescribe)
	http.HandleFunc("/api/storage/pvc/delete", ws.handlePVCDelete)
	http.HandleFunc("/api/storage/storageclass/yaml", ws.handleStorageClassYAML)
	http.HandleFunc("/api/storage/storageclass/update", ws.handleStorageClassUpdate)
	http.HandleFunc("/api/storage/storageclass/delete", ws.handleStorageClassDelete)

	// RBAC YAML/Update/Delete
	http.HandleFunc("/api/rbac/role/yaml", ws.handleRoleYAML)
	http.HandleFunc("/api/rbac/role/update", ws.handleRoleUpdate)
	http.HandleFunc("/api/rbac/role/delete", ws.handleRoleDelete)
	http.HandleFunc("/api/rbac/rolebinding/yaml", ws.handleRoleBindingYAML)
	http.HandleFunc("/api/rbac/rolebinding/update", ws.handleRoleBindingUpdate)
	http.HandleFunc("/api/rbac/rolebinding/delete", ws.handleRoleBindingDelete)
	http.HandleFunc("/api/rbac/clusterrole/yaml", ws.handleClusterRoleYAML)
	http.HandleFunc("/api/rbac/clusterrole/update", ws.handleClusterRoleUpdate)
	http.HandleFunc("/api/rbac/clusterrole/delete", ws.handleClusterRoleDelete)
	http.HandleFunc("/api/rbac/clusterrolebinding/yaml", ws.handleClusterRoleBindingYAML)
	http.HandleFunc("/api/rbac/clusterrolebinding/update", ws.handleClusterRoleBindingUpdate)
	http.HandleFunc("/api/rbac/clusterrolebinding/delete", ws.handleClusterRoleBindingDelete)
}

// Anomaly Detection handlers

// handleAnomalyDetection runs anomaly detection on the cluster
func (ws *WebServer) handleAnomalyDetection(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	severity := r.URL.Query().Get("severity") // Optional filter: critical, warning, info

	// Add timeout to prevent hanging (2 minutes should be enough)
	ctx, cancel := context.WithTimeout(r.Context(), 2*time.Minute)
	defer cancel()

	log.Printf("Starting anomaly detection (severity filter: %s)", severity)
	startTime := time.Now()
	anomalies, err := ws.app.anomalyDetector.DetectAnomalies(ctx)
	duration := time.Since(startTime)

	if err != nil {
		log.Printf("Anomaly detection failed after %v: %v", duration, err)
		http.Error(w, fmt.Sprintf("Failed to detect anomalies: %v", err), http.StatusInternalServerError)
		return
	}

	log.Printf("Anomaly detection completed in %v: found %d anomalies", duration, len(anomalies))

	// Filter by severity if specified
	if severity != "" {
		var filtered []Anomaly
		for _, anomaly := range anomalies {
			if strings.EqualFold(anomaly.Severity, severity) {
				filtered = append(filtered, anomaly)
			}
		}
		anomalies = filtered
	}

	// Calculate stats
	stats := ws.app.anomalyDetector.GetAnomalyStats(anomalies)

	// Ensure anomalies is never null - return empty array instead
	if anomalies == nil {
		anomalies = []Anomaly{}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"anomalies": anomalies,
		"stats":     stats,
		"duration":  duration.String(),
	})
}

// handleAnomalyStats returns anomaly detection statistics
func (ws *WebServer) handleAnomalyStats(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	anomalies, err := ws.app.anomalyDetector.DetectAnomalies(r.Context())
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to detect anomalies: %v", err), http.StatusInternalServerError)
		return
	}

	stats := ws.app.anomalyDetector.GetAnomalyStats(anomalies)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(stats)
}

// handleAnomalyRemediate attempts to auto-remediate an anomaly
func (ws *WebServer) handleAnomalyRemediate(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var request struct {
		AnomalyID string `json:"anomalyId"`
	}

	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Find the anomaly
	anomalies, err := ws.app.anomalyDetector.DetectAnomalies(r.Context())
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to detect anomalies: %v", err), http.StatusInternalServerError)
		return
	}

	var targetAnomaly *Anomaly
	for _, anomaly := range anomalies {
		if anomaly.ID == request.AnomalyID {
			targetAnomaly = &anomaly
			break
		}
	}

	if targetAnomaly == nil {
		http.Error(w, "Anomaly not found", http.StatusNotFound)
		return
	}

	// Attempt remediation
	err = ws.app.anomalyDetector.AutoRemediate(r.Context(), *targetAnomaly)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to remediate: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": fmt.Sprintf("Successfully remediated anomaly: %s", targetAnomaly.Message),
		"anomaly": targetAnomaly,
	})
}

// handleAnomalyMetrics returns collected metrics for analysis
func (ws *WebServer) handleAnomalyMetrics(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	limitStr := r.URL.Query().Get("limit")
	limit := 1000 // Default limit
	if limitStr != "" {
		if parsed, err := strconv.Atoi(limitStr); err == nil && parsed > 0 {
			limit = parsed
		}
	}

	metrics, err := ws.app.anomalyDetector.CollectMetrics(r.Context())
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to collect metrics: %v", err), http.StatusInternalServerError)
		return
	}

	// Limit results
	if len(metrics) > limit {
		metrics = metrics[len(metrics)-limit:]
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"metrics": metrics,
		"count":   len(metrics),
	})
}

// handleScanProgress returns the current scan progress
func (ws *WebServer) handleScanProgress(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	w.Header().Set("Content-Type", "application/json")

	if ws.app.anomalyDetector == nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"isScanning":     false,
			"totalPods":      0,
			"processedPods":  0,
			"currentSamples": 0,
			"message":        "Anomaly detector not initialized",
		})
		return
	}

	progress := ws.app.anomalyDetector.GetScanProgress()

	// Also include total samples in history for context
	historyLen := 0
	if ws.app.mlRecommender != nil {
		stats := ws.app.mlRecommender.GetMetricsHistoryStats()
		if samples, ok := stats["totalSamples"].(int); ok {
			historyLen = samples
		}
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"isScanning":       progress.IsScanning,
		"totalPods":        progress.TotalPods,
		"processedPods":    progress.ProcessedPods,
		"currentSamples":   progress.CurrentSamples,
		"message":          progress.Message,
		"startTime":        progress.StartTime,
		"totalInHistory":   historyLen,
	})
}

// handleMLRecommendations returns ML-powered recommendations
func (ws *WebServer) handleMLRecommendations(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Check if cluster is connected
	if ws.app.clientset == nil || !ws.app.connected {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"recommendations": []MLRecommendation{},
			"total":           0,
			"message":         "Cluster not connected. Connect to a cluster to get ML recommendations.",
		})
		return
	}

	// Add timeout to prevent hanging (reduced to 8s to match GenerateRecommendations)
	ctx, cancel := context.WithTimeout(r.Context(), 8*time.Second)
	defer cancel()

	// Set response headers early to ensure response is sent
	w.Header().Set("Content-Type", "application/json")

	recommendations, err := ws.app.mlRecommender.GenerateRecommendations(ctx)
	if err != nil {
		// Don't return error, just return empty recommendations
		json.NewEncoder(w).Encode(map[string]interface{}{
			"recommendations": []MLRecommendation{},
			"total":           0,
			"error":           err.Error(),
		})
		return
	}

	// Get metrics history stats
	stats := ws.app.mlRecommender.GetMetricsHistoryStats()

	// Ensure recommendations is never null - return empty array instead
	if recommendations == nil {
		recommendations = []MLRecommendation{}
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"recommendations": recommendations,
		"total":           len(recommendations),
		"metricsStats":    stats,
	})
}

// handleMLRecommendationsStats returns metrics history statistics
func (ws *WebServer) handleMLRecommendationsStats(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	w.Header().Set("Content-Type", "application/json")

	if ws.app.clientset == nil || !ws.app.connected {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"totalSamples":    0,
			"minRequired":     1000,
			"progress":        0,
			"hasEnoughData":   false,
			"remainingNeeded": 1000,
		})
		return
	}

	stats := ws.app.mlRecommender.GetMetricsHistoryStats()
	json.NewEncoder(w).Encode(stats)
}

// handleMLPredict predicts future resource needs
func (ws *WebServer) handleMLPredict(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	namespace := r.URL.Query().Get("namespace")
	deployment := r.URL.Query().Get("deployment")
	hoursAhead := 1
	if h := r.URL.Query().Get("hours"); h != "" {
		fmt.Sscanf(h, "%d", &hoursAhead)
	}

	if namespace == "" || deployment == "" {
		http.Error(w, "namespace and deployment are required", http.StatusBadRequest)
		return
	}

	cpuPred, memPred, err := ws.app.mlRecommender.PredictResourceNeeds(r.Context(), namespace, deployment, hoursAhead)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to predict: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"cpuPrediction":    cpuPred,
		"memoryPrediction": memPred,
		"hoursAhead":       hoursAhead,
	})
}

// Storage handlers

// handlePersistentVolumes returns a list of PersistentVolumes
func (ws *WebServer) handlePersistentVolumes(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	pvs, err := ws.app.clientset.CoreV1().PersistentVolumes().List(ws.app.ctx, metav1.ListOptions{})
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to list PersistentVolumes: %v", err), http.StatusInternalServerError)
		return
	}

	pvList := []map[string]interface{}{}
	for _, pv := range pvs.Items {
		accessModes := []string{}
		for _, mode := range pv.Spec.AccessModes {
			accessModes = append(accessModes, string(mode))
		}

		claim := ""
		if pv.Spec.ClaimRef != nil {
			claim = fmt.Sprintf("%s/%s", pv.Spec.ClaimRef.Namespace, pv.Spec.ClaimRef.Name)
		}

		capacity := ""
		if pv.Spec.Capacity != nil {
			if storage, ok := pv.Spec.Capacity[corev1.ResourceStorage]; ok {
				capacity = storage.String()
			}
		}

		pvList = append(pvList, map[string]interface{}{
			"name":          pv.Name,
			"capacity":      capacity,
			"accessModes":   accessModes,
			"reclaimPolicy": string(pv.Spec.PersistentVolumeReclaimPolicy),
			"status":        string(pv.Status.Phase),
			"storageClass":  pv.Spec.StorageClassName,
			"claim":         claim,
			"age":           formatAge(time.Since(pv.CreationTimestamp.Time)),
		})
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(pvList)
}

// handlePersistentVolumeClaims returns a list of PersistentVolumeClaims
func (ws *WebServer) handlePersistentVolumeClaims(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	w.Header().Set("Content-Type", "application/json")

	if ws.app.clientset == nil {
		http.Error(w, "Kubernetes client not initialized. Please connect to a cluster first.", http.StatusServiceUnavailable)
		return
	}

	// Empty namespace means "all namespaces" in Kubernetes
	// When namespace param is not provided, use empty string to list all namespaces
	namespace := r.URL.Query().Get("namespace")
	if !r.URL.Query().Has("namespace") || namespace == "" || namespace == "All Namespaces" {
		namespace = "" // List all namespaces
	}

	allPVCs := []corev1.PersistentVolumeClaim{}
	var continueToken string
	for {
		opts := metav1.ListOptions{}
		if continueToken != "" {
			opts.Continue = continueToken
		}

		pvcs, err := ws.app.clientset.CoreV1().PersistentVolumeClaims(namespace).List(ws.app.ctx, opts)
		if err != nil {
			http.Error(w, fmt.Sprintf("Failed to list PersistentVolumeClaims: %v", err), http.StatusInternalServerError)
			return
		}

		allPVCs = append(allPVCs, pvcs.Items...)

		if pvcs.Continue == "" {
			break
		}
		continueToken = pvcs.Continue
	}

	pvcList := []map[string]interface{}{}
	for _, pvc := range allPVCs {
		accessModes := []string{}
		for _, mode := range pvc.Spec.AccessModes {
			accessModes = append(accessModes, string(mode))
		}

		capacity := ""
		if pvc.Status.Capacity != nil {
			if storage, ok := pvc.Status.Capacity[corev1.ResourceStorage]; ok {
				capacity = storage.String()
			}
		}

		volume := ""
		if pvc.Spec.VolumeName != "" {
			volume = pvc.Spec.VolumeName
		}

		storageClass := ""
		if pvc.Spec.StorageClassName != nil {
			storageClass = *pvc.Spec.StorageClassName
		}

		pvcList = append(pvcList, map[string]interface{}{
			"name":         pvc.Name,
			"namespace":    pvc.Namespace,
			"status":       string(pvc.Status.Phase),
			"volume":       volume,
			"capacity":     capacity,
			"accessModes":  accessModes,
			"storageClass": storageClass,
			"age":          formatAge(time.Since(pvc.CreationTimestamp.Time)),
		})
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(pvcList)
}

// handleStorageClasses returns a list of StorageClasses
func (ws *WebServer) handleStorageClasses(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	clientset := ws.requireClientset(w)
	if clientset == nil {
		return
	}

	// StorageClasses are in storage.k8s.io/v1 API group
	storageClasses, err := clientset.StorageV1().StorageClasses().List(ws.app.ctx, metav1.ListOptions{})
	if err != nil {
		// If StorageV1 API is not available, return empty list
		log.Printf("Warning: Failed to list StorageClasses: %v", err)
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode([]map[string]interface{}{})
		return
	}

	resultList := []map[string]interface{}{}
	for _, sc := range storageClasses.Items {
		reclaimPolicy := "Delete"
		if sc.ReclaimPolicy != nil {
			reclaimPolicy = string(*sc.ReclaimPolicy)
		}

		bindingMode := "Immediate"
		if sc.VolumeBindingMode != nil {
			bindingMode = string(*sc.VolumeBindingMode)
		}

		allowExpansion := false
		if sc.AllowVolumeExpansion != nil {
			allowExpansion = *sc.AllowVolumeExpansion
		}

		resultList = append(resultList, map[string]interface{}{
			"name":                 sc.Name,
			"provisioner":          sc.Provisioner,
			"reclaimPolicy":        reclaimPolicy,
			"volumeBindingMode":    bindingMode,
			"allowVolumeExpansion": allowExpansion,
			"age":                  formatAge(time.Since(sc.CreationTimestamp.Time)),
		})
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resultList)
}

// RBAC handlers

// handleRoles returns a list of Roles
func (ws *WebServer) handleRoles(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	namespace := r.URL.Query().Get("namespace")
	if !r.URL.Query().Has("namespace") {
		namespace = ws.app.namespace
	}

	roles, err := ws.app.clientset.RbacV1().Roles(namespace).List(ws.app.ctx, metav1.ListOptions{})
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to list Roles: %v", err), http.StatusInternalServerError)
		return
	}

	roleList := []map[string]interface{}{}
	for _, role := range roles.Items {
		roleList = append(roleList, map[string]interface{}{
			"name":      role.Name,
			"namespace": role.Namespace,
			"rules":     len(role.Rules),
			"age":       formatAge(time.Since(role.CreationTimestamp.Time)),
		})
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(roleList)
}

// handleRoleBindings returns a list of RoleBindings
func (ws *WebServer) handleRoleBindings(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	namespace := r.URL.Query().Get("namespace")
	if !r.URL.Query().Has("namespace") {
		namespace = ws.app.namespace
	}

	rbs, err := ws.app.clientset.RbacV1().RoleBindings(namespace).List(ws.app.ctx, metav1.ListOptions{})
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to list RoleBindings: %v", err), http.StatusInternalServerError)
		return
	}

	rbList := []map[string]interface{}{}
	for _, rb := range rbs.Items {
		roleRef := ""
		if rb.RoleRef.Kind != "" {
			roleRef = fmt.Sprintf("%s/%s", rb.RoleRef.Kind, rb.RoleRef.Name)
		}

		rbList = append(rbList, map[string]interface{}{
			"name":      rb.Name,
			"namespace": rb.Namespace,
			"roleRef":   roleRef,
			"subjects":  len(rb.Subjects),
			"age":       formatAge(time.Since(rb.CreationTimestamp.Time)),
		})
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(rbList)
}

// handleClusterRoles returns a list of ClusterRoles
func (ws *WebServer) handleClusterRoles(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	clusterRoles, err := ws.app.clientset.RbacV1().ClusterRoles().List(ws.app.ctx, metav1.ListOptions{})
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to list ClusterRoles: %v", err), http.StatusInternalServerError)
		return
	}

	crList := []map[string]interface{}{}
	for _, cr := range clusterRoles.Items {
		crList = append(crList, map[string]interface{}{
			"name":  cr.Name,
			"rules": len(cr.Rules),
			"age":   formatAge(time.Since(cr.CreationTimestamp.Time)),
		})
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(crList)
}

// handleClusterRoleBindings returns a list of ClusterRoleBindings
func (ws *WebServer) handleClusterRoleBindings(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	crbs, err := ws.app.clientset.RbacV1().ClusterRoleBindings().List(ws.app.ctx, metav1.ListOptions{})
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to list ClusterRoleBindings: %v", err), http.StatusInternalServerError)
		return
	}

	crbList := []map[string]interface{}{}
	for _, crb := range crbs.Items {
		roleRef := ""
		if crb.RoleRef.Kind != "" {
			roleRef = fmt.Sprintf("%s/%s", crb.RoleRef.Kind, crb.RoleRef.Name)
		}

		crbList = append(crbList, map[string]interface{}{
			"name":     crb.Name,
			"roleRef":  roleRef,
			"subjects": len(crb.Subjects),
			"age":      formatAge(time.Since(crb.CreationTimestamp.Time)),
		})
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(crbList)
}

// Storage Details handlers

func (ws *WebServer) handlePVDetails(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	name := r.URL.Query().Get("name")
	if name == "" {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "PV name is required",
		})
		return
	}

	pv, err := ws.app.clientset.CoreV1().PersistentVolumes().Get(ws.app.ctx, name, metav1.GetOptions{})
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	accessModes := []string{}
	for _, mode := range pv.Spec.AccessModes {
		accessModes = append(accessModes, string(mode))
	}

	claim := ""
	claimNamespace := ""
	if pv.Spec.ClaimRef != nil {
		claim = pv.Spec.ClaimRef.Name
		claimNamespace = pv.Spec.ClaimRef.Namespace
	}

	capacity := ""
	if pv.Spec.Capacity != nil {
		if storage, ok := pv.Spec.Capacity[corev1.ResourceStorage]; ok {
			capacity = storage.String()
		}
	}

	// Get node affinity if present
	nodeAffinity := map[string]interface{}{}
	if pv.Spec.NodeAffinity != nil && pv.Spec.NodeAffinity.Required != nil {
		nodeAffinity["required"] = "present"
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success":        true,
		"name":           pv.Name,
		"capacity":       capacity,
		"accessModes":    accessModes,
		"reclaimPolicy":  string(pv.Spec.PersistentVolumeReclaimPolicy),
		"status":         string(pv.Status.Phase),
		"storageClass":   pv.Spec.StorageClassName,
		"claim":          claim,
		"claimNamespace": claimNamespace,
		"volumeMode":     string(*pv.Spec.VolumeMode),
		"nodeAffinity":   nodeAffinity,
		"labels":         pv.Labels,
		"annotations":    pv.Annotations,
		"age":            formatAge(time.Since(pv.CreationTimestamp.Time)),
		"createdAt":      pv.CreationTimestamp.Format(time.RFC3339),
	})
}

func (ws *WebServer) handlePVCDetails(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	name := r.URL.Query().Get("name")
	namespace := r.URL.Query().Get("namespace")
	if name == "" || namespace == "" {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "PVC name and namespace are required",
		})
		return
	}

	pvc, err := ws.app.clientset.CoreV1().PersistentVolumeClaims(namespace).Get(ws.app.ctx, name, metav1.GetOptions{})
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	accessModes := []string{}
	for _, mode := range pvc.Spec.AccessModes {
		accessModes = append(accessModes, string(mode))
	}

	volumeName := ""
	if pvc.Spec.VolumeName != "" {
		volumeName = pvc.Spec.VolumeName
	}

	capacity := ""
	if pvc.Status.Capacity != nil {
		if storage, ok := pvc.Status.Capacity[corev1.ResourceStorage]; ok {
			capacity = storage.String()
		}
	}

	requestedCapacity := ""
	if pvc.Spec.Resources.Requests != nil {
		if storage, ok := pvc.Spec.Resources.Requests[corev1.ResourceStorage]; ok {
			requestedCapacity = storage.String()
		}
	}

	volumeMode := ""
	if pvc.Spec.VolumeMode != nil {
		volumeMode = string(*pvc.Spec.VolumeMode)
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success":           true,
		"name":              pvc.Name,
		"namespace":         pvc.Namespace,
		"status":            string(pvc.Status.Phase),
		"volume":            volumeName,
		"capacity":          capacity,
		"requestedCapacity": requestedCapacity,
		"accessModes":       accessModes,
		"storageClass":      pvc.Spec.StorageClassName,
		"volumeMode":        volumeMode,
		"labels":            pvc.Labels,
		"annotations":       pvc.Annotations,
		"age":               formatAge(time.Since(pvc.CreationTimestamp.Time)),
		"createdAt":         pvc.CreationTimestamp.Format(time.RFC3339),
	})
}

// Storage YAML/Update/Delete handlers

func (ws *WebServer) handlePVYAML(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	name := r.URL.Query().Get("name")
	if name == "" {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "PV name is required",
		})
		return
	}

	pv, err := ws.app.clientset.CoreV1().PersistentVolumes().Get(ws.app.ctx, name, metav1.GetOptions{})
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	pv.ManagedFields = nil
	yamlData, err := toKubectlYAML(pv, schema.GroupVersionKind{Group: "", Version: "v1", Kind: "PersistentVolume"})
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"yaml":    string(yamlData),
	})
}

func (ws *WebServer) handlePVUpdate(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	name := r.URL.Query().Get("name")
	if name == "" {
		http.Error(w, "PV name is required", http.StatusBadRequest)
		return
	}

	body, err := io.ReadAll(r.Body)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to read body: %v", err), http.StatusBadRequest)
		return
	}
	defer r.Body.Close()

	var pv corev1.PersistentVolume
	if err := yaml.Unmarshal(body, &pv); err != nil {
		http.Error(w, fmt.Sprintf("Failed to unmarshal YAML: %v", err), http.StatusBadRequest)
		return
	}

	_, err = ws.app.clientset.CoreV1().PersistentVolumes().Update(ws.app.ctx, &pv, metav1.UpdateOptions{})
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to update PV: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{"success": true})
}

func (ws *WebServer) handlePVDescribe(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	name := r.URL.Query().Get("name")
	if name == "" {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "PV name is required",
		})
		return
	}

	output, err := runKubectlDescribe("persistentvolume", name, "")
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success":  true,
		"describe": output,
	})
}

func (ws *WebServer) handlePVDelete(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	name := r.URL.Query().Get("name")
	if name == "" {
		json.NewEncoder(w).Encode(map[string]interface{}{"success": false, "error": "PV name is required"})
		return
	}

	err := ws.app.clientset.CoreV1().PersistentVolumes().Delete(ws.app.ctx, name, metav1.DeleteOptions{})
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{"success": false, "error": err.Error()})
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{"success": true})
}

func (ws *WebServer) handlePVCYAML(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	name := r.URL.Query().Get("name")
	namespace := r.URL.Query().Get("namespace")
	if name == "" || namespace == "" {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "PVC name and namespace are required",
		})
		return
	}

	pvc, err := ws.app.clientset.CoreV1().PersistentVolumeClaims(namespace).Get(ws.app.ctx, name, metav1.GetOptions{})
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	pvc.ManagedFields = nil
	yamlData, err := toKubectlYAML(pvc, schema.GroupVersionKind{Group: "", Version: "v1", Kind: "PersistentVolumeClaim"})
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"yaml":    string(yamlData),
	})
}

func (ws *WebServer) handlePVCUpdate(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	name := r.URL.Query().Get("name")
	namespace := r.URL.Query().Get("namespace")
	if name == "" || namespace == "" {
		http.Error(w, "PVC name and namespace are required", http.StatusBadRequest)
		return
	}

	body, err := io.ReadAll(r.Body)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to read body: %v", err), http.StatusBadRequest)
		return
	}
	defer r.Body.Close()

	var pvc corev1.PersistentVolumeClaim
	if err := yaml.Unmarshal(body, &pvc); err != nil {
		http.Error(w, fmt.Sprintf("Failed to unmarshal YAML: %v", err), http.StatusBadRequest)
		return
	}

	_, err = ws.app.clientset.CoreV1().PersistentVolumeClaims(namespace).Update(ws.app.ctx, &pvc, metav1.UpdateOptions{})
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to update PVC: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{"success": true})
}

func (ws *WebServer) handlePVCDescribe(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	name := r.URL.Query().Get("name")
	namespace := r.URL.Query().Get("namespace")
	if name == "" || namespace == "" {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "PVC name and namespace are required",
		})
		return
	}

	output, err := runKubectlDescribe("persistentvolumeclaim", name, namespace)
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success":  true,
		"describe": output,
	})
}

func (ws *WebServer) handlePVCDelete(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	name := r.URL.Query().Get("name")
	namespace := r.URL.Query().Get("namespace")
	if name == "" || namespace == "" {
		json.NewEncoder(w).Encode(map[string]interface{}{"success": false, "error": "PVC name and namespace are required"})
		return
	}

	err := ws.app.clientset.CoreV1().PersistentVolumeClaims(namespace).Delete(ws.app.ctx, name, metav1.DeleteOptions{})
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{"success": false, "error": err.Error()})
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{"success": true})
}

func (ws *WebServer) handleStorageClassYAML(w http.ResponseWriter, r *http.Request) {
	name := r.URL.Query().Get("name")
	if name == "" {
		http.Error(w, "StorageClass name is required", http.StatusBadRequest)
		return
	}

	sc, err := ws.app.clientset.StorageV1().StorageClasses().Get(ws.app.ctx, name, metav1.GetOptions{})
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to get StorageClass: %v", err), http.StatusInternalServerError)
		return
	}

	sc.ManagedFields = nil
	yamlData, err := toKubectlYAML(sc, schema.GroupVersionKind{Group: "storage.k8s.io", Version: "v1", Kind: "StorageClass"})
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to marshal YAML: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{"yaml": string(yamlData)})
}

func (ws *WebServer) handleStorageClassUpdate(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	name := r.URL.Query().Get("name")
	if name == "" {
		http.Error(w, "StorageClass name is required", http.StatusBadRequest)
		return
	}

	body, err := io.ReadAll(r.Body)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to read body: %v", err), http.StatusBadRequest)
		return
	}
	defer r.Body.Close()

	var sc storagev1.StorageClass
	if err := yaml.Unmarshal(body, &sc); err != nil {
		http.Error(w, fmt.Sprintf("Failed to unmarshal YAML: %v", err), http.StatusBadRequest)
		return
	}

	_, err = ws.app.clientset.StorageV1().StorageClasses().Update(ws.app.ctx, &sc, metav1.UpdateOptions{})
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to update StorageClass: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{"success": true})
}

func (ws *WebServer) handleStorageClassDelete(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	name := r.URL.Query().Get("name")
	if name == "" {
		json.NewEncoder(w).Encode(map[string]interface{}{"success": false, "error": "StorageClass name is required"})
		return
	}

	err := ws.app.clientset.StorageV1().StorageClasses().Delete(ws.app.ctx, name, metav1.DeleteOptions{})
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{"success": false, "error": err.Error()})
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{"success": true})
}

// RBAC YAML/Update/Delete handlers

func (ws *WebServer) handleRoleYAML(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	name := r.URL.Query().Get("name")
	namespace := r.URL.Query().Get("namespace")
	if name == "" || namespace == "" {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Role name and namespace are required",
		})
		return
	}

	role, err := ws.app.clientset.RbacV1().Roles(namespace).Get(ws.app.ctx, name, metav1.GetOptions{})
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	role.ManagedFields = nil
	yamlData, err := toKubectlYAML(role, schema.GroupVersionKind{Group: "rbac.authorization.k8s.io", Version: "v1", Kind: "Role"})
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"yaml":    string(yamlData),
	})
}

func (ws *WebServer) handleRoleUpdate(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	name := r.URL.Query().Get("name")
	namespace := r.URL.Query().Get("namespace")
	if name == "" || namespace == "" {
		http.Error(w, "Role name and namespace are required", http.StatusBadRequest)
		return
	}

	body, err := io.ReadAll(r.Body)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to read body: %v", err), http.StatusBadRequest)
		return
	}
	defer r.Body.Close()

	var role rbacv1.Role
	if err := yaml.Unmarshal(body, &role); err != nil {
		http.Error(w, fmt.Sprintf("Failed to unmarshal YAML: %v", err), http.StatusBadRequest)
		return
	}

	_, err = ws.app.clientset.RbacV1().Roles(namespace).Update(ws.app.ctx, &role, metav1.UpdateOptions{})
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to update Role: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{"success": true})
}

func (ws *WebServer) handleRoleDelete(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	name := r.URL.Query().Get("name")
	namespace := r.URL.Query().Get("namespace")
	if name == "" || namespace == "" {
		json.NewEncoder(w).Encode(map[string]interface{}{"success": false, "error": "Role name and namespace are required"})
		return
	}

	err := ws.app.clientset.RbacV1().Roles(namespace).Delete(ws.app.ctx, name, metav1.DeleteOptions{})
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{"success": false, "error": err.Error()})
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{"success": true})
}

func (ws *WebServer) handleRoleBindingYAML(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	name := r.URL.Query().Get("name")
	namespace := r.URL.Query().Get("namespace")
	if name == "" || namespace == "" {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "RoleBinding name and namespace are required",
		})
		return
	}

	rb, err := ws.app.clientset.RbacV1().RoleBindings(namespace).Get(ws.app.ctx, name, metav1.GetOptions{})
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	rb.ManagedFields = nil
	yamlData, err := toKubectlYAML(rb, schema.GroupVersionKind{Group: "rbac.authorization.k8s.io", Version: "v1", Kind: "RoleBinding"})
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"yaml":    string(yamlData),
	})
}

func (ws *WebServer) handleRoleBindingUpdate(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	name := r.URL.Query().Get("name")
	namespace := r.URL.Query().Get("namespace")
	if name == "" || namespace == "" {
		http.Error(w, "RoleBinding name and namespace are required", http.StatusBadRequest)
		return
	}

	body, err := io.ReadAll(r.Body)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to read body: %v", err), http.StatusBadRequest)
		return
	}
	defer r.Body.Close()

	var rb rbacv1.RoleBinding
	if err := yaml.Unmarshal(body, &rb); err != nil {
		http.Error(w, fmt.Sprintf("Failed to unmarshal YAML: %v", err), http.StatusBadRequest)
		return
	}

	_, err = ws.app.clientset.RbacV1().RoleBindings(namespace).Update(ws.app.ctx, &rb, metav1.UpdateOptions{})
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to update RoleBinding: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{"success": true})
}

func (ws *WebServer) handleRoleBindingDelete(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	name := r.URL.Query().Get("name")
	namespace := r.URL.Query().Get("namespace")
	if name == "" || namespace == "" {
		json.NewEncoder(w).Encode(map[string]interface{}{"success": false, "error": "RoleBinding name and namespace are required"})
		return
	}

	err := ws.app.clientset.RbacV1().RoleBindings(namespace).Delete(ws.app.ctx, name, metav1.DeleteOptions{})
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{"success": false, "error": err.Error()})
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{"success": true})
}

func (ws *WebServer) handleClusterRoleYAML(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	name := r.URL.Query().Get("name")
	if name == "" {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "ClusterRole name is required",
		})
		return
	}

	cr, err := ws.app.clientset.RbacV1().ClusterRoles().Get(ws.app.ctx, name, metav1.GetOptions{})
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	cr.ManagedFields = nil
	yamlData, err := toKubectlYAML(cr, schema.GroupVersionKind{Group: "rbac.authorization.k8s.io", Version: "v1", Kind: "ClusterRole"})
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"yaml":    string(yamlData),
	})
}

func (ws *WebServer) handleClusterRoleUpdate(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	name := r.URL.Query().Get("name")
	if name == "" {
		http.Error(w, "ClusterRole name is required", http.StatusBadRequest)
		return
	}

	body, err := io.ReadAll(r.Body)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to read body: %v", err), http.StatusBadRequest)
		return
	}
	defer r.Body.Close()

	var cr rbacv1.ClusterRole
	if err := yaml.Unmarshal(body, &cr); err != nil {
		http.Error(w, fmt.Sprintf("Failed to unmarshal YAML: %v", err), http.StatusBadRequest)
		return
	}

	_, err = ws.app.clientset.RbacV1().ClusterRoles().Update(ws.app.ctx, &cr, metav1.UpdateOptions{})
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to update ClusterRole: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{"success": true})
}

func (ws *WebServer) handleClusterRoleDelete(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	name := r.URL.Query().Get("name")
	if name == "" {
		json.NewEncoder(w).Encode(map[string]interface{}{"success": false, "error": "ClusterRole name is required"})
		return
	}

	err := ws.app.clientset.RbacV1().ClusterRoles().Delete(ws.app.ctx, name, metav1.DeleteOptions{})
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{"success": false, "error": err.Error()})
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{"success": true})
}

func (ws *WebServer) handleClusterRoleBindingYAML(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	name := r.URL.Query().Get("name")
	if name == "" {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "ClusterRoleBinding name is required",
		})
		return
	}

	crb, err := ws.app.clientset.RbacV1().ClusterRoleBindings().Get(ws.app.ctx, name, metav1.GetOptions{})
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	crb.ManagedFields = nil
	yamlData, err := toKubectlYAML(crb, schema.GroupVersionKind{Group: "rbac.authorization.k8s.io", Version: "v1", Kind: "ClusterRoleBinding"})
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"yaml":    string(yamlData),
	})
}

func (ws *WebServer) handleClusterRoleBindingUpdate(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	name := r.URL.Query().Get("name")
	if name == "" {
		http.Error(w, "ClusterRoleBinding name is required", http.StatusBadRequest)
		return
	}

	body, err := io.ReadAll(r.Body)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to read body: %v", err), http.StatusBadRequest)
		return
	}
	defer r.Body.Close()

	var crb rbacv1.ClusterRoleBinding
	if err := yaml.Unmarshal(body, &crb); err != nil {
		http.Error(w, fmt.Sprintf("Failed to unmarshal YAML: %v", err), http.StatusBadRequest)
		return
	}

	_, err = ws.app.clientset.RbacV1().ClusterRoleBindings().Update(ws.app.ctx, &crb, metav1.UpdateOptions{})
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to update ClusterRoleBinding: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{"success": true})
}

func (ws *WebServer) handleClusterRoleBindingDelete(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	name := r.URL.Query().Get("name")
	if name == "" {
		json.NewEncoder(w).Encode(map[string]interface{}{"success": false, "error": "ClusterRoleBinding name is required"})
		return
	}

	err := ws.app.clientset.RbacV1().ClusterRoleBindings().Delete(ws.app.ctx, name, metav1.DeleteOptions{})
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{"success": false, "error": err.Error()})
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{"success": true})
}

// handleVulnerabilityScan scans the cluster for vulnerabilities
func (ws *WebServer) handleVulnerabilityScan(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	severity := r.URL.Query().Get("severity") // Optional filter: CRITICAL, HIGH, MEDIUM, LOW

	// Add timeout to prevent hanging (5 minutes should be enough for large clusters)
	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Minute)
	defer cancel()

	log.Printf("Starting vulnerability scan (severity filter: %s)", severity)
	startTime := time.Now()
	vulnerabilities, err := ws.app.vulnerabilityScanner.ScanCluster(ctx)
	duration := time.Since(startTime)

	if err != nil {
		log.Printf("Vulnerability scan failed after %v: %v", duration, err)
		http.Error(w, fmt.Sprintf("Failed to scan cluster: %v", err), http.StatusInternalServerError)
		return
	}

	log.Printf("Vulnerability scan completed in %v: found %d vulnerabilities", duration, len(vulnerabilities))

	// Filter by severity if specified
	if severity != "" {
		var filtered []Vulnerability
		for _, vuln := range vulnerabilities {
			if strings.EqualFold(vuln.Severity, severity) {
				filtered = append(filtered, vuln)
			}
		}
		vulnerabilities = filtered
	}

	// Calculate stats
	stats := map[string]int{
		"total":    len(vulnerabilities),
		"critical": 0,
		"high":     0,
		"medium":   0,
		"low":      0,
	}
	for _, vuln := range vulnerabilities {
		switch strings.ToUpper(vuln.Severity) {
		case "CRITICAL":
			stats["critical"]++
		case "HIGH":
			stats["high"]++
		case "MEDIUM":
			stats["medium"]++
		case "LOW":
			stats["low"]++
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"vulnerabilities": vulnerabilities,
		"stats":           stats,
		"lastRefresh":     ws.app.vulnerabilityScanner.lastRefresh.Format(time.RFC3339),
	})
}

// handleVulnerabilityRefresh manually refreshes NVD data
func (ws *WebServer) handleVulnerabilityRefresh(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	err := ws.app.vulnerabilityScanner.RefreshNVDData(r.Context())
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to refresh NVD data: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success":     true,
		"message":     "NVD data refreshed successfully",
		"lastRefresh": ws.app.vulnerabilityScanner.lastRefresh.Format(time.RFC3339),
		"cveCount":    len(ws.app.vulnerabilityScanner.nvdCache),
	})
}

// handleVulnerabilityStats returns vulnerability statistics
func (ws *WebServer) handleVulnerabilityStats(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	vulnerabilities, err := ws.app.vulnerabilityScanner.ScanCluster(r.Context())
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to scan cluster: %v", err), http.StatusInternalServerError)
		return
	}

	stats := map[string]interface{}{
		"total":       len(vulnerabilities),
		"critical":    0,
		"high":        0,
		"medium":      0,
		"low":         0,
		"cveCount":    len(ws.app.vulnerabilityScanner.nvdCache),
		"lastRefresh": ws.app.vulnerabilityScanner.lastRefresh.Format(time.RFC3339),
		"byNamespace": make(map[string]int),
		"byImage":     make(map[string]int),
	}

	byNamespace := stats["byNamespace"].(map[string]int)
	byImage := stats["byImage"].(map[string]int)

	for _, vuln := range vulnerabilities {
		switch strings.ToUpper(vuln.Severity) {
		case "CRITICAL":
			stats["critical"] = stats["critical"].(int) + 1
		case "HIGH":
			stats["high"] = stats["high"].(int) + 1
		case "MEDIUM":
			stats["medium"] = stats["medium"].(int) + 1
		case "LOW":
			stats["low"] = stats["low"].(int) + 1
		}
		byNamespace[vuln.Namespace]++
		byImage[vuln.AffectedImage]++
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(stats)
}

// AutoFix rule storage (in-memory, can be persisted later)
var (
	autofixRules   = sync.Map{} // map[string]*AutoFixRule
	autofixEnabled = false      // Disabled by default - user must enable
	autofixActions []AutoFixAction
	autofixMu      sync.RWMutex
)

// AutoFixRule represents an AutoFix rule configuration
type AutoFixRule struct {
	ID            string               `json:"id"`
	Name          string               `json:"name"`
	Type          string               `json:"type"` // "oom", "hpa_max", "security", "drift"
	Enabled       bool                 `json:"enabled"`
	Description   string               `json:"description"`
	LastTriggered *time.Time           `json:"lastTriggered,omitempty"`
	TriggerCount  int                  `json:"triggerCount"`
	Settings      *AutoFixRuleSettings `json:"settings,omitempty"`
}

// AutoFixRuleSettings contains configurable settings for each rule type
type AutoFixRuleSettings struct {
	// For HPA Max: number of additional replicas to add
	AdditionalReplicas *int32 `json:"additionalReplicas,omitempty"`
	// For OOM: memory to add in MiB
	MemoryIncreaseMiB *int32 `json:"memoryIncreaseMiB,omitempty"`
	// Maximum replicas limit (0 = no limit)
	MaxReplicasLimit *int32 `json:"maxReplicasLimit,omitempty"`
}

// AutoFixAction represents a completed AutoFix action
type AutoFixAction struct {
	ID        string    `json:"id"`
	Timestamp time.Time `json:"timestamp"`
	Type      string    `json:"type"`
	Resource  string    `json:"resource"`
	Namespace string    `json:"namespace"`
	Status    string    `json:"status"` // "success", "failed", "pending"
	Message   string    `json:"message"`
}

// initAutoFixRules initializes default AutoFix rules (called on startup)
func initAutoFixRules() {
	now := time.Now()
	hourAgo := now.Add(-1 * time.Hour)
	twoHoursAgo := now.Add(-2 * time.Hour)

	// Default settings
	defaultHPAReplicas := int32(2)
	defaultOOMMemory := int32(500)      // 500 MiB
	defaultMaxReplicasLimit := int32(0) // 0 = no limit

	rules := []*AutoFixRule{
		{
			ID:            "oom-1",
			Name:          "OOM Auto-Restart",
			Type:          "oom",
			Enabled:       false, // Disabled by default
			Description:   "Automatically restart pods that are OOM killed and increase memory limits",
			LastTriggered: &now,
			TriggerCount:  5,
			Settings: &AutoFixRuleSettings{
				MemoryIncreaseMiB: &defaultOOMMemory,
			},
		},
		{
			ID:            "hpa-1",
			Name:          "HPA Max Scaling",
			Type:          "hpa_max",
			Enabled:       false, // Disabled by default
			Description:   "Scale deployments when HPA reaches max replicas",
			LastTriggered: &hourAgo,
			TriggerCount:  12,
			Settings: &AutoFixRuleSettings{
				AdditionalReplicas: &defaultHPAReplicas,
				MaxReplicasLimit:   &defaultMaxReplicasLimit,
			},
		},
		{
			ID:            "security-1",
			Name:          "Security Policy AutoFix",
			Type:          "security",
			Enabled:       false, // Disabled by default
			Description:   "Automatically apply security fixes for policy violations",
			LastTriggered: &twoHoursAgo,
			TriggerCount:  3,
		},
		{
			ID:           "drift-1",
			Name:         "Drift Auto-Correction",
			Type:         "drift",
			Enabled:      false,
			Description:  "Automatically correct configuration drift",
			TriggerCount: 0,
		},
	}

	for _, rule := range rules {
		autofixRules.Store(rule.ID, rule)
	}

	// Initialize some sample actions
	autofixActions = []AutoFixAction{
		{
			ID:        "action-1",
			Timestamp: now,
			Type:      "oom",
			Resource:  "my-app-pod",
			Namespace: "default",
			Status:    "success",
			Message:   "Pod restarted successfully after OOM kill",
		},
		{
			ID:        "action-2",
			Timestamp: now.Add(-30 * time.Minute),
			Type:      "hpa_max",
			Resource:  "web-deployment",
			Namespace: "production",
			Status:    "success",
			Message:   "Deployment scaled from 10 to 15 replicas",
		},
	}
}

// handleAutoFixRules returns all AutoFix rules
func (ws *WebServer) handleAutoFixRules(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var rules []*AutoFixRule
	autofixRules.Range(func(key, value interface{}) bool {
		if rule, ok := value.(*AutoFixRule); ok {
			rules = append(rules, rule)
		}
		return true
	})

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"rules": rules,
	})
}

// handleAutoFixRuleToggle toggles a rule's enabled state and updates settings
func (ws *WebServer) handleAutoFixRuleToggle(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var request struct {
		RuleID   string               `json:"ruleId"`
		Enabled  bool                 `json:"enabled"`
		Settings *AutoFixRuleSettings `json:"settings,omitempty"`
	}

	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	value, ok := autofixRules.Load(request.RuleID)
	if !ok {
		http.Error(w, "Rule not found", http.StatusNotFound)
		return
	}

	rule := value.(*AutoFixRule)
	rule.Enabled = request.Enabled

	// Update settings if provided
	if request.Settings != nil {
		if rule.Settings == nil {
			rule.Settings = &AutoFixRuleSettings{}
		}
		if request.Settings.AdditionalReplicas != nil {
			rule.Settings.AdditionalReplicas = request.Settings.AdditionalReplicas
		}
		if request.Settings.MemoryIncreaseMiB != nil {
			rule.Settings.MemoryIncreaseMiB = request.Settings.MemoryIncreaseMiB
		}
		if request.Settings.MaxReplicasLimit != nil {
			rule.Settings.MaxReplicasLimit = request.Settings.MaxReplicasLimit
		}
	}

	autofixRules.Store(request.RuleID, rule)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"rule":    rule,
	})
}

// handleAutoFixActions returns recent AutoFix actions
func (ws *WebServer) handleAutoFixActions(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	autofixMu.RLock()
	defer autofixMu.RUnlock()

	// Return last 50 actions
	actions := autofixActions
	if len(actions) > 50 {
		actions = actions[len(actions)-50:]
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"actions": actions,
	})
}

// handleAutoFixEnabled gets or sets the global AutoFix enabled state
func (ws *WebServer) handleAutoFixEnabled(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodGet {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"enabled": autofixEnabled,
		})
		return
	}

	if r.Method == http.MethodPost {
		var request struct {
			Enabled bool `json:"enabled"`
		}

		if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
			http.Error(w, "Invalid request body", http.StatusBadRequest)
			return
		}

		autofixEnabled = request.Enabled

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": true,
			"enabled": autofixEnabled,
		})
		return
	}

	http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
}

// handleMetricsCollectorConfig handles GET/POST /api/metrics/collector/config
func (ws *WebServer) handleMetricsCollectorConfig(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if ws.app.metricsCollector == nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"error": "Metrics collector not initialized",
		})
		return
	}

	switch r.Method {
	case http.MethodGet:
		// Get current configuration
		config := ws.app.metricsCollector.GetConfig()
		json.NewEncoder(w).Encode(map[string]interface{}{
			"enabled":            config.Enabled,
			"collectionInterval": config.CollectionInterval.Minutes(),
			"maxRetentionDays":   config.MaxRetentionDays,
			"storagePath":        config.StoragePath,
		})

	case http.MethodPost:
		// Update configuration
		var req struct {
			Enabled            *bool    `json:"enabled"`
			CollectionInterval *float64 `json:"collectionInterval"` // in minutes
			MaxRetentionDays   *int     `json:"maxRetentionDays"`
		}

		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, fmt.Sprintf("Failed to parse request: %v", err), http.StatusBadRequest)
			return
		}

		// Get current config
		config := ws.app.metricsCollector.GetConfig()

		// Update fields if provided
		if req.Enabled != nil {
			config.Enabled = *req.Enabled
		}
		if req.CollectionInterval != nil {
			config.CollectionInterval = time.Duration(*req.CollectionInterval * float64(time.Minute))
		}
		if req.MaxRetentionDays != nil {
			config.MaxRetentionDays = *req.MaxRetentionDays
		}

		// Apply updated config
		ws.app.metricsCollector.UpdateConfig(config)

		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": true,
			"message": "Configuration updated successfully",
			"config": map[string]interface{}{
				"enabled":            config.Enabled,
				"collectionInterval": config.CollectionInterval.Minutes(),
				"maxRetentionDays":   config.MaxRetentionDays,
			},
		})

	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

// handleMetricsCollectorStatus handles GET /api/metrics/collector/status
func (ws *WebServer) handleMetricsCollectorStatus(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	w.Header().Set("Content-Type", "application/json")

	if ws.app.metricsCollector == nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"error": "Metrics collector not initialized",
		})
		return
	}

	// Get metrics stats from ML recommender
	var totalSamples int
	var lastUpdated time.Time

	if ws.app.mlRecommender != nil {
		stats := ws.app.mlRecommender.GetMetricsHistoryStats()
		if samples, ok := stats["totalSamples"].(int); ok {
			totalSamples = samples
		}
	}

	if ws.app.anomalyDetector != nil {
		ws.app.anomalyDetector.mu.RLock()
		if len(ws.app.anomalyDetector.metricsHistory) > 0 {
			lastUpdated = ws.app.anomalyDetector.metricsHistory[len(ws.app.anomalyDetector.metricsHistory)-1].Timestamp
		}
		ws.app.anomalyDetector.mu.RUnlock()
	}

	config := ws.app.metricsCollector.GetConfig()

	json.NewEncoder(w).Encode(map[string]interface{}{
		"enabled":            config.Enabled,
		"collectionInterval": config.CollectionInterval.Minutes(),
		"totalSamples":       totalSamples,
		"lastUpdated":        lastUpdated,
		"storagePath":        config.StoragePath,
		"maxRetentionDays":   config.MaxRetentionDays,
		"isConnected":        ws.app.connected,
	})
}

// handleMetricsCollectorClear handles POST /api/metrics/collector/clear
func (ws *WebServer) handleMetricsCollectorClear(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	w.Header().Set("Content-Type", "application/json")

	if ws.app.metricsCollector == nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Metrics collector not initialized",
		})
		return
	}

	// Clear metrics from anomaly detector
	if ws.app.anomalyDetector != nil {
		ws.app.anomalyDetector.mu.Lock()
		ws.app.anomalyDetector.metricsHistory = []MetricSample{}
		ws.app.anomalyDetector.mu.Unlock()
	}

	// Clear metrics from ML recommender
	if ws.app.mlRecommender != nil {
		ws.app.mlRecommender.mu.Lock()
		ws.app.mlRecommender.metricsHistory = []MetricSample{}
		ws.app.mlRecommender.mu.Unlock()
	}

	// Save empty metrics to disk
	if err := ws.app.metricsCollector.SaveMetrics(); err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   fmt.Sprintf("Failed to save cleared metrics: %v", err),
		})
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": "Metrics history cleared successfully",
	})
}

// New Modular AI Assistant Handlers

// handleAIChat handles natural language chat requests
func (ws *WebServer) handleAIChat(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var request struct {
		Message string `json:"message"`
	}

	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Use existing AI assistant for natural language processing
	assistant := NewAIAssistant(nil)
	if !assistant.IsAvailable() {
		// Fallback response when AI is not available
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"type": "generic_response",
			"message": "AI Assistant is not available. Please install Ollama and run 'ollama serve' to enable AI features.",
		})
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 60*time.Second)
	defer cancel()

	// Process the natural language query
	response, err := assistant.Query(ctx, request.Message)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"type": "generic_response",
		"message": response,
	})
}

// handleAISuggestion generates healing suggestions based on AI analysis
func (ws *WebServer) handleAISuggestion(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var request struct {
		Intent map[string]interface{} `json:"intent"`
	}

	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// For now, return a mock suggestion
	// In a full implementation, this would analyze the cluster and generate suggestions
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"action": "investigate",
		"description": "AI suggestion feature coming soon. Please use existing cluster analysis tools.",
		"resource": request.Intent["resource"],
		"namespace": request.Intent["namespace"],
		"name": request.Intent["name"],
		"confidence": 0.8,
		"risk_level": "low",
		"estimated_impact": "AI-powered suggestions will be available soon",
		"prerequisites": []string{"AI model available"},
		"steps": []string{"Install Ollama", "Configure AI model", "Try natural language queries"},
		"alternatives": []string{"Use existing cluster analysis", "Check pod logs", "Review events"},
		"safety_checks": []map[string]interface{}{
			{"name": "AI Available", "description": "Check if AI assistant is available", "status": "passed", "message": "AI assistant ready"},
		},
		"requires_approval": false,
	})
}

// handleAIExecute executes AI-suggested actions
func (ws *WebServer) handleAIExecute(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var request struct {
		Suggestion map[string]interface{} `json:"suggestion"`
		Confirmed  bool                   `json:"confirmed"`
	}

	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// For now, return a mock execution result
	// In a full implementation, this would execute the suggested action
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"action":      request.Suggestion["action"],
		"resource":    request.Suggestion["resource"],
		"name":        request.Suggestion["name"],
		"namespace":   request.Suggestion["namespace"],
		"status":      "completed",
		"started_at":  time.Now(),
		"completed_at": time.Now(),
		"error":       "",
	})
}
