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
	"fmt"
	"math"
	"reflect"
	"time"

	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/resource"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// ValidationResult represents the result of a validation check
type ValidationResult struct {
	Valid   bool
	Message string
	Errors  []string
	Warnings []string
}

// ResourceValidator provides validation methods for Kubernetes resources
type ResourceValidator struct{}

// NewResourceValidator creates a new resource validator
func NewResourceValidator() *ResourceValidator {
	return &ResourceValidator{}
}

// ValidatePodAccuracy validates pod data accuracy
func (v *ResourceValidator) ValidatePodAccuracy(pod *corev1.Pod, metrics map[string]interface{}) ValidationResult {
	result := ValidationResult{
		Valid:    true,
		Errors:   []string{},
		Warnings: []string{},
	}

	// Validate container count matches
	specContainers := len(pod.Spec.Containers)
	statusContainers := len(pod.Status.ContainerStatuses)
	if specContainers != statusContainers && pod.Status.Phase != corev1.PodPending {
		result.Warnings = append(result.Warnings, 
			fmt.Sprintf("Container count mismatch: spec has %d, status has %d", specContainers, statusContainers))
	}

	// Validate ready count calculation
	readyCount := 0
	for _, cs := range pod.Status.ContainerStatuses {
		if cs.Ready {
			readyCount++
		}
	}
	if readyCount > specContainers {
		result.Valid = false
		result.Errors = append(result.Errors, 
			fmt.Sprintf("Ready count (%d) exceeds total containers (%d)", readyCount, specContainers))
	}

	// Validate restart count calculation
	totalRestarts := int32(0)
	for _, cs := range pod.Status.ContainerStatuses {
		if cs.RestartCount < 0 {
			result.Valid = false
			result.Errors = append(result.Errors, 
				fmt.Sprintf("Invalid restart count: %d (negative)", cs.RestartCount))
		}
		totalRestarts += cs.RestartCount
	}

	// Validate age calculation
	if pod.CreationTimestamp.Time.After(time.Now()) {
		result.Valid = false
		result.Errors = append(result.Errors, "Pod creation timestamp is in the future")
	}

	// Validate resource requests/limits
	for i, container := range pod.Spec.Containers {
		if err := v.validateContainerResources(&container, fmt.Sprintf("container[%d]", i)); err != nil {
			result.Warnings = append(result.Warnings, err.Error())
		}
	}

	// Validate metrics if provided
	if metrics != nil {
		if err := v.validatePodMetrics(pod, metrics); err != nil {
			result.Warnings = append(result.Warnings, err.Error())
		}
	}

	if len(result.Errors) > 0 {
		result.Valid = false
		result.Message = fmt.Sprintf("Validation failed with %d error(s)", len(result.Errors))
	} else if len(result.Warnings) > 0 {
		result.Message = fmt.Sprintf("Validation passed with %d warning(s)", len(result.Warnings))
	} else {
		result.Message = "Validation passed"
	}

	return result
}

