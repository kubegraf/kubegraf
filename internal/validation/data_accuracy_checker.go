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

package validation

import (
	"context"
	"fmt"
	"time"

	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"
	metricsclientset "k8s.io/metrics/pkg/client/clientset/versioned"
)

// DataAccuracyChecker validates data accuracy across all resources
type DataAccuracyChecker struct {
	clientset     kubernetes.Interface
	metricsClient metricsclientset.Interface
	ctx           context.Context
}

// NewDataAccuracyChecker creates a new data accuracy checker
func NewDataAccuracyChecker(clientset kubernetes.Interface, metricsClient metricsclientset.Interface, ctx context.Context) *DataAccuracyChecker {
	return &DataAccuracyChecker{
		clientset:     clientset,
		metricsClient: metricsClient,
		ctx:           ctx,
	}
}

// ValidatePods validates pod data accuracy
func (c *DataAccuracyChecker) ValidatePods(namespace string) ([]TestResult, error) {
	startTime := time.Now()
	results := []TestResult{}

	pods, err := c.clientset.CoreV1().Pods(namespace).List(c.ctx, metav1.ListOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to list pods: %w", err)
	}

	podValidator := NewPodValidator()
	for _, pod := range pods.Items {
		// Get metrics for this pod
		var metrics map[string]interface{}
		if c.metricsClient != nil {
			if podMetrics, err := c.metricsClient.MetricsV1beta1().PodMetricses(pod.Namespace).Get(c.ctx, pod.Name, metav1.GetOptions{}); err == nil {
				var totalCPU, totalMemory int64
				for _, cm := range podMetrics.Containers {
					totalCPU += cm.Usage.Cpu().MilliValue()
					totalMemory += cm.Usage.Memory().Value()
				}
				metrics = map[string]interface{}{
					"cpu":    fmt.Sprintf("%dm", totalCPU),
					"memory": fmt.Sprintf("%.0fMi", float64(totalMemory)/(1024*1024)),
				}
			}
		}

		// Calculate displayed data
		ready := 0
		for _, cs := range pod.Status.ContainerStatuses {
			if cs.Ready {
				ready++
			}
		}
		restarts := int32(0)
		for _, cs := range pod.Status.ContainerStatuses {
			restarts += cs.RestartCount
		}

		displayedData := map[string]interface{}{
			"ready":    ready,
			"restarts": restarts,
			"status":   string(pod.Status.Phase),
		}

		// Validate
		result := podValidator.ValidatePodDataAccuracy(&pod, metrics, displayedData)
		
		passed := result.Valid && len(result.Errors) == 0
		testResult := TestResult{
			TestName:  "pod_accuracy",
			Resource:  "pod",
			Namespace: pod.Namespace,
			Name:      pod.Name,
			Passed:    passed,
			Errors:    result.Errors,
			Warnings:  result.Warnings,
			Details: map[string]interface{}{
				"message": result.Message,
			},
			Duration:  time.Since(startTime),
			Timestamp: time.Now(),
		}
		results = append(results, testResult)
	}

	return results, nil
}

// ValidateDeployments validates deployment data accuracy
func (c *DataAccuracyChecker) ValidateDeployments(namespace string) ([]TestResult, error) {
	startTime := time.Now()
	results := []TestResult{}

	deployments, err := c.clientset.AppsV1().Deployments(namespace).List(c.ctx, metav1.ListOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to list deployments: %w", err)
	}

	deploymentValidator := NewDeploymentValidator()
	for _, deployment := range deployments.Items {
		// Get pods for this deployment
		pods, err := c.clientset.CoreV1().Pods(namespace).List(c.ctx, metav1.ListOptions{
			LabelSelector: metav1.FormatLabelSelector(deployment.Spec.Selector),
		})
		if err != nil {
			continue
		}

		// Calculate displayed data
		readyPods := 0
		for _, pod := range pods.Items {
			if pod.Status.Phase == corev1.PodRunning {
				allReady := true
				for _, cs := range pod.Status.ContainerStatuses {
					if !cs.Ready {
						allReady = false
						break
					}
				}
				if allReady && len(pod.Status.ContainerStatuses) > 0 {
					readyPods++
				}
			}
		}

		displayedData := map[string]interface{}{
			"readyReplicas": readyPods,
			"replicas":     *deployment.Spec.Replicas,
		}

		// Validate
		result := deploymentValidator.ValidateDeploymentDataAccuracy(&deployment, pods.Items, displayedData)
		
		passed := result.Valid && len(result.Errors) == 0
		testResult := TestResult{
			TestName:  "deployment_accuracy",
			Resource:  "deployment",
			Namespace: deployment.Namespace,
			Name:      deployment.Name,
			Passed:    passed,
			Errors:    result.Errors,
			Warnings:  result.Warnings,
			Details: map[string]interface{}{
				"message": result.Message,
			},
			Duration:  time.Since(startTime),
			Timestamp: time.Now(),
		}
		results = append(results, testResult)
	}

	return results, nil
}

