// Copyright 2025 KubeGraf Contributors
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package main

import (
	"context"
	"fmt"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// KialiStatus represents the detection status of Kiali
type KialiStatus struct {
	Installed     bool   `json:"installed"`
	Namespace     string `json:"namespace,omitempty"`
	Version       string `json:"version,omitempty"`
	ServiceName   string `json:"serviceName,omitempty"`
	ServicePort   int32  `json:"servicePort,omitempty"`
	Deployment    string `json:"deployment,omitempty"`
	IstioDetected bool   `json:"istioDetected"`
	Error         string `json:"error,omitempty"`
}

// DetectKiali checks if Kiali is installed in the cluster
func (a *App) DetectKiali(ctx context.Context) (*KialiStatus, error) {
	status := &KialiStatus{
		Installed: false,
	}

	// Check for istio-system namespace first
	istioNamespace := "istio-system"
	_, err := a.clientset.CoreV1().Namespaces().Get(ctx, istioNamespace, metav1.GetOptions{})
	if err != nil {
		// Istio namespace doesn't exist, but check other common namespaces
		status.IstioDetected = false
		// Try kiali namespace
		istioNamespace = "kiali"
		_, err = a.clientset.CoreV1().Namespaces().Get(ctx, istioNamespace, metav1.GetOptions{})
		if err != nil {
			return status, nil // Not installed
		}
	} else {
		status.IstioDetected = true
	}

	// Check for Kiali deployment
	deployments, err := a.clientset.AppsV1().Deployments(istioNamespace).List(ctx, metav1.ListOptions{
		LabelSelector: "app.kubernetes.io/name=kiali",
	})
	if err != nil {
		return status, fmt.Errorf("failed to list deployments: %v", err)
	}

	if len(deployments.Items) == 0 {
		// Try alternative label selector
		deployments, err = a.clientset.AppsV1().Deployments(istioNamespace).List(ctx, metav1.ListOptions{
			LabelSelector: "app=kiali",
		})
		if err != nil {
			return status, fmt.Errorf("failed to list deployments: %v", err)
		}
	}

	if len(deployments.Items) == 0 {
		return status, nil // Not installed
	}

	// Found Kiali deployment
	deployment := deployments.Items[0]
	status.Installed = true
	status.Namespace = istioNamespace
	status.Deployment = deployment.Name

	// Extract version from deployment image
	if len(deployment.Spec.Template.Spec.Containers) > 0 {
		image := deployment.Spec.Template.Spec.Containers[0].Image
		// Extract version from image tag (e.g., quay.io/kiali/kiali:v1.73.0 -> v1.73.0)
		if len(image) > 0 {
			status.Version = extractVersionFromImage(image)
		}
	}

	// Check for Kiali service
	services, err := a.clientset.CoreV1().Services(istioNamespace).List(ctx, metav1.ListOptions{
		LabelSelector: "app.kubernetes.io/name=kiali",
	})
	if err == nil && len(services.Items) > 0 {
		svc := services.Items[0]
		status.ServiceName = svc.Name
		if len(svc.Spec.Ports) > 0 {
			status.ServicePort = svc.Spec.Ports[0].Port
		}
	} else {
		// Try alternative label
		services, err = a.clientset.CoreV1().Services(istioNamespace).List(ctx, metav1.ListOptions{
			LabelSelector: "app=kiali",
		})
		if err == nil && len(services.Items) > 0 {
			svc := services.Items[0]
			status.ServiceName = svc.Name
			if len(svc.Spec.Ports) > 0 {
				status.ServicePort = svc.Spec.Ports[0].Port
			}
		}
	}

	// Kiali CRDs check would require discovery client
	// For now, we rely on deployment and service detection

	return status, nil
}

// extractVersionFromImage extracts version tag from container image
func extractVersionFromImage(image string) string {
	// Image format: registry/path/image:tag or registry/path/image@sha256:digest
	// We want the tag part
	for i := len(image) - 1; i >= 0; i-- {
		if image[i] == ':' {
			return image[i+1:]
		}
		if image[i] == '@' {
			// SHA256 digest, no version tag
			return ""
		}
	}
	return ""
}

// CheckIstioCRDs checks if Istio CRDs are installed
// Note: This would require a discovery client to be implemented
func (a *App) CheckIstioCRDs(ctx context.Context) bool {
	// For now, we detect Istio by checking for istio-system namespace
	// which is done in DetectKiali
	return false
}

