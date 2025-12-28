# Sample Nginx Helm Chart

A simple Nginx Helm chart for testing Kubegraf custom apps functionality.

## Installation

```bash
helm install my-nginx ./sample-nginx
```

## Configuration

| Parameter | Description | Default |
|-----------|-------------|---------|
| `replicaCount` | Number of replicas | `2` |
| `image.repository` | Image repository | `nginx` |
| `image.tag` | Image tag | `1.25.0` |
| `service.type` | Service type | `ClusterIP` |
| `service.port` | Service port | `80` |
| `resources.limits.cpu` | CPU limit | `100m` |
| `resources.limits.memory` | Memory limit | `128Mi` |

## Testing

To test with Kubegraf:
1. Package the chart: `helm package sample-nginx/`
2. Upload via Kubegraf UI Custom Apps section
3. Deploy and monitor the application
