// Copyright 2025 KubeGraf Contributors
// SPDX-License-Identifier: Apache-2.0

package main

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"sort"
	"strings"
	"time"

	apiextensionsv1 "k8s.io/apiextensions-apiserver/pkg/apis/apiextensions/v1"
	apiextensionsclientset "k8s.io/apiextensions-apiserver/pkg/client/clientset/clientset"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/client-go/dynamic"
	"sigs.k8s.io/yaml"
)

// CRDInfo represents a CustomResourceDefinition
type CRDInfo struct {
	Name         string   `json:"name"`
	Group        string   `json:"group"`
	Version      string   `json:"version"`
	Kind         string   `json:"kind"`
	Scope        string   `json:"scope"` // Namespaced or Cluster
	Instances    int      `json:"instances"`
	Namespaces   []string `json:"namespaces,omitempty"`
	Age          string   `json:"age"`
}

// CustomResourceInstance represents an instance of a custom resource
type CustomResourceInstance struct {
	Name      string                 `json:"name"`
	Namespace string                 `json:"namespace"`
	Kind      string                 `json:"kind"`
	Group     string                 `json:"group"`
	Version   string                 `json:"version"`
	Age       string                 `json:"age"`
	Status    map[string]interface{} `json:"status,omitempty"`
	Labels    map[string]string     `json:"labels,omitempty"`
}

// handleCustomResourceDefinitions returns list of CRDs
func (ws *WebServer) handleCustomResourceDefinitions(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	w.Header().Set("Content-Type", "application/json")

	if ws.app.clientset == nil {
		json.NewEncoder(w).Encode([]CRDInfo{})
		return
	}

	// Create apiextensions client
	apiextensionsClient, err := apiextensionsclientset.NewForConfig(ws.app.config)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to create API extensions client: %v", err), http.StatusInternalServerError)
		return
	}

	// List all CRDs
	crds, err := apiextensionsClient.ApiextensionsV1().CustomResourceDefinitions().List(ws.app.ctx, metav1.ListOptions{})
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Create dynamic client for listing instances
	dynamicClient, err := dynamic.NewForConfig(ws.app.config)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to create dynamic client: %v", err), http.StatusInternalServerError)
		return
	}

	result := make([]CRDInfo, 0, len(crds.Items))
	for _, crd := range crds.Items {
		// Get the served version (prefer v1, then first served version)
		var version string
		for _, v := range crd.Spec.Versions {
			if v.Served {
				version = v.Name
				if version == "v1" {
					break
				}
			}
		}
		if version == "" && len(crd.Spec.Versions) > 0 {
			version = crd.Spec.Versions[0].Name
		}

		scope := "Cluster"
		if crd.Spec.Scope == apiextensionsv1.NamespaceScoped {
			scope = "Namespaced"
		}

		// Count instances
		instances := 0
		namespaces := make(map[string]bool)
		
		gvr := schema.GroupVersionResource{
			Group:    crd.Spec.Group,
			Version:  version,
			Resource: crd.Spec.Names.Plural,
		}

		if scope == "Namespaced" {
			// List from all namespaces
			list, err := dynamicClient.Resource(gvr).Namespace("").List(ws.app.ctx, metav1.ListOptions{})
			if err == nil {
				instances = len(list.Items)
				for _, item := range list.Items {
					if ns := item.GetNamespace(); ns != "" {
						namespaces[ns] = true
					}
				}
			}
		} else {
			// Cluster-scoped
			list, err := dynamicClient.Resource(gvr).List(ws.app.ctx, metav1.ListOptions{})
			if err == nil {
				instances = len(list.Items)
			}
		}

		namespaceList := make([]string, 0, len(namespaces))
		for ns := range namespaces {
			namespaceList = append(namespaceList, ns)
		}
		sort.Strings(namespaceList)

		result = append(result, CRDInfo{
			Name:       crd.Name,
			Group:      crd.Spec.Group,
			Version:    version,
			Kind:       crd.Spec.Names.Kind,
			Scope:      scope,
			Instances:  instances,
			Namespaces: namespaceList,
			Age:        formatAge(time.Since(crd.CreationTimestamp.Time)),
		})
	}

	// Sort by name
	sort.Slice(result, func(i, j int) bool {
		return result[i].Name < result[j].Name
	})

	json.NewEncoder(w).Encode(result)
}

