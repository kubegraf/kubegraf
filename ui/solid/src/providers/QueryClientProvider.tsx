import { Component, JSX } from 'solid-js';
import { QueryClient, QueryClientProvider as TanStackQueryClientProvider } from '@tanstack/solid-query';

// Create a QueryClient instance with optimized defaults
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10_000, // 10 seconds - data is fresh for 10s
      refetchOnWindowFocus: false, // Don't refetch on window focus
      refetchOnMount: true, // Refetch on mount if data is stale
      retry: 1, // Retry failed requests once
      gcTime: 5 * 60 * 1000, // Keep unused data in cache for 5 minutes
    },
    mutations: {
      retry: 1,
    },
  },
});

export const QueryClientProvider: Component<{ children: JSX.Element }> = (props) => {
  return (
    <TanStackQueryClientProvider client={queryClient}>
      {props.children}
    </TanStackQueryClientProvider>
  );
};

// Export queryClient for prefetching and manual cache access
export { queryClient };

