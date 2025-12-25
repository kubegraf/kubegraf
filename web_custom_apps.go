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
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/apimachinery/pkg/util/yaml"
	"k8s.io/client-go/dynamic"
	"k8s.io/client-go/kubernetes/scheme"
	kyaml "sigs.k8s.io/yaml"
)

const (
	kubegrafAppIDLabel = "kubegraf.io/app-id"
)

// CustomAppDeployRequest represents a request to deploy custom app manifests
type CustomAppDeployRequest struct {
	Manifests []string `json:"manifests"` // Array of YAML strings
	Namespace string   `json:"namespace"`
}

// CustomAppPreviewRequest represents a request to preview custom app deployment
type CustomAppPreviewRequest struct {
	Manifests []string `json:"manifests"` // Array of YAML strings
	Namespace string   `json:"namespace"`
}

// ResourcePreview represents a preview of a single resource
type ResourcePreview struct {
	Kind      string `json:"kind"`
	Name      string `json:"name"`
	Namespace string `json:"namespace"`
	APIVersion string `json:"apiVersion"`
}

// CustomAppPreviewResponse represents the response from preview endpoint
type CustomAppPreviewResponse struct {
	Success      bool                     `json:"success"`
	Resources    []ResourcePreview        `json:"resources"`
	ResourceCount map[string]int          `json:"resourceCount"` // e.g., {"Deployment": 2, "Service": 1}
	Warnings     []string                 `json:"warnings,omitempty"`
	Errors       []string                 `json:"errors,omitempty"`
	Manifests    []string                 `json:"manifests"` // Normalized YAML for preview
}

// CustomAppDeployResponse represents the response from deploy endpoint
type CustomAppDeployResponse struct {
	Success       bool             `json:"success"`
	DeploymentID  string           `json:"deploymentId"`
	Resources     []ResourcePreview `json:"resources"`
	ResourceCount map[string]int   `json:"resourceCount"`
	Message       string           `json:"message,omitempty"`
	Errors        []string         `json:"errors,omitempty"`
}

// handleCustomAppPreview handles POST /api/custom-apps/preview
func (ws *WebServer) handleCustomAppPreview(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if r.Method != http.MethodPost {
		json.NewEncoder(w).Encode(CustomAppPreviewResponse{
			Success: false,
			Errors:  []string{"Method not allowed"},
		})
		return
	}

	if ws.app.clientset == nil {
		json.NewEncoder(w).Encode(CustomAppPreviewResponse{
			Success: false,
			Errors:  []string{"Kubernetes client not initialized"},
		})
		return
	}

	var req CustomAppPreviewRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		json.NewEncoder(w).Encode(CustomAppPreviewResponse{
			Success: false,
			Errors:  []string{fmt.Sprintf("Failed to parse request: %v", err)},
		})
		return
	}

	if len(req.Manifests) == 0 {
		json.NewEncoder(w).Encode(CustomAppPreviewResponse{
			Success: false,
			Errors:  []string{"No manifests provided"},
		})
		return
	}

	if req.Namespace == "" {
		json.NewEncoder(w).Encode(CustomAppPreviewResponse{
			Success: false,
			Errors:  []string{"Namespace is required"},
		})
		return
	}

	ctx := r.Context()
	preview, err := ws.previewCustomAppManifests(ctx, req.Manifests, req.Namespace)
	if err != nil {
		json.NewEncoder(w).Encode(CustomAppPreviewResponse{
			Success: false,
			Errors:  []string{err.Error()},
		})
		return
	}

	json.NewEncoder(w).Encode(preview)
}

// handleCustomAppDeploy handles POST /api/custom-apps/deploy
func (ws *WebServer) handleCustomAppDeploy(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if r.Method != http.MethodPost {
		json.NewEncoder(w).Encode(CustomAppDeployResponse{
			Success: false,
			Errors:  []string{"Method not allowed"},
		})
		return
	}

	if ws.app.clientset == nil {
		json.NewEncoder(w).Encode(CustomAppDeployResponse{
			Success: false,
			Errors:  []string{"Kubernetes client not initialized"},
		})
		return
	}

	var req CustomAppDeployRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		json.NewEncoder(w).Encode(CustomAppDeployResponse{
			Success: false,
			Errors:  []string{fmt.Sprintf("Failed to parse request: %v", err)},
		})
		return
	}

	if len(req.Manifests) == 0 {
		json.NewEncoder(w).Encode(CustomAppDeployResponse{
			Success: false,
			Errors:  []string{"No manifests provided"},
		})
		return
	}

	if req.Namespace == "" {
		json.NewEncoder(w).Encode(CustomAppDeployResponse{
			Success: false,
			Errors:  []string{"Namespace is required"},
		})
		return
	}

	ctx := r.Context()
	deploy, err := ws.deployCustomAppManifests(ctx, req.Manifests, req.Namespace)
	if err != nil {
		json.NewEncoder(w).Encode(CustomAppDeployResponse{
			Success: false,
			Errors:  []string{err.Error()},
		})
		return
	}

	json.NewEncoder(w).Encode(deploy)
}

