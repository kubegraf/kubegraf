// Copyright 2025 KubeGraf Contributors
// SPDX-License-Identifier: Apache-2.0

package incidents_test

import (
	"testing"

	"github.com/kubegraf/kubegraf/pkg/incidents"
)

// ─────────────────────────────────────────────────────────────────────────────
// AutonomyLevel.String()
// ─────────────────────────────────────────────────────────────────────────────

func TestAutonomyLevelString_Observe(t *testing.T) {
	if incidents.AutonomyObserve.String() != "observe" {
		t.Errorf("AutonomyObserve.String() = %q, want observe", incidents.AutonomyObserve.String())
	}
}

func TestAutonomyLevelString_Recommend(t *testing.T) {
	if incidents.AutonomyRecommend.String() != "recommend" {
		t.Errorf("AutonomyRecommend.String() = %q, want recommend", incidents.AutonomyRecommend.String())
	}
}

func TestAutonomyLevelString_Propose(t *testing.T) {
	if incidents.AutonomyPropose.String() != "propose" {
		t.Errorf("AutonomyPropose.String() = %q, want propose", incidents.AutonomyPropose.String())
	}
}

func TestAutonomyLevelString_AutoExecute(t *testing.T) {
	if incidents.AutonomyAutoExecute.String() != "auto_execute" {
		t.Errorf("AutonomyAutoExecute.String() = %q, want auto_execute", incidents.AutonomyAutoExecute.String())
	}
}

