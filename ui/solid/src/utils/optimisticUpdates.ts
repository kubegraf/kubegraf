import { queryClient } from '../providers/QueryClientProvider';
import { api } from '../services/api';

/**
 * Optimistic update utilities
 * These functions immediately update the UI, then sync with the server
 */

export const optimistic = {
  /**
   * Optimistically scale replicas
   * Immediately updates UI, then syncs with server
   */
  scaleReplicas: async (
    deploymentName: string,
    namespace: string,
    replicas: number,
    onSuccess?: () => void,
    onError?: (error: Error) => void
  ) => {
    const queryKey = ['pods', namespace || 'all'];
    
    // Get current data
    const previousData = queryClient.getQueryData(queryKey);
    
    // Optimistically update cache
    queryClient.setQueryData(queryKey, (old: any) => {
      if (!old) return old;
      // Update pod counts optimistically
      return old.map((pod: any) => {
        if (pod.metadata?.name?.includes(deploymentName)) {
          return {
            ...pod,
            // Update replica-related fields if they exist
            status: {
              ...pod.status,
              replicas,
            },
          };
        }
        return pod;
      });
    });

    try {
      // Perform actual API call
      await api.scaleDeployment(deploymentName, namespace, replicas);
      
      // Invalidate to refetch fresh data
      await queryClient.invalidateQueries({ queryKey });
      
      onSuccess?.();
    } catch (error) {
      // Revert optimistic update on error
      queryClient.setQueryData(queryKey, previousData);
      
      onError?.(error as Error);
      throw error;
    }
  },

  /**
   * Optimistically delete a resource
   */
  deleteResource: async (
    resourceType: 'pod' | 'deployment' | 'service',
    name: string,
    namespace: string,
    onSuccess?: () => void,
    onError?: (error: Error) => void
  ) => {
    const queryKey = [resourceType === 'pod' ? 'pods' : resourceType + 's', namespace || 'all'];
    
    // Get current data
    const previousData = queryClient.getQueryData(queryKey);
    
    // Optimistically remove from cache
    queryClient.setQueryData(queryKey, (old: any) => {
      if (!old) return old;
      return old.filter((item: any) => item.metadata?.name !== name);
    });

    try {
      // Perform actual API call
      if (resourceType === 'pod') {
        await api.deletePod(name, namespace);
      } else if (resourceType === 'deployment') {
        await api.deleteDeployment(name, namespace);
      } else if (resourceType === 'service') {
        await api.deleteService(name, namespace);
      }
      
      // Invalidate to refetch fresh data
      await queryClient.invalidateQueries({ queryKey });
      
      onSuccess?.();
    } catch (error) {
      // Revert optimistic update on error
      queryClient.setQueryData(queryKey, previousData);
      
      onError?.(error as Error);
      throw error;
    }
  },
};

