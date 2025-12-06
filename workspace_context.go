package main

import (
	"sort"
	"strings"
	"time"
)

// WorkspaceContext captures the persisted workspace filters shared by the UI and backend.
type WorkspaceContext struct {
	SelectedNamespaces []string               `json:"selectedNamespaces"`
	SelectedCluster    string                 `json:"selectedCluster"`
	Filters            map[string]interface{} `json:"filters"`
	UpdatedAt          time.Time              `json:"updatedAt"`
}

// DefaultWorkspaceContext returns the baseline context (all namespaces, no filters).
func DefaultWorkspaceContext() *WorkspaceContext {
	return &WorkspaceContext{
		SelectedNamespaces: []string{},
		SelectedCluster:    "",
		Filters:            map[string]interface{}{},
		UpdatedAt:          time.Now(),
	}
}

// Clone returns a deep copy so callers can safely mutate the result.
func (ctx *WorkspaceContext) Clone() *WorkspaceContext {
	if ctx == nil {
		return DefaultWorkspaceContext()
	}
	clone := &WorkspaceContext{
		SelectedCluster: ctx.SelectedCluster,
		UpdatedAt:       ctx.UpdatedAt,
	}
	if len(ctx.SelectedNamespaces) > 0 {
		clone.SelectedNamespaces = make([]string, len(ctx.SelectedNamespaces))
		copy(clone.SelectedNamespaces, ctx.SelectedNamespaces)
	} else {
		clone.SelectedNamespaces = []string{}
	}
	if len(ctx.Filters) > 0 {
		clone.Filters = make(map[string]interface{}, len(ctx.Filters))
		for k, v := range ctx.Filters {
			clone.Filters[k] = v
		}
	} else {
		clone.Filters = map[string]interface{}{}
	}
	return clone
}

// Normalize deduplicates namespaces and ensures maps are not nil.
func (ctx *WorkspaceContext) Normalize() {
	if ctx == nil {
		return
	}
	seen := make(map[string]struct{})
	cleaned := make([]string, 0, len(ctx.SelectedNamespaces))
	for _, ns := range ctx.SelectedNamespaces {
		ns = strings.TrimSpace(ns)
		if ns == "" {
			continue
		}
		if _, exists := seen[ns]; exists {
			continue
		}
		seen[ns] = struct{}{}
		cleaned = append(cleaned, ns)
	}
	sort.Strings(cleaned)
	ctx.SelectedNamespaces = cleaned
	if ctx.Filters == nil {
		ctx.Filters = map[string]interface{}{}
	}
}
