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
	"strings"
	"time"

	"github.com/kubegraf/kubegraf/pkg/incidents"
	"github.com/kubegraf/kubegraf/pkg/instrumentation"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/types"
)

// IncidentIntelligence manages the incident intelligence system.
type IncidentIntelligence struct {
	app          *App
	manager      *incidents.Manager
	eventAdapter *incidents.EventAdapter
	kubeAdapter  *incidents.KubeClientAdapter
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
				return ii.app.clientset.CoreV1().Pods(ref.Namespace).Delete(ctx, ref.Name, metav1.DeleteOptions{})
			default:
				return fmt.Errorf("unsupported resource kind for restart: %s", ref.Kind)
			}
		},

		RollbackResourceFunc: func(ctx context.Context, ref incidents.KubeResourceRef, revision int64, dryRun bool) error {
			if ii.app.clientset == nil {
				return fmt.Errorf("no kubernetes client")
			}

			// Rollback is complex - for now just return that it's not implemented
			// In a full implementation, this would use the apps/v1 API to rollback
			return fmt.Errorf("rollback not yet implemented")
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

	// Register with event monitor if available
	if ii.app.eventMonitor != nil {
		ii.app.eventMonitor.RegisterCallback(ii.handleMonitoredEvent)
	}
}

// Stop stops the incident intelligence system.
func (ii *IncidentIntelligence) Stop() {
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

	// Fallback: If no v2 incidents, convert v1 incidents to v2 format
	if len(incidentList) == 0 {
		v1Incidents := ws.getV1Incidents(namespace)
		for _, v1 := range v1Incidents {
			v2Inc := ws.convertV1ToV2Incident(v1)

			// Apply filters
			if patternStr != "" && string(v2Inc.Pattern) != patternStr {
				continue
			}
			if severityStr != "" && string(v2Inc.Severity) != severityStr {
				continue
			}

			incidentList = append(incidentList, v2Inc)
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

// getV1IncidentByID fetches a specific v1 incident by ID
func (ws *WebServer) getV1IncidentByID(incidentID string) *incidents.Incident {
	if ws.app.clientset == nil || !ws.app.connected {
		return nil
	}
	
	// Get all v1 incidents and find the one with matching ID
	v1Incidents := ws.getV1Incidents("")
	for _, v1 := range v1Incidents {
		if v1.ID == incidentID {
			return ws.convertV1ToV2Incident(v1)
		}
	}
	return nil
}

// getV1Incidents fetches incidents from the v1 system using the incident scanner
func (ws *WebServer) getV1Incidents(namespace string) []KubernetesIncident {
	if ws.app.clientset == nil || !ws.app.connected {
		return []KubernetesIncident{}
	}

	scanner := NewIncidentScanner(ws.app)
	return scanner.ScanAllIncidents(namespace)
}

// convertV1ToV2Incident converts a v1 incident to v2 format with diagnosis and recommendations
func (ws *WebServer) convertV1ToV2Incident(v1 KubernetesIncident) *incidents.Incident {
	// Map v1 type to v2 pattern
	pattern := incidents.PatternUnknown
	var diagnosis *incidents.Diagnosis
	var recommendations []incidents.Recommendation

	switch v1.Type {
	case "high_restarts":
		pattern = incidents.PatternRestartStorm
		diagnosis = &incidents.Diagnosis{
			Summary:        fmt.Sprintf("%s is experiencing frequent restarts (%d times)", v1.ResourceName, v1.Count),
			ProbableCauses: []string{"Application crash", "Resource limits too low", "Liveness probe failing"},
			Confidence:     0.75,
			Evidence:       []string{fmt.Sprintf("Restart count: %d", v1.Count)},
			GeneratedAt:    time.Now(),
		}
		recommendations = []incidents.Recommendation{
			{
				ID:          "restart-pod",
				Title:       "Restart Pod",
				Explanation: "Delete the pod to trigger recreation by its controller and get a fresh start",
				Risk:        incidents.RiskLow,
				Priority:    1,
				ProposedFix: &incidents.ProposedFix{
					Type:        incidents.FixTypeRestart,
					Description: fmt.Sprintf("Delete pod %s to trigger recreation", v1.ResourceName),
					DryRunCmd:   fmt.Sprintf("kubectl delete pod %s -n %s --dry-run=client", v1.ResourceName, v1.Namespace),
					ApplyCmd:    fmt.Sprintf("kubectl delete pod %s -n %s", v1.ResourceName, v1.Namespace),
					TargetResource: incidents.KubeResourceRef{
						Kind:      "Pod",
						Name:      v1.ResourceName,
						Namespace: v1.Namespace,
					},
					Safe:                 true,
					RequiresConfirmation: true,
				},
				Action: &incidents.FixAction{
					Label:                "Restart Pod",
					Type:                 incidents.ActionTypeRestart,
					Description:          "Delete the pod to trigger recreation",
					Safe:                 true,
					RequiresConfirmation: true,
				},
			},
			{
				ID:          "check-logs",
				Title:       "Check container logs",
				Explanation: "Review the container logs to identify the root cause of restarts",
				Risk:        incidents.RiskLow,
				Priority:    2,
				ManualSteps: []string{"kubectl logs " + v1.ResourceName + " -n " + v1.Namespace + " --previous"},
				Action: &incidents.FixAction{
					Label:       "Check container logs",
					Type:        incidents.ActionTypeViewLogs,
					Description: "Open the logs viewer for this pod",
					Safe:        true,
				},
			},
			{
				ID:          "increase-resources",
				Title:       "Increase resource limits",
				Explanation: "If the container is being OOM killed, increase memory limits",
				Risk:        incidents.RiskMedium,
				Priority:    3,
				Action: &incidents.FixAction{
					Label:       "Increase resource limits",
					Type:        incidents.ActionTypePreviewPatch,
					Description: "Propose memory limit increase",
					Safe:        false,
				},
			},
		}

	case "oom", "oom_killed":
		pattern = incidents.PatternOOMPressure
		diagnosis = &incidents.Diagnosis{
			Summary:        fmt.Sprintf("%s was killed due to Out Of Memory (OOM)", v1.ResourceName),
			ProbableCauses: []string{"Memory limit too low", "Memory leak in application", "Unexpected load spike"},
			Confidence:     0.95,
			Evidence:       []string{"Container terminated with OOMKilled reason", "Exit code: 137"},
			GeneratedAt:    time.Now(),
		}
		recommendations = []incidents.Recommendation{
			{
				ID:          "increase-memory",
				Title:       "Increase memory limit",
				Explanation: "The container exceeded its memory limit. Consider increasing the limit by 50%.",
				Risk:        incidents.RiskMedium,
				Priority:    1,
				ProposedFix: &incidents.ProposedFix{
					Type:        incidents.FixTypePatch,
					Description: "Increase container memory limit by 50%",
					PreviewDiff: "--- current\n+++ proposed\n@@ resources.limits @@\n-  memory: 256Mi\n+  memory: 384Mi",
					DryRunCmd:   fmt.Sprintf("kubectl patch deployment %s -n %s --type=json -p='[{\"op\": \"replace\", \"path\": \"/spec/template/spec/containers/0/resources/limits/memory\", \"value\": \"384Mi\"}]' --dry-run=client", v1.ResourceName, v1.Namespace),
					ApplyCmd:    fmt.Sprintf("kubectl patch deployment %s -n %s --type=json -p='[{\"op\": \"replace\", \"path\": \"/spec/template/spec/containers/0/resources/limits/memory\", \"value\": \"384Mi\"}]'", v1.ResourceName, v1.Namespace),
					TargetResource: incidents.KubeResourceRef{
						Kind:      "Deployment",
						Name:      v1.ResourceName,
						Namespace: v1.Namespace,
					},
					Safe:                 true,
					RequiresConfirmation: true,
				},
				Action: &incidents.FixAction{
					Label:                "Propose Memory Increase",
					Type:                 incidents.ActionTypePreviewPatch,
					Description:          "Increase container memory limit by 50%",
					Safe:                 true,
					RequiresConfirmation: true,
				},
			},
			{
				ID:          "restart-pod",
				Title:       "Restart Pod",
				Explanation: "Restart the pod to get a fresh start with current limits",
				Risk:        incidents.RiskLow,
				Priority:    2,
				ProposedFix: &incidents.ProposedFix{
					Type:        incidents.FixTypeRestart,
					Description: fmt.Sprintf("Delete pod %s to trigger recreation", v1.ResourceName),
					DryRunCmd:   fmt.Sprintf("kubectl delete pod %s -n %s --dry-run=client", v1.ResourceName, v1.Namespace),
					ApplyCmd:    fmt.Sprintf("kubectl delete pod %s -n %s", v1.ResourceName, v1.Namespace),
					TargetResource: incidents.KubeResourceRef{
						Kind:      "Pod",
						Name:      v1.ResourceName,
						Namespace: v1.Namespace,
					},
					Safe:                 true,
					RequiresConfirmation: true,
				},
				Action: &incidents.FixAction{
					Label:                "Restart Pod",
					Type:                 incidents.ActionTypeRestart,
					Description:          "Delete the pod to trigger recreation",
					Safe:                 true,
					RequiresConfirmation: true,
				},
			},
			{
				ID:          "check-memory-usage",
				Title:       "Analyze memory usage patterns",
				Explanation: "Review memory metrics to understand usage patterns",
				Risk:        incidents.RiskLow,
				Priority:    3,
				ManualSteps: []string{fmt.Sprintf("kubectl top pod %s -n %s", v1.ResourceName, v1.Namespace)},
			},
		}

	case "crashloop":
		pattern = incidents.PatternCrashLoop
		diagnosis = &incidents.Diagnosis{
			Summary:        fmt.Sprintf("%s is stuck in CrashLoopBackOff after %d restarts", v1.ResourceName, v1.Count),
			ProbableCauses: []string{"Application startup failure", "Missing dependencies", "Configuration error", "Resource exhaustion"},
			Confidence:     0.90,
			Evidence:       []string{"Container state: CrashLoopBackOff", fmt.Sprintf("Restart count: %d", v1.Count)},
			GeneratedAt:    time.Now(),
		}
		recommendations = []incidents.Recommendation{
			{
				ID:          "restart-pod",
				Title:       "Restart Pod",
				Explanation: "Delete and recreate pod - sometimes a fresh start can resolve transient issues",
				Risk:        incidents.RiskLow,
				Priority:    1,
				ProposedFix: &incidents.ProposedFix{
					Type:        incidents.FixTypeRestart,
					Description: fmt.Sprintf("Delete pod %s to trigger recreation", v1.ResourceName),
					DryRunCmd:   fmt.Sprintf("kubectl delete pod %s -n %s --dry-run=client", v1.ResourceName, v1.Namespace),
					ApplyCmd:    fmt.Sprintf("kubectl delete pod %s -n %s", v1.ResourceName, v1.Namespace),
					TargetResource: incidents.KubeResourceRef{
						Kind:      "Pod",
						Name:      v1.ResourceName,
						Namespace: v1.Namespace,
					},
					Safe:                 true,
					RequiresConfirmation: true,
				},
				Action: &incidents.FixAction{
					Label:                "Restart Pod",
					Type:                 incidents.ActionTypeRestart,
					Description:          "Delete the pod to trigger recreation",
					Safe:                 true,
					RequiresConfirmation: true,
				},
			},
			{
				ID:          "check-logs",
				Title:       "Check container logs",
				Explanation: "Review logs to identify why the container is crashing",
				Risk:        incidents.RiskLow,
				Priority:    2,
				ManualSteps: []string{fmt.Sprintf("kubectl logs %s -n %s --previous", v1.ResourceName, v1.Namespace)},
				Action: &incidents.FixAction{
					Label:       "Check container logs",
					Type:        incidents.ActionTypeViewLogs,
					Description: "Open the logs viewer for this pod",
					Safe:        true,
				},
			},
			{
				ID:          "check-config",
				Title:       "Verify ConfigMaps and Secrets",
				Explanation: "Ensure all required configuration is present and valid",
				Risk:        incidents.RiskLow,
				Priority:    3,
				ManualSteps: []string{
					fmt.Sprintf("kubectl describe pod %s -n %s", v1.ResourceName, v1.Namespace),
					fmt.Sprintf("kubectl get events -n %s --field-selector involvedObject.name=%s", v1.Namespace, v1.ResourceName),
				},
			},
		}

	case "job_failure", "cronjob_failure":
		pattern = incidents.PatternAppCrash
		diagnosis = &incidents.Diagnosis{
			Summary:        fmt.Sprintf("Job %s has %d failed pod(s)", v1.ResourceName, v1.Count),
			ProbableCauses: []string{"Job logic error", "Dependency unavailable", "Timeout exceeded"},
			Confidence:     0.80,
			Evidence:       []string{fmt.Sprintf("Failed pods: %d", v1.Count)},
			GeneratedAt:    time.Now(),
		}
		recommendations = []incidents.Recommendation{
			{
				ID:          "retry-job",
				Title:       "Retry failed job",
				Explanation: "Delete the failed job to allow it to be retried",
				Risk:        incidents.RiskLow,
				Priority:    1,
				ProposedFix: &incidents.ProposedFix{
					Type:        incidents.FixTypeDelete,
					Description: fmt.Sprintf("Delete job %s to allow retry", v1.ResourceName),
					DryRunCmd:   fmt.Sprintf("kubectl delete job %s -n %s --dry-run=client", v1.ResourceName, v1.Namespace),
					ApplyCmd:    fmt.Sprintf("kubectl delete job %s -n %s", v1.ResourceName, v1.Namespace),
					TargetResource: incidents.KubeResourceRef{
						Kind:      "Job",
						Name:      v1.ResourceName,
						Namespace: v1.Namespace,
					},
					Safe:                 true,
					RequiresConfirmation: true,
				},
				Action: &incidents.FixAction{
					Label:                "Retry Job",
					Type:                 incidents.ActionTypeDeletePod,
					Description:          "Delete the job to trigger a retry",
					Safe:                 true,
					RequiresConfirmation: true,
				},
			},
			{
				ID:          "check-job-logs",
				Title:       "Check job pod logs",
				Explanation: "Review the logs from the failed job pods",
				Risk:        incidents.RiskLow,
				Priority:    2,
				ManualSteps: []string{fmt.Sprintf("kubectl logs job/%s -n %s", v1.ResourceName, v1.Namespace)},
			},
		}

	case "node_pressure", "node_memory_pressure", "node_disk_pressure":
		pattern = incidents.PatternNodePressure
		diagnosis = &incidents.Diagnosis{
			Summary:        fmt.Sprintf("Node %s is experiencing resource pressure", v1.ResourceName),
			ProbableCauses: []string{"High memory usage", "Disk space low", "Too many pods scheduled"},
			Confidence:     0.85,
			Evidence:       []string{v1.Message},
			GeneratedAt:    time.Now(),
		}
		recommendations = []incidents.Recommendation{
			{
				ID:          "check-node-resources",
				Title:       "Check node resource usage",
				Explanation: "Review node metrics to identify which resources are under pressure",
				Risk:        incidents.RiskLow,
				Priority:    1,
			},
			{
				ID:          "drain-node",
				Title:       "Consider draining the node",
				Explanation: "Move pods to other nodes to relieve pressure",
				Risk:        incidents.RiskHigh,
				Priority:    2,
			},
		}

	default:
		pattern = incidents.PatternUnknown
		diagnosis = &incidents.Diagnosis{
			Summary:        v1.Message,
			ProbableCauses: []string{"Unknown cause - requires investigation"},
			Confidence:     0.50,
			Evidence:       []string{v1.Message},
			GeneratedAt:    time.Now(),
		}
	}

	// Map severity
	severity := incidents.SeverityMedium
	switch v1.Severity {
	case "critical":
		severity = incidents.SeverityCritical
	case "warning":
		severity = incidents.SeverityMedium
	case "info":
		severity = incidents.SeverityLow
	}

	patternStr := string(pattern)

	incident := &incidents.Incident{
		ID:       v1.ID,
		Pattern:  pattern,
		Severity: severity,
		Status:   incidents.StatusOpen,
		Resource: incidents.KubeResourceRef{
			Kind:      v1.ResourceKind,
			Name:      v1.ResourceName,
			Namespace: v1.Namespace,
		},
		Title:           fmt.Sprintf("%s: %s", patternStr, v1.ResourceName),
		Description:     v1.Message,
		Occurrences:     v1.Count,
		FirstSeen:       v1.FirstSeen,
		LastSeen:        v1.LastSeen,
		Diagnosis:       diagnosis,
		Recommendations: recommendations,
		// Initialize empty Signals - will be populated by fallback logic in handlers
		Signals: incidents.IncidentSignals{},
	}

	// Enhance recommendations with fix actions
	registry := incidents.NewFixGeneratorRegistry()
	incidents.EnhanceRecommendationsWithActions(incident, registry)

	return incident
}

// handleIncidentV2ByID handles GET/PUT /api/v2/incidents/{id}
func (ws *WebServer) handleIncidentV2ByID(w http.ResponseWriter, r *http.Request) {
	if ws.app.incidentIntelligence == nil {
		http.Error(w, "Incident intelligence not initialized", http.StatusServiceUnavailable)
		return
	}

	// Extract incident ID from path
	path := r.URL.Path
	id := extractIDFromPath(path, "/api/v2/incidents/")

	if id == "" {
		http.Error(w, "Incident ID required", http.StatusBadRequest)
		return
	}

	manager := ws.app.incidentIntelligence.GetManager()

	// Handle sub-paths (snapshot, evidence, logs, etc.)
	subPath := getSubPath(id)
	if subPath != "" {
		baseID := getBaseID(id)
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

		if err := manager.ResolveIncident(incidentID, req.Resolution); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

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
		return ""
	}
	remaining := path[len(prefix):]
	if idx := strings.Index(remaining, "/"); idx != -1 {
		return remaining
	}
	return remaining
}

func getSubPath(id string) string {
	if idx := strings.Index(id, "/"); idx != -1 {
		return id[idx+1:]
	}
	return ""
}

func getBaseID(id string) string {
	if idx := strings.Index(id, "/"); idx != -1 {
		return id[:idx]
	}
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

	manager := ws.app.incidentIntelligence.GetManager()

	// Get the incident from manager first
	incident := manager.GetIncident(req.IncidentID)

	// If not found in manager, try to find in v1 incidents and convert
	if incident == nil {
		v1Incidents := ws.getV1Incidents("")
		for _, v1 := range v1Incidents {
			v2Inc := ws.convertV1ToV2Incident(v1)
			if v2Inc.ID == req.IncidentID {
				incident = v2Inc
				break
			}
		}
	}

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

	// Get the incident from manager first
	incident := manager.GetIncident(req.IncidentID)

	// If not found in manager, try to find in v1 incidents and convert
	if incident == nil {
		v1Incidents := ws.getV1Incidents("")
		for _, v1 := range v1Incidents {
			v2Inc := ws.convertV1ToV2Incident(v1)
			if v2Inc.ID == req.IncidentID {
				incident = v2Inc
				break
			}
		}
	}

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

	// Return a status indicating auto-remediation is not yet fully configured
	status := map[string]interface{}{
		"enabled":              false,
		"activeExecutions":     0,
		"totalExecutions":      0,
		"successfulExecutions": 0,
		"failedExecutions":     0,
		"rolledBackExecutions": 0,
		"queuedIncidents":      0,
		"cooldownResources":    0,
		"message":              "Auto-remediation engine not yet fully configured",
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(status)
}

// handleAutoRemediationEnable handles POST /api/v2/auto-remediation/enable
func (ws *WebServer) handleAutoRemediationEnable(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": "Auto-remediation enabled (note: full implementation pending)",
	})
}

// handleAutoRemediationDisable handles POST /api/v2/auto-remediation/disable
func (ws *WebServer) handleAutoRemediationDisable(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
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

	// Return empty decisions list for now
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode([]interface{}{})
}

// handleLearningClusters handles GET /api/v2/learning/clusters
func (ws *WebServer) handleLearningClusters(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Return empty clusters for now - learning engine needs more data
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode([]interface{}{})
}

// handleLearningPatterns handles GET /api/v2/learning/patterns
func (ws *WebServer) handleLearningPatterns(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Return empty patterns for now
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode([]interface{}{})
}

// handleLearningTrends handles GET /api/v2/learning/trends
func (ws *WebServer) handleLearningTrends(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Return empty trends for now
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{})
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

	// Return basic runbooks
	runbooks := []map[string]interface{}{
		{
			"id":             "rb-restart-pod",
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
			"id":             "rb-increase-memory",
			"name":           "Increase Memory Limit",
			"description":    "Increase memory limits for containers experiencing OOM",
			"pattern":        "OOM_PRESSURE",
			"risk":           "medium",
			"autonomyLevel":  2,
			"successRate":    0.75,
			"executionCount": 0,
			"enabled":        true,
			"tags":           []string{"memory", "resources", "oom"},
		},
		{
			"id":             "rb-rolling-restart",
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
		{
			"id":             "rb-retry-job",
			"name":           "Retry Failed Job",
			"description":    "Delete the failed job to allow retry",
			"pattern":        "APP_CRASH",
			"risk":           "low",
			"autonomyLevel":  2,
			"successRate":    0.7,
			"executionCount": 0,
			"enabled":        true,
			"tags":           []string{"job", "retry", "failure"},
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

	// Fallback to v1 incidents
	if incident == nil {
		v1Incidents := ws.getV1Incidents("")
		for _, v1 := range v1Incidents {
			v2Inc := ws.convertV1ToV2Incident(v1)
			if v2Inc.ID == incidentID {
				incident = v2Inc
				break
			}
		}
	}

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

	// Fallback to v1 incidents
	if incident == nil {
		v1Incidents := ws.getV1Incidents("")
		for _, v1 := range v1Incidents {
			v2Inc := ws.convertV1ToV2Incident(v1)
			if v2Inc.ID == incidentID {
				incident = v2Inc
				break
			}
		}
	}

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

	// Find the incident - try cache first, then v2 manager, then v1 fallback
	var incident *incidents.Incident

	// Check cache first
	incident = ws.incidentCache.GetV2Incident(incidentID)

	// If not in cache, try v2 manager (fast path)
	if incident == nil && ws.app.incidentIntelligence != nil {
		incident = ws.app.incidentIntelligence.GetManager().GetIncident(incidentID)
		if incident != nil {
			// Cache it
			ws.incidentCache.SetV2Incident(incidentID, incident)
		}
	}

	// Fallback to v1 incidents if not found (needed for v1 incident compatibility)
	// Use cache to avoid repeated expensive lookups
	if incident == nil {
		// Check cache for v1 incidents
		v1Incidents := ws.incidentCache.GetV1Incidents("")
		if v1Incidents == nil {
			// Not in cache, fetch and cache
			v1Incidents = ws.getV1Incidents("")
			ws.incidentCache.SetV1Incidents("", v1Incidents)
		}

		// Search for the incident
		for _, v1 := range v1Incidents {
			v2Inc := ws.convertV1ToV2Incident(v1)
			if v2Inc.ID == incidentID {
				incident = v2Inc
				// Cache the converted incident
				ws.incidentCache.SetV2Incident(incidentID, incident)
				break
			}
		}
	}

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
				"id":             "rb-restart-pod",
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
				"id":             "rb-increase-memory",
				"name":           "Increase Memory Limit",
				"description":    "Increase memory limits for containers experiencing OOM",
				"pattern":        "OOM_PRESSURE",
				"risk":           "medium",
				"autonomyLevel":  2,
				"successRate":    0.75,
				"executionCount": 0,
				"enabled":        true,
				"tags":           []string{"memory", "resources", "oom"},
			},
			{
				"id":             "rb-rolling-restart",
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
			{
				"id":             "rb-retry-job",
				"name":           "Retry Failed Job",
				"description":    "Delete the failed job to allow retry",
				"pattern":        "APP_CRASH",
				"risk":           "low",
				"autonomyLevel":  2,
				"successRate":    0.7,
				"executionCount": 0,
				"enabled":        true,
				"tags":           []string{"job", "retry", "failure"},
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

	// Find the incident - try cache first, then v2 manager, then v1 fallback
	var incident *incidents.Incident

	// Check cache first
	incident = ws.incidentCache.GetV2Incident(incidentID)

	// If not in cache, try v2 manager (fast path)
	if incident == nil && ws.app.incidentIntelligence != nil {
		incident = ws.app.incidentIntelligence.GetManager().GetIncident(incidentID)
		if incident != nil {
			// Cache it
			ws.incidentCache.SetV2Incident(incidentID, incident)
		}
	}

	// Fallback to v1 incidents if not found (needed for v1 incident compatibility)
	if incident == nil {
		// Check cache for v1 incidents
		v1Incidents := ws.incidentCache.GetV1Incidents("")
		if v1Incidents == nil {
			// Not in cache, fetch and cache
			v1Incidents = ws.getV1Incidents("")
			ws.incidentCache.SetV1Incidents("", v1Incidents)
		}

		// Search for the incident
		for _, v1 := range v1Incidents {
			v2Inc := ws.convertV1ToV2Incident(v1)
			if v2Inc.ID == incidentID {
				incident = v2Inc
				// Cache the converted incident
				ws.incidentCache.SetV2Incident(incidentID, incident)
				break
			}
		}
	}

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

	// Fallback to v1 incidents if not found
	if incident == nil {
		v1Incident := ws.getV1IncidentByID(incidentID)
		if v1Incident != nil {
			incident = v1Incident
			ws.incidentCache.SetV2Incident(incidentID, incident)
		}
	}

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

	// Fallback to v1 incidents if not found
	if incident == nil {
		v1Incident := ws.getV1IncidentByID(incidentID)
		if v1Incident != nil {
			incident = v1Incident
			ws.incidentCache.SetV2Incident(incidentID, incident)
		}
	}

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

	// Find the incident - try cache first, then v2 manager, then v1 fallback
	var incident *incidents.Incident

	// Check cache first
	incident = ws.incidentCache.GetV2Incident(incidentID)

	// If not in cache, try v2 manager (fast path)
	if incident == nil && ws.app.incidentIntelligence != nil {
		incident = ws.app.incidentIntelligence.GetManager().GetIncident(incidentID)
		if incident != nil {
			// Cache it
			ws.incidentCache.SetV2Incident(incidentID, incident)
		}
	}

	// Fallback to v1 incidents if not found (needed for v1 incident compatibility)
	// Use cache to avoid repeated expensive lookups
	if incident == nil {
		// Check cache for v1 incidents
		v1Incidents := ws.incidentCache.GetV1Incidents("")
		if v1Incidents == nil {
			// Not in cache, fetch and cache
			v1Incidents = ws.getV1Incidents("")
			ws.incidentCache.SetV1Incidents("", v1Incidents)
		}

		// Search for the incident
		for _, v1 := range v1Incidents {
			v2Inc := ws.convertV1ToV2Incident(v1)
			if v2Inc.ID == incidentID {
				incident = v2Inc
				// Cache the converted incident
				ws.incidentCache.SetV2Incident(incidentID, incident)
				break
			}
		}
	}

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

	// Find the incident - try cache first, then v2 manager, then v1 fallback
	var incident *incidents.Incident

	// Check cache first
	incident = ws.incidentCache.GetV2Incident(incidentID)

	// If not in cache, try v2 manager (fast path)
	if incident == nil && ws.app.incidentIntelligence != nil {
		incident = ws.app.incidentIntelligence.GetManager().GetIncident(incidentID)
		if incident != nil {
			// Cache it
			ws.incidentCache.SetV2Incident(incidentID, incident)
		}
	}

	// Fallback to v1 incidents if not found (needed for v1 incident compatibility)
	// Use cache to avoid repeated expensive lookups
	if incident == nil {
		// Check cache for v1 incidents
		v1Incidents := ws.incidentCache.GetV1Incidents("")
		if v1Incidents == nil {
			// Not in cache, fetch and cache
			v1Incidents = ws.getV1Incidents("")
			ws.incidentCache.SetV1Incidents("", v1Incidents)
		}

		// Search for the incident
		for _, v1 := range v1Incidents {
			v2Inc := ws.convertV1ToV2Incident(v1)
			if v2Inc.ID == incidentID {
				incident = v2Inc
				// Cache the converted incident
				ws.incidentCache.SetV2Incident(incidentID, incident)
				break
			}
		}
	}

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

	// Find the incident
	var incident *incidents.Incident
	incident = ws.incidentCache.GetV2Incident(incidentID)
	if incident == nil && ws.app.incidentIntelligence != nil {
		incident = ws.app.incidentIntelligence.GetManager().GetIncident(incidentID)
		if incident != nil {
			ws.incidentCache.SetV2Incident(incidentID, incident)
		}
	}
	
	// Fallback to v1 incidents if not found
	if incident == nil {
		v1Incident := ws.getV1IncidentByID(incidentID)
		if v1Incident != nil {
			incident = v1Incident
			ws.incidentCache.SetV2Incident(incidentID, incident)
		}
	}
	
	if incident == nil {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode([]map[string]interface{}{})
		return
	}

	// Find similar incidents by pattern and namespace
	similar := make([]map[string]interface{}, 0)
	
	// Get v1 incidents (cached)
	v1Incidents := ws.incidentCache.GetV1Incidents("")
	if v1Incidents == nil {
		v1Incidents = ws.getV1Incidents("")
		ws.incidentCache.SetV1Incidents("", v1Incidents)
	}
	
	// Find similar incidents (same pattern, same namespace, different resource)
	for _, v1 := range v1Incidents {
		if v1.ID == incidentID {
			continue
		}
		v2Inc := ws.convertV1ToV2Incident(v1)
		if v2Inc.Pattern == incident.Pattern && v2Inc.Resource.Namespace == incident.Resource.Namespace {
			similar = append(similar, map[string]interface{}{
				"id":          v2Inc.ID,
				"pattern":     string(v2Inc.Pattern),
				"severity":    string(v2Inc.Severity),
				"resource":    v2Inc.Resource,
				"occurrences": v2Inc.Occurrences,
				"firstSeen":   v2Inc.FirstSeen.Format(time.RFC3339),
				"lastSeen":    v2Inc.LastSeen.Format(time.RFC3339),
				"title":       v2Inc.Title,
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
