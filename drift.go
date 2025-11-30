// Copyright 2025 KubeGraf Contributors
// SPDX-License-Identifier: Apache-2.0

package main

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/client-go/dynamic"
)

// DriftStatus represents the drift state of a resource
type DriftStatus string

const (
	DriftStatusSynced  DriftStatus = "synced"
	DriftStatusDrifted DriftStatus = "drifted"
	DriftStatusMissing DriftStatus = "missing"
	DriftStatusUnknown DriftStatus = "unknown"
)

// DriftResult represents the drift detection result for a resource
type DriftResult struct {
	Resource     string            `json:"resource"`
	Namespace    string            `json:"namespace"`
	Kind         string            `json:"kind"`
	Status       DriftStatus       `json:"status"`
	Differences  []DriftDifference `json:"differences,omitempty"`
	LastApplied  string            `json:"lastApplied,omitempty"`
	LastModified string            `json:"lastModified,omitempty"`
	ModifiedBy   string            `json:"modifiedBy,omitempty"`
	GitOpsSource string            `json:"gitOpsSource,omitempty"`
	GitOpsSynced bool              `json:"gitOpsSynced,omitempty"`
}

// DriftDifference represents a specific field difference
type DriftDifference struct {
	Path     string `json:"path"`
	Expected string `json:"expected"`
	Actual   string `json:"actual"`
}

// DriftDetector detects configuration drift in Kubernetes resources
type DriftDetector struct {
	app           *App
	dynamicClient dynamic.Interface
}

// NewDriftDetector creates a new drift detector
func NewDriftDetector(app *App) (*DriftDetector, error) {
	dynamicClient, err := dynamic.NewForConfig(app.config)
	if err != nil {
		return nil, fmt.Errorf("failed to create dynamic client: %w", err)
	}

	return &DriftDetector{
		app:           app,
		dynamicClient: dynamicClient,
	}, nil
}

// DetectDrift checks a single resource for drift
func (d *DriftDetector) DetectDrift(ctx context.Context, namespace, kind, name string) (*DriftResult, error) {
	result := &DriftResult{
		Resource:  name,
		Namespace: namespace,
		Kind:      kind,
		Status:    DriftStatusUnknown,
	}

	// Get the resource
	gvr := d.getGVR(kind)
	if gvr == nil {
		return result, fmt.Errorf("unknown resource kind: %s", kind)
	}

	var resource *unstructured.Unstructured
	var err error

	if namespace != "" {
		resource, err = d.dynamicClient.Resource(*gvr).Namespace(namespace).Get(ctx, name, metav1.GetOptions{})
	} else {
		resource, err = d.dynamicClient.Resource(*gvr).Get(ctx, name, metav1.GetOptions{})
	}

	if err != nil {
		result.Status = DriftStatusMissing
		return result, nil
	}

	// Check for last-applied-configuration annotation
	annotations := resource.GetAnnotations()
	if annotations == nil {
		result.Status = DriftStatusUnknown
		result.LastApplied = "No last-applied-configuration found"
		return result, nil
	}

	lastAppliedConfig := annotations["kubectl.kubernetes.io/last-applied-configuration"]
	if lastAppliedConfig == "" {
		result.Status = DriftStatusUnknown
		result.LastApplied = "No last-applied-configuration annotation"
		return result, nil
	}

	result.LastApplied = "Present"

	// Parse the last-applied configuration
	var lastApplied map[string]interface{}
	if err := json.Unmarshal([]byte(lastAppliedConfig), &lastApplied); err != nil {
		return result, fmt.Errorf("failed to parse last-applied-configuration: %w", err)
	}

	// Compare spec sections
	differences := d.compareSpecs(lastApplied, resource.Object)
	result.Differences = differences

	if len(differences) > 0 {
		result.Status = DriftStatusDrifted
	} else {
		result.Status = DriftStatusSynced
	}

	// Check for GitOps annotations (ArgoCD, Flux)
	d.checkGitOpsStatus(result, annotations)

	// Check last modifier
	managedFields := resource.GetManagedFields()
	if len(managedFields) > 0 {
		lastField := managedFields[len(managedFields)-1]
		result.ModifiedBy = lastField.Manager
		result.LastModified = lastField.Time.String()
	}

	return result, nil
}

