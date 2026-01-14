# KubeGraf RCA Engine - Architecture & Implementation Guide

## Overview

The KubeGraf RCA (Root Cause Analysis) Engine is a sophisticated system designed to automatically analyze Kubernetes incidents and generate high-confidence root cause analyses with actionable fix suggestions.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        RCA Engine                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐    │
│  │   Signal     │──▶│ Correlation  │──▶│     RCA      │    │
│  │  Collector   │   │    Engine    │   │  Generator   │    │
│  └──────────────┘   └──────────────┘   └──────────────┘    │
│         │                   │                   │           │
│         ▼                   ▼                   ▼           │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Fix Recommender                         │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
        ┌─────────────────────────────────┐
        │    Integration Points            │
        ├─────────────────────────────────┤
        │  • Web API (HTTP Handlers)      │
        │  • CLI Commands                 │
        │  • Dashboard UI                 │
        └─────────────────────────────────┘
```

## Core Modules

### 1. Signal Collector (`rca_signal_collector.go`)

**Purpose**: Collects signals from multiple sources in the cluster

**Signal Sources**:
- **Pod Status**: Phase transitions, container statuses, restart counts
- **Node Status**: Ready/NotReady, pressure conditions, taints
- **Kubernetes Events**: Warning/Normal events with pattern matching
- **Container Logs**: Error patterns, connection failures, DNS issues
- **Metrics** (optional): CPU, memory, disk usage

**Key Features**:
- Time-windowed signal collection
- Pattern-based event classification
- Graceful shutdown detection (SIGKILL signals)
- Node preemption detection (spot/preemptible nodes)
- Database & DNS failure pattern matching

### 2. Correlation Engine (`rca_correlation_engine.go`)

**Purpose**: Correlates signals to identify root cause patterns

**Supported Patterns**:
1. **Node Preemption** - Spot/preemptible node termination
2. **Graceful Shutdown Failure** - SIGKILL due to timeout
3. **OOM Kill** - Out-of-memory container termination
4. **Crash Loop** - Repeated container crashes
5. **DB Connection Failure** - Database connectivity issues
6. **DNS Failure** - DNS resolution problems
7. **Scheduling Failure** - Pod cannot be scheduled
8. **Image Pull Failure** - Cannot pull container image

**Correlation Logic**:
- Timeline-based signal ordering
- Primary trigger identification
- Secondary symptom detection
- Confidence score calculation (0.0 - 1.0)
- Temporal proximity analysis

**Example - Node Preemption Correlation**:
```
1. Node terminated event (primary trigger)
2. Pod deleted event (within 60s)
3. Pod rescheduled to new node
→ Pattern: Node Preemption (95% confidence)
```

### 3. RCA Generator (`rca_generator.go`)

**Purpose**: Generates human-readable root cause analyses

**Output Components**:
- **Title**: Clear, non-generic description
- **Root Cause**: 1-2 sentence explanation
- **Evidence**: Timestamped signal list
- **Impact**: Affected resources, downtime calculation
- **Confidence Score**: 0-100 with reasoning
- **Assumptions**: Listed uncertainties

**Example RCA Output**:
```json
{
  "id": "rca-oom-prod-api-123",
  "title": "Container killed due to out-of-memory (OOM)",
  "rootCause": "Container api was killed by the OOM killer because it exceeded its memory limit. The container has restarted 5 time(s) due to this issue.",
  "confidenceScore": 99.0,
  "confidenceReason": "Very high confidence: OOMKilled termination reason is definitive evidence of memory exhaustion",
  "impact": {
    "affectedResources": [...],
    "downtimeSeconds": 127.5
  }
}
```

### 4. Fix Recommender (`rca_fix_recommender.go`)

**Purpose**: Provides actionable, non-destructive fix suggestions

**Fix Categories**:
- **Configuration**: YAML changes, environment variables
- **Resource**: Memory/CPU adjustments, node capacity
- **Deployment**: Replicas, PDBs, node selectors
- **Application**: Code changes, retry logic
- **Monitoring**: Alerts, observability improvements

**Fix Suggestion Structure**:
```go
type FixSuggestion struct {
    ID          string
    Title       string
    Description string
    Reasoning   string
    Priority    string  // high, medium, low
    Category    string
    Actions     []string // Step-by-step actions
    Risk        string   // low, medium, high
}
```

**Example - OOM Kill Fix**:
```json
{
  "id": "oom-increase-memory",
  "title": "Increase memory limits",
  "priority": "high",
  "category": "resource",
  "description": "Increase the container's memory limit to accommodate the application's memory requirements.",
  "reasoning": "The container is exceeding its memory limit and being killed by the OOM killer.",
  "actions": [
    "Analyze actual memory usage patterns from metrics",
    "Increase memory limit by 50-100% above peak usage",
    "Example: Change 'memory: 512Mi' to 'memory: 1Gi'",
    "Monitor after deployment to ensure the new limit is sufficient"
  ],
  "risk": "low"
}
```

## Advanced Scenarios

### Node Preemption Analysis

**Detection Signals**:
1. Node termination event
2. Node taints (cloud.google.com/gke-preemptible, etc.)
3. Pod deletion events
4. Pod rescheduling to new node

**RCA Output**:
```
Title: "Pod restarted due to node preemption (Spot/Preemptible)"

