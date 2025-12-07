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
	"fmt"
	"net/http"
	"time"
)

// handleGPUStatus returns the status of GPU monitoring
func (ws *WebServer) handleGPUStatus(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	ctx, cancel := context.WithTimeout(r.Context(), 30*time.Second)
	defer cancel()

	status, err := ws.app.DetectDCGM(ctx)
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"error": err.Error(),
		})
		return
	}

	json.NewEncoder(w).Encode(status)
}

// handleGPUMetrics returns GPU metrics
func (ws *WebServer) handleGPUMetrics(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	ctx, cancel := context.WithTimeout(r.Context(), 30*time.Second)
	defer cancel()

	// Get GPU status first
	status, err := ws.app.DetectDCGM(ctx)
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"error": err.Error(),
			"metrics": []GPUMetrics{},
		})
		return
	}

	if !status.DCGMInstalled {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"error": "DCGM exporter is not installed",
			"metrics": []GPUMetrics{},
		})
		return
	}

	metrics, err := ws.GetGPUMetrics(ctx, status)
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"error": err.Error(),
			"metrics": []GPUMetrics{},
		})
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"metrics": metrics,
	})
}

// handleGPUInstall installs DCGM exporter
func (ws *WebServer) handleGPUInstall(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req GPUInstallRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Invalid request body: " + err.Error(),
		})
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Minute)
	defer cancel()

	if err := ws.InstallDCGM(ctx, req); err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": fmt.Sprintf("DCGM exporter installed successfully in namespace %s", req.Namespace),
	})
}

