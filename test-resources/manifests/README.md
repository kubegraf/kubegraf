# Test Manifests for Kubegraf

This directory contains Kubernetes manifests designed to test various failure scenarios and edge cases in Kubegraf.

## Available Test Scenarios

### 1. OOM (Out of Memory) Test
**File:** `oom-test.yaml`

Tests memory exhaustion and OOM killer behavior.
- Attempts to allocate 200MB of memory
- Memory limit set to 128Mi
- Pod will be killed by OOM killer

```bash
kubectl apply -f oom-test.yaml
```

### 2. CPU Load Test
**File:** `cpu-load-test.yaml`

Tests high CPU usage scenarios.
- Stresses 2 CPU cores
- Runs for 5 minutes
- 2 replicas for load distribution

```bash
kubectl apply -f cpu-load-test.yaml
```

### 3. CrashLoopBackOff Test
**File:** `crashloop-test.yaml`

Tests pod crash and restart behavior.
- Pod starts and crashes after 5 seconds
- Kubernetes will attempt to restart it
- Eventually enters CrashLoopBackOff state

```bash
kubectl apply -f crashloop-test.yaml
```

### 4. Pod Restart Test
**File:** `pod-restart-test.yaml`

Tests liveness probe failures and pod restarts.
- Liveness probe checks non-existent endpoint
- Pod will restart every ~10 seconds
- 2 replicas to observe restart patterns

```bash
kubectl apply -f pod-restart-test.yaml
```

### 5. ImagePullBackOff Test
**File:** `image-pull-error-test.yaml`

Tests image pull failures.
- References non-existent container image
- Pod will enter ImagePullBackOff state
- Useful for testing image registry error handling

```bash
kubectl apply -f image-pull-error-test.yaml
```

## Cleanup

To remove all test scenarios:

```bash
kubectl delete namespace test-scenarios
```

Or remove individual tests:

```bash
kubectl delete -f <test-file>.yaml
```

## Monitoring in Kubegraf

After deploying these tests, you can observe the following in Kubegraf:

1. **Pods View**: Watch pod states transition (Pending → Running → CrashLoopBackOff)
2. **Events**: View Kubernetes events related to failures
3. **Metrics**: Monitor CPU and memory usage patterns
4. **Logs**: Inspect container logs for error messages
5. **Resource Status**: Check overall cluster health with problematic pods

## Expected Behaviors

| Test | Expected State | Restart Count | Events |
|------|---------------|---------------|--------|
| OOM | OOMKilled/Error | High | OOMKilled events |
| CPU Load | Running | Low | High CPU warnings |
| CrashLoop | CrashLoopBackOff | Very High | Back-off restarting |
| Restart | Running | High | Liveness probe failed |
| ImagePull | ImagePullBackOff | 0 | Failed to pull image |

## Notes

- All tests are deployed in the `test-scenarios` namespace
- Tests are intentionally designed to fail or cause issues
- These are for testing and demonstration purposes only
- Do not deploy these in production environments
