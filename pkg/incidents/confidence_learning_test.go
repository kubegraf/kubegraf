// Copyright 2025 KubeGraf Contributors
// SPDX-License-Identifier: Apache-2.0

package incidents

import (
	"testing"
	"time"
)

func TestExtractFeatures(t *testing.T) {
	// Create temporary knowledge bank
	tempDir := t.TempDir()
	kb, err := NewKnowledgeBank(tempDir)
	if err != nil {
		t.Fatalf("Failed to create knowledge bank: %v", err)
	}
	defer kb.Close()

	learner := NewConfidenceLearner(kb)

	// Create test incident
	incident := &Incident{
		ID:          "test-incident-1",
		Fingerprint: "test-fingerprint",
		Pattern:     PatternCrashLoop,
		Resource: KubeResourceRef{
			Kind:      "Pod",
			Name:      "test-pod",
			Namespace: "default",
		},
	}

	// Create test snapshot
	exitCode := int32(1)
	snapshot := &IncidentSnapshot{
		LastExitCode: &exitCode,
		RestartCounts: RestartCounts{
			Last5Minutes: 5,
			Last1Hour:    10,
			Last24Hours:  20,
		},
		WhyNowExplanation: "Recent deployment change detected",
	}

	// Create test evidence pack
	evidencePack := &EvidencePack{
		Events: []EvidenceItem{
			{
				ID:      "event-1",
				Type:    "OOMKilled",
				Summary: "Container killed due to OOM",
			},
			{
				ID:      "event-2",
				Type:    "Unhealthy",
				Summary: "Readiness probe failed",
			},
			{
				ID:      "event-3",
				Type:    "Failed",
				Summary: "Failed to pull image",
			},
		},
		Logs: []EvidenceItem{
			{
				ID:       "log-1",
				Severity: "error",
				Content:  "Application crashed",
			},
		},
		MetricsFacts: []EvidenceItem{
			{
				ID:      "metric-1",
				Content: "CPU usage: 85% of limit",
				Summary: "High CPU usage detected",
				Metadata: map[string]interface{}{
					"usage_percent": 85.0,
				},
			},
		},
	}

	// Extract features
	fv := learner.ExtractFeatures(incident, snapshot, evidencePack)

	// Verify features
	if fv.HasExitCodeNonzero != 1 {
		t.Errorf("Expected HasExitCodeNonzero=1, got %d", fv.HasExitCodeNonzero)
	}
	if fv.OOMEventPresent != 1 {
		t.Errorf("Expected OOMEventPresent=1, got %d", fv.OOMEventPresent)
	}
	if fv.ProbeFailureEventPresent != 1 {
		t.Errorf("Expected ProbeFailureEventPresent=1, got %d", fv.ProbeFailureEventPresent)
	}
	if fv.ImagePullErrorPresent != 1 {
		t.Errorf("Expected ImagePullErrorPresent=1, got %d", fv.ImagePullErrorPresent)
	}
	if fv.RestartRate5m <= 0 || fv.RestartRate5m > 1.0 {
		t.Errorf("Expected RestartRate5m in [0,1], got %f", fv.RestartRate5m)
	}
	if fv.RestartRate1h <= 0 || fv.RestartRate1h > 1.0 {
		t.Errorf("Expected RestartRate1h in [0,1], got %f", fv.RestartRate1h)
	}
	if fv.RestartRate24h <= 0 || fv.RestartRate24h > 1.0 {
		t.Errorf("Expected RestartRate24h in [0,1], got %f", fv.RestartRate24h)
	}
	if fv.RecentChangePresent != 1 {
		t.Errorf("Expected RecentChangePresent=1, got %d", fv.RecentChangePresent)
	}
	if fv.LogErrorSignaturePresent != 1 {
		t.Errorf("Expected LogErrorSignaturePresent=1, got %d", fv.LogErrorSignaturePresent)
	}
	if fv.LogErrorSignatureKey == "" {
		t.Errorf("Expected LogErrorSignatureKey to be set, got empty")
	}
	if fv.ResourcePressureHint != 1 {
		t.Errorf("Expected ResourcePressureHint=1, got %d", fv.ResourcePressureHint)
	}
}

