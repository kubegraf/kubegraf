---
title: Connect your first cluster
sidebar_label: First cluster
---

# Connect your first cluster

## Why this matters

KubeGraf is only useful once it’s looking at a **real cluster**.
The fastest way to build trust is to connect it to a kubeconfig you already use every day and see familiar workloads show up.

This guide walks you from “fresh install” to “I can see my cluster, pods, and events in KubeGraf” in a few minutes.

## Prerequisites

- You can reach a Kubernetes cluster with `kubectl` from your machine.
- `kubectl config current-context` points to the cluster you want to use.
- KubeGraf is installed:

```bash
curl -sSL https://kubegraf.io/install.sh | bash
```

> 💡 **Pro tip**
> Keep production and non‑production contexts clearly named (`prod-cluster`, `staging-cluster`, `kind-dev`) so it’s obvious which cluster you’re connecting to in KubeGraf.

## Real example: connect `staging-cluster`

1. **Confirm context**

   ```bash
   kubectl config current-context
   ```

   ```bash
   staging-cluster
   ```

   ```bash
   kubectl get nodes
   ```

   ```bash
   NAME                   STATUS   ROLES           AGE   VERSION
   ip-10-0-12-34         Ready    control-plane   30d   v1.30.3
   ip-10-0-56-78         Ready    <none>          30d   v1.30.3
   ```

2. **Launch the Terminal UI**

   ```bash
   kubegraf
   ```

   KubeGraf will:

   - Read `~/.kube/config`.
   - Use the **current context** (`staging-cluster`).
   - Show a cluster summary along with namespaces and workloads.

3. **Verify the namespace you care about**

   Press:

   - `n` – to change namespace.
   - Type `payments` (or another namespace that exists).

   You should now see pods, deployments, and services for that namespace.

4. **Launch the Web Dashboard (optional)**

   ```bash
   kubegraf --web
   ```

   Then open:

   ```text
   http://localhost:8080
   ```

   You’ll see the same cluster and namespaces reflected in the web UI.

> ⚠️ **Common mistakes**
> - Running `kubegraf` before verifying that `kubectl` can talk to the cluster (leading to confusing connection errors).
> - Forgetting that `kubegraf` will respect your current context; if `minikube` is active, you’ll be looking at minikube, not `prod-cluster`.

## Screenshot placeholder

> ℹ️ **Screenshot**
> Replace this with a real capture of the _Cluster Overview_ page after connecting `staging-cluster`.

```text
[ screenshot: overview card showing 1 cluster, 2 nodes, N namespaces, and pods by status ]
```

## Step‑by‑step flow

### 1. Verify kubeconfig

- Check all available contexts:

  ```bash
  kubectl config get-contexts
  ```

- Switch if necessary:

  ```bash
  kubectl config use-context staging-cluster
  ```

### 2. Sanity‑check connectivity

- Ensure the API server responds and you’re authorized:

  ```bash
  kubectl get ns
  ```

  If this fails, fix cluster access before involving KubeGraf.

### 3. Start KubeGraf

- Terminal UI:

  ```bash
  kubegraf
  ```

  - Use `c` to change context if you launched it on the wrong cluster.
  - Use `?` to bring up keybindings.

- Web dashboard:

  ```bash
  kubegraf --web
  # In another terminal:
  open http://localhost:8080   # macOS
  # or
  xdg-open http://localhost:8080  # Linux
  ```

### 4. Explore workloads

- Filter by namespace and resource type:
  - `n` – switch namespaces.
  - `Tab` – switch between Pods / Deployments / Services / Events.
- Drill into a workload:
  - `Enter` – open resource details.
  - `l` – view logs for a pod.
  - `e` – view events for a resource (where supported).

### 5. Save this as your “default” view

- Decide which context + namespace combination you’ll use most.
- Make sure `kubectl config current-context` points there before your next KubeGraf session.

> 💡 **Pro tip**
> Add a shell alias for your preferred cluster:
>
> ```bash
> alias kg-staging='kubectl config use-context staging-cluster && kubegraf'
> ```
>
> Now `kg-staging` will switch context and launch KubeGraf in one go.

## Expected outcome

By the end of this guide you should:

- Have **KubeGraf successfully connected** to at least one cluster via your existing kubeconfig.
- Be able to **see nodes, namespaces, and workloads** for that cluster.
- Know how to **switch clusters and namespaces** from within the UI instead of editing kubeconfig by hand.

If you can see your cluster in both `kubectl` and KubeGraf, you’re ready to move on to debugging real issues with the **CrashLoopBackOff workflow**.

