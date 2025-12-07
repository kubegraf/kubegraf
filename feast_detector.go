// Copyright 2025 KubeGraf Contributors
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0

package main

import (
	feast "github.com/kubegraf/kubegraf/internal/feast"
)
import (
	"context"
	"fmt"
	"strings"

	appsv1 "k8s.io/api/apps/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// DetectFeast detects if Feast is installed in the cluster
func (app *App) DetectFeast(ctx context.Context) (*feast.FeastStatus, error) {
	status := &feast.FeastStatus{
		Installed: false,
	}

	// Check common namespaces
	namespaces := []string{"feast", "default", "ml-platform"}
	
	for _, ns := range namespaces {
		// Check for Feast deployment
		deployments, err := app.clientset.AppsV1().Deployments(ns).List(ctx, metav1.ListOptions{
			LabelSelector: "app.kubernetes.io/name=feast",
		})
		if err != nil {
			continue
		}

		if len(deployments.Items) > 0 {
			deployment := deployments.Items[0]
			status.Installed = true
			status.Namespace = ns

			// Extract version from image tag
			if len(deployment.Spec.Template.Spec.Containers) > 0 {
				image := deployment.Spec.Template.Spec.Containers[0].Image
				if strings.Contains(image, ":") {
					parts := strings.Split(image, ":")
					if len(parts) > 1 {
						status.Version = parts[len(parts)-1]
					}
				}
			}

			// Get service for serving URL
			services, err := app.clientset.CoreV1().Services(ns).List(ctx, metav1.ListOptions{
				LabelSelector: "app.kubernetes.io/name=feast",
			})
			if err == nil && len(services.Items) > 0 {
				svc := services.Items[0]
				status.ServingURL = fmt.Sprintf("%s.%s.svc.cluster.local", svc.Name, ns)
			}

			// Try to detect store types from environment variables or config
			status.OnlineStore = detectStoreType(deployment, "online")
			status.OfflineStore = detectStoreType(deployment, "offline")

			return status, nil
		}
	}

	return status, nil
}

// detectStoreType detects store type from deployment
func detectStoreType(deployment appsv1.Deployment, storeType string) string {
	if len(deployment.Spec.Template.Spec.Containers) == 0 {
		return ""
	}

	container := deployment.Spec.Template.Spec.Containers[0]
	
	// Check environment variables
	for _, env := range container.Env {
		key := strings.ToUpper(env.Name)
		value := env.Value

		if storeType == "online" {
			if strings.Contains(key, "REDIS") {
				return "redis"
			}
			if strings.Contains(key, "BIGQUERY") {
				return "bigquery"
			}
		}

		if storeType == "offline" {
			if strings.Contains(key, "FILE") || strings.Contains(value, "/data") {
				return "file"
			}
			if strings.Contains(key, "PVC") || strings.Contains(key, "VOLUME") {
				return "pvc"
			}
			if strings.Contains(key, "BIGQUERY") {
				return "bigquery"
			}
			if strings.Contains(key, "SNOWFLAKE") {
				return "snowflake"
			}
		}
	}

	// Check volume mounts
	for _, volume := range deployment.Spec.Template.Spec.Volumes {
		if volume.PersistentVolumeClaim != nil {
			if storeType == "offline" {
				return "pvc"
			}
		}
	}

	return ""
}