func TestComputeConfidence(t *testing.T) {
	// Create temporary knowledge bank
	tempDir := t.TempDir()
	kb, err := NewKnowledgeBank(tempDir)
	if err != nil {
		t.Fatalf("Failed to create knowledge bank: %v", err)
	}
	defer kb.Close()

	learner := NewConfidenceLearner(kb)

	// Create test incident with diagnosis
	incident := &Incident{
		ID:          "test-incident-1",
		Fingerprint: "test-fingerprint",
		Pattern:     PatternCrashLoop,
		Diagnosis: &Diagnosis{
			ProbableCauses: []string{"app_crash"},
			Confidence:     0.7,
		},
	}

	// Test with all evidence types present
	evidencePack := &EvidencePack{
		Logs: []EvidenceItem{
			{ID: "log-1", Content: "Error log"},
		},
		Events: []EvidenceItem{
			{ID: "event-1", Content: "Event"},
		},
		MetricsFacts: []EvidenceItem{
			{ID: "metric-1", Content: "Metric"},
		},
		ChangeHistory: []EvidenceItem{
			{ID: "change-1", Content: "Change"},
		},
	}

	confidence := learner.ComputeConfidence(incident, evidencePack)
	if confidence < 0.0 || confidence > 1.0 {
		t.Errorf("Expected confidence in [0,1], got %f", confidence)
	}

	// Test with no evidence
	emptyEvidencePack := &EvidencePack{}
	confidenceEmpty := learner.ComputeConfidence(incident, emptyEvidencePack)
	if confidenceEmpty != 0.5 {
		t.Errorf("Expected default confidence 0.5 for no evidence, got %f", confidenceEmpty)
	}
}

func TestRankRootCauses(t *testing.T) {
	// Create temporary knowledge bank
	tempDir := t.TempDir()
	kb, err := NewKnowledgeBank(tempDir)
	if err != nil {
		t.Fatalf("Failed to create knowledge bank: %v", err)
	}
	defer kb.Close()

	learner := NewConfidenceLearner(kb)

	// Set different priors for different causes
	learner.setCausePrior("cause.app_crash", 0.5)
	learner.setCausePrior("cause.oom", 0.3)
	learner.setCausePrior("cause.probe_failure", 0.2)

	// Rank causes
	causes := []string{"probe_failure", "app_crash", "oom"}
	ranked := learner.RankRootCauses(causes)

	if len(ranked) != 3 {
		t.Fatalf("Expected 3 ranked causes, got %d", len(ranked))
	}

	// Verify ordering (highest prior first)
	if ranked[0].Cause != "app_crash" || ranked[0].Likelihood != 0.5 {
		t.Errorf("Expected first cause to be 'app_crash' with likelihood 0.5, got %s with %f", ranked[0].Cause, ranked[0].Likelihood)
	}
	if ranked[1].Cause != "oom" || ranked[1].Likelihood != 0.3 {
		t.Errorf("Expected second cause to be 'oom' with likelihood 0.3, got %s with %f", ranked[1].Cause, ranked[1].Likelihood)
	}
	if ranked[2].Cause != "probe_failure" || ranked[2].Likelihood != 0.2 {
		t.Errorf("Expected third cause to be 'probe_failure' with likelihood 0.2, got %s with %f", ranked[2].Cause, ranked[2].Likelihood)
	}
}

