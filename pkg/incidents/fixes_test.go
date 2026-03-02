// Copyright 2025 KubeGraf Contributors
// SPDX-License-Identifier: Apache-2.0

package incidents

import (
	"context"
	"strings"
	"testing"
)

// ─────────────────────────────────────────────────────────────────────────────
// deepCopyMap / deepCopySlice / setNestedValue
// ─────────────────────────────────────────────────────────────────────────────

func TestDeepCopyMap_Empty(t *testing.T) {
	result := deepCopyMap(map[string]interface{}{})
	if len(result) != 0 {
		t.Errorf("deepCopyMap({}) len = %d, want 0", len(result))
	}
}

func TestDeepCopyMap_FlatValues(t *testing.T) {
	original := map[string]interface{}{"a": "v1", "b": 42}
	cp := deepCopyMap(original)
	if cp["a"] != "v1" {
		t.Errorf("deepCopyMap: a = %v, want v1", cp["a"])
	}
	if cp["b"] != 42 {
		t.Errorf("deepCopyMap: b = %v, want 42", cp["b"])
	}
}

func TestDeepCopyMap_NestedMap(t *testing.T) {
	original := map[string]interface{}{
		"outer": map[string]interface{}{"inner": "value"},
	}
	cp := deepCopyMap(original)
	// Modify original, copy should be unaffected
	original["outer"].(map[string]interface{})["inner"] = "changed"
	nested := cp["outer"].(map[string]interface{})
	if nested["inner"] != "value" {
		t.Errorf("deepCopyMap nested: inner = %v, want value", nested["inner"])
	}
}

func TestDeepCopyMap_NestedSlice(t *testing.T) {
	original := map[string]interface{}{
		"items": []interface{}{"a", "b"},
	}
	cp := deepCopyMap(original)
	items := cp["items"].([]interface{})
	if len(items) != 2 {
		t.Errorf("deepCopyMap slice: len = %d, want 2", len(items))
	}
}

func TestDeepCopySlice_Empty(t *testing.T) {
	result := deepCopySlice([]interface{}{})
	if len(result) != 0 {
		t.Errorf("deepCopySlice([]) len = %d, want 0", len(result))
	}
}

func TestDeepCopySlice_FlatValues(t *testing.T) {
	original := []interface{}{"x", 1, true}
	cp := deepCopySlice(original)
	if len(cp) != 3 {
		t.Errorf("deepCopySlice: len = %d, want 3", len(cp))
	}
	if cp[0] != "x" {
		t.Errorf("deepCopySlice: [0] = %v, want x", cp[0])
	}
}

func TestDeepCopySlice_NestedMap(t *testing.T) {
	original := []interface{}{map[string]interface{}{"key": "val"}}
	cp := deepCopySlice(original)
	original[0].(map[string]interface{})["key"] = "modified"
	m := cp[0].(map[string]interface{})
	if m["key"] != "val" {
		t.Errorf("deepCopySlice nested map: key = %v, want val", m["key"])
	}
}

func TestDeepCopySlice_NestedSlice(t *testing.T) {
	original := []interface{}{[]interface{}{"inner"}}
	cp := deepCopySlice(original)
	inner := cp[0].([]interface{})
	if inner[0] != "inner" {
		t.Errorf("deepCopySlice nested slice: [0][0] = %v, want inner", inner[0])
	}
}

func TestSetNestedValue_Simple(t *testing.T) {
	m := map[string]interface{}{}
	setNestedValue(m, "key", "value")
	if m["key"] != "value" {
		t.Errorf("setNestedValue simple: key = %v, want value", m["key"])
	}
}

func TestSetNestedValue_Nested(t *testing.T) {
	m := map[string]interface{}{}
	setNestedValue(m, "a.b.c", "deep")
	a := m["a"].(map[string]interface{})
	b := a["b"].(map[string]interface{})
	if b["c"] != "deep" {
		t.Errorf("setNestedValue nested: a.b.c = %v, want deep", b["c"])
	}
}

func TestSetNestedValue_Overwrite(t *testing.T) {
	m := map[string]interface{}{"x": "old"}
	setNestedValue(m, "x", "new")
	if m["x"] != "new" {
		t.Errorf("setNestedValue overwrite: x = %v, want new", m["x"])
	}
}

func TestSetNestedValue_WithArraySyntax(t *testing.T) {
	m := map[string]interface{}{}
	// Bracket notation is simplified — just strips the bracket part
	setNestedValue(m, "containers[0].memory", "512Mi")
	// The exact key depends on implementation, just verify no panic
}

// ─────────────────────────────────────────────────────────────────────────────
// FixExecutor — nil executor (safe operations)
// ─────────────────────────────────────────────────────────────────────────────

