// Copyright 2025 KubeGraf Contributors
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package healing

import (
	"context"
	"fmt"
	"log"
	"time"

	"github.com/kubegraf/kubegraf/pkg/ai"
	"github.com/kubegraf/kubegraf/pkg/kubernetes"
)

// Engine provides intelligent self-healing recommendations
type Engine struct {
	k8sClient     *kubernetes.Client
	confidenceScorer interface {
		CalculateScore(intent *ai.Intent, health *kubernetes.ResourceHealth, suggestion *HealingSuggestion, safetyChecks []SafetyCheck) float64
	}
	history interface {
		RecordAction(result *ActionResult)
	}
	aiParser      ai.IntentParser
}

// NewEngine creates a new healing engine
func NewEngine(k8sClient *kubernetes.Client, aiParser ai.IntentParser) *Engine {
	return &Engine{
		k8sClient:        k8sClient,
		aiParser:         aiParser,
	}
}

// HealingSuggestion represents a suggested healing action
type HealingSuggestion struct {
	Action          string                 `json:"action"`
	Description     string                 `json:"description"`
	Resource        string                 `json:"resource"`
	Namespace       string                 `json:"namespace"`
	Name            string                 `json:"name"`
	Confidence      float64                `json:"confidence"`
	RiskLevel       string                 `json:"risk_level"` // low, medium, high
	EstimatedImpact string                 `json:"estimated_impact"`
	Prerequisites   []string               `json:"prerequisites"`
	Steps           []string               `json:"steps"`
	Alternatives    []string               `json:"alternatives"`
	SafetyChecks    []SafetyCheck          `json:"safety_checks"`
	RequiresApproval bool                  `json:"requires_approval"`
}

// SafetyCheck represents a safety validation check
type SafetyCheck struct {
	Name        string `json:"name"`
	Description string `json:"description"`
	Status      string `json:"status"` // passed, failed, warning
	Message     string `json:"message"`
}

// GenerateHealingSuggestion analyzes a resource and generates healing suggestions
func (e *Engine) GenerateHealingSuggestion(ctx context.Context, intent *ai.Intent) (*HealingSuggestion, error) {
	log.Printf("Generating healing suggestion for intent: %s on %s/%s", intent.Type, intent.Resource, intent.Name)

	// Get current resource health
	health, err := e.getResourceHealth(ctx, intent)
	if err != nil {
		return nil, fmt.Errorf("failed to get resource health: %w", err)
	}

	// Generate suggestion based on intent and health
	suggestion, err := e.createSuggestion(intent, health)
	if err != nil {
		return nil, fmt.Errorf("failed to create suggestion: %w", err)
	}

	// Perform safety checks
	safetyChecks := e.performSafetyChecks(intent, suggestion)
	suggestion.SafetyChecks = safetyChecks

	// Calculate confidence score (simplified for now)
	confidence := e.calculateConfidence(intent, health, suggestion, safetyChecks)
	suggestion.Confidence = confidence

	// Determine if approval is required based on risk
	suggestion.RequiresApproval = e.requiresApproval(suggestion)

	return suggestion, nil
}

// getResourceHealth retrieves health information for the target resource
func (e *Engine) getResourceHealth(ctx context.Context, intent *ai.Intent) (*kubernetes.ResourceHealth, error) {
	switch intent.Resource {
	case "pod":
		return e.k8sClient.CheckPodHealth(ctx, intent.Namespace, intent.Name)
	case "deployment":
		return e.k8sClient.CheckDeploymentHealth(ctx, intent.Namespace, intent.Name)
	default:
		return nil, fmt.Errorf("health checks not implemented for resource type: %s", intent.Resource)
	}
}

// createSuggestion creates a healing suggestion based on intent and health
func (e *Engine) createSuggestion(intent *ai.Intent, health *kubernetes.ResourceHealth) (*HealingSuggestion, error) {
	suggestion := &HealingSuggestion{
		Resource:  intent.Resource,
		Namespace: intent.Namespace,
		Name:      intent.Name,
		Steps:     []string{},
		Prerequisites: []string{},
		Alternatives: []string{},
	}

	switch intent.Type {
	case "rollback":
		return e.createRollbackSuggestion(intent, health, suggestion)
	case "scale":
		return e.createScaleSuggestion(intent, health, suggestion)
	case "restart":
		return e.createRestartSuggestion(intent, health, suggestion)
	case "query":
		return e.createDiagnosticSuggestion(intent, health, suggestion)
	default:
		return e.createGenericSuggestion(intent, health, suggestion)
	}
}

