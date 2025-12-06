import { Component, Show, JSX } from 'solid-js';
import LoadingSpinner from './LoadingSpinner';
import Skeleton from './Skeleton';
import { TextSkeleton, TableRowSkeleton, DashboardCardSkeleton } from './Skeleton';

// Re-export loading components for easy access
export { LoadingSpinner, Skeleton, TextSkeleton, TableRowSkeleton, DashboardCardSkeleton };

// Types for loading states
export type LoadingType = 'spinner' | 'skeleton' | 'progress' | 'pulse' | 'dots';

export interface LoadingProps {
  /** Type of loading indicator */
  type?: LoadingType;
  /** Size of the loading indicator */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  /** Whether data is loading */
  loading?: boolean;
  /** Error state */
  error?: Error | string | null;
  /** Whether to show loading text */
  showText?: boolean;
  /** Custom loading text */
  text?: string;
  /** Content to show when not loading */
  children?: JSX.Element;
  /** Fallback content when loading (overrides default) */
  fallback?: JSX.Element;
  /** Whether to show skeleton instead of spinner for content */
  skeleton?: boolean;
  /** Number of skeleton items to show */
  skeletonCount?: number;
  /** Skeleton variant */
  skeletonVariant?: 'text' | 'card' | 'table' | 'circle' | 'rect';
  /** Skeleton height */
  skeletonHeight?: string | number;
  /** Skeleton width */
  skeletonWidth?: string | number;
  /** Progress value (0-100) for progress type */
  progress?: number;
  /** Whether to show full page overlay */
  fullPage?: boolean;
  /** Custom class name */
  class?: string;
  /** Inline loading (no flex centering) */
  inline?: boolean;
}

/**
 * A flexible loading component that can show different types of loading states
 * including spinners, skeletons, progress bars, and error states.
 */
export const Loading: Component<LoadingProps> = (props) => {
  // If not loading and no error, show children
  if (!props.loading && !props.error) {
    return <>{props.children}</>;
  }

  // If there's an error
  if (props.error) {
    return (
      <div class={`flex flex-col items-center justify-center p-8 ${props.class || ''}`}>
        <div class="text-red-400 mb-2">
          <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div class="text-center">
          <h3 class="font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Error Loading Data</h3>
          <p class="text-sm" style={{ color: 'var(--text-secondary)' }}>
            {typeof props.error === 'string' ? props.error : props.error?.message || 'An unknown error occurred'}
          </p>
        </div>
      </div>
    );
  }

  // If custom fallback is provided
  if (props.fallback) {
    return <>{props.fallback}</>;
  }

  // Show skeleton if requested
  if (props.skeleton) {
    switch (props.skeletonVariant) {
      case 'text':
        return <TextSkeleton count={props.skeletonCount} height={props.skeletonHeight} width={props.skeletonWidth} />;
      case 'card':
        return <DashboardCardSkeleton count={props.skeletonCount} />;
      case 'table':
        return <TableRowSkeleton columns={3} rows={props.skeletonCount || 5} />;
      default:
        return (
          <Skeleton
            variant={props.skeletonVariant || 'rect'}
            count={props.skeletonCount}
            height={props.skeletonHeight}
            width={props.skeletonWidth}
          />
        );
    }
  }

  // Show loading based on type
  switch (props.type) {
    case 'skeleton':
      return <Skeleton variant="rect" count={props.skeletonCount || 3} />;
    
    case 'progress':
      return (
        <LoadingSpinner
          type="circle"
          size={props.size}
          progress={props.progress}
          showProgress={true}
          showText={props.showText}
          text={props.text}
          fullPage={props.fullPage}
          inline={props.inline}
          class={props.class}
        />
      );
    
    case 'pulse':
      return (
        <LoadingSpinner
          type="pulse"
          size={props.size}
          showText={props.showText}
          text={props.text}
          fullPage={props.fullPage}
          inline={props.inline}
          class={props.class}
        />
      );
    
    case 'dots':
      return (
        <LoadingSpinner
          type="dots"
          size={props.size}
          showText={props.showText}
          text={props.text}
          fullPage={props.fullPage}
          inline={props.inline}
          class={props.class}
        />
      );
    
    case 'spinner':
    default:
      return (
        <LoadingSpinner
          type="circle"
          size={props.size}
          showText={props.showText}
          text={props.text}
          fullPage={props.fullPage}
          inline={props.inline}
          class={props.class}
        />
      );
  }
};

/**
 * A convenience component for showing loading state with a spinner
 */
export const SpinnerLoading: Component<Omit<LoadingProps, 'type'>> = (props) => (
  <Loading type="spinner" {...props} />
);

/**
 * A convenience component for showing loading state with skeletons
 */
export const SkeletonLoading: Component<Omit<LoadingProps, 'type' | 'skeleton'>> = (props) => (
  <Loading type="skeleton" skeleton={true} {...props} />
);

/**
 * A convenience component for showing loading state with progress indicator
 */
export const ProgressLoading: Component<Omit<LoadingProps, 'type'> & { progress: number }> = (props) => (
  <Loading type="progress" {...props} />
);

/**
 * Higher-order component that wraps content with loading state
 */
export function withLoading<P extends object>(
  Component: Component<P>,
  loadingProps?: Omit<LoadingProps, 'children' | 'loading' | 'error'>
): Component<P & { loading?: boolean; error?: Error | string | null }> {
  return (props: P & { loading?: boolean; error?: Error | string | null }) => {
    const { loading, error, ...rest } = props;
    
    return (
      <Loading loading={loading} error={error} {...loadingProps}>
        <Component {...(rest as P)} />
      </Loading>
    );
  };
}

/**
 * Hook for managing loading state with delay to prevent flickering
 */
export function useLoadingState(initialLoading = false, delayMs = 300) {
  const [loading, setLoading] = createSignal(initialLoading);
  const [delayedLoading, setDelayedLoading] = createSignal(initialLoading);
  let timeoutId: number | null = null;

  createEffect(() => {
    if (timeoutId) clearTimeout(timeoutId);
    
    if (loading()) {
      // Show loading immediately when starting
      setDelayedLoading(true);
    } else {
      // Hide loading after delay to prevent flickering
      timeoutId = setTimeout(() => {
        setDelayedLoading(false);
      }, delayMs);
    }
  });

  onCleanup(() => {
    if (timeoutId) clearTimeout(timeoutId);
  });

  return {
    loading,
    delayedLoading,
    setLoading,
    startLoading: () => setLoading(true),
    stopLoading: () => setLoading(false),
  };
}

// Import SolidJS hooks
import { createSignal, createEffect, onCleanup } from 'solid-js';