---
title: Connect your first cluster
sidebar_label: First cluster
---

# Connect your first cluster

## Why this matters

KubeGraf is only useful once it’s looking at a **real cluster**.
The fastest way to build trust is to connect it to a kubeconfig you already use every day and see familiar workloads show up.

This guide walks you from “fresh install” to “I can see my cluster, pods, and events in KubeGraf” in a few minutes.

## Prerequisites

- You can reach a Kubernetes cluster with `kubectl` from your machine.
- `kubectl config current-context` points to the cluster you want to use.
- KubeGraf is installed:

```bash
curl -sSL https://kubegraf.io/install.sh | bash
```

> 💡 **Pro tip**
> Keep production and non‑production contexts clearly named (`prod-cluster`, `staging-cluster`, `kind-dev`) so it’s obvious which cluster you’re connecting to in KubeGraf.

## Real example: connect `staging-cluster`

1. **Confirm context**

   ```bash
   kubectl config current-context
   ```

   ```bash
   staging-cluster
   ```

   ```bash
   kubectl get nodes
   ```

   ```bash
   NAME                   STATUS   ROLES           AGE   VERSION
   ip-10-0-12-34         Ready    control-plane   30d   v1.30.3
   ip-10-0-56-78         Ready    <none>          30d   v1.30.3
   ```

2. **Launch the Terminal UI**

   ```bash
   kubegraf
   ```

   KubeGraf will:

   - Read `~/.kube/config`.
   - Use the **current context** (`staging-cluster`).
   - Show a cluster summary along with namespaces and workloads.

3. **Verify the namespace you care about**

   Press:

   - `n` – to change namespace.
   - Type `payments` (or another namespace that exists).

   You should now see pods, deployments, and services for that namespace.

4. **Launch the Web Dashboard (optional)**

   ```bash
   kubegraf --web
   ```

   Then open:

   ```text
   http://localhost:8080
   ```

   You’ll see the same cluster and namespaces reflected in the web UI.

> ⚠️ **Common mistakes**
> - Running `kubegraf` before verifying that `kubectl` can talk to the cluster (leading to confusing connection errors).
> - Forgetting that `kubegraf` will respect your current context; if `minikube` is active, you’ll be looking at minikube, not `prod-cluster`.

## Screenshot placeholder

> ℹ️ **Screenshot**
> Replace this with a real capture of the _Cluster Overview_ page after connecting `staging-cluster`.

```text
[ screenshot: overview card showing 1 cluster, 2 nodes, N namespaces, and pods by status ]
```

## Step‑by‑step flow

### 1. Verify kubeconfig

- Check all available contexts:

  ```bash
  kubectl config get-contexts
  ```

- Switch if necessary:

  ```bash
  kubectl config use-context staging-cluster
  ```

### 2. Sanity‑check connectivity

- Ensure the API server responds and you’re authorized:

  ```bash
  kubectl get ns
  ```

  If this fails, fix cluster access before involving KubeGraf.

### 3. Start KubeGraf

- Terminal UI:

  ```bash
  kubegraf
  ```

  - Use `c` to change context if you launched it on the wrong cluster.
  - Use `?` to bring up keybindings.

- Web dashboard:

  ```bash
  kubegraf --web
  # In another terminal:
  open http://localhost:8080   # macOS
  # or
  xdg-open http://localhost:8080  # Linux
  ```

### 4. Explore workloads

- Filter by namespace and resource type:
  - `n` – switch namespaces.
  - `Tab` – switch between Pods / Deployments / Services / Events.
- Drill into a workload:
  - `Enter` – open resource details.
  - `l` – view logs for a pod.
  - `e` – view events for a resource (where supported).

### 5. Save this as your “default” view

- Decide which context + namespace combination you’ll use most.
- Make sure `kubectl config current-context` points there before your next KubeGraf session.

> 💡 **Pro tip**
> Add a shell alias for your preferred cluster:
>
> ```bash
> alias kg-staging='kubectl config use-context staging-cluster && kubegraf'
> ```
>
> Now `kg-staging` will switch context and launch KubeGraf in one go.

## Expected outcome

By the end of this guide you should:

- Have **KubeGraf successfully connected** to at least one cluster via your existing kubeconfig.
- Be able to **see nodes, namespaces, and workloads** for that cluster.
- Know how to **switch clusters and namespaces** from within the UI instead of editing kubeconfig by hand.

If you can see your cluster in both `kubectl` and KubeGraf, you’re ready to move on to debugging real issues with the **CrashLoopBackOff workflow**.


