// Copyright 2025 KubeGraf Contributors
// SPDX-License-Identifier: Apache-2.0

package changes

import (
	"context"
	"sort"
	"time"

	"github.com/kubegraf/kubegraf/internal/history"
)

// IncidentChangeCorrelator links Kubernetes changes to incidents by time window.
type IncidentChangeCorrelator struct {
	historyService *history.HistoryQueryService
}

// NewIncidentChangeCorrelator creates a new correlator.
func NewIncidentChangeCorrelator(historyService *history.HistoryQueryService) *IncidentChangeCorrelator {
	return &IncidentChangeCorrelator{
		historyService: historyService,
	}
}

// CorrelatedChange represents a change event correlated to an incident.
type CorrelatedChange struct {
	Change         history.ChangeEvent `json:"change"`
	RelevanceScore float64             `json:"relevanceScore"` // 0.0 - 1.0
	Relationship   string              `json:"relationship"`   // "before", "during", "after"
	TimeDelta      string              `json:"timeDelta"`      // e.g., "2m before", "during incident"
}

// CorrelationResult contains changes correlated to an incident.
type CorrelationResult struct {
	IncidentID     string             `json:"incidentId"`
	IncidentStart  time.Time          `json:"incidentStart"`
	Changes        []CorrelatedChange `json:"changes"`
	TotalChanges   int                `json:"totalChanges"`
	HighRelevance  int                `json:"highRelevance"`  // Score > 0.7
	MediumRelevance int               `json:"mediumRelevance"` // Score 0.4 - 0.7
	LowRelevance   int                `json:"lowRelevance"`   // Score < 0.4
}

// CorrelateIncidentChanges finds changes that may have caused or relate to an incident.
// It looks at changes within a time window before and after the incident started.
func (c *IncidentChangeCorrelator) CorrelateIncidentChanges(
	ctx context.Context,
	incidentID string,
	incidentStart time.Time,
	incidentNamespace string,
	incidentResource string,
	lookbackMinutes int,
) (*CorrelationResult, error) {
	if lookbackMinutes <= 0 {
		lookbackMinutes = 30 // Default 30 minute lookback
	}

	// Query changes from lookback period before incident to now
	window := history.TimeWindow{
		Since: incidentStart.Add(-time.Duration(lookbackMinutes) * time.Minute),
		Until: time.Now(),
	}

	historyResult, err := c.historyService.QueryHistory(ctx, window)
	if err != nil {
		return nil, err
	}

	// Score and correlate each change
	var correlatedChanges []CorrelatedChange
	highCount, medCount, lowCount := 0, 0, 0

	for _, change := range historyResult.ChangeEvents {
		score := c.calculateRelevanceScore(change, incidentNamespace, incidentResource, incidentStart)
		relationship, timeDelta := c.calculateRelationship(change.Timestamp, incidentStart)

		correlated := CorrelatedChange{
			Change:         change,
			RelevanceScore: score,
			Relationship:   relationship,
			TimeDelta:      timeDelta,
		}
		correlatedChanges = append(correlatedChanges, correlated)

		if score > 0.7 {
			highCount++
		} else if score >= 0.4 {
			medCount++
		} else {
			lowCount++
		}
	}

	// Sort by relevance score (highest first)
	sort.Slice(correlatedChanges, func(i, j int) bool {
		return correlatedChanges[i].RelevanceScore > correlatedChanges[j].RelevanceScore
	})

	return &CorrelationResult{
		IncidentID:      incidentID,
		IncidentStart:   incidentStart,
		Changes:         correlatedChanges,
		TotalChanges:    len(correlatedChanges),
		HighRelevance:   highCount,
		MediumRelevance: medCount,
		LowRelevance:    lowCount,
	}, nil
}

// calculateRelevanceScore computes how relevant a change is to an incident.
func (c *IncidentChangeCorrelator) calculateRelevanceScore(
	change history.ChangeEvent,
	incidentNamespace string,
	incidentResource string,
	incidentStart time.Time,
) float64 {
	score := 0.0

	// Namespace match (high relevance)
	if change.Namespace == incidentNamespace {
		score += 0.3
	}

	// Resource name match (very high relevance)
	if change.ResourceName == incidentResource {
		score += 0.4
	}

	// Timing relevance: changes just before incident are more relevant
	timeDiff := incidentStart.Sub(change.Timestamp)
	if timeDiff >= 0 && timeDiff <= 5*time.Minute {
		// Change happened 0-5 min before incident
		score += 0.2
	} else if timeDiff >= 0 && timeDiff <= 15*time.Minute {
		// Change happened 5-15 min before incident
		score += 0.1
	}

	// Severity boost
	if change.Severity == "error" {
		score += 0.1
	} else if change.Severity == "warning" {
		score += 0.05
	}

	// Type-specific boosts
	if change.Type == "deployment" {
		score += 0.05 // Deployment changes are often causal
	}

	// Cap at 1.0
	if score > 1.0 {
		score = 1.0
	}

	return score
}

// calculateRelationship determines the temporal relationship between change and incident.
func (c *IncidentChangeCorrelator) calculateRelationship(
	changeTime time.Time,
	incidentStart time.Time,
) (string, string) {
	diff := incidentStart.Sub(changeTime)

	if diff < -time.Minute {
		// Change happened after incident start
		absDiff := -diff
		return "after", formatDuration(absDiff) + " after"
	} else if diff > time.Minute {
		// Change happened before incident start
		return "before", formatDuration(diff) + " before"
	} else {
		return "during", "during incident"
	}
}

// formatDuration formats a duration into a human-readable string.
func formatDuration(d time.Duration) string {
	if d < time.Minute {
		return "<1m"
	} else if d < time.Hour {
		return time.Duration(d.Minutes()).String() + "m"
	} else if d < 24*time.Hour {
		return time.Duration(d.Hours()).String() + "h"
	}
	return time.Duration(d.Hours()/24).String() + "d"
}

