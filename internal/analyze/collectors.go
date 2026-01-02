// Copyright 2025 KubeGraf Contributors
//
// Licensed under the Apache License, Version 2.0 (the "License")
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package analyze

import (
	"context"
	"fmt"
	"io"
	"strings"
	"time"

	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"
	metricsclientset "k8s.io/metrics/pkg/client/clientset/versioned"
)

// Evidence contains all collected evidence for analysis
type Evidence struct {
	PodStatus *PodStatusEvidence `json:"podStatus,omitempty"`
	Events    []EventEvidence    `json:"events,omitempty"`
	Logs      []LogEvidence      `json:"logs,omitempty"`
	Metrics   *MetricsEvidence   `json:"metrics,omitempty"`
	Skipped   []string           `json:"skipped,omitempty"`
}

// PodStatusEvidence contains pod status information
type PodStatusEvidence struct {
	Phase             string            `json:"phase"`
	Reason            string            `json:"reason,omitempty"`
	Restarts          int32             `json:"restarts"`
	LastTermination   *TerminationState `json:"lastTermination,omitempty"`
	ContainerStatuses []ContainerStatus `json:"containerStatuses,omitempty"`
}

// TerminationState contains information about container termination
type TerminationState struct {
	Reason     string     `json:"reason,omitempty"`
	ExitCode   int32      `json:"exitCode,omitempty"`
	Message    string     `json:"message,omitempty"`
	FinishedAt *time.Time `json:"finishedAt,omitempty"`
}

// ContainerStatus contains status for a single container
type ContainerStatus struct {
	Name         string          `json:"name"`
	Ready        bool            `json:"ready"`
	RestartCount int32           `json:"restartCount"`
	State        ContainerState  `json:"state"`
	LastState    *ContainerState `json:"lastState,omitempty"`
}

// ContainerState represents container state
type ContainerState struct {
	Waiting    *ContainerStateWaiting    `json:"waiting,omitempty"`
	Running    *ContainerStateRunning    `json:"running,omitempty"`
	Terminated *ContainerStateTerminated `json:"terminated,omitempty"`
}

type ContainerStateWaiting struct {
	Reason  string `json:"reason,omitempty"`
	Message string `json:"message,omitempty"`
}

type ContainerStateRunning struct {
	StartedAt *time.Time `json:"startedAt,omitempty"`
}

type ContainerStateTerminated struct {
	ExitCode   int32      `json:"exitCode"`
	Reason     string     `json:"reason,omitempty"`
	Message    string     `json:"message,omitempty"`
	FinishedAt *time.Time `json:"finishedAt,omitempty"`
}

// EventEvidence contains Kubernetes event information
type EventEvidence struct {
	Type      string    `json:"type"`
	Reason    string    `json:"reason"`
	Message   string    `json:"message"`
	Timestamp time.Time `json:"timestamp"`
	Object    string    `json:"object,omitempty"`
}

// LogEvidence contains log lines from a container
type LogEvidence struct {
	Container string   `json:"container"`
	Lines     []string `json:"lines"`
	Error     string   `json:"error,omitempty"`
}

// MetricsEvidence contains resource metrics
type MetricsEvidence struct {
	Available  bool               `json:"available"`
	Containers []ContainerMetrics `json:"containers,omitempty"`
	Error      string             `json:"error,omitempty"`
}

// ContainerMetrics contains metrics for a container
type ContainerMetrics struct {
	Name       string  `json:"name"`
	CPUUsage   string  `json:"cpuUsage,omitempty"`
	MemUsage   string  `json:"memUsage,omitempty"`
	MemLimit   string  `json:"memLimit,omitempty"`
	MemPercent float64 `json:"memPercent,omitempty"`
	NearLimit  bool    `json:"nearLimit,omitempty"`
}

// CollectEvidence collects all evidence for a pod
func CollectEvidence(ctx context.Context, clientset *kubernetes.Clientset, metricsClient metricsclientset.Interface, namespace, podName string, since time.Duration, tailLines int64) (*Evidence, error) {
	evidence := &Evidence{}

	// Collect pod status
	pod, err := clientset.CoreV1().Pods(namespace).Get(ctx, podName, metav1.GetOptions{})
	if err != nil {
		return nil, fmt.Errorf("get pod: %w", err)
	}

	evidence.PodStatus = collectPodStatus(pod)

	// Collect events
	events, skipped := collectEvents(ctx, clientset, namespace, pod, 20)
	evidence.Events = events
	if skipped != "" {
		evidence.Skipped = append(evidence.Skipped, skipped)
	}

	// Collect logs
	logs, skipped := collectLogs(ctx, clientset, namespace, pod, since, tailLines)
	evidence.Logs = logs
	if skipped != "" {
		evidence.Skipped = append(evidence.Skipped, skipped)
	}

	// Collect metrics (optional)
	metrics, skipped := collectMetrics(ctx, metricsClient, namespace, pod)
	evidence.Metrics = metrics
	if skipped != "" {
		evidence.Skipped = append(evidence.Skipped, skipped)
	}

	return evidence, nil
}

