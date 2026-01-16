# Fixed: Routing Issue for Remediation Endpoints

## Problem
The "fixes", "fix-preview", "fix-apply", and "post-check" endpoints were not being routed correctly. They were inside `handleIncidentV2Action` but should be handled earlier in the subPath switch in `handleIncidentV2ByID`.

## Solution
Moved the remediation endpoints to the correct location in the subPath switch (lines 766-778 in `web_incidents_v2.go`):

```go
case "fixes":
    // New remediation engine API
    ws.handleIncidentFixes(w, r, baseID)
    return
case "fix-preview":
    // New remediation engine API (v2)
    ws.handleFixPreviewV2(w, r, baseID)
    return
case "fix-apply":
    // New remediation engine API (v2)
    ws.handleFixApplyV2(w, r, baseID)
    return
case "post-check":
    // New remediation engine API
    ws.handlePostCheck(w, r, baseID)
    return
```

## Testing
1. **Restart kubegraf**: `./kubegraf web --port 3003`
2. **Open browser console** (F12 → Console tab)
3. **Click an incident** in the UI
4. **Check console** for:
   - API call to `/api/v2/incidents/{id}/fixes`
   - Response with `recommendedAction` and `fixPlans`
   - No errors in console
5. **Verify UI shows**:
   - "Recommended First Action" box at top
   - "Suggested Fixes" section with fix cards
   - Evidence chips are clickable
   - Preview and Apply buttons work

## Expected Behavior
- When you click an incident, the UI should:
  1. Load the snapshot
  2. Call `/api/v2/incidents/{id}/fixes` automatically
  3. Display "Recommended First Action" box
  4. Display "Suggested Fixes" section with up to 3 fix cards
  5. Each fix card should have Preview and Apply buttons

## Debugging
If you still don't see the sections:
1. **Check browser console** for errors
2. **Check Network tab** for the `/fixes` API call:
   - Should return 200 OK
   - Response should have `recommendedAction` and `fixPlans` fields
3. **Check if incident has a pattern**:
   - The remediation engine only generates fixes for known patterns (RESTART_STORM, OOM, IMAGE_PULL, PENDING)
   - If pattern is unknown, you'll only see "Recommended First Action" (read-only)
4. **Verify incident has snapshot**:
   - The fixes endpoint requires a snapshot
   - Check if snapshot loads successfully

## Next Steps
After restarting, the new features should appear:
- ✅ Recommended First Action box
- ✅ Suggested Fixes section
- ✅ Fix cards with Preview/Apply buttons
- ✅ Evidence chips (clickable)
- ✅ Preview with dry-run results
- ✅ Confirmation dialog for Apply

