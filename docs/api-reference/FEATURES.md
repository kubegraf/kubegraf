# KubeGraf Complete Feature Reference

> **All features implemented across v1, v2, and Phase 1 releases**

---

## 📋 Table of Contents

- [Overview](#overview)
- [Core Platform Features](#-core-platform-features)
- [Incident Intelligence System (v2)](#-incident-intelligence-system-v2)
- [Phase 1 Features (New)](#-phase-1-features-new)
- [API Reference](#-api-reference)
- [Frontend Components](#-frontend-components)
- [Backend Architecture](#-backend-architecture)

---

## Overview

KubeGraf is a production-grade Kubernetes management platform with three interfaces:

| Interface | Technology | Use Case |
|-----------|------------|----------|
| **Terminal UI** | Go + tview | SSH access, low-bandwidth environments |
| **Web Dashboard** | Go + embedded HTML | Browser-based management |
| **Solid.js UI** | Solid.js + Vite | Modern SPA with full CRUD operations |

---

## 🎯 Core Platform Features

### Workload Management
- **Pods** - List, view, shell, logs, restart, delete, port-forward
- **Deployments** - Scale, restart, rollback, history, YAML edit
- **StatefulSets** - Scale, restart, manage persistent state
- **DaemonSets** - View and manage node-level workloads
- **Jobs/CronJobs** - Trigger, view history, delete completed

### Networking
- **Services** - Port forwarding, endpoint discovery
- **Ingresses** - TLS config, routing rules
- **Network Policies** - Visual policy editor

### Configuration
- **ConfigMaps** - View/edit configuration data
- **Secrets** - Secure viewing, base64 encoding
- **Certificates** - Expiration tracking, TLS management

### Storage
- **PersistentVolumes** - View capacity, access modes
- **PersistentVolumeClaims** - Binding status, capacity
- **StorageClasses** - Provisioner configuration

### Cluster Management
- **Nodes** - Health, capacity, taints, labels
- **Namespaces** - Multi-namespace selection
- **RBAC** - Roles, bindings, permission visualization
- **Events** - Real-time event streaming

### Security & Compliance
- **Security Score** - 0-100 automated assessment
- **Vulnerability Detection** - Image scanning
- **Best Practices** - SecurityContext, NetworkPolicy checks

### Cost Management
- **Multi-Cloud Support** - GCP, AWS, Azure, IBM, Oracle, DigitalOcean, Alibaba, Linode, Vultr, OVH, Hetzner
- **Namespace Cost Allocation** - Per-namespace breakdown
- **Optimization Suggestions** - Right-sizing recommendations

### ML Workloads
- **Training Jobs** - Create, monitor, view logs
- **Inference Services** - Deploy, scale, HPA config
- **MLflow Integration** - Experiment tracking
- **Feast Integration** - Feature store management
- **GPU Dashboard** - DCGM metrics, utilization

### Integrations
- **Connectors** - GitHub, Slack, PagerDuty, Teams, Discord
- **AI Agents** - MCP (Model Context Protocol) support
- **SRE Agent** - Auto-remediation engine
- **Kiali** - Service mesh visualization

---

## 🔥 Incident Intelligence System (v2)

### Overview

The Incident Intelligence System is a **production-ready, deterministic SRE copilot** that:
- Converts raw Kubernetes errors into structured incidents
- Provides evidence-backed diagnoses
- Offers safe, preview-first fix recommendations
- Works completely offline (local-only)

### Failure Pattern Detection

| Pattern | Description | Triggers |
|---------|-------------|----------|
| `APP_CRASH` | Single application crash | Exit code != 0 |
| `CRASHLOOP` | CrashLoopBackOff cycles | BackOff events |
| `OOM_PRESSURE` | Out of memory | Exit 137, OOMKilled |
| `RESTART_STORM` | Rapid restarts | Multiple restarts in window |
| `NO_READY_ENDPOINTS` | Service has no backends | 0 endpoints |
| `INTERNAL_ERRORS` | HTTP 5xx from app | 500/503 in logs |
| `UPSTREAM_FAILURE` | Dependency failures | 502/503 upstream |
| `TIMEOUTS` | Request timeouts | 504 Gateway Timeout |
| `IMAGE_PULL_FAILURE` | Image issues | ErrImagePull |
| `CONFIG_ERROR` | ConfigMap/Secret issues | Missing mounts |
| `DNS_FAILURE` | DNS resolution problems | NXDOMAIN |
| `PERMISSION_DENIED` | RBAC issues | 403 errors |

### Incident Structure

```go
type Incident struct {
    ID             string          // Unique ID
    Fingerprint    string          // Deduplication key
    Pattern        FailurePattern  // Detected pattern
    Severity       Severity        // critical/high/medium/low
    Resource       KubeResourceRef // Affected resource
    Title          string          // Human summary
    Diagnosis      *Diagnosis      // Evidence-backed analysis
    Recommendations []Recommendation // Safe fixes
    FirstSeen      time.Time
    LastSeen       time.Time
    Occurrences    int
}
```

### Evidence Pack

Each incident includes an evidence bundle:
- **Events** - Kubernetes events with timestamps
- **Logs** - Container log snippets
- **StatusFacts** - Pod/container status
- **MetricsFacts** - Resource usage snapshots
- **ChangeHistory** - Recent changes to the resource

### Cited Diagnosis

Every diagnosis includes citations:
```json
{
  "summary": "Pod is in CrashLoopBackOff due to OOMKilled",
  "probableCauses": ["Memory limit too low", "Memory leak"],
  "confidence": 0.85,
  "citations": [
    { "source": "k8s-event", "ref": "OOMKilled at 2024-01-15T10:30:00Z" },
    { "source": "k8s-docs", "ref": "https://kubernetes.io/docs/..." }
  ]
}
```

### Runbook-Driven Fixes

Fixes are based on pre-defined runbooks:
```go
type Runbook struct {
    ID            string
    Pattern       FailurePattern
    Preconditions []Check     // Safety checks
    Action        RunbookAction
    Verification  []Check
    Rollback      string
    Risk          Risk
}
```

### Fix Actions

| Action Type | Description | Example |
|-------------|-------------|---------|
| `RESTART` | Delete pod for recreation | Restart crashed pod |
| `SCALE` | Adjust replica count | Scale deployment |
| `ROLLBACK` | Revert to previous version | Rollback deployment |
| `PREVIEW_PATCH` | Show diff before apply | Increase memory limits |
| `VIEW_LOGS` | Open logs viewer | Check container logs |
| `DESCRIBE` | Show resource details | Check probe config |
| `VIEW_EVENTS` | Open events viewer | Review exit codes |

### Guarded Auto-Remediation

Autonomy levels for safe automation:

| Level | Name | Behavior |
|-------|------|----------|
| 0 | Observe | Only detect, no action |
| 1 | Recommend | Suggest fixes |
| 2 | Propose | Generate preview, require approval |
| 3 | Auto-execute | Execute if confidence ≥ 0.9, safe, reversible |

### Knowledge Bank

SQLite-based local storage for:
- Incident fingerprints and history
- Evidence packs
- Confirmed root causes
- Applied fixes with outcomes
- Runbook success rates
- User feedback

### UI Features

- **Incident Table** - Filterable list with severity/namespace/pattern filters
- **Incident Detail Modal** - Tabs for Evidence, Citations, Runbooks, Similar, Feedback
- **Fix Preview Modal** - Diff view, dry-run, confirmation, execution summary
- **Intelligence Dashboard** - Learning stats, pattern clusters, trends
- **Recommendation Actions** - Clickable buttons for each fix type

---

## 🚀 Phase 1 Features (New)

### Feature 1: Change Intelligence

**What changed before this incident?**

Correlates Kubernetes changes (deployments, config changes, scaling events) with incidents by time window.

| Component | Location |
|-----------|----------|
| **Backend** | `internal/changes/correlator.go` |
| **API** | `GET /api/incidents/{id}/changes?lookback=30` |
| **Frontend** | `ui/solid/src/features/changes/ChangeTimeline.tsx` |

**Response:**
```json
{
  "incidentId": "inc-123",
  "incidentStart": "2024-01-15T10:30:00Z",
  "changes": [
    {
      "change": { "type": "deployment", "resourceName": "api-server", ... },
      "relevanceScore": 0.85,
      "relationship": "before",
      "timeDelta": "5m before"
    }
  ],
  "totalChanges": 12,
  "highRelevance": 3,
  "mediumRelevance": 5,
  "lowRelevance": 4
}
```

### Feature 2: Developer Mode ("Explain this Pod")

**Deep pod analysis for developers**

Provides a comprehensive explanation of a pod's lifecycle, restarts, probes, and issues.

| Component | Location |
|-----------|----------|
| **Backend** | `internal/explain/pod_explainer.go` |
| **API** | `GET /api/explain/pod?namespace=default&pod=my-pod` |
| **Frontend** | `ui/solid/src/features/developer/ExplainPodPanel.tsx` |

**Response:**
```json
{
  "summary": "Pod is running and all containers are ready",
  "status": "healthy",
  "timeline": [
    { "timestamp": "...", "event": "Pod Created", "severity": "info" },
    { "timestamp": "...", "event": "Container Started", "severity": "info" }
  ],
  "keyFindings": [
    { "category": "health", "description": "Pod is healthy", "severity": "info" }
  ],
  "containers": [
    { "name": "app", "status": "running", "ready": true, "restartCount": 0 }
  ],
  "restartAnalysis": {
    "totalRestarts": 0,
    "pattern": "stable",
    "recommendation": "No restarts detected. Pod is stable."
  }
}
```

### Feature 3: Multi-Cluster Summaries

**Aggregate incidents across all clusters**

| Component | Location |
|-----------|----------|
| **Backend** | `internal/clusters/summary.go` |
| **API** | `GET /api/clusters/summary` |
| **Frontend** | `ui/solid/src/features/clusters/MultiClusterSummary.tsx` |

**Response:**
```json
{
  "totalClusters": 3,
  "totalIncidents": 15,
  "clusters": [
    {
      "clusterId": "production",
      "clusterName": "production",
      "status": "warning",
      "healthScore": 0.75,
      "incidentCounts": { "critical": 0, "high": 2, "medium": 5 },
      "topPatterns": [{ "pattern": "RESTART_STORM", "count": 3 }]
    }
  ],
  "topPatterns": [{ "pattern": "OOM_PRESSURE", "count": 8 }],
  "severityCounts": { "critical": 2, "high": 5, "medium": 8 }
}
```

### Feature 4: Knowledge Bank Sharing

**Export/import incident knowledge between installations**

| Component | Location |
|-----------|----------|
| **Backend (Export)** | `internal/knowledge/exporter.go` |
| **Backend (Import)** | `internal/knowledge/importer.go` |
| **API Export** | `POST /api/knowledge/export` |
| **API Import** | `POST /api/knowledge/import` (multipart form) |
| **Frontend** | `ui/solid/src/features/knowledge/KnowledgeExportImport.tsx` |

**Export Format:**
```json
{
  "version": "1.0",
  "exportedAt": "2024-01-15T10:30:00Z",
  "description": "Production cluster knowledge",
  "entryCount": 50,
  "entries": [
    {
      "fingerprint": "fp-123",
      "pattern": "OOM_PRESSURE",
      "rootCause": "Memory limit too low for workload",
      "fixSummary": "Increased memory limit to 512Mi",
      "outcome": "success",
      "confidence": 0.9
    }
  ]
}
```

### Feature 5: Safe Fix Previews

**Preview fixes before applying**

Already exists and fully functional:

| Component | Location |
|-----------|----------|
| **Backend** | `pkg/incidents/fixes.go` |
| **API Preview** | `POST /api/v2/incidents/{id}/fix/preview` |
| **API Apply** | `POST /api/v2/incidents/{id}/fix/apply` |
| **Frontend** | `ui/solid/src/components/FixPreviewModal.tsx` |

---

## 📡 API Reference

### Legacy API (v1)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/incidents` | GET | List incidents (basic) |
| `/api/pods` | GET | List pods |
| `/api/deployments` | GET | List deployments |
| `/api/services` | GET | List services |
| `/api/events` | GET | Real-time events (WebSocket) |

### Incident Intelligence API (v2)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v2/incidents` | GET | List incidents with full intelligence |
| `/api/v2/incidents/{id}` | GET | Get incident details |
| `/api/v2/incidents/summary` | GET | Incident statistics |
| `/api/v2/incidents/patterns` | GET | Pattern distribution |
| `/api/v2/incidents/refresh` | POST | Refresh incident data |
| `/api/v2/incidents/{id}/fix/preview` | POST | Preview a fix |
| `/api/v2/incidents/{id}/fix/apply` | POST | Apply a fix |
| `/api/v2/incidents/{id}/evidence` | GET | Get evidence pack |
| `/api/v2/incidents/{id}/citations` | GET | Get citations |
| `/api/v2/runbooks` | GET | List available runbooks |
| `/api/v2/learning/clusters` | GET | Learning cluster data |
| `/api/v2/learning/patterns` | GET | Pattern learning stats |
| `/api/v2/auto-remediation/status` | GET | Auto-remediation status |
| `/api/v2/feedback` | POST | Submit user feedback |

### Phase 1 API

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/incidents/{id}/changes` | GET | Change correlation |
| `/api/explain/pod` | GET | Pod explanation |
| `/api/clusters/summary` | GET | Multi-cluster summary |
| `/api/knowledge/export` | POST | Export knowledge |
| `/api/knowledge/import` | POST | Import knowledge |

---

## 🎨 Frontend Components

### Core Components

| Component | Path | Description |
|-----------|------|-------------|
| `IncidentTable` | `components/IncidentTable.tsx` | Main incident list |
| `IncidentDetailModal` | `components/intelligence/IncidentDetailModal.tsx` | Full incident view |
| `FixPreviewModal` | `components/FixPreviewModal.tsx` | Fix preview/apply |
| `ActionMenu` | `components/ActionMenu.tsx` | Per-incident actions |
| `EvidencePanel` | `components/intelligence/EvidencePanel.tsx` | Evidence display |
| `CitationsPanel` | `components/intelligence/CitationsPanel.tsx` | Citations display |
| `RunbookSelector` | `components/intelligence/RunbookSelector.tsx` | Runbook selection |

### Phase 1 Components

| Component | Path | Description |
|-----------|------|-------------|
| `ChangeTimeline` | `features/changes/ChangeTimeline.tsx` | Change correlation |
| `ExplainPodPanel` | `features/developer/ExplainPodPanel.tsx` | Pod explainer |
| `MultiClusterSummary` | `features/clusters/MultiClusterSummary.tsx` | Cluster overview |
| `KnowledgeExportImport` | `features/knowledge/KnowledgeExportImport.tsx` | Knowledge sharing |

---

## 🏗️ Backend Architecture

### Package Structure

```
kubegraf/
├── main.go                    # Entry point
├── web_server.go              # HTTP server & routes
├── web_incidents_v2.go        # v2 incident handlers
├── web_phase1.go              # Phase 1 feature handlers
├── app_helpers.go             # App helper methods
│
├── pkg/incidents/             # Incident Intelligence Core
│   ├── types.go               # Domain models
│   ├── patterns.go            # Failure patterns
│   ├── signals.go             # Signal normalization
│   ├── symptoms.go            # Symptom detection
│   ├── matcher.go             # Pattern matching
│   ├── aggregator.go          # Incident aggregation
│   ├── diagnosis.go           # Diagnosis generation
│   ├── recommendations.go     # Recommendation engine
│   ├── fixes.go               # Fix executor
│   ├── fix_generators.go      # Fix generation
│   ├── runbooks.go            # Runbook registry
│   ├── evidence.go            # Evidence pack builder
│   ├── citations.go           # Citation generator
│   ├── knowledge_bank.go      # SQLite storage
│   ├── autoremediation.go     # Auto-remediation engine
│   ├── learning.go            # ML learning engine
│   └── manager.go             # System coordinator
│
├── internal/                  # Internal packages
│   ├── changes/               # Change Intelligence
│   │   └── correlator.go
│   ├── explain/               # Developer Mode
│   │   └── pod_explainer.go
│   ├── clusters/              # Multi-Cluster
│   │   └── summary.go
│   ├── knowledge/             # Knowledge Sharing
│   │   ├── exporter.go
│   │   └── importer.go
│   └── history/               # Historical data
│       ├── types.go
│       ├── service.go
│       └── datasource.go
│
└── ui/solid/src/              # Frontend
    ├── components/            # Shared components
    ├── features/              # Feature modules
    ├── routes/                # Page routes
    ├── stores/                # State management
    └── services/              # API clients
```

### Key Interfaces

```go
// Incident aggregation
type IncidentAggregator interface {
    ProcessSignal(signal *NormalizedSignal)
    GetIncident(id string) *Incident
    GetActiveIncidents() []*Incident
}

// Recommendation generation
type RecommendationEngine interface {
    GenerateRecommendations(incident *Incident) []Recommendation
}

// Fix execution
type FixExecutor interface {
    GeneratePreview(incident *Incident, rec *Recommendation) (*FixPreview, error)
    ExecuteFix(preview *FixPreview, dryRun bool) (*FixResult, error)
}

// Knowledge storage
type KnowledgeBank interface {
    StoreIncident(incident *Incident) error
    FindSimilarIncidents(fingerprint string) ([]*IncidentRecord, error)
    GetRunbookSuccessRate(runbookID string) (float64, int)
}
```

---

## 🔧 Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `KUBEGRAF_PORT` | 3003 | Web server port |
| `KUBEGRAF_DATA_DIR` | ~/.kubegraf | Data directory |
| `KUBEGRAF_LOG_LEVEL` | info | Log verbosity |

### Knowledge Bank Location

```
~/.kubegraf/
├── knowledge.db          # SQLite knowledge bank
├── config.yaml           # User configuration
└── telemetry_state.json  # Telemetry state
```

---

## 📚 Additional Documentation

| Document | Description |
|----------|-------------|
| [INCIDENT_INTELLIGENCE.md](docs/INCIDENT_INTELLIGENCE.md) | Detailed incident system docs |
| [AI_AGENT_INTEGRATION.md](docs/AI_AGENT_INTEGRATION.md) | MCP agent integration |
| [CONNECTORS_GUIDE.md](docs/CONNECTORS_GUIDE.md) | External integrations |
| [ML_FEATURES_OVERVIEW.md](docs/ML_FEATURES_OVERVIEW.md) | ML workload features |
| [MARKETPLACE.md](docs/MARKETPLACE.md) | Apps marketplace |

---

*Last updated: December 2024*

