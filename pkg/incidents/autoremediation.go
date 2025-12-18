// Copyright 2025 KubeGraf Contributors
// SPDX-License-Identifier: Apache-2.0

package incidents

import (
	"context"
	"fmt"
	"log"
	"sync"
	"time"
)

// AutoRemediationConfig configures the auto-remediation system
type AutoRemediationConfig struct {
	// Enabled controls whether auto-remediation is active
	Enabled bool `json:"enabled"`

	// DefaultAutonomyLevel is the default level for new incidents
	DefaultAutonomyLevel AutonomyLevel `json:"defaultAutonomyLevel"`

	// MinConfidence required for any automatic action
	MinConfidence float64 `json:"minConfidence"`

	// MinSuccessRate required for runbook to be auto-eligible
	MinSuccessRate float64 `json:"minSuccessRate"`

	// CooldownPeriod between auto-remediations for same resource
	CooldownPeriod time.Duration `json:"cooldownPeriod"`

	// MaxConcurrentExecutions limits parallel auto-remediations
	MaxConcurrentExecutions int `json:"maxConcurrentExecutions"`

	// DryRunFirst requires dry-run before any auto-apply
	DryRunFirst bool `json:"dryRunFirst"`

	// RequireVerification requires verification checks to pass
	RequireVerification bool `json:"requireVerification"`

	// NotifyOnAutoAction sends notifications for auto-actions
	NotifyOnAutoAction bool `json:"notifyOnAutoAction"`

	// BlockedNamespaces won't receive auto-remediation
	BlockedNamespaces []string `json:"blockedNamespaces"`

	// BlockedResources types won't receive auto-remediation
	BlockedResources []string `json:"blockedResources"`
}

// DefaultAutoRemediationConfig returns sensible defaults
func DefaultAutoRemediationConfig() AutoRemediationConfig {
	return AutoRemediationConfig{
		Enabled:                 false, // Disabled by default for safety
		DefaultAutonomyLevel:    AutonomyRecommend,
		MinConfidence:           0.9,
		MinSuccessRate:          0.9,
		CooldownPeriod:          5 * time.Minute,
		MaxConcurrentExecutions: 3,
		DryRunFirst:             true,
		RequireVerification:     true,
		NotifyOnAutoAction:      true,
		BlockedNamespaces:       []string{"kube-system", "kube-public", "kube-node-lease"},
		BlockedResources:        []string{"ClusterRole", "ClusterRoleBinding", "CustomResourceDefinition"},
	}
}

// AutoRemediationStatus represents the current status of auto-remediation
type AutoRemediationStatus struct {
	// Enabled whether auto-remediation is currently enabled
	Enabled bool `json:"enabled"`

	// ActiveExecutions currently running
	ActiveExecutions int `json:"activeExecutions"`

	// TotalExecutions count
	TotalExecutions int `json:"totalExecutions"`

	// SuccessfulExecutions count
	SuccessfulExecutions int `json:"successfulExecutions"`

	// FailedExecutions count
	FailedExecutions int `json:"failedExecutions"`

	// RolledBackExecutions count
	RolledBackExecutions int `json:"rolledBackExecutions"`

	// LastExecution time
	LastExecution *time.Time `json:"lastExecution,omitempty"`

	// QueuedIncidents awaiting evaluation
	QueuedIncidents int `json:"queuedIncidents"`

	// CooldownResources in cooldown period
	CooldownResources int `json:"cooldownResources"`
}

// AutoRemediationDecision represents a decision about auto-remediation
type AutoRemediationDecision struct {
	IncidentID      string        `json:"incidentId"`
	RunbookID       string        `json:"runbookId"`
	Decision        string        `json:"decision"` // execute, skip, blocked, cooldown
	Reason          string        `json:"reason"`
	Confidence      float64       `json:"confidence"`
	SuccessRate     float64       `json:"successRate"`
	Risk            RunbookRisk   `json:"risk"`
	AutonomyLevel   AutonomyLevel `json:"autonomyLevel"`
	DecidedAt       time.Time     `json:"decidedAt"`
	ExecutionID     string        `json:"executionId,omitempty"`
}

