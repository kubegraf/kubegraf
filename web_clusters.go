package main

import (
	"encoding/json"
	"net/http"
)

// handleClusters returns stored clusters together with discovered kubeconfigs
func (ws *WebServer) handleClusters(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	if ws.clusterService == nil {
		http.Error(w, "cluster service unavailable", http.StatusServiceUnavailable)
		return
	}

	clusters, discovered, err := ws.clusterService.List()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	status := ws.clusterService.Status()
	response := map[string]interface{}{
		"clusters":   clusters,
		"discovered": discovered,
		"contexts":   ws.clusterService.RuntimeContexts(),
		"status":     status,
	}
	_ = json.NewEncoder(w).Encode(response)
}

// handleClusterConnect validates and connects to the selected cluster
func (ws *WebServer) handleClusterConnect(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	if ws.clusterService == nil {
		http.Error(w, "cluster service unavailable", http.StatusServiceUnavailable)
		return
	}

	var req ClusterConnectRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	entry, err := ws.clusterService.Connect(req)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	status := ws.clusterService.Status()
	ws.broadcastClusterStatus(status)

	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"cluster": entry,
		"status":  status,
	})
}

// handleClusterDisconnect clears the active connection
func (ws *WebServer) handleClusterDisconnect(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	if ws.clusterService == nil {
		http.Error(w, "cluster service unavailable", http.StatusServiceUnavailable)
		return
	}

	status, err := ws.clusterService.Disconnect()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	ws.broadcastClusterStatus(status)

	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"status":  status,
	})
}

// handleClusterStatus returns the latest connection status
func (ws *WebServer) handleClusterStatus(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	if ws.clusterService == nil {
		http.Error(w, "cluster service unavailable", http.StatusServiceUnavailable)
		return
	}

	_ = json.NewEncoder(w).Encode(ws.clusterService.Status())
}

// broadcastClusterStatus pushes cluster status updates to active websocket clients
func (ws *WebServer) broadcastClusterStatus(status *ClusterStatusPayload) {
	if status == nil {
		return
	}
	ws.mu.Lock()
	defer ws.mu.Unlock()

	payload := map[string]interface{}{
		"type": "cluster_status",
		"data": status,
	}

	for client := range ws.clients {
		if err := client.WriteJSON(payload); err != nil {
			client.Close()
			delete(ws.clients, client)
		}
	}
}
