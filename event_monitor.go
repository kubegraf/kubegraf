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
	"bufio"
	"context"
	"fmt"
	"log"
	"regexp"
	"sort"
	"strings"
	"sync"
	"time"

	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/watch"
)

// EventSeverity represents the severity of an event
type EventSeverity string

const (
	EventSeverityCritical EventSeverity = "critical"
	EventSeverityHigh     EventSeverity = "high"
	EventSeverityMedium   EventSeverity = "medium"
	EventSeverityLow      EventSeverity = "low"
	EventSeverityInfo     EventSeverity = "info"
)

// MonitoredEvent represents a monitored event with enhanced information
type MonitoredEvent struct {
	ID          string                 `json:"id"`
	Timestamp   time.Time              `json:"timestamp"`
	Type        string                 `json:"type"`        // "infrastructure", "application", "security"
	Category    string                 `json:"category"`    // "node_scaled", "pod_restarted", "http_error", etc.
	Severity    EventSeverity          `json:"severity"`
	Title       string                 `json:"title"`
	Description string                 `json:"description"`
	Namespace   string                 `json:"namespace"`
	Resource    string                 `json:"resource"`     // "Node/node-1", "Pod/my-pod", etc.
	Details     map[string]interface{} `json:"details"`
	Count       int                    `json:"count"`       // Number of occurrences
	GroupID     string                 `json:"group_id"`    // For grouping related events
	Source      string                 `json:"source"`      // "kubernetes", "log_parser", etc.
}

// LogError represents an HTTP error extracted from logs
type LogError struct {
	Timestamp   time.Time `json:"timestamp"`
	Pod         string    `json:"pod"`
	Namespace   string    `json:"namespace"`
	Container   string    `json:"container"`
	StatusCode  int       `json:"status_code"`
	Method      string    `json:"method"`
	Path        string    `json:"path"`
	Message     string    `json:"message"`
	ErrorType   string    `json:"error_type"` // "http_500", "http_502", "failed_post", etc.
}

// EventMonitor monitors Kubernetes events and pod logs for issues
type EventMonitor struct {
	app              *App
	monitoredEvents  []MonitoredEvent
	mu               sync.RWMutex
	maxEvents        int
	logErrors        []LogError
	logErrorsMu      sync.RWMutex
	maxLogErrors     int
	stopCh           chan struct{}
	eventCallbacks   []func(MonitoredEvent)
	httpErrorPatterns []*regexp.Regexp
	correlator       *EventCorrelator
	eventStorage     *EventStorage
}

// NewEventMonitor creates a new event monitor
func NewEventMonitor(app *App) *EventMonitor {
	// Multiple patterns to match HTTP errors in various log formats
	httpErrorPatterns := []*regexp.Regexp{
		// Pattern 1: "POST /api/users 500" or "GET /api/data 502"
		regexp.MustCompile(`(?i)(GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS)\s+([^\s]+)\s+(\d{3})`),
		// Pattern 2: "HTTP/1.1 500" or "HTTP/2 502"
		regexp.MustCompile(`(?i)HTTP/[0-9.]+?\s+(\d{3})`),
		// Pattern 3: "status=500" or "status_code=500" or "statusCode=500"
		regexp.MustCompile(`(?i)(?:status|status_code|statusCode)[=:]\s*(\d{3})`),
		// Pattern 4: JSON "status":500 or "statusCode":500
		regexp.MustCompile(`(?i)"status(?:Code)?"\s*:\s*(\d{3})`),
		// Pattern 5: "returned 500" or "returned status 500"
		regexp.MustCompile(`(?i)returned\s+(?:status\s+)?(\d{3})`),
		// Pattern 6: "500 Internal Server Error" or "502 Bad Gateway"
		regexp.MustCompile(`(?i)(\d{3})\s+(?:Internal Server Error|Bad Gateway|Service Unavailable|Gateway Timeout|Not Found|Forbidden|Unauthorized|Bad Request)`),
		// Pattern 7: Standalone status codes in HTTP context (avoid matching file line numbers)
		// Only match if preceded by HTTP-related keywords or followed by HTTP-related text
		regexp.MustCompile(`(?i)(?:HTTP|status|code|response|error|failed|returned).*?\b(4\d{2}|5\d{2})\b`),
	}

	return &EventMonitor{
		app:              app,
		monitoredEvents:  make([]MonitoredEvent, 0, 1000),
		maxEvents:       1000,
		logErrors:        make([]LogError, 0, 500),
		maxLogErrors:     500,
		stopCh:           make(chan struct{}),
		eventCallbacks:   make([]func(MonitoredEvent), 0),
		httpErrorPatterns: httpErrorPatterns,
		correlator:       NewEventCorrelator(app),
		eventStorage:     nil, // Will be set later if database is available
	}
}

