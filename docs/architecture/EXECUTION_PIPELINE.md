## Execution Panel & Streaming Execution Pipeline

This document describes the new **Execution Panel**, the **streaming execution pipeline**, and the **APIs** that power live “apply YAML” operations against Kubernetes clusters.

It is intended for:

- Contributors adding new execution flows (e.g., new resource editors, wizards, or automation).
- Operators who want to understand what’s happening when they click “Apply YAML”.

---

## 1. High‑Level Architecture

- **Frontend (SolidJS)**
  - `ExecutionPanel` (`ui/solid/src/components/ExecutionPanel.tsx`) is a docked, collapsible panel that shows:
    - High‑level **status**: `planned → running → succeeded/failed`.
    - **Live log stream** (monospace, auto‑scroll with manual override).
    - **Phase events** (e.g., “Validating manifest…”, “Applying resources…”).
    - **Execution summary**: duration, exit code, and resource change counts.
    - **Dry‑run badge** and “no changes persisted” messaging when applicable.
    - **Retry** and **Cancel** actions where appropriate.
  - `executionPanel` store (`ui/solid/src/stores/executionPanel.ts`) exposes:
    - `startExecution(options: StartExecutionOptions)`
    - `cancelExecution(executionId: string)`
    - `autoReattachMostRecentRunning()`
    - `loadRecentExecutions()` / `loadExecutionLogs(executionId)`

- **Backend (Go)**
  - `WebSocket` endpoint: `GET /api/execution/stream` (`handleExecutionStream` in `web_execution.go`).
  - Execution runtime:
    - For generic shell commands: `exec.Command(...)` + streaming stdout/stderr.
    - For **Kubernetes “apply YAML”**: `runApplyYAMLExecution(...)` using `k8s.io/client-go` (no `kubectl` binary).
  - **Persistence & reattach**:
    - `ExecutionRecord` map + log buffers in memory.
    - HTTP APIs for listing past executions and fetching buffered logs.
  - **Security**:
    - `authorizeExecution(...)` enforces namespace scoping, cluster‑wide guardrails, and optional IAM/RBAC checks for Kubernetes‑equivalent operations.
    - Server‑side **secret redaction** applied to every streamed line.

---

## 2. Frontend API: `startExecution(...)`

Defined in `ui/solid/src/stores/executionPanel.ts` as `StartExecutionOptions`. The core fields used by “Apply YAML” flows are:

```ts
startExecution({
  executionId?: string;           // Optional; auto-generated if omitted
  label: string;                  // Human-readable label for the panel
  command: string;                // "__k8s-apply-yaml" for K8s apply flows
  args?: string[];                // Usually [] for apply-yaml
  mode: 'apply' | 'dry-run';      // ExecutionMode on the backend
  kubernetesEquivalent?: boolean; // true for K8s/Helm-like operations

  // K8s metadata for security and auditing:
  namespace?: string;             // Required unless allowClusterWide=true
  context?: string;               // Current kube-context / cluster name
  userAction?: string;            // e.g. "deployments-apply-yaml"
  dryRun?: boolean;               // Semantic dry-run flag (in addition to mode)
  allowClusterWide?: boolean;     // Required for cluster-scoped resources
  resource?: string;              // Logical resource (deployments, pods, namespaces, etc.)
  action?: string;                // "create" | "update" | "delete" | "scale" ...
  intent?: string;                // e.g. "apply-yaml"

  // For apply-yaml intent:
  yaml?: string;                  // Raw manifest as a string
});
```

**Usage pattern for YAML editors** (e.g., `Deployments.tsx`, `Services.tsx`, `ConfigMaps.tsx`, `Secrets.tsx`, `Pods.tsx`, `Namespaces.tsx`, etc.):

1. Validate that `yaml.trim().length > 0`.
2. Ensure `clusterStatus().connected` is `true` and capture `clusterStatus().context`.
3. Determine `namespace` (or leave empty and set `allowClusterWide: true` for cluster‑scoped resources like Namespaces, PVs, StorageClasses, ClusterRoles).
4. Call `startExecution(...)` with `command: "__k8s-apply-yaml"`, `intent: "apply-yaml"`, `resource`, `action: "update"`, and `yaml`.
5. Close the editor modal and let `ExecutionPanel` own the UX (success/failure, logs, retry, etc.).

