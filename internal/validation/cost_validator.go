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
)

// CostValidator provides validation for cost calculations
type CostValidator struct {
	*ResourceValidator
}

// NewCostValidator creates a new cost validator
func NewCostValidator() *CostValidator {
	return &CostValidator{
		ResourceValidator: NewResourceValidator(),
	}
}

// ValidateCostCalculation validates cost calculation accuracy
func (cv *CostValidator) ValidateCostCalculation(cpuCores, memoryGB, hourlyCost float64,
	dailyCost, monthlyCost float64) ValidationResult {
	result := ValidationResult{
		Valid:    true,
		Errors:   []string{},
		Warnings: []string{},
	}

	// Validate basic cost accuracy
	basicResult := cv.ValidateCostAccuracy(cpuCores, memoryGB, hourlyCost)
	result.Errors = append(result.Errors, basicResult.Errors...)
	result.Warnings = append(result.Warnings, basicResult.Warnings...)
	if !basicResult.Valid {
		result.Valid = false
	}

	// Validate daily cost calculation
	expectedDaily := hourlyCost * 24
	if math.Abs(dailyCost-expectedDaily) > 0.01 {
		result.Valid = false
		result.Errors = append(result.Errors,
			fmt.Sprintf("Daily cost mismatch: calculated %.2f != expected %.2f (diff: %.2f)",
				dailyCost, expectedDaily, math.Abs(dailyCost-expectedDaily)))
	}

	// Validate monthly cost calculation (730 hours per month)
	expectedMonthly := hourlyCost * 730
	if math.Abs(monthlyCost-expectedMonthly) > 0.01 {
		result.Valid = false
		result.Errors = append(result.Errors,
			fmt.Sprintf("Monthly cost mismatch: calculated %.2f != expected %.2f (diff: %.2f)",
				monthlyCost, expectedMonthly, math.Abs(monthlyCost-expectedMonthly)))
	}

	// Validate cost is reasonable (not zero if resources exist)
	if (cpuCores > 0 || memoryGB > 0) && hourlyCost == 0 {
		result.Warnings = append(result.Warnings,
			"Resources exist but hourly cost is zero")
	}

	// Validate cost is not unreasonably high
	if hourlyCost > 1000 {
		result.Warnings = append(result.Warnings,
			fmt.Sprintf("Hourly cost seems unusually high: %.2f", hourlyCost))
	}

	if len(result.Errors) > 0 {
		result.Message = fmt.Sprintf("Cost validation failed with %d error(s) and %d warning(s)",
			len(result.Errors), len(result.Warnings))
	} else if len(result.Warnings) > 0 {
		result.Message = fmt.Sprintf("Cost validation passed with %d warning(s)", len(result.Warnings))
	} else {
		result.Message = "All cost validations passed"
	}

	return result
}

// ValidateCostAggregation validates aggregated cost calculations
func (cv *CostValidator) ValidateCostAggregation(individualCosts []float64, totalCost float64) ValidationResult {
	result := ValidationResult{
		Valid:    true,
		Errors:   []string{},
		Warnings: []string{},
	}

	var sum float64
	for i, cost := range individualCosts {
		if cost < 0 {
			result.Valid = false
			result.Errors = append(result.Errors,
				fmt.Sprintf("Cost[%d] is negative: %.2f", i, cost))
		}
		sum += cost
	}

	// Allow small rounding differences (0.01)
	diff := math.Abs(sum - totalCost)
	if diff > 0.01 {
		result.Valid = false
		result.Errors = append(result.Errors,
			fmt.Sprintf("Cost aggregation mismatch: sum %.2f != total %.2f (diff: %.2f)",
				sum, totalCost, diff))
	}

	if len(result.Errors) > 0 {
		result.Message = fmt.Sprintf("Aggregation validation failed with %d error(s)", len(result.Errors))
	} else {
		result.Message = "Aggregation validation passed"
	}

	return result
}

// ValidateNamespaceCost validates namespace cost calculations
func (cv *CostValidator) ValidateNamespaceCost(namespaceCost map[string]float64,
	totalCost float64) ValidationResult {
	result := ValidationResult{
		Valid:    true,
		Errors:   []string{},
		Warnings: []string{},
	}

	var sum float64
	for ns, cost := range namespaceCost {
		if cost < 0 {
			result.Valid = false
			result.Errors = append(result.Errors,
				fmt.Sprintf("Namespace '%s' has negative cost: %.2f", ns, cost))
		}
		sum += cost
	}

	// Allow small rounding differences
	diff := math.Abs(sum - totalCost)
	if diff > 0.01 {
		result.Warnings = append(result.Warnings,
			fmt.Sprintf("Namespace cost sum (%.2f) doesn't match total (%.2f), diff: %.2f",
				sum, totalCost, diff))
	}

	if len(result.Errors) > 0 {
		result.Message = fmt.Sprintf("Namespace cost validation failed with %d error(s)", len(result.Errors))
	} else {
		result.Message = "Namespace cost validation passed"
	}

	return result
}


