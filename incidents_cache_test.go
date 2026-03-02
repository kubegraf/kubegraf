// Copyright 2025 KubeGraf Contributors
// SPDX-License-Identifier: Apache-2.0

package main

import (
	"testing"

	"github.com/kubegraf/kubegraf/pkg/incidents"
)

// ─────────────────────────────────────────────────────────────────────────────
// NewIncidentCache
// ─────────────────────────────────────────────────────────────────────────────

func TestNewIncidentCache_NotNil(t *testing.T) {
	c := NewIncidentCache()
	if c == nil {
		t.Fatal("NewIncidentCache returned nil")
	}
}

func TestNewIncidentCache_TTLsSet(t *testing.T) {
	c := NewIncidentCache()
	if c.v1TTL <= 0 {
		t.Error("v1TTL should be positive")
	}
	if c.v2TTL <= 0 {
		t.Error("v2TTL should be positive")
	}
	if c.evidenceTTL <= 0 {
		t.Error("evidenceTTL should be positive")
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// GetV1Incidents / SetV1Incidents
// ─────────────────────────────────────────────────────────────────────────────

func TestGetV1Incidents_MissReturnsNil(t *testing.T) {
	c := NewIncidentCache()
	got := c.GetV1Incidents("default")
	if got != nil {
		t.Error("cache miss should return nil")
	}
}

func TestSetV1Incidents_ThenGet(t *testing.T) {
	c := NewIncidentCache()
	items := []KubernetesIncident{{ID: "inc-1", Type: "oom"}}
	c.SetV1Incidents("default", items)
	got := c.GetV1Incidents("default")
	if len(got) != 1 {
		t.Errorf("expected 1 cached incident, got %d", len(got))
	}
	if got[0].ID != "inc-1" {
		t.Errorf("incident ID = %q, want inc-1", got[0].ID)
	}
}

func TestSetV1Incidents_DifferentNamespaces(t *testing.T) {
	c := NewIncidentCache()
	c.SetV1Incidents("ns-a", []KubernetesIncident{{ID: "a"}})
	c.SetV1Incidents("ns-b", []KubernetesIncident{{ID: "b"}, {ID: "c"}})

	a := c.GetV1Incidents("ns-a")
	b := c.GetV1Incidents("ns-b")
	if len(a) != 1 {
		t.Errorf("ns-a: expected 1 incident, got %d", len(a))
	}
	if len(b) != 2 {
		t.Errorf("ns-b: expected 2 incidents, got %d", len(b))
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// GetV2Incident / SetV2Incident
// ─────────────────────────────────────────────────────────────────────────────

func TestGetV2Incident_MissReturnsNil(t *testing.T) {
	c := NewIncidentCache()
	got := c.GetV2Incident("nonexistent")
	if got != nil {
		t.Error("v2 cache miss should return nil")
	}
}

func TestSetV2Incident_ThenGet(t *testing.T) {
	c := NewIncidentCache()
	inc := &incidents.Incident{ID: "INC-001"}
	c.SetV2Incident("INC-001", inc)
	got := c.GetV2Incident("INC-001")
	if got == nil {
		t.Fatal("expected cached v2 incident, got nil")
	}
	if got.ID != "INC-001" {
		t.Errorf("incident ID = %q, want INC-001", got.ID)
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// GetCitations / SetCitations
// ─────────────────────────────────────────────────────────────────────────────

func TestGetCitations_MissReturnsNil(t *testing.T) {
	c := NewIncidentCache()
	got := c.GetCitations("INC-999")
	if got != nil {
		t.Error("citations cache miss should return nil")
	}
}

func TestSetCitations_ThenGet(t *testing.T) {
	c := NewIncidentCache()
	cites := []map[string]interface{}{{"url": "http://example.com", "title": "doc"}}
	c.SetCitations("INC-001", cites)
	got := c.GetCitations("INC-001")
	if len(got) != 1 {
		t.Errorf("expected 1 citation, got %d", len(got))
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// GetRunbooks / SetRunbooks
// ─────────────────────────────────────────────────────────────────────────────

func TestGetRunbooks_MissReturnsNil(t *testing.T) {
	c := NewIncidentCache()
	got := c.GetRunbooks("crash-loop")
	if got != nil {
		t.Error("runbooks cache miss should return nil")
	}
}

func TestSetRunbooks_ThenGet(t *testing.T) {
	c := NewIncidentCache()
	books := []map[string]interface{}{{"step": "1", "action": "restart pod"}}
	c.SetRunbooks("crash-loop", books)
	got := c.GetRunbooks("crash-loop")
	if len(got) != 1 {
		t.Errorf("expected 1 runbook, got %d", len(got))
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// Clear
// ─────────────────────────────────────────────────────────────────────────────

func TestClear_RemovesCachedData(t *testing.T) {
	c := NewIncidentCache()
	c.SetV1Incidents("default", []KubernetesIncident{{ID: "x"}})
	c.SetCitations("INC-001", []map[string]interface{}{{"k": "v"}})
	c.Clear()

	if got := c.GetV1Incidents("default"); got != nil {
		t.Error("Clear() should remove v1 incidents cache")
	}
	if got := c.GetCitations("INC-001"); got != nil {
		t.Error("Clear() should remove citations cache")
	}
}