// handleCustomResourceInstances returns instances of a specific CRD
func (ws *WebServer) handleCustomResourceInstances(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	w.Header().Set("Content-Type", "application/json")

	crdName := r.URL.Query().Get("crd")
	namespace := r.URL.Query().Get("namespace")

	if crdName == "" {
		http.Error(w, "crd parameter required", http.StatusBadRequest)
		return
	}

	if ws.app.clientset == nil {
		json.NewEncoder(w).Encode([]CustomResourceInstance{})
		return
	}

	// Create apiextensions client
	apiextensionsClient, err := apiextensionsclientset.NewForConfig(ws.app.config)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to create API extensions client: %v", err), http.StatusInternalServerError)
		return
	}

	// Get the CRD
	crd, err := apiextensionsClient.ApiextensionsV1().CustomResourceDefinitions().Get(ws.app.ctx, crdName, metav1.GetOptions{})
	if err != nil {
		http.Error(w, fmt.Sprintf("CRD not found: %v", err), http.StatusNotFound)
		return
	}

	// Get the served version
	var version string
	for _, v := range crd.Spec.Versions {
		if v.Served {
			version = v.Name
			if version == "v1" {
				break
			}
		}
	}
	if version == "" && len(crd.Spec.Versions) > 0 {
		version = crd.Spec.Versions[0].Name
	}

	// Create dynamic client
	dynamicClient, err := dynamic.NewForConfig(ws.app.config)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to create dynamic client: %v", err), http.StatusInternalServerError)
		return
	}

	gvr := schema.GroupVersionResource{
		Group:    crd.Spec.Group,
		Version:  version,
		Resource: crd.Spec.Names.Plural,
	}

	var list *unstructured.UnstructuredList
	if crd.Spec.Scope == apiextensionsv1.NamespaceScoped {
		if namespace == "" || namespace == "All Namespaces" {
			list, err = dynamicClient.Resource(gvr).Namespace("").List(ws.app.ctx, metav1.ListOptions{})
		} else {
			list, err = dynamicClient.Resource(gvr).Namespace(namespace).List(ws.app.ctx, metav1.ListOptions{})
		}
	} else {
		// Cluster-scoped
		list, err = dynamicClient.Resource(gvr).List(ws.app.ctx, metav1.ListOptions{})
	}

	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to list instances: %v", err), http.StatusInternalServerError)
		return
	}

	result := make([]CustomResourceInstance, 0, len(list.Items))
	for _, item := range list.Items {
		status := make(map[string]interface{})
		if s, ok := item.Object["status"].(map[string]interface{}); ok {
			status = s
		}

		labels := item.GetLabels()
		if labels == nil {
			labels = make(map[string]string)
		}

		result = append(result, CustomResourceInstance{
			Name:      item.GetName(),
			Namespace: item.GetNamespace(),
			Kind:      crd.Spec.Names.Kind,
			Group:     crd.Spec.Group,
			Version:   version,
			Age:       formatAge(time.Since(item.GetCreationTimestamp().Time)),
			Status:    status,
			Labels:    labels,
		})
	}

	json.NewEncoder(w).Encode(result)
}

// handleCustomResourceInstanceDetails returns details of a specific custom resource instance
func (ws *WebServer) handleCustomResourceInstanceDetails(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	w.Header().Set("Content-Type", "application/json")

	crdName := r.URL.Query().Get("crd")
	name := r.URL.Query().Get("name")
	namespace := r.URL.Query().Get("namespace")

	if crdName == "" || name == "" {
		http.Error(w, "crd and name parameters required", http.StatusBadRequest)
		return
	}

	if ws.app.clientset == nil {
		http.Error(w, "Not connected to cluster", http.StatusServiceUnavailable)
		return
	}

	// Create apiextensions client
	apiextensionsClient, err := apiextensionsclientset.NewForConfig(ws.app.config)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to create API extensions client: %v", err), http.StatusInternalServerError)
		return
	}

	// Get the CRD
	crd, err := apiextensionsClient.ApiextensionsV1().CustomResourceDefinitions().Get(ws.app.ctx, crdName, metav1.GetOptions{})
	if err != nil {
		http.Error(w, fmt.Sprintf("CRD not found: %v", err), http.StatusNotFound)
		return
	}

	// Get the served version
	var version string
	for _, v := range crd.Spec.Versions {
		if v.Served {
			version = v.Name
			if version == "v1" {
				break
			}
		}
	}
	if version == "" && len(crd.Spec.Versions) > 0 {
		version = crd.Spec.Versions[0].Name
	}

	// Create dynamic client
	dynamicClient, err := dynamic.NewForConfig(ws.app.config)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to create dynamic client: %v", err), http.StatusInternalServerError)
		return
	}

	gvr := schema.GroupVersionResource{
		Group:    crd.Spec.Group,
		Version:  version,
		Resource: crd.Spec.Names.Plural,
	}

	var item *unstructured.Unstructured
	if crd.Spec.Scope == apiextensionsv1.NamespaceScoped {
		if namespace == "" {
			http.Error(w, "namespace required for namespaced CRD", http.StatusBadRequest)
			return
		}
		item, err = dynamicClient.Resource(gvr).Namespace(namespace).Get(ws.app.ctx, name, metav1.GetOptions{})
	} else {
		item, err = dynamicClient.Resource(gvr).Get(ws.app.ctx, name, metav1.GetOptions{})
	}

	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to get instance: %v", err), http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(item.Object)
}

