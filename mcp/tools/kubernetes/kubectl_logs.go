// Copyright 2025 KubeGraf Contributors
// SPDX-License-Identifier: Apache-2.0

package kubernetes

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/kubegraf/kubegraf/mcp/types"
)

// KubectlLogsTool implements the kubectl_logs MCP tool
type KubectlLogsTool struct {
	*types.BaseTool
	app AppInterface
}

// NewKubectlLogsTool creates a new kubectl_logs tool
func NewKubectlLogsTool(app interface{}) *KubectlLogsTool {
	var appInterface AppInterface
	if a, ok := app.(AppInterface); ok {
		appInterface = a
	}
	
	tool := &KubectlLogsTool{
		BaseTool: types.NewBaseTool(
			"kubectl_logs",
			"Get logs from a pod",
			map[string]interface{}{
				"type": "object",
				"properties": map[string]interface{}{
					"pod": map[string]interface{}{
						"type":        "string",
						"description": "Pod name",
					},
					"namespace": map[string]interface{}{
						"type":        "string",
						"description": "Namespace",
					},
					"container": map[string]interface{}{
						"type":        "string",
						"description": "Container name (optional)",
					},
					"tail": map[string]interface{}{
						"type":        "integer",
						"description": "Number of lines to tail (default: 100)",
					},
				},
				"required": []string{"pod", "namespace"},
			},
			types.CategoryKubernetes,
		),
		app: appInterface,
	}
	return tool
}

// Execute implements the kubectl_logs tool logic
func (t *KubectlLogsTool) Execute(ctx context.Context, args json.RawMessage) (*types.MCPToolResult, error) {
	var params struct {
		Pod       string `json:"pod"`
		Namespace string `json:"namespace"`
		Container string `json:"container,omitempty"`
		Tail      int    `json:"tail,omitempty"`
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

	// Set default tail if not provided
	if params.Tail == 0 {
		params.Tail = 100
	}

	// For now, return a simple response
	// In a real implementation, we would use t.app.GetClientset() to access Kubernetes API
	result := fmt.Sprintf("kubectl_logs would retrieve logs from pod '%s' in namespace '%s'", 
		params.Pod, params.Namespace)
	if params.Container != "" {
		result += fmt.Sprintf(" for container '%s'", params.Container)
	}
	result += fmt.Sprintf(" (tail: %d lines)", params.Tail)
	result += "\n\nNote: This is a placeholder implementation. The actual Kubernetes API integration needs to be implemented."

	return &types.MCPToolResult{
		Content: []types.MCPContent{{Type: "text", Text: result}},
	}, nil
}

// Validate checks if the tool can be executed
func (t *KubectlLogsTool) Validate(ctx context.Context) error {
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
