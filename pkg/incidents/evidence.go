// Copyright 2025 KubeGraf Contributors
// SPDX-License-Identifier: Apache-2.0

package incidents

import (
	"fmt"
	"sort"
	"strings"
	"time"
)

// EvidencePack is a structured evidence bundle for each incident
// containing all supporting data organized by source type.
type EvidencePack struct {
	// IncidentID this evidence pack belongs to
	IncidentID string `json:"incidentId"`

	// Events contains Kubernetes events as evidence
	Events []EvidenceItem `json:"events,omitempty"`

	// Logs contains relevant log lines as evidence
	Logs []EvidenceItem `json:"logs,omitempty"`

	// StatusFacts contains facts derived from resource status
	StatusFacts []EvidenceItem `json:"statusFacts,omitempty"`

	// MetricsFacts contains facts derived from metrics
	MetricsFacts []EvidenceItem `json:"metricsFacts,omitempty"`

	// ChangeHistory contains recent changes to affected resources
	ChangeHistory []EvidenceItem `json:"changeHistory,omitempty"`

	// ProbeResults contains liveness/readiness probe results
	ProbeResults []EvidenceItem `json:"probeResults,omitempty"`

	// GeneratedAt is when this evidence pack was created
	GeneratedAt time.Time `json:"generatedAt"`

	// UpdatedAt is when this evidence pack was last updated
	UpdatedAt time.Time `json:"updatedAt"`

	// Confidence is how complete/reliable this evidence pack is (0.0-1.0)
	Confidence float64 `json:"confidence"`
}

// EvidenceItem represents a single piece of evidence
type EvidenceItem struct {
	// ID uniquely identifies this evidence item
	ID string `json:"id"`

	// Source is the origin of this evidence
	Source EvidenceSource `json:"source"`

	// Type categorizes the evidence
	Type string `json:"type"`

	// Timestamp when this evidence was collected
	Timestamp time.Time `json:"timestamp"`

	// Content is the raw evidence data
	Content string `json:"content"`

	// Summary is a human-readable summary
	Summary string `json:"summary"`

	// Severity indicates the importance of this evidence
	Severity string `json:"severity,omitempty"`

	// Resource the evidence relates to
	Resource *KubeResourceRef `json:"resource,omitempty"`

	// Metadata for additional context
	Metadata map[string]interface{} `json:"metadata,omitempty"`

	// Relevance score for this evidence (0.0-1.0)
	Relevance float64 `json:"relevance"`
}

// EvidenceSource identifies where evidence came from
type EvidenceSource string

const (
	EvidenceSourceEvent    EvidenceSource = "event"
	EvidenceSourceLog      EvidenceSource = "log"
	EvidenceSourceStatus   EvidenceSource = "status"
	EvidenceSourceMetric   EvidenceSource = "metric"
	EvidenceSourceChange   EvidenceSource = "change"
	EvidenceSourceProbe    EvidenceSource = "probe"
	EvidenceSourceDoc      EvidenceSource = "doc"
	EvidenceSourceRunbook  EvidenceSource = "runbook"
	EvidenceSourceHistory  EvidenceSource = "history"
)

// EvidencePackBuilder builds evidence packs from signals
type EvidencePackBuilder struct {
	maxEventsPerSource int
	relevanceThreshold float64
}

// NewEvidencePackBuilder creates a new evidence pack builder
func NewEvidencePackBuilder() *EvidencePackBuilder {
	return &EvidencePackBuilder{
		maxEventsPerSource: 50,
		relevanceThreshold: 0.3,
	}
}

// BuildFromIncident creates an evidence pack from an incident
func (b *EvidencePackBuilder) BuildFromIncident(incident *Incident) *EvidencePack {
	pack := &EvidencePack{
		IncidentID:  incident.ID,
		GeneratedAt: time.Now(),
		UpdatedAt:   time.Now(),
	}

	// Process signals into evidence items
	pack.Events = b.processEvents(incident.Signals.Events, incident)
	pack.Logs = b.processLogs(incident.Signals.Logs, incident)
	pack.StatusFacts = b.processStatus(incident.Signals.Status, incident)
	pack.MetricsFacts = b.processMetrics(incident.Signals.Metrics, incident)

	// Build change history from timeline
	pack.ChangeHistory = b.buildChangeHistory(incident)

	// Extract probe results from symptoms
	pack.ProbeResults = b.extractProbeResults(incident)

	// Calculate overall confidence based on evidence completeness
	pack.Confidence = b.calculateConfidence(pack)

	return pack
}

