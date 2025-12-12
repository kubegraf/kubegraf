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
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/resource"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// handleApplyRecommendation applies an ML recommendation automatically
func (ws *WebServer) handleApplyRecommendation(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		ID string `json:"id"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, fmt.Sprintf("Invalid request: %v", err), http.StatusBadRequest)
		return
	}

	// Get the recommendation by regenerating and finding it
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	recommendations, err := ws.app.mlRecommender.GenerateRecommendations(ctx)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to get recommendations: %v", err), http.StatusInternalServerError)
		return
	}

	var recommendation *MLRecommendation
	for i := range recommendations {
		if recommendations[i].ID == req.ID {
			recommendation = &recommendations[i]
			break
		}
	}

	if recommendation == nil {
		http.Error(w, "Recommendation not found", http.StatusNotFound)
		return
	}

	// Apply the recommendation based on type (user-initiated)
	var result map[string]interface{}
	switch recommendation.Type {
	case "resource_optimization", "cost_saving":
		result = ws.applyResourceOptimization(ctx, recommendation)
	case "scaling":
		result = ws.applyScalingRecommendation(ctx, recommendation)
	default:
		http.Error(w, fmt.Sprintf("Unsupported recommendation type: %s", recommendation.Type), http.StatusBadRequest)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}

// applyResourceOptimization applies resource optimization recommendations
func (ws *WebServer) applyResourceOptimization(ctx context.Context, rec *MLRecommendation) map[string]interface{} {
	// Parse resource: "Deployment/name" or "StatefulSet/name"
	parts := strings.Split(rec.Resource, "/")
	if len(parts) != 2 {
		return map[string]interface{}{
			"success": false,
			"error":   "Invalid resource format",
		}
	}

	resourceType := parts[0]
	resourceName := parts[1]
	namespace := rec.Namespace

	// Parse recommended values from "CPU: 100m, Memory: 256Mi" format
	recommendedCPU, recommendedMemory := parseResourceValues(rec.RecommendedValue)

	switch resourceType {
	case "Deployment":
		return ws.updateDeploymentResources(ctx, namespace, resourceName, recommendedCPU, recommendedMemory)
	case "StatefulSet":
		return ws.updateStatefulSetResources(ctx, namespace, resourceName, recommendedCPU, recommendedMemory)
	case "DaemonSet":
		return ws.updateDaemonSetResources(ctx, namespace, resourceName, recommendedCPU, recommendedMemory)
	default:
		return map[string]interface{}{
			"success": false,
			"error":   fmt.Sprintf("Unsupported resource type: %s. Only Deployment, StatefulSet, and DaemonSet are supported.", resourceType),
		}
	}
}

// applyScalingRecommendation applies scaling recommendations
func (ws *WebServer) applyScalingRecommendation(ctx context.Context, rec *MLRecommendation) map[string]interface{} {
	parts := strings.Split(rec.Resource, "/")
	if len(parts) != 2 {
		return map[string]interface{}{
			"success": false,
			"error":   "Invalid resource format",
		}
	}

	resourceType := parts[0]
	resourceName := parts[1]
	namespace := rec.Namespace

	// Parse recommended replicas from "3 replicas" format
	replicas := parseReplicas(rec.RecommendedValue)

	switch resourceType {
	case "Deployment":
		return ws.scaleDeployment(ctx, namespace, resourceName, replicas)
	case "StatefulSet":
		return ws.scaleStatefulSet(ctx, namespace, resourceName, replicas)
	default:
		return map[string]interface{}{
			"success": false,
			"error":   fmt.Sprintf("Unsupported resource type: %s", resourceType),
		}
	}
}

// updateDeploymentResources updates deployment resource requests/limits
func (ws *WebServer) updateDeploymentResources(ctx context.Context, namespace, name string, cpu, memory string) map[string]interface{} {
	deployment, err := ws.app.clientset.AppsV1().Deployments(namespace).Get(ctx, name, metav1.GetOptions{})
	if err != nil {
		return map[string]interface{}{
			"success": false,
			"error":   fmt.Sprintf("Failed to get deployment: %v", err),
		}
	}

	// Update all containers
	for i := range deployment.Spec.Template.Spec.Containers {
		container := &deployment.Spec.Template.Spec.Containers[i]
		if container.Resources.Requests == nil {
			container.Resources.Requests = make(corev1.ResourceList)
		}
		if container.Resources.Limits == nil {
			container.Resources.Limits = make(corev1.ResourceList)
		}

		if cpu != "" {
			cpuQty, err := resource.ParseQuantity(cpu)
			if err == nil {
				container.Resources.Requests[corev1.ResourceCPU] = cpuQty
				// Set limit to 1.5x request for safety
				limitCPU := cpuQty.DeepCopy()
				limitCPU.Add(cpuQty)
				limitCPU.Add(*resource.NewMilliQuantity(cpuQty.MilliValue()/2, resource.DecimalSI))
				container.Resources.Limits[corev1.ResourceCPU] = limitCPU
			}
		}

		if memory != "" {
			memQty, err := resource.ParseQuantity(memory)
			if err == nil {
				container.Resources.Requests[corev1.ResourceMemory] = memQty
				// Set limit to 1.5x request for safety
				limitMem := memQty.DeepCopy()
				limitMem.Add(memQty)
				limitMem.Add(*resource.NewQuantity(memQty.Value()/2, resource.BinarySI))
				container.Resources.Limits[corev1.ResourceMemory] = limitMem
			}
		}
	}

	_, err = ws.app.clientset.AppsV1().Deployments(namespace).Update(ctx, deployment, metav1.UpdateOptions{})
	if err != nil {
		return map[string]interface{}{
			"success": false,
			"error":   fmt.Sprintf("Failed to update deployment: %v", err),
		}
	}

	return map[string]interface{}{
		"success": true,
		"message": fmt.Sprintf("Successfully updated resources for Deployment %s/%s", namespace, name),
	}
}

// updateStatefulSetResources updates statefulset resource requests/limits
func (ws *WebServer) updateStatefulSetResources(ctx context.Context, namespace, name string, cpu, memory string) map[string]interface{} {
	statefulset, err := ws.app.clientset.AppsV1().StatefulSets(namespace).Get(ctx, name, metav1.GetOptions{})
	if err != nil {
		return map[string]interface{}{
			"success": false,
			"error":   fmt.Sprintf("Failed to get statefulset: %v", err),
		}
	}

	// Update all containers
	for i := range statefulset.Spec.Template.Spec.Containers {
		container := &statefulset.Spec.Template.Spec.Containers[i]
		if container.Resources.Requests == nil {
			container.Resources.Requests = make(corev1.ResourceList)
		}
		if container.Resources.Limits == nil {
			container.Resources.Limits = make(corev1.ResourceList)
		}

		if cpu != "" {
			cpuQty, err := resource.ParseQuantity(cpu)
			if err == nil {
				container.Resources.Requests[corev1.ResourceCPU] = cpuQty
				limitCPU := cpuQty.DeepCopy()
				limitCPU.Add(cpuQty)
				limitCPU.Add(*resource.NewMilliQuantity(cpuQty.MilliValue()/2, resource.DecimalSI))
				container.Resources.Limits[corev1.ResourceCPU] = limitCPU
			}
		}

		if memory != "" {
			memQty, err := resource.ParseQuantity(memory)
			if err == nil {
				container.Resources.Requests[corev1.ResourceMemory] = memQty
				limitMem := memQty.DeepCopy()
				limitMem.Add(memQty)
				limitMem.Add(*resource.NewQuantity(memQty.Value()/2, resource.BinarySI))
				container.Resources.Limits[corev1.ResourceMemory] = limitMem
			}
		}
	}

	_, err = ws.app.clientset.AppsV1().StatefulSets(namespace).Update(ctx, statefulset, metav1.UpdateOptions{})
	if err != nil {
		return map[string]interface{}{
			"success": false,
			"error":   fmt.Sprintf("Failed to update statefulset: %v", err),
		}
	}

	return map[string]interface{}{
		"success": true,
		"message": fmt.Sprintf("Successfully updated resources for StatefulSet %s/%s", namespace, name),
	}
}

// updateDaemonSetResources updates daemonset resource requests/limits
func (ws *WebServer) updateDaemonSetResources(ctx context.Context, namespace, name string, cpu, memory string) map[string]interface{} {
	daemonset, err := ws.app.clientset.AppsV1().DaemonSets(namespace).Get(ctx, name, metav1.GetOptions{})
	if err != nil {
		return map[string]interface{}{
			"success": false,
			"error":   fmt.Sprintf("Failed to get daemonset: %v", err),
		}
	}

	// Update all containers
	for i := range daemonset.Spec.Template.Spec.Containers {
		container := &daemonset.Spec.Template.Spec.Containers[i]
		if container.Resources.Requests == nil {
			container.Resources.Requests = make(corev1.ResourceList)
		}
		if container.Resources.Limits == nil {
			container.Resources.Limits = make(corev1.ResourceList)
		}

		if cpu != "" {
			cpuQty, err := resource.ParseQuantity(cpu)
			if err == nil {
				container.Resources.Requests[corev1.ResourceCPU] = cpuQty
				// Set limit to 1.5x request for safety
				limitCPU := cpuQty.DeepCopy()
				limitCPU.Add(cpuQty)
				limitCPU.Add(*resource.NewMilliQuantity(cpuQty.MilliValue()/2, resource.DecimalSI))
				container.Resources.Limits[corev1.ResourceCPU] = limitCPU
			}
		}

		if memory != "" {
			memQty, err := resource.ParseQuantity(memory)
			if err == nil {
				container.Resources.Requests[corev1.ResourceMemory] = memQty
				// Set limit to 1.5x request for safety
				limitMem := memQty.DeepCopy()
				limitMem.Add(memQty)
				limitMem.Add(*resource.NewQuantity(memQty.Value()/2, resource.BinarySI))
				container.Resources.Limits[corev1.ResourceMemory] = limitMem
			}
		}
	}

	_, err = ws.app.clientset.AppsV1().DaemonSets(namespace).Update(ctx, daemonset, metav1.UpdateOptions{})
	if err != nil {
		return map[string]interface{}{
			"success": false,
			"error":   fmt.Sprintf("Failed to update daemonset: %v", err),
		}
	}

	return map[string]interface{}{
		"success": true,
		"message": fmt.Sprintf("Successfully updated resources for DaemonSet %s/%s", namespace, name),
	}
}

// scaleDeployment scales a deployment
func (ws *WebServer) scaleDeployment(ctx context.Context, namespace, name string, replicas int32) map[string]interface{} {
	scale, err := ws.app.clientset.AppsV1().Deployments(namespace).GetScale(ctx, name, metav1.GetOptions{})
	if err != nil {
		return map[string]interface{}{
			"success": false,
			"error":   fmt.Sprintf("Failed to get deployment scale: %v", err),
		}
	}

	scale.Spec.Replicas = replicas
	_, err = ws.app.clientset.AppsV1().Deployments(namespace).UpdateScale(ctx, name, scale, metav1.UpdateOptions{})
	if err != nil {
		return map[string]interface{}{
			"success": false,
			"error":   fmt.Sprintf("Failed to scale deployment: %v", err),
		}
	}

	return map[string]interface{}{
		"success": true,
		"message": fmt.Sprintf("Successfully scaled Deployment %s/%s to %d replicas", namespace, name, replicas),
	}
}

// scaleStatefulSet scales a statefulset
func (ws *WebServer) scaleStatefulSet(ctx context.Context, namespace, name string, replicas int32) map[string]interface{} {
	scale, err := ws.app.clientset.AppsV1().StatefulSets(namespace).GetScale(ctx, name, metav1.GetOptions{})
	if err != nil {
		return map[string]interface{}{
			"success": false,
			"error":   fmt.Sprintf("Failed to get statefulset scale: %v", err),
		}
	}

	scale.Spec.Replicas = replicas
	_, err = ws.app.clientset.AppsV1().StatefulSets(namespace).UpdateScale(ctx, name, scale, metav1.UpdateOptions{})
	if err != nil {
		return map[string]interface{}{
			"success": false,
			"error":   fmt.Sprintf("Failed to scale statefulset: %v", err),
		}
	}

	return map[string]interface{}{
		"success": true,
		"message": fmt.Sprintf("Successfully scaled StatefulSet %s/%s to %d replicas", namespace, name, replicas),
	}
}

// parseResourceValues parses "CPU: 100m, Memory: 256Mi" format
func parseResourceValues(value string) (cpu, memory string) {
	parts := strings.Split(value, ",")
	for _, part := range parts {
		part = strings.TrimSpace(part)
		if strings.HasPrefix(strings.ToLower(part), "cpu:") {
			cpu = strings.TrimSpace(strings.TrimPrefix(strings.ToLower(part), "cpu:"))
		} else if strings.HasPrefix(strings.ToLower(part), "memory:") {
			memory = strings.TrimSpace(strings.TrimPrefix(strings.ToLower(part), "memory:"))
		}
	}
	return
}

// parseReplicas parses "3 replicas" or just "3" format
func parseReplicas(value string) int32 {
	value = strings.TrimSpace(strings.ToLower(value))
	value = strings.TrimSuffix(value, "replicas")
	value = strings.TrimSpace(value)
	
	replicas, err := strconv.Atoi(value)
	if err != nil {
		return 1
	}
	return int32(replicas)
}

