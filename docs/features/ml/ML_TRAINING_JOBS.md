# ML Training Jobs Guide

## Overview

KubeGraf's ML Training Jobs feature allows you to run machine learning training workloads on Kubernetes. You can submit Python training scripts or Docker images, configure resources (CPU/GPU/memory), and monitor training progress in real-time.

## Accessing Training Jobs

### Navigation Path
1. Open KubeGraf UI
2. Navigate to **Extensions** → **ML Workloads** → **Training Jobs**
3. You'll see the list of training jobs

### URL Route
- Route ID: `trainingjobs`
- Direct URL: `http://localhost:3001/#/trainingjobs` (or your KubeGraf URL)

## Features

### 1. Job Creation

#### Python Script Upload
- Upload `.py` training scripts directly
- Scripts are packaged into Docker containers automatically
- Supports standard ML libraries (PyTorch, TensorFlow, scikit-learn)

#### Docker Image
- Use pre-built Docker images
- Specify custom image from registry
- Supports GPU-enabled images

#### Job Configuration
- **Job Name**: Unique identifier
- **Namespace**: Kubernetes namespace
- **Script/Image**: Training code
- **Resources**: CPU, Memory, GPU
- **Restart Policy**: Never, OnFailure, Always
- **Environment Variables**: Custom env vars
- **Volume Mounts**: PVC for data/models

### 2. Resource Management

#### CPU Resources
- **Requests**: Minimum CPU guaranteed
- **Limits**: Maximum CPU allowed
- Format: `1`, `2`, `500m`, `0.5`

#### Memory Resources
- **Requests**: Minimum memory guaranteed
- **Limits**: Maximum memory allowed
- Format: `2Gi`, `4Gi`, `512Mi`, `8G`

#### GPU Resources
- **GPU Type**: `nvidia.com/gpu`
- **Count**: Number of GPUs (1, 2, 4, etc.)
- Requires GPU nodes in cluster
- Automatically sets node selector

### 3. Environment Variables
- Add custom environment variables
- Examples:
  - `MODEL_PATH=/models/model.pt`
  - `EPOCHS=100`
  - `BATCH_SIZE=32`
  - `LEARNING_RATE=0.001`

### 4. Volume Mounts
- **PVC**: Persistent Volume Claims for data
- **Mount Path**: Where to mount in container
- Use for: Training data, model checkpoints, logs

## How It Works

### Job Submission Process

1. **Script/Image Upload**
   - User uploads Python script or specifies Docker image
   - If script: Auto-generates Dockerfile
   - Creates Kubernetes Job resource

2. **Kubernetes Job Creation**
   - Backend generates Job YAML:
     - **Job**: Kubernetes Job resource
     - **Pod Template**: Container spec with resources
     - **Volumes**: PVC mounts if specified
     - **Environment**: Env vars from form

3. **Execution**
   - Kubernetes schedules job pod
   - Pod runs training script
   - Job completes when script exits

### Architecture

```
┌─────────────────┐
│  Python Script │
│  or Docker Image│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Kubernetes Job │
│  (batch/v1)     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Pod            │
│  (Training)     │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌────────┐ ┌────────┐
│  Logs  │ │ Metrics│
│(Stream)│ │(CPU/GPU)│
└────────┘ └────────┘
```

## Usage Examples

### Example 1: Simple Training Job

1. Click **"+ Create Job"** button
2. Fill in:
   - **Job Name**: `train-classifier`
   - **Namespace**: `ml-training`
   - **Script**: Upload `train.py`
   - **CPU**: `4`
   - **Memory**: `8Gi`
3. Click **"Create Job"**
4. Monitor progress in job details

### Example 2: GPU Training Job

1. Create job with:
   - **Docker Image**: `pytorch/pytorch:latest`
   - **GPU**: `1`
   - **CPU**: `8`
   - **Memory**: `16Gi`
2. Job will run on GPU nodes
3. Monitor GPU usage in metrics

### Example 3: Training with Data Volume

1. Create PVC for training data:
   ```bash
   kubectl create pvc training-data --size=100Gi
   ```
2. In job form:
   - **Volume Mounts**: Select `training-data` PVC
   - **Mount Path**: `/data`
3. Script can access data at `/data`

### Example 4: Training with Environment Variables

