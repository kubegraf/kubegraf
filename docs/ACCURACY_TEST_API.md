# Accuracy Test API Documentation

## Overview

The Accuracy Test API provides comprehensive validation of data accuracy across all Kubernetes resources and API endpoints. This ensures that all data displayed in KubeGraf is accurate and consistent.

## API Endpoints

### 1. Run All Accuracy Tests
**Endpoint:** `GET /api/accuracy/run?namespace=<namespace>`

Runs comprehensive accuracy tests for all resources in the specified namespace (or default namespace if not provided).

**Response:**
```json
{
  "success": true,
  "results": {
    "totalTests": 50,
    "passedTests": 48,
    "failedTests": 2,
    "warningTests": 5,
    "results": [
      {
        "testName": "pod_accuracy",
        "resource": "pod",
        "namespace": "default",
        "name": "my-pod",
        "passed": true,
        "errors": [],
        "warnings": [],
        "details": {
          "message": "All validations passed"
        },
        "duration": "50ms",
        "timestamp": "2025-12-09T12:00:00Z"
      }
    ],
    "summary": {
      "pod": 10,
      "deployment": 5,
      "metrics": 10,
      "cost": 3,
      "node": 3,
      "service": 5
    },
    "duration": "2.5s",
    "timestamp": "2025-12-09T12:00:00Z"
  }
}
```

### 2. Get Accuracy Test Status
**Endpoint:** `GET /api/accuracy/status`

Returns the current accuracy test configuration.

**Response:**
```json
{
  "enabled": true,
  "strictMode": false,
  "logWarnings": false,
  "logErrors": true
}
```

### 3. Validate Pods
**Endpoint:** `GET /api/accuracy/pods?namespace=<namespace>`

Validates accuracy of pod data.

**Response:**
```json
{
  "success": true,
  "results": [
    {
      "testName": "pod_accuracy",
      "resource": "pod",
      "namespace": "default",
      "name": "my-pod",
      "passed": true,
      "errors": [],
      "warnings": [],
      "details": {
        "message": "All validations passed"
      }
    }
  ]
}
```

### 4. Validate Deployments
**Endpoint:** `GET /api/accuracy/deployments?namespace=<namespace>`

Validates accuracy of deployment data.

### 5. Validate Metrics
**Endpoint:** `GET /api/accuracy/metrics?namespace=<namespace>`

Validates accuracy of metrics calculations.

### 6. Validate Cost
**Endpoint:** `GET /api/accuracy/cost?namespace=<namespace>`

Validates accuracy of cost calculations.

### 7. Get Accuracy Summary
**Endpoint:** `GET /api/accuracy/summary?namespace=<namespace>`

Returns a summary of all accuracy test results.

**Response:**
```json
{
  "success": true,
  "summary": {
    "totalTests": 50,
    "passedTests": 48,
    "failedTests": 2,
    "warningTests": 5,
    "accuracy": "96.00%",
    "duration": "2.5s",
    "timestamp": "2025-12-09T12:00:00Z",
    "summary": {
      "pod": 10,
      "deployment": 5,
      "metrics": 10,
      "cost": 3,
      "node": 3,
      "service": 5
    }
  }
}
```

## What Gets Validated

### Pods
- Container count matches between spec and status
- Ready count calculation is correct
- Restart count calculation is accurate
- Age calculation is valid
- Resource requests/limits are valid
- Metrics data format and values are correct

### Deployments
- Replica counts match between desired and actual
- Ready replicas calculation is accurate
- Available replicas are within bounds
- Pod-to-deployment relationship is correct

### Metrics
- CPU usage values are non-negative
- Memory usage values are non-negative
- Metrics format is correct (e.g., "100m" for CPU, "100Mi" for memory)
- Usage doesn't exceed reasonable bounds (warnings if >2x requests)

### Cost
- Cost values are non-negative
- Daily cost = hourly cost × 24
- Monthly cost = hourly cost × 730
- Cost is positive when resources exist

### Nodes
- CPU capacity is positive
- Memory capacity is positive
- Node status is valid

### Services
- Service has at least one port (warning if none)
- Service type is valid

## Configuration

Accuracy tests can be configured via environment variables:

- `KUBEGRAF_VALIDATION_DISABLED=true` - Disable validation
- `KUBEGRAF_VALIDATION_STRICT=true` - Treat warnings as errors
- `KUBEGRAF_VALIDATION_LOG_WARNINGS=true` - Log warnings to console

## Usage Examples

### Run all tests
```bash
curl http://localhost:3000/api/accuracy/run?namespace=default
```

### Get accuracy summary
```bash
curl http://localhost:3000/api/accuracy/summary?namespace=default
```

### Validate specific resource type
```bash
curl http://localhost:3000/api/accuracy/pods?namespace=default
```

## Architecture

The accuracy test system is organized into separate files for better maintainability:

1. **`web_accuracy_handlers.go`** - API handlers for accuracy endpoints
2. **`internal/validation/api_test_runner.go`** - Test runner that orchestrates all tests
3. **`internal/validation/data_accuracy_checker.go`** - Validates data accuracy for each resource type
4. **`internal/validation/pod_validator.go`** - Pod-specific validation logic
5. **`internal/validation/deployment_validator.go`** - Deployment-specific validation logic
6. **`internal/validation/metrics_validator.go`** - Metrics-specific validation logic
7. **`internal/validation/cost_validator.go`** - Cost-specific validation logic

## Testing

All accuracy tests run in parallel for performance. Tests validate:
- Data consistency between Kubernetes API and displayed data
- Calculation accuracy (ready counts, restarts, costs, etc.)
- Format validation (metrics, timestamps, etc.)
- Logical consistency (replicas, resource limits, etc.)

## Results Interpretation

- **Passed**: All validations passed, data is accurate
- **Failed**: Critical errors found, data may be inaccurate
- **Warnings**: Non-critical issues found, data is likely accurate but may need attention

