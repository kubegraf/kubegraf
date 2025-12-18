// Copyright 2025 KubeGraf Contributors
// SPDX-License-Identifier: Apache-2.0

package api

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/kubegraf/kubegraf/internal/changes"
	"github.com/kubegraf/kubegraf/internal/clusters"
	"github.com/kubegraf/kubegraf/internal/explain"
	"github.com/kubegraf/kubegraf/internal/knowledge"
)

// Phase1Handlers provides HTTP handlers for Phase 1 features.
type Phase1Handlers struct {
	correlator         *changes.IncidentChangeCorrelator
	podExplainer       *explain.PodExplainer
	clusterAggregator  *clusters.ClusterSummaryAggregator
	knowledgeExporter  *knowledge.KnowledgeExporter
	knowledgeImporter  *knowledge.KnowledgeImporter
	getIncidentFunc    func(id string) (IncidentData, bool)
	getAllKnowledge    func() []knowledge.KnowledgeEntry
}

// IncidentData is the minimal incident data needed for correlation.
type IncidentData struct {
	ID        string
	Namespace string
	Resource  string
	FirstSeen time.Time
}

// NewPhase1Handlers creates new Phase 1 handlers.
func NewPhase1Handlers(
	correlator *changes.IncidentChangeCorrelator,
	podExplainer *explain.PodExplainer,
	clusterAggregator *clusters.ClusterSummaryAggregator,
	knowledgeExporter *knowledge.KnowledgeExporter,
	knowledgeImporter *knowledge.KnowledgeImporter,
	getIncidentFunc func(id string) (IncidentData, bool),
	getAllKnowledge func() []knowledge.KnowledgeEntry,
) *Phase1Handlers {
	return &Phase1Handlers{
		correlator:         correlator,
		podExplainer:       podExplainer,
		clusterAggregator:  clusterAggregator,
		knowledgeExporter:  knowledgeExporter,
		knowledgeImporter:  knowledgeImporter,
		getIncidentFunc:    getIncidentFunc,
		getAllKnowledge:    getAllKnowledge,
	}
}

// RegisterRoutes registers all Phase 1 API routes.
func (h *Phase1Handlers) RegisterRoutes(mux *http.ServeMux) {
	// Change Intelligence
	mux.HandleFunc("/api/incidents/", h.handleIncidentChanges)

	// Developer Mode - Explain Pod
	mux.HandleFunc("/api/explain/pod", h.handleExplainPod)

	// Multi-Cluster Summaries
	mux.HandleFunc("/api/clusters/summary", h.handleClustersSummary)

	// Knowledge Bank Sharing
	mux.HandleFunc("/api/knowledge/export", h.handleKnowledgeExport)
	mux.HandleFunc("/api/knowledge/import", h.handleKnowledgeImport)
}

// handleIncidentChanges handles GET /api/incidents/{id}/changes
func (h *Phase1Handlers) handleIncidentChanges(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Parse incident ID from path: /api/incidents/{id}/changes
	path := strings.TrimPrefix(r.URL.Path, "/api/incidents/")
	parts := strings.Split(path, "/")
	if len(parts) < 2 || parts[1] != "changes" {
		http.Error(w, "Invalid path. Use /api/incidents/{id}/changes", http.StatusBadRequest)
		return
	}
	incidentID := parts[0]

	// Get incident data
	incident, found := h.getIncidentFunc(incidentID)
	if !found {
		http.Error(w, "Incident not found", http.StatusNotFound)
		return
	}

	// Parse lookback parameter
	lookbackMinutes := 30
	if lb := r.URL.Query().Get("lookback"); lb != "" {
		if val, err := strconv.Atoi(lb); err == nil && val > 0 {
			lookbackMinutes = val
		}
	}

	// Correlate changes
	result, err := h.correlator.CorrelateIncidentChanges(
		r.Context(),
		incidentID,
		incident.FirstSeen,
		incident.Namespace,
		incident.Resource,
		lookbackMinutes,
	)
	if err != nil {
		http.Error(w, "Failed to correlate changes: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}

// handleExplainPod handles GET /api/explain/pod?namespace=&pod=
func (h *Phase1Handlers) handleExplainPod(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	namespace := r.URL.Query().Get("namespace")
	podName := r.URL.Query().Get("pod")

	if namespace == "" || podName == "" {
		http.Error(w, "Missing required parameters: namespace and pod", http.StatusBadRequest)
		return
	}

	explanation, err := h.podExplainer.ExplainPod(r.Context(), namespace, podName)
	if err != nil {
		http.Error(w, "Failed to explain pod: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(explanation)
}

// handleClustersSummary handles GET /api/clusters/summary
func (h *Phase1Handlers) handleClustersSummary(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	clusterID := r.URL.Query().Get("cluster")

	if clusterID != "" && clusterID != "all" {
		// Return single cluster summary
		summary := h.clusterAggregator.GetClusterSummary(clusterID)
		if summary == nil {
			http.Error(w, "Cluster not found", http.StatusNotFound)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(summary)
		return
	}

	// Return multi-cluster summary
	summary := h.clusterAggregator.GetMultiClusterSummary()
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(summary)
}

// handleKnowledgeExport handles POST /api/knowledge/export
func (h *Phase1Handlers) handleKnowledgeExport(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost && r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Get all knowledge entries
	entries := h.getAllKnowledge()

	description := r.URL.Query().Get("description")
	if description == "" {
		description = "KubeGraf knowledge export"
	}

	// Create export
	export := h.knowledgeExporter.Export(entries, description)

	// Return as JSON for download
	data, err := h.knowledgeExporter.ExportToBytes(export)
	if err != nil {
		http.Error(w, "Failed to export: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Content-Disposition", "attachment; filename=kubegraf-knowledge.json")
	w.Write(data)
}

// handleKnowledgeImport handles POST /api/knowledge/import
func (h *Phase1Handlers) handleKnowledgeImport(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Parse multipart form
	err := r.ParseMultipartForm(10 << 20) // 10MB max
	if err != nil {
		http.Error(w, "Failed to parse form: "+err.Error(), http.StatusBadRequest)
		return
	}

	file, _, err := r.FormFile("file")
	if err != nil {
		http.Error(w, "Failed to get file: "+err.Error(), http.StatusBadRequest)
		return
	}
	defer file.Close()

	// Read file content
	data := make([]byte, r.ContentLength)
	_, err = file.Read(data)
	if err != nil {
		http.Error(w, "Failed to read file: "+err.Error(), http.StatusBadRequest)
		return
	}

	// Parse options from form
	options := knowledge.ImportOptions{
		OverwriteExisting: r.FormValue("overwrite") == "true",
		SkipValidation:    r.FormValue("skipValidation") == "true",
		FilterPattern:     r.FormValue("filterPattern"),
		FilterOutcome:     r.FormValue("filterOutcome"),
	}

	// Import
	result, err := h.knowledgeImporter.ImportFromBytes(data, options)
	if err != nil {
		http.Error(w, "Failed to import: "+err.Error(), http.StatusBadRequest)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}

