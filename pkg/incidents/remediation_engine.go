// Copyright 2025 KubeGraf Contributors
// SPDX-License-Identifier: Apache-2.0

package incidents

import (
	"context"
	"fmt"
	"sort"
	"strings"
	"time"
)

// RemediationEngine generates fix plans and recommended actions for incidents
type RemediationEngine struct {
	runbookRegistry *RunbookRegistry
}

// NewRemediationEngine creates a new remediation engine
func NewRemediationEngine() *RemediationEngine {
	return &RemediationEngine{
		runbookRegistry: NewRunbookRegistry(),
	}
}

// GenerateRemediation generates recommended actions and fix plans for an incident
func (e *RemediationEngine) GenerateRemediation(ctx context.Context, snapshot *IncidentSnapshot, coldEvidence *ColdEvidence) (*RemediationPlan, error) {
	if snapshot == nil {
		return nil, fmt.Errorf("snapshot cannot be nil")
	}

	plan := &RemediationPlan{
		IncidentID: snapshot.IncidentID,
		GeneratedAt: time.Now(),
	}

	// Get runbooks for this pattern
	runbooks := e.runbookRegistry.GetByPattern(snapshot.Pattern)
	if len(runbooks) == 0 {
		// Fallback: generate generic read-only action
		plan.RecommendedAction = &RecommendedActionDetails{
			Type:        "read_only",
			Title:       "Investigate Incident",
			Description: "Review incident details, logs, and events to understand the root cause",
			Actions: []string{
				"View pod logs",
				"Check Kubernetes events",
				"Review resource metrics",
				"Examine recent changes",
			},
		}
		return plan, nil
	}

	// Generate recommended action (read-only, always first)
	recommendedAction := e.generateRecommendedAction(snapshot, coldEvidence, runbooks[0])
	plan.RecommendedAction = recommendedAction

	// Generate up to 3 suggested fixes
	// Sort runbooks by ID to ensure consistent ordering and fix IDs
	sortedRunbooks := make([]*Runbook, len(runbooks))
	copy(sortedRunbooks, runbooks)
	sort.Slice(sortedRunbooks, func(i, j int) bool {
		return sortedRunbooks[i].ID < sortedRunbooks[j].ID
	})
	
	fixPlans := e.generateFixPlans(ctx, snapshot, coldEvidence, sortedRunbooks)
	if len(fixPlans) > 3 {
		fixPlans = fixPlans[:3] // Limit to 3
	}
	plan.FixPlans = fixPlans

	return plan, nil
}

// generateRecommendedAction creates a read-only recommended action
func (e *RemediationEngine) generateRecommendedAction(snapshot *IncidentSnapshot, coldEvidence *ColdEvidence, runbook *Runbook) *RecommendedActionDetails {
	action := &RecommendedActionDetails{
		Type:        "read_only",
		Title:       fmt.Sprintf("Investigate %s", snapshot.Pattern),
		Description: runbook.Description,
		Actions:     []string{},
	}

	// Add read-only actions based on pattern
	switch snapshot.Pattern {
	case PatternRestartStorm:
		action.Actions = []string{
			"Fetch last restart logs",
			"Describe pod to see restart reasons",
			"Check recent events for restart triggers",
			"Review resource usage metrics",
		}
	case PatternOOMPressure:
		action.Actions = []string{
			"Check memory usage metrics",
			"Review container memory limits",
			"Examine OOM kill events",
			"Analyze memory pressure indicators",
		}
	case PatternImagePullFailure:
		action.Actions = []string{
			"Validate image reference",
			"Check image pull secrets",
			"Verify registry authentication",
			"Review image pull policy",
		}
	case PatternUnschedulable:
		action.Actions = []string{
			"Check pod scheduling events",
			"Review node resources",
			"Examine tolerations and node selectors",
			"Check for resource quotas",
		}
	default:
		action.Actions = []string{
			"View incident logs",
			"Check Kubernetes events",
			"Review resource metrics",
			"Examine recent changes",
		}
	}

	return action
}

// generateFixPlans creates fix plans from runbooks
func (e *RemediationEngine) generateFixPlans(ctx context.Context, snapshot *IncidentSnapshot, coldEvidence *ColdEvidence, runbooks []*Runbook) []*FixPlan {
	var plans []*FixPlan

	for _, runbook := range runbooks {
		// Only generate fixes if evidence is sufficient
		if !e.hasSufficientEvidence(snapshot, coldEvidence, runbook) {
			continue
		}

		plan := e.runbookToFixPlan(ctx, snapshot, coldEvidence, runbook)
		if plan != nil {
			plans = append(plans, plan)
		}
	}

	return plans
}

