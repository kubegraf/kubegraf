# ML Features Overview

## Introduction

KubeGraf provides a comprehensive suite of Machine Learning (ML) features for managing the complete ML lifecycle on Kubernetes. This guide provides an overview of all ML features and how they work together.

## Features

### 1. MLflow Deployment
**Purpose**: Experiment tracking, model registry, and ML lifecycle management

**Location**: Marketplace → ML Apps → MLflow

**Key Features**:
- Install MLflow with Helm
- Configure backend storage (S3, MinIO, GCS, PVC)
- Enable tracking UI
- Manage model registry
- Track experiments and metrics

**Documentation**: [MLflow Deployment Guide](./MLFLOW_DEPLOYMENT.md)

### 2. ML Training Jobs
**Purpose**: Run ML training workloads on Kubernetes

**Location**: Extensions → ML Workloads → Training Jobs

**Key Features**:
- Submit Python training scripts
- Use Docker images
- Configure CPU/GPU/memory resources
- Real-time log streaming
- Volume mounts for data
- Environment variables

**Documentation**: [ML Training Jobs Guide](./ML_TRAINING_JOBS.md)

### 3. ML Inference Services
**Purpose**: Deploy ML models as production-ready inference APIs

**Location**: Extensions → ML Workloads → Inference Services

**Key Features**:
- Deploy models (.pt, .onnx, .pickle, .h5)
- Multiple runtime options (FastAPI, MLServer, BentoML, KServe)
- Auto-scaling with HPA
- Ingress/Gateway support
- Test interface with JSON I/O
- Real-time monitoring

**Documentation**: [ML Inference Services Guide](./ML_INFERENCE_SERVICES.md)

## ML Workflow

### Complete ML Lifecycle

```
┌─────────────────┐
│  1. Experiment  │
│     Tracking    │
│   (MLflow)      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  2. Training    │
│     Jobs        │
│  (Kubernetes)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  3. Model       │
│     Registry    │
│   (MLflow)      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  4. Inference   │
│     Services    │
│  (Production)   │
└─────────────────┘
```

### Typical Workflow

1. **Setup MLflow** (Marketplace → ML Apps → MLflow)
   - Install MLflow with S3 backend
   - Configure artifact store
   - Enable tracking UI

2. **Train Models** (Extensions → ML Workloads → Training Jobs)
   - Create training job with Python script
   - Configure GPU resources
   - Monitor training progress
   - Log experiments to MLflow

3. **Register Models** (MLflow UI)
   - View training results
   - Compare experiments
   - Register best model
   - Promote to production

4. **Deploy Models** (Extensions → ML Workloads → Inference Services)
   - Deploy registered model
   - Configure auto-scaling
   - Enable ingress
   - Test inference API

## Navigation Guide

### Accessing ML Features

#### MLflow
1. **Marketplace Access**
   - Click **"Marketplace"** in sidebar
   - Navigate to **"ML Apps"** tab
   - Find **"MLflow"** card
   - Click **"Install"** or **"Settings"**

2. **Direct Access**
   - URL: `/#/mlflow`
   - Or: Marketplace → ML Apps → MLflow → View

#### Training Jobs
1. **Sidebar Navigation**
   - Click **"Extensions"** in sidebar
   - Expand **"ML Workloads"**
   - Click **"Training Jobs"**

2. **Direct Access**
   - URL: `/#/trainingjobs`

#### Inference Services
1. **Sidebar Navigation**
   - Click **"Extensions"** in sidebar
   - Expand **"ML Workloads"**
   - Click **"Inference Services"**

2. **Direct Access**
   - URL: `/#/inferenceservices`

## Integration Examples

### Example 1: End-to-End ML Pipeline

**Step 1: Setup MLflow**
```bash
# Install MLflow via UI
Marketplace → ML Apps → MLflow → Install
# Configure S3 backend
# Enable tracking UI
```

**Step 2: Train Model**
```python
# train.py
import mlflow
import mlflow.pytorch

mlflow.set_tracking_uri("http://mlflow-service.mlflow.svc.cluster.local:5000")
mlflow.set_experiment("image-classification")

with mlflow.start_run():
    # Training code
    model = train_model()
    
    # Log to MLflow
    mlflow.log_param("epochs", 50)
    mlflow.log_metric("accuracy", 0.95)
    mlflow.pytorch.log_model(model, "model")
```

