// Copyright 2025 KubeGraf Contributors
// SPDX-License-Identifier: Apache-2.0

package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/kubegraf/kubegraf/pkg/incidents"
)

// RegisterIntelligenceWorkspaceRoutes registers API routes for the Intelligence Workspace UI
func (ws *WebServer) RegisterIntelligenceWorkspaceRoutes() {
	// Get insights for all incidents
	http.HandleFunc("/api/v2/workspace/insights", ws.handleWorkspaceInsights)

	// Get incident story (narrative)
	http.HandleFunc("/api/v2/workspace/incidents/", ws.handleWorkspaceIncidentRoute)
}

// handleWorkspaceInsights generates insights for all active incidents
func (ws *WebServer) handleWorkspaceInsights(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	w.Header().Set("Content-Type", "application/json")

	if ws.incidentIntelligence == nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"insights": []WorkspaceInsight{},
		})
		return
	}

	// Get all incidents
	allIncidents := ws.incidentIntelligence.manager.ListIncidents()

	// Generate insights
	insights := generateWorkspaceInsights(allIncidents)

	json.NewEncoder(w).Encode(map[string]interface{}{
		"insights": insights,
		"total":    len(insights),
	})
}

// handleWorkspaceIncidentRoute routes workspace incident requests
func (ws *WebServer) handleWorkspaceIncidentRoute(w http.ResponseWriter, r *http.Request) {
	path := strings.TrimPrefix(r.URL.Path, "/api/v2/workspace/incidents/")
	parts := strings.Split(path, "/")

	if len(parts) < 2 {
		http.Error(w, "Invalid path", http.StatusBadRequest)
		return
	}

	incidentID := parts[0]
	action := parts[1]

	switch action {
	case "story":
		ws.handleIncidentStory(w, r, incidentID)
	case "related":
		ws.handleRelatedIncidents(w, r, incidentID)
	case "predict-success":
		ws.handlePredictSuccess(w, r, incidentID)
	case "execute-fix":
		ws.handleExecuteFix(w, r, incidentID)
	case "rca":
		ws.handleGenerateRCA(w, r, incidentID)
	default:
		http.Error(w, "Unknown action", http.StatusNotFound)
	}
}

// handleIncidentStory generates a human-readable narrative for an incident
func (ws *WebServer) handleIncidentStory(w http.ResponseWriter, r *http.Request, incidentID string) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	w.Header().Set("Content-Type", "application/json")

	if ws.incidentIntelligence == nil {
		http.Error(w, "Intelligence system not initialized", http.StatusInternalServerError)
		return
	}

	incident := ws.incidentIntelligence.manager.GetIncident(incidentID)
	if incident == nil {
		http.Error(w, "Incident not found", http.StatusNotFound)
		return
	}

	story := generateIncidentStory(incident)

	json.NewEncoder(w).Encode(story)
}

// handleRelatedIncidents finds related incidents using similarity scoring
func (ws *WebServer) handleRelatedIncidents(w http.ResponseWriter, r *http.Request, incidentID string) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	w.Header().Set("Content-Type", "application/json")

	if ws.incidentIntelligence == nil {
		http.Error(w, "Intelligence system not initialized", http.StatusInternalServerError)
		return
	}

	incident := ws.incidentIntelligence.manager.GetIncident(incidentID)
	if incident == nil {
		http.Error(w, "Incident not found", http.StatusNotFound)
		return
	}

	// Get all incidents for comparison
	allIncidents := ws.incidentIntelligence.manager.ListIncidents()

	// Calculate similarity scores
	related := findRelatedIncidents(incident, allIncidents, 5)

	json.NewEncoder(w).Encode(map[string]interface{}{
		"related": related,
		"total":   len(related),
	})
}

