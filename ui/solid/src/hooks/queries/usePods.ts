import { createQuery } from '@tanstack/solid-query';
import { api } from '../../services/api';

export function usePods(namespace?: string) {
  return createQuery(() => ({
    queryKey: ['pods', namespace || 'all'],
    queryFn: async () => {
      const pods = await api.getPods(namespace);
      return pods;
    },
    staleTime: 10_000, // 10 seconds
    refetchOnWindowFocus: false,
    enabled: true, // Always enabled, namespace can be empty for all namespaces
  }));
}

