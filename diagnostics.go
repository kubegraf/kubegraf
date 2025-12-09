// Copyright 2025 KubeGraf Contributors
// SPDX-License-Identifier: Apache-2.0

package main

import (
	"context"
	"fmt"
	"strings"
	"sync"
	"time"

	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// Severity levels for diagnostics
type Severity string

const (
	SeverityCritical Severity = "critical"
	SeverityWarning  Severity = "warning"
	SeverityInfo     Severity = "info"
)

// contextKey is a custom type for context keys to avoid collisions
type contextKey string

const diagnosticsEngineKey contextKey = "diagnostics_engine"

// Finding represents a diagnostic finding
type Finding struct {
	Rule        string   `json:"rule"`
	Severity    Severity `json:"severity"`
	Resource    string   `json:"resource"`
	Namespace   string   `json:"namespace"`
	Message     string   `json:"message"`
	Remediation string   `json:"remediation"`
	Category    string   `json:"category"`
}

// DiagnosticRule defines a diagnostic check
type DiagnosticRule struct {
	ID          string
	Name        string
	Category    string
	Severity    Severity
	Description string
	Check       func(ctx context.Context, app *App) ([]Finding, error)
}

// DiagnosticsEngine runs diagnostic checks against the cluster
type DiagnosticsEngine struct {
	app      *App
	rules    []DiagnosticRule
	podCache *corev1.PodList // Cache pods to avoid repeated API calls
	cacheMu  sync.RWMutex
}

// NewDiagnosticsEngine creates a new diagnostics engine
func NewDiagnosticsEngine(app *App) *DiagnosticsEngine {
	engine := &DiagnosticsEngine{app: app}
	engine.registerRules()
	return engine
}

// getPodsCache returns cached pods or fetches them if not cached
func (e *DiagnosticsEngine) getPodsCache(ctx context.Context) (*corev1.PodList, error) {
	e.cacheMu.RLock()
	if e.podCache != nil {
		cache := e.podCache
		e.cacheMu.RUnlock()
		return cache, nil
	}
	e.cacheMu.RUnlock()

	// Fetch pods once and cache
	e.cacheMu.Lock()
	defer e.cacheMu.Unlock()

	// Double-check after acquiring write lock
	if e.podCache != nil {
		return e.podCache, nil
	}

	pods, err := e.app.clientset.CoreV1().Pods("").List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, err
	}
	e.podCache = pods
	return pods, nil
}

// RunAll executes all diagnostic rules in parallel for better performance
func (e *DiagnosticsEngine) RunAll(ctx context.Context) ([]Finding, error) {
	var allFindings []Finding
	var mu sync.Mutex
	var wg sync.WaitGroup

	// Pre-fetch pods cache to share across all checks
	_, _ = e.getPodsCache(ctx)

	// Create a context with timeout (30 seconds max per rule) and pass engine reference
	ruleCtx := context.WithValue(ctx, diagnosticsEngineKey, e)
	ruleCtx, cancel := context.WithTimeout(ruleCtx, 30*time.Second)
	defer cancel()

	// Run all rules in parallel (limit to 20 concurrent goroutines to avoid overwhelming API)
	semaphore := make(chan struct{}, 20)
	for _, rule := range e.rules {
		wg.Add(1)
		semaphore <- struct{}{} // Acquire semaphore
		go func(r DiagnosticRule) {
			defer wg.Done()
			defer func() { <-semaphore }() // Release semaphore
			findings, err := r.Check(ruleCtx, e.app)
			if err != nil {
				// Log error but don't fail entire scan
				return
			}
			mu.Lock()
			allFindings = append(allFindings, findings...)
			mu.Unlock()
		}(rule)
	}

	wg.Wait()
	return allFindings, nil
}

// RunByCategory executes rules for a specific category in parallel
func (e *DiagnosticsEngine) RunByCategory(ctx context.Context, category string) ([]Finding, error) {
	var allFindings []Finding
	var mu sync.Mutex
	var wg sync.WaitGroup

	// Pre-fetch pods cache to share across all checks
	_, _ = e.getPodsCache(ctx)

	// Create a context with timeout (10 seconds max per rule for faster response) and pass engine reference
	ruleCtx := context.WithValue(ctx, diagnosticsEngineKey, e)
	ruleCtx, cancel := context.WithTimeout(ruleCtx, 10*time.Second)
	defer cancel()

	// Run rules for this category in parallel (limit to 20 concurrent goroutines)
	semaphore := make(chan struct{}, 20)
	for _, rule := range e.rules {
		if rule.Category != category {
			continue
		}
		wg.Add(1)
		semaphore <- struct{}{} // Acquire semaphore
		go func(r DiagnosticRule) {
			defer wg.Done()
			defer func() { <-semaphore }() // Release semaphore
			findings, err := r.Check(ruleCtx, e.app)
			if err != nil {
				return
			}
			mu.Lock()
			allFindings = append(allFindings, findings...)
			mu.Unlock()
		}(rule)
	}

	wg.Wait()
	return allFindings, nil
}

// GetRules returns all registered rules
func (e *DiagnosticsEngine) GetRules() []DiagnosticRule {
	return e.rules
}

// DiagnosticsSummary contains aggregated diagnostic results
type DiagnosticsSummary struct {
	Total      int            `json:"total"`
	Critical   int            `json:"critical"`
	Warning    int            `json:"warning"`
	Info       int            `json:"info"`
	ByCategory map[string]int `json:"byCategory"`
}

// GetSummary returns a summary of findings
func (e *DiagnosticsEngine) GetSummary(findings []Finding) DiagnosticsSummary {
	summary := DiagnosticsSummary{
		Total:      len(findings),
		ByCategory: make(map[string]int),
	}

	for _, f := range findings {
		switch f.Severity {
		case SeverityCritical:
			summary.Critical++
		case SeverityWarning:
			summary.Warning++
		case SeverityInfo:
			summary.Info++
		}
		summary.ByCategory[f.Category]++
	}

	return summary
}

