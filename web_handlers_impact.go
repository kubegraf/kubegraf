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
	"encoding/json"
	"fmt"
	"net/http"
	"strings"

	v1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// handleImpactAnalysis analyzes the impact of deleting or modifying a resource
func (ws *WebServer) handleImpactAnalysis(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")

	resourceType := r.URL.Query().Get("type")
	resourceName := r.URL.Query().Get("name")
	namespace := r.URL.Query().Get("namespace")

	if namespace == "" || namespace == "All Namespaces" {
		namespace = ws.app.namespace
	}

	if resourceType == "" || resourceName == "" {
		http.Error(w, "Missing required parameters: type and name", http.StatusBadRequest)
		return
	}

	var analysis *ImpactAnalysis
	var err error

	switch strings.ToLower(resourceType) {
	case "service":
		analysis, err = ws.analyzeServiceImpact(resourceName, namespace)
	case "configmap":
		analysis, err = ws.analyzeConfigMapImpact(resourceName, namespace)
	case "secret":
		analysis, err = ws.analyzeSecretImpact(resourceName, namespace)
	case "deployment":
		analysis, err = ws.analyzeDeploymentImpact(resourceName, namespace)
	case "pod":
		analysis, err = ws.analyzePodImpact(resourceName, namespace)
	case "node":
		analysis, err = ws.analyzeNodeImpact(resourceName)
	default:
		http.Error(w, fmt.Sprintf("Impact analysis not supported for resource type: %s", resourceType), http.StatusBadRequest)
		return
	}

	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(analysis)
}

// analyzeServiceImpact analyzes what depends on a Service
func (ws *WebServer) analyzeServiceImpact(name, namespace string) (*ImpactAnalysis, error) {
	service, err := ws.app.clientset.CoreV1().Services(namespace).Get(ws.app.ctx, name, metav1.GetOptions{})
	if err != nil {
		return nil, err
	}

	analysis := &ImpactAnalysis{
		Resource:        name,
		ResourceType:    "Service",
		Namespace:       namespace,
		ImpactedNodes:   []*ImpactNode{},
		Recommendations: []string{},
	}

	// Find Ingresses that route to this service
	ingresses, _ := ws.app.clientset.NetworkingV1().Ingresses(namespace).List(ws.app.ctx, metav1.ListOptions{})
	for _, ing := range ingresses.Items {
		for _, rule := range ing.Spec.Rules {
			if rule.HTTP != nil {
				for _, path := range rule.HTTP.Paths {
					if path.Backend.Service != nil && path.Backend.Service.Name == name {
						node := &ImpactNode{
							Type:      "Ingress",
							Name:      ing.Name,
							Namespace: ing.Namespace,
							Severity:  "critical",
							Impact:    fmt.Sprintf("Ingress %s routes traffic to this service via path %s", ing.Name, path.Path),
						}
						analysis.ImpactedNodes = append(analysis.ImpactedNodes, node)
						analysis.CriticalCount++
					}
				}
			}
		}
	}

	// Find Pods that this service selects (would lose endpoint)
	if len(service.Spec.Selector) > 0 {
		pods, _ := ws.app.clientset.CoreV1().Pods(namespace).List(ws.app.ctx, metav1.ListOptions{
			LabelSelector: metav1.FormatLabelSelector(&metav1.LabelSelector{MatchLabels: service.Spec.Selector}),
		})
		for _, pod := range pods.Items {
			node := &ImpactNode{
				Type:      "Pod",
				Name:      pod.Name,
				Namespace: pod.Namespace,
				Severity:  "medium",
				Impact:    "Pod will lose service endpoint and external access",
			}
			analysis.ImpactedNodes = append(analysis.ImpactedNodes, node)
			analysis.MediumCount++
		}
	}

	// Calculate totals
	analysis.TotalImpacted = len(analysis.ImpactedNodes)
	analysis.Summary = fmt.Sprintf("Deleting Service '%s' will affect %d resource(s): %d critical, %d high, %d medium, %d low",
		name, analysis.TotalImpacted, analysis.CriticalCount, analysis.HighCount, analysis.MediumCount, analysis.LowCount)

	if analysis.CriticalCount > 0 {
		analysis.Recommendations = append(analysis.Recommendations, "Update Ingress configurations before deleting this Service")
	}
	if analysis.MediumCount > 0 {
		analysis.Recommendations = append(analysis.Recommendations, "Ensure pods have alternative network access or are not required")
	}

	return analysis, nil
}

