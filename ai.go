// Copyright 2025 KubeGraf Contributors
// SPDX-License-Identifier: Apache-2.0

package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"
	"sync"
	"time"
)

// AIProvider represents an AI provider interface
type AIProvider interface {
	Name() string
	Query(ctx context.Context, prompt string) (string, error)
	IsAvailable() bool
}

// AIConfig holds AI configuration.
//
// Provider priority (highest → lowest):
//   1. Orkas AI Cloud  — set ORKAS_API_KEY (future hosted service, zero user setup)
//   2. Anthropic Claude — set ANTHROPIC_API_KEY
//   3. OpenAI           — set OPENAI_API_KEY
//   4. Ollama local     — auto-detects any installed model, no preset required
//   5. None             — pattern-based fallbacks, no errors shown to user
type AIConfig struct {
	// Orkas AI Cloud (future primary provider — hosted by the Orkas team)
	OrkasAPIKey string // env: ORKAS_API_KEY
	OrkasAPIURL string // env: ORKAS_API_URL  (default: https://api.orkas.ai)

	// Ollama local — model auto-detected from /api/tags, no default baked in
	OllamaURL   string        // env: KUBEGRAF_OLLAMA_URL  (default: http://127.0.0.1:11434)
	OllamaModel string        // auto-detected; override via KUBEGRAF_OLLAMA_MODEL
	KeepAlive   time.Duration // env: KUBEGRAF_AI_KEEP_ALIVE (default: 5m)
	AutoStart   bool          // env: KUBEGRAF_AI_AUTOSTART  (default: false)

	// HTTP tuning for Ollama
	HealthCheckEndpoint string
	MaxIdleConns        int
	IdleConnTimeout     time.Duration

	// Cloud provider API keys + optional model overrides
	OpenAIKey   string // env: OPENAI_API_KEY
	OpenAIModel string // env: KUBEGRAF_OPENAI_MODEL  (default: gpt-4o-mini)
	ClaudeKey   string // env: ANTHROPIC_API_KEY
	ClaudeModel string // env: KUBEGRAF_CLAUDE_MODEL  (default: claude-3-haiku-20240307)
	GeminiKey   string // env: GEMINI_API_KEY
	GeminiModel string // env: KUBEGRAF_GEMINI_MODEL  (default: gemini-2.0-flash)
}

