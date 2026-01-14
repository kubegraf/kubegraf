// Copyright 2025 KubeGraf Contributors
// SPDX-License-Identifier: Apache-2.0

package main

import (
	"context"
	"fmt"
	"time"
)

// NewRCAEngine creates a new RCA engine
func NewRCAEngine(app *App) *RCAEngine {
	return &RCAEngine{
		app:             app,
		signalCollector: NewSignalCollector(app),
		correlator:      NewCorrelationEngine(app),
		rcaGenerator:    NewRCAGenerator(app),
		fixRecommender:  NewFixRecommender(app),
	}
}

// AnalyzeIncident performs a complete RCA for an incident
func (engine *RCAEngine) AnalyzeIncident(ctx context.Context, req AnalysisRequest) (*AnalysisResponse, error) {
	startTime := time.Now()

	// Step 1: Collect signals
	signals, err := engine.signalCollector.CollectSignals(ctx, req)
	if err != nil {
		return &AnalysisResponse{
			Success:  false,
			Error:    fmt.Sprintf("Failed to collect signals: %v", err),
			Duration: float64(time.Since(startTime).Milliseconds()),
		}, err
	}

	if len(signals) == 0 {
		return &AnalysisResponse{
			Success:  false,
			Error:    "No signals found for the specified incident",
			Duration: float64(time.Since(startTime).Milliseconds()),
		}, fmt.Errorf("no signals found")
	}

	// Step 2: Correlate signals
	correlation := engine.correlator.CorrelateSignals(req.IncidentID, signals)

	// Step 3: Generate RCA
	rca := engine.rcaGenerator.GenerateRCA(req.IncidentID, correlation, signals)

	// Step 4: Generate fix suggestions
	fixSuggestions := engine.fixRecommender.RecommendFixes(rca)
	rca.FixSuggestions = fixSuggestions

	return &AnalysisResponse{
		RCA:      rca,
		Success:  true,
		Duration: float64(time.Since(startTime).Milliseconds()),
	}, nil
}

// AnalyzeKubernetesIncident is a convenience method to analyze a KubernetesIncident
func (engine *RCAEngine) AnalyzeKubernetesIncident(ctx context.Context, incident KubernetesIncident) (*AnalysisResponse, error) {
	req := AnalysisRequest{
		IncidentID:   incident.ID,
		IncidentType: incident.Type,
		Resource: ResourceReference{
			Kind:      incident.ResourceKind,
			Name:      incident.ResourceName,
			Namespace: incident.Namespace,
		},
		StartTime:       incident.FirstSeen,
		EndTime:         &incident.LastSeen,
		IncludeMetrics:  false, // Can be made configurable
		IncludeLogs:     true,
		LookbackMinutes: 30, // Look back 30 minutes before the incident
	}

	return engine.AnalyzeIncident(ctx, req)
}

// QuickAnalyze performs a fast analysis with minimal signal collection (for real-time analysis)
func (engine *RCAEngine) QuickAnalyze(ctx context.Context, resource ResourceReference, namespace string) (*AnalysisResponse, error) {
	req := AnalysisRequest{
		IncidentID:   fmt.Sprintf("quick-%d", time.Now().Unix()),
		IncidentType: "quick_analysis",
		Resource:     resource,
		StartTime:    time.Now().Add(-15 * time.Minute),
		EndTime:      nil,
		IncludeMetrics: false,
		IncludeLogs:    false, // Skip logs for quick analysis
		LookbackMinutes: 15,
	}

	return engine.AnalyzeIncident(ctx, req)
}

// BatchAnalyze analyzes multiple incidents in parallel
func (engine *RCAEngine) BatchAnalyze(ctx context.Context, incidents []KubernetesIncident) ([]*AnalysisResponse, error) {
	results := make([]*AnalysisResponse, len(incidents))

	// Analyze each incident
	for i, incident := range incidents {
		result, err := engine.AnalyzeKubernetesIncident(ctx, incident)
		if err != nil {
			// Store error response
			results[i] = &AnalysisResponse{
				Success: false,
				Error:   err.Error(),
			}
		} else {
			results[i] = result
		}
	}

	return results, nil
}

