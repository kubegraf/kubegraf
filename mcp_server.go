// Copyright 2025 KubeGraf Contributors
// SPDX-License-Identifier: Apache-2.0

package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"sync"
	"time"

	v1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// MCP (Model Context Protocol) Server Implementation
// Based on: https://modelcontextprotocol.io

// MCPMessage represents an MCP protocol message
type MCPMessage struct {
	JSONRPC string          `json:"jsonrpc"`
	ID      interface{}     `json:"id,omitempty"`
	Method  string          `json:"method,omitempty"`
	Params  json.RawMessage `json:"params,omitempty"`
	Result  interface{}     `json:"result,omitempty"`
	Error   *MCPError       `json:"error,omitempty"`
}

// MCPError represents an MCP protocol error
type MCPError struct {
	Code    int    `json:"code"`
	Message string `json:"message"`
	Data    interface{} `json:"data,omitempty"`
}

// MCPTool represents a tool available through MCP
type MCPTool struct {
	Name        string                 `json:"name"`
	Description string                 `json:"description"`
	InputSchema map[string]interface{} `json:"inputSchema"`
}

// MCPToolResult represents the result of executing an MCP tool
type MCPToolResult struct {
	Content []MCPContent `json:"content"`
	IsError bool         `json:"isError,omitempty"`
}

// MCPContent represents content in an MCP response
type MCPContent struct {
	Type string `json:"type"` // "text", "image", "resource"
	Text string `json:"text,omitempty"`
}

// MCPServer handles MCP protocol communication
type MCPServer struct {
	app        *App
	tools      map[string]MCPTool
	toolsMu    sync.RWMutex
	handlers   map[string]func(context.Context, json.RawMessage) (*MCPToolResult, error)
	requestCtx context.Context
}

// NewMCPServer creates a new MCP server
func NewMCPServer(app *App) *MCPServer {
	server := &MCPServer{
		app:      app,
		tools:    make(map[string]MCPTool),
		handlers: make(map[string]func(context.Context, json.RawMessage) (*MCPToolResult, error)),
	}
	server.registerDefaultTools()
	return server
}

// registerDefaultTools registers default Kubernetes tools
func (mcp *MCPServer) registerDefaultTools() {
	// Kubernetes resource operations
	mcp.RegisterTool("kubectl_get", MCPTool{
		Name:        "kubectl_get",
		Description: "Get Kubernetes resources (pods, deployments, services, etc.)",
		InputSchema: map[string]interface{}{
			"type": "object",
			"properties": map[string]interface{}{
				"kind": map[string]interface{}{
					"type":        "string",
					"description": "Resource kind (Pod, Deployment, Service, etc.)",
				},
				"name": map[string]interface{}{
					"type":        "string",
					"description": "Resource name (optional)",
				},
				"namespace": map[string]interface{}{
					"type":        "string",
					"description": "Namespace (optional, use 'default' if not specified)",
				},
			},
			"required": []string{"kind"},
		},
	}, mcp.handleKubectlGet)

	mcp.RegisterTool("kubectl_describe", MCPTool{
		Name:        "kubectl_describe",
		Description: "Get detailed information about a Kubernetes resource",
		InputSchema: map[string]interface{}{
			"type": "object",
			"properties": map[string]interface{}{
				"kind": map[string]interface{}{
					"type":        "string",
					"description": "Resource kind",
				},
				"name": map[string]interface{}{
					"type":        "string",
					"description": "Resource name",
				},
				"namespace": map[string]interface{}{
					"type":        "string",
					"description": "Namespace",
				},
			},
			"required": []string{"kind", "name"},
		},
	}, mcp.handleKubectlDescribe)

	mcp.RegisterTool("kubectl_scale", MCPTool{
		Name:        "kubectl_scale",
		Description: "Scale a deployment or statefulset",
		InputSchema: map[string]interface{}{
			"type": "object",
			"properties": map[string]interface{}{
				"kind": map[string]interface{}{
					"type":        "string",
					"description": "Resource kind (Deployment or StatefulSet)",
					"enum":        []string{"Deployment", "StatefulSet"},
				},
				"name": map[string]interface{}{
					"type":        "string",
					"description": "Resource name",
				},
				"namespace": map[string]interface{}{
					"type":        "string",
					"description": "Namespace",
				},
				"replicas": map[string]interface{}{
					"type":        "integer",
					"description": "Number of replicas",
				},
			},
			"required": []string{"kind", "name", "namespace", "replicas"},
		},
	}, mcp.handleKubectlScale)

	mcp.RegisterTool("kubectl_logs", MCPTool{
		Name:        "kubectl_logs",
		Description: "Get logs from a pod",
		InputSchema: map[string]interface{}{
			"type": "object",
			"properties": map[string]interface{}{
				"pod": map[string]interface{}{
					"type":        "string",
					"description": "Pod name",
				},
				"namespace": map[string]interface{}{
					"type":        "string",
					"description": "Namespace",
				},
				"container": map[string]interface{}{
					"type":        "string",
					"description": "Container name (optional)",
				},
				"tail": map[string]interface{}{
					"type":        "integer",
					"description": "Number of lines to tail (default: 100)",
				},
			},
			"required": []string{"pod", "namespace"},
		},
	}, mcp.handleKubectlLogs)

	mcp.RegisterTool("analyze_pod", MCPTool{
		Name:        "analyze_pod",
		Description: "Analyze a pod's status and provide insights using AI",
		InputSchema: map[string]interface{}{
			"type": "object",
			"properties": map[string]interface{}{
				"pod": map[string]interface{}{
					"type":        "string",
					"description": "Pod name",
				},
				"namespace": map[string]interface{}{
					"type":        "string",
					"description": "Namespace",
				},
			},
			"required": []string{"pod", "namespace"},
		},
	}, mcp.handleAnalyzePod)

	mcp.RegisterTool("get_metrics", MCPTool{
		Name:        "get_metrics",
		Description: "Get resource metrics (CPU, memory) for pods or nodes",
		InputSchema: map[string]interface{}{
			"type": "object",
			"properties": map[string]interface{}{
				"resource": map[string]interface{}{
					"type":        "string",
					"description": "Resource type: 'pod' or 'node'",
					"enum":        []string{"pod", "node"},
				},
				"name": map[string]interface{}{
					"type":        "string",
					"description": "Resource name (optional for nodes)",
				},
				"namespace": map[string]interface{}{
					"type":        "string",
					"description": "Namespace (required for pods)",
				},
			},
			"required": []string{"resource"},
		},
	}, mcp.handleGetMetrics)

	mcp.RegisterTool("detect_anomalies", MCPTool{
		Name:        "detect_anomalies",
		Description: "Run anomaly detection on the cluster",
		InputSchema: map[string]interface{}{
			"type": "object",
			"properties": map[string]interface{}{
				"severity": map[string]interface{}{
					"type":        "string",
					"description": "Filter by severity (critical, warning, info)",
					"enum":        []string{"critical", "warning", "info", ""},
				},
			},
		},
	}, mcp.handleDetectAnomalies)

	mcp.RegisterTool("get_recommendations", MCPTool{
		Name:        "get_recommendations",
		Description: "Get ML-powered optimization recommendations",
		InputSchema: map[string]interface{}{
			"type": "object",
			"properties": map[string]interface{}{
				"type": map[string]interface{}{
					"type":        "string",
					"description": "Recommendation type filter (optional)",
					"enum":        []string{"resource_optimization", "predictive_scaling", "cost_optimization", ""},
				},
			},
		},
	}, mcp.handleGetRecommendations)

	mcp.RegisterTool("estimate_cost", MCPTool{
		Name:        "estimate_cost",
		Description: "Estimate cost for a namespace or the entire cluster",
		InputSchema: map[string]interface{}{
			"type": "object",
			"properties": map[string]interface{}{
				"namespace": map[string]interface{}{
					"type":        "string",
					"description": "Namespace (optional, estimates cluster cost if not provided)",
				},
			},
		},
	}, mcp.handleEstimateCost)

	mcp.RegisterTool("security_scan", MCPTool{
		Name:        "security_scan",
		Description: "Run security analysis on the cluster",
		InputSchema: map[string]interface{}{
			"type": "object",
			"properties": map[string]interface{}{
				"namespace": map[string]interface{}{
					"type":        "string",
					"description": "Namespace to scan (optional, scans all if not provided)",
				},
			},
		},
	}, mcp.handleSecurityScan)
}

