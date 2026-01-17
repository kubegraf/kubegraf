// Copyright 2025 KubeGraf Contributors
// SPDX-License-Identifier: Apache-2.0

package incidents

import (
	"fmt"
	"math"
	"sort"
	"sync"
	"time"
)

// LearningEngine provides ML-like learning capabilities for incident analysis
type LearningEngine struct {
	knowledgeBank *KnowledgeBank
	runbookReg    *RunbookRegistry

	// Pattern clusters
	clusters      map[string]*IncidentCluster
	clusterIndex  map[string]string // fingerprint -> cluster ID

	// Learned patterns (detected anomalies)
	learnedPatterns []*LearnedPattern

	// Runbook rankings per pattern
	runbookRankings map[FailurePattern][]*RunbookRanking

	// Trend data
	trendData     map[FailurePattern]*PatternTrend

	mu sync.RWMutex
}

// IncidentCluster represents a cluster of similar incidents
type IncidentCluster struct {
	ID              string             `json:"id"`
	Fingerprint     string             `json:"fingerprint"`
	Pattern         FailurePattern     `json:"pattern"`
	IncidentCount   int                `json:"incidentCount"`
	FirstSeen       time.Time          `json:"firstSeen"`
	LastSeen        time.Time          `json:"lastSeen"`
	CommonCauses    []string           `json:"commonCauses"`
	BestRunbook     string             `json:"bestRunbook,omitempty"`
	SuccessRate     float64            `json:"successRate"`
	AvgResolutionMs int64              `json:"avgResolutionMs"`
	SampleIncidents []string           `json:"sampleIncidents"` // IDs of sample incidents
}

// LearnedPattern represents a pattern learned from historical data
type LearnedPattern struct {
	ID          string         `json:"id"`
	Name        string         `json:"name"`
	Description string         `json:"description"`
	BasePattern FailurePattern `json:"basePattern"`
	Conditions  []PatternCondition `json:"conditions"`
	Confidence  float64        `json:"confidence"`
	Occurrences int            `json:"occurrences"`
	LearnedAt   time.Time      `json:"learnedAt"`
	IsAnomaly   bool           `json:"isAnomaly"`
}

// PatternCondition defines a condition for pattern matching
type PatternCondition struct {
	Field    string      `json:"field"`
	Operator string      `json:"operator"`
	Value    interface{} `json:"value"`
}

// RunbookRanking represents a ranked runbook for a pattern
type RunbookRanking struct {
	RunbookID      string  `json:"runbookId"`
	RunbookName    string  `json:"runbookName"`
	Score          float64 `json:"score"`
	SuccessRate    float64 `json:"successRate"`
	ExecutionCount int     `json:"executionCount"`
	AvgResolutionMs int64  `json:"avgResolutionMs"`
	LastUsed       *time.Time `json:"lastUsed,omitempty"`
}

// PatternTrend represents trend data for a pattern
type PatternTrend struct {
	Pattern       FailurePattern `json:"pattern"`
	Last24h       TrendPoint     `json:"last24h"`
	Last7d        TrendPoint     `json:"last7d"`
	Last30d       TrendPoint     `json:"last30d"`
	Trend         string         `json:"trend"` // increasing, decreasing, stable
	ChangePercent float64        `json:"changePercent"`
}

// TrendPoint represents a single trend data point
type TrendPoint struct {
	Count           int     `json:"count"`
	ResolvedCount   int     `json:"resolvedCount"`
	AvgResolutionMs int64   `json:"avgResolutionMs"`
	SuccessRate     float64 `json:"successRate"`
}

// SimilarityResult represents a similarity search result
type SimilarityResult struct {
	IncidentID    string  `json:"incidentId"`
	Similarity    float64 `json:"similarity"`
	Pattern       FailurePattern `json:"pattern"`
	Resolution    string  `json:"resolution,omitempty"`
	WasResolved   bool    `json:"wasResolved"`
	SuccessfulFix string  `json:"successfulFix,omitempty"`
}

// NewLearningEngine creates a new learning engine
func NewLearningEngine(knowledgeBank *KnowledgeBank, runbookReg *RunbookRegistry) *LearningEngine {
	return &LearningEngine{
		knowledgeBank:   knowledgeBank,
		runbookReg:      runbookReg,
		clusters:        make(map[string]*IncidentCluster),
		clusterIndex:    make(map[string]string),
		runbookRankings: make(map[FailurePattern][]*RunbookRanking),
		trendData:       make(map[FailurePattern]*PatternTrend),
	}
}