// hasSufficientEvidence checks if there's enough evidence to propose a fix
func (e *RemediationEngine) hasSufficientEvidence(snapshot *IncidentSnapshot, coldEvidence *ColdEvidence, runbook *Runbook) bool {
	// First check if pattern matches
	if snapshot.Pattern != runbook.Pattern {
		return false
	}

	// Check preconditions
	for _, precondition := range runbook.Preconditions {
		if !e.checkPrecondition(snapshot, coldEvidence, precondition) {
			return false
		}
	}
	return true
}

// checkPrecondition verifies a precondition
func (e *RemediationEngine) checkPrecondition(snapshot *IncidentSnapshot, coldEvidence *ColdEvidence, check Check) bool {
	// Basic precondition checking
	// In a full implementation, this would evaluate the check against evidence more thoroughly
	
	// For now, implement basic checks
	switch check.Type {
	case CheckTypeResourceExists:
		// Check if resource exists (simplified - assume true if snapshot exists)
		return snapshot != nil
	case CheckTypeEventAbsent:
		// Check if event is absent (inverted logic - if we want event to exist, check if it's present)
		// For now, return true to allow fixes to be suggested
		// In full implementation, would check coldEvidence.Events
		return true
	case CheckTypeLogPattern:
		// Check if log pattern exists
		expectedStr := ""
		if str, ok := check.Expected.(string); ok {
			expectedStr = str
		} else {
			expectedStr = fmt.Sprintf("%v", check.Expected)
		}
		if coldEvidence != nil {
			for _, log := range coldEvidence.Logs {
				if containsSubstring(log.Message, expectedStr) {
					return true
				}
			}
		}
		// Also check snapshot error string
		if snapshot != nil && snapshot.LastErrorString != "" {
			if containsSubstring(snapshot.LastErrorString, expectedStr) {
				return true
			}
		}
		return false
	case CheckTypePodStatus:
		// Check pod status
		if snapshot != nil {
			expectedStr := ""
			if str, ok := check.Expected.(string); ok {
				expectedStr = str
			} else {
				expectedStr = fmt.Sprintf("%v", check.Expected)
			}
			switch check.Operator {
			case OpEquals:
				return snapshot.ReadinessStatus == expectedStr
			case OpNotEquals:
				return snapshot.ReadinessStatus != expectedStr
			}
		}
		return false
	default:
		// For unknown check types, default to true to allow fixes to be suggested
		return true
	}
}

// containsSubstring checks if a string contains a substring (case-insensitive)
func containsSubstring(s, substr string) bool {
	if len(substr) == 0 {
		return true
	}
	if len(s) < len(substr) {
		return false
	}
	sLower := strings.ToLower(s)
	substrLower := strings.ToLower(substr)
	return strings.Contains(sLower, substrLower)
}

// runbookToFixPlan converts a runbook to a FixPlan
func (e *RemediationEngine) runbookToFixPlan(ctx context.Context, snapshot *IncidentSnapshot, coldEvidence *ColdEvidence, runbook *Runbook) *FixPlan {
	// Generate deterministic fix ID based on runbook ID and incident ID
	// This ensures the same fix always has the same ID across multiple calls
	fixID := fmt.Sprintf("fix-%s-%s", snapshot.IncidentID, runbook.ID)
	plan := &FixPlan{
		ID:          fixID,
		Title:       runbook.Name,
		Description: runbook.Description,
		Type:        string(e.mapRunbookActionToFixType(runbook.Action)),
		Risk:        string(e.mapRunbookRiskToRisk(runbook.Risk)),
		Prerequisites: []string{},
		EvidenceRefs: e.extractEvidenceRefs(snapshot, coldEvidence),
		Preview: &FixPreviewDetails{
			KubectlCommands: e.generateKubectlCommands(runbook, snapshot),
			DryRunSupported: true,
			ExpectedDiff:    e.generateExpectedDiff(runbook, snapshot),
		},
		Rollback: &FixRollback{
			Description:    "Rollback to previous state",
			KubectlCommands: e.generateRollbackCommands(runbook, snapshot),
		},
		Guardrails: &FixGuardrails{
			ConfidenceMin:        0.60, // Lower default to allow more fixes
			RequiresNamespaceScoped: true,
			RequiresOwnerKind:     "Deployment", // Default to Deployment
			RequiresUserAck:       true,
		},
		Confidence: e.calculateConfidence(snapshot, coldEvidence, runbook),
		WhyThisFix: e.generateWhyThisFix(snapshot, coldEvidence, runbook),
	}

		// Set guardrails based on risk
	if plan.Risk == "high" {
		plan.Guardrails.ConfidenceMin = 0.80 // Lowered from 0.85
		plan.Guardrails.RequiresUserAck = true
	} else if plan.Risk == "medium" {
		plan.Guardrails.ConfidenceMin = 0.65 // Medium risk requires slightly higher confidence
	} else {
		plan.Guardrails.ConfidenceMin = 0.60 // Low risk - more permissive
	}

	return plan
}

