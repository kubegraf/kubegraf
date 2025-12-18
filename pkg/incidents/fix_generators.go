// Copyright 2025 KubeGraf Contributors
// SPDX-License-Identifier: Apache-2.0

package incidents

import (
	"fmt"
	"time"
)

// FixGenerator generates fixes for specific failure patterns
type FixGenerator interface {
	// CanGenerate checks if this generator can handle the incident
	CanGenerate(incident *Incident) bool
	// GenerateFixes creates fix proposals for the incident
	GenerateFixes(incident *Incident) []*ProposedFix
}

// FixGeneratorRegistry holds all registered fix generators
type FixGeneratorRegistry struct {
	generators map[FailurePattern][]FixGenerator
}

// NewFixGeneratorRegistry creates a new registry with default generators
func NewFixGeneratorRegistry() *FixGeneratorRegistry {
	registry := &FixGeneratorRegistry{
		generators: make(map[FailurePattern][]FixGenerator),
	}

	// Register default generators
	registry.Register(PatternRestartStorm, &RestartStormFixGenerator{})
	registry.Register(PatternOOMPressure, &OOMPressureFixGenerator{})
	registry.Register(PatternNoReadyEndpoints, &NoReadyEndpointsFixGenerator{})
	registry.Register(PatternCrashLoop, &CrashLoopFixGenerator{})
	registry.Register(PatternImagePullFailure, &ImagePullFixGenerator{})

	return registry
}

// Register adds a fix generator for a pattern
func (r *FixGeneratorRegistry) Register(pattern FailurePattern, generator FixGenerator) {
	r.generators[pattern] = append(r.generators[pattern], generator)
}

// GenerateFixes creates fixes for an incident
func (r *FixGeneratorRegistry) GenerateFixes(incident *Incident) []*ProposedFix {
	generators, exists := r.generators[incident.Pattern]
	if !exists {
		return nil
	}

	var fixes []*ProposedFix
	for _, gen := range generators {
		if gen.CanGenerate(incident) {
			fixes = append(fixes, gen.GenerateFixes(incident)...)
		}
	}
	return fixes
}

// ========================================
// RESTART_STORM Fix Generator
// ========================================

type RestartStormFixGenerator struct{}

func (g *RestartStormFixGenerator) CanGenerate(incident *Incident) bool {
	return incident.Pattern == PatternRestartStorm &&
		(incident.Resource.Kind == "Pod" || incident.Resource.Kind == "Deployment")
}

func (g *RestartStormFixGenerator) GenerateFixes(incident *Incident) []*ProposedFix {
	var fixes []*ProposedFix

	// Fix 1: Restart pod (delete to trigger recreation)
	if incident.Resource.Kind == "Pod" {
		fixes = append(fixes, &ProposedFix{
			Type:        FixTypeRestart,
			Description: fmt.Sprintf("Delete pod %s to trigger recreation by its controller", incident.Resource.Name),
			DryRunCmd:   GenerateRestartCommand(incident.Resource, true),
			ApplyCmd:    GenerateRestartCommand(incident.Resource, false),
			TargetResource: incident.Resource,
			Safe:        true,
			RequiresConfirmation: true,
		})
	}

	// Fix 2: Restart deployment (rolling restart)
	if incident.Resource.Kind == "Deployment" {
		fixes = append(fixes, &ProposedFix{
			Type:        FixTypeRestart,
			Description: fmt.Sprintf("Trigger rolling restart of deployment %s", incident.Resource.Name),
			DryRunCmd:   GenerateRestartCommand(incident.Resource, true),
			ApplyCmd:    GenerateRestartCommand(incident.Resource, false),
			TargetResource: incident.Resource,
			Safe:        true,
			RequiresConfirmation: true,
		})
	}

	// Fix 3: Memory increase patch (if OOM hints are present)
	if g.hasOOMHints(incident) {
		memoryFix := g.generateMemoryIncreaseFix(incident)
		if memoryFix != nil {
			fixes = append(fixes, memoryFix)
		}
	}

	return fixes
}

