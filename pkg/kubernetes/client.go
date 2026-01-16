// Copyright 2025 KubeGraf Contributors
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package kubernetes

import (
	"context"
	"fmt"
	"strings"
	"time"

	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
	metricsclientset "k8s.io/metrics/pkg/client/clientset/versioned"
)

// Client provides enhanced Kubernetes client functionality
type Client struct {
	clientset     *kubernetes.Clientset
	metricsClient *metricsclientset.Clientset
	config        *rest.Config
	timeout       time.Duration
}

// NewClient creates a new Kubernetes client
func NewClient(config *rest.Config) (*Client, error) {
	clientset, err := kubernetes.NewForConfig(config)
	if err != nil {
		return nil, fmt.Errorf("failed to create kubernetes clientset: %w", err)
	}

	metricsClient, err := metricsclientset.NewForConfig(config)
	if err != nil {
		// Metrics client is optional, don't fail if not available
		metricsClient = nil
	}

	return &Client{
		clientset:     clientset,
		metricsClient: metricsClient,
		config:        config,
		timeout:       30 * time.Second,
	}, nil
}

// ResourceHealth represents the health status of a Kubernetes resource
type ResourceHealth struct {
	Name        string            `json:"name"`
	Namespace   string            `json:"namespace"`
	Status      string            `json:"status"`
	Ready       bool              `json:"ready"`
	Message     string            `json:"message"`
	Issues      []HealthIssue     `json:"issues"`
	Metrics     *ResourceMetrics  `json:"metrics,omitempty"`
	LastChecked time.Time         `json:"last_checked"`
}

// HealthIssue represents a specific health issue
type HealthIssue struct {
	Type        string `json:"type"`
	Severity    string `json:"severity"` // critical, warning, info
	Message     string `json:"message"`
	Suggestion  string `json:"suggestion"`
	Resource    string `json:"resource"`
	Occurrences int    `json:"occurrences"`
}

// ResourceMetrics contains resource usage metrics
type ResourceMetrics struct {
	CPUUsage      string `json:"cpu_usage"`
	MemoryUsage   string `json:"memory_usage"`
	RestartCount  int32  `json:"restart_count"`
	Age           string `json:"age"`
	ReadyReplicas int32  `json:"ready_replicas,omitempty"`
	TotalReplicas int32  `json:"total_replicas,omitempty"`
}

// CheckPodHealth checks the health of a specific pod
func (c *Client) CheckPodHealth(ctx context.Context, namespace, name string) (*ResourceHealth, error) {
	ctx, cancel := context.WithTimeout(ctx, c.timeout)
	defer cancel()

	pod, err := c.clientset.CoreV1().Pods(namespace).Get(ctx, name, metav1.GetOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to get pod: %w", err)
	}

	health := &ResourceHealth{
		Name:        pod.Name,
		Namespace:   pod.Namespace,
		Status:      string(pod.Status.Phase),
		LastChecked: time.Now(),
		Issues:      []HealthIssue{},
	}

	// Analyze pod status
	c.analyzePodStatus(pod, health)

	// Get metrics if available
	if c.metricsClient != nil {
		metrics, err := c.getPodMetrics(ctx, namespace, name)
		if err == nil {
			health.Metrics = metrics
		}
	}

	return health, nil
}

