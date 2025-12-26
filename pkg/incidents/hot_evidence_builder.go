// Copyright 2025 KubeGraf Contributors
// SPDX-License-Identifier: Apache-2.0

package incidents

import (
	"fmt"
	"time"
)

// HotEvidenceBuilder builds hot evidence from incident signals and resource status
type HotEvidenceBuilder struct{}

// NewHotEvidenceBuilder creates a new hot evidence builder
func NewHotEvidenceBuilder() *HotEvidenceBuilder {
	return &HotEvidenceBuilder{}
}

// BuildHotEvidence builds hot evidence from an incident
// This extracts only fast-to-compute, essential information
func (b *HotEvidenceBuilder) BuildHotEvidence(incident *Incident) *HotEvidence {
	evidence := &HotEvidence{
		RestartCounts: b.buildRestartCounts(incident),
	}
	
	// Extract last exit code and error from signals
	b.extractContainerStatus(incident, evidence)
	
	// Extract readiness status
	evidence.ReadinessStatus = b.extractReadinessStatus(incident)
	
	// Extract recent change summary (if available)
	evidence.RecentChangeSummary = b.extractRecentChangeSummary(incident)
	
	return evidence
}

// buildRestartCounts calculates restart counts by time window
func (b *HotEvidenceBuilder) buildRestartCounts(incident *Incident) RestartCounts {
	now := time.Now()
	fiveMinutesAgo := now.Add(-5 * time.Minute)
	oneHourAgo := now.Add(-1 * time.Hour)
	oneDayAgo := now.Add(-24 * time.Hour)
	
	counts := RestartCounts{
		Total: incident.Occurrences,
	}
	
	// Count restarts by time window from signals
	// For now, we approximate based on LastSeen - this can be enhanced
	// to parse actual restart timestamps from signals
	if incident.LastSeen.After(fiveMinutesAgo) {
		// If last seen in last 5 minutes, estimate based on frequency
		timeSinceFirst := now.Sub(incident.FirstSeen)
		if timeSinceFirst < 5*time.Minute {
			counts.Last5Minutes = incident.Occurrences
		} else {
			// Estimate: assume uniform distribution
			rate := float64(incident.Occurrences) / timeSinceFirst.Seconds()
			counts.Last5Minutes = int(rate * 300) // 5 minutes = 300 seconds
		}
	}
	
	if incident.LastSeen.After(oneHourAgo) {
		timeSinceFirst := now.Sub(incident.FirstSeen)
		if timeSinceFirst < 1*time.Hour {
			counts.Last1Hour = incident.Occurrences
		} else {
			rate := float64(incident.Occurrences) / timeSinceFirst.Seconds()
			counts.Last1Hour = int(rate * 3600) // 1 hour = 3600 seconds
		}
	}
	
	if incident.LastSeen.After(oneDayAgo) {
		timeSinceFirst := now.Sub(incident.FirstSeen)
		if timeSinceFirst < 24*time.Hour {
			counts.Last24Hours = incident.Occurrences
		} else {
			counts.Last24Hours = incident.Occurrences // Use total for 24h if longer
		}
	}
	
	return counts
}

// extractContainerStatus extracts last exit code and error from signals
func (b *HotEvidenceBuilder) extractContainerStatus(incident *Incident, evidence *HotEvidence) {
	// Look through status signals for exit codes and errors
	// Attributes is map[string]string, so no type assertion needed
	for _, signal := range incident.Signals.Status {
		if exitCodeStr, ok := signal.Attributes["exitCode"]; ok {
			if code, err := parseInt32(exitCodeStr); err == nil {
				evidence.LastExitCode = &code
			}
		}
		if errStr, ok := signal.Attributes["error"]; ok {
			evidence.LastErrorString = errStr
		}
		if reasonStr, ok := signal.Attributes["reason"]; ok {
			if evidence.LastErrorString == "" {
				evidence.LastErrorString = reasonStr
			}
		}
	}
}

// parseInt32 parses a string to int32
func parseInt32(s string) (int32, error) {
	var result int32
	_, err := fmt.Sscanf(s, "%d", &result)
	return result, err
}

// extractReadinessStatus extracts readiness status from signals
func (b *HotEvidenceBuilder) extractReadinessStatus(incident *Incident) string {
	// Look for readiness status in signals
	for _, signal := range incident.Signals.Status {
		if readyStr, ok := signal.Attributes["ready"]; ok {
			if readyStr == "true" || readyStr == "True" {
				return "Ready"
			}
			return "Not Ready"
		}
	}
	
	// Default based on pattern
	switch incident.Pattern {
	case PatternLivenessFailure, PatternReadinessFailure:
		return "Not Ready"
	default:
		return "Unknown"
	}
}

// extractRecentChangeSummary extracts a one-line summary of recent changes
func (b *HotEvidenceBuilder) extractRecentChangeSummary(incident *Incident) string {
	// Look for change signals in the timeline
	if len(incident.Timeline) > 0 {
		// Get the most recent change entry
		for i := len(incident.Timeline) - 1; i >= 0; i-- {
			entry := incident.Timeline[i]
			if entry.Type == "change" || entry.Type == "deployment" || entry.Type == "rollout" {
				return entry.Description
			}
		}
	}
	
	return ""
}