// processEvents converts event signals to evidence items
func (b *EvidencePackBuilder) processEvents(signals []NormalizedSignal, incident *Incident) []EvidenceItem {
	var items []EvidenceItem

	for i, signal := range signals {
		if i >= b.maxEventsPerSource {
			break
		}

		relevance := b.calculateSignalRelevance(signal, incident)
		if relevance < b.relevanceThreshold {
			continue
		}

		item := EvidenceItem{
			ID:        fmt.Sprintf("event-%d-%s", i, signal.ID),
			Source:    EvidenceSourceEvent,
			Type:      string(signal.Source),
			Timestamp: signal.Timestamp,
			Content:   b.formatSignalContent(signal),
			Summary:   b.generateEventSummary(signal),
			Resource:  &signal.Resource,
			Metadata:  stringMapToInterface(signal.Attributes),
			Relevance: relevance,
		}

		// Add severity from signal attributes
		if severity, ok := signal.Attributes["severity"]; ok {
			item.Severity = severity
		}

		items = append(items, item)
	}

	// Sort by relevance descending
	sort.Slice(items, func(i, j int) bool {
		return items[i].Relevance > items[j].Relevance
	})

	return items
}

// processLogs converts log signals to evidence items
func (b *EvidencePackBuilder) processLogs(signals []NormalizedSignal, incident *Incident) []EvidenceItem {
	var items []EvidenceItem

	for i, signal := range signals {
		if i >= b.maxEventsPerSource {
			break
		}

		relevance := b.calculateSignalRelevance(signal, incident)
		if relevance < b.relevanceThreshold {
			continue
		}

		item := EvidenceItem{
			ID:        fmt.Sprintf("log-%d-%s", i, signal.ID),
			Source:    EvidenceSourceLog,
			Type:      string(signal.Source),
			Timestamp: signal.Timestamp,
			Content:   b.formatLogContent(signal),
			Summary:   b.generateLogSummary(signal),
			Resource:  &signal.Resource,
			Metadata:  stringMapToInterface(signal.Attributes),
			Relevance: relevance,
		}

		// Detect error severity from log content
		item.Severity = b.detectLogSeverity(signal)

		items = append(items, item)
	}

	sort.Slice(items, func(i, j int) bool {
		return items[i].Relevance > items[j].Relevance
	})

	return items
}

// processStatus converts status signals to evidence items
func (b *EvidencePackBuilder) processStatus(signals []NormalizedSignal, incident *Incident) []EvidenceItem {
	var items []EvidenceItem

	for i, signal := range signals {
		if i >= b.maxEventsPerSource {
			break
		}

		relevance := b.calculateSignalRelevance(signal, incident)
		if relevance < b.relevanceThreshold {
			continue
		}

		item := EvidenceItem{
			ID:        fmt.Sprintf("status-%d-%s", i, signal.ID),
			Source:    EvidenceSourceStatus,
			Type:      string(signal.Source),
			Timestamp: signal.Timestamp,
			Content:   b.formatStatusContent(signal),
			Summary:   b.generateStatusSummary(signal),
			Resource:  &signal.Resource,
			Metadata:  stringMapToInterface(signal.Attributes),
			Relevance: relevance,
		}

		items = append(items, item)
	}

	return items
}

// processMetrics converts metric signals to evidence items
func (b *EvidencePackBuilder) processMetrics(signals []NormalizedSignal, incident *Incident) []EvidenceItem {
	var items []EvidenceItem

	for i, signal := range signals {
		if i >= b.maxEventsPerSource {
			break
		}

		relevance := b.calculateSignalRelevance(signal, incident)
		if relevance < b.relevanceThreshold {
			continue
		}

		item := EvidenceItem{
			ID:        fmt.Sprintf("metric-%d-%s", i, signal.ID),
			Source:    EvidenceSourceMetric,
			Type:      string(signal.Source),
			Timestamp: signal.Timestamp,
			Content:   b.formatMetricContent(signal),
			Summary:   b.generateMetricSummary(signal),
			Resource:  &signal.Resource,
			Metadata:  stringMapToInterface(signal.Attributes),
			Relevance: relevance,
		}

		items = append(items, item)
	}

	return items
}

