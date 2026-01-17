# CLI Safety and Web UI Isolation

## Overview

The KubeGraf CLI commands are designed to be **completely safe** to run alongside the web UI. They use read-only operations and independent connections to ensure zero interference.

## Safety Guarantees

### 1. Database Access (Read-Only)

**CLI Operations:**
- ✅ **Read-only**: CLI only reads from `~/.kubegraf/incidents/knowledge.db`
- ✅ **No writes**: CLI never modifies the database
- ✅ **Concurrent reads**: SQLite WAL mode supports concurrent reads
- ✅ **Separate connections**: Each CLI command opens its own database connection
- ✅ **Quick close**: Connections are opened and closed quickly, no long-held locks

**Web UI Operations:**
- Writes incidents to the database
- Uses RWMutex for thread-safe writes
- WAL mode allows reads during writes

**Result:** CLI reads never block web UI writes, and web UI writes don't block CLI reads.

### 2. Kubernetes Client (Independent)

**CLI Operations:**
- ✅ **Independent clientset**: Each CLI command creates its own `kubernetes.Clientset`
- ✅ **No shared state**: CLI doesn't access web UI's cluster connections
- ✅ **Read-only API calls**: Only uses `Get()`, `List()` - no mutations
- ✅ **Separate kubeconfig**: Can use different kubeconfig via `--kubeconfig` flag

**Web UI Operations:**
- Maintains its own cluster connections
- Uses shared App instance for cluster state

**Result:** CLI and web UI operate completely independently on the cluster.

### 3. Error Handling

**Database Lock Errors:**
- If database is locked (web UI writing), CLI shows clear error:
  ```
  database is locked by web UI. Wait a moment and retry, or use --scan=false to skip database
  ```
- CLI gracefully falls back to cluster scanning if database is unavailable
- Non-fatal errors allow partial results

**Kubernetes API Errors:**
- RBAC denials are handled gracefully
- Missing metrics API doesn't fail the command
- Timeouts prevent hanging operations

### 4. File System

**No File Locks:**
- CLI doesn't hold file locks
- SQLite handles file-level locking internally
- Connections are short-lived

**No Shared State Files:**
- CLI doesn't write to any shared state files
- Only reads from database (which SQLite handles safely)

## Implementation Details

### Database Connection

```go
// CLI creates its own KnowledgeBank instance
kb, err := incidents.NewKnowledgeBank(dataDir)
// SQLite opens with WAL mode, supports concurrent reads
```

### Kubernetes Client

```go
// Each CLI command creates independent client
kubeConfig, err := cli.LoadKubeConfig(context, namespace)
clientset := kubeConfig.GetClientset()
// This is completely separate from web UI's clientset
```

### Error Recovery

```go
// If database is locked, CLI provides helpful error
if isDatabaseLocked(err) {
    return fmt.Errorf("database is locked by web UI. Wait a moment and retry")
}
// Or falls back to cluster scanning
```

## Testing Scenarios

### ✅ Safe Scenarios

1. **Web UI running + CLI list incidents**
   - CLI reads from database (non-blocking)
   - Web UI can write simultaneously
   - Both work correctly

2. **Web UI running + CLI analyze incident**
   - CLI reads incident from database
   - CLI creates own Kubernetes client
   - No interference

3. **Web UI running + CLI scan cluster**
   - CLI creates own Kubernetes client
   - Reads from cluster (no database needed)
   - Web UI unaffected

### ⚠️ Edge Cases Handled

1. **Database locked during web UI write**
   - CLI detects lock error
   - Shows helpful message
   - Falls back to cluster scanning if available

2. **Multiple CLI commands simultaneously**
   - Each creates own database connection
   - SQLite handles concurrent reads
   - No conflicts

3. **Web UI writing while CLI reading**
   - SQLite WAL mode allows concurrent reads
   - CLI reads see consistent snapshot
   - No blocking

## Best Practices

1. **CLI commands are stateless**
   - No shared state between commands
   - Each command is independent

2. **Read-only by design**
   - CLI never modifies cluster resources
   - CLI never writes to database
   - Preview/recommendations only

3. **Graceful degradation**
   - If database unavailable, use cluster scanning
   - If RBAC denies access, show what was skipped
   - Always provide partial results when possible

4. **Clear error messages**
   - Database lock errors explain the situation
   - Suggest workarounds (wait, use --scan=false)
   - Never crash silently

## Verification

To verify CLI doesn't interfere with web UI:

1. Start web UI: `./kubegraf web --port 3003`
2. In another terminal, run CLI commands:
   ```bash
   ./kubegraf incidents list
   ./kubegraf doctor
   ./kubegraf analyze <incident-id>
   ```
3. Verify web UI continues working normally
4. Check web UI logs for any errors (there should be none)

## Conclusion

The CLI is **production-ready** and **safe** to use alongside the web UI. All operations are:
- Read-only (no mutations)
- Independent (no shared state)
- Isolated (separate connections)
- Resilient (graceful error handling)

