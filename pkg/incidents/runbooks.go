// Copyright 2025 KubeGraf Contributors
// SPDX-License-Identifier: Apache-2.0

package incidents

import (
	"context"
	"fmt"
	"sync"
	"time"
)

// Runbook defines an automated remediation procedure
type Runbook struct {
	// ID uniquely identifies this runbook
	ID string `json:"id"`

	// Name is the human-readable name
	Name string `json:"name"`

	// Description explains what this runbook does
	Description string `json:"description"`

	// Pattern is the failure pattern this runbook addresses
	Pattern FailurePattern `json:"pattern"`

	// Preconditions that must be met before execution
	Preconditions []Check `json:"preconditions"`

	// Action to perform
	Action RunbookAction `json:"action"`

	// Verification checks after action
	Verification []Check `json:"verification"`

	// Rollback action if verification fails
	Rollback *RunbookAction `json:"rollback,omitempty"`

	// Risk level of this runbook
	Risk RunbookRisk `json:"risk"`

	// AutonomyLevel defines when this can run automatically
	AutonomyLevel AutonomyLevel `json:"autonomyLevel"`

	// BlastRadius indicates potential impact scope
	BlastRadius int `json:"blastRadius"`

	// SuccessRate from historical executions (0.0-1.0)
	SuccessRate float64 `json:"successRate"`

	// ExecutionCount how many times this has been executed
	ExecutionCount int `json:"executionCount"`

	// LastExecuted when this was last run
	LastExecuted *time.Time `json:"lastExecuted,omitempty"`

	// Enabled whether this runbook is active
	Enabled bool `json:"enabled"`

	// Tags for categorization
	Tags []string `json:"tags,omitempty"`
}

// Check represents a condition to verify
type Check struct {
	// ID uniquely identifies this check
	ID string `json:"id"`

	// Name of the check
	Name string `json:"name"`

	// Type of check
	Type CheckType `json:"type"`

	// Target to check
	Target string `json:"target"`

	// Operator for comparison
	Operator CheckOperator `json:"operator"`

	// Expected value
	Expected interface{} `json:"expected"`

	// Timeout for this check
	Timeout time.Duration `json:"timeout"`

	// Description explains the check
	Description string `json:"description"`
}

// CheckType defines the type of check
type CheckType string

const (
	CheckTypePodStatus        CheckType = "pod_status"
	CheckTypeContainerStatus  CheckType = "container_status"
	CheckTypeDeploymentStatus CheckType = "deployment_status"
	CheckTypeEndpointCount    CheckType = "endpoint_count"
	CheckTypeMetricValue      CheckType = "metric_value"
	CheckTypeResourceExists   CheckType = "resource_exists"
	CheckTypeEventAbsent      CheckType = "event_absent"
	CheckTypeLogPattern       CheckType = "log_pattern"
	CheckTypeHTTPProbe        CheckType = "http_probe"
)

// CheckOperator defines comparison operators
type CheckOperator string

const (
	OpEquals       CheckOperator = "equals"
	OpNotEquals    CheckOperator = "not_equals"
	OpGreaterThan  CheckOperator = "greater_than"
	OpLessThan     CheckOperator = "less_than"
	OpContains     CheckOperator = "contains"
	OpNotContains  CheckOperator = "not_contains"
	OpExists       CheckOperator = "exists"
	OpNotExists    CheckOperator = "not_exists"
)

// RunbookAction defines an action to perform
type RunbookAction struct {
	// Type of action
	Type FixType `json:"type"`

	// Target resource
	Target KubeResourceRef `json:"target"`

	// Parameters for the action
	Parameters map[string]interface{} `json:"parameters,omitempty"`

	// DryRunCommand for preview
	DryRunCommand string `json:"dryRunCommand"`

	// ApplyCommand for execution
	ApplyCommand string `json:"applyCommand"`

	// RollbackCommand to undo
	RollbackCommand string `json:"rollbackCommand,omitempty"`

	// Timeout for execution
	Timeout time.Duration `json:"timeout"`

	// Description of what this action does
	Description string `json:"description"`
}

// RunbookRisk defines the risk level
type RunbookRisk string

const (
	RiskRunbookLow      RunbookRisk = "low"
	RiskRunbookMedium   RunbookRisk = "medium"
	RiskRunbookHigh     RunbookRisk = "high"
	RiskRunbookCritical RunbookRisk = "critical"
)

// AutonomyLevel defines when a runbook can run automatically
type AutonomyLevel int

const (
	// AutonomyObserve - only observe and collect data
	AutonomyObserve AutonomyLevel = 0
	// AutonomyRecommend - recommend actions to user
	AutonomyRecommend AutonomyLevel = 1
	// AutonomyPropose - propose fixes with preview
	AutonomyPropose AutonomyLevel = 2
	// AutonomyAutoExecute - auto-execute low-risk fixes
	AutonomyAutoExecute AutonomyLevel = 3
)

// String returns the string representation of AutonomyLevel
func (a AutonomyLevel) String() string {
	switch a {
	case AutonomyObserve:
		return "observe"
	case AutonomyRecommend:
		return "recommend"
	case AutonomyPropose:
		return "propose"
	case AutonomyAutoExecute:
		return "auto_execute"
	default:
		return "unknown"
	}
}