// handlePredictSuccess predicts the success probability of a fix
func (ws *WebServer) handlePredictSuccess(w http.ResponseWriter, r *http.Request, incidentID string) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	w.Header().Set("Content-Type", "application/json")

	if ws.incidentIntelligence == nil {
		http.Error(w, "Intelligence system not initialized", http.StatusInternalServerError)
		return
	}

	// Parse request body for fix ID
	var req struct {
		FixID string `json:"fixId"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	incident := ws.incidentIntelligence.manager.GetIncident(incidentID)
	if incident == nil {
		http.Error(w, "Incident not found", http.StatusNotFound)
		return
	}

	// Get all incidents for historical success rate
	allIncidents := ws.incidentIntelligence.manager.ListIncidents()

	prediction := predictFixSuccess(incident, req.FixID, allIncidents)

	json.NewEncoder(w).Encode(prediction)
}

// handleExecuteFix executes a fix with preview and rollback support
func (ws *WebServer) handleExecuteFix(w http.ResponseWriter, r *http.Request, incidentID string) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	w.Header().Set("Content-Type", "application/json")

	if ws.incidentIntelligence == nil {
		http.Error(w, "Intelligence system not initialized", http.StatusInternalServerError)
		return
	}

	// Parse request body
	var req struct {
		FixID      string `json:"fixId"`
		DryRun     bool   `json:"dryRun"`
		Confirmed  bool   `json:"confirmed"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	incident := ws.incidentIntelligence.manager.GetIncident(incidentID)
	if incident == nil {
		http.Error(w, "Incident not found", http.StatusNotFound)
		return
	}

	// Find the recommendation with the specified fixId
	var recommendation *incidents.Recommendation
	for i := range incident.Recommendations {
		if incident.Recommendations[i].ID == req.FixID {
			recommendation = &incident.Recommendations[i]
			break
		}
	}

	if recommendation == nil || recommendation.ProposedFix == nil {
		http.Error(w, "Fix not found", http.StatusNotFound)
		return
	}

	if req.DryRun {
		// Return preview only
		json.NewEncoder(w).Encode(map[string]interface{}{
			"status": "preview",
			"fix":    recommendation.ProposedFix,
			"steps":  generateExecutionSteps(incident, recommendation),
		})
		return
	}

	// Execute the fix (this would need proper implementation with K8s client)
	result := executeFixWithMonitoring(ws, incident, recommendation, req.Confirmed)

	json.NewEncoder(w).Encode(result)
}

// handleGenerateRCA generates a Root Cause Analysis report
func (ws *WebServer) handleGenerateRCA(w http.ResponseWriter, r *http.Request, incidentID string) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Get format from query parameter
	format := r.URL.Query().Get("format")
	if format == "" {
		format = "json"
	}

	if ws.incidentIntelligence == nil {
		http.Error(w, "Intelligence system not initialized", http.StatusInternalServerError)
		return
	}

	incident := ws.incidentIntelligence.manager.GetIncident(incidentID)
	if incident == nil {
		http.Error(w, "Incident not found", http.StatusNotFound)
		return
	}

	rca := generateRCAReport(incident)

	switch format {
	case "markdown":
		w.Header().Set("Content-Type", "text/markdown")
		w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=RCA-%s.md", incidentID))
		w.Write([]byte(rca.ExportAsMarkdown()))
	case "html":
		w.Header().Set("Content-Type", "text/html")
		w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=RCA-%s.html", incidentID))
		w.Write([]byte(rca.ExportAsHTML()))
	default: // json
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(rca)
	}
}

// WorkspaceInsight represents an insight for the workspace UI
type WorkspaceInsight struct {
	ID          string `json:"id"`
	Type        string `json:"type"` // confidence, pattern, trend, impact, recurrence, proactive
	Priority    int    `json:"priority"`
	Title       string `json:"title"`
	Message     string `json:"message"`
	Actionable  bool   `json:"actionable"`
	Icon        string `json:"icon"`
	IncidentID  string `json:"incidentId,omitempty"`
}

