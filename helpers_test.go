// Copyright 2025 KubeGraf Contributors
// SPDX-License-Identifier: Apache-2.0

package main

import (
	"testing"
	"time"
)

// ─────────────────────────────────────────────────────────────────────────────
// getStatusIcon
// ─────────────────────────────────────────────────────────────────────────────

func TestGetStatusIcon_Running_Ready(t *testing.T) {
	icon, color := getStatusIcon("Running", true)
	if icon == "" {
		t.Error("expected non-empty icon for Running/ready")
	}
	if color != "green" {
		t.Errorf("Running/ready color = %q, want green", color)
	}
}

func TestGetStatusIcon_Running_NotReady(t *testing.T) {
	icon, color := getStatusIcon("Running", false)
	if icon == "" {
		t.Error("expected non-empty icon for Running/not-ready")
	}
	if color != "yellow" {
		t.Errorf("Running/not-ready color = %q, want yellow", color)
	}
}

func TestGetStatusIcon_Pending(t *testing.T) {
	_, color := getStatusIcon("Pending", false)
	if color != "yellow" {
		t.Errorf("Pending color = %q, want yellow", color)
	}
}

func TestGetStatusIcon_Succeeded(t *testing.T) {
	_, color := getStatusIcon("Succeeded", false)
	if color != "green" {
		t.Errorf("Succeeded color = %q, want green", color)
	}
}

func TestGetStatusIcon_Completed(t *testing.T) {
	_, color := getStatusIcon("Completed", false)
	if color != "green" {
		t.Errorf("Completed color = %q, want green", color)
	}
}

func TestGetStatusIcon_Failed(t *testing.T) {
	_, color := getStatusIcon("Failed", false)
	if color != "red" {
		t.Errorf("Failed color = %q, want red", color)
	}
}

func TestGetStatusIcon_CrashLoopBackOff(t *testing.T) {
	_, color := getStatusIcon("CrashLoopBackOff", false)
	if color != "red" {
		t.Errorf("CrashLoopBackOff color = %q, want red", color)
	}
}

func TestGetStatusIcon_Unknown(t *testing.T) {
	_, color := getStatusIcon("SomethingWeird", false)
	if color != "gray" {
		t.Errorf("unknown status color = %q, want gray", color)
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// getEventIcon
// ─────────────────────────────────────────────────────────────────────────────

func TestGetEventIcon_Normal(t *testing.T) {
	_, color := getEventIcon("Normal")
	if color != "green" {
		t.Errorf("Normal event color = %q, want green", color)
	}
}

func TestGetEventIcon_Warning(t *testing.T) {
	_, color := getEventIcon("Warning")
	if color != "yellow" {
		t.Errorf("Warning event color = %q, want yellow", color)
	}
}

func TestGetEventIcon_Error(t *testing.T) {
	_, color := getEventIcon("Error")
	if color != "red" {
		t.Errorf("Error event color = %q, want red", color)
	}
}

func TestGetEventIcon_Unknown(t *testing.T) {
	_, color := getEventIcon("Unknown")
	if color != "gray" {
		t.Errorf("unknown event type color = %q, want gray", color)
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// formatDuration
// ─────────────────────────────────────────────────────────────────────────────

func TestFormatDuration_Seconds(t *testing.T) {
	got := formatDuration(45 * time.Second)
	if got != "45s" {
		t.Errorf("formatDuration(45s) = %q, want 45s", got)
	}
}

func TestFormatDuration_Minutes(t *testing.T) {
	got := formatDuration(5 * time.Minute)
	if got != "5m" {
		t.Errorf("formatDuration(5m) = %q, want 5m", got)
	}
}

func TestFormatDuration_Hours(t *testing.T) {
	got := formatDuration(3 * time.Hour)
	if got != "3h" {
		t.Errorf("formatDuration(3h) = %q, want 3h", got)
	}
}

func TestFormatDuration_Days(t *testing.T) {
	got := formatDuration(48 * time.Hour)
	if got != "2d" {
		t.Errorf("formatDuration(48h) = %q, want 2d", got)
	}
}

func TestFormatDuration_Boundaries(t *testing.T) {
	tests := []struct {
		d    time.Duration
		want string
	}{
		{59 * time.Second, "59s"},
		{60 * time.Second, "1m"},
		{59 * time.Minute, "59m"},
		{60 * time.Minute, "1h"},
		{23*time.Hour + 59*time.Minute, "23h"},
		{24 * time.Hour, "1d"},
	}
	for _, tt := range tests {
		got := formatDuration(tt.d)
		if got != tt.want {
			t.Errorf("formatDuration(%v) = %q, want %q", tt.d, got, tt.want)
		}
	}
}