// previewCustomAppManifests validates and previews manifests using dry-run
func (ws *WebServer) previewCustomAppManifests(ctx context.Context, manifests []string, namespace string) (*CustomAppPreviewResponse, error) {
	var allResources []ResourcePreview
	var resourceCount = make(map[string]int)
	var warnings []string
	var errors []string
	var normalizedManifests []string

	// Combine all YAML into one string for parsing
	combinedYAML := strings.Join(manifests, "\n---\n")

	// Parse YAML documents
	decoder := yaml.NewYAMLOrJSONDecoder(strings.NewReader(combinedYAML), 4096)
	decoded := scheme.Codecs.UniversalDeserializer()

	for {
		var rawObj runtime.RawExtension
		if err := decoder.Decode(&rawObj); err != nil {
			if err == io.EOF {
				break
			}
			errors = append(errors, fmt.Sprintf("Failed to parse YAML: %v", err))
			continue
		}

		if len(rawObj.Raw) == 0 {
			continue
		}

		// Try to decode into Unstructured first (for CRDs and unknown types)
		obj, gvk, err := unstructured.UnstructuredJSONScheme.Decode(rawObj.Raw, nil, nil)
		if err != nil {
			// Try with default scheme
			obj, gvk, err = decoded.Decode(rawObj.Raw, nil, nil)
			if err != nil {
				errors = append(errors, fmt.Sprintf("Failed to decode object: %v", err))
				continue
			}
		}

		if gvk == nil {
			errors = append(errors, "Object missing GroupVersionKind")
			continue
		}

		// Extract metadata
		metaObj, ok := obj.(metav1.Object)
		if !ok {
			errors = append(errors, "Object does not implement metav1.Object")
			continue
		}

		// Get namespace from object or use provided namespace
		objNamespace := metaObj.GetNamespace()
		if objNamespace == "" {
			objNamespace = namespace
		}

		// Set namespace if it's a namespaced resource
		if ws.isNamespacedResource(gvk) {
			metaObj.SetNamespace(objNamespace)
		}

		// Normalize the YAML for preview
		normalizedYAML, err := ws.objectToYAML(obj)
		if err != nil {
			warnings = append(warnings, fmt.Sprintf("Failed to normalize YAML for %s/%s: %v", gvk.Kind, metaObj.GetName(), err))
		} else {
			normalizedManifests = append(normalizedManifests, normalizedYAML)
		}

		// Perform dry-run validation
		err = ws.validateResourceDryRun(ctx, obj, gvk, objNamespace)
		if err != nil {
			errors = append(errors, fmt.Sprintf("%s/%s: %v", gvk.Kind, metaObj.GetName(), err))
			continue
		}

		// Add to preview
		resource := ResourcePreview{
			Kind:       gvk.Kind,
			Name:       metaObj.GetName(),
			Namespace:  objNamespace,
			APIVersion: gvk.GroupVersion().String(),
		}
		allResources = append(allResources, resource)
		resourceCount[gvk.Kind]++
	}

	return &CustomAppPreviewResponse{
		Success:       len(errors) == 0,
		Resources:     allResources,
		ResourceCount: resourceCount,
		Warnings:      warnings,
		Errors:        errors,
		Manifests:     normalizedManifests,
	}, nil
}

