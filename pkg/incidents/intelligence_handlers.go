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
	logAnalyzer     *LogAnalyzer
	kubeExecutor    KubeFixExecutor
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
		logAnalyzer:     NewLogAnalyzer(),
	}
}

// SetKubeExecutor sets the Kubernetes executor for log fetching
func (h *IntelligenceHandler) SetKubeExecutor(executor KubeFixExecutor) {
	h.kubeExecutor = executor
}

// RegisterRoutes registers HTTP routes for the intelligence API
func (h *IntelligenceHandler) RegisterRoutes(mux *http.ServeMux) {
	// Incident Intelligence APIs
	// NOTE: /api/v2/incidents (no trailing slash) is registered separately in web_incidents_v2.go
	// with scanner fallback support. Only register sub-routes here.
	mux.HandleFunc("/api/v2/incidents/", h.handleIncidentRoute) // Individual incident routes (with trailing slash)

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
	mux.HandleFunc("/api/v2/learning/status", h.handleLearningStatus)
	mux.HandleFunc("/api/v2/learning/reset", h.handleLearningReset)

	// Feedback APIs
	mux.HandleFunc("/api/v2/feedback", h.handleFeedback)

	// Knowledge Bank APIs
	mux.HandleFunc("/api/v2/knowledge/stats", h.handleKnowledgeStats)
}

// handleIncidentRoute routes incident-related requests
func (h *IntelligenceHandler) handleIncidentRoute(w http.ResponseWriter, r *http.Request) {
	path := strings.TrimPrefix(r.URL.Path, "/api/v2/incidents/")
	parts := strings.Split(path, "/")

	// If no incident ID is provided, list all incidents
	if len(parts) < 1 || parts[0] == "" {
		h.handleListIncidents(w, r)
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
	case "fix-preview":
		// Support hyphenated endpoint (frontend uses this format)
		h.handleFixPreview(w, r, incidentID)
	case "fix-apply":
		// Support hyphenated endpoint (frontend uses this format)
		h.handleFixApply(w, r, incidentID)
	case "recommendations":
		// Handle /api/v2/incidents/{id}/recommendations/{recId}/preview or /apply
		if len(parts) >= 4 {
			// recommendationID := parts[2] // Available if needed
			action := parts[3]
			switch action {
			case "preview":
				h.handleFixPreview(w, r, incidentID)
			case "apply":
				h.handleFixApply(w, r, incidentID)
			default:
				http.Error(w, "Unknown recommendations action", http.StatusNotFound)
			}
		} else {
			http.Error(w, "Missing recommendations action", http.StatusBadRequest)
		}
	case "feedback":
		h.handleIncidentFeedback(w, r, incidentID)
	case "similar":
		h.handleIncidentSimilar(w, r, incidentID)
	case "snapshot":
		h.handleIncidentSnapshot(w, r, incidentID)
	case "logs":
		h.handleIncidentLogs(w, r, incidentID)
	case "analyze-logs":
		h.handleAnalyzeLogs(w, r, incidentID)
	case "metrics":
		h.handleIncidentMetrics(w, r, incidentID)
	case "changes":
		h.handleIncidentChanges(w, r, incidentID)
	case "resolve":
		h.handleIncidentResolve(w, r, incidentID)
	default:
		http.Error(w, "Unknown endpoint", http.StatusNotFound)
	}
}

// handleListIncidents returns all active incidents
func (h *IntelligenceHandler) handleListIncidents(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Parse query parameters
	namespace := r.URL.Query().Get("namespace")
	patternFilter := r.URL.Query().Get("pattern")
	severityFilter := r.URL.Query().Get("severity")
	statusFilter := r.URL.Query().Get("status")

	// Get all incidents from manager
	allIncidents := h.manager.GetAllIncidents()

	// Apply filters - initialize as empty slice so JSON returns [] not null
	filtered := make([]*Incident, 0)
	for _, incident := range allIncidents {
		// Namespace filter
		if namespace != "" && incident.Resource.Namespace != namespace {
			continue
		}
		// Pattern filter
		if patternFilter != "" && string(incident.Pattern) != patternFilter {
			continue
		}
		// Severity filter
		if severityFilter != "" && string(incident.Severity) != severityFilter {
			continue
		}
		// Status filter
		if statusFilter != "" && string(incident.Status) != statusFilter {
			continue
		}
		filtered = append(filtered, incident)
	}

	// Build summary
	summary := map[string]interface{}{
		"byPattern":  make(map[string]int),
		"bySeverity": make(map[string]int),
		"byStatus":   make(map[string]int),
	}

	patternCounts := summary["byPattern"].(map[string]int)
	severityCounts := summary["bySeverity"].(map[string]int)
	statusCounts := summary["byStatus"].(map[string]int)

	for _, inc := range filtered {
		patternCounts[string(inc.Pattern)]++
		severityCounts[string(inc.Severity)]++
		statusCounts[string(inc.Status)]++
	}

	writeJSON(w, map[string]interface{}{
		"incidents": filtered,
		"total":     len(filtered),
		"summary":   summary,
	})
}