// GetRCAByID retrieves a previously generated RCA (if stored)
// Note: This would require storing RCAs in database - placeholder for now
func (engine *RCAEngine) GetRCAByID(ctx context.Context, rcaID string) (*RootCauseAnalysis, error) {
	// TODO: Implement RCA storage and retrieval
	return nil, fmt.Errorf("RCA storage not yet implemented")
}

// GetRCAForIncident retrieves RCA for a specific incident
// Note: This would require storing RCAs in database - placeholder for now
func (engine *RCAEngine) GetRCAForIncident(ctx context.Context, incidentID string) (*RootCauseAnalysis, error) {
	// TODO: Implement RCA storage and retrieval
	return nil, fmt.Errorf("RCA storage not yet implemented")
}

// ValidateAnalysisRequest validates an analysis request
func (engine *RCAEngine) ValidateAnalysisRequest(req AnalysisRequest) error {
	if req.IncidentID == "" {
		return fmt.Errorf("incident ID is required")
	}

	if req.Resource.Name == "" {
		return fmt.Errorf("resource name is required")
	}

	if req.Resource.Kind == "" {
		return fmt.Errorf("resource kind is required")
	}

	if req.LookbackMinutes < 0 || req.LookbackMinutes > 1440 { // Max 24 hours
		return fmt.Errorf("lookback minutes must be between 0 and 1440")
	}

	return nil
}

// ExplainPattern provides a human-readable explanation of a correlation pattern
func (engine *RCAEngine) ExplainPattern(pattern CorrelationPattern) string {
	explanations := map[CorrelationPattern]string{
		PatternNodePreemption: "Node preemption occurs when a cloud provider terminates a spot/preemptible instance. " +
			"Pods running on the terminated node are evicted and rescheduled to other nodes.",

		PatternGracefulShutdownFail: "Graceful shutdown failure happens when an application doesn't exit within " +
			"the termination grace period and is force-killed with SIGKILL.",

		PatternOOMKill: "Out-of-memory (OOM) kill occurs when a container exceeds its memory limit. " +
			"The kernel's OOM killer terminates the process to free up memory.",

		PatternDBConnectionFailure: "Database connection failure indicates the application cannot establish a " +
			"connection to its database, often due to network issues, credentials, or database unavailability.",

		PatternDNSFailure: "DNS failure means the application cannot resolve domain names to IP addresses, " +
			"preventing it from connecting to services.",

		PatternSchedulingFailure: "Scheduling failure occurs when Kubernetes cannot find a suitable node to run " +
			"the pod, usually due to resource constraints or scheduling rules.",

		PatternImagePullFailure: "Image pull failure happens when Kubernetes cannot download the container image " +
			"from the registry, often due to authentication, network, or image existence issues.",

		PatternCrashLoop: "Crash loop occurs when a container repeatedly starts and crashes, usually due to " +
			"application errors, missing configuration, or dependency failures.",

		PatternResourceExhaustion: "Resource exhaustion indicates the cluster or node has insufficient CPU, " +
			"memory, or other resources to run workloads.",

		PatternDependencyFailure: "Dependency failure means the application cannot connect to one or more of its " +
			"required external services or dependencies.",

		PatternUnknown: "The root cause pattern could not be identified from available signals. " +
			"Manual investigation may be required.",
	}

	if explanation, ok := explanations[pattern]; ok {
		return explanation
	}

	return "No explanation available for this pattern."
}

// GetSupportedPatterns returns a list of all supported correlation patterns
func (engine *RCAEngine) GetSupportedPatterns() []CorrelationPattern {
	return []CorrelationPattern{
		PatternNodePreemption,
		PatternGracefulShutdownFail,
		PatternOOMKill,
		PatternCrashLoop,
		PatternDBConnectionFailure,
		PatternDNSFailure,
		PatternImagePullFailure,
		PatternSchedulingFailure,
		PatternResourceExhaustion,
		PatternDependencyFailure,
	}
}

// GenerateRCASummary creates a brief summary of an RCA (useful for dashboards/CLI)
func (engine *RCAEngine) GenerateRCASummary(rca *RootCauseAnalysis) string {
	if rca == nil {
		return "No RCA available"
	}

	return fmt.Sprintf(
		"[%s] %s (Confidence: %.0f%%) - %d fix suggestion(s) available",
		rca.CorrelationResult.CorrelationPattern,
		rca.Title,
		rca.ConfidenceScore,
		len(rca.FixSuggestions),
	)
}