Example (Deployment YAML apply):

```ts
const status = clusterStatus();
startExecution({
  label: `Apply Deployment YAML: ${dep.name}`,
  command: '__k8s-apply-yaml',
  args: [],
  mode: 'apply',
  kubernetesEquivalent: true,
  namespace: dep.namespace,
  context: status.context,
  userAction: 'deployments-apply-yaml',
  dryRun: false,
  allowClusterWide: false,
  resource: 'deployments',
  action: 'update',
  intent: 'apply-yaml',
  yaml: trimmedYaml,
});
```

---

## 3. WebSocket Endpoint: `/api/execution/stream`

### 3.1. Opening a stream

- **URL**: `GET /api/execution/stream`
- **Protocol**: WebSocket
- **First message (from client)**: `ExecutionStartRequest` JSON with `type: "start"`.

### 3.2. `ExecutionStartRequest` (JSON)

Defined in `web_execution.go`:

```jsonc
{
  "type": "start",
  "executionId": "exec-1718890000000", // optional; server will generate if empty
  "command": "__k8s-apply-yaml",       // or "kubectl", "bash", etc. for shell flows
  "args": [],
  "mode": "apply",                     // "apply" | "dry-run"
  "kubernetesEquivalent": true,
  "workingDir": "",
  "label": "Apply Deployment YAML: api-server",

  // K8s metadata (used by authorizeExecution + apply-yaml handler):
  "namespace": "default",
  "context": "kind-dev-cluster",
  "userAction": "deployments-apply-yaml",
  "dryRun": false,
  "allowClusterWide": false,
  "resource": "deployments",
  "action": "update",
  "intent": "apply-yaml",
  "yaml": "apiVersion: apps/v1\nkind: Deployment\nmetadata: {...}\n..."
}
```

If `intent === "apply-yaml"` **and** `yaml` is non‑empty, the server routes this execution into `runApplyYAMLExecution` and **does not** spawn a shell command.

### 3.3. Outgoing messages (server → client)

All messages include an explicit `type` field:

1. **State events**

```json
{
  "type": "state",
  "executionId": "exec-1718890000000",
  "timestamp": "2025-12-17T12:34:56Z",
  "status": "running",          // "planned" | "running" | "succeeded" | "failed"
  "mode": "apply",              // "apply" | "dry-run"
  "sourceLabel": "kubectl-equivalent",
  "label": "Apply Deployment YAML: api-server"
}
```

2. **Phase events**

```json
{
  "type": "phase",
  "executionId": "exec-1718890000000",
  "timestamp": "2025-12-17T12:34:56Z",
  "name": "Applying resources…",
  "detail": "deployment.apps/api-server",
  "progress": 1,
  "total": 3,
  "mode": "apply",
  "sourceLabel": "kubectl-equivalent"
}
```

3. **Line events (logs)**

```json
{
  "type": "line",
  "executionId": "exec-1718890000000",
  "timestamp": "2025-12-17T12:34:57Z",
  "stream": "stdout",           // "stdout" | "stderr"
  "text": "deployment.apps/api-server configured",
  "mode": "apply",
  "sourceLabel": "kubectl-equivalent"
}
```

All `text` fields have **secret redaction** applied (tokens, passwords, `client-certificate-data`, `id-token`, etc.).

4. **Completion events**

```json
{
  "type": "complete",
  "executionId": "exec-1718890000000",
  "timestamp": "2025-12-17T12:34:59Z",
  "status": "succeeded",        // "succeeded" | "failed"
  "mode": "apply",
  "sourceLabel": "kubectl-equivalent",
  "summary": {
    "startedAt": "2025-12-17T12:34:55Z",
    "completedAt": "2025-12-17T12:34:59Z",
    "durationMs": 4000,
    "exitCode": 0,
    "resourcesChanged": {
      "created": 0,
      "configured": 1,
      "unchanged": 2,
      "deleted": 0
    }
  },
  "error": ""
}
```

For failures, `status: "failed"` and `error` contains a **human‑readable reason**, often including the Kubernetes API or admission webhook message.

