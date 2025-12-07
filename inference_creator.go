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
	"encoding/base64"
	"fmt"

	appsv1 "k8s.io/api/apps/v1"
	autoscalingv2 "k8s.io/api/autoscaling/v2"
	corev1 "k8s.io/api/core/v1"
	networkingv1 "k8s.io/api/networking/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/api/resource"
	"k8s.io/apimachinery/pkg/util/intstr"
)

// CreateInferenceService creates a Kubernetes Deployment and Service for model inference
func (ws *WebServer) CreateInferenceService(ctx context.Context, req InferenceServiceRequest) error {
	// Decode model file
	modelData, err := base64.StdEncoding.DecodeString(req.ModelFile)
	if err != nil {
		return fmt.Errorf("failed to decode model file: %v", err)
	}

	// Determine container image based on runtime
	image, port := ws.getRuntimeImage(req.Runtime)

	// Create ConfigMap for model file
	configMapName := fmt.Sprintf("%s-model", req.Name)
	configMap := &corev1.ConfigMap{
		ObjectMeta: metav1.ObjectMeta{
			Name:      configMapName,
			Namespace: req.Namespace,
			Labels: map[string]string{
				"app":              req.Name,
				"kubegraf-managed": "true",
				"type":             "inference-service",
			},
		},
		Data: map[string]string{
			req.ModelFileName: string(modelData),
		},
	}

	_, err = ws.app.clientset.CoreV1().ConfigMaps(req.Namespace).Create(ctx, configMap, metav1.CreateOptions{})
	if err != nil {
		return fmt.Errorf("failed to create model ConfigMap: %v", err)
	}

	// Build Deployment
	deployment := ws.buildInferenceDeployment(req, image, port, configMapName)

	_, err = ws.app.clientset.AppsV1().Deployments(req.Namespace).Create(ctx, deployment, metav1.CreateOptions{})
	if err != nil {
		return fmt.Errorf("failed to create deployment: %v", err)
	}

	// Create Service
	service := ws.buildInferenceService(req, port)

	_, err = ws.app.clientset.CoreV1().Services(req.Namespace).Create(ctx, service, metav1.CreateOptions{})
	if err != nil {
		return fmt.Errorf("failed to create service: %v", err)
	}

	// Create HPA if enabled
	if req.HPA != nil && req.HPA.Enabled {
		hpa := ws.buildInferenceHPA(req)
		_, err = ws.app.clientset.AutoscalingV2().HorizontalPodAutoscalers(req.Namespace).Create(ctx, hpa, metav1.CreateOptions{})
		if err != nil {
			// HPA creation failure is not critical, log and continue
			fmt.Printf("Warning: Failed to create HPA: %v\n", err)
		}
	}

	// Create Ingress if enabled
	if req.Ingress != nil && req.Ingress.Enabled {
		ingress := ws.buildInferenceIngress(req, port)
		_, err = ws.app.clientset.NetworkingV1().Ingresses(req.Namespace).Create(ctx, ingress, metav1.CreateOptions{})
		if err != nil {
			// Ingress creation failure is not critical, log and continue
			fmt.Printf("Warning: Failed to create Ingress: %v\n", err)
		}
	}

	return nil
}

// getRuntimeImage returns the container image and port for the given runtime
func (ws *WebServer) getRuntimeImage(runtime string) (string, int32) {
	switch runtime {
	case "fastapi":
		return "python:3.9-slim", 8000
	case "mlserver":
		return "seldonio/mlserver:1.3.2", 8080
	case "bentoml":
		return "bentoml/bento-server:latest", 3000
	case "kserve":
		return "kserve/kserve:latest", 8080
	default:
		return "python:3.9-slim", 8000
	}
}

