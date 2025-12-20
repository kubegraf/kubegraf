package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	autoscalingv1 "k8s.io/api/autoscaling/v1"
	autoscalingv2 "k8s.io/api/autoscaling/v2"
	policyv1 "k8s.io/api/policy/v1"
	policyv1beta1 "k8s.io/api/policy/v1beta1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"sigs.k8s.io/yaml"
)

// handlePDBs returns Pod Disruption Budget list
func (ws *WebServer) handlePDBs(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if ws.app.clientset == nil {
		http.Error(w, "Kubernetes client not initialized. Please connect to a cluster first.", http.StatusServiceUnavailable)
		return
	}

	namespace := r.URL.Query().Get("namespace")
	if !r.URL.Query().Has("namespace") {
		namespace = ws.app.namespace
	}
	if namespace == "" || namespace == "All Namespaces" || namespace == "_all" {
		namespace = ""
	}

	// PDB is in policy/v1 API group
	pdbs, err := ws.app.clientset.PolicyV1().PodDisruptionBudgets(namespace).List(ws.app.ctx, metav1.ListOptions{})
	if err != nil {
		// Try v1beta1 if v1 is not available
		pdbsV1Beta1, errV1Beta1 := ws.app.clientset.PolicyV1beta1().PodDisruptionBudgets(namespace).List(ws.app.ctx, metav1.ListOptions{})
		if errV1Beta1 != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		pdbList := []map[string]interface{}{}
		for _, pdb := range pdbsV1Beta1.Items {
			minAvailable := ""
			maxUnavailable := ""
			if pdb.Spec.MinAvailable != nil {
				minAvailable = pdb.Spec.MinAvailable.String()
			}
			if pdb.Spec.MaxUnavailable != nil {
				maxUnavailable = pdb.Spec.MaxUnavailable.String()
			}

			allowedDisruptions := int32(0)
			if pdb.Status.DisruptionsAllowed > 0 {
				allowedDisruptions = pdb.Status.DisruptionsAllowed
			}

			pdbList = append(pdbList, map[string]interface{}{
				"name":               pdb.Name,
				"namespace":          pdb.Namespace,
				"minAvailable":       minAvailable,
				"maxUnavailable":     maxUnavailable,
				"allowedDisruptions": allowedDisruptions,
				"currentHealthy":     pdb.Status.CurrentHealthy,
				"desiredHealthy":     pdb.Status.DesiredHealthy,
				"age":                formatAge(time.Since(pdb.CreationTimestamp.Time)),
			})
		}
		json.NewEncoder(w).Encode(pdbList)
		return
	}

	pdbList := []map[string]interface{}{}
	for _, pdb := range pdbs.Items {
		minAvailable := ""
		maxUnavailable := ""
		if pdb.Spec.MinAvailable != nil {
			minAvailable = pdb.Spec.MinAvailable.String()
		}
		if pdb.Spec.MaxUnavailable != nil {
			maxUnavailable = pdb.Spec.MaxUnavailable.String()
		}

		allowedDisruptions := int32(0)
		if pdb.Status.DisruptionsAllowed > 0 {
			allowedDisruptions = pdb.Status.DisruptionsAllowed
		}

		pdbList = append(pdbList, map[string]interface{}{
			"name":               pdb.Name,
			"namespace":          pdb.Namespace,
			"minAvailable":       minAvailable,
			"maxUnavailable":     maxUnavailable,
			"allowedDisruptions": allowedDisruptions,
			"currentHealthy":     pdb.Status.CurrentHealthy,
			"desiredHealthy":     pdb.Status.DesiredHealthy,
			"age":                formatAge(time.Since(pdb.CreationTimestamp.Time)),
		})
	}

	json.NewEncoder(w).Encode(pdbList)
}

