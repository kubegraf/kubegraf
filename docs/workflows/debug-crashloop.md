---
title: Debug a CrashLoopBackOff
sidebar_label: Debug CrashLoopBackOff
---

# Debug a CrashLoopBackOff

## Why this matters

CrashLoopBackOff is one of the most common Kubernetes incidents.
What you really want is not “what does CrashLoopBackOff mean?” but **“why is _this_ pod crashing and what should I try next?”**

KubeGraf helps you go from a red pod to a plausible root cause and fix plan in a few minutes by combining logs, events, and an incident timeline.

## Scenario: payments API keeps crashing in `prod-cluster`

You’re on‑call.
Alerts fire for `payments-api` in the `payments` namespace on `prod-cluster`.

You confirm with `kubectl`:

```bash
kubectl config use-context prod-cluster
kubectl get pods -n payments
```

```bash
NAME                                   READY   STATUS             RESTARTS   AGE
payments-api-66cbd9d4dc-7xg9n          0/1     CrashLoopBackOff   5          2m31s
payments-api-66cbd9d4dc-87zc2          1/1     Running            0          5m12s
redis-payments-0                       1/1     Running            0          10m
```

You could start chasing logs manually, but KubeGraf gives you a **guided path**:

- See all CrashLooping workloads across the cluster.
- Overlay deploys, config changes, and events on an **incident timeline**.
- Use the **Brain Panel** to summarize likely causes and next steps.

> ⚠️ **Common mistakes**
> - Only looking at pod logs and ignoring recent events (e.g. `ImagePullBackOff`, failing probes, or config errors).
> - Fixing the _symptom_ (restarting pods) without understanding the deploy or config change that caused it.

## Screenshot placeholder

> ℹ️ **Screenshot**
> Replace this with a real capture of the Incident Timeline for a CrashLoopBackOff in the `payments` namespace.

```text
[ screenshot: incident timeline showing deployment rollout, failing readiness probe, and repeated restarts ]
```

## Step‑by‑step flow

### 1. Confirm the problem with kubectl

Always start with a quick, reliable check:

```bash
kubectl get pods -n payments
kubectl describe pod payments-api-66cbd9d4dc-7xg9n -n payments | sed -n '1,40p'
```

Look for:

- `Last State: Terminated` with a non‑zero exit code.
- Recent events like probe failures or permission errors.

### 2. Open KubeGraf on the right cluster and namespace

1. Launch the Terminal UI:

   ```bash
   kubegraf
   ```

2. Press `c` and select `prod-cluster` if it’s not already active.
3. Press `n` and select the `payments` namespace.
4. Switch to the **Pods** view and filter:

   - Press `/`
   - Type `payments-api`

You should now see the same crashing pod highlighted in the list.

> 💡 **Pro tip**
> Use the **status filters** (if available in your version) to quickly highlight only unhealthy workloads (CrashLoopBackOff, Error, ImagePullBackOff).

### 3. Inspect logs and recent events through KubeGraf

With the crashing pod selected:

1. Press `l` to view **logs**.
2. Press `e` (or navigate to the **Events** panel) to see recent events for that pod / deployment.
3. Look for patterns such as:
   - Application throwing the same exception on startup.
   - Config/secret mount errors.
   - Failing readiness or liveness probes.

Example log snippet:

```bash
2025-03-22T12:01:03Z ERROR payments-api Failed to start HTTP server: DB_CONNECTION_STRING not set
2025-03-22T12:01:03Z ERROR payments-api Exiting with code 1
```

At this point you know the pod is restarting due to a missing config value.

### 4. Use the Incident Timeline and Brain Panel

From the crashing workload, open the **Incident Timeline** and **Brain Panel**:

- Timeline shows:
  - A new deployment of `payments-api` 3 minutes ago.
  - A config map update 2 minutes ago.
  - A burst of failing readiness probes.
- Brain Panel summarizes:
  - “`payments-api` started crashing immediately after a new rollout. Logs show `DB_CONNECTION_STRING not set`. Check the associated config or secret.”

This gives you a concise story:

1. A deploy happened.
2. Config changed.
3. New pods can’t start because a required env var is missing.

> ℹ️ **Info**
> The Brain Panel is not magic – it’s taking the same events and logs you would normally triage by hand and surfacing the highest‑signal parts for you.

### 5. Fix the underlying issue

Depending on what you find, typical fixes include:

- Rolling back the deployment:

  ```bash
  kubectl rollout undo deployment/payments-api -n payments
  ```

- Updating a missing or incorrect config value:

  ```bash
  kubectl edit configmap payments-api-config -n payments
  ```

- Fixing probes that are too strict for the new version.

After applying a fix, watch the rollout:

```bash
kubectl rollout status deployment/payments-api -n payments
kubectl get pods -n payments
```

And verify in KubeGraf that:

- The pod is no longer CrashLooping.
- Error counts on the Incident Timeline drop.

### 6. Capture a post‑mortem snapshot (optional)

Once the incident is resolved, use KubeGraf to:

- Export the Incident Timeline as a PDF or screenshot.
- Capture Brain Panel notes as part of your incident review doc.

> 💡 **Pro tip**
> Pair KubeGraf with your Slack or ticketing integration so that CrashLoopBackOff incidents automatically include links back to the timeline and relevant logs.

## Expected outcome

After following this workflow, you should be able to:

- Take a CrashLoopBackOff from “red pod” to a **concrete, likely root cause**.
- Use KubeGraf’s **logs, events, and Incident Timeline** instead of guessing from raw `kubectl` output alone.
- Apply and validate a fix confidently, knowing what changed and why.

Once you’re comfortable with this flow, the same pattern extends to other incident types:

- Bad rollouts.
- Capacity issues.
- Mis‑configured ingresses or services.