// RegisterTool registers a new MCP tool
func (mcp *MCPServer) RegisterTool(name string, tool MCPTool, handler func(context.Context, json.RawMessage) (*MCPToolResult, error)) {
	mcp.toolsMu.Lock()
	defer mcp.toolsMu.Unlock()
	mcp.tools[name] = tool
	mcp.handlers[name] = handler
}

// HandleRequest handles an MCP protocol request
func (mcp *MCPServer) HandleRequest(w http.ResponseWriter, r *http.Request) {
	// Store request context for use in handlers
	mcp.requestCtx = r.Context()
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	body, err := io.ReadAll(r.Body)
	if err != nil {
		http.Error(w, "Failed to read request body", http.StatusBadRequest)
		return
	}

	var msg MCPMessage
	if err := json.Unmarshal(body, &msg); err != nil {
		mcp.sendError(w, nil, -32700, "Parse error", err.Error())
		return
	}

	// Handle different MCP methods
	switch msg.Method {
	case "initialize":
		mcp.handleInitialize(w, &msg)
	case "tools/list":
		mcp.handleToolsList(w, &msg)
	case "tools/call":
		mcp.handleToolsCall(w, &msg)
	case "ping":
		mcp.sendResponse(w, &msg, map[string]string{"status": "pong"})
	default:
		mcp.sendError(w, &msg, -32601, "Method not found", fmt.Sprintf("Unknown method: %s", msg.Method))
	}
}

// handleInitialize handles MCP initialize request
func (mcp *MCPServer) handleInitialize(w http.ResponseWriter, msg *MCPMessage) {
	response := map[string]interface{}{
		"protocolVersion": "2024-11-05",
		"capabilities": map[string]interface{}{
			"tools": map[string]interface{}{},
		},
		"serverInfo": map[string]interface{}{
			"name":    "kubegraf-mcp-server",
			"version": GetVersion(),
		},
	}
	mcp.sendResponse(w, msg, response)
}

// handleToolsList handles MCP tools/list request
func (mcp *MCPServer) handleToolsList(w http.ResponseWriter, msg *MCPMessage) {
	mcp.toolsMu.RLock()
	defer mcp.toolsMu.RUnlock()

	tools := make([]MCPTool, 0, len(mcp.tools))
	for _, tool := range mcp.tools {
		tools = append(tools, tool)
	}

	response := map[string]interface{}{
		"tools": tools,
	}
	mcp.sendResponse(w, msg, response)
}

