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

// invalidateCustomAppsCache invalidates the custom apps cache for the current cluster context
func (ws *WebServer) invalidateCustomAppsCache() {
	currentContext := ws.app.GetCurrentContext()
	if currentContext == "" {
		return
	}
	ws.customAppsCacheMu.Lock()
	delete(ws.customAppsCache, currentContext)
	delete(ws.customAppsCacheTime, currentContext)
	ws.customAppsCacheMu.Unlock()
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

// CustomAppInfo represents information about a deployed custom app
type CustomAppInfo struct {
	DeploymentID  string                 `json:"deploymentId"`
	Name          string                 `json:"name"`
	Namespace     string                 `json:"namespace"`
	Resources     []ResourcePreview      `json:"resources"`
	ResourceCount map[string]int         `json:"resourceCount"`
	CreatedAt     string                 `json:"createdAt"`
	Manifests     []string               `json:"manifests,omitempty"`
}

// handleCustomAppList handles GET /api/custom-apps/list
func (ws *WebServer) handleCustomAppList(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if r.Method != http.MethodGet {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Method not allowed",
		})
		return
	}

	if ws.app.clientset == nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Kubernetes client not initialized",
			"apps":    []CustomAppInfo{},
		})
		return
	}

	// Get current cluster context for cache key
	currentContext := ws.app.GetCurrentContext()
	if currentContext == "" {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "No cluster context selected",
			"apps":    []CustomAppInfo{},
		})
		return
	}

	// Check cache first (30 second TTL, per context)
	ws.customAppsCacheMu.RLock()
	cachedApps, hasCache := ws.customAppsCache[currentContext]
	cacheTime, hasTime := ws.customAppsCacheTime[currentContext]
	if hasCache && hasTime && time.Since(cacheTime) < 30*time.Second {
		apps := cachedApps
		ws.customAppsCacheMu.RUnlock()
		w.Header().Set("X-Cache", "HIT")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": true,
			"apps":    apps,
		})
		return
	}
	ws.customAppsCacheMu.RUnlock()

	// Cache miss - query Kubernetes API
	ctx := r.Context()
	apps, err := ws.listCustomApps(ctx)
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   err.Error(),
			"apps":    []CustomAppInfo{},
		})
		return
	}

	// Store in cache
	ws.customAppsCacheMu.Lock()
	ws.customAppsCache[currentContext] = apps
	ws.customAppsCacheTime[currentContext] = time.Now()
	ws.customAppsCacheMu.Unlock()

	w.Header().Set("X-Cache", "MISS")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"apps":    apps,
	})
}

// handleCustomAppGet handles GET /api/custom-apps/get?deploymentId=xxx
func (ws *WebServer) handleCustomAppGet(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if r.Method != http.MethodGet {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Method not allowed",
		})
		return
	}

	deploymentID := r.URL.Query().Get("deploymentId")
	if deploymentID == "" {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "deploymentId is required",
		})
		return
	}

	if ws.app.clientset == nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Kubernetes client not initialized",
		})
		return
	}

	ctx := r.Context()
	app, err := ws.getCustomApp(ctx, deploymentID)
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	// Invalidate cache after update (in case get was called for modify operation)
	// Note: We don't invalidate on get, only on modify/delete/deploy operations

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"app":     app,
	})
}

// handleCustomAppUpdate handles PUT /api/custom-apps/update
func (ws *WebServer) handleCustomAppUpdate(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if r.Method != http.MethodPut {
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

	deploymentID := r.URL.Query().Get("deploymentId")
	if deploymentID == "" {
		json.NewEncoder(w).Encode(CustomAppDeployResponse{
			Success: false,
			Errors:  []string{"deploymentId is required"},
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
	deploy, err := ws.updateCustomAppManifests(ctx, deploymentID, req.Manifests, req.Namespace)
	if err != nil {
		json.NewEncoder(w).Encode(CustomAppDeployResponse{
			Success: false,
			Errors:  []string{err.Error()},
		})
		return
	}

	// Invalidate cache after update
	ws.invalidateCustomAppsCache()

	json.NewEncoder(w).Encode(deploy)
}

// handleCustomAppRestart handles POST /api/custom-apps/restart
func (ws *WebServer) handleCustomAppRestart(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if r.Method != http.MethodPost {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Method not allowed",
		})
		return
	}

	deploymentID := r.URL.Query().Get("deploymentId")
	if deploymentID == "" {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "deploymentId is required",
		})
		return
	}

	if ws.app.clientset == nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Kubernetes client not initialized",
		})
		return
	}

	ctx := r.Context()
	err := ws.restartCustomApp(ctx, deploymentID)
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	// Invalidate cache after restart (apps list doesn't change, but we refresh for consistency)
	ws.invalidateCustomAppsCache()

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": "Custom app restarted successfully",
	})
}

