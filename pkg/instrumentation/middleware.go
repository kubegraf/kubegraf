// Copyright 2025 KubeGraf Contributors
// SPDX-License-Identifier: Apache-2.0

package instrumentation

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"log"
	"net/http"
	"strings"
	"time"
)

const (
	RequestIDHeader = "X-KubeGraf-Request-ID"
	RequestIDKey    = "kubegraf.request_id"
)

// generateRequestID generates a unique request ID
func generateRequestID() string {
	b := make([]byte, 8)
	rand.Read(b)
	return hex.EncodeToString(b)
}

// getRequestID gets or creates a request ID from the request
func getRequestID(r *http.Request) string {
	// Check header first
	if id := r.Header.Get(RequestIDHeader); id != "" {
		return id
	}
	// Generate new one
	return generateRequestID()
}

// PerformanceMiddleware wraps an HTTP handler with performance instrumentation
func PerformanceMiddleware(store PerformanceStore, next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// Only instrument /api/v2/incidents* endpoints
		if !strings.HasPrefix(r.URL.Path, "/api/v2/incidents") {
			next(w, r)
			return
		}

		// Get or create request ID
		requestID := getRequestID(r)
		w.Header().Set(RequestIDHeader, requestID)

		// Create request context
		ctx := NewRequestContext(requestID)
		
		// Extract cluster from context if available
		if cluster := r.Header.Get("X-Cluster-Context"); cluster != "" {
			ctx.Cluster = cluster
		}

		// Add context to request
		ctxWithID := context.WithValue(r.Context(), RequestIDKey, requestID)
		ctxWithPerf := context.WithValue(ctxWithID, "perf.ctx", ctx)
		r = r.WithContext(ctxWithPerf)

		// Create response writer wrapper to capture status
		rw := &responseWriter{ResponseWriter: w, statusCode: http.StatusOK}

		// Execute handler
		start := time.Now()
		next(rw, r)
		duration := time.Since(start)

		// Record the span
		route := normalizeRoute(r.URL.Path)
		span := ctx.ToSpan(route, r.Method)
		span.HandlerTotalMs = duration.Seconds() * 1000

		// Extract incident pattern from response if available (for GET requests)
		if r.Method == http.MethodGet && strings.Contains(r.URL.Path, "/incidents/") {
			// Pattern extraction would need to be done in handlers
			// For now, we'll rely on handlers setting it via context
		}

		store.Record(span)

		// Log if slow (p90 threshold exceeded)
		if duration.Seconds()*1000 > 500 {
			log.Printf("[Perf] Slow request: %s %s took %.2fms (request_id=%s)", r.Method, route, duration.Seconds()*1000, requestID)
		}
	}
}

// GetRequestContext extracts the performance context from the request
func GetRequestContext(r *http.Request) *RequestContext {
	if ctx, ok := r.Context().Value("perf.ctx").(*RequestContext); ok {
		return ctx
	}
	return nil
}

// GetRequestID extracts the request ID from the request
func GetRequestID(r *http.Request) string {
	if id, ok := r.Context().Value(RequestIDKey).(string); ok {
		return id
	}
	return ""
}

// normalizeRoute normalizes a route path for grouping
func normalizeRoute(path string) string {
	// Replace incident IDs with :id placeholder
	// /api/v2/incidents/abc123/snapshot -> /api/v2/incidents/:id/snapshot
	parts := strings.Split(path, "/")
	for i, part := range parts {
		if i > 0 && parts[i-1] == "incidents" && len(part) > 0 && part != "incidents" {
			// Check if it looks like an ID (not a sub-path like "snapshot")
			if !strings.Contains(part, "-") && len(part) < 20 {
				// Likely an ID, replace with placeholder
				parts[i] = ":id"
			}
		}
	}
	return strings.Join(parts, "/")
}

// responseWriter wraps http.ResponseWriter to capture status code
type responseWriter struct {
	http.ResponseWriter
	statusCode int
}

func (rw *responseWriter) WriteHeader(code int) {
	rw.statusCode = code
	rw.ResponseWriter.WriteHeader(code)
}

