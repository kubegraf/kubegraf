// Copyright 2025 KubeGraf Contributors
// SPDX-License-Identifier: Apache-2.0

package incidents_test

import (
	"strings"
	"testing"
	"time"

	"github.com/kubegraf/kubegraf/pkg/incidents"
)

// ─────────────────────────────────────────────────────────────────────────────
// Severity.Weight()
// ─────────────────────────────────────────────────────────────────────────────

func TestSeverityWeight_Critical(t *testing.T) {
	if incidents.SeverityCritical.Weight() != 5 {
		t.Errorf("Critical weight = %d, want 5", incidents.SeverityCritical.Weight())
	}
}

func TestSeverityWeight_High(t *testing.T) {
	if incidents.SeverityHigh.Weight() != 4 {
		t.Errorf("High weight = %d, want 4", incidents.SeverityHigh.Weight())
	}
}

func TestSeverityWeight_Medium(t *testing.T) {
	if incidents.SeverityMedium.Weight() != 3 {
		t.Errorf("Medium weight = %d, want 3", incidents.SeverityMedium.Weight())
	}
}

func TestSeverityWeight_Low(t *testing.T) {
	if incidents.SeverityLow.Weight() != 2 {
		t.Errorf("Low weight = %d, want 2", incidents.SeverityLow.Weight())
	}
}

func TestSeverityWeight_Info(t *testing.T) {
	if incidents.SeverityInfo.Weight() != 1 {
		t.Errorf("Info weight = %d, want 1", incidents.SeverityInfo.Weight())
	}
}

func TestSeverityWeight_Unknown(t *testing.T) {
	if incidents.Severity("bogus").Weight() != 0 {
		t.Errorf("Unknown severity weight should be 0")
	}
}

