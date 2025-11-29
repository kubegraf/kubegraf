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

package ai

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"sync"
	"time"
)

// ProviderType represents the AI provider type
type ProviderType string

const (
	ProviderOpenAI    ProviderType = "openai"
	ProviderAnthropic ProviderType = "anthropic"
	ProviderOllama    ProviderType = "ollama"
	ProviderBedrock   ProviderType = "bedrock"
	ProviderVertex    ProviderType = "vertex"
)

// Message represents a chat message
type Message struct {
	Role      string     `json:"role"` // system, user, assistant
	Content   string     `json:"content"`
	ToolCalls []ToolCall `json:"tool_calls,omitempty"`
}

// ToolCall represents a tool/function call from the AI
type ToolCall struct {
	ID       string `json:"id"`
	Type     string `json:"type"` // function
	Function struct {
		Name      string `json:"name"`
		Arguments string `json:"arguments"`
	} `json:"function"`
}

// Tool represents a tool the AI can use (MCP-style)
type Tool struct {
	Name        string          `json:"name"`
	Description string          `json:"description"`
	InputSchema json.RawMessage `json:"input_schema"`
}

// ChatRequest represents a chat completion request
type ChatRequest struct {
	Messages    []Message `json:"messages"`
	Tools       []Tool    `json:"tools,omitempty"`
	Model       string    `json:"model,omitempty"`
	Temperature float64   `json:"temperature,omitempty"`
	MaxTokens   int       `json:"max_tokens,omitempty"`
	Stream      bool      `json:"stream,omitempty"`
}

// ChatResponse represents a chat completion response
type ChatResponse struct {
	ID      string    `json:"id"`
	Model   string    `json:"model"`
	Message Message   `json:"message"`
	Usage   TokenUsage `json:"usage"`
}

// TokenUsage represents token usage statistics
type TokenUsage struct {
	PromptTokens     int `json:"prompt_tokens"`
	CompletionTokens int `json:"completion_tokens"`
	TotalTokens      int `json:"total_tokens"`
}

// StreamChunk represents a streaming response chunk
type StreamChunk struct {
	ID    string `json:"id"`
	Delta struct {
		Content   string     `json:"content,omitempty"`
		ToolCalls []ToolCall `json:"tool_calls,omitempty"`
	} `json:"delta"`
	FinishReason string `json:"finish_reason,omitempty"`
}

// Provider interface for AI providers
type Provider interface {
	Chat(ctx context.Context, req *ChatRequest) (*ChatResponse, error)
	ChatStream(ctx context.Context, req *ChatRequest) (<-chan StreamChunk, error)
	GetModel() string
	GetProviderType() ProviderType
}

// ProviderConfig holds configuration for a provider
type ProviderConfig struct {
	Type     ProviderType `json:"type"`
	APIKey   string       `json:"api_key,omitempty"`
	Endpoint string       `json:"endpoint,omitempty"`
	Model    string       `json:"model,omitempty"`
	Region   string       `json:"region,omitempty"`
	Project  string       `json:"project,omitempty"`
}

// =============================================================================
// OpenAI Provider
// =============================================================================

type OpenAIProvider struct {
	apiKey   string
	endpoint string
	model    string
	client   *http.Client
}

func NewOpenAIProvider(config *ProviderConfig) *OpenAIProvider {
	apiKey := config.APIKey
	if apiKey == "" {
		apiKey = os.Getenv("OPENAI_API_KEY")
	}

	endpoint := config.Endpoint
	if endpoint == "" {
		endpoint = "https://api.openai.com/v1"
	}

	model := config.Model
	if model == "" {
		model = "gpt-4o"
	}

	return &OpenAIProvider{
		apiKey:   apiKey,
		endpoint: endpoint,
		model:    model,
		client:   &http.Client{Timeout: 120 * time.Second},
	}
}

func (p *OpenAIProvider) GetModel() string          { return p.model }
func (p *OpenAIProvider) GetProviderType() ProviderType { return ProviderOpenAI }

