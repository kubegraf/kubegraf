// Copyright 2025 KubeGraf Contributors
// SPDX-License-Identifier: Apache-2.0

package main

import (
	"fmt"
	"strings"
	"time"

	batchv1 "k8s.io/api/batch/v1"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/client-go/dynamic"
)

// IncidentScanner scans Kubernetes resources for incidents
type IncidentScanner struct {
	app *App
}

// NewIncidentScanner creates a new incident scanner
func NewIncidentScanner(app *App) *IncidentScanner {
	return &IncidentScanner{
		app: app,
	}
}

// ScanAllIncidents scans all Kubernetes resources for incidents
func (scanner *IncidentScanner) ScanAllIncidents(namespace string) []KubernetesIncident {
	incidents := []KubernetesIncident{}

	if scanner.app.clientset == nil || !scanner.app.connected {
		return incidents
	}

	// Check context cancellation
	select {
	case <-scanner.app.ctx.Done():
		return incidents
	default:
	}

	// Scan pods
	podIncidents := scanner.ScanPodsForIncidents(namespace)
	incidents = append(incidents, podIncidents...)

	// Check context cancellation
	select {
	case <-scanner.app.ctx.Done():
		return incidents
	default:
	}

	// Scan nodes
	nodeIncidents := scanner.ScanNodesForIncidents()
	incidents = append(incidents, nodeIncidents...)

	// Check context cancellation
	select {
	case <-scanner.app.ctx.Done():
		return incidents
	default:
	}

	// Scan jobs
	jobIncidents := scanner.ScanJobsForIncidents(namespace)
	incidents = append(incidents, jobIncidents...)

	// Check context cancellation
	select {
	case <-scanner.app.ctx.Done():
		return incidents
	default:
	}

	// Scan cronjobs
	cronJobIncidents := scanner.ScanCronJobsForIncidents(namespace)
	incidents = append(incidents, cronJobIncidents...)

	// Check context cancellation
	select {
	case <-scanner.app.ctx.Done():
		return incidents
	default:
	}

	// Scan events for node preemption, scale down, eviction, and connection failures
	eventIncidents := scanner.ScanEventsForIncidents(namespace)
	incidents = append(incidents, eventIncidents...)

	// Check context cancellation
	select {
	case <-scanner.app.ctx.Done():
		return incidents
	default:
	}

	// Scan cert-manager resources (Certificates, CertificateRequests, ClusterIssuers, Issuers)
	certManagerIncidents := scanner.ScanCertManagerForIncidents(namespace)
	incidents = append(incidents, certManagerIncidents...)

	return incidents
}

// ScanPodsForIncidents scans pods for OOMKilled and CrashLoopBackOff
func (scanner *IncidentScanner) ScanPodsForIncidents(namespace string) []KubernetesIncident {
	incidents := []KubernetesIncident{}

	// Check context cancellation before starting
	select {
	case <-scanner.app.ctx.Done():
		return incidents
	default:
	}

	// Use limit to avoid scanning too many pods at once (performance optimization)
	opts := metav1.ListOptions{
		Limit: 2000, // Increased limit to 2000 pods for better coverage
	}

	var pods *corev1.PodList
	var err error

	// If namespace is empty, scan all namespaces but skip system ones for performance
	if namespace == "" {
		// Get list of namespaces, but skip system namespaces
		namespaces, nsErr := scanner.app.clientset.CoreV1().Namespaces().List(scanner.app.ctx, metav1.ListOptions{})
		if nsErr != nil {
			return incidents
		}

		// Scan each non-system namespace (previously limited to first 10 namespaces)
		// For correctness, scan all user namespaces while still keeping per-namespace pod limits.
		maxNamespaces := len(namespaces.Items)
		scanned := 0
		for _, ns := range namespaces.Items {
			// Check context cancellation
			select {
			case <-scanner.app.ctx.Done():
				return incidents
			default:
			}

			// Skip system namespaces
			if ns.Name == "kube-system" || ns.Name == "kube-public" || ns.Name == "kube-node-lease" {
				continue
			}

			if scanned >= maxNamespaces {
				break
			}

			// Use smaller limit per namespace when scanning all namespaces
			nsOpts := metav1.ListOptions{
				Limit: 500, // Reduced limit per namespace when scanning multiple
			}
			nsPods, nsErr := scanner.app.clientset.CoreV1().Pods(ns.Name).List(scanner.app.ctx, nsOpts)
			if nsErr != nil {
				continue // Skip this namespace on error
			}

			// Process pods from this namespace (limit processing for performance)
			maxPodsPerNamespace := 500
			podCount := 0
			for i := range nsPods.Items {
				if podCount >= maxPodsPerNamespace {
					break
				}
				// Check context cancellation during processing
				select {
				case <-scanner.app.ctx.Done():
					return incidents
				default:
				}
				incidents = append(incidents, scanner.scanPodForIncidents(&nsPods.Items[i])...)
				podCount++
			}

			scanned++
		}
		return incidents
	}

	// Single namespace scan
	pods, err = scanner.app.clientset.CoreV1().Pods(namespace).List(scanner.app.ctx, opts)
	if err != nil {
		return incidents
	}

	// Process pods
	for _, pod := range pods.Items {
		incidents = append(incidents, scanner.scanPodForIncidents(&pod)...)
	}

	return incidents
}