func (g *RestartStormFixGenerator) hasOOMHints(incident *Incident) bool {
	for _, symptom := range incident.Symptoms {
		if symptom.Type == SymptomExitCodeOOM || symptom.Type == SymptomMemoryPressure {
			return true
		}
	}
	// Check if diagnosis mentions OOM
	for _, cause := range incident.Diagnosis.ProbableCauses {
		if containsAny(cause, "OOM", "memory", "OutOfMemory") {
			return true
		}
	}
	return false
}

func (g *RestartStormFixGenerator) generateMemoryIncreaseFix(incident *Incident) *ProposedFix {
	// Get current memory limit from signals if available
	currentLimit := "256Mi" // default assumption
	containerName := "main"

	// Try to extract from incident metadata
	if incident.Metadata != nil {
		if limit, ok := incident.Metadata["memoryLimit"].(string); ok {
			currentLimit = limit
		}
		if name, ok := incident.Metadata["containerName"].(string); ok {
			containerName = name
		}
	}

	newLimit := CalculateMemoryIncrease(currentLimit)
	diff := GenerateMemoryPatchDiff(containerName, currentLimit, newLimit)

	return &ProposedFix{
		Type:        FixTypePatch,
		Description: fmt.Sprintf("Increase memory limit from %s to %s (50%% increase)", currentLimit, newLimit),
		PreviewDiff: diff,
		DryRunCmd: fmt.Sprintf("kubectl patch deployment %s -n %s --type=json -p='[{\"op\": \"replace\", \"path\": \"/spec/template/spec/containers/0/resources/limits/memory\", \"value\": \"%s\"}]' --dry-run=client",
			getDeploymentName(incident), incident.Resource.Namespace, newLimit),
		ApplyCmd: fmt.Sprintf("kubectl patch deployment %s -n %s --type=json -p='[{\"op\": \"replace\", \"path\": \"/spec/template/spec/containers/0/resources/limits/memory\", \"value\": \"%s\"}]'",
			getDeploymentName(incident), incident.Resource.Namespace, newLimit),
		TargetResource: KubeResourceRef{
			Kind:      "Deployment",
			Name:      getDeploymentName(incident),
			Namespace: incident.Resource.Namespace,
		},
		Changes: []FixChange{
			{
				Path:     "spec.template.spec.containers[0].resources.limits.memory",
				OldValue: currentLimit,
				NewValue: newLimit,
			},
		},
		Safe:                 true,
		RequiresConfirmation: true,
	}
}

// ========================================
// OOM_PRESSURE Fix Generator
// ========================================

type OOMPressureFixGenerator struct{}

func (g *OOMPressureFixGenerator) CanGenerate(incident *Incident) bool {
	return incident.Pattern == PatternOOMPressure
}

