// Copyright 2025 KubeGraf Contributors
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0

package main

import (
	ml "github.com/kubegraf/kubegraf/internal/ml"
)

import (
	"context"
	"fmt"
	"time"

	corev1 "k8s.io/api/core/v1"
	batchv1 "k8s.io/api/batch/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// ListMLTrainingJobs lists all ML training jobs
func (ws *WebServer) ListMLTrainingJobs(ctx context.Context, namespace string) ([]ml.MLTrainingJob, error) {
	// List all jobs with kubegraf-managed label
	labelSelector := "kubegraf-managed=true,job-type=ml-training"
	
	var jobs *batchv1.JobList
	var err error
	
	if namespace == "" || namespace == "_all" {
		jobs, err = ws.app.clientset.BatchV1().Jobs("").List(ctx, metav1.ListOptions{
			LabelSelector: labelSelector,
		})
	} else {
		jobs, err = ws.app.clientset.BatchV1().Jobs(namespace).List(ctx, metav1.ListOptions{
			LabelSelector: labelSelector,
		})
	}
	
	if err != nil {
		return nil, fmt.Errorf("failed to list jobs: %v", err)
	}

	result := make([]ml.MLTrainingJob, 0, len(jobs.Items))
	for _, job := range jobs.Items {
		mlJob := convertJobToMLTrainingJob(job)
		result = append(result, mlJob)
	}

	return result, nil
}

// GetMLTrainingJob gets a specific ML training job
func (ws *WebServer) GetMLTrainingJob(ctx context.Context, name, namespace string) (*ml.MLTrainingJob, error) {
	job, err := ws.app.clientset.BatchV1().Jobs(namespace).Get(ctx, name, metav1.GetOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to get job: %v", err)
	}

	mlJob := convertJobToMLTrainingJob(*job)
	return &mlJob, nil
}

// DeleteMLTrainingJob deletes an ML training job
func (ws *WebServer) DeleteMLTrainingJob(ctx context.Context, name, namespace string) error {
	// Delete the job with propagation policy to also delete pods
	propagationPolicy := metav1.DeletePropagationForeground
	err := ws.app.clientset.BatchV1().Jobs(namespace).Delete(ctx, name, metav1.DeleteOptions{
		PropagationPolicy: &propagationPolicy,
	})
	if err != nil {
		return fmt.Errorf("failed to delete job: %v", err)
	}

	return nil
}

// convertJobToMLTrainingJob converts a Kubernetes Job to ml.MLTrainingJob
func convertJobToMLTrainingJob(job batchv1.Job) ml.MLTrainingJob {
	// Determine status
	status := "Active"
	if job.Status.Succeeded > 0 {
		status = "Succeeded"
	} else if job.Status.Failed > 0 {
		status = "Failed"
	}

	// Get image from container spec
	image := ""
	if len(job.Spec.Template.Spec.Containers) > 0 {
		image = job.Spec.Template.Spec.Containers[0].Image
	}

	// Get resources
	resources := make(map[string]string)
	if len(job.Spec.Template.Spec.Containers) > 0 {
		container := job.Spec.Template.Spec.Containers[0]
		if container.Resources.Limits != nil {
			if cpu, ok := container.Resources.Limits[corev1.ResourceCPU]; ok {
				resources["cpu"] = cpu.String()
			}
			if memory, ok := container.Resources.Limits[corev1.ResourceMemory]; ok {
				resources["memory"] = memory.String()
			}
			if gpu, ok := container.Resources.Limits["nvidia.com/gpu"]; ok {
				resources["gpu"] = gpu.String()
			}
		}
	}

	// Get pod names
	var pods []string
	// Note: In a real implementation, you'd query for pods with the job's selector
	// For now, we'll leave it empty

	// Format timestamps
	createdAt := job.CreationTimestamp.Format(time.RFC3339)
	completedAt := ""
	if job.Status.CompletionTime != nil {
		completedAt = job.Status.CompletionTime.Format(time.RFC3339)
	}

	return ml.MLTrainingJob{
		Name:        job.Name,
		Namespace:   job.Namespace,
		Status:      status,
		CreatedAt:   createdAt,
		CompletedAt: completedAt,
		Image:       image,
		Resources:   resources,
		Pods:        pods,
	}
}