// analyzePodStatus analyzes pod status and identifies issues
func (c *Client) analyzePodStatus(pod *corev1.Pod, health *ResourceHealth) {
	// Check if pod is running
	if pod.Status.Phase != corev1.PodRunning {
		health.Ready = false
		health.Issues = append(health.Issues, HealthIssue{
			Type:       "PodStatus",
			Severity:   "critical",
			Message:    fmt.Sprintf("Pod is in %s phase", pod.Status.Phase),
			Suggestion: "Check pod events and logs for issues",
			Resource:   pod.Name,
			Occurrences: 1,
		})
		return
	}

	// Check container statuses
	totalContainers := len(pod.Status.ContainerStatuses)
	readyContainers := 0
	restartCount := int32(0)

	for _, containerStatus := range pod.Status.ContainerStatuses {
		if containerStatus.Ready {
			readyContainers++
		}
		restartCount += containerStatus.RestartCount

		// Check for container issues
		if containerStatus.State.Waiting != nil {
			health.Issues = append(health.Issues, HealthIssue{
				Type:       "ContainerWaiting",
				Severity:   "warning",
				Message:    fmt.Sprintf("Container %s is waiting: %s", containerStatus.Name, containerStatus.State.Waiting.Reason),
				Suggestion: c.getSuggestionForWaitingState(containerStatus.State.Waiting.Reason),
				Resource:   containerStatus.Name,
				Occurrences: 1,
			})
		}

		if containerStatus.State.Terminated != nil {
			severity := "warning"
			if containerStatus.State.Terminated.ExitCode != 0 {
				severity = "critical"
			}
			health.Issues = append(health.Issues, HealthIssue{
				Type:       "ContainerTerminated",
				Severity:   severity,
				Message:    fmt.Sprintf("Container %s terminated with exit code %d: %s", containerStatus.Name, containerStatus.State.Terminated.ExitCode, containerStatus.State.Terminated.Reason),
				Suggestion: "Check container logs for error details",
				Resource:   containerStatus.Name,
				Occurrences: 1,
			})
		}
	}

	// Check readiness
	if readyContainers == totalContainers {
		health.Ready = true
		health.Message = "All containers are ready"
	} else {
		health.Ready = false
		health.Message = fmt.Sprintf("%d/%d containers are ready", readyContainers, totalContainers)
	}

	// Check for high restart count
	if restartCount > 5 {
		health.Issues = append(health.Issues, HealthIssue{
			Type:       "HighRestartCount",
			Severity:   "warning",
			Message:    fmt.Sprintf("Container has restarted %d times", restartCount),
			Suggestion: "Investigate application logs for crash reasons",
			Resource:   pod.Name,
			Occurrences: int(restartCount),
		})
	}

	// Set metrics
	health.Metrics = &ResourceMetrics{
		RestartCount: restartCount,
		Age:          time.Since(pod.CreationTimestamp.Time).Round(time.Minute).String(),
	}
}

// getSuggestionForWaitingState provides suggestions based on waiting state reason
func (c *Client) getSuggestionForWaitingState(reason string) string {
	switch strings.ToLower(reason) {
	case "crashloopbackoff":
		return "Application is crashing repeatedly. Check logs for errors."
	case "imagepullbackoff", "errimagepull":
		return "Cannot pull container image. Check image name and registry access."
	case "containercreating":
		return "Container is being created. Wait a moment and check again."
	case "pending":
		return "Pod is pending. Check node resources and scheduling constraints."
	default:
		return "Check container events for more details."
	}
}

// getPodMetrics retrieves pod metrics
func (c *Client) getPodMetrics(ctx context.Context, namespace, name string) (*ResourceMetrics, error) {
	if c.metricsClient == nil {
		return nil, fmt.Errorf("metrics client not available")
	}

	metrics, err := c.metricsClient.MetricsV1beta1().PodMetricses(namespace).Get(ctx, name, metav1.GetOptions{})
	if err != nil {
		return nil, err
	}

	// Calculate total CPU and memory usage
	var totalCPU, totalMemory string
	for _, container := range metrics.Containers {
		if container.Usage != nil {
			if cpu, ok := container.Usage[corev1.ResourceCPU]; ok {
				totalCPU = cpu.String()
			}
			if memory, ok := container.Usage[corev1.ResourceMemory]; ok {
				totalMemory = memory.String()
			}
		}
	}

	return &ResourceMetrics{
		CPUUsage:    totalCPU,
		MemoryUsage: totalMemory,
	}, nil
}

// CheckDeploymentHealth checks the health of a deployment
func (c *Client) CheckDeploymentHealth(ctx context.Context, namespace, name string) (*ResourceHealth, error) {
	ctx, cancel := context.WithTimeout(ctx, c.timeout)
	defer cancel()

	deployment, err := c.clientset.AppsV1().Deployments(namespace).Get(ctx, name, metav1.GetOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to get deployment: %w", err)
	}

	health := &ResourceHealth{
		Name:        deployment.Name,
		Namespace:   deployment.Namespace,
		Status:      "Unknown",
		LastChecked: time.Now(),
		Issues:      []HealthIssue{},
	}

	// Analyze deployment status
	c.analyzeDeploymentStatus(deployment, health)

	return health, nil
}

