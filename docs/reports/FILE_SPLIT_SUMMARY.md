# KubeGraf File Split - Progress Report

## Objective
Split `web_server.go` (77,548 tokens) into manageable files under 25,000 tokens each.

## Completed Work

### Files Successfully Extracted

1. **web_misc.go** (561 lines, ~5,600 tokens)
   - handleConnectionStatus
   - handleCheckUpdates  
   - handleInstallUpdate
   - handleMetrics
   - handleTopology
   - handleEvents
   - watchKubernetesEvents
   - handleResourceMap
   - handleNamespaces
   - handleContexts
   - handleCurrentContext
   - handleSwitchContext

2. **web_portforward.go** (289 lines, ~2,900 tokens)
   - findAvailablePort
   - handlePortForwardStart
   - handlePortForwardStop
   - handlePortForwardList

3. **apps.go** (866 lines, ~8,700 tokens) - **COMPLETED**
   - Full marketplace implementation
   - All app installation handlers
   - K3d, kind, minikube cluster installers
   - Helm app installation
   - Database integration

### Current State

| File | Lines | Est. Tokens | Status |
|------|-------|-------------|---------|
| web_server.go | 7,000 | ~70,000 | ⚠️ Still too large |
| web_misc.go | 561 | ~5,600 | ✅ Good |
| web_portforward.go | 289 | ~2,900 | ✅ Good |
| apps.go | 866 | ~8,700 | ✅ Good |

**Progress:** Reduced web_server.go by 774 lines (9.9%)
**Remaining:** web_server.go is still 2.8x over the 25,000 token limit

## Sections Still in web_server.go

The following large sections remain and should be extracted:

### 1. Impact Analysis (~900 lines)
- **Lines:** 973-1838
- **Contents:** ImpactNode, ImpactAnalysis types, all impact analysis functions
- **Recommended file:** `web_impact.go`

### 2. WebSocket Handlers (~150 lines)
- **Lines:** 873-998  
- **Contents:** WebSocket connection handling, broadcast functions
- **Recommended file:** `web_websocket.go`

### 3. Terminal/Exec (~700 lines)
- **Lines:** 2125-2850
- **Contents:** Pod exec, terminal WebSocket, local terminal handlers
- **Recommended file:** `web_terminal.go`

### 4. Resource Handlers (~1,500 lines)
- **Contents:** handlePods, handleDeployments, handleServices, handleNodes, etc.
- **Recommended file:** `web_handlers_resources.go`

### 5. CRUD Operations (~1,200 lines)
- **Contents:** All delete/restart/scale/update/describe handlers
- **Recommended file:** `web_handlers_operations.go`

### 6. Details/YAML Handlers (~800 lines)
- **Contents:** All details and YAML handlers
- **Recommended file:** `web_handlers_details.go`

### 7. Security Analysis (~300 lines)
- **Lines:** 5579-5882
- **Contents:** SecurityFinding type, handleSecurityAnalysis
- **Recommended file:** `web_security.go`

### 8. GitOps (~1,100 lines)
- **Lines:** 5883-7000
- **Contents:** Helm, Kustomize, ArgoCD, Flux handlers
- **Recommended file:** `web_gitops.go`

## Recommended Next Steps

To get web_server.go under 25,000 tokens (2,500 lines), extract at least **4,500 more lines**.

### Priority 1: Large Self-Contained Sections
1. Extract GitOps (~1,100 lines) - end of file, cleanly separable
2. Extract Impact Analysis (~900 lines) - self-contained
3. Extract Terminal/Exec (~700 lines) - self-contained
4. Extract Security (~300 lines) - self-contained

**Total reduction:** ~3,000 lines → web_server.go would be ~4,000 lines

### Priority 2: Handler Groups
5. Extract Resource Handlers (~1,500 lines)
6. Extract CRUD Operations (~1,200 lines)

**Additional reduction:** ~2,700 lines → web_server.go would be ~1,300 lines ✅

## Technical Notes

### Challenges Encountered
- File is too large to read in single pass (exceeds 25,000 token tool limit)
- Function boundaries must be identified carefully to avoid syntax errors
- Sed commands must be run in reverse order (bottom-to-top) to preserve line numbers

### Extraction Method Used
```bash
# 1. Extract section to new file with proper imports
sed -n 'START,ENDp' web_server.go > new_file.go

# 2. Delete from original (in reverse order!)
sed -i '' 'START,ENDd' web_server.go

# 3. Remove unused imports
# 4. Test compilation: go build
```

### Recommendations for Completing the Split

1. **Use the existing backup:** `web_server.go.backup` is available
2. **Extract sections in this order:**
   - GitOps (5883-7000) - end of file
   - Security (5579-5882)
   - Impact Analysis (973-1838)  
   - Terminal/Exec (2125-2850)
   - WebSocket (873-998)
3. **After each extraction:**
   - Verify with `go build`
   - Check line count: `wc -l web_server.go`
4. **Continue until web_server.go < 2,500 lines**

## Benefits Achieved So Far

✅ `apps.go` fully implemented and compiling
✅ `web_misc.go` extracted (miscellaneous handlers)
✅ `web_portforward.go` extracted (port forwarding)
✅ Code compiles successfully
✅ Logical organization started
✅ Foundation laid for continued splitting

## Files Overview

```
kubegraf/
├── apps.go                      (866 lines) ✅ Complete
├── web_misc.go                  (561 lines) ✅ Extracted
├── web_portforward.go           (289 lines) ✅ Extracted
└── web_server.go               (7,000 lines) ⚠️ Needs more splitting
    └── Should become:
        ├── web_server.go        (~500 lines) - Core only
        ├── web_handlers_resources.go
        ├── web_handlers_details.go
        ├── web_handlers_operations.go
        ├── web_websocket.go
        ├── web_terminal.go
        ├── web_impact.go
        ├── web_security.go
        └── web_gitops.go
```

