import { Component, JSX } from 'solid-js';

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: JSX.Element;
  actions?: JSX.Element;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const EmptyState: Component<EmptyStateProps> = (props) => {
  const getVariantStyles = () => {
    switch (props.variant) {
      case 'success':
        return {
          iconColor: 'var(--success-color)',
          borderColor: 'color-mix(in srgb, var(--success-color) 30%, transparent)',
          bgColor: 'color-mix(in srgb, var(--success-color) 10%, transparent)',
        };
      case 'warning':
        return {
          iconColor: 'var(--warning-color)',
          borderColor: 'color-mix(in srgb, var(--warning-color) 30%, transparent)',
          bgColor: 'color-mix(in srgb, var(--warning-color) 10%, transparent)',
        };
      case 'error':
        return {
          iconColor: 'var(--error-color)',
          borderColor: 'color-mix(in srgb, var(--error-color) 30%, transparent)',
          bgColor: 'color-mix(in srgb, var(--error-color) 10%, transparent)',
        };
      case 'info':
        return {
          iconColor: 'var(--accent-primary)',
          borderColor: 'color-mix(in srgb, var(--accent-primary) 30%, transparent)',
          bgColor: 'color-mix(in srgb, var(--accent-primary) 10%, transparent)',
        };
      default:
        return {
          iconColor: 'var(--text-muted)',
          borderColor: 'var(--border-color)',
          bgColor: 'var(--bg-card)',
        };
    }
  };

  const getSizeStyles = () => {
    switch (props.size) {
      case 'sm':
        return {
          padding: '1.5rem',
          iconSize: '2.5rem',
          titleSize: '1rem',
          descriptionSize: '0.875rem',
        };
      case 'lg':
        return {
          padding: '4rem 2rem',
          iconSize: '5rem',
          titleSize: '1.75rem',
          descriptionSize: '1.125rem',
        };
      case 'md':
      default:
        return {
          padding: '3rem 2rem',
          iconSize: '4rem',
          titleSize: '1.5rem',
          descriptionSize: '1rem',
        };
    }
  };

  const variantStyles = getVariantStyles();
  const sizeStyles = getSizeStyles();

  const defaultIcon = () => {
    switch (props.variant) {
      case 'success':
        return (
          <svg style={{ color: variantStyles.iconColor }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'warning':
        return (
          <svg style={{ color: variantStyles.iconColor }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        );
      case 'error':
        return (
          <svg style={{ color: variantStyles.iconColor }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'info':
        return (
          <svg style={{ color: variantStyles.iconColor }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      default:
        return (
          <svg style={{ color: variantStyles.iconColor }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
        );
    }
  };

  return (
    <div
      class={`empty-state-enhanced ${props.className || ''}`}
      style={{
        padding: sizeStyles.padding,
        background: variantStyles.bgColor,
        'border-color': variantStyles.borderColor,
      }}
    >
      <div
        class="empty-state-icon"
        style={{
          'font-size': sizeStyles.iconSize,
          color: variantStyles.iconColor,
        }}
      >
        {props.icon || defaultIcon()}
      </div>
      
      <h3
        class="empty-state-title"
        style={{
          'font-size': sizeStyles.titleSize,
        }}
      >
        {props.title}
      </h3>
      
      {props.description && (
        <p
          class="empty-state-description"
          style={{
            'font-size': sizeStyles.descriptionSize,
          }}
        >
          {props.description}
        </p>
      )}
      
      {props.actions && (
        <div class="empty-state-actions">
          {props.actions}
        </div>
      )}
    </div>
  );
};

// Pre-configured empty states for common scenarios
export const NoDataEmptyState: Component<{ resource?: string; actions?: JSX.Element }> = (props) => (
  <EmptyState
    title={props.resource ? `No ${props.resource} Found` : 'No Data Available'}
    description={props.resource ? `There are no ${props.resource.toLowerCase()} to display.` : 'There is no data to display at the moment.'}
    variant="info"
    actions={props.actions}
  />
);

export const ErrorEmptyState: Component<{ title?: string; description?: string; actions?: JSX.Element }> = (props) => (
  <EmptyState
    title={props.title || 'Something Went Wrong'}
    description={props.description || 'An error occurred while loading the data. Please try again.'}
    variant="error"
    actions={props.actions}
  />
);

export const LoadingEmptyState: Component = () => (
  <EmptyState
    title="Loading..."
    description="Please wait while we load the data."
    variant="info"
    size="md"
  />
);

export const NoResultsEmptyState: Component<{ searchQuery?: string; actions?: JSX.Element }> = (props) => (
  <EmptyState
    title="No Results Found"
    description={props.searchQuery ? `No results found for "${props.searchQuery}". Try a different search term.` : 'No results match your criteria.'}
    variant="warning"
    actions={props.actions}
  />
);

export const NoConnectionEmptyState: Component<{ actions?: JSX.Element }> = (props) => (
  <EmptyState
    title="No Cluster Connection"
    description="Connect to a Kubernetes cluster to start using KubeGraf."
    variant="error"
    actions={props.actions}
    size="lg"
  />
);

export const NoPermissionsEmptyState: Component<{ resource?: string; actions?: JSX.Element }> = (props) => (
  <EmptyState
    title="Insufficient Permissions"
    description={props.resource ? `You don't have permission to view ${props.resource.toLowerCase()}.` : 'You don\'t have sufficient permissions to access this resource.'}
    variant="warning"
    actions={props.actions}
  />
);

export default EmptyState;
