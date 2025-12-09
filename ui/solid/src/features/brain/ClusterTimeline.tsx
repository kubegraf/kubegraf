import { Component, For, Show, createMemo } from 'solid-js';
import { TimelineEvent } from './types';

interface ClusterTimelineProps {
  events: TimelineEvent[];
}

const ClusterTimeline: Component<ClusterTimelineProps> = (props) => {
  const formatTime = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / 3600000);
    const diffMins = Math.floor((diffMs % 3600000) / 60000);

    if (diffHours < 1) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    const days = Math.floor(diffHours / 24);
    return `${days}d ago`;
  };

  const getEventIcon = (type: string): string => {
    switch (type) {
      case 'incident':
        return '⚠️';
      case 'event_spike':
        return '📊';
      case 'scaling':
        return '📈';
      case 'deployment':
        return '🚀';
      default:
        return '•';
    }
  };

  const getSeverityColor = (severity: string): string => {
    switch (severity) {
      case 'critical':
        return 'var(--error-color)';
      case 'warning':
        return 'var(--warning-color)';
      default:
        return 'var(--accent-primary)';
    }
  };

  const sortedEvents = createMemo(() => {
    return [...props.events].sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  });

  return (
    <div class="space-y-4">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-bold" style={{ 
          background: 'var(--accent-gradient)',
          '-webkit-background-clip': 'text',
          '-webkit-text-fill-color': 'transparent',
          'background-clip': 'text'
        }}>
          Cluster Timeline
        </h3>
        <span class="text-xs" style={{ color: 'var(--text-muted)' }}>
          Last 72h
        </span>
      </div>

      <div class="space-y-3 max-h-96 overflow-y-auto" style={{ 
        'scrollbar-width': 'thin',
        'scrollbar-color': 'var(--border-color) var(--bg-primary)'
      }}>
        <Show 
          when={sortedEvents().length > 0}
          fallback={
            <div class="text-center py-8" style={{ color: 'var(--text-muted)' }}>
              No events in the last 72 hours
            </div>
          }
        >
          <For each={sortedEvents()}>
            {(event) => (
              <div 
                class="flex gap-3 p-3 rounded-lg transition-colors"
                style={{ 
                  'border-left': `3px solid ${getSeverityColor(event.severity)}`,
                  background: 'var(--bg-tertiary)',
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-secondary)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'var(--bg-tertiary)'}
              >
                <div class="flex-shrink-0 mt-1">
                  <span class="text-lg">{getEventIcon(event.type)}</span>
                </div>
                <div class="flex-1 min-w-0">
                  <div class="flex items-start justify-between gap-2 mb-1">
                    <h4 class="font-semibold text-sm" style={{ color: 'var(--accent-primary)' }}>
                      {event.title}
                    </h4>
                    <span class="text-xs whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>
                      {formatTime(event.timestamp)}
                    </span>
                  </div>
                  <p class="text-xs mb-2" style={{ color: 'var(--text-secondary)' }}>
                    {event.description}
                  </p>
                  {event.resource && (
                    <div class="text-xs" style={{ color: 'var(--text-muted)' }}>
                      <span class="capitalize">{event.resource.kind}</span>
                      {' '}
                      <span class="font-mono">{event.resource.name}</span>
                      {event.resource.namespace && (
                        <>
                          {' '}in{' '}
                          <span class="font-mono">{event.resource.namespace}</span>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </For>
        </Show>
      </div>
    </div>
  );
};

export default ClusterTimeline;



