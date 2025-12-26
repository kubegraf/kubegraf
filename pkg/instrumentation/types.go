// Copyright 2025 KubeGraf Contributors
// SPDX-License-Identifier: Apache-2.0

package instrumentation

import (
	"time"
)

// PerformanceSpan represents a single performance measurement
type PerformanceSpan struct {
	RequestID          string            `json:"requestId"`
	Route              string            `json:"route"`
	Method             string            `json:"method"`
	HandlerTotalMs     float64           `json:"handlerTotalMs"`
	UpstreamK8sCalls   int               `json:"upstreamK8sCalls"`
	UpstreamK8sTotalMs  float64           `json:"upstreamK8sTotalMs"`
	DBMs               float64           `json:"dbMs"`
	CacheHit           bool              `json:"cacheHit"`
	IncidentPattern    string            `json:"incidentPattern,omitempty"`
	Cluster            string            `json:"cluster,omitempty"`
	Timestamp          time.Time         `json:"timestamp"`
	Tags               map[string]string `json:"tags,omitempty"`
}

// PerformanceSummary represents aggregated performance metrics
type PerformanceSummary struct {
	Route              string    `json:"route"`
	Method             string    `json:"method"`
	Count              int       `json:"count"`
	P50                float64   `json:"p50"`
	P90                float64   `json:"p90"`
	P99                float64   `json:"p99"`
	CacheHitRate       float64   `json:"cacheHitRate"`
	AvgUpstreamK8sCalls float64  `json:"avgUpstreamK8sCalls"`
	AvgUpstreamK8sMs   float64   `json:"avgUpstreamK8sMs"`
	AvgDBMs            float64   `json:"avgDBMs"`
	LastUpdated        time.Time `json:"lastUpdated"`
}

// PerformanceStore manages performance metrics
type PerformanceStore interface {
	Record(span *PerformanceSpan)
	GetSummary(route string, method string, window time.Duration) *PerformanceSummary
	GetRecent(n int) []*PerformanceSpan
	Clear()
	GetAllSummaries(window time.Duration) []*PerformanceSummary
}

// RequestContext holds performance tracking context for a request
type RequestContext struct {
	RequestID         string
	StartTime         time.Time
	UpstreamK8sCalls  int
	UpstreamK8sTotal  time.Duration
	DBTotal           time.Duration
	CacheHit          bool
	IncidentPattern   string
	Cluster           string
	Tags              map[string]string
}

// NewRequestContext creates a new request context
func NewRequestContext(requestID string) *RequestContext {
	return &RequestContext{
		RequestID:        requestID,
		StartTime:        time.Now(),
		UpstreamK8sCalls: 0,
		UpstreamK8sTotal: 0,
		DBTotal:          0,
		CacheHit:         false,
		Tags:             make(map[string]string),
	}
}

// RecordK8sCall records a Kubernetes API call
func (rc *RequestContext) RecordK8sCall(duration time.Duration) {
	rc.UpstreamK8sCalls++
	rc.UpstreamK8sTotal += duration
}

// RecordDBOp records a database operation
func (rc *RequestContext) RecordDBOp(duration time.Duration) {
	rc.DBTotal += duration
}

// SetCacheHit marks that a cache hit occurred
func (rc *RequestContext) SetCacheHit(hit bool) {
	rc.CacheHit = hit
}

// SetTag sets a tag on the context
func (rc *RequestContext) SetTag(key, value string) {
	if rc.Tags == nil {
		rc.Tags = make(map[string]string)
	}
	rc.Tags[key] = value
}

// ToSpan converts the context to a PerformanceSpan
func (rc *RequestContext) ToSpan(route, method string) *PerformanceSpan {
	totalDuration := time.Since(rc.StartTime)
	return &PerformanceSpan{
		RequestID:          rc.RequestID,
		Route:              route,
		Method:             method,
		HandlerTotalMs:     totalDuration.Seconds() * 1000,
		UpstreamK8sCalls:   rc.UpstreamK8sCalls,
		UpstreamK8sTotalMs: rc.UpstreamK8sTotal.Seconds() * 1000,
		DBMs:               rc.DBTotal.Seconds() * 1000,
		CacheHit:           rc.CacheHit,
		IncidentPattern:    rc.IncidentPattern,
		Cluster:            rc.Cluster,
		Timestamp:          rc.StartTime,
		Tags:               rc.Tags,
	}
}

