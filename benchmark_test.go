// Copyright 2025 KubeGraf Contributors
// SPDX-License-Identifier: Apache-2.0

package main

import (
	"context"
	"fmt"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// PerformanceBenchmark runs performance tests
type PerformanceBenchmark struct {
	app *App
}

// BenchmarkResults contains benchmark results
type BenchmarkResults struct {
	TestName      string
	Duration      time.Duration
	Requests      int64
	SuccessCount  int64
	ErrorCount    int64
	AvgLatency    time.Duration
	P50Latency    time.Duration
	P95Latency    time.Duration
	P99Latency    time.Duration
	Throughput    float64 // requests per second
	MemoryUsage   uint64  // bytes
	CPUUsage      float64 // percentage
}

// RunBenchmark runs a performance benchmark
func (pb *PerformanceBenchmark) RunBenchmark(ctx context.Context, testName string, concurrency int, duration time.Duration, testFunc func() error) (*BenchmarkResults, error) {
	var (
		requests     int64
		successCount int64
		errorCount   int64
		latencies    []time.Duration
		latencyMu    sync.Mutex
	)

	startTime := time.Now()
	endTime := startTime.Add(duration)

	// Start workers
	var wg sync.WaitGroup
	for i := 0; i < concurrency; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for time.Now().Before(endTime) {
				reqStart := time.Now()
				err := testFunc()
				latency := time.Since(reqStart)

				atomic.AddInt64(&requests, 1)
				if err != nil {
					atomic.AddInt64(&errorCount, 1)
				} else {
					atomic.AddInt64(&successCount, 1)
				}

				latencyMu.Lock()
				latencies = append(latencies, latency)
				latencyMu.Unlock()
			}
		}()
	}

	wg.Wait()
	totalDuration := time.Since(startTime)

	// Calculate percentiles
	latencyMu.Lock()
	sortedLatencies := make([]time.Duration, len(latencies))
	copy(sortedLatencies, latencies)
	latencyMu.Unlock()

	// Simple sort for percentiles
	for i := 0; i < len(sortedLatencies)-1; i++ {
		for j := i + 1; j < len(sortedLatencies); j++ {
			if sortedLatencies[i] > sortedLatencies[j] {
				sortedLatencies[i], sortedLatencies[j] = sortedLatencies[j], sortedLatencies[i]
			}
		}
	}

	var avgLatency, p50, p95, p99 time.Duration
	if len(sortedLatencies) > 0 {
		totalLatency := time.Duration(0)
		for _, l := range sortedLatencies {
			totalLatency += l
		}
		avgLatency = totalLatency / time.Duration(len(sortedLatencies))

		if len(sortedLatencies) > 0 {
			p50 = sortedLatencies[len(sortedLatencies)*50/100]
			if len(sortedLatencies) > 1 {
				p95 = sortedLatencies[len(sortedLatencies)*95/100]
				p99 = sortedLatencies[len(sortedLatencies)*99/100]
			}
		}
	}

	throughput := float64(requests) / totalDuration.Seconds()

	return &BenchmarkResults{
		TestName:     testName,
		Duration:     totalDuration,
		Requests:     requests,
		SuccessCount: successCount,
		ErrorCount:   errorCount,
		AvgLatency:   avgLatency,
		P50Latency:   p50,
		P95Latency:   p95,
		P99Latency:   p99,
		Throughput:   throughput,
	}, nil
}

// BenchmarkPodList tests pod listing performance
func (pb *PerformanceBenchmark) BenchmarkPodList(ctx context.Context, concurrency int, duration time.Duration) (*BenchmarkResults, error) {
	return pb.RunBenchmark(ctx, "Pod List", concurrency, duration, func() error {
		_, err := pb.app.clientset.CoreV1().Pods("").List(ctx, metav1.ListOptions{Limit: 100})
		return err
	})
}

// BenchmarkDeploymentList tests deployment listing performance
func (pb *PerformanceBenchmark) BenchmarkDeploymentList(ctx context.Context, concurrency int, duration time.Duration) (*BenchmarkResults, error) {
	return pb.RunBenchmark(ctx, "Deployment List", concurrency, duration, func() error {
		_, err := pb.app.clientset.AppsV1().Deployments("").List(ctx, metav1.ListOptions{Limit: 100})
		return err
	})
}

// BenchmarkMetricsFetch tests metrics fetching performance
func (pb *PerformanceBenchmark) BenchmarkMetricsFetch(ctx context.Context, concurrency int, duration time.Duration) (*BenchmarkResults, error) {
	return pb.RunBenchmark(ctx, "Metrics Fetch", concurrency, duration, func() error {
		_, err := pb.app.metricsClient.MetricsV1beta1().NodeMetricses().List(ctx, metav1.ListOptions{})
		return err
	})
}

