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

// AppInterface defines the methods needed by MCP tools
type AppInterface interface {
	GetClientset() interface{}
	IsConnected() bool
}

// KubectlGetTool implements the kubectl_get MCP tool
type KubectlGetTool struct {
	*types.BaseTool
	app AppInterface
}

// NewKubectlGetTool creates a new kubectl_get tool
func NewKubectlGetTool(app interface{}) *KubectlGetTool {
	var appInterface AppInterface
	if a, ok := app.(AppInterface); ok {
		appInterface = a
	}

	tool := &KubectlGetTool{
		BaseTool: types.NewBaseTool(
			"kubectl_get",
			"Get Kubernetes resources (pods, deployments, services, etc.)",
			map[string]interface{}{
				"type": "object",
				"properties": map[string]interface{}{
					"kind": map[string]interface{}{
						"type":        "string",
						"description": "Resource kind (Pod, Deployment, Service, etc.)",
					},
					"name": map[string]interface{}{
						"type":        "string",
						"description": "Resource name (optional)",
					},
					"namespace": map[string]interface{}{
						"type":        "string",
						"description": "Namespace (optional, use 'default' if not specified)",
					},
				},
				"required": []string{"kind"},
			},
			types.CategoryKubernetes,
		),
		app: appInterface,
	}
	return tool
}

// Execute implements the kubectl_get tool logic
func (t *KubectlGetTool) Execute(ctx context.Context, args json.RawMessage) (*types.MCPToolResult, error) {
	var params struct {
		Kind      string `json:"kind"`
		Name      string `json:"name,omitempty"`
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

	// Normalize kind to handle case variations (Pod, pod, POD)
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
	result := fmt.Sprintf("kubectl_get would retrieve %s resources", kind)
	if params.Name != "" {
		result += fmt.Sprintf(" named '%s'", params.Name)
	}
	result += fmt.Sprintf(" in namespace '%s'", namespace)
	result += "\n\nNote: This is a placeholder implementation. The actual Kubernetes API integration needs to be implemented."

	return &types.MCPToolResult{
		Content: []types.MCPContent{{Type: "text", Text: result}},
	}, nil
}

// Validate checks if the tool can be executed
func (t *KubectlGetTool) Validate(ctx context.Context) error {
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
