// Copyright 2025 KubeGraf Contributors
// SPDX-License-Identifier: Apache-2.0

package registry

import (
	"context"
	"encoding/json"
	"fmt"
	"sync"

	"github.com/kubegraf/kubegraf/mcp/types"
)

// ToolRegistry manages registration and discovery of MCP tools
type ToolRegistry struct {
	tools   map[string]types.ToolHandler
	toolsMu sync.RWMutex
}

// NewToolRegistry creates a new tool registry
func NewToolRegistry() *ToolRegistry {
	return &ToolRegistry{
		tools: make(map[string]types.ToolHandler),
	}
}

// RegisterTool registers a new tool with the registry
func (r *ToolRegistry) RegisterTool(tool types.ToolHandler) error {
	r.toolsMu.Lock()
	defer r.toolsMu.Unlock()

	name := tool.Name()
	if _, exists := r.tools[name]; exists {
		return fmt.Errorf("tool with name '%s' already registered", name)
	}

	r.tools[name] = tool
	return nil
}

// GetTool returns a tool by name
func (r *ToolRegistry) GetTool(name string) (types.ToolHandler, bool) {
	r.toolsMu.RLock()
	defer r.toolsMu.RUnlock()

	tool, exists := r.tools[name]
	return tool, exists
}

// ListTools returns all registered tools as MCPTool
func (r *ToolRegistry) ListTools() []types.MCPTool {
	r.toolsMu.RLock()
	defer r.toolsMu.RUnlock()

	tools := make([]types.MCPTool, 0, len(r.tools))
	for _, tool := range r.tools {
		tools = append(tools, types.MCPTool{
			Name:        tool.Name(),
			Description: tool.Description(),
			InputSchema: tool.InputSchema(),
		})
	}
	return tools
}

// ExecuteTool executes a tool by name with the given arguments
func (r *ToolRegistry) ExecuteTool(ctx context.Context, name string, args json.RawMessage) (*types.MCPToolResult, error) {
	tool, exists := r.GetTool(name)
	if !exists {
		return nil, fmt.Errorf("tool '%s' not found", name)
	}

	// Validate the tool can be executed
	if err := tool.Validate(ctx); err != nil {
		return nil, fmt.Errorf("tool validation failed: %v", err)
	}

	// Execute the tool
	result, err := tool.Execute(ctx, args)
	if err != nil {
		return nil, fmt.Errorf("tool execution failed: %v", err)
	}

	return result, nil
}

// GetToolsByCategory returns tools filtered by category
func (r *ToolRegistry) GetToolsByCategory(category types.ToolCategory) []types.ToolMetadata {
	r.toolsMu.RLock()
	defer r.toolsMu.RUnlock()

	var filtered []types.ToolMetadata
	for _, tool := range r.tools {
		if baseTool, ok := tool.(*types.BaseTool); ok {
			metadata := baseTool.GetMetadata()
			if metadata.Category == string(category) {
				filtered = append(filtered, metadata)
			}
		}
	}
	return filtered
}

// UnregisterTool removes a tool from the registry
func (r *ToolRegistry) UnregisterTool(name string) bool {
	r.toolsMu.Lock()
	defer r.toolsMu.Unlock()

	if _, exists := r.tools[name]; exists {
		delete(r.tools, name)
		return true
	}
	return false
}

// ClearRegistry removes all tools from the registry
func (r *ToolRegistry) ClearRegistry() {
	r.toolsMu.Lock()
	defer r.toolsMu.Unlock()

	r.tools = make(map[string]types.ToolHandler)
}

// ToolCount returns the number of registered tools
func (r *ToolRegistry) ToolCount() int {
	r.toolsMu.RLock()
	defer r.toolsMu.RUnlock()

	return len(r.tools)
}