// handleCustomResourceInstanceYAML returns YAML of a custom resource instance
func (ws *WebServer) handleCustomResourceInstanceYAML(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	crdName := r.URL.Query().Get("crd")
	name := r.URL.Query().Get("name")
	namespace := r.URL.Query().Get("namespace")

	if crdName == "" || name == "" {
		http.Error(w, "crd and name parameters required", http.StatusBadRequest)
		return
	}

	if ws.app.clientset == nil {
		http.Error(w, "Not connected to cluster", http.StatusServiceUnavailable)
		return
	}

	// Create apiextensions client
	apiextensionsClient, err := apiextensionsclientset.NewForConfig(ws.app.config)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to create API extensions client: %v", err), http.StatusInternalServerError)
		return
	}

	// Get the CRD
	crd, err := apiextensionsClient.ApiextensionsV1().CustomResourceDefinitions().Get(ws.app.ctx, crdName, metav1.GetOptions{})
	if err != nil {
		http.Error(w, fmt.Sprintf("CRD not found: %v", err), http.StatusNotFound)
		return
	}

	// Get the served version
	var version string
	for _, v := range crd.Spec.Versions {
		if v.Served {
			version = v.Name
			if version == "v1" {
				break
			}
		}
	}
	if version == "" && len(crd.Spec.Versions) > 0 {
		version = crd.Spec.Versions[0].Name
	}

	// Create dynamic client
	dynamicClient, err := dynamic.NewForConfig(ws.app.config)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to create dynamic client: %v", err), http.StatusInternalServerError)
		return
	}

	gvr := schema.GroupVersionResource{
		Group:    crd.Spec.Group,
		Version:  version,
		Resource: crd.Spec.Names.Plural,
	}

	var item *unstructured.Unstructured
	if crd.Spec.Scope == apiextensionsv1.NamespaceScoped {
		if namespace == "" {
			http.Error(w, "namespace required for namespaced CRD", http.StatusBadRequest)
			return
		}
		item, err = dynamicClient.Resource(gvr).Namespace(namespace).Get(ws.app.ctx, name, metav1.GetOptions{})
	} else {
		item, err = dynamicClient.Resource(gvr).Get(ws.app.ctx, name, metav1.GetOptions{})
	}

	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to get instance: %v", err), http.StatusInternalServerError)
		return
	}

	// Get GVK from the unstructured object
	gvk := item.GroupVersionKind()
	yaml, err := toKubectlYAML(item, gvk)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "text/yaml")
	w.Write([]byte(yaml))
}

