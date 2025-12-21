// Copyright 2025 KubeGraf Contributors
// SPDX-License-Identifier: Apache-2.0

package incidents

import (
	"fmt"
	"time"
)

// FixActionType defines the type of fix action
type FixActionType string

const (
	ActionTypePreviewPatch FixActionType = "PREVIEW_PATCH"
	ActionTypeScale        FixActionType = "SCALE"
	ActionTypeRestart      FixActionType = "RESTART"
	ActionTypeRollback     FixActionType = "ROLLBACK"
	ActionTypeDeletePod    FixActionType = "DELETE_POD"
	ActionTypeViewLogs     FixActionType = "VIEW_LOGS"     // Opens logs viewer (UI-only action)
	ActionTypeViewEvents   FixActionType = "VIEW_EVENTS"   // Opens events viewer (UI-only action)
	ActionTypeDescribe     FixActionType = "DESCRIBE"      // Shows kubectl describe output
)

// FixAction represents a clickable action that can be taken on a recommendation
type FixAction struct {
	// Label is the button text shown to users (e.g., "Restart Pod", "Propose Fix")
	Label string `json:"label"`
	// Type identifies the action type for the backend
	Type FixActionType `json:"type"`
	// Description explains what this action will do
	Description string `json:"description"`
	// Safe indicates if this action is considered safe (non-destructive)
	Safe bool `json:"safe"`
	// RequiresConfirmation indicates if user must confirm before execution
	RequiresConfirmation bool `json:"requiresConfirmation"`
}

// FixPreviewRequest represents a request to preview a fix
type FixPreviewRequest struct {
	IncidentID       string `json:"incidentId"`
	RecommendationID string `json:"recommendationId"`
}

// FixPreviewResponse represents the response for a fix preview
type FixPreviewResponse struct {
	// Valid indicates if the fix can be applied
	Valid bool `json:"valid"`
	// Description of what the fix will do
	Description string `json:"description"`
	// Diff shows the changes in human-readable format
	Diff string `json:"diff"`
	// DryRunCmd is the kubectl command for dry-run validation
	DryRunCmd string `json:"dryRunCmd"`
	// ApplyCmd is the kubectl command to apply the fix
	ApplyCmd string `json:"applyCmd"`
	// Risks associated with this fix
	Risks []string `json:"risks,omitempty"`
	// TargetResource being modified
	TargetResource KubeResourceRef `json:"targetResource"`
	// Changes contains structured change information
	Changes []FixChange `json:"changes,omitempty"`
	// ValidationError if the fix cannot be applied
	ValidationError string `json:"validationError,omitempty"`
	// GeneratedAt timestamp
	GeneratedAt time.Time `json:"generatedAt"`
}

// FixApplyRequest represents a request to apply a fix
type FixApplyRequest struct {
	IncidentID       string `json:"incidentId"`
	RecommendationID string `json:"recommendationId"`
	// DryRun if true, only validates without applying
	DryRun bool `json:"dryRun"`
}

// FixApplyResponse represents the response after applying a fix
type FixApplyResponse struct {
	// Success indicates if the fix was applied successfully
	Success bool `json:"success"`
	// Message describes the result
	Message string `json:"message"`
	// DryRun indicates if this was a dry run
	DryRun bool `json:"dryRun"`
	// Changes describes what was changed
	Changes []string `json:"changes,omitempty"`
	// Error message if the fix failed
	Error string `json:"error,omitempty"`
	// RollbackCmd to undo the fix if needed
	RollbackCmd string `json:"rollbackCmd,omitempty"`
	// AppliedAt timestamp
	AppliedAt time.Time `json:"appliedAt"`
}

// FixActionLog represents a logged fix action for audit
type FixActionLog struct {
	Timestamp        time.Time       `json:"timestamp"`
	IncidentID       string          `json:"incidentId"`
	RecommendationID string          `json:"recommendationId"`
	ActionType       FixActionType   `json:"actionType"`
	TargetResource   KubeResourceRef `json:"targetResource"`
	DryRun           bool            `json:"dryRun"`
	Success          bool            `json:"success"`
	Error            string          `json:"error,omitempty"`
	User             string          `json:"user,omitempty"`
}