// analyzeConfigMapImpact analyzes what depends on a ConfigMap
func (ws *WebServer) analyzeConfigMapImpact(name, namespace string) (*ImpactAnalysis, error) {
	_, err := ws.app.clientset.CoreV1().ConfigMaps(namespace).Get(ws.app.ctx, name, metav1.GetOptions{})
	if err != nil {
		return nil, err
	}

	analysis := &ImpactAnalysis{
		Resource:        name,
		ResourceType:    "ConfigMap",
		Namespace:       namespace,
		ImpactedNodes:   []*ImpactNode{},
		Recommendations: []string{},
	}

	// Find Deployments that use this ConfigMap
	deployments, _ := ws.app.clientset.AppsV1().Deployments(namespace).List(ws.app.ctx, metav1.ListOptions{})
	for _, dep := range deployments.Items {
		usesConfigMap := false
		var usageType string

		// Check volume mounts
		for _, vol := range dep.Spec.Template.Spec.Volumes {
			if vol.ConfigMap != nil && vol.ConfigMap.Name == name {
				usesConfigMap = true
				usageType = "volume mount"
				break
			}
		}

		// Check env references
		if !usesConfigMap {
			for _, container := range dep.Spec.Template.Spec.Containers {
				for _, env := range container.EnvFrom {
					if env.ConfigMapRef != nil && env.ConfigMapRef.Name == name {
						usesConfigMap = true
						usageType = "environment variables"
						break
					}
				}
				if usesConfigMap {
					break
				}
			}
		}

		if usesConfigMap {
			node := &ImpactNode{
				Type:      "Deployment",
				Name:      dep.Name,
				Namespace: dep.Namespace,
				Severity:  "critical",
				Impact:    fmt.Sprintf("Deployment uses this ConfigMap as %s - pods may fail to start", usageType),
			}
			analysis.ImpactedNodes = append(analysis.ImpactedNodes, node)
			analysis.CriticalCount++
		}
	}

	// Check StatefulSets
	statefulsets, _ := ws.app.clientset.AppsV1().StatefulSets(namespace).List(ws.app.ctx, metav1.ListOptions{})
	for _, sts := range statefulsets.Items {
		for _, vol := range sts.Spec.Template.Spec.Volumes {
			if vol.ConfigMap != nil && vol.ConfigMap.Name == name {
				node := &ImpactNode{
					Type:      "StatefulSet",
					Name:      sts.Name,
					Namespace: sts.Namespace,
					Severity:  "critical",
					Impact:    "StatefulSet uses this ConfigMap - pods may fail to start",
				}
				analysis.ImpactedNodes = append(analysis.ImpactedNodes, node)
				analysis.CriticalCount++
				break
			}
		}
	}

	// Check DaemonSets
	daemonsets, _ := ws.app.clientset.AppsV1().DaemonSets(namespace).List(ws.app.ctx, metav1.ListOptions{})
	for _, ds := range daemonsets.Items {
		for _, vol := range ds.Spec.Template.Spec.Volumes {
			if vol.ConfigMap != nil && vol.ConfigMap.Name == name {
				node := &ImpactNode{
					Type:      "DaemonSet",
					Name:      ds.Name,
					Namespace: ds.Namespace,
					Severity:  "critical",
					Impact:    "DaemonSet uses this ConfigMap - pods may fail to start on all nodes",
				}
				analysis.ImpactedNodes = append(analysis.ImpactedNodes, node)
				analysis.CriticalCount++
				break
			}
		}
	}

	analysis.TotalImpacted = len(analysis.ImpactedNodes)
	analysis.Summary = fmt.Sprintf("Deleting ConfigMap '%s' will affect %d workload(s)", name, analysis.TotalImpacted)

	if analysis.CriticalCount > 0 {
		analysis.Recommendations = append(analysis.Recommendations, "Update workloads to remove ConfigMap references before deletion")
		analysis.Recommendations = append(analysis.Recommendations, "Consider creating a replacement ConfigMap with updated values first")
	}

	return analysis, nil
}