// ValidateMetrics validates metrics data accuracy
func (c *DataAccuracyChecker) ValidateMetrics(namespace string) ([]TestResult, error) {
	startTime := time.Now()
	results := []TestResult{}

	if c.metricsClient == nil {
		return []TestResult{{
			TestName: "metrics_accuracy",
			Resource: "metrics",
			Passed:   false,
			Errors:   []string{"Metrics client not available"},
			Duration: time.Since(startTime),
			Timestamp: time.Now(),
		}}, nil
	}

	podMetrics, err := c.metricsClient.MetricsV1beta1().PodMetricses(namespace).List(c.ctx, metav1.ListOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to list pod metrics: %w", err)
	}

	metricsValidator := NewMetricsValidator()
	for _, pm := range podMetrics.Items {
		var totalCPU, totalMemory int64
		for _, cm := range pm.Containers {
			totalCPU += cm.Usage.Cpu().MilliValue()
			totalMemory += cm.Usage.Memory().Value()
		}

		displayedCPU := fmt.Sprintf("%dm", totalCPU)
		displayedMemory := fmt.Sprintf("%.0fMi", float64(totalMemory)/(1024*1024))

		result := metricsValidator.ValidateMetricsCalculation(totalCPU, totalMemory, displayedCPU, displayedMemory)
		
		passed := result.Valid && len(result.Errors) == 0
		testResult := TestResult{
			TestName:  "metrics_accuracy",
			Resource:  "metrics",
			Namespace: pm.Namespace,
			Name:      pm.Name,
			Passed:    passed,
			Errors:    result.Errors,
			Warnings:  result.Warnings,
			Details: map[string]interface{}{
				"message": result.Message,
				"cpu":     displayedCPU,
				"memory":  displayedMemory,
			},
			Duration:  time.Since(startTime),
			Timestamp: time.Now(),
		}
		results = append(results, testResult)
	}

	return results, nil
}

// ValidateCost validates cost calculation accuracy
func (c *DataAccuracyChecker) ValidateCost(namespace string) ([]TestResult, error) {
	startTime := time.Now()
	results := []TestResult{}

	// Get nodes for cost calculation
	nodes, err := c.clientset.CoreV1().Nodes().List(c.ctx, metav1.ListOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to list nodes: %w", err)
	}

	costValidator := NewCostValidator()
	for _, node := range nodes.Items {
		// Calculate node cost (simplified - would use actual pricing in production)
		cpuCores := float64(node.Status.Capacity.Cpu().Value())
		memoryGB := float64(node.Status.Capacity.Memory().Value()) / (1024 * 1024 * 1024)
		
		// Simplified cost calculation
		hourlyCost := cpuCores*0.1 + memoryGB*0.01
		dailyCost := hourlyCost * 24
		monthlyCost := hourlyCost * 730

		result := costValidator.ValidateCostCalculation(cpuCores, memoryGB, hourlyCost, dailyCost, monthlyCost)
		
		passed := result.Valid && len(result.Errors) == 0
		testResult := TestResult{
			TestName: "cost_accuracy",
			Resource: "cost",
			Name:     node.Name,
			Passed:   passed,
			Errors:   result.Errors,
			Warnings: result.Warnings,
			Details: map[string]interface{}{
				"message":     result.Message,
				"cpuCores":    cpuCores,
				"memoryGB":    memoryGB,
				"hourlyCost":  hourlyCost,
				"dailyCost":   dailyCost,
				"monthlyCost": monthlyCost,
			},
			Duration:  time.Since(startTime),
			Timestamp: time.Now(),
		}
		results = append(results, testResult)
	}

	return results, nil
}

// ValidateNodes validates node data accuracy
func (c *DataAccuracyChecker) ValidateNodes() ([]TestResult, error) {
	startTime := time.Now()
	results := []TestResult{}

	nodes, err := c.clientset.CoreV1().Nodes().List(c.ctx, metav1.ListOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to list nodes: %w", err)
	}

	for _, node := range nodes.Items {
		// Basic validation
		errors := []string{}
		warnings := []string{}

		if node.Status.Capacity.Cpu().Value() <= 0 {
			errors = append(errors, "Node has zero or negative CPU capacity")
		}
		if node.Status.Capacity.Memory().Value() <= 0 {
			errors = append(errors, "Node has zero or negative memory capacity")
		}

		passed := len(errors) == 0
		testResult := TestResult{
			TestName: "node_accuracy",
			Resource: "node",
			Name:     node.Name,
			Passed:   passed,
			Errors:   errors,
			Warnings: warnings,
			Details: map[string]interface{}{
				"cpu":    node.Status.Capacity.Cpu().String(),
				"memory": node.Status.Capacity.Memory().String(),
			},
			Duration:  time.Since(startTime),
			Timestamp: time.Now(),
		}
		results = append(results, testResult)
	}

	return results, nil
}

// ValidateServices validates service data accuracy
func (c *DataAccuracyChecker) ValidateServices(namespace string) ([]TestResult, error) {
	startTime := time.Now()
	results := []TestResult{}

	services, err := c.clientset.CoreV1().Services(namespace).List(c.ctx, metav1.ListOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to list services: %w", err)
	}

	for _, service := range services.Items {
		errors := []string{}
		warnings := []string{}

		if len(service.Spec.Ports) == 0 {
			warnings = append(warnings, "Service has no ports defined")
		}

		passed := len(errors) == 0
		testResult := TestResult{
			TestName:  "service_accuracy",
			Resource:  "service",
			Namespace: service.Namespace,
			Name:      service.Name,
			Passed:    passed,
			Errors:    errors,
			Warnings:  warnings,
			Details: map[string]interface{}{
				"type":      string(service.Spec.Type),
				"ports":     len(service.Spec.Ports),
			},
			Duration:  time.Since(startTime),
			Timestamp: time.Now(),
		}
		results = append(results, testResult)
	}

	return results, nil
}

