// Copyright 2025 KubeGraf Contributors
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package main

import (
	"context"
	"fmt"
	"sort"
	"sync"
	"time"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// EventCluster represents a group of related events that occurred around the same time
type EventCluster struct {
	ID              string                 `json:"id"`
	TimeWindow      TimeWindow             `json:"time_window"`
	Events          []MonitoredEvent       `json:"events"`
	LogErrors       []LogError             `json:"log_errors"`
	Correlations    []EventCorrelation     `json:"correlations"`
	Summary         string                 `json:"summary"`
	Severity        EventSeverity          `json:"severity"`
	RootCause       string                 `json:"root_cause"`
	AffectedPods    []string               `json:"affected_pods"`
	AffectedNodes   []string               `json:"affected_nodes"`
	HTTPErrorCodes  map[int]int            `json:"http_error_codes"` // status code -> count
	TotalEvents     int                    `json:"total_events"`
	TotalHTTPErrors int                    `json:"total_http_errors"`
}

// TimeWindow represents a time range
type TimeWindow struct {
	Start time.Time `json:"start"`
	End   time.Time `json:"end"`
}

// EventCorrelation represents a detected correlation between events
type EventCorrelation struct {
	Type        string    `json:"type"`        // "hpa_max_errors", "oom_restarts", "node_scale_errors", etc.
	Description string    `json:"description"`
	Confidence  float64   `json:"confidence"`  // 0.0 to 1.0
	Events      []string  `json:"events"`      // Event IDs involved
	Timestamp   time.Time `json:"timestamp"`
}

// EventCorrelator analyzes events for correlations and patterns
type EventCorrelator struct {
	app *App
	mu  sync.RWMutex
}

// NewEventCorrelator creates a new event correlator
func NewEventCorrelator(app *App) *EventCorrelator {
	return &EventCorrelator{
		app: app,
	}
}

// ClusterEvents groups events into time-based clusters and detects correlations
func (ec *EventCorrelator) ClusterEvents(events []MonitoredEvent, logErrors []LogError, windowSize time.Duration) []EventCluster {
	if len(events) == 0 && len(logErrors) == 0 {
		return []EventCluster{}
	}

	// Sort events by timestamp
	sort.Slice(events, func(i, j int) bool {
		return events[i].Timestamp.Before(events[j].Timestamp)
	})
	sort.Slice(logErrors, func(i, j int) bool {
		return logErrors[i].Timestamp.Before(logErrors[j].Timestamp)
	})

	// Group events into time windows
	clusters := ec.groupByTimeWindow(events, logErrors, windowSize)

	// Analyze correlations for each cluster
	for i := range clusters {
		clusters[i].Correlations = ec.detectCorrelations(clusters[i], events, logErrors)
		clusters[i].Summary = ec.generateSummary(clusters[i])
		clusters[i].Severity = ec.determineClusterSeverity(clusters[i])
		clusters[i].RootCause = ec.identifyRootCause(clusters[i])
		clusters[i].HTTPErrorCodes = ec.aggregateHTTPErrors(clusters[i].LogErrors)
		clusters[i].TotalEvents = len(clusters[i].Events)
		clusters[i].TotalHTTPErrors = len(clusters[i].LogErrors)
	}

	return clusters
}

// groupByTimeWindow groups events into time-based clusters
func (ec *EventCorrelator) groupByTimeWindow(events []MonitoredEvent, logErrors []LogError, windowSize time.Duration) []EventCluster {
	if len(events) == 0 && len(logErrors) == 0 {
		return []EventCluster{}
	}

	// Find the earliest timestamp
	var earliest time.Time
	if len(events) > 0 {
		earliest = events[0].Timestamp
	}
	if len(logErrors) > 0 {
		if earliest.IsZero() || logErrors[0].Timestamp.Before(earliest) {
			earliest = logErrors[0].Timestamp
		}
	}

	clusters := make([]EventCluster, 0)
	currentWindow := TimeWindow{
		Start: earliest.Truncate(windowSize),
		End:   earliest.Truncate(windowSize).Add(windowSize),
	}

	currentCluster := EventCluster{
		ID:           fmt.Sprintf("cluster-%d", time.Now().Unix()),
		TimeWindow:   currentWindow,
		Events:       make([]MonitoredEvent, 0),
		LogErrors:    make([]LogError, 0),
		AffectedPods: make([]string, 0),
		AffectedNodes: make([]string, 0),
		HTTPErrorCodes: make(map[int]int),
	}

	// Process events
	for _, event := range events {
		// Check if event falls in current window
		if event.Timestamp.Before(currentWindow.Start) || event.Timestamp.After(currentWindow.End) {
			// Save current cluster and start new one
			if len(currentCluster.Events) > 0 || len(currentCluster.LogErrors) > 0 {
				currentCluster.ID = fmt.Sprintf("cluster-%d", currentWindow.Start.Unix())
				clusters = append(clusters, currentCluster)
			}

			// Start new window
			currentWindow = TimeWindow{
				Start: event.Timestamp.Truncate(windowSize),
				End:   event.Timestamp.Truncate(windowSize).Add(windowSize),
			}
			currentCluster = EventCluster{
				ID:            fmt.Sprintf("cluster-%d", currentWindow.Start.Unix()),
				TimeWindow:    currentWindow,
				Events:        make([]MonitoredEvent, 0),
				LogErrors:     make([]LogError, 0),
				AffectedPods:  make([]string, 0),
				AffectedNodes: make([]string, 0),
				HTTPErrorCodes: make(map[int]int),
			}
		}

		currentCluster.Events = append(currentCluster.Events, event)
		ec.addAffectedResources(&currentCluster, event)
	}

	// Process log errors
	for _, logError := range logErrors {
		// Check if error falls in current window
		if logError.Timestamp.Before(currentWindow.Start) || logError.Timestamp.After(currentWindow.End) {
			// Save current cluster and start new one
			if len(currentCluster.Events) > 0 || len(currentCluster.LogErrors) > 0 {
				currentCluster.ID = fmt.Sprintf("cluster-%d", currentWindow.Start.Unix())
				clusters = append(clusters, currentCluster)
			}

			// Start new window
			currentWindow = TimeWindow{
				Start: logError.Timestamp.Truncate(windowSize),
				End:   logError.Timestamp.Truncate(windowSize).Add(windowSize),
			}
			currentCluster = EventCluster{
				ID:            fmt.Sprintf("cluster-%d", currentWindow.Start.Unix()),
				TimeWindow:    currentWindow,
				Events:        make([]MonitoredEvent, 0),
				LogErrors:     make([]LogError, 0),
				AffectedPods:  make([]string, 0),
				AffectedNodes: make([]string, 0),
				HTTPErrorCodes: make(map[int]int),
			}
		}

		currentCluster.LogErrors = append(currentCluster.LogErrors, logError)
		ec.addAffectedResourcesFromLogError(&currentCluster, logError)
	}

	// Add final cluster
	if len(currentCluster.Events) > 0 || len(currentCluster.LogErrors) > 0 {
		currentCluster.ID = fmt.Sprintf("cluster-%d", currentWindow.Start.Unix())
		clusters = append(clusters, currentCluster)
	}

	return clusters
}

// addAffectedResources adds affected pods/nodes to cluster
func (ec *EventCorrelator) addAffectedResources(cluster *EventCluster, event MonitoredEvent) {
	// Extract pod name from resource
	if event.Namespace != "" && event.Resource != "" {
		if podName := ec.extractPodName(event.Resource); podName != "" {
			key := fmt.Sprintf("%s/%s", event.Namespace, podName)
			if !contains(cluster.AffectedPods, key) {
				cluster.AffectedPods = append(cluster.AffectedPods, key)
			}
		}
	}

	// Extract node name
	if event.Resource != "" && (event.Category == "node_unavailable" || event.Category == "node_ready") {
		if nodeName := ec.extractNodeName(event.Resource); nodeName != "" {
			if !contains(cluster.AffectedNodes, nodeName) {
				cluster.AffectedNodes = append(cluster.AffectedNodes, nodeName)
			}
		}
	}
}

// addAffectedResourcesFromLogError adds affected pods from log error
func (ec *EventCorrelator) addAffectedResourcesFromLogError(cluster *EventCluster, logError LogError) {
	key := fmt.Sprintf("%s/%s", logError.Namespace, logError.Pod)
	if !contains(cluster.AffectedPods, key) {
		cluster.AffectedPods = append(cluster.AffectedPods, key)
	}
}

// extractPodName extracts pod name from resource string like "Pod/my-pod"
func (ec *EventCorrelator) extractPodName(resource string) string {
	if len(resource) > 4 && resource[:4] == "Pod/" {
		return resource[4:]
	}
	return ""
}

// extractNodeName extracts node name from resource string
func (ec *EventCorrelator) extractNodeName(resource string) string {
	if len(resource) > 5 && resource[:5] == "Node/" {
		return resource[5:]
	}
	return ""
}

// detectCorrelations detects correlations between events in a cluster
func (ec *EventCorrelator) detectCorrelations(cluster EventCluster, allEvents []MonitoredEvent, allLogErrors []LogError) []EventCorrelation {
	correlations := make([]EventCorrelation, 0)

	// Check for HPA max + HTTP errors correlation
	if ec.hasHPAMaxEvents(cluster) && ec.hasHTTPErrors(cluster) {
		correlations = append(correlations, EventCorrelation{
			Type:        "hpa_max_errors",
			Description: "HPA reached maximum replicas while HTTP errors occurred - possible capacity issue",
			Confidence:  0.85,
			Events:      ec.getEventIDs(cluster.Events, "hpa_scaled"),
			Timestamp:   cluster.TimeWindow.Start,
		})
	}

	// Check for OOM + pod restarts correlation
	if ec.hasOOMEvents(cluster) && ec.hasPodRestarts(cluster) {
		correlations = append(correlations, EventCorrelation{
			Type:        "oom_restarts",
			Description: "Out of Memory errors followed by pod restarts - memory pressure detected",
			Confidence:  0.90,
			Events:      ec.getEventIDs(cluster.Events, "pod_restarted", "pod_crash_loop"),
			Timestamp:   cluster.TimeWindow.Start,
		})
	}

	// Check for node scale down + errors correlation
	if ec.hasNodeScaleDown(cluster) && (ec.hasHTTPErrors(cluster) || ec.hasPodRestarts(cluster)) {
		correlations = append(correlations, EventCorrelation{
			Type:        "node_scale_errors",
			Description: "Node scaled down while errors occurred - possible node failure impact",
			Confidence:  0.80,
			Events:      ec.getEventIDs(cluster.Events, "node_unavailable"),
			Timestamp:   cluster.TimeWindow.Start,
		})
	}

	// Check for deployment scaling + errors correlation
	if ec.hasDeploymentScaling(cluster) && ec.hasHTTPErrors(cluster) {
		correlations = append(correlations, EventCorrelation{
			Type:        "scaling_errors",
			Description: "Deployment scaling occurred during HTTP errors - possible scaling-related issues",
			Confidence:  0.75,
			Events:      ec.getEventIDs(cluster.Events, "deployment_scaled", "statefulset_scaled"),
			Timestamp:   cluster.TimeWindow.Start,
		})
	}

	// Check for pod unhealthy + HTTP errors correlation
	if ec.hasPodUnhealthy(cluster) && ec.hasHTTPErrors(cluster) {
		correlations = append(correlations, EventCorrelation{
			Type:        "unhealthy_errors",
			Description: "Pods marked unhealthy while HTTP errors occurred - health check failures",
			Confidence:  0.85,
			Events:      ec.getEventIDs(cluster.Events, "pod_unhealthy"),
			Timestamp:   cluster.TimeWindow.Start,
		})
	}

	// Check for high HTTP 5xx error rate
	if ec.hasHigh5xxRate(cluster) {
		correlations = append(correlations, EventCorrelation{
			Type:        "high_5xx_rate",
			Description: fmt.Sprintf("High rate of 5xx errors (%d errors) - server-side issues detected", ec.count5xxErrors(cluster)),
			Confidence:  0.90,
			Events:      ec.getLogErrorIDs(cluster.LogErrors),
			Timestamp:   cluster.TimeWindow.Start,
		})
	}

	return correlations
}

// Helper functions for correlation detection
func (ec *EventCorrelator) hasHPAMaxEvents(cluster EventCluster) bool {
	for _, event := range cluster.Events {
		if event.Category == "hpa_scaled" {
			// Check if HPA is at max (would need to query HPA status, but for now check event details)
			if maxReplicas, ok := event.Details["maxReplicas"].(float64); ok {
				if currentReplicas, ok := event.Details["currentReplicas"].(float64); ok {
					if currentReplicas >= maxReplicas {
						return true
					}
				}
			}
		}
	}
	return false
}

func (ec *EventCorrelator) hasHTTPErrors(cluster EventCluster) bool {
	return len(cluster.LogErrors) > 0
}

func (ec *EventCorrelator) hasOOMEvents(cluster EventCluster) bool {
	for _, event := range cluster.Events {
		if event.Category == "memory_error" || event.Description != "" && containsString(event.Description, "out of memory") {
			return true
		}
	}
	for _, logError := range cluster.LogErrors {
		if logError.ErrorType == "memory_error" {
			return true
		}
	}
	return false
}

func (ec *EventCorrelator) hasPodRestarts(cluster EventCluster) bool {
	for _, event := range cluster.Events {
		if event.Category == "pod_restarted" || event.Category == "pod_crash_loop" {
			return true
		}
	}
	return false
}

func (ec *EventCorrelator) hasNodeScaleDown(cluster EventCluster) bool {
	for _, event := range cluster.Events {
		if event.Category == "node_unavailable" {
			return true
		}
	}
	return false
}

func (ec *EventCorrelator) hasDeploymentScaling(cluster EventCluster) bool {
	for _, event := range cluster.Events {
		if event.Category == "deployment_scaled" || event.Category == "statefulset_scaled" {
			return true
		}
	}
	return false
}

func (ec *EventCorrelator) hasPodUnhealthy(cluster EventCluster) bool {
	for _, event := range cluster.Events {
		if event.Category == "pod_unhealthy" {
			return true
		}
	}
	return false
}

func (ec *EventCorrelator) hasHigh5xxRate(cluster EventCluster) bool {
	count := ec.count5xxErrors(cluster)
	return count >= 10 // Threshold: 10+ 5xx errors in the time window
}

func (ec *EventCorrelator) count5xxErrors(cluster EventCluster) int {
	count := 0
	for _, logError := range cluster.LogErrors {
		if logError.StatusCode >= 500 {
			count++
		}
	}
	return count
}

func (ec *EventCorrelator) getEventIDs(events []MonitoredEvent, categories ...string) []string {
	ids := make([]string, 0)
	for _, event := range events {
		for _, cat := range categories {
			if event.Category == cat {
				ids = append(ids, event.ID)
				break
			}
		}
	}
	return ids
}

func (ec *EventCorrelator) getLogErrorIDs(logErrors []LogError) []string {
	ids := make([]string, 0)
	for _, logError := range logErrors {
		ids = append(ids, fmt.Sprintf("log-%s-%s-%d", logError.Pod, logError.Container, logError.Timestamp.Unix()))
	}
	return ids
}

// generateSummary generates a human-readable summary of the cluster
func (ec *EventCorrelator) generateSummary(cluster EventCluster) string {
	parts := make([]string, 0)

	if len(cluster.Events) > 0 {
		parts = append(parts, fmt.Sprintf("%d events", len(cluster.Events)))
	}
	if len(cluster.LogErrors) > 0 {
		parts = append(parts, fmt.Sprintf("%d HTTP errors", len(cluster.LogErrors)))
	}
	if len(cluster.AffectedPods) > 0 {
		parts = append(parts, fmt.Sprintf("%d pods affected", len(cluster.AffectedPods)))
	}
	if len(cluster.AffectedNodes) > 0 {
		parts = append(parts, fmt.Sprintf("%d nodes affected", len(cluster.AffectedNodes)))
	}

	if len(parts) == 0 {
		return "No events"
	}

	return fmt.Sprintf("%s between %s and %s", joinStrings(parts, ", "),
		cluster.TimeWindow.Start.Format("15:04:05"),
		cluster.TimeWindow.End.Format("15:04:05"))
}

// determineClusterSeverity determines the overall severity of a cluster
func (ec *EventCorrelator) determineClusterSeverity(cluster EventCluster) EventSeverity {
	// Check for critical events
	for _, event := range cluster.Events {
		if event.Severity == EventSeverityCritical {
			return EventSeverityCritical
		}
	}

	// Check for critical HTTP errors
	for _, logError := range cluster.LogErrors {
		if logError.StatusCode == 500 || logError.StatusCode == 502 {
			return EventSeverityCritical
		}
	}

	// Check for high severity events
	for _, event := range cluster.Events {
		if event.Severity == EventSeverityHigh {
			return EventSeverityHigh
		}
	}

	// Check for high HTTP error rate
	if ec.hasHigh5xxRate(cluster) {
		return EventSeverityHigh
	}

	// Default to medium
	return EventSeverityMedium
}

// identifyRootCause attempts to identify the root cause
func (ec *EventCorrelator) identifyRootCause(cluster EventCluster) string {
	// Check correlations first
	if len(cluster.Correlations) > 0 {
		// Return the highest confidence correlation
		highest := cluster.Correlations[0]
		for _, corr := range cluster.Correlations {
			if corr.Confidence > highest.Confidence {
				highest = corr
			}
		}
		return highest.Description
	}

	// Check for specific patterns
	if ec.hasOOMEvents(cluster) {
		return "Memory pressure causing OOM kills"
	}
	if ec.hasHigh5xxRate(cluster) {
		return "High rate of server errors (5xx)"
	}
	if ec.hasPodUnhealthy(cluster) {
		return "Pod health check failures"
	}
	if ec.hasNodeScaleDown(cluster) {
		return "Node unavailability"
	}

	return "Multiple issues detected"
}

// aggregateHTTPErrors aggregates HTTP errors by status code
func (ec *EventCorrelator) aggregateHTTPErrors(logErrors []LogError) map[int]int {
	aggregated := make(map[int]int)
	for _, logError := range logErrors {
		if logError.StatusCode > 0 {
			aggregated[logError.StatusCode]++
		}
	}
	return aggregated
}

// Helper functions
func contains(slice []string, item string) bool {
	for _, s := range slice {
		if s == item {
			return true
		}
	}
	return false
}

func containsString(s, substr string) bool {
	return len(s) >= len(substr) && (s == substr || len(s) > len(substr) && (s[:len(substr)] == substr || s[len(s)-len(substr):] == substr || containsInMiddle(s, substr)))
}

func containsInMiddle(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}

func joinStrings(strs []string, sep string) string {
	if len(strs) == 0 {
		return ""
	}
	if len(strs) == 1 {
		return strs[0]
	}
	result := strs[0]
	for i := 1; i < len(strs); i++ {
		result += sep + strs[i]
	}
	return result
}

// CheckHPAStatus checks if HPA is at max replicas
func (ec *EventCorrelator) CheckHPAStatus(ctx context.Context, namespace, name string) (bool, int32, int32, error) {
	if ec.app.clientset == nil {
		return false, 0, 0, fmt.Errorf("cluster not connected")
	}

	hpa, err := ec.app.clientset.AutoscalingV2().HorizontalPodAutoscalers(namespace).Get(ctx, name, metav1.GetOptions{})
	if err != nil {
		return false, 0, 0, err
	}

	maxReplicas := int32(1)
	if hpa.Spec.MaxReplicas > 0 {
		maxReplicas = hpa.Spec.MaxReplicas
	}

	currentReplicas := hpa.Status.CurrentReplicas

	return currentReplicas >= maxReplicas, currentReplicas, maxReplicas, nil
}

