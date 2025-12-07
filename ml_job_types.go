// Copyright 2025 KubeGraf Contributors
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0

package main

import (
	corev1 "k8s.io/api/core/v1"
	batchv1 "k8s.io/api/batch/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/api/resource"
)

// MLTrainingJobRequest represents a request to create an ML training job
type MLTrainingJobRequest struct {
	Name          string            `json:"name"`
	Namespace     string            `json:"namespace"`
	Script        string            `json:"script,omitempty"`        // Python script content
	Image         string            `json:"image,omitempty"`         // Docker image
	AutoBuild     bool              `json:"autoBuild"`               // Auto-build Dockerfile from script
	CPU           string            `json:"cpu,omitempty"`           // CPU limit
	Memory        string            `json:"memory,omitempty"`        // Memory limit
	GPU           string            `json:"gpu,omitempty"`            // GPU count
	RestartPolicy string            `json:"restartPolicy"`           // Never, OnFailure, Always
	EnvVars       map[string]string `json:"envVars,omitempty"`      // Environment variables
	VolumeMounts  []VolumeMount     `json:"volumeMounts,omitempty"` // Volume mounts
	NodeSelector  map[string]string `json:"nodeSelector,omitempty"` // Node selector for GPU
}

// VolumeMount represents a volume mount configuration
type VolumeMount struct {
	Name      string `json:"name"`
	MountPath string `json:"mountPath"`
	PVCName   string `json:"pvcName,omitempty"` // PVC name if using PVC
	ReadOnly  bool   `json:"readOnly,omitempty"`
}

// MLTrainingJob represents an ML training job
type MLTrainingJob struct {
	Name        string            `json:"name"`
	Namespace   string            `json:"namespace"`
	Status      string            `json:"status"`      // Active, Succeeded, Failed
	CreatedAt   string            `json:"createdAt"`
	CompletedAt string            `json:"completedAt,omitempty"`
	Image       string            `json:"image"`
	Resources   map[string]string `json:"resources"`
	Pods        []string          `json:"pods,omitempty"`
}

// MLJobLogsRequest represents a request for job logs
type MLJobLogsRequest struct {
	Name      string `json:"name"`
	Namespace string `json:"namespace"`
	Follow    bool   `json:"follow"` // Stream logs via WebSocket
}

// buildJobSpec builds a Kubernetes Job spec from the request
func buildJobSpec(req MLTrainingJobRequest) (*batchv1.Job, error) {
	// Parse resources
	cpuLimit := resource.MustParse(req.CPU)
	memoryLimit := resource.MustParse(req.Memory)
	
	// Build container
	container := corev1.Container{
		Name:  "training",
		Image: req.Image,
		Resources: corev1.ResourceRequirements{
			Limits: corev1.ResourceList{
				corev1.ResourceCPU:    cpuLimit,
				corev1.ResourceMemory: memoryLimit,
			},
			Requests: corev1.ResourceList{
				corev1.ResourceCPU:    cpuLimit,
				corev1.ResourceMemory: memoryLimit,
			},
		},
	}

	// Add GPU if specified
	if req.GPU != "" && req.GPU != "0" {
		gpuQuantity := resource.MustParse(req.GPU)
		container.Resources.Limits["nvidia.com/gpu"] = gpuQuantity
		container.Resources.Requests["nvidia.com/gpu"] = gpuQuantity
	}

	// Add environment variables
	if len(req.EnvVars) > 0 {
		for key, value := range req.EnvVars {
			container.Env = append(container.Env, corev1.EnvVar{
				Name:  key,
				Value: value,
			})
		}
	}

	// Add volume mounts
	var volumes []corev1.Volume
	if len(req.VolumeMounts) > 0 {
		for _, vm := range req.VolumeMounts {
			container.VolumeMounts = append(container.VolumeMounts, corev1.VolumeMount{
				Name:      vm.Name,
				MountPath: vm.MountPath,
				ReadOnly:  vm.ReadOnly,
			})

			// Create volume from PVC
			if vm.PVCName != "" {
				volumes = append(volumes, corev1.Volume{
					Name: vm.Name,
					VolumeSource: corev1.VolumeSource{
						PersistentVolumeClaim: &corev1.PersistentVolumeClaimVolumeSource{
							ClaimName: vm.PVCName,
						},
					},
				})
			}
		}
	}

	// If script is provided and auto-build is enabled, we'd need to handle that separately
	// For now, we assume the image already contains the script or it's mounted

	// Determine restart policy
	restartPolicy := corev1.RestartPolicyNever
	if req.RestartPolicy == "OnFailure" {
		restartPolicy = corev1.RestartPolicyOnFailure
	} else if req.RestartPolicy == "Always" {
		restartPolicy = corev1.RestartPolicyAlways
	}

	// Build Job spec
	job := &batchv1.Job{
		ObjectMeta: metav1.ObjectMeta{
			Name:      req.Name,
			Namespace: req.Namespace,
			Labels: map[string]string{
				"app":           "ml-training",
				"job-type":      "ml-training",
				"kubegraf-managed": "true",
			},
		},
		Spec: batchv1.JobSpec{
			Template: corev1.PodTemplateSpec{
				Spec: corev1.PodSpec{
					RestartPolicy: restartPolicy,
					Containers:    []corev1.Container{container},
					Volumes:       volumes,
				},
			},
		},
	}

	// Add node selector for GPU if specified
	if req.GPU != "" && req.GPU != "0" {
		if job.Spec.Template.Spec.NodeSelector == nil {
			job.Spec.Template.Spec.NodeSelector = make(map[string]string)
		}
		job.Spec.Template.Spec.NodeSelector["nvidia.com/gpu"] = "true"
	}

	// Merge custom node selectors
	if len(req.NodeSelector) > 0 {
		if job.Spec.Template.Spec.NodeSelector == nil {
			job.Spec.Template.Spec.NodeSelector = make(map[string]string)
		}
		for k, v := range req.NodeSelector {
			job.Spec.Template.Spec.NodeSelector[k] = v
		}
	}

	return job, nil
}