func collectPodStatus(pod *corev1.Pod) *PodStatusEvidence {
	status := &PodStatusEvidence{
		Phase:    string(pod.Status.Phase),
		Reason:   pod.Status.Reason,
		Restarts: 0,
	}

	var lastTermination *TerminationState
	var containerStatuses []ContainerStatus

	for _, cs := range pod.Status.ContainerStatuses {
		status.Restarts += cs.RestartCount

		containerStatus := ContainerStatus{
			Name:         cs.Name,
			Ready:        cs.Ready,
			RestartCount: cs.RestartCount,
		}

		// Current state
		if cs.State.Waiting != nil {
			containerStatus.State.Waiting = &ContainerStateWaiting{
				Reason:  cs.State.Waiting.Reason,
				Message: cs.State.Waiting.Message,
			}
		}
		if cs.State.Running != nil {
			containerStatus.State.Running = &ContainerStateRunning{
				StartedAt: &cs.State.Running.StartedAt.Time,
			}
		}
		if cs.State.Terminated != nil {
			containerStatus.State.Terminated = &ContainerStateTerminated{
				ExitCode:   cs.State.Terminated.ExitCode,
				Reason:     cs.State.Terminated.Reason,
				Message:    cs.State.Terminated.Message,
				FinishedAt: &cs.State.Terminated.FinishedAt.Time,
			}
		}

		// Last state (for termination info)
		if cs.LastTerminationState.Terminated != nil {
			term := &TerminationState{
				Reason:     cs.LastTerminationState.Terminated.Reason,
				ExitCode:   cs.LastTerminationState.Terminated.ExitCode,
				Message:    cs.LastTerminationState.Terminated.Message,
				FinishedAt: &cs.LastTerminationState.Terminated.FinishedAt.Time,
			}
			containerStatus.LastState = &ContainerState{
				Terminated: &ContainerStateTerminated{
					ExitCode:   term.ExitCode,
					Reason:     term.Reason,
					Message:    term.Message,
					FinishedAt: term.FinishedAt,
				},
			}
			lastTermination = term
		}

		containerStatuses = append(containerStatuses, containerStatus)
	}

	status.ContainerStatuses = containerStatuses
	status.LastTermination = lastTermination

	return status
}

func collectEvents(ctx context.Context, clientset *kubernetes.Clientset, namespace string, pod *corev1.Pod, limit int) ([]EventEvidence, string) {
	fieldSelector := fmt.Sprintf("involvedObject.uid=%s", pod.UID)
	events, err := clientset.CoreV1().Events(namespace).List(ctx, metav1.ListOptions{
		FieldSelector: fieldSelector,
		Limit:         int64(limit * 2), // Get more, then sort and limit
	})
	if err != nil {
		return nil, fmt.Sprintf("Events (skipped due to permissions: %v)", err)
	}

	// Sort by time (most recent first)
	eventList := events.Items
	for i := 0; i < len(eventList)-1; i++ {
		for j := i + 1; j < len(eventList); j++ {
			if eventList[i].LastTimestamp.Time.Before(eventList[j].LastTimestamp.Time) {
				eventList[i], eventList[j] = eventList[j], eventList[i]
			}
		}
	}

	// Limit to most recent N
	if len(eventList) > limit {
		eventList = eventList[:limit]
	}

	var evidence []EventEvidence
	for _, ev := range eventList {
		evidence = append(evidence, EventEvidence{
			Type:      ev.Type,
			Reason:    ev.Reason,
			Message:   ev.Message,
			Timestamp: ev.LastTimestamp.Time,
			Object:    fmt.Sprintf("%s/%s", ev.InvolvedObject.Kind, ev.InvolvedObject.Name),
		})
	}

	return evidence, ""
}