// handleToolsCall handles MCP tools/call request
func (mcp *MCPServer) handleToolsCall(w http.ResponseWriter, msg *MCPMessage) {
	var params struct {
		Name      string          `json:"name"`
		Arguments json.RawMessage `json:"arguments"`
	}

	if err := json.Unmarshal(msg.Params, &params); err != nil {
		mcp.sendError(w, msg, -32602, "Invalid params", err.Error())
		return
	}

	mcp.toolsMu.RLock()
	handler, exists := mcp.handlers[params.Name]
	mcp.toolsMu.RUnlock()

	if !exists {
		mcp.sendError(w, msg, -32601, "Tool not found", fmt.Sprintf("Tool '%s' not found", params.Name))
		return
	}

	ctx, cancel := context.WithTimeout(mcp.requestCtx, 30*time.Second)
	defer cancel()

	result, err := handler(ctx, params.Arguments)
	if err != nil {
		mcp.sendError(w, msg, -32000, "Tool execution error", err.Error())
		return
	}

	mcp.sendResponse(w, msg, result)
}

// Tool handlers

func (mcp *MCPServer) handleKubectlGet(ctx context.Context, args json.RawMessage) (*MCPToolResult, error) {
	var params struct {
		Kind      string `json:"kind"`
		Name      string `json:"name,omitempty"`
		Namespace string `json:"namespace,omitempty"`
	}

	if err := json.Unmarshal(args, &params); err != nil {
		return nil, fmt.Errorf("invalid arguments: %v", err)
	}

	if mcp.app.clientset == nil || !mcp.app.connected {
		return nil, fmt.Errorf("not connected to cluster")
	}

	// Normalize kind to handle case variations (Pod, pod, POD)
	kind := strings.Title(strings.ToLower(params.Kind))
	if kind == "" {
		return nil, fmt.Errorf("kind parameter is required")
	}

	// Set default namespace if not provided
	namespace := params.Namespace
	if namespace == "" {
		namespace = "default"
	}

	// Map kind to API group/version
	var result string
	switch kind {
	case "Pod":
		if params.Name != "" {
			pod, err := mcp.app.clientset.CoreV1().Pods(namespace).Get(ctx, params.Name, metav1.GetOptions{})
			if err != nil {
				return nil, fmt.Errorf("failed to get pod %s/%s: %v", namespace, params.Name, err)
			}
			result = fmt.Sprintf("Pod: %s/%s\nStatus: %s\nPhase: %s", pod.Namespace, pod.Name, pod.Status.Phase, pod.Status.Phase)
		} else {
			pods, err := mcp.app.clientset.CoreV1().Pods(namespace).List(ctx, metav1.ListOptions{})
			if err != nil {
				return nil, fmt.Errorf("failed to list pods in namespace %s: %v", namespace, err)
			}
			result = fmt.Sprintf("Found %d pods in namespace '%s':", len(pods.Items), namespace)
			for _, pod := range pods.Items {
				result += fmt.Sprintf("\n- %s/%s (%s)", pod.Namespace, pod.Name, pod.Status.Phase)
			}
		}
	case "Deployment":
		if params.Name != "" {
			deploy, err := mcp.app.clientset.AppsV1().Deployments(namespace).Get(ctx, params.Name, metav1.GetOptions{})
			if err != nil {
				return nil, fmt.Errorf("failed to get deployment %s/%s: %v", namespace, params.Name, err)
			}
			result = fmt.Sprintf("Deployment: %s/%s\nReplicas: %d/%d", deploy.Namespace, deploy.Name, deploy.Status.ReadyReplicas, *deploy.Spec.Replicas)
		} else {
			deploys, err := mcp.app.clientset.AppsV1().Deployments(namespace).List(ctx, metav1.ListOptions{})
			if err != nil {
				return nil, fmt.Errorf("failed to list deployments in namespace %s: %v", namespace, err)
			}
			result = fmt.Sprintf("Found %d deployments in namespace '%s':", len(deploys.Items), namespace)
			for _, deploy := range deploys.Items {
				result += fmt.Sprintf("\n- %s/%s (%d/%d replicas)", deploy.Namespace, deploy.Name, deploy.Status.ReadyReplicas, *deploy.Spec.Replicas)
			}
		}
	default:
		return nil, fmt.Errorf("unsupported resource kind: %s (supported: Pod, Deployment)", params.Kind)
	}

	return &MCPToolResult{
		Content: []MCPContent{{Type: "text", Text: result}},
	}, nil
}

func (mcp *MCPServer) handleKubectlDescribe(ctx context.Context, args json.RawMessage) (*MCPToolResult, error) {
	var params struct {
		Kind      string `json:"kind"`
		Name      string `json:"name"`
		Namespace string `json:"namespace,omitempty"`
	}

	if err := json.Unmarshal(args, &params); err != nil {
		return nil, fmt.Errorf("invalid arguments: %v", err)
	}

	describe, err := runKubectlDescribe(params.Kind, params.Name, params.Namespace)
	if err != nil {
		return nil, err
	}

	return &MCPToolResult{
		Content: []MCPContent{{Type: "text", Text: describe}},
	}, nil
}

func (mcp *MCPServer) handleKubectlScale(ctx context.Context, args json.RawMessage) (*MCPToolResult, error) {
	var params struct {
		Kind      string `json:"kind"`
		Name      string `json:"name"`
		Namespace string `json:"namespace"`
		Replicas  int32  `json:"replicas"`
	}

	if err := json.Unmarshal(args, &params); err != nil {
		return nil, fmt.Errorf("invalid arguments: %v", err)
	}

	if mcp.app.clientset == nil || !mcp.app.connected {
		return nil, fmt.Errorf("not connected to cluster")
	}

	var err error
	switch params.Kind {
	case "Deployment":
		scale, err := mcp.app.clientset.AppsV1().Deployments(params.Namespace).GetScale(ctx, params.Name, metav1.GetOptions{})
		if err != nil {
			return nil, err
		}
		scale.Spec.Replicas = params.Replicas
		_, err = mcp.app.clientset.AppsV1().Deployments(params.Namespace).UpdateScale(ctx, params.Name, scale, metav1.UpdateOptions{})
	case "StatefulSet":
		scale, err := mcp.app.clientset.AppsV1().StatefulSets(params.Namespace).GetScale(ctx, params.Name, metav1.GetOptions{})
		if err != nil {
			return nil, err
		}
		scale.Spec.Replicas = params.Replicas
		_, err = mcp.app.clientset.AppsV1().StatefulSets(params.Namespace).UpdateScale(ctx, params.Name, scale, metav1.UpdateOptions{})
	default:
		return nil, fmt.Errorf("unsupported resource kind for scaling: %s", params.Kind)
	}

	if err != nil {
		return nil, err
	}

	return &MCPToolResult{
		Content: []MCPContent{{Type: "text", Text: fmt.Sprintf("Successfully scaled %s/%s to %d replicas", params.Namespace, params.Name, params.Replicas)}},
	}, nil
}

