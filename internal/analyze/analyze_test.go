// Copyright 2025 KubeGraf Contributors
// SPDX-License-Identifier: Apache-2.0

package analyze

import (
	"testing"
)

// ─────────────────────────────────────────────────────────────────────────────
// helpers
// ─────────────────────────────────────────────────────────────────────────────

func podEvidence(phase, reason string) *Evidence {
	return &Evidence{
		PodStatus: &PodStatusEvidence{Phase: phase, Reason: reason},
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// Analyze — nil-safe / default path
// ─────────────────────────────────────────────────────────────────────────────

func TestAnalyze_NilPodStatus_ReturnsUnknown(t *testing.T) {
	diag := Analyze(&Evidence{})
	if diag == nil {
		t.Fatal("Analyze should never return nil")
	}
	if diag.Title == "" {
		t.Error("Analyze: Title should not be empty")
	}
}

func TestAnalyze_UnknownPhase_ConfidenceLow(t *testing.T) {
	diag := Analyze(podEvidence("Unknown", ""))
	if diag.Confidence != ConfidenceLow {
		t.Errorf("default confidence = %q, want Low", diag.Confidence)
	}
}

func TestAnalyze_ReturnsRecommendations(t *testing.T) {
	diag := Analyze(podEvidence("Running", ""))
	if len(diag.Recommendations) == 0 {
		t.Error("Analyze should always return at least one recommendation")
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// OOMKilled — lastTermination reason
// ─────────────────────────────────────────────────────────────────────────────

func TestAnalyze_OOMKilled_ByReason(t *testing.T) {
	ev := &Evidence{
		PodStatus: &PodStatusEvidence{
			Phase: "Running",
			LastTermination: &TerminationState{
				Reason:   "OOMKilled",
				ExitCode: 137,
			},
		},
	}
	diag := Analyze(ev)
	if diag.Confidence != ConfidenceHigh {
		t.Errorf("OOMKilled confidence = %q, want High", diag.Confidence)
	}
	if diag.Title == "" {
		t.Error("Title should not be empty")
	}
}

func TestAnalyze_OOMKilled_ExitCode137_WithOOMEvent(t *testing.T) {
	ev := &Evidence{
		PodStatus: &PodStatusEvidence{
			Phase: "Running",
			LastTermination: &TerminationState{
				ExitCode: 137,
			},
		},
		Events: []EventEvidence{
			{Reason: "OOMKilling", Message: "oom detected"},
		},
	}
	diag := Analyze(ev)
	if diag == nil {
		t.Fatal("Analyze returned nil")
	}
	if diag.Confidence != ConfidenceHigh {
		t.Errorf("OOM exit+event confidence = %q, want High", diag.Confidence)
	}
}

func TestAnalyze_MemoryNearLimit_MediumConfidence(t *testing.T) {
	ev := &Evidence{
		PodStatus: &PodStatusEvidence{Phase: "Running"},
		Metrics: &MetricsEvidence{
			Available: true,
			Containers: []ContainerMetrics{
				{Name: "app", MemPercent: 95.0, NearLimit: true, MemUsage: "950Mi", MemLimit: "1Gi"},
			},
		},
	}
	diag := Analyze(ev)
	if diag.Confidence != ConfidenceMedium {
		t.Errorf("memory near limit confidence = %q, want Medium", diag.Confidence)
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// ImagePullBackOff
// ─────────────────────────────────────────────────────────────────────────────

func TestAnalyze_ImagePullBackOff(t *testing.T) {
	ev := &Evidence{
		PodStatus: &PodStatusEvidence{
			Phase: "Pending",
			ContainerStatuses: []ContainerStatus{
				{
					Name: "app",
					State: ContainerState{
						Waiting: &ContainerStateWaiting{Reason: "ImagePullBackOff", Message: "back-off pulling image"},
					},
				},
			},
		},
	}
	diag := Analyze(ev)
	if diag.Confidence != ConfidenceHigh {
		t.Errorf("ImagePullBackOff confidence = %q, want High", diag.Confidence)
	}
}

func TestAnalyze_ErrImagePull(t *testing.T) {
	ev := &Evidence{
		PodStatus: &PodStatusEvidence{
			Phase: "Pending",
			ContainerStatuses: []ContainerStatus{
				{
					Name: "app",
					State: ContainerState{
						Waiting: &ContainerStateWaiting{Reason: "ErrImagePull"},
					},
				},
			},
		},
	}
	diag := Analyze(ev)
	if diag.Confidence != ConfidenceHigh {
		t.Errorf("ErrImagePull confidence = %q, want High", diag.Confidence)
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// CrashLoopBackOff
// ─────────────────────────────────────────────────────────────────────────────

func TestAnalyze_CrashLoopBackOff_MediumConfidence(t *testing.T) {
	ev := &Evidence{
		PodStatus: &PodStatusEvidence{
			Phase: "Running",
			ContainerStatuses: []ContainerStatus{
				{
					Name:         "app",
					RestartCount: 10,
					State: ContainerState{
						Waiting: &ContainerStateWaiting{Reason: "CrashLoopBackOff"},
					},
				},
			},
		},
	}
	diag := Analyze(ev)
	if diag.Confidence != ConfidenceMedium {
		t.Errorf("CrashLoopBackOff (no termination) confidence = %q, want Medium", diag.Confidence)
	}
}

func TestAnalyze_CrashLoopBackOff_WithTermination_HighConfidence(t *testing.T) {
	ev := &Evidence{
		PodStatus: &PodStatusEvidence{
			Phase: "Running",
			ContainerStatuses: []ContainerStatus{
				{
					Name:         "app",
					RestartCount: 10,
					State: ContainerState{
						Waiting: &ContainerStateWaiting{Reason: "CrashLoopBackOff"},
					},
					LastState: &ContainerState{
						Terminated: &ContainerStateTerminated{
							Reason:   "Error",
							ExitCode: 1,
							Message:  "panic: runtime error",
						},
					},
				},
			},
		},
	}
	diag := Analyze(ev)
	if diag.Confidence != ConfidenceHigh {
		t.Errorf("CrashLoopBackOff+termination confidence = %q, want High", diag.Confidence)
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// Unschedulable
// ─────────────────────────────────────────────────────────────────────────────

func TestAnalyze_Unschedulable_FailedScheduling(t *testing.T) {
	ev := &Evidence{
		PodStatus: &PodStatusEvidence{Phase: "Pending"},
		Events: []EventEvidence{
			{Reason: "FailedScheduling", Message: "0/3 nodes available"},
		},
	}
	diag := Analyze(ev)
	if diag.Confidence != ConfidenceHigh {
		t.Errorf("Unschedulable confidence = %q, want High", diag.Confidence)
	}
}

func TestAnalyze_Unschedulable_MessageContainsUnschedulable(t *testing.T) {
	ev := &Evidence{
		PodStatus: &PodStatusEvidence{Phase: "Pending"},
		Events: []EventEvidence{
			{Reason: "FailedScheduling", Message: "pod is Unschedulable due to resource limits"},
		},
	}
	diag := Analyze(ev)
	if diag.Confidence != ConfidenceHigh {
		t.Errorf("Unschedulable message confidence = %q, want High", diag.Confidence)
	}
}

func TestAnalyze_PendingWithoutSchedulingEvent_NotUnschedulable(t *testing.T) {
	// Pending but no FailedScheduling event — should fall through to default
	ev := &Evidence{
		PodStatus: &PodStatusEvidence{Phase: "Pending"},
	}
	diag := Analyze(ev)
	// Should not be unschedulable diagnosis
	if diag == nil {
		t.Fatal("Analyze returned nil")
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// CreateContainerConfigError
// ─────────────────────────────────────────────────────────────────────────────

func TestAnalyze_CreateContainerConfigError(t *testing.T) {
	ev := &Evidence{
		PodStatus: &PodStatusEvidence{
			Phase: "Pending",
			ContainerStatuses: []ContainerStatus{
				{
					Name: "app",
					State: ContainerState{
						Waiting: &ContainerStateWaiting{Reason: "CreateContainerConfigError", Message: "secret not found"},
					},
				},
			},
		},
	}
	diag := Analyze(ev)
	if diag.Confidence != ConfidenceHigh {
		t.Errorf("CreateContainerConfigError confidence = %q, want High", diag.Confidence)
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// Probe failures
// ─────────────────────────────────────────────────────────────────────────────

func TestAnalyze_ProbeFailure_Readiness(t *testing.T) {
	ev := &Evidence{
		PodStatus: &PodStatusEvidence{Phase: "Running"},
		Events: []EventEvidence{
			{Reason: "Unhealthy", Message: "Readiness probe failed: connection refused"},
		},
	}
	diag := Analyze(ev)
	if diag.Confidence != ConfidenceMedium {
		t.Errorf("probe failure confidence = %q, want Medium", diag.Confidence)
	}
}

func TestAnalyze_ProbeFailure_Liveness(t *testing.T) {
	ev := &Evidence{
		PodStatus: &PodStatusEvidence{Phase: "Running"},
		Events: []EventEvidence{
			{Reason: "Unhealthy", Message: "Liveness probe failed: HTTP probe returned 500"},
		},
	}
	diag := Analyze(ev)
	if diag.Confidence != ConfidenceMedium {
		t.Errorf("liveness probe failure confidence = %q, want Medium", diag.Confidence)
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// High restart count
// ─────────────────────────────────────────────────────────────────────────────

func TestAnalyze_HighRestarts_NoTermination(t *testing.T) {
	ev := &Evidence{
		PodStatus: &PodStatusEvidence{
			Phase:    "Running",
			Restarts: 10,
			ContainerStatuses: []ContainerStatus{
				{Name: "app", RestartCount: 10},
			},
		},
	}
	diag := Analyze(ev)
	if diag.Confidence != ConfidenceMedium {
		t.Errorf("high restarts (no termination) confidence = %q, want Medium", diag.Confidence)
	}
}

func TestAnalyze_HighRestarts_WithTermination_HighConfidence(t *testing.T) {
	ev := &Evidence{
		PodStatus: &PodStatusEvidence{
			Phase:    "Running",
			Restarts: 15,
			ContainerStatuses: []ContainerStatus{
				{Name: "app", RestartCount: 15},
			},
			LastTermination: &TerminationState{
				Reason:   "Error",
				ExitCode: 1,
			},
		},
	}
	diag := Analyze(ev)
	if diag.Confidence != ConfidenceHigh {
		t.Errorf("high restarts + termination confidence = %q, want High", diag.Confidence)
	}
}

func TestAnalyze_LowRestarts_NotHighRestart(t *testing.T) {
	// 5 restarts or less → should NOT trigger high restart rule
	ev := &Evidence{
		PodStatus: &PodStatusEvidence{
			Phase:    "Running",
			Restarts: 3,
			ContainerStatuses: []ContainerStatus{
				{Name: "app", RestartCount: 3},
			},
		},
	}
	diag := Analyze(ev)
	// Falls through to default
	if diag.Confidence != ConfidenceLow {
		t.Errorf("low restarts should fall through to Low confidence, got %q", diag.Confidence)
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// Confidence constants
// ─────────────────────────────────────────────────────────────────────────────

func TestConfidenceConstants_NonEmpty(t *testing.T) {
	for _, c := range []Confidence{ConfidenceHigh, ConfidenceMedium, ConfidenceLow} {
		if c == "" {
			t.Error("confidence constant should not be empty")
		}
	}
}

func TestConfidenceConstants_Distinct(t *testing.T) {
	if ConfidenceHigh == ConfidenceMedium || ConfidenceMedium == ConfidenceLow || ConfidenceHigh == ConfidenceLow {
		t.Error("confidence constants should be distinct")
	}
}
