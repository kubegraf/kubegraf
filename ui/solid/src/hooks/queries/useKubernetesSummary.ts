import { createQuery } from '@tanstack/solid-query';
import { api } from '../../services/api';

export function useKubernetesSummary() {
  return createQuery(() => ({
    queryKey: ['kubernetes', 'summary'],
    queryFn: async () => {
      // Assuming there's a summary endpoint, otherwise combine multiple calls
      const [namespaces, pods, nodes] = await Promise.all([
        api.getNamespaceNames(),
        api.getPods(),
        api.getNodes(),
      ]);
      
      return {
        namespaces: namespaces.length,
        pods: pods.length,
        nodes: nodes.length,
      };
    },
    staleTime: 10_000, // 10 seconds
    refetchOnWindowFocus: false,
  }));
}

