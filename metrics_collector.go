// Copyright 2025 KubeGraf Contributors
// SPDX-License-Identifier: Apache-2.0

package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"sync"
	"time"
)

// MetricsCollectorConfig holds configuration for background metrics collection
type MetricsCollectorConfig struct {
	Enabled          bool          `json:"enabled"`
	CollectionInterval time.Duration `json:"collectionInterval"` // How often to collect metrics
	MaxRetentionDays int           `json:"maxRetentionDays"`   // How long to keep metrics
	StoragePath      string        `json:"storagePath"`        // Where to store metrics data
}

// MetricsCollector handles background collection and storage of metrics
type MetricsCollector struct {
	app        *App
	config     *MetricsCollectorConfig
	mu         sync.RWMutex
	stopCh     chan struct{}
	ticker     *time.Ticker
	dataFile   string
}

// MetricsStorage represents the persistent storage format
type MetricsStorage struct {
	LastUpdated time.Time      `json:"lastUpdated"`
	Samples     []MetricSample `json:"samples"`
}

// DefaultMetricsCollectorConfig returns default configuration
func DefaultMetricsCollectorConfig() *MetricsCollectorConfig {
	homeDir, _ := os.UserHomeDir()
	storagePath := filepath.Join(homeDir, ".kubegraf", "metrics")

	return &MetricsCollectorConfig{
		Enabled:            true,
		CollectionInterval: 5 * time.Minute, // Default: collect every 5 minutes
		MaxRetentionDays:   7,                // Keep data for 7 days
		StoragePath:        storagePath,
	}
}

// NewMetricsCollector creates a new metrics collector
func NewMetricsCollector(app *App, config *MetricsCollectorConfig) *MetricsCollector {
	if config == nil {
		config = DefaultMetricsCollectorConfig()
	}

	// Ensure storage directory exists
	if err := os.MkdirAll(config.StoragePath, 0755); err != nil {
		log.Printf("Warning: Failed to create metrics storage directory: %v", err)
	}

	dataFile := filepath.Join(config.StoragePath, "metrics_history.json")

	return &MetricsCollector{
		app:      app,
		config:   config,
		stopCh:   make(chan struct{}),
		dataFile: dataFile,
	}
}

// Start begins background metrics collection
func (mc *MetricsCollector) Start(ctx context.Context) {
	if !mc.config.Enabled {
		log.Println("Metrics collector is disabled")
		return
	}

	log.Printf("Starting background metrics collector (interval: %v)", mc.config.CollectionInterval)

	// Load existing metrics from storage
	if err := mc.LoadMetrics(); err != nil {
		log.Printf("Warning: Failed to load existing metrics: %v", err)
	}

	// Start collection ticker
	mc.ticker = time.NewTicker(mc.config.CollectionInterval)

	go func() {
		// Collect immediately on start
		mc.collectAndStore(ctx)

		// Then collect on ticker
		for {
			select {
			case <-mc.stopCh:
				return
			case <-ctx.Done():
				return
			case <-mc.ticker.C:
				mc.collectAndStore(ctx)
			}
		}
	}()

	// Start cleanup routine (runs daily)
	go mc.cleanupOldMetrics(ctx)

	log.Println("Background metrics collector started")
}

// Stop stops the background metrics collection
func (mc *MetricsCollector) Stop() {
	if mc.ticker != nil {
		mc.ticker.Stop()
	}
	close(mc.stopCh)

	// Save metrics before shutting down
	if err := mc.SaveMetrics(); err != nil {
		log.Printf("Warning: Failed to save metrics on shutdown: %v", err)
	}

	log.Println("Background metrics collector stopped")
}

// collectAndStore collects metrics and stores them
func (mc *MetricsCollector) collectAndStore(ctx context.Context) {
	// Only collect if cluster is connected
	if mc.app.anomalyDetector == nil || mc.app.clientset == nil || !mc.app.connected {
		log.Println("Skipping metrics collection: cluster not connected")
		return
	}

	log.Println("Collecting metrics...")

	// Collect metrics using anomaly detector
	samples, err := mc.app.anomalyDetector.CollectMetrics(ctx)
	if err != nil {
		log.Printf("Failed to collect metrics: %v", err)
		return
	}

	log.Printf("Collected %d metric samples", len(samples))

	// Update ML recommender history
	if mc.app.mlRecommender != nil {
		mc.app.mlRecommender.UpdateMetricsHistory(samples)
	}

	// Save to disk
	if err := mc.SaveMetrics(); err != nil {
		log.Printf("Failed to save metrics: %v", err)
	}
}