func (mcp *MCPServer) handleKubectlLogs(ctx context.Context, args json.RawMessage) (*MCPToolResult, error) {
	var params struct {
		Pod       string `json:"pod"`
		Namespace string `json:"namespace"`
		Container string `json:"container,omitempty"`
		Tail      int    `json:"tail,omitempty"`
	}

	if err := json.Unmarshal(args, &params); err != nil {
		return nil, fmt.Errorf("invalid arguments: %v", err)
	}

	if params.Tail == 0 {
		params.Tail = 100
	}

	logs, err := mcp.getPodLogs(ctx, params.Namespace, params.Pod, params.Container, params.Tail)
	if err != nil {
		return nil, err
	}

	return &MCPToolResult{
		Content: []MCPContent{{Type: "text", Text: logs}},
	}, nil
}

func (mcp *MCPServer) handleAnalyzePod(ctx context.Context, args json.RawMessage) (*MCPToolResult, error) {
	var params struct {
		Pod       string `json:"pod"`
		Namespace string `json:"namespace"`
	}

	if err := json.Unmarshal(args, &params); err != nil {
		return nil, fmt.Errorf("invalid arguments: %v", err)
	}

	assistant := NewAIAssistant(nil)
	if !assistant.IsAvailable() {
		return nil, fmt.Errorf("AI provider not available")
	}

	pod, err := mcp.app.clientset.CoreV1().Pods(params.Namespace).Get(ctx, params.Pod, metav1.GetOptions{})
	if err != nil {
		return nil, err
	}

	input := PodAnalysisInput{
		Name:      params.Pod,
		Namespace: params.Namespace,
		Status:    string(pod.Status.Phase),
		Phase:     string(pod.Status.Phase),
	}

	analysis, err := assistant.AnalyzePod(ctx, input)
	if err != nil {
		return nil, err
	}

	return &MCPToolResult{
		Content: []MCPContent{{Type: "text", Text: analysis}},
	}, nil
}

func (mcp *MCPServer) handleGetMetrics(ctx context.Context, args json.RawMessage) (*MCPToolResult, error) {
	var params struct {
		Resource  string `json:"resource"` // "pod" or "node"
		Name       string `json:"name,omitempty"`
		Namespace  string `json:"namespace,omitempty"`
	}

	if err := json.Unmarshal(args, &params); err != nil {
		return nil, fmt.Errorf("invalid arguments: %v", err)
	}

	if mcp.app.metricsClient == nil {
		return nil, fmt.Errorf("metrics API not available")
	}

	var result string
	if params.Resource == "node" {
		if params.Name != "" {
			metrics, err := mcp.app.metricsClient.MetricsV1beta1().NodeMetricses().Get(ctx, params.Name, metav1.GetOptions{})
			if err != nil {
				return nil, err
			}
			cpu := metrics.Usage.Cpu().MilliValue()
			mem := metrics.Usage.Memory().Value() / (1024 * 1024) // MB
			result = fmt.Sprintf("Node %s:\nCPU: %dm\nMemory: %dMi", params.Name, cpu, mem)
		} else {
			metrics, err := mcp.app.metricsClient.MetricsV1beta1().NodeMetricses().List(ctx, metav1.ListOptions{})
			if err != nil {
				return nil, err
			}
			result = fmt.Sprintf("Found %d nodes with metrics", len(metrics.Items))
		}
	} else if params.Resource == "pod" {
		if params.Name != "" {
			metrics, err := mcp.app.metricsClient.MetricsV1beta1().PodMetricses(params.Namespace).Get(ctx, params.Name, metav1.GetOptions{})
			if err != nil {
				return nil, err
			}
			result = fmt.Sprintf("Pod %s/%s metrics:\n", params.Namespace, params.Name)
			for _, container := range metrics.Containers {
				cpu := container.Usage.Cpu().MilliValue()
				mem := container.Usage.Memory().Value() / (1024 * 1024)
				result += fmt.Sprintf("Container %s: CPU %dm, Memory %dMi\n", container.Name, cpu, mem)
			}
		} else {
			metrics, err := mcp.app.metricsClient.MetricsV1beta1().PodMetricses(params.Namespace).List(ctx, metav1.ListOptions{})
			if err != nil {
				return nil, err
			}
			result = fmt.Sprintf("Found %d pods with metrics in namespace %s", len(metrics.Items), params.Namespace)
		}
	}

	return &MCPToolResult{
		Content: []MCPContent{{Type: "text", Text: result}},
	}, nil
}