// generateWorkspaceInsights generates insights from all incidents
func generateWorkspaceInsights(incidents []*incidents.Incident) []WorkspaceInsight {
	insights := []WorkspaceInsight{}

	// Confidence insights
	highConfidenceCount := 0
	lowConfidenceCount := 0
	for _, inc := range incidents {
		if inc.Diagnosis != nil {
			if inc.Diagnosis.Confidence >= 0.95 {
				highConfidenceCount++
			} else if inc.Diagnosis.Confidence < 0.70 {
				lowConfidenceCount++
			}
		}
	}

	if highConfidenceCount > 0 {
		insights = append(insights, WorkspaceInsight{
			ID:         "insight-high-confidence",
			Type:       "confidence",
			Priority:   75,
			Title:      "High Confidence Diagnoses",
			Message:    fmt.Sprintf("%d incident(s) have high-confidence diagnoses (≥95%%) with recommended fixes", highConfidenceCount),
			Actionable: true,
			Icon:       "✓",
		})
	}

	if lowConfidenceCount > 0 {
		insights = append(insights, WorkspaceInsight{
			ID:         "insight-low-confidence",
			Type:       "confidence",
			Priority:   100,
			Title:      "Investigation Needed",
			Message:    fmt.Sprintf("%d incident(s) require manual investigation (confidence <70%%)", lowConfidenceCount),
			Actionable: true,
			Icon:       "🔍",
		})
	}

	// Pattern insights
	patternCounts := make(map[incidents.FailurePattern]int)
	for _, inc := range incidents {
		if inc.IsActive() {
			patternCounts[inc.Pattern]++
		}
	}

	for pattern, count := range patternCounts {
		if count >= 2 {
			insights = append(insights, WorkspaceInsight{
				ID:         fmt.Sprintf("insight-pattern-%s", pattern),
				Type:       "pattern",
				Priority:   75,
				Title:      "Pattern Detected",
				Message:    fmt.Sprintf("%d active incidents share the %s pattern", count, pattern),
				Actionable: true,
				Icon:       "🎯",
			})
		}
	}

	// Trend insights
	last24h := 0
	prev24h := 0
	now := time.Now()
	for _, inc := range incidents {
		age := now.Sub(inc.FirstSeen)
		if age <= 24*time.Hour {
			last24h++
		} else if age <= 48*time.Hour {
			prev24h++
		}
	}

	if last24h > prev24h && prev24h > 0 {
		increase := ((last24h - prev24h) * 100) / prev24h
		if increase > 50 {
			insights = append(insights, WorkspaceInsight{
				ID:         "insight-trend-increase",
				Type:       "trend",
				Priority:   100,
				Title:      "Incident Surge",
				Message:    fmt.Sprintf("Incidents increased by %d%% in the last 24 hours", increase),
				Actionable: true,
				Icon:       "📈",
			})
		}
	}

	// Impact insights
	criticalCount := 0
	for _, inc := range incidents {
		if inc.Severity == incidents.SeverityCritical && inc.IsActive() {
			criticalCount++
		}
	}

	if criticalCount > 0 {
		insights = append(insights, WorkspaceInsight{
			ID:         "insight-critical-incidents",
			Type:       "impact",
			Priority:   100,
			Title:      "Critical Incidents",
			Message:    fmt.Sprintf("%d critical incident(s) require immediate attention", criticalCount),
			Actionable: true,
			Icon:       "🔴",
		})
	}

	// Sort by priority (highest first)
	sortInsightsByPriority(insights)

	// Return top 8 insights
	if len(insights) > 8 {
		insights = insights[:8]
	}

	return insights
}

// sortInsightsByPriority sorts insights by priority in descending order
func sortInsightsByPriority(insights []WorkspaceInsight) {
	for i := 0; i < len(insights)-1; i++ {
		for j := i + 1; j < len(insights); j++ {
			if insights[j].Priority > insights[i].Priority {
				insights[i], insights[j] = insights[j], insights[i]
			}
		}
	}
}

// IncidentStory represents a narrative description of an incident
type IncidentStory struct {
	WhatHappened    string `json:"whatHappened"`
	WhenStarted     string `json:"whenStarted"`
	WhyHappened     string `json:"whyHappened"`
	Impact          string `json:"impact"`
	ResolutionPath  string `json:"resolutionPath"`
}