// deployCustomAppManifests applies manifests to the cluster
func (ws *WebServer) deployCustomAppManifests(ctx context.Context, manifests []string, namespace string) (*CustomAppDeployResponse, error) {
	deploymentID := fmt.Sprintf("kubegraf-%d", time.Now().Unix())
	var allResources []ResourcePreview
	var resourceCount = make(map[string]int)
	var errors []string

	// Create namespace if it doesn't exist (for namespaced resources)
	_, err := ws.app.clientset.CoreV1().Namespaces().Get(ctx, namespace, metav1.GetOptions{})
	if err != nil {
		// Namespace doesn't exist, create it
		newNamespace := &corev1.Namespace{
			ObjectMeta: metav1.ObjectMeta{
				Name: namespace,
				Labels: map[string]string{
					kubegrafAppIDLabel: deploymentID,
					"managed-by":       "kubegraf",
				},
			},
		}
		_, createErr := ws.app.clientset.CoreV1().Namespaces().Create(ctx, newNamespace, metav1.CreateOptions{})
		if createErr != nil {
			// If creation fails, add to errors but continue (might be permission issue)
			errors = append(errors, fmt.Sprintf("Failed to create namespace %s: %v", namespace, createErr))
		}
	}

	// Combine all YAML into one string for parsing
	combinedYAML := strings.Join(manifests, "\n---\n")

	// Parse YAML documents
	decoder := yaml.NewYAMLOrJSONDecoder(strings.NewReader(combinedYAML), 4096)
	decoded := scheme.Codecs.UniversalDeserializer()

	for {
		var rawObj runtime.RawExtension
		if err := decoder.Decode(&rawObj); err != nil {
			if err == io.EOF {
				break
			}
			errors = append(errors, fmt.Sprintf("Failed to parse YAML: %v", err))
			continue
		}

		if len(rawObj.Raw) == 0 {
			continue
		}

		// Try to decode into Unstructured first
		obj, gvk, err := unstructured.UnstructuredJSONScheme.Decode(rawObj.Raw, nil, nil)
		if err != nil {
			obj, gvk, err = decoded.Decode(rawObj.Raw, nil, nil)
			if err != nil {
				errors = append(errors, fmt.Sprintf("Failed to decode object: %v", err))
				continue
			}
		}

		if gvk == nil {
			errors = append(errors, "Object missing GroupVersionKind")
			continue
		}

		metaObj, ok := obj.(metav1.Object)
		if !ok {
			errors = append(errors, "Object does not implement metav1.Object")
			continue
		}

		// Get namespace from object or use provided namespace
		objNamespace := metaObj.GetNamespace()
		if objNamespace == "" {
			objNamespace = namespace
		}

		// Set namespace and label
		if ws.isNamespacedResource(gvk) {
			metaObj.SetNamespace(objNamespace)
		}

		// Add deployment ID label
		labels := metaObj.GetLabels()
		if labels == nil {
			labels = make(map[string]string)
		}
		labels[kubegrafAppIDLabel] = deploymentID
		metaObj.SetLabels(labels)

		// Apply the resource
		err = ws.applyResource(ctx, obj, gvk, objNamespace)
		if err != nil {
			errors = append(errors, fmt.Sprintf("Failed to apply %s/%s: %v", gvk.Kind, metaObj.GetName(), err))
			continue
		}

		resource := ResourcePreview{
			Kind:       gvk.Kind,
			Name:       metaObj.GetName(),
			Namespace:  objNamespace,
			APIVersion: gvk.GroupVersion().String(),
		}
		allResources = append(allResources, resource)
		resourceCount[gvk.Kind]++
	}

	if len(errors) > 0 {
		return &CustomAppDeployResponse{
			Success:      false,
			DeploymentID: deploymentID,
			Resources:    allResources,
			ResourceCount: resourceCount,
			Errors:       errors,
		}, nil
	}

	return &CustomAppDeployResponse{
		Success:       true,
		DeploymentID:  deploymentID,
		Resources:     allResources,
		ResourceCount: resourceCount,
		Message:       fmt.Sprintf("Successfully deployed %d resources", len(allResources)),
	}, nil
}

// validateResourceDryRun validates a resource using Kubernetes dry-run
func (ws *WebServer) validateResourceDryRun(ctx context.Context, obj runtime.Object, gvk *schema.GroupVersionKind, namespace string) error {
	// Use dynamic client for generic resource validation
	if ws.app.config == nil {
		return fmt.Errorf("Kubernetes config not available")
	}
	dynamicClient, err := dynamic.NewForConfig(ws.app.config)
	if err != nil {
		return fmt.Errorf("failed to create dynamic client: %v", err)
	}

	// Convert object to unstructured for dynamic client
	unstructuredObj, err := runtime.DefaultUnstructuredConverter.ToUnstructured(obj)
	if err != nil {
		return fmt.Errorf("failed to convert to unstructured: %v", err)
	}

	u := &unstructured.Unstructured{Object: unstructuredObj}

	gvr := schema.GroupVersionResource{
		Group:    gvk.Group,
		Version:  gvk.Version,
		Resource: ws.getResourceName(gvk.Kind),
	}

	// Check if resource is namespaced
	if ws.isNamespacedResource(gvk) {
		// Perform server-side dry-run create
		_, err = dynamicClient.Resource(gvr).Namespace(namespace).Create(ctx, u, metav1.CreateOptions{
			DryRun: []string{metav1.DryRunAll},
		})
	} else {
		// Cluster-scoped resource
		_, err = dynamicClient.Resource(gvr).Create(ctx, u, metav1.CreateOptions{
			DryRun: []string{metav1.DryRunAll},
		})
	}

	return err
}

