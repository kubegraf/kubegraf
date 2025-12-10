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
	"time"
)

// handleContinuitySummary handles GET /api/continuity/summary?window=7d
func (ws *WebServer) handleContinuitySummary(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Check if cluster is connected
	if ws.app.clientset == nil || !ws.app.connected {
		http.Error(w, "Cluster not connected", http.StatusServiceUnavailable)
		return
	}

	// Get window parameter (default: 7d)
	window := r.URL.Query().Get("window")
	if window == "" {
		window = "7d"
	}

	// Create continuity service
	continuityService := NewContinuityService(ws.app.clientset, ws.stateManager)

	// Create a context with timeout to prevent hanging requests
	ctx, cancel := context.WithTimeout(r.Context(), 30*time.Second)
	defer cancel()

	// Get summary
	summary, err := continuityService.GetSummary(ctx, window)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to get continuity summary: %v", err), http.StatusInternalServerError)
		return
	}

	// Return JSON response
	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(summary); err != nil {
		http.Error(w, "Failed to encode response", http.StatusInternalServerError)
		return
	}
}

