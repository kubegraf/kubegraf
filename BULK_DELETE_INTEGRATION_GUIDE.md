# Bulk Delete Integration Guide

This guide shows how to add bulk selection and delete functionality to resource views.

## Components Created

1. **BulkActions.tsx** - Floating action bar with delete button
2. **BulkDeleteModal.tsx** - Confirmation modal with typed confirmation
3. **useBulkSelection.ts** - Reusable hook for selection state

## Integration Steps for Each Resource View

### 1. Import Required Components

```typescript
import { BulkActions, SelectionCheckbox, SelectAllCheckbox } from '../components/BulkActions';
import { BulkDeleteModal } from '../components/BulkDeleteModal';
import { useBulkSelection } from '../hooks/useBulkSelection';
```

### 2. Add Bulk Selection Hook

```typescript
const Pods: Component = () => {
  // Add this hook
  const bulk = useBulkSelection<Pod>();

  // Add bulk delete modal state
  const [showBulkDeleteModal, setShowBulkDeleteModal] = createSignal(false);

  // ... rest of your component
```

### 3. Add Select All Checkbox to Table Header

```typescript
<thead>
  <tr>
    {/* Add this as first column */}
    <th class="px-4 py-3 text-left" style={headerCellStyle}>
      <SelectAllCheckbox
        checked={bulk.selectedCount() === filteredPods().length && filteredPods().length > 0}
        indeterminate={bulk.selectedCount() > 0 && bulk.selectedCount() < filteredPods().length}
        onChange={(checked) => {
          if (checked) {
            bulk.selectAll(filteredPods());
          } else {
            bulk.deselectAll();
          }
        }}
      />
    </th>
    <th>Name</th>
    {/* ... other columns */}
  </tr>
</thead>
```

### 4. Add Selection Checkbox to Each Row

```typescript
<tbody>
  <For each={paginatedPods()}>
    {(pod) => (
      <tr>
        {/* Add this as first column */}
        <td class="px-4 py-3" style={cellStyle}>
          <SelectionCheckbox
            checked={bulk.isSelected(pod)}
            onChange={() => bulk.toggleSelection(pod)}
          />
        </td>
        <td>{pod.name}</td>
        {/* ... other columns */}
      </tr>
    )}
  </For>
</tbody>
```

### 5. Add Bulk Actions Bar

```typescript
return (
  <div class="space-y-4">
    {/* Add this before or after your main content */}
    <BulkActions
      selectedCount={bulk.selectedCount()}
      totalCount={filteredPods().length}
      onSelectAll={() => bulk.selectAll(filteredPods())}
      onDeselectAll={() => bulk.deselectAll()}
      onDelete={() => setShowBulkDeleteModal(true)}
      resourceType="pods"
    />

    {/* Your existing content */}
    {/* ... */}
  </div>
);
```

### 6. Add Bulk Delete Modal

```typescript
return (
  <div>
    {/* Your existing content */}

    {/* Add this modal */}
    <BulkDeleteModal
      isOpen={showBulkDeleteModal()}
      onClose={() => setShowBulkDeleteModal(false)}
      onConfirm={async () => {
        const selected = bulk.getSelectedItems(filteredPods());
        for (const pod of selected) {
          await api.deletePod(pod.namespace, pod.name);
        }
        bulk.deselectAll();
        addNotification(`Deleted ${selected.length} pods`, 'success');
        refetch(); // Refresh the list
      }}
      resourceType="Pods"
      selectedItems={bulk.getSelectedItems(filteredPods())}
    />
  </div>
);
```

## API Methods Needed

Ensure each resource has a delete method in api.ts:

```typescript
// In api.ts
deletePod: (namespace: string, name: string) => fetch(`/api/pods/${namespace}/${name}`, { method: 'DELETE' }),
deleteDeployment: (namespace: string, name: string) => fetch(`/api/deployments/${namespace}/${name}`, { method: 'DELETE' }),
deleteService: (namespace: string, name: string) => fetch(`/api/services/${namespace}/${name}`, { method: 'DELETE' }),
// ... etc for all resources
```

## Features Included

✅ Multi-select with checkboxes
✅ Select All / Deselect All
✅ Floating action bar shows selection count
✅ Bulk delete with confirmation modal
✅ Typed confirmation (user must type "delete X items")
✅ Visual list of items to be deleted
✅ Loading states during deletion
✅ Success/error notifications
✅ Responsive design
✅ Gradient styling matching KubeGraf theme

## Resources to Update

Apply this pattern to:
- ✅ Pods
- ✅ Deployments
- ✅ StatefulSets
- ✅ DaemonSets
- ✅ Services
- ✅ Ingresses
- ✅ ConfigMaps
- ✅ Secrets
- ✅ Jobs
- ✅ CronJobs
- ✅ Namespaces
- ✅ ServiceAccounts
- ✅ NetworkPolicies
- ✅ Nodes (optional - usually don't delete nodes)
- ✅ Storage resources
