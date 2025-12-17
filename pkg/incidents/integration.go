// Copyright 2025 KubeGraf Contributors
// SPDX-License-Identifier: Apache-2.0

package incidents

import (
	"context"
	"time"
)

// Integration provides the bridge between the incidents package and the main application.
// This file contains adapters and helpers for integrating with existing KubeGraf components.

// EventAdapter converts events from the existing event monitor format.
type EventAdapter struct {
	manager *Manager
}

// NewEventAdapter creates a new event adapter.
func NewEventAdapter(manager *Manager) *EventAdapter {
	return &EventAdapter{
		manager: manager,
	}
}

// IngestMonitoredEvent converts a MonitoredEvent from the existing event monitor.
// This is the main integration point with the existing EventMonitor.
func (a *EventAdapter) IngestMonitoredEvent(
	eventID string,
	timestamp time.Time,
	eventType string,
	category string,
	severity string,
	title string,
	description string,
	namespace string,
	resourceKind string,
	resourceName string,
	details map[string]interface{},
) {
	// Determine source based on category
	source := SourceKubeEvent

	// Create resource reference
	resource := KubeResourceRef{
		Kind:      resourceKind,
		Name:      resourceName,
		Namespace: namespace,
	}

	// Create normalized signal
	signal := NewNormalizedSignal(source, resource, description)
	signal.ID = eventID
	signal.Timestamp = timestamp
	signal.SetAttribute(AttrEventType, eventType)
	signal.SetAttribute(AttrEventReason, category)
	signal.SetAttribute(AttrSeverity, severity)
	signal.SetAttribute(AttrNamespace, namespace)

	// Add details as attributes
	if details != nil {
		for k, v := range details {
			if s, ok := v.(string); ok {
				signal.SetAttribute(k, s)
			}
		}
	}

	// Ingest into manager
	a.manager.IngestSignal(signal)
}

// IngestLogError converts a LogError from the existing event monitor.
func (a *EventAdapter) IngestLogError(
	timestamp time.Time,
	podName string,
	namespace string,
	containerName string,
	statusCode int,
	method string,
	path string,
	message string,
	errorType string,
) {
	a.manager.IngestLogError(
		podName,
		namespace,
		containerName,
		message,
		timestamp,
		statusCode,
		method,
		path,
		errorType,
	)
}

// IngestContainerStatus converts container status from pod status.
func (a *EventAdapter) IngestContainerStatus(
	podName string,
	namespace string,
	phase string,
	containerName string,
	state string,
	reason string,
	exitCode int32,
	restartCount int32,
	terminatedAt *time.Time,
) {
	a.manager.IngestPodStatus(
		podName,
		namespace,
		phase,
		containerName,
		state,
		reason,
		int(exitCode),
		restartCount,
		terminatedAt,
	)
}

// KubeClientAdapter implements KubeFixExecutor using kubernetes client operations.
// This is meant to be implemented in the main package where kubernetes client is available.
type KubeClientAdapter struct {
	// These fields will be set by the main application
	GetResourceFunc     func(ctx context.Context, ref KubeResourceRef) (map[string]interface{}, error)
	PatchResourceFunc   func(ctx context.Context, ref KubeResourceRef, patchData []byte, dryRun bool) (map[string]interface{}, error)
	ScaleResourceFunc   func(ctx context.Context, ref KubeResourceRef, replicas int32, dryRun bool) error
	RestartResourceFunc func(ctx context.Context, ref KubeResourceRef, dryRun bool) error
	RollbackResourceFunc func(ctx context.Context, ref KubeResourceRef, revision int64, dryRun bool) error
	DeleteResourceFunc  func(ctx context.Context, ref KubeResourceRef, dryRun bool) error
}

// GetResource implements KubeFixExecutor.
func (a *KubeClientAdapter) GetResource(ctx context.Context, ref KubeResourceRef) (map[string]interface{}, error) {
	if a.GetResourceFunc != nil {
		return a.GetResourceFunc(ctx, ref)
	}
	return nil, nil
}

// PatchResource implements KubeFixExecutor.
func (a *KubeClientAdapter) PatchResource(ctx context.Context, ref KubeResourceRef, patchData []byte, dryRun bool) (map[string]interface{}, error) {
	if a.PatchResourceFunc != nil {
		return a.PatchResourceFunc(ctx, ref, patchData, dryRun)
	}
	return nil, nil
}

// ScaleResource implements KubeFixExecutor.
func (a *KubeClientAdapter) ScaleResource(ctx context.Context, ref KubeResourceRef, replicas int32, dryRun bool) error {
	if a.ScaleResourceFunc != nil {
		return a.ScaleResourceFunc(ctx, ref, replicas, dryRun)
	}
	return nil
}

// RestartResource implements KubeFixExecutor.
func (a *KubeClientAdapter) RestartResource(ctx context.Context, ref KubeResourceRef, dryRun bool) error {
	if a.RestartResourceFunc != nil {
		return a.RestartResourceFunc(ctx, ref, dryRun)
	}
	return nil
}

// RollbackResource implements KubeFixExecutor.
func (a *KubeClientAdapter) RollbackResource(ctx context.Context, ref KubeResourceRef, revision int64, dryRun bool) error {
	if a.RollbackResourceFunc != nil {
		return a.RollbackResourceFunc(ctx, ref, revision, dryRun)
	}
	return nil
}

// DeleteResource implements KubeFixExecutor.
func (a *KubeClientAdapter) DeleteResource(ctx context.Context, ref KubeResourceRef, dryRun bool) error {
	if a.DeleteResourceFunc != nil {
		return a.DeleteResourceFunc(ctx, ref, dryRun)
	}
	return nil
}

// ConversionHelpers provides helper functions for converting between types.
type ConversionHelpers struct{}

