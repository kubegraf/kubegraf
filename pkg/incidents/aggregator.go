// Copyright 2025 KubeGraf Contributors
// SPDX-License-Identifier: Apache-2.0

package incidents

import (
	"fmt"
	"sort"
	"sync"
	"time"
)

// IncidentAggregator aggregates and deduplicates incidents.
type IncidentAggregator struct {
	mu sync.RWMutex

	// incidents stores active incidents by fingerprint
	incidents map[string]*Incident

	// incidentsByID provides fast lookup by ID
	incidentsByID map[string]*Incident

	// config for aggregation behavior
	config AggregatorConfig

	// signalNormalizer for normalizing signals
	signalNormalizer *SignalNormalizer

	// symptomDetector for detecting symptoms
	symptomDetector *SymptomDetector

	// patternMatcher for matching patterns
	patternMatcher *PatternMatcher

	// diagnosisGenerator for generating diagnoses
	diagnosisGenerator *DiagnosisGenerator

	// recommendationEngine for generating recommendations
	recommendationEngine *RecommendationEngine
}

// AggregatorConfig contains configuration for the aggregator.
type AggregatorConfig struct {
	// MaxIncidents is the maximum number of incidents to track
	MaxIncidents int
	// IncidentTTL is how long to keep resolved incidents
	IncidentTTL time.Duration
	// DeduplicationWindow is the time window for deduplication
	DeduplicationWindow time.Duration
	// AutoResolveAfter is how long an incident must be quiet to auto-resolve
	AutoResolveAfter time.Duration
	// ClusterContext identifies the cluster
	ClusterContext string
}

// DefaultAggregatorConfig returns a default configuration.
func DefaultAggregatorConfig() AggregatorConfig {
	return AggregatorConfig{
		MaxIncidents:        1000,
		IncidentTTL:         24 * time.Hour,
		DeduplicationWindow: 30 * time.Minute,
		AutoResolveAfter:    1 * time.Hour,
		ClusterContext:      "",
	}
}

// NewIncidentAggregator creates a new incident aggregator.
func NewIncidentAggregator(config AggregatorConfig) *IncidentAggregator {
	return &IncidentAggregator{
		incidents:            make(map[string]*Incident),
		incidentsByID:        make(map[string]*Incident),
		config:               config,
		signalNormalizer:     NewSignalNormalizer(config.ClusterContext),
		symptomDetector:      NewSymptomDetector(),
		patternMatcher:       NewPatternMatcher(),
		diagnosisGenerator:   NewDiagnosisGenerator(),
		recommendationEngine: NewRecommendationEngine(),
	}
}

// ProcessSignals processes a batch of signals and updates incidents.
func (a *IncidentAggregator) ProcessSignals(signals []*NormalizedSignal) []*Incident {
	a.mu.Lock()
	defer a.mu.Unlock()

	var updatedIncidents []*Incident

	// Group signals by resource
	byResource := groupSignalsByResource(signals)

	for resourceKey, resourceSignals := range byResource {
		// Detect symptoms from signals
		symptoms := a.symptomDetector.DetectSymptoms(resourceSignals)
		if len(symptoms) == 0 {
			continue
		}

		// Convert symptoms to pointer slice for pattern matching
		symptomPtrs := make([]*Symptom, len(symptoms))
		for i := range symptoms {
			symptomPtrs[i] = symptoms[i]
		}

		// Match patterns
		match := a.patternMatcher.MatchBest(symptomPtrs)
		if match == nil {
			// No pattern matched, but we have symptoms - create unknown pattern incident
			match = &PatternMatch{
				Pattern:    PatternUnknown,
				Confidence: 0.5,
			}
		}

		// Get resource reference from first signal
		resource := resourceSignals[0].Resource

		// Generate fingerprint
		fingerprint := GenerateFingerprint(match.Pattern, resource, symptoms)

		// Check if we have an existing incident
		existing, exists := a.incidents[fingerprint]
		if exists && time.Since(existing.LastSeen) < a.config.DeduplicationWindow {
			// Update existing incident
			existing.IncrementOccurrences()
			existing.Signals = a.mergeSignals(existing.Signals, resourceSignals)
			existing.Symptoms = a.mergeSymptoms(existing.Symptoms, symptoms)

			// Regenerate diagnosis and recommendations with new data
			existing.Diagnosis = a.diagnosisGenerator.GenerateDiagnosis(resource, match, symptomPtrs)
			existing.Recommendations = a.recommendationEngine.GenerateRecommendations(existing)

			// Update severity based on occurrence count
			existing.Severity = CalculateSeverity(match.Pattern, symptomPtrs, existing.Occurrences)

			updatedIncidents = append(updatedIncidents, existing)
		} else {
			// Create new incident
			incident := a.createIncident(resource, match, symptoms, resourceSignals)
			a.incidents[fingerprint] = incident
			a.incidentsByID[incident.ID] = incident
			updatedIncidents = append(updatedIncidents, incident)
		}

		_ = resourceKey // Used for grouping
	}

	// Cleanup old incidents
	a.cleanup()

	return updatedIncidents
}