// RunbookExecution represents a single execution of a runbook
type RunbookExecution struct {
	// ID of this execution
	ID string `json:"id"`

	// RunbookID of the executed runbook
	RunbookID string `json:"runbookId"`

	// IncidentID this execution is for
	IncidentID string `json:"incidentId"`

	// StartedAt when execution started
	StartedAt time.Time `json:"startedAt"`

	// CompletedAt when execution completed
	CompletedAt *time.Time `json:"completedAt,omitempty"`

	// Status of execution
	Status ExecutionStatus `json:"status"`

	// InitiatedBy who started this (user/auto/agent)
	InitiatedBy string `json:"initiatedBy"`

	// DryRun if this was a dry run
	DryRun bool `json:"dryRun"`

	// PreconditionResults results of precondition checks
	PreconditionResults []CheckResult `json:"preconditionResults,omitempty"`

	// ActionResult result of the main action
	ActionResult *ActionResult `json:"actionResult,omitempty"`

	// VerificationResults results of verification checks
	VerificationResults []CheckResult `json:"verificationResults,omitempty"`

	// RollbackResult if rollback was executed
	RollbackResult *ActionResult `json:"rollbackResult,omitempty"`

	// Error message if failed
	Error string `json:"error,omitempty"`
}

// ExecutionStatus represents the status of a runbook execution
type ExecutionStatus string

const (
	ExecutionPending      ExecutionStatus = "pending"
	ExecutionRunning      ExecutionStatus = "running"
	ExecutionCompleted    ExecutionStatus = "completed"
	ExecutionFailed       ExecutionStatus = "failed"
	ExecutionRolledBack   ExecutionStatus = "rolled_back"
	ExecutionCancelled    ExecutionStatus = "cancelled"
)

// CheckResult is the result of a check execution
type CheckResult struct {
	Check   Check       `json:"check"`
	Passed  bool        `json:"passed"`
	Actual  interface{} `json:"actual"`
	Message string      `json:"message"`
	Time    time.Time   `json:"time"`
}

// ActionResult is the result of an action execution
type ActionResult struct {
	Action    RunbookAction `json:"action"`
	Success   bool          `json:"success"`
	Output    string        `json:"output"`
	Changes   []string      `json:"changes,omitempty"`
	Error     string        `json:"error,omitempty"`
	StartTime time.Time     `json:"startTime"`
	EndTime   time.Time     `json:"endTime"`
}

// RunbookRegistry manages all registered runbooks
type RunbookRegistry struct {
	runbooks map[string]*Runbook
	mu       sync.RWMutex
}

// NewRunbookRegistry creates a new runbook registry with default runbooks
func NewRunbookRegistry() *RunbookRegistry {
	registry := &RunbookRegistry{
		runbooks: make(map[string]*Runbook),
	}

	// Register default runbooks
	registry.registerDefaultRunbooks()

	return registry
}