// handleCustomResourceInstanceUpdate updates a custom resource instance from YAML
func (ws *WebServer) handleCustomResourceInstanceUpdate(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	crdName := r.URL.Query().Get("crd")
	name := r.URL.Query().Get("name")
	namespace := r.URL.Query().Get("namespace")

	if crdName == "" || name == "" {
		http.Error(w, "crd and name parameters required", http.StatusBadRequest)
		return
	}

	if ws.app.clientset == nil {
		http.Error(w, "Not connected to cluster", http.StatusServiceUnavailable)
		return
	}

	// Create apiextensions client
	apiextensionsClient, err := apiextensionsclientset.NewForConfig(ws.app.config)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to create API extensions client: %v", err), http.StatusInternalServerError)
		return
	}

	// Get the CRD
	crd, err := apiextensionsClient.ApiextensionsV1().CustomResourceDefinitions().Get(ws.app.ctx, crdName, metav1.GetOptions{})
	if err != nil {
		http.Error(w, fmt.Sprintf("CRD not found: %v", err), http.StatusNotFound)
		return
	}

	// Get the served version
	var version string
	for _, v := range crd.Spec.Versions {
		if v.Served {
			version = v.Name
			if version == "v1" {
				break
			}
		}
	}
	if version == "" && len(crd.Spec.Versions) > 0 {
		version = crd.Spec.Versions[0].Name
	}

	// Create dynamic client
	dynamicClient, err := dynamic.NewForConfig(ws.app.config)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to create dynamic client: %v", err), http.StatusInternalServerError)
		return
	}

	gvr := schema.GroupVersionResource{
		Group:    crd.Spec.Group,
		Version:  version,
		Resource: crd.Spec.Names.Plural,
	}

	// Read YAML body
	body, err := io.ReadAll(r.Body)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to read body: %v", err), http.StatusBadRequest)
		return
	}
	defer r.Body.Close()

	// Unmarshal YAML to unstructured
	var obj unstructured.Unstructured
	if err := yaml.Unmarshal(body, &obj.Object); err != nil {
		http.Error(w, fmt.Sprintf("Failed to unmarshal YAML: %v", err), http.StatusBadRequest)
		return
	}

	// Update the resource
	var updated *unstructured.Unstructured
	if crd.Spec.Scope == apiextensionsv1.NamespaceScoped {
		if namespace == "" {
			http.Error(w, "namespace required for namespaced CRD", http.StatusBadRequest)
			return
		}
		updated, err = dynamicClient.Resource(gvr).Namespace(namespace).Update(ws.app.ctx, &obj, metav1.UpdateOptions{})
	} else {
		updated, err = dynamicClient.Resource(gvr).Update(ws.app.ctx, &obj, metav1.UpdateOptions{})
	}

	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to update instance: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{"success": true, "name": updated.GetName()})
}

// handleCustomResourceInstanceDelete deletes a custom resource instance
func (ws *WebServer) handleCustomResourceInstanceDelete(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	crdName := r.URL.Query().Get("crd")
	name := r.URL.Query().Get("name")
	namespace := r.URL.Query().Get("namespace")

	if crdName == "" || name == "" {
		json.NewEncoder(w).Encode(map[string]interface{}{"success": false, "error": "crd and name parameters required"})
		return
	}

	if ws.app.clientset == nil {
		json.NewEncoder(w).Encode(map[string]interface{}{"success": false, "error": "Not connected to cluster"})
		return
	}

	// Create apiextensions client
	apiextensionsClient, err := apiextensionsclientset.NewForConfig(ws.app.config)
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{"success": false, "error": fmt.Sprintf("Failed to create API extensions client: %v", err)})
		return
	}

	// Get the CRD
	crd, err := apiextensionsClient.ApiextensionsV1().CustomResourceDefinitions().Get(ws.app.ctx, crdName, metav1.GetOptions{})
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{"success": false, "error": fmt.Sprintf("CRD not found: %v", err)})
		return
	}

	// Get the served version
	var version string
	for _, v := range crd.Spec.Versions {
		if v.Served {
			version = v.Name
			if version == "v1" {
				break
			}
		}
	}
	if version == "" && len(crd.Spec.Versions) > 0 {
		version = crd.Spec.Versions[0].Name
	}

	// Create dynamic client
	dynamicClient, err := dynamic.NewForConfig(ws.app.config)
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{"success": false, "error": fmt.Sprintf("Failed to create dynamic client: %v", err)})
		return
	}

	gvr := schema.GroupVersionResource{
		Group:    crd.Spec.Group,
		Version:  version,
		Resource: crd.Spec.Names.Plural,
	}

	// Delete the resource
	if crd.Spec.Scope == apiextensionsv1.NamespaceScoped {
		if namespace == "" {
			json.NewEncoder(w).Encode(map[string]interface{}{"success": false, "error": "namespace required for namespaced CRD"})
			return
		}
		err = dynamicClient.Resource(gvr).Namespace(namespace).Delete(ws.app.ctx, name, metav1.DeleteOptions{})
	} else {
		err = dynamicClient.Resource(gvr).Delete(ws.app.ctx, name, metav1.DeleteOptions{})
	}

	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{"success": false, "error": err.Error()})
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{"success": true})
}

