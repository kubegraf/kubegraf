// Copyright 2025 KubeGraf Contributors
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0

package main

import (
	"context"
	"encoding/json"
	"net/http"
	"strconv"
	"time"

	"github.com/kubegraf/kubegraf/brain"
	"k8s.io/client-go/kubernetes"
)

// BrainTimelineResponse represents the timeline response
type BrainTimelineResponse struct {
	Events []brain.TimelineEvent `json:"events"`
	Total  int                   `json:"total"`
}

// BrainOOMInsightsResponse represents the OOM insights response (alias for brain.OOMMetrics)
type BrainOOMInsightsResponse = brain.OOMMetrics

// BrainSummaryResponse represents the summary response (alias for brain.BrainSummary)
type BrainSummaryResponse = brain.BrainSummary

// handleBrainTimeline returns Brain timeline events from real cluster data
func (ws *WebServer) handleBrainTimeline(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	ctx, cancel := context.WithTimeout(r.Context(), 30*time.Second)
	defer cancel()

	// Get hours parameter (default 72)
	hours := 72
	if h := r.URL.Query().Get("hours"); h != "" {
		if parsed, err := strconv.Atoi(h); err == nil && parsed > 0 {
			hours = parsed
		}
	}

	// Get clientset safely
	var clientset kubernetes.Interface
	if ws.app.IsConnected() {
		if cs, ok := ws.app.GetClientset().(kubernetes.Interface); ok && cs != nil {
			clientset = cs
		}
	}

	// Create incident scanner adapter
	scanner := NewIncidentScanner(ws.app)
	scannerAdapter := &incidentScannerAdapter{scanner: scanner}

	// Generate timeline
	generator := brain.NewTimelineGenerator(clientset, scannerAdapter)
	events, err := generator.Generate(ctx, hours)
	if err != nil {
		json.NewEncoder(w).Encode(BrainTimelineResponse{
			Events: []brain.TimelineEvent{},
			Total:  0,
		})
		return
	}

	json.NewEncoder(w).Encode(BrainTimelineResponse{
		Events: events,
		Total:  len(events),
	})
}

// handleBrainOOMInsights returns Brain OOM insights from real cluster data
func (ws *WebServer) handleBrainOOMInsights(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	ctx, cancel := context.WithTimeout(r.Context(), 30*time.Second)
	defer cancel()

	// Get clientset safely
	var clientset kubernetes.Interface
	if ws.app.IsConnected() {
		if cs, ok := ws.app.GetClientset().(kubernetes.Interface); ok && cs != nil {
			clientset = cs
		}
	}

	// Create incident scanner adapter
	scanner := NewIncidentScanner(ws.app)
	scannerAdapter := &incidentScannerAdapter{scanner: scanner}

	// Generate OOM insights
	generator := brain.NewOOMInsightsGenerator(clientset, scannerAdapter)
	metrics, err := generator.Generate(ctx)
	if err != nil {
		json.NewEncoder(w).Encode(BrainOOMInsightsResponse{
			Incidents24h:   0,
			CrashLoops24h:  0,
			TopProblematic: []brain.ProblematicWorkload{},
		})
		return
	}

	json.NewEncoder(w).Encode(metrics)
}

// handleBrainSummary returns Brain summary from real cluster data
func (ws *WebServer) handleBrainSummary(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	ctx, cancel := context.WithTimeout(r.Context(), 30*time.Second)
	defer cancel()

	// Get clientset safely
	var clientset kubernetes.Interface
	if ws.app.IsConnected() {
		if cs, ok := ws.app.GetClientset().(kubernetes.Interface); ok && cs != nil {
			clientset = cs
		}
	}

	// Create incident scanner adapter
	scanner := NewIncidentScanner(ws.app)
	scannerAdapter := &incidentScannerAdapter{scanner: scanner}

	// Generate summary
	generator := brain.NewSummaryGenerator(clientset, scannerAdapter)
	summary, err := generator.Generate(ctx)
	if err != nil {
		json.NewEncoder(w).Encode(BrainSummaryResponse{
			Last24hSummary:     "Error generating summary",
			TopRiskAreas:       []string{},
			RecommendedActions: []string{},
			GeneratedAt:        time.Now().Format(time.RFC3339),
		})
		return
	}

	json.NewEncoder(w).Encode(summary)
}

// incidentScannerAdapter adapts the main package's IncidentScanner to brain.IncidentScanner interface
type incidentScannerAdapter struct {
	scanner *IncidentScanner
}

func (a *incidentScannerAdapter) ScanAllIncidents(namespace string) []brain.KubernetesIncident {
	incidents := a.scanner.ScanAllIncidents(namespace)
	result := make([]brain.KubernetesIncident, len(incidents))
	for i, inc := range incidents {
		result[i] = brain.KubernetesIncident{
			ID:           inc.ID,
			Type:         inc.Type,
			Severity:     inc.Severity,
			ResourceName: inc.ResourceName,
			ResourceKind: inc.ResourceKind,
			Namespace:    inc.Namespace,
			Message:      inc.Message,
			FirstSeen:    inc.FirstSeen,
			LastSeen:     inc.LastSeen,
			Count:        inc.Count,
		}
	}
	return result
}
