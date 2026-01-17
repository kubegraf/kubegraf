# Installation Locations Guide

## Overview

This document clarifies where different components are installed when using KubeGraf's ML features.

## Installation Locations

### 1. Feast Feature Store

**Installation Location**: Kubernetes Cluster

- **Namespace**: User-selected (default: `feast`)
- **Method**: Helm chart installation
- **Components Installed**:
  - Feast server pods
  - Feast serving service
  - ConfigMaps for configuration
  - Secrets for store credentials (if needed)
  - PVCs (if file/PVC storage selected)

**Not Installed Locally**: Feast runs entirely in your Kubernetes cluster, not on your local machine.

**Access**:
- Cluster-internal: `feast-service.{namespace}.svc.cluster.local`
- External: Via Ingress (if configured) or port-forward

### 2. DCGM Exporter (GPU Metrics)

**Installation Location**: Kubernetes Cluster

- **Namespace**: User-selected (default: `gpu-operator`)
- **Method**: Helm chart installation via NVIDIA GPU Operator
- **Components Installed**:
  - DCGM exporter DaemonSet (runs on GPU nodes)
  - DCGM exporter Service
  - ServiceMonitor (for Prometheus integration)

**Not Installed Locally**: DCGM exporter runs in your Kubernetes cluster on GPU nodes.

**Access**:
- Cluster-internal: `dcgm-exporter.{namespace}.svc.cluster.local:9400`
- Metrics endpoint: `/metrics` (Prometheus format)

### 3. GPU Detection

**Automatic Detection**: Yes, no plugins required!

KubeGraf automatically detects GPU nodes by:
1. **Checking Node Resources**: Queries Kubernetes nodes for `nvidia.com/gpu` resource
2. **Reading Node Labels**: Checks for GPU-related labels (`nvidia.com/gpu.product`, `accelerator`)
3. **No DCGM Required**: Basic GPU detection works without DCGM exporter

**What You Get Without DCGM**:
- ✅ GPU node detection
- ✅ GPU count per node
- ✅ GPU type identification
- ❌ Detailed metrics (utilization, memory, temperature, power)

**What You Get With DCGM**:
- ✅ All of the above
- ✅ Real-time GPU utilization
- ✅ Memory usage (used/total)
- ✅ Temperature monitoring
- ✅ Power draw monitoring
- ✅ Process-level GPU usage

## Installation Flow

### Feast Installation

```
User clicks "Install" in Marketplace
    ↓
Helm installs Feast chart
    ↓
Components created in Kubernetes cluster:
    - Deployment (Feast server)
    - Service (ClusterIP)
    - ConfigMap (configuration)
    - Secrets (credentials, if needed)
    ↓
Feast accessible via Service DNS
```

### DCGM Installation

```
User clicks "Install DCGM Exporter"
    ↓
Helm installs NVIDIA GPU Operator chart
    ↓
Components created in Kubernetes cluster:
    - DaemonSet (DCGM exporter on GPU nodes)
    - Service (ClusterIP)
    ↓
DCGM exporter starts collecting metrics
    ↓
Metrics available via Prometheus or REST API
```

### GPU Detection (Automatic)

```
KubeGraf starts
    ↓
Queries Kubernetes API for nodes
    ↓
Checks each node's Status.Capacity["nvidia.com/gpu"]
    ↓
If GPU found:
    - Records node name
    - Records GPU count
    - Records GPU type (from labels)
    ↓
Displays in GPU Dashboard
```

## Cluster vs Local

### Installed in Cluster ✅

All components install in your Kubernetes cluster:
- Feast Feature Store
- DCGM Exporter
- MLflow (if installed)
- Training Jobs (Kubernetes Jobs)
- Inference Services (Deployments)

### Not Installed Locally ❌

Nothing is installed on your local machine:
- No local services
- No local databases
- No local containers (unless using local cluster like k3d/kind/minikube)

## Local Development

If you're using a **local Kubernetes cluster** (k3d, kind, minikube):
- Components still install in the cluster
- Cluster runs locally (Docker containers)
- Access via `localhost` port-forwarding

## Verification

### Check Feast Installation

```bash
# Check pods
kubectl get pods -n feast

# Check service
kubectl get svc -n feast

# Check Helm release
helm list -n feast
```

### Check DCGM Installation

```bash
# Check DaemonSet
kubectl get daemonset -n gpu-operator

# Check pods (should be on GPU nodes)
kubectl get pods -n gpu-operator -o wide

# Check service
kubectl get svc -n gpu-operator
```

### Check GPU Nodes

```bash
# List nodes with GPUs
kubectl get nodes -o json | jq '.items[] | select(.status.capacity."nvidia.com/gpu") | {name: .metadata.name, gpus: .status.capacity."nvidia.com/gpu"}'

# Or use KubeGraf UI
# Navigate to: Extensions → ML Workloads → GPU Dashboard
```

## Summary

| Component | Installation Location | Auto-Detection | Requires Plugin |
|-----------|----------------------|----------------|-----------------|
| Feast | Kubernetes Cluster | ❌ | ❌ |
| DCGM Exporter | Kubernetes Cluster | ✅ (GPU nodes) | ❌ (but needed for metrics) |
| GPU Nodes | N/A (detected) | ✅ | ❌ |

**Key Points**:
1. Everything installs in your **Kubernetes cluster**, not locally
2. GPU nodes are **automatically detected** without any plugins
3. DCGM Exporter is **optional** but needed for detailed metrics
4. No local installation required for any component