// scanPodForIncidents scans a single pod for incidents (extracted for reuse)
func (scanner *IncidentScanner) scanPodForIncidents(pod *corev1.Pod) []KubernetesIncident {
	incidents := []KubernetesIncident{}

	// Helper function to check container status (used for both regular and init containers)
	checkContainerStatus := func(containerStatus corev1.ContainerStatus, containerName string, isInit bool) {
		// Check for OOMKilled
		if containerStatus.LastTerminationState.Terminated != nil {
			term := containerStatus.LastTerminationState.Terminated
			if term.Reason == "OOMKilled" {
				incidents = append(incidents, KubernetesIncident{
					ID:           fmt.Sprintf("oom-%s-%s-%s", pod.Namespace, pod.Name, containerName),
					Type:         "oom",
					Severity:     "critical",
					ResourceKind: "Pod",
					ResourceName: fmt.Sprintf("%s/%s", pod.Name, containerName),
					Namespace:    pod.Namespace,
					FirstSeen:    term.FinishedAt.Time,
					LastSeen:     term.FinishedAt.Time,
					Count:        1,
					Message:      fmt.Sprintf("Container %s was OOMKilled", containerName),
				})
			}
		}

		// Check for CrashLoopBackOff and other error states
		if containerStatus.State.Waiting != nil {
			waiting := containerStatus.State.Waiting
			if waiting.Reason == "CrashLoopBackOff" || waiting.Reason == "ImagePullBackOff" || waiting.Reason == "ErrImagePull" {
				severity := "warning"
				if waiting.Reason == "CrashLoopBackOff" {
					severity = "critical"
				}
				incidents = append(incidents, KubernetesIncident{
					ID:           fmt.Sprintf("crashloop-%s-%s-%s", pod.Namespace, pod.Name, containerName),
					Type:         "crashloop",
					Severity:     severity,
					ResourceKind: "Pod",
					ResourceName: fmt.Sprintf("%s/%s", pod.Name, containerName),
					Namespace:    pod.Namespace,
					FirstSeen:    pod.CreationTimestamp.Time,
					LastSeen:     time.Now(),
					Count:        int(containerStatus.RestartCount),
					Message:      fmt.Sprintf("Container %s: %s", containerName, waiting.Message),
				})
			}
		}

		// Check for high restart counts (potential issue indicator)
		if containerStatus.RestartCount > 5 {
			// Only report if not already reported as crashloop or oom
			alreadyReported := false
			for _, inc := range incidents {
				if inc.ResourceName == fmt.Sprintf("%s/%s", pod.Name, containerName) {
					alreadyReported = true
					break
				}
			}
			if !alreadyReported {
				incidents = append(incidents, KubernetesIncident{
					ID:           fmt.Sprintf("restarts-%s-%s-%s", pod.Namespace, pod.Name, containerName),
					Type:         "high_restarts",
					Severity:     "warning",
					ResourceKind: "Pod",
					ResourceName: fmt.Sprintf("%s/%s", pod.Name, containerName),
					Namespace:    pod.Namespace,
					FirstSeen:    pod.CreationTimestamp.Time,
					LastSeen:     time.Now(),
					Count:        int(containerStatus.RestartCount),
					Message:      fmt.Sprintf("Container %s has restarted %d times", containerName, containerStatus.RestartCount),
				})
			}
		}

		// Check for recent restarts (within last 2 hours) - important for detecting spot instance rescheduling
		if containerStatus.RestartCount > 0 && containerStatus.LastTerminationState.Terminated != nil {
			lastRestart := containerStatus.LastTerminationState.Terminated.FinishedAt.Time
			twoHoursAgo := time.Now().Add(-2 * time.Hour)
			if lastRestart.After(twoHoursAgo) {
				// Only report if not already reported
				alreadyReported := false
				for _, inc := range incidents {
					if inc.ResourceName == fmt.Sprintf("%s/%s", pod.Name, containerName) {
						alreadyReported = true
						break
					}
				}
				if !alreadyReported {
					reason := containerStatus.LastTerminationState.Terminated.Reason
					exitCode := containerStatus.LastTerminationState.Terminated.ExitCode
					severity := "info"
					if reason == "OOMKilled" || exitCode != 0 {
						severity = "warning"
					}
					incidents = append(incidents, KubernetesIncident{
						ID:           fmt.Sprintf("recent-restart-%s-%s-%s", pod.Namespace, pod.Name, containerName),
						Type:         "recent_restart",
						Severity:     severity,
						ResourceKind: "Pod",
						ResourceName: fmt.Sprintf("%s/%s", pod.Name, containerName),
						Namespace:    pod.Namespace,
						FirstSeen:    lastRestart,
						LastSeen:     lastRestart,
						Count:        int(containerStatus.RestartCount),
						Message:      fmt.Sprintf("Container %s restarted recently (reason: %s, exit code: %d)", containerName, reason, exitCode),
					})
				}
			}
		}
	}

	// Check regular containers
	for _, containerStatus := range pod.Status.ContainerStatuses {
		checkContainerStatus(containerStatus, containerStatus.Name, false)
	}

	// Check init containers (they can also be OOMKilled or crash)
	for _, initContainerStatus := range pod.Status.InitContainerStatuses {
		checkContainerStatus(initContainerStatus, initContainerStatus.Name, true)
	}

	return incidents
}

