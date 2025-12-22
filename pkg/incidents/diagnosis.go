// Copyright 2025 KubeGraf Contributors
// SPDX-License-Identifier: Apache-2.0

package incidents

import (
	"fmt"
	"sort"
	"time"
)

// DiagnosisGenerator generates diagnoses from matched patterns and symptoms.
type DiagnosisGenerator struct {
	templates map[FailurePattern]DiagnosisTemplate
}

// DiagnosisTemplate contains templates for generating diagnoses.
type DiagnosisTemplate struct {
	SummaryFormat   string
	ProbableCauses  []string
	EvidenceFormat  string
}

// NewDiagnosisGenerator creates a new diagnosis generator.
func NewDiagnosisGenerator() *DiagnosisGenerator {
	return &DiagnosisGenerator{
		templates: defaultDiagnosisTemplates(),
	}
}

// GenerateDiagnosis creates a diagnosis from a pattern match and symptoms.
func (g *DiagnosisGenerator) GenerateDiagnosis(
	resource KubeResourceRef,
	match *PatternMatch,
	symptoms []*Symptom,
) *Diagnosis {
	if match == nil {
		return g.generateUnknownDiagnosis(resource, symptoms)
	}

	template, exists := g.templates[match.Pattern]
	if !exists {
		return g.generateGenericDiagnosis(resource, match, symptoms)
	}

	// Build evidence from symptoms
	var evidence []string
	for _, s := range symptoms {
		for _, e := range s.Evidence {
			if e != "" {
				evidence = append(evidence, e)
			}
		}
	}

	// Deduplicate and limit evidence
	evidence = dedupStrings(evidence)
	if len(evidence) > 10 {
		evidence = evidence[:10]
	}

	// Format summary with resource info
	summary := fmt.Sprintf(template.SummaryFormat,
		resource.Kind,
		resource.Name,
		resource.Namespace,
	)

	// Customize causes based on symptoms
	causes := g.customizeCauses(template.ProbableCauses, symptoms)

	return &Diagnosis{
		Summary:        summary,
		ProbableCauses: causes,
		Confidence:     match.Confidence,
		Evidence:       evidence,
		GeneratedAt:    time.Now(),
	}
}

// generateUnknownDiagnosis creates a diagnosis when no pattern matches.
func (g *DiagnosisGenerator) generateUnknownDiagnosis(resource KubeResourceRef, symptoms []*Symptom) *Diagnosis {
	var evidence []string
	for _, s := range symptoms {
		evidence = append(evidence, s.Description)
	}

	return &Diagnosis{
		Summary: fmt.Sprintf(
			"Unclassified issue detected on %s %s in namespace %s. Multiple symptoms present but no clear pattern identified.",
			resource.Kind,
			resource.Name,
			resource.Namespace,
		),
		ProbableCauses: []string{
			"Issue does not match known failure patterns",
			"Multiple unrelated issues may be occurring simultaneously",
			"Application-specific error requiring manual investigation",
		},
		Confidence:  0.30,
		Evidence:    evidence,
		GeneratedAt: time.Now(),
	}
}

// generateGenericDiagnosis creates a generic diagnosis for patterns without templates.
func (g *DiagnosisGenerator) generateGenericDiagnosis(
	resource KubeResourceRef,
	match *PatternMatch,
	symptoms []*Symptom,
) *Diagnosis {
	var evidence []string
	for _, s := range symptoms {
		evidence = append(evidence, s.Description)
	}

	patternMeta := GetPatternMetadata(match.Pattern)
	description := string(match.Pattern)
	if patternMeta != nil {
		description = patternMeta.Description
	}

	return &Diagnosis{
		Summary: fmt.Sprintf(
			"%s %s in namespace %s: %s",
			resource.Kind,
			resource.Name,
			resource.Namespace,
			description,
		),
		ProbableCauses: []string{
			description,
		},
		Confidence:  match.Confidence,
		Evidence:    evidence,
		GeneratedAt: time.Now(),
	}
}

// customizeCauses adjusts causes based on specific symptoms present.
func (g *DiagnosisGenerator) customizeCauses(baseCauses []string, symptoms []*Symptom) []string {
	causes := make([]string, len(baseCauses))
	copy(causes, baseCauses)

	// Add specific causes based on symptoms
	for _, s := range symptoms {
		switch s.Type {
		case SymptomHighRestartCount:
			if s.Value > 10 {
				causes = append(causes,
					fmt.Sprintf("Container has restarted %.0f times, indicating persistent failure", s.Value))
			}
		case SymptomExitCodeOOM:
			causes = append(causes,
				"Container memory limit is insufficient for the workload")
		case SymptomHTTP5xx:
			if s.Value >= 500 {
				httpCode := int(s.Value)
				switch httpCode {
				case 500:
					causes = append(causes, "Application internal error (HTTP 500)")
				case 502:
					causes = append(causes, "Upstream service not responding (HTTP 502)")
				case 503:
					causes = append(causes, "Service unavailable, possibly due to overload (HTTP 503)")
				case 504:
					causes = append(causes, "Upstream service timeout (HTTP 504)")
				}
			}
		case SymptomDNSResolutionFailed:
			causes = append(causes,
				"DNS resolution failure may indicate CoreDNS issues or network policy blocking DNS")
		case SymptomMissingSecret:
			causes = append(causes,
				"Required secret not found in namespace")
		case SymptomMissingConfigMap:
			causes = append(causes,
				"Required configmap not found in namespace")
		}
	}

	// Deduplicate and sort by relevance (first items are more relevant)
	return dedupStrings(causes)
}

