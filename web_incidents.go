// Copyright 2025 KubeGraf Contributors
// SPDX-License-Identifier: Apache-2.0

package main

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

// RelatedEvent represents a Kubernetes event correlated with an incident
type RelatedEvent struct {
	Type      string    `json:"type"`
	Reason    string    `json:"reason"`
	Message   string    `json:"message"`
	Count     int32     `json:"count"`
	FirstSeen time.Time `json:"firstSeen"`
	LastSeen  time.Time `json:"lastSeen"`
	Source    string    `json:"source"`
}

// Incident represents a detected issue from Kubernetes resources
type KubernetesIncident struct {
	ID             string         `json:"id"`
	Type           string         `json:"type"`          // oom, crashloop, node_pressure, job_failure, etc.
	Severity       string         `json:"severity"`      // warning, critical
	ResourceKind   string         `json:"resourceKind"`  // Pod, Job, CronJob, Node
	ResourceName   string         `json:"resourceName"`
	Namespace      string         `json:"namespace"`
	FirstSeen      time.Time      `json:"firstSeen"`
	LastSeen       time.Time      `json:"lastSeen"`
	Count          int            `json:"count"`
	Message        string         `json:"message,omitempty"`
	RelatedEvents  []RelatedEvent `json:"relatedEvents,omitempty"`
	EventSummary   string         `json:"eventSummary,omitempty"`
}

// handleIncidents scans Kubernetes resources for incidents
func (ws *WebServer) handleIncidents(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	w.Header().Set("Content-Type", "application/json")

	// Add timeout context (2 minutes for large clusters)
	ctx, cancel := context.WithTimeout(r.Context(), 120*time.Second)
	defer cancel()

	if ws.app.clientset == nil || !ws.app.connected {
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

	fmt.Printf("[Incidents] Starting scan - namespace: %s, type: %s, severity: %s\n", namespace, typeFilter, severityFilter)

	// Use the unified incident scanner with context
	scanner := NewIncidentScanner(ws.app)

	var incidents []KubernetesIncident
	// Scan with error handling - return empty array on error instead of failing
	func() {
		defer func() {
			if r := recover(); r != nil {
				// Log panic but return empty incidents
				fmt.Printf("Error scanning incidents (panic): %v\n", r)
				incidents = []KubernetesIncident{}
			}
		}()

		// Temporarily set context for scanning
		originalCtx := scanner.app.ctx
		scanner.app.ctx = ctx
		defer func() {
			scanner.app.ctx = originalCtx
		}()

		incidents = scanner.ScanAllIncidents(namespace)
	}()

	// Check if context was cancelled (timeout)
	if ctx.Err() != nil {
		fmt.Printf("Incidents scan timed out or was cancelled: %v\n", ctx.Err())
		// Return partial results if available, otherwise empty
		if incidents == nil {
			incidents = []KubernetesIncident{}
		}
	}

	// Ensure incidents is never nil
	if incidents == nil {
		fmt.Printf("Incidents scan returned nil, using empty array\n")
		incidents = []KubernetesIncident{}
	}

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

	// Always return valid JSON response
	fmt.Printf("[Incidents] Scan complete - found %d incidents (filtered from %d total)\n", len(filtered), len(incidents))
	if len(incidents) > 0 && len(filtered) == 0 {
		fmt.Printf("[Incidents] Warning: %d incidents found but all were filtered out\n", len(incidents))
	}
	json.NewEncoder(w).Encode(map[string]interface{}{
		"incidents": filtered,
		"total":     len(filtered),
	})
}

// Legacy methods kept for backward compatibility - now delegate to IncidentScanner
// These are deprecated and will be removed in a future version