func (mcp *MCPServer) handleDetectAnomalies(ctx context.Context, args json.RawMessage) (*MCPToolResult, error) {
	var params struct {
		Severity string `json:"severity,omitempty"`
	}

	json.Unmarshal(args, &params) // Optional params

	anomalies, err := mcp.app.anomalyDetector.DetectAnomalies(ctx)
	if err != nil {
		return nil, err
	}
	// Filter by severity if provided
	if params.Severity != "" {
		filtered := []Anomaly{}
		for _, anomaly := range anomalies {
			if strings.EqualFold(anomaly.Severity, params.Severity) {
				filtered = append(filtered, anomaly)
			}
		}
		anomalies = filtered
	}
	if err != nil {
		return nil, err
	}

	result := fmt.Sprintf("Found %d anomalies\n", len(anomalies))
	for i, anomaly := range anomalies {
		if i >= 10 { // Limit to 10 for readability
			result += fmt.Sprintf("\n... and %d more", len(anomalies)-10)
			break
		}
		result += fmt.Sprintf("\n- [%s] %s: %s", anomaly.Severity, anomaly.Type, anomaly.Message)
	}

	return &MCPToolResult{
		Content: []MCPContent{{Type: "text", Text: result}},
	}, nil
}

func (mcp *MCPServer) handleGetRecommendations(ctx context.Context, args json.RawMessage) (*MCPToolResult, error) {
	var params struct {
		Type string `json:"type,omitempty"`
	}

	json.Unmarshal(args, &params) // Optional params

	recommendations, err := mcp.app.mlRecommender.GenerateRecommendations(ctx)
	if err != nil {
		return nil, err
	}

	result := fmt.Sprintf("Found %d recommendations\n", len(recommendations))
	for i, rec := range recommendations {
		if i >= 10 {
			result += fmt.Sprintf("\n... and %d more", len(recommendations)-10)
			break
		}
		result += fmt.Sprintf("\n- [%s] %s: %s", rec.Type, rec.Title, rec.Description)
	}

	return &MCPToolResult{
		Content: []MCPContent{{Type: "text", Text: result}},
	}, nil
}

func (mcp *MCPServer) handleEstimateCost(ctx context.Context, args json.RawMessage) (*MCPToolResult, error) {
	var params struct {
		Namespace string `json:"namespace,omitempty"`
	}

	json.Unmarshal(args, &params)

	estimator := NewCostEstimator(mcp.app)
	var cost interface{}
	var err error

	if params.Namespace != "" {
		cost, err = estimator.EstimateNamespaceCost(ctx, params.Namespace)
	} else {
		cost, err = estimator.EstimateClusterCost(ctx)
	}

	if err != nil {
		return nil, err
	}

	costJSON, _ := json.MarshalIndent(cost, "", "  ")
	return &MCPToolResult{
		Content: []MCPContent{{Type: "text", Text: string(costJSON)}},
	}, nil
}

func (mcp *MCPServer) handleSecurityScan(ctx context.Context, args json.RawMessage) (*MCPToolResult, error) {
	var params struct {
		Namespace string `json:"namespace,omitempty"`
	}

	json.Unmarshal(args, &params)

	// Use the existing security analysis endpoint via web server handler
	// For now, return a simple message directing to use the API endpoint
	// In production, we'd call the diagnostics engine directly
	namespace := params.Namespace
	if namespace == "" {
		namespace = "_all"
	}

	// Get pods to analyze security
	if mcp.app.clientset == nil || !mcp.app.connected {
		return nil, fmt.Errorf("not connected to cluster")
	}

	pods, err := mcp.app.clientset.CoreV1().Pods(namespace).List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, err
	}

	// Simple security analysis
	critical := 0
	high := 0
	medium := 0
	low := 0

	for _, pod := range pods.Items {
		// Check for security issues
		if pod.Spec.SecurityContext == nil {
			critical++
		} else if pod.Spec.SecurityContext.RunAsNonRoot == nil || !*pod.Spec.SecurityContext.RunAsNonRoot {
			high++
		}

		for _, container := range pod.Spec.Containers {
			if container.SecurityContext != nil {
				if container.SecurityContext.Privileged != nil && *container.SecurityContext.Privileged {
					critical++
				}
				if container.SecurityContext.AllowPrivilegeEscalation != nil && *container.SecurityContext.AllowPrivilegeEscalation {
					medium++
				}
			}
		}
	}

	score := 100 - (critical*10 + high*5 + medium*2 + low*1)
	if score < 0 {
		score = 0
	}

	result := fmt.Sprintf("Security Score: %d/100\n\n", score)
	result += fmt.Sprintf("Critical: %d\nHigh: %d\nMedium: %d\nLow: %d\n", critical, high, medium, low)

	return &MCPToolResult{
		Content: []MCPContent{{Type: "text", Text: result}},
	}, nil
}

// Production-grade intelligent tool handlers

