// Copyright 2025 KubeGraf Contributors
// SPDX-License-Identifier: Apache-2.0

package incidents

import (
	"testing"
	"time"
)

// ─────────────────────────────────────────────────────────────────────────────
// EvidencePack.TotalItems / GetAllItems / GetTopEvidence / GetEvidenceBySource
// ─────────────────────────────────────────────────────────────────────────────

func TestEvidencePack_TotalItems_Empty(t *testing.T) {
	pack := &EvidencePack{}
	if pack.TotalItems() != 0 {
		t.Errorf("TotalItems() = %d, want 0", pack.TotalItems())
	}
}

func TestEvidencePack_TotalItems_Mixed(t *testing.T) {
	pack := &EvidencePack{
		Events:       []EvidenceItem{{}, {}},
		Logs:         []EvidenceItem{{}},
		StatusFacts:  []EvidenceItem{{}, {}, {}},
		MetricsFacts: []EvidenceItem{{}},
		ChangeHistory: []EvidenceItem{{}},
		ProbeResults: []EvidenceItem{{}, {}},
	}
	// 2+1+3+1+1+2 = 10
	if pack.TotalItems() != 10 {
		t.Errorf("TotalItems() = %d, want 10", pack.TotalItems())
	}
}

func TestEvidencePack_GetAllItems_Empty(t *testing.T) {
	pack := &EvidencePack{}
	if len(pack.GetAllItems()) != 0 {
		t.Error("GetAllItems() on empty pack should return empty slice")
	}
}

func TestEvidencePack_GetAllItems_Flattens(t *testing.T) {
	pack := &EvidencePack{
		Events: []EvidenceItem{{ID: "e1", Source: EvidenceSourceEvent}},
		Logs:   []EvidenceItem{{ID: "l1", Source: EvidenceSourceLog}},
	}
	all := pack.GetAllItems()
	if len(all) != 2 {
		t.Errorf("GetAllItems() len = %d, want 2", len(all))
	}
}

func TestEvidencePack_GetTopEvidence_Empty(t *testing.T) {
	pack := &EvidencePack{}
	top := pack.GetTopEvidence(5)
	if len(top) != 0 {
		t.Error("GetTopEvidence on empty pack should return empty")
	}
}

func TestEvidencePack_GetTopEvidence_LessThanN(t *testing.T) {
	pack := &EvidencePack{
		Events: []EvidenceItem{
			{ID: "e1", Relevance: 0.9},
			{ID: "e2", Relevance: 0.3},
		},
	}
	top := pack.GetTopEvidence(5) // 5 > 2 items
	if len(top) != 2 {
		t.Errorf("GetTopEvidence(5) with 2 items: len = %d, want 2", len(top))
	}
}

func TestEvidencePack_GetTopEvidence_SortsByRelevance(t *testing.T) {
	pack := &EvidencePack{
		Events: []EvidenceItem{
			{ID: "low", Relevance: 0.2},
			{ID: "high", Relevance: 0.9},
			{ID: "mid", Relevance: 0.5},
		},
	}
	top := pack.GetTopEvidence(2)
	if len(top) != 2 {
		t.Errorf("GetTopEvidence(2): len = %d, want 2", len(top))
	}
	if top[0].ID != "high" {
		t.Errorf("GetTopEvidence first = %q, want high", top[0].ID)
	}
	if top[1].ID != "mid" {
		t.Errorf("GetTopEvidence second = %q, want mid", top[1].ID)
	}
}

func TestEvidencePack_GetEvidenceBySource_Event(t *testing.T) {
	pack := &EvidencePack{
		Events: []EvidenceItem{{ID: "e1"}},
		Logs:   []EvidenceItem{{ID: "l1"}},
	}
	events := pack.GetEvidenceBySource(EvidenceSourceEvent)
	if len(events) != 1 || events[0].ID != "e1" {
		t.Errorf("GetEvidenceBySource(event) = %v, want [{e1}]", events)
	}
}

