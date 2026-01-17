# Details Modal Implementation Guide

This guide explains how to implement details modals with action buttons for all Kubernetes resource types, following the pattern established in Deployments.

## Implementation Pattern

### 1. Backend Enhancement (Go)

For each resource type, enhance the `handle<Resource>Details` function in `web_server.go` to return comprehensive information similar to `handleDeploymentDetails`:

**Required fields:**
- Basic info: name, namespace, ready, available, replicas, age, createdAt
- Metadata: labels, annotations
- Status: conditions (if applicable)
- Related resources: pods, services, etc.
- Resource-specific fields (e.g., serviceName for StatefulSets)

**Example pattern:**
```go
func (ws *WebServer) handle<Resource>Details(w http.ResponseWriter, r *http.Request) {
    // Get name and namespace from query params
    // Fetch resource from Kubernetes API
    // Get related pods using label selector
    // Format conditions
    // Return comprehensive JSON response
}
```

### 2. Frontend API Method

Add the details API method to `ui/solid/src/services/api.ts`:

```typescript
get<Resource>Details: (name: string, namespace: string) =>
  fetchAPI<any>(`/<resource>/details?name=${name}&namespace=${namespace}`),
```

### 3. Frontend Modal Implementation

In each resource route file (e.g., `StatefulSets.tsx`):

**Add state:**
```typescript
const [showDetails, setShowDetails] = createSignal(false);
const [showDeleteConfirm, setShowDeleteConfirm] = createSignal(false);
const [deleting, setDeleting] = createSignal(false);
```

**Add imports:**
```typescript
import ConfirmationModal from '../components/ConfirmationModal';
import RelatedResources from '../components/RelatedResources';
```

**Add details modal (similar to Deployments.tsx):**
- Basic information grid
- Related resources section (pods, services, etc.)
- Conditions section (if applicable)
- Action buttons: Scale (if applicable), Restart (if applicable), YAML, Describe, Edit, Delete

**Add delete confirmation modal:**
```typescript
<ConfirmationModal
  isOpen={showDeleteConfirm()}
  onClose={() => { if (!deleting()) setShowDeleteConfirm(false); }}
  title="Delete <Resource>"
  message={`Are you sure you want to delete the <resource> "${selected()?.name}"?`}
  details={selected() ? [
    { label: 'Name', value: selected()!.name },
    { label: 'Namespace', value: selected()!.namespace },
  ] : undefined}
  variant="danger"
  confirmText="Delete"
  cancelText="Cancel"
  loading={deleting()}
  onConfirm={handleDeleteConfirm}
  size="sm"
/>
```

**Update row click handler:**
```typescript
onClick={() => { setSelected(resource); setShowDetails(true); }}
```

## Resource-Specific Notes

### Workloads (StatefulSets, DaemonSets, Jobs, CronJobs)
- ✅ Scale button (except DaemonSets)
- ✅ Restart button
- ✅ Show related Pods
- ✅ Show Conditions

### PDB (PodDisruptionBudget)
- ❌ No Scale
- ❌ No Restart
- ✅ Show related Pods
- ✅ Show Conditions

### HPA (HorizontalPodAutoscaler)
- ❌ No Scale
- ❌ No Restart
- ✅ Show target resource (Deployment/StatefulSet)
- ✅ Show metrics and current/target values

### Services
- ❌ No Scale
- ❌ No Restart
- ✅ Show related Pods
- ✅ Show Endpoints
- ✅ Show Ingresses (if any)

### Ingresses
- ❌ No Scale
- ❌ No Restart
- ✅ Show related Services
- ✅ Show rules and paths

### NetworkPolicies
- ❌ No Scale
- ❌ No Restart
- ✅ Show policy rules
- ✅ Show affected Pods

### ConfigMaps & Secrets
- ❌ No Scale
- ❌ No Restart
- ✅ Show data/keys (be careful with secrets)
- ✅ Show related Pods using the resource

### PVs & PVCs
- ❌ No Scale
- ❌ No Restart
- ✅ Show capacity, access modes, storage class
- ✅ Show bound resources (PVC for PV, PV for PVC)
- ✅ Show using Pods

## Implementation Checklist

For each resource type:

- [ ] Enhance backend `handle<Resource>Details` endpoint
- [ ] Add `get<Resource>Details` API method
- [ ] Add modal state signals
- [ ] Add imports (ConfirmationModal, RelatedResources)
- [ ] Implement details modal component
- [ ] Implement delete confirmation modal
- [ ] Add delete handler function
- [ ] Update row click to open details modal
- [ ] Test all action buttons
- [ ] Test delete confirmation flow

## Files to Modify

### Backend
- `web_server.go` - Enhance details endpoints

### Frontend
- `ui/solid/src/services/api.ts` - Add API methods
- `ui/solid/src/routes/StatefulSets.tsx` - Implement modal
- `ui/solid/src/routes/DaemonSets.tsx` - Implement modal
- `ui/solid/src/routes/Jobs.tsx` - Implement modal
- `ui/solid/src/routes/CronJobs.tsx` - Implement modal
- `ui/solid/src/routes/PDB.tsx` - Implement modal
- `ui/solid/src/routes/HPA.tsx` - Implement modal
- `ui/solid/src/routes/Services.tsx` - Implement modal
- `ui/solid/src/routes/Ingresses.tsx` - Implement modal
- `ui/solid/src/routes/NetworkPolicies.tsx` - Implement modal (if exists)
- `ui/solid/src/routes/ConfigMaps.tsx` - Implement modal (if exists)
- `ui/solid/src/routes/Secrets.tsx` - Implement modal (if exists)
- `ui/solid/src/routes/PersistentVolumes.tsx` - Implement modal (if exists)
- `ui/solid/src/routes/PersistentVolumeClaims.tsx` - Implement modal (if exists)

## Reference Implementation

See `ui/solid/src/routes/Deployments.tsx` for the complete reference implementation.

