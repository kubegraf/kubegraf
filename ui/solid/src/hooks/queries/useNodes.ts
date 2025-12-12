import { createQuery } from '@tanstack/solid-query';
import { api } from '../../services/api';

export function useNodes() {
  return createQuery(() => ({
    queryKey: ['nodes'],
    queryFn: async () => {
      const nodes = await api.getNodes();
      return nodes;
    },
    staleTime: 10_000, // 10 seconds
    refetchOnWindowFocus: false,
  }));
}

