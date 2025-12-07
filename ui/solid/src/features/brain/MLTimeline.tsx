// Copyright 2025 KubeGraf Contributors

import { Component, For, Show } from 'solid-js';
import { MLTimelineEvent } from '../../services/brainML';

interface MLTimelineProps {
  events: MLTimelineEvent[];
}

const MLTimeline: Component<MLTimelineProps> = (props) => {
  const getEventIcon = (type: string) => {
    switch (type) {
      case 'training_failure':
        return 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z';
      case 'gpu_spike':
        return 'M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z';
      case 'model_deployment':
        return 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10';
      case 'drift_detected':
        return 'M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4';
      default:
        return 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return '#ef4444';
      case 'warning':
        return '#f59e0b';
      case 'info':
        return '#3b82f6';
      default:
        return '#8b949e';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor(diffMs / (1000 * 60));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div>
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-semibold" style={{ color: '#f0f6fc' }}>ML Timeline</h3>
        <span class="text-sm px-2 py-1 rounded" style={{ 
          background: 'rgba(59, 130, 246, 0.2)', 
          color: '#3b82f6' 
        }}>
          {props.events.length} events
        </span>
      </div>

      <Show when={props.events.length === 0}>
        <div class="text-center py-8" style={{ color: '#8b949e' }}>
          <p>No ML events in the selected time range</p>
        </div>
      </Show>

      <Show when={props.events.length > 0}>
        <div class="space-y-4">
          <For each={props.events}>
            {(event) => (
              <div class="flex gap-4 p-4 rounded-lg border" style={{
                background: 'rgba(22, 27, 34, 0.5)',
                borderColor: '#333333'
              }}>
                {/* Timeline line */}
                <div class="flex flex-col items-center">
                  <div class="w-10 h-10 rounded-full flex items-center justify-center" style={{
                    background: `rgba(${getSeverityColor(event.severity).replace('#', '')}, 0.2)`,
                    border: `2px solid ${getSeverityColor(event.severity)}`
                  }}>
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{
                      color: getSeverityColor(event.severity)
                    }}>
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={getEventIcon(event.type)} />
                    </svg>
                  </div>
                  <div class="flex-1 w-0.5 mt-2" style={{ background: '#333333' }} />
                </div>

                {/* Event content */}
                <div class="flex-1 min-w-0">
                  <div class="flex items-start justify-between gap-2 mb-1">
                    <h4 class="font-medium" style={{ color: '#f0f6fc' }}>{event.title}</h4>
                    <span class="text-xs whitespace-nowrap" style={{ color: '#8b949e' }}>
                      {formatTimestamp(event.timestamp)}
                    </span>
                  </div>
                  <p class="text-sm mb-2" style={{ color: '#8b949e' }}>{event.description}</p>
                  
                  <Show when={event.resource}>
                    <div class="flex items-center gap-2 text-xs" style={{ color: '#8b949e' }}>
                      <span class="px-2 py-0.5 rounded" style={{ background: 'rgba(59, 130, 246, 0.2)' }}>
                        {event.resource!.kind}
                      </span>
                      <span>{event.resource!.name}</span>
                      <Show when={event.resource!.namespace}>
                        <span>• {event.resource!.namespace}</span>
                      </Show>
                    </div>
                  </Show>
                </div>
              </div>
            )}
          </For>
        </div>
      </Show>
    </div>
  );
};

export default MLTimeline;


