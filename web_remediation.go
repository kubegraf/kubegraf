// Copyright 2025 KubeGraf Contributors
// SPDX-License-Identifier: Apache-2.0

package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strings"
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
	log.Printf("[FixPreviewV2] Handler called for incidentID: %s, method: %s, path: %s", incidentID, r.Method, r.URL.Path)
	
	if r.Method != http.MethodPost {
		log.Printf("[FixPreviewV2] Method not allowed: %s", r.Method)
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	if ws.app.incidentIntelligence == nil {
		log.Printf("[FixPreviewV2] Incident intelligence not initialized")
		http.Error(w, "Incident intelligence not initialized", http.StatusServiceUnavailable)
		return
	}

	// Parse request body - support both fixId and runbookId
	var req struct {
		FixID     string `json:"fixId"`
		RunbookID string `json:"runbookId"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		log.Printf("[FixPreviewV2] Error decoding request body: %v", err)
		http.Error(w, fmt.Sprintf("Invalid request body: %v", err), http.StatusBadRequest)
		return
	}
	log.Printf("[FixPreviewV2] Request parsed - fixId: '%s', runbookId: '%s'", req.FixID, req.RunbookID)
	
	if req.FixID == "" && req.RunbookID == "" {
		log.Printf("[FixPreviewV2] Both fixId and runbookId are empty")
		http.Error(w, "Missing fixId or runbookId", http.StatusBadRequest)
		return
	}

	// Get incident snapshot
	snapshot, err := ws.getIncidentSnapshot(incidentID)
	if err != nil {
		log.Printf("[FixPreviewV2] Failed to get snapshot for incident %s: %v", incidentID, err)
		http.Error(w, fmt.Sprintf("Failed to get snapshot: %v", err), http.StatusNotFound)
		return
	}
	log.Printf("[FixPreviewV2] Snapshot retrieved successfully, pattern: %s", snapshot.Pattern)

	// Create remediation engine
	engine := incidents.NewRemediationEngine()

	// Generate remediation plan
	plan, err := engine.GenerateRemediation(r.Context(), snapshot, nil)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to generate remediation: %v", err), http.StatusInternalServerError)
		return
	}

	// Find the fix plan - support both fixId and runbookId
	var fixPlan *incidents.FixPlan
	if req.FixID != "" {
		// Look up by fixId
		for _, fp := range plan.FixPlans {
			if fp.ID == req.FixID {
				fixPlan = fp
				break
			}
		}
	} else if req.RunbookID != "" {
		// Look up by runbookId - fixId format is "fix-{incidentID}-{runbookID}"
		expectedFixID := fmt.Sprintf("fix-%s-%s", incidentID, req.RunbookID)
		log.Printf("[FixPreview] Looking for fix plan with runbookId: %s, expected fixId: %s", req.RunbookID, expectedFixID)
		log.Printf("[FixPreview] Available fix plans: %d", len(plan.FixPlans))
		for i, fp := range plan.FixPlans {
			log.Printf("[FixPreview] Fix plan %d: ID=%s, Title=%s", i, fp.ID, fp.Title)
			if fp.ID == expectedFixID {
				fixPlan = fp
				log.Printf("[FixPreview] Found fix plan by exact fixId match")
				break
			}
		}
		// If still not found, try matching by finding the runbook and matching its name/description
		if fixPlan == nil && len(plan.FixPlans) > 0 {
			log.Printf("[FixPreview] Exact match failed, trying fallback matching")
			// Try to match by finding a runbook with the given ID and matching fix plan
			// We'll search through all fix plans and see if any match the runbook
			// This is a fallback - the fixId should normally match
			for _, fp := range plan.FixPlans {
				// Extract runbook ID from fix ID (format: "fix-{incidentID}-{runbookID}")
				prefix := fmt.Sprintf("fix-%s-", incidentID)
				if strings.HasPrefix(fp.ID, prefix) {
					extractedRunbookID := fp.ID[len(prefix):]
					log.Printf("[FixPreview] Extracted runbookId from fixId %s: %s (looking for: %s)", fp.ID, extractedRunbookID, req.RunbookID)
					if extractedRunbookID == req.RunbookID {
						fixPlan = fp
						log.Printf("[FixPreview] Found fix plan by extracted runbookId match")
						break
					}
				}
			}
			// If still not found, try matching by runbook name (last resort)
			if fixPlan == nil {
				log.Printf("[FixPreview] Trying to match by runbook name")
				// Get runbook by ID to find its name - create a new registry to access runbooks
				runbookReg := incidents.NewRunbookRegistry()
				runbooks := runbookReg.GetByPattern(snapshot.Pattern)
				var targetRunbook *incidents.Runbook
				for _, rb := range runbooks {
					if rb.ID == req.RunbookID {
						targetRunbook = rb
						break
					}
				}
				if targetRunbook != nil {
					log.Printf("[FixPreview] Found runbook: %s (name: %s), matching by name", targetRunbook.ID, targetRunbook.Name)
					for _, fp := range plan.FixPlans {
						if fp.Title == targetRunbook.Name || fp.Description == targetRunbook.Description {
							fixPlan = fp
							log.Printf("[FixPreview] Found fix plan by name/description match: %s", fp.ID)
							break
						}
					}
				} else {
					log.Printf("[FixPreview] Runbook %s not found in registry for pattern %s", req.RunbookID, snapshot.Pattern)
				}
			}
		}
	} else {
		http.Error(w, "Missing fixId or runbookId", http.StatusBadRequest)
		return
	}

	if fixPlan == nil {
		errorMsg := fmt.Sprintf("Fix plan not found for runbook %s. Available fix plans: %d", req.RunbookID, len(plan.FixPlans))
		if len(plan.FixPlans) > 0 {
			errorMsg += ". Fix plan IDs: "
			for i, fp := range plan.FixPlans {
				if i > 0 {
					errorMsg += ", "
				}
				errorMsg += fp.ID
			}
		}
		log.Printf("[FixPreview] ERROR: %s", errorMsg)
		http.Error(w, errorMsg, http.StatusNotFound)
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
	log.Printf("[FixApplyV2] Handler called for incidentID: %s, method: %s, path: %s", incidentID, r.Method, r.URL.Path)
	
	if r.Method != http.MethodPost {
		log.Printf("[FixApplyV2] Method not allowed: %s", r.Method)
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	if ws.app.incidentIntelligence == nil {
		log.Printf("[FixApplyV2] Incident intelligence not initialized")
		http.Error(w, "Incident intelligence not initialized", http.StatusServiceUnavailable)
		return
	}

	// Parse request body
	var req struct {
		FixID     string `json:"fixId"`
		Confirmed bool   `json:"confirmed"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		log.Printf("[FixApplyV2] Error decoding request body: %v", err)
		http.Error(w, fmt.Sprintf("Invalid request body: %v", err), http.StatusBadRequest)
		return
	}
	log.Printf("[FixApplyV2] Request parsed - fixId: '%s', confirmed: %v", req.FixID, req.Confirmed)

	if req.FixID == "" {
		log.Printf("[FixApplyV2] Missing fixId in request")
		http.Error(w, "Missing fixId", http.StatusBadRequest)
		return
	}

	if !req.Confirmed {
		log.Printf("[FixApplyV2] Fix not confirmed")
		http.Error(w, "Fix must be confirmed before applying", http.StatusBadRequest)
		return
	}

	// Get incident snapshot
	snapshot, err := ws.getIncidentSnapshot(incidentID)
	if err != nil {
		log.Printf("[FixApplyV2] Failed to get snapshot for incident %s: %v", incidentID, err)
		http.Error(w, fmt.Sprintf("Failed to get snapshot: %v", err), http.StatusNotFound)
		return
	}
	log.Printf("[FixApplyV2] Snapshot retrieved successfully, pattern: %s", snapshot.Pattern)

	// Create remediation engine
	engine := incidents.NewRemediationEngine()

	// Generate remediation plan
	plan, err := engine.GenerateRemediation(r.Context(), snapshot, nil)
	if err != nil {
		log.Printf("[FixApplyV2] Failed to generate remediation: %v", err)
		http.Error(w, fmt.Sprintf("Failed to generate remediation: %v", err), http.StatusInternalServerError)
		return
	}
	log.Printf("[FixApplyV2] Remediation plan generated, fix plans: %d", len(plan.FixPlans))

	// Find the fix plan
	var fixPlan *incidents.FixPlan
	for _, fp := range plan.FixPlans {
		log.Printf("[FixApplyV2] Checking fix plan: ID=%s, Title=%s", fp.ID, fp.Title)
		if fp.ID == req.FixID {
			fixPlan = fp
			log.Printf("[FixApplyV2] Found matching fix plan")
			break
		}
	}

	if fixPlan == nil {
		errorMsg := fmt.Sprintf("Fix plan not found for fixId: %s. Available fix plans: %d", req.FixID, len(plan.FixPlans))
		if len(plan.FixPlans) > 0 {
			errorMsg += ". Fix plan IDs: "
			for i, fp := range plan.FixPlans {
				if i > 0 {
					errorMsg += ", "
				}
				errorMsg += fp.ID
			}
		}
		log.Printf("[FixApplyV2] ERROR: %s", errorMsg)
		http.Error(w, errorMsg, http.StatusNotFound)
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
		log.Printf("[FixApplyV2] Incident not found: %s", incidentID)
		http.Error(w, "Incident not found", http.StatusNotFound)
		return
	}
	log.Printf("[FixApplyV2] Incident found: %s", incidentID)

	// Convert FixPlan to ProposedFix
	log.Printf("[FixApplyV2] Converting fix plan to proposed fix...")
	proposedFix := fixPlanToProposedFix(fixPlan, snapshot)
	log.Printf("[FixApplyV2] Proposed fix created - Type: %s, Target: %s/%s/%s", 
		proposedFix.Type, proposedFix.TargetResource.Kind, proposedFix.TargetResource.Namespace, proposedFix.TargetResource.Name)

	// Create fix executor using the kube adapter from incident intelligence
	var fixExecutor *incidents.FixExecutor
	log.Printf("[FixApplyV2] Checking for fix executor...")
	if ws.app.incidentIntelligence != nil && ws.app.incidentIntelligence.GetManager() != nil {
		log.Printf("[FixApplyV2] Incident intelligence available, getting kube adapter...")
		// Get the kube adapter from the incident intelligence system
		// The kube adapter implements KubeFixExecutor interface
		kubeAdapter := ws.getKubeFixExecutor()
		if kubeAdapter != nil {
			log.Printf("[FixApplyV2] Kube adapter found, creating fix executor...")
			fixExecutor = incidents.NewFixExecutor(kubeAdapter)
			log.Printf("[FixApplyV2] Fix executor created successfully")
		} else {
			log.Printf("[FixApplyV2] WARNING: Kube adapter is nil")
		}
	} else {
		log.Printf("[FixApplyV2] WARNING: Incident intelligence or manager is nil")
	}

	executionID := fmt.Sprintf("exec-%s-%d", incidentID, time.Now().Unix())
	log.Printf("[FixApplyV2] Generated execution ID: %s", executionID)

	// Apply the fix
	var applyResult *incidents.FixResult
	var applyErr error
	if fixExecutor != nil {
		log.Printf("[FixApplyV2] Executing fix...")
		applyResult, applyErr = fixExecutor.Apply(r.Context(), proposedFix)
		if applyErr != nil {
			log.Printf("[FixApplyV2] Fix execution error: %v", applyErr)
		} else if applyResult != nil {
			log.Printf("[FixApplyV2] Fix execution result - Success: %v, Message: %s", applyResult.Success, applyResult.Message)
		} else {
			log.Printf("[FixApplyV2] WARNING: Fix execution returned nil result")
		}
	} else {
		// No executor available - return error
		log.Printf("[FixApplyV2] ERROR: Fix executor not available - cannot apply fix")
		http.Error(w, "Fix executor not available - cannot apply fix. Check server logs for details.", http.StatusServiceUnavailable)
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
	// Find the incident - try cache first, then v2 manager, then v1 fallback
	var incident *incidents.Incident

	// Check cache first
	if ws.incidentCache != nil {
		incident = ws.incidentCache.GetV2Incident(incidentID)
	}

	// If not in cache, try v2 manager (fast path)
	if incident == nil && ws.app.incidentIntelligence != nil {
		incident = ws.app.incidentIntelligence.GetManager().GetIncident(incidentID)
		if incident != nil && ws.incidentCache != nil {
			// Cache it
			ws.incidentCache.SetV2Incident(incidentID, incident)
		}
	}

	// Fallback to v1 incidents if not found (needed for v1 incident compatibility)
	// Use the same approach as handleIncidentSnapshot
	if incident == nil {
		// Check cache for v1 incidents
		var v1Incidents []KubernetesIncident
		if ws.incidentCache != nil {
			v1Incidents = ws.incidentCache.GetV1Incidents("")
		}
		if v1Incidents == nil {
			// Not in cache, fetch and cache
			v1Incidents = ws.getV1Incidents("")
			if ws.incidentCache != nil {
				ws.incidentCache.SetV1Incidents("", v1Incidents)
			}
		}

		// Search for the incident
		for _, v1 := range v1Incidents {
			v2Inc := ws.convertV1ToV2Incident(v1)
			if v2Inc.ID == incidentID {
				incident = v2Inc
				// Cache the converted incident
				if ws.incidentCache != nil {
					ws.incidentCache.SetV2Incident(incidentID, incident)
				}
				break
			}
		}
	}

	if incident == nil {
		return nil, fmt.Errorf("incident not found")
	}

	// Check snapshot cache first (same logic as handleIncidentSnapshot)
	fingerprint := incident.Fingerprint
	if fingerprint == "" {
		// Compute fingerprint if not set
		containerName := ""
		if incident.Resource.Kind == "Pod" {
			// Try to get container name from metadata or signals
			if len(incident.Signals.Status) > 0 {
				if container, ok := incident.Signals.Status[0].Attributes["container"]; ok {
					containerName = container
				}
			}
		}
		fingerprint = incidents.ComputeIncidentFingerprint(incident, containerName)
	}

	// Try to get from cache first
	if ws.snapshotCache != nil {
		snapshot, cached := ws.snapshotCache.Get(fingerprint)
		if cached {
			// Ensure IncidentID is set (required for remediation engine)
			if snapshot.IncidentID == "" {
				snapshot.IncidentID = incidentID
			}
			// Ensure Pattern is set from incident
			if snapshot.Pattern == "" && incident.Pattern != "" {
				snapshot.Pattern = incident.Pattern
			}
			return snapshot, nil
		}
	}

	// Build snapshot from incident (cache miss)
	hotEvidenceBuilder := incidents.NewHotEvidenceBuilder()
	hotEvidence := hotEvidenceBuilder.BuildHotEvidence(incident)

	snapshotBuilder := incidents.NewSnapshotBuilder()
	if learner := ws.getConfidenceLearner(); learner != nil {
		snapshotBuilder.SetLearner(learner)
	}
	snapshot := snapshotBuilder.BuildSnapshot(incident, hotEvidence)
	
	// Ensure IncidentID is set (required for remediation engine)
	if snapshot.IncidentID == "" {
		snapshot.IncidentID = incidentID
	}
	
	// Ensure Pattern is set from incident
	if snapshot.Pattern == "" && incident.Pattern != "" {
		snapshot.Pattern = incident.Pattern
	}

	// Cache the snapshot for future use
	if ws.snapshotCache != nil {
		ws.snapshotCache.Put(fingerprint, snapshot)
	}

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

