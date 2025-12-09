// Copyright 2025 KubeGraf Contributors
// SPDX-License-Identifier: Apache-2.0

package main

import (
	"encoding/json"
	"net/http"
	"time"
)

// Incident represents a detected issue from Kubernetes resources
type KubernetesIncident struct {
	ID          string    `json:"id"`
	Type        string    `json:"type"`        // oom, crashloop, node_pressure, job_failure, etc.
	Severity    string    `json:"severity"`    // warning, critical
	ResourceKind string  `json:"resourceKind"` // Pod, Job, CronJob, Node
	ResourceName string  `json:"resourceName"`
	Namespace   string   `json:"namespace"`
	FirstSeen   time.Time `json:"firstSeen"`
	LastSeen    time.Time `json:"lastSeen"`
	Count       int       `json:"count"`
	Message     string    `json:"message,omitempty"`
}

// handleIncidents scans Kubernetes resources for incidents
func (ws *WebServer) handleIncidents(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	w.Header().Set("Content-Type", "application/json")

	if ws.app.clientset == nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"incidents": []KubernetesIncident{},
			"total":     0,
		})
		return
	}

	// Parse query parameters
	namespace := r.URL.Query().Get("namespace")
	typeFilter := r.URL.Query().Get("type")
	severityFilter := r.URL.Query().Get("severity")

	// Use the unified incident scanner
	scanner := NewIncidentScanner(ws.app)
	incidents := scanner.ScanAllIncidents(namespace)

	// Apply filters
	filtered := []KubernetesIncident{}
	for _, inc := range incidents {
		if typeFilter != "" && inc.Type != typeFilter {
			continue
		}
		if severityFilter != "" && inc.Severity != severityFilter {
			continue
		}
		filtered = append(filtered, inc)
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"incidents": filtered,
		"total":     len(filtered),
	})
}

// Legacy methods kept for backward compatibility - now delegate to IncidentScanner
// These are deprecated and will be removed in a future version