// DetectNamespaceDrift checks all resources in a namespace for drift
func (d *DriftDetector) DetectNamespaceDrift(ctx context.Context, namespace string) ([]DriftResult, error) {
	var results []DriftResult

	// Check common resource types
	resourceTypes := []struct {
		kind string
		list func() ([]string, error)
	}{
		{"Deployment", func() ([]string, error) {
			deploys, err := d.app.clientset.AppsV1().Deployments(namespace).List(ctx, metav1.ListOptions{})
			if err != nil {
				return nil, err
			}
			var names []string
			for _, d := range deploys.Items {
				names = append(names, d.Name)
			}
			return names, nil
		}},
		{"Service", func() ([]string, error) {
			svcs, err := d.app.clientset.CoreV1().Services(namespace).List(ctx, metav1.ListOptions{})
			if err != nil {
				return nil, err
			}
			var names []string
			for _, s := range svcs.Items {
				names = append(names, s.Name)
			}
			return names, nil
		}},
		{"ConfigMap", func() ([]string, error) {
			cms, err := d.app.clientset.CoreV1().ConfigMaps(namespace).List(ctx, metav1.ListOptions{})
			if err != nil {
				return nil, err
			}
			var names []string
			for _, c := range cms.Items {
				names = append(names, c.Name)
			}
			return names, nil
		}},
		{"StatefulSet", func() ([]string, error) {
			sts, err := d.app.clientset.AppsV1().StatefulSets(namespace).List(ctx, metav1.ListOptions{})
			if err != nil {
				return nil, err
			}
			var names []string
			for _, s := range sts.Items {
				names = append(names, s.Name)
			}
			return names, nil
		}},
		{"DaemonSet", func() ([]string, error) {
			ds, err := d.app.clientset.AppsV1().DaemonSets(namespace).List(ctx, metav1.ListOptions{})
			if err != nil {
				return nil, err
			}
			var names []string
			for _, d := range ds.Items {
				names = append(names, d.Name)
			}
			return names, nil
		}},
	}

	for _, rt := range resourceTypes {
		names, err := rt.list()
		if err != nil {
			continue
		}
		for _, name := range names {
			result, err := d.DetectDrift(ctx, namespace, rt.kind, name)
			if err != nil {
				continue
			}
			results = append(results, *result)
		}
	}

	return results, nil
}

// GetDriftSummary returns a summary of drift status across the namespace
func (d *DriftDetector) GetDriftSummary(ctx context.Context, namespace string) (*DriftSummary, error) {
	results, err := d.DetectNamespaceDrift(ctx, namespace)
	if err != nil {
		return nil, err
	}

	summary := &DriftSummary{
		Namespace: namespace,
		Total:     len(results),
	}

	for _, r := range results {
		switch r.Status {
		case DriftStatusSynced:
			summary.Synced++
		case DriftStatusDrifted:
			summary.Drifted++
			summary.DriftedResources = append(summary.DriftedResources, r)
		case DriftStatusMissing:
			summary.Missing++
		case DriftStatusUnknown:
			summary.Unknown++
		}
	}

	return summary, nil
}

// DriftSummary provides an overview of drift status
type DriftSummary struct {
	Namespace        string        `json:"namespace"`
	Total            int           `json:"total"`
	Synced           int           `json:"synced"`
	Drifted          int           `json:"drifted"`
	Missing          int           `json:"missing"`
	Unknown          int           `json:"unknown"`
	DriftedResources []DriftResult `json:"driftedResources"`
}