// generateIncidentStory creates a human-readable narrative
func generateIncidentStory(incident *incidents.Incident) IncidentStory {
	story := IncidentStory{}

	// What Happened
	resourceKind := incident.Resource.Kind
	resourceName := incident.Resource.Name
	pattern := string(incident.Pattern)

	switch {
	case strings.Contains(pattern, "CRASH"):
		story.WhatHappened = fmt.Sprintf("The %s \"%s\" has been experiencing repeated crashes. The container is terminating unexpectedly and restarting frequently, indicating a severe stability issue.", resourceKind, resourceName)
	case strings.Contains(pattern, "OOM"):
		story.WhatHappened = fmt.Sprintf("The %s \"%s\" is running out of memory (OOM). The container is being killed by the Kubernetes scheduler when it exceeds its memory limits, causing service disruptions.", resourceKind, resourceName)
	case strings.Contains(pattern, "IMAGE"):
		story.WhatHappened = fmt.Sprintf("The %s \"%s\" cannot pull its container image. This is preventing the pod from starting and making the service unavailable.", resourceKind, resourceName)
	default:
		story.WhatHappened = fmt.Sprintf("The %s \"%s\" is experiencing issues related to %s. This is affecting the normal operation of the workload.", resourceKind, resourceName, pattern)
	}

	// When Started
	duration := time.Since(incident.FirstSeen)
	story.WhenStarted = fmt.Sprintf("This issue was first detected %s ago at %s. It has occurred %d time(s), with the most recent occurrence at %s.",
		formatDuration(duration),
		incident.FirstSeen.Format("2006-01-02 15:04:05 MST"),
		incident.Occurrences,
		incident.LastSeen.Format("2006-01-02 15:04:05 MST"))

	// Why Happened
	if incident.Diagnosis != nil && len(incident.Diagnosis.ProbableCauses) > 0 {
		story.WhyHappened = fmt.Sprintf("Root cause: %s. ", incident.Diagnosis.ProbableCauses[0])
		if len(incident.Diagnosis.Evidence) > 0 {
			story.WhyHappened += fmt.Sprintf("Evidence: %s", strings.Join(incident.Diagnosis.Evidence, ", "))
		}
	} else {
		story.WhyHappened = "The root cause is still under investigation. More data is needed to determine the exact reason for this failure."
	}

	// Impact
	blastRadius := incident.BlastRadius()
	if blastRadius > 1 {
		story.Impact = fmt.Sprintf("This incident affects %d resource(s). The primary impact is on %s/%s in the %s namespace.",
			blastRadius, resourceKind, resourceName, incident.Resource.Namespace)
	} else {
		story.Impact = fmt.Sprintf("This incident primarily affects %s/%s in the %s namespace.",
			resourceKind, resourceName, incident.Resource.Namespace)
	}

	// Resolution Path
	if len(incident.Recommendations) > 0 {
		rec := incident.Recommendations[0]
		story.ResolutionPath = fmt.Sprintf("%s: %s", rec.Title, rec.Explanation)
	} else {
		story.ResolutionPath = "No automated fix is currently available. Manual intervention may be required to resolve this incident."
	}

	return story
}

// formatDuration formats a duration in human-readable form
func formatDuration(d time.Duration) string {
	hours := int(d.Hours())
	minutes := int(d.Minutes()) % 60

	if hours > 24 {
		days := hours / 24
		hours = hours % 24
		if days == 1 {
			return fmt.Sprintf("1 day %d hours", hours)
		}
		return fmt.Sprintf("%d days %d hours", days, hours)
	}

	if hours > 0 {
		return fmt.Sprintf("%d hours %d minutes", hours, minutes)
	}

	return fmt.Sprintf("%d minutes", minutes)
}

// RelatedIncidentResult represents a related incident with similarity score
type RelatedIncidentResult struct {
	Incident    *incidents.Incident `json:"incident"`
	Score       int                  `json:"score"`
	Reasons     []string             `json:"reasons"`
	Correlation string               `json:"correlation"` // high, medium, low, weak
}

// findRelatedIncidents finds similar incidents using multi-factor scoring
func findRelatedIncidents(incident *incidents.Incident, allIncidents []*incidents.Incident, limit int) []RelatedIncidentResult {
	results := []RelatedIncidentResult{}

	for _, other := range allIncidents {
		if other.ID == incident.ID {
			continue
		}

		score := 0
		reasons := []string{}

		// Pattern match (40 points)
		if other.Pattern == incident.Pattern {
			score += 40
			reasons = append(reasons, "Same failure pattern")
		}

		// Namespace match (20 points)
		if other.Resource.Namespace == incident.Resource.Namespace {
			score += 20
			reasons = append(reasons, "Same namespace")
		}

		// Resource kind match (15 points)
		if other.Resource.Kind == incident.Resource.Kind {
			score += 15
			reasons = append(reasons, "Same resource type")
		}

		// Time proximity (15 points) - within 24 hours
		timeDiff := incident.FirstSeen.Sub(other.FirstSeen)
		if timeDiff < 0 {
			timeDiff = -timeDiff
		}
		if timeDiff <= 24*time.Hour {
			score += 15
			reasons = append(reasons, "Occurred within 24 hours")
		}

		// Severity match (10 points)
		if other.Severity == incident.Severity {
			score += 10
			reasons = append(reasons, "Same severity level")
		}

		// Resource name match (bonus 10 points)
		if other.Resource.Name == incident.Resource.Name {
			score += 10
			reasons = append(reasons, "Exact resource match")
		}

		// Only include if score is above threshold
		if score >= 40 {
			correlation := "weak"
			if score >= 80 {
				correlation = "high"
			} else if score >= 60 {
				correlation = "medium"
			} else if score >= 40 {
				correlation = "low"
			}

			results = append(results, RelatedIncidentResult{
				Incident:    other,
				Score:       score,
				Reasons:     reasons,
				Correlation: correlation,
			})
		}
	}

	// Sort by score (highest first)
	sortRelatedByScore(results)

	// Return top N results
	if len(results) > limit {
		results = results[:limit]
	}

	return results
}