Root Cause: "Pod my-app-xyz restarted because its host node
gke-cluster-spot-abc was terminated. This was a Spot/Preemptible
node which can be terminated with short notice by the cloud provider.
The pod was deleted and rescheduled to a new node after 47 seconds."

Confidence: 95% (node termination event detected, pod deletion and
rescheduling observed, events occurred within expected timeframe)
```

**Fix Suggestions**:
- Add PodDisruptionBudget
- Move critical workloads to non-spot nodes
- Increase replica count for redundancy
- Set up spot termination monitoring

### Graceful Shutdown Failure Analysis

**Detection Signals**:
1. Container exit code 137 (SIGKILL)
2. Duration > terminationGracePeriodSeconds
3. Pod termination events

**RCA Output**:
```
Title: "Container force-killed due to graceful shutdown timeout"

Root Cause: "Container api was force-killed (SIGKILL) because it
did not exit within the termination grace period of 30 seconds.
The container ran for 45 seconds after receiving SIGTERM, exceeding
the grace period. This indicates the application is not handling
SIGTERM properly or has a long shutdown process."

Confidence: 95% (container exit code 137 observed, and shutdown
duration exceeded grace period)
```

**Fix Suggestions**:
- Increase terminationGracePeriodSeconds
- Implement SIGTERM handler in application
- Add/optimize preStop hook
- Review shutdown logic timing

### Database Connection Failure Analysis

**Detection Signals**:
1. Log patterns: "connection refused", "could not connect"
2. CrashLoopBackOff status
3. High restart count

**RCA Output**:
```
Title: "Application failing due to database connection issues"

Root Cause: "Application cannot connect to its database dependency.
Error: connection refused: tcp 10.0.0.5:5432. The application is in
CrashLoopBackOff because it cannot start without a database connection.
This is typically caused by: database unavailability, incorrect
connection configuration, network issues, or authentication problems."

Confidence: 85% (database connection errors detected in logs combined
with CrashLoopBackOff pattern)
```

**Fix Suggestions**:
- Implement retry logic with exponential backoff
- Verify connection configuration
- Check network policies
- Add readiness probe

## API Endpoints

### POST /api/rca/analyze
Analyze a specific incident with custom parameters

**Request**:
```json
{
  "incidentId": "inc-oom-123",
  "resource": {
    "kind": "Pod",
    "name": "my-app-xyz",
    "namespace": "production"
  },
  "startTime": "2025-01-14T10:00:00Z",
  "includeLogs": true,
  "lookbackMinutes": 30
}
```

### GET /api/rca/analyze-incident?id={incidentId}&namespace={namespace}
Analyze an existing incident by ID

### GET /api/rca/quick-analyze?kind=Pod&name=my-app&namespace=default
Quick analysis of a resource

### POST /api/rca/batch-analyze
Analyze multiple incidents (up to 50) in parallel

### GET /api/rca/patterns
Get list of supported correlation patterns with explanations

### GET /api/rca/incidents-with-analysis?namespace=default&limit=10
Get incidents with their RCA analysis

## CLI Usage (Planned)

```bash
# Analyze a specific incident
kubegraf incidents analyze --id inc-oom-123