### 3.4. Control messages (client → server)

While the execution is running, the client may send control messages:

```json
{ "type": "cancel", "executionId": "exec-1718890000000" }
```

- For shell commands, this maps to `cmd.Process.Kill()`.
- For `apply-yaml` (short‑lived API calls), cancellation is best‑effort (cancels the surrounding context; long‑running loops should check `ctx.Done()`).

---

## 4. Apply‑YAML Semantics by Resource

Implemented in `runApplyYAMLExecution` (all using `client-go`, **no `kubectl` shelling**):

- **Namespaced workload/config resources**
  - `deployments` (`apps/v1.Deployment`)
  - `statefulsets` (`apps/v1.StatefulSet`)
  - `daemonsets` (`apps/v1.DaemonSet`)
  - `services` (`core/v1.Service`)
  - `configmaps` (`core/v1.ConfigMap`)
  - `secrets` (`core/v1.Secret`)
  - `pods` (`core/v1.Pod`)
  - `jobs` (`batch/v1.Job`)
  - `cronjobs` (`batch/v1.CronJob`)
  - `pdb` (`policy/v1.PodDisruptionBudget` with `policy/v1beta1` fallback)
  - `hpa` (`autoscaling/v2.HorizontalPodAutoscaler` with `autoscaling/v1` fallback)
  - `ingress` (`networking/v1.Ingress`)
  - `networkpolicy` (`networking/v1.NetworkPolicy`)
  - `serviceaccounts` (`core/v1.ServiceAccount`)

- **Cluster‑scoped resources**
  - `namespaces` (`core/v1.Namespace`)
  - `persistentvolumes` (`core/v1.PersistentVolume`)
  - `storageclasses` (`storage/v1.StorageClass`)

For each resource type:

1. YAML is parsed into the appropriate typed object.
2. Namespace defaults to `req.Namespace` when empty (for namespaced kinds).
3. `UpdateOptions.DryRun = ["All"]` is set when `mode == "dry-run"` or `req.DryRun == true`.
4. A single, human‑readable line is emitted on success (e.g., `statefulset.apps/my-app updated` or `... validated (dry-run, no changes persisted)`).
5. `ExecutionResourcesChanged` increments `configured` or `unchanged` accordingly.

> **Note:** RBAC objects (Roles, RoleBindings, ClusterRoles, ClusterRoleBindings) and Certificates currently use dedicated REST handlers (see `ai_handlers.go` and `web_server.go`). They can be moved into `runApplyYAMLExecution` using the same pattern if we decide to deprecate their bespoke endpoints.

---

## 5. Execution Persistence & Re‑Attach APIs

To survive refreshes and WebSocket drops, the server keeps a lightweight in‑memory record of recent executions and a bounded log buffer.

### 5.1. Types

In `web_execution.go`:

```go
type ExecutionRecord struct {
    ExecutionID string            `json:"executionId"`
    Status      ExecutionStatus   `json:"status"`      // planned|running|succeeded|failed
    StartedAt   time.Time         `json:"startedAt"`
    LastLineAt  time.Time         `json:"lastLineAt"`
    Summary     *ExecutionSummary `json:"summary,omitempty"`
}

type ExecutionLogLine struct {
    Timestamp time.Time `json:"timestamp"`
    Stream    string    `json:"stream"` // "stdout" | "stderr"
    Text      string    `json:"text"`
}
```

The store is bounded (e.g., last N lines per execution, default 500) to avoid unbounded memory growth.

### 5.2. `GET /api/executions`

- **Handler**: `handleExecutionList` in `web_execution.go`
- **Response**: `[]ExecutionRecord`

Example:

```json
[
  {
    "executionId": "exec-1718890000000",
    "status": "succeeded",
    "startedAt": "2025-12-17T12:34:55Z",
    "lastLineAt": "2025-12-17T12:34:59Z",
    "summary": {
      "startedAt": "2025-12-17T12:34:55Z",
      "completedAt": "2025-12-17T12:34:59Z",
      "durationMs": 4000,
      "exitCode": 0,
      "resourcesChanged": {
        "created": 0,
        "configured": 1,
        "unchanged": 2,
        "deleted": 0
      }
    }
  }
]
```

