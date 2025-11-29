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

	"github.com/kubegraf/kubegraf/ai"
)

// AIManager manages the AI engine and chat sessions for the web server
type AIManager struct {
	engine      *ai.AIEngine
	chatManager *ai.ChatManager
}

// NewAIManager creates a new AI manager with configured providers
func NewAIManager() *AIManager {
	engine := ai.NewAIEngine()

	// Register default providers
	// Ollama (local) - always available
	engine.RegisterProvider(ai.NewOllamaProvider(&ai.ProviderConfig{
		Type: ai.ProviderOllama,
	}))

	// OpenAI - if API key is set
	openaiProvider := ai.NewOpenAIProvider(&ai.ProviderConfig{
		Type: ai.ProviderOpenAI,
	})
	engine.RegisterProvider(openaiProvider)

	// Anthropic - if API key is set
	anthropicProvider := ai.NewAnthropicProvider(&ai.ProviderConfig{
		Type: ai.ProviderAnthropic,
	})
	engine.RegisterProvider(anthropicProvider)

	// Register Kubernetes tools
	engine.RegisterTools(ai.GetKubernetesTools())

	return &AIManager{
		engine:      engine,
		chatManager: ai.NewChatManager(engine),
	}
}

// handleAISession creates a new AI chat session
func (ws *WebServer) handleAISession(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	if ws.aiManager == nil {
		http.Error(w, "AI not initialized", http.StatusServiceUnavailable)
		return
	}

	var req struct {
		Provider string `json:"provider"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		// Default provider if none specified
		req.Provider = "ollama"
	}

	// Set active provider based on request
	switch req.Provider {
	case "openai":
		ws.aiManager.engine.SetActiveProvider(ai.ProviderOpenAI)
	case "anthropic":
		ws.aiManager.engine.SetActiveProvider(ai.ProviderAnthropic)
	default:
		ws.aiManager.engine.SetActiveProvider(ai.ProviderOllama)
	}

	// Create session with current cluster context
	ctx := map[string]any{
		"cluster":   ws.app.cluster,
		"namespace": ws.app.namespace,
	}

	session := ws.aiManager.chatManager.CreateSession(ctx)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"id":       session.ID,
		"provider": req.Provider,
	})
}

// handleAIChat sends a message to the AI and returns the response
func (ws *WebServer) handleAIChat(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	if ws.aiManager == nil {
		http.Error(w, "AI not initialized", http.StatusServiceUnavailable)
		return
	}

	var req struct {
		SessionID string `json:"session_id"`
		Message   string `json:"message"`
		Provider  string `json:"provider"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.Message == "" {
		http.Error(w, "Message is required", http.StatusBadRequest)
		return
	}

	// Switch provider if specified
	if req.Provider != "" {
		switch req.Provider {
		case "openai":
			ws.aiManager.engine.SetActiveProvider(ai.ProviderOpenAI)
		case "anthropic":
			ws.aiManager.engine.SetActiveProvider(ai.ProviderAnthropic)
		default:
			ws.aiManager.engine.SetActiveProvider(ai.ProviderOllama)
		}
	}

	// If no session, create one
	sessionID := req.SessionID
	if sessionID == "" {
		ctx := map[string]any{
			"cluster":   ws.app.cluster,
			"namespace": ws.app.namespace,
		}
		session := ws.aiManager.chatManager.CreateSession(ctx)
		sessionID = session.ID
	}

	// Send message and get response
	resp, err := ws.aiManager.chatManager.SendMessage(sessionID, req.Message)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{
			"error": err.Error(),
		})
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]any{
		"session_id": sessionID,
		"message":    resp.Message,
		"usage":      resp.Usage,
	})
}

// handleAIProviders returns available AI providers
func (ws *WebServer) handleAIProviders(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	providers := []map[string]string{
		{"id": "ollama", "name": "Ollama (Local)", "icon": "llama"},
		{"id": "openai", "name": "OpenAI GPT-4", "icon": "openai"},
		{"id": "anthropic", "name": "Claude", "icon": "anthropic"},
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(providers)
}

// handlePluginList returns all loaded plugins
func (ws *WebServer) handlePluginList(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	if ws.pluginManager == nil {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]any{
			"plugins": []any{},
		})
		return
	}

	plugins := ws.pluginManager.GetPlugins()

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]any{
		"plugins": plugins,
	})
}

// handlePluginExecute executes a plugin command
func (ws *WebServer) handlePluginExecute(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	if ws.pluginManager == nil {
		http.Error(w, "Plugin system not initialized", http.StatusServiceUnavailable)
		return
	}

	var req struct {
		Plugin  string         `json:"plugin"`
		Command string         `json:"command"`
		Args    map[string]any `json:"args"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	result, err := ws.pluginManager.ExecuteCommand(r.Context(), req.Plugin, req.Command, req.Args)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{
			"error": err.Error(),
		})
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}