// ScanNodesForIncidents scans nodes for pressure conditions
func (scanner *IncidentScanner) ScanNodesForIncidents() []KubernetesIncident {
	incidents := []KubernetesIncident{}

	// Check context cancellation before starting
	select {
	case <-scanner.app.ctx.Done():
		return incidents
	default:
	}

	// Use limit for nodes (most clusters have < 1000 nodes)
	opts := metav1.ListOptions{
		Limit: 1000, // Limit to 1000 nodes for performance
	}
	nodes, err := scanner.app.clientset.CoreV1().Nodes().List(scanner.app.ctx, opts)
	if err != nil {
		return incidents
	}

	for _, node := range nodes.Items {
		for _, condition := range node.Status.Conditions {
			if condition.Type == corev1.NodeDiskPressure || condition.Type == corev1.NodeMemoryPressure || condition.Type == corev1.NodePIDPressure {
				if condition.Status == corev1.ConditionTrue {
					incidentType := "node_pressure"
					severity := "warning"
					if condition.Type == corev1.NodeMemoryPressure {
						incidentType = "node_memory_pressure"
						severity = "critical"
					} else if condition.Type == corev1.NodeDiskPressure {
						incidentType = "node_disk_pressure"
						severity = "critical"
					}

					incidents = append(incidents, KubernetesIncident{
						ID:           fmt.Sprintf("node-pressure-%s-%s", node.Name, string(condition.Type)),
						Type:         incidentType,
						Severity:     severity,
						ResourceKind: "Node",
						ResourceName: node.Name,
						Namespace:    "", // Nodes are cluster-scoped
						FirstSeen:    condition.LastTransitionTime.Time,
						LastSeen:     time.Now(),
						Count:        1,
						Message:      condition.Message,
					})
				}
			}
		}

		// Check for NotReady nodes
		for _, condition := range node.Status.Conditions {
			if condition.Type == corev1.NodeReady && condition.Status != corev1.ConditionTrue {
				incidents = append(incidents, KubernetesIncident{
					ID:           fmt.Sprintf("node-notready-%s", node.Name),
					Type:         "node_not_ready",
					Severity:     "critical",
					ResourceKind: "Node",
					ResourceName: node.Name,
					Namespace:    "",
					FirstSeen:    condition.LastTransitionTime.Time,
					LastSeen:     time.Now(),
					Count:        1,
					Message:      fmt.Sprintf("Node %s is not ready: %s", node.Name, condition.Message),
				})
				break
			}
		}
	}

	return incidents
}

// ScanJobsForIncidents scans jobs for failures
func (scanner *IncidentScanner) ScanJobsForIncidents(namespace string) []KubernetesIncident {
	incidents := []KubernetesIncident{}

	// Check context cancellation before starting
	select {
	case <-scanner.app.ctx.Done():
		return incidents
	default:
	}

	// Use limit to avoid scanning too many jobs at once (performance optimization)
	opts := metav1.ListOptions{
		Limit: 500, // Limit to 500 jobs per namespace for performance
	}
	jobs, err := scanner.app.clientset.BatchV1().Jobs(namespace).List(scanner.app.ctx, opts)
	if err != nil {
		return incidents
	}

	for _, job := range jobs.Items {
		// Check for failed jobs
		if job.Status.Failed > 0 {
			incidents = append(incidents, KubernetesIncident{
				ID:           fmt.Sprintf("job-failure-%s-%s", job.Namespace, job.Name),
				Type:         "job_failure",
				Severity:     "warning",
				ResourceKind: "Job",
				ResourceName: job.Name,
				Namespace:    job.Namespace,
				FirstSeen:    job.CreationTimestamp.Time,
				LastSeen:     time.Now(),
				Count:        int(job.Status.Failed),
				Message:      fmt.Sprintf("Job has %d failed pods", job.Status.Failed),
			})
		}
	}

	return incidents
}

