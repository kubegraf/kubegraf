import { Component, Show, For, createMemo } from 'solid-js';
import { usePods } from '../hooks/queries';
import { VirtualizedTable } from './VirtualizedTable';
import { TableSkeleton } from './SkeletonLoader';
import { LoadingOverlay } from './LoadingOverlay';
import { namespace } from '../stores/cluster';

/**
 * Pods table component using TanStack Query
 * Demonstrates migration pattern from createResource to usePods hook
 */
export const PodsTableWithQuery: Component = () => {
  const selectedNamespace = () => namespace();
  const podsQuery = usePods(selectedNamespace());

  // Memoized pods data
  const pods = createMemo(() => podsQuery.data || []);

  return (
    <LoadingOverlay
      isLoading={() => podsQuery.isLoading || podsQuery.isFetching}
      showLastKnownState={true}
      lastKnownState={
        <div class="p-6">
          <TableSkeleton rows={10} columns={6} />
        </div>
      }
    >
      <Show
        when={!podsQuery.isLoading}
        fallback={
          <div class="p-6">
            <TableSkeleton rows={10} columns={6} />
          </div>
        }
      >
        <Show
          when={podsQuery.isSuccess}
          fallback={
            <div class="p-6 rounded text-red-500" style={{ background: 'var(--bg-secondary)' }}>
              Error: {podsQuery.error?.message || 'Failed to load pods'}
            </div>
          }
        >
          <div class="p-6">
            <div class="mb-4 flex items-center justify-between">
              <h2 class="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
                Pods {podsQuery.isFetching && <span class="text-sm text-muted">(refreshing...)</span>}
              </h2>
              <div class="text-sm" style={{ color: 'var(--text-secondary)' }}>
                {pods().length} pods
              </div>
            </div>

            {/* Use VirtualizedTable for large lists */}
            <Show when={pods().length > 50} fallback={
              <div class="overflow-x-auto">
                <table class="w-full">
                  <thead>
                    <tr class="border-b" style={{ 'border-color': 'var(--border-color)' }}>
                      <th class="px-4 py-3 text-left text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Name</th>
                      <th class="px-4 py-3 text-left text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Namespace</th>
                      <th class="px-4 py-3 text-left text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Status</th>
                      <th class="px-4 py-3 text-left text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Ready</th>
                      <th class="px-4 py-3 text-left text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Age</th>
                    </tr>
                  </thead>
                  <tbody>
                    <For each={pods()}>
                      {(pod: any) => (
                        <tr class="border-b hover:bg-opacity-50 transition-colors" style={{ 'border-color': 'var(--border-color)' }}>
                          <td class="px-4 py-2 text-sm" style={{ color: 'var(--text-primary)' }}>
                            {pod.metadata?.name || 'Unknown'}
                          </td>
                          <td class="px-4 py-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                            {pod.metadata?.namespace || 'Unknown'}
                          </td>
                          <td class="px-4 py-2 text-sm" style={{ color: 'var(--text-primary)' }}>
                            {pod.status?.phase || 'Unknown'}
                          </td>
                          <td class="px-4 py-2 text-sm" style={{ color: 'var(--text-primary)' }}>
                            {(() => {
                              const containers = pod.status?.containerStatuses || [];
                              const ready = containers.filter((c: any) => c.ready).length;
                              return `${ready}/${containers.length}`;
                            })()}
                          </td>
                          <td class="px-4 py-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                            {pod.metadata?.creationTimestamp ? 
                              new Date(pod.metadata.creationTimestamp).toLocaleString() : 
                              'Unknown'}
                          </td>
                        </tr>
                      )}
                    </For>
                  </tbody>
                </table>
              </div>
            }>
              <VirtualizedTable
                data={() => pods()}
                columns={[
                  {
                    header: 'Name',
                    accessor: (pod: any) => pod.metadata?.name || 'Unknown',
                  },
                  {
                    header: 'Namespace',
                    accessor: (pod: any) => pod.metadata?.namespace || 'Unknown',
                  },
                  {
                    header: 'Status',
                    accessor: (pod: any) => pod.status?.phase || 'Unknown',
                  },
                  {
                    header: 'Ready',
                    accessor: (pod: any) => {
                      const containers = pod.status?.containerStatuses || [];
                      const ready = containers.filter((c: any) => c.ready).length;
                      return `${ready}/${containers.length}`;
                    },
                  },
                  {
                    header: 'Age',
                    accessor: (pod: any) => 
                      pod.metadata?.creationTimestamp ? 
                        new Date(pod.metadata.creationTimestamp).toLocaleString() : 
                        'Unknown',
                  },
                ]}
                rowHeight={40}
                headerHeight={48}
                containerHeight={600}
              />
            </Show>
          </div>
        </Show>
      </Show>
    </LoadingOverlay>
  );
};