// LoadMetrics loads metrics from persistent storage
func (mc *MetricsCollector) LoadMetrics() error {
	mc.mu.Lock()
	defer mc.mu.Unlock()

	// Check if file exists
	if _, err := os.Stat(mc.dataFile); os.IsNotExist(err) {
		log.Println("No existing metrics file found, starting fresh")
		return nil
	}

	// Read file
	data, err := os.ReadFile(mc.dataFile)
	if err != nil {
		return fmt.Errorf("failed to read metrics file: %w", err)
	}

	// Parse JSON
	var storage MetricsStorage
	if err := json.Unmarshal(data, &storage); err != nil {
		return fmt.Errorf("failed to parse metrics file: %w", err)
	}

	log.Printf("Loaded %d metric samples from storage (last updated: %s)",
		len(storage.Samples), storage.LastUpdated.Format(time.RFC3339))

	// Load into anomaly detector
	if mc.app.anomalyDetector != nil {
		mc.app.anomalyDetector.mu.Lock()
		mc.app.anomalyDetector.metricsHistory = storage.Samples
		mc.app.anomalyDetector.mu.Unlock()
	}

	// Load into ML recommender
	if mc.app.mlRecommender != nil {
		mc.app.mlRecommender.mu.Lock()
		mc.app.mlRecommender.metricsHistory = storage.Samples
		mc.app.mlRecommender.mu.Unlock()
	}

	return nil
}

// SaveMetrics saves metrics to persistent storage
func (mc *MetricsCollector) SaveMetrics() error {
	mc.mu.Lock()
	defer mc.mu.Unlock()

	// Get current metrics from anomaly detector
	var samples []MetricSample
	if mc.app.anomalyDetector != nil {
		mc.app.anomalyDetector.mu.RLock()
		samples = mc.app.anomalyDetector.metricsHistory
		mc.app.anomalyDetector.mu.RUnlock()
	}

	if len(samples) == 0 {
		// No data to save
		return nil
	}

	// Create storage object
	storage := MetricsStorage{
		LastUpdated: time.Now(),
		Samples:     samples,
	}

	// Marshal to JSON
	data, err := json.MarshalIndent(storage, "", "  ")
	if err != nil {
		return fmt.Errorf("failed to marshal metrics: %w", err)
	}

	// Write to file (atomic write using temp file)
	tempFile := mc.dataFile + ".tmp"
	if err := os.WriteFile(tempFile, data, 0644); err != nil {
		return fmt.Errorf("failed to write metrics file: %w", err)
	}

	// Rename temp file to actual file (atomic operation)
	if err := os.Rename(tempFile, mc.dataFile); err != nil {
		return fmt.Errorf("failed to rename metrics file: %w", err)
	}

	log.Printf("Saved %d metric samples to storage", len(samples))
	return nil
}

// cleanupOldMetrics removes metrics older than retention period
func (mc *MetricsCollector) cleanupOldMetrics(ctx context.Context) {
	ticker := time.NewTicker(24 * time.Hour) // Run daily
	defer ticker.Stop()

	for {
		select {
		case <-mc.stopCh:
			return
		case <-ctx.Done():
			return
		case <-ticker.C:
			mc.performCleanup()
		}
	}
}

// performCleanup actually performs the cleanup
func (mc *MetricsCollector) performCleanup() {
	cutoffTime := time.Now().AddDate(0, 0, -mc.config.MaxRetentionDays)

	if mc.app.anomalyDetector == nil {
		return
	}

	mc.app.anomalyDetector.mu.Lock()
	originalCount := len(mc.app.anomalyDetector.metricsHistory)

	// Filter out old samples
	filteredSamples := make([]MetricSample, 0)
	for _, sample := range mc.app.anomalyDetector.metricsHistory {
		if sample.Timestamp.After(cutoffTime) {
			filteredSamples = append(filteredSamples, sample)
		}
	}

	mc.app.anomalyDetector.metricsHistory = filteredSamples
	mc.app.anomalyDetector.mu.Unlock()

	removedCount := originalCount - len(filteredSamples)
	if removedCount > 0 {
		log.Printf("Cleaned up %d old metric samples (retention: %d days)", removedCount, mc.config.MaxRetentionDays)

		// Save after cleanup
		if err := mc.SaveMetrics(); err != nil {
			log.Printf("Failed to save metrics after cleanup: %v", err)
		}
	}
}

// GetConfig returns the current configuration
func (mc *MetricsCollector) GetConfig() *MetricsCollectorConfig {
	mc.mu.RLock()
	defer mc.mu.RUnlock()
	return mc.config
}

// UpdateConfig updates the configuration
func (mc *MetricsCollector) UpdateConfig(config *MetricsCollectorConfig) {
	mc.mu.Lock()
	defer mc.mu.Unlock()

	// Stop old ticker if interval changed
	if mc.ticker != nil && config.CollectionInterval != mc.config.CollectionInterval {
		mc.ticker.Stop()
		mc.ticker = time.NewTicker(config.CollectionInterval)
	}

	mc.config = config
	log.Printf("Metrics collector configuration updated (interval: %v, retention: %d days)",
		config.CollectionInterval, config.MaxRetentionDays)
}
