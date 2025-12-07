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

	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"

	inference "github.com/kubegraf/kubegraf/internal/inference"
)

// ListInferenceServices lists all inference services
func (ws *WebServer) ListInferenceServices(ctx context.Context, namespace string) ([]inference.InferenceService, error) {
	labelSelector := "kubegraf-managed=true,type=inference-service"
	
	var deployments *appsv1.DeploymentList
	var err error
	
	if namespace == "" || namespace == "_all" {
		deployments, err = ws.app.clientset.AppsV1().Deployments("").List(ctx, metav1.ListOptions{
			LabelSelector: labelSelector,
		})
	} else {
		deployments, err = ws.app.clientset.AppsV1().Deployments(namespace).List(ctx, metav1.ListOptions{
			LabelSelector: labelSelector,
		})
	}
	
	if err != nil {
		return nil, fmt.Errorf("failed to list deployments: %v", err)
	}

	result := make([]inference.InferenceService, 0, len(deployments.Items))
	for _, deployment := range deployments.Items {
		inf := convertDeploymentToInferenceService(deployment)
		result = append(result, inf)
	}

	return result, nil
}

// GetInferenceService gets a specific inference service
func (ws *WebServer) GetInferenceService(ctx context.Context, name, namespace string) (*inference.InferenceService, error) {
	deployment, err := ws.app.clientset.AppsV1().Deployments(namespace).Get(ctx, name, metav1.GetOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to get deployment: %v", err)
	}

	inf := convertDeploymentToInferenceService(*deployment)
	return &inf, nil
}

// DeleteInferenceService deletes an inference service
func (ws *WebServer) DeleteInferenceService(ctx context.Context, name, namespace string) error {
	// Delete deployment
	propagationPolicy := metav1.DeletePropagationForeground
	err := ws.app.clientset.AppsV1().Deployments(namespace).Delete(ctx, name, metav1.DeleteOptions{
		PropagationPolicy: &propagationPolicy,
	})
	if err != nil {
		return fmt.Errorf("failed to delete deployment: %v", err)
	}

	// Delete service
	err = ws.app.clientset.CoreV1().Services(namespace).Delete(ctx, name, metav1.DeleteOptions{})
	if err != nil {
		// Service deletion failure is not critical
		fmt.Printf("Warning: Failed to delete service: %v\n", err)
	}

	// Delete ConfigMap
	configMapName := fmt.Sprintf("%s-model", name)
	err = ws.app.clientset.CoreV1().ConfigMaps(namespace).Delete(ctx, configMapName, metav1.DeleteOptions{})
	if err != nil {
		// ConfigMap deletion failure is not critical
		fmt.Printf("Warning: Failed to delete ConfigMap: %v\n", err)
	}

	// Delete HPA if exists
	err = ws.app.clientset.AutoscalingV2().HorizontalPodAutoscalers(namespace).Delete(ctx, name, metav1.DeleteOptions{})
	if err != nil {
		// HPA deletion failure is not critical
		fmt.Printf("Warning: Failed to delete HPA: %v\n", err)
	}

	// Delete Ingress if exists
	err = ws.app.clientset.NetworkingV1().Ingresses(namespace).Delete(ctx, name, metav1.DeleteOptions{})
	if err != nil {
		// Ingress deletion failure is not critical
		fmt.Printf("Warning: Failed to delete Ingress: %v\n", err)
	}

	return nil
}

// convertDeploymentToInferenceService converts a Kubernetes Deployment to inference.InferenceService
func convertDeploymentToInferenceService(deployment appsv1.Deployment) inference.InferenceService {
	// Determine status
	status := "Pending"
	if deployment.Status.ReadyReplicas > 0 {
		status = "Running"
	} else if deployment.Status.Replicas > 0 && deployment.Status.ReadyReplicas == 0 {
		status = "Pending"
	}

	// Get runtime from labels
	runtime := deployment.Labels["runtime"]
	if runtime == "" {
		runtime = "unknown"
	}

	// Get model file from ConfigMap reference
	modelFile := ""
	if len(deployment.Spec.Template.Spec.Volumes) > 0 {
		for _, vol := range deployment.Spec.Template.Spec.Volumes {
			if vol.ConfigMap != nil && strings.Contains(vol.ConfigMap.Name, "model") {
				// Try to get the ConfigMap to find model filename
				modelFile = "model"
				break
			}
		}
	}

	// Get resources
	resources := make(map[string]string)
	if len(deployment.Spec.Template.Spec.Containers) > 0 {
		container := deployment.Spec.Template.Spec.Containers[0]
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

	// Get endpoint (from service)
	endpoint := fmt.Sprintf("%s.%s.svc.cluster.local", deployment.Name, deployment.Namespace)

	// Format timestamps
	createdAt := deployment.CreationTimestamp.Format(time.RFC3339)

	replicas := int32(0)
	if deployment.Spec.Replicas != nil {
		replicas = *deployment.Spec.Replicas
	}

	return inference.InferenceService{
		Name:          deployment.Name,
		Namespace:     deployment.Namespace,
		Status:        status,
		Runtime:       runtime,
		ModelFile:     modelFile,
		Endpoint:      endpoint,
		Replicas:      replicas,
		ReadyReplicas: deployment.Status.ReadyReplicas,
		CreatedAt:     createdAt,
		Resources:     resources,
	}
}

