// Copyright 2025 KubeGraf Contributors
// SPDX-License-Identifier: Apache-2.0

package incidents

import (
	"fmt"
	"strconv"
	"time"
)

// SymptomType represents the type of detected symptom.
type SymptomType string

const (
	// Restart-related symptoms
	SymptomHighRestartCount     SymptomType = "HIGH_RESTART_COUNT"
	SymptomRestartFrequency     SymptomType = "RESTART_FREQUENCY"
	SymptomCrashLoopBackOff     SymptomType = "CRASHLOOP_BACKOFF"

	// Exit code symptoms
	SymptomExitCodeOOM          SymptomType = "EXIT_CODE_OOM"
	SymptomExitCodeError        SymptomType = "EXIT_CODE_ERROR"
	SymptomExitCodeSignal       SymptomType = "EXIT_CODE_SIGNAL"

	// Container state symptoms
	SymptomContainerWaiting     SymptomType = "CONTAINER_WAITING"
	SymptomContainerTerminated  SymptomType = "CONTAINER_TERMINATED"

	// Image-related symptoms
	SymptomImagePullError       SymptomType = "IMAGE_PULL_ERROR"
	SymptomImagePullBackOff     SymptomType = "IMAGE_PULL_BACKOFF"

	// Resource symptoms
	SymptomMemoryPressure       SymptomType = "MEMORY_PRESSURE"
	SymptomCPUThrottling        SymptomType = "CPU_THROTTLING"
	SymptomDiskPressure         SymptomType = "DISK_PRESSURE"

	// Network/connectivity symptoms
	SymptomNoEndpoints          SymptomType = "NO_ENDPOINTS"
	SymptomDNSResolutionFailed  SymptomType = "DNS_RESOLUTION_FAILED"
	SymptomConnectionRefused    SymptomType = "CONNECTION_REFUSED"
	SymptomConnectionTimeout    SymptomType = "CONNECTION_TIMEOUT"

	// HTTP error symptoms
	SymptomHTTP5xx              SymptomType = "HTTP_5XX"
	SymptomHTTP4xx              SymptomType = "HTTP_4XX"
	SymptomHTTPTimeout          SymptomType = "HTTP_TIMEOUT"

	// Probe symptoms
	SymptomLivenessProbeFailure SymptomType = "LIVENESS_PROBE_FAILURE"
	SymptomReadinessProbeFailure SymptomType = "READINESS_PROBE_FAILURE"
	SymptomStartupProbeFailure  SymptomType = "STARTUP_PROBE_FAILURE"

	// Scheduling symptoms
	SymptomUnschedulable        SymptomType = "UNSCHEDULABLE"
	SymptomInsufficientResources SymptomType = "INSUFFICIENT_RESOURCES"

	// Configuration symptoms
	SymptomMissingConfigMap     SymptomType = "MISSING_CONFIGMAP"
	SymptomMissingSecret        SymptomType = "MISSING_SECRET"
	SymptomInvalidConfig        SymptomType = "INVALID_CONFIG"

	// Permission symptoms
	SymptomRBACDenied           SymptomType = "RBAC_DENIED"
	SymptomSecurityContextError SymptomType = "SECURITY_CONTEXT_ERROR"

	// Node symptoms
	SymptomNodeNotReady         SymptomType = "NODE_NOT_READY"
	SymptomNodeUnreachable      SymptomType = "NODE_UNREACHABLE"
	SymptomNodePressure         SymptomType = "NODE_PRESSURE"
)

// Symptom represents a detected symptom from signals.
type Symptom struct {
	// Type identifies the symptom
	Type SymptomType `json:"type"`
	// Description provides context about the symptom
	Description string `json:"description"`
	// Evidence are the specific observations that led to this symptom
	Evidence []string `json:"evidence"`
	// Severity of this symptom
	Severity Severity `json:"severity"`
	// Resource affected by this symptom
	Resource KubeResourceRef `json:"resource"`
	// DetectedAt when the symptom was detected
	DetectedAt time.Time `json:"detectedAt"`
	// Value is a numeric value associated with the symptom (e.g., restart count)
	Value float64 `json:"value,omitempty"`
	// Metadata for additional context
	Metadata map[string]string `json:"metadata,omitempty"`
}