// buildChangeHistory extracts change history from incident timeline
func (b *EvidencePackBuilder) buildChangeHistory(incident *Incident) []EvidenceItem {
	var items []EvidenceItem

	for i, entry := range incident.Timeline {
		if entry.Type == "change" || entry.Type == "deployment" || entry.Type == "rollout" {
			item := EvidenceItem{
				ID:        fmt.Sprintf("change-%d", i),
				Source:    EvidenceSourceChange,
				Type:      entry.Type,
				Timestamp: entry.Timestamp,
				Content:   entry.Description,
				Summary:   entry.Description,
				Metadata:  entry.Details,
				Relevance: 0.8,
			}
			items = append(items, item)
		}
	}

	return items
}

// extractProbeResults extracts probe-related evidence from symptoms
func (b *EvidencePackBuilder) extractProbeResults(incident *Incident) []EvidenceItem {
	var items []EvidenceItem

	for i, symptom := range incident.Symptoms {
		if strings.Contains(string(symptom.Type), "PROBE") {
			// Use severity weight as a proxy for confidence
			confidence := float64(symptom.Severity.Weight()) / 5.0
			item := EvidenceItem{
				ID:        fmt.Sprintf("probe-%d", i),
				Source:    EvidenceSourceProbe,
				Type:      string(symptom.Type),
				Timestamp: symptom.DetectedAt,
				Content:   strings.Join(symptom.Evidence, "; "),
				Summary:   fmt.Sprintf("Probe failure: %s", symptom.Type),
				Relevance: confidence,
			}
			items = append(items, item)
		}
	}

	return items
}

// calculateSignalRelevance calculates how relevant a signal is to the incident
func (b *EvidencePackBuilder) calculateSignalRelevance(signal NormalizedSignal, incident *Incident) float64 {
	relevance := 0.5 // Base relevance

	// Same resource = high relevance
	if signal.Resource.Name == incident.Resource.Name &&
		signal.Resource.Namespace == incident.Resource.Namespace {
		relevance += 0.3
	}

	// Recent signals are more relevant
	age := time.Since(signal.Timestamp)
	if age < 5*time.Minute {
		relevance += 0.2
	} else if age < 30*time.Minute {
		relevance += 0.1
	}

	// Cap at 1.0
	if relevance > 1.0 {
		relevance = 1.0
	}

	return relevance
}

// formatSignalContent formats signal content for display
func (b *EvidencePackBuilder) formatSignalContent(signal NormalizedSignal) string {
	var parts []string
	for key, value := range signal.Attributes {
		parts = append(parts, fmt.Sprintf("%s=%s", key, value))
	}
	sort.Strings(parts)
	return strings.Join(parts, ", ")
}

// formatLogContent formats log signal content
func (b *EvidencePackBuilder) formatLogContent(signal NormalizedSignal) string {
	if msg, ok := signal.Attributes["message"]; ok {
		return msg
	}
	return b.formatSignalContent(signal)
}

// formatStatusContent formats status signal content
func (b *EvidencePackBuilder) formatStatusContent(signal NormalizedSignal) string {
	if status, ok := signal.Attributes["status"]; ok {
		return status
	}
	return b.formatSignalContent(signal)
}

// formatMetricContent formats metric signal content
func (b *EvidencePackBuilder) formatMetricContent(signal NormalizedSignal) string {
	var parts []string
	if name, ok := signal.Attributes["metric_name"]; ok {
		parts = append(parts, name)
	}
	if value, ok := signal.Attributes["value"]; ok {
		parts = append(parts, fmt.Sprintf("value=%s", value))
	}
	if len(parts) == 0 {
		return b.formatSignalContent(signal)
	}
	return strings.Join(parts, " ")
}

// generateEventSummary generates a human-readable event summary
func (b *EvidencePackBuilder) generateEventSummary(signal NormalizedSignal) string {
	if reason, ok := signal.Attributes["reason"]; ok {
		if msg, ok := signal.Attributes["message"]; ok {
			return fmt.Sprintf("%s: %s", reason, msg)
		}
		return reason
	}
	return string(signal.Source)
}

// stringMapToInterface converts map[string]string to map[string]interface{}
func stringMapToInterface(m map[string]string) map[string]interface{} {
	result := make(map[string]interface{})
	for k, v := range m {
		result[k] = v
	}
	return result
}

