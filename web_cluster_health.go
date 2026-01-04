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
	"net/http"
)

// handleClusterHealth returns the current cluster health status
func (ws *WebServer) handleClusterHealth(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	w.Header().Set("Content-Type", "application/json")

	// Check if we have a health monitor
	if ws.app == nil || ws.app.healthMonitor == nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"healthy":      false,
			"errorMessage": "Health monitor not initialized",
		})
		return
	}

	status := ws.app.healthMonitor.GetStatus()
	json.NewEncoder(w).Encode(status)
}

// handleClusterHealthCheck triggers an immediate health check
func (ws *WebServer) handleClusterHealthCheck(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	w.Header().Set("Content-Type", "application/json")

	// Check if we have a health monitor
	if ws.app == nil || ws.app.healthMonitor == nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"healthy":      false,
			"errorMessage": "Health monitor not initialized",
		})
		return
	}

	status := ws.app.healthMonitor.ForceCheck()
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"status":  status,
	})
}