// ScanCronJobsForIncidents scans cronjobs for failures
func (scanner *IncidentScanner) ScanCronJobsForIncidents(namespace string) []KubernetesIncident {
	incidents := []KubernetesIncident{}

	// Check context cancellation before starting
	select {
	case <-scanner.app.ctx.Done():
		return incidents
	default:
	}

	// Use limit to avoid scanning too many cronjobs at once (performance optimization)
	opts := metav1.ListOptions{
		Limit: 500, // Limit to 500 cronjobs per namespace for performance
	}
	cronJobs, err := scanner.app.clientset.BatchV1().CronJobs(namespace).List(scanner.app.ctx, opts)
	if err != nil {
		return incidents
	}

	// OPTIMIZATION: List jobs once per namespace instead of once per cronjob
	// This is much more efficient than the previous approach
	var allJobs *batchv1.JobList
	if namespace == "" {
		// For all namespaces, we'll skip this expensive operation
		// CronJob failures are less critical and can be detected via other means
		return incidents
	}

	// Only scan jobs if we have a specific namespace (much faster)
	jobOpts := metav1.ListOptions{
		Limit: 1000, // Limit jobs to scan
	}
	allJobs, err = scanner.app.clientset.BatchV1().Jobs(namespace).List(scanner.app.ctx, jobOpts)
	if err != nil {
		return incidents
	}

	// Create a map of cronjob names for quick lookup
	cronJobMap := make(map[string]bool)
	for _, cronJob := range cronJobs.Items {
		cronJobMap[cronJob.Name] = true
	}

	// Check each job once and see if it belongs to any cronjob
	for _, job := range allJobs.Items {
		// Check context cancellation during processing
		select {
		case <-scanner.app.ctx.Done():
			return incidents
		default:
		}

		// Check if this job is owned by a cronjob
		for _, ownerRef := range job.OwnerReferences {
			if ownerRef.Kind == "CronJob" && cronJobMap[ownerRef.Name] {
				if job.Status.Failed > 0 {
					incidents = append(incidents, KubernetesIncident{
						ID:           fmt.Sprintf("cronjob-failure-%s-%s-%s", job.Namespace, ownerRef.Name, job.Name),
						Type:         "cronjob_failure",
						Severity:     "warning",
						ResourceKind: "CronJob",
						ResourceName: ownerRef.Name,
						Namespace:    job.Namespace,
						FirstSeen:    job.CreationTimestamp.Time,
						LastSeen:     time.Now(),
						Count:        int(job.Status.Failed),
						Message:      fmt.Sprintf("CronJob execution failed: %s has %d failed pods", job.Name, job.Status.Failed),
					})
				}
				break
			}
		}
	}

	return incidents
}

// ConvertKubernetesIncidentToSREIncident converts a KubernetesIncident to an SRE Incident
func (scanner *IncidentScanner) ConvertKubernetesIncidentToSREIncident(k8sIncident KubernetesIncident) *Incident {
	incidentID := fmt.Sprintf("k8s-%s", k8sIncident.ID)

	// Determine status based on incident type and age
	status := "open"
	if time.Since(k8sIncident.LastSeen) > 24*time.Hour {
		status = "resolved" // Old incidents are considered resolved
	}

	incident := &Incident{
		ID:          incidentID,
		EventID:     k8sIncident.ID,
		Type:        k8sIncident.Type,
		Severity:    k8sIncident.Severity,
		Title:       fmt.Sprintf("%s: %s", k8sIncident.Type, k8sIncident.ResourceName),
		Description: k8sIncident.Message,
		Resource:    k8sIncident.ResourceName,
		Namespace:   k8sIncident.Namespace,
		DetectedAt:  k8sIncident.FirstSeen,
		Status:      status,
		Actions:     []Action{},
		Metadata: map[string]interface{}{
			"resourceKind": k8sIncident.ResourceKind,
			"count":        k8sIncident.Count,
		},
	}

	// Add initial analysis action for detected incidents
	incident.Actions = append(incident.Actions, Action{
		ID:          fmt.Sprintf("act-%s-detected", incidentID),
		Type:        "analyze",
		Description: fmt.Sprintf("Incident detected: %s", k8sIncident.Type),
		Status:      "completed",
		StartedAt:   k8sIncident.FirstSeen,
		CompletedAt: &k8sIncident.FirstSeen,
		Result:      fmt.Sprintf("Detected %s incident on %s", k8sIncident.Type, k8sIncident.ResourceName),
	})

	if status == "resolved" {
		resolvedAt := k8sIncident.LastSeen
		incident.ResolvedAt = &resolvedAt
	}

	return incident
}