// registerDefaultRunbooks registers built-in runbooks
func (r *RunbookRegistry) registerDefaultRunbooks() {
	// Restart Pod runbook (low risk, can auto-execute)
	r.Register(&Runbook{
		ID:          "restart-pod",
		Name:        "Restart Pod",
		Description: "Delete pod to trigger recreation by controller",
		Pattern:     PatternRestartStorm,
		Preconditions: []Check{
			{
				ID:       "check-controller",
				Name:     "Pod has controller",
				Type:     CheckTypeResourceExists,
				Target:   "ownerReferences",
				Operator: OpExists,
				Description: "Ensure pod is managed by a controller",
			},
		},
		Action: RunbookAction{
			Type:        FixTypeRestart,
			Description: "Delete pod to trigger recreation",
			DryRunCommand: "kubectl delete pod {{.Name}} -n {{.Namespace}} --dry-run=client",
			ApplyCommand:  "kubectl delete pod {{.Name}} -n {{.Namespace}}",
			Timeout:       60 * time.Second,
		},
		Verification: []Check{
			{
				ID:       "verify-pod-running",
				Name:     "New pod is running",
				Type:     CheckTypePodStatus,
				Target:   "status.phase",
				Operator: OpEquals,
				Expected: "Running",
				Timeout:  120 * time.Second,
				Description: "Verify replacement pod is running",
			},
		},
		Rollback: &RunbookAction{
			Type:            FixTypeRestart,
			Description:     "No rollback needed - controller will recreate pod if needed",
			RollbackCommand: "echo 'Pod restart is safe - Kubernetes controller manages recreation'",
		},
		Risk:          RiskRunbookLow,
		AutonomyLevel: AutonomyAutoExecute,
		BlastRadius:   1,
		SuccessRate:   0.95,
		Enabled:       true,
		Tags:          []string{"pod", "restart", "safe"},
	})

	// Scale Up Deployment runbook (low risk)
	r.Register(&Runbook{
		ID:          "scale-up-deployment",
		Name:        "Scale Up Deployment",
		Description: "Increase deployment replicas to improve availability",
		Pattern:     PatternNoReadyEndpoints,
		Preconditions: []Check{
			{
				ID:       "check-current-replicas",
				Name:     "Check current replicas",
				Type:     CheckTypeDeploymentStatus,
				Target:   "spec.replicas",
				Operator: OpLessThan,
				Expected: 10,
				Description: "Ensure we don't scale beyond reasonable limits",
			},
		},
		Action: RunbookAction{
			Type:        FixTypeScale,
			Description: "Increase replica count by 1",
			Parameters:  map[string]interface{}{"increment": 1},
			DryRunCommand: "kubectl scale deployment {{.Name}} -n {{.Namespace}} --replicas={{.NewReplicas}} --dry-run=client",
			ApplyCommand:  "kubectl scale deployment {{.Name}} -n {{.Namespace}} --replicas={{.NewReplicas}}",
			Timeout:       60 * time.Second,
		},
		Verification: []Check{
			{
				ID:       "verify-endpoints",
				Name:     "Service has ready endpoints",
				Type:     CheckTypeEndpointCount,
				Operator: OpGreaterThan,
				Expected: 0,
				Timeout:  120 * time.Second,
				Description: "Verify service has at least one ready endpoint",
			},
		},
		Rollback: &RunbookAction{
			Type:            FixTypeScale,
			Description:     "Scale back to original replica count",
			RollbackCommand: "kubectl scale deployment {{.Name}} -n {{.Namespace}} --replicas={{.OriginalReplicas}}",
		},
		Risk:          RiskRunbookLow,
		AutonomyLevel: AutonomyAutoExecute,
		BlastRadius:   1,
		SuccessRate:   0.90,
		Enabled:       true,
		Tags:          []string{"deployment", "scale", "availability"},
	})

	// Increase Memory Limit runbook (medium risk)
	r.Register(&Runbook{
		ID:          "increase-memory-limit",
		Name:        "Increase Memory Limit",
		Description: "Increase container memory limit to prevent OOM",
		Pattern:     PatternOOMPressure,
		Preconditions: []Check{
			{
				ID:       "check-current-limit",
				Name:     "Memory limit exists",
				Type:     CheckTypeResourceExists,
				Target:   "spec.containers[0].resources.limits.memory",
				Operator: OpExists,
				Description: "Ensure memory limit is currently set",
			},
		},
		Action: RunbookAction{
			Type:        FixTypePatch,
			Description: "Increase memory limit by 50%",
			Parameters:  map[string]interface{}{"increase_percent": 50},
			DryRunCommand: "kubectl patch deployment {{.Name}} -n {{.Namespace}} --type=json -p='[{\"op\":\"replace\",\"path\":\"/spec/template/spec/containers/0/resources/limits/memory\",\"value\":\"{{.NewLimit}}\"}]' --dry-run=client",
			ApplyCommand:  "kubectl patch deployment {{.Name}} -n {{.Namespace}} --type=json -p='[{\"op\":\"replace\",\"path\":\"/spec/template/spec/containers/0/resources/limits/memory\",\"value\":\"{{.NewLimit}}\"}]'",
			Timeout:       120 * time.Second,
		},
		Verification: []Check{
			{
				ID:       "verify-no-oom",
				Name:     "No OOM events",
				Type:     CheckTypeEventAbsent,
				Target:   "OOMKilled",
				Timeout:  300 * time.Second,
				Description: "Verify no new OOM events after increase",
			},
		},
		Rollback: &RunbookAction{
			Type:            FixTypePatch,
			Description:     "Restore original memory limit",
			RollbackCommand: "kubectl patch deployment {{.Name}} -n {{.Namespace}} --type=json -p='[{\"op\":\"replace\",\"path\":\"/spec/template/spec/containers/0/resources/limits/memory\",\"value\":\"{{.OriginalLimit}}\"}]'",
		},
		Risk:          RiskRunbookMedium,
		AutonomyLevel: AutonomyRecommend,
		BlastRadius:   1,
		SuccessRate:   0.85,
		Enabled:       true,
		Tags:          []string{"memory", "oom", "resources"},
	})

	// Rollback Deployment runbook (medium risk)
	r.Register(&Runbook{
		ID:          "rollback-deployment",
		Name:        "Rollback Deployment",
		Description: "Rollback deployment to previous revision",
		Pattern:     PatternCrashLoop,
		Preconditions: []Check{
			{
				ID:       "check-revision-history",
				Name:     "Previous revision exists",
				Type:     CheckTypeResourceExists,
				Target:   "metadata.annotations.deployment.kubernetes.io/revision",
				Operator: OpGreaterThan,
				Expected: 1,
				Description: "Ensure there is a previous revision to rollback to",
			},
		},
		Action: RunbookAction{
			Type:        FixTypeRollback,
			Description: "Rollback to previous revision",
			DryRunCommand: "kubectl rollout undo deployment {{.Name}} -n {{.Namespace}} --dry-run=client",
			ApplyCommand:  "kubectl rollout undo deployment {{.Name}} -n {{.Namespace}}",
			Timeout:       180 * time.Second,
		},
		Verification: []Check{
			{
				ID:       "verify-rollout-complete",
				Name:     "Rollout completed",
				Type:     CheckTypeDeploymentStatus,
				Target:   "status.conditions",
				Operator: OpContains,
				Expected: "Progressing=True",
				Timeout:  300 * time.Second,
				Description: "Verify rollback completed successfully",
			},
			{
				ID:       "verify-pods-ready",
				Name:     "Pods are ready",
				Type:     CheckTypePodStatus,
				Target:   "status.phase",
				Operator: OpEquals,
				Expected: "Running",
				Timeout:  300 * time.Second,
				Description: "Verify pods are running after rollback",
			},
		},
		Risk:          RiskRunbookMedium,
		AutonomyLevel: AutonomyRecommend,
		BlastRadius:   1,
		SuccessRate:   0.90,
		Enabled:       true,
		Tags:          []string{"deployment", "rollback", "crashloop"},
	})

	// Rolling Restart runbook (low risk)
	r.Register(&Runbook{
		ID:          "rolling-restart",
		Name:        "Rolling Restart Deployment",
		Description: "Trigger a rolling restart of all pods",
		Pattern:     PatternRestartStorm,
		Preconditions: []Check{
			{
				ID:       "check-deployment-exists",
				Name:     "Deployment exists",
				Type:     CheckTypeResourceExists,
				Operator: OpExists,
				Description: "Ensure deployment exists",
			},
		},
		Action: RunbookAction{
			Type:        FixTypeRestart,
			Description: "Trigger rolling restart",
			DryRunCommand: "kubectl rollout restart deployment {{.Name}} -n {{.Namespace}} --dry-run=client",
			ApplyCommand:  "kubectl rollout restart deployment {{.Name}} -n {{.Namespace}}",
			Timeout:       300 * time.Second,
		},
		Verification: []Check{
			{
				ID:       "verify-rollout-complete",
				Name:     "Rollout completed",
				Type:     CheckTypeDeploymentStatus,
				Target:   "status.updatedReplicas",
				Operator: OpEquals,
				Expected: "{{.DesiredReplicas}}",
				Timeout:  300 * time.Second,
				Description: "Verify all pods have been restarted",
			},
		},
		Rollback: &RunbookAction{
			Type:            FixTypeRestart,
			Description:     "No rollback needed - rolling restart is inherently safe",
			RollbackCommand: "echo 'Rolling restart is safe - deployment manages pod recreation'",
		},
		Risk:          RiskRunbookLow,
		AutonomyLevel: AutonomyAutoExecute,
		BlastRadius:   1,
		SuccessRate:   0.95,
		Enabled:       true,
		Tags:          []string{"deployment", "restart", "rolling"},
	})

	// RESTART_STORM runbooks (as specified in requirements)
	r.registerRestartStormRunbooks()

	// OOM runbooks
	r.registerOOMRunbooks()

	// IMAGE_PULL runbooks
	r.registerImagePullRunbooks()

	// PENDING/UNSCHEDULABLE runbooks
	r.registerPendingRunbooks()
}

