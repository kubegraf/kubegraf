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
	"time"

	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// Stub handlers for legacy endpoints (to be implemented or removed)
func (ws *WebServer) handleClusters(w http.ResponseWriter, r *http.Request) {
	// Redirect to new endpoint if cluster manager is available
	if ws.clusterManager != nil {
		ws.handleListClustersNew(w, r)
		return
	}
	http.Error(w, "Cluster manager not initialized", http.StatusServiceUnavailable)
}

func (ws *WebServer) handleClusterConnect(w http.ResponseWriter, r *http.Request) {
	http.Error(w, "Not implemented - use cluster manager endpoints", http.StatusNotImplemented)
}

func (ws *WebServer) handleClusterDisconnect(w http.ResponseWriter, r *http.Request) {
	http.Error(w, "Not implemented - use cluster manager endpoints", http.StatusNotImplemented)
}

func (ws *WebServer) handleClusterStatus(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	w.Header().Set("Content-Type", "application/json")

	// Use cluster service if available
	if ws.clusterService != nil {
		status := ws.clusterService.Status()
		// Convert ClusterStatusPayload to ClusterManagerStatus format
		response := map[string]interface{}{
			"connected": status.Connected,
			"cluster":   status.Cluster,
		}
		if status.Error != "" {
			response["error"] = status.Error
		}
		if status.Provider != "" {
			response["provider"] = status.Provider
		}
		if status.DefaultCluster != "" {
			response["defaultCluster"] = status.DefaultCluster
		}
		json.NewEncoder(w).Encode(response)
		return
	}

	// Fallback: return basic status from app
	status := map[string]interface{}{
		"connected": ws.app.connected,
		"cluster":   ws.app.cluster,
	}
	if ws.app.connectionError != "" {
		status["error"] = ws.app.connectionError
	}
	json.NewEncoder(w).Encode(status)
}

