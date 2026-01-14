// Copyright 2025 KubeGraf Contributors
// SPDX-License-Identifier: Apache-2.0

package main

import (
	"fmt"
	"strings"
	"time"
)

// CorrelationEngine correlates signals to identify root causes
type CorrelationEngine struct {
	app *App
}

// NewCorrelationEngine creates a new correlation engine
func NewCorrelationEngine(app *App) *CorrelationEngine {
	return &CorrelationEngine{
		app: app,
	}
}

// CorrelateSignals analyzes signals and identifies root cause patterns
func (ce *CorrelationEngine) CorrelateSignals(incidentID string, signals []Signal) *CorrelationResult {
	if len(signals) == 0 {
		return &CorrelationResult{
			ConfidenceScore: 0.0,
			CorrelationPattern: PatternUnknown,
		}
	}

	// Build timeline
	timeline := ce.buildTimeline(incidentID, signals)

	// Try to identify correlation patterns (in order of specificity)
	patterns := []func([]Signal) *CorrelationResult{
		ce.detectNodePreemption,
		ce.detectGracefulShutdownFailure,
		ce.detectOOMKill,
		ce.detectDBConnectionFailure,
		ce.detectDNSFailure,
		ce.detectSchedulingFailure,
		ce.detectImagePullFailure,
		ce.detectCrashLoop,
	}

	for _, detector := range patterns {
		if result := detector(signals); result != nil {
			result.Timeline = timeline
			return result
		}
	}

	// No specific pattern detected - return generic result
	return &CorrelationResult{
		Timeline:           timeline,
		ConfidenceScore:    0.3,
		CorrelationPattern: PatternUnknown,
		PrimaryTrigger:     &signals[0],
		RelatedSignals:     signals,
	}
}

// buildTimeline creates a timeline from signals
func (ce *CorrelationEngine) buildTimeline(incidentID string, signals []Signal) Timeline {
	if len(signals) == 0 {
		return Timeline{
			IncidentID: incidentID,
			Signals:    []Signal{},
		}
	}

	startTime := signals[0].Timestamp
	endTime := signals[len(signals)-1].Timestamp

	return Timeline{
		IncidentID: incidentID,
		StartTime:  startTime,
		EndTime:    endTime,
		Signals:    signals,
		Duration:   endTime.Sub(startTime).Seconds(),
	}
}

// detectNodePreemption detects node preemption/termination patterns
func (ce *CorrelationEngine) detectNodePreemption(signals []Signal) *CorrelationResult {
	var nodeTerminated *Signal
	var podDeleted *Signal
	var podRescheduled *Signal
	relatedSignals := []Signal{}
	symptoms := []Signal{}

	for i := range signals {
		sig := &signals[i]

		switch sig.Type {
		case SignalTypeNodeTerminated, SignalTypeNodePreempted, SignalTypeNodeNotReady:
			nodeTerminated = sig
			relatedSignals = append(relatedSignals, *sig)
		case SignalTypePodTerminated, SignalTypePodEvicted:
			podDeleted = sig
			symptoms = append(symptoms, *sig)
		case SignalTypePodRestart:
			// Check if this is a reschedule (pod restarted after node termination)
			if nodeTerminated != nil && sig.Timestamp.After(nodeTerminated.Timestamp) {
				podRescheduled = sig
				symptoms = append(symptoms, *sig)
			}
		}
	}

	// Node preemption pattern: node terminated -> pod deleted -> pod rescheduled
	if nodeTerminated != nil {
		confidence := 0.7

		// High confidence if we see the full chain
		if podDeleted != nil {
			confidence = 0.85
		}
		if podRescheduled != nil {
			confidence = 0.95
		}

		// Check timing - events should be close together
		if podDeleted != nil && nodeTerminated != nil {
			timeDiff := podDeleted.Timestamp.Sub(nodeTerminated.Timestamp).Seconds()
			if timeDiff < 60 { // Within 60 seconds
				confidence += 0.05
			}
		}

		return &CorrelationResult{
			PrimaryTrigger:     nodeTerminated,
			SecondarySymptoms:  symptoms,
			RelatedSignals:     relatedSignals,
			ConfidenceScore:    confidence,
			CorrelationPattern: PatternNodePreemption,
		}
	}

	return nil
}