// handleCustomAppDelete handles DELETE /api/custom-apps/delete
func (ws *WebServer) handleCustomAppDelete(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if r.Method != http.MethodDelete {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Method not allowed",
		})
		return
	}

	deploymentID := r.URL.Query().Get("deploymentId")
	if deploymentID == "" {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "deploymentId is required",
		})
		return
	}

	if ws.app.clientset == nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Kubernetes client not initialized",
		})
		return
	}

	ctx := r.Context()
	err := ws.deleteCustomApp(ctx, deploymentID)
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	// Invalidate cache after deletion
	ws.invalidateCustomAppsCache()

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": "Custom app deleted successfully",
	})
}

// listCustomApps lists all deployed custom apps by querying resources with kubegraf.io/app-id label
func (ws *WebServer) listCustomApps(ctx context.Context) ([]CustomAppInfo, error) {
	dynamicClient, err := dynamic.NewForConfig(ws.app.config)
	if err != nil {
		return nil, fmt.Errorf("failed to create dynamic client: %v", err)
	}

	// Group resources by deployment ID
	deploymentGroups := make(map[string]*CustomAppInfo)

	// Query common resource types - we'll filter by label in the code
	// Kubernetes label selector syntax requires key=value, so we'll query all and filter
	
	// Query Deployments - we'll list all and filter by label
	resourceTypes := []struct {
		groupVersion string
		resource     string
	}{
		{"apps/v1", "deployments"},
		{"apps/v1", "statefulsets"},
		{"v1", "services"},
		{"v1", "configmaps"},
		{"networking.k8s.io/v1", "ingresses"},
	}

	for _, rt := range resourceTypes {
		if err := ws.queryLabeledResources(ctx, dynamicClient, rt.groupVersion, rt.resource, deploymentGroups); err != nil {
			fmt.Printf("Warning: failed to query %s: %v\n", rt.resource, err)
		}
	}

	// Convert map to slice
	apps := make([]CustomAppInfo, 0, len(deploymentGroups))
	for _, app := range deploymentGroups {
		// Sort resources by kind and name
		apps = append(apps, *app)
	}

	return apps, nil
}

// queryLabeledResources queries resources and groups them by deployment ID based on kubegraf.io/app-id label
func (ws *WebServer) queryLabeledResources(ctx context.Context, dynamicClient dynamic.Interface, groupVersion, resource string, deploymentGroups map[string]*CustomAppInfo) error {
	parts := strings.Split(groupVersion, "/")
	gvr := schema.GroupVersionResource{
		Group:    parts[0],
		Version:  parts[1],
		Resource: resource,
	}

	// List all resources (we'll filter by label in code since we want to group by label value)
	uList, err := dynamicClient.Resource(gvr).Namespace("").List(ctx, metav1.ListOptions{})
	if err != nil {
		return err
	}

	for _, item := range uList.Items {
		labels := item.GetLabels()
		if labels == nil {
			continue
		}
		
		appID := labels[kubegrafAppIDLabel]
		if appID == "" {
			continue
		}

		if deploymentGroups[appID] == nil {
			deploymentGroups[appID] = &CustomAppInfo{
				DeploymentID:  appID,
				Namespace:     item.GetNamespace(),
				Resources:     []ResourcePreview{},
				ResourceCount: make(map[string]int),
			}
		}

		kind := item.GetObjectKind().GroupVersionKind().Kind
		name := item.GetName()
		namespace := item.GetNamespace()
		createdAt := item.GetCreationTimestamp()

		// Set name from first Deployment or StatefulSet found, or use first resource name
		if deploymentGroups[appID].Name == "" && (kind == "Deployment" || kind == "StatefulSet") {
			deploymentGroups[appID].Name = name
			deploymentGroups[appID].CreatedAt = createdAt.Format(time.RFC3339)
		} else if deploymentGroups[appID].Name == "" {
			deploymentGroups[appID].Name = name
			if deploymentGroups[appID].CreatedAt == "" {
				deploymentGroups[appID].CreatedAt = createdAt.Format(time.RFC3339)
			}
		}

		// Add resource
		deploymentGroups[appID].Resources = append(deploymentGroups[appID].Resources, ResourcePreview{
			Kind:       kind,
			Name:       name,
			Namespace:  namespace,
			APIVersion: item.GetAPIVersion(),
		})
		deploymentGroups[appID].ResourceCount[kind]++
	}

	return nil
}

