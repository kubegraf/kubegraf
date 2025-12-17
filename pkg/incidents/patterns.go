// Copyright 2025 KubeGraf Contributors
// SPDX-License-Identifier: Apache-2.0

// Package incidents provides a production-ready incident intelligence system
// for Kubernetes failure detection, diagnosis, and remediation.
package incidents

// FailurePattern represents a categorized failure type in Kubernetes.
// These patterns are designed to be extensible and cover all common
// production failure scenarios.
type FailurePattern string

const (
	// Application-level failures
	PatternAppCrash        FailurePattern = "APP_CRASH"
	PatternCrashLoop       FailurePattern = "CRASHLOOP"
	PatternOOMPressure     FailurePattern = "OOM_PRESSURE"
	PatternRestartStorm    FailurePattern = "RESTART_STORM"
	PatternInternalErrors  FailurePattern = "INTERNAL_ERRORS"
	PatternUpstreamFailure FailurePattern = "UPSTREAM_FAILURE"
	PatternTimeouts        FailurePattern = "TIMEOUTS"

	// Infrastructure failures
	PatternNoReadyEndpoints FailurePattern = "NO_READY_ENDPOINTS"
	PatternImagePullFailure FailurePattern = "IMAGE_PULL_FAILURE"
	PatternConfigError      FailurePattern = "CONFIG_ERROR"
	PatternDNSFailure       FailurePattern = "DNS_FAILURE"
	PatternPermissionDenied FailurePattern = "PERMISSION_DENIED"

	// Node-level failures
	PatternNodeNotReady     FailurePattern = "NODE_NOT_READY"
	PatternNodePressure     FailurePattern = "NODE_PRESSURE"
	PatternDiskPressure     FailurePattern = "DISK_PRESSURE"
	PatternNetworkPartition FailurePattern = "NETWORK_PARTITION"

	// Scheduling failures
	PatternUnschedulable    FailurePattern = "UNSCHEDULABLE"
	PatternResourceExhausted FailurePattern = "RESOURCE_EXHAUSTED"
	PatternAffinityConflict FailurePattern = "AFFINITY_CONFLICT"

	// Security failures
	PatternSecretMissing   FailurePattern = "SECRET_MISSING"
	PatternRBACDenied      FailurePattern = "RBAC_DENIED"
	PatternPolicyViolation FailurePattern = "POLICY_VIOLATION"

	// Health check failures
	PatternLivenessFailure  FailurePattern = "LIVENESS_FAILURE"
	PatternReadinessFailure FailurePattern = "READINESS_FAILURE"
	PatternStartupFailure   FailurePattern = "STARTUP_FAILURE"

	// Unknown pattern for unclassified failures
	PatternUnknown FailurePattern = "UNKNOWN"
)

// String returns the string representation of the failure pattern.
func (p FailurePattern) String() string {
	return string(p)
}

// Category returns the high-level category of the failure pattern.
func (p FailurePattern) Category() PatternCategory {
	switch p {
	case PatternAppCrash, PatternCrashLoop, PatternOOMPressure,
		PatternRestartStorm, PatternInternalErrors, PatternUpstreamFailure,
		PatternTimeouts:
		return CategoryApplication
	case PatternNoReadyEndpoints, PatternImagePullFailure, PatternConfigError,
		PatternDNSFailure, PatternPermissionDenied:
		return CategoryInfrastructure
	case PatternNodeNotReady, PatternNodePressure, PatternDiskPressure,
		PatternNetworkPartition:
		return CategoryNode
	case PatternUnschedulable, PatternResourceExhausted, PatternAffinityConflict:
		return CategoryScheduling
	case PatternSecretMissing, PatternRBACDenied, PatternPolicyViolation:
		return CategorySecurity
	case PatternLivenessFailure, PatternReadinessFailure, PatternStartupFailure:
		return CategoryHealthCheck
	default:
		return CategoryUnknown
	}
}

// PatternCategory represents a high-level category of failure patterns.
type PatternCategory string

const (
	CategoryApplication    PatternCategory = "application"
	CategoryInfrastructure PatternCategory = "infrastructure"
	CategoryNode           PatternCategory = "node"
	CategoryScheduling     PatternCategory = "scheduling"
	CategorySecurity       PatternCategory = "security"
	CategoryHealthCheck    PatternCategory = "health_check"
	CategoryUnknown        PatternCategory = "unknown"
)

