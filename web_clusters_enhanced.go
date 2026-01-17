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
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/kubegraf/kubegraf/internal/database"
)

// ClusterSourceRequest represents a request to add a cluster source
type ClusterSourceRequest struct {
	Name    string `json:"name"`
	Type    string `json:"type"` // "file" or "inline"
	Path    string `json:"path,omitempty"` // For "file" type
	Content string `json:"content,omitempty"` // For "inline" type (kubeconfig YAML)
}

// handleClusterSources handles GET /api/cluster-sources
func (ws *WebServer) handleClusterSources(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Use enhanced manager if available, otherwise fall back to basic discovery
	if ws.enhancedClusterManager != nil {
		sources, err := ws.enhancedClusterManager.ListSources()
		if err != nil {
			http.Error(w, fmt.Sprintf("Failed to list sources: %v", err), http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"sources": sources,
		})
		return
	}

	// Fallback: return empty sources
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"sources": []interface{}{},
	})
}

// handleAddClusterSourceFile handles POST /api/cluster-sources/file
func (ws *WebServer) handleAddClusterSourceFile(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	if ws.enhancedClusterManager == nil {
		http.Error(w, "Enhanced cluster manager not available", http.StatusServiceUnavailable)
		return
	}

	var req ClusterSourceRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, fmt.Sprintf("Invalid request: %v", err), http.StatusBadRequest)
		return
	}

	if req.Name == "" || req.Path == "" {
		http.Error(w, "name and path are required", http.StatusBadRequest)
		return
	}

	source, err := ws.enhancedClusterManager.AddFileSource(req.Name, req.Path)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to add source: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"source":  source,
	})
}

// handleAddClusterSourceInline handles POST /api/cluster-sources/inline
func (ws *WebServer) handleAddClusterSourceInline(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	if ws.enhancedClusterManager == nil {
		http.Error(w, "Enhanced cluster manager not available", http.StatusServiceUnavailable)
		return
	}

	var req ClusterSourceRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, fmt.Sprintf("Invalid request: %v", err), http.StatusBadRequest)
		return
	}

	if req.Name == "" || req.Content == "" {
		http.Error(w, "name and content are required", http.StatusBadRequest)
		return
	}

	source, err := ws.enhancedClusterManager.AddInlineSource(req.Name, req.Content)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to add source: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"source":  source,
	})
}

// handleSelectCluster handles POST /api/clusters/select
func (ws *WebServer) handleSelectCluster(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	if ws.enhancedClusterManager == nil {
		http.Error(w, "Enhanced cluster manager not available", http.StatusServiceUnavailable)
		return
	}

	var req struct {
		ClusterID string `json:"clusterId"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, fmt.Sprintf("Invalid request: %v", err), http.StatusBadRequest)
		return
	}

	if req.ClusterID == "" {
		http.Error(w, "clusterId is required", http.StatusBadRequest)
		return
	}

	if ws.enhancedClusterManager == nil {
		http.Error(w, "Enhanced cluster manager not available", http.StatusServiceUnavailable)
		return
	}

	if err := ws.enhancedClusterManager.SelectCluster(req.ClusterID); err != nil {
		http.Error(w, fmt.Sprintf("Failed to select cluster: %v", err), http.StatusInternalServerError)
		return
	}

	// Reinitialize metrics collector with new cluster
	ws.reinitializeMetricsCollector()

	// Get updated cluster status
	cluster, err := ws.enhancedClusterManager.GetActiveCluster()
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to get active cluster: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"cluster": cluster,
	})
}

// handleReconnectCluster handles POST /api/clusters/reconnect?id=<clusterId>
func (ws *WebServer) handleReconnectCluster(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	if ws.enhancedClusterManager == nil {
		http.Error(w, "Enhanced cluster manager not available", http.StatusServiceUnavailable)
		return
	}

	// Extract cluster ID from query parameter
	clusterID := r.URL.Query().Get("id")
	if clusterID == "" {
		// Try from request body as fallback
		var req struct {
			ClusterID string `json:"clusterId"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err == nil && req.ClusterID != "" {
			clusterID = req.ClusterID
		}
	}

	if clusterID == "" {
		http.Error(w, "cluster id is required", http.StatusBadRequest)
		return
	}

	if ws.enhancedClusterManager == nil {
		http.Error(w, "Enhanced cluster manager not available", http.StatusServiceUnavailable)
		return
	}

	if err := ws.enhancedClusterManager.ReconnectCluster(clusterID); err != nil {
		http.Error(w, fmt.Sprintf("Failed to reconnect: %v", err), http.StatusInternalServerError)
		return
	}

	// Get updated status
	state, err := ws.enhancedClusterManager.GetClusterStatus(clusterID)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to get cluster status: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"status":  state,
	})
}

