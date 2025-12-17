// Copyright 2025 KubeGraf Contributors
// SPDX-License-Identifier: Apache-2.0

package incidents

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"time"
)

// Severity represents the severity level of an incident.
type Severity string

const (
	SeverityCritical Severity = "critical"
	SeverityHigh     Severity = "high"
	SeverityMedium   Severity = "medium"
	SeverityLow      Severity = "low"
	SeverityInfo     Severity = "info"
)

// Weight returns a numeric weight for severity comparison (higher = more severe).
func (s Severity) Weight() int {
	switch s {
	case SeverityCritical:
		return 5
	case SeverityHigh:
		return 4
	case SeverityMedium:
		return 3
	case SeverityLow:
		return 2
	case SeverityInfo:
		return 1
	default:
		return 0
	}
}

// KubeResourceRef identifies a Kubernetes resource.
type KubeResourceRef struct {
	Kind       string `json:"kind"`
	Name       string `json:"name"`
	Namespace  string `json:"namespace"`
	APIVersion string `json:"apiVersion,omitempty"`
	UID        string `json:"uid,omitempty"`
}

// String returns a human-readable string representation.
func (r KubeResourceRef) String() string {
	if r.Namespace != "" {
		return fmt.Sprintf("%s/%s/%s", r.Namespace, r.Kind, r.Name)
	}
	return fmt.Sprintf("%s/%s", r.Kind, r.Name)
}

// IncidentSignals contains all signals that contributed to an incident.
type IncidentSignals struct {
	// Events from Kubernetes event API
	Events []NormalizedSignal `json:"events,omitempty"`
	// Logs extracted from pod logs
	Logs []NormalizedSignal `json:"logs,omitempty"`
	// Status signals from pod/container status
	Status []NormalizedSignal `json:"status,omitempty"`
	// Metrics signals if available
	Metrics []NormalizedSignal `json:"metrics,omitempty"`
}

// AllSignals returns all signals flattened into a single slice.
func (s *IncidentSignals) AllSignals() []NormalizedSignal {
	var all []NormalizedSignal
	all = append(all, s.Events...)
	all = append(all, s.Logs...)
	all = append(all, s.Status...)
	all = append(all, s.Metrics...)
	return all
}

// Count returns the total number of signals.
func (s *IncidentSignals) Count() int {
	return len(s.Events) + len(s.Logs) + len(s.Status) + len(s.Metrics)
}

// Diagnosis contains the analysis of an incident's root cause.
type Diagnosis struct {
	// Summary is a concise, human-readable summary of the diagnosis
	Summary string `json:"summary"`
	// ProbableCauses are the identified causes in order of likelihood
	ProbableCauses []string `json:"probableCauses"`
	// Confidence is the confidence score (0.0 to 1.0)
	Confidence float64 `json:"confidence"`
	// Evidence contains supporting evidence for the diagnosis
	Evidence []string `json:"evidence"`
	// GeneratedAt is when the diagnosis was generated
	GeneratedAt time.Time `json:"generatedAt"`
}

// Recommendation represents a suggested action to resolve an incident.
type Recommendation struct {
	// ID uniquely identifies this recommendation
	ID string `json:"id"`
	// Title is a short title for the recommendation
	Title string `json:"title"`
	// Explanation describes why this recommendation is relevant
	Explanation string `json:"explanation"`
	// Evidence supporting this recommendation
	Evidence []string `json:"evidence"`
	// Risk level of applying this recommendation
	Risk RecommendationRisk `json:"risk"`
	// Priority of this recommendation (lower = higher priority)
	Priority int `json:"priority"`
	// ProposedFix contains the fix details if applicable
	ProposedFix *ProposedFix `json:"proposedFix,omitempty"`
	// Action is a clickable action button for the UI
	Action *FixAction `json:"action,omitempty"`
	// ManualSteps for recommendations that cannot be automated
	ManualSteps []string `json:"manualSteps,omitempty"`
	// Tags for categorization
	Tags []string `json:"tags,omitempty"`
}

// RecommendationRisk represents the risk level of a recommendation.
type RecommendationRisk string

const (
	RiskLow    RecommendationRisk = "low"
	RiskMedium RecommendationRisk = "medium"
	RiskHigh   RecommendationRisk = "high"
)