// NewSymptom creates a new symptom.
func NewSymptom(symptomType SymptomType, resource KubeResourceRef, description string) *Symptom {
	return &Symptom{
		Type:        symptomType,
		Description: description,
		Resource:    resource,
		DetectedAt:  time.Now(),
		Evidence:    make([]string, 0),
		Severity:    SeverityMedium,
		Metadata:    make(map[string]string),
	}
}

// WithEvidence adds evidence to the symptom.
func (s *Symptom) WithEvidence(evidence ...string) *Symptom {
	s.Evidence = append(s.Evidence, evidence...)
	return s
}

// WithSeverity sets the severity.
func (s *Symptom) WithSeverity(severity Severity) *Symptom {
	s.Severity = severity
	return s
}

// WithValue sets a numeric value.
func (s *Symptom) WithValue(value float64) *Symptom {
	s.Value = value
	return s
}

// WithMetadata sets metadata.
func (s *Symptom) WithMetadata(key, value string) *Symptom {
	if s.Metadata == nil {
		s.Metadata = make(map[string]string)
	}
	s.Metadata[key] = value
	return s
}

// SymptomDetector detects symptoms from normalized signals.
type SymptomDetector struct {
	// Configuration thresholds
	highRestartThreshold     int32
	restartFrequencyWindow   time.Duration
	restartFrequencyThreshold int
	http5xxThreshold         int
}

// NewSymptomDetector creates a new symptom detector with default thresholds.
func NewSymptomDetector() *SymptomDetector {
	return &SymptomDetector{
		highRestartThreshold:     5,
		restartFrequencyWindow:   10 * time.Minute,
		restartFrequencyThreshold: 3,
		http5xxThreshold:         5,
	}
}

// DetectSymptoms analyzes signals and detects symptoms.
func (d *SymptomDetector) DetectSymptoms(signals []*NormalizedSignal) []*Symptom {
	var symptoms []*Symptom

	// Group signals by resource for analysis
	byResource := make(map[string][]*NormalizedSignal)
	for _, signal := range signals {
		key := signal.Resource.String()
		byResource[key] = append(byResource[key], signal)
	}

	// Analyze each resource's signals
	for _, resourceSignals := range byResource {
		symptoms = append(symptoms, d.detectFromSignals(resourceSignals)...)
	}

	return symptoms
}

// detectFromSignals detects symptoms from a group of signals for one resource.
func (d *SymptomDetector) detectFromSignals(signals []*NormalizedSignal) []*Symptom {
	if len(signals) == 0 {
		return nil
	}

	var symptoms []*Symptom
	resource := signals[0].Resource

	// Track metrics for detection
	var restartCount int32
	var http5xxCount int
	var http4xxCount int
	var exitCodes []int

	for _, signal := range signals {
		switch signal.Source {
		case SourcePodStatus:
			symptom := d.detectFromStatusSignal(signal, resource)
			if symptom != nil {
				symptoms = append(symptoms, symptom)
			}
			// Track restart count
			if rc := signal.GetAttribute(AttrRestartCount); rc != "" {
				if count, err := strconv.ParseInt(rc, 10, 32); err == nil {
					if int32(count) > restartCount {
						restartCount = int32(count)
					}
				}
			}
			// Track exit codes
			if ec := signal.GetAttribute(AttrExitCode); ec != "" {
				if code, err := strconv.Atoi(ec); err == nil {
					exitCodes = append(exitCodes, code)
				}
			}

		case SourceKubeEvent:
			symptom := d.detectFromEventSignal(signal, resource)
			if symptom != nil {
				symptoms = append(symptoms, symptom)
			}

		case SourcePodLog:
			symptom := d.detectFromLogSignal(signal, resource)
			if symptom != nil {
				symptoms = append(symptoms, symptom)
			}
			// Track HTTP errors
			if status := signal.GetAttribute(AttrHTTPStatus); status != "" {
				if code, err := strconv.Atoi(status); err == nil {
					if code >= 500 {
						http5xxCount++
					} else if code >= 400 {
						http4xxCount++
					}
				}
			}

		case SourceProbe:
			symptom := d.detectFromProbeSignal(signal, resource)
			if symptom != nil {
				symptoms = append(symptoms, symptom)
			}
		}
	}

	// Detect aggregate symptoms
	if restartCount >= d.highRestartThreshold {
		symptoms = append(symptoms, d.createHighRestartSymptom(resource, restartCount))
	}

	if http5xxCount >= d.http5xxThreshold {
		symptoms = append(symptoms, d.createHTTP5xxSymptom(resource, http5xxCount))
	}

	if http4xxCount >= d.http5xxThreshold {
		symptoms = append(symptoms, d.createHTTP4xxSymptom(resource, http4xxCount))
	}

	// Detect OOM from exit codes
	for _, code := range exitCodes {
		if code == 137 { // OOMKilled
			symptoms = append(symptoms, d.createOOMSymptom(resource, code))
			break
		}
	}

	return symptoms
}

