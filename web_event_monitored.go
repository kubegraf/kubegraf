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
	"log"
	"net/http"
	"strconv"
	"time"
)

// handleMonitoredEvents returns monitored events with filtering
func (ws *WebServer) handleMonitoredEvents(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	w.Header().Set("Content-Type", "application/json")

	if ws.app.eventMonitor == nil {
		log.Printf("[EventMonitor] EventMonitor is nil")
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
	
	log.Printf("[EventMonitor] Returning %d events (filter: type=%s, severity=%s, namespace=%s)", 
		len(events), filter.Type, filter.Severity, filter.Namespace)

	// Apply limit if specified
	if filter.Limit > 0 && len(events) > filter.Limit {
		events = events[len(events)-filter.Limit:]
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"events": events,
		"total":  len(events),
	})
}

