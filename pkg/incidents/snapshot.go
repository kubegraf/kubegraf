// Copyright 2025 KubeGraf Contributors
// SPDX-License-Identifier: Apache-2.0

package incidents

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"time"
)

// IncidentSnapshot represents a precomputed, fast-loading snapshot of incident state
type IncidentSnapshot struct {
	// Fingerprint uniquely identifies this incident snapshot
	Fingerprint string `json:"fingerprint"`
	
	// IncidentID is the incident this snapshot belongs to
	IncidentID string `json:"incidentId"`
	
	// Pattern is the failure pattern
	Pattern FailurePattern `json:"pattern"`
	
	// Severity of the incident
	Severity Severity `json:"severity"`
	
	// Status of the incident
	Status IncidentStatus `json:"status"`
	
	// Resource is the primary affected resource
	Resource KubeResourceRef `json:"resource"`
	
	// Title is a short, descriptive title
	Title string `json:"title"`
	
	// Description provides context
	Description string `json:"description"`
	
	// Occurrences is the count of events
	Occurrences int `json:"occurrences"`
	
	// FirstSeen is when this incident was first detected
	FirstSeen time.Time `json:"firstSeen"`
	
	// LastSeen is when this incident was last seen
	LastSeen time.Time `json:"lastSeen"`
	
	// HOT EVIDENCE (precomputed, instant access)
	
	// RestartCounts by time window
	RestartCounts RestartCounts `json:"restartCounts"`
	
	// LastExitCode from container status
	LastExitCode *int32 `json:"lastExitCode,omitempty"`
	
	// LastErrorString from container status
	LastErrorString string `json:"lastErrorString,omitempty"`
	
	// ReadinessStatus indicates if resource is ready
	ReadinessStatus string `json:"readinessStatus"`
	
	// RecentChangeSummary is a one-line summary of recent changes
	RecentChangeSummary string `json:"recentChangeSummary,omitempty"`
	
	// DIAGNOSIS (precomputed)
	
	// DiagnosisSummary is a concise sentence explaining the issue
	DiagnosisSummary string `json:"diagnosisSummary"`
	
	// RootCauses are ranked by likelihood (first = primary)
	RootCauses []RootCause `json:"rootCauses"`
	
	// Confidence is the confidence score (0.0 to 1.0)
	Confidence float64 `json:"confidence"`
	
	// ConfidenceLabel is human-readable (Low/Medium/High)
	ConfidenceLabel string `json:"confidenceLabel"`
	
	// IMPACT (precomputed)
	
	// Impact describes the business impact
	Impact ImpactSummary `json:"impact"`
	
	// WHY NOW (precomputed)
	
	// WhyNowExplanation explains what changed recently
	WhyNowExplanation string `json:"whyNowExplanation"`
	
	// RECOMMENDED FIRST ACTION (precomputed)
	
	// RecommendedAction is the primary CTA
	RecommendedAction *RecommendedAction `json:"recommendedAction,omitempty"`
	
	// CachedAt is when this snapshot was generated
	CachedAt time.Time `json:"cachedAt"`
	
	// ValidUntil is when this snapshot expires (for cache invalidation)
	ValidUntil time.Time `json:"validUntil"`
}

// RestartCounts contains restart counts by time window
type RestartCounts struct {
	Last5Minutes  int `json:"last5Minutes"`
	Last1Hour     int `json:"last1Hour"`
	Last24Hours   int `json:"last24Hours"`
	Total         int `json:"total"`
}

// RootCause represents a ranked root cause
type RootCause struct {
	// Cause is the description of the cause
	Cause string `json:"cause"`
	// Likelihood is the probability (0.0 to 1.0)
	Likelihood float64 `json:"likelihood"`
	// EvidenceCount is the number of supporting evidence items
	EvidenceCount int `json:"evidenceCount"`
}