// registerRules registers all diagnostic rules (50+)
func (e *DiagnosticsEngine) registerRules() {
	e.rules = []DiagnosticRule{
		// === SECURITY RULES ===
		{
			ID:          "SEC001",
			Name:        "Privileged Container",
			Category:    "security",
			Severity:    SeverityCritical,
			Description: "Containers running in privileged mode have full host access",
			Check:       checkPrivilegedContainers,
		},
		{
			ID:          "SEC002",
			Name:        "Run As Root",
			Category:    "security",
			Severity:    SeverityWarning,
			Description: "Containers running as root user",
			Check:       checkRunAsRoot,
		},
		{
			ID:          "SEC003",
			Name:        "Host Network",
			Category:    "security",
			Severity:    SeverityWarning,
			Description: "Pods using host network namespace",
			Check:       checkHostNetwork,
		},
		{
			ID:          "SEC004",
			Name:        "Host PID",
			Category:    "security",
			Severity:    SeverityWarning,
			Description: "Pods using host PID namespace",
			Check:       checkHostPID,
		},
		{
			ID:          "SEC005",
			Name:        "Host IPC",
			Category:    "security",
			Severity:    SeverityWarning,
			Description: "Pods using host IPC namespace",
			Check:       checkHostIPC,
		},
		{
			ID:          "SEC006",
			Name:        "Capability Added",
			Category:    "security",
			Severity:    SeverityWarning,
			Description: "Containers with added capabilities",
			Check:       checkAddedCapabilities,
		},
		{
			ID:          "SEC007",
			Name:        "No Security Context",
			Category:    "security",
			Severity:    SeverityInfo,
			Description: "Pods without security context defined",
			Check:       checkNoSecurityContext,
		},
		{
			ID:          "SEC008",
			Name:        "Allow Privilege Escalation",
			Category:    "security",
			Severity:    SeverityWarning,
			Description: "Containers allowing privilege escalation",
			Check:       checkAllowPrivilegeEscalation,
		},
		{
			ID:          "SEC009",
			Name:        "Writable Root Filesystem",
			Category:    "security",
			Severity:    SeverityInfo,
			Description: "Containers with writable root filesystem",
			Check:       checkWritableRootFS,
		},
		{
			ID:          "SEC010",
			Name:        "Default Service Account",
			Category:    "security",
			Severity:    SeverityInfo,
			Description: "Pods using default service account",
			Check:       checkDefaultServiceAccount,
		},
		{
			ID:          "SEC011",
			Name:        "Container Image Scanning",
			Category:    "security",
			Severity:    SeverityWarning,
			Description: "Container images using :latest tag or missing digest",
			Check:       checkContainerImageIssues,
		},
		{
			ID:          "SEC012",
			Name:        "Old Base Images",
			Category:    "security",
			Severity:    SeverityWarning,
			Description: "Containers using potentially outdated base images",
			Check:       checkOldBaseImages,
		},
		{
			ID:          "SEC013",
			Name:        "Image Pull Secrets",
			Category:    "security",
			Severity:    SeverityInfo,
			Description: "Pods without image pull secrets for private registries",
			Check:       checkImagePullSecrets,
		},

		// === RELIABILITY RULES ===
		{
			ID:          "REL001",
			Name:        "Missing Resource Limits",
			Category:    "reliability",
			Severity:    SeverityWarning,
			Description: "Containers without resource limits",
			Check:       checkMissingLimits,
		},
		{
			ID:          "REL002",
			Name:        "Missing Resource Requests",
			Category:    "reliability",
			Severity:    SeverityWarning,
			Description: "Containers without resource requests",
			Check:       checkMissingRequests,
		},
		{
			ID:          "REL003",
			Name:        "Missing Liveness Probe",
			Category:    "reliability",
			Severity:    SeverityWarning,
			Description: "Containers without liveness probe",
			Check:       checkMissingLivenessProbe,
		},
		{
			ID:          "REL004",
			Name:        "Missing Readiness Probe",
			Category:    "reliability",
			Severity:    SeverityWarning,
			Description: "Containers without readiness probe",
			Check:       checkMissingReadinessProbe,
		},
		{
			ID:          "REL005",
			Name:        "Single Replica Deployment",
			Category:    "reliability",
			Severity:    SeverityWarning,
			Description: "Deployments with only one replica (no HA)",
			Check:       checkSingleReplica,
		},
		{
			ID:          "REL006",
			Name:        "Missing PDB",
			Category:    "reliability",
			Severity:    SeverityInfo,
			Description: "Deployments without PodDisruptionBudget",
			Check:       checkMissingPDB,
		},
		{
			ID:          "REL007",
			Name:        "No Anti-Affinity",
			Category:    "reliability",
			Severity:    SeverityInfo,
			Description: "Multi-replica deployments without anti-affinity",
			Check:       checkNoAntiAffinity,
		},
		{
			ID:          "REL008",
			Name:        "Restart Loop",
			Category:    "reliability",
			Severity:    SeverityCritical,
			Description: "Pods with high restart count",
			Check:       checkRestartLoop,
		},
		{
			ID:          "REL009",
			Name:        "Image Pull Policy",
			Category:    "reliability",
			Severity:    SeverityInfo,
			Description: "Containers using 'Always' pull policy with latest tag",
			Check:       checkImagePullPolicy,
		},
		{
			ID:          "REL010",
			Name:        "No Image Tag",
			Category:    "reliability",
			Severity:    SeverityWarning,
			Description: "Images using :latest or no tag",
			Check:       checkNoImageTag,
		},

		// === PERFORMANCE RULES ===
		{
			ID:          "PERF001",
			Name:        "CPU Over-Provisioned",
			Category:    "performance",
			Severity:    SeverityInfo,
			Description: "Pods using less than 10% of CPU request",
			Check:       checkCPUOverProvisioned,
		},
		{
			ID:          "PERF002",
			Name:        "Memory Over-Provisioned",
			Category:    "performance",
			Severity:    SeverityInfo,
			Description: "Pods using less than 10% of memory request",
			Check:       checkMemoryOverProvisioned,
		},
		{
			ID:          "PERF003",
			Name:        "CPU Under-Provisioned",
			Category:    "performance",
			Severity:    SeverityWarning,
			Description: "Pods using more than 90% of CPU limit",
			Check:       checkCPUUnderProvisioned,
		},
		{
			ID:          "PERF004",
			Name:        "Memory Under-Provisioned",
			Category:    "performance",
			Severity:    SeverityWarning,
			Description: "Pods using more than 90% of memory limit",
			Check:       checkMemoryUnderProvisioned,
		},
		{
			ID:          "PERF005",
			Name:        "HPA Missing",
			Category:    "performance",
			Severity:    SeverityInfo,
			Description: "Deployments without HorizontalPodAutoscaler",
			Check:       checkMissingHPA,
		},

		// === NETWORKING RULES ===
		{
			ID:          "NET001",
			Name:        "Service No Endpoints",
			Category:    "networking",
			Severity:    SeverityWarning,
			Description: "Services with no endpoints",
			Check:       checkServiceNoEndpoints,
		},
		{
			ID:          "NET002",
			Name:        "NodePort Service",
			Category:    "networking",
			Severity:    SeverityInfo,
			Description: "Services using NodePort type",
			Check:       checkNodePortServices,
		},
		{
			ID:          "NET003",
			Name:        "Missing Network Policy",
			Category:    "networking",
			Severity:    SeverityInfo,
			Description: "Namespaces without network policies",
			Check:       checkMissingNetworkPolicy,
		},
		{
			ID:          "NET004",
			Name:        "Ingress No TLS",
			Category:    "networking",
			Severity:    SeverityWarning,
			Description: "Ingresses without TLS configuration",
			Check:       checkIngressNoTLS,
		},

		// === STORAGE RULES ===
		{
			ID:          "STG001",
			Name:        "PVC Pending",
			Category:    "storage",
			Severity:    SeverityCritical,
			Description: "PersistentVolumeClaims in pending state",
			Check:       checkPVCPending,
		},
		{
			ID:          "STG002",
			Name:        "PVC High Usage",
			Category:    "storage",
			Severity:    SeverityWarning,
			Description: "PVCs using more than 80% capacity",
			Check:       checkPVCHighUsage,
		},
		{
			ID:          "STG003",
			Name:        "EmptyDir No Limit",
			Category:    "storage",
			Severity:    SeverityInfo,
			Description: "EmptyDir volumes without size limit",
			Check:       checkEmptyDirNoLimit,
		},

		// === CONFIGURATION RULES ===
		{
			ID:          "CFG001",
			Name:        "ConfigMap Not Mounted",
			Category:    "configuration",
			Severity:    SeverityInfo,
			Description: "ConfigMaps not used by any pod",
			Check:       checkUnusedConfigMaps,
		},
		{
			ID:          "CFG002",
			Name:        "Secret Not Mounted",
			Category:    "configuration",
			Severity:    SeverityInfo,
			Description: "Secrets not used by any pod",
			Check:       checkUnusedSecrets,
		},
		{
			ID:          "CFG003",
			Name:        "Environment From Secret",
			Category:    "configuration",
			Severity:    SeverityInfo,
			Description: "Sensitive data exposed via environment variables",
			Check:       checkEnvFromSecret,
		},

		// === WORKLOAD HEALTH RULES ===
		{
			ID:          "WRK001",
			Name:        "Pod Pending",
			Category:    "workload",
			Severity:    SeverityWarning,
			Description: "Pods stuck in pending state",
			Check:       checkPodPending,
		},
		{
			ID:          "WRK002",
			Name:        "Pod Failed",
			Category:    "workload",
			Severity:    SeverityCritical,
			Description: "Pods in failed state",
			Check:       checkPodFailed,
		},
		{
			ID:          "WRK003",
			Name:        "Pod Unknown",
			Category:    "workload",
			Severity:    SeverityWarning,
			Description: "Pods in unknown state",
			Check:       checkPodUnknown,
		},
		{
			ID:          "WRK004",
			Name:        "Container Not Ready",
			Category:    "workload",
			Severity:    SeverityWarning,
			Description: "Containers not in ready state",
			Check:       checkContainerNotReady,
		},
		{
			ID:          "WRK005",
			Name:        "Deployment Unavailable",
			Category:    "workload",
			Severity:    SeverityCritical,
			Description: "Deployments with unavailable replicas",
			Check:       checkDeploymentUnavailable,
		},
		{
			ID:          "WRK006",
			Name:        "DaemonSet Not Ready",
			Category:    "workload",
			Severity:    SeverityWarning,
			Description: "DaemonSets with unavailable pods",
			Check:       checkDaemonSetNotReady,
		},
		{
			ID:          "WRK007",
			Name:        "StatefulSet Not Ready",
			Category:    "workload",
			Severity:    SeverityWarning,
			Description: "StatefulSets with unavailable replicas",
			Check:       checkStatefulSetNotReady,
		},
		{
			ID:          "WRK008",
			Name:        "Job Failed",
			Category:    "workload",
			Severity:    SeverityWarning,
			Description: "Failed jobs",
			Check:       checkJobFailed,
		},
		{
			ID:          "WRK009",
			Name:        "CronJob Suspended",
			Category:    "workload",
			Severity:    SeverityInfo,
			Description: "Suspended CronJobs",
			Check:       checkCronJobSuspended,
		},

		// === NODE RULES ===
		{
			ID:          "NODE001",
			Name:        "Node Not Ready",
			Category:    "node",
			Severity:    SeverityCritical,
			Description: "Nodes not in ready state",
			Check:       checkNodeNotReady,
		},
		{
			ID:          "NODE002",
			Name:        "Node Memory Pressure",
			Category:    "node",
			Severity:    SeverityWarning,
			Description: "Nodes with memory pressure",
			Check:       checkNodeMemoryPressure,
		},
		{
			ID:          "NODE003",
			Name:        "Node Disk Pressure",
			Category:    "node",
			Severity:    SeverityWarning,
			Description: "Nodes with disk pressure",
			Check:       checkNodeDiskPressure,
		},
		{
			ID:          "NODE004",
			Name:        "Node PID Pressure",
			Category:    "node",
			Severity:    SeverityWarning,
			Description: "Nodes with PID pressure",
			Check:       checkNodePIDPressure,
		},
		{
			ID:          "NODE005",
			Name:        "Node Unschedulable",
			Category:    "node",
			Severity:    SeverityInfo,
			Description: "Nodes marked as unschedulable",
			Check:       checkNodeUnschedulable,
		},
	}
}