// handleHPAs returns Horizontal Pod Autoscaler list
func (ws *WebServer) handleHPAs(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if ws.app.clientset == nil {
		http.Error(w, "Kubernetes client not initialized. Please connect to a cluster first.", http.StatusServiceUnavailable)
		return
	}

	namespace := r.URL.Query().Get("namespace")
	if !r.URL.Query().Has("namespace") {
		namespace = ws.app.namespace
	}
	if namespace == "" || namespace == "All Namespaces" || namespace == "_all" {
		namespace = ""
	}

	// HPA is in autoscaling/v2 API group
	hpas, err := ws.app.clientset.AutoscalingV2().HorizontalPodAutoscalers(namespace).List(ws.app.ctx, metav1.ListOptions{})
	if err != nil {
		// Try v1 if v2 is not available
		hpasV1, errV1 := ws.app.clientset.AutoscalingV1().HorizontalPodAutoscalers(namespace).List(ws.app.ctx, metav1.ListOptions{})
		if errV1 != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		hpaList := []map[string]interface{}{}
		for _, hpa := range hpasV1.Items {
			targetRef := fmt.Sprintf("%s/%s", hpa.Spec.ScaleTargetRef.Kind, hpa.Spec.ScaleTargetRef.Name)
			minReplicas := int32(1)
			if hpa.Spec.MinReplicas != nil {
				minReplicas = *hpa.Spec.MinReplicas
			}
			maxReplicas := hpa.Spec.MaxReplicas

			hpaList = append(hpaList, map[string]interface{}{
				"name":            hpa.Name,
				"namespace":       hpa.Namespace,
				"targetRef":       targetRef,
				"minReplicas":     minReplicas,
				"maxReplicas":     maxReplicas,
				"currentReplicas": hpa.Status.CurrentReplicas,
				"desiredReplicas": hpa.Status.DesiredReplicas,
				"age":             formatAge(time.Since(hpa.CreationTimestamp.Time)),
			})
		}
		json.NewEncoder(w).Encode(hpaList)
		return
	}

	hpaList := []map[string]interface{}{}
	for _, hpa := range hpas.Items {
		targetRef := fmt.Sprintf("%s/%s", hpa.Spec.ScaleTargetRef.Kind, hpa.Spec.ScaleTargetRef.Name)
		minReplicas := int32(1)
		if hpa.Spec.MinReplicas != nil {
			minReplicas = *hpa.Spec.MinReplicas
		}
		maxReplicas := hpa.Spec.MaxReplicas

		// Extract CPU and memory metrics
		var cpuUtilization *int32
		var memoryUtilization *int32
		for _, metric := range hpa.Status.CurrentMetrics {
			if metric.Type == "Resource" && metric.Resource != nil {
				if metric.Resource.Name == "cpu" && metric.Resource.Current.AverageUtilization != nil {
					val := *metric.Resource.Current.AverageUtilization
					cpuUtilization = &val
				}
				if metric.Resource.Name == "memory" && metric.Resource.Current.AverageUtilization != nil {
					val := *metric.Resource.Current.AverageUtilization
					memoryUtilization = &val
				}
			}
		}

		hpaData := map[string]interface{}{
			"name":            hpa.Name,
			"namespace":       hpa.Namespace,
			"targetRef":       targetRef,
			"minReplicas":     minReplicas,
			"maxReplicas":     maxReplicas,
			"currentReplicas": hpa.Status.CurrentReplicas,
			"desiredReplicas": hpa.Status.DesiredReplicas,
			"age":             formatAge(time.Since(hpa.CreationTimestamp.Time)),
		}

		if cpuUtilization != nil {
			hpaData["cpuUtilization"] = *cpuUtilization
		}
		if memoryUtilization != nil {
			hpaData["memoryUtilization"] = *memoryUtilization
		}

		hpaList = append(hpaList, hpaData)
	}

	json.NewEncoder(w).Encode(hpaList)
}

