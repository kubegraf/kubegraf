// Copyright 2025 KubeGraf Contributors
// SPDX-License-Identifier: Apache-2.0

package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/kubegraf/kubegraf/pkg/instrumentation"
	"github.com/kubegraf/kubegraf/pkg/incidents"
)

// handleIncidentFixes handles GET /api/v2/incidents/{id}/fixes
// Returns recommendedAction + fixPlans (suggest-only)
func (ws *WebServer) handleIncidentFixes(w http.ResponseWriter, r *http.Request, incidentID string) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	if ws.app.incidentIntelligence == nil {
		http.Error(w, "Incident intelligence not initialized", http.StatusServiceUnavailable)
		return
	}

	// Track performance context
	perfCtx := instrumentation.GetRequestContext(r)
	if perfCtx != nil {
		perfCtx.SetTag("incident_id", incidentID)
	}

	// Get incident snapshot
	snapshot, err := ws.getIncidentSnapshot(incidentID)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to get snapshot: %v", err), http.StatusNotFound)
		return
	}

	// Create remediation engine
	engine := incidents.NewRemediationEngine()

	// Generate remediation plan (fast - uses snapshot only)
	plan, err := engine.GenerateRemediation(r.Context(), snapshot, nil)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to generate remediation: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(plan)
}