// === SECURITY CHECK IMPLEMENTATIONS ===

func checkPrivilegedContainers(ctx context.Context, app *App) ([]Finding, error) {
	var findings []Finding
	// Use engine's pod cache if available (optimization)
	engine, ok := ctx.Value(diagnosticsEngineKey).(*DiagnosticsEngine)
	var pods *corev1.PodList
	var err error
	if ok && engine != nil {
		pods, err = engine.getPodsCache(ctx)
	} else {
		pods, err = app.clientset.CoreV1().Pods("").List(ctx, metav1.ListOptions{})
	}
	if err != nil {
		return nil, err
	}

	for _, pod := range pods.Items {
		for _, container := range pod.Spec.Containers {
			if container.SecurityContext != nil && container.SecurityContext.Privileged != nil && *container.SecurityContext.Privileged {
				findings = append(findings, Finding{
					Rule:        "SEC001",
					Severity:    SeverityCritical,
					Resource:    fmt.Sprintf("Pod/%s (container: %s)", pod.Name, container.Name),
					Namespace:   pod.Namespace,
					Message:     "Container is running in privileged mode",
					Remediation: "Remove privileged: true from securityContext unless absolutely necessary",
					Category:    "security",
				})
			}
		}
	}
	return findings, nil
}

func checkRunAsRoot(ctx context.Context, app *App) ([]Finding, error) {
	var findings []Finding
	// Use engine's pod cache if available
	engine, ok := ctx.Value(diagnosticsEngineKey).(*DiagnosticsEngine)
	var pods *corev1.PodList
	var err error
	if ok && engine != nil {
		pods, err = engine.getPodsCache(ctx)
	} else {
		pods, err = app.clientset.CoreV1().Pods("").List(ctx, metav1.ListOptions{})
	}
	if err != nil {
		return nil, err
	}

	for _, pod := range pods.Items {
		for _, container := range pod.Spec.Containers {
			runAsRoot := false
			if container.SecurityContext != nil && container.SecurityContext.RunAsUser != nil {
				if *container.SecurityContext.RunAsUser == 0 {
					runAsRoot = true
				}
			} else if pod.Spec.SecurityContext != nil && pod.Spec.SecurityContext.RunAsUser != nil {
				if *pod.Spec.SecurityContext.RunAsUser == 0 {
					runAsRoot = true
				}
			}
			if runAsRoot {
				findings = append(findings, Finding{
					Rule:        "SEC002",
					Severity:    SeverityWarning,
					Resource:    fmt.Sprintf("Pod/%s (container: %s)", pod.Name, container.Name),
					Namespace:   pod.Namespace,
					Message:     "Container is running as root user",
					Remediation: "Set runAsNonRoot: true or specify runAsUser with non-zero value",
					Category:    "security",
				})
			}
		}
	}
	return findings, nil
}

func checkHostNetwork(ctx context.Context, app *App) ([]Finding, error) {
	var findings []Finding
	engine, ok := ctx.Value(diagnosticsEngineKey).(*DiagnosticsEngine)
	var pods *corev1.PodList
	var err error
	if ok && engine != nil {
		pods, err = engine.getPodsCache(ctx)
	} else {
		pods, err = app.clientset.CoreV1().Pods("").List(ctx, metav1.ListOptions{})
	}
	if err != nil {
		return nil, err
	}

	for _, pod := range pods.Items {
		if pod.Spec.HostNetwork {
			findings = append(findings, Finding{
				Rule:        "SEC003",
				Severity:    SeverityWarning,
				Resource:    fmt.Sprintf("Pod/%s", pod.Name),
				Namespace:   pod.Namespace,
				Message:     "Pod is using host network namespace",
				Remediation: "Remove hostNetwork: true unless required for host networking",
				Category:    "security",
			})
		}
	}
	return findings, nil
}

func checkHostPID(ctx context.Context, app *App) ([]Finding, error) {
	var findings []Finding
	pods, err := app.clientset.CoreV1().Pods("").List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, err
	}

	for _, pod := range pods.Items {
		if pod.Spec.HostPID {
			findings = append(findings, Finding{
				Rule:        "SEC004",
				Severity:    SeverityWarning,
				Resource:    fmt.Sprintf("Pod/%s", pod.Name),
				Namespace:   pod.Namespace,
				Message:     "Pod is using host PID namespace",
				Remediation: "Remove hostPID: true unless required",
				Category:    "security",
			})
		}
	}
	return findings, nil
}

func checkHostIPC(ctx context.Context, app *App) ([]Finding, error) {
	var findings []Finding
	pods, err := app.clientset.CoreV1().Pods("").List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, err
	}

	for _, pod := range pods.Items {
		if pod.Spec.HostIPC {
			findings = append(findings, Finding{
				Rule:        "SEC005",
				Severity:    SeverityWarning,
				Resource:    fmt.Sprintf("Pod/%s", pod.Name),
				Namespace:   pod.Namespace,
				Message:     "Pod is using host IPC namespace",
				Remediation: "Remove hostIPC: true unless required",
				Category:    "security",
			})
		}
	}
	return findings, nil
}

func checkAddedCapabilities(ctx context.Context, app *App) ([]Finding, error) {
	var findings []Finding
	pods, err := app.clientset.CoreV1().Pods("").List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, err
	}

	dangerousCaps := map[string]bool{
		"SYS_ADMIN": true, "NET_ADMIN": true, "SYS_PTRACE": true,
		"DAC_OVERRIDE": true, "SETUID": true, "SETGID": true,
	}

	for _, pod := range pods.Items {
		for _, container := range pod.Spec.Containers {
			if container.SecurityContext != nil && container.SecurityContext.Capabilities != nil {
				for _, cap := range container.SecurityContext.Capabilities.Add {
					if dangerousCaps[string(cap)] {
						findings = append(findings, Finding{
							Rule:        "SEC006",
							Severity:    SeverityWarning,
							Resource:    fmt.Sprintf("Pod/%s (container: %s)", pod.Name, container.Name),
							Namespace:   pod.Namespace,
							Message:     fmt.Sprintf("Container has added capability: %s", cap),
							Remediation: "Remove unnecessary capabilities from securityContext.capabilities.add",
							Category:    "security",
						})
					}
				}
			}
		}
	}
	return findings, nil
}

