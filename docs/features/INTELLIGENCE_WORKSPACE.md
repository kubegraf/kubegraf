# 🧠 Intelligence Workspace

A production-grade, full-screen incident investigation environment. Think of it as a war room: all cluster signals, AI analysis, topology, logs, metrics, and runbooks in one place — no tab-switching to different views.

---

## How to Open It

Click the **🧠 Intelligence** icon in the KubeGraf sidebar navigation, or open any critical incident and choose **"Open in Workspace"**.

The workspace opens full-screen over the normal KubeGraf UI.

---

## UI Layout

```
┌──────┬──────────────────────────┬──────────────────────────────────────┐
│      │                          │                                      │
│ RAIL │  SIDEBAR (ContextNav)    │  MAIN PANEL                         │
│ 52px │  260px                   │  1fr                                │
│      │  · Cluster selector      │  [Overview|Incident|Workloads|Graph]│
│      │  · SLO status            │                                      │
│      │  · Health chips          │                                      │
│      │  · Incident list         │                                      │
│      │    (grouped by ns)       │                                      │
└──────┴──────────────────────────┴──────────────────────────────────────┘
```

### Rail (left 52px)

Icon-only vertical navigation. Click to switch the main panel content.

| Icon | Screen | Description |
|---|---|---|
| Grid | **Overview** (Home) | Cluster health score, SLO burn rates, top incidents, cluster cards |
| Triangle | **Incidents** | Incident detail panel — default screen |
| Building | **Workloads** | Live workload table with inline actions |
| Nodes | **Context Graph** | Causal chain / topology graph |
| Pulse | **Metrics** | CPU and memory charts |
| — sep — | | |
| Git branch | **GitOps** | GitOps pipeline status |
| Dollar | **Cost** | Cost analysis |
| Orkas logo | **Orkas AI** | Full-screen AI chat with cluster context |
| — spacer — | | |
| Gear | **Settings** | Workspace and cluster settings |
| Avatar | Profile | User initials (PV) |

A red dot badge appears on the Incidents rail icon when there are critical incidents.

---

## Screen: Overview (Home)

Entry point. Shows the cluster at a glance.

```
┌─────────────────────────────────────────────────────┐
│  [Health Ring 100]  cluster-name                    │
│                     44 active incidents             │
│                     [Crit 2] [Warn 8] [OK 34]      │
│                                                     │
│  SLO Burn Rate                                      │
│  Availability SLO   98.2% / 99.9%  ████████░░      │
│  Latency p99 SLO    99.1% / 99.5%  █████████░      │
│  Error Rate SLO     99.8% / 99.5%  ██████████      │
├─────────────────────────────────────────────────────┤
│  Active Incidents          [View all →]             │
│  SEV-1  payment-service CRASHLOOP  14:23            │
│  SEV-2  redis-0 OOM_PRESSURE       14:19            │
│  SEV-3  user-service IMAGE_PULL    14:17            │
├─────────────────────────────────────────────────────┤
│  All Clusters                       [+ Add cluster] │
│  ● prod-gke-dev  2 incidents  79 pods  6 nodes     │
│  ○ + Add cluster                                    │
└─────────────────────────────────────────────────────┘
```

**Data sources:**
- Health score: computed from real (non-demo) incident severity ratios
- SLO burn rates: derived from critical/high incident count against cluster total
- Cluster card stats: `GET /api/metrics` (pods, nodes, CPU%)

---

## Screen: Incidents

The default screen. Split into a **left content panel** and a **right action panel**.

### Left Panel — Incident Header

Sticky at the top:
- Resource name, kind badge, namespace
- Severity pill (`SEV-1 / SEV-2 / SEV-3`)
- Occurrence count (Nx restarts)
- First seen timestamp
- Navigation: `← prev  1/44  next →`
- Copy buttons for resource name and namespace

### Left Panel — Main Tabs

Six tabs across the top of the incident body:

| Tab | What it shows | Data source |
|---|---|---|
| **Overview** | AI hypotheses, animated timeline, resource score ring, signal evidence | Incident snapshot + `/api/v2/incidents/{id}/snapshot` |
| **Logs** | Real pod log tail (last 50 lines), error pattern grouping | `GET /api/v2/incidents/{id}/logs?tail=50` |
| **Events** | Kubernetes events for the affected resource | `GET /api/v2/incidents/{id}` events field |
| **Metrics** | CPU (20-pt line chart) + Memory (20-pt area chart) with limit lines | `GET /api/v2/incidents/{id}/metrics` |
| **Config** | Pod resource requests/limits, env vars, volume mounts | `GET /api/pods` + pod describe |
| **YAML** | Live resource YAML with edit-and-apply capability | `/api/pod/yaml` → `POST /api/v1/apply` |