// analyzeDeploymentStatus analyzes deployment status
func (c *Client) analyzeDeploymentStatus(deployment *appsv1.Deployment, health *ResourceHealth) {
	// Check if deployment is available
	available := false
	for _, condition := range deployment.Status.Conditions {
		if condition.Type == appsv1.DeploymentAvailable && condition.Status == corev1.ConditionTrue {
			available = true
			break
		}
	}

	if !available {
		health.Ready = false
		health.Status = "Not Available"
		health.Issues = append(health.Issues, HealthIssue{
			Type:       "DeploymentNotAvailable",
			Severity:   "critical",
			Message:    "Deployment is not available",
			Suggestion: "Check pod status and events for issues",
			Resource:   deployment.Name,
			Occurrences: 1,
		})
		return
	}

	// Check replica status
	desiredReplicas := *deployment.Spec.Replicas
	readyReplicas := deployment.Status.ReadyReplicas

	health.Metrics = &ResourceMetrics{
		ReadyReplicas: readyReplicas,
		TotalReplicas: desiredReplicas,
		Age:           time.Since(deployment.CreationTimestamp.Time).Round(time.Minute).String(),
	}

	if readyReplicas == desiredReplicas {
		health.Ready = true
		health.Status = "Healthy"
		health.Message = fmt.Sprintf("All %d replicas are ready", desiredReplicas)
	} else {
		health.Ready = false
		health.Status = "Degraded"
		health.Message = fmt.Sprintf("%d/%d replicas are ready", readyReplicas, desiredReplicas)
		
		health.Issues = append(health.Issues, HealthIssue{
			Type:       "ReplicaMismatch",
			Severity:   "warning",
			Message:    fmt.Sprintf("Only %d out of %d replicas are ready", readyReplicas, desiredReplicas),
			Suggestion: "Check pod status and events for deployment issues",
			Resource:   deployment.Name,
			Occurrences: int(desiredReplicas - readyReplicas),
		})
	}

	// Check for high revision (indicates frequent updates)
	if deployment.Status.ObservedGeneration > 10 {
		health.Issues = append(health.Issues, HealthIssue{
			Type:       "HighRevisionCount",
			Severity:   "info",
			Message:    fmt.Sprintf("Deployment has %d revisions", deployment.Status.ObservedGeneration),
			Suggestion: "Consider cleaning up old replica sets",
			Resource:   deployment.Name,
			Occurrences: int(deployment.Status.ObservedGeneration),
		})
	}
}

// GetDeploymentHistory retrieves the rollout history of a deployment
func (c *Client) GetDeploymentHistory(ctx context.Context, namespace, name string) ([]DeploymentRevision, error) {
	ctx, cancel := context.WithTimeout(ctx, c.timeout)
	defer cancel()

	// Get replica sets for the deployment
	replicaSets, err := c.clientset.AppsV1().ReplicaSets(namespace).List(ctx, metav1.ListOptions{
		LabelSelector: fmt.Sprintf("app=%s", name), // This might need adjustment based on your labels
	})
	if err != nil {
		return nil, fmt.Errorf("failed to list replica sets: %w", err)
	}

	var history []DeploymentRevision
	for _, rs := range replicaSets.Items {
		revision := rs.Annotations["deployment.kubernetes.io/revision"]
		if revision != "" {
			history = append(history, DeploymentRevision{
				Revision:    revision,
				Name:        rs.Name,
				CreatedAt:   rs.CreationTimestamp.Time,
				Replicas:    *rs.Spec.Replicas,
				ReadyReplicas: rs.Status.ReadyReplicas,
				IsCurrent:   rs.Status.Replicas > 0,
			})
		}
	}

	return history, nil
}

// DeploymentRevision represents a deployment revision
type DeploymentRevision struct {
	Revision      string    `json:"revision"`
	Name          string    `json:"name"`
	CreatedAt     time.Time `json:"created_at"`
	Replicas      int32     `json:"replicas"`
	ReadyReplicas int32     `json:"ready_replicas"`
	IsCurrent     bool      `json:"is_current"`
}

// RollbackDeployment performs a deployment rollback
func (c *Client) RollbackDeployment(ctx context.Context, namespace, name string, revision string) error {
	ctx, cancel := context.WithTimeout(ctx, c.timeout)
	defer cancel()

	// Get the deployment
	deployment, err := c.clientset.AppsV1().Deployments(namespace).Get(ctx, name, metav1.GetOptions{})
	if err != nil {
		return fmt.Errorf("failed to get deployment: %w", err)
	}

	// Find the target revision
	replicaSets, err := c.clientset.AppsV1().ReplicaSets(namespace).List(ctx, metav1.ListOptions{
		LabelSelector: fmt.Sprintf("app=%s", deployment.Labels["app"]),
	})
	if err != nil {
		return fmt.Errorf("failed to list replica sets: %w", err)
	}

	var targetRS *appsv1.ReplicaSet
	for _, rs := range replicaSets.Items {
		if rs.Annotations["deployment.kubernetes.io/revision"] == revision {
			targetRS = &rs
			break
		}
	}

	if targetRS == nil {
		return fmt.Errorf("revision %s not found", revision)
	}

	// Update deployment to match target revision
	deployment.Spec.Template = targetRS.Spec.Template
	_, err = c.clientset.AppsV1().Deployments(namespace).Update(ctx, deployment, metav1.UpdateOptions{})
	if err != nil {
		return fmt.Errorf("failed to update deployment: %w", err)
	}

	return nil
}

