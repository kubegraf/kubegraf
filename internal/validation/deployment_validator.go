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

	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
)

// DeploymentValidator provides specific validation for Deployment resources
type DeploymentValidator struct {
	*ResourceValidator
}

// NewDeploymentValidator creates a new deployment validator
func NewDeploymentValidator() *DeploymentValidator {
	return &DeploymentValidator{
		ResourceValidator: NewResourceValidator(),
	}
}

// ValidateDeploymentDataAccuracy performs comprehensive accuracy validation on deployment data
func (dv *DeploymentValidator) ValidateDeploymentDataAccuracy(deployment *appsv1.Deployment, 
	pods []corev1.Pod, displayedData map[string]interface{}) ValidationResult {
	result := ValidationResult{
		Valid:    true,
		Errors:   []string{},
		Warnings: []string{},
	}

	// Validate basic deployment accuracy
	basicResult := dv.ValidateDeploymentAccuracy(deployment, pods)
	result.Errors = append(result.Errors, basicResult.Errors...)
	result.Warnings = append(result.Warnings, basicResult.Warnings...)
	if !basicResult.Valid {
		result.Valid = false
	}

	// Validate replica calculations
	replicaResult := dv.validateReplicaCalculations(deployment, pods)
	result.Errors = append(result.Errors, replicaResult.Errors...)
	result.Warnings = append(result.Warnings, replicaResult.Warnings...)
	if !replicaResult.Valid {
		result.Valid = false
	}

	// Validate displayed data matches actual deployment data
	if displayedData != nil {
		displayResult := dv.validateDisplayedData(deployment, displayedData, pods)
		result.Errors = append(result.Errors, displayResult.Errors...)
		result.Warnings = append(result.Warnings, displayResult.Warnings...)
		if !displayResult.Valid {
			result.Valid = false
		}
	}

	// Validate status consistency
	statusResult := dv.validateDeploymentStatus(deployment, pods)
	result.Errors = append(result.Errors, statusResult.Errors...)
	result.Warnings = append(result.Warnings, statusResult.Warnings...)
	if !statusResult.Valid {
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

// validateReplicaCalculations validates replica count calculations
func (dv *DeploymentValidator) validateReplicaCalculations(deployment *appsv1.Deployment, pods []corev1.Pod) ValidationResult {
	result := ValidationResult{
		Valid:    true,
		Errors:   []string{},
		Warnings: []string{},
	}

	desiredReplicas := int32(1)
	if deployment.Spec.Replicas != nil {
		desiredReplicas = *deployment.Spec.Replicas
	}

	// Count pods belonging to this deployment
	actualPods := 0
	runningPods := 0
	readyPods := 0

	for _, pod := range pods {
		// Check if pod belongs to this deployment
		if pod.Labels != nil {
			appLabel := pod.Labels["app"]
			appNameLabel := pod.Labels["app.kubernetes.io/name"]
			deploymentName := deployment.Name

			if appLabel == deploymentName || appNameLabel == deploymentName {
				actualPods++
				if pod.Status.Phase == corev1.PodRunning {
					runningPods++
					// Check if all containers are ready
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
		}
	}

	// Validate counts
	if actualPods > int(desiredReplicas) {
		result.Warnings = append(result.Warnings,
			fmt.Sprintf("Actual pods (%d) exceed desired replicas (%d)", actualPods, desiredReplicas))
	}

	// Validate status matches actual counts
	if deployment.Status.Replicas != int32(actualPods) {
		result.Warnings = append(result.Warnings,
			fmt.Sprintf("Status replicas (%d) doesn't match actual pods (%d)",
				deployment.Status.Replicas, actualPods))
	}

	if deployment.Status.AvailableReplicas != int32(readyPods) {
		result.Warnings = append(result.Warnings,
			fmt.Sprintf("Status available replicas (%d) doesn't match ready pods (%d)",
				deployment.Status.AvailableReplicas, readyPods))
	}

	if deployment.Status.ReadyReplicas != int32(readyPods) {
		result.Warnings = append(result.Warnings,
			fmt.Sprintf("Status ready replicas (%d) doesn't match ready pods (%d)",
				deployment.Status.ReadyReplicas, readyPods))
	}

	return result
}

// validateDisplayedData validates that displayed data matches actual deployment data
func (dv *DeploymentValidator) validateDisplayedData(deployment *appsv1.Deployment,
	displayedData map[string]interface{}, pods []corev1.Pod) ValidationResult {
	result := ValidationResult{
		Valid:    true,
		Errors:   []string{},
		Warnings: []string{},
	}

	// Validate name
	if displayedName, ok := displayedData["name"].(string); ok {
		if displayedName != deployment.Name {
			result.Valid = false
			result.Errors = append(result.Errors,
				fmt.Sprintf("Name mismatch: displayed '%s' != actual '%s'", displayedName, deployment.Name))
		}
	}

	// Validate namespace
	if displayedNS, ok := displayedData["namespace"].(string); ok {
		if displayedNS != deployment.Namespace {
			result.Valid = false
			result.Errors = append(result.Errors,
				fmt.Sprintf("Namespace mismatch: displayed '%s' != actual '%s'", displayedNS, deployment.Namespace))
		}
	}

	// Validate replicas
	desiredReplicas := int32(1)
	if deployment.Spec.Replicas != nil {
		desiredReplicas = *deployment.Spec.Replicas
	}

	if displayedReplicas, ok := displayedData["replicas"].(string); ok {
		expectedReplicas := fmt.Sprintf("%d/%d", deployment.Status.AvailableReplicas, desiredReplicas)
		if displayedReplicas != expectedReplicas {
			result.Warnings = append(result.Warnings,
				fmt.Sprintf("Replicas mismatch: displayed '%s' != expected '%s'", displayedReplicas, expectedReplicas))
		}
	}

	return result
}

// validateDeploymentStatus validates deployment status consistency
func (dv *DeploymentValidator) validateDeploymentStatus(deployment *appsv1.Deployment, pods []corev1.Pod) ValidationResult {
	result := ValidationResult{
		Valid:    true,
		Errors:   []string{},
		Warnings: []string{},
	}

	// Validate status fields are non-negative
	if deployment.Status.Replicas < 0 {
		result.Valid = false
		result.Errors = append(result.Errors, "Status replicas is negative")
	}

	if deployment.Status.AvailableReplicas < 0 {
		result.Valid = false
		result.Errors = append(result.Errors, "Status available replicas is negative")
	}

	if deployment.Status.ReadyReplicas < 0 {
		result.Valid = false
		result.Errors = append(result.Errors, "Status ready replicas is negative")
	}

	if deployment.Status.UpdatedReplicas < 0 {
		result.Valid = false
		result.Errors = append(result.Errors, "Status updated replicas is negative")
	}

	// Validate logical consistency
	if deployment.Status.AvailableReplicas > deployment.Status.Replicas {
		result.Valid = false
		result.Errors = append(result.Errors,
			fmt.Sprintf("Available replicas (%d) exceeds total replicas (%d)",
				deployment.Status.AvailableReplicas, deployment.Status.Replicas))
	}

	if deployment.Status.ReadyReplicas > deployment.Status.AvailableReplicas {
		result.Valid = false
		result.Errors = append(result.Errors,
			fmt.Sprintf("Ready replicas (%d) exceeds available replicas (%d)",
				deployment.Status.ReadyReplicas, deployment.Status.AvailableReplicas))
	}

	if deployment.Status.UpdatedReplicas > deployment.Status.Replicas {
		result.Warnings = append(result.Warnings,
			fmt.Sprintf("Updated replicas (%d) exceeds total replicas (%d)",
				deployment.Status.UpdatedReplicas, deployment.Status.Replicas))
	}

	return result
}

