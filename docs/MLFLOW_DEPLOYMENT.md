# MLflow Deployment Guide

## Overview

MLflow is an open-source platform for managing the ML lifecycle, including experimentation, reproducibility, deployment, and a central model registry. KubeGraf provides a complete MLflow deployment wizard that installs MLflow on your Kubernetes cluster with configurable backend storage, artifact stores, and UI access.

## Accessing MLflow

### Navigation Path
1. Open KubeGraf UI
2. Navigate to **Marketplace** → **ML Apps**
3. Find **MLflow** card
4. Click **"Install"** or **"Settings"**

### Direct Access
- Route ID: `mlflow`
- Direct URL: `http://localhost:3001/#/mlflow` (or your KubeGraf URL)

## Features

### 1. Installation Wizard

#### Backend Store Options

**MinIO** (Recommended for local clusters)
- S3-compatible object storage
- Runs in-cluster
- No external dependencies
- Configuration:
  - Endpoint: `http://minio:9000`
  - Bucket: `mlflow`
  - Access Key: Auto-generated
  - Secret Key: Auto-generated

**S3** (AWS S3)
- Production-ready cloud storage
- Scalable and durable
- Configuration:
  - Endpoint: `s3.amazonaws.com`
  - Bucket: Your S3 bucket name
  - Region: `us-east-1`, `eu-west-1`, etc.
  - Access Key: AWS Access Key ID
  - Secret Key: AWS Secret Access Key

**GCS** (Google Cloud Storage)
- Google Cloud object storage
- Integrated with GCP services
- Configuration:
  - Endpoint: `storage.googleapis.com`
  - Bucket: Your GCS bucket name
  - Credentials: Service account JSON

**PVC** (Persistent Volume Claim)
- Kubernetes native storage
- Best for: Small deployments, local clusters
- Configuration:
  - PVC Name: Existing PVC or auto-created
  - Size: Storage size (e.g., `10Gi`, `100Gi`)

#### Artifact Store Options
- Same options as backend store
- Can use different storage for artifacts
- Recommended: Use S3/MinIO for artifacts

#### UI Configuration
- **Enable Tracking UI**: Enable MLflow UI (default: enabled)
- **Enable Ingress**: Expose UI via Ingress
- **Ingress Host**: Custom domain (e.g., `mlflow.example.com`)
- **TLS**: Enable HTTPS

#### Resource Limits
- **CPU**: MLflow server CPU (default: `1`)
- **Memory**: MLflow server memory (default: `2Gi`)

#### Version Selection
- Choose MLflow version from available releases
- Default: Latest stable version
- Versions fetched from GitHub releases

### 2. MLflow Panel

#### Status Display
- **Installed**: Shows if MLflow is installed
- **Version**: Installed MLflow version
- **Namespace**: Deployment namespace
- **Backend Store**: Storage type and status
- **Artifact Store**: Artifact storage type
- **Tracking UI**: UI status and URL

#### Actions
- **Open Tracking UI**: Opens MLflow UI via port-forward
- **Restart Pods**: Restart MLflow server pods
- **Upgrade**: Upgrade to newer version
- **Uninstall**: Remove MLflow deployment

## How It Works

### Installation Process

1. **Helm Chart Installation**
   - Uses official MLflow Helm chart
   - Generates Helm values from wizard inputs
   - Installs MLflow server, backend, and UI

2. **Resource Creation**
   - **Deployment**: MLflow server pods
   - **Service**: ClusterIP service for UI
   - **ConfigMap**: Configuration
   - **Secrets**: Storage credentials
   - **PVC** (if selected): Persistent storage
   - **Ingress** (if enabled): External access

3. **Post-Installation**
   - Verifies deployment status
   - Tests backend connectivity
   - Exposes UI endpoint

### Architecture

```
┌─────────────────┐
│  MLflow UI      │
│  (Port 5000)    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  MLflow Server  │
│  (Tracking API) │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌────────┐ ┌────────┐
│Backend │ │Artifact│
│ Store  │ │ Store  │
│(S3/PVC)│ │(S3/PVC)│
└────────┘ └────────┘
```

## Usage Examples

### Example 1: Quick Start (MinIO)

1. Go to **Marketplace** → **ML Apps**
2. Click **"Install"** on MLflow card
3. Configure:
   - **Backend Store**: MinIO
   - **Artifact Store**: MinIO
   - **Enable Tracking UI**: ✓
   - **Namespace**: `mlflow`
4. Click **"Install"**
5. Wait for installation (2-3 minutes)
6. Click **"Open Tracking UI"** in MLflow panel

### Example 2: Production Setup (S3)

1. Create S3 bucket: `mlflow-backend`
2. Create IAM user with S3 access
3. In installation wizard:
   - **Backend Store**: S3
   - **Bucket**: `mlflow-backend`
   - **Region**: `us-east-1`
   - **Access Key**: IAM user access key
   - **Secret Key**: IAM user secret key
   - **Artifact Store**: S3 (same bucket)
4. Install and verify

### Example 3: With Ingress

1. Enable **"Enable Ingress/Gateway"**
2. Configure:
   - **Host**: `mlflow.company.com`
   - **TLS**: Enable
