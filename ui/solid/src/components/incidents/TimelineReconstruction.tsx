// Copyright 2025 KubeGraf Contributors
// Timeline Reconstruction - Chronological list of events

import { Component, Show, For, createSignal, createEffect } from 'solid-js';
import { api } from '../../services/api';

interface TimelineReconstructionProps {
  incidentId: string;
}

interface TimelineEvent {
  timestamp: string;
  type: 'deployment' | 'pod' | 'event' | 'change' | 'warning';
  title: string;
  description: string;
  source?: string;
}

const TimelineReconstruction: Component<TimelineReconstructionProps> = (props) => {
  const [events, setEvents] = createSignal<TimelineEvent[]>([]);
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal<string | null>(null);

  // Load timeline data
  createEffect(async () => {
    if (!props.incidentId) return;

    setLoading(true);
    setError(null);

    try {
      // Fetch changes (most relevant for timeline)
      const changesData = await api.getIncidentChanges(props.incidentId, 3600); // 1 hour lookback
      const timelineEvents: TimelineEvent[] = [];

      // Convert changes to timeline events
      if (changesData.changes) {
        for (const change of changesData.changes) {
          timelineEvents.push({
            timestamp: change.timestamp || change.time || new Date().toISOString(),
            type: change.kind?.toLowerCase().includes('deployment') ? 'deployment' : 
                  change.kind?.toLowerCase().includes('pod') ? 'pod' : 'change',
            title: change.action || 'Resource changed',
            description: change.description || `${change.kind} ${change.name} in ${change.namespace}`,
            source: 'Kubernetes API',
          });
        }
      }

      // Sort by timestamp (newest first)
      timelineEvents.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      setEvents(timelineEvents);
    } catch (err: any) {
      setError(err.message || 'Failed to load timeline');
    } finally {
      setLoading(false);
    }
  });

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  };

  const formatAbsoluteTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'deployment': return '🚀';
      case 'pod': return '📦';
      case 'warning': return '⚠️';
      case 'event': return '📋';
      default: return '📝';
    }
  };

  return (
    <div
      style={{
        padding: '20px',
        borderBottom: '1px solid var(--border-color)',
        background: 'var(--bg-primary)',
      }}
    >
      <div style={{ 'font-size': '16px', 'font-weight': '600', 'margin-bottom': '16px', color: 'var(--text-primary)' }}>
        Timeline Reconstruction
      </div>

      <Show when={loading()}>
        <div style={{ padding: '40px', 'text-align': 'center', color: 'var(--text-secondary)', 'font-size': '13px' }}>
          Loading timeline...
        </div>
      </Show>

      <Show when={error()}>
        <div style={{ padding: '16px', background: 'rgba(239, 68, 68, 0.1)', 'border-radius': '6px', color: '#dc3545', 'font-size': '13px' }}>
          {error()}
        </div>
      </Show>

      <Show when={!loading() && !error()}>
        <Show when={events().length === 0}>
          <div style={{ padding: '16px', 'text-align': 'center', color: 'var(--text-secondary)', 'font-size': '13px' }}>
            No timeline events found
          </div>
        </Show>

        <Show when={events().length > 0}>
          <div style={{ position: 'relative', 'padding-left': '24px' }}>
            {/* Timeline line */}
            <div
              style={{
                position: 'absolute',
                left: '8px',
                top: '0',
                bottom: '0',
                width: '2px',
                background: 'var(--border-color)',
              }}
            />

            <For each={events()}>
              {(event, index) => (
                <div
                  style={{
                    position: 'relative',
                    'margin-bottom': '24px',
                    'padding-left': '32px',
                  }}
                >
                  {/* Timeline dot */}
                  <div
                    style={{
                      position: 'absolute',
                      left: '-16px',
                      top: '4px',
                      width: '16px',
                      height: '16px',
                      'border-radius': '50%',
                      background: 'var(--accent-primary)',
                      border: '3px solid var(--bg-primary)',
                    }}
                  />

                  {/* Event content */}
                  <div
                    style={{
                      padding: '12px',
                      background: 'var(--bg-secondary)',
                      'border-radius': '6px',
                    }}
                  >
                    <div style={{ display: 'flex', 'align-items': 'center', gap: '8px', 'margin-bottom': '8px' }}>
                      <span style={{ 'font-size': '18px' }}>{getEventIcon(event.type)}</span>
                      <span style={{ 'font-size': '14px', 'font-weight': '600', color: 'var(--text-primary)' }}>
                        {event.title}
                      </span>
                      <span
                        style={{
                          'font-size': '11px',
                          padding: '2px 6px',
                          'border-radius': '4px',
                          background: 'var(--bg-primary)',
                          color: 'var(--text-secondary)',
                          'margin-left': 'auto',
                        }}
                      >
                        {formatRelativeTime(event.timestamp)}
                      </span>
                    </div>

                    <div style={{ 'font-size': '13px', color: 'var(--text-secondary)', 'margin-bottom': '4px' }}>
                      {event.description}
                    </div>

                    <div style={{ display: 'flex', gap: '12px', 'font-size': '11px', color: 'var(--text-muted)' }}>
                      <span>{formatAbsoluteTime(event.timestamp)}</span>
                      {event.source && (
                        <>
                          <span>•</span>
                          <span>{event.source}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </For>
          </div>
        </Show>
      </Show>
    </div>
  );
};

export default TimelineReconstruction;

