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
	"io"
	"net/http"
	"strconv"
	"strings"
	"time"
)

// GetGPUMetrics fetches GPU metrics from DCGM exporter or Prometheus
func (ws *WebServer) GetGPUMetrics(ctx context.Context, status *GPUStatus) ([]GPUMetrics, error) {
	var metrics []GPUMetrics

	// Try Prometheus first if available
	if status.PrometheusURL != "" {
		promMetrics, err := ws.fetchGPUMetricsFromPrometheus(ctx, status.PrometheusURL)
		if err == nil {
			return promMetrics, nil
		}
	}

	// Fallback to DCGM REST API
	if status.ServiceURL != "" {
		dcgmMetrics, err := ws.fetchGPUMetricsFromDCGM(ctx, status.ServiceURL)
		if err == nil {
			return dcgmMetrics, nil
		}
	}

	return metrics, fmt.Errorf("unable to fetch GPU metrics")
}

// fetchGPUMetricsFromPrometheus fetches GPU metrics from Prometheus
func (ws *WebServer) fetchGPUMetricsFromPrometheus(ctx context.Context, promURL string) ([]GPUMetrics, error) {
	client := &http.Client{Timeout: 10 * time.Second}

	// Query GPU utilization
	utilQuery := `DCGM_FI_DEV_GPU_UTIL`
	utilURL := fmt.Sprintf("http://%s/api/v1/query?query=%s", promURL, utilQuery)

	req, err := http.NewRequestWithContext(ctx, "GET", utilURL, nil)
	if err != nil {
		return nil, err
	}

	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	var promResp struct {
		Data struct {
			Result []struct {
				Metric map[string]string `json:"metric"`
				Value  []interface{}     `json:"value"`
			} `json:"result"`
		} `json:"data"`
	}

	if err := json.Unmarshal(body, &promResp); err != nil {
		return nil, err
	}

	// Parse metrics (simplified - in production, query multiple metrics)
	metrics := make([]GPUMetrics, 0)
	for _, result := range promResp.Data.Result {
		nodeName := result.Metric["instance"]
		gpuID := result.Metric["gpu"]
		
		utilization := 0.0
		if len(result.Value) > 1 {
			if val, ok := result.Value[1].(string); ok {
				if f, err := strconv.ParseFloat(val, 64); err == nil {
					utilization = f
				}
			}
		}

		metrics = append(metrics, GPUMetrics{
			NodeName:    nodeName,
			GPUID:       gpuID,
			Utilization: utilization,
			Timestamp:   time.Now().Format(time.RFC3339),
		})
	}

	return metrics, nil
}

// fetchGPUMetricsFromDCGM fetches GPU metrics from DCGM REST API
func (ws *WebServer) fetchGPUMetricsFromDCGM(ctx context.Context, dcgmURL string) ([]GPUMetrics, error) {
	client := &http.Client{Timeout: 10 * time.Second}

	// DCGM exporter endpoint
	url := fmt.Sprintf("http://%s/metrics", dcgmURL)

	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return nil, err
	}

	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	// Parse Prometheus format metrics
	metrics := parsePrometheusMetrics(string(body))
	return metrics, nil
}

// parsePrometheusMetrics parses Prometheus format metrics
func parsePrometheusMetrics(metricsText string) []GPUMetrics {
	metrics := make([]GPUMetrics, 0)
	lines := strings.Split(metricsText, "\n")

	currentMetric := make(map[string]GPUMetrics)

	for _, line := range lines {
		if strings.HasPrefix(line, "DCGM_FI_DEV_GPU_UTIL") {
			// Parse utilization metric
			parts := strings.Fields(line)
			if len(parts) >= 2 {
				// Extract node and GPU from metric line
				// Format: DCGM_FI_DEV_GPU_UTIL{gpu="0",instance="node1"} 85.0
				// Simplified parsing
				value, _ := strconv.ParseFloat(parts[len(parts)-1], 64)
				
				// Extract labels (simplified)
				nodeName := "unknown"
				gpuID := "0"
				
				if strings.Contains(line, "instance=") {
					instanceStart := strings.Index(line, "instance=") + 9
					instanceEnd := strings.Index(line[instanceStart:], ",")
					if instanceEnd == -1 {
						instanceEnd = strings.Index(line[instanceStart:], "}")
					}
					if instanceEnd > 0 {
						nodeName = strings.Trim(line[instanceStart:instanceStart+instanceEnd], "\"")
					}
				}

				key := fmt.Sprintf("%s-%s", nodeName, gpuID)
				if m, exists := currentMetric[key]; exists {
					m.Utilization = value
					currentMetric[key] = m
				} else {
					currentMetric[key] = GPUMetrics{
						NodeName:    nodeName,
						GPUID:       gpuID,
						Utilization: value,
						Timestamp:   time.Now().Format(time.RFC3339),
					}
				}
			}
		}
	}

	// Convert map to slice
	for _, m := range currentMetric {
		metrics = append(metrics, m)
	}

	return metrics
}

