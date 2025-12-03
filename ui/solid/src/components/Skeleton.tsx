import { Component, JSX, mergeProps } from 'solid-js';

interface SkeletonProps {
  variant?: 'text' | 'circle' | 'rect' | 'card';
  width?: string | number;
  height?: string | number;
  className?: string;
  shimmer?: boolean;
  pulse?: boolean;
  count?: number;
  rounded?: boolean | string;
  style?: JSX.CSSProperties;
}

const Skeleton: Component<SkeletonProps> = (props) => {
  const merged = mergeProps({
    variant: 'text',
    shimmer: true,
    pulse: true,
    count: 1,
    rounded: false,
  }, props);

  const getVariantStyles = (): JSX.CSSProperties => {
    switch (merged.variant) {
      case 'circle':
        return {
          width: typeof merged.width === 'number' ? `${merged.width}px` : (merged.width || '40px'),
          height: typeof merged.height === 'number' ? `${merged.height}px` : (merged.height || '40px'),
          'border-radius': '50%',
        } as JSX.CSSProperties;
      case 'rect':
        return {
          width: typeof merged.width === 'number' ? `${merged.width}px` : (merged.width || '100%'),
          height: typeof merged.height === 'number' ? `${merged.height}px` : (merged.height || '100px'),
          'border-radius': merged.rounded ? (typeof merged.rounded === 'string' ? merged.rounded : '8px') : '0',
        } as JSX.CSSProperties;
      case 'card':
        return {
          width: typeof merged.width === 'number' ? `${merged.width}px` : (merged.width || '100%'),
          height: typeof merged.height === 'number' ? `${merged.height}px` : (merged.height || '200px'),
          'border-radius': '12px',
        } as JSX.CSSProperties;
      case 'text':
      default:
        return {
          width: typeof merged.width === 'number' ? `${merged.width}px` : (merged.width || '100%'),
          height: typeof merged.height === 'number' ? `${merged.height}px` : (merged.height || '1em'),
          'border-radius': merged.rounded ? (typeof merged.rounded === 'string' ? merged.rounded : '4px') : '0',
        } as JSX.CSSProperties;
    }
  };

  const getAnimationClass = () => {
    if (merged.shimmer && merged.pulse) {
      return 'skeleton-pulse skeleton-shimmer';
    } else if (merged.shimmer) {
      return 'skeleton-shimmer';
    } else if (merged.pulse) {
      return 'skeleton-pulse';
    }
    return '';
  };

  const renderSkeleton = (index: number) => {
    const variantStyles = getVariantStyles();
    const animationClass = getAnimationClass();
    const style: JSX.CSSProperties = {
      ...variantStyles,
      ...merged.style,
    };

    if (merged.variant === 'text' && merged.count > 1 && index < merged.count - 1) {
      style['margin-bottom'] = '0.5em';
    }

    return (
      <div
        class={`${animationClass} ${merged.className || ''}`}
        style={style}
        aria-hidden="true"
      />
    );
  };

  return (
    <div class="skeleton-container" style={{ width: '100%' }}>
      {Array.from({ length: merged.count }, (_, i) => renderSkeleton(i))}
    </div>
  );
};

// Specialized skeleton components
export const TextSkeleton: Component<Omit<SkeletonProps, 'variant'>> = (props) => (
  <Skeleton variant="text" {...props} />
);

export const CircleSkeleton: Component<Omit<SkeletonProps, 'variant'>> = (props) => (
  <Skeleton variant="circle" {...props} />
);

export const RectSkeleton: Component<Omit<SkeletonProps, 'variant'>> = (props) => (
  <Skeleton variant="rect" {...props} />
);

export const CardSkeleton: Component<Omit<SkeletonProps, 'variant'>> = (props) => (
  <Skeleton variant="card" {...props} />
);

// Table row skeleton
export const TableRowSkeleton: Component<{ columns: number; rows?: number }> = (props) => {
  const rows = props.rows || 5;
  const columns = props.columns;

  return (
    <>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <tr class="table-row-hover">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <td>
              <Skeleton
                variant="text"
                width={colIndex === 0 ? '80%' : '60%'}
                shimmer={true}
                pulse={true}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
};

// Dashboard card skeleton
export const DashboardCardSkeleton: Component<{ count?: number }> = (props) => {
  const count = props.count || 4;

  return (
    <div class="responsive-grid gap-6">
      {Array.from({ length: count }).map(() => (
        <div class="card card-hover-enhanced p-6">
          <div class="flex items-center justify-between mb-4">
            <Skeleton variant="text" width="40%" />
            <Skeleton variant="circle" width="24px" height="24px" />
          </div>
          <Skeleton variant="text" width="60%" height="2em" className="mb-2" />
          <Skeleton variant="text" width="30%" />
          <div class="mt-4 pt-4 border-t" style={{ 'border-color': 'var(--border-color)' } as JSX.CSSProperties}>
            <Skeleton variant="text" width="100%" height="0.875em" count={2} />
          </div>
        </div>
      ))}
    </div>
  );
};

// Sidebar skeleton
export const SidebarSkeleton: Component = () => (
  <div class="sidebar-glass w-52 h-full p-4">
    <div class="flex items-center gap-3 mb-8">
      <Skeleton variant="circle" width="32px" height="32px" />
      <Skeleton variant="text" width="120px" height="1.5em" />
    </div>
    <div class="space-y-6">
      {Array.from({ length: 5 }).map(() => (
        <div class="space-y-2">
          <Skeleton variant="text" width="80px" height="0.875em" className="mb-2" />
          <div class="space-y-1">
            {Array.from({ length: 3 }).map(() => (
              <div class="flex items-center gap-2 py-1.5">
                <Skeleton variant="circle" width="16px" height="16px" />
                <Skeleton variant="text" width="100%" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  </div>
);

export default Skeleton;