// buildInferenceDeployment builds a Kubernetes Deployment for inference
func (ws *WebServer) buildInferenceDeployment(req InferenceServiceRequest, image string, port int32, configMapName string) *appsv1.Deployment {
	replicas := int32(1)
	if req.Replicas > 0 {
		replicas = req.Replicas
	}

	// Parse resources
	cpuLimit := resource.MustParse("1")
	memoryLimit := resource.MustParse("2Gi")
	if req.CPU != "" {
		cpuLimit = resource.MustParse(req.CPU)
	}
	if req.Memory != "" {
		memoryLimit = resource.MustParse(req.Memory)
	}

	// Build container
	container := corev1.Container{
		Name:  "inference",
		Image: image,
		Ports: []corev1.ContainerPort{
			{
				Name:          "http",
				ContainerPort: port,
				Protocol:      corev1.ProtocolTCP,
			},
		},
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
		VolumeMounts: []corev1.VolumeMount{
			{
				Name:      "model",
				MountPath: "/models",
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

	// Add runtime-specific environment variables
	container.Env = append(container.Env, corev1.EnvVar{
		Name:  "MODEL_PATH",
		Value: fmt.Sprintf("/models/%s", req.ModelFileName),
	})

	// Build volumes
	volumes := []corev1.Volume{
		{
			Name: "model",
			VolumeSource: corev1.VolumeSource{
				ConfigMap: &corev1.ConfigMapVolumeSource{
					LocalObjectReference: corev1.LocalObjectReference{
						Name: configMapName,
					},
				},
			},
		},
	}

	// Add storage volume if specified
	if req.Storage != nil && req.Storage.Type == "pvc" && req.Storage.PVCName != "" {
		volumes = append(volumes, corev1.Volume{
			Name: "model-storage",
			VolumeSource: corev1.VolumeSource{
				PersistentVolumeClaim: &corev1.PersistentVolumeClaimVolumeSource{
					ClaimName: req.Storage.PVCName,
				},
			},
		})
		container.VolumeMounts = append(container.VolumeMounts, corev1.VolumeMount{
			Name:      "model-storage",
			MountPath: req.Storage.MountPath,
		})
	}

	// Build Deployment
	deployment := &appsv1.Deployment{
		ObjectMeta: metav1.ObjectMeta{
			Name:      req.Name,
			Namespace: req.Namespace,
			Labels: map[string]string{
				"app":              req.Name,
				"kubegraf-managed": "true",
				"type":             "inference-service",
				"runtime":          req.Runtime,
			},
		},
		Spec: appsv1.DeploymentSpec{
			Replicas: &replicas,
			Selector: &metav1.LabelSelector{
				MatchLabels: map[string]string{
					"app": req.Name,
				},
			},
			Template: corev1.PodTemplateSpec{
				ObjectMeta: metav1.ObjectMeta{
					Labels: map[string]string{
						"app": req.Name,
					},
				},
				Spec: corev1.PodSpec{
					Containers: []corev1.Container{container},
					Volumes:    volumes,
				},
			},
		},
	}

	// Add node selector for GPU if specified
	if req.GPU != "" && req.GPU != "0" {
		if deployment.Spec.Template.Spec.NodeSelector == nil {
			deployment.Spec.Template.Spec.NodeSelector = make(map[string]string)
		}
		deployment.Spec.Template.Spec.NodeSelector["nvidia.com/gpu"] = "true"
	}

	return deployment
}

// buildInferenceService builds a Kubernetes Service for inference
func (ws *WebServer) buildInferenceService(req InferenceServiceRequest, port int32) *corev1.Service {
	return &corev1.Service{
		ObjectMeta: metav1.ObjectMeta{
			Name:      req.Name,
			Namespace: req.Namespace,
			Labels: map[string]string{
				"app":              req.Name,
				"kubegraf-managed": "true",
				"type":             "inference-service",
			},
		},
		Spec: corev1.ServiceSpec{
			Selector: map[string]string{
				"app": req.Name,
			},
			Ports: []corev1.ServicePort{
				{
					Name:       "http",
					Port:       port,
					TargetPort: intstr.FromInt(int(port)),
					Protocol:   corev1.ProtocolTCP,
				},
			},
			Type: corev1.ServiceTypeClusterIP,
		},
	}
}

// buildInferenceHPA builds a HorizontalPodAutoscaler for inference
func (ws *WebServer) buildInferenceHPA(req InferenceServiceRequest) *autoscalingv2.HorizontalPodAutoscaler {
	minReplicas := int32(1)
	maxReplicas := int32(3)
	targetCPU := int32(70)

	if req.HPA != nil {
		if req.HPA.MinReplicas > 0 {
			minReplicas = req.HPA.MinReplicas
		}
		if req.HPA.MaxReplicas > 0 {
			maxReplicas = req.HPA.MaxReplicas
		}
		if req.HPA.TargetCPU > 0 {
			targetCPU = req.HPA.TargetCPU
		}
	}

	return &autoscalingv2.HorizontalPodAutoscaler{
		ObjectMeta: metav1.ObjectMeta{
			Name:      req.Name,
			Namespace: req.Namespace,
			Labels: map[string]string{
				"app":              req.Name,
				"kubegraf-managed": "true",
				"type":             "inference-service",
			},
		},
		Spec: autoscalingv2.HorizontalPodAutoscalerSpec{
			ScaleTargetRef: autoscalingv2.CrossVersionObjectReference{
				APIVersion: "apps/v1",
				Kind:       "Deployment",
				Name:       req.Name,
			},
			MinReplicas: &minReplicas,
			MaxReplicas: maxReplicas,
			Metrics: []autoscalingv2.MetricSpec{
				{
					Type: autoscalingv2.ResourceMetricSourceType,
					Resource: &autoscalingv2.ResourceMetricSource{
						Name: corev1.ResourceCPU,
						Target: autoscalingv2.MetricTarget{
							Type:               autoscalingv2.UtilizationMetricType,
							AverageUtilization: &targetCPU,
						},
					},
				},
			},
		},
	}
}

// buildInferenceIngress builds an Ingress for inference service
func (ws *WebServer) buildInferenceIngress(req InferenceServiceRequest, port int32) *networkingv1.Ingress {
	host := req.Ingress.Host
	if host == "" {
		host = fmt.Sprintf("%s.%s", req.Name, req.Namespace)
	}

	path := req.Ingress.Path
	if path == "" {
		path = "/"
	}

	pathType := networkingv1.PathTypePrefix

	ingress := &networkingv1.Ingress{
		ObjectMeta: metav1.ObjectMeta{
			Name:      req.Name,
			Namespace: req.Namespace,
			Labels: map[string]string{
				"app":              req.Name,
				"kubegraf-managed": "true",
				"type":             "inference-service",
			},
		},
		Spec: networkingv1.IngressSpec{
			Rules: []networkingv1.IngressRule{
				{
					Host: host,
					IngressRuleValue: networkingv1.IngressRuleValue{
						HTTP: &networkingv1.HTTPIngressRuleValue{
							Paths: []networkingv1.HTTPIngressPath{
								{
									Path:     path,
									PathType: &pathType,
									Backend: networkingv1.IngressBackend{
										Service: &networkingv1.IngressServiceBackend{
											Name: req.Name,
											Port: networkingv1.ServiceBackendPort{
												Number: port,
											},
										},
									},
								},
							},
						},
					},
				},
			},
		},
	}

	// Add TLS if enabled
	if req.Ingress.TLS {
		ingress.Spec.TLS = []networkingv1.IngressTLS{
			{
				Hosts:      []string{host},
				SecretName: fmt.Sprintf("%s-tls", req.Name),
			},
		}
	}

	return ingress
}

