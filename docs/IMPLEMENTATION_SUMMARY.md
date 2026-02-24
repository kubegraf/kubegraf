# Unique Incident Intelligence Workspace — Implementation Summary

**Branch:** `feature/unique-incident-intelligence-workspace`
**PR:** [#169](https://github.com/kubegraf/kubegraf/pull/169)
**Date:** February 2026

---

## Overview

This feature replaces the previous multi-layout investigation UI with a unified, screen-based **Incident Intelligence Workspace** for KubeGraf. It also fixes two root-cause bugs that prevented real cluster incidents from appearing, and cleans up demo data so it no longer pollutes live views.

---

## What Was Implemented

### 1. New Frontend Workspace Screens

All legacy layout components (`HighConfidenceLayout`, `InvestigationLayout`, `InvestigationWorkspace`, `IncidentStory`, `IntelligenceAssistant`) were replaced with a screen-based architecture:

| File | Description |
|------|-------------|
| `HomeScreen.tsx` | Cluster overview — health ring (canvas), SLO burn rates, active incident list, multi-cluster grid |
| `IncidentDetail.tsx` | Full incident view — timeline, symptoms, AI recommendations, fix execution, RCA export |
| `WorkloadScreen.tsx` | Workload-centric view — deployments, pods, resource utilisation |
| `ContextGraphScreen.tsx` | Dependency graph — service-to-service relationships and blast radius |
| `WorkspacePanels.tsx` | Panel orchestrator — splits the workspace into sidebar + main content area |
| `IntelligentWorkspace.tsx` | Root workspace container — owns screen routing and incident selection state |
| `ContextNavigator.tsx` | Sidebar — incident list grouped by namespace, SLO status, filters, **Demo section** |
| `SkeletonLoader.tsx` | Loading skeletons for all major panels |
| `ErrorBoundary.tsx` | SolidJS error boundaries wrapping each screen |

**Supporting utilities added:**

| File | Description |
|------|-------------|
| `performanceUtils.ts` | Debounce, throttle, virtual list helpers, memoisation utilities |
| `insightsEngine.ts` | Client-side pattern analysis — groups incidents by type, surfaces cross-cutting signals |
| `relatedIncidentsEngine.ts` | Similarity scoring — Jaccard on symptom types + namespace/resource proximity |
| `fixSuccessPredictor.ts` | ML-ready success predictor — historical rate, recency, severity, resource pressure factors |
| `rcaReportGenerator.ts` | Generates structured RCA reports exportable as Markdown or HTML |
| `accessibilityUtils.ts` | WCAG 2.1 AA helpers — focus traps, ARIA live regions, keyboard navigation |

---

### 2. Demo Incident Separation

**Problem:** 18 demo incidents were always injected regardless of whether a real cluster was connected, completely hiding real incidents.

**Fix:**

- `ensureDemoIncidents()` now returns early when `clientset != nil && connected`:
  ```go
  if ii.app.clientset != nil && ii.app.connected {
      log.Printf("[ensureDemoIncidents] Skipping - connected to real cluster")
      return
  }
  ```
- Demo incidents reduced from **18 → 2** (CrashLoop + OOM Kill).
- Both remaining demo incidents are tagged `"is_demo": true` in their `Metadata` map.

**Frontend sidebar (`ContextNavigator.tsx`):**

- Real incidents appear grouped by Kubernetes namespace at the top.
- A clearly labelled **"Demo"** section (purple star icon + count badge) appears at the bottom for `metadata.is_demo === true` incidents.
- Demo rows are visually dimmed (opacity 0.75) and show a purple `DEMO` label instead of resource kind.
- Demo incidents remain fully clickable and navigate to their detail view normally.

---

### 3. Real Incident Detection Fix

**Problem:** Non-pod resources (nodes, services, deployments, jobs, PVCs) never produced incidents because `scanAndIngestIncidents` was creating `SourceKubeEvent` signals without the required `AttrEventReason` / `AttrEventType` attributes, causing `detectFromEventSignal` to return `nil` immediately.

**Fix — `makeScanIncident` helper** (`web_incidents_v2.go`):

```go
func (ii *IncidentIntelligence) makeScanIncident(
    pattern incidents.FailurePattern,
    resource incidents.KubeResourceRef,
    severity incidents.Severity,
    title, description string,
    symptomType incidents.SymptomType,
    clusterCtx string,
) *incidents.Incident
```

Builds a complete `Incident` with a deterministic fingerprint so re-scans update rather than duplicate.

**Fix — `UpsertScannedIncident`** (`pkg/incidents/aggregator.go`, `manager.go`):

```go
func (a *IncidentAggregator) UpsertScannedIncident(incident *Incident) {
    // If fingerprint exists → bump LastSeen + Occurrences
    // Otherwise → insert new incident
}
```

**Resources now creating real incidents:**

| Resource | Condition | Pattern | Severity |
|----------|-----------|---------|----------|
| Node | `NotReady` | `NODE_NOT_READY` | Critical |
| Node | Memory/Disk/PID pressure | `NODE_PRESSURE` | High / Critical |
| Service | No ready endpoints | `NO_READY_ENDPOINTS` | High |
| Deployment | 0 of N replicas ready | `NO_READY_ENDPOINTS` | Critical |
| Deployment | Partial replicas ready | `RESTART_STORM` | Medium |
| Job | `Failed` condition | `APP_CRASH` | High |
| PVC | `Pending` for > threshold | `RESOURCE_EXHAUSTED` | Medium |

---

### 4. Backend API Endpoints

**`web_intelligence_api.go`** — Intelligence Workspace API (`/api/v2/workspace/…`):

| Route | Handler | Description |
|-------|---------|-------------|
| `GET /api/v2/workspace/insights` | `handleWorkspaceInsights` | Cross-incident pattern analysis and recommendations |
| `GET /api/v2/incidents/{id}/story` | `handleIncidentStory` | NLP-style narrative of an incident's lifecycle |
| `GET /api/v2/incidents/{id}/related` | `handleRelatedIncidents` | Similar incidents ranked by similarity score |
| `POST /api/v2/incidents/{id}/predict-fix` | `handlePredictSuccess` | ML-ready fix success probability |
| `POST /api/v2/incidents/{id}/execute-fix` | `handleExecuteFix` | Execute a recommended fix with dry-run / live mode |
| `GET /api/v2/incidents/{id}/rca` | `handleGenerateRCA` | Generate a full Root Cause Analysis report |

**`web_resource_apply.go`**:

| Route | Handler | Description |
|-------|---------|-------------|
| `POST /api/v2/resources/apply` | `handleYAMLApply` | Apply arbitrary YAML to the cluster (server-side `kubectl apply`) |

---

### 5. Supporting Backend Changes

- **`web_misc.go`** — Additional cluster info and metrics endpoints used by `HomeScreen`.
- **`web_server.go`** — Registers `RegisterIntelligenceWorkspaceRoutes()` and `RegisterIncidentIntelligenceRoutes()` on startup.
- **`pkg/incidents/types.go`** — Minor type additions for new symptom/pattern constants.

---

## Architecture Diagram

```
Browser (SolidJS)
│
├── IntelligentWorkspace          ← root, owns screen + incident selection state
│   ├── ContextNavigator          ← sidebar: real incidents (by ns) + Demo section
│   └── WorkspacePanels           ← main area
│       ├── HomeScreen            ← default view: health ring, SLOs, cluster grid
│       ├── IncidentDetail        ← selected incident: timeline, AI, fix, RCA
│       ├── WorkloadScreen        ← workload resource table
│       └── ContextGraphScreen    ← dependency graph
│
Go Backend (net/http)
│
├── /api/v2/incidents/*           ← CRUD, filtering, actions, recommendations
├── /api/v2/workspace/insights    ← cross-incident intelligence
├── /api/v2/incidents/{id}/story  ← incident narrative
├── /api/v2/incidents/{id}/rca    ← root cause analysis
├── /api/v2/incidents/{id}/related
├── /api/v2/resources/apply       ← YAML apply
│
pkg/incidents/
├── Manager                       ← owns aggregator + intelligence system
├── IncidentAggregator            ← fingerprint-based incident store
│   └── UpsertScannedIncident()   ← dedup for periodic scans
├── IntelligenceSystem            ← signal processing pipeline
└── KnowledgeBank                 ← pattern library + fix registry
```

---

## Key Design Decisions

1. **Fingerprint-based dedup** — `GenerateFingerprint(pattern, resource, symptoms)` produces a deterministic hash so re-scans every 2 minutes update existing incidents instead of creating duplicates.

2. **`UpsertScannedIncident` vs `IngestSignal`** — The signal pipeline requires `AttrEventReason`/`AttrEventType` attributes which periodic scans don't have. Direct upsert bypasses the signal pipeline while still respecting the same fingerprint/ID scheme.

3. **Demo-only mode** — Demo incidents are injected only when no real cluster is connected. The `demoIncidentsContext` field prevents re-injection on every 2-minute scan cycle.

4. **Screen-based navigation** — Rather than switching CSS layouts, each "view" is a separate component that mounts/unmounts. This keeps each screen's state isolated and makes adding new screens straightforward.

---

## Files Changed

### Backend (Go)

| File | Change |
|------|--------|
| `web_incidents_v2.go` | `makeScanIncident`, `ensureDemoIncidents` (2 demos, real-cluster guard), `scanAndIngestIncidents` (UpsertScannedIncident for non-pod resources) |
| `web_intelligence_api.go` | New file — 7 workspace API handlers, story/RCA/related/predict generators |
| `web_resource_apply.go` | New file — YAML apply handler |
| `web_misc.go` | Additional cluster info endpoints |
| `web_server.go` | Route registration |
| `pkg/incidents/aggregator.go` | `UpsertScannedIncident` |
| `pkg/incidents/manager.go` | `UpsertScannedIncident` wrapper |
| `pkg/incidents/types.go` | Minor type additions |

### Frontend (SolidJS / TypeScript)

| File | Change |
|------|--------|
| `IntelligentWorkspace.tsx` | Rebuilt — screen routing, incident selection |
| `ContextNavigator.tsx` | Rebuilt — real/demo section split, SLO widget, filters |
| `HomeScreen.tsx` | New — cluster health ring, SLO burn rates, incident list, cluster grid |
| `IncidentDetail.tsx` | New — full incident detail with timeline, AI panel, fix modal, RCA |
| `WorkloadScreen.tsx` | New — workload resource list |
| `ContextGraphScreen.tsx` | New — dependency graph placeholder |
| `WorkspacePanels.tsx` | New — panel layout orchestrator |
| `SkeletonLoader.tsx` | Rebuilt — skeletons for all panels |
| `ErrorBoundary.tsx` | New — SolidJS error boundaries |
| `performanceUtils.ts` | New — debounce, throttle, virtual list |
| `insightsEngine.ts` | New — client-side pattern grouping |
| `relatedIncidentsEngine.ts` | New — incident similarity scoring |
| `fixSuccessPredictor.ts` | New — fix success probability |
| `rcaReportGenerator.ts` | New — RCA Markdown/HTML export |
| `accessibilityUtils.ts` | New — WCAG 2.1 AA helpers |
| `workspace.css` | Overhauled — new screen layouts, demo section styles |
| `Incidents.tsx` (route) | Updated — mounts IntelligentWorkspace |
| `api.ts` | Added workspace + intelligence API methods |
| `index.ts` | Updated exports |
| `Header.tsx` | Minor updates |
| `index.html` | Minor updates |

### Tests & Docs

| File | Description |
|------|-------------|
| `web_intelligence_api_test.go` | Integration tests for all 7 workspace API endpoints |
| `test/intelligence_integration_test.go` | End-to-end integration tests |
| `test/TESTING.md` | Testing guide |
| `docs/design/UNIQUE_INCIDENT_INTELLIGENCE_UI.md` | UI/UX design spec |
| `docs/INTELLIGENCE_WORKSPACE_COMPLETE.md` | Previous implementation summary |
| `ui/solid/src/components/workspace/README.md` | Component-level documentation |
| `ui/solid/src/components/workspace/CHANGELOG.md` | Workspace changelog |

---

## Running Locally

```bash
# Build frontend
cd ui/solid && npm run build
cp -r dist ../web/

# Build and start backend (port 3003)
go build -o kubegraf .
./kubegraf web --port=3003
```

Server starts at `http://127.0.0.1:3003`.

- **With real cluster:** demo incidents are suppressed; real incidents surface from nodes, pods, services, deployments, jobs, and PVCs.
- **Without cluster:** 2 demo incidents (CrashLoop + OOM) appear in the sidebar **Demo** section.
