// Copyright 2025 KubeGraf Contributors
// Change Intelligence - Shows what changed before the incident

import { Component, Show, For, createSignal, createEffect } from 'solid-js';
import { api } from '../../services/api';

interface ChangeIntelligenceProps {
  incidentId: string;
  firstSeen: string;
}

interface Change {
  timestamp: string;
  kind: string;
  name: string;
  namespace: string;
  action: string;
  description?: string;
}

const ChangeIntelligence: Component<ChangeIntelligenceProps> = (props) => {
  const [changes, setChanges] = createSignal<Change[]>([]);
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal<string | null>(null);

  // Load changes before incident
  createEffect(async () => {
    if (!props.incidentId) return;

    setLoading(true);
    setError(null);

    try {
      // Look back 1 hour before incident
      const changesData = await api.getIncidentChanges(props.incidentId, 3600);
      
      if (changesData.changes && Array.isArray(changesData.changes)) {
        // Filter to only changes before or near incident time
        const incidentTime = new Date(props.firstSeen).getTime();
        const filtered = changesData.changes
          .filter((c: any) => {
            const changeTime = new Date(c.timestamp || c.time || 0).getTime();
            return changeTime <= incidentTime + 60000; // Within 1 minute after
          })
          .sort((a: any, b: any) => {
            const timeA = new Date(a.timestamp || a.time || 0).getTime();
            const timeB = new Date(b.timestamp || b.time || 0).getTime();
            return timeB - timeA; // Newest first
          })
          .slice(0, 20); // Limit to 20 most recent

        setChanges(filtered);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load changes');
    } finally {
      setLoading(false);
    }
  });

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const incidentTime = new Date(props.firstSeen);
    const diffMs = incidentTime.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);

    if (diffMins < 0) return 'after incident';
    if (diffMins < 1) return 'just before';
    if (diffMins < 60) return `${diffMins} min before`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} before`;
    return 'more than 24h before';
  };

  const getChangeIcon = (kind: string) => {
    const lowerKind = kind.toLowerCase();
    if (lowerKind.includes('deployment')) return '🚀';
    if (lowerKind.includes('configmap')) return '⚙️';
    if (lowerKind.includes('secret')) return '🔐';
    if (lowerKind.includes('pod')) return '📦';
    return '📝';
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
        Change Intelligence
      </div>

      <Show when={loading()}>
        <div style={{ padding: '40px', 'text-align': 'center', color: 'var(--text-secondary)', 'font-size': '13px' }}>
          Loading changes...
        </div>
      </Show>

      <Show when={error()}>
        <div style={{ padding: '16px', background: 'rgba(239, 68, 68, 0.1)', 'border-radius': '6px', color: '#dc3545', 'font-size': '13px' }}>
          {error()}
        </div>
      </Show>

      <Show when={!loading() && !error()}>
        <Show when={changes().length === 0}>
          <div
            style={{
              padding: '24px',
              'text-align': 'center',
              background: 'var(--bg-secondary)',
              'border-radius': '6px',
              color: 'var(--text-secondary)',
              'font-size': '13px',
            }}
          >
            No changes detected before this incident
          </div>
        </Show>

        <Show when={changes().length > 0}>
          <div style={{ display: 'flex', 'flex-direction': 'column', gap: '8px' }}>
            <For each={changes()}>
              {(change) => (
                <div
                  style={{
                    padding: '12px',
                    background: 'var(--bg-secondary)',
                    'border-radius': '6px',
                    display: 'flex',
                    'align-items': 'center',
                    gap: '12px',
                  }}
                >
                  <span style={{ 'font-size': '20px' }}>{getChangeIcon(change.kind)}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', 'align-items': 'center', gap: '8px', 'margin-bottom': '4px' }}>
                      <span style={{ 'font-size': '13px', 'font-weight': '600', color: 'var(--text-primary)' }}>
                        {change.action || 'Changed'}
                      </span>
                      <span style={{ 'font-size': '12px', color: 'var(--text-secondary)' }}>
                        {change.kind}
                      </span>
                      <span style={{ 'font-size': '12px', color: 'var(--text-muted)' }}>
                        {change.namespace}/{change.name}
                      </span>
                    </div>
                    {change.description && (
                      <div style={{ 'font-size': '12px', color: 'var(--text-secondary)' }}>
                        {change.description}
                      </div>
                    )}
                  </div>
                  <span
                    style={{
                      'font-size': '11px',
                      padding: '4px 8px',
                      'border-radius': '4px',
                      background: 'var(--bg-primary)',
                      color: 'var(--text-secondary)',
                      'white-space': 'nowrap',
                    }}
                  >
                    {formatRelativeTime(change.timestamp)}
                  </span>
                </div>
              )}
            </For>
          </div>
        </Show>
      </Show>
    </div>
  );
};

export default ChangeIntelligence;

