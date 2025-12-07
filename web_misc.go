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
	"log"
	"net/http"
	"strconv"
	"time"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	v1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/runtime/schema"
)

// handleConnectionStatus checks and returns the current cluster connection status
func (ws *WebServer) handleConnectionStatus(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	// Actually test the connection by trying to list namespaces
	connected := false
	errorMsg := ws.app.connectionError

	if ws.app.clientset != nil {
		_, err := ws.app.clientset.CoreV1().Namespaces().List(ws.app.ctx, metav1.ListOptions{Limit: 1})
		if err != nil {
			connected = false
			errorMsg = err.Error()
			ws.app.connected = false
			ws.app.connectionError = errorMsg
		} else {
			connected = true
			errorMsg = ""
			ws.app.connected = true
			ws.app.connectionError = ""
		}
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"connected": connected,
		"error":     errorMsg,
		"cluster":   ws.app.cluster,
		"version":   GetVersion(),
	})
}

// handleCheckUpdates checks for available updates
func (ws *WebServer) handleCheckUpdates(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	updateInfo, err := CheckForUpdates()
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"currentVersion":  GetVersion(),
			"updateAvailable": false,
			"error":           err.Error(),
		})
		return
	}

	json.NewEncoder(w).Encode(updateInfo)
}

// handleInstallUpdate downloads and installs the latest version
func (ws *WebServer) handleInstallUpdate(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		DownloadURL string `json:"downloadUrl"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Invalid request body",
		})
		return
	}

	if req.DownloadURL == "" {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Download URL is required",
		})
		return
	}

	// Perform update in background
	go func() {
		if err := PerformUpdate(req.DownloadURL); err != nil {
			fmt.Printf("❌ Update failed: %v\n", err)
			return
		}

		fmt.Printf("✓ Update installed successfully. Restarting...\n")

		// Give the HTTP response time to be sent
		time.Sleep(1 * time.Second)

		// Restart the application
		if err := RestartApplication(); err != nil {
			fmt.Printf("❌ Failed to restart: %v\n", err)
		}
	}()

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": "Update started. The application will restart automatically when complete.",
	})
}

// handleMetrics returns cluster metrics
func (ws *WebServer) handleMetrics(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	metrics := ws.getClusterMetrics()
	if err := json.NewEncoder(w).Encode(metrics); err != nil {
		log.Printf("Error encoding metrics: %v", err)
		http.Error(w, "Failed to encode metrics", http.StatusInternalServerError)
		return
	}
}

// handleTopology returns topology data for visualization
func (ws *WebServer) handleTopology(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if ws.app.clientset == nil {
		http.Error(w, "Kubernetes client not initialized. Please connect to a cluster first.", http.StatusServiceUnavailable)
		return
	}

	namespace := r.URL.Query().Get("namespace")
	// Empty namespace means all namespaces
	topology := ws.buildTopologyData(namespace)
	json.NewEncoder(w).Encode(topology)
}

// handleEvents returns recent Kubernetes events
func (ws *WebServer) handleEvents(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")

	namespace := r.URL.Query().Get("namespace")
	limitStr := r.URL.Query().Get("limit")
	limit := 100
	if limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil && l > 0 {
			limit = l
		}
	}

	ws.eventsMu.RLock()
	events := make([]WebEvent, 0, limit)
	for i := len(ws.events) - 1; i >= 0 && len(events) < limit; i-- {
		ev := ws.events[i]
		if namespace == "" || namespace == "All Namespaces" || ev.Namespace == namespace {
			events = append(events, ev)
		}
	}
	ws.eventsMu.RUnlock()

	json.NewEncoder(w).Encode(map[string]interface{}{
		"events": events,
		"total":  len(events),
	})
}

// watchKubernetesEvents watches for Kubernetes events and broadcasts them to WebSocket clients
func (ws *WebServer) watchKubernetesEvents() {
	// Wait for cluster connection before starting event watcher
	for i := 0; i < 60; i++ {
		if ws.app.clientset != nil && ws.app.connected {
			break
		}
		time.Sleep(1 * time.Second)
	}

	if ws.app.clientset == nil || !ws.app.connected {
		log.Printf("⚠️ Skipping Kubernetes event watcher: cluster not connected")
		return
	}
	var lastError string
	backoff := 5 * time.Second
	maxBackoff := 5 * time.Minute

	for {
		select {
		case <-ws.stopCh:
			return
		default:
			// Check if clientset is available
			if ws.app.clientset == nil {
				time.Sleep(2 * time.Second)
				continue
			}

			// Watch all namespaces for events
			watcher, err := ws.app.clientset.CoreV1().Events("").Watch(ws.app.ctx, metav1.ListOptions{})
			if err != nil {
				errStr := err.Error()
				// Only log if error message changed (suppress repeated errors)
				if errStr != lastError {
					log.Printf("Event watcher error: %v (will retry with backoff)", err)
					lastError = errStr
				}
				time.Sleep(backoff)
				// Exponential backoff up to max
				backoff = backoff * 2
				if backoff > maxBackoff {
					backoff = maxBackoff
				}
				continue
			}
			// Reset backoff on successful connection
			backoff = 5 * time.Second
			lastError = ""

			for watchEvent := range watcher.ResultChan() {
				if watchEvent.Type == "ADDED" || watchEvent.Type == "MODIFIED" {
					if ev, ok := watchEvent.Object.(*v1.Event); ok {
						webEvent := WebEvent{
							Time:      ev.LastTimestamp.Time,
							Type:      ev.Type,
							Reason:    ev.Reason,
							Object:    ev.InvolvedObject.Name,
							Kind:      ev.InvolvedObject.Kind,
							Message:   ev.Message,
							Namespace: ev.Namespace,
							Count:     ev.Count,
							Source:    ev.Source.Component,
						}

						// Handle zero timestamp (use event time if LastTimestamp is zero)
						if webEvent.Time.IsZero() {
							webEvent.Time = ev.EventTime.Time
						}
						if webEvent.Time.IsZero() {
							webEvent.Time = time.Now()
						}

						// Store event
						ws.eventsMu.Lock()
						ws.events = append(ws.events, webEvent)
						if len(ws.events) > 500 {
							ws.events = ws.events[len(ws.events)-500:]
						}
						ws.eventsMu.Unlock()

						// Broadcast to all connected WebSocket clients
						ws.broadcastEvent(webEvent)
					}
				}
			}
		}
	}
}

// handleResourceMap returns resource topology for visualization
func (ws *WebServer) handleResourceMap(w http.ResponseWriter, r *http.Request) {
	nodes := []map[string]interface{}{}
	links := []map[string]interface{}{}

	// Get all resources
	ingresses, _ := ws.app.clientset.NetworkingV1().Ingresses(ws.app.namespace).List(ws.app.ctx, metav1.ListOptions{})
	services, _ := ws.app.clientset.CoreV1().Services(ws.app.namespace).List(ws.app.ctx, metav1.ListOptions{})
	deployments, _ := ws.app.clientset.AppsV1().Deployments(ws.app.namespace).List(ws.app.ctx, metav1.ListOptions{})
	pods, _ := ws.app.clientset.CoreV1().Pods(ws.app.namespace).List(ws.app.ctx, metav1.ListOptions{})
	configmaps, _ := ws.app.clientset.CoreV1().ConfigMaps(ws.app.namespace).List(ws.app.ctx, metav1.ListOptions{})

	// Add ingresses
	for _, ing := range ingresses.Items {
		nodes = append(nodes, map[string]interface{}{
			"id":     fmt.Sprintf("ingress-%s", ing.Name),
			"name":   ing.Name,
			"type":   "ingress",
			"group":  1,
			"icon":   "🚪",
			"status": "active",
		})

		// Link to services
		for _, rule := range ing.Spec.Rules {
			for _, path := range rule.HTTP.Paths {
				links = append(links, map[string]interface{}{
					"source": fmt.Sprintf("ingress-%s", ing.Name),
					"target": fmt.Sprintf("service-%s", path.Backend.Service.Name),
					"value":  1,
				})
			}
		}
	}

	// Add services
	for _, svc := range services.Items {
		nodes = append(nodes, map[string]interface{}{
			"id":     fmt.Sprintf("service-%s", svc.Name),
			"name":   svc.Name,
			"type":   "service",
			"group":  2,
			"icon":   "🌐",
			"status": "active",
		})
	}

	// Add deployments
	for _, dep := range deployments.Items {
		ready := dep.Status.ReadyReplicas == *dep.Spec.Replicas
		status := "ready"
		if !ready {
			status = "degraded"
		}

		nodes = append(nodes, map[string]interface{}{
			"id":       fmt.Sprintf("deployment-%s", dep.Name),
			"name":     dep.Name,
			"type":     "deployment",
			"group":    3,
			"icon":     "🚀",
			"status":   status,
			"replicas": fmt.Sprintf("%d/%d", dep.Status.ReadyReplicas, *dep.Spec.Replicas),
		})

		// Link services to deployments
		for _, svc := range services.Items {
			if matchesSelector(svc.Spec.Selector, dep.Spec.Template.Labels) {
				links = append(links, map[string]interface{}{
					"source": fmt.Sprintf("service-%s", svc.Name),
					"target": fmt.Sprintf("deployment-%s", dep.Name),
					"value":  1,
				})
			}
		}

		// Link deployments to configmaps
		for _, vol := range dep.Spec.Template.Spec.Volumes {
			if vol.ConfigMap != nil {
				links = append(links, map[string]interface{}{
					"source": fmt.Sprintf("deployment-%s", dep.Name),
					"target": fmt.Sprintf("configmap-%s", vol.ConfigMap.Name),
					"value":  1,
				})
			}
		}
	}

	// Add pods (sample, not all)
	podCount := 0
	for _, pod := range pods.Items {
		if podCount >= 10 { // Limit to avoid clutter
			break
		}
		status := "running"
		if pod.Status.Phase != "Running" {
			status = "pending"
		}

		nodes = append(nodes, map[string]interface{}{
			"id":     fmt.Sprintf("pod-%s", pod.Name),
			"name":   pod.Name,
			"type":   "pod",
			"group":  4,
			"icon":   "🎯",
			"status": status,
		})

		// Link pods to deployments
		if owner := pod.OwnerReferences; len(owner) > 0 && owner[0].Kind == "ReplicaSet" {
			for _, dep := range deployments.Items {
				// Simplified: check if pod name contains deployment name
				if len(pod.Name) > len(dep.Name) && pod.Name[:len(dep.Name)] == dep.Name {
					links = append(links, map[string]interface{}{
						"source": fmt.Sprintf("deployment-%s", dep.Name),
						"target": fmt.Sprintf("pod-%s", pod.Name),
						"value":  1,
					})
					break
				}
			}
		}
		podCount++
	}

	// Add configmaps
	for _, cm := range configmaps.Items {
		nodes = append(nodes, map[string]interface{}{
			"id":     fmt.Sprintf("configmap-%s", cm.Name),
			"name":   cm.Name,
			"type":   "configmap",
			"group":  5,
			"icon":   "⚙️",
			"status": "active",
		})
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"nodes": nodes,
		"links": links,
	})
}

// handleNamespaces returns list of all namespaces
func (ws *WebServer) handleNamespaces(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if ws.app.clientset == nil {
		// Return empty list if client not initialized
		json.NewEncoder(w).Encode(map[string]interface{}{
			"namespaces": []string{},
		})
		return
	}

	namespaces, err := ws.app.clientset.CoreV1().Namespaces().List(ws.app.ctx, metav1.ListOptions{})
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	nsList := []string{}
	for _, ns := range namespaces.Items {
		nsList = append(nsList, ns.Name)
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success":    true,
		"namespaces": nsList,
	})
}

// handleContexts returns list of all available kubeconfig contexts
func (ws *WebServer) handleContexts(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if ws.app.contextManager == nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success":  false,
			"error":    "Context manager not initialized",
			"contexts": []interface{}{},
		})
		return
	}

	type ContextInfo struct {
		Name          string `json:"name"`
		Connected     bool   `json:"connected"`
		Error         string `json:"error,omitempty"`
		ServerVersion string `json:"serverVersion,omitempty"`
		IsCurrent     bool   `json:"isCurrent"`
	}

	contexts := []ContextInfo{}
	currentCtx := ws.app.GetCurrentContext()

	for _, ctxName := range ws.app.GetContexts() {
		ctx := ws.app.GetContextInfo(ctxName)
		if ctx != nil {
			contexts = append(contexts, ContextInfo{
				Name:          ctx.Name,
				Connected:     ctx.Connected,
				Error:         ctx.Error,
				ServerVersion: ctx.ServerVersion,
				IsCurrent:     ctxName == currentCtx,
			})
		}
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success":        true,
		"contexts":       contexts,
		"currentContext": currentCtx,
	})
}

// handleCurrentContext returns the current active context
func (ws *WebServer) handleCurrentContext(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	currentCtx := ws.app.GetCurrentContext()
	ctxInfo := ws.app.GetContextInfo(currentCtx)

	response := map[string]interface{}{
		"success": true,
		"context": currentCtx,
	}

	if ctxInfo != nil {
		response["connected"] = ctxInfo.Connected
		response["serverVersion"] = ctxInfo.ServerVersion
		if ctxInfo.Error != "" {
			response["error"] = ctxInfo.Error
		}
	}

	json.NewEncoder(w).Encode(response)
}

// handleSwitchContext switches to a different kubeconfig context
func (ws *WebServer) handleSwitchContext(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		Context string `json:"context"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Invalid request body",
		})
		return
	}

	if req.Context == "" {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Context name is required",
		})
		return
	}

	if err := ws.app.SwitchContext(req.Context); err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	// Clear cost cache when switching contexts (cost is cluster-specific)
	ws.costCacheMu.Lock()
	// Clear all cached costs to ensure fresh data for new cluster
	ws.costCache = make(map[string]*ClusterCost)
	ws.costCacheTime = make(map[string]time.Time)
	ws.costCacheMu.Unlock()

	// Broadcast context change to all WebSocket clients
	contextMsg := map[string]interface{}{
		"type":    "contextSwitch",
		"context": req.Context,
	}
	for client := range ws.clients {
		if err := client.WriteJSON(contextMsg); err != nil {
			client.Close()
			delete(ws.clients, client)
		}
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"context": req.Context,
		"message": "Successfully switched to context: " + req.Context,
	})
}