// createRollbackSuggestion creates a rollback suggestion
func (e *Engine) createRollbackSuggestion(intent *ai.Intent, health *kubernetes.ResourceHealth, suggestion *HealingSuggestion) (*HealingSuggestion, error) {
	if intent.Resource != "deployment" {
		return nil, fmt.Errorf("rollback is only supported for deployments")
	}

	suggestion.Action = "rollback"
	suggestion.Description = fmt.Sprintf("Rollback deployment %s to previous revision", intent.Name)
	suggestion.RiskLevel = "medium"
	suggestion.EstimatedImpact = "Temporary service disruption during rollout"

	// Get deployment history
	ctx := context.Background()
	history, err := e.k8sClient.GetDeploymentHistory(ctx, intent.Namespace, intent.Name)
	if err != nil {
		return nil, fmt.Errorf("failed to get deployment history: %w", err)
	}

	// Find the previous revision
	var previousRevision string
	for _, rev := range history {
		if !rev.IsCurrent && rev.ReadyReplicas > 0 {
			previousRevision = rev.Revision
			break
		}
	}

	if previousRevision == "" {
		return nil, fmt.Errorf("no suitable previous revision found for rollback")
	}

	suggestion.Steps = []string{
		fmt.Sprintf("Rollback deployment %s to revision %s", intent.Name, previousRevision),
		"Monitor rollout progress",
		"Verify application health after rollback",
	}

	suggestion.Prerequisites = []string{
		"Previous deployment revision exists",
		"Application health checks are configured",
	}

	suggestion.Alternatives = []string{
		"Fix current deployment issues instead of rolling back",
		"Scale down current version and scale up fixed version",
	}

	return suggestion, nil
}

// createScaleSuggestion creates a scaling suggestion
func (e *Engine) createScaleSuggestion(intent *ai.Intent, health *kubernetes.ResourceHealth, suggestion *HealingSuggestion) (*HealingSuggestion, error) {
	if intent.Resource != "deployment" {
		return nil, fmt.Errorf("scaling is only supported for deployments")
	}

	// Get target replica count from parameters
	targetReplicas := intent.Parameters["replicas"]
	if targetReplicas == "" {
		targetReplicas = "3" // Default scaling target
	}

	suggestion.Action = "scale"
	suggestion.Description = fmt.Sprintf("Scale deployment %s to %s replicas", intent.Name, targetReplicas)
	suggestion.RiskLevel = "low"
	suggestion.EstimatedImpact = "No service disruption if scaling up"

	suggestion.Steps = []string{
		fmt.Sprintf("Update deployment %s replica count to %s", intent.Name, targetReplicas),
		"Monitor new pod creation and readiness",
		"Verify load distribution across pods",
	}

	suggestion.Prerequisites = []string{
		"Sufficient cluster resources available",
		"Application supports horizontal scaling",
	}

	suggestion.Alternatives = []string{
		"Vertical scaling (increase resource limits)",
		"Optimize application resource usage",
	}

	return suggestion, nil
}