// createIncident creates a new incident from matched data.
func (a *IncidentAggregator) createIncident(
	resource KubeResourceRef,
	match *PatternMatch,
	symptoms []*Symptom,
	signals []*NormalizedSignal,
) *Incident {
	now := time.Now()
	fingerprint := GenerateFingerprint(match.Pattern, resource, symptoms)

	// Convert symptoms to pointer slice
	symptomPtrs := make([]*Symptom, len(symptoms))
	for i := range symptoms {
		symptomPtrs[i] = symptoms[i]
	}

	incident := &Incident{
		ID:          GenerateIncidentID(fingerprint, now),
		Fingerprint: fingerprint,
		Pattern:     match.Pattern,
		Severity:    CalculateSeverity(match.Pattern, symptomPtrs, 1),
		Status:      StatusOpen,
		Resource:    resource,
		FirstSeen:   now,
		LastSeen:    now,
		Occurrences: 1,
		Symptoms:    symptoms,
		Metadata:    make(map[string]interface{}),
		ClusterContext: a.config.ClusterContext,
	}

	// Add signals
	incident.Signals = a.categorizeSignals(signals)

	// Generate title and description
	patternMeta := GetPatternMetadata(match.Pattern)
	if patternMeta != nil {
		incident.Title = fmt.Sprintf("%s: %s", patternMeta.Name, resource.Name)
		incident.Description = patternMeta.Description
	} else {
		incident.Title = fmt.Sprintf("%s: %s", match.Pattern, resource.Name)
		incident.Description = fmt.Sprintf("Detected %s pattern on %s", match.Pattern, resource.String())
	}

	// Generate diagnosis
	incident.Diagnosis = a.diagnosisGenerator.GenerateDiagnosis(resource, match, symptomPtrs)

	// Generate recommendations
	incident.Recommendations = a.recommendationEngine.GenerateRecommendations(incident)

	// Add creation to timeline
	incident.AddTimelineEntry("created", "Incident created", map[string]interface{}{
		"pattern":    match.Pattern,
		"confidence": match.Confidence,
	})

	return incident
}

// categorizeSignals categorizes signals into the IncidentSignals structure.
func (a *IncidentAggregator) categorizeSignals(signals []*NormalizedSignal) IncidentSignals {
	result := IncidentSignals{}

	for _, signal := range signals {
		ns := *signal // Copy the signal
		switch signal.Source {
		case SourceKubeEvent:
			result.Events = append(result.Events, ns)
		case SourcePodLog:
			result.Logs = append(result.Logs, ns)
		case SourcePodStatus:
			result.Status = append(result.Status, ns)
		case SourceMetric:
			result.Metrics = append(result.Metrics, ns)
		default:
			result.Events = append(result.Events, ns)
		}
	}

	return result
}

// mergeSignals merges new signals into existing signals.
func (a *IncidentAggregator) mergeSignals(existing IncidentSignals, newSignals []*NormalizedSignal) IncidentSignals {
	categorized := a.categorizeSignals(newSignals)

	// Append new signals (with deduplication by ID)
	existing.Events = deduplicateSignals(append(existing.Events, categorized.Events...))
	existing.Logs = deduplicateSignals(append(existing.Logs, categorized.Logs...))
	existing.Status = deduplicateSignals(append(existing.Status, categorized.Status...))
	existing.Metrics = deduplicateSignals(append(existing.Metrics, categorized.Metrics...))

	// Keep only recent signals (last 100 of each type)
	if len(existing.Events) > 100 {
		existing.Events = existing.Events[len(existing.Events)-100:]
	}
	if len(existing.Logs) > 100 {
		existing.Logs = existing.Logs[len(existing.Logs)-100:]
	}
	if len(existing.Status) > 100 {
		existing.Status = existing.Status[len(existing.Status)-100:]
	}
	if len(existing.Metrics) > 100 {
		existing.Metrics = existing.Metrics[len(existing.Metrics)-100:]
	}

	return existing
}

