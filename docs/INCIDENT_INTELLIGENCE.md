# KubeGraf Incident Intelligence System

A production-ready, deterministic incident detection and diagnosis system for Kubernetes clusters. This system converts raw Kubernetes errors, events, logs, and pod states into structured incidents with human-readable summaries, evidence-backed diagnoses, and actionable recommendations.

## Overview

The Incident Intelligence System is designed for **real production use** by senior SREs. It provides:

- **Structured Incidents** - Not raw error spam, but properly aggregated, deduplicated incidents
- **Evidence-Backed Diagnoses** - Every conclusion is supported by actual signals from the cluster
- **Deterministic Rules** - No AI hallucinations or guessing; pure rule-based logic
- **Safe Recommendations** - Suggested fixes that never auto-execute
- **Offline-First** - Works completely locally with just kubeconfig

## Core Principles

1. **Think in Failure Patterns, not error codes** - A 502 error is a symptom, not the pattern
2. **Deterministic, rule-based logic only** - Reproducible and explainable
3. **Every conclusion must have evidence** - No "might be" language
4. **Never auto-apply fixes** - Always show preview + diff before apply
5. **Namespace-scoped actions only** - Safe for production clusters

---

## How to Access in the UI

### Sidebar Navigation

1. Open KubeGraf at `http://localhost:3003`
2. Look for **"Incidents"** in the left sidebar under the **Observability** section
3. Click to access the Incident Intelligence dashboard

### Incident Dashboard Features

The Incidents page shows:

| Section | Description |
|---------|-------------|
| **Summary Cards** | Quick stats for Critical, Warning, and Active incidents |
| **Filter Bar** | Filter by severity, namespace, pattern type |
| **Incident Table** | List of all incidents with status, resource, and timing |
| **Timeline View** | Visual representation of incident occurrence over time |

### Viewing an Incident

Click on any incident row to see:

1. **Summary** - Human-readable description of what happened
2. **Diagnosis** - Evidence-backed analysis with confidence score
3. **Timeline** - Chronological list of events leading to the incident
4. **Evidence Tabs**:
   - Events - Kubernetes events related to the incident
   - Logs - Container logs (if available)
   - Status - Pod/resource status snapshots
5. **Recommendations** - Suggested remediation steps with risk levels
6. **Proposed Fix** - Preview of any safe fixes (with dry-run option)

---

## Failure Patterns

The system detects these Kubernetes failure patterns:

| Pattern | Description | Example Triggers |
|---------|-------------|------------------|
| `APP_CRASH` | Application crash without restart loop | Single crash event |
| `CRASHLOOP` | CrashLoopBackOff restart cycles | Repeated container restarts |
| `OOM_PRESSURE` | Out of memory issues | ExitCode 137, OOMKilled |
| `RESTART_STORM` | Rapid restarts without crash | Many restarts in short time |
| `NO_READY_ENDPOINTS` | Service has no healthy endpoints | 0 endpoints in service |
| `INTERNAL_ERRORS` | Application HTTP 5xx errors | 500/503 errors in logs |
| `UPSTREAM_FAILURE` | Dependency failures | 502/503 from upstream |
| `TIMEOUTS` | Request/connection timeouts | 504 Gateway Timeout |
| `IMAGE_PULL_FAILURE` | Container image issues | ErrImagePull, ImagePullBackOff |
| `CONFIG_ERROR` | ConfigMap/Secret issues | Missing mounts, invalid config |
| `DNS_FAILURE` | DNS resolution problems | NXDOMAIN, resolution timeout |
| `PERMISSION_DENIED` | RBAC/permission issues | 403 errors, access denied |

---

## API Endpoints

### List All Incidents

```bash
GET /api/incidents
```

Query parameters:
- `namespace` - Filter by namespace
- `severity` - Filter by severity (critical, high, medium, low)
- `pattern` - Filter by failure pattern
- `status` - Filter by status (open, investigating, resolved)
- `limit` - Maximum results (default: 100)

Example:
```bash
curl http://localhost:3003/api/incidents?severity=critical&namespace=production
```

### Get Incident Details

```bash
GET /api/incidents/{id}
```

Returns full incident with diagnosis, recommendations, and timeline.

### Get Incident Summary

```bash
GET /api/incidents/summary
```

