# Cluster Connection Health Check System

## Overview

This implementation adds real-time cluster connection health monitoring to detect when authentication expires or the cluster becomes unreachable. The system continuously validates the connection and updates the UI to reflect the actual cluster status.

## Problem Solved

**Issue**: KubeGraf showed "Cluster Connected" even when `kubectl` commands failed due to expired GCP authentication or other connectivity issues.

**Solution**: Implemented a periodic health check system that validates cluster connectivity every 30 seconds by calling the Kubernetes API server. When health checks fail consecutively, the connection status is automatically updated to reflect the disconnected state.

## Architecture

### Backend Components

#### 1. Health Monitor Service (`internal/health/cluster_health.go`)
- **Purpose**: Monitors cluster connection health in the background
- **Key Features**:
  - Periodic health checks (default: every 30 seconds)
  - Configurable timeout (default: 5 seconds)
  - Tracks consecutive failures before marking unhealthy
  - Provides real-time status updates via callbacks
  - Records response times and last successful check

- **Health Check Logic**:
  ```go
  // Health check validates connection by calling ServerVersion()
  1. Create timeout context (5 seconds)
  2. Call clientset.Discovery().ServerVersion()
  3. Track response time
  4. Update health status
  5. Trigger callback on status change
  ```

- **Status Change Threshold**:
  - Marks unhealthy after 3 consecutive failures
  - Immediately marks healthy on first success
  - Prevents false positives from transient network issues

#### 2. Web Endpoints (`web_cluster_health.go`)
- `GET /api/clusters/health` - Returns current health status
- `POST /api/clusters/health/check` - Triggers immediate health check

#### 3. App Integration (`app.go`, `types.go`)
- Health monitor initialized when cluster connects
- Automatically started with periodic checks
- Status change callback updates `app.connected` and `app.connectionError`
- Health monitor stopped on disconnect

### Frontend Components

#### 1. API Types (`ui/solid/src/services/api.ts`)
```typescript
export interface ClusterHealthStatus {
  healthy: boolean;
  lastCheck: string;
  lastSuccess?: string;
  errorMessage?: string;
  responseTimeMs?: number;
  serverVersion?: string;
}
```

#### 2. API Methods
- `api.getClusterHealth()` - Fetch current health status
- `api.forceHealthCheck()` - Trigger immediate check

## Implementation Details

### Health Check Flow

```
1. User connects to cluster
   ↓
2. Health monitor initialized and started
   ↓
3. Periodic checks every 30 seconds
   ↓
4. Health check validates connection:
   - Success: Update lastSuccess, mark healthy
   - Failure: Increment consecutive failures
   ↓
5. After 3 consecutive failures:
   - Mark unhealthy
   - Update app.connected = false
   - Set app.connectionError with error message
   - Trigger status change callback
   ↓
6. UI polls /api/clusters/status
   ↓
7. UI shows "Disconnected" status with error message
```

### Key Features

1. **Automatic Detection**
   - Detects expired authentication (GCP, AWS, Azure)
   - Detects cluster unreachability
   - Detects network connectivity issues

2. **Resilience**
   - Tolerates transient failures (3 failure threshold)
   - Configurable check interval and timeout
   - Non-blocking health checks

3. **Real-Time Updates**
   - Status change callbacks for instant UI updates
   - Tracks last successful connection time
   - Records response times for performance monitoring

4. **Resource Efficient**
   - Lightweight ServerVersion() API call
   - Configurable check interval (default 30s)
   - Background goroutines with proper cleanup

## Usage

### Backend

The health monitor is automatically initialized when connecting to a cluster:

```go
// In app.Connect()
a.healthMonitor = health.NewClusterHealthMonitor(
    clientset,
    30*time.Second, // Check interval
    5*time.Second,  // Timeout
)

a.healthMonitor.SetStatusChangeCallback(func(status *health.ClusterHealthStatus) {
    if !status.Healthy {
        a.connected = false
        a.connectionError = status.ErrorMessage
    } else {
        a.connected = true
        a.connectionError = ""
    }
})

a.healthMonitor.Start()
```

### Frontend

Fetch cluster health status:

```typescript
import { api } from '../services/api';

// Get current health status
const health = await api.getClusterHealth();

if (!health.healthy) {
    console.log(`Cluster unhealthy: ${health.errorMessage}`);
    console.log(`Last successful check: ${health.lastSuccess}`);
}

// Force an immediate health check
const result = await api.forceHealthCheck();
console.log(`Health check result: ${result.status.healthy}`);
```

