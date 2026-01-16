# KubeGraf Accuracy Validation Documentation

## Overview

KubeGraf includes a comprehensive accuracy validation system to ensure all displayed data is accurate and consistent with the actual Kubernetes cluster state. This document describes the validation system, how it works, and how to use it.

## Table of Contents

1. [Introduction](#introduction)
2. [Validation Architecture](#validation-architecture)
3. [Resource Validators](#resource-validators)
4. [Validation Types](#validation-types)
5. [Configuration](#configuration)
6. [Usage](#usage)
7. [Accuracy Tests](#accuracy-tests)
8. [Troubleshooting](#troubleshooting)

## Introduction

The accuracy validation system ensures that:

- **Data Consistency**: Displayed data matches actual Kubernetes resource state
- **Calculation Accuracy**: All calculations (metrics, costs, ages) are correct
- **Status Accuracy**: Resource statuses are correctly determined
- **Aggregation Accuracy**: Aggregated data (sums, averages) are correct

## Validation Architecture

The validation system is organized into separate files for better maintainability:

```
internal/validation/
├── validator.go              # Base validator with common validation logic
├── pod_validator.go          # Pod-specific validation
├── deployment_validator.go   # Deployment-specific validation
├── metrics_validator.go      # Metrics calculation validation
├── cost_validator.go         # Cost calculation validation
├── integration.go           # Integration layer for web handlers
└── accuracy_test.go          # Accuracy test suite
```

### Key Components

1. **ResourceValidator**: Base validator with common validation methods
2. **PodValidator**: Validates pod data accuracy
3. **DeploymentValidator**: Validates deployment data accuracy
4. **MetricsValidator**: Validates metrics calculations
5. **CostValidator**: Validates cost calculations

## Resource Validators

### Pod Validator

Validates:
- Container count consistency (spec vs status)
- Ready count calculation
- Restart count calculation
- Status determination (Running, Pending, Failed, etc.)
- Resource requests/limits consistency
- Age calculation
- Metrics accuracy
- Displayed data matches actual pod data

**Example Usage:**
```go
validator := validation.NewPodValidator()
result := validator.ValidatePodDataAccuracy(pod, metrics, displayedData)
if !result.Valid {
    // Handle errors
    for _, err := range result.Errors {
        log.Printf("Error: %s", err)
    }
}
```

### Deployment Validator

Validates:
- Replica count calculations
- Available/Ready replica counts
- Status consistency
- Pod-to-deployment relationships
- Displayed data matches actual deployment data

**Example Usage:**
```go
validator := validation.NewDeploymentValidator()
result := validator.ValidateDeploymentDataAccuracy(deployment, pods, displayedData)
```

### Metrics Validator

Validates:
- CPU metrics format and accuracy
- Memory metrics format and accuracy
- Metrics aggregation (sum of individual metrics)
- Displayed metrics match actual metrics
- Metrics format consistency

**Example Usage:**
```go
validator := validation.NewMetricsValidator()
result := validator.ValidateMetricsCalculation(actualCPU, actualMemory, displayedCPU, displayedMemory)
```

### Cost Validator

Validates:
- Cost calculation accuracy
- Daily/monthly cost calculations (24 hours, 730 hours)
- Cost aggregation
- Namespace cost calculations
- Cost reasonableness checks

**Example Usage:**
```go
validator := validation.NewCostValidator()
result := validator.ValidateCostCalculation(cpuCores, memoryGB, hourlyCost, dailyCost, monthlyCost)
```

## Validation Types

### 1. Data Consistency Validation

Ensures displayed data matches actual Kubernetes resource data:
- Names match
- Namespaces match
- Statuses match
- Counts match

### 2. Calculation Validation

Validates mathematical calculations:
- Age calculations (time differences)
- Replica counts
- Resource aggregations
- Cost calculations

### 3. Format Validation

Validates data format consistency:
- CPU format (e.g., "100m", "1")
- Memory format (e.g., "100Mi", "1Gi")
- Status format
- Age format

### 4. Logical Validation

Validates logical consistency:
- Ready count ≤ Total containers
- Available replicas ≤ Total replicas
- Requests ≤ Limits
- Metrics are non-negative

## Configuration

Validation can be configured via environment variables:

```bash
# Disable validation entirely
export KUBEGRAF_VALIDATION_DISABLED=true

# Enable strict mode (warnings treated as errors)
export KUBEGRAF_VALIDATION_STRICT=true

# Log warnings (useful for debugging)
export KUBEGRAF_VALIDATION_LOG_WARNINGS=true
```

Or programmatically:

```go
config := &validation.ValidationConfig{
    Enabled:     true,
    LogErrors:   true,
    LogWarnings: false,
    StrictMode:  false,
}
```

## Usage

### Integration with Web Handlers

The validation system can be integrated into web handlers to validate data before returning it:

```go
import "github.com/kubegraf/kubegraf/internal/validation"

func (ws *WebServer) handlePods(w http.ResponseWriter, r *http.Request) {
    // ... fetch pods ...
    
    config := validation.ValidationConfigFromEnv()
    for _, pod := range pods.Items {
        result := validation.ValidatePodData(pod, metrics, displayedData, config)
        if !result.Valid && config.StrictMode {
            // Handle validation failure
        }
    }
    
    // ... return data ...
}
```

### Standalone Validation

You can also use validators directly:

```go
validator := validation.NewPodValidator()
result := validator.ValidatePodDataAccuracy(pod, metrics, displayedData)

if !result.Valid {
    fmt.Printf("Validation failed: %s\n", result.Message)
    for _, err := range result.Errors {
        fmt.Printf("  Error: %s\n", err)
    }
}
```

## Accuracy Tests

The validation system includes a comprehensive test suite located in `internal/validation/accuracy_test.go`.

### Running Tests

```bash
# Run all validation tests
go test ./internal/validation/...

# Run specific test
go test ./internal/validation/... -run TestPodAccuracyValidation

# Run with verbose output
go test ./internal/validation/... -v
```

### Test Coverage

The test suite covers:
- Pod data accuracy
- Deployment data accuracy
- Metrics calculations
- Cost calculations
- Age calculations
- Aggregation accuracy

### Generating Test Reports

```go
import "github.com/kubegraf/kubegraf/internal/validation"

report := validation.GenerateAccuracyReport()
fmt.Println(report)
```

## Validation Results

Each validation returns a `ValidationResult` with:

```go
type ValidationResult struct {
    Valid    bool     // Overall validation status
    Message  string   // Summary message
    Errors   []string // Critical errors (invalidates data)
    Warnings []string // Warnings (data may be inaccurate)
}
```

### Error vs Warning

- **Errors**: Critical issues that indicate data is definitely wrong
  - Negative values
  - Count mismatches
  - Calculation errors
  
- **Warnings**: Potential issues that may indicate inaccuracies
  - Unusual values
  - Minor mismatches
  - Format inconsistencies

## Accuracy Checks Performed

### Pod Accuracy Checks

1. ✅ Container count matches between spec and status
2. ✅ Ready count is ≤ total containers
3. ✅ Restart count is non-negative
4. ✅ Status is valid (Running, Pending, Failed, etc.)
5. ✅ Resource requests ≤ limits
6. ✅ Age calculation is correct
7. ✅ Metrics format is valid
8. ✅ Displayed data matches actual pod data

### Deployment Accuracy Checks

1. ✅ Replica counts are consistent
2. ✅ Available replicas ≤ total replicas
3. ✅ Ready replicas ≤ available replicas
4. ✅ Status fields are non-negative
5. ✅ Pod-to-deployment relationships are correct
6. ✅ Displayed data matches actual deployment data

### Metrics Accuracy Checks

1. ✅ CPU metrics are non-negative
2. ✅ Memory metrics are non-negative
3. ✅ Metrics format is valid (e.g., "100m", "200Mi")
4. ✅ Displayed metrics match actual metrics (within 5% tolerance)
5. ✅ Aggregated metrics equal sum of individual metrics

### Cost Accuracy Checks

1. ✅ Costs are non-negative
2. ✅ Daily cost = hourly cost × 24
3. ✅ Monthly cost = hourly cost × 730
4. ✅ Cost aggregation is correct
5. ✅ Costs are reasonable (not zero if resources exist)

## Troubleshooting

### Validation Errors

If you see validation errors:

1. **Check the error message** - It will indicate what's wrong
2. **Verify Kubernetes resource state** - Use `kubectl` to check actual state
3. **Check calculations** - Verify mathematical operations
4. **Review logs** - Enable `KUBEGRAF_VALIDATION_LOG_WARNINGS=true`

### Common Issues

**Issue**: "Ready count exceeds total containers"
- **Cause**: Container statuses may be out of sync
- **Fix**: Check pod status with `kubectl describe pod <name>`

**Issue**: "CPU/Memory display mismatch"
- **Cause**: Rounding differences or format conversion errors
- **Fix**: Check metrics format and conversion logic

**Issue**: "Cost calculation mismatch"
- **Cause**: Incorrect multiplication factors
- **Fix**: Verify daily (×24) and monthly (×730) calculations

### Disabling Validation

If validation is causing issues, you can disable it:

```bash
export KUBEGRAF_VALIDATION_DISABLED=true
```

Or in code:

```go
config := &validation.ValidationConfig{
    Enabled: false,
}
```

## Best Practices

1. **Enable validation in development** - Catch issues early
2. **Log warnings in production** - Monitor for accuracy issues
3. **Use strict mode for critical paths** - Ensure data integrity
4. **Run accuracy tests regularly** - Verify validation logic
5. **Review validation results** - Address errors and warnings

## Future Enhancements

Planned improvements:

- [ ] Service validator
- [ ] Ingress validator
- [ ] StatefulSet validator
- [ ] DaemonSet validator
- [ ] Network policy validator
- [ ] Real-time validation dashboard
- [ ] Validation metrics and alerts

## Support

For issues or questions:
- GitHub Issues: https://github.com/kubegraf/kubegraf/issues
- Documentation: See other docs in `/docs` directory


