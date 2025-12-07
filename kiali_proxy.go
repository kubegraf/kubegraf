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
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	v1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/tools/portforward"
	"k8s.io/client-go/transport/spdy"
)

// ProxyKialiAPI proxies requests to Kiali API
func (ws *WebServer) ProxyKialiAPI(w http.ResponseWriter, r *http.Request) {
	// Get Kiali status to find service
	ctx := r.Context()
	status, err := ws.app.DetectKiali(ctx)
	if err != nil || !status.Installed {
		http.Error(w, "Kiali is not installed", http.StatusNotFound)
		return
	}

	// Extract path from request (remove /api/kiali/proxy prefix)
	path := strings.TrimPrefix(r.URL.Path, "/api/kiali/proxy")
	if path == "" {
		path = "/"
	}

	// Get query parameters
	query := r.URL.RawQuery
	if query != "" {
		path += "?" + query
	}

	// Create port-forward to Kiali service
	localPort, err := ws.createKialiPortForward(ctx, status)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to create port-forward: %v", err), http.StatusInternalServerError)
		return
	}

	// Build target URL
	targetURL := fmt.Sprintf("http://localhost:%d%s", localPort, path)

	// Create request to Kiali
	req, err := http.NewRequestWithContext(ctx, r.Method, targetURL, r.Body)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to create request: %v", err), http.StatusInternalServerError)
		return
	}

	// Copy headers (sanitize sensitive headers)
	for key, values := range r.Header {
		// Skip certain headers that shouldn't be forwarded
		skipHeaders := map[string]bool{
			"Host":              true,
			"Connection":        true,
			"Upgrade":           true,
			"Proxy-Connection":  true,
			"X-Forwarded-For":   true,
			"X-Forwarded-Proto": true,
		}
		if skipHeaders[key] {
			continue
		}
		req.Header[key] = values
	}

	// Make request to Kiali
	client := &http.Client{
		Timeout: 30 * time.Second,
	}
	resp, err := client.Do(req)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to proxy request: %v", err), http.StatusBadGateway)
		return
	}
	defer resp.Body.Close()

	// Copy response headers
	for key, values := range resp.Header {
		// Skip certain headers
		skipHeaders := map[string]bool{
			"Connection":        true,
			"Upgrade":           true,
			"Content-Encoding":  true,
			"Transfer-Encoding": true,
		}
		if skipHeaders[key] {
			continue
		}
		w.Header()[key] = values
	}

	// Set status code
	w.WriteHeader(resp.StatusCode)

	// Copy response body
	_, err = io.Copy(w, resp.Body)
	if err != nil {
		// Response already started, can't send error
		return
	}
}

// createKialiPortForward creates a port-forward to Kiali service
func (ws *WebServer) createKialiPortForward(ctx context.Context, status *KialiStatus) (int, error) {
	// Check if port-forward already exists
	sessionID := fmt.Sprintf("kiali-%s-%s", status.Namespace, status.ServiceName)
	
	ws.pfMu.Lock()
	if existing, exists := ws.portForwards[sessionID]; exists {
		ws.pfMu.Unlock()
		return existing.LocalPort, nil
	}
	ws.pfMu.Unlock()

	// Get service to find pods
	svc, err := ws.app.clientset.CoreV1().Services(status.Namespace).Get(ctx, status.ServiceName, metav1.GetOptions{})
	if err != nil {
		return 0, fmt.Errorf("failed to get Kiali service: %v", err)
	}

	// Get pods matching service selector
	labelSelector := ""
	for k, v := range svc.Spec.Selector {
		if labelSelector != "" {
			labelSelector += ","
		}
		labelSelector += fmt.Sprintf("%s=%s", k, v)
	}

	pods, err := ws.app.clientset.CoreV1().Pods(status.Namespace).List(ctx, metav1.ListOptions{
		LabelSelector: labelSelector,
	})
	if err != nil || len(pods.Items) == 0 {
		return 0, fmt.Errorf("no pods found for Kiali service")
	}

	// Find running pod
	var targetPod *v1.Pod
	for i := range pods.Items {
		if pods.Items[i].Status.Phase == v1.PodRunning {
			targetPod = &pods.Items[i]
			break
		}
	}
	if targetPod == nil {
		return 0, fmt.Errorf("no running pods found for Kiali service")
	}

	// Find available local port
	localPort := 20001 // Default port for Kiali
	remotePort := status.ServicePort
	if remotePort == 0 {
		remotePort = 20001 // Default Kiali port
	}

	// Create port-forward request
	req := ws.app.clientset.CoreV1().RESTClient().Post().
		Resource("pods").
		Namespace(targetPod.Namespace).
		Name(targetPod.Name).
		SubResource("portforward")

	transport, upgrader, err := spdy.RoundTripperFor(ws.app.config)
	if err != nil {
		return 0, fmt.Errorf("failed to create transport: %v", err)
	}

	dialer := spdy.NewDialer(upgrader, &http.Client{Transport: transport}, http.MethodPost, req.URL())

	stopChan := make(chan struct{}, 1)
	readyChan := make(chan struct{})
	errChan := make(chan error, 1)

	ports := []string{fmt.Sprintf("%d:%d", localPort, remotePort)}

	// Create port forwarder
	pf, err := portforward.New(dialer, ports, stopChan, readyChan, nil, nil)
	if err != nil {
		return 0, fmt.Errorf("failed to create port forwarder: %v", err)
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
		ws.pfMu.Lock()
		ws.portForwards[sessionID] = &PortForwardSession{
			ID:         sessionID,
			Type:       "service",
			Name:       status.ServiceName,
			Namespace:  status.Namespace,
			LocalPort:  localPort,
			RemotePort: int(remotePort),
			StartedAt:  time.Now(),
			stopChan:   stopChan,
		}
		ws.pfMu.Unlock()
		return localPort, nil
	case err := <-errChan:
		return 0, fmt.Errorf("port forward failed: %v", err)
	case <-time.After(10 * time.Second):
		return 0, fmt.Errorf("port forward timeout")
	}
}