// ProposedFix represents an automated fix that can be previewed and applied.
type ProposedFix struct {
	// Type of fix operation
	Type FixType `json:"type"`
	// Description of what the fix will do
	Description string `json:"description"`
	// PreviewDiff shows what will change (in unified diff format)
	PreviewDiff string `json:"previewDiff,omitempty"`
	// DryRunCmd is the kubectl command for dry-run
	DryRunCmd string `json:"dryRunCmd,omitempty"`
	// ApplyCmd is the kubectl command to apply the fix
	ApplyCmd string `json:"applyCmd,omitempty"`
	// TargetResource is the resource that will be modified
	TargetResource KubeResourceRef `json:"targetResource"`
	// Changes describes the specific changes to be made
	Changes []FixChange `json:"changes,omitempty"`
	// RollbackInfo contains information for rolling back if needed
	RollbackInfo *RollbackInfo `json:"rollbackInfo,omitempty"`
	// Safe indicates if this fix is considered safe for the environment
	Safe bool `json:"safe"`
	// RequiresConfirmation indicates if user must explicitly confirm
	RequiresConfirmation bool `json:"requiresConfirmation"`
}

// FixType represents the type of fix operation.
type FixType string

const (
	FixTypePatch    FixType = "PATCH"
	FixTypeScale    FixType = "SCALE"
	FixTypeRestart  FixType = "RESTART"
	FixTypeRollback FixType = "ROLLBACK"
	FixTypeDelete   FixType = "DELETE"
	FixTypeCreate   FixType = "CREATE"
)

// FixChange describes a specific change within a fix.
type FixChange struct {
	// Path is the JSON path of the change (e.g., "spec.replicas")
	Path string `json:"path"`
	// OldValue is the current value
	OldValue interface{} `json:"oldValue,omitempty"`
	// NewValue is the proposed new value
	NewValue interface{} `json:"newValue"`
	// Description explains the change
	Description string `json:"description"`
}

// RollbackInfo contains information for rolling back a fix.
type RollbackInfo struct {
	// CanRollback indicates if rollback is supported
	CanRollback bool `json:"canRollback"`
	// RollbackCmd is the command to rollback
	RollbackCmd string `json:"rollbackCmd,omitempty"`
	// OriginalState stores the original state for rollback
	OriginalState map[string]interface{} `json:"originalState,omitempty"`
}

// IncidentStatus represents the current status of an incident.
type IncidentStatus string

const (
	StatusOpen          IncidentStatus = "open"
	StatusInvestigating IncidentStatus = "investigating"
	StatusRemediating   IncidentStatus = "remediating"
	StatusResolved      IncidentStatus = "resolved"
	StatusSuppressed    IncidentStatus = "suppressed"
)

// Incident represents a detected failure incident with full context.
type Incident struct {
	// ID is a unique identifier for this incident
	ID string `json:"id"`
	// Fingerprint is used for deduplication
	Fingerprint string `json:"fingerprint"`
	// Pattern is the classified failure pattern
	Pattern FailurePattern `json:"pattern"`
	// Severity of the incident
	Severity Severity `json:"severity"`
	// Status of the incident
	Status IncidentStatus `json:"status"`
	// Resource is the primary affected resource
	Resource KubeResourceRef `json:"resource"`
	// RelatedResources are other affected resources
	RelatedResources []KubeResourceRef `json:"relatedResources,omitempty"`

	// Title is a short, descriptive title
	Title string `json:"title"`
	// Description provides more context
	Description string `json:"description"`

	// Occurrences is the count of deduplicated events
	Occurrences int `json:"occurrences"`
	// FirstSeen is when this incident was first detected
	FirstSeen time.Time `json:"firstSeen"`
	// LastSeen is when this incident was last seen
	LastSeen time.Time `json:"lastSeen"`

	// Signals contains all normalized signals
	Signals IncidentSignals `json:"signals"`
	// Symptoms detected from the signals
	Symptoms []*Symptom `json:"symptoms"`
	// Diagnosis contains the analysis
	Diagnosis *Diagnosis `json:"diagnosis,omitempty"`
	// Recommendations for resolution
	Recommendations []Recommendation `json:"recommendations,omitempty"`

	// Timeline of incident events
	Timeline []TimelineEntry `json:"timeline,omitempty"`
	// Actions taken on this incident
	Actions []IncidentAction `json:"actions,omitempty"`

	// ResolvedAt is when the incident was resolved
	ResolvedAt *time.Time `json:"resolvedAt,omitempty"`
	// Resolution describes how the incident was resolved
	Resolution string `json:"resolution,omitempty"`

	// Metadata for extensibility
	Metadata map[string]interface{} `json:"metadata,omitempty"`

	// ClusterContext identifies which cluster this incident is from
	ClusterContext string `json:"clusterContext,omitempty"`
}