**Step 3: Deploy Training Job**
- Extensions → ML Workloads → Training Jobs
- Upload `train.py`
- Configure GPU: 1
- CPU: 8, Memory: 16Gi
- Create job

**Step 4: Register Model**
- Open MLflow UI
- Navigate to experiment
- Register best model
- Promote to Production

**Step 5: Deploy Inference**
- Extensions → ML Workloads → Inference Services
- Deploy model from MLflow
- Configure HPA (min: 2, max: 10)
- Enable ingress
- Test API

### Example 2: Quick Experimentation

**Fast Track:**
1. Install MLflow (MinIO backend)
2. Create training job
3. View results in MLflow
4. Deploy best model

**No MLflow:**
1. Create training job
2. Save model to PVC
3. Deploy inference service
4. Use saved model file

## Resource Requirements

### MLflow
- **CPU**: 1-4 cores
- **Memory**: 2-8Gi
- **Storage**: 10-100Gi (depends on experiments)

### Training Jobs
- **CPU**: 2-16 cores (depends on model)
- **Memory**: 4-64Gi (depends on model)
- **GPU**: 0-4 (optional, for deep learning)

### Inference Services
- **CPU**: 1-8 cores (depends on traffic)
- **Memory**: 2-16Gi (depends on model size)
- **GPU**: 0-2 (optional, for inference acceleration)

## Best Practices

### 1. Resource Planning
- Start with minimal resources
- Monitor actual usage
- Scale based on metrics
- Use HPA for inference services

### 2. Storage Strategy
- Use S3/MinIO for production
- Separate artifact store from backend
- Regular backups
- Version control for models

### 3. Security
- Use TLS for external access
- Store credentials in Secrets
- Limit namespace access
- Use RBAC for permissions

### 4. Monitoring
- Track experiment metrics in MLflow
- Monitor training job logs
- Monitor inference service metrics
- Set up alerts for failures

### 5. Cost Optimization
- Use spot instances for training
- Auto-scale inference services
- Archive old experiments
- Clean up unused resources

## Troubleshooting

### Common Issues

**MLflow Installation Fails**
- Check Helm chart availability
- Verify storage credentials
- Check namespace permissions

**Training Job Not Starting**
- Verify resource availability
- Check image pull permissions
- Review job YAML

**Inference Service Not Responding**
- Check pod status
- Verify model file format
- Review service logs
- Test endpoint directly

### Getting Help

1. **Check Logs**
   - MLflow: `kubectl logs -n mlflow -l app=mlflow`
   - Training Jobs: View logs in UI
   - Inference: View logs in UI

2. **Check Resources**
   - `kubectl get pods -A`
   - `kubectl get events -A`
   - `kubectl top pods -A`

3. **Review Documentation**
   - MLflow: [MLFLOW_DEPLOYMENT.md](./MLFLOW_DEPLOYMENT.md)
   - Training: [ML_TRAINING_JOBS.md](./ML_TRAINING_JOBS.md)
   - Inference: [ML_INFERENCE_SERVICES.md](./ML_INFERENCE_SERVICES.md)

## Quick Reference

### URLs
- MLflow: `/#/mlflow`
- Training Jobs: `/#/trainingjobs`
- Inference Services: `/#/inferenceservices`

### API Endpoints
- MLflow: `/api/mlflow/*`
- Training Jobs: `/api/ml/jobs/*`
- Inference: `/api/inference/*`

### Kubernetes Resources
- MLflow: Deployment, Service, ConfigMap, Secret
- Training Jobs: Job, Pod
- Inference: Deployment, Service, HPA, Ingress

## Next Steps

1. **Start with MLflow**: Install and configure
2. **Run Training Job**: Test with simple script
3. **Deploy Inference**: Deploy trained model
4. **Integrate**: Connect all components
5. **Scale**: Optimize for production

## Related Documentation

- [MLflow Deployment Guide](./MLFLOW_DEPLOYMENT.md)
- [ML Training Jobs Guide](./ML_TRAINING_JOBS.md)
- [ML Inference Services Guide](./ML_INFERENCE_SERVICES.md)
- [ML Deployment Guide](./ML_DEPLOYMENT.md) (General ML deployment)