func TestAutonomyLevelString_Unknown(t *testing.T) {
	if incidents.AutonomyLevel(99).String() != "unknown" {
		t.Errorf("AutonomyLevel(99).String() = %q, want unknown", incidents.AutonomyLevel(99).String())
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// NewRunbookRegistry
// ─────────────────────────────────────────────────────────────────────────────

func TestNewRunbookRegistry_NotNil(t *testing.T) {
	r := incidents.NewRunbookRegistry()
	if r == nil {
		t.Fatal("NewRunbookRegistry returned nil")
	}
}

func TestNewRunbookRegistry_HasRunbooks(t *testing.T) {
	r := incidents.NewRunbookRegistry()
	all := r.GetAll()
	if len(all) == 0 {
		t.Error("NewRunbookRegistry should pre-register default runbooks")
	}
}

func TestNewRunbookRegistry_RunbooksEnabled(t *testing.T) {
	r := incidents.NewRunbookRegistry()
	all := r.GetAll()
	for _, rb := range all {
		if !rb.Enabled {
			t.Errorf("runbook %q should be enabled by default", rb.ID)
		}
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// RunbookRegistry.Register / Get
// ─────────────────────────────────────────────────────────────────────────────

func TestRunbookRegistry_Register_Get(t *testing.T) {
	r := incidents.NewRunbookRegistry()
	rb := &incidents.Runbook{
		ID:      "test-rb-001",
		Name:    "Test Runbook",
		Pattern: incidents.PatternCrashLoop,
		Enabled: true,
	}
	r.Register(rb)

	got := r.Get("test-rb-001")
	if got == nil {
		t.Fatal("Get after Register returned nil")
	}
	if got.Name != "Test Runbook" {
		t.Errorf("got.Name = %q, want 'Test Runbook'", got.Name)
	}
}

func TestRunbookRegistry_Get_NotFound(t *testing.T) {
	r := incidents.NewRunbookRegistry()
	got := r.Get("nonexistent-id")
	if got != nil {
		t.Error("Get with nonexistent ID should return nil")
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// RunbookRegistry.GetByPattern
// ─────────────────────────────────────────────────────────────────────────────

func TestRunbookRegistry_GetByPattern_Found(t *testing.T) {
	r := incidents.NewRunbookRegistry()
	rbs := r.GetByPattern(incidents.PatternOOMPressure)
	if len(rbs) == 0 {
		t.Error("GetByPattern(OOM) should return runbooks from default registry")
	}
}

func TestRunbookRegistry_GetByPattern_NotFound(t *testing.T) {
	r := incidents.NewRunbookRegistry()
	rbs := r.GetByPattern(incidents.PatternCertificateExpiring)
	// May or may not have runbooks — just don't panic
	_ = rbs
}

func TestRunbookRegistry_GetByPattern_Custom(t *testing.T) {
	r := incidents.NewRunbookRegistry()
	r.Register(&incidents.Runbook{
		ID:      "custom-rb",
		Name:    "Custom Runbook",
		Pattern: incidents.PatternNetworkPartition,
		Enabled: true,
	})
	rbs := r.GetByPattern(incidents.PatternNetworkPartition)
	found := false
	for _, rb := range rbs {
		if rb.ID == "custom-rb" {
			found = true
			break
		}
	}
	if !found {
		t.Error("Custom registered runbook should appear in GetByPattern")
	}
}

func TestRunbookRegistry_GetByPattern_DisabledExcluded(t *testing.T) {
	r := incidents.NewRunbookRegistry()
	r.Register(&incidents.Runbook{
		ID:      "disabled-rb",
		Name:    "Disabled Runbook",
		Pattern: incidents.PatternNetworkPartition,
		Enabled: false,
	})
	rbs := r.GetByPattern(incidents.PatternNetworkPartition)
	for _, rb := range rbs {
		if rb.ID == "disabled-rb" {
			t.Error("Disabled runbook should not appear in GetByPattern")
		}
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// RunbookRegistry.GetAll
// ─────────────────────────────────────────────────────────────────────────────

func TestRunbookRegistry_GetAll_IncludesRegistered(t *testing.T) {
	r := incidents.NewRunbookRegistry()
	before := len(r.GetAll())
	r.Register(&incidents.Runbook{
		ID:      "extra-rb",
		Name:    "Extra",
		Pattern: incidents.PatternUnknown,
		Enabled: true,
	})
	after := len(r.GetAll())
	if after != before+1 {
		t.Errorf("GetAll after Register: got %d, want %d", after, before+1)
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// RunbookRegistry.CanAutoExecute
// ─────────────────────────────────────────────────────────────────────────────

func TestCanAutoExecute_AllConditionsMet(t *testing.T) {
	r := incidents.NewRunbookRegistry()
	rb := &incidents.Runbook{
		ID:            "auto-rb",
		Enabled:       true,
		AutonomyLevel: incidents.AutonomyAutoExecute,
		Risk:          incidents.RiskRunbookLow,
		SuccessRate:   0.95,
		Rollback:      &incidents.RunbookAction{Description: "rollback"},
	}
	inc := &incidents.Incident{ID: "INC-001", Status: incidents.StatusOpen}
	if !r.CanAutoExecute(rb, inc, 0.95) {
		t.Error("CanAutoExecute should return true when all conditions met")
	}
}

func TestCanAutoExecute_Disabled(t *testing.T) {
	r := incidents.NewRunbookRegistry()
	rb := &incidents.Runbook{
		Enabled:       false,
		AutonomyLevel: incidents.AutonomyAutoExecute,
		Risk:          incidents.RiskRunbookLow,
		SuccessRate:   0.95,
		Rollback:      &incidents.RunbookAction{},
	}
	inc := &incidents.Incident{}
	if r.CanAutoExecute(rb, inc, 0.95) {
		t.Error("CanAutoExecute should be false when disabled")
	}
}

func TestCanAutoExecute_LowAutonomy(t *testing.T) {
	r := incidents.NewRunbookRegistry()
	rb := &incidents.Runbook{
		Enabled:       true,
		AutonomyLevel: incidents.AutonomyRecommend,
		Risk:          incidents.RiskRunbookLow,
		SuccessRate:   0.95,
		Rollback:      &incidents.RunbookAction{},
	}
	inc := &incidents.Incident{}
	if r.CanAutoExecute(rb, inc, 0.95) {
		t.Error("CanAutoExecute should be false when autonomy < auto_execute")
	}
}

func TestCanAutoExecute_HighRisk(t *testing.T) {
	r := incidents.NewRunbookRegistry()
	rb := &incidents.Runbook{
		Enabled:       true,
		AutonomyLevel: incidents.AutonomyAutoExecute,
		Risk:          incidents.RiskRunbookHigh,
		SuccessRate:   0.95,
		Rollback:      &incidents.RunbookAction{},
	}
	inc := &incidents.Incident{}
	if r.CanAutoExecute(rb, inc, 0.95) {
		t.Error("CanAutoExecute should be false when risk is high")
	}
}

func TestCanAutoExecute_LowConfidence(t *testing.T) {
	r := incidents.NewRunbookRegistry()
	rb := &incidents.Runbook{
		Enabled:       true,
		AutonomyLevel: incidents.AutonomyAutoExecute,
		Risk:          incidents.RiskRunbookLow,
		SuccessRate:   0.95,
		Rollback:      &incidents.RunbookAction{},
	}
	inc := &incidents.Incident{}
	if r.CanAutoExecute(rb, inc, 0.5) {
		t.Error("CanAutoExecute should be false when confidence < 0.9")
	}
}

func TestCanAutoExecute_LowSuccessRate(t *testing.T) {
	r := incidents.NewRunbookRegistry()
	rb := &incidents.Runbook{
		Enabled:       true,
		AutonomyLevel: incidents.AutonomyAutoExecute,
		Risk:          incidents.RiskRunbookLow,
		SuccessRate:   0.7,
		Rollback:      &incidents.RunbookAction{},
	}
	inc := &incidents.Incident{}
	if r.CanAutoExecute(rb, inc, 0.95) {
		t.Error("CanAutoExecute should be false when SuccessRate < 0.9")
	}
}

func TestCanAutoExecute_NoRollback(t *testing.T) {
	r := incidents.NewRunbookRegistry()
	rb := &incidents.Runbook{
		Enabled:       true,
		AutonomyLevel: incidents.AutonomyAutoExecute,
		Risk:          incidents.RiskRunbookLow,
		SuccessRate:   0.95,
		Rollback:      nil,
	}
	inc := &incidents.Incident{}
	if r.CanAutoExecute(rb, inc, 0.95) {
		t.Error("CanAutoExecute should be false when Rollback is nil")
	}
}
