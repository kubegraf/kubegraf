# Connectors Guide for KubeGraf

## Overview

KubeGraf Connectors allow you to integrate with external services to receive notifications, trigger actions, and automate workflows based on cluster events, anomalies, and recommendations.

## What are Connectors?

Connectors are integrations that enable KubeGraf to communicate with external services like:
- **GitHub** - Create issues, comments, or pull requests
- **Slack** - Send notifications to channels or users
- **PagerDuty** - Trigger incidents for critical alerts
- **Webhooks** - Send HTTP POST requests to any endpoint
- **Email** - Send email notifications (coming soon)
- **Microsoft Teams** - Send notifications to Teams channels (coming soon)

## Use Cases

### 1. **Alerting & Notifications**

**Slack Integration:**
- Get notified when pods crash
- Receive alerts for high CPU usage
- Get daily cost reports
- Alert on security vulnerabilities

**Example Setup:**
```json
{
  "name": "Production Alerts",
  "type": "slack",
  "config": {
    "webhook_url": "https://hooks.slack.com/services/YOUR/WEBHOOK/URL",
    "channel": "#k8s-alerts",
    "events": ["pod_crash", "high_cpu", "security_issue"]
  }
}
```

### 2. **Issue Tracking**

**GitHub Integration:**
- Automatically create GitHub issues for critical events
- Link cluster events to code repositories
- Track remediation tasks

**Example Setup:**
```json
{
  "name": "Auto-Issue Creator",
  "type": "github",
  "config": {
    "token": "ghp_xxxxxxxxxxxx",
    "repo": "myorg/my-repo",
    "labels": ["kubernetes", "incident"],
    "events": ["pod_crash", "node_down"]
  }
}
```

### 3. **Incident Management**

**PagerDuty Integration:**
- Trigger incidents for critical cluster issues
- Escalate based on severity
- Integrate with on-call schedules

**Example Setup:**
```json
{
  "name": "Critical Alerts",
  "type": "pagerduty",
  "config": {
    "integration_key": "xxxxxxxxxxxxxxxx",
    "severity": "critical",
    "events": ["node_down", "cluster_unhealthy"]
  }
}
```

### 4. **Custom Integrations**

**Webhook Integration:**
- Send events to any HTTP endpoint
- Integrate with custom systems
- Build your own automation

**Example Setup:**
```json
{
  "name": "Custom Webhook",
  "type": "webhook",
  "config": {
    "url": "https://api.example.com/kubegraf/events",
    "method": "POST",
    "headers": {
      "Authorization": "Bearer YOUR_TOKEN"
    },
    "events": ["all"]
  }
}
```

## Setting Up Connectors

### Step 1: Access Connectors Page

1. Open KubeGraf UI
2. Navigate to **Integrations** → **Connectors** in the sidebar
3. Click **Add Connector**

### Step 2: Choose Connector Type

Select the type of connector you want to create:
- **Slack** - For Slack notifications
- **GitHub** - For GitHub issues/comments
- **PagerDuty** - For incident management
- **Webhook** - For custom integrations

### Step 3: Configure Connector

Fill in the required configuration:

#### Slack Configuration

1. **Name**: Give your connector a descriptive name (e.g., "Production Alerts")
2. **Webhook URL**: 
   - Go to https://api.slack.com/apps
   - Create a new app or use existing
   - Enable "Incoming Webhooks"
   - Copy the webhook URL
3. **Channel**: Optional channel override (e.g., "#k8s-alerts")
4. **Events**: Select which events to send (pod crashes, high CPU, etc.)

#### GitHub Configuration

1. **Name**: Descriptive name (e.g., "Auto-Issue Creator")
2. **Token**: 
   - Go to GitHub Settings → Developer settings → Personal access tokens
   - Create token with `repo` scope
   - Copy the token
3. **Repository**: Format: `owner/repo` (e.g., "myorg/my-repo")
4. **Labels**: Comma-separated labels to add to issues
5. **Events**: Select which events create issues

#### PagerDuty Configuration

1. **Name**: Descriptive name (e.g., "Critical Alerts")
2. **Integration Key**: 
   - Go to PagerDuty → Services → Your Service
   - Add "Events API v2" integration
   - Copy the integration key
3. **Severity**: Minimum severity to trigger (critical, high, medium, low)
4. **Events**: Select which events trigger incidents

#### Webhook Configuration

1. **Name**: Descriptive name (e.g., "Custom Integration")
2. **URL**: Your webhook endpoint URL
3. **Method**: HTTP method (POST, PUT, etc.)
4. **Headers**: Optional custom headers (JSON format)
5. **Events**: Select which events to send

### Step 4: Test Connector

Click **Test Connector** to verify the configuration works. KubeGraf will send a test event to verify connectivity.

### Step 5: Enable Connector

Toggle the connector to **Enabled** to start receiving events.

## Event Types

Connectors can be configured to trigger on various event types:

### Infrastructure Events
- `node_scaled_down` - Node was scaled down
- `node_unhealthy` - Node is unhealthy
- `pod_restarted` - Pod was restarted
- `pod_crash_loop` - Pod is in crash loop
- `pod_oom_restart` - Pod restarted due to OOM

### Application Events
- `deployment_scaled` - Deployment was scaled
- `hpa_maxed` - HPA reached max replicas
- `service_unavailable` - Service is unavailable

### Log Events
- `http_500` - HTTP 500 errors detected
- `http_502` - HTTP 502 errors detected
- `failed_post` - POST requests failing

