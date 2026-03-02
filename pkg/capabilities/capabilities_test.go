// Copyright 2025 KubeGraf Contributors
// SPDX-License-Identifier: Apache-2.0

package capabilities

import (
	"testing"
)

// ─────────────────────────────────────────────────────────────────────────────
// Default capabilities
// ─────────────────────────────────────────────────────────────────────────────

func TestDefaultCapabilities_CoreFeaturesEnabled(t *testing.T) {
	ResetCapabilities()
	caps := GetCapabilities()

	if !caps.IncidentDetection {
		t.Error("IncidentDetection should be enabled by default")
	}
	if !caps.IncidentDiagnosis {
		t.Error("IncidentDiagnosis should be enabled by default")
	}
	if !caps.IncidentSnapshot {
		t.Error("IncidentSnapshot should be enabled by default")
	}
	if !caps.FixPreview {
		t.Error("FixPreview should be enabled by default")
	}
}

func TestDefaultCapabilities_AdvancedFeaturesDisabled(t *testing.T) {
	ResetCapabilities()
	caps := GetCapabilities()

	if caps.AutoRemediation {
		t.Error("AutoRemediation should be disabled by default")
	}
	if caps.LearningEngine {
		t.Error("LearningEngine should be disabled by default")
	}
	if caps.SimilarIncidents {
		t.Error("SimilarIncidents should be disabled by default")
	}
	if caps.MetricsCorrelation {
		t.Error("MetricsCorrelation should be disabled by default")
	}
	if caps.BulkFixes {
		t.Error("BulkFixes should be disabled by default")
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// SetCapabilities / ResetCapabilities
// ─────────────────────────────────────────────────────────────────────────────

func TestSetCapabilities_UpdatesGlobal(t *testing.T) {
	defer ResetCapabilities()

	custom := Capabilities{AutoRemediation: true, LearningEngine: true}
	SetCapabilities(custom)

	caps := GetCapabilities()
	if !caps.AutoRemediation {
		t.Error("AutoRemediation should be enabled after SetCapabilities")
	}
	if !caps.LearningEngine {
		t.Error("LearningEngine should be enabled after SetCapabilities")
	}
}

func TestResetCapabilities_RestoresDefaults(t *testing.T) {
	SetCapabilities(Capabilities{AutoRemediation: true})
	ResetCapabilities()

	caps := GetCapabilities()
	if caps.AutoRemediation {
		t.Error("AutoRemediation should be false after ResetCapabilities")
	}
	if !caps.IncidentDetection {
		t.Error("IncidentDetection should be restored to true after ResetCapabilities")
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper functions
// ─────────────────────────────────────────────────────────────────────────────

func TestIsAutoRemediationEnabled_DefaultFalse(t *testing.T) {
	ResetCapabilities()
	if IsAutoRemediationEnabled() {
		t.Error("IsAutoRemediationEnabled() should be false by default")
	}
}

func TestIsAutoRemediationEnabled_TrueAfterSet(t *testing.T) {
	defer ResetCapabilities()
	SetCapabilities(Capabilities{AutoRemediation: true})
	if !IsAutoRemediationEnabled() {
		t.Error("IsAutoRemediationEnabled() should return true after enabling")
	}
}

func TestIsLearningEngineEnabled(t *testing.T) {
	ResetCapabilities()
	if IsLearningEngineEnabled() {
		t.Error("IsLearningEngineEnabled() should be false by default")
	}
}

func TestIsSimilarIncidentsEnabled(t *testing.T) {
	ResetCapabilities()
	if IsSimilarIncidentsEnabled() {
		t.Error("IsSimilarIncidentsEnabled() should be false by default")
	}
}

func TestIsMetricsCorrelationEnabled(t *testing.T) {
	ResetCapabilities()
	if IsMetricsCorrelationEnabled() {
		t.Error("IsMetricsCorrelationEnabled() should be false by default")
	}
}

func TestIsBulkFixesEnabled(t *testing.T) {
	ResetCapabilities()
	if IsBulkFixesEnabled() {
		t.Error("IsBulkFixesEnabled() should be false by default")
	}
}

func TestIsFixApplicationEnabled(t *testing.T) {
	ResetCapabilities()
	if !IsFixApplicationEnabled() {
		t.Error("IsFixApplicationEnabled() should be true by default")
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// GetCapabilitiesJSON
// ─────────────────────────────────────────────────────────────────────────────

func TestGetCapabilitiesJSON_HasExpectedKeys(t *testing.T) {
	ResetCapabilities()
	m := GetCapabilitiesJSON()

	expectedKeys := []string{
		"incidentDetection", "incidentDiagnosis", "incidentSnapshot", "fixPreview",
		"autoRemediation", "learningEngine", "similarIncidents",
		"metricsCorrelation", "bulkFixes", "fixApplication",
	}
	for _, key := range expectedKeys {
		if _, ok := m[key]; !ok {
			t.Errorf("GetCapabilitiesJSON() missing key %q", key)
		}
	}
}

func TestGetCapabilitiesJSON_CoreFeaturesTrue(t *testing.T) {
	ResetCapabilities()
	m := GetCapabilitiesJSON()

	if m["incidentDetection"] != true {
		t.Errorf("incidentDetection = %v, want true", m["incidentDetection"])
	}
	if m["autoRemediation"] != false {
		t.Errorf("autoRemediation = %v, want false", m["autoRemediation"])
	}
}