// ScanEventsForIncidents scans Kubernetes events for node preemption, scale down, eviction, and connection failures
func (scanner *IncidentScanner) ScanEventsForIncidents(namespace string) []KubernetesIncident {
	incidents := []KubernetesIncident{}

	// Check context cancellation before starting
	select {
	case <-scanner.app.ctx.Done():
		return incidents
	default:
	}

	// Scan events from the last 2 hours only (to avoid stale events)
	twoHoursAgo := time.Now().Add(-2 * time.Hour)

	// List events with a limit
	opts := metav1.ListOptions{
		Limit: 1000,
	}

	var events *corev1.EventList
	var err error

	if namespace == "" {
		// Scan events from all namespaces
		events, err = scanner.app.clientset.CoreV1().Events("").List(scanner.app.ctx, opts)
	} else {
		events, err = scanner.app.clientset.CoreV1().Events(namespace).List(scanner.app.ctx, opts)
	}

	if err != nil {
		return incidents
	}

	// Track events to avoid duplicates
	seenEvents := make(map[string]bool)

	for _, event := range events.Items {
		// Check context cancellation
		select {
		case <-scanner.app.ctx.Done():
			return incidents
		default:
		}

		// Skip events older than 2 hours
		eventTime := event.LastTimestamp.Time
		if eventTime.IsZero() {
			eventTime = event.EventTime.Time
		}
		if eventTime.IsZero() {
			eventTime = event.CreationTimestamp.Time
		}
		if eventTime.Before(twoHoursAgo) {
			continue
		}

		// Only process Warning events for most incident types
		// Also allow certain informational events that indicate infrastructure changes
		isNodeEvent := event.InvolvedObject.Kind == "Node"
		isInfraEvent := event.Reason == "ScaleDown" || event.Reason == "Preempted" ||
			event.Reason == "DeletingNode" || event.Reason == "RemovingNode" ||
			event.Reason == "TerminatingEvictedPod" || event.Reason == "NodeNotReady" ||
			event.Reason == "NodeNotSchedulable" || event.Reason == "DeletingAllPods" ||
			event.Reason == "TerminatedAllPods" || event.Reason == "PreemptScheduled" ||
			event.Reason == "Killing"
		if event.Type != corev1.EventTypeWarning && !isInfraEvent && !isNodeEvent {
			continue
		}

		// Create unique event key
		eventKey := fmt.Sprintf("%s-%s-%s-%s", event.Namespace, event.InvolvedObject.Name, event.Reason, event.InvolvedObject.Kind)
		if seenEvents[eventKey] {
			continue
		}
		seenEvents[eventKey] = true

		// Detect different incident types based on event reason
		switch event.Reason {
		case "ScaleDown":
			// Node autoscaler scale down event
			incidents = append(incidents, KubernetesIncident{
				ID:           fmt.Sprintf("scaledown-%s-%s", event.Namespace, event.InvolvedObject.Name),
				Type:         "node_scale_down",
				Severity:     "info",
				ResourceKind: event.InvolvedObject.Kind,
				ResourceName: event.InvolvedObject.Name,
				Namespace:    event.Namespace,
				FirstSeen:    eventTime,
				LastSeen:     eventTime,
				Count:        int(event.Count),
				Message:      fmt.Sprintf("Pod deleted for node scale down: %s", event.Message),
			})

		case "Preempted":
			// Spot instance preemption
			incidents = append(incidents, KubernetesIncident{
				ID:           fmt.Sprintf("preempted-%s-%s", event.Namespace, event.InvolvedObject.Name),
				Type:         "node_preemption",
				Severity:     "warning",
				ResourceKind: event.InvolvedObject.Kind,
				ResourceName: event.InvolvedObject.Name,
				Namespace:    event.Namespace,
				FirstSeen:    eventTime,
				LastSeen:     eventTime,
				Count:        int(event.Count),
				Message:      fmt.Sprintf("Pod preempted (spot instance): %s", event.Message),
			})

		case "Evicted":
			// Pod eviction (resource pressure, etc)
			incidents = append(incidents, KubernetesIncident{
				ID:           fmt.Sprintf("evicted-%s-%s", event.Namespace, event.InvolvedObject.Name),
				Type:         "pod_eviction",
				Severity:     "warning",
				ResourceKind: event.InvolvedObject.Kind,
				ResourceName: event.InvolvedObject.Name,
				Namespace:    event.Namespace,
				FirstSeen:    eventTime,
				LastSeen:     eventTime,
				Count:        int(event.Count),
				Message:      fmt.Sprintf("Pod evicted: %s", event.Message),
			})

		case "FailedScheduling":
			// Scheduling failures
			incidents = append(incidents, KubernetesIncident{
				ID:           fmt.Sprintf("scheduling-%s-%s", event.Namespace, event.InvolvedObject.Name),
				Type:         "scheduling_failure",
				Severity:     "warning",
				ResourceKind: event.InvolvedObject.Kind,
				ResourceName: event.InvolvedObject.Name,
				Namespace:    event.Namespace,
				FirstSeen:    eventTime,
				LastSeen:     eventTime,
				Count:        int(event.Count),
				Message:      fmt.Sprintf("Failed to schedule pod: %s", event.Message),
			})

		case "Unhealthy":
			// Liveness/readiness probe failures
			if event.Count > 3 { // Only report if multiple failures
				incidents = append(incidents, KubernetesIncident{
					ID:           fmt.Sprintf("unhealthy-%s-%s", event.Namespace, event.InvolvedObject.Name),
					Type:         "probe_failure",
					Severity:     "warning",
					ResourceKind: event.InvolvedObject.Kind,
					ResourceName: event.InvolvedObject.Name,
					Namespace:    event.Namespace,
					FirstSeen:    eventTime,
					LastSeen:     eventTime,
					Count:        int(event.Count),
					Message:      fmt.Sprintf("Health check failed: %s", event.Message),
				})
			}

		case "DeletingNode", "RemovingNode":
			// Node being deleted (autoscaler or manual)
			incidents = append(incidents, KubernetesIncident{
				ID:           fmt.Sprintf("node-deletion-%s", event.InvolvedObject.Name),
				Type:         "node_deletion",
				Severity:     "info",
				ResourceKind: "Node",
				ResourceName: event.InvolvedObject.Name,
				Namespace:    "",
				FirstSeen:    eventTime,
				LastSeen:     eventTime,
				Count:        int(event.Count),
				Message:      fmt.Sprintf("Node being removed: %s", event.Message),
			})

		case "NodeNotReady":
			// Node became not ready
			incidents = append(incidents, KubernetesIncident{
				ID:           fmt.Sprintf("node-notready-event-%s", event.InvolvedObject.Name),
				Type:         "node_not_ready",
				Severity:     "warning",
				ResourceKind: "Node",
				ResourceName: event.InvolvedObject.Name,
				Namespace:    "",
				FirstSeen:    eventTime,
				LastSeen:     eventTime,
				Count:        int(event.Count),
				Message:      fmt.Sprintf("Node not ready: %s", event.Message),
			})

		case "NodeNotSchedulable":
			// Node cordoned or marked unschedulable
			incidents = append(incidents, KubernetesIncident{
				ID:           fmt.Sprintf("node-unschedulable-%s", event.InvolvedObject.Name),
				Type:         "node_cordoned",
				Severity:     "info",
				ResourceKind: "Node",
				ResourceName: event.InvolvedObject.Name,
				Namespace:    "",
				FirstSeen:    eventTime,
				LastSeen:     eventTime,
				Count:        int(event.Count),
				Message:      fmt.Sprintf("Node marked unschedulable: %s", event.Message),
			})

		case "DeletingAllPods", "TerminatedAllPods", "TerminatingEvictedPod":
			// Mass pod eviction from node
			incidents = append(incidents, KubernetesIncident{
				ID:           fmt.Sprintf("mass-eviction-%s-%d", event.InvolvedObject.Name, eventTime.Unix()),
				Type:         "mass_eviction",
				Severity:     "warning",
				ResourceKind: event.InvolvedObject.Kind,
				ResourceName: event.InvolvedObject.Name,
				Namespace:    event.Namespace,
				FirstSeen:    eventTime,
				LastSeen:     eventTime,
				Count:        int(event.Count),
				Message:      fmt.Sprintf("Mass pod eviction: %s", event.Message),
			})

		case "PreemptScheduled":
			// Pod scheduled to preempt another
			incidents = append(incidents, KubernetesIncident{
				ID:           fmt.Sprintf("preempt-scheduled-%s-%s", event.Namespace, event.InvolvedObject.Name),
				Type:         "preempt_scheduled",
				Severity:     "info",
				ResourceKind: event.InvolvedObject.Kind,
				ResourceName: event.InvolvedObject.Name,
				Namespace:    event.Namespace,
				FirstSeen:    eventTime,
				LastSeen:     eventTime,
				Count:        int(event.Count),
				Message:      fmt.Sprintf("Pod scheduled with preemption: %s", event.Message),
			})

		case "Killing":
			// Pod being killed (often due to node drain)
			incidents = append(incidents, KubernetesIncident{
				ID:           fmt.Sprintf("killing-%s-%s-%d", event.Namespace, event.InvolvedObject.Name, eventTime.Unix()),
				Type:         "pod_killed",
				Severity:     "info",
				ResourceKind: event.InvolvedObject.Kind,
				ResourceName: event.InvolvedObject.Name,
				Namespace:    event.Namespace,
				FirstSeen:    eventTime,
				LastSeen:     eventTime,
				Count:        int(event.Count),
				Message:      fmt.Sprintf("Pod being killed: %s", event.Message),
			})

		default:
			// Check for connection/timeout issues in the message
			msgLower := strings.ToLower(event.Message)
			if strings.Contains(msgLower, "timeout") ||
				strings.Contains(msgLower, "connection refused") ||
				strings.Contains(msgLower, "connection timed out") ||
				strings.Contains(msgLower, "max retries exceeded") ||
				strings.Contains(msgLower, "connect timeout") {
				incidents = append(incidents, KubernetesIncident{
					ID:           fmt.Sprintf("connection-%s-%s-%d", event.Namespace, event.InvolvedObject.Name, eventTime.Unix()),
					Type:         "connection_failure",
					Severity:     "warning",
					ResourceKind: event.InvolvedObject.Kind,
					ResourceName: event.InvolvedObject.Name,
					Namespace:    event.Namespace,
					FirstSeen:    eventTime,
					LastSeen:     eventTime,
					Count:        int(event.Count),
					Message:      fmt.Sprintf("Connection issue detected: %s", event.Message),
				})
			}

			// Check for Redis/dependency failures
			if strings.Contains(msgLower, "redis") ||
				strings.Contains(msgLower, "database") ||
				strings.Contains(msgLower, "postgres") ||
				strings.Contains(msgLower, "mysql") ||
				strings.Contains(msgLower, "mongodb") {
				incidents = append(incidents, KubernetesIncident{
					ID:           fmt.Sprintf("dependency-%s-%s-%d", event.Namespace, event.InvolvedObject.Name, eventTime.Unix()),
					Type:         "dependency_failure",
					Severity:     "warning",
					ResourceKind: event.InvolvedObject.Kind,
					ResourceName: event.InvolvedObject.Name,
					Namespace:    event.Namespace,
					FirstSeen:    eventTime,
					LastSeen:     eventTime,
					Count:        int(event.Count),
					Message:      fmt.Sprintf("Dependency issue: %s", event.Message),
				})
			}
		}
	}

	return incidents
}

