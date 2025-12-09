# KubeGraf Helm Chart

This Helm chart deploys KubeGraf, an advanced Kubernetes visualization and management dashboard, to a Kubernetes cluster.

## Prerequisites

- Kubernetes 1.19+
- Helm 3.0+
- kubectl configured to access your cluster

## Installation

### Quick Start

```bash
# Add the repository (if using a chart repository)
helm repo add kubegraf https://kubegraf.github.io/kubegraf
helm repo update

# Install KubeGraf
helm install kubegraf ./helm/kubegraf

# Or install from repository
helm install kubegraf kubegraf/kubegraf
```

### Custom Installation

```bash
# Install with custom values
helm install kubegraf ./helm/kubegraf \
  --set image.tag=1.6.0 \
  --set service.type=LoadBalancer \
  --set ingress.enabled=true
```

### Using a Values File

```bash
# Create a custom values file
cat > my-values.yaml <<EOF
replicaCount: 2
service:
  type: LoadBalancer
ingress:
  enabled: true
  hosts:
    - host: kubegraf.example.com
      paths:
        - path: /
          pathType: Prefix
resources:
  limits:
    cpu: 2000m
    memory: 2Gi
  requests:
    cpu: 500m
    memory: 512Mi
EOF

# Install with custom values
helm install kubegraf ./helm/kubegraf -f my-values.yaml
```

## Configuration

The following table lists the configurable parameters and their default values:

| Parameter | Description | Default |
|-----------|-------------|---------|
| `replicaCount` | Number of replicas | `1` |
| `image.repository` | Container image repository | `kubegraf/kubegraf` |
| `image.tag` | Container image tag | `1.6.0` |
| `image.pullPolicy` | Image pull policy | `IfNotPresent` |
| `service.type` | Kubernetes service type | `ClusterIP` |
| `service.port` | Service port | `3000` |
| `ingress.enabled` | Enable ingress | `false` |
| `ingress.className` | Ingress class name | `""` |
| `ingress.hosts` | Ingress host configuration | `[]` |
| `ingress.tls` | Ingress TLS configuration | `[]` |
| `resources.limits` | Resource limits | `{cpu: 1000m, memory: 1Gi}` |
| `resources.requests` | Resource requests | `{cpu: 100m, memory: 128Mi}` |
| `persistence.enabled` | Enable persistent storage | `true` |
| `persistence.size` | Storage size | `1Gi` |
| `persistence.storageClass` | Storage class | `""` |
| `rbac.create` | Create RBAC resources | `true` |
| `rbac.clusterRole` | Use ClusterRole (vs Role) | `true` |
| `serviceAccount.create` | Create service account | `true` |
| `autoscaling.enabled` | Enable HPA | `false` |
| `autoscaling.minReplicas` | Minimum replicas | `1` |
| `autoscaling.maxReplicas` | Maximum replicas | `10` |
| `podDisruptionBudget.enabled` | Enable PDB | `false` |

## RBAC

By default, the chart creates a ClusterRole with permissions to:
- Read and write core Kubernetes resources (pods, services, configmaps, etc.)
- Manage deployments, statefulsets, daemonsets
- Manage jobs and cronjobs
- Manage ingresses and network policies
- Access metrics API
- Read events

You can customize RBAC rules by setting `rbac.rules` in your values file.

## Persistence

KubeGraf stores its database and configuration in `/app/.kubegraf`. By default, a PersistentVolumeClaim is created. You can disable persistence or customize the storage class:

```yaml
persistence:
  enabled: true
  storageClass: "fast-ssd"
  size: 5Gi
```

## Ingress

To expose KubeGraf via ingress:

```yaml
ingress:
  enabled: true
  className: "nginx"
  hosts:
    - host: kubegraf.example.com
      paths:
        - path: /
          pathType: Prefix
  tls:
    - secretName: kubegraf-tls
      hosts:
        - kubegraf.example.com
```

## Autoscaling

Enable Horizontal Pod Autoscaler:

```yaml
autoscaling:
  enabled: true
  minReplicas: 2
  maxReplicas: 10
  targetCPUUtilizationPercentage: 80
  targetMemoryUtilizationPercentage: 80
```

## Environment Variables

You can set environment variables:

```yaml
env:
  - name: KUBEGRAF_ENCRYPTION_KEY
    value: "your-encryption-key"
  - name: CUSTOM_VAR
    value: "custom-value"
```

## Upgrading

```bash
# Upgrade with new values
helm upgrade kubegraf ./helm/kubegraf -f my-values.yaml

# Upgrade to a specific version
helm upgrade kubegraf ./helm/kubegraf --set image.tag=1.6.0
```

## Uninstallation

```bash
helm uninstall kubegraf
```

## Troubleshooting

### Check Pod Status

```bash
kubectl get pods -l app.kubernetes.io/name=kubegraf
```

### View Logs

```bash
kubectl logs -l app.kubernetes.io/name=kubegraf
```

### Check Service

```bash
kubectl get svc kubegraf
```

### Port Forward for Local Access

```bash
kubectl port-forward svc/kubegraf 3000:3000
```

Then access at http://localhost:3000

### Check RBAC Permissions

```bash
kubectl describe clusterrole kubegraf
kubectl describe clusterrolebinding kubegraf
```

## Security Considerations

1. **Service Account**: The chart creates a service account with appropriate RBAC permissions. Review and adjust as needed for your security requirements.

2. **Network Policies**: Consider adding NetworkPolicy resources to restrict network access.

3. **TLS**: Enable TLS for ingress if exposing externally.

4. **Resource Limits**: Set appropriate resource limits to prevent resource exhaustion.

5. **Non-root User**: The container runs as a non-root user (UID 1000) by default.

## Support

For issues and questions:
- GitHub Issues: https://github.com/kubegraf/kubegraf/issues
- Documentation: https://github.com/kubegraf/kubegraf

