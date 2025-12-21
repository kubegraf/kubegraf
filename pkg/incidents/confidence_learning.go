// Copyright 2025 KubeGraf Contributors
// SPDX-License-Identifier: Apache-2.0

package incidents

import (
	"database/sql"
	"fmt"
	"math"
	"strings"
	"sync"
	"time"
)

// ConfidenceLearner provides on-device learning for incident confidence and root cause ranking
type ConfidenceLearner struct {
	kb *KnowledgeBank
	mu sync.RWMutex

	// Learning parameters
	learningRate float64 // Default: 0.02
	minWeight    float64 // Default: 0.05
	maxWeight    float64 // Default: 0.7
	minPrior     float64 // Default: 0.05
}

// FeatureVector represents extracted features from an incident
type FeatureVector struct {
	HasExitCodeNonzero        int     `json:"has_exit_code_nonzero"`         // 0 or 1
	OOMEventPresent           int     `json:"oom_event_present"`              // 0 or 1
	ProbeFailureEventPresent int     `json:"probe_failure_event_present"`   // 0 or 1
	ImagePullErrorPresent     int     `json:"image_pull_error_present"`       // 0 or 1
	RestartRate5m             float64 `json:"restart_rate_5m"`               // normalized
	RestartRate1h             float64 `json:"restart_rate_1h"`               // normalized
	RestartRate24h            float64 `json:"restart_rate_24h"`              // normalized
	RecentChangePresent       int     `json:"recent_change_present"`          // 0 or 1
	LogErrorSignaturePresent  int     `json:"log_error_signature_present"`   // 0 or 1
	LogErrorSignatureKey      string  `json:"log_error_signature_key"`       // short hash
	ResourcePressureHint      int     `json:"resource_pressure_hint"`        // 0 or 1
}

// IncidentOutcome represents feedback on an incident resolution
type IncidentOutcome struct {
	ID                   int64     `json:"id"`
	Fingerprint          string    `json:"fingerprint"`
	IncidentID           string    `json:"incidentId"`
	Timestamp            time.Time `json:"ts"`
	ProposedPrimaryCause string    `json:"proposedPrimaryCause"`
	ProposedConfidence   float64   `json:"proposedConfidence"`
	AppliedFixID         string    `json:"appliedFixId,omitempty"`
	AppliedFixType       string    `json:"appliedFixType,omitempty"`
	Outcome              string    `json:"outcome"` // "worked", "not_worked", "unknown"
	TimeToRecoverySec    *int      `json:"timeToRecoverySec,omitempty"`
	Notes                string    `json:"notes,omitempty"`
}

// FeatureWeight represents a feature weight for confidence scoring
type FeatureWeight struct {
	Key       string    `json:"key"`
	Weight    float64   `json:"weight"`
	UpdatedAt time.Time `json:"updatedAt"`
}

// CausePrior represents a prior probability for a root cause
type CausePrior struct {
	CauseKey   string    `json:"causeKey"`
	Prior      float64   `json:"prior"`
	UpdatedAt  time.Time `json:"updatedAt"`
}

// LearningStatus represents the current state of the learning system
type LearningStatus struct {
	FeatureWeights    []FeatureWeight `json:"featureWeights"`
	CausePriors       []CausePrior    `json:"causePriors"`
	LastUpdated       time.Time       `json:"lastUpdated"`
	SampleSize        int             `json:"sampleSize"`
	TopImprovingSignals []string      `json:"topImprovingSignals"`
}

// NewConfidenceLearner creates a new confidence learner
func NewConfidenceLearner(kb *KnowledgeBank) *ConfidenceLearner {
	return &ConfidenceLearner{
		kb:          kb,
		learningRate: 0.02,
		minWeight:   0.05,
		maxWeight:   0.7,
		minPrior:    0.05,
	}
}