1. Add environment variables:
   - `EPOCHS=50`
   - `BATCH_SIZE=64`
   - `LEARNING_RATE=0.01`
2. Script can access via `os.environ`

## Monitoring Training Jobs

### Job Status

- **Active**: Job is running
- **Succeeded**: Job completed successfully
- **Failed**: Job failed (check logs)

### Real-time Logs

1. Click on job name
2. Navigate to **"Logs"** tab
3. View streaming logs
4. Click **"Start Streaming"** for live updates

### Job Details

- **Status**: Current job state
- **Image**: Docker image used
- **Resources**: CPU, Memory, GPU
- **Created**: Job creation time
- **Completed**: Job completion time (if finished)

### Logs Tab

- **Refresh Logs**: Fetch latest logs
- **Start/Stop Streaming**: Toggle live log streaming
- **Auto-scroll**: Automatically scroll to latest

## Best Practices

### 1. Resource Allocation

**Small Jobs** (simple models):
- CPU: 2-4 cores
- Memory: 4-8Gi
- GPU: 0

**Medium Jobs** (CNNs, RNNs):
- CPU: 4-8 cores
- Memory: 8-16Gi
- GPU: 1

**Large Jobs** (LLMs, large models):
- CPU: 8-16 cores
- Memory: 32-64Gi
- GPU: 2-4

### 2. Script Organization

```python
# train.py example
import os
import torch

def main():
    epochs = int(os.environ.get('EPOCHS', 10))
    batch_size = int(os.environ.get('BATCH_SIZE', 32))
    
    # Training code
    model = create_model()
    train(model, epochs, batch_size)
    
    # Save model
    torch.save(model.state_dict(), '/models/model.pt')

if __name__ == '__main__':
    main()
```

### 3. Data Management
- Use PVCs for large datasets
- Mount data at `/data` or `/datasets`
- Save checkpoints to mounted volumes
- Clean up temporary files

### 4. Error Handling
- Add try/except blocks in scripts
- Log errors to stdout/stderr
- Exit with non-zero code on failure
- Kubernetes will retry based on restart policy

### 5. Resource Limits
- Set reasonable CPU/memory limits
- Avoid over-allocating resources
- Monitor actual usage and adjust
- Use GPU only when necessary

## Troubleshooting

### Job Not Starting
1. Check namespace exists
2. Verify resource availability
3. Check image pull permissions
4. Review job events: `kubectl describe job {name}`

### Job Failing
1. View logs in **Logs** tab
2. Check exit code
3. Verify script syntax
4. Check resource limits (OOMKilled)

### GPU Not Available
1. Verify GPU nodes: `kubectl get nodes -l accelerator=nvidia-tesla-k80`
2. Check device plugin: `kubectl get pods -n kube-system | grep nvidia`
3. Verify GPU request format: `nvidia.com/gpu: "1"`

### Logs Not Showing
1. Check pod status: `kubectl get pods`
2. Verify pod is running
3. Check log streaming is enabled
4. Refresh logs manually

## API Reference

### Backend Endpoints

- `POST /api/ml/jobs/create` - Create training job
- `GET /api/ml/jobs/list?namespace={ns}` - List jobs
- `GET /api/ml/jobs/get?name={name}&namespace={ns}` - Get job
- `POST /api/ml/jobs/delete` - Delete job
- `GET /api/ml/jobs/logs?name={name}&namespace={ns}` - Get logs
- `WS /ws/ml/jobs/logs` - WebSocket log streaming

### Request Format

**Create Job:**
```json
{
  "name": "train-model",
  "namespace": "default",
  "script": "base64-encoded-python-script",
  "image": "pytorch/pytorch:latest",
  "resources": {
    "cpu": "4",
    "memory": "8Gi",
    "gpu": "1"
  },
  "restartPolicy": "Never",
  "envVars": {
    "EPOCHS": "50",
    "BATCH_SIZE": "32"
  },
  "volumeMounts": [
    {
      "name": "data",
      "pvcName": "training-data",
      "mountPath": "/data"
    }
  ]
}
```

## Related Features

- **Inference Services**: Deploy trained models
- **MLflow**: Track experiments and log metrics
- **Resource Map**: Visualize job resources

## Support

For issues or questions:
1. Check job logs in the UI
2. Review Kubernetes events: `kubectl get events`
3. Check pod status: `kubectl get pods`
4. Review job YAML in job details

