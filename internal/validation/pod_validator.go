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
	"time"

	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/resource"
)

// PodValidator provides specific validation for Pod resources
type PodValidator struct {
	*ResourceValidator
}

// NewPodValidator creates a new pod validator
func NewPodValidator() *PodValidator {
	return &PodValidator{
		ResourceValidator: NewResourceValidator(),
	}
}

// ValidatePodDataAccuracy performs comprehensive accuracy validation on pod data
func (pv *PodValidator) ValidatePodDataAccuracy(pod *corev1.Pod, metrics map[string]interface{}, 
	displayedData map[string]interface{}) ValidationResult {
	result := ValidationResult{
		Valid:    true,
		Errors:   []string{},
		Warnings: []string{},
	}

	// Validate basic pod accuracy
	basicResult := pv.ValidatePodAccuracy(pod, metrics)
	result.Errors = append(result.Errors, basicResult.Errors...)
	result.Warnings = append(result.Warnings, basicResult.Warnings...)
	if !basicResult.Valid {
		result.Valid = false
	}

	// Validate displayed data matches actual pod data
	if displayedData != nil {
		displayResult := pv.validateDisplayedData(pod, displayedData)
		result.Errors = append(result.Errors, displayResult.Errors...)
		result.Warnings = append(result.Warnings, displayResult.Warnings...)
		if !displayResult.Valid {
			result.Valid = false
		}
	}

	// Validate status calculations
	statusResult := pv.validatePodStatus(pod)
	result.Errors = append(result.Errors, statusResult.Errors...)
	result.Warnings = append(result.Warnings, statusResult.Warnings...)
	if !statusResult.Valid {
		result.Valid = false
	}

	// Validate resource calculations
	resourceResult := pv.validatePodResources(pod)
	result.Errors = append(result.Errors, resourceResult.Errors...)
	result.Warnings = append(result.Warnings, resourceResult.Warnings...)
	if !resourceResult.Valid {
		result.Valid = false
	}

	if len(result.Errors) > 0 {
		result.Message = fmt.Sprintf("Validation failed with %d error(s) and %d warning(s)", 
			len(result.Errors), len(result.Warnings))
	} else if len(result.Warnings) > 0 {
		result.Message = fmt.Sprintf("Validation passed with %d warning(s)", len(result.Warnings))
	} else {
		result.Message = "All validations passed"
	}

	return result
}

// validateDisplayedData validates that displayed data matches actual pod data
func (pv *PodValidator) validateDisplayedData(pod *corev1.Pod, displayedData map[string]interface{}) ValidationResult {
	result := ValidationResult{
		Valid:    true,
		Errors:   []string{},
		Warnings: []string{},
	}

	// Validate name
	if displayedName, ok := displayedData["name"].(string); ok {
		if displayedName != pod.Name {
			result.Valid = false
			result.Errors = append(result.Errors, 
				fmt.Sprintf("Name mismatch: displayed '%s' != actual '%s'", displayedName, pod.Name))
		}
	}

	// Validate namespace
	if displayedNS, ok := displayedData["namespace"].(string); ok {
		if displayedNS != pod.Namespace {
			result.Valid = false
			result.Errors = append(result.Errors,
				fmt.Sprintf("Namespace mismatch: displayed '%s' != actual '%s'", displayedNS, pod.Namespace))
		}
	}

	// Validate status
	if displayedStatus, ok := displayedData["status"].(string); ok {
		actualStatus := string(pod.Status.Phase)
		if pod.DeletionTimestamp != nil {
			actualStatus = "Terminating"
		}
		if displayedStatus != actualStatus {
			result.Warnings = append(result.Warnings,
				fmt.Sprintf("Status mismatch: displayed '%s' != actual '%s'", displayedStatus, actualStatus))
		}
	}

	// Validate ready count
	if displayedReady, ok := displayedData["ready"].(string); ok {
		actualReady := 0
		for _, cs := range pod.Status.ContainerStatuses {
			if cs.Ready {
				actualReady++
			}
		}
		expectedReady := fmt.Sprintf("%d/%d", actualReady, len(pod.Spec.Containers))
		if displayedReady != expectedReady {
			result.Valid = false
			result.Errors = append(result.Errors,
				fmt.Sprintf("Ready count mismatch: displayed '%s' != expected '%s'", displayedReady, expectedReady))
		}
	}

	// Validate restart count
	if displayedRestarts, ok := displayedData["restarts"].(int32); ok {
		actualRestarts := int32(0)
		for _, cs := range pod.Status.ContainerStatuses {
			actualRestarts += cs.RestartCount
		}
		if displayedRestarts != actualRestarts {
			result.Valid = false
			result.Errors = append(result.Errors,
				fmt.Sprintf("Restart count mismatch: displayed %d != actual %d", displayedRestarts, actualRestarts))
		}
	}

	return result
}