// detectGracefulShutdownFailure detects graceful shutdown failures
func (ce *CorrelationEngine) detectGracefulShutdownFailure(signals []Signal) *CorrelationResult {
	var sigkillSignal *Signal
	relatedSignals := []Signal{}
	symptoms := []Signal{}

	for i := range signals {
		sig := &signals[i]

		if sig.Type == SignalTypeGracefulShutdown {
			sigkillSignal = sig
			relatedSignals = append(relatedSignals, *sig)
		} else if sig.Type == SignalTypePodTerminated {
			symptoms = append(symptoms, *sig)
		}
	}

	if sigkillSignal != nil {
		confidence := 0.8

		// Check if grace period was exceeded
		if metadata, ok := sigkillSignal.Metadata["terminationGracePeriod"].(int64); ok {
			gracePeriod := metadata
			if duration, ok := sigkillSignal.Metadata["duration"].(float64); ok {
				if duration > float64(gracePeriod) {
					confidence = 0.95 // Very high confidence
				}
			}
		}

		return &CorrelationResult{
			PrimaryTrigger:     sigkillSignal,
			SecondarySymptoms:  symptoms,
			RelatedSignals:     relatedSignals,
			ConfidenceScore:    confidence,
			CorrelationPattern: PatternGracefulShutdownFail,
		}
	}

	return nil
}

// detectOOMKill detects OOM kill patterns
func (ce *CorrelationEngine) detectOOMKill(signals []Signal) *CorrelationResult {
	var oomSignal *Signal
	relatedSignals := []Signal{}
	symptoms := []Signal{}

	for i := range signals {
		sig := &signals[i]

		if sig.Type == SignalTypePodOOMKilled {
			oomSignal = sig
			relatedSignals = append(relatedSignals, *sig)
		} else if sig.Type == SignalTypePodRestart || sig.Type == SignalTypePodCrashLoop {
			symptoms = append(symptoms, *sig)
		}
	}

	if oomSignal != nil {
		return &CorrelationResult{
			PrimaryTrigger:     oomSignal,
			SecondarySymptoms:  symptoms,
			RelatedSignals:     relatedSignals,
			ConfidenceScore:    0.99, // Very high confidence for OOM
			CorrelationPattern: PatternOOMKill,
		}
	}

	return nil
}

// detectDBConnectionFailure detects database connection failures
func (ce *CorrelationEngine) detectDBConnectionFailure(signals []Signal) *CorrelationResult {
	var dbSignal *Signal
	var crashLoopSignal *Signal
	relatedSignals := []Signal{}
	symptoms := []Signal{}

	for i := range signals {
		sig := &signals[i]

		if sig.Type == SignalTypeDBConnection {
			dbSignal = sig
			relatedSignals = append(relatedSignals, *sig)
		} else if sig.Type == SignalTypePodCrashLoop || sig.Type == SignalTypePodRestart {
			crashLoopSignal = sig
			symptoms = append(symptoms, *sig)
		}
	}

	// Pattern: DB connection errors + crash loop = likely startup failure due to DB
	if dbSignal != nil && crashLoopSignal != nil {
		return &CorrelationResult{
			PrimaryTrigger:     dbSignal,
			SecondarySymptoms:  symptoms,
			RelatedSignals:     relatedSignals,
			ConfidenceScore:    0.85,
			CorrelationPattern: PatternDBConnectionFailure,
		}
	}

	// Just DB errors without crash loop (lower confidence)
	if dbSignal != nil {
		return &CorrelationResult{
			PrimaryTrigger:     dbSignal,
			SecondarySymptoms:  symptoms,
			RelatedSignals:     relatedSignals,
			ConfidenceScore:    0.65,
			CorrelationPattern: PatternDependencyFailure,
		}
	}

	return nil
}

