// Copyright 2025 KubeGraf Contributors
// SPDX-License-Identifier: Apache-2.0

package server

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/kubegraf/kubegraf/mcp/registry"
	"github.com/kubegraf/kubegraf/mcp/tools"
	"github.com/kubegraf/kubegraf/mcp/types"
)

// MCPServer handles MCP protocol communication
type MCPServer struct {
	registry *registry.ToolRegistry
	app      interface{} // *App from main package
}

// NewMCPServer creates a new MCP server
func NewMCPServer(app interface{}) *MCPServer {
	return &MCPServer{
		registry: registry.NewToolRegistry(),
		app:      app,
	}
}

// GetRegistry returns the tool registry
func (s *MCPServer) GetRegistry() *registry.ToolRegistry {
	return s.registry
}

// HandleRequest handles an MCP protocol request
func (s *MCPServer) HandleRequest(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var msg types.MCPMessage
	if err := json.NewDecoder(r.Body).Decode(&msg); err != nil {
		s.sendError(w, nil, types.CodeParseError, "Parse error", err.Error())
		return
	}

	// Handle different MCP methods
	switch msg.Method {
	case "initialize":
		s.handleInitialize(w, &msg)
	case "tools/list":
		s.handleToolsList(w, &msg)
	case "tools/call":
		s.handleToolsCall(w, r.Context(), &msg)
	case "ping":
		s.sendResponse(w, &msg, map[string]string{"status": "pong"})
	default:
		s.sendError(w, &msg, types.CodeMethodNotFound, "Method not found", fmt.Sprintf("Unknown method: %s", msg.Method))
	}
}

// handleInitialize handles MCP initialize request
func (s *MCPServer) handleInitialize(w http.ResponseWriter, msg *types.MCPMessage) {
	response := types.InitializeResponse{
		ProtocolVersion: "2024-11-05",
		Capabilities: map[string]interface{}{
			"tools": map[string]interface{}{},
		},
		ServerInfo: map[string]interface{}{
			"name":    "kubegraf-mcp-server",
			"version": "1.0.0", // TODO: Get from version.go
		},
	}
	s.sendResponse(w, msg, response)
}

// handleToolsList handles MCP tools/list request
func (s *MCPServer) handleToolsList(w http.ResponseWriter, msg *types.MCPMessage) {
	tools := s.registry.ListTools()
	response := types.ToolsListResponse{
		Tools: tools,
	}
	s.sendResponse(w, msg, response)
}

// handleToolsCall handles MCP tools/call request
func (s *MCPServer) handleToolsCall(w http.ResponseWriter, ctx context.Context, msg *types.MCPMessage) {
	var params types.ToolsCallRequest
	if err := json.Unmarshal(msg.Params, &params); err != nil {
		s.sendError(w, msg, types.CodeInvalidParams, "Invalid params", err.Error())
		return
	}

	// Create context with timeout
	ctx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()

	// Execute the tool
	result, err := s.registry.ExecuteTool(ctx, params.Name, params.Arguments)
	if err != nil {
		s.sendError(w, msg, types.CodeServerError, "Tool execution error", err.Error())
		return
	}

	response := types.ToolsCallResponse{
		Result: result,
	}
	s.sendResponse(w, msg, response)
}

// sendResponse sends a successful MCP response
func (s *MCPServer) sendResponse(w http.ResponseWriter, msg *types.MCPMessage, result interface{}) {
	response := types.MCPMessage{
		JSONRPC: "2.0",
		ID:      msg.ID,
		Result:  result,
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// sendError sends an error MCP response
func (s *MCPServer) sendError(w http.ResponseWriter, msg *types.MCPMessage, code int, message string, data interface{}) {
	response := types.MCPMessage{
		JSONRPC: "2.0",
		ID:      msg.ID,
		Error: &types.MCPError{
			Code:    code,
			Message: message,
			Data:    data,
		},
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// RegisterDefaultTools registers default tools with the server
func (s *MCPServer) RegisterDefaultTools() error {
	return tools.RegisterAllTools(s.registry, s.app)
}
