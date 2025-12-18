// Copyright 2025 KubeGraf Contributors
// SPDX-License-Identifier: Apache-2.0

package explain

import (
	"context"
	"fmt"
	"sort"
	"strings"
	"time"

	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"
)

// PodExplanation provides a comprehensive explanation of a pod's state.
type PodExplanation struct {
	// Summary is a one-line description of the pod's overall status
	Summary string `json:"summary"`
	// Status indicates health: "healthy", "warning", "error", "unknown"
	Status string `json:"status"`
	// Timeline shows important lifecycle events in order
	Timeline []TimelineEvent `json:"timeline"`
	// KeyFindings are the most important observations
	KeyFindings []Finding `json:"keyFindings"`
	// Containers provides per-container analysis
	Containers []ContainerAnalysis `json:"containers"`
	// ResourcePressure indicates resource-related issues
	ResourcePressure *ResourcePressure `json:"resourcePressure,omitempty"`
	// ProbeFailures lists any probe failures
	ProbeFailures []ProbeFailure `json:"probeFailures,omitempty"`
	// RestartAnalysis provides insight into restart patterns
	RestartAnalysis *RestartAnalysis `json:"restartAnalysis,omitempty"`
	// GeneratedAt is when this explanation was generated
	GeneratedAt time.Time `json:"generatedAt"`
}

// TimelineEvent represents a significant event in the pod's lifecycle.
type TimelineEvent struct {
	Timestamp   time.Time `json:"timestamp"`
	Event       string    `json:"event"`
	Description string    `json:"description"`
	Severity    string    `json:"severity"` // "info", "warning", "error"
}

// Finding represents a key observation about the pod.
type Finding struct {
	Category    string `json:"category"`    // "health", "resources", "config", "network"
	Description string `json:"description"`
	Severity    string `json:"severity"` // "info", "warning", "error"
	Suggestion  string `json:"suggestion,omitempty"`
}

// ContainerAnalysis provides analysis for a single container.
type ContainerAnalysis struct {
	Name          string    `json:"name"`
	Image         string    `json:"image"`
	Status        string    `json:"status"` // "running", "waiting", "terminated"
	Ready         bool      `json:"ready"`
	RestartCount  int32     `json:"restartCount"`
	LastExitCode  int32     `json:"lastExitCode,omitempty"`
	LastExitReason string   `json:"lastExitReason,omitempty"`
	StartedAt     *time.Time `json:"startedAt,omitempty"`
	Issues        []string  `json:"issues,omitempty"`
}

// ResourcePressure indicates resource-related issues.
type ResourcePressure struct {
	MemoryPressure bool   `json:"memoryPressure"`
	CPUThrottled   bool   `json:"cpuThrottled"`
	Summary        string `json:"summary"`
}

// ProbeFailure represents a probe failure event.
type ProbeFailure struct {
	ContainerName string    `json:"containerName"`
	ProbeType     string    `json:"probeType"` // "liveness", "readiness", "startup"
	Message       string    `json:"message"`
	Timestamp     time.Time `json:"timestamp"`
}

// RestartAnalysis provides insight into restart patterns.
type RestartAnalysis struct {
	TotalRestarts    int32     `json:"totalRestarts"`
	RecentRestarts   int32     `json:"recentRestarts"` // In last hour
	Pattern          string    `json:"pattern"`        // "stable", "occasional", "frequent", "crashloop"
	LastRestartTime  *time.Time `json:"lastRestartTime,omitempty"`
	CommonExitCodes  []int32   `json:"commonExitCodes,omitempty"`
	Recommendation   string    `json:"recommendation,omitempty"`
}

// PodExplainer provides explanations for pod states.
type PodExplainer struct {
	clientset kubernetes.Interface
}

// NewPodExplainer creates a new pod explainer.
func NewPodExplainer(clientset kubernetes.Interface) *PodExplainer {
	return &PodExplainer{clientset: clientset}
}