func checkNoSecurityContext(ctx context.Context, app *App) ([]Finding, error) {
	var findings []Finding
	pods, err := app.clientset.CoreV1().Pods("").List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, err
	}

	for _, pod := range pods.Items {
		if pod.Spec.SecurityContext == nil {
			hasContainerSC := false
			for _, container := range pod.Spec.Containers {
				if container.SecurityContext != nil {
					hasContainerSC = true
					break
				}
			}
			if !hasContainerSC {
				findings = append(findings, Finding{
					Rule:        "SEC007",
					Severity:    SeverityInfo,
					Resource:    fmt.Sprintf("Pod/%s", pod.Name),
					Namespace:   pod.Namespace,
					Message:     "Pod has no security context defined",
					Remediation: "Add securityContext with runAsNonRoot, readOnlyRootFilesystem, etc.",
					Category:    "security",
				})
			}
		}
	}
	return findings, nil
}

func checkAllowPrivilegeEscalation(ctx context.Context, app *App) ([]Finding, error) {
	var findings []Finding
	pods, err := app.clientset.CoreV1().Pods("").List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, err
	}

	for _, pod := range pods.Items {
		for _, container := range pod.Spec.Containers {
			if container.SecurityContext == nil || container.SecurityContext.AllowPrivilegeEscalation == nil || *container.SecurityContext.AllowPrivilegeEscalation {
				findings = append(findings, Finding{
					Rule:        "SEC008",
					Severity:    SeverityWarning,
					Resource:    fmt.Sprintf("Pod/%s (container: %s)", pod.Name, container.Name),
					Namespace:   pod.Namespace,
					Message:     "Container allows privilege escalation",
					Remediation: "Set allowPrivilegeEscalation: false in securityContext",
					Category:    "security",
				})
			}
		}
	}
	return findings, nil
}

func checkWritableRootFS(ctx context.Context, app *App) ([]Finding, error) {
	var findings []Finding
	pods, err := app.clientset.CoreV1().Pods("").List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, err
	}

	for _, pod := range pods.Items {
		for _, container := range pod.Spec.Containers {
			if container.SecurityContext == nil || container.SecurityContext.ReadOnlyRootFilesystem == nil || !*container.SecurityContext.ReadOnlyRootFilesystem {
				findings = append(findings, Finding{
					Rule:        "SEC009",
					Severity:    SeverityInfo,
					Resource:    fmt.Sprintf("Pod/%s (container: %s)", pod.Name, container.Name),
					Namespace:   pod.Namespace,
					Message:     "Container has writable root filesystem",
					Remediation: "Set readOnlyRootFilesystem: true and use emptyDir for writable paths",
					Category:    "security",
				})
			}
		}
	}
	return findings, nil
}

func checkDefaultServiceAccount(ctx context.Context, app *App) ([]Finding, error) {
	var findings []Finding
	pods, err := app.clientset.CoreV1().Pods("").List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, err
	}

	for _, pod := range pods.Items {
		if pod.Spec.ServiceAccountName == "" || pod.Spec.ServiceAccountName == "default" {
			findings = append(findings, Finding{
				Rule:        "SEC010",
				Severity:    SeverityInfo,
				Resource:    fmt.Sprintf("Pod/%s", pod.Name),
				Namespace:   pod.Namespace,
				Message:     "Pod is using default service account",
				Remediation: "Create and use a dedicated service account with minimal permissions",
				Category:    "security",
			})
		}
	}
	return findings, nil
}

// checkContainerImageIssues checks for images using :latest tag or missing digest
func checkContainerImageIssues(ctx context.Context, app *App) ([]Finding, error) {
	var findings []Finding
	pods, err := app.clientset.CoreV1().Pods("").List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, err
	}

	for _, pod := range pods.Items {
		for _, container := range pod.Spec.Containers {
			image := container.Image
			// Check for :latest tag
			if strings.HasSuffix(image, ":latest") || !strings.Contains(image, ":") || !strings.Contains(image, "@") {
				severity := SeverityWarning
				if strings.HasSuffix(image, ":latest") {
					severity = SeverityWarning
				} else if !strings.Contains(image, "@") {
					severity = SeverityInfo // Missing digest is less critical
				}
				findings = append(findings, Finding{
					Rule:        "SEC011",
					Severity:    severity,
					Resource:    fmt.Sprintf("Pod/%s (container: %s)", pod.Name, container.Name),
					Namespace:   pod.Namespace,
					Message:     fmt.Sprintf("Container image '%s' uses :latest tag or missing digest", image),
					Remediation: "Use specific image tags with digest (e.g., image:tag@sha256:digest) for reproducible deployments",
					Category:    "security",
				})
			}
		}
		// Check init containers too
		for _, container := range pod.Spec.InitContainers {
			image := container.Image
			if strings.HasSuffix(image, ":latest") || !strings.Contains(image, ":") || !strings.Contains(image, "@") {
				findings = append(findings, Finding{
					Rule:        "SEC011",
					Severity:    SeverityWarning,
					Resource:    fmt.Sprintf("Pod/%s (initContainer: %s)", pod.Name, container.Name),
					Namespace:   pod.Namespace,
					Message:     fmt.Sprintf("Init container image '%s' uses :latest tag or missing digest", image),
					Remediation: "Use specific image tags with digest for init containers",
					Category:    "security",
				})
			}
		}
	}
	return findings, nil
}

// checkOldBaseImages checks for potentially outdated base images
func checkOldBaseImages(ctx context.Context, app *App) ([]Finding, error) {
	var findings []Finding
	pods, err := app.clientset.CoreV1().Pods("").List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, err
	}

	// Common old base images that should be updated
	oldImages := map[string]bool{
		"alpine:3.10": true, "alpine:3.11": true, "alpine:3.12": true,
		"ubuntu:18.04": true, "ubuntu:19.04": true, "ubuntu:19.10": true,
		"debian:9": true, "debian:10": true,
		"centos:7": true, "centos:8": true,
	}

	for _, pod := range pods.Items {
		for _, container := range pod.Spec.Containers {
			image := container.Image
			// Check if image matches known old patterns
			for oldImg := range oldImages {
				if strings.Contains(image, oldImg) {
					findings = append(findings, Finding{
						Rule:        "SEC012",
						Severity:    SeverityWarning,
						Resource:    fmt.Sprintf("Pod/%s (container: %s)", pod.Name, container.Name),
						Namespace:   pod.Namespace,
						Message:     fmt.Sprintf("Container using potentially outdated base image: %s", image),
						Remediation: "Update to newer base image versions with security patches",
						Category:    "security",
					})
					break
				}
			}
		}
	}
	return findings, nil
}

// checkImagePullSecrets checks for pods that might need image pull secrets
func checkImagePullSecrets(ctx context.Context, app *App) ([]Finding, error) {
	var findings []Finding
	pods, err := app.clientset.CoreV1().Pods("").List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, err
	}

	// Check for private registry patterns
	privateRegistries := []string{"gcr.io", "docker.io", "quay.io", "registry.k8s.io", "ghcr.io"}

	for _, pod := range pods.Items {
		for _, container := range pod.Spec.Containers {
			image := container.Image
			// If using a private registry and no pull secrets, it's just info
			needsSecret := false
			for _, reg := range privateRegistries {
				if strings.Contains(image, reg) && len(pod.Spec.ImagePullSecrets) == 0 {
					needsSecret = true
					break
				}
			}
			if needsSecret {
				findings = append(findings, Finding{
					Rule:        "SEC013",
					Severity:    SeverityInfo,
					Resource:    fmt.Sprintf("Pod/%s (container: %s)", pod.Name, container.Name),
					Namespace:   pod.Namespace,
					Message:     fmt.Sprintf("Pod may need imagePullSecrets for private registry image: %s", image),
					Remediation: "Add imagePullSecrets if accessing private container registries",
					Category:    "security",
				})
				break // Only report once per pod
			}
		}
	}
	return findings, nil
}

