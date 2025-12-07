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
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

// TrafficMetricsResponse represents traffic metrics for visualization
type TrafficMetricsResponse struct {
	Nodes      []TrafficNode      `json:"nodes"`
	Edges      []TrafficEdge      `json:"edges"`
	Timestamp  time.Time          `json:"timestamp"`
}

// TrafficNode represents a node in the traffic graph
type TrafficNode struct {
	ID          string            `json:"id"`
	Name        string            `json:"name"`
	Namespace   string            `json:"namespace"`
	Type        string            `json:"type"` // service, pod, deployment
	Status      string            `json:"status"`
	Health      string            `json:"health"` // healthy, degraded, unhealthy
	RequestRate float64           `json:"requestRate"` // requests per second
	ErrorRate   float64           `json:"errorRate"` // error percentage
	Latency     float64           `json:"latency"` // average latency in ms
	Labels      map[string]string `json:"labels,omitempty"`
}

// TrafficEdge represents traffic flow between nodes
type TrafficEdge struct {
	Source      string  `json:"source"`
	Target      string  `json:"target"`
	Protocol    string  `json:"protocol"`
	Port        int32   `json:"port"`
	RequestRate float64 `json:"requestRate"` // requests per second
	ErrorRate   float64 `json:"errorRate"` // error percentage
	Latency     float64 `json:"latency"` // average latency in ms
	TrafficType string  `json:"trafficType"` // http, tcp, grpc
	Health      string  `json:"health"` // healthy, degraded, unhealthy
}

// handleTrafficMetrics returns traffic metrics for visualization
// Following Kiali's approach: build graph from K8s resources first, then optionally enrich with Prometheus
func (ws *WebServer) handleTrafficMetrics(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	// Set overall timeout for the entire request (8 seconds)
	ctx, cancel := context.WithTimeout(r.Context(), 8*time.Second)
	defer cancel()

	namespace := r.URL.Query().Get("namespace")
	if namespace == "" || namespace == "_all" {
		namespace = ""
	}

	durationStr := r.URL.Query().Get("duration")
	if durationStr == "" {
		durationStr = "10m"
	}
	duration, err := time.ParseDuration(durationStr)
	if err != nil {
		duration = 10 * time.Minute
	}

	// Step 1: Build graph from Kubernetes resources (fast, always works)
	graph, err := ws.buildTrafficGraphFromKubernetes(ctx, namespace)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to build traffic graph: %v", err), http.StatusInternalServerError)
		return
	}

	// Step 2: Optionally enrich with Prometheus metrics (non-blocking, fails gracefully)
	ws.enrichGraphWithPrometheusMetrics(ctx, graph, namespace, duration)

	// Step 3: Convert to response format
	response := ws.convertGraphToResponse(graph)
	json.NewEncoder(w).Encode(response)
}

// convertGraphToResponse converts the internal graph format to the API response format
func (ws *WebServer) convertGraphToResponse(graph *TrafficGraph) TrafficMetricsResponse {
	nodes := make([]TrafficNode, 0, len(graph.Nodes))
	edges := make([]TrafficEdge, 0, len(graph.Edges))

	for _, n := range graph.Nodes {
		requestRate := 0.0
		errorRate := 0.0
		latency := 0.0
		health := "healthy"

		if n.Metadata != nil {
			if rr, ok := n.Metadata["requestRate"].(float64); ok {
				requestRate = rr
			}
			if er, ok := n.Metadata["errorRate"].(float64); ok {
				errorRate = er
			}
			if lat, ok := n.Metadata["latency"].(float64); ok {
				latency = lat
			}
			if h, ok := n.Metadata["health"].(string); ok {
				health = h
			}
		}

		nodeType := "pod"
		nodeName := n.Workload
		if n.NodeType == "service" {
			nodeType = "service"
			nodeName = n.Service
		} else if n.NodeType == "workload" {
			nodeType = "deployment"
			nodeName = n.Workload
		}
		if nodeName == "" {
			nodeName = n.ID // Fallback to ID if name is empty
		}

		nodes = append(nodes, TrafficNode{
			ID:          n.ID,
			Name:        nodeName,
			Namespace:   n.Namespace,
			Type:        nodeType,
			Status:      "running",
			Health:      health,
			RequestRate: requestRate,
			ErrorRate:   errorRate,
			Latency:     latency,
		})
	}

	for _, e := range graph.Edges {
		requestRate := 0.0
		errorRate := 0.0
		latency := 0.0
		health := "healthy"
		protocol := "TCP"

		if e.Metadata != nil {
			if rr, ok := e.Metadata["requestRate"].(float64); ok {
				requestRate = rr
			}
			if er, ok := e.Metadata["errorRate"].(float64); ok {
				errorRate = er
			}
			if lat, ok := e.Metadata["latency"].(float64); ok {
				latency = lat
			}
			if h, ok := e.Metadata["health"].(string); ok {
				health = h
			}
			if p, ok := e.Metadata["protocol"].(string); ok {
				protocol = p
			}
		}

		edges = append(edges, TrafficEdge{
			Source:      e.Source,
			Target:      e.Target,
			Protocol:    protocol,
			Port:        80,
			RequestRate: requestRate,
			ErrorRate:   errorRate,
			Latency:     latency,
			TrafficType: "http",
			Health:      health,
		})
	}

	return TrafficMetricsResponse{
		Nodes:     nodes,
		Edges:     edges,
		Timestamp: time.Now(),
	}
}