// compareSpecs compares the spec sections of two resources
func (d *DriftDetector) compareSpecs(expected, actual map[string]interface{}) []DriftDifference {
	var differences []DriftDifference

	expectedSpec, ok1 := expected["spec"].(map[string]interface{})
	actualSpec, ok2 := actual["spec"].(map[string]interface{})

	if !ok1 || !ok2 {
		return differences
	}

	// Compare key fields
	differences = append(differences, d.compareObjects("spec", expectedSpec, actualSpec)...)

	return differences
}

// compareObjects recursively compares two objects
func (d *DriftDetector) compareObjects(path string, expected, actual map[string]interface{}) []DriftDifference {
	var differences []DriftDifference

	// Fields to ignore during comparison
	ignoreFields := map[string]bool{
		"resourceVersion":   true,
		"uid":               true,
		"creationTimestamp": true,
		"generation":        true,
		"managedFields":     true,
		"selfLink":          true,
		"status":            true,
		"kubectl.kubernetes.io/last-applied-configuration": true,
	}

	for key, expectedVal := range expected {
		if ignoreFields[key] {
			continue
		}

		fullPath := path + "." + key
		actualVal, exists := actual[key]

		if !exists {
			differences = append(differences, DriftDifference{
				Path:     fullPath,
				Expected: fmt.Sprintf("%v", expectedVal),
				Actual:   "<missing>",
			})
			continue
		}

		// Handle nested objects
		if expectedMap, ok := expectedVal.(map[string]interface{}); ok {
			if actualMap, ok := actualVal.(map[string]interface{}); ok {
				differences = append(differences, d.compareObjects(fullPath, expectedMap, actualMap)...)
			} else {
				differences = append(differences, DriftDifference{
					Path:     fullPath,
					Expected: fmt.Sprintf("%v", expectedVal),
					Actual:   fmt.Sprintf("%v", actualVal),
				})
			}
			continue
		}

		// Handle slices
		if expectedSlice, ok := expectedVal.([]interface{}); ok {
			if actualSlice, ok := actualVal.([]interface{}); ok {
				if !d.compareSlices(expectedSlice, actualSlice) {
					differences = append(differences, DriftDifference{
						Path:     fullPath,
						Expected: fmt.Sprintf("%v", expectedVal),
						Actual:   fmt.Sprintf("%v", actualVal),
					})
				}
			} else {
				differences = append(differences, DriftDifference{
					Path:     fullPath,
					Expected: fmt.Sprintf("%v", expectedVal),
					Actual:   fmt.Sprintf("%v", actualVal),
				})
			}
			continue
		}

		// Compare primitive values
		if fmt.Sprintf("%v", expectedVal) != fmt.Sprintf("%v", actualVal) {
			differences = append(differences, DriftDifference{
				Path:     fullPath,
				Expected: fmt.Sprintf("%v", expectedVal),
				Actual:   fmt.Sprintf("%v", actualVal),
			})
		}
	}

	return differences
}

// compareSlices compares two slices for equality
func (d *DriftDetector) compareSlices(expected, actual []interface{}) bool {
	if len(expected) != len(actual) {
		return false
	}

	for i := range expected {
		if fmt.Sprintf("%v", expected[i]) != fmt.Sprintf("%v", actual[i]) {
			return false
		}
	}

	return true
}

// checkGitOpsStatus checks for ArgoCD/Flux annotations
func (d *DriftDetector) checkGitOpsStatus(result *DriftResult, annotations map[string]string) {
	// Check ArgoCD
	if source := annotations["argocd.argoproj.io/tracking-id"]; source != "" {
		result.GitOpsSource = "ArgoCD"
		result.GitOpsSynced = annotations["argocd.argoproj.io/sync-status"] == "Synced"
	}

	// Check Flux
	if source := annotations["fluxcd.io/sync-checksum"]; source != "" {
		result.GitOpsSource = "Flux"
		result.GitOpsSynced = true // Flux doesn't have explicit sync status annotation
	}

	// Check Flux v2
	if source := annotations["kustomize.toolkit.fluxcd.io/checksum"]; source != "" {
		result.GitOpsSource = "Flux v2"
		result.GitOpsSynced = true
	}
}