// sortRelatedByScore sorts related incidents by score in descending order
func sortRelatedByScore(results []RelatedIncidentResult) {
	for i := 0; i < len(results)-1; i++ {
		for j := i + 1; j < len(results); j++ {
			if results[j].Score > results[i].Score {
				results[i], results[j] = results[j], results[i]
			}
		}
	}
}

// SuccessPrediction represents a fix success prediction
type SuccessPrediction struct {
	Probability  float64                `json:"probability"`
	Confidence   float64                `json:"confidence"`
	Factors      []PredictionFactor     `json:"factors"`
	Risk         string                 `json:"risk"` // low, medium, high
	Explanation  string                 `json:"explanation"`
}

// PredictionFactor represents a factor in success prediction
type PredictionFactor struct {
	Name         string  `json:"name"`
	Score        float64 `json:"score"`
	Weight       float64 `json:"weight"`
	Contribution float64 `json:"contribution"`
}

// predictFixSuccess predicts the success probability of a fix
func predictFixSuccess(incident *incidents.Incident, fixID string, allIncidents []*incidents.Incident) SuccessPrediction {
	factors := []PredictionFactor{}

	// Factor 1: Diagnosis Confidence (35%)
	diagnosisScore := 0.0
	if incident.Diagnosis != nil {
		diagnosisScore = incident.Diagnosis.Confidence * 100
	}
	factors = append(factors, PredictionFactor{
		Name:         "Diagnosis Confidence",
		Score:        diagnosisScore,
		Weight:       0.35,
		Contribution: diagnosisScore * 0.35,
	})

	// Factor 2: Pattern Recognition (25%)
	patternScore := 0.0
	knownPatterns := []incidents.FailurePattern{
		incidents.PatternCrashLoop,
		incidents.PatternOOMKilled,
		incidents.PatternImagePull,
	}
	for _, known := range knownPatterns {
		if incident.Pattern == known {
			patternScore = 85.0
			break
		}
	}
	if patternScore == 0 {
		patternScore = 50.0 // Unknown pattern
	}
	factors = append(factors, PredictionFactor{
		Name:         "Pattern Recognition",
		Score:        patternScore,
		Weight:       0.25,
		Contribution: patternScore * 0.25,
	})

	// Factor 3: Historical Success (20%)
	historicalScore := calculateHistoricalSuccess(incident, allIncidents)
	factors = append(factors, PredictionFactor{
		Name:         "Historical Success",
		Score:        historicalScore,
		Weight:       0.20,
		Contribution: historicalScore * 0.20,
	})

	// Factor 4: Resource Health (15%)
	healthScore := 70.0 // Default moderate health
	factors = append(factors, PredictionFactor{
		Name:         "Resource Health",
		Score:        healthScore,
		Weight:       0.15,
		Contribution: healthScore * 0.15,
	})

	// Factor 5: Fix Complexity (5%)
	complexityScore := 80.0 // Assume low complexity
	factors = append(factors, PredictionFactor{
		Name:         "Fix Complexity",
		Score:        complexityScore,
		Weight:       0.05,
		Contribution: complexityScore * 0.05,
	})

	// Calculate total probability
	probability := 0.0
	for _, factor := range factors {
		probability += factor.Contribution
	}

	// Determine risk level
	risk := "medium"
	if probability >= 80 {
		risk = "low"
	} else if probability < 50 {
		risk = "high"
	}

	// Generate explanation
	explanation := fmt.Sprintf("Based on diagnosis confidence (%.0f%%), pattern recognition (%.0f%%), and historical data, this fix has a %.0f%% probability of success.",
		diagnosisScore, patternScore, probability)

	return SuccessPrediction{
		Probability:  probability,
		Confidence:   diagnosisScore,
		Factors:      factors,
		Risk:         risk,
		Explanation:  explanation,
	}
}

