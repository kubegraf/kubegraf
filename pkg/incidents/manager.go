// Copyright 2025 KubeGraf Contributors
// SPDX-License-Identifier: Apache-2.0

package incidents

import (
	"context"
	"fmt"
	"log"
	"sync"
	"time"
)

// Manager is the central coordinator for the incident intelligence system.
type Manager struct {
	mu sync.RWMutex

	// aggregator for incident aggregation and deduplication
	aggregator *IncidentAggregator

	// signalNormalizer for normalizing signals
	signalNormalizer *SignalNormalizer

	// fixExecutor for executing fixes
	fixExecutor *FixExecutor

	// fixValidator for validating fixes
	fixValidator *FixValidator

	// config for the manager
	config ManagerConfig

	// signalChannel for receiving signals
	signalChannel chan *NormalizedSignal

	// callbacks for incident updates
	callbacks []func(*Incident)

	// running state
	running bool
	stopCh  chan struct{}
}

// ManagerConfig contains configuration for the incident manager.
type ManagerConfig struct {
	// ClusterContext identifies the cluster
	ClusterContext string
	// SignalBufferSize is the size of the signal buffer
	SignalBufferSize int
	// ProcessingInterval is how often to process buffered signals
	ProcessingInterval time.Duration
	// EnableAutoRemediation enables automatic fix application
	EnableAutoRemediation bool
	// MaxAutoRemediationsPerHour limits auto-remediation rate
	MaxAutoRemediationsPerHour int
}

// DefaultManagerConfig returns a default configuration.
func DefaultManagerConfig() ManagerConfig {
	return ManagerConfig{
		ClusterContext:             "",
		SignalBufferSize:           1000,
		ProcessingInterval:         5 * time.Second,
		EnableAutoRemediation:      false, // Disabled by default for safety
		MaxAutoRemediationsPerHour: 10,
	}
}

// NewManager creates a new incident manager.
func NewManager(config ManagerConfig) *Manager {
	aggConfig := DefaultAggregatorConfig()
	aggConfig.ClusterContext = config.ClusterContext

	return &Manager{
		aggregator:       NewIncidentAggregator(aggConfig),
		signalNormalizer: NewSignalNormalizer(config.ClusterContext),
		fixExecutor:      NewFixExecutor(nil), // Will be set by SetKubeExecutor
		fixValidator:     NewFixValidator(),
		config:           config,
		signalChannel:    make(chan *NormalizedSignal, config.SignalBufferSize),
		callbacks:        make([]func(*Incident), 0),
		stopCh:           make(chan struct{}),
	}
}

// GetClusterContext returns the current cluster context.
func (m *Manager) GetClusterContext() string {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return m.config.ClusterContext
}

// SetKubeExecutor sets the Kubernetes executor for fix operations.
func (m *Manager) SetKubeExecutor(executor KubeFixExecutor) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.fixExecutor = NewFixExecutor(executor)
}

// SetClusterContext updates the cluster context.
// Immediately clears all incidents from other clusters to prevent cross-cluster contamination.
func (m *Manager) SetClusterContext(ctx string) {
	m.mu.Lock()
	oldContext := m.config.ClusterContext
	m.config.ClusterContext = ctx
	m.signalNormalizer = NewSignalNormalizer(ctx)
	m.mu.Unlock()

	log.Printf("[Manager] Setting cluster context from '%s' to '%s'", oldContext, ctx)

	// Update aggregator cluster context and clear incidents from other clusters
	// Do this outside manager lock to avoid potential deadlock
	if ctx != "" {
		// Set the aggregator's cluster context and clear incidents from other clusters
		// This ensures new incidents get the correct context and old incidents are removed
		m.aggregator.SetCurrentClusterContext(ctx)
		clearedCount := m.aggregator.ClearIncidentsFromOtherClusters(ctx)
		log.Printf("[Manager] Cleared %d incidents from other clusters after switching to '%s'", clearedCount, ctx)
	} else {
		// Even if context is empty, update it
		m.aggregator.SetCurrentClusterContext(ctx)
	}
}

// Start starts the incident manager.
func (m *Manager) Start(ctx context.Context) {
	m.mu.Lock()
	if m.running {
		m.mu.Unlock()
		return
	}
	m.running = true
	m.mu.Unlock()

	go m.processSignals(ctx)
}

// Stop stops the incident manager.
func (m *Manager) Stop() {
	m.mu.Lock()
	defer m.mu.Unlock()

	if !m.running {
		return
	}

	close(m.stopCh)
	m.running = false
}

