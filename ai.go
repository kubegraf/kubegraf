// Copyright 2025 KubeGraf Contributors
// SPDX-License-Identifier: Apache-2.0

package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
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

// AIConfig holds AI configuration
type AIConfig struct {
	Provider            string        // "ollama", "openai", "claude"
	OllamaURL           string        // Default: http://localhost:11434
	OllamaModel         string        // Default: auto-detected or llama3.1
	KeepAlive           time.Duration // Default: 5m - how long to keep model loaded after last request
	AutoStart           bool          // Default: false - do NOT preload on app startup
	HealthCheckEndpoint string        // Default: "version" - use /api/version for health checks
	MaxIdleConns        int           // Default: 2 - max idle connections in HTTP client
	IdleConnTimeout     time.Duration // Default: 30s - timeout for idle connections
	OpenAIKey           string
	OpenAIModel         string // Default: gpt-4o-mini
	ClaudeKey           string
	ClaudeModel         string // Default: claude-3-haiku-20240307
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

// detectOllamaModel attempts to auto-detect an available Ollama model
// Returns the first available model, or empty string if none found
func detectOllamaModel(url string) string {
	models, err := getAvailableOllamaModels(url)
	if err != nil || len(models) == 0 {
		return ""
	}

	// Prefer llama3.1, llama3.2, or any llama model, otherwise return first available
	preferredOrder := []string{"llama3.1:latest", "llama3.1", "llama3.2:latest", "llama3.2", "llama3:latest", "llama3"}

	for _, preferred := range preferredOrder {
		for _, model := range models {
			if model == preferred {
				return model
			}
		}
	}

	// Check for any llama model
	for _, model := range models {
		if strings.Contains(strings.ToLower(model), "llama") {
			return model
		}
	}

	// Return first available model
	return models[0]
}

// DefaultAIConfig returns the default AI configuration
func DefaultAIConfig() *AIConfig {
	ollamaURL := getAIEnvOrDefault("KUBEGRAF_OLLAMA_URL", "http://127.0.0.1:11434")

	// Get model from environment, or auto-detect, or use fallback
	modelFromEnv := os.Getenv("KUBEGRAF_OLLAMA_MODEL")
	var ollamaModel string

	if modelFromEnv != "" {
		ollamaModel = modelFromEnv
	} else {
		// Try to auto-detect available models (only if AUTOSTART is enabled)
		// Otherwise, just use fallback to avoid loading models on startup
		autoStart := getAIEnvBoolOrDefault("KUBEGRAF_AI_AUTOSTART", false)
		if autoStart {
			detectedModel := detectOllamaModel(ollamaURL)
			if detectedModel != "" {
				ollamaModel = detectedModel
			} else {
				ollamaModel = "llama3.1:latest"
			}
		} else {
			// Don't call detectOllamaModel on startup - just use fallback
			ollamaModel = getAIEnvOrDefault("KUBEGRAF_AI_MODEL", "llama3.1:latest")
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

	return &AIConfig{
		Provider:            "ollama",
		OllamaURL:           ollamaURL,
		OllamaModel:         ollamaModel,
		KeepAlive:           keepAlive,
		AutoStart:           getAIEnvBoolOrDefault("KUBEGRAF_AI_AUTOSTART", false),
		HealthCheckEndpoint: getAIEnvOrDefault("KUBEGRAF_AI_HEALTHCHECK", "version"),
		MaxIdleConns:        maxIdleConns,
		IdleConnTimeout:     idleConnTimeout,
		OpenAIKey:           os.Getenv("OPENAI_API_KEY"),
		OpenAIModel:         getAIEnvOrDefault("KUBEGRAF_OPENAI_MODEL", "gpt-4o-mini"),
		ClaudeKey:           os.Getenv("ANTHROPIC_API_KEY"),
		ClaudeModel:         getAIEnvOrDefault("KUBEGRAF_CLAUDE_MODEL", "claude-3-haiku-20240307"),
	}
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

// NewAIAssistant creates a new AI assistant with auto-detection
func NewAIAssistant(config *AIConfig) *AIAssistant {
	if config == nil {
		config = DefaultAIConfig()
	}

	assistant := &AIAssistant{config: config}

	// Try providers in order: Ollama (local), OpenAI, Claude
	providers := []AIProvider{
		NewOllamaProvider(config.OllamaURL, config.OllamaModel, config.KeepAlive, config.MaxIdleConns, config.IdleConnTimeout),
		NewOpenAIProvider(config.OpenAIKey, config.OpenAIModel),
		NewClaudeProvider(config.ClaudeKey, config.ClaudeModel),
	}

	// Select the first available provider
	// Only check availability if AUTOSTART is enabled, otherwise defer until first query
	if config.AutoStart {
		for _, p := range providers {
			if p.IsAvailable() {
				assistant.provider = p
				break
			}
		}
	}
	// If AutoStart is false, provider remains nil until first query
	// This prevents any API calls (including /api/version) on startup

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

	// Lazy check: try to find an available provider and set it
	// This is safe because health checks use /api/version (doesn't load models)
	providers := []AIProvider{
		NewOllamaProvider(a.config.OllamaURL, a.config.OllamaModel, a.config.KeepAlive, a.config.MaxIdleConns, a.config.IdleConnTimeout),
		NewOpenAIProvider(a.config.OpenAIKey, a.config.OpenAIModel),
		NewClaudeProvider(a.config.ClaudeKey, a.config.ClaudeModel),
	}

	for _, p := range providers {
		if p.IsAvailable() {
			// Set the provider so ProviderName() can return the correct name
			// This is safe because IsAvailable() only calls /api/version (doesn't load models)
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
	// Lazy initialization - if provider is not set, find one now (only when user makes a query)
	if a.provider == nil {
		providers := []AIProvider{
			NewOllamaProvider(a.config.OllamaURL, a.config.OllamaModel, a.config.KeepAlive, a.config.MaxIdleConns, a.config.IdleConnTimeout),
			NewOpenAIProvider(a.config.OpenAIKey, a.config.OpenAIModel),
			NewClaudeProvider(a.config.ClaudeKey, a.config.ClaudeModel),
		}

		for _, p := range providers {
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

// OllamaProvider implements the AIProvider interface for Ollama
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