// defaultDiagnosisTemplates returns the default diagnosis templates.
func defaultDiagnosisTemplates() map[FailurePattern]DiagnosisTemplate {
	return map[FailurePattern]DiagnosisTemplate{
		PatternCrashLoop: {
			SummaryFormat: "%s %s in namespace %s is in a CrashLoopBackOff state. The container is repeatedly crashing and being restarted by Kubernetes.",
			ProbableCauses: []string{
				"Application is crashing at startup due to configuration error",
				"Required dependency or service is unavailable",
				"Insufficient resources (memory/CPU) causing immediate termination",
				"Application bug causing immediate exit",
			},
		},
		PatternOOMPressure: {
			SummaryFormat: "%s %s in namespace %s was terminated due to Out of Memory (OOMKilled, exit code 137).",
			ProbableCauses: []string{
				"Container memory limit is too low for the workload",
				"Memory leak in the application",
				"Sudden spike in memory usage",
				"JVM heap not properly configured for container limits",
			},
		},
		PatternRestartStorm: {
			SummaryFormat: "%s %s in namespace %s is experiencing frequent restarts without entering CrashLoopBackOff.",
			ProbableCauses: []string{
				"Intermittent failures causing periodic crashes",
				"External dependency intermittently failing",
				"Resource pressure causing evictions",
				"Liveness probe configured too aggressively",
			},
		},
		PatternAppCrash: {
			SummaryFormat: "%s %s in namespace %s terminated unexpectedly with a non-zero exit code.",
			ProbableCauses: []string{
				"Unhandled exception in application code",
				"Failed assertion or panic",
				"Graceful shutdown handler not implemented",
			},
		},
		PatternNoReadyEndpoints: {
			SummaryFormat: "Service for %s %s in namespace %s has no ready endpoints. Traffic cannot be routed to any healthy pods.",
			ProbableCauses: []string{
				"All pods are failing readiness checks",
				"Pods are crashing before becoming ready",
				"Selector does not match any running pods",
				"Deployment scaled to zero replicas",
			},
			// NOTE: We list possible causes but do NOT assume causality.
			// We show facts: "Service has 0 endpoints" and "Pods are crashing"
			// but let the user connect the dots. We never say "Ingress down because app crashed".
		},
		PatternInternalErrors: {
			SummaryFormat: "%s %s in namespace %s is returning HTTP 5xx internal server errors.",
			ProbableCauses: []string{
				"Application error handling failure",
				"Database or cache connection issues",
				"Unhandled exception in request handler",
				"Configuration error in application",
			},
		},
		PatternUpstreamFailure: {
			SummaryFormat: "%s %s in namespace %s cannot reach upstream services.",
			ProbableCauses: []string{
				"Upstream service is down or not responding",
				"Network policy blocking communication",
				"Service name resolution failure",
				"Upstream service overloaded",
			},
		},
		PatternTimeouts: {
			SummaryFormat: "%s %s in namespace %s is experiencing request timeouts.",
			ProbableCauses: []string{
				"Slow response from dependencies",
				"Resource contention (CPU/memory)",
				"Network latency issues",
				"Database query performance issues",
			},
		},
		PatternImagePullFailure: {
			SummaryFormat: "%s %s in namespace %s failed to pull container image.",
			ProbableCauses: []string{
				"Image does not exist in registry",
				"Image pull secret not configured or invalid",
				"Network connectivity to registry blocked",
				"Registry rate limiting",
				"Typo in image name or tag",
			},
		},
		PatternConfigError: {
			SummaryFormat: "%s %s in namespace %s has a configuration error preventing container creation.",
			ProbableCauses: []string{
				"Invalid container configuration",
				"Referenced ConfigMap or Secret does not exist",
				"Volume mount configuration error",
				"Environment variable reference error",
			},
		},
		PatternSecretMissing: {
			SummaryFormat: "%s %s in namespace %s cannot start because a required Secret is missing.",
			ProbableCauses: []string{
				"Secret not created in namespace",
				"Secret name typo in pod spec",
				"Secret was deleted",
				"Secret not synced from external secrets manager",
			},
		},
		PatternDNSFailure: {
			SummaryFormat: "%s %s in namespace %s is experiencing DNS resolution failures.",
			ProbableCauses: []string{
				"CoreDNS pods are unhealthy",
				"Network policy blocking DNS traffic",
				"DNS cache corruption",
				"External DNS server unreachable",
			},
		},
		PatternPermissionDenied: {
			SummaryFormat: "%s %s in namespace %s received permission denied errors.",
			ProbableCauses: []string{
				"ServiceAccount lacks required RBAC permissions",
				"PodSecurityPolicy blocking container",
				"Security context not configured correctly",
			},
		},
		PatternLivenessFailure: {
			SummaryFormat: "%s %s in namespace %s is failing liveness probes and being restarted.",
			ProbableCauses: []string{
				"Application is deadlocked or unresponsive",
				"Liveness probe endpoint not implemented",
				"Probe timeout too short",
				"Application taking too long to respond",
			},
		},
		PatternReadinessFailure: {
			SummaryFormat: "%s %s in namespace %s is failing readiness probes and removed from service endpoints.",
			ProbableCauses: []string{
				"Application not ready to receive traffic",
				"Dependency health check failing",
				"Readiness endpoint returning errors",
				"Probe configuration incorrect",
			},
		},
		PatternStartupFailure: {
			SummaryFormat: "%s %s in namespace %s is failing startup probes.",
			ProbableCauses: []string{
				"Application taking too long to start",
				"Startup probe timeout too short",
				"Application failing during initialization",
				"Dependency not available at startup",
			},
		},
		PatternNodeNotReady: {
			SummaryFormat: "Node %s affecting resources in namespace %s is not ready.",
			ProbableCauses: []string{
				"Kubelet not running or unhealthy",
				"Node resource exhaustion",
				"Network connectivity issues",
				"Node maintenance or cordoned",
			},
		},
		PatternNodePressure: {
			SummaryFormat: "Node affecting %s %s in namespace %s is experiencing resource pressure.",
			ProbableCauses: []string{
				"Memory pressure causing pod evictions",
				"Disk pressure from logs or ephemeral storage",
				"PID exhaustion",
				"Node overcommitted",
			},
		},
		PatternDiskPressure: {
			SummaryFormat: "%s %s in namespace %s affected by disk pressure.",
			ProbableCauses: []string{
				"Disk full due to container logs",
				"Ephemeral storage limit exceeded",
				"Persistent volume full",
				"ImageGC not cleaning up unused images",
			},
		},
		PatternUnschedulable: {
			SummaryFormat: "%s %s in namespace %s cannot be scheduled to any node.",
			ProbableCauses: []string{
				"No nodes match pod's node selector or affinity",
				"All nodes have insufficient resources",
				"Taints prevent scheduling",
				"PersistentVolumeClaim not bound",
			},
		},
		PatternResourceExhausted: {
			SummaryFormat: "%s %s in namespace %s cannot run due to resource exhaustion.",
			ProbableCauses: []string{
				"Namespace resource quota exceeded",
				"Cluster capacity exhausted",
				"LimitRange prevents pod creation",
				"Node resources fully allocated",
			},
		},
	}
}