// SeverityFromString converts a string to Severity.
func (ConversionHelpers) SeverityFromString(s string) Severity {
	switch s {
	case "critical":
		return SeverityCritical
	case "high":
		return SeverityHigh
	case "medium":
		return SeverityMedium
	case "low":
		return SeverityLow
	case "info":
		return SeverityInfo
	default:
		return SeverityMedium
	}
}

// PatternFromCategory maps event categories to failure patterns.
func (ConversionHelpers) PatternFromCategory(category string) FailurePattern {
	switch category {
	case "pod_crash_loop", "pod_oom_restart":
		return PatternCrashLoop
	case "pod_failed", "pod_killed":
		return PatternAppCrash
	case "pod_unhealthy":
		return PatternLivenessFailure
	case "http_500", "http_error":
		return PatternInternalErrors
	case "http_502", "http_503":
		return PatternUpstreamFailure
	case "node_unavailable", "node_not_ready":
		return PatternNodeNotReady
	case "node_memory_pressure", "node_disk_pressure":
		return PatternNodePressure
	case "hpa_scaled", "deployment_scaled":
		return PatternResourceExhausted
	case "image_pull_error":
		return PatternImagePullFailure
	default:
		return PatternUnknown
	}
}

// LegacyIncidentConverter converts the new Incident type to legacy format.
// This is for backwards compatibility with existing UI components.
type LegacyIncidentConverter struct{}

// ToLegacyFormat converts an Incident to the legacy KubernetesIncident format.
func (LegacyIncidentConverter) ToLegacyFormat(incident *Incident) map[string]interface{} {
	if incident == nil {
		return nil
	}

	return map[string]interface{}{
		"id":           incident.ID,
		"type":         string(incident.Pattern),
		"severity":     string(incident.Severity),
		"resourceKind": incident.Resource.Kind,
		"resourceName": incident.Resource.Name,
		"namespace":    incident.Resource.Namespace,
		"firstSeen":    incident.FirstSeen,
		"lastSeen":     incident.LastSeen,
		"count":        incident.Occurrences,
		"message":      incident.Title,
		"description":  incident.Description,
		"diagnosis":    incident.Diagnosis,
		"recommendations": incident.Recommendations,
	}
}

// ToLegacyList converts a list of Incidents to legacy format.
func (c LegacyIncidentConverter) ToLegacyList(incidents []*Incident) []map[string]interface{} {
	result := make([]map[string]interface{}, len(incidents))
	for i, inc := range incidents {
		result[i] = c.ToLegacyFormat(inc)
	}
	return result
}

// IncidentUIData provides data formatted for the UI.
type IncidentUIData struct {
	// Incident is the full incident data
	Incident *Incident `json:"incident"`
	// DisplayTitle is a formatted title for display
	DisplayTitle string `json:"displayTitle"`
	// SeverityColor is the color to use for severity display
	SeverityColor string `json:"severityColor"`
	// StatusIcon is the icon to use for status
	StatusIcon string `json:"statusIcon"`
	// TimeAgo is a human-readable time since first seen
	TimeAgo string `json:"timeAgo"`
	// HasFix indicates if automated fixes are available
	HasFix bool `json:"hasFix"`
}

// FormatForUI creates UI-friendly incident data.
func FormatForUI(incident *Incident) *IncidentUIData {
	if incident == nil {
		return nil
	}

	data := &IncidentUIData{
		Incident:     incident,
		DisplayTitle: incident.Title,
	}

	// Severity colors
	switch incident.Severity {
	case SeverityCritical:
		data.SeverityColor = "#dc2626" // red-600
	case SeverityHigh:
		data.SeverityColor = "#ea580c" // orange-600
	case SeverityMedium:
		data.SeverityColor = "#ca8a04" // yellow-600
	case SeverityLow:
		data.SeverityColor = "#2563eb" // blue-600
	default:
		data.SeverityColor = "#6b7280" // gray-500
	}

	// Status icons
	switch incident.Status {
	case StatusOpen:
		data.StatusIcon = "🔴"
	case StatusInvestigating:
		data.StatusIcon = "🔍"
	case StatusRemediating:
		data.StatusIcon = "🔧"
	case StatusResolved:
		data.StatusIcon = "✅"
	case StatusSuppressed:
		data.StatusIcon = "🔇"
	default:
		data.StatusIcon = "❓"
	}

	// Time ago
	data.TimeAgo = formatTimeAgo(incident.FirstSeen)

	// Check for available fixes
	for _, rec := range incident.Recommendations {
		if rec.ProposedFix != nil {
			data.HasFix = true
			break
		}
	}

	return data
}

// formatTimeAgo formats a time as human-readable duration.
func formatTimeAgo(t time.Time) string {
	d := time.Since(t)

	if d < time.Minute {
		return "just now"
	}
	if d < time.Hour {
		mins := int(d.Minutes())
		if mins == 1 {
			return "1 minute ago"
		}
		return intToString(mins) + " minutes ago"
	}
	if d < 24*time.Hour {
		hours := int(d.Hours())
		if hours == 1 {
			return "1 hour ago"
		}
		return intToString(hours) + " hours ago"
	}

	days := int(d.Hours() / 24)
	if days == 1 {
		return "1 day ago"
	}
	return intToString(days) + " days ago"
}

// intToString converts an int to string without importing strconv.
func intToString(n int) string {
	if n == 0 {
		return "0"
	}

	negative := n < 0
	if negative {
		n = -n
	}

	var digits []byte
	for n > 0 {
		digits = append([]byte{byte('0' + n%10)}, digits...)
		n /= 10
	}

	if negative {
		digits = append([]byte{'-'}, digits...)
	}

	return string(digits)
}

