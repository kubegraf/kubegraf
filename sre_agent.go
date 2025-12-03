// Copyright 2025 KubeGraf Contributors
// SPDX-License-Identifier: Apache-2.0

package main

import (
	"context"
	"fmt"
	"log"
	"strings"
	"sync"
	"time"

	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/resource"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// SREAgent represents an AI-powered Site Reliability Engineering agent
// that can automatically respond to alerts, make changes, and call for help
type SREAgent struct {
	app        *App
	ai         *AIAssistant
	config     *SREAgentConfig
	mu         sync.RWMutex
	incidents  map[string]*Incident
	actions    map[string]*ActionHistory
	metrics    *SREMetrics
	stopCh     chan struct{}
}

// SREAgentConfig holds configuration for the SRE agent
type SREAgentConfig struct {
	Enabled               bool          `json:"enabled"`
	AutoRemediate         bool          `json:"autoRemediate"`
	AutoRemediateTypes    []string      `json:"autoRemediateTypes"` // Types of events to auto-remediate
	NotificationEnabled   bool          `json:"notificationEnabled"`
	NotificationWebhook   string        `json:"notificationWebhook"`
	MaxAutoActionsPerHour int           `json:"maxAutoActionsPerHour"`
	LearningEnabled       bool          `json:"learningEnabled"`
	BatchMonitoring       bool          `json:"batchMonitoring"`
	BatchSLO              time.Duration `json:"batchSLO"` // Target batch completion time
}

// DefaultSREAgentConfig returns the default SRE agent configuration
func DefaultSREAgentConfig() *SREAgentConfig {
	return &SREAgentConfig{
		Enabled:               true,
		AutoRemediate:         true,
		AutoRemediateTypes:    []string{"pod_oom_restart", "pod_crash_loop", "http_500", "http_502"},
		NotificationEnabled:   true,
		NotificationWebhook:   "",
		MaxAutoActionsPerHour: 10,
		LearningEnabled:       true,
		BatchMonitoring:       true,
		BatchSLO:              5 * time.Minute, // Default 5 minutes for batch jobs
	}
}

// Incident represents a tracked incident with AI analysis and actions
type Incident struct {
	ID           string                 `json:"id"`
	EventID      string                 `json:"eventId"`
	Type         string                 `json:"type"`
	Severity     string                 `json:"severity"`
	Title        string                 `json:"title"`
	Description  string                 `json:"description"`
	Resource     string                 `json:"resource"`
	Namespace    string                 `json:"namespace"`
	DetectedAt   time.Time              `json:"detectedAt"`
	ResolvedAt   *time.Time             `json:"resolvedAt,omitempty"`
	Status       string                 `json:"status"` // "open", "investigating", "remediating", "resolved", "escalated"
	Analysis     *AIAnalysis            `json:"analysis,omitempty"`
	Actions      []Action               `json:"actions"`
	RootCause    string                 `json:"rootCause,omitempty"`
	Resolution   string                 `json:"resolution,omitempty"`
	Metadata     map[string]interface{} `json:"metadata"`
}

// AIAnalysis contains AI-generated analysis of an incident
type AIAnalysis struct {
	GeneratedAt   time.Time `json:"generatedAt"`
	Analysis      string    `json:"analysis"`
	Confidence    float64   `json:"confidence"` // 0.0 to 1.0
	Recommended   []string  `json:"recommendedActions"`
	Risks         []string  `json:"risks"`
	EstimatedTime string    `json:"estimatedTimeToResolve"`
}

// Action represents an action taken by the SRE agent
type Action struct {
	ID          string                 `json:"id"`
	Type        string                 `json:"type"` // "remediate", "notify", "escalate", "monitor", "analyze"
	Description string                 `json:"description"`
	Status      string                 `json:"status"` // "pending", "executing", "completed", "failed"
	StartedAt   time.Time              `json:"startedAt"`
	CompletedAt *time.Time             `json:"completedAt,omitempty"`
	Result      string                 `json:"result,omitempty"`
	Error       string                 `json:"error,omitempty"`
	Details     map[string]interface{} `json:"details,omitempty"`
}

// ActionHistory tracks historical actions for learning
type ActionHistory struct {
	Resource   string    `json:"resource"`
	ActionType string    `json:"actionType"`
	Count      int       `json:"count"`
	Success    int       `json:"success"`
	LastAction time.Time `json:"lastAction"`
	LastResult string    `json:"lastResult"`
}

// SREMetrics tracks agent performance metrics
type SREMetrics struct {
	IncidentsDetected   int            `json:"incidentsDetected"`
	IncidentsResolved   int            `json:"incidentsResolved"`
	AutoRemediations    int            `json:"autoRemediations"`
	NotificationsSent   int            `json:"notificationsSent"`
	Escalations         int            `json:"escalations"`
	AvgResolutionTime   time.Duration  `json:"avgResolutionTime"`
	SuccessRate         float64        `json:"successRate"`
	BatchSLOMet         int            `json:"batchSLOMet"`
	BatchSLOViolated    int            `json:"batchSLOViolated"`
	ActionsThisHour     int            `json:"actionsThisHour"`
	LastHourReset       time.Time      `json:"lastHourReset"`
	mu                  sync.RWMutex   `json:"-"`
}

// BatchJob represents a batch job being monitored
type BatchJob struct {
	Name       string        `json:"name"`
	Namespace  string        `json:"namespace"`
	StartTime  time.Time     `json:"startTime"`
	Duration   time.Duration `json:"duration"`
	Status     string        `json:"status"` // "running", "completed", "failed", "timeout"
	SLOStatus  string        `json:"sloStatus"` // "met", "violated", "at_risk"
	Completion *time.Time    `json:"completionTime,omitempty"`
}

// NewSREAgent creates a new SRE agent
func NewSREAgent(app *App) *SREAgent {
	config := DefaultSREAgentConfig()
	ai := NewAIAssistant(nil)
	
	agent := &SREAgent{
		app:       app,
		ai:        ai,
		config:    config,
		incidents: make(map[string]*Incident),
		actions:   make(map[string]*ActionHistory),
		metrics: &SREMetrics{
			LastHourReset: time.Now(),
		},
		stopCh: make(chan struct{}),
	}

	// Register with event monitor if available
	if app.eventMonitor != nil {
		app.eventMonitor.RegisterCallback(agent.HandleEvent)
	}

	return agent
}

// Start starts the SRE agent
func (agent *SREAgent) Start(ctx context.Context) {
	log.Println("Starting SRE Agent")
	
	// Start batch monitoring if enabled
	if agent.config.BatchMonitoring {
		go agent.monitorBatchJobs(ctx)
	}

	// Start metrics reset timer
	go agent.resetHourlyMetrics(ctx)

	log.Println("SRE Agent started")
}

// Stop stops the SRE agent
func (agent *SREAgent) Stop() {
	close(agent.stopCh)
	log.Println("SRE Agent stopped")
}

// HandleEvent handles incoming events from the event monitor
func (agent *SREAgent) HandleEvent(event MonitoredEvent) {
	if !agent.config.Enabled {
		return
	}

	// Check if we should process this event type
	if !agent.shouldProcessEvent(event) {
		return
	}

	// Create incident
	incident := agent.createIncident(event)
	
	// Store incident
	agent.mu.Lock()
	agent.incidents[incident.ID] = incident
	agent.mu.Unlock()

	// Update metrics
	agent.metrics.mu.Lock()
	agent.metrics.IncidentsDetected++
	agent.metrics.mu.Unlock()

	// Analyze incident with AI
	go agent.analyzeIncident(incident)

	// Check if we should auto-remediate
	if agent.config.AutoRemediate && agent.shouldAutoRemediate(event) {
		// Check rate limit
		if agent.canTakeAction() {
			go agent.remediateIncident(incident)
		} else {
			log.Printf("Rate limit exceeded for auto-remediation of incident %s", incident.ID)
			agent.notifyRateLimitExceeded(incident)
		}
	}

	// Send notification if enabled
	if agent.config.NotificationEnabled {
		go agent.sendNotification(incident)
	}
}

// shouldProcessEvent determines if an event should be processed by the SRE agent
func (agent *SREAgent) shouldProcessEvent(event MonitoredEvent) bool {
	// Process critical and high severity events
	if event.Severity == EventSeverityCritical || event.Severity == EventSeverityHigh {
		return true
	}

	// Process specific event types regardless of severity
	importantTypes := []string{
		"pod_oom_restart",
		"pod_crash_loop", 
		"http_500",
		"http_502",
		"node_unavailable",
		"hpa_scaled",
	}

	for _, t := range importantTypes {
		if event.Category == t {
			return true
		}
	}

	return false
}

// shouldAutoRemediate determines if an event should be auto-remediated
func (agent *SREAgent) shouldAutoRemediate(event MonitoredEvent) bool {
	for _, t := range agent.config.AutoRemediateTypes {
		if event.Category == t {
			return true
		}
	}
	return false
}

// canTakeAction checks if we're within rate limits
func (agent *SREAgent) canTakeAction() bool {
	agent.metrics.mu.RLock()
	defer agent.metrics.mu.RUnlock()

	// Reset hourly counter if needed
	if time.Since(agent.metrics.LastHourReset) > time.Hour {
		agent.metrics.mu.RUnlock()
		agent.metrics.mu.Lock()
		agent.metrics.ActionsThisHour = 0
		agent.metrics.LastHourReset = time.Now()
		agent.metrics.mu.Unlock()
		agent.metrics.mu.RLock()
	}

	return agent.metrics.ActionsThisHour < agent.config.MaxAutoActionsPerHour
}

// createIncident creates an incident from an event
func (agent *SREAgent) createIncident(event MonitoredEvent) *Incident {
	incidentID := fmt.Sprintf("inc-%s-%d", event.Category, time.Now().Unix())

	incident := &Incident{
		ID:          incidentID,
		EventID:     event.ID,
		Type:        event.Category,
		Severity:    string(event.Severity),
		Title:       event.Title,
		Description: event.Description,
		Resource:    event.Resource,
		Namespace:   event.Namespace,
		DetectedAt:  time.Now(),
		Status:      "open",
		Actions:     []Action{},
		Metadata:    event.Details,
	}

	// Add initial analysis action
	incident.Actions = append(incident.Actions, Action{
		ID:          fmt.Sprintf("act-%s-analyze", incidentID),
		Type:        "analyze",
		Description: "AI analysis of incident",
		Status:      "pending",
		StartedAt:   time.Now(),
	})

	return incident
}

// analyzeIncident performs AI analysis of an incident
func (agent *SREAgent) analyzeIncident(incident *Incident) {
	if !agent.ai.IsAvailable() {
		log.Printf("AI not available for incident analysis: %s", incident.ID)
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	// Build analysis prompt
	prompt := agent.buildAnalysisPrompt(incident)

	response, err := agent.ai.Query(ctx, prompt)
	if err != nil {
		log.Printf("AI analysis failed for incident %s: %v", incident.ID, err)
		return
	}

	// Parse AI response
	analysis := &AIAnalysis{
		GeneratedAt: time.Now(),
		Analysis:    response,
		Confidence:  0.8, // Default confidence
		Recommended: agent.extractRecommendedActions(response),
		Risks:       agent.extractRisks(response),
		EstimatedTime: "15 minutes", // Default
	}

	// Update incident
	agent.mu.Lock()
	if existing, ok := agent.incidents[incident.ID]; ok {
		existing.Analysis = analysis
		existing.Status = "investigating"
		
		// Update analysis action
		for i, action := range existing.Actions {
			if action.Type == "analyze" && action.Status == "pending" {
				existing.Actions[i].Status = "completed"
				completed := time.Now()
				existing.Actions[i].CompletedAt = &completed
				existing.Actions[i].Result = "Analysis completed"
				break
			}
		}
	}
	agent.mu.Unlock()

	log.Printf("AI analysis completed for incident %s", incident.ID)
}

// buildAnalysisPrompt builds a prompt for AI analysis
func (agent *SREAgent) buildAnalysisPrompt(incident *Incident) string {
	var sb strings.Builder
	
	sb.WriteString("You are an SRE (Site Reliability Engineer) analyzing a Kubernetes incident.\n\n")
	sb.WriteString(fmt.Sprintf("Incident Type: %s\n", incident.Type))
	sb.WriteString(fmt.Sprintf("Severity: %s\n", incident.Severity))
	sb.WriteString(fmt.Sprintf("Title: %s\n", incident.Title))
	sb.WriteString(fmt.Sprintf("Description: %s\n", incident.Description))
	sb.WriteString(fmt.Sprintf("Resource: %s\n", incident.Resource))
	sb.WriteString(fmt.Sprintf("Namespace: %s\n", incident.Namespace))
	
	if len(incident.Metadata) > 0 {
		sb.WriteString("\nAdditional Details:\n")
		for k, v := range incident.Metadata {
			sb.WriteString(fmt.Sprintf("- %s: %v\n", k, v))
		}
	}

	sb.WriteString("\nPlease provide:\n")
	sb.WriteString("1. Likely root cause (be specific)\n")
	sb.WriteString("2. Immediate actions to take (prioritized)\n")
	sb.WriteString("3. Risks of each action\n")
	sb.WriteString("4. Estimated time to resolve\n")
	sb.WriteString("5. Whether this should be escalated to human SRE\n")

	return sb.String()
}

// extractRecommendedActions extracts recommended actions from AI response
func (agent *SREAgent) extractRecommendedActions(response string) []string {
	// Simple extraction - look for numbered lists or bullet points
	lines := strings.Split(response, "\n")
	var actions []string
	
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if strings.HasPrefix(line, "1.") || strings.HasPrefix(line, "2.") || 
		   strings.HasPrefix(line, "3.") || strings.HasPrefix(line, "- ") ||
		   strings.HasPrefix(line, "* ") {
			actions = append(actions, line)
		}
	}
	
	if len(actions) == 0 {
		// Fallback: take first few sentences
		sentences := strings.Split(response, ".")
		if len(sentences) > 0 {
			actions = []string{sentences[0] + "."}
		}
	}
	
	return actions
}

// extractRisks extracts risks from AI response
func (agent *SREAgent) extractRisks(response string) []string {
	// Look for risk-related keywords
	lines := strings.Split(response, "\n")
	var risks []string
	
	riskKeywords := []string{"risk", "danger", "warning", "caution", "could cause", "might lead"}
	
	for _, line := range lines {
		line = strings.ToLower(line)
		for _, keyword := range riskKeywords {
			if strings.Contains(line, keyword) {
				risks = append(risks, line)
				break
			}
		}
	}
	
	return risks
}

// remediateIncident attempts to auto-remediate an incident
func (agent *SREAgent) remediateIncident(incident *Incident) {
	// Check if we should escalate instead
	if agent.shouldEscalate(incident) {
		agent.escalateIncident(incident)
		return
	}

	// Create remediation action
	actionID := fmt.Sprintf("act-%s-remediate", incident.ID)
	action := Action{
		ID:          actionID,
		Type:        "remediate",
		Description: "Auto-remediation of incident",
		Status:      "executing",
		StartedAt:   time.Now(),
		Details: map[string]interface{}{
			"incidentId": incident.ID,
			"type":       incident.Type,
		},
	}

	// Add action to incident
	agent.mu.Lock()
	if existing, ok := agent.incidents[incident.ID]; ok {
		existing.Actions = append(existing.Actions, action)
		existing.Status = "remediating"
	}
	agent.mu.Unlock()

	// Update metrics
	agent.metrics.mu.Lock()
	agent.metrics.ActionsThisHour++
	agent.metrics.mu.Unlock()

	// Perform remediation based on incident type
	var result string
	var err error

	switch incident.Type {
	case "pod_oom_restart":
		result, err = agent.remediateOOMIncident(incident)
	case "pod_crash_loop":
		result, err = agent.remediateCrashLoopIncident(incident)
	case "http_500", "http_502":
		result, err = agent.remediateHTTPErrorIncident(incident)
	case "hpa_scaled":
		result, err = agent.remediateHPAScalingIncident(incident)
	default:
		result = "No specific remediation for this incident type"
		err = fmt.Errorf("unsupported incident type: %s", incident.Type)
	}

	// Update action status
	completed := time.Now()
	agent.mu.Lock()
	if existing, ok := agent.incidents[incident.ID]; ok {
		for i, a := range existing.Actions {
			if a.ID == actionID {
				if err != nil {
					existing.Actions[i].Status = "failed"
					existing.Actions[i].Error = err.Error()
				} else {
					existing.Actions[i].Status = "completed"
					existing.Actions[i].Result = result
					existing.Status = "resolved"
					resolved := time.Now()
					existing.ResolvedAt = &resolved
					existing.Resolution = result
					
					// Update metrics
					agent.metrics.mu.Lock()
					agent.metrics.IncidentsResolved++
					agent.metrics.AutoRemediations++
					agent.metrics.mu.Unlock()
				}
				existing.Actions[i].CompletedAt = &completed
				break
			}
		}
	}
	agent.mu.Unlock()

	if err != nil {
		log.Printf("Remediation failed for incident %s: %v", incident.ID, err)
		// Escalate if remediation failed
		agent.escalateIncident(incident)
	} else {
		log.Printf("Remediation successful for incident %s: %s", incident.ID, result)
	}
}

// shouldEscalate determines if an incident should be escalated to human SRE
func (agent *SREAgent) shouldEscalate(incident *Incident) bool {
	// Always escalate critical incidents
	if incident.Severity == "critical" {
		return true
	}

	// Escalate if we've had multiple failures for this resource
	actionKey := fmt.Sprintf("%s-%s", incident.Resource, "remediate")
	agent.mu.RLock()
	history, hasHistory := agent.actions[actionKey]
	agent.mu.RUnlock()

	if hasHistory && history.Success == 0 && history.Count >= 2 {
		return true // Escalate after 2 failed attempts
	}

	// Check AI analysis recommendation
	if incident.Analysis != nil {
		analysis := strings.ToLower(incident.Analysis.Analysis)
		escalateKeywords := []string{"escalate", "human intervention", "contact sre", "manual review"}
		for _, keyword := range escalateKeywords {
			if strings.Contains(analysis, keyword) {
				return true
			}
		}
	}

	return false
}

// escalateIncident escalates an incident to human SRE
func (agent *SREAgent) escalateIncident(incident *Incident) {
	action := Action{
		ID:          fmt.Sprintf("act-%s-escalate", incident.ID),
		Type:        "escalate",
		Description: "Escalate to human SRE",
		Status:      "completed",
		StartedAt:   time.Now(),
		CompletedAt: &[]time.Time{time.Now()}[0],
		Result:      "Incident escalated to human SRE team",
	}

	agent.mu.Lock()
	if existing, ok := agent.incidents[incident.ID]; ok {
		existing.Actions = append(existing.Actions, action)
		existing.Status = "escalated"
	}
	agent.mu.Unlock()

	// Update metrics
	agent.metrics.mu.Lock()
	agent.metrics.Escalations++
	agent.metrics.mu.Unlock()

	// Send escalation notification
	agent.sendEscalationNotification(incident)

	log.Printf("Incident %s escalated to human SRE", incident.ID)
}

// remediateOOMIncident remediates an OOM (Out of Memory) incident
func (agent *SREAgent) remediateOOMIncident(incident *Incident) (string, error) {
	// Extract pod name from resource (format: "Pod/pod-name")
	parts := strings.Split(incident.Resource, "/")
	if len(parts) != 2 || parts[0] != "Pod" {
		return "", fmt.Errorf("invalid resource format for OOM incident: %s", incident.Resource)
	}
	podName := parts[1]

	// Get the pod to examine its containers
	ctx := context.Background()
	pod, err := agent.app.clientset.CoreV1().Pods(incident.Namespace).Get(ctx, podName, metav1.GetOptions{})
	if err != nil {
		return "", fmt.Errorf("failed to get pod %s: %v", podName, err)
	}

	// Find the deployment/statefulset that owns this pod
	ownerRef := getControllerOwner(pod.OwnerReferences)
	if ownerRef == nil {
		return "", fmt.Errorf("pod %s has no controller owner", podName)
	}

	// Increase memory limits by 50%
	switch ownerRef.Kind {
	case "Deployment":
		return agent.adjustDeploymentMemory(ctx, incident.Namespace, ownerRef.Name, 1.5)
	case "StatefulSet":
		return agent.adjustStatefulSetMemory(ctx, incident.Namespace, ownerRef.Name, 1.5)
	case "ReplicaSet":
		// Find the deployment that owns this replicaset
		return agent.adjustReplicaSetMemory(ctx, incident.Namespace, ownerRef.Name, 1.5)
	default:
		return "", fmt.Errorf("unsupported controller type for OOM remediation: %s", ownerRef.Kind)
	}
}

// remediateCrashLoopIncident remediates a pod crash loop incident
func (agent *SREAgent) remediateCrashLoopIncident(incident *Incident) (string, error) {
	// Extract pod name from resource
	parts := strings.Split(incident.Resource, "/")
	if len(parts) != 2 || parts[0] != "Pod" {
		return "", fmt.Errorf("invalid resource format for crash loop incident: %s", incident.Resource)
	}
	podName := parts[1]

	// Get pod logs to understand the crash
	ctx := context.Background()
	
	// First, check if it's a configuration issue by examining the pod
	pod, err := agent.app.clientset.CoreV1().Pods(incident.Namespace).Get(ctx, podName, metav1.GetOptions{})
	if err != nil {
		return "", fmt.Errorf("failed to get pod %s: %v", podName, err)
	}

	// Check container statuses for clues
	for _, status := range pod.Status.ContainerStatuses {
		if status.State.Waiting != nil {
			reason := status.State.Waiting.Reason
			if reason == "CrashLoopBackOff" || reason == "Error" {
				// Get logs from the last failed container
				logs, err := agent.getPodContainerLogs(ctx, incident.Namespace, podName, status.Name, 10)
				if err == nil {
					// Simple heuristic: if logs contain "error" or "exception", restart with more resources
					if strings.Contains(strings.ToLower(logs), "error") || 
					   strings.Contains(strings.ToLower(logs), "exception") ||
					   strings.Contains(strings.ToLower(logs), "out of memory") {
						// This looks like an OOM or resource issue, increase resources
						return agent.remediateOOMIncident(incident)
					}
				}
			}
		}
	}

	// Default action: restart the pod's controller
	ownerRef := getControllerOwner(pod.OwnerReferences)
	if ownerRef != nil {
		switch ownerRef.Kind {
		case "Deployment":
			err = agent.restartDeployment(ctx, incident.Namespace, ownerRef.Name)
			if err == nil {
				return fmt.Sprintf("Restarted deployment %s/%s to resolve crash loop", incident.Namespace, ownerRef.Name), nil
			}
		case "StatefulSet":
			// For statefulsets, we restart the specific pod
			err = agent.restartPod(ctx, incident.Namespace, podName)
			if err == nil {
				return fmt.Sprintf("Restarted pod %s/%s to resolve crash loop", incident.Namespace, podName), nil
			}
		}
	}

	// Fallback: delete the pod to let it be recreated
	err = agent.app.clientset.CoreV1().Pods(incident.Namespace).Delete(ctx, podName, metav1.DeleteOptions{})
	if err != nil {
		return "", fmt.Errorf("failed to delete pod %s: %v", podName, err)
	}

	return fmt.Sprintf("Deleted pod %s/%s to break crash loop", incident.Namespace, podName), nil
}

// remediateHTTPErrorIncident remediates HTTP 500/502 errors
func (agent *SREAgent) remediateHTTPErrorIncident(incident *Incident) (string, error) {
	// For HTTP errors, we typically want to:
	// 1. Check if it's a single pod issue or widespread
	// 2. Restart affected pods
	// 3. Scale up if needed

	// Extract pod name from resource
	parts := strings.Split(incident.Resource, "/")
	if len(parts) != 2 || parts[0] != "Pod" {
		return "", fmt.Errorf("invalid resource format for HTTP error incident: %s", incident.Resource)
	}
	podName := parts[1]

	ctx := context.Background()
	
	// Get the pod to find its controller
	pod, err := agent.app.clientset.CoreV1().Pods(incident.Namespace).Get(ctx, podName, metav1.GetOptions{})
	if err != nil {
		return "", fmt.Errorf("failed to get pod %s: %v", podName, err)
	}

	ownerRef := getControllerOwner(pod.OwnerReferences)
	if ownerRef == nil {
		// No controller, just restart the pod
		err = agent.restartPod(ctx, incident.Namespace, podName)
		if err != nil {
			return "", err
		}
		return fmt.Sprintf("Restarted pod %s/%s to resolve HTTP errors", incident.Namespace, podName), nil
	}

	// Check how many pods in this controller are having issues
	selector, err := metav1.LabelSelectorAsSelector(&metav1.LabelSelector{
		MatchLabels: pod.Labels,
	})
	if err != nil {
		return "", fmt.Errorf("failed to create selector: %v", err)
	}

	pods, err := agent.app.clientset.CoreV1().Pods(incident.Namespace).List(ctx, metav1.ListOptions{
		LabelSelector: selector.String(),
	})
	if err != nil {
		return "", fmt.Errorf("failed to list pods: %v", err)
	}

	// Count healthy vs unhealthy pods
	var unhealthyPods []string
	for _, p := range pods.Items {
		if !isPodHealthy(&p) {
			unhealthyPods = append(unhealthyPods, p.Name)
		}
	}

	// If more than 50% of pods are unhealthy, scale up
	if len(unhealthyPods) > len(pods.Items)/2 {
		switch ownerRef.Kind {
		case "Deployment":
			// Scale up deployment
			deploy, err := agent.app.clientset.AppsV1().Deployments(incident.Namespace).Get(ctx, ownerRef.Name, metav1.GetOptions{})
			if err != nil {
				return "", fmt.Errorf("failed to get deployment: %v", err)
			}
			
			currentReplicas := int32(1)
			if deploy.Spec.Replicas != nil {
				currentReplicas = *deploy.Spec.Replicas
			}
			
			newReplicas := currentReplicas + 1
			deploy.Spec.Replicas = &newReplicas
			
			_, err = agent.app.clientset.AppsV1().Deployments(incident.Namespace).Update(ctx, deploy, metav1.UpdateOptions{})
			if err != nil {
				return "", fmt.Errorf("failed to scale deployment: %v", err)
			}
			
			return fmt.Sprintf("Scaled deployment %s/%s from %d to %d replicas due to widespread HTTP errors", 
				incident.Namespace, ownerRef.Name, currentReplicas, newReplicas), nil
		case "StatefulSet":
			// For statefulsets, we can't easily scale individual pods, so restart the unhealthy ones
			for _, unhealthyPod := range unhealthyPods {
				err = agent.restartPod(ctx, incident.Namespace, unhealthyPod)
				if err != nil {
					log.Printf("Failed to restart pod %s: %v", unhealthyPod, err)
				}
			}
			return fmt.Sprintf("Restarted %d unhealthy pods in statefulset %s/%s", 
				len(unhealthyPods), incident.Namespace, ownerRef.Name), nil
		default:
			return "", fmt.Errorf("unsupported controller type for HTTP error remediation: %s", ownerRef.Kind)
		}
	} else {
		// Single pod issue, just restart it
		err = agent.restartPod(ctx, incident.Namespace, podName)
		if err != nil {
			return "", err
		}
		return fmt.Sprintf("Restarted pod %s/%s to resolve HTTP errors", incident.Namespace, podName), nil
	}
}

// remediateHPAScalingIncident remediates HPA scaling incidents
func (agent *SREAgent) remediateHPAScalingIncident(incident *Incident) (string, error) {
	// Extract HPA name from resource
	parts := strings.Split(incident.Resource, "/")
	if len(parts) != 2 || parts[0] != "HorizontalPodAutoscaler" {
		return "", fmt.Errorf("invalid resource format for HPA incident: %s", incident.Resource)
	}
	hpaName := parts[1]

	ctx := context.Background()
	
	// Get the HPA
	hpa, err := agent.app.clientset.AutoscalingV2().HorizontalPodAutoscalers(incident.Namespace).Get(ctx, hpaName, metav1.GetOptions{})
	if err != nil {
		return "", fmt.Errorf("failed to get HPA %s: %v", hpaName, err)
	}

	// Check if HPA is at max replicas
	maxReplicas := hpa.Spec.MaxReplicas
	currentReplicas := hpa.Status.CurrentReplicas
	
	if currentReplicas >= maxReplicas {
		// HPA is at max capacity, increase max replicas by 50%
		newMaxReplicas := maxReplicas + (maxReplicas / 2)
		if newMaxReplicas < maxReplicas+1 {
			newMaxReplicas = maxReplicas + 1
		}
		
		hpa.Spec.MaxReplicas = newMaxReplicas
		_, err = agent.app.clientset.AutoscalingV2().HorizontalPodAutoscalers(incident.Namespace).Update(ctx, hpa, metav1.UpdateOptions{})
		if err != nil {
			return "", fmt.Errorf("failed to update HPA max replicas: %v", err)
		}
		
		return fmt.Sprintf("Increased HPA %s/%s max replicas from %d to %d", 
			incident.Namespace, hpaName, maxReplicas, newMaxReplicas), nil
	}

	// HPA is scaling but not at max, this might be normal behavior
	return fmt.Sprintf("HPA %s/%s is scaling normally (current: %d, max: %d)", 
		incident.Namespace, hpaName, currentReplicas, maxReplicas), nil
}

// Helper methods

// adjustDeploymentMemory adjusts memory limits for a deployment
func (agent *SREAgent) adjustDeploymentMemory(ctx context.Context, namespace, name string, multiplier float64) (string, error) {
	deploy, err := agent.app.clientset.AppsV1().Deployments(namespace).Get(ctx, name, metav1.GetOptions{})
	if err != nil {
		return "", fmt.Errorf("failed to get deployment: %v", err)
	}

	adjusted := false
	for i, container := range deploy.Spec.Template.Spec.Containers {
		if container.Resources.Limits != nil {
			if memory, ok := container.Resources.Limits[corev1.ResourceMemory]; ok {
				// Parse current memory
				currentQty := memory
				// Increase by multiplier
				newValue := float64(currentQty.Value()) * multiplier
				newMemory := resource.NewQuantity(int64(newValue), memory.Format)
				
				deploy.Spec.Template.Spec.Containers[i].Resources.Limits[corev1.ResourceMemory] = *newMemory
				adjusted = true
			}
		}
		if container.Resources.Requests != nil {
			if memory, ok := container.Resources.Requests[corev1.ResourceMemory]; ok {
				// Also increase requests
				currentQty := memory
				newValue := float64(currentQty.Value()) * multiplier
				newMemory := resource.NewQuantity(int64(newValue), memory.Format)
				
				deploy.Spec.Template.Spec.Containers[i].Resources.Requests[corev1.ResourceMemory] = *newMemory
			}
		}
	}

	if !adjusted {
		return "", fmt.Errorf("no memory limits found in deployment %s/%s", namespace, name)
	}

	_, err = agent.app.clientset.AppsV1().Deployments(namespace).Update(ctx, deploy, metav1.UpdateOptions{})
	if err != nil {
		return "", fmt.Errorf("failed to update deployment: %v", err)
	}

	return fmt.Sprintf("Increased memory limits for deployment %s/%s by %.0f%%", namespace, name, (multiplier-1)*100), nil
}

// adjustStatefulSetMemory adjusts memory limits for a statefulset
func (agent *SREAgent) adjustStatefulSetMemory(ctx context.Context, namespace, name string, multiplier float64) (string, error) {
	ss, err := agent.app.clientset.AppsV1().StatefulSets(namespace).Get(ctx, name, metav1.GetOptions{})
	if err != nil {
		return "", fmt.Errorf("failed to get statefulset: %v", err)
	}

	adjusted := false
	for i, container := range ss.Spec.Template.Spec.Containers {
		if container.Resources.Limits != nil {
			if memory, ok := container.Resources.Limits[corev1.ResourceMemory]; ok {
				currentQty := memory
				newValue := float64(currentQty.Value()) * multiplier
				newMemory := resource.NewQuantity(int64(newValue), memory.Format)
				
				ss.Spec.Template.Spec.Containers[i].Resources.Limits[corev1.ResourceMemory] = *newMemory
				adjusted = true
			}
		}
		if container.Resources.Requests != nil {
			if memory, ok := container.Resources.Requests[corev1.ResourceMemory]; ok {
				currentQty := memory
				newValue := float64(currentQty.Value()) * multiplier
				newMemory := resource.NewQuantity(int64(newValue), memory.Format)
				
				ss.Spec.Template.Spec.Containers[i].Resources.Requests[corev1.ResourceMemory] = *newMemory
			}
		}
	}

	if !adjusted {
		return "", fmt.Errorf("no memory limits found in statefulset %s/%s", namespace, name)
	}

	_, err = agent.app.clientset.AppsV1().StatefulSets(namespace).Update(ctx, ss, metav1.UpdateOptions{})
	if err != nil {
		return "", fmt.Errorf("failed to update statefulset: %v", err)
	}

	return fmt.Sprintf("Increased memory limits for statefulset %s/%s by %.0f%%", namespace, name, (multiplier-1)*100), nil
}

// adjustReplicaSetMemory adjusts memory limits for a replicaset
func (agent *SREAgent) adjustReplicaSetMemory(ctx context.Context, namespace, name string, multiplier float64) (string, error) {
	rs, err := agent.app.clientset.AppsV1().ReplicaSets(namespace).Get(ctx, name, metav1.GetOptions{})
	if err != nil {
		return "", fmt.Errorf("failed to get replicaset: %v", err)
	}

	// Find the deployment that owns this replicaset
	ownerRef := getControllerOwner(rs.OwnerReferences)
	if ownerRef != nil && ownerRef.Kind == "Deployment" {
		return agent.adjustDeploymentMemory(ctx, namespace, ownerRef.Name, multiplier)
	}

	return "", fmt.Errorf("replicaset %s/%s is not owned by a deployment", namespace, name)
}

// restartDeployment restarts a deployment by updating an annotation
func (agent *SREAgent) restartDeployment(ctx context.Context, namespace, name string) error {
	deploy, err := agent.app.clientset.AppsV1().Deployments(namespace).Get(ctx, name, metav1.GetOptions{})
	if err != nil {
		return err
	}

	if deploy.Spec.Template.Annotations == nil {
		deploy.Spec.Template.Annotations = make(map[string]string)
	}
	
	// Add restart annotation
	deploy.Spec.Template.Annotations["kubectl.kubernetes.io/restartedAt"] = time.Now().Format(time.RFC3339)
	
	_, err = agent.app.clientset.AppsV1().Deployments(namespace).Update(ctx, deploy, metav1.UpdateOptions{})
	return err
}

// restartPod deletes a pod to trigger recreation
func (agent *SREAgent) restartPod(ctx context.Context, namespace, name string) error {
	return agent.app.clientset.CoreV1().Pods(namespace).Delete(ctx, name, metav1.DeleteOptions{})
}

// getPodContainerLogs gets logs from a pod container
func (agent *SREAgent) getPodContainerLogs(ctx context.Context, namespace, podName, containerName string, tailLines int) (string, error) {
	req := agent.app.clientset.CoreV1().Pods(namespace).GetLogs(podName, &corev1.PodLogOptions{
		Container: containerName,
		TailLines: int64Ptr(int64(tailLines)),
	})

	stream, err := req.Stream(ctx)
	if err != nil {
		return "", err
	}
	defer stream.Close()

	buf := make([]byte, 1024)
	var logs strings.Builder
	for {
		n, err := stream.Read(buf)
		if n > 0 {
			logs.Write(buf[:n])
		}
		if err != nil {
			break
		}
	}

	return logs.String(), nil
}

// monitorBatchJobs monitors batch job completion times
func (agent *SREAgent) monitorBatchJobs(ctx context.Context) {
	ticker := time.NewTicker(1 * time.Minute)
	defer ticker.Stop()

	for {
		select {
		case <-agent.stopCh:
			return
		case <-ctx.Done():
			return
		case <-ticker.C:
			if agent.app.clientset == nil || !agent.app.connected {
				continue
			}
			agent.checkBatchJobs(ctx)
		}
	}
}

// checkBatchJobs checks batch jobs for SLO violations
func (agent *SREAgent) checkBatchJobs(ctx context.Context) {
	// Get all jobs
	jobs, err := agent.app.clientset.BatchV1().Jobs("").List(ctx, metav1.ListOptions{})
	if err != nil {
		return
	}

	for _, job := range jobs.Items {
		// Skip completed jobs
		if job.Status.CompletionTime != nil {
			continue
		}

		startTime := job.CreationTimestamp.Time
		duration := time.Since(startTime)

		// Check if job is exceeding SLO
		if duration > agent.config.BatchSLO {
			// Create incident for SLO violation
			incident := &Incident{
				ID:          fmt.Sprintf("batch-%s-%d", job.Name, time.Now().Unix()),
				Type:        "batch_slo_violation",
				Severity:    "high",
				Title:       fmt.Sprintf("Batch job %s exceeding SLO", job.Name),
				Description: fmt.Sprintf("Job %s has been running for %s, exceeding SLO of %s", 
					job.Name, duration.String(), agent.config.BatchSLO.String()),
				Resource:   fmt.Sprintf("Job/%s", job.Name),
				Namespace:  job.Namespace,
				DetectedAt: time.Now(),
				Status:     "open",
				Metadata: map[string]interface{}{
					"duration": duration.String(),
					"slo":      agent.config.BatchSLO.String(),
					"startTime": startTime.Format(time.RFC3339),
				},
			}

			agent.mu.Lock()
			agent.incidents[incident.ID] = incident
			agent.mu.Unlock()

			// Update metrics
			agent.metrics.mu.Lock()
			agent.metrics.BatchSLOViolated++
			agent.metrics.mu.Unlock()

			// Send notification
			if agent.config.NotificationEnabled {
				go agent.sendNotification(incident)
			}
		}
	}
}

// resetHourlyMetrics resets hourly action counters
func (agent *SREAgent) resetHourlyMetrics(ctx context.Context) {
	ticker := time.NewTicker(1 * time.Hour)
	defer ticker.Stop()

	for {
		select {
		case <-agent.stopCh:
			return
		case <-ctx.Done():
			return
		case <-ticker.C:
			agent.metrics.mu.Lock()
			agent.metrics.ActionsThisHour = 0
			agent.metrics.LastHourReset = time.Now()
			agent.metrics.mu.Unlock()
		}
	}
}

// sendNotification sends a notification about an incident
func (agent *SREAgent) sendNotification(incident *Incident) {
	// Update metrics
	agent.metrics.mu.Lock()
	agent.metrics.NotificationsSent++
	agent.metrics.mu.Unlock()

	// In a real implementation, this would send to Slack, PagerDuty, etc.
	log.Printf("SRE Agent Notification: %s - %s", incident.Title, incident.Description)
}

// sendEscalationNotification sends an escalation notification
func (agent *SREAgent) sendEscalationNotification(incident *Incident) {
	log.Printf("SRE Agent Escalation: Incident %s requires human intervention", incident.ID)
}

// notifyRateLimitExceeded notifies about rate limit exceeded
func (agent *SREAgent) notifyRateLimitExceeded(incident *Incident) {
	log.Printf("SRE Agent Rate Limit Exceeded: Cannot auto-remediate incident %s due to rate limits", incident.ID)
}

// Helper functions

// getControllerOwner returns the controller owner reference
func getControllerOwner(ownerRefs []metav1.OwnerReference) *metav1.OwnerReference {
	for _, ref := range ownerRefs {
		if ref.Controller != nil && *ref.Controller {
			return &ref
		}
	}
	return nil
}

// isPodHealthy checks if a pod is healthy
func isPodHealthy(pod *corev1.Pod) bool {
	if pod.Status.Phase != corev1.PodRunning {
		return false
	}
	
	for _, cond := range pod.Status.Conditions {
		if cond.Type == corev1.PodReady && cond.Status != corev1.ConditionTrue {
			return false
		}
	}
	
	return true
}
