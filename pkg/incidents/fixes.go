// Copyright 2025 KubeGraf Contributors
// SPDX-License-Identifier: Apache-2.0

package incidents

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
)

// FixExecutor safely executes proposed fixes with preview and dry-run support.
type FixExecutor struct {
	// KubeClient interface for Kubernetes operations (set by the main app)
	kubeExecutor KubeFixExecutor
}

// KubeFixExecutor is the interface for Kubernetes fix operations.
// This is implemented by the main application to avoid circular dependencies.
type KubeFixExecutor interface {
	// GetResource retrieves a resource's current state
	GetResource(ctx context.Context, ref KubeResourceRef) (map[string]interface{}, error)
	// PatchResource applies a patch to a resource
	PatchResource(ctx context.Context, ref KubeResourceRef, patchData []byte, dryRun bool) (map[string]interface{}, error)
	// ScaleResource scales a deployment/statefulset
	ScaleResource(ctx context.Context, ref KubeResourceRef, replicas int32, dryRun bool) error
	// RestartResource triggers a rolling restart
	RestartResource(ctx context.Context, ref KubeResourceRef, dryRun bool) error
	// RollbackResource rolls back a deployment
	RollbackResource(ctx context.Context, ref KubeResourceRef, revision int64, dryRun bool) error
	// DeleteResource deletes a resource
	DeleteResource(ctx context.Context, ref KubeResourceRef, dryRun bool) error
	// GetPodLogs retrieves logs from a pod (current or previous container)
	GetPodLogs(ctx context.Context, namespace, podName, container string, tailLines int64, previous bool) (string, error)
}

// NewFixExecutor creates a new fix executor.
func NewFixExecutor(executor KubeFixExecutor) *FixExecutor {
	return &FixExecutor{
		kubeExecutor: executor,
	}
}

// FixPreview represents the preview of a fix before execution.
type FixPreview struct {
	// Fix is the original proposed fix
	Fix *ProposedFix `json:"fix"`
	// CurrentState is the current state of the resource
	CurrentState map[string]interface{} `json:"currentState,omitempty"`
	// ProposedState is what the resource will look like after the fix
	ProposedState map[string]interface{} `json:"proposedState,omitempty"`
	// Diff is a human-readable diff
	Diff string `json:"diff"`
	// Commands are the kubectl commands that would be executed
	Commands []string `json:"commands"`
	// Risks associated with this fix
	Risks []string `json:"risks"`
	// Valid indicates if the fix can be applied
	Valid bool `json:"valid"`
	// ValidationError if the fix cannot be applied
	ValidationError string `json:"validationError,omitempty"`
}

// FixResult represents the result of executing a fix.
type FixResult struct {
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
	// RollbackAvailable indicates if rollback is possible
	RollbackAvailable bool `json:"rollbackAvailable"`
	// RollbackCommand to undo the fix
	RollbackCommand string `json:"rollbackCommand,omitempty"`
}

// Preview generates a preview of the fix without making any changes.
func (e *FixExecutor) Preview(ctx context.Context, fix *ProposedFix) (*FixPreview, error) {
	if fix == nil {
		return nil, fmt.Errorf("fix cannot be nil")
	}

	preview := &FixPreview{
		Fix:      fix,
		Commands: e.generateCommands(fix),
		Risks:    e.assessRisks(fix),
		Valid:    true,
	}

	// If we have a kube executor, get current state
	if e.kubeExecutor != nil {
		currentState, err := e.kubeExecutor.GetResource(ctx, fix.TargetResource)
		if err != nil {
			preview.Valid = false
			preview.ValidationError = fmt.Sprintf("failed to get current state: %v", err)
			return preview, nil
		}
		preview.CurrentState = currentState

		// Generate proposed state based on changes
		preview.ProposedState = e.generateProposedState(currentState, fix.Changes)
		preview.Diff = e.generateDiff(currentState, preview.ProposedState, fix)
	} else {
		// Generate command-based preview
		preview.Diff = e.generateCommandDiff(fix)
	}

	return preview, nil
}

