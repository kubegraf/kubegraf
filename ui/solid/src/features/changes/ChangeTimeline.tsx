// Copyright 2025 KubeGraf Contributors
// SPDX-License-Identifier: Apache-2.0

import { Component, createSignal, For, Show, createEffect } from 'solid-js';
import { fetchAPI } from '../../services/api';

interface CorrelatedChange {
  change: {
    type: string;
    timestamp: string;
    namespace: string;
    resourceKind: string;
    resourceName: string;
    changeType: string;
    severity: string;
    reason: string;
    message: string;
  };
  relevanceScore: number;
  relationship: string;
  timeDelta: string;
}

interface CorrelationResult {
  incidentId: string;
  incidentStart: string;
  changes: CorrelatedChange[];
  totalChanges: number;
  highRelevance: number;
  mediumRelevance: number;
  lowRelevance: number;
}

interface ChangeTimelineProps {
  incidentId: string;
  lookbackMinutes?: number;
}

const ChangeTimeline: Component<ChangeTimelineProps> = (props) => {
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal<string | null>(null);
  const [result, setResult] = createSignal<CorrelationResult | null>(null);
  const [filterMinScore, setFilterMinScore] = createSignal(0);

  createEffect(() => {
    fetchChanges();
  });

  const fetchChanges = async () => {
    setLoading(true);
    setError(null);
    try {
      const lookback = props.lookbackMinutes || 30;
      const data = await fetchAPI<CorrelationResult>(
        `/api/incidents/${props.incidentId}/changes?lookback=${lookback}`
      );
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load changes');
    } finally {
      setLoading(false);
    }
  };

  const filteredChanges = () => {
    const r = result();
    if (!r) return [];
    return r.changes.filter(c => c.relevanceScore >= filterMinScore());
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'error': return '#ef4444';
      case 'warning': return '#f59e0b';
      default: return '#6b7280';
    }
  };

  const getRelevanceColor = (score: number) => {
    if (score >= 0.7) return '#22c55e';
    if (score >= 0.4) return '#f59e0b';
    return '#6b7280';
  };

  const getRelationshipIcon = (rel: string) => {
    switch (rel) {
      case 'before': return '⬅️';
      case 'during': return '🔥';
      case 'after': return '➡️';
      default: return '•';
    }
  };

  return (
    <div style={{
      background: 'var(--bg-secondary)',
      'border-radius': '8px',
      padding: '16px',
    }}>
      <div style={{
        display: 'flex',
        'justify-content': 'space-between',
        'align-items': 'center',
        'margin-bottom': '16px',
      }}>
        <h3 style={{ margin: 0, color: 'var(--text-primary)', 'font-size': '14px' }}>
          🔄 What Changed Before This Incident?
        </h3>
        <select
          value={filterMinScore()}
          onChange={(e) => setFilterMinScore(parseFloat(e.target.value))}
          style={{
            background: 'var(--bg-tertiary)',
            border: '1px solid var(--border-color)',
            'border-radius': '4px',
            padding: '4px 8px',
            color: 'var(--text-primary)',
            'font-size': '12px',
          }}
        >
          <option value="0">All Changes</option>
          <option value="0.4">Medium+ Relevance</option>
          <option value="0.7">High Relevance Only</option>
        </select>
      </div>

      <Show when={loading()}>
        <div style={{ 'text-align': 'center', padding: '20px', color: 'var(--text-muted)' }}>
          Loading changes...
        </div>
      </Show>

      <Show when={error()}>
        <div style={{
          background: '#ef444420',
          border: '1px solid #ef4444',
          'border-radius': '6px',
          padding: '12px',
          color: '#ef4444',
          'font-size': '12px',
        }}>
          {error()}
        </div>
      </Show>

      <Show when={result() && !loading()}>
        {/* Summary */}
        <div style={{
          display: 'flex',
          gap: '12px',
          'margin-bottom': '16px',
          'flex-wrap': 'wrap',
        }}>
          <div style={{
            background: 'var(--bg-tertiary)',
            padding: '8px 12px',
            'border-radius': '6px',
            'font-size': '12px',
          }}>
            <span style={{ color: 'var(--text-muted)' }}>Total: </span>
            <span style={{ color: 'var(--text-primary)', 'font-weight': '600' }}>{result()?.totalChanges}</span>
          </div>
          <div style={{
            background: '#22c55e20',
            padding: '8px 12px',
            'border-radius': '6px',
            'font-size': '12px',
          }}>
            <span style={{ color: '#22c55e' }}>High: {result()?.highRelevance}</span>
          </div>
          <div style={{
            background: '#f59e0b20',
            padding: '8px 12px',
            'border-radius': '6px',
            'font-size': '12px',
          }}>
            <span style={{ color: '#f59e0b' }}>Medium: {result()?.mediumRelevance}</span>
          </div>
          <div style={{
            background: 'var(--bg-tertiary)',
            padding: '8px 12px',
            'border-radius': '6px',
            'font-size': '12px',
          }}>
            <span style={{ color: 'var(--text-muted)' }}>Low: {result()?.lowRelevance}</span>
          </div>
        </div>

        {/* Timeline */}
        <div style={{ 'border-left': '2px solid var(--border-color)', 'padding-left': '16px' }}>
          <For each={filteredChanges()}>
            {(item) => (
              <div style={{
                position: 'relative',
                'padding-bottom': '16px',
                'margin-bottom': '8px',
              }}>
                {/* Timeline dot */}
                <div style={{
                  position: 'absolute',
                  left: '-21px',
                  top: '4px',
                  width: '10px',
                  height: '10px',
                  'border-radius': '50%',
                  background: getSeverityColor(item.change.severity),
                  border: '2px solid var(--bg-secondary)',
                }} />

                {/* Change card */}
                <div style={{
                  background: 'var(--bg-tertiary)',
                  'border-radius': '6px',
                  padding: '12px',
                  border: `1px solid ${getRelevanceColor(item.relevanceScore)}40`,
                }}>
                  {/* Header */}
                  <div style={{
                    display: 'flex',
                    'justify-content': 'space-between',
                    'align-items': 'flex-start',
                    'margin-bottom': '8px',
                  }}>
                    <div>
                      <span style={{
                        'font-size': '11px',
                        color: getRelevanceColor(item.relevanceScore),
                        'font-weight': '600',
                      }}>
                        {getRelationshipIcon(item.relationship)} {item.timeDelta}
                      </span>
                      <div style={{
                        'font-size': '13px',
                        color: 'var(--text-primary)',
                        'font-weight': '500',
                        'margin-top': '4px',
                      }}>
                        {item.change.resourceKind}/{item.change.resourceName}
                      </div>
                    </div>
                    <div style={{
                      display: 'flex',
                      gap: '6px',
                      'align-items': 'center',
                    }}>
                      <span style={{
                        background: getSeverityColor(item.change.severity) + '20',
                        color: getSeverityColor(item.change.severity),
                        padding: '2px 6px',
                        'border-radius': '4px',
                        'font-size': '10px',
                        'text-transform': 'uppercase',
                      }}>
                        {item.change.severity}
                      </span>
                      <span style={{
                        background: getRelevanceColor(item.relevanceScore) + '20',
                        color: getRelevanceColor(item.relevanceScore),
                        padding: '2px 6px',
                        'border-radius': '4px',
                        'font-size': '10px',
                      }}>
                        {Math.round(item.relevanceScore * 100)}%
                      </span>
                    </div>
                  </div>

                  {/* Details */}
                  <div style={{
                    'font-size': '12px',
                    color: 'var(--text-secondary)',
                  }}>
                    <div style={{ 'margin-bottom': '4px' }}>
                      <strong>{item.change.changeType || item.change.reason}</strong>
                    </div>
                    <Show when={item.change.message}>
                      <div style={{ color: 'var(--text-muted)' }}>
                        {item.change.message}
                      </div>
                    </Show>
                  </div>

                  {/* Metadata */}
                  <div style={{
                    display: 'flex',
                    gap: '8px',
                    'margin-top': '8px',
                    'font-size': '10px',
                    color: 'var(--text-muted)',
                  }}>
                    <span>📁 {item.change.namespace || 'cluster-scoped'}</span>
                    <span>📋 {item.change.type}</span>
                    <span>🕐 {new Date(item.change.timestamp).toLocaleTimeString()}</span>
                  </div>
                </div>
              </div>
            )}
          </For>

          <Show when={filteredChanges().length === 0}>
            <div style={{
              'text-align': 'center',
              padding: '20px',
              color: 'var(--text-muted)',
              'font-size': '12px',
            }}>
              No changes found matching the filter criteria
            </div>
          </Show>
        </div>
      </Show>
    </div>
  );
};

export default ChangeTimeline;

