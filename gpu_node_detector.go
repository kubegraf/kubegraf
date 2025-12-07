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

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/api/resource"
)

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

// DetectGPUNodes detects GPU nodes in the cluster without requiring DCGM
func (app *App) DetectGPUNodes(ctx context.Context) ([]GPUNodeInfo, error) {
	nodes, err := app.clientset.CoreV1().Nodes().List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to list nodes: %v", err)
	}

	var gpuNodes []GPUNodeInfo

	for _, node := range nodes.Items {
		// Check if node has GPU resources
		gpuQuantity, hasGPU := node.Status.Capacity["nvidia.com/gpu"]
		if !hasGPU || gpuQuantity.IsZero() {
			continue
		}

		// Get GPU count
		gpuCount := gpuQuantity.Value()
		if gpuCount == 0 {
			continue
		}

		// Get GPU type from labels
		gpuType := ""
		if nodeType, ok := node.Labels["nvidia.com/gpu.product"]; ok {
			gpuType = nodeType
		} else if nodeType, ok := node.Labels["accelerator"]; ok {
			gpuType = nodeType
		}

		// Build GPU info
		gpus := make([]GPUInfo, 0, gpuCount)
		for i := int64(0); i < gpuCount; i++ {
			gpus = append(gpus, GPUInfo{
				ID:       fmt.Sprintf("%d", i),
				Type:     gpuType,
				Capacity: gpuQuantity.String(),
			})
		}

		gpuNodes = append(gpuNodes, GPUNodeInfo{
			NodeName:  node.Name,
			GPUs:      gpus,
			TotalGPUs: int(gpuCount),
			GPUType:   gpuType,
			Labels:    node.Labels,
		})
	}

	return gpuNodes, nil
}

// GetNodeGPUCapacity gets GPU capacity for a specific node
func (app *App) GetNodeGPUCapacity(ctx context.Context, nodeName string) (*resource.Quantity, error) {
	node, err := app.clientset.CoreV1().Nodes().Get(ctx, nodeName, metav1.GetOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to get node: %v", err)
	}

	gpuQuantity, exists := node.Status.Capacity["nvidia.com/gpu"]
	if !exists {
		return nil, fmt.Errorf("node %s does not have GPU resources", nodeName)
	}

	return &gpuQuantity, nil
}