// getCustomApp gets details of a specific custom app deployment including manifests
func (ws *WebServer) getCustomApp(ctx context.Context, deploymentID string) (*CustomAppInfo, error) {
	dynamicClient, err := dynamic.NewForConfig(ws.app.config)
	if err != nil {
		return nil, fmt.Errorf("failed to create dynamic client: %v", err)
	}

	labelSelector := fmt.Sprintf("%s=%s", kubegrafAppIDLabel, deploymentID)
	app := &CustomAppInfo{
		DeploymentID:  deploymentID,
		Resources:     []ResourcePreview{},
		ResourceCount: make(map[string]int),
		Manifests:     []string{},
	}

	// Common resource types to query
	resourceTypes := []struct {
		groupVersion string
		resource     string
	}{
		{"apps/v1", "deployments"},
		{"apps/v1", "statefulsets"},
		{"apps/v1", "daemonsets"},
		{"v1", "services"},
		{"v1", "configmaps"},
		{"v1", "secrets"},
		{"networking.k8s.io/v1", "ingresses"},
	}

	for _, rt := range resourceTypes {
		gvr := schema.GroupVersionResource{
			Group:    strings.Split(rt.groupVersion, "/")[0],
			Version:  strings.Split(rt.groupVersion, "/")[1],
			Resource: rt.resource,
		}

		uList, err := dynamicClient.Resource(gvr).Namespace("").List(ctx, metav1.ListOptions{
			LabelSelector: labelSelector,
		})
		if err != nil {
			continue // Skip if resource type not available
		}

		for _, item := range uList.Items {
			kind := item.GetObjectKind().GroupVersionKind().Kind
			name := item.GetName()
			namespace := item.GetNamespace()
			createdAt := item.GetCreationTimestamp()

			if app.Name == "" && (kind == "Deployment" || kind == "StatefulSet") {
				app.Name = name
				app.Namespace = namespace
				app.CreatedAt = createdAt.Format(time.RFC3339)
			} else if app.Name == "" {
				app.Name = name
				if app.Namespace == "" {
					app.Namespace = namespace
				}
				if app.CreatedAt == "" {
					app.CreatedAt = createdAt.Format(time.RFC3339)
				}
			}

			// Add resource
			app.Resources = append(app.Resources, ResourcePreview{
				Kind:       kind,
				Name:       name,
				Namespace:  namespace,
				APIVersion: item.GetAPIVersion(),
			})
			app.ResourceCount[kind]++

			// Convert to YAML for manifests
			yamlBytes, err := kyaml.Marshal(item.Object)
			if err == nil {
				app.Manifests = append(app.Manifests, string(yamlBytes))
			}
		}
	}

	if app.Name == "" {
		return nil, fmt.Errorf("custom app with deploymentId %s not found", deploymentID)
	}

	return app, nil
}

// updateCustomAppManifests updates/redeploys a custom app with new manifests
func (ws *WebServer) updateCustomAppManifests(ctx context.Context, deploymentID string, manifests []string, namespace string) (*CustomAppDeployResponse, error) {
	// First verify the app exists
	_, err := ws.getCustomApp(ctx, deploymentID)
	if err != nil {
		return nil, fmt.Errorf("custom app not found: %v", err)
	}

	// Use the same deployment ID to maintain tracking
	var allResources []ResourcePreview
	var resourceCount = make(map[string]int)
	var errors []string

	// Parse and apply new manifests
	combinedYAML := strings.Join(manifests, "\n---\n")
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

		objNamespace := metaObj.GetNamespace()
		if objNamespace == "" {
			objNamespace = namespace
		}

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

	// Invalidate cache after update
	// Note: This is called from handleCustomAppUpdate, but we also invalidate in the handler
	// to ensure cache is cleared even if called directly

	// Note: Cache invalidation is handled in the handler function, not here

	return &CustomAppDeployResponse{
		Success:      true,
		DeploymentID: deploymentID,
		Resources:    allResources,
		ResourceCount: resourceCount,
		Message:      fmt.Sprintf("Successfully updated %d resources", len(allResources)),
	}, nil
}