// ExtractFeatures extracts a feature vector from an incident snapshot
func (cl *ConfidenceLearner) ExtractFeatures(incident *Incident, snapshot *IncidentSnapshot, evidencePack *EvidencePack) *FeatureVector {
	fv := &FeatureVector{}

	// Check for exit code
	if snapshot.LastExitCode != nil && *snapshot.LastExitCode != 0 {
		fv.HasExitCodeNonzero = 1
	}

	// Check for OOM events
	for _, event := range evidencePack.Events {
		if event.Type == "OOMKilled" || event.Summary == "OOMKilled" {
			fv.OOMEventPresent = 1
			break
		}
	}

	// Check for probe failures
	for _, event := range evidencePack.Events {
		if event.Type == "Unhealthy" || event.Summary == "Readiness probe failed" || event.Summary == "Liveness probe failed" {
			fv.ProbeFailureEventPresent = 1
			break
		}
	}

	// Check for image pull errors
	for _, event := range evidencePack.Events {
		if event.Type == "Failed" && (event.Summary == "Failed to pull image" || event.Summary == "ErrImagePull") {
			fv.ImagePullErrorPresent = 1
			break
		}
	}

	// Normalize restart rates (divide by max expected: 100 restarts)
	maxRestarts := 100.0
	fv.RestartRate5m = math.Min(float64(snapshot.RestartCounts.Last5Minutes)/maxRestarts, 1.0)
	fv.RestartRate1h = math.Min(float64(snapshot.RestartCounts.Last1Hour)/maxRestarts, 1.0)
	fv.RestartRate24h = math.Min(float64(snapshot.RestartCounts.Last24Hours)/maxRestarts, 1.0)

	// Check for recent changes (from WhyNowExplanation)
	if snapshot.WhyNowExplanation != "" && snapshot.WhyNowExplanation != "No recent changes detected." {
		fv.RecentChangePresent = 1
	}

	// Extract log error signature (simple hash of first error line)
	for _, logItem := range evidencePack.Logs {
		if logItem.Severity == "error" || logItem.Severity == "critical" {
			fv.LogErrorSignaturePresent = 1
			// Create a short signature key (first 8 chars of hash)
			fv.LogErrorSignatureKey = fmt.Sprintf("%.8s", logItem.ID)
			break
		}
	}

	// Resource pressure hint (if metrics show limits near usage)
	// Check if CPU/memory usage is > 80% of limits from metrics
	if len(evidencePack.MetricsFacts) > 0 {
		for _, metric := range evidencePack.MetricsFacts {
			// Check if metric indicates resource pressure
			// Look for patterns like "cpu usage", "memory usage", "limit", "request"
			content := strings.ToLower(metric.Content)
			summary := strings.ToLower(metric.Summary)
			
			// Check for CPU/memory pressure indicators
			hasCPU := strings.Contains(content, "cpu") || strings.Contains(summary, "cpu")
			hasMemory := strings.Contains(content, "memory") || strings.Contains(summary, "memory")
			hasUsage := strings.Contains(content, "usage") || strings.Contains(summary, "usage")
			hasLimit := strings.Contains(content, "limit") || strings.Contains(summary, "limit")
			hasRequest := strings.Contains(content, "request") || strings.Contains(summary, "request")
			hasHigh := strings.Contains(content, "high") || strings.Contains(summary, "high") ||
				strings.Contains(content, ">80") || strings.Contains(summary, ">80") ||
				strings.Contains(content, "> 80") || strings.Contains(summary, "> 80")
			
			// Check metadata for usage/limit ratios
			if metric.Metadata != nil {
				if usage, ok := metric.Metadata["usage"].(float64); ok {
					if limit, ok := metric.Metadata["limit"].(float64); ok && limit > 0 {
						if usage/limit > 0.8 {
							fv.ResourcePressureHint = 1
							break
						}
					}
				}
				if usage, ok := metric.Metadata["usage_percent"].(float64); ok {
					if usage > 80.0 {
						fv.ResourcePressureHint = 1
						break
					}
				}
			}
			
			// Heuristic: if metric mentions CPU/memory with usage/limit/request and high values
			if (hasCPU || hasMemory) && (hasUsage || hasLimit || hasRequest) && hasHigh {
				fv.ResourcePressureHint = 1
				break
			}
		}
	}

	return fv
}

