# KubeGraf — Full System Reference

> **Last updated**: 2026-03-01
> End-to-end reference: Go backend APIs, SolidJS frontend files, Orkas AI integration, UI↔API mapping, configs.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Go Backend — File Map](#2-go-backend--file-map)
3. [Go Backend — All API Routes](#3-go-backend--all-api-routes)
4. [SolidJS Frontend — File Map](#4-solidjs-frontend--file-map)
5. [SolidJS Frontend — Component Details](#5-solidjs-frontend--component-details)
6. [UI ↔ API Mapping](#6-ui--api-mapping)
7. [Orkas AI Integration](#7-orkas-ai-integration)
8. [Build & Run Reference](#8-build--run-reference)
9. [Configuration](#9-configuration)

---

## 1. Architecture Overview

```
┌──────────────────────────────────────────────────────────────────────────┐
│                    KubeGraf (default port 3003)                           │
│                                                                           │
│  ┌───────────────────────────────────────────────────────────────────┐   │
│  │                  SolidJS Frontend (browser)                        │   │
│  │                                                                    │   │
│  │  IntelligentWorkspace (root)                                       │   │
│  │   ├── HomeScreen          Cluster health, SLOs, incident list      │   │
│  │   ├── IncidentDetail      Deep-dive: timeline, fix, RCA, AI       │   │
│  │   ├── WorkloadScreen      Pods, deployments, statefulsets          │   │
│  │   ├── ContextGraphScreen  Service topology canvas graph            │   │
│  │   ├── WorkspacePanels     Metrics, GitOps, Cost panels             │   │
│  │   ├── OrkasAIPanel        Global AI assistant (Ask + Knowledge)   │   │
│  │   └── ContextNavigator    Sidebar: incident list, filters          │   │
│  └───────────────────────────────────────────────────────────────────┘   │
│                   │ HTTP REST + WebSocket (/ws)                           │
│  ┌────────────────▼──────────────────────────────────────────────────┐   │
│  │               Go Backend (web_server.go)                           │   │
│  │   400+ REST/WebSocket endpoints                                    │   │
│  │   Embeds web/dist via //go:embed (no separate web server)          │   │
│  └──────┬─────────────────────────┬─────────────────────────────────┘   │
│         │                         │                                       │
│  Kubernetes API             Ollama/OpenAI/Claude                         │
│  (client-go informers)      Built-in AI at /api/ai/*                    │
└──────────────────────────────────────────────────────────────────────────┘
               │  Direct HTTP from browser (localhost:8000)
               ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                  Orkas AI — FastAPI (port 8000)                           │
│   POST /ask  ·  GET /k8s/context  ·  POST /k8s/analyze                  │
│   POST /incident/fix  ·  POST /incident/rca                              │
│   POST /terraform/review  ·  POST /ingest/docs  ·  GET /models          │
│   RAG (Weaviate) · Session memory (Redis) · Multi-model LLM routing     │
└──────────────────────────────────────────────────────────────────────────┘
```

**Key facts:**
- Single Go binary serves both API and embedded frontend (`//go:embed web/dist`)
- Frontend calls KubeGraf's own `/api/*` for all K8s data and built-in AI
- Frontend calls **Orkas AI** (`localhost:8000`) directly from two components: `OrkasAIPanel` and `IncidentDetail`
- KubeGraf has its **own** built-in AI (`/api/ai/*`) using Ollama/OpenAI/Claude — separate from Orkas AI

---

## 2. Go Backend — File Map

| File | Responsibility |
|------|----------------|
| `main.go` | CLI entry, command dispatch |
| `web_server.go` | HTTP server setup, **all route registration**, middleware |
| `resources.go` | K8s resource list handlers (pods, deployments, services, etc.) |
| `operations.go` | Resource CRUD: update, delete, scale, restart |
| `events.go` | K8s events fetching |
| `event_handlers.go` | Event WebSocket broadcasting |
| `event_handlers_enhanced.go` | Enhanced event processing + grouping |
| `event_correlation.go` | Cross-resource event correlation engine |
| `event_storage.go` | SQLite event persistence |
| `event_storage.go` | SQLite event persistence |
| `web_event_grouped.go` | Grouped events API endpoint |
| `helpers.go` | Shared utilities: pod metrics, cost helpers, formatting |
| `graph.go` | Service topology graph builder |
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

---

## 3. Go Backend — All API Routes

> All registered in `web_server.go`. Served at `localhost:3003`.

### 3.1 Kubernetes Core Resources

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

### 3.2 Resource Detail Operations

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

### 3.3 Bulk Operations

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/deployments/bulk/restart` | Restart all deployments in namespace |
| `POST` | `/api/deployments/bulk/delete` | Delete all deployments in namespace |
| `POST` | `/api/statefulsets/bulk/restart` | Restart all statefulsets in namespace |
| `POST` | `/api/statefulsets/bulk/delete` | Delete all statefulsets |
| `POST` | `/api/daemonsets/bulk/restart` | Restart all daemonsets |
| `POST` | `/api/daemonsets/bulk/delete` | Delete all daemonsets |

### 3.4 Storage

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/storage/persistentvolumes` | List PVs |
| `GET` | `/api/storage/persistentvolumeclaims` | List PVCs |
| `GET` | `/api/storage/storageclasses` | List StorageClasses |
| `GET/PUT/POST` | `/api/storage/pv/{details,yaml,update,describe,delete}` | PV operations |
| `GET/PUT/POST` | `/api/storage/pvc/{details,yaml,update,describe,delete}` | PVC operations |
| `GET/PUT/POST` | `/api/storage/storageclass/{yaml,update,delete}` | StorageClass operations |

### 3.5 RBAC

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/rbac/roles` | List Roles |
| `GET` | `/api/rbac/rolebindings` | List RoleBindings |
| `GET` | `/api/rbac/clusterroles` | List ClusterRoles |
| `GET` | `/api/rbac/clusterrolebindings` | List ClusterRoleBindings |
| `GET/PUT/POST` | `/api/rbac/{resource}/{yaml,update,delete}` | RBAC resource operations |

### 3.6 Visualization & Topology

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/topology` | Service topology graph (nodes + edges for D3) |
| `GET` | `/api/resourcemap` | Resource dependency ASCII tree |
| `GET` | `/api/network/topology` | Network topology with traffic flow |
| `GET` | `/api/heatmap/pods` | Pod CPU/memory heatmap data |
| `GET` | `/api/heatmap/nodes` | Node capacity vs. utilization heatmap |
| `GET` | `/api/traffic/metrics` | Live pod-to-pod / service traffic bandwidth |

### 3.7 Metrics & Monitoring

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

### 3.8 Built-in AI (KubeGraf's own — uses Ollama / OpenAI / Claude)

> Separate from Orkas AI. Configured via `KUBEGRAF_OLLAMA_URL`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/ai/status` | AI provider availability (Ollama / OpenAI / Claude) |
| `POST` | `/api/ai/query` | Free-form AI query |
| `GET` | `/api/ai/analyze/pod` | AI analysis of a specific pod (`?namespace=X&name=Y`) |
| `POST` | `/api/ai/explain` | Explain a Kubernetes error message |

### 3.9 Diagnostics

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/diagnostics/run` | Run diagnostics (`?namespace=X&category=Y`) — security, reliability, performance |
| `GET` | `/api/diagnostics/categories` | List available diagnostic categories |

### 3.10 Cost Analysis

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/cost/cluster` | Cluster-wide monthly cost estimate (5 min cache) |
| `GET` | `/api/cost/namespace` | Namespace cost estimate |
| `GET` | `/api/cost/pod` | Pod cost estimate |
| `GET` | `/api/cost/deployment` | Deployment cost estimate (includes all replicas) |
| `GET` | `/api/cost/idle` | Idle / underutilized resource report |
| `GET` | `/api/cloud` | Detect cloud provider (GCP / AWS / Azure / Unknown) |

### 3.11 Drift Detection

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/drift/check` | Check config drift in namespace vs. stored state |
| `GET` | `/api/drift/namespace` | Drift summary for namespace (severity, count) |
| `GET` | `/api/drift/summary` | Cluster-wide drift summary |
| `POST` | `/api/drift/revert` | Revert resource to saved state |

### 3.12 Anomaly Detection

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/anomalies/detect` | Detect resource anomalies (CPU spikes, memory leaks) |
| `GET` | `/api/anomalies/stats` | Detection accuracy, false positive stats |
| `POST` | `/api/anomalies/remediate` | Auto-remediate detected anomaly |
| `GET` | `/api/anomalies/metrics` | Anomaly time series |
| `GET` | `/api/anomalies/scan-progress` | Background scan progress (%) |

### 3.13 ML Recommendations

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/ml/recommendations` | ML-based recommendations: right-size, security, scaling |
| `POST` | `/api/ml/recommendations/apply` | Apply a recommendation |
| `GET` | `/api/ml/recommendations/stats` | Applied rate, accuracy metrics |
| `GET` | `/api/ml/predict` | Predict future metric values (`?metric=cpu&resource=pod`) |

### 3.14 AutoFix Rules Engine

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/autofix/rules` | List AutoFix rules |
| `POST` | `/api/autofix/rules/toggle` | Enable / disable a rule (`?ruleId=X`) |
| `GET` | `/api/autofix/actions` | List completed auto-remediations (history) |
| `GET` | `/api/autofix/enabled` | Global AutoFix enabled/disabled status |

### 3.15 Incident Intelligence System (v2)

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

### 3.16 Security

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/security` | Full security analysis (RBAC gaps, pod security, network) |
| `GET` | `/api/vulnerabilities/scan` | Scan container images for CVEs |
| `POST` | `/api/vulnerabilities/refresh` | Re-scan images |
| `GET` | `/api/vulnerabilities/stats` | Vulnerability count by severity |

### 3.17 Multi-Cluster & Context

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v2/clusters` | List available clusters |
| `POST` | `/api/v2/clusters/switch` | Switch active cluster context (`?context=X`) |
| `GET` | `/api/v2/clusters/health` | Health of all clusters (latency, connectivity) |
| `POST` | `/api/v2/clusters/refresh` | Refresh cluster list from kubeconfig |
| `GET` | `/api/contexts` | List all K8s contexts from kubeconfig |
| `GET` | `/api/contexts/current` | Current active context |
| `POST` | `/api/contexts/switch` | Switch context (`?context=X`) |

### 3.18 Terminal & Execution

| Method | Path | Description |
|--------|------|-------------|
| `WS` | `/api/pod/terminal` | Interactive exec into pod (`?namespace=X&name=Y&container=Z`) |
| `GET` | `/api/pod/exec` | One-shot command execution in pod |
| `WS` | `/api/pod/logs` | Stream pod logs (`?namespace=X&name=Y&follow=true`) |
| `WS` | `/api/local/terminal` | Local terminal on kubegraf host |
| `GET` | `/api/terminal/shells` | Available shells (bash, sh, zsh) |
| `GET/POST` | `/api/terminal/preferences` | Terminal color scheme, font size |
| `WS` | `/api/execution/stream` | Stream execution output (`?id=X`) |
| `GET` | `/api/executions` | List execution history |
| `GET` | `/api/executions/logs` | Logs from a past execution (`?executionId=X`) |

### 3.19 Port Forwarding

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/portforward/start` | Start port-forward (`?type=pod&namespace=X&name=Y&localPort=8080&remotePort=80`) |
| `POST` | `/api/portforward/stop` | Stop session (`?id=X`) |
| `GET` | `/api/portforward/list` | List active port-forwards |

### 3.20 Brain / Intelligence

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/brain/timeline` | Historical analysis timeline (incidents, changes, anomalies) |
| `GET` | `/api/brain/oom-insights` | OOM killer analysis: killed pods, memory pressure timeline |
| `GET` | `/api/brain/summary` | Intelligence summary (patterns, trends) |
| `GET` | `/api/brain/ml/timeline` | ML-specific insights timeline |
| `GET` | `/api/brain/ml/predictions` | ML predictions (resource needs, incident probability) |
| `GET` | `/api/brain/ml/summary` | ML model accuracy, top predictions |
| `GET` | `/api/v2/intelligence/status` | Intelligence engine status (enabled? scanning?) |

### 3.21 Plugins & Integrations

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

### 3.22 ML Training & Inference

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

### 3.23 SRE Agent

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

### 3.24 Notifications & Announcements

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/notifications` | Notification list |
| `POST` | `/api/notifications/mark-read` | Mark notification as read |
| `POST` | `/api/notifications/mark-all-read` | Clear all notifications |
| `GET` | `/api/notifications/unread-count` | Unread count |
| `DELETE` | `/api/notifications/delete` | Delete notification |
| `GET` | `/api/announcements/status` | Announcement opt-in status |
| `POST` | `/api/announcements/opt-in` | Enable / disable announcements |

### 3.25 Custom Apps & Connectors

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/apps` | App marketplace |
| `GET` | `/api/apps/installed` | Installed apps |
| `POST` | `/api/apps/install` | Install app |
| `POST` | `/api/apps/uninstall` | Uninstall app |
| `GET/POST` | `/api/custom-apps/*` | Custom app CRUD (preview, deploy, list, update, restart, delete) |
| `GET/POST/DELETE` | `/api/connectors` | Connector CRUD (Jira, GitHub, Slack) |
| `GET/POST` | `/api/connectors/{id}` | Connector details and deletion |

### 3.26 Auth & System

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

## 4. SolidJS Frontend — File Map

**Root**: `ui/solid/src/`
**Build output**: `../../web/dist/` (embedded into Go binary)
**Build command**: `cd ui/solid && npm run build`

### 4.1 Workspace Components (`src/components/workspace/`)

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

### 4.2 Supporting Utilities (`src/components/workspace/`)

| File | Purpose |
|------|---------|
| `rcaReportGenerator.ts` | Generates structured RCA reports (Markdown / HTML export) |
| `fixSuccessPredictor.ts` | ML-ready fix success predictor (historical rate, severity factors) |
| `insightsEngine.ts` | Client-side pattern analysis — groups incidents, surfaces signals |
| `relatedIncidentsEngine.ts` | Similarity scoring (Jaccard on symptoms, namespace proximity) |
| `performanceUtils.ts` | Debounce, throttle, virtual list, memoisation helpers |
| `accessibilityUtils.ts` | WCAG 2.1 AA helpers — focus traps, ARIA live regions, keyboard nav |

### 4.3 Services (`src/services/`)

| File | Purpose |
|------|---------|
| `api.ts` | Central HTTP client — all `/api/*` calls to KubeGraf Go backend. No direct Orkas AI calls. |

### 4.4 Stores (`src/stores/`)

| File | State |
|------|-------|
| `cluster.ts` | `currentContext` — active K8s cluster context signal |
| `ai.ts` | KubeGraf's built-in AI provider status (`/api/ai/status`) — NOT Orkas AI |
| `incidents.ts` | Incident list, selected incident, filters |
| `settings.ts` | User preferences, theme, KubeGraf backend config |
| `notifications.ts` | Notification list, unread count |
| `metrics.ts` | Cluster metrics cache |

---

## 5. SolidJS Frontend — Component Details

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

## 6. UI ↔ API Mapping

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

## 7. Orkas AI Integration

### What's Currently Integrated

| Location | Feature | Endpoint | Notes |
|----------|---------|----------|-------|
| `OrkasAIPanel` → Ask tab | Free-form cluster Q&A | `POST /ask` | Session tracking, confidence, reasoning steps |
| `OrkasAIPanel` → Ask tab | Suggestion chips (6 presets) | `POST /ask` | Merged general + cluster analysis presets |
| `OrkasAIPanel` → Knowledge tab | RAG document ingestion | `POST /ingest/docs` | Runbook, K8s, Terraform, generic |
| `OrkasAIPanel` → header strip | Context + model info | `GET /k8s/context`, `GET /models` | Compact strip, not a separate tab |
| `IncidentDetail` → Fix tab | kubectl fix recommendations | `POST /incident/fix` | Risk badges, click-to-copy commands |
| `IncidentDetail` → Orkas widget | Incident-scoped chat | `POST /ask` | Pre-filled with incident context |

### Orkas AI Endpoints NOT Yet Used in UI

| Endpoint | Potential KubeGraf Use |
|---------|----------------------|
| `POST /incident/rca` | Full structured RCA report (vs. quick fix list) |
| `POST /terraform/review` | Review Terraform in GitOps panel |
| `POST /ingest/bulk` | Auto-sync KubeGraf runbooks to Orkas knowledge base |

### Architecture: Current vs. Planned

```
CURRENT (browser calls Orkas AI directly):
  Browser → POST http://localhost:8000/ask
  Browser → POST http://localhost:8000/incident/fix
  Browser → POST http://localhost:8000/ingest/docs

PLANNED (proxy via KubeGraf Go backend):
  Browser → POST /api/orka/ask → Go enriches with K8s data → POST :8000/ask
  Browser → POST /api/orka/incident/fix → Go enriches → POST :8000/incident/fix
  Benefits: context injection, no hardcoded port, caching, auth control
```

### Orkas AI Response Shape (from `/ask`)

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
    {"step": 2, "action": "Fetching pod status", "tool": "list_k8s_pods"}
  ],
  "model_used": "llama3.3:70b",
  "latency_ms": 2340.5,
  "session_id": "uuid4"
}
```

---

## 8. Build & Run Reference

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
```

---

## 9. Configuration

### KubeGraf — Built-in AI Provider

Configured via environment variables when running the kubegraf binary:

| Variable | Default | Description |
|----------|---------|-------------|
| `KUBEGRAF_OLLAMA_URL` | `http://127.0.0.1:11434` | Ollama server for built-in AI |
| `KUBEGRAF_OLLAMA_MODEL` | `llama3.1:latest` | Model for built-in AI queries |
| `KUBEGRAF_AI_AUTOSTART` | `false` | Auto-load model on startup |
| `OPENAI_API_KEY` | — | Enable OpenAI as built-in AI provider |
| `ANTHROPIC_API_KEY` | — | Enable Claude as built-in AI provider |

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

  orka-api:
    build: ../orka-ai
    ports: ["8000:8000"]
    environment:
      DEFAULT_MODEL_PROVIDER: groq        # or ollama / claude
      GROQ_API_KEY: ${GROQ_API_KEY}
    depends_on: [redis, weaviate, postgres, ollama]

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

## Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| **2-tab OrkasAIPanel** (Ask + Knowledge) | "Cluster" tab was a duplicate of Ask — same `/ask` call with preset prompts. Merged into Ask tab. |
| **No incident fix in OrkasAIPanel** | Incident fix lives exclusively in `IncidentDetail` right panel (Fix tab). Avoids duplication. |
| **Direct browser → Orkas AI** | Simple, no proxy latency. Trade-off: hardcoded `localhost:8000`, no context enrichment. Planned future: Go proxy layer. |
| **KubeGraf built-in AI ≠ Orkas AI** | `/api/ai/*` (KubeGraf) uses Ollama/OpenAI natively for simple queries. Orkas AI (`localhost:8000`) is richer with RAG, knowledge base, multi-model routing. |
| **Embedded frontend** | `//go:embed web/dist` — single binary, no separate web server, zero deployment complexity. |
| **SolidJS signals** | All state is reactive. Components are large but self-contained (e.g., `IncidentDetail` at 2166 lines owns all its data fetching inline). |
