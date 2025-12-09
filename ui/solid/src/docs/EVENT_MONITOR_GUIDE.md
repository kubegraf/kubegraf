# Event Monitor & Real-time Event Stream - Production Guide

## Overview

### Event Monitor
The **Event Monitor** is a comprehensive dashboard that aggregates, analyzes, and displays Kubernetes cluster events over time. It provides:

1. **Historical Analysis**: View events from the past (timeline, grouped by time periods)
2. **Pattern Detection**: Identify recurring issues, trends, and correlations
3. **Severity Classification**: Categorize events by criticality (Critical, High, Medium, Low, Info)
4. **Multi-view Analysis**: 
   - **Timeline View**: Chronological list of all events
   - **Grouped View**: Events grouped by time windows (15m, 1h, 6h, 24h)
   - **Log Errors View**: HTTP errors from application logs

### Real-time Event Stream
The **Real-time Event Stream** is a live feed that shows events as they happen in your cluster:

1. **Immediate Visibility**: See issues the moment they occur
2. **Live Monitoring**: Monitor cluster health in real-time
3. **Alerting**: Get instant notifications for critical events
4. **Operational Awareness**: Stay informed about cluster state changes

## Use Cases

### Event Monitor Use Cases:
- **Post-incident Analysis**: "What happened in the last hour?"
- **Trend Analysis**: "Are pod failures increasing?"
- **Root Cause Investigation**: "What events led to this deployment failure?"
- **Capacity Planning**: "How often do we hit resource limits?"

### Real-time Event Stream Use Cases:
- **Immediate Response**: React to critical issues instantly
- **Live Debugging**: Watch events while troubleshooting
- **Alerting**: Get notified of critical events immediately
- **Operational Monitoring**: Monitor cluster during deployments

## Production Best Practices

### 1. Event Filtering & Prioritization
- **Filter by Severity**: Focus on Critical/High severity events first
- **Filter by Namespace**: Monitor production namespaces separately
- **Filter by Type**: Separate infrastructure vs application events

### 2. Event Correlation
- **Group Related Events**: Events from the same resource/timeframe
- **Identify Patterns**: Recurring issues indicate systemic problems
- **Correlation Rules**: Link related events (e.g., node failure → pod evictions)

### 3. Alerting & Notifications
- **Critical Events**: Immediate alerts (PagerDuty, Slack, etc.)
- **High Severity**: Notifications to on-call engineers
- **Medium/Low**: Logged for review during regular maintenance

### 4. Retention & Storage
- **Hot Storage**: Last 24-48 hours in memory for fast access
- **Warm Storage**: Last 7-30 days in database for analysis
- **Cold Storage**: Archive older events for compliance/audit

### 5. Performance Considerations
- **Rate Limiting**: Limit event processing to prevent overload
- **Batching**: Batch similar events to reduce noise
- **Sampling**: For high-volume clusters, sample non-critical events

## Understanding Your Current Events

The events you're seeing indicate:
- **Type**: `FailedCreatePodSandBox`
- **Root Cause**: Cilium CNI agent is not running or not accessible
- **Impact**: Pods cannot be created, deployments are failing
- **Severity**: MEDIUM (but should be HIGH/CRITICAL for production)

**Action Required**: 
1. Check if Cilium daemonset is running: `kubectl get pods -n kube-system | grep cilium`
2. Verify Cilium socket exists: Check `/var/run/cilium/cilium.sock` on nodes
3. Restart Cilium if needed: `kubectl rollout restart daemonset/cilium -n kube-system`

## Production-Grade Improvements Needed

1. **Event Deduplication**: Your events show duplicates (566x, 637x, 239x) - these should be grouped
2. **Severity Escalation**: Failed pod creation should be HIGH/CRITICAL, not MEDIUM
3. **Auto-remediation**: Automatically restart Cilium when this error is detected
4. **Alerting Integration**: Send alerts to PagerDuty/Slack for critical events
5. **Event Correlation**: Link related events (pod failures → node issues → CNI problems)

