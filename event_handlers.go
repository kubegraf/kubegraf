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
	"log"
	"net/http"
	"time"
)

// RegisterEventHandlers registers event monitoring API handlers
func (ws *WebServer) RegisterEventHandlers() {
	// Ensure event monitor is initialized and started
	if ws.app.eventMonitor == nil {
		log.Printf("[EventMonitor] Initializing EventMonitor")
		ws.app.eventMonitor = NewEventMonitor(ws.app)
	}
	
	// Initialize event storage if database is available and not already set
	if ws.db != nil && ws.app.eventMonitor != nil {
		ws.app.eventMonitor.mu.RLock()
		hasStorage := ws.app.eventMonitor.eventStorage != nil
		ws.app.eventMonitor.mu.RUnlock()
		
		if !hasStorage {
			eventStorage := NewEventStorage(ws.db)
			ws.app.eventMonitor.SetEventStorage(eventStorage)
			log.Printf("[EventMonitor] Event storage initialized with database")
			
			// Start cleanup routine for old events (keep last 7 days)
			go func() {
				ticker := time.NewTicker(1 * time.Hour)
				defer ticker.Stop()
				for {
					select {
					case <-ticker.C:
						if eventStorage != nil {
							eventStorage.CleanupOldEvents(7 * 24 * time.Hour)
						}
					case <-ws.app.ctx.Done():
						return
					}
				}
			}()
		}
	}
	
	// Start event monitor if not already started
	if !ws.eventMonitorStarted {
		log.Printf("[EventMonitor] Starting EventMonitor")
		ws.app.eventMonitor.RegisterCallback(ws.broadcastMonitoredEvent)
		ws.app.eventMonitor.Start(ws.app.ctx)
		ws.eventMonitorStarted = true
		
		// Also fetch initial events from Kubernetes
		go ws.app.eventMonitor.fetchInitialEvents(ws.app.ctx)
	}

	// Event monitoring endpoints
	http.HandleFunc("/api/events/monitored", ws.handleMonitoredEvents)
	http.HandleFunc("/api/events/log-errors", ws.handleLogErrors)
	http.HandleFunc("/api/events/stats", ws.handleEventStats)
	http.HandleFunc("/api/events/grouped", ws.handleGroupedEvents)
	http.HandleFunc("/api/events/clustered", ws.handleClusteredEvents)
	http.HandleFunc("/api/events/http-errors-grouped", ws.handleHTTPErrorsGrouped)
}

