// Copyright 2025 KubeGraf Contributors
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package confidence

import (
	"log"
	"math"
	"strings"
	"time"

	"github.com/kubegraf/kubegraf/pkg/ai"
	"github.com/kubegraf/kubegraf/pkg/healing"
	"github.com/kubegraf/kubegraf/pkg/kubernetes"
)

// Scorer calculates confidence scores for healing actions
type Scorer struct {
	history       *ActionHistory
	resourceRules map[string]ResourceConfidenceRules
	riskWeights   RiskWeights
}

// ResourceConfidenceRules defines confidence rules for specific resources
type ResourceConfidenceRules struct {
	ActionWeights    map[string]float64 // Action-specific weights
	SeverityWeights  map[string]float64 // Severity impact weights
	TimeDecay        float64           // How confidence decays over time
	MinConfidence    float64           // Minimum confidence threshold
	RequiredChecks   []string          // Required safety checks
}

// RiskWeights defines weights for different risk factors
type RiskWeights struct {
	ResourceHealth   float64 // Weight for resource health status
	ActionComplexity float64 // Weight for action complexity
	SafetyChecks     float64 // Weight for safety check results
	HistoricalData   float64 // Weight for historical success rates
	TimeFactor       float64 // Weight for timing considerations
	ClusterState     float64 // Weight for overall cluster state
}

// NewConfidenceScorer creates a new confidence scorer
func NewConfidenceScorer() *Scorer {
	return &Scorer{
		history:       NewActionHistory(),
		resourceRules: getDefaultResourceRules(),
		riskWeights:   getDefaultRiskWeights(),
	}
}

// getDefaultResourceRules returns default confidence rules for resources
func getDefaultResourceRules() map[string]ResourceConfidenceRules {
	return map[string]ResourceConfidenceRules{
		"pod": {
			ActionWeights: map[string]float64{
				"restart":    0.85,
				"logs":       0.95,
				"describe":   0.90,
				"delete":     0.60,
			},
			SeverityWeights: map[string]float64{
				"critical": 1.0,
				"warning":  0.8,
				"info":     0.6,
			},
			TimeDecay:      0.95, // 5% decay per minute
			MinConfidence:  0.5,
			RequiredChecks: []string{"ResourceExists", "Permissions"},
		},
		"deployment": {
			ActionWeights: map[string]float64{
				"rollback":   0.75,
				"scale":      0.85,
				"restart":    0.80,
				"describe":   0.90,
			},
			SeverityWeights: map[string]float64{
				"critical": 1.0,
				"warning":  0.8,
				"info":     0.6,
			},
			TimeDecay:      0.92,
			MinConfidence:  0.6,
			RequiredChecks: []string{"ResourceExists", "Permissions", "ClusterHealth"},
		},
		"service": {
			ActionWeights: map[string]float64{
				"describe": 0.90,
				"delete":   0.50,
			},
			SeverityWeights: map[string]float64{
				"critical": 1.0,
				"warning":  0.8,
				"info":     0.6,
			},
			TimeDecay:      0.90,
			MinConfidence:  0.5,
			RequiredChecks: []string{"ResourceExists"},
		},
	}
}

// getDefaultRiskWeights returns default risk factor weights
func getDefaultRiskWeights() RiskWeights {
	return RiskWeights{
		ResourceHealth:   0.25,
		ActionComplexity: 0.20,
		SafetyChecks:     0.25,
		HistoricalData:   0.15,
		TimeFactor:       0.10,
		ClusterState:     0.05,
	}
}

// CalculateScore calculates the overall confidence score
func (s *Scorer) CalculateScore(intent *ai.Intent, health *kubernetes.ResourceHealth, suggestion *healing.HealingSuggestion, safetyChecks []healing.SafetyCheck) float64 {
	log.Printf("Calculating confidence score for %s action on %s/%s", intent.Type, intent.Resource, intent.Name)

	// Calculate individual component scores
	resourceScore := s.calculateResourceScore(intent, health)
	actionScore := s.calculateActionScore(intent, suggestion)
	safetyScore := s.calculateSafetyScore(safetyChecks)
	historicalScore := s.calculateHistoricalScore(intent)
	timeScore := s.calculateTimeScore(health)
	clusterScore := s.calculateClusterScore()

	// Combine scores using weighted average
	totalScore := resourceScore*s.riskWeights.ResourceHealth +
		actionScore*s.riskWeights.ActionComplexity +
		safetyScore*s.riskWeights.SafetyChecks +
		historicalScore*s.riskWeights.HistoricalData +
		timeScore*s.riskWeights.TimeFactor +
		clusterScore*s.riskWeights.ClusterState

	// Apply resource-specific rules
	totalScore = s.applyResourceRules(intent, totalScore)

	// Ensure score is within bounds
	totalScore = math.Max(0.0, math.Min(1.0, totalScore))

	log.Printf("Confidence score breakdown - Resource: %.2f, Action: %.2f, Safety: %.2f, Historical: %.2f, Time: %.2f, Cluster: %.2f = Total: %.2f",
		resourceScore, actionScore, safetyScore, historicalScore, timeScore, clusterScore, totalScore)

	return totalScore
}

