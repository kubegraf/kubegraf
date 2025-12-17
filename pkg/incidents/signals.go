// Copyright 2025 KubeGraf Contributors
// SPDX-License-Identifier: Apache-2.0

package incidents

import (
	"fmt"
	"time"
)

// SignalSource identifies the origin of a signal.
type SignalSource string

const (
	SourceKubeEvent   SignalSource = "event"
	SourcePodLog      SignalSource = "log"
	SourcePodStatus   SignalSource = "status"
	SourceMetric      SignalSource = "metric"
	SourceProbe       SignalSource = "probe"
	SourceController  SignalSource = "controller"
)

// NormalizedSignal represents a normalized signal from any Kubernetes source.
// All inputs (events, logs, status, metrics) are converted to this format.
type NormalizedSignal struct {
	// ID is a unique identifier for this signal
	ID string `json:"id"`
	// Source identifies where this signal came from
	Source SignalSource `json:"source"`
	// Resource is the Kubernetes resource this signal relates to
	Resource KubeResourceRef `json:"resource"`
	// Timestamp when the signal was generated
	Timestamp time.Time `json:"timestamp"`
	// Message is the human-readable description
	Message string `json:"message"`
	// Attributes contain structured data about the signal
	Attributes map[string]string `json:"attributes"`
	// RawData stores the original data for reference
	RawData interface{} `json:"-"`
}

// NewNormalizedSignal creates a new normalized signal.
func NewNormalizedSignal(source SignalSource, resource KubeResourceRef, message string) *NormalizedSignal {
	return &NormalizedSignal{
		ID:         GenerateSignalID(source, resource, time.Now()),
		Source:     source,
		Resource:   resource,
		Timestamp:  time.Now(),
		Message:    message,
		Attributes: make(map[string]string),
	}
}

// GenerateSignalID creates a unique signal ID.
func GenerateSignalID(source SignalSource, resource KubeResourceRef, ts time.Time) string {
	return fmt.Sprintf("sig-%s-%s-%s-%d",
		source,
		resource.Kind,
		resource.Name,
		ts.UnixNano(),
	)
}

// SetAttribute sets an attribute on the signal.
func (s *NormalizedSignal) SetAttribute(key, value string) *NormalizedSignal {
	if s.Attributes == nil {
		s.Attributes = make(map[string]string)
	}
	s.Attributes[key] = value
	return s
}

// GetAttribute returns an attribute value.
func (s *NormalizedSignal) GetAttribute(key string) string {
	if s.Attributes == nil {
		return ""
	}
	return s.Attributes[key]
}

// HasAttribute checks if an attribute exists.
func (s *NormalizedSignal) HasAttribute(key string) bool {
	if s.Attributes == nil {
		return false
	}
	_, exists := s.Attributes[key]
	return exists
}

// Common attribute keys for normalized signals
const (
	// Event attributes
	AttrEventType   = "event_type"
	AttrEventReason = "event_reason"
	AttrEventCount  = "event_count"

	// Log attributes
	AttrLogLevel      = "log_level"
	AttrLogContainer  = "container"
	AttrHTTPStatus    = "http_status"
	AttrHTTPMethod    = "http_method"
	AttrHTTPPath      = "http_path"
	AttrErrorType     = "error_type"

	// Status attributes
	AttrPodPhase        = "pod_phase"
	AttrContainerState  = "container_state"
	AttrContainerReason = "container_reason"
	AttrExitCode        = "exit_code"
	AttrRestartCount    = "restart_count"
	AttrTerminatedAt    = "terminated_at"

	// Probe attributes
	AttrProbeType    = "probe_type"
	AttrProbeSuccess = "probe_success"
	AttrProbeFailure = "probe_failure"

	// Generic attributes
	AttrSeverity  = "severity"
	AttrNamespace = "namespace"
	AttrNode      = "node"
)

