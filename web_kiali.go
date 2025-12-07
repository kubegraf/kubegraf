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

// handleKialiStatus returns the status of Kiali installation
func (ws *WebServer) handleKialiStatus(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	status, err := ws.app.DetectKiali(r.Context())
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"installed": false,
			"error":     err.Error(),
		})
		return
	}

	json.NewEncoder(w).Encode(status)
}

// handleKialiInstall installs Kiali using Helm
func (ws *WebServer) handleKialiInstall(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req KialiInstallRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Invalid request body: " + err.Error(),
		})
		return
	}

	result, err := ws.app.InstallKiali(r.Context(), &req)
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	json.NewEncoder(w).Encode(result)
}

// handleKialiVersions returns available Kiali versions
func (ws *WebServer) handleKialiVersions(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	versions, err := GetKialiVersions()
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"error": err.Error(),
		})
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"versions": versions,
	})
}

// handleKialiProxy proxies requests to Kiali API
func (ws *WebServer) handleKialiProxy(w http.ResponseWriter, r *http.Request) {
	ws.ProxyKialiAPI(w, r)
}

