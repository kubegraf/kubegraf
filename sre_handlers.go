// Copyright 2025 KubeGraf Contributors
// SPDX-License-Identifier: Apache-2.0

package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

// SREAgent handlers

// handleSREAgentStatus returns the SRE agent status
func (ws *WebServer) handleSREAgentStatus(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if ws.app.sreAgent == nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"enabled": false,
			"message": "SRE Agent not initialized",
		})
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"enabled":               ws.app.sreAgent.config.Enabled,
		"autoRemediate":         ws.app.sreAgent.config.AutoRemediate,
		"autoRemediateTypes":    ws.app.sreAgent.config.AutoRemediateTypes,
		"notificationEnabled":   ws.app.sreAgent.config.NotificationEnabled,
		"batchMonitoring":       ws.app.sreAgent.config.BatchMonitoring,
		"batchSLO":              ws.app.sreAgent.config.BatchSLO.String(),
		"maxAutoActionsPerHour": ws.app.sreAgent.config.MaxAutoActionsPerHour,
		"learningEnabled":       ws.app.sreAgent.config.LearningEnabled,
		"metrics":               ws.app.sreAgent.metrics,
	})
}

// handleSREAgentIncidents returns all incidents
func (ws *WebServer) handleSREAgentIncidents(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	w.Header().Set("Content-Type", "application/json")

	// Parse query parameters
	status := r.URL.Query().Get("status")
	severity := r.URL.Query().Get("severity")
	limit := 50 // Default limit

	incidents := make([]*Incident, 0)

	// Get incidents from SRE Agent storage
	if ws.app.sreAgent != nil {
		ws.app.sreAgent.mu.RLock()
		for _, incident := range ws.app.sreAgent.incidents {
			incidents = append(incidents, incident)
		}
		ws.app.sreAgent.mu.RUnlock()
	}

	// Also scan for current incidents from Kubernetes resources
	if ws.app.clientset != nil && ws.app.connected {
		scanner := NewIncidentScanner(ws.app)
		k8sIncidents := scanner.ScanAllIncidents("")
		
		// Convert Kubernetes incidents to SRE incidents
		existingIDs := make(map[string]bool)
		for _, inc := range incidents {
			existingIDs[inc.ID] = true
		}

		for _, k8sIncident := range k8sIncidents {
			incidentID := fmt.Sprintf("k8s-%s", k8sIncident.ID)
			if !existingIDs[incidentID] {
				sreIncident := scanner.ConvertKubernetesIncidentToSREIncident(k8sIncident)
				incidents = append(incidents, sreIncident)
			}
		}
	}

	// Filter incidents
	filtered := make([]*Incident, 0)
	for _, incident := range incidents {
		if status != "" && incident.Status != status {
			continue
		}
		if severity != "" && incident.Severity != severity {
			continue
		}
		filtered = append(filtered, incident)
	}

	// Apply limit
	if len(filtered) > limit {
		filtered = filtered[len(filtered)-limit:]
	}

	// Convert to slice (not pointers) for JSON marshaling
	incidentList := make([]Incident, len(filtered))
	for i, inc := range filtered {
		incidentList[i] = *inc
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"incidents": incidentList,
		"total":     len(incidentList),
	})
}

// handleSREAgentIncident returns a specific incident
func (ws *WebServer) handleSREAgentIncident(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	w.Header().Set("Content-Type", "application/json")

	incidentID := r.URL.Query().Get("id")
	if incidentID == "" {
		http.Error(w, "incident ID required", http.StatusBadRequest)
		return
	}

	if ws.app.sreAgent == nil {
		http.Error(w, "SRE Agent not initialized", http.StatusServiceUnavailable)
		return
	}

	ws.app.sreAgent.mu.RLock()
	incident, exists := ws.app.sreAgent.incidents[incidentID]
	ws.app.sreAgent.mu.RUnlock()

	if !exists {
		http.Error(w, "incident not found", http.StatusNotFound)
		return
	}

	json.NewEncoder(w).Encode(incident)
}