func collectLogs(ctx context.Context, clientset *kubernetes.Clientset, namespace string, pod *corev1.Pod, since time.Duration, tailLines int64) ([]LogEvidence, string) {
	var logs []LogEvidence

	for _, container := range pod.Spec.Containers {
		logEvidence := LogEvidence{
			Container: container.Name,
		}

		sinceSeconds := int64(since.Seconds())
		logOptions := &corev1.PodLogOptions{
			Container:    container.Name,
			TailLines:    &tailLines,
			SinceSeconds: &sinceSeconds,
		}

		req := clientset.CoreV1().Pods(namespace).GetLogs(pod.Name, logOptions)
		stream, err := req.Stream(ctx)
		if err != nil {
			logEvidence.Error = fmt.Sprintf("Failed to get logs: %v", err)
			logs = append(logs, logEvidence)
			continue
		}

		data, err := io.ReadAll(stream)
		stream.Close()
		if err != nil {
			logEvidence.Error = fmt.Sprintf("Failed to read logs: %v", err)
			logs = append(logs, logEvidence)
			continue
		}

		// Split into lines
		lines := strings.Split(string(data), "\n")
		// Filter empty lines
		var nonEmptyLines []string
		for _, line := range lines {
			if strings.TrimSpace(line) != "" {
				nonEmptyLines = append(nonEmptyLines, line)
			}
		}
		logEvidence.Lines = nonEmptyLines
		logs = append(logs, logEvidence)
	}

	// Try previous logs if restarts > 0
	if pod.Status.ContainerStatuses != nil {
		for _, cs := range pod.Status.ContainerStatuses {
			if cs.RestartCount > 0 {
				// Try to get previous logs (best-effort)
				for i := range logs {
					if logs[i].Container == cs.Name && logs[i].Error == "" {
						prevLogOptions := &corev1.PodLogOptions{
							Container: cs.Name,
							TailLines: &tailLines,
							Previous:  true,
						}
						req := clientset.CoreV1().Pods(namespace).GetLogs(pod.Name, prevLogOptions)
						stream, err := req.Stream(ctx)
						if err == nil {
							data, err := io.ReadAll(stream)
							stream.Close()
							if err == nil {
								lines := strings.Split(string(data), "\n")
								var nonEmptyLines []string
								for _, line := range lines {
									if strings.TrimSpace(line) != "" {
										nonEmptyLines = append(nonEmptyLines, line)
									}
								}
								// Note: We could add previous logs separately, but for simplicity
								// we'll just note that previous logs were checked
							}
						}
					}
				}
			}
		}
	}

	return logs, ""
}

func collectMetrics(ctx context.Context, metricsClient metricsclientset.Interface, namespace string, pod *corev1.Pod) (*MetricsEvidence, string) {
	if metricsClient == nil {
		return &MetricsEvidence{
			Available: false,
			Error:     "Metrics client not available",
		}, "Resource metrics (unavailable → skipped)"
	}

	podMetrics, err := metricsClient.MetricsV1beta1().PodMetricses(namespace).Get(ctx, pod.Name, metav1.GetOptions{})
	if err != nil {
		return &MetricsEvidence{
			Available: false,
			Error:     fmt.Sprintf("Metrics API not available: %v", err),
		}, "Resource metrics (unavailable → skipped)"
	}

	metrics := &MetricsEvidence{
		Available: true,
	}

	// Calculate container metrics
	for _, container := range podMetrics.Containers {
		containerMetrics := ContainerMetrics{
			Name: container.Name,
		}

		// CPU usage
		if !container.Usage.Cpu().IsZero() {
			containerMetrics.CPUUsage = container.Usage.Cpu().String()
		}

		// Memory usage
		if !container.Usage.Memory().IsZero() {
			containerMetrics.MemUsage = container.Usage.Memory().String()
		}

		// Find memory limit from pod spec
		for _, c := range pod.Spec.Containers {
			if c.Name == container.Name {
				if c.Resources.Limits != nil {
					if memLimit := c.Resources.Limits.Memory(); !memLimit.IsZero() {
						containerMetrics.MemLimit = memLimit.String()
						// Calculate percentage
						memUsage := container.Usage.Memory()
						if !memUsage.IsZero() && !memLimit.IsZero() {
							usageBytes := memUsage.Value()
							limitBytes := memLimit.Value()
							if limitBytes > 0 {
								containerMetrics.MemPercent = float64(usageBytes) / float64(limitBytes) * 100
								if containerMetrics.MemPercent > 80 {
									containerMetrics.NearLimit = true
								}
							}
						}
					}
				}
				break
			}
		}

		metrics.Containers = append(metrics.Containers, containerMetrics)
	}

	return metrics, ""
}
