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
	"net/http"
	"time"

	"github.com/kubegraf/kubegraf/internal/aiagents"
)

// handleListAgents returns all registered AI agents
func (ws *WebServer) handleListAgents(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	registry := aiagents.GetRegistry()
	agents := registry.List()

	agentList := make([]map[string]interface{}, 0, len(agents))
	for _, agent := range agents {
		config := agent.GetConfig()
		connected := agent.IsConnected()
		// Update status if needed
		if connected && config.Status != aiagents.AgentStatusConnected {
			config.Status = aiagents.AgentStatusConnected
		} else if !connected && config.Status == aiagents.AgentStatusUnknown {
			config.Status = aiagents.AgentStatusDisconnected
		}
		agentList = append(agentList, map[string]interface{}{
			"id":          config.ID,
			"name":        config.Name,
			"type":        string(config.Type),
			"status":      string(config.Status),
			"enabled":     config.Enabled,
			"description": config.Description,
			"icon":        config.Icon,
			"endpoint":    config.Endpoint,
			"lastCheck":   config.LastCheck,
			"error":       config.Error,
			"connected":   connected,
		})
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"agents": agentList,
	})
}

// handleGetAgent returns details for a specific agent
func (ws *WebServer) handleGetAgent(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	agentID := r.URL.Query().Get("id")
	if agentID == "" {
		http.Error(w, "agent ID required", http.StatusBadRequest)
		return
	}

	registry := aiagents.GetRegistry()
	agent, exists := registry.Get(agentID)
	if !exists {
		http.Error(w, "agent not found", http.StatusNotFound)
		return
	}

	config := agent.GetConfig()
	agentInfo := map[string]interface{}{
		"id":          config.ID,
		"name":        config.Name,
		"type":        string(config.Type),
		"status":      string(config.Status),
		"enabled":     config.Enabled,
		"description": config.Description,
		"icon":        config.Icon,
		"lastCheck":   config.LastCheck,
		"error":       config.Error,
		"connected":   agent.IsConnected(),
		// Don't expose sensitive info like API keys
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(agentInfo)
}

// handleAgentQuery sends a query to a specific agent
func (ws *WebServer) handleAgentQuery(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		AgentID string                 `json:"agentId"`
		Message string                 `json:"message"`
		Context map[string]interface{} `json:"context,omitempty"`
		Model   string                 `json:"model,omitempty"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	if req.AgentID == "" {
		http.Error(w, "agent ID required", http.StatusBadRequest)
		return
	}

	if req.Message == "" {
		http.Error(w, "message required", http.StatusBadRequest)
		return
	}

	registry := aiagents.GetRegistry()
	agent, exists := registry.Get(req.AgentID)
	if !exists {
		http.Error(w, "agent not found", http.StatusNotFound)
		return
	}

	config := agent.GetConfig()
	if !config.Enabled {
		http.Error(w, "agent is not enabled", http.StatusBadRequest)
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 60*time.Second)
	defer cancel()

	agentReq := &aiagents.AgentRequest{
		Message:   req.Message,
		Context:   req.Context,
		Model:     req.Model,
		MaxTokens: 2000,
	}

	resp, err := agent.Query(ctx, agentReq)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"error": err.Error(),
		})
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"content":  resp.Content,
		"usage":    resp.Usage,
		"model":    resp.Model,
		"metadata": resp.Metadata,
	})
}

// handleRegisterAgent registers a new agent
func (ws *WebServer) handleRegisterAgent(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var config aiagents.AgentConfig
	if err := json.NewDecoder(r.Body).Decode(&config); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	if config.ID == "" || config.Name == "" || config.Endpoint == "" {
		http.Error(w, "id, name, and endpoint are required", http.StatusBadRequest)
		return
	}

	registry := aiagents.GetRegistry()

	var agent aiagents.AgentInterface
	switch config.Type {
	case aiagents.AgentTypeCodex:
		agent = aiagents.NewCodexAgent(&config)
	case aiagents.AgentTypeCursor:
		agent = aiagents.NewCursorAgent(&config)
	case aiagents.AgentTypeCustom:
		agent = aiagents.NewCustomAgent(&config)
	default:
		http.Error(w, "unsupported agent type", http.StatusBadRequest)
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	if err := agent.Connect(ctx); err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"error": "failed to connect to agent: " + err.Error(),
		})
		return
	}

	if err := registry.Register(agent); err != nil {
		http.Error(w, "failed to register agent", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"agent": map[string]interface{}{
			"id":        config.ID,
			"name":      config.Name,
			"type":      string(config.Type),
			"status":    string(config.Status),
			"connected": agent.IsConnected(),
		},
	})
}

// handleAgentHealthCheck performs health check on an agent
func (ws *WebServer) handleAgentHealthCheck(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		AgentID string `json:"agentId"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	registry := aiagents.GetRegistry()
	agent, exists := registry.Get(req.AgentID)
	if !exists {
		http.Error(w, "agent not found", http.StatusNotFound)
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	err := agent.HealthCheck(ctx)
	config := agent.GetConfig()

	if err != nil {
		config.Status = aiagents.AgentStatusError
		config.Error = err.Error()
	} else if agent.IsConnected() {
		config.Status = aiagents.AgentStatusConnected
		config.Error = ""
	} else {
		config.Status = aiagents.AgentStatusDisconnected
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"status":    string(config.Status),
		"connected": agent.IsConnected(),
		"error":     config.Error,
	})
}

// handleDiscoverAgents triggers agent discovery
func (ws *WebServer) handleDiscoverAgents(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 30*time.Second)
	defer cancel()

	registry := aiagents.GetRegistry()
	aiagents.DiscoverAgents(ctx, registry)

	agents := registry.List()
	agentList := make([]map[string]interface{}, 0, len(agents))
	for _, agent := range agents {
		config := agent.GetConfig()
		agentList = append(agentList, map[string]interface{}{
			"id":        config.ID,
			"name":      config.Name,
			"type":      string(config.Type),
			"status":    string(config.Status),
			"connected": agent.IsConnected(),
		})
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"agents":  agentList,
	})
}