// detectDNSFailure detects DNS resolution failures
func (ce *CorrelationEngine) detectDNSFailure(signals []Signal) *CorrelationResult {
	var dnsSignal *Signal
	relatedSignals := []Signal{}
	symptoms := []Signal{}

	for i := range signals {
		sig := &signals[i]

		if sig.Type == SignalTypeDNSFailure {
			dnsSignal = sig
			relatedSignals = append(relatedSignals, *sig)
		} else if sig.Type == SignalTypePodCrashLoop || sig.Type == SignalTypePodRestart {
			symptoms = append(symptoms, *sig)
		}
	}

	if dnsSignal != nil {
		confidence := 0.75
		if len(symptoms) > 0 {
			confidence = 0.85
		}

		return &CorrelationResult{
			PrimaryTrigger:     dnsSignal,
			SecondarySymptoms:  symptoms,
			RelatedSignals:     relatedSignals,
			ConfidenceScore:    confidence,
			CorrelationPattern: PatternDNSFailure,
		}
	}

	return nil
}

// detectSchedulingFailure detects pod scheduling failures
func (ce *CorrelationEngine) detectSchedulingFailure(signals []Signal) *CorrelationResult {
	var schedulingSignal *Signal
	var pendingSignal *Signal
	relatedSignals := []Signal{}
	symptoms := []Signal{}

	// Analyze scheduling failure reasons
	var isAffinityIssue bool
	var affinityType string // "anti-affinity" or "affinity"
	var failureReason string

	for i := range signals {
		sig := &signals[i]

		if sig.Type == SignalTypeSchedulingFailure {
			schedulingSignal = sig
			relatedSignals = append(relatedSignals, *sig)

			// Check if this is an affinity-related scheduling failure
			if msg, ok := sig.Metadata["message"].(string); ok {
				msgLower := strings.ToLower(msg)
				if strings.Contains(msgLower, "didn't match pod anti-affinity") ||
					strings.Contains(msgLower, "pod anti-affinity") ||
					strings.Contains(msgLower, "violates pod anti-affinity") ||
					strings.Contains(msgLower, "anti-affinity rules") {
					isAffinityIssue = true
					affinityType = "anti-affinity"
					failureReason = "Pod anti-affinity rules prevent scheduling"
				} else if strings.Contains(msgLower, "didn't match pod affinity") ||
					strings.Contains(msgLower, "pod affinity") ||
					strings.Contains(msgLower, "violates pod affinity") {
					isAffinityIssue = true
					affinityType = "affinity"
					failureReason = "Pod affinity rules prevent scheduling"
				} else if strings.Contains(msgLower, "insufficient") {
					if strings.Contains(msgLower, "cpu") {
						failureReason = "Insufficient CPU resources"
					} else if strings.Contains(msgLower, "memory") {
						failureReason = "Insufficient memory resources"
					} else {
						failureReason = "Insufficient resources"
					}
				} else if strings.Contains(msgLower, "taint") {
					failureReason = "Node taints prevent scheduling"
				}
			}
		} else if sig.Type == SignalTypePodPending {
			pendingSignal = sig
			symptoms = append(symptoms, *sig)
		} else if sig.Type == SignalTypeNodePressure {
			relatedSignals = append(relatedSignals, *sig)
		} else if sig.Type == SignalTypeEvent {
			// Check events for additional affinity context
			if msg, ok := sig.Metadata["message"].(string); ok {
				msgLower := strings.ToLower(msg)
				if strings.Contains(msgLower, "anti-affinity") && !isAffinityIssue {
					isAffinityIssue = true
					affinityType = "anti-affinity"
					failureReason = "Pod anti-affinity rules prevent scheduling"
				}
			}
		}
	}

	if schedulingSignal != nil || pendingSignal != nil {
		primary := schedulingSignal
		if primary == nil {
			primary = pendingSignal
		}

		confidence := 0.80
		if schedulingSignal != nil && pendingSignal != nil {
			confidence = 0.90
		}

		// Increase confidence if we identified specific affinity issues
		if isAffinityIssue {
			confidence = 0.85
			if schedulingSignal != nil && pendingSignal != nil {
				confidence = 0.95
			}
		}

		// Enhance metadata with affinity information
		if primary.Metadata == nil {
			primary.Metadata = make(map[string]interface{})
		}
		primary.Metadata["isAffinityIssue"] = isAffinityIssue
		primary.Metadata["affinityType"] = affinityType
		primary.Metadata["failureReason"] = failureReason

		return &CorrelationResult{
			PrimaryTrigger:     primary,
			SecondarySymptoms:  symptoms,
			RelatedSignals:     relatedSignals,
			ConfidenceScore:    confidence,
			CorrelationPattern: PatternSchedulingFailure,
		}
	}

	return nil
}