// SignalNormalizer converts various Kubernetes data types into NormalizedSignals.
type SignalNormalizer struct {
	clusterContext string
}

// NewSignalNormalizer creates a new signal normalizer.
func NewSignalNormalizer(clusterContext string) *SignalNormalizer {
	return &SignalNormalizer{
		clusterContext: clusterContext,
	}
}

// NormalizeKubeEvent converts a Kubernetes event to a normalized signal.
func (n *SignalNormalizer) NormalizeKubeEvent(
	eventType string,
	reason string,
	message string,
	count int32,
	timestamp time.Time,
	involvedKind string,
	involvedName string,
	involvedNamespace string,
) *NormalizedSignal {
	resource := KubeResourceRef{
		Kind:      involvedKind,
		Name:      involvedName,
		Namespace: involvedNamespace,
	}

	signal := NewNormalizedSignal(SourceKubeEvent, resource, message)
	signal.Timestamp = timestamp
	signal.SetAttribute(AttrEventType, eventType)
	signal.SetAttribute(AttrEventReason, reason)
	signal.SetAttribute(AttrEventCount, fmt.Sprintf("%d", count))
	signal.SetAttribute(AttrNamespace, involvedNamespace)

	// Set severity based on event type
	if eventType == "Warning" {
		signal.SetAttribute(AttrSeverity, string(SeverityHigh))
	} else {
		signal.SetAttribute(AttrSeverity, string(SeverityInfo))
	}

	return signal
}

// NormalizePodStatus converts pod status information to normalized signals.
func (n *SignalNormalizer) NormalizePodStatus(
	podName string,
	namespace string,
	phase string,
	containerName string,
	containerState string,
	containerReason string,
	exitCode int,
	restartCount int32,
	terminatedAt *time.Time,
) *NormalizedSignal {
	resource := KubeResourceRef{
		Kind:      "Pod",
		Name:      podName,
		Namespace: namespace,
	}

	message := fmt.Sprintf("Container %s in state %s", containerName, containerState)
	if containerReason != "" {
		message = fmt.Sprintf("%s: %s", message, containerReason)
	}

	signal := NewNormalizedSignal(SourcePodStatus, resource, message)
	signal.SetAttribute(AttrPodPhase, phase)
	signal.SetAttribute(AttrContainerState, containerState)
	signal.SetAttribute(AttrLogContainer, containerName)
	signal.SetAttribute(AttrNamespace, namespace)

	if containerReason != "" {
		signal.SetAttribute(AttrContainerReason, containerReason)
	}
	if exitCode != 0 {
		signal.SetAttribute(AttrExitCode, fmt.Sprintf("%d", exitCode))
	}
	if restartCount > 0 {
		signal.SetAttribute(AttrRestartCount, fmt.Sprintf("%d", restartCount))
	}
	if terminatedAt != nil {
		signal.SetAttribute(AttrTerminatedAt, terminatedAt.Format(time.RFC3339))
	}

	// Determine severity based on state
	switch containerState {
	case "Terminated":
		if containerReason == "OOMKilled" {
			signal.SetAttribute(AttrSeverity, string(SeverityCritical))
		} else if containerReason == "Error" {
			signal.SetAttribute(AttrSeverity, string(SeverityHigh))
		} else {
			signal.SetAttribute(AttrSeverity, string(SeverityMedium))
		}
	case "Waiting":
		if containerReason == "CrashLoopBackOff" || containerReason == "ErrImagePull" {
			signal.SetAttribute(AttrSeverity, string(SeverityCritical))
		} else {
			signal.SetAttribute(AttrSeverity, string(SeverityMedium))
		}
	default:
		signal.SetAttribute(AttrSeverity, string(SeverityInfo))
	}

	return signal
}

