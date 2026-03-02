// Copyright 2025 KubeGraf Contributors
// SPDX-License-Identifier: Apache-2.0

package main

import (
	"testing"
)

// ─────────────────────────────────────────────────────────────────────────────
// GetVersion
// ─────────────────────────────────────────────────────────────────────────────

func TestGetVersion_NonEmpty(t *testing.T) {
	v := GetVersion()
	if v == "" {
		t.Error("GetVersion() should not return empty string")
	}
}

func TestGetVersion_ContainsDigit(t *testing.T) {
	v := GetVersion()
	hasDigit := false
	for _, c := range v {
		if c >= '0' && c <= '9' {
			hasDigit = true
			break
		}
	}
	if !hasDigit {
		t.Errorf("GetVersion() = %q, expected to contain a version number", v)
	}
}