// SafeFixActions contains pre-defined safe actions for common scenarios
var SafeFixActions = map[FailurePattern][]FixAction{
	PatternRestartStorm: {
		{
			Label:                "Restart Pod",
			Type:                 ActionTypeRestart,
			Description:          "Delete the pod to trigger recreation by its controller",
			Safe:                 true,
			RequiresConfirmation: true,
		},
		{
			Label:                "Propose Memory Increase",
			Type:                 ActionTypePreviewPatch,
			Description:          "Preview a patch to increase memory limits",
			Safe:                 true,
			RequiresConfirmation: true,
		},
	},
	PatternOOMPressure: {
		{
			Label:                "Propose Memory Increase",
			Type:                 ActionTypePreviewPatch,
			Description:          "Preview a patch to increase memory limits by 50%",
			Safe:                 true,
			RequiresConfirmation: true,
		},
	},
	PatternCrashLoop: {
		{
			Label:                "Restart Pod",
			Type:                 ActionTypeRestart,
			Description:          "Delete the pod to get a fresh start",
			Safe:                 true,
			RequiresConfirmation: true,
		},
		{
			Label:                "Rollback Deployment",
			Type:                 ActionTypeRollback,
			Description:          "Rollback to the previous deployment revision",
			Safe:                 false,
			RequiresConfirmation: true,
		},
	},
	PatternNoReadyEndpoints: {
		{
			Label:                "Restart Deployment",
			Type:                 ActionTypeRestart,
			Description:          "Trigger a rolling restart of the deployment",
			Safe:                 true,
			RequiresConfirmation: true,
		},
		{
			Label:                "Scale Up",
			Type:                 ActionTypeScale,
			Description:          "Increase replica count to ensure availability",
			Safe:                 true,
			RequiresConfirmation: true,
		},
	},
	PatternImagePullFailure: {
		{
			Label:                "Restart Pod",
			Type:                 ActionTypeRestart,
			Description:          "Delete the pod to retry image pull",
			Safe:                 true,
			RequiresConfirmation: true,
		},
	},
}

// GetActionsForPattern returns the safe fix actions for a given failure pattern
func GetActionsForPattern(pattern FailurePattern) []FixAction {
	actions, exists := SafeFixActions[pattern]
	if !exists {
		return nil
	}
	return actions
}

// GetPrimaryAction returns the first/primary action for a pattern, if any
func GetPrimaryAction(pattern FailurePattern) *FixAction {
	actions := GetActionsForPattern(pattern)
	if len(actions) == 0 {
		return nil
	}
	return &actions[0]
}

// ValidateFixAction checks if a fix action is safe to execute
func ValidateFixAction(action *FixAction, resource KubeResourceRef) error {
	// Safety rule: Never mutate RBAC resources
	if resource.Kind == "Role" || resource.Kind == "ClusterRole" ||
		resource.Kind == "RoleBinding" || resource.Kind == "ClusterRoleBinding" {
		return fmt.Errorf("fix actions on RBAC resources are not allowed")
	}

	// Safety rule: Never mutate CRDs
	if resource.Kind == "CustomResourceDefinition" {
		return fmt.Errorf("fix actions on CRDs are not allowed")
	}

	// Safety rule: Never mutate cluster-scoped resources
	if resource.Namespace == "" && resource.Kind != "Namespace" {
		return fmt.Errorf("fix actions on cluster-scoped resources are not allowed")
	}

	// Safety rule: Never mutate system namespaces (can be overridden)
	systemNamespaces := []string{"kube-system", "kube-public", "kube-node-lease"}
	for _, ns := range systemNamespaces {
		if resource.Namespace == ns {
			return fmt.Errorf("fix actions in %s namespace require extra confirmation", ns)
		}
	}

	return nil
}