// AutoRemediationEngine manages autonomous incident remediation
type AutoRemediationEngine struct {
	config         AutoRemediationConfig
	runbookReg     *RunbookRegistry
	executor       *RunbookExecutor
	knowledgeBank  *KnowledgeBank

	// State
	activeExecutions   map[string]*RunbookExecution
	cooldowns          map[string]time.Time // resource key -> cooldown until
	decisions          []*AutoRemediationDecision
	status             AutoRemediationStatus

	// Channels
	incidentQueue      chan *Incident
	stopCh             chan struct{}

	mu                 sync.RWMutex
	running            bool
}

// NewAutoRemediationEngine creates a new auto-remediation engine
func NewAutoRemediationEngine(
	config AutoRemediationConfig,
	runbookReg *RunbookRegistry,
	executor *RunbookExecutor,
	knowledgeBank *KnowledgeBank,
) *AutoRemediationEngine {
	return &AutoRemediationEngine{
		config:           config,
		runbookReg:       runbookReg,
		executor:         executor,
		knowledgeBank:    knowledgeBank,
		activeExecutions: make(map[string]*RunbookExecution),
		cooldowns:        make(map[string]time.Time),
		incidentQueue:    make(chan *Incident, 100),
		stopCh:           make(chan struct{}),
	}
}

// Start begins the auto-remediation engine
func (e *AutoRemediationEngine) Start() error {
	e.mu.Lock()
	if e.running {
		e.mu.Unlock()
		return fmt.Errorf("engine already running")
	}
	e.running = true
	e.mu.Unlock()

	go e.processLoop()
	log.Printf("[AUTO-REMEDIATION] Engine started (enabled=%v)", e.config.Enabled)
	return nil
}

// Stop stops the auto-remediation engine
func (e *AutoRemediationEngine) Stop() {
	e.mu.Lock()
	if !e.running {
		e.mu.Unlock()
		return
	}
	e.running = false
	e.mu.Unlock()

	close(e.stopCh)
	log.Printf("[AUTO-REMEDIATION] Engine stopped")
}

// processLoop is the main processing loop
func (e *AutoRemediationEngine) processLoop() {
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-e.stopCh:
			return
		case incident := <-e.incidentQueue:
			e.evaluateAndRemediate(incident)
		case <-ticker.C:
			e.cleanupCooldowns()
			e.updateStatus()
		}
	}
}

// EnqueueIncident adds an incident for evaluation
func (e *AutoRemediationEngine) EnqueueIncident(incident *Incident) {
	if !e.config.Enabled {
		return
	}

	select {
	case e.incidentQueue <- incident:
		e.mu.Lock()
		e.status.QueuedIncidents++
		e.mu.Unlock()
	default:
		log.Printf("[AUTO-REMEDIATION] Queue full, dropping incident: %s", incident.ID)
	}
}

// evaluateAndRemediate evaluates and potentially remediates an incident
func (e *AutoRemediationEngine) evaluateAndRemediate(incident *Incident) {
	e.mu.Lock()
	e.status.QueuedIncidents--
	e.mu.Unlock()

	// Find matching runbooks
	runbooks := e.runbookReg.GetByPattern(incident.Pattern)
	if len(runbooks) == 0 {
		e.recordDecision(incident.ID, "", "skip", "No matching runbooks", 0, 0, "", AutonomyObserve)
		return
	}

	for _, runbook := range runbooks {
		decision := e.evaluateRunbook(incident, runbook)
		e.recordDecision(
			incident.ID, runbook.ID, decision.Decision, decision.Reason,
			decision.Confidence, decision.SuccessRate, decision.Risk, decision.AutonomyLevel,
		)

		if decision.Decision == "execute" {
			e.executeRunbook(incident, runbook, decision)
			break // Only execute one runbook per incident
		}
	}
}

