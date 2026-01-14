// Copyright 2025 KubeGraf Contributors
package main

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"time"

	"github.com/gorilla/websocket"
	"github.com/kubegraf/kubegraf/pkg/metrics"
	metricsclientset "k8s.io/metrics/pkg/client/clientset/versioned"
)

// metricsHub holds the metrics WebSocket hub and collector.
var metricsHub *metrics.Hub
var metricsCollector *metrics.Collector
var metricsCollectorCancel context.CancelFunc

// handleMetricsWebSocket handles WebSocket connections for realtime metrics streaming.
func (ws *WebServer) handleMetricsWebSocket(w http.ResponseWriter, r *http.Request) {
	if metricsHub == nil {
		http.Error(w, "Metrics not available", http.StatusServiceUnavailable)
		return
	}

	upgrader := websocket.Upgrader{
		CheckOrigin: func(r *http.Request) bool { return true },
	}

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("[MetricsWS] Failed to upgrade: %v", err)
		return
	}

	metricsHub.ServeWs(conn)
}

// handleMetricsSnapshot returns the current metrics buffer as JSON.
func (ws *WebServer) handleMetricsSnapshot(w http.ResponseWriter, r *http.Request) {
	if metricsCollector == nil {
		http.Error(w, "Metrics not available", http.StatusServiceUnavailable)
		return
	}

	buffer := metricsCollector.GetBuffer()
	points := buffer.Snapshot()

	response := struct {
		Points []metrics.MetricPoint `json:"points"`
		Count  int                   `json:"count"`
	}{
		Points: points,
		Count:  len(points),
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// handleMetricsStatus returns the current metrics collection status.
func (ws *WebServer) handleMetricsStatus(w http.ResponseWriter, r *http.Request) {
	if metricsCollector == nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"available": false,
			"reason":    "Metrics collector not initialized",
		})
		return
	}

	buffer := metricsCollector.GetBuffer()
	latest := buffer.Latest()

	response := map[string]interface{}{
		"available":    true,
		"pointCount":   buffer.Count(),
		"clientCount":  0,
	}

	if metricsHub != nil {
		response["clientCount"] = metricsHub.ClientCount()
	}

	if latest != nil {
		response["source"] = latest.Source
		response["lastUpdate"] = latest.Ts
		if latest.Error != "" {
			response["error"] = latest.Error
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// reinitializeMetricsCollector reinitializes the metrics collector with the current cluster
func (ws *WebServer) reinitializeMetricsCollector() {
	if ws.app == nil || ws.app.clientset == nil {
		log.Println("[Metrics] Cannot reinitialize - no cluster connection")
		return
	}

	log.Println("[Metrics] Reinitializing metrics collector for new cluster...")

	// Cancel old collector if running
	if metricsCollectorCancel != nil {
		log.Println("[Metrics] Stopping old metrics collector...")
		metricsCollectorCancel()
		time.Sleep(100 * time.Millisecond) // Give it time to stop
	}

	// Create new metrics client with current config
	var metricsClient metricsclientset.Interface
	if ws.app.config != nil {
		var err error
		metricsClient, err = metricsclientset.NewForConfig(ws.app.config)
		if err != nil {
			log.Printf("[Metrics] Failed to create metrics client: %v", err)
		}
	}

	// Create new collector with cancelable context
	if metricsHub != nil {
		config := metrics.DefaultConfig()

		// Create new buffer to clear old error messages
		buffer := metrics.NewRingBuffer(config.MaxPoints)
		// Create new hub with fresh buffer
		metricsHub = metrics.NewHub(buffer)

		// Start hub in background
		go metricsHub.Run()

		metricsCollector = metrics.NewCollector(ws.app.clientset, metricsClient, metricsHub, config)

		// Create cancelable context
		ctx, cancel := context.WithCancel(context.Background())
		metricsCollectorCancel = cancel

		// Start collector in background
		go func() {
			metricsCollector.Start(ctx)
			log.Println("[Metrics] Metrics collector stopped")
		}()

		log.Println("[Metrics] Metrics collector reinitialized with new cluster")
	}
}

// startMetricsCollector initializes and starts the realtime metrics collection.
func (ws *WebServer) startMetricsCollector() {
	// Wait for cluster connection
	log.Println("[Metrics] Waiting for cluster connection...")
	for {
		if ws.app != nil && ws.app.clientset != nil {
			break
		}
		time.Sleep(time.Second)
	}
	log.Println("[Metrics] Cluster connected, initializing metrics collector...")

	// Create metrics client
	var metricsClient metricsclientset.Interface
	if ws.app.config != nil {
		var err error
		metricsClient, err = metricsclientset.NewForConfig(ws.app.config)
		if err != nil {
			log.Printf("[Metrics] Failed to create metrics client (Metrics API may not be available): %v", err)
			// Continue without metrics client - will use Summary API fallback
		}
	}

	// Create ring buffer and hub
	config := metrics.DefaultConfig()
	buffer := metrics.NewRingBuffer(config.MaxPoints)
	metricsHub = metrics.NewHub(buffer)

	// Start hub in background
	go metricsHub.Run()

	// Create and start collector
	metricsCollector = metrics.NewCollector(ws.app.clientset, metricsClient, metricsHub, config)

	// Create cancelable context
	ctx, cancel := context.WithCancel(context.Background())
	metricsCollectorCancel = cancel

	// Run collector (blocking)
	metricsCollector.Start(ctx)
}