// ImpactSummary describes the business impact
type ImpactSummary struct {
	// AffectedReplicas is the number of affected replicas
	AffectedReplicas int `json:"affectedReplicas"`
	
	// ServiceExposure indicates if exposed via Service/Ingress
	ServiceExposure ServiceExposure `json:"serviceExposure"`
	
	// UserFacingLikelihood is the probability of user impact (0.0 to 1.0)
	UserFacingLikelihood float64 `json:"userFacingLikelihood"`
	
	// UserFacingLabel is human-readable (High/Medium/Low/None)
	UserFacingLabel string `json:"userFacingLabel"`
	
	// NamespaceCriticality indicates criticality level
	NamespaceCriticality string `json:"namespaceCriticality"`
}

// ServiceExposure describes service exposure
type ServiceExposure struct {
	// HasService indicates if a Service exists
	HasService bool `json:"hasService"`
	// ServiceName if exposed
	ServiceName string `json:"serviceName,omitempty"`
	// HasIngress indicates if exposed via Ingress
	HasIngress bool `json:"hasIngress"`
	// IngressNames if exposed
	IngressNames []string `json:"ingressNames,omitempty"`
}

// RecommendedAction is the primary recommended action
type RecommendedAction struct {
	// Title is the action title
	Title string `json:"title"`
	// Description explains what it does
	Description string `json:"description"`
	// Tab is which tab to open (e.g., "logs", "runbooks")
	Tab string `json:"tab"`
	// Risk is the risk level
	Risk string `json:"risk"`
}

// ComputeIncidentFingerprint computes a stable fingerprint for an incident
// Format: pattern + namespace + resource UID + container name (if pod)
func ComputeIncidentFingerprint(incident *Incident, containerName string) string {
	parts := []string{
		string(incident.Pattern),
		incident.Resource.Namespace,
		incident.Resource.UID,
	}
	
	// For pods, include container name to distinguish between containers
	if incident.Resource.Kind == "Pod" && containerName != "" {
		parts = append(parts, containerName)
	}
	
	// Compute SHA256 hash for stability
	combined := fmt.Sprintf("%s|%s|%s|%s", parts[0], parts[1], parts[2], func() string {
		if len(parts) > 3 {
			return parts[3]
		}
		return ""
	}())
	
	hash := sha256.Sum256([]byte(combined))
	return hex.EncodeToString(hash[:])[:16] // Use first 16 chars for readability
}

// ComputeConfidenceLabel converts a confidence score to a human-readable label
func ComputeConfidenceLabel(confidence float64) string {
	if confidence >= 0.8 {
		return "High"
	} else if confidence >= 0.5 {
		return "Medium"
	}
	return "Low"
}

// ComputeUserFacingLabel converts a likelihood to a human-readable label
func ComputeUserFacingLabel(likelihood float64) string {
	if likelihood >= 0.7 {
		return "High"
	} else if likelihood >= 0.3 {
		return "Medium"
	} else if likelihood > 0 {
		return "Low"
	}
	return "None"
}

// SnapshotBuilder builds incident snapshots from incidents
type SnapshotBuilder struct {
	// ConfidenceLearner for using learned weights/priors (optional)
	learner *ConfidenceLearner
	
	// Weights for confidence calculation (fallback if learner not available)
	LogWeight     float64
	EventWeight   float64
	MetricWeight  float64
	ChangeWeight  float64
	
	// Namespace criticality mapping (can be configured)
	NamespaceCriticality map[string]string
}

// NewSnapshotBuilder creates a new snapshot builder with default weights
func NewSnapshotBuilder() *SnapshotBuilder {
	return &SnapshotBuilder{
		LogWeight:    0.40,
		EventWeight:  0.30,
		MetricWeight: 0.20,
		ChangeWeight: 0.10,
		NamespaceCriticality: map[string]string{
			"kube-system":     "critical",
			"kube-public":     "low",
			"kube-node-lease": "low",
			"default":         "medium",
		},
	}
}

// SetLearner sets the confidence learner for using learned weights/priors
func (b *SnapshotBuilder) SetLearner(learner *ConfidenceLearner) {
	b.learner = learner
}

