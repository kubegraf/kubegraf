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

	"github.com/kubegraf/kubegraf/internal/history"
)

// TimelineEvent represents an event suitable for timeline replay
type TimelineEvent struct {
	Timestamp    time.Time              `json:"timestamp"`
	Type         string                 `json:"type"`     // "k8s_event", "pod_status_change", "deployment_rollout", "node_condition_change", "metrics_spike"
	Severity     string                 `json:"severity"` // "info", "warning", "error"
	ResourceKind string                 `json:"resourceKind"`
	ResourceName string                 `json:"resourceName"`
	Namespace    string                 `json:"namespace,omitempty"`
	EventType    string                 `json:"eventType,omitempty"` // Reason/ChangeType
	Message      string                 `json:"message,omitempty"`
	Metadata     map[string]interface{} `json:"metadata,omitempty"`
}

// HistoryEventsResponse is the API response for history events
type HistoryEventsResponse struct {
	Events     []TimelineEvent `json:"events"`
	Total      int             `json:"total"`
	Since      time.Time       `json:"since"`
	Until      time.Time       `json:"until"`
	IncidentID string          `json:"incidentId,omitempty"`
}

// handleHistoryEvents handles GET /api/history/events
// Query parameters:
//   - incident_id: Filter events related to a specific incident (optional)
//   - since: Start time in RFC3339 format (optional, defaults to 1 hour ago)
//   - until: End time in RFC3339 format (optional, defaults to now)
func (ws *WebServer) handleHistoryEvents(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	w.Header().Set("Content-Type", "application/json")

	if ws.app.clientset == nil || !ws.app.connected {
		http.Error(w, "Cluster not connected", http.StatusServiceUnavailable)
		return
	}

	// Parse query parameters
	incidentID := r.URL.Query().Get("incident_id")
	sinceStr := r.URL.Query().Get("since")
	untilStr := r.URL.Query().Get("until")

	// Default time window: last 30 minutes (reduced for faster queries)
	now := time.Now()
	since := now.Add(-30 * time.Minute)
	until := now

	var err error
	if sinceStr != "" {
		since, err = time.Parse(time.RFC3339, sinceStr)
		if err != nil {
			http.Error(w, fmt.Sprintf("Invalid 'since' parameter: %v", err), http.StatusBadRequest)
			return
		}
	}

	if untilStr != "" {
		until, err = time.Parse(time.RFC3339, untilStr)
		if err != nil {
			http.Error(w, fmt.Sprintf("Invalid 'until' parameter: %v", err), http.StatusBadRequest)
			return
		}
	}

	// Create history service
	dataSource := history.NewKubernetesDataSource(ws.app.clientset)
	historyService := history.NewHistoryQueryService(dataSource)

	// Query history with timeout context (45 seconds max)
	queryCtx, cancel := context.WithTimeout(r.Context(), 45*time.Second)
	defer cancel()

	window := history.TimeWindow{
		Since: since,
		Until: until,
	}

	result, err := historyService.QueryHistory(queryCtx, window)
	if err != nil {
		// Check if it's a timeout
		if queryCtx.Err() == context.DeadlineExceeded {
			http.Error(w, "Query timeout: History query took too long. Try a shorter time range.", http.StatusRequestTimeout)
		} else {
			http.Error(w, fmt.Sprintf("Failed to query history: %v", err), http.StatusInternalServerError)
		}
		return
	}

	// Convert to timeline events
	timelineEvents := ws.convertToTimelineEvents(result, incidentID)

	// Sort by timestamp (oldest first for replay)
	ws.sortTimelineEventsByTimestamp(timelineEvents)

	response := HistoryEventsResponse{
		Events:     timelineEvents,
		Total:      len(timelineEvents),
		Since:      since,
		Until:      until,
		IncidentID: incidentID,
	}

	json.NewEncoder(w).Encode(response)
}

// convertToTimelineEvents converts history query result to timeline events
func (ws *WebServer) convertToTimelineEvents(result *history.HistoryQueryResult, incidentID string) []TimelineEvent {
	var timelineEvents []TimelineEvent

	// Filter by incident if provided
	if incidentID != "" {
		// Get incident details from SRE agent
		if ws.app.sreAgent != nil {
			ws.app.sreAgent.mu.RLock()
			incident, exists := ws.app.sreAgent.incidents[incidentID]
			ws.app.sreAgent.mu.RUnlock()

			if exists {
				// Filter events related to this incident
				timelineEvents = ws.filterEventsForIncident(result, incident)
				return timelineEvents
			}
		}
	}

	// Convert all change events to timeline events
	for _, changeEvent := range result.ChangeEvents {
		timelineEvent := TimelineEvent{
			Timestamp:    changeEvent.Timestamp,
			Type:         ws.mapChangeEventType(changeEvent.Type),
			Severity:     changeEvent.Severity,
			ResourceKind: changeEvent.ResourceKind,
			ResourceName: changeEvent.ResourceName,
			Namespace:    changeEvent.Namespace,
			EventType:    changeEvent.ChangeType,
			Message:      changeEvent.Message,
			Metadata:     changeEvent.Metadata,
		}
		timelineEvents = append(timelineEvents, timelineEvent)
	}

	// Add pod status changes
	podStatusChanges := ws.fetchPodStatusChanges(result)
	timelineEvents = append(timelineEvents, podStatusChanges...)

	return timelineEvents
}