func TestSeverityWeight_Ordered(t *testing.T) {
	if !(incidents.SeverityCritical.Weight() > incidents.SeverityHigh.Weight() &&
		incidents.SeverityHigh.Weight() > incidents.SeverityMedium.Weight() &&
		incidents.SeverityMedium.Weight() > incidents.SeverityLow.Weight() &&
		incidents.SeverityLow.Weight() > incidents.SeverityInfo.Weight()) {
		t.Error("Severity weights should be strictly decreasing critical > high > medium > low > info")
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// KubeResourceRef.String()
// ─────────────────────────────────────────────────────────────────────────────

func TestKubeResourceRef_String_WithNamespace(t *testing.T) {
	r := incidents.KubeResourceRef{Kind: "Pod", Name: "my-pod", Namespace: "default"}
	got := r.String()
	if got != "default/Pod/my-pod" {
		t.Errorf("String() = %q, want default/Pod/my-pod", got)
	}
}

func TestKubeResourceRef_String_NoNamespace(t *testing.T) {
	r := incidents.KubeResourceRef{Kind: "Node", Name: "node-1"}
	got := r.String()
	if got != "Node/node-1" {
		t.Errorf("String() = %q, want Node/node-1", got)
	}
}

func TestKubeResourceRef_String_EmptyNamespace(t *testing.T) {
	r := incidents.KubeResourceRef{Kind: "ClusterRole", Name: "admin", Namespace: ""}
	got := r.String()
	if got != "ClusterRole/admin" {
		t.Errorf("String() = %q, want ClusterRole/admin", got)
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// IncidentSignals helpers
// ─────────────────────────────────────────────────────────────────────────────

func TestIncidentSignals_Count_Empty(t *testing.T) {
	s := &incidents.IncidentSignals{}
	if s.Count() != 0 {
		t.Errorf("Count() = %d, want 0", s.Count())
	}
}

func TestIncidentSignals_Count_NonEmpty(t *testing.T) {
	s := &incidents.IncidentSignals{
		Events:  []incidents.NormalizedSignal{{}, {}},
		Logs:    []incidents.NormalizedSignal{{}},
		Status:  []incidents.NormalizedSignal{{}, {}, {}},
		Metrics: []incidents.NormalizedSignal{{}},
	}
	if s.Count() != 7 {
		t.Errorf("Count() = %d, want 7", s.Count())
	}
}

func TestIncidentSignals_AllSignals_Empty(t *testing.T) {
	s := &incidents.IncidentSignals{}
	if len(s.AllSignals()) != 0 {
		t.Error("AllSignals() on empty should be empty")
	}
}

func TestIncidentSignals_AllSignals_Flattens(t *testing.T) {
	s := &incidents.IncidentSignals{
		Events: []incidents.NormalizedSignal{{ID: "e1"}},
		Logs:   []incidents.NormalizedSignal{{ID: "l1"}},
	}
	all := s.AllSignals()
	if len(all) != 2 {
		t.Errorf("AllSignals() len = %d, want 2", len(all))
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// Incident helpers: IsActive, Age, BlastRadius, IncrementOccurrences
// ─────────────────────────────────────────────────────────────────────────────

func TestIncident_IsActive_Open(t *testing.T) {
	i := &incidents.Incident{Status: incidents.StatusOpen}
	if !i.IsActive() {
		t.Error("StatusOpen should be active")
	}
}

func TestIncident_IsActive_Investigating(t *testing.T) {
	i := &incidents.Incident{Status: incidents.StatusInvestigating}
	if !i.IsActive() {
		t.Error("StatusInvestigating should be active")
	}
}

func TestIncident_IsActive_Remediating(t *testing.T) {
	i := &incidents.Incident{Status: incidents.StatusRemediating}
	if !i.IsActive() {
		t.Error("StatusRemediating should be active")
	}
}

func TestIncident_IsActive_Resolved(t *testing.T) {
	i := &incidents.Incident{Status: incidents.StatusResolved}
	if i.IsActive() {
		t.Error("StatusResolved should not be active")
	}
}

func TestIncident_IsActive_Suppressed(t *testing.T) {
	i := &incidents.Incident{Status: incidents.StatusSuppressed}
	if i.IsActive() {
		t.Error("StatusSuppressed should not be active")
	}
}

func TestIncident_Age_Positive(t *testing.T) {
	i := &incidents.Incident{FirstSeen: time.Now().Add(-5 * time.Minute)}
	age := i.Age()
	if age < 4*time.Minute || age > 6*time.Minute {
		t.Errorf("Age() = %v, expected ~5m", age)
	}
}

func TestIncident_BlastRadius_NoRelated(t *testing.T) {
	i := &incidents.Incident{}
	if i.BlastRadius() != 1 {
		t.Errorf("BlastRadius() = %d, want 1", i.BlastRadius())
	}
}

func TestIncident_BlastRadius_WithRelated(t *testing.T) {
	i := &incidents.Incident{
		RelatedResources: []incidents.KubeResourceRef{{Kind: "Service"}, {Kind: "Deployment"}},
	}
	if i.BlastRadius() != 3 {
		t.Errorf("BlastRadius() = %d, want 3", i.BlastRadius())
	}
}

func TestIncident_IncrementOccurrences(t *testing.T) {
	i := &incidents.Incident{Occurrences: 5}
	before := time.Now()
	i.IncrementOccurrences()
	if i.Occurrences != 6 {
		t.Errorf("Occurrences = %d, want 6", i.Occurrences)
	}
	if i.LastSeen.Before(before) {
		t.Error("LastSeen should be updated after IncrementOccurrences")
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// Incident.AddTimelineEntry / UpdateStatus
// ─────────────────────────────────────────────────────────────────────────────

func TestIncident_AddTimelineEntry(t *testing.T) {
	i := &incidents.Incident{}
	i.AddTimelineEntry("test_event", "something happened", nil)
	if len(i.Timeline) != 1 {
		t.Errorf("Timeline len = %d, want 1", len(i.Timeline))
	}
	if i.Timeline[0].Type != "test_event" {
		t.Errorf("Timeline[0].Type = %q, want test_event", i.Timeline[0].Type)
	}
	if i.Timeline[0].Description != "something happened" {
		t.Errorf("Timeline[0].Description = %q, want something happened", i.Timeline[0].Description)
	}
}

func TestIncident_UpdateStatus_SetsStatus(t *testing.T) {
	i := &incidents.Incident{Status: incidents.StatusOpen}
	i.UpdateStatus(incidents.StatusInvestigating, "manual triage")
	if i.Status != incidents.StatusInvestigating {
		t.Errorf("Status = %q, want investigating", i.Status)
	}
}

func TestIncident_UpdateStatus_AddsTimeline(t *testing.T) {
	i := &incidents.Incident{Status: incidents.StatusOpen}
	i.UpdateStatus(incidents.StatusResolved, "fixed")
	if len(i.Timeline) == 0 {
		t.Error("UpdateStatus should add a timeline entry")
	}
}

func TestIncident_UpdateStatus_Resolved_SetsResolvedAt(t *testing.T) {
	i := &incidents.Incident{Status: incidents.StatusOpen}
	before := time.Now()
	i.UpdateStatus(incidents.StatusResolved, "all clear")
	if i.ResolvedAt == nil {
		t.Error("ResolvedAt should be set when resolved")
	}
	if i.ResolvedAt.Before(before) {
		t.Error("ResolvedAt should be >= time of resolution")
	}
	if i.Resolution != "all clear" {
		t.Errorf("Resolution = %q, want 'all clear'", i.Resolution)
	}
}

func TestIncident_UpdateStatus_NotResolved_NoResolvedAt(t *testing.T) {
	i := &incidents.Incident{Status: incidents.StatusOpen}
	i.UpdateStatus(incidents.StatusInvestigating, "looking")
	if i.ResolvedAt != nil {
		t.Error("ResolvedAt should not be set for non-resolved status")
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// GenerateFingerprint
// ─────────────────────────────────────────────────────────────────────────────

func TestGenerateFingerprint_NotEmpty(t *testing.T) {
	fp := incidents.GenerateFingerprint(incidents.PatternCrashLoop, incidents.KubeResourceRef{Kind: "Pod", Name: "p", Namespace: "ns"}, nil)
	if fp == "" {
		t.Error("GenerateFingerprint should not return empty string")
	}
}

func TestGenerateFingerprint_Deterministic(t *testing.T) {
	res := incidents.KubeResourceRef{Kind: "Pod", Name: "app-pod", Namespace: "prod"}
	fp1 := incidents.GenerateFingerprint(incidents.PatternCrashLoop, res, nil)
	fp2 := incidents.GenerateFingerprint(incidents.PatternCrashLoop, res, nil)
	if fp1 != fp2 {
		t.Error("GenerateFingerprint should be deterministic")
	}
}

func TestGenerateFingerprint_DifferentPatterns(t *testing.T) {
	res := incidents.KubeResourceRef{Kind: "Pod", Name: "app-pod", Namespace: "prod"}
	fp1 := incidents.GenerateFingerprint(incidents.PatternCrashLoop, res, nil)
	fp2 := incidents.GenerateFingerprint(incidents.PatternOOMPressure, res, nil)
	if fp1 == fp2 {
		t.Error("Different patterns should produce different fingerprints")
	}
}

func TestGenerateFingerprint_DifferentResources(t *testing.T) {
	res1 := incidents.KubeResourceRef{Kind: "Pod", Name: "pod-a", Namespace: "ns"}
	res2 := incidents.KubeResourceRef{Kind: "Pod", Name: "pod-b", Namespace: "ns"}
	fp1 := incidents.GenerateFingerprint(incidents.PatternCrashLoop, res1, nil)
	fp2 := incidents.GenerateFingerprint(incidents.PatternCrashLoop, res2, nil)
	if fp1 == fp2 {
		t.Error("Different resources should produce different fingerprints")
	}
}

func TestGenerateFingerprint_WithSymptoms(t *testing.T) {
	res := incidents.KubeResourceRef{Kind: "Pod", Name: "pod", Namespace: "ns"}
	symptoms := []*incidents.Symptom{{Type: incidents.SymptomHighRestartCount}}
	fp1 := incidents.GenerateFingerprint(incidents.PatternCrashLoop, res, nil)
	fp2 := incidents.GenerateFingerprint(incidents.PatternCrashLoop, res, symptoms)
	if fp1 == fp2 {
		t.Error("Symptoms should affect fingerprint")
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// GenerateIncidentID
// ─────────────────────────────────────────────────────────────────────────────

func TestGenerateIncidentID_StartsWithINC(t *testing.T) {
	id := incidents.GenerateIncidentID("abcdef12", time.Now())
	if !strings.HasPrefix(id, "INC-") {
		t.Errorf("GenerateIncidentID = %q, should start with INC-", id)
	}
}

func TestGenerateIncidentID_ContainsFingerprint(t *testing.T) {
	id := incidents.GenerateIncidentID("abcdef12", time.Now())
	if !strings.Contains(id, "abcdef12") {
		t.Errorf("GenerateIncidentID = %q, should contain fingerprint prefix", id)
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// IncidentStatus constants
// ─────────────────────────────────────────────────────────────────────────────

func TestIncidentStatus_Constants_NonEmpty(t *testing.T) {
	statuses := []incidents.IncidentStatus{
		incidents.StatusOpen, incidents.StatusInvestigating, incidents.StatusRemediating,
		incidents.StatusResolved, incidents.StatusSuppressed,
	}
	for _, s := range statuses {
		if s == "" {
			t.Error("IncidentStatus constant should not be empty")
		}
	}
}

func TestIncidentStatus_Constants_Unique(t *testing.T) {
	statuses := []incidents.IncidentStatus{
		incidents.StatusOpen, incidents.StatusInvestigating, incidents.StatusRemediating,
		incidents.StatusResolved, incidents.StatusSuppressed,
	}
	seen := make(map[incidents.IncidentStatus]bool)
	for _, s := range statuses {
		if seen[s] {
			t.Errorf("duplicate IncidentStatus: %q", s)
		}
		seen[s] = true
	}
}