// ScanCertManagerForIncidents scans cert-manager resources for incidents
// This includes Certificates, CertificateRequests, ClusterIssuers, and Issuers
func (scanner *IncidentScanner) ScanCertManagerForIncidents(namespace string) []KubernetesIncident {
	incidents := []KubernetesIncident{}

	// Check context cancellation before starting
	select {
	case <-scanner.app.ctx.Done():
		return incidents
	default:
	}

	// Skip if no config available
	if scanner.app.config == nil {
		return incidents
	}

	// Create dynamic client for CRDs
	dynamicClient, err := dynamic.NewForConfig(scanner.app.config)
	if err != nil {
		return incidents
	}

	// Scan Certificates (namespace-scoped)
	certGVR := schema.GroupVersionResource{
		Group:    "cert-manager.io",
		Version:  "v1",
		Resource: "certificates",
	}
	incidents = append(incidents, scanner.scanCertificates(dynamicClient, certGVR, namespace)...)

	// Check context cancellation
	select {
	case <-scanner.app.ctx.Done():
		return incidents
	default:
	}

	// Scan CertificateRequests (namespace-scoped)
	certReqGVR := schema.GroupVersionResource{
		Group:    "cert-manager.io",
		Version:  "v1",
		Resource: "certificaterequests",
	}
	incidents = append(incidents, scanner.scanCertificateRequests(dynamicClient, certReqGVR, namespace)...)

	// Check context cancellation
	select {
	case <-scanner.app.ctx.Done():
		return incidents
	default:
	}

	// Scan ClusterIssuers (cluster-scoped)
	clusterIssuerGVR := schema.GroupVersionResource{
		Group:    "cert-manager.io",
		Version:  "v1",
		Resource: "clusterissuers",
	}
	incidents = append(incidents, scanner.scanIssuers(dynamicClient, clusterIssuerGVR, "", true)...)

	// Check context cancellation
	select {
	case <-scanner.app.ctx.Done():
		return incidents
	default:
	}

	// Scan Issuers (namespace-scoped)
	issuerGVR := schema.GroupVersionResource{
		Group:    "cert-manager.io",
		Version:  "v1",
		Resource: "issuers",
	}
	incidents = append(incidents, scanner.scanIssuers(dynamicClient, issuerGVR, namespace, false)...)

	return incidents
}