// DryRun executes the fix in dry-run mode to validate it.
func (e *FixExecutor) DryRun(ctx context.Context, fix *ProposedFix) (*FixResult, error) {
	if fix == nil {
		return nil, fmt.Errorf("fix cannot be nil")
	}

	if e.kubeExecutor == nil {
		return &FixResult{
			Success: true,
			Message: "Dry run validation passed (no executor configured for actual validation)",
			DryRun:  true,
		}, nil
	}

	var err error
	result := &FixResult{
		DryRun: true,
	}

	switch fix.Type {
	case FixTypePatch:
		patchData, patchErr := e.buildPatchData(fix)
		if patchErr != nil {
			result.Success = false
			result.Error = patchErr.Error()
			return result, nil
		}
		_, err = e.kubeExecutor.PatchResource(ctx, fix.TargetResource, patchData, true)

	case FixTypeScale:
		// Extract replicas from changes
		replicas := int32(3) // default
		for _, change := range fix.Changes {
			if strings.Contains(change.Path, "replicas") {
				if v, ok := change.NewValue.(int); ok {
					replicas = int32(v)
				}
			}
		}
		err = e.kubeExecutor.ScaleResource(ctx, fix.TargetResource, replicas, true)

	case FixTypeRestart:
		err = e.kubeExecutor.RestartResource(ctx, fix.TargetResource, true)

	case FixTypeRollback:
		err = e.kubeExecutor.RollbackResource(ctx, fix.TargetResource, 0, true)

	case FixTypeDelete:
		err = e.kubeExecutor.DeleteResource(ctx, fix.TargetResource, true)

	default:
		err = fmt.Errorf("unsupported fix type: %s", fix.Type)
	}

	if err != nil {
		result.Success = false
		result.Error = err.Error()
		result.Message = "Dry run failed"
	} else {
		result.Success = true
		result.Message = "Dry run succeeded - fix can be applied"
		result.Changes = e.describeChanges(fix)
	}

	return result, nil
}

// Apply executes the fix for real.
func (e *FixExecutor) Apply(ctx context.Context, fix *ProposedFix) (*FixResult, error) {
	if fix == nil {
		return nil, fmt.Errorf("fix cannot be nil")
	}

	// Safety check
	if fix.RequiresConfirmation {
		// In a real implementation, this would require UI confirmation
		// For now, we allow it but log a warning
	}

	if e.kubeExecutor == nil {
		return nil, fmt.Errorf("no executor configured - cannot apply fix")
	}

	var err error
	result := &FixResult{
		DryRun: false,
	}

	switch fix.Type {
	case FixTypePatch:
		patchData, patchErr := e.buildPatchData(fix)
		if patchErr != nil {
			result.Success = false
			result.Error = patchErr.Error()
			return result, nil
		}
		_, err = e.kubeExecutor.PatchResource(ctx, fix.TargetResource, patchData, false)

	case FixTypeScale:
		replicas := int32(3)
		for _, change := range fix.Changes {
			if strings.Contains(change.Path, "replicas") {
				if v, ok := change.NewValue.(int); ok {
					replicas = int32(v)
				}
			}
		}
		err = e.kubeExecutor.ScaleResource(ctx, fix.TargetResource, replicas, false)

	case FixTypeRestart:
		err = e.kubeExecutor.RestartResource(ctx, fix.TargetResource, false)

	case FixTypeRollback:
		err = e.kubeExecutor.RollbackResource(ctx, fix.TargetResource, 0, false)

	case FixTypeDelete:
		err = e.kubeExecutor.DeleteResource(ctx, fix.TargetResource, false)

	default:
		err = fmt.Errorf("unsupported fix type: %s", fix.Type)
	}

	if err != nil {
		result.Success = false
		result.Error = err.Error()
		result.Message = "Fix application failed"
	} else {
		result.Success = true
		result.Message = "Fix applied successfully"
		result.Changes = e.describeChanges(fix)

		// Set rollback info if available
		if fix.RollbackInfo != nil && fix.RollbackInfo.CanRollback {
			result.RollbackAvailable = true
			result.RollbackCommand = fix.RollbackInfo.RollbackCmd
		}
	}

	return result, nil
}

// generateCommands generates the kubectl commands for a fix.
func (e *FixExecutor) generateCommands(fix *ProposedFix) []string {
	commands := []string{}

	if fix.DryRunCmd != "" {
		commands = append(commands, "# Dry run:")
		commands = append(commands, fix.DryRunCmd)
	}

	if fix.ApplyCmd != "" {
		commands = append(commands, "# Apply:")
		commands = append(commands, fix.ApplyCmd)
	}

	if fix.RollbackInfo != nil && fix.RollbackInfo.RollbackCmd != "" {
		commands = append(commands, "# Rollback (if needed):")
		commands = append(commands, fix.RollbackInfo.RollbackCmd)
	}

	return commands
}

