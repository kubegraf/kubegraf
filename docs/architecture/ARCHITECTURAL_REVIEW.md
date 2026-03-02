# KubeGraf — Principal Platform Architect Review

> **Reviewer role**: Principal Platform Architect + DevTools product reviewer
> **Date**: 2026-03-01
> **Deployment model**: Local single-binary webapp — runs on the developer's machine, connects to any kubeconfig context
> **AI status**: No AI models active today. Orkas AI (hosted) launching in 3–6 months. Full AI capabilities will be available soon.
> **Verdict**: Strong local-first foundation. Graph engine and pattern-based intelligence are solid today. The AI layer is ready to wire up the moment Orkas AI launches — the provider interface is already in place.

---

## 1. PRODUCT CATEGORY & DIFFERENTIATION

### What It Actually Is

KubeGraf is a **local-first Kubernetes Incident Intelligence Platform**. It runs as a single binary on the engineer's laptop, connects to any kubeconfig context, and answers "why is this broken?" using live topology graph analysis — no cloud account, no data leaving the machine, no setup beyond `./kubegraf web`.

The AI layer is designed and ready. It is **not yet active** — Orkas AI (hosted) will provide full AI capabilities once launched. In the meantime, all incident views use graph-based causal reasoning and deterministic pattern-based fix recommendations that are already functional today.

| Product | Category | vs KubeGraf today |
|---------|----------|--------------------|
| Datadog Kubernetes | Metrics + APM + AI | Cloud-only, expensive, requires agents |
| Grafana + Loki | Dashboards + logs | No incident workflow, no fix suggestions |
| Komodor | Kubernetes change intelligence | SaaS, change-first, not topology-first |
| Lens / OpenLens | K8s IDE | No incident intelligence, no AI |
| k9s | TUI cluster manager | CLI only, no intelligence layer |

**KubeGraf's working moat today** (no AI required): The **in-memory topology graph engine** (`ws.graphEngine`) that performs causal chain analysis, blast radius computation, and deterministic remediation plan generation from live cluster state. This works with zero AI configuration. The graph engine identifies root causes, causal paths, and blast radius for every incident — something no other local K8s tool does.

**When Orkas AI launches**: The `buildGraphContextStr` function in `web_orka.go` already injects live causal chain context into every AI prompt. The AI response will be anchored to real cluster state from day one — not generic LLM advice.

---

## 2. CURRENT ARCHITECTURE ANALYSIS

### Process Model

```
Single Go binary (package main) — runs locally
├── HTTP server (net/http)            → serves UI + API
├── In-memory graph engine            → live topology + causal reasoning
├── SQLite database                   → clusters, events, decisions (local file)
├── K8s client (client-go)            → watches live cluster state
├── AI provider chain (lazy-init)     → ready for Orkas AI when launched
├── Event monitor goroutine           → streams K8s events to SQLite
└── WebSocket server                  → real-time anomaly push to browser

Frontend: SolidJS SPA (compiled → web/dist/, embedded in binary via go:embed)
```

Everything is `package main` at the root — ~90 Go files. This is fine for a single-developer local tool. It becomes a friction point when multiple engineers contribute simultaneously (merge conflicts in the same package). No action required now; worth restructuring before adding team members.

### Issues Worth Noting (no urgency for local tool)

**1. Global mutable state without mutex**

```go
// web_workspace.go
var workspaceContextDB *WorkspaceContextDB
```

Initialized lazily without a mutex. Two concurrent requests at startup race to initialize it. Does not crash (both produce the same result), but `go test -race` will flag it. Low risk for a single-user local tool; fix before any multi-user deployment.

**2. `newIncidentAIAssistant()` per request (latency issue when AI is active)**

When the Orkas AI launches and the provider chain is active, every `/api/orka/incident/fix` request currently calls `getAvailableOllamaModels()` (an HTTP round-trip) on initialization. This should be a singleton on `WebServer`. Irrelevant today (no AI active), but worth fixing before AI launch to avoid latency.

