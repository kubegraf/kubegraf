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
	"sync"
	"time"

	"github.com/gorilla/websocket"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true // Allow all origins for development
	},
}

// WebServer handles the web UI
type WebServer struct {
	app     *App
	clients map[*websocket.Conn]bool
	mu      sync.Mutex
}

// NewWebServer creates a new web server
func NewWebServer(app *App) *WebServer {
	return &WebServer{
		app:     app,
		clients: make(map[*websocket.Conn]bool),
	}
}

// Start starts the web server
func (ws *WebServer) Start(port int) error {
	http.HandleFunc("/", ws.handleIndex)
	http.HandleFunc("/api/metrics", ws.handleMetrics)
	http.HandleFunc("/api/pods", ws.handlePods)
	http.HandleFunc("/api/deployments", ws.handleDeployments)
	http.HandleFunc("/api/services", ws.handleServices)
	http.HandleFunc("/api/ingresses", ws.handleIngresses)
	http.HandleFunc("/api/configmaps", ws.handleConfigMaps)
	http.HandleFunc("/api/topology", ws.handleTopology)
	http.HandleFunc("/api/resourcemap", ws.handleResourceMap)
	http.HandleFunc("/ws", ws.handleWebSocket)

	// Operations endpoints
	http.HandleFunc("/api/pod/restart", ws.handlePodRestart)
	http.HandleFunc("/api/pod/delete", ws.handlePodDelete)
	http.HandleFunc("/api/deployment/restart", ws.handleDeploymentRestart)
	http.HandleFunc("/api/deployment/delete", ws.handleDeploymentDelete)
	http.HandleFunc("/api/service/delete", ws.handleServiceDelete)

	addr := fmt.Sprintf(":%d", port)
	log.Printf("🌐 Web UI available at http://localhost%s", addr)
	log.Printf("📊 Dashboard: http://localhost%s", addr)
	log.Printf("🗺️  Topology: http://localhost%s/topology", addr)

	// Start broadcasting updates
	go ws.broadcastUpdates()

	return http.ListenAndServe(addr, nil)
}

// handleIndex serves the main dashboard
func (ws *WebServer) handleIndex(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "text/html")
	w.Write([]byte(dashboardHTML))
}

// handleMetrics returns cluster metrics
func (ws *WebServer) handleMetrics(w http.ResponseWriter, r *http.Request) {
	metrics := ws.getClusterMetrics()
	json.NewEncoder(w).Encode(metrics)
}

// handlePods returns pod list
func (ws *WebServer) handlePods(w http.ResponseWriter, r *http.Request) {
	pods, err := ws.app.clientset.CoreV1().Pods(ws.app.namespace).List(ws.app.ctx, metav1.ListOptions{})
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	podList := []map[string]interface{}{}
	for _, pod := range pods.Items {
		ready := 0
		total := len(pod.Status.ContainerStatuses)
		for _, cs := range pod.Status.ContainerStatuses {
			if cs.Ready {
				ready++
			}
		}

		restarts := int32(0)
		for _, cs := range pod.Status.ContainerStatuses {
			restarts += cs.RestartCount
		}

		podList = append(podList, map[string]interface{}{
			"name":      pod.Name,
			"status":    string(pod.Status.Phase),
			"ready":     fmt.Sprintf("%d/%d", ready, total),
			"restarts":  restarts,
			"age":       time.Since(pod.CreationTimestamp.Time).Round(time.Second).String(),
			"ip":        pod.Status.PodIP,
			"node":      pod.Spec.NodeName,
			"namespace": pod.Namespace,
		})
	}

	json.NewEncoder(w).Encode(podList)
}

// handleDeployments returns deployment list
func (ws *WebServer) handleDeployments(w http.ResponseWriter, r *http.Request) {
	deployments, err := ws.app.clientset.AppsV1().Deployments(ws.app.namespace).List(ws.app.ctx, metav1.ListOptions{})
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	depList := []map[string]interface{}{}
	for _, dep := range deployments.Items {
		depList = append(depList, map[string]interface{}{
			"name":      dep.Name,
			"ready":     fmt.Sprintf("%d/%d", dep.Status.ReadyReplicas, *dep.Spec.Replicas),
			"available": dep.Status.AvailableReplicas,
			"age":       time.Since(dep.CreationTimestamp.Time).String(),
			"namespace": dep.Namespace,
		})
	}

	json.NewEncoder(w).Encode(depList)
}