// BuildSnapshot creates a snapshot from an incident
func (b *SnapshotBuilder) BuildSnapshot(incident *Incident, hotEvidence *HotEvidence) *IncidentSnapshot {
	snapshot := &IncidentSnapshot{
		Fingerprint:         incident.Fingerprint,
		IncidentID:          incident.ID,
		Pattern:             incident.Pattern,
		Severity:            incident.Severity,
		Status:              incident.Status,
		Resource:            incident.Resource,
		Title:               incident.Title,
		Description:         incident.Description,
		Occurrences:         incident.Occurrences,
		FirstSeen:           incident.FirstSeen,
		LastSeen:            incident.LastSeen,
		RestartCounts:       hotEvidence.RestartCounts,
		LastExitCode:        hotEvidence.LastExitCode,
		LastErrorString:     hotEvidence.LastErrorString,
		ReadinessStatus:     hotEvidence.ReadinessStatus,
		RecentChangeSummary: hotEvidence.RecentChangeSummary,
		CachedAt:            time.Now(),
		ValidUntil:          time.Now().Add(5 * time.Minute), // Cache valid for 5 minutes
	}
	
	// Build diagnosis
	if incident.Diagnosis != nil {
		snapshot.DiagnosisSummary = incident.Diagnosis.Summary
		
		// Use learned confidence if learner is available, otherwise use diagnosis confidence
		if b.learner != nil {
			// Build evidence pack from incident signals for confidence computation
			evidencePack := &EvidencePack{
				Logs:         []EvidenceItem{},
				Events:       []EvidenceItem{},
				MetricsFacts: []EvidenceItem{},
				ChangeHistory: []EvidenceItem{},
			}
			// Convert log signals to evidence items
			for _, signal := range incident.Signals.Logs {
				evidencePack.Logs = append(evidencePack.Logs, EvidenceItem{
					ID:        signal.ID,
					Source:    EvidenceSourceLog,
					Type:      string(signal.Source),
					Timestamp: signal.Timestamp,
					Content:   signal.Message,
				})
			}
			// Convert event signals to evidence items
			for _, signal := range incident.Signals.Events {
				evidencePack.Events = append(evidencePack.Events, EvidenceItem{
					ID:        signal.ID,
					Source:    EvidenceSourceEvent,
					Type:      string(signal.Source),
					Timestamp: signal.Timestamp,
					Content:   signal.Message,
				})
			}
			// Convert metrics signals to evidence items
			for _, signal := range incident.Signals.Metrics {
				evidencePack.MetricsFacts = append(evidencePack.MetricsFacts, EvidenceItem{
					ID:        signal.ID,
					Source:    EvidenceSourceMetric,
					Type:      string(signal.Source),
					Timestamp: signal.Timestamp,
					Content:   signal.Message,
				})
			}
			
			// Compute confidence using learned weights (formula: score = Σ(weight_i * signal_i) + prior(cause))
			learnedConfidence := b.learner.ComputeConfidence(incident, evidencePack)
			// Use learned confidence directly (it already includes prior)
			snapshot.Confidence = learnedConfidence
		} else {
			snapshot.Confidence = incident.Diagnosis.Confidence
		}
		
		// Use learned root cause ranking if learner is available
		if b.learner != nil && len(incident.Diagnosis.ProbableCauses) > 0 {
			// Rank causes using learned priors
			rankedCauses := b.learner.RankRootCauses(incident.Diagnosis.ProbableCauses)
			snapshot.RootCauses = make([]RootCause, 0, len(rankedCauses))
			for _, rc := range rankedCauses {
				snapshot.RootCauses = append(snapshot.RootCauses, RootCause{
					Cause:         rc.Cause,
					Likelihood:    rc.Likelihood,
					EvidenceCount: len(incident.Diagnosis.Evidence),
				})
			}
		} else {
			// Fallback: Convert probable causes to root causes with hardcoded likelihood
			snapshot.RootCauses = make([]RootCause, 0, len(incident.Diagnosis.ProbableCauses))
			for i, cause := range incident.Diagnosis.ProbableCauses {
				likelihood := 1.0 - (float64(i) * 0.2) // Primary cause gets 1.0, others decrease
				if likelihood < 0.3 {
					likelihood = 0.3
				}
				snapshot.RootCauses = append(snapshot.RootCauses, RootCause{
					Cause:         cause,
					Likelihood:    likelihood,
					EvidenceCount: len(incident.Diagnosis.Evidence),
				})
			}
		}
	} else {
		// Fallback diagnosis from pattern
		snapshot.DiagnosisSummary = b.generateFallbackDiagnosis(incident)
		snapshot.Confidence = 0.5 // Medium confidence for fallback
		snapshot.RootCauses = []RootCause{
			{
				Cause:      snapshot.DiagnosisSummary,
				Likelihood: 0.5,
			},
		}
	}
	
	snapshot.ConfidenceLabel = ComputeConfidenceLabel(snapshot.Confidence)
	
	// Build impact
	snapshot.Impact = b.buildImpact(incident, hotEvidence)
	
	// Build "why now"
	snapshot.WhyNowExplanation = hotEvidence.RecentChangeSummary
	if snapshot.WhyNowExplanation == "" {
		snapshot.WhyNowExplanation = "No recent changes detected"
	}
	
	// Build recommended action
	snapshot.RecommendedAction = b.buildRecommendedAction(incident, snapshot)
	
	return snapshot
}

