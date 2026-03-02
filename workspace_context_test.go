// Copyright 2025 KubeGraf Contributors
// SPDX-License-Identifier: Apache-2.0

package main

import (
	"testing"
	"time"
)

// ─────────────────────────────────────────────────────────────────────────────
// DefaultWorkspaceContext
// ─────────────────────────────────────────────────────────────────────────────

func TestDefaultWorkspaceContext(t *testing.T) {
	ctx := DefaultWorkspaceContext()
	if ctx == nil {
		t.Fatal("DefaultWorkspaceContext() returned nil")
	}
	if ctx.SelectedNamespaces == nil {
		t.Error("SelectedNamespaces should not be nil")
	}
	if len(ctx.SelectedNamespaces) != 0 {
		t.Errorf("SelectedNamespaces should be empty, got %v", ctx.SelectedNamespaces)
	}
	if ctx.SelectedCluster != "" {
		t.Errorf("SelectedCluster should be empty, got %q", ctx.SelectedCluster)
	}
	if ctx.Filters == nil {
		t.Error("Filters should not be nil")
	}
	if ctx.UpdatedAt.IsZero() {
		t.Error("UpdatedAt should not be zero")
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// WorkspaceContext.Clone
// ─────────────────────────────────────────────────────────────────────────────

func TestClone_NilContext(t *testing.T) {
	var ctx *WorkspaceContext
	clone := ctx.Clone()
	if clone == nil {
		t.Fatal("Clone of nil should return default context, not nil")
	}
}

func TestClone_CopiesFields(t *testing.T) {
	original := &WorkspaceContext{
		SelectedNamespaces: []string{"default", "production"},
		SelectedCluster:    "my-cluster",
		Filters:            map[string]interface{}{"env": "prod"},
		UpdatedAt:          time.Now(),
	}
	clone := original.Clone()

	if clone.SelectedCluster != original.SelectedCluster {
		t.Errorf("SelectedCluster = %q, want %q", clone.SelectedCluster, original.SelectedCluster)
	}
	if len(clone.SelectedNamespaces) != len(original.SelectedNamespaces) {
		t.Errorf("SelectedNamespaces length = %d, want %d", len(clone.SelectedNamespaces), len(original.SelectedNamespaces))
	}
	for i, ns := range original.SelectedNamespaces {
		if clone.SelectedNamespaces[i] != ns {
			t.Errorf("SelectedNamespaces[%d] = %q, want %q", i, clone.SelectedNamespaces[i], ns)
		}
	}
}

func TestClone_IsDeepCopy(t *testing.T) {
	original := &WorkspaceContext{
		SelectedNamespaces: []string{"default"},
		Filters:            map[string]interface{}{"env": "prod"},
	}
	clone := original.Clone()

	// Mutate clone — original should be unaffected.
	clone.SelectedNamespaces = append(clone.SelectedNamespaces, "staging")
	if len(original.SelectedNamespaces) != 1 {
		t.Error("mutating clone.SelectedNamespaces should not affect original")
	}

	clone.Filters["env"] = "staging"
	if original.Filters["env"] != "prod" {
		t.Error("mutating clone.Filters should not affect original")
	}
}

func TestClone_EmptyNamespaces(t *testing.T) {
	original := &WorkspaceContext{
		SelectedNamespaces: []string{},
		Filters:            map[string]interface{}{},
	}
	clone := original.Clone()
	if clone.SelectedNamespaces == nil {
		t.Error("clone.SelectedNamespaces should not be nil for empty slice")
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// WorkspaceContext.Normalize
// ─────────────────────────────────────────────────────────────────────────────

func TestNormalize_NilContext(t *testing.T) {
	var ctx *WorkspaceContext
	// Should not panic
	ctx.Normalize()
}

func TestNormalize_DeduplicatesNamespaces(t *testing.T) {
	ctx := &WorkspaceContext{
		SelectedNamespaces: []string{"default", "default", "production", "default"},
	}
	ctx.Normalize()
	if len(ctx.SelectedNamespaces) != 2 {
		t.Errorf("after dedup, got %d namespaces, want 2: %v", len(ctx.SelectedNamespaces), ctx.SelectedNamespaces)
	}
}

func TestNormalize_TrimsWhitespace(t *testing.T) {
	ctx := &WorkspaceContext{
		SelectedNamespaces: []string{"  default  ", " production "},
	}
	ctx.Normalize()
	for _, ns := range ctx.SelectedNamespaces {
		if ns != "default" && ns != "production" {
			t.Errorf("expected trimmed namespace, got %q", ns)
		}
	}
}

func TestNormalize_RemovesEmptyStrings(t *testing.T) {
	ctx := &WorkspaceContext{
		SelectedNamespaces: []string{"default", "", "  ", "production"},
	}
	ctx.Normalize()
	if len(ctx.SelectedNamespaces) != 2 {
		t.Errorf("after removing empty, got %d namespaces, want 2: %v", len(ctx.SelectedNamespaces), ctx.SelectedNamespaces)
	}
}

func TestNormalize_SortsNamespaces(t *testing.T) {
	ctx := &WorkspaceContext{
		SelectedNamespaces: []string{"staging", "default", "production"},
	}
	ctx.Normalize()
	expected := []string{"default", "production", "staging"}
	for i, ns := range expected {
		if ctx.SelectedNamespaces[i] != ns {
			t.Errorf("SelectedNamespaces[%d] = %q, want %q", i, ctx.SelectedNamespaces[i], ns)
		}
	}
}

func TestNormalize_NilFiltersInitialized(t *testing.T) {
	ctx := &WorkspaceContext{
		SelectedNamespaces: []string{},
		Filters:            nil,
	}
	ctx.Normalize()
	if ctx.Filters == nil {
		t.Error("Normalize should initialize nil Filters to empty map")
	}
}
