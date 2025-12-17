---
title: What is KubeGraf?
sidebar_label: What is KubeGraf
---

# What is KubeGraf?

## Why this matters

Most engineers meet Kubernetes through production incidents, not conference talks.
When a cluster is on fire, you don’t want to hand‑assemble `kubectl` one‑liners and mentally stitch logs, events, and dashboards together.
KubeGraf exists to give you a **single, AI‑aware control plane** for understanding “what’s going on in this cluster” in seconds instead of minutes.

> ℹ️ **Info**
> Think of KubeGraf as a _local‑first_ control plane that sits on top of the same kubeconfig and RBAC you already use with `kubectl`, not a replacement for it.

## What KubeGraf actually is

KubeGraf is a **local-first, AI-native Kubernetes control plane** that gives you three ways to work with your clusters:

- **Terminal UI** – a fast, keyboard‑driven TUI (`kubegraf`) that feels like `k9s` with better navigation and context.
- **Web dashboard** – a browser UI (`kubegraf --web`) with cluster topology, incident timelines, and live event streams.
- **SPA dashboard** – the hosted SPA at `kubegraf.io` that mirrors the same concepts for teams who prefer the browser.

All three experiences share the same mental model:

- **Clusters and contexts** from your `~/.kube/config`.
- **Topology graph** of workloads, services, and infra.
- **Live events and incident timelines** that KubeGraf’s Brain Panel can analyze for you.

## Real‑world example: “What is wrong with payments right now?”

Imagine you’re on‑call for the `payments` namespace.
SRE pings you: “payments API is 500’ing in `prod-cluster`.”

First, you confirm the blast radius with raw `kubectl`:

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

Now the questions you actually care about are:

- _“What changed in the last 10 minutes?”_
- _“Is it just this one pod or the whole deployment?”_
- _“Is there a config / secret / image mismatch?”_

KubeGraf lets you:

- Open the **Terminal UI** with:

  ```bash
  kubegraf
  ```

- Jump to `payments` namespace and see **all CrashLooping pods highlighted**.
- Open the **Incident Timeline** to see deploy events, config changes, and failing health checks in a single timeline.
- Ask the **Brain Panel** for a proposed root cause based on events + logs.

> 💡 **Pro tip**
> Use `kubectl config current-context` before launching KubeGraf to avoid debugging the wrong cluster:
>
> ```bash
> kubectl config current-context
> ```

## Screenshot placeholder

> ℹ️ **Screenshot**
> Replace this placeholder with a real capture from the _Cluster Overview_ screen showing the topology graph and active incidents.

```text
[ screenshot: cluster overview with highlighted CrashLoopBackOff pods in the payments namespace ]
```

## How KubeGraf fits into your workflow

KubeGraf is designed to sit alongside tools you already use:

- **kubectl** – for imperative actions, one‑off patching, and scripting.
- **Prometheus / Grafana** – for time‑series metrics and SLO dashboards.
- **ArgoCD** – for GitOps and rollout control.

The value add is:

- A **single, opinionated view** of cluster state (topology + events + logs).
- A **local‑first UI** that works anywhere your kubeconfig works.
- **AI‑assisted analysis** that speaks the language of deployments, pods, and events instead of raw text.

## Step‑by‑step: From zero to “what’s running?”

1. **Install KubeGraf**
   - Follow the installation guide:
     ```bash
     curl -sSL https://kubegraf.io/install.sh | bash
     ```
   - Or use your preferred package manager if available.

2. **Confirm kubeconfig access**
   - Make sure you can reach your cluster:
     ```bash
     kubectl config get-contexts
     kubectl get nodes
     ```

3. **Launch the Terminal UI**
   - Run:
     ```bash
     kubegraf
     ```
   - KubeGraf uses your current `kubectl` context and `~/.kube/config` by default.

4. **Scan the cluster**
   - Use vim‑style keys in the TUI:
     - `j` / `k` – move up/down
     - `Tab` – switch views (Pods, Deployments, Events, etc.)
     - `/` – filter by name
     - `c` – change context/cluster

5. **Open the Brain Panel**
   - From a problematic workload, open the Brain Panel to see:
     - Summarized events.
     - Log highlights.
     - Suggested next actions.

## Expected outcome

After reading this page and running the basic commands, you should:

- Understand **what KubeGraf is** (a local‑first AI‑native control plane, not a hosted black box).
- See how it **plugs into your existing kubeconfig and tools**.
- Be able to **launch KubeGraf and scan a cluster** without changing any manifests.

> ⚠️ **Common mistakes**
> - Launching KubeGraf against the wrong context because `kubectl config current-context` wasn’t checked first.
> - Assuming KubeGraf ships its own RBAC; it’s still bound by your existing Kubernetes RBAC and kubeconfig.
>
> 💡 **Pro tip**
> Keep a dedicated “playground” namespace or cluster in your kubeconfig so you can safely explore KubeGraf features without touching production.

