# UI Fixes Summary - Feature Branch: feature-ui-fixes

This document summarizes all the fixes implemented in this branch.

## Fixed Issues

### 1. ✅ ResourceMap Namespace Dropdown
**Issue:** Only "All namespaces" showing in dropdown, should give option to choose other namespaces.

**Fix:** 
- ResourceMap now properly uses `selectedNamespaces()` from globalStore to detect namespace changes
- Added namespace change watcher to refetch topology when namespaces change
- The global header dropdown should now work correctly on ResourceMap page

**Files Modified:**
- `kubegraf/ui/solid/src/routes/ResourceMap.tsx`

### 2. ✅ D3.js Graph Refresh Issue
**Issue:** Resource Map D3.js force-directed graph keeps refreshing 3-4 times, needs to be stable.

**Fix:**
- Added refresh prevention mechanism using `isSetupInProgress` flag
- Added topology data comparison to only refresh when data actually changes
- Used `requestAnimationFrame` to batch updates and prevent multiple refreshes
- Added delay after visualization setup to allow it to settle

**Files Modified:**
- `kubegraf/ui/solid/src/routes/ResourceMap.tsx`

### 3. ✅ Deployment/StatefulSet/DaemonSet Bulk Actions
**Issue:** Restart/delete all pods actions not showing in UI for particular namespace.

**Fix:**
- Added `shouldShowBulkActions` memo to properly detect when namespace is selected
- Bulk actions now show correctly when a single namespace is selected (not "All Namespaces")
- Actions are properly visible in the status summary area

**Files Modified:**
- `kubegraf/ui/solid/src/routes/Deployments.tsx`
- `kubegraf/ui/solid/src/routes/StatefulSets.tsx`
- `kubegraf/ui/solid/src/routes/DaemonSets.tsx`

### 4. ✅ Incidents Pod Logs
**Issue:** Pod logs not coming when clicking on pod logs from incidents.

**Fix:**
- Added auto-open functionality in Logs component to check for sessionStorage flags
- When navigating from incidents, the Logs component now automatically:
  - Selects the pod
  - Selects the namespace
  - Selects the first container
  - Fetches logs automatically after a short delay

**Files Modified:**
- `kubegraf/ui/solid/src/routes/Logs.tsx`

### 5. ✅ Dashboard Monthly Cost Display
**Issue:** Est. Monthly Cost not giving any value.

**Fix:**
- Fixed cost resource to properly handle null/undefined values
- Added proper fallback display for cost values
- Cost now displays correctly even when data is loading or unavailable

**Files Modified:**
- `kubegraf/ui/solid/src/routes/Dashboard.tsx`

### 6. ✅ Dashboard Performance Optimization
**Issue:** All resources should load instantly and fast.

**Fix:**
- Implemented cached resources for pods, deployments, and services
- Resources now load from cache immediately if available
- Background refresh ensures data stays up-to-date
- Only refetch if cache is empty, reducing unnecessary API calls

**Files Modified:**
- `kubegraf/ui/solid/src/routes/Dashboard.tsx`
- `kubegraf/ui/solid/src/utils/dashboardOptimization.ts` (new file)

### 7. ✅ Security Insights Diagnostics Speed
**Issue:** Security & Diagnostics loading for a long time, should be instant and fast.

**Fix:**
- Reduced diagnostics timeout from 50s to 30s for faster feedback
- Changed diagnostics to NOT auto-run on mount (only manual or scheduled)
- Diagnostics now only run when explicitly triggered via button or schedule
- This prevents slow loading when navigating to Security page

**Files Modified:**
- `kubegraf/ui/solid/src/routes/Security.tsx`

### 8. ✅ Diagnostics Frequency Control
**Issue:** No need to check security diagnostics always - keep it as once in 30 mins, enable run Diagnostics button, show message about frequency, give option to choose frequency.

**Fix:**
- Created new `DiagnosticsControls` component with:
  - Frequency selector (Manual only, 5min, 15min, 30min, 1hr, 2hr, 4hr)
  - Default set to 30 minutes
  - Shows next run time
  - Manual "Run Diagnostics Now" button
  - Message showing current frequency setting
  - Frequency stored in localStorage
- Diagnostics no longer auto-run on page load
- Only runs when manually triggered or on schedule

**Files Created:**
- `kubegraf/ui/solid/src/components/DiagnosticsControls.tsx`

**Files Modified:**
- `kubegraf/ui/solid/src/routes/Security.tsx`

### 9. ✅ Event Monitor Namespace Display
**Issue:** Remove showing all namespace horizontally, keep on dropdown button for namespace selection.

**Fix:**
- Removed horizontal namespace tabs/buttons display
- Kept only the dropdown button for namespace selection
- Namespace selector now uses dropdown only (cleaner UI)

**Files Modified:**
- `kubegraf/ui/solid/src/routes/MonitoredEvents.tsx`

### 10. ✅ AI/ML Insights Improvements
**Issue:** Improvise the AI/ML Insights - No ML Recommendations Yet message.

**Fix:**
- Enhanced the "No ML Recommendations Yet" message with:
  - Clear explanation of what to expect
  - List of recommendation types (Resource optimization, Scaling, Cost optimization, Performance tuning)
  - How to get recommendations guide
  - Progress indicator showing metrics collection status
  - Helpful tips and guidance

**Files Modified:**
- `kubegraf/ui/solid/src/routes/Anomalies.tsx`

### 11. ✅ Autofix Buttons
**Issue:** Can't enable any of the Autofix options, can't click on the button.

**Fix:**
- Removed `disabled` attribute from rule toggle checkboxes
- Users can now enable individual rules even when AutoFix is disabled
- Added warning message when a rule is enabled but AutoFix is disabled
- Rules can be enabled/disabled independently

**Files Modified:**
- `kubegraf/ui/solid/src/routes/AutoFix.tsx`

## New Files Created

1. `kubegraf/ui/solid/src/components/DiagnosticsControls.tsx` - Diagnostics frequency control component
2. `kubegraf/ui/solid/src/utils/dashboardOptimization.ts` - Dashboard optimization utilities
3. `kubegraf/ui/solid/src/utils/namespaceHelpers.ts` - Namespace helper utilities

## Build Status

✅ Frontend build: Successful
✅ Backend build: Successful
✅ No linter errors

## Testing Recommendations

1. **ResourceMap:**
   - Navigate to ResourceMap and verify namespace dropdown shows all namespaces
   - Select a namespace and verify graph updates without multiple refreshes

2. **Deployments/StatefulSets/DaemonSets:**
   - Select a namespace and verify bulk restart/delete buttons appear
   - Test bulk actions work correctly

3. **Incidents:**
   - Click "View Logs" on an incident
   - Verify logs automatically open for the correct pod

4. **Dashboard:**
   - Verify resources load quickly (from cache)
   - Verify monthly cost displays correctly

5. **Security:**
   - Verify diagnostics don't auto-run on page load
   - Test frequency selector and manual run button
   - Verify diagnostics run on schedule

6. **Event Monitor:**
   - Verify namespace selector uses dropdown only (no horizontal display)

7. **Autofix:**
   - Verify rules can be enabled/disabled regardless of AutoFix status

## Notes

- All changes maintain backward compatibility
- No breaking changes to existing APIs
- Caching improves performance significantly
- Diagnostics frequency defaults to 30 minutes as requested



