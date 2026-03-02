// Copyright 2025 KubeGraf Contributors
// SPDX-License-Identifier: Apache-2.0

package analyze

import (
	"testing"
	"time"
)

// ─────────────────────────────────────────────────────────────────────────────
// FormatDuration
// ─────────────────────────────────────────────────────────────────────────────

func TestFormatDuration_Seconds(t *testing.T) {
	got := FormatDuration(30 * time.Second)
	if got != "30s" {
		t.Errorf("FormatDuration(30s) = %q, want 30s", got)
	}
}

func TestFormatDuration_Minutes(t *testing.T) {
	got := FormatDuration(5 * time.Minute)
	if got != "5m" {
		t.Errorf("FormatDuration(5m) = %q, want 5m", got)
	}
}

func TestFormatDuration_Hours(t *testing.T) {
	got := FormatDuration(2 * time.Hour)
	if got != "2.0h" {
		t.Errorf("FormatDuration(2h) = %q, want 2.0h", got)
	}
}

func TestFormatDuration_Days(t *testing.T) {
	got := FormatDuration(48 * time.Hour)
	if got != "2.0d" {
		t.Errorf("FormatDuration(48h) = %q, want 2.0d", got)
	}
}

func TestFormatDuration_LessThanMinute(t *testing.T) {
	got := FormatDuration(45 * time.Second)
	if got == "" {
		t.Error("FormatDuration should return non-empty string")
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// TruncateString
// ─────────────────────────────────────────────────────────────────────────────

func TestTruncateString_ShortString_Unchanged(t *testing.T) {
	got := TruncateString("hello", 10)
	if got != "hello" {
		t.Errorf("TruncateString short = %q, want hello", got)
	}
}

func TestTruncateString_ExactLength_Unchanged(t *testing.T) {
	got := TruncateString("hello", 5)
	if got != "hello" {
		t.Errorf("TruncateString exact = %q, want hello", got)
	}
}

func TestTruncateString_LongString_Truncated(t *testing.T) {
	got := TruncateString("hello world this is a long string", 10)
	if len(got) != 10 {
		t.Errorf("TruncateString length = %d, want 10", len(got))
	}
}

func TestTruncateString_Ellipsis(t *testing.T) {
	got := TruncateString("hello world", 8)
	if got[len(got)-3:] != "..." {
		t.Errorf("TruncateString should end with '...', got %q", got)
	}
}

func TestTruncateString_Empty(t *testing.T) {
	got := TruncateString("", 10)
	if got != "" {
		t.Errorf("TruncateString empty = %q, want empty", got)
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// JoinStrings
// ─────────────────────────────────────────────────────────────────────────────

func TestJoinStrings_Empty(t *testing.T) {
	got := JoinStrings([]string{}, ",")
	if got != "" {
		t.Errorf("JoinStrings([]) = %q, want empty", got)
	}
}

func TestJoinStrings_Nil(t *testing.T) {
	got := JoinStrings(nil, ",")
	if got != "" {
		t.Errorf("JoinStrings(nil) = %q, want empty", got)
	}
}

func TestJoinStrings_Single(t *testing.T) {
	got := JoinStrings([]string{"a"}, ",")
	if got != "a" {
		t.Errorf("JoinStrings([a]) = %q, want a", got)
	}
}

func TestJoinStrings_Multiple(t *testing.T) {
	got := JoinStrings([]string{"a", "b", "c"}, ", ")
	if got != "a, b, c" {
		t.Errorf("JoinStrings(a,b,c) = %q, want 'a, b, c'", got)
	}
}
