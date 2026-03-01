# KubeGraf — Full System Reference

> **Last updated**: 2026-03-01
> End-to-end reference: Go backend APIs, pkg/graph engine, SolidJS frontend files, Orkas AI integration, UI↔API mapping, configs, roadmap.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Go Backend — File Map](#2-go-backend--file-map)
3. [pkg/graph — Live Topology Graph Engine](#3-pkggraph--live-topology-graph-engine)
4. [Go Backend — All API Routes](#4-go-backend--all-api-routes)
5. [SolidJS Frontend — File Map](#5-solidjs-frontend--file-map)
6. [SolidJS Frontend — Component Details](#6-solidjs-frontend--component-details)
7. [UI ↔ API Mapping](#7-ui--api-mapping)
8. [Orkas AI Integration](#8-orkas-ai-integration)
9. [v1 / v2 / v3 Product Roadmap](#9-v1--v2--v3-product-roadmap)
10. [Build & Run Reference](#10-build--run-reference)
11. [Configuration](#11-configuration)
12. [Implementation Status](#12-implementation-status)
13. [Key Design Decisions](#13-key-design-decisions)

---

## 1. Architecture Overview

```
┌──────────────────────────────────────────────────────────────────────────────────────┐
│                         KubeGraf (default port 3003)                                  │
│                                                                                        │
│  ┌──────────────────────────────────────────────────────────────────────────────┐     │
│  │                     SolidJS Frontend (browser)                                │     │
│  │                                                                               │     │
│  │   IntelligentWorkspace (root)                                                 │     │
│  │    ├── HomeScreen          Cluster health, SLOs, incident list                │     │
│  │    ├── IncidentDetail      Deep-dive: timeline, fix, RCA, AI                 │     │
│  │    ├── WorkloadScreen      Pods, deployments, statefulsets                   │     │
│  │    ├── ContextGraphScreen  Service topology canvas graph                     │     │
│  │    ├── WorkspacePanels     Metrics, GitOps, Cost panels                      │     │
│  │    ├── OrkasAIPanel        Global AI assistant (Ask + Knowledge + Incidents) │     │
│  │    └── ContextNavigator    Sidebar: incident list, filters                   │     │
│  └──────────────────────────────────────────────────────────────────────────────┘     │
│                  │ HTTP REST + WebSocket (/ws)                                         │
│  ┌───────────────▼──────────────────────────────────────────────────────────────┐     │
│  │                  Go Backend (web_server.go)                                   │     │
│  │   400+ REST/WebSocket endpoints                                               │     │
│  │   Embeds web/dist via //go:embed (no separate web server)                    │     │
│  │                                                                               │     │
│  │  ┌─────────────────────────────────────────────────────────────┐             │     │
│  │  │           pkg/graph — Live Topology Graph Engine             │             │     │
│  │  │                                                              │             │     │
│  │  │   Engine (SharedInformerFactory — 13 resource types)         │             │     │
│  │  │   ├── types.go      — 21 NodeKinds, 15 EdgeKinds, types     │             │     │
│  │  │   ├── patterns.go   — 10 encoded failure patterns            │             │     │
│  │  │   ├── engine.go     — in-memory graph, edge construction     │             │     │
│  │  │   └── inference.go  — BFS causal chain, blast radius         │             │     │
│  │  │                                                              │             │     │
│  │  │   HTTP surface (web_graph.go):                               │             │     │
│  │  │   GET  /api/graph/status                                     │             │     │
│  │  │   GET  /api/graph/topology                                   │             │     │
│  │  │   POST /api/graph/analyze                                    │             │     │
│  │  │   GET  /api/graph/blast-radius                               │             │     │
│  │  │   GET  /api/graph/node                                       │             │     │
│  │  │   POST /api/graph/remediation                                │             │     │
│  │  └─────────────────────────────────────────────────────────────┘             │     │
│  └──────┬────────────────────────────────────────────────────────────────────────┘    │
│         │                         │                                                    │
│  Kubernetes API             Ollama/OpenAI/Claude                                      │
│  (client-go informers)      Built-in AI at /api/ai/*                                 │
└──────────────────────────────────────────────────────────────────────────────────────┘
               │  Direct HTTP from browser (localhost:8000)
               ▼
┌──────────────────────────────────────────────────────────────────────────────────────┐
│                       Orkas AI — FastAPI (port 8000)                                  │
│                                                                                        │
│   POST /ask  ·  POST /incident/fix  ·  POST /incident/rca                             │
│   POST /incident/brief  ·  GET /k8s/context  ·  GET /models                          │
│   POST /terraform/review  ·  POST /ingest/docs  ·  POST /ingest/bulk                 │
│                                                                                        │
│   Kubegraf graph tools (Orkas AI calls back into KubeGraf):                          │
│   POST /api/graph/analyze     → CausalChain                                           │
│   POST /api/graph/remediation → RemediationPlan                                       │
│   GET  /api/graph/blast-radius → affected scope                                       │
│   GET  /api/graph/topology    → cluster topology                                      │
│                                                                                        │
│   RAG (Weaviate) · Session memory (Redis) · Multi-model LLM routing                  │
└──────────────────────────────────────────────────────────────────────────────────────┘
```

**Key facts:**
- Single Go binary serves both API and embedded frontend (`//go:embed web/dist`)
- Frontend calls KubeGraf's own `/api/*` for all K8s data and built-in AI
- Frontend calls **Orkas AI** (`localhost:8000`) directly from two components: `OrkasAIPanel` and `IncidentDetail`
- KubeGraf has its **own** built-in AI (`/api/ai/*`) using Ollama/OpenAI/Claude — separate from Orkas AI
- The **graph engine is the reasoning layer** — the LLM is only the natural-language communication interface
- The graph engine starts automatically on `NewWebServer()` if a K8s clientset is available

### The Core Architecture Principle

```
WRONG mental model:
  LLM reasons about K8s → reads raw metrics/logs → draws conclusions

CORRECT mental model:
  Graph Engine reasons (deterministic BFS + pattern matching)
  → produces structured CausalChain with confidence score
  → LLM reads structured output and translates to natural language

Signal-correlation tools (e.g. Deductive.ai) correlate data.
KubeGraf models the system. Causal reasoning requires a model.
```

---

## 2. Go Backend — File Map

| File | Responsibility |
|------|----------------|
| `main.go` | CLI entry, command dispatch |
| `web_server.go` | HTTP server setup, **all route registration**, middleware, graphEngine init |
| `web_graph.go` | **NEW** — `/api/graph/*` HTTP handlers (topology, analyze, blast-radius, remediation) |
| `resources.go` | K8s resource list handlers (pods, deployments, services, etc.) |
| `operations.go` | Resource CRUD: update, delete, scale, restart |
| `events.go` | K8s events fetching |
| `event_handlers.go` | Event WebSocket broadcasting |
| `event_handlers_enhanced.go` | Enhanced event processing + grouping |
| `event_correlation.go` | Cross-resource event correlation engine |
| `event_storage.go` | SQLite event persistence |
| `web_event_grouped.go` | Grouped events API endpoint |
| `helpers.go` | Shared utilities: pod metrics, cost helpers, formatting |
| `graph.go` | Service topology graph builder (legacy — predates pkg/graph) |
| `graph_d3.go` | D3.js-compatible graph data formatter |
| `graph_canvas.go` | Canvas topology renderer data |
| `traffic.go` | Traffic metrics between services |
| `traffic_graph.go` | Traffic topology visualization |
| `traffic_graph_kiali.go` | Kiali-specific traffic graph integration |
| `traffic_metrics_prometheus.go` | Prometheus traffic metrics client |
| `prometheus_client.go` | Prometheus API client |
| `diagnostics.go` | Diagnostics engine: pattern detection, AI explanations |
| `drift.go` | Config drift detection (vs. stored state) |
| `vulnerabilities.go` | Container image CVE scanning |
| `mapping.go` | Resource dependency mapping |
| `ui.go` | Static file serving (embedded `web/dist`) |
| `web_ui.go` | UI metadata endpoints |
| `web_workspace.go` | Workspace context + multi-cluster APIs |
| `workspace_context.go` | Multi-cluster context management logic |
| `workspace_context_store.go` | Context persistence (SQLite) |
| `web_handler_utils.go` | Shared handler utilities (JSON helpers, auth wrappers) |
| `web_handlers_impact.go` | Impact analysis: what breaks if resource is deleted |
| `web_security.go` | Security analysis endpoints (RBAC, pod security, CVEs) |
| `web_brain_ml.go` | Brain ML API route handlers |
| `brain_ml_predictions.go` | ML predictions engine |
| `brain_ml_timeline.go` | ML timeline builder |
| `brain_ml_summary.go` | ML summary aggregator |
| `web_kiali.go` | Kiali proxy and management endpoints |
| `kiali_detector.go` | Kiali service mesh detection |
| `kiali_installer.go` | Kiali installation automation |
| `kiali_proxy.go` | HTTP proxy to Kiali API |
| `web_mlflow.go` | MLflow proxy and management endpoints |
| `mlflow_detector.go` | MLflow detection |
| `mlflow_installer.go` | MLflow installation automation |
| `mlflow_proxy.go` | HTTP proxy to MLflow API |
| `web_feast.go` | Feast feature store endpoints |
| `feast_detector.go` | Feast detection |
| `feast_installer.go` | Feast installation automation |
| `web_gpu.go` | GPU metrics endpoints |
| `gpu_detector.go` | GPU hardware detection |
| `gpu_installer.go` | GPU support (NVIDIA) installation |
| `gpu_metrics.go` | GPU utilization metrics |
| `gpu_node_detector.go` | GPU-capable node detection |
| `web_inference.go` | ML inference service management API |
| `inference_creator.go` | Inference service creation |
| `inference_manager.go` | Inference service lifecycle |
| `inference_portforward.go` | Inference port-forwarding |
| `inference_tester.go` | Inference endpoint testing |
| `web_ml_jobs.go` | ML training job management API |
| `ml_job_creator.go` | Training job creation |
| `ml_job_logs.go` | Training job log streaming |
| `ml_job_manager.go` | Training job lifecycle |
| `web_traffic_metrics.go` | Traffic metrics API |
| `web_database_backup.go` | Database backup/restore API |
| `web_custom_resources.go` | Custom Resource (CRD) management |
| `connector_handlers.go` | External connector HTTP handlers |
| `connectors.go` | Connector types and management (Jira, Slack, GitHub) |
| `sre_handlers.go` | SRE agent HTTP endpoints |
| `history_handlers.go` | Event history timeline API |
| `iam.go` | IAM / cloud provider auth (GKE, EKS, AKS) |
| `mcp_server.go` | MCP (Model Context Protocol) server entry |
| `mcp/server/protocol.go` | MCP protocol handler |
| `mcp/registry/registry.go` | MCP tool registry |
| `mcp/tools/register.go` | Tool registration |
| `mcp/tools/ai/analyze_pod.go` | MCP AI pod analysis tool |
| `mcp/tools/kubernetes/kubectl_get.go` | MCP kubectl get tool |
| `mcp/tools/kubernetes/kubectl_describe.go` | MCP kubectl describe tool |
| `mcp/tools/kubernetes/kubectl_logs.go` | MCP kubectl logs tool |
| `plugins/sdk.go` | Plugin SDK for third-party extensions |
| `cost/` | Cloud cost estimation: AWS, GCP, Azure, default pricing |
| `brain/types.go` | Brain intelligence type definitions |
| `brain/validators.go` | Brain output validators |
| `internal/database/cluster_store.go` | Cluster-scoped SQLite store |
| `internal/history/datasource.go` | History data source |
| `internal/history/service.go` | History service layer |
| `internal/brain/brain_ml_types.go` | Brain ML type definitions |
| `internal/inference/inference_types.go` | Inference service types |
| `internal/ml/ml_job_types.go` | ML job types |
| `internal/gpu/gpu_types.go` | GPU types |
| `internal/feast/feast_types.go` | Feast types |
| `internal/web/web_update_handlers.go` | Update check/install handlers |
| `internal/validation/pod_validator.go` | Pod data validation |
| `internal/validation/data_accuracy_checker.go` | Data accuracy checks |
| `internal/validation/api_test_runner.go` | Internal API test runner |

### pkg/ packages

| Package | Files | Purpose |
|---------|-------|---------|
| `pkg/graph/` | `types.go`, `patterns.go`, `engine.go`, `inference.go` | **Live topology graph engine** — core causal reasoning layer |

---

## 3. pkg/graph — Live Topology Graph Engine

This is the most important new package in KubeGraf. It is the product's core differentiator.

### 3.1 Why This Exists

Signal-correlation tools correlate metrics and events against each other. KubeGraf goes further: it **models the Kubernetes system** as a typed directed graph, then performs **graph traversal-based causal reasoning** to determine root causes deterministically. The LLM reads the structured output (a `CausalChain`) and explains it in natural language. The LLM does not reason.

### 3.2 Package Files

| File | Lines (approx.) | Purpose |
|------|----------------:|---------|
| `pkg/graph/types.go` | ~238 | All type definitions for the graph model |
| `pkg/graph/patterns.go` | ~160 | 10 pre-encoded failure patterns with scoring |
| `pkg/graph/engine.go` | ~1262 | Main engine: informers, node/edge management, BFS |
| `pkg/graph/inference.go` | ~628 | Causal inference: FindCausalChain, blast radius, remediation |

### 3.3 types.go — Type Definitions

**NodeKind** (21 constants — the kinds of Kubernetes resources tracked as graph nodes):

| Constant | Value |
|----------|-------|
| `KindCluster` | `"Cluster"` |
| `KindNamespace` | `"Namespace"` |
| `KindNode` | `"Node"` |
| `KindPod` | `"Pod"` |
| `KindContainer` | `"Container"` |
| `KindDeployment` | `"Deployment"` |
| `KindReplicaSet` | `"ReplicaSet"` |
| `KindStatefulSet` | `"StatefulSet"` |
| `KindDaemonSet` | `"DaemonSet"` |
| `KindJob` | `"Job"` |
| `KindService` | `"Service"` |
| `KindEndpoints` | `"Endpoints"` |
| `KindIngress` | `"Ingress"` |
| `KindPersistentVolume` | `"PersistentVolume"` |
| `KindPVC` | `"PersistentVolumeClaim"` |
| `KindConfigMap` | `"ConfigMap"` |
| `KindSecret` | `"Secret"` |
| `KindHPA` | `"HorizontalPodAutoscaler"` |
| `KindPDB` | `"PodDisruptionBudget"` |
| `KindNetworkPolicy` | `"NetworkPolicy"` |
| `KindServiceAccount` | `"ServiceAccount"` |

**EdgeKind** (15 constants — the typed relationships between nodes):

| Constant | Value | Meaning |
|----------|-------|---------|
| `EdgeSchedulesOn` | `"SCHEDULES_ON"` | Pod runs on Node |
| `EdgeOwns` | `"OWNS"` | Deployment→ReplicaSet, ReplicaSet→Pod, Job→Pod |
| `EdgeExposes` | `"EXPOSES"` | Service → Pod (label selector match) |
| `EdgeRoutesTo` | `"ROUTES_TO"` | Ingress → Service |
| `EdgeClaims` | `"CLAIMS"` | PVC → PV |
| `EdgeMounts` | `"MOUNTS"` | Pod → PVC |
| `EdgeMountsConfig` | `"MOUNTS_CONFIG"` | Pod → ConfigMap |
| `EdgeMountsSecret` | `"MOUNTS_SECRET"` | Pod → Secret |
| `EdgeScales` | `"SCALES"` | HPA → Deployment/StatefulSet |
| `EdgeProtects` | `"PROTECTS"` | PDB → set of Pods |
| `EdgeBoundTo` | `"BOUND_TO"` | ServiceAccount → Pod |
| `EdgeInNamespace` | `"IN_NAMESPACE"` | Namespaced resource → Namespace |
| `EdgeCompetesWith` | `"COMPETES_WITH"` | Pod ↔ Pod (shared node resource contention) |
| `EdgeDependsOn` | `"DEPENDS_ON"` | Inferred service-to-service (env var DNS refs) |
| `EdgeNetworkAllows` | `"NETWORK_ALLOWS"` | NetworkPolicy → Pod |

**NodeStatus** (6 values):

| Value | Meaning |
|-------|---------|
| `Healthy` | Resource is operating normally |
| `Degraded` | Resource is partially available (e.g. some replicas down) |
| `Failed` | Resource has failed or is completely unavailable |
| `Pending` | Resource is waiting to be scheduled or bound |
| `Evicted` | Pod was evicted from its node |
| `Unknown` | Status cannot be determined |

**Key struct definitions:**

```go
// GraphNode is a single resource in the topology graph
type GraphNode struct {
    ID              string                 // "Kind/namespace/name" or "Kind/name"
    Kind            NodeKind
    Name            string
    Namespace       string
    Labels          map[string]string
    Status          NodeStatus
    Phase           string                 // Pod phase: Running/Pending/Failed/Succeeded
    Conditions      map[string]bool        // e.g., Ready=true, DiskPressure=false
    Metadata        map[string]interface{} // kind-specific: restart_count, replicas, etc.
    CreatedAt       time.Time
    UpdatedAt       time.Time
    ResourceVersion string                 // K8s resourceVersion (not serialised)
}

// GraphEdge is a directed relationship between two graph nodes
type GraphEdge struct {
    ID       string            // "From:EdgeKind:To"
    From     string            // source NodeID
    To       string            // target NodeID
    Kind     EdgeKind
    Weight   float64           // 1.0 = strong/certain, 0.6 = inferred
    Metadata map[string]string
}

// CausalChain is the result of causal inference for an incident
type CausalChain struct {
    RootCause         *GraphNode        // most likely root cause node
    AffectedNode      *GraphNode        // node where incident was first observed
    Path              []CausalStep      // ordered sequence root → affected
    BlastRadius       []*GraphNode      // all nodes reachable downstream
    Evidence          []GraphEvent      // K8s events supporting the chain
    AlternativeCauses []CausalCandidate // other plausible candidates
    Confidence        float64           // 0.0–1.0 (< 0.5 = inconclusive)
    PatternMatched    string            // name of matched failure pattern
    AnalyzedAt        time.Time
}

// RemediationPlan is a set of graph-validated remediation steps
type RemediationPlan struct {
    CausalChain     *CausalChain
    Steps           []RemediationStep
    EstimatedRisk   string    // "low" | "medium" | "high"
    PDBChecked      bool
    CapacityChecked bool
    GeneratedAt     time.Time
}

// RemediationStep is a single validated action
type RemediationStep struct {
    Order          int
    Title          string
    Description    string
    KubectlCommand string
    Risk           string    // "low" | "medium" | "high"
    Reversible     bool
    Constraints    []string  // reasons certain actions were ruled out
}

// AnalyzeRequest is the payload for /api/graph/analyze and /api/graph/remediation
type AnalyzeRequest struct {
    NodeID        string   // "Kind/namespace/name"  (OR use Kind+Namespace+Name)
    Kind          NodeKind
    Namespace     string
    Name          string
    WindowMinutes int      // lookback window for events (default 30)
}

// SubgraphQuery is a filter for /api/graph/topology
type SubgraphQuery struct {
    NodeKinds   []NodeKind // empty = all kinds
    Namespace   string     // empty = all namespaces
    FocusNodeID string     // center subgraph on this node
    Depth       int        // hops from focus (default 2)
}

// GraphSnapshot is a serialisable point-in-time snapshot
type GraphSnapshot struct {
    Nodes      []*GraphNode
    Edges      []*GraphEdge
    SnapshotAt time.Time
    NodeCount  int
    EdgeCount  int
}
```

### 3.4 patterns.go — Failure Pattern Library

10 pre-encoded failure patterns covering the most common production K8s incidents (80%+ of real-world failures):

| Pattern Name | Trigger Kind | Trigger Condition | Cascade Edges | Confidence |
|--------------|-------------|-------------------|---------------|:----------:|
| `node_disk_pressure_eviction_cascade` | Node | DiskPressure=true | SCHEDULES_ON, EXPOSES, ROUTES_TO | 0.92 |
| `node_memory_pressure_oom_cascade` | Node | MemoryPressure=true | SCHEDULES_ON, EXPOSES | 0.89 |
| `oom_kill_crash_loop` | Container | — | OWNS, EXPOSES | 0.87 |
| `image_pull_scheduling_block` | Pod | — | OWNS, EXPOSES | 0.91 |
| `config_change_induced_crash` | ConfigMap | — | MOUNTS_CONFIG, MOUNTS_SECRET, OWNS | 0.78 |
| `node_not_ready_pod_eviction` | Node | Ready=false | SCHEDULES_ON, EXPOSES, ROUTES_TO | 0.95 |
| `pvc_pending_pod_block` | PVC | — | MOUNTS, OWNS | 0.88 |
| `hpa_thrashing` | HPA | — | SCALES, OWNS | 0.72 |
| `resource_quota_exhaustion` | Namespace | — | IN_NAMESPACE, OWNS | 0.85 |
| `upstream_service_dependency_failure` | Service | — | DEPENDS_ON, EXPOSES | 0.75 |

Each `FailurePattern` struct contains:
- `Name` — unique identifier used in `CausalChain.PatternMatched`
- `Description` — human-readable explanation of the failure cascade
- `TriggerKind` — the NodeKind where failure originates
- `TriggerCondition` — optional K8s condition that must be true on the trigger node
- `EventReasons` — K8s event reasons indicating this pattern (matched case-insensitively)
- `CascadeEdges` — edge types through which failure propagates
- `Confidence` — base confidence score when pattern matches (max of scored confidence and pattern confidence)

**Pattern matching function** (`MatchPattern`):
```go
func MatchPattern(nodeKind NodeKind, nodeConditions map[string]bool, events []GraphEvent) *FailurePattern
```
- Iterates all `DefaultPatterns`, filters by `TriggerKind` and `TriggerCondition`
- Counts matching event reasons (case-insensitive)
- Returns the pattern with the highest match score, or `nil` if no match

### 3.5 engine.go — Main Engine

**Engine struct** (thread-safe, RWMutex-protected):

```go
type Engine struct {
    mu       sync.RWMutex
    nodes    map[string]*GraphNode    // NodeID → node
    edges    map[string]*GraphEdge    // EdgeID → edge
    outEdges map[string][]string      // NodeID → []EdgeID (forward adjacency)
    inEdges  map[string][]string      // NodeID → []EdgeID (reverse adjacency)
    events   []GraphEvent             // rolling event buffer (capped at 2000)
    evMu     sync.RWMutex
    lastAnalysis map[string]*CausalChain  // 30-second TTL analysis cache
    analysisMu   sync.RWMutex
    client   kubernetes.Interface
    factory  informers.SharedInformerFactory
    stopCh   chan struct{}
    started  bool
}
```

**Engine constants:**

| Constant | Value | Purpose |
|----------|-------|---------|
| `resyncPeriod` | 30s | How often informers resync with API server |
| `maxEventAge` | 2h | How long K8s events are retained |
| `maxEvents` | 2000 | Maximum events in rolling buffer |
| `mutationBatchWindow` | 50ms | Debounce window for graph mutations |

**Resource types watched** (13 via SharedInformerFactory):

| Resource | API Group | Events Handled |
|----------|-----------|----------------|
| Pods | core/v1 | Add, Update, Delete |
| Nodes | core/v1 | Add, Update, Delete |
| Deployments | apps/v1 | Add, Update, Delete |
| ReplicaSets | apps/v1 | Add, Update, Delete |
| StatefulSets | apps/v1 | Add, Update, Delete |
| DaemonSets | apps/v1 | Add, Update, Delete |
| Services | core/v1 | Add, Update, Delete |
| Ingresses | networking/v1 | Add, Update, Delete |
| PersistentVolumeClaims | core/v1 | Add, Update, Delete |
| ConfigMaps | core/v1 | Add, Update, Delete |
| Namespaces | core/v1 | Add, Update, Delete |
| Jobs | batch/v1 | Add, Update, Delete |
| Events | core/v1 | Add, Update (Warning type only) |

**Edge construction** (performed in event handlers and full rebuild after initial sync):

| Handler | Edges Constructed |
|---------|-------------------|
| `onPod` + `rebuildPodEdges` | SCHEDULES_ON (pod→node), OWNS (owner→pod), MOUNTS (pod→pvc), MOUNTS_CONFIG (pod→configmap), MOUNTS_SECRET (pod→secret), DEPENDS_ON (inferred from env vars) |
| `onReplicaSet` | OWNS (deployment→replicaset via ownerReferences) |
| `onService` + `rebuildServiceEdges` | EXPOSES (service→pod via label selector match) |
| `onIngress` | ROUTES_TO (ingress→service) |
| `onPVC` | CLAIMS (pvc→pv) |

**`inferDependsOnFromEnv`** — parses container environment variables for DNS-format service references:
```
REDIS_HOST=redis.production.svc.cluster.local
→ DEPENDS_ON edge: Pod/production/app → Service/production/redis (weight 0.6)
```

**Public API:**

| Method | Signature | Description |
|--------|-----------|-------------|
| `NewEngine` | `(client kubernetes.Interface) *Engine` | Create engine (does not start) |
| `Start` | `()` | Start informers (non-blocking, runs goroutines) |
| `Stop` | `()` | Shut down all informers |
| `NodeCount` | `() int` | Current node count (RLocked) |
| `EdgeCount` | `() int` | Current edge count (RLocked) |
| `GetNode` | `(id string) (*GraphNode, bool)` | Retrieve node by ID |
| `FindNode` | `(kind NodeKind, namespace, name string) (*GraphNode, bool)` | Retrieve by triple |
| `Snapshot` | `() *GraphSnapshot` | Full topology snapshot |
| `QuerySubgraph` | `(q SubgraphQuery) *GraphSnapshot` | Filtered subgraph |
| `RecentEvents` | `(nodeID string, since time.Time) []GraphEvent` | Events for a node |
| `Summary` | `() string` | Brief debug string |
| `Analyze` | `(req AnalyzeRequest) *CausalChain` | Causal inference (see inference.go) |
| `BuildRemediationPlan` | `(chain *CausalChain) *RemediationPlan` | Generate remediation |

**`rebuildAllEdges`** is called once after the initial informer cache sync. It rebuilds all edges from the live K8s API using list calls (Pods, ReplicaSets, Services, Ingresses, PVCs), ensuring edge consistency at startup.

**`QuerySubgraph` algorithm:**
1. If `FocusNodeID` set: BFS forward and reverse from focus node up to `Depth` hops
2. Otherwise: include all nodes
3. Apply `NodeKinds` filter
4. Apply `Namespace` filter
5. Include only edges where both endpoints survived filtering

### 3.6 inference.go — Causal Inference

This is the reasoning engine. It is fully deterministic — no LLM involved.

**Algorithm in `Analyze(req AnalyzeRequest) *CausalChain`:**

```
Step 1: Resolve affected node from NodeID or (Kind, Namespace, Name)
Step 2: Check 30-second analysis cache — return cached result if fresh
Step 3: Gather all Warning events within window (default 30 minutes)
Step 4: BFS UPSTREAM from affected node (max 5 hops via inEdges)
        → Collect candidate root cause nodes:
          - node has anomalous status (Failed/Degraded/Evicted), OR
          - node has warning events in window, OR
          - node has a pressure condition (DiskPressure/MemoryPressure/PIDPressure)
Step 5: Score each candidate (0.0–0.99, never 1.0):
        + 0.15 × event_count    (more events = more likely cause)
        + 0.40 if status=Failed or Evicted
        + 0.25 if status=Degraded
        + 0.10 if status=Pending
        + 0.30 if has pressure condition
        + edge.Weight × 0.10    (stronger edge = more certain propagation)
        + 0.20 if node's earliest event precedes majority of all events (temporal precedence)
Step 6: Sort candidates by score descending — pick best
Step 7: Match best candidate against failure pattern library (MatchPattern)
        → Pattern match boosts confidence to max(scored, pattern.Confidence)
Step 8: BFS FORWARD from root candidate → affected node → build CausalPath
Step 9: BFS DOWNSTREAM from root candidate (max 4 hops) → BlastRadius
Step 10: Build alternative candidates from remaining scored candidates
Step 11: Cache result, return CausalChain
```

**`computeBlastRadius(rootID string) []*GraphNode`:**
- BFS forward (downstream) from rootID via `outEdges`, max 4 hops
- Returns all reachable nodes excluding the root itself
- Used by both `Analyze` and `handleGraphBlastRadius`

**`BuildRemediationPlan(chain *CausalChain) *RemediationPlan`:**
- Generates kubectl commands and risk assessments based on `chain.RootCause.Kind`
- Node (DiskPressure): describe, cordon
- Node (MemoryPressure): top pods on node
- Node (NotReady): drain with PDB warning
- Pod: logs --previous, delete
- PVC: describe
- ConfigMap: describe, rolling restart blast radius
- Generic fallback: kubectl describe root cause
- Sets `PDBChecked=true` and `CapacityChecked=true` (validation flags for Orkas AI)

**Analysis cache:** 30-second TTL per `affectedID`. Prevents redundant computation when Orkas AI polls rapidly during an incident.

### 3.7 web_graph.go — HTTP Handler Integration

`web_graph.go` provides the HTTP surface for the graph engine. It is a separate file registered in `web_server.go` via `ws.RegisterGraphRoutes()`.

**WebServer integration** (in `web_server.go`):

```go
type WebServer struct {
    // ... existing fields ...
    // graphEngine is the live Kubernetes topology graph engine.
    // It maintains a continuously-updated causal model of the cluster and
    // provides the foundation for graph-traversal-based incident reasoning.
    graphEngine *graph.Engine
}

// In NewWebServer():
if app.clientset != nil {
    ws.graphEngine = graph.NewEngine(app.clientset)
    go ws.graphEngine.Start()
}

// Route registration called from server setup:
ws.RegisterGraphRoutes()
```

All handlers return JSON (`Content-Type: application/json`). The `graphJSON` helper sets the content type and writes the encoded response. Each handler guards against `graphEngine == nil` (returns 503 with descriptive error).

---

## 4. Go Backend — All API Routes

> All registered in `web_server.go`. Served at `localhost:3003`.

### 4.1 Kubernetes Core Resources

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/namespaces` | List namespaces with metadata |
| `GET` | `/api/pods` | List pods (supports `?namespace=X`) |
| `GET` | `/api/pods/metrics` | Lightweight pod CPU/memory metrics map |
| `GET` | `/api/deployments` | List deployments with replica status |
| `GET` | `/api/statefulsets` | List statefulsets |
| `GET` | `/api/daemonsets` | List daemonsets |
| `GET` | `/api/services` | List services with endpoints |
| `GET` | `/api/ingresses` | List ingresses |
| `GET` | `/api/configmaps` | List config maps |
| `GET` | `/api/secrets` | List secrets (values redacted) |
| `GET` | `/api/cronjobs` | List cron jobs |
| `GET` | `/api/jobs` | List jobs with completion status |
| `GET` | `/api/pdbs` | List PodDisruptionBudgets |
| `GET` | `/api/hpas` | List HorizontalPodAutoscalers |
| `GET` | `/api/nodes` | List nodes with status, capacity, metrics |
| `GET` | `/api/networkpolicies` | List network policies |
| `GET` | `/api/certificates` | List TLS certificates (expiration tracking) |
| `GET` | `/api/serviceaccounts` | List service accounts |
| `GET` | `/api/crds` | List Custom Resource Definitions |
| `GET` | `/api/crd/instances` | CRD instances (`?group=X&kind=Y`) |

### 4.2 Resource Detail Operations

Pattern: `/api/{resource}/details`, `/yaml`, `/describe`, `/update`, `/delete`

| Resource | details | yaml | describe | update | delete | Extra operations |
|----------|:-------:|:----:|:--------:|:------:|:------:|-----------------|
| Pod | ✓ | ✓ | ✓ | ✓ | ✓ | `restart`, `exec` (one-shot), `logs` (WS), `terminal` (WS) |
| Deployment | ✓ | ✓ | ✓ | ✓ | ✓ | `restart`, `scale` |
| StatefulSet | ✓ | ✓ | ✓ | ✓ | ✓ | `restart`, `scale` |
| DaemonSet | ✓ | ✓ | ✓ | ✓ | ✓ | `restart` |
| Service | ✓ | ✓ | ✓ | ✓ | ✓ | — |
| Ingress | ✓ | ✓ | ✓ | ✓ | ✓ | — |
| ConfigMap | ✓ | ✓ | ✓ | ✓ | ✓ | — |
| Secret | ✓ | ✓ | ✓ | ✓ | ✓ | — |
| CronJob | ✓ | ✓ | ✓ | ✓ | ✓ | — |
| Job | ✓ | ✓ | ✓ | ✓ | ✓ | — |
| HPA | ✓ | ✓ | ✓ | ✓ | ✓ | — |
| ServiceAccount | ✓ | ✓ | — | ✓ | ✓ | — |
| PersistentVolume | ✓ | ✓ | ✓ | ✓ | ✓ | — |
| PersistentVolumeClaim | ✓ | ✓ | ✓ | ✓ | ✓ | — |
| StorageClass | — | ✓ | — | ✓ | ✓ | — |
| Role / ClusterRole | — | ✓ | — | ✓ | ✓ | — |
| RoleBinding / ClusterRoleBinding | — | ✓ | — | ✓ | ✓ | — |
| CRD Instance | ✓ | ✓ | — | ✓ | ✓ | — |

### 4.3 Bulk Operations

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/deployments/bulk/restart` | Restart all deployments in namespace |
| `POST` | `/api/deployments/bulk/delete` | Delete all deployments in namespace |
| `POST` | `/api/statefulsets/bulk/restart` | Restart all statefulsets |
| `POST` | `/api/statefulsets/bulk/delete` | Delete all statefulsets |
| `POST` | `/api/daemonsets/bulk/restart` | Restart all daemonsets |
| `POST` | `/api/daemonsets/bulk/delete` | Delete all daemonsets |

### 4.4 Storage

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/storage/persistentvolumes` | List PVs |
| `GET` | `/api/storage/persistentvolumeclaims` | List PVCs |
| `GET` | `/api/storage/storageclasses` | List StorageClasses |
| `GET/PUT/POST` | `/api/storage/pv/{details,yaml,update,describe,delete}` | PV operations |
| `GET/PUT/POST` | `/api/storage/pvc/{details,yaml,update,describe,delete}` | PVC operations |
| `GET/PUT/POST` | `/api/storage/storageclass/{yaml,update,delete}` | StorageClass operations |

### 4.5 RBAC

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/rbac/roles` | List Roles |
| `GET` | `/api/rbac/rolebindings` | List RoleBindings |
| `GET` | `/api/rbac/clusterroles` | List ClusterRoles |
| `GET` | `/api/rbac/clusterrolebindings` | List ClusterRoleBindings |
| `GET/PUT/POST` | `/api/rbac/{resource}/{yaml,update,delete}` | RBAC resource operations |

### 4.6 Visualization & Topology

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/topology` | Service topology graph (nodes + edges for D3) |
| `GET` | `/api/resourcemap` | Resource dependency ASCII tree |
| `GET` | `/api/network/topology` | Network topology with traffic flow |
| `GET` | `/api/heatmap/pods` | Pod CPU/memory heatmap data |
| `GET` | `/api/heatmap/nodes` | Node capacity vs. utilization heatmap |
| `GET` | `/api/traffic/metrics` | Live pod-to-pod / service traffic bandwidth |

### 4.7 Live Topology Graph — NEW (`/api/graph/*`)

> Implemented in `web_graph.go`. Registered via `ws.RegisterGraphRoutes()`. Primary API for Orkas AI causal reasoning.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/graph/status` | Graph engine health + node/edge counts |
| `GET` | `/api/graph/topology` | Full or filtered topology snapshot |
| `POST` | `/api/graph/analyze` | Causal chain inference from a fault node |
| `GET` | `/api/graph/blast-radius` | Downstream impact from a node |
| `GET` | `/api/graph/node` | Single node + recent events |
| `POST` | `/api/graph/remediation` | Graph-validated remediation plan |

**GET /api/graph/status**

Response:
```json
{
  "status": "running",
  "node_count": 847,
  "edge_count": 1203,
  "summary": "TopologyGraph: 847 nodes, 1203 edges"
}
```
Returns `503` with `"status": "unavailable"` if engine not initialised.

**GET /api/graph/topology**

Query params:
- `namespace` — filter to a single namespace
- `kinds` — comma-separated NodeKinds (e.g. `Pod,Service,Deployment`)
- `focus` — NodeID to center a neighbourhood subgraph on (e.g. `Pod/default/my-pod`)
- `depth` — neighbourhood depth from focus (default 2, max 5)

Response: `GraphSnapshot` (nodes array + edges array + metadata)

```json
{
  "nodes": [
    {
      "id": "Pod/default/my-pod-abc123",
      "kind": "Pod",
      "name": "my-pod-abc123",
      "namespace": "default",
      "labels": {"app": "my-app"},
      "status": "Degraded",
      "phase": "Running",
      "conditions": {"Ready": false},
      "metadata": {"node_name": "gke-node-1", "restart_count": 7, "ip": "10.0.1.5"},
      "created_at": "2026-02-28T10:00:00Z",
      "updated_at": "2026-03-01T09:30:00Z"
    }
  ],
  "edges": [
    {
      "id": "Pod/default/my-pod-abc123:SCHEDULES_ON:Node/gke-node-1",
      "from": "Pod/default/my-pod-abc123",
      "to": "Node/gke-node-1",
      "kind": "SCHEDULES_ON",
      "weight": 1.0
    }
  ],
  "snapshot_at": "2026-03-01T09:35:00Z",
  "node_count": 1,
  "edge_count": 1
}
```

**POST /api/graph/analyze**

Request body (two equivalent forms):
```json
// Form 1: NodeID
{"node_id": "Pod/default/my-pod-abc123", "window_minutes": 30}

// Form 2: Kind + Namespace + Name
{"kind": "Pod", "namespace": "default", "name": "my-pod-abc123", "window_minutes": 30}
```

Response: `CausalChain`
```json
{
  "root_cause": {
    "id": "Node/gke-node-1",
    "kind": "Node",
    "name": "gke-node-1",
    "status": "Degraded",
    "conditions": {"DiskPressure": true, "Ready": true}
  },
  "affected_node": {"id": "Pod/default/my-pod-abc123", "status": "Degraded"},
  "path": [
    {"node": {"id": "Node/gke-node-1"}, "event_evidence": ["NodeHasDiskPressure: disk usage 95%"]},
    {"node": {"id": "Pod/default/my-pod-abc123"}, "edge": {"kind": "SCHEDULES_ON"}, "event_evidence": ["Evicted: The node was low on resource: ephemeral-storage"]}
  ],
  "blast_radius": [
    {"id": "Service/default/my-service", "kind": "Service", "status": "Degraded"}
  ],
  "evidence": [...],
  "confidence": 0.92,
  "pattern_matched": "node_disk_pressure_eviction_cascade",
  "analyzed_at": "2026-03-01T09:35:00Z"
}
```

**GET /api/graph/blast-radius**

Query params: `node_id` OR (`kind` + `namespace` + `name`)

Response:
```json
{
  "node": {"id": "Node/gke-node-1", "status": "Degraded"},
  "blast_radius": [...],
  "count": 14
}
```

**GET /api/graph/node**

Query params: `node_id` OR (`kind` + `namespace` + `name`), `window_minutes` (default 30)

Response:
```json
{
  "node": {"id": "Pod/default/my-pod-abc123", ...},
  "recent_events": [
    {"node_id": "Pod/default/my-pod-abc123", "reason": "Evicted", "message": "...", "timestamp": "...", "count": 3, "event_type": "Warning"}
  ]
}
```

**POST /api/graph/remediation**

Request body: same as `/api/graph/analyze` — `AnalyzeRequest` JSON

Response: `RemediationPlan`
```json
{
  "causal_chain": {...},
  "steps": [
    {
      "order": 1,
      "title": "Identify and clear disk pressure on node",
      "description": "Check which processes are consuming disk on the node, clear logs or temp files",
      "kubectl_command": "kubectl describe node gke-node-1 | grep -A5 DiskPressure",
      "risk": "low",
      "reversible": true
    },
    {
      "order": 2,
      "title": "Cordon node to prevent new scheduling",
      "kubectl_command": "kubectl cordon gke-node-1",
      "risk": "low",
      "reversible": true
    }
  ],
  "estimated_risk": "medium",
  "pdb_checked": true,
  "capacity_checked": true,
  "generated_at": "2026-03-01T09:35:00Z"
}
```

### 4.8 Metrics & Monitoring

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/metrics` | Cluster-wide CPU, Memory, Network, Storage |
| `GET` | `/api/metrics/snapshot` | Instant metrics snapshot |
| `GET` | `/api/metrics/status` | Metrics collection status (enabled? last update?) |
| `GET/POST` | `/api/metrics/collector/config` | Collector configuration (interval, retention) |
| `GET` | `/api/metrics/collector/status` | Collector health |
| `POST` | `/api/metrics/collector/clear` | Wipe collected metrics history |
| `WS` | `/ws/metrics` | Real-time metrics stream (2 s interval) |
| `WS` | `/ws` | General real-time updates (events, incidents, metrics) |

### 4.9 Built-in AI (KubeGraf's own — uses Ollama / OpenAI / Claude)

> Separate from Orkas AI. Configured via `KUBEGRAF_OLLAMA_URL`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/ai/status` | AI provider availability (Ollama / OpenAI / Claude) |
| `POST` | `/api/ai/query` | Free-form AI query |
| `GET` | `/api/ai/analyze/pod` | AI analysis of a specific pod (`?namespace=X&name=Y`) |
| `POST` | `/api/ai/explain` | Explain a Kubernetes error message |

### 4.10 Diagnostics

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/diagnostics/run` | Run diagnostics (`?namespace=X&category=Y`) |
| `GET` | `/api/diagnostics/categories` | List available diagnostic categories |

### 4.11 Cost Analysis

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/cost/cluster` | Cluster-wide monthly cost estimate (5 min cache) |
| `GET` | `/api/cost/namespace` | Namespace cost estimate |
| `GET` | `/api/cost/pod` | Pod cost estimate |
| `GET` | `/api/cost/deployment` | Deployment cost estimate (includes all replicas) |
| `GET` | `/api/cost/idle` | Idle / underutilized resource report |
| `GET` | `/api/cloud` | Detect cloud provider (GCP / AWS / Azure / Unknown) |

### 4.12 Drift Detection

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/drift/check` | Check config drift in namespace vs. stored state |
| `GET` | `/api/drift/namespace` | Drift summary for namespace (severity, count) |
| `GET` | `/api/drift/summary` | Cluster-wide drift summary |
| `POST` | `/api/drift/revert` | Revert resource to saved state |

### 4.13 Anomaly Detection

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/anomalies/detect` | Detect resource anomalies (CPU spikes, memory leaks) |
| `GET` | `/api/anomalies/stats` | Detection accuracy, false positive stats |
| `POST` | `/api/anomalies/remediate` | Auto-remediate detected anomaly |
| `GET` | `/api/anomalies/metrics` | Anomaly time series |
| `GET` | `/api/anomalies/scan-progress` | Background scan progress (%) |

### 4.14 ML Recommendations

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/ml/recommendations` | ML-based recommendations: right-size, security, scaling |
| `POST` | `/api/ml/recommendations/apply` | Apply a recommendation |
| `GET` | `/api/ml/recommendations/stats` | Applied rate, accuracy metrics |
| `GET` | `/api/ml/predict` | Predict future metric values |

### 4.15 AutoFix Rules Engine

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/autofix/rules` | List AutoFix rules |
| `POST` | `/api/autofix/rules/toggle` | Enable / disable a rule |
| `GET` | `/api/autofix/actions` | List completed auto-remediations (history) |
| `GET` | `/api/autofix/enabled` | Global AutoFix enabled/disabled status |

### 4.16 Incident Intelligence System (v2)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v2/incidents` | List all incidents. Filters: `?namespace=X&pattern=Y&severity=Z` |
| `GET` | `/api/v2/incidents/{id}` | Incident detail: diagnosis, timeline, recommendations, symptoms |
| `GET` | `/api/v2/incidents/{id}/changes` | Config changes that triggered the incident |
| `GET` | `/api/v2/incidents/{id}/snapshot` | Cluster state snapshot at incident time (cached) |
| `GET` | `/api/v2/incidents/patterns` | Pattern statistics (most common patterns) |
| `GET` | `/api/v2/incidents/patterns/{id}` | Incidents matching a specific pattern |
| `POST` | `/api/v2/incidents/{id}/remediate` | Auto-remediate the incident |
| `GET` | `/api/v2/incidents/{id}/remediation-status` | Check remediation outcome |
| `POST` | `/api/v2/incidents/{id}/learning` | ML learning from incident resolution |
| `POST` | `/api/v2/incidents/{id}/feedback` | User feedback → trains confidence learner |

### 4.17 Security

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/security` | Full security analysis (RBAC gaps, pod security, network) |
| `GET` | `/api/vulnerabilities/scan` | Scan container images for CVEs |
| `POST` | `/api/vulnerabilities/refresh` | Re-scan images |
| `GET` | `/api/vulnerabilities/stats` | Vulnerability count by severity |

### 4.18 Multi-Cluster & Context

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v2/clusters` | List available clusters |
| `POST` | `/api/v2/clusters/switch` | Switch active cluster context (`?context=X`) |
| `GET` | `/api/v2/clusters/health` | Health of all clusters (latency, connectivity) |
| `POST` | `/api/v2/clusters/refresh` | Refresh cluster list from kubeconfig |
| `GET` | `/api/contexts` | List all K8s contexts from kubeconfig |
| `GET` | `/api/contexts/current` | Current active context |
| `POST` | `/api/contexts/switch` | Switch context (`?context=X`) |

### 4.19 Terminal & Execution

| Method | Path | Description |
|--------|------|-------------|
| `WS` | `/api/pod/terminal` | Interactive exec into pod |
| `GET` | `/api/pod/exec` | One-shot command execution in pod |
| `WS` | `/api/pod/logs` | Stream pod logs (`?namespace=X&name=Y&follow=true`) |
| `WS` | `/api/local/terminal` | Local terminal on kubegraf host |
| `GET` | `/api/terminal/shells` | Available shells (bash, sh, zsh) |
| `GET/POST` | `/api/terminal/preferences` | Terminal color scheme, font size |
| `WS` | `/api/execution/stream` | Stream execution output (`?id=X`) |
| `GET` | `/api/executions` | List execution history |
| `GET` | `/api/executions/logs` | Logs from a past execution (`?executionId=X`) |

### 4.20 Port Forwarding

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/portforward/start` | Start port-forward |
| `POST` | `/api/portforward/stop` | Stop session (`?id=X`) |
| `GET` | `/api/portforward/list` | List active port-forwards |

### 4.21 Brain / Intelligence

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/brain/timeline` | Historical analysis timeline |
| `GET` | `/api/brain/oom-insights` | OOM killer analysis: killed pods, memory pressure timeline |
| `GET` | `/api/brain/summary` | Intelligence summary (patterns, trends) |
| `GET` | `/api/brain/ml/timeline` | ML-specific insights timeline |
| `GET` | `/api/brain/ml/predictions` | ML predictions (resource needs, incident probability) |
| `GET` | `/api/brain/ml/summary` | ML model accuracy, top predictions |
| `GET` | `/api/v2/intelligence/status` | Intelligence engine status |

### 4.22 Plugins & Integrations

#### Helm

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/plugins/helm/releases` | List Helm releases |
| `GET` | `/api/plugins/helm/release` | Release details (`?name=X`) |
| `GET` | `/api/plugins/helm/history` | Release version history |
| `POST` | `/api/plugins/helm/rollback` | Rollback to previous revision |
| `GET` | `/api/plugins/helm/describe` | Full release description |
| `GET` | `/api/plugins/helm/yaml` | Release YAML manifest |

#### ArgoCD

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/plugins/argocd/apps` | ArgoCD applications with sync status |
| `GET` | `/api/plugins/argocd/app` | App details |
| `POST` | `/api/plugins/argocd/sync` | Trigger sync |
| `POST` | `/api/plugins/argocd/refresh` | Refresh app from API server |
| `GET` | `/api/plugins/argocd/yaml` | App YAML |
| `PUT` | `/api/plugins/argocd/update` | Update app |
| `DELETE` | `/api/plugins/argocd/delete` | Delete app |

#### Kiali (Service Mesh)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/integrations/kiali/status` | Kiali installation status |
| `POST` | `/api/integrations/kiali/install` | Install Kiali |
| `GET` | `/api/integrations/kiali/versions` | Available Kiali versions |
| `GET` | `/api/kiali/proxy/*` | Transparent proxy to Kiali API |

#### MLflow (ML Model Registry)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/mlflow/status` | MLflow installation status |
| `POST` | `/api/mlflow/install` | Install MLflow |
| `GET` | `/api/mlflow/versions` | Available MLflow versions |
| `POST` | `/api/mlflow/upgrade` | Upgrade MLflow |
| `GET` | `/api/mlflow/proxy/*` | Transparent proxy to MLflow API |

#### GPU

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/gpu/status` | GPU support status |
| `GET` | `/api/gpu/nodes` | GPU-equipped nodes |
| `GET` | `/api/gpu/metrics` | Per-device GPU utilization |
| `POST` | `/api/gpu/install` | Install NVIDIA GPU support |

### 4.23 ML Training & Inference

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/ml/jobs/create` | Create ML training job |
| `GET` | `/api/ml/jobs/list` | List training jobs |
| `GET` | `/api/ml/jobs/get` | Job details (`?id=X`) |
| `DELETE` | `/api/ml/jobs/delete` | Delete job |
| `GET` | `/api/ml/jobs/logs` | Get job logs |
| `WS` | `/api/ml/jobs/logs/ws` | Stream job logs in real time |
| `POST` | `/api/inference/create` | Deploy inference service |
| `GET` | `/api/inference/list` | List inference services |
| `GET` | `/api/inference/get` | Inference service details |
| `DELETE` | `/api/inference/delete` | Delete inference service |
| `POST` | `/api/inference/test` | Test inference endpoint |
| `GET` | `/api/inference/status` | Service health and readiness |

### 4.24 SRE Agent

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/sre/status` | SRE agent availability |
| `GET` | `/api/sre/incidents` | SRE incident queue |
| `GET` | `/api/sre/incident` | SRE incident details (`?id=X`) |
| `GET` | `/api/sre/actions` | Available SRE automation actions |
| `GET/POST` | `/api/sre/config` | SRE configuration (rules, thresholds) |
| `POST` | `/api/sre/enable` | Enable / disable SRE agent |
| `POST` | `/api/sre/remediate` | Execute SRE remediation (`?incidentId=X`) |
| `POST` | `/api/sre/escalate` | Escalate incident |
| `GET` | `/api/sre/batch-jobs` | Batch job status |
| `GET` | `/api/sre/metrics` | SRE effectiveness metrics (MTTR, success rate) |

### 4.25 Notifications & Announcements

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/notifications` | Notification list |
| `POST` | `/api/notifications/mark-read` | Mark notification as read |
| `POST` | `/api/notifications/mark-all-read` | Clear all notifications |
| `GET` | `/api/notifications/unread-count` | Unread count |
| `DELETE` | `/api/notifications/delete` | Delete notification |
| `GET` | `/api/announcements/status` | Announcement opt-in status |
| `POST` | `/api/announcements/opt-in` | Enable / disable announcements |

### 4.26 Custom Apps & Connectors

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/apps` | App marketplace |
| `GET` | `/api/apps/installed` | Installed apps |
| `POST` | `/api/apps/install` | Install app |
| `POST` | `/api/apps/uninstall` | Uninstall app |
| `GET/POST` | `/api/custom-apps/*` | Custom app CRUD |
| `GET/POST/DELETE` | `/api/connectors` | Connector CRUD (Jira, GitHub, Slack) |
| `GET/POST` | `/api/connectors/{id}` | Connector details and deletion |

### 4.27 Auth & System

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/auth/login` | User login |
| `POST` | `/api/auth/logout` | Logout |
| `GET` | `/api/auth/me` | Current user info |
| `GET` | `/api/status` | WebServer connection status |
| `GET` | `/api/capabilities` | Enabled feature capabilities |
| `GET` | `/api/cache/stats` | Cache hit rate, size, evictions |
| `GET/POST` | `/api/updates/*` | Update check and install |
| `GET/POST` | `/api/telemetry/*` | Telemetry consent |
| `POST` | `/api/ui-logs/write` | Frontend → backend log write |
| `GET` | `/api/ui-logs/stats` | Log statistics |
| `GET` | `/api/v2/perf/summary` | API latency, cache performance |
| `GET` | `/api/v2/perf/recent` | Recent performance measurements |
| `POST` | `/api/mcp` | MCP (Model Context Protocol) server endpoint |

---

## 5. SolidJS Frontend — File Map

**Root**: `ui/solid/src/`
**Build output**: `../../web/dist/` (embedded into Go binary)
**Build command**: `cd ui/solid && npm run build`

### 5.1 Workspace Components (`src/components/workspace/`)

| File | Lines | Purpose |
|------|------:|-------|
| `IntelligentWorkspace.tsx` | ~415 | Root layout shell — rail navigation, screen routing, keyboard shortcuts |
| `OrkasAIPanel.tsx` | ~290 | Global Orkas AI assistant — Ask tab + Knowledge tab |
| `IncidentDetail.tsx` | ~2166 | Full incident view — 6 left tabs + 4 right panel tabs + Orkas AI widget |
| `HomeScreen.tsx` | ~282 | Cluster overview — health ring (canvas), SLOs, incident list, multi-cluster |
| `WorkloadScreen.tsx` | ~886 | Workload management — pod/deployment/statefulset tables, resource details |
| `WorkspacePanels.tsx` | ~922 | Panel orchestrator — Workloads, Metrics, GitOps, Cost panels |
| `ContextGraphScreen.tsx` | ~490 | Service topology — canvas-based dependency graph |
| `ContextNavigator.tsx` | ~323 | Sidebar — incident list grouped by namespace, severity filters |
| `FixExecutionModal.tsx` | ~491 | Modal for applying generated fixes (dry-run + apply) |
| `ErrorBoundary.tsx` | ~258 | SolidJS error boundary wrapping each screen |
| `SkeletonLoader.tsx` | ~231 | Loading skeleton components for all major panels |

### 5.2 Supporting Utilities (`src/components/workspace/`)

| File | Purpose |
|------|---------|
| `rcaReportGenerator.ts` | Generates structured RCA reports (Markdown / HTML export) |
| `fixSuccessPredictor.ts` | ML-ready fix success predictor (historical rate, severity factors) |
| `insightsEngine.ts` | Client-side pattern analysis — groups incidents, surfaces signals |
| `relatedIncidentsEngine.ts` | Similarity scoring (Jaccard on symptoms, namespace proximity) |
| `performanceUtils.ts` | Debounce, throttle, virtual list, memoisation helpers |
| `accessibilityUtils.ts` | WCAG 2.1 AA helpers — focus traps, ARIA live regions, keyboard nav |

### 5.3 Services (`src/services/`)

| File | Purpose |
|------|---------|
| `api.ts` | Central HTTP client — all `/api/*` calls to KubeGraf Go backend. No direct Orkas AI calls. |

### 5.4 Stores (`src/stores/`)

| File | State |
|------|-------|
| `cluster.ts` | `currentContext` — active K8s cluster context signal |
| `ai.ts` | KubeGraf's built-in AI provider status (`/api/ai/status`) — NOT Orkas AI |
| `incidents.ts` | Incident list, selected incident, filters |
| `settings.ts` | User preferences, theme, KubeGraf backend config |
| `notifications.ts` | Notification list, unread count |
| `metrics.ts` | Cluster metrics cache |

---

## 6. SolidJS Frontend — Component Details

### IntelligentWorkspace.tsx

- **Role**: Root layout container, owns all screen routing
- **`activeScreen` values**: `home | incident | workloads | graph | metrics | gitops | cost | settings | orkai`
- **Rail navigation**: renders icon buttons; `orkai` icon triggers `OrkasAIPanel`
- **Keyboard**: `j` / `k` or arrow keys to navigate incidents
- **API calls**: None directly — delegates to child components
- **OrkasAIPanel** is rendered when `activeScreen() === 'orkai'`

---

### OrkasAIPanel.tsx

**Role**: Global Orkas AI assistant (not incident-specific)

**Tabs**: `Ask` · `Knowledge` (2 tabs — Cluster tab removed as duplicate of Ask)

**Context strip** (below header): shows `ctx:`, `ns:`, `model:` from Orkas AI

| Signal | Purpose |
|--------|---------|
| `tab` | `'ask' \| 'knowledge'` |
| `orkaStatus` | `'checking' \| 'online' \| 'offline'` |
| `k8sCtx` | K8s context info from `/k8s/context` |
| `models` | Model list from `/models` |
| `messages` | Chat message history |
| `input` | Current chat input |
| `loading` | Chat loading state |
| `sessionId` | UUID per panel mount |
| `expandedSteps` | Set of expanded reasoning step indices |
| `ingestTitle/Type/Content` | Knowledge tab form |
| `ingestMsg` | Knowledge tab success/error feedback |

**Direct Orkas AI calls** (`localhost:8000`):

| Action | Method | Endpoint |
|--------|--------|----------|
| Panel mount — status | `GET` | `/health` |
| Panel mount — context | `GET` | `/k8s/context` |
| Panel mount — models | `GET` | `/models` |
| Send message / click suggestion | `POST` | `/ask` |
| Knowledge tab → Add to KB | `POST` | `/ingest/docs` |

---

### IncidentDetail.tsx

**Role**: Full incident deep-dive. 2166 lines. The most complex component.

**Left panel tabs**: Overview · Logs · Events · Metrics · Config · YAML

**Right panel tabs**: Fix · Topology · Runbook · Retro

**Inline Orkas AI widget** (expandable, below Overview):
- 6 quick-prompt buttons pre-filled with incident context
- Full chat with model/confidence/latency metadata

| Signal | Purpose |
|--------|---------|
| `activeTab` | Left panel active tab |
| `activeRPTab` | Right panel active tab (`fix \| topology \| runbook \| retro`) |
| `aiFixes` | Fix recommendations from `/incident/fix` |
| `fixLoading` | Fix loading state |
| `orkasMessages` | Incident-scoped chat history |
| `orkasInput` | Chat input |
| `orkasLoading` | Chat loading state |
| `orkasSessionId` | UUID per incident |

**KubeGraf API calls** (`/api/*`):

| Action | Endpoint |
|--------|----------|
| Load incident | `GET /api/v2/incidents/{id}` |
| Load logs | `GET /api/v2/incidents/{id}/logs` |
| Load events | `GET /api/v2/namespaces/{ns}/events` |
| Load metrics | `GET /api/v2/incidents/{id}/metrics` |

**Direct Orkas AI calls** (`localhost:8000`):

| Action | Method | Endpoint | Payload |
|--------|--------|----------|---------|
| Fix tab → "Analyze & Fix" | `POST` | `/incident/fix` | `{pattern, resource_kind, resource_name, namespace, severity, description}` |
| Orkas widget → send message | `POST` | `/ask` | `{query: "[incident ctx] " + input, namespace}` |

---

### HomeScreen.tsx

- Health ring — canvas-drawn circular progress (0–100)
- SLO burn rates (Availability, Latency p99, Error Rate)
- Active incident summary cards
- **API**: `GET /api/metrics`, `GET /api/v2/incidents`
- No Orkas AI calls

---

### WorkloadScreen.tsx

- Pod table with filtering, status badges, container details
- Deployment metrics, resource requests/limits
- **API**: `GET /api/v2/pods`, `GET /api/v2/deployments`
- No Orkas AI calls

---

### WorkspacePanels.tsx

| Panel | API call |
|-------|---------|
| Workloads | `GET /api/pods`, `GET /api/deployments` |
| Metrics | `GET /api/metrics` |
| GitOps | `GET /api/v2/gitops/status` |
| Cost | `GET /api/v2/cost/summary` |

No Orkas AI calls.

---

### ContextGraphScreen.tsx

- Canvas-based service topology graph
- Service relationship mapping, blast radius
- **API**: `GET /api/v2/topology`
- No Orkas AI calls

---

## 7. UI ↔ API Mapping

### Complete Call Map

| Component | User Action | API System | Endpoint |
|-----------|-------------|-----------|---------|
| `OrkasAIPanel` | Panel opens | Orkas AI | `GET :8000/health` |
| `OrkasAIPanel` | Panel opens | Orkas AI | `GET :8000/k8s/context` |
| `OrkasAIPanel` | Panel opens | Orkas AI | `GET :8000/models` |
| `OrkasAIPanel` | Click suggestion / send | Orkas AI | `POST :8000/ask` |
| `OrkasAIPanel` | Knowledge → Add to KB | Orkas AI | `POST :8000/ingest/docs` |
| `IncidentDetail` | Open incident | KubeGraf | `GET /api/v2/incidents/{id}` |
| `IncidentDetail` | Logs tab | KubeGraf | `GET /api/v2/incidents/{id}/logs` |
| `IncidentDetail` | Events tab | KubeGraf | `GET /api/v2/namespaces/{ns}/events` |
| `IncidentDetail` | Metrics tab | KubeGraf | `GET /api/v2/incidents/{id}/metrics` |
| `IncidentDetail` | Fix tab → "Analyze & Fix" | Orkas AI | `POST :8000/incident/fix` |
| `IncidentDetail` | Orkas widget → send | Orkas AI | `POST :8000/ask` |
| `HomeScreen` | Page load | KubeGraf | `GET /api/metrics` |
| `HomeScreen` | Page load | KubeGraf | `GET /api/v2/incidents` |
| `WorkloadScreen` | Page load | KubeGraf | `GET /api/pods`, `/api/deployments` |
| `WorkspacePanels` | Metrics panel | KubeGraf | `GET /api/metrics` |
| `WorkspacePanels` | GitOps panel | KubeGraf | `GET /api/v2/gitops/status` |
| `WorkspacePanels` | Cost panel | KubeGraf | `GET /api/v2/cost/summary` |
| `ContextGraphScreen` | Load graph | KubeGraf | `GET /api/v2/topology` |
| `IntelligentWorkspace` | Load incident list | KubeGraf | `GET /api/v2/incidents` |

### Graph API Consumers

The graph API is consumed primarily by Orkas AI (server-to-server, not from the browser):

| Orkas AI Tool | KubeGraf Endpoint | Purpose |
|---------------|-------------------|---------|
| `kubegraf_analyze` | `POST /api/graph/analyze` | Get CausalChain for a faulty node |
| `kubegraf_remediation` | `POST /api/graph/remediation` | Get graph-validated RemediationPlan |
| `kubegraf_blast_radius` | `GET /api/graph/blast-radius` | Get all affected downstream nodes |
| `kubegraf_topology` | `GET /api/graph/topology` | Explore cluster topology |
| `kubegraf_node` | `GET /api/graph/node` | Get node details + recent events |
| `kubegraf_graph_status` | `GET /api/graph/status` | Check engine health |

### Rail Navigation → Screen Map

| Rail Icon | `activeScreen` | Component Rendered |
|-----------|---------------|-------------------|
| Home | `home` | `HomeScreen` |
| Incident | `incident` | `IncidentDetail` |
| Workloads | `workloads` | `WorkloadScreen` |
| Context Graph | `graph` | `ContextGraphScreen` |
| Metrics | `metrics` | `WorkspacePanels` (metrics) |
| GitOps | `gitops` | `WorkspacePanels` (gitops) |
| Cost | `cost` | `WorkspacePanels` (cost) |
| Settings | `settings` | Settings screen |
| Orkas AI logo | `orkai` | `OrkasAIPanel` |

---

## 8. Orkas AI Integration

### 8.1 What's Currently Integrated (UI → Orkas AI)

| Location | Feature | Endpoint | Notes |
|----------|---------|----------|-------|
| `OrkasAIPanel` → Ask tab | Free-form cluster Q&A | `POST /ask` | Session tracking, confidence, reasoning steps |
| `OrkasAIPanel` → Ask tab | Suggestion chips (6 presets) | `POST /ask` | Merged general + cluster analysis presets |
| `OrkasAIPanel` → Knowledge tab | RAG document ingestion | `POST /ingest/docs` | Runbook, K8s, Terraform, generic |
| `OrkasAIPanel` → header strip | Context + model info | `GET /k8s/context`, `GET /models` | Compact strip |
| `IncidentDetail` → Fix tab | kubectl fix recommendations | `POST /incident/fix` | Risk badges, click-to-copy commands |
| `IncidentDetail` → Orkas widget | Incident-scoped chat | `POST /ask` | Pre-filled with incident context |

### 8.2 Orkas AI → KubeGraf Graph API (NEW — server-to-server)

Orkas AI now uses the KubeGraf graph engine as its primary reasoning tool. When a user asks about an incident, Orkas AI calls KubeGraf's graph APIs to get structured, deterministic causal analysis, then translates the result to natural language.

```
User: "Why is my payment service down?"
         │
         ▼
Orkas AI: intent detection → incident analysis
         │
         ├── POST http://kubegraf:3003/api/graph/analyze
         │   {"node_id": "Service/production/payment-svc"}
         │   → CausalChain {root_cause: Node/gke-node-2, pattern: node_disk_pressure_eviction_cascade, confidence: 0.92}
         │
         ├── GET http://kubegraf:3003/api/graph/blast-radius
         │   ?node_id=Node/gke-node-2
         │   → {blast_radius: [Service/production/checkout-svc, ...], count: 7}
         │
         └── POST http://kubegraf:3003/api/graph/remediation
             {"node_id": "Node/gke-node-2"}
             → RemediationPlan {steps: [describe, cordon], risk: medium}

Orkas AI: "Root cause is disk pressure on gke-node-2. The payment service was
           evicted along with 6 other services. Here are the remediation steps..."
```

**Orkas AI graph tools registered in Orkas AI's tool registry:**

| Tool Name | Method | KubeGraf Endpoint | Arguments |
|-----------|--------|-------------------|-----------|
| `kubegraf_graph_status` | GET | `/api/graph/status` | — |
| `kubegraf_topology` | GET | `/api/graph/topology` | namespace, kinds, focus, depth |
| `kubegraf_analyze` | POST | `/api/graph/analyze` | node_id or kind+namespace+name, window_minutes |
| `kubegraf_blast_radius` | GET | `/api/graph/blast-radius` | node_id or kind+namespace+name |
| `kubegraf_node` | GET | `/api/graph/node` | node_id or kind+namespace+name, window_minutes |
| `kubegraf_remediation` | POST | `/api/graph/remediation` | node_id or kind+namespace+name |

### 8.3 POST /incident/brief (NEW endpoint)

Orkas AI exposes `/incident/brief` which orchestrates a full structured incident brief by calling multiple KubeGraf graph APIs:

```
POST /incident/brief
{
  "node_id": "Pod/production/payment-pod-abc123",
  "window_minutes": 30,
  "include_remediation": true
}

Response:
{
  "causal_chain": { ... },        // from POST /api/graph/analyze
  "blast_radius": { ... },        // from GET /api/graph/blast-radius
  "remediation_plan": { ... },    // from POST /api/graph/remediation
  "natural_language_summary": "Node gke-node-2 entered disk pressure at 09:15...",
  "confidence": 0.92,
  "pattern_matched": "node_disk_pressure_eviction_cascade"
}
```

This is the primary endpoint for `IncidentDetail` → "Generate Brief" (planned UI feature).

### 8.4 Orkas AI Response Shape (from `/ask`)

```json
{
  "answer": "Markdown text...",
  "confidence": 0.91,
  "severity": "critical",
  "health_status": "degraded",
  "sources": [{"title": "OOMKill Runbook", "score": 0.94}],
  "remediation": ["Increase memory limit to 512Mi"],
  "reasoning_steps": [
    {"step": 1, "action": "Searching knowledge base", "tool": "rag_search", "observation": "Found 3 relevant runbooks"},
    {"step": 2, "action": "Fetching graph causal chain", "tool": "kubegraf_analyze", "observation": "Pattern matched: oom_kill_crash_loop, confidence 0.87"}
  ],
  "model_used": "llama3.3:70b",
  "latency_ms": 2340.5,
  "session_id": "uuid4"
}
```

### 8.5 Orkas AI Endpoints Not Yet Used in UI

| Endpoint | Potential KubeGraf Use |
|---------|----------------------|
| `POST /incident/rca` | Full structured RCA report (vs. quick fix list) |
| `POST /incident/brief` | Graph-grounded incident brief (orchestrates multiple graph API calls) |
| `POST /terraform/review` | Review Terraform in GitOps panel |
| `POST /ingest/bulk` | Auto-sync KubeGraf runbooks to Orkas knowledge base |

### 8.6 Architecture: Current vs. Planned

```
CURRENT (browser calls Orkas AI directly):
  Browser → POST http://localhost:8000/ask
  Browser → POST http://localhost:8000/incident/fix
  Browser → POST http://localhost:8000/ingest/docs

  Orkas AI → POST http://localhost:3003/api/graph/analyze  (NEW, server-to-server)
  Orkas AI → GET  http://localhost:3003/api/graph/blast-radius  (NEW)
  Orkas AI → POST http://localhost:3003/api/graph/remediation   (NEW)

PLANNED (proxy via KubeGraf Go backend):
  Browser → POST /api/orka/ask → Go enriches with K8s graph data → POST :8000/ask
  Browser → POST /api/orka/incident/fix → Go enriches → POST :8000/incident/fix
  Benefits: context injection, no hardcoded port, caching, auth control
```

---

## 9. v1 / v2 / v3 Product Roadmap

### v1 — MVP (Current, in progress)

**Theme**: Live K8s graph + graph-grounded incident analysis, propose-only remediation

| Feature | Status |
|---------|--------|
| Live topology graph engine (`pkg/graph/`) | DONE |
| 10 pre-encoded failure patterns | DONE |
| Causal chain inference (BFS + scoring) | DONE |
| Blast radius computation | DONE |
| Graph HTTP API (`/api/graph/*`) | DONE |
| `web_server.go` integration (graphEngine field, Start) | DONE |
| Orkas AI graph tools (kubegraf_analyze, kubegraf_remediation, etc.) | DONE |
| `POST /incident/brief` in Orkas AI | DONE |
| Graph-validated remediation plan (propose-only, no auto-execute) | DONE |
| SolidJS frontend: HomeScreen, IncidentDetail, OrkasAIPanel, WorkloadScreen | DONE |
| Built-in AI (/api/ai/*) | DONE |
| Incident intelligence system (v2 incidents API) | DONE |
| Multi-cluster context switching | DONE |
| GKE auth (IAM, token refresh) | DONE |
| Frontend → UI served from SolidJS + embedded Go | DONE |

### v2 — 6–12 months

**Theme**: Multi-cluster intelligence, agent-executed remediation, integrations

| Feature | Notes |
|---------|-------|
| Multi-cluster federation | Single graph engine spanning multiple clusters; cross-cluster blast radius |
| Automated pattern discovery | ML learns new failure patterns from resolved incidents (feedback loop) |
| Agent-executed remediation | Orkas AI executes kubectl commands with human approval workflow |
| Slack / PagerDuty integration | Incident alerts with graph brief, approve/reject remediation from Slack |
| Pre-change risk assessment | Before kubectl apply: compute blast radius, check PDBs, flag risky changes |
| Automated post-mortems | Post-incident: graph replay → structured post-mortem document |
| Confidence calibration | Track prediction accuracy → adjust pattern confidence scores |
| RBAC-aware remediation | Only propose actions the current user can execute |
| KubeGraf graph as MCP tool | Expose graph engine as MCP tools for Claude/GPT-4 tool-use |
| Enhanced graph edges | HPA SCALES, PDB PROTECTS, NetworkPolicy NETWORK_ALLOWS construction |

### v3 — 12–24 months

**Theme**: Predictive failure detection, autonomous SRE, ecosystem

| Feature | Notes |
|---------|-------|
| Predictive failure detection | Detect failure patterns before they fully manifest (early graph signals) |
| Autonomous SRE mode | Agent handles tier-3 incidents end-to-end with approval at risk thresholds |
| Industry pattern packs | Downloadable pattern libraries: database patterns, ML training patterns, etc. |
| CI/CD integration | Pre-deployment blast radius analysis; block if risk > threshold |
| Multi-cloud topology | AWS ECS, Azure AKS, Google Cloud Run resources as graph nodes |
| Pattern marketplace | Community-contributed failure patterns with confidence ratings |
| SLO burn rate graph edges | Link SLO breach events to causal graph nodes |
| Cost impact in blast radius | Annotate blast radius nodes with hourly cost impact |

---

## 10. Build & Run Reference

### Frontend Build

```bash
cd /Users/puvendhan/Documents/repos/new/kubegraf/ui/solid

# Install dependencies
npm install

# Development (hot reload, calls KubeGraf backend at localhost:3003)
npm run dev

# Production build (outputs to ../../web/dist — embedded into Go binary)
npm run build

# Clear Vite cache (force full recompile)
rm -rf node_modules/.vite && npm run build
```

**Vite config** (`vite.config.ts`):
```ts
build: {
  outDir: '../../web/dist',    // embedded by Go via //go:embed web/dist
  rollupOptions: {
    output: {
      manualChunks: { ... }   // code splitting per screen
    }
  }
}
```

### Go Backend Build

```bash
cd /Users/puvendhan/Documents/repos/new/kubegraf

# Build (embeds web/dist automatically)
go build -o kubegraf .

# Run
./kubegraf web --port=3003

# Combined: build frontend + backend + restart
cd ui/solid && npm run build && cd ../.. && go build -o kubegraf . && pkill -f "kubegraf web"; sleep 1 && ./kubegraf web --port=3003 &
```

**Graph engine starts automatically** as part of `NewWebServer()`:
```go
if app.clientset != nil {
    ws.graphEngine = graph.NewEngine(app.clientset)
    go ws.graphEngine.Start()
}
```

After startup, the graph engine logs:
```
[graph] Waiting for informer caches to sync...
[graph] Topology graph ready: 847 nodes
[graph] Rebuilt edges: 1203 total
```

### Orkas AI Run

```bash
cd /Users/puvendhan/Documents/repos/new/orka-ai

# Docker (all services — Ollama, Redis, Weaviate, Postgres)
docker compose up

# Dev only (requires local Redis + Weaviate running)
uvicorn api.main:app --reload --port 8000

# Seed knowledge base with initial docs
python scripts/ingest_docs.py

# Health check
curl http://localhost:8000/health
curl http://localhost:8000/models

# Test graph tools integration
curl -X POST http://localhost:8000/ask \
  -H "Content-Type: application/json" \
  -d '{"query": "Why is my payment service down?", "namespace": "production"}'
```

### Verify Graph Engine

```bash
# Check graph engine is running
curl http://localhost:3003/api/graph/status

# Get full topology snapshot
curl http://localhost:3003/api/graph/topology | jq '.node_count, .edge_count'

# Analyze a faulty pod
curl -X POST http://localhost:3003/api/graph/analyze \
  -H "Content-Type: application/json" \
  -d '{"kind": "Pod", "namespace": "default", "name": "my-pod", "window_minutes": 30}'

# Get blast radius for a node
curl "http://localhost:3003/api/graph/blast-radius?kind=Node&name=gke-node-1"

# Get remediation plan
curl -X POST http://localhost:3003/api/graph/remediation \
  -H "Content-Type: application/json" \
  -d '{"kind": "Node", "name": "gke-node-1"}'
```

---

## 11. Configuration

### KubeGraf — Built-in AI Provider

Configured via environment variables when running the kubegraf binary:

| Variable | Default | Description |
|----------|---------|-------------|
| `KUBEGRAF_OLLAMA_URL` | `http://127.0.0.1:11434` | Ollama server for built-in AI |
| `KUBEGRAF_OLLAMA_MODEL` | `llama3.1:latest` | Model for built-in AI queries |
| `KUBEGRAF_AI_AUTOSTART` | `false` | Auto-load model on startup |
| `OPENAI_API_KEY` | — | Enable OpenAI as built-in AI provider |
| `ANTHROPIC_API_KEY` | — | Enable Claude as built-in AI provider |

### KubeGraf — Graph Engine

The graph engine has no separate environment variables. It is initialised automatically using the same `clientset` used by the rest of the server. The following constants are compiled in (`engine.go`):

| Constant | Value | Description |
|----------|-------|-------------|
| `resyncPeriod` | `30s` | Informer resync interval |
| `maxEventAge` | `2h` | Maximum age of retained K8s events |
| `maxEvents` | `2000` | Rolling event buffer cap |
| `mutationBatchWindow` | `50ms` | Graph mutation debounce |
| `maxUpstreamHops` | `5` | Max BFS hops upstream in causal analysis |
| `maxDownstreamHops` | `4` | Max BFS hops downstream for blast radius |
| `defaultWindowMinutes` | `30` | Default event lookback window |

### Orkas AI — All Environment Variables

**File**: `orka-ai/config/settings.py` · **Loaded from**: `.env`

#### LLM Providers

| Variable | Default | Description |
|----------|---------|-------------|
| `DEFAULT_MODEL_PROVIDER` | `ollama` | `claude \| openai \| ollama \| vllm \| groq \| together \| custom` |
| `ENABLE_MODEL_ROUTING` | `true` | Use specialized models per role (reasoning/intent/code) |
| `ANTHROPIC_API_KEY` | — | Required if `DEFAULT_MODEL_PROVIDER=claude` |
| `CLAUDE_MODEL` | `claude-sonnet-4-6` | Claude model ID |
| `OPENAI_API_KEY` | — | Required if `DEFAULT_MODEL_PROVIDER=openai` |
| `OPENAI_MODEL` | `gpt-4o` | OpenAI model ID |
| `OLLAMA_URL` | `http://localhost:11434` | Ollama server |
| `OLLAMA_MODEL` | `llama3.3:70b` | Primary reasoning model |
| `OLLAMA_CODE_MODEL` | `qwen2.5-coder:32b` | Code / IaC tasks |
| `OLLAMA_FAST_MODEL` | `mistral-nemo` | Intent detection |
| `VLLM_URL` | `http://localhost:8000` | vLLM / SGLang server |
| `VLLM_MODEL` | `meta-llama/Llama-3.3-70B-Instruct` | |
| `GROQ_API_KEY` | — | Required if `DEFAULT_MODEL_PROVIDER=groq` |
| `GROQ_MODEL` | `llama-3.3-70b-versatile` | |
| `GROQ_CODE_MODEL` | `qwen-2.5-coder-32b` | |
| `GROQ_FAST_MODEL` | `llama-3.1-8b-instant` | |
| `TOGETHER_API_KEY` | — | Together AI |
| `CUSTOM_LLM_URL` | `http://localhost:1234/v1` | LM Studio / llama.cpp |

#### Databases

| Variable | Default | Description |
|----------|---------|-------------|
| `POSTGRES_HOST` | `localhost` | PostgreSQL |
| `POSTGRES_PORT` | `5432` | |
| `POSTGRES_DB` | `orkaai` | |
| `POSTGRES_USER` | `orkaai` | |
| `POSTGRES_PASSWORD` | `orkaai` | |
| `REDIS_HOST` | `localhost` | Redis (session memory) |
| `REDIS_PORT` | `6379` | |
| `REDIS_PASSWORD` | — | Optional |
| `WEAVIATE_HOST` | `localhost` | Weaviate (vector DB / RAG) |
| `WEAVIATE_PORT` | `8080` | |
| `WEAVIATE_GRPC_PORT` | `50051` | |
| `WEAVIATE_API_KEY` | — | Optional (Weaviate Cloud) |

#### Kubernetes & RAG

| Variable | Default | Description |
|----------|---------|-------------|
| `K8S_IN_CLUSTER` | `false` | Use in-cluster service account |
| `K8S_KUBECONFIG` | — | Path to kubeconfig (default: `~/.kube/config`) |
| `K8S_DEFAULT_NAMESPACE` | `default` | Default namespace |
| `KUBEGRAF_URL` | `http://localhost:3003` | KubeGraf backend URL for graph API calls |
| `EMBEDDING_PROVIDER` | `ollama` | `ollama \| openai \| custom` |
| `EMBEDDING_MODEL` | `nomic-embed-text` | Text → vector model (768d) |
| `EMBEDDING_OLLAMA_URL` | `http://localhost:11434` | Separate Ollama URL for embeddings |
| `CHUNK_SIZE` | `512` | Characters per RAG chunk |
| `CHUNK_OVERLAP` | `64` | Overlap between chunks |
| `TOP_K_RESULTS` | `5` | RAG results to retrieve per query |
| `SESSION_TTL_SECONDS` | `3600` | Redis session expiry (1 hour) |
| `MAX_CONVERSATION_TURNS` | `20` | Max messages per session |
| `AGENT_MAX_ITERATIONS` | `10` | Max reasoning steps |
| `AGENT_TIMEOUT_SECONDS` | `60` | Per-query timeout |
| `CONFIDENCE_THRESHOLD` | `0.7` | Minimum confidence to accept answer |

### Docker Compose — Combined Stack

```yaml
# Run both KubeGraf and Orkas AI together
services:
  kubegraf:
    build: ../kubegraf
    ports: ["3003:3003"]
    environment:
      KUBEGRAF_OLLAMA_URL: "http://ollama:11434"
    volumes:
      - ~/.kube/config:/root/.kube/config:ro

  orka-api:
    build: ../orka-ai
    ports: ["8000:8000"]
    environment:
      DEFAULT_MODEL_PROVIDER: groq        # or ollama / claude
      GROQ_API_KEY: ${GROQ_API_KEY}
      KUBEGRAF_URL: "http://kubegraf:3003"  # graph API endpoint
    depends_on: [redis, weaviate, postgres, ollama, kubegraf]

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]

  weaviate:
    image: semitechnologies/weaviate:1.28.2
    ports: ["8080:8080", "50051:50051"]
    environment:
      QUERY_DEFAULTS_LIMIT: 25
      AUTHENTICATION_ANONYMOUS_ACCESS_ENABLED: "true"
      PERSISTENCE_DATA_PATH: "/var/lib/weaviate"
      DEFAULT_VECTORIZER_MODULE: "none"
      ENABLE_MODULES: ""
      CLUSTER_HOSTNAME: "node1"

  postgres:
    image: postgres:16-alpine
    ports: ["5432:5432"]
    environment:
      POSTGRES_DB: orkaai
      POSTGRES_USER: orkaai
      POSTGRES_PASSWORD: orkaai

  ollama:
    image: ollama/ollama
    ports: ["11434:11434"]
    volumes: ["ollama_data:/root/.ollama"]
    # Uncomment for GPU support:
    # deploy:
    #   resources:
    #     reservations:
    #       devices: [{driver: nvidia, count: all, capabilities: [gpu]}]

volumes:
  ollama_data:
```

---

## 12. Implementation Status

### Done

| Component | Description |
|-----------|-------------|
| `pkg/graph/types.go` | All type definitions: GraphNode, GraphEdge, CausalChain, CausalStep, CausalCandidate, RemediationPlan, RemediationStep, GraphSnapshot, SubgraphQuery, AnalyzeRequest — 21 NodeKinds, 15 EdgeKinds, 6 NodeStatus values |
| `pkg/graph/patterns.go` | 10 pre-encoded failure patterns: node_disk_pressure_eviction_cascade, node_memory_pressure_oom_cascade, oom_kill_crash_loop, image_pull_scheduling_block, config_change_induced_crash, node_not_ready_pod_eviction, pvc_pending_pod_block, hpa_thrashing, resource_quota_exhaustion, upstream_service_dependency_failure |
| `pkg/graph/engine.go` | SharedInformerFactory watching 13 resource types; node upsert/delete; edge construction; rolling event buffer; **+ `OnAnomaly func(*CausalChain)` callback; `isSevereEvent()` for 13 critical K8s reasons; `maybeNotifyAnomaly()` with 2-min per-node throttle + 0.7 confidence gate** |
| `pkg/graph/inference.go` | `Analyze()`: 10-step BFS causal inference with candidate scoring, pattern matching, path construction, blast radius; `BuildRemediationPlan()`: graph-validated remediation steps per root cause kind; 30-second analysis cache |
| `web_graph.go` | 6 HTTP handlers: handleGraphStatus, handleGraphTopology, handleGraphAnalyze, handleGraphBlastRadius, handleGraphNode, handleGraphRemediation; `RegisterGraphRoutes()` |
| `web_server.go` | `graphEngine *graph.Engine` field; `OnAnomaly` wired to `broadcastGraphIncident()`; **`broadcastGraphIncident()` pushes `graph_incident` WS msg to all clients; `startGraphSnapshots()` goroutine — 60s ticker, saves graph snapshot to SQLite** |
| `internal/database/database.go` | Existing encrypted SQLite schema; **+ `graph_snapshots` table (id, snapshot_at, node_count, edge_count, context_name, data_json); `SaveGraphSnapshot()` method; indexed on snapshot_at + context_name; auto-prunes to 288 snapshots per context (24h at 60s interval)** |
| Orkas AI graph tools | kubegraf_analyze, kubegraf_remediation, kubegraf_blast_radius, kubegraf_topology, kubegraf_node, kubegraf_graph_status registered in Orkas AI tool registry |
| `POST /incident/brief` | Orkas AI endpoint orchestrating graph API calls into structured incident brief with natural language summary |
| `ContextGraphScreen.tsx` | Live topology canvas; **now polls `GET /api/graph/topology` every 30s; maps live nodes/edges to canvas format with auto-layout; shows green "● live" badge when using live data; falls back to incidents-based graph when engine has no data** |
| `IncidentDetail.tsx` | Timeline canvas, Fix/RCA/AI tabs; **now fetches `POST /api/graph/analyze` on incident change; maps causal chain `Evidence[]` to `TLEvent[]` for timeline canvas; uses graph events when confidence > 0.3 + evidence > 0** |
| `OrkasAIPanel.tsx` | Global AI panel; **now has 3 tabs: Ask + Knowledge + Incidents; Incidents tab shows live `graph_incident` WS alerts with root cause, affected node, blast radius, confidence; Approve/Reject remediation decision buttons per incident; red badge counter on tab** |
| `IntelligentWorkspace.tsx` | Root shell layout; **now shows dismissible graph incident alert banner (red, fixed-position) with root cause + pattern + confidence; auto-dismisses after 15s; subscribes to `graph_incident` WS messages** |
| `WebSocketProvider.tsx` | WS context; **added `GraphIncidentAlert` interface; `graphIncident`/`clearGraphIncident` signals; handler for `graph_incident` message type** |
| `websocket.ts` | WS service type; **added `'graph_incident'` to `WebSocketMessage.type` union** |
| Built-in AI | `/api/ai/*` (Ollama/OpenAI/Claude) |
| Incident intelligence | `/api/v2/incidents/*` |
| Multi-cluster context | Context switching, GKE auth |
| All existing API routes | 400+ routes across all subsystems |

### In Progress / Next Steps

| Item | Priority | Notes |
|------|----------|-------|
| Remediation approval persistence | Medium | Approve/Reject decisions currently held in component state; need backend `/api/graph/remediation/approve` endpoint + DB table |
| Edge construction for HPA SCALES | Medium | `onHPA()` handler not yet implemented in engine.go |
| Edge construction for PDB PROTECTS | Medium | `onPDB()` handler not yet implemented |
| Edge construction for NetworkPolicy NETWORK_ALLOWS | Low | Complex: requires label selector matching on NetworkPolicy |
| Analysis cache invalidation | Medium | Currently TTL-only; should also invalidate on graph mutation |
| Integration tests for graph engine | High | Unit tests for inference.go scoring and pattern matching |
| Go proxy layer for Orkas AI calls | Low (v2) | Currently browser calls Orkas AI directly |

### Known Gaps

| Gap | Impact | Plan |
|-----|--------|------|
| `onDeleteResource` in engine.go is incomplete | Low — nodes eventually get stale but don't cause crashes | Fix: extract kind from tombstone and call deleteNode correctly |
| `MOUNTS_SECRET` edges not built in `rebuildAllEdges` | Low — only built incrementally in `rebuildPodEdges` | Add Secrets list pass in `rebuildAllEdges` |
| ConfigMap system prefix filter (`kube-*`) may be too broad | Low | Some kube-system configmaps may be relevant to failure analysis |
| Graph snapshots rebuilt on engine restart | Low | `graph_snapshots` table persists historical snapshots for trend analysis but the live in-memory graph always rebuilds from informers (~10s sync) |
| Analysis confidence cap at 0.99 | Low | Intentional — epistemic humility. Document in UI. |
| Remediation decisions not persisted | Medium | Approve/Reject state lives in OrkasAIPanel component; lost on page refresh |

---

## 13. Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| **Graph engine is the reasoning layer, not the LLM** | LLMs hallucinate root causes. A typed graph with BFS traversal is deterministic and auditable. The LLM only translates structured output to natural language. This is the core product differentiator. |
| **Separate `pkg/graph/` package** | Clean separation of the causal reasoning engine from HTTP handlers. Makes it independently testable and reusable. `pkg/` follows Go conventions for importable packages. |
| **13 informers, not polling** | SharedInformerFactory with `resyncPeriod=30s` keeps graph current with < 50ms lag for most changes. Polling would introduce staleness and hammers the K8s API. |
| **Edge construction on mutation, full rebuild at start** | `rebuildAllEdges()` after initial sync ensures correctness at startup. Incremental edge updates on mutations keep the graph consistent thereafter. |
| **Rolling event buffer (2000 max, 2h max age)** | Bounds memory usage while covering all realistic incident investigation windows. OOM events from earlier in the day are still available. |
| **30-second analysis cache** | Prevents redundant BFS during rapid polling by Orkas AI. Cache is keyed per `affectedNodeID`. |
| **Confidence cap at 0.99** | Epistemic humility. The algorithm can never be 100% certain of a root cause — there may always be an unmodelled factor. This is surfaced to users. |
| **Pattern confidence overrides scoring up to pattern.Confidence** | Patterns are domain expert knowledge. If graph scoring gives 0.6 but the pattern has 0.92 confidence, trust the pattern — it's been validated against real incidents. |
| **Remediation is propose-only in v1** | Auto-executed remediation requires much higher confidence and approval workflows. Propose-only is safe for MVP. |
| **3-tab OrkasAIPanel** (Ask + Knowledge + Incidents) | "Cluster" tab was a duplicate of Ask — merged into Ask tab. "Incidents" tab added for proactive graph anomaly push via WebSocket — separate from incident-specific Fix tab in IncidentDetail. |
| **No incident fix in OrkasAIPanel** | Incident fix lives exclusively in `IncidentDetail` right panel (Fix tab). The Incidents tab in OrkasAIPanel is for proactive anomaly alerts from the graph engine, not for user-initiated incident analysis. |
| **Proactive anomaly push via WebSocket** | `OnAnomaly` callback in Engine → `broadcastGraphIncident()` in WebServer → all WS clients. Two-minute per-node throttle prevents alert storms. 0.7 confidence gate prevents low-signal noise. |
| **Graph snapshot persistence** | 60-second SQLite snapshots preserve historical topology for trend analysis and post-incident review. Auto-prunes to 288 rows per context (24h window at 60s interval). |
| **Direct browser → Orkas AI** | Simple, no proxy latency. Trade-off: hardcoded `localhost:8000`, no context enrichment. Planned future: Go proxy layer. |
| **KubeGraf built-in AI ≠ Orkas AI** | `/api/ai/*` (KubeGraf) uses Ollama/OpenAI natively for simple queries. Orkas AI (`localhost:8000`) is richer with RAG, knowledge base, multi-model routing, and graph tools. |
| **Embedded frontend** | `//go:embed web/dist` — single binary, no separate web server, zero deployment complexity. |
| **SolidJS signals** | All state is reactive. Components are large but self-contained (e.g., `IncidentDetail` at 2166 lines owns all its data fetching inline). |
| **Node ID format: `Kind/namespace/name`** | Human-readable, debuggable, and unique. Cluster-scoped resources use `Kind/name` (no namespace segment). |
| **`DEPENDS_ON` edges from env vars (weight 0.6)** | Inferred edges are lower confidence than structural edges (1.0). The 0.6 weight feeds into candidate scoring, appropriately down-weighting inferred service dependencies. |