// scanCertificates scans Certificate resources for issues
func (scanner *IncidentScanner) scanCertificates(dynamicClient dynamic.Interface, gvr schema.GroupVersionResource, namespace string) []KubernetesIncident {
	incidents := []KubernetesIncident{}

	var err error
	var unstructuredList *unstructured.UnstructuredList

	if namespace == "" {
		unstructuredList, err = dynamicClient.Resource(gvr).Namespace("").List(scanner.app.ctx, metav1.ListOptions{})
	} else {
		unstructuredList, err = dynamicClient.Resource(gvr).Namespace(namespace).List(scanner.app.ctx, metav1.ListOptions{})
	}

	if err != nil {
		// cert-manager may not be installed - silently skip
		return incidents
	}

	for _, item := range unstructuredList.Items {
		name := item.GetName()
		ns := item.GetNamespace()
		creationTime := item.GetCreationTimestamp().Time

		// Get status conditions
		status, found, _ := unstructured.NestedMap(item.Object, "status")
		if !found {
			continue
		}

		conditions, found, _ := unstructured.NestedSlice(status, "conditions")
		if !found {
			continue
		}

		// Check for Ready condition
		isReady := false
		readyMessage := ""
		for _, cond := range conditions {
			condMap, ok := cond.(map[string]interface{})
			if !ok {
				continue
			}
			condType, _ := condMap["type"].(string)
			condStatus, _ := condMap["status"].(string)
			condMessage, _ := condMap["message"].(string)

			if condType == "Ready" {
				isReady = condStatus == "True"
				readyMessage = condMessage
				break
			}
		}

		if !isReady {
			severity := "warning"
			// Check if it's a critical failure
			if strings.Contains(strings.ToLower(readyMessage), "error") ||
				strings.Contains(strings.ToLower(readyMessage), "failed") {
				severity = "critical"
			}
			incidents = append(incidents, KubernetesIncident{
				ID:           fmt.Sprintf("cert-notready-%s-%s", ns, name),
				Type:         "certificate_not_ready",
				Severity:     severity,
				ResourceKind: "Certificate",
				ResourceName: name,
				Namespace:    ns,
				FirstSeen:    creationTime,
				LastSeen:     time.Now(),
				Count:        1,
				Message:      fmt.Sprintf("Certificate not ready: %s", readyMessage),
			})
		}

		// Check for expiring soon (within 7 days)
		notAfterStr, found, _ := unstructured.NestedString(status, "notAfter")
		if found && notAfterStr != "" {
			notAfter, parseErr := time.Parse(time.RFC3339, notAfterStr)
			if parseErr == nil {
				daysUntilExpiry := time.Until(notAfter).Hours() / 24
				if daysUntilExpiry < 0 {
					// Already expired
					incidents = append(incidents, KubernetesIncident{
						ID:           fmt.Sprintf("cert-expired-%s-%s", ns, name),
						Type:         "certificate_expired",
						Severity:     "critical",
						ResourceKind: "Certificate",
						ResourceName: name,
						Namespace:    ns,
						FirstSeen:    notAfter,
						LastSeen:     time.Now(),
						Count:        1,
						Message:      fmt.Sprintf("Certificate expired on %s", notAfter.Format("2006-01-02")),
					})
				} else if daysUntilExpiry < 7 {
					// Expiring soon
					incidents = append(incidents, KubernetesIncident{
						ID:           fmt.Sprintf("cert-expiring-%s-%s", ns, name),
						Type:         "certificate_expiring",
						Severity:     "warning",
						ResourceKind: "Certificate",
						ResourceName: name,
						Namespace:    ns,
						FirstSeen:    time.Now(),
						LastSeen:     time.Now(),
						Count:        1,
						Message:      fmt.Sprintf("Certificate expiring in %.0f days (expires: %s)", daysUntilExpiry, notAfter.Format("2006-01-02")),
					})
				}
			}
		}
	}

	return incidents
}