// handleSREAgentActions returns action history
func (ws *WebServer) handleSREAgentActions(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	w.Header().Set("Content-Type", "application/json")

	if ws.app.sreAgent == nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"actions": []map[string]interface{}{},
			"total":   0,
		})
		return
	}

	// Collect all actions from all incidents (both stored and real-time scanned)
	allActions := make([]map[string]interface{}, 0)
	incidents := make([]*Incident, 0)
	
	// Get incidents from SRE Agent storage
	if ws.app.sreAgent != nil {
		ws.app.sreAgent.mu.RLock()
		for _, incident := range ws.app.sreAgent.incidents {
			incidents = append(incidents, incident)
		}
		ws.app.sreAgent.mu.RUnlock()
	}
	
	// Also get incidents from real-time scanning (same as incidents endpoint)
	if ws.app.clientset != nil && ws.app.connected {
		scanner := NewIncidentScanner(ws.app)
		k8sIncidents := scanner.ScanAllIncidents("")
		
		// Convert Kubernetes incidents to SRE incidents
		existingIDs := make(map[string]bool)
		for _, inc := range incidents {
			existingIDs[inc.ID] = true
		}
		
		for _, k8sIncident := range k8sIncidents {
			incidentID := fmt.Sprintf("k8s-%s", k8sIncident.ID)
			if !existingIDs[incidentID] {
				sreIncident := scanner.ConvertKubernetesIncidentToSREIncident(k8sIncident)
				incidents = append(incidents, sreIncident)
			}
		}
	}
	
	// Collect actions from all incidents
	for _, incident := range incidents {
		// Check if incident has actions
		if len(incident.Actions) == 0 {
			continue
		}
		
		for _, action := range incident.Actions {
			// Use CompletedAt if available, otherwise use StartedAt
			timestamp := action.StartedAt
			if action.CompletedAt != nil {
				timestamp = *action.CompletedAt
			}
			
			// Determine details - use Result if available, otherwise use Description
			details := action.Result
			if details == "" {
				details = action.Description
			}
			if action.Error != "" {
				details = action.Error
			}
			
			actionData := map[string]interface{}{
				"id":        action.ID,
				"incidentID": incident.ID,
				"action":    action.Description,
				"timestamp": timestamp.Format(time.RFC3339),
				"success":   action.Status == "completed" && action.Error == "",
				"details":   details,
				"automated": action.Type == "remediate" || action.Type == "analyze",
			}
			
			allActions = append(allActions, actionData)
		}
	}

	// Sort by timestamp (most recent first)
	// Simple sort by timestamp string (RFC3339 is sortable)
	for i := 0; i < len(allActions); i++ {
		for j := i + 1; j < len(allActions); j++ {
			if allActions[i]["timestamp"].(string) < allActions[j]["timestamp"].(string) {
				allActions[i], allActions[j] = allActions[j], allActions[i]
			}
		}
	}

	// Limit to most recent 100 actions
	if len(allActions) > 100 {
		allActions = allActions[:100]
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"actions": allActions,
		"total":   len(allActions),
	})
}

// handleSREAgentConfig updates SRE agent configuration
func (ws *WebServer) handleSREAgentConfig(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	if ws.app.sreAgent == nil {
		http.Error(w, "SRE Agent not initialized", http.StatusServiceUnavailable)
		return
	}

	var config SREAgentConfig
	if err := json.NewDecoder(r.Body).Decode(&config); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Update configuration
	ws.app.sreAgent.mu.Lock()
	ws.app.sreAgent.config = &config
	ws.app.sreAgent.mu.Unlock()

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": "SRE Agent configuration updated",
	})
}

// handleSREAgentEnable enables or disables the SRE agent
func (ws *WebServer) handleSREAgentEnable(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	if ws.app.sreAgent == nil {
		http.Error(w, "SRE Agent not initialized", http.StatusServiceUnavailable)
		return
	}

	var request struct {
		Enabled bool `json:"enabled"`
	}
	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	ws.app.sreAgent.mu.Lock()
	ws.app.sreAgent.config.Enabled = request.Enabled
	ws.app.sreAgent.mu.Unlock()

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": "SRE Agent " + map[bool]string{true: "enabled", false: "disabled"}[request.Enabled],
	})
}

// handleSREAgentRemediate manually triggers remediation for an incident
func (ws *WebServer) handleSREAgentRemediate(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	if ws.app.sreAgent == nil {
		http.Error(w, "SRE Agent not initialized", http.StatusServiceUnavailable)
		return
	}

	var request struct {
		IncidentID string `json:"incidentId"`
	}
	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	ws.app.sreAgent.mu.RLock()
	incident, exists := ws.app.sreAgent.incidents[request.IncidentID]
	ws.app.sreAgent.mu.RUnlock()

	if !exists {
		http.Error(w, "incident not found", http.StatusNotFound)
		return
	}

	// Trigger remediation
	go ws.app.sreAgent.remediateIncident(incident)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": "Remediation triggered for incident " + request.IncidentID,
	})
}