// detectFromStatusSignal detects symptoms from a status signal.
func (d *SymptomDetector) detectFromStatusSignal(signal *NormalizedSignal, resource KubeResourceRef) *Symptom {
	reason := signal.GetAttribute(AttrContainerReason)
	state := signal.GetAttribute(AttrContainerState)

	switch reason {
	case "CrashLoopBackOff":
		return NewSymptom(SymptomCrashLoopBackOff, resource,
			fmt.Sprintf("Container in CrashLoopBackOff state")).
			WithEvidence(signal.Message).
			WithSeverity(SeverityCritical)

	case "OOMKilled":
		return NewSymptom(SymptomExitCodeOOM, resource,
			"Container terminated due to Out of Memory").
			WithEvidence(signal.Message).
			WithSeverity(SeverityCritical)

	case "Error":
		if state == "Terminated" {
			return NewSymptom(SymptomExitCodeError, resource,
				"Container terminated with error").
				WithEvidence(signal.Message).
				WithSeverity(SeverityHigh)
		}

	case "ErrImagePull", "ImagePullBackOff":
		return NewSymptom(SymptomImagePullError, resource,
			"Failed to pull container image").
			WithEvidence(signal.Message).
			WithSeverity(SeverityHigh)

	case "CreateContainerConfigError":
		return NewSymptom(SymptomInvalidConfig, resource,
			"Container configuration error").
			WithEvidence(signal.Message).
			WithSeverity(SeverityHigh)

	case "ContainerCreating":
		// Not a symptom, just status

	case "PodInitializing":
		// Not a symptom, just status
	}

	// Check for waiting state
	if state == "Waiting" && reason != "" && reason != "ContainerCreating" && reason != "PodInitializing" {
		return NewSymptom(SymptomContainerWaiting, resource,
			fmt.Sprintf("Container waiting: %s", reason)).
			WithEvidence(signal.Message).
			WithSeverity(SeverityMedium)
	}

	return nil
}