// calculateResourceScore calculates confidence based on resource health
func (s *Scorer) calculateResourceScore(intent *ai.Intent, health *kubernetes.ResourceHealth) float64 {
	if health == nil {
		return 0.3 // Low confidence if no health data
	}

	baseScore := 0.5

	// Adjust based on resource readiness
	if health.Ready {
		baseScore += 0.2
	} else {
		baseScore -= 0.1
	}

	// Adjust based on issues
	criticalIssues := 0
	warningIssues := 0
	infoIssues := 0

	for _, issue := range health.Issues {
		switch strings.ToLower(issue.Severity) {
		case "critical":
			criticalIssues++
		case "warning":
			warningIssues++
		case "info":
			infoIssues++
		}
	}

	// Critical issues reduce confidence significantly
	baseScore -= float64(criticalIssues) * 0.15
	baseScore -= float64(warningIssues) * 0.08
	baseScore -= float64(infoIssues) * 0.03

	// Boost confidence if there are clear issues that match the suggested action
	if len(health.Issues) > 0 && intentMatchesIssues(intent, health.Issues) {
		baseScore += 0.15
	}

	return math.Max(0.1, math.Min(0.9, baseScore))
}

// calculateActionScore calculates confidence based on action complexity
func (s *Scorer) calculateActionScore(intent *ai.Intent, suggestion *healing.HealingSuggestion) float64 {
	baseScore := 0.6

	// Get action-specific weight from resource rules
	if rules, exists := s.resourceRules[intent.Resource]; exists {
		if weight, exists := rules.ActionWeights[intent.Type]; exists {
			baseScore = weight
		}
	}

	// Adjust based on risk level
	switch strings.ToLower(suggestion.RiskLevel) {
	case "low":
		baseScore += 0.1
	case "medium":
		baseScore += 0.0
	case "high":
		baseScore -= 0.2
	}

	// Adjust based on confidence in suggestion
	if suggestion.Confidence > 0.8 {
		baseScore += 0.05
	} else if suggestion.Confidence < 0.5 {
		baseScore -= 0.1
	}

	return math.Max(0.1, math.Min(0.95, baseScore))
}

// calculateSafetyScore calculates confidence based on safety check results
func (s *Scorer) calculateSafetyScore(safetyChecks []healing.SafetyCheck) float64 {
	if len(safetyChecks) == 0 {
		return 0.5 // Neutral if no safety checks
	}

	passed := 0
	failed := 0
	warnings := 0

	for _, check := range safetyChecks {
		switch strings.ToLower(check.Status) {
		case "passed":
			passed++
		case "failed":
			failed++
		case "warning":
			warnings++
		}
	}

	total := len(safetyChecks)
	score := float64(passed) / float64(total)

	// Penalize failed checks heavily
	if failed > 0 {
		score -= float64(failed) * 0.3
	}

	// Slight penalty for warnings
	score -= float64(warnings) * 0.1

	return math.Max(0.0, math.Min(1.0, score))
}

// calculateHistoricalScore calculates confidence based on historical success rates
func (s *Scorer) calculateHistoricalScore(intent *ai.Intent) float64 {
	// Get historical data for similar actions
	history := s.history.GetSimilarActions(intent.Resource, intent.Type)
	if len(history) == 0 {
		return 0.5 // Neutral if no historical data
	}

	successful := 0
	total := len(history)

	for _, action := range history {
		if action.Status == "completed" && action.Error == "" {
			successful++
		}
	}

	successRate := float64(successful) / float64(total)

	// Weight recent actions more heavily
	recentActions := 0
	recentSuccessful := 0
	cutoff := time.Now().Add(-24 * time.Hour) // Last 24 hours

	for _, action := range history {
		if action.StartedAt.After(cutoff) {
			recentActions++
			if action.Status == "completed" && action.Error == "" {
				recentSuccessful++
			}
		}
	}

	if recentActions > 0 {
		recentSuccessRate := float64(recentSuccessful) / float64(recentActions)
		// Blend overall and recent success rates
		successRate = (successRate*0.3) + (recentSuccessRate*0.7)
	}

	return successRate
}