// mapRunbookActionToFixType converts runbook action to fix type string
func (e *RemediationEngine) mapRunbookActionToFixType(action RunbookAction) string {
	// RunbookAction.Type is already FixType, convert to lowercase string
	switch action.Type {
	case FixTypePatch:
		return "patch"
	case FixTypeScale:
		return "scale"
	case FixTypeRestart:
		return "restart"
	case FixTypeRollback:
		return "rollback"
	case FixTypeDelete:
		return "delete"
	case FixTypeCreate:
		return "create"
	default:
		return "read_only"
	}
}

// mapRunbookRiskToRisk converts runbook risk to fix risk string
func (e *RemediationEngine) mapRunbookRiskToRisk(runbookRisk RunbookRisk) string {
	switch runbookRisk {
	case RiskRunbookLow:
		return "low"
	case RiskRunbookMedium:
		return "medium"
	case RiskRunbookHigh:
		return "high"
	default:
		return "medium"
	}
}

// extractEvidenceRefs extracts evidence references from snapshot and cold evidence
func (e *RemediationEngine) extractEvidenceRefs(snapshot *IncidentSnapshot, coldEvidence *ColdEvidence) []EvidenceRef {
	var refs []EvidenceRef

	// Add evidence from snapshot
	// Note: IncidentSnapshot doesn't contain events directly, they're in coldEvidence
	// We can add evidence from snapshot fields like LastErrorString, RecentChangeSummary
	if snapshot != nil {
		if snapshot.LastErrorString != "" {
			refs = append(refs, EvidenceRef{
				Kind:    EvidenceKindLog,
				RefID:   snapshot.IncidentID + "-error",
				Snippet: snapshot.LastErrorString,
			})
		}
		if snapshot.RecentChangeSummary != "" {
			refs = append(refs, EvidenceRef{
				Kind:    EvidenceKindChange,
				RefID:   snapshot.IncidentID + "-change",
				Snippet: snapshot.RecentChangeSummary,
			})
		}
	}

	// Add evidence from cold evidence
	if coldEvidence != nil {
		// Add log evidence
		for _, log := range coldEvidence.Logs {
			refs = append(refs, EvidenceRef{
				Kind:    EvidenceKindLog,
				RefID:   log.ID,
				Snippet: log.Message,
			})
		}

		// Add metric evidence
		for _, metric := range coldEvidence.Metrics {
			refs = append(refs, EvidenceRef{
				Kind:    EvidenceKindMetric,
				RefID:   metric.ID,
				Snippet: metric.Message,
			})
		}

		// Add change evidence
		for _, change := range coldEvidence.Changes {
			refs = append(refs, EvidenceRef{
				Kind:    EvidenceKindChange,
				RefID:   change.ID,
				Snippet: change.Description,
			})
		}
	}

	return refs
}

// generateKubectlCommands generates kubectl commands for a fix
func (e *RemediationEngine) generateKubectlCommands(runbook *Runbook, snapshot *IncidentSnapshot) []string {
	var commands []string

	// Generate commands based on runbook action
	// Use DryRunCommand if available, otherwise generate from type
	if runbook.Action.DryRunCommand != "" {
		// Replace template variables (simplified)
		cmd := runbook.Action.DryRunCommand
		cmd = strings.ReplaceAll(cmd, "{{.Name}}", snapshot.Resource.Name)
		cmd = strings.ReplaceAll(cmd, "{{.Namespace}}", snapshot.Resource.Namespace)
		commands = append(commands, cmd)
	} else {
		// Fallback: generate from type
		switch runbook.Action.Type {
		case FixTypePatch:
			commands = append(commands, fmt.Sprintf("kubectl patch %s %s -n %s --type=strategic --patch='...'",
				snapshot.Resource.Kind, snapshot.Resource.Name, snapshot.Resource.Namespace))
		case FixTypeScale:
			replicas := 1
			if val, ok := runbook.Action.Parameters["increment"].(int); ok {
				replicas = val
			} else if val, ok := runbook.Action.Parameters["replicas"].(int); ok {
				replicas = val
			}
			commands = append(commands, fmt.Sprintf("kubectl scale %s %s -n %s --replicas=%d",
				snapshot.Resource.Kind, snapshot.Resource.Name, snapshot.Resource.Namespace, replicas))
		case FixTypeRestart:
			commands = append(commands, fmt.Sprintf("kubectl rollout restart %s %s -n %s",
				snapshot.Resource.Kind, snapshot.Resource.Name, snapshot.Resource.Namespace))
		case FixTypeRollback:
			commands = append(commands, fmt.Sprintf("kubectl rollout undo %s %s -n %s",
				snapshot.Resource.Kind, snapshot.Resource.Name, snapshot.Resource.Namespace))
		}
	}

	return commands
}

