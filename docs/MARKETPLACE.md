# Marketplace Guide

## Overview

KubeGraf Marketplace provides one-click deployment of 50+ production-ready applications with best-practice configurations.

## Features

- ✅ One-click installation
- ✅ Real-time progress with sound alerts
- ✅ Version management (upgrade, rollback)
- ✅ Custom values.yaml support
- ✅ Dependency resolution
- ✅ Namespace selection

## Available Applications

### Service Mesh
- **Istio** - Complete service mesh with observability
- **Linkerd** - Lightweight service mesh
- **Consul** - Service mesh & service discovery

### CI/CD
- **ArgoCD** - GitOps continuous delivery (HA/standalone)
- **Flux** - GitOps toolkit
- **Tekton** - Cloud-native CI/CD pipelines

### API Gateway
- **Kong** - API management & ingress
- **Traefik** - Modern HTTP reverse proxy
- **Ambassador** - Kubernetes-native API gateway

### Security
- **Vault** - Secrets management
- **Keycloak** - Identity & access management
- **cert-manager** - Certificate management

### Databases
- **MySQL** - Relational database
- **PostgreSQL** - Advanced relational database
- **MongoDB** - Document database
- **Redis** - In-memory data store

### Messaging
- **RabbitMQ** - Message broker
- **Kafka** - Distributed streaming
- **NATS** - Cloud-native messaging

### ML/AI
- **MLFlow** - ML experiment tracking
- **Kubeflow** - ML workflow orchestration
- **JupyterHub** - Multi-user Jupyter notebooks

### Observability
- **Prometheus** - Metrics & alerting
- **Grafana** - Visualization
- **Jaeger** - Distributed tracing
- **Kiali** - Istio observability

## Installation

### Basic Installation

1. Navigate to **Marketplace** tab
2. Find application
3. Click **Install**
4. Select namespace
5. Click **Deploy**

### Advanced Installation

**Custom Values:**
```yaml
# values.yaml
replicaCount: 3
resources:
  limits:
    cpu: 1000m
    memory: 1Gi
```

Click **Custom Values** → paste YAML → **Deploy**

## Istio Deployment

Marketplace deploys production-ready Istio:

```
istio-system namespace:
├── istiod (control plane)
├── istio-ingressgateway
├── istio-egressgateway
└── Optional addons:
    ├── Kiali
    ├── Jaeger
    ├── Prometheus
    └── Grafana
```

**Configuration:**
- Enable mTLS
- Choose profile: default, demo, minimal
- Select addons
- Configure ingress gateway

## ArgoCD Deployment

Two modes available:

**Standalone (Development):**
- Single replica
- SQLite backend
- 2GB RAM

**HA (Production):**
- 3 replicas
- Redis HA
- PostgreSQL
- 8GB RAM total

## Marketplace Progress

Real-time installation tracking:

**Overlay:**
- Progress bar (0-100%)
- Current step indicator
- Streaming logs
- Estimated time remaining

**Sound Alerts:**
- ✅ Success chime
- ❌ Error notification
- 🔄 Upgrade complete

**Floating Panel:**
- Bottom-right corner
- Minimizable
- Multiple concurrent installs

## Version Management

**Check for Updates:**
```
Current: v2.1.0
Latest:  v2.3.0 ↑
```

**Upgrade:**
1. Click **Upgrade**
2. Select version (last 5 releases shown)
3. Review changes
4. Click **Upgrade Now**

**Rollback:**
```
Revision History:
- v2.3.0 (current) - 2h ago
- v2.1.0 (stable) - 2 days ago
- v2.0.5 - 1 week ago
```

Click revision → **Rollback**

## Helm Chart Best Practices

All marketplace apps follow:

### Deployment Best Practices
- Resource limits/requests defined
- Liveness/readiness probes
- Pod disruption budgets (HA apps)
- Anti-affinity rules (HA apps)
- Security contexts (non-root)

### ConfigMaps & Secrets
- Separate config from code
- Secrets encrypted at rest
- Environment-specific configs

### Services & Ingress
- Service type configurable
- Ingress with TLS
- Health check endpoints

### HPA & VPA
- Horizontal pod autoscaling
- Vertical pod autoscaling (where applicable)
- Custom metrics support

## Troubleshooting

**Installation fails:**
```bash
# Check Helm release status
helm status <app-name> -n <namespace>

# View logs
kubectl logs -n <namespace> -l app=<app-name>
```

**Pending pods:**
```bash
# Check pod events
kubectl describe pod <pod-name> -n <namespace>

# Common issues:
- Insufficient resources
- Image pull errors
- PVC not bound
```

**Uninstall:**
1. Navigate to **Marketplace**
2. Find installed app
3. Click **Uninstall**
4. Confirm deletion

## Custom Helm Repositories

Add private repositories:

```yaml
# ~/.kubegraf/helm-repos.yaml
repositories:
  - name: my-repo
    url: https://charts.example.com
    username: user
    password: pass
```

Restart KubeGraf to load repos.

## API Reference

**List available apps:**
```
GET /api/marketplace/apps
```

**Install app:**
```
POST /api/marketplace/install
{
  "app": "istio",
  "namespace": "istio-system",
  "values": {...}
}
```

**Check progress:**
```
GET /api/marketplace/install-status/:id
```

## Pro Features

- **Private registries** - Deploy from private Helm repos
- **Multi-cluster sync** - Deploy to multiple clusters
- **Approval workflows** - Require approval before deploy
- **Cost estimation** - Pre-deployment cost analysis
- **Compliance checks** - Policy validation before deploy

**Upgrade to Pro**: https://kubegraf.io/pricing

---

**More info**: https://kubegraf.io/docs/marketplace