# Quick analyze a pod
kubegraf rca analyze pod/my-app -n production

# Analyze all incidents in a namespace
kubegraf incidents analyze-all -n production

# Get fix suggestions for an incident
kubegraf rca fixes --incident inc-oom-123

# Explain a pattern
kubegraf rca explain node-preemption
```

## Performance Considerations

### Signal Collection Optimization
- Limited pod scanning per namespace (500 pods)
- Event filtering by time window
- Optional log collection (can be disabled)
- Background metric collection

### Caching Strategy
- Incident scanner results cached
- RCA results can be stored (planned)
- Signal collection limited to relevant time windows

### Scalability
- Batch analysis support (up to 50 incidents)
- Parallel signal collection
- Timeout protection (2 minutes default)

## Integration with Existing KubeGraf Features

### Incident Scanner
- RCA engine uses existing `IncidentScanner`
- Extends with correlation and analysis

### SRE Agent
- RCA results can be fed to SRE Agent
- AI analysis can enhance RCA confidence
- Automated remediation based on fix suggestions

### Web Dashboard
- RCA results displayed in incident view
- Timeline visualization
- Fix suggestion cards
- Confidence score indicators

## Data Models

### Signal
```go
type Signal struct {
    ID        string
    Type      SignalType
    Source    string  // pod, node, event, log
    Timestamp time.Time
    Resource  ResourceReference
    Severity  string
    Message   string
    Metadata  map[string]interface{}
}
```

### CorrelationResult
```go
type CorrelationResult struct {
    PrimaryTrigger     *Signal
    SecondarySymptoms  []Signal
    RelatedSignals     []Signal
    Timeline           Timeline
    ConfidenceScore    float64
    CorrelationPattern CorrelationPattern
}
```

### RootCauseAnalysis
```go
type RootCauseAnalysis struct {
    ID                 string
    Title              string
    RootCause          string
    Evidence           []Evidence
    Impact             Impact
    ConfidenceScore    float64
    ConfidenceReason   string
    Assumptions        []string
    FixSuggestions     []FixSuggestion
}
```

## Testing Strategy

### Unit Tests (Planned)
- Signal pattern matching
- Correlation logic
- RCA generation
- Fix recommendation logic

### Integration Tests (Planned)
- End-to-end analysis flow
- API endpoint testing
- Multi-incident batch analysis

### Real-World Testing
- Test against production-like incidents
- Verify confidence scores
- Validate fix suggestions

## Future Enhancements

### Phase 2 Features
1. **ML-Enhanced Correlation**
   - Learn from historical incidents
   - Pattern discovery
   - Confidence score refinement

2. **RCA Storage & History**
   - Store RCAs in database
   - Track pattern frequencies
   - Historical analysis

3. **Metric Integration**
   - Prometheus query integration
   - Resource utilization analysis
   - Anomaly detection

4. **Advanced Patterns**
   - Network policy issues
   - Certificate expiration
   - Volume mount failures
   - RBAC permission errors

5. **Auto-Remediation**
   - Safe fix auto-application
   - Rollback capability
   - Approval workflows

## Contributing

When adding new correlation patterns:

1. Define pattern constant in `rca_types.go`
2. Implement detector in `rca_correlation_engine.go`
3. Add RCA generator in `rca_generator.go`
4. Add fix suggestions in `rca_fix_recommender.go`
5. Update documentation
6. Add test cases

## License

Copyright 2025 KubeGraf Contributors
SPDX-License-Identifier: Apache-2.0