// assessRisks identifies risks associated with a fix.
func (e *FixExecutor) assessRisks(fix *ProposedFix) []string {
	risks := []string{}

	switch fix.Type {
	case FixTypeRestart:
		risks = append(risks, "Service disruption during rolling restart")
		risks = append(risks, "In-flight requests may fail")

	case FixTypeScale:
		risks = append(risks, "Increased resource consumption")
		risks = append(risks, "May trigger additional scaling events")

	case FixTypeRollback:
		risks = append(risks, "May roll back to a version with different issues")
		risks = append(risks, "Configuration changes since last version will be lost")

	case FixTypePatch:
		for _, change := range fix.Changes {
			if strings.Contains(change.Path, "memory") {
				risks = append(risks, "Memory changes will cause pod restart")
			}
			if strings.Contains(change.Path, "cpu") {
				risks = append(risks, "CPU changes may affect application performance")
			}
			if strings.Contains(change.Path, "probe") {
				risks = append(risks, "Probe changes may cause temporary unavailability")
			}
		}

	case FixTypeDelete:
		risks = append(risks, "Resource will be permanently deleted")
		risks = append(risks, "Data loss may occur")
	}

	if !fix.Safe {
		risks = append(risks, "This fix is marked as potentially unsafe")
	}

	return risks
}

// generateProposedState creates the proposed state after applying changes.
func (e *FixExecutor) generateProposedState(current map[string]interface{}, changes []FixChange) map[string]interface{} {
	// Deep copy current state
	proposed := deepCopyMap(current)

	// Apply changes
	for _, change := range changes {
		setNestedValue(proposed, change.Path, change.NewValue)
	}

	return proposed
}

// generateDiff creates a human-readable diff.
func (e *FixExecutor) generateDiff(current, proposed map[string]interface{}, fix *ProposedFix) string {
	var diff strings.Builder

	diff.WriteString(fmt.Sprintf("--- %s/%s (current)\n", fix.TargetResource.Namespace, fix.TargetResource.Name))
	diff.WriteString(fmt.Sprintf("+++ %s/%s (proposed)\n", fix.TargetResource.Namespace, fix.TargetResource.Name))
	diff.WriteString("@@ Changes @@\n")

	for _, change := range fix.Changes {
		if change.OldValue != nil {
			diff.WriteString(fmt.Sprintf("- %s: %v\n", change.Path, change.OldValue))
		}
		diff.WriteString(fmt.Sprintf("+ %s: %v\n", change.Path, change.NewValue))
		if change.Description != "" {
			diff.WriteString(fmt.Sprintf("  # %s\n", change.Description))
		}
	}

	return diff.String()
}

// generateCommandDiff creates a diff based on commands when no executor is available.
func (e *FixExecutor) generateCommandDiff(fix *ProposedFix) string {
	var diff strings.Builder

	diff.WriteString(fmt.Sprintf("# Fix: %s\n", fix.Description))
	diff.WriteString(fmt.Sprintf("# Target: %s\n", fix.TargetResource.String()))
	diff.WriteString("\n")

	for _, change := range fix.Changes {
		diff.WriteString(fmt.Sprintf("Change: %s\n", change.Path))
		if change.OldValue != nil {
			diff.WriteString(fmt.Sprintf("  From: %v\n", change.OldValue))
		}
		diff.WriteString(fmt.Sprintf("  To:   %v\n", change.NewValue))
		if change.Description != "" {
			diff.WriteString(fmt.Sprintf("  Note: %s\n", change.Description))
		}
		diff.WriteString("\n")
	}

	return diff.String()
}

// buildPatchData creates the JSON patch data for a patch operation.
func (e *FixExecutor) buildPatchData(fix *ProposedFix) ([]byte, error) {
	patch := make(map[string]interface{})

	for _, change := range fix.Changes {
		setNestedValue(patch, change.Path, change.NewValue)
	}

	return json.Marshal(patch)
}

// describeChanges creates human-readable descriptions of changes.
func (e *FixExecutor) describeChanges(fix *ProposedFix) []string {
	descriptions := []string{}

	for _, change := range fix.Changes {
		desc := change.Description
		if desc == "" {
			desc = fmt.Sprintf("Changed %s to %v", change.Path, change.NewValue)
		}
		descriptions = append(descriptions, desc)
	}

	return descriptions
}

// Helper functions

