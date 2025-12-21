# Debug Checklist: New Features Not Showing

## ✅ Step-by-Step Debugging

### 1. **Check if kubegraf is running with latest build**
```bash
# Check if process is running
ps aux | grep kubegraf | grep -v grep

# If not running, start it:
./kubegraf web --port 3003
```

### 2. **Hard refresh browser**
- **Chrome/Edge**: `Cmd+Shift+R` (Mac) or `Ctrl+Shift+R` (Windows/Linux)
- **Firefox**: `Cmd+Shift+R` (Mac) or `Ctrl+F5` (Windows/Linux)
- **Safari**: `Cmd+Option+R`

### 3. **Open browser console (F12)**
- Go to **Console** tab
- Look for errors (red text)
- Look for `[Remediation]` log messages

### 4. **Test API endpoint directly**
```bash
# Get an incident ID first
curl http://localhost:3003/api/v2/incidents | jq '.[0].id'

# Then test the fixes endpoint (replace INCIDENT_ID)
curl http://localhost:3003/api/v2/incidents/INCIDENT_ID/fixes
```

### 5. **Check Network tab in browser**
- Open **Network** tab (F12)
- Click an incident
- Look for request to `/api/v2/incidents/{id}/fixes`
- Check:
  - Status code (should be 200)
  - Response body (should have `recommendedAction` and `fixPlans`)

### 6. **Verify incident has matching pattern**
The remediation engine only generates fixes for known patterns:
- `RESTART_STORM` ✅
- `OOM_PRESSURE` ✅
- `IMAGE_PULL_FAILURE` ✅
- `UNSCHEDULABLE` or `PENDING` ✅

If your incident has a different pattern, you'll only see "Recommended First Action" (read-only).

### 7. **Check modal is actually opening**
- Click an incident row
- Look for modal overlay
- Check if `IncidentModalV2` component is rendering
- Look for console logs: `[Remediation] Loading fixes for incident: ...`

### 8. **Verify UI is calling the API**
In browser console, you should see:
```
[Remediation] Loading fixes for incident: inc-xxx
[Remediation] Loaded plan: {recommendedAction: {...}, fixPlans: [...]}
```

If you see errors instead:
- Check the error message
- Verify the incident ID is correct
- Check if the API endpoint is registered

### 9. **Check if fixes are being generated**
Even if the API works, fixes might not be generated if:
- Incident pattern doesn't match any runbook
- Evidence is insufficient
- Preconditions are not met

In this case, you'll see:
- "Recommended First Action" ✅
- "Suggested Fixes" section empty ❌

### 10. **Common Issues**

#### Issue: API returns 404
**Fix**: Check routing in `web_incidents_v2.go` - "fixes" case should be in subPath switch

#### Issue: API returns 500
**Fix**: Check server logs for errors, verify `getIncidentSnapshot` works

#### Issue: UI shows nothing
**Fix**: 
- Check browser console for errors
- Verify `remediationPlan()` signal is not null
- Check `Show when={remediationPlan()?.recommendedAction}` conditions

#### Issue: Only "Recommended First Action" shows, no fixes
**Fix**: 
- Check incident pattern matches runbook patterns
- Verify evidence is present
- Check `hasSufficientEvidence` logic

## 🔍 Quick Test Commands

```bash
# 1. Check if server is running
curl http://localhost:3003/api/status

# 2. Get incidents
curl http://localhost:3003/api/v2/incidents | jq '.[0] | {id, pattern}'

# 3. Test fixes endpoint (replace INCIDENT_ID)
INCIDENT_ID=$(curl -s http://localhost:3003/api/v2/incidents | jq -r '.[0].id')
curl http://localhost:3003/api/v2/incidents/$INCIDENT_ID/fixes | jq '.'

# 4. Check server logs
# Look for errors when calling /fixes endpoint
```

## 📝 Expected Behavior

### When it works:
1. Click incident → Modal opens
2. Console shows: `[Remediation] Loading fixes for incident: ...`
3. Console shows: `[Remediation] Loaded plan: {...}`
4. UI shows:
   - "Recommended First Action" box (blue, at top)
   - "Suggested Fixes" section (below, with fix cards)
   - Each fix card has Preview/Apply buttons

### When it doesn't work:
1. Check browser console for errors
2. Check Network tab for failed requests
3. Check server logs for errors
4. Verify incident has matching pattern
5. Verify API endpoint is accessible


