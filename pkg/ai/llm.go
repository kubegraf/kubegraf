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
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os/exec"
	"strings"
	"time"
)

// LLMProvider defines the interface for local LLM integration
type LLMProvider interface {
	GenerateResponse(ctx context.Context, prompt string) (string, error)
	IsAvailable() bool
	GetModelName() string
}

// OllamaProvider implements LLMProvider using Ollama
type OllamaProvider struct {
	modelName string
	timeout   time.Duration
}

// NewOllamaProvider creates a new Ollama provider
func NewOllamaProvider(modelName string) *OllamaProvider {
	return &OllamaProvider{
		modelName: modelName,
		timeout:   30 * time.Second,
	}
}

// IsAvailable checks if Ollama is running and accessible
func (o *OllamaProvider) IsAvailable() bool {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	
	cmd := exec.CommandContext(ctx, "ollama", "list")
	err := cmd.Run()
	return err == nil
}

// GetModelName returns the configured model name
func (o *OllamaProvider) GetModelName() string {
	return o.modelName
}

// GenerateResponse generates a response using Ollama
func (o *OllamaProvider) GenerateResponse(ctx context.Context, prompt string) (string, error) {
	ctx, cancel := context.WithTimeout(ctx, o.timeout)
	defer cancel()
	
	args := []string{"run", o.modelName, prompt}
	cmd := exec.CommandContext(ctx, "ollama", args...)
	
	output, err := cmd.Output()
	if err != nil {
		return "", fmt.Errorf("ollama execution failed: %w", err)
	}
	
	return strings.TrimSpace(string(output)), nil
}

// Intent represents parsed user intent from natural language query
type Intent struct {
	Type       string            `json:"type"`        // query, action, rollback, scale, etc.
	Resource   string            `json:"resource"`    // pod, deployment, service, etc.
	Name       string            `json:"name"`        // resource name
	Namespace  string            `json:"namespace"`   // kubernetes namespace
	Action     string            `json:"action"`      // specific action to perform
	Parameters map[string]string `json:"parameters"`  // additional parameters
	Confidence float64           `json:"confidence"`  // confidence score 0-1
}

// IntentParser interface for parsing natural language queries
type IntentParser interface {
	ParseQuery(ctx context.Context, query string) (*Intent, error)
}

// QueryIntentParser parses natural language queries into structured intents
type QueryIntentParser struct {
	llm LLMProvider
}

// NewQueryIntentParser creates a new intent parser
func NewQueryIntentParser(llm LLMProvider) *QueryIntentParser {
	return &QueryIntentParser{llm: llm}
}

// ParseQuery analyzes natural language query and extracts intent
func (p *QueryIntentParser) ParseQuery(ctx context.Context, query string) (*Intent, error) {
	prompt := fmt.Sprintf(`
You are a Kubernetes expert assistant. Analyze the following user query and extract the intent, target resources, and any specific parameters.

User Query: "%s"

Please respond with a JSON object containing:
- type: The intent type (query, action, rollback, scale, restart, delete, describe, logs, health)
- resource: The Kubernetes resource type (pod, deployment, service, ingress, configmap, secret, node, namespace)
- name: The specific resource name (if mentioned)
- namespace: The namespace (if mentioned, default to "default")
- action: The specific action (if applicable)
- parameters: Any additional parameters as key-value pairs
- confidence: Your confidence in this interpretation (0.0 to 1.0)

Common patterns:
- "Why is X failing?" → type: "query", action: "diagnose"
- "Rollback X" → type: "rollback"
- "Scale X to Y" → type: "scale", parameters: {"replicas": "Y"}
- "Check health of X" → type: "health"
- "Show logs for X" → type: "logs"
- "Restart X" → type: "restart"

Respond only with the JSON object, no additional text.`, query)

	response, err := p.llm.GenerateResponse(ctx, prompt)
	if err != nil {
		return nil, fmt.Errorf("failed to parse intent: %w", err)
	}

	var intent Intent
	if err := json.Unmarshal([]byte(response), &intent); err != nil {
		// Fallback to simple parsing if LLM response is not valid JSON
		log.Printf("Failed to parse LLM response as JSON, using fallback: %v", err)
		return p.fallbackParse(query), nil
	}

	// Validate and normalize the intent
	p.normalizeIntent(&intent)
	
	return &intent, nil
}

