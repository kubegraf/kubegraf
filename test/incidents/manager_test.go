// Copyright 2025 KubeGraf Contributors
// SPDX-License-Identifier: Apache-2.0

package incidents_test

import (
	"testing"
	"time"

	"github.com/kubegraf/kubegraf/pkg/incidents"
)

// ─────────────────────────────────────────────────────────────────────────────
// DefaultManagerConfig
// ─────────────────────────────────────────────────────────────────────────────

func TestDefaultManagerConfig_Fields(t *testing.T) {
	cfg := incidents.DefaultManagerConfig()
	if cfg.SignalBufferSize <= 0 {
		t.Error("SignalBufferSize should be positive")
	}
	if cfg.ProcessingInterval <= 0 {
		t.Error("ProcessingInterval should be positive")
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// NewManager
// ─────────────────────────────────────────────────────────────────────────────

func TestNewManager_NotNil(t *testing.T) {
	m := incidents.NewManager(incidents.DefaultManagerConfig())
	if m == nil {
		t.Fatal("NewManager returned nil")
	}
}

func TestNewManager_GetClusterContext_Empty(t *testing.T) {
	m := incidents.NewManager(incidents.DefaultManagerConfig())
	if ctx := m.GetClusterContext(); ctx != "" {
		t.Errorf("default cluster context = %q, want empty", ctx)
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// SetClusterContext / GetClusterContext
// ─────────────────────────────────────────────────────────────────────────────

func TestSetClusterContext_Updates(t *testing.T) {
	m := incidents.NewManager(incidents.DefaultManagerConfig())
	m.SetClusterContext("prod-gke")
	if got := m.GetClusterContext(); got != "prod-gke" {
		t.Errorf("GetClusterContext() = %q, want prod-gke", got)
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// InjectIncident / GetIncident / GetAllIncidents
// ─────────────────────────────────────────────────────────────────────────────

func TestManager_InjectIncident_ThenGet(t *testing.T) {
	m := incidents.NewManager(incidents.DefaultManagerConfig())
	inc := &incidents.Incident{ID: "INC-001", Status: incidents.StatusOpen, Fingerprint: "fp-001"}
	m.InjectIncident(inc)

	got := m.GetIncident("INC-001")
	if got == nil {
		t.Fatal("GetIncident returned nil after InjectIncident")
	}
	if got.ID != "INC-001" {
		t.Errorf("ID = %q, want INC-001", got.ID)
	}
}

func TestManager_InjectIncident_Multiple(t *testing.T) {
	m := incidents.NewManager(incidents.DefaultManagerConfig())
	m.InjectIncident(&incidents.Incident{ID: "INC-001", Status: incidents.StatusOpen, Fingerprint: "fp-001"})
	m.InjectIncident(&incidents.Incident{ID: "INC-002", Status: incidents.StatusOpen, Fingerprint: "fp-002"})
	m.InjectIncident(&incidents.Incident{ID: "INC-003", Status: incidents.StatusResolved, Fingerprint: "fp-003"})

	all := m.GetAllIncidents()
	if len(all) != 3 {
		t.Errorf("GetAllIncidents() = %d, want 3", len(all))
	}
}

func TestManager_GetIncident_NotFound(t *testing.T) {
	m := incidents.NewManager(incidents.DefaultManagerConfig())
	got := m.GetIncident("nonexistent")
	if got != nil {
		t.Error("GetIncident nonexistent should return nil")
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// GetActiveIncidents
// ─────────────────────────────────────────────────────────────────────────────

func TestManager_GetActiveIncidents(t *testing.T) {
	m := incidents.NewManager(incidents.DefaultManagerConfig())
	m.InjectIncident(&incidents.Incident{ID: "INC-001", Status: incidents.StatusOpen, Fingerprint: "fp-001"})
	m.InjectIncident(&incidents.Incident{ID: "INC-002", Status: incidents.StatusResolved, Fingerprint: "fp-002"})

	active := m.GetActiveIncidents()
	if len(active) != 1 {
		t.Errorf("GetActiveIncidents() = %d, want 1", len(active))
	}
	if active[0].ID != "INC-001" {
		t.Errorf("active[0].ID = %q, want INC-001", active[0].ID)
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// RegisterCallback
// ─────────────────────────────────────────────────────────────────────────────

func TestManager_RegisterCallback_NoError(t *testing.T) {
	m := incidents.NewManager(incidents.DefaultManagerConfig())
	// Should not panic
	m.RegisterCallback(func(inc *incidents.Incident) {})
}

// ─────────────────────────────────────────────────────────────────────────────
// IngestSignal
// ─────────────────────────────────────────────────────────────────────────────

func TestManager_IngestSignal_NoError(t *testing.T) {
	m := incidents.NewManager(incidents.DefaultManagerConfig())
	signal := &incidents.NormalizedSignal{
		Source:    "event",
		Timestamp: time.Now(),
		Resource:  incidents.KubeResourceRef{Kind: "Pod", Name: "api-pod", Namespace: "default"},
	}
	// Should not panic
	m.IngestSignal(signal)
}
