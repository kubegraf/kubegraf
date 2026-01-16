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
	"fmt"
	"strings"
)

// FallbackProvider provides basic intent parsing without LLM
type FallbackProvider struct{}

// NewFallbackProvider creates a new fallback provider
func NewFallbackProvider() *FallbackProvider {
	return &FallbackProvider{}
}

// IsAvailable always returns true for fallback provider
func (f *FallbackProvider) IsAvailable() bool {
	return true
}

// GetModelName returns "fallback" as the model name
func (f *FallbackProvider) GetModelName() string {
	return "fallback"
}

// GenerateResponse generates a simple response without LLM
func (f *FallbackProvider) GenerateResponse(ctx context.Context, prompt string) (string, error) {
	// For fallback, just return a simple JSON structure
	// This would normally be parsed by the intent parser
	return `{"intent": "query", "resource": "unknown", "name": "", "namespace": "default", "confidence": 0.5}`, nil
}

// SimpleIntentParser provides rule-based intent parsing
type SimpleIntentParser struct{}

// Ensure SimpleIntentParser implements IntentParser interface
var _ IntentParser = (*SimpleIntentParser)(nil)

// NewSimpleIntentParser creates a new simple intent parser
func NewSimpleIntentParser() *SimpleIntentParser {
	return &SimpleIntentParser{}
}

// ParseQuery analyzes natural language query using simple rules
func (p *SimpleIntentParser) ParseQuery(ctx context.Context, query string) (*Intent, error) {
	query = strings.ToLower(strings.TrimSpace(query))
	
	intent := &Intent{
		Type:       "query",
		Resource:   "unknown",
		Name:       "",
		Namespace:  "default",
		Parameters: make(map[string]string),
		Confidence: 0.7,
	}

	// Simple pattern matching for common queries
	if strings.Contains(query, "health") || strings.Contains(query, "status") {
		intent.Type = "health"
		intent.Confidence = 0.8
	}
	
	if strings.Contains(query, "logs") {
		intent.Type = "logs"
		intent.Confidence = 0.9
	}
	
	if strings.Contains(query, "rollback") {
		intent.Type = "rollback"
		intent.Confidence = 0.7
	}
	
	if strings.Contains(query, "restart") {
		intent.Type = "restart"
		intent.Confidence = 0.8
	}
	
	if strings.Contains(query, "scale") {
		intent.Type = "scale"
		intent.Confidence = 0.7
		
		// Try to extract replica count
		if strings.Contains(query, " to ") {
			parts := strings.Split(query, " to ")
			if len(parts) > 1 {
				replicaPart := strings.TrimSpace(parts[1])
				// Extract number from replicaPart
				var number string
				for _, char := range replicaPart {
					if char >= '0' && char <= '9' {
						number += string(char)
					}
				}
				if number != "" {
					intent.Parameters["replicas"] = number
				}
			}
		}
	}

	// Resource detection
	resources := []string{"pod", "deployment", "service", "ingress", "configmap", "secret", "node", "namespace", "statefulset", "daemonset"}
	for _, resource := range resources {
		if strings.Contains(query, resource) {
			intent.Resource = resource
			break
		}
	}

	// Namespace detection (improved)
	if strings.Contains(query, "namespace") {
		parts := strings.Split(query, "namespace")
		if len(parts) > 1 {
			afterNamespace := strings.TrimSpace(parts[1])
			// Extract the first word after "namespace" that looks like a valid namespace name
			words := strings.Fields(afterNamespace)
			for _, word := range words {
				if isKubernetesNamePart(word) && len(word) > 2 {
					intent.Namespace = word
					break
				}
			}
		}
	}

	// Name extraction (improved)
	// Look for patterns like "pod nginx" or "deployment my-app" or full pod names
	words := strings.Fields(query)
	
	// Remove words that come after "namespace" to avoid including them in the name
	filteredWords := []string{}
	includeWord := true
	for _, word := range words {
		if word == "namespace" {
			includeWord = false
			continue
		}
		if !includeWord {
			break // Stop including words after "namespace"
		}
		filteredWords = append(filteredWords, word)
	}
	
	// First try: look for resource type followed by name
	for i, word := range filteredWords {
		if word == intent.Resource && i+1 < len(filteredWords) {
			// Take the next word as the name
			nameCandidate := filteredWords[i+1]
			
			// Special handling for "to" in scaling commands
			if intent.Type == "scale" && nameCandidate == "to" && i+2 < len(filteredWords) {
				// Skip "to" and take the next word
				if i+2 < len(filteredWords) {
					nameCandidate = filteredWords[i+2]
				}
			}
			
			// Only use this as name if it looks like a valid Kubernetes name
			if isKubernetesNamePart(nameCandidate) && len(nameCandidate) > 2 {
				intent.Name = nameCandidate
				break
			}
		}
	}
	
	// Second try: look for any word that looks like a Kubernetes resource name
	if intent.Name == "" || len(intent.Name) < 3 {
		for _, word := range filteredWords {
			if isKubernetesResourceName(word) {
				intent.Name = word
				break
			}
		}
	}

	// If no specific resource name found, try to find any name-like word
	if intent.Name == "" {
		for _, word := range words {
			// Skip common words and resource types
			if word == "check" || word == "health" || word == "status" || word == "of" || 
			   word == "in" || word == "the" || word == "my" || word == "show" || 
			   word == "get" || word == "list" || word == "namespace" {
				continue
			}
			// Check if it looks like a resource name (contains letters/numbers/hyphens)
			if len(word) > 2 && !strings.Contains(word, "pod") && !strings.Contains(word, "deployment") {
				intent.Name = word
				break
			}
		}
	}

	return intent, nil
}