#### Overview Tab Details

```
┌─ AI Hypotheses ────────────────────────────────────┐
│  🧠  ✓ Confirmed Root Cause            94% conf   │
│       Container memory limit exceeded              │
│       ████████████████████████████████            │
│       · Exit code 137 (OOMKilled)                 │
│       · 7 restarts in last 6 minutes              │
│                                                    │
│  📦  ? Possibly Contributing           ~41%        │
│       Traffic spike exhausting memory headroom     │
│                                                    │
│  🔌  ✗ Ruled Out                                   │
│       External dependency / DNS failure            │
└────────────────────────────────────────────────────┘
┌─ Event Timeline ───────────────────────────────────┐
│  [animated canvas: event dots on a horizontal axis]│
│  ████ root cause zone (purple region)              │
│  • Stable  ● Crash  ● SEV-1  ◆ OOMKilling         │
└────────────────────────────────────────────────────┘
┌─ Resource Score ───────────────────────────────────┐
│  [arc ring canvas — 0-100 health score]            │
│  Sparkline charts for CPU, memory signals          │
└────────────────────────────────────────────────────┘
```

### Right Panel — Action Tabs

Five tabs on the right side of the incident screen:

| Tab | Description |
|---|---|
| **Fix** | AI-generated kubectl remediation steps. Falls back to pattern-based recommendations if AI is unavailable — always shows actionable output. Shows `⚙ Pattern-based` badge when fallback is used. |
| **Topology** | Service dependency graph for the affected resource, powered by the graph engine. Shows causal chain with root cause highlighted. |
| **Runbook** | Step-by-step operational runbook for the detected failure pattern. Steps can be run interactively (runbook runner with progress indicator). |
| **✦ Chat** | Conversational AI panel pre-loaded with the current incident context. Ask follow-up questions, request deeper analysis, or generate custom kubectl commands. |
| **Retro** | Post-incident retrospective template pre-filled with incident data: timeline, root cause, impact, action items. Copy-to-clipboard for sharing. |

#### Fix Tab — AI Fix Card Structure

```
┌─ Analyze & Fix with Orkas AI ──────────────────┐
│  [✦ Orkas AI] or [⚙ Pattern-based]             │
│                                                  │
│  Fix 1: Increase memory limits          HIGH    │
│  Container is hitting the 512Mi limit.           │
│  ┌─ kubectl set resources ... ───────────────┐  │
│  │  kubectl set resources deployment/redis   │  │
│  │    -c redis --limits=memory=1Gi           │  │
│  │                                     [copy]│  │
│  └───────────────────────────────────────────┘  │
│                                                  │
│  Fix 2: Rollout restart                 LOW     │
│  Restart to reclaim leaked memory.               │
│  ┌─ kubectl rollout restart ─────────────────┐  │
│  │  kubectl rollout restart deployment/redis │  │
│  │                                     [copy]│  │
│  └───────────────────────────────────────────┘  │
└──────────────────────────────────────────────────┘
```

---

## Screen: Workloads

Live workload table. Fetches Deployments, StatefulSets, and DaemonSets in parallel.

```
Filter: [All] [Critical] [Warning]    NS: [All ▾]    [↻ Refresh]

Name                    Kind        NS        Restarts  CPU    Memory  Status
payment-service-68c...  Deployment  drivo-dev  7x       320m   412Mi   ⚠ Warn
redis-0                 StatefulSet drivo-dev  3x       45m    498Mi   🔴 Crit
lending-service         Deployment  drivo-dev  0x       120m   180Mi   ✓ OK
```

Clicking a row opens a **detail side panel** with four sub-tabs:

| Sub-tab | Content |
|---|---|
| **Overview** | Replica status, ready count, image, labels, age, conditions |
| **YAML** | Live YAML viewer with edit mode (saves via `POST /api/v1/apply`) |
| **Events** | Kubernetes events for this workload |
| **Scale** | Replica count input with instant scale action |

Inline row actions: **Restart** (rolling restart) · **Delete** (with confirmation).

Cross-navigation: clicking a row that has a matching incident navigates directly to that incident in the Incident screen.

**Data sources:**
- `GET /api/deployments` · `GET /api/statefulsets` · `GET /api/daemonsets`
- `GET /api/pods/metrics` (CPU/memory per pod)