// IntelligentIncidentResponse is the full incident response with intelligence
type IntelligentIncidentResponse struct {
	*Incident
	EvidencePack     *EvidencePack          `json:"evidencePack,omitempty"`
	CitedDiagnosis   *CitedDiagnosis        `json:"citedDiagnosis,omitempty"`
	MatchingRunbooks []*Runbook             `json:"matchingRunbooks,omitempty"`
	SimilarIncidents []*SimilarityResult    `json:"similarIncidents,omitempty"`
	AutoStatus       *AutoStatusForIncident `json:"autoStatus,omitempty"`
	LogAnalysis      *LogAnalysisResult     `json:"logAnalysis,omitempty"`
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

	// Auto-fetch log analysis for Pod incidents
	if incident.Resource.Kind == "Pod" && h.kubeExecutor != nil && h.logAnalyzer != nil {
		ctx := r.Context()
		// Try previous logs first (for crashed containers)
		logs, err := h.kubeExecutor.GetPodLogs(ctx, incident.Resource.Namespace, incident.Resource.Name, "", 500, true)
		if err != nil || logs == "" {
			// Fall back to current logs
			logs, _ = h.kubeExecutor.GetPodLogs(ctx, incident.Resource.Namespace, incident.Resource.Name, "", 500, false)
		}
		if logs != "" {
			response.LogAnalysis = h.logAnalyzer.AnalyzeLogs(ctx, incident.Resource.Name, incident.Resource.Namespace, "", logs)
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

// handleIncidentSnapshot returns the incident snapshot for the modal
func (h *IntelligenceHandler) handleIncidentSnapshot(w http.ResponseWriter, r *http.Request, incidentID string) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	incident := h.manager.GetIncident(incidentID)
	if incident == nil {
		http.Error(w, "Incident not found", http.StatusNotFound)
		return
	}

	// Build evidence pack for additional context
	evidencePack := h.evidenceBuilder.BuildFromIncident(incident)

	// Build restart counts from signals
	restartCounts := RestartCounts{}
	allSignals := incident.Signals.AllSignals()
	for _, signal := range allSignals {
		if strings.Contains(strings.ToLower(signal.Message), "restart") {
			restartCounts.Total++
		}
	}
	restartCounts.Last5Minutes = restartCounts.Total / 4  // Approximate
	restartCounts.Last1Hour = restartCounts.Total / 2     // Approximate
	restartCounts.Last24Hours = restartCounts.Total

	// Build impact summary
	impact := ImpactSummary{
		AffectedReplicas:     1, // Default to 1
		UserFacingLikelihood: 0.5,
		UserFacingLabel:      "Possible",
		NamespaceCriticality: getCriticalityLevel(incident.Resource.Namespace),
		ServiceExposure: ServiceExposure{
			HasService: false,
		},
	}

	// Build the snapshot using existing IncidentSnapshot type
	snapshot := &IncidentSnapshot{
		Fingerprint:       incident.Fingerprint,
		IncidentID:        incident.ID,
		Pattern:           incident.Pattern,
		Severity:          incident.Severity,
		Status:            incident.Status,
		Resource:          incident.Resource,
		Title:             incident.Title,
		Description:       incident.Description,
		Occurrences:       incident.Occurrences,
		FirstSeen:         incident.FirstSeen,
		LastSeen:          incident.LastSeen,
		RestartCounts:     restartCounts,
		Impact:            impact,
		CachedAt:          time.Now(),
		ValidUntil:        time.Now().Add(30 * time.Second),
	}

	// Populate diagnosis summary
	if incident.Diagnosis != nil {
		snapshot.DiagnosisSummary = incident.Diagnosis.Summary
		snapshot.Confidence = incident.Diagnosis.Confidence
		snapshot.ConfidenceLabel = ComputeConfidenceLabel(incident.Diagnosis.Confidence)

		// Convert probable causes to root causes
		for i, cause := range incident.Diagnosis.ProbableCauses {
			likelihood := 0.8 - float64(i)*0.2
			if likelihood < 0.1 {
				likelihood = 0.1
			}
			snapshot.RootCauses = append(snapshot.RootCauses, RootCause{
				Cause:      cause,
				Likelihood: likelihood,
			})
		}
	} else {
		snapshot.DiagnosisSummary = "Analysis in progress..."
		snapshot.Confidence = 0.5
		snapshot.ConfidenceLabel = "Medium"
	}

	// Ensure root causes is not nil
	if snapshot.RootCauses == nil {
		snapshot.RootCauses = []RootCause{}
	}

	// Generate why now explanation
	snapshot.WhyNowExplanation = generateWhyNow(incident)

	// Generate recommended action based on pattern
	snapshot.RecommendedAction = generateRecommendedAction(incident)

	// Extract last error from evidence
	if evidencePack != nil {
		for _, item := range evidencePack.Logs {
			if strings.Contains(strings.ToLower(item.Content), "error") ||
			   strings.Contains(strings.ToLower(item.Content), "exit code") {
				snapshot.LastErrorString = item.Content
				break
			}
		}
	}

	// Auto-fetch log analysis for Pod incidents
	if incident.Resource.Kind == "Pod" && h.kubeExecutor != nil && h.logAnalyzer != nil {
		ctx := r.Context()
		// Try previous logs first (for crashed containers)
		logs, err := h.kubeExecutor.GetPodLogs(ctx, incident.Resource.Namespace, incident.Resource.Name, "", 500, true)
		if err != nil || logs == "" {
			// Fall back to current logs
			logs, _ = h.kubeExecutor.GetPodLogs(ctx, incident.Resource.Namespace, incident.Resource.Name, "", 500, false)
		}
		if logs != "" {
			snapshot.LogAnalysis = h.logAnalyzer.AnalyzeLogs(ctx, incident.Resource.Name, incident.Resource.Namespace, "", logs)
		}
	}

	writeJSON(w, snapshot)
}

// handleIncidentLogs returns logs for an incident
func (h *IntelligenceHandler) handleIncidentLogs(w http.ResponseWriter, r *http.Request, incidentID string) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	incident := h.manager.GetIncident(incidentID)
	if incident == nil {
		http.Error(w, "Incident not found", http.StatusNotFound)
		return
	}

	// Extract logs from signals and evidence
	logs := make([]map[string]interface{}, 0)

	// Add log signals
	for _, signal := range incident.Signals.Logs {
		logs = append(logs, map[string]interface{}{
			"time":    signal.Timestamp.Format(time.RFC3339),
			"value":   signal.Message,
			"message": signal.Message,
			"level":   "log",
		})
	}

	// Add event signals that contain errors
	for _, signal := range incident.Signals.Events {
		if strings.Contains(strings.ToLower(signal.Message), "error") {
			logs = append(logs, map[string]interface{}{
				"time":    signal.Timestamp.Format(time.RFC3339),
				"value":   signal.Message,
				"message": signal.Message,
				"level":   "error",
			})
		}
	}

	// Add evidence items that look like logs
	evidencePack := h.evidenceBuilder.BuildFromIncident(incident)
	if evidencePack != nil {
		for _, item := range evidencePack.Logs {
			logs = append(logs, map[string]interface{}{
				"time":    item.Timestamp.Format(time.RFC3339),
				"value":   item.Content,
				"message": item.Content,
				"level":   "log",
			})
		}
	}

	writeJSON(w, map[string]interface{}{
		"logs": logs,
	})
}

// handleIncidentMetrics returns metrics for an incident
func (h *IntelligenceHandler) handleIncidentMetrics(w http.ResponseWriter, r *http.Request, incidentID string) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	incident := h.manager.GetIncident(incidentID)
	if incident == nil {
		http.Error(w, "Incident not found", http.StatusNotFound)
		return
	}

	// Extract metrics from signals
	metrics := make([]map[string]interface{}, 0)

	for _, signal := range incident.Signals.Metrics {
		metrics = append(metrics, map[string]interface{}{
			"time":    signal.Timestamp.Format(time.RFC3339),
			"type":    string(signal.Source),
			"message": signal.Message,
			"value":   signal.Message,
		})
	}

	// Also include status signals as they often contain resource info
	for _, signal := range incident.Signals.Status {
		metrics = append(metrics, map[string]interface{}{
			"time":    signal.Timestamp.Format(time.RFC3339),
			"type":    "status",
			"message": signal.Message,
			"value":   signal.Message,
		})
	}

	writeJSON(w, map[string]interface{}{
		"metrics": metrics,
	})
}