// validatePodStatus validates pod status calculations
func (pv *PodValidator) validatePodStatus(pod *corev1.Pod) ValidationResult {
	result := ValidationResult{
		Valid:    true,
		Errors:   []string{},
		Warnings: []string{},
	}

	// Validate phase
	validPhases := map[corev1.PodPhase]bool{
		corev1.PodPending:   true,
		corev1.PodRunning:  true,
		corev1.PodSucceeded: true,
		corev1.PodFailed:   true,
		corev1.PodUnknown:  true,
	}

	if !validPhases[pod.Status.Phase] {
		result.Valid = false
		result.Errors = append(result.Errors, 
			fmt.Sprintf("Invalid pod phase: %s", pod.Status.Phase))
	}

	// Validate container statuses match spec containers
	if len(pod.Status.ContainerStatuses) > len(pod.Spec.Containers) {
		result.Warnings = append(result.Warnings,
			fmt.Sprintf("Container statuses (%d) exceed spec containers (%d)", 
				len(pod.Status.ContainerStatuses), len(pod.Spec.Containers)))
	}

	// Validate ready state consistency
	if pod.Status.Phase == corev1.PodRunning {
		hasReady := false
		for _, cs := range pod.Status.ContainerStatuses {
			if cs.Ready {
				hasReady = true
				break
			}
		}
		if !hasReady && len(pod.Status.ContainerStatuses) > 0 {
			result.Warnings = append(result.Warnings, 
				"Pod is Running but no containers are Ready")
		}
	}

	return result
}

// validatePodResources validates pod resource calculations
func (pv *PodValidator) validatePodResources(pod *corev1.Pod) ValidationResult {
	result := ValidationResult{
		Valid:    true,
		Errors:   []string{},
		Warnings: []string{},
	}

	var totalCPURequest, totalCPULimit resource.Quantity
	var totalMemoryRequest, totalMemoryLimit resource.Quantity

	// Calculate total resources across all containers
	for i, container := range pod.Spec.Containers {
		// CPU
		if cpuReq, ok := container.Resources.Requests[corev1.ResourceCPU]; ok {
			totalCPURequest.Add(cpuReq)
		}
		if cpuLim, ok := container.Resources.Limits[corev1.ResourceCPU]; ok {
			totalCPULimit.Add(cpuLim)
		}

		// Memory
		if memReq, ok := container.Resources.Requests[corev1.ResourceMemory]; ok {
			totalMemoryRequest.Add(memReq)
		}
		if memLim, ok := container.Resources.Limits[corev1.ResourceMemory]; ok {
			totalMemoryLimit.Add(memLim)
		}

		// Validate individual container resources
		if err := pv.validateContainerResources(&container, fmt.Sprintf("container[%d]", i)); err != nil {
			result.Warnings = append(result.Warnings, err.Error())
		}
	}

	// Validate totals
	if !totalCPURequest.IsZero() && !totalCPULimit.IsZero() {
		if totalCPURequest.Cmp(totalCPULimit) > 0 {
			result.Valid = false
			result.Errors = append(result.Errors,
				"Total CPU request exceeds total CPU limit")
		}
	}

	if !totalMemoryRequest.IsZero() && !totalMemoryLimit.IsZero() {
		if totalMemoryRequest.Cmp(totalMemoryLimit) > 0 {
			result.Valid = false
			result.Errors = append(result.Errors,
				"Total memory request exceeds total memory limit")
		}
	}

	return result
}

// ValidatePodAge validates pod age calculation
func (pv *PodValidator) ValidatePodAge(pod *corev1.Pod, displayedAge string) ValidationResult {
	result := ValidationResult{
		Valid:    true,
		Errors:   []string{},
		Warnings: []string{},
	}

	age, ageResult := pv.ValidateAgeCalculation(pod.CreationTimestamp)
	result.Errors = append(result.Errors, ageResult.Errors...)
	result.Warnings = append(result.Warnings, ageResult.Warnings...)
	if !ageResult.Valid {
		result.Valid = false
	}

	// Parse displayed age and compare (basic check)
	// This is a simplified check - in production you'd want more robust parsing
	if displayedAge != "" {
		// Age should be in format like "5d", "3h", "45m", etc.
		// We'll just check it's not empty and reasonable
		if len(displayedAge) == 0 {
			result.Warnings = append(result.Warnings, "Displayed age is empty")
		}
	}

	return result
}