// SetEventStorage sets the event storage for persistent storage
func (em *EventMonitor) SetEventStorage(storage *EventStorage) {
	em.mu.Lock()
	defer em.mu.Unlock()
	em.eventStorage = storage
}

// Start starts monitoring events and logs
func (em *EventMonitor) Start(ctx context.Context) {
	go em.watchKubernetesEvents(ctx)
	go em.scanPodLogs(ctx)
}

// fetchInitialEvents fetches existing Kubernetes events when starting
func (em *EventMonitor) fetchInitialEvents(ctx context.Context) {
	// Wait for cluster connection
	for i := 0; i < 30; i++ {
		if em.app.clientset != nil && em.app.connected {
			break
		}
		time.Sleep(2 * time.Second)
	}

	if em.app.clientset == nil || !em.app.connected {
		log.Printf("[EventMonitor] Cluster not connected, skipping initial event fetch")
		return
	}

	log.Printf("[EventMonitor] Fetching initial Kubernetes events...")
	
	// Fetch events from last hour
	since := time.Now().Add(-1 * time.Hour)
	events, err := em.app.clientset.CoreV1().Events("").List(ctx, metav1.ListOptions{})
	if err != nil {
		log.Printf("[EventMonitor] Error fetching initial events: %v", err)
		return
	}

	log.Printf("[EventMonitor] Found %d Kubernetes events, processing...", len(events.Items))
	
	count := 0
	for i := range events.Items {
		ev := &events.Items[i]
		// Only process recent events (last hour)
		if ev.LastTimestamp.Time.After(since) {
			em.processKubernetesEvent(ev)
			count++
		}
	}
	
	log.Printf("[EventMonitor] Processed %d recent events into monitored events", count)
}

// Stop stops monitoring
func (em *EventMonitor) Stop() {
	close(em.stopCh)
}

// RegisterCallback registers a callback for new events
func (em *EventMonitor) RegisterCallback(callback func(MonitoredEvent)) {
	em.mu.Lock()
	defer em.mu.Unlock()
	em.eventCallbacks = append(em.eventCallbacks, callback)
}

// watchKubernetesEvents watches Kubernetes events for important changes
func (em *EventMonitor) watchKubernetesEvents(ctx context.Context) {
	for {
		select {
		case <-em.stopCh:
			return
		case <-ctx.Done():
			return
		default:
			if em.app.clientset == nil || !em.app.connected {
				time.Sleep(5 * time.Second)
				continue
			}

			watcher, err := em.app.clientset.CoreV1().Events("").Watch(ctx, metav1.ListOptions{
				Watch: true,
			})
			if err != nil {
				fmt.Printf("Error watching events: %v\n", err)
				time.Sleep(10 * time.Second)
				continue
			}

			for watchEvent := range watcher.ResultChan() {
				if watchEvent.Type == watch.Added || watchEvent.Type == watch.Modified {
					if ev, ok := watchEvent.Object.(*corev1.Event); ok {
						em.processKubernetesEvent(ev)
					}
				}
			}
		}
	}
}

