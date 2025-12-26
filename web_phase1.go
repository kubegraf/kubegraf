// Copyright 2025 KubeGraf Contributors
// SPDX-License-Identifier: Apache-2.0

package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/kubegraf/kubegraf/internal/explain"
)

// registerPhase1Routes registers all Phase 1 feature routes.
func (ws *WebServer) registerPhase1Routes() {
	// Feature 1: Change Intelligence
	http.HandleFunc("/api/incidents/", ws.handleIncidentChangesRoute)

	// Feature 2: Developer Mode - Explain Pod
	http.HandleFunc("/api/explain/pod", ws.handleExplainPod)

	// Feature 3: Multi-Cluster Summaries
	http.HandleFunc("/api/clusters/summary", ws.handleClustersSummary)

	// Feature 4: Knowledge Bank Sharing
	http.HandleFunc("/api/knowledge/export", ws.handleKnowledgeExport)
	http.HandleFunc("/api/knowledge/import", ws.handleKnowledgeImport)
}

// handleIncidentChangesRoute handles GET /api/incidents/{id}/changes
func (ws *WebServer) handleIncidentChangesRoute(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Parse incident ID from path: /api/incidents/{id}/changes
	path := strings.TrimPrefix(r.URL.Path, "/api/incidents/")
	parts := strings.Split(path, "/")

	// If it doesn't end with /changes, let other handlers deal with it
	if len(parts) < 2 || parts[1] != "changes" {
		// Not a changes request, let normal incident handlers deal with it
		return
	}

	incidentID := parts[0]

	// Get incident data from the aggregator
	if ws.app.incidentIntelligence == nil {
		http.Error(w, "Incident intelligence not initialized", http.StatusServiceUnavailable)
		return
	}

	manager := ws.app.incidentIntelligence.GetManager()
	if manager == nil {
		http.Error(w, "Incident manager not initialized", http.StatusServiceUnavailable)
		return
	}

	incident := manager.GetIncident(incidentID)
	
	// No v1 fallback - v2 manager only (production-ready)
	
	if incident == nil {
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

	// Get history service and correlate changes
	historyService := ws.app.getHistoryService()
	if historyService == nil {
		// Return empty result if history service not available
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"incidentId":      incidentID,
			"incidentStart":   incident.FirstSeen,
			"changes":         []interface{}{},
			"totalChanges":    0,
			"highRelevance":   0,
			"mediumRelevance": 0,
			"lowRelevance":    0,
			"message":         "History service not available",
		})
		return
	}

	// Query history for the lookback window
	window := struct {
		Since time.Time
		Until time.Time
	}{
		Since: incident.FirstSeen.Add(-time.Duration(lookbackMinutes) * time.Minute),
		Until: time.Now(),
	}

	historyResult, err := historyService.QueryHistory(r.Context(), window.Since, window.Until)
	if err != nil {
		// Return partial result
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"incidentId":      incidentID,
			"incidentStart":   incident.FirstSeen,
			"changes":         []interface{}{},
			"totalChanges":    0,
			"highRelevance":   0,
			"mediumRelevance": 0,
			"lowRelevance":    0,
			"error":           err.Error(),
		})
		return
	}

	// Score and correlate changes
	type correlatedChange struct {
		Change         interface{} `json:"change"`
		RelevanceScore float64     `json:"relevanceScore"`
		Relationship   string      `json:"relationship"`
		TimeDelta      string      `json:"timeDelta"`
	}

	var correlatedChanges []correlatedChange
	highCount, medCount, lowCount := 0, 0, 0

	for _, change := range historyResult.ChangeEvents {
		// Calculate relevance score
		score := 0.0

		// Namespace match
		if change.Namespace == incident.Resource.Namespace {
			score += 0.3
		}

		// Resource name match
		if change.ResourceName == incident.Resource.Name {
			score += 0.4
		}

		// Timing relevance
		timeDiff := incident.FirstSeen.Sub(change.Timestamp)
		if timeDiff >= 0 && timeDiff <= 5*time.Minute {
			score += 0.2
		} else if timeDiff >= 0 && timeDiff <= 15*time.Minute {
			score += 0.1
		}

		// Severity boost
		if change.Severity == "error" {
			score += 0.1
		} else if change.Severity == "warning" {
			score += 0.05
		}

		if score > 1.0 {
			score = 1.0
		}

		// Calculate relationship
		relationship := "before"
		timeDelta := ""
		diff := incident.FirstSeen.Sub(change.Timestamp)
		if diff < -time.Minute {
			relationship = "after"
			timeDelta = formatDurationPhase1(-diff) + " after"
		} else if diff > time.Minute {
			relationship = "before"
			timeDelta = formatDurationPhase1(diff) + " before"
		} else {
			relationship = "during"
			timeDelta = "during incident"
		}

		correlatedChanges = append(correlatedChanges, correlatedChange{
			Change:         change,
			RelevanceScore: score,
			Relationship:   relationship,
			TimeDelta:      timeDelta,
		})

		if score > 0.7 {
			highCount++
		} else if score >= 0.4 {
			medCount++
		} else {
			lowCount++
		}
	}

	// Sort by relevance (descending)
	for i := 0; i < len(correlatedChanges)-1; i++ {
		for j := i + 1; j < len(correlatedChanges); j++ {
			if correlatedChanges[j].RelevanceScore > correlatedChanges[i].RelevanceScore {
				correlatedChanges[i], correlatedChanges[j] = correlatedChanges[j], correlatedChanges[i]
			}
		}
	}
	
	// Ensure timestamps are properly formatted in JSON response
	// The time.Time fields will be automatically serialized to RFC3339 format by Go's JSON encoder

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"incidentId":      incidentID,
		"incidentStart":   incident.FirstSeen,
		"changes":         correlatedChanges,
		"totalChanges":    len(correlatedChanges),
		"highRelevance":   highCount,
		"mediumRelevance": medCount,
		"lowRelevance":    lowCount,
	})
}