// ValidateDeploymentAccuracy validates deployment data accuracy
func (v *ResourceValidator) ValidateDeploymentAccuracy(deployment interface{}, pods []corev1.Pod) ValidationResult {
	result := ValidationResult{
		Valid:    true,
		Errors:   []string{},
		Warnings: []string{},
	}

	// Use reflection to handle different deployment types
	deploymentValue := reflect.ValueOf(deployment)
	if deploymentValue.Kind() == reflect.Ptr {
		deploymentValue = deploymentValue.Elem()
	}

	// Get replicas field
	replicasField := deploymentValue.FieldByName("Spec").FieldByName("Replicas")
	replicas := int32(0)
	if replicasField.IsValid() && !replicasField.IsNil() {
		replicas = int32(replicasField.Elem().Int())
	}

	// Count actual running pods
	runningPods := 0
	readyPods := 0
	for _, pod := range pods {
		if pod.Status.Phase == corev1.PodRunning {
			runningPods++
			// Check if pod is ready
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

	// Validate replica counts
	if runningPods > int(replicas) {
		result.Warnings = append(result.Warnings,
			fmt.Sprintf("Running pods (%d) exceed desired replicas (%d)", runningPods, replicas))
	}

	// Get status field
	statusField := deploymentValue.FieldByName("Status")
	if statusField.IsValid() {
		availableReplicasField := statusField.FieldByName("AvailableReplicas")
		if availableReplicasField.IsValid() {
			availableReplicas := int32(availableReplicasField.Int())
			if availableReplicas < 0 {
				result.Valid = false
				result.Errors = append(result.Errors, "Available replicas is negative")
			}
			if availableReplicas > replicas {
				result.Warnings = append(result.Warnings,
					fmt.Sprintf("Available replicas (%d) exceeds desired replicas (%d)", availableReplicas, replicas))
			}
		}
	}

	if len(result.Errors) > 0 {
		result.Valid = false
		result.Message = fmt.Sprintf("Validation failed with %d error(s)", len(result.Errors))
	} else if len(result.Warnings) > 0 {
		result.Message = fmt.Sprintf("Validation passed with %d warning(s)", len(result.Warnings))
	} else {
		result.Message = "Validation passed"
	}

	return result
}

// ValidateMetricsAccuracy validates metrics calculation accuracy
func (v *ResourceValidator) ValidateMetricsAccuracy(actualCPU, actualMemory int64, 
	requestedCPU, requestedMemory *resource.Quantity) ValidationResult {
	result := ValidationResult{
		Valid:    true,
		Errors:   []string{},
		Warnings: []string{},
	}

	// Validate CPU metrics
	if actualCPU < 0 {
		result.Valid = false
		result.Errors = append(result.Errors, "CPU usage cannot be negative")
	}

	// Validate memory metrics
	if actualMemory < 0 {
		result.Valid = false
		result.Errors = append(result.Errors, "Memory usage cannot be negative")
	}

	// Check if usage exceeds requests (warning, not error)
	if requestedCPU != nil && !requestedCPU.IsZero() {
		requestedMilli := requestedCPU.MilliValue()
		if actualCPU > requestedMilli*2 {
			result.Warnings = append(result.Warnings,
				fmt.Sprintf("CPU usage (%dm) is more than 2x requested (%dm)", actualCPU, requestedMilli))
		}
	}

	if requestedMemory != nil && !requestedMemory.IsZero() {
		requestedBytes := requestedMemory.Value()
		if actualMemory > requestedBytes*2 {
			result.Warnings = append(result.Warnings,
				fmt.Sprintf("Memory usage (%d bytes) is more than 2x requested (%d bytes)", actualMemory, requestedBytes))
		}
	}

	if len(result.Errors) > 0 {
		result.Valid = false
		result.Message = fmt.Sprintf("Validation failed with %d error(s)", len(result.Errors))
	} else if len(result.Warnings) > 0 {
		result.Message = fmt.Sprintf("Validation passed with %d warning(s)", len(result.Warnings))
	} else {
		result.Message = "Validation passed"
	}

	return result
}

// ValidateCostAccuracy validates cost calculation accuracy
func (v *ResourceValidator) ValidateCostAccuracy(cpuCores, memoryGB, hourlyCost float64) ValidationResult {
	result := ValidationResult{
		Valid:    true,
		Errors:   []string{},
		Warnings: []string{},
	}

	// Validate inputs
	if cpuCores < 0 {
		result.Valid = false
		result.Errors = append(result.Errors, "CPU cores cannot be negative")
	}
	if memoryGB < 0 {
		result.Valid = false
		result.Errors = append(result.Errors, "Memory GB cannot be negative")
	}
	if hourlyCost < 0 {
		result.Valid = false
		result.Errors = append(result.Errors, "Hourly cost cannot be negative")
	}

	// Validate calculations
	dailyCost := hourlyCost * 24
	monthlyCost := hourlyCost * 730 // 730 hours per month average

	// Check for reasonable bounds (cost should be positive if resources are positive)
	if cpuCores > 0 || memoryGB > 0 {
		if hourlyCost == 0 {
			result.Warnings = append(result.Warnings, "Resources exist but cost is zero")
		}
	}

	// Validate daily/monthly calculations
	if math.Abs(dailyCost-hourlyCost*24) > 0.01 {
		result.Valid = false
		result.Errors = append(result.Errors, "Daily cost calculation is incorrect")
	}
	if math.Abs(monthlyCost-hourlyCost*730) > 0.01 {
		result.Valid = false
		result.Errors = append(result.Errors, "Monthly cost calculation is incorrect")
	}

	if len(result.Errors) > 0 {
		result.Valid = false
		result.Message = fmt.Sprintf("Validation failed with %d error(s)", len(result.Errors))
	} else if len(result.Warnings) > 0 {
		result.Message = fmt.Sprintf("Validation passed with %d warning(s)", len(result.Warnings))
	} else {
		result.Message = "Validation passed"
	}

	return result
}

// validateContainerResources validates container resource requests and limits
func (v *ResourceValidator) validateContainerResources(container *corev1.Container, containerName string) error {
	// Check if requests exceed limits
	if container.Resources.Requests != nil && container.Resources.Limits != nil {
		cpuRequest := container.Resources.Requests[corev1.ResourceCPU]
		cpuLimit := container.Resources.Limits[corev1.ResourceCPU]
		if !cpuRequest.IsZero() && !cpuLimit.IsZero() {
			if cpuRequest.Cmp(cpuLimit) > 0 {
				return fmt.Errorf("%s: CPU request (%s) exceeds limit (%s)", containerName, cpuRequest.String(), cpuLimit.String())
			}
		}

		memRequest := container.Resources.Requests[corev1.ResourceMemory]
		memLimit := container.Resources.Limits[corev1.ResourceMemory]
		if !memRequest.IsZero() && !memLimit.IsZero() {
			if memRequest.Cmp(memLimit) > 0 {
				return fmt.Errorf("%s: Memory request (%s) exceeds limit (%s)", containerName, memRequest.String(), memLimit.String())
			}
		}
	}
	return nil
}

// validatePodMetrics validates pod metrics accuracy
func (v *ResourceValidator) validatePodMetrics(pod *corev1.Pod, metrics map[string]interface{}) error {
	// Validate metrics structure
	cpu, cpuOk := metrics["cpu"]
	memory, memOk := metrics["memory"]

	if !cpuOk && !memOk {
		return fmt.Errorf("No metrics data provided")
	}

	// Validate CPU metric format
	if cpuOk {
		cpuStr, ok := cpu.(string)
		if !ok {
			return fmt.Errorf("CPU metric is not a string")
		}
		// Should be in format like "100m" or "1"
		if len(cpuStr) == 0 {
			return fmt.Errorf("CPU metric is empty")
		}
	}

	// Validate memory metric format
	if memOk {
		memStr, ok := memory.(string)
		if !ok {
			return fmt.Errorf("Memory metric is not a string")
		}
		// Should be in format like "100Mi" or "1Gi"
		if len(memStr) == 0 {
			return fmt.Errorf("Memory metric is empty")
		}
	}

	return nil
}

// ValidateAgeCalculation validates age calculation from timestamp
func (v *ResourceValidator) ValidateAgeCalculation(creationTime metav1.Time) (time.Duration, ValidationResult) {
	result := ValidationResult{
		Valid:    true,
		Errors:   []string{},
		Warnings: []string{},
	}

	now := time.Now()
	age := now.Sub(creationTime.Time)

	// Age cannot be negative
	if age < 0 {
		result.Valid = false
		result.Errors = append(result.Errors, "Age calculation resulted in negative duration")
		return age, result
	}

	// Age should not be too large (more than 10 years is suspicious)
	if age > 10*365*24*time.Hour {
		result.Warnings = append(result.Warnings, "Age is unusually large (more than 10 years)")
	}

	result.Message = "Age calculation is valid"
	return age, result
}

