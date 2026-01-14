# KubeGraf RCA Engine - Example Outputs

This document provides detailed examples of RCA engine outputs for various incident scenarios.

## Example 1: Node Preemption (Spot Instance)

### Scenario
A production API pod running on a GKE preemptible node experiences an unexpected restart.

### Signals Collected
```json
{
  "signals": [
    {
      "id": "node-preempted-gke-spot-abc",
      "type": "node_preempted",
      "timestamp": "2025-01-14T10:15:23Z",
      "resource": {"kind": "Node", "name": "gke-spot-abc"},
      "severity": "critical",
      "message": "Node gke-spot-abc is preemptible/spot",
      "metadata": {"taintKey": "cloud.google.com/gke-preemptible"}
    },
    {
      "id": "node-deleted-gke-spot-abc",
      "type": "node_terminated",
      "timestamp": "2025-01-14T10:15:24Z",
      "message": "Node no longer exists (possibly preempted/terminated)"
    },
    {
      "id": "event-pod-evicted",
      "type": "pod_evicted",
      "timestamp": "2025-01-14T10:15:26Z",
      "resource": {"kind": "Pod", "name": "api-xyz"},
      "message": "Pod evicted from node due to node termination"
    },
    {
      "id": "restart-api-xyz",
      "type": "pod_restart",
      "timestamp": "2025-01-14T10:16:10Z",
      "message": "Container api restarted on new node"
    }
  ]
}
```

### RCA Output
```json
{
  "id": "rca-node-preempt-123",
  "incidentId": "inc-pod-restart-123",
  "title": "Pod restarted due to node preemption (Spot/Preemptible)",
  "rootCause": "Pod api-xyz restarted because its host node gke-spot-abc was terminated. This was a Spot/Preemptible node which can be terminated with short notice by the cloud provider. The pod was deleted and rescheduled to a new node after 47 seconds.",

  "evidence": [
    {
      "type": "Primary Trigger",
      "description": "node_terminated: Node no longer exists",
      "timestamp": "2025-01-14T10:15:24Z",
      "source": "node"
    },
    {
      "type": "Secondary Symptom",
      "description": "pod_evicted: Pod evicted from node",
      "timestamp": "2025-01-14T10:15:26Z"
    },
    {
      "type": "Secondary Symptom",
      "description": "pod_restart: Container restarted on new node",
      "timestamp": "2025-01-14T10:16:10Z"
    }
  ],

  "impact": {
    "affectedResources": [
      {"kind": "Pod", "name": "api-xyz", "namespace": "production"},
      {"kind": "Node", "name": "gke-spot-abc"}
    ],
    "downtimeSeconds": 47,
    "startTime": "2025-01-14T10:15:23Z",
    "endTime": "2025-01-14T10:16:10Z",
    "description": "2 resource(s) affected with 47 seconds of downtime"
  },

  "confidenceScore": 95.0,
  "confidenceReason": "High confidence due to: node termination event detected, pod deletion and rescheduling observed, events occurred within expected timeframe (< 2 minutes)",

  "fixSuggestions": [
    {
      "id": "node-preempt-pdb",
      "title": "Add PodDisruptionBudget",
      "priority": "high",
      "category": "deployment",
      "description": "Create a PodDisruptionBudget to ensure minimum availability during disruptions.",
      "reasoning": "PodDisruptionBudgets ensure that a minimum number of pods remain available during voluntary disruptions, reducing the impact of node preemptions.",
      "actions": [
        "Create a PodDisruptionBudget for your workload",
        "Set minAvailable to at least 1 (or higher based on your needs)",
        "Apply the PDB to your namespace"
      ],
      "risk": "low"
    },
    {
      "id": "node-preempt-nonspot",
      "title": "Move critical workloads off spot/preemptible nodes",
      "priority": "medium",
      "category": "deployment",
      "actions": [
        "Add nodeSelector or nodeAffinity to avoid spot nodes",
        "Example: Add 'cloud.google.com/gke-preemptible: \"false\"' to nodeSelector"
      ],
      "risk": "low"
    },
    {
      "id": "node-preempt-replicas",
      "title": "Increase replica count",
      "priority": "medium",
      "category": "deployment",
      "description": "Run multiple replicas to ensure service availability when individual pods are terminated.",
      "actions": [
        "Increase replicas in your Deployment spec",
        "Recommended minimum: 3 replicas for high availability"
      ],
      "risk": "low"
    }
  ]
}
```

---

## Example 2: Graceful Shutdown Failure

### Scenario
A web server container is force-killed with SIGKILL because it doesn't exit within the grace period.

