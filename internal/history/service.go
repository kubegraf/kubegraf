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

package history

import (
	"context"
	"fmt"
	"strings"
	"time"
)

// HistoryQueryService provides normalized historical data queries
type HistoryQueryService struct {
	dataSource ClusterDataSource
}

// NewHistoryQueryService creates a new history query service
func NewHistoryQueryService(dataSource ClusterDataSource) *HistoryQueryService {
	return &HistoryQueryService{
		dataSource: dataSource,
	}
}

// QueryHistory queries historical data for a given time window and returns normalized results
func (s *HistoryQueryService) QueryHistory(ctx context.Context, window TimeWindow) (*HistoryQueryResult, error) {
	// Fetch raw data from data source in parallel using goroutines for faster response
	type eventsResult struct {
		events []K8sEvent
		err    error
	}
	type deploymentsResult struct {
		deployments []DeploymentChange
		err         error
	}
	type nodesResult struct {
		nodes []NodeChange
		err   error
	}

	eventsChan := make(chan eventsResult, 1)
	deploymentsChan := make(chan deploymentsResult, 1)
	nodesChan := make(chan nodesResult, 1)

	// Fetch events in parallel
	go func() {
		events, err := s.dataSource.FetchEvents(ctx, window.Since, window.Until)
		eventsChan <- eventsResult{events: events, err: err}
	}()

	// Fetch deployments in parallel
	go func() {
		deployments, err := s.dataSource.FetchDeployments(ctx, window.Since, window.Until)
		deploymentsChan <- deploymentsResult{deployments: deployments, err: err}
	}()

	// Fetch node changes in parallel
	go func() {
		nodes, err := s.dataSource.FetchNodeStatusChanges(ctx, window.Since, window.Until)
		nodesChan <- nodesResult{nodes: nodes, err: err}
	}()

	// Collect results
	evResult := <-eventsChan
	if evResult.err != nil {
		return nil, fmt.Errorf("failed to fetch events: %w", evResult.err)
	}

	depResult := <-deploymentsChan
	if depResult.err != nil {
		return nil, fmt.Errorf("failed to fetch deployments: %w", depResult.err)
	}

	nodeResult := <-nodesChan
	if nodeResult.err != nil {
		return nil, fmt.Errorf("failed to fetch node changes: %w", nodeResult.err)
	}

	events := evResult.events
	deploymentChanges := depResult.deployments
	nodeChanges := nodeResult.nodes

	// Convert to normalized ChangeEvents
	changeEvents := s.normalizeToChangeEvents(events, deploymentChanges, nodeChanges)

	// Identify incident candidates
	incidentCandidates := s.identifyIncidents(events, deploymentChanges, nodeChanges)

	result := &HistoryQueryResult{
		Window:             window,
		ChangeEvents:       changeEvents,
		IncidentCandidates: incidentCandidates,
		TotalChanges:       len(changeEvents),
		TotalIncidents:     len(incidentCandidates),
	}

	return result, nil
}

