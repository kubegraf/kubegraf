// Copyright 2025 KubeGraf Contributors
// SPDX-License-Identifier: Apache-2.0

package main

import (
	"fmt"
	"strings"
	"time"
)

// RCAGenerator generates human-readable root cause analyses
type RCAGenerator struct {
	app *App
}

// NewRCAGenerator creates a new RCA generator
func NewRCAGenerator(app *App) *RCAGenerator {
	return &RCAGenerator{
		app: app,
	}
}

// GenerateRCA generates a complete RCA from correlation results
func (rg *RCAGenerator) GenerateRCA(incidentID string, correlation *CorrelationResult, signals []Signal) *RootCauseAnalysis {
	rca := &RootCauseAnalysis{
		ID:                fmt.Sprintf("rca-%s", incidentID),
		IncidentID:        incidentID,
		CorrelationResult: correlation,
		GeneratedAt:       time.Now(),
	}

	// Generate RCA based on correlation pattern
	switch correlation.CorrelationPattern {
	case PatternNodePreemption:
		rg.generateNodePreemptionRCA(rca, correlation, signals)
	case PatternGracefulShutdownFail:
		rg.generateGracefulShutdownRCA(rca, correlation, signals)
	case PatternOOMKill:
		rg.generateOOMKillRCA(rca, correlation, signals)
	case PatternDBConnectionFailure:
		rg.generateDBConnectionRCA(rca, correlation, signals)
	case PatternDNSFailure:
		rg.generateDNSFailureRCA(rca, correlation, signals)
	case PatternSchedulingFailure:
		rg.generateSchedulingFailureRCA(rca, correlation, signals)
	case PatternImagePullFailure:
		rg.generateImagePullRCA(rca, correlation, signals)
	case PatternCrashLoop:
		rg.generateCrashLoopRCA(rca, correlation, signals)
	default:
		rg.generateGenericRCA(rca, correlation, signals)
	}

	// Build evidence list
	rca.Evidence = rg.buildEvidence(correlation, signals)

	// Calculate impact
	rca.Impact = rg.calculateImpact(correlation, signals)

	// Calculate confidence score (0-100)
	rca.ConfidenceScore = correlation.ConfidenceScore * 100

	return rca
}

// generateNodePreemptionRCA generates RCA for node preemption scenarios
func (rg *RCAGenerator) generateNodePreemptionRCA(rca *RootCauseAnalysis, correlation *CorrelationResult, signals []Signal) {
	nodeName := ""
	podName := ""
	rescheduleTime := 0.0

	if correlation.PrimaryTrigger != nil {
		nodeName = correlation.PrimaryTrigger.Resource.Name
	}

	// Find pod details and reschedule info
	for _, sig := range correlation.SecondarySymptoms {
		if sig.Type == SignalTypePodTerminated || sig.Type == SignalTypePodEvicted {
			podName = sig.Resource.Name
		}
		if sig.Type == SignalTypePodRestart {
			if correlation.PrimaryTrigger != nil {
				rescheduleTime = sig.Timestamp.Sub(correlation.PrimaryTrigger.Timestamp).Seconds()
			}
		}
	}

	// Check if this was a spot/preemptible node
	isSpot := false
	for _, sig := range correlation.RelatedSignals {
		if sig.Type == SignalTypeNodePreempted {
			if metadata, ok := sig.Metadata["taintKey"].(string); ok {
				if strings.Contains(strings.ToLower(metadata), "preempt") || strings.Contains(strings.ToLower(metadata), "spot") {
					isSpot = true
					break
				}
			}
		}
	}

	rca.Title = fmt.Sprintf("Pod restarted due to node %s", func() string {
		if isSpot {
			return "preemption (Spot/Preemptible)"
		}
		return "termination"
	}())

	spotInfo := ""
	if isSpot {
		spotInfo = " This was a Spot/Preemptible node which can be terminated with short notice by the cloud provider."
	}

	rca.RootCause = fmt.Sprintf(
		"Pod %s restarted because its host node %s was terminated.%s The pod was deleted and rescheduled to a new node after %.0f seconds.",
		podName, nodeName, spotInfo, rescheduleTime,
	)

	// Build confidence reasoning
	confidenceFactors := []string{}
	if correlation.PrimaryTrigger != nil {
		confidenceFactors = append(confidenceFactors, "node termination event detected")
	}
	if len(correlation.SecondarySymptoms) > 0 {
		confidenceFactors = append(confidenceFactors, "pod deletion and rescheduling observed")
	}
	if rescheduleTime > 0 && rescheduleTime < 120 {
		confidenceFactors = append(confidenceFactors, "events occurred within expected timeframe (< 2 minutes)")
	}

	rca.ConfidenceReason = fmt.Sprintf("High confidence due to: %s", strings.Join(confidenceFactors, ", "))

	if !isSpot {
		rca.Assumptions = []string{
			"Node termination was not user-initiated (if it was, this is expected behavior)",
			"No cluster autoscaler activity was involved",
		}
	}
}