// handlePDBDetails returns detailed information about a PDB
func (ws *WebServer) handlePDBDetails(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	name := r.URL.Query().Get("name")
	namespace := r.URL.Query().Get("namespace")
	if name == "" {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "PDB name is required",
		})
		return
	}
	if namespace == "" {
		namespace = ws.app.namespace
	}

	// Try v1 first
	pdb, err := ws.app.clientset.PolicyV1().PodDisruptionBudgets(namespace).Get(ws.app.ctx, name, metav1.GetOptions{})
	if err != nil {
		// Try v1beta1
		pdbV1Beta1, errV1Beta1 := ws.app.clientset.PolicyV1beta1().PodDisruptionBudgets(namespace).Get(ws.app.ctx, name, metav1.GetOptions{})
		if errV1Beta1 != nil {
			json.NewEncoder(w).Encode(map[string]interface{}{
				"success": false,
				"error":   err.Error(),
			})
			return
		}

		// Handle v1beta1
		minAvailable := ""
		maxUnavailable := ""
		if pdbV1Beta1.Spec.MinAvailable != nil {
			minAvailable = pdbV1Beta1.Spec.MinAvailable.String()
		}
		if pdbV1Beta1.Spec.MaxUnavailable != nil {
			maxUnavailable = pdbV1Beta1.Spec.MaxUnavailable.String()
		}

		// Format selector
		selector := ""
		if pdbV1Beta1.Spec.Selector != nil {
			selector = metav1.FormatLabelSelector(pdbV1Beta1.Spec.Selector)
		}

		// Get Pods matching this PDB
		pods := []map[string]interface{}{}
		if selector != "" {
			if podList, err := ws.app.clientset.CoreV1().Pods(pdbV1Beta1.Namespace).List(ws.app.ctx, metav1.ListOptions{
				LabelSelector: selector,
			}); err == nil {
				for _, pod := range podList.Items {
					restarts := int32(0)
					for _, cs := range pod.Status.ContainerStatuses {
						restarts += cs.RestartCount
					}
					for _, ics := range pod.Status.InitContainerStatuses {
						restarts += ics.RestartCount
					}
					
					pods = append(pods, map[string]interface{}{
						"name":      pod.Name,
						"status":    string(pod.Status.Phase),
						"ready":     fmt.Sprintf("%d/%d", len(pod.Status.ContainerStatuses), len(pod.Spec.Containers)),
						"restarts":  restarts,
						"age":       formatAge(time.Since(pod.CreationTimestamp.Time)),
						"ip":        pod.Status.PodIP,
						"node":      pod.Spec.NodeName,
					})
				}
			}
		}

		json.NewEncoder(w).Encode(map[string]interface{}{
			"success":           true,
			"name":              pdbV1Beta1.Name,
			"namespace":         pdbV1Beta1.Namespace,
			"minAvailable":      minAvailable,
			"maxUnavailable":    maxUnavailable,
			"allowedDisruptions": pdbV1Beta1.Status.DisruptionsAllowed,
			"currentHealthy":    pdbV1Beta1.Status.CurrentHealthy,
			"desiredHealthy":     pdbV1Beta1.Status.DesiredHealthy,
			"selector":          selector,
			"labels":            pdbV1Beta1.Labels,
			"annotations":       pdbV1Beta1.Annotations,
			"age":               formatAge(time.Since(pdbV1Beta1.CreationTimestamp.Time)),
			"createdAt":         pdbV1Beta1.CreationTimestamp.Format(time.RFC3339),
			"pods":               pods,
		})
		return
	}

	// Handle v1
	minAvailable := ""
	maxUnavailable := ""
	if pdb.Spec.MinAvailable != nil {
		minAvailable = pdb.Spec.MinAvailable.String()
	}
	if pdb.Spec.MaxUnavailable != nil {
		maxUnavailable = pdb.Spec.MaxUnavailable.String()
	}

	// Format selector
	selector := ""
	if pdb.Spec.Selector != nil {
		selector = metav1.FormatLabelSelector(pdb.Spec.Selector)
	}

	// Get Pods matching this PDB
	pods := []map[string]interface{}{}
	if selector != "" {
		if podList, err := ws.app.clientset.CoreV1().Pods(pdb.Namespace).List(ws.app.ctx, metav1.ListOptions{
			LabelSelector: selector,
		}); err == nil {
			for _, pod := range podList.Items {
				restarts := int32(0)
				for _, cs := range pod.Status.ContainerStatuses {
					restarts += cs.RestartCount
				}
				for _, ics := range pod.Status.InitContainerStatuses {
					restarts += ics.RestartCount
				}
				
				pods = append(pods, map[string]interface{}{
					"name":      pod.Name,
					"status":    string(pod.Status.Phase),
					"ready":     fmt.Sprintf("%d/%d", len(pod.Status.ContainerStatuses), len(pod.Spec.Containers)),
					"restarts":  restarts,
					"age":       formatAge(time.Since(pod.CreationTimestamp.Time)),
					"ip":        pod.Status.PodIP,
					"node":      pod.Spec.NodeName,
				})
			}
		}
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success":           true,
		"name":              pdb.Name,
		"namespace":         pdb.Namespace,
		"minAvailable":      minAvailable,
		"maxUnavailable":    maxUnavailable,
		"allowedDisruptions": pdb.Status.DisruptionsAllowed,
		"currentHealthy":    pdb.Status.CurrentHealthy,
		"desiredHealthy":     pdb.Status.DesiredHealthy,
		"selector":          selector,
		"labels":            pdb.Labels,
		"annotations":       pdb.Annotations,
		"age":               formatAge(time.Since(pdb.CreationTimestamp.Time)),
		"createdAt":         pdb.CreationTimestamp.Format(time.RFC3339),
		"pods":               pods,
	})
}