// fallbackParse provides simple rule-based parsing when LLM fails
func (p *QueryIntentParser) fallbackParse(query string) *Intent {
	query = strings.ToLower(query)
	intent := &Intent{
		Type:       "query",
		Resource:   "unknown",
		Namespace:  "default",
		Parameters: make(map[string]string),
		Confidence: 0.5,
	}

	// Simple pattern matching
	if strings.Contains(query, "rollback") {
		intent.Type = "rollback"
		intent.Confidence = 0.7
	}
	if strings.Contains(query, "scale") {
		intent.Type = "scale"
		intent.Confidence = 0.7
	}
	if strings.Contains(query, "restart") {
		intent.Type = "restart"
		intent.Confidence = 0.7
	}
	if strings.Contains(query, "logs") {
		intent.Type = "logs"
		intent.Confidence = 0.8
	}
	if strings.Contains(query, "health") || strings.Contains(query, "status") {
		intent.Type = "health"
		intent.Confidence = 0.8
	}

	// Resource detection
	resources := []string{"pod", "deployment", "service", "ingress", "configmap", "secret", "node", "namespace", "statefulset", "daemonset"}
	for _, resource := range resources {
		if strings.Contains(query, resource) {
			intent.Resource = resource
			break
		}
	}

	// Namespace detection
	if strings.Contains(query, "namespace") {
		parts := strings.Split(query, "namespace")
		if len(parts) > 1 {
			namespace := strings.TrimSpace(parts[1])
			if namespace != "" {
				intent.Namespace = namespace
			}
		}
	}

	return intent
}

// normalizeIntent validates and normalizes intent fields
func (p *QueryIntentParser) normalizeIntent(intent *Intent) {
	// Ensure namespace is set
	if intent.Namespace == "" {
		intent.Namespace = "default"
	}

	// Validate resource type
	validResources := map[string]bool{
		"pod": true, "deployment": true, "service": true, "ingress": true,
		"configmap": true, "secret": true, "node": true, "namespace": true,
		"statefulset": true, "daemonset": true, "job": true, "cronjob": true,
	}

	if !validResources[intent.Resource] {
		intent.Resource = "unknown"
		intent.Confidence *= 0.8 // Reduce confidence for unknown resources
	}

	// Validate intent type
	validTypes := map[string]bool{
		"query": true, "action": true, "rollback": true, "scale": true,
		"restart": true, "delete": true, "describe": true, "logs": true,
		"health": true,
	}

	if !validTypes[intent.Type] {
		intent.Type = "query"
		intent.Confidence *= 0.8
	}

	// Ensure confidence is within bounds
	if intent.Confidence < 0 {
		intent.Confidence = 0
	} else if intent.Confidence > 1 {
		intent.Confidence = 1
	}
}

// ResponseGenerator generates natural language responses based on Kubernetes data
type ResponseGenerator struct {
	llm LLMProvider
}

// NewResponseGenerator creates a new response generator
func NewResponseGenerator(llm LLMProvider) *ResponseGenerator {
	return &ResponseGenerator{llm: llm}
}

// GenerateExplanation creates a human-readable explanation of Kubernetes issues
func (g *ResponseGenerator) GenerateExplanation(ctx context.Context, intent *Intent, data map[string]interface{}) (string, error) {
	prompt := fmt.Sprintf(`
You are a Kubernetes expert assistant. Based on the user's intent and the following cluster data, provide a clear, human-readable explanation of what's happening and what should be done.

User Intent: %s (%.1f%% confidence)
Resource: %s
Name: %s
Namespace: %s

Cluster Data:
%s

Please provide:
1. A brief summary of the current state
2. Any issues or problems identified
3. Specific recommendations for action
4. Confidence level in your assessment

Keep the response concise but informative, suitable for a DevOps engineer.`,
		intent.Type, intent.Confidence*100, intent.Resource, intent.Name, intent.Namespace,
		formatDataForLLM(data))

	response, err := g.llm.GenerateResponse(ctx, prompt)
	if err != nil {
		return "", fmt.Errorf("failed to generate explanation: %w", err)
	}

	return response, nil
}

// formatDataForLLM formats Kubernetes data for LLM consumption
func formatDataForLLM(data map[string]interface{}) string {
	var result strings.Builder
	
	for key, value := range data {
		result.WriteString(fmt.Sprintf("%s: %v\n", key, value))
	}
	
	return result.String()
}