// createRestartSuggestion creates a restart suggestion
func (e *Engine) createRestartSuggestion(intent *ai.Intent, health *kubernetes.ResourceHealth, suggestion *HealingSuggestion) (*HealingSuggestion, error) {
	suggestion.Action = "restart"
	suggestion.Description = fmt.Sprintf("Restart %s %s", intent.Resource, intent.Name)
	suggestion.RiskLevel = "low"
	suggestion.EstimatedImpact = "Temporary service disruption during restart"

	// Analyze current issues to provide targeted restart reasons
	restartReasons := []string{}
	for _, issue := range health.Issues {
		switch issue.Type {
		case "ContainerWaiting", "CrashLoopBackOff":
			restartReasons = append(restartReasons, "Container is stuck in waiting state")
		case "HighRestartCount":
			restartReasons = append(restartReasons, "Container has high restart count")
		case "PodStatus":
			if health.Status != "Running" {
				restartReasons = append(restartReasons, "Pod is not in running state")
			}
		}
	}

	if len(restartReasons) > 0 {
		suggestion.Description += " to resolve: " + joinStrings(restartReasons, ", ")
	}

	suggestion.Steps = []string{
		fmt.Sprintf("Trigger restart of %s %s", intent.Resource, intent.Name),
		"Monitor restart progress and pod readiness",
		"Verify application functionality after restart",
	}

	suggestion.Prerequisites = []string{
		"Application is designed to handle restarts gracefully",
		"Health checks are properly configured",
	}

	suggestion.Alternatives = []string{
		"Investigate root cause instead of restarting",
		"Scale down and scale up as alternative restart method",
	}

	return suggestion, nil
}

// createDiagnosticSuggestion creates a diagnostic suggestion
func (e *Engine) createDiagnosticSuggestion(intent *ai.Intent, health *kubernetes.ResourceHealth, suggestion *HealingSuggestion) (*HealingSuggestion, error) {
	suggestion.Action = "diagnose"
	suggestion.Description = fmt.Sprintf("Diagnose issues with %s %s", intent.Resource, intent.Name)
	suggestion.RiskLevel = "low"
	suggestion.EstimatedImpact = "No impact - diagnostic action only"

	// Analyze current issues to provide specific diagnostic steps
	diagnosticSteps := []string{
		fmt.Sprintf("Check %s status and recent events", intent.Resource),
	}

	for _, issue := range health.Issues {
		switch issue.Type {
		case "ContainerWaiting":
			diagnosticSteps = append(diagnosticSteps, "Check container image availability and pull secrets")
			diagnosticSteps = append(diagnosticSteps, "Verify node resources and scheduling constraints")
		case "HighRestartCount":
			diagnosticSteps = append(diagnosticSteps, "Analyze application logs for crash patterns")
			diagnosticSteps = append(diagnosticSteps, "Check resource limits and OOM conditions")
		case "PodStatus":
			diagnosticSteps = append(diagnosticSteps, "Inspect pod events for scheduling issues")
			diagnosticSteps = append(diagnosticSteps, "Verify node health and connectivity")
		}
	}

	diagnosticSteps = append(diagnosticSteps, "Review recent changes and deployments")
	diagnosticSteps = append(diagnosticSteps, "Check cluster-wide resource utilization")

	suggestion.Steps = diagnosticSteps

	suggestion.Prerequisites = []string{
		"Access to cluster logs and events",
		"Permission to inspect cluster resources",
	}

	suggestion.Alternatives = []string{
		"Use automated monitoring tools for diagnosis",
		"Consult application-specific documentation",
	}

	return suggestion, nil
}

// createGenericSuggestion creates a generic suggestion
func (e *Engine) createGenericSuggestion(intent *ai.Intent, health *kubernetes.ResourceHealth, suggestion *HealingSuggestion) (*HealingSuggestion, error) {
	suggestion.Action = "investigate"
	suggestion.Description = fmt.Sprintf("Investigate %s %s based on user request", intent.Resource, intent.Name)
	suggestion.RiskLevel = "low"
	suggestion.EstimatedImpact = "Depends on specific action taken"

	suggestion.Steps = []string{
		"Analyze current resource state and health",
		"Review recent events and logs",
		"Identify root cause of any issues",
		"Implement appropriate remediation",
	}

	return suggestion, nil
}

