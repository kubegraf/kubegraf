// Copyright 2025 KubeGraf Contributors
// SPDX-License-Identifier: Apache-2.0

package incidents

import (
	"encoding/json"
	"net/http"
	"strconv"
	"time"
)

// APIHandler provides HTTP handlers for the incident intelligence API.
type APIHandler struct {
	manager *Manager
}

// NewAPIHandler creates a new API handler.
func NewAPIHandler(manager *Manager) *APIHandler {
	return &APIHandler{
		manager: manager,
	}
}

// RegisterRoutes registers all incident API routes with a mux.
// This is a helper for integration with existing routers.
func (h *APIHandler) RegisterRoutes(mux *http.ServeMux) {
	mux.HandleFunc("/api/v1/incidents", h.HandleIncidents)
	mux.HandleFunc("/api/v1/incidents/", h.HandleIncidentByID)
	mux.HandleFunc("/api/v1/incidents/summary", h.HandleSummary)
	mux.HandleFunc("/api/v1/incidents/patterns", h.HandlePatterns)
}

// HandleIncidents handles GET /api/v1/incidents
func (h *APIHandler) HandleIncidents(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Parse query parameters
	query := r.URL.Query()
	filter := IncidentFilter{
		Namespace: query.Get("namespace"),
	}

	if pattern := query.Get("pattern"); pattern != "" {
		filter.Pattern = FailurePattern(pattern)
	}

	if severity := query.Get("severity"); severity != "" {
		filter.Severity = Severity(severity)
	}

	if status := query.Get("status"); status != "" {
		filter.Status = IncidentStatus(status)
	}

	if since := query.Get("since"); since != "" {
		if t, err := time.Parse(time.RFC3339, since); err == nil {
			filter.Since = t
		}
	}

	if limit := query.Get("limit"); limit != "" {
		if l, err := strconv.Atoi(limit); err == nil {
			filter.Limit = l
		}
	}

	// Active only filter
	activeOnly := query.Get("active") == "true"

	var incidents []*Incident
	if activeOnly {
		incidents = h.manager.GetActiveIncidents()
	} else if filter != (IncidentFilter{}) {
		incidents = h.manager.FilterIncidents(filter)
	} else {
		incidents = h.manager.GetAllIncidents()
	}

	response := IncidentsResponse{
		Incidents: incidents,
		Total:     len(incidents),
		Summary:   h.manager.GetSummary(),
	}

	h.writeJSON(w, response)
}

// HandleIncidentByID handles GET/PUT /api/v1/incidents/{id}
func (h *APIHandler) HandleIncidentByID(w http.ResponseWriter, r *http.Request) {
	// Extract ID from path (simple extraction, works with /api/v1/incidents/{id})
	path := r.URL.Path
	// Find the last segment
	for i := len(path) - 1; i >= 0; i-- {
		if path[i] == '/' {
			if i < len(path)-1 {
				id := path[i+1:]
				h.handleIncidentByIDWithID(w, r, id)
				return
			}
			break
		}
	}

	http.Error(w, "Incident ID required", http.StatusBadRequest)
}

func (h *APIHandler) handleIncidentByIDWithID(w http.ResponseWriter, r *http.Request, id string) {
	// Handle sub-paths
	// Check for actions like /api/v1/incidents/{id}/recommendations/{recId}/preview
	parts := splitPath(id)

	if len(parts) == 1 {
		// Simple GET /api/v1/incidents/{id}
		switch r.Method {
		case http.MethodGet:
			h.handleGetIncident(w, parts[0])
		case http.MethodPut, http.MethodPatch:
			h.handleUpdateIncident(w, r, parts[0])
		default:
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
		return
	}

	// Handle sub-paths
	incidentID := parts[0]
	action := parts[1]

	switch action {
	case "resolve":
		h.handleResolveIncident(w, r, incidentID)
	case "suppress":
		h.handleSuppressIncident(w, r, incidentID)
	case "acknowledge":
		h.handleAcknowledgeIncident(w, r, incidentID)
	case "recommendations":
		if len(parts) >= 4 {
			recID := parts[2]
			recAction := parts[3]
			h.handleRecommendationAction(w, r, incidentID, recID, recAction)
		} else {
			h.handleGetRecommendations(w, incidentID)
		}
	case "timeline":
		h.handleGetTimeline(w, incidentID)
	case "signals":
		h.handleGetSignals(w, incidentID)
	default:
		http.Error(w, "Unknown action", http.StatusNotFound)
	}
}

func (h *APIHandler) handleGetIncident(w http.ResponseWriter, id string) {
	incident := h.manager.GetIncident(id)
	if incident == nil {
		http.Error(w, "Incident not found", http.StatusNotFound)
		return
	}

	h.writeJSON(w, incident)
}

func (h *APIHandler) handleUpdateIncident(w http.ResponseWriter, r *http.Request, id string) {
	var update IncidentUpdateRequest
	if err := json.NewDecoder(r.Body).Decode(&update); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	incident := h.manager.GetIncident(id)
	if incident == nil {
		http.Error(w, "Incident not found", http.StatusNotFound)
		return
	}

	if update.Status != "" {
		if err := h.manager.aggregator.UpdateIncidentStatus(id, update.Status, update.Reason); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
	}

	h.writeJSON(w, h.manager.GetIncident(id))
}

func (h *APIHandler) handleResolveIncident(w http.ResponseWriter, r *http.Request, id string) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req ResolveRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		req.Resolution = "Resolved by user"
	}

	if err := h.manager.ResolveIncident(id, req.Resolution); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	h.writeJSON(w, map[string]string{"status": "resolved"})
}

