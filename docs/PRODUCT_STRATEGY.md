# Orkastor / Kubegraf — Product Strategy & Architecture

> Last updated: 2026-03-01
> Audience: engineering, investors, product

---

## Table of Contents

1. [What Kubegraf Is — and Is Not](#1-what-kubegraf-is--and-is-not)
2. [Technical Differentiation from Alert-Correlation AI](#2-technical-differentiation-from-alert-correlation-ai)
3. [System Architecture — Data Ingestion to Reasoning](#3-system-architecture--data-ingestion-to-reasoning)
4. [Orkastor AI Agent — How It Uses Kubegraf](#4-orkastor-ai-agent--how-it-uses-kubegraf)
5. [Incident Response Workflow](#5-incident-response-workflow)
6. [60-Day MVP Definition](#6-60-day-mvp-definition)
7. [UI/UX Principles — "AI SRE" Experience](#7-uiux-principles--ai-sre-experience)
8. [Defensibility and Long-Term Moat](#8-defensibility-and-long-term-moat)
9. [Positioning](#9-positioning)

---

## 1. What Kubegraf Is — and Is Not

### What it is

Kubegraf is a **causal reasoning engine for Kubernetes**.

It continuously builds a typed graph of every object in a cluster — pods, nodes,
deployments, services, HPAs, PDBs, PVCs, config maps, ingresses — and the
structural relationships between them (ownership, scheduling, routing, mounting,
scaling, protecting).

When an incident occurs, Kubegraf does not summarize alerts. It traverses the
graph upstream from the broken node, scores candidate root causes against 10
pre-encoded failure patterns, and returns a deterministic CausalChain: which
node caused the failure, via what dependency path, with what confidence, and
which downstream nodes are in the blast radius.

The AI (Orkas AI) reads this structured output and translates it to plain English.
The reasoning itself never touches the LLM — it is graph traversal.

### What it is not

| Not this | Why |
|----------|-----|
| An observability dashboard | Kubegraf does not store or query time-series metrics. It models structure, not telemetry. |
| An AI chatbot that reads logs | Logs are a signal source, not the reasoning medium. Kubegraf reasons about topology and dependency. |
| An alert correlator | Alert correlation is symptom-level. Kubegraf reasons about cause-effect relationships in the graph. |
| An autopilot | Kubegraf proposes remediation and requires explicit human approval. Auto-execution is v3. |

---

## 2. Technical Differentiation from Alert-Correlation AI

### How competitors work (Deductive.ai, etc.)

```
Slack alert → LLM → "Your pod is crashing"
Datadog alert + logs → LLM → "Seems related to config change"
Alert A + Alert B → embedding similarity → "These might be related"
```

The reasoning happens inside the LLM. The LLM has no structural model of the
system. It can only pattern-match across text. This produces:

- Confident-sounding answers that hallucinate root causes
- No ability to distinguish "this pod is crashing because the node is under disk
  pressure" from "this pod is crashing because the image pull failed"
- No blast radius — cannot determine what else will break
- No remediation validation — cannot check PDBs before proposing eviction

### How Kubegraf works

```
K8s API (informers) → Typed graph (21 NodeKinds, 15 EdgeKinds)
                    ↓
              Incident detected
                    ↓
         BFS upstream (max 5 hops)
                    ↓
         Score candidates (event count + status severity + edge weight + temporal precedence)
                    ↓
         Pattern matching (10 failure patterns, pre-encoded by SRE domain expertise)
                    ↓
         CausalChain { root_cause, path, confidence, blast_radius, pattern_matched }
                    ↓
         LLM translates to natural language (reads structured output, does NOT reason)
```

The LLM is not the reasoning layer. It is the communication interface.

### Concrete capability differences

| Capability | Alert correlation | Kubegraf |
|-----------|-------------------|---------|
| Root cause identification | Inferred from alert text (hallucination-prone) | Deterministic BFS on typed graph |
| Blast radius | Not computed | BFS downstream, 4 hops, all affected nodes listed |
| Confidence score | LLM's self-assessed confidence (unreliable) | Graph signal strength (event count × edge weight × pattern confidence) |
| Remediation validation | None | Checks PDBs before proposing eviction; checks capacity |
| HPA thrashing detection | Requires HPA alerts to be configured | SCALES edge in graph: HPA status is a first-class graph node |
| PDB blocking detection | Requires manual investigation | PROTECTS edge: PDB status instantly visible in causal path |
| Speed | Seconds to minutes (LLM API calls) | < 100ms (in-memory BFS on pre-built graph) |
| Determinism | Non-deterministic (LLM varies per call) | Deterministic (same graph state → same result) |
| Auditability | "The AI said so" | Causal path shows every edge traversed, with weights |

---

## 3. System Architecture — Data Ingestion to Reasoning

### Layer 1: Data Ingestion (continuous, not batch)

```
Kubernetes API Server
       │
       │ SharedInformerFactory (client-go)
       │ 15 resource types watched:
       │   Pods, Nodes, Deployments, ReplicaSets, StatefulSets, DaemonSets,
       │   Services, Ingresses, PVCs, ConfigMaps, Namespaces, Jobs,
       │   HorizontalPodAutoscalers, PodDisruptionBudgets, Events
       │
       ▼
 Informer callbacks (Add/Update/Delete)
       │
       ▼
 pkg/graph/engine.go
 ├── upsertNode(n)        — update node with current status + metadata
 ├── deleteNode(id)       — remove node + all edges touching it
 ├── rebuildPodEdges()    — SCHEDULES_ON, OWNS, MOUNTS, MOUNTS_CONFIG,
 │                          MOUNTS_SECRET, DEPENDS_ON (from env vars)
 ├── rebuildServiceEdges()— EXPOSES (label selector matching)
 ├── onHPA()              — SCALES edge: HPA → Deployment/StatefulSet
 ├── onPDB()              — PROTECTS edge: PDB → Deployment/StatefulSet
 └── rolling event buffer — 2000 events, 2-hour max age
```

**Key design decisions:**
- Informers not polling — < 50ms lag vs eventual consistency with polling
- Edge construction triggered on mutation — no full rebuild required after startup
- Full rebuild at startup after cache sync — ensures correctness at t=0
- Analysis cache invalidated on node status change — stale results during active incidents are unacceptable

### Layer 2: Graph Construction (in-memory, typed)

```
Engine.nodes  map[NodeID]*GraphNode   — 21 NodeKinds
Engine.edges  map[EdgeID]*GraphEdge   — 15 EdgeKinds + weights
Engine.outEdges                        — forward adjacency (downstream)
Engine.inEdges                         — reverse adjacency (upstream / causal)
```

**Node example:**
```
Pod/production/payment-api-7d9f4b-x8k
├── Kind: Pod
├── Status: Failed
├── Conditions: {Ready: false}
├── RestartCount: 8
├── Events: [CrashLoopBackOff (×12, 4min ago), OOMKilling (×3, 8min ago)]
└── UpdatedAt: 14:32:01
```

**Edge example:**
```
Node/gke-cluster-1-n1-standard-4-abc123  --[SCHEDULES_ON, weight=1.0]-->  Pod/production/payment-api-7d9f4b-x8k
HPA/production/payment-api-hpa          --[SCALES, weight=0.9]-->          Deployment/production/payment-api
PDB/production/payment-api-pdb          --[PROTECTS, weight=0.85]-->       Deployment/production/payment-api
```

### Layer 3: Reasoning Engine (deterministic, < 100ms)

```go
Analyze(req AnalyzeRequest) *CausalChain {
    1. BFS upstream from affected node (max 5 hops, using inEdges)
    2. For each candidate upstream node:
       a. Count events in window (recent events buffer)
       b. Weight by node status (Failed=3.0, Degraded=1.5, Pending=1.0)
       c. Weight by edge weight (structural=1.0, inferred=0.6)
       d. Weight by temporal precedence (earlier events = higher score)
    3. Match top candidate against 10 pre-encoded failure patterns
       - Pattern confidence overrides scoring (domain expert knowledge)
    4. Build causal path: candidate → ... → affected node
    5. BFS downstream from root cause → blast radius (max 4 hops)
    6. Return CausalChain { confidence capped at 0.99 }
}
```

**10 pre-encoded failure patterns:**

| Pattern | Confidence |
|---------|-----------|
| `node_not_ready_pod_eviction` | 0.95 |
| `image_pull_scheduling_block` | 0.91 |
| `node_disk_pressure_eviction_cascade` | 0.92 |
| `oom_kill_crash_loop` | 0.87 |
| `pvc_pending_pod_block` | 0.88 |
| `node_memory_pressure_oom_cascade` | 0.89 |
| `config_change_induced_crash` | 0.78 |
| `resource_quota_exhaustion` | 0.85 |
| `hpa_thrashing` | 0.72 |
| `upstream_service_dependency_failure` | 0.75 |

### Layer 4: AI Layer (language interface only)

```
CausalChain (structured JSON)
       │
       ▼
Orkas AI (FastAPI, port 8000)
├── /ask            — free-form Q&A: agent may call graph tools (analyze_incident, etc.)
├── /incident/brief — orchestrated: calls analyze → remediation → formats → LLM narrates
├── /incident/fix   — remediation: reads causal chain → specific kubectl commands
└── /incident/rca   — root cause: reads causal chain → natural language explanation
```

**What the LLM does:**
- Translate structured graph output to readable incident summaries
- Select which tools to call (Kubegraf graph tools + K8s listing tools)
- Calibrate language certainty based on `chain.confidence` field
- Generate kubectl remediation commands in safe order

**What the LLM does NOT do:**
- Root cause analysis
- Blast radius computation
- Remediation validation (PDB checks, capacity checks)
- Confidence scoring

### Layer 5: Storage Model

| Store | Technology | Purpose |
|-------|-----------|---------|
| Live topology graph | In-memory (Go maps) | Primary reasoning state; rebuilt from informers on restart (~10s) |
| Event buffer | In-memory ring buffer | 2000 events, 2h window; feeds scoring in Analyze() |
| Graph snapshots | SQLite AES-256-GCM | 60s interval, 288/context (24h), trend analysis |
| Analysis cache | In-memory map | 30s TTL per node; invalidated on status change |
| Remediation decisions | SQLite AES-256-GCM | Human approve/reject audit trail, indexed by context+time |
| RAG knowledge base | Weaviate | Runbooks, architecture docs, post-mortems |
| Session memory | Redis | Conversation context for Orkas AI multi-turn chat |
| Credentials | SQLite AES-256-GCM | Cloud provider tokens, kubeconfig credentials |

---

## 4. Orkastor AI Agent — How It Uses Kubegraf

The Orkas AI agent is built on a `ReasoningEngine` loop: intent classification →
tool selection → LLM narrative. The graph tools are the highest-priority tools
when a query involves a specific resource or an active incident.

### Tool registry (graph tools)

```python
query_topology(namespace, kinds, focus_node_id, depth)
    → GET /api/graph/topology → GraphSnapshot

analyze_incident(name, namespace, kind, window_minutes)
    → POST /api/graph/analyze → CausalChain
    (returns _format_causal_chain() — compact LLM-ready text block)

get_blast_radius(name, namespace, kind)
    → GET /api/graph/blast-radius → affected nodes + count

get_remediation_plan(name, namespace, kind)
    → POST /api/graph/remediation → RemediationPlan (PDB-validated steps)

get_graph_node(name, namespace, kind)
    → GET /api/graph/node → node detail + recent events
```

### Agent decision flow during an incident query

```
User: "Why is payment-api down?"
        │
        ▼
ReasoningEngine.classify_intent()  → "incident_analysis"
        │
        ▼
select tools: [analyze_incident, get_blast_radius, get_remediation_plan]
        │
        ▼
analyze_incident("payment-api", "production", "Deployment", window=30)
        │
        ▼
CausalChain {
  root_cause: Node/gke-cluster-1-abc123 (Status: Failed, NodeNotReady)
  path: Node → ReplicaSet/production/payment-api-7d9f → Pod/production/payment-api-7d9f-x8k
  pattern: node_not_ready_pod_eviction (confidence: 0.92)
  blast_radius: [Pod/production/cart-api-pod, Service/production/payment-api, ...]
}
        │
        ▼
LLM narrates: "The payment-api deployment is down because node gke-cluster-1-abc123
is NotReady (disk pressure). This is a confirmed node_not_ready_pod_eviction pattern
(92% confidence). 3 downstream services are affected. Recommended: cordon the node
and drain workloads to healthy nodes."
```

### Proxy architecture

All browser → Orkas AI calls now go through the Go proxy at `/api/orka/*`:

```
Browser → GET /api/orka/health
        → Go proxy enriches with X-Kubegraf-Context header
        → http://localhost:8000/health (or ORKAS_AI_URL env)
```

This eliminates hardcoded `localhost:8000` in the frontend and enables
deploying Orkas AI on a separate host/pod without frontend changes.

---

## 5. Incident Response Workflow

### Step-by-step: SRE receives alert at 14:30

```
T+0  Alert fires (PagerDuty / Slack): "payment-api CrashLoopBackOff"

T+1  SRE opens Kubegraf → HomeScreen shows incident card:
     "payment-api — CrashLoopBackOff — node_not_ready_pod_eviction (0.92)"
     Graph incident banner already visible (WebSocket push triggered at T-30s)

T+2  SRE clicks incident → IncidentDetail opens
     Left panel: Overview tab with timeline canvas
     Timeline events sourced from CausalChain evidence (not synthetic)
     Events plotted: NodeNotReady (T-5m) → Pod evicted (T-3m) → CrashLoopBackOff (T+0)

T+3  SRE switches to Topology tab (right panel)
     ContextGraphScreen shows live graph: node highlighted red, blast radius orange

T+4  SRE clicks Fix tab
     Remediation steps from BuildRemediationPlan() — PDB-validated, ordered:
       1. kubectl cordon gke-cluster-1-abc123
       2. kubectl drain gke-cluster-1-abc123 --ignore-daemonsets
       3. Monitor pod rescheduling on healthy nodes

T+5  SRE opens OrkasAIPanel → Incidents tab
     Graph incident alert visible: root cause, blast radius, confidence
     SRE clicks "✓ Approve Remediation"
     Decision persisted to SQLite: remediation_decisions table

T+6  SRE executes remediation (kubectl commands from Fix tab)
     Kubegraf graph updates in real-time as node is drained:
     Node status: Failed → Healthy (informer fires, node updated in graph)
     Pod status: Evicted → Pending → Running (30-60s)

T+15 Incident resolved. SRE opens Retro tab.
     Post-mortem template pre-filled with:
     - Timeline from graph events (not from memory)
     - Root cause from CausalChain (not from guessing)
     - Blast radius from graph traversal
     - Remediation steps from BuildRemediationPlan()
```

### Why this workflow is different from existing tools

1. **No alert triage** — Graph engine already ran BFS and identified root cause before the SRE opened the tool
2. **No manual correlation** — The causal path is pre-built; SRE sees it, not builds it
3. **Blast radius is immediate** — SRE knows what else is broken before starting remediation
4. **Remediation is validated** — PDB checks happen before steps are shown, not after
5. **Timeline comes from the graph** — Not reconstructed from logs after the fact

---

## 6. 60-Day MVP Definition

### Milestone: "Working incident intelligence for a single cluster"

**Goal**: An SRE can install Kubegraf, point it at a cluster, and get a root cause
explanation within 60 seconds of a pod failure — without configuring anything.

### Must-have features (Day 60)

| Feature | Implemented? | Where |
|---------|-------------|-------|
| Live topology graph (all 15 resource types) | ✅ Done | `pkg/graph/engine.go` |
| Causal chain analysis (BFS + 10 patterns) | ✅ Done | `pkg/graph/inference.go` |
| Blast radius computation | ✅ Done | `pkg/graph/inference.go` |
| Graph HTTP API (6 endpoints) | ✅ Done | `web_graph.go` |
| Proactive incident detection (WebSocket push) | ✅ Done | `engine.go` → `web_server.go` |
| HPA SCALES edges | ✅ Done | `engine.go` `onHPA()` |
| PDB PROTECTS edges | ✅ Done | `engine.go` `onPDB()` |
| Remediation plan (PDB-validated) | ✅ Done | `inference.go` `BuildRemediationPlan()` |
| Incident timeline from causal chain | ✅ Done | `IncidentDetail.tsx` |
| Live topology canvas | ✅ Done | `ContextGraphScreen.tsx` |
| Orkas AI natural language explanation | ✅ Done | `/incident/brief` + `/ask` |
| Remediation approval with persistence | ✅ Done | `web_orka.go` + `database.go` |
| Go proxy for Orkas AI (no hardcoded localhost) | ✅ Done | `web_orka.go` `/api/orka/*` |
| Single binary deployment | ✅ Done | `//go:embed web/dist` |

### Nice-to-have (Day 90, not blocking MVP)

| Feature | Notes |
|---------|-------|
| NetworkPolicy NETWORK_ALLOWS edges | Complex label selector matching; planned v2 |
| Integration tests for inference.go | Unit tests for BFS scoring and pattern matching |
| Multi-cluster federation | Single-cluster is correct MVP scope |
| Slack/PagerDuty webhook | Useful but not blocking core value demo |

### What success looks like at Day 60

An SRE can:
1. Run `./kubegraf web --port=3003` against a real cluster
2. Trigger a pod OOM kill or node pressure
3. See a graph_incident WebSocket alert appear in the UI within 2 minutes
4. Click through to see: root cause, causal path, blast radius, remediation steps
5. Ask Orkas AI "why is X down?" and get a structured, accurate answer in < 5s
6. Approve remediation and have the decision persisted

---

## 7. UI/UX Principles — "AI SRE" Experience

### Core principle: show reasoning, not just results

An SRE needs to trust the system before acting on it. Show the work.

| Principle | Implementation |
|-----------|---------------|
| **Confidence is explicit** | Every AI output shows confidence %: "92% — node_not_ready_pod_eviction" |
| **Causal path is visible** | Timeline canvas shows every node in the causal chain, in time order |
| **Blast radius is immediate** | Blast radius shown before remediation; SRE understands scope before acting |
| **Propose, don't auto-execute** | Remediation requires Approve button; no kubectl runs without consent |
| **Graph is the source of truth** | Canvas graph shows live status — not a static diagram |
| **Latency is a feature** | Graph analysis < 100ms; Orkas AI response < 5s streaming |

### Visual design principles

| Rule | Rationale |
|------|-----------|
| Color = signal severity, not decoration | Red = failed/crit, orange = warn, green = healthy. Consistent across all components. |
| Confidence displayed as % not qualitative | "92%" is more actionable than "high confidence" |
| Timeline reads left-to-right (time) | Temporal causality is easier to parse as a horizontal flow |
| Alert banner is dismissible with auto-timeout | Persistent alerts cause alert fatigue; 15s auto-dismiss |
| 3-pane layout: list / detail / AI | SRE workflow: pick incident (left) → investigate (center) → ask AI (right) |
| No modals for destructive actions | Use inline approval (Approve/Reject buttons) not modal dialogs |

### What "AI SRE" means in UX terms

Traditional SRE tooling: SRE does the analysis; tool provides data.
AI SRE: Tool does the analysis; SRE reviews and approves.

This means:
- **Default view is the conclusion**, not the raw data
- **Data is one click away**, not the default view
- **Actions require single confirmation**, not multi-step wizard
- **AI explains in SRE language**: "node disk pressure caused pod eviction cascade", not "I've analyzed the situation and believe..."

---

## 8. Defensibility and Long-Term Moat

### Structural moat: the graph is the product

Alert correlators can be replicated by any team with GPT-4 and a vector store.
The Kubegraf graph engine is fundamentally harder to replicate because:

1. **Domain-encoded failure patterns** — Each pattern represents accumulated SRE
   expertise about how Kubernetes fails. Encoded in Go, version-controlled,
   confidence-calibrated. Building pattern libraries takes time and real incident data.

2. **Graph construction accuracy** — Edge construction (SCHEDULES_ON, SCALES,
   PROTECTS, etc.) requires deep understanding of the Kubernetes object model.
   Label selector matching, owner reference traversal, RBAC-aware edges — these
   take months to get right.

3. **Feedback loop from decisions** — Every Approve/Reject in the Incidents tab
   is an implicit signal about causal chain quality. This data trains future
   pattern confidence calibration. Orkas AI has no access to this signal.

4. **Speed advantage from in-memory graph** — < 100ms BFS vs seconds for any
   LLM-based approach. Speed matters in incidents.

### Moat deepening over time

| Year 1 | Year 2 | Year 3 |
|--------|--------|--------|
| 10 pre-encoded patterns | 50+ patterns from customer incident data | Pattern marketplace (community-contributed) |
| Single-cluster BFS | Multi-cluster federation | Cross-cloud topology (ECS, Cloud Run) |
| Propose-only remediation | Human-approved auto-execution | Autonomous SRE for tier-3 incidents |
| Static pattern confidence | ML-calibrated confidence from decision feedback | Predictive detection (early graph signals) |
| K8s workload graph | + CI/CD events as graph nodes | + Cost impact in blast radius |

### Why LLMs alone cannot close this gap

The value is not in the LLM response. The value is in the structured CausalChain
that the LLM reads. Competitors who replace the graph with more LLM calls get:

- Slower (API latency vs in-memory BFS)
- Less reliable (LLM hallucination vs deterministic traversal)
- Worse blast radius (text inference vs typed graph traversal)
- No remediation validation (prompt vs PDB check)

The graph engine is the defensible technology. The LLM is a commodity interface.

---

## 9. Positioning

### One-sentence positioning (website hero)

> "Kubegraf tells you why your Kubernetes cluster is broken — in under a second —
> using a live graph of every dependency, not an AI that reads your alerts."

### Investor positioning

> "Existing AIOps tools correlate symptoms. Kubegraf models causality.
>
> We maintain a continuously-updated typed graph of every Kubernetes object and
> dependency relationship in a cluster. When a pod fails, we traverse the graph
> upstream in < 100ms and identify the root cause deterministically — no LLM
> required for the reasoning step.
>
> The LLM is used only to translate our structured output into plain English.
> This produces faster, more accurate, and auditable incident analysis than any
> alert-correlation approach.
>
> The moat is the graph engine: 15 edge types, 21 node types, 10 pre-encoded
> failure patterns, and a feedback loop that learns from every engineer approval
> decision. This gets harder to replicate with every incident we process."

### Technical pitch (for SRE/platform teams)

> "Kubegraf is a single Go binary that watches your cluster via the Kubernetes
> informer API and builds a live typed graph. No agents. No sidecars. No
> Prometheus dependency. No OpenTelemetry.
>
> When a pod crashes, Kubegraf runs BFS upstream from the broken pod, scores
> candidate root causes against 10 failure patterns, and returns a CausalChain
> in < 100ms: which node caused it, via which dependency path, with what
> confidence, and what is in the blast radius.
>
> You get the root cause explanation before you finish reading the alert."

### Differentiation table (for website comparison section)

| | Alert correlation | Kubegraf |
|--|------------------|---------|
| Root cause method | LLM inference from alert text | Deterministic BFS on typed topology graph |
| Blast radius | Not provided | BFS downstream traversal (all affected nodes) |
| HPA/PDB awareness | Requires manual correlation | First-class graph nodes with structural edges |
| Confidence | Self-assessed by LLM | Graph signal strength (auditable computation) |
| Remediation validation | None | PDB-checked, capacity-checked, ordered steps |
| Speed | Seconds (LLM API) | < 100ms (in-memory graph) |
| Auditability | "AI said so" | Full causal path with edge weights shown |
| Deployment | Cloud SaaS / agent install | Single binary, zero external dependencies |

---

*Document maintained alongside IMPLEMENTATION_SUMMARY.md. Update when architecture changes.*