// handleSREAgentEscalate manually escalates an incident
func (ws *WebServer) handleSREAgentEscalate(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	if ws.app.sreAgent == nil {
		http.Error(w, "SRE Agent not initialized", http.StatusServiceUnavailable)
		return
	}

	var request struct {
		IncidentID string `json:"incidentId"`
	}
	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	ws.app.sreAgent.mu.RLock()
	incident, exists := ws.app.sreAgent.incidents[request.IncidentID]
	ws.app.sreAgent.mu.RUnlock()

	if !exists {
		http.Error(w, "incident not found", http.StatusNotFound)
		return
	}

	// Trigger escalation
	ws.app.sreAgent.escalateIncident(incident)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": "Incident " + request.IncidentID + " escalated to human SRE",
	})
}

// handleSREAgentBatchJobs returns monitored batch jobs
func (ws *WebServer) handleSREAgentBatchJobs(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	w.Header().Set("Content-Type", "application/json")

	// This would return batch job monitoring data
	// For now, return placeholder
	json.NewEncoder(w).Encode(map[string]interface{}{
		"batchJobs": []BatchJob{},
		"total":     0,
		"slo":       "5m",
		"violations": map[string]int{
			"today":    0,
			"thisWeek": 0,
			"total":    0,
		},
	})
}

// handleSREAgentMetrics returns detailed metrics
func (ws *WebServer) handleSREAgentMetrics(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	w.Header().Set("Content-Type", "application/json")

	if ws.app.sreAgent == nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"metrics": map[string]interface{}{
				"incidentsDetected":   0,
				"incidentsResolved":   0,
				"autoRemediations":    0,
				"notificationsSent":   0,
				"escalations":         0,
				"batchSLOMet":         0,
				"batchSLOViolated":    0,
				"successRate":         0.0,
				"avgResolutionTime":   "0s",
				"actionsThisHour":     0,
			},
		})
		return
	}

	ws.app.sreAgent.metrics.mu.RLock()
	metrics := ws.app.sreAgent.metrics
	ws.app.sreAgent.metrics.mu.RUnlock()

	// Calculate success rate
	successRate := 0.0
	if metrics.IncidentsResolved > 0 {
		successRate = float64(metrics.AutoRemediations) / float64(metrics.IncidentsResolved) * 100
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"metrics": map[string]interface{}{
			"incidentsDetected":   metrics.IncidentsDetected,
			"incidentsResolved":   metrics.IncidentsResolved,
			"autoRemediations":    metrics.AutoRemediations,
			"notificationsSent":   metrics.NotificationsSent,
			"escalations":         metrics.Escalations,
			"batchSLOMet":         metrics.BatchSLOMet,
			"batchSLOViolated":    metrics.BatchSLOViolated,
			"successRate":         successRate,
			"avgResolutionTime":   metrics.AvgResolutionTime.String(),
			"actionsThisHour":     metrics.ActionsThisHour,
			"lastHourReset":       metrics.LastHourReset.Format(time.RFC3339),
		},
	})
}

// RegisterSREAgentHandlers registers SRE agent API handlers
func (ws *WebServer) RegisterSREAgentHandlers() {
	// SRE Agent endpoints
	http.HandleFunc("/api/sre/status", ws.handleSREAgentStatus)
	http.HandleFunc("/api/sre/incidents", ws.handleSREAgentIncidents)
	http.HandleFunc("/api/sre/incident", ws.handleSREAgentIncident)
	http.HandleFunc("/api/sre/actions", ws.handleSREAgentActions)
	http.HandleFunc("/api/sre/config", ws.handleSREAgentConfig)
	http.HandleFunc("/api/sre/enable", ws.handleSREAgentEnable)
	http.HandleFunc("/api/sre/remediate", ws.handleSREAgentRemediate)
	http.HandleFunc("/api/sre/escalate", ws.handleSREAgentEscalate)
	http.HandleFunc("/api/sre/batch-jobs", ws.handleSREAgentBatchJobs)
	http.HandleFunc("/api/sre/metrics", ws.handleSREAgentMetrics)
}