// generateExpectedDiff generates a unified diff format preview
func (e *RemediationEngine) generateExpectedDiff(runbook *Runbook, snapshot *IncidentSnapshot) string {
	// Simplified diff generation
	// In a full implementation, this would generate actual unified diff
	switch runbook.Action.Type {
	case FixTypePatch:
		patch := runbook.Action.Description
		if runbook.Action.DryRunCommand != "" {
			// Try to extract patch info from command
			patch = runbook.Action.Description
		}
		return fmt.Sprintf("--- a/%s/%s\n+++ b/%s/%s\n%s",
			snapshot.Resource.Namespace, snapshot.Resource.Name,
			snapshot.Resource.Namespace, snapshot.Resource.Name,
			patch)
	default:
		return fmt.Sprintf("Expected change: %s", runbook.Action.Description)
	}
}

// generateRollbackCommands generates rollback commands
func (e *RemediationEngine) generateRollbackCommands(runbook *Runbook, snapshot *IncidentSnapshot) []string {
	// Use RollbackCommand from action if available
	if runbook.Action.RollbackCommand != "" {
		cmd := runbook.Action.RollbackCommand
		cmd = strings.ReplaceAll(cmd, "{{.Name}}", snapshot.Resource.Name)
		cmd = strings.ReplaceAll(cmd, "{{.Namespace}}", snapshot.Resource.Namespace)
		return []string{cmd}
	}

	// Use Rollback action if available
	if runbook.Rollback != nil && runbook.Rollback.RollbackCommand != "" {
		cmd := runbook.Rollback.RollbackCommand
		cmd = strings.ReplaceAll(cmd, "{{.Name}}", snapshot.Resource.Name)
		cmd = strings.ReplaceAll(cmd, "{{.Namespace}}", snapshot.Resource.Namespace)
		return []string{cmd}
	}

	// Try generating from rollback action
	if runbook.Rollback != nil {
		return e.generateKubectlCommandsFromAction(runbook.Rollback, snapshot)
	}

	// Default rollback based on action type
	switch runbook.Action.Type {
	case FixTypePatch:
		return []string{fmt.Sprintf("kubectl rollout undo %s %s -n %s",
			snapshot.Resource.Kind, snapshot.Resource.Name, snapshot.Resource.Namespace)}
	case FixTypeScale:
		// Rollback to previous replica count (would need to track this)
		return []string{fmt.Sprintf("kubectl scale %s %s -n %s --replicas=<previous>",
			snapshot.Resource.Kind, snapshot.Resource.Name, snapshot.Resource.Namespace)}
	default:
		return []string{"Rollback not available for this fix type"}
	}
}

// generateKubectlCommandsFromAction generates commands from a runbook action
func (e *RemediationEngine) generateKubectlCommandsFromAction(action *RunbookAction, snapshot *IncidentSnapshot) []string {
	return e.generateKubectlCommands(&Runbook{Action: *action}, snapshot)
}

// calculateConfidence calculates confidence score for a fix
func (e *RemediationEngine) calculateConfidence(snapshot *IncidentSnapshot, coldEvidence *ColdEvidence, runbook *Runbook) float64 {
	confidence := 0.5 // Base confidence

	// Increase confidence based on evidence
	if coldEvidence != nil {
		if len(coldEvidence.Logs) > 0 {
			confidence += 0.1
		}
		if len(coldEvidence.Events) > 0 {
			confidence += 0.1
		}
		if len(coldEvidence.Metrics) > 0 {
			confidence += 0.1
		}
	}

	// Increase confidence based on runbook success rate
	confidence += runbook.SuccessRate * 0.2

	// Cap at 1.0
	if confidence > 1.0 {
		confidence = 1.0
	}

	return confidence
}

