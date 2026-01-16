# ML Application Deployment Guide

## Overview

Deploy production-ready ML workloads on Kubernetes with KubeGraf.

## Supported ML Frameworks

- **MLFlow** - Experiment tracking, model registry
- **Kubeflow** - End-to-end ML workflow orchestration
- **JupyterHub** - Multi-user Jupyter notebooks
- **TensorFlow Serving** - Model serving
- **PyTorch Serve** - PyTorch model serving
- **Seldon Core** - ML deployment platform

## Quick Start

### Deploy MLFlow

**From Marketplace:**
1. Marketplace → Search "MLFlow"
2. Select namespace (e.g., `ml-platform`)
3. Configure:
   - Enable S3/Azure Blob backend
   - PostgreSQL for metadata
   - Expose via Ingress
4. Click **Install**

**Deployment includes:**
```
ml-platform namespace:
├── mlflow-server (tracking + UI)
├── postgresql (metadata store)
├── minio (artifact storage)
└── mlflow-ingress (HTTPS access)
```

**Access UI:**
```
https://mlflow.your-domain.com
```

### Deploy Kubeflow

**From Marketplace:**
1. Marketplace → Search "Kubeflow"
2. Select profile: `minimal` or `full`
3. Configure components:
   - ✅ Pipelines
   - ✅ Notebooks
   - ✅ KFServing
   - ⬜ Katib (hyperparameter tuning)
4. Click **Install** (15-20 min)

**Components deployed:**
```
kubeflow namespace:
├── kubeflow-pipelines
├── jupyter-web-app
├── kfserving-controller
├── istio-system (service mesh)
└── knative-serving
```

## Best Practices

### Resource Allocation

**Training Workloads:**
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: ml-training
spec:
  containers:
  - name: trainer
    image: pytorch/pytorch:latest
    resources:
      requests:
        cpu: 4
        memory: 16Gi
        nvidia.com/gpu: 1
      limits:
        cpu: 8
        memory: 32Gi
        nvidia.com/gpu: 1
```

**Inference Workloads:**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ml-inference
spec:
  replicas: 3
  template:
    spec:
      containers:
      - name: model-server
        image: tensorflow/serving:latest
        resources:
          requests:
            cpu: 2
            memory: 4Gi
          limits:
            cpu: 4
            memory: 8Gi
```

### GPU Support

**Enable GPU nodes:**
```bash
# GKE
gcloud container node-pools create gpu-pool \
  --cluster=my-cluster \
  --accelerator type=nvidia-tesla-t4,count=1 \
  --num-nodes=2

# EKS
eksctl create nodegroup \
  --cluster=my-cluster \
  --name=gpu-nodes \
  --instance-types=p3.2xlarge \
  --nodes=2
```

**Install NVIDIA device plugin:**
```bash
kubectl apply -f https://raw.githubusercontent.com/NVIDIA/k8s-device-plugin/master/nvidia-device-plugin.yml
```

**Verify:**
```bash
kubectl get nodes -o json | jq '.items[].status.capacity'
# Should show: "nvidia.com/gpu": "1"
```

### Model Serving

**TensorFlow Serving:**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: tensorflow-serving
spec:
  replicas: 2
  template:
    spec:
      containers:
      - name: serving
        image: tensorflow/serving:latest
        ports:
        - containerPort: 8501
          name: http
        - containerPort: 8500
          name: grpc
        env:
        - name: MODEL_NAME
          value: my-model
        volumeMounts:
        - name: model-storage
          mountPath: /models
      volumes:
      - name: model-storage
        persistentVolumeClaim:
          claimName: model-pvc
---
apiVersion: v1
kind: Service
metadata:
  name: tensorflow-serving
spec:
  type: LoadBalancer
  ports:
  - port: 8501
    name: http
  - port: 8500
    name: grpc
  selector:
    app: tensorflow-serving
```

**PyTorch Serve:**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: torchserve
spec:
  replicas: 3
  template:
    spec:
      containers:
      - name: torchserve
        image: pytorch/torchserve:latest
        ports:
        - containerPort: 8080
          name: inference
        - containerPort: 8081
          name: management
        resources:
          limits:
            cpu: 4
            memory: 8Gi
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: torchserve-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: torchserve
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

### Data Storage

**Persistent Volumes for Models:**
```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: model-pvc
spec:
  accessModes:
  - ReadWriteMany
  storageClassName: standard
  resources:
    requests:
      storage: 100Gi
```

**S3/Azure Blob for Artifacts:**
```yaml
# MLFlow with S3
env:
- name: MLFLOW_S3_ENDPOINT_URL
  value: "https://s3.amazonaws.com"
