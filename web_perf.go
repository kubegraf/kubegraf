// Copyright 2025 KubeGraf Contributors
// SPDX-License-Identifier: Apache-2.0

package main

import (
	"encoding/json"
	"log"
	"net/http"
	"os"
	"strconv"
	"time"

	"github.com/kubegraf/kubegraf/pkg/instrumentation"
)

// handlePerfSummary handles GET /api/v2/perf/summary
func (ws *WebServer) handlePerfSummary(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Check if performance instrumentation is enabled
	if ws.perfStore == nil {
		http.Error(w, "Performance instrumentation not enabled", http.StatusServiceUnavailable)
		return
	}

	// Get window from query param (default 15 minutes)
	windowMinutes := 15
	if windowStr := r.URL.Query().Get("window"); windowStr != "" {
		if w, err := strconv.Atoi(windowStr); err == nil && w > 0 && w <= 1440 {
			windowMinutes = w
		}
	}

	window := time.Duration(windowMinutes) * time.Minute

	// Get all summaries
	summaries := ws.perfStore.GetAllSummaries(window)

	// Filter to only incident routes if requested
	routeFilter := r.URL.Query().Get("route")
	if routeFilter != "" {
		filtered := make([]*instrumentation.PerformanceSummary, 0)
		for _, s := range summaries {
			if s.Route == routeFilter {
				filtered = append(filtered, s)
			}
		}
		summaries = filtered
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"summaries": summaries,
		"window":    windowMinutes,
	})
}

// handlePerfRecent handles GET /api/v2/perf/recent
func (ws *WebServer) handlePerfRecent(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	if ws.perfStore == nil {
		http.Error(w, "Performance instrumentation not enabled", http.StatusServiceUnavailable)
		return
	}

	// Get count from query param (default 200)
	count := 200
	if countStr := r.URL.Query().Get("count"); countStr != "" {
		if c, err := strconv.Atoi(countStr); err == nil && c > 0 && c <= 1000 {
			count = c
		}
	}

	spans := ws.perfStore.GetRecent(count)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"spans": spans,
		"count": len(spans),
	})
}

// handlePerfClear handles POST /api/v2/perf/clear (dev-only)
func (ws *WebServer) handlePerfClear(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Only allow in dev mode or with explicit flag
	if os.Getenv("KUBEGRAF_DEV_MODE") != "true" {
		// Check for confirmation in body
		var req struct {
			Confirm bool `json:"confirm"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil || !req.Confirm {
			http.Error(w, "Confirmation required", http.StatusBadRequest)
			return
		}
	}

	if ws.perfStore == nil {
		http.Error(w, "Performance instrumentation not enabled", http.StatusServiceUnavailable)
		return
	}

	ws.perfStore.Clear()

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": "Performance data cleared",
	})
}

// handlePerfUI handles POST /api/v2/perf/ui (local only, for UI timings)
func (ws *WebServer) handlePerfUI(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		Page       string  `json:"page"`
		Action     string  `json:"action"`
		Ms         float64 `json:"ms"`
		IncidentID string  `json:"incidentId,omitempty"`
		RequestID  string  `json:"requestId,omitempty"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Log UI performance (local only, not stored in performance store)
	// This is for debugging/development
	log.Printf("[Perf-UI] %s.%s: %.2fms (incident=%s, request_id=%s)",
		req.Page, req.Action, req.Ms, req.IncidentID, req.RequestID)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
	})
}