func TestNewFixExecutor_Nil(t *testing.T) {
	e := NewFixExecutor(nil)
	if e == nil {
		t.Fatal("NewFixExecutor(nil) returned nil")
	}
}

func TestFixExecutor_Preview_NilFix(t *testing.T) {
	e := NewFixExecutor(nil)
	_, err := e.Preview(context.Background(), nil)
	if err == nil {
		t.Error("Preview(nil fix) should return error")
	}
}

func TestFixExecutor_Preview_NoExecutor(t *testing.T) {
	e := NewFixExecutor(nil)
	fix := &ProposedFix{
		Type:        FixTypeRestart,
		Description: "restart pod",
		TargetResource: KubeResourceRef{Kind: "Pod", Name: "my-pod", Namespace: "default"},
	}
	preview, err := e.Preview(context.Background(), fix)
	if err != nil {
		t.Fatalf("Preview with nil executor: %v", err)
	}
	if preview == nil {
		t.Fatal("Preview returned nil")
	}
	if !preview.Valid {
		t.Error("Preview should be valid when no executor")
	}
	if preview.Diff == "" {
		t.Error("Preview should include command diff")
	}
}

func TestFixExecutor_Preview_GeneratesCommands(t *testing.T) {
	e := NewFixExecutor(nil)
	fix := &ProposedFix{
		Type:        FixTypeRestart,
		DryRunCmd:   "kubectl rollout restart deployment/my-app --dry-run=client",
		ApplyCmd:    "kubectl rollout restart deployment/my-app",
		Description: "restart",
		TargetResource: KubeResourceRef{Kind: "Deployment", Name: "my-app"},
	}
	preview, _ := e.Preview(context.Background(), fix)
	if len(preview.Commands) == 0 {
		t.Error("Preview.Commands should not be empty when DryRunCmd is set")
	}
}

func TestFixExecutor_Preview_AssessesRisks_Restart(t *testing.T) {
	e := NewFixExecutor(nil)
	fix := &ProposedFix{
		Type:        FixTypeRestart,
		Description: "restart",
		TargetResource: KubeResourceRef{Kind: "Pod"},
	}
	preview, _ := e.Preview(context.Background(), fix)
	if len(preview.Risks) == 0 {
		t.Error("Preview.Risks should not be empty for restart")
	}
}

func TestFixExecutor_Preview_AssessesRisks_Scale(t *testing.T) {
	e := NewFixExecutor(nil)
	fix := &ProposedFix{
		Type:        FixTypeScale,
		Description: "scale",
		TargetResource: KubeResourceRef{Kind: "Deployment"},
	}
	preview, _ := e.Preview(context.Background(), fix)
	if len(preview.Risks) == 0 {
		t.Error("Preview.Risks should not be empty for scale")
	}
}

func TestFixExecutor_Preview_AssessesRisks_Rollback(t *testing.T) {
	e := NewFixExecutor(nil)
	fix := &ProposedFix{
		Type:        FixTypeRollback,
		Description: "rollback",
		TargetResource: KubeResourceRef{Kind: "Deployment"},
	}
	preview, _ := e.Preview(context.Background(), fix)
	if len(preview.Risks) == 0 {
		t.Error("Preview.Risks should not be empty for rollback")
	}
}

func TestFixExecutor_Preview_AssessesRisks_Delete(t *testing.T) {
	e := NewFixExecutor(nil)
	fix := &ProposedFix{
		Type:        FixTypeDelete,
		Description: "delete",
		TargetResource: KubeResourceRef{Kind: "Pod"},
	}
	preview, _ := e.Preview(context.Background(), fix)
	if len(preview.Risks) == 0 {
		t.Error("Preview.Risks should not be empty for delete")
	}
}

func TestFixExecutor_Preview_AssessesRisks_UnsafeFix(t *testing.T) {
	e := NewFixExecutor(nil)
	fix := &ProposedFix{
		Type:        FixTypeRestart,
		Description: "unsafe",
		Safe:        false,
		TargetResource: KubeResourceRef{Kind: "Pod"},
	}
	preview, _ := e.Preview(context.Background(), fix)
	// Should mention unsafe risk
	hasUnsafeRisk := false
	for _, r := range preview.Risks {
		if strings.Contains(r, "unsafe") {
			hasUnsafeRisk = true
		}
	}
	if !hasUnsafeRisk {
		t.Error("Preview.Risks should include unsafe warning for non-safe fix")
	}
}