- name: AWS_ACCESS_KEY_ID
  valueFrom:
    secretKeyRef:
      name: aws-credentials
      key: access-key-id
- name: AWS_SECRET_ACCESS_KEY
  valueFrom:
    secretKeyRef:
      name: aws-credentials
      key: secret-access-key
```

## Helm Charts

### MLFlow Chart

```yaml
# values.yaml
replicaCount: 2

backend:
  type: postgresql
  postgresql:
    host: postgresql
    port: 5432
    database: mlflow
    username: mlflow
    password: changeme

artifact:
  type: s3
  s3:
    bucket: mlflow-artifacts
    region: us-west-2

ingress:
  enabled: true
  hostname: mlflow.example.com
  tls: true

resources:
  limits:
    cpu: 2
    memory: 4Gi
  requests:
    cpu: 1
    memory: 2Gi
```

**Deploy:**
```bash
helm install mlflow kubegraf/mlflow \
  -n ml-platform \
  -f values.yaml
```

### Kubeflow Pipelines Chart

```yaml
# values.yaml
minio:
  enabled: true
  persistence:
    size: 100Gi

mysql:
  enabled: true
  persistence:
    size: 20Gi

pipeline:
  replicas: 2
  resources:
    limits:
      cpu: 2
      memory: 4Gi
```

## CI/CD for ML

**ArgoCD + MLFlow integration:**

```yaml
# ml-model-deployment.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: ml-model-prod
spec:
  source:
    repoURL: https://github.com/org/ml-models
    path: deployments/prod
    targetRevision: HEAD
  destination:
    server: https://kubernetes.default.svc
    namespace: ml-prod
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
```

**GitOps workflow:**
1. Train model → Log to MLFlow
2. Register model in MLFlow registry
3. Update K8s manifest with new model version
4. Push to Git
5. ArgoCD auto-deploys

## Monitoring & Observability

**Prometheus metrics for ML workloads:**
```yaml
apiVersion: v1
kind: ServiceMonitor
metadata:
  name: ml-inference
spec:
  selector:
    matchLabels:
      app: ml-inference
  endpoints:
  - port: metrics
    interval: 30s
```

**Key metrics:**
- Model inference latency (p50, p95, p99)
- Prediction throughput (req/sec)
- GPU utilization
- Model accuracy drift
- Error rates

**Grafana dashboards:**
- KubeGraf includes pre-built ML dashboards
- View in **Observability → Grafana**

## Cost Optimization

**Spot instances for training:**
```yaml
nodeSelector:
  workload: training
  instance-type: spot

tolerations:
- key: "spot"
  operator: "Equal"
  value: "true"
  effect: "NoSchedule"
```

**Auto-scaling for inference:**
```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: ml-inference-hpa
spec:
  minReplicas: 2
  maxReplicas: 20
  metrics:
  - type: Pods
    pods:
      metric:
        name: inference_requests_per_second
      target:
        type: AverageValue
        averageValue: "100"
```

**Vertical Pod Autoscaler:**
```yaml
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: ml-inference-vpa
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: ml-inference
  updatePolicy:
    updateMode: "Auto"
```

## Security

**Secrets management:**
```bash
# Create secret for model credentials
kubectl create secret generic model-credentials \
  --from-literal=api-key=xxx \
  --from-literal=s3-access-key=yyy \
  -n ml-platform
```

**RBAC for ML namespaces:**
```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: ml-developer
  namespace: ml-platform
rules:
- apiGroups: [""]
  resources: ["pods", "pods/log"]
  verbs: ["get", "list", "watch"]
- apiGroups: ["apps"]
  resources: ["deployments"]
  verbs: ["get", "list", "update"]
```

## Troubleshooting

**GPU not detected:**
```bash
kubectl describe node <gpu-node>
# Check: nvidia.com/gpu capacity

# Verify device plugin
kubectl get pods -n kube-system -l name=nvidia-device-plugin-ds
```

**Model loading issues:**
```bash
# Check PVC binding
kubectl get pvc -n ml-platform

# Verify model files
kubectl exec -it <pod-name> -- ls -lh /models
```

**Out of memory:**
```yaml
# Increase memory limits
resources:
  limits:
    memory: 32Gi  # Increase from 16Gi
```

## Pro Features

- **MLOps pipelines** - Automated training → testing → deployment
- **A/B testing** - Split traffic between model versions
- **Feature stores** - Centralized feature management
- **Model monitoring** - Drift detection & alerting
- **Cost forecasting** - ML-based cloud cost prediction

**Upgrade to Pro**: https://kubegraf.io/pricing

---

**Examples**: https://github.com/kubegraf/ml-examples
**Support**: https://kubegraf.io/docs/ml