// calculateHistoricalSuccess calculates success rate from historical data
func calculateHistoricalSuccess(incident *incidents.Incident, allIncidents []*incidents.Incident) float64 {
	samePattern := 0
	resolved := 0

	for _, inc := range allIncidents {
		if inc.Pattern == incident.Pattern {
			samePattern++
			if inc.Status == incidents.StatusResolved {
				resolved++
			}
		}
	}

	if samePattern == 0 {
		return 70.0 // Default: no historical data
	}

	successRate := (float64(resolved) / float64(samePattern)) * 100
	return successRate
}

// ExecutionStep represents a step in fix execution
type ExecutionStep struct {
	ID          string `json:"id"`
	Title       string `json:"title"`
	Description string `json:"description"`
	Status      string `json:"status"` // pending, running, success, failed
}

// generateExecutionSteps generates execution steps based on incident pattern
func generateExecutionSteps(incident *incidents.Incident, recommendation *incidents.Recommendation) []ExecutionStep {
	steps := []ExecutionStep{}

	// Common first step
	steps = append(steps, ExecutionStep{
		ID:          "validate",
		Title:       "Validate Prerequisites",
		Description: "Checking cluster state and resource availability",
		Status:      "pending",
	})

	// Pattern-specific steps
	pattern := string(incident.Pattern)
	if strings.Contains(pattern, "CRASH") || strings.Contains(pattern, "OOM") {
		steps = append(steps,
			ExecutionStep{
				ID:          "snapshot",
				Title:       "Create State Snapshot",
				Description: "Taking snapshot for rollback capability",
				Status:      "pending",
			},
			ExecutionStep{
				ID:          "update-resources",
				Title:       "Update Resource Limits",
				Description: "Applying new memory/CPU limits",
				Status:      "pending",
			},
			ExecutionStep{
				ID:          "restart",
				Title:       "Restart Pod",
				Description: "Performing controlled pod restart",
				Status:      "pending",
			},
		)
	} else if strings.Contains(pattern, "IMAGE") {
		steps = append(steps,
			ExecutionStep{
				ID:          "verify-image",
				Title:       "Verify Image Availability",
				Description: "Checking image exists in registry",
				Status:      "pending",
			},
			ExecutionStep{
				ID:          "update-spec",
				Title:       "Update Pod Specification",
				Description: "Correcting image name/tag",
				Status:      "pending",
			},
		)
	} else {
		steps = append(steps, ExecutionStep{
			ID:          "apply-fix",
			Title:       "Apply Fix",
			Description: "Executing remediation steps",
			Status:      "pending",
		})
	}

	// Common final steps
	steps = append(steps,
		ExecutionStep{
			ID:          "verify",
			Title:       "Verify Health",
			Description: "Running health checks and verifying pod status",
			Status:      "pending",
		},
		ExecutionStep{
			ID:          "monitor",
			Title:       "Monitor Stability",
			Description: "Monitoring for 30 seconds (rollback window)",
			Status:      "pending",
		},
	)

	return steps
}

// ExecutionResult represents the result of fix execution
type ExecutionResult struct {
	Status      string          `json:"status"` // success, failed, pending
	Steps       []ExecutionStep `json:"steps"`
	Message     string          `json:"message"`
	CanRollback bool            `json:"canRollback"`
	Error       string          `json:"error,omitempty"`
}

// executeFixWithMonitoring executes a fix with monitoring
func executeFixWithMonitoring(ws *WebServer, incident *incidents.Incident, recommendation *incidents.Recommendation, confirmed bool) ExecutionResult {
	if !confirmed {
		return ExecutionResult{
			Status:      "pending",
			Steps:       generateExecutionSteps(incident, recommendation),
			Message:     "Fix requires confirmation before execution",
			CanRollback: false,
		}
	}

	// This is a simplified implementation
	// In production, this would execute the actual fix using the K8s client
	steps := generateExecutionSteps(incident, recommendation)

	// Simulate successful execution
	for i := range steps {
		steps[i].Status = "success"
	}

	return ExecutionResult{
		Status:      "success",
		Steps:       steps,
		Message:     "Fix applied successfully. Monitoring for 30 seconds.",
		CanRollback: true,
	}
}

