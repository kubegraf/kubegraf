// Copyright 2025 KubeGraf Contributors
// SPDX-License-Identifier: Apache-2.0

package incidents_test

import (
	"testing"

	"github.com/kubegraf/kubegraf/pkg/incidents"
)

// ─────────────────────────────────────────────────────────────────────────────
// FailurePattern constants
// ─────────────────────────────────────────────────────────────────────────────

func TestFailurePatternConstants_NonEmpty(t *testing.T) {
	patterns := []incidents.FailurePattern{
		incidents.PatternAppCrash, incidents.PatternCrashLoop, incidents.PatternOOMPressure, incidents.PatternRestartStorm,
		incidents.PatternInternalErrors, incidents.PatternUpstreamFailure, incidents.PatternTimeouts,
		incidents.PatternNoReadyEndpoints, incidents.PatternImagePullFailure, incidents.PatternConfigError,
		incidents.PatternDNSFailure, incidents.PatternPermissionDenied,
		incidents.PatternNodeNotReady, incidents.PatternNodePressure, incidents.PatternDiskPressure, incidents.PatternNetworkPartition,
		incidents.PatternUnschedulable, incidents.PatternResourceExhausted, incidents.PatternAffinityConflict,
		incidents.PatternSecretMissing, incidents.PatternRBACDenied, incidents.PatternPolicyViolation,
		incidents.PatternLivenessFailure, incidents.PatternReadinessFailure, incidents.PatternStartupFailure,
		incidents.PatternCertificateExpiring, incidents.PatternCertificateRequestFailed, incidents.PatternIssuerNotReady,
		incidents.PatternUnknown,
	}
	for _, p := range patterns {
		if p == "" {
			t.Error("FailurePattern constant should not be empty")
		}
	}
}