// scanCertificateRequests scans CertificateRequest resources for failures
func (scanner *IncidentScanner) scanCertificateRequests(dynamicClient dynamic.Interface, gvr schema.GroupVersionResource, namespace string) []KubernetesIncident {
	incidents := []KubernetesIncident{}

	var err error
	var unstructuredList *unstructured.UnstructuredList

	if namespace == "" {
		unstructuredList, err = dynamicClient.Resource(gvr).Namespace("").List(scanner.app.ctx, metav1.ListOptions{})
	} else {
		unstructuredList, err = dynamicClient.Resource(gvr).Namespace(namespace).List(scanner.app.ctx, metav1.ListOptions{})
	}

	if err != nil {
		return incidents
	}

	// Only check recent certificate requests (last 24 hours)
	oneDayAgo := time.Now().Add(-24 * time.Hour)

	for _, item := range unstructuredList.Items {
		name := item.GetName()
		ns := item.GetNamespace()
		creationTime := item.GetCreationTimestamp().Time

		// Skip old requests
		if creationTime.Before(oneDayAgo) {
			continue
		}

		// Get status conditions
		status, found, _ := unstructured.NestedMap(item.Object, "status")
		if !found {
			continue
		}

		conditions, found, _ := unstructured.NestedSlice(status, "conditions")
		if !found {
			continue
		}

		// Check for failures
		for _, cond := range conditions {
			condMap, ok := cond.(map[string]interface{})
			if !ok {
				continue
			}
			condType, _ := condMap["type"].(string)
			condStatus, _ := condMap["status"].(string)
			condMessage, _ := condMap["message"].(string)
			condReason, _ := condMap["reason"].(string)

			// Check for Failed or Denied conditions
			if (condType == "Ready" && condStatus == "False" && (condReason == "Failed" || condReason == "Denied")) ||
				condType == "Denied" && condStatus == "True" {
				incidents = append(incidents, KubernetesIncident{
					ID:           fmt.Sprintf("certreq-failed-%s-%s", ns, name),
					Type:         "certificate_request_failed",
					Severity:     "warning",
					ResourceKind: "CertificateRequest",
					ResourceName: name,
					Namespace:    ns,
					FirstSeen:    creationTime,
					LastSeen:     time.Now(),
					Count:        1,
					Message:      fmt.Sprintf("Certificate request %s: %s", condReason, condMessage),
				})
				break
			}
		}
	}

	return incidents
}

// scanIssuers scans Issuer or ClusterIssuer resources for not ready status
func (scanner *IncidentScanner) scanIssuers(dynamicClient dynamic.Interface, gvr schema.GroupVersionResource, namespace string, isClusterScoped bool) []KubernetesIncident {
	incidents := []KubernetesIncident{}

	var err error
	var unstructuredList *unstructured.UnstructuredList

	if isClusterScoped {
		unstructuredList, err = dynamicClient.Resource(gvr).List(scanner.app.ctx, metav1.ListOptions{})
	} else if namespace == "" {
		unstructuredList, err = dynamicClient.Resource(gvr).Namespace("").List(scanner.app.ctx, metav1.ListOptions{})
	} else {
		unstructuredList, err = dynamicClient.Resource(gvr).Namespace(namespace).List(scanner.app.ctx, metav1.ListOptions{})
	}

	if err != nil {
		return incidents
	}

	resourceKind := "Issuer"
	incidentType := "issuer_not_ready"
	if isClusterScoped {
		resourceKind = "ClusterIssuer"
		incidentType = "cluster_issuer_not_ready"
	}

	for _, item := range unstructuredList.Items {
		name := item.GetName()
		ns := item.GetNamespace()
		creationTime := item.GetCreationTimestamp().Time

		// Get status conditions
		status, found, _ := unstructured.NestedMap(item.Object, "status")
		if !found {
			continue
		}

		conditions, found, _ := unstructured.NestedSlice(status, "conditions")
		if !found {
			continue
		}

		// Check for Ready condition
		for _, cond := range conditions {
			condMap, ok := cond.(map[string]interface{})
			if !ok {
				continue
			}
			condType, _ := condMap["type"].(string)
			condStatus, _ := condMap["status"].(string)
			condMessage, _ := condMap["message"].(string)

			if condType == "Ready" && condStatus != "True" {
				incidents = append(incidents, KubernetesIncident{
					ID:           fmt.Sprintf("%s-notready-%s-%s", strings.ToLower(resourceKind), ns, name),
					Type:         incidentType,
					Severity:     "warning",
					ResourceKind: resourceKind,
					ResourceName: name,
					Namespace:    ns,
					FirstSeen:    creationTime,
					LastSeen:     time.Now(),
					Count:        1,
					Message:      fmt.Sprintf("%s not ready: %s", resourceKind, condMessage),
				})
				break
			}
		}
	}

	return incidents
}