// registerRestartStormRunbooks registers runbooks for RESTART_STORM pattern
func (r *RunbookRegistry) registerRestartStormRunbooks() {
	// Read-only action: fetch logs, describe, events
	// This is handled by RecommendedAction in remediation engine

	// Fix1: Rollout undo deployment (if change detected)
	r.Register(&Runbook{
		ID:          "restart-storm-rollback",
		Name:        "Rollback Deployment (if recent change detected)",
		Description: "Rollback deployment to previous revision if a recent change may have caused the restart storm",
		Pattern:     PatternRestartStorm,
		Preconditions: []Check{
			{
				ID:       "check-recent-change",
				Name:     "Recent change detected",
				Type:     CheckTypeResourceExists,
				Target:   "metadata.annotations.deployment.kubernetes.io/revision",
				Operator: OpGreaterThan,
				Expected: 1,
				Description: "Only suggest if deployment has revision history",
			},
		},
		Action: RunbookAction{
			Type:        FixTypeRollback,
			Description: "Rollback to previous deployment revision",
			DryRunCommand: "kubectl rollout undo deployment {{.Name}} -n {{.Namespace}} --dry-run=client",
			ApplyCommand:  "kubectl rollout undo deployment {{.Name}} -n {{.Namespace}}",
			Timeout:       180 * time.Second,
		},
		Verification: []Check{
			{
				ID:       "verify-restart-rate-decreased",
				Name:     "Restart rate decreased",
				Type:     CheckTypeMetricValue,
				Target:   "restart_rate_5m",
				Operator: OpLessThan,
				Expected: 0.1, // Less than 0.1 restarts per minute
				Timeout:  300 * time.Second,
				Description: "Verify restart rate has decreased after rollback",
			},
		},
		Rollback: &RunbookAction{
			Type:            FixTypeRollback,
			Description:     "Rollback to current revision",
			RollbackCommand: "kubectl rollout undo deployment {{.Name}} -n {{.Namespace}}",
		},
		Risk:          RiskRunbookMedium,
		AutonomyLevel: AutonomyRecommend,
		BlastRadius:   1,
		SuccessRate:   0.80,
		Enabled:       true,
		Tags:          []string{"restart_storm", "rollback", "deployment"},
	})

	// Fix2: Increase memory limit by +25% (ONLY if OOM evidence)
	r.Register(&Runbook{
		ID:          "restart-storm-increase-memory",
		Name:        "Increase Memory Limit (+25%)",
		Description: "Increase container memory limit by 25% if OOM events or memory pressure evidence exists",
		Pattern:     PatternRestartStorm,
		Preconditions: []Check{
			{
				ID:       "check-oom-evidence",
				Name:     "OOM evidence present",
				Type:     CheckTypeEventAbsent,
				Target:   "OOMKilled",
				Operator: OpNotExists, // Inverted: we want OOM events to exist
				Description: "Only suggest if OOM events or memory metrics indicate pressure",
			},
			{
				ID:       "check-memory-limit-exists",
				Name:     "Memory limit exists",
				Type:     CheckTypeResourceExists,
				Target:   "spec.containers[0].resources.limits.memory",
				Operator: OpExists,
				Description: "Ensure memory limit is currently set",
			},
		},
		Action: RunbookAction{
			Type:        FixTypePatch,
			Description: "Increase memory limit by 25%",
			Parameters:  map[string]interface{}{"increase_percent": 25},
			DryRunCommand: "kubectl patch deployment {{.Name}} -n {{.Namespace}} --type=json -p='[{\"op\":\"replace\",\"path\":\"/spec/template/spec/containers/0/resources/limits/memory\",\"value\":\"{{.NewLimit}}\"}]' --dry-run=client",
			ApplyCommand:  "kubectl patch deployment {{.Name}} -n {{.Namespace}} --type=json -p='[{\"op\":\"replace\",\"path\":\"/spec/template/spec/containers/0/resources/limits/memory\",\"value\":\"{{.NewLimit}}\"}]'",
			Timeout:       120 * time.Second,
		},
		Verification: []Check{
			{
				ID:       "verify-no-oom-after-increase",
				Name:     "No OOM events after increase",
				Type:     CheckTypeEventAbsent,
				Target:   "OOMKilled",
				Timeout:  300 * time.Second,
				Description: "Verify no new OOM events after memory increase",
			},
		},
		Rollback: &RunbookAction{
			Type:            FixTypePatch,
			Description:     "Restore original memory limit",
			RollbackCommand: "kubectl patch deployment {{.Name}} -n {{.Namespace}} --type=json -p='[{\"op\":\"replace\",\"path\":\"/spec/template/spec/containers/0/resources/limits/memory\",\"value\":\"{{.OriginalLimit}}\"}]'",
		},
		Risk:          RiskRunbookMedium,
		AutonomyLevel: AutonomyRecommend,
		BlastRadius:   1,
		SuccessRate:   0.85,
		Enabled:       true,
		Tags:          []string{"restart_storm", "memory", "oom"},
	})

	// Fix3: Relax liveness probe thresholds (ONLY if probe failures evidenced)
	r.Register(&Runbook{
		ID:          "restart-storm-relax-probe",
		Name:        "Relax Liveness Probe Thresholds",
		Description: "Increase liveness probe timeout/period if probe failures are causing restarts",
		Pattern:     PatternRestartStorm,
		Preconditions: []Check{
			{
				ID:       "check-probe-failure-evidence",
				Name:     "Probe failure evidence",
				Type:     CheckTypeLogPattern,
				Target:   "logs",
				Operator: OpContains,
				Expected: "liveness probe failed",
				Description: "Only suggest if liveness probe failures are evidenced",
			},
		},
		Action: RunbookAction{
			Type:        FixTypePatch,
			Description: "Increase liveness probe timeout and period",
			Parameters:  map[string]interface{}{"timeout_seconds": 5, "period_seconds": 30},
			DryRunCommand: "kubectl patch deployment {{.Name}} -n {{.Namespace}} --type=json -p='[{\"op\":\"replace\",\"path\":\"/spec/template/spec/containers/0/livenessProbe/timeoutSeconds\",\"value\":5},{\"op\":\"replace\",\"path\":\"/spec/template/spec/containers/0/livenessProbe/periodSeconds\",\"value\":30}]' --dry-run=client",
			ApplyCommand:  "kubectl patch deployment {{.Name}} -n {{.Namespace}} --type=json -p='[{\"op\":\"replace\",\"path\":\"/spec/template/spec/containers/0/livenessProbe/timeoutSeconds\",\"value\":5},{\"op\":\"replace\",\"path\":\"/spec/template/spec/containers/0/livenessProbe/periodSeconds\",\"value\":30}]'",
			Timeout:       120 * time.Second,
		},
		Verification: []Check{
			{
				ID:       "verify-probe-success",
				Name:     "Liveness probe succeeding",
				Type:     CheckTypePodStatus,
				Target:   "status.conditions",
				Operator: OpContains,
				Expected: "Ready=True",
				Timeout:  300 * time.Second,
				Description: "Verify pods are passing liveness probes",
			},
		},
		Rollback: &RunbookAction{
			Type:            FixTypePatch,
			Description:     "Restore original probe settings",
			RollbackCommand: "kubectl patch deployment {{.Name}} -n {{.Namespace}} --type=json -p='[{\"op\":\"replace\",\"path\":\"/spec/template/spec/containers/0/livenessProbe/timeoutSeconds\",\"value\":{{.OriginalTimeout}}},{\"op\":\"replace\",\"path\":\"/spec/template/spec/containers/0/livenessProbe/periodSeconds\",\"value\":{{.OriginalPeriod}}}]'",
		},
		Risk:          RiskRunbookMedium,
		AutonomyLevel: AutonomyRecommend,
		BlastRadius:   1,
		SuccessRate:   0.75,
		Enabled:       true,
		Tags:          []string{"restart_storm", "probe", "liveness"},
	})
}