**3. No HTTP router framework**

`net/http` `HandleFunc` for ~40 routes, no grouping or middleware. Fine for now. When adding auth later, every handler must be touched individually. Worth switching to `chi` before that.

**4. No authentication**

Zero auth on any route — intentional for a local single-user tool. This is correct for the current deployment model. It becomes a blocker only if/when KubeGraf is deployed as a shared team service.

---

## 3. DATA ARCHITECTURE

### Current State: SQLite for Everything

```sql
clusters              — saved kubeconfig connections (name, provider, path)
workspace_context     — active namespaces, filters (single row, id=1)
workspace_settings    — UI preferences
remediation_decisions — approve/reject history per cluster context
events                — K8s events, 7-day TTL auto-cleanup
```

**Verdict**: SQLite is the right choice for a local webapp. Fast, zero dependencies, embedded in the binary path. The schema choices are appropriate for the current single-user model.

### What to Watch as Usage Grows

**1. `workspace_context WHERE id = 1` — hardcoded singleton**

Fine for single user. If KubeGraf ever becomes a shared web service, this row needs to be keyed by `(user_id, cluster_context)`. Not an issue today.

**2. Graph engine has no persistent snapshot storage**

The `ws.graphEngine` is rebuilt from the K8s API on every restart. This means:
- No trend data across restarts
- "Why did this fail 3 days ago?" requires live data from that time (which is gone)
- Cold start latency on large clusters

For the local tool this is acceptable. A graph snapshot table (written every 5 minutes) would unlock temporal queries and is a high-value future investment.

**3. No event index confirmed on `(namespace, name, timestamp)`**

The events table is append-only with a 7-day cleanup. If a cluster generates many events, incident detail loading may slow down without a proper index. Worth checking schema and adding one if missing.

---

## 4. AI SYSTEM DESIGN

### Current State: Ready but Not Yet Active

The AI layer is fully built. The provider chain is:

```
1. Orkas AI Cloud  (ORKAS_API_KEY)     ← the primary path when launched
2. Anthropic Claude (ANTHROPIC_API_KEY)
3. OpenAI           (OPENAI_API_KEY)
4. Ollama local     (auto-detect)
5. Pattern-based fallbacks             ← active today, always works
```

**No AI model is active today.** The UI correctly shows "Full AI capabilities will be available soon" in the Orkas AI panel and the Fix tab. The pattern-based fallbacks (`generateFallbackFixes` in `web_orka.go`) provide deterministic, actionable kubectl commands for all common failure patterns — so the Fix tab is still useful today without any AI.

### What Is Working Well (today, no AI needed)

1. **Provider interface is clean**: `AIProvider{Name(), Query(), IsAvailable()}` — easy to plug Orkas AI in when ready without touching call sites.

2. **Graph-grounded prompt context** (`buildGraphContextStr`): When Orkas AI launches, every AI request will include: blast radius, causal path, supporting K8s events. The AI will respond to real cluster state, not just incident metadata. This is the correct design.

3. **`extractJSONFromLLM` is robust**: Four-strategy JSON extractor (code fence → plain fence → bracket counting → last resort) handles all LLM response formats. No changes needed.

4. **Pattern-based fallbacks are comprehensive**: `generateFallbackFixes` covers IMAGE_PULL_FAILURE, CRASH_LOOP_BACKOFF, OOM_KILLED, NO_READY_ENDPOINTS with real kubectl commands. Users get actionable output today.

5. **`buildGraphOnlyBrief` as graph-only fallback**: Even without AI, the graph engine generates a deterministic incident brief. This is what powers the Fix tab today.

6. **Ollama keep-alive + model unload**: Memory-aware idle timer for local model management — needed for the 3–6 month interim period where some users may self-host Ollama.

### Issues to Fix Before AI Launch

