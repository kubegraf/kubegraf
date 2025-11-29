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
	"bytes"
	"encoding/json"
	"fmt"
	"log"
	"net"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/gorilla/websocket"
	"gopkg.in/yaml.v2"
	v1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes/scheme"
	"k8s.io/client-go/tools/portforward"
	"k8s.io/client-go/tools/remotecommand"
	"k8s.io/client-go/transport/spdy"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true // Allow all origins for development
	},
}

// formatAge converts a duration to human-readable format (e.g., "5d", "3h", "45m")
func formatAge(d time.Duration) string {
	if d < 0 {
		d = -d
	}

	days := int(d.Hours() / 24)
	hours := int(d.Hours()) % 24
	minutes := int(d.Minutes()) % 60
	seconds := int(d.Seconds()) % 60

	if days > 0 {
		if hours > 0 {
			return fmt.Sprintf("%dd %dh", days, hours)
		}
		return fmt.Sprintf("%dd", days)
	}
	if hours > 0 {
		if minutes > 0 {
			return fmt.Sprintf("%dh %dm", hours, minutes)
		}
		return fmt.Sprintf("%dh", hours)
	}
	if minutes > 0 {
		return fmt.Sprintf("%dm", minutes)
	}
	return fmt.Sprintf("%ds", seconds)
}

// PortForwardSession tracks an active port-forward session
type PortForwardSession struct {
	ID         string    `json:"id"`
	Type       string    `json:"type"` // "pod" or "service"
	Name       string    `json:"name"`
	Namespace  string    `json:"namespace"`
	LocalPort  int       `json:"localPort"`
	RemotePort int       `json:"remotePort"`
	StartedAt  time.Time `json:"startedAt"`
	stopChan   chan struct{}
	readyChan  chan struct{}
}

// WebServer handles the web UI
type WebServer struct {
	app          *App
	clients      map[*websocket.Conn]bool
	mu           sync.Mutex
	portForwards map[string]*PortForwardSession
	pfMu         sync.Mutex
}

// NewWebServer creates a new web server
func NewWebServer(app *App) *WebServer {
	return &WebServer{
		app:          app,
		clients:      make(map[*websocket.Conn]bool),
		portForwards: make(map[string]*PortForwardSession),
	}
}

// Start starts the web server
func (ws *WebServer) Start(port int) error {
	http.HandleFunc("/", ws.handleIndex)
	http.HandleFunc("/api/status", ws.handleConnectionStatus)
	http.HandleFunc("/api/metrics", ws.handleMetrics)
	http.HandleFunc("/api/namespaces", ws.handleNamespaces)
	http.HandleFunc("/api/pods", ws.handlePods)
	http.HandleFunc("/api/deployments", ws.handleDeployments)
	http.HandleFunc("/api/statefulsets", ws.handleStatefulSets)
	http.HandleFunc("/api/daemonsets", ws.handleDaemonSets)
	http.HandleFunc("/api/services", ws.handleServices)
	http.HandleFunc("/api/ingresses", ws.handleIngresses)
	http.HandleFunc("/api/configmaps", ws.handleConfigMaps)
	http.HandleFunc("/api/cronjobs", ws.handleCronJobs)
	http.HandleFunc("/api/jobs", ws.handleJobs)
	http.HandleFunc("/api/nodes", ws.handleNodes)
	http.HandleFunc("/api/topology", ws.handleTopology)
	http.HandleFunc("/api/resourcemap", ws.handleResourceMap)
	http.HandleFunc("/ws", ws.handleWebSocket)

	// Operations endpoints
	http.HandleFunc("/api/pod/details", ws.handlePodDetails)
	http.HandleFunc("/api/pod/yaml", ws.handlePodYAML)
	http.HandleFunc("/api/pod/describe", ws.handlePodDescribe)
	http.HandleFunc("/api/pod/exec", ws.handlePodExec)
	http.HandleFunc("/api/pod/restart", ws.handlePodRestart)
	http.HandleFunc("/api/pod/delete", ws.handlePodDelete)
	http.HandleFunc("/api/deployment/details", ws.handleDeploymentDetails)
	http.HandleFunc("/api/deployment/yaml", ws.handleDeploymentYAML)
	http.HandleFunc("/api/deployment/describe", ws.handleDeploymentDescribe)
	http.HandleFunc("/api/deployment/restart", ws.handleDeploymentRestart)
	http.HandleFunc("/api/deployment/delete", ws.handleDeploymentDelete)
	http.HandleFunc("/api/statefulset/details", ws.handleStatefulSetDetails)
	http.HandleFunc("/api/statefulset/yaml", ws.handleStatefulSetYAML)
	http.HandleFunc("/api/statefulset/describe", ws.handleStatefulSetDescribe)
	http.HandleFunc("/api/statefulset/restart", ws.handleStatefulSetRestart)
	http.HandleFunc("/api/statefulset/delete", ws.handleStatefulSetDelete)
	http.HandleFunc("/api/daemonset/details", ws.handleDaemonSetDetails)
	http.HandleFunc("/api/daemonset/yaml", ws.handleDaemonSetYAML)
	http.HandleFunc("/api/daemonset/describe", ws.handleDaemonSetDescribe)
	http.HandleFunc("/api/daemonset/restart", ws.handleDaemonSetRestart)
	http.HandleFunc("/api/daemonset/delete", ws.handleDaemonSetDelete)
	http.HandleFunc("/api/cronjob/details", ws.handleCronJobDetails)
	http.HandleFunc("/api/cronjob/yaml", ws.handleCronJobYAML)
	http.HandleFunc("/api/cronjob/describe", ws.handleCronJobDescribe)
	http.HandleFunc("/api/cronjob/delete", ws.handleCronJobDelete)
	http.HandleFunc("/api/job/details", ws.handleJobDetails)
	http.HandleFunc("/api/job/yaml", ws.handleJobYAML)
	http.HandleFunc("/api/job/describe", ws.handleJobDescribe)
	http.HandleFunc("/api/job/delete", ws.handleJobDelete)
	http.HandleFunc("/api/service/details", ws.handleServiceDetails)
	http.HandleFunc("/api/service/yaml", ws.handleServiceYAML)
	http.HandleFunc("/api/service/describe", ws.handleServiceDescribe)
	http.HandleFunc("/api/service/delete", ws.handleServiceDelete)
	http.HandleFunc("/api/ingress/details", ws.handleIngressDetails)
	http.HandleFunc("/api/ingress/yaml", ws.handleIngressYAML)
	http.HandleFunc("/api/ingress/describe", ws.handleIngressDescribe)
	http.HandleFunc("/api/configmap/details", ws.handleConfigMapDetails)
	http.HandleFunc("/api/configmap/yaml", ws.handleConfigMapYAML)
	http.HandleFunc("/api/configmap/describe", ws.handleConfigMapDescribe)
	http.HandleFunc("/api/node/details", ws.handleNodeDetails)
	http.HandleFunc("/api/node/yaml", ws.handleNodeYAML)
	http.HandleFunc("/api/node/describe", ws.handleNodeDescribe)

	// Port-forward endpoints
	http.HandleFunc("/api/portforward/start", ws.handlePortForwardStart)
	http.HandleFunc("/api/portforward/stop", ws.handlePortForwardStop)
	http.HandleFunc("/api/portforward/list", ws.handlePortForwardList)

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

// handleConnectionStatus returns the cluster connection status
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
	})
}

// handleMetrics returns cluster metrics
func (ws *WebServer) handleMetrics(w http.ResponseWriter, r *http.Request) {
	metrics := ws.getClusterMetrics()
	json.NewEncoder(w).Encode(metrics)
}

// handlePods returns pod list
func (ws *WebServer) handlePods(w http.ResponseWriter, r *http.Request) {
	namespace := r.URL.Query().Get("namespace")
	// Empty namespace means "all namespaces" in Kubernetes
	// Only default to app.namespace if namespace param is not provided at all
	if !r.URL.Query().Has("namespace") {
		namespace = ws.app.namespace
	}
	pods, err := ws.app.clientset.CoreV1().Pods(namespace).List(ws.app.ctx, metav1.ListOptions{})
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	podList := []map[string]interface{}{}
	for _, pod := range pods.Items {
		// Calculate ready count from container statuses
		ready := 0
		total := len(pod.Spec.Containers)
		for _, cs := range pod.Status.ContainerStatuses {
			if cs.Ready {
				ready++
			}
		}

		// Calculate total restarts
		restarts := int32(0)
		for _, cs := range pod.Status.ContainerStatuses {
			restarts += cs.RestartCount
		}

		// Determine actual status
		status := string(pod.Status.Phase)
		if pod.DeletionTimestamp != nil {
			status = "Terminating"
		} else if pod.Status.Phase == "Pending" {
			// Check container statuses for more detail
			for _, cs := range pod.Status.ContainerStatuses {
				if cs.State.Waiting != nil {
					status = cs.State.Waiting.Reason
					break
				}
			}
		} else if pod.Status.Phase == "Running" {
			// Check if all containers are actually ready
			allReady := true
			for _, cs := range pod.Status.ContainerStatuses {
				if !cs.Ready {
					allReady = false
					if cs.State.Waiting != nil {
						status = cs.State.Waiting.Reason
					}
					break
				}
			}
			if allReady && ready == total {
				status = "Running"
			}
		}

		// Get metrics for this pod if available
		cpu := "-"
		memory := "-"
		if ws.app.metricsClient != nil {
			if metrics, err := ws.app.metricsClient.MetricsV1beta1().PodMetricses(namespace).Get(ws.app.ctx, pod.Name, metav1.GetOptions{}); err == nil {
				var totalCPU, totalMemory int64
				for _, cm := range metrics.Containers {
					totalCPU += cm.Usage.Cpu().MilliValue()
					totalMemory += cm.Usage.Memory().Value()
				}
				cpu = fmt.Sprintf("%dm", totalCPU)
				memory = fmt.Sprintf("%.0fMi", float64(totalMemory)/(1024*1024))
			}
		}

		podList = append(podList, map[string]interface{}{
			"name":      pod.Name,
			"status":    status,
			"ready":     fmt.Sprintf("%d/%d", ready, total),
			"restarts":  restarts,
			"age":       formatAge(time.Since(pod.CreationTimestamp.Time)),
			"ip":        pod.Status.PodIP,
			"node":      pod.Spec.NodeName,
			"namespace": pod.Namespace,
			"cpu":       cpu,
			"memory":    memory,
		})
	}

	json.NewEncoder(w).Encode(podList)
}

// handleDeployments returns deployment list
func (ws *WebServer) handleDeployments(w http.ResponseWriter, r *http.Request) {
	namespace := r.URL.Query().Get("namespace")
	if !r.URL.Query().Has("namespace") {
		namespace = ws.app.namespace
	}
	deployments, err := ws.app.clientset.AppsV1().Deployments(namespace).List(ws.app.ctx, metav1.ListOptions{})
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
			"age":       formatAge(time.Since(dep.CreationTimestamp.Time)),
			"namespace": dep.Namespace,
		})
	}

	json.NewEncoder(w).Encode(depList)
}

// handleStatefulSets returns statefulset list
func (ws *WebServer) handleStatefulSets(w http.ResponseWriter, r *http.Request) {
	namespace := r.URL.Query().Get("namespace")
	if !r.URL.Query().Has("namespace") {
		namespace = ws.app.namespace
	}
	statefulsets, err := ws.app.clientset.AppsV1().StatefulSets(namespace).List(ws.app.ctx, metav1.ListOptions{})
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	ssList := []map[string]interface{}{}
	for _, ss := range statefulsets.Items {
		ssList = append(ssList, map[string]interface{}{
			"name":      ss.Name,
			"ready":     fmt.Sprintf("%d/%d", ss.Status.ReadyReplicas, *ss.Spec.Replicas),
			"available": ss.Status.ReadyReplicas,
			"age":       formatAge(time.Since(ss.CreationTimestamp.Time)),
			"namespace": ss.Namespace,
		})
	}

	json.NewEncoder(w).Encode(ssList)
}

