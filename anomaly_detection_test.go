// Copyright 2025 KubeGraf Contributors
// SPDX-License-Identifier: Apache-2.0

package main

import (
	"testing"
)

// detector with nil app — sufficient for pure methods
func newTestDetector() *AnomalyDetector {
	return NewAnomalyDetector(nil)
}

// ─────────────────────────────────────────────────────────────────────────────
// ExtractFeatures
// ─────────────────────────────────────────────────────────────────────────────

func TestExtractFeatures_ZeroRequest_ZeroPct(t *testing.T) {
	ad := newTestDetector()
	sample := MetricSample{CPUUsage: 100, CPURequest: 0, MemoryUsage: 500, MemoryRequest: 0}
	fv := ad.ExtractFeatures(sample)
	if fv.CPUUsagePercent != 0 || fv.MemoryUsagePercent != 0 {
		t.Errorf("zero request should give 0 pct, got cpu=%f mem=%f", fv.CPUUsagePercent, fv.MemoryUsagePercent)
	}
}

func TestExtractFeatures_CPUPercent(t *testing.T) {
	ad := newTestDetector()
	sample := MetricSample{CPUUsage: 250, CPURequest: 500}
	fv := ad.ExtractFeatures(sample)
	if fv.CPUUsagePercent != 50.0 {
		t.Errorf("CPUUsagePercent = %f, want 50.0", fv.CPUUsagePercent)
	}
}

func TestExtractFeatures_MemPercent(t *testing.T) {
	ad := newTestDetector()
	sample := MetricSample{MemoryUsage: 256 * 1024 * 1024, MemoryRequest: 512 * 1024 * 1024}
	fv := ad.ExtractFeatures(sample)
	if fv.MemoryUsagePercent != 50.0 {
		t.Errorf("MemoryUsagePercent = %f, want 50.0", fv.MemoryUsagePercent)
	}
}

func TestExtractFeatures_RestartFlag(t *testing.T) {
	ad := newTestDetector()
	// With restart
	fv := ad.ExtractFeatures(MetricSample{RestartCount: 3})
	if fv.RestartFlag != 1.0 {
		t.Errorf("RestartFlag with restarts = %f, want 1.0", fv.RestartFlag)
	}
	// Without restart
	fv2 := ad.ExtractFeatures(MetricSample{RestartCount: 0})
	if fv2.RestartFlag != 0.0 {
		t.Errorf("RestartFlag without restarts = %f, want 0.0", fv2.RestartFlag)
	}
}

func TestExtractFeatures_NotReadyFlag(t *testing.T) {
	ad := newTestDetector()
	fv := ad.ExtractFeatures(MetricSample{Ready: false})
	if fv.NotReadyFlag != 1.0 {
		t.Errorf("NotReadyFlag when not ready = %f, want 1.0", fv.NotReadyFlag)
	}
	fv2 := ad.ExtractFeatures(MetricSample{Ready: true})
	if fv2.NotReadyFlag != 0.0 {
		t.Errorf("NotReadyFlag when ready = %f, want 0.0", fv2.NotReadyFlag)
	}
}