// RecordOutcome records an incident outcome and updates weights/priors
// Returns a summary of what changed for UI display
func (cl *ConfidenceLearner) RecordOutcome(outcome *IncidentOutcome, incident *Incident, snapshot *IncidentSnapshot, evidencePack *EvidencePack) (string, error) {
	cl.mu.Lock()
	defer cl.mu.Unlock()

	// Store outcome in database
	if err := cl.storeOutcome(outcome); err != nil {
		return "", fmt.Errorf("failed to store outcome: %w", err)
	}

	// Update fingerprint stats
	if err := cl.updateFingerprintStats(outcome.Fingerprint, outcome.IncidentID); err != nil {
		return "", fmt.Errorf("failed to update fingerprint stats: %w", err)
	}

	// Extract features to determine which weights supported the primary cause
	var featureVector *FeatureVector
	if snapshot != nil && evidencePack != nil {
		featureVector = cl.ExtractFeatures(incident, snapshot, evidencePack)
	}

	// Update weights based on outcome (now with feature tracking)
	weightChanges, err := cl.updateWeightsFromOutcomeWithFeatures(outcome, featureVector, evidencePack)
	if err != nil {
		return "", fmt.Errorf("failed to update weights: %w", err)
	}

	// Update cause priors based on outcome
	priorChange, err := cl.updateCausePriorsFromOutcome(outcome)
	if err != nil {
		return "", fmt.Errorf("failed to update priors: %w", err)
	}

	// Generate explanation
	explanation := cl.generateChangeExplanation(outcome, weightChanges, priorChange)
	
	return explanation, nil
}

// storeOutcome stores an outcome in the database
func (cl *ConfidenceLearner) storeOutcome(outcome *IncidentOutcome) error {
	query := `
		INSERT INTO incident_outcomes (
			fingerprint, incident_id, ts, proposed_primary_cause, proposed_confidence,
			applied_fix_id, applied_fix_type, outcome, time_to_recovery_sec, notes
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`

	var ttrSec *int
	if outcome.TimeToRecoverySec != nil {
		ttrSec = outcome.TimeToRecoverySec
	}

	_, err := cl.kb.db.Exec(query,
		outcome.Fingerprint,
		outcome.IncidentID,
		outcome.Timestamp.Unix(),
		outcome.ProposedPrimaryCause,
		outcome.ProposedConfidence,
		outcome.AppliedFixID,
		outcome.AppliedFixType,
		outcome.Outcome,
		ttrSec,
		outcome.Notes,
	)

	return err
}

// updateFingerprintStats updates fingerprint statistics
func (cl *ConfidenceLearner) updateFingerprintStats(fingerprint, incidentID string) error {
	// Get incident to extract pattern, namespace, resource_kind, container
	incident, err := cl.kb.GetIncident(incidentID)
	if err != nil || incident == nil {
		// If incident not found, use defaults
		query := `
			INSERT INTO incident_fingerprint_stats (fingerprint, pattern, namespace, resource_kind, container, seen_count, last_seen_ts)
			VALUES (?, ?, ?, ?, ?, 1, ?)
			ON CONFLICT(fingerprint) DO UPDATE SET
				seen_count = seen_count + 1,
				last_seen_ts = ?
		`
		now := time.Now().Unix()
		_, err = cl.kb.db.Exec(query, fingerprint, "UNKNOWN", "default", "Pod", "", 1, now, now)
		return err
	}

	container := ""
	if incident.Resource.Kind == "Pod" {
		// Extract container name from metadata if available
		if metadata, ok := incident.Metadata["container"].(string); ok {
			container = metadata
		}
	}

	query := `
		INSERT INTO incident_fingerprint_stats (fingerprint, pattern, namespace, resource_kind, container, seen_count, last_seen_ts)
		VALUES (?, ?, ?, ?, ?, 1, ?)
		ON CONFLICT(fingerprint) DO UPDATE SET
			seen_count = seen_count + 1,
			last_seen_ts = ?
	`

	now := time.Now().Unix()
	_, err = cl.kb.db.Exec(query,
		fingerprint,
		string(incident.Pattern),
		incident.Resource.Namespace,
		incident.Resource.Kind,
		container,
		1,
		now,
		now,
	)

	return err
}

