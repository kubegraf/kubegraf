# KubeGraf Incident Intelligence System

A production-ready, deterministic incident detection and diagnosis system for Kubernetes clusters. This system converts raw Kubernetes errors, events, logs, and pod states into structured incidents with human-readable summaries, evidence-backed diagnoses, and actionable recommendations.

## Overview

The Incident Intelligence System is designed for **real production use** by senior SREs. It provides:

- **Structured Incidents** - Not raw error spam, but properly aggregated, deduplicated incidents
- **Evidence-Backed Diagnoses** - Every conclusion is supported by actual signals from the cluster
- **Deterministic Rules** - No AI hallucinations or guessing; pure rule-based logic
- **Safe Recommendations** - Suggested fixes that never auto-execute (unless auto-remediation is enabled)
- **Offline-First** - Works completely locally with just kubeconfig
- **Multi-Cluster** - Strict cluster context filtering ensures incidents are cluster-specific

## Core Principles

1. **Think in Failure Patterns, not error codes** - A 502 error is a symptom, not the pattern
2. **Deterministic, rule-based logic only** - Reproducible and explainable
3. **Every conclusion must have evidence** - No "might be" language
4. **Never auto-apply fixes (by default)** - Always show preview + diff before apply (unless auto-remediation enabled)
5. **Namespace-scoped actions only** - Safe for production clusters
6. **Cluster context isolation** - Incidents are strictly filtered by active cluster

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
| **Summary Cards** | Quick stats for Critical, High, Medium, Warning, With Diagnosis, and Fixable incidents |
| **Filter Bar** | Filter by severity, namespace, pattern type, status |
| **Incident Table** | List of all incidents with status, resource, and timing |
| **Show Intelligence Panels** | Toggle button to show/hide auto-remediation and learning panels |
| **Auto-Remediation Panel** | Status, stats, and controls for auto-remediation |
| **Learning Dashboard** | Incident clusters, patterns, and trends |

### Viewing an Incident

Click on any incident row to open the **Incident Detail View** - a comprehensive, production-ready modal that explains:

1. **Header** - Title, resource, severity, confidence, status, timestamps
2. **Signal Summary** - All signals that triggered the incident (restarts, OOMKilled, exit codes, etc.)
3. **Root Cause** - Primary and secondary root causes with evidence
4. **Timeline** - Chronological reconstruction of events
5. **Log Error Analysis** - Grouped error patterns from container logs
6. **Availability Impact** - HTTP impact, service exposure, affected replicas
7. **Change Intelligence** - Recent changes before the incident
8. **Recommended Fixes** - Safe fixes with preview (only if confidence ≥ 80%)
9. **Knowledge Bank** - Similar past incidents and feedback

All sections are collapsible and lazy-loaded for optimal performance. The snapshot API ensures instant loading (<100ms when cached).

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
| `IMAGE_PULL_FAILURE` | Container image issues | ErrImagePull, ImagePullBackOff |
| `CONFIG_ERROR` | ConfigMap/Secret issues | Missing mounts, invalid config |
| `UNSCHEDULABLE` | Pod scheduling failures | Resource constraints, node issues |
| `NODE_NOT_READY` | Node availability issues | Node conditions, NotReady status |
| `PVC_PENDING` | Persistent volume issues | Storage class issues, volume binding failures |
| `DEPLOYMENT_UNAVAILABLE` | Deployment replica health | Unavailable replicas, no ready replicas |

---

## API Endpoints

### Core Incident APIs

```bash
# Get all incidents (with filtering)
GET /api/v2/incidents?namespace={ns}&pattern={pattern}&severity={severity}&status={status}&page={page}&pageSize={size}

# Get incident snapshot (fast, cached, hot-path)
GET /api/v2/incidents/{id}/snapshot

# Get full incident details
GET /api/v2/incidents/{id}

# Get incident summary statistics
GET /api/v2/incidents/summary

# Update incident status
PUT /api/v2/incidents/{id}
{
  "status": "resolved",
  "resolution": "Fixed by restarting pod"
}

# Resolve incident
POST /api/v2/incidents/{id}/resolve
{
  "resolution": "Manually resolved"
}
```

