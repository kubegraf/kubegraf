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
	"log"
	"net/http"
	"os"
	"runtime"
	"strconv"
	"time"

	"github.com/gorilla/websocket"
	"github.com/kubegraf/kubegraf/internal/update"
	"github.com/kubegraf/kubegraf/pkg/update/unix"
	"github.com/kubegraf/kubegraf/pkg/update/windows"
	v1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime/schema"
)

// handleCacheStats returns cache performance statistics (production monitoring)
func (ws *WebServer) handleCacheStats(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if ws.cache == nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"error": "cache not initialized",
		})
		return
	}

	stats := ws.cache.GetStats()
	json.NewEncoder(w).Encode(stats)
}

// handleConnectionStatus checks and returns the current cluster connection status
// If retry=true query parameter is present, it will attempt to reconnect
func (ws *WebServer) handleConnectionStatus(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	// Check if retry is requested
	retry := r.URL.Query().Get("retry") == "true"

	// If retry is requested and not connected, attempt to reconnect
	if retry && !ws.app.connected {
		// Attempt to reinitialize the connection synchronously (with timeout)
		done := make(chan error, 1)
		go func() {
			initErr := ws.app.Initialize()
			done <- initErr
		}()
		
		// Wait up to 3 seconds for initialization to complete
		select {
		case err := <-done:
			if err != nil {
				ws.app.connectionError = err.Error()
				ws.app.connected = false
			} else {
				ws.app.connected = true
				ws.app.connectionError = ""
			}
		case <-time.After(3 * time.Second):
			// Timeout - connection might still be in progress
			// Check status below
		}
	}

	// Fast path: if already connected and not retry, return cached status immediately
	// Don't re-test connection on every request - it's slow (~2s)
	if ws.app.connected && !retry {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"connected": true,
			"error":     "",
			"cluster":   ws.app.cluster,
			"version":   GetVersion(),
		})
		return
	}

	// Only test connection if not connected or retry requested
	connected := false
	errorMsg := ws.app.connectionError

	if ws.app.clientset != nil {
		// Use a short timeout for connection test
		ctx, cancel := context.WithTimeout(ws.app.ctx, 2*time.Second)
		defer cancel()
		
		_, err := ws.app.clientset.CoreV1().Namespaces().List(ctx, metav1.ListOptions{Limit: 1})
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
// This is the manual check endpoint - it should always fetch fresh data
func (ws *WebServer) handleCheckUpdates(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Clear cache to force fresh check for manual updates
	update.ClearCache()

	currentVersion := GetVersion()
	info, err := update.CheckGitHubLatestRelease(currentVersion)
	if err != nil {
		// Check if it's a rate limit error
		if err.Error() == "GitHub API rate limit exceeded (HTTP 429)" {
			w.WriteHeader(http.StatusTooManyRequests)
			json.NewEncoder(w).Encode(map[string]interface{}{
				"currentVersion":  currentVersion,
				"latestVersion":   currentVersion,
				"updateAvailable": false,
				"error":           "GitHub API rate limit exceeded. Please try again later.",
			})
			return
		}

		// Return cached result if available (shouldn't happen after ClearCache, but just in case)
		cached := update.CacheLatestRelease()
		if cached != nil {
			json.NewEncoder(w).Encode(cached)
			return
		}

		// Return error response
		json.NewEncoder(w).Encode(map[string]interface{}{
			"currentVersion":  currentVersion,
			"latestVersion":   currentVersion,
			"updateAvailable": false,
			"error":           err.Error(),
		})
		return
	}

	// Check if this is a Scoop installation (Windows only)
	response := map[string]interface{}{
		"currentVersion":  info.CurrentVersion,
		"latestVersion":   info.LatestVersion,
		"updateAvailable": info.UpdateAvailable,
		"releaseNotes":    info.ReleaseNotes,
		"htmlUrl":          info.HTMLURL,
		"downloadUrl":      info.DownloadURL,
	}

	// Check installation method and add appropriate warnings
	execPath, err := os.Executable()
	if err == nil {
		if runtime.GOOS == "windows" {
			// Check for Scoop installation
			scoopInfo, _ := windows.DetectScoopInstallation(execPath)
			if scoopInfo != nil && scoopInfo.IsScoopInstall {
				response["isScoopInstall"] = true
				response["scoopUpdateCommand"] = windows.GetScoopUpdateCommand()
				response["scoopWarning"] = "KubeGraf is installed via Scoop. For best compatibility, use 'scoop update kubegraf' instead of in-app updates."
			}
		} else if runtime.GOOS == "darwin" {
			// Check for Homebrew installation
			homebrewInfo, _ := unix.DetectHomebrewInstallation(execPath)
			if homebrewInfo != nil && homebrewInfo.IsHomebrewInstall {
				response["isHomebrewInstall"] = true
				response["homebrewUpdateCommand"] = unix.GetHomebrewUpdateCommand()
				response["homebrewWarning"] = "KubeGraf is installed via Homebrew. For best compatibility, use 'brew upgrade kubegraf' instead of in-app updates."
			}
		}
	}

	json.NewEncoder(w).Encode(response)
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

		// PerformUpdate will exit the application on all platforms
		// The updater script (Windows PowerShell or Unix shell) handles the restart
		// We never reach here because PerformUpdate calls os.Exit(0)
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

// handleNamespaces returns list of all namespaces with details
func (ws *WebServer) handleNamespaces(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if ws.app.clientset == nil {
		// Return empty list if client not initialized
		json.NewEncoder(w).Encode([]map[string]interface{}{})
		return
	}

	namespaces, err := ws.app.clientset.CoreV1().Namespaces().List(ws.app.ctx, metav1.ListOptions{})
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	nsList := []map[string]interface{}{}
	for _, ns := range namespaces.Items {
		// Get status phase
		phase := string(ns.Status.Phase)

		nsList = append(nsList, map[string]interface{}{
			"name":      ns.Name,
			"status":    phase,
			"age":       formatAge(time.Since(ns.CreationTimestamp.Time)),
			"labels":    ns.Labels,
			"createdAt": ns.CreationTimestamp.Time.Format(time.RFC3339),
		})
	}

	json.NewEncoder(w).Encode(nsList)
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

	// CRITICAL: Update incident manager cluster context when switching contexts
	// This clears all incidents from other clusters and ensures new scans use the correct context
	if ws.app.incidentIntelligence != nil {
		manager := ws.app.incidentIntelligence.GetManager()
		log.Printf("[handleSwitchContext] Switching incident manager context to: %s", req.Context)
		manager.SetClusterContext(req.Context)
		log.Printf("[handleSwitchContext] Incident manager context switched successfully")
	}

	// Clear cost cache when switching contexts (cost is cluster-specific)
	ws.costCacheMu.Lock()
	// Clear all cached costs to ensure fresh data for new cluster
	ws.costCache = make(map[string]*ClusterCost)
	ws.costCacheTime = make(map[string]time.Time)
	ws.costCacheMu.Unlock()

	// Broadcast context change to all WebSocket clients (with mutex protection)
	contextMsg := map[string]interface{}{
		"type":    "contextSwitch",
		"context": req.Context,
	}
	ws.mu.Lock()
	// Create a copy of clients map to avoid holding lock during WriteJSON
	clientsCopy := make([]*websocket.Conn, 0, len(ws.clients))
	for client := range ws.clients {
		clientsCopy = append(clientsCopy, client)
	}
	ws.mu.Unlock()

	// Write to clients without holding the lock to avoid blocking
	for _, client := range clientsCopy {
		ws.mu.Lock()
		_, exists := ws.clients[client]
		ws.mu.Unlock()

		if !exists {
			continue // Client was removed
		}

		if err := client.WriteJSON(contextMsg); err != nil {
			ws.mu.Lock()
			delete(ws.clients, client)
			ws.mu.Unlock()
			client.Close()
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

	// Build containers info (init containers first, then main containers)
	containers := []map[string]interface{}{}

	// Add init containers
	for _, ic := range pod.Spec.InitContainers {
		containerInfo := map[string]interface{}{
			"name":  ic.Name,
			"image": ic.Image,
			"type":  "init",
		}

		// Extract ports
		ports := []int32{}
		for _, port := range ic.Ports {
			ports = append(ports, port.ContainerPort)
		}
		containerInfo["ports"] = ports

		// Find init container status
		for _, ics := range pod.Status.InitContainerStatuses {
			if ics.Name == ic.Name {
				containerInfo["restartCount"] = ics.RestartCount
				containerInfo["containerID"] = ics.ContainerID
				if ics.State.Terminated != nil {
					containerInfo["state"] = "Terminated"
					containerInfo["ready"] = ics.State.Terminated.ExitCode == 0
					containerInfo["exitCode"] = ics.State.Terminated.ExitCode
					containerInfo["reason"] = ics.State.Terminated.Reason
					containerInfo["startedAt"] = ics.State.Terminated.StartedAt.String()
				} else if ics.State.Running != nil {
					containerInfo["state"] = "Running"
					containerInfo["ready"] = false
					containerInfo["startedAt"] = ics.State.Running.StartedAt.String()
				} else if ics.State.Waiting != nil {
					containerInfo["state"] = "Waiting"
					containerInfo["ready"] = false
					containerInfo["reason"] = ics.State.Waiting.Reason
					containerInfo["message"] = ics.State.Waiting.Message
				}
				break
			}
		}

		containers = append(containers, containerInfo)
	}

	// Add main containers
	for _, c := range pod.Spec.Containers {
		containerInfo := map[string]interface{}{
			"name":  c.Name,
			"image": c.Image,
			"type":  "main",
		}

		// Extract ports
		ports := []int32{}
		for _, port := range c.Ports {
			ports = append(ports, port.ContainerPort)
		}
		containerInfo["ports"] = ports

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

			// Create a map of container metrics by name for easy lookup
			containerMetricsMap := make(map[string]map[string]interface{})
			for _, cm := range containerMetrics {
				if name, ok := cm["name"].(string); ok {
					containerMetricsMap[name] = cm
				}
			}
			podMetrics["containerMetricsMap"] = containerMetricsMap

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