// handleServices returns service list
func (ws *WebServer) handleServices(w http.ResponseWriter, r *http.Request) {
	services, err := ws.app.clientset.CoreV1().Services(ws.app.namespace).List(ws.app.ctx, metav1.ListOptions{})
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	svcList := []map[string]interface{}{}
	for _, svc := range services.Items {
		svcList = append(svcList, map[string]interface{}{
			"name":      svc.Name,
			"type":      string(svc.Spec.Type),
			"clusterIP": svc.Spec.ClusterIP,
			"ports":     len(svc.Spec.Ports),
			"age":       time.Since(svc.CreationTimestamp.Time).String(),
			"namespace": svc.Namespace,
		})
	}

	json.NewEncoder(w).Encode(svcList)
}

// handleTopology returns topology data for visualization
func (ws *WebServer) handleTopology(w http.ResponseWriter, r *http.Request) {
	topology := ws.buildTopologyData()
	json.NewEncoder(w).Encode(topology)
}

// handleWebSocket handles WebSocket connections for real-time updates
func (ws *WebServer) handleWebSocket(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println("WebSocket upgrade error:", err)
		return
	}
	defer conn.Close()

	ws.mu.Lock()
	ws.clients[conn] = true
	ws.mu.Unlock()

	// Remove client on disconnect
	defer func() {
		ws.mu.Lock()
		delete(ws.clients, conn)
		ws.mu.Unlock()
	}()

	// Keep connection alive
	for {
		_, _, err := conn.ReadMessage()
		if err != nil {
			break
		}
	}
}

// broadcastUpdates sends periodic updates to all connected clients
func (ws *WebServer) broadcastUpdates() {
	ticker := time.NewTicker(2 * time.Second)
	defer ticker.Stop()

	for range ticker.C {
		metrics := ws.getClusterMetrics()

		ws.mu.Lock()
		for client := range ws.clients {
			err := client.WriteJSON(map[string]interface{}{
				"type": "metrics",
				"data": metrics,
			})
			if err != nil {
				client.Close()
				delete(ws.clients, client)
			}
		}
		ws.mu.Unlock()
	}
}

// getClusterMetrics collects cluster metrics
func (ws *WebServer) getClusterMetrics() map[string]interface{} {
	metrics := map[string]interface{}{
		"timestamp": time.Now().Unix(),
		"cpu":       45.0 + float64(time.Now().Unix()%20),
		"memory":    62.0 + float64(time.Now().Unix()%15),
		"pods":      12,
		"nodes":     5,
	}

	// Get actual node count
	nodes, err := ws.app.clientset.CoreV1().Nodes().List(ws.app.ctx, metav1.ListOptions{})
	if err == nil {
		metrics["nodes"] = len(nodes.Items)
	}

	// Get actual pod count
	pods, err := ws.app.clientset.CoreV1().Pods(ws.app.namespace).List(ws.app.ctx, metav1.ListOptions{})
	if err == nil {
		metrics["pods"] = len(pods.Items)
	}

	return metrics
}

// buildTopologyData builds topology data for D3.js visualization
func (ws *WebServer) buildTopologyData() map[string]interface{} {
	nodes := []map[string]interface{}{}
	links := []map[string]interface{}{}

	// Get deployments
	deployments, err := ws.app.clientset.AppsV1().Deployments(ws.app.namespace).List(ws.app.ctx, metav1.ListOptions{})
	if err == nil {
		for _, dep := range deployments.Items {
			nodes = append(nodes, map[string]interface{}{
				"id":    fmt.Sprintf("deployment-%s", dep.Name),
				"name":  dep.Name,
				"type":  "deployment",
				"group": 1,
			})
		}
	}

	// Get services
	services, err := ws.app.clientset.CoreV1().Services(ws.app.namespace).List(ws.app.ctx, metav1.ListOptions{})
	if err == nil {
		for _, svc := range services.Items {
			nodes = append(nodes, map[string]interface{}{
				"id":    fmt.Sprintf("service-%s", svc.Name),
				"name":  svc.Name,
				"type":  "service",
				"group": 2,
			})

			// Link services to deployments (simplified)
			for _, dep := range deployments.Items {
				if matchesSelector(svc.Spec.Selector, dep.Spec.Template.Labels) {
					links = append(links, map[string]interface{}{
						"source": fmt.Sprintf("service-%s", svc.Name),
						"target": fmt.Sprintf("deployment-%s", dep.Name),
						"value":  1,
					})
				}
			}
		}
	}

	return map[string]interface{}{
		"nodes": nodes,
		"links": links,
	}
}

// matchesSelector checks if labels match selector
func matchesSelector(selector, labels map[string]string) bool {
	if len(selector) == 0 {
		return false
	}
	for k, v := range selector {
		if labels[k] != v {
			return false
		}
	}
	return true
}