func (p *OpenAIProvider) Chat(ctx context.Context, req *ChatRequest) (*ChatResponse, error) {
	if req.Model == "" {
		req.Model = p.model
	}

	// Convert to OpenAI format
	openaiReq := map[string]any{
		"model":    req.Model,
		"messages": req.Messages,
	}

	if len(req.Tools) > 0 {
		tools := make([]map[string]any, len(req.Tools))
		for i, t := range req.Tools {
			tools[i] = map[string]any{
				"type": "function",
				"function": map[string]any{
					"name":        t.Name,
					"description": t.Description,
					"parameters":  json.RawMessage(t.InputSchema),
				},
			}
		}
		openaiReq["tools"] = tools
	}

	if req.Temperature > 0 {
		openaiReq["temperature"] = req.Temperature
	}
	if req.MaxTokens > 0 {
		openaiReq["max_tokens"] = req.MaxTokens
	}

	body, _ := json.Marshal(openaiReq)

	httpReq, _ := http.NewRequestWithContext(ctx, "POST", p.endpoint+"/chat/completions", bytes.NewReader(body))
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Authorization", "Bearer "+p.apiKey)

	resp, err := p.client.Do(httpReq)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		bodyBytes, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("OpenAI API error: %s - %s", resp.Status, string(bodyBytes))
	}

	var openaiResp struct {
		ID      string `json:"id"`
		Model   string `json:"model"`
		Choices []struct {
			Message struct {
				Role      string     `json:"role"`
				Content   string     `json:"content"`
				ToolCalls []ToolCall `json:"tool_calls,omitempty"`
			} `json:"message"`
			FinishReason string `json:"finish_reason"`
		} `json:"choices"`
		Usage TokenUsage `json:"usage"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&openaiResp); err != nil {
		return nil, err
	}

	if len(openaiResp.Choices) == 0 {
		return nil, fmt.Errorf("no response from OpenAI")
	}

	return &ChatResponse{
		ID:    openaiResp.ID,
		Model: openaiResp.Model,
		Message: Message{
			Role:      openaiResp.Choices[0].Message.Role,
			Content:   openaiResp.Choices[0].Message.Content,
			ToolCalls: openaiResp.Choices[0].Message.ToolCalls,
		},
		Usage: openaiResp.Usage,
	}, nil
}

func (p *OpenAIProvider) ChatStream(ctx context.Context, req *ChatRequest) (<-chan StreamChunk, error) {
	req.Stream = true
	ch := make(chan StreamChunk)
	// Implementation for streaming...
	close(ch)
	return ch, nil
}

// =============================================================================
// Anthropic Provider (Claude)
// =============================================================================

type AnthropicProvider struct {
	apiKey   string
	endpoint string
	model    string
	client   *http.Client
}

func NewAnthropicProvider(config *ProviderConfig) *AnthropicProvider {
	apiKey := config.APIKey
	if apiKey == "" {
		apiKey = os.Getenv("ANTHROPIC_API_KEY")
	}

	endpoint := config.Endpoint
	if endpoint == "" {
		endpoint = "https://api.anthropic.com/v1"
	}

	model := config.Model
	if model == "" {
		model = "claude-sonnet-4-20250514"
	}

	return &AnthropicProvider{
		apiKey:   apiKey,
		endpoint: endpoint,
		model:    model,
		client:   &http.Client{Timeout: 120 * time.Second},
	}
}

func (p *AnthropicProvider) GetModel() string          { return p.model }
func (p *AnthropicProvider) GetProviderType() ProviderType { return ProviderAnthropic }

func (p *AnthropicProvider) Chat(ctx context.Context, req *ChatRequest) (*ChatResponse, error) {
	if req.Model == "" {
		req.Model = p.model
	}

	// Extract system message and convert to Anthropic format
	var systemPrompt string
	var messages []map[string]any

	for _, msg := range req.Messages {
		if msg.Role == "system" {
			systemPrompt = msg.Content
		} else {
			messages = append(messages, map[string]any{
				"role":    msg.Role,
				"content": msg.Content,
			})
		}
	}

	anthropicReq := map[string]any{
		"model":      req.Model,
		"messages":   messages,
		"max_tokens": 4096,
	}

	if systemPrompt != "" {
		anthropicReq["system"] = systemPrompt
	}

	if len(req.Tools) > 0 {
		tools := make([]map[string]any, len(req.Tools))
		for i, t := range req.Tools {
			tools[i] = map[string]any{
				"name":         t.Name,
				"description":  t.Description,
				"input_schema": json.RawMessage(t.InputSchema),
			}
		}
		anthropicReq["tools"] = tools
	}

	body, _ := json.Marshal(anthropicReq)

	httpReq, _ := http.NewRequestWithContext(ctx, "POST", p.endpoint+"/messages", bytes.NewReader(body))
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("x-api-key", p.apiKey)
	httpReq.Header.Set("anthropic-version", "2023-06-01")

	resp, err := p.client.Do(httpReq)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		bodyBytes, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("Anthropic API error: %s - %s", resp.Status, string(bodyBytes))
	}

	var anthropicResp struct {
		ID      string `json:"id"`
		Model   string `json:"model"`
		Content []struct {
			Type  string `json:"type"`
			Text  string `json:"text,omitempty"`
			ID    string `json:"id,omitempty"`
			Name  string `json:"name,omitempty"`
			Input any    `json:"input,omitempty"`
		} `json:"content"`
		StopReason string `json:"stop_reason"`
		Usage      struct {
			InputTokens  int `json:"input_tokens"`
			OutputTokens int `json:"output_tokens"`
		} `json:"usage"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&anthropicResp); err != nil {
		return nil, err
	}

	// Extract text content and tool uses
	var content string
	var toolCalls []ToolCall

	for _, c := range anthropicResp.Content {
		switch c.Type {
		case "text":
			content = c.Text
		case "tool_use":
			argsJSON, _ := json.Marshal(c.Input)
			toolCalls = append(toolCalls, ToolCall{
				ID:   c.ID,
				Type: "function",
				Function: struct {
					Name      string `json:"name"`
					Arguments string `json:"arguments"`
				}{
					Name:      c.Name,
					Arguments: string(argsJSON),
				},
			})
		}
	}

	return &ChatResponse{
		ID:    anthropicResp.ID,
		Model: anthropicResp.Model,
		Message: Message{
			Role:      "assistant",
			Content:   content,
			ToolCalls: toolCalls,
		},
		Usage: TokenUsage{
			PromptTokens:     anthropicResp.Usage.InputTokens,
			CompletionTokens: anthropicResp.Usage.OutputTokens,
			TotalTokens:      anthropicResp.Usage.InputTokens + anthropicResp.Usage.OutputTokens,
		},
	}, nil
}

