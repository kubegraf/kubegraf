// Copyright 2025 KubeGraf Contributors
// SPDX-License-Identifier: Apache-2.0

package main

import (
	"time"
)

// RCAEngine is the main Root Cause Analysis engine
type RCAEngine struct {
	app              *App
	signalCollector  *SignalCollector
	correlator       *CorrelationEngine
	rcaGenerator     *RCAGenerator
	fixRecommender   *FixRecommender
}

// Signal represents a single piece of evidence from the cluster
type Signal struct {
	ID        string                 `json:"id"`
	Type      SignalType             `json:"type"`
	Source    string                 `json:"source"`    // pod, node, event, metric, log
	Timestamp time.Time              `json:"timestamp"`
	Resource  ResourceReference      `json:"resource"`
	Severity  string                 `json:"severity"`
	Message   string                 `json:"message"`
	Metadata  map[string]interface{} `json:"metadata"`
}

// SignalType represents the type of signal
type SignalType string

const (
	SignalTypePodStatus          SignalType = "pod_status"
	SignalTypePodRestart         SignalType = "pod_restart"
	SignalTypePodTerminated      SignalType = "pod_terminated"
	SignalTypePodOOMKilled       SignalType = "pod_oomkilled"
	SignalTypePodCrashLoop       SignalType = "pod_crashloop"
	SignalTypePodImagePull       SignalType = "pod_imagepull"
	SignalTypePodPending         SignalType = "pod_pending"
	SignalTypePodEvicted         SignalType = "pod_evicted"
	SignalTypeNodeNotReady       SignalType = "node_notready"
	SignalTypeNodePreempted      SignalType = "node_preempted"
	SignalTypeNodeTerminated     SignalType = "node_terminated"
	SignalTypeNodePressure       SignalType = "node_pressure"
	SignalTypeEvent              SignalType = "event"
	SignalTypeMetric             SignalType = "metric"
	SignalTypeLog                SignalType = "log"
	SignalTypeGracefulShutdown   SignalType = "graceful_shutdown"
	SignalTypeDBConnection       SignalType = "db_connection"
	SignalTypeDNSFailure         SignalType = "dns_failure"
	SignalTypeSchedulingFailure  SignalType = "scheduling_failure"
	SignalTypeConfigError        SignalType = "config_error"
)

// ResourceReference uniquely identifies a Kubernetes resource
type ResourceReference struct {
	Kind      string `json:"kind"`
	Name      string `json:"name"`
	Namespace string `json:"namespace"`
	UID       string `json:"uid,omitempty"`
}

// Timeline represents a sequence of correlated signals
type Timeline struct {
	IncidentID string    `json:"incidentId"`
	StartTime  time.Time `json:"startTime"`
	EndTime    time.Time `json:"endTime"`
	Signals    []Signal  `json:"signals"`
	Duration   float64   `json:"durationSeconds"`
}

// CorrelationResult represents the result of signal correlation
type CorrelationResult struct {
	PrimaryTrigger     *Signal          `json:"primaryTrigger"`
	SecondarySymptoms  []Signal         `json:"secondarySymptoms"`
	RelatedSignals     []Signal         `json:"relatedSignals"`
	Timeline           Timeline         `json:"timeline"`
	ConfidenceScore    float64          `json:"confidenceScore"` // 0.0 to 1.0
	CorrelationPattern CorrelationPattern `json:"correlationPattern"`
}

// CorrelationPattern represents identified patterns in signal correlation
type CorrelationPattern string

const (
	PatternNodePreemption        CorrelationPattern = "node_preemption"
	PatternGracefulShutdownFail  CorrelationPattern = "graceful_shutdown_failure"
	PatternOOMKill               CorrelationPattern = "oom_kill"
	PatternCrashLoop             CorrelationPattern = "crash_loop"
	PatternDBConnectionFailure   CorrelationPattern = "db_connection_failure"
	PatternDNSFailure            CorrelationPattern = "dns_failure"
	PatternImagePullFailure      CorrelationPattern = "image_pull_failure"
	PatternSchedulingFailure     CorrelationPattern = "scheduling_failure"
	PatternResourceExhaustion    CorrelationPattern = "resource_exhaustion"
	PatternDependencyFailure     CorrelationPattern = "dependency_failure"
	PatternUnknown               CorrelationPattern = "unknown"
)

// RootCauseAnalysis represents the final RCA output
type RootCauseAnalysis struct {
	ID                 string                 `json:"id"`
	IncidentID         string                 `json:"incidentId"`
	Title              string                 `json:"title"`
	RootCause          string                 `json:"rootCause"`
	Evidence           []Evidence             `json:"evidence"`
	Impact             Impact                 `json:"impact"`
	ConfidenceScore    float64                `json:"confidenceScore"` // 0-100
	ConfidenceReason   string                 `json:"confidenceReason"`
	Assumptions        []string               `json:"assumptions,omitempty"`
	CorrelationResult  *CorrelationResult     `json:"correlationResult"`
	GeneratedAt        time.Time              `json:"generatedAt"`
	FixSuggestions     []FixSuggestion        `json:"fixSuggestions"`
}

// Evidence represents a piece of evidence supporting the RCA
type Evidence struct {
	Type        string                 `json:"type"`
	Description string                 `json:"description"`
	Timestamp   time.Time              `json:"timestamp"`
	Source      string                 `json:"source"`
	Details     map[string]interface{} `json:"details,omitempty"`
}

// Impact describes the impact of the incident
type Impact struct {
	AffectedResources []ResourceReference `json:"affectedResources"`
	DowntimeSeconds   float64             `json:"downtimeSeconds"`
	StartTime         time.Time           `json:"startTime"`
	EndTime           *time.Time          `json:"endTime,omitempty"`
	Description       string              `json:"description"`
}

// FixSuggestion represents a recommended fix (non-destructive)
type FixSuggestion struct {
	ID          string   `json:"id"`
	Title       string   `json:"title"`
	Description string   `json:"description"`
	Reasoning   string   `json:"reasoning"`
	Priority    string   `json:"priority"` // high, medium, low
	Category    string   `json:"category"` // configuration, resource, deployment, etc.
	Actions     []string `json:"actions"`  // Human-readable action steps
	Risk        string   `json:"risk"`     // Risk level: low, medium, high
}

// AnalysisRequest represents a request to analyze an incident
type AnalysisRequest struct {
	IncidentID     string    `json:"incidentId"`
	IncidentType   string    `json:"incidentType"`
	Resource       ResourceReference `json:"resource"`
	StartTime      time.Time `json:"startTime"`
	EndTime        *time.Time `json:"endTime"`
	IncludeMetrics bool      `json:"includeMetrics"`
	IncludeLogs    bool      `json:"includeLogs"`
	LookbackMinutes int      `json:"lookbackMinutes"` // How far back to look for signals
}

// AnalysisResponse contains the complete RCA result
type AnalysisResponse struct {
	RCA       *RootCauseAnalysis `json:"rca"`
	Success   bool               `json:"success"`
	Error     string             `json:"error,omitempty"`
	Duration  float64            `json:"durationMs"`
}

// SignalWindow defines a time window for signal collection
type SignalWindow struct {
	StartTime time.Time
	EndTime   time.Time
	Resource  *ResourceReference // Optional: filter by specific resource
}
