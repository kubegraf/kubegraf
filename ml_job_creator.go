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
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// CreateMLTrainingJob creates a Kubernetes Job for ML training
func (ws *WebServer) CreateMLTrainingJob(ctx context.Context, req MLTrainingJobRequest) (*batchv1.Job, error) {
	// Validate request
	if req.Name == "" {
		return nil, fmt.Errorf("job name is required")
	}
	if req.Namespace == "" {
		req.Namespace = "default"
	}
	if req.Image == "" && !req.AutoBuild {
		return nil, fmt.Errorf("image is required when autoBuild is false")
	}

	// Handle auto-build if requested
	if req.AutoBuild && req.Script != "" {
		image, err := ws.buildDockerImageFromScript(ctx, req)
		if err != nil {
			return nil, fmt.Errorf("failed to build Docker image: %v", err)
		}
		req.Image = image
	}

	// Build Job spec
	job, err := buildJobSpec(req)
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
func (ws *WebServer) buildDockerImageFromScript(ctx context.Context, req MLTrainingJobRequest) (string, error) {
	// Create a temporary directory for the build
	tmpDir, err := os.MkdirTemp("", "ml-job-*")
	if err != nil {
		return "", err
	}
	defer os.RemoveAll(tmpDir)

	// Write script to file
	scriptPath := filepath.Join(tmpDir, "train.py")
	if err := os.WriteFile(scriptPath, []byte(req.Script), 0644); err != nil {
		return "", err
	}

	// Generate Dockerfile
	dockerfile := ws.generateDockerfile(req)
	dockerfilePath := filepath.Join(tmpDir, "Dockerfile")
	if err := os.WriteFile(dockerfilePath, []byte(dockerfile), 0644); err != nil {
		return "", err
	}

	// Build Docker image
	imageName := fmt.Sprintf("ml-training-%s:latest", strings.ToLower(req.Name))
	imageName = strings.ReplaceAll(imageName, "_", "-")

	// Check if Docker is available
	if _, err := exec.LookPath("docker"); err != nil {
		return "", fmt.Errorf("Docker is not available for building images. Please provide a pre-built image.")
	}

	// Build the image
	buildCmd := exec.CommandContext(ctx, "docker", "build", "-t", imageName, tmpDir)
	buildCmd.Stdout = os.Stdout
	buildCmd.Stderr = os.Stderr
	if err := buildCmd.Run(); err != nil {
		return "", fmt.Errorf("Docker build failed: %v", err)
	}

	// For now, return the image name
	// In production, you'd want to push to a registry
	return imageName, nil
}

// generateDockerfile generates a Dockerfile for the ML training script
func (ws *WebServer) generateDockerfile(req MLTrainingJobRequest) string {
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

