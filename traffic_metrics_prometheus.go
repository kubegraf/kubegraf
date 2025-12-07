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

// fetchIstioTrafficMetrics fetches traffic metrics from Prometheus using Istio telemetry
func (ws *WebServer) fetchIstioTrafficMetrics(ctx context.Context, namespace string, duration time.Duration) (map[string]TrafficEdgeMetrics, error) {
	// Try to get Prometheus client (with quick timeout)
	detectCtx, cancel := context.WithTimeout(ctx, 1*time.Second)
	defer cancel()
	
	promURL, err := ws.app.DetectPrometheus(detectCtx)
	if err != nil {
		return nil, err // Prometheus not available, will fall back to K8s metrics
	}

	client := NewPrometheusClient(promURL)
	queryTime := time.Now()
	
	// Use a shorter duration for faster queries
	if duration > 5*time.Minute {
		duration = 5 * time.Minute
	}

	// Query for request rate (requests per second)
	requestRateQuery := fmt.Sprintf(`sum(rate(istio_requests_total{destination_service_namespace="%s"}[%vs])) by (source_workload_namespace,source_workload,destination_service_namespace,destination_service_name,destination_workload_namespace,destination_workload,response_code)`,
		namespace,
		int(duration.Seconds()))

	requestRateResult, err := client.Query(ctx, requestRateQuery, queryTime)
	if err != nil {
		return nil, err
	}

	// Query for error rate
	errorRateQuery := fmt.Sprintf(`sum(rate(istio_requests_total{destination_service_namespace="%s",response_code=~"5.."}[%vs])) by (source_workload_namespace,source_workload,destination_service_namespace,destination_service_name,destination_workload_namespace,destination_workload) / sum(rate(istio_requests_total{destination_service_namespace="%s"}[%vs])) by (source_workload_namespace,source_workload,destination_service_namespace,destination_service_name,destination_workload_namespace,destination_workload)`,
		namespace,
		int(duration.Seconds()),
		namespace,
		int(duration.Seconds()))

	errorRateResult, err := client.Query(ctx, errorRateQuery, queryTime)
	if err != nil {
		return nil, err
	}

	// Query for response time (p95)
	responseTimeQuery := fmt.Sprintf(`histogram_quantile(0.95, sum(rate(istio_request_duration_milliseconds_bucket{destination_service_namespace="%s"}[%vs])) by (le,source_workload_namespace,source_workload,destination_service_namespace,destination_service_name,destination_workload_namespace,destination_workload))`,
		namespace,
		int(duration.Seconds()))

	responseTimeResult, err := client.Query(ctx, responseTimeQuery, queryTime)
	if err != nil {
		return nil, err
	}

	// Build metrics map
	metricsMap := make(map[string]TrafficEdgeMetrics)

	// Process request rate results
	for _, result := range requestRateResult.Data.Result {
		metric := result.Metric
		sourceNs := metric["source_workload_namespace"]
		sourceWl := metric["source_workload"]
		destNs := metric["destination_service_namespace"]
		destSvc := metric["destination_service_name"]
		destWl := metric["destination_workload"]

		if sourceNs == "" || sourceWl == "" || destNs == "" || destSvc == "" {
			continue
		}

		key := fmt.Sprintf("%s/%s->%s/%s/%s", sourceNs, sourceWl, destNs, destSvc, destWl)
		
		// Extract value
		var requestRate float64
		if len(result.Value) >= 2 {
			if valStr, ok := result.Value[1].(string); ok {
				if val, err := strconv.ParseFloat(valStr, 64); err == nil {
					requestRate = val
				}
			}
		}

		if metricsMap[key].RequestRate == 0 {
			metricsMap[key] = TrafficEdgeMetrics{
				SourceNamespace:      sourceNs,
				SourceWorkload:        sourceWl,
				DestinationNamespace: destNs,
				DestinationService:    destSvc,
				DestinationWorkload:   destWl,
				RequestRate:           requestRate,
			}
		} else {
			existing := metricsMap[key]
			existing.RequestRate += requestRate
			metricsMap[key] = existing
		}
	}

	// Process error rate results
	for _, result := range errorRateResult.Data.Result {
		metric := result.Metric
		sourceNs := metric["source_workload_namespace"]
		sourceWl := metric["source_workload"]
		destNs := metric["destination_service_namespace"]
		destSvc := metric["destination_service_name"]
		destWl := metric["destination_workload"]

		key := fmt.Sprintf("%s/%s->%s/%s/%s", sourceNs, sourceWl, destNs, destSvc, destWl)
		
		var errorRate float64
		if len(result.Value) >= 2 {
			if valStr, ok := result.Value[1].(string); ok {
				if val, err := strconv.ParseFloat(valStr, 64); err == nil {
					errorRate = val * 100 // Convert to percentage
				}
			}
		}

		if existing, ok := metricsMap[key]; ok {
			existing.ErrorRate = errorRate
			metricsMap[key] = existing
		}
	}

	// Process response time results
	for _, result := range responseTimeResult.Data.Result {
		metric := result.Metric
		sourceNs := metric["source_workload_namespace"]
		sourceWl := metric["source_workload"]
		destNs := metric["destination_service_namespace"]
		destSvc := metric["destination_service_name"]
		destWl := metric["destination_workload"]

		key := fmt.Sprintf("%s/%s->%s/%s/%s", sourceNs, sourceWl, destNs, destSvc, destWl)
		
		var latency float64
		if len(result.Value) >= 2 {
			if valStr, ok := result.Value[1].(string); ok {
				if val, err := strconv.ParseFloat(valStr, 64); err == nil {
					latency = val
				}
			}
		}

		if existing, ok := metricsMap[key]; ok {
			existing.Latency = latency
			metricsMap[key] = existing
		}
	}

	return metricsMap, nil
}

// TrafficEdgeMetrics holds metrics for a traffic edge
type TrafficEdgeMetrics struct {
	SourceNamespace      string
	SourceWorkload        string
	DestinationNamespace  string
	DestinationService    string
	DestinationWorkload   string
	RequestRate           float64
	ErrorRate             float64
	Latency               float64
}