// ScaleDeployment scales a deployment
func (c *Client) ScaleDeployment(ctx context.Context, namespace, name string, replicas int32) error {
	ctx, cancel := context.WithTimeout(ctx, c.timeout)
	defer cancel()

	// Get the deployment
	deployment, err := c.clientset.AppsV1().Deployments(namespace).Get(ctx, name, metav1.GetOptions{})
	if err != nil {
		return fmt.Errorf("failed to get deployment: %w", err)
	}

	// Update replica count
	deployment.Spec.Replicas = &replicas
	_, err = c.clientset.AppsV1().Deployments(namespace).Update(ctx, deployment, metav1.UpdateOptions{})
	if err != nil {
		return fmt.Errorf("failed to scale deployment: %w", err)
	}

	return nil
}

// RestartDeployment restarts a deployment by updating the pod template
func (c *Client) RestartDeployment(ctx context.Context, namespace, name string) error {
	ctx, cancel := context.WithTimeout(ctx, c.timeout)
	defer cancel()

	// Get the deployment
	deployment, err := c.clientset.AppsV1().Deployments(namespace).Get(ctx, name, metav1.GetOptions{})
	if err != nil {
		return fmt.Errorf("failed to get deployment: %w", err)
	}

	// Add restart annotation to force pod recreation
	if deployment.Spec.Template.Annotations == nil {
		deployment.Spec.Template.Annotations = make(map[string]string)
	}
	deployment.Spec.Template.Annotations["kubectl.kubernetes.io/restartedAt"] = time.Now().Format(time.RFC3339)

	_, err = c.clientset.AppsV1().Deployments(namespace).Update(ctx, deployment, metav1.UpdateOptions{})
	if err != nil {
		return fmt.Errorf("failed to restart deployment: %w", err)
	}

	return nil
}

// GetPodLogs retrieves pod logs
func (c *Client) GetPodLogs(ctx context.Context, namespace, name string, container string, previous bool) (string, error) {
	ctx, cancel := context.WithTimeout(ctx, c.timeout)
	defer cancel()

	opts := &corev1.PodLogOptions{
		Previous: previous,
	}

	if container != "" {
		opts.Container = container
	}

	req := c.clientset.CoreV1().Pods(namespace).GetLogs(name, opts)
	logs, err := req.DoRaw(ctx)
	if err != nil {
		return "", fmt.Errorf("failed to get pod logs: %w", err)
	}

	return string(logs), nil
}

// GetEvents retrieves events for a resource
func (c *Client) GetEvents(ctx context.Context, namespace, resourceType, name string) ([]corev1.Event, error) {
	ctx, cancel := context.WithTimeout(ctx, c.timeout)
	defer cancel()

	fieldSelector := c.getFieldSelector(resourceType, name)
	events, err := c.clientset.CoreV1().Events(namespace).List(ctx, metav1.ListOptions{
		FieldSelector: fieldSelector,
		TypeMeta:      metav1.TypeMeta{Kind: "Event"},
	})
	if err != nil {
		return nil, fmt.Errorf("failed to list events: %w", err)
	}

	return events.Items, nil
}

// getFieldSelector creates a field selector for events
func (c *Client) getFieldSelector(resourceType, name string) string {
	resourceType = strings.ToLower(resourceType)
	switch resourceType {
	case "pod":
		return fmt.Sprintf("involvedObject.name=%s,involvedObject.kind=Pod", name)
	case "deployment":
		return fmt.Sprintf("involvedObject.name=%s,involvedObject.kind=Deployment", name)
	case "service":
		return fmt.Sprintf("involvedObject.name=%s,involvedObject.kind=Service", name)
	default:
		return fmt.Sprintf("involvedObject.name=%s", name)
	}
}