// evaluateRunbook evaluates whether a runbook should be auto-executed
func (e *AutoRemediationEngine) evaluateRunbook(incident *Incident, runbook *Runbook) *AutoRemediationDecision {
	decision := &AutoRemediationDecision{
		IncidentID:    incident.ID,
		RunbookID:     runbook.ID,
		Risk:          runbook.Risk,
		AutonomyLevel: runbook.AutonomyLevel,
		DecidedAt:     time.Now(),
	}

	// Check if blocked namespace
	if e.isBlockedNamespace(incident.Resource.Namespace) {
		decision.Decision = "blocked"
		decision.Reason = fmt.Sprintf("Namespace %s is blocked", incident.Resource.Namespace)
		return decision
	}

	// Check if blocked resource type
	if e.isBlockedResource(incident.Resource.Kind) {
		decision.Decision = "blocked"
		decision.Reason = fmt.Sprintf("Resource type %s is blocked", incident.Resource.Kind)
		return decision
	}

	// Check cooldown
	resourceKey := incident.Resource.String()
	if e.isInCooldown(resourceKey) {
		decision.Decision = "cooldown"
		decision.Reason = "Resource is in cooldown period"
		return decision
	}

	// Check concurrent execution limit
	e.mu.RLock()
	activeCount := len(e.activeExecutions)
	e.mu.RUnlock()
	if activeCount >= e.config.MaxConcurrentExecutions {
		decision.Decision = "skip"
		decision.Reason = "Maximum concurrent executions reached"
		return decision
	}

	// Check autonomy level
	if runbook.AutonomyLevel < AutonomyAutoExecute {
		decision.Decision = "skip"
		decision.Reason = fmt.Sprintf("Autonomy level %s does not allow auto-execution", runbook.AutonomyLevel.String())
		return decision
	}

	// Calculate confidence
	confidence := 0.0
	if incident.Diagnosis != nil {
		confidence = incident.Diagnosis.Confidence
	}
	decision.Confidence = confidence

	if confidence < e.config.MinConfidence {
		decision.Decision = "skip"
		decision.Reason = fmt.Sprintf("Confidence %.2f below threshold %.2f", confidence, e.config.MinConfidence)
		return decision
	}

	// Check runbook success rate
	successRate := runbook.SuccessRate
	if e.knowledgeBank != nil {
		historicalRate, execCount := e.knowledgeBank.GetRunbookSuccessRate(runbook.ID)
		if execCount >= 5 { // Only use historical if we have enough data
			successRate = historicalRate
		}
	}
	decision.SuccessRate = successRate

	if successRate < e.config.MinSuccessRate {
		decision.Decision = "skip"
		decision.Reason = fmt.Sprintf("Success rate %.2f below threshold %.2f", successRate, e.config.MinSuccessRate)
		return decision
	}

	// Check risk level
	if runbook.Risk != RiskRunbookLow {
		decision.Decision = "skip"
		decision.Reason = fmt.Sprintf("Risk level %s too high for auto-execution", runbook.Risk)
		return decision
	}

	// Check rollback availability
	if runbook.Rollback == nil {
		decision.Decision = "skip"
		decision.Reason = "No rollback defined"
		return decision
	}

	// All checks passed
	decision.Decision = "execute"
	decision.Reason = "All conditions met for auto-execution"
	return decision
}

// executeRunbook executes a runbook for auto-remediation
func (e *AutoRemediationEngine) executeRunbook(incident *Incident, runbook *Runbook, decision *AutoRemediationDecision) {
	ctx := context.Background()

	// Set cooldown before execution
	resourceKey := incident.Resource.String()
	e.setCooldown(resourceKey)

	// If DryRunFirst is enabled, do a dry run first
	if e.config.DryRunFirst {
		log.Printf("[AUTO-REMEDIATION] Executing dry-run for incident %s with runbook %s", incident.ID, runbook.ID)
		dryRunExec, err := e.executor.Execute(ctx, runbook.ID, incident, true, "auto")
		if err != nil {
			log.Printf("[AUTO-REMEDIATION] Dry-run failed: %v", err)
			return
		}

		// Wait for dry run to complete
		time.Sleep(2 * time.Second)
		
		e.mu.RLock()
		exec := e.executor.GetExecution(dryRunExec.ID)
		e.mu.RUnlock()

		if exec == nil || exec.Status == ExecutionFailed {
			log.Printf("[AUTO-REMEDIATION] Dry-run failed, skipping actual execution")
			return
		}
	}

	// Execute the actual remediation
	log.Printf("[AUTO-REMEDIATION] Executing runbook %s for incident %s", runbook.ID, incident.ID)
	
	execution, err := e.executor.Execute(ctx, runbook.ID, incident, false, "auto")
	if err != nil {
		log.Printf("[AUTO-REMEDIATION] Execution failed to start: %v", err)
		e.mu.Lock()
		e.status.FailedExecutions++
		e.mu.Unlock()
		return
	}

	decision.ExecutionID = execution.ID

	// Track active execution
	e.mu.Lock()
	e.activeExecutions[execution.ID] = execution
	e.status.TotalExecutions++
	now := time.Now()
	e.status.LastExecution = &now
	e.mu.Unlock()

	// Monitor execution in background
	go e.monitorExecution(execution.ID)
}

