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
	"net/url"
	"strconv"
	"strings"
	"time"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// PrometheusClient handles queries to Prometheus
type PrometheusClient struct {
	baseURL    string
	httpClient *http.Client
}

// NewPrometheusClient creates a new Prometheus client
func NewPrometheusClient(baseURL string) *PrometheusClient {
	if baseURL == "" {
		baseURL = "http://prometheus:9090" // Default Prometheus service
	}
	return &PrometheusClient{
		baseURL: strings.TrimSuffix(baseURL, "/"),
		httpClient: &http.Client{
			Timeout: 2 * time.Second, // Short timeout for faster response
		},
	}
}

// QueryResult represents a Prometheus query result
type QueryResult struct {
	Status string `json:"status"`
	Data   struct {
		ResultType string `json:"resultType"`
		Result     []struct {
			Metric map[string]string `json:"metric"`
			Value  []interface{}     `json:"value"`
		} `json:"result"`
	} `json:"data"`
}

// QueryRangeResult represents a Prometheus range query result
type QueryRangeResult struct {
	Status string `json:"status"`
	Data   struct {
		ResultType string `json:"resultType"`
		Result     []struct {
			Metric map[string]string `json:"metric"`
			Values [][]interface{}   `json:"values"`
		} `json:"result"`
	} `json:"data"`
}

// Query executes a Prometheus instant query
func (pc *PrometheusClient) Query(ctx context.Context, query string, timestamp time.Time) (*QueryResult, error) {
	params := url.Values{}
	params.Set("query", query)
	if !timestamp.IsZero() {
		params.Set("time", strconv.FormatInt(timestamp.Unix(), 10))
	}

	resp, err := pc.httpClient.Get(fmt.Sprintf("%s/api/v1/query?%s", pc.baseURL, params.Encode()))
	if err != nil {
		return nil, fmt.Errorf("failed to query Prometheus: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("Prometheus query failed: %s", string(body))
	}

	var result QueryResult
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("failed to decode Prometheus response: %v", err)
	}

	if result.Status != "success" {
		return nil, fmt.Errorf("Prometheus query failed: %s", result.Status)
	}

	return &result, nil
}

// QueryRange executes a Prometheus range query
func (pc *PrometheusClient) QueryRange(ctx context.Context, query string, start, end time.Time, step time.Duration) (*QueryRangeResult, error) {
	params := url.Values{}
	params.Set("query", query)
	params.Set("start", strconv.FormatInt(start.Unix(), 10))
	params.Set("end", strconv.FormatInt(end.Unix(), 10))
	params.Set("step", strconv.FormatInt(int64(step.Seconds()), 10))

	resp, err := pc.httpClient.Get(fmt.Sprintf("%s/api/v1/query_range?%s", pc.baseURL, params.Encode()))
	if err != nil {
		return nil, fmt.Errorf("failed to query Prometheus: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("Prometheus query failed: %s", string(body))
	}

	var result QueryRangeResult
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("failed to decode Prometheus response: %v", err)
	}

	if result.Status != "success" {
		return nil, fmt.Errorf("Prometheus query failed: %s", result.Status)
	}

	return &result, nil
}

// DetectPrometheus tries to detect if Prometheus is available
func (a *App) DetectPrometheus(ctx context.Context) (string, error) {
	// Try common Prometheus service locations
	locations := []string{
		"http://prometheus.prometheus.svc.cluster.local:9090",
		"http://prometheus.monitoring.svc.cluster.local:9090",
		"http://prometheus.kube-system.svc.cluster.local:9090",
		"http://prometheus:9090",
		"http://localhost:9090",
	}

	for _, loc := range locations {
		client := NewPrometheusClient(loc)
		_, err := client.Query(ctx, "up", time.Now())
		if err == nil {
			return loc, nil
		}
	}

	// Try to find Prometheus service in cluster
	services, err := a.clientset.CoreV1().Services("").List(ctx, metav1.ListOptions{
		LabelSelector: "app=prometheus",
	})
	if err == nil {
		for _, svc := range services.Items {
			for _, port := range svc.Spec.Ports {
				if port.Name == "http" || port.Port == 9090 {
					return fmt.Sprintf("http://%s.%s.svc.cluster.local:%d", svc.Name, svc.Namespace, port.Port), nil
				}
			}
		}
	}

	return "", fmt.Errorf("Prometheus not detected")
}

