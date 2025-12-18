// Copyright 2025 KubeGraf Contributors
package metrics

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"sort"
	"sync"
	"time"

	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/resource"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"
	metricsclientset "k8s.io/metrics/pkg/client/clientset/versioned"
)

// Collector handles metrics collection from Kubernetes cluster.
type Collector struct {
	config        Config
	kubeClient    kubernetes.Interface
	metricsClient metricsclientset.Interface
	buffer        *RingBuffer
	hub           *Hub

	mu              sync.RWMutex
	source          string // current source being used
	lastError       string
	metricsAPIAvail bool // cached availability check
	lastAvailCheck  time.Time

	// State change tracking for throttled logging
	lastLoggedError string
	lastLogTime     time.Time
}

// NewCollector creates a new metrics collector.
func NewCollector(kubeClient kubernetes.Interface, metricsClient metricsclientset.Interface, hub *Hub, config Config) *Collector {
	return &Collector{
		config:        config,
		kubeClient:    kubeClient,
		metricsClient: metricsClient,
		buffer:        NewRingBuffer(config.MaxPoints),
		hub:           hub,
		source:        "unknown",
	}
}

// Start begins the metrics collection loop.
func (c *Collector) Start(ctx context.Context) {
	log.Println("[Metrics] Starting collector with interval:", c.config.Interval)

	// Initial collection
	c.collect(ctx)

	ticker := time.NewTicker(c.config.Interval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			log.Println("[Metrics] Collector stopped")
			return
		case <-ticker.C:
			c.collect(ctx)
		}
	}
}

// GetBuffer returns the ring buffer for snapshot access.
func (c *Collector) GetBuffer() *RingBuffer {
	return c.buffer
}

// collect performs a single metrics collection cycle.
func (c *Collector) collect(ctx context.Context) {
	point := c.collectMetrics(ctx)

	// Store in ring buffer
	c.buffer.Append(point)

	// Broadcast to connected WebSocket clients
	if c.hub != nil {
		c.hub.Broadcast(PointMessage{
			Type:  "point",
			Point: point,
		})
	}
}

// collectMetrics gathers metrics from available sources.
func (c *Collector) collectMetrics(ctx context.Context) MetricPoint {
	point := MetricPoint{
		Ts: time.Now().Unix(),
	}

	// Check if we have clients
	if c.kubeClient == nil {
		point.Source = "unavailable"
		point.Error = "Kubernetes client not initialized"
		c.logErrorThrottled(point.Error)
		return point
	}

	// Check Metrics API availability (cached for 1 minute)
	if time.Since(c.lastAvailCheck) > time.Minute {
		c.metricsAPIAvail = c.checkMetricsAPIAvailable(ctx)
		c.lastAvailCheck = time.Now()
	}

	// Try Metrics API first
	if c.metricsAPIAvail && c.metricsClient != nil {
		metrics, err := c.collectFromMetricsAPI(ctx)
		if err == nil {
			point = metrics
			point.Source = "metrics_api"
			c.mu.Lock()
			c.source = "metrics_api"
			c.lastError = ""
			c.mu.Unlock()
			return point
		}
		// Metrics API failed, try fallback
		c.logErrorThrottled(fmt.Sprintf("Metrics API failed: %v, trying Summary API", err))
	}

	// Fallback to Summary API
	metrics, err := c.collectFromSummaryAPI(ctx)
	if err == nil {
		point = metrics
		point.Source = "summary_api"
		c.mu.Lock()
		c.source = "summary_api"
		c.lastError = ""
		c.mu.Unlock()
		return point
	}

	// Both failed
	point.Source = "unavailable"
	point.Error = fmt.Sprintf("Metrics unavailable: %v", err)
	c.logErrorThrottled(point.Error)
	c.mu.Lock()
	c.source = "unavailable"
	c.lastError = point.Error
	c.mu.Unlock()

	return point
}

// checkMetricsAPIAvailable checks if the Metrics API is available.
func (c *Collector) checkMetricsAPIAvailable(ctx context.Context) bool {
	if c.metricsClient == nil {
		return false
	}

	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	_, err := c.metricsClient.MetricsV1beta1().NodeMetricses().List(ctx, metav1.ListOptions{Limit: 1})
	return err == nil
}

