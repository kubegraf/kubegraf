// Copyright 2025 KubeGraf Contributors
// SPDX-License-Identifier: Apache-2.0

package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/kubegraf/kubegraf/pkg/capabilities"
	"github.com/kubegraf/kubegraf/pkg/incidents"
	"github.com/kubegraf/kubegraf/pkg/instrumentation"
	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/types"
)

// IncidentIntelligence manages the incident intelligence system.
type IncidentIntelligence struct {
	app             *App
	manager         *incidents.Manager
	eventAdapter    *incidents.EventAdapter
	kubeAdapter     *incidents.KubeClientAdapter
	intelligenceSys *incidents.IntelligenceSystem

	// Caching for fast incident loading
	scanMu          sync.Mutex
	lastScanTime    time.Time
	scanInProgress  bool
	scanCacheTTL    time.Duration // Default 30 seconds

	// Demo incidents — track which cluster context demos were injected for,
	// so they are re-injected whenever the active cluster changes.
	demoIncidentsContext string
}

// NewIncidentIntelligence creates a new incident intelligence system.
func NewIncidentIntelligence(app *App) *IncidentIntelligence {
	config := incidents.DefaultManagerConfig()

	// Set cluster context if available
	if app.contextManager != nil && app.contextManager.CurrentContext != "" {
		config.ClusterContext = app.contextManager.CurrentContext
	}

	manager := incidents.NewManager(config)

	ii := &IncidentIntelligence{
		app:          app,
		manager:      manager,
		eventAdapter: incidents.NewEventAdapter(manager),
		scanCacheTTL: 30 * time.Second, // Cache incidents for 30 seconds
	}

	// Setup Kubernetes adapter
	ii.setupKubeAdapter()

	// Initialize IntelligenceSystem with learning enabled, auto-remediation disabled by default
	// But we need to create the auto-remediation engine even if disabled, so we can enable it later
	intelConfig := incidents.DefaultIntelligenceConfig()
	intelConfig.EnableLearning = true
	intelConfig.EnableKnowledgeBank = true
	intelConfig.EnableAutoRemediation = true // Create the engine, but it will be disabled by default in config
	intelConfig.AutoConfig.Enabled = false   // Disabled by default for safety

	intelSys, err := incidents.NewIntelligenceSystem(manager, ii.kubeAdapter, intelConfig)
	if err != nil {
		log.Printf("[IncidentIntelligence] Warning: Failed to initialize IntelligenceSystem: %v", err)
	} else {
		ii.intelligenceSys = intelSys
		log.Printf("[IncidentIntelligence] IntelligenceSystem initialized")
	}

	return ii
}

// StartBackgroundScanner starts the background incident scanner.
// This should be called when the app starts to pre-populate incidents.
func (ii *IncidentIntelligence) StartBackgroundScanner() {
	go func() {
		// Wait a bit for the app to fully initialize
		time.Sleep(2 * time.Second)

		if ii.app.clientset == nil || !ii.app.connected {
			log.Printf("[IncidentIntelligence] Background scanner: cluster not connected, will scan on demand")
			return
		}

		log.Printf("[IncidentIntelligence] Starting initial background incident scan")
		ii.triggerBackgroundScan()
	}()
}

// triggerBackgroundScan triggers a background scan if not already in progress.
// Returns true if a scan was triggered, false if one is already running or cache is fresh.
func (ii *IncidentIntelligence) triggerBackgroundScan() bool {
	ii.scanMu.Lock()

	// Check if cache is still fresh
	if !ii.lastScanTime.IsZero() && time.Since(ii.lastScanTime) < ii.scanCacheTTL {
		ii.scanMu.Unlock()
		return false // Cache is still fresh
	}

	// Check if scan is already in progress
	if ii.scanInProgress {
		ii.scanMu.Unlock()
		return false // Scan already running
	}

	ii.scanInProgress = true
	ii.scanMu.Unlock()

	go func() {
		defer func() {
			ii.scanMu.Lock()
			ii.scanInProgress = false
			ii.lastScanTime = time.Now()
			ii.scanMu.Unlock()
		}()

		ctx := context.Background()
		ii.scanAndIngestIncidents(ctx)
		log.Printf("[IncidentIntelligence] Background scan completed")
	}()

	return true
}

// IsCacheFresh returns true if the incident cache is still valid.
func (ii *IncidentIntelligence) IsCacheFresh() bool {
	ii.scanMu.Lock()
	defer ii.scanMu.Unlock()
	return !ii.lastScanTime.IsZero() && time.Since(ii.lastScanTime) < ii.scanCacheTTL
}

// IsScanInProgress returns true if a scan is currently running.
func (ii *IncidentIntelligence) IsScanInProgress() bool {
	ii.scanMu.Lock()
	defer ii.scanMu.Unlock()
	return ii.scanInProgress
}

// setupKubeAdapter sets up the Kubernetes client adapter for fix operations.
func (ii *IncidentIntelligence) setupKubeAdapter() {
	ii.kubeAdapter = &incidents.KubeClientAdapter{
		GetResourceFunc: func(ctx context.Context, ref incidents.KubeResourceRef) (map[string]interface{}, error) {
			if ii.app.clientset == nil {
				return nil, fmt.Errorf("no kubernetes client")
			}

			switch ref.Kind {
			case "Deployment":
				deploy, err := ii.app.clientset.AppsV1().Deployments(ref.Namespace).Get(ctx, ref.Name, metav1.GetOptions{})
				if err != nil {
					return nil, err
				}
				// Convert to map (simplified)
				return map[string]interface{}{
					"metadata": map[string]interface{}{
						"name":      deploy.Name,
						"namespace": deploy.Namespace,
					},
					"spec": map[string]interface{}{
						"replicas": deploy.Spec.Replicas,
					},
				}, nil
			case "Pod":
				pod, err := ii.app.clientset.CoreV1().Pods(ref.Namespace).Get(ctx, ref.Name, metav1.GetOptions{})
				if err != nil {
					return nil, err
				}
				return map[string]interface{}{
					"metadata": map[string]interface{}{
						"name":      pod.Name,
						"namespace": pod.Namespace,
					},
					"status": map[string]interface{}{
						"phase": pod.Status.Phase,
					},
				}, nil
			default:
				return nil, fmt.Errorf("unsupported resource kind: %s", ref.Kind)
			}
		},

		PatchResourceFunc: func(ctx context.Context, ref incidents.KubeResourceRef, patchData []byte, dryRun bool) (map[string]interface{}, error) {
			if ii.app.clientset == nil {
				return nil, fmt.Errorf("no kubernetes client")
			}

			opts := metav1.PatchOptions{}
			if dryRun {
				opts.DryRun = []string{"All"}
			}

			switch ref.Kind {
			case "Deployment":
				result, err := ii.app.clientset.AppsV1().Deployments(ref.Namespace).Patch(
					ctx, ref.Name, types.StrategicMergePatchType, patchData, opts,
				)
				if err != nil {
					return nil, err
				}
				return map[string]interface{}{
					"name":      result.Name,
					"namespace": result.Namespace,
				}, nil
			case "StatefulSet":
				result, err := ii.app.clientset.AppsV1().StatefulSets(ref.Namespace).Patch(
					ctx, ref.Name, types.StrategicMergePatchType, patchData, opts,
				)
				if err != nil {
					return nil, err
				}
				return map[string]interface{}{
					"name":      result.Name,
					"namespace": result.Namespace,
				}, nil
			case "DaemonSet":
				result, err := ii.app.clientset.AppsV1().DaemonSets(ref.Namespace).Patch(
					ctx, ref.Name, types.StrategicMergePatchType, patchData, opts,
				)
				if err != nil {
					return nil, err
				}
				return map[string]interface{}{
					"name":      result.Name,
					"namespace": result.Namespace,
				}, nil
			case "Job":
				result, err := ii.app.clientset.BatchV1().Jobs(ref.Namespace).Patch(
					ctx, ref.Name, types.StrategicMergePatchType, patchData, opts,
				)
				if err != nil {
					return nil, err
				}
				return map[string]interface{}{
					"name":      result.Name,
					"namespace": result.Namespace,
				}, nil
			case "CronJob":
				result, err := ii.app.clientset.BatchV1().CronJobs(ref.Namespace).Patch(
					ctx, ref.Name, types.StrategicMergePatchType, patchData, opts,
				)
				if err != nil {
					return nil, err
				}
				return map[string]interface{}{
					"name":      result.Name,
					"namespace": result.Namespace,
				}, nil
			default:
				return nil, fmt.Errorf("unsupported resource kind for patch: %s", ref.Kind)
			}
		},

		ScaleResourceFunc: func(ctx context.Context, ref incidents.KubeResourceRef, replicas int32, dryRun bool) error {
			if ii.app.clientset == nil {
				return fmt.Errorf("no kubernetes client")
			}

			switch ref.Kind {
			case "Deployment":
				scale, err := ii.app.clientset.AppsV1().Deployments(ref.Namespace).GetScale(ctx, ref.Name, metav1.GetOptions{})
				if err != nil {
					return err
				}

				scale.Spec.Replicas = replicas

				opts := metav1.UpdateOptions{}
				if dryRun {
					opts.DryRun = []string{"All"}
				}

				_, err = ii.app.clientset.AppsV1().Deployments(ref.Namespace).UpdateScale(ctx, ref.Name, scale, opts)
				return err
			default:
				return fmt.Errorf("unsupported resource kind for scale: %s", ref.Kind)
			}
		},

		RestartResourceFunc: func(ctx context.Context, ref incidents.KubeResourceRef, dryRun bool) error {
			if ii.app.clientset == nil {
				return fmt.Errorf("no kubernetes client")
			}

			switch ref.Kind {
			case "Deployment":
				deploy, err := ii.app.clientset.AppsV1().Deployments(ref.Namespace).Get(ctx, ref.Name, metav1.GetOptions{})
				if err != nil {
					return err
				}

				if deploy.Spec.Template.Annotations == nil {
					deploy.Spec.Template.Annotations = make(map[string]string)
				}
				deploy.Spec.Template.Annotations["kubectl.kubernetes.io/restartedAt"] = time.Now().Format(time.RFC3339)

				opts := metav1.UpdateOptions{}
				if dryRun {
					opts.DryRun = []string{"All"}
				}

				_, err = ii.app.clientset.AppsV1().Deployments(ref.Namespace).Update(ctx, deploy, opts)
				return err
			case "Pod":
				if dryRun {
					return nil // Dry run for pod delete
				}
				// Extract pod name if it contains "/" (pod/container format)
				podName := ref.Name
				if strings.Contains(podName, "/") {
					parts := strings.Split(podName, "/")
					podName = parts[0]
					log.Printf("[RestartResource] Extracted pod name from '%s' to '%s'", ref.Name, podName)
				}
				log.Printf("[RestartResource] Deleting pod: %s/%s", ref.Namespace, podName)
				err := ii.app.clientset.CoreV1().Pods(ref.Namespace).Delete(ctx, podName, metav1.DeleteOptions{})
				if err != nil {
					log.Printf("[RestartResource] Error deleting pod: %v", err)
					return err
				}
				log.Printf("[RestartResource] Successfully deleted pod: %s/%s", ref.Namespace, podName)
				return nil
			default:
				return fmt.Errorf("unsupported resource kind for restart: %s", ref.Kind)
			}
		},

		RollbackResourceFunc: func(ctx context.Context, ref incidents.KubeResourceRef, revision int64, dryRun bool) error {
			if ii.app.clientset == nil {
				return fmt.Errorf("no kubernetes client")
			}

			opts := metav1.UpdateOptions{}
			if dryRun {
				opts.DryRun = []string{"All"}
			}

			switch ref.Kind {
			case "Deployment":
				// Get the deployment
				deploy, err := ii.app.clientset.AppsV1().Deployments(ref.Namespace).Get(ctx, ref.Name, metav1.GetOptions{})
				if err != nil {
					return fmt.Errorf("failed to get deployment: %w", err)
				}

				// Get rollout history to find previous revision
				history, err := ii.app.clientset.AppsV1().ReplicaSets(ref.Namespace).List(ctx, metav1.ListOptions{
					LabelSelector: metav1.FormatLabelSelector(deploy.Spec.Selector),
				})
				if err != nil {
					return fmt.Errorf("failed to get rollout history: %w", err)
				}

				// Find the current ReplicaSet
				var currentRS *appsv1.ReplicaSet
				for i := range history.Items {
					rs := &history.Items[i]
					if rs.Annotations["deployment.kubernetes.io/revision"] == fmt.Sprintf("%d", deploy.Status.ObservedGeneration) {
						currentRS = rs
						break
					}
				}

				// Find a previous ReplicaSet (not the current one)
				var previousRS *appsv1.ReplicaSet
				for i := range history.Items {
					rs := &history.Items[i]
					if currentRS == nil || rs.Name != currentRS.Name {
						if previousRS == nil || rs.CreationTimestamp.Time.After(previousRS.CreationTimestamp.Time) {
							previousRS = rs
						}
					}
				}

				if previousRS == nil {
					return fmt.Errorf("no previous revision found to rollback to")
				}

				// Rollback by updating deployment to use previous ReplicaSet's template
				if previousRS.Spec.Template.Labels != nil {
					deploy.Spec.Template = previousRS.Spec.Template
				}

				_, err = ii.app.clientset.AppsV1().Deployments(ref.Namespace).Update(ctx, deploy, opts)
				return err
			default:
				return fmt.Errorf("rollback not supported for resource kind: %s", ref.Kind)
			}
		},

		DeleteResourceFunc: func(ctx context.Context, ref incidents.KubeResourceRef, dryRun bool) error {
			if ii.app.clientset == nil {
				return fmt.Errorf("no kubernetes client")
			}

			if dryRun {
				return nil // Dry run validation
			}

			switch ref.Kind {
			case "Pod":
				return ii.app.clientset.CoreV1().Pods(ref.Namespace).Delete(ctx, ref.Name, metav1.DeleteOptions{})
			default:
				return fmt.Errorf("delete not supported for kind: %s", ref.Kind)
			}
		},

		GetPodLogsFunc: func(ctx context.Context, namespace, podName, container string, tailLines int64, previous bool) (string, error) {
			if ii.app.clientset == nil {
				return "", fmt.Errorf("no kubernetes client")
			}

			opts := &corev1.PodLogOptions{
				Previous: previous,
			}
			if tailLines > 0 {
				opts.TailLines = &tailLines
			}
			if container != "" {
				opts.Container = container
			}

			req := ii.app.clientset.CoreV1().Pods(namespace).GetLogs(podName, opts)
			stream, err := req.Stream(ctx)
			if err != nil {
				return "", fmt.Errorf("failed to get log stream: %w", err)
			}
			defer stream.Close()

			// Read all logs
			buf := make([]byte, 0, 64*1024)
			tmp := make([]byte, 4096)
			for {
				n, err := stream.Read(tmp)
				if n > 0 {
					buf = append(buf, tmp[:n]...)
				}
				if err != nil {
					break
				}
				// Limit to 1MB of logs
				if len(buf) > 1024*1024 {
					break
				}
			}

			return string(buf), nil
		},
	}

	ii.manager.SetKubeExecutor(ii.kubeAdapter)
}

// Start starts the incident intelligence system.
func (ii *IncidentIntelligence) Start(ctx context.Context) {
	ii.manager.Start(ctx)

	// Start IntelligenceSystem if available
	if ii.intelligenceSys != nil {
		if err := ii.intelligenceSys.Start(); err != nil {
			log.Printf("[IncidentIntelligence] Warning: Failed to start IntelligenceSystem: %v", err)
		} else {
			// Register callback to feed incidents to IntelligenceSystem
			ii.manager.RegisterCallback(func(incident *incidents.Incident) {
				ii.intelligenceSys.ProcessIncident(incident)
			})
		}
	}

	// Register with event monitor if available
	if ii.app.eventMonitor != nil {
		ii.app.eventMonitor.RegisterCallback(ii.handleMonitoredEvent)
	}

	// Start periodic scanning to feed incidents into v2 manager
	go ii.periodicScanAndIngest(ctx)
}