func TestEvidencePack_GetEvidenceBySource_Log(t *testing.T) {
	pack := &EvidencePack{
		Logs: []EvidenceItem{{ID: "l1"}, {ID: "l2"}},
	}
	logs := pack.GetEvidenceBySource(EvidenceSourceLog)
	if len(logs) != 2 {
		t.Errorf("GetEvidenceBySource(log) = %d, want 2", len(logs))
	}
}

func TestEvidencePack_GetEvidenceBySource_Status(t *testing.T) {
	pack := &EvidencePack{
		StatusFacts: []EvidenceItem{{ID: "s1"}},
	}
	facts := pack.GetEvidenceBySource(EvidenceSourceStatus)
	if len(facts) != 1 {
		t.Errorf("GetEvidenceBySource(status) = %d, want 1", len(facts))
	}
}

func TestEvidencePack_GetEvidenceBySource_Metric(t *testing.T) {
	pack := &EvidencePack{
		MetricsFacts: []EvidenceItem{{ID: "m1"}},
	}
	metrics := pack.GetEvidenceBySource(EvidenceSourceMetric)
	if len(metrics) != 1 {
		t.Errorf("GetEvidenceBySource(metric) = %d, want 1", len(metrics))
	}
}

func TestEvidencePack_GetEvidenceBySource_Change(t *testing.T) {
	pack := &EvidencePack{
		ChangeHistory: []EvidenceItem{{ID: "c1"}},
	}
	changes := pack.GetEvidenceBySource(EvidenceSourceChange)
	if len(changes) != 1 {
		t.Errorf("GetEvidenceBySource(change) = %d, want 1", len(changes))
	}
}

func TestEvidencePack_GetEvidenceBySource_Probe(t *testing.T) {
	pack := &EvidencePack{
		ProbeResults: []EvidenceItem{{ID: "p1"}},
	}
	probes := pack.GetEvidenceBySource(EvidenceSourceProbe)
	if len(probes) != 1 {
		t.Errorf("GetEvidenceBySource(probe) = %d, want 1", len(probes))
	}
}

