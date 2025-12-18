import { Component, For, Show, createResource, createSignal } from 'solid-js';

interface IncidentCluster {
  id: string;
  fingerprint: string;
  pattern: string;
  incidentCount: number;
  firstSeen: string;
  lastSeen: string;
  commonCauses: string[];
  bestRunbook?: string;
  successRate: number;
}

interface LearnedPattern {
  id: string;
  name: string;
  description: string;
  basePattern: string;
  confidence: number;
  occurrences: number;
  learnedAt: string;
  isAnomaly: boolean;
}

interface PatternTrend {
  pattern: string;
  last24h: { count: number; resolvedCount: number; successRate: number };
  last7d: { count: number; resolvedCount: number; successRate: number };
  last30d: { count: number; resolvedCount: number; successRate: number };
  trend: string;
  changePercent: number;
}

const LearningDashboard: Component = () => {
  const [activeTab, setActiveTab] = createSignal<'clusters' | 'patterns' | 'trends'>('clusters');

  const [clusters] = createResource(async () => {
    try {
      const response = await fetch('/api/v2/learning/clusters');
      if (!response.ok) return [];
      return await response.json() as IncidentCluster[];
    } catch (e) {
      console.error('Failed to fetch clusters:', e);
      return [];
    }
  });

  const [patterns] = createResource(async () => {
    try {
      const response = await fetch('/api/v2/learning/patterns?anomalies=true');
      if (!response.ok) return [];
      return await response.json() as LearnedPattern[];
    } catch (e) {
      console.error('Failed to fetch patterns:', e);
      return [];
    }
  });

  const [trends] = createResource(async () => {
    try {
      const response = await fetch('/api/v2/learning/trends');
      if (!response.ok) return {};
      return await response.json() as Record<string, PatternTrend>;
    } catch (e) {
      console.error('Failed to fetch trends:', e);
      return {};
    }
  });

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'increasing': return '📈';
      case 'decreasing': return '📉';
      case 'stable': return '➡️';
      default: return '❓';
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'increasing': return '#dc3545';
      case 'decreasing': return '#28a745';
      case 'stable': return '#6c757d';
      default: return 'var(--text-secondary)';
    }
  };

  return (
    <div style={{ background: 'var(--bg-card)', 'border-radius': '8px', border: '1px solid var(--border-color)' }}>
      {/* Header */}
      <div style={{ 
        padding: '12px 16px', 
        'border-bottom': '1px solid var(--border-color)'
      }}>
        <h4 style={{ margin: 0, color: 'var(--text-primary)', 'font-size': '14px', 'font-weight': '600' }}>
          🧠 Learning Intelligence
        </h4>
      </div>

      {/* Tabs */}
      <div style={{ 
        display: 'flex', 
        'border-bottom': '1px solid var(--border-color)'
      }}>
        {(['clusters', 'patterns', 'trends'] as const).map((tab) => (
          <button
            onClick={() => setActiveTab(tab)}
            style={{
              flex: 1,
              padding: '10px 16px',
              background: activeTab() === tab ? 'var(--bg-secondary)' : 'transparent',
              border: 'none',
              'border-bottom': activeTab() === tab ? '2px solid var(--accent-primary)' : '2px solid transparent',
              color: activeTab() === tab ? 'var(--accent-primary)' : 'var(--text-secondary)',
              cursor: 'pointer',
              'font-size': '12px',
              'font-weight': '500',
              'text-transform': 'capitalize'
            }}
          >
            {tab === 'clusters' && '🔗 '}{tab === 'patterns' && '🎯 '}{tab === 'trends' && '📊 '}
            {tab}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ padding: '12px', 'max-height': '350px', 'overflow-y': 'auto' }}>
        {/* Clusters Tab */}
        <Show when={activeTab() === 'clusters'}>
          <Show when={clusters.loading}>
            <div style={{ color: 'var(--text-muted)', 'text-align': 'center', padding: '20px' }}>
              Loading clusters...
            </div>
          </Show>
          <Show when={!clusters.loading && (!clusters() || clusters()?.length === 0)}>
            <div style={{ color: 'var(--text-muted)', 'text-align': 'center', padding: '20px' }}>
              No incident clusters learned yet
            </div>
          </Show>
          <Show when={!clusters.loading && clusters() && clusters()!.length > 0}>
            <div style={{ display: 'flex', 'flex-direction': 'column', gap: '10px' }}>
              <For each={clusters()}>
                {(cluster) => (
                  <div style={{
                    background: 'var(--bg-secondary)',
                    padding: '12px',
                    'border-radius': '6px',
                    border: '1px solid var(--border-color)'
                  }}>
                    <div style={{ display: 'flex', 'justify-content': 'space-between', 'margin-bottom': '8px' }}>
                      <span style={{ 'font-size': '12px', 'font-weight': '600', color: 'var(--text-primary)' }}>
                        {cluster.pattern}
                      </span>
                      <span style={{
                        'font-size': '10px',
                        padding: '2px 6px',
                        'border-radius': '3px',
                        background: 'var(--accent-primary)20',
                        color: 'var(--accent-primary)',
                        'font-weight': '600'
                      }}>
                        {cluster.incidentCount} incidents
                      </span>
                    </div>
                    <Show when={cluster.commonCauses && cluster.commonCauses.length > 0}>
                      <div style={{ 'font-size': '11px', color: 'var(--text-secondary)', 'margin-bottom': '6px' }}>
                        Common causes: {cluster.commonCauses.slice(0, 2).join(', ')}
                      </div>
                    </Show>
                    <div style={{ display: 'flex', gap: '12px', 'font-size': '10px', color: 'var(--text-muted)' }}>
                      <span>Success: {Math.round(cluster.successRate * 100)}%</span>
                      <Show when={cluster.bestRunbook}>
                        <span>Best fix: {cluster.bestRunbook}</span>
                      </Show>
                    </div>
                  </div>
                )}
              </For>
            </div>
          </Show>
        </Show>

        {/* Patterns Tab */}
        <Show when={activeTab() === 'patterns'}>
          <Show when={patterns.loading}>
            <div style={{ color: 'var(--text-muted)', 'text-align': 'center', padding: '20px' }}>
              Loading patterns...
            </div>
          </Show>
          <Show when={!patterns.loading && (!patterns() || patterns()?.length === 0)}>
            <div style={{ color: 'var(--text-muted)', 'text-align': 'center', padding: '20px' }}>
              No patterns learned yet
            </div>
          </Show>
          <Show when={!patterns.loading && patterns() && patterns()!.length > 0}>
            <div style={{ display: 'flex', 'flex-direction': 'column', gap: '10px' }}>
              <For each={patterns()}>
                {(pattern) => (
                  <div style={{
                    background: 'var(--bg-secondary)',
                    padding: '12px',
                    'border-radius': '6px',
                    border: '1px solid var(--border-color)',
                    'border-left': pattern.isAnomaly ? '3px solid #ff6b6b' : '3px solid var(--accent-primary)'
                  }}>
                    <div style={{ display: 'flex', 'justify-content': 'space-between', 'margin-bottom': '6px' }}>
                      <span style={{ 'font-size': '12px', 'font-weight': '600', color: 'var(--text-primary)' }}>
                        {pattern.name}
                      </span>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <Show when={pattern.isAnomaly}>
                          <span style={{
                            'font-size': '10px',
                            padding: '2px 6px',
                            'border-radius': '3px',
                            background: '#ff6b6b20',
                            color: '#ff6b6b',
                            'font-weight': '600'
                          }}>
                            ⚠️ Anomaly
                          </span>
                        </Show>
                        <span style={{
                          'font-size': '10px',
                          padding: '2px 6px',
                          'border-radius': '3px',
                          background: 'var(--bg-card)',
                          color: 'var(--text-muted)'
                        }}>
                          {Math.round(pattern.confidence * 100)}% conf
                        </span>
                      </div>
                    </div>
                    <div style={{ 'font-size': '11px', color: 'var(--text-secondary)', 'margin-bottom': '6px' }}>
                      {pattern.description}
                    </div>
                    <div style={{ 'font-size': '10px', color: 'var(--text-muted)' }}>
                      Seen {pattern.occurrences} times • Based on {pattern.basePattern}
                    </div>
                  </div>
                )}
              </For>
            </div>
          </Show>
        </Show>

        {/* Trends Tab */}
        <Show when={activeTab() === 'trends'}>
          <Show when={trends.loading}>
            <div style={{ color: 'var(--text-muted)', 'text-align': 'center', padding: '20px' }}>
              Loading trends...
            </div>
          </Show>
          <Show when={!trends.loading && (!trends() || Object.keys(trends() || {}).length === 0)}>
            <div style={{ color: 'var(--text-muted)', 'text-align': 'center', padding: '20px' }}>
              No trend data available
            </div>
          </Show>
          <Show when={!trends.loading && trends() && Object.keys(trends()!).length > 0}>
            <div style={{ display: 'flex', 'flex-direction': 'column', gap: '10px' }}>
              <For each={Object.entries(trends()!)}>
                {([pattern, trend]) => (
                  <div style={{
                    background: 'var(--bg-secondary)',
                    padding: '12px',
                    'border-radius': '6px',
                    border: '1px solid var(--border-color)'
                  }}>
                    <div style={{ display: 'flex', 'justify-content': 'space-between', 'margin-bottom': '8px' }}>
                      <span style={{ 'font-size': '12px', 'font-weight': '600', color: 'var(--text-primary)' }}>
                        {pattern}
                      </span>
                      <span style={{
                        'font-size': '11px',
                        color: getTrendColor(trend.trend),
                        'font-weight': '600'
                      }}>
                        {getTrendIcon(trend.trend)} {trend.trend}
                        <Show when={trend.changePercent !== 0}>
                          {' '}({trend.changePercent > 0 ? '+' : ''}{Math.round(trend.changePercent)}%)
                        </Show>
                      </span>
                    </div>
                    <div style={{ 
                      display: 'grid', 
                      'grid-template-columns': 'repeat(3, 1fr)', 
                      gap: '8px',
                      'font-size': '10px'
                    }}>
                      <div style={{ 'text-align': 'center', padding: '6px', background: 'var(--bg-card)', 'border-radius': '4px' }}>
                        <div style={{ color: 'var(--text-muted)', 'margin-bottom': '2px' }}>24h</div>
                        <div style={{ color: 'var(--text-primary)', 'font-weight': '600' }}>
                          {trend.last24h.count} incidents
                        </div>
                      </div>
                      <div style={{ 'text-align': 'center', padding: '6px', background: 'var(--bg-card)', 'border-radius': '4px' }}>
                        <div style={{ color: 'var(--text-muted)', 'margin-bottom': '2px' }}>7d</div>
                        <div style={{ color: 'var(--text-primary)', 'font-weight': '600' }}>
                          {trend.last7d.count} incidents
                        </div>
                      </div>
                      <div style={{ 'text-align': 'center', padding: '6px', background: 'var(--bg-card)', 'border-radius': '4px' }}>
                        <div style={{ color: 'var(--text-muted)', 'margin-bottom': '2px' }}>30d</div>
                        <div style={{ color: 'var(--text-primary)', 'font-weight': '600' }}>
                          {trend.last30d.count} incidents
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
    </div>
  );
};

export default LearningDashboard;