// updateWeightsFromOutcomeWithFeatures updates feature weights based on outcome and which features were present
// Returns a map of weight changes for explanation
func (cl *ConfidenceLearner) updateWeightsFromOutcomeWithFeatures(outcome *IncidentOutcome, featureVector *FeatureVector, evidencePack *EvidencePack) (map[string]float64, error) {
	// Get current weights
	weights, err := cl.getFeatureWeights()
	if err != nil {
		return nil, err
	}

	// Determine delta based on outcome
	delta := 0.0
	if outcome.Outcome == "worked" {
		delta = cl.learningRate
	} else if outcome.Outcome == "not_worked" {
		delta = -cl.learningRate
	} else {
		// "unknown" - no update
		return nil, nil
	}

	weightChanges := make(map[string]float64)

	// Determine which weights supported the primary cause based on available evidence
	// Update only weights for signals that were present
	signalsPresent := make(map[string]bool)
	
	if evidencePack != nil {
		if len(evidencePack.Logs) > 0 {
			signalsPresent["signal.logs"] = true
		}
		if len(evidencePack.Events) > 0 {
			signalsPresent["signal.events"] = true
		}
		if len(evidencePack.MetricsFacts) > 0 {
			signalsPresent["signal.metrics"] = true
		}
		if len(evidencePack.ChangeHistory) > 0 {
			signalsPresent["signal.changes"] = true
		}
	}

	// If no evidence pack, update all weights (fallback)
	if len(signalsPresent) == 0 {
		signalsPresent["signal.logs"] = true
		signalsPresent["signal.events"] = true
		signalsPresent["signal.metrics"] = true
		signalsPresent["signal.changes"] = true
	}

	// Update only weights for signals that were present
	for key, weight := range weights {
		if signalsPresent[key] {
			oldWeight := weight
			newWeight := weight + delta
			// Clamp to [minWeight, maxWeight]
			newWeight = math.Max(cl.minWeight, math.Min(cl.maxWeight, newWeight))

			// Only update if changed
			if math.Abs(newWeight-oldWeight) > 0.001 {
				if err := cl.setFeatureWeight(key, newWeight); err != nil {
					return nil, err
				}
				weightChanges[key] = newWeight - oldWeight
			}
		}
	}

	return weightChanges, nil
}

// updateWeightsFromOutcome updates feature weights based on outcome (legacy, kept for compatibility)
func (cl *ConfidenceLearner) updateWeightsFromOutcome(outcome *IncidentOutcome) error {
	_, err := cl.updateWeightsFromOutcomeWithFeatures(outcome, nil, nil)
	return err
}

// updateCausePriorsFromOutcome updates cause priors based on outcome
// Returns the prior change for explanation
func (cl *ConfidenceLearner) updateCausePriorsFromOutcome(outcome *IncidentOutcome) (float64, error) {
	if outcome.ProposedPrimaryCause == "" {
		return 0, nil
	}

	// Map proposed cause to cause key
	causeKey := fmt.Sprintf("cause.%s", outcome.ProposedPrimaryCause)

	// Get current prior
	prior, err := cl.getCausePrior(causeKey)
	if err != nil {
		// If doesn't exist, create with default
		prior = 0.25
	}

	// Update based on outcome
	delta := 0.0
	if outcome.Outcome == "worked" {
		delta = cl.learningRate * 0.5 // Smaller delta for priors
	} else if outcome.Outcome == "not_worked" {
		delta = -cl.learningRate * 0.5
	} else {
		return 0, nil
	}

	oldPrior := prior
	newPrior := prior + delta
	// Clamp to [minPrior, 0.95]
	newPrior = math.Max(cl.minPrior, math.Min(0.95, newPrior))

	if err := cl.setCausePrior(causeKey, newPrior); err != nil {
		return 0, err
	}

	return newPrior - oldPrior, nil
}

