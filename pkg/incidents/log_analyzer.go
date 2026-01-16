// Copyright 2025 KubeGraf Contributors
// SPDX-License-Identifier: Apache-2.0

package incidents

import (
	"context"
	"regexp"
	"strings"
	"time"
)

// LogAnalyzer analyzes pod logs to extract insights for incident diagnosis.
type LogAnalyzer struct {
	patterns []LogPattern
}

// LogPattern defines a pattern to match in logs.
type LogPattern struct {
	// Name identifies this pattern
	Name string
	// Category groups related patterns (e.g., "network", "memory", "dependency")
	Category string
	// Regex is the compiled pattern to match
	Regex *regexp.Regexp
	// Severity indicates the impact level
	Severity Severity
	// RootCause describes what this pattern indicates
	RootCause string
	// RecommendedFix suggests how to resolve this issue
	RecommendedFix string
	// IsUpstreamIssue indicates if this is a dependency/external issue
	IsUpstreamIssue bool
}

// LogInsight represents an insight extracted from log analysis.
type LogInsight struct {
	// PatternName identifies which pattern matched
	PatternName string `json:"patternName"`
	// Category of the issue
	Category string `json:"category"`
	// Severity of this insight
	Severity Severity `json:"severity"`
	// RootCause explains what's happening
	RootCause string `json:"rootCause"`
	// RecommendedFix suggests resolution
	RecommendedFix string `json:"recommendedFix"`
	// MatchedLines are the log lines that matched
	MatchedLines []string `json:"matchedLines"`
	// MatchCount is how many times this pattern matched
	MatchCount int `json:"matchCount"`
	// IsUpstreamIssue indicates external dependency problem
	IsUpstreamIssue bool `json:"isUpstreamIssue"`
	// ExtractedDetails contains parsed data from logs (e.g., backend name, timeout value)
	ExtractedDetails map[string]string `json:"extractedDetails,omitempty"`
}

// LogAnalysisResult contains the full analysis of pod logs.
type LogAnalysisResult struct {
	// PodName is the analyzed pod
	PodName string `json:"podName"`
	// Namespace of the pod
	Namespace string `json:"namespace"`
	// Container analyzed (if specific)
	Container string `json:"container,omitempty"`
	// AnalyzedAt is when the analysis was performed
	AnalyzedAt time.Time `json:"analyzedAt"`
	// TotalLines is the number of log lines analyzed
	TotalLines int `json:"totalLines"`
	// Insights are the detected issues
	Insights []LogInsight `json:"insights"`
	// Summary is a human-readable summary
	Summary string `json:"summary"`
	// OverallSeverity is the highest severity found
	OverallSeverity Severity `json:"overallSeverity"`
	// PrimaryRootCause is the most likely root cause
	PrimaryRootCause string `json:"primaryRootCause"`
	// IsExternalIssue indicates the problem is likely external to this pod
	IsExternalIssue bool `json:"isExternalIssue"`
	// RawLogs contains the analyzed log content (for debugging)
	RawLogs string `json:"rawLogs,omitempty"`
}

// NewLogAnalyzer creates a new log analyzer with default patterns.
func NewLogAnalyzer() *LogAnalyzer {
	return &LogAnalyzer{
		patterns: defaultLogPatterns(),
	}
}

// AnalyzeLogs analyzes log content and returns insights.
func (la *LogAnalyzer) AnalyzeLogs(ctx context.Context, podName, namespace, container, logs string) *LogAnalysisResult {
	result := &LogAnalysisResult{
		PodName:         podName,
		Namespace:       namespace,
		Container:       container,
		AnalyzedAt:      time.Now(),
		Insights:        []LogInsight{},
		OverallSeverity: SeverityInfo,
	}

	lines := strings.Split(logs, "\n")
	result.TotalLines = len(lines)

	// Track matches per pattern
	patternMatches := make(map[string]*LogInsight)

	for _, line := range lines {
		if strings.TrimSpace(line) == "" {
			continue
		}

		for _, pattern := range la.patterns {
			if pattern.Regex.MatchString(line) {
				insight, exists := patternMatches[pattern.Name]
				if !exists {
					insight = &LogInsight{
						PatternName:      pattern.Name,
						Category:         pattern.Category,
						Severity:         pattern.Severity,
						RootCause:        pattern.RootCause,
						RecommendedFix:   pattern.RecommendedFix,
						IsUpstreamIssue:  pattern.IsUpstreamIssue,
						MatchedLines:     []string{},
						ExtractedDetails: make(map[string]string),
					}
					patternMatches[pattern.Name] = insight
				}

				insight.MatchCount++
				// Keep first 5 matching lines as evidence
				if len(insight.MatchedLines) < 5 {
					insight.MatchedLines = append(insight.MatchedLines, line)
				}

				// Extract details for specific patterns
				la.extractDetails(pattern, line, insight)
			}
		}
	}

	// Convert map to slice and find highest severity
	for _, insight := range patternMatches {
		result.Insights = append(result.Insights, *insight)
		if insight.Severity.Weight() > result.OverallSeverity.Weight() {
			result.OverallSeverity = insight.Severity
			result.PrimaryRootCause = insight.RootCause
			result.IsExternalIssue = insight.IsUpstreamIssue
		}
	}

	// Generate summary
	result.Summary = la.generateSummary(result)

	return result
}

