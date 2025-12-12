import { Component, Show } from 'solid-js';
import { useNamespaces } from '../hooks/queries';
import { usePods } from '../hooks/queries';
import { VirtualizedTable } from './VirtualizedTable';

/**
 * Example component showing how to use TanStack Query hooks
 * This demonstrates:
 * - Automatic caching
 * - Loading states
 * - Error handling
 * - Background refetching
 */
export const ExampleQueryUsage: Component = () => {
  const namespacesQuery = useNamespaces();
  const podsQuery = usePods();

  return (
    <div class="p-6">
      <h2 class="text-2xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
        Example: Using TanStack Query
      </h2>

      {/* Namespaces Section */}
      <div class="mb-8">
        <h3 class="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
          Namespaces
        </h3>
        <Show
          when={!namespacesQuery.isLoading}
          fallback={
            <div class="p-4 rounded" style={{ background: 'var(--bg-secondary)' }}>
              Loading namespaces...
            </div>
          }
        >
          <Show
            when={namespacesQuery.isSuccess}
            fallback={
              <div class="p-4 rounded text-red-500" style={{ background: 'var(--bg-secondary)' }}>
                Error: {namespacesQuery.error?.message || 'Failed to load namespaces'}
              </div>
            }
          >
            <div class="p-4 rounded" style={{ background: 'var(--bg-secondary)' }}>
              <p class="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
                Found {namespacesQuery.data?.length || 0} namespaces
                {namespacesQuery.isFetching && ' (refreshing...)'}
              </p>
              <ul class="list-disc list-inside">
                {(namespacesQuery.data || []).slice(0, 10).map((ns) => (
                  <li class="text-sm" style={{ color: 'var(--text-primary)' }}>
                    {ns}
                  </li>
                ))}
              </ul>
            </div>
          </Show>
        </Show>
      </div>

      {/* Pods Section with Virtualized Table */}
      <div>
        <h3 class="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
          Pods (Virtualized)
        </h3>
        <Show
          when={!podsQuery.isLoading}
          fallback={
            <div class="p-4 rounded" style={{ background: 'var(--bg-secondary)' }}>
              Loading pods...
            </div>
          }
        >
          <Show
            when={podsQuery.isSuccess}
            fallback={
              <div class="p-4 rounded text-red-500" style={{ background: 'var(--bg-secondary)' }}>
                Error: {podsQuery.error?.message || 'Failed to load pods'}
              </div>
            }
          >
            <VirtualizedTable
              data={() => podsQuery.data || []}
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
              ]}
              rowHeight={40}
              headerHeight={48}
              containerHeight={400}
            />
          </Show>
        </Show>
      </div>
    </div>
  );
};

