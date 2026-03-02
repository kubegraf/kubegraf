// Copyright 2025 KubeGraf Contributors
// SPDX-License-Identifier: Apache-2.0

package metrics

import (
	"testing"
	"time"
)

// ─────────────────────────────────────────────────────────────────────────────
// DefaultConfig
// ─────────────────────────────────────────────────────────────────────────────

func TestDefaultConfig_PositiveInterval(t *testing.T) {
	cfg := DefaultConfig()
	if cfg.Interval <= 0 {
		t.Error("Interval should be positive")
	}
}

func TestDefaultConfig_PositiveMaxPoints(t *testing.T) {
	cfg := DefaultConfig()
	if cfg.MaxPoints <= 0 {
		t.Error("MaxPoints should be positive")
	}
}

func TestDefaultConfig_PositiveTopNodesCount(t *testing.T) {
	cfg := DefaultConfig()
	if cfg.TopNodesCount <= 0 {
		t.Error("TopNodesCount should be positive")
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// NewRingBuffer
// ─────────────────────────────────────────────────────────────────────────────

func TestNewRingBuffer_NotNil(t *testing.T) {
	rb := NewRingBuffer(10)
	if rb == nil {
		t.Fatal("NewRingBuffer returned nil")
	}
}

func TestNewRingBuffer_EmptyOnCreate(t *testing.T) {
	rb := NewRingBuffer(10)
	if rb.Count() != 0 {
		t.Errorf("Count() = %d, want 0", rb.Count())
	}
}

func TestNewRingBuffer_LatestOnEmpty(t *testing.T) {
	rb := NewRingBuffer(10)
	if rb.Latest() != nil {
		t.Error("Latest() on empty buffer should return nil")
	}
}

func TestNewRingBuffer_SnapshotOnEmpty(t *testing.T) {
	rb := NewRingBuffer(10)
	if snap := rb.Snapshot(); snap != nil {
		t.Errorf("Snapshot() on empty buffer should return nil, got %v", snap)
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// Append / Count
// ─────────────────────────────────────────────────────────────────────────────

func makePoint(ts int64, cpu, mem float64) MetricPoint {
	return MetricPoint{
		Ts:     ts,
		Cluster: ClusterMetrics{CpuPct: cpu, MemPct: mem},
	}
}

func TestRingBuffer_AppendIncrementsCount(t *testing.T) {
	rb := NewRingBuffer(10)
	rb.Append(makePoint(1, 10.0, 20.0))
	if rb.Count() != 1 {
		t.Errorf("Count() = %d, want 1", rb.Count())
	}
}

func TestRingBuffer_AppendMultiple(t *testing.T) {
	rb := NewRingBuffer(10)
	for i := 0; i < 5; i++ {
		rb.Append(makePoint(int64(i), float64(i), float64(i)))
	}
	if rb.Count() != 5 {
		t.Errorf("Count() = %d, want 5", rb.Count())
	}
}

func TestRingBuffer_CountCappedAtSize(t *testing.T) {
	rb := NewRingBuffer(3)
	for i := 0; i < 10; i++ {
		rb.Append(makePoint(int64(i), float64(i), float64(i)))
	}
	if rb.Count() != 3 {
		t.Errorf("Count() = %d, want 3 (max size)", rb.Count())
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// Latest
// ─────────────────────────────────────────────────────────────────────────────

func TestRingBuffer_Latest(t *testing.T) {
	rb := NewRingBuffer(10)
	rb.Append(makePoint(1, 10.0, 20.0))
	rb.Append(makePoint(2, 30.0, 40.0))

	latest := rb.Latest()
	if latest == nil {
		t.Fatal("Latest() returned nil")
	}
	if latest.Ts != 2 {
		t.Errorf("Latest().Ts = %d, want 2", latest.Ts)
	}
	if latest.Cluster.CpuPct != 30.0 {
		t.Errorf("Latest().Cluster.CpuPct = %f, want 30.0", latest.Cluster.CpuPct)
	}
}

func TestRingBuffer_Latest_AfterWrap(t *testing.T) {
	rb := NewRingBuffer(3)
	for i := int64(1); i <= 5; i++ {
		rb.Append(makePoint(i, float64(i*10), 0))
	}
	latest := rb.Latest()
	if latest == nil {
		t.Fatal("Latest() returned nil after wrap")
	}
	if latest.Ts != 5 {
		t.Errorf("Latest().Ts = %d, want 5", latest.Ts)
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// Snapshot
// ─────────────────────────────────────────────────────────────────────────────

func TestRingBuffer_Snapshot_Order(t *testing.T) {
	rb := NewRingBuffer(10)
	rb.Append(makePoint(1, 10, 0))
	rb.Append(makePoint(2, 20, 0))
	rb.Append(makePoint(3, 30, 0))

	snap := rb.Snapshot()
	if len(snap) != 3 {
		t.Fatalf("Snapshot len = %d, want 3", len(snap))
	}
	if snap[0].Ts != 1 || snap[1].Ts != 2 || snap[2].Ts != 3 {
		t.Errorf("Snapshot order wrong: got ts %d %d %d", snap[0].Ts, snap[1].Ts, snap[2].Ts)
	}
}

func TestRingBuffer_Snapshot_AfterWrap(t *testing.T) {
	rb := NewRingBuffer(3)
	for i := int64(1); i <= 5; i++ {
		rb.Append(makePoint(i, float64(i), 0))
	}
	snap := rb.Snapshot()
	if len(snap) != 3 {
		t.Fatalf("Snapshot len = %d, want 3", len(snap))
	}
	// Should contain points 3, 4, 5
	if snap[len(snap)-1].Ts != 5 {
		t.Errorf("last snapshot point Ts = %d, want 5", snap[len(snap)-1].Ts)
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// Clear
// ─────────────────────────────────────────────────────────────────────────────

func TestRingBuffer_Clear(t *testing.T) {
	rb := NewRingBuffer(10)
	rb.Append(makePoint(1, 10, 20))
	rb.Append(makePoint(2, 30, 40))
	rb.Clear()

	if rb.Count() != 0 {
		t.Errorf("Count() after Clear = %d, want 0", rb.Count())
	}
	if rb.Latest() != nil {
		t.Error("Latest() after Clear should return nil")
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// MetricPoint struct sanity
// ─────────────────────────────────────────────────────────────────────────────

func TestMetricPoint_Fields(t *testing.T) {
	p := MetricPoint{
		Ts:     time.Now().Unix(),
		Source: "metrics_api",
		Cluster: ClusterMetrics{CpuPct: 45.5, MemPct: 60.2},
		Peaks:  PeakMetrics{CpuPct: 80.0, MemPct: 75.0},
	}
	if p.Ts <= 0 {
		t.Error("Ts should be positive")
	}
	if p.Cluster.CpuPct != 45.5 {
		t.Errorf("CpuPct = %f, want 45.5", p.Cluster.CpuPct)
	}
}
