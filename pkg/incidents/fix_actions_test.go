// Copyright 2025 KubeGraf Contributors
// SPDX-License-Identifier: Apache-2.0

package incidents

import (
	"strings"
	"testing"
)

// ─────────────────────────────────────────────────────────────────────────────
// GenerateRestartCommand
// ─────────────────────────────────────────────────────────────────────────────

func TestGenerateRestartCommand_Pod_DryRun(t *testing.T) {
	r := KubeResourceRef{Kind: "Pod", Name: "my-pod", Namespace: "default"}
	cmd := GenerateRestartCommand(r, true)
	if !strings.Contains(cmd, "--dry-run=client") {
		t.Errorf("Pod dry-run cmd = %q, should contain --dry-run=client", cmd)
	}
	if !strings.Contains(cmd, "delete pod my-pod") {
		t.Errorf("Pod dry-run cmd = %q, should contain 'delete pod my-pod'", cmd)
	}
}

func TestGenerateRestartCommand_Pod_Apply(t *testing.T) {
	r := KubeResourceRef{Kind: "Pod", Name: "my-pod", Namespace: "default"}
	cmd := GenerateRestartCommand(r, false)
	if strings.Contains(cmd, "--dry-run") {
		t.Errorf("Pod apply cmd should not contain --dry-run: %q", cmd)
	}
	if !strings.Contains(cmd, "kubectl delete pod my-pod") {
		t.Errorf("Pod apply cmd = %q, should contain 'kubectl delete pod my-pod'", cmd)
	}
}

func TestGenerateRestartCommand_Deployment(t *testing.T) {
	r := KubeResourceRef{Kind: "Deployment", Name: "my-app", Namespace: "prod"}
	cmd := GenerateRestartCommand(r, false)
	if !strings.Contains(cmd, "rollout restart deployment/my-app") {
		t.Errorf("Deployment cmd = %q, should contain rollout restart", cmd)
	}
	if !strings.Contains(cmd, "prod") {
		t.Errorf("Deployment cmd = %q, should contain namespace 'prod'", cmd)
	}
}

func TestGenerateRestartCommand_StatefulSet(t *testing.T) {
	r := KubeResourceRef{Kind: "StatefulSet", Name: "my-db", Namespace: "data"}
	cmd := GenerateRestartCommand(r, false)
	if !strings.Contains(cmd, "statefulset/my-db") {
		t.Errorf("StatefulSet cmd = %q, should mention statefulset/my-db", cmd)
	}
}

func TestGenerateRestartCommand_DaemonSet(t *testing.T) {
	r := KubeResourceRef{Kind: "DaemonSet", Name: "node-agent", Namespace: "kube-system"}
	cmd := GenerateRestartCommand(r, false)
	if !strings.Contains(cmd, "daemonset/node-agent") {
		t.Errorf("DaemonSet cmd = %q, should mention daemonset/node-agent", cmd)
	}
}

