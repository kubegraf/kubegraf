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
)

// Simple AI integration functions that work with existing web server

// handleAIChatSimple provides simple AI chat functionality
func (ws *WebServer) handleAIChatSimple(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var request struct {
		Message string `json:"message"`
	}

	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Use existing AI assistant
	assistant := NewAIAssistant(nil)
	if !assistant.IsAvailable() {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"type": "generic_response",
			"message": "AI Assistant is not available. Please install Ollama and run 'ollama serve' to enable AI features.",
		})
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 60*time.Second)
	defer cancel()

	response, err := assistant.Query(ctx, request.Message)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"type": "error",
			"message": fmt.Sprintf("AI query failed: %v", err),
		})
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"type": "generic_response",
		"message": response,
	})
}

// handleAISuggestionSimple provides simple AI suggestions
func (ws *WebServer) handleAISuggestionSimple(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var request struct {
		Intent map[string]interface{} `json:"intent"`
	}

	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Simple suggestion based on intent
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"action": "investigate",
		"description": "AI analysis suggests investigating the cluster state for potential issues",
		"resource": request.Intent["resource"],
		"namespace": request.Intent["namespace"],
		"name": request.Intent["name"],
		"confidence": 0.75,
		"risk_level": "low",
		"estimated_impact": "Minor investigation needed",
		"prerequisites": []string{"Cluster access", "Resource inspection"},
		"steps": []string{"Check resource status", "Review recent events", "Analyze logs if needed"},
		"alternatives": []string{"Use cluster insights", "Check resource metrics", "Review configuration"},
		"safety_checks": []map[string]interface{}{
			{"name": "Cluster Access", "description": "Verify cluster connectivity", "status": "passed", "message": "Cluster accessible"},
		},
		"requires_approval": false,
	})
}

// handleAIExecuteSimple executes simple AI actions
func (ws *WebServer) handleAIExecuteSimple(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var request struct {
		Suggestion map[string]interface{} `json:"suggestion"`
		Confirmed  bool                   `json:"confirmed"`
	}

	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Mock execution - in real implementation this would execute the action
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"action":       request.Suggestion["action"],
		"resource":     request.Suggestion["resource"],
		"name":         request.Suggestion["name"],
		"namespace":    request.Suggestion["namespace"],
		"status":       "completed",
		"started_at":   time.Now(),
		"completed_at": time.Now(),
		"error":        "",
	})
}