**1. `newIncidentAIAssistant()` creates a new client per request**

```go
// Called on every /api/orka/incident/fix:
func newIncidentAIAssistant() *AIAssistant {
    cfg := DefaultAIConfig()  // calls Ollama /api/tags — HTTP round trip
    ...
}
```

Fix: Add `ai *AIAssistant` to `WebServer`, initialize once at startup.

**2. No AI response caching**

Two engineers clicking "Fix" on the same incident fire two identical AI calls. A 5-minute prompt cache (`sha256(prompt)` → response) eliminates duplicates.

**3. 90-second blocking response — no streaming**

The UI waits up to 90 seconds with no feedback. Add SSE streaming before launch: Ollama `/api/generate` supports `stream: true` natively. Users should see tokens as they arrive.

**4. Prompt injection from K8s event messages**

`fetchK8sEventsStr` injects raw event messages into prompts verbatim. Sanitize before injection: strip any text that contains "ignore", "instructions", "system:" before including in the prompt.

---

## 5. DEPLOYMENT MODEL

### Current: Local Binary (correct for now)

```
Engineer laptop
├── ./kubegraf binary (~15MB static)
├── ~/.kubegraf/kubegraf.db (SQLite — auto-created)
└── Uses ~/.kube/config (any context)
```

No setup. No cloud. No agents. The binary embeds the full frontend via `go:embed`. This is the correct deployment model for a developer tool.

### When to Introduce a Server Model

The local model stays appropriate until one of these triggers:
- **Team wants a shared view** → shared database needed → need a server
- **Multi-cluster** → a central service that aggregates multiple agent reports
- **Orkas AI auth** → API key must live server-side, not on each laptop

Until then, do not add deployment complexity for its own sake.

### Future (after Orkas AI launch): Two deployment paths

```
Path A — Local with cloud AI:
  ./kubegraf binary + ORKAS_API_KEY env var
  All AI calls go to Orkas cloud, data stays local

Path B — Team server:
  kubegraf-server (Helm chart)
  All team members share one UI + one DB
  Orkas AI key configured once server-side
```

---

## 6. INCIDENT INTELLIGENCE ENGINE

### Current Capability (today, no AI)

```
Input:  incident pattern + resource identity
Output: graph causal chain (root cause, blast radius, causal path)
        + deterministic kubectl commands per failure pattern
        + confidence score from graph evidence
        + 5-minute snapshot cache for hot path
```

This is **graph-native incident intelligence** — no AI required. The causal chain engine already:
- Identifies root cause vs. symptom
- Calculates blast radius (affected downstream resources)
- Builds a deterministic remediation plan
- Provides confidence scores

### What Orkas AI Adds on Launch

```
Input:  same as above + Orkas AI API key
Output: everything above +
        natural language brief (2-3 sentences, what happened + why)
        AI-ranked fix recommendations with explanations
        conversational Q&A in the Orkas AI panel
        knowledge base RAG retrieval from runbooks
```

The AI is additive. The graph engine is the foundation.

### Evolution Path

```
Phase 1 (now): Graph suggests → human executes kubectl from UI
Phase 2 (Orkas AI launch): AI explains + suggests → human executes
Phase 3 (future): AI suggests based on past similar incidents
                  + outcome tracking (did the fix work?)
                  + patterns approved in the past auto-suggested with higher confidence
```

For Phase 3, the key missing component is outcome tracking: add `executed_at` and `outcome` (`resolved|failed|partial`) to the `remediation_decisions` table, and feed successful fixes back into the AI prompt as "PRIOR SUCCESSFUL FIXES" context.

---

## 7. PLATFORM RISKS

### Risk 1: Feature Accumulation in `package main`

```
gpu_detector.go, gpu_installer.go, gpu_metrics.go
feast_detector.go, feast_installer.go
mlflow_detector.go, mlflow_installer.go, mlflow_proxy.go
inference_creator.go, inference_manager.go, inference_portforward.go
brain_ml_predictions.go, brain_ml_summary.go
```