// generateGracefulShutdownRCA generates RCA for graceful shutdown failures
func (rg *RCAGenerator) generateGracefulShutdownRCA(rca *RootCauseAnalysis, correlation *CorrelationResult, signals []Signal) {
	containerName := ""
	gracePeriod := int64(30)
	actualDuration := 0.0

	if correlation.PrimaryTrigger != nil {
		if meta, ok := correlation.PrimaryTrigger.Metadata["container"].(string); ok {
			containerName = meta
		}
		if meta, ok := correlation.PrimaryTrigger.Metadata["terminationGracePeriod"].(int64); ok {
			gracePeriod = meta
		}
		if meta, ok := correlation.PrimaryTrigger.Metadata["duration"].(float64); ok {
			actualDuration = meta
		}
	}

	rca.Title = "Container force-killed due to graceful shutdown timeout"

	rca.RootCause = fmt.Sprintf(
		"Container %s was force-killed (SIGKILL) because it did not exit within the termination grace period of %d seconds. "+
			"The container ran for %.0f seconds after receiving SIGTERM, exceeding the grace period. "+
			"This indicates the application is not handling SIGTERM properly or has a long shutdown process.",
		containerName, gracePeriod, actualDuration,
	)

	rca.ConfidenceReason = fmt.Sprintf(
		"High confidence: container exit code 137 (SIGKILL) observed, and shutdown duration (%.0fs) exceeded grace period (%ds)",
		actualDuration, gracePeriod,
	)

	rca.Assumptions = []string{
		"The application has preStop hooks or shutdown handlers that are taking too long",
		"SIGTERM signal was properly delivered to the application",
	}
}

// generateOOMKillRCA generates RCA for OOM kill scenarios
func (rg *RCAGenerator) generateOOMKillRCA(rca *RootCauseAnalysis, correlation *CorrelationResult, signals []Signal) {
	containerName := ""
	restartCount := 0

	if correlation.PrimaryTrigger != nil {
		if meta, ok := correlation.PrimaryTrigger.Metadata["container"].(string); ok {
			containerName = meta
		}
	}

	// Count restarts
	for _, sig := range correlation.SecondarySymptoms {
		if sig.Type == SignalTypePodRestart {
			restartCount++
		}
	}

	rca.Title = "Container killed due to out-of-memory (OOM)"

	rca.RootCause = fmt.Sprintf(
		"Container %s was killed by the OOM killer because it exceeded its memory limit. "+
			"This happens when the container tries to allocate more memory than its resource limit allows. "+
			"The container has restarted %d time(s) due to this issue.",
		containerName, restartCount,
	)

	rca.ConfidenceReason = "Very high confidence: OOMKilled termination reason is definitive evidence of memory exhaustion"

	rca.Assumptions = []string{
		"Container memory limits are set appropriately (not artificially low)",
		"Application has a genuine memory leak or high memory usage pattern",
	}
}

// generateDBConnectionRCA generates RCA for database connection failures
func (rg *RCAGenerator) generateDBConnectionRCA(rca *RootCauseAnalysis, correlation *CorrelationResult, signals []Signal) {
	errorMessage := ""
	hasCrashLoop := false

	if correlation.PrimaryTrigger != nil {
		errorMessage = correlation.PrimaryTrigger.Message
	}

	for _, sig := range correlation.SecondarySymptoms {
		if sig.Type == SignalTypePodCrashLoop {
			hasCrashLoop = true
			break
		}
	}

	rca.Title = "Application failing due to database connection issues"

	crashLoopInfo := ""
	if hasCrashLoop {
		crashLoopInfo = " The application is in CrashLoopBackOff because it cannot start without a database connection."
	}

	rca.RootCause = fmt.Sprintf(
		"Application cannot connect to its database dependency. Error: %s.%s "+
			"This is typically caused by: database unavailability, incorrect connection configuration, network issues, or authentication problems.",
		errorMessage, crashLoopInfo,
	)

	confidence := "High"
	if hasCrashLoop {
		confidence = "Very high"
	}

	rca.ConfidenceReason = fmt.Sprintf(
		"%s confidence: database connection errors detected in logs/events%s",
		confidence,
		func() string {
			if hasCrashLoop {
				return " combined with CrashLoopBackOff pattern"
			}
			return ""
		}(),
	)

	rca.Assumptions = []string{
		"Database connection string and credentials are configured correctly",
		"Network policies allow traffic to database",
		"Database service is running in expected location",
	}
}

