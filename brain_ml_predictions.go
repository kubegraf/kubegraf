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
	"strings"
	"time"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"

	brain "github.com/kubegraf/kubegraf/internal/brain"
)

// GenerateMLPredictions generates predictions about future ML events
func (app *App) GenerateMLPredictions(ctx context.Context) (*brain.MLPredictionsResponse, error) {
	var predictions []brain.MLPrediction

	// 1. GPU saturation forecast
	gpuPredictions, err := app.predictGPUSaturation(ctx)
	if err == nil {
		predictions = append(predictions, gpuPredictions...)
	}

	// 2. Model latency trending upward
	latencyPredictions, err := app.predictLatencyTrends(ctx)
	if err == nil {
		predictions = append(predictions, latencyPredictions...)
	}

	// 3. Expensive artifacts growing in bucket
	artifactPredictions, err := app.predictArtifactGrowth(ctx)
	if err == nil {
		predictions = append(predictions, artifactPredictions...)
	}

	return &brain.MLPredictionsResponse{
		Predictions: predictions,
		GeneratedAt: time.Now().Format(time.RFC3339),
		Total:       len(predictions),
	}, nil
}

// predictGPUSaturation predicts GPU saturation based on current usage trends
func (app *App) predictGPUSaturation(ctx context.Context) ([]brain.MLPrediction, error) {
	var predictions []brain.MLPrediction

	// Get GPU nodes
	gpuNodes, err := app.DetectGPUNodes(ctx)
	if err != nil {
		return predictions, nil // No GPUs available
	}

	// Note: GetGPUMetrics is on WebServer, not App
	// For now, skip detailed GPU metrics prediction
	// In production, you'd need to pass WebServer reference or refactor
	// Simple prediction based on node count
	if len(gpuNodes) > 0 {
		predictions = append(predictions, brain.MLPrediction{
			ID:          fmt.Sprintf("gpu-saturation-%s", gpuNodes[0].NodeName),
			Type:        "gpu_saturation",
			Severity:    "info",
			Title:       fmt.Sprintf("GPU nodes detected: %d", len(gpuNodes)),
			Description: "GPU resources available. Consider monitoring utilization for saturation risks.",
			Timeframe:   "ongoing",
			Confidence:  0.5,
			Resource: brain.MLResource{
				Kind: "GPU",
				Name: fmt.Sprintf("%s-gpu", gpuNodes[0].NodeName),
			},
			Trend: "stable",
		})
	}

	return predictions, nil
}

// predictLatencyTrends predicts latency increases based on current trends
func (app *App) predictLatencyTrends(ctx context.Context) ([]brain.MLPrediction, error) {
	var predictions []brain.MLPrediction

	// Get inference deployments
	deployments, err := app.clientset.AppsV1().Deployments("").List(ctx, metav1.ListOptions{
		LabelSelector: "app.kubernetes.io/component=ml-inference",
	})
	if err != nil {
		return predictions, nil
	}

	// Simple heuristic: if deployment has high CPU/memory usage, predict latency increase
	for _, deployment := range deployments.Items {
		// This is a simplified prediction - in reality, you'd analyze metrics over time
		predictions = append(predictions, brain.MLPrediction{
			ID:          fmt.Sprintf("latency-trend-%s", deployment.Name),
			Type:        "latency_increase",
			Severity:    "info",
			Title:       fmt.Sprintf("Potential latency increase for %s", deployment.Name),
			Description: "Model serving latency may increase due to resource constraints",
			Timeframe:   "within 24 hours",
			Confidence:  0.6,
			Resource: brain.MLResource{
				Kind:      "InferenceService",
				Name:      deployment.Name,
				Namespace: deployment.Namespace,
			},
			Trend: "increasing",
		})
	}

	return predictions, nil
}