// LearnFromIncident updates learning based on a new incident
func (e *LearningEngine) LearnFromIncident(incident *Incident, evidencePack *EvidencePack) {
	e.mu.Lock()
	defer e.mu.Unlock()

	// Update cluster
	e.updateCluster(incident)

	// Check for anomalies
	e.detectAnomalies(incident, evidencePack)

	// Update runbook rankings if incident was resolved
	if incident.Status == StatusResolved {
		e.updateRunbookRankings(incident)
	}
	// Per-incident learning log removed for production (too verbose)
}

// updateCluster updates or creates an incident cluster
func (e *LearningEngine) updateCluster(incident *Incident) {
	clusterID := fmt.Sprintf("cluster-%s", incident.Fingerprint[:8])

	cluster, exists := e.clusters[clusterID]
	if !exists {
		cluster = &IncidentCluster{
			ID:          clusterID,
			Fingerprint: incident.Fingerprint,
			Pattern:     incident.Pattern,
			FirstSeen:   incident.FirstSeen,
			LastSeen:    incident.LastSeen,
		}
		e.clusters[clusterID] = cluster
	}

	cluster.IncidentCount++
	if incident.LastSeen.After(cluster.LastSeen) {
		cluster.LastSeen = incident.LastSeen
	}

	// Track causes
	if incident.Diagnosis != nil {
		for _, cause := range incident.Diagnosis.ProbableCauses {
			if !containsString(cluster.CommonCauses, cause) {
				cluster.CommonCauses = append(cluster.CommonCauses, cause)
			}
		}
	}

	// Keep sample incidents (max 10)
	if len(cluster.SampleIncidents) < 10 {
		cluster.SampleIncidents = append(cluster.SampleIncidents, incident.ID)
	}

	e.clusterIndex[incident.Fingerprint] = clusterID
}

// detectAnomalies looks for unusual patterns
func (e *LearningEngine) detectAnomalies(incident *Incident, evidencePack *EvidencePack) {
	// Check for unusual restart frequency
	if incident.Pattern == PatternRestartStorm && incident.Occurrences > 10 {
		e.recordLearnedPattern(&LearnedPattern{
			ID:          fmt.Sprintf("anomaly-%s-%d", incident.ID, time.Now().Unix()),
			Name:        "High Frequency Restart Storm",
			Description: fmt.Sprintf("Unusually high restart count (%d) detected", incident.Occurrences),
			BasePattern: PatternRestartStorm,
			Conditions: []PatternCondition{
				{Field: "occurrences", Operator: "greater_than", Value: 10},
			},
			Confidence:  0.85,
			Occurrences: 1,
			LearnedAt:   time.Now(),
			IsAnomaly:   true,
		})
	}

	// Check for cascading failures (multiple resources affected)
	if len(incident.RelatedResources) > 3 {
		e.recordLearnedPattern(&LearnedPattern{
			ID:          fmt.Sprintf("cascade-%s-%d", incident.ID, time.Now().Unix()),
			Name:        "Cascading Failure Pattern",
			Description: fmt.Sprintf("Multiple resources affected (%d related)", len(incident.RelatedResources)),
			BasePattern: incident.Pattern,
			Conditions: []PatternCondition{
				{Field: "related_resources", Operator: "greater_than", Value: 3},
			},
			Confidence:  0.80,
			Occurrences: 1,
			LearnedAt:   time.Now(),
			IsAnomaly:   true,
		})
	}

	// Check for recurring pattern (same fingerprint seen multiple times)
	if clusterID, ok := e.clusterIndex[incident.Fingerprint]; ok {
		if cluster := e.clusters[clusterID]; cluster != nil && cluster.IncidentCount > 5 {
			e.recordLearnedPattern(&LearnedPattern{
				ID:          fmt.Sprintf("recurring-%s", incident.Fingerprint[:8]),
				Name:        "Recurring Incident Pattern",
				Description: fmt.Sprintf("Pattern has occurred %d times", cluster.IncidentCount),
				BasePattern: incident.Pattern,
				Conditions: []PatternCondition{
					{Field: "fingerprint", Operator: "equals", Value: incident.Fingerprint},
				},
				Confidence:  0.90,
				Occurrences: cluster.IncidentCount,
				LearnedAt:   time.Now(),
				IsAnomaly:   false,
			})
		}
	}
}