// ExplainPod generates a comprehensive explanation of a pod's state.
func (e *PodExplainer) ExplainPod(ctx context.Context, namespace, podName string) (*PodExplanation, error) {
	// Fetch the pod
	pod, err := e.clientset.CoreV1().Pods(namespace).Get(ctx, podName, metav1.GetOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to get pod: %w", err)
	}

	// Fetch related events
	events, err := e.clientset.CoreV1().Events(namespace).List(ctx, metav1.ListOptions{
		FieldSelector: fmt.Sprintf("involvedObject.name=%s,involvedObject.kind=Pod", podName),
	})
	if err != nil {
		// Non-fatal: continue without events
		events = &corev1.EventList{}
	}

	// Build the explanation
	explanation := &PodExplanation{
		GeneratedAt: time.Now(),
	}

	// Analyze overall status
	explanation.Status, explanation.Summary = e.analyzePodStatus(pod)

	// Build timeline from events
	explanation.Timeline = e.buildTimeline(pod, events)

	// Analyze containers
	explanation.Containers = e.analyzeContainers(pod)

	// Analyze restarts
	explanation.RestartAnalysis = e.analyzeRestarts(pod, events)

	// Check for probe failures
	explanation.ProbeFailures = e.findProbeFailures(events)

	// Check for resource pressure
	explanation.ResourcePressure = e.analyzeResourcePressure(pod, events)

	// Generate key findings
	explanation.KeyFindings = e.generateKeyFindings(explanation, pod)

	return explanation, nil
}

// analyzePodStatus determines the overall pod status.
func (e *PodExplainer) analyzePodStatus(pod *corev1.Pod) (string, string) {
	phase := pod.Status.Phase

	// Check for pending issues
	if phase == corev1.PodPending {
		for _, cond := range pod.Status.Conditions {
			if cond.Type == corev1.PodScheduled && cond.Status == corev1.ConditionFalse {
				return "error", fmt.Sprintf("Pod is pending: %s", cond.Message)
			}
		}
		return "warning", "Pod is pending and waiting to be scheduled"
	}

	// Check container statuses
	allReady := true
	hasErrors := false
	var issues []string

	for _, cs := range pod.Status.ContainerStatuses {
		if !cs.Ready {
			allReady = false
		}
		if cs.State.Waiting != nil {
			if cs.State.Waiting.Reason == "CrashLoopBackOff" {
				hasErrors = true
				issues = append(issues, fmt.Sprintf("Container %s in CrashLoopBackOff", cs.Name))
			} else if cs.State.Waiting.Reason == "ImagePullBackOff" || cs.State.Waiting.Reason == "ErrImagePull" {
				hasErrors = true
				issues = append(issues, fmt.Sprintf("Container %s cannot pull image", cs.Name))
			}
		}
		if cs.State.Terminated != nil && cs.State.Terminated.ExitCode != 0 {
			hasErrors = true
			issues = append(issues, fmt.Sprintf("Container %s exited with code %d", cs.Name, cs.State.Terminated.ExitCode))
		}
	}

	if hasErrors {
		return "error", strings.Join(issues, "; ")
	}
	if !allReady {
		return "warning", "One or more containers are not ready"
	}
	if phase == corev1.PodRunning {
		return "healthy", "Pod is running and all containers are ready"
	}
	if phase == corev1.PodSucceeded {
		return "healthy", "Pod completed successfully"
	}
	if phase == corev1.PodFailed {
		return "error", "Pod has failed"
	}

	return "unknown", fmt.Sprintf("Pod is in %s phase", phase)
}

// buildTimeline creates a timeline of significant events.
func (e *PodExplainer) buildTimeline(pod *corev1.Pod, events *corev1.EventList) []TimelineEvent {
	var timeline []TimelineEvent

	// Add pod creation
	if pod.CreationTimestamp.Time.After(time.Time{}) {
		timeline = append(timeline, TimelineEvent{
			Timestamp:   pod.CreationTimestamp.Time,
			Event:       "Pod Created",
			Description: fmt.Sprintf("Pod %s was created", pod.Name),
			Severity:    "info",
		})
	}

	// Add container start times
	for _, cs := range pod.Status.ContainerStatuses {
		if cs.State.Running != nil && cs.State.Running.StartedAt.Time.After(time.Time{}) {
			timeline = append(timeline, TimelineEvent{
				Timestamp:   cs.State.Running.StartedAt.Time,
				Event:       "Container Started",
				Description: fmt.Sprintf("Container %s started", cs.Name),
				Severity:    "info",
			})
		}
	}

	// Add relevant events
	for _, event := range events.Items {
		severity := "info"
		if event.Type == "Warning" {
			severity = "warning"
		}
		if strings.Contains(event.Reason, "Failed") || strings.Contains(event.Reason, "Error") {
			severity = "error"
		}

		timeline = append(timeline, TimelineEvent{
			Timestamp:   event.LastTimestamp.Time,
			Event:       event.Reason,
			Description: event.Message,
			Severity:    severity,
		})
	}

	// Sort by timestamp
	sort.Slice(timeline, func(i, j int) bool {
		return timeline[i].Timestamp.Before(timeline[j].Timestamp)
	})

	return timeline
}

