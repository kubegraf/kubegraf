// Copyright 2025 KubeGraf Contributors
// SPDX-License-Identifier: Apache-2.0

package instrumentation

import (
	"container/ring"
	"sort"
	"sync"
	"time"
)

// RingBufferStore implements PerformanceStore using a ring buffer
type RingBufferStore struct {
	mu          sync.RWMutex
	spans       *ring.Ring // Ring buffer for recent spans
	size        int
	spansByRoute map[string][]*PerformanceSpan // For summary calculations
}

// NewRingBufferStore creates a new ring buffer store
func NewRingBufferStore(size int) *RingBufferStore {
	return &RingBufferStore{
		spans:       ring.New(size),
		size:        size,
		spansByRoute: make(map[string][]*PerformanceSpan),
	}
}

// Record records a performance span
func (s *RingBufferStore) Record(span *PerformanceSpan) {
	s.mu.Lock()
	defer s.mu.Unlock()

	// Add to ring buffer
	s.spans.Value = span
	s.spans = s.spans.Next()

	// Add to route-based storage for summaries (keep last 1000 per route)
	routeKey := span.Route + ":" + span.Method
	spans := s.spansByRoute[routeKey]
	spans = append(spans, span)
	if len(spans) > 1000 {
		spans = spans[len(spans)-1000:]
	}
	s.spansByRoute[routeKey] = spans
}

// GetSummary calculates performance summary for a route
func (s *RingBufferStore) GetSummary(route, method string, window time.Duration) *PerformanceSummary {
	s.mu.RLock()
	defer s.mu.RUnlock()

	routeKey := route + ":" + method
	spans := s.spansByRoute[routeKey]
	if len(spans) == 0 {
		return nil
	}

	// Filter by time window
	cutoff := time.Now().Add(-window)
	var filtered []*PerformanceSpan
	for _, span := range spans {
		if span.Timestamp.After(cutoff) {
			filtered = append(filtered, span)
		}
	}

	if len(filtered) == 0 {
		return nil
	}

	// Calculate percentiles
	durations := make([]float64, len(filtered))
	cacheHits := 0
	totalK8sCalls := 0
	totalK8sMs := 0.0
	totalDBMs := 0.0

	for i, span := range filtered {
		durations[i] = span.HandlerTotalMs
		if span.CacheHit {
			cacheHits++
		}
		totalK8sCalls += span.UpstreamK8sCalls
		totalK8sMs += span.UpstreamK8sTotalMs
		totalDBMs += span.DBMs
	}

	sort.Float64s(durations)

	summary := &PerformanceSummary{
		Route:              route,
		Method:             method,
		Count:              len(filtered),
		P50:                percentile(durations, 0.50),
		P90:                percentile(durations, 0.90),
		P99:                percentile(durations, 0.99),
		CacheHitRate:       float64(cacheHits) / float64(len(filtered)),
		AvgUpstreamK8sCalls: float64(totalK8sCalls) / float64(len(filtered)),
		AvgUpstreamK8sMs:   totalK8sMs / float64(len(filtered)),
		AvgDBMs:            totalDBMs / float64(len(filtered)),
		LastUpdated:        time.Now(),
	}

	return summary
}

// GetRecent returns the last N spans
func (s *RingBufferStore) GetRecent(n int) []*PerformanceSpan {
	s.mu.RLock()
	defer s.mu.RUnlock()

	var result []*PerformanceSpan
	s.spans.Do(func(val interface{}) {
		if val != nil {
			if span, ok := val.(*PerformanceSpan); ok {
				result = append(result, span)
			}
		}
	})

	// Reverse to get most recent first
	for i, j := 0, len(result)-1; i < j; i, j = i+1, j-1 {
		result[i], result[j] = result[j], result[i]
	}

	if len(result) > n {
		return result[:n]
	}
	return result
}

// Clear clears all stored spans
func (s *RingBufferStore) Clear() {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.spans = ring.New(s.size)
	s.spansByRoute = make(map[string][]*PerformanceSpan)
}

// GetAllSummaries returns summaries for all routes
func (s *RingBufferStore) GetAllSummaries(window time.Duration) []*PerformanceSummary {
	s.mu.RLock()
	defer s.mu.RUnlock()

	var summaries []*PerformanceSummary
	seen := make(map[string]bool)

	for routeKey := range s.spansByRoute {
		if seen[routeKey] {
			continue
		}
		seen[routeKey] = true

		// Parse route and method
		parts := splitRouteKey(routeKey)
		if len(parts) != 2 {
			continue
		}

		summary := s.GetSummary(parts[0], parts[1], window)
		if summary != nil {
			summaries = append(summaries, summary)
		}
	}

	return summaries
}

// percentile calculates the percentile value from a sorted slice
func percentile(sorted []float64, p float64) float64 {
	if len(sorted) == 0 {
		return 0
	}
	index := p * float64(len(sorted)-1)
	lower := int(index)
	upper := lower + 1
	if upper >= len(sorted) {
		return sorted[len(sorted)-1]
	}
	weight := index - float64(lower)
	return sorted[lower]*(1-weight) + sorted[upper]*weight
}

// splitRouteKey splits "route:method" into ["route", "method"]
func splitRouteKey(key string) []string {
	parts := make([]string, 0, 2)
	idx := 0
	for i, r := range key {
		if r == ':' {
			if i > idx {
				parts = append(parts, key[idx:i])
			}
			idx = i + 1
		}
	}
	if idx < len(key) {
		parts = append(parts, key[idx:])
	}
	return parts
}

