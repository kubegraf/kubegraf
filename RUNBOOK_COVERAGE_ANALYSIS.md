# Runbook Coverage Analysis

**Generated**: January 14, 2026
**Server**: http://localhost:3003
**Total Runbooks Registered**: 13

---

## Executive Summary

**Current Coverage**: **8 out of 25** failure patterns have runbooks (32% coverage)

### ✅ Patterns with Runbooks (8)

| Pattern | Runbooks | Total | Status |
|---------|----------|-------|--------|
| **PatternRestartStorm** | restart-pod, scale-up-deployment, rolling-restart, restart-storm-rollback, restart-storm-increase-memory, restart-storm-relax-probe | **6** | ✅ Excellent |
| **PatternOOMPressure** | increase-memory-limit, oom-increase-memory-limit | **2** | ✅ Good |
| **PatternCrashLoop** | rollback-deployment | **1** | ✅ Basic |
| **PatternNoReadyEndpoints** | scale-up-deployment | **1** | ✅ Basic |
| **PatternImagePullFailure** | image-pull-validate-and-fix | **1** | ✅ Basic |
| **PatternUnschedulable** | pending-scheduling-fix | **1** | ✅ Basic |
| **PatternGracefulShutdownFail** | graceful-shutdown-increase-grace-period, graceful-shutdown-add-prestop-hook | **2** | ✅ Good |
| **PatternConfigError** | *(Detected, no runbook yet)* | **0** | ⚠️ Detection Only |

### ❌ Patterns WITHOUT Runbooks (17)

#### Application-Level Failures (4)
- **PatternAppCrash** - Container crashes with non-zero exit codes
- **PatternInternalErrors** - Application returning HTTP 5xx errors
- **PatternUpstreamFailure** - Failure communicating with upstream services
- **PatternTimeouts** - Request timeouts

#### Infrastructure Failures (3)
- **PatternDNSFailure** - DNS resolution failures
- **PatternPermissionDenied** - Insufficient permissions (401/403)
- **PatternConfigError** - Invalid configuration (detected but no runbook)

#### Node-Level Failures (4)
- **PatternNodeNotReady** - Node not accepting workloads
- **PatternNodePressure** - Memory/disk/PID pressure on nodes
- **PatternDiskPressure** - Low disk space
- **PatternNetworkPartition** - Network connectivity issues

#### Scheduling Failures (2)
- **PatternResourceExhausted** - Cluster quota exhausted
- **PatternAffinityConflict** - Pod affinity/anti-affinity conflicts *(detected but no runbook)*

#### Security Failures (3)
- **PatternSecretMissing** - Required secret not found
- **PatternRBACDenied** - RBAC policy denial
- **PatternPolicyViolation** - Security policy violations

#### Health Check Failures (3)
- **PatternLivenessFailure** - Liveness probe failures
- **PatternReadinessFailure** - Readiness probe failures
- **PatternStartupFailure** - Startup probe failures

---

## Detailed Runbook Inventory

### 1. RestartStorm Runbooks (6)

#### restart-pod
- **Risk**: Low
- **Autonomy**: Auto-execute
- **Success Rate**: 95%
- **Action**: Delete pod to trigger recreation

#### scale-up-deployment
- **Risk**: Low
- **Autonomy**: Auto-execute
- **Success Rate**: 90%
- **Action**: Increase replicas by 1

#### rolling-restart
- **Risk**: Low
- **Autonomy**: Auto-execute
- **Success Rate**: 95%
- **Action**: kubectl rollout restart

#### restart-storm-rollback
- **Risk**: Medium
- **Autonomy**: Recommend
- **Success Rate**: 80%
- **Action**: Rollback deployment if recent change detected

#### restart-storm-increase-memory
- **Risk**: Medium
- **Autonomy**: Recommend
- **Success Rate**: 85%
- **Action**: Increase memory limit by 25%

#### restart-storm-relax-probe
- **Risk**: Medium
- **Autonomy**: Recommend
- **Success Rate**: 75%
- **Action**: Adjust liveness probe (timeout=5s, period=30s)

---

### 2. OOMPressure Runbooks (2)

#### increase-memory-limit
- **Risk**: Medium
- **Autonomy**: Recommend
- **Success Rate**: 85%
- **Action**: Increase memory limit by 50%

#### oom-increase-memory-limit
- **Risk**: Medium
- **Autonomy**: Recommend
- **Success Rate**: 85%
- **Action**: Increase memory limit by 50% (OOM-specific)

---

### 3. CrashLoop Runbooks (1)

#### rollback-deployment
- **Risk**: Medium
- **Autonomy**: Recommend
- **Success Rate**: 90%
- **Action**: Rollback to previous revision

---

### 4. NoReadyEndpoints Runbooks (1)

#### scale-up-deployment
- **Risk**: Low
- **Autonomy**: Auto-execute
- **Success Rate**: 90%
- **Action**: Increase replicas by 1
- **Safety**: Won't scale beyond 10 replicas

---

### 5. ImagePullFailure Runbooks (1)

#### image-pull-validate-and-fix
- **Risk**: Low
- **Autonomy**: Recommend
- **Success Rate**: 70%
- **Action**: Validate image configuration, show imagePullSecrets
- **Note**: Often requires manual intervention for registry auth

---

### 6. Unschedulable Runbooks (1)

#### pending-scheduling-fix
- **Risk**: Low
- **Autonomy**: Recommend
- **Success Rate**: 75%
- **Action**: Show scheduling reasons, suggest tolerations/node selectors
- **Note**: Primarily diagnostic

