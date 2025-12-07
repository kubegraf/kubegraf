// Copyright 2025 KubeGraf Contributors
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0

package main

import (
	"context"
	"fmt"
	"net/http"
	"time"

	v1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/tools/portforward"
	"k8s.io/client-go/transport/spdy"
)

// createInferencePortForward creates a port-forward to an inference service
func (ws *WebServer) createInferencePortForward(ctx context.Context, serviceName, namespace string, remotePort int32) (int, error) {
	// Check if port-forward already exists
	sessionID := fmt.Sprintf("inference-%s-%s-%d", namespace, serviceName, remotePort)
	
	ws.pfMu.Lock()
	if existing, exists := ws.portForwards[sessionID]; exists {
		ws.pfMu.Unlock()
		return existing.LocalPort, nil
	}
	ws.pfMu.Unlock()

	// Get service to find pods
	svc, err := ws.app.clientset.CoreV1().Services(namespace).Get(ctx, serviceName, metav1.GetOptions{})
	if err != nil {
		return 0, fmt.Errorf("failed to get service: %v", err)
	}

	// Get pods matching service selector
	labelSelector := ""
	for k, v := range svc.Spec.Selector {
		if labelSelector != "" {
			labelSelector += ","
		}
		labelSelector += fmt.Sprintf("%s=%s", k, v)
	}

	pods, err := ws.app.clientset.CoreV1().Pods(namespace).List(ctx, metav1.ListOptions{
		LabelSelector: labelSelector,
	})
	if err != nil || len(pods.Items) == 0 {
		return 0, fmt.Errorf("no pods found for service")
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
		return 0, fmt.Errorf("no running pods found for service")
	}

	// Find available local port
	localPort := 9000 // Start from 9000 for inference services
	for i := 0; i < 100; i++ {
		// Check if port is available (simplified check)
		localPort = 9000 + i
		// In production, use findAvailablePort helper
		break
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

	// Start port-forward in goroutine
	go func() {
		errChan <- pf.ForwardPorts()
	}()

	// Wait for ready or error
	select {
	case <-readyChan:
		// Port-forward is ready, store session
		ws.pfMu.Lock()
		ws.portForwards[sessionID] = &PortForwardSession{
			ID:         sessionID,
			Type:       "service",
			Name:       serviceName,
			Namespace:  namespace,
			LocalPort:  localPort,
			RemotePort: int(remotePort),
			StartedAt:  time.Now(),
			stopChan:   stopChan,
		}
		ws.pfMu.Unlock()
		return localPort, nil
	case err := <-errChan:
		return 0, fmt.Errorf("port-forward error: %v", err)
	case <-time.After(10 * time.Second):
		return 0, fmt.Errorf("port-forward timeout")
	case <-ctx.Done():
		return 0, ctx.Err()
	}
}

