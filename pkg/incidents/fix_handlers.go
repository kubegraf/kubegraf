// Copyright 2025 KubeGraf Contributors
// SPDX-License-Identifier: Apache-2.0

package incidents

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strings"
	"sync"
	"time"
)

// FixActionHandler handles fix preview and apply operations
type FixActionHandler struct {
	manager   *Manager
	registry  *FixGeneratorRegistry
	executor  *FixExecutor
	actionLog []FixActionLog
	logMu     sync.RWMutex
}

// NewFixActionHandler creates a new fix action handler
func NewFixActionHandler(manager *Manager, executor *FixExecutor) *FixActionHandler {
	return &FixActionHandler{
		manager:   manager,
		registry:  NewFixGeneratorRegistry(),
		executor:  executor,
		actionLog: make([]FixActionLog, 0, 100),
	}
}

// SetManager sets the incident manager
func (h *FixActionHandler) SetManager(manager *Manager) {
	h.manager = manager
}

// SetExecutor sets the fix executor
func (h *FixActionHandler) SetExecutor(executor *FixExecutor) {
	h.executor = executor
}

// HandleFixPreview handles POST /incidents/{id}/fix-preview
func (h *FixActionHandler) HandleFixPreview(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Extract incident ID from path
	path := r.URL.Path
	incidentID := extractIncidentID(path, "fix-preview")
	if incidentID == "" {
		http.Error(w, "Missing incident ID", http.StatusBadRequest)
		return
	}

	// Parse request body
	var req FixPreviewRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		// If no body, use incident ID from path
		req.IncidentID = incidentID
	}
	if req.IncidentID == "" {
		req.IncidentID = incidentID
	}

	// Get the incident
	incident := h.manager.GetIncident(req.IncidentID)
	if incident == nil {
		http.Error(w, "Incident not found", http.StatusNotFound)
		return
	}

	// Find the recommendation with a fix
	var fix *ProposedFix
	if req.RecommendationID != "" {
		// Find specific recommendation
		for _, rec := range incident.Recommendations {
			if rec.ID == req.RecommendationID && rec.ProposedFix != nil {
				fix = rec.ProposedFix
				break
			}
		}
	} else {
		// Find first recommendation with a fix
		for _, rec := range incident.Recommendations {
			if rec.ProposedFix != nil {
				fix = rec.ProposedFix
				req.RecommendationID = rec.ID
				break
			}
		}
	}

	// If no fix found on recommendations, generate one
	if fix == nil {
		fixes := h.registry.GenerateFixes(incident)
		if len(fixes) > 0 {
			fix = fixes[0]
		}
	}

	if fix == nil {
		http.Error(w, "No fix available for this incident", http.StatusNotFound)
		return
	}

	// Validate the fix is safe
	if err := ValidateFixAction(nil, fix.TargetResource); err != nil {
		response := &FixPreviewResponse{
			Valid:           false,
			ValidationError: err.Error(),
			TargetResource:  fix.TargetResource,
			GeneratedAt:     time.Now(),
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(response)
		return
	}

	// Generate preview
	ctx := r.Context()
	var preview *FixPreview
	var previewErr error

	if h.executor != nil {
		preview, previewErr = h.executor.Preview(ctx, fix)
	}

	// Build response
	response := &FixPreviewResponse{
		Valid:          true,
		Description:    fix.Description,
		Diff:           fix.PreviewDiff,
		DryRunCmd:      fix.DryRunCmd,
		ApplyCmd:       fix.ApplyCmd,
		TargetResource: fix.TargetResource,
		GeneratedAt:    time.Now(),
	}

	if preview != nil {
		response.Valid = preview.Valid
		response.ValidationError = preview.ValidationError
		if preview.Diff != "" {
			response.Diff = preview.Diff
		}
		response.Risks = preview.Risks
	}

	if previewErr != nil {
		response.Valid = false
		response.ValidationError = previewErr.Error()
	}

	// Add risks
	if response.Risks == nil {
		response.Risks = []string{}
	}
	if !fix.Safe {
		response.Risks = append(response.Risks, "This fix modifies cluster state")
	}

	// Log the preview action
	h.logAction(FixActionLog{
		Timestamp:        time.Now(),
		IncidentID:       req.IncidentID,
		RecommendationID: req.RecommendationID,
		ActionType:       ActionTypePreviewPatch,
		TargetResource:   fix.TargetResource,
		DryRun:           true,
		Success:          response.Valid,
	})

	log.Printf("[FIX-PREVIEW] Incident=%s Resource=%s Valid=%v", req.IncidentID, fix.TargetResource.String(), response.Valid)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// HandleFixApply handles POST /incidents/{id}/fix-apply
func (h *FixActionHandler) HandleFixApply(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Extract incident ID from path
	path := r.URL.Path
	incidentID := extractIncidentID(path, "fix-apply")
	if incidentID == "" {
		http.Error(w, "Missing incident ID", http.StatusBadRequest)
		return
	}

	// Parse request body
	var req FixApplyRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		req.IncidentID = incidentID
	}
	if req.IncidentID == "" {
		req.IncidentID = incidentID
	}

	// Get the incident
	incident := h.manager.GetIncident(req.IncidentID)
	if incident == nil {
		http.Error(w, "Incident not found", http.StatusNotFound)
		return
	}

	// Find the fix
	var fix *ProposedFix
	if req.RecommendationID != "" {
		for _, rec := range incident.Recommendations {
			if rec.ID == req.RecommendationID && rec.ProposedFix != nil {
				fix = rec.ProposedFix
				break
			}
		}
	} else {
		for _, rec := range incident.Recommendations {
			if rec.ProposedFix != nil {
				fix = rec.ProposedFix
				req.RecommendationID = rec.ID
				break
			}
		}
	}

	if fix == nil {
		fixes := h.registry.GenerateFixes(incident)
		if len(fixes) > 0 {
			fix = fixes[0]
		}
	}

	if fix == nil {
		http.Error(w, "No fix available for this incident", http.StatusNotFound)
		return
	}

	// Validate the fix
	if err := ValidateFixAction(nil, fix.TargetResource); err != nil {
		response := &FixApplyResponse{
			Success:   false,
			Error:     err.Error(),
			DryRun:    req.DryRun,
			AppliedAt: time.Now(),
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(response)
		return
	}

	ctx := r.Context()
	response := &FixApplyResponse{
		DryRun:    req.DryRun,
		AppliedAt: time.Now(),
	}

	// Execute the fix
	if h.executor != nil {
		var result *FixResult
		var err error

		if req.DryRun {
			result, err = h.executor.DryRun(ctx, fix)
		} else {
			result, err = h.executor.Apply(ctx, fix)
		}

		if err != nil {
			response.Success = false
			response.Error = err.Error()
		} else if result != nil {
			response.Success = result.Success
			response.Message = result.Message
			response.Changes = result.Changes
			response.Error = result.Error
			if result.RollbackCommand != "" {
				response.RollbackCmd = result.RollbackCommand
			}
		}
	} else {
		// No executor - return commands for manual execution
		response.Success = true
		if req.DryRun {
			response.Message = fmt.Sprintf("Dry run: %s", fix.DryRunCmd)
		} else {
			response.Message = fmt.Sprintf("Apply command: %s", fix.ApplyCmd)
		}
		response.Changes = []string{fix.Description}
	}

	// Log the action
	h.logAction(FixActionLog{
		Timestamp:        time.Now(),
		IncidentID:       req.IncidentID,
		RecommendationID: req.RecommendationID,
		ActionType:       fixTypeToActionType(fix.Type),
		TargetResource:   fix.TargetResource,
		DryRun:           req.DryRun,
		Success:          response.Success,
		Error:            response.Error,
	})

	actionType := "DRY-RUN"
	if !req.DryRun {
		actionType = "APPLY"
	}
	log.Printf("[FIX-%s] Incident=%s Resource=%s Success=%v", actionType, req.IncidentID, fix.TargetResource.String(), response.Success)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// HandleFixActions handles GET /incidents/{id}/fix-actions
func (h *FixActionHandler) HandleFixActions(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Extract incident ID from path
	path := r.URL.Path
	incidentID := extractIncidentID(path, "fix-actions")
	if incidentID == "" {
		http.Error(w, "Missing incident ID", http.StatusBadRequest)
		return
	}

	// Get the incident
	incident := h.manager.GetIncident(incidentID)
	if incident == nil {
		http.Error(w, "Incident not found", http.StatusNotFound)
		return
	}

	// Collect all available actions
	type ActionInfo struct {
		RecommendationID string     `json:"recommendationId"`
		RecommendationTitle string  `json:"recommendationTitle"`
		Action           *FixAction `json:"action"`
		HasFix           bool       `json:"hasFix"`
	}

	actions := []ActionInfo{}

	for _, rec := range incident.Recommendations {
		if rec.Action != nil || rec.ProposedFix != nil {
			action := rec.Action
			if action == nil && rec.ProposedFix != nil {
				action = fixToAction(rec.ProposedFix)
			}
			actions = append(actions, ActionInfo{
				RecommendationID:    rec.ID,
				RecommendationTitle: rec.Title,
				Action:              action,
				HasFix:              rec.ProposedFix != nil,
			})
		}
	}

	// Also add pattern-based actions
	patternActions := GetActionsForPattern(incident.Pattern)
	for _, pa := range patternActions {
		// Check if we already have this action type
		found := false
		for _, existing := range actions {
			if existing.Action != nil && existing.Action.Type == pa.Type {
				found = true
				break
			}
		}
		if !found {
			paCopy := pa // Copy to avoid pointer issues
			actions = append(actions, ActionInfo{
				RecommendationID:    "",
				RecommendationTitle: pa.Label,
				Action:              &paCopy,
				HasFix:              true,
			})
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"incidentId": incidentID,
		"pattern":    incident.Pattern,
		"actions":    actions,
	})
}

// GetActionLog returns the action log
func (h *FixActionHandler) GetActionLog() []FixActionLog {
	h.logMu.RLock()
	defer h.logMu.RUnlock()
	return append([]FixActionLog{}, h.actionLog...)
}

// logAction adds an entry to the action log
func (h *FixActionHandler) logAction(entry FixActionLog) {
	h.logMu.Lock()
	defer h.logMu.Unlock()

	h.actionLog = append(h.actionLog, entry)

	// Keep log bounded
	if len(h.actionLog) > 1000 {
		h.actionLog = h.actionLog[len(h.actionLog)-500:]
	}
}

// ProcessIncidentFixes enhances incident recommendations with generated fixes
func (h *FixActionHandler) ProcessIncidentFixes(ctx context.Context, incident *Incident) {
	EnhanceRecommendationsWithActions(incident, h.registry)
}

// extractIncidentID extracts the incident ID from a path like /incidents/{id}/fix-preview
func extractIncidentID(path, action string) string {
	// Remove leading /api/v2 if present
	path = strings.TrimPrefix(path, "/api/v2")
	path = strings.TrimPrefix(path, "/api")
	
	// Expected format: /incidents/{id}/fix-preview or /incidents/{id}/fix-apply
	parts := strings.Split(strings.Trim(path, "/"), "/")
	
	for i, part := range parts {
		if part == "incidents" && i+1 < len(parts) {
			// Next part is the ID
			id := parts[i+1]
			// Make sure it's not the action itself
			if id != action && id != "fix-preview" && id != "fix-apply" && id != "fix-actions" {
				return id
			}
		}
	}
	return ""
}

// fixTypeToActionType converts FixType to FixActionType
func fixTypeToActionType(ft FixType) FixActionType {
	switch ft {
	case FixTypeRestart:
		return ActionTypeRestart
	case FixTypePatch:
		return ActionTypePreviewPatch
	case FixTypeScale:
		return ActionTypeScale
	case FixTypeRollback:
		return ActionTypeRollback
	case FixTypeDelete:
		return ActionTypeDeletePod
	default:
		return ActionTypePreviewPatch
	}
}