// getAvailableOllamaModels fetches the list of available models from Ollama
// NOTE: This uses /api/tags which may trigger model loading. Only call when necessary.
func getAvailableOllamaModels(url string) ([]string, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	req, err := http.NewRequestWithContext(ctx, "GET", url+"/api/tags", nil)
	if err != nil {
		return nil, err
	}

	client := &http.Client{Timeout: 3 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("ollama returned status %d", resp.StatusCode)
	}

	var result struct {
		Models []struct {
			Name string `json:"name"`
		} `json:"models"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}

	models := make([]string, 0, len(result.Models))
	for _, m := range result.Models {
		models = append(models, m.Name)
	}

	return models, nil
}

// detectOllamaModel returns the first text-generation model found in Ollama.
// Embedding-only models (nomic-embed-text, all-minilm, etc.) are skipped because
// they do not support the /api/generate endpoint.
// No model names or versions are hardcoded — KubeGraf uses whatever is installed.
// Override with KUBEGRAF_OLLAMA_MODEL if you want a specific model.
func detectOllamaModel(url string) string {
	models, err := getAvailableOllamaModels(url)
	if err != nil || len(models) == 0 {
		return ""
	}

	// Skip models whose names indicate they are embedding-only.
	// These cannot handle text generation requests.
	isEmbeddingModel := func(name string) bool {
		n := strings.ToLower(name)
		return strings.Contains(n, "embed") ||
			strings.Contains(n, "minilm") ||
			strings.Contains(n, "bge-") ||
			strings.Contains(n, "e5-")
	}

	for _, m := range models {
		if !isEmbeddingModel(m) {
			return m
		}
	}
	return "" // only embedding models installed — cannot generate text
}

// DefaultAIConfig returns the AI configuration resolved from environment variables.
// No model names or versions are hardcoded — everything is discovered or configured by the user.
func DefaultAIConfig() *AIConfig {
	ollamaURL := getAIEnvOrDefault("KUBEGRAF_OLLAMA_URL", "http://127.0.0.1:11434")

	// Ollama model: explicit env var wins; otherwise auto-detect from installed models.
	// KUBEGRAF_AI_MODEL is kept as a legacy alias.
	var ollamaModel string
	if v := os.Getenv("KUBEGRAF_OLLAMA_MODEL"); v != "" {
		ollamaModel = v // explicit pin — always honoured
	} else if v := os.Getenv("KUBEGRAF_AI_MODEL"); v != "" {
		ollamaModel = v // legacy alias
	} else {
		// Auto-detect: list installed models and pick the first text-generation one.
		// If multiple models are installed, log them so the user can pin one via
		// KUBEGRAF_OLLAMA_MODEL (useful when the auto-detected model is too large).
		allModels, _ := getAvailableOllamaModels(ollamaURL)
		ollamaModel = detectOllamaModel(ollamaURL)
		if ollamaModel != "" && len(allModels) > 1 {
			log.Printf("[AI] Multiple Ollama models found: %v", allModels)
			log.Printf("[AI] Auto-selected: %s — set KUBEGRAF_OLLAMA_MODEL=<name> to override", ollamaModel)
		}
	}

	// Parse keep-alive duration (default: 5m)
	keepAliveStr := getAIEnvOrDefault("KUBEGRAF_AI_KEEP_ALIVE", "5m")
	keepAlive, err := time.ParseDuration(keepAliveStr)
	if err != nil {
		keepAlive = 5 * time.Minute
	}

	// Parse idle connection timeout (default: 30s)
	idleConnTimeoutStr := getAIEnvOrDefault("KUBEGRAF_AI_IDLE_CONN_TIMEOUT", "30s")
	idleConnTimeout, err := time.ParseDuration(idleConnTimeoutStr)
	if err != nil {
		idleConnTimeout = 30 * time.Second
	}

	// Parse max idle connections (default: 2)
	maxIdleConns := 2
	if val := os.Getenv("KUBEGRAF_AI_MAX_IDLE_CONNS"); val != "" {
		if parsed, err := strconv.Atoi(val); err == nil && parsed > 0 {
			maxIdleConns = parsed
		}
	}

	cfg := &AIConfig{
		// Orkas AI Cloud — future primary provider
		OrkasAPIKey: os.Getenv("ORKAS_API_KEY"),
		OrkasAPIURL: getAIEnvOrDefault("ORKAS_API_URL", "https://api.orkas.ai"),

		// Ollama local
		OllamaURL:           ollamaURL,
		OllamaModel:         ollamaModel,
		KeepAlive:           keepAlive,
		AutoStart:           getAIEnvBoolOrDefault("KUBEGRAF_AI_AUTOSTART", false),
		HealthCheckEndpoint: getAIEnvOrDefault("KUBEGRAF_AI_HEALTHCHECK", "version"),
		MaxIdleConns:        maxIdleConns,
		IdleConnTimeout:     idleConnTimeout,

		// Cloud provider keys + optional model pins
		OpenAIKey:   os.Getenv("OPENAI_API_KEY"),
		OpenAIModel: getAIEnvOrDefault("KUBEGRAF_OPENAI_MODEL", "gpt-4o-mini"),
		ClaudeKey:   os.Getenv("ANTHROPIC_API_KEY"),
		ClaudeModel: getAIEnvOrDefault("KUBEGRAF_CLAUDE_MODEL", "claude-3-haiku-20240307"),
		GeminiKey:   os.Getenv("GEMINI_API_KEY"),
		GeminiModel: getAIEnvOrDefault("KUBEGRAF_GEMINI_MODEL", "gemini-2.0-flash"),
	}

	// Log the active AI backend clearly on startup
	switch {
	case cfg.OrkasAPIKey != "":
		log.Printf("[AI] Provider: Orkas AI Cloud (%s)", cfg.OrkasAPIURL)
	case cfg.GeminiKey != "":
		log.Printf("[AI] Provider: Google Gemini (model: %s)", cfg.GeminiModel)
	case cfg.ClaudeKey != "":
		log.Printf("[AI] Provider: Anthropic Claude (model: %s)", cfg.ClaudeModel)
	case cfg.OpenAIKey != "":
		log.Printf("[AI] Provider: OpenAI (model: %s)", cfg.OpenAIModel)
	case cfg.OllamaModel != "":
		log.Printf("[AI] Provider: Ollama local (model: %s @ %s)", cfg.OllamaModel, cfg.OllamaURL)
	default:
		log.Printf("[AI] No AI provider active — AI features will use pattern-based fallbacks.")
		log.Printf("[AI] To enable AI: set GEMINI_API_KEY, ORKAS_API_KEY, OPENAI_API_KEY, ANTHROPIC_API_KEY, or install Ollama locally.")
	}

	return cfg
}

func getAIEnvBoolOrDefault(key string, defaultVal bool) bool {
	if val := os.Getenv(key); val != "" {
		if parsed, err := strconv.ParseBool(val); err == nil {
			return parsed
		}
	}
	return defaultVal
}

func getAIEnvOrDefault(key, defaultVal string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return defaultVal
}

// AIAssistant is the main AI assistant interface
type AIAssistant struct {
	config   *AIConfig
	provider AIProvider
}

// orderedProviders returns providers in priority order:
//   Orkas Cloud → Claude → OpenAI → Ollama local
//
// This ordering means as soon as ORKAS_API_KEY is set, all queries go to
// the cloud — no local setup required. The order is intentional for the
// production roadmap: cloud first, local as optional fallback.
func orderedProviders(config *AIConfig) []AIProvider {
	return []AIProvider{
		NewOrkasCloudProvider(config.OrkasAPIKey, config.OrkasAPIURL),
		NewGeminiProvider(config.GeminiKey, config.GeminiModel),
		NewClaudeProvider(config.ClaudeKey, config.ClaudeModel),
		NewOpenAIProvider(config.OpenAIKey, config.OpenAIModel),
		NewOllamaProvider(config.OllamaURL, config.OllamaModel, config.KeepAlive, config.MaxIdleConns, config.IdleConnTimeout),
	}
}

// NewAIAssistant creates a new AI assistant with auto-detection
func NewAIAssistant(config *AIConfig) *AIAssistant {
	if config == nil {
		config = DefaultAIConfig()
	}

	assistant := &AIAssistant{config: config}

	// Eagerly select a provider only if AUTOSTART is enabled (avoids startup latency).
	// Otherwise deferred to first query (lazy init in IsAvailable / Query).
	if config.AutoStart {
		for _, p := range orderedProviders(config) {
			if p.IsAvailable() {
				assistant.provider = p
				break
			}
		}
	}

	return assistant
}

// IsAvailable returns true if any AI provider is available
// If provider is not initialized (AutoStart=false), performs a lazy check
// and sets the provider if found (safe because we use /api/version, not /api/generate)
func (a *AIAssistant) IsAvailable() bool {
	// If provider is already set, it's available
	if a.provider != nil {
		return true
	}

	// Lazy init: walk providers in priority order, pick first available
	for _, p := range orderedProviders(a.config) {
		if p.IsAvailable() {
			a.provider = p
			return true
		}
	}

	return false
}

// ProviderName returns the name of the active provider
func (a *AIAssistant) ProviderName() string {
	if a.provider != nil {
		return a.provider.Name()
	}
	return "none"
}

// Query sends a query to the AI provider
func (a *AIAssistant) Query(ctx context.Context, prompt string) (string, error) {
	// Lazy init on first query
	if a.provider == nil {
		for _, p := range orderedProviders(a.config) {
			if p.IsAvailable() {
				a.provider = p
				break
			}
		}
	}

	if a.provider == nil {
		return "", fmt.Errorf("no AI provider available")
	}
	return a.provider.Query(ctx, prompt)
}

// AnalyzePod analyzes why a pod might be in a certain state
func (a *AIAssistant) AnalyzePod(ctx context.Context, podInfo PodAnalysisInput) (string, error) {
	prompt := buildPodAnalysisPrompt(podInfo)
	return a.Query(ctx, prompt)
}

// ExplainError provides a human-readable explanation of a Kubernetes error
func (a *AIAssistant) ExplainError(ctx context.Context, errorMsg string, resourceType string) (string, error) {
	prompt := fmt.Sprintf(`You are a Kubernetes expert. Explain this error in simple terms and provide actionable solutions.

Resource Type: %s
Error: %s

Provide:
1. What this error means (1-2 sentences)
2. Common causes (bullet points)
3. How to fix it (step-by-step)

Be concise and practical.`, resourceType, errorMsg)

	return a.Query(ctx, prompt)
}

// SuggestOptimizations analyzes resource usage and suggests improvements
func (a *AIAssistant) SuggestOptimizations(ctx context.Context, input OptimizationInput) (string, error) {
	prompt := buildOptimizationPrompt(input)
	return a.Query(ctx, prompt)
}

// PodAnalysisInput contains information about a pod for analysis
type PodAnalysisInput struct {
	Name       string
	Namespace  string
	Status     string
	Phase      string
	Conditions []string
	Events     []string
	Containers []ContainerAnalysisInfo
}

// ContainerAnalysisInfo holds container-specific information
type ContainerAnalysisInfo struct {
	Name         string
	Ready        bool
	RestartCount int
	State        string
	Reason       string
	Message      string
	Resources    ResourceAnalysisInfo
}

// ResourceAnalysisInfo holds resource usage information
type ResourceAnalysisInfo struct {
	CPURequest    string
	CPULimit      string
	MemoryRequest string
	MemoryLimit   string
	CPUUsage      string
	MemoryUsage   string
}

// OptimizationInput contains data for optimization analysis
type OptimizationInput struct {
	ResourceType    string
	Name            string
	Namespace       string
	CPUUsagePercent float64
	MemUsagePercent float64
	Replicas        int
	Events          []string
}

func buildPodAnalysisPrompt(input PodAnalysisInput) string {
	var sb strings.Builder
	sb.WriteString("You are a Kubernetes expert. Analyze this pod and explain what's happening.\n\n")
	sb.WriteString(fmt.Sprintf("Pod: %s/%s\n", input.Namespace, input.Name))
	sb.WriteString(fmt.Sprintf("Status: %s\n", input.Status))
	sb.WriteString(fmt.Sprintf("Phase: %s\n", input.Phase))

	if len(input.Conditions) > 0 {
		sb.WriteString("\nConditions:\n")
		for _, c := range input.Conditions {
			sb.WriteString(fmt.Sprintf("- %s\n", c))
		}
	}

	if len(input.Events) > 0 {
		sb.WriteString("\nRecent Events:\n")
		for _, e := range input.Events {
			sb.WriteString(fmt.Sprintf("- %s\n", e))
		}
	}

	if len(input.Containers) > 0 {
		sb.WriteString("\nContainers:\n")
		for _, c := range input.Containers {
			sb.WriteString(fmt.Sprintf("- %s: Ready=%v, Restarts=%d, State=%s\n",
				c.Name, c.Ready, c.RestartCount, c.State))
			if c.Reason != "" {
				sb.WriteString(fmt.Sprintf("  Reason: %s\n", c.Reason))
			}
			if c.Message != "" {
				sb.WriteString(fmt.Sprintf("  Message: %s\n", c.Message))
			}
		}
	}

	sb.WriteString("\nProvide:\n")
	sb.WriteString("1. A brief explanation of the pod's current state\n")
	sb.WriteString("2. The likely root cause\n")
	sb.WriteString("3. Recommended actions to fix the issue\n")
	sb.WriteString("\nBe concise and actionable.")

	return sb.String()
}

func buildOptimizationPrompt(input OptimizationInput) string {
	var sb strings.Builder
	sb.WriteString("You are a Kubernetes optimization expert. Analyze this resource and suggest improvements.\n\n")
	sb.WriteString(fmt.Sprintf("Resource: %s %s/%s\n", input.ResourceType, input.Namespace, input.Name))
	sb.WriteString(fmt.Sprintf("CPU Usage: %.1f%% of requested\n", input.CPUUsagePercent))
	sb.WriteString(fmt.Sprintf("Memory Usage: %.1f%% of requested\n", input.MemUsagePercent))
	sb.WriteString(fmt.Sprintf("Replicas: %d\n", input.Replicas))

	if len(input.Events) > 0 {
		sb.WriteString("\nRecent Events:\n")
		for _, e := range input.Events {
			sb.WriteString(fmt.Sprintf("- %s\n", e))
		}
	}

	sb.WriteString("\nProvide optimization suggestions for:\n")
	sb.WriteString("1. Resource requests/limits adjustments\n")
	sb.WriteString("2. Scaling recommendations\n")
	sb.WriteString("3. Cost savings opportunities\n")
	sb.WriteString("\nBe specific with numbers when possible.")

	return sb.String()
}

// ─────────────────────────────────────────────────────────────────────────────
// GeminiProvider — Google Gemini via REST API
//
// Set GEMINI_API_KEY to activate. Model defaults to gemini-2.0-flash.
// Override with KUBEGRAF_GEMINI_MODEL.
// ─────────────────────────────────────────────────────────────────────────────

type GeminiProvider struct {
	apiKey string
	model  string
	client *http.Client
}

func NewGeminiProvider(apiKey, model string) *GeminiProvider {
	if model == "" {
		model = "gemini-2.0-flash"
	}
	return &GeminiProvider{
		apiKey: apiKey,
		model:  model,
		client: &http.Client{Timeout: 60 * time.Second},
	}
}

func (g *GeminiProvider) Name() string      { return fmt.Sprintf("gemini (%s)", g.model) }
func (g *GeminiProvider) IsAvailable() bool { return g.apiKey != "" }

func (g *GeminiProvider) Query(ctx context.Context, prompt string) (string, error) {
	url := fmt.Sprintf(
		"https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent?key=%s",
		g.model, g.apiKey,
	)

	payload := map[string]interface{}{
		"contents": []map[string]interface{}{
			{"role": "user", "parts": []map[string]string{{"text": prompt}}},
		},
		"systemInstruction": map[string]interface{}{
			"parts": []map[string]string{
				{"text": "You are a Kubernetes expert SRE assistant. Be concise and practical."},
			},
		},
		"generationConfig": map[string]interface{}{
			"temperature":     0.7,
			"maxOutputTokens": 2048,
		},
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return "", fmt.Errorf("gemini: marshal failed: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewReader(body))
	if err != nil {
		return "", fmt.Errorf("gemini: request creation failed: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := g.client.Do(req)
	if err != nil {
		return "", fmt.Errorf("gemini: request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		b, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("gemini: status %d: %s", resp.StatusCode, string(b))
	}

	var result struct {
		Candidates []struct {
			Content struct {
				Parts []struct {
					Text string `json:"text"`
				} `json:"parts"`
			} `json:"content"`
		} `json:"candidates"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", fmt.Errorf("gemini: decode failed: %w", err)
	}
	if len(result.Candidates) == 0 || len(result.Candidates[0].Content.Parts) == 0 {
		return "", fmt.Errorf("gemini: empty response")
	}
	return strings.TrimSpace(result.Candidates[0].Content.Parts[0].Text), nil
}

