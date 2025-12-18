// Copyright 2025 KubeGraf Contributors
// SPDX-License-Identifier: Apache-2.0

package clusters

import (
	"sort"
	"sync"
	"time"
)

// ClusterSummary provides aggregated incident information for a cluster.
type ClusterSummary struct {
	ClusterID      string          `json:"clusterId"`
	ClusterName    string          `json:"clusterName"`
	IncidentCounts map[string]int  `json:"incidentCounts"` // severity -> count
	TopPatterns    []PatternCount  `json:"topPatterns"`
	LastUpdated    time.Time       `json:"lastUpdated"`
	HealthScore    float64         `json:"healthScore"` // 0.0 - 1.0
	Status         string          `json:"status"`      // "healthy", "warning", "critical"
}

// PatternCount represents a failure pattern and its occurrence count.
type PatternCount struct {
	Pattern string `json:"pattern"`
	Count   int    `json:"count"`
}

// MultiClusterSummary provides an aggregated view across all clusters.
type MultiClusterSummary struct {
	TotalClusters    int                       `json:"totalClusters"`
	TotalIncidents   int                       `json:"totalIncidents"`
	ClusterSummaries []ClusterSummary          `json:"clusters"`
	TopPatterns      []PatternCount            `json:"topPatterns"`
	SeverityCounts   map[string]int            `json:"severityCounts"`
	GeneratedAt      time.Time                 `json:"generatedAt"`
}

// IncidentInfo contains minimal incident data for aggregation.
type IncidentInfo struct {
	ID        string
	ClusterID string
	Pattern   string
	Severity  string
	FirstSeen time.Time
	LastSeen  time.Time
	Active    bool
}

// ClusterSummaryAggregator aggregates incidents across clusters.
type ClusterSummaryAggregator struct {
	mu       sync.RWMutex
	clusters map[string]*ClusterSummary
	// Map of clusterID -> list of incidents
	incidents map[string][]IncidentInfo
}

// NewClusterSummaryAggregator creates a new aggregator.
func NewClusterSummaryAggregator() *ClusterSummaryAggregator {
	return &ClusterSummaryAggregator{
		clusters:  make(map[string]*ClusterSummary),
		incidents: make(map[string][]IncidentInfo),
	}
}

// RegisterCluster registers a cluster for aggregation.
func (a *ClusterSummaryAggregator) RegisterCluster(clusterID, clusterName string) {
	a.mu.Lock()
	defer a.mu.Unlock()

	if _, exists := a.clusters[clusterID]; !exists {
		a.clusters[clusterID] = &ClusterSummary{
			ClusterID:      clusterID,
			ClusterName:    clusterName,
			IncidentCounts: make(map[string]int),
			TopPatterns:    []PatternCount{},
			LastUpdated:    time.Now(),
			HealthScore:    1.0,
			Status:         "healthy",
		}
		a.incidents[clusterID] = []IncidentInfo{}
	}
}

// UpdateIncident updates incident information for aggregation.
func (a *ClusterSummaryAggregator) UpdateIncident(incident IncidentInfo) {
	a.mu.Lock()
	defer a.mu.Unlock()

	// Ensure cluster exists
	if _, exists := a.clusters[incident.ClusterID]; !exists {
		a.RegisterCluster(incident.ClusterID, incident.ClusterID)
	}

	// Check if incident already exists and update
	incidents := a.incidents[incident.ClusterID]
	found := false
	for i, inc := range incidents {
		if inc.ID == incident.ID {
			incidents[i] = incident
			found = true
			break
		}
	}
	if !found {
		a.incidents[incident.ClusterID] = append(incidents, incident)
	}

	// Recalculate cluster summary
	a.recalculateClusterSummary(incident.ClusterID)
}

// RemoveIncident removes an incident from aggregation.
func (a *ClusterSummaryAggregator) RemoveIncident(clusterID, incidentID string) {
	a.mu.Lock()
	defer a.mu.Unlock()

	incidents := a.incidents[clusterID]
	for i, inc := range incidents {
		if inc.ID == incidentID {
			a.incidents[clusterID] = append(incidents[:i], incidents[i+1:]...)
			break
		}
	}

	a.recalculateClusterSummary(clusterID)
}