// mergeSymptoms merges new symptoms with existing symptoms.
func (a *IncidentAggregator) mergeSymptoms(existing []*Symptom, newSymptoms []*Symptom) []*Symptom {
	// Create a map of existing symptoms by type
	symptomMap := make(map[SymptomType]*Symptom)
	for _, s := range existing {
		symptomMap[s.Type] = s
	}

	// Add or update with new symptoms
	for _, s := range newSymptoms {
		if existingSymptom, exists := symptomMap[s.Type]; exists {
			// Update with more recent data
			existingSymptom.Evidence = append(existingSymptom.Evidence, s.Evidence...)
			if s.DetectedAt.After(existingSymptom.DetectedAt) {
				existingSymptom.DetectedAt = s.DetectedAt
			}
			if s.Value > existingSymptom.Value {
				existingSymptom.Value = s.Value
			}
		} else {
			symptomMap[s.Type] = s
		}
	}

	// Convert back to slice
	result := make([]*Symptom, 0, len(symptomMap))
	for _, s := range symptomMap {
		result = append(result, s)
	}

	return result
}

// cleanup removes old incidents and enforces limits.
func (a *IncidentAggregator) cleanup() {
	now := time.Now()

	// Auto-resolve quiet incidents
	for _, incident := range a.incidents {
		if incident.IsActive() && time.Since(incident.LastSeen) > a.config.AutoResolveAfter {
			incident.UpdateStatus(StatusResolved, "Auto-resolved after no activity")
		}
	}

	// Remove expired resolved incidents
	var toDelete []string
	for fingerprint, incident := range a.incidents {
		if incident.Status == StatusResolved || incident.Status == StatusSuppressed {
			if incident.ResolvedAt != nil && now.Sub(*incident.ResolvedAt) > a.config.IncidentTTL {
				toDelete = append(toDelete, fingerprint)
			}
		}
	}

	for _, fingerprint := range toDelete {
		if incident, exists := a.incidents[fingerprint]; exists {
			delete(a.incidentsByID, incident.ID)
		}
		delete(a.incidents, fingerprint)
	}

	// Enforce max incidents limit
	if len(a.incidents) > a.config.MaxIncidents {
		// Remove oldest resolved incidents first
		a.removeOldestIncidents(len(a.incidents) - a.config.MaxIncidents)
	}
}

// removeOldestIncidents removes the oldest incidents.
func (a *IncidentAggregator) removeOldestIncidents(count int) {
	// Sort incidents by last seen time
	type incidentEntry struct {
		fingerprint string
		lastSeen    time.Time
		resolved    bool
	}

	entries := make([]incidentEntry, 0, len(a.incidents))
	for fp, inc := range a.incidents {
		entries = append(entries, incidentEntry{
			fingerprint: fp,
			lastSeen:    inc.LastSeen,
			resolved:    inc.Status == StatusResolved || inc.Status == StatusSuppressed,
		})
	}

	// Sort: resolved first, then by oldest
	sort.Slice(entries, func(i, j int) bool {
		if entries[i].resolved != entries[j].resolved {
			return entries[i].resolved // resolved incidents first
		}
		return entries[i].lastSeen.Before(entries[j].lastSeen)
	})

	// Remove oldest
	for i := 0; i < count && i < len(entries); i++ {
		if incident, exists := a.incidents[entries[i].fingerprint]; exists {
			delete(a.incidentsByID, incident.ID)
		}
		delete(a.incidents, entries[i].fingerprint)
	}
}

// GetIncident returns an incident by ID.
func (a *IncidentAggregator) GetIncident(id string) *Incident {
	a.mu.RLock()
	defer a.mu.RUnlock()
	return a.incidentsByID[id]
}

// GetAllIncidents returns all incidents.
func (a *IncidentAggregator) GetAllIncidents() []*Incident {
	a.mu.RLock()
	defer a.mu.RUnlock()

	incidents := make([]*Incident, 0, len(a.incidents))
	for _, inc := range a.incidents {
		incidents = append(incidents, inc)
	}

	// Sort by last seen (most recent first)
	sort.Slice(incidents, func(i, j int) bool {
		return incidents[i].LastSeen.After(incidents[j].LastSeen)
	})

	return incidents
}

