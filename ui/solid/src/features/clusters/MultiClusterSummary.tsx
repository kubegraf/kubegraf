// Copyright 2025 KubeGraf Contributors
// SPDX-License-Identifier: Apache-2.0

import { Component, createSignal, createEffect, For, Show } from 'solid-js';
import { fetchAPI } from '../../services/api';

interface PatternCount {
  pattern: string;
  count: number;
}

interface ClusterSummary {
  clusterId: string;
  clusterName: string;
  incidentCounts: Record<string, number>;
  topPatterns: PatternCount[];
  lastUpdated: string;
  healthScore: number;
  status: string;
}

interface MultiClusterSummaryData {
  totalClusters: number;
  totalIncidents: number;
  clusters: ClusterSummary[];
  topPatterns: PatternCount[];
  severityCounts: Record<string, number>;
  generatedAt: string;
}

interface MultiClusterSummaryProps {
  onClusterSelect?: (clusterId: string) => void;
  selectedCluster?: string;
}

const MultiClusterSummary: Component<MultiClusterSummaryProps> = (props) => {
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal<string | null>(null);
  const [summary, setSummary] = createSignal<MultiClusterSummaryData | null>(null);

  createEffect(() => {
    fetchSummary();
  });

  const fetchSummary = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAPI<MultiClusterSummaryData>('/api/clusters/summary');
      setSummary(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load cluster summary');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'critical': return '#ef4444';
      case 'warning': return '#f59e0b';
      case 'healthy': return '#22c55e';
      default: return '#6b7280';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'critical': return '🔴';
      case 'warning': return '🟡';
      case 'healthy': return '🟢';
      default: return '⚪';
    }
  };

  const getTotalIncidents = (cluster: ClusterSummary) => {
    return Object.values(cluster.incidentCounts).reduce((a, b) => a + b, 0);
  };

  return (
    <div style={{
      background: 'var(--bg-secondary)',
      'border-radius': '12px',
      padding: '20px',
    }}>
      <div style={{
        display: 'flex',
        'justify-content': 'space-between',
        'align-items': 'center',
        'margin-bottom': '20px',
      }}>
        <h2 style={{ margin: 0, 'font-size': '16px', color: 'var(--text-primary)' }}>
          🌐 Multi-Cluster Overview
        </h2>
        <button
          onClick={fetchSummary}
          disabled={loading()}
          style={{
            background: 'transparent',
            border: '1px solid var(--border-color)',
            'border-radius': '6px',
            padding: '6px 12px',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            'font-size': '12px',
          }}
        >
          🔄 Refresh
        </button>
      </div>

      <Show when={loading()}>
        <div style={{ 'text-align': 'center', padding: '40px', color: 'var(--text-muted)' }}>
          Loading cluster summary...
        </div>
      </Show>

      <Show when={error()}>
        <div style={{
          background: '#ef444420',
          border: '1px solid #ef4444',
          'border-radius': '8px',
          padding: '16px',
          color: '#ef4444',
        }}>
          {error()}
        </div>
      </Show>

      <Show when={summary() && !loading()}>
        {/* Global Stats */}
        <div style={{
          display: 'grid',
          'grid-template-columns': 'repeat(4, 1fr)',
          gap: '16px',
          'margin-bottom': '24px',
        }}>
          <div style={{
            background: 'var(--bg-tertiary)',
            'border-radius': '8px',
            padding: '16px',
            'text-align': 'center',
          }}>
            <div style={{ 'font-size': '28px', 'font-weight': '700', color: 'var(--text-primary)' }}>
              {summary()!.totalClusters}
            </div>
            <div style={{ 'font-size': '12px', color: 'var(--text-muted)' }}>Clusters</div>
          </div>
          <div style={{
            background: 'var(--bg-tertiary)',
            'border-radius': '8px',
            padding: '16px',
            'text-align': 'center',
          }}>
            <div style={{ 'font-size': '28px', 'font-weight': '700', color: 'var(--text-primary)' }}>
              {summary()!.totalIncidents}
            </div>
            <div style={{ 'font-size': '12px', color: 'var(--text-muted)' }}>Active Incidents</div>
          </div>
          <div style={{
            background: '#ef444420',
            'border-radius': '8px',
            padding: '16px',
            'text-align': 'center',
          }}>
            <div style={{ 'font-size': '28px', 'font-weight': '700', color: '#ef4444' }}>
              {summary()!.severityCounts['critical'] || 0}
            </div>
            <div style={{ 'font-size': '12px', color: 'var(--text-muted)' }}>Critical</div>
          </div>
          <div style={{
            background: '#f59e0b20',
            'border-radius': '8px',
            padding: '16px',
            'text-align': 'center',
          }}>
            <div style={{ 'font-size': '28px', 'font-weight': '700', color: '#f59e0b' }}>
              {(summary()!.severityCounts['high'] || 0) + (summary()!.severityCounts['warning'] || 0)}
            </div>
            <div style={{ 'font-size': '12px', color: 'var(--text-muted)' }}>High/Warning</div>
          </div>
        </div>

        {/* Top Patterns */}
        <Show when={summary()!.topPatterns.length > 0}>
          <div style={{ 'margin-bottom': '24px' }}>
            <h3 style={{ margin: '0 0 12px', 'font-size': '13px', color: 'var(--text-primary)' }}>
              Top Incident Patterns
            </h3>
            <div style={{ display: 'flex', 'flex-wrap': 'wrap', gap: '8px' }}>
              <For each={summary()!.topPatterns.slice(0, 5)}>
                {(pattern) => (
                  <div style={{
                    background: 'var(--bg-tertiary)',
                    padding: '8px 12px',
                    'border-radius': '6px',
                    display: 'flex',
                    gap: '8px',
                    'align-items': 'center',
                  }}>
                    <span style={{ 'font-size': '12px', color: 'var(--text-primary)' }}>
                      {pattern.pattern}
                    </span>
                    <span style={{
                      background: 'var(--accent-primary)',
                      color: '#000',
                      padding: '2px 6px',
                      'border-radius': '10px',
                      'font-size': '10px',
                      'font-weight': '600',
                    }}>
                      {pattern.count}
                    </span>
                  </div>
                )}
              </For>
            </div>
          </div>
        </Show>

        {/* Cluster List */}
        <div>
          <h3 style={{ margin: '0 0 12px', 'font-size': '13px', color: 'var(--text-primary)' }}>
            Clusters
          </h3>
          <div style={{ display: 'flex', 'flex-direction': 'column', gap: '8px' }}>
            <For each={summary()!.clusters}>
              {(cluster) => (
                <div
                  onClick={() => props.onClusterSelect?.(cluster.clusterId)}
                  style={{
                    background: props.selectedCluster === cluster.clusterId
                      ? 'var(--accent-primary)20'
                      : 'var(--bg-tertiary)',
                    'border-radius': '8px',
                    padding: '16px',
                    cursor: 'pointer',
                    border: props.selectedCluster === cluster.clusterId
                      ? '1px solid var(--accent-primary)'
                      : '1px solid transparent',
                    transition: 'all 0.2s',
                  }}
                >
                  <div style={{
                    display: 'flex',
                    'justify-content': 'space-between',
                    'align-items': 'center',
                    'margin-bottom': '8px',
                  }}>
                    <div style={{ display: 'flex', 'align-items': 'center', gap: '8px' }}>
                      <span>{getStatusIcon(cluster.status)}</span>
                      <span style={{
                        'font-size': '14px',
                        'font-weight': '600',
                        color: 'var(--text-primary)',
                      }}>
                        {cluster.clusterName || cluster.clusterId}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', 'align-items': 'center' }}>
                      <span style={{
                        background: getStatusColor(cluster.status) + '20',
                        color: getStatusColor(cluster.status),
                        padding: '4px 8px',
                        'border-radius': '4px',
                        'font-size': '11px',
                        'text-transform': 'capitalize',
                      }}>
                        {cluster.status}
                      </span>
                      <span style={{
                        'font-size': '12px',
                        color: 'var(--text-muted)',
                      }}>
                        {getTotalIncidents(cluster)} incidents
                      </span>
                    </div>
                  </div>

                  {/* Health Bar */}
                  <div style={{
                    background: 'var(--bg-primary)',
                    'border-radius': '4px',
                    height: '6px',
                    overflow: 'hidden',
                    'margin-bottom': '8px',
                  }}>
                    <div style={{
                      background: getStatusColor(cluster.status),
                      height: '100%',
                      width: `${cluster.healthScore * 100}%`,
                      transition: 'width 0.3s',
                    }} />
                  </div>

                  {/* Top patterns for this cluster */}
                  <Show when={cluster.topPatterns.length > 0}>
                    <div style={{ display: 'flex', gap: '6px', 'flex-wrap': 'wrap' }}>
                      <For each={cluster.topPatterns.slice(0, 3)}>
                        {(pattern) => (
                          <span style={{
                            'font-size': '10px',
                            color: 'var(--text-muted)',
                            background: 'var(--bg-primary)',
                            padding: '2px 6px',
                            'border-radius': '4px',
                          }}>
                            {pattern.pattern}: {pattern.count}
                          </span>
                        )}
                      </For>
                    </div>
                  </Show>
                </div>
              )}
            </For>
          </div>
        </div>
      </Show>
    </div>
  );
};

export default MultiClusterSummary;