func TestEvidencePack_GetEvidenceBySource_Unknown(t *testing.T) {
	pack := &EvidencePack{
		Events: []EvidenceItem{{ID: "e1"}},
	}
	result := pack.GetEvidenceBySource("unknown-source")
	if result != nil {
		t.Error("GetEvidenceBySource with unknown source should return nil")
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// EvidencePackBuilder — BuildFromIncident with timeline + signals
// ─────────────────────────────────────────────────────────────────────────────

func TestBuildFromIncident_WithTimeline_ChangeHistory(t *testing.T) {
	b := NewEvidencePackBuilder()
	inc := &Incident{
		ID: "INC-TIMELINE",
		Timeline: []TimelineEntry{
			{
				Type:        "change",
				Description: "deployment image updated",
				Timestamp:   time.Now(),
				Details:     map[string]interface{}{"version": "v2.0"},
			},
			{
				Type:        "status",
				Description: "pod went down",
				Timestamp:   time.Now(),
			},
		},
	}
	pack := b.BuildFromIncident(inc)
	// Only "change" type should appear in ChangeHistory
	if len(pack.ChangeHistory) != 1 {
		t.Errorf("ChangeHistory len = %d, want 1 (only 'change' entries)", len(pack.ChangeHistory))
	}
}

func TestBuildFromIncident_WithTimeline_DeploymentEntry(t *testing.T) {
	b := NewEvidencePackBuilder()
	inc := &Incident{
		ID: "INC-DEPLOY",
		Timeline: []TimelineEntry{
			{Type: "deployment", Description: "v1 → v2", Timestamp: time.Now()},
		},
	}
	pack := b.BuildFromIncident(inc)
	if len(pack.ChangeHistory) != 1 {
		t.Errorf("ChangeHistory len = %d, want 1 for deployment entry", len(pack.ChangeHistory))
	}
}

func TestBuildFromIncident_WithProbeSymptom(t *testing.T) {
	b := NewEvidencePackBuilder()
	inc := &Incident{
		ID: "INC-PROBE",
		Symptoms: []*Symptom{
			{
				Type:       SymptomLivenessProbeFailure,
				Severity:   SeverityCritical,
				Evidence:   []string{"probe failed 3 times"},
				DetectedAt: time.Now(),
			},
		},
	}
	pack := b.BuildFromIncident(inc)
	if len(pack.ProbeResults) != 1 {
		t.Errorf("ProbeResults len = %d, want 1", len(pack.ProbeResults))
	}
}

func TestBuildFromIncident_Confidence_MultipleEvidence(t *testing.T) {
	b := NewEvidencePackBuilder()
	// Create incident with signals that will produce evidence items
	inc := &Incident{
		ID:       "INC-CONF",
		Resource: KubeResourceRef{Kind: "Pod", Name: "test", Namespace: "ns"},
		Signals: IncidentSignals{
			Events: []NormalizedSignal{
				{
					ID:         "e1",
					Source:     SourceKubeEvent,
					Resource:   KubeResourceRef{Kind: "Pod", Name: "test", Namespace: "ns"},
					Timestamp:  time.Now(),
					Attributes: map[string]string{},
				},
			},
			Logs: []NormalizedSignal{
				{
					ID:         "l1",
					Source:     SourcePodLog,
					Resource:   KubeResourceRef{Kind: "Pod", Name: "test", Namespace: "ns"},
					Timestamp:  time.Now(),
					Attributes: map[string]string{},
				},
			},
		},
	}
	pack := b.BuildFromIncident(inc)
	// With 2 sources, confidence should be > 0
	if pack.Confidence <= 0 {
		t.Error("Confidence with events+logs should be > 0")
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// EvidenceSource constants
// ─────────────────────────────────────────────────────────────────────────────

func TestEvidenceSourceConstants_NonEmpty(t *testing.T) {
	sources := []EvidenceSource{
		EvidenceSourceEvent, EvidenceSourceLog, EvidenceSourceStatus,
		EvidenceSourceMetric, EvidenceSourceChange, EvidenceSourceProbe,
		EvidenceSourceDoc, EvidenceSourceRunbook, EvidenceSourceHistory,
	}
	for _, s := range sources {
		if s == "" {
			t.Error("EvidenceSource constant should not be empty")
		}
	}
}

func TestEvidenceSourceConstants_Unique(t *testing.T) {
	sources := []EvidenceSource{
		EvidenceSourceEvent, EvidenceSourceLog, EvidenceSourceStatus,
		EvidenceSourceMetric, EvidenceSourceChange, EvidenceSourceProbe,
		EvidenceSourceDoc, EvidenceSourceRunbook, EvidenceSourceHistory,
	}
	seen := map[EvidenceSource]bool{}
	for _, s := range sources {
		if seen[s] {
			t.Errorf("duplicate EvidenceSource: %q", s)
		}
		seen[s] = true
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// min helper (package-level pure function)
// ─────────────────────────────────────────────────────────────────────────────

func TestMin_FirstSmaller(t *testing.T) {
	if min(0.3, 0.5) != 0.3 {
		t.Errorf("min(0.3, 0.5) = %f, want 0.3", min(0.3, 0.5))
	}
}

func TestMin_SecondSmaller(t *testing.T) {
	if min(0.8, 0.6) != 0.6 {
		t.Errorf("min(0.8, 0.6) = %f, want 0.6", min(0.8, 0.6))
	}
}

func TestMin_Equal(t *testing.T) {
	if min(0.5, 0.5) != 0.5 {
		t.Errorf("min(0.5, 0.5) = %f, want 0.5", min(0.5, 0.5))
	}
}