// generateDNSFailureRCA generates RCA for DNS failures
func (rg *RCAGenerator) generateDNSFailureRCA(rca *RootCauseAnalysis, correlation *CorrelationResult, signals []Signal) {
	errorMessage := ""

	if correlation.PrimaryTrigger != nil {
		errorMessage = correlation.PrimaryTrigger.Message
	}

	rca.Title = "Application experiencing DNS resolution failures"

	rca.RootCause = fmt.Sprintf(
		"Application cannot resolve DNS names. Error: %s. "+
			"This prevents the application from connecting to its dependencies. "+
			"Common causes include: CoreDNS issues, network policy blocking port 53, or incorrect service names.",
		errorMessage,
	)

	rca.ConfidenceReason = "High confidence: DNS resolution errors detected in logs/events"

	rca.Assumptions = []string{
		"CoreDNS pods are running and healthy",
		"Application is using correct service names",
		"Network policies allow DNS traffic (UDP/TCP port 53)",
	}
}

// generateSchedulingFailureRCA generates RCA for scheduling failures
func (rg *RCAGenerator) generateSchedulingFailureRCA(rca *RootCauseAnalysis, correlation *CorrelationResult, signals []Signal) {
	reason := ""
	hasNodePressure := false

	if correlation.PrimaryTrigger != nil {
		reason = correlation.PrimaryTrigger.Message
	}

	for _, sig := range correlation.RelatedSignals {
		if sig.Type == SignalTypeNodePressure {
			hasNodePressure = true
			break
		}
	}

	rca.Title = "Pod cannot be scheduled to any node"

	pressureInfo := ""
	if hasNodePressure {
		pressureInfo = " Node pressure conditions were also detected, indicating cluster resource constraints."
	}

	rca.RootCause = fmt.Sprintf(
		"Kubernetes scheduler cannot find a suitable node for this pod. Reason: %s.%s "+
			"This is typically caused by: insufficient cluster resources, node affinity/anti-affinity constraints, "+
			"taints without matching tolerations, or topology spread constraints.",
		reason, pressureInfo,
	)

	rca.ConfidenceReason = "High confidence: FailedScheduling events and Pending pod status observed"

	rca.Assumptions = []string{
		"Scheduling constraints (affinity, tolerations) are intentional",
		"Cluster has not autoscaled to accommodate workload",
	}
}

// generateImagePullRCA generates RCA for image pull failures
func (rg *RCAGenerator) generateImagePullRCA(rca *RootCauseAnalysis, correlation *CorrelationResult, signals []Signal) {
	errorMessage := ""

	if correlation.PrimaryTrigger != nil {
		errorMessage = correlation.PrimaryTrigger.Message
	}

	rca.Title = "Pod cannot pull container image"

	rca.RootCause = fmt.Sprintf(
		"Container image cannot be pulled. Error: %s. "+
			"This prevents the pod from starting. "+
			"Common causes include: image doesn't exist, authentication failure, network issues, or registry unavailability.",
		errorMessage,
	)

	rca.ConfidenceReason = "Very high confidence: ImagePullBackOff status is definitive evidence of image pull failure"

	rca.Assumptions = []string{
		"Image name and tag are correct",
		"Registry credentials (if private) are properly configured",
		"Network allows access to container registry",
	}
}

// generateCrashLoopRCA generates RCA for crash loop scenarios
func (rg *RCAGenerator) generateCrashLoopRCA(rca *RootCauseAnalysis, correlation *CorrelationResult, signals []Signal) {
	containerName := ""
	restartCount := 0

	if correlation.PrimaryTrigger != nil {
		if meta, ok := correlation.PrimaryTrigger.Metadata["container"].(string); ok {
			containerName = meta
		}
		if meta, ok := correlation.PrimaryTrigger.Metadata["restartCount"].(int); ok {
			restartCount = meta
		}
	}

	rca.Title = "Container is crash looping"

	rca.RootCause = fmt.Sprintf(
		"Container %s is repeatedly crashing (%d restarts). "+
			"The container starts but exits shortly after, triggering Kubernetes to restart it with exponential backoff. "+
			"This indicates an application-level issue such as: startup errors, missing dependencies, configuration problems, or unhandled exceptions.",
		containerName, restartCount,
	)

	rca.ConfidenceReason = fmt.Sprintf(
		"High confidence: CrashLoopBackOff status with %d restarts observed",
		restartCount,
	)

	rca.Assumptions = []string{
		"Container logs contain detailed error messages explaining the crash",
		"Application configuration (ConfigMaps, Secrets) is mounted correctly",
	}
}