// handleFixPreview handles POST /api/v2/incidents/{id}/fix-preview
// Input: { fixId }
// Output: diff + dry-run output + rollback plan + risk
func (ws *WebServer) handleFixPreviewV2(w http.ResponseWriter, r *http.Request, incidentID string) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	if ws.app.incidentIntelligence == nil {
		http.Error(w, "Incident intelligence not initialized", http.StatusServiceUnavailable)
		return
	}

	// Parse request body
	var req struct {
		FixID string `json:"fixId"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.FixID == "" {
		http.Error(w, "Missing fixId", http.StatusBadRequest)
		return
	}

	// Get incident snapshot
	snapshot, err := ws.getIncidentSnapshot(incidentID)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to get snapshot: %v", err), http.StatusNotFound)
		return
	}

	// Create remediation engine
	engine := incidents.NewRemediationEngine()

	// Generate remediation plan
	plan, err := engine.GenerateRemediation(r.Context(), snapshot, nil)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to generate remediation: %v", err), http.StatusInternalServerError)
		return
	}

	// Find the fix plan
	var fixPlan *incidents.FixPlan
	for _, fp := range plan.FixPlans {
		if fp.ID == req.FixID {
			fixPlan = fp
			break
		}
	}

	if fixPlan == nil {
		http.Error(w, "Fix plan not found", http.StatusNotFound)
		return
	}

	// Execute actual dry-run if supported
	var dryRunOutput string
	var dryRunError string
	if fixPlan.Preview.DryRunSupported {
		// Convert FixPlan to ProposedFix for dry-run execution
		proposedFix := fixPlanToProposedFix(fixPlan, snapshot)

		// Get fix executor
		fixExecutor := ws.getKubeFixExecutor()
		if fixExecutor != nil {
			executor := incidents.NewFixExecutor(fixExecutor)
			dryRunResult, err := executor.DryRun(r.Context(), proposedFix)
			if err != nil {
				dryRunError = fmt.Sprintf("Dry-run execution failed: %v", err)
			} else if dryRunResult != nil {
				if dryRunResult.Success {
					dryRunOutput = fmt.Sprintf("Dry-run succeeded: %s", dryRunResult.Message)
					if len(dryRunResult.Changes) > 0 {
						dryRunOutput += "\n\nChanges that would be made:\n"
						for _, change := range dryRunResult.Changes {
							dryRunOutput += fmt.Sprintf("  - %s\n", change)
						}
					}
				} else {
					dryRunError = fmt.Sprintf("Dry-run validation failed: %s", dryRunResult.Error)
				}
			}
		} else {
			dryRunOutput = "Dry-run not available (no Kubernetes client configured). Commands shown above can be executed manually with --dry-run=client flag."
		}
	}

	// Build preview response
	previewResponse := map[string]interface{}{
		"fixId":         fixPlan.ID,
		"title":         fixPlan.Title,
		"description":   fixPlan.Description,
		"risk":          fixPlan.Risk,
		"confidence":    fixPlan.Confidence,
		"whyThisFix":    fixPlan.WhyThisFix,
		"diff":          fixPlan.Preview.ExpectedDiff,
		"kubectlCommands": fixPlan.Preview.KubectlCommands,
		"dryRunSupported": fixPlan.Preview.DryRunSupported,
		"dryRunOutput":  dryRunOutput,
		"dryRunError":   dryRunError,
		"rollback": map[string]interface{}{
			"description":     fixPlan.Rollback.Description,
			"kubectlCommands": fixPlan.Rollback.KubectlCommands,
		},
		"guardrails": fixPlan.Guardrails,
		"evidenceRefs": fixPlan.EvidenceRefs,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(previewResponse)
}

// handleFixApply handles POST /api/v2/incidents/{id}/fix-apply
// Input: { fixId, confirmed: true }
// Output: executionId + post-check plan
func (ws *WebServer) handleFixApplyV2(w http.ResponseWriter, r *http.Request, incidentID string) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	if ws.app.incidentIntelligence == nil {
		http.Error(w, "Incident intelligence not initialized", http.StatusServiceUnavailable)
		return
	}

	// Parse request body
	var req struct {
		FixID     string `json:"fixId"`
		Confirmed bool   `json:"confirmed"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.FixID == "" {
		http.Error(w, "Missing fixId", http.StatusBadRequest)
		return
	}

	if !req.Confirmed {
		http.Error(w, "Fix must be confirmed before applying", http.StatusBadRequest)
		return
	}

	// Get incident snapshot
	snapshot, err := ws.getIncidentSnapshot(incidentID)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to get snapshot: %v", err), http.StatusNotFound)
		return
	}

	// Create remediation engine
	engine := incidents.NewRemediationEngine()

	// Generate remediation plan
	plan, err := engine.GenerateRemediation(r.Context(), snapshot, nil)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to generate remediation: %v", err), http.StatusInternalServerError)
		return
	}

	// Find the fix plan
	var fixPlan *incidents.FixPlan
	for _, fp := range plan.FixPlans {
		if fp.ID == req.FixID {
			fixPlan = fp
			break
		}
	}

	if fixPlan == nil {
		http.Error(w, "Fix plan not found", http.StatusNotFound)
		return
	}

	// Check guardrails
	if fixPlan.Guardrails != nil {
		if fixPlan.Confidence < fixPlan.Guardrails.ConfidenceMin {
			http.Error(w, fmt.Sprintf("Confidence %.2f is below minimum %.2f", fixPlan.Confidence, fixPlan.Guardrails.ConfidenceMin), http.StatusBadRequest)
			return
		}
	}

	// Get the incident to apply fix
	manager := ws.app.incidentIntelligence.GetManager()
	incident := manager.GetIncident(incidentID)
	if incident == nil {
		http.Error(w, "Incident not found", http.StatusNotFound)
		return
	}

	// Convert FixPlan to ProposedFix
	proposedFix := fixPlanToProposedFix(fixPlan, snapshot)

	// Create fix executor using the kube adapter from incident intelligence
	var fixExecutor *incidents.FixExecutor
	if ws.app.incidentIntelligence != nil && ws.app.incidentIntelligence.GetManager() != nil {
		// Get the kube adapter from the incident intelligence system
		// The kube adapter implements KubeFixExecutor interface
		kubeAdapter := ws.getKubeFixExecutor()
		if kubeAdapter != nil {
			fixExecutor = incidents.NewFixExecutor(kubeAdapter)
		}
	}

	executionID := fmt.Sprintf("exec-%s-%d", incidentID, time.Now().Unix())

	// Apply the fix
	var applyResult *incidents.FixResult
	var applyErr error
	if fixExecutor != nil {
		applyResult, applyErr = fixExecutor.Apply(r.Context(), proposedFix)
	} else {
		// No executor available - return error
		http.Error(w, "Fix executor not available - cannot apply fix", http.StatusServiceUnavailable)
		return
	}

	if applyErr != nil {
		http.Error(w, fmt.Sprintf("Failed to apply fix: %v", applyErr), http.StatusInternalServerError)
		return
	}

	if !applyResult.Success {
		response := map[string]interface{}{
			"executionId": executionID,
			"status":      "failed",
			"message":     applyResult.Message,
			"error":       applyResult.Error,
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(response)
		return
	}

	// Success - return execution ID and post-check plan
	response := map[string]interface{}{
		"executionId": executionID,
		"status":      "applied",
		"message":     applyResult.Message,
		"changes":     applyResult.Changes,
		"postCheckPlan": map[string]interface{}{
			"checks": []string{
				"Verify restart rate decreased",
				"Check pod status is Running",
				"Verify no new error events",
			},
			"timeoutSeconds": 300,
		},
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// handlePostCheck handles POST /api/v2/incidents/{id}/post-check
// Verifies if incident improved (restart rate down, readiness up)
func (ws *WebServer) handlePostCheck(w http.ResponseWriter, r *http.Request, incidentID string) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	if ws.app.incidentIntelligence == nil {
		http.Error(w, "Incident intelligence not initialized", http.StatusServiceUnavailable)
		return
	}

	// Parse request body
	var req struct {
		ExecutionID string `json:"executionId,omitempty"`
	}
	json.NewDecoder(r.Body).Decode(&req)

	// Get current incident state
	manager := ws.app.incidentIntelligence.GetManager()
	incident := manager.GetIncident(incidentID)
	if incident == nil {
		http.Error(w, "Incident not found", http.StatusNotFound)
		return
	}

	// Get snapshot to check current state
	snapshot, err := ws.getIncidentSnapshot(incidentID)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to get snapshot: %v", err), http.StatusNotFound)
		return
	}

	// Perform post-check
	checks := []map[string]interface{}{}

	// Check restart rate
	totalRestarts := snapshot.RestartCounts.Last5Minutes + snapshot.RestartCounts.Last1Hour + snapshot.RestartCounts.Last24Hours
	if totalRestarts > 0 {
		checks = append(checks, map[string]interface{}{
			"name":    "Restart Rate",
			"status":  "warning",
			"message": fmt.Sprintf("Total restarts: %d (5m: %d, 1h: %d, 24h: %d)", totalRestarts, snapshot.RestartCounts.Last5Minutes, snapshot.RestartCounts.Last1Hour, snapshot.RestartCounts.Last24Hours),
		})
	} else {
		checks = append(checks, map[string]interface{}{
			"name":    "Restart Rate (5m)",
			"status":  "ok",
			"message": "No restarts in last 5 minutes",
		})
	}

	// Check readiness
	if snapshot.ReadinessStatus == "Ready" {
		checks = append(checks, map[string]interface{}{
			"name":    "Readiness Status",
			"status":  "ok",
			"message": "Resource is ready",
		})
	} else {
		checks = append(checks, map[string]interface{}{
			"name":    "Readiness Status",
			"status":  "warning",
			"message": fmt.Sprintf("Readiness: %s", snapshot.ReadinessStatus),
		})
	}

	// Overall status
	allOk := true
	for _, check := range checks {
		if check["status"] != "ok" {
			allOk = false
			break
		}
	}

	response := map[string]interface{}{
		"incidentId":  incidentID,
		"executionId": req.ExecutionID,
		"status":      "ok",
		"improved":    allOk,
		"checks":      checks,
		"timestamp":   time.Now(),
	}

	if !allOk {
		response["status"] = "warning"
		response["message"] = "Some checks indicate the fix may not have fully resolved the issue"
	} else {
		response["message"] = "All checks passed - incident appears to be resolved"
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// getIncidentSnapshot gets the incident snapshot (helper function)
func (ws *WebServer) getIncidentSnapshot(incidentID string) (*incidents.IncidentSnapshot, error) {
	// Try to get from cache first
	manager := ws.app.incidentIntelligence.GetManager()
	incident := manager.GetIncident(incidentID)
	if incident == nil {
		return nil, fmt.Errorf("incident not found")
	}

	// Build snapshot from incident
	hotEvidenceBuilder := incidents.NewHotEvidenceBuilder()
	hotEvidence := hotEvidenceBuilder.BuildHotEvidence(incident)

	snapshotBuilder := incidents.NewSnapshotBuilder()
	if learner := ws.getConfidenceLearner(); learner != nil {
		snapshotBuilder.SetLearner(learner)
	}
	snapshot := snapshotBuilder.BuildSnapshot(incident, hotEvidence)

	return snapshot, nil
}

// fixPlanToProposedFix converts a FixPlan to a ProposedFix for execution
func fixPlanToProposedFix(fixPlan *incidents.FixPlan, snapshot *incidents.IncidentSnapshot) *incidents.ProposedFix {
	// Map fix type string to FixType
	var fixType incidents.FixType
	switch fixPlan.Type {
	case "patch":
		fixType = incidents.FixTypePatch
	case "scale":
		fixType = incidents.FixTypeScale
	case "restart":
		fixType = incidents.FixTypeRestart
	case "rollback":
		fixType = incidents.FixTypeRollback
	case "delete":
		fixType = incidents.FixTypeDelete
	default:
		fixType = incidents.FixTypePatch // Default
	}

	// Extract changes from preview commands (simplified)
	changes := []incidents.FixChange{}
	// In a full implementation, we'd parse the commands to extract actual changes

	// Build rollback info
	rollbackInfo := &incidents.RollbackInfo{
		CanRollback: fixPlan.Rollback != nil && len(fixPlan.Rollback.KubectlCommands) > 0,
		RollbackCmd: "",
	}
	if fixPlan.Rollback != nil && len(fixPlan.Rollback.KubectlCommands) > 0 {
		rollbackInfo.RollbackCmd = fixPlan.Rollback.KubectlCommands[0]
	}

	return &incidents.ProposedFix{
		Type:              fixType,
		Description:       fixPlan.Description,
		PreviewDiff:       fixPlan.Preview.ExpectedDiff,
		DryRunCmd:         "",
		ApplyCmd:          "",
		TargetResource:    snapshot.Resource,
		Changes:           changes,
		RollbackInfo:      rollbackInfo,
		Safe:              fixPlan.Risk == "low",
		RequiresConfirmation: fixPlan.Guardrails != nil && fixPlan.Guardrails.RequiresUserAck,
	}
}

// getKubeFixExecutor returns a KubeFixExecutor implementation
func (ws *WebServer) getKubeFixExecutor() incidents.KubeFixExecutor {
	if ws.app.incidentIntelligence == nil {
		return nil
	}

	// Use the existing kubeAdapter from incident intelligence
	// The KubeClientAdapter already implements KubeFixExecutor interface
	return ws.app.incidentIntelligence.kubeAdapter
}

