import { Component, createSignal, createEffect, Show, For } from 'solid-js';
import { api } from '../services/api';
import { addNotification } from '../stores/ui';

interface ClusterSummary {
  clusterId: string;
  incidentCounts: { [key: string]: number };
  topPatterns: string[];
  lastUpdated: string;
  healthScore: number;
}

interface MultiClusterSummaryData {
  totalClusters: number;
  totalIncidents: number;
  severityCounts: { [key: string]: number };
  topPatterns: string[];
  clusters: ClusterSummary[];
  generatedAt: string;
}

const MultiCluster: Component = () => {
  const [summary, setSummary] = createSignal<MultiClusterSummaryData | null>(null);
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal<string | null>(null);

  const fetchSummary = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/clusters/summary');
      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.statusText}`);
      }
      const data = await response.json();
      setSummary(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch multi-cluster summary');
      console.error('Error fetching multi-cluster summary:', err);
    } finally {
      setLoading(false);
    }
  };

  createEffect(() => {
    fetchSummary();
    const interval = setInterval(fetchSummary, 30000);
    return () => clearInterval(interval);
  });

  const getHealthColor = (score: number) => {
    if (score >= 80) return 'var(--success-color, #10b981)';
    if (score >= 50) return 'var(--warning-color, #f59e0b)';
    return 'var(--error-color, #ef4444)';
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return '#dc3545';
      case 'high': return '#ff6b6b';
      case 'medium': case 'warning': return '#ffc107';
      case 'low': return '#28a745';
      default: return 'var(--text-secondary)';
    }
  };

  return (
    <div style={{ padding: '24px', 'max-width': '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ 'margin-bottom': '24px' }}>
        <h1 style={{ 
          margin: '0 0 8px', 
          'font-size': '24px', 
          'font-weight': '600',
          color: 'var(--text-primary)',
          display: 'flex',
          'align-items': 'center',
          gap: '12px'
        }}>
          🌐 Multi-Cluster Summary
        </h1>
        <p style={{ margin: 0, color: 'var(--text-secondary)', 'font-size': '14px' }}>
          Aggregated view of incidents and health across all connected Kubernetes clusters
        </p>
      </div>

      {/* Loading state */}
      <Show when={loading() && !summary()}>
        <div style={{
          display: 'flex',
          'align-items': 'center',
          'justify-content': 'center',
          padding: '60px',
          color: 'var(--text-secondary)'
        }}>
          <div class="spinner" style={{ 'margin-right': '12px' }} />
          Loading multi-cluster data...
        </div>
      </Show>

      {/* Error state */}
      <Show when={error()}>
        <div style={{
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          'border-radius': '8px',
          padding: '16px',
          color: 'var(--error-color)',
          'margin-bottom': '24px'
        }}>
          <strong>Error:</strong> {error()}
          <button
            onClick={fetchSummary}
            style={{
              'margin-left': '12px',
              padding: '4px 12px',
              background: 'var(--error-color)',
              color: 'white',
              border: 'none',
              'border-radius': '4px',
              cursor: 'pointer'
            }}
          >
            Retry
          </button>
        </div>
      </Show>

      {/* Summary Cards */}
      <Show when={summary()}>
        <div style={{
          display: 'grid',
          'grid-template-columns': 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          'margin-bottom': '24px'
        }}>
          {/* Total Clusters */}
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            'border-radius': '12px',
            padding: '20px'
          }}>
            <div style={{ 'font-size': '12px', color: 'var(--text-muted)', 'margin-bottom': '8px', 'text-transform': 'uppercase', 'letter-spacing': '0.5px' }}>
              Total Clusters
            </div>
            <div style={{ 'font-size': '32px', 'font-weight': '700', color: 'var(--accent-primary)' }}>
              {summary()!.totalClusters}
            </div>
          </div>

          {/* Total Incidents */}
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            'border-radius': '12px',
            padding: '20px'
          }}>
            <div style={{ 'font-size': '12px', color: 'var(--text-muted)', 'margin-bottom': '8px', 'text-transform': 'uppercase', 'letter-spacing': '0.5px' }}>
              Total Incidents
            </div>
            <div style={{ 'font-size': '32px', 'font-weight': '700', color: 'var(--text-primary)' }}>
              {summary()!.totalIncidents}
            </div>
          </div>

          {/* Severity Breakdown */}
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            'border-radius': '12px',
            padding: '20px'
          }}>
            <div style={{ 'font-size': '12px', color: 'var(--text-muted)', 'margin-bottom': '12px', 'text-transform': 'uppercase', 'letter-spacing': '0.5px' }}>
              By Severity
            </div>
            <div style={{ display: 'flex', 'flex-wrap': 'wrap', gap: '8px' }}>
              <For each={Object.entries(summary()!.severityCounts || {})}>
                {([severity, count]) => (
                  <span style={{
                    padding: '4px 10px',
                    'border-radius': '12px',
                    'font-size': '12px',
                    'font-weight': '600',
                    background: getSeverityColor(severity) + '20',
                    color: getSeverityColor(severity)
                  }}>
                    {severity}: {count}
                  </span>
                )}
              </For>
            </div>
          </div>

          {/* Top Patterns */}
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            'border-radius': '12px',
            padding: '20px'
          }}>
            <div style={{ 'font-size': '12px', color: 'var(--text-muted)', 'margin-bottom': '12px', 'text-transform': 'uppercase', 'letter-spacing': '0.5px' }}>
              Top Patterns
            </div>
            <div style={{ display: 'flex', 'flex-wrap': 'wrap', gap: '6px' }}>
              <For each={summary()!.topPatterns?.slice(0, 3) || []}>
                {(pattern) => (
                  <span style={{
                    padding: '4px 10px',
                    'border-radius': '12px',
                    'font-size': '11px',
                    'font-weight': '500',
                    background: 'var(--accent-primary)20',
                    color: 'var(--accent-primary)'
                  }}>
                    {pattern}
                  </span>
                )}
              </For>
            </div>
          </div>
        </div>

        {/* Cluster Cards */}
        <h2 style={{ 
          'font-size': '18px', 
          'font-weight': '600', 
          color: 'var(--text-primary)',
          'margin-bottom': '16px'
        }}>
          Individual Cluster Health
        </h2>

        <div style={{
          display: 'grid',
          'grid-template-columns': 'repeat(auto-fill, minmax(350px, 1fr))',
          gap: '16px'
        }}>
          <For each={summary()!.clusters || []}>
            {(cluster) => (
              <div style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                'border-radius': '12px',
                padding: '20px',
                transition: 'border-color 0.2s, box-shadow 0.2s'
              }}>
                {/* Cluster Header */}
                <div style={{ 
                  display: 'flex', 
                  'justify-content': 'space-between', 
                  'align-items': 'flex-start',
                  'margin-bottom': '16px'
                }}>
                  <div>
                    <h3 style={{ 
                      margin: '0 0 4px', 
                      'font-size': '16px', 
                      'font-weight': '600',
                      color: 'var(--text-primary)'
                    }}>
                      {cluster.clusterId || 'Unknown Cluster'}
                    </h3>
                    <div style={{ 'font-size': '11px', color: 'var(--text-muted)' }}>
                      Last updated: {new Date(cluster.lastUpdated).toLocaleString()}
                    </div>
                  </div>
                  <div style={{
                    display: 'flex',
                    'flex-direction': 'column',
                    'align-items': 'flex-end'
                  }}>
                    <div style={{
                      'font-size': '24px',
                      'font-weight': '700',
                      color: getHealthColor(cluster.healthScore)
                    }}>
                      {cluster.healthScore.toFixed(0)}%
                    </div>
                    <div style={{ 'font-size': '10px', color: 'var(--text-muted)' }}>
                      Health Score
                    </div>
                  </div>
                </div>

                {/* Health Bar */}
                <div style={{
                  background: 'var(--bg-secondary)',
                  'border-radius': '4px',
                  height: '8px',
                  overflow: 'hidden',
                  'margin-bottom': '16px'
                }}>
                  <div style={{
                    height: '100%',
                    width: `${cluster.healthScore}%`,
                    background: getHealthColor(cluster.healthScore),
                    'border-radius': '4px',
                    transition: 'width 0.3s ease'
                  }} />
                </div>

                {/* Incident Counts */}
                <div style={{ 'margin-bottom': '12px' }}>
                  <div style={{ 'font-size': '11px', color: 'var(--text-muted)', 'margin-bottom': '6px' }}>
                    Incidents by Severity
                  </div>
                  <div style={{ display: 'flex', 'flex-wrap': 'wrap', gap: '6px' }}>
                    <For each={Object.entries(cluster.incidentCounts || {})}>
                      {([severity, count]) => (
                        <span style={{
                          padding: '2px 8px',
                          'border-radius': '10px',
                          'font-size': '11px',
                          'font-weight': '500',
                          background: getSeverityColor(severity) + '20',
                          color: getSeverityColor(severity)
                        }}>
                          {severity}: {count}
                        </span>
                      )}
                    </For>
                    <Show when={Object.keys(cluster.incidentCounts || {}).length === 0}>
                      <span style={{ 'font-size': '11px', color: 'var(--text-muted)' }}>
                        No incidents 🎉
                      </span>
                    </Show>
                  </div>
                </div>

                {/* Top Patterns */}
                <Show when={cluster.topPatterns && cluster.topPatterns.length > 0}>
                  <div>
                    <div style={{ 'font-size': '11px', color: 'var(--text-muted)', 'margin-bottom': '6px' }}>
                      Top Patterns
                    </div>
                    <div style={{ display: 'flex', 'flex-wrap': 'wrap', gap: '4px' }}>
                      <For each={cluster.topPatterns}>
                        {(pattern) => (
                          <span style={{
                            padding: '2px 8px',
                            'border-radius': '10px',
                            'font-size': '10px',
                            background: 'var(--bg-secondary)',
                            color: 'var(--text-secondary)'
                          }}>
                            {pattern}
                          </span>
                        )}
                      </For>
                    </div>
                  </div>
                </Show>
              </div>
            )}
          </For>
        </div>

        {/* Empty State */}
        <Show when={summary()!.clusters?.length === 0}>
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            'border-radius': '12px',
            padding: '40px',
            'text-align': 'center',
            color: 'var(--text-secondary)'
          }}>
            <div style={{ 'font-size': '48px', 'margin-bottom': '16px' }}>🌐</div>
            <h3 style={{ margin: '0 0 8px', color: 'var(--text-primary)' }}>No Cluster Data Available</h3>
            <p style={{ margin: 0, 'font-size': '14px' }}>
              Connect to Kubernetes clusters to see aggregated health and incident data here.
            </p>
          </div>
        </Show>

        {/* Footer */}
        <div style={{ 
          'margin-top': '24px', 
          'text-align': 'center',
          'font-size': '12px',
          color: 'var(--text-muted)'
        }}>
          Last refreshed: {summary()?.generatedAt ? new Date(summary()!.generatedAt).toLocaleString() : 'N/A'}
          <button
            onClick={fetchSummary}
            disabled={loading()}
            style={{
              'margin-left': '12px',
              padding: '4px 12px',
              background: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-color)',
              'border-radius': '4px',
              cursor: 'pointer',
              'font-size': '12px'
            }}
          >
            {loading() ? 'Refreshing...' : '🔄 Refresh'}
          </button>
        </div>
      </Show>
    </div>
  );
};

export default MultiCluster;

