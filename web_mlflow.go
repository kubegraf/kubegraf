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

// handleMLflowStatus returns the status of MLflow installation
func (ws *WebServer) handleMLflowStatus(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	status, err := ws.app.DetectMLflow(r.Context())
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"installed": false,
			"error":     err.Error(),
		})
		return
	}

	json.NewEncoder(w).Encode(status)
}

// handleMLflowInstall installs MLflow using Helm
func (ws *WebServer) handleMLflowInstall(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req MLflowInstallRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Invalid request body",
		})
		return
	}

	// Install MLflow in background
	go func() {
		ctx, cancel := context.WithTimeout(context.Background(), 15*time.Minute)
		defer cancel()

		if err := ws.InstallMLflow(ctx, req); err != nil {
			// Log error (could also send via WebSocket or store in DB)
			fmt.Printf("MLflow installation failed: %v\n", err)
		}
	}()

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": "MLflow installation started",
	})
}

// handleMLflowVersions returns available MLflow versions
func (ws *WebServer) handleMLflowVersions(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	versions, err := GetMLflowVersions(r.Context())
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"error": err.Error(),
		})
		return
	}

	json.NewEncoder(w).Encode(versions)
}

// handleMLflowUpgrade upgrades MLflow to a new version
func (ws *WebServer) handleMLflowUpgrade(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		Namespace string `json:"namespace"`
		Version   string `json:"version"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Invalid request body",
		})
		return
	}

	namespace := req.Namespace
	if namespace == "" {
		namespace = "mlflow"
	}

	// Upgrade in background
	go func() {
		ctx, cancel := context.WithTimeout(context.Background(), 15*time.Minute)
		defer cancel()

		if err := ws.UpgradeMLflow(ctx, namespace, req.Version); err != nil {
			fmt.Printf("MLflow upgrade failed: %v\n", err)
		}
	}()

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": "MLflow upgrade started",
	})
}