### Snapshot API (Hot Path)

The snapshot endpoint provides instant loading with precomputed data:

```bash
GET /api/v2/incidents/{id}/snapshot
```

**Response includes:**
- Hot evidence (restart counts, exit codes, error strings, readiness status)
- Diagnosis (summary, root causes, confidence)
- Impact (affected replicas, service exposure, user-facing likelihood)
- Why now explanation
- Recommended first action
- Cached with 5-minute TTL for performance

**Performance:** Designed to respond in <100ms (cached) or <500ms (cache miss)

### Cold Evidence APIs (Lazy-Loaded)

These endpoints fetch additional evidence on-demand:

```bash
# Get incident logs (cold evidence)
GET /api/v2/incidents/{id}/logs?tail=20

# Get incident metrics (cold evidence)
GET /api/v2/incidents/{id}/metrics

# Get incident changes (cold evidence)
GET /api/v2/incidents/{id}/changes?lookback=60

# Get evidence pack (structured evidence items)
GET /api/v2/incidents/{id}/evidence

# Get citations (references with K8s doc links)
GET /api/v2/incidents/{id}/citations

# Get applicable runbooks
GET /api/v2/incidents/{id}/runbooks

# Find similar incidents
GET /api/v2/incidents/{id}/similar
```

### Fix APIs

```bash
# Preview a fix (shows diff, dry-run command)
POST /api/v2/incidents/{id}/fix-preview
{
  "fixId": "rb-restart-pod",
  "resourceNamespace": "default",
  "resourceKind": "Pod",
  "resourceName": "my-pod"
}

# Apply a fix
POST /api/v2/incidents/{id}/fix-apply
{
  "fixId": "rb-restart-pod",
  "confirmed": true,
  "resourceNamespace": "default",
  "resourceKind": "Pod",
  "resourceName": "my-pod"
}
```

### Auto-Remediation APIs

```bash
# Get auto-remediation status
GET /api/v2/auto-remediation/status

# Response includes:
# {
#   "enabled": true/false,
#   "total": 0,
#   "success": 0,
#   "failed": 0,
#   "rolledBack": 0,
#   "active": 0,
#   "queued": 0,
#   "inCooldown": 0
# }

# Enable auto-remediation globally
POST /api/v2/auto-remediation/enable

# Disable auto-remediation globally
POST /api/v2/auto-remediation/disable

# Get recent decisions (last 20)
GET /api/v2/auto-remediation/decisions

# Response includes:
# {
#   "decisions": [
#     {
#       "incidentId": "...",
#       "runbookId": "...",
#       "decision": "execute|skip|blocked",
#       "reason": "...",
#       "confidence": 0.95,
#       "successRate": 0.98,
#       "timestamp": "..."
#     }
#   ]
# }
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
  "outcome": "worked|not_worked|incorrect_cause",
  "appliedFixId": "rb-restart-pod",  # Optional
  "appliedFixType": "restart",        # Optional
  "notes": "Fixed by restarting pod"  # Optional
}

# Response includes learning status and outcome ID
# {
#   "status": "success",
#   "message": "Feedback recorded",
#   "outcomeId": 123,
#   "learningStatus": { ... }
# }
```

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
│    Tags signals with ClusterContext                              │
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
│    Filters by ClusterContext (strict matching)                   │
│    Clears incidents from inactive clusters                       │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                Diagnosis Generator (diagnosis.go)                │
│    Creates human-readable summary with evidence                  │
│    Avoids cross-layer assumptions                                │
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
│              Snapshot Builder (snapshot.go)                      │
│    Precomputes hot evidence, diagnosis, impact                   │
│    Caches with 5-minute TTL for performance                      │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                        API Handlers                              │
│    GET /snapshot (hot path) │  GET /logs │  GET /evidence        │
└─────────────────────────────────────────────────────────────────┘
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
    ClusterContext  string              // Cluster context where detected
    Signals         IncidentSignals     // Categorized signals
    Symptoms        []*Symptom          // Detected symptoms
    Diagnosis       *Diagnosis          // Human-readable diagnosis
    Recommendations []*Recommendation   // Suggested actions
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

**UI Rule:** Fixes are only shown if confidence ≥ 0.8 (80%)