func (h *APIHandler) handleSuppressIncident(w http.ResponseWriter, r *http.Request, id string) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req SuppressRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		req.Reason = "Suppressed by user"
	}

	if err := h.manager.SuppressIncident(id, req.Reason); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	h.writeJSON(w, map[string]string{"status": "suppressed"})
}

func (h *APIHandler) handleAcknowledgeIncident(w http.ResponseWriter, r *http.Request, id string) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	if err := h.manager.AcknowledgeIncident(id); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	h.writeJSON(w, map[string]string{"status": "acknowledged"})
}

func (h *APIHandler) handleGetRecommendations(w http.ResponseWriter, incidentID string) {
	incident := h.manager.GetIncident(incidentID)
	if incident == nil {
		http.Error(w, "Incident not found", http.StatusNotFound)
		return
	}

	h.writeJSON(w, incident.Recommendations)
}

func (h *APIHandler) handleRecommendationAction(w http.ResponseWriter, r *http.Request, incidentID, recID, action string) {
	if r.Method != http.MethodPost && r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	ctx := r.Context()

	switch action {
	case "preview":
		preview, err := h.manager.PreviewFix(ctx, incidentID, recID)
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		h.writeJSON(w, preview)

	case "dry-run":
		result, err := h.manager.DryRunFix(ctx, incidentID, recID)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		h.writeJSON(w, result)

	case "apply":
		result, err := h.manager.ApplyFix(ctx, incidentID, recID)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		h.writeJSON(w, result)

	default:
		http.Error(w, "Unknown action", http.StatusNotFound)
	}
}

func (h *APIHandler) handleGetTimeline(w http.ResponseWriter, incidentID string) {
	incident := h.manager.GetIncident(incidentID)
	if incident == nil {
		http.Error(w, "Incident not found", http.StatusNotFound)
		return
	}

	h.writeJSON(w, incident.Timeline)
}

func (h *APIHandler) handleGetSignals(w http.ResponseWriter, incidentID string) {
	incident := h.manager.GetIncident(incidentID)
	if incident == nil {
		http.Error(w, "Incident not found", http.StatusNotFound)
		return
	}

	h.writeJSON(w, incident.Signals)
}

// HandleSummary handles GET /api/v1/incidents/summary
func (h *APIHandler) HandleSummary(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	summary := h.manager.GetSummary()
	patternStats := h.manager.GetPatternStats()

	response := SummaryResponse{
		Summary:      summary,
		PatternStats: patternStats,
	}

	h.writeJSON(w, response)
}

// HandlePatterns handles GET /api/v1/incidents/patterns
func (h *APIHandler) HandlePatterns(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	h.writeJSON(w, AllPatterns())
}

// Helper methods

func (h *APIHandler) writeJSON(w http.ResponseWriter, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(data); err != nil {
		http.Error(w, "Failed to encode response", http.StatusInternalServerError)
	}
}

func splitPath(path string) []string {
	var parts []string
	current := ""
	for _, c := range path {
		if c == '/' {
			if current != "" {
				parts = append(parts, current)
				current = ""
			}
		} else {
			current += string(c)
		}
	}
	if current != "" {
		parts = append(parts, current)
	}
	return parts
}

// Request/Response types

// IncidentsResponse is the response for listing incidents.
type IncidentsResponse struct {
	Incidents []*Incident    `json:"incidents"`
	Total     int            `json:"total"`
	Summary   IncidentSummary `json:"summary"`
}

// SummaryResponse is the response for incident summary.
type SummaryResponse struct {
	Summary      IncidentSummary             `json:"summary"`
	PatternStats map[FailurePattern]PatternStats `json:"patternStats"`
}

// IncidentUpdateRequest is the request for updating an incident.
type IncidentUpdateRequest struct {
	Status IncidentStatus `json:"status,omitempty"`
	Reason string         `json:"reason,omitempty"`
}

// ResolveRequest is the request for resolving an incident.
type ResolveRequest struct {
	Resolution string `json:"resolution"`
}

// SuppressRequest is the request for suppressing an incident.
type SuppressRequest struct {
	Reason   string        `json:"reason"`
	Duration time.Duration `json:"duration,omitempty"`
}