// processKubernetesEvent processes a Kubernetes event and creates a monitored event if important
func (em *EventMonitor) processKubernetesEvent(ev *corev1.Event) {
	// Determine if this is an important event
	monitoredEvent := em.analyzeEvent(ev)
	if monitoredEvent == nil {
		// Log skipped events for debugging (only first few to avoid spam)
		em.mu.RLock()
		eventCount := len(em.monitoredEvents)
		em.mu.RUnlock()
		if eventCount < 5 {
			log.Printf("[EventMonitor] Skipping event: %s/%s reason=%s type=%s", 
				ev.InvolvedObject.Kind, ev.InvolvedObject.Name, ev.Reason, ev.Type)
		}
		return
	}

	log.Printf("[EventMonitor] Processing event: %s - %s", monitoredEvent.Title, monitoredEvent.Category)

	// Add to monitored events
	em.mu.Lock()
	em.monitoredEvents = append(em.monitoredEvents, *monitoredEvent)
	if len(em.monitoredEvents) > em.maxEvents {
		em.monitoredEvents = em.monitoredEvents[len(em.monitoredEvents)-em.maxEvents:]
	}
	storage := em.eventStorage
	em.mu.Unlock()
	
	// Store in database if available
	if storage != nil {
		go storage.StoreMonitoredEvent(monitoredEvent)
	}

	// Trigger callbacks
	em.mu.RLock()
	callbacks := make([]func(MonitoredEvent), len(em.eventCallbacks))
	copy(callbacks, em.eventCallbacks)
	em.mu.RUnlock()

	for _, callback := range callbacks {
		go callback(*monitoredEvent)
	}
}