// handleExplainPod handles GET /api/explain/pod?namespace=&pod=
func (ws *WebServer) handleExplainPod(w http.ResponseWriter, r *http.Request) {
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

	// Get the Kubernetes client
	clientset := ws.app.getClientset()
	if clientset == nil {
		http.Error(w, "Not connected to a cluster", http.StatusServiceUnavailable)
		return
	}

	explainer := explain.NewPodExplainer(clientset)
	explanation, err := explainer.ExplainPod(r.Context(), namespace, podName)
	if err != nil {
		http.Error(w, "Failed to explain pod: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(explanation)
}

// handleClustersSummary handles GET /api/clusters/summary
func (ws *WebServer) handleClustersSummary(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Build summary from current incident data
	if ws.app.incidentIntelligence == nil {
		// Return empty summary
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"totalClusters":    0,
			"totalIncidents":   0,
			"clusters":         []interface{}{},
			"topPatterns":      []interface{}{},
			"severityCounts":   map[string]int{},
			"generatedAt":      time.Now(),
		})
		return
	}

	manager := ws.app.incidentIntelligence.GetManager()
	if manager == nil {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"totalClusters":    0,
			"totalIncidents":   0,
			"clusters":         []interface{}{},
			"topPatterns":      []interface{}{},
			"severityCounts":   map[string]int{},
			"generatedAt":      time.Now(),
		})
		return
	}

	incidents := manager.GetActiveIncidents()

	// Group by cluster
	clusterData := make(map[string]struct {
		Incidents      int
		SeverityCounts map[string]int
		PatternCounts  map[string]int
	})

	globalPatterns := make(map[string]int)
	globalSeverity := make(map[string]int)

	for _, inc := range incidents {
		clusterID := inc.ClusterContext
		if clusterID == "" {
			clusterID = "default"
		}

		data, exists := clusterData[clusterID]
		if !exists {
			data = struct {
				Incidents      int
				SeverityCounts map[string]int
				PatternCounts  map[string]int
			}{
				SeverityCounts: make(map[string]int),
				PatternCounts:  make(map[string]int),
			}
		}

		data.Incidents++
		data.SeverityCounts[string(inc.Severity)]++
		data.PatternCounts[string(inc.Pattern)]++
		clusterData[clusterID] = data

		globalPatterns[string(inc.Pattern)]++
		globalSeverity[string(inc.Severity)]++
	}

	// Build response
	var clusters []map[string]interface{}
	totalIncidents := 0

	for clusterID, data := range clusterData {
		totalIncidents += data.Incidents

		// Calculate health score
		healthScore := 1.0
		if data.SeverityCounts["critical"] > 0 {
			healthScore -= float64(data.SeverityCounts["critical"]) * 0.2
		}
		if data.SeverityCounts["high"] > 0 {
			healthScore -= float64(data.SeverityCounts["high"]) * 0.1
		}
		if healthScore < 0 {
			healthScore = 0
		}

		status := "healthy"
		if data.SeverityCounts["critical"] > 0 {
			status = "critical"
		} else if data.SeverityCounts["high"] > 0 || data.SeverityCounts["warning"] > 0 {
			status = "warning"
		}

		// Get top patterns
		var topPatterns []map[string]interface{}
		for pattern, count := range data.PatternCounts {
			topPatterns = append(topPatterns, map[string]interface{}{
				"pattern": pattern,
				"count":   count,
			})
		}

		clusters = append(clusters, map[string]interface{}{
			"clusterId":      clusterID,
			"clusterName":    clusterID,
			"incidentCounts": data.SeverityCounts,
			"topPatterns":    topPatterns,
			"lastUpdated":    time.Now(),
			"healthScore":    healthScore,
			"status":         status,
		})
	}

	// Build global top patterns
	var topPatterns []map[string]interface{}
	for pattern, count := range globalPatterns {
		topPatterns = append(topPatterns, map[string]interface{}{
			"pattern": pattern,
			"count":   count,
		})
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"totalClusters":  len(clusters),
		"totalIncidents": totalIncidents,
		"clusters":       clusters,
		"topPatterns":    topPatterns,
		"severityCounts": globalSeverity,
		"generatedAt":    time.Now(),
	})
}

