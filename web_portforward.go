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
	"net"
	"net/http"
	"strconv"
	"time"

	v1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/tools/portforward"
	"k8s.io/client-go/transport/spdy"
)

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

	var resourceType, name, namespace string
	var remotePort, localPort int
	var err error

	// Support both POST JSON body and GET query params
	if r.Method == "POST" {
		var req struct {
			Type       string `json:"type"`
			Name       string `json:"name"`
			Namespace  string `json:"namespace"`
			LocalPort  int    `json:"localPort"`
			RemotePort int    `json:"remotePort"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			json.NewEncoder(w).Encode(map[string]interface{}{
				"success": false,
				"error":   "Invalid request body: " + err.Error(),
			})
			return
		}
		resourceType = req.Type
		name = req.Name
		namespace = req.Namespace
		localPort = req.LocalPort
		remotePort = req.RemotePort
	} else {
		resourceType = r.URL.Query().Get("type")
		name = r.URL.Query().Get("name")
		namespace = r.URL.Query().Get("namespace")
		remotePortStr := r.URL.Query().Get("remotePort")
		localPortStr := r.URL.Query().Get("localPort")

		if remotePortStr != "" {
			remotePort, _ = strconv.Atoi(remotePortStr)
		}
		if localPortStr != "" {
			localPort, _ = strconv.Atoi(localPortStr)
		}
	}

	if namespace == "" {
		namespace = ws.app.namespace
	}

	if name == "" || remotePort == 0 {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "name and remotePort are required",
		})
		return
	}

	if localPort == 0 {
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

	// Get current cluster context
	clusterContext := ""
	if ws.app.contextManager != nil && ws.app.contextManager.CurrentContext != "" {
		clusterContext = ws.app.contextManager.CurrentContext
	} else if ws.app.cluster != "" {
		clusterContext = ws.app.cluster
	}

	// Include cluster context in session ID for proper isolation
	sessionID = fmt.Sprintf("%s-%s-%s-%s-%d", clusterContext, resourceType, namespace, name, remotePort)

	// Store the session
	session := &PortForwardSession{
		ID:             sessionID,
		Type:           resourceType,
		Name:           name,
		Namespace:      namespace,
		ClusterContext: clusterContext,
		LocalPort:      localPort,
		RemotePort:     remotePort,
		StartedAt:      time.Now(),
		stopChan:       stopChan,
		readyChan:      readyChan,
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

// handlePortForwardList lists all active port-forward sessions for the current cluster
func (ws *WebServer) handlePortForwardList(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	// Get current cluster context for filtering
	currentCluster := ""
	if ws.app.contextManager != nil && ws.app.contextManager.CurrentContext != "" {
		currentCluster = ws.app.contextManager.CurrentContext
	} else if ws.app.cluster != "" {
		currentCluster = ws.app.cluster
	}

	ws.pfMu.Lock()
	sessions := make([]map[string]interface{}, 0)
	for _, session := range ws.portForwards {
		// Only show sessions for the current cluster
		if session.ClusterContext != "" && session.ClusterContext != currentCluster {
			continue
		}
		
		sessions = append(sessions, map[string]interface{}{
			"id":             session.ID,
			"type":           session.Type,
			"name":           session.Name,
			"namespace":      session.Namespace,
			"clusterContext": session.ClusterContext,
			"localPort":      session.LocalPort,
			"remotePort":     session.RemotePort,
			"startedAt":      session.StartedAt.Format(time.RFC3339),
			"duration":       formatAge(time.Since(session.StartedAt)),
			"url":            fmt.Sprintf("http://localhost:%d", session.LocalPort),
		})
	}
	ws.pfMu.Unlock()

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success":        true,
		"sessions":       sessions,
		"clusterContext": currentCluster,
	})
}
