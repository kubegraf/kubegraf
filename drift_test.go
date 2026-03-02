// Copyright 2025 KubeGraf Contributors
// SPDX-License-Identifier: Apache-2.0

package main

import (
	"strings"
	"testing"
)

// ─────────────────────────────────────────────────────────────────────────────
// FormatDriftStatus
// ─────────────────────────────────────────────────────────────────────────────

func TestFormatDriftStatus_Synced(t *testing.T) {
	got := FormatDriftStatus(DriftStatusSynced)
	if !strings.Contains(got, "Synced") {
		t.Errorf("FormatDriftStatus(Synced) = %q, expected to contain 'Synced'", got)
	}
}

func TestFormatDriftStatus_Drifted(t *testing.T) {
	got := FormatDriftStatus(DriftStatusDrifted)
	if !strings.Contains(got, "Drifted") {
		t.Errorf("FormatDriftStatus(Drifted) = %q, expected to contain 'Drifted'", got)
	}
}

func TestFormatDriftStatus_Missing(t *testing.T) {
	got := FormatDriftStatus(DriftStatusMissing)
	if !strings.Contains(got, "Missing") {
		t.Errorf("FormatDriftStatus(Missing) = %q, expected to contain 'Missing'", got)
	}
}

func TestFormatDriftStatus_Unknown(t *testing.T) {
	got := FormatDriftStatus(DriftStatus("anything-else"))
	if got == "" {
		t.Error("FormatDriftStatus unknown should return non-empty string")
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// FormatDriftDifferences
// ─────────────────────────────────────────────────────────────────────────────

func TestFormatDriftDifferences_Empty(t *testing.T) {
	got := FormatDriftDifferences(nil)
	if got != "No differences" {
		t.Errorf("FormatDriftDifferences(nil) = %q, want 'No differences'", got)
	}
}

func TestFormatDriftDifferences_EmptySlice(t *testing.T) {
	got := FormatDriftDifferences([]DriftDifference{})
	if got != "No differences" {
		t.Errorf("FormatDriftDifferences([]) = %q, want 'No differences'", got)
	}
}

func TestFormatDriftDifferences_WithDiffs(t *testing.T) {
	diffs := []DriftDifference{
		{Path: "spec.replicas", Expected: "3", Actual: "1"},
	}
	got := FormatDriftDifferences(diffs)
	if !strings.Contains(got, "spec.replicas") {
		t.Errorf("FormatDriftDifferences should contain path 'spec.replicas', got: %q", got)
	}
	if !strings.Contains(got, "Expected") {
		t.Errorf("FormatDriftDifferences should contain 'Expected', got: %q", got)
	}
	if !strings.Contains(got, "Actual") {
		t.Errorf("FormatDriftDifferences should contain 'Actual', got: %q", got)
	}
}

func TestFormatDriftDifferences_MultipleDiffs(t *testing.T) {
	diffs := []DriftDifference{
		{Path: "spec.replicas", Expected: "3", Actual: "1"},
		{Path: "spec.image", Expected: "v2", Actual: "v1"},
	}
	got := FormatDriftDifferences(diffs)
	if !strings.Contains(got, "spec.image") {
		t.Errorf("FormatDriftDifferences should contain both paths, got: %q", got)
	}
}