// === RELIABILITY CHECK IMPLEMENTATIONS ===

func checkMissingLimits(ctx context.Context, app *App) ([]Finding, error) {
	var findings []Finding
	pods, err := app.clientset.CoreV1().Pods("").List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, err
	}

	for _, pod := range pods.Items {
		for _, container := range pod.Spec.Containers {
			if container.Resources.Limits.Cpu().IsZero() || container.Resources.Limits.Memory().IsZero() {
				findings = append(findings, Finding{
					Rule:        "REL001",
					Severity:    SeverityWarning,
					Resource:    fmt.Sprintf("Pod/%s (container: %s)", pod.Name, container.Name),
					Namespace:   pod.Namespace,
					Message:     "Container has no resource limits defined",
					Remediation: "Add resources.limits.cpu and resources.limits.memory",
					Category:    "reliability",
				})
			}
		}
	}
	return findings, nil
}

func checkMissingRequests(ctx context.Context, app *App) ([]Finding, error) {
	var findings []Finding
	pods, err := app.clientset.CoreV1().Pods("").List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, err
	}

	for _, pod := range pods.Items {
		for _, container := range pod.Spec.Containers {
			if container.Resources.Requests.Cpu().IsZero() || container.Resources.Requests.Memory().IsZero() {
				findings = append(findings, Finding{
					Rule:        "REL002",
					Severity:    SeverityWarning,
					Resource:    fmt.Sprintf("Pod/%s (container: %s)", pod.Name, container.Name),
					Namespace:   pod.Namespace,
					Message:     "Container has no resource requests defined",
					Remediation: "Add resources.requests.cpu and resources.requests.memory",
					Category:    "reliability",
				})
			}
		}
	}
	return findings, nil
}

func checkMissingLivenessProbe(ctx context.Context, app *App) ([]Finding, error) {
	var findings []Finding
	pods, err := app.clientset.CoreV1().Pods("").List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, err
	}

	for _, pod := range pods.Items {
		for _, container := range pod.Spec.Containers {
			if container.LivenessProbe == nil {
				findings = append(findings, Finding{
					Rule:        "REL003",
					Severity:    SeverityWarning,
					Resource:    fmt.Sprintf("Pod/%s (container: %s)", pod.Name, container.Name),
					Namespace:   pod.Namespace,
					Message:     "Container has no liveness probe defined",
					Remediation: "Add livenessProbe to detect and restart unhealthy containers",
					Category:    "reliability",
				})
			}
		}
	}
	return findings, nil
}

func checkMissingReadinessProbe(ctx context.Context, app *App) ([]Finding, error) {
	var findings []Finding
	pods, err := app.clientset.CoreV1().Pods("").List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, err
	}

	for _, pod := range pods.Items {
		for _, container := range pod.Spec.Containers {
			if container.ReadinessProbe == nil {
				findings = append(findings, Finding{
					Rule:        "REL004",
					Severity:    SeverityWarning,
					Resource:    fmt.Sprintf("Pod/%s (container: %s)", pod.Name, container.Name),
					Namespace:   pod.Namespace,
					Message:     "Container has no readiness probe defined",
					Remediation: "Add readinessProbe to control traffic routing",
					Category:    "reliability",
				})
			}
		}
	}
	return findings, nil
}

func checkSingleReplica(ctx context.Context, app *App) ([]Finding, error) {
	var findings []Finding

	// Check Deployments
	deployments, err := app.clientset.AppsV1().Deployments("").List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, err
	}

	for _, deploy := range deployments.Items {
		if deploy.Spec.Replicas != nil && *deploy.Spec.Replicas == 1 {
			findings = append(findings, Finding{
				Rule:        "REL005",
				Severity:    SeverityWarning,
				Resource:    fmt.Sprintf("Deployment/%s", deploy.Name),
				Namespace:   deploy.Namespace,
				Message:     "Deployment has only 1 replica (no high availability)",
				Remediation: "Increase replicas to at least 2 for production workloads and add podAntiAffinity with PodDisruptionBudget",
				Category:    "reliability",
			})
		}
	}

	// Check StatefulSets
	statefulsets, err := app.clientset.AppsV1().StatefulSets("").List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, err
	}

	for _, sts := range statefulsets.Items {
		if sts.Spec.Replicas != nil && *sts.Spec.Replicas == 1 {
			findings = append(findings, Finding{
				Rule:        "REL005",
				Severity:    SeverityWarning,
				Resource:    fmt.Sprintf("StatefulSet/%s", sts.Name),
				Namespace:   sts.Namespace,
				Message:     "StatefulSet has only 1 replica (no high availability)",
				Remediation: "Increase replicas to at least 2 for production workloads and add podAntiAffinity with PodDisruptionBudget",
				Category:    "reliability",
			})
		}
	}

	// Note: DaemonSets run one pod per node by design, so we don't check them for single replica
	return findings, nil
}

func checkMissingPDB(ctx context.Context, app *App) ([]Finding, error) {
	var findings []Finding

	// Build a map of PDB selectors by namespace
	pdbMap := make(map[string]map[string]bool) // namespace -> selector map

	// Try PolicyV1 first
	pdbs, err := app.clientset.PolicyV1().PodDisruptionBudgets("").List(ctx, metav1.ListOptions{})
	if err != nil {
		// PolicyV1 might not be available, try PolicyV1beta1
		pdbsBeta, errBeta := app.clientset.PolicyV1beta1().PodDisruptionBudgets("").List(ctx, metav1.ListOptions{})
		if errBeta != nil {
			// If both fail, we'll just skip PDB checks but continue with other checks
			// Return empty findings rather than error to not break the whole diagnostic run
			return findings, nil
		}
		// Process beta PDBs
		for _, pdb := range pdbsBeta.Items {
			if pdbMap[pdb.Namespace] == nil {
				pdbMap[pdb.Namespace] = make(map[string]bool)
			}
			for k, v := range pdb.Spec.Selector.MatchLabels {
				pdbMap[pdb.Namespace][k+"="+v] = true
			}
		}
	} else {
		// Process v1 PDBs
		for _, pdb := range pdbs.Items {
			if pdbMap[pdb.Namespace] == nil {
				pdbMap[pdb.Namespace] = make(map[string]bool)
			}
			for k, v := range pdb.Spec.Selector.MatchLabels {
				pdbMap[pdb.Namespace][k+"="+v] = true
			}
		}
	}

	// Check Deployments
	deployments, err := app.clientset.AppsV1().Deployments("").List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, err
	}

	for _, deploy := range deployments.Items {
		if deploy.Spec.Replicas != nil && *deploy.Spec.Replicas > 1 {
			hasPDB := false
			nsPDBs := pdbMap[deploy.Namespace]
			if nsPDBs != nil {
				for k, v := range deploy.Spec.Selector.MatchLabels {
					if nsPDBs[k+"="+v] {
						hasPDB = true
						break
					}
				}
			}
			if !hasPDB {
				findings = append(findings, Finding{
					Rule:        "REL006",
					Severity:    SeverityInfo,
					Resource:    fmt.Sprintf("Deployment/%s", deploy.Name),
					Namespace:   deploy.Namespace,
					Message:     "Deployment has no PodDisruptionBudget",
					Remediation: "Create a PodDisruptionBudget to ensure availability during voluntary disruptions",
					Category:    "reliability",
				})
			}
		}
	}

	// Check StatefulSets
	statefulsets, err := app.clientset.AppsV1().StatefulSets("").List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, err
	}

	for _, sts := range statefulsets.Items {
		if sts.Spec.Replicas != nil && *sts.Spec.Replicas > 1 {
			hasPDB := false
			nsPDBs := pdbMap[sts.Namespace]
			if nsPDBs != nil {
				for k, v := range sts.Spec.Selector.MatchLabels {
					if nsPDBs[k+"="+v] {
						hasPDB = true
						break
					}
				}
			}
			if !hasPDB {
				findings = append(findings, Finding{
					Rule:        "REL006",
					Severity:    SeverityInfo,
					Resource:    fmt.Sprintf("StatefulSet/%s", sts.Name),
					Namespace:   sts.Namespace,
					Message:     "StatefulSet has no PodDisruptionBudget",
					Remediation: "Create a PodDisruptionBudget to ensure availability during voluntary disruptions",
					Category:    "reliability",
				})
			}
		}
	}

	return findings, nil
}