### Signals Collected
```json
{
  "signals": [
    {
      "id": "sigkill-pod-123-web",
      "type": "graceful_shutdown",
      "timestamp": "2025-01-14T11:23:45Z",
      "resource": {"kind": "Pod", "name": "web-server-123"},
      "severity": "warning",
      "message": "Container web was force-killed (SIGKILL), possible graceful shutdown failure",
      "metadata": {
        "container": "web",
        "exitCode": 137,
        "terminationGracePeriod": 30,
        "duration": 45.2
      }
    }
  ]
}
```

### RCA Output
```json
{
  "id": "rca-graceful-shutdown-456",
  "title": "Container force-killed due to graceful shutdown timeout",
  "rootCause": "Container web was force-killed (SIGKILL) because it did not exit within the termination grace period of 30 seconds. The container ran for 45 seconds after receiving SIGTERM, exceeding the grace period. This indicates the application is not handling SIGTERM properly or has a long shutdown process.",

  "confidenceScore": 95.0,
  "confidenceReason": "High confidence: container exit code 137 (SIGKILL) observed, and shutdown duration (45.2s) exceeded grace period (30s)",

  "assumptions": [
    "The application has preStop hooks or shutdown handlers that are taking too long",
    "SIGTERM signal was properly delivered to the application"
  ],

  "fixSuggestions": [
    {
      "id": "graceful-shutdown-grace-period",
      "title": "Increase terminationGracePeriodSeconds",
      "priority": "high",
      "description": "Increase the termination grace period from 30 to 60 seconds to allow the application more time to shut down gracefully.",
      "actions": [
        "Update pod spec: terminationGracePeriodSeconds: 60",
        "Test the change in a non-production environment first",
        "Monitor shutdown times to ensure the new value is sufficient"
      ],
      "risk": "low"
    },
    {
      "id": "graceful-shutdown-sigterm",
      "title": "Ensure application handles SIGTERM correctly",
      "priority": "high",
      "description": "Verify that the application properly handles SIGTERM signals and initiates graceful shutdown.",
      "actions": [
        "Review application code for SIGTERM signal handling",
        "Implement graceful shutdown logic if missing",
        "Common patterns: close HTTP server, drain worker queues, close DB connections"
      ],
      "risk": "medium"
    }
  ]
}
```

---

## Example 3: OOM Kill with Crash Loop

### Scenario
A data processing pod repeatedly runs out of memory and crashes.

### Signals Collected
```json
{
  "signals": [
    {
      "id": "oom-data-processor-xyz-main",
      "type": "pod_oomkilled",
      "timestamp": "2025-01-14T12:15:32Z",
      "resource": {"kind": "Pod", "name": "data-processor-xyz"},
      "severity": "critical",
      "message": "Container main was OOMKilled",
      "metadata": {
        "container": "main",
        "exitCode": 137,
        "reason": "OOMKilled"
      }
    },
    {
      "id": "restart-data-processor-1",
      "type": "pod_restart",
      "timestamp": "2025-01-14T12:15:45Z",
      "metadata": {"restartCount": 1}
    },
    {
      "id": "restart-data-processor-2",
      "type": "pod_restart",
      "timestamp": "2025-01-14T12:16:02Z",
      "metadata": {"restartCount": 2}
    },
    {
      "id": "crashloop-data-processor",
      "type": "pod_crashloop",
      "timestamp": "2025-01-14T12:16:25Z",
      "message": "Container main is in CrashLoopBackOff",
      "metadata": {"restartCount": 5}
    }
  ]
}
```

### RCA Output
```json
{
  "id": "rca-oom-789",
  "title": "Container killed due to out-of-memory (OOM)",
  "rootCause": "Container main was killed by the OOM killer because it exceeded its memory limit. This happens when the container tries to allocate more memory than its resource limit allows. The container has restarted 5 time(s) due to this issue.",

  "confidenceScore": 99.0,
  "confidenceReason": "Very high confidence: OOMKilled termination reason is definitive evidence of memory exhaustion",

  "assumptions": [
    "Container memory limits are set appropriately (not artificially low)",
    "Application has a genuine memory leak or high memory usage pattern"
  ],

  "impact": {
    "downtimeSeconds": 53,
    "description": "1 resource(s) affected with 53 seconds of downtime"
  },

  "fixSuggestions": [
    {
      "id": "oom-increase-memory",
      "title": "Increase memory limits",
      "priority": "high",
      "category": "resource",
      "description": "Increase the container's memory limit to accommodate the application's memory requirements.",
      "reasoning": "The container is exceeding its memory limit and being killed by the OOM killer.",
      "actions": [
        "Analyze actual memory usage patterns from metrics",
        "Increase memory limit by 50-100% above peak usage",
        "Example: Change 'memory: 512Mi' to 'memory: 1Gi'",
        "Also increase memory requests to match or be slightly lower"
      ],
      "risk": "low"
    },
    {
      "id": "oom-investigate-leak",
      "title": "Investigate potential memory leak",
      "priority": "high",
      "category": "application",
      "description": "Analyze the application for memory leaks that could be causing unbounded memory growth.",
      "actions": [
        "Profile memory usage over time in a test environment",
        "Look for continuously growing memory patterns",
        "Common causes: unclosed connections, unbounded caches, circular references"
      ],
      "risk": "medium"
    }
  ]
}
```