// extractDetails extracts specific details from log lines based on pattern.
func (la *LogAnalyzer) extractDetails(pattern LogPattern, line string, insight *LogInsight) {
	switch pattern.Name {
	case "haproxy_backend_down":
		// Extract backend name from HAProxy logs
		re := regexp.MustCompile(`Server\s+(\S+)\s+is\s+DOWN`)
		if matches := re.FindStringSubmatch(line); len(matches) > 1 {
			insight.ExtractedDetails["backend"] = matches[1]
		}
	case "layer4_timeout":
		// Extract timeout reason
		re := regexp.MustCompile(`reason:\s*(.+)`)
		if matches := re.FindStringSubmatch(line); len(matches) > 1 {
			insight.ExtractedDetails["reason"] = strings.TrimSpace(matches[1])
		}
	case "connection_refused":
		// Extract target host/port if available
		re := regexp.MustCompile(`connect(?:ion)?\s+(?:to\s+)?(\S+)`)
		if matches := re.FindStringSubmatch(line); len(matches) > 1 {
			insight.ExtractedDetails["target"] = matches[1]
		}
	case "oom_killed":
		// OOM details
		insight.ExtractedDetails["type"] = "out_of_memory"
	}
}

// generateSummary creates a human-readable summary.
func (la *LogAnalyzer) generateSummary(result *LogAnalysisResult) string {
	if len(result.Insights) == 0 {
		return "No significant issues detected in logs"
	}

	var sb strings.Builder

	if result.IsExternalIssue {
		sb.WriteString("External dependency issue detected. ")
	}

	sb.WriteString("Found ")
	sb.WriteString(string(rune('0' + len(result.Insights))))
	sb.WriteString(" issue type(s): ")

	categories := make(map[string]int)
	for _, insight := range result.Insights {
		categories[insight.Category]++
	}

	first := true
	for cat, count := range categories {
		if !first {
			sb.WriteString(", ")
		}
		sb.WriteString(cat)
		if count > 1 {
			sb.WriteString(" (multiple)")
		}
		first = false
	}

	sb.WriteString(". Primary cause: ")
	sb.WriteString(result.PrimaryRootCause)

	return sb.String()
}

