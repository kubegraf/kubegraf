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
)

// RegisterConnectorHandlers registers connector API handlers
func (ws *WebServer) RegisterConnectorHandlers() {
	http.HandleFunc("/api/connectors", ws.handleConnectors)
	http.HandleFunc("/api/connectors/", ws.handleConnectorByID)
}

// handleConnectors handles GET (list) and POST (create) requests
func (ws *WebServer) handleConnectors(w http.ResponseWriter, r *http.Request) {
	if ws.app.connectorManager == nil {
		http.Error(w, "Connector manager not initialized", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")

	switch r.Method {
	case http.MethodGet:
		connectors := ws.app.connectorManager.GetConnectors()
		json.NewEncoder(w).Encode(connectors)

	case http.MethodPost:
		var connector Connector
		if err := json.NewDecoder(r.Body).Decode(&connector); err != nil {
			http.Error(w, fmt.Sprintf("Invalid request: %v", err), http.StatusBadRequest)
			return
		}

		created, err := ws.app.connectorManager.CreateConnector(connector)
		if err != nil {
			http.Error(w, fmt.Sprintf("Failed to create connector: %v", err), http.StatusInternalServerError)
			return
		}

		json.NewEncoder(w).Encode(map[string]interface{}{
			"success":   true,
			"connector": created,
		})

	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

// handleConnectorByID handles GET, PUT, DELETE requests for a specific connector
func (ws *WebServer) handleConnectorByID(w http.ResponseWriter, r *http.Request) {
	if ws.app.connectorManager == nil {
		http.Error(w, "Connector manager not initialized", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")

	// Extract ID from path: /api/connectors/{id} or /api/connectors/{id}/test
	path := r.URL.Path
	id := ""
	test := false

	if len(path) > len("/api/connectors/") {
		remaining := path[len("/api/connectors/"):]
		if len(remaining) > 0 {
			if remaining[len(remaining)-5:] == "/test" {
				id = remaining[:len(remaining)-5]
				test = true
			} else {
				id = remaining
			}
		}
	}

	if id == "" {
		http.Error(w, "Connector ID required", http.StatusBadRequest)
		return
	}

	switch r.Method {
	case http.MethodGet:
		connector, err := ws.app.connectorManager.GetConnector(id)
		if err != nil {
			http.Error(w, err.Error(), http.StatusNotFound)
			return
		}
		json.NewEncoder(w).Encode(connector)

	case http.MethodPut:
		var updates map[string]interface{}
		if err := json.NewDecoder(r.Body).Decode(&updates); err != nil {
			http.Error(w, fmt.Sprintf("Invalid request: %v", err), http.StatusBadRequest)
			return
		}

		updated, err := ws.app.connectorManager.UpdateConnector(id, updates)
		if err != nil {
			http.Error(w, fmt.Sprintf("Failed to update connector: %v", err), http.StatusInternalServerError)
			return
		}

		json.NewEncoder(w).Encode(map[string]interface{}{
			"success":   true,
			"connector": updated,
		})

	case http.MethodDelete:
		if err := ws.app.connectorManager.DeleteConnector(id); err != nil {
			http.Error(w, fmt.Sprintf("Failed to delete connector: %v", err), http.StatusInternalServerError)
			return
		}

		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": true,
		})

	case http.MethodPost:
		if test {
			if err := ws.app.connectorManager.TestConnector(id); err != nil {
				json.NewEncoder(w).Encode(map[string]interface{}{
					"success": false,
					"error":   err.Error(),
				})
				return
			}

			json.NewEncoder(w).Encode(map[string]interface{}{
				"success": true,
				"message": "Connector test successful",
			})
		} else {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}

	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}
