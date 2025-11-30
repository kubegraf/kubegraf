// Copyright 2025 KubeGraf Contributors
// SPDX-License-Identifier: Apache-2.0

package main

import (
	"fmt"
	"sort"
	"strings"

	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// TrafficMetrics represents traffic flow between resources
type TrafficMetrics struct {
	Source      string
	Destination string
	Protocol    string
	Port        int32
	Connections int
}

// HeatmapData represents resource usage for heatmap visualization
type HeatmapData struct {
	Name        string
	Namespace   string
	Type        string
	CPUUsage    float64 // 0-100
	MemoryUsage float64 // 0-100
	CPURequest  int64   // millicores
	CPULimit    int64   // millicores
	MemRequest  int64   // bytes
	MemLimit    int64   // bytes
	HeatLevel   int     // 0-4 (cold to hot)
}

// NetworkTopology represents the network topology of the cluster
type NetworkTopology struct {
	Nodes       []*TopologyNode
	Connections []*TopologyConnection
}

// TopologyNode represents a node in the network topology
type TopologyNode struct {
	ID        string
	Name      string
	Type      string // pod, service, ingress, external
	Namespace string
	IP        string
	Ports     []int32
	Labels    map[string]string
	Metrics   *HeatmapData
}

// TopologyConnection represents a connection between nodes
type TopologyConnection struct {
	SourceID    string
	TargetID    string
	Protocol    string
	Port        int32
	Direction   string // inbound, outbound, bidirectional
	TrafficType string // http, tcp, grpc
}

// BuildNetworkTopology builds a network topology for the namespace
func (a *App) BuildNetworkTopology() (*NetworkTopology, error) {
	topology := &NetworkTopology{
		Nodes:       []*TopologyNode{},
		Connections: []*TopologyConnection{},
	}

	nodeMap := make(map[string]*TopologyNode)

	// Get all services
	services, err := a.clientset.CoreV1().Services(a.namespace).List(a.ctx, metav1.ListOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to list services: %w", err)
	}

	// Get all pods
	pods, err := a.clientset.CoreV1().Pods(a.namespace).List(a.ctx, metav1.ListOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to list pods: %w", err)
	}

	// Get all ingresses
	ingresses, err := a.clientset.NetworkingV1().Ingresses(a.namespace).List(a.ctx, metav1.ListOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to list ingresses: %w", err)
	}

	// Add pod nodes
	for _, pod := range pods.Items {
		if pod.Status.Phase != corev1.PodRunning {
			continue
		}

		ports := []int32{}
		for _, container := range pod.Spec.Containers {
			for _, port := range container.Ports {
				ports = append(ports, port.ContainerPort)
			}
		}

		// Get metrics if available
		var metrics *HeatmapData
		if a.metricsClient != nil {
			podMetrics, err := a.metricsClient.MetricsV1beta1().PodMetricses(a.namespace).Get(a.ctx, pod.Name, metav1.GetOptions{})
			if err == nil {
				cpuUsage := int64(0)
				memUsage := int64(0)
				for _, container := range podMetrics.Containers {
					cpuUsage += container.Usage.Cpu().MilliValue()
					memUsage += container.Usage.Memory().Value()
				}

				cpuRequest := int64(0)
				memRequest := int64(0)
				for _, container := range pod.Spec.Containers {
					cpuRequest += container.Resources.Requests.Cpu().MilliValue()
					memRequest += container.Resources.Requests.Memory().Value()
				}

				cpuPercent := float64(0)
				if cpuRequest > 0 {
					cpuPercent = float64(cpuUsage) / float64(cpuRequest) * 100
				}

				memPercent := float64(0)
				if memRequest > 0 {
					memPercent = float64(memUsage) / float64(memRequest) * 100
				}

				metrics = &HeatmapData{
					Name:        pod.Name,
					Namespace:   pod.Namespace,
					Type:        "Pod",
					CPUUsage:    cpuPercent,
					MemoryUsage: memPercent,
					CPURequest:  cpuRequest,
					MemRequest:  memRequest,
					HeatLevel:   calculateHeatLevel(cpuPercent, memPercent),
				}
			}
		}

		nodeID := fmt.Sprintf("pod/%s", pod.Name)
		node := &TopologyNode{
			ID:        nodeID,
			Name:      pod.Name,
			Type:      "pod",
			Namespace: pod.Namespace,
			IP:        pod.Status.PodIP,
			Ports:     ports,
			Labels:    pod.Labels,
			Metrics:   metrics,
		}
		topology.Nodes = append(topology.Nodes, node)
		nodeMap[nodeID] = node
	}

	// Add service nodes and connections to pods
	for _, svc := range services.Items {
		ports := []int32{}
		for _, port := range svc.Spec.Ports {
			ports = append(ports, port.Port)
		}

		nodeID := fmt.Sprintf("service/%s", svc.Name)
		node := &TopologyNode{
			ID:        nodeID,
			Name:      svc.Name,
			Type:      "service",
			Namespace: svc.Namespace,
			IP:        svc.Spec.ClusterIP,
			Ports:     ports,
			Labels:    svc.Spec.Selector,
		}
		topology.Nodes = append(topology.Nodes, node)
		nodeMap[nodeID] = node

		// Create connections to matching pods
		if len(svc.Spec.Selector) > 0 {
			for _, pod := range pods.Items {
				if matchLabels(svc.Spec.Selector, pod.Labels) {
					podID := fmt.Sprintf("pod/%s", pod.Name)
					for _, port := range svc.Spec.Ports {
						conn := &TopologyConnection{
							SourceID:    nodeID,
							TargetID:    podID,
							Protocol:    string(port.Protocol),
							Port:        port.TargetPort.IntVal,
							Direction:   "outbound",
							TrafficType: inferTrafficType(port.Port),
						}
						topology.Connections = append(topology.Connections, conn)
					}
				}
			}
		}
	}

	// Add ingress nodes and connections to services
	for _, ing := range ingresses.Items {
		nodeID := fmt.Sprintf("ingress/%s", ing.Name)
		node := &TopologyNode{
			ID:        nodeID,
			Name:      ing.Name,
			Type:      "ingress",
			Namespace: ing.Namespace,
			Ports:     []int32{80, 443},
		}
		topology.Nodes = append(topology.Nodes, node)
		nodeMap[nodeID] = node

		// Create connections to backend services
		for _, rule := range ing.Spec.Rules {
			if rule.HTTP != nil {
				for _, path := range rule.HTTP.Paths {
					svcID := fmt.Sprintf("service/%s", path.Backend.Service.Name)
					port := int32(80)
					if path.Backend.Service.Port.Number > 0 {
						port = path.Backend.Service.Port.Number
					}
					conn := &TopologyConnection{
						SourceID:    nodeID,
						TargetID:    svcID,
						Protocol:    "HTTP",
						Port:        port,
						Direction:   "outbound",
						TrafficType: "http",
					}
					topology.Connections = append(topology.Connections, conn)
				}
			}
		}
	}

	// Add external traffic node
	externalNode := &TopologyNode{
		ID:    "external/internet",
		Name:  "Internet",
		Type:  "external",
		Ports: []int32{80, 443},
	}
	topology.Nodes = append(topology.Nodes, externalNode)
	nodeMap["external/internet"] = externalNode

	// Connect external to ingresses
	for _, ing := range ingresses.Items {
		ingID := fmt.Sprintf("ingress/%s", ing.Name)
		conn := &TopologyConnection{
			SourceID:    "external/internet",
			TargetID:    ingID,
			Protocol:    "HTTPS",
			Port:        443,
			Direction:   "inbound",
			TrafficType: "http",
		}
		topology.Connections = append(topology.Connections, conn)
	}

	return topology, nil
}

// GetNamespaceHeatmap returns a heatmap of resource usage for all pods
func (a *App) GetNamespaceHeatmap() ([]*HeatmapData, error) {
	heatmap := []*HeatmapData{}

	pods, err := a.clientset.CoreV1().Pods(a.namespace).List(a.ctx, metav1.ListOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to list pods: %w", err)
	}

	for _, pod := range pods.Items {
		if pod.Status.Phase != corev1.PodRunning {
			continue
		}

		// Get resource requests
		cpuRequest := int64(0)
		cpuLimit := int64(0)
		memRequest := int64(0)
		memLimit := int64(0)

		for _, container := range pod.Spec.Containers {
			cpuRequest += container.Resources.Requests.Cpu().MilliValue()
			cpuLimit += container.Resources.Limits.Cpu().MilliValue()
			memRequest += container.Resources.Requests.Memory().Value()
			memLimit += container.Resources.Limits.Memory().Value()
		}

		data := &HeatmapData{
			Name:       pod.Name,
			Namespace:  pod.Namespace,
			Type:       "Pod",
			CPURequest: cpuRequest,
			CPULimit:   cpuLimit,
			MemRequest: memRequest,
			MemLimit:   memLimit,
		}

		// Get actual usage if metrics available
		if a.metricsClient != nil {
			podMetrics, err := a.metricsClient.MetricsV1beta1().PodMetricses(a.namespace).Get(a.ctx, pod.Name, metav1.GetOptions{})
			if err == nil {
				cpuUsage := int64(0)
				memUsage := int64(0)
				for _, container := range podMetrics.Containers {
					cpuUsage += container.Usage.Cpu().MilliValue()
					memUsage += container.Usage.Memory().Value()
				}

				if cpuRequest > 0 {
					data.CPUUsage = float64(cpuUsage) / float64(cpuRequest) * 100
				}
				if memRequest > 0 {
					data.MemoryUsage = float64(memUsage) / float64(memRequest) * 100
				}
			}
		}

		data.HeatLevel = calculateHeatLevel(data.CPUUsage, data.MemoryUsage)
		heatmap = append(heatmap, data)
	}

	// Sort by heat level (hottest first)
	sort.Slice(heatmap, func(i, j int) bool {
		return heatmap[i].HeatLevel > heatmap[j].HeatLevel
	})

	return heatmap, nil
}

// GetNodeHeatmap returns a heatmap of resource usage for all nodes
func (a *App) GetNodeHeatmap() ([]*HeatmapData, error) {
	heatmap := []*HeatmapData{}

	nodes, err := a.clientset.CoreV1().Nodes().List(a.ctx, metav1.ListOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to list nodes: %w", err)
	}

	for _, node := range nodes.Items {
		allocatableCPU := node.Status.Allocatable.Cpu().MilliValue()
		allocatableMem := node.Status.Allocatable.Memory().Value()

		data := &HeatmapData{
			Name:       node.Name,
			Type:       "Node",
			CPURequest: allocatableCPU,
			MemRequest: allocatableMem,
		}

		// Get actual usage if metrics available
		if a.metricsClient != nil {
			nodeMetrics, err := a.metricsClient.MetricsV1beta1().NodeMetricses().Get(a.ctx, node.Name, metav1.GetOptions{})
			if err == nil {
				cpuUsage := nodeMetrics.Usage.Cpu().MilliValue()
				memUsage := nodeMetrics.Usage.Memory().Value()

				if allocatableCPU > 0 {
					data.CPUUsage = float64(cpuUsage) / float64(allocatableCPU) * 100
				}
				if allocatableMem > 0 {
					data.MemoryUsage = float64(memUsage) / float64(allocatableMem) * 100
				}
			}
		}

		data.HeatLevel = calculateHeatLevel(data.CPUUsage, data.MemoryUsage)
		heatmap = append(heatmap, data)
	}

	// Sort by heat level (hottest first)
	sort.Slice(heatmap, func(i, j int) bool {
		return heatmap[i].HeatLevel > heatmap[j].HeatLevel
	})

	return heatmap, nil
}

// RenderHeatmapASCII renders a heatmap as ASCII art
func RenderHeatmapASCII(data []*HeatmapData) string {
	var sb strings.Builder

	sb.WriteString("\n[cyan::b]Resource Heatmap[-:-:-]\n")
	sb.WriteString("[gray]Heat levels: [blue]█[-] Cold  [green]█[-] Normal  [yellow]█[-] Warm  [#ff8800]█[-] Hot  [red]█[-] Critical[-]\n\n")

	// Header
	sb.WriteString(fmt.Sprintf("%-40s %-8s %-8s %s\n", "NAME", "CPU%", "MEM%", "HEAT"))
	sb.WriteString(strings.Repeat("─", 70) + "\n")

	for _, d := range data {
		heatColor := getHeatColor(d.HeatLevel)
		heatBar := getHeatBar(d.HeatLevel)

		name := d.Name
		if len(name) > 38 {
			name = name[:35] + "..."
		}

		sb.WriteString(fmt.Sprintf("%-40s [%s]%6.1f%%[-] [%s]%6.1f%%[-] %s\n",
			name,
			getCPUColor(d.CPUUsage), d.CPUUsage,
			getMemColor(d.MemoryUsage), d.MemoryUsage,
			heatColor+heatBar+"[-]"))
	}

	return sb.String()
}

// RenderTopologyASCII renders network topology as ASCII art
func RenderTopologyASCII(topology *NetworkTopology) string {
	var sb strings.Builder

	sb.WriteString("\n[cyan::b]Network Topology[-:-:-]\n")
	sb.WriteString("[gray]Connections show traffic flow direction[-]\n\n")

	// Group nodes by type
	ingresses := []*TopologyNode{}
	services := []*TopologyNode{}
	pods := []*TopologyNode{}
	external := []*TopologyNode{}

	for _, node := range topology.Nodes {
		switch node.Type {
		case "ingress":
			ingresses = append(ingresses, node)
		case "service":
			services = append(services, node)
		case "pod":
			pods = append(pods, node)
		case "external":
			external = append(external, node)
		}
	}

	// Render layers
	if len(external) > 0 {
		sb.WriteString("[white::b]External Layer[-:-:-]\n")
		for _, node := range external {
			sb.WriteString(fmt.Sprintf("  [gray]🌐[-] %s\n", node.Name))
		}
		sb.WriteString("      │\n      ▼\n")
	}

	if len(ingresses) > 0 {
		sb.WriteString("[cyan::b]Ingress Layer[-:-:-]\n")
		for _, node := range ingresses {
			sb.WriteString(fmt.Sprintf("  [cyan]🚪[-] %s", node.Name))
			// Show connected services
			connectedSvcs := []string{}
			for _, conn := range topology.Connections {
				if conn.SourceID == node.ID && strings.HasPrefix(conn.TargetID, "service/") {
					svcName := strings.TrimPrefix(conn.TargetID, "service/")
					connectedSvcs = append(connectedSvcs, svcName)
				}
			}
			if len(connectedSvcs) > 0 {
				sb.WriteString(fmt.Sprintf(" [gray]→ %s[-]", strings.Join(connectedSvcs, ", ")))
			}
			sb.WriteString("\n")
		}
		sb.WriteString("      │\n      ▼\n")
	}

	if len(services) > 0 {
		sb.WriteString("[magenta::b]Service Layer[-:-:-]\n")
		for _, node := range services {
			sb.WriteString(fmt.Sprintf("  [magenta]⚡[-] %s [gray](%s", node.Name, node.IP))
			if len(node.Ports) > 0 {
				portStrs := []string{}
				for _, p := range node.Ports {
					portStrs = append(portStrs, fmt.Sprintf("%d", p))
				}
				sb.WriteString(fmt.Sprintf(":%s", strings.Join(portStrs, ",")))
			}
			sb.WriteString(")[-]")

			// Count connected pods
			podCount := 0
			for _, conn := range topology.Connections {
				if conn.SourceID == node.ID && strings.HasPrefix(conn.TargetID, "pod/") {
					podCount++
				}
			}
			if podCount > 0 {
				sb.WriteString(fmt.Sprintf(" [gray]→ %d pods[-]", podCount))
			}
			sb.WriteString("\n")
		}
		sb.WriteString("      │\n      ▼\n")
	}

	if len(pods) > 0 {
		sb.WriteString("[green::b]Pod Layer[-:-:-]\n")
		for _, node := range pods {
			heatIndicator := ""
			if node.Metrics != nil {
				heatIndicator = fmt.Sprintf(" %s", getHeatBar(node.Metrics.HeatLevel))
			}
			sb.WriteString(fmt.Sprintf("  [green]🔷[-] %s [gray](%s)[-]%s\n", node.Name, node.IP, heatIndicator))
		}
	}

	// Summary
	sb.WriteString(fmt.Sprintf("\n[gray]Total: %d ingresses, %d services, %d pods, %d connections[-]\n",
		len(ingresses), len(services), len(pods), len(topology.Connections)))

	return sb.String()
}

// Helper functions

func calculateHeatLevel(cpuPercent, memPercent float64) int {
	// Use the higher of CPU or memory usage
	maxUsage := cpuPercent
	if memPercent > maxUsage {
		maxUsage = memPercent
	}

	switch {
	case maxUsage >= 90:
		return 4 // Critical
	case maxUsage >= 75:
		return 3 // Hot
	case maxUsage >= 50:
		return 2 // Warm
	case maxUsage >= 25:
		return 1 // Normal
	default:
		return 0 // Cold
	}
}

func getHeatColor(level int) string {
	switch level {
	case 4:
		return "[red]"
	case 3:
		return "[#ff8800]"
	case 2:
		return "[yellow]"
	case 1:
		return "[green]"
	default:
		return "[blue]"
	}
}

func getHeatBar(level int) string {
	bars := []string{"▁", "▃", "▅", "▇", "█"}
	return strings.Repeat(bars[level], 5)
}

func getCPUColor(usage float64) string {
	switch {
	case usage >= 90:
		return "red"
	case usage >= 75:
		return "#ff8800"
	case usage >= 50:
		return "yellow"
	default:
		return "green"
	}
}

func getMemColor(usage float64) string {
	switch {
	case usage >= 90:
		return "red"
	case usage >= 75:
		return "#ff8800"
	case usage >= 50:
		return "yellow"
	default:
		return "green"
	}
}

func matchLabels(selector, labels map[string]string) bool {
	for key, value := range selector {
		if labels[key] != value {
			return false
		}
	}
	return true
}

func inferTrafficType(port int32) string {
	switch port {
	case 80, 8080, 3000:
		return "http"
	case 443, 8443:
		return "https"
	case 5432:
		return "postgres"
	case 3306:
		return "mysql"
	case 6379:
		return "redis"
	case 9092:
		return "kafka"
	case 50051:
		return "grpc"
	default:
		return "tcp"
	}
}
