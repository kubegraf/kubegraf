// Copyright 2025 KubeGraf Contributors
package main

import (
	"encoding/json"
	"fmt"
	"net/http"

	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/tools/clientcmd"
)

// ClusterListResponse represents the response for listing clusters
type ClusterListResponse struct {
	Clusters []*ClusterInfo `json:"clusters"`
	Current  *ClusterInfo   `json:"current"`
	Success  bool           `json:"success"`
}

// ClusterSwitchRequest represents a request to switch clusters
type ClusterSwitchRequest struct {
	ContextName string `json:"contextName"`
}

// ClusterSwitchResponse represents the response after switching clusters
type ClusterSwitchResponse struct {
	Success     bool   `json:"success"`
	ContextName string `json:"contextName"`
	Message     string `json:"message,omitempty"`
	Error       string `json:"error,omitempty"`
}

// ClusterHealthResponse represents the health check response
type ClusterHealthResponse struct {
	ContextName string `json:"contextName"`
	Healthy     bool   `json:"healthy"`
	Error       string `json:"error,omitempty"`
}

// handleClustersList returns list of all clusters
// GET /api/clusters
func (ws *WebServer) handleClustersList(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if r.Method != http.MethodGet {
		w.WriteHeader(http.StatusMethodNotAllowed)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Method not allowed",
		})
		return
	}

	if ws.simpleClusterManager == nil {
		w.WriteHeader(http.StatusServiceUnavailable)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Cluster manager not initialized",
		})
		return
	}

	clusters := ws.simpleClusterManager.ListClusters()
	current := ws.simpleClusterManager.GetCurrentCluster()

	response := ClusterListResponse{
		Clusters: clusters,
		Current:  current,
		Success:  true,
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(response)
}

// handleClusterSwitch switches to a different cluster
// POST /api/clusters/switch
func (ws *WebServer) handleClusterSwitch(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		json.NewEncoder(w).Encode(ClusterSwitchResponse{
			Success: false,
			Error:   "Method not allowed",
		})
		return
	}

	var req ClusterSwitchRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(ClusterSwitchResponse{
			Success: false,
			Error:   "Invalid request body",
		})
		return
	}

	if req.ContextName == "" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(ClusterSwitchResponse{
			Success: false,
			Error:   "contextName is required",
		})
		return
	}

	if ws.simpleClusterManager == nil {
		w.WriteHeader(http.StatusServiceUnavailable)
		json.NewEncoder(w).Encode(ClusterSwitchResponse{
			Success: false,
			Error:   "Cluster manager not initialized",
		})
		return
	}

	// Perform the switch
	if err := ws.simpleClusterManager.SwitchCluster(req.ContextName); err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(ClusterSwitchResponse{
			Success:     false,
			ContextName: req.ContextName,
			Error:       fmt.Sprintf("Failed to switch cluster: %v", err),
		})
		return
	}

	// Update app state
	ws.app.cluster = req.ContextName

	// Reinitialize metrics collector with new cluster
	ws.reinitializeMetricsCollector()

	// Log the switch
	fmt.Printf("✅ Switched to cluster: %s\n", req.ContextName)

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(ClusterSwitchResponse{
		Success:     true,
		ContextName: req.ContextName,
		Message:     fmt.Sprintf("Successfully switched to cluster: %s", req.ContextName),
	})
}

// handleClusterHealthSimple checks if a specific cluster is healthy
// GET /api/clusters/health?context=...
func (ws *WebServer) handleClusterHealthSimple(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if r.Method != http.MethodGet {
		w.WriteHeader(http.StatusMethodNotAllowed)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Method not allowed",
		})
		return
	}

	contextName := r.URL.Query().Get("context")
	if contextName == "" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "context query parameter is required",
		})
		return
	}

	if ws.simpleClusterManager == nil {
		w.WriteHeader(http.StatusServiceUnavailable)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Cluster manager not initialized",
		})
		return
	}

	// Check health by building clientset without switching
	loadingRules := &clientcmd.ClientConfigLoadingRules{ExplicitPath: ws.simpleClusterManager.kubeconfigPath}
	configOverrides := &clientcmd.ConfigOverrides{CurrentContext: contextName}
	kubeConfig := clientcmd.NewNonInteractiveDeferredLoadingClientConfig(loadingRules, configOverrides)

	restConfig, err := kubeConfig.ClientConfig()
	if err != nil {
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(ClusterHealthResponse{
			ContextName: contextName,
			Healthy:     false,
			Error:       err.Error(),
		})
		return
	}

	clientset, err := kubernetes.NewForConfig(restConfig)
	if err != nil {
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(ClusterHealthResponse{
			ContextName: contextName,
			Healthy:     false,
			Error:       err.Error(),
		})
		return
	}

	// Perform health check: get server version
	_, err = clientset.Discovery().ServerVersion()
	healthy := err == nil
	var errorMsg string
	if err != nil {
		errorMsg = err.Error()
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(ClusterHealthResponse{
		ContextName: contextName,
		Healthy:     healthy,
		Error:       errorMsg,
	})
}

// handleRefreshClusters reloads clusters from kubeconfig
// POST /api/clusters/refresh
func (ws *WebServer) handleRefreshClustersList(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Method not allowed",
		})
		return
	}

	if ws.simpleClusterManager == nil {
		w.WriteHeader(http.StatusServiceUnavailable)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Cluster manager not initialized",
		})
		return
	}

	if err := ws.simpleClusterManager.Refresh(); err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   fmt.Sprintf("Failed to refresh: %v", err),
		})
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": "Clusters refreshed successfully",
	})
}