// GenerateRestartCommand generates the kubectl command for restarting a resource
func GenerateRestartCommand(resource KubeResourceRef, dryRun bool) string {
	dryRunFlag := ""
	if dryRun {
		dryRunFlag = " --dry-run=client"
	}

	switch resource.Kind {
	case "Pod":
		return fmt.Sprintf("kubectl delete pod %s -n %s%s", resource.Name, resource.Namespace, dryRunFlag)
	case "Deployment":
		return fmt.Sprintf("kubectl rollout restart deployment/%s -n %s%s", resource.Name, resource.Namespace, dryRunFlag)
	case "StatefulSet":
		return fmt.Sprintf("kubectl rollout restart statefulset/%s -n %s%s", resource.Name, resource.Namespace, dryRunFlag)
	case "DaemonSet":
		return fmt.Sprintf("kubectl rollout restart daemonset/%s -n %s%s", resource.Name, resource.Namespace, dryRunFlag)
	default:
		return fmt.Sprintf("# Restart not supported for %s", resource.Kind)
	}
}

// GenerateScaleCommand generates the kubectl command for scaling a resource
func GenerateScaleCommand(resource KubeResourceRef, replicas int, dryRun bool) string {
	dryRunFlag := ""
	if dryRun {
		dryRunFlag = " --dry-run=client"
	}

	switch resource.Kind {
	case "Deployment":
		return fmt.Sprintf("kubectl scale deployment/%s -n %s --replicas=%d%s", resource.Name, resource.Namespace, replicas, dryRunFlag)
	case "StatefulSet":
		return fmt.Sprintf("kubectl scale statefulset/%s -n %s --replicas=%d%s", resource.Name, resource.Namespace, replicas, dryRunFlag)
	case "ReplicaSet":
		return fmt.Sprintf("kubectl scale replicaset/%s -n %s --replicas=%d%s", resource.Name, resource.Namespace, replicas, dryRunFlag)
	default:
		return fmt.Sprintf("# Scale not supported for %s", resource.Kind)
	}
}

// GenerateRollbackCommand generates the kubectl command for rolling back a resource
func GenerateRollbackCommand(resource KubeResourceRef, revision int64, dryRun bool) string {
	dryRunFlag := ""
	if dryRun {
		dryRunFlag = " --dry-run=client"
	}

	revisionFlag := ""
	if revision > 0 {
		revisionFlag = fmt.Sprintf(" --to-revision=%d", revision)
	}

	switch resource.Kind {
	case "Deployment":
		return fmt.Sprintf("kubectl rollout undo deployment/%s -n %s%s%s", resource.Name, resource.Namespace, revisionFlag, dryRunFlag)
	case "StatefulSet":
		return fmt.Sprintf("kubectl rollout undo statefulset/%s -n %s%s%s", resource.Name, resource.Namespace, revisionFlag, dryRunFlag)
	case "DaemonSet":
		return fmt.Sprintf("kubectl rollout undo daemonset/%s -n %s%s%s", resource.Name, resource.Namespace, revisionFlag, dryRunFlag)
	default:
		return fmt.Sprintf("# Rollback not supported for %s", resource.Kind)
	}
}

// GenerateMemoryPatchDiff generates a diff for a memory limit increase
func GenerateMemoryPatchDiff(containerName string, currentLimit, newLimit string) string {
	return fmt.Sprintf(`--- current
+++ proposed
@@ containers[name=%s].resources.limits @@
-  memory: %s
+  memory: %s
`, containerName, currentLimit, newLimit)
}

// CalculateMemoryIncrease calculates a new memory limit (50%% increase)
func CalculateMemoryIncrease(currentLimit string) string {
	// Simple implementation - just append 50% more
	// In production, this would parse the value properly
	if currentLimit == "" {
		return "512Mi"
	}
	
	// For simplicity, if it ends in Mi, increase by 50%
	if len(currentLimit) > 2 && currentLimit[len(currentLimit)-2:] == "Mi" {
		// Parse the number
		var value int
		fmt.Sscanf(currentLimit, "%dMi", &value)
		if value > 0 {
			newValue := value + (value / 2) // 50% increase
			return fmt.Sprintf("%dMi", newValue)
		}
	}
	
	// For Gi values
	if len(currentLimit) > 2 && currentLimit[len(currentLimit)-2:] == "Gi" {
		var value float64
		fmt.Sscanf(currentLimit, "%fGi", &value)
		if value > 0 {
			newValue := value * 1.5 // 50% increase
			return fmt.Sprintf("%.1fGi", newValue)
		}
	}

	// Default fallback
	return "512Mi"
}

