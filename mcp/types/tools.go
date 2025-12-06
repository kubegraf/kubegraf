// Copyright 2025 KubeGraf Contributors
// SPDX-License-Identifier: Apache-2.0

package types

import (
	"context"
	"encoding/json"
	"fmt"
)

// ToolHandler is the interface that all MCP tools must implement
type ToolHandler interface {
	// Name returns the unique name of the tool
	Name() string
	
	// Description returns a human-readable description of the tool
	Description() string
	
	// InputSchema returns the JSON schema for the tool's input parameters
	InputSchema() map[string]interface{}
	
	// Execute runs the tool with the given arguments and returns the result
	Execute(ctx context.Context, args json.RawMessage) (*MCPToolResult, error)
	
	// Validate checks if the tool can be executed in the current context
	Validate(ctx context.Context) error
}

// ToolMetadata contains metadata about a tool
type ToolMetadata struct {
	Name        string                 `json:"name"`
	Description string                 `json:"description"`
	InputSchema map[string]interface{} `json:"inputSchema"`
	Category    string                 `json:"category,omitempty"`
	Tags        []string               `json:"tags,omitempty"`
	Version     string                 `json:"version,omitempty"`
}

// ToolCategory represents a category of tools
type ToolCategory string

const (
	CategoryKubernetes ToolCategory = "kubernetes"
	CategoryAI         ToolCategory = "ai"
	CategorySecurity   ToolCategory = "security"
	CategoryCost       ToolCategory = "cost"
	CategoryDiagnostics ToolCategory = "diagnostics"
	CategoryRemediation ToolCategory = "remediation"
	CategoryMonitoring ToolCategory = "monitoring"
)

// ToolContext provides context for tool execution
type ToolContext struct {
	App        interface{} // *App from main package
	RequestID  string
	UserID     string
	SessionID  string
	Cluster    string
	Namespace  string
}

// BaseTool provides a base implementation for tools
type BaseTool struct {
	metadata ToolMetadata
	context  *ToolContext
}

// NewBaseTool creates a new base tool
func NewBaseTool(name, description string, inputSchema map[string]interface{}, category ToolCategory) *BaseTool {
	return &BaseTool{
		metadata: ToolMetadata{
			Name:        name,
			Description: description,
			InputSchema: inputSchema,
			Category:    string(category),
			Tags:        []string{string(category)},
			Version:     "1.0.0",
		},
	}
}

// Name implements ToolHandler
func (t *BaseTool) Name() string {
	return t.metadata.Name
}

// Description implements ToolHandler
func (t *BaseTool) Description() string {
	return t.metadata.Description
}

// InputSchema implements ToolHandler
func (t *BaseTool) InputSchema() map[string]interface{} {
	return t.metadata.InputSchema
}

// Execute implements ToolHandler - must be overridden by concrete tools
func (t *BaseTool) Execute(ctx context.Context, args json.RawMessage) (*MCPToolResult, error) {
	return nil, fmt.Errorf("Execute method must be implemented by concrete tool")
}

// Validate implements ToolHandler
func (t *BaseTool) Validate(ctx context.Context) error {
	// Base implementation always validates
	return nil
}

// SetContext sets the tool context
func (t *BaseTool) SetContext(ctx *ToolContext) {
	t.context = ctx
}

// GetContext returns the tool context
func (t *BaseTool) GetContext() *ToolContext {
	return t.context
}

// GetMetadata returns the tool metadata
func (t *BaseTool) GetMetadata() ToolMetadata {
	return t.metadata
}
