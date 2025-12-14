// Copyright 2025 KubeGraf Contributors
// SPDX-License-Identifier: Apache-2.0

package main

import (
	"fmt"
	"time"

	batchv1 "k8s.io/api/batch/v1"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
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

		// Scan each non-system namespace (limit to first 10 namespaces for performance)
		maxNamespaces := 10
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
