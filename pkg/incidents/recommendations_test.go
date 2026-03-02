// Copyright 2025 KubeGraf Contributors
// SPDX-License-Identifier: Apache-2.0

package incidents

import (
	"testing"
	"time"
)

// helper: minimal incident for testing recommenders
func makeIncident(pattern FailurePattern, severity Severity) *Incident {
	return &Incident{
		ID:          "INC-TEST",
		Pattern:     pattern,
		Severity:    severity,
		Status:      StatusOpen,
		Fingerprint: "fp-test",
		Title:       "Test incident",
		FirstSeen:   time.Now().Add(-10 * time.Minute),
		LastSeen:    time.Now(),
		Resource:    KubeResourceRef{Kind: "Pod", Name: "test-pod", Namespace: "default"},
		Occurrences: 1,
		Diagnosis: &Diagnosis{
			Summary:    "Test diagnosis",
			Confidence: 0.7,
			Evidence:   []string{"test evidence"},
		},
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// NewRecommendationEngine
// ─────────────────────────────────────────────────────────────────────────────

func TestNewRecommendationEngine_NotNil(t *testing.T) {
	e := NewRecommendationEngine()
	if e == nil {
		t.Fatal("NewRecommendationEngine returned nil")
	}
}

func TestNewRecommendationEngine_HasGenerators(t *testing.T) {
	e := NewRecommendationEngine()
	// Should have at least one generator registered
	if len(e.generators) == 0 {
		t.Error("RecommendationEngine should have generators pre-registered")
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// GenerateRecommendations — known patterns
// ─────────────────────────────────────────────────────────────────────────────

func TestGenerateRecommendations_CrashLoop(t *testing.T) {
	e := NewRecommendationEngine()
	inc := makeIncident(PatternCrashLoop, SeverityCritical)
	recs := e.GenerateRecommendations(inc)
	if len(recs) == 0 {
		t.Error("CrashLoop should produce recommendations")
	}
}

func TestGenerateRecommendations_OOM(t *testing.T) {
	e := NewRecommendationEngine()
	inc := makeIncident(PatternOOMPressure, SeverityCritical)
	recs := e.GenerateRecommendations(inc)
	if len(recs) == 0 {
		t.Error("OOMPressure should produce recommendations")
	}
}

func TestGenerateRecommendations_ImagePullFailure(t *testing.T) {
	e := NewRecommendationEngine()
	inc := makeIncident(PatternImagePullFailure, SeverityCritical)
	recs := e.GenerateRecommendations(inc)
	if len(recs) == 0 {
		t.Error("ImagePullFailure should produce recommendations")
	}
}

func TestGenerateRecommendations_ConfigError(t *testing.T) {
	e := NewRecommendationEngine()
	inc := makeIncident(PatternConfigError, SeverityHigh)
	recs := e.GenerateRecommendations(inc)
	if len(recs) == 0 {
		t.Error("ConfigError should produce recommendations")
	}
}

func TestGenerateRecommendations_SecretMissing(t *testing.T) {
	e := NewRecommendationEngine()
	inc := makeIncident(PatternSecretMissing, SeverityHigh)
	recs := e.GenerateRecommendations(inc)
	if len(recs) == 0 {
		t.Error("SecretMissing should produce recommendations")
	}
}

func TestGenerateRecommendations_Unschedulable(t *testing.T) {
	e := NewRecommendationEngine()
	inc := makeIncident(PatternUnschedulable, SeverityHigh)
	recs := e.GenerateRecommendations(inc)
	if len(recs) == 0 {
		t.Error("Unschedulable should produce recommendations")
	}
}

func TestGenerateRecommendations_NoReadyEndpoints(t *testing.T) {
	e := NewRecommendationEngine()
	inc := makeIncident(PatternNoReadyEndpoints, SeverityHigh)
	recs := e.GenerateRecommendations(inc)
	if len(recs) == 0 {
		t.Error("NoReadyEndpoints should produce recommendations")
	}
}

func TestGenerateRecommendations_LivenessFailure(t *testing.T) {
	e := NewRecommendationEngine()
	inc := makeIncident(PatternLivenessFailure, SeverityHigh)
	recs := e.GenerateRecommendations(inc)
	if len(recs) == 0 {
		t.Error("LivenessFailure should produce recommendations")
	}
}

func TestGenerateRecommendations_ReadinessFailure(t *testing.T) {
	e := NewRecommendationEngine()
	inc := makeIncident(PatternReadinessFailure, SeverityMedium)
	recs := e.GenerateRecommendations(inc)
	if len(recs) == 0 {
		t.Error("ReadinessFailure should produce recommendations")
	}
}

func TestGenerateRecommendations_DNSFailure(t *testing.T) {
	e := NewRecommendationEngine()
	inc := makeIncident(PatternDNSFailure, SeverityHigh)
	recs := e.GenerateRecommendations(inc)
	if len(recs) == 0 {
		t.Error("DNSFailure should produce recommendations")
	}
}

func TestGenerateRecommendations_InternalErrors(t *testing.T) {
	e := NewRecommendationEngine()
	inc := makeIncident(PatternInternalErrors, SeverityHigh)
	recs := e.GenerateRecommendations(inc)
	if len(recs) == 0 {
		t.Error("InternalErrors should produce recommendations")
	}
}

func TestGenerateRecommendations_UpstreamFailure(t *testing.T) {
	e := NewRecommendationEngine()
	inc := makeIncident(PatternUpstreamFailure, SeverityHigh)
	recs := e.GenerateRecommendations(inc)
	if len(recs) == 0 {
		t.Error("UpstreamFailure should produce recommendations")
	}
}

func TestGenerateRecommendations_ResourceExhausted(t *testing.T) {
	e := NewRecommendationEngine()
	inc := makeIncident(PatternResourceExhausted, SeverityHigh)
	recs := e.GenerateRecommendations(inc)
	if len(recs) == 0 {
		t.Error("ResourceExhausted should produce recommendations")
	}
}

func TestGenerateRecommendations_RestartStorm(t *testing.T) {
	e := NewRecommendationEngine()
	inc := makeIncident(PatternRestartStorm, SeverityHigh)
	recs := e.GenerateRecommendations(inc)
	if len(recs) == 0 {
		t.Error("RestartStorm should produce recommendations")
	}
}

func TestGenerateRecommendations_Timeouts(t *testing.T) {
	e := NewRecommendationEngine()
	inc := makeIncident(PatternTimeouts, SeverityMedium)
	recs := e.GenerateRecommendations(inc)
	if len(recs) == 0 {
		t.Error("Timeouts should produce recommendations")
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// GenerateRecommendations — unknown pattern → generic fallback
// ─────────────────────────────────────────────────────────────────────────────

func TestGenerateRecommendations_UnknownPattern_Generic(t *testing.T) {
	e := NewRecommendationEngine()
	inc := makeIncident(PatternUnknown, SeverityLow)
	recs := e.GenerateRecommendations(inc)
	// Should return generic recommendations
	if len(recs) == 0 {
		t.Error("Unknown pattern should still produce generic recommendations")
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// Recommendation struct sanity
// ─────────────────────────────────────────────────────────────────────────────

func TestRecommendations_HaveNonEmptyTitles(t *testing.T) {
	e := NewRecommendationEngine()
	inc := makeIncident(PatternCrashLoop, SeverityCritical)
	recs := e.GenerateRecommendations(inc)
	for i, r := range recs {
		if r.Title == "" {
			t.Errorf("recommendation[%d] has empty Title", i)
		}
	}
}

func TestRecommendations_HaveNonEmptyExplanations(t *testing.T) {
	e := NewRecommendationEngine()
	inc := makeIncident(PatternImagePullFailure, SeverityCritical)
	recs := e.GenerateRecommendations(inc)
	for i, r := range recs {
		if r.Explanation == "" {
			t.Errorf("recommendation[%d].Explanation is empty", i)
		}
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// RegisterGenerator
// ─────────────────────────────────────────────────────────────────────────────

func TestRegisterGenerator_CustomGenerator(t *testing.T) {
	e := NewRecommendationEngine()
	// Register a custom generator for a new pattern
	e.RegisterGenerator(PatternNetworkPartition, &DNSFailureRecommender{})
	inc := makeIncident(PatternNetworkPartition, SeverityHigh)
	recs := e.GenerateRecommendations(inc)
	if len(recs) == 0 {
		t.Error("custom-registered generator should produce recommendations")
	}
}