---

## Multi-Cluster Support

The system supports multiple clusters with strict context-aware filtering:

- **Cluster Context**: Each incident is tagged with the cluster context where it was detected
- **Strict Context Filtering**: Only incidents that exactly match the current cluster context are shown
- **Immediate Cleanup**: When switching clusters, all incidents from other clusters are immediately cleared
- **Empty Context Handling**: Incidents with empty cluster context (legacy) are excluded when a cluster is active
- **Memory Efficient**: Prevents unbounded memory growth across multiple clusters
- **Thread-Safe Updates**: Cluster context updates are thread-safe with proper mutex locking

### Cluster Context Flow

1. **On Cluster Switch**:
   - Manager's cluster context is updated
   - Aggregator's cluster context is updated (thread-safe)
   - All incidents from other clusters are immediately cleared
   - Only incidents matching the new context remain

2. **On Incident Creation**:
   - Incidents automatically get the current cluster context
   - Ensures correct tagging from the start

3. **On Incident Query**:
   - `GetAllIncidents()` and `GetActiveIncidents()` filter by exact cluster context match
   - Empty context incidents are excluded when a cluster is active

**API**: Cluster context is automatically managed when switching via `/api/contexts/switch`

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
│  Layer 3: HOT EVIDENCE BUILDER                                   │
│  RestartCounts + ExitCode + ErrorString + Readiness + Changes   │
└────────────────────────────────┬────────────────────────────────┘
                                 ↓
┌─────────────────────────────────────────────────────────────────┐
│  Layer 4: SNAPSHOT BUILDER                                       │
│  Hot Evidence + Diagnosis + Impact + WhyNow + RecommendedAction │
└────────────────────────────────┬────────────────────────────────┘
                                 ↓
┌─────────────────────────────────────────────────────────────────┐
│  Layer 5: COLD EVIDENCE (Lazy-Loaded)                           │
│  Logs + Metrics + Changes + Evidence + Citations                │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📦 Evidence Pack

Every incident has a structured evidence bundle:

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

**UI Access:** Click incident → Signal Summary Panel (hot evidence) or Evidence API (cold evidence)

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