func TestFailurePatternConstants_Unique(t *testing.T) {
	patterns := []incidents.FailurePattern{
		incidents.PatternAppCrash, incidents.PatternCrashLoop, incidents.PatternOOMPressure, incidents.PatternRestartStorm,
		incidents.PatternInternalErrors, incidents.PatternUpstreamFailure, incidents.PatternTimeouts,
		incidents.PatternNoReadyEndpoints, incidents.PatternImagePullFailure, incidents.PatternConfigError,
		incidents.PatternDNSFailure, incidents.PatternPermissionDenied,
		incidents.PatternNodeNotReady, incidents.PatternNodePressure, incidents.PatternDiskPressure, incidents.PatternNetworkPartition,
		incidents.PatternUnschedulable, incidents.PatternResourceExhausted, incidents.PatternAffinityConflict,
		incidents.PatternSecretMissing, incidents.PatternRBACDenied, incidents.PatternPolicyViolation,
		incidents.PatternLivenessFailure, incidents.PatternReadinessFailure, incidents.PatternStartupFailure,
		incidents.PatternCertificateExpiring, incidents.PatternCertificateRequestFailed, incidents.PatternIssuerNotReady,
		incidents.PatternUnknown,
	}
	seen := make(map[incidents.FailurePattern]bool)
	for _, p := range patterns {
		if seen[p] {
			t.Errorf("duplicate FailurePattern: %q", p)
		}
		seen[p] = true
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// FailurePattern.String()
// ─────────────────────────────────────────────────────────────────────────────

func TestFailurePatternString(t *testing.T) {
	if got := incidents.PatternCrashLoop.String(); got != "CRASHLOOP" {
		t.Errorf("PatternCrashLoop.String() = %q, want CRASHLOOP", got)
	}
}

func TestFailurePatternString_EqualToValue(t *testing.T) {
	p := incidents.PatternOOMPressure
	if p.String() != string(p) {
		t.Errorf("String() = %q, want %q", p.String(), string(p))
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// FailurePattern.Category()
// ─────────────────────────────────────────────────────────────────────────────

func TestFailurePatternCategory_Application(t *testing.T) {
	appPatterns := []incidents.FailurePattern{
		incidents.PatternAppCrash, incidents.PatternCrashLoop, incidents.PatternOOMPressure, incidents.PatternRestartStorm,
		incidents.PatternInternalErrors, incidents.PatternUpstreamFailure, incidents.PatternTimeouts,
	}
	for _, p := range appPatterns {
		if p.Category() != incidents.CategoryApplication {
			t.Errorf("%q.Category() = %q, want application", p, p.Category())
		}
	}
}

func TestFailurePatternCategory_Infrastructure(t *testing.T) {
	infraPatterns := []incidents.FailurePattern{
		incidents.PatternNoReadyEndpoints, incidents.PatternImagePullFailure, incidents.PatternConfigError,
		incidents.PatternDNSFailure, incidents.PatternPermissionDenied,
	}
	for _, p := range infraPatterns {
		if p.Category() != incidents.CategoryInfrastructure {
			t.Errorf("%q.Category() = %q, want infrastructure", p, p.Category())
		}
	}
}

func TestFailurePatternCategory_Node(t *testing.T) {
	nodePatterns := []incidents.FailurePattern{
		incidents.PatternNodeNotReady, incidents.PatternNodePressure, incidents.PatternDiskPressure, incidents.PatternNetworkPartition,
	}
	for _, p := range nodePatterns {
		if p.Category() != incidents.CategoryNode {
			t.Errorf("%q.Category() = %q, want node", p, p.Category())
		}
	}
}

func TestFailurePatternCategory_Scheduling(t *testing.T) {
	schedPatterns := []incidents.FailurePattern{
		incidents.PatternUnschedulable, incidents.PatternResourceExhausted, incidents.PatternAffinityConflict,
	}
	for _, p := range schedPatterns {
		if p.Category() != incidents.CategoryScheduling {
			t.Errorf("%q.Category() = %q, want scheduling", p, p.Category())
		}
	}
}

func TestFailurePatternCategory_Security(t *testing.T) {
	secPatterns := []incidents.FailurePattern{incidents.PatternSecretMissing, incidents.PatternRBACDenied, incidents.PatternPolicyViolation}
	for _, p := range secPatterns {
		if p.Category() != incidents.CategorySecurity {
			t.Errorf("%q.Category() = %q, want security", p, p.Category())
		}
	}
}

func TestFailurePatternCategory_HealthCheck(t *testing.T) {
	healthPatterns := []incidents.FailurePattern{incidents.PatternLivenessFailure, incidents.PatternReadinessFailure, incidents.PatternStartupFailure}
	for _, p := range healthPatterns {
		if p.Category() != incidents.CategoryHealthCheck {
			t.Errorf("%q.Category() = %q, want health_check", p, p.Category())
		}
	}
}

func TestFailurePatternCategory_Certificate(t *testing.T) {
	certPatterns := []incidents.FailurePattern{
		incidents.PatternCertificateExpiring, incidents.PatternCertificateRequestFailed, incidents.PatternIssuerNotReady,
	}
	for _, p := range certPatterns {
		if p.Category() != incidents.CategoryCertificate {
			t.Errorf("%q.Category() = %q, want certificate", p, p.Category())
		}
	}
}

func TestFailurePatternCategory_Unknown(t *testing.T) {
	if got := incidents.PatternUnknown.Category(); got != incidents.CategoryUnknown {
		t.Errorf("PatternUnknown.Category() = %q, want unknown", got)
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// AllPatterns
// ─────────────────────────────────────────────────────────────────────────────

func TestAllPatterns_NotEmpty(t *testing.T) {
	patterns := incidents.AllPatterns()
	if len(patterns) == 0 {
		t.Error("AllPatterns should return non-empty slice")
	}
}

func TestAllPatterns_AllHaveNames(t *testing.T) {
	for _, pm := range incidents.AllPatterns() {
		if pm.Name == "" {
			t.Errorf("pattern %q has empty Name", pm.Pattern)
		}
	}
}

func TestAllPatterns_AllHaveDescriptions(t *testing.T) {
	for _, pm := range incidents.AllPatterns() {
		if pm.Description == "" {
			t.Errorf("pattern %q has empty Description", pm.Pattern)
		}
	}
}

func TestAllPatterns_AllHaveCategories(t *testing.T) {
	for _, pm := range incidents.AllPatterns() {
		if pm.Category == "" {
			t.Errorf("pattern %q has empty Category", pm.Pattern)
		}
	}
}

func TestAllPatterns_AllHaveSeverity(t *testing.T) {
	for _, pm := range incidents.AllPatterns() {
		if pm.DefaultSeverity == "" {
			t.Errorf("pattern %q has empty DefaultSeverity", pm.Pattern)
		}
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// GetPatternMetadata
// ─────────────────────────────────────────────────────────────────────────────

func TestGetPatternMetadata_Found(t *testing.T) {
	pm := incidents.GetPatternMetadata(incidents.PatternCrashLoop)
	if pm == nil {
		t.Fatal("GetPatternMetadata(PatternCrashLoop) returned nil")
	}
	if pm.Pattern != incidents.PatternCrashLoop {
		t.Errorf("pm.Pattern = %q, want CRASHLOOP", pm.Pattern)
	}
}

func TestGetPatternMetadata_Unknown(t *testing.T) {
	pm := incidents.GetPatternMetadata(incidents.PatternUnknown)
	// Unknown pattern may return nil or a metadata entry
	if pm != nil && pm.Pattern != incidents.PatternUnknown {
		t.Errorf("GetPatternMetadata(Unknown) returned wrong pattern: %q", pm.Pattern)
	}
}

func TestGetPatternMetadata_AllKnownPatterns(t *testing.T) {
	knownPatterns := []incidents.FailurePattern{
		incidents.PatternAppCrash, incidents.PatternCrashLoop, incidents.PatternOOMPressure, incidents.PatternRestartStorm,
		incidents.PatternImagePullFailure, incidents.PatternConfigError, incidents.PatternSecretMissing,
		incidents.PatternUnschedulable, incidents.PatternLivenessFailure, incidents.PatternReadinessFailure,
	}
	for _, p := range knownPatterns {
		pm := incidents.GetPatternMetadata(p)
		if pm == nil {
			t.Errorf("GetPatternMetadata(%q) returned nil", p)
		}
	}
}