// processSignals processes buffered signals periodically.
func (m *Manager) processSignals(ctx context.Context) {
	ticker := time.NewTicker(m.config.ProcessingInterval)
	defer ticker.Stop()

	var buffer []*NormalizedSignal

	for {
		select {
		case <-ctx.Done():
			return
		case <-m.stopCh:
			return
		case signal := <-m.signalChannel:
			buffer = append(buffer, signal)
		case <-ticker.C:
			if len(buffer) > 0 {
				incidents := m.aggregator.ProcessSignals(buffer)
				buffer = buffer[:0] // Clear buffer

				// Notify callbacks
				m.mu.RLock()
				callbacks := make([]func(*Incident), len(m.callbacks))
				copy(callbacks, m.callbacks)
				m.mu.RUnlock()

				for _, incident := range incidents {
					for _, cb := range callbacks {
						go cb(incident)
					}
				}
			}
		}
	}
}

// IngestSignal adds a signal for processing.
func (m *Manager) IngestSignal(signal *NormalizedSignal) {
	select {
	case m.signalChannel <- signal:
		// Signal added
	default:
		// Buffer full, drop oldest by reading one
		select {
		case <-m.signalChannel:
		default:
		}
		m.signalChannel <- signal
	}
}

// IngestKubeEvent converts and ingests a Kubernetes event.
func (m *Manager) IngestKubeEvent(
	eventType string,
	reason string,
	message string,
	count int32,
	timestamp time.Time,
	involvedKind string,
	involvedName string,
	involvedNamespace string,
) {
	signal := m.signalNormalizer.NormalizeKubeEvent(
		eventType, reason, message, count, timestamp,
		involvedKind, involvedName, involvedNamespace,
	)
	m.IngestSignal(signal)
}

// IngestPodStatus converts and ingests a pod status update.
func (m *Manager) IngestPodStatus(
	podName string,
	namespace string,
	phase string,
	containerName string,
	containerState string,
	containerReason string,
	exitCode int,
	restartCount int32,
	terminatedAt *time.Time,
) {
	signal := m.signalNormalizer.NormalizePodStatus(
		podName, namespace, phase, containerName,
		containerState, containerReason, exitCode,
		restartCount, terminatedAt,
	)
	m.IngestSignal(signal)
}

// IngestLogError converts and ingests a log error.
func (m *Manager) IngestLogError(
	podName string,
	namespace string,
	containerName string,
	logLine string,
	timestamp time.Time,
	httpStatus int,
	httpMethod string,
	httpPath string,
	errorType string,
) {
	signal := m.signalNormalizer.NormalizeLogEntry(
		podName, namespace, containerName, logLine,
		timestamp, httpStatus, httpMethod, httpPath, errorType,
	)
	m.IngestSignal(signal)
}

// RegisterCallback registers a callback for incident updates.
func (m *Manager) RegisterCallback(cb func(*Incident)) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.callbacks = append(m.callbacks, cb)
}

// InjectIncident directly stores an incident, skipping the signal pipeline.
// Used for demo/seed incidents.
func (m *Manager) InjectIncident(incident *Incident) {
	m.aggregator.InjectIncident(incident)
}

// UpsertScannedIncident upserts a live-scan-detected incident by fingerprint.
// Updates LastSeen/Occurrences if already present, otherwise creates a new incident.
func (m *Manager) UpsertScannedIncident(incident *Incident) {
	m.aggregator.UpsertScannedIncident(incident)
}

// GetIncident returns an incident by ID.
func (m *Manager) GetIncident(id string) *Incident {
	return m.aggregator.GetIncident(id)
}

// GetAllIncidents returns all incidents from the current cluster context.
func (m *Manager) GetAllIncidents() []*Incident {
	all := m.aggregator.GetAllIncidents()
	m.mu.RLock()
	currentClusterContext := m.config.ClusterContext
	m.mu.RUnlock()

	// Filter by cluster context
	if currentClusterContext == "" {
		return all
	}

	var result []*Incident
	for _, inc := range all {
		// Only return incidents from current cluster (exclude incidents with empty or different cluster context)
		if inc.ClusterContext == currentClusterContext {
			result = append(result, inc)
		}
	}
	return result
}

// GetActiveIncidents returns only active incidents from the current cluster context.
func (m *Manager) GetActiveIncidents() []*Incident {
	all := m.aggregator.GetActiveIncidents()
	m.mu.RLock()
	currentClusterContext := m.config.ClusterContext
	m.mu.RUnlock()

	// Filter by cluster context
	if currentClusterContext == "" {
		return all
	}

	var result []*Incident
	for _, inc := range all {
		// Only return incidents from current cluster (exclude incidents with empty or different cluster context)
		if inc.ClusterContext == currentClusterContext {
			result = append(result, inc)
		}
	}
	return result
}

