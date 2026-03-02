// Copyright 2025 KubeGraf Contributors
// SPDX-License-Identifier: Apache-2.0

package brain

import (
	"testing"
)

// ─────────────────────────────────────────────────────────────────────────────
// ValidateClientset
// ─────────────────────────────────────────────────────────────────────────────

func TestValidateClientset_Nil(t *testing.T) {
	err := ValidateClientset(nil)
	if err == nil {
		t.Error("ValidateClientset(nil) should return an error")
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// min helper
// ─────────────────────────────────────────────────────────────────────────────

func TestMin_ReturnsSmaller(t *testing.T) {
	tests := []struct {
		a, b, want int
	}{
		{3, 5, 3},
		{5, 3, 3},
		{0, 0, 0},
		{-1, 1, -1},
		{10, 10, 10},
	}
	for _, tt := range tests {
		if got := min(tt.a, tt.b); got != tt.want {
			t.Errorf("min(%d, %d) = %d, want %d", tt.a, tt.b, got, tt.want)
		}
	}
}