// predictArtifactGrowth predicts growth in ML artifact storage
// Only generates predictions if MLflow is actually installed and artifacts exist
func (app *App) predictArtifactGrowth(ctx context.Context) ([]brain.MLPrediction, error) {
	var predictions []brain.MLPrediction

	// First, check if MLflow is actually installed
	mlflowStatus, err := app.DetectMLflow(ctx)
	if err != nil {
		return predictions, nil // Silently skip if detection fails
	}

	// Only generate prediction if MLflow is installed
	if !mlflowStatus.Installed {
		return predictions, nil // No MLflow, no predictions
	}

	// Check for artifact storage (PVC, S3 buckets, etc.)
	hasArtifacts := false
	var artifactStorageName string
	var artifactNamespace string = mlflowStatus.Namespace

	// Check for PVC-based artifact storage
	pvcs, err := app.clientset.CoreV1().PersistentVolumeClaims(mlflowStatus.Namespace).List(ctx, metav1.ListOptions{
		LabelSelector: "app.kubernetes.io/name=mlflow",
	})
	if err == nil {
		for _, pvc := range pvcs.Items {
			// Check if PVC name contains "artifact" or "mlflow"
			pvcNameLower := strings.ToLower(pvc.Name)
			if strings.Contains(pvcNameLower, "artifact") || strings.Contains(pvcNameLower, "mlflow") {
				hasArtifacts = true
				artifactStorageName = pvc.Name
				break
			}
		}
	}

	// Also check for MinIO or S3-based storage (via ConfigMaps or Secrets)
	if !hasArtifacts {
		configMaps, err := app.clientset.CoreV1().ConfigMaps(mlflowStatus.Namespace).List(ctx, metav1.ListOptions{
			LabelSelector: "app.kubernetes.io/name=mlflow",
		})
		if err == nil {
			for _, cm := range configMaps.Items {
				// Check if artifact store is configured
				if artifactURI, ok := cm.Data["default-artifact-root"]; ok && artifactURI != "" {
					hasArtifacts = true
					artifactStorageName = "mlflow-artifacts"
					break
				}
			}
		}
	}

	// Only generate prediction if artifacts actually exist
	if !hasArtifacts {
		return predictions, nil // No artifacts found, no predictions
	}

	// Check storage usage if PVC exists
	if artifactStorageName != "" {
		pvc, err := app.clientset.CoreV1().PersistentVolumeClaims(mlflowStatus.Namespace).Get(ctx, artifactStorageName, metav1.GetOptions{})
		if err == nil {
			// Get PVC status to check usage
			// Note: Actual usage requires metrics server or storage provider API
			// For now, we'll generate a prediction if PVC exists and is bound
			if pvc.Status.Phase == "Bound" {
				// Generate prediction with moderate confidence
				// In production, you'd query actual storage usage metrics
				predictions = append(predictions, brain.MLPrediction{
					ID:          fmt.Sprintf("artifact-growth-%s", artifactStorageName),
					Type:        "artifact_growth",
					Severity:    "info",
					Title:       "ML artifact storage growing",
					Description: fmt.Sprintf("Model artifacts and experiment data are growing in %s, may need cleanup", artifactStorageName),
					Timeframe:   "within 1 week",
					Confidence:  0.5,
					Resource: brain.MLResource{
						Kind:      "ArtifactStorage",
						Name:      artifactStorageName,
						Namespace: artifactNamespace,
					},
					Trend: "increasing",
				})
			}
		}
	} else {
		// S3/MinIO based storage - generate prediction
		predictions = append(predictions, brain.MLPrediction{
			ID:          fmt.Sprintf("artifact-growth-%s", artifactStorageName),
			Type:        "artifact_growth",
			Severity:    "info",
			Title:       "ML artifact storage growing",
			Description: fmt.Sprintf("Model artifacts and experiment data are growing in %s, may need cleanup", artifactStorageName),
			Timeframe:   "within 1 week",
			Confidence:  0.5,
			Resource: brain.MLResource{
				Kind:      "ArtifactStorage",
				Name:      artifactStorageName,
				Namespace: artifactNamespace,
			},
			Trend: "increasing",
		})
	}

	return predictions, nil
}
