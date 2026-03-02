// Copyright 2025 KubeGraf Contributors
// SPDX-License-Identifier: Apache-2.0

package changes

import (
	"testing"
	"time"

	"github.com/kubegraf/kubegraf/internal/history"
)

// ─────────────────────────────────────────────────────────────────────────────
// NewIncidentChangeCorrelator
// ─────────────────────────────────────────────────────────────────────────────

func TestNewIncidentChangeCorrelator_NotNil(t *testing.T) {
	c := NewIncidentChangeCorrelator(nil)
	if c == nil {
		t.Fatal("NewIncidentChangeCorrelator returned nil")
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// calculateRelationship
// ─────────────────────────────────────────────────────────────────────────────

func TestCalculateRelationship_Before(t *testing.T) {
	c := NewIncidentChangeCorrelator(nil)
	incidentStart := time.Now()
	changeTime := incidentStart.Add(-10 * time.Minute)

	rel, delta := c.calculateRelationship(changeTime, incidentStart)
	if rel != "before" {
		t.Errorf("relationship = %q, want before", rel)
	}
	if delta == "" {
		t.Error("timeDelta should not be empty")
	}
}

func TestCalculateRelationship_After(t *testing.T) {
	c := NewIncidentChangeCorrelator(nil)
	incidentStart := time.Now()
	changeTime := incidentStart.Add(5 * time.Minute)

	rel, delta := c.calculateRelationship(changeTime, incidentStart)
	if rel != "after" {
		t.Errorf("relationship = %q, want after", rel)
	}
	if delta == "" {
		t.Error("timeDelta should not be empty")
	}
}

func TestCalculateRelationship_During(t *testing.T) {
	c := NewIncidentChangeCorrelator(nil)
	incidentStart := time.Now()
	// Within 1 minute = "during"
	changeTime := incidentStart.Add(-30 * time.Second)

	rel, delta := c.calculateRelationship(changeTime, incidentStart)
	if rel != "during" {
		t.Errorf("relationship = %q, want during", rel)
	}
	if delta != "during incident" {
		t.Errorf("timeDelta = %q, want 'during incident'", delta)
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// calculateRelevanceScore
// ─────────────────────────────────────────────────────────────────────────────

func TestCalculateRelevanceScore_NamespaceMatch(t *testing.T) {
	c := NewIncidentChangeCorrelator(nil)
	change := history.ChangeEvent{
		Namespace:    "prod",
		ResourceName: "other",
		Timestamp:    time.Now().Add(-10 * time.Minute),
	}
	score := c.calculateRelevanceScore(change, "prod", "api-pod", time.Now())
	if score < 0.3 {
		t.Errorf("namespace match score = %f, want >= 0.3", score)
	}
}

func TestCalculateRelevanceScore_ResourceNameMatch(t *testing.T) {
	c := NewIncidentChangeCorrelator(nil)
	change := history.ChangeEvent{
		Namespace:    "default",
		ResourceName: "api-pod",
		Timestamp:    time.Now().Add(-10 * time.Minute),
	}
	score := c.calculateRelevanceScore(change, "default", "api-pod", time.Now())
	// Both namespace and resource name match → high score
	if score < 0.6 {
		t.Errorf("namespace+resource match score = %f, want >= 0.6", score)
	}
}

func TestCalculateRelevanceScore_RecentChangeBonusWithin5Min(t *testing.T) {
	c := NewIncidentChangeCorrelator(nil)
	incidentStart := time.Now()
	change := history.ChangeEvent{
		Namespace:    "ns",
		ResourceName: "res",
		Timestamp:    incidentStart.Add(-2 * time.Minute), // within 5 min
	}
	score := c.calculateRelevanceScore(change, "ns", "res", incidentStart)
	// Namespace + resource + timing = 0.3 + 0.4 + 0.2 = 0.9
	if score < 0.7 {
		t.Errorf("recent change score = %f, want >= 0.7", score)
	}
}

func TestCalculateRelevanceScore_CappedAt1(t *testing.T) {
	c := NewIncidentChangeCorrelator(nil)
	incidentStart := time.Now()
	change := history.ChangeEvent{
		Namespace:    "ns",
		ResourceName: "res",
		Severity:     "error",
		Type:         "deployment",
		Timestamp:    incidentStart.Add(-1 * time.Minute), // very recent
	}
	score := c.calculateRelevanceScore(change, "ns", "res", incidentStart)
	if score > 1.0 {
		t.Errorf("score = %f, should be capped at 1.0", score)
	}
}

func TestCalculateRelevanceScore_SeverityErrorBoost(t *testing.T) {
	c := NewIncidentChangeCorrelator(nil)
	change := history.ChangeEvent{
		Severity:  "error",
		Timestamp: time.Now().Add(-1 * time.Hour),
	}
	score := c.calculateRelevanceScore(change, "ns", "res", time.Now())
	if score < 0.1 {
		t.Errorf("error severity should add at least 0.1 to score, got %f", score)
	}
}

func TestCalculateRelevanceScore_NoMatch_LowScore(t *testing.T) {
	c := NewIncidentChangeCorrelator(nil)
	change := history.ChangeEvent{
		Namespace:    "other-ns",
		ResourceName: "other-res",
		Timestamp:    time.Now().Add(-2 * time.Hour), // old
	}
	score := c.calculateRelevanceScore(change, "prod", "api-pod", time.Now())
	if score >= 0.3 {
		t.Errorf("no match score = %f, want < 0.3", score)
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// formatDuration
// ─────────────────────────────────────────────────────────────────────────────

func TestFormatDuration_LessThanMinute(t *testing.T) {
	got := formatDuration(30 * time.Second)
	if got != "<1m" {
		t.Errorf("formatDuration(30s) = %q, want <1m", got)
	}
}

func TestFormatDuration_Minutes(t *testing.T) {
	got := formatDuration(5 * time.Minute)
	if got == "" {
		t.Error("formatDuration(5m) should not be empty")
	}
}

func TestFormatDuration_Hours(t *testing.T) {
	got := formatDuration(2 * time.Hour)
	if got == "" {
		t.Error("formatDuration(2h) should not be empty")
	}
}

func TestFormatDuration_Days(t *testing.T) {
	got := formatDuration(48 * time.Hour)
	if got == "" {
		t.Error("formatDuration(48h) should not be empty")
	}
}
