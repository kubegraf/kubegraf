// Copyright 2025 KubeGraf Contributors
// SPDX-License-Identifier: Apache-2.0

package incidents

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/kubegraf/kubegraf/pkg/capabilities"
)

// IntelligenceHandler handles API requests for the intelligence system
type IntelligenceHandler struct {
	manager         *Manager
	knowledgeBank   *KnowledgeBank
	runbookReg      *RunbookRegistry
	runbookExecutor *RunbookExecutor
	autoEngine      *AutoRemediationEngine
	learningEngine  *LearningEngine
	feedbackService *FeedbackService
	evidenceBuilder *EvidencePackBuilder
	citationBuilder *CitationBuilder
}

// NewIntelligenceHandler creates a new intelligence handler
func NewIntelligenceHandler(
	manager *Manager,
	knowledgeBank *KnowledgeBank,
	runbookReg *RunbookRegistry,
	runbookExecutor *RunbookExecutor,
	autoEngine *AutoRemediationEngine,
	learningEngine *LearningEngine,
) *IntelligenceHandler {
	feedbackService := NewFeedbackService(manager, knowledgeBank, runbookReg, learningEngine)

	return &IntelligenceHandler{
		manager:         manager,
		knowledgeBank:   knowledgeBank,
		runbookReg:      runbookReg,
		runbookExecutor: runbookExecutor,
		autoEngine:      autoEngine,
		learningEngine:  learningEngine,
		feedbackService: feedbackService,
		evidenceBuilder: NewEvidencePackBuilder(),
		citationBuilder: NewCitationBuilder(),
	}
}

// RegisterRoutes registers HTTP routes for the intelligence API
func (h *IntelligenceHandler) RegisterRoutes(mux *http.ServeMux) {
	// Incident Intelligence APIs
	mux.HandleFunc("/api/v2/incidents/", h.handleIncidentRoute)

	// Evidence APIs
	mux.HandleFunc("/api/v2/evidence/", h.handleEvidenceRoute)

	// Runbook APIs
	mux.HandleFunc("/api/v2/runbooks", h.handleRunbooks)
	mux.HandleFunc("/api/v2/runbooks/", h.handleRunbookRoute)

	// Auto-remediation APIs
	mux.HandleFunc("/api/v2/auto-remediation/status", h.handleAutoStatus)
	mux.HandleFunc("/api/v2/auto-remediation/enable", h.handleAutoEnable)
	mux.HandleFunc("/api/v2/auto-remediation/disable", h.handleAutoDisable)
	mux.HandleFunc("/api/v2/auto-remediation/decisions", h.handleAutoDecisions)

	// Learning APIs
	mux.HandleFunc("/api/v2/learning/clusters", h.handleLearningClusters)
	mux.HandleFunc("/api/v2/learning/patterns", h.handleLearnedPatterns)
	mux.HandleFunc("/api/v2/learning/trends", h.handleTrends)
	mux.HandleFunc("/api/v2/learning/similar", h.handleSimilarIncidents)

	// Feedback APIs
	mux.HandleFunc("/api/v2/feedback", h.handleFeedback)

	// Knowledge Bank APIs
	mux.HandleFunc("/api/v2/knowledge/stats", h.handleKnowledgeStats)
}

// handleIncidentRoute routes incident-related requests
func (h *IntelligenceHandler) handleIncidentRoute(w http.ResponseWriter, r *http.Request) {
	path := strings.TrimPrefix(r.URL.Path, "/api/v2/incidents/")
	parts := strings.Split(path, "/")

	if len(parts) < 1 || parts[0] == "" {
		http.Error(w, "Missing incident ID", http.StatusBadRequest)
		return
	}

	incidentID := parts[0]

	if len(parts) == 1 {
		// GET /api/v2/incidents/{id} - Get incident with full intelligence
		h.handleGetIncidentIntelligence(w, r, incidentID)
		return
	}

	// Handle sub-routes
	switch parts[1] {
	case "evidence":
		h.handleIncidentEvidence(w, r, incidentID)
	case "diagnosis":
		h.handleIncidentDiagnosis(w, r, incidentID)
	case "citations":
		h.handleIncidentCitations(w, r, incidentID)
	case "runbooks":
		h.handleIncidentRunbooks(w, r, incidentID)
	case "fix":
		if len(parts) >= 3 {
			switch parts[2] {
			case "preview":
				h.handleFixPreview(w, r, incidentID)
			case "apply":
				h.handleFixApply(w, r, incidentID)
			case "auto-enable":
				h.handleFixAutoEnable(w, r, incidentID)
			default:
				http.Error(w, "Unknown fix endpoint", http.StatusNotFound)
			}
		} else {
			http.Error(w, "Missing fix action", http.StatusBadRequest)
		}
	case "feedback":
		h.handleIncidentFeedback(w, r, incidentID)
	case "similar":
		h.handleIncidentSimilar(w, r, incidentID)
	default:
		http.Error(w, "Unknown endpoint", http.StatusNotFound)
	}
}

