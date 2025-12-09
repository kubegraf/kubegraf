// Copyright 2025 KubeGraf Contributors
// Brain Summary data generation utilities

package main

import (
	"context"
	"fmt"
	"time"

	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// BrainSummary contains intelligent summary of cluster health
type BrainSummary struct {
	Last24hSummary    string   `json:"last24hSummary"`
	TopRiskAreas     []string `json:"topRiskAreas"`
	RecommendedActions []string `json:"recommendedActions"`
	GeneratedAt      string   `json:"generatedAt"`
}

// GenerateBrainSummary generates intelligent summary from real cluster data
func GenerateBrainSummary(ctx context.Context, app *App) (*BrainSummary, error) {
	cutoffTime := time.Now().Add(-24 * time.Hour)

	// Get incidents from scanner
	scanner := NewIncidentScanner(app)
	incidents := scanner.ScanAllIncidents("")

	// Filter incidents from last 24h
	var recentIncidents []KubernetesIncident
	for _, inc := range incidents {
		if inc.FirstSeen.After(cutoffTime) {
			recentIncidents = append(recentIncidents, inc)
		}
	}

	// Calculate metrics
	criticalCount := 0
	warningCount := 0
	oomCount := 0
	crashLoopCount := 0
	highRestartCount := 0

	for _, inc := range recentIncidents {
		if inc.Severity == "critical" {
			criticalCount += inc.Count
		}
		if inc.Severity == "warning" {
			warningCount += inc.Count
		}
		if inc.Type == "oom" {
			oomCount += inc.Count
		}
		if inc.Type == "crashloop" {
			crashLoopCount += inc.Count
		}
		if inc.Type == "high_restarts" {
			highRestartCount += inc.Count
		}
	}

	// Get pod metrics
	pods, _ := app.clientset.CoreV1().Pods("").List(ctx, metav1.ListOptions{})
	totalPods := len(pods.Items)
	runningPods := 0
	pendingPods := 0
	failedPods := 0

	for _, pod := range pods.Items {
		switch pod.Status.Phase {
		case corev1.PodRunning:
			runningPods++
		case corev1.PodPending:
			pendingPods++
		case corev1.PodFailed:
			failedPods++
		}
	}

	// Generate summary text
	summary := fmt.Sprintf("In the last 24 hours, %d incidents were detected. ", len(recentIncidents))
	if criticalCount > 0 {
		summary += fmt.Sprintf("%d critical and ", criticalCount)
	}
	summary += fmt.Sprintf("%d warning-level issues. ", warningCount)
	
	if oomCount > 0 {
		summary += fmt.Sprintf("%d OOMKilled events occurred. ", oomCount)
	}
	if crashLoopCount > 0 {
		summary += fmt.Sprintf("%d CrashLoopBackOff incidents detected. ", crashLoopCount)
	}
	if highRestartCount > 0 {
		summary += fmt.Sprintf("%d high restart incidents. ", highRestartCount)
	}

	// Cluster health summary
	summary += fmt.Sprintf("Cluster status: %d total pods (%d running, %d pending, %d failed).", 
		totalPods, runningPods, pendingPods, failedPods)

	// Top risk areas
	riskAreas := []string{}
	if oomCount > 0 {
		riskAreas = append(riskAreas, "Memory pressure and OOMKilled containers indicate resource constraints")
	}
	if crashLoopCount > 0 {
		riskAreas = append(riskAreas, "CrashLoopBackOff patterns suggest application instability")
	}
	if highRestartCount > 0 {
		riskAreas = append(riskAreas, "High container restart rates indicate potential configuration or resource issues")
	}
	if pendingPods > 0 {
		riskAreas = append(riskAreas, fmt.Sprintf("%d pods in pending state may indicate resource constraints", pendingPods))
	}
	if failedPods > 0 {
		riskAreas = append(riskAreas, fmt.Sprintf("%d failed pods require immediate attention", failedPods))
	}
	if len(recentIncidents) > 10 {
		riskAreas = append(riskAreas, "High incident rate indicates systemic issues requiring attention")
	}
	if len(riskAreas) == 0 {
		riskAreas = append(riskAreas, "No significant risk areas identified")
	}

	// Recommended actions
	actions := []string{}
	if oomCount > 0 {
		actions = append(actions, "Review and increase memory limits for workloads experiencing OOMKilled events")
	}
	if crashLoopCount > 0 {
		actions = append(actions, "Investigate application logs for CrashLoopBackOff root causes")
	}
	if highRestartCount > 0 {
		actions = append(actions, "Review container restart patterns and investigate root causes")
	}
	if pendingPods > 0 {
		actions = append(actions, "Check node resources and storage availability for pending pods")
	}
	if failedPods > 0 {
		actions = append(actions, "Investigate failed pods and check events for error details")
	}
	if len(recentIncidents) > 5 {
		actions = append(actions, "Consider implementing Horizontal Pod Autoscaling (HPA) for high-traffic workloads")
	}
	if len(actions) == 0 {
		actions = append(actions, "Continue monitoring cluster health and resource usage")
	}

	return &BrainSummary{
		Last24hSummary:    summary,
		TopRiskAreas:     riskAreas[:min(3, len(riskAreas))],
		RecommendedActions: actions[:min(5, len(actions))],
		GeneratedAt:      time.Now().Format(time.RFC3339),
	}, nil
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