// HotEvidence contains precomputed hot evidence
type HotEvidence struct {
	RestartCounts       RestartCounts
	LastExitCode        *int32
	LastErrorString     string
	ReadinessStatus     string
	RecentChangeSummary string
}

// generateFallbackDiagnosis creates a diagnosis from pattern when none exists
func (b *SnapshotBuilder) generateFallbackDiagnosis(incident *Incident) string {
	switch incident.Pattern {
	case PatternRestartStorm:
		return fmt.Sprintf("%s is experiencing frequent restarts (%d times)", incident.Resource.Name, incident.Occurrences)
	case PatternCrashLoop:
		return fmt.Sprintf("%s is in a crash loop", incident.Resource.Name)
	case PatternOOMPressure:
		return fmt.Sprintf("%s is being killed due to memory pressure", incident.Resource.Name)
	case PatternLivenessFailure, PatternReadinessFailure:
		return fmt.Sprintf("%s is failing health checks", incident.Resource.Name)
	default:
		return fmt.Sprintf("%s is experiencing issues", incident.Resource.Name)
	}
}

// buildImpact calculates impact summary
func (b *SnapshotBuilder) buildImpact(incident *Incident, hotEvidence *HotEvidence) ImpactSummary {
	impact := ImpactSummary{
		AffectedReplicas: 1, // Default, can be overridden
		ServiceExposure:  ServiceExposure{},
	}
	
	// Determine namespace criticality
	impact.NamespaceCriticality = "medium"
	if crit, ok := b.NamespaceCriticality[incident.Resource.Namespace]; ok {
		impact.NamespaceCriticality = crit
	}
	
	// Calculate user-facing likelihood based on service exposure
	// This is a simplified calculation - in production, this would check Services/Ingresses
	if impact.ServiceExposure.HasIngress {
		impact.UserFacingLikelihood = 0.9
	} else if impact.ServiceExposure.HasService {
		impact.UserFacingLikelihood = 0.6
	} else {
		impact.UserFacingLikelihood = 0.2
	}
	
	impact.UserFacingLabel = ComputeUserFacingLabel(impact.UserFacingLikelihood)
	
	return impact
}

// buildRecommendedAction determines the primary recommended action
func (b *SnapshotBuilder) buildRecommendedAction(incident *Incident, snapshot *IncidentSnapshot) *RecommendedAction {
	// Primary action based on pattern
	switch incident.Pattern {
	case PatternRestartStorm, PatternCrashLoop:
		return &RecommendedAction{
			Title:       "View Logs",
			Description: "Check pod logs to identify the cause of restarts",
			Tab:         "logs",
			Risk:        "low",
		}
	case PatternOOMPressure:
		return &RecommendedAction{
			Title:       "Check Metrics",
			Description: "Review memory usage metrics",
			Tab:         "metrics",
			Risk:        "low",
		}
	case PatternLivenessFailure, PatternReadinessFailure:
		return &RecommendedAction{
			Title:       "View Runbooks",
			Description: "Review available runbooks for probe failures",
			Tab:         "runbooks",
			Risk:        "low",
		}
	default:
		// Default to evidence tab
		return &RecommendedAction{
			Title:       "View Evidence",
			Description: "Review incident evidence",
			Tab:         "evidence",
			Risk:        "low",
		}
	}
}

