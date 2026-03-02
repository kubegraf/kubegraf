// Copyright 2025 KubeGraf Contributors
// SPDX-License-Identifier: Apache-2.0

package incidents

import (
	"testing"
)

// ─────────────────────────────────────────────────────────────────────────────
// NewEvidencePackBuilder
// ─────────────────────────────────────────────────────────────────────────────

func TestNewEvidencePackBuilder_NotNil(t *testing.T) {
	b := NewEvidencePackBuilder()
	if b == nil {
		t.Fatal("NewEvidencePackBuilder returned nil")
	}
}

func TestNewEvidencePackBuilder_DefaultThresholds(t *testing.T) {
	b := NewEvidencePackBuilder()
	if b.maxEventsPerSource <= 0 {
		t.Error("maxEventsPerSource should be positive")
	}
	if b.relevanceThreshold <= 0 {
		t.Error("relevanceThreshold should be positive")
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// BuildFromIncident — minimal incident
// ─────────────────────────────────────────────────────────────────────────────

func TestBuildFromIncident_NotNil(t *testing.T) {
	b := NewEvidencePackBuilder()
	inc := &Incident{
		ID:     "INC-001",
		Status: StatusOpen,
	}
	pack := b.BuildFromIncident(inc)
	if pack == nil {
		t.Fatal("BuildFromIncident returned nil")
	}
}

func TestBuildFromIncident_IncidentID(t *testing.T) {
	b := NewEvidencePackBuilder()
	inc := &Incident{ID: "INC-002"}
	pack := b.BuildFromIncident(inc)
	if pack.IncidentID != "INC-002" {
		t.Errorf("pack.IncidentID = %q, want INC-002", pack.IncidentID)
	}
}

func TestBuildFromIncident_GeneratedAtSet(t *testing.T) {
	b := NewEvidencePackBuilder()
	inc := &Incident{ID: "INC-003"}
	pack := b.BuildFromIncident(inc)
	if pack.GeneratedAt.IsZero() {
		t.Error("pack.GeneratedAt should not be zero")
	}
}

func TestBuildFromIncident_EmptySignals_NoEvents(t *testing.T) {
	b := NewEvidencePackBuilder()
	inc := &Incident{ID: "INC-004"}
	pack := b.BuildFromIncident(inc)
	// No signals — events/logs/status/metrics should all be nil or empty
	if len(pack.Events) != 0 {
		t.Errorf("expected 0 events for empty signals, got %d", len(pack.Events))
	}
}

func TestBuildFromIncident_ConfidenceRange(t *testing.T) {
	b := NewEvidencePackBuilder()
	inc := &Incident{ID: "INC-005"}
	pack := b.BuildFromIncident(inc)
	if pack.Confidence < 0 || pack.Confidence > 1 {
		t.Errorf("pack.Confidence = %f, want 0 <= c <= 1", pack.Confidence)
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// stringMapToInterface
// ─────────────────────────────────────────────────────────────────────────────

func TestStringMapToInterface_Empty(t *testing.T) {
	result := stringMapToInterface(map[string]string{})
	if len(result) != 0 {
		t.Errorf("empty map: got %d entries, want 0", len(result))
	}
}

func TestStringMapToInterface_PreservesKV(t *testing.T) {
	input := map[string]string{"k1": "v1", "k2": "v2"}
	result := stringMapToInterface(input)
	if len(result) != 2 {
		t.Errorf("len = %d, want 2", len(result))
	}
	if result["k1"] != "v1" {
		t.Errorf("result[k1] = %v, want v1", result["k1"])
	}
	if result["k2"] != "v2" {
		t.Errorf("result[k2] = %v, want v2", result["k2"])
	}
}
