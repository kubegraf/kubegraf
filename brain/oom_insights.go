// Copyright 2025 KubeGraf Contributors
// Brain OOM Insights data generation utilities

package brain

import (
	"context"
	"fmt"
	"time"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"
)

// OOMInsightsGenerator generates OOM insights from cluster data
type OOMInsightsGenerator struct {
	clientset       kubernetes.Interface
	incidentScanner IncidentScanner
}

// NewOOMInsightsGenerator creates a new OOM insights generator
func NewOOMInsightsGenerator(clientset kubernetes.Interface, incidentScanner IncidentScanner) *OOMInsightsGenerator {
	return &OOMInsightsGenerator{
		clientset:       clientset,
		incidentScanner: incidentScanner,
	}
}

// Generate generates OOM insights from real cluster data
func (g *OOMInsightsGenerator) Generate(ctx context.Context) (*OOMMetrics, error) {
	// Validate clientset
	if err := ValidateClientset(g.clientset); err != nil {
		return &OOMMetrics{
			Incidents24h:   0,
			CrashLoops24h:  0,
			TopProblematic: []ProblematicWorkload{},
		}, nil // Return empty metrics instead of error
	}

	cutoffTime := time.Now().Add(-24 * time.Hour)

	// Get incidents from scanner
	incidents := g.incidentScanner.ScanAllIncidents("")

	// Filter incidents from last 24h
	var recentIncidents []KubernetesIncident
	for _, inc := range incidents {
		if inc.FirstSeen.After(cutoffTime) {
			recentIncidents = append(recentIncidents, inc)
		}
	}

	// Calculate metrics
	oomIncidents := 0
	crashLoops := 0
	for _, inc := range recentIncidents {
		if inc.Type == "oom" {
			oomIncidents += inc.Count
		}
		if inc.Type == "crashloop" {
			crashLoops += inc.Count
		}
	}

	// Group by resource to find problematic workloads
	workloadMap := make(map[string]*ProblematicWorkload)

	for _, inc := range recentIncidents {
		key := fmt.Sprintf("%s:%s", inc.Namespace, inc.ResourceName)
		if workloadMap[key] == nil {
			workloadMap[key] = &ProblematicWorkload{
				Name:      inc.ResourceName,
				Namespace: inc.Namespace,
				Kind:      inc.ResourceKind,
			}
		}
		workload := workloadMap[key]
		if inc.Type == "oom" {
			workload.Issues.OOMKilled += inc.Count
		}
		if inc.Type == "crashloop" {
			workload.Issues.CrashLoops += inc.Count
		}
		workload.Issues.Restarts += inc.Count
	}

	// Also check pods directly for restarts (only if clientset is available)
	pods, err := g.clientset.CoreV1().Pods("").List(ctx, metav1.ListOptions{})
	if err == nil {
		for _, pod := range pods.Items {
			for _, containerStatus := range pod.Status.ContainerStatuses {
				if containerStatus.RestartCount > 0 {
					key := fmt.Sprintf("%s:%s", pod.Namespace, pod.Name)
					if workloadMap[key] == nil {
						workloadMap[key] = &ProblematicWorkload{
							Name:      pod.Name,
							Namespace: pod.Namespace,
							Kind:      "Pod",
						}
					}
					workloadMap[key].Issues.Restarts += int(containerStatus.RestartCount)
				}
			}
		}
	}

	// Calculate scores and sort
	var topProblematic []ProblematicWorkload
	for _, workload := range workloadMap {
		workload.Score = workload.Issues.OOMKilled*10 + workload.Issues.CrashLoops*5 + workload.Issues.Restarts
		topProblematic = append(topProblematic, *workload)
	}

	// Sort by score (descending) and take top 5
	for i := 0; i < len(topProblematic)-1; i++ {
		for j := i + 1; j < len(topProblematic); j++ {
			if topProblematic[i].Score < topProblematic[j].Score {
				topProblematic[i], topProblematic[j] = topProblematic[j], topProblematic[i]
			}
		}
	}
	if len(topProblematic) > 5 {
		topProblematic = topProblematic[:5]
	}

	return &OOMMetrics{
		Incidents24h:   oomIncidents,
		CrashLoops24h:  crashLoops,
		TopProblematic: topProblematic,
	}, nil
}