// handleListClustersEnhanced handles GET /api/clusters/enhanced
// Supports ?cached=true query param for fast cached response (optimistic UI)
func (ws *WebServer) handleListClustersEnhanced(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	if ws.enhancedClusterManager == nil {
		http.Error(w, "Enhanced cluster manager not available", http.StatusServiceUnavailable)
		return
	}

	// Check if cached (fast) mode is requested
	cached := r.URL.Query().Get("cached") == "true"

	var clusters interface{}
	var err error

	if cached {
		// Fast path: return cached data, trigger background health checks
		clusters, err = ws.enhancedClusterManager.ListClustersCached()
	} else {
		// Slow path: full health status enrichment
		clusters, err = ws.enhancedClusterManager.ListClusters()
	}

	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to list clusters: %v", err), http.StatusInternalServerError)
		return
	}

	// Get active cluster (also use cached version if requested)
	active, _ := ws.enhancedClusterManager.GetActiveClusterCached()

	// OPTIMISTIC UI: Use app's actual connection state for the active cluster
	// This makes Cluster Manager show "Connected" immediately when ws.app.connected is true
	// instead of waiting for background health checks to complete
	if active != nil && ws.app.connected {
		active.Status = "CONNECTED"
		active.Connected = true
	}

	// Also update the active cluster's status in the clusters list for consistency
	if clusterList, ok := clusters.([]*database.EnhancedClusterEntry); ok && ws.app.connected && active != nil {
		for _, c := range clusterList {
			if c.ClusterID == active.ClusterID {
				c.Status = "CONNECTED"
				c.Connected = true
				break
			}
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"clusters": clusters,
		"active":   active,
	})
}

// handleGetActiveCluster handles GET /api/clusters/active
func (ws *WebServer) handleGetActiveCluster(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	if ws.enhancedClusterManager == nil {
		http.Error(w, "Enhanced cluster manager not available", http.StatusServiceUnavailable)
		return
	}

	active, err := ws.enhancedClusterManager.GetActiveCluster()
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to get active cluster: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"cluster": active,
	})
}

// handleRefreshClusterCatalog handles POST /api/clusters/refresh-catalog
func (ws *WebServer) handleRefreshClusterCatalog(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	if ws.enhancedClusterManager == nil {
		http.Error(w, "Enhanced cluster manager not available", http.StatusServiceUnavailable)
		return
	}

	// Discover and add kubeconfig sources
	if err := ws.enhancedClusterManager.DiscoverAndAddKubeconfigSources(); err != nil {
		http.Error(w, fmt.Sprintf("Failed to discover sources: %v", err), http.StatusInternalServerError)
		return
	}

	// Refresh cluster catalog
	if err := ws.enhancedClusterManager.RefreshClusterCatalog(); err != nil {
		http.Error(w, fmt.Sprintf("Failed to refresh catalog: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": "Cluster catalog refreshed",
	})
}

// handleDisconnectCluster handles POST /api/clusters/disconnect
func (ws *WebServer) handleDisconnectCluster(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Clear the active cluster connection
	if ws.app != nil {
		ws.app.connected = false
		ws.app.connectionError = "Disconnected by user"
		ws.app.cluster = ""
		ws.app.clientset = nil
		ws.app.metricsClient = nil

		// Update context manager
		if ws.app.contextManager != nil {
			ws.app.contextManager.CurrentContext = ""
		}
	}

	// Clear cache to remove all cached data
	if ws.cache != nil {
		if err := ws.cache.Clear(); err != nil {
			fmt.Printf("⚠️  Failed to clear cache on disconnect: %v\n", err)
		} else {
			fmt.Printf("✅ Cache cleared on disconnect\n")
		}
	}

	// If enhanced cluster manager available, clear active cluster in DB
	if ws.enhancedClusterManager != nil && ws.db != nil {
		if err := ws.db.ClearActiveCluster(); err != nil {
			fmt.Printf("⚠️  Failed to clear active cluster in DB: %v\n", err)
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": "Cluster disconnected",
	})
}
