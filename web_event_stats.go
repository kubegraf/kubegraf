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
)

// handleEventStats returns event statistics
func (ws *WebServer) handleEventStats(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	w.Header().Set("Content-Type", "application/json")

	if ws.app.eventMonitor == nil {
		log.Printf("[EventMonitor] EventMonitor is nil for stats")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"by_severity":  map[string]int{},
			"by_type":      map[string]int{},
			"by_category":  map[string]int{},
			"total_events": 0,
			"total_errors": 0,
		})
		return
	}

	// Try to use database stats if available
	if ws.db != nil && ws.app.eventMonitor != nil && ws.app.eventMonitor.eventStorage != nil {
		stats, err := ws.app.eventMonitor.eventStorage.GetEventStats()
		if err == nil {
			// Get events for additional stats
			events := ws.app.eventMonitor.GetEvents(FilterOptions{})
			byType := make(map[string]int)
			byCategory := make(map[string]int)
			
			for _, event := range events {
				byType[event.Type]++
				byCategory[event.Category]++
			}
			
			stats["by_type"] = byType
			stats["by_category"] = byCategory
			
			json.NewEncoder(w).Encode(stats)
			return
		}
		log.Printf("[EventStats] Error getting stats from database: %v, falling back to memory", err)
	}

	// Fallback to memory-based calculation
	events := ws.app.eventMonitor.GetEvents(FilterOptions{})
	logErrors := ws.app.eventMonitor.GetLogErrorsSimple()
	
	// Filter log errors for critical only (500, 502, 503, POST)
	criticalErrors := []LogError{}
	for _, err := range logErrors {
		if err.StatusCode == 500 || err.StatusCode == 502 || err.StatusCode == 503 || err.Method == "POST" {
			criticalErrors = append(criticalErrors, err)
		}
	}

	log.Printf("[EventStats] Calculating stats: %d events, %d critical log errors", len(events), len(criticalErrors))

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
		"total_errors": len(criticalErrors),
	})
}

