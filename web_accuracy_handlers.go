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
	"encoding/json"
	"net/http"
	"time"

	"github.com/kubegraf/kubegraf/internal/validation"
)

// RegisterAccuracyHandlers registers all accuracy test API endpoints
func (ws *WebServer) RegisterAccuracyHandlers() {
	http.HandleFunc("/api/accuracy/run", ws.handleAccuracyRun)
	http.HandleFunc("/api/accuracy/status", ws.handleAccuracyStatus)
	http.HandleFunc("/api/accuracy/pods", ws.handleAccuracyPods)
	http.HandleFunc("/api/accuracy/deployments", ws.handleAccuracyDeployments)
	http.HandleFunc("/api/accuracy/metrics", ws.handleAccuracyMetrics)
	http.HandleFunc("/api/accuracy/cost", ws.handleAccuracyCost)
	http.HandleFunc("/api/accuracy/summary", ws.handleAccuracySummary)
}

// handleAccuracyRun runs comprehensive accuracy tests
func (ws *WebServer) handleAccuracyRun(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if ws.app.clientset == nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Kubernetes client not initialized",
		})
		return
	}

	namespace := r.URL.Query().Get("namespace")
	if namespace == "" {
		namespace = ws.app.namespace
	}

	// Run accuracy tests
	runner := validation.NewAPITestRunner(ws.app.clientset, ws.app.metricsClient, ws.app.ctx)
	results, err := runner.RunAllTests(namespace)
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"results": results,
		"timestamp": time.Now().Format(time.RFC3339),
	})
}

// handleAccuracyStatus returns current accuracy test status
func (ws *WebServer) handleAccuracyStatus(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	config := validation.ValidationConfigFromEnv()
	json.NewEncoder(w).Encode(map[string]interface{}{
		"enabled":     config.Enabled,
		"strictMode":  config.StrictMode,
		"logWarnings": config.LogWarnings,
		"logErrors":   config.LogErrors,
	})
}

// handleAccuracyPods validates pod data accuracy
func (ws *WebServer) handleAccuracyPods(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if ws.app.clientset == nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Kubernetes client not initialized",
		})
		return
	}

	namespace := r.URL.Query().Get("namespace")
	if namespace == "" {
		namespace = ws.app.namespace
	}

	checker := validation.NewDataAccuracyChecker(ws.app.clientset, ws.app.metricsClient, ws.app.ctx)
	results, err := checker.ValidatePods(namespace)
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"results": results,
	})
}

// handleAccuracyDeployments validates deployment data accuracy
func (ws *WebServer) handleAccuracyDeployments(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if ws.app.clientset == nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Kubernetes client not initialized",
		})
		return
	}

	namespace := r.URL.Query().Get("namespace")
	if namespace == "" {
		namespace = ws.app.namespace
	}

	checker := validation.NewDataAccuracyChecker(ws.app.clientset, ws.app.metricsClient, ws.app.ctx)
	results, err := checker.ValidateDeployments(namespace)
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"results": results,
	})
}

// handleAccuracyMetrics validates metrics data accuracy
func (ws *WebServer) handleAccuracyMetrics(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if ws.app.metricsClient == nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Metrics client not initialized",
		})
		return
	}

	namespace := r.URL.Query().Get("namespace")
	if namespace == "" {
		namespace = ws.app.namespace
	}

	checker := validation.NewDataAccuracyChecker(ws.app.clientset, ws.app.metricsClient, ws.app.ctx)
	results, err := checker.ValidateMetrics(namespace)
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"results": results,
	})
}

// handleAccuracyCost validates cost calculation accuracy
func (ws *WebServer) handleAccuracyCost(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if ws.app.clientset == nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Kubernetes client not initialized",
		})
		return
	}

	namespace := r.URL.Query().Get("namespace")
	if namespace == "" {
		namespace = ws.app.namespace
	}

	checker := validation.NewDataAccuracyChecker(ws.app.clientset, ws.app.metricsClient, ws.app.ctx)
	results, err := checker.ValidateCost(namespace)
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"results": results,
	})
}

// handleAccuracySummary returns a summary of all accuracy test results
func (ws *WebServer) handleAccuracySummary(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if ws.app.clientset == nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Kubernetes client not initialized",
		})
		return
	}

	namespace := r.URL.Query().Get("namespace")
	if namespace == "" {
		namespace = ws.app.namespace
	}

	runner := validation.NewAPITestRunner(ws.app.clientset, ws.app.metricsClient, ws.app.ctx)
	summary, err := runner.GetSummary(namespace)
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"summary": summary,
	})
}