func checkNoAntiAffinity(ctx context.Context, app *App) ([]Finding, error) {
	var findings []Finding

	// Check Deployments
	deployments, err := app.clientset.AppsV1().Deployments("").List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, err
	}

	for _, deploy := range deployments.Items {
		if deploy.Spec.Replicas != nil && *deploy.Spec.Replicas > 1 {
			hasAntiAffinity := false
			if deploy.Spec.Template.Spec.Affinity != nil && deploy.Spec.Template.Spec.Affinity.PodAntiAffinity != nil {
				// Check if there's a preferred or required anti-affinity rule
				if len(deploy.Spec.Template.Spec.Affinity.PodAntiAffinity.PreferredDuringSchedulingIgnoredDuringExecution) > 0 ||
					len(deploy.Spec.Template.Spec.Affinity.PodAntiAffinity.RequiredDuringSchedulingIgnoredDuringExecution) > 0 {
					hasAntiAffinity = true
				}
			}
			if !hasAntiAffinity {
				findings = append(findings, Finding{
					Rule:        "REL007",
					Severity:    SeverityInfo,
					Resource:    fmt.Sprintf("Deployment/%s", deploy.Name),
					Namespace:   deploy.Namespace,
					Message:     "Multi-replica deployment has no pod anti-affinity",
					Remediation: "Add podAntiAffinity to spread pods across nodes for better availability",
					Category:    "reliability",
				})
			}
		}
	}

	// Check StatefulSets
	statefulsets, err := app.clientset.AppsV1().StatefulSets("").List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, err
	}

	for _, sts := range statefulsets.Items {
		if sts.Spec.Replicas != nil && *sts.Spec.Replicas > 1 {
			hasAntiAffinity := false
			if sts.Spec.Template.Spec.Affinity != nil && sts.Spec.Template.Spec.Affinity.PodAntiAffinity != nil {
				if len(sts.Spec.Template.Spec.Affinity.PodAntiAffinity.PreferredDuringSchedulingIgnoredDuringExecution) > 0 ||
					len(sts.Spec.Template.Spec.Affinity.PodAntiAffinity.RequiredDuringSchedulingIgnoredDuringExecution) > 0 {
					hasAntiAffinity = true
				}
			}
			if !hasAntiAffinity {
				findings = append(findings, Finding{
					Rule:        "REL007",
					Severity:    SeverityInfo,
					Resource:    fmt.Sprintf("StatefulSet/%s", sts.Name),
					Namespace:   sts.Namespace,
					Message:     "Multi-replica StatefulSet has no pod anti-affinity",
					Remediation: "Add podAntiAffinity to spread pods across nodes for better availability",
					Category:    "reliability",
				})
			}
		}
	}

	return findings, nil
}

func checkRestartLoop(ctx context.Context, app *App) ([]Finding, error) {
	var findings []Finding
	pods, err := app.clientset.CoreV1().Pods("").List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, err
	}

	for _, pod := range pods.Items {
		for _, status := range pod.Status.ContainerStatuses {
			if status.RestartCount > 5 {
				findings = append(findings, Finding{
					Rule:        "REL008",
					Severity:    SeverityCritical,
					Resource:    fmt.Sprintf("Pod/%s (container: %s)", pod.Name, status.Name),
					Namespace:   pod.Namespace,
					Message:     fmt.Sprintf("Container has restarted %d times", status.RestartCount),
					Remediation: "Check container logs and events to identify the cause of restarts",
					Category:    "reliability",
				})
			}
		}
	}
	return findings, nil
}

func checkImagePullPolicy(ctx context.Context, app *App) ([]Finding, error) {
	var findings []Finding
	pods, err := app.clientset.CoreV1().Pods("").List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, err
	}

	for _, pod := range pods.Items {
		for _, container := range pod.Spec.Containers {
			if strings.HasSuffix(container.Image, ":latest") && container.ImagePullPolicy == corev1.PullAlways {
				findings = append(findings, Finding{
					Rule:        "REL009",
					Severity:    SeverityInfo,
					Resource:    fmt.Sprintf("Pod/%s (container: %s)", pod.Name, container.Name),
					Namespace:   pod.Namespace,
					Message:     "Using :latest tag with Always pull policy",
					Remediation: "Use specific image tags for reproducible deployments",
					Category:    "reliability",
				})
			}
		}
	}
	return findings, nil
}

func checkNoImageTag(ctx context.Context, app *App) ([]Finding, error) {
	var findings []Finding
	pods, err := app.clientset.CoreV1().Pods("").List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, err
	}

	for _, pod := range pods.Items {
		for _, container := range pod.Spec.Containers {
			if !strings.Contains(container.Image, ":") || strings.HasSuffix(container.Image, ":latest") {
				findings = append(findings, Finding{
					Rule:        "REL010",
					Severity:    SeverityWarning,
					Resource:    fmt.Sprintf("Pod/%s (container: %s)", pod.Name, container.Name),
					Namespace:   pod.Namespace,
					Message:     fmt.Sprintf("Image uses :latest or no tag: %s", container.Image),
					Remediation: "Use specific version tags for reproducible deployments",
					Category:    "reliability",
				})
			}
		}
	}
	return findings, nil
}

// === PERFORMANCE CHECK IMPLEMENTATIONS ===

func checkCPUOverProvisioned(ctx context.Context, app *App) ([]Finding, error) {
	// This would require metrics-server integration
	return nil, nil
}

func checkMemoryOverProvisioned(ctx context.Context, app *App) ([]Finding, error) {
	// This would require metrics-server integration
	return nil, nil
}

func checkCPUUnderProvisioned(ctx context.Context, app *App) ([]Finding, error) {
	// This would require metrics-server integration
	return nil, nil
}

func checkMemoryUnderProvisioned(ctx context.Context, app *App) ([]Finding, error) {
	// This would require metrics-server integration
	return nil, nil
}

func checkMissingHPA(ctx context.Context, app *App) ([]Finding, error) {
	var findings []Finding
	deployments, err := app.clientset.AppsV1().Deployments("").List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, err
	}

	hpas, err := app.clientset.AutoscalingV2().HorizontalPodAutoscalers(app.namespace).List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, err
	}

	hpaTargets := make(map[string]bool)
	for _, hpa := range hpas.Items {
		hpaTargets[hpa.Spec.ScaleTargetRef.Name] = true
	}

	for _, deploy := range deployments.Items {
		if !hpaTargets[deploy.Name] {
			findings = append(findings, Finding{
				Rule:        "PERF005",
				Severity:    SeverityInfo,
				Resource:    fmt.Sprintf("Deployment/%s", deploy.Name),
				Namespace:   deploy.Namespace,
				Message:     "Deployment has no HorizontalPodAutoscaler",
				Remediation: "Consider adding HPA for automatic scaling based on load",
				Category:    "performance",
			})
		}
	}
	return findings, nil
}

// === NETWORKING CHECK IMPLEMENTATIONS ===

