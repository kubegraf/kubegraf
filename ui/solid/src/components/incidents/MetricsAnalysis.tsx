// Copyright 2025 KubeGraf Contributors
// Metrics Analysis - Shows metric data related to the incident

import { Component, Show, For, createSignal, createEffect } from 'solid-js';
import { api } from '../../services/api';

interface MetricsAnalysisProps {
  incidentId: string;
}

interface Metric {
  name?: string;
  type?: string;
  value?: any;
  message?: string;
  time?: string;
  metric?: string;
}

const MetricsAnalysis: Component<MetricsAnalysisProps> = (props) => {
  const [metrics, setMetrics] = createSignal<Metric[]>([]);
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal<string | null>(null);

  // Load metrics
  createEffect(async () => {
    if (!props.incidentId) return;

    setLoading(true);
    setError(null);

    try {
      const metricsData = await api.getIncidentMetrics(props.incidentId);
      
      if (metricsData.metrics && Array.isArray(metricsData.metrics)) {
        setMetrics(metricsData.metrics);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load metrics');
    } finally {
      setLoading(false);
    }
  });

  const formatValue = (value: any) => {
    if (typeof value === 'object') {
      return JSON.stringify(value, null, 2);
    }
    return String(value);
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
        Metrics Analysis
      </div>

      <Show when={loading()}>
        <div style={{ padding: '40px', 'text-align': 'center', color: 'var(--text-secondary)', 'font-size': '13px' }}>
          Loading metrics...
        </div>
      </Show>

      <Show when={error()}>
        <div style={{ padding: '16px', background: 'rgba(239, 68, 68, 0.1)', 'border-radius': '6px', color: '#dc3545', 'font-size': '13px' }}>
          {error()}
        </div>
      </Show>

      <Show when={!loading() && !error()}>
        <Show when={metrics().length === 0}>
          <div style={{ padding: '16px', 'text-align': 'center', color: 'var(--text-secondary)', 'font-size': '13px' }}>
            No metrics available for this incident
          </div>
        </Show>

        <Show when={metrics().length > 0}>
          <div style={{ display: 'flex', 'flex-direction': 'column', gap: '12px' }}>
            <For each={metrics()}>
              {(metric) => (
                <div
                  style={{
                    padding: '12px',
                    background: 'var(--bg-secondary)',
                    'border-radius': '6px',
                    border: '1px solid var(--border-color)',
                  }}
                >
                  <div style={{ display: 'flex', 'justify-content': 'space-between', 'align-items': 'center', 'margin-bottom': '8px' }}>
                    <div style={{ 'font-size': '14px', 'font-weight': '600', color: 'var(--text-primary)' }}>
                      {metric.name || metric.type || metric.metric || 'Metric'}
                    </div>
                    {metric.time && (
                      <div style={{ 'font-size': '11px', color: 'var(--text-muted)' }}>
                        {new Date(metric.time).toLocaleString()}
                      </div>
                    )}
                  </div>
                  <div style={{ 'font-size': '13px', color: 'var(--text-secondary)', 'margin-bottom': '4px' }}>
                    {metric.message || (metric.value !== undefined ? formatValue(metric.value) : 'No value')}
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

export default MetricsAnalysis;

