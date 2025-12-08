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

package aiagents

import (
	"context"
	"os"
	"time"
)

// DiscoverAgents automatically discovers and registers available AI agents
func DiscoverAgents(ctx context.Context, registry *Registry) {
	// Discover Codex (OpenAI) - register even if not connected, user can configure later
	if apiKey := os.Getenv("OPENAI_API_KEY"); apiKey != "" {
		codexConfig := &AgentConfig{
			ID:          "codex-openai",
			Name:        "OpenAI Codex",
			Type:        AgentTypeCodex,
			Endpoint:    "https://api.openai.com/v1/completions",
			APIKey:      apiKey,
			Timeout:     30 * time.Second,
			Enabled:     true,
			Description: "OpenAI Codex for code generation",
			Icon:        "codex",
			Status:      AgentStatusUnknown,
			Headers: map[string]string{
				"model": "code-davinci-002",
			},
		}
		codexAgent := NewCodexAgent(codexConfig)
		// Try to connect, but register even if it fails
		_ = codexAgent.Connect(ctx)
		registry.Register(codexAgent)
	} else {
		// Register Codex without API key so user can configure it
		codexConfig := &AgentConfig{
			ID:          "codex-openai",
			Name:        "OpenAI Codex",
			Type:        AgentTypeCodex,
			Endpoint:    "https://api.openai.com/v1/completions",
			Timeout:     30 * time.Second,
			Enabled:     true,
			Description: "OpenAI Codex for code generation",
			Icon:        "codex",
			Status:      AgentStatusDisconnected,
			Headers: map[string]string{
				"model": "code-davinci-002",
			},
		}
		codexAgent := NewCodexAgent(codexConfig)
		registry.Register(codexAgent)
	}

	// Discover Cursor - register common options
	cursorEndpoint := os.Getenv("CURSOR_API_ENDPOINT")
	if cursorEndpoint == "" {
		cursorEndpoint = "http://localhost:3001/api/chat"
	}
	cursorConfig := &AgentConfig{
		ID:          "cursor-ai",
		Name:        "Cursor AI",
		Type:        AgentTypeCursor,
		Endpoint:    cursorEndpoint,
		APIKey:      os.Getenv("CURSOR_API_KEY"),
		Timeout:     30 * time.Second,
		Enabled:     true,
		Description: "Cursor IDE AI assistant",
		Icon:        "cursor",
		Status:      AgentStatusUnknown,
	}
	cursorAgent := NewCursorAgent(cursorConfig)
	// Try to connect, but register even if it fails
	_ = cursorAgent.Connect(ctx)
	registry.Register(cursorAgent)

	// Discover custom agents from environment
	if endpoint := os.Getenv("CUSTOM_AI_ENDPOINT"); endpoint != "" {
		customConfig := &AgentConfig{
			ID:          "custom-env",
			Name:        os.Getenv("CUSTOM_AI_NAME"),
			Type:        AgentTypeCustom,
			Endpoint:    endpoint,
			APIKey:      os.Getenv("CUSTOM_AI_API_KEY"),
			Timeout:     30 * time.Second,
			Enabled:     true,
			Description: "Custom AI agent from environment",
			Icon:        "custom",
			Status:      AgentStatusUnknown,
		}
		if customConfig.Name == "" {
			customConfig.Name = "Custom AI Agent"
		}
		customAgent := NewCustomAgent(customConfig)
		_ = customAgent.Connect(ctx)
		registry.Register(customAgent)
	}

	// Always register common agent types so users can configure them
	commonAgents := []struct {
		id          string
		name        string
		agentType   AgentType
		endpoint    string
		description string
		icon        string
	}{
		{"openai-gpt", "OpenAI GPT", AgentTypeOpenAI, "https://api.openai.com/v1/chat/completions", "OpenAI GPT models", "openai"},
		{"claude-ai", "Claude AI", AgentTypeClaude, "https://api.anthropic.com/v1/messages", "Anthropic Claude models", "claude"},
		{"ollama-local", "Ollama (Local)", AgentTypeOllama, "http://localhost:11434/api/generate", "Local Ollama models", "ollama"},
	}

	for _, common := range commonAgents {
		// Check if already registered
		if _, exists := registry.Get(common.id); exists {
			continue
		}

		config := &AgentConfig{
			ID:          common.id,
			Name:        common.name,
			Type:        common.agentType,
			Endpoint:    common.endpoint,
			Timeout:     30 * time.Second,
			Enabled:     true,
			Description: common.description,
			Icon:        common.icon,
			Status:      AgentStatusDisconnected,
		}

		var agent AgentInterface
		switch common.agentType {
		case AgentTypeOllama:
			// For Ollama, we can use CustomAgent
			agent = NewCustomAgent(config)
		default:
			// For others, use CustomAgent as well
			agent = NewCustomAgent(config)
		}

		registry.Register(agent)
	}
}