// periodicScanAndIngest periodically scans Kubernetes resources and feeds findings into v2 manager
func (ii *IncidentIntelligence) periodicScanAndIngest(ctx context.Context) {
	// Production-ready: Scan every 2 minutes (reduce cluster API load)
	scanTicker := time.NewTicker(2 * time.Minute)
	defer scanTicker.Stop()

	// Production-ready: Cleanup old incidents daily (30 day retention)
	cleanupTicker := time.NewTicker(24 * time.Hour)
	defer cleanupTicker.Stop()

	// Inject demo incidents immediately on startup so the UI has data right away
	ii.ensureDemoIncidents()

	// Do an initial scan
	ii.scanAndIngestIncidents(ctx)

	// Do initial cleanup on startup
	go ii.cleanupOldIncidents()

	for {
		select {
		case <-ctx.Done():
			return
		case <-scanTicker.C:
			ii.scanAndIngestIncidents(ctx)
		case <-cleanupTicker.C:
			go ii.cleanupOldIncidents()
		}
	}
}

// cleanupOldIncidents removes incidents older than 30 days
func (ii *IncidentIntelligence) cleanupOldIncidents() {
	if ii.intelligenceSys == nil {
		return
	}

	kb := ii.intelligenceSys.GetKnowledgeBank()
	if kb == nil {
		return
	}

	deleted, err := kb.CleanupOldIncidents(30)
	if err != nil {
		log.Printf("[AutoFix] Failed to cleanup old incidents: %v", err)
		return
	}

	if deleted > 0 {
		log.Printf("[AutoFix] Cleaned up %d incidents older than 30 days", deleted)
	}
}

// makeScanIncident builds an Incident for a live-scan-detected issue.
// The fingerprint is stable across re-scans (pattern + resource + symptom type),
// so UpsertScannedIncident will update the existing incident rather than duplicate it.
func (ii *IncidentIntelligence) makeScanIncident(
	pattern incidents.FailurePattern,
	resource incidents.KubeResourceRef,
	severity incidents.Severity,
	title, description string,
	symptomType incidents.SymptomType,
	clusterCtx string,
) *incidents.Incident {
	symptom := incidents.NewSymptom(symptomType, resource, description).WithSeverity(severity)
	symptoms := []*incidents.Symptom{symptom}
	fingerprint := incidents.GenerateFingerprint(pattern, resource, symptoms)
	now := time.Now()
	return &incidents.Incident{
		ID:             incidents.GenerateIncidentID(fingerprint, now),
		Fingerprint:    fingerprint,
		Pattern:        pattern,
		Severity:       severity,
		Status:         incidents.StatusOpen,
		Resource:       resource,
		Title:          title,
		Description:    description,
		FirstSeen:      now,
		LastSeen:       now,
		Occurrences:    1,
		ClusterContext: clusterCtx,
		Symptoms:       symptoms,
		Metadata:       make(map[string]interface{}),
	}
}