---

## Screen: Context Graph

Visual causal chain explorer. Shows how cluster resources are connected and where a failure propagated from.

```
                    ┌──────────────┐
                    │  redis-0     │  ← ROOT CAUSE
                    │  StatefulSet │     (purple, large dot)
                    └──────┬───────┘
                           │
           ┌───────────────┼───────────────┐
           ▼               ▼               ▼
    payment-service  wallet-service  transaction-service
    Deployment       Deployment      Deployment
    (error, red)     (warn, amber)   (warn, amber)
```

- Root cause node: highlighted in purple
- Error nodes: red
- Healthy connected nodes: grey
- Clicking a node navigates to that incident's detail view

**Real-time anomaly banner:** When the graph engine detects a new incident via WebSocket, a dismissible banner appears at the top:
```
⬡  Graph Incident: CRASHLOOP on StatefulSet/redis-0  (87% confidence)  [✕]
```

**Data sources:**
- `GET /api/graph/topology` → full resource graph
- `POST /api/graph/analyze` → causal chain for selected resource
- `GET /api/graph/blast-radius` → impact radius

---

## Screen: Metrics

CPU and memory charts for the cluster or namespace.

- 20-data-point line/area charts with deterministic (non-flickering) seeds
- CPU: blue line, milliseconds (m) scale, limit line dashed
- Memory: red area fill, MiB scale, limit line dashed red
- Time labels at t=0, t-5, t-10, t-15, t-19 minutes

---

## Screen: Orkas AI (full-screen chat)

Embeds the `OrkasAIPanel` component with the currently selected incident pre-loaded as context. You can:
- Ask follow-up questions about the incident
- Request deeper log analysis
- Generate custom kubectl one-liners
- Ask "what should I check next?"

The panel uses the same AI provider chain: Orkas Cloud → Claude → OpenAI → Ollama → Pattern-based.

---

## Sidebar: ContextNavigator

Always visible on the left (260px). Shows the incident list regardless of which main screen is active.

### Structure (top to bottom)

```
┌─ Cluster Selector ────────────────────────────────┐
│  ● gke_project.../drivopay-gke-dev          ▾     │
├─ Search ──────────────────────────────────────────┤
│  🔍 Filter incidents...                           │
├─ SLO Status ──────────────────────────────────────┤
│  Availability   98.2%  ████████████████░░░░       │
│                         Target 99.9% · Burning    │
│  Latency p99    99.1%  ██████████████████░░       │
│                         Target 99.5% · Healthy    │
├─ Health Chips (clickable severity filters) ───────┤
│  [● 2 Critical]  [● 8 Warn]  [● 34 OK]           │
├─ Filter Tabs ─────────────────────────────────────┤
│  [All (29)]  [Workloads (19)]                     │
│   Services are never shown — they're workload      │
│   symptoms, not actionable on their own.          │
├─ Namespace Groups ─────────────────────────────────┤
│  drivo-dev                              29        │
│  ├ ● payment-service  Deployment   21x           │
│  ├ ● redis-0          StatefulSet  7x            │
│  ├ ● lending-service  Deployment   7x            │
│  └ ...                                            │
│  drivopay-dev                           2        │
│  └ ● redis-0          StatefulSet  7x            │
├─ Demo Section (separate, purple) ─────────────────┤
│  ★ Demo                                 2        │
│  ├ · crashloop-example  DEMO  7x                 │
│  └ · image-pull-example DEMO  3x                 │
└───────────────────────────────────────────────────┘
```

### Incident Row

```
│ tree-line │ ●crit/warn/ok  │  resource-name  │  KIND  │  Nx  │
```

Kind badge colors:
- `Deployment` → blue `#3B82F6`
- `StatefulSet` → cyan `#0891B2`
- `DaemonSet` → teal `#0D9488`
- `Pod` → purple `#7C3AED`
- `Job/CronJob` → amber `#CA8A04`

### Sort Order

Incidents are sorted:
1. By severity (critical → high → medium → low)
2. By `firstSeen` descending (newest first)
3. By `id` alphabetically as a stable tiebreaker

This prevents the list from reordering on every poll cycle.

### Keyboard Navigation

When focused outside an input field:
| Key | Action |
|---|---|
| `j` / `↓` | Next incident |
| `k` / `↑` | Previous incident |
| `Enter` | Select incident |
| `Escape` | Close workspace |

---

## Backend API Reference — Workspace Routes

### Workspace-Specific Routes