// registerOOMRunbooks registers runbooks for OOM pattern
func (r *RunbookRegistry) registerOOMRunbooks() {
	// Fix: Increase memory limit, reduce concurrency hints, set request/limit ratio
	r.Register(&Runbook{
		ID:          "oom-increase-memory-limit",
		Name:        "Increase Memory Limit",
		Description: "Increase container memory limit to prevent OOM kills",
		Pattern:     PatternOOMPressure,
		Preconditions: []Check{
			{
				ID:       "check-memory-limit-exists",
				Name:     "Memory limit exists",
				Type:     CheckTypeResourceExists,
				Target:   "spec.containers[0].resources.limits.memory",
				Operator: OpExists,
				Description: "Ensure memory limit is currently set",
			},
		},
		Action: RunbookAction{
			Type:        FixTypePatch,
			Description: "Increase memory limit by 50% and set request to 80% of limit",
			Parameters:  map[string]interface{}{"increase_percent": 50, "request_ratio": 0.8},
			DryRunCommand: "kubectl patch deployment {{.Name}} -n {{.Namespace}} --type=json -p='[{\"op\":\"replace\",\"path\":\"/spec/template/spec/containers/0/resources/limits/memory\",\"value\":\"{{.NewLimit}}\"},{\"op\":\"replace\",\"path\":\"/spec/template/spec/containers/0/resources/requests/memory\",\"value\":\"{{.NewRequest}}\"}]' --dry-run=client",
			ApplyCommand:  "kubectl patch deployment {{.Name}} -n {{.Namespace}} --type=json -p='[{\"op\":\"replace\",\"path\":\"/spec/template/spec/containers/0/resources/limits/memory\",\"value\":\"{{.NewLimit}}\"},{\"op\":\"replace\",\"path\":\"/spec/template/spec/containers/0/resources/requests/memory\",\"value\":\"{{.NewRequest}}\"}]'",
			Timeout:       120 * time.Second,
		},
		Verification: []Check{
			{
				ID:       "verify-no-oom",
				Name:     "No OOM events",
				Type:     CheckTypeEventAbsent,
				Target:   "OOMKilled",
				Timeout:  300 * time.Second,
				Description: "Verify no new OOM events after increase",
			},
		},
		Rollback: &RunbookAction{
			Type:            FixTypePatch,
			Description:     "Restore original memory limits",
			RollbackCommand: "kubectl patch deployment {{.Name}} -n {{.Namespace}} --type=json -p='[{\"op\":\"replace\",\"path\":\"/spec/template/spec/containers/0/resources/limits/memory\",\"value\":\"{{.OriginalLimit}}\"},{\"op\":\"replace\",\"path\":\"/spec/template/spec/containers/0/resources/requests/memory\",\"value\":\"{{.OriginalRequest}}\"}]'",
		},
		Risk:          RiskRunbookMedium,
		AutonomyLevel: AutonomyRecommend,
		BlastRadius:   1,
		SuccessRate:   0.85,
		Enabled:       true,
		Tags:          []string{"oom", "memory", "resources"},
	})
}