**UI Access:** Click incident → **Citations Panel** section

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
    Risk          RiskLevel       // low | medium | high | critical
    AutonomyLevel AutonomyLevel   // 0-3 (Observe/Recommend/Propose/Auto-Execute)
    SuccessRate   float64         // Historical success rate (0.0-1.0)
    BlastRadius   int             // Number of resources affected
}
```

### Built-in Runbooks

| Runbook | Pattern | Risk | Autonomy | Action |
|---------|---------|------|----------|--------|
| `restart-pod` | RESTART_STORM | Low | Auto-Execute (L3) | Delete pod to trigger recreation |
| `scale-up-deployment` | DEPLOYMENT_UNAVAILABLE | Low | Auto-Execute (L3) | Scale deployment +1 replica |
| `rolling-restart` | NO_READY_ENDPOINTS | Low | Auto-Execute (L3) | Rolling restart deployment |
| `increase-memory` | OOM_PRESSURE | Medium | Propose (L2) | Patch memory limits +50% |
| `retry-job` | APP_CRASH | Low | Propose (L2) | Delete failed job to retry |

**UI Access:** Click incident → **Recommended Fixes** section (only shown if confidence ≥ 80%)

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
- ✅ Confidence ≥ 0.9 (configurable, default 0.9)
- ✅ Success rate ≥ 0.95 (configurable, default 0.95)
- ✅ Runbook risk level is Low
- ✅ Rollback defined
- ✅ Resource not in blocked namespaces
- ✅ Runbook autonomy level ≥ 3 (Auto-Execute)

### Blocked Namespaces
- `kube-system`
- `kube-public`
- `kube-node-lease`

### Status Tracking

Auto-remediation tracks:
- **Total** - Total number of auto-remediation attempts
- **Success** - Successfully applied and verified fixes
- **Failed** - Fixes that failed verification
- **Rolled Back** - Fixes that were rolled back
- **Active** - Currently executing fixes
- **Queued** - Fixes waiting to execute
- **In Cooldown** - Resources in cooldown period (prevents rapid re-execution)

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
| `worked` | Applied fix was successful |
| `not_worked` | Applied fix didn't work |
| `incorrect_cause` | Root cause diagnosis was incorrect |

**UI Access:** Click incident → Footer feedback buttons (✓ Worked, ✗ Didn't Work, ⚠️ Incorrect Cause)

---

## 🔗 Similar Incidents

For each incident, find similar past incidents:

- Same failure pattern
- Similar resource types
- Comparable symptoms
- Previous resolutions

**UI Access:** Click incident → **Knowledge Bank** section

---

## 📊 UI Components

### Incidents Page

| Component | Location | Description |
|-----------|----------|-------------|
| **Summary Cards** | Top | Critical/High/Medium/Warning counts, With Diagnosis, Fixable |
| **Filter Bar** | Below summary | Filter by pattern, severity, namespace, status |
| **Incident Table** | Main | List of incidents with pattern, resource, severity, diagnosis, fixes, last seen |
| **Show Intelligence Panels** | Button | Toggle visibility of auto-remediation and learning panels |
| **Auto-Remediation Panel** | Side panel (toggleable) | Toggle auto-remediation, view stats (Disabled/Total/Success/Failed/Rolled Back/Active/Queued/In Cooldown), recent decisions |
| **Learning Dashboard** | Side panel (toggleable) | Incident clusters, learned patterns, trends |

### Incident Detail View (Production-Grade)

Click on any incident row to open the **IncidentDetailView** - a comprehensive, production-ready incident explanation UI.

#### Sections (in mandatory order):

1. **Incident Header**
   - Title, affected resource(s), severity, confidence %, status
   - First seen, last seen, occurrences
   - Compact and immediately scannable

2. **Signal Summary Panel**
   - Lists all signals that triggered the incident
   - Pod restarts, OOMKilled events, exit codes, error strings
   - Readiness failures, service endpoint issues
   - Each signal includes source attribution (e.g., `[Source: Pod status]`)

3. **Root Cause Explanation**
   - Single primary root cause
   - Optional secondary contributing factors
   - Deterministic language, bullet hierarchy
   - Confidence level and evidence bullets with source tags

4. **Timeline Reconstruction**
   - Chronological list of events
   - Deployments, pod lifecycle changes, Kubernetes warnings
   - Relative timestamps (e.g., "4 min ago")
   - Reads like an incident narrative

5. **Log Error Analysis**
   - Groups logs by error pattern
   - Error signature, count, sample log line
   - No infinite scrolling - shows top patterns

6. **Availability / HTTP Impact**
   - HTTP error codes detected (503, 500, etc.)
   - Ingress/service impact
   - User-facing likelihood, affected replicas
   - Shows "Unknown/Not detected yet" for missing data

7. **Change Intelligence**
   - What changed before the incident
   - Deployments, ConfigMaps, Secrets, Pods
   - Relative timestamps
   - Shows "No changes detected" if empty

8. **Recommended Fixes**
   - Each fix includes: title, reason, confidence, risk
   - Only shown if confidence ≥ 80%
   - Preview button for each fix

9. **Fix Preview Panel**
   - Shows kubectl dry-run diff output
   - Explicit confirmation required before apply
   - Apply button executes the fix

10. **Knowledge Bank**
    - Similar past incidents
    - Previous fix success rate
    - Feedback buttons: "Fix Worked", "Didn't Work", "Incorrect Cause"

11. **Metrics Analysis** (optional)
    - Incident-related metrics

12. **Citations Panel** (optional)
    - References to events, logs, K8s documentation

#### UI Features:

- **Collapsible Sections**: All sections can be expanded/collapsed
- **Lazy Loading**: Snapshot loads instantly; sections load on first expand
- **Caching**: Tab data cached in-memory while modal is open
- **Responsive**: Fullscreen on mobile, max-width 900px on desktop
- **Keyboard Support**: ESC closes modal, click outside closes
- **Sticky Footer**: Resolve and feedback buttons always visible

### Fix Preview Modal

When clicking a fix action:

1. Shows **description** of proposed fix
2. Shows **diff** (for patches)
3. Shows **dry-run command** to test
4. Shows **apply command** to execute
5. **Dry Run** button - test without applying
6. **Apply Fix** button - execute with confirmation

### Component Structure

```
ui/solid/src/components/incidents/
├── IncidentDetailView.tsx      # Main detail view (integrates all sections)
├── IncidentHeader.tsx          # Header section
├── SignalSummaryPanel.tsx      # Signal list
├── RootCauseExplanation.tsx    # Root cause display
├── TimelineReconstruction.tsx  # Event timeline
├── LogErrorAnalysis.tsx        # Log error grouping
├── AvailabilityImpact.tsx      # Impact assessment
├── ChangeIntelligence.tsx      # Change detection
├── RecommendedFixes.tsx        # Fix recommendations
├── FixPreviewPanel.tsx         # Fix preview modal
├── KnowledgeBank.tsx           # Similar incidents + feedback
├── MetricsAnalysis.tsx         # Metrics display
├── CitationsPanel.tsx          # Citations display
└── index.ts                    # Exports
```

---

## 📁 File Structure

### Backend Files

```
pkg/incidents/
├── types.go              # Core data structures (Incident, Diagnosis, etc.)
├── signals.go            # Signal normalization from K8s sources
├── symptoms.go           # Symptom detection rules
├── matcher.go            # Pattern matching engine
├── diagnosis.go          # Diagnosis generation
├── recommendations.go    # Recommendation rules per pattern
├── fixes.go              # Proposed fix logic (safe, preview-only)
├── aggregator.go         # Incident deduplication and aggregation
├── manager.go            # Central orchestration (with cluster context filtering)
├── evidence.go           # EvidencePack, EvidenceItem
├── citations.go          # Citation, CitedDiagnosis, K8s docs
├── runbooks.go           # Runbook, RunbookRegistry, RunbookExecutor
├── knowledge_bank.go     # SQLite storage for learning
├── autoremediation.go    # AutoRemediationEngine
├── learning.go           # LearningEngine, clustering, ranking
├── feedback.go           # Feedback APIs
├── snapshot.go           # IncidentSnapshot, snapshot builder
├── snapshot_cache.go     # LRU cache for snapshots
├── hot_evidence_builder.go # Hot evidence extraction
├── intelligence_handlers.go  # HTTP handlers for v2 APIs
└── intelligence_system.go    # Main orchestrator
```

### Frontend Files

```
ui/solid/src/
├── components/incidents/        # Production-grade incident detail components
│   ├── IncidentDetailView.tsx   # Main detail view (integrates all sections)
│   ├── IncidentHeader.tsx       # Header section
│   ├── SignalSummaryPanel.tsx   # Signal list with source attribution
│   ├── RootCauseExplanation.tsx # Root cause display
│   ├── TimelineReconstruction.tsx # Event timeline
│   ├── LogErrorAnalysis.tsx     # Log error grouping
│   ├── AvailabilityImpact.tsx   # Impact assessment
│   ├── ChangeIntelligence.tsx   # Change detection
│   ├── RecommendedFixes.tsx     # Fix recommendations (80% confidence rule)
│   ├── FixPreviewPanel.tsx      # Fix preview modal
│   ├── KnowledgeBank.tsx        # Similar incidents + feedback
│   ├── MetricsAnalysis.tsx      # Metrics display
│   ├── CitationsPanel.tsx       # Citations display
│   └── index.ts                 # Exports
├── stores/
│   └── incidentsV2.ts           # Store for snapshot and tab data caching
├── services/
│   └── api.ts                   # API service with snapshot and tab endpoints
└── routes/
    └── Incidents.tsx            # Main incidents page with table and panels
