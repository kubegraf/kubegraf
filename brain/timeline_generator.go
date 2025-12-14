// Copyright 2025 KubeGraf Contributors
// Brain Timeline data generation utilities

package brain

import (
	"context"
	"fmt"
	"time"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"
)

// TimelineGenerator generates timeline events from cluster data
type TimelineGenerator struct {
	clientset       kubernetes.Interface
	incidentScanner IncidentScanner
}

// NewTimelineGenerator creates a new timeline generator
func NewTimelineGenerator(clientset kubernetes.Interface, incidentScanner IncidentScanner) *TimelineGenerator {
	return &TimelineGenerator{
		clientset:       clientset,
		incidentScanner: incidentScanner,
	}
}

// Generate generates timeline events from real cluster data
func (g *TimelineGenerator) Generate(ctx context.Context, hours int) ([]TimelineEvent, error) {
	var events []TimelineEvent
	cutoffTime := time.Now().Add(-time.Duration(hours) * time.Hour)

	// 1. Get incidents (real data from incident scanner)
	incidents := g.incidentScanner.ScanAllIncidents("")

	for _, inc := range incidents {
		// Check if incident is within the time window
		if inc.FirstSeen.After(cutoffTime) || inc.LastSeen.After(cutoffTime) {
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

	// 2. Get pod restarts (real data) - only if clientset is available
	if err := ValidateClientset(g.clientset); err == nil {
		// Use limit to avoid scanning too many pods (performance optimization)
		pods, err := g.clientset.CoreV1().Pods("").List(ctx, metav1.ListOptions{
			Limit: 2000, // Limit to 2000 pods for performance
		})
		if err == nil {
			for _, pod := range pods.Items {
				for _, containerStatus := range pod.Status.ContainerStatuses {
					// Lower threshold to 3 restarts to catch more issues
					if containerStatus.RestartCount >= 3 {
						created := pod.CreationTimestamp.Time
						// Check if pod was created or restarted within the time window
						if created.After(cutoffTime) || time.Since(created) < time.Duration(hours)*time.Hour {
							// Check if there's a recent restart
							recentRestart := false
							if containerStatus.LastTerminationState.Terminated != nil {
								termTime := containerStatus.LastTerminationState.Terminated.FinishedAt.Time
								if termTime.After(cutoffTime) {
									recentRestart = true
								}
							}
							if recentRestart || containerStatus.RestartCount >= 5 {
								events = append(events, TimelineEvent{
									ID:          fmt.Sprintf("pod-restart-%s-%s-%d", pod.Namespace, pod.Name, containerStatus.RestartCount),
									Timestamp:   time.Now().Format(time.RFC3339),
									Type:        "pod_restart",
									Severity:    map[bool]string{true: "warning", false: "info"}[containerStatus.RestartCount >= 5],
									Title:       fmt.Sprintf("High restarts - %s/%s", pod.Name, containerStatus.Name),
									Description: fmt.Sprintf("Container %s has restarted %d times", containerStatus.Name, containerStatus.RestartCount),
									Resource: ResourceInfo{
										Kind:      "Pod",
										Name:      pod.Name,
										Namespace: pod.Namespace,
									},
								})
							}
						}
					}
				}
			}
		}

		// 3. Get deployment events (real data)
		deployments, err := g.clientset.AppsV1().Deployments("").List(ctx, metav1.ListOptions{})
		if err == nil {
			for _, deployment := range deployments.Items {
				// Check for failed deployments
				if deployment.Status.Replicas > 0 && deployment.Status.ReadyReplicas < deployment.Status.Replicas {
					// Only add if deployment was recently updated or created
					updated := deployment.Status.Conditions
					recentUpdate := false
					for _, condition := range updated {
						if condition.LastTransitionTime.Time.After(cutoffTime) {
							recentUpdate = true
							break
						}
					}
					if recentUpdate || deployment.CreationTimestamp.Time.After(cutoffTime) {
						events = append(events, TimelineEvent{
							ID:        fmt.Sprintf("deployment-issue-%s-%s", deployment.Namespace, deployment.Name),
							Timestamp: time.Now().Format(time.RFC3339),
							Type:      "deployment",
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
		}

		// 4. Add cluster health events (even if no incidents, show cluster status)
		if len(events) == 0 {
			// Add a healthy status event if no incidents found
			events = append(events, TimelineEvent{
				ID:          "cluster-health-check",
				Timestamp:   time.Now().Format(time.RFC3339),
				Type:        "info",
				Severity:    "info",
				Title:       "Cluster Health Check",
				Description: "No incidents detected in the last 72 hours. Cluster appears healthy.",
				Resource: ResourceInfo{
					Kind:      "Cluster",
					Name:      "cluster",
					Namespace: "",
				},
			})
		}
	} else {
		// If clientset is not available, still return a status event
		events = append(events, TimelineEvent{
			ID:          "cluster-connection-status",
			Timestamp:   time.Now().Format(time.RFC3339),
			Type:        "info",
			Severity:    "info",
			Title:       "Cluster Connection",
			Description: "Unable to connect to cluster. Please check your cluster connection.",
			Resource: ResourceInfo{
				Kind:      "Cluster",
				Name:      "cluster",
				Namespace: "",
			},
		})
	}

	return events, nil
}

func formatIncidentTitle(inc KubernetesIncident) string {
	return fmt.Sprintf("%s - %s", inc.Type, inc.ResourceName)
}
