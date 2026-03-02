// Copyright 2025 KubeGraf Contributors
// SPDX-License-Identifier: Apache-2.0

package incidents_test

import (
	"testing"

	"github.com/kubegraf/kubegraf/pkg/incidents"
)

// ─────────────────────────────────────────────────────────────────────────────
// CalculateSeverity
// ─────────────────────────────────────────────────────────────────────────────

func TestCalculateSeverity_CrashLoop_Default(t *testing.T) {
	sev := incidents.CalculateSeverity(incidents.PatternCrashLoop, nil, 1)
	if sev == "" {
		t.Error("CalculateSeverity should not return empty severity")
	}
}

func TestCalculateSeverity_EscalatesWithOccurrences_High(t *testing.T) {
	sev := incidents.CalculateSeverity(incidents.PatternReadinessFailure, nil, 10)
	if sev.Weight() < incidents.SeverityHigh.Weight() {
		t.Errorf("10 occurrences should escalate to >= High, got %q", sev)
	}
}

func TestCalculateSeverity_EscalatesToCritical(t *testing.T) {
	sev := incidents.CalculateSeverity(incidents.PatternReadinessFailure, nil, 50)
	if sev != incidents.SeverityCritical {
		t.Errorf("50 occurrences should escalate to Critical, got %q", sev)
	}
}

func TestCalculateSeverity_HighestSymptomWins(t *testing.T) {
	symptoms := []*incidents.Symptom{
		{Type: incidents.SymptomHighRestartCount, Severity: incidents.SeverityCritical},
	}
	sev := incidents.CalculateSeverity(incidents.PatternReadinessFailure, symptoms, 1)
	if sev != incidents.SeverityCritical {
		t.Errorf("Critical symptom should make severity Critical, got %q", sev)
	}
}

func TestCalculateSeverity_UnknownPattern_DefaultsMedium(t *testing.T) {
	sev := incidents.CalculateSeverity(incidents.PatternUnknown, nil, 1)
	if sev == "" {
		t.Error("CalculateSeverity for unknown pattern should return non-empty")
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// NewDiagnosisGenerator
// ─────────────────────────────────────────────────────────────────────────────

func TestNewDiagnosisGenerator_NotNil(t *testing.T) {
	dg := incidents.NewDiagnosisGenerator()
	if dg == nil {
		t.Fatal("NewDiagnosisGenerator returned nil")
	}
}

func TestDiagnosisGenerator_GenerateDiagnosis_NoSymptoms(t *testing.T) {
	dg := incidents.NewDiagnosisGenerator()
	resource := incidents.KubeResourceRef{Kind: "Pod", Name: "test-pod", Namespace: "default"}
	match := &incidents.PatternMatch{Pattern: incidents.PatternCrashLoop, Confidence: 0.8}
	diag := dg.GenerateDiagnosis(resource, match, nil)
	if diag == nil {
		t.Fatal("GenerateDiagnosis should not return nil")
	}
}

func TestDiagnosisGenerator_GenerateDiagnosis_SummaryNotEmpty(t *testing.T) {
	dg := incidents.NewDiagnosisGenerator()
	resource := incidents.KubeResourceRef{Kind: "Pod", Name: "test-pod", Namespace: "default"}
	match := &incidents.PatternMatch{Pattern: incidents.PatternOOMPressure, Confidence: 0.9}
	symptoms := []*incidents.Symptom{
		incidents.NewSymptom(incidents.SymptomExitCodeOOM, resource, "OOM killed"),
	}
	diag := dg.GenerateDiagnosis(resource, match, symptoms)
	if diag.Summary == "" {
		t.Error("GenerateDiagnosis Summary should not be empty")
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// SortDiagnosesBySeverity
// ─────────────────────────────────────────────────────────────────────────────

func TestSortDiagnosesBySeverity_Empty(t *testing.T) {
	// Should not panic
	incidents.SortDiagnosesBySeverity(nil)
	incidents.SortDiagnosesBySeverity([]*incidents.Diagnosis{})
}

func TestSortDiagnosesBySeverity_Orders(t *testing.T) {
	diagnoses := []*incidents.Diagnosis{
		{Summary: "low", Confidence: 0.3},
		{Summary: "high", Confidence: 0.9},
		{Summary: "medium", Confidence: 0.6},
	}
	incidents.SortDiagnosesBySeverity(diagnoses)
	if diagnoses[0].Confidence < diagnoses[1].Confidence {
		t.Error("SortDiagnosesBySeverity should order by descending confidence")
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// NewPatternMatcher
// ─────────────────────────────────────────────────────────────────────────────

func TestNewPatternMatcher_NotNil(t *testing.T) {
	pm := incidents.NewPatternMatcher()
	if pm == nil {
		t.Fatal("NewPatternMatcher returned nil")
	}
}

func TestPatternMatcher_MatchBest_NoSymptoms(t *testing.T) {
	pm := incidents.NewPatternMatcher()
	match := pm.MatchBest(nil)
	if match != nil {
		t.Error("MatchBest(nil) should return nil when no symptoms")
	}
}

func TestPatternMatcher_MatchBest_WithOOMSymptom(t *testing.T) {
	pm := incidents.NewPatternMatcher()
	symptoms := []*incidents.Symptom{
		incidents.NewSymptom(incidents.SymptomExitCodeOOM, incidents.KubeResourceRef{Kind: "Pod"}, "OOM killed"),
	}
	match := pm.MatchBest(symptoms)
	if match == nil {
		t.Error("MatchBest with OOM symptom should return a match")
	}
	if match.Pattern == "" {
		t.Error("PatternMatch.Pattern should not be empty")
	}
	if match.Confidence <= 0 {
		t.Error("PatternMatch.Confidence should be positive")
	}
}

func TestPatternMatcher_MatchBest_CrashLoop(t *testing.T) {
	pm := incidents.NewPatternMatcher()
	symptoms := []*incidents.Symptom{
		incidents.NewSymptom(incidents.SymptomCrashLoopBackOff, incidents.KubeResourceRef{Kind: "Pod"}, "crashloop"),
	}
	match := pm.MatchBest(symptoms)
	if match == nil {
		t.Error("MatchBest with CrashLoopBackOff should match")
	}
}