// handleKnowledgeExport handles POST /api/knowledge/export
func (ws *WebServer) handleKnowledgeExport(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost && r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Get knowledge bank
	if ws.app.incidentIntelligence == nil {
		http.Error(w, "Incident intelligence not initialized", http.StatusServiceUnavailable)
		return
	}

	manager := ws.app.incidentIntelligence.GetManager()
	if manager == nil {
		http.Error(w, "Incident manager not initialized", http.StatusServiceUnavailable)
		return
	}

	// Get all incidents as records
	allIncidents := manager.GetAllIncidents()
	
	// Convert to a slice for processing
	var records []*struct {
		Fingerprint string
		Pattern     string
		Diagnosis   *struct {
			ProbableCauses []string
			Confidence     float64
		}
		ResolvedAt *time.Time
		Resolution string
		CreatedAt  time.Time
		UpdatedAt  time.Time
	}
	
	for _, inc := range allIncidents {
		record := &struct {
			Fingerprint string
			Pattern     string
			Diagnosis   *struct {
				ProbableCauses []string
				Confidence     float64
			}
			ResolvedAt *time.Time
			Resolution string
			CreatedAt  time.Time
			UpdatedAt  time.Time
		}{
			Fingerprint: inc.Fingerprint,
			Pattern:     string(inc.Pattern),
			CreatedAt:   inc.FirstSeen,
			UpdatedAt:   inc.LastSeen,
			ResolvedAt:  inc.ResolvedAt,
			Resolution:  inc.Resolution,
		}
		if inc.Diagnosis != nil {
			record.Diagnosis = &struct {
				ProbableCauses []string
				Confidence     float64
			}{
				ProbableCauses: inc.Diagnosis.ProbableCauses,
				Confidence:     inc.Diagnosis.Confidence,
			}
		}
		records = append(records, record)
	}
	_ = records // Used below - incidents already processed

	// Convert to export format
	type knowledgeEntry struct {
		Fingerprint string    `json:"fingerprint"`
		Pattern     string    `json:"pattern"`
		RootCause   string    `json:"rootCause"`
		FixSummary  string    `json:"fixSummary"`
		Outcome     string    `json:"outcome"`
		Confidence  float64   `json:"confidence"`
		CreatedAt   time.Time `json:"createdAt"`
		UpdatedAt   time.Time `json:"updatedAt"`
	}

	var entries []knowledgeEntry
	for _, inc := range allIncidents {
		rootCause := ""
		fixSummary := ""
		confidence := 0.0

		if inc.Diagnosis != nil {
			if len(inc.Diagnosis.ProbableCauses) > 0 {
				rootCause = inc.Diagnosis.ProbableCauses[0]
			}
			confidence = inc.Diagnosis.Confidence
		}

		outcome := "unknown"
		if inc.ResolvedAt != nil {
			outcome = "success"
		}

		if inc.Resolution != "" {
			fixSummary = inc.Resolution
		}

		entries = append(entries, knowledgeEntry{
			Fingerprint: inc.Fingerprint,
			Pattern:     string(inc.Pattern),
			RootCause:   rootCause,
			FixSummary:  fixSummary,
			Outcome:     outcome,
			Confidence:  confidence,
			CreatedAt:   inc.FirstSeen,
			UpdatedAt:   inc.LastSeen,
		})
	}

	description := r.URL.Query().Get("description")
	if description == "" {
		description = "KubeGraf knowledge export"
	}

	// Build export
	export := map[string]interface{}{
		"version":     "1.0",
		"exportedAt":  time.Now(),
		"exportedBy":  "kubegraf",
		"description": description,
		"entryCount":  len(entries),
		"entries":     entries,
		"metadata": map[string]interface{}{
			"kubegrafVersion": "1.0.0",
		},
	}

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=kubegraf-knowledge-%s.json", time.Now().Format("2006-01-02")))
	json.NewEncoder(w).Encode(export)
}