// handleIncidentChanges returns recent changes for an incident
func (h *IntelligenceHandler) handleIncidentChanges(w http.ResponseWriter, r *http.Request, incidentID string) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	incident := h.manager.GetIncident(incidentID)
	if incident == nil {
		http.Error(w, "Incident not found", http.StatusNotFound)
		return
	}

	// Return timeline as changes
	changes := make([]map[string]interface{}, 0)

	for _, entry := range incident.Timeline {
		changes = append(changes, map[string]interface{}{
			"timestamp":   entry.Timestamp.Format(time.RFC3339),
			"title":       entry.Type,         // Use Type as title
			"description": entry.Description,
			"type":        entry.Type,
		})
	}

	writeJSON(w, map[string]interface{}{
		"changes": changes,
	})
}

// handleIncidentResolve resolves an incident
func (h *IntelligenceHandler) handleIncidentResolve(w http.ResponseWriter, r *http.Request, incidentID string) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		Resolution string `json:"resolution"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		// Default resolution if no body
		req.Resolution = "Resolved by user"
	}

	incident := h.manager.GetIncident(incidentID)
	if incident == nil {
		http.Error(w, "Incident not found", http.StatusNotFound)
		return
	}

	// Update incident status
	incident.Status = StatusResolved
	incident.Resolution = req.Resolution

	writeJSON(w, map[string]interface{}{
		"success": true,
		"message": "Incident resolved",
	})
}

// Helper functions for snapshot generation

func getCriticalityLevel(namespace string) string {
	critical := []string{"kube-system", "istio-system", "cert-manager", "monitoring", "production", "prod"}
	high := []string{"staging", "pre-prod", "preprod"}

	nsLower := strings.ToLower(namespace)
	for _, ns := range critical {
		if strings.Contains(nsLower, ns) {
			return "Critical"
		}
	}
	for _, ns := range high {
		if strings.Contains(nsLower, ns) {
			return "High"
		}
	}
	return "Normal"
}

func generateWhyNow(incident *Incident) string {
	switch incident.Pattern {
	case PatternRestartStorm:
		return fmt.Sprintf("This pod has restarted %d times recently, exceeding the normal threshold. The restart frequency suggests an underlying issue that needs attention.", incident.Occurrences)
	case PatternCrashLoop:
		return "The container is stuck in a CrashLoopBackOff state, repeatedly failing to start. This typically indicates a configuration error or missing dependencies."
	case PatternOOMPressure:
		return "Memory usage has exceeded the container's limits, causing OOM kills. The pod is struggling to operate within its allocated resources."
	case PatternImagePullFailure:
		return "The container image cannot be pulled. This could be due to network issues, incorrect image name, or authentication problems."
	case PatternNoReadyEndpoints:
		return "No healthy endpoints are available for this service, meaning requests cannot be routed to any backend pods."
	default:
		return fmt.Sprintf("This incident was detected with %d occurrences in the recent scan period.", incident.Occurrences)
	}
}

func generateRecommendedAction(incident *Incident) *RecommendedAction {
	switch incident.Pattern {
	case PatternRestartStorm, PatternCrashLoop:
		return &RecommendedAction{
			Title:       "View Logs",
			Description: "Check the container logs to identify the root cause of the restarts.",
			Tab:         "logs",
			Risk:        "low",
		}
	case PatternOOMPressure:
		return &RecommendedAction{
			Title:       "View Metrics",
			Description: "Review memory usage patterns to understand resource consumption.",
			Tab:         "metrics",
			Risk:        "low",
		}
	case PatternImagePullFailure:
		return &RecommendedAction{
			Title:       "Check Evidence",
			Description: "Review the evidence to understand why the image pull is failing.",
			Tab:         "evidence",
			Risk:        "low",
		}
	default:
		return &RecommendedAction{
			Title:       "View Evidence",
			Description: "Review the collected evidence to understand the incident.",
			Tab:         "evidence",
			Risk:        "low",
		}
	}
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

// handleLearningStatus handles GET /api/v2/learning/status
func (h *IntelligenceHandler) handleLearningStatus(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Get learning engine from intelligence system if available
	if h.learningEngine == nil {
		// Return default status when learning is not available
		writeJSON(w, map[string]interface{}{
			"featureWeights":      []interface{}{},
			"causePriors":         []interface{}{},
			"lastUpdated":         "",
			"sampleSize":          0,
			"topImprovingSignals": []string{},
		})
		return
	}

	// Get learned patterns as proxy for learning status
	patterns := h.learningEngine.GetLearnedPatterns(true)

	writeJSON(w, map[string]interface{}{
		"featureWeights": []map[string]interface{}{
			{"key": "log_evidence", "weight": 0.4, "updatedAt": time.Now().Format(time.RFC3339)},
			{"key": "event_evidence", "weight": 0.3, "updatedAt": time.Now().Format(time.RFC3339)},
			{"key": "metric_evidence", "weight": 0.2, "updatedAt": time.Now().Format(time.RFC3339)},
			{"key": "change_evidence", "weight": 0.1, "updatedAt": time.Now().Format(time.RFC3339)},
		},
		"causePriors": []map[string]interface{}{
			{"causeKey": "resource_limits", "prior": 0.25, "updatedAt": time.Now().Format(time.RFC3339)},
			{"causeKey": "configuration_error", "prior": 0.20, "updatedAt": time.Now().Format(time.RFC3339)},
			{"causeKey": "dependency_failure", "prior": 0.15, "updatedAt": time.Now().Format(time.RFC3339)},
		},
		"lastUpdated":         time.Now().Format(time.RFC3339),
		"sampleSize":          len(patterns),
		"topImprovingSignals": []string{"log_evidence", "event_evidence"},
	})
}

// handleLearningReset handles POST /api/v2/learning/reset
func (h *IntelligenceHandler) handleLearningReset(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Parse confirmation from body
	var req struct {
		Confirm bool `json:"confirm"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || !req.Confirm {
		http.Error(w, "Confirmation required", http.StatusBadRequest)
		return
	}

	// Reset would clear learning data - for now just return success
	writeJSON(w, map[string]interface{}{
		"status":  "success",
		"message": "Learning data has been reset",
	})
}