// handleListClustersNew handles GET /api/clusters/list (new implementation with ClusterManager)
func (ws *WebServer) handleListClustersNew(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	if ws.clusterManager == nil {
		http.Error(w, "Cluster manager not initialized", http.StatusServiceUnavailable)
		return
	}

	contexts := ws.clusterManager.GetContexts()
	clusters := make([]ClusterInfo, 0, len(contexts))

	for _, ctx := range contexts {
		clusters = append(clusters, ClusterInfo{
			Name:        ctx.Name,
			ClusterName: ctx.ClusterName,
			SourceFile:  ctx.SourceFile,
		})
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(map[string]interface{}{
		"clusters": clusters,
	}); err != nil {
		http.Error(w, "Failed to encode response", http.StatusInternalServerError)
	}
}

// handleGetClusterNamespacesNew handles GET /api/clusters/namespaces?name=contextName
func (ws *WebServer) handleGetClusterNamespacesNew(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	contextName := r.URL.Query().Get("name")
	if contextName == "" {
		http.Error(w, "Missing context name", http.StatusBadRequest)
		return
	}

	if ws.clusterManager == nil {
		http.Error(w, "Cluster manager not initialized", http.StatusServiceUnavailable)
		return
	}

	// Try to get from cache first
	namespaces := ws.clusterManager.GetCachedNamespaces(contextName)

	// If cache is empty, fetch from API
	if len(namespaces) == 0 {
		client, err := ws.clusterManager.GetClient(contextName)
		if err != nil {
			http.Error(w, fmt.Sprintf("Context not found: %v", err), http.StatusNotFound)
			return
		}

		nsList, err := client.CoreV1().Namespaces().List(r.Context(), metav1.ListOptions{})
		if err != nil {
			http.Error(w, fmt.Sprintf("Failed to list namespaces: %v", err), http.StatusInternalServerError)
			return
		}
		namespaces = nsList.Items
	}

	// Convert to API format
	nsInfo := make([]NamespaceInfo, 0, len(namespaces))
	for _, ns := range namespaces {
		nsInfo = append(nsInfo, NamespaceInfo{
			Name:   ns.Name,
			Status: string(ns.Status.Phase),
		})
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(map[string]interface{}{
		"namespaces": nsInfo,
	}); err != nil {
		http.Error(w, "Failed to encode response", http.StatusInternalServerError)
	}
}

// handleGetClusterPodsNew handles GET /api/clusters/pods?name=contextName&namespace=X
func (ws *WebServer) handleGetClusterPodsNew(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	contextName := r.URL.Query().Get("name")
	namespace := r.URL.Query().Get("namespace")
	if contextName == "" {
		http.Error(w, "Missing context name", http.StatusBadRequest)
		return
	}

	if ws.clusterManager == nil {
		http.Error(w, "Cluster manager not initialized", http.StatusServiceUnavailable)
		return
	}

	// Try cache first
	var pods []corev1.Pod
	if namespace != "" {
		pods = ws.clusterManager.GetCachedPods(contextName, namespace)
	}

	// If cache miss, fetch from API
	if len(pods) == 0 {
		client, err := ws.clusterManager.GetClient(contextName)
		if err != nil {
			http.Error(w, fmt.Sprintf("Context not found: %v", err), http.StatusNotFound)
			return
		}

		podList, err := client.CoreV1().Pods(namespace).List(r.Context(), metav1.ListOptions{})
		if err != nil {
			http.Error(w, fmt.Sprintf("Failed to list pods: %v", err), http.StatusInternalServerError)
			return
		}
		pods = podList.Items
	}

	// Convert to API format
	podInfo := make([]PodInfo, 0, len(pods))
	for _, pod := range pods {
		podInfo = append(podInfo, PodInfo{
			Name:      pod.Name,
			Namespace: pod.Namespace,
			Status:    string(pod.Status.Phase),
			Node:      pod.Spec.NodeName,
		})
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(map[string]interface{}{
		"pods": podInfo,
	}); err != nil {
		http.Error(w, "Failed to encode response", http.StatusInternalServerError)
	}
}

// handleGetClusterEventsNew handles GET /api/clusters/events?name=contextName&since=...
func (ws *WebServer) handleGetClusterEventsNew(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	contextName := r.URL.Query().Get("name")
	sinceStr := r.URL.Query().Get("since")
	if contextName == "" {
		http.Error(w, "Missing context name", http.StatusBadRequest)
		return
	}

	if ws.clusterManager == nil {
		http.Error(w, "Cluster manager not initialized", http.StatusServiceUnavailable)
		return
	}

	var since time.Time
	if sinceStr != "" {
		var err error
		since, err = time.Parse(time.RFC3339, sinceStr)
		if err != nil {
			http.Error(w, "Invalid since parameter (expected RFC3339)", http.StatusBadRequest)
			return
		}
	}

	// Try cache first
	events := ws.clusterManager.GetCachedEvents(contextName)

	// Filter by since if provided
	if !since.IsZero() {
		filtered := make([]corev1.Event, 0)
		for _, event := range events {
			eventTime := event.LastTimestamp.Time
			if eventTime.IsZero() {
				eventTime = event.FirstTimestamp.Time
			}
			if eventTime.After(since) || eventTime.Equal(since) {
				filtered = append(filtered, event)
			}
		}
		events = filtered
	}

	// If cache miss, fetch from API
	if len(events) == 0 {
		client, err := ws.clusterManager.GetClient(contextName)
		if err != nil {
			http.Error(w, fmt.Sprintf("Context not found: %v", err), http.StatusNotFound)
			return
		}

		opts := metav1.ListOptions{}
		if !since.IsZero() {
			opts.FieldSelector = fmt.Sprintf("lastTimestamp>=%s", since.Format(time.RFC3339))
		}

		eventList, err := client.CoreV1().Events(metav1.NamespaceAll).List(r.Context(), opts)
		if err != nil {
			http.Error(w, fmt.Sprintf("Failed to list events: %v", err), http.StatusInternalServerError)
			return
		}
		events = eventList.Items
	}

	// Convert to API format
	eventInfo := make([]EventInfo, 0, len(events))
	for _, event := range events {
		eventInfo = append(eventInfo, EventInfo{
			Name:      event.Name,
			Namespace: event.Namespace,
			Type:      string(event.Type),
			Reason:    event.Reason,
			Message:   event.Message,
			Timestamp: event.LastTimestamp.Time.Format(time.RFC3339),
		})
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(map[string]interface{}{
		"events": eventInfo,
	}); err != nil {
		http.Error(w, "Failed to encode response", http.StatusInternalServerError)
	}
}

// handleRefreshClusters handles POST /api/clusters/refresh
func (ws *WebServer) handleRefreshClusters(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	if ws.clusterManager == nil {
		http.Error(w, "Cluster manager not initialized", http.StatusServiceUnavailable)
		return
	}

	if err := ws.clusterManager.Refresh(); err != nil {
		http.Error(w, fmt.Sprintf("Failed to refresh clusters: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": "Clusters refreshed successfully",
	})
}

// API response types
type ClusterInfo struct {
	Name        string `json:"name"`
	ClusterName string `json:"cluster_name"`
	SourceFile  string `json:"source_file"`
}

type NamespaceInfo struct {
	Name   string `json:"name"`
	Status string `json:"status"`
}

type PodInfo struct {
	Name      string `json:"name"`
	Namespace string `json:"namespace"`
	Status    string `json:"status"`
	Node      string `json:"node"`
}

type EventInfo struct {
	Name      string `json:"name"`
	Namespace string `json:"namespace"`
	Type      string `json:"type"`
	Reason    string `json:"reason"`
	Message   string `json:"message"`
	Timestamp string `json:"timestamp"`
}