func checkServiceNoEndpoints(ctx context.Context, app *App) ([]Finding, error) {
	var findings []Finding
	services, err := app.clientset.CoreV1().Services("").List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, err
	}

	for _, svc := range services.Items {
		if svc.Spec.Type == corev1.ServiceTypeExternalName {
			continue
		}
		endpoints, err := app.clientset.CoreV1().Endpoints(app.namespace).Get(ctx, svc.Name, metav1.GetOptions{})
		if err != nil {
			continue
		}
		hasEndpoints := false
		for _, subset := range endpoints.Subsets {
			if len(subset.Addresses) > 0 {
				hasEndpoints = true
				break
			}
		}
		if !hasEndpoints {
			findings = append(findings, Finding{
				Rule:        "NET001",
				Severity:    SeverityWarning,
				Resource:    fmt.Sprintf("Service/%s", svc.Name),
				Namespace:   svc.Namespace,
				Message:     "Service has no endpoints",
				Remediation: "Check selector labels match target pods, ensure pods are running",
				Category:    "networking",
			})
		}
	}
	return findings, nil
}

func checkNodePortServices(ctx context.Context, app *App) ([]Finding, error) {
	var findings []Finding
	services, err := app.clientset.CoreV1().Services("").List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, err
	}

	for _, svc := range services.Items {
		if svc.Spec.Type == corev1.ServiceTypeNodePort {
			findings = append(findings, Finding{
				Rule:        "NET002",
				Severity:    SeverityInfo,
				Resource:    fmt.Sprintf("Service/%s", svc.Name),
				Namespace:   svc.Namespace,
				Message:     "Service is using NodePort type",
				Remediation: "Consider using LoadBalancer or Ingress for production",
				Category:    "networking",
			})
		}
	}
	return findings, nil
}

func checkMissingNetworkPolicy(ctx context.Context, app *App) ([]Finding, error) {
	var findings []Finding
	policies, err := app.clientset.NetworkingV1().NetworkPolicies(app.namespace).List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, err
	}

	if len(policies.Items) == 0 {
		findings = append(findings, Finding{
			Rule:        "NET003",
			Severity:    SeverityInfo,
			Resource:    fmt.Sprintf("Namespace/%s", app.namespace),
			Namespace:   app.namespace,
			Message:     "Namespace has no network policies defined",
			Remediation: "Add NetworkPolicies to control pod-to-pod communication",
			Category:    "networking",
		})
	}
	return findings, nil
}

func checkIngressNoTLS(ctx context.Context, app *App) ([]Finding, error) {
	var findings []Finding
	ingresses, err := app.clientset.NetworkingV1().Ingresses(app.namespace).List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, err
	}

	for _, ing := range ingresses.Items {
		if len(ing.Spec.TLS) == 0 {
			findings = append(findings, Finding{
				Rule:        "NET004",
				Severity:    SeverityWarning,
				Resource:    fmt.Sprintf("Ingress/%s", ing.Name),
				Namespace:   ing.Namespace,
				Message:     "Ingress has no TLS configuration",
				Remediation: "Add TLS configuration with valid certificates",
				Category:    "networking",
			})
		}
	}
	return findings, nil
}

// === STORAGE CHECK IMPLEMENTATIONS ===

func checkPVCPending(ctx context.Context, app *App) ([]Finding, error) {
	var findings []Finding
	pvcs, err := app.clientset.CoreV1().PersistentVolumeClaims("").List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, err
	}

	for _, pvc := range pvcs.Items {
		if pvc.Status.Phase == corev1.ClaimPending {
			findings = append(findings, Finding{
				Rule:        "STG001",
				Severity:    SeverityCritical,
				Resource:    fmt.Sprintf("PVC/%s", pvc.Name),
				Namespace:   pvc.Namespace,
				Message:     "PersistentVolumeClaim is stuck in Pending state",
				Remediation: "Check storage class, PV availability, and events",
				Category:    "storage",
			})
		}
	}
	return findings, nil
}

func checkPVCHighUsage(ctx context.Context, app *App) ([]Finding, error) {
	// This would require metrics or direct volume inspection
	return nil, nil
}

func checkEmptyDirNoLimit(ctx context.Context, app *App) ([]Finding, error) {
	var findings []Finding
	pods, err := app.clientset.CoreV1().Pods("").List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, err
	}

	for _, pod := range pods.Items {
		for _, vol := range pod.Spec.Volumes {
			if vol.EmptyDir != nil && vol.EmptyDir.SizeLimit == nil {
				findings = append(findings, Finding{
					Rule:        "STG003",
					Severity:    SeverityInfo,
					Resource:    fmt.Sprintf("Pod/%s (volume: %s)", pod.Name, vol.Name),
					Namespace:   pod.Namespace,
					Message:     "EmptyDir volume has no size limit",
					Remediation: "Add sizeLimit to prevent node disk exhaustion",
					Category:    "storage",
				})
			}
		}
	}
	return findings, nil
}

// === CONFIGURATION CHECK IMPLEMENTATIONS ===

func checkUnusedConfigMaps(ctx context.Context, app *App) ([]Finding, error) {
	// Implementation would check if ConfigMaps are referenced by pods
	return nil, nil
}

func checkUnusedSecrets(ctx context.Context, app *App) ([]Finding, error) {
	// Implementation would check if Secrets are referenced by pods
	return nil, nil
}

func checkEnvFromSecret(ctx context.Context, app *App) ([]Finding, error) {
	var findings []Finding
	pods, err := app.clientset.CoreV1().Pods("").List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, err
	}

	for _, pod := range pods.Items {
		for _, container := range pod.Spec.Containers {
			for _, env := range container.Env {
				if env.ValueFrom != nil && env.ValueFrom.SecretKeyRef != nil {
					findings = append(findings, Finding{
						Rule:        "CFG003",
						Severity:    SeverityInfo,
						Resource:    fmt.Sprintf("Pod/%s (container: %s)", pod.Name, container.Name),
						Namespace:   pod.Namespace,
						Message:     fmt.Sprintf("Secret exposed via environment variable: %s", env.Name),
						Remediation: "Consider mounting secrets as files instead of env vars",
						Category:    "configuration",
					})
				}
			}
		}
	}
	return findings, nil
}

// === WORKLOAD HEALTH CHECK IMPLEMENTATIONS ===

func checkPodPending(ctx context.Context, app *App) ([]Finding, error) {
	var findings []Finding
	pods, err := app.clientset.CoreV1().Pods("").List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, err
	}

	for _, pod := range pods.Items {
		if pod.Status.Phase == corev1.PodPending {
			findings = append(findings, Finding{
				Rule:        "WRK001",
				Severity:    SeverityWarning,
				Resource:    fmt.Sprintf("Pod/%s", pod.Name),
				Namespace:   pod.Namespace,
				Message:     "Pod is stuck in Pending state",
				Remediation: "Check events, resource constraints, and node availability",
				Category:    "workload",
			})
		}
	}
	return findings, nil
}

func checkPodFailed(ctx context.Context, app *App) ([]Finding, error) {
	var findings []Finding
	pods, err := app.clientset.CoreV1().Pods("").List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, err
	}

	for _, pod := range pods.Items {
		if pod.Status.Phase == corev1.PodFailed {
			findings = append(findings, Finding{
				Rule:        "WRK002",
				Severity:    SeverityCritical,
				Resource:    fmt.Sprintf("Pod/%s", pod.Name),
				Namespace:   pod.Namespace,
				Message:     "Pod is in Failed state",
				Remediation: "Check pod logs and events for failure reason",
				Category:    "workload",
			})
		}
	}
	return findings, nil
}

func checkPodUnknown(ctx context.Context, app *App) ([]Finding, error) {
	var findings []Finding
	pods, err := app.clientset.CoreV1().Pods("").List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, err
	}

	for _, pod := range pods.Items {
		if pod.Status.Phase == corev1.PodUnknown {
			findings = append(findings, Finding{
				Rule:        "WRK003",
				Severity:    SeverityWarning,
				Resource:    fmt.Sprintf("Pod/%s", pod.Name),
				Namespace:   pod.Namespace,
				Message:     "Pod is in Unknown state",
				Remediation: "Check node connectivity and kubelet status",
				Category:    "workload",
			})
		}
	}
	return findings, nil
}