### Security Events
- `security_vulnerability` - Security vulnerability detected
- `rbac_violation` - RBAC violation detected
- `unauthorized_access` - Unauthorized access attempt

### Cost Events
- `cost_threshold_exceeded` - Monthly cost exceeded threshold
- `idle_resource_detected` - Idle resources detected

### ML Recommendations
- `high_impact_recommendation` - High-impact ML recommendation available
- `cost_optimization_available` - Cost optimization opportunity

## Connector Payload Format

When a connector is triggered, it receives a JSON payload:

```json
{
  "event_type": "pod_crash_loop",
  "severity": "critical",
  "timestamp": "2025-01-15T10:30:00Z",
  "cluster": "production",
  "namespace": "default",
  "resource": "Pod/my-app-123",
  "title": "Pod my-app-123 in crash loop",
  "description": "Pod has restarted 5 times in the last 10 minutes",
  "details": {
    "pod_name": "my-app-123",
    "namespace": "default",
    "restart_count": 5,
    "last_error": "Container failed to start"
  },
  "recommendations": [
    {
      "action": "Check pod logs",
      "command": "kubectl logs my-app-123 -n default"
    }
  ]
}
```

## Best Practices

### 1. **Use Different Connectors for Different Severities**

- **Critical**: PagerDuty for immediate alerts
- **High**: Slack for team notifications
- **Medium/Low**: Email or webhook for logging

### 2. **Filter Events Appropriately**

Don't send all events to all connectors. Configure each connector to only receive relevant events:
- Production alerts → PagerDuty
- Development notifications → Slack
- Cost reports → Email

### 3. **Test Before Production**

Always test connectors in a non-production environment first.

### 4. **Secure Credentials**

- Use environment variables for sensitive tokens
- Rotate tokens regularly
- Use least-privilege access (e.g., GitHub tokens with minimal scopes)

### 5. **Monitor Connector Health**

- Check connector status regularly
- Set up alerts for connector failures
- Review connector logs

## Troubleshooting

### Connector Not Receiving Events

1. **Check Connector Status**: Ensure connector is enabled
2. **Verify Event Filters**: Check that selected events match actual events
3. **Test Connection**: Use "Test Connector" button
4. **Check Logs**: Review KubeGraf logs for connector errors

### Slack Notifications Not Appearing

1. **Verify Webhook URL**: Test webhook URL directly with curl
2. **Check Channel**: Ensure channel exists and bot has access
3. **Review Slack App Settings**: Verify incoming webhooks are enabled

### GitHub Issues Not Created

1. **Verify Token**: Check token has `repo` scope
2. **Check Repository**: Ensure token has access to repository
3. **Review GitHub API Rate Limits**: Check if rate limit exceeded

### PagerDuty Incidents Not Triggering

1. **Verify Integration Key**: Check integration key is correct
2. **Check Severity Filter**: Ensure event severity meets threshold
3. **Review PagerDuty Service**: Verify service is active

## Advanced Configuration

### Custom Webhook Payloads

You can customize webhook payloads by configuring headers and body format:

```json
{
  "name": "Custom Format",
  "type": "webhook",
  "config": {
    "url": "https://api.example.com/events",
    "method": "POST",
    "headers": {
      "Content-Type": "application/json",
      "X-API-Key": "your-api-key"
    },
    "body_template": "{\"alert\": \"{{title}}\", \"cluster\": \"{{cluster}}\"}"
  }
}
```

### Conditional Triggers

Configure connectors to only trigger under specific conditions:

```json
{
  "name": "Cost Alerts",
  "type": "slack",
  "config": {
    "webhook_url": "...",
    "conditions": {
      "cost_threshold": 1000,
      "namespace": "production"
    }
  }
}
```

## Examples

### Example 1: Production Alerting Setup

```json
{
  "connectors": [
    {
      "name": "PagerDuty Critical",
      "type": "pagerduty",
      "enabled": true,
      "config": {
        "integration_key": "...",
        "severity": "critical",
        "events": ["node_down", "pod_crash_loop", "cluster_unhealthy"]
      }
    },
    {
      "name": "Slack Team Alerts",
      "type": "slack",
      "enabled": true,
      "config": {
        "webhook_url": "...",
        "channel": "#k8s-alerts",
        "events": ["pod_restarted", "hpa_maxed", "http_500"]
      }
    }
  ]
}
```

### Example 2: Development Notifications

```json
{
  "name": "Dev Slack",
  "type": "slack",
  "enabled": true,
  "config": {
    "webhook_url": "...",
    "channel": "#dev-k8s",
    "events": ["pod_restarted", "deployment_scaled"]
  }
}
```

### Example 3: Cost Monitoring

```json
{
  "name": "Cost Reports",
  "type": "webhook",
  "enabled": true,
  "config": {
    "url": "https://api.example.com/cost-reports",
    "method": "POST",
    "events": ["cost_threshold_exceeded", "idle_resource_detected"]
  }
}
```

## Security Considerations

1. **Token Storage**: Tokens are stored securely in KubeGraf's configuration
2. **HTTPS Only**: Always use HTTPS for webhook URLs
3. **Least Privilege**: Use tokens with minimal required permissions
4. **Rotation**: Rotate tokens regularly
5. **Audit Logging**: All connector actions are logged

## Support

For issues or questions:
- GitHub Issues: https://github.com/kubegraf/kubegraf/issues
- Documentation: https://kubegraf.io/docs
- Community: https://github.com/kubegraf/kubegraf/discussions