```

### Intelligence Components (Legacy - Kept for Auto-Remediation and Learning)

```
ui/solid/src/components/intelligence/
├── AutoRemediationPanel.tsx  # Auto-remediation control panel
├── LearningDashboard.tsx     # Learning insights panel
└── index.ts                  # Exports (only AutoRemediationPanel and LearningDashboard)
```

**Note:** Old duplicate components (`IncidentModalV2`, `IncidentDetailModal`, `EvidencePanel`, etc.) have been removed and replaced by the new `incidents/` components.

---

## Troubleshooting

### No Incidents Showing

1. Ensure cluster is connected (check status in sidebar)
2. Verify events are being received (check /api/events)
3. Not all events create incidents - only failure patterns
4. Check cluster context - incidents are filtered by active cluster

### Incident Not Auto-Resolving

Incidents resolve when:
- No new signals for the fingerprint in 5 minutes (configurable)
- Manually marked as resolved
- Auto-resolved after no activity for configured duration

### High Number of Incidents

Consider:
- Filtering by namespace to focus
- Adjusting symptom thresholds (advanced)
- Investigating root cause for noisy patterns
- Checking if incidents from other clusters are being shown (should not happen with strict filtering)

### Incidents from Other Clusters Visible

This should not happen with strict cluster context filtering. If it does:

1. Check that cluster context is being set correctly when switching clusters
2. Verify `SetClusterContext()` is being called on cluster switch
3. Check that incidents have correct `ClusterContext` field set
4. Ensure filtering logic in `GetAllIncidents()` is working correctly

---

## Production Readiness Checklist

- ✅ Works fully offline (no cloud dependencies)
- ✅ Deterministic rules (no AI guessing)
- ✅ Explainable output (every conclusion has evidence)
- ✅ No auto-mutation by default (user must approve all changes, unless auto-remediation enabled)
- ✅ Efficient (event-driven, not polling)
- ✅ Multi-cluster compatible with strict context filtering
- ✅ Safe for production use
- ✅ Thread-safe cluster context updates
- ✅ Memory-efficient incident management
- ✅ Fast snapshot API (<100ms cached)
- ✅ Lazy-loaded cold evidence

---

## Phase 1 Features (New)

### Change Intelligence

**What changed before this incident?**

Correlates Kubernetes changes with incidents by time window.

```bash
GET /api/v2/incidents/{id}/changes?lookback=60
```

**Response includes:**
- `changes[]` - List of changes with relevance scoring
- `relevanceScore` - 0.0 to 1.0 (higher = more likely related)
- `relationship` - "before", "during", or "after" the incident
- `timeDelta` - Human-readable time difference ("5m before")

**UI Component:** `ui/solid/src/components/incidents/ChangeIntelligence.tsx`

### Developer Mode ("Explain this Pod")

Deep pod analysis for developers.

```bash
GET /api/explain/pod?namespace=default&pod=my-pod
```

**Response includes:**
- `summary` - One-line status description
- `status` - "healthy", "warning", "error", "unknown"
- `timeline` - Lifecycle events
- `keyFindings` - Most important observations
- `containers` - Per-container analysis
- `restartAnalysis` - Restart pattern detection

---

---

## Log Analysis Feature

### Overview

The Log Analyzer parses pod logs to extract insights beyond Kubernetes events. It identifies:

- **External dependency issues** (backends down, connection refused)
- **Application errors** (panics, unhandled exceptions)
- **Memory issues** (OOM indicators in logs)
- **Network problems** (timeouts, DNS failures)

### Log Patterns

#### Dependency Issues (External)

| Pattern | Regex | Description |
|---------|-------|-------------|
| `haproxy_backend_down` | `Server\s+\S+\s+is\s+DOWN` | Backend server unavailable |
| `haproxy_no_server` | `backend\s+\S+\s+has\s+no\s+server` | No healthy backends |
| `redis_connection_lost` | `redis.*connection\s+lost` | Redis connectivity issue |
| `database_connection_failed` | `database.*connection\s+failed` | DB connectivity issue |

#### Network Issues

| Pattern | Regex | Description |
|---------|-------|-------------|
| `layer4_timeout` | `Layer4\s+timeout\|L4TOUT` | Network layer timeout |
| `connection_refused` | `connection\s+refused\|ECONNREFUSED` | Service not listening |
| `connection_reset` | `connection\s+reset\|ECONNRESET` | Connection dropped |
| `dns_resolution_failed` | `DNS\s+resolution\s+failed` | DNS lookup failed |

#### Application Errors

| Pattern | Regex | Description |
|---------|-------|-------------|
| `panic_crash` | `panic:\|fatal\s+error:\|SIGSEGV` | Application panic |
| `unhandled_exception` | `unhandled\s+exception\|Traceback` | Uncaught exception |
| `oom_killed` | `OOMKilled\|Out\s+of\s+memory` | Memory exhaustion |

### Log Analysis Result

```json
{
  "podName": "redis-haproxy-6899d4dc89-gmh7c",
  "namespace": "default",
  "analyzedAt": "2026-01-16T10:30:00Z",
  "totalLines": 501,
  "insights": [
    {
      "patternName": "haproxy_backend_down",
      "category": "dependency",
      "severity": "high",
      "rootCause": "Backend server became unavailable - upstream dependency is down",
      "recommendedFix": "Check the health of the backend service.",
      "matchCount": 142,
      "isUpstreamIssue": true,
      "extractedDetails": {
        "backend": "redis/redis-master"
      }
    }
  ],
  "summary": "External dependency issue detected. Found 4 issue type(s)...",
  "overallSeverity": "critical",
  "primaryRootCause": "Backend server became unavailable",
  "isExternalIssue": true
}
```

### External Issue Detection

When `isExternalIssue: true`, the UI displays:

> "The logs indicate this may be caused by an **external dependency** (backend service, database, etc.) rather than this pod itself."

This helps operators quickly identify whether to investigate this pod or its upstream dependencies.

### When Log Analysis Shows "No significant issues"

Log Analysis runs for all Pod incidents but only shows detailed insights when actual problems are detected. When logs are healthy or contain no recognizable error patterns, you'll see:

```json
{
  "summary": "No significant issues detected in logs",
  "overallSeverity": "info",
  "insights": [],
  "totalLines": 10
}
```

This is normal for pods that are experiencing issues detected through Kubernetes events/status rather than application-level errors in logs.

---

## Performance Optimizations

### Background Scanning

The incident system uses **background scanning** with caching to provide fast UI response times:

```
┌─────────────────────────────────────────────────────────────────────┐
│                  Background Scanning Flow                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  1. Server starts → triggers background scan after 2s delay          │
│                                                                      │
│  2. API request arrives:                                             │
│     ├── Cache fresh? → Return immediately (< 100ms)                  │
│     └── Cache stale? → Return current data +                         │
│                        trigger background refresh                    │
│                                                                      │
│  3. Background scan completes → update cache timestamp               │
│                                                                      │
│  4. Next API request → return fresh data                             │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Cache Configuration