func TestGenerateRestartCommand_Unknown(t *testing.T) {
	r := KubeResourceRef{Kind: "ConfigMap", Name: "my-cfg", Namespace: "default"}
	cmd := GenerateRestartCommand(r, false)
	if !strings.Contains(cmd, "#") {
		t.Errorf("Unknown kind cmd = %q, should be a comment indicating unsupported", cmd)
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// GenerateScaleCommand
// ─────────────────────────────────────────────────────────────────────────────

func TestGenerateScaleCommand_Deployment(t *testing.T) {
	r := KubeResourceRef{Kind: "Deployment", Name: "my-app", Namespace: "prod"}
	cmd := GenerateScaleCommand(r, 3, false)
	if !strings.Contains(cmd, "--replicas=3") {
		t.Errorf("Scale cmd = %q, should contain --replicas=3", cmd)
	}
	if !strings.Contains(cmd, "deployment/my-app") {
		t.Errorf("Scale cmd = %q, should contain deployment/my-app", cmd)
	}
}

func TestGenerateScaleCommand_StatefulSet(t *testing.T) {
	r := KubeResourceRef{Kind: "StatefulSet", Name: "my-db", Namespace: "data"}
	cmd := GenerateScaleCommand(r, 5, false)
	if !strings.Contains(cmd, "statefulset/my-db") {
		t.Errorf("StatefulSet scale cmd = %q, should mention statefulset/my-db", cmd)
	}
}

func TestGenerateScaleCommand_DryRun(t *testing.T) {
	r := KubeResourceRef{Kind: "Deployment", Name: "app", Namespace: "ns"}
	cmd := GenerateScaleCommand(r, 2, true)
	if !strings.Contains(cmd, "--dry-run=client") {
		t.Errorf("Scale dry-run cmd = %q, should contain --dry-run=client", cmd)
	}
}

func TestGenerateScaleCommand_Unknown(t *testing.T) {
	r := KubeResourceRef{Kind: "Job", Name: "batch-job", Namespace: "default"}
	cmd := GenerateScaleCommand(r, 1, false)
	if !strings.Contains(cmd, "#") {
		t.Errorf("Unknown kind scale cmd = %q, should be a comment", cmd)
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// GenerateRollbackCommand
// ─────────────────────────────────────────────────────────────────────────────

func TestGenerateRollbackCommand_Deployment_NoRevision(t *testing.T) {
	r := KubeResourceRef{Kind: "Deployment", Name: "my-app", Namespace: "prod"}
	cmd := GenerateRollbackCommand(r, 0, false)
	if !strings.Contains(cmd, "rollout undo deployment/my-app") {
		t.Errorf("Rollback cmd = %q, should contain rollout undo", cmd)
	}
	if strings.Contains(cmd, "--to-revision") {
		t.Errorf("Rollback with revision=0 should not contain --to-revision: %q", cmd)
	}
}

func TestGenerateRollbackCommand_Deployment_WithRevision(t *testing.T) {
	r := KubeResourceRef{Kind: "Deployment", Name: "my-app", Namespace: "prod"}
	cmd := GenerateRollbackCommand(r, 3, false)
	if !strings.Contains(cmd, "--to-revision=3") {
		t.Errorf("Rollback cmd = %q, should contain --to-revision=3", cmd)
	}
}

func TestGenerateRollbackCommand_StatefulSet(t *testing.T) {
	r := KubeResourceRef{Kind: "StatefulSet", Name: "my-db", Namespace: "data"}
	cmd := GenerateRollbackCommand(r, 0, false)
	if !strings.Contains(cmd, "statefulset/my-db") {
		t.Errorf("StatefulSet rollback cmd = %q, should mention statefulset/my-db", cmd)
	}
}

func TestGenerateRollbackCommand_Unknown(t *testing.T) {
	r := KubeResourceRef{Kind: "ConfigMap", Name: "cfg", Namespace: "ns"}
	cmd := GenerateRollbackCommand(r, 0, false)
	if !strings.Contains(cmd, "#") {
		t.Errorf("Unknown kind rollback cmd = %q, should be a comment", cmd)
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// CalculateMemoryIncrease
// ─────────────────────────────────────────────────────────────────────────────

func TestCalculateMemoryIncrease_Empty(t *testing.T) {
	result := CalculateMemoryIncrease("")
	if result == "" {
		t.Error("CalculateMemoryIncrease('') should return non-empty default")
	}
}

func TestCalculateMemoryIncrease_Mi(t *testing.T) {
	result := CalculateMemoryIncrease("256Mi")
	// Should be 384Mi (256 + 128 = 384)
	if result != "384Mi" {
		t.Errorf("CalculateMemoryIncrease(256Mi) = %q, want 384Mi", result)
	}
}

func TestCalculateMemoryIncrease_512Mi(t *testing.T) {
	result := CalculateMemoryIncrease("512Mi")
	// 512 + 256 = 768
	if result != "768Mi" {
		t.Errorf("CalculateMemoryIncrease(512Mi) = %q, want 768Mi", result)
	}
}

func TestCalculateMemoryIncrease_Gi(t *testing.T) {
	result := CalculateMemoryIncrease("2Gi")
	// 2 * 1.5 = 3.0Gi
	if result != "3.0Gi" {
		t.Errorf("CalculateMemoryIncrease(2Gi) = %q, want 3.0Gi", result)
	}
}

func TestCalculateMemoryIncrease_Unknown_Fallback(t *testing.T) {
	result := CalculateMemoryIncrease("not-a-valid-limit")
	if result == "" {
		t.Error("CalculateMemoryIncrease with invalid input should return fallback, not empty")
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// GenerateMemoryPatchDiff
// ─────────────────────────────────────────────────────────────────────────────

func TestGenerateMemoryPatchDiff_ContainsDiff(t *testing.T) {
	diff := GenerateMemoryPatchDiff("app", "256Mi", "384Mi")
	if !strings.Contains(diff, "256Mi") {
		t.Errorf("diff = %q, should contain current limit 256Mi", diff)
	}
	if !strings.Contains(diff, "384Mi") {
		t.Errorf("diff = %q, should contain new limit 384Mi", diff)
	}
	if !strings.Contains(diff, "app") {
		t.Errorf("diff = %q, should contain container name 'app'", diff)
	}
}

func TestGenerateMemoryPatchDiff_HasPlusMinus(t *testing.T) {
	diff := GenerateMemoryPatchDiff("container", "128Mi", "192Mi")
	if !strings.Contains(diff, "-") || !strings.Contains(diff, "+") {
		t.Errorf("diff = %q, should contain - and + lines", diff)
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// getWorkloadRef (from fix_generators.go)
// ─────────────────────────────────────────────────────────────────────────────

func TestGetWorkloadRef_Deployment_ReturnsSelf(t *testing.T) {
	inc := &Incident{
		Resource: KubeResourceRef{Kind: "Deployment", Name: "my-app", Namespace: "prod"},
	}
	ref := getWorkloadRef(inc)
	if ref.Kind != "Deployment" {
		t.Errorf("getWorkloadRef(Deployment) = %q, want Deployment", ref.Kind)
	}
	if ref.Name != "my-app" {
		t.Errorf("getWorkloadRef(Deployment) name = %q, want my-app", ref.Name)
	}
}

func TestGetWorkloadRef_Pod_DerivesFromName(t *testing.T) {
	// Pod name with 2 dashes: app-name-hash-hash → should strip last 2 dash-segments
	inc := &Incident{
		Resource: KubeResourceRef{Kind: "Pod", Name: "my-app-abc12-xyz99", Namespace: "prod"},
	}
	ref := getWorkloadRef(inc)
	if ref.Kind != "Deployment" {
		t.Errorf("getWorkloadRef(Pod) kind = %q, want Deployment", ref.Kind)
	}
	// Should have stripped the hash suffixes
	if ref.Name == "" {
		t.Error("getWorkloadRef(Pod) should derive a non-empty name")
	}
}

func TestGetWorkloadRef_StatefulSet_ReturnsSelf(t *testing.T) {
	inc := &Incident{
		Resource: KubeResourceRef{Kind: "StatefulSet", Name: "my-db", Namespace: "data"},
	}
	ref := getWorkloadRef(inc)
	if ref.Kind != "StatefulSet" || ref.Name != "my-db" {
		t.Errorf("getWorkloadRef(StatefulSet) = {%s, %s}, want {StatefulSet, my-db}", ref.Kind, ref.Name)
	}
}

func TestGetWorkloadRef_WithMetadataOwner(t *testing.T) {
	inc := &Incident{
		Resource: KubeResourceRef{Kind: "Pod", Name: "app-pod", Namespace: "ns"},
		Metadata: map[string]interface{}{
			"ownerKind": "Deployment",
			"ownerName": "my-deployment",
		},
	}
	ref := getWorkloadRef(inc)
	if ref.Kind != "Deployment" || ref.Name != "my-deployment" {
		t.Errorf("getWorkloadRef with metadata = {%s, %s}, want {Deployment, my-deployment}", ref.Kind, ref.Name)
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// getRiskFromFix / matchesRecommendation / fixToAction
// ─────────────────────────────────────────────────────────────────────────────

func TestGetRiskFromFix_Safe(t *testing.T) {
	fix := &ProposedFix{Safe: true}
	if getRiskFromFix(fix) != RiskLow {
		t.Errorf("getRiskFromFix(safe) = %q, want RiskLow", getRiskFromFix(fix))
	}
}

func TestGetRiskFromFix_Unsafe(t *testing.T) {
	fix := &ProposedFix{Safe: false}
	if getRiskFromFix(fix) != RiskMedium {
		t.Errorf("getRiskFromFix(unsafe) = %q, want RiskMedium", getRiskFromFix(fix))
	}
}

func TestMatchesRecommendation_Restart(t *testing.T) {
	rec := &Recommendation{Title: "Restart the pod"}
	fix := &ProposedFix{Type: FixTypeRestart}
	if !matchesRecommendation(rec, fix) {
		t.Error("'Restart the pod' should match FixTypeRestart")
	}
}

func TestMatchesRecommendation_Scale(t *testing.T) {
	rec := &Recommendation{Title: "Scale replicas"}
	fix := &ProposedFix{Type: FixTypeScale}
	if !matchesRecommendation(rec, fix) {
		t.Error("'Scale replicas' should match FixTypeScale")
	}
}

func TestMatchesRecommendation_NoMatch(t *testing.T) {
	rec := &Recommendation{Title: "Check the logs"}
	fix := &ProposedFix{Type: FixTypeRestart}
	if matchesRecommendation(rec, fix) {
		t.Error("'Check the logs' should not match FixTypeRestart")
	}
}

func TestFixToAction_Restart_Pod(t *testing.T) {
	fix := &ProposedFix{
		Type:        FixTypeRestart,
		Description: "restart pod",
		TargetResource: KubeResourceRef{Kind: "Pod"},
	}
	action := fixToAction(fix)
	if action == nil {
		t.Fatal("fixToAction returned nil")
	}
	if action.Label != "Restart Pod" {
		t.Errorf("Label = %q, want 'Restart Pod'", action.Label)
	}
}

func TestFixToAction_Restart_Deployment(t *testing.T) {
	fix := &ProposedFix{
		Type:        FixTypeRestart,
		Description: "restart deployment",
		TargetResource: KubeResourceRef{Kind: "Deployment"},
	}
	action := fixToAction(fix)
	if action.Label != "Restart Deployment" {
		t.Errorf("Label = %q, want 'Restart Deployment'", action.Label)
	}
}

func TestFixToAction_Scale(t *testing.T) {
	fix := &ProposedFix{Type: FixTypeScale, Description: "scale up"}
	action := fixToAction(fix)
	if action.Label != "Scale Replicas" {
		t.Errorf("Label = %q, want 'Scale Replicas'", action.Label)
	}
}

func TestFixToAction_Rollback(t *testing.T) {
	fix := &ProposedFix{Type: FixTypeRollback, Description: "rollback"}
	action := fixToAction(fix)
	if action.Label != "Rollback" {
		t.Errorf("Label = %q, want 'Rollback'", action.Label)
	}
}

func TestFixToAction_Unknown(t *testing.T) {
	fix := &ProposedFix{Type: "unknown-type", Description: "unknown"}
	action := fixToAction(fix)
	if action == nil {
		t.Fatal("fixToAction should not return nil for unknown type")
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// NewFixGeneratorRegistry
// ─────────────────────────────────────────────────────────────────────────────

func TestNewFixGeneratorRegistry_NotNil(t *testing.T) {
	r := NewFixGeneratorRegistry()
	if r == nil {
		t.Fatal("NewFixGeneratorRegistry returned nil")
	}
}

func TestFixGeneratorRegistry_GenerateFixes_UnknownPattern(t *testing.T) {
	r := NewFixGeneratorRegistry()
	inc := &Incident{
		ID:      "INC-TEST",
		Pattern: PatternUnknown, // no generator registered for unknown
		Resource: KubeResourceRef{Kind: "Pod", Name: "test-pod", Namespace: "default"},
		Diagnosis: &Diagnosis{Summary: "test"},
	}
	// No generator for PatternUnknown → should return nil/empty
	fixes := r.GenerateFixes(inc)
	if len(fixes) != 0 {
		t.Errorf("unknown pattern GenerateFixes() = %d, want 0", len(fixes))
	}
}

func TestFixGeneratorRegistry_Register_AndGenerate(t *testing.T) {
	r := NewFixGeneratorRegistry()
	r.Register(PatternCrashLoop, &CrashLoopFixGenerator{})

	inc := &Incident{
		ID:      "INC-TEST",
		Pattern: PatternCrashLoop,
		Resource: KubeResourceRef{Kind: "Pod", Name: "test-pod", Namespace: "default"},
		Diagnosis: &Diagnosis{Summary: "test"},
	}
	fixes := r.GenerateFixes(inc)
	if len(fixes) == 0 {
		t.Error("CrashLoopFixGenerator should generate fixes for Pod+CrashLoop")
	}
}