// monitorExecution monitors an execution until completion
func (e *AutoRemediationEngine) monitorExecution(executionID string) {
	ticker := time.NewTicker(5 * time.Second)
	defer ticker.Stop()

	timeout := time.After(10 * time.Minute)

	for {
		select {
		case <-ticker.C:
			exec := e.executor.GetExecution(executionID)
			if exec == nil {
				return
			}

			if exec.Status == ExecutionCompleted || exec.Status == ExecutionFailed || exec.Status == ExecutionRolledBack {
				e.finalizeExecution(exec)
				return
			}
		case <-timeout:
			log.Printf("[AUTO-REMEDIATION] Execution %s timed out", executionID)
			e.mu.Lock()
			delete(e.activeExecutions, executionID)
			e.status.FailedExecutions++
			e.mu.Unlock()
			return
		}
	}
}

// finalizeExecution handles execution completion
func (e *AutoRemediationEngine) finalizeExecution(exec *RunbookExecution) {
	e.mu.Lock()
	defer e.mu.Unlock()

	delete(e.activeExecutions, exec.ID)

	switch exec.Status {
	case ExecutionCompleted:
		e.status.SuccessfulExecutions++
		log.Printf("[AUTO-REMEDIATION] Execution %s completed successfully", exec.ID)
	case ExecutionFailed:
		e.status.FailedExecutions++
		log.Printf("[AUTO-REMEDIATION] Execution %s failed: %s", exec.ID, exec.Error)
	case ExecutionRolledBack:
		e.status.RolledBackExecutions++
		log.Printf("[AUTO-REMEDIATION] Execution %s was rolled back", exec.ID)
	}

	// Store in knowledge bank
	if e.knowledgeBank != nil {
		fix := &FixRecord{
			ID:             exec.ID,
			IncidentID:     exec.IncidentID,
			RunbookID:      exec.RunbookID,
			ExecutedAt:     exec.StartedAt,
			CompletedAt:    exec.CompletedAt,
			InitiatedBy:    exec.InitiatedBy,
			DryRun:         exec.DryRun,
			Success:        exec.Status == ExecutionCompleted,
			Error:          exec.Error,
			RolledBack:     exec.Status == ExecutionRolledBack,
			VerificationOK: len(exec.VerificationResults) > 0 && allChecksPassed(exec.VerificationResults),
		}
		e.knowledgeBank.StoreFix(fix)
	}
}

// allChecksPassed returns true if all checks passed
func allChecksPassed(results []CheckResult) bool {
	for _, r := range results {
		if !r.Passed {
			return false
		}
	}
	return true
}

// isBlockedNamespace checks if namespace is blocked
func (e *AutoRemediationEngine) isBlockedNamespace(namespace string) bool {
	for _, blocked := range e.config.BlockedNamespaces {
		if namespace == blocked {
			return true
		}
	}
	return false
}

// isBlockedResource checks if resource type is blocked
func (e *AutoRemediationEngine) isBlockedResource(kind string) bool {
	for _, blocked := range e.config.BlockedResources {
		if kind == blocked {
			return true
		}
	}
	return false
}