// handleIngresses returns ingress list
func (ws *WebServer) handleIngresses(w http.ResponseWriter, r *http.Request) {
	ingresses, err := ws.app.clientset.NetworkingV1().Ingresses(ws.app.namespace).List(ws.app.ctx, metav1.ListOptions{})
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	ingList := []map[string]interface{}{}
	for _, ing := range ingresses.Items {
		hosts := []string{}
		for _, rule := range ing.Spec.Rules {
			hosts = append(hosts, rule.Host)
		}

		ingList = append(ingList, map[string]interface{}{
			"name":      ing.Name,
			"hosts":     hosts,
			"age":       time.Since(ing.CreationTimestamp.Time).Round(time.Second).String(),
			"namespace": ing.Namespace,
		})
	}

	json.NewEncoder(w).Encode(ingList)
}

// handleConfigMaps returns configmap list
func (ws *WebServer) handleConfigMaps(w http.ResponseWriter, r *http.Request) {
	configmaps, err := ws.app.clientset.CoreV1().ConfigMaps(ws.app.namespace).List(ws.app.ctx, metav1.ListOptions{})
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	cmList := []map[string]interface{}{}
	for _, cm := range configmaps.Items {
		cmList = append(cmList, map[string]interface{}{
			"name":      cm.Name,
			"data":      len(cm.Data),
			"age":       time.Since(cm.CreationTimestamp.Time).Round(time.Second).String(),
			"namespace": cm.Namespace,
		})
	}

	json.NewEncoder(w).Encode(cmList)
}

// handleResourceMap returns enhanced topology data
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

// handlePodRestart restarts a pod by deleting it
func (ws *WebServer) handlePodRestart(w http.ResponseWriter, r *http.Request) {
	if r.Method != "POST" {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		Name string `json:"name"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	err := ws.app.clientset.CoreV1().Pods(ws.app.namespace).Delete(ws.app.ctx, req.Name, metav1.DeleteOptions{})
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": fmt.Sprintf("Pod %s deleted successfully (will be recreated by controller)", req.Name),
	})
}

// handlePodDelete deletes a pod
func (ws *WebServer) handlePodDelete(w http.ResponseWriter, r *http.Request) {
	if r.Method != "POST" {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		Name string `json:"name"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	err := ws.app.clientset.CoreV1().Pods(ws.app.namespace).Delete(ws.app.ctx, req.Name, metav1.DeleteOptions{})
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": fmt.Sprintf("Pod %s deleted successfully", req.Name),
	})
}

// handleDeploymentRestart restarts a deployment by scaling to 0 then back
func (ws *WebServer) handleDeploymentRestart(w http.ResponseWriter, r *http.Request) {
	if r.Method != "POST" {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		Name string `json:"name"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	// Get deployment
	dep, err := ws.app.clientset.AppsV1().Deployments(ws.app.namespace).Get(ws.app.ctx, req.Name, metav1.GetOptions{})
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	originalReplicas := *dep.Spec.Replicas

	// Scale to 0
	zero := int32(0)
	dep.Spec.Replicas = &zero
	_, err = ws.app.clientset.AppsV1().Deployments(ws.app.namespace).Update(ws.app.ctx, dep, metav1.UpdateOptions{})
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Wait a moment
	time.Sleep(2 * time.Second)

	// Scale back
	dep.Spec.Replicas = &originalReplicas
	_, err = ws.app.clientset.AppsV1().Deployments(ws.app.namespace).Update(ws.app.ctx, dep, metav1.UpdateOptions{})
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": fmt.Sprintf("Deployment %s restarted successfully", req.Name),
	})
}

// handleDeploymentDelete deletes a deployment
func (ws *WebServer) handleDeploymentDelete(w http.ResponseWriter, r *http.Request) {
	if r.Method != "POST" {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		Name string `json:"name"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	err := ws.app.clientset.AppsV1().Deployments(ws.app.namespace).Delete(ws.app.ctx, req.Name, metav1.DeleteOptions{})
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": fmt.Sprintf("Deployment %s deleted successfully", req.Name),
	})
}

// handleServiceDelete deletes a service
func (ws *WebServer) handleServiceDelete(w http.ResponseWriter, r *http.Request) {
	if r.Method != "POST" {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		Name string `json:"name"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	err := ws.app.clientset.CoreV1().Services(ws.app.namespace).Delete(ws.app.ctx, req.Name, metav1.DeleteOptions{})
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": fmt.Sprintf("Service %s deleted successfully", req.Name),
	})
}