Registered by `RegisterIntelligenceWorkspaceRoutes()` in `web_intelligence_api.go`:

| Method | Route | Handler | Description |
|---|---|---|---|
| `GET` | `/api/v2/workspace/insights` | `handleWorkspaceInsights` | Insights summary for all active incidents |
| `GET` | `/api/v2/workspace/incidents/{id}/story` | `handleIncidentStory` | AI-generated incident narrative |
| `GET` | `/api/v2/workspace/incidents/{id}/related` | `handleRelatedIncidents` | Related incidents by pattern/resource |
| `POST` | `/api/v2/workspace/incidents/{id}/predict-success` | `handlePredictSuccess` | Fix success probability prediction |
| `POST` | `/api/v2/workspace/incidents/{id}/execute-fix` | `handleExecuteFix` | Execute a runbook fix step |
| `GET` | `/api/v2/workspace/incidents/{id}/rca` | `handleGenerateRCA` | Generate full RCA report (Markdown) |
| `POST` | `/api/v1/apply` | `handleYAMLApply` | Apply YAML manifest to cluster |

### AI / Orkas Routes

Registered by `RegisterOrkaRoutes()` in `web_orka.go`:

| Method | Route | Handler | Description |
|---|---|---|---|
| `POST` | `/api/orka/incident/fix` | `handleIncidentFix` | AI remediation fixes for incident. Returns `fixes[]` + `fallback: bool` |
| `POST` | `/api/orka/incident/brief` | `handleIncidentBrief` | AI incident brief (graph-grounded narrative) |
| `POST` | `/api/orka/*` | `handleOrkaProxy` | Transparent proxy to Orkas AI (chat, ask, etc.) |
| `POST` | `/api/graph/remediation/decision` | `handleRemediationDecision` | Record approve/reject decision for a suggested fix |
| `GET` | `/api/graph/remediation/decisions` | `handleListRemediationDecisions` | Recent fix decisions |

### Incident Intelligence Routes (v2)

Registered inside `pkg/incidents` intelligence system:

| Method | Route | Description |
|---|---|---|
| `GET` | `/api/v2/incidents` | List all incidents (query: namespace, pattern, severity, status, page) |
| `GET` | `/api/v2/incidents/{id}` | Full incident detail |
| `GET` | `/api/v2/incidents/{id}/snapshot` | Hot evidence — precomputed, cached 5min, <100ms |
| `GET` | `/api/v2/incidents/{id}/logs?tail=N` | Container log tail |
| `GET` | `/api/v2/incidents/{id}/metrics` | CPU/memory metrics |
| `GET` | `/api/v2/incidents/{id}/changes?lookback=60` | Changes before incident |
| `GET` | `/api/v2/incidents/{id}/evidence` | Structured evidence pack |
| `GET` | `/api/v2/incidents/{id}/citations` | Evidence citations with K8s doc links |
| `GET` | `/api/v2/incidents/{id}/runbooks` | Applicable runbooks |
| `GET` | `/api/v2/incidents/{id}/similar` | Similar past incidents |
| `POST` | `/api/v2/incidents/{id}/fix-preview` | Fix diff / dry-run |
| `POST` | `/api/v2/incidents/{id}/fix-apply` | Apply fix (requires `confirmed: true`) |
| `POST` | `/api/v2/incidents/{id}/resolve` | Mark incident resolved |
| `POST` | `/api/v2/incidents/{id}/feedback` | Submit outcome feedback |
| `GET` | `/api/v2/incidents/summary` | Aggregate counts by severity |

### Graph Engine Routes

Registered by `RegisterGraphRoutes()` in `web_graph.go`:

| Method | Route | Description |
|---|---|---|
| `GET` | `/api/graph/status` | Graph engine health |
| `GET` | `/api/graph/topology` | Full cluster resource graph |
| `POST` | `/api/graph/analyze` | Causal chain for a resource (returns `CausalChain` with root cause + evidence events) |
| `GET` | `/api/graph/blast-radius` | Downstream impact of a resource failure |
| `GET` | `/api/graph/node` | Single node details |
| `POST` | `/api/graph/remediation` | Remediation suggestion for a graph incident |

### Workload Routes (for WorkloadScreen)

