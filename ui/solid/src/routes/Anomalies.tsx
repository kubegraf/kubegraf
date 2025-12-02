import { Component, For, Show, createSignal, createResource, createMemo, onMount } from 'solid-js';
import { api, Anomaly, AnomalyStats } from '../services/api';

const Anomalies: Component = () => {
  const [activeTab, setActiveTab] = createSignal<'anomalies' | 'recommendations'>('anomalies');
  const [selectedSeverity, setSelectedSeverity] = createSignal<string>('');
  const [scanKey, setScanKey] = createSignal(0);
  const [remediating, setRemediating] = createSignal<string | null>(null);

  // Fetch anomalies
  const [anomaliesData] = createResource(
    () => {
      const sev = selectedSeverity();
      const key = scanKey();
      return { severity: sev, key };
    },
    async ({ severity }) => {
      try {
        const data = await api.detectAnomalies(severity || undefined);
        console.log('[Anomalies] Fetched anomalies:', data.anomalies.length);
        return data;
      } catch (err) {
        console.error('[Anomalies] Failed to fetch anomalies:', err);
        return { anomalies: [], stats: { total: 0, critical: 0, warning: 0, info: 0 }, duration: '0s' };
      }
    }
  );

  // Pagination
  const [currentPage, setCurrentPage] = createSignal(1);
  const pageSize = 10;

  const paginatedAnomalies = createMemo(() => {
    const anomalies = anomaliesData()?.anomalies || [];
    const start = (currentPage() - 1) * pageSize;
    const end = start + pageSize;
    return {
      list: anomalies.slice(start, end),
      total: anomalies.length,
      pages: Math.ceil(anomalies.length / pageSize),
    };
  });

  const handleRemediate = async (anomaly: Anomaly) => {
    if (!anomaly.autoRemediate) {
      alert('Auto-remediation is not available for this anomaly type.');
      return;
    }

    if (!confirm(`Are you sure you want to auto-remediate this anomaly?\n\n${anomaly.message}\n\nRecommendation: ${anomaly.recommendation}`)) {
      return;
    }

    setRemediating(anomaly.id);
    try {
      const result = await api.remediateAnomaly(anomaly.id);
      if (result.success) {
        alert(result.message || 'Anomaly remediated successfully!');
        // Refresh anomalies
        setScanKey(prev => prev + 1);
      } else {
        alert('Failed to remediate anomaly.');
      }
    } catch (err: any) {
      alert(`Failed to remediate: ${err.message}`);
    } finally {
      setRemediating(null);
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
        return '#6b7280';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'crash_loop':
        return '🔄';
      case 'cpu_spike':
        return '⚡';
      case 'memory_spike':
        return '💾';
      case 'hpa_maxed':
        return '📈';
      case 'pod_not_ready':
        return '⚠️';
      case 'frequent_restarts':
        return '🔄';
      default:
        return '🔍';
    }
  };

  // Fetch ML Recommendations
  const [recommendations] = createResource(
    () => activeTab() === 'recommendations',
    async (shouldFetch) => {
      if (!shouldFetch) return { recommendations: [], total: 0, error: undefined };
      try {
        const data = await api.getMLRecommendations();
        return { ...data, error: undefined };
      } catch (err: any) {
        console.error('[Anomalies] Failed to fetch recommendations:', err);
        return { 
          recommendations: [], 
          total: 0, 
          error: err?.message || 'Failed to load ML recommendations. This may take a few moments if there is no historical data.' 
        };
      }
    }
  );

  onMount(() => {
    // Trigger initial scan
    setScanKey(1);
  });

  return (
    <div class="space-y-6 p-6" style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      {/* Header */}
      <div class="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 class="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>AI/ML Insights</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Anomaly detection and ML-powered recommendations</p>
        </div>
        <div class="flex items-center gap-2">
          <Show when={activeTab() === 'anomalies'}>
            <button
              onClick={() => {
                setScanKey(prev => prev + 1);
                setSelectedSeverity('');
                setCurrentPage(1);
              }}
              disabled={anomaliesData.loading}
              class="px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: 'var(--accent-primary)', color: 'white' }}
            >
              {anomaliesData.loading ? 'Detecting...' : 'Detect Anomalies'}
            </button>
          </Show>
          <Show when={activeTab() === 'recommendations'}>
            <button
              onClick={() => recommendations.refetch()}
              disabled={recommendations.loading}
              class="px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: 'var(--accent-primary)', color: 'white' }}
            >
              {recommendations.loading ? 'Loading...' : 'Refresh Recommendations'}
            </button>
          </Show>
        </div>
      </div>

      {/* Tabs */}
      <div class="flex gap-2 border-b" style={{ 'border-color': 'var(--border-color)' }}>
        <button
          onClick={() => setActiveTab('anomalies')}
          class={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab() === 'anomalies' ? 'border-b-2' : 'opacity-60 hover:opacity-100'
          }`}
          style={{
            color: activeTab() === 'anomalies' ? 'var(--accent-primary)' : 'var(--text-secondary)',
            'border-bottom-color': activeTab() === 'anomalies' ? 'var(--accent-primary)' : 'transparent',
          }}
        >
          Anomaly Detection
        </button>
        <button
          onClick={() => setActiveTab('recommendations')}
          class={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab() === 'recommendations' ? 'border-b-2' : 'opacity-60 hover:opacity-100'
          }`}
          style={{
            color: activeTab() === 'recommendations' ? 'var(--accent-primary)' : 'var(--text-secondary)',
            'border-bottom-color': activeTab() === 'recommendations' ? 'var(--accent-primary)' : 'transparent',
          }}
        >
          ML Recommendations
        </button>
      </div>

      {/* Statistics - Only show for Anomalies tab */}
      <Show when={activeTab() === 'anomalies' && anomaliesData()?.stats}>
        {(stats: () => AnomalyStats) => (
          <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div class="card p-4">
              <div class="text-sm" style={{ color: 'var(--text-secondary)' }}>Total Anomalies</div>
              <div class="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{stats().total}</div>
            </div>
            <div class="card p-4">
              <div class="text-sm" style={{ color: 'var(--text-secondary)' }}>Critical</div>
              <div class="text-2xl font-bold" style={{ color: '#ef4444' }}>{stats().critical}</div>
            </div>
            <div class="card p-4">
              <div class="text-sm" style={{ color: 'var(--text-secondary)' }}>Warning</div>
              <div class="text-2xl font-bold" style={{ color: '#f59e0b' }}>{stats().warning}</div>
            </div>
            <div class="card p-4">
              <div class="text-sm" style={{ color: 'var(--text-secondary)' }}>Info</div>
              <div class="text-2xl font-bold" style={{ color: '#3b82f6' }}>{stats().info}</div>
            </div>
          </div>
        )}
      </Show>

      {/* Filters - Only show for Anomalies tab */}
      <Show when={activeTab() === 'anomalies'}>
        <div class="card p-4">
          <div class="flex items-center gap-4">
            <label class="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Filter by Severity:</label>
            <select
              value={selectedSeverity()}
              onChange={(e) => {
                setSelectedSeverity(e.currentTarget.value);
                setCurrentPage(1);
              }}
              class="px-3 py-2 rounded-lg text-sm"
              style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
            >
              <option value="">All Severities</option>
              <option value="critical">Critical</option>
              <option value="warning">Warning</option>
              <option value="info">Info</option>
            </select>
            <Show when={anomaliesData()?.duration}>
              <span class="text-sm" style={{ color: 'var(--text-muted)' }}>
                Detection time: {anomaliesData()?.duration}
              </span>
            </Show>
          </div>
        </div>
      </Show>

      {/* Anomalies Tab Content */}
      <Show when={activeTab() === 'anomalies'}>
        {/* Anomalies List */}
      <Show when={anomaliesData.loading}>
        <div class="card p-8 text-center">
          <div class="spinner mx-auto mb-2" />
          <span style={{ color: 'var(--text-muted)' }}>Detecting anomalies...</span>
        </div>
      </Show>

      <Show when={!anomaliesData.loading && !anomaliesData.error && paginatedAnomalies().total > 0}>
        <div class="space-y-4">
          <For each={paginatedAnomalies().list}>
            {(anomaly) => (
              <div
                class="card p-4 border-l-4"
                style={{
                  'border-left-color': getSeverityColor(anomaly.severity),
                }}
              >
                <div class="flex items-start justify-between gap-4">
                  <div class="flex-1">
                    <div class="flex items-center gap-2 mb-2">
                      <span class="text-xl">{getTypeIcon(anomaly.type)}</span>
                      <span
                        class="px-2 py-1 rounded text-xs font-medium uppercase"
                        style={{
                          background: `${getSeverityColor(anomaly.severity)}20`,
                          color: getSeverityColor(anomaly.severity),
                        }}
                      >
                        {anomaly.severity}
                      </span>
                      <span class="text-sm" style={{ color: 'var(--text-secondary)' }}>
                        {anomaly.type.replace(/_/g, ' ')}
                      </span>
                      <span class="text-sm font-mono" style={{ color: 'var(--text-muted)' }}>
                        Score: {(anomaly.score * 100).toFixed(1)}%
                      </span>
                    </div>
                    <h3 class="font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>{anomaly.message}</h3>
                    <p class="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
                      <strong>Namespace:</strong> {anomaly.namespace} | <strong>Pod:</strong> {anomaly.podName}
                      {anomaly.deployment && ` | <strong>Deployment:</strong> ${anomaly.deployment}`}
                    </p>
                    <p class="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
                      <strong>Recommendation:</strong> {anomaly.recommendation}
                    </p>
                    <div class="text-xs" style={{ color: 'var(--text-muted)' }}>
                      Detected: {new Date(anomaly.timestamp).toLocaleString()}
                    </div>
                  </div>
                  <Show when={anomaly.autoRemediate}>
                    <button
                      onClick={() => handleRemediate(anomaly)}
                      disabled={remediating() === anomaly.id}
                      class="px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                      style={{ background: 'var(--accent-primary)', color: 'white' }}
                    >
                      {remediating() === anomaly.id ? 'Remediating...' : 'Auto-Remediate'}
                    </button>
                  </Show>
                </div>
              </div>
            )}
          </For>
        </div>

        {/* Pagination */}
        <Show when={paginatedAnomalies().pages > 1}>
          <div class="flex items-center justify-center gap-2 mt-4">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage() === 1}
              class="px-3 py-1 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
            >
              Previous
            </button>
            <span class="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Page {currentPage()} of {paginatedAnomalies().pages}
            </span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(paginatedAnomalies().pages, prev + 1))}
              disabled={currentPage() === paginatedAnomalies().pages}
              class="px-3 py-1 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
            >
              Next
            </button>
          </div>
        </Show>
      </Show>

      <Show when={!anomaliesData.loading && !anomaliesData.error && paginatedAnomalies().total === 0}>
        <div class="card p-8 text-center">
          <svg class="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p class="text-lg font-medium mb-2" style={{ color: 'var(--text-primary)' }}>No Anomalies Detected</p>
          <p style={{ color: 'var(--text-secondary)' }}>Your cluster appears to be healthy!</p>
        </div>
      </Show>

      <Show when={anomaliesData.error}>
        <div class="card p-4 bg-red-500/10 border-l-4 border-red-500">
          <p style={{ color: 'var(--error-color)' }}>
            Error: {anomaliesData.error instanceof Error ? anomaliesData.error.message : String(anomaliesData.error)}
          </p>
        </div>
      </Show>
      </Show>

      {/* ML Recommendations Tab Content */}
      <Show when={activeTab() === 'recommendations'}>
        <Show when={recommendations.loading}>
          <div class="card p-8 text-center">
            <div class="spinner mx-auto mb-2" />
            <span style={{ color: 'var(--text-muted)' }}>Loading ML recommendations...</span>
          </div>
        </Show>

        <Show when={!recommendations.loading && recommendations.error}>
          <div class="card p-4 bg-red-500/10 border-l-4 border-red-500">
            <p style={{ color: 'var(--error-color)' }}>
              Error: {recommendations.error}
            </p>
            <p class="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>
              Tip: Run anomaly detection first to collect metrics, then try again.
            </p>
          </div>
        </Show>

        <Show when={!recommendations.loading && !recommendations.error && (!recommendations() || recommendations()!.recommendations.length === 0)}>
          <div class="card p-8 text-center" style={{ color: 'var(--text-muted)' }}>
            <svg class="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            <p class="text-lg font-medium mb-2" style={{ color: 'var(--text-primary)' }}>No ML Recommendations Yet</p>
            <p class="text-sm">Recommendations will appear as the system learns from your cluster metrics.</p>
            <p class="text-sm mt-2">The ML model needs historical data (at least 20-50 metric samples) to generate optimization suggestions.</p>
            <p class="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Metrics are collected automatically when you use the anomaly detection feature.</p>
          </div>
        </Show>

        <Show when={!recommendations.loading && recommendations() && recommendations()!.recommendations.length > 0}>
          <div class="space-y-4">
            <div class="card p-4">
              <div class="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Total Recommendations: <strong style={{ color: 'var(--text-primary)' }}>{recommendations()!.total}</strong>
              </div>
            </div>
            <For each={recommendations()!.recommendations}>
              {(rec: any) => (
                <div
                  class="card p-4 border-l-4"
                  style={{
                    'border-left-color': rec.severity === 'high' ? '#ef4444' : rec.severity === 'medium' ? '#f59e0b' : '#3b82f6',
                  }}
                >
                  <div class="flex items-start justify-between gap-4">
                    <div class="flex-1">
                      <div class="flex items-center gap-2 mb-2 flex-wrap">
                        <span
                          class="px-2 py-1 rounded text-xs font-medium uppercase"
                          style={{
                            background: rec.severity === 'high' ? '#ef444420' : rec.severity === 'medium' ? '#f59e0b20' : '#3b82f620',
                            color: rec.severity === 'high' ? '#ef4444' : rec.severity === 'medium' ? '#f59e0b' : '#3b82f6',
                          }}
                        >
                          {rec.severity}
                        </span>
                        <span
                          class="px-2 py-1 rounded text-xs font-medium"
                          style={{
                            background: rec.type === 'scaling' ? '#a855f720' : rec.type === 'resource_optimization' ? '#22c55e20' : rec.type === 'cost_saving' ? '#f59e0b20' : '#3b82f620',
                            color: rec.type === 'scaling' ? '#a855f7' : rec.type === 'resource_optimization' ? '#22c55e' : rec.type === 'cost_saving' ? '#f59e0b' : '#3b82f6',
                          }}
                        >
                          {rec.type.replace(/_/g, ' ')}
                        </span>
                        <span class="text-sm" style={{ color: 'var(--text-muted)' }}>
                          Confidence: {(rec.confidence * 100).toFixed(0)}%
                        </span>
                        <Show when={rec.autoApply}>
                          <span class="px-2 py-1 rounded text-xs" style={{ background: '#22c55e20', color: '#22c55e' }}>
                            Auto-Apply Available
                          </span>
                        </Show>
                      </div>
                      <h3 class="font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>{rec.title}</h3>
                      <p class="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
                        <strong>Resource:</strong> {rec.resource} | <strong>Namespace:</strong> {rec.namespace}
                      </p>
                      <p class="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>{rec.description}</p>
                      <div class="flex items-center gap-4 text-sm mb-2">
                        <div>
                          <span style={{ color: 'var(--text-muted)' }}>Current: </span>
                          <strong style={{ color: 'var(--text-primary)' }}>{rec.currentValue}</strong>
                        </div>
                        <div>→</div>
                        <div>
                          <span style={{ color: 'var(--text-muted)' }}>Recommended: </span>
                          <strong style={{ color: 'var(--accent-primary)' }}>{rec.recommendedValue}</strong>
                        </div>
                      </div>
                      <Show when={rec.estimatedSavings}>
                        <div class="mt-2 text-sm" style={{ color: '#22c55e' }}>
                          💰 Estimated Savings: {rec.estimatedSavings}
                        </div>
                      </Show>
                      <div class="mt-2 flex items-center gap-4 text-xs" style={{ color: 'var(--text-muted)' }}>
                        <span>Impact: {rec.impact}</span>
                        <span>Effort: {rec.effort}</span>
                      </div>
                      <div class="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
                        Generated: {new Date(rec.timestamp).toLocaleString()}
                      </div>
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

export default Anomalies;

