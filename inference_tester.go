// Copyright 2025 KubeGraf Contributors
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0

package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// TestInferenceService sends a test request to an inference service
func (ws *WebServer) TestInferenceService(ctx context.Context, req InferenceTestRequest) (*InferenceTestResponse, error) {
	// Get the service to find the port
	service, err := ws.app.clientset.CoreV1().Services(req.Namespace).Get(ctx, req.Name, metav1.GetOptions{})
	if err != nil {
		return &InferenceTestResponse{
			Success: false,
			Error:   fmt.Sprintf("Failed to get service: %v", err),
		}, nil
	}

	if len(service.Spec.Ports) == 0 {
		return &InferenceTestResponse{
			Success: false,
			Error:   "Service has no ports configured",
		}, nil
	}

	port := service.Spec.Ports[0].Port

	// Create port-forward to the inference service
	localPort, err := ws.createInferencePortForward(ctx, req.Name, req.Namespace, port)
	if err != nil {
		return &InferenceTestResponse{
			Success: false,
			Error:   fmt.Sprintf("Failed to create port-forward: %v", err),
		}, nil
	}

	// Prepare request body
	requestBody, err := json.Marshal(req.Input)
	if err != nil {
		return &InferenceTestResponse{
			Success: false,
			Error:   fmt.Sprintf("Failed to marshal input: %v", err),
		}, nil
	}

	// Make HTTP request
	startTime := time.Now()
	url := fmt.Sprintf("http://localhost:%d/predict", localPort)
	httpReq, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewBuffer(requestBody))
	if err != nil {
		return &InferenceTestResponse{
			Success: false,
			Error:   fmt.Sprintf("Failed to create request: %v", err),
		}, nil
	}

	httpReq.Header.Set("Content-Type", "application/json")

	client := &http.Client{
		Timeout: 30 * time.Second,
	}

	resp, err := client.Do(httpReq)
	if err != nil {
		return &InferenceTestResponse{
			Success: false,
			Error:   fmt.Sprintf("Request failed: %v", err),
		}, nil
	}
	defer resp.Body.Close()

	latency := time.Since(startTime).String()

	// Read response
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return &InferenceTestResponse{
			Success: false,
			Error:   fmt.Sprintf("Failed to read response: %v", err),
			Latency: latency,
		}, nil
	}

	if resp.StatusCode != http.StatusOK {
		return &InferenceTestResponse{
			Success: false,
			Error:   fmt.Sprintf("Request failed with status %d: %s", resp.StatusCode, string(body)),
			Latency: latency,
		}, nil
	}

	// Parse response
	var output map[string]interface{}
	if err := json.Unmarshal(body, &output); err != nil {
		// If JSON parsing fails, return raw response
		output = map[string]interface{}{
			"raw": string(body),
		}
	}

	return &InferenceTestResponse{
		Success: true,
		Output:  output,
		Latency: latency,
	}, nil
}

