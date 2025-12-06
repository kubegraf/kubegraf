// Copyright 2025 KubeGraf Contributors
// SPDX-License-Identifier: Apache-2.0

package tools

import (
	"github.com/kubegraf/kubegraf/mcp/registry"
	"github.com/kubegraf/kubegraf/mcp/types"
	"github.com/kubegraf/kubegraf/mcp/tools/ai"
	"github.com/kubegraf/kubegraf/mcp/tools/kubernetes"
)

// RegisterAllTools registers all available MCP tools
func RegisterAllTools(registry *registry.ToolRegistry, app interface{}) error {
	// Register Kubernetes tools
	if err := RegisterKubernetesTools(registry, app); err != nil {
		return err
	}

	// Register AI tools
	if err := RegisterAITools(registry, app); err != nil {
		return err
	}

	// Register Security tools
	if err := RegisterSecurityTools(registry, app); err != nil {
		return err
	}

	// Register Cost tools
	if err := RegisterCostTools(registry, app); err != nil {
		return err
	}

	// Register Diagnostics tools
	if err := RegisterDiagnosticsTools(registry, app); err != nil {
		return err
	}

	return nil
}

// RegisterKubernetesTools registers only Kubernetes-related tools
func RegisterKubernetesTools(registry *registry.ToolRegistry, app interface{}) error {
	tools := []types.ToolHandler{
		kubernetes.NewKubectlGetTool(app),
		kubernetes.NewKubectlDescribeTool(app),
		kubernetes.NewKubectlLogsTool(app),
		// Add more Kubernetes tools here
	}

	for _, tool := range tools {
		if err := registry.RegisterTool(tool); err != nil {
			return err
		}
	}

	return nil
}

// RegisterAITools registers AI-related tools
func RegisterAITools(registry *registry.ToolRegistry, app interface{}) error {
	tools := []types.ToolHandler{
		ai.NewAnalyzePodTool(app),
		// Add more AI tools here
	}

	for _, tool := range tools {
		if err := registry.RegisterTool(tool); err != nil {
			return err
		}
	}

	return nil
}

// RegisterSecurityTools registers security-related tools
func RegisterSecurityTools(registry *registry.ToolRegistry, app interface{}) error {
	// Security tools will be implemented later
	return nil
}

// RegisterCostTools registers cost-related tools
func RegisterCostTools(registry *registry.ToolRegistry, app interface{}) error {
	// Cost tools will be implemented later
	return nil
}

// RegisterDiagnosticsTools registers diagnostics-related tools
func RegisterDiagnosticsTools(registry *registry.ToolRegistry, app interface{}) error {
	// Diagnostics tools will be implemented later
	return nil
}