The binary installs Feast, manages GPUs, creates ML inference endpoints, proxies Kiali, MLflow — all in `package main`. These features share the same process as the incident intelligence engine. A bug in the GPU installer can (in theory) crash the incident engine. This is acceptable now. Worth splitting into domain packages (`ai/`, `graph/`, `incidents/`, `mlops/`) before the team grows.

### Risk 2: No Tests for the AI + Graph Pipeline

The AI fix pipeline and graph engine have no visible integration tests. `benchmark_test.go` exists but covers list operations, not the intelligence pipeline. When `extractJSONFromLLM` behavior changes with a new model (e.g., Orkas AI wraps JSON differently), it silently falls through to pattern fallbacks without anyone noticing. Add a test file for `extractJSONFromLLM` with representative LLM response examples.

### Risk 3: SQLite Write Lock During Cleanup

The hourly event cleanup goroutine (`CleanupOldEvents(7 * 24 * time.Hour)`) acquires a SQLite write lock. Any concurrent event inserts or remediation decision saves will block. At single user this is fine. If KubeGraf ever becomes a shared service, consider WAL mode (`PRAGMA journal_mode=WAL`) which allows concurrent readers during a write.

### Risk 4: Graph Engine Is Stateless at Restart

Restart clears the in-memory graph. For a large cluster, re-hydration takes 10-30 seconds during which graph-dependent endpoints return "graph engine not ready". In practice, the local binary restarts rarely. For a team server deployment, graph snapshots (written to SQLite periodically) would solve this.

---

## 8. THREE-PHASE ROADMAP

### Phase 1 — Harden Before AI Launch (now → Orkas AI launch)

| Task | Why |
|------|-----|
| Add `sync.Once` or mutex to `workspaceContextDB` global | Fix data race at concurrent startup |
| Make `AIAssistant` a singleton on `WebServer` | Eliminates per-request Ollama health check |
| Add SSE streaming to AI response handlers | No more 90s blocking spinner at launch |
| Add prompt injection sanitizer for K8s events | Security before AI goes live |
| Write tests for `extractJSONFromLLM` | Regression catch when Orkas AI format differs |
| Add event table index on `(namespace, name, timestamp)` | Prevent slow incident loading at scale |

### Phase 2 — AI Launch + Post-launch Polish

| Task | Why |
|------|-----|
| Activate Orkas AI provider (ORKAS_API_KEY wired up) | The primary unlock |
| AI response caching (5-min TTL, sha256 prompt key) | No duplicate calls, faster UX |
| Graph snapshot persistence (5-min SQLite writes) | Temporal queries, restart resilience |
| `executed_at + outcome` on `remediation_decisions` | Foundation for fix learning loop |
| Add AI-powered explanations to existing graph briefs | Upgrade what's already working |

### Phase 3 — Intelligence Platform

| Task | Why |
|------|-----|
| Fix learning loop (past fixes → prompt context) | AI improves with each resolved incident |
| Cross-incident similarity search | "We've seen this before" with evidence |
| Team server deployment (Helm chart) | Shared K8s workspace for a team |
| Agent/server split for multi-cluster | Each cluster has a lightweight agent |
| OIDC + RBAC for team server | Required before any shared deployment |

---

## 9. TOP 5 TECHNICAL INVESTMENTS

These are in priority order, timed to the Orkas AI launch.

### #1 — Graph Snapshot Persistence

**Why it's #1**: The graph engine's causal reasoning is the product's working differentiator *today*. Snapshots make it durable across restarts and unlock temporal queries ("what changed in the 30 minutes before this incident?"). This works with zero AI and is immediately useful.

**What to build**: `graph_snapshots` table in SQLite. Goroutine writes a snapshot every 5 minutes. On incident analysis, join against the last N snapshots to identify `status_changed_since`. Add a `changed_since` field to the causal chain API response. Wire it into the incident brief.