func TestFixExecutor_Preview_Patch_MemoryChange(t *testing.T) {
	e := NewFixExecutor(nil)
	fix := &ProposedFix{
		Type:        FixTypePatch,
		Description: "increase memory",
		Changes: []FixChange{
			{Path: "spec.containers[0].resources.limits.memory", OldValue: "256Mi", NewValue: "512Mi"},
		},
		TargetResource: KubeResourceRef{Kind: "Deployment"},
	}
	preview, _ := e.Preview(context.Background(), fix)
	hasMemoryRisk := false
	for _, r := range preview.Risks {
		if strings.Contains(r, "memory") || strings.Contains(r, "Memory") {
			hasMemoryRisk = true
		}
	}
	if !hasMemoryRisk {
		t.Error("Preview.Risks should mention memory restart risk for memory patch")
	}
}

func TestFixExecutor_DryRun_NilFix(t *testing.T) {
	e := NewFixExecutor(nil)
	_, err := e.DryRun(context.Background(), nil)
	if err == nil {
		t.Error("DryRun(nil) should return error")
	}
}

func TestFixExecutor_DryRun_NoExecutor_Succeeds(t *testing.T) {
	e := NewFixExecutor(nil)
	fix := &ProposedFix{Type: FixTypeRestart, Description: "test"}
	result, err := e.DryRun(context.Background(), fix)
	if err != nil {
		t.Fatalf("DryRun with nil executor: %v", err)
	}
	if !result.Success {
		t.Error("DryRun with nil executor should succeed")
	}
	if !result.DryRun {
		t.Error("DryRun result should have DryRun=true")
	}
}

func TestFixExecutor_Apply_NilFix(t *testing.T) {
	e := NewFixExecutor(nil)
	_, err := e.Apply(context.Background(), nil)
	if err == nil {
		t.Error("Apply(nil) should return error")
	}
}

