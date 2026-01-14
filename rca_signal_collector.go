// Copyright 2025 KubeGraf Contributors
// SPDX-License-Identifier: Apache-2.0

package main

import (
	"context"
	"fmt"
	"regexp"
	"strings"
	"time"

	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// SignalCollector collects signals from various sources in the cluster
type SignalCollector struct {
	app *App
}

// NewSignalCollector creates a new signal collector
func NewSignalCollector(app *App) *SignalCollector {
	return &SignalCollector{
		app: app,
	}
}

// CollectSignals collects all relevant signals for an incident within a time window
func (sc *SignalCollector) CollectSignals(ctx context.Context, req AnalysisRequest) ([]Signal, error) {
	signals := []Signal{}

	// Determine time window
	window := sc.determineTimeWindow(req)

	// Collect pod signals
	podSignals, err := sc.collectPodSignals(ctx, req.Resource, window)
	if err == nil {
		signals = append(signals, podSignals...)
	}

	// Collect node signals
	nodeSignals, err := sc.collectNodeSignals(ctx, req.Resource, window)
	if err == nil {
		signals = append(signals, nodeSignals...)
	}

	// Collect event signals
	eventSignals, err := sc.collectEventSignals(ctx, req.Resource, window)
	if err == nil {
		signals = append(signals, eventSignals...)
	}

	// Collect log signals (if requested)
	if req.IncludeLogs {
		logSignals, err := sc.collectLogSignals(ctx, req.Resource, window)
		if err == nil {
			signals = append(signals, logSignals...)
		}
	}

	// Sort signals by timestamp
	sc.sortSignalsByTime(signals)

	return signals, nil
}

// determineTimeWindow calculates the appropriate time window for signal collection
func (sc *SignalCollector) determineTimeWindow(req AnalysisRequest) SignalWindow {
	window := SignalWindow{}

	if req.StartTime.IsZero() {
		// Default: look back 30 minutes
		window.StartTime = time.Now().Add(-30 * time.Minute)
	} else {
		// Look back from incident start
		lookback := time.Duration(req.LookbackMinutes) * time.Minute
		if lookback == 0 {
			lookback = 30 * time.Minute
		}
		window.StartTime = req.StartTime.Add(-lookback)
	}

	if req.EndTime == nil {
		window.EndTime = time.Now()
	} else {
		window.EndTime = *req.EndTime
	}

	window.Resource = &req.Resource

	return window
}

// collectPodSignals collects signals from pod status and lifecycle
func (sc *SignalCollector) collectPodSignals(ctx context.Context, resource ResourceReference, window SignalWindow) ([]Signal, error) {
	signals := []Signal{}

	if sc.app.clientset == nil {
		return signals, fmt.Errorf("clientset not available")
	}

	// Get the pod
	pod, err := sc.app.clientset.CoreV1().Pods(resource.Namespace).Get(ctx, resource.Name, metav1.GetOptions{})
	if err != nil {
		// Pod might have been deleted - try to get info from events
		return signals, err
	}

	// Analyze pod phase transitions
	if pod.Status.Phase == corev1.PodFailed {
		signals = append(signals, Signal{
			ID:        fmt.Sprintf("pod-failed-%s", pod.UID),
			Type:      SignalTypePodStatus,
			Source:    "pod",
			Timestamp: time.Now(), // Use current time since we don't have exact failure time
			Resource:  resource,
			Severity:  "critical",
			Message:   fmt.Sprintf("Pod is in Failed phase: %s", pod.Status.Reason),
			Metadata: map[string]interface{}{
				"phase":   pod.Status.Phase,
				"reason":  pod.Status.Reason,
				"message": pod.Status.Message,
			},
		})
	}

	// Analyze container statuses
	for _, containerStatus := range pod.Status.ContainerStatuses {
		// Check for OOMKilled
		if containerStatus.LastTerminationState.Terminated != nil {
			term := containerStatus.LastTerminationState.Terminated
			if term.Reason == "OOMKilled" {
				signals = append(signals, Signal{
					ID:        fmt.Sprintf("oom-%s-%s", pod.UID, containerStatus.Name),
					Type:      SignalTypePodOOMKilled,
					Source:    "pod",
					Timestamp: term.FinishedAt.Time,
					Resource:  resource,
					Severity:  "critical",
					Message:   fmt.Sprintf("Container %s was OOMKilled", containerStatus.Name),
					Metadata: map[string]interface{}{
						"container":  containerStatus.Name,
						"exitCode":   term.ExitCode,
						"reason":     term.Reason,
						"startedAt":  term.StartedAt.Time,
						"finishedAt": term.FinishedAt.Time,
					},
				})
			}

			// Check for graceful shutdown issues
			if term.ExitCode == 137 { // SIGKILL
				gracePeriod := int64(30)
				if pod.Spec.TerminationGracePeriodSeconds != nil {
					gracePeriod = *pod.Spec.TerminationGracePeriodSeconds
				}

				signals = append(signals, Signal{
					ID:        fmt.Sprintf("sigkill-%s-%s", pod.UID, containerStatus.Name),
					Type:      SignalTypeGracefulShutdown,
					Source:    "pod",
					Timestamp: term.FinishedAt.Time,
					Resource:  resource,
					Severity:  "warning",
					Message:   fmt.Sprintf("Container %s was force-killed (SIGKILL), possible graceful shutdown failure", containerStatus.Name),
					Metadata: map[string]interface{}{
						"container":                containerStatus.Name,
						"exitCode":                 term.ExitCode,
						"terminationGracePeriod":   gracePeriod,
						"duration":                 term.FinishedAt.Time.Sub(term.StartedAt.Time).Seconds(),
					},
				})
			}
		}

		// Check for CrashLoopBackOff
		if containerStatus.State.Waiting != nil {
			waiting := containerStatus.State.Waiting
			if waiting.Reason == "CrashLoopBackOff" {
				signals = append(signals, Signal{
					ID:        fmt.Sprintf("crashloop-%s-%s", pod.UID, containerStatus.Name),
					Type:      SignalTypePodCrashLoop,
					Source:    "pod",
					Timestamp: time.Now(),
					Resource:  resource,
					Severity:  "critical",
					Message:   fmt.Sprintf("Container %s is in CrashLoopBackOff", containerStatus.Name),
					Metadata: map[string]interface{}{
						"container":    containerStatus.Name,
						"restartCount": containerStatus.RestartCount,
						"reason":       waiting.Reason,
						"message":      waiting.Message,
					},
				})
			}

			// Check for ImagePullBackOff
			if waiting.Reason == "ImagePullBackOff" || waiting.Reason == "ErrImagePull" {
				signals = append(signals, Signal{
					ID:        fmt.Sprintf("imagepull-%s-%s", pod.UID, containerStatus.Name),
					Type:      SignalTypePodImagePull,
					Source:    "pod",
					Timestamp: time.Now(),
					Resource:  resource,
					Severity:  "warning",
					Message:   fmt.Sprintf("Container %s cannot pull image: %s", containerStatus.Name, waiting.Message),
					Metadata: map[string]interface{}{
						"container": containerStatus.Name,
						"reason":    waiting.Reason,
						"message":   waiting.Message,
					},
				})
			}
		}

		// Track restarts
		if containerStatus.RestartCount > 0 {
			signals = append(signals, Signal{
				ID:        fmt.Sprintf("restart-%s-%s-%d", pod.UID, containerStatus.Name, containerStatus.RestartCount),
				Type:      SignalTypePodRestart,
				Source:    "pod",
				Timestamp: time.Now(),
				Resource:  resource,
				Severity:  "info",
				Message:   fmt.Sprintf("Container %s has restarted %d times", containerStatus.Name, containerStatus.RestartCount),
				Metadata: map[string]interface{}{
					"container":    containerStatus.Name,
					"restartCount": containerStatus.RestartCount,
				},
			})
		}

		// Check for CreateContainerConfigError (usually missing env vars, secrets, configmaps)
		if containerStatus.State.Waiting != nil {
			waiting := containerStatus.State.Waiting
			if waiting.Reason == "CreateContainerConfigError" {
				// Parse the error message to identify the issue
				message := waiting.Message
				var configIssue string
				var missingResource string

				if strings.Contains(message, "not found") || strings.Contains(message, "doesn't exist") {
					if strings.Contains(message, "secret") {
						configIssue = "missing_secret"
						missingResource = extractResourceName(message, "secret")
					} else if strings.Contains(message, "configmap") {
						configIssue = "missing_configmap"
						missingResource = extractResourceName(message, "configmap")
					} else if strings.Contains(message, "serviceaccount") {
						configIssue = "missing_serviceaccount"
						missingResource = extractResourceName(message, "serviceaccount")
					} else {
						configIssue = "config_error"
					}
				}

				signals = append(signals, Signal{
					ID:        fmt.Sprintf("config-error-%s-%s", pod.UID, containerStatus.Name),
					Type:      SignalTypeConfigError,
					Source:    "pod",
					Timestamp: time.Now(),
					Resource:  resource,
					Severity:  "critical",
					Message:   fmt.Sprintf("Container %s has configuration error: %s", containerStatus.Name, message),
					Metadata: map[string]interface{}{
						"container":       containerStatus.Name,
						"reason":          waiting.Reason,
						"message":         message,
						"configIssue":     configIssue,
						"missingResource": missingResource,
					},
				})
			}
		}
	}

	// Check for missing environment variable references in pod spec
	for _, container := range pod.Spec.Containers {
		for _, envVar := range container.Env {
			// Check for ValueFrom references (ConfigMap or Secret)
			if envVar.ValueFrom != nil {
				if envVar.ValueFrom.ConfigMapKeyRef != nil {
					cmRef := envVar.ValueFrom.ConfigMapKeyRef
					// Try to get the ConfigMap
					_, err := sc.app.clientset.CoreV1().ConfigMaps(resource.Namespace).Get(ctx, cmRef.Name, metav1.GetOptions{})
					if err != nil {
						signals = append(signals, Signal{
							ID:        fmt.Sprintf("missing-configmap-%s-%s-%s", pod.UID, container.Name, cmRef.Name),
							Type:      SignalTypeConfigError,
							Source:    "pod",
							Timestamp: time.Now(),
							Resource:  resource,
							Severity:  "critical",
							Message:   fmt.Sprintf("Environment variable %s references missing ConfigMap %s", envVar.Name, cmRef.Name),
							Metadata: map[string]interface{}{
								"container":          container.Name,
								"envVar":             envVar.Name,
								"configMapName":      cmRef.Name,
								"configMapKey":       cmRef.Key,
								"configIssue":        "missing_configmap",
								"missingResource":    cmRef.Name,
							},
						})
					}
				}

				if envVar.ValueFrom.SecretKeyRef != nil {
					secretRef := envVar.ValueFrom.SecretKeyRef
					// Try to get the Secret
					_, err := sc.app.clientset.CoreV1().Secrets(resource.Namespace).Get(ctx, secretRef.Name, metav1.GetOptions{})
					if err != nil {
						signals = append(signals, Signal{
							ID:        fmt.Sprintf("missing-secret-%s-%s-%s", pod.UID, container.Name, secretRef.Name),
							Type:      SignalTypeConfigError,
							Source:    "pod",
							Timestamp: time.Now(),
							Resource:  resource,
							Severity:  "critical",
							Message:   fmt.Sprintf("Environment variable %s references missing Secret %s", envVar.Name, secretRef.Name),
							Metadata: map[string]interface{}{
								"container":       container.Name,
								"envVar":          envVar.Name,
								"secretName":      secretRef.Name,
								"secretKey":       secretRef.Key,
								"configIssue":     "missing_secret",
								"missingResource": secretRef.Name,
							},
						})
					}
				}
			}
		}

		// Check for EnvFrom references
		for _, envFrom := range container.EnvFrom {
			if envFrom.ConfigMapRef != nil {
				cmRef := envFrom.ConfigMapRef
				_, err := sc.app.clientset.CoreV1().ConfigMaps(resource.Namespace).Get(ctx, cmRef.Name, metav1.GetOptions{})
				if err != nil {
					signals = append(signals, Signal{
						ID:        fmt.Sprintf("missing-configmap-envfrom-%s-%s-%s", pod.UID, container.Name, cmRef.Name),
						Type:      SignalTypeConfigError,
						Source:    "pod",
						Timestamp: time.Now(),
						Resource:  resource,
						Severity:  "critical",
						Message:   fmt.Sprintf("EnvFrom references missing ConfigMap %s", cmRef.Name),
						Metadata: map[string]interface{}{
							"container":       container.Name,
							"configMapName":   cmRef.Name,
							"configIssue":     "missing_configmap",
							"missingResource": cmRef.Name,
						},
					})
				}
			}

			if envFrom.SecretRef != nil {
				secretRef := envFrom.SecretRef
				_, err := sc.app.clientset.CoreV1().Secrets(resource.Namespace).Get(ctx, secretRef.Name, metav1.GetOptions{})
				if err != nil {
					signals = append(signals, Signal{
						ID:        fmt.Sprintf("missing-secret-envfrom-%s-%s-%s", pod.UID, container.Name, secretRef.Name),
						Type:      SignalTypeConfigError,
						Source:    "pod",
						Timestamp: time.Now(),
						Resource:  resource,
						Severity:  "critical",
						Message:   fmt.Sprintf("EnvFrom references missing Secret %s", secretRef.Name),
						Metadata: map[string]interface{}{
							"container":       container.Name,
							"secretName":      secretRef.Name,
							"configIssue":     "missing_secret",
							"missingResource": secretRef.Name,
						},
					})
				}
			}
		}
	}

	// Check for pending pods (scheduling issues)
	if pod.Status.Phase == corev1.PodPending {
		signals = append(signals, Signal{
			ID:        fmt.Sprintf("pending-%s", pod.UID),
			Type:      SignalTypePodPending,
			Source:    "pod",
			Timestamp: pod.CreationTimestamp.Time,
			Resource:  resource,
			Severity:  "warning",
			Message:   "Pod is stuck in Pending state",
			Metadata: map[string]interface{}{
				"phase":      pod.Status.Phase,
				"conditions": pod.Status.Conditions,
			},
		})
	}

	return signals, nil
}

// collectNodeSignals collects signals from node status
func (sc *SignalCollector) collectNodeSignals(ctx context.Context, resource ResourceReference, window SignalWindow) ([]Signal, error) {
	signals := []Signal{}

	if sc.app.clientset == nil {
		return signals, fmt.Errorf("clientset not available")
	}

	// First, find which node the pod was/is running on
	pod, err := sc.app.clientset.CoreV1().Pods(resource.Namespace).Get(ctx, resource.Name, metav1.GetOptions{})
	if err != nil {
		return signals, err
	}

	if pod.Spec.NodeName == "" {
		return signals, nil
	}

	// Get node information
	node, err := sc.app.clientset.CoreV1().Nodes().Get(ctx, pod.Spec.NodeName, metav1.GetOptions{})
	if err != nil {
		// Node might have been deleted (preemption scenario)
		signals = append(signals, Signal{
			ID:        fmt.Sprintf("node-deleted-%s", pod.Spec.NodeName),
			Type:      SignalTypeNodeTerminated,
			Source:    "node",
			Timestamp: time.Now(),
			Resource: ResourceReference{
				Kind: "Node",
				Name: pod.Spec.NodeName,
			},
			Severity: "critical",
			Message:  fmt.Sprintf("Node %s no longer exists (possibly preempted/terminated)", pod.Spec.NodeName),
			Metadata: map[string]interface{}{
				"nodeName": pod.Spec.NodeName,
			},
		})
		return signals, nil
	}

	// Check for node conditions
	for _, condition := range node.Status.Conditions {
		// Node not ready
		if condition.Type == corev1.NodeReady && condition.Status != corev1.ConditionTrue {
			if condition.LastTransitionTime.Time.After(window.StartTime) {
				signals = append(signals, Signal{
					ID:        fmt.Sprintf("node-notready-%s", node.Name),
					Type:      SignalTypeNodeNotReady,
					Source:    "node",
					Timestamp: condition.LastTransitionTime.Time,
					Resource: ResourceReference{
						Kind: "Node",
						Name: node.Name,
					},
					Severity: "critical",
					Message:  fmt.Sprintf("Node %s is not ready: %s", node.Name, condition.Message),
					Metadata: map[string]interface{}{
						"reason":  condition.Reason,
						"message": condition.Message,
					},
				})
			}
		}

		// Node pressure conditions
		if condition.Type == corev1.NodeMemoryPressure ||
			condition.Type == corev1.NodeDiskPressure ||
			condition.Type == corev1.NodePIDPressure {
			if condition.Status == corev1.ConditionTrue &&
				condition.LastTransitionTime.Time.After(window.StartTime) {
				signals = append(signals, Signal{
					ID:        fmt.Sprintf("node-pressure-%s-%s", node.Name, condition.Type),
					Type:      SignalTypeNodePressure,
					Source:    "node",
					Timestamp: condition.LastTransitionTime.Time,
					Resource: ResourceReference{
						Kind: "Node",
						Name: node.Name,
					},
					Severity: "warning",
					Message:  fmt.Sprintf("Node %s has %s", node.Name, condition.Type),
					Metadata: map[string]interface{}{
						"pressureType": condition.Type,
						"reason":       condition.Reason,
						"message":      condition.Message,
					},
				})
			}
		}
	}

	// Check for spot/preemptible node taints
	for _, taint := range node.Spec.Taints {
		if strings.Contains(taint.Key, "preempt") ||
			strings.Contains(taint.Key, "spot") ||
			taint.Key == "cloud.google.com/gke-preemptible" {
			signals = append(signals, Signal{
				ID:        fmt.Sprintf("node-preemptible-%s", node.Name),
				Type:      SignalTypeNodePreempted,
				Source:    "node",
				Timestamp: time.Now(),
				Resource: ResourceReference{
					Kind: "Node",
					Name: node.Name,
				},
				Severity: "info",
				Message:  fmt.Sprintf("Node %s is preemptible/spot", node.Name),
				Metadata: map[string]interface{}{
					"taintKey":    taint.Key,
					"taintEffect": taint.Effect,
				},
			})
			break
		}
	}

	return signals, nil
}

// collectEventSignals collects signals from Kubernetes events
func (sc *SignalCollector) collectEventSignals(ctx context.Context, resource ResourceReference, window SignalWindow) ([]Signal, error) {
	signals := []Signal{}

	if sc.app.clientset == nil {
		return signals, fmt.Errorf("clientset not available")
	}

	// Get events for the resource
	events, err := sc.app.clientset.CoreV1().Events(resource.Namespace).List(ctx, metav1.ListOptions{
		FieldSelector: fmt.Sprintf("involvedObject.name=%s", resource.Name),
	})
	if err != nil {
		return signals, err
	}

	// Pattern matchers for specific scenarios
	preemptionPatterns := []*regexp.Regexp{
		regexp.MustCompile(`(?i)preempt`),
		regexp.MustCompile(`(?i)spot.*terminat`),
		regexp.MustCompile(`(?i)node.*terminat`),
	}

	dbConnectionPatterns := []*regexp.Regexp{
		regexp.MustCompile(`(?i)connection.*refused`),
		regexp.MustCompile(`(?i)could not connect.*database`),
		regexp.MustCompile(`(?i)db.*unavailable`),
		regexp.MustCompile(`(?i)timeout.*database`),
	}

	dnsFailurePatterns := []*regexp.Regexp{
		regexp.MustCompile(`(?i)dns.*fail`),
		regexp.MustCompile(`(?i)could not resolve`),
		regexp.MustCompile(`(?i)nxdomain`),
		regexp.MustCompile(`(?i)no such host`),
	}

	schedulingPatterns := []*regexp.Regexp{
		regexp.MustCompile(`(?i)insufficient.*resources`),
		regexp.MustCompile(`(?i)no nodes.*available`),
		regexp.MustCompile(`(?i)affinity.*constraint`),
		regexp.MustCompile(`(?i)taint.*toleration`),
	}

	for _, event := range events.Items {
		// Filter by time window
		if event.LastTimestamp.Time.Before(window.StartTime) || event.LastTimestamp.Time.After(window.EndTime) {
			continue
		}

		eventMessage := event.Message
		reason := event.Reason

		// Determine signal type based on event content
		signalType := SignalTypeEvent
		severity := "info"

		if event.Type == corev1.EventTypeWarning {
			severity = "warning"
		}

		// Check for node preemption signals
		for _, pattern := range preemptionPatterns {
			if pattern.MatchString(reason) || pattern.MatchString(eventMessage) {
				signalType = SignalTypeNodePreempted
				severity = "critical"
				break
			}
		}

		// Check for DB connection failures
		for _, pattern := range dbConnectionPatterns {
			if pattern.MatchString(eventMessage) {
				signalType = SignalTypeDBConnection
				severity = "warning"
				break
			}
		}

		// Check for DNS failures
		for _, pattern := range dnsFailurePatterns {
			if pattern.MatchString(eventMessage) {
				signalType = SignalTypeDNSFailure
				severity = "warning"
				break
			}
		}

		// Check for scheduling failures
		for _, pattern := range schedulingPatterns {
			if pattern.MatchString(eventMessage) || pattern.MatchString(reason) {
				signalType = SignalTypeSchedulingFailure
				severity = "warning"
				break
			}
		}

		// Special handling for specific event reasons
		metadata := map[string]interface{}{
			"reason":    reason,
			"eventType": event.Type,
			"count":     event.Count,
			"source":    event.Source.Component,
		}

		if reason == "FailedScheduling" {
			signalType = SignalTypeSchedulingFailure
			severity = "warning"

			// Analyze scheduling failure message for affinity issues
			msgLower := strings.ToLower(eventMessage)
			if strings.Contains(msgLower, "didn't match pod anti-affinity") ||
				strings.Contains(msgLower, "pod anti-affinity") ||
				strings.Contains(msgLower, "violates pod anti-affinity") ||
				strings.Contains(msgLower, "anti-affinity rules") {
				metadata["isAffinityIssue"] = true
				metadata["affinityType"] = "anti-affinity"
				metadata["failureReason"] = "Pod anti-affinity rules prevent scheduling"
			} else if strings.Contains(msgLower, "didn't match pod affinity") ||
				strings.Contains(msgLower, "pod affinity") ||
				strings.Contains(msgLower, "violates pod affinity") {
				metadata["isAffinityIssue"] = true
				metadata["affinityType"] = "affinity"
				metadata["failureReason"] = "Pod affinity rules prevent scheduling"
			} else if strings.Contains(msgLower, "insufficient") {
				if strings.Contains(msgLower, "cpu") {
					metadata["failureReason"] = "Insufficient CPU resources"
				} else if strings.Contains(msgLower, "memory") {
					metadata["failureReason"] = "Insufficient memory resources"
				} else {
					metadata["failureReason"] = "Insufficient resources"
				}
			} else if strings.Contains(msgLower, "taint") {
				metadata["failureReason"] = "Node taints prevent scheduling"
			}
		} else if reason == "Evicted" {
			signalType = SignalTypePodEvicted
			severity = "warning"
		}

		signals = append(signals, Signal{
			ID:        fmt.Sprintf("event-%s-%s", event.UID, event.LastTimestamp.Time.Unix()),
			Type:      signalType,
			Source:    "event",
			Timestamp: event.LastTimestamp.Time,
			Resource:  resource,
			Severity:  severity,
			Message:   eventMessage,
			Metadata:  metadata,
		})
	}

	return signals, nil
}

// collectLogSignals collects signals from container logs
func (sc *SignalCollector) collectLogSignals(ctx context.Context, resource ResourceReference, window SignalWindow) ([]Signal, error) {
	signals := []Signal{}

	if sc.app.clientset == nil {
		return signals, fmt.Errorf("clientset not available")
	}

	// Get pod to find containers
	pod, err := sc.app.clientset.CoreV1().Pods(resource.Namespace).Get(ctx, resource.Name, metav1.GetOptions{})
	if err != nil {
		return signals, err
	}

	// Pattern matchers for log analysis
	errorPatterns := map[SignalType]*regexp.Regexp{
		SignalTypeDBConnection: regexp.MustCompile(`(?i)(connection refused|could not connect|database.*unavailable|timeout.*database)`),
		SignalTypeDNSFailure:   regexp.MustCompile(`(?i)(dns.*fail|could not resolve|nxdomain|no such host)`),
	}

	// Get logs from each container (limit to recent logs for performance)
	for _, container := range pod.Spec.Containers {
		tailLines := int64(100) // Only get last 100 lines
		logOptions := &corev1.PodLogOptions{
			Container: container.Name,
			TailLines: &tailLines,
		}

		req := sc.app.clientset.CoreV1().Pods(resource.Namespace).GetLogs(resource.Name, logOptions)
		logs, err := req.DoRaw(ctx)
		if err != nil {
			continue
		}

		logContent := string(logs)

		// Analyze logs for patterns
		for signalType, pattern := range errorPatterns {
			if pattern.MatchString(logContent) {
				signals = append(signals, Signal{
					ID:        fmt.Sprintf("log-%s-%s-%s", pod.UID, container.Name, signalType),
					Type:      signalType,
					Source:    "log",
					Timestamp: time.Now(), // Use current time since we don't parse log timestamps
					Resource:  resource,
					Severity:  "warning",
					Message:   fmt.Sprintf("Container %s logs indicate %s", container.Name, signalType),
					Metadata: map[string]interface{}{
						"container": container.Name,
						"pattern":   signalType,
					},
				})
			}
		}
	}

	return signals, nil
}

// sortSignalsByTime sorts signals chronologically
func (sc *SignalCollector) sortSignalsByTime(signals []Signal) {
	// Simple bubble sort (sufficient for small signal sets)
	for i := 0; i < len(signals); i++ {
		for j := i + 1; j < len(signals); j++ {
			if signals[i].Timestamp.After(signals[j].Timestamp) {
				signals[i], signals[j] = signals[j], signals[i]
			}
		}
	}
}

// extractResourceName extracts resource name from error messages
// Example: "secret \"my-secret\" not found" -> "my-secret"
func extractResourceName(message, resourceType string) string {
	// Try to extract quoted resource name
	re := regexp.MustCompile(resourceType + `\s+"([^"]+)"`)
	matches := re.FindStringSubmatch(message)
	if len(matches) > 1 {
		return matches[1]
	}

	// Try to extract resource name without quotes
	re = regexp.MustCompile(resourceType + `\s+([a-z0-9-]+)`)
	matches = re.FindStringSubmatch(message)
	if len(matches) > 1 {
		return matches[1]
	}

	return ""
}
