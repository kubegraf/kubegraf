# pkg/incidents — SRE Intelligence Package

> **Last updated**: 2026-03-02
> Documents the `pkg/incidents` Go package: architecture, all sub-components, public API surface, and test structure.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Package Structure](#2-package-structure)
3. [Core Types](#3-core-types)
4. [Sub-components](#4-sub-components)
5. [Signal Pipeline](#5-signal-pipeline)
6. [Test Architecture](#6-test-architecture)
7. [CI / Coverage Configuration](#7-ci--coverage-configuration)
8. [Key Design Decisions](#8-key-design-decisions)

---

## 1. Overview

`pkg/incidents` is KubeGraf's SRE intelligence engine. It ingests raw Kubernetes signals (events, pod status, logs, metrics), correlates them into structured **Incidents**, enriches each incident with **Symptoms**, **Diagnoses**, **Runbooks**, and **Fix Recommendations**, and exposes a Manager API for the rest of the system to consume.

```
K8s cluster
  ├── events          ─┐
  ├── pod status       ├─▶ NormalizedSignal ─▶ Manager ─▶ Incident
  ├── container logs   |        ▲                │
  ├── metrics          ┘        │                ▼
  └── probes          signals.go        IncidentAggregator
                                          │
                           ┌──────────────┼──────────────┐
                           ▼              ▼              ▼
                       Symptoms      Diagnosis       Runbooks
                       symptoms.go   diagnosis.go    runbooks.go
                           │              │              │
                           └──────────────┼──────────────┘
                                          ▼
                                   Recommendations
                                   recommendations.go
```

**Module path**: `github.com/kubegraf/kubegraf/pkg/incidents`

---

## 2. Package Structure

```
pkg/incidents/
├── types.go                  Core domain types: Incident, Symptom, Diagnosis, …
├── patterns.go               FailurePattern enum + metadata (34 patterns)
├── signals.go                NormalizedSignal, SignalBatch, SignalSource constants
├── symptoms.go               Symptom types, SymptomDetector
├── diagnosis.go              PatternMatcher, DiagnosisGenerator, CalculateSeverity
├── aggregator.go             IncidentAggregator (in-memory store + dedup)
├── manager.go                Manager (orchestrates ingestion → aggregation)
├── runbooks.go               RunbookRegistry, Runbook, AutonomyLevel, CanAutoExecute
├── recommendations.go        RecommendationEngine, recommendation generators
├── fixes.go                  Fix types, deepCopy helpers
├── fix_actions.go            FixAction, workload reference helpers
├── fix_generators.go         Per-pattern kubectl fix generators
├── fix_handlers.go           HTTP fix execution handlers
├── evidence.go               EvidenceBuilder, EvidenceBundle
├── evidence_pack.go          EvidencePack (structured evidence for LLM context)
│   (hot_evidence_builder.go) Hot-path evidence builder
├── confidence_learning.go    ConfidenceLearner — Bayesian-inspired score learning
├── remediation_engine.go     RemediationEngine — plan generation + execution
├── autoremediation.go        AutoRemediationController — watch loop
├── intelligence_system.go    IntelligenceSystem — top-level orchestrator
├── intelligence_handlers.go  HTTP handlers wired to IntelligenceSystem
├── handlers.go               Legacy HTTP handlers
├── integration.go            Integration helpers (wires incidents into web server)
├── knowledge_bank.go         KnowledgeBank — runbook + pattern knowledge store
├── learning.go               LearningEngine — outcome tracking + model updates
├── log_analyzer.go           LogAnalyzer — pod log pattern extraction
├── matcher.go                Pattern matching helpers
├── snapshot.go               IncidentSnapshot — point-in-time serializable view
├── snapshot_cache.go         SnapshotCache — TTL-based snapshot cache
├── citations.go              Citation tracking for evidence attribution
└── feedback.go               FeedbackStore — human feedback on fixes/runbooks
```

**Total source**: ~19,700 lines across 30 files

---

## 3. Core Types

### `Incident`

Central domain object. Lives in `types.go`.

```go
type Incident struct {
    ID               string
    Fingerprint      string          // Stable hash: pattern + resource + symptoms
    Pattern          FailurePattern
    Severity         Severity        // critical | high | medium | low | info
    Status           IncidentStatus  // open | investigating | remediating | resolved
    Resource         KubeResourceRef
    RelatedResources []KubeResourceRef
    Title            string
    Description      string
    Occurrences      int
    FirstSeen        time.Time
    LastSeen         time.Time
    ClusterContext   string
    Symptoms         []*Symptom
    Diagnosis        *Diagnosis
    Recommendations  []*Recommendation
    Timeline         []TimelineEntry
    Signals          *IncidentSignals
}
```

Key methods:
| Method | Description |
|---|---|
| `IsActive() bool` | true if status is open or investigating |
| `Age() time.Duration` | time since FirstSeen |
| `BlastRadius() int` | count of directly + indirectly affected resources |
| `IncrementOccurrences()` | bumps Occurrences + updates LastSeen |
| `AddTimelineEntry(...)` | appends a timestamped entry to Timeline |
| `UpdateStatus(newStatus, reason)` | transitions status + adds timeline entry |

### `Severity`

```go
type Severity string
const (
    SeverityCritical Severity = "critical"
    SeverityHigh     Severity = "high"
    SeverityMedium   Severity = "medium"
    SeverityLow      Severity = "low"
    SeverityInfo     Severity = "info"
)
```

`Severity.Weight()` returns `4 / 3 / 2 / 1 / 0` — used for sorting.

### `FailurePattern`

34 named patterns in `patterns.go`:

```
PatternCrashLoop        PatternOOMPressure       PatternReadinessFailure
PatternLivenessFailure  PatternImagePullError    PatternNetworkPartition
PatternDNSFailure       PatternCertificateExpiring  PatternResourceExhaustion
PatternNodeNotReady     PatternNodePressure      PatternNodeUnreachable
PatternPVCBound         PatternPersistentVolumeFailure  PatternStorageExhaustion
PatternServiceDown      PatternIngressFailure    PatternSchedulingFailure
PatternHPAScaling       PatternPDBBlocking       PatternRBACDenied
PatternSecretMissing    PatternConfigMapMissing  PatternHighLatency
PatternHighErrorRate    PatternHighCPU           PatternHighMemory
PatternDeploymentStalled  PatternStatefulSetPartitioned  PatternJobFailed
PatternCronJobMissed    PatternControllerError   PatternUnknown
PatternAPIServerDegraded
```

Each pattern has:
- `String()` — human-readable label
- `Category()` — groups into: Application, Infrastructure, Node, Scheduling, Security, HealthCheck, Certificate

### `KubeResourceRef`

```go
type KubeResourceRef struct {
    Kind      string
    Name      string
    Namespace string
    UID       string
    Labels    map[string]string
}
func (r KubeResourceRef) String() string  // "Kind/namespace/name"
```

### `NormalizedSignal`

Unified signal type produced by all collectors (`signals.go`):

```go
type NormalizedSignal struct {
    ID         string
    Source     SignalSource
    Timestamp  time.Time
    Resource   KubeResourceRef
    Message    string
    Severity   string
    Attributes map[string]string
}
```

`SignalSource` constants: `SourceKubeEvent`, `SourcePodLog`, `SourcePodStatus`, `SourceMetric`, `SourceProbe`, `SourceController`

Methods: `SetAttribute(k,v) *NormalizedSignal`, `GetAttribute(k) string`, `HasAttribute(k) bool`

---

## 4. Sub-components

### IncidentAggregator (`aggregator.go`)

In-memory store with dedup by Fingerprint and multi-cluster isolation.

```go
agg := incidents.NewIncidentAggregator(incidents.DefaultAggregatorConfig())

agg.InjectIncident(inc)                         // inject pre-built incident
agg.UpsertScannedIncident(inc)                  // insert or merge by fingerprint
agg.GetIncident(id) *Incident
agg.GetAllIncidents() []*Incident
agg.GetActiveIncidents() []*Incident
agg.GetIncidentsByPattern(p) []*Incident
agg.GetIncidentsByNamespace(ns) []*Incident
agg.GetIncidentsBySeverity(sev) []*Incident
agg.GetSummary() AggregatorSummary
agg.UpdateIncidentStatus(id, status, reason) error
agg.SuppressIncident(id) error
agg.ResolveIncident(id) error
agg.SetCurrentClusterContext(cluster)
agg.ClearIncidentsByCluster(cluster)
agg.ClearIncidentsFromOtherClusters(keep)
agg.RegenerateRecommendations(registry) error
```

### Manager (`manager.go`)

Orchestrates the full signal → incident pipeline.

```go
m := incidents.NewManager(incidents.DefaultManagerConfig())
m.SetClusterContext("prod-gke")
m.IngestSignal(signal)         // non-blocking, drops if buffer full
m.RegisterCallback(func(inc *Incident) {})
m.GetIncident(id) *Incident
m.GetAllIncidents() []*Incident
m.GetActiveIncidents() []*Incident
m.InjectIncident(inc)          // for testing / manual injection
```

### PatternMatcher + DiagnosisGenerator (`diagnosis.go`)

```go
pm := incidents.NewPatternMatcher()
match := pm.MatchBest(symptoms)  // *PatternMatch{Pattern, Confidence}

dg := incidents.NewDiagnosisGenerator()
diag := dg.GenerateDiagnosis(resource, match, symptoms)
// Returns *Diagnosis{Summary, RootCause, Confidence, Recommendations}

incidents.CalculateSeverity(pattern, symptoms, occurrences) Severity
incidents.SortDiagnosesBySeverity(diagnoses)  // sorts by Confidence desc
```

### RunbookRegistry (`runbooks.go`)

```go
r := incidents.NewRunbookRegistry()  // pre-registered default runbooks

r.Register(rb *Runbook)
r.Get(id) *Runbook
r.GetByPattern(p) []*Runbook       // only enabled runbooks
r.GetAll() []*Runbook
r.CanAutoExecute(rb, inc, confidence float64) bool
```

`CanAutoExecute` gates on: `Enabled`, `AutonomyLevel == AutonomyAutoExecute`, `Risk <= RiskRunbookMedium`, `SuccessRate >= 0.9`, `confidence >= 0.9`, `Rollback != nil`.

`AutonomyLevel` values: `AutonomyObserve`, `AutonomyRecommend`, `AutonomyPropose`, `AutonomyAutoExecute`

### SymptomDetector (`symptoms.go`)

```go
d := incidents.NewSymptomDetector()
symptoms := d.DetectFromSignalBatch(batch *SignalBatch) []*Symptom
```

`SymptomType` constants (selected):

| Constant | Meaning |
|---|---|
| `SymptomCrashLoopBackOff` | Container restart loop detected |
| `SymptomExitCodeOOM` | OOM kill (exit 137) |
| `SymptomHighRestartCount` | Restart count above threshold |
| `SymptomImagePullFailure` | ImagePullBackOff / ErrImagePull |
| `SymptomPodPending` | Pod stuck in Pending phase |
| `SymptomReadinessProbeFailure` | Readiness probe failing |
| `SymptomHTTP5xxErrors` | High rate of 5xx responses |
| `SymptomDNSResolutionFailure` | DNS lookup failures in logs |

### RemediationEngine (`remediation_engine.go`)

Generates and executes kubectl-based remediation plans.

```go
eng := incidents.NewRemediationEngine(config)
plan := eng.GeneratePlan(inc *Incident) *RemediationPlan
eng.Execute(plan) error
```

Plans are gated by: `hasSufficientEvidence`, `calculateConfidence`, and risk thresholds.

### ConfidenceLearner (`confidence_learning.go`)

Bayesian-inspired learner that adjusts pattern-match confidence over time based on feedback outcomes.

```go
cl := incidents.NewConfidenceLearner()
cl.RecordOutcome(pattern, outcome FeedbackOutcome)
score := cl.GetScore(pattern) float64
```

Internally maintains per-cause priors and per-feature weights, updated via `setCausePrior` and `setFeatureWeight`.

---

## 5. Signal Pipeline

End-to-end flow from raw K8s data to actionable incident:

```
1. Collector           Raw K8s event / pod status / log line
       │
       ▼
2. signals.go          NormalizedSignal (unified schema)
   GenerateSignalID()  Deterministic ID: sig-{source}-{hash}-{timestamp}
   NewNormalizedSignal()
       │
       ▼
3. SignalBatch          Group signals by collection window + cluster
   NewSignalBatch(cluster)
   batch.Add(signal)
   batch.GroupByResource()   → map[resourceKey][]*NormalizedSignal
   batch.FilterBySource(src) → []*NormalizedSignal
       │
       ▼
4. SymptomDetector      DetectFromSignalBatch() → []*Symptom
       │
       ▼
5. PatternMatcher       MatchBest(symptoms) → *PatternMatch{Pattern, Confidence}
       │
       ▼
6. DiagnosisGenerator   GenerateDiagnosis() → *Diagnosis
       │
       ▼
7. IncidentAggregator   UpsertScannedIncident() — dedup by fingerprint
                         GenerateFingerprint(pattern, resource, symptoms)
       │
       ▼
8. RunbookRegistry      GetByPattern() → matching runbooks
   CanAutoExecute()     → gate on risk + confidence + autonomy level
       │
       ▼
9. RecommendationEngine GenerateRecommendations() → []*Recommendation
       │
       ▼
10. Manager callbacks   Notify registered subscribers (UI, alert sinks, …)
```

---

## 6. Test Architecture

Tests are split into two layers following Go convention:

### White-box tests (`pkg/incidents/*_test.go`)

Package declaration: `package incidents` — same package as source, accesses unexported symbols.

| File | Tests | Unexported symbols accessed |
|---|---|---|
| `symptom_detector_test.go` | 661 lines, SymptomDetector internals | `containsAny`, `contains`, `toLower` |
| `fixes_test.go` | 533 lines, Fix deep-copy helpers | `deepCopyMap`, `deepCopySlice`, `setNestedValue` |
| `confidence_learning_test.go` | 529 lines, ConfidenceLearner internals | `setCausePrior`, `getCausePrior`, `setFeatureWeight`, `getFeatureWeights` |
| `fix_actions_test.go` | 405 lines, FixAction builder | `getWorkloadRef`, `getRiskFromFix`, `matchesRecommendation`, `fixToAction` |
| `remediation_engine_test.go` | 404 lines, RemediationEngine gates | `hasSufficientEvidence`, `calculateConfidence`, `containsSubstring` |
| `evidence_pack_test.go` | 315 lines, EvidencePack helpers | `min()` helper |
| `recommendations_test.go` | 243 lines, RecommendationEngine | `e.generators` (unexported field) |
| `symptoms_test.go` | 192 lines, SymptomDetector thresholds | `d.highRestartThreshold`, `d.http5xxThreshold` |
| `evidence_test.go` | 107 lines, EvidenceBuilder | `b.maxEventsPerSource`, `b.relevanceThreshold` |

**Total white-box**: 9 files, ~3,389 lines

### Black-box tests (`test/incidents/*_test.go`)

Package declaration: `package incidents_test` — external package, imports `"github.com/kubegraf/kubegraf/pkg/incidents"`. Only uses exported API.

| File | Key coverage areas |
|---|---|
| `aggregator_test.go` | `NewIncidentAggregator`, `ProcessSignals`, `GetAllIncidents`, `GetActiveIncidents`, `InjectIncident`, `SetCurrentClusterContext`, `ClearIncidentsByCluster`, `GetIncidentsBySeverity` |
| `aggregator_ext_test.go` | `GetIncidentsByPattern`, `GetIncidentsByNamespace`, `GetSummary`, `UpdateIncidentStatus`, `SuppressIncident`, `ResolveIncident`, `ClearIncidentsFromOtherClusters`, `UpsertScannedIncident`, dedup, `RegenerateRecommendations` |
| `types_test.go` | `Severity.Weight()`, `KubeResourceRef.String()`, `IncidentSignals`, `Incident` lifecycle methods, `GenerateFingerprint`, `GenerateIncidentID`, `IncidentStatus` constants |
| `patterns_test.go` | All 34 `FailurePattern` constants (non-empty, unique), `String()`, `Category()`, `AllPatterns()`, `GetPatternMetadata()` |
| `diagnosis_test.go` | `CalculateSeverity`, `NewDiagnosisGenerator`, `GenerateDiagnosis`, `SortDiagnosesBySeverity`, `NewPatternMatcher`, `MatchBest` |
| `runbooks_test.go` | `AutonomyLevel.String()`, `NewRunbookRegistry`, `Register/Get`, `GetByPattern`, `GetAll`, all `CanAutoExecute` conditions |
| `manager_test.go` | `DefaultManagerConfig`, `NewManager`, `SetClusterContext`, `InjectIncident`, `GetIncident`, `GetAllIncidents`, `GetActiveIncidents`, `RegisterCallback`, `IngestSignal` |
| `signals_test.go` | `GenerateSignalID`, `NewNormalizedSignal`, `SetAttribute/GetAttribute/HasAttribute`, `SignalSource` constants, `NewSignalBatch`, `Add/Size/GroupByResource/FilterBySource`, attribute key constants |

**Total black-box**: 8 files, ~1,987 lines

### Why two locations?

Go's test system constrains test placement:

- Tests for **unexported** functions/fields/methods **must** use `package foo` (same directory as source)
- Tests that only use **exported** symbols can use `package foo_test` (any directory, as long as they import the package)
- Keeping black-box tests in `test/incidents/` makes the public API contract explicit and mirrors how external consumers use the package

```
test/
└── incidents/         ← black-box: public API tests (package incidents_test)
pkg/
└── incidents/
    ├── *.go           ← source
    └── *_test.go      ← white-box: unexported-symbol tests (package incidents)
```

---

## 7. CI / Coverage Configuration

Defined in `.github/workflows/ci.yml`:

### Test job command

```yaml
- name: Test with coverage
  env:
    CGO_ENABLED: 0
  run: go test -coverprofile=coverage.out -covermode=atomic -coverpkg=./... ./...
```

**Why `-coverpkg=./...`?**
Without this flag, tests in `test/incidents/` (a separate Go package) would only instrument their own package — they would NOT count toward `pkg/incidents` coverage. The `-coverpkg=./...` flag tells Go to instrument **all packages** when running **any** test package, so cross-package test coverage is correctly attributed.

**Why `CGO_ENABLED=0`?**
KubeGraf uses a pure-Go SQLite driver. Setting `CGO_ENABLED=0` ensures reproducible builds across Linux/macOS/Windows CI runners without C toolchain dependencies. The `-race` detector requires CGO and is therefore omitted.

### Coverage gate

```yaml
THRESHOLD=10.0
if [ "$(echo "$COVERAGE < $THRESHOLD" | bc -l)" = "1" ]; then
  echo "❌ Coverage ${COVERAGE}% is below ${THRESHOLD}% threshold"
  exit 1
fi
```

Current total coverage: **7.7%** (being actively raised to meet the 10% gate).

### Jobs overview

| Job | Depends on | What it does |
|---|---|---|
| `ui` | — | `npm ci && npm run build` in `ui/solid/`, uploads `web/dist` artifact |
| `lint` | `ui` | `go vet ./...` + `golangci-lint` |
| `build` | `ui` | Cross-compiles 6 binaries (linux/darwin/windows × amd64/arm64) |
| `test` | `ui` | Runs all tests with coverage, gates at 10% |

---

## 8. Key Design Decisions

### Fingerprint-based dedup

Incidents are identified by a stable `Fingerprint` derived from `(pattern, resource, top-N symptom types)` hashed with SHA-256. This means the same underlying failure re-opening after resolution re-uses the same ID prefix rather than creating a duplicate incident.

### Autonomy ladder for auto-remediation

The `AutonomyLevel` enum (`observe → recommend → propose → auto_execute`) enforces a human-in-the-loop gradient. `CanAutoExecute` gates on all five conditions simultaneously — any single failed condition blocks automated execution. This prevents runaway automation in production clusters.

### `-coverpkg=./...` for cross-package coverage

Moving black-box tests to `test/incidents/` would have silently dropped coverage if the CI command hadn't been updated. The `-coverpkg=./...` flag was added at the same time as the test migration to ensure the two changes remained consistent.

### White-box tests stay in source directory

Go does not support `package foo` test files in a different directory than `package foo` source files. Tests that access unexported symbols (`deepCopyMap`, `containsAny`, internal thresholds, etc.) remain co-located with source in `pkg/incidents/`. This is intentional and correct — it is the only way Go allows testing private implementation details.

### `CGO_ENABLED=0` throughout

All Go build and test commands set `CGO_ENABLED=0` to keep the binary statically linked and dependency-free. This applies to all CI jobs including lint (`go vet`) and test.