// defaultLogPatterns returns the built-in log patterns.
func defaultLogPatterns() []LogPattern {
	return []LogPattern{
		// HAProxy specific patterns
		{
			Name:            "haproxy_backend_down",
			Category:        "dependency",
			Regex:           regexp.MustCompile(`(?i)Server\s+\S+\s+is\s+DOWN`),
			Severity:        SeverityHigh,
			RootCause:       "Backend server became unavailable - upstream dependency is down",
			RecommendedFix:  "Check the health of the backend service. The issue is with the upstream dependency, not this pod.",
			IsUpstreamIssue: true,
		},
		{
			Name:            "layer4_timeout",
			Category:        "network",
			Regex:           regexp.MustCompile(`(?i)Layer4\s+timeout|L4TOUT|connection\s+timed?\s*out`),
			Severity:        SeverityHigh,
			RootCause:       "Network layer timeout - backend is unreachable or overloaded",
			RecommendedFix:  "Check network connectivity to backend. Verify backend service is running and accepting connections.",
			IsUpstreamIssue: true,
		},
		{
			Name:            "haproxy_no_server",
			Category:        "dependency",
			Regex:           regexp.MustCompile(`(?i)backend\s+\S+\s+has\s+no\s+server\s+available`),
			Severity:        SeverityCritical,
			RootCause:       "No healthy backend servers available",
			RecommendedFix:  "All backend servers are down. Check the health of backend pods and their readiness probes.",
			IsUpstreamIssue: true,
		},

		// Connection errors
		{
			Name:            "connection_refused",
			Category:        "network",
			Regex:           regexp.MustCompile(`(?i)connection\s+refused|ECONNREFUSED|connect:\s+connection\s+refused`),
			Severity:        SeverityHigh,
			RootCause:       "Connection refused by target service - service may be down or not listening",
			RecommendedFix:  "Verify the target service is running and listening on the expected port.",
			IsUpstreamIssue: true,
		},
		{
			Name:            "connection_reset",
			Category:        "network",
			Regex:           regexp.MustCompile(`(?i)connection\s+reset|ECONNRESET|peer\s+reset`),
			Severity:        SeverityMedium,
			RootCause:       "Connection was reset by peer - possible network instability or service restart",
			RecommendedFix:  "Check for network issues or service restarts on the remote end.",
			IsUpstreamIssue: true,
		},
		{
			Name:            "dns_resolution_failed",
			Category:        "network",
			Regex:           regexp.MustCompile(`(?i)DNS\s+resolution\s+failed|could\s+not\s+resolve\s+host|NXDOMAIN|no\s+such\s+host`),
			Severity:        SeverityHigh,
			RootCause:       "DNS resolution failed - service name cannot be resolved",
			RecommendedFix:  "Check if the target service exists and DNS is configured correctly.",
			IsUpstreamIssue: false,
		},

		// Memory issues
		{
			Name:           "oom_killed",
			Category:       "memory",
			Regex:          regexp.MustCompile(`(?i)OOMKilled|Out\s+of\s+memory|oom-kill|memory\s+cgroup\s+out\s+of\s+memory`),
			Severity:       SeverityCritical,
			RootCause:      "Container was killed due to out of memory - memory limit too low or memory leak",
			RecommendedFix: "Increase memory limits or investigate memory usage patterns for leaks.",
		},
		{
			Name:           "memory_pressure",
			Category:       "memory",
			Regex:          regexp.MustCompile(`(?i)memory\s+pressure|low\s+memory|memory\s+allocation\s+failed`),
			Severity:       SeverityHigh,
			RootCause:      "System is under memory pressure",
			RecommendedFix: "Review memory limits and consider increasing available memory.",
		},

		// Database/Redis specific
		{
			Name:            "redis_connection_lost",
			Category:        "dependency",
			Regex:           regexp.MustCompile(`(?i)redis.*connection\s+lost|lost\s+connection\s+to\s+redis|redis.*timeout`),
			Severity:        SeverityHigh,
			RootCause:       "Lost connection to Redis - Redis server may be overloaded or restarting",
			RecommendedFix:  "Check Redis server health, memory usage, and connection limits.",
			IsUpstreamIssue: true,
		},
		{
			Name:            "database_connection_failed",
			Category:        "dependency",
			Regex:           regexp.MustCompile(`(?i)database.*connection\s+failed|cannot\s+connect\s+to\s+database|db\s+connection\s+error`),
			Severity:        SeverityHigh,
			RootCause:       "Database connection failed",
			RecommendedFix:  "Check database server availability and connection credentials.",
			IsUpstreamIssue: true,
		},

		// Application errors
		{
			Name:           "panic_crash",
			Category:       "application",
			Regex:          regexp.MustCompile(`(?i)panic:|fatal\s+error:|segmentation\s+fault|SIGSEGV`),
			Severity:       SeverityCritical,
			RootCause:      "Application crashed with panic or fatal error",
			RecommendedFix: "Review stack trace in logs to identify the bug. This is an application code issue.",
		},
		{
			Name:           "unhandled_exception",
			Category:       "application",
			Regex:          regexp.MustCompile(`(?i)unhandled\s+exception|uncaught\s+exception|Traceback\s+\(most\s+recent`),
			Severity:       SeverityHigh,
			RootCause:      "Unhandled exception in application code",
			RecommendedFix: "Review the exception stack trace and add proper error handling.",
		},

		// Health check failures
		{
			Name:           "health_check_failed",
			Category:       "health",
			Regex:          regexp.MustCompile(`(?i)health\s+check\s+failed|liveness\s+probe\s+failed|readiness\s+probe\s+failed`),
			Severity:       SeverityMedium,
			RootCause:      "Health check failed - application may be starting up slowly or unhealthy",
			RecommendedFix: "Review probe configuration and application startup time. Consider increasing initialDelaySeconds.",
		},

		// Kubernetes specific
		{
			Name:           "image_pull_error",
			Category:       "kubernetes",
			Regex:          regexp.MustCompile(`(?i)failed\s+to\s+pull\s+image|ImagePullBackOff|ErrImagePull`),
			Severity:       SeverityHigh,
			RootCause:      "Failed to pull container image",
			RecommendedFix: "Verify image name, tag, and registry credentials. Check if the image exists.",
		},
		{
			Name:           "permission_denied",
			Category:       "security",
			Regex:          regexp.MustCompile(`(?i)permission\s+denied|access\s+denied|EACCES|forbidden`),
			Severity:       SeverityMedium,
			RootCause:      "Permission denied - RBAC or filesystem permission issue",
			RecommendedFix: "Check ServiceAccount RBAC permissions and container security context.",
		},

		// Graceful shutdown (informational, not an error)
		{
			Name:           "graceful_shutdown",
			Category:       "lifecycle",
			Regex:          regexp.MustCompile(`(?i)graceful\s+shutdown|shutting\s+down\s+gracefully|SIGTERM\s+received|termination\s+signal`),
			Severity:       SeverityInfo,
			RootCause:      "Container received termination signal and is shutting down gracefully",
			RecommendedFix: "This is normal behavior during pod termination or rolling updates.",
		},
	}
}

// AddPattern adds a custom pattern to the analyzer.
func (la *LogAnalyzer) AddPattern(pattern LogPattern) {
	la.patterns = append(la.patterns, pattern)
}
