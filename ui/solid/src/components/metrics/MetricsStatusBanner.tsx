/**
 * Metrics Status Banner
 * Shows connection and availability status
 */
import { Component, Show, createMemo } from 'solid-js';
import { status } from '../../stores/metricsStore';

interface MetricsStatusBannerProps {
  class?: string;
}

const MetricsStatusBanner: Component<MetricsStatusBannerProps> = (props) => {
  const st = status;

  const shouldShow = createMemo(() => {
    const s = st();
    return s.reconnecting || s.source === 'unavailable' || s.error;
  });

  const bannerStyle = createMemo(() => {
    const s = st();
    if (s.reconnecting) {
      return {
        bg: 'rgba(245, 158, 11, 0.1)',
        border: 'rgba(245, 158, 11, 0.3)',
        color: '#f59e0b',
      };
    }
    if (s.source === 'unavailable' || s.error) {
      return {
        bg: 'rgba(107, 114, 128, 0.1)',
        border: 'rgba(107, 114, 128, 0.3)',
        color: '#6b7280',
      };
    }
    return {
      bg: 'rgba(34, 197, 94, 0.1)',
      border: 'rgba(34, 197, 94, 0.3)',
      color: '#22c55e',
    };
  });

  const message = createMemo(() => {
    const s = st();
    if (s.reconnecting) {
      return 'Reconnecting to metrics stream…';
    }
    if (s.source === 'unavailable') {
      if (s.error) {
        return `Live usage metrics unavailable: ${s.error}`;
      }
      return 'Live usage metrics unavailable on this cluster.';
    }
    if (s.error) {
      return `Metrics warning: ${s.error}`;
    }
    return null;
  });

  return (
    <Show when={shouldShow()}>
      <div
        class={`px-4 py-2 rounded-lg flex items-center gap-3 ${props.class || ''}`}
        style={{
          background: bannerStyle().bg,
          border: `1px solid ${bannerStyle().border}`,
        }}
      >
        {/* Icon */}
        <Show when={st().reconnecting}>
          <div class="spinner w-4 h-4" style={{ 'border-color': bannerStyle().color }} />
        </Show>
        <Show when={!st().reconnecting}>
          <svg
            class="w-4 h-4 flex-shrink-0"
            fill="none"
            stroke={bannerStyle().color}
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </Show>

        {/* Message */}
        <span class="text-sm" style={{ color: bannerStyle().color }}>
          {message()}
        </span>

        {/* Source indicator */}
        <Show when={st().source && st().source !== 'unavailable' && st().source !== 'unknown'}>
          <span
            class="ml-auto text-xs px-2 py-0.5 rounded-full"
            style={{
              background: 'rgba(255,255,255,0.1)',
              color: 'var(--text-muted)',
            }}
          >
            via {st().source === 'metrics_api' ? 'Metrics API' : 'Summary API'}
          </span>
        </Show>
      </div>
    </Show>
  );
};

export default MetricsStatusBanner;

