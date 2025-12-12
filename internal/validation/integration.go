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
	"log"
	"os"

	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
)

// ValidationConfig controls validation behavior
type ValidationConfig struct {
	Enabled     bool
	LogErrors   bool
	LogWarnings bool
	StrictMode  bool // If true, return errors on warnings
}

// DefaultValidationConfig returns default validation configuration
func DefaultValidationConfig() *ValidationConfig {
	return &ValidationConfig{
		Enabled:     true,
		LogErrors:   true,
		LogWarnings: false, // Set to true for debugging
		StrictMode:  false,
	}
}

// ValidationConfigFromEnv creates config from environment variables
func ValidationConfigFromEnv() *ValidationConfig {
	config := DefaultValidationConfig()
	
	if os.Getenv("KUBEGRAF_VALIDATION_DISABLED") == "true" {
		config.Enabled = false
	}
	if os.Getenv("KUBEGRAF_VALIDATION_STRICT") == "true" {
		config.StrictMode = true
	}
	if os.Getenv("KUBEGRAF_VALIDATION_LOG_WARNINGS") == "true" {
		config.LogWarnings = true
	}

	return config
}

// ValidatePodData validates pod data and logs issues
func ValidatePodData(pod *corev1.Pod, metrics map[string]interface{},
	displayedData map[string]interface{}, config *ValidationConfig) ValidationResult {
	if !config.Enabled {
		return ValidationResult{Valid: true, Message: "Validation disabled"}
	}

	validator := NewPodValidator()
	result := validator.ValidatePodDataAccuracy(pod, metrics, displayedData)

	if config.LogErrors && len(result.Errors) > 0 {
		log.Printf("[VALIDATION ERROR] Pod %s/%s: %v", pod.Namespace, pod.Name, result.Errors)
	}
	if config.LogWarnings && len(result.Warnings) > 0 {
		log.Printf("[VALIDATION WARNING] Pod %s/%s: %v", pod.Namespace, pod.Name, result.Warnings)
	}

	if config.StrictMode && len(result.Warnings) > 0 {
		result.Valid = false
	}

	return result
}

// ValidateDeploymentData validates deployment data and logs issues
func ValidateDeploymentData(deployment *appsv1.Deployment, pods []corev1.Pod,
	displayedData map[string]interface{}, config *ValidationConfig) ValidationResult {
	if !config.Enabled {
		return ValidationResult{Valid: true, Message: "Validation disabled"}
	}

	validator := NewDeploymentValidator()
	result := validator.ValidateDeploymentDataAccuracy(deployment, pods, displayedData)

	if config.LogErrors && len(result.Errors) > 0 {
		log.Printf("[VALIDATION ERROR] Deployment %s/%s: %v", deployment.Namespace, deployment.Name, result.Errors)
	}
	if config.LogWarnings && len(result.Warnings) > 0 {
		log.Printf("[VALIDATION WARNING] Deployment %s/%s: %v", deployment.Namespace, deployment.Name, result.Warnings)
	}

	if config.StrictMode && len(result.Warnings) > 0 {
		result.Valid = false
	}

	return result
}

// ValidateMetricsData validates metrics data and logs issues
func ValidateMetricsData(actualCPU, actualMemory int64, displayedCPU, displayedMemory string,
	config *ValidationConfig) ValidationResult {
	if !config.Enabled {
		return ValidationResult{Valid: true, Message: "Validation disabled"}
	}

	validator := NewMetricsValidator()
	result := validator.ValidateMetricsCalculation(actualCPU, actualMemory, displayedCPU, displayedMemory)

	if config.LogErrors && len(result.Errors) > 0 {
		log.Printf("[VALIDATION ERROR] Metrics: %v", result.Errors)
	}
	if config.LogWarnings && len(result.Warnings) > 0 {
		log.Printf("[VALIDATION WARNING] Metrics: %v", result.Warnings)
	}

	if config.StrictMode && len(result.Warnings) > 0 {
		result.Valid = false
	}

	return result
}

// ValidateCostData validates cost data and logs issues
func ValidateCostData(cpuCores, memoryGB, hourlyCost, dailyCost, monthlyCost float64,
	config *ValidationConfig) ValidationResult {
	if !config.Enabled {
		return ValidationResult{Valid: true, Message: "Validation disabled"}
	}

	validator := NewCostValidator()
	result := validator.ValidateCostCalculation(cpuCores, memoryGB, hourlyCost, dailyCost, monthlyCost)

	if config.LogErrors && len(result.Errors) > 0 {
		log.Printf("[VALIDATION ERROR] Cost: %v", result.Errors)
	}
	if config.LogWarnings && len(result.Warnings) > 0 {
		log.Printf("[VALIDATION WARNING] Cost: %v", result.Warnings)
	}

	if config.StrictMode && len(result.Warnings) > 0 {
		result.Valid = false
	}

	return result
}