// generateChangeExplanation generates a 1-line explanation of what changed
func (cl *ConfidenceLearner) generateChangeExplanation(outcome *IncidentOutcome, weightChanges map[string]float64, priorChange float64) string {
	if len(weightChanges) == 0 && priorChange == 0 {
		return "No changes made (outcome was 'unknown')"
	}

	parts := []string{}
	
	// Describe weight changes
	if len(weightChanges) > 0 {
		changedSignals := []string{}
		for signal, change := range weightChanges {
			if math.Abs(change) > 0.001 {
				direction := "increased"
				if change < 0 {
					direction = "decreased"
				}
				// Extract signal name (e.g., "signal.logs" -> "logs")
				signalName := strings.TrimPrefix(signal, "signal.")
				changedSignals = append(changedSignals, fmt.Sprintf("%s %s", signalName, direction))
			}
		}
		if len(changedSignals) > 0 {
			parts = append(parts, fmt.Sprintf("weights: %s", strings.Join(changedSignals, ", ")))
		}
	}

	// Describe prior change
	if math.Abs(priorChange) > 0.001 && outcome.ProposedPrimaryCause != "" {
		direction := "increased"
		if priorChange < 0 {
			direction = "decreased"
		}
		// Clean up cause name for display
		causeName := strings.TrimPrefix(outcome.ProposedPrimaryCause, "cause.")
		causeName = strings.ReplaceAll(causeName, "_", " ")
		parts = append(parts, fmt.Sprintf("'%s' prior %s", causeName, direction))
	}

	if len(parts) == 0 {
		return "Learning updated based on feedback"
	}

	return fmt.Sprintf("Learning updated: %s", strings.Join(parts, "; "))
}

// getFeatureWeights retrieves all feature weights
func (cl *ConfidenceLearner) getFeatureWeights() (map[string]float64, error) {
	query := `SELECT key, weight FROM feature_weights`
	rows, err := cl.kb.db.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	weights := make(map[string]float64)
	for rows.Next() {
		var key string
		var weight float64
		if err := rows.Scan(&key, &weight); err != nil {
			return nil, err
		}
		weights[key] = weight
	}

	return weights, rows.Err()
}

// setFeatureWeight sets a feature weight
func (cl *ConfidenceLearner) setFeatureWeight(key string, weight float64) error {
	query := `
		INSERT INTO feature_weights (key, weight, updated_ts)
		VALUES (?, ?, ?)
		ON CONFLICT(key) DO UPDATE SET
			weight = ?,
			updated_ts = ?
	`

	now := time.Now().Unix()
	_, err := cl.kb.db.Exec(query, key, weight, now, weight, now)
	return err
}

// getCausePrior retrieves a cause prior
func (cl *ConfidenceLearner) getCausePrior(causeKey string) (float64, error) {
	query := `SELECT prior FROM cause_priors WHERE cause_key = ?`
	var prior float64
	err := cl.kb.db.QueryRow(query, causeKey).Scan(&prior)
	if err == sql.ErrNoRows {
		return 0.25, nil // Default prior
	}
	return prior, err
}

// setCausePrior sets a cause prior
func (cl *ConfidenceLearner) setCausePrior(causeKey string, prior float64) error {
	query := `
		INSERT INTO cause_priors (cause_key, prior, updated_ts)
		VALUES (?, ?, ?)
		ON CONFLICT(cause_key) DO UPDATE SET
			prior = ?,
			updated_ts = ?
	`

	now := time.Now().Unix()
	_, err := cl.kb.db.Exec(query, causeKey, prior, now, prior, now)
	return err
}

// GetLearningStatus returns the current learning status
func (cl *ConfidenceLearner) GetLearningStatus() (*LearningStatus, error) {
	cl.mu.RLock()
	defer cl.mu.RUnlock()

	status := &LearningStatus{}

	// Get feature weights
	weights, err := cl.getFeatureWeights()
	if err != nil {
		return nil, err
	}

	for key, weight := range weights {
		status.FeatureWeights = append(status.FeatureWeights, FeatureWeight{
			Key:       key,
			Weight:    weight,
			UpdatedAt: time.Now(), // Would need to fetch from DB in full implementation
		})
	}

	// Get cause priors
	query := `SELECT cause_key, prior, updated_ts FROM cause_priors`
	rows, err := cl.kb.db.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		var cp CausePrior
		var updatedTs int64
		if err := rows.Scan(&cp.CauseKey, &cp.Prior, &updatedTs); err != nil {
			continue
		}
		cp.UpdatedAt = time.Unix(updatedTs, 0)
		status.CausePriors = append(status.CausePriors, cp)
	}

	// Get sample size (count of outcomes)
	query = `SELECT COUNT(*) FROM incident_outcomes`
	err = cl.kb.db.QueryRow(query).Scan(&status.SampleSize)
	if err != nil {
		status.SampleSize = 0
	}

	// Get last updated (most recent outcome)
	query = `SELECT MAX(ts) FROM incident_outcomes`
	var lastTs sql.NullInt64
	err = cl.kb.db.QueryRow(query).Scan(&lastTs)
	if err == nil && lastTs.Valid {
		status.LastUpdated = time.Unix(lastTs.Int64, 0)
	} else {
		status.LastUpdated = time.Now()
	}

	// Top improving signals (simplified - would need trend analysis)
	status.TopImprovingSignals = []string{"signal.logs", "signal.events"}

	return status, nil
}

