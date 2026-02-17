/**
 * SkeletonLoader - Loading state placeholders
 *
 * Features:
 * - Smooth skeleton animations
 * - Component-specific skeletons
 * - Responsive designs
 * - Reduced motion support
 */

import { Component } from 'solid-js';

/**
 * Base skeleton element
 */
export const Skeleton: Component<{
  width?: string;
  height?: string;
  borderRadius?: string;
  className?: string;
}> = (props) => {
  return (
    <div
      class={`skeleton ${props.className || ''}`}
      style={{
        width: props.width || '100%',
        height: props.height || '20px',
        'border-radius': props.borderRadius || '4px',
      }}
    />
  );
};

/**
 * Skeleton for incident card in ContextNavigator
 */
export const SkeletonIncidentCard: Component = () => {
  return (
    <div class="skeleton-incident-card">
      <div class="skeleton-card-header">
        <Skeleton width="24px" height="24px" borderRadius="50%" />
        <Skeleton width="60%" height="16px" />
      </div>
      <Skeleton width="80%" height="14px" />
      <Skeleton width="40%" height="12px" />
      <div class="skeleton-card-footer">
        <Skeleton width="30%" height="12px" />
        <Skeleton width="20%" height="12px" />
      </div>
    </div>
  );
};

/**
 * Skeleton for Investigation Workspace
 */
export const SkeletonInvestigationWorkspace: Component = () => {
  return (
    <div class="skeleton-investigation-workspace">
      {/* Header skeleton */}
      <div class="skeleton-incident-header">
        <div class="skeleton-badges">
          <Skeleton width="80px" height="24px" borderRadius="12px" />
          <Skeleton width="100px" height="24px" borderRadius="12px" />
        </div>
        <Skeleton width="60%" height="32px" />
        <div class="skeleton-meta">
          <Skeleton width="200px" height="14px" />
          <Skeleton width="150px" height="14px" />
        </div>
      </div>

      {/* Content skeleton */}
      <div class="skeleton-content-area">
        <div class="skeleton-section">
          <Skeleton width="40%" height="24px" />
          <Skeleton width="100%" height="100px" borderRadius="8px" />
        </div>
        <div class="skeleton-section">
          <Skeleton width="50%" height="24px" />
          <Skeleton width="100%" height="200px" borderRadius="8px" />
        </div>
      </div>

      {/* Footer skeleton */}
      <div class="skeleton-footer">
        <Skeleton width="100px" height="40px" borderRadius="8px" />
        <Skeleton width="120px" height="40px" borderRadius="8px" />
      </div>
    </div>
  );
};

/**
 * Skeleton for Intelligence Assistant
 */
export const SkeletonIntelligenceAssistant: Component = () => {
  return (
    <div class="skeleton-intelligence-assistant">
      <div class="skeleton-section">
        <Skeleton width="60%" height="20px" />
        <div class="skeleton-insight-list">
          <Skeleton width="100%" height="60px" borderRadius="8px" />
          <Skeleton width="100%" height="60px" borderRadius="8px" />
          <Skeleton width="100%" height="60px" borderRadius="8px" />
        </div>
      </div>

      <div class="skeleton-section">
        <Skeleton width="70%" height="20px" />
        <div class="skeleton-related-list">
          <Skeleton width="100%" height="40px" borderRadius="8px" />
          <Skeleton width="100%" height="40px" borderRadius="8px" />
        </div>
      </div>
    </div>
  );
};

/**
 * Skeleton for Incident Story
 */
export const SkeletonIncidentStory: Component = () => {
  return (
    <div class="skeleton-incident-story">
      <div class="skeleton-story-header">
        <Skeleton width="32px" height="32px" borderRadius="50%" />
        <Skeleton width="40%" height="24px" />
      </div>
      <div class="skeleton-story-content">
        <Skeleton width="100%" height="16px" />
        <Skeleton width="95%" height="16px" />
        <Skeleton width="90%" height="16px" />
        <Skeleton width="85%" height="16px" />
      </div>
    </div>
  );
};

/**
 * Skeleton for Fix Execution Steps
 */
export const SkeletonFixExecution: Component = () => {
  return (
    <div class="skeleton-fix-execution">
      <Skeleton width="100%" height="80px" borderRadius="8px" />
      <div class="skeleton-steps">
        <Skeleton width="100%" height="60px" borderRadius="8px" />
        <Skeleton width="100%" height="60px" borderRadius="8px" />
        <Skeleton width="100%" height="60px" borderRadius="8px" />
      </div>
    </div>
  );
};

/**
 * Skeleton for charts/graphs
 */
export const SkeletonChart: Component<{ height?: string }> = (props) => {
  return (
    <div class="skeleton-chart" style={{ height: props.height || '200px' }}>
      <div class="skeleton-chart-bars">
        <Skeleton width="20%" height="60%" />
        <Skeleton width="20%" height="80%" />
        <Skeleton width="20%" height="50%" />
        <Skeleton width="20%" height="90%" />
        <Skeleton width="20%" height="70%" />
      </div>
    </div>
  );
};

/**
 * Skeleton for text lines
 */
export const SkeletonText: Component<{
  lines?: number;
  lastLineWidth?: string;
}> = (props) => {
  const lines = props.lines || 3;
  const lastLineWidth = props.lastLineWidth || '70%';

  return (
    <div class="skeleton-text">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          width={i === lines - 1 ? lastLineWidth : '100%'}
          height="16px"
        />
      ))}
    </div>
  );
};

/**
 * Skeleton for tables
 */
export const SkeletonTable: Component<{ rows?: number; cols?: number }> = (props) => {
  const rows = props.rows || 5;
  const cols = props.cols || 4;

  return (
    <div class="skeleton-table">
      {/* Header */}
      <div class="skeleton-table-header">
        {Array.from({ length: cols }).map(() => (
          <Skeleton width="100%" height="20px" />
        ))}
      </div>

      {/* Rows */}
      {Array.from({ length: rows }).map(() => (
        <div class="skeleton-table-row">
          {Array.from({ length: cols }).map(() => (
            <Skeleton width="100%" height="16px" />
          ))}
        </div>
      ))}
    </div>
  );
};

/**
 * Skeleton for list items
 */
export const SkeletonList: Component<{ items?: number }> = (props) => {
  const items = props.items || 5;

  return (
    <div class="skeleton-list">
      {Array.from({ length: items }).map(() => (
        <div class="skeleton-list-item">
          <Skeleton width="40px" height="40px" borderRadius="50%" />
          <div class="skeleton-list-content">
            <Skeleton width="80%" height="16px" />
            <Skeleton width="60%" height="14px" />
          </div>
        </div>
      ))}
    </div>
  );
};

/**
 * Pulsing loader for inline loading states
 */
export const PulsingLoader: Component<{
  size?: 'small' | 'medium' | 'large';
}> = (props) => {
  const size = props.size || 'medium';
  return (
    <div class={`pulsing-loader pulsing-loader-${size}`}>
      <div class="pulse-dot" />
      <div class="pulse-dot" />
      <div class="pulse-dot" />
    </div>
  );
};

/**
 * Spinner loader
 */
export const Spinner: Component<{
  size?: 'small' | 'medium' | 'large';
  color?: string;
}> = (props) => {
  const size = props.size || 'medium';
  return (
    <div
      class={`spinner spinner-${size}`}
      style={{ 'border-color': props.color ? `${props.color} transparent transparent transparent` : undefined }}
      role="status"
      aria-label="Loading"
    >
      <span class="sr-only">Loading...</span>
    </div>
  );
};

export default Skeleton;
