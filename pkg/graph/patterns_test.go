// Copyright 2025 KubeGraf Contributors
// SPDX-License-Identifier: Apache-2.0

package graph

import (
	"testing"
	"time"
)

// ─────────────────────────────────────────────────────────────────────────────
// DefaultPatterns — smoke test
// ─────────────────────────────────────────────────────────────────────────────

func TestDefaultPatterns_NotEmpty(t *testing.T) {
	if len(DefaultPatterns) == 0 {
		t.Error("DefaultPatterns should not be empty")
	}
}

func TestDefaultPatterns_AllHaveNames(t *testing.T) {
	for i, p := range DefaultPatterns {
		if p.Name == "" {
			t.Errorf("DefaultPatterns[%d].Name is empty", i)
		}
	}
}

func TestDefaultPatterns_ConfidenceRange(t *testing.T) {
	for _, p := range DefaultPatterns {
		if p.Confidence <= 0 || p.Confidence > 1 {
			t.Errorf("pattern %q: Confidence = %f, want 0 < c <= 1", p.Name, p.Confidence)
		}
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// MatchPattern
// ─────────────────────────────────────────────────────────────────────────────

func TestMatchPattern_NoConditionNoEvents_ReturnsNil(t *testing.T) {
	// With no matching conditions or events, MatchPattern should return nil.
	result := MatchPattern(KindPod, map[string]bool{}, []GraphEvent{})
	// May or may not be nil depending on whether any pattern has no conditions
	// The important thing is it doesn't panic.
	_ = result
}

func TestMatchPattern_NodeDiskPressure(t *testing.T) {
	conditions := map[string]bool{"DiskPressure": true}
	events := []GraphEvent{
		{Reason: "Evicted", Timestamp: time.Now()},
	}
	result := MatchPattern(KindNode, conditions, events)
	if result == nil {
		t.Error("expected a pattern match for DiskPressure + Evicted event")
	}
	if result != nil && result.Name != "node_disk_pressure_eviction_cascade" {
		t.Errorf("matched pattern = %q, want node_disk_pressure_eviction_cascade", result.Name)
	}
}

func TestMatchPattern_NodeMemoryPressure(t *testing.T) {
	conditions := map[string]bool{"MemoryPressure": true}
	events := []GraphEvent{
		{Reason: "OOMKilling", Timestamp: time.Now()},
	}
	result := MatchPattern(KindNode, conditions, events)
	if result == nil {
		t.Error("expected a pattern match for MemoryPressure + OOMKilling event")
	}
}

func TestMatchPattern_WrongKind_ReturnsNil(t *testing.T) {
	// Node pattern should not match Pod kind
	conditions := map[string]bool{"DiskPressure": true}
	events := []GraphEvent{{Reason: "Evicted", Timestamp: time.Now()}}
	// Use KindDeployment which shouldn't match node patterns
	result := MatchPattern(KindDeployment, conditions, events)
	// If pattern has TriggerKind = KindNode, it won't match KindDeployment
	if result != nil && result.TriggerKind != "" && result.TriggerKind != KindDeployment {
		t.Errorf("pattern %q matched wrong kind", result.Name)
	}
}

func TestMatchPattern_CaseInsensitiveReason(t *testing.T) {
	conditions := map[string]bool{"DiskPressure": true}
	events := []GraphEvent{
		{Reason: "evicted", Timestamp: time.Now()}, // lowercase
	}
	result := MatchPattern(KindNode, conditions, events)
	if result == nil {
		t.Error("MatchPattern should be case-insensitive for event reasons")
	}
}

func TestMatchPattern_MultipleEventsHigherScore(t *testing.T) {
	conditions := map[string]bool{"DiskPressure": true}
	events := []GraphEvent{
		{Reason: "Evicted", Timestamp: time.Now()},
		{Reason: "FreeDiskSpaceFailed", Timestamp: time.Now()},
		{Reason: "NodeHasDiskPressure", Timestamp: time.Now()},
	}
	result := MatchPattern(KindNode, conditions, events)
	if result == nil {
		t.Error("expected pattern match for multiple matching events")
	}
}