// GetActiveIncidents returns only active incidents.
func (a *IncidentAggregator) GetActiveIncidents() []*Incident {
	a.mu.RLock()
	defer a.mu.RUnlock()

	var active []*Incident
	for _, inc := range a.incidents {
		if inc.IsActive() {
			active = append(active, inc)
		}
	}

	// Sort by severity (most severe first)
	sort.Slice(active, func(i, j int) bool {
		if active[i].Severity != active[j].Severity {
			return active[i].Severity.Weight() > active[j].Severity.Weight()
		}
		return active[i].LastSeen.After(active[j].LastSeen)
	})

	return active
}

// GetIncidentsByPattern returns incidents matching a specific pattern.
func (a *IncidentAggregator) GetIncidentsByPattern(pattern FailurePattern) []*Incident {
	a.mu.RLock()
	defer a.mu.RUnlock()

	var matched []*Incident
	for _, inc := range a.incidents {
		if inc.Pattern == pattern {
			matched = append(matched, inc)
		}
	}

	return matched
}

// GetIncidentsBySeverity returns incidents with at least the given severity.
func (a *IncidentAggregator) GetIncidentsBySeverity(minSeverity Severity) []*Incident {
	a.mu.RLock()
	defer a.mu.RUnlock()

	var matched []*Incident
	for _, inc := range a.incidents {
		if inc.Severity.Weight() >= minSeverity.Weight() {
			matched = append(matched, inc)
		}
	}

	return matched
}

// GetIncidentsByNamespace returns incidents in a specific namespace.
func (a *IncidentAggregator) GetIncidentsByNamespace(namespace string) []*Incident {
	a.mu.RLock()
	defer a.mu.RUnlock()

	var matched []*Incident
	for _, inc := range a.incidents {
		if inc.Resource.Namespace == namespace {
			matched = append(matched, inc)
		}
	}

	return matched
}

// GetSummary returns a summary of incidents by severity.
func (a *IncidentAggregator) GetSummary() IncidentSummary {
	a.mu.RLock()
	defer a.mu.RUnlock()

	summary := IncidentSummary{
		BySeverity: make(map[Severity]int),
		ByPattern:  make(map[FailurePattern]int),
		ByStatus:   make(map[IncidentStatus]int),
	}

	for _, inc := range a.incidents {
		summary.Total++
		summary.BySeverity[inc.Severity]++
		summary.ByPattern[inc.Pattern]++
		summary.ByStatus[inc.Status]++

		if inc.IsActive() {
			summary.Active++
		}
	}

	return summary
}

// UpdateIncidentStatus updates the status of an incident.
func (a *IncidentAggregator) UpdateIncidentStatus(id string, status IncidentStatus, reason string) error {
	a.mu.Lock()
	defer a.mu.Unlock()

	incident, exists := a.incidentsByID[id]
	if !exists {
		return fmt.Errorf("incident %s not found", id)
	}

	incident.UpdateStatus(status, reason)
	return nil
}

// SuppressIncident marks an incident as suppressed.
func (a *IncidentAggregator) SuppressIncident(id string, reason string) error {
	return a.UpdateIncidentStatus(id, StatusSuppressed, reason)
}

// ResolveIncident marks an incident as resolved.
func (a *IncidentAggregator) ResolveIncident(id string, resolution string) error {
	return a.UpdateIncidentStatus(id, StatusResolved, resolution)
}

// IncidentSummary provides a summary view of incidents.
type IncidentSummary struct {
	Total      int                         `json:"total"`
	Active     int                         `json:"active"`
	BySeverity map[Severity]int            `json:"bySeverity"`
	ByPattern  map[FailurePattern]int      `json:"byPattern"`
	ByStatus   map[IncidentStatus]int      `json:"byStatus"`
}

// Helper functions

func groupSignalsByResource(signals []*NormalizedSignal) map[string][]*NormalizedSignal {
	groups := make(map[string][]*NormalizedSignal)
	for _, s := range signals {
		key := s.Resource.String()
		groups[key] = append(groups[key], s)
	}
	return groups
}

func deduplicateSignals(signals []NormalizedSignal) []NormalizedSignal {
	seen := make(map[string]bool)
	var result []NormalizedSignal

	for _, s := range signals {
		if !seen[s.ID] {
			seen[s.ID] = true
			result = append(result, s)
		}
	}

	return result
}