// recordLearnedPattern records or updates a learned pattern
func (e *LearningEngine) recordLearnedPattern(pattern *LearnedPattern) {
	// Check if we already have this pattern
	for i, existing := range e.learnedPatterns {
		if existing.ID == pattern.ID {
			e.learnedPatterns[i].Occurrences++
			e.learnedPatterns[i].Confidence = math.Min(existing.Confidence+0.01, 1.0)
			return
		}
	}

	e.learnedPatterns = append(e.learnedPatterns, pattern)

	// Keep only last 100 patterns
	if len(e.learnedPatterns) > 100 {
		e.learnedPatterns = e.learnedPatterns[len(e.learnedPatterns)-50:]
	}
}

// updateRunbookRankings updates runbook rankings for a pattern
func (e *LearningEngine) updateRunbookRankings(incident *Incident) {
	if e.knowledgeBank == nil {
		return
	}

	// Get fixes for this incident
	fixes, err := e.knowledgeBank.GetFixesForIncident(incident.ID)
	if err != nil {
		return
	}

	for _, fix := range fixes {
		if fix.DryRun {
			continue
		}

		// Update or create ranking
		rankings := e.runbookRankings[incident.Pattern]
		found := false
		for _, r := range rankings {
			if r.RunbookID == fix.RunbookID {
				r.ExecutionCount++
				if fix.Success {
					r.SuccessRate = (r.SuccessRate*float64(r.ExecutionCount-1) + 1) / float64(r.ExecutionCount)
				} else {
					r.SuccessRate = r.SuccessRate * float64(r.ExecutionCount-1) / float64(r.ExecutionCount)
				}
				r.Score = calculateRunbookScore(r)
				now := time.Now()
				r.LastUsed = &now
				found = true
				break
			}
		}

		if !found {
			successRate := 0.0
			if fix.Success {
				successRate = 1.0
			}
			ranking := &RunbookRanking{
				RunbookID:      fix.RunbookID,
				RunbookName:    fix.RunbookName,
				ExecutionCount: 1,
				SuccessRate:    successRate,
			}
			ranking.Score = calculateRunbookScore(ranking)
			now := time.Now()
			ranking.LastUsed = &now
			e.runbookRankings[incident.Pattern] = append(e.runbookRankings[incident.Pattern], ranking)
		}

		// Sort by score
		sort.Slice(e.runbookRankings[incident.Pattern], func(i, j int) bool {
			return e.runbookRankings[incident.Pattern][i].Score > e.runbookRankings[incident.Pattern][j].Score
		})
	}
}

// calculateRunbookScore calculates a score for ranking
func calculateRunbookScore(r *RunbookRanking) float64 {
	// Score based on success rate and execution count
	// More executions + higher success rate = higher score
	executionFactor := math.Log10(float64(r.ExecutionCount) + 1)
	return r.SuccessRate * (1 + executionFactor*0.1)
}

// FindSimilarIncidents finds incidents similar to the given one
func (e *LearningEngine) FindSimilarIncidents(incident *Incident, limit int) []*SimilarityResult {
	e.mu.RLock()
	defer e.mu.RUnlock()

	var results []*SimilarityResult

	// First, check by fingerprint (exact match)
	if clusterID, ok := e.clusterIndex[incident.Fingerprint]; ok {
		if cluster := e.clusters[clusterID]; cluster != nil {
			for _, sampleID := range cluster.SampleIncidents {
				if sampleID != incident.ID {
					results = append(results, &SimilarityResult{
						IncidentID: sampleID,
						Similarity: 1.0, // Exact fingerprint match
						Pattern:    cluster.Pattern,
					})
				}
			}
		}
	}

	// Then, check by pattern
	if e.knowledgeBank != nil {
		patternIncidents, err := e.knowledgeBank.FindIncidentsByPattern(incident.Pattern, limit*2)
		if err == nil {
			for _, record := range patternIncidents {
				if record.ID == incident.ID {
					continue
				}

				// Calculate similarity
				similarity := calculateSimilarity(incident, record)
				if similarity > 0.5 {
					result := &SimilarityResult{
						IncidentID:  record.ID,
						Similarity:  similarity,
						Pattern:     record.Pattern,
						Resolution:  record.Resolution,
						WasResolved: record.ResolvedAt != nil,
					}
					results = append(results, result)
				}
			}
		}
	}

	// Sort by similarity
	sort.Slice(results, func(i, j int) bool {
		return results[i].Similarity > results[j].Similarity
	})

	if len(results) > limit {
		results = results[:limit]
	}

	return results
}