| Setting | Value | Description |
|---------|-------|-------------|
| **Cache TTL** | 30 seconds | How long cached data is considered fresh |
| **Snapshot TTL** | 5 minutes | How long individual snapshots remain valid |
| **Startup Delay** | 2 seconds | Delay before initial scan (wait for connection) |

### Implementation

```go
type IncidentIntelligence struct {
    // Caching for fast incident loading
    scanMu          sync.Mutex
    lastScanTime    time.Time
    scanInProgress  bool
    scanCacheTTL    time.Duration // Default 30 seconds
}

func (ii *IncidentIntelligence) IsCacheFresh() bool {
    ii.scanMu.Lock()
    defer ii.scanMu.Unlock()
    return !ii.lastScanTime.IsZero() &&
           time.Since(ii.lastScanTime) < ii.scanCacheTTL
}
```

### API Response with Scan Status

The API includes `scanInProgress` to indicate when a refresh is happening:

```json
{
  "incidents": [...],
  "total": 3,
  "summary": { "critical": 1, "high": 2 },
  "scanInProgress": true
}
```

The UI can show a subtle loading indicator while `scanInProgress` is true, without blocking user interaction.

---

## Future Improvements

- [x] Custom symptom rules via YAML config
- [ ] Slack/PagerDuty integration for alerts
- [x] Historical incident analytics
- [x] Machine learning for pattern discovery (local, opt-in)
- [x] Runbook linking for recommendations
- [ ] Custom runbook editor
- [ ] Prometheus/Grafana integration
- [x] Multi-cluster incident correlation
- [x] Production-grade incident detail view
- [x] Snapshot API for instant loading
- [x] Cluster context filtering
- [x] Log Analysis for Pod incidents
- [x] Background scanning with 30s cache TTL
- [x] External dependency detection in logs