func (g *OOMPressureFixGenerator) GenerateFixes(incident *Incident) []*ProposedFix {
	var fixes []*ProposedFix

	// Get current memory limit
	currentLimit := "256Mi"
	containerName := "main"

	if incident.Metadata != nil {
		if limit, ok := incident.Metadata["memoryLimit"].(string); ok {
			currentLimit = limit
		}
		if name, ok := incident.Metadata["containerName"].(string); ok {
			containerName = name
		}
	}

	newLimit := CalculateMemoryIncrease(currentLimit)
	diff := GenerateMemoryPatchDiff(containerName, currentLimit, newLimit)

	// Primary fix: Increase memory limit
	fixes = append(fixes, &ProposedFix{
		Type:        FixTypePatch,
		Description: fmt.Sprintf("Increase memory limit from %s to %s (50%% increase) to prevent OOM kills", currentLimit, newLimit),
		PreviewDiff: diff,
		DryRunCmd: fmt.Sprintf("kubectl patch deployment %s -n %s --type=json -p='[{\"op\": \"replace\", \"path\": \"/spec/template/spec/containers/0/resources/limits/memory\", \"value\": \"%s\"}]' --dry-run=client",
			getDeploymentName(incident), incident.Resource.Namespace, newLimit),
		ApplyCmd: fmt.Sprintf("kubectl patch deployment %s -n %s --type=json -p='[{\"op\": \"replace\", \"path\": \"/spec/template/spec/containers/0/resources/limits/memory\", \"value\": \"%s\"}]'",
			getDeploymentName(incident), incident.Resource.Namespace, newLimit),
		TargetResource: KubeResourceRef{
			Kind:      "Deployment",
			Name:      getDeploymentName(incident),
			Namespace: incident.Resource.Namespace,
		},
		Changes: []FixChange{
			{
				Path:     "spec.template.spec.containers[0].resources.limits.memory",
				OldValue: currentLimit,
				NewValue: newLimit,
			},
		},
		Safe:                 true,
		RequiresConfirmation: true,
	})

	// Secondary fix: Restart pod to get fresh start
	if incident.Resource.Kind == "Pod" {
		fixes = append(fixes, &ProposedFix{
			Type:           FixTypeRestart,
			Description:    fmt.Sprintf("Delete pod %s to restart with current limits", incident.Resource.Name),
			DryRunCmd:      GenerateRestartCommand(incident.Resource, true),
			ApplyCmd:       GenerateRestartCommand(incident.Resource, false),
			TargetResource: incident.Resource,
			Safe:           true,
			RequiresConfirmation: true,
		})
	}

	return fixes
}

// ========================================
// NO_READY_ENDPOINTS Fix Generator
// ========================================

type NoReadyEndpointsFixGenerator struct{}

func (g *NoReadyEndpointsFixGenerator) CanGenerate(incident *Incident) bool {
	return incident.Pattern == PatternNoReadyEndpoints
}

func (g *NoReadyEndpointsFixGenerator) GenerateFixes(incident *Incident) []*ProposedFix {
	var fixes []*ProposedFix

	// Get deployment name from service
	deploymentName := getDeploymentName(incident)

	// Fix 1: Rolling restart of the deployment
	deploymentRef := KubeResourceRef{
		Kind:      "Deployment",
		Name:      deploymentName,
		Namespace: incident.Resource.Namespace,
	}

	fixes = append(fixes, &ProposedFix{
		Type:           FixTypeRestart,
		Description:    fmt.Sprintf("Trigger rolling restart of deployment %s to bring up healthy pods", deploymentName),
		DryRunCmd:      GenerateRestartCommand(deploymentRef, true),
		ApplyCmd:       GenerateRestartCommand(deploymentRef, false),
		TargetResource: deploymentRef,
		Safe:           true,
		RequiresConfirmation: true,
	})

	// Fix 2: Scale up replicas
	currentReplicas := 1
	newReplicas := 3

	if incident.Metadata != nil {
		if r, ok := incident.Metadata["currentReplicas"].(int); ok {
			currentReplicas = r
			newReplicas = currentReplicas + 2
		}
	}

	fixes = append(fixes, &ProposedFix{
		Type:        FixTypeScale,
		Description: fmt.Sprintf("Scale deployment %s from %d to %d replicas for better availability", deploymentName, currentReplicas, newReplicas),
		PreviewDiff: fmt.Sprintf(`--- current
+++ proposed
@@ spec @@
-  replicas: %d
+  replicas: %d
`, currentReplicas, newReplicas),
		DryRunCmd: GenerateScaleCommand(deploymentRef, newReplicas, true),
		ApplyCmd:  GenerateScaleCommand(deploymentRef, newReplicas, false),
		TargetResource: deploymentRef,
		Changes: []FixChange{
			{
				Path:     "spec.replicas",
				OldValue: currentReplicas,
				NewValue: newReplicas,
			},
		},
		Safe:                 true,
		RequiresConfirmation: true,
	})

	return fixes
}

// ========================================
// CRASHLOOP Fix Generator
// ========================================

