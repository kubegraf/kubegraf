# ML Inference Services Guide

## Overview

KubeGraf's ML Inference Services feature allows you to deploy machine learning models (`.pt`, `.onnx`, `.pickle`, `.h5`) as production-ready inference APIs on Kubernetes. This feature automatically generates Kubernetes Deployments, Services, Horizontal Pod Autoscalers (HPA), and Ingress resources.

## Accessing Inference Services

### Navigation Path
1. Open KubeGraf UI
2. Navigate to **Extensions** → **ML Workloads** → **Inference Services**
3. You'll see the list of deployed inference services

### URL Route
- Route ID: `inferenceservices`
- Direct URL: `http://localhost:3001/#/inferenceservices` (or your KubeGraf URL)

## Features

### 1. Model Deployment Wizard

#### Supported Model Formats
- **PyTorch**: `.pt` files
- **ONNX**: `.onnx` files
- **Pickle**: `.pickle`, `.pkl` files
- **Keras/TensorFlow**: `.h5` files

#### Runtime Options

**FastAPI + Custom Handler**
- Lightweight Python runtime
- Best for: Custom Python models, simple REST APIs
- Port: 8000
- Image: `python:3.9-slim`

**MLServer**
- Production-ready ML serving framework
- Best for: ONNX, scikit-learn models
- Port: 8080
- Image: `seldonio/mlserver:1.3.2`

**BentoML**
- High-performance ML serving
- Best for: Complex ML pipelines
- Port: 3000
- Image: `bentoml/bento-server:latest`

**KServe (lite)**
- Kubernetes-native ML serving
- Best for: Production workloads with advanced features
- Port: 8080
- Image: `kserve/kserve:latest`

### 2. Resource Configuration

#### Basic Resources
- **CPU**: CPU allocation (e.g., `1`, `2`, `500m`)
- **Memory**: Memory allocation (e.g., `2Gi`, `4Gi`, `512Mi`)
- **GPU**: GPU allocation (e.g., `1`, `2`) - requires GPU nodes
- **Replicas**: Number of pod replicas (default: 1)

#### Horizontal Pod Autoscaler (HPA)
- **Enable HPA**: Automatically scale pods based on CPU usage
- **Min Replicas**: Minimum number of pods (default: 1)
- **Max Replicas**: Maximum number of pods (default: 3)
- **Target CPU %**: CPU threshold for scaling (default: 70%)

#### Ingress/Gateway
- **Enable Ingress**: Expose service via Ingress controller
- **Host**: Custom domain name (e.g., `inference.example.com`)
- **Path**: URL path (default: `/`)
- **TLS**: Enable HTTPS (requires TLS certificate)

### 3. Storage Options

#### PVC (Persistent Volume Claim)
- Store model files in Kubernetes persistent volumes
- Best for: Large models, shared storage
- Configuration: Provide existing PVC name

#### MinIO
- Store models in MinIO object storage
- Best for: S3-compatible storage within cluster
- Configuration: Endpoint, bucket, credentials

#### S3
- Store models in AWS S3 or compatible storage
- Best for: Cloud-native deployments
- Configuration: Endpoint, bucket, region, credentials

### 4. Environment Variables
- Add custom environment variables for model configuration
- Examples: API keys, model parameters, feature flags

## How It Works

### Deployment Process

1. **Model Upload**
   - User uploads model file through UI
   - File is base64 encoded and sent to backend
   - Model stored in Kubernetes ConfigMap

2. **Resource Generation**
   - Backend generates Kubernetes YAML:
     - **Deployment**: Pods running inference service
     - **Service**: ClusterIP service for internal access
     - **ConfigMap**: Contains model file
     - **HPA** (optional): Auto-scaling configuration
     - **Ingress** (optional): External access configuration

3. **Deployment**
   - Resources applied to Kubernetes cluster
   - Pods start with model loaded
   - Service endpoint available at: `{service-name}.{namespace}.svc.cluster.local`

### Architecture

```
┌─────────────────┐
│  Model File     │
│  (.pt, .onnx)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  ConfigMap      │
│  (Model Storage)│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Deployment     │
│  (Pods)         │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Service        │
│  (ClusterIP)    │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌────────┐ ┌────────┐
│  HPA   │ │ Ingress│
│(Auto)  │ │(External)│
└────────┘ └────────┘
```

## Usage Examples

### Example 1: Deploy PyTorch Model