| Method | Route | Description |
|---|---|---|
| `GET` | `/api/deployments` | All deployments |
| `GET` | `/api/statefulsets` | All StatefulSets |
| `GET` | `/api/daemonsets` | All DaemonSets |
| `GET` | `/api/pods` | All pods |
| `GET` | `/api/pods/metrics` | Pod CPU/memory |
| `GET` | `/api/metrics` | Cluster-level metrics |
| `GET` | `/api/contexts` | Available kubeconfig contexts |
| `GET` | `/api/contexts/current` | Active context |
| `POST` | `/api/contexts/switch` | Switch cluster context |
| `WS` | `/ws` | WebSocket — real-time graph incidents, metrics push |

---

## Frontend File Structure

```
ui/solid/src/components/workspace/
├── IntelligentWorkspace.tsx   # Shell: rail + sidebar + main panel routing
├── ContextNavigator.tsx       # Sidebar: incident list, SLO status, filter tabs
├── IncidentDetail.tsx         # Main incident panel (6 left tabs + 5 right tabs)
├── HomeScreen.tsx             # Overview: health ring, SLO burn, cluster cards
├── WorkloadScreen.tsx         # Workload table with detail side panel
├── ContextGraphScreen.tsx     # Causal chain graph
├── OrkasAIPanel.tsx           # Full AI chat panel (used in Chat tab + Orkas AI screen)
├── WorkspacePanels.tsx        # MetricsPanel, GitOpsPanel, CostPanel, SettingsPanel
├── FixExecutionModal.tsx      # Fix confirmation and execution modal
├── SkeletonLoader.tsx         # Loading placeholders
├── ErrorBoundary.tsx          # Per-component crash boundary
├── insightsEngine.ts          # Client-side insight generation logic
├── relatedIncidentsEngine.ts  # Related incident matching
├── rcaReportGenerator.ts      # RCA Markdown report builder
├── fixSuccessPredictor.ts     # Client-side fix success scoring
├── performanceUtils.ts        # Debounce, throttle helpers
├── accessibilityUtils.ts      # A11y helpers
└── workspace.css              # All workspace styles
```

---

## Data Flow — Incident Analysis

```
User clicks incident in sidebar
         │
         ▼
IncidentDetail mounts
  · GET /api/v2/incidents/{id}/snapshot   → hot evidence (instant)
  · overview tab auto-renders from snapshot

User clicks "Logs" tab
  · GET /api/v2/incidents/{id}/logs?tail=50

User clicks "Metrics" tab
  · GET /api/v2/incidents/{id}/metrics
  · drawMem() + drawMetricsCPU() render canvas charts

User clicks "Fix" tab (right panel)
  · POST /api/orka/incident/fix
    → AI provider chain runs (Orkas Cloud → Claude → OpenAI → Ollama)
    → extractJSONFromLLM() parses response (bracket-counting algorithm)
    → on parse failure: generateFallbackFixes() returns pattern-based fixes
    → response: { fixes: AiFix[], model_used, latency_ms, fallback: bool }
  · UI shows ⚙ Pattern-based badge if fallback=true

User clicks "Topology" tab (right panel)
  · GET /api/graph/topology
  · POST /api/graph/analyze { resource }
  → CausalChain rendered as graph, root cause highlighted

User clicks "✦ Chat" tab (right panel)
  · OrkasAIPanel mounted with incident context prop
  · POST /api/orka/ask (proxied to Orkas AI)

User clicks "Resolve"
  · POST /api/v2/incidents/{id}/resolve
  → toast: "✓ Incident resolved"
```

---

## Real-Time: WebSocket Push

The workspace subscribes to `wsService` on mount. When the graph engine detects a new anomaly, it pushes:

```json
{
  "type": "graph_incident",
  "data": {
    "root_cause": { "kind": "StatefulSet", "name": "redis-0" },
    "pattern_matched": "OOM_PRESSURE",
    "confidence": 0.87
  }
}
```

The workspace displays a **dismissible banner** for 15 seconds at the top center:
```
⬡  Graph Incident: OOM PRESSURE on StatefulSet/redis-0  (87% confidence)  [✕]
```

---

## Production Notes

| Property | Value |
|---|---|
| Services in sidebar | Never shown — downstream symptom of workload failures |
| Demo incidents | Shown separately with `★ Demo` label, 75% opacity |
| Sidebar sort | Stable: severity → firstSeen desc → id tiebreaker |
| Snapshot cache TTL | 5 minutes |
| Incident list poll | Background scan every 30s, non-blocking |
| AI fallback | Always shows output — pattern-based if AI fails |
| Charts | Deterministic seed — no flicker on resize/re-render |
| Keyboard nav | `j/k` navigate incidents, `Escape` closes workspace |
| Error isolation | Each screen wrapped in `WorkspaceErrorBoundary` — one crash doesn't break others |