// handlePDBYAML returns PDB YAML
func (ws *WebServer) handlePDBYAML(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	name := r.URL.Query().Get("name")
	namespace := r.URL.Query().Get("namespace")

	if name == "" || namespace == "" {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "name and namespace are required",
		})
		return
	}

	pdb, err := ws.app.clientset.PolicyV1().PodDisruptionBudgets(namespace).Get(ws.app.ctx, name, metav1.GetOptions{})
	if err != nil {
		// Try v1beta1
		pdbV1Beta1, errV1Beta1 := ws.app.clientset.PolicyV1beta1().PodDisruptionBudgets(namespace).Get(ws.app.ctx, name, metav1.GetOptions{})
		if errV1Beta1 != nil {
			json.NewEncoder(w).Encode(map[string]interface{}{
				"success": false,
				"error":   err.Error(),
			})
			return
		}
		pdbV1Beta1.ManagedFields = nil
		yamlData, err := toKubectlYAML(pdbV1Beta1, schema.GroupVersionKind{Group: "policy", Version: "v1beta1", Kind: "PodDisruptionBudget"})
		if err != nil {
			json.NewEncoder(w).Encode(map[string]interface{}{
				"success": false,
				"error":   err.Error(),
			})
			return
		}
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": true,
			"yaml":    string(yamlData),
		})
		return
	}

	pdb.ManagedFields = nil
	yamlData, err := toKubectlYAML(pdb, schema.GroupVersionKind{Group: "policy", Version: "v1", Kind: "PodDisruptionBudget"})
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   err.Error(),
		})
		return
	}
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"yaml":    string(yamlData),
	})
}

// handleHPADetails returns detailed information about an HPA
func (ws *WebServer) handleHPADetails(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	name := r.URL.Query().Get("name")
	namespace := r.URL.Query().Get("namespace")
	if name == "" {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "HPA name is required",
		})
		return
	}
	if namespace == "" {
		namespace = ws.app.namespace
	}

	// Try v2 first
	hpa, err := ws.app.clientset.AutoscalingV2().HorizontalPodAutoscalers(namespace).Get(ws.app.ctx, name, metav1.GetOptions{})
	if err != nil {
		// Try v1
		hpaV1, errV1 := ws.app.clientset.AutoscalingV1().HorizontalPodAutoscalers(namespace).Get(ws.app.ctx, name, metav1.GetOptions{})
		if errV1 != nil {
			json.NewEncoder(w).Encode(map[string]interface{}{
				"success": false,
				"error":   err.Error(),
			})
			return
		}

		// Handle v1
		targetRef := fmt.Sprintf("%s/%s", hpaV1.Spec.ScaleTargetRef.Kind, hpaV1.Spec.ScaleTargetRef.Name)
		minReplicas := int32(1)
		if hpaV1.Spec.MinReplicas != nil {
			minReplicas = *hpaV1.Spec.MinReplicas
		}

		json.NewEncoder(w).Encode(map[string]interface{}{
			"success":          true,
			"name":             hpaV1.Name,
			"namespace":        hpaV1.Namespace,
			"targetRef":         targetRef,
			"targetKind":       hpaV1.Spec.ScaleTargetRef.Kind,
			"targetName":       hpaV1.Spec.ScaleTargetRef.Name,
			"minReplicas":      minReplicas,
			"maxReplicas":      hpaV1.Spec.MaxReplicas,
			"currentReplicas":  hpaV1.Status.CurrentReplicas,
			"desiredReplicas":  hpaV1.Status.DesiredReplicas,
			"labels":           hpaV1.Labels,
			"annotations":      hpaV1.Annotations,
			"age":              formatAge(time.Since(hpaV1.CreationTimestamp.Time)),
			"createdAt":        hpaV1.CreationTimestamp.Format(time.RFC3339),
		})
		return
	}

	// Handle v2
	targetRef := fmt.Sprintf("%s/%s", hpa.Spec.ScaleTargetRef.Kind, hpa.Spec.ScaleTargetRef.Name)
	minReplicas := int32(1)
	if hpa.Spec.MinReplicas != nil {
		minReplicas = *hpa.Spec.MinReplicas
	}

	// Extract metrics
	metrics := []map[string]interface{}{}
	for _, metric := range hpa.Spec.Metrics {
		metricData := map[string]interface{}{
			"type": string(metric.Type),
		}
		if metric.Resource != nil {
			metricData["resource"] = map[string]interface{}{
				"name": metric.Resource.Name,
			}
			if metric.Resource.Target.Type == autoscalingv2.UtilizationMetricType {
				if metric.Resource.Target.AverageUtilization != nil {
					metricData["targetUtilization"] = *metric.Resource.Target.AverageUtilization
				}
			}
		}
		metrics = append(metrics, metricData)
	}

	// Extract current metrics
	currentMetrics := []map[string]interface{}{}
	for _, metric := range hpa.Status.CurrentMetrics {
		metricData := map[string]interface{}{
			"type": string(metric.Type),
		}
		if metric.Resource != nil {
			metricData["resource"] = map[string]interface{}{
				"name": metric.Resource.Name,
			}
			if metric.Resource.Current.AverageUtilization != nil {
				metricData["currentUtilization"] = *metric.Resource.Current.AverageUtilization
			}
			if metric.Resource.Current.AverageValue != nil {
				metricData["currentValue"] = metric.Resource.Current.AverageValue.String()
			}
		}
		currentMetrics = append(currentMetrics, metricData)
	}

	// Format conditions
	conditions := []map[string]interface{}{}
	for _, cond := range hpa.Status.Conditions {
		conditions = append(conditions, map[string]interface{}{
			"type":    cond.Type,
			"status":  string(cond.Status),
			"reason":  cond.Reason,
			"message": cond.Message,
			"lastTransitionTime": cond.LastTransitionTime.Format(time.RFC3339),
		})
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success":          true,
		"name":             hpa.Name,
		"namespace":        hpa.Namespace,
		"targetRef":         targetRef,
		"targetKind":       hpa.Spec.ScaleTargetRef.Kind,
		"targetName":       hpa.Spec.ScaleTargetRef.Name,
		"minReplicas":      minReplicas,
		"maxReplicas":      hpa.Spec.MaxReplicas,
		"currentReplicas":  hpa.Status.CurrentReplicas,
		"desiredReplicas":  hpa.Status.DesiredReplicas,
		"metrics":          metrics,
		"currentMetrics":   currentMetrics,
		"conditions":       conditions,
		"labels":           hpa.Labels,
		"annotations":      hpa.Annotations,
		"age":              formatAge(time.Since(hpa.CreationTimestamp.Time)),
		"createdAt":        hpa.CreationTimestamp.Format(time.RFC3339),
	})
}