func TestExtractFeatures_CrashLoopFlag(t *testing.T) {
	ad := newTestDetector()
	fv := ad.ExtractFeatures(MetricSample{Phase: "CrashLoopBackOff"})
	if fv.CrashLoopFlag != 1.0 {
		t.Errorf("CrashLoopFlag for CrashLoopBackOff = %f, want 1.0", fv.CrashLoopFlag)
	}
	fv2 := ad.ExtractFeatures(MetricSample{Phase: "Running"})
	if fv2.CrashLoopFlag != 0.0 {
		t.Errorf("CrashLoopFlag for Running = %f, want 0.0", fv2.CrashLoopFlag)
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// SimpleHeuristicScore
// ─────────────────────────────────────────────────────────────────────────────

func TestSimpleHeuristicScore_Normal_LowScore(t *testing.T) {
	ad := newTestDetector()
	fv := FeatureVector{CPUUsagePercent: 30, MemoryUsagePercent: 40}
	score := ad.SimpleHeuristicScore(fv)
	if score >= 0.3 {
		t.Errorf("normal metrics score = %f, want < 0.3", score)
	}
}

func TestSimpleHeuristicScore_CPUSpike(t *testing.T) {
	ad := newTestDetector()
	fv := FeatureVector{CPUUsagePercent: 95}
	score := ad.SimpleHeuristicScore(fv)
	if score < 0.3 {
		t.Errorf("CPU spike score = %f, want >= 0.3", score)
	}
}

func TestSimpleHeuristicScore_MemSpike(t *testing.T) {
	ad := newTestDetector()
	fv := FeatureVector{MemoryUsagePercent: 95}
	score := ad.SimpleHeuristicScore(fv)
	if score < 0.3 {
		t.Errorf("memory spike score = %f, want >= 0.3", score)
	}
}

func TestSimpleHeuristicScore_CrashLoop_HighScore(t *testing.T) {
	ad := newTestDetector()
	fv := FeatureVector{CrashLoopFlag: 1.0}
	score := ad.SimpleHeuristicScore(fv)
	if score < 0.4 {
		t.Errorf("crash loop score = %f, want >= 0.4", score)
	}
}

func TestSimpleHeuristicScore_CappedAt1(t *testing.T) {
	ad := newTestDetector()
	fv := FeatureVector{
		CPUUsagePercent:    100,
		MemoryUsagePercent: 100,
		CrashLoopFlag:      1.0,
		NotReadyFlag:       1.0,
		RestartFlag:        1.0,
	}
	score := ad.SimpleHeuristicScore(fv)
	if score > 1.0 {
		t.Errorf("score = %f, should be capped at 1.0", score)
	}
}

func TestSimpleHeuristicScore_ScoreRange(t *testing.T) {
	ad := newTestDetector()
	cases := []FeatureVector{
		{},
		{CPUUsagePercent: 85},
		{MemoryUsagePercent: 85},
		{RestartFlag: 1},
		{NotReadyFlag: 1},
	}
	for _, fv := range cases {
		score := ad.SimpleHeuristicScore(fv)
		if score < 0 || score > 1 {
			t.Errorf("score = %f, want 0 <= score <= 1", score)
		}
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// IsolationForestScore — insufficient data fallback
// ─────────────────────────────────────────────────────────────────────────────

func TestIsolationForestScore_InsufficientData_UsesHeuristic(t *testing.T) {
	ad := newTestDetector()
	fv := FeatureVector{CPUUsagePercent: 95, CrashLoopFlag: 1}
	// < 10 historical samples → falls back to heuristic
	score := ad.IsolationForestScore(fv, []FeatureVector{})
	if score < 0 || score > 1 {
		t.Errorf("IsolationForestScore fallback = %f, want 0 <= score <= 1", score)
	}
}

func TestIsolationForestScore_WithHistory_ReturnsScore(t *testing.T) {
	ad := newTestDetector()
	historical := make([]FeatureVector, 15)
	for i := range historical {
		historical[i] = FeatureVector{CPUUsagePercent: 20, MemoryUsagePercent: 30}
	}
	// Test point far from historical baseline
	fv := FeatureVector{CPUUsagePercent: 95, MemoryUsagePercent: 90}
	score := ad.IsolationForestScore(fv, historical)
	if score < 0 || score > 1 {
		t.Errorf("IsolationForestScore with history = %f, want 0 <= score <= 1", score)
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// calculateMeans
// ─────────────────────────────────────────────────────────────────────────────

func TestCalculateMeans_Empty(t *testing.T) {
	ad := newTestDetector()
	means := ad.calculateMeans([]FeatureVector{})
	if means.CPUUsagePercent != 0 || means.MemoryUsagePercent != 0 {
		t.Error("empty historical means should be zero")
	}
}

func TestCalculateMeans_SingleEntry(t *testing.T) {
	ad := newTestDetector()
	historical := []FeatureVector{{CPUUsagePercent: 50, MemoryUsagePercent: 60}}
	means := ad.calculateMeans(historical)
	if means.CPUUsagePercent != 50 {
		t.Errorf("mean CPU = %f, want 50", means.CPUUsagePercent)
	}
	if means.MemoryUsagePercent != 60 {
		t.Errorf("mean Mem = %f, want 60", means.MemoryUsagePercent)
	}
}

func TestCalculateMeans_MultipleEntries(t *testing.T) {
	ad := newTestDetector()
	historical := []FeatureVector{
		{CPUUsagePercent: 20},
		{CPUUsagePercent: 40},
		{CPUUsagePercent: 60},
	}
	means := ad.calculateMeans(historical)
	if means.CPUUsagePercent != 40 {
		t.Errorf("mean CPU = %f, want 40", means.CPUUsagePercent)
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// GetAnomalyStats
// ─────────────────────────────────────────────────────────────────────────────

func TestGetAnomalyStats_Empty(t *testing.T) {
	ad := newTestDetector()
	stats := ad.GetAnomalyStats([]Anomaly{})
	if stats["total"].(int) != 0 {
		t.Errorf("total = %v, want 0", stats["total"])
	}
}

func TestGetAnomalyStats_CountsBySeverity(t *testing.T) {
	ad := newTestDetector()
	anomalies := []Anomaly{
		{Severity: "critical", Type: "cpu_spike", Namespace: "default"},
		{Severity: "critical", Type: "memory_spike", Namespace: "default"},
		{Severity: "warning", Type: "crash_loop", Namespace: "prod"},
		{Severity: "info", Type: "restart", Namespace: "prod"},
	}
	stats := ad.GetAnomalyStats(anomalies)
	if stats["total"].(int) != 4 {
		t.Errorf("total = %v, want 4", stats["total"])
	}
	if stats["critical"].(int) != 2 {
		t.Errorf("critical = %v, want 2", stats["critical"])
	}
	if stats["warning"].(int) != 1 {
		t.Errorf("warning = %v, want 1", stats["warning"])
	}
	if stats["info"].(int) != 1 {
		t.Errorf("info = %v, want 1", stats["info"])
	}
}

func TestGetAnomalyStats_ByType(t *testing.T) {
	ad := newTestDetector()
	anomalies := []Anomaly{
		{Type: "cpu_spike", Severity: "warning"},
		{Type: "cpu_spike", Severity: "warning"},
		{Type: "memory_spike", Severity: "critical"},
	}
	stats := ad.GetAnomalyStats(anomalies)
	byType := stats["byType"].(map[string]int)
	if byType["cpu_spike"] != 2 {
		t.Errorf("byType[cpu_spike] = %d, want 2", byType["cpu_spike"])
	}
	if byType["memory_spike"] != 1 {
		t.Errorf("byType[memory_spike] = %d, want 1", byType["memory_spike"])
	}
}

func TestGetAnomalyStats_ByNamespace(t *testing.T) {
	ad := newTestDetector()
	anomalies := []Anomaly{
		{Namespace: "default", Severity: "warning"},
		{Namespace: "default", Severity: "critical"},
		{Namespace: "prod", Severity: "info"},
	}
	stats := ad.GetAnomalyStats(anomalies)
	byNS := stats["byNamespace"].(map[string]int)
	if byNS["default"] != 2 {
		t.Errorf("byNamespace[default] = %d, want 2", byNS["default"])
	}
	if byNS["prod"] != 1 {
		t.Errorf("byNamespace[prod] = %d, want 1", byNS["prod"])
	}
}