// isInCooldown checks if resource is in cooldown
func (e *AutoRemediationEngine) isInCooldown(resourceKey string) bool {
	e.mu.RLock()
	defer e.mu.RUnlock()

	if until, ok := e.cooldowns[resourceKey]; ok {
		return time.Now().Before(until)
	}
	return false
}

// setCooldown sets cooldown for a resource
func (e *AutoRemediationEngine) setCooldown(resourceKey string) {
	e.mu.Lock()
	defer e.mu.Unlock()
	e.cooldowns[resourceKey] = time.Now().Add(e.config.CooldownPeriod)
}

// cleanupCooldowns removes expired cooldowns
func (e *AutoRemediationEngine) cleanupCooldowns() {
	e.mu.Lock()
	defer e.mu.Unlock()

	now := time.Now()
	for key, until := range e.cooldowns {
		if now.After(until) {
			delete(e.cooldowns, key)
		}
	}

	e.status.CooldownResources = len(e.cooldowns)
}

// recordDecision records a decision for audit
func (e *AutoRemediationEngine) recordDecision(
	incidentID, runbookID, decision, reason string,
	confidence, successRate float64,
	risk RunbookRisk,
	autonomyLevel AutonomyLevel,
) {
	e.mu.Lock()
	defer e.mu.Unlock()

	d := &AutoRemediationDecision{
		IncidentID:    incidentID,
		RunbookID:     runbookID,
		Decision:      decision,
		Reason:        reason,
		Confidence:    confidence,
		SuccessRate:   successRate,
		Risk:          risk,
		AutonomyLevel: autonomyLevel,
		DecidedAt:     time.Now(),
	}

	e.decisions = append(e.decisions, d)

	// Keep only last 1000 decisions
	if len(e.decisions) > 1000 {
		e.decisions = e.decisions[len(e.decisions)-500:]
	}
}

// updateStatus updates the status
func (e *AutoRemediationEngine) updateStatus() {
	e.mu.Lock()
	defer e.mu.Unlock()

	e.status.Enabled = e.config.Enabled
	e.status.ActiveExecutions = len(e.activeExecutions)
}

// GetStatus returns current status
func (e *AutoRemediationEngine) GetStatus() AutoRemediationStatus {
	e.mu.RLock()
	defer e.mu.RUnlock()
	return e.status
}

// GetRecentDecisions returns recent decisions
func (e *AutoRemediationEngine) GetRecentDecisions(limit int) []*AutoRemediationDecision {
	e.mu.RLock()
	defer e.mu.RUnlock()

	if len(e.decisions) <= limit {
		return e.decisions
	}
	return e.decisions[len(e.decisions)-limit:]
}

// Enable enables auto-remediation
func (e *AutoRemediationEngine) Enable() {
	e.mu.Lock()
	defer e.mu.Unlock()
	e.config.Enabled = true
	e.status.Enabled = true
	log.Printf("[AUTO-REMEDIATION] Enabled")
}

// Disable disables auto-remediation
func (e *AutoRemediationEngine) Disable() {
	e.mu.Lock()
	defer e.mu.Unlock()
	e.config.Enabled = false
	e.status.Enabled = false
	log.Printf("[AUTO-REMEDIATION] Disabled")
}

// SetAutonomyLevel sets the autonomy level for a runbook
func (e *AutoRemediationEngine) SetAutonomyLevel(runbookID string, level AutonomyLevel) error {
	runbook := e.runbookReg.Get(runbookID)
	if runbook == nil {
		return fmt.Errorf("runbook not found: %s", runbookID)
	}

	runbook.AutonomyLevel = level
	log.Printf("[AUTO-REMEDIATION] Set autonomy level for %s to %s", runbookID, level.String())
	return nil
}

// EnableAutoForIncident enables auto-remediation for a specific incident
func (e *AutoRemediationEngine) EnableAutoForIncident(incidentID string, runbookID string) error {
	runbook := e.runbookReg.Get(runbookID)
	if runbook == nil {
		return fmt.Errorf("runbook not found: %s", runbookID)
	}

	// For now, just log - in production would store per-incident preferences
	log.Printf("[AUTO-REMEDIATION] Auto-enabled for incident %s with runbook %s", incidentID, runbookID)
	return nil
}