// normalizeToChangeEvents converts raw data into normalized ChangeEvents
func (s *HistoryQueryService) normalizeToChangeEvents(
	events []K8sEvent,
	deploymentChanges []DeploymentChange,
	nodeChanges []NodeChange,
) []ChangeEvent {
	var changeEvents []ChangeEvent

	// Convert K8s events (both Normal and Warning)
	for _, event := range events {
		severity := "info"
		if event.Type == "Warning" {
			severity = "warning"
		}

		changeEvent := ChangeEvent{
			Type:         "event",
			Timestamp:    event.LastTimestamp,
			Namespace:    event.Namespace,
			ResourceKind: event.InvolvedKind,
			ResourceName: event.InvolvedName,
			ChangeType:   event.Reason,
			Severity:     severity,
			Reason:       event.Reason,
			Message:      event.Message,
			Metadata: map[string]interface{}{
				"event_name":      event.Name,
				"event_type":      event.Type,
				"first_timestamp": event.FirstTimestamp,
			},
		}
		changeEvents = append(changeEvents, changeEvent)
	}

	// Convert deployment changes
	for _, change := range deploymentChanges {
		severity := "info"
		if change.ChangeType == "failure" {
			severity = "error"
		} else if change.ChangeType == "rollout" {
			severity = "warning"
		}

		changeEvent := ChangeEvent{
			Type:         "deployment",
			Timestamp:    change.Timestamp,
			Namespace:    change.Namespace,
			ResourceKind: "Deployment",
			ResourceName: change.Name,
			ChangeType:   change.ChangeType,
			Severity:     severity,
			Reason:       change.Reason,
			Message:      change.Message,
			Metadata: map[string]interface{}{
				"old_replicas": change.OldReplicas,
				"new_replicas": change.NewReplicas,
				"old_ready":    change.OldReady,
				"new_ready":    change.NewReady,
			},
		}
		changeEvents = append(changeEvents, changeEvent)
	}

	// Convert node changes
	for _, change := range nodeChanges {
		severity := "warning"
		if change.ChangeType == "notready" || change.ChangeType == "memory_pressure" || change.ChangeType == "disk_pressure" {
			severity = "error"
		}

		changeEvent := ChangeEvent{
			Type:         "node",
			Timestamp:    change.Timestamp,
			Namespace:    "", // Nodes are cluster-scoped
			ResourceKind: "Node",
			ResourceName: change.NodeName,
			ChangeType:   change.ChangeType,
			Severity:     severity,
			Reason:       change.Reason,
			Message:      change.Message,
			Metadata: map[string]interface{}{
				"old_condition": change.OldCondition,
				"new_condition": change.NewCondition,
			},
		}
		changeEvents = append(changeEvents, changeEvent)
	}

	return changeEvents
}