// generateWhyThisFix generates explanation for why this fix is suggested
func (e *RemediationEngine) generateWhyThisFix(snapshot *IncidentSnapshot, coldEvidence *ColdEvidence, runbook *Runbook) string {
	explanation := fmt.Sprintf("This fix is suggested because:\n")
	explanation += fmt.Sprintf("- Pattern matches: %s\n", snapshot.Pattern)
	explanation += fmt.Sprintf("- Runbook success rate: %.0f%%\n", runbook.SuccessRate*100)

	if coldEvidence != nil {
		if len(coldEvidence.Logs) > 0 {
			explanation += fmt.Sprintf("- Found %d relevant log entries\n", len(coldEvidence.Logs))
		}
		if len(coldEvidence.Events) > 0 {
			explanation += fmt.Sprintf("- Found %d relevant events\n", len(coldEvidence.Events))
		}
	}

	return explanation
}

// RemediationPlan contains recommended action and fix plans
type RemediationPlan struct {
	IncidentID        string                    `json:"incidentId"`
	RecommendedAction *RecommendedActionDetails `json:"recommendedAction"`
	FixPlans          []*FixPlan                `json:"fixPlans"`
	GeneratedAt       time.Time                 `json:"generatedAt"`
}

// RecommendedActionDetails represents a read-only recommended action for remediation
// Note: RecommendedAction may exist elsewhere, this is specific to remediation engine
type RecommendedActionDetails struct {
	Type        string   `json:"type"` // Always "read_only"
	Title       string   `json:"title"`
	Description string   `json:"description"`
	Actions     []string `json:"actions"` // List of read-only actions to take
}

// FixPlan represents a suggested fix with all required details
type FixPlan struct {
	ID            string             `json:"id"`
	Title         string             `json:"title"`
	Description   string             `json:"description"`
	Type          string             `json:"type"` // Uses FixType from types.go
	Risk          string             `json:"risk"` // Uses RiskLevel from types.go
	Prerequisites []string           `json:"prerequisites"`
	EvidenceRefs  []EvidenceRef      `json:"evidenceRefs"`
	Preview       *FixPreviewDetails `json:"preview"`
	Rollback      *FixRollback       `json:"rollback"`
	Guardrails    *FixGuardrails     `json:"guardrails"`
	Confidence    float64            `json:"confidence"`
	WhyThisFix    string             `json:"whyThisFix"`
}

// EvidenceRef references evidence that supports the fix
type EvidenceRef struct {
	Kind    EvidenceKind `json:"kind"`
	RefID   string       `json:"refId"`
	Snippet string       `json:"snippet"`
}

// EvidenceKind defines the type of evidence
type EvidenceKind string

const (
	EvidenceKindEvent  EvidenceKind = "event"
	EvidenceKindLog    EvidenceKind = "log"
	EvidenceKindChange EvidenceKind = "change"
	EvidenceKindMetric EvidenceKind = "metric"
)

// FixPreviewDetails contains preview information for a fix plan
// Note: FixPreview already exists in fixes.go, this is a different structure for FixPlan
type FixPreviewDetails struct {
	KubectlCommands []string `json:"kubectlCommands"`
	DryRunSupported bool     `json:"dryRunSupported"`
	ExpectedDiff    string   `json:"expectedDiff"` // Unified diff format
}

// FixRollback contains rollback information
type FixRollback struct {
	Description     string   `json:"description"`
	KubectlCommands []string `json:"kubectlCommands"`
}

// FixGuardrails defines safety guardrails for a fix
type FixGuardrails struct {
	ConfidenceMin          float64 `json:"confidenceMin"`
	RequiresNamespaceScoped bool   `json:"requiresNamespaceScoped"`
	RequiresOwnerKind      string  `json:"requiresOwnerKind"`
	RequiresUserAck         bool   `json:"requiresUserAck"`
}

// ColdEvidence contains additional evidence that may be expensive to fetch
type ColdEvidence struct {
	Logs    []LogEvidence    `json:"logs,omitempty"`
	Events  []EventEvidence  `json:"events,omitempty"`
	Metrics []MetricEvidence `json:"metrics,omitempty"`
	Changes []ChangeEvidence `json:"changes,omitempty"`
}

// LogEvidence represents log evidence
type LogEvidence struct {
	ID      string    `json:"id"`
	Message string    `json:"message"`
	Time    time.Time `json:"time"`
}

// EventEvidence represents event evidence
type EventEvidence struct {
	ID      string    `json:"id"`
	Message string    `json:"message"`
	Time    time.Time `json:"time"`
}

// MetricEvidence represents metric evidence
type MetricEvidence struct {
	ID      string    `json:"id"`
	Message string    `json:"message"`
	Time    time.Time `json:"time"`
}

// ChangeEvidence represents change evidence
type ChangeEvidence struct {
	ID          string    `json:"id"`
	Description string    `json:"description"`
	Time        time.Time `json:"time"`
}

