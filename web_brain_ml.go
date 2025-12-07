// Copyright 2025 KubeGraf Contributors
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0

package main

import (
	brain "github.com/kubegraf/kubegraf/internal/brain"
)

import (
	"context"
	"encoding/json"
	"net/http"
	"strconv"
	"time"
)

// handleBrainMLTimeline returns ML timeline events
func (ws *WebServer) handleBrainMLTimeline(w http.ResponseWriter, r *http.Request) {
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

	timeline, err := ws.app.GenerateMLTimeline(ctx, hours)
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"error": err.Error(),
			"events": []brain.MLTimelineEvent{},
		})
		return
	}

	json.NewEncoder(w).Encode(timeline)
}

// handleBrainMLPredictions returns ML predictions
func (ws *WebServer) handleBrainMLPredictions(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	ctx, cancel := context.WithTimeout(r.Context(), 30*time.Second)
	defer cancel()

	predictions, err := ws.app.GenerateMLPredictions(ctx)
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"error": err.Error(),
			"predictions": []brain.MLPrediction{},
		})
		return
	}

	json.NewEncoder(w).Encode(predictions)
}

// handleBrainMLSummary returns ML summary
func (ws *WebServer) handleBrainMLSummary(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	ctx, cancel := context.WithTimeout(r.Context(), 30*time.Second)
	defer cancel()

	// Get hours parameter (default 24)
	hours := 24
	if h := r.URL.Query().Get("hours"); h != "" {
		if parsed, err := strconv.Atoi(h); err == nil && parsed > 0 {
			hours = parsed
		}
	}

	summary, err := ws.app.GenerateMLSummary(ctx, hours)
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"error": err.Error(),
			"summary": "",
		})
		return
	}

	json.NewEncoder(w).Encode(summary)
}


