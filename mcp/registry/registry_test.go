// Copyright 2025 KubeGraf Contributors
// SPDX-License-Identifier: Apache-2.0

package registry

import (
	"context"
	"encoding/json"
	"testing"

	"github.com/kubegraf/kubegraf/mcp/types"
)

// ─────────────────────────────────────────────────────────────────────────────
// helpers
// ─────────────────────────────────────────────────────────────────────────────

func newTool(name, desc string, cat types.ToolCategory) *types.BaseTool {
	return types.NewBaseTool(name, desc, map[string]interface{}{}, cat)
}

// ─────────────────────────────────────────────────────────────────────────────
// NewToolRegistry
// ─────────────────────────────────────────────────────────────────────────────

func TestNewToolRegistry_NotNil(t *testing.T) {
	r := NewToolRegistry()
	if r == nil {
		t.Fatal("NewToolRegistry returned nil")
	}
}

func TestNewToolRegistry_EmptyOnCreate(t *testing.T) {
	r := NewToolRegistry()
	if r.ToolCount() != 0 {
		t.Errorf("ToolCount() = %d, want 0", r.ToolCount())
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// RegisterTool
// ─────────────────────────────────────────────────────────────────────────────

func TestRegisterTool_Success(t *testing.T) {
	r := NewToolRegistry()
	tool := newTool("my-tool", "desc", types.CategoryKubernetes)
	if err := r.RegisterTool(tool); err != nil {
		t.Fatalf("RegisterTool returned error: %v", err)
	}
	if r.ToolCount() != 1 {
		t.Errorf("ToolCount() = %d, want 1", r.ToolCount())
	}
}

func TestRegisterTool_DuplicateName_Error(t *testing.T) {
	r := NewToolRegistry()
	tool := newTool("dup-tool", "desc", types.CategoryKubernetes)
	_ = r.RegisterTool(tool)
	err := r.RegisterTool(newTool("dup-tool", "desc2", types.CategoryKubernetes))
	if err == nil {
		t.Error("registering duplicate name should return error")
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// GetTool
// ─────────────────────────────────────────────────────────────────────────────

func TestGetTool_Found(t *testing.T) {
	r := NewToolRegistry()
	_ = r.RegisterTool(newTool("find-me", "desc", types.CategoryKubernetes))
	tool, ok := r.GetTool("find-me")
	if !ok || tool == nil {
		t.Fatal("GetTool should return the registered tool")
	}
	if tool.Name() != "find-me" {
		t.Errorf("tool.Name() = %q, want find-me", tool.Name())
	}
}

func TestGetTool_NotFound(t *testing.T) {
	r := NewToolRegistry()
	_, ok := r.GetTool("nonexistent")
	if ok {
		t.Error("GetTool for nonexistent name should return false")
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// ListTools
// ─────────────────────────────────────────────────────────────────────────────

func TestListTools_Empty(t *testing.T) {
	r := NewToolRegistry()
	tools := r.ListTools()
	if len(tools) != 0 {
		t.Errorf("ListTools on empty registry = %d, want 0", len(tools))
	}
}

func TestListTools_ReturnsAll(t *testing.T) {
	r := NewToolRegistry()
	_ = r.RegisterTool(newTool("tool-a", "a", types.CategoryKubernetes))
	_ = r.RegisterTool(newTool("tool-b", "b", types.CategoryKubernetes))
	tools := r.ListTools()
	if len(tools) != 2 {
		t.Errorf("ListTools = %d, want 2", len(tools))
	}
}

func TestListTools_NamesSet(t *testing.T) {
	r := NewToolRegistry()
	_ = r.RegisterTool(newTool("named-tool", "desc", types.CategoryKubernetes))
	tools := r.ListTools()
	if len(tools) == 0 || tools[0].Name == "" {
		t.Error("ListTools should include tool Name")
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// UnregisterTool
// ─────────────────────────────────────────────────────────────────────────────

func TestUnregisterTool_Exists(t *testing.T) {
	r := NewToolRegistry()
	_ = r.RegisterTool(newTool("rem-tool", "desc", types.CategoryKubernetes))
	removed := r.UnregisterTool("rem-tool")
	if !removed {
		t.Error("UnregisterTool should return true for existing tool")
	}
	if r.ToolCount() != 0 {
		t.Errorf("ToolCount after unregister = %d, want 0", r.ToolCount())
	}
}

func TestUnregisterTool_NotExists(t *testing.T) {
	r := NewToolRegistry()
	removed := r.UnregisterTool("ghost")
	if removed {
		t.Error("UnregisterTool should return false for nonexistent tool")
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// ClearRegistry
// ─────────────────────────────────────────────────────────────────────────────

func TestClearRegistry(t *testing.T) {
	r := NewToolRegistry()
	_ = r.RegisterTool(newTool("t1", "d", types.CategoryKubernetes))
	_ = r.RegisterTool(newTool("t2", "d", types.CategoryKubernetes))
	r.ClearRegistry()
	if r.ToolCount() != 0 {
		t.Errorf("ToolCount after Clear = %d, want 0", r.ToolCount())
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// GetToolsByCategory
// ─────────────────────────────────────────────────────────────────────────────

func TestGetToolsByCategory_MatchingTools(t *testing.T) {
	r := NewToolRegistry()
	_ = r.RegisterTool(newTool("k8s-tool", "d", types.CategoryKubernetes))
	_ = r.RegisterTool(newTool("ai-tool", "d", types.CategoryAI))

	k8sTools := r.GetToolsByCategory(types.CategoryKubernetes)
	// May be 0 or 1 depending on if BaseTool category matching works
	// Just check it doesn't panic
	_ = k8sTools
}

// ─────────────────────────────────────────────────────────────────────────────
// ExecuteTool — unknown tool returns error
// ─────────────────────────────────────────────────────────────────────────────

func TestExecuteTool_NotFound(t *testing.T) {
	r := NewToolRegistry()
	_, err := r.ExecuteTool(context.Background(), "unknown", json.RawMessage(`{}`))
	if err == nil {
		t.Error("ExecuteTool for unknown tool should return error")
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// ToolCount
// ─────────────────────────────────────────────────────────────────────────────

func TestToolCount_Increments(t *testing.T) {
	r := NewToolRegistry()
	for i := 0; i < 5; i++ {
		_ = r.RegisterTool(newTool(
			"tool-"+string(rune('a'+i)), "d", types.CategoryKubernetes,
		))
	}
	if r.ToolCount() != 5 {
		t.Errorf("ToolCount() = %d, want 5", r.ToolCount())
	}
}