type CrashLoopFixGenerator struct{}

func (g *CrashLoopFixGenerator) CanGenerate(incident *Incident) bool {
	return incident.Pattern == PatternCrashLoop
}

func (g *CrashLoopFixGenerator) GenerateFixes(incident *Incident) []*ProposedFix {
	var fixes []*ProposedFix

	// Fix 1: Restart pod
	if incident.Resource.Kind == "Pod" {
		fixes = append(fixes, &ProposedFix{
			Type:           FixTypeRestart,
			Description:    fmt.Sprintf("Delete pod %s to get a fresh start", incident.Resource.Name),
			DryRunCmd:      GenerateRestartCommand(incident.Resource, true),
			ApplyCmd:       GenerateRestartCommand(incident.Resource, false),
			TargetResource: incident.Resource,
			Safe:           true,
			RequiresConfirmation: true,
		})
	}

	// Fix 2: Rollback deployment (if available)
	deploymentRef := KubeResourceRef{
		Kind:      "Deployment",
		Name:      getDeploymentName(incident),
		Namespace: incident.Resource.Namespace,
	}

	fixes = append(fixes, &ProposedFix{
		Type:           FixTypeRollback,
		Description:    fmt.Sprintf("Rollback deployment %s to previous revision", deploymentRef.Name),
		DryRunCmd:      GenerateRollbackCommand(deploymentRef, 0, true),
		ApplyCmd:       GenerateRollbackCommand(deploymentRef, 0, false),
		TargetResource: deploymentRef,
		RollbackInfo: &RollbackInfo{
			CanRollback: true,
		},
		Safe:                 false, // Rollbacks can have side effects
		RequiresConfirmation: true,
	})

	return fixes
}

// ========================================
// IMAGE_PULL_FAILURE Fix Generator
// ========================================

type ImagePullFixGenerator struct{}

func (g *ImagePullFixGenerator) CanGenerate(incident *Incident) bool {
	return incident.Pattern == PatternImagePullFailure
}

func (g *ImagePullFixGenerator) GenerateFixes(incident *Incident) []*ProposedFix {
	var fixes []*ProposedFix

	// Fix 1: Restart pod to retry image pull
	if incident.Resource.Kind == "Pod" {
		fixes = append(fixes, &ProposedFix{
			Type:           FixTypeRestart,
			Description:    fmt.Sprintf("Delete pod %s to retry image pull", incident.Resource.Name),
			DryRunCmd:      GenerateRestartCommand(incident.Resource, true),
			ApplyCmd:       GenerateRestartCommand(incident.Resource, false),
			TargetResource: incident.Resource,
			Safe:           true,
			RequiresConfirmation: true,
		})
	}

	return fixes
}

// ========================================
// Helper Functions
// ========================================

// getDeploymentName extracts the deployment name from an incident
func getDeploymentName(incident *Incident) string {
	// If it's already a deployment
	if incident.Resource.Kind == "Deployment" {
		return incident.Resource.Name
	}

	// Try to extract from metadata
	if incident.Metadata != nil {
		if name, ok := incident.Metadata["deploymentName"].(string); ok {
			return name
		}
		if name, ok := incident.Metadata["ownerName"].(string); ok {
			return name
		}
	}

	// For pods, try to derive from pod name (remove hash suffix)
	podName := incident.Resource.Name
	// Common patterns: app-name-hash-hash, app-name-replicaset-hash
	// Try to extract base name
	if len(podName) > 10 {
		// Find last two dashes and remove suffix
		dashCount := 0
		for i := len(podName) - 1; i >= 0; i-- {
			if podName[i] == '-' {
				dashCount++
				if dashCount == 2 {
					return podName[:i]
				}
			}
		}
	}

	// Fallback: assume same name
	return podName
}

