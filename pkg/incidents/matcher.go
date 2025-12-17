// Copyright 2025 KubeGraf Contributors
// SPDX-License-Identifier: Apache-2.0

package incidents

import (
	"sort"
)

// PatternMatcher matches symptoms to failure patterns using deterministic rules.
type PatternMatcher struct {
	rules []PatternRule
}

// PatternRule defines a rule for matching symptoms to a pattern.
type PatternRule struct {
	// Pattern is the failure pattern this rule matches to
	Pattern FailurePattern
	// RequiredSymptoms are symptoms that MUST be present
	RequiredSymptoms []SymptomType
	// OptionalSymptoms are symptoms that boost confidence if present
	OptionalSymptoms []SymptomType
	// ExcludedSymptoms are symptoms that invalidate this pattern
	ExcludedSymptoms []SymptomType
	// MinRequired is the minimum number of required symptoms needed
	MinRequired int
	// BaseConfidence is the base confidence when required symptoms are met
	BaseConfidence float64
	// BoostPerOptional is the confidence boost per optional symptom
	BoostPerOptional float64
	// Priority for tie-breaking (lower = higher priority)
	Priority int
}

// PatternMatch represents a matched pattern with confidence.
type PatternMatch struct {
	Pattern         FailurePattern `json:"pattern"`
	Confidence      float64        `json:"confidence"`
	MatchedSymptoms []SymptomType  `json:"matchedSymptoms"`
	Evidence        []string       `json:"evidence"`
	Priority        int            `json:"priority"`
}

// NewPatternMatcher creates a new pattern matcher with default rules.
func NewPatternMatcher() *PatternMatcher {
	return &PatternMatcher{
		rules: defaultPatternRules(),
	}
}

// Match finds all patterns that match the given symptoms.
func (m *PatternMatcher) Match(symptoms []*Symptom) []PatternMatch {
	// Create a set of symptom types
	symptomSet := make(map[SymptomType][]string)
	for _, s := range symptoms {
		symptomSet[s.Type] = append(symptomSet[s.Type], s.Evidence...)
	}

	var matches []PatternMatch

	for _, rule := range m.rules {
		match := m.evaluateRule(rule, symptomSet)
		if match != nil {
			matches = append(matches, *match)
		}
	}

	// Sort by confidence (descending), then priority (ascending)
	sort.Slice(matches, func(i, j int) bool {
		if matches[i].Confidence != matches[j].Confidence {
			return matches[i].Confidence > matches[j].Confidence
		}
		return matches[i].Priority < matches[j].Priority
	})

	return matches
}

// MatchBest returns the best matching pattern, or nil if none match.
func (m *PatternMatcher) MatchBest(symptoms []*Symptom) *PatternMatch {
	matches := m.Match(symptoms)
	if len(matches) == 0 {
		return nil
	}
	return &matches[0]
}

// evaluateRule checks if a rule matches the symptoms.
func (m *PatternMatcher) evaluateRule(rule PatternRule, symptomSet map[SymptomType][]string) *PatternMatch {
	// Check for excluded symptoms first
	for _, excluded := range rule.ExcludedSymptoms {
		if _, exists := symptomSet[excluded]; exists {
			return nil
		}
	}

	// Count required symptoms present
	requiredCount := 0
	var matchedSymptoms []SymptomType
	var evidence []string

	for _, required := range rule.RequiredSymptoms {
		if ev, exists := symptomSet[required]; exists {
			requiredCount++
			matchedSymptoms = append(matchedSymptoms, required)
			evidence = append(evidence, ev...)
		}
	}

	// Check if minimum required symptoms are met
	minRequired := rule.MinRequired
	if minRequired == 0 {
		minRequired = len(rule.RequiredSymptoms)
	}
	if requiredCount < minRequired {
		return nil
	}

	// Calculate confidence
	confidence := rule.BaseConfidence

	// Boost confidence based on required symptom coverage
	if len(rule.RequiredSymptoms) > 0 {
		coverage := float64(requiredCount) / float64(len(rule.RequiredSymptoms))
		confidence *= coverage
	}

	// Boost for optional symptoms
	for _, optional := range rule.OptionalSymptoms {
		if ev, exists := symptomSet[optional]; exists {
			confidence += rule.BoostPerOptional
			matchedSymptoms = append(matchedSymptoms, optional)
			evidence = append(evidence, ev...)
		}
	}

	// Cap confidence at 1.0
	if confidence > 1.0 {
		confidence = 1.0
	}

	return &PatternMatch{
		Pattern:         rule.Pattern,
		Confidence:      confidence,
		MatchedSymptoms: matchedSymptoms,
		Evidence:        evidence,
		Priority:        rule.Priority,
	}
}

