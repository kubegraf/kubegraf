# Test Deployment Manifests

This directory contains sample Kubernetes manifests for testing the Custom App Deployment feature.

## Available Test Apps

### 1. Nginx Test App
A simple Nginx web server with ConfigMap configuration.

**Files:**
- `nginx-deployment.yaml` - Deployment with 2 replicas
- `nginx-service.yaml` - ClusterIP service
- `nginx-configmap.yaml` - Nginx configuration

**To deploy:**
1. Go to CD → Custom Apps → Deploy Custom App
2. Upload all three files: `nginx-deployment.yaml`, `nginx-service.yaml`, `nginx-configmap.yaml`
3. Select a namespace (e.g., `default`)
4. Preview and deploy

### 2. Redis Test App
A Redis cache server with persistence.

**Files:**
- `redis-deployment.yaml` - Deployment with 1 replica
- `redis-service.yaml` - ClusterIP service

**To deploy:**
1. Upload both files: `redis-deployment.yaml`, `redis-service.yaml`
2. Select a namespace
3. Preview and deploy

### 3. Web App Test
A simple web application with health checks.

**Files:**
- `webapp-deployment.yaml` - Deployment with 3 replicas and health probes
- `webapp-service.yaml` - ClusterIP service

**To deploy:**
1. Upload both files: `webapp-deployment.yaml`, `webapp-service.yaml`
2. Select a namespace
3. Preview and deploy

## Usage Tips

1. **Select all related files** for an app when uploading (Deployment + Service + ConfigMap if applicable)
2. **Choose an appropriate namespace** (default, or create a new one)
3. **Preview first** to see what will be created
4. **Check the resources** after deployment in the respective views (Pods, Services, etc.)

## Testing Scenarios

- **Basic Deployment**: Use Nginx Test App (simplest)
- **With ConfigMap**: Use Nginx Test App (includes ConfigMap)
- **With Health Checks**: Use Web App Test (includes liveness/readiness probes)
- **Multiple Replicas**: Use Web App Test (3 replicas) or Nginx Test App (2 replicas)
- **Stateful-like**: Use Redis Test App (uses emptyDir volume)

## Notes

- All images used are public and lightweight (nginx:alpine, redis:alpine)
- Resource limits are set conservatively for testing
- All services are ClusterIP type (internal only)
- Modify namespaces in the YAML files if needed, or let the wizard handle it

