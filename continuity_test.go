// Copyright 2025 KubeGraf Contributors
// SPDX-License-Identifier: Apache-2.0

package main

import (
	"testing"
	"time"
)

// ─────────────────────────────────────────────────────────────────────────────
// parseWindow
// ─────────────────────────────────────────────────────────────────────────────

func TestParseWindow_Days(t *testing.T) {
	d, err := parseWindow("7d")
	if err != nil {
		t.Fatalf("parseWindow(7d) error: %v", err)
	}
	if d != 7*24*time.Hour {
		t.Errorf("parseWindow(7d) = %v, want 168h", d)
	}
}

func TestParseWindow_Hours(t *testing.T) {
	d, err := parseWindow("24h")
	if err != nil {
		t.Fatalf("parseWindow(24h) error: %v", err)
	}
	if d != 24*time.Hour {
		t.Errorf("parseWindow(24h) = %v, want 24h", d)
	}
}

func TestParseWindow_Minutes(t *testing.T) {
	d, err := parseWindow("30m")
	if err != nil {
		t.Fatalf("parseWindow(30m) error: %v", err)
	}
	if d != 30*time.Minute {
		t.Errorf("parseWindow(30m) = %v, want 30m", d)
	}
}

func TestParseWindow_Empty_DefaultsTo7d(t *testing.T) {
	d, err := parseWindow("")
	if err != nil {
		t.Fatalf("parseWindow('') error: %v", err)
	}
	if d != 7*24*time.Hour {
		t.Errorf("parseWindow('') = %v, want 168h (7d default)", d)
	}
}

func TestParseWindow_Day_LongForm(t *testing.T) {
	d, err := parseWindow("3day")
	if err != nil {
		t.Fatalf("parseWindow(3day) error: %v", err)
	}
	if d != 3*24*time.Hour {
		t.Errorf("parseWindow(3day) = %v, want 72h", d)
	}
}

func TestParseWindow_Invalid_ReturnsError(t *testing.T) {
	_, err := parseWindow("xyz")
	if err == nil {
		t.Error("parseWindow(xyz) should return error")
	}
}

func TestParseWindow_UnknownUnit_ReturnsError(t *testing.T) {
	_, err := parseWindow("5w")
	if err == nil {
		t.Error("parseWindow with unknown unit should return error")
	}
}

func TestParseWindow_CaseInsensitive(t *testing.T) {
	d, err := parseWindow("2D")
	if err != nil {
		t.Fatalf("parseWindow(2D) error: %v", err)
	}
	if d != 2*24*time.Hour {
		t.Errorf("parseWindow(2D) = %v, want 48h", d)
	}
}
