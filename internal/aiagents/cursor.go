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

// CursorAgent implements AgentInterface for Cursor IDE AI
// Cursor typically runs a local server or uses OpenAI API
type CursorAgent struct {
	config    *AgentConfig
	client    *http.Client
	connected bool
}

// NewCursorAgent creates a new Cursor agent
func NewCursorAgent(config *AgentConfig) *CursorAgent {
	if config == nil {
		config = &AgentConfig{
			ID:          "cursor-default",
			Name:        "Cursor AI",
			Type:        AgentTypeCursor,
			Endpoint:    "http://localhost:3001/api/chat", // Default Cursor local server
			Timeout:     30 * time.Second,
			Enabled:     true,
			Description: "Cursor IDE AI assistant",
			Icon:        "cursor",
		}
	}

	return &CursorAgent{
		config: config,
		client: &http.Client{
			Timeout: config.Timeout,
		},
		connected: false,
	}
}

func (a *CursorAgent) ID() string {
	return a.config.ID
}

func (a *CursorAgent) Name() string {
	return a.config.Name
}

func (a *CursorAgent) Type() AgentType {
	return AgentTypeCursor
}

func (a *CursorAgent) Connect(ctx context.Context) error {
	if err := a.HealthCheck(ctx); err != nil {
		return fmt.Errorf("failed to connect to Cursor: %w", err)
	}
	a.connected = true
	a.config.Status = AgentStatusConnected
	return nil
}

func (a *CursorAgent) Disconnect() error {
	a.connected = false
	a.config.Status = AgentStatusDisconnected
	return nil
}

func (a *CursorAgent) IsConnected() bool {
	return a.connected
}

func (a *CursorAgent) Query(ctx context.Context, req *AgentRequest) (*AgentResponse, error) {
	if !a.config.Enabled {
		return nil, fmt.Errorf("agent %s is not enabled", a.config.ID)
	}

	// Cursor API format (adjust based on actual Cursor API)
	payload := map[string]interface{}{
		"message": req.Message,
		"stream":  req.Stream,
	}

	if req.Model != "" {
		payload["model"] = req.Model
	}
	if req.MaxTokens > 0 {
		payload["max_tokens"] = req.MaxTokens
	}

	// Add context if provided
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
		httpReq.Header.Set("Authorization", "Bearer "+a.config.APIKey)
	}

	// Add custom headers
	for k, v := range a.config.Headers {
		httpReq.Header.Set(k, v)
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

	// Parse Cursor response format
	var result struct {
		Response string                 `json:"response"`
		Content  string                 `json:"content"`
		Usage    *TokenUsage            `json:"usage"`
		Model    string                 `json:"model"`
		Metadata map[string]interface{} `json:"metadata"`
	}

	if err := json.Unmarshal(body, &result); err != nil {
		// If parsing fails, try to use raw response
		content := string(body)
		if result.Response != "" {
			content = result.Response
		} else if result.Content != "" {
			content = result.Content
		}

		return &AgentResponse{
			Content:  content,
			Usage:    result.Usage,
			Model:    result.Model,
			Metadata: result.Metadata,
		}, nil
	}

	content := result.Response
	if content == "" {
		content = result.Content
	}

	return &AgentResponse{
		Content:  content,
		Usage:    result.Usage,
		Model:    result.Model,
		Metadata: result.Metadata,
	}, nil
}

func (a *CursorAgent) HealthCheck(ctx context.Context) error {
	// Try to connect to Cursor's health endpoint or main endpoint
	healthURL := a.config.Endpoint
	if healthURL == "" {
		healthURL = "http://localhost:3001/api/health"
	} else {
		// Replace /chat with /health if possible
		if len(healthURL) > 5 && healthURL[len(healthURL)-5:] == "/chat" {
			healthURL = healthURL[:len(healthURL)-5] + "/health"
		}
	}

	httpReq, err := http.NewRequestWithContext(ctx, "GET", healthURL, nil)
	if err != nil {
		return err
	}

	if a.config.APIKey != "" {
		httpReq.Header.Set("Authorization", "Bearer "+a.config.APIKey)
	}

	resp, err := a.client.Do(httpReq)
	if err != nil {
		// If health endpoint doesn't exist, try the main endpoint with a minimal request
		return a.tryMainEndpoint(ctx)
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusOK || resp.StatusCode == http.StatusNotFound {
		// Health endpoint exists or main endpoint is reachable
		return nil
	}

	return fmt.Errorf("health check failed with status %d", resp.StatusCode)
}

func (a *CursorAgent) tryMainEndpoint(ctx context.Context) error {
	// Try a minimal request to the main endpoint
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
		httpReq.Header.Set("Authorization", "Bearer "+a.config.APIKey)
	}

	resp, err := a.client.Do(httpReq)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	// Any response means the endpoint is reachable
	return nil
}

func (a *CursorAgent) GetConfig() *AgentConfig {
	return a.config
}