// analyzeEvent analyzes a Kubernetes event and determines if it should be monitored
func (em *EventMonitor) analyzeEvent(ev *corev1.Event) *MonitoredEvent {
	reason := ev.Reason
	kind := ev.InvolvedObject.Kind
	eventType := ev.Type

	// Track important events
	var category string
	var severity EventSeverity
	var title string
	var description string

	// Node events
	if kind == "Node" {
		if reason == "NodeNotReady" || reason == "NodeUnreachable" {
			category = "node_unavailable"
			severity = EventSeverityCritical
			title = fmt.Sprintf("Node %s is unavailable", ev.InvolvedObject.Name)
			description = ev.Message
		} else if reason == "NodeReady" {
			category = "node_ready"
			severity = EventSeverityInfo
			title = fmt.Sprintf("Node %s is ready", ev.InvolvedObject.Name)
			description = ev.Message
		}
	}

	// Pod events
	if kind == "Pod" {
		if reason == "Failed" || reason == "FailedCreatePodSandbox" {
			category = "pod_failed"
			severity = EventSeverityHigh
			title = fmt.Sprintf("Pod %s failed", ev.InvolvedObject.Name)
			description = ev.Message
		} else if reason == "Killing" {
			category = "pod_killed"
			severity = EventSeverityMedium
			title = fmt.Sprintf("Pod %s is being killed", ev.InvolvedObject.Name)
			description = ev.Message
		} else if reason == "Unhealthy" {
			category = "pod_unhealthy"
			severity = EventSeverityHigh
			title = fmt.Sprintf("Pod %s is unhealthy", ev.InvolvedObject.Name)
			description = ev.Message
		} else if reason == "BackOff" || reason == "CrashLoopBackOff" {
			category = "pod_crash_loop"
			severity = EventSeverityCritical
			title = fmt.Sprintf("Pod %s in crash loop", ev.InvolvedObject.Name)
			description = ev.Message
			
			// Check for OOM in the message
			if strings.Contains(strings.ToLower(ev.Message), "oom") || strings.Contains(strings.ToLower(ev.Message), "out of memory") {
				category = "pod_oom_restart"
				title = fmt.Sprintf("Pod %s OOM killed and restarting", ev.InvolvedObject.Name)
				description = fmt.Sprintf("Out of Memory: %s", ev.Message)
			}
		} else if reason == "Started" {
			category = "pod_restarted"
			severity = EventSeverityMedium
			title = fmt.Sprintf("Pod %s restarted", ev.InvolvedObject.Name)
			description = ev.Message
			
			// Check if this is an OOM-related restart
			if strings.Contains(strings.ToLower(ev.Message), "oom") || strings.Contains(strings.ToLower(ev.Message), "out of memory") {
				category = "pod_oom_restart"
				severity = EventSeverityHigh
				title = fmt.Sprintf("Pod %s restarted after OOM kill", ev.InvolvedObject.Name)
				description = fmt.Sprintf("OOM Kill: %s", ev.Message)
			}
		}
	}

	// Deployment/ReplicaSet events (scaling)
	if kind == "Deployment" || kind == "ReplicaSet" {
		if strings.Contains(reason, "ScalingReplicaSet") {
			category = "deployment_scaled"
			severity = EventSeverityMedium
			title = fmt.Sprintf("%s %s scaled", kind, ev.InvolvedObject.Name)
			description = ev.Message
		}
	}

	// HPA events
	if kind == "HorizontalPodAutoscaler" {
		if strings.Contains(reason, "SuccessfulRescale") {
			category = "hpa_scaled"
			severity = EventSeverityMedium
			title = fmt.Sprintf("HPA %s scaled", ev.InvolvedObject.Name)
			description = ev.Message
		}
	}

	// StatefulSet events
	if kind == "StatefulSet" {
		if strings.Contains(reason, "SuccessfulCreate") || strings.Contains(reason, "SuccessfulDelete") {
			category = "statefulset_scaled"
			severity = EventSeverityMedium
			title = fmt.Sprintf("StatefulSet %s scaled", ev.InvolvedObject.Name)
			description = ev.Message
		}
	}

	// If no specific category matched, create a generic event for Warning/Error types
	if category == "" {
		if eventType == "Warning" {
			// Capture all Warning events as they might be important
			category = "kubernetes_warning"
			severity = EventSeverityMedium
			title = fmt.Sprintf("%s %s: %s", kind, ev.InvolvedObject.Name, reason)
			description = ev.Message
		} else if eventType == "Normal" {
			// For Normal events, only capture important ones
			// Check if it's a significant action
			significantReasons := []string{"Created", "Deleted", "Scaled", "Updated", "Scheduled", "Pulled", "Started"}
			for _, sigReason := range significantReasons {
				if strings.Contains(reason, sigReason) {
					category = "kubernetes_action"
					severity = EventSeverityInfo
					title = fmt.Sprintf("%s %s: %s", kind, ev.InvolvedObject.Name, reason)
					description = ev.Message
					break
				}
			}
			// If still no category, skip this event
			if category == "" {
				return nil
			}
		} else {
			// Unknown event type, skip
			return nil
		}
	}

		// Determine severity based on event type if not already set
		if severity == "" {
			if eventType == "Warning" {
				severity = EventSeverityHigh
			} else {
				severity = EventSeverityInfo
			}
		}

	timestamp := ev.LastTimestamp.Time
	if timestamp.IsZero() {
		timestamp = ev.EventTime.Time
	}
	if timestamp.IsZero() {
		timestamp = time.Now()
	}

	details := map[string]interface{}{
		"reason":      reason,
		"event_type":  eventType,
		"count":       ev.Count,
		"first_seen":  ev.FirstTimestamp.Time,
		"source":      ev.Source.Component,
		"action":      ev.Action,
	}

	// For HPA events, check if at max replicas (async to avoid blocking)
	if kind == "HorizontalPodAutoscaler" && category == "hpa_scaled" {
		go func() {
			if em.app.clientset != nil && em.app.connected {
				ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
				defer cancel()
				
				hpa, err := em.app.clientset.AutoscalingV2().HorizontalPodAutoscalers(ev.Namespace).Get(ctx, ev.InvolvedObject.Name, metav1.GetOptions{})
				if err == nil {
					maxReplicas := hpa.Spec.MaxReplicas
					if maxReplicas == 0 {
						maxReplicas = 1
					}
					currentReplicas := hpa.Status.CurrentReplicas
					
					// Update event if at max
					em.mu.Lock()
					eventID := fmt.Sprintf("%s-%s-%d", kind, ev.InvolvedObject.Name, timestamp.Unix())
					for i := range em.monitoredEvents {
						if em.monitoredEvents[i].ID == eventID {
							if currentReplicas >= maxReplicas {
								em.monitoredEvents[i].Severity = EventSeverityHigh
								em.monitoredEvents[i].Title = fmt.Sprintf("HPA %s at MAX replicas (%d/%d)", ev.InvolvedObject.Name, currentReplicas, maxReplicas)
								em.monitoredEvents[i].Description = fmt.Sprintf("HPA reached maximum capacity. %s", ev.Message)
							}
							em.monitoredEvents[i].Details["maxReplicas"] = maxReplicas
							em.monitoredEvents[i].Details["currentReplicas"] = currentReplicas
							em.monitoredEvents[i].Details["minReplicas"] = hpa.Spec.MinReplicas
							em.monitoredEvents[i].Details["targetReplicas"] = hpa.Status.DesiredReplicas
							break
						}
					}
					em.mu.Unlock()
				}
			}
		}()
	}

	return &MonitoredEvent{
		ID:          fmt.Sprintf("%s-%s-%d", kind, ev.InvolvedObject.Name, timestamp.Unix()),
		Timestamp:   timestamp,
		Type:        "infrastructure",
		Category:    category,
		Severity:    severity,
		Title:       title,
		Description: description,
		Namespace:   ev.Namespace,
		Resource:    fmt.Sprintf("%s/%s", kind, ev.InvolvedObject.Name),
		Details:     details,
		Count:       int(ev.Count),
		GroupID:     em.generateGroupID(category, ev.Namespace, ev.InvolvedObject.Kind, ev.InvolvedObject.Name),
		Source:      "kubernetes",
	}
}

