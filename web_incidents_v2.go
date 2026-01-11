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

// scanAndIngestIncidents scans Kubernetes resources and ingests findings as signals into v2 manager
func (ii *IncidentIntelligence) scanAndIngestIncidents(ctx context.Context) {
	if ii.app.clientset == nil || !ii.app.connected {
		log.Printf("[scanAndIngestIncidents] Skipping scan - clientset or connection not available")
		return
	}

	// CRITICAL: Ensure manager's cluster context matches the current active cluster context
	// This prevents incidents from being tagged with the wrong cluster context
	currentContext := ii.app.GetCurrentContext()
	if currentContext != "" {
		currentManagerContext := ii.manager.GetClusterContext()
		if currentManagerContext != currentContext {
			log.Printf("[scanAndIngestIncidents] Syncing manager cluster context from '%s' to '%s'", currentManagerContext, currentContext)
			ii.manager.SetClusterContext(currentContext)
		}
	}

	// Scan pods and ingest as signals
	pods, err := ii.app.clientset.CoreV1().Pods("").List(ctx, metav1.ListOptions{Limit: 2000})
	if err != nil {
		log.Printf("[scanAndIngestIncidents] Error listing pods: %v", err)
		return
	}
	
	log.Printf("[scanAndIngestIncidents] Scanning %d pods for incidents", len(pods.Items))
	signalCount := 0

	for _, pod := range pods.Items {
		// Skip system namespaces
		if pod.Namespace == "kube-system" || pod.Namespace == "kube-public" || pod.Namespace == "kube-node-lease" {
			continue
		}

		// Extract owner information from pod
		var ownerKind, ownerName string
		if len(pod.OwnerReferences) > 0 {
			owner := pod.OwnerReferences[0]
			ownerKind = owner.Kind
			ownerName = owner.Name
			
			// Handle ReplicaSet - need to find the Deployment/StatefulSet that owns it
			if ownerKind == "ReplicaSet" {
				rs, err := ii.app.clientset.AppsV1().ReplicaSets(pod.Namespace).Get(ctx, ownerName, metav1.GetOptions{})
				if err == nil && len(rs.OwnerReferences) > 0 {
					rsOwner := rs.OwnerReferences[0]
					ownerKind = rsOwner.Kind
					ownerName = rsOwner.Name
				}
			}
		}

		// Check each container status and ingest signals
		for _, containerStatus := range pod.Status.ContainerStatuses {
			// Ingest pod status signals
			var exitCode int
			var terminatedAt *time.Time
			containerState := "unknown"
			containerReason := ""
			
			if containerStatus.State.Terminated != nil {
				containerState = "terminated"
				containerReason = containerStatus.State.Terminated.Reason
				exitCode = int(containerStatus.State.Terminated.ExitCode)
				termTime := containerStatus.State.Terminated.FinishedAt.Time
				terminatedAt = &termTime
			} else if containerStatus.State.Waiting != nil {
				containerState = "waiting"
				containerReason = containerStatus.State.Waiting.Reason
			} else if containerStatus.State.Running != nil {
				containerState = "running"
			}

			// Ingest pod status (this creates a signal)
			ii.manager.IngestPodStatus(
				pod.Name,
				pod.Namespace,
				string(pod.Status.Phase),
				containerStatus.Name,
				containerState,
				containerReason,
				exitCode,
				containerStatus.RestartCount,
				terminatedAt,
			)
			
			// Note: Owner information will be extracted from pod metadata when creating incidents
			// The aggregator will need to look up owner information from the pod when creating incidents
			signalCount++
			
			// Log potential incidents
			if containerReason == "OOMKilled" || containerReason == "CrashLoopBackOff" || 
			   exitCode == 137 || containerStatus.RestartCount > 5 {
				log.Printf("[scanAndIngestIncidents] Potential incident detected: pod=%s/%s, reason=%s, exitCode=%d, restarts=%d",
					pod.Namespace, pod.Name, containerReason, exitCode, containerStatus.RestartCount)
		}
	}
	}
	
	log.Printf("[scanAndIngestIncidents] Ingested %d signals from pods", signalCount)

	// Scan nodes for pressure conditions and NotReady status
	nodes, err := ii.app.clientset.CoreV1().Nodes().List(ctx, metav1.ListOptions{Limit: 1000})
	if err == nil {
		for _, node := range nodes.Items {
			// Check for pressure conditions
			for _, condition := range node.Status.Conditions {
				if (condition.Type == corev1.NodeDiskPressure || 
					condition.Type == corev1.NodeMemoryPressure || 
					condition.Type == corev1.NodePIDPressure) && 
					condition.Status == corev1.ConditionTrue {
					
					// Create a signal for node pressure
					resource := incidents.KubeResourceRef{
						Kind:      "Node",
						Name:      node.Name,
						Namespace: "",
					}
					
					message := fmt.Sprintf("Node %s has %s condition", node.Name, condition.Type)
					signal := incidents.NewNormalizedSignal(incidents.SourceKubeEvent, resource, message)
					signal.Timestamp = condition.LastTransitionTime.Time
					signal.SetAttribute(incidents.AttrSeverity, "critical")
					signal.SetAttribute("condition_type", string(condition.Type))
					signal.SetAttribute("condition_status", string(condition.Status))
					
					ii.manager.IngestSignal(signal)
				}
				
				// Check for NotReady nodes
				if condition.Type == corev1.NodeReady && condition.Status == corev1.ConditionFalse {
					resource := incidents.KubeResourceRef{
						Kind:      "Node",
						Name:      node.Name,
						Namespace: "",
					}
					
					message := fmt.Sprintf("Node %s is not ready: %s", node.Name, condition.Reason)
					signal := incidents.NewNormalizedSignal(incidents.SourceKubeEvent, resource, message)
					signal.Timestamp = condition.LastTransitionTime.Time
					signal.SetAttribute(incidents.AttrSeverity, "critical")
					signal.SetAttribute("condition_type", string(condition.Type))
					signal.SetAttribute("reason", condition.Reason)
					
					ii.manager.IngestSignal(signal)
				}
			}
		}
	}

	// Scan jobs for failures
	jobs, err := ii.app.clientset.BatchV1().Jobs("").List(ctx, metav1.ListOptions{Limit: 1000})
	if err == nil {
		for _, job := range jobs.Items {
			if job.Status.Failed > 0 {
				resource := incidents.KubeResourceRef{
					Kind:      "Job",
					Name:      job.Name,
					Namespace: job.Namespace,
				}
				
				message := fmt.Sprintf("Job %s has %d failed pods", job.Name, job.Status.Failed)
				signal := incidents.NewNormalizedSignal(incidents.SourceKubeEvent, resource, message)
				signal.Timestamp = time.Now()
				signal.SetAttribute(incidents.AttrSeverity, "high")
				signal.SetAttribute("failed_pods", fmt.Sprintf("%d", job.Status.Failed))
				
				ii.manager.IngestSignal(signal)
			}
		}
	}

	// Scan services for no endpoints
	services, err := ii.app.clientset.CoreV1().Services("").List(ctx, metav1.ListOptions{Limit: 1000})
	if err == nil {
		for _, svc := range services.Items {
			// Skip system namespaces
			if svc.Namespace == "kube-system" || svc.Namespace == "kube-public" || svc.Namespace == "kube-node-lease" {
				continue
			}
			
			endpoints, err := ii.app.clientset.CoreV1().Endpoints(svc.Namespace).Get(ctx, svc.Name, metav1.GetOptions{})
			if err == nil {
				hasReadyEndpoints := false
				for _, subset := range endpoints.Subsets {
					if len(subset.Addresses) > 0 {
						hasReadyEndpoints = true
						break
					}
				}
				
				if !hasReadyEndpoints && svc.Spec.Type != corev1.ServiceTypeExternalName {
					resource := incidents.KubeResourceRef{
						Kind:      "Service",
						Name:      svc.Name,
						Namespace: svc.Namespace,
					}
					
					message := fmt.Sprintf("Service %s/%s has no ready endpoints", svc.Namespace, svc.Name)
					signal := incidents.NewNormalizedSignal(incidents.SourceKubeEvent, resource, message)
					signal.Timestamp = time.Now()
					signal.SetAttribute(incidents.AttrSeverity, "warning")
					signal.SetAttribute("service_type", string(svc.Spec.Type))
					
					ii.manager.IngestSignal(signal)
				}
			}
		}
	}

	// Scan persistent volume claims for pending state
	pvcs, err := ii.app.clientset.CoreV1().PersistentVolumeClaims("").List(ctx, metav1.ListOptions{Limit: 1000})
	if err == nil {
		for _, pvc := range pvcs.Items {
			// Skip system namespaces
			if pvc.Namespace == "kube-system" || pvc.Namespace == "kube-public" || pvc.Namespace == "kube-node-lease" {
				continue
			}
			
			if pvc.Status.Phase == corev1.ClaimPending {
				resource := incidents.KubeResourceRef{
					Kind:      "PersistentVolumeClaim",
					Name:      pvc.Name,
					Namespace: pvc.Namespace,
				}
				
				message := fmt.Sprintf("PVC %s/%s is pending", pvc.Namespace, pvc.Name)
				signal := incidents.NewNormalizedSignal(incidents.SourceKubeEvent, resource, message)
				signal.Timestamp = time.Now()
				signal.SetAttribute(incidents.AttrSeverity, "warning")
				signal.SetAttribute("pvc_phase", string(pvc.Status.Phase))
				
				ii.manager.IngestSignal(signal)
			}
		}
	}

	// Scan deployments for unhealthy replicas
	deployments, err := ii.app.clientset.AppsV1().Deployments("").List(ctx, metav1.ListOptions{Limit: 1000})
	if err == nil {
		for _, deploy := range deployments.Items {
			// Skip system namespaces
			if deploy.Namespace == "kube-system" || deploy.Namespace == "kube-public" || deploy.Namespace == "kube-node-lease" {
				continue
			}
			
			desiredReplicas := int32(1)
			if deploy.Spec.Replicas != nil {
				desiredReplicas = *deploy.Spec.Replicas
			}
			
			readyReplicas := deploy.Status.ReadyReplicas
			availableReplicas := deploy.Status.AvailableReplicas
			
			// Check for deployments with no ready replicas when they should have some
			if desiredReplicas > 0 && readyReplicas == 0 {
				resource := incidents.KubeResourceRef{
					Kind:      "Deployment",
					Name:      deploy.Name,
					Namespace: deploy.Namespace,
				}
				
				message := fmt.Sprintf("Deployment %s/%s has 0 ready replicas out of %d desired", deploy.Namespace, deploy.Name, desiredReplicas)
				signal := incidents.NewNormalizedSignal(incidents.SourceKubeEvent, resource, message)
				signal.Timestamp = time.Now()
				signal.SetAttribute(incidents.AttrSeverity, "critical")
				signal.SetAttribute("desired_replicas", fmt.Sprintf("%d", desiredReplicas))
				signal.SetAttribute("ready_replicas", fmt.Sprintf("%d", readyReplicas))
				
				ii.manager.IngestSignal(signal)
			} else if desiredReplicas > 0 && availableReplicas < desiredReplicas {
				// Check for deployments with some but not all replicas available
				resource := incidents.KubeResourceRef{
					Kind:      "Deployment",
					Name:      deploy.Name,
					Namespace: deploy.Namespace,
				}
				
				message := fmt.Sprintf("Deployment %s/%s has %d/%d available replicas", deploy.Namespace, deploy.Name, availableReplicas, desiredReplicas)
				signal := incidents.NewNormalizedSignal(incidents.SourceKubeEvent, resource, message)
				signal.Timestamp = time.Now()
				signal.SetAttribute(incidents.AttrSeverity, "warning")
				signal.SetAttribute("desired_replicas", fmt.Sprintf("%d", desiredReplicas))
				signal.SetAttribute("available_replicas", fmt.Sprintf("%d", availableReplicas))
				
				ii.manager.IngestSignal(signal)
			}
		}
	}

	// Scan pods for image pull errors and unschedulable state
	for _, pod := range pods.Items {
		if pod.Namespace == "kube-system" || pod.Namespace == "kube-public" || pod.Namespace == "kube-node-lease" {
			continue
		}
		
		// Check for unschedulable pods (stuck in Pending state)
		if pod.Status.Phase == corev1.PodPending {
			unschedulable := false
			schedulingReason := ""
			for _, condition := range pod.Status.Conditions {
				if condition.Type == corev1.PodScheduled && condition.Status == corev1.ConditionFalse {
					unschedulable = true
					schedulingReason = condition.Reason
					if condition.Message != "" {
						schedulingReason = condition.Message
					}
					break
				}
			}
			
			// Only report if pod has been pending for more than 30 seconds
			if unschedulable && time.Since(pod.CreationTimestamp.Time) > 30*time.Second {
				resource := incidents.KubeResourceRef{
					Kind:      "Pod",
					Name:      pod.Name,
					Namespace: pod.Namespace,
				}
				
				message := fmt.Sprintf("Pod %s/%s is unschedulable: %s", pod.Namespace, pod.Name, schedulingReason)
				signal := incidents.NewNormalizedSignal(incidents.SourceKubeEvent, resource, message)
				signal.Timestamp = time.Now()
				signal.SetAttribute(incidents.AttrSeverity, "high")
				signal.SetAttribute("scheduling_reason", schedulingReason)
				signal.SetAttribute("pod_phase", string(pod.Status.Phase))
				
				ii.manager.IngestSignal(signal)
			}
		}
		
		// Check for image pull errors
		for _, containerStatus := range pod.Status.ContainerStatuses {
			if containerStatus.State.Waiting != nil {
				reason := containerStatus.State.Waiting.Reason
				if reason == "ErrImagePull" || reason == "ImagePullBackOff" {
					resource := incidents.KubeResourceRef{
						Kind:      "Pod",
						Name:      pod.Name,
						Namespace: pod.Namespace,
					}
					
					message := fmt.Sprintf("Pod %s/%s container %s: %s", pod.Namespace, pod.Name, containerStatus.Name, reason)
					signal := incidents.NewNormalizedSignal(incidents.SourceKubeEvent, resource, message)
					signal.Timestamp = time.Now()
					signal.SetAttribute(incidents.AttrSeverity, "high")
					signal.SetAttribute("container", containerStatus.Name)
					signal.SetAttribute("reason", reason)
					
					ii.manager.IngestSignal(signal)
				}
			}
		}
	}
	
	// Scan for ConfigMap/Secret mount failures
	for _, pod := range pods.Items {
		if pod.Namespace == "kube-system" || pod.Namespace == "kube-public" || pod.Namespace == "kube-node-lease" {
			continue
		}
		
		for _, containerStatus := range pod.Status.ContainerStatuses {
			if containerStatus.State.Waiting != nil {
				reason := containerStatus.State.Waiting.Reason
				message := containerStatus.State.Waiting.Message
				
				// Check for mount-related errors
				if strings.Contains(message, "secret") || strings.Contains(message, "configmap") || 
				   strings.Contains(message, "volume") || strings.Contains(message, "mount") {
					resource := incidents.KubeResourceRef{
						Kind:      "Pod",
						Name:      pod.Name,
						Namespace: pod.Namespace,
					}
					
					msg := fmt.Sprintf("Pod %s/%s container %s mount error: %s", pod.Namespace, pod.Name, containerStatus.Name, reason)
					signal := incidents.NewNormalizedSignal(incidents.SourceKubeEvent, resource, msg)
					signal.Timestamp = time.Now()
					signal.SetAttribute(incidents.AttrSeverity, "medium")
					signal.SetAttribute("container", containerStatus.Name)
					signal.SetAttribute("reason", reason)
					
					ii.manager.IngestSignal(signal)
				}
			}
		}
	}
}

// Stop stops the incident intelligence system.
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
	}

	// Note: Routes are registered in web_server.go using the handler methods below
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

	// Format response
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"incidents": incidentList,
		"total":     len(incidentList),
		"summary":   summary,
	})
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
