import { Component, For } from 'solid-js';

interface SkeletonLoaderProps {
  variant?: 'text' | 'circle' | 'rect';
  width?: string | number;
  height?: string | number;
  count?: number;
  className?: string;
}

/**
 * Skeleton loader component for loading states
 * Shows placeholder content while data is loading
 */
export const SkeletonLoader: Component<SkeletonLoaderProps> = (props) => {
  const variant = () => props.variant || 'rect';
  const width = () => props.width || '100%';
  const height = () => props.height || '1rem';
  const count = () => props.count || 1;
  const className = () => props.className || '';

  const getStyles = () => {
    const baseStyles = {
      background: 'var(--bg-tertiary)',
      'border-radius': variant() === 'circle' ? '50%' : '4px',
      'animation': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
    };

    if (variant() === 'text') {
      return {
        ...baseStyles,
        height: typeof height() === 'number' ? `${height()}px` : height(),
        width: typeof width() === 'number' ? `${width()}px` : width(),
      };
    }

    return {
      ...baseStyles,
      width: typeof width() === 'number' ? `${width()}px` : width(),
      height: typeof height() === 'number' ? `${height()}px` : height(),
    };
  };

  return (
    <>
      <For each={Array(count())}>
        {() => (
          <div
            class={className()}
            style={getStyles()}
          />
        )}
      </For>
      <style>
        {`
          @keyframes pulse {
            0%, 100% {
              opacity: 1;
            }
            50% {
              opacity: 0.5;
            }
          }
        `}
      </style>
    </>
  );
};

/**
 * Table skeleton loader - shows skeleton rows for tables
 */
export const TableSkeleton: Component<{ rows?: number; columns?: number }> = (props) => {
  const rows = () => props.rows || 5;
  const columns = () => props.columns || 4;

  return (
    <div class="w-full">
      {/* Header skeleton */}
      <div class="flex gap-4 mb-4 pb-2 border-b" style={{ 'border-color': 'var(--border-color)' }}>
        <For each={Array(columns())}>
          {() => (
            <SkeletonLoader variant="text" width="25%" height={20} />
          )}
        </For>
      </div>
      {/* Row skeletons */}
      <For each={Array(rows())}>
        {() => (
          <div class="flex gap-4 mb-3">
            <For each={Array(columns())}>
              {() => (
                <SkeletonLoader variant="text" width="25%" height={16} />
              )}
            </For>
          </div>
        )}
      </For>
    </div>
  );
};

/**
 * Card skeleton loader - shows skeleton for card layouts
 */
export const CardSkeleton: Component = () => {
  return (
    <div class="p-6 rounded-lg" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
      <SkeletonLoader variant="text" width="60%" height={24} className="mb-4" />
      <SkeletonLoader variant="text" width="100%" height={16} className="mb-2" />
      <SkeletonLoader variant="text" width="100%" height={16} className="mb-2" />
      <SkeletonLoader variant="text" width="80%" height={16} />
    </div>
  );
};