// RunAllBenchmarks runs all performance benchmarks
func (pb *PerformanceBenchmark) RunAllBenchmarks(ctx context.Context) ([]*BenchmarkResults, error) {
	concurrency := 20 // Simulate 20X load
	duration := 30 * time.Second

	var results []*BenchmarkResults

	// Pod list benchmark
	podResult, err := pb.BenchmarkPodList(ctx, concurrency, duration)
	if err != nil {
		return nil, fmt.Errorf("pod list benchmark failed: %v", err)
	}
	results = append(results, podResult)

	// Deployment list benchmark
	deployResult, err := pb.BenchmarkDeploymentList(ctx, concurrency, duration)
	if err != nil {
		return nil, fmt.Errorf("deployment list benchmark failed: %v", err)
	}
	results = append(results, deployResult)

	// Metrics fetch benchmark
	metricsResult, err := pb.BenchmarkMetricsFetch(ctx, concurrency, duration)
	if err != nil {
		return nil, fmt.Errorf("metrics fetch benchmark failed: %v", err)
	}
	results = append(results, metricsResult)

	return results, nil
}

// PrintResults prints benchmark results
func (br *BenchmarkResults) PrintResults() {
	fmt.Printf("\n=== %s Benchmark Results ===\n", br.TestName)
	fmt.Printf("Duration: %v\n", br.Duration)
	fmt.Printf("Total Requests: %d\n", br.Requests)
	fmt.Printf("Success: %d (%.2f%%)\n", br.SuccessCount, float64(br.SuccessCount)/float64(br.Requests)*100)
	fmt.Printf("Errors: %d (%.2f%%)\n", br.ErrorCount, float64(br.ErrorCount)/float64(br.Requests)*100)
	fmt.Printf("Throughput: %.2f req/s\n", br.Throughput)
	fmt.Printf("Average Latency: %v\n", br.AvgLatency)
	fmt.Printf("P50 Latency: %v\n", br.P50Latency)
	fmt.Printf("P95 Latency: %v\n", br.P95Latency)
	fmt.Printf("P99 Latency: %v\n", br.P99Latency)
	fmt.Println()
}

// TestPerformanceBenchmark runs the performance benchmark suite
// This test requires a connected Kubernetes cluster
func TestPerformanceBenchmark(t *testing.T) {
	// Skip if no cluster available (e.g., in CI without kubeconfig)
	if testing.Short() {
		t.Skip("Skipping performance tests in short mode")
	}

	// Create a test app instance
	// Note: This requires proper initialization with a real cluster
	app := &App{
		// Initialize with test cluster if available
		// For CI, this would need to be set up with kind or similar
	}

	pb := &PerformanceBenchmark{app: app}
	ctx := context.Background()

	// Run benchmarks with moderate settings for CI
	concurrency := 10
	duration := 10 * time.Second

	t.Run("PodList", func(t *testing.T) {
		if app.clientset == nil {
			t.Skip("No Kubernetes cluster available")
		}
		result, err := pb.BenchmarkPodList(ctx, concurrency, duration)
		if err != nil {
			t.Fatalf("Pod list benchmark failed: %v", err)
		}
		t.Logf("Pod List: %d requests, %.2f req/s, avg latency: %v",
			result.Requests, result.Throughput, result.AvgLatency)

		// Assert minimum performance requirements
		if result.Throughput < 10 {
			t.Errorf("Throughput too low: %.2f req/s (expected >= 10)", result.Throughput)
		}
		if result.ErrorCount > result.Requests/10 {
			t.Errorf("Too many errors: %d/%d (expected < 10%%)",
				result.ErrorCount, result.Requests)
		}
	})

	t.Run("DeploymentList", func(t *testing.T) {
		if app.clientset == nil {
			t.Skip("No Kubernetes cluster available")
		}
		result, err := pb.BenchmarkDeploymentList(ctx, concurrency, duration)
		if err != nil {
			t.Fatalf("Deployment list benchmark failed: %v", err)
		}
		t.Logf("Deployment List: %d requests, %.2f req/s, avg latency: %v",
			result.Requests, result.Throughput, result.AvgLatency)

		if result.Throughput < 10 {
			t.Errorf("Throughput too low: %.2f req/s (expected >= 10)", result.Throughput)
		}
	})

	t.Run("MetricsFetch", func(t *testing.T) {
		if app.clientset == nil || app.metricsClient == nil {
			t.Skip("No Kubernetes cluster or metrics client available")
		}
		result, err := pb.BenchmarkMetricsFetch(ctx, concurrency, duration)
		if err != nil {
			t.Fatalf("Metrics fetch benchmark failed: %v", err)
		}
		t.Logf("Metrics Fetch: %d requests, %.2f req/s, avg latency: %v",
			result.Requests, result.Throughput, result.AvgLatency)

		// Metrics API is typically slower, so lower threshold
		if result.Throughput < 5 {
			t.Errorf("Throughput too low: %.2f req/s (expected >= 5)", result.Throughput)
		}
	})
}
