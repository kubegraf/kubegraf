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
	"time"
)

// handleClusteredEvents returns events clustered with correlations
func (ws *WebServer) handleClusteredEvents(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	w.Header().Set("Content-Type", "application/json")

	if ws.app.eventMonitor == nil || ws.app.eventMonitor.correlator == nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"clusters": []EventCluster{},
		})
		return
	}

	// Parse window size parameter (default: 5 minutes)
	windowSizeStr := r.URL.Query().Get("window")
	if windowSizeStr == "" {
		windowSizeStr = "5m"
	}

	windowSize, err := time.ParseDuration(windowSizeStr)
	if err != nil {
		windowSize = 5 * time.Minute
	}

	// Get all events and log errors
	events := ws.app.eventMonitor.GetEvents(FilterOptions{})
	logErrors := ws.app.eventMonitor.GetLogErrorsSimple()

	// Cluster events with correlations
	clusters := ws.app.eventMonitor.correlator.ClusterEvents(events, logErrors, windowSize)

	json.NewEncoder(w).Encode(map[string]interface{}{
		"clusters":  clusters,
		"window":    windowSize.String(),
		"total":     len(clusters),
	})
}

// handleHTTPErrorsGrouped returns HTTP errors grouped by status code
func (ws *WebServer) handleHTTPErrorsGrouped(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	w.Header().Set("Content-Type", "application/json")

	if ws.app.eventMonitor == nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"groups": []map[string]interface{}{},
		})
		return
	}

	// Get all log errors
	logErrors := ws.app.eventMonitor.GetLogErrorsSimple()

	// Group by status code
	byStatusCode := make(map[int][]LogError)
	byMethod := make(map[string]int)
	byPath := make(map[string]int)

	for _, logError := range logErrors {
		if logError.StatusCode > 0 {
			byStatusCode[logError.StatusCode] = append(byStatusCode[logError.StatusCode], logError)
		}
		if logError.Method != "" {
			byMethod[logError.Method]++
		}
		if logError.Path != "" {
			byPath[logError.Path]++
		}
	}

	// Convert to response format
	groups := make([]map[string]interface{}, 0)
	for statusCode, errors := range byStatusCode {
		// Group by pod as well
		byPod := make(map[string][]LogError)
		for _, err := range errors {
			key := err.Namespace + "/" + err.Pod
			byPod[key] = append(byPod[key], err)
		}

		groups = append(groups, map[string]interface{}{
			"status_code": statusCode,
			"count":       len(errors),
			"errors":      errors,
			"by_pod":      byPod,
			"severity":    getHTTPSeverity(statusCode),
		})
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"groups":        groups,
		"by_method":     byMethod,
		"by_path":       byPath,
		"total_errors":  len(logErrors),
		"unique_codes":  len(byStatusCode),
	})
}

// getHTTPSeverity returns severity based on HTTP status code
func getHTTPSeverity(statusCode int) string {
	if statusCode == 500 || statusCode == 502 {
		return "critical"
	}
	if statusCode >= 500 {
		return "high"
	}
	return "medium"
}

