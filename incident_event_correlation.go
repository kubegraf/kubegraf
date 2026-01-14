// Copyright 2025 KubeGraf Contributors
// SPDX-License-Identifier: Apache-2.0

package main

import (
	"context"
	"fmt"
	"strings"
	"time"

	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// EnrichIncidentsWithEvents enriches incidents with correlated namespace-level Kubernetes events
// This function implements: kubectl get events -n namespace style correlation
func (scanner *IncidentScanner) EnrichIncidentsWithEvents(incidents []KubernetesIncident) []KubernetesIncident {
	if scanner.app.clientset == nil || !scanner.app.connected {
		return incidents
	}

	// Group incidents by namespace for efficient event fetching
	namespaceIncidents := make(map[string][]int) // namespace -> incident indices
	for i, incident := range incidents {
		if incident.Namespace != "" {
			namespaceIncidents[incident.Namespace] = append(namespaceIncidents[incident.Namespace], i)
		}
	}

	// Fetch and correlate events for each namespace
	for namespace, indices := range namespaceIncidents {
		// Check context cancellation
		select {
		case <-scanner.app.ctx.Done():
			return incidents
		default:
		}

		// Fetch namespace events (kubectl get events -n <namespace>)
		events, err := scanner.FetchNamespaceEvents(namespace)
		if err != nil {
			fmt.Printf("[EventCorrelation] Error fetching events for namespace %s: %v\n", namespace, err)
			continue
		}

		// Correlate events with each incident in this namespace
		for _, idx := range indices {
			incident := &incidents[idx]
			relatedEvents := scanner.CorrelateEventsWithIncident(incident, events)

			if len(relatedEvents) > 0 {
				incident.RelatedEvents = relatedEvents
				incident.EventSummary = scanner.GenerateEventSummary(relatedEvents)

				fmt.Printf("[EventCorrelation] Correlated %d events with incident %s (resource: %s)\n",
					len(relatedEvents), incident.ID, incident.ResourceName)
			}
		}
	}

	return incidents
}

// FetchNamespaceEvents fetches Kubernetes events for a namespace
// Implements: kubectl get events -n <namespace>
func (scanner *IncidentScanner) FetchNamespaceEvents(namespace string) ([]corev1.Event, error) {
	ctx := context.Background()

	// Fetch events from the last 30 minutes for correlation
	thirtyMinutesAgo := time.Now().Add(-30 * time.Minute)

	// List events in the namespace
	eventList, err := scanner.app.clientset.CoreV1().Events(namespace).List(ctx, metav1.ListOptions{
		// Get recent events for better correlation
		Limit: 1000,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to list events: %w", err)
	}

	// Filter to recent events
	var recentEvents []corev1.Event
	for _, event := range eventList.Items {
		if event.LastTimestamp.Time.After(thirtyMinutesAgo) || event.EventTime.Time.After(thirtyMinutesAgo) {
			recentEvents = append(recentEvents, event)
		}
	}

	fmt.Printf("[EventCorrelation] Fetched %d recent events for namespace %s (from %d total)\n",
		len(recentEvents), namespace, len(eventList.Items))

	return recentEvents, nil
}

// CorrelateEventsWithIncident correlates Kubernetes events with a specific incident
// Matches based on resource name, type, namespace, and timestamp proximity
func (scanner *IncidentScanner) CorrelateEventsWithIncident(incident *KubernetesIncident, events []corev1.Event) []RelatedEvent {
	var relatedEvents []RelatedEvent

	// Time window for correlation: events within 5 minutes of incident
	correlationWindow := 5 * time.Minute

	for _, event := range events {
		// Check if event is related to this incident's resource
		isRelated := false
		eventTime := event.LastTimestamp.Time
		if eventTime.IsZero() {
			eventTime = event.EventTime.Time
		}

		// Match by resource name and kind
		if event.InvolvedObject.Name == incident.ResourceName &&
			strings.EqualFold(event.InvolvedObject.Kind, incident.ResourceKind) {

			// Check timestamp proximity
			timeDiff := eventTime.Sub(incident.FirstSeen)
			if timeDiff < 0 {
				timeDiff = -timeDiff
			}

			if timeDiff <= correlationWindow {
				isRelated = true
			}
		}

		// Also correlate events that match incident type patterns
		if !isRelated {
			isRelated = scanner.matchesIncidentType(incident, event)
		}

		if isRelated {
			relatedEvent := RelatedEvent{
				Type:      event.Type,
				Reason:    event.Reason,
				Message:   event.Message,
				Count:     event.Count,
				FirstSeen: event.FirstTimestamp.Time,
				LastSeen:  event.LastTimestamp.Time,
				Source:    fmt.Sprintf("%s/%s", event.Source.Component, event.Source.Host),
			}

			// Use EventTime if timestamps are zero
			if relatedEvent.FirstSeen.IsZero() {
				relatedEvent.FirstSeen = event.EventTime.Time
			}
			if relatedEvent.LastSeen.IsZero() {
				relatedEvent.LastSeen = event.EventTime.Time
			}

			relatedEvents = append(relatedEvents, relatedEvent)
		}
	}

	// Sort by last seen (most recent first) and limit to top 20
	if len(relatedEvents) > 20 {
		relatedEvents = relatedEvents[:20]
	}

	return relatedEvents
}

// matchesIncidentType determines if an event matches the incident type
func (scanner *IncidentScanner) matchesIncidentType(incident *KubernetesIncident, event corev1.Event) bool {
	reason := strings.ToLower(event.Reason)
	message := strings.ToLower(event.Message)
	incidentType := strings.ToLower(incident.Type)

	// OOM incidents
	if incidentType == "oom" || incidentType == "oomkilled" {
		return strings.Contains(reason, "oom") ||
			strings.Contains(message, "oomkilled") ||
			strings.Contains(message, "out of memory")
	}

	// CrashLoop incidents
	if incidentType == "crashloop" || incidentType == "crashloopbackoff" {
		return strings.Contains(reason, "backoff") ||
			strings.Contains(reason, "crash") ||
			strings.Contains(message, "crashloopbackoff") ||
			strings.Contains(message, "back-off restarting")
	}

	// High restart incidents
	if incidentType == "high_restarts" {
		return strings.Contains(reason, "started") ||
			strings.Contains(reason, "killing") ||
			strings.Contains(message, "restarted") ||
			strings.Contains(message, "container") && strings.Contains(message, "started")
	}

	// ImagePull incidents
	if incidentType == "imagepull" || incidentType == "imagepullbackoff" {
		return strings.Contains(reason, "failed") && strings.Contains(reason, "pull") ||
			strings.Contains(reason, "errimagepull") ||
			strings.Contains(message, "image pull") ||
			strings.Contains(message, "failed to pull image")
	}

	// Job/CronJob failures
	if incidentType == "job_failure" || incidentType == "cronjob_failure" {
		return strings.Contains(reason, "failed") ||
			strings.Contains(reason, "backofflimitexceeded") ||
			strings.Contains(message, "job has reached")
	}

	// Node pressure
	if incidentType == "node_memory_pressure" || incidentType == "node_disk_pressure" {
		return strings.Contains(reason, "pressure") ||
			strings.Contains(message, "evicted") ||
			strings.Contains(message, "insufficient")
	}

	return false
}

// GenerateEventSummary creates a human-readable summary from correlated events
func (scanner *IncidentScanner) GenerateEventSummary(events []RelatedEvent) string {
	if len(events) == 0 {
		return ""
	}

	// Count event types
	warningCount := 0
	errorCount := 0
	reasons := make(map[string]int)

	for _, event := range events {
		if event.Type == "Warning" {
			warningCount++
		} else if event.Type == "Error" {
			errorCount++
		}
		reasons[event.Reason]++
	}

	// Build summary
	summary := fmt.Sprintf("%d related events (%d warnings", len(events), warningCount)
	if errorCount > 0 {
		summary += fmt.Sprintf(", %d errors", errorCount)
	}
	summary += ")"

	// Add top reasons
	if len(reasons) > 0 {
		summary += " - Top reasons: "
		count := 0
		for reason, freq := range reasons {
			if count >= 3 {
				break
			}
			if count > 0 {
				summary += ", "
			}
			summary += fmt.Sprintf("%s (%d)", reason, freq)
			count++
		}
	}

	return summary
}