// identifyIncidents identifies potential incidents from the raw data
func (s *HistoryQueryService) identifyIncidents(
	events []K8sEvent,
	deploymentChanges []DeploymentChange,
	nodeChanges []NodeChange,
) []IncidentCandidate {
	var incidents []IncidentCandidate

	// Group events by involved object to identify patterns
	eventGroups := make(map[string][]K8sEvent)
	for _, event := range events {
		key := fmt.Sprintf("%s/%s/%s", event.Namespace, event.InvolvedKind, event.InvolvedName)
		eventGroups[key] = append(eventGroups[key], event)
	}

	// Identify CrashLoop incidents from pod events
	for key, groupEvents := range eventGroups {
		parts := strings.Split(key, "/")
		if len(parts) < 3 {
			continue
		}
		namespace := parts[0]
		kind := parts[1]
		name := parts[2]

		if kind == "Pod" {
			// Check for crash loop patterns
			crashLoopReasons := []string{"CrashLoopBackOff", "Error", "Failed", "BackOff"}
			hasCrashLoop := false
			var evidence []string
			var timestamps []time.Time

			for _, event := range groupEvents {
				for _, reason := range crashLoopReasons {
					if strings.Contains(event.Reason, reason) {
						hasCrashLoop = true
						evidence = append(evidence, fmt.Sprintf("%s: %s", event.Reason, event.Message))
						timestamps = append(timestamps, event.LastTimestamp)
					}
				}
			}

			if hasCrashLoop {
				// Infer service/deployment from pod name
				service := s.inferServiceFromPod(name)
				incident := IncidentCandidate{
					Symptom:           "CrashLoop",
					Service:           service,
					Namespace:         namespace,
					Severity:          "error",
					FirstSeen:         s.minTime(timestamps),
					LastSeen:          s.maxTime(timestamps),
					Evidence:          evidence,
					AffectedResources: []string{fmt.Sprintf("%s/%s", namespace, name)},
					Count:             len(evidence),
				}
				incidents = append(incidents, incident)
			}
		} else if kind == "Deployment" {
			// Check for deployment failures
			var failureEvents []K8sEvent
			for _, event := range groupEvents {
				if strings.Contains(event.Reason, "Failed") || strings.Contains(event.Reason, "Error") {
					failureEvents = append(failureEvents, event)
				}
			}

			if len(failureEvents) > 0 {
				var evidence []string
				var timestamps []time.Time
				for _, event := range failureEvents {
					evidence = append(evidence, fmt.Sprintf("%s: %s", event.Reason, event.Message))
					timestamps = append(timestamps, event.LastTimestamp)
				}

				incident := IncidentCandidate{
					Symptom:           "DeploymentFailure",
					Service:           name,
					Namespace:         namespace,
					Severity:          "error",
					FirstSeen:         s.minTime(timestamps),
					LastSeen:          s.maxTime(timestamps),
					Evidence:          evidence,
					AffectedResources: []string{fmt.Sprintf("%s/%s", namespace, name)},
					Count:             len(failureEvents),
				}
				incidents = append(incidents, incident)
			}
		}
	}

	// Identify node issues
	nodeIssueMap := make(map[string]*IncidentCandidate)
	for _, change := range nodeChanges {
		symptom := ""
		severity := "warning"

		switch change.ChangeType {
		case "notready":
			symptom = "NodeNotReady"
			severity = "error"
		case "memory_pressure":
			symptom = "MemoryPressure"
			severity = "error"
		case "disk_pressure":
			symptom = "DiskPressure"
			severity = "error"
		case "pid_pressure":
			symptom = "PIDPressure"
			severity = "warning"
		}

		if symptom != "" {
			if incident, exists := nodeIssueMap[change.NodeName]; exists {
				// Update existing incident
				incident.Count++
				if change.Timestamp.Before(incident.FirstSeen) {
					incident.FirstSeen = change.Timestamp
				}
				if change.Timestamp.After(incident.LastSeen) {
					incident.LastSeen = change.Timestamp
				}
				incident.Evidence = append(incident.Evidence, fmt.Sprintf("%s: %s", change.Reason, change.Message))
			} else {
				// Create new incident
				incident := &IncidentCandidate{
					Symptom:           symptom,
					Service:           change.NodeName,
					Namespace:         "",
					Severity:          severity,
					FirstSeen:         change.Timestamp,
					LastSeen:          change.Timestamp,
					Evidence:          []string{fmt.Sprintf("%s: %s", change.Reason, change.Message)},
					AffectedResources: []string{change.NodeName},
					Count:             1,
				}
				nodeIssueMap[change.NodeName] = incident
			}
		}
	}

	// Add node incidents to the list
	for _, incident := range nodeIssueMap {
		incidents = append(incidents, *incident)
	}

	// Identify deployment failures from deployment changes
	for _, change := range deploymentChanges {
		if change.ChangeType == "failure" {
			incident := IncidentCandidate{
				Symptom:           "DeploymentFailure",
				Service:           change.Name,
				Namespace:         change.Namespace,
				Severity:          "error",
				FirstSeen:         change.Timestamp,
				LastSeen:          change.Timestamp,
				Evidence:          []string{change.Message},
				AffectedResources: []string{fmt.Sprintf("%s/%s", change.Namespace, change.Name)},
				Count:             1,
			}
			incidents = append(incidents, incident)
		}
	}

	return incidents
}

// inferServiceFromPod attempts to infer the service/deployment name from a pod name
func (s *HistoryQueryService) inferServiceFromPod(podName string) string {
	// Pod names often follow patterns like: deployment-name-hash
	// Try to extract the deployment name by removing the hash suffix
	parts := strings.Split(podName, "-")
	if len(parts) > 1 {
		// Remove the last part (usually a hash) and rejoin
		return strings.Join(parts[:len(parts)-1], "-")
	}
	return podName
}

// minTime returns the minimum time from a slice
func (s *HistoryQueryService) minTime(times []time.Time) time.Time {
	if len(times) == 0 {
		return time.Now()
	}
	min := times[0]
	for _, t := range times[1:] {
		if t.Before(min) {
			min = t
		}
	}
	return min
}

// maxTime returns the maximum time from a slice
func (s *HistoryQueryService) maxTime(times []time.Time) time.Time {
	if len(times) == 0 {
		return time.Now()
	}
	max := times[0]
	for _, t := range times[1:] {
		if t.After(max) {
			max = t
		}
	}
	return max
}
