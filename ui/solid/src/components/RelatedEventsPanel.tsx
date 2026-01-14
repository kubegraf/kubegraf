import { Component, For, Show } from 'solid-js';
import { RelatedEvent } from '../services/api';

interface RelatedEventsPanelProps {
  events: RelatedEvent[];
  summary?: string;
}

const RelatedEventsPanel: Component<RelatedEventsPanelProps> = (props) => {
  const getEventTypeIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'error':
        return '🔴';
      case 'warning':
        return '⚠️';
      default:
        return '✓';
    }
  };

  const getEventTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'error':
        return 'var(--error-color, #ef4444)';
      case 'warning':
        return 'var(--warning-color, #f59e0b)';
      default:
        return 'var(--success-color, #10b981)';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  return (
    <div
      class="related-events-panel"
      style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-color)',
        'border-radius': '8px',
        padding: '16px',
        'margin-top': '16px'
      }}
    >
      <div style={{ 'margin-bottom': '12px' }}>
        <h3 style={{
          margin: '0 0 4px 0',
          'font-size': '16px',
          'font-weight': '600',
          color: 'var(--text-primary)'
        }}>
          Correlated Kubernetes Events
        </h3>
        <Show when={props.summary}>
          <p style={{
            margin: 0,
            'font-size': '13px',
            color: 'var(--text-secondary)',
            'font-style': 'italic'
          }}>
            {props.summary}
          </p>
        </Show>
      </div>

      <Show
        when={props.events && props.events.length > 0}
        fallback={
          <div style={{
            padding: '24px',
            'text-align': 'center',
            color: 'var(--text-tertiary)',
            'font-size': '14px'
          }}>
            No related events found
          </div>
        }
      >
        <div class="events-table-container" style={{ 'overflow-x': 'auto' }}>
          <table style={{
            width: '100%',
            'border-collapse': 'separate',
            'border-spacing': '0',
            'font-size': '13px'
          }}>
            <thead>
              <tr style={{
                background: 'var(--bg-tertiary)',
                'border-bottom': '2px solid var(--border-color)'
              }}>
                <th style={{
                  padding: '10px 12px',
                  'text-align': 'left',
                  'font-weight': '600',
                  color: 'var(--text-primary)',
                  'border-top-left-radius': '6px'
                }}>Type</th>
                <th style={{
                  padding: '10px 12px',
                  'text-align': 'left',
                  'font-weight': '600',
                  color: 'var(--text-primary)'
                }}>Reason</th>
                <th style={{
                  padding: '10px 12px',
                  'text-align': 'left',
                  'font-weight': '600',
                  color: 'var(--text-primary)'
                }}>Message</th>
                <th style={{
                  padding: '10px 12px',
                  'text-align': 'center',
                  'font-weight': '600',
                  color: 'var(--text-primary)'
                }}>Count</th>
                <th style={{
                  padding: '10px 12px',
                  'text-align': 'left',
                  'font-weight': '600',
                  color: 'var(--text-primary)'
                }}>Last Seen</th>
                <th style={{
                  padding: '10px 12px',
                  'text-align': 'left',
                  'font-weight': '600',
                  color: 'var(--text-primary)',
                  'border-top-right-radius': '6px'
                }}>Source</th>
              </tr>
            </thead>
            <tbody>
              <For each={props.events}>
                {(event, index) => (
                  <tr style={{
                    'border-bottom': index() < props.events.length - 1 ? '1px solid var(--border-color)' : 'none',
                    transition: 'background-color 0.15s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--bg-tertiary)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                  }}
                  >
                    <td style={{
                      padding: '12px',
                      'vertical-align': 'top'
                    }}>
                      <span style={{
                        display: 'inline-flex',
                        'align-items': 'center',
                        gap: '6px',
                        color: getEventTypeColor(event.type),
                        'font-weight': '500'
                      }}>
                        <span>{getEventTypeIcon(event.type)}</span>
                        <span>{event.type}</span>
                      </span>
                    </td>
                    <td style={{
                      padding: '12px',
                      'vertical-align': 'top'
                    }}>
                      <code style={{
                        background: 'var(--bg-tertiary)',
                        padding: '2px 6px',
                        'border-radius': '4px',
                        'font-size': '12px',
                        color: 'var(--text-primary)',
                        'font-family': 'monospace'
                      }}>
                        {event.reason}
                      </code>
                    </td>
                    <td style={{
                      padding: '12px',
                      'vertical-align': 'top',
                      'max-width': '400px'
                    }}>
                      <span style={{
                        color: 'var(--text-primary)',
                        'line-height': '1.5',
                        'word-break': 'break-word'
                      }}>
                        {event.message}
                      </span>
                    </td>
                    <td style={{
                      padding: '12px',
                      'text-align': 'center',
                      'vertical-align': 'top'
                    }}>
                      <span style={{
                        display: 'inline-block',
                        background: 'var(--bg-tertiary)',
                        color: 'var(--text-primary)',
                        padding: '2px 8px',
                        'border-radius': '12px',
                        'font-weight': '500',
                        'font-size': '12px'
                      }}>
                        {event.count}
                      </span>
                    </td>
                    <td style={{
                      padding: '12px',
                      'vertical-align': 'top',
                      'white-space': 'nowrap'
                    }}>
                      <span style={{
                        color: 'var(--text-secondary)',
                        'font-size': '12px'
                      }}>
                        {formatTimestamp(event.lastSeen)}
                      </span>
                    </td>
                    <td style={{
                      padding: '12px',
                      'vertical-align': 'top'
                    }}>
                      <span style={{
                        color: 'var(--text-tertiary)',
                        'font-size': '12px'
                      }}>
                        {event.source}
                      </span>
                    </td>
                  </tr>
                )}
              </For>
            </tbody>
          </table>
        </div>
      </Show>
    </div>
  );
};

export default RelatedEventsPanel;
