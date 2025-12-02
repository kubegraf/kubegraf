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
	"strconv"
	"time"
)

// RegisterEventHandlers registers event monitoring API handlers
func (ws *WebServer) RegisterEventHandlers() {
	// Start event monitor if not already started
	if ws.app.eventMonitor != nil && !ws.eventMonitorStarted {
		ws.app.eventMonitor.RegisterCallback(ws.broadcastMonitoredEvent)
		ws.app.eventMonitor.Start(ws.app.ctx)
		ws.eventMonitorStarted = true
	}

	// Event monitoring endpoints
	http.HandleFunc("/api/events/monitored", ws.handleMonitoredEvents)
	http.HandleFunc("/api/events/log-errors", ws.handleLogErrors)
	http.HandleFunc("/api/events/stats", ws.handleEventStats)
	http.HandleFunc("/api/events/grouped", ws.handleGroupedEvents)
	http.HandleFunc("/api/events/clustered", ws.handleClusteredEvents)
	http.HandleFunc("/api/events/http-errors-grouped", ws.handleHTTPErrorsGrouped)
}

// handleMonitoredEvents returns monitored events with filtering
func (ws *WebServer) handleMonitoredEvents(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	w.Header().Set("Content-Type", "application/json")

	if ws.app.eventMonitor == nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"events": []MonitoredEvent{},
			"total":  0,
		})
		return
	}

	// Parse query parameters
	filter := FilterOptions{
		Type:      r.URL.Query().Get("type"),
		Category:  r.URL.Query().Get("category"),
		Severity:  r.URL.Query().Get("severity"),
		Namespace: r.URL.Query().Get("namespace"),
	}

	// Parse since parameter
	if sinceStr := r.URL.Query().Get("since"); sinceStr != "" {
		if since, err := time.Parse(time.RFC3339, sinceStr); err == nil {
			filter.Since = since
		}
	}

	// Parse limit
	if limitStr := r.URL.Query().Get("limit"); limitStr != "" {
		if limit, err := strconv.Atoi(limitStr); err == nil && limit > 0 {
			filter.Limit = limit
		}
	}

	// Get events
	events := ws.app.eventMonitor.GetEvents(filter)

	// Apply limit if specified
	if filter.Limit > 0 && len(events) > filter.Limit {
		events = events[len(events)-filter.Limit:]
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"events": events,
		"total":  len(events),
	})
}

// handleLogErrors returns log errors with filtering
func (ws *WebServer) handleLogErrors(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	w.Header().Set("Content-Type", "application/json")

	if ws.app.eventMonitor == nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"errors": []LogError{},
			"total":  0,
		})
		return
	}

	// Parse query parameters
	filter := FilterOptions{
		Namespace: r.URL.Query().Get("namespace"),
	}

	// Parse since parameter
	if sinceStr := r.URL.Query().Get("since"); sinceStr != "" {
		if since, err := time.Parse(time.RFC3339, sinceStr); err == nil {
			filter.Since = since
		}
	}

	// Parse limit
	if limitStr := r.URL.Query().Get("limit"); limitStr != "" {
		if limit, err := strconv.Atoi(limitStr); err == nil && limit > 0 {
			filter.Limit = limit
		}
	}

	// Get log errors
	errors := ws.app.eventMonitor.GetLogErrorsSimple()
	// Apply filter manually
	filteredErrors := []LogError{}
	for _, err := range errors {
		if filter.MatchesLogError(err) {
			filteredErrors = append(filteredErrors, err)
		}
	}
	errors = filteredErrors

	// Apply limit if specified
	if filter.Limit > 0 && len(errors) > filter.Limit {
		errors = errors[len(errors)-filter.Limit:]
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"errors": errors,
		"total":  len(errors),
	})
}

// handleEventStats returns event statistics
func (ws *WebServer) handleEventStats(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	w.Header().Set("Content-Type", "application/json")

	if ws.app.eventMonitor == nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"by_severity":  map[string]int{},
			"by_type":      map[string]int{},
			"by_category":  map[string]int{},
			"total_events": 0,
			"total_errors": 0,
		})
		return
	}

	// Get all events (no filter)
	events := ws.app.eventMonitor.GetEvents(FilterOptions{})
	logErrors := ws.app.eventMonitor.GetLogErrorsSimple()

	// Calculate statistics
	bySeverity := make(map[string]int)
	byType := make(map[string]int)
	byCategory := make(map[string]int)

	for _, event := range events {
		bySeverity[string(event.Severity)]++
		byType[event.Type]++
		byCategory[event.Category]++
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"by_severity":  bySeverity,
		"by_type":      byType,
		"by_category":  byCategory,
		"total_events": len(events),
		"total_errors": len(logErrors),
	})
}

// handleGroupedEvents returns events grouped by time periods
func (ws *WebServer) handleGroupedEvents(w http.ResponseWriter, r *http.Request) {
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

	// Parse period parameter (default: 1 hour)
	periodStr := r.URL.Query().Get("period")
	if periodStr == "" {
		periodStr = "1h"
	}

	period, err := time.ParseDuration(periodStr)
	if err != nil {
		period = time.Hour
	}

	// Get all events
	events := ws.app.eventMonitor.GetEvents(FilterOptions{})

	// Group by time
	groups := GroupEventsByTime(events, period)

	// Convert to response format
	responseGroups := make([]map[string]interface{}, 0, len(groups))
	for timeKey, groupEvents := range groups {
		responseGroups = append(responseGroups, map[string]interface{}{
			"time":    timeKey,
			"events": groupEvents,
			"count":  len(groupEvents),
		})
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"groups": responseGroups,
		"period": period.String(),
	})
}

