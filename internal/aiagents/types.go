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
	"time"
)

// AgentType represents the type of AI agent
type AgentType string

const (
	AgentTypeCodex    AgentType = "codex"    // OpenAI Codex
	AgentTypeCursor   AgentType = "cursor"   // Cursor IDE AI
	AgentTypeCustom   AgentType = "custom"   // Custom HTTP API
	AgentTypeOllama   AgentType = "ollama"   // Local Ollama
	AgentTypeOpenAI   AgentType = "openai"    // OpenAI API
	AgentTypeClaude   AgentType = "claude"    // Anthropic Claude
)

// AgentStatus represents the connection status of an agent
type AgentStatus string

const (
	AgentStatusConnected    AgentStatus = "connected"
	AgentStatusDisconnected AgentStatus = "disconnected"
	AgentStatusError        AgentStatus = "error"
	AgentStatusUnknown      AgentStatus = "unknown"
)

// AgentConfig holds configuration for an AI agent
type AgentConfig struct {
	ID          string            `json:"id"`
	Name        string            `json:"name"`
	Type        AgentType         `json:"type"`
	Status      AgentStatus       `json:"status"`
	Endpoint    string            `json:"endpoint"`     // API endpoint URL
	APIKey      string            `json:"apiKey"`      // API key (stored encrypted)
	Headers     map[string]string `json:"headers"`     // Custom headers
	Timeout     time.Duration     `json:"timeout"`     // Request timeout
	Enabled     bool              `json:"enabled"`     // Whether agent is enabled
	Description string            `json:"description"` // User-friendly description
	Icon        string            `json:"icon"`        // Icon identifier
	LastCheck   time.Time         `json:"lastCheck"`   // Last health check
	Error       string            `json:"error"`       // Last error message
}

// AgentRequest represents a request to an AI agent
type AgentRequest struct {
	Message   string                 `json:"message"`
	Context   map[string]interface{} `json:"context,omitempty"`   // Additional context
	Stream    bool                   `json:"stream,omitempty"`   // Whether to stream response
	Model     string                 `json:"model,omitempty"`     // Model to use
	MaxTokens int                    `json:"maxTokens,omitempty"` // Max tokens in response
}

// AgentResponse represents a response from an AI agent
type AgentResponse struct {
	Content   string                 `json:"content"`
	Usage     *TokenUsage            `json:"usage,omitempty"`
	Model     string                 `json:"model,omitempty"`
	Error     string                 `json:"error,omitempty"`
	Metadata  map[string]interface{} `json:"metadata,omitempty"`
}

// TokenUsage represents token usage information
type TokenUsage struct {
	PromptTokens     int `json:"promptTokens"`
	CompletionTokens int `json:"completionTokens"`
	TotalTokens      int `json:"totalTokens"`
}

// AgentInterface defines the interface that all AI agents must implement
type AgentInterface interface {
	// ID returns the unique identifier for this agent
	ID() string

	// Name returns the display name of the agent
	Name() string

	// Type returns the agent type
	Type() AgentType

	// Connect establishes connection to the agent
	Connect(ctx context.Context) error

	// Disconnect closes the connection
	Disconnect() error

	// IsConnected returns whether the agent is currently connected
	IsConnected() bool

	// Query sends a query to the agent and returns the response
	Query(ctx context.Context, req *AgentRequest) (*AgentResponse, error)

	// HealthCheck checks if the agent is available
	HealthCheck(ctx context.Context) error

	// GetConfig returns the current configuration
	GetConfig() *AgentConfig
}