// generateLogSummary generates a human-readable log summary
func (b *EvidencePackBuilder) generateLogSummary(signal NormalizedSignal) string {
	if msg, ok := signal.Attributes["message"]; ok {
		// Truncate long messages
		if len(msg) > 100 {
			return msg[:97] + "..."
		}
		return msg
	}
	return "Log entry"
}

// generateStatusSummary generates a human-readable status summary
func (b *EvidencePackBuilder) generateStatusSummary(signal NormalizedSignal) string {
	if status, ok := signal.Attributes["status"]; ok {
		return fmt.Sprintf("Status: %s", status)
	}
	if phase, ok := signal.Attributes["phase"]; ok {
		return fmt.Sprintf("Phase: %s", phase)
	}
	return "Status fact"
}

// generateMetricSummary generates a human-readable metric summary
func (b *EvidencePackBuilder) generateMetricSummary(signal NormalizedSignal) string {
	if name, ok := signal.Attributes["metric_name"]; ok {
		if value, ok := signal.Attributes["value"]; ok {
			return fmt.Sprintf("%s: %s", name, value)
		}
		return name
	}
	return "Metric fact"
}

// detectLogSeverity detects severity from log content
func (b *EvidencePackBuilder) detectLogSeverity(signal NormalizedSignal) string {
	content := strings.ToLower(b.formatLogContent(signal))

	if strings.Contains(content, "fatal") || strings.Contains(content, "panic") {
		return "critical"
	}
	if strings.Contains(content, "error") || strings.Contains(content, "failed") {
		return "error"
	}
	if strings.Contains(content, "warn") {
		return "warning"
	}
	return "info"
}

// calculateConfidence calculates evidence pack confidence based on completeness
func (b *EvidencePackBuilder) calculateConfidence(pack *EvidencePack) float64 {
	confidence := 0.0
	sources := 0

	if len(pack.Events) > 0 {
		confidence += 0.25
		sources++
	}
	if len(pack.Logs) > 0 {
		confidence += 0.25
		sources++
	}
	if len(pack.StatusFacts) > 0 {
		confidence += 0.2
		sources++
	}
	if len(pack.MetricsFacts) > 0 {
		confidence += 0.15
		sources++
	}
	if len(pack.ChangeHistory) > 0 {
		confidence += 0.15
		sources++
	}

	// Bonus for multiple sources
	if sources >= 3 {
		confidence = min(confidence+0.1, 1.0)
	}

	return confidence
}

// TotalItems returns the total number of evidence items
func (pack *EvidencePack) TotalItems() int {
	return len(pack.Events) + len(pack.Logs) + len(pack.StatusFacts) +
		len(pack.MetricsFacts) + len(pack.ChangeHistory) + len(pack.ProbeResults)
}

// GetAllItems returns all evidence items flattened
func (pack *EvidencePack) GetAllItems() []EvidenceItem {
	var all []EvidenceItem
	all = append(all, pack.Events...)
	all = append(all, pack.Logs...)
	all = append(all, pack.StatusFacts...)
	all = append(all, pack.MetricsFacts...)
	all = append(all, pack.ChangeHistory...)
	all = append(all, pack.ProbeResults...)
	return all
}

// GetTopEvidence returns the top N most relevant evidence items
func (pack *EvidencePack) GetTopEvidence(n int) []EvidenceItem {
	all := pack.GetAllItems()
	sort.Slice(all, func(i, j int) bool {
		return all[i].Relevance > all[j].Relevance
	})
	if len(all) <= n {
		return all
	}
	return all[:n]
}

// GetEvidenceBySource returns evidence items from a specific source
func (pack *EvidencePack) GetEvidenceBySource(source EvidenceSource) []EvidenceItem {
	switch source {
	case EvidenceSourceEvent:
		return pack.Events
	case EvidenceSourceLog:
		return pack.Logs
	case EvidenceSourceStatus:
		return pack.StatusFacts
	case EvidenceSourceMetric:
		return pack.MetricsFacts
	case EvidenceSourceChange:
		return pack.ChangeHistory
	case EvidenceSourceProbe:
		return pack.ProbeResults
	default:
		return nil
	}
}

func min(a, b float64) float64 {
	if a < b {
		return a
	}
	return b
}

