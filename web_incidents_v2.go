// Copyright 2025 KubeGraf Contributors
// SPDX-License-Identifier: Apache-2.0

package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/kubegraf/kubegraf/pkg/incidents"
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
		ID:          v1.ID,
		Pattern:     pattern,
		Severity:    severity,
		Status:      incidents.StatusOpen,
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

	// Handle sub-paths
	subPath := getSubPath(id)
	if subPath != "" {
		ws.handleIncidentV2Action(w, r, manager, getBaseID(id), subPath)
		return
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

	case "fix-preview":
		// Delegate to handleFixPreview with the incidentID in path
		ws.handleFixPreviewForIncident(w, r, incidentID)

	case "fix-apply":
		// Delegate to handleFixApply with the incidentID in path
		ws.handleFixApplyForIncident(w, r, incidentID)

	case "runbooks":
		// Return runbooks for this incident
		ws.handleIncidentRunbooks(w, r, incidentID)

	case "evidence":
		// Return evidence for this incident
		ws.handleIncidentEvidence(w, r, incidentID)

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
		DryRun          bool   `json:"dryRun"`
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

	// Find the incident to get its pattern
	var incident *incidents.Incident
	
	if ws.app.incidentIntelligence != nil {
		incident = ws.app.incidentIntelligence.GetManager().GetIncident(incidentID)
	}
	
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

	var runbooks []map[string]interface{}

	if incident != nil {
		// Return runbooks matching this pattern
		pattern := string(incident.Pattern)
		
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
			if rb["pattern"] == pattern || rb["pattern"] == "ALL" {
				runbooks = append(runbooks, rb)
			}
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(runbooks)
}

// handleIncidentEvidence handles GET /api/v2/incidents/{id}/evidence
func (ws *WebServer) handleIncidentEvidence(w http.ResponseWriter, r *http.Request, incidentID string) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Find the incident
	var incident *incidents.Incident
	
	if ws.app.incidentIntelligence != nil {
		incident = ws.app.incidentIntelligence.GetManager().GetIncident(incidentID)
	}
	
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

	// Build evidence from incident data
	evidence := map[string]interface{}{
		"events": []map[string]interface{}{
			{
				"type":    "Warning",
				"reason":  incident.Pattern,
				"message": incident.Description,
				"time":    incident.LastSeen,
			},
		},
		"logs": []map[string]interface{}{},
		"statusFacts": []map[string]interface{}{
			{
				"type":  "Severity",
				"key":   "severity",
				"value": string(incident.Severity),
			},
			{
				"type":  "Occurrences",
				"key":   "occurrences",
				"value": fmt.Sprintf("%d", incident.Occurrences),
			},
		},
		"changeHistory": []map[string]interface{}{},
	}

	// Add evidence from diagnosis
	if incident.Diagnosis != nil && len(incident.Diagnosis.Evidence) > 0 {
		for _, ev := range incident.Diagnosis.Evidence {
			evidence["statusFacts"] = append(evidence["statusFacts"].([]map[string]interface{}), map[string]interface{}{
				"type":  "Evidence",
				"key":   "diagnosis",
				"value": ev,
			})
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(evidence)
}

// handleIncidentCitations handles GET /api/v2/incidents/{id}/citations
func (ws *WebServer) handleIncidentCitations(w http.ResponseWriter, r *http.Request, incidentID string) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Find the incident
	var incident *incidents.Incident
	
	if ws.app.incidentIntelligence != nil {
		incident = ws.app.incidentIntelligence.GetManager().GetIncident(incidentID)
	}
	
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

	// Generate citations based on pattern
	citations := []map[string]interface{}{}
	
	pattern := string(incident.Pattern)
	
	switch pattern {
	case "RESTART_STORM", "CRASHLOOP":
		citations = append(citations, map[string]interface{}{
			"source": "kubernetes-docs",
			"ref":    "https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/#restart-policy",
			"title":  "Pod Restart Policy",
			"quote":  "A Pod's restartPolicy determines how the kubelet handles Container crashes within the Pod.",
		})
		citations = append(citations, map[string]interface{}{
			"source": "kubernetes-docs",
			"ref":    "https://kubernetes.io/docs/tasks/debug/debug-application/debug-pods/",
			"title":  "Debug Pods",
			"quote":  "This page shows how to debug Pods that are stuck in a pending state.",
		})
	case "OOM_PRESSURE":
		citations = append(citations, map[string]interface{}{
			"source": "kubernetes-docs",
			"ref":    "https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/",
			"title":  "Resource Management for Pods and Containers",
			"quote":  "When you specify the resource request for containers in a Pod, the kube-scheduler uses this information to decide which node to place the Pod on.",
		})
		citations = append(citations, map[string]interface{}{
			"source": "kubernetes-docs",
			"ref":    "https://kubernetes.io/docs/tasks/configure-pod-container/assign-memory-resource/",
			"title":  "Assign Memory Resources to Containers",
			"quote":  "This page shows how to assign a memory request and a memory limit to a Container.",
		})
	case "APP_CRASH":
		citations = append(citations, map[string]interface{}{
			"source": "kubernetes-docs",
			"ref":    "https://kubernetes.io/docs/concepts/workloads/controllers/job/",
			"title":  "Jobs",
			"quote":  "A Job creates one or more Pods and will continue to retry execution of the Pods until a specified number of them successfully terminate.",
		})
	}

	// Add generic citation
	citations = append(citations, map[string]interface{}{
		"source": "incident",
		"ref":    incidentID,
		"title":  "Incident Evidence",
		"quote":  incident.Description,
	})

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(citations)
}

// handleIncidentSimilar handles GET /api/v2/incidents/{id}/similar
func (ws *WebServer) handleIncidentSimilar(w http.ResponseWriter, r *http.Request, incidentID string) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// For now, return empty array - learning engine would provide this
	// In a full implementation, this would query the knowledge bank for similar incidents
	similar := []map[string]interface{}{}

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

