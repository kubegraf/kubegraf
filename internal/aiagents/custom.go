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
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

// CustomAgent implements AgentInterface for custom HTTP API agents
type CustomAgent struct {
	config    *AgentConfig
	client    *http.Client
	connected bool
}

// NewCustomAgent creates a new custom HTTP API agent
func NewCustomAgent(config *AgentConfig) *CustomAgent {
	if config == nil {
		config = &AgentConfig{
			ID:          "custom-default",
			Name:        "Custom AI Agent",
			Type:        AgentTypeCustom,
			Endpoint:    "http://localhost:8080/api/chat",
			Timeout:     30 * time.Second,
			Enabled:     true,
			Description: "Custom AI agent via HTTP API",
			Icon:        "custom",
		}
	}

	return &CustomAgent{
		config: config,
		client: &http.Client{
			Timeout: config.Timeout,
		},
		connected: false,
	}
}

func (a *CustomAgent) ID() string {
	return a.config.ID
}

func (a *CustomAgent) Name() string {
	return a.config.Name
}

func (a *CustomAgent) Type() AgentType {
	return AgentTypeCustom
}

func (a *CustomAgent) Connect(ctx context.Context) error {
	if err := a.HealthCheck(ctx); err != nil {
		return fmt.Errorf("failed to connect to custom agent: %w", err)
	}
	a.connected = true
	a.config.Status = AgentStatusConnected
	return nil
}

func (a *CustomAgent) Disconnect() error {
	a.connected = false
	a.config.Status = AgentStatusDisconnected
	return nil
}

func (a *CustomAgent) IsConnected() bool {
	return a.connected
}

func (a *CustomAgent) Query(ctx context.Context, req *AgentRequest) (*AgentResponse, error) {
	if !a.config.Enabled {
		return nil, fmt.Errorf("agent %s is not enabled", a.config.ID)
	}

	// Build request payload - flexible format for custom APIs
	payload := map[string]interface{}{
		"message": req.Message,
	}

	// Add optional fields
	if req.Model != "" {
		payload["model"] = req.Model
	}
	if req.MaxTokens > 0 {
		payload["max_tokens"] = req.MaxTokens
	}
	if req.Stream {
		payload["stream"] = req.Stream
	}
	if req.Context != nil {
		payload["context"] = req.Context
	}

	jsonData, err := json.Marshal(payload)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	httpReq, err := http.NewRequestWithContext(ctx, "POST", a.config.Endpoint, bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	httpReq.Header.Set("Content-Type", "application/json")

	// Add API key if provided
	if a.config.APIKey != "" {
		// Check if custom auth header is specified
		authHeader := a.config.Headers["Authorization"]
		if authHeader != "" {
			httpReq.Header.Set("Authorization", authHeader)
		} else {
			httpReq.Header.Set("Authorization", "Bearer "+a.config.APIKey)
		}
	}

	// Add all custom headers
	for k, v := range a.config.Headers {
		if k != "Authorization" && k != "model" {
			httpReq.Header.Set(k, v)
		}
	}

	resp, err := a.client.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("API error (status %d): %s", resp.StatusCode, string(body))
	}

	// Try to parse as structured response
	var result struct {
		Response string                 `json:"response"`
		Content  string                 `json:"content"`
		Text     string                 `json:"text"`
		Answer   string                 `json:"answer"`
		Usage    *TokenUsage            `json:"usage"`
		Model    string                 `json:"model"`
		Metadata map[string]interface{} `json:"metadata"`
	}

	if err := json.Unmarshal(body, &result); err == nil {
		// Use the first non-empty content field
		content := result.Response
		if content == "" {
			content = result.Content
		}
		if content == "" {
			content = result.Text
		}
		if content == "" {
			content = result.Answer
		}

		return &AgentResponse{
			Content:  content,
			Usage:    result.Usage,
			Model:    result.Model,
			Metadata: result.Metadata,
		}, nil
	}

	// If parsing fails, return raw response
	return &AgentResponse{
		Content: string(body),
	}, nil
}

func (a *CustomAgent) HealthCheck(ctx context.Context) error {
	// Try health endpoint first
	healthURL := a.config.Endpoint
	if len(healthURL) > 5 && healthURL[len(healthURL)-5:] == "/chat" {
		healthURL = healthURL[:len(healthURL)-5] + "/health"
	} else if len(healthURL) > 4 && healthURL[len(healthURL)-4:] == "/api" {
		healthURL = healthURL + "/health"
	}

	httpReq, err := http.NewRequestWithContext(ctx, "GET", healthURL, nil)
	if err != nil {
		return a.tryMainEndpoint(ctx)
	}

	if a.config.APIKey != "" {
		authHeader := a.config.Headers["Authorization"]
		if authHeader != "" {
			httpReq.Header.Set("Authorization", authHeader)
		} else {
			httpReq.Header.Set("Authorization", "Bearer "+a.config.APIKey)
		}
	}

	resp, err := a.client.Do(httpReq)
	if err != nil {
		return a.tryMainEndpoint(ctx)
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusOK || resp.StatusCode == http.StatusNotFound {
		return nil
	}

	return a.tryMainEndpoint(ctx)
}

func (a *CustomAgent) tryMainEndpoint(ctx context.Context) error {
	// Try a minimal ping request
	payload := map[string]interface{}{
		"message": "ping",
	}
	jsonData, _ := json.Marshal(payload)

	httpReq, err := http.NewRequestWithContext(ctx, "POST", a.config.Endpoint, bytes.NewBuffer(jsonData))
	if err != nil {
		return err
	}

	httpReq.Header.Set("Content-Type", "application/json")
	if a.config.APIKey != "" {
		authHeader := a.config.Headers["Authorization"]
		if authHeader != "" {
			httpReq.Header.Set("Authorization", authHeader)
		} else {
			httpReq.Header.Set("Authorization", "Bearer "+a.config.APIKey)
		}
	}

	resp, err := a.client.Do(httpReq)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	// Any response means endpoint is reachable
	return nil
}

func (a *CustomAgent) GetConfig() *AgentConfig {
	return a.config
}