// handleHPAYAML returns HPA YAML
func (ws *WebServer) handleHPAYAML(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	name := r.URL.Query().Get("name")
	namespace := r.URL.Query().Get("namespace")

	if name == "" || namespace == "" {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "name and namespace are required",
		})
		return
	}

	hpa, err := ws.app.clientset.AutoscalingV2().HorizontalPodAutoscalers(namespace).Get(ws.app.ctx, name, metav1.GetOptions{})
	if err != nil {
		// Try v1
		hpaV1, errV1 := ws.app.clientset.AutoscalingV1().HorizontalPodAutoscalers(namespace).Get(ws.app.ctx, name, metav1.GetOptions{})
		if errV1 != nil {
			json.NewEncoder(w).Encode(map[string]interface{}{
				"success": false,
				"error":   err.Error(),
			})
			return
		}
		hpaV1.ManagedFields = nil
		yamlData, err := toKubectlYAML(hpaV1, schema.GroupVersionKind{Group: "autoscaling", Version: "v1", Kind: "HorizontalPodAutoscaler"})
		if err != nil {
			json.NewEncoder(w).Encode(map[string]interface{}{
				"success": false,
				"error":   err.Error(),
			})
			return
		}
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": true,
			"yaml":    string(yamlData),
		})
		return
	}

	hpa.ManagedFields = nil
	yamlData, err := toKubectlYAML(hpa, schema.GroupVersionKind{Group: "autoscaling", Version: "v2", Kind: "HorizontalPodAutoscaler"})
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   err.Error(),
		})
		return
	}
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"yaml":    string(yamlData),
	})
}

// handlePDBDescribe returns PDB describe output
func (ws *WebServer) handlePDBDescribe(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	name := r.URL.Query().Get("name")
	if name == "" {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "PDB name is required",
		})
		return
	}

	namespace := r.URL.Query().Get("namespace")
	if namespace == "" {
		namespace = ws.app.namespace
	}

	describe, err := runKubectlDescribe("poddisruptionbudget", name, namespace)
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success":  true,
		"describe": describe,
	})
}