// IntelligentIncidentResponse is the full incident response with intelligence
type IntelligentIncidentResponse struct {
	*Incident
	EvidencePack     *EvidencePack       `json:"evidencePack,omitempty"`
	CitedDiagnosis   *CitedDiagnosis     `json:"citedDiagnosis,omitempty"`
	MatchingRunbooks []*Runbook          `json:"matchingRunbooks,omitempty"`
	SimilarIncidents []*SimilarityResult `json:"similarIncidents,omitempty"`
	AutoStatus       *AutoStatusForIncident `json:"autoStatus,omitempty"`
}

// AutoStatusForIncident shows auto-remediation status for an incident
type AutoStatusForIncident struct {
	Eligible    bool   `json:"eligible"`
	Enabled     bool   `json:"enabled"`
	RunbookID   string `json:"runbookId,omitempty"`
	Reason      string `json:"reason,omitempty"`
}

// handleGetIncidentIntelligence returns full incident intelligence
func (h *IntelligenceHandler) handleGetIncidentIntelligence(w http.ResponseWriter, r *http.Request, incidentID string) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	incident := h.manager.GetIncident(incidentID)
	if incident == nil {
		http.Error(w, "Incident not found", http.StatusNotFound)
		return
	}

	response := &IntelligentIncidentResponse{
		Incident: incident,
	}

	// Build evidence pack
	response.EvidencePack = h.evidenceBuilder.BuildFromIncident(incident)

	// Build cited diagnosis
	response.CitedDiagnosis = BuildCitedDiagnosis(incident, response.EvidencePack)

	// Get matching runbooks
	response.MatchingRunbooks = h.runbookReg.GetByPattern(incident.Pattern)

	// Find similar incidents
	if h.learningEngine != nil {
		response.SimilarIncidents = h.learningEngine.FindSimilarIncidents(incident, 5)
	}

	// Check auto-remediation eligibility
	if h.autoEngine != nil && len(response.MatchingRunbooks) > 0 {
		runbook := response.MatchingRunbooks[0]
		confidence := 0.0
		if incident.Diagnosis != nil {
			confidence = incident.Diagnosis.Confidence
		}
		eligible := h.runbookReg.CanAutoExecute(runbook, incident, confidence)
		response.AutoStatus = &AutoStatusForIncident{
			Eligible:  eligible,
			Enabled:   h.autoEngine.config.Enabled,
			RunbookID: runbook.ID,
		}
		if !eligible {
			response.AutoStatus.Reason = "Does not meet auto-execution criteria"
		}
	}

	writeJSON(w, response)
}

// handleIncidentEvidence returns evidence pack for an incident
func (h *IntelligenceHandler) handleIncidentEvidence(w http.ResponseWriter, r *http.Request, incidentID string) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	incident := h.manager.GetIncident(incidentID)
	if incident == nil {
		http.Error(w, "Incident not found", http.StatusNotFound)
		return
	}

	evidencePack := h.evidenceBuilder.BuildFromIncident(incident)
	writeJSON(w, evidencePack)
}