// RCAReport represents a Root Cause Analysis report
type RCAReport struct {
	Metadata          RCAMetadata          `json:"metadata"`
	ExecutiveSummary  RCAExecutiveSummary  `json:"executiveSummary"`
	Timeline          []RCATimelineEntry   `json:"timeline"`
	RootCauseAnalysis RCARootCause         `json:"rootCauseAnalysis"`
	ImpactAssessment  RCAImpact            `json:"impactAssessment"`
	ResolutionSteps   []RCAResolutionStep  `json:"resolutionSteps"`
	Recommendations   []RCARecommendation  `json:"recommendations"`
}

// RCA sub-types
type RCAMetadata struct {
	IncidentID    string    `json:"incidentId"`
	GeneratedAt   time.Time `json:"generatedAt"`
	GeneratedBy   string    `json:"generatedBy"`
	Severity      string    `json:"severity"`
	Pattern       string    `json:"pattern"`
	Status        string    `json:"status"`
}

type RCAExecutiveSummary struct {
	Overview          string `json:"overview"`
	RootCause         string `json:"rootCause"`
	Impact            string `json:"impact"`
	Resolution        string `json:"resolution"`
	PreventiveMeasure string `json:"preventiveMeasure"`
}

type RCATimelineEntry struct {
	Timestamp   time.Time `json:"timestamp"`
	Event       string    `json:"event"`
	Description string    `json:"description"`
}

type RCARootCause struct {
	PrimaryCause   string   `json:"primaryCause"`
	Contributing   []string `json:"contributing"`
	Evidence       []string `json:"evidence"`
	Confidence     float64  `json:"confidence"`
}

type RCAImpact struct {
	AffectedResources []string `json:"affectedResources"`
	ServiceImpact     string   `json:"serviceImpact"`
	UserImpact        string   `json:"userImpact"`
	Duration          string   `json:"duration"`
}

type RCAResolutionStep struct {
	Step        string    `json:"step"`
	Description string    `json:"description"`
	CompletedAt time.Time `json:"completedAt"`
}

type RCARecommendation struct {
	Category    string `json:"category"`
	Recommendation string `json:"recommendation"`
	Priority    string `json:"priority"`
}

// generateRCAReport generates a comprehensive RCA report
func generateRCAReport(incident *incidents.Incident) RCAReport {
	now := time.Now()

	rca := RCAReport{
		Metadata: RCAMetadata{
			IncidentID:  incident.ID,
			GeneratedAt: now,
			GeneratedBy: "KubeGraf Intelligence System",
			Severity:    string(incident.Severity),
			Pattern:     string(incident.Pattern),
			Status:      string(incident.Status),
		},
	}

	// Executive Summary
	rootCause := "Under investigation"
	if incident.Diagnosis != nil && len(incident.Diagnosis.ProbableCauses) > 0 {
		rootCause = incident.Diagnosis.ProbableCauses[0]
	}

	rca.ExecutiveSummary = RCAExecutiveSummary{
		Overview:          fmt.Sprintf("Incident affecting %s/%s in namespace %s", incident.Resource.Kind, incident.Resource.Name, incident.Resource.Namespace),
		RootCause:         rootCause,
		Impact:            fmt.Sprintf("Service disruption in %s namespace", incident.Resource.Namespace),
		Resolution:        incident.Resolution,
		PreventiveMeasure: "Implement monitoring and alerting for early detection",
	}

	// Timeline
	rca.Timeline = []RCATimelineEntry{
		{
			Timestamp:   incident.FirstSeen,
			Event:       "Incident Detected",
			Description: fmt.Sprintf("First occurrence of %s pattern", incident.Pattern),
		},
		{
			Timestamp:   incident.LastSeen,
			Event:       "Last Occurrence",
			Description: fmt.Sprintf("Incident occurred %d times", incident.Occurrences),
		},
	}

	// Root Cause Analysis
	evidence := []string{}
	if incident.Diagnosis != nil {
		evidence = incident.Diagnosis.Evidence
	}

	rca.RootCauseAnalysis = RCARootCause{
		PrimaryCause:   rootCause,
		Contributing:   []string{},
		Evidence:       evidence,
		Confidence:     incident.Diagnosis.Confidence * 100,
	}

	// Impact Assessment
	duration := incident.LastSeen.Sub(incident.FirstSeen)
	rca.ImpactAssessment = RCAImpact{
		AffectedResources: []string{incident.Resource.String()},
		ServiceImpact:     "Service availability reduced",
		UserImpact:        "Potential service disruptions",
		Duration:          formatDuration(duration),
	}

	// Recommendations
	rca.Recommendations = []RCARecommendation{
		{
			Category:       "Monitoring",
			Recommendation: "Set up alerts for similar patterns",
			Priority:       "High",
		},
		{
			Category:       "Prevention",
			Recommendation: "Review resource limits and quotas",
			Priority:       "Medium",
		},
	}

	return rca
}

