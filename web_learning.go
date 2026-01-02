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

	"github.com/kubegraf/kubegraf/pkg/incidents"
)

// handleIncidentFeedbackLearning handles POST /api/v2/incidents/{id}/feedback for learning
func (ws *WebServer) handleIncidentFeedbackLearning(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Extract incident ID from path: /api/v2/incidents/{id}/feedback
	path := r.URL.Path
	if !strings.HasPrefix(path, "/api/v2/incidents/") {
		http.Error(w, "Invalid path", http.StatusBadRequest)
		return
	}
	incidentID := strings.TrimPrefix(path, "/api/v2/incidents/")
	incidentID = strings.TrimSuffix(incidentID, "/feedback")
	incidentID = strings.Trim(incidentID, "/")

	if incidentID == "" {
		http.Error(w, "Incident ID required", http.StatusBadRequest)
		return
	}

	// Parse request body
	var req struct {
		Outcome        string `json:"outcome"` // "worked", "not_worked", "unknown"
		AppliedFixID   string `json:"appliedFixId,omitempty"`
		AppliedFixType string `json:"appliedFixType,omitempty"`
		Notes          string `json:"notes,omitempty"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, fmt.Sprintf("Invalid request body: %v", err), http.StatusBadRequest)
		return
	}

	// Validate outcome
	if req.Outcome != "worked" && req.Outcome != "not_worked" && req.Outcome != "unknown" {
		http.Error(w, "Invalid outcome: must be 'worked', 'not_worked', or 'unknown'", http.StatusBadRequest)
		return
	}

	// Get incident intelligence system
	if ws.app.incidentIntelligence == nil {
		http.Error(w, "Incident intelligence not initialized", http.StatusServiceUnavailable)
		return
	}

	// Get incident from v2 manager only (production-ready, no fallbacks)
	incident := ws.getIncidentByID(incidentID)
	if incident == nil {
		http.Error(w, "Incident not found", http.StatusNotFound)
		return
	}

	// Get snapshot to extract proposed primary cause and confidence
	// Try to get from cache first (using fingerprint as key)
	fingerprint := incident.Fingerprint
	if fingerprint == "" {
		// Compute fingerprint if not set
		containerName := ""
		if incident.Resource.Kind == "Pod" {
			if len(incident.Signals.Status) > 0 {
				if container, ok := incident.Signals.Status[0].Attributes["container"]; ok {
					containerName = container
				}
			}
		}
		fingerprint = incidents.ComputeIncidentFingerprint(incident, containerName)
	}

	snapshot, cached := ws.snapshotCache.Get(fingerprint)
	if !cached {
		// Snapshot not cached - will extract from incident directly
		snapshot = nil
	}

	// Get confidence learner (create if needed)
	learner := ws.getConfidenceLearner()
	if learner == nil {
		http.Error(w, "Confidence learner not initialized", http.StatusServiceUnavailable)
		return
	}

	// Extract proposed primary cause and confidence from snapshot or incident
	proposedPrimaryCause := ""
	proposedConfidence := 0.5
	if snapshot != nil && len(snapshot.RootCauses) > 0 {
		proposedPrimaryCause = snapshot.RootCauses[0].Cause
		proposedConfidence = snapshot.Confidence
	} else if incident.Diagnosis != nil && len(incident.Diagnosis.ProbableCauses) > 0 {
		proposedPrimaryCause = incident.Diagnosis.ProbableCauses[0]
		proposedConfidence = incident.Diagnosis.Confidence
	}

	// Build evidence pack from incident signals for feature extraction
	evidencePack := &incidents.EvidencePack{
		Logs:          []incidents.EvidenceItem{},
		Events:        []incidents.EvidenceItem{},
		MetricsFacts:  []incidents.EvidenceItem{},
		ChangeHistory: []incidents.EvidenceItem{},
	}
	// Convert log signals to evidence items
	for _, signal := range incident.Signals.Logs {
		evidencePack.Logs = append(evidencePack.Logs, incidents.EvidenceItem{
			ID:        signal.ID,
			Source:    incidents.EvidenceSourceLog,
			Type:      string(signal.Source),
			Timestamp: signal.Timestamp,
			Content:   signal.Message,
		})
	}
	// Convert event signals to evidence items
	for _, signal := range incident.Signals.Events {
		evidencePack.Events = append(evidencePack.Events, incidents.EvidenceItem{
			ID:        signal.ID,
			Source:    incidents.EvidenceSourceEvent,
			Type:      string(signal.Source),
			Timestamp: signal.Timestamp,
			Content:   signal.Message,
		})
	}
	// Convert metrics signals to evidence items
	for _, signal := range incident.Signals.Metrics {
		evidencePack.MetricsFacts = append(evidencePack.MetricsFacts, incidents.EvidenceItem{
			ID:        signal.ID,
			Source:    incidents.EvidenceSourceMetric,
			Type:      string(signal.Source),
			Timestamp: signal.Timestamp,
			Content:   signal.Message,
		})
	}

	// Create outcome record
	outcome := &incidents.IncidentOutcome{
		Fingerprint:          incident.Fingerprint,
		IncidentID:           incidentID,
		Timestamp:            time.Now(),
		ProposedPrimaryCause: proposedPrimaryCause,
		ProposedConfidence:   proposedConfidence,
		AppliedFixID:         req.AppliedFixID,
		AppliedFixType:       req.AppliedFixType,
		Outcome:              req.Outcome,
		Notes:                req.Notes,
	}

	// Record outcome and update learning (with feature tracking)
	explanation, err := learner.RecordOutcome(outcome, incident, snapshot, evidencePack)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to record outcome: %v", err), http.StatusInternalServerError)
		return
	}

	// Get updated learning status
	status, err := learner.GetLearningStatus()
	if err != nil {
		// Still return success even if status fetch fails
		log.Printf("[Learning] Failed to get learning status: %v", err)
	}

	// Return response with explanation
	response := map[string]interface{}{
		"status":      "success",
		"message":     "Learning updated locally",
		"outcomeId":   outcome.ID,
		"explanation": explanation,
	}

	if status != nil {
		response["learningStatus"] = status
		response["summary"] = explanation
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// handleLearningStatus handles GET /api/v2/learning/status
func (ws *WebServer) handleLearningStatus(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	learner := ws.getConfidenceLearner()
	if learner == nil {
		http.Error(w, "Confidence learner not initialized", http.StatusServiceUnavailable)
		return
	}

	status, err := learner.GetLearningStatus()
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to get learning status: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(status)
}

// handleLearningReset handles POST /api/v2/learning/reset
func (ws *WebServer) handleLearningReset(w http.ResponseWriter, r *http.Request) {
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

	learner := ws.getConfidenceLearner()
	if learner == nil {
		http.Error(w, "Confidence learner not initialized", http.StatusServiceUnavailable)
		return
	}

	if err := learner.ResetLearning(); err != nil {
		http.Error(w, fmt.Sprintf("Failed to reset learning: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"status":  "success",
		"message": "Learning weights and priors reset to defaults",
	})
}

// getConfidenceLearner gets or creates the confidence learner
// Uses the shared KnowledgeBank from IntelligenceSystem to ensure outcomes are stored in the same database
func (ws *WebServer) getConfidenceLearner() *incidents.ConfidenceLearner {
	if ws.app.incidentIntelligence == nil {
		return nil
	}

	// Get the shared KnowledgeBank from IntelligenceSystem
	// This ensures we use the same database instance that stores incidents
	intelSys := ws.app.incidentIntelligence.GetIntelligenceSystem()
	if intelSys == nil {
		return nil
	}

	kb := intelSys.GetKnowledgeBank()
	if kb == nil {
		log.Printf("[Learning] Knowledge bank not available in IntelligenceSystem")
		return nil
	}

	// Check if learner already exists in WebServer
	// If it exists but uses a different KB, recreate it
	if ws.confidenceLearner == nil {
		ws.confidenceLearner = incidents.NewConfidenceLearner(kb)
		log.Printf("[Learning] Confidence learner initialized with shared KnowledgeBank")
	}

	return ws.confidenceLearner
}