// GetIncidentsByPattern returns incidents matching a specific pattern.
func (m *Manager) GetIncidentsByPattern(pattern FailurePattern) []*Incident {
	return m.aggregator.GetIncidentsByPattern(pattern)
}

// GetIncidentsBySeverity returns incidents with at least the given severity.
func (m *Manager) GetIncidentsBySeverity(minSeverity Severity) []*Incident {
	return m.aggregator.GetIncidentsBySeverity(minSeverity)
}

// GetIncidentsByNamespace returns incidents in a specific namespace.
func (m *Manager) GetIncidentsByNamespace(namespace string) []*Incident {
	return m.aggregator.GetIncidentsByNamespace(namespace)
}

// GetSummary returns a summary of incidents.
func (m *Manager) GetSummary() IncidentSummary {
	return m.aggregator.GetSummary()
}

// RegenerateRecommendations regenerates recommendations for all incidents.
// This is useful when recommendation logic has been updated.
func (m *Manager) RegenerateRecommendations() int {
	return m.aggregator.RegenerateRecommendations()
}

// ResolveIncident marks an incident as resolved.
func (m *Manager) ResolveIncident(id string, resolution string) error {
	return m.aggregator.ResolveIncident(id, resolution)
}

// SuppressIncident marks an incident as suppressed.
func (m *Manager) SuppressIncident(id string, reason string) error {
	return m.aggregator.SuppressIncident(id, reason)
}

// AcknowledgeIncident marks an incident as being investigated.
func (m *Manager) AcknowledgeIncident(id string) error {
	return m.aggregator.UpdateIncidentStatus(id, StatusInvestigating, "Acknowledged by user")
}

// PreviewFix generates a preview for a proposed fix.
func (m *Manager) PreviewFix(ctx context.Context, incidentID string, recommendationID string) (*FixPreview, error) {
	incident := m.GetIncident(incidentID)
	if incident == nil {
		return nil, fmt.Errorf("incident %s not found", incidentID)
	}

	// Find the recommendation
	var recommendation *Recommendation
	for i := range incident.Recommendations {
		if incident.Recommendations[i].ID == recommendationID {
			recommendation = &incident.Recommendations[i]
			break
		}
	}

	if recommendation == nil {
		return nil, fmt.Errorf("recommendation %s not found in incident %s", recommendationID, incidentID)
	}

	if recommendation.ProposedFix == nil {
		return nil, fmt.Errorf("recommendation %s has no proposed fix", recommendationID)
	}

	return m.fixExecutor.Preview(ctx, recommendation.ProposedFix)
}

// DryRunFix executes a fix in dry-run mode.
func (m *Manager) DryRunFix(ctx context.Context, incidentID string, recommendationID string) (*FixResult, error) {
	incident := m.GetIncident(incidentID)
	if incident == nil {
		return nil, fmt.Errorf("incident %s not found", incidentID)
	}

	// Find the recommendation
	var recommendation *Recommendation
	for i := range incident.Recommendations {
		if incident.Recommendations[i].ID == recommendationID {
			recommendation = &incident.Recommendations[i]
			break
		}
	}

	if recommendation == nil {
		return nil, fmt.Errorf("recommendation %s not found", recommendationID)
	}

	if recommendation.ProposedFix == nil {
		return nil, fmt.Errorf("recommendation %s has no proposed fix", recommendationID)
	}

	// Validate the fix
	if err := m.fixValidator.Validate(recommendation.ProposedFix); err != nil {
		return &FixResult{
			Success: false,
			DryRun:  true,
			Error:   err.Error(),
			Message: "Fix validation failed",
		}, nil
	}

	return m.fixExecutor.DryRun(ctx, recommendation.ProposedFix)
}

