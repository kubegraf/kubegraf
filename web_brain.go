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
)

// BrainTimelineResponse represents the timeline response
type BrainTimelineResponse struct {
	Events []TimelineEvent `json:"events"`
	Total  int             `json:"total"`
}

// BrainOOMInsightsResponse represents the OOM insights response (alias for OOMMetrics)
type BrainOOMInsightsResponse = OOMMetrics

// BrainSummaryResponse represents the summary response (alias for BrainSummary)
type BrainSummaryResponse = BrainSummary

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

	events, err := GenerateBrainTimeline(ctx, ws.app, hours)
	if err != nil {
		json.NewEncoder(w).Encode(BrainTimelineResponse{
			Events: []TimelineEvent{},
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

	metrics, err := GenerateBrainOOMInsights(ctx, ws.app)
	if err != nil {
		json.NewEncoder(w).Encode(BrainOOMInsightsResponse{
			Incidents24h:   0,
			CrashLoops24h:  0,
			TopProblematic: []ProblematicWorkload{},
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

	summary, err := GenerateBrainSummary(ctx, ws.app)
	if err != nil {
		json.NewEncoder(w).Encode(BrainSummaryResponse{
			Last24hSummary:    "Error generating summary",
			TopRiskAreas:     []string{},
			RecommendedActions: []string{},
			GeneratedAt:      time.Now().Format(time.RFC3339),
		})
		return
	}

	json.NewEncoder(w).Encode(summary)
}

