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
	"strings"
	"time"

	"k8s.io/client-go/kubernetes"

	"github.com/kubegraf/kubegraf/internal/history"
)

// ContinuitySummary represents the aggregated continuity data
type ContinuitySummary struct {
	IncidentsCount          int      `json:"incidents_count"`
	MajorIncidentsCount     int      `json:"major_incidents_count"`
	DeploymentsWithFailures []string `json:"deployments_with_failures"`
	NodeIssues              []string `json:"node_issues"`
	Window                  string   `json:"window"`
	LastSeenAt              string   `json:"last_seen_at"`
}

// ContinuityService handles continuity tracking logic
type ContinuityService struct {
	clientset      kubernetes.Interface
	stateMgr       *StateManager
	historyService *history.HistoryQueryService
}

// NewContinuityService creates a new continuity service
func NewContinuityService(clientset kubernetes.Interface, stateMgr *StateManager) *ContinuityService {
	// Create data source and history service
	dataSource := history.NewKubernetesDataSource(clientset)
	historyService := history.NewHistoryQueryService(dataSource)

	return &ContinuityService{
		clientset:      clientset,
		stateMgr:       stateMgr,
		historyService: historyService,
	}
}

// GetSummary generates a continuity summary for the given window using HistoryQueryService
func (cs *ContinuityService) GetSummary(ctx context.Context, window string) (*ContinuitySummary, error) {
	// Get last_seen_at time
	lastSeenAt, err := cs.stateMgr.GetLastSeenAtTime()
	if err != nil {
		return nil, fmt.Errorf("failed to get last seen time: %w", err)
	}

	// Parse window duration (e.g., "7d", "24h", "3d")
	windowDuration, err := parseWindow(window)
	if err != nil {
		return nil, fmt.Errorf("invalid window format: %w", err)
	}

	// Calculate start time: use the earlier of (now - window) or last_seen_at
	now := time.Now()
	windowStart := now.Add(-windowDuration)
	startTime := lastSeenAt
	if windowStart.Before(lastSeenAt) {
		startTime = windowStart
	}

	// Create time window for history query
	timeWindow := history.TimeWindow{
		Since: startTime,
		Until: now,
	}

	// Query history using HistoryQueryService
	historyResult, err := cs.historyService.QueryHistory(ctx, timeWindow)
	if err != nil {
		return nil, fmt.Errorf("failed to query history: %w", err)
	}

	// Build summary from history results
	summary := &ContinuitySummary{
		Window:                  window,
		LastSeenAt:              lastSeenAt.Format(time.RFC3339),
		DeploymentsWithFailures: []string{},
		NodeIssues:              []string{},
		IncidentsCount:          historyResult.TotalIncidents,
		MajorIncidentsCount:     0, // Count only error/critical severity incidents
	}

	// Track deployments and nodes with issues
	deploymentFailures := make(map[string]bool)
	nodeIssuesMap := make(map[string]bool)

	// Process incident candidates
	for _, incident := range historyResult.IncidentCandidates {
		// Count major incidents (error/critical severity)
		if incident.Severity == "error" || incident.Severity == "critical" {
			summary.MajorIncidentsCount++
		}

		// Track deployment failures
		if incident.Symptom == "DeploymentFailure" {
			deploymentKey := fmt.Sprintf("%s/%s", incident.Namespace, incident.Service)
			if incident.Namespace == "" {
				deploymentKey = incident.Service
			}
			deploymentFailures[deploymentKey] = true
		}

		// Track node issues
		if incident.Symptom == "NodeNotReady" || incident.Symptom == "MemoryPressure" ||
			incident.Symptom == "DiskPressure" || incident.Symptom == "PIDPressure" {
			nodeIssuesMap[incident.Service] = true
		}
	}

	// Also process change events for additional context
	for _, changeEvent := range historyResult.ChangeEvents {
		if changeEvent.Type == "deployment" && changeEvent.ChangeType == "failure" {
			deploymentKey := fmt.Sprintf("%s/%s", changeEvent.Namespace, changeEvent.ResourceName)
			if changeEvent.Namespace == "" {
				deploymentKey = changeEvent.ResourceName
			}
			deploymentFailures[deploymentKey] = true
		}

		if changeEvent.Type == "node" && (changeEvent.ChangeType == "notready" ||
			changeEvent.ChangeType == "memory_pressure" ||
			changeEvent.ChangeType == "disk_pressure") {
			nodeIssuesMap[changeEvent.ResourceName] = true
		}
	}

	// Convert maps to slices
	for deployment := range deploymentFailures {
		summary.DeploymentsWithFailures = append(summary.DeploymentsWithFailures, deployment)
	}

	for node := range nodeIssuesMap {
		summary.NodeIssues = append(summary.NodeIssues, node)
	}

	return summary, nil
}

// parseWindow parses a window string like "7d", "24h", "3d" into a duration
func parseWindow(window string) (time.Duration, error) {
	if window == "" {
		window = "7d" // Default to 7 days
	}

	window = strings.ToLower(strings.TrimSpace(window))

	// Parse format: number + unit (d, h, m)
	var value int
	var unit string

	_, err := fmt.Sscanf(window, "%d%s", &value, &unit)
	if err != nil {
		return 0, fmt.Errorf("invalid window format: %s (expected format: 7d, 24h, etc.)", window)
	}

	switch unit {
	case "d", "day", "days":
		return time.Duration(value) * 24 * time.Hour, nil
	case "h", "hour", "hours":
		return time.Duration(value) * time.Hour, nil
	case "m", "min", "minute", "minutes":
		return time.Duration(value) * time.Minute, nil
	default:
		return 0, fmt.Errorf("unknown time unit: %s (supported: d, h, m)", unit)
	}
}