---

### 7. GracefulShutdownFail Runbooks (2) **[NEW]**

#### graceful-shutdown-increase-grace-period
- **Risk**: Medium
- **Autonomy**: Recommend
- **Success Rate**: 85%
- **Action**: Increase terminationGracePeriodSeconds from 30s to 60s

#### graceful-shutdown-add-prestop-hook
- **Risk**: Medium
- **Autonomy**: Recommend
- **Success Rate**: 80%
- **Action**: Add preStop lifecycle hook with 5-second delay

---

## Priority Recommendations for Missing Runbooks

### 🔴 Critical Priority (Should implement immediately)

1. **PatternNodeNotReady** - Common in production, causes pod evictions
   - Suggested runbooks:
     - Cordon and drain node
     - Check node conditions (disk, memory, network)
     - Restart kubelet service

2. **PatternNodePressure** - Leads to cascading failures
   - Suggested runbooks:
     - Identify high-usage pods
     - Evict low-priority pods
     - Scale down non-critical workloads

3. **PatternDNSFailure** - Critical for service discovery
   - Suggested runbooks:
     - Restart CoreDNS pods
     - Check DNS service endpoints
     - Validate DNS configuration

4. **PatternLivenessFailure** / **PatternReadinessFailure** - Very common
   - Suggested runbooks:
     - Relax probe settings (similar to restart-storm-relax-probe)
     - Increase timeout/period values
     - Check application health endpoint

### 🟡 High Priority (Implement soon)

5. **PatternSecretMissing** - Blocks pod startup
   - Suggested runbooks:
     - List available secrets
     - Suggest creating missing secret
     - Check RBAC permissions

6. **PatternResourceExhausted** - Prevents new pods from scheduling
   - Suggested runbooks:
     - Show cluster resource usage
     - Suggest scaling down low-priority workloads
     - Recommend increasing cluster capacity

7. **PatternAppCrash** - Application failures
   - Suggested runbooks:
     - Fetch crash logs
     - Rollback deployment
     - Restart pod

### 🟢 Medium Priority (Nice to have)

8. **PatternDiskPressure** - Can lead to evictions
9. **PatternInternalErrors** - Application HTTP 5xx errors
10. **PatternUpstreamFailure** - Dependency failures
11. **PatternAffinityConflict** - Scheduling constraints
12. **PatternRBACDenied** - Permission issues

### ⚪ Low Priority (Advanced cases)

13. **PatternNetworkPartition** - Rare, complex to remediate
14. **PatternPolicyViolation** - Security policy issues
15. **PatternPermissionDenied** - Application-level auth issues
16. **PatternTimeouts** - Performance tuning
17. **PatternStartupFailure** - Similar to liveness/readiness

---

## Implementation Roadmap

### Phase 1: Critical Node & DNS Issues (Week 1)
- Add NodeNotReady runbooks (3)
- Add NodePressure runbooks (2)
- Add DNSFailure runbooks (2)
**Total new runbooks**: 7 → **20 total**

### Phase 2: Health Checks (Week 2)
- Add LivenessFailure runbooks (2)
- Add ReadinessFailure runbooks (2)
- Add StartupFailure runbooks (1)
**Total new runbooks**: 5 → **25 total**

### Phase 3: Configuration & Scheduling (Week 3)
- Add SecretMissing runbooks (2)
- Add ResourceExhausted runbooks (2)
- Add AffinityConflict runbooks (1)
**Total new runbooks**: 5 → **30 total**

### Phase 4: Application Errors (Week 4)
- Add AppCrash runbooks (2)
- Add InternalErrors runbooks (1)
- Add UpstreamFailure runbooks (1)
**Total new runbooks**: 4 → **34 total**

**Projected final coverage**: 34 runbooks for 25 patterns = **100% coverage** with ~1.4 runbooks per pattern

---

## Current Detection vs Remediation Gap

| Category | Patterns Defined | Patterns Detected | Runbooks Available | Gap |
|----------|------------------|-------------------|--------------------|-----|
| **Application** | 8 | 8 | 4 | 4 missing |
| **Infrastructure** | 5 | 5 | 2 | 3 missing |
| **Node** | 4 | 4 | 0 | 4 missing |
| **Scheduling** | 3 | 3 | 1 | 2 missing |
| **Security** | 3 | 3 | 0 | 3 missing |
| **Health** | 3 | 3 | 0 | 3 missing |
| **Total** | **26** | **26** | **7** + ConfigError detection | **19 missing** |

---

## Conclusion

### Strengths ✅
- Excellent coverage for restart-related issues (6 runbooks)
- Good coverage for OOM pressure (2 runbooks)
- New graceful shutdown runbooks added (2 runbooks)
- All implemented runbooks have dry-run, rollback, and verification

### Weaknesses ❌
- **Zero coverage** for node-level issues (4 patterns)
- **Zero coverage** for health check failures (3 patterns)
- **Zero coverage** for security issues (3 patterns)
- Only 32% pattern coverage overall

### Next Steps
1. Implement **Phase 1** runbooks (NodeNotReady, NodePressure, DNSFailure) - **Critical**
2. Implement **Phase 2** runbooks (Health check failures) - **High priority**
3. Add ConfigError runbook (signal detection already exists)
4. Continue with Phases 3-4 based on incident frequency in production

---

**Note**: All 26 patterns are actively detected by the matcher and RCA engine. The gap is purely in automated remediation coverage.