// handleDaemonSets returns daemonset list
func (ws *WebServer) handleDaemonSets(w http.ResponseWriter, r *http.Request) {
	namespace := r.URL.Query().Get("namespace")
	if !r.URL.Query().Has("namespace") {
		namespace = ws.app.namespace
	}
	daemonsets, err := ws.app.clientset.AppsV1().DaemonSets(namespace).List(ws.app.ctx, metav1.ListOptions{})
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	dsList := []map[string]interface{}{}
	for _, ds := range daemonsets.Items {
		dsList = append(dsList, map[string]interface{}{
			"name":      ds.Name,
			"desired":   ds.Status.DesiredNumberScheduled,
			"current":   ds.Status.CurrentNumberScheduled,
			"ready":     fmt.Sprintf("%d/%d", ds.Status.NumberReady, ds.Status.DesiredNumberScheduled),
			"available": ds.Status.NumberAvailable,
			"age":       formatAge(time.Since(ds.CreationTimestamp.Time)),
			"namespace": ds.Namespace,
		})
	}

	json.NewEncoder(w).Encode(dsList)
}

// handleServices returns service list
func (ws *WebServer) handleServices(w http.ResponseWriter, r *http.Request) {
	namespace := r.URL.Query().Get("namespace")
	if !r.URL.Query().Has("namespace") {
		namespace = ws.app.namespace
	}
	services, err := ws.app.clientset.CoreV1().Services(namespace).List(ws.app.ctx, metav1.ListOptions{})
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
			"age":       formatAge(time.Since(svc.CreationTimestamp.Time)),
			"namespace": svc.Namespace,
		})
	}

	json.NewEncoder(w).Encode(svcList)
}

// handleNodes returns node list
func (ws *WebServer) handleNodes(w http.ResponseWriter, r *http.Request) {
	nodes, err := ws.app.clientset.CoreV1().Nodes().List(ws.app.ctx, metav1.ListOptions{})
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	nodeList := []map[string]interface{}{}
	for _, node := range nodes.Items {
		// Determine node status
		status := "Unknown"
		for _, condition := range node.Status.Conditions {
			if condition.Type == v1.NodeReady {
				if condition.Status == v1.ConditionTrue {
					status = "Ready"
				} else {
					status = "NotReady"
				}
				break
			}
		}

		// Get node roles
		roles := "worker"
		for label := range node.Labels {
			if strings.Contains(label, "node-role.kubernetes.io/control-plane") || strings.Contains(label, "node-role.kubernetes.io/master") {
				roles = "control-plane"
				break
			}
		}

		// Get CPU and Memory capacity
		cpu := node.Status.Capacity.Cpu().String()

		// Convert memory to a readable format
		memoryBytes := node.Status.Capacity.Memory().Value()
		memoryGi := float64(memoryBytes) / (1024 * 1024 * 1024)
		memory := fmt.Sprintf("%.1fGi", memoryGi)

		// Get metrics for this node if available
		cpuUsage := "-"
		memoryUsage := "-"
		if ws.app.metricsClient != nil {
			if metrics, err := ws.app.metricsClient.MetricsV1beta1().NodeMetricses().Get(ws.app.ctx, node.Name, metav1.GetOptions{}); err == nil {
				cpuMillis := metrics.Usage.Cpu().MilliValue()
				memUsed := metrics.Usage.Memory().Value()
				memUsedMi := float64(memUsed) / (1024 * 1024)
				cpuUsage = fmt.Sprintf("%dm", cpuMillis)
				memoryUsage = fmt.Sprintf("%.0fMi", memUsedMi)
			}
		}

		nodeList = append(nodeList, map[string]interface{}{
			"name":        node.Name,
			"status":      status,
			"roles":       roles,
			"version":     node.Status.NodeInfo.KubeletVersion,
			"cpu":         cpu,
			"cpuUsage":    cpuUsage,
			"memory":      memory,
			"memoryUsage": memoryUsage,
			"age":         formatAge(time.Since(node.CreationTimestamp.Time)),
		})
	}

	json.NewEncoder(w).Encode(nodeList)
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
		"timestamp":   time.Now().Unix(),
		"cpu":         45.0 + float64(time.Now().Unix()%20),
		"memory":      62.0 + float64(time.Now().Unix()%15),
		"pods":        12,
		"nodes":       5,
		"clusterName": ws.app.cluster,
		"namespace":   ws.app.namespace,
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
	namespace := r.URL.Query().Get("namespace")
	if !r.URL.Query().Has("namespace") {
		namespace = ws.app.namespace
	}
	ingresses, err := ws.app.clientset.NetworkingV1().Ingresses(namespace).List(ws.app.ctx, metav1.ListOptions{})
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
			"age":       formatAge(time.Since(ing.CreationTimestamp.Time)),
			"namespace": ing.Namespace,
		})
	}

	json.NewEncoder(w).Encode(ingList)
}