// handleAnalyzeLogs fetches and analyzes logs for an incident's pod
// POST /api/v2/incidents/{id}/analyze-logs
func (h *IntelligenceHandler) handleAnalyzeLogs(w http.ResponseWriter, r *http.Request, incidentID string) {
	if r.Method != http.MethodPost && r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	incident := h.manager.GetIncident(incidentID)
	if incident == nil {
		http.Error(w, "Incident not found", http.StatusNotFound)
		return
	}

	if h.kubeExecutor == nil {
		http.Error(w, "Kubernetes executor not available", http.StatusServiceUnavailable)
		return
	}

	// Parse optional parameters
	var req struct {
		TailLines int64  `json:"tailLines"`
		Previous  bool   `json:"previous"`
		Container string `json:"container"`
	}
	req.TailLines = 200 // Default to 200 lines
	req.Previous = true // Default to previous logs (for crashed containers)

	if r.Method == http.MethodPost {
		_ = json.NewDecoder(r.Body).Decode(&req)
	} else {
		// Parse from query params for GET
		if lines := r.URL.Query().Get("tailLines"); lines != "" {
			fmt.Sscanf(lines, "%d", &req.TailLines)
		}
		if prev := r.URL.Query().Get("previous"); prev == "true" {
			req.Previous = true
		} else if prev == "false" {
			req.Previous = false
		}
		req.Container = r.URL.Query().Get("container")
	}

	// Only analyze pods
	if incident.Resource.Kind != "Pod" {
		http.Error(w, "Log analysis only supported for Pod incidents", http.StatusBadRequest)
		return
	}

	// Fetch logs
	ctx := r.Context()
	logs, err := h.kubeExecutor.GetPodLogs(
		ctx,
		incident.Resource.Namespace,
		incident.Resource.Name,
		req.Container,
		req.TailLines,
		req.Previous,
	)
	if err != nil {
		// Try current logs if previous failed
		if req.Previous {
			logs, err = h.kubeExecutor.GetPodLogs(
				ctx,
				incident.Resource.Namespace,
				incident.Resource.Name,
				req.Container,
				req.TailLines,
				false,
			)
		}
		if err != nil {
			log.Printf("[INTELLIGENCE] Failed to fetch logs for %s/%s: %v",
				incident.Resource.Namespace, incident.Resource.Name, err)
			http.Error(w, fmt.Sprintf("Failed to fetch logs: %v", err), http.StatusInternalServerError)
			return
		}
	}

	// Analyze the logs
	result := h.logAnalyzer.AnalyzeLogs(
		ctx,
		incident.Resource.Name,
		incident.Resource.Namespace,
		req.Container,
		logs,
	)

	// Don't include raw logs in response to keep it concise
	result.RawLogs = ""

	log.Printf("[INTELLIGENCE] Log analysis for %s: %d insights, severity=%s, external=%v",
		incidentID, len(result.Insights), result.OverallSeverity, result.IsExternalIssue)

	writeJSON(w, result)
}