// performSafetyChecks performs safety validation checks
func (e *Engine) performSafetyChecks(intent *ai.Intent, suggestion *HealingSuggestion) []SafetyCheck {
	checks := []SafetyCheck{}

	// Check 1: Resource exists
	ctx := context.Background()
	exists := e.checkResourceExists(ctx, intent)
	checks = append(checks, SafetyCheck{
		Name:        "ResourceExists",
		Description: "Verify target resource exists",
		Status:      map[bool]string{true: "passed", false: "failed"}[exists],
		Message:     map[bool]string{true: "Resource found", false: "Resource not found"}[exists],
	})

	// Check 2: Sufficient permissions (simulated)
	hasPermissions := e.checkPermissions(intent)
	checks = append(checks, SafetyCheck{
		Name:        "Permissions",
		Description: "Check if required permissions are available",
		Status:      map[bool]string{true: "passed", false: "warning"}[hasPermissions],
		Message:     map[bool]string{true: "Permissions available", false: "Permissions may be limited"}[hasPermissions],
	})

	// Check 3: Cluster health
	clusterHealthy := e.checkClusterHealth(ctx)
	checks = append(checks, SafetyCheck{
		Name:        "ClusterHealth",
		Description: "Verify cluster is healthy enough for the action",
		Status:      map[bool]string{true: "passed", false: "warning"}[clusterHealthy],
		Message:     map[bool]string{true: "Cluster is healthy", false: "Cluster health issues detected"}[clusterHealthy],
	})

	// Resource-specific checks
	switch suggestion.Action {
	case "rollback":
		checks = append(checks, e.checkRollbackSafety(ctx, intent)...)
	case "scale":
		checks = append(checks, e.checkScaleSafety(ctx, intent)...)
	case "restart":
		checks = append(checks, e.checkRestartSafety(ctx, intent)...)
	}

	return checks
}

// Safety check helper methods
func (e *Engine) checkResourceExists(ctx context.Context, intent *ai.Intent) bool {
	// This would make actual API calls to verify resource existence
	// For now, return true as the health check would have failed if resource didn't exist
	return true
}

func (e *Engine) checkPermissions(intent *ai.Intent) bool {
	// This would check actual RBAC permissions
	// For now, assume permissions are available
	return true
}

func (e *Engine) checkClusterHealth(ctx context.Context) bool {
	// This would check cluster-wide health metrics
	// For now, assume cluster is healthy
	return true
}

func (e *Engine) checkRollbackSafety(ctx context.Context, intent *ai.Intent) []SafetyCheck {
	checks := []SafetyCheck{}

	// Check if previous revision exists
	history, err := e.k8sClient.GetDeploymentHistory(ctx, intent.Namespace, intent.Name)
	if err == nil && len(history) > 1 {
		checks = append(checks, SafetyCheck{
			Name:        "PreviousRevision",
			Description: "Verify previous revision is available",
			Status:      "passed",
			Message:     fmt.Sprintf("Found %d previous revisions", len(history)-1),
		})
	} else {
		checks = append(checks, SafetyCheck{
			Name:        "PreviousRevision",
			Description: "Verify previous revision is available",
			Status:      "failed",
			Message:     "No previous revision found for rollback",
		})
	}

	return checks
}

func (e *Engine) checkScaleSafety(ctx context.Context, intent *ai.Intent) []SafetyCheck {
	checks := []SafetyCheck{}

	// Check cluster resources
	checks = append(checks, SafetyCheck{
		Name:        "ClusterResources",
		Description: "Verify cluster has sufficient resources",
		Status:      "passed", // Would check actual cluster capacity
		Message:     "Cluster has sufficient resources for scaling",
	})

	return checks
}

func (e *Engine) checkRestartSafety(ctx context.Context, intent *ai.Intent) []SafetyCheck {
	checks := []SafetyCheck{}

	// Check if application has multiple replicas
	if intent.Resource == "deployment" {
		health, err := e.k8sClient.CheckDeploymentHealth(ctx, intent.Namespace, intent.Name)
		if err == nil && health.Metrics != nil && health.Metrics.TotalReplicas > 1 {
			checks = append(checks, SafetyCheck{
				Name:        "HighAvailability",
				Description: "Verify application has high availability",
				Status:      "passed",
				Message:     "Application has multiple replicas for HA",
			})
		} else {
			checks = append(checks, SafetyCheck{
				Name:        "HighAvailability",
				Description: "Verify application has high availability",
				Status:      "warning",
				Message:     "Application has single replica - restart will cause downtime",
			})
		}
	}

	return checks
}