// analyzeContainers analyzes each container in the pod.
func (e *PodExplainer) analyzeContainers(pod *corev1.Pod) []ContainerAnalysis {
	var analyses []ContainerAnalysis

	// Create a map of container specs
	containerSpecs := make(map[string]corev1.Container)
	for _, c := range pod.Spec.Containers {
		containerSpecs[c.Name] = c
	}

	for _, cs := range pod.Status.ContainerStatuses {
		analysis := ContainerAnalysis{
			Name:         cs.Name,
			Image:        cs.Image,
			Ready:        cs.Ready,
			RestartCount: cs.RestartCount,
		}

		// Determine status
		if cs.State.Running != nil {
			analysis.Status = "running"
			analysis.StartedAt = &cs.State.Running.StartedAt.Time
		} else if cs.State.Waiting != nil {
			analysis.Status = "waiting"
			analysis.Issues = append(analysis.Issues, fmt.Sprintf("Waiting: %s - %s", cs.State.Waiting.Reason, cs.State.Waiting.Message))
		} else if cs.State.Terminated != nil {
			analysis.Status = "terminated"
			analysis.LastExitCode = cs.State.Terminated.ExitCode
			analysis.LastExitReason = cs.State.Terminated.Reason
		}

		// Check last termination state
		if cs.LastTerminationState.Terminated != nil {
			analysis.LastExitCode = cs.LastTerminationState.Terminated.ExitCode
			analysis.LastExitReason = cs.LastTerminationState.Terminated.Reason

			// Add exit code interpretation
			switch cs.LastTerminationState.Terminated.ExitCode {
			case 0:
				// Normal exit
			case 1:
				analysis.Issues = append(analysis.Issues, "Container exited with generic error (exit code 1)")
			case 137:
				analysis.Issues = append(analysis.Issues, "Container was killed by SIGKILL (exit code 137) - possibly OOMKilled")
			case 139:
				analysis.Issues = append(analysis.Issues, "Container crashed with segmentation fault (exit code 139)")
			case 143:
				analysis.Issues = append(analysis.Issues, "Container was terminated gracefully by SIGTERM (exit code 143)")
			default:
				if cs.LastTerminationState.Terminated.ExitCode != 0 {
					analysis.Issues = append(analysis.Issues, fmt.Sprintf("Container exited with code %d", cs.LastTerminationState.Terminated.ExitCode))
				}
			}
		}

		analyses = append(analyses, analysis)
	}

	return analyses
}

// analyzeRestarts analyzes restart patterns.
func (e *PodExplainer) analyzeRestarts(pod *corev1.Pod, events *corev1.EventList) *RestartAnalysis {
	analysis := &RestartAnalysis{}

	// Count total restarts
	for _, cs := range pod.Status.ContainerStatuses {
		analysis.TotalRestarts += cs.RestartCount
	}

	if analysis.TotalRestarts == 0 {
		analysis.Pattern = "stable"
		analysis.Recommendation = "No restarts detected. Pod is stable."
		return analysis
	}

	// Find recent restarts from events
	oneHourAgo := time.Now().Add(-time.Hour)
	for _, event := range events.Items {
		if event.Reason == "Started" && event.LastTimestamp.Time.After(oneHourAgo) {
			analysis.RecentRestarts++
		}
	}

	// Determine pattern
	if analysis.TotalRestarts > 10 && analysis.RecentRestarts > 5 {
		analysis.Pattern = "crashloop"
		analysis.Recommendation = "Pod is in a crash loop. Check application logs and exit codes for root cause."
	} else if analysis.TotalRestarts > 5 {
		analysis.Pattern = "frequent"
		analysis.Recommendation = "Pod has frequent restarts. Consider investigating memory limits and liveness probe configuration."
	} else if analysis.TotalRestarts > 1 {
		analysis.Pattern = "occasional"
		analysis.Recommendation = "Pod has occasional restarts. Monitor for patterns."
	} else {
		analysis.Pattern = "stable"
		analysis.Recommendation = "Single restart detected. May be due to initial startup issues."
	}

	// Collect exit codes
	exitCodeMap := make(map[int32]bool)
	for _, cs := range pod.Status.ContainerStatuses {
		if cs.LastTerminationState.Terminated != nil {
			exitCodeMap[cs.LastTerminationState.Terminated.ExitCode] = true
		}
	}
	for code := range exitCodeMap {
		analysis.CommonExitCodes = append(analysis.CommonExitCodes, code)
	}

	return analysis
}

