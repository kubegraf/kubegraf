// Copyright 2025 KubeGraf Contributors
// SPDX-License-Identifier: Apache-2.0

package incidents_test

import (
	"testing"

	"github.com/kubegraf/kubegraf/pkg/incidents"
)

// ─────────────────────────────────────────────────────────────────────────────
// Helper to create an aggregator with a pre-injected incident
// ─────────────────────────────────────────────────────────────────────────────

func newAggWithIncident(id string, pattern incidents.FailurePattern, severity incidents.Severity, namespace string, status incidents.IncidentStatus, cluster string) *incidents.IncidentAggregator {
	a := incidents.NewIncidentAggregator(incidents.DefaultAggregatorConfig())
	inc := &incidents.Incident{
		ID:             id,
		Pattern:        pattern,
		Severity:       severity,
		Status:         status,
		ClusterContext: cluster,
		Resource:       incidents.KubeResourceRef{Kind: "Pod", Name: "test-pod", Namespace: namespace},
		Fingerprint:    id + "-fp",
	}
	a.InjectIncident(inc)
	return a
}

// ─────────────────────────────────────────────────────────────────────────────
// GetIncidentsByPattern
// ─────────────────────────────────────────────────────────────────────────────

func TestGetIncidentsByPattern_Found(t *testing.T) {
	a := newAggWithIncident("INC-P1", incidents.PatternCrashLoop, incidents.SeverityCritical, "ns", incidents.StatusOpen, "")
	result := a.GetIncidentsByPattern(incidents.PatternCrashLoop)
	if len(result) != 1 {
		t.Errorf("GetIncidentsByPattern(CrashLoop) = %d, want 1", len(result))
	}
}

func TestGetIncidentsByPattern_NotFound(t *testing.T) {
	a := newAggWithIncident("INC-P2", incidents.PatternCrashLoop, incidents.SeverityHigh, "ns", incidents.StatusOpen, "")
	result := a.GetIncidentsByPattern(incidents.PatternOOMPressure)
	if len(result) != 0 {
		t.Errorf("GetIncidentsByPattern(OOM) = %d, want 0", len(result))
	}
}

func TestGetIncidentsByPattern_Empty(t *testing.T) {
	a := incidents.NewIncidentAggregator(incidents.DefaultAggregatorConfig())
	result := a.GetIncidentsByPattern(incidents.PatternCrashLoop)
	if len(result) != 0 {
		t.Errorf("empty agg GetIncidentsByPattern = %d, want 0", len(result))
	}
}

