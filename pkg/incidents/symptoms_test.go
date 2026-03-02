// Copyright 2025 KubeGraf Contributors
// SPDX-License-Identifier: Apache-2.0

package incidents

import (
	"testing"
)

// ─────────────────────────────────────────────────────────────────────────────
// NewSymptom
// ─────────────────────────────────────────────────────────────────────────────

func TestNewSymptom_Fields(t *testing.T) {
	resource := KubeResourceRef{Kind: "Pod", Name: "api-pod", Namespace: "default"}
	s := NewSymptom(SymptomCrashLoopBackOff, resource, "pod is crash looping")

	if s == nil {
		t.Fatal("NewSymptom returned nil")
	}
	if s.Type != SymptomCrashLoopBackOff {
		t.Errorf("Type = %q, want %q", s.Type, SymptomCrashLoopBackOff)
	}
	if s.Description != "pod is crash looping" {
		t.Errorf("Description = %q, want 'pod is crash looping'", s.Description)
	}
	if s.Resource.Name != "api-pod" {
		t.Errorf("Resource.Name = %q, want api-pod", s.Resource.Name)
	}
}

func TestNewSymptom_DefaultSeverity(t *testing.T) {
	s := NewSymptom(SymptomExitCodeOOM, KubeResourceRef{}, "")
	if s.Severity != SeverityMedium {
		t.Errorf("default severity = %q, want Medium", s.Severity)
	}
}

func TestNewSymptom_EvidenceNotNil(t *testing.T) {
	s := NewSymptom(SymptomCrashLoopBackOff, KubeResourceRef{}, "")
	if s.Evidence == nil {
		t.Error("Evidence should not be nil after NewSymptom")
	}
	if len(s.Evidence) != 0 {
		t.Errorf("Evidence should start empty, got len=%d", len(s.Evidence))
	}
}

func TestNewSymptom_MetadataNotNil(t *testing.T) {
	s := NewSymptom(SymptomCrashLoopBackOff, KubeResourceRef{}, "")
	if s.Metadata == nil {
		t.Error("Metadata should not be nil after NewSymptom")
	}
}

func TestNewSymptom_UpdatedAtSet(t *testing.T) {
	s := NewSymptom(SymptomCrashLoopBackOff, KubeResourceRef{}, "")
	if s.DetectedAt.IsZero() {
		t.Error("DetectedAt should not be zero")
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// Symptom fluent builder methods
// ─────────────────────────────────────────────────────────────────────────────

func TestWithEvidence_Appends(t *testing.T) {
	s := NewSymptom(SymptomCrashLoopBackOff, KubeResourceRef{}, "")
	result := s.WithEvidence("evidence-a", "evidence-b")
	if result != s {
		t.Error("WithEvidence should return same Symptom for chaining")
	}
	if len(s.Evidence) != 2 {
		t.Errorf("len(Evidence) = %d, want 2", len(s.Evidence))
	}
	if s.Evidence[0] != "evidence-a" {
		t.Errorf("Evidence[0] = %q, want evidence-a", s.Evidence[0])
	}
}

func TestWithEvidence_Multiple(t *testing.T) {
	s := NewSymptom(SymptomCrashLoopBackOff, KubeResourceRef{}, "")
	s.WithEvidence("a").WithEvidence("b", "c")
	if len(s.Evidence) != 3 {
		t.Errorf("chained WithEvidence len = %d, want 3", len(s.Evidence))
	}
}

func TestWithSeverity_Sets(t *testing.T) {
	s := NewSymptom(SymptomCrashLoopBackOff, KubeResourceRef{}, "")
	result := s.WithSeverity(SeverityCritical)
	if result != s {
		t.Error("WithSeverity should return same Symptom for chaining")
	}
	if s.Severity != SeverityCritical {
		t.Errorf("Severity = %q, want Critical", s.Severity)
	}
}

func TestWithValue_Sets(t *testing.T) {
	s := NewSymptom(SymptomHighRestartCount, KubeResourceRef{}, "")
	s.WithSeverity(SeverityHigh)
	result := s.WithValue(42.5)
	if result != s {
		t.Error("WithValue should return same Symptom for chaining")
	}
	if s.Value != 42.5 {
		t.Errorf("Value = %f, want 42.5", s.Value)
	}
}

func TestWithMetadata_Sets(t *testing.T) {
	s := NewSymptom(SymptomCrashLoopBackOff, KubeResourceRef{}, "")
	result := s.WithMetadata("restart_count", "7")
	if result != s {
		t.Error("WithMetadata should return same Symptom for chaining")
	}
	if s.Metadata["restart_count"] != "7" {
		t.Errorf("Metadata[restart_count] = %q, want 7", s.Metadata["restart_count"])
	}
}

func TestWithMetadata_NilSafeInitializes(t *testing.T) {
	s := &Symptom{} // Metadata is nil
	s.WithMetadata("k", "v")
	if s.Metadata == nil {
		t.Error("WithMetadata should initialize nil Metadata map")
	}
	if s.Metadata["k"] != "v" {
		t.Errorf("Metadata[k] = %q, want v", s.Metadata["k"])
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// NewSymptomDetector
// ─────────────────────────────────────────────────────────────────────────────

func TestNewSymptomDetector_NotNil(t *testing.T) {
	d := NewSymptomDetector()
	if d == nil {
		t.Fatal("NewSymptomDetector returned nil")
	}
}

func TestNewSymptomDetector_DefaultThresholds(t *testing.T) {
	d := NewSymptomDetector()
	if d.highRestartThreshold <= 0 {
		t.Error("highRestartThreshold should be positive")
	}
	if d.http5xxThreshold <= 0 {
		t.Error("http5xxThreshold should be positive")
	}
}

func TestSymptomDetector_DetectSymptoms_Empty(t *testing.T) {
	d := NewSymptomDetector()
	symptoms := d.DetectSymptoms(nil)
	// nil slice is OK — no signals means no symptoms
	if len(symptoms) != 0 {
		t.Errorf("DetectSymptoms(nil) returned %d symptoms, want 0", len(symptoms))
	}
}

func TestSymptomDetector_DetectSymptoms_EmptySlice(t *testing.T) {
	d := NewSymptomDetector()
	symptoms := d.DetectSymptoms([]*NormalizedSignal{})
	if len(symptoms) != 0 {
		t.Errorf("DetectSymptoms([]) returned %d symptoms, want 0", len(symptoms))
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// SymptomType constants — smoke test non-empty, non-duplicate
// ─────────────────────────────────────────────────────────────────────────────

func TestSymptomTypeConstants(t *testing.T) {
	types := []SymptomType{
		SymptomCrashLoopBackOff, SymptomExitCodeOOM, SymptomHighRestartCount,
		SymptomImagePullError, SymptomUnschedulable, SymptomNodeNotReady,
		SymptomCPUThrottling, SymptomMemoryPressure,
	}
	seen := map[SymptomType]bool{}
	for _, st := range types {
		if st == "" {
			t.Error("SymptomType constant is empty string")
		}
		if seen[st] {
			t.Errorf("duplicate SymptomType: %q", st)
		}
		seen[st] = true
	}
}
