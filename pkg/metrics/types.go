// Copyright 2025 KubeGraf Contributors
// Package metrics provides realtime cluster CPU and Memory monitoring.
package metrics

import (
	"sync"
	"time"
)

// MetricPoint represents a single point in the metrics time-series.
type MetricPoint struct {
	Ts      int64          `json:"ts"` // Unix seconds
	Cluster ClusterMetrics `json:"cluster"`
	Peaks   PeakMetrics    `json:"peaks"`
	TopNodes []NodeMetrics `json:"topNodes,omitempty"`
	Source  string         `json:"source"` // "metrics_api" | "summary_api" | "unavailable"
	Error   string         `json:"error,omitempty"`
}

// ClusterMetrics holds aggregated cluster-wide CPU and memory percentages.
type ClusterMetrics struct {
	CpuPct float64 `json:"cpuPct"`
	MemPct float64 `json:"memPct"`
}

// PeakMetrics holds the peak (max) node CPU and memory percentages.
type PeakMetrics struct {
	CpuPct float64 `json:"cpuPct"`
	MemPct float64 `json:"memPct"`
}

// NodeMetrics holds metrics for a single node.
type NodeMetrics struct {
	Name   string  `json:"name"`
	CpuPct float64 `json:"cpuPct"`
	MemPct float64 `json:"memPct"`
}

// WebSocket message types
type SnapshotMessage struct {
	Type   string        `json:"type"` // "snapshot"
	Points []MetricPoint `json:"points"`
}

type PointMessage struct {
	Type  string      `json:"type"` // "point"
	Point MetricPoint `json:"point"`
}

type StatusMessage struct {
	Type   string `json:"type"` // "status"
	Source string `json:"source"`
	Error  string `json:"error,omitempty"`
}

// RingBuffer is a fixed-size circular buffer for storing metric points.
type RingBuffer struct {
	mu     sync.RWMutex
	points []MetricPoint
	size   int
	head   int
	count  int
}

// NewRingBuffer creates a new ring buffer with the specified capacity.
func NewRingBuffer(size int) *RingBuffer {
	return &RingBuffer{
		points: make([]MetricPoint, size),
		size:   size,
		head:   0,
		count:  0,
	}
}

// Append adds a new metric point to the buffer.
func (rb *RingBuffer) Append(point MetricPoint) {
	rb.mu.Lock()
	defer rb.mu.Unlock()

	rb.points[rb.head] = point
	rb.head = (rb.head + 1) % rb.size
	if rb.count < rb.size {
		rb.count++
	}
}

// Snapshot returns all points in order from oldest to newest.
func (rb *RingBuffer) Snapshot() []MetricPoint {
	rb.mu.RLock()
	defer rb.mu.RUnlock()

	if rb.count == 0 {
		return nil
	}

	result := make([]MetricPoint, rb.count)
	if rb.count < rb.size {
		// Buffer not full yet
		copy(result, rb.points[:rb.count])
	} else {
		// Buffer is full, need to read from head to end, then start to head
		start := rb.head
		for i := 0; i < rb.count; i++ {
			result[i] = rb.points[(start+i)%rb.size]
		}
	}
	return result
}

// Latest returns the most recent point, or nil if empty.
func (rb *RingBuffer) Latest() *MetricPoint {
	rb.mu.RLock()
	defer rb.mu.RUnlock()

	if rb.count == 0 {
		return nil
	}

	idx := (rb.head - 1 + rb.size) % rb.size
	point := rb.points[idx]
	return &point
}

// Count returns the number of points in the buffer.
func (rb *RingBuffer) Count() int {
	rb.mu.RLock()
	defer rb.mu.RUnlock()
	return rb.count
}

// Clear removes all points from the buffer.
func (rb *RingBuffer) Clear() {
	rb.mu.Lock()
	defer rb.mu.Unlock()
	rb.head = 0
	rb.count = 0
}

// Config holds metrics collector configuration.
type Config struct {
	Interval     time.Duration // Collection interval (default 5s)
	MaxPoints    int           // Max points to store (default 180 = 15 min at 5s)
	TopNodesCount int          // Number of top nodes to include (default 5)
}

// DefaultConfig returns the default configuration.
func DefaultConfig() Config {
	return Config{
		Interval:      5 * time.Second,
		MaxPoints:     180, // 15 minutes at 5s intervals
		TopNodesCount: 5,
	}
}