// handleIncidentDiagnosis returns cited diagnosis for an incident
func (h *IntelligenceHandler) handleIncidentDiagnosis(w http.ResponseWriter, r *http.Request, incidentID string) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	incident := h.manager.GetIncident(incidentID)
	if incident == nil {
		http.Error(w, "Incident not found", http.StatusNotFound)
		return
	}

	evidencePack := h.evidenceBuilder.BuildFromIncident(incident)
	diagnosis := BuildCitedDiagnosis(incident, evidencePack)
	writeJSON(w, diagnosis)
}

// handleIncidentCitations returns citations for an incident
func (h *IntelligenceHandler) handleIncidentCitations(w http.ResponseWriter, r *http.Request, incidentID string) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	incident := h.manager.GetIncident(incidentID)
	if incident == nil {
		http.Error(w, "Incident not found", http.StatusNotFound)
		return
	}

	evidencePack := h.evidenceBuilder.BuildFromIncident(incident)
	citations := h.citationBuilder.BuildFromEvidencePack(evidencePack, 20)

	// Add documentation citations
	docCitations := GetDocCitationsForPattern(incident.Pattern)
	citations = append(citations, docCitations...)

	writeJSON(w, citations)
}

// handleIncidentRunbooks returns applicable runbooks for an incident
func (h *IntelligenceHandler) handleIncidentRunbooks(w http.ResponseWriter, r *http.Request, incidentID string) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	incident := h.manager.GetIncident(incidentID)
	if incident == nil {
		http.Error(w, "Incident not found", http.StatusNotFound)
		return
	}

	runbooks := h.runbookReg.GetByPattern(incident.Pattern)

	// Add ranking info from learning engine
	if h.learningEngine != nil {
		rankings := h.learningEngine.GetBestRunbooks(incident.Pattern, 10)
		for _, runbook := range runbooks {
			for _, ranking := range rankings {
				if ranking.RunbookID == runbook.ID {
					runbook.SuccessRate = ranking.SuccessRate
					runbook.ExecutionCount = ranking.ExecutionCount
					break
				}
			}
		}
	}

	writeJSON(w, runbooks)
}

// FixPreviewRequest is the request for fix preview
type FixPreviewRequestIntel struct {
	RunbookID string `json:"runbookId"`
}

// FixPreviewResponseIntel is the response for fix preview
type FixPreviewResponseIntel struct {
	Valid       bool       `json:"valid"`
	Description string     `json:"description"`
	Diff        string     `json:"diff,omitempty"`
	DryRunCmd   string     `json:"dryRunCmd"`
	ApplyCmd    string     `json:"applyCmd"`
	RollbackCmd string     `json:"rollbackCmd,omitempty"`
	Citations   []Citation `json:"citations,omitempty"`
	Risks       []string   `json:"risks,omitempty"`
	GeneratedAt time.Time  `json:"generatedAt"`
}

// handleFixPreview generates a fix preview
func (h *IntelligenceHandler) handleFixPreview(w http.ResponseWriter, r *http.Request, incidentID string) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req FixPreviewRequestIntel
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	incident := h.manager.GetIncident(incidentID)
	if incident == nil {
		http.Error(w, "Incident not found", http.StatusNotFound)
		return
	}

	runbook := h.runbookReg.Get(req.RunbookID)
	if runbook == nil {
		// If no runbook specified, get the first matching one
		runbooks := h.runbookReg.GetByPattern(incident.Pattern)
		if len(runbooks) == 0 {
			http.Error(w, "No runbook available for this incident", http.StatusNotFound)
			return
		}
		runbook = runbooks[0]
	}

	// Generate preview
	response := &FixPreviewResponseIntel{
		Valid:       true,
		Description: runbook.Action.Description,
		DryRunCmd:   h.renderCommand(runbook.Action.DryRunCommand, incident.Resource),
		ApplyCmd:    h.renderCommand(runbook.Action.ApplyCommand, incident.Resource),
		GeneratedAt: time.Now(),
	}

	if runbook.Rollback != nil {
		response.RollbackCmd = h.renderCommand(runbook.Rollback.RollbackCommand, incident.Resource)
	}

	// Add risks based on runbook risk level
	switch runbook.Risk {
	case RiskRunbookLow:
		response.Risks = []string{"Low risk: Pod recreation may cause brief unavailability"}
	case RiskRunbookMedium:
		response.Risks = []string{"Medium risk: Service may experience temporary disruption"}
	case RiskRunbookHigh:
		response.Risks = []string{"High risk: Significant impact possible, review carefully"}
	case RiskRunbookCritical:
		response.Risks = []string{"Critical risk: Major impact expected, proceed with extreme caution"}
	}

	// Add citations from evidence
	evidencePack := h.evidenceBuilder.BuildFromIncident(incident)
	response.Citations = h.citationBuilder.BuildFromEvidencePack(evidencePack, 5)

	writeJSON(w, response)
}