// scanAndIngestIncidents scans Kubernetes resources and ingests findings as signals into v2 manager
func (ii *IncidentIntelligence) scanAndIngestIncidents(ctx context.Context) {
	if ii.app.clientset == nil || !ii.app.connected {
		log.Printf("[scanAndIngestIncidents] Skipping scan - clientset or connection not available")
		return
	}

	var podsScanned, nodesScanned int

	// Sync cluster context
	currentContext := ii.app.GetCurrentContext()
	if currentContext != "" {
		if mgr := ii.manager.GetClusterContext(); mgr != currentContext {
			log.Printf("[scanAndIngestIncidents] Syncing cluster context '%s' → '%s'", mgr, currentContext)
			ii.manager.SetClusterContext(currentContext)
		}
	}

	// systemNS skips kube internals
	systemNS := func(ns string) bool {
		return ns == "kube-system" || ns == "kube-public" || ns == "kube-node-lease"
	}

	// ── 1. PODS ─────────────────────────────────────────────────────────────
	pods, err := ii.app.clientset.CoreV1().Pods("").List(ctx, metav1.ListOptions{Limit: 2000})
	if err != nil {
		log.Printf("[scanAndIngestIncidents] Error listing pods: %v", err)
		return
	}
	podsScanned = len(pods.Items)
	log.Printf("[scanAndIngestIncidents] Scanning %d pods", podsScanned)

	// Collect namespaces seen so we can do namespace-scoped event queries later
	namespaceSeen := make(map[string]bool)

	for _, pod := range pods.Items {
		if systemNS(pod.Namespace) {
			continue
		}
		namespaceSeen[pod.Namespace] = true

		res := incidents.KubeResourceRef{Kind: "Pod", Name: pod.Name, Namespace: pod.Namespace}

		for _, cs := range pod.Status.ContainerStatuses {
			// Feed existing signal pipeline (crash/oom path)
			var exitCode int
			var terminatedAt *time.Time
			state, reason := "unknown", ""
			if cs.State.Terminated != nil {
				state = "terminated"
				reason = cs.State.Terminated.Reason
				exitCode = int(cs.State.Terminated.ExitCode)
				t := cs.State.Terminated.FinishedAt.Time
				terminatedAt = &t
			} else if cs.State.Waiting != nil {
				state = "waiting"
				reason = cs.State.Waiting.Reason
			} else if cs.State.Running != nil {
				state = "running"
			}
			ii.manager.IngestPodStatus(pod.Name, pod.Namespace, string(pod.Status.Phase),
				cs.Name, state, reason, exitCode, cs.RestartCount, terminatedAt)

			// IMAGE PULL FAILURE
			if reason == "ErrImagePull" || reason == "ImagePullBackOff" || reason == "ErrImageNeverPull" {
				image := cs.Image
				ii.manager.UpsertScannedIncident(ii.makeScanIncident(
					incidents.PatternImagePullFailure, res, incidents.SeverityHigh,
					fmt.Sprintf("Image Pull Failure: %s", pod.Name),
					fmt.Sprintf("Container '%s' in %s/%s cannot pull image '%s': %s",
						cs.Name, pod.Namespace, pod.Name, image, reason),
					incidents.SymptomImagePullError, currentContext,
				))
			}

			// CONFIG ERROR / SECRET MISSING (CreateContainerConfigError)
			if reason == "CreateContainerConfigError" || reason == "InvalidImageName" {
				msg := reason
				if cs.State.Waiting != nil && cs.State.Waiting.Message != "" {
					msg = cs.State.Waiting.Message
				}
				pattern := incidents.PatternConfigError
				symptom := incidents.SymptomInvalidConfig
				if strings.Contains(strings.ToLower(msg), "secret") {
					pattern = incidents.PatternSecretMissing
					symptom = incidents.SymptomMissingSecret
				} else if strings.Contains(strings.ToLower(msg), "configmap") {
					symptom = incidents.SymptomMissingConfigMap
				}
				ii.manager.UpsertScannedIncident(ii.makeScanIncident(
					pattern, res, incidents.SeverityHigh,
					fmt.Sprintf("Config Error: %s", pod.Name),
					fmt.Sprintf("Container '%s' in %s/%s failed to start: %s",
						cs.Name, pod.Namespace, pod.Name, msg),
					symptom, currentContext,
				))
			}

			// READINESS PROBE FAILURE — container running but not ready
			if cs.State.Running != nil && !cs.Ready && cs.RestartCount == 0 {
				ii.manager.UpsertScannedIncident(ii.makeScanIncident(
					incidents.PatternReadinessFailure, res, incidents.SeverityHigh,
					fmt.Sprintf("Readiness Probe Failing: %s", pod.Name),
					fmt.Sprintf("Container '%s' in %s/%s is running but readiness probe is failing — pod receives no traffic.",
						cs.Name, pod.Namespace, pod.Name),
					incidents.SymptomReadinessProbeFailure, currentContext,
				))
			}

			// LIVENESS PROBE FAILURE — running container with restarts (not OOM, not CrashLoop)
			if cs.State.Running != nil && cs.RestartCount > 3 {
				lastReason := ""
				if cs.LastTerminationState.Terminated != nil {
					lastReason = cs.LastTerminationState.Terminated.Reason
					lastExit := cs.LastTerminationState.Terminated.ExitCode
					// Not OOM, not explicit crash — likely liveness probe killing it
					if lastReason != "OOMKilled" && lastReason != "CrashLoopBackOff" && lastExit != 0 && lastExit != 137 {
						ii.manager.UpsertScannedIncident(ii.makeScanIncident(
							incidents.PatternLivenessFailure, res, incidents.SeverityCritical,
							fmt.Sprintf("Liveness Probe Failure: %s", pod.Name),
							fmt.Sprintf("Container '%s' in %s/%s has been restarted %d times (last exit: %d). Likely liveness probe failure.",
								cs.Name, pod.Namespace, pod.Name, cs.RestartCount, lastExit),
							incidents.SymptomLivenessProbeFailure, currentContext,
						))
					}
				}
			}
		}

		// UNSCHEDULABLE — Pending > 30s with PodScheduled=False
		if pod.Status.Phase == corev1.PodPending && time.Since(pod.CreationTimestamp.Time) > 30*time.Second {
			for _, cond := range pod.Status.Conditions {
				if cond.Type == corev1.PodScheduled && cond.Status == corev1.ConditionFalse {
					msg := cond.Message
					if msg == "" {
						msg = cond.Reason
					}
					pattern := incidents.PatternUnschedulable
					symptom := incidents.SymptomUnschedulable
					sev := incidents.SeverityHigh
					// Distinguish resource exhaustion vs affinity conflict
					lower := strings.ToLower(msg)
					if strings.Contains(lower, "insufficient") || strings.Contains(lower, "cpu") || strings.Contains(lower, "memory") {
						pattern = incidents.PatternResourceExhausted
						symptom = incidents.SymptomInsufficientResources
						sev = incidents.SeverityCritical
					} else if strings.Contains(lower, "affinity") || strings.Contains(lower, "taint") || strings.Contains(lower, "tolerat") {
						pattern = incidents.PatternAffinityConflict
					}
					ii.manager.UpsertScannedIncident(ii.makeScanIncident(
						pattern, res, sev,
						fmt.Sprintf("Pod Unschedulable: %s", pod.Name),
						fmt.Sprintf("Pod %s/%s cannot be scheduled: %s", pod.Namespace, pod.Name, msg),
						symptom, currentContext,
					))
					break
				}
			}
		}
	}
	log.Printf("[scanAndIngestIncidents] Pod scan complete (%d namespaces seen)", len(namespaceSeen))

	// ── 2. NODES ─────────────────────────────────────────────────────────────
	nodes, err := ii.app.clientset.CoreV1().Nodes().List(ctx, metav1.ListOptions{Limit: 1000})
	if err == nil {
		nodesScanned = len(nodes.Items)
		for _, node := range nodes.Items {
			res := incidents.KubeResourceRef{Kind: "Node", Name: node.Name}
			for _, cond := range node.Status.Conditions {
				switch {
				case cond.Type == corev1.NodeReady && cond.Status == corev1.ConditionFalse:
					ii.manager.UpsertScannedIncident(ii.makeScanIncident(
						incidents.PatternNodeNotReady, res, incidents.SeverityCritical,
						fmt.Sprintf("Node Not Ready: %s", node.Name),
						fmt.Sprintf("Node %s is NotReady since %s: %s. Pods may be evicted.",
							node.Name, cond.LastTransitionTime.Format("15:04 UTC"), cond.Reason),
						incidents.SymptomNodeNotReady, currentContext,
					))
				case cond.Type == corev1.NodeDiskPressure && cond.Status == corev1.ConditionTrue:
					ii.manager.UpsertScannedIncident(ii.makeScanIncident(
						incidents.PatternDiskPressure, res, incidents.SeverityCritical,
						fmt.Sprintf("Disk Pressure: %s", node.Name),
						fmt.Sprintf("Node %s has DiskPressure since %s — pods may be evicted.",
							node.Name, cond.LastTransitionTime.Format("15:04 UTC")),
						incidents.SymptomDiskPressure, currentContext,
					))
				case cond.Type == corev1.NodeMemoryPressure && cond.Status == corev1.ConditionTrue:
					ii.manager.UpsertScannedIncident(ii.makeScanIncident(
						incidents.PatternNodePressure, res, incidents.SeverityHigh,
						fmt.Sprintf("Memory Pressure: %s", node.Name),
						fmt.Sprintf("Node %s has MemoryPressure since %s.",
							node.Name, cond.LastTransitionTime.Format("15:04 UTC")),
						incidents.SymptomMemoryPressure, currentContext,
					))
				case cond.Type == corev1.NodePIDPressure && cond.Status == corev1.ConditionTrue:
					ii.manager.UpsertScannedIncident(ii.makeScanIncident(
						incidents.PatternNodePressure, res, incidents.SeverityHigh,
						fmt.Sprintf("PID Pressure: %s", node.Name),
						fmt.Sprintf("Node %s has PIDPressure since %s.",
							node.Name, cond.LastTransitionTime.Format("15:04 UTC")),
						incidents.SymptomNodePressure, currentContext,
					))
				case cond.Type == corev1.NodeNetworkUnavailable && cond.Status == corev1.ConditionTrue:
					ii.manager.UpsertScannedIncident(ii.makeScanIncident(
						incidents.PatternNetworkPartition, res, incidents.SeverityCritical,
						fmt.Sprintf("Network Unavailable: %s", node.Name),
						fmt.Sprintf("Node %s network is unavailable since %s: %s",
							node.Name, cond.LastTransitionTime.Format("15:04 UTC"), cond.Reason),
						incidents.SymptomConnectionRefused, currentContext,
					))
				}
			}
		}
	} else {
		log.Printf("[scanAndIngestIncidents] Node list blocked (RBAC): %v", err)
	}

	// ── 3. DEPLOYMENTS ───────────────────────────────────────────────────────
	deployments, err := ii.app.clientset.AppsV1().Deployments("").List(ctx, metav1.ListOptions{Limit: 1000})
	if err == nil {
		for _, d := range deployments.Items {
			if systemNS(d.Namespace) {
				continue
			}
			desired := int32(1)
			if d.Spec.Replicas != nil {
				desired = *d.Spec.Replicas
			}
			if desired == 0 {
				continue
			}
			res := incidents.KubeResourceRef{Kind: "Deployment", Name: d.Name, Namespace: d.Namespace}
			if d.Status.ReadyReplicas == 0 {
				ii.manager.UpsertScannedIncident(ii.makeScanIncident(
					incidents.PatternNoReadyEndpoints, res, incidents.SeverityCritical,
					fmt.Sprintf("Deployment Down: %s", d.Name),
					fmt.Sprintf("Deployment %s/%s has 0/%d ready replicas — all pods are unhealthy.",
						d.Namespace, d.Name, desired),
					incidents.SymptomNoEndpoints, currentContext,
				))
			} else if d.Status.AvailableReplicas < desired {
				ii.manager.UpsertScannedIncident(ii.makeScanIncident(
					incidents.PatternRestartStorm, res, incidents.SeverityMedium,
					fmt.Sprintf("Deployment Degraded: %s", d.Name),
					fmt.Sprintf("Deployment %s/%s has %d/%d available replicas.",
						d.Namespace, d.Name, d.Status.AvailableReplicas, desired),
					incidents.SymptomNoEndpoints, currentContext,
				))
			}
		}
	} else {
		log.Printf("[scanAndIngestIncidents] Deployment list blocked (RBAC): %v", err)
	}

	// ── 4. STATEFULSETS ──────────────────────────────────────────────────────
	statefulsets, err := ii.app.clientset.AppsV1().StatefulSets("").List(ctx, metav1.ListOptions{Limit: 500})
	if err == nil {
		for _, ss := range statefulsets.Items {
			if systemNS(ss.Namespace) {
				continue
			}
			desired := int32(1)
			if ss.Spec.Replicas != nil {
				desired = *ss.Spec.Replicas
			}
			if desired == 0 {
				continue
			}
			res := incidents.KubeResourceRef{Kind: "StatefulSet", Name: ss.Name, Namespace: ss.Namespace}
			if ss.Status.ReadyReplicas == 0 {
				ii.manager.UpsertScannedIncident(ii.makeScanIncident(
					incidents.PatternNoReadyEndpoints, res, incidents.SeverityCritical,
					fmt.Sprintf("StatefulSet Down: %s", ss.Name),
					fmt.Sprintf("StatefulSet %s/%s has 0/%d ready replicas.",
						ss.Namespace, ss.Name, desired),
					incidents.SymptomNoEndpoints, currentContext,
				))
			} else if ss.Status.ReadyReplicas < desired {
				ii.manager.UpsertScannedIncident(ii.makeScanIncident(
					incidents.PatternRestartStorm, res, incidents.SeverityMedium,
					fmt.Sprintf("StatefulSet Degraded: %s", ss.Name),
					fmt.Sprintf("StatefulSet %s/%s has %d/%d ready replicas.",
						ss.Namespace, ss.Name, ss.Status.ReadyReplicas, desired),
					incidents.SymptomNoEndpoints, currentContext,
				))
			}
		}
	}

	// ── 5. DAEMONSETS ────────────────────────────────────────────────────────
	daemonsets, err := ii.app.clientset.AppsV1().DaemonSets("").List(ctx, metav1.ListOptions{Limit: 500})
	if err == nil {
		for _, ds := range daemonsets.Items {
			if systemNS(ds.Namespace) {
				continue
			}
			desired := ds.Status.DesiredNumberScheduled
			if desired == 0 {
				continue
			}
			unavailable := ds.Status.NumberUnavailable
			if unavailable > 0 {
				res := incidents.KubeResourceRef{Kind: "DaemonSet", Name: ds.Name, Namespace: ds.Namespace}
				sev := incidents.SeverityMedium
				if unavailable == desired {
					sev = incidents.SeverityCritical
				}
				ii.manager.UpsertScannedIncident(ii.makeScanIncident(
					incidents.PatternRestartStorm, res, sev,
					fmt.Sprintf("DaemonSet Degraded: %s", ds.Name),
					fmt.Sprintf("DaemonSet %s/%s has %d/%d nodes unavailable.",
						ds.Namespace, ds.Name, unavailable, desired),
					incidents.SymptomNoEndpoints, currentContext,
				))
			}
		}
	}

	// ── 6. SERVICES (no ready endpoints) ─────────────────────────────────────
	// Fetch all endpoints in one cluster-wide call to avoid per-service Gets
	endpointMap := make(map[string]bool) // "namespace/name" → has ready addresses
	allEps, epListErr := ii.app.clientset.CoreV1().Endpoints("").List(ctx, metav1.ListOptions{Limit: 2000})
	if epListErr == nil {
		for _, ep := range allEps.Items {
			key := ep.Namespace + "/" + ep.Name
			for _, subset := range ep.Subsets {
				if len(subset.Addresses) > 0 {
					endpointMap[key] = true
					break
				}
			}
		}
	}
	services, err := ii.app.clientset.CoreV1().Services("").List(ctx, metav1.ListOptions{Limit: 1000})
	if err == nil {
		for _, svc := range services.Items {
			if systemNS(svc.Namespace) || svc.Spec.Type == corev1.ServiceTypeExternalName {
				continue
			}
			key := svc.Namespace + "/" + svc.Name
			if !endpointMap[key] {
				res := incidents.KubeResourceRef{Kind: "Service", Name: svc.Name, Namespace: svc.Namespace}
				ii.manager.UpsertScannedIncident(ii.makeScanIncident(
					incidents.PatternNoReadyEndpoints, res, incidents.SeverityHigh,
					fmt.Sprintf("No Ready Endpoints: %s", svc.Name),
					fmt.Sprintf("Service %s/%s has 0 ready endpoints — all backing pods are down or failing readiness probes.",
						svc.Namespace, svc.Name),
					incidents.SymptomNoEndpoints, currentContext,
				))
			}
		}
	}

	// ── 7. JOBS (failed) ─────────────────────────────────────────────────────
	jobs, err := ii.app.clientset.BatchV1().Jobs("").List(ctx, metav1.ListOptions{Limit: 1000})
	if err == nil {
		for _, job := range jobs.Items {
			if systemNS(job.Namespace) {
				continue
			}
			if job.Status.Failed > 0 {
				res := incidents.KubeResourceRef{Kind: "Job", Name: job.Name, Namespace: job.Namespace}
				ii.manager.UpsertScannedIncident(ii.makeScanIncident(
					incidents.PatternAppCrash, res, incidents.SeverityHigh,
					fmt.Sprintf("Job Failed: %s", job.Name),
					fmt.Sprintf("Job %s/%s has %d failed pod(s).",
						job.Namespace, job.Name, job.Status.Failed),
					incidents.SymptomExitCodeError, currentContext,
				))
			}
		}
	}

	// ── 8. PVCS (pending) ────────────────────────────────────────────────────
	pvcs, err := ii.app.clientset.CoreV1().PersistentVolumeClaims("").List(ctx, metav1.ListOptions{Limit: 1000})
	if err == nil {
		for _, pvc := range pvcs.Items {
			if systemNS(pvc.Namespace) {
				continue
			}
			if pvc.Status.Phase == corev1.ClaimPending {
				res := incidents.KubeResourceRef{Kind: "PersistentVolumeClaim", Name: pvc.Name, Namespace: pvc.Namespace}
				ii.manager.UpsertScannedIncident(ii.makeScanIncident(
					incidents.PatternResourceExhausted, res, incidents.SeverityMedium,
					fmt.Sprintf("PVC Pending: %s", pvc.Name),
					fmt.Sprintf("PersistentVolumeClaim %s/%s is Pending — no matching PV or StorageClass not provisioning.",
						pvc.Namespace, pvc.Name),
					incidents.SymptomInsufficientResources, currentContext,
				))
			}
		}
	}

	// ── 9. HPA AT MAX REPLICAS ────────────────────────────────────────────────
	hpas, err := ii.app.clientset.AutoscalingV2().HorizontalPodAutoscalers("").List(ctx, metav1.ListOptions{Limit: 500})
	if err == nil {
		for _, hpa := range hpas.Items {
			if systemNS(hpa.Namespace) {
				continue
			}
			if hpa.Status.CurrentReplicas >= hpa.Spec.MaxReplicas {
				res := incidents.KubeResourceRef{
					Kind: hpa.Spec.ScaleTargetRef.Kind, Name: hpa.Spec.ScaleTargetRef.Name, Namespace: hpa.Namespace,
				}
				ii.manager.UpsertScannedIncident(ii.makeScanIncident(
					incidents.PatternResourceExhausted, res, incidents.SeverityHigh,
					fmt.Sprintf("HPA At Max Replicas: %s", hpa.Name),
					fmt.Sprintf("HPA %s/%s has reached max replicas (%d/%d) — workload cannot scale further under load.",
						hpa.Namespace, hpa.Name, hpa.Status.CurrentReplicas, hpa.Spec.MaxReplicas),
					incidents.SymptomInsufficientResources, currentContext,
				))
			}
		}
	}

	// ── 10. NAMESPACE-SCOPED EVENTS ──────────────────────────────────────────
	// Cluster-scope event list is often blocked by GKE RBAC, but per-namespace
	// listing typically works. We use the namespaces collected from the pod scan.
	eventsSeen := make(map[string]bool) // deduplicate by "ns/name/reason"
	for ns := range namespaceSeen {
		evList, evErr := ii.app.clientset.CoreV1().Events(ns).List(ctx, metav1.ListOptions{
			Limit:         300,
			FieldSelector: "type=Warning",
		})
		if evErr != nil {
			continue
		}
		for _, ev := range evList.Items {
			// Only process recent events (last 10 minutes)
			if time.Since(ev.LastTimestamp.Time) > 10*time.Minute && time.Since(ev.EventTime.Time) > 10*time.Minute {
				continue
			}
			dedupeKey := fmt.Sprintf("%s/%s/%s", ev.Namespace, ev.InvolvedObject.Name, ev.Reason)
			if eventsSeen[dedupeKey] {
				continue
			}
			eventsSeen[dedupeKey] = true

			res := incidents.KubeResourceRef{
				Kind:      ev.InvolvedObject.Kind,
				Name:      ev.InvolvedObject.Name,
				Namespace: ev.Namespace,
			}
			msg := ev.Message

			switch ev.Reason {
			case "Unhealthy":
				lower := strings.ToLower(msg)
				if strings.Contains(lower, "liveness") {
					ii.manager.UpsertScannedIncident(ii.makeScanIncident(
						incidents.PatternLivenessFailure, res, incidents.SeverityCritical,
						fmt.Sprintf("Liveness Probe Failure: %s", ev.InvolvedObject.Name),
						fmt.Sprintf("%s/%s liveness probe failing: %s", ev.Namespace, ev.InvolvedObject.Name, msg),
						incidents.SymptomLivenessProbeFailure, currentContext,
					))
				} else if strings.Contains(lower, "startup") {
					ii.manager.UpsertScannedIncident(ii.makeScanIncident(
						incidents.PatternStartupFailure, res, incidents.SeverityHigh,
						fmt.Sprintf("Startup Probe Failure: %s", ev.InvolvedObject.Name),
						fmt.Sprintf("%s/%s startup probe failing: %s", ev.Namespace, ev.InvolvedObject.Name, msg),
						incidents.SymptomStartupProbeFailure, currentContext,
					))
				} else {
					ii.manager.UpsertScannedIncident(ii.makeScanIncident(
						incidents.PatternReadinessFailure, res, incidents.SeverityHigh,
						fmt.Sprintf("Readiness Probe Failure: %s", ev.InvolvedObject.Name),
						fmt.Sprintf("%s/%s readiness probe failing: %s", ev.Namespace, ev.InvolvedObject.Name, msg),
						incidents.SymptomReadinessProbeFailure, currentContext,
					))
				}
			case "FailedScheduling":
				lower := strings.ToLower(msg)
				pattern := incidents.PatternUnschedulable
				symptom := incidents.SymptomUnschedulable
				sev := incidents.SeverityHigh
				if strings.Contains(lower, "insufficient") {
					pattern = incidents.PatternResourceExhausted
					symptom = incidents.SymptomInsufficientResources
					sev = incidents.SeverityCritical
				} else if strings.Contains(lower, "affinity") || strings.Contains(lower, "taint") {
					pattern = incidents.PatternAffinityConflict
				}
				ii.manager.UpsertScannedIncident(ii.makeScanIncident(
					pattern, res, sev,
					fmt.Sprintf("Scheduling Failed: %s", ev.InvolvedObject.Name),
					fmt.Sprintf("%s/%s: %s", ev.Namespace, ev.InvolvedObject.Name, msg),
					symptom, currentContext,
				))
			case "Failed":
				if strings.Contains(strings.ToLower(msg), "pull") {
					ii.manager.UpsertScannedIncident(ii.makeScanIncident(
						incidents.PatternImagePullFailure, res, incidents.SeverityHigh,
						fmt.Sprintf("Image Pull Failure: %s", ev.InvolvedObject.Name),
						fmt.Sprintf("%s/%s: %s", ev.Namespace, ev.InvolvedObject.Name, msg),
						incidents.SymptomImagePullError, currentContext,
					))
				}
			case "BackOff":
				if strings.Contains(strings.ToLower(msg), "back-off restarting") {
					ii.manager.UpsertScannedIncident(ii.makeScanIncident(
						incidents.PatternCrashLoop, res, incidents.SeverityCritical,
						fmt.Sprintf("CrashLoopBackOff: %s", ev.InvolvedObject.Name),
						fmt.Sprintf("%s/%s: %s", ev.Namespace, ev.InvolvedObject.Name, msg),
						incidents.SymptomCrashLoopBackOff, currentContext,
					))
				}
			case "OOMKilling":
				ii.manager.UpsertScannedIncident(ii.makeScanIncident(
					incidents.PatternOOMPressure, res, incidents.SeverityCritical,
					fmt.Sprintf("OOM Kill: %s", ev.InvolvedObject.Name),
					fmt.Sprintf("%s/%s: %s", ev.Namespace, ev.InvolvedObject.Name, msg),
					incidents.SymptomExitCodeOOM, currentContext,
				))
			case "Evicted":
				ii.manager.UpsertScannedIncident(ii.makeScanIncident(
					incidents.PatternDiskPressure, res, incidents.SeverityCritical,
					fmt.Sprintf("Pod Evicted: %s", ev.InvolvedObject.Name),
					fmt.Sprintf("%s/%s evicted: %s", ev.Namespace, ev.InvolvedObject.Name, msg),
					incidents.SymptomDiskPressure, currentContext,
				))
			case "Forbidden":
				ii.manager.UpsertScannedIncident(ii.makeScanIncident(
					incidents.PatternRBACDenied, res, incidents.SeverityMedium,
					fmt.Sprintf("RBAC Denied: %s", ev.InvolvedObject.Name),
					fmt.Sprintf("%s/%s: %s", ev.Namespace, ev.InvolvedObject.Name, msg),
					incidents.SymptomRBACDenied, currentContext,
				))
			case "FailedCreate":
				ii.manager.UpsertScannedIncident(ii.makeScanIncident(
					incidents.PatternPolicyViolation, res, incidents.SeverityHigh,
					fmt.Sprintf("Policy Violation: %s", ev.InvolvedObject.Name),
					fmt.Sprintf("%s/%s pod creation blocked: %s", ev.Namespace, ev.InvolvedObject.Name, msg),
					incidents.SymptomSecurityContextError, currentContext,
				))
			case "NetworkNotReady":
				ii.manager.UpsertScannedIncident(ii.makeScanIncident(
					incidents.PatternNetworkPartition, res, incidents.SeverityCritical,
					fmt.Sprintf("Network Not Ready: %s", ev.InvolvedObject.Name),
					fmt.Sprintf("%s/%s: %s", ev.Namespace, ev.InvolvedObject.Name, msg),
					incidents.SymptomConnectionRefused, currentContext,
				))
			}
		}
	}
	log.Printf("[scanAndIngestIncidents] Event scan complete (%d namespaces, %d unique events processed)", len(namespaceSeen), len(eventsSeen))

	// ── 11. CERT-MANAGER CERTIFICATES (graceful skip if CRDs absent) ──────────
	certRes := ii.app.clientset.RESTClient()
	if certRes != nil {
		// Check for cert-manager Certificate CRD by trying a discovery call
		_, certDiscovErr := ii.app.clientset.Discovery().ServerResourcesForGroupVersion("cert-manager.io/v1")
		if certDiscovErr == nil {
			// cert-manager is installed — list Certificates per namespace
			for ns := range namespaceSeen {
				result := ii.app.clientset.RESTClient().Get().
					AbsPath(fmt.Sprintf("/apis/cert-manager.io/v1/namespaces/%s/certificates", ns)).
					Do(ctx)
				raw, rawErr := result.Raw()
				if rawErr != nil {
					continue
				}
				var certList struct {
					Items []struct {
						Metadata struct {
							Name      string `json:"name"`
							Namespace string `json:"namespace"`
						} `json:"metadata"`
						Status struct {
							Conditions []struct {
								Type    string `json:"type"`
								Status  string `json:"status"`
								Reason  string `json:"reason"`
								Message string `json:"message"`
							} `json:"conditions"`
							NotAfter  *string `json:"notAfter"`
							RenewalTime *string `json:"renewalTime"`
						} `json:"status"`
					} `json:"items"`
				}
				if jsonErr := json.Unmarshal(raw, &certList); jsonErr != nil {
					continue
				}
				for _, cert := range certList.Items {
					certRef := incidents.KubeResourceRef{Kind: "Certificate", Name: cert.Metadata.Name, Namespace: cert.Metadata.Namespace}
					for _, cond := range cert.Status.Conditions {
						if cond.Type == "Ready" && cond.Status == "False" {
							pattern := incidents.PatternCertificateRequestFailed
							if strings.Contains(strings.ToLower(cond.Reason), "expir") || strings.Contains(strings.ToLower(cond.Message), "expir") {
								pattern = incidents.PatternCertificateExpiring
							} else if strings.Contains(strings.ToLower(cond.Reason), "issuer") {
								pattern = incidents.PatternIssuerNotReady
							}
							ii.manager.UpsertScannedIncident(ii.makeScanIncident(
								pattern, certRef, incidents.SeverityHigh,
								fmt.Sprintf("Certificate Not Ready: %s", cert.Metadata.Name),
								fmt.Sprintf("Certificate %s/%s is not ready: %s — %s",
									cert.Metadata.Namespace, cert.Metadata.Name, cond.Reason, cond.Message),
								incidents.SymptomInvalidConfig, currentContext,
							))
						}
					}
					// Check for expiring soon (within 7 days)
					if cert.Status.NotAfter != nil {
						if notAfter, parseErr := time.Parse(time.RFC3339, *cert.Status.NotAfter); parseErr == nil {
							if time.Until(notAfter) < 7*24*time.Hour {
								ii.manager.UpsertScannedIncident(ii.makeScanIncident(
									incidents.PatternCertificateExpiring, certRef, incidents.SeverityHigh,
									fmt.Sprintf("Certificate Expiring: %s", cert.Metadata.Name),
									fmt.Sprintf("Certificate %s/%s expires %s.",
										cert.Metadata.Namespace, cert.Metadata.Name, notAfter.Format("2006-01-02 15:04 UTC")),
									incidents.SymptomInvalidConfig, currentContext,
								))
							}
						}
					}
				}
			}
		}
	}

	// Update monitoring stats
	if ii.intelligenceSys != nil {
		scanTime := time.Now().Format(time.RFC3339)
		ii.intelligenceSys.SetMonitoringStats(podsScanned, nodesScanned, len(eventsSeen), scanTime)
		log.Printf("[scanAndIngestIncidents] Scan complete: pods=%d, nodes=%d, events=%d",
			podsScanned, nodesScanned, len(eventsSeen))
	}

	ii.ensureDemoIncidents()
}