func TestRecordOutcome(t *testing.T) {
	// Create temporary knowledge bank
	tempDir := t.TempDir()
	kb, err := NewKnowledgeBank(tempDir)
	if err != nil {
		t.Fatalf("Failed to create knowledge bank: %v", err)
	}
	defer kb.Close()

	learner := NewConfidenceLearner(kb)

	// Create test incident
	incident := &Incident{
		ID:          "test-incident-1",
		Fingerprint: "test-fingerprint",
		Pattern:     PatternCrashLoop,
		Diagnosis: &Diagnosis{
			ProbableCauses: []string{"app_crash"},
			Confidence:     0.7,
		},
	}

	// Create test snapshot
	snapshot := &IncidentSnapshot{
		RootCauses: []RootCause{
			{Cause: "app_crash", Likelihood: 0.7},
		},
		Confidence: 0.7,
	}

	// Create test evidence pack
	evidencePack := &EvidencePack{
		Logs: []EvidenceItem{
			{ID: "log-1", Content: "Error log"},
		},
		Events: []EvidenceItem{
			{ID: "event-1", Content: "Event"},
		},
	}

	// Create outcome
	outcome := &IncidentOutcome{
		Fingerprint:          "test-fingerprint",
		IncidentID:           "test-incident-1",
		Timestamp:            time.Now(),
		ProposedPrimaryCause: "app_crash",
		ProposedConfidence:   0.7,
		Outcome:              "worked",
	}

	// Record outcome
	explanation, err := learner.RecordOutcome(outcome, incident, snapshot, evidencePack)
	if err != nil {
		t.Fatalf("Failed to record outcome: %v", err)
	}

	if explanation == "" {
		t.Error("Expected non-empty explanation")
	}

	// Verify weights were updated
	weights, err := learner.getFeatureWeights()
	if err != nil {
		t.Fatalf("Failed to get weights: %v", err)
	}

	// Check that weights for present signals were updated
	if weights["signal.logs"] <= 0.4 {
		t.Errorf("Expected signal.logs weight to increase from 0.4, got %f", weights["signal.logs"])
	}
	if weights["signal.events"] <= 0.3 {
		t.Errorf("Expected signal.events weight to increase from 0.3, got %f", weights["signal.events"])
	}

	// Verify prior was updated
	prior, err := learner.getCausePrior("cause.app_crash")
	if err != nil {
		t.Fatalf("Failed to get prior: %v", err)
	}
	if prior <= 0.25 {
		t.Errorf("Expected cause.app_crash prior to increase from 0.25, got %f", prior)
	}

	// Test "not_worked" outcome
	outcome2 := &IncidentOutcome{
		Fingerprint:          "test-fingerprint-2",
		IncidentID:           "test-incident-2",
		Timestamp:            time.Now(),
		ProposedPrimaryCause: "app_crash",
		ProposedConfidence:   0.7,
		Outcome:              "not_worked",
	}

	explanation2, err := learner.RecordOutcome(outcome2, incident, snapshot, evidencePack)
	if err != nil {
		t.Fatalf("Failed to record outcome: %v", err)
	}

	if explanation2 == "" {
		t.Error("Expected non-empty explanation")
	}

	// Verify weights decreased
	weights2, err := learner.getFeatureWeights()
	if err != nil {
		t.Fatalf("Failed to get weights: %v", err)
	}

	// Weights should have decreased from previous values
	if weights2["signal.logs"] >= weights["signal.logs"] {
		t.Errorf("Expected signal.logs weight to decrease, got %f (was %f)", weights2["signal.logs"], weights["signal.logs"])
	}
}

func TestWeightClamping(t *testing.T) {
	// Create temporary knowledge bank
	tempDir := t.TempDir()
	kb, err := NewKnowledgeBank(tempDir)
	if err != nil {
		t.Fatalf("Failed to create knowledge bank: %v", err)
	}
	defer kb.Close()

	learner := NewConfidenceLearner(kb)

	// Set weight to maximum
	learner.setFeatureWeight("signal.logs", 0.7)

	// Record many "worked" outcomes to try to exceed max
	incident := &Incident{
		ID:          "test-incident",
		Fingerprint: "test-fingerprint",
		Diagnosis: &Diagnosis{
			ProbableCauses: []string{"app_crash"},
		},
	}
	snapshot := &IncidentSnapshot{
		RootCauses: []RootCause{{Cause: "app_crash"}},
	}
	evidencePack := &EvidencePack{
		Logs: []EvidenceItem{{ID: "log-1"}},
	}

	for i := 0; i < 10; i++ {
		outcome := &IncidentOutcome{
			Fingerprint:          "test-fingerprint",
			IncidentID:           "test-incident",
			Timestamp:            time.Now(),
			ProposedPrimaryCause: "app_crash",
			Outcome:              "worked",
		}
		learner.RecordOutcome(outcome, incident, snapshot, evidencePack)
	}

	// Verify weight is clamped
	weights, err := learner.getFeatureWeights()
	if err != nil {
		t.Fatalf("Failed to get weights: %v", err)
	}

	if weights["signal.logs"] > 0.7 {
		t.Errorf("Expected weight to be clamped at 0.7, got %f", weights["signal.logs"])
	}
	if weights["signal.logs"] < 0.05 {
		t.Errorf("Expected weight to be at least 0.05, got %f", weights["signal.logs"])
	}
}