// generateGroupID generates a group ID for related events
func (em *EventMonitor) generateGroupID(category, namespace, kind, name string) string {
	return fmt.Sprintf("%s-%s-%s-%s", category, namespace, kind, name)
}

// scanPodLogs periodically scans pod logs for HTTP errors
func (em *EventMonitor) scanPodLogs(ctx context.Context) {
	ticker := time.NewTicker(30 * time.Second) // Scan every 30 seconds
	defer ticker.Stop()

	for {
		select {
		case <-em.stopCh:
			return
		case <-ctx.Done():
			return
		case <-ticker.C:
			if em.app.clientset == nil || !em.app.connected {
				continue
			}
			em.scanAllPods(ctx)
		}
	}
}

// scanAllPods scans logs from all pods for HTTP errors
func (em *EventMonitor) scanAllPods(ctx context.Context) {
	namespaces, err := em.app.clientset.CoreV1().Namespaces().List(ctx, metav1.ListOptions{})
	if err != nil {
		return
	}

	scannedPods := 0
	scannedContainers := 0
	
	for _, ns := range namespaces.Items {
		// Skip only system namespaces for performance, but include default namespace
		if strings.HasPrefix(ns.Name, "kube-") {
			continue
		}

		pods, err := em.app.clientset.CoreV1().Pods(ns.Name).List(ctx, metav1.ListOptions{
			Limit: 50, // Limit pods per namespace
		})
		if err != nil {
			log.Printf("[EventMonitor] Error listing pods in namespace %s: %v", ns.Name, err)
			continue
		}

		for _, pod := range pods.Items {
			// Only scan running pods
			if pod.Status.Phase != corev1.PodRunning {
				continue
			}

			scannedPods++
			for _, container := range pod.Spec.Containers {
				scannedContainers++
				em.scanPodContainerLogs(ctx, pod.Name, ns.Name, container.Name)
			}
		}
	}
	
	log.Printf("[EventMonitor] Scanned %d pods (%d containers) for log errors", scannedPods, scannedContainers)
}

// scanPodContainerLogs scans logs from a specific pod container
func (em *EventMonitor) scanPodContainerLogs(ctx context.Context, podName, namespace, containerName string) {
	// Get recent logs (last 200 lines, last 10 minutes for better coverage)
	req := em.app.clientset.CoreV1().Pods(namespace).GetLogs(podName, &corev1.PodLogOptions{
		Container: containerName,
		TailLines: int64Ptr(200),
		SinceTime: &metav1.Time{Time: time.Now().Add(-10 * time.Minute)}, // Last 10 minutes
	})

	stream, err := req.Stream(ctx)
	if err != nil {
		// Silently skip if we can't get logs (pod might be starting/stopping)
		return
	}
	defer stream.Close()

	linesScanned := 0
	errorsFound := 0
	
	scanner := bufio.NewScanner(stream)
	for scanner.Scan() {
		line := scanner.Text()
		linesScanned++
		logError := em.parseLogLine(line, podName, namespace, containerName)
		if logError != nil {
			errorsFound++
			em.processLogError(*logError)
		}
	}
	
	if errorsFound > 0 {
		log.Printf("[EventMonitor] Found %d log errors in %s/%s/%s (scanned %d lines)", 
			errorsFound, namespace, podName, containerName, linesScanned)
	}
}