// detectImagePullFailure detects image pull failures
func (ce *CorrelationEngine) detectImagePullFailure(signals []Signal) *CorrelationResult {
	var imagePullSignal *Signal
	relatedSignals := []Signal{}

	for i := range signals {
		sig := &signals[i]

		if sig.Type == SignalTypePodImagePull {
			imagePullSignal = sig
			relatedSignals = append(relatedSignals, *sig)
			break
		}
	}

	if imagePullSignal != nil {
		return &CorrelationResult{
			PrimaryTrigger:     imagePullSignal,
			SecondarySymptoms:  []Signal{},
			RelatedSignals:     relatedSignals,
			ConfidenceScore:    0.95,
			CorrelationPattern: PatternImagePullFailure,
		}
	}

	return nil
}

// detectCrashLoop detects crash loop patterns
func (ce *CorrelationEngine) detectCrashLoop(signals []Signal) *CorrelationResult {
	var crashLoopSignal *Signal
	var restartSignals []Signal
	relatedSignals := []Signal{}

	for i := range signals {
		sig := &signals[i]

		if sig.Type == SignalTypePodCrashLoop {
			crashLoopSignal = sig
			relatedSignals = append(relatedSignals, *sig)
		} else if sig.Type == SignalTypePodRestart {
			restartSignals = append(restartSignals, *sig)
		}
	}

	if crashLoopSignal != nil {
		// Calculate confidence based on restart frequency
		confidence := 0.75
		if len(restartSignals) >= 5 {
			confidence = 0.90
		}

		return &CorrelationResult{
			PrimaryTrigger:     crashLoopSignal,
			SecondarySymptoms:  restartSignals,
			RelatedSignals:     relatedSignals,
			ConfidenceScore:    confidence,
			CorrelationPattern: PatternCrashLoop,
		}
	}

	return nil
}

// CalculateDowntime calculates the downtime duration from signals
func (ce *CorrelationEngine) CalculateDowntime(signals []Signal) (float64, time.Time, *time.Time) {
	if len(signals) == 0 {
		return 0, time.Now(), nil
	}

	// Find first failure signal
	startTime := signals[0].Timestamp

	// Find last signal (could be ongoing)
	endTime := signals[len(signals)-1].Timestamp

	// Check if incident is resolved (look for pod restart or recovery)
	var resolvedTime *time.Time
	for i := len(signals) - 1; i >= 0; i-- {
		if signals[i].Type == SignalTypePodRestart {
			t := signals[i].Timestamp
			resolvedTime = &t
			endTime = t
			break
		}
	}

	downtime := endTime.Sub(startTime).Seconds()
	return downtime, startTime, resolvedTime
}

// FindAffectedResources identifies all affected resources from signals
func (ce *CorrelationEngine) FindAffectedResources(signals []Signal) []ResourceReference {
	resourceMap := make(map[string]ResourceReference)

	for _, signal := range signals {
		key := fmt.Sprintf("%s/%s/%s", signal.Resource.Kind, signal.Resource.Namespace, signal.Resource.Name)
		resourceMap[key] = signal.Resource
	}

	resources := make([]ResourceReference, 0, len(resourceMap))
	for _, resource := range resourceMap {
		resources = append(resources, resource)
	}

	return resources
}