// defaultPatternRules returns the default pattern matching rules.
func defaultPatternRules() []PatternRule {
	return []PatternRule{
		// CRASHLOOP: High confidence when seeing crash loop symptoms
		{
			Pattern: PatternCrashLoop,
			RequiredSymptoms: []SymptomType{
				SymptomCrashLoopBackOff,
			},
			OptionalSymptoms: []SymptomType{
				SymptomHighRestartCount,
				SymptomExitCodeError,
			},
			MinRequired:      1,
			BaseConfidence:   0.95,
			BoostPerOptional: 0.02,
			Priority:         1,
		},

		// OOM_PRESSURE: OOM kill detected
		{
			Pattern: PatternOOMPressure,
			RequiredSymptoms: []SymptomType{
				SymptomExitCodeOOM,
			},
			OptionalSymptoms: []SymptomType{
				SymptomMemoryPressure,
				SymptomHighRestartCount,
			},
			MinRequired:      1,
			BaseConfidence:   0.98,
			BoostPerOptional: 0.01,
			Priority:         1,
		},

		// RESTART_STORM: High restart count without crash loop
		{
			Pattern: PatternRestartStorm,
			RequiredSymptoms: []SymptomType{
				SymptomHighRestartCount,
				SymptomRestartFrequency,
			},
			ExcludedSymptoms: []SymptomType{
				SymptomCrashLoopBackOff,
			},
			MinRequired:      1,
			BaseConfidence:   0.85,
			BoostPerOptional: 0.05,
			Priority:         2,
		},

		// APP_CRASH: Container terminated with error
		{
			Pattern: PatternAppCrash,
			RequiredSymptoms: []SymptomType{
				SymptomExitCodeError,
			},
			OptionalSymptoms: []SymptomType{
				SymptomContainerTerminated,
			},
			ExcludedSymptoms: []SymptomType{
				SymptomExitCodeOOM,
				SymptomCrashLoopBackOff,
			},
			MinRequired:      1,
			BaseConfidence:   0.80,
			BoostPerOptional: 0.10,
			Priority:         3,
		},

		// NO_READY_ENDPOINTS: Service has no healthy backends
		{
			Pattern: PatternNoReadyEndpoints,
			RequiredSymptoms: []SymptomType{
				SymptomNoEndpoints,
			},
			OptionalSymptoms: []SymptomType{
				SymptomHTTP5xx,
				SymptomReadinessProbeFailure,
			},
			MinRequired:      1,
			BaseConfidence:   0.90,
			BoostPerOptional: 0.05,
			Priority:         1,
		},

		// INTERNAL_ERRORS: HTTP 5xx without upstream issues
		{
			Pattern: PatternInternalErrors,
			RequiredSymptoms: []SymptomType{
				SymptomHTTP5xx,
			},
			ExcludedSymptoms: []SymptomType{
				SymptomNoEndpoints,
				SymptomConnectionRefused,
			},
			MinRequired:      1,
			BaseConfidence:   0.80,
			BoostPerOptional: 0.05,
			Priority:         2,
		},

		// UPSTREAM_FAILURE: Connection issues to upstream
		{
			Pattern: PatternUpstreamFailure,
			RequiredSymptoms: []SymptomType{
				SymptomConnectionRefused,
			},
			OptionalSymptoms: []SymptomType{
				SymptomHTTP5xx,
				SymptomConnectionTimeout,
			},
			MinRequired:      1,
			BaseConfidence:   0.85,
			BoostPerOptional: 0.05,
			Priority:         2,
		},

		// TIMEOUTS: Request timeouts
		{
			Pattern: PatternTimeouts,
			RequiredSymptoms: []SymptomType{
				SymptomHTTPTimeout,
			},
			OptionalSymptoms: []SymptomType{
				SymptomConnectionTimeout,
			},
			MinRequired:      1,
			BaseConfidence:   0.85,
			BoostPerOptional: 0.05,
			Priority:         3,
		},

		// IMAGE_PULL_FAILURE: Can't pull container image
		{
			Pattern: PatternImagePullFailure,
			RequiredSymptoms: []SymptomType{
				SymptomImagePullError,
			},
			OptionalSymptoms: []SymptomType{
				SymptomImagePullBackOff,
			},
			MinRequired:      1,
			BaseConfidence:   0.95,
			BoostPerOptional: 0.02,
			Priority:         1,
		},

		// CONFIG_ERROR: Configuration problems
		{
			Pattern: PatternConfigError,
			RequiredSymptoms: []SymptomType{
				SymptomInvalidConfig,
			},
			OptionalSymptoms: []SymptomType{
				SymptomMissingConfigMap,
				SymptomMissingSecret,
			},
			MinRequired:      1,
			BaseConfidence:   0.90,
			BoostPerOptional: 0.05,
			Priority:         2,
		},

		// SECRET_MISSING: Missing secret
		{
			Pattern: PatternSecretMissing,
			RequiredSymptoms: []SymptomType{
				SymptomMissingSecret,
			},
			MinRequired:    1,
			BaseConfidence: 0.95,
			Priority:       1,
		},

		// DNS_FAILURE: DNS resolution issues
		{
			Pattern: PatternDNSFailure,
			RequiredSymptoms: []SymptomType{
				SymptomDNSResolutionFailed,
			},
			OptionalSymptoms: []SymptomType{
				SymptomConnectionRefused,
			},
			MinRequired:      1,
			BaseConfidence:   0.90,
			BoostPerOptional: 0.05,
			Priority:         2,
		},

		// PERMISSION_DENIED: RBAC or permission issues
		{
			Pattern: PatternPermissionDenied,
			RequiredSymptoms: []SymptomType{
				SymptomRBACDenied,
			},
			OptionalSymptoms: []SymptomType{
				SymptomSecurityContextError,
			},
			MinRequired:      1,
			BaseConfidence:   0.90,
			BoostPerOptional: 0.05,
			Priority:         2,
		},

		// LIVENESS_FAILURE: Liveness probe failures
		{
			Pattern: PatternLivenessFailure,
			RequiredSymptoms: []SymptomType{
				SymptomLivenessProbeFailure,
			},
			OptionalSymptoms: []SymptomType{
				SymptomHighRestartCount,
			},
			MinRequired:      1,
			BaseConfidence:   0.95,
			BoostPerOptional: 0.02,
			Priority:         1,
		},

		// READINESS_FAILURE: Readiness probe failures
		{
			Pattern: PatternReadinessFailure,
			RequiredSymptoms: []SymptomType{
				SymptomReadinessProbeFailure,
			},
			OptionalSymptoms: []SymptomType{
				SymptomNoEndpoints,
			},
			MinRequired:      1,
			BaseConfidence:   0.90,
			BoostPerOptional: 0.05,
			Priority:         2,
		},

		// STARTUP_FAILURE: Startup probe failures
		{
			Pattern: PatternStartupFailure,
			RequiredSymptoms: []SymptomType{
				SymptomStartupProbeFailure,
			},
			MinRequired:    1,
			BaseConfidence: 0.90,
			Priority:       2,
		},

		// NODE_NOT_READY: Node is not ready
		{
			Pattern: PatternNodeNotReady,
			RequiredSymptoms: []SymptomType{
				SymptomNodeNotReady,
			},
			OptionalSymptoms: []SymptomType{
				SymptomNodeUnreachable,
			},
			MinRequired:      1,
			BaseConfidence:   0.95,
			BoostPerOptional: 0.03,
			Priority:         1,
		},

		// NODE_PRESSURE: Node resource pressure
		{
			Pattern: PatternNodePressure,
			RequiredSymptoms: []SymptomType{
				SymptomNodePressure,
			},
			OptionalSymptoms: []SymptomType{
				SymptomMemoryPressure,
				SymptomDiskPressure,
			},
			MinRequired:      1,
			BaseConfidence:   0.90,
			BoostPerOptional: 0.05,
			Priority:         2,
		},

		// DISK_PRESSURE: Disk pressure specifically
		{
			Pattern: PatternDiskPressure,
			RequiredSymptoms: []SymptomType{
				SymptomDiskPressure,
			},
			MinRequired:    1,
			BaseConfidence: 0.95,
			Priority:       1,
		},

		// UNSCHEDULABLE: Pod cannot be scheduled
		{
			Pattern: PatternUnschedulable,
			RequiredSymptoms: []SymptomType{
				SymptomUnschedulable,
			},
			OptionalSymptoms: []SymptomType{
				SymptomInsufficientResources,
			},
			MinRequired:      1,
			BaseConfidence:   0.90,
			BoostPerOptional: 0.05,
			Priority:         2,
		},

		// RESOURCE_EXHAUSTED: Insufficient resources
		{
			Pattern: PatternResourceExhausted,
			RequiredSymptoms: []SymptomType{
				SymptomInsufficientResources,
			},
			OptionalSymptoms: []SymptomType{
				SymptomUnschedulable,
				SymptomMemoryPressure,
				SymptomCPUThrottling,
			},
			MinRequired:      1,
			BaseConfidence:   0.85,
			BoostPerOptional: 0.05,
			Priority:         2,
		},
	}
}

// AddRule adds a custom pattern rule.
func (m *PatternMatcher) AddRule(rule PatternRule) {
	m.rules = append(m.rules, rule)
}

// SetRules replaces all rules.
func (m *PatternMatcher) SetRules(rules []PatternRule) {
	m.rules = rules
}