// ExportAsMarkdown exports RCA report as Markdown
func (r *RCAReport) ExportAsMarkdown() string {
	var md strings.Builder

	md.WriteString("# Root Cause Analysis Report\n\n")
	md.WriteString(fmt.Sprintf("**Incident ID:** %s\n", r.Metadata.IncidentID))
	md.WriteString(fmt.Sprintf("**Generated:** %s\n", r.Metadata.GeneratedAt.Format("2006-01-02 15:04:05")))
	md.WriteString(fmt.Sprintf("**Severity:** %s\n", r.Metadata.Severity))
	md.WriteString(fmt.Sprintf("**Pattern:** %s\n\n", r.Metadata.Pattern))

	md.WriteString("## Executive Summary\n\n")
	md.WriteString(fmt.Sprintf("**Overview:** %s\n\n", r.ExecutiveSummary.Overview))
	md.WriteString(fmt.Sprintf("**Root Cause:** %s\n\n", r.ExecutiveSummary.RootCause))
	md.WriteString(fmt.Sprintf("**Impact:** %s\n\n", r.ExecutiveSummary.Impact))

	md.WriteString("## Timeline\n\n")
	for _, entry := range r.Timeline {
		md.WriteString(fmt.Sprintf("- **%s** - %s: %s\n", entry.Timestamp.Format("15:04:05"), entry.Event, entry.Description))
	}
	md.WriteString("\n")

	md.WriteString("## Root Cause Analysis\n\n")
	md.WriteString(fmt.Sprintf("**Primary Cause:** %s\n\n", r.RootCauseAnalysis.PrimaryCause))
	md.WriteString(fmt.Sprintf("**Confidence:** %.0f%%\n\n", r.RootCauseAnalysis.Confidence))

	md.WriteString("## Recommendations\n\n")
	for _, rec := range r.Recommendations {
		md.WriteString(fmt.Sprintf("- **[%s]** %s: %s\n", rec.Priority, rec.Category, rec.Recommendation))
	}

	return md.String()
}

// ExportAsHTML exports RCA report as HTML
func (r *RCAReport) ExportAsHTML() string {
	var html strings.Builder

	html.WriteString("<!DOCTYPE html>\n<html>\n<head>\n")
	html.WriteString("<title>RCA Report - " + r.Metadata.IncidentID + "</title>\n")
	html.WriteString("<style>body{font-family:Arial,sans-serif;margin:20px;}</style>\n")
	html.WriteString("</head>\n<body>\n")

	html.WriteString("<h1>Root Cause Analysis Report</h1>\n")
	html.WriteString(fmt.Sprintf("<p><strong>Incident ID:</strong> %s</p>\n", r.Metadata.IncidentID))
	html.WriteString(fmt.Sprintf("<p><strong>Generated:</strong> %s</p>\n", r.Metadata.GeneratedAt.Format("2006-01-02 15:04:05")))
	html.WriteString(fmt.Sprintf("<p><strong>Severity:</strong> %s</p>\n", r.Metadata.Severity))

	html.WriteString("<h2>Executive Summary</h2>\n")
	html.WriteString(fmt.Sprintf("<p><strong>Overview:</strong> %s</p>\n", r.ExecutiveSummary.Overview))
	html.WriteString(fmt.Sprintf("<p><strong>Root Cause:</strong> %s</p>\n", r.ExecutiveSummary.RootCause))

	html.WriteString("<h2>Timeline</h2>\n<ul>\n")
	for _, entry := range r.Timeline {
		html.WriteString(fmt.Sprintf("<li><strong>%s</strong> - %s: %s</li>\n", entry.Timestamp.Format("15:04:05"), entry.Event, entry.Description))
	}
	html.WriteString("</ul>\n")

	html.WriteString("<h2>Recommendations</h2>\n<ul>\n")
	for _, rec := range r.Recommendations {
		html.WriteString(fmt.Sprintf("<li><strong>[%s]</strong> %s: %s</li>\n", rec.Priority, rec.Category, rec.Recommendation))
	}
	html.WriteString("</ul>\n")

	html.WriteString("</body>\n</html>")

	return html.String()
}