---
title: Debug a CrashLoopBackOff
sidebar_label: Debug CrashLoopBackOff
---

# Debug a CrashLoopBackOff

## Why this matters

CrashLoopBackOff is one of the most common Kubernetes incidents.
What you really want is not “what does CrashLoopBackOff mean?” but **“why is _this_ pod crashing and what should I try next?”**

KubeGraf helps you go from a red pod to a plausible root cause and fix plan in a few minutes by combining logs, events, and an incident timeline.

## Scenario: payments API keeps crashing in `prod-cluster`

You’re on‑call.
Alerts fire for `payments-api` in the `payments` namespace on `prod-cluster`.

You confirm with `kubectl`:

```bash
kubectl config use-context prod-cluster
kubectl get pods -n payments
```

```bash
NAME                                   READY   STATUS             RESTARTS   AGE
payments-api-66cbd9d4dc-7xg9n          0/1     CrashLoopBackOff   5          2m31s
payments-api-66cbd9d4dc-87zc2          1/1     Running            0          5m12s
redis-payments-0                       1/1     Running            0          10m
```

You could start chasing logs manually, but KubeGraf gives you a **guided path**:

- See all CrashLooping workloads across the cluster.
- Overlay deploys, config changes, and events on an **incident timeline**.
- Use the **Brain Panel** to summarize likely causes and next steps.

> ⚠️ **Common mistakes**
> - Only looking at pod logs and ignoring recent events (e.g. `ImagePullBackOff`, failing probes, or config errors).
> - Fixing the _symptom_ (restarting pods) without understanding the deploy or config change that caused it.

## Screenshot placeholder

> ℹ️ **Screenshot**
> Replace this with a real capture of the Incident Timeline for a CrashLoopBackOff in the `payments` namespace.

```text
[ screenshot: incident timeline showing deployment rollout, failing readiness probe, and repeated restarts ]
```

## Step‑by‑step flow

### 1. Confirm the problem with kubectl

Always start with a quick, reliable check:

```bash
kubectl get pods -n payments
kubectl describe pod payments-api-66cbd9d4dc-7xg9n -n payments | sed -n '1,40p'
```

Look for:

- `Last State: Terminated` with a non‑zero exit code.
- Recent events like probe failures or permission errors.

### 2. Open KubeGraf on the right cluster and namespace

1. Launch the Terminal UI:

   ```bash
   kubegraf
   ```

2. Press `c` and select `prod-cluster` if it’s not already active.
3. Press `n` and select the `payments` namespace.
4. Switch to the **Pods** view and filter:

   - Press `/`
   - Type `payments-api`

You should now see the same crashing pod highlighted in the list.

> 💡 **Pro tip**
> Use the **status filters** (if available in your version) to quickly highlight only unhealthy workloads (CrashLoopBackOff, Error, ImagePullBackOff).

### 3. Inspect logs and recent events through KubeGraf

With the crashing pod selected:

1. Press `l` to view **logs**.
2. Press `e` (or navigate to the **Events** panel) to see recent events for that pod / deployment.
3. Look for patterns such as:
   - Application throwing the same exception on startup.
   - Config/secret mount errors.
   - Failing readiness or liveness probes.

Example log snippet:

```bash
2025-03-22T12:01:03Z ERROR payments-api Failed to start HTTP server: DB_CONNECTION_STRING not set
2025-03-22T12:01:03Z ERROR payments-api Exiting with code 1
```

At this point you know the pod is restarting due to a missing config value.

### 4. Use the Incident Timeline and Brain Panel

From the crashing workload, open the **Incident Timeline** and **Brain Panel**:

- Timeline shows:
  - A new deployment of `payments-api` 3 minutes ago.
  - A config map update 2 minutes ago.
  - A burst of failing readiness probes.
- Brain Panel summarizes:
  - “`payments-api` started crashing immediately after a new rollout. Logs show `DB_CONNECTION_STRING not set`. Check the associated config or secret.”

This gives you a concise story:

1. A deploy happened.
2. Config changed.
3. New pods can’t start because a required env var is missing.

> ℹ️ **Info**
> The Brain Panel is not magic – it’s taking the same events and logs you would normally triage by hand and surfacing the highest‑signal parts for you.

### 5. Fix the underlying issue

Depending on what you find, typical fixes include:

- Rolling back the deployment:

  ```bash
  kubectl rollout undo deployment/payments-api -n payments
  ```

- Updating a missing or incorrect config value:

  ```bash
  kubectl edit configmap payments-api-config -n payments
  ```

- Fixing probes that are too strict for the new version.

After applying a fix, watch the rollout:

```bash
kubectl rollout status deployment/payments-api -n payments
kubectl get pods -n payments
```

And verify in KubeGraf that:

- The pod is no longer CrashLooping.
- Error counts on the Incident Timeline drop.

### 6. Capture a post‑mortem snapshot (optional)

Once the incident is resolved, use KubeGraf to:

- Export the Incident Timeline as a PDF or screenshot.
- Capture Brain Panel notes as part of your incident review doc.

> 💡 **Pro tip**
> Pair KubeGraf with your Slack or ticketing integration so that CrashLoopBackOff incidents automatically include links back to the timeline and relevant logs.

## Expected outcome

After following this workflow, you should be able to:

- Take a CrashLoopBackOff from “red pod” to a **concrete, likely root cause**.
- Use KubeGraf’s **logs, events, and Incident Timeline** instead of guessing from raw `kubectl` output alone.
- Apply and validate a fix confidently, knowing what changed and why.

Once you’re comfortable with this flow, the same pattern extends to other incident types:

- Bad rollouts.
- Capacity issues.
- Mis‑configured ingresses or services.