// calculateTimeScore calculates confidence based on timing factors
func (s *Scorer) calculateTimeScore(health *kubernetes.ResourceHealth) float64 {
	if health == nil || health.LastChecked.IsZero() {
		return 0.5
	}

	// Calculate time since last health check
	timeSinceCheck := time.Since(health.LastChecked)

	// Confidence decreases as data gets older
	// Assume data is fresh for 5 minutes, then decays
	if timeSinceCheck < 5*time.Minute {
		return 1.0
	} else if timeSinceCheck < 15*time.Minute {
		return 0.8
	} else if timeSinceCheck < 30*time.Minute {
		return 0.6
	} else {
		return 0.3
	}
}

// calculateClusterScore calculates confidence based on cluster state
func (s *Scorer) calculateClusterScore() float64 {
	// This would check cluster-wide metrics
	// For now, return a neutral score
	return 0.7
}

// applyResourceRules applies resource-specific confidence rules
func (s *Scorer) applyResourceRules(intent *ai.Intent, score float64) float64 {
	rules, exists := s.resourceRules[intent.Resource]
	if !exists {
		return score
	}

	// Apply minimum confidence threshold
	if score < rules.MinConfidence {
		log.Printf("Score %.2f below minimum threshold %.2f for resource %s", score, rules.MinConfidence, intent.Resource)
		score = rules.MinConfidence
	}

	return score
}

// intentMatchesIssues checks if the intent matches the identified issues
func intentMatchesIssues(intent *ai.Intent, issues []kubernetes.HealthIssue) bool {
	if len(issues) == 0 {
		return false
	}

	// Check if intent type matches any issue patterns
	for _, issue := range issues {
		switch intent.Type {
		case "restart":
			if issue.Type == "ContainerWaiting" || issue.Type == "HighRestartCount" || issue.Type == "PodStatus" {
				return true
			}
		case "rollback":
			if issue.Type == "DeploymentNotAvailable" || issue.Type == "ReplicaMismatch" {
				return true
			}
		case "scale":
			if issue.Type == "ReplicaMismatch" || strings.Contains(issue.Message, "replica") {
				return true
			}
		}
	}

	return false
}

// GetConfidenceLevel returns a human-readable confidence level
func GetConfidenceLevel(score float64) string {
	switch {
	case score >= 0.9:
		return "Very High"
	case score >= 0.8:
		return "High"
	case score >= 0.7:
		return "Medium-High"
	case score >= 0.6:
		return "Medium"
	case score >= 0.5:
		return "Medium-Low"
	case score >= 0.3:
		return "Low"
	default:
		return "Very Low"
	}
}

// GetConfidenceColor returns a color based on confidence level
func GetConfidenceColor(score float64) string {
	switch {
	case score >= 0.8:
		return "green"
	case score >= 0.6:
		return "yellow"
	case score >= 0.4:
		return "orange"
	default:
		return "red"
	}
}

// ActionHistory tracks healing action history for confidence scoring
type ActionHistory struct {
	actions []ActionRecord
}

// ActionRecord represents a recorded healing action
type ActionRecord struct {
	Resource    string    `json:"resource"`
	Action      string    `json:"action"`
	Status      string    `json:"status"`
	Error       string    `json:"error,omitempty"`
	StartedAt   time.Time `json:"started_at"`
	CompletedAt time.Time `json:"completed_at,omitempty"`
}

// NewActionHistory creates a new action history
func NewActionHistory() *ActionHistory {
	return &ActionHistory{
		actions: []ActionRecord{},
	}
}

// RecordAction records a healing action
func (h *ActionHistory) RecordAction(result *healing.ActionResult) {
	h.actions = append(h.actions, ActionRecord{
		Resource:    result.Resource,
		Action:      result.Action,
		Status:      result.Status,
		Error:       result.Error,
		StartedAt:   result.StartedAt,
		CompletedAt: result.CompletedAt,
	})

	// Keep only recent actions (last 1000)
	if len(h.actions) > 1000 {
		h.actions = h.actions[len(h.actions)-1000:]
	}
}

// GetSimilarActions returns similar actions from history
func (h *ActionHistory) GetSimilarActions(resource, action string) []ActionRecord {
	var similar []ActionRecord
	
	for _, record := range h.actions {
		if record.Resource == resource && record.Action == action {
			similar = append(similar, record)
		}
	}
	
	return similar
}

// GetOverallSuccessRate returns the overall success rate of healing actions
func (h *ActionHistory) GetOverallSuccessRate() float64 {
	if len(h.actions) == 0 {
		return 0.5
	}

	successful := 0
	for _, action := range h.actions {
		if action.Status == "completed" && action.Error == "" {
			successful++
		}
	}

	return float64(successful) / float64(len(h.actions))
}