// recalculateClusterSummary recalculates the summary for a cluster.
func (a *ClusterSummaryAggregator) recalculateClusterSummary(clusterID string) {
	summary, exists := a.clusters[clusterID]
	if !exists {
		return
	}

	incidents := a.incidents[clusterID]

	// Reset counts
	summary.IncidentCounts = make(map[string]int)
	patternCounts := make(map[string]int)

	// Count active incidents
	activeCount := 0
	criticalCount := 0
	warningCount := 0

	for _, inc := range incidents {
		if !inc.Active {
			continue
		}
		activeCount++
		summary.IncidentCounts[inc.Severity]++
		patternCounts[inc.Pattern]++

		if inc.Severity == "critical" {
			criticalCount++
		} else if inc.Severity == "high" || inc.Severity == "warning" {
			warningCount++
		}
	}

	// Calculate top patterns
	var patterns []PatternCount
	for pattern, count := range patternCounts {
		patterns = append(patterns, PatternCount{Pattern: pattern, Count: count})
	}
	sort.Slice(patterns, func(i, j int) bool {
		return patterns[i].Count > patterns[j].Count
	})
	if len(patterns) > 5 {
		patterns = patterns[:5]
	}
	summary.TopPatterns = patterns

	// Calculate health score (simple heuristic)
	score := 1.0
	if criticalCount > 0 {
		score -= float64(criticalCount) * 0.2
	}
	if warningCount > 0 {
		score -= float64(warningCount) * 0.05
	}
	if score < 0 {
		score = 0
	}
	summary.HealthScore = score

	// Determine status
	if criticalCount > 0 {
		summary.Status = "critical"
	} else if warningCount > 0 {
		summary.Status = "warning"
	} else {
		summary.Status = "healthy"
	}

	summary.LastUpdated = time.Now()
}

// GetClusterSummary returns the summary for a specific cluster.
func (a *ClusterSummaryAggregator) GetClusterSummary(clusterID string) *ClusterSummary {
	a.mu.RLock()
	defer a.mu.RUnlock()

	if summary, exists := a.clusters[clusterID]; exists {
		// Return a copy
		copy := *summary
		return &copy
	}
	return nil
}

// GetMultiClusterSummary returns an aggregated summary across all clusters.
func (a *ClusterSummaryAggregator) GetMultiClusterSummary() *MultiClusterSummary {
	a.mu.RLock()
	defer a.mu.RUnlock()

	result := &MultiClusterSummary{
		TotalClusters:    len(a.clusters),
		ClusterSummaries: []ClusterSummary{},
		TopPatterns:      []PatternCount{},
		SeverityCounts:   make(map[string]int),
		GeneratedAt:      time.Now(),
	}

	globalPatterns := make(map[string]int)

	for _, summary := range a.clusters {
		result.ClusterSummaries = append(result.ClusterSummaries, *summary)

		// Aggregate severity counts
		for severity, count := range summary.IncidentCounts {
			result.SeverityCounts[severity] += count
			result.TotalIncidents += count
		}

		// Aggregate patterns
		for _, p := range summary.TopPatterns {
			globalPatterns[p.Pattern] += p.Count
		}
	}

	// Sort cluster summaries by status (critical first)
	sort.Slice(result.ClusterSummaries, func(i, j int) bool {
		statusOrder := map[string]int{"critical": 0, "warning": 1, "healthy": 2}
		return statusOrder[result.ClusterSummaries[i].Status] < statusOrder[result.ClusterSummaries[j].Status]
	})

	// Calculate global top patterns
	var patterns []PatternCount
	for pattern, count := range globalPatterns {
		patterns = append(patterns, PatternCount{Pattern: pattern, Count: count})
	}
	sort.Slice(patterns, func(i, j int) bool {
		return patterns[i].Count > patterns[j].Count
	})
	if len(patterns) > 10 {
		patterns = patterns[:10]
	}
	result.TopPatterns = patterns

	return result
}

// GetAllClusterIDs returns all registered cluster IDs.
func (a *ClusterSummaryAggregator) GetAllClusterIDs() []string {
	a.mu.RLock()
	defer a.mu.RUnlock()

	ids := make([]string, 0, len(a.clusters))
	for id := range a.clusters {
		ids = append(ids, id)
	}
	return ids
}