// parseLogLine parses a log line for HTTP errors
func (em *EventMonitor) parseLogLine(line, podName, namespace, containerName string) *LogError {
	// Try to extract timestamp from log line (common formats)
	var logTime time.Time
	now := time.Now()

	// Try common timestamp formats
	timestampPatterns := []string{
		time.RFC3339,
		time.RFC3339Nano,
		"2006-01-02T15:04:05.000Z",
		"2006-01-02 15:04:05",
	}

	for _, pattern := range timestampPatterns {
		if idx := strings.Index(line, " "); idx > 0 {
			if t, err := time.Parse(pattern, line[:idx]); err == nil {
				logTime = t
				line = line[idx+1:]
				break
			}
		}
	}

	if logTime.IsZero() {
		logTime = now
	}

	// Check for HTTP errors using multiple patterns
	var method string
	var path string
	var statusCodeInt int
	var found bool
	
	// Try each pattern in order
	for i, pattern := range em.httpErrorPatterns {
		matches := pattern.FindStringSubmatch(line)
		if len(matches) > 0 {
			// Pattern 1: Method /path 500 (matches[1]=method, matches[2]=path, matches[3]=status)
			if i == 0 && len(matches) >= 4 {
				method = strings.ToUpper(matches[1])
				path = matches[2]
				fmt.Sscanf(matches[3], "%d", &statusCodeInt)
				found = true
				break
			}
			// Patterns 2-6: Extract status code from different positions
			if i >= 1 && i <= 5 && len(matches) >= 2 {
				fmt.Sscanf(matches[1], "%d", &statusCodeInt)
				found = true
				// Try to extract method and path from the line
				methodMatch := regexp.MustCompile(`(?i)(GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS)`).FindString(line)
				if methodMatch != "" {
					method = strings.ToUpper(methodMatch)
				} else {
					method = "UNKNOWN"
				}
				pathMatch := regexp.MustCompile(`(?i)(?:GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS)\s+([^\s]+)`).FindStringSubmatch(line)
				if len(pathMatch) >= 2 {
					path = pathMatch[1]
				} else {
					path = "/"
				}
				break
			}
			// Pattern 7: Standalone status codes in HTTP context
			if i == 6 && len(matches) >= 2 {
				fmt.Sscanf(matches[1], "%d", &statusCodeInt)
				if statusCodeInt >= 400 {
					found = true
					// Try to extract method and path
					methodMatch := regexp.MustCompile(`(?i)(GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS)`).FindString(line)
					if methodMatch != "" {
						method = strings.ToUpper(methodMatch)
					} else {
						method = "UNKNOWN"
					}
					pathMatch := regexp.MustCompile(`(?i)(?:GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS)\s+([^\s]+)`).FindStringSubmatch(line)
					if len(pathMatch) >= 2 {
						path = pathMatch[1]
					} else {
						path = "/"
					}
					break
				}
			}
		}
	}
	
	// Only track valid HTTP status codes (100-599)
	// Filter out invalid codes like 456 (not a real HTTP status code)
	validHTTPStatusCodes := map[int]bool{
		// 1xx: Informational
		100: true, 101: true, 102: true, 103: true,
		// 2xx: Success
		200: true, 201: true, 202: true, 203: true, 204: true, 205: true, 206: true, 207: true, 208: true, 226: true,
		// 3xx: Redirection
		300: true, 301: true, 302: true, 303: true, 304: true, 305: true, 307: true, 308: true,
		// 4xx: Client Error
		400: true, 401: true, 402: true, 403: true, 404: true, 405: true, 406: true, 407: true, 408: true, 409: true,
		410: true, 411: true, 412: true, 413: true, 414: true, 415: true, 416: true, 417: true, 418: true, 421: true,
		422: true, 423: true, 424: true, 425: true, 426: true, 428: true, 429: true, 431: true, 451: true,
		// 5xx: Server Error
		500: true, 501: true, 502: true, 503: true, 504: true, 505: true, 506: true, 507: true, 508: true, 510: true, 511: true,
	}
	
	// Only track valid 4xx and 5xx error codes
	if found && statusCodeInt >= 400 && statusCodeInt <= 599 {
		// Validate it's a real HTTP status code
		if !validHTTPStatusCodes[statusCodeInt] {
			// Skip invalid codes like 456 (matches file line numbers)
			return nil
		}
		
		errorType := "http_error"
		if statusCodeInt == 500 {
			errorType = "http_500"
		} else if statusCodeInt == 502 {
			errorType = "http_502"
		} else if statusCodeInt == 503 {
			errorType = "http_503"
		} else if method == "POST" && statusCodeInt >= 400 {
			errorType = "failed_post"
		}

		return &LogError{
			Timestamp:  logTime,
			Pod:        podName,
			Namespace:  namespace,
			Container:  containerName,
			StatusCode: statusCodeInt,
			Method:     method,
			Path:       path,
			Message:    line,
			ErrorType:  errorType,
		}
	}

	// Check for common error patterns
	errorPatterns := []struct {
		pattern   string
		errorType string
		priority  int // Higher priority patterns checked first
	}{
		{"(?i)out of memory|oom|killed.*memory", "memory_error", 3}, // Highest priority
		{"(?i)timeout", "timeout_error", 2},
		{"(?i)connection.*refused|connection.*reset", "connection_error", 2},
		{"(?i)error|exception|failed|failure", "application_error", 1}, // Lower priority
	}

	// Sort by priority (highest first)
	sort.Slice(errorPatterns, func(i, j int) bool {
		return errorPatterns[i].priority > errorPatterns[j].priority
	})

	for _, ep := range errorPatterns {
		if matched, _ := regexp.MatchString(ep.pattern, line); matched {
			// Always create error for high-priority patterns, or significant low-priority ones
			if ep.priority >= 2 || ep.errorType == "application_error" || ep.errorType == "timeout_error" {
				// For non-HTTP errors, create a monitored event instead of a log error
				// LogError is specifically for HTTP errors
				return nil // Don't create LogError for non-HTTP errors
			}
		}
	}

	return nil
}

