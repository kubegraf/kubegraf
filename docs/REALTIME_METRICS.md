# Realtime CPU/Memory Monitoring

KubeGraf includes a production-ready realtime monitoring system for cluster CPU and memory utilization. This document explains how it works and how to verify it's functioning correctly.

## Features

- **KPI Cards**: Cluster CPU%, Memory%, Peak Node CPU%, Peak Node Memory%
- **Realtime Chart**: Live-updating graph showing CPU and Memory over time (last 15 minutes)
- **Status Indicators**: Normal (<60%), Moderate (60-80%), Hot (>80%)
- **Automatic Fallback**: Uses Metrics API when available, falls back to kubelet Summary API
- **WebSocket Streaming**: Efficient delta updates, not full history each tick

## Data Sources

### Primary: Kubernetes Metrics API

KubeGraf first attempts to use the Kubernetes Metrics API (`metrics.k8s.io/v1beta1`), which is provided by metrics-server.

**To verify Metrics API is available:**
```bash
kubectl top nodes
```

If this command works, KubeGraf will use the Metrics API.

### Fallback: kubelet Summary API

If the Metrics API is unavailable (metrics-server not installed, or RBAC restrictions), KubeGraf falls back to the kubelet Summary API, accessing node stats via the apiserver proxy.

**To verify Summary API is available:**
```bash
kubectl get --raw "/api/v1/nodes/<node-name>/proxy/stats/summary"
```

Replace `<node-name>` with an actual node name from your cluster.

## Architecture

### Backend (Go)

- **`pkg/metrics/types.go`**: Data structures (MetricPoint, RingBuffer, Config)
- **`pkg/metrics/collector.go`**: Metrics collection with dual-source support
- **`pkg/metrics/hub.go`**: WebSocket hub for broadcasting to clients

### Endpoints

| Endpoint | Type | Description |
|----------|------|-------------|
| `/ws/metrics` | WebSocket | Realtime streaming endpoint |
| `/api/metrics/snapshot` | GET | Returns current buffer as JSON |
| `/api/metrics/status` | GET | Returns collector status |

### Frontend (SolidJS)

- **`stores/metricsStore.ts`**: WebSocket connection and state management
- **`components/metrics/CpuMemChart.tsx`**: Main realtime chart
- **`components/metrics/Sparkline.tsx`**: Small sparkline for KPI cards
- **`components/metrics/MetricsStatusBanner.tsx`**: Connection status banner

## Configuration

The collector uses the following defaults (configurable in code):

| Setting | Default | Description |
|---------|---------|-------------|
| Interval | 5 seconds | How often metrics are collected |
| Max Points | 180 | Points to store (15 minutes at 5s) |
| Top Nodes Count | 5 | Number of top nodes to include |

## WebSocket Protocol

### On Connect
Client receives a snapshot of all buffered points:
```json
{
  "type": "snapshot",
  "points": [...]
}
```

### On Each Tick
Client receives only the new point:
```json
{
  "type": "point",
  "point": {
    "ts": 1734567890,
    "cluster": {"cpuPct": 45.2, "memPct": 62.1},
    "peaks": {"cpuPct": 78.5, "memPct": 85.3},
    "topNodes": [...],
    "source": "metrics_api"
  }
}
```

### Error States
```json
{
  "type": "status",
  "source": "unavailable",
  "error": "Metrics unavailable: connection refused"
}
```

## RBAC Requirements

For metrics collection to work, the service account needs:

**For Metrics API:**
- `get`, `list` on `nodes` (core API)
- `get`, `list` on `nodes.metrics.k8s.io`

**For Summary API fallback:**
- `get`, `list` on `nodes` (core API)
- `get` on `nodes/proxy` (to access kubelet stats)

## Troubleshooting

### "Metrics unavailable" shown in UI

1. Check if metrics-server is installed: `kubectl -n kube-system get pods | grep metrics-server`
2. Verify RBAC permissions
3. Check KubeGraf logs for specific errors

### Empty charts but no error

1. Wait 10-15 seconds for initial data collection
2. Check browser console for WebSocket errors
3. Verify `/api/metrics/status` returns `available: true`

### High CPU usage in browser

The chart is designed for efficient updates. If you experience performance issues:
1. Reduce browser tab count
2. Check if other extensions are interfering
3. Report the issue with browser/OS details

## Performance

- Ring buffer prevents memory growth
- WebSocket delta updates minimize bandwidth
- SVG charts render efficiently without heavy libraries
- Collection runs in a single goroutine per cluster
- Worker pool limits concurrent node API calls (max 5)