// findProbeFailures extracts probe failure events.
func (e *PodExplainer) findProbeFailures(events *corev1.EventList) []ProbeFailure {
	var failures []ProbeFailure

	for _, event := range events.Items {
		if strings.Contains(event.Reason, "Unhealthy") {
			probeType := "unknown"
			if strings.Contains(event.Message, "Liveness") {
				probeType = "liveness"
			} else if strings.Contains(event.Message, "Readiness") {
				probeType = "readiness"
			} else if strings.Contains(event.Message, "Startup") {
				probeType = "startup"
			}

			failures = append(failures, ProbeFailure{
				ContainerName: "", // Would need to parse from message
				ProbeType:     probeType,
				Message:       event.Message,
				Timestamp:     event.LastTimestamp.Time,
			})
		}
	}

	return failures
}

// analyzeResourcePressure checks for resource-related issues.
func (e *PodExplainer) analyzeResourcePressure(pod *corev1.Pod, events *corev1.EventList) *ResourcePressure {
	pressure := &ResourcePressure{}

	// Check for OOMKilled
	for _, cs := range pod.Status.ContainerStatuses {
		if cs.LastTerminationState.Terminated != nil {
			if cs.LastTerminationState.Terminated.Reason == "OOMKilled" {
				pressure.MemoryPressure = true
			}
		}
	}

	// Check events for resource-related issues
	for _, event := range events.Items {
		if strings.Contains(event.Message, "OOMKilled") {
			pressure.MemoryPressure = true
		}
		if strings.Contains(event.Message, "cpu throttl") {
			pressure.CPUThrottled = true
		}
	}

	if pressure.MemoryPressure && pressure.CPUThrottled {
		pressure.Summary = "Pod is experiencing both memory pressure (OOMKilled) and CPU throttling"
	} else if pressure.MemoryPressure {
		pressure.Summary = "Pod has been OOMKilled - consider increasing memory limits"
	} else if pressure.CPUThrottled {
		pressure.Summary = "Pod is being CPU throttled - consider increasing CPU limits"
	}

	if !pressure.MemoryPressure && !pressure.CPUThrottled {
		return nil
	}

	return pressure
}

// generateKeyFindings creates a list of important findings.
func (e *PodExplainer) generateKeyFindings(explanation *PodExplanation, pod *corev1.Pod) []Finding {
	var findings []Finding

	// Check restart analysis
	if explanation.RestartAnalysis != nil {
		if explanation.RestartAnalysis.Pattern == "crashloop" {
			findings = append(findings, Finding{
				Category:    "health",
				Description: "Pod is in CrashLoopBackOff - containers are repeatedly crashing",
				Severity:    "error",
				Suggestion:  "Check application logs and fix the root cause of crashes",
			})
		} else if explanation.RestartAnalysis.TotalRestarts > 0 {
			findings = append(findings, Finding{
				Category:    "health",
				Description: fmt.Sprintf("Pod has restarted %d times", explanation.RestartAnalysis.TotalRestarts),
				Severity:    "warning",
				Suggestion:  "Review exit codes and logs to understand restart causes",
			})
		}
	}

	// Check resource pressure
	if explanation.ResourcePressure != nil {
		if explanation.ResourcePressure.MemoryPressure {
			findings = append(findings, Finding{
				Category:    "resources",
				Description: "Container was OOMKilled - out of memory",
				Severity:    "error",
				Suggestion:  "Increase memory limits or optimize application memory usage",
			})
		}
		if explanation.ResourcePressure.CPUThrottled {
			findings = append(findings, Finding{
				Category:    "resources",
				Description: "Container is being CPU throttled",
				Severity:    "warning",
				Suggestion:  "Increase CPU limits if application performance is affected",
			})
		}
	}

	// Check probe failures
	if len(explanation.ProbeFailures) > 0 {
		findings = append(findings, Finding{
			Category:    "health",
			Description: fmt.Sprintf("%d probe failures detected", len(explanation.ProbeFailures)),
			Severity:    "warning",
			Suggestion:  "Review probe configuration and ensure application responds in time",
		})
	}

	// Check container issues
	for _, container := range explanation.Containers {
		if len(container.Issues) > 0 {
			for _, issue := range container.Issues {
				findings = append(findings, Finding{
					Category:    "health",
					Description: fmt.Sprintf("Container %s: %s", container.Name, issue),
					Severity:    "warning",
				})
			}
		}
	}

	// Add a positive finding if everything is healthy
	if len(findings) == 0 && explanation.Status == "healthy" {
		findings = append(findings, Finding{
			Category:    "health",
			Description: "Pod is healthy and operating normally",
			Severity:    "info",
		})
	}

	return findings
}

