// Copyright 2025 KubeGraf Contributors
// SPDX-License-Identifier: Apache-2.0

package incidents_test

import (
	"testing"

	"github.com/kubegraf/kubegraf/pkg/incidents"
)

// ─────────────────────────────────────────────────────────────────────────────
// DefaultAggregatorConfig
// ─────────────────────────────────────────────────────────────────────────────

func TestDefaultAggregatorConfig_MaxIncidents(t *testing.T) {
	cfg := incidents.DefaultAggregatorConfig()
	if cfg.MaxIncidents <= 0 {
		t.Error("MaxIncidents should be positive")
	}
}

func TestDefaultAggregatorConfig_TTLSet(t *testing.T) {
	cfg := incidents.DefaultAggregatorConfig()
	if cfg.IncidentTTL <= 0 {
		t.Error("IncidentTTL should be positive")
	}
	if cfg.DeduplicationWindow <= 0 {
		t.Error("DeduplicationWindow should be positive")
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// NewIncidentAggregator
// ─────────────────────────────────────────────────────────────────────────────

func TestNewIncidentAggregator_NotNil(t *testing.T) {
	a := incidents.NewIncidentAggregator(incidents.DefaultAggregatorConfig())
	if a == nil {
		t.Fatal("NewIncidentAggregator returned nil")
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// ProcessSignals — empty
// ─────────────────────────────────────────────────────────────────────────────

func TestProcessSignals_Empty(t *testing.T) {
	a := incidents.NewIncidentAggregator(incidents.DefaultAggregatorConfig())
	result := a.ProcessSignals(nil)
	if len(result) != 0 {
		t.Errorf("ProcessSignals(nil) = %d incidents, want 0", len(result))
	}
}

func TestProcessSignals_EmptySlice(t *testing.T) {
	a := incidents.NewIncidentAggregator(incidents.DefaultAggregatorConfig())
	result := a.ProcessSignals([]*incidents.NormalizedSignal{})
	if len(result) != 0 {
		t.Errorf("ProcessSignals([]) = %d incidents, want 0", len(result))
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// GetAllIncidents / GetActiveIncidents — empty aggregator
// ─────────────────────────────────────────────────────────────────────────────

func TestGetAllIncidents_EmptyAggregator(t *testing.T) {
	a := incidents.NewIncidentAggregator(incidents.DefaultAggregatorConfig())
	all := a.GetAllIncidents()
	if len(all) != 0 {
		t.Errorf("empty aggregator: GetAllIncidents() = %d, want 0", len(all))
	}
}

func TestGetActiveIncidents_EmptyAggregator(t *testing.T) {
	a := incidents.NewIncidentAggregator(incidents.DefaultAggregatorConfig())
	active := a.GetActiveIncidents()
	if len(active) != 0 {
		t.Errorf("empty aggregator: GetActiveIncidents() = %d, want 0", len(active))
	}
}

func TestGetIncident_NotFound(t *testing.T) {
	a := incidents.NewIncidentAggregator(incidents.DefaultAggregatorConfig())
	got := a.GetIncident("nonexistent")
	if got != nil {
		t.Error("GetIncident for nonexistent ID should return nil")
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// InjectIncident / GetIncident
// ─────────────────────────────────────────────────────────────────────────────

func TestInjectIncident_ThenGet(t *testing.T) {
	a := incidents.NewIncidentAggregator(incidents.DefaultAggregatorConfig())
	inc := &incidents.Incident{
		ID:       "INC-001",
		Status:   incidents.StatusOpen,
		Severity: incidents.SeverityHigh,
	}
	a.InjectIncident(inc)

	got := a.GetIncident("INC-001")
	if got == nil {
		t.Fatal("InjectIncident: GetIncident returned nil")
	}
	if got.ID != "INC-001" {
		t.Errorf("got.ID = %q, want INC-001", got.ID)
	}
}

func TestInjectIncident_AppearsInAll(t *testing.T) {
	a := incidents.NewIncidentAggregator(incidents.DefaultAggregatorConfig())
	inc := &incidents.Incident{ID: "INC-002", Status: incidents.StatusOpen}
	a.InjectIncident(inc)

	all := a.GetAllIncidents()
	if len(all) == 0 {
		t.Error("InjectIncident: GetAllIncidents should return non-empty")
	}
}

func TestInjectIncident_ActiveStatus(t *testing.T) {
	a := incidents.NewIncidentAggregator(incidents.DefaultAggregatorConfig())
	inc := &incidents.Incident{ID: "INC-003", Status: incidents.StatusOpen}
	a.InjectIncident(inc)

	active := a.GetActiveIncidents()
	if len(active) == 0 {
		t.Error("open incident should appear in GetActiveIncidents")
	}
}

func TestInjectIncident_ResolvedNotActive(t *testing.T) {
	a := incidents.NewIncidentAggregator(incidents.DefaultAggregatorConfig())
	inc := &incidents.Incident{ID: "INC-004", Status: incidents.StatusResolved}
	a.InjectIncident(inc)

	active := a.GetActiveIncidents()
	for _, ai := range active {
		if ai.ID == "INC-004" {
			t.Error("resolved incident should not appear in GetActiveIncidents")
		}
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// SetCurrentClusterContext / ClearIncidentsByCluster
// ─────────────────────────────────────────────────────────────────────────────

func TestSetCurrentClusterContext_NoError(t *testing.T) {
	a := incidents.NewIncidentAggregator(incidents.DefaultAggregatorConfig())
	// Should not panic
	a.SetCurrentClusterContext("prod-cluster")
}

func TestClearIncidentsByCluster_EmptyAggregator(t *testing.T) {
	a := incidents.NewIncidentAggregator(incidents.DefaultAggregatorConfig())
	// Should not panic
	a.ClearIncidentsByCluster("prod-cluster")
}

func TestGetIncidentsBySeverity_EmptyAggregator(t *testing.T) {
	a := incidents.NewIncidentAggregator(incidents.DefaultAggregatorConfig())
	result := a.GetIncidentsBySeverity(incidents.SeverityCritical)
	if len(result) != 0 {
		t.Errorf("empty aggregator: GetIncidentsBySeverity = %d, want 0", len(result))
	}
}