// calculateSimilarity calculates similarity between incidents
func calculateSimilarity(incident *Incident, record *IncidentRecord) float64 {
	similarity := 0.0
	factors := 0.0

	// Pattern match (high weight)
	if incident.Pattern == record.Pattern {
		similarity += 0.4
	}
	factors += 0.4

	// Resource kind match
	if incident.Resource.Kind == record.Resource.Kind {
		similarity += 0.2
	}
	factors += 0.2

	// Namespace match
	if incident.Resource.Namespace == record.Resource.Namespace {
		similarity += 0.1
	}
	factors += 0.1

	// Severity match
	if incident.Severity == record.Severity {
		similarity += 0.1
	}
	factors += 0.1

	// Fingerprint similarity (partial match)
	if incident.Fingerprint[:4] == record.Fingerprint[:4] {
		similarity += 0.2
	}
	factors += 0.2

	return similarity / factors
}

// GetBestRunbooks returns the best ranked runbooks for a pattern
func (e *LearningEngine) GetBestRunbooks(pattern FailurePattern, limit int) []*RunbookRanking {
	e.mu.RLock()
	defer e.mu.RUnlock()

	rankings := e.runbookRankings[pattern]
	if len(rankings) <= limit {
		return rankings
	}
	return rankings[:limit]
}

// GetLearnedPatterns returns learned patterns
func (e *LearningEngine) GetLearnedPatterns(includeAnomalies bool) []*LearnedPattern {
	e.mu.RLock()
	defer e.mu.RUnlock()

	if includeAnomalies {
		return e.learnedPatterns
	}

	var filtered []*LearnedPattern
	for _, p := range e.learnedPatterns {
		if !p.IsAnomaly {
			filtered = append(filtered, p)
		}
	}
	return filtered
}

// GetCluster retrieves a cluster by fingerprint
func (e *LearningEngine) GetCluster(fingerprint string) *IncidentCluster {
	e.mu.RLock()
	defer e.mu.RUnlock()

	if clusterID, ok := e.clusterIndex[fingerprint]; ok {
		return e.clusters[clusterID]
	}
	return nil
}

// GetAllClusters returns all clusters
func (e *LearningEngine) GetAllClusters() []*IncidentCluster {
	e.mu.RLock()
	defer e.mu.RUnlock()

	result := make([]*IncidentCluster, 0, len(e.clusters))
	for _, cluster := range e.clusters {
		result = append(result, cluster)
	}

	// Sort by incident count
	sort.Slice(result, func(i, j int) bool {
		return result[i].IncidentCount > result[j].IncidentCount
	})

	return result
}

// UpdateTrends updates trend data
func (e *LearningEngine) UpdateTrends() {
	if e.knowledgeBank == nil {
		return
	}

	e.mu.Lock()
	defer e.mu.Unlock()

	// Get recent incidents and compute trends
	// This is a simplified implementation
	patterns := []FailurePattern{
		PatternCrashLoop, PatternOOMPressure, PatternRestartStorm,
		PatternImagePullFailure, PatternNoReadyEndpoints,
	}

	for _, pattern := range patterns {
		stats, err := e.knowledgeBank.GetPatternStats(pattern)
		if err != nil || stats == nil {
			continue
		}

		trend := &PatternTrend{
			Pattern: pattern,
			Last24h: TrendPoint{
				Count: stats.TotalIncidents, // Simplified - would need time-filtered queries
			},
			Trend:         "stable",
			ChangePercent: 0,
		}

		e.trendData[pattern] = trend
	}
}

// GetTrend returns trend data for a pattern
func (e *LearningEngine) GetTrend(pattern FailurePattern) *PatternTrend {
	e.mu.RLock()
	defer e.mu.RUnlock()
	return e.trendData[pattern]
}

// containsString checks if slice contains string
func containsString(slice []string, s string) bool {
	for _, item := range slice {
		if item == s {
			return true
		}
	}
	return false
}