// detectFromEventSignal detects symptoms from a Kubernetes event signal.
func (d *SymptomDetector) detectFromEventSignal(signal *NormalizedSignal, resource KubeResourceRef) *Symptom {
	reason := signal.GetAttribute(AttrEventReason)
	eventType := signal.GetAttribute(AttrEventType)

	// Only process Warning events or specific Normal events
	if eventType != "Warning" && reason != "Unhealthy" {
		return nil
	}

	switch reason {
	case "FailedScheduling":
		return NewSymptom(SymptomUnschedulable, resource,
			"Pod cannot be scheduled").
			WithEvidence(signal.Message).
			WithSeverity(SeverityHigh)

	case "Unhealthy":
		// Determine probe type from message
		if containsAny(signal.Message, "liveness") {
			return NewSymptom(SymptomLivenessProbeFailure, resource,
				"Liveness probe failed").
				WithEvidence(signal.Message).
				WithSeverity(SeverityCritical)
		} else if containsAny(signal.Message, "readiness") {
			return NewSymptom(SymptomReadinessProbeFailure, resource,
				"Readiness probe failed").
				WithEvidence(signal.Message).
				WithSeverity(SeverityHigh)
		} else if containsAny(signal.Message, "startup") {
			return NewSymptom(SymptomStartupProbeFailure, resource,
				"Startup probe failed").
				WithEvidence(signal.Message).
				WithSeverity(SeverityHigh)
		}

	case "BackOff":
		return NewSymptom(SymptomCrashLoopBackOff, resource,
			"Container in backoff state").
			WithEvidence(signal.Message).
			WithSeverity(SeverityCritical)

	case "FailedMount":
		if containsAny(signal.Message, "secret") {
			return NewSymptom(SymptomMissingSecret, resource,
				"Failed to mount secret").
				WithEvidence(signal.Message).
				WithSeverity(SeverityHigh)
		} else if containsAny(signal.Message, "configmap") {
			return NewSymptom(SymptomMissingConfigMap, resource,
				"Failed to mount configmap").
				WithEvidence(signal.Message).
				WithSeverity(SeverityHigh)
		}

	case "NodeNotReady":
		return NewSymptom(SymptomNodeNotReady, resource,
			"Node is not ready").
			WithEvidence(signal.Message).
			WithSeverity(SeverityCritical)

	case "NodeUnreachable":
		return NewSymptom(SymptomNodeUnreachable, resource,
			"Node is unreachable").
			WithEvidence(signal.Message).
			WithSeverity(SeverityCritical)

	case "EvictedByVTAController", "Evicted":
		return NewSymptom(SymptomNodePressure, resource,
			"Pod evicted due to node pressure").
			WithEvidence(signal.Message).
			WithSeverity(SeverityHigh)

	case "Forbidden":
		return NewSymptom(SymptomRBACDenied, resource,
			"Action forbidden by RBAC").
			WithEvidence(signal.Message).
			WithSeverity(SeverityMedium)
	}

	return nil
}

// detectFromLogSignal detects symptoms from a log signal.
func (d *SymptomDetector) detectFromLogSignal(signal *NormalizedSignal, resource KubeResourceRef) *Symptom {
	httpStatus := signal.GetAttribute(AttrHTTPStatus)
	errorType := signal.GetAttribute(AttrErrorType)

	if httpStatus != "" {
		code, err := strconv.Atoi(httpStatus)
		if err == nil {
			switch {
			case code == 408 || code == 504 || code == 524:
				return NewSymptom(SymptomHTTPTimeout, resource,
					fmt.Sprintf("HTTP timeout (status %d)", code)).
					WithEvidence(signal.Message).
					WithSeverity(SeverityMedium).
					WithValue(float64(code))
			case code == 502 || code == 503:
				return NewSymptom(SymptomNoEndpoints, resource,
					fmt.Sprintf("Upstream unavailable (status %d)", code)).
					WithEvidence(signal.Message).
					WithSeverity(SeverityHigh).
					WithValue(float64(code))
			}
		}
	}

	// Check for DNS errors
	if containsAny(signal.Message, "dns", "resolve", "lookup") && containsAny(signal.Message, "failed", "error", "timeout") {
		return NewSymptom(SymptomDNSResolutionFailed, resource,
			"DNS resolution failed").
			WithEvidence(signal.Message).
			WithSeverity(SeverityHigh)
	}

	// Check for connection errors
	if containsAny(signal.Message, "connection refused", "connect failed") {
		return NewSymptom(SymptomConnectionRefused, resource,
			"Connection refused").
			WithEvidence(signal.Message).
			WithSeverity(SeverityHigh)
	}

	if containsAny(signal.Message, "connection timeout", "dial timeout", "i/o timeout") {
		return NewSymptom(SymptomConnectionTimeout, resource,
			"Connection timeout").
			WithEvidence(signal.Message).
			WithSeverity(SeverityMedium)
	}

	// Check for OOM indicators
	if containsAny(signal.Message, "out of memory", "oom", "memory allocation failed") {
		return NewSymptom(SymptomMemoryPressure, resource,
			"Memory pressure detected in logs").
			WithEvidence(signal.Message).
			WithSeverity(SeverityCritical)
	}

	_ = errorType // Reserved for future use

	return nil
}

