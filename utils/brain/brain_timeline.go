// Copyright 2025 KubeGraf Contributors
// Brain Timeline data generation utilities

package main

import (
	"context"
	"fmt"
	"time"

	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// TimelineEvent represents a timeline event for the Brain panel
type TimelineEvent struct {
	ID          string      `json:"id"`
	Timestamp   string      `json:"timestamp"`
	Type        string      `json:"type"` // incident, deployment, pod_restart
	Severity    string      `json:"severity"` // info, warning, critical
	Title       string      `json:"title"`
	Description string      `json:"description"`
	Resource    ResourceInfo `json:"resource"`
}

// ResourceInfo contains resource identification
type ResourceInfo struct {
	Kind      string `json:"kind"`
	Name      string `json:"name"`
	Namespace string `json:"namespace"`
}

// GenerateBrainTimeline generates timeline events from real cluster data
func GenerateBrainTimeline(ctx context.Context, app *App, hours int) ([]TimelineEvent, error) {
	var events []TimelineEvent
	cutoffTime := time.Now().Add(-time.Duration(hours) * time.Hour)

	// 1. Get incidents (real data from incident scanner)
	scanner := NewIncidentScanner(app)
	incidents := scanner.ScanAllIncidents("")
	
	for _, inc := range incidents {
		if inc.FirstSeen.After(cutoffTime) {
			events = append(events, TimelineEvent{
				ID:          inc.ID,
				Timestamp:   inc.FirstSeen.Format(time.RFC3339),
				Type:        "incident",
				Severity:    inc.Severity,
				Title:       formatIncidentTitle(inc),
				Description: inc.Message,
				Resource: ResourceInfo{
					Kind:      inc.ResourceKind,
					Name:      inc.ResourceName,
					Namespace: inc.Namespace,
				},
			})
		}
	}

	// 2. Get pod restarts (real data)
	pods, err := app.clientset.CoreV1().Pods("").List(ctx, metav1.ListOptions{})
	if err == nil {
		for _, pod := range pods.Items {
			for _, containerStatus := range pod.Status.ContainerStatuses {
				if containerStatus.RestartCount > 5 {
					created := pod.CreationTimestamp.Time
					if created.After(cutoffTime) || time.Since(created) < time.Duration(hours)*time.Hour {
						events = append(events, TimelineEvent{
							ID:        fmt.Sprintf("pod-restart-%s-%s", pod.Name, containerStatus.Name),
							Timestamp: pod.CreationTimestamp.Format(time.RFC3339),
							Type:      "incident",
							Severity:  "warning",
							Title:     fmt.Sprintf("High restarts - %s/%s", pod.Name, containerStatus.Name),
							Description: fmt.Sprintf("Container %s has restarted %d times", containerStatus.Name, containerStatus.RestartCount),
							Resource: ResourceInfo{
								Kind:      "Pod",
								Name:      fmt.Sprintf("%s/%s", pod.Name, containerStatus.Name),
								Namespace: pod.Namespace,
							},
						})
					}
				}
			}
		}
	}

	// 3. Get deployment events (real data)
	deployments, err := app.clientset.AppsV1().Deployments("").List(ctx, metav1.ListOptions{})
	if err == nil {
		for _, deployment := range deployments.Items {
			// Check for failed deployments
			if deployment.Status.Replicas > 0 && deployment.Status.ReadyReplicas < deployment.Status.Replicas {
				events = append(events, TimelineEvent{
					ID:        fmt.Sprintf("deployment-issue-%s", deployment.Name),
					Timestamp: deployment.CreationTimestamp.Format(time.RFC3339),
					Type:      "incident",
					Severity:  "warning",
					Title:     fmt.Sprintf("Deployment not ready - %s", deployment.Name),
					Description: fmt.Sprintf("Deployment %s has %d ready replicas out of %d", 
						deployment.Name, deployment.Status.ReadyReplicas, deployment.Status.Replicas),
					Resource: ResourceInfo{
						Kind:      "Deployment",
						Name:      deployment.Name,
						Namespace: deployment.Namespace,
					},
				})
			}
		}
	}

	return events, nil
}

func formatIncidentTitle(inc KubernetesIncident) string {
	return fmt.Sprintf("%s - %s", inc.Type, inc.ResourceName)
}