// mapChangeEventType maps internal change event types to timeline event types
func (ws *WebServer) mapChangeEventType(changeType string) string {
	switch changeType {
	case "event":
		return "k8s_event"
	case "deployment":
		return "deployment_rollout"
	case "node":
		return "node_condition_change"
	default:
		return "k8s_event"
	}
}

// fetchPodStatusChanges extracts pod status changes from history result
func (ws *WebServer) fetchPodStatusChanges(result *history.HistoryQueryResult) []TimelineEvent {
	var podEvents []TimelineEvent

	// Extract pod-related events
	for _, changeEvent := range result.ChangeEvents {
		if changeEvent.ResourceKind == "Pod" && changeEvent.Type == "event" {
			podEvent := TimelineEvent{
				Timestamp:    changeEvent.Timestamp,
				Type:         "pod_status_change",
				Severity:     changeEvent.Severity,
				ResourceKind: "Pod",
				ResourceName: changeEvent.ResourceName,
				Namespace:    changeEvent.Namespace,
				EventType:    changeEvent.ChangeType,
				Message:      changeEvent.Message,
				Metadata:     changeEvent.Metadata,
			}
			podEvents = append(podEvents, podEvent)
		}
	}

	return podEvents
}

// filterEventsForIncident filters events related to a specific incident
func (ws *WebServer) filterEventsForIncident(result *history.HistoryQueryResult, incident *Incident) []TimelineEvent {
	var filteredEvents []TimelineEvent

	// Get incident resource details
	incidentNamespace := incident.Namespace
	incidentResource := incident.Resource

	// Filter change events that match the incident
	for _, changeEvent := range result.ChangeEvents {
		// Match by namespace and resource
		if changeEvent.Namespace == incidentNamespace {
			if changeEvent.ResourceName == incidentResource ||
				ws.resourceMatches(changeEvent.ResourceName, incidentResource) {
				timelineEvent := TimelineEvent{
					Timestamp:    changeEvent.Timestamp,
					Type:         ws.mapChangeEventType(changeEvent.Type),
					Severity:     changeEvent.Severity,
					ResourceKind: changeEvent.ResourceKind,
					ResourceName: changeEvent.ResourceName,
					Namespace:    changeEvent.Namespace,
					EventType:    changeEvent.ChangeType,
					Message:      changeEvent.Message,
					Metadata:     changeEvent.Metadata,
				}
				filteredEvents = append(filteredEvents, timelineEvent)
			}
		}
	}

	// Include pod status changes related to the incident
	if incidentResource != "" {
		podStatusChanges := ws.fetchPodStatusChanges(result)
		for _, podEvent := range podStatusChanges {
			if podEvent.Namespace == incidentNamespace &&
				ws.resourceMatches(podEvent.ResourceName, incidentResource) {
				filteredEvents = append(filteredEvents, podEvent)
			}
		}
	}

	return filteredEvents
}

// resourceMatches checks if a resource name matches an incident resource
// Handles pod names that may include deployment prefixes
func (ws *WebServer) resourceMatches(resourceName, incidentResource string) bool {
	if resourceName == incidentResource {
		return true
	}
	// Handle pod names that start with deployment name (e.g., "myapp-abc123" matches "myapp")
	if len(resourceName) > len(incidentResource) &&
		resourceName[:len(incidentResource)] == incidentResource {
		return true
	}
	return false
}

// sortTimelineEventsByTimestamp sorts events by timestamp (oldest first)
func (ws *WebServer) sortTimelineEventsByTimestamp(events []TimelineEvent) {
	for i := 0; i < len(events); i++ {
		for j := i + 1; j < len(events); j++ {
			if events[i].Timestamp.After(events[j].Timestamp) {
				events[i], events[j] = events[j], events[i]
			}
		}
	}
}

// RegisterHistoryHandlers registers history/timeline replay API handlers
func (ws *WebServer) RegisterHistoryHandlers() {
	http.HandleFunc("/api/history/events", ws.handleHistoryEvents)
}
