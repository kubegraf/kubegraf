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
)

// buildTrafficGraphKialiStyle builds a traffic graph following Kiali's approach
// This queries Prometheus for istio_requests_total and builds nodes/edges from the results
func (ws *WebServer) buildTrafficGraphKialiStyle(ctx context.Context, namespace string, duration time.Duration) ([]TrafficNode, []TrafficEdge, error) {
	// Try to get Prometheus client (with very short timeout)
	detectCtx, cancel := context.WithTimeout(ctx, 1*time.Second)
	defer cancel()
	
	promURL, err := ws.app.DetectPrometheus(detectCtx)
	if err != nil {
		// Prometheus not available - fall back to K8s-only approach
		return ws.buildTrafficGraphFromK8s(ctx, namespace)
	}

	client := NewPrometheusClient(promURL)
	queryTime := time.Now()
	
	// Limit duration for faster queries
	if duration > 5*time.Minute {
		duration = 5 * time.Minute
	}

	// Build the main query following Kiali's pattern
	// Query for incoming traffic (destination telemetry)
	groupBy := "source_cluster,source_workload_namespace,source_workload,source_canonical_service,source_canonical_revision,destination_cluster,destination_service_namespace,destination_service,destination_service_name,destination_workload_namespace,destination_workload,destination_canonical_service,destination_canonical_revision,request_protocol,response_code"
	
	var namespaceFilter string
	if namespace != "" {
		namespaceFilter = fmt.Sprintf(`destination_service_namespace="%s"`, namespace)
	} else {
		namespaceFilter = `destination_service_namespace!=""`
	}

	// Query 1: Incoming traffic (destination telemetry)
	query := fmt.Sprintf(`sum(rate(istio_requests_total{%s}[%vs])) by (%s) > 0`,
		namespaceFilter,
		int(duration.Seconds()),
		groupBy)

	queryCtx, queryCancel := context.WithTimeout(ctx, 3*time.Second)
	defer queryCancel()

	result, err := client.Query(queryCtx, query, queryTime)
	if err != nil {
		// Fall back to K8s if Prometheus query fails
		return ws.buildTrafficGraphFromK8s(ctx, namespace)
	}

	// Build nodes and edges from Prometheus results
	nodes := make([]TrafficNode, 0)
	edges := make([]TrafficEdge, 0)
	nodeMap := make(map[string]*TrafficNode)

	for _, sample := range result.Data.Result {
		metric := sample.Metric
		
		// Extract labels
		sourceNs := string(metric["source_workload_namespace"])
		sourceWl := string(metric["source_workload"])
		destNs := string(metric["destination_service_namespace"])
		destSvc := string(metric["destination_service_name"])
		destWlNs := string(metric["destination_workload_namespace"])
		destWl := string(metric["destination_workload"])
		protocol := string(metric["request_protocol"])
		responseCode := string(metric["response_code"])

		// Skip if missing required fields
		if sourceNs == "" || sourceWl == "" || destNs == "" || destSvc == "" {
			continue
		}

		// Get request rate value
		var requestRate float64
		if len(sample.Value) >= 2 {
			if valStr, ok := sample.Value[1].(string); ok {
				if val, err := strconv.ParseFloat(valStr, 64); err == nil {
					requestRate = val
				}
			}
		}

		// Create source node
		sourceID := fmt.Sprintf("wl_%s_%s", sourceNs, sourceWl)
		if _, exists := nodeMap[sourceID]; !exists {
			node := &TrafficNode{
				ID:        sourceID,
				Name:      sourceWl,
				Namespace: sourceNs,
				Type:      "workload",
				Status:    "running",
				Health:    "healthy",
				RequestRate: requestRate,
			}
			nodes = append(nodes, *node)
			nodeMap[sourceID] = node
		}

		// Create destination node (service)
		destSvcID := fmt.Sprintf("svc_%s_%s", destNs, destSvc)
		if _, exists := nodeMap[destSvcID]; !exists {
			node := &TrafficNode{
				ID:        destSvcID,
				Name:      destSvc,
				Namespace: destNs,
				Type:      "service",
				Status:    "running",
				Health:    "healthy",
			}
			nodes = append(nodes, *node)
			nodeMap[destSvcID] = node
		}

		// Create destination workload node if available
		var destWlID string
		if destWl != "" && destWl != "unknown" {
			destWlID = fmt.Sprintf("wl_%s_%s", destWlNs, destWl)
			if _, exists := nodeMap[destWlID]; !exists {
				node := &TrafficNode{
					ID:        destWlID,
					Name:      destWl,
					Namespace: destWlNs,
					Type:      "workload",
					Status:    "running",
					Health:    "healthy",
				}
				nodes = append(nodes, *node)
				nodeMap[destWlID] = node
			}
		}

		// Calculate error rate
		errorRate := 0.0
		isError := responseCode >= "500" && responseCode < "600"
		if isError {
			errorRate = 100.0 // Will be aggregated properly
		}

		// Determine health
		health := "healthy"
		if errorRate > 20 {
			health = "unhealthy"
		} else if errorRate > 5 {
			health = "degraded"
		}

		// Create edge from source to service
		edge := TrafficEdge{
			Source:      sourceID,
			Target:      destSvcID,
			Protocol:    protocol,
			Port:        80,
			RequestRate: requestRate,
			ErrorRate:   errorRate,
			Latency:     0, // Will be filled by response time appender if available
			TrafficType: "http",
			Health:      health,
		}
		edges = append(edges, edge)

		// Create edge from service to workload if destination workload exists
		if destWlID != "" {
			edge := TrafficEdge{
				Source:      destSvcID,
				Target:      destWlID,
				Protocol:    protocol,
				Port:        80,
				RequestRate: requestRate,
				ErrorRate:   errorRate,
				Latency:     0,
				TrafficType: "http",
				Health:      health,
			}
			edges = append(edges, edge)
		}
	}

	// Query 2: Outgoing traffic (source telemetry) - if we have namespace filter
	if namespace != "" {
		query = fmt.Sprintf(`sum(rate(istio_requests_total{source_workload_namespace="%s"}[%vs])) by (%s) > 0`,
			namespace,
			int(duration.Seconds()),
			groupBy)

		result, err := client.Query(queryCtx, query, queryTime)
		if err == nil {
			// Process outgoing traffic similarly
			for _, sample := range result.Data.Result {
				metric := sample.Metric
				sourceNs := string(metric["source_workload_namespace"])
				sourceWl := string(metric["source_workload"])
				destNs := string(metric["destination_service_namespace"])
				destSvc := string(metric["destination_service_name"])
				protocol := string(metric["request_protocol"])
				responseCode := string(metric["response_code"])

				if sourceNs == "" || sourceWl == "" || destNs == "" || destSvc == "" {
					continue
				}

				var requestRate float64
				if len(sample.Value) >= 2 {
					if valStr, ok := sample.Value[1].(string); ok {
						if val, err := strconv.ParseFloat(valStr, 64); err == nil {
							requestRate = val
						}
					}
				}

				sourceID := fmt.Sprintf("wl_%s_%s", sourceNs, sourceWl)
				destSvcID := fmt.Sprintf("svc_%s_%s", destNs, destSvc)

				// Only add if nodes exist
				if _, sourceExists := nodeMap[sourceID]; sourceExists {
					if _, destExists := nodeMap[destSvcID]; !destExists {
						node := &TrafficNode{
							ID:        destSvcID,
							Name:      destSvc,
							Namespace: destNs,
							Type:      "service",
							Status:    "running",
							Health:    "healthy",
						}
						nodes = append(nodes, *node)
						nodeMap[destSvcID] = node
					}

					errorRate := 0.0
					if responseCode >= "500" && responseCode < "600" {
						errorRate = 100.0
					}

					health := "healthy"
					if errorRate > 20 {
						health = "unhealthy"
					} else if errorRate > 5 {
						health = "degraded"
					}

					edge := TrafficEdge{
						Source:      sourceID,
						Target:      destSvcID,
						Protocol:    protocol,
						Port:        80,
						RequestRate: requestRate,
						ErrorRate:   errorRate,
						Latency:     0,
						TrafficType: "http",
						Health:      health,
					}
					edges = append(edges, edge)
				}
			}
		}
	}

	return nodes, edges, nil
}

// buildTrafficGraphFromK8s builds traffic graph from Kubernetes API only (no Prometheus)
// This is called when Prometheus is not available - it uses the existing K8s-based approach
func (ws *WebServer) buildTrafficGraphFromK8s(ctx context.Context, namespace string) ([]TrafficNode, []TrafficEdge, error) {
	// Return error to trigger fallback to existing implementation
	// The existing handleTrafficMetrics will continue with K8s-only approach
	return nil, nil, fmt.Errorf("prometheus unavailable, using k8s fallback")
}