// deepCopyMap creates a deep copy of a map.
func deepCopyMap(m map[string]interface{}) map[string]interface{} {
	cp := make(map[string]interface{})
	for k, v := range m {
		if innerMap, ok := v.(map[string]interface{}); ok {
			cp[k] = deepCopyMap(innerMap)
		} else if innerSlice, ok := v.([]interface{}); ok {
			cp[k] = deepCopySlice(innerSlice)
		} else {
			cp[k] = v
		}
	}
	return cp
}

// deepCopySlice creates a deep copy of a slice.
func deepCopySlice(s []interface{}) []interface{} {
	cp := make([]interface{}, len(s))
	for i, v := range s {
		if innerMap, ok := v.(map[string]interface{}); ok {
			cp[i] = deepCopyMap(innerMap)
		} else if innerSlice, ok := v.([]interface{}); ok {
			cp[i] = deepCopySlice(innerSlice)
		} else {
			cp[i] = v
		}
	}
	return cp
}

// setNestedValue sets a value at a nested path in a map.
// Path format: "spec.template.spec.containers[0].resources.limits.memory"
func setNestedValue(m map[string]interface{}, path string, value interface{}) {
	parts := strings.Split(path, ".")
	current := m

	for i, part := range parts {
		// Handle array indices
		if idx := strings.Index(part, "["); idx != -1 {
			key := part[:idx]
			// For now, we'll simplify and just use the key
			part = key
		}

		if i == len(parts)-1 {
			// Last part - set the value
			current[part] = value
		} else {
			// Intermediate part - create nested map if needed
			if _, exists := current[part]; !exists {
				current[part] = make(map[string]interface{})
			}
			if nested, ok := current[part].(map[string]interface{}); ok {
				current = nested
			} else {
				// Can't traverse further
				return
			}
		}
	}
}

// FixValidator validates proposed fixes before execution.
type FixValidator struct {
	// AllowedFixTypes are the fix types that can be executed
	AllowedFixTypes []FixType
	// MaxScaleReplicas is the maximum number of replicas for scale operations
	MaxScaleReplicas int32
	// RequireConfirmation requires user confirmation for all fixes
	RequireConfirmation bool
}

// NewFixValidator creates a new fix validator with safe defaults.
func NewFixValidator() *FixValidator {
	return &FixValidator{
		AllowedFixTypes: []FixType{
			FixTypePatch,
			FixTypeScale,
			FixTypeRestart,
			FixTypeRollback,
		},
		MaxScaleReplicas:    10,
		RequireConfirmation: true,
	}
}

// Validate checks if a fix is safe to execute.
func (v *FixValidator) Validate(fix *ProposedFix) error {
	if fix == nil {
		return fmt.Errorf("fix is nil")
	}

	// Check fix type is allowed
	allowed := false
	for _, t := range v.AllowedFixTypes {
		if t == fix.Type {
			allowed = true
			break
		}
	}
	if !allowed {
		return fmt.Errorf("fix type %s is not allowed", fix.Type)
	}

	// Check namespace-scoped (no cluster-wide changes)
	if fix.TargetResource.Namespace == "" && fix.TargetResource.Kind != "Namespace" {
		// Only allow cluster-scoped resources for Namespace kind
		if fix.TargetResource.Kind == "Node" || fix.TargetResource.Kind == "ClusterRole" ||
			fix.TargetResource.Kind == "ClusterRoleBinding" {
			return fmt.Errorf("cluster-scoped resource changes are not allowed for safety")
		}
	}

	// Check scale limits
	if fix.Type == FixTypeScale {
		for _, change := range fix.Changes {
			if strings.Contains(change.Path, "replicas") {
				if replicas, ok := change.NewValue.(int); ok {
					if int32(replicas) > v.MaxScaleReplicas {
						return fmt.Errorf("scale to %d replicas exceeds maximum of %d", replicas, v.MaxScaleReplicas)
					}
				}
			}
		}
	}

	// Delete operations on production namespaces should be blocked
	if fix.Type == FixTypeDelete {
		if fix.TargetResource.Namespace == "production" || fix.TargetResource.Namespace == "prod" {
			return fmt.Errorf("delete operations are not allowed in production namespace")
		}
	}

	return nil
}

// IsSafe returns true if the fix is considered safe.
func (v *FixValidator) IsSafe(fix *ProposedFix) bool {
	return v.Validate(fix) == nil && fix.Safe
}