// analyzeSecretImpact analyzes what depends on a Secret
func (ws *WebServer) analyzeSecretImpact(name, namespace string) (*ImpactAnalysis, error) {
	_, err := ws.app.clientset.CoreV1().Secrets(namespace).Get(ws.app.ctx, name, metav1.GetOptions{})
	if err != nil {
		return nil, err
	}

	analysis := &ImpactAnalysis{
		Resource:        name,
		ResourceType:    "Secret",
		Namespace:       namespace,
		ImpactedNodes:   []*ImpactNode{},
		Recommendations: []string{},
	}

	// Find Deployments that use this Secret
	deployments, _ := ws.app.clientset.AppsV1().Deployments(namespace).List(ws.app.ctx, metav1.ListOptions{})
	for _, dep := range deployments.Items {
		usesSecret := false
		var usageType string

		for _, vol := range dep.Spec.Template.Spec.Volumes {
			if vol.Secret != nil && vol.Secret.SecretName == name {
				usesSecret = true
				usageType = "volume mount"
				break
			}
		}

		if !usesSecret {
			for _, container := range dep.Spec.Template.Spec.Containers {
				for _, env := range container.EnvFrom {
					if env.SecretRef != nil && env.SecretRef.Name == name {
						usesSecret = true
						usageType = "environment variables"
						break
					}
				}
				// Check individual env vars
				for _, env := range container.Env {
					if env.ValueFrom != nil && env.ValueFrom.SecretKeyRef != nil && env.ValueFrom.SecretKeyRef.Name == name {
						usesSecret = true
						usageType = "environment variable"
						break
					}
				}
				if usesSecret {
					break
				}
			}
		}

		// Check imagePullSecrets
		if !usesSecret {
			for _, ips := range dep.Spec.Template.Spec.ImagePullSecrets {
				if ips.Name == name {
					usesSecret = true
					usageType = "image pull secret"
					break
				}
			}
		}

		if usesSecret {
			node := &ImpactNode{
				Type:      "Deployment",
				Name:      dep.Name,
				Namespace: dep.Namespace,
				Severity:  "critical",
				Impact:    fmt.Sprintf("Deployment uses this Secret as %s - pods may fail to start or authenticate", usageType),
			}
			analysis.ImpactedNodes = append(analysis.ImpactedNodes, node)
			analysis.CriticalCount++
		}
	}

	// Find ServiceAccounts that reference this secret
	serviceAccounts, _ := ws.app.clientset.CoreV1().ServiceAccounts(namespace).List(ws.app.ctx, metav1.ListOptions{})
	for _, sa := range serviceAccounts.Items {
		for _, secretRef := range sa.Secrets {
			if secretRef.Name == name {
				node := &ImpactNode{
					Type:      "ServiceAccount",
					Name:      sa.Name,
					Namespace: sa.Namespace,
					Severity:  "high",
					Impact:    "ServiceAccount references this Secret - authentication may fail",
				}
				analysis.ImpactedNodes = append(analysis.ImpactedNodes, node)
				analysis.HighCount++
				break
			}
		}
		for _, ips := range sa.ImagePullSecrets {
			if ips.Name == name {
				node := &ImpactNode{
					Type:      "ServiceAccount",
					Name:      sa.Name,
					Namespace: sa.Namespace,
					Severity:  "high",
					Impact:    "ServiceAccount uses this Secret for image pulls - containers may fail to pull images",
				}
				analysis.ImpactedNodes = append(analysis.ImpactedNodes, node)
				analysis.HighCount++
				break
			}
		}
	}

	analysis.TotalImpacted = len(analysis.ImpactedNodes)
	analysis.Summary = fmt.Sprintf("Deleting Secret '%s' will affect %d resource(s)", name, analysis.TotalImpacted)

	if analysis.CriticalCount > 0 || analysis.HighCount > 0 {
		analysis.Recommendations = append(analysis.Recommendations, "Ensure no workloads require this Secret before deletion")
		analysis.Recommendations = append(analysis.Recommendations, "Consider rotating Secret with a new one before deleting the old")
	}

	return analysis, nil
}

