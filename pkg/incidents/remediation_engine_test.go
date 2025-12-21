// Copyright 2025 KubeGraf Contributors
// SPDX-License-Identifier: Apache-2.0

package incidents

import (
	"context"
	"testing"
	"time"
)

func TestRemediationEngine_GenerateRemediation(t *testing.T) {
	engine := NewRemediationEngine()

	tests := []struct {
		name      string
		snapshot  *IncidentSnapshot
		evidence  *ColdEvidence
		wantError bool
		checkPlan func(t *testing.T, plan *RemediationPlan)
	}{
		{
			name: "RESTART_STORM pattern generates fixes",
			snapshot: &IncidentSnapshot{
				IncidentID: "test-1",
				Pattern:    PatternRestartStorm,
				Resource: KubeResourceRef{
					Kind:      "Pod",
					Name:      "test-pod",
					Namespace: "default",
				},
				Confidence: 0.8,
			},
			evidence: &ColdEvidence{
				Logs: []LogEvidence{
					{ID: "log-1", Message: "Container restarted", Time: time.Now()},
				},
				Events: []EventEvidence{
					{ID: "event-1", Message: "Pod restarted", Time: time.Now()},
				},
			},
			wantError: false,
			checkPlan: func(t *testing.T, plan *RemediationPlan) {
				if plan == nil {
					t.Fatal("plan should not be nil")
				}
				if plan.RecommendedAction == nil {
					t.Error("recommendedAction should not be nil")
				}
				if plan.RecommendedAction.Type != "read_only" {
					t.Errorf("recommendedAction.Type should be 'read_only', got %s", plan.RecommendedAction.Type)
				}
				if len(plan.FixPlans) == 0 {
					t.Error("should have at least one fix plan for RESTART_STORM")
				}
				if len(plan.FixPlans) > 3 {
					t.Errorf("should have at most 3 fix plans, got %d", len(plan.FixPlans))
				}
			},
		},
		{
			name: "OOM pattern generates memory fix",
			snapshot: &IncidentSnapshot{
				IncidentID: "test-2",
				Pattern:    PatternOOMPressure,
				Resource: KubeResourceRef{
					Kind:      "Pod",
					Name:      "oom-pod",
					Namespace: "default",
				},
				Confidence: 0.9,
				LastErrorString: "OOMKilled",
			},
			evidence: &ColdEvidence{
				Logs: []LogEvidence{
					{ID: "log-1", Message: "OOMKilled", Time: time.Now()},
				},
				Metrics: []MetricEvidence{
					{ID: "metric-1", Message: "Memory usage: 95%", Time: time.Now()},
				},
			},
			wantError: false,
			checkPlan: func(t *testing.T, plan *RemediationPlan) {
				if plan == nil {
					t.Fatal("plan should not be nil")
				}
				// Should have at least one fix for OOM
				foundMemoryFix := false
				for _, fix := range plan.FixPlans {
					if fix.Type == "patch" && containsSubstring(fix.Description, "memory") {
						foundMemoryFix = true
						if fix.Risk == "" {
							t.Error("fix should have risk level")
						}
						if fix.Confidence <= 0 {
							t.Error("fix should have confidence > 0")
						}
						if fix.Preview == nil {
							t.Error("fix should have preview")
						}
						if fix.Rollback == nil {
							t.Error("fix should have rollback")
						}
						if fix.Guardrails == nil {
							t.Error("fix should have guardrails")
						}
					}
				}
				if !foundMemoryFix {
					t.Error("should have memory-related fix for OOM pattern")
				}
			},
		},
		{
			name: "No runbooks returns read-only action only",
			snapshot: &IncidentSnapshot{
				IncidentID: "test-3",
				Pattern:    "UNKNOWN_PATTERN",
				Resource: KubeResourceRef{
					Kind:      "Pod",
					Name:      "unknown-pod",
					Namespace: "default",
				},
			},
			evidence: nil,
			wantError: false,
			checkPlan: func(t *testing.T, plan *RemediationPlan) {
				if plan == nil {
					t.Fatal("plan should not be nil")
				}
				if plan.RecommendedAction == nil {
					t.Error("should have recommendedAction even without runbooks")
				}
				if len(plan.FixPlans) > 0 {
					t.Error("should not have fix plans for unknown pattern")
				}
			},
		},
		{
			name: "Nil snapshot returns error",
			snapshot: nil,
			evidence: nil,
			wantError: true,
			checkPlan: func(t *testing.T, plan *RemediationPlan) {
				if plan != nil {
					t.Error("plan should be nil on error")
				}
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			plan, err := engine.GenerateRemediation(context.Background(), tt.snapshot, tt.evidence)

			if tt.wantError {
				if err == nil {
					t.Error("expected error but got none")
				}
			} else {
				if err != nil {
					t.Fatalf("unexpected error: %v", err)
				}
			}

			if tt.checkPlan != nil {
				tt.checkPlan(t, plan)
			}
		})
	}
}

