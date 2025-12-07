// Copyright 2025 KubeGraf Contributors
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0

package gpu

// GPUStatus represents the status of GPU monitoring
type GPUStatus struct {
	DCGMInstalled bool            `json:"dcgmInstalled"`
	GPUNodesFound bool            `json:"gpuNodesFound"`
	GPUNodes      []GPUNodeInfo   `json:"gpuNodes,omitempty"`
	Namespace     string          `json:"namespace,omitempty"`
	ServiceURL    string          `json:"serviceURL,omitempty"`
	PrometheusURL string          `json:"prometheusURL,omitempty"`
}

// GPUMetrics represents GPU metrics for a node
type GPUMetrics struct {
	NodeName     string          `json:"nodeName"`
	GPUID        string          `json:"gpuId"`
	Utilization  float64         `json:"utilization"`  // Percentage
	MemoryUsed   int64           `json:"memoryUsed"`   // Bytes
	MemoryTotal  int64           `json:"memoryTotal"`   // Bytes
	Temperature  float64         `json:"temperature"`  // Celsius
	PowerDraw    float64         `json:"powerDraw"`    // Watts
	Processes    []GPUProcess    `json:"processes"`
	Timestamp    string          `json:"timestamp"`
}

// GPUProcess represents a process running on GPU
type GPUProcess struct {
	PID       int    `json:"pid"`
	Name      string `json:"name"`
	Memory    int64  `json:"memory"`    // Bytes
	Utilization float64 `json:"utilization"` // Percentage
}

// GPUInstallRequest represents a request to install DCGM exporter
type GPUInstallRequest struct {
	Namespace string `json:"namespace"`
	Version   string `json:"version,omitempty"`
}


// GPUNodeInfo represents GPU information from a node
type GPUNodeInfo struct {
	NodeName   string            `json:"nodeName"`
	GPUs       []GPUInfo         `json:"gpus"`
	TotalGPUs  int               `json:"totalGPUs"`
	GPUType    string            `json:"gpuType,omitempty"`
	Labels     map[string]string `json:"labels,omitempty"`
}

// GPUInfo represents basic GPU information from node
type GPUInfo struct {
	ID       string `json:"id"`
	Type     string `json:"type,omitempty"`
	Capacity string `json:"capacity"`
}