func TestFixExecutor_Apply_NoExecutor_Error(t *testing.T) {
	e := NewFixExecutor(nil)
	fix := &ProposedFix{Type: FixTypeRestart, Description: "test"}
	_, err := e.Apply(context.Background(), fix)
	if err == nil {
		t.Error("Apply with nil executor should return error")
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// FixExecutor.generateCommandDiff (via Preview with changes)
// ─────────────────────────────────────────────────────────────────────────────

func TestFixExecutor_Preview_CommandDiff_ContainsDescription(t *testing.T) {
	e := NewFixExecutor(nil)
	fix := &ProposedFix{
		Type:        FixTypePatch,
		Description: "my-fix-description",
		Changes: []FixChange{
			{Path: "spec.memory", OldValue: "100Mi", NewValue: "200Mi", Description: "double memory"},
		},
		TargetResource: KubeResourceRef{Kind: "Pod", Name: "p", Namespace: "ns"},
	}
	preview, _ := e.Preview(context.Background(), fix)
	if !strings.Contains(preview.Diff, "my-fix-description") {
		t.Errorf("Diff = %q, should contain description", preview.Diff)
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// FixExecutor.describeChanges (indirectly via DryRun with nil executor)
// ─────────────────────────────────────────────────────────────────────────────

func TestDescribeChanges_WithDescription(t *testing.T) {
	e := NewFixExecutor(nil)
	fix := &ProposedFix{
		Type: FixTypePatch,
		Changes: []FixChange{
			{Path: "a.b", NewValue: "v", Description: "custom desc"},
			{Path: "x.y", NewValue: "w"}, // no description → auto
		},
	}
	changes := e.describeChanges(fix)
	if len(changes) != 2 {
		t.Errorf("describeChanges: len = %d, want 2", len(changes))
	}
	if changes[0] != "custom desc" {
		t.Errorf("describeChanges[0] = %q, want 'custom desc'", changes[0])
	}
	if !strings.Contains(changes[1], "x.y") {
		t.Errorf("describeChanges[1] = %q, should mention path x.y", changes[1])
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// FixValidator
// ─────────────────────────────────────────────────────────────────────────────

func TestNewFixValidator_Defaults(t *testing.T) {
	v := NewFixValidator()
	if v == nil {
		t.Fatal("NewFixValidator returned nil")
	}
	if len(v.AllowedFixTypes) == 0 {
		t.Error("AllowedFixTypes should not be empty")
	}
	if v.MaxScaleReplicas <= 0 {
		t.Error("MaxScaleReplicas should be positive")
	}
}

func TestFixValidator_Validate_Nil(t *testing.T) {
	v := NewFixValidator()
	err := v.Validate(nil)
	if err == nil {
		t.Error("Validate(nil) should return error")
	}
}

func TestFixValidator_Validate_AllowedType_Restart(t *testing.T) {
	v := NewFixValidator()
	fix := &ProposedFix{
		Type:           FixTypeRestart,
		TargetResource: KubeResourceRef{Kind: "Deployment", Name: "app", Namespace: "ns"},
	}
	err := v.Validate(fix)
	if err != nil {
		t.Errorf("Validate(restart in namespace): %v", err)
	}
}

func TestFixValidator_Validate_DisallowedType_Delete(t *testing.T) {
	v := NewFixValidator()
	// Delete is not in the default allowed list
	fix := &ProposedFix{
		Type:           FixTypeDelete,
		TargetResource: KubeResourceRef{Kind: "Pod", Namespace: "ns"},
	}
	err := v.Validate(fix)
	if err == nil {
		t.Error("Validate(delete) should return error — delete not allowed by default")
	}
}

func TestFixValidator_Validate_ClusterScopedNode(t *testing.T) {
	v := NewFixValidator()
	fix := &ProposedFix{
		Type:           FixTypeRestart,
		TargetResource: KubeResourceRef{Kind: "Node", Name: "node-1", Namespace: ""},
	}
	err := v.Validate(fix)
	if err == nil {
		t.Error("Validate(Node, cluster-scoped) should return error")
	}
}

func TestFixValidator_Validate_ScaleWithinLimit(t *testing.T) {
	v := NewFixValidator()
	fix := &ProposedFix{
		Type:           FixTypeScale,
		TargetResource: KubeResourceRef{Kind: "Deployment", Name: "app", Namespace: "ns"},
		Changes: []FixChange{
			{Path: "spec.replicas", NewValue: 3},
		},
	}
	err := v.Validate(fix)
	if err != nil {
		t.Errorf("Validate(scale to 3): %v", err)
	}
}

func TestFixValidator_Validate_ScaleExceedsLimit(t *testing.T) {
	v := NewFixValidator()
	fix := &ProposedFix{
		Type:           FixTypeScale,
		TargetResource: KubeResourceRef{Kind: "Deployment", Namespace: "ns"},
		Changes: []FixChange{
			{Path: "spec.replicas", NewValue: 100},
		},
	}
	err := v.Validate(fix)
	if err == nil {
		t.Error("Validate(scale to 100) should return error — exceeds max")
	}
}

func TestFixValidator_Validate_DeleteInProduction(t *testing.T) {
	// Add delete to allowed types temporarily by creating custom validator
	v2 := &FixValidator{
		AllowedFixTypes:  []FixType{FixTypeDelete},
		MaxScaleReplicas: 10,
	}
	fix := &ProposedFix{
		Type:           FixTypeDelete,
		TargetResource: KubeResourceRef{Kind: "Pod", Namespace: "production"},
	}
	err := v2.Validate(fix)
	if err == nil {
		t.Error("Validate(delete in production) should return error")
	}
}

func TestFixValidator_IsSafe_SafeFix(t *testing.T) {
	v := NewFixValidator()
	fix := &ProposedFix{
		Type:           FixTypeRestart,
		Safe:           true,
		TargetResource: KubeResourceRef{Kind: "Deployment", Namespace: "ns"},
	}
	if !v.IsSafe(fix) {
		t.Error("IsSafe should be true for valid+safe fix")
	}
}

func TestFixValidator_IsSafe_UnsafeFix(t *testing.T) {
	v := NewFixValidator()
	fix := &ProposedFix{
		Type:           FixTypeRestart,
		Safe:           false,
		TargetResource: KubeResourceRef{Kind: "Deployment", Namespace: "ns"},
	}
	if v.IsSafe(fix) {
		t.Error("IsSafe should be false when fix.Safe=false")
	}
}

func TestFixValidator_IsSafe_InvalidFix(t *testing.T) {
	v := NewFixValidator()
	fix := &ProposedFix{
		Type:           FixTypeDelete, // not allowed
		Safe:           true,
		TargetResource: KubeResourceRef{Kind: "Pod", Namespace: "ns"},
	}
	if v.IsSafe(fix) {
		t.Error("IsSafe should be false when Validate fails")
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// generateCommands — with RollbackInfo
// ─────────────────────────────────────────────────────────────────────────────

func TestFixExecutor_GenerateCommands_WithRollback(t *testing.T) {
	e := NewFixExecutor(nil)
	fix := &ProposedFix{
		Type:      FixTypeRestart,
		DryRunCmd: "kubectl ... --dry-run",
		ApplyCmd:  "kubectl ...",
		RollbackInfo: &RollbackInfo{
			CanRollback: true,
			RollbackCmd: "kubectl rollout undo deployment/app",
		},
	}
	cmds := e.generateCommands(fix)
	hasRollback := false
	for _, c := range cmds {
		if strings.Contains(c, "rollout undo") {
			hasRollback = true
		}
	}
	if !hasRollback {
		t.Error("generateCommands should include rollback command when RollbackInfo is set")
	}
}
