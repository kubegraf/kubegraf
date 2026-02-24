# Intelligence Workspace API Testing Guide

Complete testing guide for the Intelligence Workspace backend APIs.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Running Integration Tests](#running-integration-tests)
- [Manual API Testing](#manual-api-testing)
- [API Endpoints Reference](#api-endpoints-reference)
- [Test Scenarios](#test-scenarios)

## Prerequisites

### 1. Start KubeGraf Server

```bash
# From the kubegraf directory
go run . serve
```

The server should be running on `http://localhost:8080`

### 2. Ensure Kubernetes Cluster is Connected

The server needs to be connected to a Kubernetes cluster with some incidents to test the APIs effectively.

### 3. Install Testing Tools

```bash
# Install curl (usually pre-installed)
curl --version

# Install jq for JSON parsing (optional but recommended)
brew install jq  # macOS
# or
apt-get install jq  # Linux
```

## Running Integration Tests

### Run All Tests

```bash
# From the kubegraf directory
go test -v -tags=integration ./test/intelligence_integration_test.go
```

### Run Specific Test

```bash
go test -v -tags=integration -run TestIncidentStory ./test/intelligence_integration_test.go
```

### View Manual Testing Commands

```bash
go test -v -tags=integration -run TestManualAPIVerification ./test/intelligence_integration_test.go
```

## Manual API Testing

### 1. Workspace Insights

Get aggregated insights across all incidents:

```bash
curl -s http://localhost:8080/api/v2/workspace/insights | jq '.'
```

**Expected Response:**
```json
{
  "insights": [
    {
      "id": "insight-high-confidence",
      "type": "confidence",
      "priority": 75,
      "title": "High Confidence Diagnoses",
      "message": "3 incident(s) have high-confidence diagnoses (≥95%) with recommended fixes",
      "actionable": true,
      "icon": "✓"
    }
  ],
  "total": 8
}
```

### 2. List Incidents

```bash
curl -s http://localhost:8080/api/v2/incidents | jq '.incidents[] | {id, pattern, severity}'
```

### 3. Get Incident Story

Replace `{incident-id}` with an actual incident ID from step 2:

```bash
INCIDENT_ID="INC-12345678-1234567890"

curl -s http://localhost:8080/api/v2/workspace/incidents/$INCIDENT_ID/story | jq '.'
```

**Expected Response:**
```json
{
  "whatHappened": "The Pod \"my-app\" has been experiencing repeated crashes...",
  "whenStarted": "This issue was first detected 2 hours ago at 2026-02-17 14:30:00 UTC...",
  "whyHappened": "Root cause: Out of memory condition due to insufficient resource limits...",
  "impact": "This incident primarily affects Pod/my-app in the production namespace.",
  "resolutionPath": "Increase Memory Limits: Increase pod memory limits to 2Gi..."
}
```

### 4. Find Related Incidents

```bash
curl -s http://localhost:8080/api/v2/workspace/incidents/$INCIDENT_ID/related | jq '.'
```

**Expected Response:**
```json
{
  "related": [
    {
      "incident": {...},
      "score": 85,
      "reasons": ["Same failure pattern", "Same namespace", "Same resource type"],
      "correlation": "high"
    }
  ],
  "total": 3
}
```

### 5. Predict Fix Success

```bash
curl -s -X POST http://localhost:8080/api/v2/workspace/incidents/$INCIDENT_ID/predict-success \
  -H "Content-Type: application/json" \
  -d '{"fixId":"fix-1"}' | jq '.'
```

**Expected Response:**
```json
{
  "probability": 87.5,
  "confidence": 95,
  "factors": [
    {
      "name": "Diagnosis Confidence",
      "score": 95,
      "weight": 0.35,
      "contribution": 33.25
    },
    {
      "name": "Pattern Recognition",
      "score": 85,
      "weight": 0.25,
      "contribution": 21.25
    }
  ],
  "risk": "low",
  "explanation": "Based on diagnosis confidence (95%), pattern recognition (85%), and historical data, this fix has a 88% probability of success."
}
```

### 6. Execute Fix (Preview Mode)

```bash
curl -s -X POST http://localhost:8080/api/v2/workspace/incidents/$INCIDENT_ID/execute-fix \
  -H "Content-Type: application/json" \
  -d '{"fixId":"fix-1","dryRun":true,"confirmed":false}' | jq '.'
```

**Expected Response:**
```json
{
  "status": "preview",
  "fix": {...},
  "steps": [
    {
      "id": "validate",
      "title": "Validate Prerequisites",
      "description": "Checking cluster state and resource availability",
      "status": "pending"
    },
    {
      "id": "snapshot",
      "title": "Create State Snapshot",
      "description": "Taking snapshot for rollback capability",
      "status": "pending"
    }
  ]
}
```

### 7. Generate RCA Report

#### JSON Format
```bash
curl -s http://localhost:8080/api/v2/workspace/incidents/$INCIDENT_ID/rca?format=json | jq '.'
```

#### Markdown Format
```bash
curl -s http://localhost:8080/api/v2/workspace/incidents/$INCIDENT_ID/rca?format=markdown

# Save to file
curl -s http://localhost:8080/api/v2/workspace/incidents/$INCIDENT_ID/rca?format=markdown > rca-report.md
```

#### HTML Format
```bash
curl -s http://localhost:8080/api/v2/workspace/incidents/$INCIDENT_ID/rca?format=html > rca-report.html

# Open in browser
open rca-report.html  # macOS
# or
xdg-open rca-report.html  # Linux
```

## API Endpoints Reference

### GET /api/v2/workspace/insights

Generate insights for all incidents.

**Query Parameters:** None

**Response:**
```json
{
  "insights": [WorkspaceInsight],
  "total": number
}
```

### GET /api/v2/workspace/incidents/{id}/story

Generate human-readable narrative for an incident.

**Path Parameters:**
- `id`: Incident ID

**Response:**
```json
{
  "whatHappened": string,
  "whenStarted": string,
  "whyHappened": string,
  "impact": string,
  "resolutionPath": string
}
```

### GET /api/v2/workspace/incidents/{id}/related

Find related incidents with similarity scores.

**Path Parameters:**
- `id`: Incident ID

**Response:**
```json
{
  "related": [RelatedIncidentResult],
  "total": number
}
```

### POST /api/v2/workspace/incidents/{id}/predict-success

Predict fix success probability.

**Path Parameters:**
- `id`: Incident ID

**Request Body:**
```json
{
  "fixId": string
}
```

**Response:**
```json
{
  "probability": number,
  "confidence": number,
  "factors": [PredictionFactor],
  "risk": "low" | "medium" | "high",
  "explanation": string
}
```

### POST /api/v2/workspace/incidents/{id}/execute-fix

Execute a fix with preview and rollback support.

**Path Parameters:**
- `id`: Incident ID

**Request Body:**
```json
{
  "fixId": string,
  "dryRun": boolean,
  "confirmed": boolean
}
```

**Response (Preview Mode):**
```json
{
  "status": "preview",
  "fix": ProposedFix,
  "steps": [ExecutionStep]
}
```

**Response (Execution Mode):**
```json
{
  "status": "success" | "failed" | "pending",
  "steps": [ExecutionStep],
  "message": string,
  "canRollback": boolean,
  "error": string?
}
```

### GET /api/v2/workspace/incidents/{id}/rca

Generate Root Cause Analysis report.

**Path Parameters:**
- `id`: Incident ID

**Query Parameters:**
- `format`: "json" | "markdown" | "html" (default: "json")

**Response:** RCA report in requested format

## Test Scenarios

### Scenario 1: Complete Fix Workflow

```bash
# 1. Get incident list
INCIDENT_ID=$(curl -s http://localhost:8080/api/v2/incidents | jq -r '.incidents[0].id')

# 2. Get incident story
curl -s http://localhost:8080/api/v2/workspace/incidents/$INCIDENT_ID/story | jq '.'

# 3. Find related incidents
curl -s http://localhost:8080/api/v2/workspace/incidents/$INCIDENT_ID/related | jq '.'

# 4. Predict fix success
curl -s -X POST http://localhost:8080/api/v2/workspace/incidents/$INCIDENT_ID/predict-success \
  -H "Content-Type: application/json" \
  -d '{"fixId":"fix-1"}' | jq '.probability'

# 5. Preview fix execution
curl -s -X POST http://localhost:8080/api/v2/workspace/incidents/$INCIDENT_ID/execute-fix \
  -H "Content-Type: application/json" \
  -d '{"fixId":"fix-1","dryRun":true,"confirmed":false}' | jq '.steps'

# 6. Generate RCA report
curl -s http://localhost:8080/api/v2/workspace/incidents/$INCIDENT_ID/rca?format=markdown > rca-$INCIDENT_ID.md
```

### Scenario 2: Insights Analysis

```bash
# Get all insights
curl -s http://localhost:8080/api/v2/workspace/insights | jq '.insights[] | {type, title, message}'

# Filter by type
curl -s http://localhost:8080/api/v2/workspace/insights | jq '.insights[] | select(.type == "confidence")'

# Get high priority insights
curl -s http://localhost:8080/api/v2/workspace/insights | jq '.insights[] | select(.priority >= 75)'
```

### Scenario 3: Related Incidents Discovery

```bash
# Get first incident
INCIDENT_ID=$(curl -s http://localhost:8080/api/v2/incidents | jq -r '.incidents[0].id')

# Find related incidents
curl -s http://localhost:8080/api/v2/workspace/incidents/$INCIDENT_ID/related | jq '.'

# Check correlation levels
curl -s http://localhost:8080/api/v2/workspace/incidents/$INCIDENT_ID/related | \
  jq '.related[] | {correlation, score, reasons}'

# Count by correlation
curl -s http://localhost:8080/api/v2/workspace/incidents/$INCIDENT_ID/related | \
  jq '.related | group_by(.correlation) | map({correlation: .[0].correlation, count: length})'
```

## Error Handling

### Common Error Responses

**404 Not Found:**
```json
{
  "error": "Incident not found"
}
```

**400 Bad Request:**
```json
{
  "error": "Invalid request body"
}
```

**405 Method Not Allowed:**
```json
{
  "error": "Method not allowed"
}
```

**500 Internal Server Error:**
```json
{
  "error": "Intelligence system not initialized"
}
```

## Performance Testing

### Load Testing with Apache Bench

```bash
# Test insights endpoint
ab -n 100 -c 10 http://localhost:8080/api/v2/workspace/insights

# Test incident story endpoint
INCIDENT_ID="your-incident-id"
ab -n 100 -c 10 http://localhost:8080/api/v2/workspace/incidents/$INCIDENT_ID/story
```

### Performance Benchmarks

Expected response times (with typical load):
- Workspace Insights: < 100ms
- Incident Story: < 50ms
- Related Incidents: < 200ms (depends on incident count)
- Predict Success: < 100ms
- RCA Generation: < 150ms

## Troubleshooting

### Issue: "Intelligence system not initialized"

**Solution:** Ensure the server has a connected Kubernetes cluster:
```bash
# Check server logs for initialization messages
# Look for: "[Intelligence] Registered /api/v2/workspace/* routes"
```

### Issue: "No incidents available"

**Solution:** The cluster needs to have some issues to detect:
```bash
# Create a test pod with issues
kubectl run crash-test --image=busybox --restart=Never -- /bin/sh -c "exit 1"

# Wait for incident to be detected (may take 30-60 seconds)
```

### Issue: Empty insights array

**Solution:** This is normal if there are no active incidents. Create some test incidents or wait for the scanner to detect issues.

## Next Steps

1. **Frontend Integration:** Use these APIs in the SolidJS UI components
2. **WebSocket Support:** Add real-time updates for incident changes
3. **Authentication:** Add API authentication for production use
4. **Rate Limiting:** Implement rate limiting for API endpoints
5. **Caching:** Add response caching for frequently accessed data

## Additional Resources

- [API Design Documentation](../docs/API.md)
- [Intelligence System Architecture](../docs/INTELLIGENCE.md)
- [Frontend UI Documentation](../ui/solid/src/components/workspace/README.md)

---

**Last Updated:** 2026-02-17
**Version:** 1.0.0
