# KubeGraf Deployment Guide

This guide covers deploying KubeGraf to Kubernetes using Docker and Helm.

## Table of Contents

- [Docker Deployment](#docker-deployment)
- [Helm Chart Deployment](#helm-chart-deployment)
- [Building the Docker Image](#building-the-docker-image)
- [Configuration](#configuration)
- [Troubleshooting](#troubleshooting)

## Docker Deployment

### Building the Docker Image

#### Option 1: Build from Source

```bash
# Clone the repository
git clone https://github.com/kubegraf/kubegraf.git
cd kubegraf/kubegraf

# Build the Docker image
docker build -t kubegraf/kubegraf:1.6.0 .

# Or build with a specific version
docker build --build-arg VERSION=1.6.0 -t kubegraf/kubegraf:1.6.0 .
```

#### Option 2: Multi-arch Build (for ARM64 and AMD64)

```bash
# Build for multiple platforms
docker buildx create --use
docker buildx build --platform linux/amd64,linux/arm64 -t kubegraf/kubegraf:1.6.0 --push .
```

### Running with Docker

#### Basic Run

```bash
docker run -d \
  --name kubegraf \
  -p 3000:3000 \
  -v ~/.kube/config:/app/.kube/config:ro \
  kubegraf/kubegraf:1.6.0
```

#### With Persistent Storage

```bash
docker run -d \
  --name kubegraf \
  -p 3000:3000 \
  -v kubegraf-data:/app/.kubegraf \
  -v ~/.kube/config:/app/.kube/config:ro \
  kubegraf/kubegraf:1.6.0
```

#### Using In-Cluster Config (for Kubernetes)

```bash
# Create a service account and get token
kubectl create serviceaccount kubegraf
kubectl create clusterrolebinding kubegraf --clusterrole=cluster-admin --serviceaccount=default:kubegraf

# Run with in-cluster config
docker run -d \
  --name kubegraf \
  -p 3000:3000 \
  -v kubegraf-data:/app/.kubegraf \
  -e KUBERNETES_SERVICE_HOST=kubernetes.default.svc \
  -e KUBERNETES_SERVICE_PORT=443 \
  kubegraf/kubegraf:1.6.0
```

### Docker Compose

Create a `docker-compose.yml`:

```yaml
version: '3.8'

services:
  kubegraf:
    image: kubegraf/kubegraf:1.6.0
    container_name: kubegraf
    ports:
      - "3000:3000"
    volumes:
      - kubegraf-data:/app/.kubegraf
      - ~/.kube/config:/app/.kube/config:ro
    environment:
      - KUBEGRAF_ENCRYPTION_KEY=your-encryption-key-here
    restart: unless-stopped

volumes:
  kubegraf-data:
```

Run with:

```bash
docker-compose up -d
```

## Helm Chart Deployment

### Prerequisites

- Kubernetes 1.19+
- Helm 3.0+
- kubectl configured

### Quick Start

```bash
# Install KubeGraf
helm install kubegraf ./manifests/helm/kubegraf

# Check status
kubectl get pods -l app.kubernetes.io/name=kubegraf

# Access via port-forward
kubectl port-forward svc/kubegraf 3000:3000
```

### Custom Installation

#### With Ingress

```bash
helm install kubegraf ./manifests/helm/kubegraf \
  --set ingress.enabled=true \
  --set ingress.hosts[0].host=kubegraf.example.com \
  --set ingress.hosts[0].paths[0].path=/ \
  --set ingress.className=nginx
```

#### With LoadBalancer

```bash
helm install kubegraf ./manifests/helm/kubegraf \
  --set service.type=LoadBalancer
```

#### With Custom Resources

```bash
helm install kubegraf ./manifests/helm/kubegraf \
  --set resources.limits.cpu=2000m \
  --set resources.limits.memory=2Gi \
  --set resources.requests.cpu=500m \
  --set resources.requests.memory=512Mi
```

#### With High Availability

```bash
helm install kubegraf ./manifests/helm/kubegraf \
  --set replicaCount=3 \
  --set autoscaling.enabled=true \
  --set autoscaling.minReplicas=2 \
  --set autoscaling.maxReplicas=10 \
  --set podDisruptionBudget.enabled=true
```

### Using Values File

Create `my-values.yaml`:

```yaml
replicaCount: 2

image:
  repository: kubegraf/kubegraf
  tag: "1.6.0"

service:
  type: LoadBalancer
  port: 3000

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

resources:
  limits:
    cpu: 2000m
    memory: 2Gi
  requests:
    cpu: 500m
    memory: 512Mi

persistence:
  enabled: true
  size: 5Gi
  storageClass: "fast-ssd"

autoscaling:
  enabled: true
  minReplicas: 2
  maxReplicas: 10
  targetCPUUtilizationPercentage: 80

env:
  - name: KUBEGRAF_ENCRYPTION_KEY
    valueFrom:
      secretKeyRef:
        name: kubegraf-secrets
        key: encryption-key
```

Install:

```bash
helm install kubegraf ./manifests/helm/kubegraf -f my-values.yaml
```

### Upgrading

```bash
# Upgrade to new version
helm upgrade kubegraf ./manifests/helm/kubegraf --set image.tag=1.6.1

# Upgrade with new values
helm upgrade kubegraf ./manifests/helm/kubegraf -f my-values.yaml
```

### Uninstalling

```bash
helm uninstall kubegraf
```

## Building the Docker Image

### Local Build

```bash
# Build for local architecture
docker build -t kubegraf/kubegraf:1.6.0 .

# Test the image
docker run --rm -p 3000:3000 kubegraf/kubegraf:1.6.0
```

### CI/CD Build

Example GitHub Actions workflow:

```yaml
name: Build and Push Docker Image

on:
  push:
    tags:
      - 'v*'

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v2
      
      - name: Login to Docker Hub
        uses: docker/login-action@v2
        with:
          username: ${{ secrets.DOCKER_USERNAME }}
          password: ${{ secrets.DOCKER_PASSWORD }}
      
      - name: Extract version
        id: version
        run: echo "VERSION=${GITHUB_REF#refs/tags/v}" >> $GITHUB_ENV
      
      - name: Build and push
        uses: docker/build-push-action@v4
        with:
          context: ./kubegraf
          push: true
          tags: |
            kubegraf/kubegraf:${{ env.VERSION }}
            kubegraf/kubegraf:latest
          build-args: |
            VERSION=${{ env.VERSION }}
```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `KUBEGRAF_ENCRYPTION_KEY` | Encryption key for sensitive data | - |
| `KUBERNETES_NAMESPACE` | Kubernetes namespace (auto-set in K8s) | - |
| `KUBECONFIG` | Path to kubeconfig file | `~/.kube/config` |

### Kubernetes Configuration

KubeGraf automatically detects if it's running inside Kubernetes and uses in-cluster configuration. Otherwise, it uses the kubeconfig file.

### RBAC Requirements

KubeGraf needs the following permissions:

- **Read**: pods, services, deployments, nodes, namespaces, etc.
- **Write**: pods, services, deployments, configmaps, secrets
- **Exec**: pods (for shell access)
- **Logs**: pods (for log viewing)
- **Metrics**: nodes, pods (for resource usage)

The Helm chart creates appropriate RBAC resources by default.

## Troubleshooting

### Pod Not Starting

```bash
# Check pod status
kubectl get pods -l app.kubernetes.io/name=kubegraf

# View logs
kubectl logs -l app.kubernetes.io/name=kubegraf

# Describe pod for events
kubectl describe pod -l app.kubernetes.io/name=kubegraf
```

### Permission Issues

```bash
# Check service account
kubectl get serviceaccount kubegraf

# Check cluster role
kubectl describe clusterrole kubegraf

# Check cluster role binding
kubectl describe clusterrolebinding kubegraf

# Test permissions
kubectl auth can-i get pods --as=system:serviceaccount:default:kubegraf --all-namespaces
```

### Connection Issues

```bash
# Test cluster connectivity
kubectl cluster-info

# Check if metrics server is available
kubectl top nodes

# Verify API server access
kubectl get namespaces
```

### Image Pull Issues

```bash
# Check image pull secrets
kubectl get secrets

# If using private registry, create secret
kubectl create secret docker-registry regcred \
  --docker-server=<registry> \
  --docker-username=<username> \
  --docker-password=<password> \
  --docker-email=<email>

# Update values to use secret
helm upgrade kubegraf ./helm/kubegraf \
  --set imagePullSecrets[0].name=regcred
```

### Storage Issues

```bash
# Check PVC status
kubectl get pvc

# Check storage class
kubectl get storageclass

# Describe PVC for events
kubectl describe pvc kubegraf-data
```

### Network Issues

```bash
# Check service
kubectl get svc kubegraf

# Test service connectivity
kubectl run -it --rm debug --image=curlimages/curl --restart=Never -- curl http://kubegraf:3000/health

# Check ingress
kubectl get ingress
kubectl describe ingress kubegraf
```

## Production Recommendations

1. **High Availability**: Use multiple replicas with HPA and PDB
2. **Resource Limits**: Set appropriate CPU and memory limits
3. **Storage**: Use fast SSD storage class for better performance
4. **Security**: 
   - Enable TLS for ingress
   - Use network policies
   - Regularly update images
   - Use secrets for sensitive data
5. **Monitoring**: Set up monitoring and alerting for the deployment
6. **Backup**: Regularly backup the persistent volume

## Support

For issues and questions:
- GitHub Issues: https://github.com/kubegraf/kubegraf/issues
- Documentation: https://github.com/kubegraf/kubegraf