// dedupStrings removes duplicate strings while preserving order.
func dedupStrings(input []string) []string {
	seen := make(map[string]bool)
	var result []string
	for _, s := range input {
		if !seen[s] {
			seen[s] = true
			result = append(result, s)
		}
	}
	return result
}

// EnrichDiagnosis adds additional context to an existing diagnosis.
func (g *DiagnosisGenerator) EnrichDiagnosis(
	diagnosis *Diagnosis,
	additionalEvidence []string,
	relatedResources []KubeResourceRef,
) *Diagnosis {
	if diagnosis == nil {
		return nil
	}

	// Add additional evidence
	allEvidence := append(diagnosis.Evidence, additionalEvidence...)
	diagnosis.Evidence = dedupStrings(allEvidence)

	// Add related resource info to summary if multiple resources affected
	if len(relatedResources) > 0 {
		diagnosis.Summary += fmt.Sprintf(" Additionally affecting %d related resources.", len(relatedResources))
	}

	return diagnosis
}

// CalculateSeverity determines the overall severity based on symptoms and pattern.
func CalculateSeverity(pattern FailurePattern, symptoms []*Symptom, occurrences int) Severity {
	// Start with pattern's default severity
	patternMeta := GetPatternMetadata(pattern)
	baseSeverity := SeverityMedium
	if patternMeta != nil {
		baseSeverity = patternMeta.DefaultSeverity
	}

	// Find the highest severity from symptoms
	highestSymptomSeverity := SeverityInfo
	for _, s := range symptoms {
		if s.Severity.Weight() > highestSymptomSeverity.Weight() {
			highestSymptomSeverity = s.Severity
		}
	}

	// Take the higher of pattern default and symptom severity
	effectiveSeverity := baseSeverity
	if highestSymptomSeverity.Weight() > baseSeverity.Weight() {
		effectiveSeverity = highestSymptomSeverity
	}

	// Escalate based on occurrence count
	if occurrences >= 50 && effectiveSeverity.Weight() < SeverityCritical.Weight() {
		effectiveSeverity = SeverityCritical
	} else if occurrences >= 10 && effectiveSeverity.Weight() < SeverityHigh.Weight() {
		effectiveSeverity = SeverityHigh
	}

	return effectiveSeverity
}

// SortDiagnosesBySeverity sorts diagnoses by severity (most severe first).
func SortDiagnosesBySeverity(diagnoses []*Diagnosis) {
	sort.Slice(diagnoses, func(i, j int) bool {
		// Sort by confidence descending
		return diagnoses[i].Confidence > diagnoses[j].Confidence
	})
}