func (p *AnthropicProvider) ChatStream(ctx context.Context, req *ChatRequest) (<-chan StreamChunk, error) {
	ch := make(chan StreamChunk)
	close(ch)
	return ch, nil
}

// =============================================================================
// Ollama Provider (Local)
// =============================================================================

type OllamaProvider struct {
	endpoint string
	model    string
	client   *http.Client
}

func NewOllamaProvider(config *ProviderConfig) *OllamaProvider {
	endpoint := config.Endpoint
	if endpoint == "" {
		endpoint = "http://localhost:11434"
	}

	model := config.Model
	if model == "" {
		model = "llama3.2"
	}

	return &OllamaProvider{
		endpoint: endpoint,
		model:    model,
		client:   &http.Client{Timeout: 300 * time.Second}, // Longer timeout for local inference
	}
}

func (p *OllamaProvider) GetModel() string          { return p.model }
func (p *OllamaProvider) GetProviderType() ProviderType { return ProviderOllama }

func (p *OllamaProvider) Chat(ctx context.Context, req *ChatRequest) (*ChatResponse, error) {
	if req.Model == "" {
		req.Model = p.model
	}

	// Convert to Ollama format
	ollamaReq := map[string]any{
		"model":    req.Model,
		"messages": req.Messages,
		"stream":   false,
	}

	body, _ := json.Marshal(ollamaReq)

	httpReq, _ := http.NewRequestWithContext(ctx, "POST", p.endpoint+"/api/chat", bytes.NewReader(body))
	httpReq.Header.Set("Content-Type", "application/json")

	resp, err := p.client.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("Ollama connection error (is Ollama running?): %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		bodyBytes, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("Ollama API error: %s - %s", resp.Status, string(bodyBytes))
	}

	var ollamaResp struct {
		Model   string `json:"model"`
		Message struct {
			Role    string `json:"role"`
			Content string `json:"content"`
		} `json:"message"`
		Done              bool `json:"done"`
		TotalDuration     int  `json:"total_duration"`
		EvalCount         int  `json:"eval_count"`
		PromptEvalCount   int  `json:"prompt_eval_count"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&ollamaResp); err != nil {
		return nil, err
	}

	return &ChatResponse{
		ID:    fmt.Sprintf("ollama-%d", time.Now().UnixNano()),
		Model: ollamaResp.Model,
		Message: Message{
			Role:    ollamaResp.Message.Role,
			Content: ollamaResp.Message.Content,
		},
		Usage: TokenUsage{
			PromptTokens:     ollamaResp.PromptEvalCount,
			CompletionTokens: ollamaResp.EvalCount,
			TotalTokens:      ollamaResp.PromptEvalCount + ollamaResp.EvalCount,
		},
	}, nil
}

func (p *OllamaProvider) ChatStream(ctx context.Context, req *ChatRequest) (<-chan StreamChunk, error) {
	ch := make(chan StreamChunk)
	close(ch)
	return ch, nil
}

// =============================================================================
// AI Engine - Multi-provider manager
// =============================================================================

type AIEngine struct {
	providers    map[ProviderType]Provider
	activeProvider ProviderType
	tools        []Tool
	mu           sync.RWMutex
}

func NewAIEngine() *AIEngine {
	return &AIEngine{
		providers: make(map[ProviderType]Provider),
	}
}

func (e *AIEngine) RegisterProvider(provider Provider) {
	e.mu.Lock()
	defer e.mu.Unlock()
	e.providers[provider.GetProviderType()] = provider
	if e.activeProvider == "" {
		e.activeProvider = provider.GetProviderType()
	}
}

func (e *AIEngine) SetActiveProvider(providerType ProviderType) error {
	e.mu.Lock()
	defer e.mu.Unlock()
	if _, ok := e.providers[providerType]; !ok {
		return fmt.Errorf("provider %s not registered", providerType)
	}
	e.activeProvider = providerType
	return nil
}

func (e *AIEngine) GetActiveProvider() Provider {
	e.mu.RLock()
	defer e.mu.RUnlock()
	return e.providers[e.activeProvider]
}

func (e *AIEngine) RegisterTools(tools []Tool) {
	e.mu.Lock()
	defer e.mu.Unlock()
	e.tools = append(e.tools, tools...)
}

func (e *AIEngine) Chat(ctx context.Context, messages []Message) (*ChatResponse, error) {
	provider := e.GetActiveProvider()
	if provider == nil {
		return nil, fmt.Errorf("no active AI provider")
	}

	e.mu.RLock()
	tools := e.tools
	e.mu.RUnlock()

	return provider.Chat(ctx, &ChatRequest{
		Messages: messages,
		Tools:    tools,
	})
}

// =============================================================================
// Kubernetes-specific AI Tools (MCP-style)
// =============================================================================

func GetKubernetesTools() []Tool {
	return []Tool{
		{
			Name:        "get_pods",
			Description: "List pods in a namespace. Returns pod names, status, and resource usage.",
			InputSchema: json.RawMessage(`{
				"type": "object",
				"properties": {
					"namespace": {"type": "string", "description": "Kubernetes namespace (empty for all)"},
					"label_selector": {"type": "string", "description": "Label selector (e.g., app=nginx)"}
				}
			}`),
		},
		{
			Name:        "get_deployments",
			Description: "List deployments in a namespace. Returns deployment names, replicas, and status.",
			InputSchema: json.RawMessage(`{
				"type": "object",
				"properties": {
					"namespace": {"type": "string", "description": "Kubernetes namespace"}
				}
			}`),
		},
		{
			Name:        "describe_pod",
			Description: "Get detailed information about a specific pod including events and conditions.",
			InputSchema: json.RawMessage(`{
				"type": "object",
				"properties": {
					"name": {"type": "string", "description": "Pod name"},
					"namespace": {"type": "string", "description": "Kubernetes namespace"}
				},
				"required": ["name", "namespace"]
			}`),
		},
		{
			Name:        "get_pod_logs",
			Description: "Get logs from a pod. Useful for debugging issues.",
			InputSchema: json.RawMessage(`{
				"type": "object",
				"properties": {
					"name": {"type": "string", "description": "Pod name"},
					"namespace": {"type": "string", "description": "Kubernetes namespace"},
					"container": {"type": "string", "description": "Container name (optional)"},
					"tail": {"type": "integer", "description": "Number of lines to return"}
				},
				"required": ["name", "namespace"]
			}`),
		},
		{
			Name:        "diagnose_pod",
			Description: "Analyze a pod's status and suggest fixes for common issues.",
			InputSchema: json.RawMessage(`{
				"type": "object",
				"properties": {
					"name": {"type": "string", "description": "Pod name"},
					"namespace": {"type": "string", "description": "Kubernetes namespace"}
				},
				"required": ["name", "namespace"]
			}`),
		},
		{
			Name:        "scale_deployment",
			Description: "Scale a deployment to a specified number of replicas.",
			InputSchema: json.RawMessage(`{
				"type": "object",
				"properties": {
					"name": {"type": "string", "description": "Deployment name"},
					"namespace": {"type": "string", "description": "Kubernetes namespace"},
					"replicas": {"type": "integer", "description": "Number of replicas"}
				},
				"required": ["name", "namespace", "replicas"]
			}`),
		},
		{
			Name:        "generate_manifest",
			Description: "Generate a Kubernetes manifest from a natural language description.",
			InputSchema: json.RawMessage(`{
				"type": "object",
				"properties": {
					"description": {"type": "string", "description": "Natural language description of the resource"}
				},
				"required": ["description"]
			}`),
		},
		{
			Name:        "get_events",
			Description: "Get recent Kubernetes events, optionally filtered by namespace or resource.",
			InputSchema: json.RawMessage(`{
				"type": "object",
				"properties": {
					"namespace": {"type": "string", "description": "Kubernetes namespace"},
					"resource_name": {"type": "string", "description": "Filter by resource name"}
				}
			}`),
		},
		{
			Name:        "get_resource_usage",
			Description: "Get CPU and memory usage for pods or nodes.",
			InputSchema: json.RawMessage(`{
				"type": "object",
				"properties": {
					"resource_type": {"type": "string", "enum": ["pods", "nodes"], "description": "Type of resource"},
					"namespace": {"type": "string", "description": "Kubernetes namespace (for pods)"}
				},
				"required": ["resource_type"]
			}`),
		},
		{
			Name:        "apply_manifest",
			Description: "Apply a Kubernetes manifest (YAML) to the cluster.",
			InputSchema: json.RawMessage(`{
				"type": "object",
				"properties": {
					"manifest": {"type": "string", "description": "YAML manifest content"},
					"dry_run": {"type": "boolean", "description": "Perform a dry-run only"}
				},
				"required": ["manifest"]
			}`),
		},
	}
}

// =============================================================================
// AI Chat Session
// =============================================================================

type ChatSession struct {
	ID       string    `json:"id"`
	Messages []Message `json:"messages"`
	Created  time.Time `json:"created"`
	Updated  time.Time `json:"updated"`
	Context  map[string]any `json:"context"` // Cluster context, namespace, etc.
}

type ChatManager struct {
	engine   *AIEngine
	sessions map[string]*ChatSession
	mu       sync.RWMutex
}

func NewChatManager(engine *AIEngine) *ChatManager {
	return &ChatManager{
		engine:   engine,
		sessions: make(map[string]*ChatSession),
	}
}

func (cm *ChatManager) CreateSession(ctx map[string]any) *ChatSession {
	session := &ChatSession{
		ID:       fmt.Sprintf("chat-%d", time.Now().UnixNano()),
		Messages: []Message{},
		Created:  time.Now(),
		Updated:  time.Now(),
		Context:  ctx,
	}

	// Add system prompt with Kubernetes context
	systemPrompt := cm.buildSystemPrompt(ctx)
	session.Messages = append(session.Messages, Message{
		Role:    "system",
		Content: systemPrompt,
	})

	cm.mu.Lock()
	cm.sessions[session.ID] = session
	cm.mu.Unlock()

	return session
}

func (cm *ChatManager) buildSystemPrompt(ctx map[string]any) string {
	var sb strings.Builder
	sb.WriteString(`You are KubeGraf AI, an intelligent assistant for Kubernetes cluster management.

Your capabilities:
- Analyze pod status and diagnose issues
- Explain Kubernetes concepts and best practices
- Generate and validate Kubernetes manifests
- Help with scaling, deployment, and troubleshooting
- Provide resource usage insights and optimization suggestions

Current context:
`)

	if cluster, ok := ctx["cluster"].(string); ok {
		sb.WriteString(fmt.Sprintf("- Cluster: %s\n", cluster))
	}
	if namespace, ok := ctx["namespace"].(string); ok {
		sb.WriteString(fmt.Sprintf("- Namespace: %s\n", namespace))
	}

	sb.WriteString(`
When using tools, always explain what you're doing and interpret the results for the user.
Be concise but thorough. If you need more information, ask clarifying questions.
For dangerous operations (delete, scale down), always warn the user first.
`)

	return sb.String()
}

func (cm *ChatManager) SendMessage(sessionID, content string) (*ChatResponse, error) {
	cm.mu.Lock()
	session, ok := cm.sessions[sessionID]
	if !ok {
		cm.mu.Unlock()
		return nil, fmt.Errorf("session not found")
	}

	// Add user message
	session.Messages = append(session.Messages, Message{
		Role:    "user",
		Content: content,
	})
	session.Updated = time.Now()
	cm.mu.Unlock()

	// Get AI response
	ctx := context.Background()
	resp, err := cm.engine.Chat(ctx, session.Messages)
	if err != nil {
		return nil, err
	}

	// Add assistant response
	cm.mu.Lock()
	session.Messages = append(session.Messages, resp.Message)
	cm.mu.Unlock()

	return resp, nil
}

func (cm *ChatManager) GetSession(sessionID string) (*ChatSession, bool) {
	cm.mu.RLock()
	defer cm.mu.RUnlock()
	session, ok := cm.sessions[sessionID]
	return session, ok
}