// handleOtherResources returns Kubernetes resources not already in the sidebar
func (ws *WebServer) handleOtherResources(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	w.Header().Set("Content-Type", "application/json")

	if ws.app.clientset == nil {
		json.NewEncoder(w).Encode([]map[string]interface{}{})
		return
	}

	// List of standard resources that are already in the sidebar
	excludedKinds := map[string]bool{
		"Pod": true, "Deployment": true, "StatefulSet": true, "DaemonSet": true,
		"Job": true, "CronJob": true, "Service": true, "Ingress": true,
		"ConfigMap": true, "Secret": true, "Node": true, "Namespace": true,
		"PersistentVolume": true, "PersistentVolumeClaim": true,
		"StorageClass": true, "Role": true, "ClusterRole": true,
		"RoleBinding": true, "ClusterRoleBinding": true, "ServiceAccount": true,
		"NetworkPolicy": true, "HorizontalPodAutoscaler": true,
		"PodDisruptionBudget": true,
	}

	// Use discovery client to find all API resources
	discoveryClient := ws.app.clientset.Discovery()
	apiResourceLists, err := discoveryClient.ServerPreferredResources()
	if err != nil {
		// Continue even if discovery fails
		json.NewEncoder(w).Encode([]map[string]interface{}{})
		return
	}

	result := make([]map[string]interface{}, 0)
	seen := make(map[string]bool)

	for _, apiResourceList := range apiResourceLists {
		// Skip subresources (contain "/")
		if strings.Contains(apiResourceList.GroupVersion, "/") {
			continue
		}

		for _, resource := range apiResourceList.APIResources {
			// Skip subresources
			if strings.Contains(resource.Name, "/") {
				continue
			}

			// Skip excluded kinds
			if excludedKinds[resource.Kind] {
				continue
			}

			// Skip CRDs (handled separately)
			if strings.Contains(apiResourceList.GroupVersion, "apiextensions.k8s.io") {
				continue
			}

			key := fmt.Sprintf("%s/%s", resource.Kind, apiResourceList.GroupVersion)
			if seen[key] {
				continue
			}
			seen[key] = true

			// Try to get count
			count := 0
			namespaces := []string{}
			
			// Parse group and version
			parts := strings.Split(apiResourceList.GroupVersion, "/")
			var group, version string
			if len(parts) == 2 {
				group = parts[0]
				version = parts[1]
			} else {
				version = parts[0]
			}

			// Try to list resources (may fail if no permissions)
			if resource.Namespaced {
				// For namespaced resources, try to list from all namespaces
				// This is a simplified approach - in production, you'd want to use dynamic client
				namespaces = []string{"all"}
			}

			result = append(result, map[string]interface{}{
				"kind":       resource.Kind,
				"group":      group,
				"version":    version,
				"namespaced": resource.Namespaced,
				"count":      count,
				"namespaces": namespaces,
			})
		}
	}

	// Sort by kind
	sort.Slice(result, func(i, j int) bool {
		kindI := result[i]["kind"].(string)
		kindJ := result[j]["kind"].(string)
		return kindI < kindJ
	})

	json.NewEncoder(w).Encode(result)
}

// RegisterCustomResourcesHandlers registers custom resources API handlers
func (ws *WebServer) RegisterCustomResourcesHandlers() {
	// Custom Resource Definitions
	http.HandleFunc("/api/crds", ws.handleCustomResourceDefinitions)
	http.HandleFunc("/api/crd/instances", ws.handleCustomResourceInstances)
	http.HandleFunc("/api/crd/instance/details", ws.handleCustomResourceInstanceDetails)
	http.HandleFunc("/api/crd/instance/yaml", ws.handleCustomResourceInstanceYAML)
	http.HandleFunc("/api/crd/instance/update", ws.handleCustomResourceInstanceUpdate)
	http.HandleFunc("/api/crd/instance/delete", ws.handleCustomResourceInstanceDelete)

	// Other Kubernetes resources not in sidebar
	http.HandleFunc("/api/resources/other", ws.handleOtherResources)
}