// FixApplyRequestIntel is the request for fix apply
type FixApplyRequestIntel struct {
	RunbookID string `json:"runbookId"`
	DryRun    bool   `json:"dryRun"`
}

// FixApplyResponseIntel is the response for fix apply
type FixApplyResponseIntel struct {
	Success     bool      `json:"success"`
	ExecutionID string    `json:"executionId,omitempty"`
	Message     string    `json:"message"`
	DryRun      bool      `json:"dryRun"`
	RollbackCmd string    `json:"rollbackCmd,omitempty"`
	AppliedAt   time.Time `json:"appliedAt"`
	Error       string    `json:"error,omitempty"`
}

// handleFixApply applies a fix
func (h *IntelligenceHandler) handleFixApply(w http.ResponseWriter, r *http.Request, incidentID string) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req FixApplyRequestIntel
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	incident := h.manager.GetIncident(incidentID)
	if incident == nil {
		http.Error(w, "Incident not found", http.StatusNotFound)
		return
	}

	runbook := h.runbookReg.Get(req.RunbookID)
	if runbook == nil {
		runbooks := h.runbookReg.GetByPattern(incident.Pattern)
		if len(runbooks) == 0 {
			http.Error(w, "No runbook available", http.StatusNotFound)
			return
		}
		runbook = runbooks[0]
	}

	// Execute runbook
	execution, err := h.runbookExecutor.Execute(r.Context(), runbook.ID, incident, req.DryRun, "user")
	if err != nil {
		writeJSON(w, &FixApplyResponseIntel{
			Success:   false,
			DryRun:    req.DryRun,
			AppliedAt: time.Now(),
			Error:     err.Error(),
		})
		return
	}

	response := &FixApplyResponseIntel{
		Success:     true,
		ExecutionID: execution.ID,
		Message:     fmt.Sprintf("Runbook %s execution started", runbook.Name),
		DryRun:      req.DryRun,
		AppliedAt:   time.Now(),
	}

	if runbook.Rollback != nil {
		response.RollbackCmd = h.renderCommand(runbook.Rollback.RollbackCommand, incident.Resource)
	}

	writeJSON(w, response)
}