// PatternMetadata provides additional context about a failure pattern.
type PatternMetadata struct {
	Pattern     FailurePattern `json:"pattern"`
	Name        string         `json:"name"`
	Description string         `json:"description"`
	Category    PatternCategory `json:"category"`
	// DefaultSeverity is the typical severity for this pattern
	DefaultSeverity Severity `json:"defaultSeverity"`
	// HTTPStatusCodes that typically map to this pattern
	HTTPStatusCodes []int `json:"httpStatusCodes,omitempty"`
	// KubeReasons that typically map to this pattern
	KubeReasons []string `json:"kubeReasons,omitempty"`
}

// AllPatterns returns metadata for all known failure patterns.
func AllPatterns() []PatternMetadata {
	return []PatternMetadata{
		{
			Pattern:         PatternAppCrash,
			Name:            "Application Crash",
			Description:     "Application terminated unexpectedly with non-zero exit code",
			Category:        CategoryApplication,
			DefaultSeverity: SeverityCritical,
			KubeReasons:     []string{"Error", "ContainerCannotRun"},
		},
		{
			Pattern:         PatternCrashLoop,
			Name:            "Crash Loop",
			Description:     "Container repeatedly crashing and restarting",
			Category:        CategoryApplication,
			DefaultSeverity: SeverityCritical,
			KubeReasons:     []string{"CrashLoopBackOff", "BackOff"},
		},
		{
			Pattern:         PatternOOMPressure,
			Name:            "Out of Memory",
			Description:     "Container killed due to memory limit exceeded",
			Category:        CategoryApplication,
			DefaultSeverity: SeverityCritical,
			KubeReasons:     []string{"OOMKilled"},
		},
		{
			Pattern:         PatternRestartStorm,
			Name:            "Restart Storm",
			Description:     "High frequency of container restarts without crash loop",
			Category:        CategoryApplication,
			DefaultSeverity: SeverityHigh,
		},
		{
			Pattern:         PatternInternalErrors,
			Name:            "Internal Server Errors",
			Description:     "Application returning HTTP 5xx errors",
			Category:        CategoryApplication,
			DefaultSeverity: SeverityHigh,
			HTTPStatusCodes: []int{500, 501, 507, 508, 510, 511},
		},
		{
			Pattern:         PatternUpstreamFailure,
			Name:            "Upstream Failure",
			Description:     "Failure communicating with upstream services",
			Category:        CategoryApplication,
			DefaultSeverity: SeverityHigh,
			HTTPStatusCodes: []int{502, 503, 504},
		},
		{
			Pattern:         PatternTimeouts,
			Name:            "Request Timeouts",
			Description:     "Requests timing out due to slow response",
			Category:        CategoryApplication,
			DefaultSeverity: SeverityMedium,
			HTTPStatusCodes: []int{408, 504, 524},
		},
		{
			Pattern:         PatternNoReadyEndpoints,
			Name:            "No Ready Endpoints",
			Description:     "Service has no ready pods to receive traffic",
			Category:        CategoryInfrastructure,
			DefaultSeverity: SeverityCritical,
		},
		{
			Pattern:         PatternImagePullFailure,
			Name:            "Image Pull Failure",
			Description:     "Failed to pull container image from registry",
			Category:        CategoryInfrastructure,
			DefaultSeverity: SeverityHigh,
			KubeReasons:     []string{"ErrImagePull", "ImagePullBackOff", "ErrImageNeverPull"},
		},
		{
			Pattern:         PatternConfigError,
			Name:            "Configuration Error",
			Description:     "Invalid or missing configuration (ConfigMap/Secret)",
			Category:        CategoryInfrastructure,
			DefaultSeverity: SeverityHigh,
			KubeReasons:     []string{"CreateContainerConfigError", "InvalidImageName"},
		},
		{
			Pattern:         PatternDNSFailure,
			Name:            "DNS Resolution Failure",
			Description:     "Unable to resolve service or external DNS names",
			Category:        CategoryInfrastructure,
			DefaultSeverity: SeverityHigh,
		},
		{
			Pattern:         PatternPermissionDenied,
			Name:            "Permission Denied",
			Description:     "Insufficient permissions to perform action",
			Category:        CategoryInfrastructure,
			DefaultSeverity: SeverityMedium,
			HTTPStatusCodes: []int{401, 403},
		},
		{
			Pattern:         PatternNodeNotReady,
			Name:            "Node Not Ready",
			Description:     "Kubernetes node is not ready to accept workloads",
			Category:        CategoryNode,
			DefaultSeverity: SeverityCritical,
			KubeReasons:     []string{"NodeNotReady"},
		},
		{
			Pattern:         PatternNodePressure,
			Name:            "Node Pressure",
			Description:     "Node experiencing resource pressure (memory, disk, PID)",
			Category:        CategoryNode,
			DefaultSeverity: SeverityHigh,
			KubeReasons:     []string{"NodeHasDiskPressure", "NodeHasMemoryPressure", "NodeHasPIDPressure"},
		},
		{
			Pattern:         PatternDiskPressure,
			Name:            "Disk Pressure",
			Description:     "Node or pod running low on disk space",
			Category:        CategoryNode,
			DefaultSeverity: SeverityCritical,
			KubeReasons:     []string{"NodeHasDiskPressure", "Evicted"},
		},
		{
			Pattern:         PatternNetworkPartition,
			Name:            "Network Partition",
			Description:     "Network connectivity issues between nodes or pods",
			Category:        CategoryNode,
			DefaultSeverity: SeverityCritical,
			KubeReasons:     []string{"NetworkNotReady"},
		},
		{
			Pattern:         PatternUnschedulable,
			Name:            "Unschedulable",
			Description:     "Pod cannot be scheduled to any node",
			Category:        CategoryScheduling,
			DefaultSeverity: SeverityHigh,
			KubeReasons:     []string{"Unschedulable", "FailedScheduling"},
		},
		{
			Pattern:         PatternResourceExhausted,
			Name:            "Resource Exhausted",
			Description:     "Cluster or namespace quota exhausted",
			Category:        CategoryScheduling,
			DefaultSeverity: SeverityHigh,
			KubeReasons:     []string{"FailedScheduling", "InsufficientCPU", "InsufficientMemory"},
		},
		{
			Pattern:         PatternAffinityConflict,
			Name:            "Affinity Conflict",
			Description:     "Pod affinity/anti-affinity rules cannot be satisfied",
			Category:        CategoryScheduling,
			DefaultSeverity: SeverityMedium,
			KubeReasons:     []string{"FailedScheduling"},
		},
		{
			Pattern:         PatternSecretMissing,
			Name:            "Secret Missing",
			Description:     "Required secret not found",
			Category:        CategorySecurity,
			DefaultSeverity: SeverityHigh,
			KubeReasons:     []string{"CreateContainerConfigError"},
		},
		{
			Pattern:         PatternRBACDenied,
			Name:            "RBAC Denied",
			Description:     "Action denied due to RBAC policy",
			Category:        CategorySecurity,
			DefaultSeverity: SeverityMedium,
			KubeReasons:     []string{"Forbidden"},
		},
		{
			Pattern:         PatternPolicyViolation,
			Name:            "Policy Violation",
			Description:     "Pod violates security or admission policy",
			Category:        CategorySecurity,
			DefaultSeverity: SeverityHigh,
			KubeReasons:     []string{"FailedCreate"},
		},
		{
			Pattern:         PatternLivenessFailure,
			Name:            "Liveness Probe Failure",
			Description:     "Container failing liveness health checks",
			Category:        CategoryHealthCheck,
			DefaultSeverity: SeverityCritical,
			KubeReasons:     []string{"Unhealthy"},
		},
		{
			Pattern:         PatternReadinessFailure,
			Name:            "Readiness Probe Failure",
			Description:     "Container failing readiness health checks",
			Category:        CategoryHealthCheck,
			DefaultSeverity: SeverityHigh,
			KubeReasons:     []string{"Unhealthy"},
		},
		{
			Pattern:         PatternStartupFailure,
			Name:            "Startup Probe Failure",
			Description:     "Container failing startup health checks",
			Category:        CategoryHealthCheck,
			DefaultSeverity: SeverityHigh,
			KubeReasons:     []string{"Unhealthy"},
		},
	}
}

// GetPatternMetadata returns metadata for a specific pattern.
func GetPatternMetadata(pattern FailurePattern) *PatternMetadata {
	for _, meta := range AllPatterns() {
		if meta.Pattern == pattern {
			return &meta
		}
	}
	return nil
}