func (mcp *MCPServer) handleAnalyzeClusterHealth(ctx context.Context, args json.RawMessage) (*MCPToolResult, error) {
	var params struct {
		Namespace string `json:"namespace,omitempty"`
	}

	json.Unmarshal(args, &params)

	if mcp.app.clientset == nil || !mcp.app.connected {
		return nil, fmt.Errorf("not connected to cluster")
	}

	namespace := params.Namespace
	if namespace == "" {
		namespace = "_all"
	}

	// Run comprehensive health analysis
	result := "🔍 Cluster Health Analysis\n\n"

	// 1. Check nodes
	nodes, err := mcp.app.clientset.CoreV1().Nodes().List(ctx, metav1.ListOptions{})
	if err == nil {
		readyNodes := 0
		for _, node := range nodes.Items {
			for _, condition := range node.Status.Conditions {
				if condition.Type == "Ready" && condition.Status == "True" {
					readyNodes++
					break
				}
			}
		}
		result += fmt.Sprintf("📊 Nodes: %d/%d ready\n", readyNodes, len(nodes.Items))
		if readyNodes < len(nodes.Items) {
			result += "⚠️  Some nodes are not ready\n"
		}
	}

	// 2. Check pods
	pods, err := mcp.app.clientset.CoreV1().Pods(namespace).List(ctx, metav1.ListOptions{})
	if err == nil {
		runningPods := 0
		failedPods := 0
		for _, pod := range pods.Items {
			if pod.Status.Phase == "Running" {
				runningPods++
			} else if pod.Status.Phase == "Failed" {
				failedPods++
			}
		}
		result += fmt.Sprintf("📦 Pods: %d running, %d failed (total: %d)\n", runningPods, failedPods, len(pods.Items))
		if failedPods > 0 {
			result += fmt.Sprintf("⚠️  %d pods are in Failed state\n", failedPods)
		}
	}

	// 3. Run anomaly detection
	if mcp.app.anomalyDetector != nil {
		anomalies, err := mcp.app.anomalyDetector.DetectAnomalies(ctx)
		if err == nil && len(anomalies) > 0 {
			result += fmt.Sprintf("\n🚨 Anomalies Detected: %d\n", len(anomalies))
			critical := 0
			for _, a := range anomalies {
				if a.Severity == "critical" {
					critical++
				}
			}
			if critical > 0 {
				result += fmt.Sprintf("   ⚠️  %d critical anomalies found\n", critical)
			}
		}
	}

	// 4. Get ML recommendations
	if mcp.app.mlRecommender != nil {
		recommendations, err := mcp.app.mlRecommender.GenerateRecommendations(ctx)
		if err == nil && len(recommendations) > 0 {
			result += fmt.Sprintf("\n💡 ML Recommendations: %d available\n", len(recommendations))
			highImpact := 0
			for _, r := range recommendations {
				if r.Impact == "high" {
					highImpact++
				}
			}
			if highImpact > 0 {
				result += fmt.Sprintf("   ⭐ %d high-impact recommendations\n", highImpact)
			}
		}
	}

	result += "\n✅ Analysis complete. Review anomalies and recommendations for actionable insights."

	return &MCPToolResult{
		Content: []MCPContent{{Type: "text", Text: result}},
	}, nil
}

func (mcp *MCPServer) handleAutoRemediate(ctx context.Context, args json.RawMessage) (*MCPToolResult, error) {
	var params struct {
		Namespace string `json:"namespace,omitempty"`
		DryRun    bool   `json:"dry_run,omitempty"`
	}

	json.Unmarshal(args, &params)

	if mcp.app.clientset == nil || !mcp.app.connected {
		return nil, fmt.Errorf("not connected to cluster")
	}

	if mcp.app.anomalyDetector == nil {
		return nil, fmt.Errorf("anomaly detector not available")
	}

	namespace := params.Namespace
	if namespace == "" {
		namespace = "_all"
	}

	result := "🔧 Auto-Remediation Analysis\n\n"

	// Detect anomalies
	anomalies, err := mcp.app.anomalyDetector.DetectAnomalies(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to detect anomalies: %v", err)
	}

	if len(anomalies) == 0 {
		result += "✅ No issues detected. Cluster is healthy!"
		return &MCPToolResult{
			Content: []MCPContent{{Type: "text", Text: result}},
		}, nil
	}

	result += fmt.Sprintf("Found %d issues to remediate:\n\n", len(anomalies))

	remediated := 0
	failed := 0

	for _, anomaly := range anomalies {
		result += fmt.Sprintf("🔍 Issue: %s\n", anomaly.Message)
		result += fmt.Sprintf("   Type: %s, Severity: %s\n", anomaly.Type, anomaly.Severity)

		if params.DryRun {
			result += "   [DRY RUN] Would remediate: "
			if anomaly.AutoRemediable {
				result += "Yes\n"
			} else {
				result += "No (manual intervention required)\n"
			}
		} else {
			if anomaly.AutoRemediable {
				err := mcp.app.anomalyDetector.AutoRemediate(ctx, anomaly)
				if err != nil {
					result += fmt.Sprintf("   ❌ Remediation failed: %v\n", err)
					failed++
				} else {
					result += "   ✅ Remediated successfully\n"
					remediated++
				}
			} else {
				result += "   ⚠️  Requires manual intervention\n"
			}
		}
		result += "\n"
	}

	if !params.DryRun {
		result += fmt.Sprintf("\n📊 Summary: %d remediated, %d failed\n", remediated, failed)
	} else {
		result += "\n💡 This was a dry run. Set dry_run=false to apply fixes."
	}

	return &MCPToolResult{
		Content: []MCPContent{{Type: "text", Text: result}},
	}, nil
}