// handleHPADescribe returns HPA describe output
func (ws *WebServer) handleHPADescribe(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	name := r.URL.Query().Get("name")
	if name == "" {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "HPA name is required",
		})
		return
	}

	namespace := r.URL.Query().Get("namespace")
	if namespace == "" {
		namespace = ws.app.namespace
	}

	describe, err := runKubectlDescribe("horizontalpodautoscaler", name, namespace)
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success":  true,
		"describe": describe,
	})
}

// handlePDBUpdate updates PDB from YAML
func (ws *WebServer) handlePDBUpdate(w http.ResponseWriter, r *http.Request) {
	ws.handleResourceUpdate(w, r, "pdb", func(yamlData []byte, namespace string) error {
		var pdb policyv1.PodDisruptionBudget
		if err := yaml.Unmarshal(yamlData, &pdb); err != nil {
			// Try v1beta1 if v1 fails
			var pdbV1Beta1 policyv1beta1.PodDisruptionBudget
			if errV1Beta1 := yaml.Unmarshal(yamlData, &pdbV1Beta1); errV1Beta1 != nil {
				return fmt.Errorf("failed to unmarshal YAML: %w", err)
			}
			_, err := ws.app.clientset.PolicyV1beta1().PodDisruptionBudgets(namespace).Update(ws.app.ctx, &pdbV1Beta1, metav1.UpdateOptions{})
			return err
		}
		_, err := ws.app.clientset.PolicyV1().PodDisruptionBudgets(namespace).Update(ws.app.ctx, &pdb, metav1.UpdateOptions{})
		return err
	})
}

// handleHPAUpdate updates HPA from YAML
func (ws *WebServer) handleHPAUpdate(w http.ResponseWriter, r *http.Request) {
	ws.handleResourceUpdate(w, r, "hpa", func(yamlData []byte, namespace string) error {
		var hpa autoscalingv2.HorizontalPodAutoscaler
		if err := yaml.Unmarshal(yamlData, &hpa); err != nil {
			// Try v1 if v2 fails
			var hpaV1 autoscalingv1.HorizontalPodAutoscaler
			if errV1 := yaml.Unmarshal(yamlData, &hpaV1); errV1 != nil {
				return fmt.Errorf("failed to unmarshal YAML: %w", err)
			}
			_, err := ws.app.clientset.AutoscalingV1().HorizontalPodAutoscalers(namespace).Update(ws.app.ctx, &hpaV1, metav1.UpdateOptions{})
			return err
		}
		_, err := ws.app.clientset.AutoscalingV2().HorizontalPodAutoscalers(namespace).Update(ws.app.ctx, &hpa, metav1.UpdateOptions{})
		return err
	})
}

// handlePDBDelete deletes a PDB
func (ws *WebServer) handlePDBDelete(w http.ResponseWriter, r *http.Request) {
	name := r.URL.Query().Get("name")
	namespace := r.URL.Query().Get("namespace")

	if name == "" || namespace == "" {
		http.Error(w, "name and namespace are required", http.StatusBadRequest)
		return
	}

	err := ws.app.clientset.PolicyV1().PodDisruptionBudgets(namespace).Delete(ws.app.ctx, name, metav1.DeleteOptions{})
	if err != nil {
		// Try v1beta1
		errV1Beta1 := ws.app.clientset.PolicyV1beta1().PodDisruptionBudgets(namespace).Delete(ws.app.ctx, name, metav1.DeleteOptions{})
		if errV1Beta1 != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{"success": true})
}

// handleHPADelete deletes an HPA
func (ws *WebServer) handleHPADelete(w http.ResponseWriter, r *http.Request) {
	name := r.URL.Query().Get("name")
	namespace := r.URL.Query().Get("namespace")

	if name == "" || namespace == "" {
		http.Error(w, "name and namespace are required", http.StatusBadRequest)
		return
	}

	err := ws.app.clientset.AutoscalingV2().HorizontalPodAutoscalers(namespace).Delete(ws.app.ctx, name, metav1.DeleteOptions{})
	if err != nil {
		// Try v1
		errV1 := ws.app.clientset.AutoscalingV1().HorizontalPodAutoscalers(namespace).Delete(ws.app.ctx, name, metav1.DeleteOptions{})
		if errV1 != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{"success": true})
}
