# SolidJS + TanStack Query Architecture

This document describes the new architecture using SolidJS with TanStack Query for fast, native-feeling UI.

## Overview

The UI is built with:
- **SolidJS** - Fine-grained reactivity for fast updates
- **TanStack Query** - Data fetching, caching, and synchronization
- **WebSocket** - Real-time updates via WebSocket connection
- **Tailwind CSS** - Utility-first styling

## Architecture Components

### 1. QueryClient Provider

Located in `src/providers/QueryClientProvider.tsx`

- Sets up TanStack Query with optimized defaults
- 10-second stale time for cached data
- No refetch on window focus (for better UX)
- 5-minute garbage collection time

**Usage:**
```tsx
import { QueryClientProvider } from './providers/QueryClientProvider';

<QueryClientProvider>
  <App />
</QueryClientProvider>
```

### 2. WebSocket Provider

Located in `src/providers/WebSocketProvider.tsx`

- Manages WebSocket connection lifecycle
- Provides reactive connection state
- Handles reconnection automatically

**Usage:**
```tsx
import { useWebSocket } from './providers/WebSocketProvider';

const ws = useWebSocket();
const connected = ws.connected(); // Reactive signal
```

### 3. Query Hooks

Located in `src/hooks/queries/`

Pre-built hooks for common resources:
- `useNamespaces()` - Fetch namespaces
- `usePods(namespace?)` - Fetch pods (optionally filtered by namespace)
- `useNodes()` - Fetch nodes
- `useKubernetesSummary()` - Fetch summary data

**Usage:**
```tsx
import { usePods } from '../hooks/queries';

const PodsList = () => {
  const podsQuery = usePods('default');
  
  return (
    <Show when={!podsQuery.isLoading}>
      <For each={podsQuery.data}>
        {(pod) => <div>{pod.metadata.name}</div>}
      </For>
    </Show>
  );
};
```

### 4. Virtualized Table

Located in `src/components/VirtualizedTable.tsx`

- Handles large datasets efficiently
- Only renders visible rows
- Smooth scrolling with thousands of items

**Usage:**
```tsx
import { VirtualizedTable } from './VirtualizedTable';

<VirtualizedTable
  data={() => pods}
  columns={[
    { header: 'Name', accessor: (pod) => pod.metadata.name },
    { header: 'Status', accessor: (pod) => pod.status.phase },
  ]}
  rowHeight={40}
  containerHeight={600}
/>
```

### 5. Prefetching

Located in `src/utils/prefetch.ts`

Prefetch data on hover or when anticipating navigation:

```tsx
import { prefetch } from '../utils/prefetch';

// On hover over "Topology" link
onMouseEnter={() => prefetch.topology()}
```

### 6. Optimistic Updates

Located in `src/utils/optimisticUpdates.ts`

Immediately update UI, then sync with server:

```tsx
import { optimistic } from '../utils/optimisticUpdates';

// Scale replicas optimistically
await optimistic.scaleReplicas(
  'my-deployment',
  'default',
  5,
  () => console.log('Success!'),
  (error) => console.error('Failed:', error)
);
```

## App Shell Pattern

The `AppShell` component provides a persistent layout:
- Sidebar (static, never re-renders)
- Header (static, never re-renders)
- Main content area (only this changes on navigation)

This gives a "native app" feeling where only the content area updates.

## Benefits

1. **Instant Navigation** - Cached data shows immediately
2. **Background Refresh** - Data stays fresh without blocking UI
3. **Real-time Updates** - WebSocket provides live updates
4. **Optimistic UI** - Actions feel instant
5. **Smooth Scrolling** - Virtualized tables handle large datasets
6. **Prefetching** - Data ready before user navigates

## Example: Complete Component

```tsx
import { Component, Show, For } from 'solid-js';
import { usePods } from '../hooks/queries';
import { useWebSocket } from '../providers/WebSocketProvider';
import { VirtualizedTable } from './VirtualizedTable';
import { prefetch } from '../utils/prefetch';

const PodsPage: Component = () => {
  const podsQuery = usePods();
  const ws = useWebSocket();

  // Prefetch on mount
  onMount(() => {
    prefetch.nodes();
  });

  // Subscribe to WebSocket updates
  createEffect(() => {
    const unsubscribe = ws.subscribe((msg) => {
      if (msg.type === 'pod_update') {
        // Invalidate query to refetch
        queryClient.invalidateQueries({ queryKey: ['pods'] });
      }
    });
    return unsubscribe;
  });

  return (
    <div class="p-6">
      <Show when={podsQuery.isLoading}>
        <div>Loading...</div>
      </Show>
      <Show when={podsQuery.isSuccess}>
        <VirtualizedTable
          data={() => podsQuery.data || []}
          columns={[...]}
        />
      </Show>
    </div>
  );
};
```

## File Structure

```
src/
├── providers/
│   ├── QueryClientProvider.tsx    # TanStack Query setup
│   └── WebSocketProvider.tsx       # WebSocket context
├── hooks/
│   └── queries/
│       ├── index.ts                # Export all hooks
│       ├── useNamespaces.ts
│       ├── usePods.ts
│       ├── useNodes.ts
│       └── useKubernetesSummary.ts
├── components/
│   ├── AppShell.tsx                # Persistent layout
│   └── VirtualizedTable.tsx       # Virtualized table
└── utils/
    ├── prefetch.ts                 # Prefetch utilities
    └── optimisticUpdates.ts        # Optimistic update utilities
```

## Migration Guide

To migrate existing components:

1. Replace `createResource` with query hooks:
   ```tsx
   // Old
   const [pods] = createResource(() => api.getPods());
   
   // New
   const podsQuery = usePods();
   ```

2. Use query state:
   ```tsx
   podsQuery.isLoading  // instead of pods.loading
   podsQuery.data        // instead of pods()
   podsQuery.error       // instead of pods.error
   ```

3. Wrap with providers in `App.tsx`:
   ```tsx
   <QueryClientProvider>
     <WebSocketProvider>
       {/* Your app */}
     </WebSocketProvider>
   </QueryClientProvider>
   ```

## Performance Tips

1. **Use prefetching** on hover for better perceived performance
2. **Use optimistic updates** for actions that should feel instant
3. **Use virtualized tables** for lists with 100+ items
4. **Leverage cache** - TanStack Query automatically caches, so switching views is instant
5. **Background refresh** - Data refreshes in background, user sees cached data immediately