// collectFromMetricsAPI collects metrics using the Kubernetes Metrics API.
func (c *Collector) collectFromMetricsAPI(ctx context.Context) (MetricPoint, error) {
	ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	point := MetricPoint{
		Ts: time.Now().Unix(),
	}

	// Get node allocatable resources
	nodes, err := c.kubeClient.CoreV1().Nodes().List(ctx, metav1.ListOptions{})
	if err != nil {
		return point, fmt.Errorf("failed to list nodes: %w", err)
	}

	// Get node metrics
	nodeMetrics, err := c.metricsClient.MetricsV1beta1().NodeMetricses().List(ctx, metav1.ListOptions{})
	if err != nil {
		return point, fmt.Errorf("failed to get node metrics: %w", err)
	}

	// Build allocatable map
	allocatable := make(map[string]corev1.ResourceList)
	for _, node := range nodes.Items {
		allocatable[node.Name] = node.Status.Allocatable
	}

	// Calculate metrics
	var totalCpuAllocatable, totalMemAllocatable float64
	var totalCpuUsage, totalMemUsage float64
	var nodeMetricsList []NodeMetrics

	for _, nm := range nodeMetrics.Items {
		alloc, ok := allocatable[nm.Name]
		if !ok {
			continue
		}

		// CPU: convert to cores
		cpuAlloc := alloc.Cpu().AsApproximateFloat64()
		cpuUsage := quantityToFloat64(nm.Usage.Cpu())

		// Memory: convert to bytes
		memAlloc := alloc.Memory().AsApproximateFloat64()
		memUsage := quantityToFloat64(nm.Usage.Memory())

		totalCpuAllocatable += cpuAlloc
		totalMemAllocatable += memAlloc
		totalCpuUsage += cpuUsage
		totalMemUsage += memUsage

		// Calculate per-node percentage
		cpuPct := 0.0
		memPct := 0.0
		if cpuAlloc > 0 {
			cpuPct = (cpuUsage / cpuAlloc) * 100
		}
		if memAlloc > 0 {
			memPct = (memUsage / memAlloc) * 100
		}

		nodeMetricsList = append(nodeMetricsList, NodeMetrics{
			Name:   nm.Name,
			CpuPct: cpuPct,
			MemPct: memPct,
		})
	}

	// Calculate cluster-wide percentages
	if totalCpuAllocatable > 0 {
		point.Cluster.CpuPct = (totalCpuUsage / totalCpuAllocatable) * 100
	}
	if totalMemAllocatable > 0 {
		point.Cluster.MemPct = (totalMemUsage / totalMemAllocatable) * 100
	}

	// Find peaks and sort for top nodes
	point.Peaks, point.TopNodes = c.calculatePeaksAndTopNodes(nodeMetricsList)

	return point, nil
}

// collectFromSummaryAPI collects metrics using kubelet Summary API via apiserver proxy.
func (c *Collector) collectFromSummaryAPI(ctx context.Context) (MetricPoint, error) {
	ctx, cancel := context.WithTimeout(ctx, 15*time.Second)
	defer cancel()

	point := MetricPoint{
		Ts: time.Now().Unix(),
	}

	// Get all nodes
	nodes, err := c.kubeClient.CoreV1().Nodes().List(ctx, metav1.ListOptions{})
	if err != nil {
		return point, fmt.Errorf("failed to list nodes: %w", err)
	}

	if len(nodes.Items) == 0 {
		return point, fmt.Errorf("no nodes found in cluster")
	}

	// Collect from nodes concurrently with worker pool
	type nodeResult struct {
		name    string
		cpuPct  float64
		memPct  float64
		cpuUsage float64
		memUsage float64
		cpuAlloc float64
		memAlloc float64
		err     error
	}

	resultsChan := make(chan nodeResult, len(nodes.Items))
	semaphore := make(chan struct{}, 5) // Max 5 concurrent requests

	var wg sync.WaitGroup
	for _, node := range nodes.Items {
		wg.Add(1)
		go func(n corev1.Node) {
			defer wg.Done()
			semaphore <- struct{}{} // Acquire
			defer func() { <-semaphore }() // Release

			result := nodeResult{name: n.Name}

			// Get allocatable from node spec
			cpuAlloc := n.Status.Allocatable.Cpu().AsApproximateFloat64()
			memAlloc := n.Status.Allocatable.Memory().AsApproximateFloat64()
			result.cpuAlloc = cpuAlloc
			result.memAlloc = memAlloc

			// Fetch summary stats
			cpuUsage, memUsage, err := c.fetchNodeSummary(ctx, n.Name)
			if err != nil {
				result.err = err
				resultsChan <- result
				return
			}

			result.cpuUsage = cpuUsage
			result.memUsage = memUsage

			if cpuAlloc > 0 {
				result.cpuPct = (cpuUsage / cpuAlloc) * 100
			}
			if memAlloc > 0 {
				result.memPct = (memUsage / memAlloc) * 100
			}

			resultsChan <- result
		}(node)
	}

	// Wait for all goroutines to complete
	go func() {
		wg.Wait()
		close(resultsChan)
	}()

	// Collect results
	var totalCpuAlloc, totalMemAlloc float64
	var totalCpuUsage, totalMemUsage float64
	var nodeMetricsList []NodeMetrics
	var failures int

	for result := range resultsChan {
		if result.err != nil {
			failures++
			continue
		}

		totalCpuAlloc += result.cpuAlloc
		totalMemAlloc += result.memAlloc
		totalCpuUsage += result.cpuUsage
		totalMemUsage += result.memUsage

		nodeMetricsList = append(nodeMetricsList, NodeMetrics{
			Name:   result.name,
			CpuPct: result.cpuPct,
			MemPct: result.memPct,
		})
	}

	if len(nodeMetricsList) == 0 {
		return point, fmt.Errorf("failed to get metrics from any node")
	}

	// Calculate cluster-wide percentages
	if totalCpuAlloc > 0 {
		point.Cluster.CpuPct = (totalCpuUsage / totalCpuAlloc) * 100
	}
	if totalMemAlloc > 0 {
		point.Cluster.MemPct = (totalMemUsage / totalMemAlloc) * 100
	}

	// Find peaks and sort for top nodes
	point.Peaks, point.TopNodes = c.calculatePeaksAndTopNodes(nodeMetricsList)

	if failures > 0 {
		point.Error = fmt.Sprintf("%d/%d nodes failed summary fetch", failures, len(nodes.Items))
	}

	return point, nil
}