func (mcp *MCPServer) handleSmartScale(ctx context.Context, args json.RawMessage) (*MCPToolResult, error) {
	var params struct {
		Deployment    string `json:"deployment"`
		Namespace     string `json:"namespace"`
		TargetReplicas *int32 `json:"target_replicas,omitempty"`
		HoursAhead    int    `json:"hours_ahead,omitempty"`
	}

	if err := json.Unmarshal(args, &params); err != nil {
		return nil, fmt.Errorf("invalid arguments: %v", err)
	}

	if mcp.app.clientset == nil || !mcp.app.connected {
		return nil, fmt.Errorf("not connected to cluster")
	}

	if mcp.app.mlRecommender == nil {
		return nil, fmt.Errorf("ML recommender not available")
	}

	if params.HoursAhead == 0 {
		params.HoursAhead = 1
	}

	result := fmt.Sprintf("🧠 Smart Scaling for %s/%s\n\n", params.Namespace, params.Deployment)

	// Get current deployment
	deploy, err := mcp.app.clientset.AppsV1().Deployments(params.Namespace).Get(ctx, params.Deployment, metav1.GetOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to get deployment: %v", err)
	}

	currentReplicas := *deploy.Spec.Replicas
	result += fmt.Sprintf("Current replicas: %d\n", currentReplicas)

	// Predict future needs
	cpuPred, memPred, err := mcp.app.mlRecommender.PredictResourceNeeds(ctx, params.Namespace, params.Deployment, params.HoursAhead)
	if err == nil {
		result += fmt.Sprintf("\n📈 ML Predictions (%d hours ahead):\n", params.HoursAhead)
		result += fmt.Sprintf("   CPU: %.2f%%\n", cpuPred)
		result += fmt.Sprintf("   Memory: %.2f%%\n", memPred)
	}

	// Determine target replicas
	var targetReplicas int32
	if params.TargetReplicas != nil {
		targetReplicas = *params.TargetReplicas
		result += fmt.Sprintf("\n🎯 Using specified target: %d replicas\n", targetReplicas)
	} else {
		// Calculate based on predictions
		if cpuPred > 80 || memPred > 80 {
			targetReplicas = currentReplicas + 2
			result += fmt.Sprintf("\n📊 High predicted usage - scaling up to %d replicas\n", targetReplicas)
		} else if cpuPred < 30 && memPred < 30 && currentReplicas > 1 {
			targetReplicas = currentReplicas - 1
			result += fmt.Sprintf("\n📊 Low predicted usage - scaling down to %d replicas\n", targetReplicas)
		} else {
			targetReplicas = currentReplicas
			result += "\n✅ Current replica count is optimal\n"
		}
	}

	// Scale if needed
	if targetReplicas != currentReplicas {
		scale := deploy.DeepCopy()
		scale.Spec.Replicas = &targetReplicas
		_, err = mcp.app.clientset.AppsV1().Deployments(params.Namespace).Update(ctx, scale, metav1.UpdateOptions{})
		if err != nil {
			return nil, fmt.Errorf("failed to scale deployment: %v", err)
		}
		result += fmt.Sprintf("\n✅ Scaled to %d replicas successfully\n", targetReplicas)
	}

	return &MCPToolResult{
		Content: []MCPContent{{Type: "text", Text: result}},
	}, nil
}

func (mcp *MCPServer) handleOptimizeResources(ctx context.Context, args json.RawMessage) (*MCPToolResult, error) {
	var params struct {
		Namespace string `json:"namespace,omitempty"`
		Apply     bool   `json:"apply,omitempty"`
	}

	json.Unmarshal(args, &params)

	if mcp.app.clientset == nil || !mcp.app.connected {
		return nil, fmt.Errorf("not connected to cluster")
	}

	if mcp.app.mlRecommender == nil {
		return nil, fmt.Errorf("ML recommender not available")
	}

	namespace := params.Namespace
	if namespace == "" {
		namespace = "_all"
	}

	result := "⚡ Resource Optimization Analysis\n\n"

	// Get ML recommendations
	recommendations, err := mcp.app.mlRecommender.GenerateRecommendations(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get recommendations: %v", err)
	}

	// Filter for resource optimization
	resourceOpts := []MLRecommendation{}
	for _, rec := range recommendations {
		if rec.Type == "resource_optimization" {
			if namespace == "_all" || rec.Namespace == namespace {
				resourceOpts = append(resourceOpts, rec)
			}
		}
	}

	if len(resourceOpts) == 0 {
		result += "✅ No resource optimization opportunities found. Resources are well-optimized!"
		return &MCPToolResult{
			Content: []MCPContent{{Type: "text", Text: result}},
		}, nil
	}

	result += fmt.Sprintf("Found %d optimization opportunities:\n\n", len(resourceOpts))

	applied := 0
	for _, rec := range resourceOpts {
		result += fmt.Sprintf("📊 %s\n", rec.Title)
		result += fmt.Sprintf("   Current: %s → Recommended: %s\n", rec.CurrentValue, rec.RecommendedValue)
		result += fmt.Sprintf("   Impact: %s, Confidence: %.0f%%\n", rec.Impact, rec.Confidence*100)

		if params.Apply && rec.AutoApply {
			// Apply recommendation
			success, _, err := mcp.app.mlRecommender.ApplyRecommendation(ctx, rec.ID)
			if err != nil {
				result += fmt.Sprintf("   ❌ Failed to apply: %v\n", err)
			} else if success {
				result += "   ✅ Applied successfully\n"
				applied++
			}
		} else if params.Apply {
			result += "   ⚠️  Cannot auto-apply (requires manual review)\n"
		}
		result += "\n"
	}

	if params.Apply {
		result += fmt.Sprintf("\n📊 Summary: %d optimizations applied\n", applied)
	} else {
		result += "\n💡 Set apply=true to automatically apply these optimizations"
	}

	return &MCPToolResult{
		Content: []MCPContent{{Type: "text", Text: result}},
	}, nil
}