// generateGenericRCA generates a generic RCA when pattern is unknown
func (rg *RCAGenerator) generateGenericRCA(rca *RootCauseAnalysis, correlation *CorrelationResult, signals []Signal) {
	rca.Title = "Incident detected - multiple signals observed"

	signalTypes := make(map[SignalType]int)
	for _, sig := range signals {
		signalTypes[sig.Type]++
	}

	signalSummary := []string{}
	for sigType, count := range signalTypes {
		signalSummary = append(signalSummary, fmt.Sprintf("%s (%d)", sigType, count))
	}

	rca.RootCause = fmt.Sprintf(
		"Multiple signals detected: %s. "+
			"Unable to determine a specific root cause pattern. Manual investigation recommended.",
		strings.Join(signalSummary, ", "),
	)

	rca.ConfidenceReason = "Low confidence: no clear correlation pattern identified"

	rca.Assumptions = []string{
		"Additional context or logs may be needed for root cause identification",
	}
}

// buildEvidence builds evidence list from signals
func (rg *RCAGenerator) buildEvidence(correlation *CorrelationResult, signals []Signal) []Evidence {
	evidence := []Evidence{}

	// Add primary trigger as evidence
	if correlation.PrimaryTrigger != nil {
		evidence = append(evidence, Evidence{
			Type:        "Primary Trigger",
			Description: fmt.Sprintf("%s: %s", correlation.PrimaryTrigger.Type, correlation.PrimaryTrigger.Message),
			Timestamp:   correlation.PrimaryTrigger.Timestamp,
			Source:      correlation.PrimaryTrigger.Source,
			Details:     correlation.PrimaryTrigger.Metadata,
		})
	}

	// Add secondary symptoms
	for _, symptom := range correlation.SecondarySymptoms {
		evidence = append(evidence, Evidence{
			Type:        "Secondary Symptom",
			Description: fmt.Sprintf("%s: %s", symptom.Type, symptom.Message),
			Timestamp:   symptom.Timestamp,
			Source:      symptom.Source,
			Details:     symptom.Metadata,
		})
	}

	// Add key related signals
	for _, sig := range correlation.RelatedSignals {
		evidence = append(evidence, Evidence{
			Type:        "Related Signal",
			Description: fmt.Sprintf("%s: %s", sig.Type, sig.Message),
			Timestamp:   sig.Timestamp,
			Source:      sig.Source,
			Details:     sig.Metadata,
		})
	}

	return evidence
}

// calculateImpact calculates the impact of the incident
func (rg *RCAGenerator) calculateImpact(correlation *CorrelationResult, signals []Signal) Impact {
	// Find affected resources
	resourceMap := make(map[string]ResourceReference)
	for _, sig := range signals {
		key := fmt.Sprintf("%s/%s/%s", sig.Resource.Kind, sig.Resource.Namespace, sig.Resource.Name)
		resourceMap[key] = sig.Resource
	}

	affectedResources := make([]ResourceReference, 0, len(resourceMap))
	for _, resource := range resourceMap {
		affectedResources = append(affectedResources, resource)
	}

	// Calculate downtime
	startTime := correlation.Timeline.StartTime
	endTime := correlation.Timeline.EndTime
	downtimeSeconds := endTime.Sub(startTime).Seconds()

	// Check if resolved
	var resolvedTime *time.Time
	for i := len(signals) - 1; i >= 0; i-- {
		if signals[i].Type == SignalTypePodRestart {
			t := signals[i].Timestamp
			resolvedTime = &t
			break
		}
	}

	description := fmt.Sprintf(
		"%d resource(s) affected with %.0f seconds of downtime",
		len(affectedResources),
		downtimeSeconds,
	)

	return Impact{
		AffectedResources: affectedResources,
		DowntimeSeconds:   downtimeSeconds,
		StartTime:         startTime,
		EndTime:           resolvedTime,
		Description:       description,
	}
}