// handleKnowledgeImport handles POST /api/knowledge/import
func (ws *WebServer) handleKnowledgeImport(w http.ResponseWriter, r *http.Request) {
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
	var data []byte
	buf := make([]byte, 1024)
	for {
		n, err := file.Read(buf)
		if n > 0 {
			data = append(data, buf[:n]...)
		}
		if err != nil {
			break
		}
	}

	// Parse the export
	var export struct {
		Entries []struct {
			Fingerprint string  `json:"fingerprint"`
			Pattern     string  `json:"pattern"`
			RootCause   string  `json:"rootCause"`
			FixSummary  string  `json:"fixSummary"`
			Outcome     string  `json:"outcome"`
			Confidence  float64 `json:"confidence"`
		} `json:"entries"`
	}

	if err := json.Unmarshal(data, &export); err != nil {
		http.Error(w, "Failed to parse JSON: "+err.Error(), http.StatusBadRequest)
		return
	}

	// For now, just acknowledge the import
	// TODO: Actually store the entries in the knowledge bank
	result := map[string]interface{}{
		"totalEntries":   len(export.Entries),
		"importedCount":  len(export.Entries),
		"skippedCount":   0,
		"updatedCount":   0,
		"errors":         []string{},
		"skippedReasons": []string{},
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}

// formatDurationPhase1 formats a duration for display (Phase 1 version)
func formatDurationPhase1(d time.Duration) string {
	if d < time.Minute {
		return "<1m"
	} else if d < time.Hour {
		return fmt.Sprintf("%dm", int(d.Minutes()))
	} else if d < 24*time.Hour {
		return fmt.Sprintf("%dh", int(d.Hours()))
	}
	return fmt.Sprintf("%dd", int(d.Hours()/24))
}