// registerImagePullRunbooks registers runbooks for IMAGE_PULL pattern
func (r *RunbookRegistry) registerImagePullRunbooks() {
	// Fix: Validate image ref, check secret, pull policy, registry auth
	r.Register(&Runbook{
		ID:          "image-pull-validate-and-fix",
		Name:        "Validate Image Configuration",
		Description: "Validate image reference, check pull secrets, verify pull policy and registry authentication",
		Pattern:     PatternImagePullFailure,
		Preconditions: []Check{
			{
				ID:       "check-image-pull-error",
				Name:     "Image pull error present",
				Type:     CheckTypeLogPattern,
				Target:   "events",
				Operator: OpContains,
				Expected: "ErrImagePull",
				Description: "Only suggest if image pull errors are present",
			},
		},
		Action: RunbookAction{
			Type:        FixTypePatch,
			Description: "Validate and fix image pull configuration",
			Parameters:  map[string]interface{}{"validate_image": true, "check_secrets": true, "verify_pull_policy": true},
			DryRunCommand: "kubectl get pod {{.Name}} -n {{.Namespace}} -o jsonpath='{.spec.containers[0].image}' && kubectl get secret -n {{.Namespace}}",
			ApplyCommand:  "# Manual fix required: validate image reference, check imagePullSecrets, verify imagePullPolicy",
			Timeout:       60 * time.Second,
		},
		Verification: []Check{
			{
				ID:       "verify-image-pulled",
				Name:     "Image pulled successfully",
				Type:     CheckTypePodStatus,
				Target:   "status.containerStatuses[0].imageID",
				Operator: OpExists,
				Timeout:  300 * time.Second,
				Description: "Verify image was pulled successfully",
			},
		},
		Risk:          RiskRunbookLow,
		AutonomyLevel: AutonomyRecommend,
		BlastRadius:   1,
		SuccessRate:   0.70, // Lower success rate as this often requires manual intervention
		Enabled:       true,
		Tags:          []string{"image_pull", "config", "validation"},
	})
}