func TestPriorClamping(t *testing.T) {
	// Create temporary knowledge bank
	tempDir := t.TempDir()
	kb, err := NewKnowledgeBank(tempDir)
	if err != nil {
		t.Fatalf("Failed to create knowledge bank: %v", err)
	}
	defer kb.Close()

	learner := NewConfidenceLearner(kb)

	// Set prior to minimum
	learner.setCausePrior("cause.app_crash", 0.05)

	// Record many "not_worked" outcomes to try to go below min
	incident := &Incident{
		ID:          "test-incident",
		Fingerprint: "test-fingerprint",
		Diagnosis: &Diagnosis{
			ProbableCauses: []string{"app_crash"},
		},
	}
	snapshot := &IncidentSnapshot{
		RootCauses: []RootCause{{Cause: "app_crash"}},
	}
	evidencePack := &EvidencePack{}

	for i := 0; i < 10; i++ {
		outcome := &IncidentOutcome{
			Fingerprint:          "test-fingerprint",
			IncidentID:           "test-incident",
			Timestamp:            time.Now(),
			ProposedPrimaryCause: "app_crash",
			Outcome:              "not_worked",
		}
		learner.RecordOutcome(outcome, incident, snapshot, evidencePack)
	}

	// Verify prior is clamped
	prior, err := learner.getCausePrior("cause.app_crash")
	if err != nil {
		t.Fatalf("Failed to get prior: %v", err)
	}

	if prior < 0.05 {
		t.Errorf("Expected prior to be clamped at 0.05, got %f", prior)
	}
	if prior > 0.95 {
		t.Errorf("Expected prior to be at most 0.95, got %f", prior)
	}
}

func TestResetLearning(t *testing.T) {
	// Create temporary knowledge bank
	tempDir := t.TempDir()
	kb, err := NewKnowledgeBank(tempDir)
	if err != nil {
		t.Fatalf("Failed to create knowledge bank: %v", err)
	}
	defer kb.Close()

	learner := NewConfidenceLearner(kb)

	// Modify weights and priors
	learner.setFeatureWeight("signal.logs", 0.6)
	learner.setCausePrior("cause.app_crash", 0.4)

	// Reset
	err = learner.ResetLearning()
	if err != nil {
		t.Fatalf("Failed to reset learning: %v", err)
	}

	// Verify weights reset to defaults
	weights, err := learner.getFeatureWeights()
	if err != nil {
		t.Fatalf("Failed to get weights: %v", err)
	}

	if weights["signal.logs"] != 0.4 {
		t.Errorf("Expected signal.logs weight to reset to 0.4, got %f", weights["signal.logs"])
	}
	if weights["signal.events"] != 0.3 {
		t.Errorf("Expected signal.events weight to reset to 0.3, got %f", weights["signal.events"])
	}

	// Verify priors reset to defaults
	prior, err := learner.getCausePrior("cause.app_crash")
	if err != nil {
		t.Fatalf("Failed to get prior: %v", err)
	}

	if prior != 0.25 {
		t.Errorf("Expected cause.app_crash prior to reset to 0.25, got %f", prior)
	}
}

func TestGetLearningStatus(t *testing.T) {
	// Create temporary knowledge bank
	tempDir := t.TempDir()
	kb, err := NewKnowledgeBank(tempDir)
	if err != nil {
		t.Fatalf("Failed to create knowledge bank: %v", err)
	}
	defer kb.Close()

	learner := NewConfidenceLearner(kb)

	// Record an outcome
	incident := &Incident{
		ID:          "test-incident",
		Fingerprint: "test-fingerprint",
		Diagnosis: &Diagnosis{
			ProbableCauses: []string{"app_crash"},
		},
	}
	snapshot := &IncidentSnapshot{
		RootCauses: []RootCause{{Cause: "app_crash"}},
	}
	evidencePack := &EvidencePack{
		Logs: []EvidenceItem{{ID: "log-1"}},
	}

	outcome := &IncidentOutcome{
		Fingerprint:          "test-fingerprint",
		IncidentID:           "test-incident",
		Timestamp:            time.Now(),
		ProposedPrimaryCause: "app_crash",
		Outcome:              "worked",
	}

	learner.RecordOutcome(outcome, incident, snapshot, evidencePack)

	// Get status
	status, err := learner.GetLearningStatus()
	if err != nil {
		t.Fatalf("Failed to get learning status: %v", err)
	}

	if status.SampleSize != 1 {
		t.Errorf("Expected sample size 1, got %d", status.SampleSize)
	}

	if len(status.FeatureWeights) == 0 {
		t.Error("Expected feature weights to be present")
	}

	if len(status.CausePriors) == 0 {
		t.Error("Expected cause priors to be present")
	}
}