// ensureDemoIncidents injects 18 realistic demo incidents covering all failure patterns.
// Re-injects whenever the active cluster context changes so incidents are always visible
// for the currently connected cluster.
func (ii *IncidentIntelligence) ensureDemoIncidents() {
	// Do not inject demo incidents when connected to a real cluster.
	// Real cluster incidents should come from the live scan only.
	if ii.app.clientset != nil && ii.app.connected {
		log.Printf("[ensureDemoIncidents] Skipping demo injection — connected to real cluster")
		return
	}

	clusterCtx := ""
	if ii.app.contextManager != nil {
		clusterCtx = ii.app.contextManager.CurrentContext
	}

	// Skip if we already injected demos for this exact cluster context.
	if ii.demoIncidentsContext == clusterCtx {
		return
	}
	ii.demoIncidentsContext = clusterCtx
	log.Printf("[ensureDemoIncidents] Injecting demo incidents for cluster context: %q", clusterCtx)

	now := time.Now()

	// Helper to build timeline entries with proper types for the frontend color map
	tl := func(offset time.Duration, typ, title, desc string) incidents.TimelineEntry {
		return incidents.TimelineEntry{Timestamp: now.Add(offset), Type: typ, Title: title, Description: desc}
	}

	// Helper to build symptom
	sym := func(st incidents.SymptomType, sev incidents.Severity, res incidents.KubeResourceRef, desc string, ev []string, val float64) *incidents.Symptom {
		s := incidents.NewSymptom(st, res, desc).WithSeverity(sev).WithValue(val)
		s.Evidence = ev
		s.DetectedAt = now.Add(-20 * time.Minute)
		return s
	}

	// ──── 1. CrashLoopBackOff ────────────────────────────────────
	r1 := incidents.KubeResourceRef{Kind: "Pod", Name: "api-gateway-7d8f9b-x2k9p", Namespace: "default"}
	fp1 := incidents.GenerateFingerprint(incidents.PatternCrashLoop, r1, nil)
	fs1 := now.Add(-87 * time.Minute)
	ii.manager.InjectIncident(&incidents.Incident{
		ID: incidents.GenerateIncidentID(fp1, fs1), Fingerprint: fp1,
		Pattern: incidents.PatternCrashLoop, Severity: incidents.SeverityCritical, Status: incidents.StatusOpen,
		Resource: r1, Title: "CrashLoopBackOff: api-gateway-7d8f9b-x2k9p",
		Description:    "Container 'gateway' in Pod api-gateway-7d8f9b-x2k9p is in CrashLoopBackOff. The container has restarted 47 times with exit code 1. Back-off timer currently at 5m0s. Application fails to connect to required PostgreSQL database during startup, causing immediate exit.",
		Occurrences:    47, FirstSeen: fs1, LastSeen: now.Add(-1 * time.Minute),
		ClusterContext: clusterCtx, Metadata: map[string]interface{}{"container": "gateway", "exitCode": 1, "backoffMs": 300000, "is_demo": true},
		RelatedResources: []incidents.KubeResourceRef{
			{Kind: "Deployment", Name: "api-gateway", Namespace: "default"},
			{Kind: "Service", Name: "api-gateway-svc", Namespace: "default"},
			{Kind: "ReplicaSet", Name: "api-gateway-7d8f9b", Namespace: "default"},
		},
		Symptoms: []*incidents.Symptom{
			sym(incidents.SymptomCrashLoopBackOff, incidents.SeverityCritical, r1, "Container in CrashLoopBackOff with 47 restarts", []string{"RestartCount: 47", "BackOff: 5m0s", "Exit code: 1"}, 47),
			sym(incidents.SymptomExitCodeError, incidents.SeverityHigh, r1, "Container exiting with code 1 (application error)", []string{"Exit code: 1", "Reason: Error", "Last terminated 23s ago"}, 1),
			sym(incidents.SymptomConnectionRefused, incidents.SeverityHigh, r1, "Cannot connect to postgres.default.svc:5432", []string{"dial tcp 10.96.14.52:5432: connection refused", "pg_isready returns exit 2"}, 0),
		},
		Diagnosis: &incidents.Diagnosis{
			Summary:        "The api-gateway pod is crash-looping because it cannot establish a connection to the PostgreSQL database at postgres.default.svc:5432 during startup. The database service exists but no ready endpoints are available, suggesting the database pod itself may be down or unhealthy.",
			ProbableCauses: []string{"PostgreSQL pod is not running — the database Deployment may have been scaled to 0 or is itself in a crash loop", "Database credentials in Secret 'postgres-credentials' may have been rotated without updating the gateway deployment", "Network policy may be blocking egress from the api-gateway pod to the postgres service on port 5432"},
			Confidence:     0.95, Evidence: []string{"RestartCount: 47 in 87 minutes", "Exit code: 1 — application-level error, not OOM (137) or signal (143)", "Logs show: FATAL: connection to server at \"postgres.default.svc\" port 5432 failed: Connection refused", "PostgreSQL service has 0/1 ready endpoints", "Container back-off timer at maximum 5m0s"},
			GeneratedAt: now,
		},
		Recommendations: []incidents.Recommendation{
			{ID: fmt.Sprintf("rec-%s-1", fp1[:8]), Title: "Restore PostgreSQL database", Explanation: "The root cause is the unavailable PostgreSQL database. Restoring it will allow the gateway to connect on next restart attempt.", Evidence: []string{"postgres service has 0 ready endpoints", "gateway logs: connection refused to port 5432"}, Risk: incidents.RiskLow, Priority: 1, Tags: []string{"database", "dependency"},
				Action: &incidents.FixAction{Label: "View DB Logs", Type: incidents.ActionTypeViewLogs, Description: "View PostgreSQL pod logs to diagnose why the database is down", Safe: true},
				ManualSteps: []string{"kubectl get pods -l app=postgres -n default", "kubectl logs -l app=postgres -n default --tail=50", "kubectl describe pod -l app=postgres -n default", "If pod is missing: kubectl rollout restart deployment/postgres -n default"}},
			{ID: fmt.Sprintf("rec-%s-2", fp1[:8]), Title: "Restart gateway pod after DB is healthy", Explanation: "Once the database is confirmed healthy, delete the crash-looping pod to reset the back-off timer and allow immediate reconnection.", Evidence: []string{"Back-off timer at 5m0s maximum", "Pod will not retry for another 5 minutes"}, Risk: incidents.RiskLow, Priority: 2, Tags: []string{"restart", "remediation"},
				Action: &incidents.FixAction{Label: "Restart Pod", Type: incidents.ActionTypeRestart, Description: "Delete the crash-looping pod to reset back-off timer", Safe: true, RequiresConfirmation: true},
				ManualSteps: []string{"kubectl delete pod api-gateway-7d8f9b-x2k9p -n default", "kubectl rollout status deployment/api-gateway -n default --timeout=120s"}},
			{ID: fmt.Sprintf("rec-%s-3", fp1[:8]), Title: "Add startup probe with longer timeout", Explanation: "Prevent future crash loops during slow database startups by adding a startup probe that allows more time for initialization.", Evidence: []string{"No startup probe configured", "Container crashes within 10s of start"}, Risk: incidents.RiskMedium, Priority: 3, Tags: []string{"prevention", "configuration"},
				ManualSteps: []string{"Edit deployment: kubectl edit deployment/api-gateway -n default", "Add startupProbe with failureThreshold: 30 and periodSeconds: 10", "This gives the container 300s (5 min) to start successfully"}},
		},
		Timeline: []incidents.TimelineEntry{
			tl(-87*time.Minute, "Warning", "Pod Restarting", "Container 'gateway' restarted — exit code 1, reason: Error"),
			tl(-85*time.Minute, "Error", "Crash Detected", "CrashLoopBackOff detected by intelligence engine. RestartCount: 3"),
			tl(-80*time.Minute, "Warning", "BackOff Increasing", "Container back-off timer increased to 40s. Exit code consistent: 1"),
			tl(-72*time.Minute, "Info", "Dependency Check", "Checking upstream dependencies — postgres.default.svc:5432 unreachable"),
			tl(-65*time.Minute, "Error", "DB Unreachable", "PostgreSQL service has 0 ready endpoints. Connection refused confirmed."),
			tl(-55*time.Minute, "Warning", "Restarts Escalating", "RestartCount reached 20. Back-off at 2m30s."),
			tl(-40*time.Minute, "Normal", "Correlation Found", "Correlated with postgres pod termination at -90m. Root cause identified."),
			tl(-30*time.Minute, "Error", "Critical Threshold", "RestartCount: 35. Severity escalated to CRITICAL."),
			tl(-15*time.Minute, "Warning", "Max BackOff", "Back-off timer at maximum 5m0s. Container attempt cycle slowing."),
			tl(-1*time.Minute, "Error", "Still Crashing", "Latest restart observed. RestartCount: 47. No improvement detected."),
		},
	})

	// ──── 2. OOM Killed ────────────────────────────────────────
	r2 := incidents.KubeResourceRef{Kind: "Pod", Name: "cache-worker-5b4c3d-m8n7", Namespace: "prod"}
	fp2 := incidents.GenerateFingerprint(incidents.PatternOOMPressure, r2, nil)
	fs2 := now.Add(-63 * time.Minute)
	ii.manager.InjectIncident(&incidents.Incident{
		ID: incidents.GenerateIncidentID(fp2, fs2), Fingerprint: fp2,
		Pattern: incidents.PatternOOMPressure, Severity: incidents.SeverityCritical, Status: incidents.StatusOpen,
		Resource: r2, Title: "OOM Killed: cache-worker-5b4c3d-m8n7",
		Description:    "Container 'worker' terminated with OOMKilled (exit code 137). Memory usage climbed to 511Mi against a 512Mi limit. The cache eviction routine is failing to release memory, causing a steady leak of ~2Mi/minute under load.",
		Occurrences:    12, FirstSeen: fs2, LastSeen: now.Add(-3 * time.Minute),
		ClusterContext: clusterCtx, Metadata: map[string]interface{}{"container": "worker", "exitCode": 137, "memoryLimitMi": 512, "peakUsageMi": 511, "is_demo": true},
		RelatedResources: []incidents.KubeResourceRef{
			{Kind: "Deployment", Name: "cache-worker", Namespace: "prod"},
			{Kind: "HorizontalPodAutoscaler", Name: "cache-worker-hpa", Namespace: "prod"},
		},
		Symptoms: []*incidents.Symptom{
			sym(incidents.SymptomExitCodeOOM, incidents.SeverityCritical, r2, "Container killed with OOMKilled (exit 137)", []string{"Exit code: 137", "Reason: OOMKilled", "Memory limit: 512Mi"}, 137),
			sym(incidents.SymptomMemoryPressure, incidents.SeverityHigh, r2, "Memory usage at 99.8% of limit", []string{"Peak: 511Mi / 512Mi", "Growth rate: ~2Mi/min under load"}, 511),
		},
		Diagnosis: &incidents.Diagnosis{
			Summary:        "The cache-worker container is being OOM-killed because its memory limit of 512Mi is insufficient for the current workload. Memory profiling shows a leak in the LRU cache eviction routine — entries are being added but the eviction goroutine is stuck waiting on a mutex, preventing cleanup.",
			ProbableCauses: []string{"Memory leak in LRU cache eviction goroutine — mutex contention prevents cleanup under high load", "Memory limit of 512Mi is undersized for the current cache dataset (estimated 600Mi needed)", "Go runtime GC not aggressive enough — GOGC=100 default, consider GOGC=50 for memory-constrained workloads"},
			Confidence:     0.92, Evidence: []string{"Exit code: 137 (SIGKILL by OOM killer)", "Memory peaked at 511Mi / 512Mi (99.8% utilization)", "12 OOM kills in 63 minutes", "Heap profile shows 340Mi in map[string]*CacheEntry", "GC pause times increasing: 45ms → 280ms before kill"},
			GeneratedAt: now,
		},
		Recommendations: []incidents.Recommendation{
			{ID: fmt.Sprintf("rec-%s-1", fp2[:8]), Title: "Increase memory limit to 1Gi", Explanation: "The current 512Mi limit is insufficient. Increasing to 1Gi provides headroom while the leak is investigated.", Evidence: []string{"Peak usage: 511Mi", "Estimated working set: 600Mi"}, Risk: incidents.RiskLow, Priority: 1, Tags: []string{"resources", "quick-fix"},
				Action: &incidents.FixAction{Label: "Propose Fix", Type: incidents.ActionTypePreviewPatch, Description: "Preview the resource limit change before applying", Safe: true},
				ProposedFix: &incidents.ProposedFix{Type: incidents.FixTypePatch, Description: "Increase memory limit from 512Mi to 1Gi", TargetResource: r2, Safe: true, RequiresConfirmation: true,
					Changes: []incidents.FixChange{{Path: "spec.containers[0].resources.limits.memory", OldValue: "512Mi", NewValue: "1Gi", Description: "Double memory limit to accommodate cache working set"}},
					DryRunCmd: "kubectl set resources deployment/cache-worker -n prod --limits=memory=1Gi --dry-run=server", ApplyCmd: "kubectl set resources deployment/cache-worker -n prod --limits=memory=1Gi"},
				ManualSteps: []string{"kubectl edit deployment/cache-worker -n prod", "Change spec.containers[0].resources.limits.memory from 512Mi to 1Gi", "Also update requests.memory to 768Mi for proper scheduling", "kubectl rollout status deployment/cache-worker -n prod"}},
			{ID: fmt.Sprintf("rec-%s-2", fp2[:8]), Title: "Set GOGC=50 for aggressive GC", Explanation: "Reducing the GC target percentage forces more frequent garbage collection, keeping memory usage lower at the cost of some CPU overhead.", Evidence: []string{"Default GOGC=100", "GC pause times: 45ms → 280ms"}, Risk: incidents.RiskMedium, Priority: 2, Tags: []string{"performance", "tuning"},
				ManualSteps: []string{"kubectl set env deployment/cache-worker -n prod GOGC=50", "Monitor memory usage and GC pause times after change", "If CPU overhead is too high, try GOGC=75 as a compromise"}},
		},
		Timeline: []incidents.TimelineEntry{
			tl(-63*time.Minute, "Warning", "Memory Rising", "Container memory usage exceeded 80% of limit (410Mi / 512Mi)"),
			tl(-58*time.Minute, "Error", "OOM Kill #1", "Container terminated with OOMKilled. Exit code 137. Memory: 511Mi / 512Mi"),
			tl(-55*time.Minute, "Normal", "Pod Restarted", "Container restarted successfully. Memory usage reset to 180Mi."),
			tl(-48*time.Minute, "Warning", "Memory Climbing", "Memory growth rate: ~2Mi/min. Projected OOM in 25 minutes."),
			tl(-42*time.Minute, "Error", "OOM Kill #4", "Fourth OOM kill detected. Pattern confirmed as memory leak."),
			tl(-35*time.Minute, "Info", "Analysis Started", "Intelligence engine analyzing heap growth pattern."),
			tl(-28*time.Minute, "Warning", "Leak Identified", "Heap profile indicates leak in cache eviction routine. 340Mi in map entries."),
			tl(-20*time.Minute, "Error", "OOM Kill #8", "Eighth OOM kill. Severity escalated to CRITICAL."),
			tl(-10*time.Minute, "Info", "Fix Proposed", "Recommendation generated: increase memory limit to 1Gi."),
			tl(-3*time.Minute, "Error", "OOM Kill #12", "Latest OOM kill. Container restarting. HPA scaled to 4 replicas."),
		},
	})

	log.Printf("[IncidentIntelligence] Injected 2 demo incidents (demo mode only)")
}

func (ii *IncidentIntelligence) Stop() {
	if ii.intelligenceSys != nil {
		ii.intelligenceSys.Stop()
	}
	ii.manager.Stop()
}