// NormalizeLogEntry converts a log entry to a normalized signal.
func (n *SignalNormalizer) NormalizeLogEntry(
	podName string,
	namespace string,
	containerName string,
	logLine string,
	timestamp time.Time,
	httpStatus int,
	httpMethod string,
	httpPath string,
	errorType string,
) *NormalizedSignal {
	resource := KubeResourceRef{
		Kind:      "Pod",
		Name:      podName,
		Namespace: namespace,
	}

	signal := NewNormalizedSignal(SourcePodLog, resource, logLine)
	signal.Timestamp = timestamp
	signal.SetAttribute(AttrLogContainer, containerName)
	signal.SetAttribute(AttrNamespace, namespace)

	if httpStatus > 0 {
		signal.SetAttribute(AttrHTTPStatus, fmt.Sprintf("%d", httpStatus))
	}
	if httpMethod != "" {
		signal.SetAttribute(AttrHTTPMethod, httpMethod)
	}
	if httpPath != "" {
		signal.SetAttribute(AttrHTTPPath, httpPath)
	}
	if errorType != "" {
		signal.SetAttribute(AttrErrorType, errorType)
	}

	// Determine severity based on HTTP status or error type
	if httpStatus >= 500 {
		signal.SetAttribute(AttrSeverity, string(SeverityHigh))
	} else if httpStatus >= 400 {
		signal.SetAttribute(AttrSeverity, string(SeverityMedium))
	} else if errorType != "" {
		signal.SetAttribute(AttrSeverity, string(SeverityMedium))
	} else {
		signal.SetAttribute(AttrSeverity, string(SeverityInfo))
	}

	return signal
}

// NormalizeProbeResult converts a probe result to a normalized signal.
func (n *SignalNormalizer) NormalizeProbeResult(
	podName string,
	namespace string,
	probeType string, // "liveness", "readiness", "startup"
	success bool,
	failureCount int,
	message string,
) *NormalizedSignal {
	resource := KubeResourceRef{
		Kind:      "Pod",
		Name:      podName,
		Namespace: namespace,
	}

	signal := NewNormalizedSignal(SourceProbe, resource, message)
	signal.SetAttribute(AttrProbeType, probeType)
	signal.SetAttribute(AttrNamespace, namespace)

	if success {
		signal.SetAttribute(AttrProbeSuccess, "true")
		signal.SetAttribute(AttrSeverity, string(SeverityInfo))
	} else {
		signal.SetAttribute(AttrProbeFailure, fmt.Sprintf("%d", failureCount))
		if probeType == "liveness" {
			signal.SetAttribute(AttrSeverity, string(SeverityCritical))
		} else {
			signal.SetAttribute(AttrSeverity, string(SeverityHigh))
		}
	}

	return signal
}

// SignalBatch represents a batch of signals for processing.
type SignalBatch struct {
	Signals      []*NormalizedSignal
	CollectedAt  time.Time
	ClusterContext string
}

// NewSignalBatch creates a new signal batch.
func NewSignalBatch(clusterContext string) *SignalBatch {
	return &SignalBatch{
		Signals:        make([]*NormalizedSignal, 0),
		CollectedAt:    time.Now(),
		ClusterContext: clusterContext,
	}
}

// Add adds a signal to the batch.
func (b *SignalBatch) Add(signal *NormalizedSignal) {
	b.Signals = append(b.Signals, signal)
}

// Size returns the number of signals in the batch.
func (b *SignalBatch) Size() int {
	return len(b.Signals)
}

// GroupByResource groups signals by their resource.
func (b *SignalBatch) GroupByResource() map[string][]*NormalizedSignal {
	groups := make(map[string][]*NormalizedSignal)
	for _, signal := range b.Signals {
		key := signal.Resource.String()
		groups[key] = append(groups[key], signal)
	}
	return groups
}

// FilterBySource filters signals by source type.
func (b *SignalBatch) FilterBySource(source SignalSource) []*NormalizedSignal {
	var filtered []*NormalizedSignal
	for _, signal := range b.Signals {
		if signal.Source == source {
			filtered = append(filtered, signal)
		}
	}
	return filtered
}

