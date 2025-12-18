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

---

## 🆕 Autonomous AI SRE System (v2)

The Incident Intelligence System has been upgraded to a **production-ready autonomous AI SRE system** with:

- Deep summarized intelligence with evidence + citations
- High-accuracy fix proposals with preview → apply workflow
- Guarded auto-remediation with autonomy levels
- ML learning from new patterns
- Local knowledge bank (SQLite)

### Core Principles

1. **Deterministic first, ML second** - Rule-based core with optional ML enhancement
2. **Evidence before intelligence** - Every conclusion backed by signals
3. **Preview before apply** - Always show diff before mutation
4. **Rollback always available** - Every fix must be reversible
5. **Progressive autonomy** - Gated from observe-only to auto-execute
6. **Everything explainable** - No black-box decisions

---

## 🧠 Intelligence Pipeline

```
┌─────────────────────────────────────────────────────────────────┐
│  Layer 1: SIGNAL INGESTION                                       │
│  Events → Logs → Pod Status → Metrics → Probes                  │
└────────────────────────────────┬────────────────────────────────┘
                                 ↓
┌─────────────────────────────────────────────────────────────────┐
│  Layer 2: INCIDENT ENGINE                                        │
│  Pattern Detection → Confidence Scoring → Aggregation           │
└────────────────────────────────┬────────────────────────────────┘
                                 ↓
┌─────────────────────────────────────────────────────────────────┐
│  Layer 3: EVIDENCE PACK                                          │
│  Events + Logs + StatusFacts + MetricsFacts + ChangeHistory     │
└────────────────────────────────┬────────────────────────────────┘
                                 ↓
┌─────────────────────────────────────────────────────────────────┐
│  Layer 4: INTELLIGENT SUMMARY                                    │
│  Deterministic Summary + Cited Diagnosis + Runbook Match        │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📦 Evidence Pack

Every incident now has a structured evidence bundle:

```go
type EvidencePack struct {
    IncidentID    string         // Linked incident
    Events        []EvidenceItem // K8s events
    Logs          []EvidenceItem // Container logs
    StatusFacts   []EvidenceItem // Pod status snapshots
    MetricsFacts  []EvidenceItem // Metric observations
    ChangeHistory []EvidenceItem // Config/deployment changes
    ProbeResults  []EvidenceItem // Liveness/readiness results
}
```

**UI Access:** Click incident → **📦 Evidence** tab

---

## 📚 Citations

Every diagnosis includes citations to:

- **Event references** - Exact K8s event IDs
- **Log snippets** - Relevant log lines
- **Kubernetes documentation** - Links to official docs

```go
type Citation struct {
    Source string  // event | log | status | doc
    Ref    string  // Exact reference (event ID, log line, URL)
    Text   string  // Cited snippet
    Link   string  // Optional URL for docs
}
```

**Built-in K8s Docs:** OOMKilled, CrashLoopBackOff, ImagePullBackOff, DNS failures, RBAC issues, etc.

**UI Access:** Click incident → **📚 Citations** tab

---

## 📋 Runbook-Driven Fix Engine

Fixes are now driven by **runbooks** - predefined, tested remediation procedures:

```go
type Runbook struct {
    ID            string          // Unique runbook ID
    Name          string          // Human-readable name
    Description   string          // What this runbook does
    Pattern       FailurePattern  // Target failure pattern
    Preconditions []Check         // Must pass before execution
    Action        RunbookAction   // The actual fix action
    Verification  []Check         // Must pass after execution
    Rollback      *RunbookAction  // How to undo if verification fails
    Risk          string          // low | medium | high
    AutonomyLevel AutonomyLevel   // 0-3
}
```

### Built-in Runbooks

| Runbook | Pattern | Risk | Action |
|---------|---------|------|--------|
| `rb-restart-pod` | RESTART_STORM | Low | Delete pod to trigger recreation |
| `rb-increase-memory` | OOM_PRESSURE | Medium | Patch memory limits +50% |
| `rb-rolling-restart` | NO_READY_ENDPOINTS | Low | Rolling restart deployment |
| `rb-retry-job` | APP_CRASH | Low | Delete failed job to retry |

**UI Access:** Click incident → **📋 Runbooks** tab

---

## 🤖 Auto-Remediation

### Autonomy Levels

| Level | Name | Behavior |
|-------|------|----------|
| 0 | Observe | Only collect data, no recommendations |
| 1 | Recommend | Show suggestions to user |
| 2 | Propose | Show fix preview with diff, require user apply |
| 3 | Auto-Execute | Execute low-risk fixes automatically |

### Safety Guards

Auto-execute only allowed when:
- ✅ Confidence ≥ 0.9
- ✅ Runbook marked as safe
- ✅ Rollback defined
- ✅ Verification checks pass
- ✅ Resource not in blocked namespaces

### Blocked Namespaces
- `kube-system`
- `kube-public`
- `kube-node-lease`

**UI Access:** **🤖 Auto-Remediation** panel on Incidents page

---

## 🧠 Learning Engine

The system learns from incidents to improve over time:

### Incident Clusters
Similar incidents are grouped by fingerprint for pattern recognition.

### Pattern Stats
Track per-pattern: occurrences, resolutions, MTTR, success rates.

### Runbook Ranking
Runbooks are ranked by past success rate for each pattern.

### Anomaly Detection
New/unusual patterns are flagged for review.

**UI Access:** **🧠 Learning Intelligence** panel on Incidents page

---

## 💬 Feedback Loop

Users can provide feedback to improve the system:

| Feedback Type | Description |
|---------------|-------------|
| `resolved` | Mark incident as resolved |
| `root_cause_confirmed` | Confirm diagnosis was correct |
| `fix_worked` | Applied fix was successful |
| `fix_failed` | Applied fix didn't work |
| `dismiss` | Dismiss as false positive |
| `escalate` | Escalate for manual review |
| `note` | Add custom notes |

**UI Access:** Click incident → **💬 Feedback** tab

---

## 🔗 Similar Incidents

For each incident, find similar past incidents:

- Same failure pattern
- Similar resource types
- Comparable symptoms
- Previous resolutions

**UI Access:** Click incident → **🔗 Similar** tab

---

## 🆕 V2 API Endpoints

### Intelligence APIs

```bash
# Get full incident with intelligence
GET /api/v2/incidents/{id}