// TimelineEntry represents an event in the incident timeline.
type TimelineEntry struct {
	Timestamp   time.Time              `json:"timestamp"`
	Type        string                 `json:"type"` // "signal", "status_change", "action", etc.
	Description string                 `json:"description"`
	Details     map[string]interface{} `json:"details,omitempty"`
}

// IncidentAction represents an action taken on an incident.
type IncidentAction struct {
	ID          string                 `json:"id"`
	Type        string                 `json:"type"` // "remediate", "acknowledge", "suppress", etc.
	Description string                 `json:"description"`
	Status      string                 `json:"status"` // "pending", "executing", "completed", "failed"
	StartedAt   time.Time              `json:"startedAt"`
	CompletedAt *time.Time             `json:"completedAt,omitempty"`
	Result      string                 `json:"result,omitempty"`
	Error       string                 `json:"error,omitempty"`
	Details     map[string]interface{} `json:"details,omitempty"`
	InitiatedBy string                 `json:"initiatedBy,omitempty"` // "user", "auto", "agent"
}

// GenerateFingerprint creates a fingerprint for deduplication.
func GenerateFingerprint(pattern FailurePattern, resource KubeResourceRef, symptoms []*Symptom) string {
	// Create a deterministic string from pattern, resource, and symptoms
	data := fmt.Sprintf("%s|%s|%s|%s",
		pattern,
		resource.Kind,
		resource.Name,
		resource.Namespace,
	)

	// Add symptom types to fingerprint
	for _, symptom := range symptoms {
		data += fmt.Sprintf("|%s", symptom.Type)
	}

	hash := sha256.Sum256([]byte(data))
	return hex.EncodeToString(hash[:8]) // Use first 8 bytes for shorter ID
}

// GenerateIncidentID creates a unique incident ID.
func GenerateIncidentID(fingerprint string, firstSeen time.Time) string {
	return fmt.Sprintf("INC-%s-%d", fingerprint[:8], firstSeen.Unix())
}

// IsActive returns true if the incident is not resolved or suppressed.
func (i *Incident) IsActive() bool {
	return i.Status == StatusOpen || i.Status == StatusInvestigating || i.Status == StatusRemediating
}

// Age returns the duration since the incident was first seen.
func (i *Incident) Age() time.Duration {
	return time.Since(i.FirstSeen)
}

// BlastRadius estimates the blast radius based on affected resources.
func (i *Incident) BlastRadius() int {
	return 1 + len(i.RelatedResources)
}

// AddTimelineEntry adds an entry to the incident timeline.
func (i *Incident) AddTimelineEntry(entryType, description string, details map[string]interface{}) {
	entry := TimelineEntry{
		Timestamp:   time.Now(),
		Type:        entryType,
		Description: description,
		Details:     details,
	}
	i.Timeline = append(i.Timeline, entry)
}

// UpdateStatus updates the incident status and adds timeline entry.
func (i *Incident) UpdateStatus(newStatus IncidentStatus, reason string) {
	oldStatus := i.Status
	i.Status = newStatus
	i.AddTimelineEntry("status_change", fmt.Sprintf("Status changed from %s to %s: %s", oldStatus, newStatus, reason), nil)
	
	if newStatus == StatusResolved {
		now := time.Now()
		i.ResolvedAt = &now
		i.Resolution = reason
	}
}

// IncrementOccurrences increments the occurrence count and updates last seen.
func (i *Incident) IncrementOccurrences() {
	i.Occurrences++
	i.LastSeen = time.Now()
}