// ResetLearning resets weights and priors to defaults
func (cl *ConfidenceLearner) ResetLearning() error {
	cl.mu.Lock()
	defer cl.mu.Unlock()

	// Reset weights to defaults
	defaultWeights := map[string]float64{
		"signal.logs":    0.4,
		"signal.events":  0.3,
		"signal.metrics": 0.2,
		"signal.changes": 0.1,
	}

	for key, weight := range defaultWeights {
		if err := cl.setFeatureWeight(key, weight); err != nil {
			return err
		}
	}

	// Reset priors to defaults
	defaultPriors := map[string]float64{
		"cause.app_crash":     0.25,
		"cause.oom":           0.25,
		"cause.probe_failure": 0.25,
		"cause.image_pull":    0.25,
	}

	for key, prior := range defaultPriors {
		if err := cl.setCausePrior(key, prior); err != nil {
			return err
		}
	}

	return nil
}

// ComputeConfidence computes confidence score using current weights
func (cl *ConfidenceLearner) ComputeConfidence(incident *Incident, evidencePack *EvidencePack) float64 {
	weights, err := cl.getFeatureWeights()
	if err != nil {
		// Fallback to defaults
		weights = map[string]float64{
			"signal.logs":    0.4,
			"signal.events":  0.3,
			"signal.metrics": 0.2,
			"signal.changes": 0.1,
		}
	}

	score := 0.0
	totalWeight := 0.0

	// Logs weight
	if len(evidencePack.Logs) > 0 {
		score += weights["signal.logs"]
		totalWeight += weights["signal.logs"]
	}

	// Events weight
	if len(evidencePack.Events) > 0 {
		score += weights["signal.events"]
		totalWeight += weights["signal.events"]
	}

	// Metrics weight
	if len(evidencePack.MetricsFacts) > 0 {
		score += weights["signal.metrics"]
		totalWeight += weights["signal.metrics"]
	}

	// Changes weight
	if len(evidencePack.ChangeHistory) > 0 {
		score += weights["signal.changes"]
		totalWeight += weights["signal.changes"]
	}

	if totalWeight == 0 {
		return 0.5 // Default confidence
	}

	baseScore := score / totalWeight

	// Add prior for primary cause if available (as per spec: score = Σ(weight_i * signal_i) + prior(cause))
	if incident.Diagnosis != nil && len(incident.Diagnosis.ProbableCauses) > 0 {
		primaryCause := incident.Diagnosis.ProbableCauses[0]
		causeKey := fmt.Sprintf("cause.%s", primaryCause)
		prior, err := cl.getCausePrior(causeKey)
		if err == nil {
			// Add prior to base score (clamp to [0, 1])
			baseScore = math.Max(0.0, math.Min(1.0, baseScore+prior))
		}
	}

	return baseScore
}

// RankRootCauses ranks root causes using current priors
func (cl *ConfidenceLearner) RankRootCauses(causes []string) []RootCause {
	ranked := make([]RootCause, 0, len(causes))

	for _, cause := range causes {
		causeKey := fmt.Sprintf("cause.%s", cause)
		prior, err := cl.getCausePrior(causeKey)
		if err != nil {
			prior = 0.25 // Default
		}

		ranked = append(ranked, RootCause{
			Cause:         cause,
			Likelihood:    prior,
			EvidenceCount: 1, // Default evidence count
		})
	}

	// Sort by likelihood (descending)
	for i := 0; i < len(ranked)-1; i++ {
		for j := i + 1; j < len(ranked); j++ {
			if ranked[i].Likelihood < ranked[j].Likelihood {
				ranked[i], ranked[j] = ranked[j], ranked[i]
			}
		}
	}

	return ranked
}