// handlePodDetails returns detailed information about a specific pod
func (ws *WebServer) handlePodDetails(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	name := r.URL.Query().Get("name")
	if name == "" {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Pod name is required",
		})
		return
	}

	namespace := r.URL.Query().Get("namespace")
	if !r.URL.Query().Has("namespace") {
		namespace = ws.app.namespace
	}

	// Get pod
	pod, err := ws.app.clientset.CoreV1().Pods(namespace).Get(ws.app.ctx, name, metav1.GetOptions{})
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	// Build containers info
	containers := []map[string]interface{}{}
	for _, c := range pod.Spec.Containers {
		containerInfo := map[string]interface{}{
			"name":  c.Name,
			"image": c.Image,
		}

		// Find container status
		for _, cs := range pod.Status.ContainerStatuses {
			if cs.Name == c.Name {
				containerInfo["ready"] = cs.Ready
				containerInfo["restartCount"] = cs.RestartCount
				containerInfo["containerID"] = cs.ContainerID

				// State information
				if cs.State.Running != nil {
					containerInfo["state"] = "Running"
					containerInfo["startedAt"] = cs.State.Running.StartedAt.String()
				} else if cs.State.Waiting != nil {
					containerInfo["state"] = "Waiting"
					containerInfo["reason"] = cs.State.Waiting.Reason
					containerInfo["message"] = cs.State.Waiting.Message
				} else if cs.State.Terminated != nil {
					containerInfo["state"] = "Terminated"
					containerInfo["reason"] = cs.State.Terminated.Reason
					containerInfo["exitCode"] = cs.State.Terminated.ExitCode
				}
				break
			}
		}

		containers = append(containers, containerInfo)
	}

	// Build volumes info
	volumes := []map[string]interface{}{}
	for _, v := range pod.Spec.Volumes {
		volumeInfo := map[string]interface{}{
			"name": v.Name,
		}
		if v.ConfigMap != nil {
			volumeInfo["type"] = "ConfigMap"
			volumeInfo["source"] = v.ConfigMap.Name
		} else if v.Secret != nil {
			volumeInfo["type"] = "Secret"
			volumeInfo["source"] = v.Secret.SecretName
		} else if v.PersistentVolumeClaim != nil {
			volumeInfo["type"] = "PVC"
			volumeInfo["source"] = v.PersistentVolumeClaim.ClaimName
		} else if v.EmptyDir != nil {
			volumeInfo["type"] = "EmptyDir"
		} else {
			volumeInfo["type"] = "Other"
		}
		volumes = append(volumes, volumeInfo)
	}

	// Build conditions
	conditions := []map[string]interface{}{}
	for _, c := range pod.Status.Conditions {
		conditions = append(conditions, map[string]interface{}{
			"type":    string(c.Type),
			"status":  string(c.Status),
			"reason":  c.Reason,
			"message": c.Message,
		})
	}

	// Get events
	events, _ := ws.app.clientset.CoreV1().Events(ws.app.namespace).List(ws.app.ctx, metav1.ListOptions{
		FieldSelector: fmt.Sprintf("involvedObject.name=%s", name),
	})

	eventList := []map[string]interface{}{}
	for _, e := range events.Items {
		eventList = append(eventList, map[string]interface{}{
			"type":    e.Type,
			"reason":  e.Reason,
			"message": e.Message,
			"count":   e.Count,
			"age":     formatAge(time.Since(e.LastTimestamp.Time)),
		})
	}

	// Generate YAML (using kubectl-style format)
	pod.ManagedFields = nil
	yamlData, _ := toKubectlYAML(pod, schema.GroupVersionKind{Group: "", Version: "v1", Kind: "Pod"})

	// Get real-time metrics if available
	var podMetrics map[string]interface{}
	if ws.app.metricsClient != nil {
		if metrics, err := ws.app.metricsClient.MetricsV1beta1().PodMetricses(ws.app.namespace).Get(ws.app.ctx, name, metav1.GetOptions{}); err == nil {
			// Calculate total CPU and memory
			var totalCPU, totalMemory int64
			containerMetrics := []map[string]interface{}{}

			for _, cm := range metrics.Containers {
				cpuMillis := cm.Usage.Cpu().MilliValue()
				memoryBytes := cm.Usage.Memory().Value()
				totalCPU += cpuMillis
				totalMemory += memoryBytes

				containerMetrics = append(containerMetrics, map[string]interface{}{
					"name":        cm.Name,
					"cpuMillis":   cpuMillis,
					"cpu":         fmt.Sprintf("%dm", cpuMillis),
					"memoryBytes": memoryBytes,
					"memory":      fmt.Sprintf("%.2fMi", float64(memoryBytes)/(1024*1024)),
				})
			}

			podMetrics = map[string]interface{}{
				"totalCPU":         fmt.Sprintf("%dm", totalCPU),
				"totalCPUMillis":   totalCPU,
				"totalMemory":      fmt.Sprintf("%.2fMi", float64(totalMemory)/(1024*1024)),
				"totalMemoryBytes": totalMemory,
				"containers":       containerMetrics,
				"timestamp":        metrics.Timestamp.String(),
			}
		}
	}

	// Build response
	details := map[string]interface{}{
		"success":    true,
		"name":       pod.Name,
		"namespace":  pod.Namespace,
		"status":     string(pod.Status.Phase),
		"ip":         pod.Status.PodIP,
		"node":       pod.Spec.NodeName,
		"qos":        string(pod.Status.QOSClass),
		"created":    pod.CreationTimestamp.String(),
		"age":        formatAge(time.Since(pod.CreationTimestamp.Time)),
		"labels":     pod.Labels,
		"containers": containers,
		"volumes":    volumes,
		"conditions": conditions,
		"events":     eventList,
		"yaml":       string(yamlData),
		"metrics":    podMetrics,
	}

	json.NewEncoder(w).Encode(details)
}