// restartCustomApp restarts Deployments and StatefulSets in a custom app
func (ws *WebServer) restartCustomApp(ctx context.Context, deploymentID string) error {
	dynamicClient, err := dynamic.NewForConfig(ws.app.config)
	if err != nil {
		return fmt.Errorf("failed to create dynamic client: %v", err)
	}

	labelSelector := fmt.Sprintf("%s=%s", kubegrafAppIDLabel, deploymentID)

	// Restart Deployments
	deploymentsGVR := schema.GroupVersionResource{
		Group:    "apps",
		Version:  "v1",
		Resource: "deployments",
	}

	depList, err := dynamicClient.Resource(deploymentsGVR).Namespace("").List(ctx, metav1.ListOptions{
		LabelSelector: labelSelector,
	})
	if err == nil {
		for _, item := range depList.Items {
			namespace := item.GetNamespace()
			name := item.GetName()

			// Get the deployment
			dep, err := dynamicClient.Resource(deploymentsGVR).Namespace(namespace).Get(ctx, name, metav1.GetOptions{})
			if err != nil {
				continue
			}

			// Add/update annotation to trigger restart
			annotations := dep.GetAnnotations()
			if annotations == nil {
				annotations = make(map[string]string)
			}
			annotations["kubectl.kubernetes.io/restartedAt"] = time.Now().Format(time.RFC3339)
			dep.SetAnnotations(annotations)

			// Update the deployment
			_, err = dynamicClient.Resource(deploymentsGVR).Namespace(namespace).Update(ctx, dep, metav1.UpdateOptions{})
			if err != nil {
				return fmt.Errorf("failed to restart deployment %s/%s: %v", namespace, name, err)
			}
		}
	}

	// Restart StatefulSets
	statefulSetsGVR := schema.GroupVersionResource{
		Group:    "apps",
		Version:  "v1",
		Resource: "statefulsets",
	}

	stsList, err := dynamicClient.Resource(statefulSetsGVR).Namespace("").List(ctx, metav1.ListOptions{
		LabelSelector: labelSelector,
	})
	if err == nil {
		for _, item := range stsList.Items {
			namespace := item.GetNamespace()
			name := item.GetName()

			sts, err := dynamicClient.Resource(statefulSetsGVR).Namespace(namespace).Get(ctx, name, metav1.GetOptions{})
			if err != nil {
				continue
			}

			annotations := sts.GetAnnotations()
			if annotations == nil {
				annotations = make(map[string]string)
			}
			annotations["kubectl.kubernetes.io/restartedAt"] = time.Now().Format(time.RFC3339)
			sts.SetAnnotations(annotations)

			_, err = dynamicClient.Resource(statefulSetsGVR).Namespace(namespace).Update(ctx, sts, metav1.UpdateOptions{})
			if err != nil {
				return fmt.Errorf("failed to restart statefulset %s/%s: %v", namespace, name, err)
			}
		}
	}

	return nil
}

// deleteCustomApp deletes all resources with the deployment ID label
func (ws *WebServer) deleteCustomApp(ctx context.Context, deploymentID string) error {
	dynamicClient, err := dynamic.NewForConfig(ws.app.config)
	if err != nil {
		return fmt.Errorf("failed to create dynamic client: %v", err)
	}

	labelSelector := fmt.Sprintf("%s=%s", kubegrafAppIDLabel, deploymentID)

	// Resource types to delete
	resourceTypes := []struct {
		groupVersion string
		resource     string
	}{
		{"apps/v1", "deployments"},
		{"apps/v1", "statefulsets"},
		{"apps/v1", "daemonsets"},
		{"v1", "services"},
		{"v1", "configmaps"},
		{"v1", "secrets"},
		{"networking.k8s.io/v1", "ingresses"},
		{"batch/v1", "jobs"},
		{"batch/v1", "cronjobs"},
	}

	for _, rt := range resourceTypes {
		parts := strings.Split(rt.groupVersion, "/")
		gvr := schema.GroupVersionResource{
			Group:    parts[0],
			Version:  parts[1],
			Resource: rt.resource,
		}

		uList, err := dynamicClient.Resource(gvr).Namespace("").List(ctx, metav1.ListOptions{
			LabelSelector: labelSelector,
		})
		if err != nil {
			continue // Skip if resource type not available
		}

		for _, item := range uList.Items {
			namespace := item.GetNamespace()
			name := item.GetName()

			var deleteErr error
			if ws.isNamespacedResource(&schema.GroupVersionKind{Group: parts[0], Version: parts[1], Kind: ""}) {
				deleteErr = dynamicClient.Resource(gvr).Namespace(namespace).Delete(ctx, name, metav1.DeleteOptions{})
			} else {
				deleteErr = dynamicClient.Resource(gvr).Delete(ctx, name, metav1.DeleteOptions{})
			}

			if deleteErr != nil && !strings.Contains(deleteErr.Error(), "not found") {
				return fmt.Errorf("failed to delete %s %s/%s: %v", rt.resource, namespace, name, deleteErr)
			}
		}
	}

	return nil
}