// ApplyFix applies a fix for real.
func (m *Manager) ApplyFix(ctx context.Context, incidentID string, recommendationID string) (*FixResult, error) {
	incident := m.GetIncident(incidentID)
	if incident == nil {
		return nil, fmt.Errorf("incident %s not found", incidentID)
	}

	// Find the recommendation
	var recommendation *Recommendation
	for i := range incident.Recommendations {
		if incident.Recommendations[i].ID == recommendationID {
			recommendation = &incident.Recommendations[i]
			break
		}
	}

	if recommendation == nil {
		return nil, fmt.Errorf("recommendation %s not found", recommendationID)
	}

	if recommendation.ProposedFix == nil {
		return nil, fmt.Errorf("recommendation %s has no proposed fix", recommendationID)
	}

	// Validate the fix
	if err := m.fixValidator.Validate(recommendation.ProposedFix); err != nil {
		return &FixResult{
			Success: false,
			Error:   err.Error(),
			Message: "Fix validation failed",
		}, nil
	}

	// Apply the fix
	result, err := m.fixExecutor.Apply(ctx, recommendation.ProposedFix)
	if err != nil {
		return nil, err
	}

	// Record the action on the incident
	if result.Success {
		action := IncidentAction{
			ID:          fmt.Sprintf("action-%s-%d", incidentID, time.Now().Unix()),
			Type:        "remediate",
			Description: recommendation.Title,
			Status:      "completed",
			StartedAt:   time.Now(),
			Details: map[string]interface{}{
				"recommendationID": recommendationID,
				"fixType":          recommendation.ProposedFix.Type,
			},
			InitiatedBy: "user",
		}
		now := time.Now()
		action.CompletedAt = &now
		action.Result = result.Message

		m.mu.Lock()
		incident.Actions = append(incident.Actions, action)
		incident.AddTimelineEntry("fix_applied", recommendation.Title, map[string]interface{}{
			"result": result.Message,
		})

		// Update status if fix was applied
		if incident.Status == StatusOpen {
			incident.Status = StatusRemediating
		}
		m.mu.Unlock()
	}

	return result, nil
}

// IncidentFilter defines filtering options for incidents.
type IncidentFilter struct {
	Namespace  string          `json:"namespace,omitempty"`
	Pattern    FailurePattern  `json:"pattern,omitempty"`
	Severity   Severity        `json:"severity,omitempty"`
	Status     IncidentStatus  `json:"status,omitempty"`
	Since      time.Time       `json:"since,omitempty"`
	Limit      int             `json:"limit,omitempty"`
}

// FilterIncidents returns incidents matching the filter.
func (m *Manager) FilterIncidents(filter IncidentFilter) []*Incident {
	all := m.GetAllIncidents()
	var result []*Incident

	m.mu.RLock()
	currentClusterContext := m.config.ClusterContext
	m.mu.RUnlock()

	for _, inc := range all {
		// Filter by cluster context first (only return incidents from current cluster)
		// Exclude incidents with empty or different cluster context
		if inc.ClusterContext != currentClusterContext {
			continue
		}

		// Apply filters
		if filter.Namespace != "" && inc.Resource.Namespace != filter.Namespace {
			continue
		}
		if filter.Pattern != "" && inc.Pattern != filter.Pattern {
			continue
		}
		if filter.Severity != "" && inc.Severity != filter.Severity {
			continue
		}
		if filter.Status != "" && inc.Status != filter.Status {
			continue
		}
		if !filter.Since.IsZero() && inc.FirstSeen.Before(filter.Since) {
			continue
		}

		result = append(result, inc)

		if filter.Limit > 0 && len(result) >= filter.Limit {
			break
		}
	}

	return result
}

// GetPatternStats returns statistics for each failure pattern.
func (m *Manager) GetPatternStats() map[FailurePattern]PatternStats {
	all := m.GetAllIncidents()
	stats := make(map[FailurePattern]PatternStats)

	for _, inc := range all {
		s, exists := stats[inc.Pattern]
		if !exists {
			s = PatternStats{
				Pattern: inc.Pattern,
			}
		}

		s.Count++
		s.TotalOccurrences += inc.Occurrences

		if inc.IsActive() {
			s.Active++
		}

		if inc.Severity.Weight() > s.MaxSeverity.Weight() {
			s.MaxSeverity = inc.Severity
		}

		stats[inc.Pattern] = s
	}

	return stats
}

// PatternStats contains statistics for a failure pattern.
type PatternStats struct {
	Pattern          FailurePattern `json:"pattern"`
	Count            int            `json:"count"`
	Active           int            `json:"active"`
	TotalOccurrences int            `json:"totalOccurrences"`
	MaxSeverity      Severity       `json:"maxSeverity"`
}

// ExportIncidents exports incidents for external consumption.
func (m *Manager) ExportIncidents(format string) ([]byte, error) {
	incidents := m.GetAllIncidents()

	switch format {
	case "json":
		return exportToJSON(incidents)
	default:
		return nil, fmt.Errorf("unsupported export format: %s", format)
	}
}

func exportToJSON(incidents []*Incident) ([]byte, error) {
	// Simple JSON export
	// In production, use encoding/json properly
	return nil, fmt.Errorf("not implemented")
}