func TestRemediationEngine_hasSufficientEvidence(t *testing.T) {
	engine := NewRemediationEngine()

	tests := []struct {
		name      string
		snapshot  *IncidentSnapshot
		evidence  *ColdEvidence
		runbook   *Runbook
		want      bool
	}{
		{
			name: "Sufficient evidence with logs",
			snapshot: &IncidentSnapshot{
				Pattern: PatternOOMPressure,
			},
			evidence: &ColdEvidence{
				Logs: []LogEvidence{
					{ID: "log-1", Message: "OOMKilled"},
				},
			},
			runbook: &Runbook{
				Pattern: PatternOOMPressure,
				Preconditions: []Check{
					{
						Type:     CheckTypeLogPattern,
						Expected: "OOM",
						Operator: OpContains,
					},
				},
			},
			want: true,
		},
		{
			name: "Insufficient evidence - no logs",
			snapshot: &IncidentSnapshot{
				Pattern: PatternOOMPressure,
			},
			evidence: &ColdEvidence{
				Logs: []LogEvidence{},
			},
			runbook: &Runbook{
				Pattern: PatternOOMPressure,
				Preconditions: []Check{
					{
						Type:     CheckTypeLogPattern,
						Expected: "OOM",
						Operator: OpContains,
					},
				},
			},
			want: false,
		},
		{
			name: "Pattern mismatch",
			snapshot: &IncidentSnapshot{
				Pattern: PatternRestartStorm,
			},
			evidence: &ColdEvidence{},
			runbook: &Runbook{
				Pattern: PatternOOMPressure,
			},
			want: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := engine.hasSufficientEvidence(tt.snapshot, tt.evidence, tt.runbook)
			if got != tt.want {
				t.Errorf("hasSufficientEvidence() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestRemediationEngine_calculateConfidence(t *testing.T) {
	engine := NewRemediationEngine()

	tests := []struct {
		name     string
		snapshot *IncidentSnapshot
		evidence *ColdEvidence
		runbook  *Runbook
		wantMin  float64
		wantMax  float64
	}{
		{
			name: "High confidence with all evidence",
			snapshot: &IncidentSnapshot{
				Confidence: 0.9,
			},
			evidence: &ColdEvidence{
				Logs:    []LogEvidence{{ID: "log-1"}},
				Events:  []EventEvidence{{ID: "event-1"}},
				Metrics: []MetricEvidence{{ID: "metric-1"}},
			},
			runbook: &Runbook{
				SuccessRate: 0.9,
			},
			wantMin: 0.7,
			wantMax: 1.0,
		},
		{
			name: "Low confidence with minimal evidence",
			snapshot: &IncidentSnapshot{
				Confidence: 0.3,
			},
			evidence: &ColdEvidence{},
			runbook: &Runbook{
				SuccessRate: 0.5,
			},
			wantMin: 0.4,
			wantMax: 0.7,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := engine.calculateConfidence(tt.snapshot, tt.evidence, tt.runbook)
			if got < tt.wantMin || got > tt.wantMax {
				t.Errorf("calculateConfidence() = %v, want between %v and %v", got, tt.wantMin, tt.wantMax)
			}
			if got < 0 || got > 1.0 {
				t.Errorf("calculateConfidence() = %v, should be between 0 and 1.0", got)
			}
		})
	}
}

func TestRemediationEngine_generateFixPlans_LimitsToThree(t *testing.T) {
	engine := NewRemediationEngine()

	// Create a snapshot that matches multiple runbooks
	snapshot := &IncidentSnapshot{
		IncidentID: "test-limit",
		Pattern:    PatternRestartStorm,
		Resource: KubeResourceRef{
			Kind:      "Pod",
			Name:      "test-pod",
			Namespace: "default",
		},
		Confidence: 0.8,
	}

	evidence := &ColdEvidence{
		Logs: []LogEvidence{
			{ID: "log-1", Message: "Container restarted"},
		},
		Events: []EventEvidence{
			{ID: "event-1", Message: "Pod restarted"},
		},
	}

	plan, err := engine.GenerateRemediation(context.Background(), snapshot, evidence)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if len(plan.FixPlans) > 3 {
		t.Errorf("should have at most 3 fix plans, got %d", len(plan.FixPlans))
	}
}

func TestRemediationEngine_FixPlan_RequiredFields(t *testing.T) {
	engine := NewRemediationEngine()

	snapshot := &IncidentSnapshot{
		IncidentID: "test-fields",
		Pattern:    PatternOOMPressure,
		Resource: KubeResourceRef{
			Kind:      "Pod",
			Name:      "oom-pod",
			Namespace: "default",
		},
		Confidence: 0.9,
		LastErrorString: "OOMKilled",
	}

	evidence := &ColdEvidence{
		Logs: []LogEvidence{
			{ID: "log-1", Message: "OOMKilled"},
		},
	}

	plan, err := engine.GenerateRemediation(context.Background(), snapshot, evidence)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	for _, fix := range plan.FixPlans {
		// Check all required fields
		if fix.ID == "" {
			t.Error("fix.ID should not be empty")
		}
		if fix.Title == "" {
			t.Error("fix.Title should not be empty")
		}
		if fix.Description == "" {
			t.Error("fix.Description should not be empty")
		}
		if fix.Type == "" {
			t.Error("fix.Type should not be empty")
		}
		if fix.Risk == "" {
			t.Error("fix.Risk should not be empty")
		}
		if fix.Preview == nil {
			t.Error("fix.Preview should not be nil")
		} else {
			if len(fix.Preview.KubectlCommands) == 0 {
				t.Error("fix.Preview.KubectlCommands should not be empty")
			}
		}
		if fix.Rollback == nil {
			t.Error("fix.Rollback should not be nil")
		}
		if fix.Guardrails == nil {
			t.Error("fix.Guardrails should not be nil")
		} else {
			if fix.Guardrails.ConfidenceMin <= 0 {
				t.Error("fix.Guardrails.ConfidenceMin should be > 0")
			}
		}
		if fix.Confidence <= 0 {
			t.Error("fix.Confidence should be > 0")
		}
		if fix.WhyThisFix == "" {
			t.Error("fix.WhyThisFix should not be empty")
		}
	}
}

