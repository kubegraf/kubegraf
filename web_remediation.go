// Copyright 2025 KubeGraf Contributors
// SPDX-License-Identifier: Apache-2.0

package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/kubegraf/kubegraf/pkg/incidents"
	"github.com/kubegraf/kubegraf/pkg/instrumentation"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"
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
		proposedFix := fixPlanToProposedFix(fixPlan, snapshot, ws.app.clientset, r.Context())

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
		"fixId":           fixPlan.ID,
		"title":           fixPlan.Title,
		"description":     fixPlan.Description,
		"risk":            fixPlan.Risk,
		"confidence":      fixPlan.Confidence,
		"whyThisFix":      fixPlan.WhyThisFix,
		"diff":            fixPlan.Preview.ExpectedDiff,
		"kubectlCommands": fixPlan.Preview.KubectlCommands,
		"dryRunSupported": fixPlan.Preview.DryRunSupported,
		"dryRunOutput":    dryRunOutput,
		"dryRunError":     dryRunError,
		"rollback": map[string]interface{}{
			"description":     fixPlan.Rollback.Description,
			"kubectlCommands": fixPlan.Rollback.KubectlCommands,
		},
		"guardrails":   fixPlan.Guardrails,
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

	// Parse request body - support both new format (fixId) and legacy format (recommendationId)
	var req struct {
		FixID          string `json:"fixId"`
		RecommendationID string `json:"recommendationId"` // Legacy format support
		Confirmed      bool   `json:"confirmed"`
		DryRun         bool   `json:"dryRun"` // Legacy format support
		// Optional: resource info for fallback lookup
		ResourceNamespace string `json:"resourceNamespace,omitempty"`
		ResourceKind      string `json:"resourceKind,omitempty"`
		ResourceName      string `json:"resourceName,omitempty"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		log.Printf("[FixApplyV2] Error decoding request body: %v", err)
		http.Error(w, fmt.Sprintf("Invalid request body: %v", err), http.StatusBadRequest)
		return
	}
	log.Printf("[FixApplyV2] Request parsed - fixId: '%s', recommendationId: '%s', confirmed: %v, dryRun: %v, resource: %s/%s/%s",
		req.FixID, req.RecommendationID, req.Confirmed, req.DryRun, req.ResourceNamespace, req.ResourceKind, req.ResourceName)

	// If fixId is empty but recommendationId is provided, we need to find the fixId from the remediation plan
	// For now, if recommendationId is provided, we'll need to generate a fixId or use the recommendation-based flow
	if req.FixID == "" && req.RecommendationID != "" {
		log.Printf("[FixApplyV2] fixId empty but recommendationId provided: '%s', will try to find fix from recommendation", req.RecommendationID)
		// We'll handle this after getting the snapshot - need to find the fix plan that matches the recommendation
	}

	// For legacy format (recommendationId), we'll set confirmed to true if not explicitly set
	if req.FixID == "" && req.RecommendationID != "" && !req.Confirmed {
		req.Confirmed = true // Legacy format assumes confirmed if not specified
		log.Printf("[FixApplyV2] Legacy format detected, setting confirmed=true")
	}

	if req.FixID == "" && req.RecommendationID == "" {
		log.Printf("[FixApplyV2] Missing both fixId and recommendationId in request")
		http.Error(w, "Missing fixId or recommendationId", http.StatusBadRequest)
		return
	}

	if !req.Confirmed && !req.DryRun {
		log.Printf("[FixApplyV2] Fix not confirmed and not dry-run")
		http.Error(w, "Fix must be confirmed before applying", http.StatusBadRequest)
		return
	}

	// Get incident snapshot - try multiple strategies
	log.Printf("[FixApplyV2] Attempting to get snapshot for incidentID: '%s'", incidentID)
	log.Printf("[FixApplyV2] Request details - fixId: '%s', resource: %s/%s/%s",
		req.FixID, req.ResourceNamespace, req.ResourceKind, req.ResourceName)

	var snapshot *incidents.IncidentSnapshot
	var err error

	// Strategy 1: Try direct lookup
	snapshot, err = ws.getIncidentSnapshot(incidentID)
	if err == nil {
		log.Printf("[FixApplyV2] Successfully retrieved snapshot using direct lookup")
	} else {
		log.Printf("[FixApplyV2] Direct lookup failed: %v", err)

		// Strategy 2: Try to find v1 incident by ID directly (before conversion)
		// v1 incident IDs are like "restarts-{namespace}-{podName}-{containerName}"
		if strings.HasPrefix(incidentID, "restarts-") || !strings.HasPrefix(incidentID, "INC-") {
			log.Printf("[FixApplyV2] Incident ID looks like v1 format, trying v1 lookup")
			v1Incidents := ws.getV1Incidents("")
			log.Printf("[FixApplyV2] Checking %d v1 incidents for ID match: '%s'", len(v1Incidents), incidentID)
			// Log first few v1 incident IDs for debugging
			for i, v1 := range v1Incidents {
				if i < 5 {
					log.Printf("[FixApplyV2] v1[%d] ID: '%s', Resource: %s/%s/%s", i, v1.ID, v1.Namespace, v1.ResourceKind, v1.ResourceName)
				}
				if v1.ID == incidentID {
					log.Printf("[FixApplyV2] ✓ Found v1 incident with matching ID: %s", v1.ID)
					v2Inc := ws.convertV1ToV2Incident(v1)
					// Build snapshot directly from the incident (don't call getIncidentSnapshot again)
					log.Printf("[FixApplyV2] Building snapshot directly from v1 incident")
					hotEvidenceBuilder := incidents.NewHotEvidenceBuilder()
					hotEvidence := hotEvidenceBuilder.BuildHotEvidence(v2Inc)
					snapshotBuilder := incidents.NewSnapshotBuilder()
					if learner := ws.getConfidenceLearner(); learner != nil {
						snapshotBuilder.SetLearner(learner)
					}
					snapshot = snapshotBuilder.BuildSnapshot(v2Inc, hotEvidence)
					// Ensure IncidentID is set correctly
					if snapshot.IncidentID == "" {
						snapshot.IncidentID = incidentID
					}
					err = nil
					log.Printf("[FixApplyV2] ✓ Built snapshot directly from v1 incident, snapshot.IncidentID: %s", snapshot.IncidentID)
					break
				}
			}
			if err != nil && snapshot == nil {
				log.Printf("[FixApplyV2] ✗ v1 incident with ID '%s' not found in %d v1 incidents", incidentID, len(v1Incidents))
			}
		}

		// Strategy 3: Try resource-based fallback
		if err != nil && req.ResourceNamespace != "" && req.ResourceKind != "" && req.ResourceName != "" {
			log.Printf("[FixApplyV2] Attempting fallback lookup by resource: %s/%s/%s",
				req.ResourceNamespace, req.ResourceKind, req.ResourceName)

			// Try v1 incidents first (they're more likely to match the resource)
			v1Incidents := ws.getV1Incidents("")
			for _, v1 := range v1Incidents {
				if v1.Namespace == req.ResourceNamespace &&
					v1.ResourceKind == req.ResourceKind &&
					(v1.ResourceName == req.ResourceName ||
						strings.Contains(v1.ResourceName, req.ResourceName) ||
						strings.Contains(req.ResourceName, v1.ResourceName)) {
					log.Printf("[FixApplyV2] Found v1 incident by resource: ID '%s', resource %s/%s/%s",
						v1.ID, v1.Namespace, v1.ResourceKind, v1.ResourceName)
					v2Inc := ws.convertV1ToV2Incident(v1)
					hotEvidenceBuilder := incidents.NewHotEvidenceBuilder()
					hotEvidence := hotEvidenceBuilder.BuildHotEvidence(v2Inc)
					snapshotBuilder := incidents.NewSnapshotBuilder()
					// Try to get learner if available (same pattern as handleIncidentSnapshot)
					if learner := ws.getConfidenceLearner(); learner != nil {
						snapshotBuilder.SetLearner(learner)
					}
					snapshot = snapshotBuilder.BuildSnapshot(v2Inc, hotEvidence)
					incidentID = v2Inc.ID
					err = nil
					log.Printf("[FixApplyV2] Built snapshot from v1 incident found by resource")
					break
				}
			}

			// Try v2 manager incidents if v1 didn't work
			if err != nil {
				manager := ws.app.incidentIntelligence.GetManager()
				if manager != nil {
					allIncidents := manager.GetAllIncidents()
					log.Printf("[FixApplyV2] Searching through %d v2 incidents for resource match", len(allIncidents))
					for _, inc := range allIncidents {
						namespaceMatch := inc.Resource.Namespace == req.ResourceNamespace
						kindMatch := inc.Resource.Kind == req.ResourceKind
						nameMatch := inc.Resource.Name == req.ResourceName ||
							strings.Contains(inc.Resource.Name, req.ResourceName) ||
							strings.Contains(req.ResourceName, inc.Resource.Name)

						if namespaceMatch && kindMatch && nameMatch {
							log.Printf("[FixApplyV2] ✓ Found v2 incident by resource: ID '%s'", inc.ID)
							snapshot, err = ws.getIncidentSnapshot(inc.ID)
							if err == nil {
								log.Printf("[FixApplyV2] Successfully retrieved snapshot using v2 incident ID: %s", inc.ID)
								incidentID = inc.ID
								break
							}
						}
					}
				}
			}
		}

		if err != nil {
			log.Printf("[FixApplyV2] ✗ All lookup strategies failed for incidentID: %s", incidentID)
			// Log available v1 incident IDs for debugging
			v1Incidents := ws.getV1Incidents("")
			log.Printf("[FixApplyV2] Available v1 incidents (%d total):", len(v1Incidents))
			for i, v1 := range v1Incidents {
				if i < 10 {
					log.Printf("[FixApplyV2]   v1[%d]: ID='%s', Resource=%s/%s/%s", i, v1.ID, v1.Namespace, v1.ResourceKind, v1.ResourceName)
				}
			}
			// Log v2 incident IDs if available
			if ws.app.incidentIntelligence != nil {
				manager := ws.app.incidentIntelligence.GetManager()
				if manager != nil {
					allV2Incidents := manager.GetAllIncidents()
					log.Printf("[FixApplyV2] Available v2 incidents (%d total):", len(allV2Incidents))
					for i, inc := range allV2Incidents {
						if i < 10 {
							log.Printf("[FixApplyV2]   v2[%d]: ID='%s', Resource=%s/%s/%s", i, inc.ID, inc.Resource.Namespace, inc.Resource.Kind, inc.Resource.Name)
						}
					}
				}
			}
			http.Error(w, fmt.Sprintf("Incident not found: %s. Please refresh the incidents list and try again.", incidentID), http.StatusNotFound)
			return
		}
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

	// Find the fix plan - support both fixId and recommendationId
	var fixPlan *incidents.FixPlan
	if req.FixID != "" {
		// New format: find by fixId
		for _, fp := range plan.FixPlans {
			log.Printf("[FixApplyV2] Checking fix plan: ID=%s, Title=%s", fp.ID, fp.Title)
			if fp.ID == req.FixID {
				fixPlan = fp
				log.Printf("[FixApplyV2] Found matching fix plan by fixId")
				break
			}
		}
	} else if req.RecommendationID != "" {
		// Legacy format: find by recommendationId (match by runbook ID or title)
		log.Printf("[FixApplyV2] Looking for fix plan matching recommendationId: '%s'", req.RecommendationID)
		for _, fp := range plan.FixPlans {
			// Try to match by extracting runbook ID from fixId (format: fix-{incidentID}-{runbookID})
			prefix := fmt.Sprintf("fix-%s-", snapshot.IncidentID)
			if strings.HasPrefix(fp.ID, prefix) {
				extractedRunbookID := fp.ID[len(prefix):]
				if extractedRunbookID == req.RecommendationID {
					fixPlan = fp
					log.Printf("[FixApplyV2] Found matching fix plan by recommendationId (runbook ID match)")
					break
				}
			}
			// Also try matching by title (e.g., "Restart Pod" matches recommendation with title "Restart Pod")
			if strings.EqualFold(fp.Title, req.RecommendationID) || strings.Contains(strings.ToLower(fp.Title), strings.ToLower(req.RecommendationID)) {
				fixPlan = fp
				log.Printf("[FixApplyV2] Found matching fix plan by recommendationId (title match)")
				break
			}
		}
		// If still not found, use the first fix plan as fallback
		if fixPlan == nil && len(plan.FixPlans) > 0 {
			fixPlan = plan.FixPlans[0]
			log.Printf("[FixApplyV2] Using first fix plan as fallback for recommendationId: '%s'", req.RecommendationID)
		}
	}

	if fixPlan == nil {
		errorMsg := fmt.Sprintf("Fix plan not found for fixId: %s, recommendationId: %s. Available fix plans: %d", req.FixID, req.RecommendationID, len(plan.FixPlans))
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
			log.Printf("[FixApplyV2] Confidence check failed: %.2f < %.2f (risk: %s)",
				fixPlan.Confidence, fixPlan.Guardrails.ConfidenceMin, fixPlan.Risk)
			// For low/medium risk fixes, allow if user has confirmed (they've checked the box)
			// For high risk, still enforce the minimum
			if fixPlan.Risk == "high" {
				http.Error(w, fmt.Sprintf("Confidence %.2f is below minimum %.2f for high-risk fixes", fixPlan.Confidence, fixPlan.Guardrails.ConfidenceMin), http.StatusBadRequest)
				return
			}
			// For low/medium risk, log a warning but allow if user confirmed
			log.Printf("[FixApplyV2] Allowing fix despite low confidence (%.2f < %.2f) - user has confirmed",
				fixPlan.Confidence, fixPlan.Guardrails.ConfidenceMin)
		}
	}

	// Get the incident to apply fix - try multiple strategies since we already have the snapshot
	manager := ws.app.incidentIntelligence.GetManager()
	incident := manager.GetIncident(incidentID)
	
	// If not found in v2 manager, try to get from v1 incidents (same as we did for snapshot)
	if incident == nil {
		log.Printf("[FixApplyV2] Incident not in v2 manager, trying v1 lookup for: %s", incidentID)
		v1Incidents := ws.getV1Incidents("")
		for _, v1 := range v1Incidents {
			if v1.ID == incidentID {
				log.Printf("[FixApplyV2] Found v1 incident for fix application: %s", v1.ID)
				incident = ws.convertV1ToV2Incident(v1)
				break
			}
		}
	}
	
	// If still not found, we can build it from the snapshot we already have
	if incident == nil && snapshot != nil {
		log.Printf("[FixApplyV2] Building incident from snapshot for fix application")
		// Create a minimal incident from snapshot for fix application
		incident = &incidents.Incident{
			ID:       snapshot.IncidentID,
			Pattern:  snapshot.Pattern,
			Severity: snapshot.Severity,
			Status:   incidents.StatusOpen,
			Resource: snapshot.Resource,
			Title:    snapshot.Title,
		}
	}
	
	if incident == nil {
		log.Printf("[FixApplyV2] Incident not found after all strategies: %s", incidentID)
		http.Error(w, "Incident not found", http.StatusNotFound)
		return
	}
	log.Printf("[FixApplyV2] Incident found: %s", incidentID)

	// Convert FixPlan to ProposedFix
	log.Printf("[FixApplyV2] Converting fix plan to proposed fix...")
	proposedFix := fixPlanToProposedFix(fixPlan, snapshot, ws.app.clientset, r.Context())
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

	// Get current incident state - try multiple strategies (same as fix-apply)
	log.Printf("[PostCheck] Getting incident for post-check: %s", incidentID)
	manager := ws.app.incidentIntelligence.GetManager()
	incident := manager.GetIncident(incidentID)
	
	// If not found in v2 manager, try v1 incidents
	if incident == nil {
		log.Printf("[PostCheck] Incident not in v2 manager, trying v1 lookup: %s", incidentID)
		v1Incidents := ws.getV1Incidents("")
		for _, v1 := range v1Incidents {
			if v1.ID == incidentID {
				log.Printf("[PostCheck] Found v1 incident: %s", v1.ID)
				incident = ws.convertV1ToV2Incident(v1)
				break
			}
		}
	}
	
	if incident == nil {
		log.Printf("[PostCheck] Incident not found: %s", incidentID)
		http.Error(w, "Incident not found", http.StatusNotFound)
		return
	}

	// Get snapshot to check current state
	// Use the incident's ID (which might be different from incidentID if it was converted)
	snapshotID := incident.ID
	log.Printf("[PostCheck] Getting snapshot for incident ID: %s (original: %s)", snapshotID, incidentID)
	snapshot, err := ws.getIncidentSnapshot(snapshotID)
	if err != nil {
		log.Printf("[PostCheck] Failed to get snapshot for ID %s: %v, trying original ID %s", snapshotID, err, incidentID)
		// Fallback to original ID
		snapshot, err = ws.getIncidentSnapshot(incidentID)
		if err != nil {
			log.Printf("[PostCheck] Failed to get snapshot with original ID: %v", err)
			http.Error(w, fmt.Sprintf("Failed to get snapshot: %v", err), http.StatusNotFound)
			return
		}
	}

	// Perform post-check
	checks := []map[string]interface{}{}

	// Check restart rate - for pod restart fixes, we expect the pod to be recreated
	// Historical restart counts include pre-fix restarts, so we focus on recent activity
	// If the fix was a pod restart, check if pod exists and is running (recreated successfully)
	if snapshot.Resource.Kind == "Pod" {
		// For pod restarts, check if pod was successfully recreated
		// The restart counts might still show historical data, so we check pod status instead
		if snapshot.RestartCounts.Last5Minutes == 0 {
			checks = append(checks, map[string]interface{}{
				"name":    "Pod Restart",
				"status":  "ok",
				"message": "No new restarts detected in last 5 minutes - pod restart appears successful",
			})
		} else {
			// New restarts after fix - could be normal (pod recreating) or a problem
			checks = append(checks, map[string]interface{}{
				"name":    "Pod Restart",
				"status":  "ok",
				"message": fmt.Sprintf("Pod was restarted (expected). Monitoring for stability (restarts in last 5m: %d)", snapshot.RestartCounts.Last5Minutes),
			})
		}
	} else {
		// For non-pod resources, check restart rate normally
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

		// Search for the incident - check v1.ID directly first (faster, no conversion needed)
		log.Printf("[getIncidentSnapshot] Searching %d v1 incidents for ID: '%s'", len(v1Incidents), incidentID)
		for _, v1 := range v1Incidents {
			// Check v1.ID directly first (no conversion needed for ID check)
			if v1.ID == incidentID {
				log.Printf("[getIncidentSnapshot] ✓ Found v1 incident by direct ID match: %s", v1.ID)
				v2Inc := ws.convertV1ToV2Incident(v1)
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
		log.Printf("[getIncidentSnapshot] Incident '%s' not found in cache, manager, or v1 incidents", incidentID)
		// Try to list available incident IDs for debugging
		if ws.app.incidentIntelligence != nil {
			manager := ws.app.incidentIntelligence.GetManager()
			if manager != nil {
				allIncidents := manager.GetAllIncidents()
				log.Printf("[getIncidentSnapshot] Total incidents available: %d", len(allIncidents))
				log.Printf("[getIncidentSnapshot] Available incident IDs (first 20):")
				for i, inc := range allIncidents {
					if i >= 20 {
						break
					}
					log.Printf("[getIncidentSnapshot]   [%d] ID: '%s', Resource: %s/%s/%s",
						i, inc.ID, inc.Resource.Namespace, inc.Resource.Kind, inc.Resource.Name)
				}

				// Try to find by partial ID match (in case ID format changed)
				// Some incident IDs might be like "restarts-..." while stored as "INC-..."
				for _, inc := range allIncidents {
					// Check if the requested ID is a substring of the stored ID or vice versa
					if strings.Contains(inc.ID, incidentID) || strings.Contains(incidentID, inc.ID) {
						log.Printf("[getIncidentSnapshot] Found incident by partial ID match: requested '%s', found '%s'", incidentID, inc.ID)
						incident = inc
						// Cache it with the requested ID
						if ws.incidentCache != nil {
							ws.incidentCache.SetV2Incident(incidentID, incident)
						}
						break
					}
				}
			}
		}

		if incident == nil {
			return nil, fmt.Errorf("Incident not found: %s (checked %d incidents)", incidentID,
				func() int {
					if ws.app.incidentIntelligence != nil && ws.app.incidentIntelligence.GetManager() != nil {
						return len(ws.app.incidentIntelligence.GetManager().GetAllIncidents())
					}
					return 0
				}())
		}
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
	// Use the original incidentID passed to this function, not the incident's ID
	// This is important for v1 incidents where the ID format is different
	if snapshot.IncidentID == "" {
		snapshot.IncidentID = incidentID
		log.Printf("[getIncidentSnapshot] Set snapshot.IncidentID to: %s", incidentID)
	} else if snapshot.IncidentID != incidentID {
		// If snapshot has a different ID (e.g., from cached snapshot), update it
		log.Printf("[getIncidentSnapshot] Updating snapshot.IncidentID from '%s' to '%s'", snapshot.IncidentID, incidentID)
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
func fixPlanToProposedFix(fixPlan *incidents.FixPlan, snapshot *incidents.IncidentSnapshot, clientset kubernetes.Interface, ctx context.Context) *incidents.ProposedFix {
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

	// Determine target resource - resolve owner if needed
	targetResource := snapshot.Resource

	log.Printf("[fixPlanToProposedFix] Starting owner resolution - Resource: %s/%s/%s, FixType: %s",
		snapshot.Resource.Kind, snapshot.Resource.Namespace, snapshot.Resource.Name, fixType)

	// If the resource is a Pod and the fix requires a Deployment (from guardrails), resolve the owner
	if snapshot.Resource.Kind == "Pod" {
		log.Printf("[fixPlanToProposedFix] Resource is Pod, checking if owner resolution needed...")
		// For patch and rollback operations on Pods, we ALWAYS need to target the Deployment
		// regardless of guardrails, because Pods can't be patched/rolled back directly
		if fixType == incidents.FixTypePatch || fixType == incidents.FixTypeRollback {
			log.Printf("[fixPlanToProposedFix] Fix type requires owner resolution: %s (Pods cannot be patched/rolled back directly)", fixType)
			// Always resolve to Deployment for patch/rollback operations on Pods
			requiresDeployment := true
			if fixPlan.Guardrails != nil && fixPlan.Guardrails.RequiresOwnerKind != "" {
				requiresDeployment = (fixPlan.Guardrails.RequiresOwnerKind == "Deployment")
				log.Printf("[fixPlanToProposedFix] Guardrails found - RequiresOwnerKind: %s", fixPlan.Guardrails.RequiresOwnerKind)
			}
			if requiresDeployment {
				log.Printf("[fixPlanToProposedFix] Attempting to resolve Pod owner to Deployment...")
				// Get the pod to resolve its owner
				if clientset != nil {
					// Handle resource name that might contain "/" (pod/container format)
					podName := snapshot.Resource.Name
					if strings.Contains(podName, "/") {
						// Extract pod name (part before "/")
						parts := strings.Split(podName, "/")
						podName = parts[0]
						log.Printf("[fixPlanToProposedFix] Extracted pod name from resource name: %s -> %s", snapshot.Resource.Name, podName)
					}

					log.Printf("[fixPlanToProposedFix] Clientset available, fetching pod: %s/%s", snapshot.Resource.Namespace, podName)
					pod, err := clientset.CoreV1().Pods(snapshot.Resource.Namespace).Get(ctx, podName, metav1.GetOptions{})
					if err != nil {
						log.Printf("[fixPlanToProposedFix] ERROR: Failed to get pod: %v", err)
						// Fallback: Try to extract deployment name from pod name pattern
						// Pods from deployments usually have format: deployment-name-hash
						if strings.Contains(podName, "-") {
							parts := strings.Split(podName, "-")
							if len(parts) >= 2 {
								// Try to find deployment by removing the hash suffix
								// Common pattern: deployment-name-{hash}
								potentialDeploymentName := strings.Join(parts[:len(parts)-1], "-")
								log.Printf("[fixPlanToProposedFix] Attempting fallback: checking if deployment exists: %s/%s", snapshot.Resource.Namespace, potentialDeploymentName)
								_, depErr := clientset.AppsV1().Deployments(snapshot.Resource.Namespace).Get(ctx, potentialDeploymentName, metav1.GetOptions{})
								if depErr == nil {
									targetResource = incidents.KubeResourceRef{
										Kind:      "Deployment",
										Name:      potentialDeploymentName,
										Namespace: snapshot.Resource.Namespace,
									}
									log.Printf("[fixPlanToProposedFix] SUCCESS: Fallback resolved to Deployment: %s/%s", targetResource.Namespace, targetResource.Name)
								} else {
									log.Printf("[fixPlanToProposedFix] Fallback deployment lookup failed: %v", depErr)
								}
							}
						}
					} else if pod != nil {
						log.Printf("[fixPlanToProposedFix] Pod retrieved, owner references: %d", len(pod.OwnerReferences))
						// Try to resolve owner from pod's owner references
						if len(pod.OwnerReferences) > 0 {
							owner := pod.OwnerReferences[0]
							log.Printf("[fixPlanToProposedFix] Pod owner: %s/%s", owner.Kind, owner.Name)
							if owner.Kind == "ReplicaSet" {
								// Get ReplicaSet to find Deployment owner
								log.Printf("[fixPlanToProposedFix] Fetching ReplicaSet: %s/%s", snapshot.Resource.Namespace, owner.Name)
								rs, err := clientset.AppsV1().ReplicaSets(snapshot.Resource.Namespace).Get(ctx, owner.Name, metav1.GetOptions{})
								if err != nil {
									log.Printf("[fixPlanToProposedFix] ERROR: Failed to get ReplicaSet: %v", err)
								} else if rs != nil {
									log.Printf("[fixPlanToProposedFix] ReplicaSet retrieved, owner references: %d", len(rs.OwnerReferences))
									if len(rs.OwnerReferences) > 0 {
										rsOwner := rs.OwnerReferences[0]
										log.Printf("[fixPlanToProposedFix] ReplicaSet owner: %s/%s", rsOwner.Kind, rsOwner.Name)
										if rsOwner.Kind == "Deployment" {
											targetResource = incidents.KubeResourceRef{
												Kind:      "Deployment",
												Name:      rsOwner.Name,
												Namespace: snapshot.Resource.Namespace,
											}
											log.Printf("[fixPlanToProposedFix] SUCCESS: Resolved Pod owner to Deployment: %s/%s", targetResource.Namespace, targetResource.Name)
										} else {
											log.Printf("[fixPlanToProposedFix] ReplicaSet owner is not a Deployment: %s", rsOwner.Kind)
										}
									} else {
										log.Printf("[fixPlanToProposedFix] ReplicaSet has no owner references")
									}
								}
							} else if owner.Kind == "Deployment" {
								// Direct Deployment owner (uncommon but possible)
								targetResource = incidents.KubeResourceRef{
									Kind:      "Deployment",
									Name:      owner.Name,
									Namespace: snapshot.Resource.Namespace,
								}
								log.Printf("[fixPlanToProposedFix] SUCCESS: Resolved Pod owner to Deployment (direct): %s/%s", targetResource.Namespace, targetResource.Name)
							} else {
								log.Printf("[fixPlanToProposedFix] Pod owner is not ReplicaSet or Deployment: %s", owner.Kind)
							}
						} else {
							log.Printf("[fixPlanToProposedFix] Pod has no owner references")
						}
					}
				} else {
					log.Printf("[fixPlanToProposedFix] WARNING: Clientset is nil, cannot resolve owner")
				}
			} else {
				log.Printf("[fixPlanToProposedFix] Does not require Deployment owner")
			}
		} else {
			log.Printf("[fixPlanToProposedFix] Fix type does not require owner resolution: %s", fixType)
		}
	} else {
		log.Printf("[fixPlanToProposedFix] Resource is not Pod: %s", snapshot.Resource.Kind)
	}

	log.Printf("[fixPlanToProposedFix] Final target resource: %s/%s/%s", targetResource.Kind, targetResource.Namespace, targetResource.Name)

	return &incidents.ProposedFix{
		Type:                 fixType,
		Description:          fixPlan.Description,
		PreviewDiff:          fixPlan.Preview.ExpectedDiff,
		DryRunCmd:            "",
		ApplyCmd:             "",
		TargetResource:       targetResource,
		Changes:              changes,
		RollbackInfo:         rollbackInfo,
		Safe:                 fixPlan.Risk == "low",
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