---

## Example 4: Database Connection Failure

### Scenario
Application crashes on startup because it can't connect to its database.

### Signals Collected
```json
{
  "signals": [
    {
      "id": "log-db-connection-error",
      "type": "db_connection",
      "timestamp": "2025-01-14T13:05:12Z",
      "severity": "warning",
      "message": "Container app logs indicate db_connection",
      "source": "log"
    },
    {
      "id": "event-db-connection-refused",
      "type": "db_connection",
      "timestamp": "2025-01-14T13:05:13Z",
      "message": "Error: connection refused: tcp 10.0.0.5:5432"
    },
    {
      "id": "crashloop-app",
      "type": "pod_crashloop",
      "timestamp": "2025-01-14T13:05:45Z",
      "message": "Container app is in CrashLoopBackOff",
      "metadata": {"restartCount": 8}
    }
  ]
}
```

### RCA Output
```json
{
  "id": "rca-db-connection-101",
  "title": "Application failing due to database connection issues",
  "rootCause": "Application cannot connect to its database dependency. Error: connection refused: tcp 10.0.0.5:5432. The application is in CrashLoopBackOff because it cannot start without a database connection. This is typically caused by: database unavailability, incorrect connection configuration, network issues, or authentication problems.",

  "confidenceScore": 85.0,
  "confidenceReason": "Very high confidence: database connection errors detected in logs combined with CrashLoopBackOff pattern",

  "assumptions": [
    "Database connection string and credentials are configured correctly",
    "Network policies allow traffic to database",
    "Database service is running in expected location"
  ],

  "fixSuggestions": [
    {
      "id": "db-connection-retry",
      "title": "Implement retry logic with exponential backoff",
      "priority": "high",
      "category": "application",
      "actions": [
        "Implement exponential backoff retry strategy",
        "Start with short delays (e.g., 1s) and increase (2s, 4s, 8s, etc.)",
        "Set a maximum retry duration (e.g., 60 seconds)"
      ],
      "risk": "low"
    },
    {
      "id": "db-connection-config",
      "title": "Verify database connection configuration",
      "priority": "high",
      "actions": [
        "Verify database hostname/service name is correct",
        "Check that credentials (username/password) are valid",
        "Ensure ConfigMaps and Secrets are properly mounted"
      ],
      "risk": "low"
    },
    {
      "id": "db-connection-network-policy",
      "title": "Check network policies",
      "priority": "medium",
      "actions": [
        "List network policies affecting your namespace",
        "Ensure egress rules allow traffic to database port"
      ],
      "risk": "low"
    }
  ]
}
```

---

## Example 5: Scheduling Failure (Insufficient Resources)

### Scenario
A pod cannot be scheduled because no nodes have sufficient memory.

### Signals Collected
```json
{
  "signals": [
    {
      "id": "pending-large-job-abc",
      "type": "pod_pending",
      "timestamp": "2025-01-14T14:20:15Z",
      "message": "Pod is stuck in Pending state",
      "resource": {"kind": "Pod", "name": "large-job-abc"}
    },
    {
      "id": "event-scheduling-failure",
      "type": "scheduling_failure",
      "timestamp": "2025-01-14T14:20:16Z",
      "message": "0/10 nodes are available: insufficient memory"
    },
    {
      "id": "node-pressure-node1",
      "type": "node_pressure",
      "timestamp": "2025-01-14T14:19:45Z",
      "message": "Node node1 has MemoryPressure",
      "metadata": {"pressureType": "MemoryPressure"}
    }
  ]
}
```

