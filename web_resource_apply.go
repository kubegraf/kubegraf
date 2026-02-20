// Copyright 2025 KubeGraf Contributors
// SPDX-License-Identifier: Apache-2.0

package main

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"

	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/types"
	"sigs.k8s.io/yaml"
)

// handleYAMLApply handles POST /api/v1/apply
// Accepts { yaml: string } and applies the resource to Kubernetes.
// Returns { success: bool, message: string }.
func (ws *WebServer) handleYAMLApply(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	w.Header().Set("Content-Type", "application/json")

	if ws.app.clientset == nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"message": "Not connected to a Kubernetes cluster",
		})
		return
	}

	var req struct {
		YAML      string `json:"yaml"`
		Kind      string `json:"kind"`
		Name      string `json:"name"`
		Namespace string `json:"namespace"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	yamlStr := strings.TrimSpace(req.YAML)
	if yamlStr == "" {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"message": "YAML content is empty",
		})
		return
	}

	// Convert YAML to JSON for server-side apply patch
	jsonData, err := yaml.YAMLToJSON([]byte(yamlStr))
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"message": fmt.Sprintf("Invalid YAML: %v", err),
		})
		return
	}

	// Extract kind from YAML if not provided
	kind := req.Kind
	if kind == "" {
		var meta struct {
			Kind     string `json:"kind"`
			Metadata struct {
				Name      string `json:"name"`
				Namespace string `json:"namespace"`
			} `json:"metadata"`
		}
		if jerr := json.Unmarshal(jsonData, &meta); jerr == nil {
			kind = meta.Kind
			if req.Namespace == "" {
				req.Namespace = meta.Metadata.Namespace
			}
			if req.Name == "" {
				req.Name = meta.Metadata.Name
			}
		}
	}

	ns := req.Namespace
	if ns == "" {
		ns = "default"
	}
	name := req.Name

	ctx := context.Background()

	// Apply via server-side apply (SSA) using Strategic Merge Patch where SSA isn't available,
	// falling back to typed client update. SSA is the recommended approach for YAML apply.
	patchOpts := metav1.PatchOptions{
		FieldManager: "kubegraf",
		Force:        func() *bool { b := true; return &b }(),
	}

	var resultMsg string
	var applyErr error

	switch strings.ToLower(kind) {
	case "deployment":
		var dep appsv1.Deployment
		if err := yaml.Unmarshal([]byte(yamlStr), &dep); err != nil {
			json.NewEncoder(w).Encode(map[string]interface{}{"success": false, "message": fmt.Sprintf("Parse error: %v", err)})
			return
		}
		if dep.Namespace == "" {
			dep.Namespace = ns
		}
		if dep.Name == "" {
			dep.Name = name
		}
		_, applyErr = ws.app.clientset.AppsV1().Deployments(dep.Namespace).Patch(
			ctx, dep.Name, types.ApplyPatchType, jsonData, patchOpts,
		)
		resultMsg = fmt.Sprintf("deployment.apps/%s applied", dep.Name)

	case "statefulset":
		var sts appsv1.StatefulSet
		if err := yaml.Unmarshal([]byte(yamlStr), &sts); err != nil {
			json.NewEncoder(w).Encode(map[string]interface{}{"success": false, "message": fmt.Sprintf("Parse error: %v", err)})
			return
		}
		if sts.Namespace == "" {
			sts.Namespace = ns
		}
		if sts.Name == "" {
			sts.Name = name
		}
		_, applyErr = ws.app.clientset.AppsV1().StatefulSets(sts.Namespace).Patch(
			ctx, sts.Name, types.ApplyPatchType, jsonData, patchOpts,
		)
		resultMsg = fmt.Sprintf("statefulset.apps/%s applied", sts.Name)

	case "daemonset":
		var ds appsv1.DaemonSet
		if err := yaml.Unmarshal([]byte(yamlStr), &ds); err != nil {
			json.NewEncoder(w).Encode(map[string]interface{}{"success": false, "message": fmt.Sprintf("Parse error: %v", err)})
			return
		}
		if ds.Namespace == "" {
			ds.Namespace = ns
		}
		if ds.Name == "" {
			ds.Name = name
		}
		_, applyErr = ws.app.clientset.AppsV1().DaemonSets(ds.Namespace).Patch(
			ctx, ds.Name, types.ApplyPatchType, jsonData, patchOpts,
		)
		resultMsg = fmt.Sprintf("daemonset.apps/%s applied", ds.Name)

	case "configmap":
		var cm corev1.ConfigMap
		if err := yaml.Unmarshal([]byte(yamlStr), &cm); err != nil {
			json.NewEncoder(w).Encode(map[string]interface{}{"success": false, "message": fmt.Sprintf("Parse error: %v", err)})
			return
		}
		if cm.Namespace == "" {
			cm.Namespace = ns
		}
		if cm.Name == "" {
			cm.Name = name
		}
		_, applyErr = ws.app.clientset.CoreV1().ConfigMaps(cm.Namespace).Patch(
			ctx, cm.Name, types.ApplyPatchType, jsonData, patchOpts,
		)
		resultMsg = fmt.Sprintf("configmap/%s applied", cm.Name)

	case "pod":
		// Pods are typically not applied directly, but handle for completeness
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"message": "Direct Pod apply is not supported. Apply via a Deployment or StatefulSet instead.",
		})
		return

	default:
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"message": fmt.Sprintf("Unsupported resource kind '%s'. Supported: Deployment, StatefulSet, DaemonSet, ConfigMap", kind),
		})
		return
	}

	if applyErr != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"message": fmt.Sprintf("Apply failed: %v", applyErr),
		})
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": resultMsg,
	})
}