// handleMonitoredEvent handles events from the existing event monitor.
func (ii *IncidentIntelligence) handleMonitoredEvent(event MonitoredEvent) {
	// Extract resource kind and name from the Resource field (format: "Kind/Name")
	parts := strings.SplitN(event.Resource, "/", 2)
	resourceKind := "Unknown"
	resourceName := event.Resource
	if len(parts) == 2 {
		resourceKind = parts[0]
		resourceName = parts[1]
	}

	ii.eventAdapter.IngestMonitoredEvent(
		event.ID,
		event.Timestamp,
		event.Type,
		event.Category,
		string(event.Severity),
		event.Title,
		event.Description,
		event.Namespace,
		resourceKind,
		resourceName,
		event.Details,
	)
}

// GetManager returns the incident manager.
func (ii *IncidentIntelligence) GetManager() *incidents.Manager {
	return ii.manager
}

// GetIntelligenceSystem returns the intelligence system.
func (ii *IncidentIntelligence) GetIntelligenceSystem() *incidents.IntelligenceSystem {
	return ii.intelligenceSys
}

// getKnowledgeBank gets or creates a KnowledgeBank instance for storing incidents
func (ws *WebServer) getKnowledgeBank() *incidents.KnowledgeBank {
	// Try to get from IntelligenceSystem if available
	// For now, create a new instance (it's fast - SQLite is efficient)
	homeDir, err := os.UserHomeDir()
	if err != nil {
		homeDir = "."
	}
	kubegrafDir := filepath.Join(homeDir, ".kubegraf")
	dataDir := filepath.Join(kubegrafDir, "incidents")
	
	kb, err := incidents.NewKnowledgeBank(dataDir)
	if err != nil {
		log.Printf("[KnowledgeBank] Failed to initialize: %v", err)
		return nil
	}
	
	return kb
}

// RegisterIncidentIntelligenceRoutes registers incident intelligence API routes.
func (ws *WebServer) RegisterIncidentIntelligenceRoutes() {
	// Create incident intelligence if not exists
	if ws.app.incidentIntelligence == nil {
		ws.app.incidentIntelligence = NewIncidentIntelligence(ws.app)
		ws.app.incidentIntelligence.Start(ws.app.ctx)
		// Start background scanner for fast incident loading
		ws.app.incidentIntelligence.StartBackgroundScanner()
	}

	// Register our custom handler for /api/v2/incidents FIRST (before intelligence routes)
	// This handler uses IncidentScanner as a fallback when Manager has no incidents
	http.HandleFunc("/api/v2/incidents", ws.handleIncidentsV2)
	log.Printf("[Intelligence] Registered /api/v2/incidents with scanner fallback")

	// Register intelligence system API routes (v2) - these will handle sub-paths like /api/v2/incidents/{id}
	if ws.app.incidentIntelligence != nil && ws.app.incidentIntelligence.intelligenceSys != nil {
		apiHandler := ws.app.incidentIntelligence.intelligenceSys.GetAPIHandler()
		if apiHandler != nil {
			// Inject the kube adapter for log fetching
			if ws.app.incidentIntelligence.kubeAdapter != nil {
				apiHandler.SetKubeExecutor(ws.app.incidentIntelligence.kubeAdapter)
				log.Printf("[Intelligence] Injected kubeAdapter into apiHandler for log analysis")
			}
			apiHandler.RegisterRoutes(http.DefaultServeMux)
			log.Printf("[Intelligence] Registered /api/v2/incidents/* routes")
		} else {
			log.Printf("[Intelligence] Warning: API handler is nil, routes not registered")
		}
	} else {
		log.Printf("[Intelligence] Warning: Intelligence system not initialized, routes not registered")
	}

	// Register Intelligence Workspace UI API routes
	ws.RegisterIntelligenceWorkspaceRoutes()
	log.Printf("[Intelligence] Registered /api/v2/workspace/* routes for Intelligence UI")
}

// handleIncidentsV2 handles GET /api/v2/incidents
func (ws *WebServer) handleIncidentsV2(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Parse query parameters
	query := r.URL.Query()
	namespace := query.Get("namespace")
	patternStr := query.Get("pattern")
	severityStr := query.Get("severity")

	var incidentList []*incidents.Incident
	
	log.Printf("[handleIncidentsV2] Fetching incidents - namespace: %s, pattern: %s, severity: %s", namespace, patternStr, severityStr)

	// Try to get incidents from the v2 incident intelligence system
	if ws.app.incidentIntelligence != nil {
		manager := ws.app.incidentIntelligence.GetManager()

		filter := incidents.IncidentFilter{
			Namespace: namespace,
		}

		if patternStr != "" {
			filter.Pattern = incidents.FailurePattern(patternStr)
		}

		if severityStr != "" {
			filter.Severity = incidents.Severity(severityStr)
		}

		if status := query.Get("status"); status != "" {
			filter.Status = incidents.IncidentStatus(status)
		}

		activeOnly := query.Get("active") == "true"

		if activeOnly {
			incidentList = manager.GetActiveIncidents()
		} else {
			incidentList = manager.FilterIncidents(filter)
		}
	}

	// FAST PATH: Trigger background scan if cache is stale or no incidents
	// This returns immediately with current data (even if empty) and scans in background
	scanTriggered := false
	if ws.app.incidentIntelligence != nil && ws.app.clientset != nil && ws.app.connected {
		// Check if we need to refresh - either no incidents or cache is stale
		needsRefresh := len(incidentList) == 0 || !ws.app.incidentIntelligence.IsCacheFresh()
		if needsRefresh {
			scanTriggered = ws.app.incidentIntelligence.triggerBackgroundScan()
			if scanTriggered {
				log.Printf("[handleIncidentsV2] Background scan triggered, returning current data immediately")
			}
		}
	}

	// Add resolved incidents from database if filtering by resolved status
	// IMPORTANT: Filter by current cluster context to avoid cross-cluster contamination
	if status := query.Get("status"); status == "resolved" {
		kb := ws.getKnowledgeBank()
		if kb != nil {
			// Get current cluster context from manager for filtering
			currentClusterContext := ""
			if ws.app.incidentIntelligence != nil {
				manager := ws.app.incidentIntelligence.GetManager()
				if manager != nil {
					currentClusterContext = manager.GetClusterContext()
				}
			}

			records, err := kb.GetResolvedIncidents(1000, namespace, patternStr, severityStr)
			if err != nil {
				log.Printf("[handleIncidentsV2] Error fetching resolved incidents from database: %v", err)
			} else {
				log.Printf("[handleIncidentsV2] Found %d resolved incidents in database, filtering by cluster context: %s", len(records), currentClusterContext)
				// Convert IncidentRecord to Incident, but only include incidents from current cluster
				for _, record := range records {
					// Filter by cluster context - only include incidents from current cluster
					if currentClusterContext != "" && record.ClusterContext != currentClusterContext {
						continue
					}
					// Also exclude incidents with empty cluster context when we have an active cluster context
					if currentClusterContext != "" && record.ClusterContext == "" {
						continue
					}

					var diagnosis *incidents.Diagnosis
					if record.Diagnosis != nil {
						// CitedDiagnosis embeds Diagnosis, so we can use it directly
						diagnosis = &record.Diagnosis.Diagnosis
					}
					incident := &incidents.Incident{
						ID:             record.ID,
						Fingerprint:    record.Fingerprint,
						Pattern:        record.Pattern,
						Severity:       record.Severity,
						Status:         incidents.StatusResolved,
						Resource:       record.Resource,
						Title:          record.Title,
						Description:    record.Description,
						Occurrences:    record.Occurrences,
						FirstSeen:      record.FirstSeen,
						LastSeen:       record.LastSeen,
						ResolvedAt:     record.ResolvedAt,
						Resolution:     record.Resolution,
						Diagnosis:      diagnosis,
						ClusterContext: record.ClusterContext,
					}
					incidentList = append(incidentList, incident)
				}
			}
		}
	}

	// Build summary
	summary := map[string]interface{}{
		"total":      len(incidentList),
		"active":     len(incidentList),
		"bySeverity": make(map[string]int),
		"byPattern":  make(map[string]int),
		"byStatus":   make(map[string]int),
	}

	for _, inc := range incidentList {
		sev := string(inc.Severity)
		pat := string(inc.Pattern)
		stat := string(inc.Status)

		sevMap := summary["bySeverity"].(map[string]int)
		sevMap[sev]++

		patMap := summary["byPattern"].(map[string]int)
		patMap[pat]++

		statMap := summary["byStatus"].(map[string]int)
		statMap[stat]++
	}

	// Check if scan is in progress for the response
	scanInProgress := false
	if ws.app.incidentIntelligence != nil {
		scanInProgress = ws.app.incidentIntelligence.IsScanInProgress()
	}

	// Format response
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"incidents":      incidentList,
		"total":          len(incidentList),
		"summary":        summary,
		"scanInProgress": scanInProgress,
	})
}

// mapTypeToPattern maps Kubernetes incident types from IncidentScanner to incidents.FailurePattern
func mapTypeToPattern(incidentType string) incidents.FailurePattern {
	switch incidentType {
	case "oom":
		return incidents.PatternOOMPressure
	case "crashloop":
		return incidents.PatternCrashLoop
	case "high_restarts":
		return incidents.PatternRestartStorm
	case "node_memory_pressure":
		return incidents.PatternOOMPressure
	case "node_disk_pressure":
		return incidents.PatternDiskPressure
	case "node_pressure":
		return incidents.PatternNodePressure
	case "node_not_ready":
		return incidents.PatternNodeNotReady
	case "job_failure", "cronjob_failure":
		return incidents.PatternAppCrash
	case "image_pull_failure":
		return incidents.PatternImagePullFailure
	// Cert-manager related incidents
	case "certificate_not_ready", "certificate_expired", "certificate_expiring":
		return incidents.PatternCertificateExpiring
	case "certificate_request_failed":
		return incidents.PatternCertificateRequestFailed
	case "issuer_not_ready", "cluster_issuer_not_ready":
		return incidents.PatternIssuerNotReady
	default:
		return incidents.PatternUnknown
	}
}

// getIncidentByID retrieves an incident by ID from v2 manager only (production-ready, no fallbacks)
func (ws *WebServer) getIncidentByID(incidentID string) *incidents.Incident {
	if ws.app.incidentIntelligence == nil {
		return nil
	}
	
	// Check cache first for performance
	if ws.incidentCache != nil {
		if incident := ws.incidentCache.GetV2Incident(incidentID); incident != nil {
			return incident
		}
	}

	// Get from v2 manager
	manager := ws.app.incidentIntelligence.GetManager()
	incident := manager.GetIncident(incidentID)

	// Cache it for future lookups
	if incident != nil && ws.incidentCache != nil {
		ws.incidentCache.SetV2Incident(incidentID, incident)
	}

	return incident
}

// handleIncidentV2ByID handles GET/PUT /api/v2/incidents/{id}
func (ws *WebServer) handleIncidentV2ByID(w http.ResponseWriter, r *http.Request) {
	if ws.app.incidentIntelligence == nil {
		log.Printf("[handleIncidentV2ByID] Incident intelligence not initialized")
		http.Error(w, "Incident intelligence not initialized", http.StatusServiceUnavailable)
		return
	}

	// Extract incident ID from path
	path := r.URL.Path
	log.Printf("[handleIncidentV2ByID] Extracting ID from path: %s", path)
	id := extractIDFromPath(path, "/api/v2/incidents/")
	log.Printf("[handleIncidentV2ByID] Extracted ID: '%s'", id)

	if id == "" {
		log.Printf("[handleIncidentV2ByID] No ID extracted, returning 400")
		http.Error(w, "Incident ID required", http.StatusBadRequest)
		return
	}

	manager := ws.app.incidentIntelligence.GetManager()

	// Handle sub-paths (snapshot, evidence, logs, etc.)
	subPath := getSubPath(id)
	log.Printf("[handleIncidentV2ByID] SubPath: '%s'", subPath)
	if subPath != "" {
		baseID := getBaseID(id)
		log.Printf("[handleIncidentV2ByID] BaseID: '%s'", baseID)
		switch subPath {
		case "snapshot":
			ws.handleIncidentSnapshot(w, r, baseID)
			return
		case "feedback":
			// Handle feedback endpoint - call the learning handler directly
			// Temporarily modify path so handler can extract ID
			originalPath := r.URL.Path
			r.URL.Path = fmt.Sprintf("/api/v2/incidents/%s/feedback", baseID)
			ws.handleIncidentFeedbackLearning(w, r)
			r.URL.Path = originalPath // Restore original path
			return
		case "fixes":
			// New remediation engine API
			ws.handleIncidentFixes(w, r, baseID)
			return
		case "fix-preview":
			// New remediation engine API (v2)
			ws.handleFixPreviewV2(w, r, baseID)
			return
		case "fix-apply":
			// New remediation engine API (v2)
			ws.handleFixApplyV2(w, r, baseID)
			return
		case "post-check":
			// New remediation engine API
			ws.handlePostCheck(w, r, baseID)
			return
		case "evidence", "logs", "metrics", "changes", "runbooks", "similar", "citations":
			// These are handled by existing action handlers
			ws.handleIncidentV2Action(w, r, manager, baseID, subPath)
			return
		default:
			ws.handleIncidentV2Action(w, r, manager, baseID, subPath)
			return
		}
	}

	switch r.Method {
	case http.MethodGet:
		incident := manager.GetIncident(id)
		if incident == nil {
			http.Error(w, "Incident not found", http.StatusNotFound)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(incident)

	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

// handleIncidentV2Action handles incident actions like resolve, suppress, etc.
func (ws *WebServer) handleIncidentV2Action(w http.ResponseWriter, r *http.Request, manager *incidents.Manager, incidentID, action string) {
	ctx := r.Context()

	switch action {
	case "resolve":
		if r.Method != http.MethodPost {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}

		var req struct {
			Resolution string `json:"resolution"`
		}
		json.NewDecoder(r.Body).Decode(&req)
		if req.Resolution == "" {
			req.Resolution = "Resolved by user"
		}

		log.Printf("[ResolveIncident] Attempting to resolve incident: %s", incidentID)
		
		// Get incident from v2 manager only (production-ready, no fallbacks)
		incident := ws.getIncidentByID(incidentID)
		
		if incident == nil {
			log.Printf("[ResolveIncident] Incident not found: %s", incidentID)
			http.Error(w, "Incident not found", http.StatusNotFound)
			return
		}

		// Mark as resolved
		incident.UpdateStatus(incidents.StatusResolved, req.Resolution)
		incident.Resolution = req.Resolution
		now := time.Now()
		incident.ResolvedAt = &now
		
		// Store in database via KnowledgeBank so it persists permanently
		kb := ws.getKnowledgeBank()
		if kb != nil {
			if err := kb.StoreIncident(incident, nil, nil); err != nil {
				log.Printf("[ResolveIncident] Warning: Failed to store in database: %v", err)
			} else {
				log.Printf("[ResolveIncident] Successfully stored resolved incident in database")
			}
		}

		if err := manager.ResolveIncident(incidentID, req.Resolution); err != nil {
			log.Printf("[ResolveIncident] Error resolving incident: %v", err)
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		log.Printf("[ResolveIncident] Successfully resolved incident: %s", incidentID)
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"status": "resolved"})

	case "suppress":
		if r.Method != http.MethodPost {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}

		var req struct {
			Reason string `json:"reason"`
		}
		json.NewDecoder(r.Body).Decode(&req)
		if req.Reason == "" {
			req.Reason = "Suppressed by user"
		}

		if err := manager.SuppressIncident(incidentID, req.Reason); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"status": "suppressed"})

	case "acknowledge":
		if r.Method != http.MethodPost {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}

		if err := manager.AcknowledgeIncident(incidentID); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"status": "acknowledged"})

	case "recommendations":
		ws.handleIncidentRecommendations(w, r, manager, incidentID, ctx)

	case "timeline":
		incident := manager.GetIncident(incidentID)
		if incident == nil {
			http.Error(w, "Incident not found", http.StatusNotFound)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(incident.Timeline)

	case "signals":
		incident := manager.GetIncident(incidentID)
		if incident == nil {
			http.Error(w, "Incident not found", http.StatusNotFound)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(incident.Signals)

		case "fix-preview-old":
			// Legacy: Delegate to handleFixPreview with the incidentID in path
			ws.handleFixPreviewForIncident(w, r, incidentID)

		case "fix-apply-old":
			// Legacy: Delegate to handleFixApply with the incidentID in path
			ws.handleFixApplyForIncident(w, r, incidentID)

	case "runbooks":
		// Return runbooks for this incident
		ws.handleIncidentRunbooks(w, r, incidentID)

	case "evidence":
		// Return evidence for this incident
		ws.handleIncidentEvidence(w, r, incidentID)

	case "logs":
		// Return logs for this incident
		ws.handleIncidentLogs(w, r, incidentID)

	case "metrics":
		// Return metrics for this incident
		ws.handleIncidentMetrics(w, r, incidentID)

	case "changes":
		// Return changes for this incident
		ws.handleIncidentChanges(w, r, incidentID)

	case "citations":
		// Return citations for this incident
		ws.handleIncidentCitations(w, r, incidentID)

	case "similar":
		// Return similar incidents
		ws.handleIncidentSimilar(w, r, incidentID)

	case "feedback":
		// Handle incident feedback
		ws.handleIncidentFeedback(w, r, incidentID)

	default:
		http.Error(w, "Unknown action", http.StatusNotFound)
	}
}

