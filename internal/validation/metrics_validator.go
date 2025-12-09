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
	"strconv"
	"strings"

	"k8s.io/apimachinery/pkg/api/resource"
)

// MetricsValidator provides validation for metrics calculations
type MetricsValidator struct {
	*ResourceValidator
}

// NewMetricsValidator creates a new metrics validator
func NewMetricsValidator() *MetricsValidator {
	return &MetricsValidator{
		ResourceValidator: NewResourceValidator(),
	}
}

// ValidateMetricsCalculation validates metrics calculation accuracy
func (mv *MetricsValidator) ValidateMetricsCalculation(actualCPU, actualMemory int64,
	displayedCPU, displayedMemory string) ValidationResult {
	result := ValidationResult{
		Valid:    true,
		Errors:   []string{},
		Warnings: []string{},
	}

	// Validate actual metrics
	actualResult := mv.ValidateMetricsAccuracy(actualCPU, actualMemory, nil, nil)
	result.Errors = append(result.Errors, actualResult.Errors...)
	result.Warnings = append(result.Warnings, actualResult.Warnings...)
	if !actualResult.Valid {
		result.Valid = false
	}

	// Validate displayed CPU matches actual
	if displayedCPU != "" {
		parsedCPU, err := mv.parseCPUString(displayedCPU)
		if err != nil {
			result.Valid = false
			result.Errors = append(result.Errors, fmt.Sprintf("Invalid CPU format: %s", err.Error()))
		} else {
			// Allow small rounding differences (within 5%)
			diff := math.Abs(float64(parsedCPU-actualCPU)) / float64(actualCPU)
			if diff > 0.05 && actualCPU > 0 {
				result.Warnings = append(result.Warnings,
					fmt.Sprintf("CPU display mismatch: displayed %s (%dm) vs actual %dm (diff: %.1f%%)",
						displayedCPU, parsedCPU, actualCPU, diff*100))
			}
		}
	}

	// Validate displayed memory matches actual
	if displayedMemory != "" {
		parsedMemory, err := mv.parseMemoryString(displayedMemory)
		if err != nil {
			result.Valid = false
			result.Errors = append(result.Errors, fmt.Sprintf("Invalid memory format: %s", err.Error()))
		} else {
			// Allow small rounding differences (within 5%)
			diff := math.Abs(float64(parsedMemory-actualMemory)) / float64(actualMemory)
			if diff > 0.05 && actualMemory > 0 {
				result.Warnings = append(result.Warnings,
					fmt.Sprintf("Memory display mismatch: displayed %s (%d bytes) vs actual %d bytes (diff: %.1f%%)",
						displayedMemory, parsedMemory, actualMemory, diff*100))
			}
		}
	}

	if len(result.Errors) > 0 {
		result.Message = fmt.Sprintf("Validation failed with %d error(s) and %d warning(s)",
			len(result.Errors), len(result.Warnings))
	} else if len(result.Warnings) > 0 {
		result.Message = fmt.Sprintf("Validation passed with %d warning(s)", len(result.Warnings))
	} else {
		result.Message = "All metrics validations passed"
	}

	return result
}

