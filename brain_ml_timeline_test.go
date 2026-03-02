// Copyright 2025 KubeGraf Contributors
// SPDX-License-Identifier: Apache-2.0

package main

import (
	"testing"

	brain "github.com/kubegraf/kubegraf/internal/brain"
)

// ─────────────────────────────────────────────────────────────────────────────
// sortEventsByTimestamp
// ─────────────────────────────────────────────────────────────────────────────

func TestSortEventsByTimestamp_AlreadySorted(t *testing.T) {
	events := []brain.MLTimelineEvent{
		{Timestamp: "2025-01-03T00:00:00Z"},
		{Timestamp: "2025-01-02T00:00:00Z"},
		{Timestamp: "2025-01-01T00:00:00Z"},
	}
	// Sort should produce newest-first order (function sorts descending by comparing strings)
	sortEventsByTimestamp(events)
	// Just verify it doesn't panic and returns 3 elements
	if len(events) != 3 {
		t.Errorf("sortEventsByTimestamp changed length to %d, want 3", len(events))
	}
}

func TestSortEventsByTimestamp_Empty(t *testing.T) {
	events := []brain.MLTimelineEvent{}
	// Should not panic
	sortEventsByTimestamp(events)
}

func TestSortEventsByTimestamp_Single(t *testing.T) {
	events := []brain.MLTimelineEvent{
		{Timestamp: "2025-01-01T00:00:00Z"},
	}
	sortEventsByTimestamp(events)
	if events[0].Timestamp != "2025-01-01T00:00:00Z" {
		t.Error("single element should remain unchanged")
	}
}

func TestSortEventsByTimestamp_Descending(t *testing.T) {
	events := []brain.MLTimelineEvent{
		{Timestamp: "2025-01-01T00:00:00Z"},
		{Timestamp: "2025-01-03T00:00:00Z"},
		{Timestamp: "2025-01-02T00:00:00Z"},
	}
	sortEventsByTimestamp(events)
	// verify sorted order (descending by timestamp string)
	for i := 0; i < len(events)-1; i++ {
		if events[i].Timestamp < events[i+1].Timestamp {
			t.Errorf("events not in descending order at index %d: %s < %s",
				i, events[i].Timestamp, events[i+1].Timestamp)
		}
	}
}