// analyzeDeploymentImpact analyzes what depends on a Deployment
func (ws *WebServer) analyzeDeploymentImpact(name, namespace string) (*ImpactAnalysis, error) {
	deployment, err := ws.app.clientset.AppsV1().Deployments(namespace).Get(ws.app.ctx, name, metav1.GetOptions{})
	if err != nil {
		return nil, err
	}

	analysis := &ImpactAnalysis{
		Resource:        name,
		ResourceType:    "Deployment",
		Namespace:       namespace,
		ImpactedNodes:   []*ImpactNode{},
		Recommendations: []string{},
	}

	// Find Services that select this Deployment's pods
	services, _ := ws.app.clientset.CoreV1().Services(namespace).List(ws.app.ctx, metav1.ListOptions{})
	for _, svc := range services.Items {
		if len(svc.Spec.Selector) > 0 {
			if matchesSelector(svc.Spec.Selector, deployment.Spec.Template.Labels) {
				node := &ImpactNode{
					Type:      "Service",
					Name:      svc.Name,
					Namespace: svc.Namespace,
					Severity:  "critical",
					Impact:    "Service selects this Deployment's pods - endpoints will be removed",
				}
				analysis.ImpactedNodes = append(analysis.ImpactedNodes, node)
				analysis.CriticalCount++
			}
		}
	}

	// Find HPA targeting this deployment
	hpas, _ := ws.app.clientset.AutoscalingV1().HorizontalPodAutoscalers(namespace).List(ws.app.ctx, metav1.ListOptions{})
	for _, hpa := range hpas.Items {
		if hpa.Spec.ScaleTargetRef.Kind == "Deployment" && hpa.Spec.ScaleTargetRef.Name == name {
			node := &ImpactNode{
				Type:      "HorizontalPodAutoscaler",
				Name:      hpa.Name,
				Namespace: hpa.Namespace,
				Severity:  "medium",
				Impact:    "HPA targets this Deployment - autoscaling will be orphaned",
			}
			analysis.ImpactedNodes = append(analysis.ImpactedNodes, node)
			analysis.MediumCount++
		}
	}

	// Add running pods info
	pods, _ := ws.app.clientset.CoreV1().Pods(namespace).List(ws.app.ctx, metav1.ListOptions{
		LabelSelector: metav1.FormatLabelSelector(deployment.Spec.Selector),
	})
	runningPods := 0
	for _, pod := range pods.Items {
		if pod.Status.Phase == v1.PodRunning {
			runningPods++
		}
	}
	if runningPods > 0 {
		node := &ImpactNode{
			Type:       "Pod",
			Name:       fmt.Sprintf("%d running pods", runningPods),
			Namespace:  namespace,
			Severity:   "high",
			Impact:     "All running pods will be terminated",
			Dependents: runningPods,
		}
		analysis.ImpactedNodes = append(analysis.ImpactedNodes, node)
		analysis.HighCount++
	}

	analysis.TotalImpacted = len(analysis.ImpactedNodes)
	analysis.Summary = fmt.Sprintf("Deleting Deployment '%s' will affect %d resource(s) including %d running pods",
		name, analysis.TotalImpacted, runningPods)

	if analysis.CriticalCount > 0 {
		analysis.Recommendations = append(analysis.Recommendations, "Update Service selectors before deleting this Deployment")
	}
	if runningPods > 0 {
		analysis.Recommendations = append(analysis.Recommendations, "Consider scaling down to 0 replicas first to gracefully terminate pods")
	}

	return analysis, nil
}

