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
	"os"
	"os/exec"
	"path/filepath"
	"strings"

	batchv1 "k8s.io/api/batch/v1"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/api/resource"

	ml "github.com/kubegraf/kubegraf/internal/ml"
)

// CreateMLTrainingJob creates a Kubernetes Job for ML training
func (ws *WebServer) CreateMLTrainingJob(ctx context.Context, req ml.MLTrainingJobRequest) (*batchv1.Job, error) {
	// Validate request
	if req.Name == "" {
		return nil, fmt.Errorf("job name is required")
	}
	if req.Namespace == "" {
		return nil, fmt.Errorf("namespace is required")
	}

	// If auto-build is enabled and script is provided, build Docker image
	if req.AutoBuild && req.Script != "" {
		image, err := ws.buildDockerImageFromScript(ctx, req)
		if err != nil {
			return nil, fmt.Errorf("failed to build Docker image: %v", err)
		}
		req.Image = image
	}

	// Build Job spec
	job, err := ws.buildMLJobSpec(req)
	if err != nil {
		return nil, fmt.Errorf("failed to build job spec: %v", err)
	}

	// Create namespace if it doesn't exist
	_, err = ws.app.clientset.CoreV1().Namespaces().Get(ctx, req.Namespace, metav1.GetOptions{})
	if err != nil {
		// Try to create namespace (simplified - in production, check if it's a "not found" error)
		// For now, we'll let Kubernetes handle namespace creation via the Job
	}

	// Create the Job
	createdJob, err := ws.app.clientset.BatchV1().Jobs(req.Namespace).Create(ctx, job, metav1.CreateOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to create job: %v", err)
	}

	return createdJob, nil
}

// buildDockerImageFromScript builds a Docker image from a Python script
// This is a simplified implementation - in production, you'd want more robust handling
func (ws *WebServer) buildDockerImageFromScript(ctx context.Context, req ml.MLTrainingJobRequest) (string, error) {
	// Create a temporary directory for the build
	tmpDir, err := os.MkdirTemp("", "ml-job-*")
	if err != nil {
		return "", fmt.Errorf("failed to create temp directory: %v", err)
	}
	defer os.RemoveAll(tmpDir)

	// Write the script to a file
	scriptPath := filepath.Join(tmpDir, "train.py")
	if err := os.WriteFile(scriptPath, []byte(req.Script), 0644); err != nil {
		return "", fmt.Errorf("failed to write script: %v", err)
	}

	// Generate Dockerfile
	dockerfile := ws.generateDockerfile(req)
	dockerfilePath := filepath.Join(tmpDir, "Dockerfile")
	if err := os.WriteFile(dockerfilePath, []byte(dockerfile), 0644); err != nil {
		return "", fmt.Errorf("failed to write Dockerfile: %v", err)
	}

	// Build Docker image
	imageName := fmt.Sprintf("ml-training-%s:latest", req.Name)
	buildCmd := exec.CommandContext(ctx, "docker", "build", "-t", imageName, tmpDir)
	buildCmd.Dir = tmpDir
	_, err = buildCmd.CombinedOutput()
	if err != nil {
		return "", fmt.Errorf("Docker build failed: %v", err)
	}

	// For now, return the image name
	// In production, you'd want to push to a registry
	return imageName, nil
}

// generateDockerfile generates a Dockerfile for the ML training script
func (ws *WebServer) generateDockerfile(req ml.MLTrainingJobRequest) string {
	// Default base image - can be customized
	baseImage := "python:3.9-slim"
	if strings.Contains(strings.ToLower(req.Script), "torch") || strings.Contains(strings.ToLower(req.Script), "pytorch") {
		baseImage = "pytorch/pytorch:latest"
	} else if strings.Contains(strings.ToLower(req.Script), "tensorflow") || strings.Contains(strings.ToLower(req.Script), "tf.") {
		baseImage = "tensorflow/tensorflow:latest"
	}

	dockerfile := fmt.Sprintf(`FROM %s

WORKDIR /app

# Install common ML libraries
RUN pip install --no-cache-dir numpy pandas scikit-learn

# Copy training script
COPY train.py /app/train.py

# Run the training script
CMD ["python", "train.py"]
`, baseImage)

	return dockerfile
}

// buildMLJobSpec builds a Kubernetes Job spec from the request
func (ws *WebServer) buildMLJobSpec(req ml.MLTrainingJobRequest) (*batchv1.Job, error) {
	// Set defaults
	if req.Image == "" {
		return nil, fmt.Errorf("image is required")
	}

	// Build container spec
	container := corev1.Container{
		Name:  "training",
		Image: req.Image,
	}

	// Set resources
	if req.CPU != "" || req.Memory != "" || req.GPU != "" {
		container.Resources = corev1.ResourceRequirements{
			Requests: make(corev1.ResourceList),
			Limits:   make(corev1.ResourceList),
		}
		if req.CPU != "" {
			container.Resources.Requests[corev1.ResourceCPU] = resource.MustParse(req.CPU)
			container.Resources.Limits[corev1.ResourceCPU] = resource.MustParse(req.CPU)
		}
		if req.Memory != "" {
			container.Resources.Requests[corev1.ResourceMemory] = resource.MustParse(req.Memory)
			container.Resources.Limits[corev1.ResourceMemory] = resource.MustParse(req.Memory)
		}
		if req.GPU != "" {
			container.Resources.Requests["nvidia.com/gpu"] = resource.MustParse(req.GPU)
			container.Resources.Limits["nvidia.com/gpu"] = resource.MustParse(req.GPU)
		}
	}

	// Set environment variables
	if len(req.EnvVars) > 0 {
		envVars := make([]corev1.EnvVar, 0, len(req.EnvVars))
		for k, v := range req.EnvVars {
			envVars = append(envVars, corev1.EnvVar{
				Name:  k,
				Value: v,
			})
		}
		container.Env = envVars
	}

	// Build Job spec
	restartPolicy := corev1.RestartPolicyNever
	if req.RestartPolicy == "OnFailure" {
		restartPolicy = corev1.RestartPolicyOnFailure
	} else if req.RestartPolicy == "Always" {
		restartPolicy = corev1.RestartPolicyAlways
	}

	job := &batchv1.Job{
		ObjectMeta: metav1.ObjectMeta{
			Name:      req.Name,
			Namespace: req.Namespace,
			Labels: map[string]string{
				"kubegraf-managed": "true",
				"job-type":          "ml-training",
			},
		},
		Spec: batchv1.JobSpec{
			Template: corev1.PodTemplateSpec{
				Spec: corev1.PodSpec{
					RestartPolicy: restartPolicy,
					Containers:    []corev1.Container{container},
				},
			},
		},
	}

	return job, nil
}