// registerPendingRunbooks registers runbooks for PENDING/UNSCHEDULABLE pattern
func (r *RunbookRegistry) registerPendingRunbooks() {
	// Fix: Show scheduling reasons, suggest tolerations/node selector adjustment
	r.Register(&Runbook{
		ID:          "pending-scheduling-fix",
		Name:        "Fix Pod Scheduling",
		Description: "Show scheduling reasons and suggest tolerations or node selector adjustments",
		Pattern:     PatternUnschedulable,
		Preconditions: []Check{
			{
				ID:       "check-pod-pending",
				Name:     "Pod is pending",
				Type:     CheckTypePodStatus,
				Target:   "status.phase",
				Operator: OpEquals,
				Expected: "Pending",
				Description: "Only suggest if pod is in Pending state",
			},
		},
		Action: RunbookAction{
			Type:        FixTypePatch,
			Description: "Add tolerations or adjust node selectors based on scheduling events",
			Parameters:  map[string]interface{}{"show_reasons": true, "suggest_tolerations": true},
			DryRunCommand: "kubectl describe pod {{.Name}} -n {{.Namespace}} | grep -A 10 Events",
			ApplyCommand:  "# Manual fix: Add tolerations or adjust node selectors based on scheduling events",
			Timeout:       60 * time.Second,
		},
		Verification: []Check{
			{
				ID:       "verify-pod-scheduled",
				Name:     "Pod is scheduled",
				Type:     CheckTypePodStatus,
				Target:   "status.phase",
				Operator: OpNotEquals,
				Expected: "Pending",
				Timeout:  300 * time.Second,
				Description: "Verify pod has been scheduled",
			},
		},
		Risk:          RiskRunbookLow,
		AutonomyLevel: AutonomyRecommend,
		BlastRadius:   1,
		SuccessRate:   0.75,
		Enabled:       true,
		Tags:          []string{"pending", "scheduling", "tolerations"},
	})
}

// Register adds a runbook to the registry
func (r *RunbookRegistry) Register(runbook *Runbook) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.runbooks[runbook.ID] = runbook
}

// Get retrieves a runbook by ID
func (r *RunbookRegistry) Get(id string) *Runbook {
	r.mu.RLock()
	defer r.mu.RUnlock()
	return r.runbooks[id]
}

// GetByPattern returns all runbooks for a pattern
func (r *RunbookRegistry) GetByPattern(pattern FailurePattern) []*Runbook {
	r.mu.RLock()
	defer r.mu.RUnlock()

	var result []*Runbook
	for _, rb := range r.runbooks {
		if rb.Pattern == pattern && rb.Enabled {
			result = append(result, rb)
		}
	}
	return result
}

// GetAll returns all registered runbooks
func (r *RunbookRegistry) GetAll() []*Runbook {
	r.mu.RLock()
	defer r.mu.RUnlock()

	result := make([]*Runbook, 0, len(r.runbooks))
	for _, rb := range r.runbooks {
		result = append(result, rb)
	}
	return result
}

// GetEligibleForAuto returns runbooks eligible for auto-execution
func (r *RunbookRegistry) GetEligibleForAuto() []*Runbook {
	r.mu.RLock()
	defer r.mu.RUnlock()

	var result []*Runbook
	for _, rb := range r.runbooks {
		if rb.Enabled && rb.AutonomyLevel >= AutonomyAutoExecute &&
			rb.Risk == RiskRunbookLow && rb.SuccessRate >= 0.9 {
			result = append(result, rb)
		}
	}
	return result
}

// CanAutoExecute checks if a runbook can be auto-executed for an incident
func (r *RunbookRegistry) CanAutoExecute(runbook *Runbook, incident *Incident, confidence float64) bool {
	// Must be enabled
	if !runbook.Enabled {
		return false
	}

	// Must have auto-execute autonomy level
	if runbook.AutonomyLevel < AutonomyAutoExecute {
		return false
	}

	// Must be low risk
	if runbook.Risk != RiskRunbookLow {
		return false
	}

	// Must have high confidence
	if confidence < 0.9 {
		return false
	}

	// Must have high success rate
	if runbook.SuccessRate < 0.9 {
		return false
	}

	// Must have rollback defined
	if runbook.Rollback == nil {
		return false
	}

	return true
}

