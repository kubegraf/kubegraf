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
	"time"
)

// handleGroupedEvents returns events grouped by time periods
func (ws *WebServer) handleGroupedEvents(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	w.Header().Set("Content-Type", "application/json")

	if ws.app.eventMonitor == nil {
		log.Printf("[EventMonitor] EventMonitor is nil for grouped events")
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
	
	log.Printf("[EventMonitor] Grouping %d events by period %s", len(events), period.String())

	// Group by time
	groups := GroupEventsByTime(events, period)

	// Convert to response format
	responseGroups := make([]map[string]interface{}, 0, len(groups))
	for timeKey, groupEvents := range groups {
		responseGroups = append(responseGroups, map[string]interface{}{
			"time":   timeKey,
			"events": groupEvents,
			"count":  len(groupEvents),
		})
	}

	log.Printf("[EventMonitor] Returning %d time groups", len(responseGroups))

	json.NewEncoder(w).Encode(map[string]interface{}{
		"groups": responseGroups,
		"period": period.String(),
	})
}