// GetMonitoredEvents returns all monitored events (thread-safe)
func (em *EventMonitor) GetMonitoredEvents() []MonitoredEvent {
	em.mu.RLock()
	defer em.mu.RUnlock()
	
	// Return a copy to avoid race conditions
	events := make([]MonitoredEvent, len(em.monitoredEvents))
	copy(events, em.monitoredEvents)
	return events
}

// GetLogErrorsSimple returns all log errors without filtering (for MCP compatibility)
func (em *EventMonitor) GetLogErrorsSimple() []LogError {
	em.logErrorsMu.RLock()
	defer em.logErrorsMu.RUnlock()
	
	// Return a copy to avoid race conditions
	errors := make([]LogError, len(em.logErrors))
	copy(errors, em.logErrors)
	return errors
}

// processLogError processes a log error and creates a monitored event
func (em *EventMonitor) processLogError(logError LogError) {
	// Only process HTTP errors (status code > 0)
	if logError.StatusCode == 0 {
		return
	}

	// Add to log errors
	em.logErrorsMu.Lock()
	em.logErrors = append(em.logErrors, logError)
	if len(em.logErrors) > em.maxLogErrors {
		em.logErrors = em.logErrors[len(em.logErrors)-em.maxLogErrors:]
	}
	storage := em.eventStorage
	em.logErrorsMu.Unlock()
	
	// Store in database if available
	if storage != nil {
		go storage.StoreLogError(&logError)
	}

	// Determine severity
	severity := EventSeverityMedium
	if logError.StatusCode >= 500 {
		severity = EventSeverityHigh
	}
	if logError.ErrorType == "http_500" || logError.ErrorType == "http_502" {
		severity = EventSeverityCritical
	}

	// Create monitored event
	monitoredEvent := MonitoredEvent{
		ID:          fmt.Sprintf("log-%s-%s-%d", logError.Pod, logError.Container, logError.Timestamp.Unix()),
		Timestamp:   logError.Timestamp,
		Type:        "application",
		Category:    logError.ErrorType,
		Severity:    severity,
		Title:       fmt.Sprintf("HTTP %d error in %s", logError.StatusCode, logError.Pod),
		Description: fmt.Sprintf("%s %s returned %d", logError.Method, logError.Path, logError.StatusCode),
		Namespace:   logError.Namespace,
		Resource:    fmt.Sprintf("Pod/%s", logError.Pod),
		Details: map[string]interface{}{
			"method":      logError.Method,
			"path":        logError.Path,
			"status_code": logError.StatusCode,
			"container":   logError.Container,
			"message":     logError.Message,
		},
		Count:   1,
		GroupID: em.generateGroupID(logError.ErrorType, logError.Namespace, "Pod", logError.Pod),
		Source:  "log_parser",
	}

	// Add to monitored events
	em.mu.Lock()
	em.monitoredEvents = append(em.monitoredEvents, monitoredEvent)
	if len(em.monitoredEvents) > em.maxEvents {
		em.monitoredEvents = em.monitoredEvents[len(em.monitoredEvents)-em.maxEvents:]
	}
	em.mu.Unlock()

	// Trigger callbacks
	em.mu.RLock()
	callbacks := make([]func(MonitoredEvent), len(em.eventCallbacks))
	copy(callbacks, em.eventCallbacks)
	em.mu.RUnlock()

	for _, callback := range callbacks {
		go callback(monitoredEvent)
	}
}

