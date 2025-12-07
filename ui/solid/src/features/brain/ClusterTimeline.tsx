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
        return '#ef4444';
      case 'warning':
        return '#f59e0b';
      default:
        return '#0ea5e9';
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
          background: 'linear-gradient(135deg, #0ea5e9 0%, #8b5cf6 100%)',
          '-webkit-background-clip': 'text',
          '-webkit-text-fill-color': 'transparent',
          'background-clip': 'text'
        }}>
          Cluster Timeline
        </h3>
        <span class="text-xs" style={{ color: '#8b949e' }}>
          Last 72h
        </span>
      </div>

      <div class="space-y-3 max-h-96 overflow-y-auto" style={{ 
        'scrollbar-width': 'thin',
        'scrollbar-color': '#333333 #000000'
      }}>
        <Show 
          when={sortedEvents().length > 0}
          fallback={
            <div class="text-center py-8" style={{ color: '#8b949e' }}>
              No events in the last 72 hours
            </div>
          }
        >
          <For each={sortedEvents()}>
            {(event) => (
              <div 
                class="flex gap-3 p-3 rounded-lg hover:bg-gray-800/50 transition-colors"
                style={{ 
                  'border-left': `3px solid ${getSeverityColor(event.severity)}`,
                  background: 'rgba(22, 27, 34, 0.5)'
                }}
              >
                <div class="flex-shrink-0 mt-1">
                  <span class="text-lg">{getEventIcon(event.type)}</span>
                </div>
                <div class="flex-1 min-w-0">
                  <div class="flex items-start justify-between gap-2 mb-1">
                    <h4 class="font-semibold text-sm" style={{ color: '#0ea5e9' }}>
                      {event.title}
                    </h4>
                    <span class="text-xs whitespace-nowrap" style={{ color: '#8b949e' }}>
                      {formatTime(event.timestamp)}
                    </span>
                  </div>
                  <p class="text-xs mb-2" style={{ color: '#8b949e' }}>
                    {event.description}
                  </p>
                  {event.resource && (
                    <div class="text-xs" style={{ color: '#6b7280' }}>
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