3. Access via: `https://mlflow.company.com`
4. No port-forwarding needed

## Using MLflow

### Python Client

```python
import mlflow
import mlflow.sklearn

# Set tracking URI
mlflow.set_tracking_uri("http://mlflow-service.mlflow.svc.cluster.local:5000")

# Start experiment
mlflow.set_experiment("my-experiment")

# Log parameters
mlflow.log_param("learning_rate", 0.01)
mlflow.log_param("epochs", 100)

# Train model
model = train_model()

# Log metrics
mlflow.log_metric("accuracy", 0.95)
mlflow.log_metric("loss", 0.05)

# Log model
mlflow.sklearn.log_model(model, "model")

# Log artifacts
mlflow.log_artifact("plots/confusion_matrix.png")
```

### Tracking Experiments

1. **Create Experiment**
   ```python
   mlflow.create_experiment("my-experiment")
   ```

2. **Run Experiment**
   ```python
   with mlflow.start_run():
       # Training code
       mlflow.log_param("param1", value1)
       mlflow.log_metric("metric1", value2)
   ```

3. **View in UI**
   - Open MLflow UI
   - Navigate to experiment
   - Compare runs
   - View metrics, parameters, artifacts

### Model Registry

1. **Register Model**
   ```python
   mlflow.register_model(
       model_uri="runs:/{run_id}/model",
       name="my-model"
   )
   ```

2. **Model Stages**
   - **None**: Initial registration
   - **Staging**: Testing phase
   - **Production**: Live deployment
   - **Archived**: Deprecated models

3. **Model Versioning**
   - Automatic versioning
   - Track model lineage
   - Compare versions

## Best Practices

### 1. Storage Selection

**Development/Testing:**
- Use MinIO or PVC
- Simple setup
- No external dependencies

**Production:**
- Use S3 or GCS
- Scalable and durable
- Backup and disaster recovery

### 2. Resource Allocation

**Small Deployments:**
- CPU: 1-2 cores
- Memory: 2-4Gi
- Suitable for: < 100 experiments

**Medium Deployments:**
- CPU: 2-4 cores
- Memory: 4-8Gi
- Suitable for: 100-1000 experiments

**Large Deployments:**
- CPU: 4-8 cores
- Memory: 8-16Gi
- Suitable for: > 1000 experiments

### 3. Security

- Use TLS for external access
- Store credentials in Kubernetes Secrets
- Limit namespace access via RBAC
- Use IAM roles for S3 access (production)

### 4. Backup

- Regular S3 bucket backups
- Export experiment metadata
- Backup model registry
- Document storage configuration

### 5. Monitoring

- Monitor MLflow pod health
- Track storage usage
- Monitor API request rates
- Set up alerts for failures

## Troubleshooting

### Installation Fails

1. **Check Helm Chart**
   ```bash
   helm list -n mlflow
   helm status mlflow -n mlflow
   ```

2. **Check Pods**
   ```bash
   kubectl get pods -n mlflow
   kubectl logs -n mlflow -l app=mlflow
   ```

3. **Check Storage**
   - Verify S3/MinIO connectivity
   - Check credentials
   - Verify bucket exists

### UI Not Accessible

1. **Port-Forward Manually**
   ```bash
   kubectl port-forward -n mlflow svc/mlflow 5000:5000
   ```
   Access: `http://localhost:5000`

2. **Check Service**
   ```bash
   kubectl get svc -n mlflow
   kubectl describe svc mlflow -n mlflow
   ```

3. **Check Ingress**
   ```bash
   kubectl get ingress -n mlflow
   kubectl describe ingress mlflow -n mlflow
   ```

### Backend Connection Issues

1. **Verify Storage**
   - Test S3/MinIO connectivity
   - Check credentials
   - Verify bucket permissions

2. **Check ConfigMap**
   ```bash
   kubectl get configmap -n mlflow
   kubectl describe configmap mlflow-config -n mlflow
   ```

3. **Check Logs**
   ```bash
   kubectl logs -n mlflow -l app=mlflow
   ```

## API Reference

### Backend Endpoints

- `GET /api/mlflow/status` - Get MLflow status
- `POST /api/mlflow/install` - Install MLflow
- `GET /api/mlflow/versions` - Get available versions
- `POST /api/mlflow/upgrade` - Upgrade MLflow
- `GET /api/mlflow/proxy/*` - Proxy MLflow API requests

### MLflow Tracking URI

- **Cluster Internal**: `http://mlflow-service.{namespace}.svc.cluster.local:5000`
- **Port-Forward**: `http://localhost:5000`
- **Ingress**: `https://mlflow.example.com`

## Integration with Other Features

### Training Jobs
- Log experiments from training jobs
- Track model versions
- Compare training runs

### Inference Services
- Deploy models from MLflow registry
- Track inference metrics
- Version model deployments

## Related Features

- **Training Jobs**: Run experiments tracked in MLflow
- **Inference Services**: Deploy MLflow models
- **Resource Map**: Visualize MLflow resources

## Support

For issues or questions:
1. Check MLflow pod logs
2. Review Helm release status
3. Verify storage connectivity
4. Check MLflow UI for errors

