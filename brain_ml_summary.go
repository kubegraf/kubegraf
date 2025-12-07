// Copyright 2025 KubeGraf Contributors
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0

package main

import (
	"context"
	"fmt"
	"time"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"

	brain "github.com/kubegraf/kubegraf/internal/brain"

	gpu "github.com/kubegraf/kubegraf/internal/gpu"
)

// GenerateMLSummary generates a natural language summary of ML activities
func (app *App) GenerateMLSummary(ctx context.Context, hours int) (*brain.MLSummary, error) {
	// Collect data from various sources
	timeline, _ := app.GenerateMLTimeline(ctx, hours)
	predictions, _ := app.GenerateMLPredictions(ctx)
	
	// Get training jobs
	jobs, _ := app.clientset.BatchV1().Jobs("").List(ctx, metav1.ListOptions{
		LabelSelector: "app.kubernetes.io/component=ml-training",
	})
	
	// Get inference services
	deployments, _ := app.clientset.AppsV1().Deployments("").List(ctx, metav1.ListOptions{
		LabelSelector: "app.kubernetes.io/component=ml-inference",
	})
	
	// Get GPU status
	gpuStatus, _ := app.DetectDCGM(ctx)
	gpuNodes, _ := app.DetectGPUNodes(ctx)

	// Build summary
	summary := buildMLSummaryText(timeline, predictions, len(jobs.Items), len(deployments.Items), gpuStatus, gpuNodes, hours)
	insights := extractKeyInsights(timeline, predictions, len(jobs.Items), len(deployments.Items))
	recommendations := generateRecommendations(timeline, predictions, len(jobs.Items), len(deployments.Items), gpuStatus)

	return &brain.MLSummary{
		Summary:        summary,
		KeyInsights:    insights,
		Recommendations: recommendations,
		GeneratedAt:    time.Now().Format(time.RFC3339),
		TimeRange:      fmt.Sprintf("last %d hours", hours),
	}, nil
}

// buildMLSummaryText creates a natural language summary
func buildMLSummaryText(timeline *brain.MLTimelineResponse, predictions *brain.MLPredictionsResponse, 
	jobCount int, deploymentCount int, gpuStatus *gpu.GPUStatus, gpuNodes []gpu.GPUNodeInfo, hours int) string {
	
	summary := fmt.Sprintf("ML Activity Summary (Last %d hours):\n\n", hours)
	
	// Training jobs
	failedJobs := 0
	for _, event := range timeline.Events {
		if event.Type == "training_failure" {
			failedJobs++
		}
	}
	
	summary += fmt.Sprintf("Training: %d active jobs, %d failures detected.\n", jobCount, failedJobs)
	
	// Inference services
	summary += fmt.Sprintf("Inference: %d services deployed.\n", deploymentCount)
	
	// GPU status
	if len(gpuNodes) > 0 {
		totalGPUs := 0
		for _, node := range gpuNodes {
			totalGPUs += node.TotalGPUs
		}
		summary += fmt.Sprintf("GPU Resources: %d nodes with %d total GPUs", len(gpuNodes), totalGPUs)
		if gpuStatus.DCGMInstalled {
			summary += " (monitoring active)"
		}
		summary += ".\n"
	}
	
	// Events
	if len(timeline.Events) > 0 {
		summary += fmt.Sprintf("Events: %d ML-related events recorded.\n", len(timeline.Events))
	}
	
	// Predictions
	if len(predictions.Predictions) > 0 {
		summary += fmt.Sprintf("Predictions: %d forecasts generated.\n", len(predictions.Predictions))
	}
	
	return summary
}

// extractKeyInsights extracts key insights from ML data
func extractKeyInsights(timeline *brain.MLTimelineResponse, predictions *brain.MLPredictionsResponse,
	jobCount int, deploymentCount int) []string {
	
	var insights []string
	
	// Count event types
	criticalEvents := 0
	warningEvents := 0
	for _, event := range timeline.Events {
		if event.Severity == "critical" {
			criticalEvents++
		} else if event.Severity == "warning" {
			warningEvents++
		}
	}
	
	if criticalEvents > 0 {
		insights = append(insights, fmt.Sprintf("%d critical ML events require immediate attention", criticalEvents))
	}
	
	if warningEvents > 0 {
		insights = append(insights, fmt.Sprintf("%d warning-level ML events detected", warningEvents))
	}
	
	// Check for GPU saturation predictions
	for _, pred := range predictions.Predictions {
		if pred.Type == "gpu_saturation" && pred.Severity == "critical" {
			insights = append(insights, "GPU saturation risk detected - consider scaling GPU resources")
		}
	}
	
	// Check for latency trends
	for _, pred := range predictions.Predictions {
		if pred.Type == "latency_increase" {
			insights = append(insights, "Model latency trending upward - review inference service performance")
		}
	}
	
	if len(insights) == 0 {
		insights = append(insights, "ML operations running smoothly with no critical issues")
	}
	
	return insights
}

// generateRecommendations generates actionable recommendations
func generateRecommendations(timeline *brain.MLTimelineResponse, predictions *brain.MLPredictionsResponse,
	jobCount int, deploymentCount int, gpuStatus *gpu.GPUStatus) []string {
	
	var recommendations []string
	
	// Check for training failures
	for _, event := range timeline.Events {
		if event.Type == "training_failure" {
			recommendations = append(recommendations, "Review failed training job logs to identify root causes")
			break
		}
	}
	
	// Check for GPU saturation
	for _, pred := range predictions.Predictions {
		if pred.Type == "gpu_saturation" {
			recommendations = append(recommendations, "Consider adding GPU nodes or optimizing job scheduling")
			break
		}
	}
	
	// Check for latency increases
	for _, pred := range predictions.Predictions {
		if pred.Type == "latency_increase" {
			recommendations = append(recommendations, "Investigate inference service performance and consider model optimization")
			break
		}
	}
	
	// Check for artifact growth
	for _, pred := range predictions.Predictions {
		if pred.Type == "artifact_growth" {
			recommendations = append(recommendations, "Review artifact storage policies and implement cleanup strategies")
			break
		}
	}
	
	// GPU monitoring recommendation
	if len(gpuStatus.GPUNodes) > 0 && !gpuStatus.DCGMInstalled {
		recommendations = append(recommendations, "Install DCGM exporter for detailed GPU metrics and monitoring")
	}
	
	if len(recommendations) == 0 {
		recommendations = append(recommendations, "Continue monitoring ML workloads and maintain current operational practices")
	}
	
	return recommendations
}

