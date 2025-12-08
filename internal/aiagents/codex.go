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

// CodexAgent implements AgentInterface for OpenAI Codex
type CodexAgent struct {
	config   *AgentConfig
	client   *http.Client
	connected bool
}

// NewCodexAgent creates a new Codex agent
func NewCodexAgent(config *AgentConfig) *CodexAgent {
	if config == nil {
		config = &AgentConfig{
			ID:          "codex-default",
			Name:        "OpenAI Codex",
			Type:        AgentTypeCodex,
			Endpoint:    "https://api.openai.com/v1/completions",
			Timeout:     30 * time.Second,
			Enabled:     true,
			Description: "OpenAI Codex for code generation and completion",
			Icon:        "codex",
		}
	}

	return &CodexAgent{
		config: config,
		client: &http.Client{
			Timeout: config.Timeout,
		},
		connected: false,
	}
}

func (a *CodexAgent) ID() string {
	return a.config.ID
}

func (a *CodexAgent) Name() string {
	return a.config.Name
}

func (a *CodexAgent) Type() AgentType {
	return AgentTypeCodex
}

func (a *CodexAgent) Connect(ctx context.Context) error {
	// Test connection with a simple health check
	if err := a.HealthCheck(ctx); err != nil {
		return fmt.Errorf("failed to connect to Codex: %w", err)
	}
	a.connected = true
	a.config.Status = AgentStatusConnected
	return nil
}

func (a *CodexAgent) Disconnect() error {
	a.connected = false
	a.config.Status = AgentStatusDisconnected
	return nil
}

func (a *CodexAgent) IsConnected() bool {
	return a.connected
}

func (a *CodexAgent) Query(ctx context.Context, req *AgentRequest) (*AgentResponse, error) {
	if !a.config.Enabled {
		return nil, fmt.Errorf("agent %s is not enabled", a.config.ID)
	}

	// Codex uses OpenAI's completion API
	payload := map[string]interface{}{
		"model":       a.config.Headers["model"],
		"prompt":      req.Message,
		"max_tokens":  req.MaxTokens,
		"temperature": 0.7,
	}

	if payload["model"] == nil || payload["model"] == "" {
		payload["model"] = "code-davinci-002"
	}
	if payload["max_tokens"] == nil || payload["max_tokens"] == 0 {
		payload["max_tokens"] = 1000
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
	httpReq.Header.Set("Authorization", "Bearer "+a.config.APIKey)

	// Add custom headers
	for k, v := range a.config.Headers {
		if k != "model" {
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

	var result struct {
		Choices []struct {
			Text string `json:"text"`
		} `json:"choices"`
		Usage struct {
			PromptTokens     int `json:"prompt_tokens"`
			CompletionTokens int `json:"completion_tokens"`
			TotalTokens      int `json:"total_tokens"`
		} `json:"usage"`
		Model string `json:"model"`
	}

	if err := json.Unmarshal(body, &result); err != nil {
		return nil, fmt.Errorf("failed to parse response: %w", err)
	}

	content := ""
	if len(result.Choices) > 0 {
		content = result.Choices[0].Text
	}

	return &AgentResponse{
		Content: content,
		Usage: &TokenUsage{
			PromptTokens:     result.Usage.PromptTokens,
			CompletionTokens: result.Usage.CompletionTokens,
			TotalTokens:      result.Usage.TotalTokens,
		},
		Model: result.Model,
	}, nil
}

func (a *CodexAgent) HealthCheck(ctx context.Context) error {
	// Simple health check - try to list models
	httpReq, err := http.NewRequestWithContext(ctx, "GET", "https://api.openai.com/v1/models", nil)
	if err != nil {
		return err
	}

	if a.config.APIKey != "" {
		httpReq.Header.Set("Authorization", "Bearer "+a.config.APIKey)
	}

	resp, err := a.client.Do(httpReq)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("health check failed with status %d", resp.StatusCode)
	}

	return nil
}

func (a *CodexAgent) GetConfig() *AgentConfig {
	return a.config
}

