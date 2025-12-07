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

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// DetectDCGM detects if DCGM exporter is installed and GPU nodes
func (app *App) DetectDCGM(ctx context.Context) (*GPUStatus, error) {
	status := &GPUStatus{
		DCGMInstalled: false,
		GPUNodesFound: false,
	}

	// First, detect GPU nodes automatically (no plugins needed)
	gpuNodes, err := app.DetectGPUNodes(ctx)
	if err == nil && len(gpuNodes) > 0 {
		status.GPUNodesFound = true
		status.GPUNodes = gpuNodes
	}

	// Check common namespaces
	namespaces := []string{"gpu-operator", "nvidia-gpu-operator", "default", "kube-system"}

	for _, ns := range namespaces {
		// Check for DCGM exporter deployment
		deployments, err := app.clientset.AppsV1().Deployments(ns).List(ctx, metav1.ListOptions{
			LabelSelector: "app.kubernetes.io/name=dcgm-exporter",
		})
		if err != nil {
			continue
		}

		if len(deployments.Items) > 0 {
			status.DCGMInstalled = true
			status.Namespace = ns

			// Get service
			services, err := app.clientset.CoreV1().Services(ns).List(ctx, metav1.ListOptions{
				LabelSelector: "app.kubernetes.io/name=dcgm-exporter",
			})
			if err == nil && len(services.Items) > 0 {
				svc := services.Items[0]
				status.ServiceURL = fmt.Sprintf("%s.%s.svc.cluster.local:9400", svc.Name, ns)
			}

			// Try to find Prometheus service
			promServices, err := app.clientset.CoreV1().Services("").List(ctx, metav1.ListOptions{
				LabelSelector: "app=prometheus",
			})
			if err == nil && len(promServices.Items) > 0 {
				promSvc := promServices.Items[0]
				status.PrometheusURL = fmt.Sprintf("%s.%s.svc.cluster.local:9090", promSvc.Name, promSvc.Namespace)
			}

			return status, nil
		}
	}

	return status, nil
}

