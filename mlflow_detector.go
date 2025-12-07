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
	"time"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// MLflowStatus represents the detection status of MLflow
type MLflowStatus struct {
	Installed     bool   `json:"installed"`
	Namespace     string `json:"namespace,omitempty"`
	Version       string `json:"version,omitempty"`
	ServiceName   string `json:"serviceName,omitempty"`
	ServicePort   int32  `json:"servicePort,omitempty"`
	Deployment    string `json:"deployment,omitempty"`
	BackendStore  string `json:"backendStore,omitempty"`
	ArtifactStore string `json:"artifactStore,omitempty"`
	TrackingUI    bool   `json:"trackingUI"`
	Error         string `json:"error,omitempty"`
}

// DetectMLflow checks if MLflow is installed in the cluster
func (a *App) DetectMLflow(ctx context.Context) (*MLflowStatus, error) {
	status := &MLflowStatus{
		Installed: false,
	}

	// Check common MLflow namespaces
	namespaces := []string{"mlflow", "mlflow-system", "default"}
	var mlflowNamespace string

	for _, ns := range namespaces {
		// Check if namespace exists (with quick timeout per namespace)
		nsCtx, nsCancel := context.WithTimeout(ctx, 2*time.Second)
		_, err := a.clientset.CoreV1().Namespaces().Get(nsCtx, ns, metav1.GetOptions{})
		nsCancel()
		if err != nil {
			continue
		}

		// Check for MLflow deployment
		deployments, err := a.clientset.AppsV1().Deployments(ns).List(ctx, metav1.ListOptions{
			LabelSelector: "app.kubernetes.io/name=mlflow",
		})
		if err != nil {
			continue
		}

		if len(deployments.Items) == 0 {
			// Try alternative label selectors
			deployments, err = a.clientset.AppsV1().Deployments(ns).List(ctx, metav1.ListOptions{
				LabelSelector: "app=mlflow",
			})
			if err != nil || len(deployments.Items) == 0 {
				continue
			}
		}

		// Found MLflow deployment
		deployment := deployments.Items[0]
		mlflowNamespace = ns
		status.Installed = true
		status.Namespace = ns
		status.Deployment = deployment.Name

		// Extract version from image tag
		if len(deployment.Spec.Template.Spec.Containers) > 0 {
			image := deployment.Spec.Template.Spec.Containers[0].Image
			// Extract version from image (e.g., "mlflow/mlflow:v2.8.0" -> "v2.8.0")
			if idx := len(image) - 1; idx >= 0 {
				for i := len(image) - 1; i >= 0; i-- {
					if image[i] == ':' {
						status.Version = image[i+1:]
						break
					}
				}
			}
		}

		break
	}

	if !status.Installed {
		return status, nil
	}

	// Find MLflow service
	services, err := a.clientset.CoreV1().Services(mlflowNamespace).List(ctx, metav1.ListOptions{
		LabelSelector: "app.kubernetes.io/name=mlflow",
	})
	if err == nil && len(services.Items) > 0 {
		svc := services.Items[0]
		status.ServiceName = svc.Name
		if len(svc.Spec.Ports) > 0 {
			status.ServicePort = svc.Spec.Ports[0].Port
		}
	} else {
		// Try alternative label
		services, err = a.clientset.CoreV1().Services(mlflowNamespace).List(ctx, metav1.ListOptions{
			LabelSelector: "app=mlflow",
		})
		if err == nil && len(services.Items) > 0 {
			svc := services.Items[0]
			status.ServiceName = svc.Name
			if len(svc.Spec.Ports) > 0 {
				status.ServicePort = svc.Spec.Ports[0].Port
			}
		}
	}

	// Check for tracking UI (usually enabled by default)
	status.TrackingUI = true

	// Try to detect backend and artifact stores from configmap or env vars
	configMaps, err := a.clientset.CoreV1().ConfigMaps(mlflowNamespace).List(ctx, metav1.ListOptions{
		LabelSelector: "app.kubernetes.io/name=mlflow",
	})
	if err == nil {
		for _, cm := range configMaps.Items {
			// Check for backend store configuration
			if backend, ok := cm.Data["backend-store-uri"]; ok {
				status.BackendStore = backend
			}
			if artifact, ok := cm.Data["default-artifact-root"]; ok {
				status.ArtifactStore = artifact
			}
		}
	}

	return status, nil
}

