import { Component, createSignal, createEffect, Show, For } from 'solid-js';

interface ChangeEvent {
  Type: string;
  Timestamp: string;
  Namespace: string;
  ResourceKind: string;
  ResourceName: string;
  ChangeType: string;
  Severity: string;
  Reason: string;
  Message: string;
}

interface ChangeTimelineProps {
  incidentId: string;
}

const ChangeTimeline: Component<ChangeTimelineProps> = (props) => {
  const [changes, setChanges] = createSignal<ChangeEvent[]>([]);
  const [loading, setLoading] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);

  createEffect(() => {
    if (props.incidentId) {
      fetchChanges(props.incidentId);
    }
  });

  const fetchChanges = async (incidentId: string) => {
    setLoading(true);
    setError(null);
    try {
      // Use lookback parameter (in minutes) instead of window
      const response = await fetch(`/api/v2/incidents/${incidentId}/changes?lookback=60`);
      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.statusText}`);
      }
      const data = await response.json();
      // Handle both array format and object with changes array
      const changesArray = Array.isArray(data) ? data : (data.changes || []);
      // Convert to expected format if needed
      const formattedChanges = changesArray.map((change: any) => {
        if (change.Change) {
          // Backend returns {Change: {...}, RelevanceScore: ...}
          const ch = change.Change;
          // Parse timestamp - handle both string and Date formats
          let timestamp = ch.Timestamp || ch.Time || new Date().toISOString();
          if (typeof timestamp === 'string') {
            // Ensure it's a valid ISO string
            const parsed = new Date(timestamp);
            if (isNaN(parsed.getTime())) {
              timestamp = new Date().toISOString();
            } else {
              timestamp = parsed.toISOString();
            }
          } else if (timestamp instanceof Date) {
            timestamp = timestamp.toISOString();
          }
          
          return {
            Type: ch.Type || ch.ChangeType || 'Change',
            Timestamp: timestamp,
            Namespace: ch.Namespace || '',
            ResourceKind: ch.ResourceKind || ch.Kind || '',
            ResourceName: ch.ResourceName || ch.Name || '',
            ChangeType: ch.ChangeType || ch.Type || 'update',
            Severity: ch.Severity || (change.RelevanceScore > 0.7 ? 'warning' : 'info'),
            Reason: ch.Reason || '',
            Message: ch.Message || ch.Description || '',
          };
        }
        // Handle direct ChangeEvent format
        let timestamp = change.Timestamp || change.Time || new Date().toISOString();
        if (typeof timestamp === 'string') {
          const parsed = new Date(timestamp);
          if (isNaN(parsed.getTime())) {
            timestamp = new Date().toISOString();
          } else {
            timestamp = parsed.toISOString();
          }
        } else if (timestamp instanceof Date) {
          timestamp = timestamp.toISOString();
        }
        return {
          ...change,
          Timestamp: timestamp,
        };
      });
      setChanges(formattedChanges);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch changes');
      console.error('Error fetching changes:', err);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity?.toLowerCase()) {
      case 'error': case 'critical': return '#dc3545';
      case 'warning': return '#ffc107';
      case 'info': return '#17a2b8';
      default: return 'var(--text-secondary)';
    }
  };

  const getChangeTypeIcon = (changeType: string) => {
    switch (changeType?.toLowerCase()) {
      case 'create': case 'added': return '➕';
      case 'update': case 'modified': return '✏️';
      case 'delete': case 'deleted': return '🗑️';
      case 'scale': return '📊';
      case 'restart': return '🔄';
      default: return '📝';
    }
  };

  return (
    <div>
      <Show when={loading()}>
        <div style={{
          display: 'flex',
          'align-items': 'center',
          'justify-content': 'center',
          padding: '40px',
          color: 'var(--text-secondary)'
        }}>
          <div class="spinner" style={{ 'margin-right': '12px' }} />
          Loading change history...
        </div>
      </Show>

      <Show when={error()}>
        <div style={{
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          'border-radius': '8px',
          padding: '16px',
          color: 'var(--error-color)'
        }}>
          <strong>Error:</strong> {error()}
        </div>
      </Show>

      <Show when={!loading() && !error() && changes().length === 0}>
        <div style={{
          background: 'var(--bg-secondary)',
          'border-radius': '8px',
          padding: '32px',
          'text-align': 'center',
          color: 'var(--text-secondary)'
        }}>
          <div style={{ 'font-size': '32px', 'margin-bottom': '12px' }}>📭</div>
          <h4 style={{ margin: '0 0 8px', color: 'var(--text-primary)' }}>No Changes Detected</h4>
          <p style={{ margin: 0, 'font-size': '13px' }}>
            No configuration changes were detected in the hour before this incident.
            This might indicate the issue was caused by external factors or traffic patterns.
          </p>
        </div>
      </Show>

      <Show when={!loading() && changes().length > 0}>
        <div style={{ 'margin-bottom': '16px' }}>
          <p style={{ margin: 0, 'font-size': '13px', color: 'var(--text-secondary)' }}>
            The following changes occurred in the hour before this incident was detected.
            These changes might have contributed to the issue.
          </p>
        </div>

        <div style={{ 
          position: 'relative',
          'padding-left': '24px'
        }}>
          {/* Timeline line */}
          <div style={{
            position: 'absolute',
            left: '8px',
            top: '12px',
            bottom: '12px',
            width: '2px',
            background: 'var(--border-color)'
          }} />

          <For each={changes()}>
            {(change, index) => (
              <div style={{
                position: 'relative',
                'margin-bottom': '16px',
                'padding-bottom': index() === changes().length - 1 ? '0' : '16px',
                'border-bottom': index() === changes().length - 1 ? 'none' : '1px solid var(--border-color)'
              }}>
                {/* Timeline dot */}
                <div style={{
                  position: 'absolute',
                  left: '-20px',
                  top: '4px',
                  width: '12px',
                  height: '12px',
                  'border-radius': '50%',
                  background: getSeverityColor(change.Severity),
                  border: '2px solid var(--bg-primary)'
                }} />

                {/* Change content */}
                <div style={{
                  background: 'var(--bg-card)',
                  'border-radius': '8px',
                  padding: '16px',
                  border: '1px solid var(--border-color)'
                }}>
                  {/* Header */}
                  <div style={{
                    display: 'flex',
                    'justify-content': 'space-between',
                    'align-items': 'flex-start',
                    'margin-bottom': '8px'
                  }}>
                    <div style={{ display: 'flex', 'align-items': 'center', gap: '8px' }}>
                      <span style={{ 'font-size': '16px' }}>
                        {getChangeTypeIcon(change.ChangeType)}
                      </span>
                      <span style={{
                        'font-size': '13px',
                        'font-weight': '600',
                        color: 'var(--text-primary)'
                      }}>
                        {change.ChangeType || 'Change'} on {change.ResourceKind}/{change.ResourceName}
                      </span>
                    </div>
                    <span style={{
                      padding: '2px 8px',
                      'border-radius': '10px',
                      'font-size': '10px',
                      'font-weight': '600',
                      background: getSeverityColor(change.Severity) + '20',
                      color: getSeverityColor(change.Severity),
                      'text-transform': 'uppercase'
                    }}>
                      {change.Severity || 'info'}
                    </span>
                  </div>

                  {/* Details */}
                  <div style={{ 'margin-bottom': '8px' }}>
                    <span style={{
                      'font-size': '11px',
                      color: 'var(--text-muted)',
                      'margin-right': '12px'
                    }}>
                      📍 {change.Namespace}
                    </span>
                    <span style={{
                      'font-size': '11px',
                      color: 'var(--text-muted)'
                    }}>
                      🕐 {(() => {
                        try {
                          const date = new Date(change.Timestamp);
                          if (isNaN(date.getTime())) {
                            return 'Invalid Date';
                          }
                          return date.toLocaleString();
                        } catch (e) {
                          return 'Invalid Date';
                        }
                      })()}
                    </span>
                  </div>

                  {/* Message */}
                  <Show when={change.Message}>
                    <div style={{
                      background: 'var(--bg-secondary)',
                      padding: '10px 12px',
                      'border-radius': '6px',
                      'font-size': '12px',
                      color: 'var(--text-secondary)',
                      'line-height': '1.5'
                    }}>
                      {change.Message}
                    </div>
                  </Show>

                  {/* Reason */}
                  <Show when={change.Reason}>
                    <div style={{
                      'margin-top': '8px',
                      'font-size': '11px',
                      color: 'var(--text-muted)'
                    }}>
                      <strong>Reason:</strong> {change.Reason}
                    </div>
                  </Show>
                </div>
              </div>
            )}
          </For>
        </div>

        <div style={{
          'margin-top': '16px',
          'text-align': 'center',
          'font-size': '11px',
          color: 'var(--text-muted)'
        }}>
          Showing {changes().length} change(s) from the last hour before this incident
        </div>
      </Show>
    </div>
  );
};

export default ChangeTimeline;

