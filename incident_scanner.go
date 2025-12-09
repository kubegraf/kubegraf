// Copyright 2025 KubeGraf Contributors
// SPDX-License-Identifier: Apache-2.0

package main

import (
	"fmt"
	"time"

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

	// Scan pods
	podIncidents := scanner.ScanPodsForIncidents(namespace)
	incidents = append(incidents, podIncidents...)

	// Scan nodes
	nodeIncidents := scanner.ScanNodesForIncidents()
	incidents = append(incidents, nodeIncidents...)

	// Scan jobs
	jobIncidents := scanner.ScanJobsForIncidents(namespace)
	incidents = append(incidents, jobIncidents...)

	// Scan cronjobs
	cronJobIncidents := scanner.ScanCronJobsForIncidents(namespace)
	incidents = append(incidents, cronJobIncidents...)

	return incidents
}

// ScanPodsForIncidents scans pods for OOMKilled and CrashLoopBackOff
func (scanner *IncidentScanner) ScanPodsForIncidents(namespace string) []KubernetesIncident {
	incidents := []KubernetesIncident{}

	pods, err := scanner.app.clientset.CoreV1().Pods(namespace).List(scanner.app.ctx, metav1.ListOptions{})
	if err != nil {
		return incidents
	}

	for _, pod := range pods.Items {
		// Check for OOMKilled
		for _, containerStatus := range pod.Status.ContainerStatuses {
			if containerStatus.LastTerminationState.Terminated != nil {
				term := containerStatus.LastTerminationState.Terminated
				if term.Reason == "OOMKilled" {
					incidents = append(incidents, KubernetesIncident{
						ID:           fmt.Sprintf("oom-%s-%s-%s", pod.Namespace, pod.Name, containerStatus.Name),
						Type:         "oom",
						Severity:     "critical",
						ResourceKind: "Pod",
						ResourceName: fmt.Sprintf("%s/%s", pod.Name, containerStatus.Name),
						Namespace:    pod.Namespace,
						FirstSeen:    term.FinishedAt.Time,
						LastSeen:     term.FinishedAt.Time,
						Count:        1,
						Message:      fmt.Sprintf("Container %s was OOMKilled", containerStatus.Name),
					})
				}
			}
		}

		// Check for CrashLoopBackOff and other error states
		for _, containerStatus := range pod.Status.ContainerStatuses {
			if containerStatus.State.Waiting != nil {
				waiting := containerStatus.State.Waiting
				if waiting.Reason == "CrashLoopBackOff" || waiting.Reason == "ImagePullBackOff" || waiting.Reason == "ErrImagePull" {
					severity := "warning"
					if waiting.Reason == "CrashLoopBackOff" {
						severity = "critical"
					}
					incidents = append(incidents, KubernetesIncident{
						ID:           fmt.Sprintf("crashloop-%s-%s-%s", pod.Namespace, pod.Name, containerStatus.Name),
						Type:         "crashloop",
						Severity:     severity,
						ResourceKind: "Pod",
						ResourceName: fmt.Sprintf("%s/%s", pod.Name, containerStatus.Name),
						Namespace:    pod.Namespace,
						FirstSeen:    pod.CreationTimestamp.Time,
						LastSeen:     time.Now(),
						Count:        int(containerStatus.RestartCount),
						Message:      fmt.Sprintf("Container %s: %s", containerStatus.Name, waiting.Message),
					})
				}
			}
		}

		// Check for high restart counts (potential issue indicator)
		for _, containerStatus := range pod.Status.ContainerStatuses {
			if containerStatus.RestartCount > 5 {
				// Only report if not already reported as crashloop
				alreadyReported := false
				for _, inc := range incidents {
					if inc.ResourceName == fmt.Sprintf("%s/%s", pod.Name, containerStatus.Name) {
						alreadyReported = true
						break
					}
				}
				if !alreadyReported {
					incidents = append(incidents, KubernetesIncident{
						ID:           fmt.Sprintf("restarts-%s-%s-%s", pod.Namespace, pod.Name, containerStatus.Name),
						Type:         "high_restarts",
						Severity:     "warning",
						ResourceKind: "Pod",
						ResourceName: fmt.Sprintf("%s/%s", pod.Name, containerStatus.Name),
						Namespace:    pod.Namespace,
						FirstSeen:    pod.CreationTimestamp.Time,
						LastSeen:     time.Now(),
						Count:        int(containerStatus.RestartCount),
						Message:      fmt.Sprintf("Container %s has restarted %d times", containerStatus.Name, containerStatus.RestartCount),
					})
				}
			}
		}
	}

	return incidents
}

// ScanNodesForIncidents scans nodes for pressure conditions
func (scanner *IncidentScanner) ScanNodesForIncidents() []KubernetesIncident {
	incidents := []KubernetesIncident{}

	nodes, err := scanner.app.clientset.CoreV1().Nodes().List(scanner.app.ctx, metav1.ListOptions{})
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

	jobs, err := scanner.app.clientset.BatchV1().Jobs(namespace).List(scanner.app.ctx, metav1.ListOptions{})
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

	cronJobs, err := scanner.app.clientset.BatchV1().CronJobs(namespace).List(scanner.app.ctx, metav1.ListOptions{})
	if err != nil {
		return incidents
	}

	for _, cronJob := range cronJobs.Items {
		// List all jobs in the namespace and check if they're owned by this cronjob
		jobs, err := scanner.app.clientset.BatchV1().Jobs(cronJob.Namespace).List(scanner.app.ctx, metav1.ListOptions{})
		if err == nil {
			for _, job := range jobs.Items {
				// Check if this job is owned by the cronjob
				for _, ownerRef := range job.OwnerReferences {
					if ownerRef.Kind == "CronJob" && ownerRef.Name == cronJob.Name {
						if job.Status.Failed > 0 {
							incidents = append(incidents, KubernetesIncident{
								ID:           fmt.Sprintf("cronjob-failure-%s-%s-%s", cronJob.Namespace, cronJob.Name, job.Name),
								Type:         "cronjob_failure",
								Severity:     "warning",
								ResourceKind: "CronJob",
								ResourceName: cronJob.Name,
								Namespace:    cronJob.Namespace,
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