func TestGetIncidentsByPattern_Multiple(t *testing.T) {
	a := incidents.NewIncidentAggregator(incidents.DefaultAggregatorConfig())
	a.InjectIncident(&incidents.Incident{ID: "A", Pattern: incidents.PatternCrashLoop, Fingerprint: "fp-a"})
	a.InjectIncident(&incidents.Incident{ID: "B", Pattern: incidents.PatternCrashLoop, Fingerprint: "fp-b"})
	a.InjectIncident(&incidents.Incident{ID: "C", Pattern: incidents.PatternOOMPressure, Fingerprint: "fp-c"})
	result := a.GetIncidentsByPattern(incidents.PatternCrashLoop)
	if len(result) != 2 {
		t.Errorf("GetIncidentsByPattern(CrashLoop) = %d, want 2", len(result))
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// GetIncidentsByNamespace
// ─────────────────────────────────────────────────────────────────────────────

func TestGetIncidentsByNamespace_Found(t *testing.T) {
	a := newAggWithIncident("INC-NS1", incidents.PatternCrashLoop, incidents.SeverityHigh, "production", incidents.StatusOpen, "")
	result := a.GetIncidentsByNamespace("production")
	if len(result) != 1 {
		t.Errorf("GetIncidentsByNamespace(production) = %d, want 1", len(result))
	}
}

func TestGetIncidentsByNamespace_NotFound(t *testing.T) {
	a := newAggWithIncident("INC-NS2", incidents.PatternCrashLoop, incidents.SeverityHigh, "staging", incidents.StatusOpen, "")
	result := a.GetIncidentsByNamespace("production")
	if len(result) != 0 {
		t.Errorf("GetIncidentsByNamespace(production) = %d, want 0", len(result))
	}
}

func TestGetIncidentsByNamespace_Empty(t *testing.T) {
	a := incidents.NewIncidentAggregator(incidents.DefaultAggregatorConfig())
	result := a.GetIncidentsByNamespace("ns")
	if len(result) != 0 {
		t.Errorf("empty agg GetIncidentsByNamespace = %d, want 0", len(result))
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// GetSummary
// ─────────────────────────────────────────────────────────────────────────────

func TestGetSummary_Empty(t *testing.T) {
	a := incidents.NewIncidentAggregator(incidents.DefaultAggregatorConfig())
	summary := a.GetSummary()
	if summary.Total != 0 {
		t.Errorf("GetSummary() empty: Total = %d, want 0", summary.Total)
	}
	if summary.Active != 0 {
		t.Errorf("GetSummary() empty: Active = %d, want 0", summary.Active)
	}
}

func TestGetSummary_Counts(t *testing.T) {
	a := incidents.NewIncidentAggregator(incidents.DefaultAggregatorConfig())
	a.InjectIncident(&incidents.Incident{ID: "A", Pattern: incidents.PatternCrashLoop, Severity: incidents.SeverityCritical, Status: incidents.StatusOpen, Fingerprint: "fp-a"})
	a.InjectIncident(&incidents.Incident{ID: "B", Pattern: incidents.PatternOOMPressure, Severity: incidents.SeverityHigh, Status: incidents.StatusResolved, Fingerprint: "fp-b"})

	summary := a.GetSummary()
	if summary.Total != 2 {
		t.Errorf("Total = %d, want 2", summary.Total)
	}
	if summary.Active != 1 {
		t.Errorf("Active = %d, want 1 (only open)", summary.Active)
	}
	if summary.BySeverity[incidents.SeverityCritical] != 1 {
		t.Errorf("BySeverity[critical] = %d, want 1", summary.BySeverity[incidents.SeverityCritical])
	}
	if summary.ByPattern[incidents.PatternCrashLoop] != 1 {
		t.Errorf("ByPattern[crashloop] = %d, want 1", summary.ByPattern[incidents.PatternCrashLoop])
	}
}

func TestGetSummary_MapsInitialized(t *testing.T) {
	a := incidents.NewIncidentAggregator(incidents.DefaultAggregatorConfig())
	summary := a.GetSummary()
	if summary.BySeverity == nil {
		t.Error("BySeverity map should be initialized")
	}
	if summary.ByPattern == nil {
		t.Error("ByPattern map should be initialized")
	}
	if summary.ByStatus == nil {
		t.Error("ByStatus map should be initialized")
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// UpdateIncidentStatus / SuppressIncident / ResolveIncident
// ─────────────────────────────────────────────────────────────────────────────

func TestUpdateIncidentStatus_Found(t *testing.T) {
	a := newAggWithIncident("INC-ST1", incidents.PatternCrashLoop, incidents.SeverityHigh, "ns", incidents.StatusOpen, "")
	err := a.UpdateIncidentStatus("INC-ST1", incidents.StatusInvestigating, "manual triage")
	if err != nil {
		t.Errorf("UpdateIncidentStatus: %v", err)
	}
	got := a.GetIncident("INC-ST1")
	if got.Status != incidents.StatusInvestigating {
		t.Errorf("Status = %q, want investigating", got.Status)
	}
}

func TestUpdateIncidentStatus_NotFound(t *testing.T) {
	a := incidents.NewIncidentAggregator(incidents.DefaultAggregatorConfig())
	err := a.UpdateIncidentStatus("nonexistent", incidents.StatusResolved, "resolved")
	if err == nil {
		t.Error("UpdateIncidentStatus for nonexistent incident should return error")
	}
}

func TestSuppressIncident_Found(t *testing.T) {
	a := newAggWithIncident("INC-SUP", incidents.PatternCrashLoop, incidents.SeverityMedium, "ns", incidents.StatusOpen, "")
	err := a.SuppressIncident("INC-SUP", "false alarm")
	if err != nil {
		t.Errorf("SuppressIncident: %v", err)
	}
	got := a.GetIncident("INC-SUP")
	if got.Status != incidents.StatusSuppressed {
		t.Errorf("Status = %q, want suppressed", got.Status)
	}
}

func TestSuppressIncident_NotFound(t *testing.T) {
	a := incidents.NewIncidentAggregator(incidents.DefaultAggregatorConfig())
	err := a.SuppressIncident("nonexistent", "no reason")
	if err == nil {
		t.Error("SuppressIncident on nonexistent should return error")
	}
}

func TestResolveIncident_Found(t *testing.T) {
	a := newAggWithIncident("INC-RES", incidents.PatternOOMPressure, incidents.SeverityCritical, "ns", incidents.StatusOpen, "")
	err := a.ResolveIncident("INC-RES", "memory limit increased")
	if err != nil {
		t.Errorf("ResolveIncident: %v", err)
	}
	got := a.GetIncident("INC-RES")
	if got.Status != incidents.StatusResolved {
		t.Errorf("Status = %q, want resolved", got.Status)
	}
}

func TestResolveIncident_NotFound(t *testing.T) {
	a := incidents.NewIncidentAggregator(incidents.DefaultAggregatorConfig())
	err := a.ResolveIncident("nonexistent", "no fix")
	if err == nil {
		t.Error("ResolveIncident on nonexistent should return error")
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// GetIncidentsBySeverity — with injected incidents
// ─────────────────────────────────────────────────────────────────────────────

func TestGetIncidentsBySeverity_Found(t *testing.T) {
	a := incidents.NewIncidentAggregator(incidents.DefaultAggregatorConfig())
	a.InjectIncident(&incidents.Incident{ID: "A", Severity: incidents.SeverityCritical, Fingerprint: "fp-a"})
	a.InjectIncident(&incidents.Incident{ID: "B", Severity: incidents.SeverityMedium, Fingerprint: "fp-b"})
	result := a.GetIncidentsBySeverity(incidents.SeverityHigh)
	// Critical (weight 5) >= High (weight 4): should include critical
	if len(result) != 1 {
		t.Errorf("GetIncidentsBySeverity(High) = %d, want 1 (only critical)", len(result))
	}
	if result[0].ID != "A" {
		t.Errorf("result[0].ID = %q, want A", result[0].ID)
	}
}

func TestGetIncidentsBySeverity_AllCritical(t *testing.T) {
	a := incidents.NewIncidentAggregator(incidents.DefaultAggregatorConfig())
	a.InjectIncident(&incidents.Incident{ID: "X", Severity: incidents.SeverityCritical, Fingerprint: "fp-x"})
	result := a.GetIncidentsBySeverity(incidents.SeverityCritical)
	if len(result) != 1 {
		t.Errorf("GetIncidentsBySeverity(critical) = %d, want 1", len(result))
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// ClearIncidentsFromOtherClusters
// ─────────────────────────────────────────────────────────────────────────────

func TestClearIncidentsFromOtherClusters_ClearsOthers(t *testing.T) {
	a := incidents.NewIncidentAggregator(incidents.DefaultAggregatorConfig())
	a.InjectIncident(&incidents.Incident{ID: "PROD", ClusterContext: "prod", Fingerprint: "fp-prod"})
	a.InjectIncident(&incidents.Incident{ID: "STAG", ClusterContext: "staging", Fingerprint: "fp-stag"})

	cleared := a.ClearIncidentsFromOtherClusters("prod")
	if cleared != 1 {
		t.Errorf("ClearIncidentsFromOtherClusters: cleared = %d, want 1", cleared)
	}
	if a.GetIncident("PROD") == nil {
		t.Error("prod incident should remain after clearing other clusters")
	}
}

func TestClearIncidentsFromOtherClusters_KeepsCurrent(t *testing.T) {
	a := incidents.NewIncidentAggregator(incidents.DefaultAggregatorConfig())
	a.InjectIncident(&incidents.Incident{ID: "A", ClusterContext: "my-cluster", Fingerprint: "fp-a"})
	a.InjectIncident(&incidents.Incident{ID: "B", ClusterContext: "my-cluster", Fingerprint: "fp-b"})

	cleared := a.ClearIncidentsFromOtherClusters("my-cluster")
	if cleared != 0 {
		t.Errorf("Should clear 0 incidents from same cluster, cleared %d", cleared)
	}
}

func TestClearIncidentsFromOtherClusters_ClearsEmpty(t *testing.T) {
	a := incidents.NewIncidentAggregator(incidents.DefaultAggregatorConfig())
	// Incident with empty cluster context when target context is non-empty
	a.InjectIncident(&incidents.Incident{ID: "OLD", ClusterContext: "", Fingerprint: "fp-old"})

	cleared := a.ClearIncidentsFromOtherClusters("new-cluster")
	if cleared != 1 {
		t.Errorf("Should clear empty-context incident when current context is set, cleared %d", cleared)
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// UpsertScannedIncident
// ─────────────────────────────────────────────────────────────────────────────

func TestUpsertScannedIncident_NewIncident(t *testing.T) {
	a := incidents.NewIncidentAggregator(incidents.DefaultAggregatorConfig())
	inc := &incidents.Incident{
		ID:          "SCAN-001",
		Fingerprint: "scan-fp-001",
		Status:      incidents.StatusOpen,
	}
	a.UpsertScannedIncident(inc)
	got := a.GetIncident("SCAN-001")
	if got == nil {
		t.Fatal("UpsertScannedIncident: incident should be stored")
	}
}

func TestUpsertScannedIncident_ExistingIncrement(t *testing.T) {
	a := incidents.NewIncidentAggregator(incidents.DefaultAggregatorConfig())
	inc := &incidents.Incident{
		ID:          "SCAN-002",
		Fingerprint: "scan-fp-002",
		Occurrences: 1,
		Status:      incidents.StatusOpen,
	}
	a.UpsertScannedIncident(inc)
	// Upsert again with same fingerprint
	inc2 := &incidents.Incident{
		ID:          "SCAN-002b",
		Fingerprint: "scan-fp-002",
		Occurrences: 1,
		Status:      incidents.StatusOpen,
	}
	a.UpsertScannedIncident(inc2)

	got := a.GetIncident("SCAN-002")
	if got == nil {
		t.Fatal("Original incident should still exist")
	}
	if got.Occurrences != 2 {
		t.Errorf("Occurrences = %d, want 2 after upsert", got.Occurrences)
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// InjectIncident deduplication
// ─────────────────────────────────────────────────────────────────────────────

func TestInjectIncident_Dedup_SameID(t *testing.T) {
	a := incidents.NewIncidentAggregator(incidents.DefaultAggregatorConfig())
	a.InjectIncident(&incidents.Incident{ID: "DUP-001", Fingerprint: "fp-1"})
	a.InjectIncident(&incidents.Incident{ID: "DUP-001", Fingerprint: "fp-1b"}) // same ID, different fp

	all := a.GetAllIncidents()
	count := 0
	for _, inc := range all {
		if inc.ID == "DUP-001" {
			count++
		}
	}
	if count != 1 {
		t.Errorf("InjectIncident dedup: found %d incidents with DUP-001, want 1", count)
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// RegenerateRecommendations
// ─────────────────────────────────────────────────────────────────────────────

func TestRegenerateRecommendations_Empty(t *testing.T) {
	a := incidents.NewIncidentAggregator(incidents.DefaultAggregatorConfig())
	count := a.RegenerateRecommendations()
	if count != 0 {
		t.Errorf("RegenerateRecommendations on empty: count = %d, want 0", count)
	}
}

func TestRegenerateRecommendations_WithIncidents(t *testing.T) {
	a := incidents.NewIncidentAggregator(incidents.DefaultAggregatorConfig())
	a.InjectIncident(&incidents.Incident{
		ID:          "REC-001",
		Pattern:     incidents.PatternCrashLoop,
		Severity:    incidents.SeverityHigh,
		Status:      incidents.StatusOpen,
		Fingerprint: "fp-rec-001",
		Diagnosis:   &incidents.Diagnosis{Summary: "crash loop detected", Confidence: 0.8},
	})
	count := a.RegenerateRecommendations()
	if count != 1 {
		t.Errorf("RegenerateRecommendations with 1 incident: count = %d, want 1", count)
	}
}