// analyzePodImpact analyzes what depends on a Pod
func (ws *WebServer) analyzePodImpact(name, namespace string) (*ImpactAnalysis, error) {
	pod, err := ws.app.clientset.CoreV1().Pods(namespace).Get(ws.app.ctx, name, metav1.GetOptions{})
	if err != nil {
		return nil, err
	}

	analysis := &ImpactAnalysis{
		Resource:        name,
		ResourceType:    "Pod",
		Namespace:       namespace,
		ImpactedNodes:   []*ImpactNode{},
		Recommendations: []string{},
	}

	// Find Services that select this Pod
	services, _ := ws.app.clientset.CoreV1().Services(namespace).List(ws.app.ctx, metav1.ListOptions{})
	for _, svc := range services.Items {
		if len(svc.Spec.Selector) > 0 {
			if matchesSelector(svc.Spec.Selector, pod.Labels) {
				// Check if this is the only pod for this service
				pods, _ := ws.app.clientset.CoreV1().Pods(namespace).List(ws.app.ctx, metav1.ListOptions{
					LabelSelector: metav1.FormatLabelSelector(&metav1.LabelSelector{MatchLabels: svc.Spec.Selector}),
				})
				severity := "low"
				impact := "Pod is one of multiple endpoints for this Service"
				if len(pods.Items) <= 1 {
					severity = "critical"
					impact = "This is the only pod for this Service - service will have no endpoints"
				}

				node := &ImpactNode{
					Type:      "Service",
					Name:      svc.Name,
					Namespace: svc.Namespace,
					Severity:  severity,
					Impact:    impact,
				}
				analysis.ImpactedNodes = append(analysis.ImpactedNodes, node)
				if severity == "critical" {
					analysis.CriticalCount++
				} else {
					analysis.LowCount++
				}
			}
		}
	}

	// Check if pod is managed by a controller
	for _, ownerRef := range pod.OwnerReferences {
		if ownerRef.Controller != nil && *ownerRef.Controller {
			node := &ImpactNode{
				Type:      ownerRef.Kind,
				Name:      ownerRef.Name,
				Namespace: namespace,
				Severity:  "low",
				Impact:    fmt.Sprintf("Pod will be recreated by %s controller", ownerRef.Kind),
			}
			analysis.ImpactedNodes = append(analysis.ImpactedNodes, node)
			analysis.LowCount++
		}
	}

	analysis.TotalImpacted = len(analysis.ImpactedNodes)
	analysis.Summary = fmt.Sprintf("Deleting Pod '%s' will affect %d resource(s)", name, analysis.TotalImpacted)

	return analysis, nil
}

// analyzeNodeImpact analyzes what depends on a Node
func (ws *WebServer) analyzeNodeImpact(nodeName string) (*ImpactAnalysis, error) {
	_, err := ws.app.clientset.CoreV1().Nodes().Get(ws.app.ctx, nodeName, metav1.GetOptions{})
	if err != nil {
		return nil, err
	}

	analysis := &ImpactAnalysis{
		Resource:        nodeName,
		ResourceType:    "Node",
		Namespace:       "",
		ImpactedNodes:   []*ImpactNode{},
		Recommendations: []string{},
	}

	// Find pods running on this node
	pods, _ := ws.app.clientset.CoreV1().Pods("").List(ws.app.ctx, metav1.ListOptions{
		FieldSelector: fmt.Sprintf("spec.nodeName=%s", nodeName),
	})

	runningPods := 0
	for _, pod := range pods.Items {
		if pod.Status.Phase == v1.PodRunning {
			runningPods++
			podNode := &ImpactNode{
				Type:      "Pod",
				Name:      pod.Name,
				Namespace: pod.Namespace,
				Severity:  "high",
				Impact:    "Pod will be terminated and rescheduled",
			}
			analysis.ImpactedNodes = append(analysis.ImpactedNodes, podNode)
			analysis.HighCount++
		}
	}

	analysis.TotalImpacted = len(analysis.ImpactedNodes)
	analysis.Summary = fmt.Sprintf("Deleting Node '%s' will affect %d resource(s) including %d running pods",
		nodeName, analysis.TotalImpacted, runningPods)

	if runningPods > 0 {
		analysis.Recommendations = append(analysis.Recommendations, "Drain node before deletion to gracefully move workloads")
		analysis.Recommendations = append(analysis.Recommendations, "Ensure cluster has sufficient capacity for rescheduled pods")
	}

	return analysis, nil
}

// matchesSelector checks if labels match selector
func matchesSelector(selector map[string]string, labels map[string]string) bool {
	for key, value := range selector {
		if labels[key] != value {
			return false
		}
	}
	return true
}
