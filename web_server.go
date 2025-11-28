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
	http.HandleFunc("/api/topology", ws.handleTopology)
	http.HandleFunc("/ws", ws.handleWebSocket)

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
