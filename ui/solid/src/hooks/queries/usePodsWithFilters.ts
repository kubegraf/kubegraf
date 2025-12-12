import { createQuery } from '@tanstack/solid-query';
import { createMemo } from 'solid-js';
import { api } from '../../services/api';
import { namespace } from '../../stores/cluster';

/**
 * Enhanced usePods hook with filtering and sorting support
 * Migrates from createResource to TanStack Query
 */
export function usePodsWithFilters() {
  // Get namespace from global store
  const selectedNamespace = () => namespace();

  const podsQuery = createQuery(() => ({
    queryKey: ['pods', selectedNamespace() || 'all'],
    queryFn: async () => {
      const pods = await api.getPods(selectedNamespace());
      return pods;
    },
    staleTime: 10_000, // 10 seconds
    refetchOnWindowFocus: false,
    enabled: true,
  }));

  // Memoized filtered and sorted pods
  const filteredPods = createMemo(() => {
    const pods = podsQuery.data || [];
    // Additional filtering/sorting can be added here
    return pods;
  });

  return {
    ...podsQuery,
    data: filteredPods,
    pods: filteredPods,
  };
}