**Effort**: 2-3 days.

---

### #2 — `AIAssistant` as a WebServer Singleton

**Why**: Before Orkas AI launches, fix the per-request initialization bug. When the provider chain is active, every incident fix call makes a health check HTTP round trip before the actual query. This adds 50-200ms per request and can cause race conditions.

**What to build**: Add `ai *AIAssistant` to `WebServer`. Initialize in `main()`. Remove `newIncidentAIAssistant()` from handler bodies. Reference `ws.ai` directly. Add a circuit breaker: if the provider fails 3 times in a row, mark it unavailable for 1 minute before re-trying.

**Effort**: 2 hours.

---

### #3 — SSE Streaming for AI Responses

**Why**: The proxy (`handleOrkaProxy`) already has SSE flush logic. The built-in AI handlers (`handleIncidentFix`, `handleIncidentBrief`) are blocking — up to 90s spinner. Users should see tokens stream in, not wait for a full response. This is a launch-quality requirement for Orkas AI.

**What to build**: Add `stream: true` to Ollama calls. Pipe Orkas AI stream through to the browser. For the brief and fix handlers, send `data: {"chunk":"..."}` events, close with `data: [DONE]`. Frontend switches from `await fetch()` to `EventSource`.

**Effort**: 2-3 days.

---

### #4 — Incident Outcome Tracking (Fix Learning Loop Foundation)

**Why**: The `remediation_decisions` table already captures approve/reject. Add `executed_at` (when the kubectl command was actually run), `outcome` (`resolved|failed|partial`), and `actual_command` (what the engineer actually typed vs. what was suggested). This is the raw data the AI needs to improve recommendations over time. Start collecting it now so there is a training set when Phase 3 begins.

**What to build**: Extend `RemediationDecision` struct with the new fields. Add a `POST /api/graph/remediation/outcome` endpoint. Wire the FixExecutionModal to POST outcome after the kubectl command runs. The AI prompt already has a slot for "PRIOR SUCCESSFUL FIXES" — this feeds it.

**Effort**: 1-2 days (schema + backend). 2-3 days (frontend outcome capture).

---

### #5 — Event Table Index + Graph Engine Warm-Up

**Why**: Two small investments that compound. (a) The events table needs an index on `(namespace, resource_name, timestamp)` to keep incident detail loading fast as the table grows. (b) On startup, the graph engine should pre-hydrate in the background and serve a partial snapshot immediately rather than blocking until fully loaded.

**What to build**: (a) `CREATE INDEX IF NOT EXISTS idx_events_resource ON events(namespace, resource_name, timestamp DESC)`. (b) Return partial graph data (first 50 nodes by event recency) while full hydration completes in the background, with a `hydrating: true` flag on `/api/graph/status`.

**Effort**: 2-3 hours for (a), 1 day for (b).

---

## Summary Scorecard

| Dimension | Score | Note |
|-----------|-------|------|
| Core concept (graph-native incident intelligence) | 9/10 | Differentiated, working today |
| Local webapp UX | 8/10 | Single binary, instant start, no setup |
| AI layer readiness for launch | 7/10 | Provider chain ready, UX polish needed |
| Code structure | 6/10 | Package main monolith is manageable now |
| Data architecture (local) | 7/10 | SQLite right choice, schema mostly good |
| Security (local tool context) | 8/10 | No auth is correct for local single-user |
| Test coverage | 4/10 | AI/graph pipeline untested |
| Restart resilience | 5/10 | In-memory graph lost on restart |

**Bottom line**: The tool works and delivers real value today via graph-native incident intelligence. The AI layer is waiting for Orkas AI to launch — the UI already shows "Full AI capabilities will be available soon" in both the Orkas AI panel and the incident Fix tab. The five investments above are in priority order and timed to ensure a clean, fast AI launch experience.