func checkContainerNotReady(ctx context.Context, app *App) ([]Finding, error) {
	var findings []Finding
	pods, err := app.clientset.CoreV1().Pods("").List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, err
	}

	for _, pod := range pods.Items {
		if pod.Status.Phase == corev1.PodRunning {
			for _, status := range pod.Status.ContainerStatuses {
				if !status.Ready {
					findings = append(findings, Finding{
						Rule:        "WRK004",
						Severity:    SeverityWarning,
						Resource:    fmt.Sprintf("Pod/%s (container: %s)", pod.Name, status.Name),
						Namespace:   pod.Namespace,
						Message:     "Container is not ready",
						Remediation: "Check readiness probe configuration and container logs",
						Category:    "workload",
					})
				}
			}
		}
	}
	return findings, nil
}

func checkDeploymentUnavailable(ctx context.Context, app *App) ([]Finding, error) {
	var findings []Finding
	deployments, err := app.clientset.AppsV1().Deployments("").List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, err
	}

	for _, deploy := range deployments.Items {
		if deploy.Status.UnavailableReplicas > 0 {
			findings = append(findings, Finding{
				Rule:        "WRK005",
				Severity:    SeverityCritical,
				Resource:    fmt.Sprintf("Deployment/%s", deploy.Name),
				Namespace:   deploy.Namespace,
				Message:     fmt.Sprintf("Deployment has %d unavailable replicas", deploy.Status.UnavailableReplicas),
				Remediation: "Check pod status and events for the deployment",
				Category:    "workload",
			})
		}
	}
	return findings, nil
}

func checkDaemonSetNotReady(ctx context.Context, app *App) ([]Finding, error) {
	var findings []Finding
	daemonsets, err := app.clientset.AppsV1().DaemonSets("").List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, err
	}

	for _, ds := range daemonsets.Items {
		if ds.Status.NumberUnavailable > 0 {
			findings = append(findings, Finding{
				Rule:        "WRK006",
				Severity:    SeverityWarning,
				Resource:    fmt.Sprintf("DaemonSet/%s", ds.Name),
				Namespace:   ds.Namespace,
				Message:     fmt.Sprintf("DaemonSet has %d unavailable pods", ds.Status.NumberUnavailable),
				Remediation: "Check pod status on affected nodes",
				Category:    "workload",
			})
		}
	}
	return findings, nil
}

func checkStatefulSetNotReady(ctx context.Context, app *App) ([]Finding, error) {
	var findings []Finding
	statefulsets, err := app.clientset.AppsV1().StatefulSets("").List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, err
	}

	for _, sts := range statefulsets.Items {
		if sts.Status.ReadyReplicas < sts.Status.Replicas {
			findings = append(findings, Finding{
				Rule:        "WRK007",
				Severity:    SeverityWarning,
				Resource:    fmt.Sprintf("StatefulSet/%s", sts.Name),
				Namespace:   sts.Namespace,
				Message:     fmt.Sprintf("StatefulSet has %d/%d ready replicas", sts.Status.ReadyReplicas, sts.Status.Replicas),
				Remediation: "Check pod status and PVC bindings",
				Category:    "workload",
			})
		}
	}
	return findings, nil
}

func checkJobFailed(ctx context.Context, app *App) ([]Finding, error) {
	var findings []Finding
	jobs, err := app.clientset.BatchV1().Jobs("").List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, err
	}

	for _, job := range jobs.Items {
		if job.Status.Failed > 0 {
			findings = append(findings, Finding{
				Rule:        "WRK008",
				Severity:    SeverityWarning,
				Resource:    fmt.Sprintf("Job/%s", job.Name),
				Namespace:   job.Namespace,
				Message:     fmt.Sprintf("Job has %d failed executions", job.Status.Failed),
				Remediation: "Check job pod logs for failure reason",
				Category:    "workload",
			})
		}
	}
	return findings, nil
}

func checkCronJobSuspended(ctx context.Context, app *App) ([]Finding, error) {
	var findings []Finding
	cronjobs, err := app.clientset.BatchV1().CronJobs("").List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, err
	}

	for _, cj := range cronjobs.Items {
		if cj.Spec.Suspend != nil && *cj.Spec.Suspend {
			findings = append(findings, Finding{
				Rule:        "WRK009",
				Severity:    SeverityInfo,
				Resource:    fmt.Sprintf("CronJob/%s", cj.Name),
				Namespace:   cj.Namespace,
				Message:     "CronJob is suspended",
				Remediation: "Unsuspend if this is unintentional",
				Category:    "workload",
			})
		}
	}
	return findings, nil
}

// === NODE CHECK IMPLEMENTATIONS ===

func checkNodeNotReady(ctx context.Context, app *App) ([]Finding, error) {
	var findings []Finding
	nodes, err := app.clientset.CoreV1().Nodes().List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, err
	}

	for _, node := range nodes.Items {
		for _, condition := range node.Status.Conditions {
			if condition.Type == corev1.NodeReady && condition.Status != corev1.ConditionTrue {
				findings = append(findings, Finding{
					Rule:        "NODE001",
					Severity:    SeverityCritical,
					Resource:    fmt.Sprintf("Node/%s", node.Name),
					Namespace:   "",
					Message:     fmt.Sprintf("Node is not ready: %s", condition.Message),
					Remediation: "Check kubelet status and node connectivity",
					Category:    "node",
				})
			}
		}
	}
	return findings, nil
}

func checkNodeMemoryPressure(ctx context.Context, app *App) ([]Finding, error) {
	var findings []Finding
	nodes, err := app.clientset.CoreV1().Nodes().List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, err
	}

	for _, node := range nodes.Items {
		for _, condition := range node.Status.Conditions {
			if condition.Type == corev1.NodeMemoryPressure && condition.Status == corev1.ConditionTrue {
				findings = append(findings, Finding{
					Rule:        "NODE002",
					Severity:    SeverityWarning,
					Resource:    fmt.Sprintf("Node/%s", node.Name),
					Namespace:   "",
					Message:     "Node has memory pressure",
					Remediation: "Reduce memory usage or add more nodes",
					Category:    "node",
				})
			}
		}
	}
	return findings, nil
}

func checkNodeDiskPressure(ctx context.Context, app *App) ([]Finding, error) {
	var findings []Finding
	nodes, err := app.clientset.CoreV1().Nodes().List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, err
	}

	for _, node := range nodes.Items {
		for _, condition := range node.Status.Conditions {
			if condition.Type == corev1.NodeDiskPressure && condition.Status == corev1.ConditionTrue {
				findings = append(findings, Finding{
					Rule:        "NODE003",
					Severity:    SeverityWarning,
					Resource:    fmt.Sprintf("Node/%s", node.Name),
					Namespace:   "",
					Message:     "Node has disk pressure",
					Remediation: "Clean up disk space or expand storage",
					Category:    "node",
				})
			}
		}
	}
	return findings, nil
}

func checkNodePIDPressure(ctx context.Context, app *App) ([]Finding, error) {
	var findings []Finding
	nodes, err := app.clientset.CoreV1().Nodes().List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, err
	}

	for _, node := range nodes.Items {
		for _, condition := range node.Status.Conditions {
			if condition.Type == corev1.NodePIDPressure && condition.Status == corev1.ConditionTrue {
				findings = append(findings, Finding{
					Rule:        "NODE004",
					Severity:    SeverityWarning,
					Resource:    fmt.Sprintf("Node/%s", node.Name),
					Namespace:   "",
					Message:     "Node has PID pressure",
					Remediation: "Reduce process count or increase PID limit",
					Category:    "node",
				})
			}
		}
	}
	return findings, nil
}

func checkNodeUnschedulable(ctx context.Context, app *App) ([]Finding, error) {
	var findings []Finding
	nodes, err := app.clientset.CoreV1().Nodes().List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, err
	}

	for _, node := range nodes.Items {
		if node.Spec.Unschedulable {
			findings = append(findings, Finding{
				Rule:        "NODE005",
				Severity:    SeverityInfo,
				Resource:    fmt.Sprintf("Node/%s", node.Name),
				Namespace:   "",
				Message:     "Node is cordoned (unschedulable)",
				Remediation: "Uncordon node when maintenance is complete",
				Category:    "node",
			})
		}
	}
	return findings, nil
}