// applyResource applies a resource to the cluster
func (ws *WebServer) applyResource(ctx context.Context, obj runtime.Object, gvk *schema.GroupVersionKind, namespace string) error {
	if ws.app.config == nil {
		return fmt.Errorf("Kubernetes config not available")
	}
	dynamicClient, err := dynamic.NewForConfig(ws.app.config)
	if err != nil {
		return fmt.Errorf("failed to create dynamic client: %v", err)
	}

	unstructuredObj, err := runtime.DefaultUnstructuredConverter.ToUnstructured(obj)
	if err != nil {
		return fmt.Errorf("failed to convert to unstructured: %v", err)
	}

	u := &unstructured.Unstructured{Object: unstructuredObj}

	gvr := schema.GroupVersionResource{
		Group:    gvk.Group,
		Version:  gvk.Version,
		Resource: ws.getResourceName(gvk.Kind),
	}

	// Get resource name from unstructured object
	resourceName := u.GetName()
	if resourceName == "" {
		return fmt.Errorf("resource name is required")
	}

	// Use server-side apply with field manager
	fieldManager := "kubegraf"
	applyOptions := metav1.ApplyOptions{
		FieldManager: fieldManager,
		Force:        true,
	}

	if ws.isNamespacedResource(gvk) {
		_, err = dynamicClient.Resource(gvr).Namespace(namespace).Apply(ctx, resourceName, u, applyOptions)
	} else {
		_, err = dynamicClient.Resource(gvr).Apply(ctx, resourceName, u, applyOptions)
	}

	if err != nil {
		// If apply fails, try create
		if ws.isNamespacedResource(gvk) {
			_, createErr := dynamicClient.Resource(gvr).Namespace(namespace).Create(ctx, u, metav1.CreateOptions{})
			if createErr != nil {
				// If create also fails, try update
				existing, getErr := dynamicClient.Resource(gvr).Namespace(namespace).Get(ctx, resourceName, metav1.GetOptions{})
				if getErr == nil {
					u.SetResourceVersion(existing.GetResourceVersion())
					u.SetUID(existing.GetUID())
					_, err = dynamicClient.Resource(gvr).Namespace(namespace).Update(ctx, u, metav1.UpdateOptions{})
				} else {
					err = createErr
				}
			} else {
				err = nil
			}
		} else {
			_, createErr := dynamicClient.Resource(gvr).Create(ctx, u, metav1.CreateOptions{})
			if createErr != nil {
				existing, getErr := dynamicClient.Resource(gvr).Get(ctx, resourceName, metav1.GetOptions{})
				if getErr == nil {
					u.SetResourceVersion(existing.GetResourceVersion())
					u.SetUID(existing.GetUID())
					_, err = dynamicClient.Resource(gvr).Update(ctx, u, metav1.UpdateOptions{})
				} else {
					err = createErr
				}
			} else {
				err = nil
			}
		}
	}

	return err
}

// getResourceName converts Kind to resource name (e.g., "Deployment" -> "deployments")
func (ws *WebServer) getResourceName(kind string) string {
	kindLower := strings.ToLower(kind)
	// Handle common pluralization
	resourceMap := map[string]string{
		"deployment":           "deployments",
		"service":              "services",
		"ingress":              "ingresses",
		"configmap":            "configmaps",
		"secret":               "secrets",
		"statefulset":          "statefulsets",
		"daemonset":            "daemonsets",
		"job":                  "jobs",
		"cronjob":              "cronjobs",
		"persistentvolumeclaim": "persistentvolumeclaims",
		"persistentvolume":     "persistentvolumes",
		"namespace":            "namespaces",
		"pod":                  "pods",
		"replicaset":           "replicasets",
	}

	if resource, ok := resourceMap[kindLower]; ok {
		return resource
	}

	// Default: add 's' if not already plural
	if !strings.HasSuffix(kindLower, "s") {
		return kindLower + "s"
	}
	return kindLower
}

// isNamespacedResource checks if a resource kind is namespaced
func (ws *WebServer) isNamespacedResource(gvk *schema.GroupVersionKind) bool {
	// Cluster-scoped resources
	clusterScoped := []string{
		"Namespace",
		"Node",
		"PersistentVolume",
		"ClusterRole",
		"ClusterRoleBinding",
		"StorageClass",
		"CustomResourceDefinition",
	}

	for _, kind := range clusterScoped {
		if gvk.Kind == kind {
			return false
		}
	}

	// Default to namespaced
	return true
}

// objectToYAML converts a runtime.Object to YAML string
func (ws *WebServer) objectToYAML(obj runtime.Object) (string, error) {
	jsonBytes, err := json.Marshal(obj)
	if err != nil {
		return "", err
	}

	var jsonObj interface{}
	if err := json.Unmarshal(jsonBytes, &jsonObj); err != nil {
		return "", err
	}

	yamlBytes, err := kyaml.Marshal(jsonObj)
	if err != nil {
		return "", err
	}

	return string(yamlBytes), nil
}