### RCA Output
```json
{
  "id": "rca-scheduling-202",
  "title": "Pod cannot be scheduled to any node",
  "rootCause": "Kubernetes scheduler cannot find a suitable node for this pod. Reason: 0/10 nodes are available: insufficient memory. Node pressure conditions were also detected, indicating cluster resource constraints. This is typically caused by: insufficient cluster resources, node affinity/anti-affinity constraints, taints without matching tolerations, or topology spread constraints.",

  "confidenceScore": 90.0,
  "confidenceReason": "High confidence: FailedScheduling events and Pending pod status observed",

  "fixSuggestions": [
    {
      "id": "scheduling-increase-resources",
      "title": "Add more nodes or increase node capacity",
      "priority": "high",
      "category": "resource",
      "actions": [
        "Enable cluster autoscaling if not already enabled",
        "Manually add nodes to the cluster",
        "Consider using larger node instance types"
      ],
      "risk": "low"
    },
    {
      "id": "scheduling-adjust-requests",
      "title": "Reduce resource requests",
      "priority": "medium",
      "actions": [
        "Analyze actual resource usage from metrics",
        "Reduce requests to match actual usage patterns",
        "Example: Change 'memory: 16Gi' to 'memory: 8Gi' if actual usage is lower"
      ],
      "risk": "medium"
    }
  ]
}
```

---

## Confidence Score Examples

### Very High Confidence (95-100%)
- **OOM Kill**: Definitive termination reason
- **Image Pull Error**: Clear error message from registry
- **Node Preemption**: All signals align perfectly

### High Confidence (80-94%)
- **Graceful Shutdown Failure**: Exit code 137 + duration exceeded
- **DB Connection Failure**: Logs + CrashLoop pattern
- **Scheduling Failure**: FailedScheduling event + Pending status

### Medium Confidence (60-79%)
- **Crash Loop**: Multiple restarts but unclear root cause
- **Generic failures**: Symptoms present but trigger uncertain

### Low Confidence (< 60%)
- **Unknown pattern**: Multiple signals but no clear correlation
- **Insufficient data**: Limited signals collected

---

## Integration with KubeGraf UI

### Dashboard View
```
┌─────────────────────────────────────────────────────────┐
│ Incident: OOM Kill - data-processor-xyz                │
│ Status: Active     Severity: Critical     Age: 2m      │
├─────────────────────────────────────────────────────────┤
│ RCA: Container killed due to out-of-memory (OOM)       │
│ Confidence: 99%                                         │
│                                                         │
│ Root Cause:                                             │
│ Container main exceeded its memory limit and was killed │
│ by the OOM killer. The container has restarted 5 times.│
│                                                         │
│ Impact: 1 resource affected, 53s downtime               │
│                                                         │
│ ┌─────────────────────────────────────────────────┐   │
│ │ Fix Suggestions (3)                              │   │
│ ├─────────────────────────────────────────────────┤   │
│ │ [HIGH] Increase memory limits                    │   │
│ │ [HIGH] Investigate potential memory leak         │   │
│ │ [MED]  Optimize memory usage                     │   │
│ └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

---

## CLI Output Example

```bash
$ kubegraf incidents analyze --id inc-oom-789

╔═══════════════════════════════════════════════════════════╗
║  Root Cause Analysis                                      ║
╠═══════════════════════════════════════════════════════════╣
║  ID: rca-oom-789                                          ║
║  Pattern: oom_kill                                        ║
║  Confidence: 99%                                          ║
╚═══════════════════════════════════════════════════════════╝

Title:
  Container killed due to out-of-memory (OOM)

Root Cause:
  Container main was killed by the OOM killer because it
  exceeded its memory limit. The container has restarted
  5 time(s) due to this issue.

Impact:
  • 1 resource affected
  • 53 seconds downtime
  • Start: 2025-01-14 12:15:32
  • End: 2025-01-14 12:16:25

Fix Suggestions (3):

  [1] Increase memory limits (HIGH PRIORITY)
      • Analyze actual memory usage patterns from metrics
      • Increase memory limit by 50-100% above peak usage
      • Example: Change 'memory: 512Mi' to 'memory: 1Gi'
      Risk: Low

  [2] Investigate potential memory leak (HIGH PRIORITY)
      • Profile memory usage over time
      • Look for continuously growing memory patterns
      Risk: Medium

  [3] Optimize memory usage (MEDIUM PRIORITY)
      • Implement pagination for large data sets
      • Add size limits to in-memory caches
      Risk: Medium
```

---

## Summary

The RCA Engine provides:

1. **High-Confidence Analysis**: 85-99% confidence for most patterns
2. **Actionable Insights**: Clear root causes with evidence
3. **Production-Ready Fixes**: Non-destructive, tested suggestions
4. **Multiple Integration Points**: API, CLI, Dashboard
5. **Real-World Scenarios**: Handles complex production issues

The engine is designed to save SREs hours of investigation time by automatically correlating signals and providing expert-level analysis.
