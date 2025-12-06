// Copyright 2025 KubeGraf Contributors
// SPDX-License-Identifier: Apache-2.0

package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// Incident represents a detected issue from Kubernetes resources
type KubernetesIncident struct {
	ID          string    `json:"id"`
	Type        string    `json:"type"`        // oom, crashloop, node_pressure, job_failure, etc.
	Severity    string    `json:"severity"`    // warning, critical
	ResourceKind string  `json:"resourceKind"` // Pod, Job, CronJob, Node
	ResourceName string  `json:"resourceName"`
	Namespace   string   `json:"namespace"`
	FirstSeen   time.Time `json:"firstSeen"`
	LastSeen    time.Time `json:"lastSeen"`
	Count       int       `json:"count"`
	Message     string    `json:"message,omitempty"`
}

// handleIncidents scans Kubernetes resources for incidents
func (ws *WebServer) handleIncidents(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	w.Header().Set("Content-Type", "application/json")

	if ws.app.clientset == nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"incidents": []KubernetesIncident{},
			"total":     0,
		})
		return
	}

	// Parse query parameters
	namespace := r.URL.Query().Get("namespace")
	typeFilter := r.URL.Query().Get("type")
	severityFilter := r.URL.Query().Get("severity")

	incidents := []KubernetesIncident{}

	// Scan pods for OOMKilled and CrashLoopBackOff
	podIncidents := ws.scanPodsForIncidents(namespace)
	incidents = append(incidents, podIncidents...)

	// Scan nodes for pressure conditions
	nodeIncidents := ws.scanNodesForIncidents()
	incidents = append(incidents, nodeIncidents...)

	// Scan jobs for failures
	jobIncidents := ws.scanJobsForIncidents(namespace)
	incidents = append(incidents, jobIncidents...)

	// Scan cronjobs for failures
	cronJobIncidents := ws.scanCronJobsForIncidents(namespace)
	incidents = append(incidents, cronJobIncidents...)

	// Apply filters
	filtered := []KubernetesIncident{}
	for _, inc := range incidents {
		if typeFilter != "" && inc.Type != typeFilter {
			continue
		}
		if severityFilter != "" && inc.Severity != severityFilter {
			continue
		}
		filtered = append(filtered, inc)
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"incidents": filtered,
		"total":     len(filtered),
	})
}

// scanPodsForIncidents scans pods for OOMKilled and CrashLoopBackOff
func (ws *WebServer) scanPodsForIncidents(namespace string) []KubernetesIncident {
	incidents := []KubernetesIncident{}

	pods, err := ws.app.clientset.CoreV1().Pods(namespace).List(ws.app.ctx, metav1.ListOptions{})
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

		// Check for CrashLoopBackOff
		if pod.Status.Phase == corev1.PodPending || pod.Status.Phase == corev1.PodRunning {
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
							LastSeen:    time.Now(),
							Count:        int(containerStatus.RestartCount),
							Message:      fmt.Sprintf("Container %s: %s", containerStatus.Name, waiting.Message),
						})
					}
				}
			}
		}
	}

	return incidents
}

// scanNodesForIncidents scans nodes for pressure conditions
func (ws *WebServer) scanNodesForIncidents() []KubernetesIncident {
	incidents := []KubernetesIncident{}

	nodes, err := ws.app.clientset.CoreV1().Nodes().List(ws.app.ctx, metav1.ListOptions{})
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
	}

	return incidents
}

// scanJobsForIncidents scans jobs for failures
func (ws *WebServer) scanJobsForIncidents(namespace string) []KubernetesIncident {
	incidents := []KubernetesIncident{}

	jobs, err := ws.app.clientset.BatchV1().Jobs(namespace).List(ws.app.ctx, metav1.ListOptions{})
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

// scanCronJobsForIncidents scans cronjobs for failures
func (ws *WebServer) scanCronJobsForIncidents(namespace string) []KubernetesIncident {
	incidents := []KubernetesIncident{}

	cronJobs, err := ws.app.clientset.BatchV1().CronJobs(namespace).List(ws.app.ctx, metav1.ListOptions{})
	if err != nil {
		return incidents
	}

	for _, cronJob := range cronJobs.Items {
		// Check for failed jobs created by this cronjob
		// We need to list jobs with the owner reference
		labelSelector := fmt.Sprintf("app=%s", cronJob.Name)
		jobs, err := ws.app.clientset.BatchV1().Jobs(cronJob.Namespace).List(ws.app.ctx, metav1.ListOptions{
			LabelSelector: labelSelector,
		})
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

