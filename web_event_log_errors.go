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

// handleLogErrors returns log errors with filtering
func (ws *WebServer) handleLogErrors(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	w.Header().Set("Content-Type", "application/json")

	if ws.app.eventMonitor == nil {
		log.Printf("[EventMonitor] EventMonitor is nil for log errors")
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

	// Check if we should use database (critical-only mode by default)
	criticalOnly := r.URL.Query().Get("critical_only") != "false" // Default to true
	
	var errors []LogError
	
	// Try to query database directly if available
	if ws.db != nil {
		query := `SELECT id, timestamp, pod, namespace, container, status_code, method, path, message, error_type
			FROM log_errors WHERE 1=1`
		queryArgs := []interface{}{}
		
		if criticalOnly {
			query += " AND (status_code IN (500, 502, 503) OR method = 'POST')"
		}
		
		if filter.Namespace != "" {
			query += " AND namespace = ?"
			queryArgs = append(queryArgs, filter.Namespace)
		}
		
		if !filter.Since.IsZero() {
			query += " AND timestamp >= ?"
			queryArgs = append(queryArgs, filter.Since)
		}
		
		query += " ORDER BY timestamp DESC"
		if filter.Limit > 0 {
			query += " LIMIT ?"
			queryArgs = append(queryArgs, filter.Limit)
		} else {
			query += " LIMIT 500"
		}
		
		rows, dbErr := ws.db.GetDB().Query(query, queryArgs...)
		if dbErr == nil {
			defer rows.Close()
			for rows.Next() {
				var logError LogError
				var id int
				if rows.Scan(&id, &logError.Timestamp, &logError.Pod, &logError.Namespace, 
					&logError.Container, &logError.StatusCode, &logError.Method, 
					&logError.Path, &logError.Message, &logError.ErrorType) == nil {
					errors = append(errors, logError)
				}
			}
			log.Printf("[EventMonitor] Found %d log errors from database (criticalOnly=%v)", len(errors), criticalOnly)
		} else {
			log.Printf("[EventMonitor] Error querying database: %v, falling back to memory", dbErr)
			// Fallback to memory
			if ws.app.eventMonitor != nil {
				errors = ws.app.eventMonitor.GetLogErrorsSimple()
				// Filter for critical errors if needed
				if criticalOnly {
					filteredErrors := []LogError{}
					for _, e := range errors {
						if e.StatusCode == 500 || e.StatusCode == 502 || e.StatusCode == 503 || e.Method == "POST" {
							if filter.MatchesLogError(e) {
								filteredErrors = append(filteredErrors, e)
							}
						}
					}
					errors = filteredErrors
				} else {
					// Apply filter manually
					filteredErrors := []LogError{}
					for _, e := range errors {
						if filter.MatchesLogError(e) {
							filteredErrors = append(filteredErrors, e)
						}
					}
					errors = filteredErrors
				}
			}
		}
	} else {
		// Use memory-based storage
		if ws.app.eventMonitor != nil {
			errors = ws.app.eventMonitor.GetLogErrorsSimple()
			
			// Filter for critical errors if needed
			if criticalOnly {
				filteredErrors := []LogError{}
				for _, e := range errors {
					if e.StatusCode == 500 || e.StatusCode == 502 || e.StatusCode == 503 || e.Method == "POST" {
						if filter.MatchesLogError(e) {
							filteredErrors = append(filteredErrors, e)
						}
					}
				}
				errors = filteredErrors
			} else {
				// Apply filter manually
				filteredErrors := []LogError{}
				for _, e := range errors {
					if filter.MatchesLogError(e) {
						filteredErrors = append(filteredErrors, e)
					}
				}
				errors = filteredErrors
			}
		}
	}
	
	log.Printf("[EventMonitor] Returning %d log errors (critical_only=%v, namespace=%s)", 
		len(errors), criticalOnly, filter.Namespace)

	// Apply limit if specified
	if filter.Limit > 0 && len(errors) > filter.Limit {
		errors = errors[len(errors)-filter.Limit:]
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"errors": errors,
		"total":  len(errors),
	})
}

