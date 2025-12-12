import { createQuery } from '@tanstack/solid-query';
import { api } from '../../services/api';

export function useNamespaces() {
  return createQuery(() => ({
    queryKey: ['namespaces'],
    queryFn: async () => {
      // For most UI dropdowns we only need namespace names
      return await api.getNamespaceNames();
    },
    staleTime: 10_000, // 10 seconds
    refetchOnWindowFocus: false,
  }));
}