# Get evidence pack
GET /api/v2/incidents/{id}/evidence

# Get citations
GET /api/v2/incidents/{id}/citations

# Get applicable runbooks
GET /api/v2/incidents/{id}/runbooks

# Find similar incidents
GET /api/v2/incidents/{id}/similar
```

### Fix APIs

```bash
# Preview a fix (shows diff, dry-run command)
POST /api/v2/incidents/{id}/fix/preview
{
  "runbookId": "rb-restart-pod"
}

# Apply a fix
POST /api/v2/incidents/{id}/fix/apply
{
  "runbookId": "rb-restart-pod"
}

# Enable auto-remediation for incident
POST /api/v2/incidents/{id}/fix/auto-enable
```

### Auto-Remediation APIs

```bash
# Get auto-remediation status
GET /api/v2/auto-remediation/status

# Enable auto-remediation globally
POST /api/v2/auto-remediation/enable

# Disable auto-remediation globally
POST /api/v2/auto-remediation/disable

# Get recent decisions
GET /api/v2/auto-remediation/decisions
```

### Learning APIs

```bash
# Get incident clusters
GET /api/v2/learning/clusters

# Get learned patterns (including anomalies)
GET /api/v2/learning/patterns?anomalies=true

# Get pattern trends
GET /api/v2/learning/trends

# Find similar incidents
GET /api/v2/learning/similar?incidentId={id}
```

### Feedback API

```bash
# Submit feedback for an incident
POST /api/v2/incidents/{id}/feedback
{
  "type": "resolved",
  "content": "Fixed by restarting pod"
}
```

---

## 📊 UI Components

### Incidents Page

| Component | Location | Description |
|-----------|----------|-------------|
| **Summary Cards** | Top | Critical/High/Warning/Diagnosed/Fixable counts |
| **Incident Table** | Main | List of incidents with expandable details |
| **Auto-Remediation Panel** | Side panel | Toggle auto-remediation, view stats |
| **Learning Dashboard** | Side panel | Clusters, patterns, trends |

### Incident Detail Modal

Click "View Details" on any incident to see:

| Tab | Content |
|-----|---------|
| **📦 Evidence** | Events, logs, status, metrics, changes |
| **📚 Citations** | References with K8s doc links |
| **📋 Runbooks** | Available runbooks with preview |
| **🔗 Similar** | Similar past incidents |
| **💬 Feedback** | Provide feedback buttons |

### Fix Preview Modal

When clicking a fix action:

1. Shows **description** of proposed fix
2. Shows **diff** (for patches)
3. Shows **dry-run command** to test
4. Shows **apply command** to execute
5. **Dry Run** button - test without applying
6. **Apply Fix** button - execute with confirmation

---

## 📁 New Files

```
pkg/incidents/
├── evidence.go           # EvidencePack, EvidenceItem
├── citations.go          # Citation, CitedDiagnosis, K8s docs
├── runbooks.go           # Runbook, RunbookRegistry, RunbookExecutor
├── knowledge_bank.go     # SQLite storage for learning
├── autoremediation.go    # AutoRemediationEngine
├── learning.go           # LearningEngine, clustering, ranking
├── feedback.go           # Feedback APIs
├── intelligence_handlers.go  # HTTP handlers for v2 APIs
└── intelligence_system.go    # Main orchestrator

ui/solid/src/components/intelligence/
├── index.ts              # Exports
├── EvidencePanel.tsx     # Evidence pack display
├── CitationsPanel.tsx    # Citations with links
├── RunbookSelector.tsx   # Runbook selection + preview
├── SimilarIncidents.tsx  # Similar incidents list
├── FeedbackButtons.tsx   # Feedback actions
├── AutoRemediationPanel.tsx  # Auto-remediation control
├── LearningDashboard.tsx     # Learning insights
└── IncidentDetailModal.tsx   # Full incident detail modal
```

---

## Future Improvements

- [x] Custom symptom rules via YAML config
- [ ] Slack/PagerDuty integration for alerts
- [x] Historical incident analytics
- [x] Machine learning for pattern discovery (local, opt-in)
- [x] Runbook linking for recommendations
- [ ] Custom runbook editor
- [ ] Prometheus/Grafana integration
- [ ] Multi-cluster incident correlation