The frontend calls this on startup via `autoReattachMostRecentRunning()` to find a still‑running execution and re‑hydrate the panel.

### 5.3. `GET /api/executions/logs?executionId=...`

- **Handler**: `handleExecutionLogs` in `web_execution.go`
- **Response**:

```json
{
  "executionId": "exec-1718890000000",
  "logs": [
    {
      "timestamp": "2025-12-17T12:34:56Z",
      "stream": "stdout",
      "text": "deployment.apps/api-server configured"
    },
    {
      "timestamp": "2025-12-17T12:34:57Z",
      "stream": "stderr",
      "text": "admission webhook denied the request: ... (sanitized)"
    }
  ]
}
```

The frontend uses this to reconstruct the log area when re‑attaching after a refresh or reconnect.

---

## 6. Security & RBAC Guardrails

### 6.1. `authorizeExecution(...)`

For executions flagged with `kubernetesEquivalent: true`, the server enforces:

1. **Namespace requirement**  
   - If `req.Namespace` is empty **and** `req.AllowClusterWide` is `false`, the request is rejected:

   > `namespace is required for Kubernetes-equivalent executions unless allowClusterWide is explicitly enabled`

2. **Cluster‑wide guardrail**  
   - If `AllowClusterWide == true` and IAM is enabled, only `RoleAdmin` is allowed to perform cluster‑wide operations; others receive:

   > `cluster-wide Kubernetes-equivalent executions are not allowed for this user`

3. **Per‑resource RBAC (if IAM is enabled)**  
   - If `req.Resource`, `req.Action`, and `req.Namespace` are set and a `X-User-Role` header is present:
     - The server constructs a minimal `User{Role: <X-User-Role>}` and calls:

       ```go
       if !ws.iam.CheckPermission(user, resource, action, ns) {
           return fmt.Errorf("RBAC: user is not allowed to %s %s in namespace %s", action, resource, ns)
       }
       ```

   - The permission matrix is defined in `iam.go` (`GetRolePermissions`).

### 6.2. Secret redaction

- Implemented via `secretRedactionPatterns` in `web_execution.go`.
- Covers:
  - Common tokens/passwords: `token`, `password`, `secret`, `apikey`, `authorization`, etc.
  - K8s client‑config fields: `client-certificate-data`, `client-key-data`, `id-token`.
  - JSON fields like `"access_token"`, `"refresh_token"`, `"password"`, `"client_secret"`.
- Applied to **all** `ExecutionLineMessage.Text` via `maskSecrets(...)` before sending to the client.

---

## 7. Adding a New Execution Flow

To add a new flow that uses the Execution Panel:

1. **Decide if it is Kubernetes‑equivalent**
   - If yes, set `kubernetesEquivalent: true` and fill `namespace`, `context`, `userAction`, `resource`, `action`, `intent`.
   - If it should use the K8s client directly on the server (not `kubectl`), prefer `intent: "apply-yaml"` + `yaml` and extend `runApplyYAMLExecution` with a new `case`.

2. **Wire the frontend call**
   - In your route/component, import and use `startExecution(...)` with an `ExecutionPanel` label that makes sense.
   - Optionally render a `CommandPreview` (`ui/solid/src/components/CommandPreview.tsx`) next to the button so users can see a kubectl/Helm‑equivalent command before executing.

3. **Optionally support dry‑run**
   - Add a UI toggle for “Dry run”.
   - Set `mode: 'dry-run'` and `dryRun: true` in `startExecution(...)`.
   - In `runApplyYAMLExecution`, ensure `UpdateOptions.DryRun = []string{metav1.DryRunAll}` is set when `mode == ExecutionModeDryRun || req.DryRun`.

4. **Document the flow**
   - Add a short note to the relevant `docs/app_inventory/views/*.md` file describing:
     - Where the Execution Panel is triggered from.
     - What the operation does (e.g., “applies Deployment YAML via Kubernetes API with streaming output”).
     - Whether dry‑run is available.

With this pipeline, **every critical cluster mutation can be made transparent, observable, and recoverable**, while still enforcing namespace and RBAC boundaries centrally in the backend. 


