# Focus Navigation Implementation

## Summary
Implemented URL-based focus navigation from Pods to Deployments (and other workloads) with automatic scrolling, highlighting, and detail panel opening.

## Changes Made

### 1. Navigation Utilities (`ui/solid/src/utils/workload-navigation.ts`)
- Added `buildWorkloadFocusUrl()` - Builds URL with focus and namespace params
- Added `navigateToWorkloadWithFocus()` - Navigates to workload view with focus params in URL

### 2. Pods Page (`ui/solid/src/routes/Pods.tsx`)
- Updated workload chip click handler to use `navigateToWorkloadWithFocus()`
- Now navigates with query params: `?namespace=<ns>&focus=<name>`

### 3. Deployments Page (`ui/solid/src/routes/Deployments.tsx`)
- Added focus state management:
  - `focusedDeployment` - tracks which deployment to focus
  - `focusedRowRef` - ref to the focused row element
- Added URL param reading on mount:
  - Reads `focus` and `namespace` from query params
  - Applies namespace filter automatically
- Added focus handling effect:
  - Finds deployment in filtered/sorted list
  - Handles pagination (navigates to correct page if needed)
  - Scrolls row into view
  - Highlights row with blue background and left border
  - Auto-opens describe modal
  - Shows success notification
  - Clears focus after 2 seconds
- Added visual highlighting:
  - Blue background: `rgba(14, 165, 233, 0.15)`
  - Left border: `3px solid #0ea5e9`
  - Smooth transitions

## How It Works

1. **User clicks workload chip in Pods table** (e.g., "DEP app-a")
2. **Navigation function**:
   - Updates URL: `?namespace=default&focus=app-a`
   - Navigates to Deployments view
3. **Deployments page loads**:
   - Reads URL params on mount
   - Applies namespace filter if provided
   - Sets `focusedDeployment` state
4. **After data loads**:
   - Finds deployment in list
   - Navigates to correct page if needed
   - Sets row ref
   - Scrolls row into view
   - Highlights row
   - Opens describe modal
   - Shows notification
5. **After 2 seconds**:
   - Clears highlight
   - Removes focus param from URL

## URL Format
```
/deployments?namespace=default&focus=app-a
```

## Features
- ✅ URL-based (shareable, bookmarkable)
- ✅ Works with browser back/forward
- ✅ Handles pagination automatically
- ✅ Visual highlighting with fade
- ✅ Auto-opens details panel
- ✅ Namespace filtering
- ✅ Success notification
- ✅ Smooth scrolling

## Reusability
The same pattern can be applied to:
- StatefulSets
- DaemonSets
- Jobs
- CronJobs
- Services
- ConfigMaps
- Secrets
- HPA

Just need to:
1. Use `navigateToWorkloadWithFocus()` in source component
2. Add focus handling logic in target component (similar to Deployments)

## Testing
1. Navigate to Pods page
2. Find a pod with a workload chip (e.g., "DEP app-a")
3. Click the chip
4. Should:
   - Navigate to Deployments page
   - Filter to correct namespace
   - Scroll to deployment row
   - Highlight the row
   - Open describe modal
   - Show notification