// GetEvents returns all monitored events, optionally filtered
func (em *EventMonitor) GetEvents(filter FilterOptions) []MonitoredEvent {
	em.mu.RLock()
	defer em.mu.RUnlock()

	events := make([]MonitoredEvent, 0, len(em.monitoredEvents))

	for _, event := range em.monitoredEvents {
		if filter.Matches(event) {
			events = append(events, event)
		}
	}

	return events
}

// GetLogErrors returns all log errors, optionally filtered
func (em *EventMonitor) GetLogErrors(filter FilterOptions) []LogError {
	em.logErrorsMu.RLock()
	defer em.logErrorsMu.RUnlock()

	errors := make([]LogError, 0, len(em.logErrors))

	for _, logError := range em.logErrors {
		if filter.MatchesLogError(logError) {
			errors = append(errors, logError)
		}
	}

	return errors
}

// FilterOptions for filtering events
type FilterOptions struct {
	Type        string    `json:"type"`        // "infrastructure", "application", "security"
	Category    string    `json:"category"`   // Specific category
	Severity    string    `json:"severity"`    // "critical", "high", "medium", "low", "info"
	Namespace   string    `json:"namespace"`  // Specific namespace
	Since       time.Time `json:"since"`      // Events since this time
	Limit       int       `json:"limit"`       // Maximum number of events
}

// Matches checks if an event matches the filter
func (f FilterOptions) Matches(event MonitoredEvent) bool {
	if f.Type != "" && event.Type != f.Type {
		return false
	}
	if f.Category != "" && event.Category != f.Category {
		return false
	}
	if f.Severity != "" && string(event.Severity) != f.Severity {
		return false
	}
	if f.Namespace != "" && event.Namespace != f.Namespace {
		return false
	}
	if !f.Since.IsZero() && event.Timestamp.Before(f.Since) {
		return false
	}
	return true
}

// MatchesLogError checks if a log error matches the filter
func (f FilterOptions) MatchesLogError(logError LogError) bool {
	if f.Namespace != "" && logError.Namespace != f.Namespace {
		return false
	}
	if !f.Since.IsZero() && logError.Timestamp.Before(f.Since) {
		return false
	}
	return true
}

// GroupEventsByTime groups events by time periods
func GroupEventsByTime(events []MonitoredEvent, period time.Duration) map[string][]MonitoredEvent {
	groups := make(map[string][]MonitoredEvent)

	for _, event := range events {
		// Round timestamp to nearest period
		rounded := event.Timestamp.Truncate(period)
		key := rounded.Format(time.RFC3339)
		groups[key] = append(groups[key], event)
	}

	return groups
}

// Helper function
func int64Ptr(i int64) *int64 {
	return &i
}