// detectFromProbeSignal detects symptoms from a probe signal.
func (d *SymptomDetector) detectFromProbeSignal(signal *NormalizedSignal, resource KubeResourceRef) *Symptom {
	probeType := signal.GetAttribute(AttrProbeType)
	failure := signal.GetAttribute(AttrProbeFailure)

	if failure != "" {
		failureCount, _ := strconv.Atoi(failure)
		switch probeType {
		case "liveness":
			return NewSymptom(SymptomLivenessProbeFailure, resource,
				fmt.Sprintf("Liveness probe failed %d times", failureCount)).
				WithEvidence(signal.Message).
				WithSeverity(SeverityCritical).
				WithValue(float64(failureCount))
		case "readiness":
			return NewSymptom(SymptomReadinessProbeFailure, resource,
				fmt.Sprintf("Readiness probe failed %d times", failureCount)).
				WithEvidence(signal.Message).
				WithSeverity(SeverityHigh).
				WithValue(float64(failureCount))
		case "startup":
			return NewSymptom(SymptomStartupProbeFailure, resource,
				fmt.Sprintf("Startup probe failed %d times", failureCount)).
				WithEvidence(signal.Message).
				WithSeverity(SeverityHigh).
				WithValue(float64(failureCount))
		}
	}

	return nil
}

// Helper methods for creating specific symptoms

func (d *SymptomDetector) createHighRestartSymptom(resource KubeResourceRef, count int32) *Symptom {
	return NewSymptom(SymptomHighRestartCount, resource,
		fmt.Sprintf("Container has restarted %d times", count)).
		WithSeverity(SeverityHigh).
		WithValue(float64(count)).
		WithEvidence(fmt.Sprintf("Restart count: %d (threshold: %d)", count, d.highRestartThreshold))
}

func (d *SymptomDetector) createHTTP5xxSymptom(resource KubeResourceRef, count int) *Symptom {
	return NewSymptom(SymptomHTTP5xx, resource,
		fmt.Sprintf("Detected %d HTTP 5xx errors", count)).
		WithSeverity(SeverityHigh).
		WithValue(float64(count)).
		WithEvidence(fmt.Sprintf("5xx error count: %d", count))
}

func (d *SymptomDetector) createHTTP4xxSymptom(resource KubeResourceRef, count int) *Symptom {
	return NewSymptom(SymptomHTTP4xx, resource,
		fmt.Sprintf("Detected %d HTTP 4xx errors", count)).
		WithSeverity(SeverityMedium).
		WithValue(float64(count)).
		WithEvidence(fmt.Sprintf("4xx error count: %d", count))
}

func (d *SymptomDetector) createOOMSymptom(resource KubeResourceRef, exitCode int) *Symptom {
	return NewSymptom(SymptomExitCodeOOM, resource,
		"Container was OOM killed (exit code 137)").
		WithSeverity(SeverityCritical).
		WithValue(float64(exitCode)).
		WithEvidence(fmt.Sprintf("Exit code: %d (SIGKILL/OOM)", exitCode))
}

// Helper function to check if a string contains any of the substrings
func containsAny(s string, substrs ...string) bool {
	sLower := toLower(s)
	for _, substr := range substrs {
		if contains(sLower, toLower(substr)) {
			return true
		}
	}
	return false
}

// Simple contains implementation to avoid strings import
func contains(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}

// Simple toLower implementation
func toLower(s string) string {
	b := make([]byte, len(s))
	for i := 0; i < len(s); i++ {
		c := s[i]
		if c >= 'A' && c <= 'Z' {
			c += 'a' - 'A'
		}
		b[i] = c
	}
	return string(b)
}

