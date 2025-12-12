import { queryClient } from '../providers/QueryClientProvider';
import { api } from '../services/api';

/**
 * Prefetch utilities for optimistic navigation
 * Call these on hover or when anticipating user navigation
 */

export const prefetch = {
  /**
   * Prefetch namespaces data
   */
  namespaces: () => {
    queryClient.prefetchQuery({
      queryKey: ['namespaces'],
      queryFn: async () => {
        return await api.getNamespaceNames();
      },
      staleTime: 10_000,
    });
  },

  /**
   * Prefetch pods for a namespace
   */
  pods: (namespace?: string) => {
    queryClient.prefetchQuery({
      queryKey: ['pods', namespace || 'all'],
      queryFn: async () => {
        const pods = await api.getPods(namespace);
        return pods;
      },
      staleTime: 10_000,
    });
  },

  /**
   * Prefetch nodes data
   */
  nodes: () => {
    queryClient.prefetchQuery({
      queryKey: ['nodes'],
      queryFn: async () => {
        const nodes = await api.getNodes();
        return nodes;
      },
      staleTime: 10_000,
    });
  },

  /**
   * Prefetch topology data
   */
  topology: () => {
    queryClient.prefetchQuery({
      queryKey: ['topology'],
      queryFn: async () => {
        // Assuming there's a topology endpoint
        const response = await fetch('/api/topology');
        return response.json();
      },
      staleTime: 10_000,
    });
  },
};

