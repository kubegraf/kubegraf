// Copyright 2025 KubeGraf Contributors
// SPDX-License-Identifier: Apache-2.0

package kubernetes

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

	"github.com/kubegraf/kubegraf/mcp/types"
)

// KubectlDescribeTool implements the kubectl_describe MCP tool
type KubectlDescribeTool struct {
	*types.BaseTool
	app AppInterface
}

// NewKubectlDescribeTool creates a new kubectl_describe tool
func NewKubectlDescribeTool(app interface{}) *KubectlDescribeTool {
	var appInterface AppInterface
	if a, ok := app.(AppInterface); ok {
		appInterface = a
	}
	
	tool := &KubectlDescribeTool{
		BaseTool: types.NewBaseTool(
			"kubectl_describe",
			"Get detailed information about a Kubernetes resource",
			map[string]interface{}{
				"type": "object",
				"properties": map[string]interface{}{
					"kind": map[string]interface{}{
						"type":        "string",
						"description": "Resource kind",
					},
					"name": map[string]interface{}{
						"type":        "string",
						"description": "Resource name",
					},
					"namespace": map[string]interface{}{
						"type":        "string",
						"description": "Namespace",
					},
				},
				"required": []string{"kind", "name"},
			},
			types.CategoryKubernetes,
		),
		app: appInterface,
	}
	return tool
}

// Execute implements the kubectl_describe tool logic
func (t *KubectlDescribeTool) Execute(ctx context.Context, args json.RawMessage) (*types.MCPToolResult, error) {
	var params struct {
		Kind      string `json:"kind"`
		Name      string `json:"name"`
		Namespace string `json:"namespace,omitempty"`
	}

	if err := json.Unmarshal(args, &params); err != nil {
		return nil, fmt.Errorf("invalid arguments: %v", err)
	}

	// Check if we have a valid app instance
	if t.app == nil {
		return nil, fmt.Errorf("app instance not available")
	}

	// Check if connected to cluster
	if !t.app.IsConnected() {
		return nil, fmt.Errorf("not connected to cluster")
	}

	// Normalize kind to handle case variations
	kind := strings.Title(strings.ToLower(params.Kind))
	if kind == "" {
		return nil, fmt.Errorf("kind parameter is required")
	}

	// Set default namespace if not provided
	namespace := params.Namespace
	if namespace == "" {
		namespace = "default"
	}

	// For now, return a simple response
	// In a real implementation, we would use t.app.GetClientset() to access Kubernetes API
	result := fmt.Sprintf("kubectl_describe would show detailed information for %s/%s in namespace '%s'", 
		kind, params.Name, namespace)
	result += "\n\nNote: This is a placeholder implementation. The actual Kubernetes API integration needs to be implemented."

	return &types.MCPToolResult{
		Content: []types.MCPContent{{Type: "text", Text: result}},
	}, nil
}

// Validate checks if the tool can be executed
func (t *KubectlDescribeTool) Validate(ctx context.Context) error {
	// Check if we have a valid app instance
	if t.app == nil {
		return fmt.Errorf("app instance not available")
	}
	
	// Check if connected to cluster
	if !t.app.IsConnected() {
		return fmt.Errorf("not connected to Kubernetes cluster")
	}
	
	return nil
}
