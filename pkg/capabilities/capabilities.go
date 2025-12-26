// Copyright 2025 KubeGraf Contributors
// SPDX-License-Identifier: Apache-2.0

package capabilities

import (
	"sync"
)

// Capabilities represents the feature flags for KubeGraf
type Capabilities struct {
	mu sync.RWMutex

	// Incident Intelligence Core (always enabled)
	IncidentDetection   bool `json:"incidentDetection"`   // Always true - core feature
	IncidentDiagnosis   bool `json:"incidentDiagnosis"`   // Always true - core feature
	IncidentSnapshot    bool `json:"incidentSnapshot"`    // Always true - core feature
	FixPreview          bool `json:"fixPreview"`          // Always true - dry-run only

	// Advanced Features (disabled by default for v1 release)
	AutoRemediation     bool `json:"autoRemediation"`     // Auto-execution of fixes
	LearningEngine      bool `json:"learningEngine"`      // Pattern clustering, trends
	SimilarIncidents    bool `json:"similarIncidents"`    // Similar incident matching
	MetricsCorrelation  bool `json:"metricsCorrelation"`  // Metrics correlation UI
	BulkFixes           bool `json:"bulkFixes"`           // Bulk fix operations
	FixApplication      bool `json:"fixApplication"`      // Applying fixes (dry-run preview only)
}

var (
	// defaultCapabilities is the default feature set for v1 release
	defaultCapabilities = Capabilities{
		// Core features - always enabled
		IncidentDetection: true,
		IncidentDiagnosis: true,
		IncidentSnapshot:  true,
		FixPreview:        true,

		// Advanced features - disabled by default for v1
		AutoRemediation:    false,
		LearningEngine:     false,
		SimilarIncidents:   false,
		MetricsCorrelation: false,
		BulkFixes:          false,
		FixApplication:     false, // Only dry-run preview, no actual application
	}

	// globalCapabilities is the global capabilities instance
	globalCapabilities = defaultCapabilities
	globalMu          sync.RWMutex
)

// GetCapabilities returns the current capabilities
func GetCapabilities() Capabilities {
	globalMu.RLock()
	defer globalMu.RUnlock()
	return globalCapabilities
}

// SetCapabilities updates the global capabilities (for testing or future configuration)
func SetCapabilities(caps Capabilities) {
	globalMu.Lock()
	defer globalMu.Unlock()
	globalCapabilities = caps
}

// ResetCapabilities resets to default v1 capabilities
func ResetCapabilities() {
	globalMu.Lock()
	defer globalMu.Unlock()
	globalCapabilities = defaultCapabilities
}

// IsAutoRemediationEnabled returns true if auto-remediation is enabled
func IsAutoRemediationEnabled() bool {
	globalMu.RLock()
	defer globalMu.RUnlock()
	return globalCapabilities.AutoRemediation
}

// IsLearningEngineEnabled returns true if learning engine is enabled
func IsLearningEngineEnabled() bool {
	globalMu.RLock()
	defer globalMu.RUnlock()
	return globalCapabilities.LearningEngine
}

// IsSimilarIncidentsEnabled returns true if similar incidents is enabled
func IsSimilarIncidentsEnabled() bool {
	globalMu.RLock()
	defer globalMu.RUnlock()
	return globalCapabilities.SimilarIncidents
}

// IsMetricsCorrelationEnabled returns true if metrics correlation is enabled
func IsMetricsCorrelationEnabled() bool {
	globalMu.RLock()
	defer globalMu.RUnlock()
	return globalCapabilities.MetricsCorrelation
}

// IsBulkFixesEnabled returns true if bulk fixes are enabled
func IsBulkFixesEnabled() bool {
	globalMu.RLock()
	defer globalMu.RUnlock()
	return globalCapabilities.BulkFixes
}

// IsFixApplicationEnabled returns true if fix application is enabled (not just preview)
func IsFixApplicationEnabled() bool {
	globalMu.RLock()
	defer globalMu.RUnlock()
	return globalCapabilities.FixApplication
}

// GetCapabilitiesJSON returns capabilities as a JSON-serializable map
func GetCapabilitiesJSON() map[string]interface{} {
	caps := GetCapabilities()
	return map[string]interface{}{
		"incidentDetection":  caps.IncidentDetection,
		"incidentDiagnosis":  caps.IncidentDiagnosis,
		"incidentSnapshot":   caps.IncidentSnapshot,
		"fixPreview":         caps.FixPreview,
		"autoRemediation":    caps.AutoRemediation,
		"learningEngine":     caps.LearningEngine,
		"similarIncidents":   caps.SimilarIncidents,
		"metricsCorrelation": caps.MetricsCorrelation,
		"bulkFixes":          caps.BulkFixes,
		"fixApplication":     caps.FixApplication,
	}
}

