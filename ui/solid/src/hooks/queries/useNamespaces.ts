import { createQuery } from '@tanstack/solid-query';
import { api } from '../../services/api';

export function useNamespaces() {
  return createQuery(() => ({
    queryKey: ['namespaces'],
    queryFn: async () => {
      const namespaces = await api.getNamespaces();
      return namespaces;
    },
    staleTime: 10_000, // 10 seconds
    refetchOnWindowFocus: false,
  }));
}