Returns aggregated counts by severity and pattern.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Kubernetes Cluster                        │
├─────────────────────────────────────────────────────────────────┤
│  Events │ Pod Status │ Logs │ Restart Counts │ Probe Failures   │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Signal Normalizer (signals.go)                │
│    Converts all inputs to NormalizedSignal format                │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Symptom Detector (symptoms.go)                 │
│    Identifies specific symptoms from signals                     │
│    • CrashLoopBackOff  • OOMKilled  • RestartSpike               │
│    • ImagePullError    • NoEndpoints  • ProbeFailure             │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Pattern Matcher (matcher.go)                   │
│    Maps symptoms → failure patterns with confidence              │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                 Incident Aggregator (aggregator.go)              │
│    Deduplicates via fingerprint, tracks occurrences              │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                Diagnosis Generator (diagnosis.go)                │
│    Creates human-readable summary with evidence                  │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│              Recommendation Engine (recommendations.go)          │
│    Suggests safe remediation steps                               │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                        API Handlers (handlers.go)                │
│    GET /incidents  │  GET /incidents/{id}  │  Actions            │
└─────────────────────────────────────────────────────────────────┘
```

---

## File Structure

```
pkg/incidents/
├── patterns.go        # Failure pattern definitions
├── types.go           # Core data structures (Incident, Diagnosis, etc.)
├── signals.go         # Signal normalization from K8s sources
├── symptoms.go        # Symptom detection rules
├── matcher.go         # Pattern matching engine
├── diagnosis.go       # Diagnosis generation
├── recommendations.go # Recommendation rules per pattern
├── fixes.go           # Proposed fix logic (safe, preview-only)
├── aggregator.go      # Incident deduplication and aggregation
├── manager.go         # Central orchestration
├── handlers.go        # HTTP API handlers
└── integration.go     # Integration with EventMonitor
```

---

## Incident Model

```go
type Incident struct {
    ID              string              // Unique incident ID
    Pattern         FailurePattern      // Detected failure pattern
    Severity        Severity            // critical, high, medium, low
    Status          IncidentStatus      // open, investigating, resolved
    Resource        KubeResourceRef     // Affected resource (pod, service, etc.)
    Namespace       string              // Kubernetes namespace
    Occurrences     int                 // Number of times detected
    FirstSeen       time.Time           // First occurrence
    LastSeen        time.Time           // Most recent occurrence
    Signals         []*NormalizedSignal // Raw signals that triggered this
    Symptoms        []Symptom           // Detected symptoms
    Diagnosis       Diagnosis           // Human-readable diagnosis
    Recommendations []Recommendation    // Suggested actions
    Timeline        []TimelineEntry     // Event timeline
}
```

---

## Severity Calculation

Severity is calculated based on:

1. **Blast Radius** - How many resources are affected
2. **Pattern Type** - Some patterns (OOM, CrashLoop) are inherently critical
3. **Frequency** - More occurrences = higher severity
4. **Duration** - Longer incidents escalate

| Severity | Criteria |
|----------|----------|
| `critical` | Affects production traffic, data loss risk |
| `high` | Service degradation, user-facing impact |
| `medium` | Non-critical but needs attention |
| `low` | Informational, no immediate impact |

---

## Confidence Scores

Each incident has a confidence score (0.0 - 1.0):

- **1.0** - Definitive evidence (e.g., ExitCode 137 = OOM)
- **0.8+** - High confidence with multiple corroborating signals
- **0.5-0.8** - Moderate confidence, may need investigation
- **< 0.5** - Low confidence, preliminary detection

---

## Recommendations

Each failure pattern has predefined recommendations:

### Example: CRASHLOOP

| Recommendation | Risk | Description |
|----------------|------|-------------|
| Check pod logs | Low | View recent logs for crash reason |
| Increase memory limits | Medium | If OOM-related crashes |
| Verify image tag | Low | Ensure image exists and is pullable |
| Restart pod | Medium | Force restart to clear state |

### Example: NO_READY_ENDPOINTS

| Recommendation | Risk | Description |
|----------------|------|-------------|
| Check pod health | Low | Verify pods are running |
| Review readiness probe | Medium | Probe may be too strict |
| Scale deployment | Medium | May need more replicas |

---

## Proposed Fixes (Safe by Design)

When a fix is available, it includes:

1. **Preview Diff** - Shows exactly what will change
2. **Dry-Run Command** - Test without applying
3. **Confirmation Required** - User must explicitly approve
4. **Rollback Info** - How to revert if needed

**Safety Rules:**
- Never auto-apply any changes
- No RBAC or cluster-wide modifications
- Namespace-scoped only
- Must show diff before apply

---

## Integration with Event Monitor

The Incident Intelligence System integrates with KubeGraf's existing Event Monitor:

1. **Event Monitor** emits `NormalizedSignal` for each K8s event
2. **Signal Normalizer** processes raw signals
3. **Incident Manager** orchestrates detection and aggregation
4. **Real-time Updates** via WebSocket to UI

---

## Troubleshooting

### No Incidents Showing

1. Ensure cluster is connected (check status in sidebar)
2. Verify events are being received (check /api/events)
3. Not all events create incidents - only failure patterns

### Incident Not Auto-Resolving

Incidents resolve when:
- No new signals for the fingerprint in 5 minutes
- Manually marked as resolved

### High Number of Incidents

Consider:
- Filtering by namespace to focus
- Adjusting symptom thresholds (advanced)
- Investigating root cause for noisy patterns

---

## Production Readiness Checklist

- ✅ Works fully offline (no cloud dependencies)
- ✅ Deterministic rules (no AI guessing)
- ✅ Explainable output (every conclusion has evidence)
- ✅ No auto-mutation (user must approve all changes)
- ✅ Efficient (event-driven, not polling)
- ✅ Multi-cluster compatible
- ✅ Safe for production use

---

## Future Improvements

- [ ] Custom symptom rules via YAML config
- [ ] Slack/PagerDuty integration for alerts
- [ ] Historical incident analytics
- [ ] Machine learning for pattern discovery (opt-in)
- [ ] Runbook linking for recommendations

