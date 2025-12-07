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
	"strconv"
	"time"

	v1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// TrafficGraphNode represents a node in the traffic graph (similar to Kiali's graph.Node)
type TrafficGraphNode struct {
	ID        string            `json:"id"`
	NodeType  string            `json:"nodeType"` // service, workload, app
	Cluster   string            `json:"cluster"`
	Namespace string            `json:"namespace"`
	Workload  string            `json:"workload,omitempty"`
	App       string            `json:"app,omitempty"`
	Version   string            `json:"version,omitempty"`
	Service   string            `json:"service,omitempty"`
	Metadata  map[string]interface{} `json:"metadata,omitempty"`
}

// TrafficGraphEdge represents an edge in the traffic graph (similar to Kiali's graph.Edge)
type TrafficGraphEdge struct {
	Source   string                 `json:"source"`
	Target   string                 `json:"target"`
	Metadata map[string]interface{} `json:"metadata,omitempty"`
}

// TrafficGraph represents the complete traffic graph (similar to Kiali's TrafficMap)
type TrafficGraph struct {
	Nodes []TrafficGraphNode `json:"nodes"`
	Edges []TrafficGraphEdge `json:"edges"`
}

// buildTrafficGraphFromKubernetes builds a traffic graph from Kubernetes resources
// This is the fast path that works without Prometheus
// Following Kiali's approach: build graph from K8s resources first, then enrich with metrics
func (ws *WebServer) buildTrafficGraphFromKubernetes(ctx context.Context, namespace string) (*TrafficGraph, error) {
	// Get services directly (no goroutine to avoid hanging)
	svcList, err := ws.app.clientset.CoreV1().Services(namespace).List(ctx, metav1.ListOptions{
		Limit: 1000, // Limit to avoid huge responses
	})
	if err != nil {
		return nil, fmt.Errorf("failed to list services: %v", err)
	}

	// Get pods directly
	podList, err := ws.app.clientset.CoreV1().Pods(namespace).List(ctx, metav1.ListOptions{
		Limit: 1000,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to list pods: %v", err)
	}

	// Get deployments (optional, don't fail if this errors)
	deployList, _ := ws.app.clientset.AppsV1().Deployments(namespace).List(ctx, metav1.ListOptions{
		Limit: 1000,
	})
	
	deployments := make([]interface{}, 0)
	if deployList != nil {
		for i := range deployList.Items {
			deployments = append(deployments, deployList.Items[i])
		}
	}

	return ws.buildGraphFromResources(svcList.Items, podList.Items, deployments), nil
}

// buildGraphFromResources builds the graph structure from Kubernetes resources
func (ws *WebServer) buildGraphFromResources(services []v1.Service, pods []v1.Pod, deployments []interface{}) *TrafficGraph {
	// deployments parameter is kept for future use but not currently used
	_ = deployments
	graph := &TrafficGraph{
		Nodes: make([]TrafficGraphNode, 0),
		Edges: make([]TrafficGraphEdge, 0),
	}

	nodeMap := make(map[string]*TrafficGraphNode)
	
	// Build nodes from services
	for _, svc := range services {
		nodeID := fmt.Sprintf("svc_%s_%s", svc.Namespace, svc.Name)
		node := &TrafficGraphNode{
			ID:        nodeID,
			NodeType:  "service",
			Cluster:   "Kubernetes",
			Namespace: svc.Namespace,
			Service:   svc.Name,
			Metadata: map[string]interface{}{
				"requestRate": 0.0,
				"errorRate":   0.0,
				"latency":     0.0,
			},
		}
		graph.Nodes = append(graph.Nodes, *node)
		nodeMap[nodeID] = node
	}

	// Build nodes from pods and connect to services
	for _, pod := range pods {
		if pod.Status.Phase != v1.PodRunning {
			continue
		}

		// Get app and version labels
		app := pod.Labels["app"]
		if app == "" {
			app = pod.Labels["k8s-app"]
		}
		version := pod.Labels["version"]

		// Create workload node
		workloadName := pod.Labels["app.kubernetes.io/name"]
		if workloadName == "" {
			// Try to infer from pod name (remove random suffix)
			workloadName = pod.Name
			if idx := len(workloadName) - 1; idx > 0 {
				for idx >= 0 && (workloadName[idx] >= '0' && workloadName[idx] <= '9' || workloadName[idx] == '-') {
					idx--
				}
				if idx > 0 {
					workloadName = workloadName[:idx+1]
				}
			}
		}

		nodeID := fmt.Sprintf("wl_%s_%s", pod.Namespace, workloadName)
		
		// Check if node already exists
		if _, exists := nodeMap[nodeID]; !exists {
			node := &TrafficGraphNode{
				ID:        nodeID,
				NodeType:  "workload",
				Cluster:   "Kubernetes",
				Namespace: pod.Namespace,
				Workload:  workloadName,
				App:       app,
				Version:   version,
				Metadata: map[string]interface{}{
					"requestRate": 0.0,
					"errorRate":   0.0,
					"latency":     0.0,
					"health":      getPodHealth(pod),
				},
			}
			graph.Nodes = append(graph.Nodes, *node)
			nodeMap[nodeID] = node
		}

		// Connect pod to services via selectors
		for _, svc := range services {
			if svc.Namespace != pod.Namespace {
				continue
			}

			matches := true
			for key, value := range svc.Spec.Selector {
				if pod.Labels[key] != value {
					matches = false
					break
				}
			}

			if matches {
				svcID := fmt.Sprintf("svc_%s_%s", svc.Namespace, svc.Name)
				edge := TrafficGraphEdge{
					Source: svcID,
					Target: nodeID,
					Metadata: map[string]interface{}{
						"protocol":    "TCP",
						"requestRate": 0.0,
						"errorRate":   0.0,
						"latency":     0.0,
						"health":      "healthy",
					},
				}
				graph.Edges = append(graph.Edges, edge)
			}
		}
	}

	return graph
}

func getPodHealth(pod v1.Pod) string {
	if pod.Status.Phase != v1.PodRunning {
		return "unhealthy"
	}
	for _, condition := range pod.Status.Conditions {
		if condition.Type == v1.PodReady && condition.Status != v1.ConditionTrue {
			return "degraded"
		}
	}
	return "healthy"
}

// enrichGraphWithPrometheusMetrics enriches the graph with Prometheus metrics if available
func (ws *WebServer) enrichGraphWithPrometheusMetrics(ctx context.Context, graph *TrafficGraph, namespace string, duration time.Duration) {
	// Try to get Prometheus with very short timeout
	promCtx, cancel := context.WithTimeout(ctx, 1*time.Second)
	defer cancel()

	promURL, err := ws.app.DetectPrometheus(promCtx)
	if err != nil {
		return // Prometheus not available, skip enrichment
	}

	// Limit duration for faster queries
	if duration > 5*time.Minute {
		duration = 5 * time.Minute
	}

	client := NewPrometheusClient(promURL)
	queryTime := time.Now()

	// Query 1: Incoming traffic (destination telemetry) - following Kiali's pattern
	var namespaceFilter string
	if namespace != "" {
		namespaceFilter = fmt.Sprintf(`destination_service_namespace="%s"`, namespace)
	} else {
		namespaceFilter = `destination_service_namespace!=""`
	}

	groupBy := "source_workload_namespace,source_workload,destination_service_namespace,destination_service_name,destination_workload_namespace,destination_workload,request_protocol,response_code"
	query := fmt.Sprintf(`sum(rate(istio_requests_total{%s}[%vs])) by (%s) > 0`,
		namespaceFilter,
		int(duration.Seconds()),
		groupBy)

	result, err := client.Query(promCtx, query, queryTime)
	if err != nil {
		return // Query failed, skip enrichment - graph still works
	}

	// Build a map of metrics by service/workload for fast lookup
	metricsMap := make(map[string]map[string]float64) // key: "svc:namespace:name" or "wl:namespace:name", value: map of metrics

	for _, sample := range result.Data.Result {
		metric := sample.Metric
		destSvc := string(metric["destination_service_name"])
		destNs := string(metric["destination_service_namespace"])
		destWl := string(metric["destination_workload"])
		destWlNs := string(metric["destination_workload_namespace"])
		responseCode := string(metric["response_code"])

		if destSvc == "" || destNs == "" {
			continue
		}

		// Get request rate
		var requestRate float64
		if len(sample.Value) >= 2 {
			if valStr, ok := sample.Value[1].(string); ok {
				if val, err := strconv.ParseFloat(valStr, 64); err == nil {
					requestRate = val
				}
			}
		}

		// Calculate error rate
		isError := responseCode >= "500" && responseCode < "600"
		errorRate := 0.0
		if isError {
			errorRate = 100.0 // Simplified - in production calculate actual percentage
		}

		// Store metrics for service
		svcKey := fmt.Sprintf("svc:%s:%s", destNs, destSvc)
		if metricsMap[svcKey] == nil {
			metricsMap[svcKey] = make(map[string]float64)
		}
		metricsMap[svcKey]["requestRate"] += requestRate
		if isError {
			metricsMap[svcKey]["errorRate"] = errorRate // Simplified
		}

		// Store metrics for workload if available
		if destWl != "" && destWl != "unknown" && destWlNs != "" {
			wlKey := fmt.Sprintf("wl:%s:%s", destWlNs, destWl)
			if metricsMap[wlKey] == nil {
				metricsMap[wlKey] = make(map[string]float64)
			}
			metricsMap[wlKey]["requestRate"] += requestRate
			if isError {
				metricsMap[wlKey]["errorRate"] = errorRate
			}
		}
	}

	// Enrich graph nodes with metrics
	for i := range graph.Nodes {
		var key string
		if graph.Nodes[i].NodeType == "service" {
			key = fmt.Sprintf("svc:%s:%s", graph.Nodes[i].Namespace, graph.Nodes[i].Service)
		} else {
			key = fmt.Sprintf("wl:%s:%s", graph.Nodes[i].Namespace, graph.Nodes[i].Workload)
		}

		if metrics, exists := metricsMap[key]; exists {
			metadata := graph.Nodes[i].Metadata
			if metadata == nil {
				metadata = make(map[string]interface{})
				graph.Nodes[i].Metadata = metadata
			}
			if rr, ok := metrics["requestRate"]; ok {
				metadata["requestRate"] = rr
			}
			if er, ok := metrics["errorRate"]; ok {
				metadata["errorRate"] = er
			}
			// Calculate health based on error rate
			if er, ok := metrics["errorRate"]; ok {
				if er > 20 {
					metadata["health"] = "unhealthy"
				} else if er > 5 {
					metadata["health"] = "degraded"
				} else {
					metadata["health"] = "healthy"
				}
			}
		}
	}
}