## Configuration

### Health Monitor Settings

| Setting | Default | Description |
|---------|---------|-------------|
| Check Interval | 30 seconds | How often to perform health checks |
| Timeout | 5 seconds | Maximum time to wait for API response |
| Max Consecutive Fails | 3 | Failures before marking unhealthy |

### Customization

```go
// Create custom health monitor
monitor := health.NewClusterHealthMonitor(
    clientset,
    60*time.Second, // Check every minute
    10*time.Second, // 10 second timeout
)
```

## Testing

### Manual Testing

1. **Connect to a GKE cluster**:
   ```bash
   gcloud container clusters get-credentials <cluster> --region <region>
   ```

2. **Start KubeGraf**:
   ```bash
   ./kubegraf web --port 3003
   ```

3. **Verify initial connection**:
   - UI shows "Cluster Connected"
   - Health check endpoint returns `healthy: true`

4. **Simulate auth expiry**:
   ```bash
   # Invalidate GCP credentials
   gcloud auth revoke
   ```

5. **Wait 30-90 seconds** (for 3 consecutive failures)

6. **Verify disconnection detection**:
   - UI updates to show "Disconnected"
   - Error message shows authentication failure
   - Health check endpoint returns `healthy: false`

### Health Check Endpoint Testing

```bash
# Get current health status
curl http://localhost:3003/api/clusters/health

# Force immediate health check
curl -X POST http://localhost:3003/api/clusters/health/check
```

## Benefits

1. **Accurate Status Display**
   - UI always reflects actual cluster connectivity
   - No false positives from stale kubeconfig

2. **Better User Experience**
   - Clear error messages when connection fails
   - Automatic status updates without page refresh

3. **Proactive Problem Detection**
   - Detects auth expiry before user attempts operations
   - Identifies network/connectivity issues early

4. **Debugging Support**
   - Response time tracking
   - Last successful check timestamp
   - Detailed error messages

## Future Enhancements

1. **Reconnection Attempts**
   - Automatically attempt to refresh auth tokens
   - Retry connection with exponential backoff

2. **Health Metrics**
   - Track average response times
   - Monitor failure patterns
   - Alert on degraded performance

3. **Multi-Cluster Health**
   - Monitor health of all connected clusters
   - Aggregate health status

4. **Custom Health Checks**
   - Configurable health check endpoints
   - Custom validation logic
   - Application-specific health criteria

## Files Modified/Created

### New Files
- `internal/health/cluster_health.go` - Health monitoring service
- `web_cluster_health.go` - HTTP endpoints for health status
- `CLUSTER_HEALTH_CHECK.md` - This documentation

### Modified Files
- `types.go` - Added `healthMonitor` field to App struct
- `app.go` - Initialize and start health monitor on connection
- `web_server.go` - Register health check HTTP endpoints
- `ui/solid/src/services/api.ts` - Added health check types and API methods

## API Documentation

### GET /api/clusters/health

Returns the current cluster health status.

**Response**:
```json
{
  "healthy": true,
  "lastCheck": "2025-01-03T10:30:00Z",
  "lastSuccess": "2025-01-03T10:30:00Z",
  "responseTimeMs": 45,
  "serverVersion": "v1.28.3-gke.1234"
}
```

### POST /api/clusters/health/check

Triggers an immediate health check and returns the result.

**Response**:
```json
{
  "success": true,
  "status": {
    "healthy": false,
    "lastCheck": "2025-01-03T10:30:30Z",
    "lastSuccess": "2025-01-03T10:28:00Z",
    "errorMessage": "Get \"https://cluster.endpoint\": context deadline exceeded",
    "responseTimeMs": 5000
  }
}
```

## Error Scenarios

| Scenario | Behavior | Error Message |
|----------|----------|---------------|
| GCP Auth Expired | Unhealthy after 3 checks | "unable to get valid credentials" |
| Cluster Unreachable | Unhealthy after 3 checks | "context deadline exceeded" |
| Network Disconnected | Unhealthy after 3 checks | "no route to host" |
| Invalid Kubeconfig | Immediate failure | "invalid configuration" |

## Conclusion

The cluster health check system provides real-time, accurate monitoring of Kubernetes cluster connectivity. It automatically detects authentication expiry, network issues, and cluster unreachability, ensuring the UI always reflects the true connection status.
