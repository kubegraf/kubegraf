// Copyright 2025 KubeGraf Contributors
// Real-time Events Stream Panel Component

import { Component, For, Show, createSignal, onMount, onCleanup, createMemo } from 'solid-js';
import { wsService } from '../services/websocket';

interface RealtimeEvent {
  id: string;
  timestamp: string;
  type: string;
  reason: string;
  object: string;
  kind: string;
  message: string;
  namespace: string;
  count: number;
  source: string;
}

interface RealtimeEventsPanelProps {
  maxEvents?: number;
  showNamespace?: boolean;
}

const RealtimeEventsPanel: Component<RealtimeEventsPanelProps> = (props) => {
  const [events, setEvents] = createSignal<RealtimeEvent[]>([]);
  const [isPaused, setIsPaused] = createSignal(false);
  const maxEvents = () => props.maxEvents || 50;

  // Subscribe to WebSocket for real-time events
  onMount(() => {
    const unsubscribe = wsService.subscribe((msg) => {
      if (msg.type === 'event' && !isPaused()) {
        const newEvent = msg.data as RealtimeEvent;
        setEvents(prev => {
          const current = Array.isArray(prev) ? prev : [];
          // Add new event at the beginning
          return [newEvent, ...current].slice(0, maxEvents());
        });
      }
    });

    return () => unsubscribe();
  });

  const clearEvents = () => {
    setEvents([]);
  };

  const formatTime = (timeStr: string) => {
    if (!timeStr) return 'Just now';
    const date = new Date(timeStr);
    if (isNaN(date.getTime())) return 'Just now';
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    if (diff < 1000) return 'Just now';
    if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    return date.toLocaleTimeString();
  };

  const getEventTypeColor = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'warning':
        return '#f59e0b';
      case 'normal':
        return '#10b981';
      default:
        return '#6b7280';
    }
  };

  const filteredEvents = createMemo(() => {
    return events().slice(0, maxEvents());
  });

  return (
    <div
      class="rounded-lg border p-4"
      style={{
        background: 'var(--bg-secondary)',
        'border-color': 'var(--border-color)',
        maxHeight: '600px',
        display: 'flex',
        'flex-direction': 'column',
      }}
    >
      {/* Header */}
      <div class="flex items-center justify-between mb-4">
        <div class="flex items-center gap-2">
          <div
            class="w-2 h-2 rounded-full animate-pulse"
            style={{
              background: isPaused() ? '#6b7280' : '#10b981',
            }}
            title={isPaused() ? 'Stream paused' : 'Stream active'}
          />
          <div>
            <h3 class="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              Real-time Events Stream
            </h3>
            <p class="text-xs" style={{ color: 'var(--text-muted)' }}>
              Live cluster events as they happen
            </p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <button
            onClick={() => setIsPaused(!isPaused())}
            class="text-xs px-2 py-1 rounded"
            style={{
              background: isPaused() ? 'var(--bg-tertiary)' : 'var(--accent-primary)',
              color: isPaused() ? 'var(--text-secondary)' : '#000',
            }}
            title={isPaused() ? 'Resume' : 'Pause'}
          >
            {isPaused() ? '▶' : '⏸'}
          </button>
          <button
            onClick={clearEvents}
            class="text-xs px-2 py-1 rounded"
            style={{
              background: 'var(--bg-tertiary)',
              color: 'var(--text-secondary)',
            }}
            title="Clear events"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Events List */}
      <div
        class="overflow-y-auto space-y-2"
        style={{
          'max-height': '500px',
        }}
      >
        <Show
          when={filteredEvents().length > 0}
          fallback={
            <div class="text-center py-8" style={{ color: 'var(--text-muted)' }}>
              <div class="text-sm">Waiting for events...</div>
              <div class="text-xs mt-2">Events will appear here in real-time</div>
            </div>
          }
        >
          <For each={filteredEvents()}>
            {(event) => (
              <div
                class="p-3 rounded border-l-4 text-xs"
                style={{
                  background: 'var(--bg-primary)',
                  'border-left-color': getEventTypeColor(event.type),
                  'border-color': 'var(--border-color)',
                }}
              >
                <div class="flex items-start justify-between gap-2 mb-1">
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2 mb-1">
                      <span
                        class="px-1.5 py-0.5 rounded text-xs font-medium"
                        style={{
                          background: `${getEventTypeColor(event.type)}20`,
                          color: getEventTypeColor(event.type),
                        }}
                      >
                        {event.type || 'Normal'}
                      </span>
                      <span class="font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                        {event.object}
                      </span>
                      <Show when={props.showNamespace && event.namespace}>
                        <span class="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                          {event.namespace}
                        </span>
                      </Show>
                    </div>
                    <div class="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>
                      {event.reason}
                    </div>
                    <div class="text-xs line-clamp-2" style={{ color: 'var(--text-muted)' }}>
                      {event.message}
                    </div>
                  </div>
                  <div class="text-xs whitespace-nowrap ml-2" style={{ color: 'var(--text-muted)' }}>
                    {formatTime(event.timestamp)}
                  </div>
                </div>
                <div class="flex items-center gap-3 mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                  <span>{event.kind}</span>
                  <Show when={event.count > 1}>
                    <span>×{event.count}</span>
                  </Show>
                  <Show when={event.source}>
                    <span class="truncate">{event.source}</span>
                  </Show>
                </div>
              </div>
            )}
          </For>
        </Show>
      </div>

      {/* Footer Stats */}
      <div class="mt-4 pt-3 border-t text-xs" style={{ 'border-color': 'var(--border-color)' }}>
        <div class="flex items-center justify-between" style={{ color: 'var(--text-muted)' }}>
          <span>{filteredEvents().length} event{filteredEvents().length !== 1 ? 's' : ''}</span>
          <Show when={isPaused()}>
            <span class="text-yellow-400">Paused</span>
          </Show>
        </div>
      </div>
    </div>
  );
};

export default RealtimeEventsPanel;