---
title: What is KubeGraf?
sidebar_label: What is KubeGraf
---

# What is KubeGraf?

## Why this matters

Most engineers meet Kubernetes through production incidents, not conference talks.
When a cluster is on fire, you don’t want to hand‑assemble `kubectl` one‑liners and mentally stitch logs, events, and dashboards together.
KubeGraf exists to give you a **single, AI‑aware control plane** for understanding “what’s going on in this cluster” in seconds instead of minutes.

> ℹ️ **Info**
> Think of KubeGraf as a _local‑first_ control plane that sits on top of the same kubeconfig and RBAC you already use with `kubectl`, not a replacement for it.

## What KubeGraf actually is

KubeGraf is a **local-first, AI-native Kubernetes control plane** that gives you three ways to work with your clusters:

- **Terminal UI** – a fast, keyboard‑driven TUI (`kubegraf`) that feels like `k9s` with better navigation and context.
- **Web dashboard** – a browser UI (`kubegraf --web`) with cluster topology, incident timelines, and live event streams.
- **SPA dashboard** – the hosted SPA at `kubegraf.io` that mirrors the same concepts for teams who prefer the browser.

All three experiences share the same mental model:

- **Clusters and contexts** from your `~/.kube/config`.
- **Topology graph** of workloads, services, and infra.
- **Live events and incident timelines** that KubeGraf’s Brain Panel can analyze for you.

## Real‑world example: “What is wrong with payments right now?”

Imagine you’re on‑call for the `payments` namespace.
SRE pings you: “payments API is 500’ing in `prod-cluster`.”

First, you confirm the blast radius with raw `kubectl`:

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

Now the questions you actually care about are:

- _“What changed in the last 10 minutes?”_
- _“Is it just this one pod or the whole deployment?”_
- _“Is there a config / secret / image mismatch?”_

KubeGraf lets you:

- Open the **Terminal UI** with:

  ```bash
  kubegraf
  ```

- Jump to `payments` namespace and see **all CrashLooping pods highlighted**.
- Open the **Incident Timeline** to see deploy events, config changes, and failing health checks in a single timeline.
- Ask the **Brain Panel** for a proposed root cause based on events + logs.

> 💡 **Pro tip**
> Use `kubectl config current-context` before launching KubeGraf to avoid debugging the wrong cluster:
>
> ```bash
> kubectl config current-context
> ```

## Screenshot placeholder

> ℹ️ **Screenshot**
> Replace this placeholder with a real capture from the _Cluster Overview_ screen showing the topology graph and active incidents.

```text
[ screenshot: cluster overview with highlighted CrashLoopBackOff pods in the payments namespace ]
```

## How KubeGraf fits into your workflow

KubeGraf is designed to sit alongside tools you already use:

- **kubectl** – for imperative actions, one‑off patching, and scripting.
- **Prometheus / Grafana** – for time‑series metrics and SLO dashboards.
- **ArgoCD** – for GitOps and rollout control.

The value add is:

- A **single, opinionated view** of cluster state (topology + events + logs).
- A **local‑first UI** that works anywhere your kubeconfig works.
- **AI‑assisted analysis** that speaks the language of deployments, pods, and events instead of raw text.

## Step‑by‑step: From zero to “what’s running?”

1. **Install KubeGraf**
   - Follow the installation guide:
     ```bash
     curl -sSL https://kubegraf.io/install.sh | bash
     ```
   - Or use your preferred package manager if available.

2. **Confirm kubeconfig access**
   - Make sure you can reach your cluster:
     ```bash
     kubectl config get-contexts
     kubectl get nodes
     ```

3. **Launch the Terminal UI**
   - Run:
     ```bash
     kubegraf
     ```
   - KubeGraf uses your current `kubectl` context and `~/.kube/config` by default.

4. **Scan the cluster**
   - Use vim‑style keys in the TUI:
     - `j` / `k` – move up/down
     - `Tab` – switch views (Pods, Deployments, Events, etc.)
     - `/` – filter by name
     - `c` – change context/cluster

5. **Open the Brain Panel**
   - From a problematic workload, open the Brain Panel to see:
     - Summarized events.
     - Log highlights.
     - Suggested next actions.

## Expected outcome

After reading this page and running the basic commands, you should:

- Understand **what KubeGraf is** (a local‑first AI‑native control plane, not a hosted black box).
- See how it **plugs into your existing kubeconfig and tools**.
- Be able to **launch KubeGraf and scan a cluster** without changing any manifests.

> ⚠️ **Common mistakes**
> - Launching KubeGraf against the wrong context because `kubectl config current-context` wasn’t checked first.
> - Assuming KubeGraf ships its own RBAC; it’s still bound by your existing Kubernetes RBAC and kubeconfig.
>
> 💡 **Pro tip**
> Keep a dedicated “playground” namespace or cluster in your kubeconfig so you can safely explore KubeGraf features without touching production.