// handleIncidentRecommendations handles recommendation actions.
func (ws *WebServer) handleIncidentRecommendations(w http.ResponseWriter, r *http.Request, manager *incidents.Manager, incidentID string, ctx context.Context) {
	incident := manager.GetIncident(incidentID)
	if incident == nil {
		http.Error(w, "Incident not found", http.StatusNotFound)
		return
	}

	// Check for sub-path (e.g., recommendations/{recId}/preview)
	path := r.URL.Path
	idx := strings.Index(path, "recommendations/")
	if idx == -1 {
		// Just return recommendations
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(incident.Recommendations)
		return
	}

	remaining := path[idx+len("recommendations/"):]
	parts := strings.Split(remaining, "/")

	if len(parts) < 2 {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(incident.Recommendations)
		return
	}

	recID := parts[0]
	action := parts[1]

	switch action {
	case "preview":
		preview, err := manager.PreviewFix(ctx, incidentID, recID)
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(preview)

	case "dry-run":
		result, err := manager.DryRunFix(ctx, incidentID, recID)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(result)

	case "apply":
		if r.Method != http.MethodPost {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}

		result, err := manager.ApplyFix(ctx, incidentID, recID)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(result)

	default:
		http.Error(w, "Unknown action", http.StatusNotFound)
	}
}

// handleIncidentsV2Summary handles GET /api/v2/incidents/summary
func (ws *WebServer) handleIncidentsV2Summary(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	if ws.app.incidentIntelligence == nil {
		http.Error(w, "Incident intelligence not initialized", http.StatusServiceUnavailable)
		return
	}

	manager := ws.app.incidentIntelligence.GetManager()

	response := map[string]interface{}{
		"summary":      manager.GetSummary(),
		"patternStats": manager.GetPatternStats(),
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// handleIncidentsV2Patterns handles GET /api/v2/incidents/patterns
func (ws *WebServer) handleIncidentsV2Patterns(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(incidents.AllPatterns())
}

// handleIncidentsV2Refresh handles POST /api/v2/incidents/refresh
// This regenerates recommendations for all incidents using the latest recommendation logic.
func (ws *WebServer) handleIncidentsV2Refresh(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	if ws.app.incidentIntelligence == nil {
		http.Error(w, "Incident intelligence not initialized", http.StatusServiceUnavailable)
		return
	}

	count := ws.app.incidentIntelligence.GetManager().RegenerateRecommendations()

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success":          true,
		"incidentsUpdated": count,
		"message":          fmt.Sprintf("Regenerated recommendations for %d incidents", count),
	})
}

// Helper functions

func extractIDFromPath(path, prefix string) string {
	if !strings.HasPrefix(path, prefix) {
		log.Printf("[extractIDFromPath] Path '%s' does not start with prefix '%s'", path, prefix)
		return ""
	}
	remaining := path[len(prefix):]
	log.Printf("[extractIDFromPath] Remaining after prefix: '%s'", remaining)
	if idx := strings.Index(remaining, "/"); idx != -1 {
		result := remaining
		log.Printf("[extractIDFromPath] Found '/' at index %d, returning: '%s'", idx, result)
		return result
	}
	log.Printf("[extractIDFromPath] No '/' found, returning: '%s'", remaining)
	return remaining
}

func getSubPath(id string) string {
	if idx := strings.Index(id, "/"); idx != -1 {
		subPath := id[idx+1:]
		log.Printf("[getSubPath] Found '/' at index %d in '%s', subPath: '%s'", idx, id, subPath)
		return subPath
	}
	log.Printf("[getSubPath] No '/' found in '%s', returning empty", id)
	return ""
}

func getBaseID(id string) string {
	if idx := strings.Index(id, "/"); idx != -1 {
		baseID := id[:idx]
		log.Printf("[getBaseID] Found '/' at index %d in '%s', baseID: '%s'", idx, id, baseID)
		return baseID
	}
	log.Printf("[getBaseID] No '/' found in '%s', returning full ID", id)
	return id
}