// EnhanceRecommendationsWithActions adds FixAction to recommendations based on pattern
func EnhanceRecommendationsWithActions(incident *Incident, registry *FixGeneratorRegistry) {
	fixes := registry.GenerateFixes(incident)
	if len(fixes) == 0 {
		return
	}

	// Attach fixes to corresponding recommendations
	for i := range incident.Recommendations {
		rec := &incident.Recommendations[i]
		
		// Match fixes to recommendations by type
		for _, fix := range fixes {
			if rec.ProposedFix == nil && matchesRecommendation(rec, fix) {
				rec.ProposedFix = fix
				// Add action based on fix type
				rec.Action = fixToAction(fix)
				break
			}
		}
	}

	// If no recommendations have fixes yet, add the first fix as a new recommendation
	hasFixes := false
	for _, rec := range incident.Recommendations {
		if rec.ProposedFix != nil {
			hasFixes = true
			break
		}
	}

	if !hasFixes && len(fixes) > 0 {
		fix := fixes[0]
		incident.Recommendations = append(incident.Recommendations, Recommendation{
			ID:          fmt.Sprintf("rec-%s-fix", incident.ID),
			Title:       fix.Description,
			Explanation: fmt.Sprintf("Automated fix: %s", fix.Description),
			Risk:        getRiskFromFix(fix),
			Priority:    1,
			ProposedFix: fix,
			Action:      fixToAction(fix),
			Tags:        []string{"automated", "fix"},
		})
	}
}

// matchesRecommendation checks if a fix matches a recommendation
func matchesRecommendation(rec *Recommendation, fix *ProposedFix) bool {
	// Match by keywords in title
	switch fix.Type {
	case FixTypeRestart:
		return containsAny(rec.Title, "Restart", "restart", "Delete", "delete")
	case FixTypePatch:
		return containsAny(rec.Title, "Increase", "increase", "Memory", "memory", "Patch", "patch")
	case FixTypeScale:
		return containsAny(rec.Title, "Scale", "scale", "Replica", "replica")
	case FixTypeRollback:
		return containsAny(rec.Title, "Rollback", "rollback", "Undo", "undo")
	}
	return false
}

// fixToAction converts a ProposedFix to a FixAction
func fixToAction(fix *ProposedFix) *FixAction {
	var actionType FixActionType
	var label string

	switch fix.Type {
	case FixTypeRestart:
		actionType = ActionTypeRestart
		label = "Restart Pod"
		if fix.TargetResource.Kind == "Deployment" {
			label = "Restart Deployment"
		}
	case FixTypePatch:
		actionType = ActionTypePreviewPatch
		label = "Propose Fix"
	case FixTypeScale:
		actionType = ActionTypeScale
		label = "Scale Replicas"
	case FixTypeRollback:
		actionType = ActionTypeRollback
		label = "Rollback"
	default:
		actionType = ActionTypePreviewPatch
		label = "View Fix"
	}

	return &FixAction{
		Label:                label,
		Type:                 actionType,
		Description:          fix.Description,
		Safe:                 fix.Safe,
		RequiresConfirmation: fix.RequiresConfirmation,
	}
}

// getRiskFromFix determines risk level from a fix
func getRiskFromFix(fix *ProposedFix) RecommendationRisk {
	if fix.Safe {
		return RiskLow
	}
	return RiskMedium
}

// CreateFixPreviewResponse creates a preview response for a fix
func CreateFixPreviewResponse(fix *ProposedFix) *FixPreviewResponse {
	risks := []string{}
	if !fix.Safe {
		risks = append(risks, "This fix modifies cluster state")
	}
	if fix.Type == FixTypeRollback {
		risks = append(risks, "Rollback may cause downtime during transition")
	}

	return &FixPreviewResponse{
		Valid:          true,
		Description:    fix.Description,
		Diff:           fix.PreviewDiff,
		DryRunCmd:      fix.DryRunCmd,
		ApplyCmd:       fix.ApplyCmd,
		Risks:          risks,
		TargetResource: fix.TargetResource,
		GeneratedAt:    time.Now(),
	}
}