// ValidateMetricsAggregation validates aggregated metrics calculations
func (mv *MetricsValidator) ValidateMetricsAggregation(individualMetrics []map[string]int64,
	aggregatedCPU, aggregatedMemory int64) ValidationResult {
	result := ValidationResult{
		Valid:    true,
		Errors:   []string{},
		Warnings: []string{},
	}

	var totalCPU, totalMemory int64
	for i, metrics := range individualMetrics {
		cpu, cpuOk := metrics["cpu"]
		memory, memOk := metrics["memory"]

		if !cpuOk || !memOk {
			result.Warnings = append(result.Warnings,
				fmt.Sprintf("Metrics[%d] missing CPU or memory data", i))
			continue
		}

		if cpu < 0 {
			result.Valid = false
			result.Errors = append(result.Errors,
				fmt.Sprintf("Metrics[%d] has negative CPU: %d", i, cpu))
		}
		if memory < 0 {
			result.Valid = false
			result.Errors = append(result.Errors,
				fmt.Sprintf("Metrics[%d] has negative memory: %d", i, memory))
		}

		totalCPU += cpu
		totalMemory += memory
	}

	// Validate aggregation
	cpuDiff := math.Abs(float64(totalCPU - aggregatedCPU))
	memoryDiff := math.Abs(float64(totalMemory - aggregatedMemory))

	if cpuDiff > 1 { // Allow 1m CPU difference for rounding
		result.Valid = false
		result.Errors = append(result.Errors,
			fmt.Sprintf("CPU aggregation mismatch: sum %dm != aggregated %dm (diff: %dm)",
				totalCPU, aggregatedCPU, int64(cpuDiff)))
	}

	if memoryDiff > 1024*1024 { // Allow 1MB difference for rounding
		result.Valid = false
		result.Errors = append(result.Errors,
			fmt.Sprintf("Memory aggregation mismatch: sum %d bytes != aggregated %d bytes (diff: %d bytes)",
				totalMemory, aggregatedMemory, int64(memoryDiff)))
	}

	if len(result.Errors) > 0 {
		result.Message = fmt.Sprintf("Aggregation validation failed with %d error(s)", len(result.Errors))
	} else {
		result.Message = "Aggregation validation passed"
	}

	return result
}

// parseCPUString parses CPU string like "100m" or "1" to millicores
func (mv *MetricsValidator) parseCPUString(cpuStr string) (int64, error) {
	cpuStr = strings.TrimSpace(cpuStr)
	if len(cpuStr) == 0 {
		return 0, fmt.Errorf("empty CPU string")
	}

	// Remove 'm' suffix if present
	if strings.HasSuffix(cpuStr, "m") {
		value, err := strconv.ParseInt(cpuStr[:len(cpuStr)-1], 10, 64)
		if err != nil {
			return 0, fmt.Errorf("invalid CPU format: %s", cpuStr)
		}
		return value, nil
	}

	// Parse as cores and convert to millicores
	value, err := strconv.ParseFloat(cpuStr, 64)
	if err != nil {
		return 0, fmt.Errorf("invalid CPU format: %s", cpuStr)
	}

	return int64(value * 1000), nil
}

// parseMemoryString parses memory string like "100Mi" or "1Gi" to bytes
func (mv *MetricsValidator) parseMemoryString(memStr string) (int64, error) {
	memStr = strings.TrimSpace(memStr)
	if len(memStr) == 0 {
		return 0, fmt.Errorf("empty memory string")
	}

	// Parse using Kubernetes resource.Quantity
	quantity, err := resource.ParseQuantity(memStr)
	if err != nil {
		return 0, fmt.Errorf("invalid memory format: %s", err.Error())
	}

	return quantity.Value(), nil
}

// ValidateMetricsFormat validates metrics format consistency
func (mv *MetricsValidator) ValidateMetricsFormat(metrics map[string]interface{}) ValidationResult {
	result := ValidationResult{
		Valid:    true,
		Errors:   []string{},
		Warnings: []string{},
	}

	// Check required fields
	cpu, cpuOk := metrics["cpu"]
	memory, memOk := metrics["memory"]

	if !cpuOk && !memOk {
		result.Warnings = append(result.Warnings, "No metrics data provided")
		return result
	}

	// Validate CPU format
	if cpuOk {
		cpuStr, ok := cpu.(string)
		if !ok {
			result.Valid = false
			result.Errors = append(result.Errors, "CPU metric is not a string")
		} else {
			_, err := mv.parseCPUString(cpuStr)
			if err != nil {
				result.Valid = false
				result.Errors = append(result.Errors, fmt.Sprintf("Invalid CPU format: %s", err.Error()))
			}
		}
	}

	// Validate memory format
	if memOk {
		memStr, ok := memory.(string)
		if !ok {
			result.Valid = false
			result.Errors = append(result.Errors, "Memory metric is not a string")
		} else {
			_, err := mv.parseMemoryString(memStr)
			if err != nil {
				result.Valid = false
				result.Errors = append(result.Errors, fmt.Sprintf("Invalid memory format: %s", err.Error()))
			}
		}
	}

	if len(result.Errors) > 0 {
		result.Message = fmt.Sprintf("Format validation failed with %d error(s)", len(result.Errors))
	} else {
		result.Message = "Format validation passed"
	}

	return result
}