// handleFixPreview handles POST /api/v2/incidents/fix-preview
// Also handles POST /api/v2/incidents/{id}/fix-preview
func (ws *WebServer) handleFixPreview(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	if ws.app.incidentIntelligence == nil {
		http.Error(w, "Incident intelligence not initialized", http.StatusServiceUnavailable)
		return
	}

	// Parse request body
	var req incidents.FixPreviewRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Extract incident ID from path if present
	path := r.URL.Path
	if idx := strings.Index(path, "/incidents/"); idx != -1 {
		remaining := path[idx+len("/incidents/"):]
		if previewIdx := strings.Index(remaining, "/fix-preview"); previewIdx != -1 {
			req.IncidentID = remaining[:previewIdx]
		}
	}

	if req.IncidentID == "" {
		http.Error(w, "Missing incident ID", http.StatusBadRequest)
		return
	}

	// Get incident from v2 manager only (production-ready, no fallbacks)
	incident := ws.getIncidentByID(req.IncidentID)

	if incident == nil {
		http.Error(w, "Incident not found", http.StatusNotFound)
		return
	}

	// Find the fix
	var fix *incidents.ProposedFix
	if req.RecommendationID != "" {
		for _, rec := range incident.Recommendations {
			if rec.ID == req.RecommendationID && rec.ProposedFix != nil {
				fix = rec.ProposedFix
				break
			}
		}
	} else {
		// Get first available fix
		for _, rec := range incident.Recommendations {
			if rec.ProposedFix != nil {
				fix = rec.ProposedFix
				req.RecommendationID = rec.ID
				break
			}
		}
	}

	// If no fix found on recommendations, generate one
	if fix == nil {
		registry := incidents.NewFixGeneratorRegistry()
		fixes := registry.GenerateFixes(incident)
		if len(fixes) > 0 {
			fix = fixes[0]
		}
	}

	if fix == nil {
		http.Error(w, "No fix available for this incident", http.StatusNotFound)
		return
	}

	// Generate preview response
	response := incidents.CreateFixPreviewResponse(fix)

	// Validate safety
	if err := incidents.ValidateFixAction(nil, fix.TargetResource); err != nil {
		response.Valid = false
		response.ValidationError = err.Error()
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// handleFixApply handles POST /api/v2/incidents/fix-apply
// Also handles POST /api/v2/incidents/{id}/fix-apply
func (ws *WebServer) handleFixApply(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	if ws.app.incidentIntelligence == nil {
		http.Error(w, "Incident intelligence not initialized", http.StatusServiceUnavailable)
		return
	}

	// Parse request body
	var req incidents.FixApplyRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Extract incident ID from path if present
	path := r.URL.Path
	if idx := strings.Index(path, "/incidents/"); idx != -1 {
		remaining := path[idx+len("/incidents/"):]
		if applyIdx := strings.Index(remaining, "/fix-apply"); applyIdx != -1 {
			req.IncidentID = remaining[:applyIdx]
		}
	}

	if req.IncidentID == "" {
		http.Error(w, "Missing incident ID", http.StatusBadRequest)
		return
	}

	manager := ws.app.incidentIntelligence.GetManager()
	ctx := r.Context()

	// Get incident from v2 manager only (production-ready, no fallbacks)
	incident := ws.getIncidentByID(req.IncidentID)

	if incident == nil {
		http.Error(w, "Incident not found", http.StatusNotFound)
		return
	}

	// Find the fix
	var fix *incidents.ProposedFix
	if req.RecommendationID != "" {
		for _, rec := range incident.Recommendations {
			if rec.ID == req.RecommendationID && rec.ProposedFix != nil {
				fix = rec.ProposedFix
				break
			}
		}
	} else {
		for _, rec := range incident.Recommendations {
			if rec.ProposedFix != nil {
				fix = rec.ProposedFix
				req.RecommendationID = rec.ID
				break
			}
		}
	}

	if fix == nil {
		registry := incidents.NewFixGeneratorRegistry()
		fixes := registry.GenerateFixes(incident)
		if len(fixes) > 0 {
			fix = fixes[0]
		}
	}

	if fix == nil {
		http.Error(w, "No fix available for this incident", http.StatusNotFound)
		return
	}

	// Validate safety
	if err := incidents.ValidateFixAction(nil, fix.TargetResource); err != nil {
		response := &incidents.FixApplyResponse{
			Success:   false,
			Error:     err.Error(),
			DryRun:    req.DryRun,
			AppliedAt: time.Now(),
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(response)
		return
	}

	// Execute the fix using the manager
	var result *incidents.FixResult
	var err error

	if req.DryRun {
		result, err = manager.DryRunFix(ctx, req.IncidentID, req.RecommendationID)
	} else {
		result, err = manager.ApplyFix(ctx, req.IncidentID, req.RecommendationID)
	}

	response := &incidents.FixApplyResponse{
		DryRun:    req.DryRun,
		AppliedAt: time.Now(),
	}

	if err != nil {
		response.Success = false
		response.Error = err.Error()
	} else if result != nil {
		response.Success = result.Success
		response.Message = result.Message
		response.Changes = result.Changes
		response.Error = result.Error
		if result.RollbackCommand != "" {
			response.RollbackCmd = result.RollbackCommand
		}
	} else {
		// Fallback response when no executor
		response.Success = true
		if req.DryRun {
			response.Message = fmt.Sprintf("Dry run successful: %s", fix.Description)
		} else {
			response.Message = fmt.Sprintf("Command to execute: %s", fix.ApplyCmd)
		}
		response.Changes = []string{fix.Description}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// handleAutoRemediationStatus handles GET /api/v2/auto-remediation/status
func (ws *WebServer) handleAutoRemediationStatus(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Check capabilities - if disabled, return disabled status
	if !capabilities.IsAutoRemediationEnabled() {
		status := incidents.AutoRemediationStatus{
			Enabled:              false,
			ActiveExecutions:     0,
			TotalExecutions:      0,
			SuccessfulExecutions: 0,
			FailedExecutions:     0,
			RolledBackExecutions: 0,
			QueuedIncidents:      0,
			CooldownResources:    0,
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(status)
		return
	}

	if ws.app.incidentIntelligence == nil || ws.app.incidentIntelligence.GetIntelligenceSystem() == nil {
		// Return default disabled status
		status := incidents.AutoRemediationStatus{
			Enabled:              false,
			ActiveExecutions:     0,
			TotalExecutions:      0,
			SuccessfulExecutions: 0,
			FailedExecutions:     0,
			RolledBackExecutions: 0,
			QueuedIncidents:      0,
			CooldownResources:    0,
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(status)
		return
	}

	intelSys := ws.app.incidentIntelligence.GetIntelligenceSystem()
	autoEngine := intelSys.GetAutoEngine()

	if autoEngine == nil {
		// Auto-remediation engine not initialized
		status := incidents.AutoRemediationStatus{
			Enabled:              false,
			ActiveExecutions:     0,
			TotalExecutions:      0,
			SuccessfulExecutions: 0,
			FailedExecutions:     0,
			RolledBackExecutions: 0,
			QueuedIncidents:      0,
			CooldownResources:    0,
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(status)
		return
	}

	status := autoEngine.GetStatus()
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(status)
}

// handleIntelligenceStatus handles GET /api/v2/intelligence/status
func (ws *WebServer) handleIntelligenceStatus(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	w.Header().Set("Content-Type", "application/json")

	if ws.app.incidentIntelligence == nil || ws.app.incidentIntelligence.GetIntelligenceSystem() == nil {
		// Return a valid JSON response with offline status when not available
		json.NewEncoder(w).Encode(map[string]interface{}{
			"running":              false,
			"knowledgeBankEnabled": false,
			"learningEnabled":      false,
			"clusterCount":         0,
			"learnedPatternCount":  0,
			"podsMonitored":        0,
			"nodesMonitored":       0,
			"eventsProcessed":      0,
			"lastScanTime":         "",
			"runbooksAvailable":    0,
			"systemHealth":         "offline",
		})
		return
	}

	intelSys := ws.app.incidentIntelligence.GetIntelligenceSystem()
	status := intelSys.GetStatus()

	json.NewEncoder(w).Encode(status)
}

// handleAutoRemediationEnable handles POST /api/v2/auto-remediation/enable
func (ws *WebServer) handleAutoRemediationEnable(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	if ws.app.incidentIntelligence == nil || ws.app.incidentIntelligence.GetIntelligenceSystem() == nil {
		http.Error(w, "Incident intelligence not initialized", http.StatusServiceUnavailable)
		return
	}

	intelSys := ws.app.incidentIntelligence.GetIntelligenceSystem()
	if err := intelSys.EnableAutoRemediation(); err != nil {
		http.Error(w, fmt.Sprintf("Failed to enable auto-remediation: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": "Auto-remediation enabled",
	})
}

// handleAutoRemediationDisable handles POST /api/v2/auto-remediation/disable
func (ws *WebServer) handleAutoRemediationDisable(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	if ws.app.incidentIntelligence == nil || ws.app.incidentIntelligence.GetIntelligenceSystem() == nil {
		http.Error(w, "Incident intelligence not initialized", http.StatusServiceUnavailable)
		return
	}

	intelSys := ws.app.incidentIntelligence.GetIntelligenceSystem()
	if err := intelSys.DisableAutoRemediation(); err != nil {
		http.Error(w, fmt.Sprintf("Failed to disable auto-remediation: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": "Auto-remediation disabled",
	})
}

// handleAutoRemediationDecisions handles GET /api/v2/auto-remediation/decisions
func (ws *WebServer) handleAutoRemediationDecisions(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Check capabilities - if disabled, return empty list
	if !capabilities.IsAutoRemediationEnabled() {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode([]interface{}{})
		return
	}

	if ws.app.incidentIntelligence == nil || ws.app.incidentIntelligence.GetIntelligenceSystem() == nil {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode([]interface{}{})
		return
	}

	intelSys := ws.app.incidentIntelligence.GetIntelligenceSystem()
	autoEngine := intelSys.GetAutoEngine()

	if autoEngine == nil {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode([]interface{}{})
		return
	}

	decisions := autoEngine.GetRecentDecisions(50)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(decisions)
}

// handleLearningClusters handles GET /api/v2/learning/clusters
func (ws *WebServer) handleLearningClusters(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Check capabilities - learning engine must be enabled
	if !capabilities.IsLearningEngineEnabled() {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode([]interface{}{})
		return
	}

	if ws.app.incidentIntelligence == nil || ws.app.incidentIntelligence.GetIntelligenceSystem() == nil {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode([]interface{}{})
		return
	}

	intelSys := ws.app.incidentIntelligence.GetIntelligenceSystem()
	learningEngine := intelSys.GetLearningEngine()

	if learningEngine == nil {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode([]interface{}{})
		return
	}

	clusters := learningEngine.GetAllClusters()
	
	// Convert to frontend format
	result := make([]map[string]interface{}, 0, len(clusters))
	for _, cluster := range clusters {
		bestRunbook := ""
		if cluster.BestRunbook != "" {
			bestRunbook = cluster.BestRunbook
		}
		result = append(result, map[string]interface{}{
			"id":              cluster.ID,
			"fingerprint":     cluster.Fingerprint,
			"pattern":         string(cluster.Pattern),
			"incidentCount":   cluster.IncidentCount,
			"firstSeen":       cluster.FirstSeen.Format(time.RFC3339),
			"lastSeen":        cluster.LastSeen.Format(time.RFC3339),
			"commonCauses":    cluster.CommonCauses,
			"bestRunbook":     bestRunbook,
			"successRate":     cluster.SuccessRate,
		})
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}

// handleLearningPatterns handles GET /api/v2/learning/patterns
func (ws *WebServer) handleLearningPatterns(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Check capabilities - learning engine must be enabled
	if !capabilities.IsLearningEngineEnabled() {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode([]interface{}{})
		return
	}

	query := r.URL.Query()
	includeAnomalies := query.Get("anomalies") == "true"

	if ws.app.incidentIntelligence == nil || ws.app.incidentIntelligence.GetIntelligenceSystem() == nil {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode([]interface{}{})
		return
	}

	intelSys := ws.app.incidentIntelligence.GetIntelligenceSystem()
	learningEngine := intelSys.GetLearningEngine()

	if learningEngine == nil {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode([]interface{}{})
		return
	}

	patterns := learningEngine.GetLearnedPatterns(includeAnomalies)
	
	// Convert to frontend format
	result := make([]map[string]interface{}, 0, len(patterns))
	for _, pattern := range patterns {
		result = append(result, map[string]interface{}{
			"id":          pattern.ID,
			"name":        pattern.Name,
			"description": pattern.Description,
			"basePattern": string(pattern.BasePattern),
			"confidence":  pattern.Confidence,
			"occurrences": pattern.Occurrences,
			"learnedAt":   pattern.LearnedAt.Format(time.RFC3339),
			"isAnomaly":   pattern.IsAnomaly,
		})
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}

// handleLearningTrends handles GET /api/v2/learning/trends
func (ws *WebServer) handleLearningTrends(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Check capabilities - learning engine must be enabled
	if !capabilities.IsLearningEngineEnabled() {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{})
		return
	}

	if ws.app.incidentIntelligence == nil || ws.app.incidentIntelligence.GetIntelligenceSystem() == nil {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{})
		return
	}

	intelSys := ws.app.incidentIntelligence.GetIntelligenceSystem()
	learningEngine := intelSys.GetLearningEngine()

	if learningEngine == nil {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{})
		return
	}

	// Update trends before returning
	learningEngine.UpdateTrends()

	// Get trends for all known patterns
	allPatterns := []incidents.FailurePattern{
		incidents.PatternCrashLoop,
		incidents.PatternOOMPressure,
		incidents.PatternRestartStorm,
		incidents.PatternImagePullFailure,
		incidents.PatternNoReadyEndpoints,
	}

	result := make(map[string]interface{})
	for _, pattern := range allPatterns {
		trend := learningEngine.GetTrend(pattern)
		if trend != nil {
			result[string(pattern)] = map[string]interface{}{
				"pattern":       string(trend.Pattern),
				"last24h": map[string]interface{}{
					"count":         trend.Last24h.Count,
					"resolvedCount": trend.Last24h.ResolvedCount,
					"successRate":   trend.Last24h.SuccessRate,
				},
				"last7d": map[string]interface{}{
					"count":         trend.Last7d.Count,
					"resolvedCount": trend.Last7d.ResolvedCount,
					"successRate":   trend.Last7d.SuccessRate,
				},
				"last30d": map[string]interface{}{
					"count":         trend.Last30d.Count,
					"resolvedCount": trend.Last30d.ResolvedCount,
					"successRate":   trend.Last30d.SuccessRate,
				},
				"trend":         trend.Trend,
				"changePercent": trend.ChangePercent,
			}
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}

// handleLearningSimilar handles GET /api/v2/learning/similar
func (ws *WebServer) handleLearningSimilar(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Return empty similar incidents for now
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode([]interface{}{})
}

// handleRunbooks handles GET /api/v2/runbooks
func (ws *WebServer) handleRunbooks(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Return basic runbooks - using actual runbook IDs from the registry
	runbooks := []map[string]interface{}{
		{
			"id":             "restart-pod",
			"name":           "Restart Pod",
			"description":    "Delete the affected pod to trigger recreation by its controller",
			"pattern":        "RESTART_STORM",
			"risk":           "low",
			"autonomyLevel":  2,
			"successRate":    0.85,
			"executionCount": 0,
			"enabled":        true,
			"tags":           []string{"pod", "restart", "quick-fix"},
		},
		{
			"id":             "restart-storm-increase-memory",
			"name":           "Increase Memory Limit",
			"description":    "Increase memory limits for containers experiencing OOM",
			"pattern":        "RESTART_STORM",
			"risk":           "medium",
			"autonomyLevel":  2,
			"successRate":    0.75,
			"executionCount": 0,
			"enabled":        true,
			"tags":           []string{"memory", "resources", "oom"},
		},
		{
			"id":             "restart-storm-rollback",
			"name":           "Rollback Deployment",
			"description":    "Rollback deployment to previous revision if recent change detected",
			"pattern":        "RESTART_STORM",
			"risk":           "medium",
			"autonomyLevel":  2,
			"successRate":    0.8,
			"executionCount": 0,
			"enabled":        true,
			"tags":           []string{"deployment", "rollback", "restart"},
		},
		{
			"id":             "rolling-restart",
			"name":           "Rolling Restart Deployment",
			"description":    "Perform a rolling restart of the deployment",
			"pattern":        "NO_READY_ENDPOINTS",
			"risk":           "low",
			"autonomyLevel":  2,
			"successRate":    0.9,
			"executionCount": 0,
			"enabled":        true,
			"tags":           []string{"deployment", "restart", "endpoints"},
		},
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(runbooks)
}

// handleFeedback handles POST /api/v2/feedback
func (ws *WebServer) handleFeedback(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		IncidentID string `json:"incidentId"`
		Type       string `json:"type"`
		Content    string `json:"content"`
		FixID      string `json:"fixId"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	log.Printf("Feedback received: incident=%s, type=%s, content=%s", req.IncidentID, req.Type, req.Content)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": "Feedback recorded successfully",
	})
}

// handleFixPreviewForIncident handles fix preview for a specific incident
func (ws *WebServer) handleFixPreviewForIncident(w http.ResponseWriter, r *http.Request, incidentID string) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Parse request body for recommendationId
	var req struct {
		RecommendationID string `json:"recommendationId"`
	}
	json.NewDecoder(r.Body).Decode(&req)

	// Find the incident
	var incident *incidents.Incident

	if ws.app.incidentIntelligence != nil {
		incident = ws.app.incidentIntelligence.GetManager().GetIncident(incidentID)
	}

	// No fallback - v2 manager only (production-ready)

	if incident == nil {
		http.Error(w, "Incident not found", http.StatusNotFound)
		return
	}

	// Find the fix
	var fix *incidents.ProposedFix
	if req.RecommendationID != "" {
		for _, rec := range incident.Recommendations {
			if rec.ID == req.RecommendationID && rec.ProposedFix != nil {
				fix = rec.ProposedFix
				break
			}
		}
	} else {
		for _, rec := range incident.Recommendations {
			if rec.ProposedFix != nil {
				fix = rec.ProposedFix
				break
			}
		}
	}

	if fix == nil {
		// Generate a fix
		registry := incidents.NewFixGeneratorRegistry()
		fixes := registry.GenerateFixes(incident)
		if len(fixes) > 0 {
			fix = fixes[0]
		}
	}

	if fix == nil {
		http.Error(w, "No fix available for this incident", http.StatusNotFound)
		return
	}

	// Generate preview response
	response := incidents.CreateFixPreviewResponse(fix)

	// Validate safety
	if err := incidents.ValidateFixAction(nil, fix.TargetResource); err != nil {
		response.Valid = false
		response.ValidationError = err.Error()
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// handleFixApplyForIncident handles fix apply for a specific incident
func (ws *WebServer) handleFixApplyForIncident(w http.ResponseWriter, r *http.Request, incidentID string) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Parse request body
	var req struct {
		RecommendationID string `json:"recommendationId"`
		DryRun           bool   `json:"dryRun"`
	}
	json.NewDecoder(r.Body).Decode(&req)

	// Find the incident
	var incident *incidents.Incident

	if ws.app.incidentIntelligence != nil {
		incident = ws.app.incidentIntelligence.GetManager().GetIncident(incidentID)
	}

	// No fallback - v2 manager only (production-ready)

	if incident == nil {
		http.Error(w, "Incident not found", http.StatusNotFound)
		return
	}

	// Find the fix
	var fix *incidents.ProposedFix
	if req.RecommendationID != "" {
		for _, rec := range incident.Recommendations {
			if rec.ID == req.RecommendationID && rec.ProposedFix != nil {
				fix = rec.ProposedFix
				break
			}
		}
	} else {
		for _, rec := range incident.Recommendations {
			if rec.ProposedFix != nil {
				fix = rec.ProposedFix
				break
			}
		}
	}

	if fix == nil {
		registry := incidents.NewFixGeneratorRegistry()
		fixes := registry.GenerateFixes(incident)
		if len(fixes) > 0 {
			fix = fixes[0]
		}
	}

	if fix == nil {
		http.Error(w, "No fix available for this incident", http.StatusNotFound)
		return
	}

	// Validate safety
	if err := incidents.ValidateFixAction(nil, fix.TargetResource); err != nil {
		response := &incidents.FixApplyResponse{
			Success:   false,
			Error:     err.Error(),
			DryRun:    req.DryRun,
			AppliedAt: time.Now(),
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(response)
		return
	}

	response := &incidents.FixApplyResponse{
		DryRun:    req.DryRun,
		AppliedAt: time.Now(),
	}

	// Try to execute via manager if the incident is managed
	executed := false
	if ws.app.incidentIntelligence != nil {
		ctx := r.Context()
		manager := ws.app.incidentIntelligence.GetManager()

		// Only try manager if the incident exists there
		if manager.GetIncident(incidentID) != nil {
			var result *incidents.FixResult
			var err error

			if req.DryRun {
				result, err = manager.DryRunFix(ctx, incidentID, req.RecommendationID)
			} else {
				result, err = manager.ApplyFix(ctx, incidentID, req.RecommendationID)
			}

			if err != nil {
				response.Success = false
				response.Error = err.Error()
			} else if result != nil {
				response.Success = result.Success
				response.Message = result.Message
				response.Changes = result.Changes
				response.Error = result.Error
				if result.RollbackCommand != "" {
					response.RollbackCmd = result.RollbackCommand
				}
			}
			executed = true
		}
	}

	if !executed {
		// Return command info for v1 incidents or when no manager
		response.Success = true
		if req.DryRun {
			response.Message = fmt.Sprintf("Dry run successful. Command: %s", fix.DryRunCmd)
		} else {
			response.Message = fmt.Sprintf("To apply this fix, run: %s", fix.ApplyCmd)
		}
		response.Changes = []string{fix.Description}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// handleIncidentRunbooks handles GET /api/v2/incidents/{id}/runbooks
func (ws *WebServer) handleIncidentRunbooks(w http.ResponseWriter, r *http.Request, incidentID string) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Get incident from v2 manager only (production-ready, no fallbacks)
	incident := ws.getIncidentByID(incidentID)

	if incident == nil {
		// Return empty runbooks if incident not found
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode([]map[string]interface{}{})
		return
	}

	var runbooks []map[string]interface{}

	if incident != nil {
		// Return runbooks matching this pattern
		pattern := string(incident.Pattern)
		patternUpper := strings.ToUpper(pattern)

		// Check cache first
		runbooks = ws.incidentCache.GetRunbooks(patternUpper)
		if runbooks != nil {
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(runbooks)
			return
		}

		allRunbooks := []map[string]interface{}{
			{
				"id":             "restart-pod",
				"name":           "Restart Pod",
				"description":    "Delete the affected pod to trigger recreation by its controller",
				"pattern":        "RESTART_STORM",
				"risk":           "low",
				"autonomyLevel":  2,
				"successRate":    0.85,
				"executionCount": 0,
				"enabled":        true,
				"tags":           []string{"pod", "restart", "quick-fix"},
			},
			{
				"id":             "restart-storm-increase-memory",
				"name":           "Increase Memory Limit",
				"description":    "Increase memory limits for containers experiencing OOM",
				"pattern":        "RESTART_STORM",
				"risk":           "medium",
				"autonomyLevel":  2,
				"successRate":    0.75,
				"executionCount": 0,
				"enabled":        true,
				"tags":           []string{"memory", "resources", "oom"},
			},
			{
				"id":             "restart-storm-rollback",
				"name":           "Rollback Deployment",
				"description":    "Rollback deployment to previous revision if recent change detected",
				"pattern":        "RESTART_STORM",
				"risk":           "medium",
				"autonomyLevel":  2,
				"successRate":    0.8,
				"executionCount": 0,
				"enabled":        true,
				"tags":           []string{"deployment", "rollback", "restart"},
			},
			{
				"id":             "rolling-restart",
				"name":           "Rolling Restart Deployment",
				"description":    "Perform a rolling restart of the deployment",
				"pattern":        "NO_READY_ENDPOINTS",
				"risk":           "low",
				"autonomyLevel":  2,
				"successRate":    0.9,
				"executionCount": 0,
				"enabled":        true,
				"tags":           []string{"deployment", "restart", "endpoints"},
			},
		}

		for _, rb := range allRunbooks {
			rbPattern := rb["pattern"].(string)
			rbPatternUpper := strings.ToUpper(rbPattern)
			// Match if patterns match, or if RESTART_STORM/CRASHLOOP (they're similar)
			matches := rbPatternUpper == patternUpper ||
				(patternUpper == "CRASHLOOP" && rbPatternUpper == "RESTART_STORM") ||
				rbPatternUpper == "ALL"
			if matches {
				log.Printf("[Runbooks] Matched runbook %s (pattern: %s) for incident pattern: %s", rb["id"], rbPatternUpper, patternUpper)
				runbooks = append(runbooks, rb)
			}
		}

		// Log if no runbooks matched
		if len(runbooks) == 0 {
			log.Printf("[Runbooks] No runbooks matched for pattern: %s (incident ID: %s)", patternUpper, incidentID)
		}

		// Cache the runbooks for this pattern
		ws.incidentCache.SetRunbooks(patternUpper, runbooks)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(runbooks)
}

// handleIncidentSnapshot handles GET /api/v2/incidents/{id}/snapshot
// This is the fast, hot-path endpoint that returns precomputed snapshot data
func (ws *WebServer) handleIncidentSnapshot(w http.ResponseWriter, r *http.Request, incidentID string) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	startTime := time.Now()

	// Get incident from v2 manager only (production-ready, no fallbacks)
	incident := ws.getIncidentByID(incidentID)

	if incident == nil {
		http.Error(w, "Incident not found", http.StatusNotFound)
		return
	}

	// Check snapshot cache
	fingerprint := incident.Fingerprint
	if fingerprint == "" {
		// Compute fingerprint if not set
		containerName := ""
		if incident.Resource.Kind == "Pod" {
			// Try to get container name from metadata or signals
			if len(incident.Signals.Status) > 0 {
				if container, ok := incident.Signals.Status[0].Attributes["container"]; ok {
					containerName = container
				}
			}
		}
		fingerprint = incidents.ComputeIncidentFingerprint(incident, containerName)
	}

	// Track performance context
	perfCtx := instrumentation.GetRequestContext(r)
	if perfCtx != nil {
		perfCtx.SetTag("incident_id", incidentID)
		if incident.Pattern != "" {
			perfCtx.IncidentPattern = string(incident.Pattern)
		}
	}

	snapshot, cached := ws.snapshotCache.Get(fingerprint)
	if perfCtx != nil {
		perfCtx.SetCacheHit(cached)
	}
	
	if !cached {
		// Build snapshot
		hotEvidenceBuilder := incidents.NewHotEvidenceBuilder()
		hotEvidence := hotEvidenceBuilder.BuildHotEvidence(incident)

		snapshotBuilder := incidents.NewSnapshotBuilder()
		// Set learner if available to use learned weights/priors
		if learner := ws.getConfidenceLearner(); learner != nil {
			snapshotBuilder.SetLearner(learner)
		}
		snapshot = snapshotBuilder.BuildSnapshot(incident, hotEvidence)

		// Cache the snapshot
		ws.snapshotCache.Put(fingerprint, snapshot)
	}

	// Check performance contract (< 100ms)
	elapsed := time.Since(startTime)
	if elapsed > 100*time.Millisecond {
		log.Printf("[Snapshot] Slow snapshot generation for %s: %v", incidentID, elapsed)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(snapshot)
}

// handleIncidentLogs handles GET /api/v2/incidents/{id}/logs (cold evidence)
func (ws *WebServer) handleIncidentLogs(w http.ResponseWriter, r *http.Request, incidentID string) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Get query parameters
	query := r.URL.Query()
	tailLines := 20 // Default to 20 lines
	if tailStr := query.Get("tail"); tailStr != "" {
		if tail, err := parseInt(tailStr); err == nil && tail > 0 && tail <= 1000 {
			tailLines = tail
		}
	}

	// Find the incident
	var incident *incidents.Incident
	incident = ws.incidentCache.GetV2Incident(incidentID)
	if incident == nil && ws.app.incidentIntelligence != nil {
		incident = ws.app.incidentIntelligence.GetManager().GetIncident(incidentID)
		if incident != nil {
			ws.incidentCache.SetV2Incident(incidentID, incident)
		}
	}

	// No fallback - v2 manager only (production-ready)

	if incident == nil {
		http.Error(w, "Incident not found", http.StatusNotFound)
		return
	}

	// Only fetch logs for Pod incidents
	if incident.Resource.Kind != "Pod" {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"logs": []map[string]interface{}{},
		})
		return
	}

	// Fetch pod logs
	logItems := ws.fetchPodLogsForIncident(incident)
	if len(logItems) > tailLines {
		logItems = logItems[:tailLines]
	}

	// Convert to frontend format
	logs := make([]map[string]interface{}, 0, len(logItems))
	for _, item := range logItems {
		logs = append(logs, map[string]interface{}{
			"type":     item.Type,
			"key":      item.ID,
			"value":    item.Content,
			"message":  item.Summary,
			"reason":   item.Summary,
			"time":     item.Timestamp.Format(time.RFC3339),
			"severity": item.Severity,
		})
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"logs": logs,
	})
}

// handleIncidentMetrics handles GET /api/v2/incidents/{id}/metrics (cold evidence)
func (ws *WebServer) handleIncidentMetrics(w http.ResponseWriter, r *http.Request, incidentID string) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Find the incident
	var incident *incidents.Incident
	incident = ws.incidentCache.GetV2Incident(incidentID)
	if incident == nil && ws.app.incidentIntelligence != nil {
		incident = ws.app.incidentIntelligence.GetManager().GetIncident(incidentID)
		if incident != nil {
			ws.incidentCache.SetV2Incident(incidentID, incident)
		}
	}

	// No fallback - v2 manager only (production-ready)

	if incident == nil {
		http.Error(w, "Incident not found", http.StatusNotFound)
		return
	}

		// Extract metrics from signals
		metricsFacts := make([]map[string]interface{}, 0)
		for _, signal := range incident.Signals.Metrics {
			metricsFacts = append(metricsFacts, map[string]interface{}{
				"type":    string(signal.Source),
				"key":     signal.ID,
				"value":   signal.Message, // Use message as value
				"message": signal.Message,
				"time":    signal.Timestamp.Format(time.RFC3339),
			})
		}

		// If no metrics from signals, provide basic incident metrics for v1 incidents
		if len(metricsFacts) == 0 && incident.Occurrences > 0 {
			metricsFacts = append(metricsFacts, map[string]interface{}{
				"type":    "incident",
				"key":     "occurrences",
				"value":   fmt.Sprintf("%d", incident.Occurrences),
				"message": fmt.Sprintf("Incident occurred %d times", incident.Occurrences),
				"time":    incident.LastSeen.Format(time.RFC3339),
			})
			if incident.Resource.Kind == "Pod" {
				// Try to get pod resource usage if available
				if ws.app.clientset != nil {
					pod, err := ws.app.clientset.CoreV1().Pods(incident.Resource.Namespace).Get(r.Context(), incident.Resource.Name, metav1.GetOptions{})
					if err == nil {
						// Add restart count as a metric
						restartCount := 0
						for _, status := range pod.Status.ContainerStatuses {
							restartCount += int(status.RestartCount)
						}
						if restartCount > 0 {
							metricsFacts = append(metricsFacts, map[string]interface{}{
								"type":    "pod",
								"key":     "restart_count",
								"value":   fmt.Sprintf("%d", restartCount),
								"message": fmt.Sprintf("Pod has restarted %d times", restartCount),
								"time":    incident.LastSeen.Format(time.RFC3339),
							})
						}
					}
				}
			}
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"metrics": metricsFacts,
		})
}

// handleIncidentChanges handles GET /api/v2/incidents/{id}/changes (cold evidence)
func (ws *WebServer) handleIncidentChanges(w http.ResponseWriter, r *http.Request, incidentID string) {
	// Use the existing changes handler (it extracts ID from path)
	// We need to set the path to match what handleIncidentChangesRoute expects
	originalPath := r.URL.Path
	r.URL.Path = fmt.Sprintf("/api/incidents/%s/changes", incidentID)
	defer func() { r.URL.Path = originalPath }()

	ws.handleIncidentChangesRoute(w, r)
}

// parseInt parses a string to int
func parseInt(s string) (int, error) {
	var result int
	_, err := fmt.Sscanf(s, "%d", &result)
	return result, err
}

// handleIncidentEvidence handles GET /api/v2/incidents/{id}/evidence
func (ws *WebServer) handleIncidentEvidence(w http.ResponseWriter, r *http.Request, incidentID string) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Get incident from v2 manager only (production-ready, no fallbacks)
	incident := ws.getIncidentByID(incidentID)

	if incident == nil {
		http.Error(w, "Incident not found", http.StatusNotFound)
		return
	}

	// Check cache for evidence pack
	evidencePack := ws.incidentCache.GetEvidencePack(incidentID)
	if evidencePack == nil {
		// Build evidence pack
		evidenceBuilder := incidents.NewEvidencePackBuilder()
		evidencePack = evidenceBuilder.BuildFromIncident(incident)

		// If EvidencePack is empty (no signals), create basic evidence from incident data
		if len(evidencePack.Events) == 0 && len(evidencePack.Logs) == 0 && len(evidencePack.StatusFacts) == 0 {
			// Create basic evidence from incident metadata
			evidencePack.Events = []incidents.EvidenceItem{
				{
					ID:        fmt.Sprintf("incident-%s-event", incident.ID),
					Source:    incidents.EvidenceSourceEvent,
					Type:      string(incident.Pattern),
					Timestamp: incident.LastSeen,
					Content:   incident.Description,
					Summary:   fmt.Sprintf("%s detected on %s", incident.Pattern, incident.Resource.Name),
					Resource:  &incident.Resource,
					Relevance: 1.0,
				},
			}

			// For Pod incidents, try to fetch actual logs
			if incident.Resource.Kind == "Pod" && ws.app.clientset != nil {
				podLogs := ws.fetchPodLogsForIncident(incident)
				if len(podLogs) > 0 {
					evidencePack.Logs = podLogs
				}
			}
			evidencePack.StatusFacts = []incidents.EvidenceItem{
				{
					ID:        fmt.Sprintf("incident-%s-severity", incident.ID),
					Source:    incidents.EvidenceSourceStatus,
					Type:      "Severity",
					Timestamp: incident.LastSeen,
					Content:   string(incident.Severity),
					Summary:   fmt.Sprintf("Severity: %s", incident.Severity),
					Relevance: 1.0,
				},
				{
					ID:        fmt.Sprintf("incident-%s-occurrences", incident.ID),
					Source:    incidents.EvidenceSourceStatus,
					Type:      "Occurrences",
					Timestamp: incident.LastSeen,
					Content:   fmt.Sprintf("%d", incident.Occurrences),
					Summary:   fmt.Sprintf("Occurrences: %d", incident.Occurrences),
					Relevance: 1.0,
				},
			}
			if incident.Diagnosis != nil {
				evidencePack.StatusFacts = append(evidencePack.StatusFacts, incidents.EvidenceItem{
					ID:        fmt.Sprintf("incident-%s-diagnosis", incident.ID),
					Source:    incidents.EvidenceSourceStatus,
					Type:      "Diagnosis",
					Timestamp: incident.Diagnosis.GeneratedAt,
					Content:   incident.Diagnosis.Summary,
					Summary:   incident.Diagnosis.Summary,
					Relevance: incident.Diagnosis.Confidence,
				})
			}
		}
		// Cache it (after fallback logic)
		ws.incidentCache.SetEvidencePack(incidentID, evidencePack)
	}

	// Convert EvidencePack to the format expected by frontend
	evidence := map[string]interface{}{
		"events":        convertEvidenceItems(evidencePack.Events),
		"logs":          convertEvidenceItems(evidencePack.Logs),
		"statusFacts":   convertEvidenceItems(evidencePack.StatusFacts),
		"metricsFacts":  convertEvidenceItems(evidencePack.MetricsFacts),
		"changeHistory": convertEvidenceItems(evidencePack.ChangeHistory),
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(evidence)
}

// fetchPodLogsForIncident fetches recent pod logs for a pod incident
func (ws *WebServer) fetchPodLogsForIncident(incident *incidents.Incident) []incidents.EvidenceItem {
	if ws.app.clientset == nil || incident.Resource.Kind != "Pod" {
		return nil
	}

	ctx := ws.app.ctx
	namespace := incident.Resource.Namespace
	podName := incident.Resource.Name
	
	// Clean pod name - remove any container suffix (e.g., "pod-name/container" -> "pod-name")
	if idx := strings.LastIndex(podName, "/"); idx != -1 {
		podName = podName[:idx]
	}

	// Get the pod to find container names
	pod, err := ws.app.clientset.CoreV1().Pods(namespace).Get(ctx, podName, metav1.GetOptions{})
	if err != nil {
		log.Printf("[Evidence] Failed to get pod %s/%s: %v", namespace, podName, err)
		return nil
	}

	var logItems []incidents.EvidenceItem

	// Fetch logs from each container
	for _, container := range pod.Spec.Containers {
		containerName := container.Name
		tailLines := int64(50) // Get last 50 lines

		opts := &corev1.PodLogOptions{
			Container:  containerName,
			TailLines:  &tailLines,
			Timestamps: true,
		}

		req := ws.app.clientset.CoreV1().Pods(namespace).GetLogs(podName, opts)
		logStream, err := req.Stream(ctx)
		if err != nil {
			log.Printf("[Evidence] Failed to get logs for pod %s/%s container %s: %v", namespace, podName, containerName, err)
			continue
		}

		buf := new(bytes.Buffer)
		_, err = io.Copy(buf, logStream)
		logStream.Close()
		if err != nil {
			log.Printf("[Evidence] Failed to read logs for pod %s/%s container %s: %v", namespace, podName, containerName, err)
			continue
		}

		logContent := buf.String()
		if logContent != "" {
			// Split into lines and create evidence items
			lines := strings.Split(logContent, "\n")
			for i, line := range lines {
				if strings.TrimSpace(line) == "" {
					continue
				}
				if i >= 20 { // Limit to 20 log lines per container
					break
				}

				// Try to parse timestamp from log line (format: "2024-01-01T12:00:00.000000000Z message")
				timestamp := incident.LastSeen
				parts := strings.SplitN(line, " ", 2)
				if len(parts) == 2 {
					if parsedTime, err := time.Parse(time.RFC3339Nano, parts[0]); err == nil {
						timestamp = parsedTime
					}
				}

				logItems = append(logItems, incidents.EvidenceItem{
					ID:        fmt.Sprintf("log-%s-%s-%d", podName, containerName, i),
					Source:    incidents.EvidenceSourceLog,
					Type:      "PodLog",
					Timestamp: timestamp,
					Content:   line,
					Summary:   fmt.Sprintf("Log from %s: %s", containerName, truncateString(line, 100)),
					Resource:  &incident.Resource,
					Relevance: 0.8,
					Severity:  "info",
				})
			}
		}
	}

	return logItems
}

// truncateString truncates a string to maxLen characters
func truncateString(s string, maxLen int) string {
	if len(s) <= maxLen {
		return s
	}
	return s[:maxLen] + "..."
}

// convertEvidenceItems converts EvidenceItem slice to frontend format
func convertEvidenceItems(items []incidents.EvidenceItem) []map[string]interface{} {
	result := make([]map[string]interface{}, 0, len(items))
	for _, item := range items {
		result = append(result, map[string]interface{}{
			"type":    item.Type,
			"key":     item.ID,
			"value":   item.Content,
			"message": item.Summary,
			"reason":  item.Summary,
			"time":    item.Timestamp.Format(time.RFC3339),
		})
	}
	return result
}

// handleIncidentCitations handles GET /api/v2/incidents/{id}/citations
func (ws *WebServer) handleIncidentCitations(w http.ResponseWriter, r *http.Request, incidentID string) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Get incident from v2 manager only (production-ready, no fallbacks)
	incident := ws.getIncidentByID(incidentID)

	if incident == nil {
		http.Error(w, "Incident not found", http.StatusNotFound)
		return
	}

	// Check cache for citations
	result := ws.incidentCache.GetCitations(incidentID)
	if result == nil {
		// Build citations
		evidenceBuilder := incidents.NewEvidencePackBuilder()
		evidencePack := evidenceBuilder.BuildFromIncident(incident)

		// If evidence pack is empty, create basic one for citations
		if len(evidencePack.Events) == 0 && len(evidencePack.Logs) == 0 && len(evidencePack.StatusFacts) == 0 {
			evidencePack.Events = []incidents.EvidenceItem{
				{
					ID:        fmt.Sprintf("incident-%s-event", incident.ID),
					Source:    incidents.EvidenceSourceEvent,
					Type:      string(incident.Pattern),
					Timestamp: incident.LastSeen,
					Content:   incident.Description,
					Summary:   fmt.Sprintf("%s detected on %s", incident.Pattern, incident.Resource.Name),
					Resource:  &incident.Resource,
					Relevance: 1.0,
				},
			}
		}

		citationBuilder := incidents.NewCitationBuilder()
		citations := citationBuilder.BuildFromEvidencePack(evidencePack, 20)

		// Add documentation citations for the pattern (always add these)
		docCitations := incidents.GetDocCitationsForPattern(incident.Pattern)
		citations = append(citations, docCitations...)

		// Convert to frontend format
		result = make([]map[string]interface{}, 0, len(citations))
		for _, cit := range citations {
			result = append(result, map[string]interface{}{
				"source": string(cit.Source),
				"ref":    cit.Ref,
				"title":  cit.Title,
				"quote":  cit.Excerpt,
			})
		}

		// Cache it
		ws.incidentCache.SetCitations(incidentID, result)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}

// handleIncidentSimilar handles GET /api/v2/incidents/{id}/similar
func (ws *WebServer) handleIncidentSimilar(w http.ResponseWriter, r *http.Request, incidentID string) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Check capabilities - similar incidents must be enabled
	if !capabilities.IsSimilarIncidentsEnabled() {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"similar": []interface{}{},
		})
		return
	}

	// Find the incident
	var incident *incidents.Incident
	incident = ws.incidentCache.GetV2Incident(incidentID)
	if incident == nil && ws.app.incidentIntelligence != nil {
		incident = ws.app.incidentIntelligence.GetManager().GetIncident(incidentID)
		if incident != nil {
			ws.incidentCache.SetV2Incident(incidentID, incident)
		}
	}
	
	// No fallback - v2 manager only (production-ready)
	
	if incident == nil {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode([]map[string]interface{}{})
		return
	}

	// Find similar incidents by pattern and namespace from v2 manager only
	similar := make([]map[string]interface{}, 0)
	
	if ws.app.incidentIntelligence != nil {
		manager := ws.app.incidentIntelligence.GetManager()
		// Get all incidents filtered by same pattern and namespace
		filter := incidents.IncidentFilter{
			Pattern:  incident.Pattern,
			Namespace: incident.Resource.Namespace,
		}
		allIncidents := manager.FilterIncidents(filter)
		
		for _, otherInc := range allIncidents {
			if otherInc.ID == incidentID {
			continue
		}
			similar = append(similar, map[string]interface{}{
				"id":          otherInc.ID,
				"pattern":     string(otherInc.Pattern),
				"severity":    string(otherInc.Severity),
				"resource":    otherInc.Resource,
				"occurrences": otherInc.Occurrences,
				"firstSeen":   otherInc.FirstSeen.Format(time.RFC3339),
				"lastSeen":    otherInc.LastSeen.Format(time.RFC3339),
				"title":       otherInc.Title,
			})
			// Limit to 10 similar incidents
			if len(similar) >= 10 {
				break
			}
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(similar)
}

// handleIncidentFeedback handles POST /api/v2/incidents/{id}/feedback
func (ws *WebServer) handleIncidentFeedback(w http.ResponseWriter, r *http.Request, incidentID string) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		Type    string `json:"type"`
		Content string `json:"content"`
		FixID   string `json:"fixId"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	log.Printf("Incident feedback received: incident=%s, type=%s, content=%s, fixId=%s",
		incidentID, req.Type, req.Content, req.FixID)

	// Handle special feedback types
	switch req.Type {
	case "resolved":
		if ws.app.incidentIntelligence != nil {
			ws.app.incidentIntelligence.GetManager().ResolveIncident(incidentID, req.Content)
		}
	case "dismiss":
		if ws.app.incidentIntelligence != nil {
			ws.app.incidentIntelligence.GetManager().SuppressIncident(incidentID, req.Content)
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": "Feedback recorded successfully",
	})
}