func (mcp *MCPServer) handleCorrelateEvents(ctx context.Context, args json.RawMessage) (*MCPToolResult, error) {
	var params struct {
		Namespace  string `json:"namespace,omitempty"`
		TimeWindow string `json:"time_window,omitempty"`
	}

	json.Unmarshal(args, &params)

	if params.TimeWindow == "" {
		params.TimeWindow = "1h"
	}

	result := "🔗 Event Correlation Analysis\n\n"

	// Use event monitor if available
	if mcp.app.eventMonitor != nil {
		events := mcp.app.eventMonitor.GetMonitoredEvents()
		logErrors := mcp.app.eventMonitor.GetLogErrors()

		// Filter by namespace if specified
		if params.Namespace != "" {
			filteredEvents := []MonitoredEvent{}
			for _, e := range events {
				if e.Namespace == params.Namespace {
					filteredEvents = append(filteredEvents, e)
				}
			}
			events = filteredEvents

			filteredErrors := []LogError{}
			for _, e := range logErrors {
				if e.Namespace == params.Namespace {
					filteredErrors = append(filteredErrors, e)
				}
			}
			logErrors = filteredErrors
		}

		result += fmt.Sprintf("📊 Found %d events and %d log errors\n\n", len(events), len(logErrors))

		// Group by correlation
		criticalEvents := 0
		httpErrors := 0
		podRestarts := 0
		for _, e := range events {
			if e.Severity == "critical" {
				criticalEvents++
			}
			if e.Category == "pod_restarted" {
				podRestarts++
			}
		}
		for _, e := range logErrors {
			if e.StatusCode >= 500 {
				httpErrors++
			}
		}

		result += "🔍 Correlations Found:\n"
		if criticalEvents > 0 && httpErrors > 0 {
			result += "   ⚠️  Critical events correlate with HTTP 5xx errors\n"
			result += "      → Possible root cause: Application failures causing HTTP errors\n"
		}
		if podRestarts > 0 && httpErrors > 0 {
			result += "   ⚠️  Pod restarts correlate with HTTP errors\n"
			result += "      → Possible root cause: Pod crashes causing service disruption\n"
		}
		if criticalEvents > 0 && podRestarts > 0 {
			result += "   ⚠️  Critical events correlate with pod restarts\n"
			result += "      → Possible root cause: Resource constraints or application bugs\n"
		}

		if criticalEvents == 0 && httpErrors == 0 && podRestarts == 0 {
			result += "   ✅ No significant correlations found. System appears stable.\n"
		}
	} else {
		result += "⚠️  Event monitor not available"
	}

	return &MCPToolResult{
		Content: []MCPContent{{Type: "text", Text: result}},
	}, nil
}

func (mcp *MCPServer) handlePredictCapacity(ctx context.Context, args json.RawMessage) (*MCPToolResult, error) {
	var params struct {
		Namespace string `json:"namespace,omitempty"`
		DaysAhead int    `json:"days_ahead,omitempty"`
	}

	json.Unmarshal(args, &params)

	if params.DaysAhead == 0 {
		params.DaysAhead = 7
	}

	if mcp.app.mlRecommender == nil {
		return nil, fmt.Errorf("ML recommender not available")
	}

	result := fmt.Sprintf("📈 Capacity Prediction (%d days ahead)\n\n", params.DaysAhead)

	// Get deployments
	namespace := params.Namespace
	if namespace == "" {
		namespace = ""
	}

	deployments, err := mcp.app.clientset.AppsV1().Deployments(namespace).List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to list deployments: %v", err)
	}

	result += fmt.Sprintf("Analyzing %d deployments...\n\n", len(deployments.Items))

	totalCPU := 0.0
	totalMemory := 0.0

	for _, deploy := range deployments.Items {
		if params.Namespace != "" && deploy.Namespace != params.Namespace {
			continue
		}

		hoursAhead := params.DaysAhead * 24
		cpuPred, memPred, err := mcp.app.mlRecommender.PredictResourceNeeds(ctx, deploy.Namespace, deploy.Name, hoursAhead)
		if err == nil {
			result += fmt.Sprintf("📊 %s/%s:\n", deploy.Namespace, deploy.Name)
			result += fmt.Sprintf("   Predicted CPU: %.1f%%\n", cpuPred)
			result += fmt.Sprintf("   Predicted Memory: %.1f%%\n", memPred)

			if cpuPred > 90 || memPred > 90 {
				result += "   ⚠️  High predicted usage - consider scaling up\n"
			}

			totalCPU += cpuPred
			totalMemory += memPred
		}
	}

	if len(deployments.Items) > 0 {
		avgCPU := totalCPU / float64(len(deployments.Items))
		avgMemory := totalMemory / float64(len(deployments.Items))

		result += fmt.Sprintf("\n📊 Cluster Average:\n")
		result += fmt.Sprintf("   Average CPU: %.1f%%\n", avgCPU)
		result += fmt.Sprintf("   Average Memory: %.1f%%\n", avgMemory)

		if avgCPU > 80 || avgMemory > 80 {
			result += "\n⚠️  High predicted cluster usage - consider adding nodes\n"
		} else {
			result += "\n✅ Predicted usage is within safe limits\n"
		}
	}

	return &MCPToolResult{
		Content: []MCPContent{{Type: "text", Text: result}},
	}, nil
}

// Helper functions

func (mcp *MCPServer) sendResponse(w http.ResponseWriter, msg *MCPMessage, result interface{}) {
	response := MCPMessage{
		JSONRPC: "2.0",
		ID:      msg.ID,
		Result:  result,
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func (mcp *MCPServer) sendError(w http.ResponseWriter, msg *MCPMessage, code int, message string, data interface{}) {
	response := MCPMessage{
		JSONRPC: "2.0",
		ID:      msg.ID,
		Error: &MCPError{
			Code:    code,
			Message: message,
			Data:    data,
		},
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// getPodLogs retrieves pod logs using the Kubernetes clientset
func (mcp *MCPServer) getPodLogs(ctx context.Context, namespace, pod, container string, tail int) (string, error) {
	if mcp.app.clientset == nil {
		return "", fmt.Errorf("not connected to cluster")
	}

	tailLines := int64(tail)
	opts := &v1.PodLogOptions{
		TailLines: &tailLines,
	}
	if container != "" {
		opts.Container = container
	}

	req := mcp.app.clientset.CoreV1().Pods(namespace).GetLogs(pod, opts)
	podLogs, err := req.Stream(ctx)
	if err != nil {
		return "", fmt.Errorf("failed to get logs: %v", err)
	}
	defer podLogs.Close()

	buf := new(bytes.Buffer)
	_, err = io.Copy(buf, podLogs)
	if err != nil {
		return "", fmt.Errorf("failed to read logs: %v", err)
	}

	return buf.String(), nil
}