// RunbookExecutor executes runbooks
type RunbookExecutor struct {
	registry    *RunbookRegistry
	kubeClient  KubeFixExecutor
	executions  map[string]*RunbookExecution
	mu          sync.RWMutex
}

// NewRunbookExecutor creates a new runbook executor
func NewRunbookExecutor(registry *RunbookRegistry, kubeClient KubeFixExecutor) *RunbookExecutor {
	return &RunbookExecutor{
		registry:   registry,
		kubeClient: kubeClient,
		executions: make(map[string]*RunbookExecution),
	}
}

// Execute runs a runbook for an incident
func (e *RunbookExecutor) Execute(ctx context.Context, runbookID string, incident *Incident, dryRun bool, initiatedBy string) (*RunbookExecution, error) {
	runbook := e.registry.Get(runbookID)
	if runbook == nil {
		return nil, fmt.Errorf("runbook not found: %s", runbookID)
	}

	execution := &RunbookExecution{
		ID:          fmt.Sprintf("exec-%s-%d", runbookID, time.Now().UnixNano()),
		RunbookID:   runbookID,
		IncidentID:  incident.ID,
		StartedAt:   time.Now(),
		Status:      ExecutionPending,
		InitiatedBy: initiatedBy,
		DryRun:      dryRun,
	}

	e.mu.Lock()
	e.executions[execution.ID] = execution
	e.mu.Unlock()

	// Run in goroutine
	go e.runExecution(ctx, execution, runbook, incident)

	return execution, nil
}

// runExecution performs the actual execution
func (e *RunbookExecutor) runExecution(ctx context.Context, execution *RunbookExecution, runbook *Runbook, incident *Incident) {
	execution.Status = ExecutionRunning

	// Step 1: Check preconditions
	allPassed := true
	for _, check := range runbook.Preconditions {
		result := e.runCheck(ctx, check, incident.Resource)
		execution.PreconditionResults = append(execution.PreconditionResults, result)
		if !result.Passed {
			allPassed = false
			break
		}
	}

	if !allPassed {
		execution.Status = ExecutionFailed
		execution.Error = "Preconditions not met"
		now := time.Now()
		execution.CompletedAt = &now
		return
	}

	// Step 2: Execute action
	actionResult := e.runAction(ctx, runbook.Action, incident.Resource, execution.DryRun)
	execution.ActionResult = &actionResult

	if !actionResult.Success {
		execution.Status = ExecutionFailed
		execution.Error = actionResult.Error
		now := time.Now()
		execution.CompletedAt = &now
		return
	}

	// If dry run, we're done
	if execution.DryRun {
		execution.Status = ExecutionCompleted
		now := time.Now()
		execution.CompletedAt = &now
		return
	}

	// Step 3: Verify results
	allVerified := true
	for _, check := range runbook.Verification {
		result := e.runCheck(ctx, check, incident.Resource)
		execution.VerificationResults = append(execution.VerificationResults, result)
		if !result.Passed {
			allVerified = false
		}
	}

	if !allVerified && runbook.Rollback != nil {
		// Execute rollback
		rollbackResult := e.runAction(ctx, *runbook.Rollback, incident.Resource, false)
		execution.RollbackResult = &rollbackResult
		execution.Status = ExecutionRolledBack
		execution.Error = "Verification failed, rolled back"
	} else if !allVerified {
		execution.Status = ExecutionFailed
		execution.Error = "Verification failed, no rollback available"
	} else {
		execution.Status = ExecutionCompleted
		
		// Update runbook stats
		runbook.ExecutionCount++
		now := time.Now()
		runbook.LastExecuted = &now
	}

	now := time.Now()
	execution.CompletedAt = &now
}

// runCheck executes a single check
func (e *RunbookExecutor) runCheck(ctx context.Context, check Check, resource KubeResourceRef) CheckResult {
	result := CheckResult{
		Check: check,
		Time:  time.Now(),
	}

	// TODO: Implement actual check logic using kubeClient
	// For now, return a placeholder
	result.Passed = true
	result.Message = "Check passed (placeholder)"

	return result
}

// runAction executes a runbook action
func (e *RunbookExecutor) runAction(ctx context.Context, action RunbookAction, resource KubeResourceRef, dryRun bool) ActionResult {
	result := ActionResult{
		Action:    action,
		StartTime: time.Now(),
	}

	// TODO: Implement actual action execution using kubeClient
	// For now, return a placeholder
	result.Success = true
	result.Output = "Action executed (placeholder)"
	result.EndTime = time.Now()

	return result
}

// GetExecution retrieves an execution by ID
func (e *RunbookExecutor) GetExecution(id string) *RunbookExecution {
	e.mu.RLock()
	defer e.mu.RUnlock()
	return e.executions[id]
}

// GetExecutionsForIncident returns all executions for an incident
func (e *RunbookExecutor) GetExecutionsForIncident(incidentID string) []*RunbookExecution {
	e.mu.RLock()
	defer e.mu.RUnlock()

	var result []*RunbookExecution
	for _, exec := range e.executions {
		if exec.IncidentID == incidentID {
			result = append(result, exec)
		}
	}
	return result
}