// handleFixAutoEnable enables auto-remediation for an incident
func (h *IntelligenceHandler) handleFixAutoEnable(w http.ResponseWriter, r *http.Request, incidentID string) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		RunbookID string `json:"runbookId"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if h.autoEngine == nil {
		http.Error(w, "Auto-remediation not available", http.StatusServiceUnavailable)
		return
	}

	err := h.autoEngine.EnableAutoForIncident(incidentID, req.RunbookID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	writeJSON(w, map[string]interface{}{
		"success": true,
		"message": "Auto-remediation enabled for incident",
	})
}

// handleIncidentFeedback handles feedback submission for an incident
func (h *IntelligenceHandler) handleIncidentFeedback(w http.ResponseWriter, r *http.Request, incidentID string) {
	switch r.Method {
	case http.MethodGet:
		// Get feedback history
		feedbacks, err := h.feedbackService.GetFeedbackHistory(incidentID)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		writeJSON(w, feedbacks)

	case http.MethodPost:
		// Submit feedback
		var req FeedbackRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "Invalid request body", http.StatusBadRequest)
			return
		}
		req.IncidentID = incidentID

		response, err := h.feedbackService.SubmitFeedback(req, "user") // TODO: Get actual user ID
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		writeJSON(w, response)

	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

// handleIncidentSimilar returns similar incidents
func (h *IntelligenceHandler) handleIncidentSimilar(w http.ResponseWriter, r *http.Request, incidentID string) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	incident := h.manager.GetIncident(incidentID)
	if incident == nil {
		http.Error(w, "Incident not found", http.StatusNotFound)
		return
	}

	if h.learningEngine == nil {
		writeJSON(w, []*SimilarityResult{})
		return
	}

	similar := h.learningEngine.FindSimilarIncidents(incident, 10)
	writeJSON(w, similar)
}

// handleEvidenceRoute handles evidence-related requests
func (h *IntelligenceHandler) handleEvidenceRoute(w http.ResponseWriter, r *http.Request) {
	// Get incident ID from path
	path := strings.TrimPrefix(r.URL.Path, "/api/v2/evidence/")
	if path == "" {
		http.Error(w, "Missing incident ID", http.StatusBadRequest)
		return
	}

	incidentID := path
	incident := h.manager.GetIncident(incidentID)
	if incident == nil {
		http.Error(w, "Incident not found", http.StatusNotFound)
		return
	}

	evidencePack := h.evidenceBuilder.BuildFromIncident(incident)
	writeJSON(w, evidencePack)
}

// handleRunbooks returns all runbooks
func (h *IntelligenceHandler) handleRunbooks(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	runbooks := h.runbookReg.GetAll()
	writeJSON(w, runbooks)
}

// handleRunbookRoute handles individual runbook requests
func (h *IntelligenceHandler) handleRunbookRoute(w http.ResponseWriter, r *http.Request) {
	path := strings.TrimPrefix(r.URL.Path, "/api/v2/runbooks/")
	if path == "" {
		http.Error(w, "Missing runbook ID", http.StatusBadRequest)
		return
	}

	runbook := h.runbookReg.Get(path)
	if runbook == nil {
		http.Error(w, "Runbook not found", http.StatusNotFound)
		return
	}

	writeJSON(w, runbook)
}

// handleAutoStatus returns auto-remediation status
func (h *IntelligenceHandler) handleAutoStatus(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Check capabilities - if disabled, return disabled status
	if !capabilities.IsAutoRemediationEnabled() {
		writeJSON(w, &AutoRemediationStatus{Enabled: false})
		return
	}

	if h.autoEngine == nil {
		writeJSON(w, &AutoRemediationStatus{Enabled: false})
		return
	}

	status := h.autoEngine.GetStatus()
	writeJSON(w, status)
}

// handleAutoEnable enables auto-remediation
func (h *IntelligenceHandler) handleAutoEnable(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Check capabilities - auto-remediation must be enabled
	if !capabilities.IsAutoRemediationEnabled() {
		http.Error(w, "Auto-remediation is not enabled in this release", http.StatusForbidden)
		return
	}

	if h.autoEngine == nil {
		http.Error(w, "Auto-remediation not available", http.StatusServiceUnavailable)
		return
	}

	h.autoEngine.Enable()
	writeJSON(w, map[string]interface{}{
		"success": true,
		"message": "Auto-remediation enabled",
	})
}

// handleAutoDisable disables auto-remediation
func (h *IntelligenceHandler) handleAutoDisable(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	if h.autoEngine == nil {
		http.Error(w, "Auto-remediation not available", http.StatusServiceUnavailable)
		return
	}

	h.autoEngine.Disable()
	writeJSON(w, map[string]interface{}{
		"success": true,
		"message": "Auto-remediation disabled",
	})
}

// handleAutoDecisions returns recent auto-remediation decisions
func (h *IntelligenceHandler) handleAutoDecisions(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Check capabilities - if disabled, return empty list
	if !capabilities.IsAutoRemediationEnabled() {
		writeJSON(w, []*AutoRemediationDecision{})
		return
	}

	if h.autoEngine == nil {
		writeJSON(w, []*AutoRemediationDecision{})
		return
	}

	decisions := h.autoEngine.GetRecentDecisions(50)
	writeJSON(w, decisions)
}

// handleLearningClusters returns incident clusters
func (h *IntelligenceHandler) handleLearningClusters(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Check capabilities - learning engine must be enabled
	if !capabilities.IsLearningEngineEnabled() {
		writeJSON(w, []*IncidentCluster{})
		return
	}

	if h.learningEngine == nil {
		writeJSON(w, []*IncidentCluster{})
		return
	}

	clusters := h.learningEngine.GetAllClusters()
	writeJSON(w, clusters)
}

// handleLearnedPatterns returns learned patterns
func (h *IntelligenceHandler) handleLearnedPatterns(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	if h.learningEngine == nil {
		writeJSON(w, []*LearnedPattern{})
		return
	}

	includeAnomalies := r.URL.Query().Get("anomalies") == "true"
	patterns := h.learningEngine.GetLearnedPatterns(includeAnomalies)
	writeJSON(w, patterns)
}

// handleTrends returns pattern trends
func (h *IntelligenceHandler) handleTrends(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	if h.learningEngine == nil {
		writeJSON(w, map[string]*PatternTrend{})
		return
	}

	h.learningEngine.UpdateTrends()

	// Get trends for all known patterns
	patterns := []FailurePattern{
		PatternCrashLoop, PatternOOMPressure, PatternRestartStorm,
		PatternImagePullFailure, PatternNoReadyEndpoints,
	}

	trends := make(map[string]*PatternTrend)
	for _, pattern := range patterns {
		if trend := h.learningEngine.GetTrend(pattern); trend != nil {
			trends[string(pattern)] = trend
		}
	}

	writeJSON(w, trends)
}

// handleSimilarIncidents finds similar incidents to a given fingerprint
func (h *IntelligenceHandler) handleSimilarIncidents(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Check capabilities - similar incidents must be enabled
	if !capabilities.IsSimilarIncidentsEnabled() {
		writeJSON(w, []*SimilarityResult{})
		return
	}

	incidentID := r.URL.Query().Get("incidentId")
	if incidentID == "" {
		http.Error(w, "Missing incidentId query parameter", http.StatusBadRequest)
		return
	}

	incident := h.manager.GetIncident(incidentID)
	if incident == nil {
		http.Error(w, "Incident not found", http.StatusNotFound)
		return
	}

	if h.learningEngine == nil {
		writeJSON(w, []*SimilarityResult{})
		return
	}

	similar := h.learningEngine.FindSimilarIncidents(incident, 10)
	writeJSON(w, similar)
}

// handleFeedback handles global feedback submissions
func (h *IntelligenceHandler) handleFeedback(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req FeedbackRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.IncidentID == "" {
		http.Error(w, "Missing incidentId", http.StatusBadRequest)
		return
	}

	response, err := h.feedbackService.SubmitFeedback(req, "user")
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	writeJSON(w, response)
}

// handleKnowledgeStats returns knowledge bank statistics
func (h *IntelligenceHandler) handleKnowledgeStats(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	stats := map[string]interface{}{
		"available": h.knowledgeBank != nil,
	}

	if h.knowledgeBank != nil {
		recent, _ := h.knowledgeBank.GetRecentIncidents(100)
		unresolved, _ := h.knowledgeBank.GetUnresolvedIncidents(100)

		stats["totalIncidents"] = len(recent)
		stats["unresolvedIncidents"] = len(unresolved)

		// Get pattern stats
		patternStats := make(map[string]interface{})
		patterns := []FailurePattern{
			PatternCrashLoop, PatternOOMPressure, PatternRestartStorm,
		}
		for _, pattern := range patterns {
			if pStats, err := h.knowledgeBank.GetPatternStats(pattern); err == nil && pStats != nil {
				patternStats[string(pattern)] = pStats
			}
		}
		stats["patternStats"] = patternStats
	}

	writeJSON(w, stats)
}

// renderCommand renders a command template with resource values
func (h *IntelligenceHandler) renderCommand(template string, resource KubeResourceRef) string {
	result := template
	result = strings.ReplaceAll(result, "{{.Name}}", resource.Name)
	result = strings.ReplaceAll(result, "{{.Namespace}}", resource.Namespace)
	result = strings.ReplaceAll(result, "{{.Kind}}", resource.Kind)
	return result
}

// writeJSON writes JSON response
func writeJSON(w http.ResponseWriter, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(data); err != nil {
		log.Printf("Error encoding JSON response: %v", err)
	}
}