// SimpleResponseGenerator provides basic response generation
type SimpleResponseGenerator struct{}

// NewSimpleResponseGenerator creates a new simple response generator
func NewSimpleResponseGenerator() *SimpleResponseGenerator {
	return &SimpleResponseGenerator{}
}

// GenerateExplanation creates a simple explanation
func (g *SimpleResponseGenerator) GenerateExplanation(ctx context.Context, intent *Intent, data map[string]interface{}) (string, error) {
	switch intent.Type {
	case "health":
		if intent.Resource == "pod" && intent.Name != "" {
			return fmt.Sprintf("Checking health status for pod '%s' in namespace '%s'...", intent.Name, intent.Namespace), nil
		}
		return fmt.Sprintf("Checking health status for %s resources in namespace '%s'...", intent.Resource, intent.Namespace), nil
	case "logs":
		return fmt.Sprintf("Retrieving logs for %s '%s' in namespace '%s'...", intent.Resource, intent.Name, intent.Namespace), nil
	case "rollback":
		return fmt.Sprintf("Preparing rollback for %s '%s' in namespace '%s'...", intent.Resource, intent.Name, intent.Namespace), nil
	case "restart":
		return fmt.Sprintf("Preparing restart for %s '%s' in namespace '%s'...", intent.Resource, intent.Name, intent.Namespace), nil
	case "scale":
		replicas := intent.Parameters["replicas"]
		if replicas != "" {
			return fmt.Sprintf("Preparing to scale %s '%s' to %s replicas in namespace '%s'...", intent.Resource, intent.Name, replicas, intent.Namespace), nil
		}
		return fmt.Sprintf("Preparing scaling for %s '%s' in namespace '%s'...", intent.Resource, intent.Name, intent.Namespace), nil
	default:
		return fmt.Sprintf("Processing your query about %s '%s' in namespace '%s'...", intent.Resource, intent.Name, intent.Namespace), nil
	}
}

// isKubernetesNamePart checks if a word could be part of a Kubernetes resource name
func isKubernetesNamePart(word string) bool {
	if len(word) < 2 || len(word) > 20 {
		return false
	}
	// Kubernetes names can contain lowercase letters, numbers, and hyphens
	for _, char := range word {
		if !((char >= 'a' && char <= 'z') || (char >= '0' && char <= '9') || char == '-') {
			return false
		}
	}
	return true
}

// isKubernetesResourceName checks if a word looks like a complete Kubernetes resource name
func isKubernetesResourceName(word string) bool {
	if len(word) < 5 || len(word) > 63 {
		return false
	}
	// Should contain at least one hyphen (common in K8s names) and be alphanumeric + hyphens
	hasHyphen := false
	for _, char := range word {
		if !((char >= 'a' && char <= 'z') || (char >= '0' && char <= '9') || char == '-') {
			return false
		}
		if char == '-' {
			hasHyphen = true
		}
	}
	return hasHyphen
}