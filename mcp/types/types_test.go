// Copyright 2025 KubeGraf Contributors
// SPDX-License-Identifier: Apache-2.0

package types

import (
	"context"
	"testing"
)

// ─────────────────────────────────────────────────────────────────────────────
// ToolCategory constants
// ─────────────────────────────────────────────────────────────────────────────

func TestToolCategoryConstants(t *testing.T) {
	categories := []ToolCategory{
		CategoryKubernetes, CategoryAI, CategorySecurity, CategoryCost,
		CategoryDiagnostics, CategoryRemediation, CategoryMonitoring,
	}
	seen := map[ToolCategory]bool{}
	for _, c := range categories {
		if c == "" {
			t.Error("ToolCategory constant should not be empty")
		}
		if seen[c] {
			t.Errorf("duplicate ToolCategory value: %q", c)
		}
		seen[c] = true
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// Error code constants
// ─────────────────────────────────────────────────────────────────────────────

func TestErrorCodeConstants(t *testing.T) {
	if CodeParseError >= 0 {
		t.Error("CodeParseError should be negative")
	}
	if CodeInvalidRequest >= 0 {
		t.Error("CodeInvalidRequest should be negative")
	}
	if CodeMethodNotFound >= 0 {
		t.Error("CodeMethodNotFound should be negative")
	}
	if CodeInvalidParams >= 0 {
		t.Error("CodeInvalidParams should be negative")
	}
	if CodeInternalError >= 0 {
		t.Error("CodeInternalError should be negative")
	}
}

func TestErrorCodeUniqueness(t *testing.T) {
	codes := []int{CodeParseError, CodeInvalidRequest, CodeMethodNotFound, CodeInvalidParams, CodeInternalError, CodeServerError}
	seen := map[int]bool{}
	for _, c := range codes {
		if seen[c] {
			t.Errorf("duplicate error code: %d", c)
		}
		seen[c] = true
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// NewBaseTool
// ─────────────────────────────────────────────────────────────────────────────

func TestNewBaseTool_Name(t *testing.T) {
	tool := NewBaseTool("my-tool", "does something", nil, CategoryKubernetes)
	if tool.Name() != "my-tool" {
		t.Errorf("Name() = %q, want my-tool", tool.Name())
	}
}

func TestNewBaseTool_Description(t *testing.T) {
	tool := NewBaseTool("t", "my description", nil, CategoryAI)
	if tool.Description() != "my description" {
		t.Errorf("Description() = %q, want 'my description'", tool.Description())
	}
}

func TestNewBaseTool_InputSchema(t *testing.T) {
	schema := map[string]interface{}{"type": "object"}
	tool := NewBaseTool("t", "d", schema, CategoryCost)
	got := tool.InputSchema()
	if got == nil {
		t.Fatal("InputSchema() should not be nil when schema provided")
	}
	if got["type"] != "object" {
		t.Errorf("InputSchema()[type] = %v, want object", got["type"])
	}
}

func TestNewBaseTool_Category(t *testing.T) {
	tool := NewBaseTool("t", "d", nil, CategorySecurity)
	meta := tool.GetMetadata()
	if meta.Category != string(CategorySecurity) {
		t.Errorf("metadata.Category = %q, want %q", meta.Category, string(CategorySecurity))
	}
}

func TestNewBaseTool_Tags(t *testing.T) {
	tool := NewBaseTool("t", "d", nil, CategoryMonitoring)
	meta := tool.GetMetadata()
	if len(meta.Tags) == 0 {
		t.Error("metadata.Tags should not be empty")
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// BaseTool.Validate
// ─────────────────────────────────────────────────────────────────────────────

func TestBaseTool_Validate_NoError(t *testing.T) {
	tool := NewBaseTool("t", "d", nil, CategoryKubernetes)
	if err := tool.Validate(context.Background()); err != nil {
		t.Errorf("Validate() returned unexpected error: %v", err)
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// BaseTool.Execute — returns error (must be overridden)
// ─────────────────────────────────────────────────────────────────────────────

func TestBaseTool_Execute_ReturnsError(t *testing.T) {
	tool := NewBaseTool("t", "d", nil, CategoryKubernetes)
	_, err := tool.Execute(context.Background(), nil)
	if err == nil {
		t.Error("BaseTool.Execute should return an error (must be overridden)")
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// BaseTool.SetContext / GetContext
// ─────────────────────────────────────────────────────────────────────────────

func TestBaseTool_Context_NilByDefault(t *testing.T) {
	tool := NewBaseTool("t", "d", nil, CategoryKubernetes)
	if tool.GetContext() != nil {
		t.Error("GetContext() should be nil before SetContext")
	}
}

func TestBaseTool_SetContext_GetContext(t *testing.T) {
	tool := NewBaseTool("t", "d", nil, CategoryKubernetes)
	ctx := &ToolContext{
		Cluster:   "prod",
		Namespace: "default",
	}
	tool.SetContext(ctx)
	got := tool.GetContext()
	if got == nil {
		t.Fatal("GetContext() should not be nil after SetContext")
	}
	if got.Cluster != "prod" {
		t.Errorf("Context.Cluster = %q, want prod", got.Cluster)
	}
	if got.Namespace != "default" {
		t.Errorf("Context.Namespace = %q, want default", got.Namespace)
	}
}