// handleConfigMaps returns configmap list
func (ws *WebServer) handleConfigMaps(w http.ResponseWriter, r *http.Request) {
	namespace := r.URL.Query().Get("namespace")
	if !r.URL.Query().Has("namespace") {
		namespace = ws.app.namespace
	}
	configmaps, err := ws.app.clientset.CoreV1().ConfigMaps(namespace).List(ws.app.ctx, metav1.ListOptions{})
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	cmList := []map[string]interface{}{}
	for _, cm := range configmaps.Items {
		cmList = append(cmList, map[string]interface{}{
			"name":      cm.Name,
			"data":      len(cm.Data),
			"age":       formatAge(time.Since(cm.CreationTimestamp.Time)),
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

	// Generate YAML
	yamlData, _ := yaml.Marshal(pod)

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

// handlePodExec executes a command in a pod container
func (ws *WebServer) handlePodExec(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if r.Method != "POST" {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Method not allowed",
		})
		return
	}

	var req struct {
		Pod       string `json:"pod"`
		Container string `json:"container"`
		Command   string `json:"command"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Invalid request: " + err.Error(),
		})
		return
	}

	// Parse command into shell arguments
	cmdArgs := []string{"/bin/sh", "-c", req.Command}

	// Create exec request
	execReq := ws.app.clientset.CoreV1().RESTClient().Post().
		Resource("pods").
		Name(req.Pod).
		Namespace(ws.app.namespace).
		SubResource("exec").
		VersionedParams(&v1.PodExecOptions{
			Container: req.Container,
			Command:   cmdArgs,
			Stdin:     false,
			Stdout:    true,
			Stderr:    true,
			TTY:       false,
		}, scheme.ParameterCodec)

	// Execute command
	exec, err := remotecommand.NewSPDYExecutor(ws.app.config, "POST", execReq.URL())
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Failed to create executor: " + err.Error(),
		})
		return
	}

	var stdout, stderr bytes.Buffer
	err = exec.StreamWithContext(ws.app.ctx, remotecommand.StreamOptions{
		Stdout: &stdout,
		Stderr: &stderr,
	})

	output := strings.TrimSpace(stdout.String())
	if stderr.Len() > 0 {
		output += "\n" + strings.TrimSpace(stderr.String())
	}

	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   err.Error(),
			"output":  output,
		})
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"output":  output,
	})
}

// handlePodRestart restarts a pod by deleting it
func (ws *WebServer) handlePodRestart(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if r.Method != "POST" {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Method not allowed",
		})
		return
	}

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

	err := ws.app.clientset.CoreV1().Pods(namespace).Delete(ws.app.ctx, name, metav1.DeleteOptions{})
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": fmt.Sprintf("Pod %s restarted successfully (will be recreated by controller)", name),
	})
}

// handlePodDelete deletes a pod
func (ws *WebServer) handlePodDelete(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if r.Method != "POST" {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Method not allowed",
		})
		return
	}

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

	err := ws.app.clientset.CoreV1().Pods(namespace).Delete(ws.app.ctx, name, metav1.DeleteOptions{})
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": fmt.Sprintf("Pod %s deleted successfully", name),
	})
}

// handleDeploymentRestart restarts a deployment by scaling to 0 then back
func (ws *WebServer) handleDeploymentRestart(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if r.Method != "POST" {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Method not allowed",
		})
		return
	}

	name := r.URL.Query().Get("name")
	if name == "" {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Deployment name is required",
		})
		return
	}

	// Get deployment
	dep, err := ws.app.clientset.AppsV1().Deployments(ws.app.namespace).Get(ws.app.ctx, name, metav1.GetOptions{})
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	originalReplicas := *dep.Spec.Replicas

	// Scale to 0
	zero := int32(0)
	dep.Spec.Replicas = &zero
	_, err = ws.app.clientset.AppsV1().Deployments(ws.app.namespace).Update(ws.app.ctx, dep, metav1.UpdateOptions{})
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	// Wait a moment
	time.Sleep(2 * time.Second)

	// Refetch deployment to get latest resource version
	dep, err = ws.app.clientset.AppsV1().Deployments(ws.app.namespace).Get(ws.app.ctx, name, metav1.GetOptions{})
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	// Scale back
	dep.Spec.Replicas = &originalReplicas
	_, err = ws.app.clientset.AppsV1().Deployments(ws.app.namespace).Update(ws.app.ctx, dep, metav1.UpdateOptions{})
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": fmt.Sprintf("Deployment %s restarted successfully", name),
	})
}

// handleDeploymentDelete deletes a deployment
func (ws *WebServer) handleDeploymentDelete(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if r.Method != "POST" {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Method not allowed",
		})
		return
	}

	name := r.URL.Query().Get("name")
	if name == "" {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Deployment name is required",
		})
		return
	}

	err := ws.app.clientset.AppsV1().Deployments(ws.app.namespace).Delete(ws.app.ctx, name, metav1.DeleteOptions{})
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": fmt.Sprintf("Deployment %s deleted successfully", name),
	})
}

// handleServiceDelete deletes a service
func (ws *WebServer) handleServiceDelete(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if r.Method != "POST" {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Method not allowed",
		})
		return
	}

	name := r.URL.Query().Get("name")
	if name == "" {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Service name is required",
		})
		return
	}

	namespace := r.URL.Query().Get("namespace")
	if !r.URL.Query().Has("namespace") {
		namespace = ws.app.namespace
	}

	err := ws.app.clientset.CoreV1().Services(namespace).Delete(ws.app.ctx, name, metav1.DeleteOptions{})
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": fmt.Sprintf("Service %s deleted successfully", name),
	})
}

// handleDeploymentDetails returns detailed information about a deployment
func (ws *WebServer) handleDeploymentDetails(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	name := r.URL.Query().Get("name")
	if name == "" {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Deployment name is required",
		})
		return
	}

	dep, err := ws.app.clientset.AppsV1().Deployments(ws.app.namespace).Get(ws.app.ctx, name, metav1.GetOptions{})
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	// Format selector as string
	selector := metav1.FormatLabelSelector(dep.Spec.Selector)

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success":   true,
		"name":      dep.Name,
		"ready":     fmt.Sprintf("%d/%d", dep.Status.ReadyReplicas, *dep.Spec.Replicas),
		"available": fmt.Sprintf("%d/%d", dep.Status.AvailableReplicas, *dep.Spec.Replicas),
		"strategy":  string(dep.Spec.Strategy.Type),
		"selector":  selector,
		"age":       formatAge(time.Since(dep.CreationTimestamp.Time)),
	})
}

// handleServiceDetails returns detailed information about a service
func (ws *WebServer) handleServiceDetails(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	name := r.URL.Query().Get("name")
	if name == "" {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Service name is required",
		})
		return
	}

	namespace := r.URL.Query().Get("namespace")
	if !r.URL.Query().Has("namespace") {
		namespace = ws.app.namespace
	}

	svc, err := ws.app.clientset.CoreV1().Services(namespace).Get(ws.app.ctx, name, metav1.GetOptions{})
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	// Format ports as string
	portsList := []string{}
	for _, port := range svc.Spec.Ports {
		portStr := fmt.Sprintf("%d/%s", port.Port, port.Protocol)
		if port.NodePort != 0 {
			portStr += fmt.Sprintf(":%d", port.NodePort)
		}
		portsList = append(portsList, portStr)
	}
	portsStr := strings.Join(portsList, ", ")
	if portsStr == "" {
		portsStr = "-"
	}

	// Format selector as string
	selector := ""
	if len(svc.Spec.Selector) > 0 {
		selectors := []string{}
		for k, v := range svc.Spec.Selector {
			selectors = append(selectors, fmt.Sprintf("%s=%s", k, v))
		}
		selector = strings.Join(selectors, ",")
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success":   true,
		"name":      svc.Name,
		"type":      string(svc.Spec.Type),
		"clusterIP": svc.Spec.ClusterIP,
		"ports":     portsStr,
		"selector":  selector,
		"age":       formatAge(time.Since(svc.CreationTimestamp.Time)),
	})
}

// handleIngressDetails returns detailed information about an ingress
func (ws *WebServer) handleIngressDetails(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	name := r.URL.Query().Get("name")
	if name == "" {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Ingress name is required",
		})
		return
	}

	ing, err := ws.app.clientset.NetworkingV1().Ingresses(ws.app.namespace).Get(ws.app.ctx, name, metav1.GetOptions{})
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	// Format hosts as string
	hosts := []string{}
	for _, rule := range ing.Spec.Rules {
		if rule.Host != "" {
			hosts = append(hosts, rule.Host)
		}
	}
	hostsStr := strings.Join(hosts, ", ")
	if hostsStr == "" {
		hostsStr = "*"
	}

	className := ""
	if ing.Spec.IngressClassName != nil {
		className = *ing.Spec.IngressClassName
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"name":    ing.Name,
		"hosts":   hostsStr,
		"class":   className,
		"age":     formatAge(time.Since(ing.CreationTimestamp.Time)),
	})
}

// handleConfigMapDetails returns detailed information about a configmap
func (ws *WebServer) handleConfigMapDetails(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	name := r.URL.Query().Get("name")
	if name == "" {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "ConfigMap name is required",
		})
		return
	}

	cm, err := ws.app.clientset.CoreV1().ConfigMaps(ws.app.namespace).Get(ws.app.ctx, name, metav1.GetOptions{})
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	// Format keys as string
	keys := []string{}
	for key := range cm.Data {
		keys = append(keys, key)
	}
	for key := range cm.BinaryData {
		keys = append(keys, key+" (binary)")
	}
	keysStr := strings.Join(keys, ", ")
	if keysStr == "" {
		keysStr = "-"
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"name":    cm.Name,
		"keys":    keysStr,
		"age":     formatAge(time.Since(cm.CreationTimestamp.Time)),
	})
}

// handlePodYAML returns the YAML definition of a pod
func (ws *WebServer) handlePodYAML(w http.ResponseWriter, r *http.Request) {
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

	pod, err := ws.app.clientset.CoreV1().Pods(namespace).Get(ws.app.ctx, name, metav1.GetOptions{})
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	// Remove managed fields for cleaner YAML
	pod.ManagedFields = nil

	yamlData, err := yaml.Marshal(pod)
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Failed to marshal YAML: " + err.Error(),
		})
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"yaml":    string(yamlData),
	})
}

// handlePodDescribe returns the describe output for a pod
func (ws *WebServer) handlePodDescribe(w http.ResponseWriter, r *http.Request) {
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

	pod, err := ws.app.clientset.CoreV1().Pods(namespace).Get(ws.app.ctx, name, metav1.GetOptions{})
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	// Get events for this pod
	events, _ := ws.app.clientset.CoreV1().Events(namespace).List(ws.app.ctx, metav1.ListOptions{
		FieldSelector: fmt.Sprintf("involvedObject.name=%s,involvedObject.kind=Pod", name),
	})

	// Build describe output similar to kubectl describe
	var describe strings.Builder
	describe.WriteString(fmt.Sprintf("Name:         %s\n", pod.Name))
	describe.WriteString(fmt.Sprintf("Namespace:    %s\n", pod.Namespace))
	describe.WriteString(fmt.Sprintf("Node:         %s\n", pod.Spec.NodeName))
	describe.WriteString(fmt.Sprintf("Start Time:   %s\n", pod.CreationTimestamp.String()))
	describe.WriteString(fmt.Sprintf("Status:       %s\n", pod.Status.Phase))
	describe.WriteString(fmt.Sprintf("IP:           %s\n", pod.Status.PodIP))

	// Labels
	if len(pod.Labels) > 0 {
		describe.WriteString("\nLabels:\n")
		for k, v := range pod.Labels {
			describe.WriteString(fmt.Sprintf("  %s=%s\n", k, v))
		}
	}

	// Annotations
	if len(pod.Annotations) > 0 {
		describe.WriteString("\nAnnotations:\n")
		for k, v := range pod.Annotations {
			describe.WriteString(fmt.Sprintf("  %s=%s\n", k, v))
		}
	}

	// Containers
	describe.WriteString("\nContainers:\n")
	for _, container := range pod.Spec.Containers {
		describe.WriteString(fmt.Sprintf("  %s:\n", container.Name))
		describe.WriteString(fmt.Sprintf("    Image:         %s\n", container.Image))
		describe.WriteString(fmt.Sprintf("    Image Pull Policy: %s\n", container.ImagePullPolicy))
		if len(container.Ports) > 0 {
			describe.WriteString("    Ports:\n")
			for _, port := range container.Ports {
				describe.WriteString(fmt.Sprintf("      %d/%s\n", port.ContainerPort, port.Protocol))
			}
		}
	}

	// Conditions
	describe.WriteString("\nConditions:\n")
	describe.WriteString("  Type              Status\n")
	for _, condition := range pod.Status.Conditions {
		describe.WriteString(fmt.Sprintf("  %-17s %s\n", condition.Type, condition.Status))
	}

	// Events
	if len(events.Items) > 0 {
		describe.WriteString("\nEvents:\n")
		describe.WriteString("  Type    Reason   Age   Message\n")
		for _, event := range events.Items {
			age := formatAge(time.Since(event.LastTimestamp.Time))
			describe.WriteString(fmt.Sprintf("  %-7s %-8s %-5s %s\n",
				event.Type,
				event.Reason,
				age,
				event.Message))
		}
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success":  true,
		"describe": describe.String(),
	})
}

// handleDeploymentYAML returns the YAML representation of a deployment
func (ws *WebServer) handleDeploymentYAML(w http.ResponseWriter, r *http.Request) {
	name := r.URL.Query().Get("name")
	if name == "" {
		http.Error(w, "deployment name required", http.StatusBadRequest)
		return
	}

	deployment, err := ws.app.clientset.AppsV1().Deployments(ws.app.namespace).Get(ws.app.ctx, name, metav1.GetOptions{})
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Convert to YAML
	yamlData, err := yaml.Marshal(deployment)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"yaml":    string(yamlData),
	})
}

// handleDeploymentDescribe returns kubectl describe-style output for a deployment
func (ws *WebServer) handleDeploymentDescribe(w http.ResponseWriter, r *http.Request) {
	name := r.URL.Query().Get("name")
	if name == "" {
		http.Error(w, "deployment name required", http.StatusBadRequest)
		return
	}

	deployment, err := ws.app.clientset.AppsV1().Deployments(ws.app.namespace).Get(ws.app.ctx, name, metav1.GetOptions{})
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Get related ReplicaSets
	replicaSets, _ := ws.app.clientset.AppsV1().ReplicaSets(ws.app.namespace).List(ws.app.ctx, metav1.ListOptions{
		LabelSelector: metav1.FormatLabelSelector(deployment.Spec.Selector),
	})

	// Get events
	events, _ := ws.app.clientset.CoreV1().Events(ws.app.namespace).List(ws.app.ctx, metav1.ListOptions{
		FieldSelector: fmt.Sprintf("involvedObject.name=%s,involvedObject.kind=Deployment", name),
	})

	var describe strings.Builder
	describe.WriteString(fmt.Sprintf("Name:               %s\n", deployment.Name))
	describe.WriteString(fmt.Sprintf("Namespace:          %s\n", deployment.Namespace))
	describe.WriteString(fmt.Sprintf("CreationTimestamp:  %s\n", deployment.CreationTimestamp.String()))

	// Labels
	if len(deployment.Labels) > 0 {
		describe.WriteString("Labels:             ")
		labels := []string{}
		for k, v := range deployment.Labels {
			labels = append(labels, fmt.Sprintf("%s=%s", k, v))
		}
		describe.WriteString(strings.Join(labels, "\n                    "))
		describe.WriteString("\n")
	}

	// Selector
	describe.WriteString(fmt.Sprintf("Selector:           %s\n", metav1.FormatLabelSelector(deployment.Spec.Selector)))
	describe.WriteString(fmt.Sprintf("Replicas:           %d desired | %d updated | %d total | %d available | %d unavailable\n",
		*deployment.Spec.Replicas,
		deployment.Status.UpdatedReplicas,
		deployment.Status.Replicas,
		deployment.Status.AvailableReplicas,
		deployment.Status.UnavailableReplicas))

	// Strategy
	describe.WriteString(fmt.Sprintf("StrategyType:       %s\n", deployment.Spec.Strategy.Type))
	if deployment.Spec.Strategy.RollingUpdate != nil {
		describe.WriteString(fmt.Sprintf("RollingUpdateStrategy:  %s max unavailable, %s max surge\n",
			deployment.Spec.Strategy.RollingUpdate.MaxUnavailable.String(),
			deployment.Spec.Strategy.RollingUpdate.MaxSurge.String()))
	}

	// Pod Template
	describe.WriteString("\nPod Template:\n")
	describe.WriteString("  Containers:\n")
	for _, container := range deployment.Spec.Template.Spec.Containers {
		describe.WriteString(fmt.Sprintf("   %s:\n", container.Name))
		describe.WriteString(fmt.Sprintf("    Image:      %s\n", container.Image))
		if len(container.Ports) > 0 {
			describe.WriteString("    Ports:\n")
			for _, port := range container.Ports {
				describe.WriteString(fmt.Sprintf("      %d/%s\n", port.ContainerPort, port.Protocol))
			}
		}
	}

	// Conditions
	if len(deployment.Status.Conditions) > 0 {
		describe.WriteString("\nConditions:\n")
		describe.WriteString("  Type           Status  Reason\n")
		for _, condition := range deployment.Status.Conditions {
			describe.WriteString(fmt.Sprintf("  %-14s %-7s %s\n", condition.Type, condition.Status, condition.Reason))
		}
	}

	// ReplicaSets
	if replicaSets != nil && len(replicaSets.Items) > 0 {
		describe.WriteString("\nOldReplicaSets:  ")
		rsNames := []string{}
		for _, rs := range replicaSets.Items {
			rsNames = append(rsNames, fmt.Sprintf("%s (%d/%d replicas)", rs.Name, rs.Status.ReadyReplicas, *rs.Spec.Replicas))
		}
		describe.WriteString(strings.Join(rsNames, ", "))
		describe.WriteString("\n")
	}

	// Events
	if events != nil && len(events.Items) > 0 {
		describe.WriteString("\nEvents:\n")
		describe.WriteString("  Type    Reason   Age   Message\n")
		for _, event := range events.Items {
			age := formatAge(time.Since(event.LastTimestamp.Time))
			describe.WriteString(fmt.Sprintf("  %-7s %-8s %-5s %s\n",
				event.Type,
				event.Reason,
				age,
				event.Message))
		}
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success":  true,
		"describe": describe.String(),
	})
}

// handleServiceYAML returns the YAML representation of a service
func (ws *WebServer) handleServiceYAML(w http.ResponseWriter, r *http.Request) {
	name := r.URL.Query().Get("name")
	if name == "" {
		http.Error(w, "service name required", http.StatusBadRequest)
		return
	}

	namespace := r.URL.Query().Get("namespace")
	if !r.URL.Query().Has("namespace") {
		namespace = ws.app.namespace
	}

	service, err := ws.app.clientset.CoreV1().Services(namespace).Get(ws.app.ctx, name, metav1.GetOptions{})
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Convert to YAML
	yamlData, err := yaml.Marshal(service)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"yaml":    string(yamlData),
	})
}

// handleServiceDescribe returns kubectl describe-style output for a service
func (ws *WebServer) handleServiceDescribe(w http.ResponseWriter, r *http.Request) {
	name := r.URL.Query().Get("name")
	if name == "" {
		http.Error(w, "service name required", http.StatusBadRequest)
		return
	}

	namespace := r.URL.Query().Get("namespace")
	if !r.URL.Query().Has("namespace") {
		namespace = ws.app.namespace
	}

	service, err := ws.app.clientset.CoreV1().Services(namespace).Get(ws.app.ctx, name, metav1.GetOptions{})
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Get events
	events, _ := ws.app.clientset.CoreV1().Events(namespace).List(ws.app.ctx, metav1.ListOptions{
		FieldSelector: fmt.Sprintf("involvedObject.name=%s,involvedObject.kind=Service", name),
	})

	// Get endpoints
	endpoints, _ := ws.app.clientset.CoreV1().Endpoints(ws.app.namespace).Get(ws.app.ctx, name, metav1.GetOptions{})

	var describe strings.Builder
	describe.WriteString(fmt.Sprintf("Name:              %s\n", service.Name))
	describe.WriteString(fmt.Sprintf("Namespace:         %s\n", service.Namespace))
	describe.WriteString(fmt.Sprintf("CreationTimestamp: %s\n", service.CreationTimestamp.String()))

	// Labels
	if len(service.Labels) > 0 {
		describe.WriteString("Labels:            ")
		labels := []string{}
		for k, v := range service.Labels {
			labels = append(labels, fmt.Sprintf("%s=%s", k, v))
		}
		describe.WriteString(strings.Join(labels, "\n                   "))
		describe.WriteString("\n")
	}

	// Selector
	if len(service.Spec.Selector) > 0 {
		describe.WriteString("Selector:          ")
		selectors := []string{}
		for k, v := range service.Spec.Selector {
			selectors = append(selectors, fmt.Sprintf("%s=%s", k, v))
		}
		describe.WriteString(strings.Join(selectors, ","))
		describe.WriteString("\n")
	}

	describe.WriteString(fmt.Sprintf("Type:              %s\n", service.Spec.Type))
	describe.WriteString(fmt.Sprintf("IP:                %s\n", service.Spec.ClusterIP))

	if service.Spec.Type == v1.ServiceTypeLoadBalancer {
		lbIngress := ""
		if len(service.Status.LoadBalancer.Ingress) > 0 {
			if service.Status.LoadBalancer.Ingress[0].IP != "" {
				lbIngress = service.Status.LoadBalancer.Ingress[0].IP
			} else if service.Status.LoadBalancer.Ingress[0].Hostname != "" {
				lbIngress = service.Status.LoadBalancer.Ingress[0].Hostname
			}
		}
		if lbIngress != "" {
			describe.WriteString(fmt.Sprintf("LoadBalancer Ingress: %s\n", lbIngress))
		}
	}

	// Ports
	if len(service.Spec.Ports) > 0 {
		describe.WriteString("Port(s):           ")
		ports := []string{}
		for _, port := range service.Spec.Ports {
			portStr := fmt.Sprintf("%d/%s", port.Port, port.Protocol)
			if port.NodePort != 0 {
				portStr += fmt.Sprintf(" (NodePort: %d)", port.NodePort)
			}
			ports = append(ports, portStr)
		}
		describe.WriteString(strings.Join(ports, ", "))
		describe.WriteString("\n")
	}

	// Endpoints
	if endpoints != nil {
		describe.WriteString("Endpoints:         ")
		endpointList := []string{}
		for _, subset := range endpoints.Subsets {
			for _, addr := range subset.Addresses {
				for _, port := range subset.Ports {
					endpointList = append(endpointList, fmt.Sprintf("%s:%d", addr.IP, port.Port))
				}
			}
		}
		if len(endpointList) > 0 {
			describe.WriteString(strings.Join(endpointList, ","))
		} else {
			describe.WriteString("<none>")
		}
		describe.WriteString("\n")
	}

	// Session Affinity
	describe.WriteString(fmt.Sprintf("Session Affinity:  %s\n", service.Spec.SessionAffinity))

	// Events
	if events != nil && len(events.Items) > 0 {
		describe.WriteString("\nEvents:\n")
		describe.WriteString("  Type    Reason   Age   Message\n")
		for _, event := range events.Items {
			age := formatAge(time.Since(event.LastTimestamp.Time))
			describe.WriteString(fmt.Sprintf("  %-7s %-8s %-5s %s\n",
				event.Type,
				event.Reason,
				age,
				event.Message))
		}
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success":  true,
		"describe": describe.String(),
	})
}

// handleIngressYAML returns the YAML representation of an ingress
func (ws *WebServer) handleIngressYAML(w http.ResponseWriter, r *http.Request) {
	name := r.URL.Query().Get("name")
	if name == "" {
		http.Error(w, "ingress name required", http.StatusBadRequest)
		return
	}

	ingress, err := ws.app.clientset.NetworkingV1().Ingresses(ws.app.namespace).Get(ws.app.ctx, name, metav1.GetOptions{})
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Convert to YAML
	yamlData, err := yaml.Marshal(ingress)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"yaml":    string(yamlData),
	})
}

// handleIngressDescribe returns kubectl describe-style output for an ingress
func (ws *WebServer) handleIngressDescribe(w http.ResponseWriter, r *http.Request) {
	name := r.URL.Query().Get("name")
	if name == "" {
		http.Error(w, "ingress name required", http.StatusBadRequest)
		return
	}

	ingress, err := ws.app.clientset.NetworkingV1().Ingresses(ws.app.namespace).Get(ws.app.ctx, name, metav1.GetOptions{})
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Get events
	events, _ := ws.app.clientset.CoreV1().Events(ws.app.namespace).List(ws.app.ctx, metav1.ListOptions{
		FieldSelector: fmt.Sprintf("involvedObject.name=%s,involvedObject.kind=Ingress", name),
	})

	var describe strings.Builder
	describe.WriteString(fmt.Sprintf("Name:             %s\n", ingress.Name))
	describe.WriteString(fmt.Sprintf("Namespace:        %s\n", ingress.Namespace))
	describe.WriteString(fmt.Sprintf("CreationTimestamp: %s\n", ingress.CreationTimestamp.String()))

	// Labels
	if len(ingress.Labels) > 0 {
		describe.WriteString("Labels:           ")
		labels := []string{}
		for k, v := range ingress.Labels {
			labels = append(labels, fmt.Sprintf("%s=%s", k, v))
		}
		describe.WriteString(strings.Join(labels, "\n                  "))
		describe.WriteString("\n")
	}

	// Ingress Class
	if ingress.Spec.IngressClassName != nil {
		describe.WriteString(fmt.Sprintf("Ingress Class:    %s\n", *ingress.Spec.IngressClassName))
	}

	// Default Backend
	if ingress.Spec.DefaultBackend != nil && ingress.Spec.DefaultBackend.Service != nil {
		describe.WriteString(fmt.Sprintf("Default backend:  %s:%d\n",
			ingress.Spec.DefaultBackend.Service.Name,
			ingress.Spec.DefaultBackend.Service.Port.Number))
	}

	// Rules
	if len(ingress.Spec.Rules) > 0 {
		describe.WriteString("\nRules:\n")
		for _, rule := range ingress.Spec.Rules {
			host := rule.Host
			if host == "" {
				host = "*"
			}
			describe.WriteString(fmt.Sprintf("  Host: %s\n", host))
			if rule.HTTP != nil {
				describe.WriteString("  HTTP:\n")
				for _, path := range rule.HTTP.Paths {
					pathType := "Prefix"
					if path.PathType != nil {
						pathType = string(*path.PathType)
					}
					describe.WriteString(fmt.Sprintf("    Path: %s (%s)\n", path.Path, pathType))
					if path.Backend.Service != nil {
						describe.WriteString(fmt.Sprintf("    Backend: %s:%d\n",
							path.Backend.Service.Name,
							path.Backend.Service.Port.Number))
					}
				}
			}
		}
	}

	// TLS
	if len(ingress.Spec.TLS) > 0 {
		describe.WriteString("\nTLS:\n")
		for _, tls := range ingress.Spec.TLS {
			hosts := strings.Join(tls.Hosts, ",")
			describe.WriteString(fmt.Sprintf("  %s terminates %s\n", tls.SecretName, hosts))
		}
	}

	// Load Balancer
	if len(ingress.Status.LoadBalancer.Ingress) > 0 {
		describe.WriteString("\nAddress:\n")
		for _, lb := range ingress.Status.LoadBalancer.Ingress {
			if lb.IP != "" {
				describe.WriteString(fmt.Sprintf("  %s\n", lb.IP))
			} else if lb.Hostname != "" {
				describe.WriteString(fmt.Sprintf("  %s\n", lb.Hostname))
			}
		}
	}

	// Events
	if events != nil && len(events.Items) > 0 {
		describe.WriteString("\nEvents:\n")
		describe.WriteString("  Type    Reason   Age   Message\n")
		for _, event := range events.Items {
			age := formatAge(time.Since(event.LastTimestamp.Time))
			describe.WriteString(fmt.Sprintf("  %-7s %-8s %-5s %s\n",
				event.Type,
				event.Reason,
				age,
				event.Message))
		}
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success":  true,
		"describe": describe.String(),
	})
}

// handleConfigMapYAML returns the YAML representation of a configmap
func (ws *WebServer) handleConfigMapYAML(w http.ResponseWriter, r *http.Request) {
	name := r.URL.Query().Get("name")
	if name == "" {
		http.Error(w, "configmap name required", http.StatusBadRequest)
		return
	}

	configMap, err := ws.app.clientset.CoreV1().ConfigMaps(ws.app.namespace).Get(ws.app.ctx, name, metav1.GetOptions{})
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Convert to YAML
	yamlData, err := yaml.Marshal(configMap)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"yaml":    string(yamlData),
	})
}

// handleConfigMapDescribe returns kubectl describe-style output for a configmap
func (ws *WebServer) handleConfigMapDescribe(w http.ResponseWriter, r *http.Request) {
	name := r.URL.Query().Get("name")
	if name == "" {
		http.Error(w, "configmap name required", http.StatusBadRequest)
		return
	}

	configMap, err := ws.app.clientset.CoreV1().ConfigMaps(ws.app.namespace).Get(ws.app.ctx, name, metav1.GetOptions{})
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Get events
	events, _ := ws.app.clientset.CoreV1().Events(ws.app.namespace).List(ws.app.ctx, metav1.ListOptions{
		FieldSelector: fmt.Sprintf("involvedObject.name=%s,involvedObject.kind=ConfigMap", name),
	})

	var describe strings.Builder
	describe.WriteString(fmt.Sprintf("Name:         %s\n", configMap.Name))
	describe.WriteString(fmt.Sprintf("Namespace:    %s\n", configMap.Namespace))
	describe.WriteString(fmt.Sprintf("CreationTimestamp: %s\n", configMap.CreationTimestamp.String()))

	// Labels
	if len(configMap.Labels) > 0 {
		describe.WriteString("Labels:       ")
		labels := []string{}
		for k, v := range configMap.Labels {
			labels = append(labels, fmt.Sprintf("%s=%s", k, v))
		}
		describe.WriteString(strings.Join(labels, "\n              "))
		describe.WriteString("\n")
	}

	// Annotations
	if len(configMap.Annotations) > 0 {
		describe.WriteString("Annotations:  ")
		annotations := []string{}
		for k, v := range configMap.Annotations {
			annotations = append(annotations, fmt.Sprintf("%s=%s", k, v))
		}
		describe.WriteString(strings.Join(annotations, "\n              "))
		describe.WriteString("\n")
	}

	// Data
	if len(configMap.Data) > 0 {
		describe.WriteString("\nData\n")
		describe.WriteString("====\n")
		for key, value := range configMap.Data {
			describe.WriteString(fmt.Sprintf("%s:\n", key))
			describe.WriteString("----\n")
			// Limit data output to avoid huge responses
			if len(value) > 500 {
				describe.WriteString(value[:500] + "\n... (truncated)\n")
			} else {
				describe.WriteString(value + "\n")
			}
			describe.WriteString("\n")
		}
	}

	// Binary Data
	if len(configMap.BinaryData) > 0 {
		describe.WriteString("\nBinaryData\n")
		describe.WriteString("==========\n")
		for key := range configMap.BinaryData {
			describe.WriteString(fmt.Sprintf("%s: <binary data>\n", key))
		}
	}

	// Events
	if events != nil && len(events.Items) > 0 {
		describe.WriteString("\nEvents:\n")
		describe.WriteString("  Type    Reason   Age   Message\n")
		for _, event := range events.Items {
			age := formatAge(time.Since(event.LastTimestamp.Time))
			describe.WriteString(fmt.Sprintf("  %-7s %-8s %-5s %s\n",
				event.Type,
				event.Reason,
				age,
				event.Message))
		}
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success":  true,
		"describe": describe.String(),
	})
}

// handleCronJobs returns cronjob list
func (ws *WebServer) handleCronJobs(w http.ResponseWriter, r *http.Request) {
	namespace := r.URL.Query().Get("namespace")
	if !r.URL.Query().Has("namespace") {
		namespace = ws.app.namespace
	}
	cronjobs, err := ws.app.clientset.BatchV1().CronJobs(namespace).List(ws.app.ctx, metav1.ListOptions{})
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	cjList := []map[string]interface{}{}
	for _, cj := range cronjobs.Items {
		// Get last schedule time
		lastSchedule := "Never"
		if cj.Status.LastScheduleTime != nil {
			lastSchedule = formatAge(time.Since(cj.Status.LastScheduleTime.Time)) + " ago"
		}

		// Get active jobs count
		activeJobs := len(cj.Status.Active)

		cjList = append(cjList, map[string]interface{}{
			"name":         cj.Name,
			"schedule":     cj.Spec.Schedule,
			"suspend":      cj.Spec.Suspend != nil && *cj.Spec.Suspend,
			"active":       activeJobs,
			"lastSchedule": lastSchedule,
			"age":          formatAge(time.Since(cj.CreationTimestamp.Time)),
			"namespace":    cj.Namespace,
		})
	}

	json.NewEncoder(w).Encode(cjList)
}

// handleJobs returns job list
func (ws *WebServer) handleJobs(w http.ResponseWriter, r *http.Request) {
	namespace := r.URL.Query().Get("namespace")
	if !r.URL.Query().Has("namespace") {
		namespace = ws.app.namespace
	}
	jobs, err := ws.app.clientset.BatchV1().Jobs(namespace).List(ws.app.ctx, metav1.ListOptions{})
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	jobList := []map[string]interface{}{}
	for _, job := range jobs.Items {
		// Determine status
		status := "Running"
		if job.Status.Succeeded > 0 {
			status = "Complete"
		} else if job.Status.Failed > 0 {
			status = "Failed"
		}

		// Get completions
		completions := "?"
		if job.Spec.Completions != nil {
			completions = fmt.Sprintf("%d", *job.Spec.Completions)
		}

		// Get duration
		duration := "-"
		if job.Status.CompletionTime != nil {
			duration = formatAge(job.Status.CompletionTime.Time.Sub(job.Status.StartTime.Time))
		} else if job.Status.StartTime != nil {
			duration = formatAge(time.Since(job.Status.StartTime.Time))
		}

		jobList = append(jobList, map[string]interface{}{
			"name":        job.Name,
			"status":      status,
			"completions": fmt.Sprintf("%d/%s", job.Status.Succeeded, completions),
			"duration":    duration,
			"age":         formatAge(time.Since(job.CreationTimestamp.Time)),
			"namespace":   job.Namespace,
		})
	}

	json.NewEncoder(w).Encode(jobList)
}

// handleStatefulSetDetails returns detailed information about a statefulset
func (ws *WebServer) handleStatefulSetDetails(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	name := r.URL.Query().Get("name")
	if name == "" {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "StatefulSet name is required",
		})
		return
	}

	ss, err := ws.app.clientset.AppsV1().StatefulSets(ws.app.namespace).Get(ws.app.ctx, name, metav1.GetOptions{})
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	// Format selector as string
	selector := metav1.FormatLabelSelector(ss.Spec.Selector)

	// Format service name
	serviceName := ss.Spec.ServiceName
	if serviceName == "" {
		serviceName = "-"
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success":     true,
		"name":        ss.Name,
		"ready":       fmt.Sprintf("%d/%d", ss.Status.ReadyReplicas, *ss.Spec.Replicas),
		"available":   fmt.Sprintf("%d/%d", ss.Status.ReadyReplicas, *ss.Spec.Replicas),
		"serviceName": serviceName,
		"selector":    selector,
		"age":         formatAge(time.Since(ss.CreationTimestamp.Time)),
	})
}

// handleStatefulSetYAML returns the YAML representation of a statefulset
func (ws *WebServer) handleStatefulSetYAML(w http.ResponseWriter, r *http.Request) {
	name := r.URL.Query().Get("name")
	if name == "" {
		http.Error(w, "statefulset name required", http.StatusBadRequest)
		return
	}

	statefulSet, err := ws.app.clientset.AppsV1().StatefulSets(ws.app.namespace).Get(ws.app.ctx, name, metav1.GetOptions{})
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Remove managed fields for cleaner YAML
	statefulSet.ManagedFields = nil

	// Convert to YAML
	yamlData, err := yaml.Marshal(statefulSet)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"yaml":    string(yamlData),
	})
}

// handleStatefulSetDescribe returns kubectl describe-style output for a statefulset
func (ws *WebServer) handleStatefulSetDescribe(w http.ResponseWriter, r *http.Request) {
	name := r.URL.Query().Get("name")
	if name == "" {
		http.Error(w, "statefulset name required", http.StatusBadRequest)
		return
	}

	statefulSet, err := ws.app.clientset.AppsV1().StatefulSets(ws.app.namespace).Get(ws.app.ctx, name, metav1.GetOptions{})
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Get events
	events, _ := ws.app.clientset.CoreV1().Events(ws.app.namespace).List(ws.app.ctx, metav1.ListOptions{
		FieldSelector: fmt.Sprintf("involvedObject.name=%s,involvedObject.kind=StatefulSet", name),
	})

	var describe strings.Builder
	describe.WriteString(fmt.Sprintf("Name:               %s\n", statefulSet.Name))
	describe.WriteString(fmt.Sprintf("Namespace:          %s\n", statefulSet.Namespace))
	describe.WriteString(fmt.Sprintf("CreationTimestamp:  %s\n", statefulSet.CreationTimestamp.String()))

	// Labels
	if len(statefulSet.Labels) > 0 {
		describe.WriteString("Labels:             ")
		labels := []string{}
		for k, v := range statefulSet.Labels {
			labels = append(labels, fmt.Sprintf("%s=%s", k, v))
		}
		describe.WriteString(strings.Join(labels, "\n                    "))
		describe.WriteString("\n")
	}

	// Selector
	describe.WriteString(fmt.Sprintf("Selector:           %s\n", metav1.FormatLabelSelector(statefulSet.Spec.Selector)))
	describe.WriteString(fmt.Sprintf("Service Name:       %s\n", statefulSet.Spec.ServiceName))
	describe.WriteString(fmt.Sprintf("Replicas:           %d desired | %d total | %d ready | %d current\n",
		*statefulSet.Spec.Replicas,
		statefulSet.Status.Replicas,
		statefulSet.Status.ReadyReplicas,
		statefulSet.Status.CurrentReplicas))

	// Update Strategy
	describe.WriteString(fmt.Sprintf("Update Strategy:    %s\n", statefulSet.Spec.UpdateStrategy.Type))
	if statefulSet.Spec.UpdateStrategy.RollingUpdate != nil && statefulSet.Spec.UpdateStrategy.RollingUpdate.Partition != nil {
		describe.WriteString(fmt.Sprintf("  Partition:        %d\n", *statefulSet.Spec.UpdateStrategy.RollingUpdate.Partition))
	}

	// Pod Template
	describe.WriteString("\nPod Template:\n")
	describe.WriteString("  Containers:\n")
	for _, container := range statefulSet.Spec.Template.Spec.Containers {
		describe.WriteString(fmt.Sprintf("   %s:\n", container.Name))
		describe.WriteString(fmt.Sprintf("    Image:      %s\n", container.Image))
		if len(container.Ports) > 0 {
			describe.WriteString("    Ports:\n")
			for _, port := range container.Ports {
				describe.WriteString(fmt.Sprintf("      %d/%s\n", port.ContainerPort, port.Protocol))
			}
		}
	}

	// Volume Claim Templates
	if len(statefulSet.Spec.VolumeClaimTemplates) > 0 {
		describe.WriteString("\nVolume Claim Templates:\n")
		for _, vct := range statefulSet.Spec.VolumeClaimTemplates {
			describe.WriteString(fmt.Sprintf("  Name:         %s\n", vct.Name))
			if vct.Spec.StorageClassName != nil {
				describe.WriteString(fmt.Sprintf("  Storage Class: %s\n", *vct.Spec.StorageClassName))
			}
			if len(vct.Spec.Resources.Requests) > 0 {
				if storage, ok := vct.Spec.Resources.Requests["storage"]; ok {
					describe.WriteString(fmt.Sprintf("  Storage:      %s\n", storage.String()))
				}
			}
		}
	}

	// Conditions
	if len(statefulSet.Status.Conditions) > 0 {
		describe.WriteString("\nConditions:\n")
		describe.WriteString("  Type           Status  Reason\n")
		for _, condition := range statefulSet.Status.Conditions {
			describe.WriteString(fmt.Sprintf("  %-14s %-7s %s\n", condition.Type, condition.Status, condition.Reason))
		}
	}

	// Events
	if events != nil && len(events.Items) > 0 {
		describe.WriteString("\nEvents:\n")
		describe.WriteString("  Type    Reason   Age   Message\n")
		for _, event := range events.Items {
			age := formatAge(time.Since(event.LastTimestamp.Time))
			describe.WriteString(fmt.Sprintf("  %-7s %-8s %-5s %s\n",
				event.Type,
				event.Reason,
				age,
				event.Message))
		}
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success":  true,
		"describe": describe.String(),
	})
}

// handleStatefulSetRestart restarts a statefulset by scaling to 0 then back
func (ws *WebServer) handleStatefulSetRestart(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if r.Method != "POST" {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Method not allowed",
		})
		return
	}

	name := r.URL.Query().Get("name")
	if name == "" {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "StatefulSet name is required",
		})
		return
	}

	// Get statefulset
	ss, err := ws.app.clientset.AppsV1().StatefulSets(ws.app.namespace).Get(ws.app.ctx, name, metav1.GetOptions{})
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	originalReplicas := *ss.Spec.Replicas

	// Scale to 0
	zero := int32(0)
	ss.Spec.Replicas = &zero
	_, err = ws.app.clientset.AppsV1().StatefulSets(ws.app.namespace).Update(ws.app.ctx, ss, metav1.UpdateOptions{})
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	// Wait a moment
	time.Sleep(2 * time.Second)

	// Refetch statefulset to get latest resource version
	ss, err = ws.app.clientset.AppsV1().StatefulSets(ws.app.namespace).Get(ws.app.ctx, name, metav1.GetOptions{})
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	// Scale back
	ss.Spec.Replicas = &originalReplicas
	_, err = ws.app.clientset.AppsV1().StatefulSets(ws.app.namespace).Update(ws.app.ctx, ss, metav1.UpdateOptions{})
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": fmt.Sprintf("StatefulSet %s restarted successfully", name),
	})
}

// handleStatefulSetDelete deletes a statefulset
func (ws *WebServer) handleStatefulSetDelete(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if r.Method != "POST" {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Method not allowed",
		})
		return
	}

	name := r.URL.Query().Get("name")
	if name == "" {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "StatefulSet name is required",
		})
		return
	}

	err := ws.app.clientset.AppsV1().StatefulSets(ws.app.namespace).Delete(ws.app.ctx, name, metav1.DeleteOptions{})
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": fmt.Sprintf("StatefulSet %s deleted successfully", name),
	})
}

// handleDaemonSetDetails returns detailed information about a daemonset
func (ws *WebServer) handleDaemonSetDetails(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	name := r.URL.Query().Get("name")
	if name == "" {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "DaemonSet name is required",
		})
		return
	}

	ds, err := ws.app.clientset.AppsV1().DaemonSets(ws.app.namespace).Get(ws.app.ctx, name, metav1.GetOptions{})
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	// Format selector as string
	selector := metav1.FormatLabelSelector(ds.Spec.Selector)

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success":   true,
		"name":      ds.Name,
		"desired":   ds.Status.DesiredNumberScheduled,
		"current":   ds.Status.CurrentNumberScheduled,
		"ready":     fmt.Sprintf("%d/%d", ds.Status.NumberReady, ds.Status.DesiredNumberScheduled),
		"available": ds.Status.NumberAvailable,
		"selector":  selector,
		"age":       formatAge(time.Since(ds.CreationTimestamp.Time)),
	})
}

// handleDaemonSetYAML returns the YAML representation of a daemonset
func (ws *WebServer) handleDaemonSetYAML(w http.ResponseWriter, r *http.Request) {
	name := r.URL.Query().Get("name")
	if name == "" {
		http.Error(w, "daemonset name required", http.StatusBadRequest)
		return
	}

	daemonSet, err := ws.app.clientset.AppsV1().DaemonSets(ws.app.namespace).Get(ws.app.ctx, name, metav1.GetOptions{})
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Remove managed fields for cleaner YAML
	daemonSet.ManagedFields = nil

	// Convert to YAML
	yamlData, err := yaml.Marshal(daemonSet)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"yaml":    string(yamlData),
	})
}

// handleDaemonSetDescribe returns kubectl describe-style output for a daemonset
func (ws *WebServer) handleDaemonSetDescribe(w http.ResponseWriter, r *http.Request) {
	name := r.URL.Query().Get("name")
	if name == "" {
		http.Error(w, "daemonset name required", http.StatusBadRequest)
		return
	}

	daemonSet, err := ws.app.clientset.AppsV1().DaemonSets(ws.app.namespace).Get(ws.app.ctx, name, metav1.GetOptions{})
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Get events
	events, _ := ws.app.clientset.CoreV1().Events(ws.app.namespace).List(ws.app.ctx, metav1.ListOptions{
		FieldSelector: fmt.Sprintf("involvedObject.name=%s,involvedObject.kind=DaemonSet", name),
	})

	var describe strings.Builder
	describe.WriteString(fmt.Sprintf("Name:               %s\n", daemonSet.Name))
	describe.WriteString(fmt.Sprintf("Namespace:          %s\n", daemonSet.Namespace))
	describe.WriteString(fmt.Sprintf("CreationTimestamp:  %s\n", daemonSet.CreationTimestamp.String()))

	// Labels
	if len(daemonSet.Labels) > 0 {
		describe.WriteString("Labels:             ")
		labels := []string{}
		for k, v := range daemonSet.Labels {
			labels = append(labels, fmt.Sprintf("%s=%s", k, v))
		}
		describe.WriteString(strings.Join(labels, "\n                    "))
		describe.WriteString("\n")
	}

	// Selector
	describe.WriteString(fmt.Sprintf("Selector:           %s\n", metav1.FormatLabelSelector(daemonSet.Spec.Selector)))
	describe.WriteString(fmt.Sprintf("Node-Selector:      %v\n", daemonSet.Spec.Template.Spec.NodeSelector))
	describe.WriteString(fmt.Sprintf("Desired Number Scheduled: %d\n", daemonSet.Status.DesiredNumberScheduled))
	describe.WriteString(fmt.Sprintf("Current Number Scheduled: %d\n", daemonSet.Status.CurrentNumberScheduled))
	describe.WriteString(fmt.Sprintf("Number Ready:       %d\n", daemonSet.Status.NumberReady))
	describe.WriteString(fmt.Sprintf("Number Available:   %d\n", daemonSet.Status.NumberAvailable))
	describe.WriteString(fmt.Sprintf("Number Unavailable: %d\n", daemonSet.Status.NumberUnavailable))

	// Update Strategy
	describe.WriteString(fmt.Sprintf("Update Strategy:    %s\n", daemonSet.Spec.UpdateStrategy.Type))
	if daemonSet.Spec.UpdateStrategy.RollingUpdate != nil && daemonSet.Spec.UpdateStrategy.RollingUpdate.MaxUnavailable != nil {
		describe.WriteString(fmt.Sprintf("  Max Unavailable:  %s\n", daemonSet.Spec.UpdateStrategy.RollingUpdate.MaxUnavailable.String()))
	}

	// Pod Template
	describe.WriteString("\nPod Template:\n")
	describe.WriteString("  Containers:\n")
	for _, container := range daemonSet.Spec.Template.Spec.Containers {
		describe.WriteString(fmt.Sprintf("   %s:\n", container.Name))
		describe.WriteString(fmt.Sprintf("    Image:      %s\n", container.Image))
		if len(container.Ports) > 0 {
			describe.WriteString("    Ports:\n")
			for _, port := range container.Ports {
				describe.WriteString(fmt.Sprintf("      %d/%s\n", port.ContainerPort, port.Protocol))
			}
		}
	}

	// Conditions
	if len(daemonSet.Status.Conditions) > 0 {
		describe.WriteString("\nConditions:\n")
		describe.WriteString("  Type           Status  Reason\n")
		for _, condition := range daemonSet.Status.Conditions {
			describe.WriteString(fmt.Sprintf("  %-14s %-7s %s\n", condition.Type, condition.Status, condition.Reason))
		}
	}

	// Events
	if events != nil && len(events.Items) > 0 {
		describe.WriteString("\nEvents:\n")
		describe.WriteString("  Type    Reason   Age   Message\n")
		for _, event := range events.Items {
			age := formatAge(time.Since(event.LastTimestamp.Time))
			describe.WriteString(fmt.Sprintf("  %-7s %-8s %-5s %s\n",
				event.Type,
				event.Reason,
				age,
				event.Message))
		}
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success":  true,
		"describe": describe.String(),
	})
}

// handleDaemonSetRestart restarts a daemonset by updating a restart annotation
func (ws *WebServer) handleDaemonSetRestart(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if r.Method != "POST" {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Method not allowed",
		})
		return
	}

	name := r.URL.Query().Get("name")
	if name == "" {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "DaemonSet name is required",
		})
		return
	}

	// Get daemonset
	ds, err := ws.app.clientset.AppsV1().DaemonSets(ws.app.namespace).Get(ws.app.ctx, name, metav1.GetOptions{})
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	// Add restart annotation to trigger pod restart
	if ds.Spec.Template.Annotations == nil {
		ds.Spec.Template.Annotations = make(map[string]string)
	}
	ds.Spec.Template.Annotations["kubectl.kubernetes.io/restartedAt"] = time.Now().Format(time.RFC3339)

	_, err = ws.app.clientset.AppsV1().DaemonSets(ws.app.namespace).Update(ws.app.ctx, ds, metav1.UpdateOptions{})
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": fmt.Sprintf("DaemonSet %s restarted successfully", name),
	})
}

// handleDaemonSetDelete deletes a daemonset
func (ws *WebServer) handleDaemonSetDelete(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if r.Method != "POST" {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Method not allowed",
		})
		return
	}

	name := r.URL.Query().Get("name")
	if name == "" {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "DaemonSet name is required",
		})
		return
	}

	err := ws.app.clientset.AppsV1().DaemonSets(ws.app.namespace).Delete(ws.app.ctx, name, metav1.DeleteOptions{})
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": fmt.Sprintf("DaemonSet %s deleted successfully", name),
	})
}

// handleCronJobDetails returns detailed information about a cronjob
func (ws *WebServer) handleCronJobDetails(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	name := r.URL.Query().Get("name")
	if name == "" {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "CronJob name is required",
		})
		return
	}

	cj, err := ws.app.clientset.BatchV1().CronJobs(ws.app.namespace).Get(ws.app.ctx, name, metav1.GetOptions{})
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	// Get last schedule time
	lastSchedule := "Never"
	if cj.Status.LastScheduleTime != nil {
		lastSchedule = cj.Status.LastScheduleTime.Time.Format(time.RFC3339)
	}

	// Get next schedule time (approximate)
	nextSchedule := "Unknown"
	if cj.Status.LastScheduleTime != nil {
		// This is a simplified calculation
		nextSchedule = time.Now().Format(time.RFC3339) + " (approximate)"
	}

	// Get suspend status
	suspended := false
	if cj.Spec.Suspend != nil {
		suspended = *cj.Spec.Suspend
	}

	// Get active jobs
	activeJobs := []string{}
	for _, job := range cj.Status.Active {
		activeJobs = append(activeJobs, job.Name)
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success":           true,
		"name":              cj.Name,
		"schedule":          cj.Spec.Schedule,
		"suspend":           suspended,
		"active":            len(cj.Status.Active),
		"activeJobs":        strings.Join(activeJobs, ", "),
		"lastSchedule":      lastSchedule,
		"nextSchedule":      nextSchedule,
		"concurrencyPolicy": string(cj.Spec.ConcurrencyPolicy),
		"age":               formatAge(time.Since(cj.CreationTimestamp.Time)),
	})
}

// handleCronJobYAML returns the YAML representation of a cronjob
func (ws *WebServer) handleCronJobYAML(w http.ResponseWriter, r *http.Request) {
	name := r.URL.Query().Get("name")
	if name == "" {
		http.Error(w, "cronjob name required", http.StatusBadRequest)
		return
	}

	cronJob, err := ws.app.clientset.BatchV1().CronJobs(ws.app.namespace).Get(ws.app.ctx, name, metav1.GetOptions{})
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Remove managed fields for cleaner YAML
	cronJob.ManagedFields = nil

	// Convert to YAML
	yamlData, err := yaml.Marshal(cronJob)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"yaml":    string(yamlData),
	})
}

// handleCronJobDescribe returns kubectl describe-style output for a cronjob
func (ws *WebServer) handleCronJobDescribe(w http.ResponseWriter, r *http.Request) {
	name := r.URL.Query().Get("name")
	if name == "" {
		http.Error(w, "cronjob name required", http.StatusBadRequest)
		return
	}

	cronJob, err := ws.app.clientset.BatchV1().CronJobs(ws.app.namespace).Get(ws.app.ctx, name, metav1.GetOptions{})
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Get events
	events, _ := ws.app.clientset.CoreV1().Events(ws.app.namespace).List(ws.app.ctx, metav1.ListOptions{
		FieldSelector: fmt.Sprintf("involvedObject.name=%s,involvedObject.kind=CronJob", name),
	})

	var describe strings.Builder
	describe.WriteString(fmt.Sprintf("Name:                       %s\n", cronJob.Name))
	describe.WriteString(fmt.Sprintf("Namespace:                  %s\n", cronJob.Namespace))
	describe.WriteString(fmt.Sprintf("CreationTimestamp:          %s\n", cronJob.CreationTimestamp.String()))

	// Labels
	if len(cronJob.Labels) > 0 {
		describe.WriteString("Labels:                     ")
		labels := []string{}
		for k, v := range cronJob.Labels {
			labels = append(labels, fmt.Sprintf("%s=%s", k, v))
		}
		describe.WriteString(strings.Join(labels, "\n                            "))
		describe.WriteString("\n")
	}

	describe.WriteString(fmt.Sprintf("Schedule:                   %s\n", cronJob.Spec.Schedule))
	describe.WriteString(fmt.Sprintf("Concurrency Policy:         %s\n", cronJob.Spec.ConcurrencyPolicy))

	suspended := "False"
	if cronJob.Spec.Suspend != nil && *cronJob.Spec.Suspend {
		suspended = "True"
	}
	describe.WriteString(fmt.Sprintf("Suspend:                    %s\n", suspended))

	if cronJob.Spec.SuccessfulJobsHistoryLimit != nil {
		describe.WriteString(fmt.Sprintf("Successful Job History Limit: %d\n", *cronJob.Spec.SuccessfulJobsHistoryLimit))
	}
	if cronJob.Spec.FailedJobsHistoryLimit != nil {
		describe.WriteString(fmt.Sprintf("Failed Job History Limit:   %d\n", *cronJob.Spec.FailedJobsHistoryLimit))
	}

	// Last Schedule Time
	if cronJob.Status.LastScheduleTime != nil {
		describe.WriteString(fmt.Sprintf("Last Schedule Time:         %s\n", cronJob.Status.LastScheduleTime.Time.Format(time.RFC3339)))
	}

	// Active Jobs
	if len(cronJob.Status.Active) > 0 {
		describe.WriteString(fmt.Sprintf("Active Jobs:                %d\n", len(cronJob.Status.Active)))
		for _, job := range cronJob.Status.Active {
			describe.WriteString(fmt.Sprintf("  %s\n", job.Name))
		}
	} else {
		describe.WriteString("Active Jobs:                <none>\n")
	}

	// Job Template
	describe.WriteString("\nJob Template:\n")
	describe.WriteString("  Containers:\n")
	for _, container := range cronJob.Spec.JobTemplate.Spec.Template.Spec.Containers {
		describe.WriteString(fmt.Sprintf("   %s:\n", container.Name))
		describe.WriteString(fmt.Sprintf("    Image:      %s\n", container.Image))
		if len(container.Command) > 0 {
			describe.WriteString(fmt.Sprintf("    Command:    %v\n", container.Command))
		}
		if len(container.Args) > 0 {
			describe.WriteString(fmt.Sprintf("    Args:       %v\n", container.Args))
		}
	}

	// Events
	if events != nil && len(events.Items) > 0 {
		describe.WriteString("\nEvents:\n")
		describe.WriteString("  Type    Reason   Age   Message\n")
		for _, event := range events.Items {
			age := formatAge(time.Since(event.LastTimestamp.Time))
			describe.WriteString(fmt.Sprintf("  %-7s %-8s %-5s %s\n",
				event.Type,
				event.Reason,
				age,
				event.Message))
		}
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success":  true,
		"describe": describe.String(),
	})
}

// handleCronJobDelete deletes a cronjob
func (ws *WebServer) handleCronJobDelete(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if r.Method != "POST" {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Method not allowed",
		})
		return
	}

	name := r.URL.Query().Get("name")
	if name == "" {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "CronJob name is required",
		})
		return
	}

	err := ws.app.clientset.BatchV1().CronJobs(ws.app.namespace).Delete(ws.app.ctx, name, metav1.DeleteOptions{})
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": fmt.Sprintf("CronJob %s deleted successfully", name),
	})
}

// handleJobDetails returns detailed information about a job
func (ws *WebServer) handleJobDetails(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	name := r.URL.Query().Get("name")
	if name == "" {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Job name is required",
		})
		return
	}

	job, err := ws.app.clientset.BatchV1().Jobs(ws.app.namespace).Get(ws.app.ctx, name, metav1.GetOptions{})
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	// Determine status
	status := "Running"
	if job.Status.Succeeded > 0 {
		status = "Complete"
	} else if job.Status.Failed > 0 {
		status = "Failed"
	}

	// Get completions
	completions := "?"
	if job.Spec.Completions != nil {
		completions = fmt.Sprintf("%d", *job.Spec.Completions)
	}

	// Get parallelism
	parallelism := int32(1)
	if job.Spec.Parallelism != nil {
		parallelism = *job.Spec.Parallelism
	}

	// Get duration
	duration := "-"
	if job.Status.CompletionTime != nil {
		duration = formatAge(job.Status.CompletionTime.Time.Sub(job.Status.StartTime.Time))
	} else if job.Status.StartTime != nil {
		duration = formatAge(time.Since(job.Status.StartTime.Time))
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success":     true,
		"name":        job.Name,
		"status":      status,
		"completions": fmt.Sprintf("%d/%s", job.Status.Succeeded, completions),
		"parallelism": parallelism,
		"duration":    duration,
		"active":      job.Status.Active,
		"succeeded":   job.Status.Succeeded,
		"failed":      job.Status.Failed,
		"age":         formatAge(time.Since(job.CreationTimestamp.Time)),
	})
}

// handleJobYAML returns the YAML representation of a job
func (ws *WebServer) handleJobYAML(w http.ResponseWriter, r *http.Request) {
	name := r.URL.Query().Get("name")
	if name == "" {
		http.Error(w, "job name required", http.StatusBadRequest)
		return
	}

	job, err := ws.app.clientset.BatchV1().Jobs(ws.app.namespace).Get(ws.app.ctx, name, metav1.GetOptions{})
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Remove managed fields for cleaner YAML
	job.ManagedFields = nil

	// Convert to YAML
	yamlData, err := yaml.Marshal(job)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"yaml":    string(yamlData),
	})
}

// handleJobDescribe returns kubectl describe-style output for a job
func (ws *WebServer) handleJobDescribe(w http.ResponseWriter, r *http.Request) {
	name := r.URL.Query().Get("name")
	if name == "" {
		http.Error(w, "job name required", http.StatusBadRequest)
		return
	}

	job, err := ws.app.clientset.BatchV1().Jobs(ws.app.namespace).Get(ws.app.ctx, name, metav1.GetOptions{})
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Get events
	events, _ := ws.app.clientset.CoreV1().Events(ws.app.namespace).List(ws.app.ctx, metav1.ListOptions{
		FieldSelector: fmt.Sprintf("involvedObject.name=%s,involvedObject.kind=Job", name),
	})

	// Get pods for this job
	pods, _ := ws.app.clientset.CoreV1().Pods(ws.app.namespace).List(ws.app.ctx, metav1.ListOptions{
		LabelSelector: fmt.Sprintf("job-name=%s", name),
	})

	var describe strings.Builder
	describe.WriteString(fmt.Sprintf("Name:           %s\n", job.Name))
	describe.WriteString(fmt.Sprintf("Namespace:      %s\n", job.Namespace))
	describe.WriteString(fmt.Sprintf("CreationTimestamp: %s\n", job.CreationTimestamp.String()))

	// Labels
	if len(job.Labels) > 0 {
		describe.WriteString("Labels:         ")
		labels := []string{}
		for k, v := range job.Labels {
			labels = append(labels, fmt.Sprintf("%s=%s", k, v))
		}
		describe.WriteString(strings.Join(labels, "\n                "))
		describe.WriteString("\n")
	}

	// Selector
	if job.Spec.Selector != nil {
		describe.WriteString(fmt.Sprintf("Selector:       %s\n", metav1.FormatLabelSelector(job.Spec.Selector)))
	}

	// Completions and Parallelism
	completions := "?"
	if job.Spec.Completions != nil {
		completions = fmt.Sprintf("%d", *job.Spec.Completions)
	}
	parallelism := int32(1)
	if job.Spec.Parallelism != nil {
		parallelism = *job.Spec.Parallelism
	}
	describe.WriteString(fmt.Sprintf("Completions:    %s\n", completions))
	describe.WriteString(fmt.Sprintf("Parallelism:    %d\n", parallelism))

	// Backoff limit
	if job.Spec.BackoffLimit != nil {
		describe.WriteString(fmt.Sprintf("Backoff Limit:  %d\n", *job.Spec.BackoffLimit))
	}

	// Start Time
	if job.Status.StartTime != nil {
		describe.WriteString(fmt.Sprintf("Start Time:     %s\n", job.Status.StartTime.Time.Format(time.RFC3339)))
	}

	// Completion Time
	if job.Status.CompletionTime != nil {
		describe.WriteString(fmt.Sprintf("Completion Time: %s\n", job.Status.CompletionTime.Time.Format(time.RFC3339)))
		duration := job.Status.CompletionTime.Time.Sub(job.Status.StartTime.Time).Round(time.Second)
		describe.WriteString(fmt.Sprintf("Duration:       %s\n", duration.String()))
	}

	// Status
	describe.WriteString(fmt.Sprintf("Active:         %d\n", job.Status.Active))
	describe.WriteString(fmt.Sprintf("Succeeded:      %d\n", job.Status.Succeeded))
	describe.WriteString(fmt.Sprintf("Failed:         %d\n", job.Status.Failed))

	// Pod Template
	describe.WriteString("\nPod Template:\n")
	describe.WriteString("  Containers:\n")
	for _, container := range job.Spec.Template.Spec.Containers {
		describe.WriteString(fmt.Sprintf("   %s:\n", container.Name))
		describe.WriteString(fmt.Sprintf("    Image:      %s\n", container.Image))
		if len(container.Command) > 0 {
			describe.WriteString(fmt.Sprintf("    Command:    %v\n", container.Command))
		}
		if len(container.Args) > 0 {
			describe.WriteString(fmt.Sprintf("    Args:       %v\n", container.Args))
		}
	}

	// Pods
	if pods != nil && len(pods.Items) > 0 {
		describe.WriteString("\nPods Statuses:\n")
		for _, pod := range pods.Items {
			describe.WriteString(fmt.Sprintf("  %s: %s\n", pod.Name, pod.Status.Phase))
		}
	}

	// Conditions
	if len(job.Status.Conditions) > 0 {
		describe.WriteString("\nConditions:\n")
		describe.WriteString("  Type           Status  Reason\n")
		for _, condition := range job.Status.Conditions {
			describe.WriteString(fmt.Sprintf("  %-14s %-7s %s\n", condition.Type, condition.Status, condition.Reason))
		}
	}

	// Events
	if events != nil && len(events.Items) > 0 {
		describe.WriteString("\nEvents:\n")
		describe.WriteString("  Type    Reason   Age   Message\n")
		for _, event := range events.Items {
			age := formatAge(time.Since(event.LastTimestamp.Time))
			describe.WriteString(fmt.Sprintf("  %-7s %-8s %-5s %s\n",
				event.Type,
				event.Reason,
				age,
				event.Message))
		}
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success":  true,
		"describe": describe.String(),
	})
}

// handleJobDelete deletes a job
func (ws *WebServer) handleJobDelete(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if r.Method != "POST" {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Method not allowed",
		})
		return
	}

	name := r.URL.Query().Get("name")
	if name == "" {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Job name is required",
		})
		return
	}

	// Delete with propagation policy to clean up pods
	propagationPolicy := metav1.DeletePropagationBackground
	err := ws.app.clientset.BatchV1().Jobs(ws.app.namespace).Delete(ws.app.ctx, name, metav1.DeleteOptions{
		PropagationPolicy: &propagationPolicy,
	})
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": fmt.Sprintf("Job %s deleted successfully", name),
	})
}

// handleNodeDetails returns detailed information about a node
func (ws *WebServer) handleNodeDetails(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	name := r.URL.Query().Get("name")
	if name == "" {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Node name is required",
		})
		return
	}

	node, err := ws.app.clientset.CoreV1().Nodes().Get(ws.app.ctx, name, metav1.GetOptions{})
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	// Get node status
	status := "Unknown"
	for _, condition := range node.Status.Conditions {
		if condition.Type == v1.NodeReady {
			if condition.Status == v1.ConditionTrue {
				status = "Ready"
			} else {
				status = "NotReady"
			}
			break
		}
	}

	// Get node roles
	roles := []string{}
	for label := range node.Labels {
		if strings.Contains(label, "node-role.kubernetes.io/") {
			role := strings.TrimPrefix(label, "node-role.kubernetes.io/")
			roles = append(roles, role)
		}
	}
	if len(roles) == 0 {
		roles = append(roles, "worker")
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success":          true,
		"name":             node.Name,
		"status":           status,
		"roles":            strings.Join(roles, ","),
		"version":          node.Status.NodeInfo.KubeletVersion,
		"osImage":          node.Status.NodeInfo.OSImage,
		"kernelVersion":    node.Status.NodeInfo.KernelVersion,
		"containerRuntime": node.Status.NodeInfo.ContainerRuntimeVersion,
		"cpu":              node.Status.Capacity.Cpu().String(),
		"memory":           node.Status.Capacity.Memory().String(),
		"pods":             node.Status.Capacity.Pods().String(),
		"conditions":       node.Status.Conditions,
		"addresses":        node.Status.Addresses,
		"labels":           node.Labels,
		"annotations":      node.Annotations,
	})
}

// handleNodeYAML returns the YAML representation of a node
func (ws *WebServer) handleNodeYAML(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	name := r.URL.Query().Get("name")
	if name == "" {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Node name is required",
		})
		return
	}

	node, err := ws.app.clientset.CoreV1().Nodes().Get(ws.app.ctx, name, metav1.GetOptions{})
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	yamlData, err := yaml.Marshal(node)
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

// handleNodeDescribe returns kubectl describe-style output for a node
func (ws *WebServer) handleNodeDescribe(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	name := r.URL.Query().Get("name")
	if name == "" {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Node name is required",
		})
		return
	}

	node, err := ws.app.clientset.CoreV1().Nodes().Get(ws.app.ctx, name, metav1.GetOptions{})
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	// Get events for this node
	events, _ := ws.app.clientset.CoreV1().Events("").List(ws.app.ctx, metav1.ListOptions{
		FieldSelector: fmt.Sprintf("involvedObject.name=%s,involvedObject.kind=Node", name),
	})

	// Get pods running on this node
	pods, _ := ws.app.clientset.CoreV1().Pods("").List(ws.app.ctx, metav1.ListOptions{
		FieldSelector: fmt.Sprintf("spec.nodeName=%s", name),
	})

	var describe bytes.Buffer
	describe.WriteString(fmt.Sprintf("Name:               %s\n", node.Name))

	// Roles
	roles := []string{}
	for label := range node.Labels {
		if strings.Contains(label, "node-role.kubernetes.io/") {
			role := strings.TrimPrefix(label, "node-role.kubernetes.io/")
			roles = append(roles, role)
		}
	}
	if len(roles) == 0 {
		roles = append(roles, "worker")
	}
	describe.WriteString(fmt.Sprintf("Roles:              %s\n", strings.Join(roles, ",")))

	// Labels
	describe.WriteString("Labels:             ")
	first := true
	for k, v := range node.Labels {
		if !first {
			describe.WriteString("                    ")
		}
		describe.WriteString(fmt.Sprintf("%s=%s\n", k, v))
		first = false
	}

	// Addresses
	describe.WriteString("Addresses:\n")
	for _, addr := range node.Status.Addresses {
		describe.WriteString(fmt.Sprintf("  %s: %s\n", addr.Type, addr.Address))
	}

	// Capacity
	describe.WriteString("\nCapacity:\n")
	describe.WriteString(fmt.Sprintf("  cpu:     %s\n", node.Status.Capacity.Cpu().String()))
	describe.WriteString(fmt.Sprintf("  memory:  %s\n", node.Status.Capacity.Memory().String()))
	describe.WriteString(fmt.Sprintf("  pods:    %s\n", node.Status.Capacity.Pods().String()))

	// Allocatable
	describe.WriteString("\nAllocatable:\n")
	describe.WriteString(fmt.Sprintf("  cpu:     %s\n", node.Status.Allocatable.Cpu().String()))
	describe.WriteString(fmt.Sprintf("  memory:  %s\n", node.Status.Allocatable.Memory().String()))
	describe.WriteString(fmt.Sprintf("  pods:    %s\n", node.Status.Allocatable.Pods().String()))

	// System Info
	describe.WriteString("\nSystem Info:\n")
	describe.WriteString(fmt.Sprintf("  OS Image:                   %s\n", node.Status.NodeInfo.OSImage))
	describe.WriteString(fmt.Sprintf("  Operating System:           %s\n", node.Status.NodeInfo.OperatingSystem))
	describe.WriteString(fmt.Sprintf("  Architecture:               %s\n", node.Status.NodeInfo.Architecture))
	describe.WriteString(fmt.Sprintf("  Container Runtime Version:  %s\n", node.Status.NodeInfo.ContainerRuntimeVersion))
	describe.WriteString(fmt.Sprintf("  Kubelet Version:            %s\n", node.Status.NodeInfo.KubeletVersion))
	describe.WriteString(fmt.Sprintf("  Kube-Proxy Version:         %s\n", node.Status.NodeInfo.KubeProxyVersion))

	// Conditions
	describe.WriteString("\nConditions:\n")
	describe.WriteString("  Type             Status  Reason                       Message\n")
	for _, condition := range node.Status.Conditions {
		describe.WriteString(fmt.Sprintf("  %-16s %-7s %-28s %s\n",
			condition.Type, condition.Status, condition.Reason, condition.Message))
	}

	// Pods
	if pods != nil && len(pods.Items) > 0 {
		describe.WriteString(fmt.Sprintf("\nNon-terminated Pods:          (%d in total)\n", len(pods.Items)))
		describe.WriteString("  Namespace  Name                              CPU Requests  Memory Requests\n")
		for _, pod := range pods.Items {
			cpuReq := int64(0)
			memReq := int64(0)
			for _, container := range pod.Spec.Containers {
				cpuReq += container.Resources.Requests.Cpu().MilliValue()
				memReq += container.Resources.Requests.Memory().Value()
			}
			describe.WriteString(fmt.Sprintf("  %-10s %-33s %-13s %s\n",
				pod.Namespace, pod.Name,
				fmt.Sprintf("%dm", cpuReq),
				fmt.Sprintf("%.0fMi", float64(memReq)/(1024*1024))))
		}
	}

	// Events
	if events != nil && len(events.Items) > 0 {
		describe.WriteString("\nEvents:\n")
		describe.WriteString("  Type    Reason   Age   Message\n")
		for _, event := range events.Items {
			age := formatAge(time.Since(event.LastTimestamp.Time))
			describe.WriteString(fmt.Sprintf("  %-7s %-8s %-5s %s\n",
				event.Type,
				event.Reason,
				age,
				event.Message))
		}
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success":  true,
		"describe": describe.String(),
	})
}

// handleNamespaces returns list of all namespaces
func (ws *WebServer) handleNamespaces(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

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

// findAvailablePort finds an available port starting from the given port
func findAvailablePort(startPort int) (int, error) {
	for port := startPort; port < startPort+100; port++ {
		listener, err := net.Listen("tcp", fmt.Sprintf(":%d", port))
		if err == nil {
			listener.Close()
			return port, nil
		}
	}
	return 0, fmt.Errorf("no available port found in range %d-%d", startPort, startPort+100)
}

// handlePortForwardStart starts a port-forward session
func (ws *WebServer) handlePortForwardStart(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	resourceType := r.URL.Query().Get("type") // "pod" or "service"
	name := r.URL.Query().Get("name")
	namespace := r.URL.Query().Get("namespace")
	remotePortStr := r.URL.Query().Get("remotePort")
	localPortStr := r.URL.Query().Get("localPort")

	if namespace == "" {
		namespace = ws.app.namespace
	}

	if name == "" || remotePortStr == "" {
		http.Error(w, "name and remotePort are required", http.StatusBadRequest)
		return
	}

	remotePort, err := strconv.Atoi(remotePortStr)
	if err != nil {
		http.Error(w, "invalid remotePort", http.StatusBadRequest)
		return
	}

	var localPort int
	if localPortStr != "" {
		localPort, err = strconv.Atoi(localPortStr)
		if err != nil {
			http.Error(w, "invalid localPort", http.StatusBadRequest)
			return
		}
	} else {
		// Find an available port
		localPort, err = findAvailablePort(remotePort)
		if err != nil {
			localPort, _ = findAvailablePort(8080)
		}
	}

	// Generate session ID
	sessionID := fmt.Sprintf("%s-%s-%s-%d", resourceType, namespace, name, remotePort)

	// Check if already forwarding
	ws.pfMu.Lock()
	if _, exists := ws.portForwards[sessionID]; exists {
		ws.pfMu.Unlock()
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Port forward already active for this resource",
		})
		return
	}
	ws.pfMu.Unlock()

	// For services, we need to find a pod behind the service
	targetPodName := name
	targetNamespace := namespace
	if resourceType == "service" {
		svc, err := ws.app.clientset.CoreV1().Services(namespace).Get(ws.app.ctx, name, metav1.GetOptions{})
		if err != nil {
			http.Error(w, fmt.Sprintf("Service not found: %v", err), http.StatusNotFound)
			return
		}

		// Get pods matching the service selector
		labelSelector := ""
		for k, v := range svc.Spec.Selector {
			if labelSelector != "" {
				labelSelector += ","
			}
			labelSelector += fmt.Sprintf("%s=%s", k, v)
		}

		pods, err := ws.app.clientset.CoreV1().Pods(namespace).List(ws.app.ctx, metav1.ListOptions{
			LabelSelector: labelSelector,
		})
		if err != nil || len(pods.Items) == 0 {
			http.Error(w, "No pods found for service", http.StatusNotFound)
			return
		}

		// Use the first running pod
		for _, pod := range pods.Items {
			if pod.Status.Phase == v1.PodRunning {
				targetPodName = pod.Name
				break
			}
		}
	}

	// Create the port-forward request
	req := ws.app.clientset.CoreV1().RESTClient().Post().
		Resource("pods").
		Namespace(targetNamespace).
		Name(targetPodName).
		SubResource("portforward")

	transport, upgrader, err := spdy.RoundTripperFor(ws.app.config)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to create transport: %v", err), http.StatusInternalServerError)
		return
	}

	dialer := spdy.NewDialer(upgrader, &http.Client{Transport: transport}, http.MethodPost, req.URL())

	stopChan := make(chan struct{}, 1)
	readyChan := make(chan struct{})
	errChan := make(chan error, 1)

	ports := []string{fmt.Sprintf("%d:%d", localPort, remotePort)}

	// Create port forwarder
	pf, err := portforward.New(dialer, ports, stopChan, readyChan, nil, nil)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to create port forwarder: %v", err), http.StatusInternalServerError)
		return
	}

	// Start port forwarding in background
	go func() {
		if err := pf.ForwardPorts(); err != nil {
			errChan <- err
		}
	}()

	// Wait for ready or error
	select {
	case <-readyChan:
		// Port forward is ready
	case err := <-errChan:
		http.Error(w, fmt.Sprintf("Port forward failed: %v", err), http.StatusInternalServerError)
		return
	case <-time.After(10 * time.Second):
		close(stopChan)
		http.Error(w, "Port forward timeout", http.StatusGatewayTimeout)
		return
	}

	// Store the session
	session := &PortForwardSession{
		ID:         sessionID,
		Type:       resourceType,
		Name:       name,
		Namespace:  namespace,
		LocalPort:  localPort,
		RemotePort: remotePort,
		StartedAt:  time.Now(),
		stopChan:   stopChan,
		readyChan:  readyChan,
	}

	ws.pfMu.Lock()
	ws.portForwards[sessionID] = session
	ws.pfMu.Unlock()

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success":    true,
		"id":         sessionID,
		"localPort":  localPort,
		"remotePort": remotePort,
		"url":        fmt.Sprintf("http://localhost:%d", localPort),
	})
}

// handlePortForwardStop stops a port-forward session
func (ws *WebServer) handlePortForwardStop(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	sessionID := r.URL.Query().Get("id")
	if sessionID == "" {
		http.Error(w, "id is required", http.StatusBadRequest)
		return
	}

	ws.pfMu.Lock()
	session, exists := ws.portForwards[sessionID]
	if !exists {
		ws.pfMu.Unlock()
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Port forward session not found",
		})
		return
	}

	// Stop the port forward
	close(session.stopChan)
	delete(ws.portForwards, sessionID)
	ws.pfMu.Unlock()

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": "Port forward stopped",
	})
}

// handlePortForwardList lists all active port-forward sessions
func (ws *WebServer) handlePortForwardList(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	ws.pfMu.Lock()
	sessions := make([]map[string]interface{}, 0)
	for _, session := range ws.portForwards {
		sessions = append(sessions, map[string]interface{}{
			"id":         session.ID,
			"type":       session.Type,
			"name":       session.Name,
			"namespace":  session.Namespace,
			"localPort":  session.LocalPort,
			"remotePort": session.RemotePort,
			"startedAt":  session.StartedAt.Format(time.RFC3339),
			"duration":   formatAge(time.Since(session.StartedAt)),
			"url":        fmt.Sprintf("http://localhost:%d", session.LocalPort),
		})
	}
	ws.pfMu.Unlock()

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success":  true,
		"sessions": sessions,
	})
}