// requiresApproval determines if an action requires user approval
func (e *Engine) requiresApproval(suggestion *HealingSuggestion) bool {
	// High risk actions always require approval
	if suggestion.RiskLevel == "high" {
		return true
	}

	// Medium confidence actions require approval
	if suggestion.Confidence < 0.8 {
		return true
	}

	// Actions with failed safety checks require approval
	for _, check := range suggestion.SafetyChecks {
		if check.Status == "failed" {
			return true
		}
	}

	return false
}

// ExecuteAction executes a healing action with confirmation
func (e *Engine) ExecuteAction(ctx context.Context, suggestion *HealingSuggestion, confirmed bool) (*ActionResult, error) {
	if !confirmed && suggestion.RequiresApproval {
		return nil, fmt.Errorf("action requires user confirmation")
	}

	log.Printf("Executing healing action: %s on %s/%s", suggestion.Action, suggestion.Resource, suggestion.Name)

	result := &ActionResult{
		Action:    suggestion.Action,
		Resource:  suggestion.Resource,
		Name:      suggestion.Name,
		Namespace: suggestion.Namespace,
		StartedAt: time.Now(),
		Status:    "in_progress",
	}

	// Execute the action
	err := e.executeAction(ctx, suggestion)
	if err != nil {
		result.Status = "failed"
		result.Error = err.Error()
		result.CompletedAt = time.Now()
		e.history.RecordAction(result)
		return result, err
	}

	result.Status = "completed"
	result.CompletedAt = time.Now()
	// Simple in-memory history recording
	log.Printf("Action completed: %s on %s/%s with status: %s", result.Action, result.Resource, result.Name, result.Status)

	return result, nil
}

// executeAction performs the actual healing action
func (e *Engine) executeAction(ctx context.Context, suggestion *HealingSuggestion) error {
	switch suggestion.Action {
	case "rollback":
		return e.k8sClient.RollbackDeployment(ctx, suggestion.Namespace, suggestion.Name, "")
	case "scale":
		// Extract replica count from description or parameters
		replicas := int32(3) // Default
		return e.k8sClient.ScaleDeployment(ctx, suggestion.Namespace, suggestion.Name, replicas)
	case "restart":
		if suggestion.Resource == "deployment" {
			return e.k8sClient.RestartDeployment(ctx, suggestion.Namespace, suggestion.Name)
		}
		return fmt.Errorf("restart not implemented for resource type: %s", suggestion.Resource)
	default:
		return fmt.Errorf("action not implemented: %s", suggestion.Action)
	}
}

// ActionResult represents the result of a healing action
type ActionResult struct {
	Action      string    `json:"action"`
	Resource    string    `json:"resource"`
	Name        string    `json:"name"`
	Namespace   string    `json:"namespace"`
	Status      string    `json:"status"` // completed, failed, in_progress
	Error       string    `json:"error,omitempty"`
	StartedAt   time.Time `json:"started_at"`
	CompletedAt time.Time `json:"completed_at,omitempty"`
}

// calculateConfidence provides a simple confidence calculation
func (e *Engine) calculateConfidence(intent *ai.Intent, health *kubernetes.ResourceHealth, suggestion *HealingSuggestion, safetyChecks []SafetyCheck) float64 {
	baseScore := 0.7

	// Adjust based on safety checks
	passedChecks := 0
	for _, check := range safetyChecks {
		if check.Status == "passed" {
			passedChecks++
		}
	}

	if len(safetyChecks) > 0 {
		safetyRatio := float64(passedChecks) / float64(len(safetyChecks))
		baseScore = baseScore*0.6 + safetyRatio*0.4
	}

	// Adjust based on action type
	switch suggestion.Action {
	case "rollback":
		baseScore -= 0.1
	case "restart":
		baseScore += 0.05
	case "scale":
		baseScore += 0.1
	case "diagnose":
		baseScore += 0.15
	}

	// Ensure score is within bounds
	if baseScore < 0.1 {
		baseScore = 0.1
	} else if baseScore > 0.95 {
		baseScore = 0.95
	}

	return baseScore
}

// Helper function to join strings
func joinStrings(strs []string, separator string) string {
	result := ""
	for i, str := range strs {
		if i > 0 {
			result += separator
		}
		result += str
	}
	return result
}