// getGVR returns the GroupVersionResource for a given kind
func (d *DriftDetector) getGVR(kind string) *schema.GroupVersionResource {
	gvrMap := map[string]schema.GroupVersionResource{
		"Deployment":  {Group: "apps", Version: "v1", Resource: "deployments"},
		"StatefulSet": {Group: "apps", Version: "v1", Resource: "statefulsets"},
		"DaemonSet":   {Group: "apps", Version: "v1", Resource: "daemonsets"},
		"ReplicaSet":  {Group: "apps", Version: "v1", Resource: "replicasets"},
		"Service":     {Group: "", Version: "v1", Resource: "services"},
		"ConfigMap":   {Group: "", Version: "v1", Resource: "configmaps"},
		"Secret":      {Group: "", Version: "v1", Resource: "secrets"},
		"Ingress":     {Group: "networking.k8s.io", Version: "v1", Resource: "ingresses"},
		"Job":         {Group: "batch", Version: "v1", Resource: "jobs"},
		"CronJob":     {Group: "batch", Version: "v1", Resource: "cronjobs"},
	}

	if gvr, ok := gvrMap[kind]; ok {
		return &gvr
	}
	return nil
}

// RevertToGit reverts a resource to its last-applied configuration
func (d *DriftDetector) RevertToGit(ctx context.Context, namespace, kind, name string) error {
	gvr := d.getGVR(kind)
	if gvr == nil {
		return fmt.Errorf("unknown resource kind: %s", kind)
	}

	var resource *unstructured.Unstructured
	var err error

	if namespace != "" {
		resource, err = d.dynamicClient.Resource(*gvr).Namespace(namespace).Get(ctx, name, metav1.GetOptions{})
	} else {
		resource, err = d.dynamicClient.Resource(*gvr).Get(ctx, name, metav1.GetOptions{})
	}

	if err != nil {
		return fmt.Errorf("failed to get resource: %w", err)
	}

	annotations := resource.GetAnnotations()
	lastAppliedConfig := annotations["kubectl.kubernetes.io/last-applied-configuration"]
	if lastAppliedConfig == "" {
		return fmt.Errorf("no last-applied-configuration found")
	}

	// Parse and apply the last configuration
	var lastApplied unstructured.Unstructured
	if err := json.Unmarshal([]byte(lastAppliedConfig), &lastApplied.Object); err != nil {
		return fmt.Errorf("failed to parse last-applied-configuration: %w", err)
	}

	// Preserve resource version for update
	lastApplied.SetResourceVersion(resource.GetResourceVersion())

	if namespace != "" {
		_, err = d.dynamicClient.Resource(*gvr).Namespace(namespace).Update(ctx, &lastApplied, metav1.UpdateOptions{})
	} else {
		_, err = d.dynamicClient.Resource(*gvr).Update(ctx, &lastApplied, metav1.UpdateOptions{})
	}

	return err
}

// FormatDriftStatus returns a colored string representation of drift status
func FormatDriftStatus(status DriftStatus) string {
	switch status {
	case DriftStatusSynced:
		return "✓ Synced"
	case DriftStatusDrifted:
		return "⚠ Drifted"
	case DriftStatusMissing:
		return "✗ Missing"
	default:
		return "? Unknown"
	}
}

// FormatDriftDifferences formats drift differences for display
func FormatDriftDifferences(differences []DriftDifference) string {
	if len(differences) == 0 {
		return "No differences"
	}

	var sb strings.Builder
	for _, diff := range differences {
		sb.WriteString(fmt.Sprintf("  %s:\n", diff.Path))
		sb.WriteString(fmt.Sprintf("    - Expected: %s\n", diff.Expected))
		sb.WriteString(fmt.Sprintf("    + Actual:   %s\n", diff.Actual))
	}
	return sb.String()
}
