// Copyright 2025 KubeGraf Contributors
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0

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
)

// GenerateMLTimeline generates ML-related timeline events
func (app *App) GenerateMLTimeline(ctx context.Context, hours int) (*brain.MLTimelineResponse, error) {
	cutoffTime := time.Now().Add(-time.Duration(hours) * time.Hour)
	var events []brain.MLTimelineEvent

	// 1. Training job failures
	trainingFailures, err := app.getTrainingJobFailures(ctx, cutoffTime)
	if err == nil {
		events = append(events, trainingFailures...)
	}

	// 2. GPU spikes
	gpuSpikes, err := app.getGPUSpikes(ctx, cutoffTime)
	if err == nil {
		events = append(events, gpuSpikes...)
	}

	// 3. Model deployments
	modelDeployments, err := app.getModelDeployments(ctx, cutoffTime)
	if err == nil {
		events = append(events, modelDeployments...)
	}

	// 4. Drift-like changes (basic heuristics)
	driftEvents, err := app.getDriftEvents(ctx, cutoffTime)
	if err == nil {
		events = append(events, driftEvents...)
	}

	// Sort events by timestamp (newest first)
	sortEventsByTimestamp(events)

	return &brain.MLTimelineResponse{
		Events:    events,
		TimeRange: fmt.Sprintf("last %d hours", hours),
		Total:     len(events),
	}, nil
}

// getTrainingJobFailures finds failed training jobs
func (app *App) getTrainingJobFailures(ctx context.Context, since time.Time) ([]brain.MLTimelineEvent, error) {
	var events []brain.MLTimelineEvent

	jobs, err := app.clientset.BatchV1().Jobs("").List(ctx, metav1.ListOptions{
		LabelSelector: "app.kubernetes.io/component=ml-training",
	})
	if err != nil {
		return events, err
	}

	for _, job := range jobs.Items {
		// Check if job failed
		if job.Status.Failed > 0 {
			// Check if failure happened within time range
			if job.CreationTimestamp.Time.After(since) || 
			   (job.Status.CompletionTime != nil && job.Status.CompletionTime.Time.After(since)) {
				events = append(events, brain.MLTimelineEvent{
					ID:        fmt.Sprintf("training-failure-%s-%s", job.Namespace, job.Name),
					Timestamp: job.CreationTimestamp.Format(time.RFC3339),
					Type:      "training_failure",
					Severity:  "critical",
					Title:     fmt.Sprintf("Training Job Failed: %s", job.Name),
					Description: fmt.Sprintf("Training job %s in namespace %s failed after %d attempts", 
						job.Name, job.Namespace, job.Status.Failed),
					Resource: brain.MLResource{
						Kind:      "TrainingJob",
						Name:      job.Name,
						Namespace: job.Namespace,
					},
					Metrics: map[string]interface{}{
						"failed": job.Status.Failed,
						"succeeded": job.Status.Succeeded,
					},
				})
			}
		}
	}

	return events, nil
}

// getGPUSpikes detects GPU utilization spikes
func (app *App) getGPUSpikes(ctx context.Context, since time.Time) ([]brain.MLTimelineEvent, error) {
	var events []brain.MLTimelineEvent

	// Get GPU status
	gpuStatus, err := app.DetectDCGM(ctx)
	if err != nil || !gpuStatus.DCGMInstalled {
		return events, nil // No GPU monitoring available
	}

	// Get GPU metrics (simplified - in production, query historical data)
	// For now, we'll check current GPU utilization and flag if high
	// In a real implementation, you'd query Prometheus for historical spikes
	
	// This is a placeholder - in production, query Prometheus for GPU spikes
	// For now, return empty if no historical data available
	return events, nil
}

// getModelDeployments finds recent model deployments
func (app *App) getModelDeployments(ctx context.Context, since time.Time) ([]brain.MLTimelineEvent, error) {
	var events []brain.MLTimelineEvent

	// Check for inference service deployments
	deployments, err := app.clientset.AppsV1().Deployments("").List(ctx, metav1.ListOptions{
		LabelSelector: "app.kubernetes.io/component=ml-inference",
	})
	if err != nil {
		return events, err
	}

	for _, deployment := range deployments.Items {
		// Check if deployment was created or updated within time range
		if deployment.CreationTimestamp.Time.After(since) {
			events = append(events, brain.MLTimelineEvent{
				ID:        fmt.Sprintf("model-deployment-%s-%s", deployment.Namespace, deployment.Name),
				Timestamp: deployment.CreationTimestamp.Format(time.RFC3339),
				Type:      "model_deployment",
				Severity:  "info",
				Title:     fmt.Sprintf("Model Deployed: %s", deployment.Name),
				Description: fmt.Sprintf("Inference service %s deployed in namespace %s with %d replicas",
					deployment.Name, deployment.Namespace, *deployment.Spec.Replicas),
				Resource: brain.MLResource{
					Kind:      "InferenceService",
					Name:      deployment.Name,
					Namespace: deployment.Namespace,
				},
				Metrics: map[string]interface{}{
					"replicas": *deployment.Spec.Replicas,
					"readyReplicas": deployment.Status.ReadyReplicas,
				},
			})
		}
	}

	return events, nil
}

// getDriftEvents detects drift-like changes using basic heuristics
func (app *App) getDriftEvents(ctx context.Context, since time.Time) ([]brain.MLTimelineEvent, error) {
	var events []brain.MLTimelineEvent

	// Check for inference service replicas changes (could indicate drift)
	deployments, err := app.clientset.AppsV1().Deployments("").List(ctx, metav1.ListOptions{
		LabelSelector: "app.kubernetes.io/component=ml-inference",
	})
	if err != nil {
		return events, err
	}

	for _, deployment := range deployments.Items {
		// Check if HPA scaled up significantly (might indicate increased latency/load)
		if deployment.Status.ReadyReplicas > 0 {
			// If replicas increased significantly, it might indicate drift
			desiredReplicas := *deployment.Spec.Replicas
			if desiredReplicas > 3 && deployment.CreationTimestamp.Time.After(since.Add(-24*time.Hour)) {
				events = append(events, brain.MLTimelineEvent{
					ID:        fmt.Sprintf("drift-detected-%s-%s", deployment.Namespace, deployment.Name),
					Timestamp: time.Now().Format(time.RFC3339),
					Type:      "drift_detected",
					Severity:  "warning",
					Title:     fmt.Sprintf("Potential Drift: %s", deployment.Name),
					Description: fmt.Sprintf("Inference service %s scaled to %d replicas, suggesting increased load",
						deployment.Name, desiredReplicas),
					Resource: brain.MLResource{
						Kind:      "InferenceService",
						Name:      deployment.Name,
						Namespace: deployment.Namespace,
					},
					Metrics: map[string]interface{}{
						"replicas": desiredReplicas,
					},
				})
			}
		}
	}

	return events, nil
}

// sortEventsByTimestamp sorts events by timestamp (newest first)
func sortEventsByTimestamp(events []brain.MLTimelineEvent) {
	for i := 0; i < len(events)-1; i++ {
		for j := i + 1; j < len(events); j++ {
			if events[i].Timestamp < events[j].Timestamp {
				events[i], events[j] = events[j], events[i]
			}
		}
	}
}