1. Click **"+ Deploy Model"** button
2. Fill in:
   - **Service Name**: `pytorch-classifier`
   - **Namespace**: `ml-production`
   - **Model File**: Upload `model.pt`
   - **Runtime**: `FastAPI`
   - **CPU**: `2`
   - **Memory**: `4Gi`
   - **Replicas**: `2`
3. Click **"Deploy Service"**
4. Wait for deployment (pods will start)
5. Access endpoint: `pytorch-classifier.ml-production.svc.cluster.local:8000`

### Example 2: Deploy with HPA

1. Enable **"Enable Horizontal Pod Autoscaler"**
2. Configure:
   - **Min Replicas**: `2`
   - **Max Replicas**: `10`
   - **Target CPU %**: `70`
3. Service will auto-scale based on CPU usage

### Example 3: Deploy with Ingress

1. Enable **"Enable Ingress/Gateway"**
2. Configure:
   - **Host**: `api.example.com`
   - **Path**: `/predict`
   - **TLS**: Enable
3. Access via: `https://api.example.com/predict`

## Testing Inference Services

### Test Interface

1. Navigate to inference service details
2. Click **"Test Interface"** tab
3. Enter JSON input:
   ```json
   {
     "input": [1, 2, 3, 4, 5]
   }
   ```
4. Click **"Send Test Request"**
5. View response with latency metrics

### API Endpoint

The inference service exposes a `/predict` endpoint:

```bash
curl -X POST http://{service-name}.{namespace}.svc.cluster.local:8000/predict \
  -H "Content-Type: application/json" \
  -d '{"input": [1, 2, 3]}'
```

## Monitoring

### Service Status
- **Running**: Service is operational
- **Pending**: Pods are starting
- **Failed**: Deployment failed

### Metrics
- **Replicas**: Current vs desired replicas
- **Resources**: CPU, Memory, GPU usage
- **Endpoint**: Service DNS name

### Logs
- View pod logs in **"Logs"** tab
- Real-time log streaming
- Filter by pod name

## Best Practices

### 1. Resource Sizing
- **Small models** (< 100MB): 1 CPU, 2Gi memory
- **Medium models** (100MB - 1GB): 2 CPU, 4Gi memory
- **Large models** (> 1GB): 4+ CPU, 8Gi+ memory

### 2. GPU Usage
- Enable GPU for deep learning models
- Requires GPU nodes in cluster
- Set GPU request: `1` or `2`

### 3. Scaling
- Use HPA for variable traffic
- Set min replicas based on baseline load
- Set max replicas based on cost constraints

### 4. Storage
- Use PVC for models > 500MB
- Use S3/MinIO for model versioning
- Mount models at `/models` path

### 5. Security
- Use TLS for external access
- Store credentials in Kubernetes Secrets
- Limit namespace access via RBAC

## Troubleshooting

### Service Not Starting
1. Check pod logs: **Logs** tab
2. Verify model file format
3. Check resource limits
4. Verify namespace exists

### Test Requests Failing
1. Verify service is **Running**
2. Check endpoint URL
3. Verify input JSON format
4. Check pod logs for errors

### HPA Not Scaling
1. Verify HPA is created: `kubectl get hpa`
2. Check CPU metrics: `kubectl top pods`
3. Verify target CPU % is reasonable

### Ingress Not Working
1. Verify Ingress controller installed
2. Check Ingress resource: `kubectl get ingress`
3. Verify DNS/host configuration

## API Reference

### Backend Endpoints

- `POST /api/inference/create` - Create inference service
- `GET /api/inference/list?namespace={ns}` - List services
- `GET /api/inference/get?name={name}&namespace={ns}` - Get service
- `POST /api/inference/delete` - Delete service
- `POST /api/inference/test` - Test inference service
- `GET /api/inference/status?name={name}&namespace={ns}` - Get status

### Request Format

**Create Service:**
```json
{
  "name": "my-service",
  "namespace": "default",
  "modelFile": "base64-encoded-model",
  "modelFileName": "model.pt",
  "runtime": "fastapi",
  "cpu": "2",
  "memory": "4Gi",
  "replicas": 2,
  "hpa": {
    "enabled": true,
    "minReplicas": 1,
    "maxReplicas": 5,
    "targetCPU": 70
  },
  "ingress": {
    "enabled": true,
    "host": "api.example.com",
    "path": "/",
    "tls": true
  }
}
```

## Related Features

- **ML Training Jobs**: Train models before deployment
- **MLflow**: Track experiments and manage model registry
- **Resource Map**: Visualize service topology

## Support

For issues or questions:
1. Check pod logs in the UI
2. Review Kubernetes events: `kubectl get events`
3. Check service status in KubeGraf UI