// SummaryStats represents the kubelet summary stats response.
type SummaryStats struct {
	Node struct {
		CPU struct {
			UsageNanoCores uint64 `json:"usageNanoCores"`
		} `json:"cpu"`
		Memory struct {
			WorkingSetBytes uint64 `json:"workingSetBytes"`
			UsageBytes      uint64 `json:"usageBytes"`
		} `json:"memory"`
	} `json:"node"`
}

// fetchNodeSummary fetches summary stats from a node via apiserver proxy.
func (c *Collector) fetchNodeSummary(ctx context.Context, nodeName string) (cpuCores, memBytes float64, err error) {
	ctx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()

	// Use the REST client to proxy to the node
	path := fmt.Sprintf("/api/v1/nodes/%s/proxy/stats/summary", nodeName)
	req := c.kubeClient.CoreV1().RESTClient().Get().AbsPath(path)

	result := req.Do(ctx)
	if result.Error() != nil {
		return 0, 0, result.Error()
	}

	body, err := result.Raw()
	if err != nil {
		return 0, 0, err
	}

	var stats SummaryStats
	if err := json.Unmarshal(body, &stats); err != nil {
		return 0, 0, fmt.Errorf("failed to parse summary: %w", err)
	}

	// Convert nanocores to cores
	cpuCores = float64(stats.Node.CPU.UsageNanoCores) / 1e9

	// Prefer working set bytes, fall back to usage bytes
	memBytes = float64(stats.Node.Memory.WorkingSetBytes)
	if memBytes == 0 {
		memBytes = float64(stats.Node.Memory.UsageBytes)
	}

	return cpuCores, memBytes, nil
}

// calculatePeaksAndTopNodes finds peak values and top N nodes by CPU usage.
func (c *Collector) calculatePeaksAndTopNodes(nodes []NodeMetrics) (PeakMetrics, []NodeMetrics) {
	peaks := PeakMetrics{}

	if len(nodes) == 0 {
		return peaks, nil
	}

	// Find peaks
	for _, n := range nodes {
		if n.CpuPct > peaks.CpuPct {
			peaks.CpuPct = n.CpuPct
		}
		if n.MemPct > peaks.MemPct {
			peaks.MemPct = n.MemPct
		}
	}

	// Sort by CPU usage descending
	sorted := make([]NodeMetrics, len(nodes))
	copy(sorted, nodes)
	sort.Slice(sorted, func(i, j int) bool {
		return sorted[i].CpuPct > sorted[j].CpuPct
	})

	// Return top N
	count := c.config.TopNodesCount
	if count > len(sorted) {
		count = len(sorted)
	}

	return peaks, sorted[:count]
}

// logErrorThrottled logs errors only on state change or every 30 seconds.
func (c *Collector) logErrorThrottled(msg string) {
	now := time.Now()
	if msg != c.lastLoggedError || now.Sub(c.lastLogTime) > 30*time.Second {
		log.Printf("[Metrics] %s", msg)
		c.lastLoggedError = msg
		c.lastLogTime = now
	}
}

// quantityToFloat64 converts a resource.Quantity to float64.
func quantityToFloat64(q *resource.Quantity) float64 {
	if q == nil {
		return 0
	}
	return q.AsApproximateFloat64()
}

// Ensure we use io package
var _ = io.EOF