// OllamaProvider implements the AIProvider interface for Ollama
// ─────────────────────────────────────────────────────────────────────────────
// OrkasCloudProvider — Orkas AI hosted service (future primary provider)
//
// When ORKAS_API_KEY is set, all AI queries are routed to the Orkas cloud
// instead of local Ollama or third-party APIs. Users need zero local setup.
//
// The request format is OpenAI-compatible so the server-side implementation
// is straightforward. The client sends a prompt; the cloud picks the best
// model version transparently — no model name needed on the client side.
// ─────────────────────────────────────────────────────────────────────────────
type OrkasCloudProvider struct {
	apiKey  string
	baseURL string
	client  *http.Client
}

func NewOrkasCloudProvider(apiKey, baseURL string) *OrkasCloudProvider {
	if baseURL == "" {
		baseURL = "https://api.orkas.ai"
	}
	return &OrkasCloudProvider{
		apiKey:  apiKey,
		baseURL: baseURL,
		client:  &http.Client{Timeout: 90 * time.Second},
	}
}

func (o *OrkasCloudProvider) Name() string    { return "Orkas AI" }
func (o *OrkasCloudProvider) IsAvailable() bool { return o.apiKey != "" }

func (o *OrkasCloudProvider) Query(ctx context.Context, prompt string) (string, error) {
	payload := map[string]interface{}{
		"messages": []map[string]string{
			{"role": "system", "content": "You are a Kubernetes expert SRE assistant. Be concise and practical."},
			{"role": "user", "content": prompt},
		},
		// No "model" field — Orkas cloud selects the best model automatically
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return "", fmt.Errorf("orkas: marshal failed: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, "POST", o.baseURL+"/v1/query", bytes.NewReader(body))
	if err != nil {
		return "", fmt.Errorf("orkas: request creation failed: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+o.apiKey)
	req.Header.Set("User-Agent", "KubeGraf/1.0")

	resp, err := o.client.Do(req)
	if err != nil {
		return "", fmt.Errorf("orkas: request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		b, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("orkas: status %d: %s", resp.StatusCode, string(b))
	}

	// Response is OpenAI-compatible: choices[0].message.content
	var result struct {
		Choices []struct {
			Message struct {
				Content string `json:"content"`
			} `json:"message"`
		} `json:"choices"`
		// Also accept a simple {answer: "..."} shape for flexibility
		Answer string `json:"answer"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", fmt.Errorf("orkas: decode failed: %w", err)
	}
	if result.Answer != "" {
		return strings.TrimSpace(result.Answer), nil
	}
	if len(result.Choices) > 0 {
		return strings.TrimSpace(result.Choices[0].Message.Content), nil
	}
	return "", fmt.Errorf("orkas: empty response")
}

// ─────────────────────────────────────────────────────────────────────────────

type OllamaProvider struct {
	url         string
	model       string
	client      *http.Client
	keepAlive   time.Duration
	lastRequest time.Time
	idleTimer   *time.Timer
	idleMu      sync.Mutex
	unloadFunc  func() error // Function to unload the model
}

var (
	// Shared HTTP client for all Ollama providers to avoid connection leaks
	sharedOllamaClient *http.Client
	sharedClientOnce   sync.Once
)

// getSharedOllamaClient returns a shared HTTP client for Ollama connections
func getSharedOllamaClient(maxIdleConns int, idleConnTimeout time.Duration) *http.Client {
	sharedClientOnce.Do(func() {
		transport := &http.Transport{
			MaxIdleConns:        maxIdleConns,
			MaxIdleConnsPerHost: maxIdleConns,
			IdleConnTimeout:     idleConnTimeout,
		}
		sharedOllamaClient = &http.Client{
			Transport: transport,
			Timeout:   60 * time.Second,
		}
	})
	return sharedOllamaClient
}

// NewOllamaProvider creates a new Ollama provider
func NewOllamaProvider(url, model string, keepAlive time.Duration, maxIdleConns int, idleConnTimeout time.Duration) *OllamaProvider {
	return &OllamaProvider{
		url:         url,
		model:       model,
		client:      getSharedOllamaClient(maxIdleConns, idleConnTimeout),
		keepAlive:   keepAlive,
		lastRequest: time.Time{}, // Zero time means no requests yet
	}
}

func (o *OllamaProvider) Name() string {
	return fmt.Sprintf("ollama (%s)", o.model)
}

func (o *OllamaProvider) IsAvailable() bool {
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	// Use /api/version for health checks - this does NOT load models
	// /api/tags can trigger model loading in some Ollama versions
	req, err := http.NewRequestWithContext(ctx, "GET", o.url+"/api/version", nil)
	if err != nil {
		return false
	}

	resp, err := o.client.Do(req)
	if err != nil {
		return false
	}
	defer resp.Body.Close()

	return resp.StatusCode == 200
}

// unloadModel unloads the model from Ollama's memory
func (o *OllamaProvider) unloadModel() error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// Use Ollama's API to stop/unload the model
	// POST /api/generate with keep_alive=0 or use /api/ps and then stop
	// For now, we'll use a simple approach: call generate with keep_alive=0
	// This is a no-op that just unloads the model
	payload := map[string]interface{}{
		"model":      o.model,
		"prompt":     "unload",
		"stream":     false,
		"keep_alive": "0", // Unload immediately after this request
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return err
	}

	req, err := http.NewRequestWithContext(ctx, "POST", o.url+"/api/generate", bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")

	// Use a short timeout for unload
	unloadClient := &http.Client{Timeout: 3 * time.Second}
	resp, err := unloadClient.Do(req)
	if err != nil {
		// Ignore errors during unload - model might already be unloaded
		return nil
	}
	defer resp.Body.Close()

	// Read and discard response
	io.Copy(io.Discard, resp.Body)
	return nil
}

// resetIdleTimer resets the idle timer to unload the model after keepAlive duration
func (o *OllamaProvider) resetIdleTimer() {
	o.idleMu.Lock()
	defer o.idleMu.Unlock()

	// Stop existing timer if any
	if o.idleTimer != nil {
		o.idleTimer.Stop()
	}

	// If keepAlive is 0 or negative, don't set up unload timer
	if o.keepAlive <= 0 {
		return
	}

	// Set up new timer
	o.idleTimer = time.AfterFunc(o.keepAlive, func() {
		// Unload model after idle period
		if err := o.unloadModel(); err != nil {
			// Log but don't fail - unload is best-effort
			// Using fmt.Printf instead of log to avoid import
			fmt.Printf("⚠️  Failed to unload Ollama model after idle period: %v\n", err)
		}
	})
}

func (o *OllamaProvider) Query(ctx context.Context, prompt string) (string, error) {
	// Update last request time and reset idle timer
	o.idleMu.Lock()
	o.lastRequest = time.Now()
	o.idleMu.Unlock()
	o.resetIdleTimer()

	// Build keep_alive parameter
	keepAliveStr := "0" // Default: unload immediately
	if o.keepAlive > 0 {
		// Convert duration to seconds for Ollama API
		keepAliveStr = fmt.Sprintf("%.0fs", o.keepAlive.Seconds())
	} else if o.keepAlive < 0 {
		// Negative means never unload
		keepAliveStr = "-1"
	}

	payload := map[string]interface{}{
		"model":      o.model,
		"prompt":     prompt,
		"stream":     false,
		"keep_alive": keepAliveStr, // Tell Ollama to keep model loaded for this duration
		"options": map[string]interface{}{
			"temperature": 0.7,
			"num_predict": 1000,
		},
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return "", fmt.Errorf("failed to marshal request: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, "POST", o.url+"/api/generate", bytes.NewReader(body))
	if err != nil {
		return "", fmt.Errorf("failed to create request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := o.client.Do(req)
	if err != nil {
		return "", fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		bodyBytes, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("ollama returned status %d: %s", resp.StatusCode, string(bodyBytes))
	}

	var result struct {
		Response string `json:"response"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", fmt.Errorf("failed to decode response: %w", err)
	}

	return strings.TrimSpace(result.Response), nil
}

// OpenAIProvider implements the AIProvider interface for OpenAI
type OpenAIProvider struct {
	apiKey string
	model  string
	client *http.Client
}

// NewOpenAIProvider creates a new OpenAI provider
func NewOpenAIProvider(apiKey, model string) *OpenAIProvider {
	return &OpenAIProvider{
		apiKey: apiKey,
		model:  model,
		client: &http.Client{
			Timeout: 60 * time.Second,
		},
	}
}

func (o *OpenAIProvider) Name() string {
	return fmt.Sprintf("openai (%s)", o.model)
}

func (o *OpenAIProvider) IsAvailable() bool {
	return o.apiKey != ""
}

func (o *OpenAIProvider) Query(ctx context.Context, prompt string) (string, error) {
	payload := map[string]interface{}{
		"model": o.model,
		"messages": []map[string]string{
			{"role": "system", "content": "You are a Kubernetes expert assistant. Be concise and practical."},
			{"role": "user", "content": prompt},
		},
		"temperature": 0.7,
		"max_tokens":  1000,
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return "", fmt.Errorf("failed to marshal request: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, "POST", "https://api.openai.com/v1/chat/completions", bytes.NewReader(body))
	if err != nil {
		return "", fmt.Errorf("failed to create request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+o.apiKey)

	resp, err := o.client.Do(req)
	if err != nil {
		return "", fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		bodyBytes, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("openai returned status %d: %s", resp.StatusCode, string(bodyBytes))
	}

	var result struct {
		Choices []struct {
			Message struct {
				Content string `json:"content"`
			} `json:"message"`
		} `json:"choices"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", fmt.Errorf("failed to decode response: %w", err)
	}

	if len(result.Choices) == 0 {
		return "", fmt.Errorf("no response from OpenAI")
	}

	return strings.TrimSpace(result.Choices[0].Message.Content), nil
}

// ClaudeProvider implements the AIProvider interface for Anthropic Claude
type ClaudeProvider struct {
	apiKey string
	model  string
	client *http.Client
}

// NewClaudeProvider creates a new Claude provider
func NewClaudeProvider(apiKey, model string) *ClaudeProvider {
	return &ClaudeProvider{
		apiKey: apiKey,
		model:  model,
		client: &http.Client{
			Timeout: 60 * time.Second,
		},
	}
}

func (c *ClaudeProvider) Name() string {
	return fmt.Sprintf("claude (%s)", c.model)
}

func (c *ClaudeProvider) IsAvailable() bool {
	return c.apiKey != ""
}

func (c *ClaudeProvider) Query(ctx context.Context, prompt string) (string, error) {
	payload := map[string]interface{}{
		"model":      c.model,
		"max_tokens": 1000,
		"messages": []map[string]string{
			{"role": "user", "content": prompt},
		},
		"system": "You are a Kubernetes expert assistant. Be concise and practical.",
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return "", fmt.Errorf("failed to marshal request: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, "POST", "https://api.anthropic.com/v1/messages", bytes.NewReader(body))
	if err != nil {
		return "", fmt.Errorf("failed to create request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("x-api-key", c.apiKey)
	req.Header.Set("anthropic-version", "2023-06-01")

	resp, err := c.client.Do(req)
	if err != nil {
		return "", fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		bodyBytes, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("claude returned status %d: %s", resp.StatusCode, string(bodyBytes))
	}

	var result struct {
		Content []struct {
			Text string `json:"text"`
		} `json:"content"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", fmt.Errorf("failed to decode response: %w", err)
	}

	if len(result.Content) == 0 {
		return "", fmt.Errorf("no response from Claude")
	}

	return strings.TrimSpace(result.Content[0].Text), nil
}
